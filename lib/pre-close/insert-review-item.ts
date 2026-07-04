/**
 * D6.4c-1 — Insert a composed pre_close_review_items row.
 *
 * Separated from composeProposal so the pure composition step is testable
 * without hitting the DB, and so D6.4c-2's orchestrator can wrap this in a
 * single transaction with the ledger_event and ai_action_log inserts.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";
import { validateJeDraft } from "./je-draft-validate";
import type { ReviewItemCompositionInput, ReviewItemRow } from "./types";

export class InsertReviewItemError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "InsertReviewItemError";
  }
}

export async function insertReviewItem(
  input: ReviewItemCompositionInput,
): Promise<ReviewItemRow> {
  const supabase = createServiceClient();

  const v = validateJeDraft(input.jeDraft);
  if (!v.ok) {
    throw new InsertReviewItemError(`invalid je_draft: ${v.reason}`);
  }

  const { data, error } = await supabase
    .from("pre_close_review_items")
    .insert({
      fire_id: input.fireId,
      firm_client_id: input.firmClientId,
      engagement_id: input.engagementId,
      close_period_id: input.closePeriodId,
      rule_id: input.ruleId,
      rule_version: input.ruleVersion,
      accounting_method: input.accountingMethod,
      je_draft: input.jeDraft,
      je_draft_total_debit_cents: v.totalDebitCents,
      je_draft_total_credit_cents: v.totalCreditCents,
      je_draft_line_count: v.lineCount,
      rule_reason_code: input.ruleReasonCode,
      rule_reason_detail: input.ruleReasonDetail,
      severity: input.severity,
      evidence_refs: input.evidenceRefs,
      basis_guard_reason_code: input.basisGuardReasonCode ?? null,
      basis_guard_reason_text: input.basisGuardReasonText ?? null,
    })
    .select("*")
    .single();

  if (error) throw new InsertReviewItemError("insert failed", error);
  if (!data) throw new InsertReviewItemError("insert returned no row");

  // Emit ledger event (rule category — this is a rule-driven state change)
  await publishEvent({
    eventType: "review_item.composed",
    eventCategory: "rule",
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "pre_close_review_item",
    aggregateId: data.id as string,
    actorType: "rule",
    payload: {
      rule_id: input.ruleId,
      rule_version: input.ruleVersion,
      fire_id: input.fireId,
      severity: input.severity,
      accounting_method: input.accountingMethod,
      total_debit_cents: v.totalDebitCents,
    },
  });

  return rowToReviewItem(data);
}

export function rowToReviewItem(row: Record<string, unknown>): ReviewItemRow {
  return {
    id: row.id as string,
    fireId: row.fire_id as string,
    firmClientId: row.firm_client_id as string,
    engagementId: row.engagement_id as string,
    closePeriodId: (row.close_period_id as string | null) ?? null,
    ruleId: row.rule_id as string,
    ruleVersion: row.rule_version as number,
    accountingMethod: row.accounting_method as "cash" | "accrual" | "modified_cash",
    jeDraft: row.je_draft as unknown as ReviewItemRow["jeDraft"],
    jeDraftTotalDebitCents: row.je_draft_total_debit_cents as number,
    jeDraftTotalCreditCents: row.je_draft_total_credit_cents as number,
    jeDraftLineCount: row.je_draft_line_count as number,
    ruleReasonCode: row.rule_reason_code as string,
    ruleReasonDetail: (row.rule_reason_detail as Record<string, unknown>) ?? {},
    severity: row.severity as ReviewItemRow["severity"],
    evidenceRefs: (row.evidence_refs as Array<Record<string, unknown>>) ?? [],
    basisGuardReasonCode: (row.basis_guard_reason_code as ReviewItemRow["basisGuardReasonCode"]) ?? null,
    basisGuardReasonText: (row.basis_guard_reason_text as string | null) ?? null,
    decision: (row.decision as ReviewItemRow["decision"]) ?? null,
    decisionReasonCode: (row.decision_reason_code as string | null) ?? null,
    decisionReasonText: (row.decision_reason_text as string | null) ?? null,
    reviewerUserId: (row.reviewer_user_id as string | null) ?? null,
    decisionAt: (row.decision_at as string | null) ?? null,
    editedJeDraft: (row.edited_je_draft as ReviewItemRow["editedJeDraft"]) ?? null,
    postedJeAttemptId: (row.posted_je_attempt_id as string | null) ?? null,
    postBlockReason: (row.post_block_reason as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}
