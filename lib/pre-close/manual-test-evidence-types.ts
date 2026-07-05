import type { AccountCategory, AssertionId } from "./assertions-types";
import type { EvidenceStrength } from "./assertions-coverage-types";

export const MANUAL_EVIDENCE_TYPES = [
  "qbo_bill",
  "qbo_invoice",
  "qbo_payment",
  "qbo_transaction",
  "qbo_journal_entry",
  "plaid_transaction",
  "bank_statement",
  "credit_card_statement",
  "vendor_invoice_ocr",
  "customer_invoice_ocr",
  "contract_document",
  "signed_agreement",
  "system_calculation",
  "memory_pattern",
  "manual_override",
  "other",
  "manual_procedure",
  "external_confirmation",
  "analytical_review",
  "reperformance",
] as const;
export type ManualEvidenceType = (typeof MANUAL_EVIDENCE_TYPES)[number];

export interface ManualTestEvidenceRow {
  id: string;
  firmClientId: string;
  engagementId: string;
  closePeriodId: string;
  accountCategory: AccountCategory;
  assertionId: AssertionId;
  evidenceType: ManualEvidenceType;
  sourceType: string;
  sourceKey: Record<string, unknown>;
  sourceAmount: number | null;
  sourceDate: string | null;
  evidenceSummary: string;
  calculationNotes: string | null;
  resolvesGapItemId: string | null;
  dataSourceReliabilityBasis: string | null;
  contentHash: string;
  createdByUserId: string;
  createdByDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManualTestAttachmentRow {
  attachmentId: string;
  evidenceId: string;
  firmClientId: string;
  storageBucket: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  ingestedFrom: string;
  ingestedAt: string;
  ingestedBy: string;
}

export const EVIDENCE_TYPE_STRENGTH: Record<ManualEvidenceType, Exclude<EvidenceStrength, "unassessed">> = {
  qbo_bill: "strong",
  qbo_invoice: "strong",
  qbo_payment: "strong",
  qbo_transaction: "strong",
  qbo_journal_entry: "strong",
  plaid_transaction: "strong",
  bank_statement: "strong",
  credit_card_statement: "strong",
  contract_document: "strong",
  signed_agreement: "strong",
  external_confirmation: "strong",
  reperformance: "strong",
  vendor_invoice_ocr: "moderate",
  customer_invoice_ocr: "moderate",
  system_calculation: "moderate",
  manual_procedure: "moderate",
  analytical_review: "moderate",
  memory_pattern: "weak",
  manual_override: "weak",
  other: "weak",
};
