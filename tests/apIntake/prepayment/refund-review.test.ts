import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "@/tests/entitlements/_mock-supabase";

const mock = makeMockSupabase();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn() }));

import { reviewRefundDraft, PrepaymentValidationError } from "@/lib/ap-intake/prepayment/service";
import { publishEvent } from "@/lib/events/publisher";

const FIRM = "00000000-0000-0000-0000-000000007e01";
const CLIENT = "00000000-0000-0000-0000-000000007e02";
const ENG = "00000000-0000-0000-0000-000000007e03";
const USER = "00000000-0000-0000-0000-000000007e04";

function seedGates() {
  mock.__state.engagement_addons.push({
    engagement_id: ENG,
    addon_code: "ap_credit_prepayment",
    is_active: true,
  });
  mock.__state.pilot_feature_allowlist.push({
    firm_id: FIRM,
    feature_code: "ap_credit_prepayment",
    revoked_at: null,
  });
}

function seedDraft(id: string, status = "pending_reviewer") {
  mock.__state.refund_request_drafts.push({
    id,
    firm_id: FIRM,
    firm_client_id: CLIENT,
    status,
  });
}

describe("refund draft review", () => {
  beforeEach(() => {
    mock.__reset();
    vi.mocked(publishEvent).mockClear();
    seedGates();
  });

  it.each([
    ["approved", "reviewer_approved"],
    ["rejected", "reviewer_rejected"],
    ["deferred", "reviewer_deferred"],
  ] as const)("decision=%s sets status=%s and emits event", async (decision, expectedStatus) => {
    const draftId = `draft-${decision}`;
    seedDraft(draftId);
    await reviewRefundDraft({
      firmId: FIRM,
      firmClientId: CLIENT,
      engagementId: ENG,
      draftId,
      decision,
      notes: "note",
      reviewerUserId: USER,
    });
    const row = mock.__state.refund_request_drafts.find((d) => d.id === draftId);
    expect(row?.status).toBe(expectedStatus);
    expect(vi.mocked(publishEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "prepayment.refund_draft_reviewed",
        aggregateId: draftId,
      }),
    );
  });

  it("throws when reviewing an already-decided draft", async () => {
    seedDraft("draft-done", "reviewer_approved");
    await expect(
      reviewRefundDraft({
        firmId: FIRM,
        firmClientId: CLIENT,
        engagementId: ENG,
        draftId: "draft-done",
        decision: "rejected",
        reviewerUserId: USER,
      }),
    ).rejects.toBeInstanceOf(PrepaymentValidationError);
  });
});
