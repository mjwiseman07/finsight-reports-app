import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.hoisted(() => vi.fn());
const stepUpMock = vi.hoisted(() => vi.fn());
const verifyCookieMock = vi.hoisted(() => vi.fn());
const issueTokenMock = vi.hoisted(() => vi.fn());
const sendEmailMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "cookie" }) }),
}));
vi.mock("@/lib/mfa/server", () => ({ getUserFromRequest: getUserMock }));
vi.mock("@/lib/pre-close/mfa-step-up-verify", () => ({
  verifyMfaStepUpForRequest: stepUpMock,
}));
vi.mock("@/lib/mfa/trusted-devices", () => ({
  mfaVerifiedCookieName: () => "advisacor_mfa_verified",
  verifyMfaVerifiedCookie: verifyCookieMock,
}));
vi.mock("@/lib/gap2/purge-tokens", () => ({ issuePurgeToken: issueTokenMock }));
vi.mock("@/lib/gap2/notifications", () => ({
  sendCustomerPurgeConfirmEmail: sendEmailMock,
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: fromMock }),
}));

import { POST } from "../route";

describe("POST /api/account/request-data-purge", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    stepUpMock.mockReset();
    verifyCookieMock.mockReset();
    issueTokenMock.mockReset();
    sendEmailMock.mockReset();
    fromMock.mockReset();
  });

  it("403 without MFA step-up", async () => {
    getUserMock.mockResolvedValue({ id: "u1", email: "a@b.com" });
    stepUpMock.mockResolvedValue({ ok: false, reason: "no_cookie" });
    verifyCookieMock.mockResolvedValue(false);
    const res = await POST(new Request("http://localhost/api/account/request-data-purge", { method: "POST" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("mfa_step_up_required");
  });

  it("ok when MFA + firm owner", async () => {
    getUserMock.mockResolvedValue({ id: "u1", email: "a@b.com" });
    stepUpMock.mockResolvedValue({
      ok: true,
      verifiedAt: new Date(),
      method: "totp",
    });
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { id: "firm-1" }, error: null }),
        }),
      }),
    });
    issueTokenMock.mockResolvedValue("tok");
    sendEmailMock.mockResolvedValue(undefined);
    const res = await POST(new Request("http://localhost/api/account/request-data-purge", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(issueTokenMock).toHaveBeenCalledWith("firm-1", "u1");
  });
});
