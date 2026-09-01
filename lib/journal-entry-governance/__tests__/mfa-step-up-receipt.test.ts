// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const USER_ID = "dc145a4f-e052-4d30-8512-32eb2c9c5289";
const SESSION_A = "11111111-1111-4111-8111-111111111111";
const SESSION_B = "22222222-2222-4222-8222-222222222222";

describe("MFA step-up receipt (session-bound signed cookie)", () => {
  beforeEach(() => {
    vi.stubEnv(
      "MFA_TRUSTED_DEVICE_SECRET",
      "01234567890123456789012345678901",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mints and verifies TOTP and WebAuthn receipts in the same format", async () => {
    const { signMfaVerifiedCookie, verifyMfaVerifiedCookie } = await import(
      "@/lib/mfa/trusted-devices"
    );
    const issuedAtMs = Date.now();
    for (const method of ["totp", "webauthn"] as const) {
      const { cookieValue } = await signMfaVerifiedCookie({
        userId: USER_ID,
        sessionId: SESSION_A,
        method,
        issuedAtMs,
      });
      expect(cookieValue.split(".").length).toBe(6);
      const ok = await verifyMfaVerifiedCookie(cookieValue, {
        userId: USER_ID,
        sessionId: SESSION_A,
      });
      expect(ok).toBe(true);
    }
  });

  it("rejects different session for same user", async () => {
    const { signMfaVerifiedCookie, verifyMfaVerifiedCookie } = await import(
      "@/lib/mfa/trusted-devices"
    );
    const { cookieValue } = await signMfaVerifiedCookie({
      userId: USER_ID,
      sessionId: SESSION_A,
      method: "totp",
    });
    const ok = await verifyMfaVerifiedCookie(cookieValue, {
      userId: USER_ID,
      sessionId: SESSION_B,
    });
    expect(ok).toBe(false);
  });

  it("rejects different user for same session binding", async () => {
    const { signMfaVerifiedCookie, verifyMfaVerifiedCookie } = await import(
      "@/lib/mfa/trusted-devices"
    );
    const { cookieValue } = await signMfaVerifiedCookie({
      userId: USER_ID,
      sessionId: SESSION_A,
      method: "totp",
    });
    const ok = await verifyMfaVerifiedCookie(cookieValue, {
      userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      sessionId: SESSION_A,
    });
    expect(ok).toBe(false);
  });

  it("rejects expired receipt", async () => {
    const { signMfaVerifiedCookie, verifyMfaVerifiedCookie } = await import(
      "@/lib/mfa/trusted-devices"
    );
    const issuedAtMs = Date.now() - 2 * 60 * 60 * 1000;
    const { cookieValue } = await signMfaVerifiedCookie({
      userId: USER_ID,
      sessionId: SESSION_A,
      method: "totp",
      issuedAtMs,
    });
    const ok = await verifyMfaVerifiedCookie(cookieValue, {
      userId: USER_ID,
      sessionId: SESSION_A,
    });
    expect(ok).toBe(false);
  });

  it("rejects tampered signature", async () => {
    const { signMfaVerifiedCookie, verifyMfaVerifiedCookie } = await import(
      "@/lib/mfa/trusted-devices"
    );
    const { cookieValue } = await signMfaVerifiedCookie({
      userId: USER_ID,
      sessionId: SESSION_A,
      method: "totp",
    });
    const tampered = `${cookieValue.slice(0, -4)}xxxx`;
    const ok = await verifyMfaVerifiedCookie(tampered, {
      userId: USER_ID,
      sessionId: SESSION_A,
    });
    expect(ok).toBe(false);
  });
});

const resolveSessionMock = vi.fn();
vi.mock("@/lib/mfa/verified-session", () => ({
  resolveVerifiedSupabaseSession: (...args: unknown[]) => resolveSessionMock(...args),
}));

const cookiesGetMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: cookiesGetMock,
  }),
}));

describe("verifyMfaStepUpForRequest (session binding via getClaims)", () => {
  beforeEach(() => {
    vi.stubEnv(
      "MFA_TRUSTED_DEVICE_SECRET",
      "01234567890123456789012345678901",
    );
    resolveSessionMock.mockReset();
    cookiesGetMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts receipt only for exact verified session", async () => {
    resolveSessionMock.mockResolvedValue({
      userId: USER_ID,
      sessionId: SESSION_A,
      aal: "aal2",
    });
    const { signMfaVerifiedCookie, mfaVerifiedCookieName } = await import(
      "@/lib/mfa/trusted-devices"
    );
    const { cookieValue } = await signMfaVerifiedCookie({
      userId: USER_ID,
      sessionId: SESSION_A,
      method: "totp",
      issuedAtMs: Date.now(),
    });
    cookiesGetMock.mockImplementation((name: string) =>
      name === mfaVerifiedCookieName() ? { value: cookieValue } : undefined,
    );
    const { verifyMfaStepUpForRequest } = await import(
      "@/lib/pre-close/mfa-step-up-verify"
    );
    const result = await verifyMfaStepUpForRequest(USER_ID);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.method).toBe("totp");
  });

  it("rejects when verified session differs from receipt session", async () => {
    resolveSessionMock.mockResolvedValue({
      userId: USER_ID,
      sessionId: SESSION_B,
      aal: "aal2",
    });
    const { signMfaVerifiedCookie, mfaVerifiedCookieName } = await import(
      "@/lib/mfa/trusted-devices"
    );
    const { cookieValue } = await signMfaVerifiedCookie({
      userId: USER_ID,
      sessionId: SESSION_A,
      method: "totp",
      issuedAtMs: Date.now(),
    });
    cookiesGetMock.mockImplementation((name: string) =>
      name === mfaVerifiedCookieName() ? { value: cookieValue } : undefined,
    );
    const { verifyMfaStepUpForRequest } = await import(
      "@/lib/pre-close/mfa-step-up-verify"
    );
    const result = await verifyMfaStepUpForRequest(USER_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("session_mismatch");
  });

  it("rejects when no verified session (logout / rotation)", async () => {
    resolveSessionMock.mockResolvedValue(null);
    const { verifyMfaStepUpForRequest } = await import(
      "@/lib/pre-close/mfa-step-up-verify"
    );
    const result = await verifyMfaStepUpForRequest(USER_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no_session");
  });
});

describe("sanitizeMfaReturnTo", () => {
  it("allows same-origin application paths only", async () => {
    const { sanitizeMfaReturnTo } = await import("@/lib/mfa/return-to");
    expect(sanitizeMfaReturnTo("/admin/sandbox-je")).toBe("/admin/sandbox-je");
    expect(sanitizeMfaReturnTo("//evil.com")).toBe("/dashboard");
    expect(sanitizeMfaReturnTo("https://evil.com")).toBe("/dashboard");
    expect(sanitizeMfaReturnTo("/path\\evil")).toBe("/dashboard");
  });
});

describe("isStrictProposalUuid", () => {
  it("blocks malformed proposal IDs before API hydration", async () => {
    const { isStrictProposalUuid } = await import("../sandbox-je-proposal-shared");
    expect(
      isStrictProposalUuid("750903ca-e3ab-4fdc-8ae8-a4a052c618e5"),
    ).toBe(true);
    expect(isStrictProposalUuid("not-a-uuid")).toBe(false);
    expect(isStrictProposalUuid("750903ca")).toBe(false);
    expect(isStrictProposalUuid("")).toBe(false);
  });
});
