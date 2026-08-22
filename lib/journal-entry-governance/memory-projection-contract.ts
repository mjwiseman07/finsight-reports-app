/**
 * JE-3B2 / JE-3C Memory projection contract.
 *
 * Authoritative source of truth remains:
 *   journal_entry_executions status
 *   + journal_entry_provider_attempts custody
 *   + Patent #6 ledger receipts
 *
 * JE-3B2: NO Memory write.
 * JE-3C+: after exact read-back reaches VERIFIED, an asynchronous projector MAY
 * record Memory that references execution id, provider JE id, response hash,
 * and receipt id. Memory failure must never roll back or reinterpret provider
 * custody. Memory must never authorize POSTED_UNVERIFIED, VERIFIED, retry, or
 * recovery.
 */

export const JE_MEMORY_PROJECTION_CONTRACT = {
  phaseOwningWrite: "JE-3C" as const,
  je3b2WritesMemory: false as const,
  requiredExecutionStatus: "VERIFIED" as const,
  forbiddenAuthorizationUses: [
    "authorize_posted_unverified",
    "authorize_verified",
    "authorize_retry",
    "authorize_recovery",
    "reinterpret_provider_custody",
  ] as const,
  requiredReferences: [
    "execution_id",
    "provider_journal_id",
    "provider_response_hash",
    "ledger_receipt_id",
  ] as const,
  failurePolicy:
    "Memory projector failure must not mutate execution or provider-attempt custody.",
} as const;

export type JeVerifiedMemoryProjectionInput = {
  executionId: string;
  providerJournalId: string;
  providerResponseHash: string | null;
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
      provider_response_hash: input.providerResponseHash,
      ledger_receipt_id: input.ledgerReceiptId,
      firm_client_id: input.firmClientId,
      projection_contract: JE_MEMORY_PROJECTION_CONTRACT.phaseOwningWrite,
    },
  };
}
