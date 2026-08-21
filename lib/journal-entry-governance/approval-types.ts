/**
 * JE-2 — Governed approval / SoD types.
 * Approval custody only. No execution. No provider write.
 */

import type { JeProposalOriginType } from "./types";

export const JE_APPROVAL_DECISIONS = ["APPROVED", "REJECTED"] as const;
export type JeApprovalDecision = (typeof JE_APPROVAL_DECISIONS)[number];

export const JE_APPROVAL_MODES = ["REVIEW_REQUIRED"] as const;
export type JeApprovalMode = (typeof JE_APPROVAL_MODES)[number];

export type JeApprovalCcReadiness = "READY" | "READY_WITH_REVIEW" | "BLOCKED";

/**
 * Explicit approval policy. Distinct from JE-1 proposal admission policy.
 * DEFAULT exists for tests/types only — production callers must supply policy.
 */
export type JeApprovalPolicy = {
  requireHumanApproval: true;
  approvalMode: JeApprovalMode;
  requireSegregationOfDuties: boolean;
  /** v1 strong preference: false */
  proposerMayApprove: boolean;
  /** After REJECTED, allow later APPROVED for same proposal+hashes. v1: false */
  allowReconsiderationAfterRejection: boolean;
  allowedCompanyApproverRoles: readonly string[];
  allowedFirmApproverRoles: readonly string[];
  /** Firm path requires firm_memberships.can_approve = true */
  requireFirmCanApproveFlag: boolean;
  /** Super-admin email allowlist may approve when true. v1: false */
  allowSuperAdminApproval: boolean;
  alwaysRequireMfa: boolean;
  /** Absolute proposal total_debits_cents threshold; null disables amount gate */
  mfaRequiredAboveCents: number | null;
  maxApprovalAgeHours: number | null;
  requireCurrentProposalHash: true;
  requireCurrentPolicyHash: true;
  allowedOriginTypes: readonly JeProposalOriginType[];
  maxApprovalAmountCents: number | null;
  requireSourceCcNotSuperseded: boolean;
  /** When non-null, source CC readiness must be one of these values */
  requireSourceCcReadiness: readonly JeApprovalCcReadiness[] | null;
  requireFreshSourceSync: boolean | null;
};

export const DEFAULT_JE_APPROVAL_POLICY: JeApprovalPolicy = {
  requireHumanApproval: true,
  approvalMode: "REVIEW_REQUIRED",
  requireSegregationOfDuties: true,
  proposerMayApprove: false,
  allowReconsiderationAfterRejection: false,
  allowedCompanyApproverRoles: ["company_admin", "owner_executive", "controller"],
  allowedFirmApproverRoles: ["firm_admin", "controller", "fractional_cfo"],
  requireFirmCanApproveFlag: true,
  allowSuperAdminApproval: false,
  alwaysRequireMfa: false,
  mfaRequiredAboveCents: 100_000,
  maxApprovalAgeHours: null,
  requireCurrentProposalHash: true,
  requireCurrentPolicyHash: true,
  allowedOriginTypes: ["ACCRUAL", "RECLASS"],
  maxApprovalAmountCents: null,
  requireSourceCcNotSuperseded: true,
  requireSourceCcReadiness: null,
  requireFreshSourceSync: null,
};

/**
 * Trusted authentication assurance — derived by server deps, never a caller boolean.
 */
export type JeAuthenticationAssurance = {
  satisfied: boolean;
  level: "aal2" | "aal1" | "none";
  verifiedAt: string | null;
  method: "totp" | "webauthn" | null;
  source: "mfa_step_up_cookie" | "none";
};

export type JeApprovalExecutionPrincipal = {
  type: "user";
  userId: string;
};

export type JeApprovalExecutionContext = {
  principal: JeApprovalExecutionPrincipal;
};

export type DecideJeApprovalInput = {
  proposalId: string;
  decision: JeApprovalDecision;
  reason?: string | null;
};

export type JournalEntryApprovalRow = {
  id: string;
  proposal_id: string;
  company_id: string;
  engagement_id: string;
  proposal_hash: string;
  policy_hash: string;
  decision: JeApprovalDecision;
  approval_mode: JeApprovalMode;
  reviewer_user_id: string;
  reviewer_role: string | null;
  mfa_level: string | null;
  mfa_verified_at: string | null;
  decision_reason: string | null;
  policy_snapshot: Record<string, unknown>;
  approved_at: string;
  idempotency_key: string;
  created_at?: string;
};

export type JeApprovalValidity = {
  valid: boolean;
  decisionId: string;
  proposalId: string;
  proposalHash: string;
  approvalPolicyHash: string;
  reviewerUserId: string;
  decision: JeApprovalDecision;
  approvedAt: string;
  expiresAt: string | null;
  mfaSatisfied: boolean;
  sodSatisfied: boolean;
  reason?: string;
};

export type DecideJeApprovalResult =
  | {
      ok: true;
      approval: JournalEntryApprovalRow;
      reused: boolean;
      ledgerEventId: string | null;
      validity: JeApprovalValidity;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export const JE_APPROVAL_ERROR = {
  PRINCIPAL_REQUIRED: "je_approval_principal_required",
  UNSUPPORTED_PRINCIPAL: "je_approval_unsupported_principal",
  POLICY_REQUIRED: "je_approval_policy_required",
  DECISION_INVALID: "je_approval_decision_invalid",
  PROPOSAL_REQUIRED: "je_approval_proposal_required",
  PROPOSAL_NOT_FOUND: "je_approval_proposal_not_found",
  PROPOSAL_STATUS_INVALID: "je_approval_proposal_status_invalid",
  ORIGIN_UNSUPPORTED: "je_approval_origin_unsupported",
  AMOUNT_EXCEEDS_POLICY: "je_approval_amount_exceeds_policy",
  APPROVER_FORBIDDEN: "je_approval_approver_forbidden",
  APPROVER_ROLE_DENIED: "je_approval_approver_role_denied",
  FIRM_CAN_APPROVE_REQUIRED: "je_approval_firm_can_approve_required",
  ENGAGEMENT_ACCESS_DENIED: "je_approval_engagement_access_denied",
  SOD_VIOLATION: "je_approval_sod_violation",
  MFA_REQUIRED: "je_approval_mfa_required",
  MFA_NOT_SATISFIED: "je_approval_mfa_not_satisfied",
  SOURCE_CC_MISSING: "je_approval_source_cc_missing",
  SOURCE_CC_SUPERSEDED: "je_approval_source_cc_superseded",
  SOURCE_CC_READINESS: "je_approval_source_cc_readiness",
  SOURCE_SYNC_MISSING: "je_approval_source_sync_missing",
  SOURCE_RECON_MISSING: "je_approval_source_recon_missing",
  PRIOR_REJECTION: "je_approval_prior_rejection",
  PERSIST_FAILED: "je_approval_persist_failed",
  LEDGER_PUBLISH_FAILED: "je_approval_ledger_publish_failed",
} as const;

export type JeApprovalErrorCode =
  (typeof JE_APPROVAL_ERROR)[keyof typeof JE_APPROVAL_ERROR];
