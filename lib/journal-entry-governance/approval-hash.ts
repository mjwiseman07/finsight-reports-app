/**
 * JE-2 approval policy / idempotency hashes.
 */

import {
  sha256Hex,
  stableCanonicalJson,
} from "@/lib/audit-ready/measurement-snapshots/hash";
import type { JeApprovalDecision, JeApprovalPolicy } from "./approval-types";

function sortedStrings(values: readonly string[]): string[] {
  return [...values].map(String).sort((a, b) => a.localeCompare(b));
}

export function canonicalizeJeApprovalPolicy(
  policy: JeApprovalPolicy,
): Record<string, unknown> {
  return {
    allowReconsiderationAfterRejection: Boolean(
      policy.allowReconsiderationAfterRejection,
    ),
    allowSuperAdminApproval: Boolean(policy.allowSuperAdminApproval),
    allowedCompanyApproverRoles: sortedStrings(policy.allowedCompanyApproverRoles),
    allowedFirmApproverRoles: sortedStrings(policy.allowedFirmApproverRoles),
    allowedOriginTypes: sortedStrings(policy.allowedOriginTypes),
    alwaysRequireMfa: Boolean(policy.alwaysRequireMfa),
    approvalMode: "REVIEW_REQUIRED",
    maxApprovalAgeHours: policy.maxApprovalAgeHours,
    maxApprovalAmountCents: policy.maxApprovalAmountCents,
    mfaRequiredAboveCents: policy.mfaRequiredAboveCents,
    proposerMayApprove: Boolean(policy.proposerMayApprove),
    requireCurrentPolicyHash: true,
    requireCurrentProposalHash: true,
    requireFirmCanApproveFlag: Boolean(policy.requireFirmCanApproveFlag),
    requireFreshSourceSync: policy.requireFreshSourceSync,
    requireHumanApproval: true,
    requireSegregationOfDuties: Boolean(policy.requireSegregationOfDuties),
    requireSourceCcNotSuperseded: Boolean(policy.requireSourceCcNotSuperseded),
    requireSourceCcReadiness: policy.requireSourceCcReadiness
      ? sortedStrings(policy.requireSourceCcReadiness)
      : null,
  };
}

export function hashJeApprovalPolicy(policy: JeApprovalPolicy): string {
  return sha256Hex(stableCanonicalJson(canonicalizeJeApprovalPolicy(policy)));
}

export function hashJeApprovalIdempotencyKey(args: {
  proposalId: string;
  proposalHash: string;
  approvalPolicyHash: string;
  reviewerUserId: string;
  decision: JeApprovalDecision;
}): string {
  return sha256Hex(
    stableCanonicalJson({
      approvalPolicyHash: String(args.approvalPolicyHash),
      decision: String(args.decision),
      proposalHash: String(args.proposalHash),
      proposalId: String(args.proposalId),
      reviewerUserId: String(args.reviewerUserId),
    }),
  );
}
