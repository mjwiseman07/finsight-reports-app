/**
 * Phase D6.5 Part 2 — Block 8a
 * L9 Interlock + L10 Banking Rail Fan-Out shared types.
 */
export type PaymentBatchStatus =
  | "draft"
  | "interlock_pending"
  | "interlock_passed"
  | "interlock_failed"
  | "interlock_reviewer_approved"
  | "interlock_reviewer_rejected"
  | "executed"
  | "cancelled";

export type InterlockResult =
  | "passed"
  | "failed"
  | "reviewer_approved"
  | "reviewer_rejected";

export type Rail = "ach" | "wire" | "rtp" | "check" | "virtual_card";

export type FanoutOutcome =
  | "pending"
  | "submitted"
  | "confirmed"
  | "failed"
  | "cancelled";

export interface PerVendorNetPosition {
  vendor_id: string;
  gross_cents: number;
  applied_credit_cents: number;
  applied_prepayment_cents: number;
  net_cents: number;
  requisition_remaining_cents: number | null;
  vendor_annual_commitment_remaining_cents: number | null;
  passes: boolean;
  reason_codes: string[];
}

export interface GLBudgetSnapshotEntry {
  gl_account_code: string;
  period_year: number;
  period_month: number;
  budget_cents: number;
  in_batch_cents: number;
  tolerance_pct: number;
  passes: boolean;
}
