/**
 * JE-3A — Governed execution types.
 * Custody + preflight only. No provider write. No auto-governed principal.
 */

import type { JeProposalOriginType } from "./types";

export const JE_EXECUTION_STATUSES = [
  "RESERVED",
  "PRECHECK_FAILED",
  "READY_TO_POST",
  "POSTING",
  "POSTED_UNVERIFIED",
  "UNKNOWN_COMMIT",
  "VERIFIED",
  "FAILED",
  "REVERSAL_REQUIRED",
] as const;

export type JeExecutionStatus = (typeof JE_EXECUTION_STATUSES)[number];

/** Statuses JE-3A prepare may create (not POSTING+). */
export const JE_EXECUTION_PREPARE_STATUSES = [
  "RESERVED",
  "PRECHECK_FAILED",
  "READY_TO_POST",
] as const;

export type JeExecutionPrepareStatus =
  (typeof JE_EXECUTION_PREPARE_STATUSES)[number];

export const JE_EXECUTION_PROVIDERS = ["quickbooks"] as const;
export type JeExecutionProvider = (typeof JE_EXECUTION_PROVIDERS)[number];

/**
 * UNKNOWN_COMMIT: provider request may have committed but Advisacor cannot prove it.
 * Hard invariant: MUST NOT permit a new POST attempt / blind retry.
 * Only discover / read-back / manual resolution / mark REVERSAL_REQUIRED.
 */
export const UNKNOWN_COMMIT_INVARIANT =
  "UNKNOWN_COMMIT must not permit a new POST attempt; only discover/read-back/manual resolution.";

export type JeRetryClassification =
  | "SAFE_BEFORE_SEND"
  | "SAFE_READBACK_ONLY"
  | "DISCOVERY_REQUIRED"
  | "NO_RETRY"
  | "MANUAL_INTERVENTION";

export type JeUnknownCommitPolicy = "HALT_AND_DISCOVER";

/**
 * Explicit execution policy. Distinct from JE-1 proposal and JE-2 approval policies.
 * DEFAULT exists for tests only — production callers must supply policy.
 */
export type JeExecutionPolicy = {
  provider: JeExecutionProvider;
  allowedOriginTypes: readonly JeProposalOriginType[];
  requireApprovedDecision: true;
  requireProposalHashMatch: true;
  requireApprovalPolicyHashMatch: true;
  requireApprovalNotExpired: boolean;
  requireSourceCcNotSuperseded: boolean;
  requireWriteEntitlement: true;
  requireConnectionHealthy: boolean;
  requireQboWriteEnabled: true;
  requirePeriodOpen: boolean;
  requireControlAccountRecheck: boolean;
  requireExecutorDifferentFromProposer: boolean;
  requireExecutorDifferentFromApprover: boolean;
  requireCurrentAccountsActive: boolean;
  maxExecutionAmountCents: number | null;
  manualExecutionOnly: true;
  unknownCommitPolicy: JeUnknownCommitPolicy;
  /** Optional fresh MFA for execution; never weakens JE-2 historical MFA. */
  requireFreshMfa: boolean;
};

export const DEFAULT_JE_EXECUTION_POLICY: JeExecutionPolicy = {
  provider: "quickbooks",
  allowedOriginTypes: ["ACCRUAL", "RECLASS"],
  requireApprovedDecision: true,
  requireProposalHashMatch: true,
  requireApprovalPolicyHashMatch: true,
  requireApprovalNotExpired: true,
  requireSourceCcNotSuperseded: true,
  requireWriteEntitlement: true,
  requireConnectionHealthy: true,
  requireQboWriteEnabled: true,
  requirePeriodOpen: true,
  requireControlAccountRecheck: true,
  requireExecutorDifferentFromProposer: true,
  requireExecutorDifferentFromApprover: true,
  requireCurrentAccountsActive: true,
  maxExecutionAmountCents: null,
  manualExecutionOnly: true,
  unknownCommitPolicy: "HALT_AND_DISCOVER",
  requireFreshMfa: false,
};

export type JeExecutionPrincipal = {
  type: "user";
  userId: string;
};

export type JeExecutionContext = {
  principal: JeExecutionPrincipal;
};

export type PrepareJeExecutionInput = {
  proposalId: string;
  approvalId: string;
};

export type JePreflightCheckStatus = "PASS" | "FAIL";

export type JePreflightCheck = {
  code: string;
  status: JePreflightCheckStatus;
  details?: string;
};

export type JePreflightResult = {
  eligible: boolean;
  checks: JePreflightCheck[];
};

/**
 * Governed execution eligibility summary for JE-3B consumption.
 * Do not make JE-3B reinterpret JE-2 history from scratch.
 */
export type JeExecutionEligibility = {
  approvalId: string;
  valid: boolean;
  proposalHash: string;
  approvalPolicyHash: string;
  approvedAt: string;
  expiresAt: string | null;
  sodSatisfied: boolean;
  mfaSatisfied: boolean;
  sourceCurrent: boolean;
  reason?: string;
};

export type JournalEntryExecutionRow = {
  id: string;
  proposal_id: string;
  approval_id: string;
  company_id: string;
  engagement_id: string;
  firm_client_id: string | null;
  source_continuous_close_run_id: string;
  source_accounting_sync_id: string;
  accounting_connection_id: string;
  provider: JeExecutionProvider;
  proposal_hash: string;
  approval_policy_hash: string;
  execution_policy_hash: string;
  execution_hash: string;
  idempotency_key: string;
  status: JeExecutionStatus;
  correlation_marker: string;
  execution_policy_snapshot: Record<string, unknown>;
  preflight_result: JePreflightResult | Record<string, unknown>;
  requested_by: string;
  requested_at: string;
  state_version: number;
  provider_journal_id: string | null;
  provider_request_hash: string | null;
  provider_response_hash: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PrepareJeExecutionResult =
  | {
      ok: true;
      execution: JournalEntryExecutionRow;
      reused: boolean;
      ledgerEventIds: {
        requested: string | null;
        transition: string | null;
      };
      eligibility: JeExecutionEligibility;
      preflight: JePreflightResult;
      payloadPreview: Record<string, unknown> | null;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export const JE_EXECUTION_ERROR = {
  PRINCIPAL_REQUIRED: "je_execution_principal_required",
  UNSUPPORTED_PRINCIPAL: "je_execution_unsupported_principal",
  POLICY_REQUIRED: "je_execution_policy_required",
  PROPOSAL_REQUIRED: "je_execution_proposal_required",
  PROPOSAL_NOT_FOUND: "je_execution_proposal_not_found",
  PROPOSAL_STATUS_INVALID: "je_execution_proposal_status_invalid",
  APPROVAL_REQUIRED: "je_execution_approval_required",
  APPROVAL_NOT_FOUND: "je_execution_approval_not_found",
  APPROVAL_NOT_APPROVED: "je_execution_approval_not_approved",
  APPROVAL_PROPOSAL_MISMATCH: "je_execution_approval_proposal_mismatch",
  APPROVAL_HASH_MISMATCH: "je_execution_approval_hash_mismatch",
  APPROVAL_MODE_INVALID: "je_execution_approval_mode_invalid",
  APPROVAL_EXPIRED: "je_execution_approval_expired",
  APPROVAL_INVALID: "je_execution_approval_invalid",
  CALLER_OVERRIDE_FORBIDDEN: "je_execution_caller_override_forbidden",
  WRITE_FORBIDDEN: "je_execution_write_forbidden",
  EXECUTOR_UNAUTHORIZED: "je_execution_executor_unauthorized",
  SOD_PROPOSER: "je_execution_sod_proposer",
  SOD_APPROVER: "je_execution_sod_approver",
  ENTITLEMENT_DENIED: "je_execution_entitlement_denied",
  CONNECTION_NOT_FOUND: "je_execution_connection_not_found",
  CONNECTION_UNHEALTHY: "je_execution_connection_unhealthy",
  CONNECTION_COMPANY_MISMATCH: "je_execution_connection_company_mismatch",
  PROVIDER_UNSUPPORTED: "je_execution_provider_unsupported",
  QBO_WRITE_DISABLED: "je_execution_qbo_write_disabled",
  PERIOD_LOCKED: "je_execution_period_locked",
  ACCOUNT_INACTIVE: "je_execution_account_inactive",
  ACCOUNT_NOT_FOUND: "je_execution_account_not_found",
  CONTROL_ACCOUNT_AR: "je_execution_control_account_ar",
  CONTROL_ACCOUNT_AP: "je_execution_control_account_ap",
  CONTROL_ACCOUNT_INVENTORY: "je_execution_control_account_inventory",
  ORIGIN_UNSUPPORTED: "je_execution_origin_unsupported",
  AMOUNT_EXCEEDS_POLICY: "je_execution_amount_exceeds_policy",
  SOURCE_CC_MISSING: "je_execution_source_cc_missing",
  SOURCE_CC_SUPERSEDED: "je_execution_source_cc_superseded",
  SOURCE_SYNC_MISSING: "je_execution_source_sync_missing",
  SOURCE_RECON_MISSING: "je_execution_source_recon_missing",
  MFA_REQUIRED: "je_execution_mfa_required",
  MFA_NOT_SATISFIED: "je_execution_mfa_not_satisfied",
  TRANSITION_INVALID: "je_execution_transition_invalid",
  CONCURRENCY_CONFLICT: "je_execution_concurrency_conflict",
  PERSIST_FAILED: "je_execution_persist_failed",
  LEDGER_PUBLISH_FAILED: "je_execution_ledger_publish_failed",
  PRIOR_EXECUTION: "je_execution_prior_execution",
} as const;

export type JeExecutionErrorCode =
  (typeof JE_EXECUTION_ERROR)[keyof typeof JE_EXECUTION_ERROR];

/**
 * Feature boundary: governed JE execution must never route through legacy write lanes.
 * JE-3B must enforce this at the adapter boundary.
 */
export const JE_GOVERNED_EXECUTION_FEATURE_BOUNDARY = {
  lane: "governed_journal_entry_execution",
  forbiddenLegacyLanes: [
    "pulse_confirm",
    "uncategorized_accept",
    "recurring_write",
  ] as const,
  providerWriteAllowed: false as const,
  governedAutoAllowed: false as const,
};
