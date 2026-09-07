/**
 * Signed OAuth state carrying authoritative QB provider_environment.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createQboOAuthEnvironmentState,
  QboOAuthEnvironmentStateError,
  requireServerQboProviderEnvironment,
  verifyQboOAuthEnvironmentState,
} from "@/lib/erp/quickbooks/oauth-environment-state";

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
});
