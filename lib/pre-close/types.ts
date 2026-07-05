/**
 * D6.4c-1 — Types for the pre-close review queue + composer.
 */
import type { BasisGuardReasonCode } from "@/lib/basis/reasons";

export type Decision =
  | "approved"
  | "rejected"
  | "deferred"
  | "edit_and_approved";

export interface JEDraftLine {
  lineIndex: number;
  accountId: string;
  accountName: string;
  drAmountCents: number; // integer cents; migration enforces sum(dr) === sum(cr)
  crAmountCents: number;
  memo: string;
  evidenceRef?: {
    kind: "curated_rule_fire" | "ap_accrual" | "generic";
    ref: string;
    detail?: Record<string, unknown>;
  };
}

export interface JEDraft {
  narration: string;
  transactionDate: string; // YYYY-MM-DD
  lines: JEDraftLine[];
}

export interface ReviewItemCompositionInput {
  fireId: string;
  firmClientId: string;
  engagementId: string;
  closePeriodId: string | null;
  ruleId: string;
  ruleVersion: number;
  accountingMethod: "cash" | "accrual" | "modified_cash";
  ruleReasonCode: string;
  ruleReasonDetail: Record<string, unknown>;
  severity: "info" | "warning" | "error" | "critical";
  jeDraft: JEDraft;
  evidenceRefs: Array<Record<string, unknown>>;
  basisGuardReasonCode?: BasisGuardReasonCode | null;
  basisGuardReasonText?: string | null;
}

export interface ReviewItemRow {
  id: string;
  fireId: string;
  firmClientId: string;
  engagementId: string;
  closePeriodId: string | null;
  ruleId: string;
  ruleVersion: number;
  accountingMethod: "cash" | "accrual" | "modified_cash";
  jeDraft: JEDraft;
  jeDraftTotalDebitCents: number;
  jeDraftTotalCreditCents: number;
  jeDraftLineCount: number;
  assertionTags: string[];
  ruleReasonCode: string;
  ruleReasonDetail: Record<string, unknown>;
  severity: "info" | "warning" | "error" | "critical";
  evidenceRefs: Array<Record<string, unknown>>;
  basisGuardReasonCode: BasisGuardReasonCode | null;
  basisGuardReasonText: string | null;
  decision: Decision | null;
  decisionReasonCode: string | null;
  decisionReasonText: string | null;
  reviewerUserId: string | null;
  decisionAt: string | null;
  editedJeDraft: JEDraft | null;
  postedJeAttemptId: string | null;
  postBlockReason: string | null;
  createdAt: string;
}

export interface DirectiveInput {
  reviewItemId: string;
  decision: Decision;
  decisionReasonCode: string;
  decisionReasonText: string;
  reviewerUserId: string | null;
  actorType: "user" | "ai_agent" | "system";
  actorId?: string;
  correlationId?: string;
  editedJeDraft?: JEDraft;
}
