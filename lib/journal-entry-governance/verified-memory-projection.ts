/**
 * Non-authoritative customer projection for a VERIFIED governed JE.
 *
 * Memory is downstream, optional, and rebuildable. It cannot establish or
 * change provider/execution status; Patent #6 custody remains authoritative.
 */
import {
  recordMemory,
  type RecordMemoryInput,
  type RecordMemoryResult,
} from "@/lib/memory/client-memory-service";
import {
  PRODUCTION_JE_ACTIVATION_POLICY,
  type ProductionJeActivationPolicy,
} from "./production-activation-policy";

export type VerifiedJeProjectionInput = {
  firmClientId: string;
  executionId: string;
  executionStatus: string;
  providerJournalId: string | null;
  providerReadbackHash: string | null;
  verificationLedgerEventId: string | null;
  verifiedAt: string | null;
  transactionDate: string;
  currency: string;
  totalDebitsCents: number;
  totalCreditsCents: number;
};

export type VerifiedJeProjectionDeps = {
  record?: (input: RecordMemoryInput) => Promise<RecordMemoryResult>;
  policy?: Pick<ProductionJeActivationPolicy, "memoryProjectionAllowed">;
};

export class VerifiedJeProjectionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "VerifiedJeProjectionError";
  }
}

export async function projectVerifiedJournalEntryToMemory(
  input: VerifiedJeProjectionInput,
  deps: VerifiedJeProjectionDeps = {},
): Promise<RecordMemoryResult> {
  const policy = deps.policy ?? PRODUCTION_JE_ACTIVATION_POLICY;
  if (!policy.memoryProjectionAllowed) {
    throw new VerifiedJeProjectionError(
      "memory_projection_capability_off",
      "Production Memory projection capability is disabled.",
    );
  }
  if (input.executionStatus !== "VERIFIED") {
    throw new VerifiedJeProjectionError(
      "memory_projection_requires_verified",
      "Memory projection requires VERIFIED execution custody.",
    );
  }
  if (
    !input.providerJournalId ||
    !input.providerReadbackHash ||
    !input.verificationLedgerEventId ||
    !input.verifiedAt
  ) {
    throw new VerifiedJeProjectionError(
      "memory_projection_lineage_incomplete",
      "Verified provider ID, readback hash, receipt, and timestamp are required.",
    );
  }
  if (
    input.totalDebitsCents !== input.totalCreditsCents ||
    input.totalDebitsCents <= 0
  ) {
    throw new VerifiedJeProjectionError(
      "memory_projection_economics_invalid",
      "Verified projection must be positive and balanced.",
    );
  }

  const write = deps.record ?? recordMemory;
  return write({
    firmClientId: input.firmClientId,
    memoryType: "posted_je",
    memoryKey: `verified_je_${input.executionId}`,
    domain: "accounting",
    subdomain: "journal_entry",
    topic: "verified_provider_outcome",
    entityType: "journal_entry_execution",
    entityId: input.executionId,
    sourceSystem: "patent_6_verified_projection",
    evidenceStrength: "strong",
    confidenceScore: 1,
    payload: {
      authority: "NON_AUTHORITATIVE_MEMORY_PROJECTION",
      execution_id: input.executionId,
      provider_journal_id: input.providerJournalId,
      provider_readback_hash: input.providerReadbackHash,
      verification_ledger_event_id: input.verificationLedgerEventId,
      verified_at: input.verifiedAt,
      transaction_date: input.transactionDate,
      currency: input.currency,
      total_debits_cents: input.totalDebitsCents,
      total_credits_cents: input.totalCreditsCents,
      rebuild_source: "PATENT_6_CHAIN_RECEIPT",
      provider_success_authority: false,
    },
  });
}
