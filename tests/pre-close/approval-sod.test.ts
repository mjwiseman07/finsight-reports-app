/**
 * Gap 3 — SoD gate via requireApproval (DB trigger is authoritative in prod;
 * this suite locks the application-layer mirror used by the POST endpoint).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: fromMock }),
}));

import { requireApproval } from "@/lib/pre-close/require-approval";

function bundle(over: Record<string, unknown> = {}) {
  return {
    review_item_id: "ri-1",
    firm_client_id: "fc1",
    engagement_id: "eng1",
    decision: "approved",
    decision_at: "2026-07-19T00:00:00Z",
    proposed_by_user_id: "u1",
    approved_by_user_id: "u2",
    materiality_bucket: "low",
    requires_mfa_step_up: false,
    mfa_step_up_verified_at: null,
    mfa_step_up_method: null,
    sod_check_passed_at: "2026-07-19T00:00:00Z",
    je_draft_total_debit_cents: 50000,
    je_draft_total_credit_cents: 50000,
    gap3_grandfathered: false,
    autonomous_lane: false,
    posted_je_attempt_id: null,
    autonomous_posting_enabled: false,
    autonomous_max_bucket: null,
    ...over,
  };
}

function mockMaybeSingle(data: Record<string, unknown> | null) {
  fromMock.mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data, error: null }),
      }),
    }),
  });
}

describe("Gap 3 SoD via requireApproval", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("blocks when proposer === approver", async () => {
    mockMaybeSingle(bundle({ proposed_by_user_id: "u1", approved_by_user_id: "u1" }));
    const r = await requireApproval("ri-1", "fc1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("sod_violation_same_user");
  });

  it("allows when proposer ≠ approver", async () => {
    mockMaybeSingle(bundle({ proposed_by_user_id: "u1", approved_by_user_id: "u2" }));
    const r = await requireApproval("ri-1", "fc1");
    expect(r.ok).toBe(true);
  });

  it("allows when proposed_by_user_id is null (rule_engine origin)", async () => {
    mockMaybeSingle(bundle({ proposed_by_user_id: null, approved_by_user_id: "u2" }));
    const r = await requireApproval("ri-1", "fc1");
    expect(r.ok).toBe(true);
  });

  it("skips SoD when autonomous_lane=true (bucket gates still apply)", async () => {
    mockMaybeSingle(
      bundle({
        autonomous_lane: true,
        proposed_by_user_id: "u1",
        approved_by_user_id: "u1",
        materiality_bucket: "low",
        autonomous_max_bucket: "low",
        autonomous_posting_enabled: true,
      }),
    );
    const r = await requireApproval("ri-1", "fc1");
    expect(r.ok).toBe(true);
  });

  it("denies missing approver on non-autonomous lane", async () => {
    mockMaybeSingle(bundle({ approved_by_user_id: null }));
    const r = await requireApproval("ri-1", "fc1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("sod_violation_missing_approver");
  });
});
