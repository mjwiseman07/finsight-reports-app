import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  extractNetworkErrorDiagnostics,
  redactSecretishText,
  sanitizeQuotaGuardUrlMeta,
  getRuntimeTransportVersions,
} from "@/lib/network/transport-diagnostics";

describe("transport-diagnostics — Error.cause extraction", () => {
  it("unwraps nested Error.cause frames", () => {
    const root = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:9294"), {
      code: "ECONNREFUSED",
      errno: -4078,
      syscall: "connect",
      address: "127.0.0.1",
      port: 9294,
    });
    const mid = new Error("Proxy CONNECT failed");
    (mid as Error & { cause: unknown }).cause = root;
    const top = new TypeError("fetch failed");
    (top as Error & { cause: unknown }).cause = mid;

    const diag = extractNetworkErrorDiagnostics(top);
    expect(diag.message).toBe("fetch failed");
    expect(diag.name).toBe("TypeError");
    expect(diag.causeChain).toHaveLength(3);
    expect(diag.deepest?.code).toBe("ECONNREFUSED");
    expect(diag.deepest?.syscall).toBe("connect");
    expect(diag.deepest?.port).toBe(9294);
    expect(diag.deepest?.message).toContain("ECONNREFUSED");
  });

  it("redacts proxy userinfo from messages", () => {
    const err = new Error(
      "connect to https://qguser:s3cret-pass@us-east-shield-02.quotaguard.com:9294 failed",
    );
    const diag = extractNetworkErrorDiagnostics(err);
    expect(diag.message).not.toContain("s3cret-pass");
    expect(diag.message).not.toContain("qguser");
    expect(diag.message).toContain("[redacted]:[redacted]@");
  });

  it("redacts Bearer tokens from messages", () => {
    expect(
      redactSecretishText("Authorization Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc"),
    ).toContain("Bearer [redacted]");
  });
});

describe("transport-diagnostics — QuotaGuard URL sanitization", () => {
  it("returns set:false when unset", () => {
    expect(sanitizeQuotaGuardUrlMeta(undefined)).toEqual({ set: false });
    expect(sanitizeQuotaGuardUrlMeta(null)).toEqual({ set: false });
    expect(sanitizeQuotaGuardUrlMeta("")).toEqual({ set: false });
  });

  it("never includes username or password values", () => {
    const meta = sanitizeQuotaGuardUrlMeta(
      "https://qg-user:SuperSecretPass1@us-east-shield-02.quotaguard.com:9294",
    );
    const serialized = JSON.stringify(meta);
    expect(meta.set).toBe(true);
    expect(meta.parses).toBe(true);
    expect(meta.hostname).toBe("us-east-shield-02.quotaguard.com");
    expect(meta.port).toBe("9294");
    expect(meta.hasUsername).toBe(true);
    expect(meta.hasPassword).toBe(true);
    expect(meta.usernameLen).toBeGreaterThan(0);
    expect(meta.passwordLen).toBeGreaterThan(0);
    expect(serialized).not.toContain("qg-user");
    expect(serialized).not.toContain("SuperSecretPass1");
    expect(serialized).not.toMatch(/passwordFirst|passwordLast/i);
  });
});

describe("transport-diagnostics — runtime versions", () => {
  it("reports node + process/userland undici versions without secrets", () => {
    const v = getRuntimeTransportVersions();
    expect(v.node).toMatch(/^v\d+/);
    expect(v.userlandUndici).toMatch(/^\d+\.\d+/);
    // process.versions.undici present on Node 18+
    expect(v.processUndici === null || /^\d+\./.test(v.processUndici)).toBe(
      true,
    );
    expect(["aligned", "mismatch", "unknown"]).toContain(v.versionsMatchHint);
    expect(JSON.stringify(v)).not.toMatch(/quotaguard|password|Bearer/i);
  });
});

describe("transport-diagnostics — no token/realm/query leakage helpers", () => {
  it("redacts query token params", () => {
    const out = redactSecretishText(
      "https://example.com/x?access_token=abc123secret&realmId=9341457151063823",
    );
    expect(out).toContain("access_token=[redacted]");
    // realmId is an identifier — we do not put realm into diagnostic messages
    // from qboApiFetch (url_path only). Helper leaves non-secret query keys.
    expect(out).not.toContain("abc123secret");
  });
});

describe("sanitize does not mutate env", () => {
  const original = process.env.QUOTAGUARD_PROXY_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.QUOTAGUARD_PROXY_URL;
    else process.env.QUOTAGUARD_PROXY_URL = original;
  });

  it("reads nothing secret into returned meta when env set", () => {
    process.env.QUOTAGUARD_PROXY_URL =
      "https://u:p@us-east-shield-02.quotaguard.com:9294";
    const meta = sanitizeQuotaGuardUrlMeta(process.env.QUOTAGUARD_PROXY_URL);
    expect(JSON.stringify(meta)).not.toContain(":p@");
    expect(meta.passwordLen).toBe(1);
  });
});
