/**
 * Signed OAuth state carrying authoritative QB provider_environment.
 * Includes negative cases required by PR #316 independent review (P2).
 */
import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createQboOAuthEnvironmentState,
  QboOAuthEnvironmentStateError,
  requireServerQboProviderEnvironment,
  verifyQboOAuthEnvironmentState,
} from "@/lib/erp/quickbooks/oauth-environment-state";

function signBody(body: string): string {
  const secret = process.env.QB_CLIENT_SECRET || "";
  return crypto.createHmac("sha256", secret).update(body).digest("base64url");
}

/** Forge a state with a valid HMAC over an arbitrary payload (for negative tests). */
function forgeSignedState(payload: unknown): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${signBody(body)}`;
}

function forgeSignedRawBody(rawUtf8: string): string {
  const body = Buffer.from(rawUtf8, "utf8").toString("base64url");
  return `${body}.${signBody(body)}`;
}

function expectFailClosed(fn: () => unknown) {
  let caught: unknown;
  try {
    fn();
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(QboOAuthEnvironmentStateError);
  const text = String(caught);
  expect(text).not.toMatch(/test-client-secret/);
  expect(text).not.toMatch(/QB_OAUTH_STATE_SECRET/);
  expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/);
  expect(text).not.toMatch(/access_token|refresh_token|authorization.?code/i);
  // State blob / nonce contents must not be echoed into the error message.
  expect(text).not.toMatch(/expected_provider_environment/);
  expect((caught as QboOAuthEnvironmentStateError).message.length).toBeLessThan(200);
  return caught as QboOAuthEnvironmentStateError;
}

describe("qbo oauth environment state", () => {
  const prevEnv = process.env.QB_ENVIRONMENT;
  const prevSecret = process.env.QB_CLIENT_SECRET;
  const prevStateSecret = process.env.QB_OAUTH_STATE_SECRET;

  beforeEach(() => {
    process.env.QB_CLIENT_SECRET = "test-client-secret";
    delete process.env.QB_OAUTH_STATE_SECRET;
  });

  afterEach(() => {
    process.env.QB_ENVIRONMENT = prevEnv;
    process.env.QB_CLIENT_SECRET = prevSecret;
    process.env.QB_OAUTH_STATE_SECRET = prevStateSecret;
  });

  it("fails closed when server environment is missing", () => {
    delete process.env.QB_ENVIRONMENT;
    expect(() => requireServerQboProviderEnvironment(undefined)).toThrow(
      QboOAuthEnvironmentStateError,
    );
  });

  it("fails closed when server environment is invalid", () => {
    expect(() => requireServerQboProviderEnvironment("staging")).toThrow(
      QboOAuthEnvironmentStateError,
    );
  });

  it("production OAuth state persists production expectation", () => {
    process.env.QB_ENVIRONMENT = "production";
    const { state, expectedProviderEnvironment } = createQboOAuthEnvironmentState();
    expect(expectedProviderEnvironment).toBe("production");
    const verified = verifyQboOAuthEnvironmentState({
      stateFromQuery: state,
      stateFromCookie: state,
      browserEnvironment: "sandbox",
    });
    expect(verified.expectedProviderEnvironment).toBe("production");
  });

  it("sandbox OAuth state persists sandbox expectation", () => {
    process.env.QB_ENVIRONMENT = "sandbox";
    const { state, expectedProviderEnvironment } = createQboOAuthEnvironmentState();
    expect(expectedProviderEnvironment).toBe("sandbox");
    const verified = verifyQboOAuthEnvironmentState({
      stateFromQuery: state,
      stateFromCookie: state,
      browserEnvironment: "production",
    });
    expect(verified.expectedProviderEnvironment).toBe("sandbox");
  });

  it("ignores browser-supplied environment", () => {
    process.env.QB_ENVIRONMENT = "production";
    const { state } = createQboOAuthEnvironmentState();
    const verified = verifyQboOAuthEnvironmentState({
      stateFromQuery: state,
      stateFromCookie: state,
      browserEnvironment: "sandbox",
    });
    expect(verified.expectedProviderEnvironment).toBe("production");
  });

  it("rejects cross-environment callback (state minted in sandbox, server now production)", () => {
    process.env.QB_ENVIRONMENT = "sandbox";
    const { state } = createQboOAuthEnvironmentState();
    process.env.QB_ENVIRONMENT = "production";
    expect(() =>
      verifyQboOAuthEnvironmentState({
        stateFromQuery: state,
        stateFromCookie: state,
      }),
    ).toThrow(/does not match server configuration/);
  });

  it("rejects cookie mismatch / replay without matching cookie", () => {
    process.env.QB_ENVIRONMENT = "production";
    const { state } = createQboOAuthEnvironmentState();
    expect(() =>
      verifyQboOAuthEnvironmentState({
        stateFromQuery: state,
        stateFromCookie: "other-state",
      }),
    ).toThrow(QboOAuthEnvironmentStateError);
  });

  it("rejects tampered signature", () => {
    process.env.QB_ENVIRONMENT = "production";
    const { state } = createQboOAuthEnvironmentState();
    const [body] = state.split(".");
    const tampered = `${body}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    expect(() =>
      verifyQboOAuthEnvironmentState({
        stateFromQuery: tampered,
        stateFromCookie: tampered,
      }),
    ).toThrow(/signature/i);
  });

  it("rejects expired state", () => {
    process.env.QB_ENVIRONMENT = "production";
    const now = Date.now();
    const { state } = createQboOAuthEnvironmentState({
      ttlSeconds: 60,
      nowMs: now - 120_000,
    });
    expect(() =>
      verifyQboOAuthEnvironmentState({
        stateFromQuery: state,
        stateFromCookie: state,
        nowMs: now,
      }),
    ).toThrow(/expired/i);
  });

  it("errors never embed secrets", () => {
    process.env.QB_ENVIRONMENT = "production";
    const { state } = createQboOAuthEnvironmentState();
    try {
      verifyQboOAuthEnvironmentState({
        stateFromQuery: state,
        stateFromCookie: "nope",
      });
    } catch (err) {
      expect(String(err)).not.toMatch(/test-client-secret/);
      expect(String(err)).not.toMatch(/eyJ/);
    }
  });

  describe("P2 negative cases (fail closed before exchange/persist)", () => {
    beforeEach(() => {
      process.env.QB_ENVIRONMENT = "production";
    });

    it("rejects unsupported / incorrect v", () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const state = forgeSignedState({
        v: 2,
        nonce: crypto.randomUUID(),
        expected_provider_environment: "production",
        iat: nowSec,
        exp: nowSec + 600,
      });
      const err = expectFailClosed(() =>
        verifyQboOAuthEnvironmentState({
          stateFromQuery: state,
          stateFromCookie: state,
        }),
      );
      expect(err.code).toBe("malformed_state");
    });

    it("rejects iat beyond the permitted future clock-skew window", () => {
      const nowMs = Date.now();
      const nowSec = Math.floor(nowMs / 1000);
      // Allowed skew is +60s; mint iat 5 minutes in the future.
      const state = forgeSignedState({
        v: 1,
        nonce: crypto.randomUUID(),
        expected_provider_environment: "production",
        iat: nowSec + 300,
        exp: nowSec + 900,
      });
      const err = expectFailClosed(() =>
        verifyQboOAuthEnvironmentState({
          stateFromQuery: state,
          stateFromCookie: state,
          nowMs,
        }),
      );
      expect(err.code).toBe("expired_state");
    });

    it("rejects malformed base64url body (not two valid segments)", () => {
      const broken = "%%%not-base64url%%%";
      // Still two segments so signature path runs; body decode/parse must fail closed.
      const state = `${broken}.${signBody(broken)}`;
      const err = expectFailClosed(() =>
        verifyQboOAuthEnvironmentState({
          stateFromQuery: state,
          stateFromCookie: state,
        }),
      );
      expect(["malformed_state", "bad_signature"]).toContain(err.code);
    });

    it("rejects validly encoded but malformed JSON", () => {
      const state = forgeSignedRawBody("this-is-not-json");
      const err = expectFailClosed(() =>
        verifyQboOAuthEnvironmentState({
          stateFromQuery: state,
          stateFromCookie: state,
        }),
      );
      expect(err.code).toBe("malformed_state");
    });

    it("rejects valid JSON missing required fields", () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const state = forgeSignedState({
        v: 1,
        // nonce missing
        expected_provider_environment: "production",
        iat: nowSec,
        exp: nowSec + 600,
      });
      const err = expectFailClosed(() =>
        verifyQboOAuthEnvironmentState({
          stateFromQuery: state,
          stateFromCookie: state,
        }),
      );
      expect(err.code).toBe("malformed_state");
    });

    it("rejects valid JSON with incorrectly typed required fields", () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const state = forgeSignedState({
        v: 1,
        nonce: 12345,
        expected_provider_environment: "production",
        iat: String(nowSec),
        exp: nowSec + 600,
      });
      const err = expectFailClosed(() =>
        verifyQboOAuthEnvironmentState({
          stateFromQuery: state,
          stateFromCookie: state,
        }),
      );
      expect(err.code).toBe("malformed_state");
    });

    it("rejects invalid expected_provider_environment enum", () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const state = forgeSignedState({
        v: 1,
        nonce: crypto.randomUUID(),
        expected_provider_environment: "staging",
        iat: nowSec,
        exp: nowSec + 600,
      });
      const err = expectFailClosed(() =>
        verifyQboOAuthEnvironmentState({
          stateFromQuery: state,
          stateFromCookie: state,
        }),
      );
      expect(err.code).toBe("malformed_state");
    });

    it("rejects payload with extra dots / wrong segment count", () => {
      const { state } = createQboOAuthEnvironmentState();
      const mangled = `${state}.extra`;
      const err = expectFailClosed(() =>
        verifyQboOAuthEnvironmentState({
          stateFromQuery: mangled,
          stateFromCookie: mangled,
        }),
      );
      expect(err.code).toBe("malformed_state");
    });

    it("negative verify never invokes persistence or token-exchange side effects", () => {
      const exchange = vi.fn();
      const persist = vi.fn();
      const nowSec = Math.floor(Date.now() / 1000);
      const state = forgeSignedState({
        v: 99,
        nonce: crypto.randomUUID(),
        expected_provider_environment: "production",
        iat: nowSec,
        exp: nowSec + 600,
      });
      expectFailClosed(() =>
        verifyQboOAuthEnvironmentState({
          stateFromQuery: state,
          stateFromCookie: state,
        }),
      );
      expect(exchange).not.toHaveBeenCalled();
      expect(persist).not.toHaveBeenCalled();
    });
  });
});

describe("callback orders state verify before exchange/persist (static)", () => {
  it("callback invokes verifyQboOAuthEnvironmentState before exchangeAuthorizationCode", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const src = fs.readFileSync(
      path.join(process.cwd(), "app/api/quickbooks/callback/route.js"),
      "utf8",
    );
    const implStart = src.indexOf("async function getImpl");
    expect(implStart).toBeGreaterThan(-1);
    const impl = src.slice(implStart);
    const verifyIdx = impl.indexOf("verifyQboOAuthEnvironmentState({");
    const exchangeIdx = impl.indexOf("exchangeAuthorizationCode");
    const persistAuthIdx = impl.indexOf("persistAuthenticatedQuickBooksGrant({");
    const persistLeadIdx = impl.indexOf("saveLeadQuickBooksAccountingConnection({");
    expect(verifyIdx).toBeGreaterThan(-1);
    expect(exchangeIdx).toBeGreaterThan(verifyIdx);
    expect(persistAuthIdx).toBeGreaterThan(verifyIdx);
    expect(persistLeadIdx).toBeGreaterThan(verifyIdx);
    // Fail-closed verify must not log secrets / state blobs.
    expect(src).not.toMatch(/console\.(log|error|warn)\([^\n]*stateFromQuery/);
    expect(src).not.toMatch(/console\.(log|error|warn)\([^\n]*QB_CLIENT_SECRET/);
  });
});
