/**
 * Non-authoritative customer projection for a VERIFIED governed JE.
 *
 * Memory is downstream, optional, and rebuildable. It cannot establish or
 * change provider/execution status; Patent #6 custody remains authoritative.
 *
 * Public entry accepts only executionId. All VERIFIED lineage, economics, and
 * receipt binding are loaded from authoritative execution + ledger custody.
 * Production Memory projection remains OFF via PRODUCTION_JE_ACTIVATION_POLICY.
 *
 * No injectable repository harness is exported from this production module.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  recordMemory,
  type RecordMemoryResult,
} from "@/lib/memory/client-memory-service";
import { PRODUCTION_JE_ACTIVATION_POLICY } from "./production-activation-policy";
import { loadExactExecution } from "./provider-attempt-service";
import {
  assertVerifiedJeMemoryProjectionCustody,
  VerifiedJeProjectionError,
  type VerificationLedgerEventCustody,
} from "./verified-memory-projection-custody";

export type ProjectVerifiedJeToMemoryInput = {
  executionId: string;
};

export { VerifiedJeProjectionError };

async function loadVerificationLedgerEvent(
  eventId: string,
): Promise<VerificationLedgerEventCustody | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ledger_events")
    .select(
      "event_id, event_type, event_hash, previous_event_hash, chain_index, firm_client_id, engagement_id, aggregate_type, aggregate_id, event_payload",
    )
    .eq("event_id", eventId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    event_id: String(data.event_id),
    event_type: String(data.event_type),
    event_hash: data.event_hash ? String(data.event_hash) : null,
    previous_event_hash: data.previous_event_hash
      ? String(data.previous_event_hash)
      : null,
    chain_index: data.chain_index == null ? null : Number(data.chain_index),
    firm_client_id: data.firm_client_id ? String(data.firm_client_id) : null,
    engagement_id: data.engagement_id ? String(data.engagement_id) : null,
    aggregate_type: data.aggregate_type ? String(data.aggregate_type) : null,
    aggregate_id: data.aggregate_id ? String(data.aggregate_id) : null,
    event_payload: (data.event_payload as Record<string, unknown> | null) ?? {},
  };
}

async function loadLedgerEventByHash(
  eventHash: string,
): Promise<{
  event_id: string;
  event_hash: string;
  chain_index: number | null;
} | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ledger_events")
    .select("event_id, event_hash, chain_index")
    .eq("event_hash", eventHash)
    .maybeSingle();
  if (error || !data?.event_id || !data?.event_hash) return null;
  return {
    event_id: String(data.event_id),
    event_hash: String(data.event_hash),
    chain_index: data.chain_index == null ? null : Number(data.chain_index),
  };
}

/**
 * Public production Memory projection entry.
 * Accepts only executionId. Always uses:
 * - canonical immutable PRODUCTION_JE_ACTIVATION_POLICY
 * - real execution repository (loadExactExecution)
 * - real ledger repository (ledger_events)
 * - real Patent #6 chain data
 * - real Memory writer (recordMemory)
 */
export async function projectVerifiedJournalEntryToMemory(
  input: ProjectVerifiedJeToMemoryInput,
): Promise<RecordMemoryResult> {
  // Canonical non-injectable policy — stop before any DB/Memory side effects.
  if (!PRODUCTION_JE_ACTIVATION_POLICY.memoryProjectionAllowed) {
    throw new VerifiedJeProjectionError(
      "memory_projection_capability_off",
      "Production Memory projection capability is disabled.",
    );
  }

  const executionId = String(input.executionId || "").trim();
  if (!executionId) {
    throw new VerifiedJeProjectionError(
      "memory_projection_execution_required",
      "executionId is required for verified Memory projection.",
    );
  }

  const execution = await loadExactExecution(executionId);
  if (!execution) {
    throw new VerifiedJeProjectionError(
      "memory_projection_execution_not_found",
      "Exact execution custody was not found.",
    );
  }

  const verificationLedgerEventId = String(
    execution.verification_ledger_event_id || "",
  ).trim();
  if (!verificationLedgerEventId) {
    throw new VerifiedJeProjectionError(
      "memory_projection_lineage_incomplete",
      "Verified provider ID, readback hash, receipt, and timestamp are required.",
    );
  }

  const receipt = await loadVerificationLedgerEvent(verificationLedgerEventId);
  if (!receipt) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_not_found",
      "Exact verification ledger receipt was not found.",
    );
  }

  let priorEventByPreviousHash: {
    event_id: string;
    event_hash: string;
    chain_index: number | null;
  } | null = null;
  if (receipt.previous_event_hash) {
    priorEventByPreviousHash = await loadLedgerEventByHash(
      receipt.previous_event_hash,
    );
  }

  const custody = assertVerifiedJeMemoryProjectionCustody({
    execution,
    receipt,
    priorEventByPreviousHash,
  });

  // Memory write only — never mutates execution/provider custody or status.
  return recordMemory({
    firmClientId: custody.firmClientId,
    memoryType: "posted_je",
    memoryKey: `verified_je_${execution.id}`,
    domain: "accounting",
    subdomain: "journal_entry",
    topic: "verified_provider_outcome",
    entityType: "journal_entry_execution",
    entityId: execution.id,
    sourceSystem: "patent_6_verified_projection",
    evidenceStrength: "strong",
    confidenceScore: 1,
    payload: {
      authority: "NON_AUTHORITATIVE_MEMORY_PROJECTION",
      execution_id: execution.id,
      provider_attempt_id: custody.providerAttemptId,
      correlation_marker: custody.correlationMarker,
      provider_journal_id: custody.providerJournalId,
      provider_readback_hash: custody.providerReadbackHash,
      verification_ledger_event_id: custody.verificationLedgerEventId,
      verification_event_hash: custody.verificationEventHash,
      verified_at: custody.verifiedAt,
      transaction_date: custody.transactionDate,
      currency: custody.currency,
      total_debits_cents: custody.totalDebitsCents,
      total_credits_cents: custody.totalCreditsCents,
      rebuild_source: "PATENT_6_CHAIN_RECEIPT",
      provider_success_authority: false,
    },
  });
}
