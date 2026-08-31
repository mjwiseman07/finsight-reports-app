/**
 * Pure Patent #6 custody binding for verified JE Memory projection.
 *
 * Validates already-loaded execution + ledger receipt objects. Production
 * projection loads those objects from real repositories, then calls this
 * evaluator. Memory never becomes provider-success authority.
 */
import type { JournalEntryExecutionRow } from "./execution-types";

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

export type VerifiedJeMemoryProjectionCustody = {
  firmClientId: string;
  providerJournalId: string;
  providerReadbackHash: string;
  providerAttemptId: string;
  correlationMarker: string;
  verificationLedgerEventId: string;
  verifiedAt: string;
  verificationEventHash: string;
  transactionDate: string;
  currency: string;
  totalDebitsCents: number;
  totalCreditsCents: number;
};

export type PriorLedgerEventCustody = {
  event_id: string;
  event_hash: string;
  chain_index: number | null;
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

/**
 * Bind VERIFIED execution custody to the exact journal_entry.verified receipt
 * and Patent #6 chain linkage. Does not write Memory or mutate status.
 */
export function assertVerifiedJeMemoryProjectionCustody(args: {
  execution: JournalEntryExecutionRow;
  receipt: VerificationLedgerEventCustody;
  priorEventByPreviousHash: PriorLedgerEventCustody | null;
}): VerifiedJeMemoryProjectionCustody {
  const { execution, receipt } = args;

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

  if (receipt.event_id !== verificationLedgerEventId) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_id_mismatch",
      "Loaded verification receipt event_id does not match execution custody.",
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
  const payloadProviderAttemptId = payloadString(payload, "provider_attempt_id");
  const payloadCorrelationMarker = payloadString(payload, "correlation_marker");

  if (!payloadProviderAttemptId) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_attempt_missing",
      "Verification receipt provider_attempt_id is required for Patent #6 custody.",
    );
  }
  if (
    !payloadCorrelationMarker ||
    payloadCorrelationMarker !== execution.correlation_marker
  ) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_marker_mismatch",
      "Verification receipt correlation_marker does not match execution custody.",
    );
  }

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
  if (
    receipt.aggregate_type != null &&
    String(receipt.aggregate_type) !== "journal_entry_execution"
  ) {
    throw new VerifiedJeProjectionError(
      "memory_projection_receipt_aggregate_type_invalid",
      "Verification receipt aggregate_type must be journal_entry_execution.",
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
    const prior = args.priorEventByPreviousHash;
    if (!prior || prior.event_hash !== receipt.previous_event_hash) {
      throw new VerifiedJeProjectionError(
        "memory_projection_chain_link_invalid",
        "Verification receipt previous_event_hash does not resolve to a prior chain event.",
      );
    }
    // Global Patent #6 ledger chain: prior must be the immediate predecessor index.
    if (
      receipt.chain_index != null &&
      prior.chain_index != null &&
      Number(prior.chain_index) + 1 !== Number(receipt.chain_index)
    ) {
      throw new VerifiedJeProjectionError(
        "memory_projection_chain_index_adjacency_invalid",
        "Verification receipt chain_index is not adjacent to the resolved prior event.",
      );
    }
  }

  const economics = deriveEconomicsFromVerificationSnapshot(
    (execution.verification_snapshot as Record<string, unknown> | null) ?? null,
  );

  return {
    firmClientId,
    providerJournalId,
    providerReadbackHash,
    providerAttemptId: payloadProviderAttemptId,
    correlationMarker: payloadCorrelationMarker,
    verificationLedgerEventId,
    verifiedAt,
    verificationEventHash: receipt.event_hash,
    ...economics,
  };
}
