import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MFA_STEP_UP_WINDOW_MS,
  requireApproval,
} from "@/lib/pre-close/require-approval";

const fromMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: fromMock }),
}));

function bundle(over: Record<string, unknown> = {}) {
  return {
    review_item_id: "ri-1",
    firm_client_id: "fc1",
    engagement_id: "eng1",
    decision: "approved",
    decision_at: "2026-07-19T00:00:00Z",
    proposed_by_user_id: "u1",
    approved_by_user_id: "u2",
    materiality_bucket: "high",
    requires_mfa_step_up: true,
    mfa_step_up_verified_at: new Date().toISOString(),
    mfa_step_up_method: "totp",
    sod_check_passed_at: "2026-07-19T00:00:00Z",
    je_draft_total_debit_cents: 2_000_000,
    je_draft_total_credit_cents: 2_000_000,
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

describe("Gap 3 MFA gate via requireApproval", () => {
  beforeEach(() => fromMock.mockReset());

  it("mfa_step_up_required when verified_at is null", async () => {
    mockMaybeSingle(bundle({ mfa_step_up_verified_at: null }));
    const r = await requireApproval("ri-1", "fc1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("mfa_step_up_required");
  });

  it("mfa_step_up_expired when older than 15 min", async () => {
    const stale = new Date(Date.now() - MFA_STEP_UP_WINDOW_MS - 1000).toISOString();
    mockMaybeSingle(bundle({ mfa_step_up_verified_at: stale }));
    const r = await requireApproval("ri-1", "fc1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("mfa_step_up_expired");
  });

  it("ok for high-materiality with fresh MFA", async () => {
    mockMaybeSingle(bundle());
    const r = await requireApproval("ri-1", "fc1");
    expect(r.ok).toBe(true);
  });

  it("ok for grandfathered rows without MFA", async () => {
    mockMaybeSingle(
      bundle({
        gap3_grandfathered: true,
        requires_mfa_step_up: true,
        mfa_step_up_verified_at: null,
      }),
    );
    const r = await requireApproval("ri-1", "fc1");
    expect(r.ok).toBe(true);
  });

  it("ok for autonomous_lane without MFA", async () => {
    mockMaybeSingle(
      bundle({
        autonomous_lane: true,
        requires_mfa_step_up: true,
        mfa_step_up_verified_at: null,
        materiality_bucket: "low",
        autonomous_max_bucket: "low",
      }),
    );
    const r = await requireApproval("ri-1", "fc1");
    expect(r.ok).toBe(true);
  });
});
