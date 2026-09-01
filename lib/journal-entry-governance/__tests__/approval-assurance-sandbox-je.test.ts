// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";

const verifyMfaStepUpMock = vi.fn();
vi.mock("@/lib/pre-close/mfa-step-up-verify", () => ({
  verifyMfaStepUpForRequest: (...args: unknown[]) => verifyMfaStepUpMock(...args),
}));

const cookiesGetMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: cookiesGetMock,
  }),
}));

function b64urlJson(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function fakeAccessToken(payload: object): string {
  return `${b64urlJson({ alg: "none" })}.${b64urlJson(payload)}.sig`;
}

const APPROVER_ID = "dc145a4f-e052-4d30-8512-32eb2c9c5289";

describe("resolveJeAuthenticationAssurance (post-acceptance MFA paths)", () => {
  beforeEach(() => {
    verifyMfaStepUpMock.mockReset();
    cookiesGetMock.mockReset();
  });

  it("prefers mfa_step_up_cookie when present and valid", async () => {
    verifyMfaStepUpMock.mockResolvedValue({
      ok: true,
      verifiedAt: new Date("2026-09-01T04:00:00.000Z"),
      method: "totp",
    });
    const { resolveJeAuthenticationAssurance } = await import("../approval-custody");
    const result = await resolveJeAuthenticationAssurance(APPROVER_ID);
    expect(result.satisfied).toBe(true);
    expect(result.source).toBe("mfa_step_up_cookie");
    expect(result.level).toBe("aal2");
    expect(cookiesGetMock).not.toHaveBeenCalled();
  });

  it("accepts fresh supabase_jwt_aal2 when step-up cookie is absent", async () => {
    verifyMfaStepUpMock.mockResolvedValue({ ok: false, reason: "no_cookie" });
    const nowSec = Math.floor(Date.now() / 1000);
    cookiesGetMock.mockImplementation((name: string) =>
      name === ADVISACOR_ACCESS_TOKEN_COOKIE
        ? {
            value: fakeAccessToken({
              sub: APPROVER_ID,
              aal: "aal2",
              amr: [{ method: "totp", timestamp: nowSec }],
            }),
          }
        : undefined,
    );
    const { resolveJeAuthenticationAssurance } = await import("../approval-custody");
    const result = await resolveJeAuthenticationAssurance(APPROVER_ID);
    expect(result.satisfied).toBe(true);
    expect(result.source).toBe("supabase_jwt_aal2");
    expect(result.method).toBe("totp");
  });

  it("rejects stale AAL2 JWT amr beyond the 15-minute step-up window", async () => {
    verifyMfaStepUpMock.mockResolvedValue({ ok: false, reason: "no_cookie" });
    const staleSec = Math.floor((Date.now() - 16 * 60 * 1000) / 1000);
    cookiesGetMock.mockImplementation((name: string) =>
      name === ADVISACOR_ACCESS_TOKEN_COOKIE
        ? {
            value: fakeAccessToken({
              sub: APPROVER_ID,
              aal: "aal2",
              amr: [{ method: "totp", timestamp: staleSec }],
            }),
          }
        : undefined,
    );
    const { resolveJeAuthenticationAssurance } = await import("../approval-custody");
    const result = await resolveJeAuthenticationAssurance(APPROVER_ID);
    expect(result.satisfied).toBe(false);
    expect(result.source).toBe("none");
  });

  it("rejects JWT subject mismatch (user binding)", async () => {
    verifyMfaStepUpMock.mockResolvedValue({ ok: false, reason: "no_cookie" });
    const nowSec = Math.floor(Date.now() / 1000);
    cookiesGetMock.mockImplementation((name: string) =>
      name === ADVISACOR_ACCESS_TOKEN_COOKIE
        ? {
            value: fakeAccessToken({
              sub: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
              aal: "aal2",
              amr: [{ method: "totp", timestamp: nowSec }],
            }),
          }
        : undefined,
    );
    const { resolveJeAuthenticationAssurance } = await import("../approval-custody");
    const result = await resolveJeAuthenticationAssurance(APPROVER_ID);
    expect(result.satisfied).toBe(false);
  });

  it("rejects aal1 JWT without second factor amr", async () => {
    verifyMfaStepUpMock.mockResolvedValue({ ok: false, reason: "no_cookie" });
    const nowSec = Math.floor(Date.now() / 1000);
    cookiesGetMock.mockImplementation((name: string) =>
      name === ADVISACOR_ACCESS_TOKEN_COOKIE
        ? {
            value: fakeAccessToken({
              sub: APPROVER_ID,
              aal: "aal1",
              amr: [{ method: "password", timestamp: nowSec }],
            }),
          }
        : undefined,
    );
    const { resolveJeAuthenticationAssurance } = await import("../approval-custody");
    const result = await resolveJeAuthenticationAssurance(APPROVER_ID);
    expect(result.satisfied).toBe(false);
    expect(result.source).toBe("none");
  });
});
