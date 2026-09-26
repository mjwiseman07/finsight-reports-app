/**
 * JE-4 policy / input / idempotency hashes.
 * SHA-256 canonical JSON. Not a Patent #6 chain hash.
 */

import {
  sha256Hex,
  stableCanonicalJson,
} from "@/lib/audit-ready/measurement-snapshots/hash";
import type { JeExpectedEffect } from "./types";

export function hashJe4Policy(input: {
  executionId: string;
  proposalHash: string;
  companyId: string;
  engagementId: string;
  accountingConnectionId: string;
  periodEnd: string;
  sourceContinuousCloseRunId: string;
  sourceAccountingSyncId: string;
  verificationLedgerEventId: string;
  expectedEffects: readonly JeExpectedEffect[];
}): string {
  return sha256Hex(
    stableCanonicalJson({
      accountingConnectionId: input.accountingConnectionId,
      companyId: input.companyId,
      engagementId: input.engagementId,
      executionId: input.executionId,
      expectedEffects: input.expectedEffects,
      periodEnd: input.periodEnd,
      proposalHash: input.proposalHash,
      sourceAccountingSyncId: input.sourceAccountingSyncId,
      sourceContinuousCloseRunId: input.sourceContinuousCloseRunId,
      verificationLedgerEventId: input.verificationLedgerEventId,
    }),
  );
}

export function hashJe4Input(input: {
  executionId: string;
  providerJournalId: string;
  providerReadbackHash: string;
  proposalHash: string;
  policyHash: string;
}): string {
  return sha256Hex(
    stableCanonicalJson({
      executionId: input.executionId,
      policyHash: input.policyHash,
      proposalHash: input.proposalHash,
      providerJournalId: input.providerJournalId,
      providerReadbackHash: input.providerReadbackHash,
    }),
  );
}

/**
 * Unique per (execution, post-write sync, policy).
 * Empty sync id is the pre-acquisition key for the single in-progress row.
 */
export function hashJe4IdempotencyKey(input: {
  executionId: string;
  accountingSyncId: string | null;
  policyHash: string;
}): string {
  return sha256Hex(
    stableCanonicalJson({
      accountingSyncId: input.accountingSyncId || "",
      executionId: input.executionId,
      policyHash: input.policyHash,
    }),
  );
}
