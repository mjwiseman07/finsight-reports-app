/**
 * JE-2 approval validity contract for later JE-3 consumption.
 */

import type {
  JeApprovalPolicy,
  JeApprovalValidity,
  JournalEntryApprovalRow,
} from "./approval-types";

export function evaluateApprovalValidity(args: {
  approval: JournalEntryApprovalRow;
  proposalHash: string;
  approvalPolicyHash: string;
  sodSatisfied: boolean;
  mfaSatisfied: boolean;
  policy: JeApprovalPolicy;
  nowMs?: number;
}): JeApprovalValidity {
  const now = args.nowMs ?? Date.now();
  const approvedAtMs = Date.parse(args.approval.approved_at);
  let expiresAt: string | null = null;
  if (
    args.policy.maxApprovalAgeHours != null &&
    Number.isFinite(args.policy.maxApprovalAgeHours) &&
    args.policy.maxApprovalAgeHours > 0 &&
    Number.isFinite(approvedAtMs)
  ) {
    expiresAt = new Date(
      approvedAtMs + args.policy.maxApprovalAgeHours * 3600_000,
    ).toISOString();
  }

  const hashMatch =
    args.approval.proposal_hash === args.proposalHash &&
    args.approval.policy_hash === args.approvalPolicyHash;

  let valid = true;
  let reason: string | undefined;
  if (args.approval.decision !== "APPROVED") {
    valid = false;
    reason = "decision_not_approved";
  } else if (!hashMatch) {
    valid = false;
    reason = "hash_mismatch";
  } else if (!args.sodSatisfied) {
    valid = false;
    reason = "sod_unsatisfied";
  } else if (!args.mfaSatisfied && (args.policy.alwaysRequireMfa ||
    (args.policy.mfaRequiredAboveCents != null))) {
    // MFA disposition is historical on the row; validity for JE-3 uses
    // whether the approval recorded MFA when required.
    if (!args.approval.mfa_verified_at) {
      valid = false;
      reason = "mfa_unsatisfied";
    }
  } else if (expiresAt && Date.parse(expiresAt) <= now) {
    valid = false;
    reason = "expired";
  }

  return {
    valid,
    decisionId: args.approval.id,
    proposalId: args.approval.proposal_id,
    proposalHash: args.approval.proposal_hash,
    approvalPolicyHash: args.approval.policy_hash,
    reviewerUserId: args.approval.reviewer_user_id,
    decision: args.approval.decision,
    approvedAt: args.approval.approved_at,
    expiresAt,
    mfaSatisfied: Boolean(args.approval.mfa_verified_at) || args.mfaSatisfied,
    sodSatisfied: args.sodSatisfied,
    reason,
  };
}
