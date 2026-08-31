/**
 * Authoritative ledger_events column contract for governed JE custody reads.
 *
 * Source of truth: supabase/migrations/20260706120000_d_platform_event_sourced_foundation.sql
 * plus 20260717050000_d65_p2_block5_anomaly_score_merkle.sql (event_hash, chain_index).
 *
 * ledger_events has occurred_at and recorded_at — NOT created_at.
 */

/** Columns selected for Patent #6 chain receipt custody (cockpit + verification). */
export const LEDGER_EVENTS_PATENT6_CHAIN_SELECT =
  "event_id, event_type, event_hash, previous_event_hash, chain_index, event_sequence, aggregate_type, aggregate_id, occurred_at, recorded_at" as const;

/** Minimal columns for receipt-id resolution ordered by chain_index / event_sequence. */
export const LEDGER_EVENTS_RECEIPT_ID_SELECT =
  "event_id, event_type, chain_index, event_sequence" as const;

/** Authoritative ledger_events columns referenced by governed JE reads in this package. */
export const LEDGER_EVENTS_GOVERNED_JE_COLUMNS = [
  "event_id",
  "event_type",
  "event_hash",
  "previous_event_hash",
  "chain_index",
  "event_sequence",
  "aggregate_type",
  "aggregate_id",
  "occurred_at",
  "recorded_at",
  "firm_client_id",
  "engagement_id",
  "event_payload",
] as const;

/** Columns that must never appear in governed JE ledger selects (schema drift guard). */
export const LEDGER_EVENTS_FORBIDDEN_SELECT_COLUMNS = ["created_at", "entity_type", "entity_id"] as const;

export type LedgerEventPatent6ChainRow = {
  event_id: string;
  event_type: string;
  event_hash: string | null;
  previous_event_hash: string | null;
  chain_index: number | null;
  event_sequence: number | null;
  aggregate_type: string;
  aggregate_id: string;
  occurred_at: string;
  recorded_at: string;
};

export type LedgerEventReceiptIdRow = {
  event_id: string;
  event_type: string;
  chain_index: number | null;
  event_sequence: number | null;
};

export function parseLedgerEventPatent6ChainRow(
  row: Record<string, unknown>,
): LedgerEventPatent6ChainRow {
  return {
    event_id: String(row.event_id),
    event_type: String(row.event_type),
    event_hash: row.event_hash ? String(row.event_hash) : null,
    previous_event_hash: row.previous_event_hash
      ? String(row.previous_event_hash)
      : null,
    chain_index: row.chain_index == null ? null : Number(row.chain_index),
    event_sequence:
      row.event_sequence == null ? null : Number(row.event_sequence),
    aggregate_type: String(row.aggregate_type),
    aggregate_id: String(row.aggregate_id),
    occurred_at: String(row.occurred_at),
    recorded_at: String(row.recorded_at),
  };
}

export function assertPatent6ChainReceiptCustody(args: {
  executionId: string;
  events: readonly LedgerEventPatent6ChainRow[];
  verificationReceiptId?: string | null;
}): void {
  const aggregateType = "journal_entry_execution";

  for (const event of args.events) {
    if (event.aggregate_type !== aggregateType) {
      throw new Error(
        `Patent #6 chain receipt aggregate_type invalid: ${event.aggregate_type}`,
      );
    }
    if (event.aggregate_id !== args.executionId) {
      throw new Error(
        `Patent #6 chain receipt aggregate_id mismatch for event ${event.event_id}`,
      );
    }
  }

  const chained = args.events
    .filter((event) => event.chain_index != null)
    .sort((a, b) => (a.chain_index ?? 0) - (b.chain_index ?? 0));

  let prevHash: string | null = null;
  for (let i = 0; i < chained.length; i += 1) {
    const event = chained[i]!;
    if ((event.previous_event_hash ?? null) !== prevHash) {
      throw new Error(
        `Patent #6 previous_event_hash adjacency break at chain_index ${event.chain_index}`,
      );
    }
    prevHash = event.event_hash;
  }

  if (args.verificationReceiptId) {
    const bound = args.events.some(
      (event) => event.event_id === args.verificationReceiptId,
    );
    if (!bound) {
      throw new Error(
        `Verification receipt ${args.verificationReceiptId} not bound to Patent #6 chain events`,
      );
    }
  }
}
