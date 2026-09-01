// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";

const verifyMfaStepUpMock = vi.fn();
vi.mock("@/lib/pre-close/mfa-step-up-verify", () => ({
  verifyMfaStepUpForRequest: (...args: unknown[]) => verifyMfaStepUpMock(...args),
}));

const APPROVER_ID = "dc145a4f-e052-4d30-8512-32eb2c9c5289";

describe("resolveJeAuthenticationAssurance (unified step-up receipt only)", () => {
  beforeEach(() => {
    verifyMfaStepUpMock.mockReset();
  });

  it("accepts only mfa_step_up_cookie when receipt is valid", async () => {
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
  });

  it("rejects when step-up receipt is absent (no JWT fallback)", async () => {
    verifyMfaStepUpMock.mockResolvedValue({ ok: false, reason: "no_cookie" });
    const { resolveJeAuthenticationAssurance } = await import("../approval-custody");
    const result = await resolveJeAuthenticationAssurance(APPROVER_ID);
    expect(result.satisfied).toBe(false);
    expect(result.source).toBe("none");
  });

  it("rejects session_mismatch from step-up verifier", async () => {
    verifyMfaStepUpMock.mockResolvedValue({ ok: false, reason: "session_mismatch" });
    const { resolveJeAuthenticationAssurance } = await import("../approval-custody");
    const result = await resolveJeAuthenticationAssurance(APPROVER_ID);
    expect(result.satisfied).toBe(false);
    expect(result.source).toBe("none");
  });

  it("rejects expired receipt", async () => {
    verifyMfaStepUpMock.mockResolvedValue({ ok: false, reason: "expired" });
    const { resolveJeAuthenticationAssurance } = await import("../approval-custody");
    const result = await resolveJeAuthenticationAssurance(APPROVER_ID);
    expect(result.satisfied).toBe(false);
  });
});
