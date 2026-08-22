/**
 * JE-3A — Execution policy / execution / idempotency hashes.
 * Stable canonical SHA-256. Not Patent #6 event hashes.
 */

import {
  sha256Hex,
  stableCanonicalJson,
} from "@/lib/audit-ready/measurement-snapshots/hash";
import type { JeExecutionPolicy } from "./execution-types";

function sortedStrings(values: readonly string[]): string[] {
  return [...values].map(String).sort((a, b) => a.localeCompare(b));
}

export function canonicalizeJeExecutionPolicy(
  policy: JeExecutionPolicy,
): Record<string, unknown> {
  return {
    allowedOriginTypes: sortedStrings(policy.allowedOriginTypes),
    manualExecutionOnly: true,
    maxExecutionAmountCents: policy.maxExecutionAmountCents,
    provider: "quickbooks",
    requireApprovalNotExpired: Boolean(policy.requireApprovalNotExpired),
    requireApprovalPolicyHashMatch: true,
    requireApprovedDecision: true,
    requireConnectionHealthy: Boolean(policy.requireConnectionHealthy),
    requireControlAccountRecheck: Boolean(policy.requireControlAccountRecheck),
    requireCurrentAccountsActive: Boolean(policy.requireCurrentAccountsActive),
    requireExecutorDifferentFromApprover: Boolean(
      policy.requireExecutorDifferentFromApprover,
    ),
    requireExecutorDifferentFromProposer: Boolean(
      policy.requireExecutorDifferentFromProposer,
    ),
    requireFreshMfa: Boolean(policy.requireFreshMfa),
    requirePeriodOpen: Boolean(policy.requirePeriodOpen),
    requireProposalHashMatch: true,
    requireQboWriteEnabled: true,
    requireSourceCcNotSuperseded: Boolean(policy.requireSourceCcNotSuperseded),
    requireWriteEntitlement: true,
    unknownCommitPolicy: "HALT_AND_DISCOVER",
  };
}

export function hashJeExecutionPolicy(policy: JeExecutionPolicy): string {
  return sha256Hex(stableCanonicalJson(canonicalizeJeExecutionPolicy(policy)));
}

export function hashJeExecution(args: {
  proposalId: string;
  proposalHash: string;
  approvalId: string;
  approvalPolicyHash: string;
  executionPolicyHash: string;
  provider: string;
  companyId: string;
  accountingConnectionId: string;
  txnDate: string;
}): string {
  return sha256Hex(
    stableCanonicalJson({
      accountingConnectionId: String(args.accountingConnectionId),
      approvalId: String(args.approvalId),
      approvalPolicyHash: String(args.approvalPolicyHash),
      companyId: String(args.companyId),
      executionPolicyHash: String(args.executionPolicyHash),
      proposalHash: String(args.proposalHash),
      proposalId: String(args.proposalId),
      provider: String(args.provider),
      txnDate: String(args.txnDate).slice(0, 10),
    }),
  );
}

export function hashJeExecutionIdempotencyKey(args: {
  proposalId: string;
  proposalHash: string;
  approvalId: string;
  approvalPolicyHash: string;
  executionPolicyHash: string;
  provider: string;
  companyId: string;
  accountingConnectionId: string;
}): string {
  return sha256Hex(
    stableCanonicalJson({
      accountingConnectionId: String(args.accountingConnectionId),
      approvalId: String(args.approvalId),
      approvalPolicyHash: String(args.approvalPolicyHash),
      companyId: String(args.companyId),
      executionPolicyHash: String(args.executionPolicyHash),
      proposalHash: String(args.proposalHash),
      proposalId: String(args.proposalId),
      provider: String(args.provider),
    }),
  );
}

export function hashProviderRequestPreview(
  preview: Record<string, unknown>,
): string {
  return sha256Hex(stableCanonicalJson(preview));
}
