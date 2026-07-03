// D6.4a: Universal JE evidence contract types.
// Every JE composer MUST emit evidence per line or the composition is rejected.

export type EvidenceType =
  | "qbo_bill"
  | "qbo_invoice"
  | "qbo_payment"
  | "qbo_transaction"
  | "qbo_journal_entry"
  | "plaid_transaction"
  | "bank_statement"
  | "credit_card_statement"
  | "vendor_invoice_ocr"
  | "customer_invoice_ocr"
  | "contract_document"
  | "signed_agreement"
  | "system_calculation"
  | "memory_pattern"
  | "manual_override"
  | "other";

export interface JeLineEvidenceInput {
  evidenceType: EvidenceType;
  sourceType: string;
  sourceId?: string | null;
  sourceKey?: Record<string, unknown>;
  sourceAmount?: number | null;
  sourceDate?: string | null;
  evidenceSummary: string;
  calculationNotes?: string | null;
  originatingRuleId?: string | null;
  originatingFireId?: string | null;
  pendingAttachments?: PendingAttachmentHint[];
}

export interface PendingAttachmentHint {
  ingestedFrom:
    | "qbo_attachable"
    | "plaid_statement_pdf"
    | "ocr_upload"
    | "manual_upload"
    | "system_generated";
  hint: Record<string, unknown>;
  originalFilename?: string;
  mimeType?: string;
}

export interface JeLineWithEvidence {
  lineIndex: number;
  accountId: string;
  accountName: string;
  drAmount: number;
  crAmount: number;
  memo?: string | null;
  evidence: JeLineEvidenceInput;
}

export interface JeCompositionResult {
  transactionDate: string;
  narration: string;
  sourceType: string;
  sourceId?: string | null;
  lines: JeLineWithEvidence[];
}
