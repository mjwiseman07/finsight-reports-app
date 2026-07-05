import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST_BLOCK_REASONS } from "@/lib/pre-close/post-block-reasons";
import type { JEDraft } from "@/lib/pre-close/types";

const pipelineMock = vi.hoisted(() => vi.fn());
const posterPostMock = vi.hoisted(() => vi.fn());
const assertEntitlementMock = vi.hoisted(() => vi.fn());
const policyPermitsMock = vi.hoisted(() => vi.fn());
const policyMock = vi.hoisted(() => vi.fn());
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

function seedApproved(id: string, extra: Record<string, unknown> = {}) {
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
      assertion_tags: ["accuracy", "completeness"],
      created_at: "2026-07-06T00:00:00Z",
      ...extra,
    },
  ]);
}

beforeEach(() => {
  mock.__reset();
  pipelineMock.mockReset();
  posterPostMock.mockReset();
  assertEntitlementMock.mockReset();
  policyPermitsMock.mockReset();
  policyMock.mockReset();
  publishMock.mockReset();
  publishMock.mockResolvedValue({});
  assertEntitlementMock.mockResolvedValue(undefined);
  policyMock.mockResolvedValue({
    engagementId: "eng1",
    policyCode: "advisacor_balanced",
    autoPostOnApproved: true,
    autoPostOnEditAndApproved: false,
    isDefaulted: false,
  });
  policyPermitsMock.mockReturnValue(true);
  posterPostMock.mockResolvedValue({
    status: "posted",
    attempt_id: "att-int-1",
    qbo_je_id: "qbo-int-1",
  });
});

describe("post-approved-review-item integration", () => {
  it("full loop: approved item -> posted_je_attempt_id written", async () => {
    seedApproved("ri-int-1");
    pipelineMock.mockResolvedValue({
      ok: true,
      payload: { transaction_date: "2026-07-06", lines: [], currency: "USD" },
      remediationsApplied: [],
    });
    const r = await postApprovedReviewItem({ reviewItemId: "ri-int-1", actorType: "user" });
    expect(r.status).toBe("posted");
    expect(mock.__state.pre_close_review_items[0].posted_je_attempt_id).toBe("att-int-1");
    expect(posterPostMock.mock.calls[0][0].assertions_addressed).toEqual([
      "accuracy",
      "completeness",
    ]);
    expect(posterPostMock.mock.calls[0][0].data_source_reliability_basis).toBe(
      "rule_synthesized_from_qbo_ledger",
    );
  });

  it("set-once: second call returns already_posted", async () => {
    seedApproved("ri-int-2");
    pipelineMock.mockResolvedValue({
      ok: true,
      payload: { transaction_date: "2026-07-06", lines: [], currency: "USD" },
      remediationsApplied: [],
    });
    await postApprovedReviewItem({ reviewItemId: "ri-int-2", actorType: "user" });
    const r2 = await postApprovedReviewItem({ reviewItemId: "ri-int-2", actorType: "user" });
    expect(r2.status).toBe("already_posted");
  });

  it("block path: unresolvable account -> post_block_reason + ledger event", async () => {
    seedApproved("ri-int-3");
    pipelineMock.mockResolvedValue({
      ok: false,
      reason: POST_BLOCK_REASONS.ACCOUNT_MAPPING_UNRESOLVED,
      remediationsApplied: [],
    });
    const r = await postApprovedReviewItem({ reviewItemId: "ri-int-3", actorType: "user" });
    expect(r.status).toBe("post_blocked");
    expect(mock.__state.pre_close_review_items[0].post_block_reason).toBe(
      POST_BLOCK_REASONS.ACCOUNT_MAPPING_UNRESOLVED,
    );
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "review_item.post_blocked", eventCategory: "posting" }),
    );
  });

  it("retry after block returns already_blocked", async () => {
    seedApproved("ri-int-4");
    pipelineMock.mockResolvedValue({
      ok: false,
      reason: POST_BLOCK_REASONS.ACCOUNT_MAPPING_UNRESOLVED,
      remediationsApplied: [],
    });
    await postApprovedReviewItem({ reviewItemId: "ri-int-4", actorType: "user" });
    const r2 = await postApprovedReviewItem({ reviewItemId: "ri-int-4", actorType: "user" });
    expect(r2.status).toBe("already_blocked");
  });
});
