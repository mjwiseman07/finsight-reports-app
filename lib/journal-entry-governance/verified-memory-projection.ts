/**
 * Non-authoritative customer projection for a VERIFIED governed JE.
 *
 * Memory is downstream, optional, and rebuildable. It cannot establish or
 * change provider/execution status; Patent #6 custody remains authoritative.
 *
 * Public entry accepts only executionId. All VERIFIED lineage, economics, and
 * receipt binding are loaded from authoritative execution + ledger custody.
 * Production Memory projection remains OFF via PRODUCTION_JE_ACTIVATION_POLICY.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  recordMemory,
  type RecordMemoryInput,
  type RecordMemoryResult,
} from "@/lib/memory/client-memory-service";
import { PRODUCTION_JE_ACTIVATION_POLICY } from "./production-activation-policy";
import { loadExactExecution } from "./provider-attempt-service";
import type { JournalEntryExecutionRow } from "./execution-types";

export type ProjectVerifiedJeToMemoryInput = {
  executionId: string;
};

export class VerifiedJeProjectionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "VerifiedJeProjectionError";
  }
}

export type VerificationLedgerEventCustody = {
  event_id: string;
  event_type: string;
  event_hash: string | null;
  previous_event_hash: string | null;
  chain_index: number | null;
  firm_client_id: string | null;
  engagement_id: string | null;
  aggregate_type: string | null;
  aggregate_id: string | null;
  event_payload: Record<string, unknown>;
};

/**
 * Internal test harness only. Injects repository/load/write functions.
 * Must never accept policy overrides or fabricated execution custody fields.
 */
export type VerifiedJeProjectionHarness = {
  loadExecution: (
    executionId: string,
  ) => Promise<JournalEntryExecutionRow | null>;
  loadVerificationLedgerEvent: (
    eventId: string,
  ) => Promise<VerificationLedgerEventCustody | null>;
  loadLedgerEventByHash: (
    eventHash: string,
  ) => Promise<{ event_id: string; event_hash: string } | null>;
  record: (input: RecordMemoryInput) => Promise<RecordMemoryResult>;
};

function payloadString(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  const value = payload[key];
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function deriveEconomicsFromVerificationSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
): {
  transactionDate: string;
  currency: string;
  totalDebitsCents: number;
  totalCreditsCents: number;
} {
  if (!snapshot || typeof snapshot !== "object") {
    throw new VerifiedJeProjectionError(
      "memory_projection_snapshot_missing",
      "Verification snapshot is required for Memory projection economics.",
    );
  }
  const transactionDate = String(snapshot.txnDate || "").slice(0, 10);
  const currency = String(snapshot.currency || "").trim().toUpperCase();
  const totalDebitsCents = Number(snapshot.totalDebitsCents);
  const totalCreditsCents = Number(snapshot.totalCreditsCents);
  if (!transactionDate || !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
    throw new VerifiedJeProjectionError(
      "memory_projection_snapshot_txn_date_invalid",
      "Verification snapshot transaction date is missing or invalid.",
    );
  }
  if (!currency) {
    throw new VerifiedJeProjectionError(
      "memory_projection_snapshot_currency_invalid",
      "Verification snapshot currency is missing.",
    );
  }
  if (
    !Number.isSafeInteger(totalDebitsCents) ||
    !Number.isSafeInteger(totalCreditsCents) ||
    totalDebitsCents <= 0 ||
    totalCreditsCents <= 0 ||
    totalDebitsCents !== totalCreditsCents
  ) {
    throw new VerifiedJeProjectionError(
      "memory_projection_economics_invalid",
      "Verified projection must be positive and balanced from the snapshot.",
    );
  }
  return { transactionDate, currency, totalDebitsCents, totalCreditsCents };
}

async function defaultLoadVerificationLedgerEvent(
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

async function defaultLoadLedgerEventByHash(
  eventHash: string,
): Promise<{ event_id: string; event_hash: string } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ledger_events")
    .select("event_id, event_hash")
    .eq("event_hash", eventHash)
    .maybeSingle();
  if (error || !data?.event_id || !data?.event_hash) return null;
  return {
    event_id: String(data.event_id),
    event_hash: String(data.event_hash),
  };
}

function createDefaultHarness(): VerifiedJeProjectionHarness {
  return {
    loadExecution: loadExactExecution,
    loadVerificationLedgerEvent: defaultLoadVerificationLedgerEvent,
    loadLedgerEventByHash: defaultLoadLedgerEventByHash,
    record: recordMemory,
  };
}

async function projectWithHarness(
  input: ProjectVerifiedJeToMemoryInput,
  harness: VerifiedJeProjectionHarness,
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

  const execution = await harness.loadExecution(executionId);
  if (!execution) {
    throw new VerifiedJeProjectionError(
      "memory_projection_execution_not_found",
      "Exact execution custody was not found.",
    );
  }
  if (execution.status !== "VERIFIED") {
    throw new VerifiedJeProjectionError(
      "memory_projection_requires_verified",
      "Memory projection requires VERIFIED execution custody.",
    );
  }

  const providerJournalId = String(execution.provider_journal_id || "").trim();
  const providerReadbackHash = String(
    execution.provider_readback_hash || "",
  ).trim();
  const verificationLedgerEventId = String(
    execution.verification_ledger_event_id || "",
  ).trim();
  const verifiedAt = String(execution.verified_at || "").trim();
  if (
    !providerJournalId ||
    !providerReadbackHash ||
    !verificationLedgerEventId ||
    !verifiedAt
  ) {
    throw new VerifiedJeProjectionError(
      "memory_projection_lineage_incomplete",
      "Verified provider ID, readback hash, receipt, and timestamp are required.",
    );
  }

  const firmClientId = String(execution.firm_client_id || "").trim();
  if (!firmClientId) {
    throw new VerifiedJeProjectionError(
      "memory_projection_firm_client_required",
      "firm_client_id is required for Memory projection.",
    );
  }

  const receipt = await harness.loadVerificationLedgerEvent(
    verificationLedgerEventId,
  );
  if (!receipt) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_not_found",
      "Exact verification ledger receipt was not found.",
    );
  }
  if (receipt.event_type !== "journal_entry.verified") {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_type_invalid",
      "Verification receipt event type must be journal_entry.verified.",
    );
  }

  const payload = receipt.event_payload || {};
  const payloadExecutionId = payloadString(payload, "execution_id");
  const payloadConnectionId = payloadString(payload, "accounting_connection_id");
  const payloadProviderJournalId = payloadString(payload, "provider_journal_id");
  const payloadReadbackHash = payloadString(payload, "provider_readback_hash");
  const payloadCompanyId = payloadString(payload, "company_id");
  const payloadFirmClientId = payloadString(payload, "firm_client_id");
  const payloadEngagementId = payloadString(payload, "engagement_id");
  const payloadProvider = payloadString(payload, "provider");

  if (payloadExecutionId !== execution.id) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_execution_mismatch",
      "Verification receipt execution_id does not match execution custody.",
    );
  }
  if (payloadConnectionId !== execution.accounting_connection_id) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_connection_mismatch",
      "Verification receipt connection does not match execution custody.",
    );
  }
  if (payloadCompanyId != null && payloadCompanyId !== execution.company_id) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_company_mismatch",
      "Verification receipt company does not match execution custody.",
    );
  }
  if (
    payloadFirmClientId != null &&
    execution.firm_client_id != null &&
    payloadFirmClientId !== execution.firm_client_id
  ) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_firm_client_mismatch",
      "Verification receipt firm_client_id does not match execution custody.",
    );
  }
  if (
    receipt.firm_client_id != null &&
    execution.firm_client_id != null &&
    String(receipt.firm_client_id) !== String(execution.firm_client_id)
  ) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_firm_client_mismatch",
      "Ledger firm_client_id does not match execution custody.",
    );
  }
  if (
    payloadEngagementId != null &&
    payloadEngagementId !== execution.engagement_id
  ) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_engagement_mismatch",
      "Verification receipt engagement does not match execution custody.",
    );
  }
  if (
    receipt.engagement_id != null &&
    String(receipt.engagement_id) !== execution.engagement_id
  ) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_engagement_mismatch",
      "Ledger engagement_id does not match execution custody.",
    );
  }
  if (payloadProvider != null && payloadProvider !== execution.provider) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_provider_mismatch",
      "Verification receipt provider does not match execution custody.",
    );
  }
  if (
    receipt.aggregate_id != null &&
    String(receipt.aggregate_id) !== execution.id
  ) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_aggregate_mismatch",
      "Verification receipt aggregate_id does not match execution custody.",
    );
  }
  if (payloadProviderJournalId !== providerJournalId) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_provider_id_mismatch",
      "Verification receipt provider journal ID does not match execution custody.",
    );
  }
  if (payloadReadbackHash !== providerReadbackHash) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_readback_mismatch",
      "Verification receipt readback hash does not match execution custody.",
    );
  }

  if (!receipt.event_hash) {
    throw new VerifiedJeProjectionError(
      "memory_projection_chain_hash_missing",
      "Verification receipt event_hash is required for Patent #6 chain custody.",
    );
  }
  const chainIndex = receipt.chain_index;
  if (chainIndex != null && chainIndex > 0 && !receipt.previous_event_hash) {
    throw new VerifiedJeProjectionError(
      "memory_projection_chain_previous_missing",
      "Non-genesis verification receipt requires previous_event_hash linkage.",
    );
  }
  if (receipt.previous_event_hash) {
    const prior = await harness.loadLedgerEventByHash(
      receipt.previous_event_hash,
    );
    if (!prior || prior.event_hash !== receipt.previous_event_hash) {
      throw new VerifiedJeProjectionError(
        "memory_projection_chain_link_invalid",
        "Verification receipt previous_event_hash does not resolve to a prior chain event.",
      );
    }
  }

  const economics = deriveEconomicsFromVerificationSnapshot(
    (execution.verification_snapshot as Record<string, unknown> | null) ?? null,
  );

  // Memory write only — never mutates execution/provider custody or status.
  return harness.record({
    firmClientId,
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
      provider_journal_id: providerJournalId,
      provider_readback_hash: providerReadbackHash,
      verification_ledger_event_id: verificationLedgerEventId,
      verification_event_hash: receipt.event_hash,
      verified_at: verifiedAt,
      transaction_date: economics.transactionDate,
      currency: economics.currency,
      total_debits_cents: economics.totalDebitsCents,
      total_credits_cents: economics.totalCreditsCents,
      rebuild_source: "PATENT_6_CHAIN_RECEIPT",
      provider_success_authority: false,
    },
  });
}

/**
 * Public production Memory projection entry.
 * Accepts only executionId. Uses canonical PRODUCTION_JE_ACTIVATION_POLICY.
 */
export async function projectVerifiedJournalEntryToMemory(
  input: ProjectVerifiedJeToMemoryInput,
): Promise<RecordMemoryResult> {
  return projectWithHarness(input, createDefaultHarness());
}

/**
 * Internal test harness entry. Repository injection only — no policy override,
 * no fabricated VERIFIED custody fields on the input surface.
 * Not re-exported from the package barrel.
 */
export async function projectVerifiedJournalEntryToMemoryForTests(
  input: ProjectVerifiedJeToMemoryInput,
  harness: VerifiedJeProjectionHarness,
): Promise<RecordMemoryResult> {
  return projectWithHarness(input, harness);
}
