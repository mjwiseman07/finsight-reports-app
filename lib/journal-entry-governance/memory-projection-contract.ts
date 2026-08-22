/**
 * JE-3B2 / JE-3C Memory projection contract.
 *
 * Authoritative source of truth remains:
 *   journal_entry_executions status
 *   + journal_entry_provider_attempts custody
 *   + Patent #6 ledger receipts
 *
 * JE-3B2: NO Memory write.
 * JE-3C this PR: NO Memory write (gate allowMemoryWrite=false).
 * Future projector: after exact read-back reaches VERIFIED, an asynchronous
 * outbox MAY record Memory referencing execution id, provider JE id,
 * normalized read-back hash, and journal_entry.verified receipt id.
 * Memory failure must never roll back or reinterpret provider custody /
 * verification / retry.
 */

export const JE_MEMORY_PROJECTION_CONTRACT = {
  phaseOwningWrite: "JE-3C" as const,
  je3b2WritesMemory: false as const,
  je3cWritesMemory: false as const,
  requiredExecutionStatus: "VERIFIED" as const,
  forbiddenAuthorizationUses: [
    "authorize_posted_unverified",
    "authorize_verified",
    "authorize_verification_mismatch",
    "authorize_retry",
    "authorize_recovery",
    "reinterpret_provider_custody",
  ] as const,
  requiredReferences: [
    "execution_id",
    "provider_journal_id",
    "provider_readback_hash",
    "ledger_receipt_id",
  ] as const,
  /** Raw POST response hash must not be used as Memory binding authority. */
  forbiddenHashAuthority: ["provider_response_hash"] as const,
  failurePolicy:
    "Memory projector failure must not mutate execution, provider-attempt, verification, or retry custody.",
  idempotency:
    "Projection key is posted_je_verified_<execution_id>; identical bindings are idempotent.",
} as const;

export type JeVerifiedMemoryProjectionInput = {
  executionId: string;
  providerJournalId: string;
  /** Normalized JE-3C read-back hash (not raw POST hash). */
  providerReadbackHash: string;
  ledgerReceiptId: string;
  firmClientId: string | null;
};

/**
 * Build the future VERIFIED-only Memory payload shape. Pure. Never persists.
 */
export function buildVerifiedJeMemoryProjectionDraft(
  input: JeVerifiedMemoryProjectionInput,
): {
  memoryType: "posted_je_verified";
  memoryKey: string;
  entityType: "journal_entry_execution";
  entityId: string;
  sourceSystem: "je_governed_projection";
  payload: Record<string, unknown>;
} {
  return {
    memoryType: "posted_je_verified",
    memoryKey: `posted_je_verified_${input.executionId}`,
    entityType: "journal_entry_execution",
    entityId: input.executionId,
    sourceSystem: "je_governed_projection",
    payload: {
      execution_id: input.executionId,
      provider_journal_id: input.providerJournalId,
      provider_readback_hash: input.providerReadbackHash,
      ledger_receipt_id: input.ledgerReceiptId,
      firm_client_id: input.firmClientId,
      projection_contract: JE_MEMORY_PROJECTION_CONTRACT.phaseOwningWrite,
    },
  };
}
