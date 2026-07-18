/**
 * D6.5 Part 2 · Block 7a — Prepayment sub-ledger + refund draft types.
 */
export interface RecordPrepaymentInput {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  vendorId: string;
  amountCents: number;
  currency: string;
  notes?: string;
  actorUserId: string;
}

export interface ApplyPrepaymentInput {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  vendorId: string;
  billId: string;
  billCurrency: string;
  amountCents: number;
  currency: string;
  actorUserId: string;
}

export interface AgingSweepInput {
  firmId: string;
  agingThresholdDays?: number;
}

export interface AgingSweepResult {
  vendorsScanned: number;
  drafted: number;
  draftIds: string[];
}

export interface ReviewRefundDraftInput {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  draftId: string;
  decision: "approved" | "rejected" | "deferred";
  notes?: string;
  reviewerUserId: string;
}

export class PrepaymentValidationError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = "PrepaymentValidationError";
    this.field = field;
  }
}
