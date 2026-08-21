/**
 * JE-1 — CC-sourced journal entry proposal types.
 *
 * Proposal custody only. No approval, execution, or provider write.
 */

export const JE_PROPOSAL_ORIGINS = ["ACCRUAL", "RECLASS"] as const;
export type JeProposalOriginType = (typeof JE_PROPOSAL_ORIGINS)[number];

export const JE_PROPOSAL_STATUS = ["SUBMITTED"] as const;
export type JeProposalStatus = (typeof JE_PROPOSAL_STATUS)[number];

export const JE_SOURCE_RECON_KINDS = ["ar_aging", "ap_aging", "inventory"] as const;
export type JeSourceReconKind = (typeof JE_SOURCE_RECON_KINDS)[number];

export type JeProposalLine = {
  sequence: number;
  accountId: string;
  description?: string | null;
  debitCents: number;
  creditCents: number;
  classId?: string | null;
  departmentId?: string | null;
  locationId?: string | null;
};

export type JeExpectedEffect =
  | { type: "CC_EXCEPTION_CLEAR"; exceptionCode: string }
  | {
      type: "RECON_OUTCOME_TARGET";
      reconKind: string;
      targetOutcome: string;
    }
  | {
      type: "RESIDUAL_DELTA";
      reconKind: string;
      expectedDeltaCents: number;
    }
  | {
      type: "ACCOUNT_RECLASS";
      fromAccountId: string;
      toAccountId: string;
      amountCents: number;
    };

export type JeProposalPolicy = {
  allowedOriginTypes: readonly JeProposalOriginType[];
  /** QBO AccountType allowlist for ACCRUAL expense/P&L side */
  accrualPlAccountTypes: readonly string[];
  /** QBO AccountType allowlist for ACCRUAL liability side */
  accrualLiabilityAccountTypes: readonly string[];
  /** QBO AccountType allowlist for RECLASS P&L ↔ P&L */
  reclassPlAccountTypes: readonly string[];
  /** QBO AccountType allowlist for RECLASS BS ↔ BS (non-control) */
  reclassBsAccountTypes: readonly string[];
  prohibitedAccountIds: readonly string[];
  prohibitedControlAccountTypes: readonly string[];
  maxProposalAmountCents: number | null;
  allowCrossPeriod: false;
  requireAuthoritativeCcSource: true;
  requireAuthoritativeReconSource: boolean;
  requireExpectedEffects: boolean;
  maxLines: number;
  maxMemoChars: number;
  maxLineDescriptionChars: number;
};

export const DEFAULT_JE_PROPOSAL_POLICY: JeProposalPolicy = {
  allowedOriginTypes: ["ACCRUAL", "RECLASS"],
  accrualPlAccountTypes: [
    "Expense",
    "Other Expense",
    "Cost of Goods Sold",
  ],
  accrualLiabilityAccountTypes: [
    "Other Current Liability",
    "Long Term Liability",
  ],
  reclassPlAccountTypes: [
    "Expense",
    "Other Expense",
    "Cost of Goods Sold",
    "Income",
    "Other Income",
  ],
  reclassBsAccountTypes: [
    "Bank",
    "Other Current Asset",
    "Fixed Asset",
    "Other Asset",
    "Credit Card",
    "Other Current Liability",
    "Long Term Liability",
    "Equity",
  ],
  prohibitedAccountIds: [],
  prohibitedControlAccountTypes: [
    "AccountsReceivable",
    "AccountsPayable",
    "Inventory",
  ],
  maxProposalAmountCents: null,
  allowCrossPeriod: false,
  requireAuthoritativeCcSource: true,
  requireAuthoritativeReconSource: true,
  requireExpectedEffects: true,
  maxLines: 100,
  maxMemoChars: 4000,
  maxLineDescriptionChars: 4000,
};

export type JeProposalAccountMeta = {
  accountId: string;
  accountType: string;
  accountSubtype: string | null;
  active: boolean;
  name?: string | null;
};

export type JeProposalExecutionPrincipal = {
  type: "user";
  userId: string;
};

export type JeProposalExecutionContext = {
  principal: JeProposalExecutionPrincipal;
};

/** Caller-supplied input. Custody fields are loaded, never trusted from caller. */
export type CreateJeProposalInput = {
  engagementId: string;
  sourceContinuousCloseRunId: string;
  originType: JeProposalOriginType;
  reasonCode: string;
  memo?: string | null;
  currency: string;
  txnDate: string;
  lines: JeProposalLine[];
  expectedEffects: JeExpectedEffect[];
  /** Optional recon run ids that justify the proposal (authoritative only). */
  sourceReconRunIds?: string[];
};

export type JournalEntryProposalRow = {
  id: string;
  company_id: string;
  engagement_id: string;
  firm_client_id: string | null;
  period_end: string;
  source_continuous_close_run_id: string;
  source_accounting_sync_id: string;
  source_recon_run_ids: string[];
  origin_type: JeProposalOriginType;
  reason_code: string;
  memo: string | null;
  currency: string;
  txn_date: string;
  lines: JeProposalLine[];
  total_debits_cents: number;
  total_credits_cents: number;
  expected_effects: JeExpectedEffect[];
  policy_snapshot: Record<string, unknown>;
  policy_hash: string;
  proposal_hash: string;
  status: JeProposalStatus;
  proposed_by: string;
  proposed_at: string;
  idempotency_key: string;
  created_at?: string;
};

export type CreateJeProposalResult =
  | {
      ok: true;
      proposal: JournalEntryProposalRow;
      reused: boolean;
      ledgerEventId: string | null;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export const JE_PROPOSAL_ERROR = {
  PRINCIPAL_REQUIRED: "je_principal_required",
  UNSUPPORTED_PRINCIPAL: "je_unsupported_principal",
  WRITE_FORBIDDEN: "je_write_forbidden",
  POLICY_REQUIRED: "je_policy_required",
  ORIGIN_UNSUPPORTED: "je_origin_unsupported",
  CC_RUN_REQUIRED: "je_cc_run_required",
  CC_RUN_NOT_FOUND: "je_cc_run_not_found",
  CC_ENGAGEMENT_MISMATCH: "je_cc_engagement_mismatch",
  CC_COMPANY_MISMATCH: "je_cc_company_mismatch",
  CC_PERIOD_MISMATCH: "je_cc_period_mismatch",
  CC_STATUS_INVALID: "je_cc_status_invalid",
  CC_MODE_INVALID: "je_cc_mode_invalid",
  SYNC_NOT_FOUND: "je_sync_not_found",
  SYNC_NOT_SUCCESS: "je_sync_not_success",
  SYNC_COMPANY_MISMATCH: "je_sync_company_mismatch",
  SYNC_PERIOD_MISMATCH: "je_sync_period_mismatch",
  RECON_REQUIRED: "je_recon_source_required",
  RECON_NOT_FOUND: "je_recon_not_found",
  RECON_ENGAGEMENT_MISMATCH: "je_recon_engagement_mismatch",
  RECON_PERIOD_MISMATCH: "je_recon_period_mismatch",
  RECON_BASELINE_NULL: "je_recon_baseline_null",
  RECON_BASELINE_MISMATCH: "je_recon_baseline_mismatch",
  RECON_NOT_COMPLETED: "je_recon_not_completed",
  RECON_OUTCOME_MISSING: "je_recon_outcome_missing",
  RECON_NOT_AUTHORITATIVE: "je_recon_not_authoritative",
  RECON_KIND_UNSUPPORTED: "je_recon_kind_unsupported",
  LINES_EMPTY: "je_lines_empty",
  LINES_TOO_MANY: "je_lines_too_many",
  LINE_SEQUENCE_INVALID: "je_line_sequence_invalid",
  LINE_ACCOUNT_REQUIRED: "je_line_account_required",
  LINE_BOTH_SIDES: "je_line_both_sides",
  LINE_ZERO_SIDES: "je_line_zero_sides",
  LINE_NEGATIVE: "je_line_negative",
  LINE_NON_INTEGER: "je_line_non_integer",
  UNBALANCED: "je_unbalanced",
  ZERO_TOTAL: "je_zero_total",
  MEMO_TOO_LONG: "je_memo_too_long",
  DESCRIPTION_TOO_LONG: "je_description_too_long",
  CURRENCY_INVALID: "je_currency_invalid",
  CROSS_PERIOD: "je_cross_period",
  PERIOD_LOCKED: "je_period_locked",
  CONTROL_ACCOUNT_AR: "je_control_account_ar_prohibited",
  CONTROL_ACCOUNT_AP: "je_control_account_ap_prohibited",
  CONTROL_ACCOUNT_INVENTORY: "je_control_account_inventory_prohibited",
  ACCOUNT_NOT_FOUND: "je_account_not_found",
  ACCOUNT_INACTIVE: "je_account_inactive",
  ACCOUNT_TYPE_PROHIBITED: "je_account_type_prohibited",
  CLASS_NOT_ALLOWED: "je_class_not_allowed",
  AMOUNT_EXCEEDS_MAX: "je_amount_exceeds_max",
  EFFECTS_REQUIRED: "je_effects_required",
  EFFECTS_INVALID: "je_effects_invalid",
  REASON_REQUIRED: "je_reason_required",
  PERSIST_FAILED: "je_persist_failed",
  LEDGER_PUBLISH_FAILED: "je_ledger_publish_failed",
  CALLER_AUTHORITY_OVERRIDE: "je_caller_authority_override",
} as const;

export type JeProposalErrorCode =
  (typeof JE_PROPOSAL_ERROR)[keyof typeof JE_PROPOSAL_ERROR];
