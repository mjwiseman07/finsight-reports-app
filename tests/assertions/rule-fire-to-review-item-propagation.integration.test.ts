import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockDb } from "../pre-close/_mock-db";

const mock = makeMockDb();
const publishSpy = vi.hoisted(() => vi.fn(async () => ({})));
const posterPostMock = vi.hoisted(() => vi.fn());
const pipelineMock = vi.hoisted(() => vi.fn());
const policyMock = vi.hoisted(() => vi.fn());
const policyPermitsMock = vi.hoisted(() => vi.fn());
const assertEntitlementMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: publishSpy }));
vi.mock("@/lib/erp/quickbooks/journal-entry-poster", () => ({
  qboJournalEntryPoster: { post: posterPostMock },
}));
vi.mock("@/lib/pre-close/remediation-pipeline", () => ({ runRemediationPipeline: pipelineMock }));
vi.mock("@/lib/pre-close/posting-policy-resolver", () => ({
  resolvePostingPolicy: policyMock,
  policyPermitsAutoPost: policyPermitsMock,
}));
vi.mock("@/lib/entitlements/gate", () => ({
  assertEntitlement: assertEntitlementMock,
  EntitlementDenied: class extends Error {},
}));

import { insertReviewItem } from "@/lib/pre-close/insert-review-item";
import { postApprovedReviewItem } from "@/lib/pre-close/post-approved-review-item";
import { clearResolverCache } from "@/lib/assertions/resolve-rule-assertions";
import type { JEDraft } from "@/lib/pre-close/types";

function balanced(): JEDraft {
  return {
    narration: "n",
    transactionDate: "2026-07-06",
    lines: [
      { lineIndex: 0, accountId: "a", accountName: "A", drAmountCents: 500, crAmountCents: 0, memo: "" },
      { lineIndex: 1, accountId: "b", accountName: "B", drAmountCents: 0, crAmountCents: 500, memo: "" },
    ],
  };
}

beforeEach(() => {
  mock.__reset();
  clearResolverCache(mock as never);
  publishSpy.mockClear();
  posterPostMock.mockReset();
  pipelineMock.mockReset();
  policyMock.mockResolvedValue({
    engagementId: "eng1",
    policyCode: "advisacor_balanced",
    autoPostOnApproved: true,
    autoPostOnEditAndApproved: false,
    isDefaulted: false,
  });
  policyPermitsMock.mockReturnValue(true);
  assertEntitlementMock.mockResolvedValue(undefined);
  pipelineMock.mockResolvedValue({
    ok: true,
    payload: { transaction_date: "2026-07-06", lines: [], currency: "USD" },
    remediationsApplied: [],
  });
  posterPostMock.mockResolvedValue({
    status: "posted",
    attempt_id: "att-e2e",
    qbo_je_id: "qbo-e2e",
  });
});

describe("rule fire to review item propagation", () => {
  it("fire lands -> review item inserted with assertion_tags matching rule_assertion_coverage", async () => {
    mock.__seed("rule_assertion_coverage", [
      { rule_id: "gen.rule", assertion_id: "completeness" },
      { rule_id: "gen.rule", assertion_id: "accuracy" },
    ]);
    const row = await insertReviewItem({
      fireId: "fire-1",
      firmClientId: "fc1",
      engagementId: "eng1",
      closePeriodId: "cp1",
      ruleId: "gen.rule",
      ruleVersion: 1,
      accountingMethod: "accrual",
      ruleReasonCode: "rc",
      ruleReasonDetail: {},
      severity: "warning",
      jeDraft: balanced(),
      evidenceRefs: [],
    });
    expect(row.assertionTags).toEqual(["accuracy", "completeness"]);
  });

  it("review item approved -> JE post carries assertion_tags", async () => {
    mock.__seed("rule_assertion_coverage", [{ rule_id: "gen.rule", assertion_id: "cutoff" }]);
    const row = await insertReviewItem({
      fireId: "fire-2",
      firmClientId: "fc1",
      engagementId: "eng1",
      closePeriodId: "cp1",
      ruleId: "gen.rule",
      ruleVersion: 1,
      accountingMethod: "accrual",
      ruleReasonCode: "rc",
      ruleReasonDetail: {},
      severity: "warning",
      jeDraft: balanced(),
      evidenceRefs: [],
    });
    mock.__state.pre_close_review_items[0].decision = "approved";
    mock.__state.pre_close_review_items[0].decision_reason_code = "ok";
    mock.__state.pre_close_review_items[0].decision_reason_text = "ok";
    mock.__state.pre_close_review_items[0].reviewer_user_id = "u1";
    mock.__state.pre_close_review_items[0].decision_at = "2026-07-06T00:00:00Z";
    await postApprovedReviewItem({ reviewItemId: row.id, actorType: "user" });
    expect(posterPostMock.mock.calls[0][0].assertions_addressed).toEqual(["cutoff"]);
    expect(posterPostMock.mock.calls[0][0].data_source_reliability_basis).toBe(
      "rule_synthesized_from_qbo_ledger",
    );
  });

  it("multi-rule path: only the specific rule coverage propagates", async () => {
    mock.__seed("rule_assertion_coverage", [
      { rule_id: "gen.rule", assertion_id: "classification" },
      { rule_id: "gen.other", assertion_id: "presentation_disclosure" },
    ]);
    const row = await insertReviewItem({
      fireId: "fire-3",
      firmClientId: "fc1",
      engagementId: "eng1",
      closePeriodId: "cp1",
      ruleId: "gen.rule",
      ruleVersion: 1,
      accountingMethod: "accrual",
      ruleReasonCode: "rc",
      ruleReasonDetail: {},
      severity: "warning",
      jeDraft: balanced(),
      evidenceRefs: [],
    });
    expect(row.assertionTags).toEqual(["classification"]);
  });

  it("reject decision does not post; je_posting_audit has no row", async () => {
    mock.__seed("rule_assertion_coverage", [{ rule_id: "gen.rule", assertion_id: "accuracy" }]);
    const row = await insertReviewItem({
      fireId: "fire-4",
      firmClientId: "fc1",
      engagementId: "eng1",
      closePeriodId: "cp1",
      ruleId: "gen.rule",
      ruleVersion: 1,
      accountingMethod: "accrual",
      ruleReasonCode: "rc",
      ruleReasonDetail: {},
      severity: "warning",
      jeDraft: balanced(),
      evidenceRefs: [],
    });
    mock.__state.pre_close_review_items[0].decision = "rejected";
    const r = await postApprovedReviewItem({ reviewItemId: row.id, actorType: "user" });
    expect(r.status).toBe("not_eligible");
    expect(posterPostMock).not.toHaveBeenCalled();
    expect(mock.__state.je_posting_audit ?? []).toHaveLength(0);
  });

  it("basis-guard-blocked item does not post; assertion_tags stay on review item", async () => {
    mock.__seed("rule_assertion_coverage", [{ rule_id: "gen.rule", assertion_id: "accuracy" }]);
    const row = await insertReviewItem({
      fireId: "fire-5",
      firmClientId: "fc1",
      engagementId: "eng1",
      closePeriodId: "cp1",
      ruleId: "gen.rule",
      ruleVersion: 1,
      accountingMethod: "accrual",
      ruleReasonCode: "rc",
      ruleReasonDetail: {},
      severity: "warning",
      jeDraft: balanced(),
      evidenceRefs: [],
      basisGuardReasonCode: "basis_mismatch_accrual_on_cash",
      basisGuardReasonText: "blocked",
    });
    mock.__state.pre_close_review_items[0].decision = "approved";
    pipelineMock.mockResolvedValue({
      ok: false,
      reason: "account_mapping_unresolved",
      remediationsApplied: [],
    });
    await postApprovedReviewItem({ reviewItemId: row.id, actorType: "user" });
    expect(mock.__state.pre_close_review_items[0].assertion_tags).toEqual(["accuracy"]);
    expect(posterPostMock).not.toHaveBeenCalled();
  });
});
