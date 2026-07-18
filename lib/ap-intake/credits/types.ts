/**
 * D6.5 Part 2 · Block 7a — Credit / debit memo types.
 */
export interface IssueCreditInput {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  vendorId: string;
  creditType: "credit_memo" | "debit_memo";
  sourceDocumentType: "vendor_issued" | "manual_entry" | "system_derived";
  sourceDocumentRef?: string;
  originalAmountCents: number;
  currency: string;
  issuedDate: string;
  expirationDate?: string | null;
  notes?: string;
  actorUserId: string;
}

export interface ApplyCreditInput {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  creditId: string;
  billId: string;
  billCurrency: string;
  appliedAmountCents: number;
  appliedBy: "system_auto" | "user_manual" | "payment_authorization";
  actorUserId: string;
}

export interface ReverseCreditApplicationInput {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  applicationId: string;
  reversalReason: string;
  actorUserId: string;
}

export interface VoidCreditInput {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  creditId: string;
  reason: string;
  actorUserId: string;
}

export interface EvaluateAutoApplyInput {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  vendorId: string;
  billId: string;
  billAmountCents: number;
  currency: string;
}

export interface EvaluateAutoApplyResult {
  eligibleApplications: Array<{ creditId: string; appliedAmountCents: number }>;
  remainingBillAmountCents: number;
}

export class CreditValidationError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = "CreditValidationError";
    this.field = field;
  }
}
