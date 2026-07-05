import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST_BLOCK_REASONS } from "@/lib/pre-close/post-block-reasons";
import type { JEDraft } from "@/lib/pre-close/types";

const pipelineMock = vi.hoisted(() => vi.fn());
const policyMock = vi.hoisted(() => vi.fn());
const policyPermitsMock = vi.hoisted(() => vi.fn());
const assertEntitlementMock = vi.hoisted(() => vi.fn());
const posterPostMock = vi.hoisted(() => vi.fn());
const publishMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/pre-close/remediation-pipeline", () => ({
  runRemediationPipeline: pipelineMock,
}));
vi.mock("@/lib/pre-close/posting-policy-resolver", () => ({
  resolvePostingPolicy: policyMock,
  policyPermitsAutoPost: policyPermitsMock,
}));
vi.mock("@/lib/entitlements/gate", () => ({
  assertEntitlement: assertEntitlementMock,
  EntitlementDenied: class extends Error {
    constructor(
      public addonCode: string,
      public engagementId: string | null,
      public reason: string,
    ) {
      super("denied");
      this.name = "EntitlementDenied";
    }
  },
}));
vi.mock("@/lib/erp/quickbooks/journal-entry-poster", () => ({
  qboJournalEntryPoster: { post: posterPostMock },
}));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: publishMock }));

import { makeMockDb } from "./_mock-db";
const mock = makeMockDb();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));

import { postApprovedReviewItem } from "@/lib/pre-close/post-approved-review-item";

function balanced(): JEDraft {
  return {
    narration: "n",
    transactionDate: "2026-07-06",
    lines: [
      { lineIndex: 0, accountId: "6000", accountName: "Rent", drAmountCents: 10000, crAmountCents: 0, memo: "" },
      { lineIndex: 1, accountId: "2100", accountName: "Accrued", drAmountCents: 0, crAmountCents: 10000, memo: "" },
    ],
  };
}

function seedItem(id: string, extra: Record<string, unknown> = {}) {
  mock.__seed("pre_close_review_items", [
    {
      id,
      fire_id: `fire-${id}`,
      firm_client_id: "fc1",
      engagement_id: "eng1",
      close_period_id: null,
      rule_id: "gen.rule",
      rule_version: 1,
      accounting_method: "accrual",
      je_draft: balanced(),
      je_draft_total_debit_cents: 10000,
      je_draft_total_credit_cents: 10000,
      je_draft_line_count: 2,
      rule_reason_code: "rc",
      rule_reason_detail: {},
      severity: "warning",
      evidence_refs: [],
      basis_guard_reason_code: null,
      basis_guard_reason_text: null,
      decision: "approved",
      decision_reason_code: "ok",
      decision_reason_text: "ok",
      reviewer_user_id: "u1",
      decision_at: "2026-07-06T00:00:00Z",
      edited_je_draft: null,
      posted_je_attempt_id: null,
      post_block_reason: null,
      assertion_tags: [],
      created_at: "2026-07-06T00:00:00Z",
      ...extra,
    },
  ]);
}

beforeEach(() => {
  mock.__reset();
  pipelineMock.mockReset();
  policyMock.mockReset();
  policyPermitsMock.mockReset();
  assertEntitlementMock.mockReset();
  posterPostMock.mockReset();
  publishMock.mockReset();
  publishMock.mockResolvedValue({});
  assertEntitlementMock.mockResolvedValue(undefined);
  policyMock.mockResolvedValue({
    engagementId: "eng1",
    policyCode: "advisacor_balanced",
    advisacorPreset: "advisacor_balanced",
    autoPostOnApproved: true,
    autoPostOnEditAndApproved: false,
    isDefaulted: false,
  });
  policyPermitsMock.mockReturnValue(true);
  pipelineMock.mockResolvedValue({
    ok: true,
    payload: { transaction_date: "2026-07-06", lines: [], currency: "USD" },
    remediationsApplied: [],
  });
  posterPostMock.mockResolvedValue({
    status: "posted",
    attempt_id: "att-1",
    qbo_je_id: "qbo-1",
  });
});

describe("post-approved-review-item unit", () => {
  it("not_found when row missing", async () => {
    const r = await postApprovedReviewItem({ reviewItemId: "missing", actorType: "user" });
    expect(r.status).toBe("not_found");
  });

  it("already_posted when posted_je_attempt_id set", async () => {
    seedItem("ri-posted", { posted_je_attempt_id: "att-old" });
    const r = await postApprovedReviewItem({ reviewItemId: "ri-posted", actorType: "user" });
    expect(r.status).toBe("already_posted");
  });

  it("already_blocked when post_block_reason set", async () => {
    seedItem("ri-blocked", { post_block_reason: POST_BLOCK_REASONS.UNKNOWN_ERROR });
    const r = await postApprovedReviewItem({ reviewItemId: "ri-blocked", actorType: "user" });
    expect(r.status).toBe("already_blocked");
  });

  it("not_eligible for rejected decision", async () => {
    seedItem("ri-rej", { decision: "rejected" });
    const r = await postApprovedReviewItem({ reviewItemId: "ri-rej", actorType: "user" });
    expect(r.status).toBe("not_eligible");
  });

  it("policy_skip when policy denies auto-post", async () => {
    seedItem("ri-skip");
    policyPermitsMock.mockReturnValue(false);
    const r = await postApprovedReviewItem({ reviewItemId: "ri-skip", actorType: "user" });
    expect(r.status).toBe("policy_skip");
  });

  it("overridePolicy bypasses policy check", async () => {
    seedItem("ri-override");
    policyPermitsMock.mockReturnValue(false);
    const r = await postApprovedReviewItem({
      reviewItemId: "ri-override",
      actorType: "user",
      overridePolicy: true,
    });
    expect(r.status).toBe("posted");
    expect(policyPermitsMock).not.toHaveBeenCalled();
  });

  it("entitlement denial -> post_blocked ENTITLEMENT_DENIED", async () => {
    const { EntitlementDenied } = await import("@/lib/entitlements/gate");
    seedItem("ri-ent");
    assertEntitlementMock.mockRejectedValue(new EntitlementDenied("ap_pay", "eng1", "inactive"));
    const r = await postApprovedReviewItem({ reviewItemId: "ri-ent", actorType: "user" });
    expect(r.status).toBe("post_blocked");
    if (r.status === "post_blocked") expect(r.reason).toBe(POST_BLOCK_REASONS.ENTITLEMENT_DENIED);
  });

  it("remediation blocks -> post_blocked with propagated reason", async () => {
    seedItem("ri-rem");
    pipelineMock.mockResolvedValue({
      ok: false,
      reason: POST_BLOCK_REASONS.QBO_INVALID_ACCOUNT_ID,
      remediationsApplied: [],
    });
    const r = await postApprovedReviewItem({ reviewItemId: "ri-rem", actorType: "user" });
    expect(r.status).toBe("post_blocked");
    if (r.status === "post_blocked") {
      expect(r.reason).toBe(POST_BLOCK_REASONS.QBO_INVALID_ACCOUNT_ID);
    }
  });

  it("poster rejected period_locked -> post_blocked QBO_PERIOD_LOCKED", async () => {
    seedItem("ri-rej-post");
    posterPostMock.mockResolvedValue({
      status: "rejected",
      attempt_id: "att-r",
      reason: "period_locked",
    });
    const r = await postApprovedReviewItem({ reviewItemId: "ri-rej-post", actorType: "user" });
    expect(r.status).toBe("post_blocked");
    if (r.status === "post_blocked") {
      expect(r.reason).toBe(POST_BLOCK_REASONS.QBO_PERIOD_LOCKED);
    }
  });

  it("poster failed -> post_blocked UNKNOWN_ERROR", async () => {
    seedItem("ri-fail");
    posterPostMock.mockResolvedValue({
      status: "failed",
      attempt_id: "att-f",
      error: "boom",
      retryable: false,
    });
    const r = await postApprovedReviewItem({ reviewItemId: "ri-fail", actorType: "user" });
    expect(r.status).toBe("post_blocked");
    if (r.status === "post_blocked") expect(r.reason).toBe(POST_BLOCK_REASONS.UNKNOWN_ERROR);
  });

  it("happy path posted -> writes attempt_id, emits event, ai_action_log", async () => {
    seedItem("ri-ok", { assertion_tags: ["cutoff"] });
    const r = await postApprovedReviewItem({ reviewItemId: "ri-ok", actorType: "user" });
    expect(r.status).toBe("posted");
    expect(mock.__state.pre_close_review_items[0].posted_je_attempt_id).toBe("att-1");
    expect(posterPostMock.mock.calls[0][0].assertions_addressed).toEqual(["cutoff"]);
    expect(posterPostMock.mock.calls[0][0].data_source_reliability_basis).toBe(
      "rule_synthesized_from_qbo_ledger",
    );
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "review_item.posted", eventCategory: "posting" }),
    );
    expect(mock.__state.ai_action_log.some((x) => x.action_category === "posting_attempt")).toBe(true);
  });

  it("empty assertion_tags omits data_source_reliability_basis", async () => {
    seedItem("ri-empty-tags", { assertion_tags: [] });
    await postApprovedReviewItem({ reviewItemId: "ri-empty-tags", actorType: "user" });
    expect(posterPostMock.mock.calls[0][0].assertions_addressed).toEqual([]);
    expect(posterPostMock.mock.calls[0][0].data_source_reliability_basis).toBeUndefined();
  });

  it("editedJeDraft preferred over jeDraft in pipeline input", async () => {
    const edited = balanced();
    edited.narration = "edited-version";
    seedItem("ri-edit", { decision: "edit_and_approved", edited_je_draft: edited });
    policyPermitsMock.mockReturnValue(true);
    await postApprovedReviewItem({ reviewItemId: "ri-edit", actorType: "user", overridePolicy: true });
    expect(pipelineMock.mock.calls[0][0].narration).toBe("edited-version");
  });

  it("idempotency key is pre_close_review_{reviewItemId}", async () => {
    seedItem("ri-idem");
    await postApprovedReviewItem({ reviewItemId: "ri-idem", actorType: "user" });
    expect(posterPostMock.mock.calls[0][0].idempotency_key).toBe("pre_close_review_ri-idem");
  });
});
