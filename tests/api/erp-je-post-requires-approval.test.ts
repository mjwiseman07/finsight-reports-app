import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveFirmAccessMock = vi.hoisted(() => vi.fn());
const requireApprovalMock = vi.hoisted(() => vi.fn());
const posterPostMock = vi.hoisted(() => vi.fn());
const logGap3Mock = vi.hoisted(() => vi.fn());
const recordTraceMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/firm-security.js", () => ({
  resolveFirmAccess: resolveFirmAccessMock,
}));
vi.mock("@/lib/pre-close/require-approval", () => ({
  requireApproval: requireApprovalMock,
}));
vi.mock("@/lib/erp/quickbooks/journal-entry-poster", () => ({
  qboJournalEntryPoster: { post: posterPostMock },
}));
vi.mock("@/lib/pre-close/gap3-log", () => ({
  logGap3Action: logGap3Mock,
}));
vi.mock("@/lib/qbo/api-trace", () => ({
  recordQboApiTrace: recordTraceMock,
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      update: () => ({
        eq: () => ({
          is: updateMock,
        }),
      }),
    }),
  }),
}));

import { POST } from "@/app/api/erp/journal-entries/post/route";

function req(body: Record<string, unknown>) {
  return new Request("http://localhost/api/erp/journal-entries/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const baseBody = {
  firm_client_id: "fc1",
  idempotency_key: "k1",
  source_type: "manual",
  source_id: "s1",
  payload: { transaction_date: "2026-07-19", lines: [] },
};

describe("Gap 3 ERP JE post requires approval", () => {
  beforeEach(() => {
    resolveFirmAccessMock.mockReset();
    requireApprovalMock.mockReset();
    posterPostMock.mockReset();
    logGap3Mock.mockReset();
    recordTraceMock.mockReset();
    updateMock.mockReset();
    resolveFirmAccessMock.mockResolvedValue({ userId: "u2" });
    updateMock.mockResolvedValue({ error: null });
    recordTraceMock.mockResolvedValue(undefined);
    logGap3Mock.mockResolvedValue(undefined);
  });

  it("403 gap3_review_item_id_required without review_item_id", async () => {
    const res = await POST(req(baseBody));
    expect(res.status).toBe(403);
    const j = await res.json();
    expect(j.error).toBe("gap3_review_item_id_required");
  });

  it("403 review_item_not_decided", async () => {
    requireApprovalMock.mockResolvedValue({ ok: false, reason: "review_item_not_decided" });
    const res = await POST(req({ ...baseBody, review_item_id: "ri-1" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("review_item_not_decided");
  });

  it("403 review_item_wrong_firm", async () => {
    requireApprovalMock.mockResolvedValue({ ok: false, reason: "review_item_wrong_firm" });
    const res = await POST(req({ ...baseBody, review_item_id: "ri-1" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("review_item_wrong_firm");
  });

  it("403 autonomous_bucket_exceeded", async () => {
    requireApprovalMock.mockResolvedValue({ ok: false, reason: "autonomous_bucket_exceeded" });
    const res = await POST(req({ ...baseBody, review_item_id: "ri-1" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("autonomous_bucket_exceeded");
  });

  it("200 when gate passes and poster posts", async () => {
    requireApprovalMock.mockResolvedValue({
      ok: true,
      bundle: {
        review_item_id: "ri-1",
        firm_client_id: "fc1",
        engagement_id: "eng1",
        decision: "approved",
        proposed_by_user_id: "u1",
        approved_by_user_id: "u2",
        materiality_bucket: "low",
        requires_mfa_step_up: false,
        mfa_step_up_verified_at: null,
        mfa_step_up_method: null,
        gap3_grandfathered: false,
        autonomous_lane: false,
      },
    });
    posterPostMock.mockResolvedValue({
      status: "posted",
      attempt_id: "att-1",
      qbo_je_id: "qbo-1",
    });
    const res = await POST(req({ ...baseBody, review_item_id: "ri-1" }));
    expect(res.status).toBe(200);
    expect(posterPostMock).toHaveBeenCalled();
    expect(recordTraceMock).toHaveBeenCalled();
  });
});
