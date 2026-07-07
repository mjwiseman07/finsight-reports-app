import type { SupabaseClient } from "@supabase/supabase-js";
import { computeEventHash } from "./merkle";

export interface ChainVerificationResult {
  ok: boolean;
  eventsChecked: number;
  firstBrokenChainIndex: number | null;
  firstBrokenEventId: string | null;
  reason: string | null;
}

export async function verifyChain(args: {
  supabase: SupabaseClient;
  startChainIndex?: number;
  endChainIndex?: number;
}): Promise<ChainVerificationResult> {
  const start = args.startChainIndex ?? 0;
  let query = args.supabase
    .from("ledger_events")
    .select("event_id, event_type, event_payload, event_hash, previous_event_hash, chain_index")
    .not("chain_index", "is", null)
    .gte("chain_index", start)
    .order("chain_index", { ascending: true });

  if (args.endChainIndex != null) {
    query = query.lte("chain_index", args.endChainIndex);
  }

  const { data, error } = await query.limit(10_000);
  if (error) {
    return {
      ok: false,
      eventsChecked: 0,
      firstBrokenChainIndex: null,
      firstBrokenEventId: null,
      reason: `query_error: ${error.message}`,
    };
  }

  const rows = data ?? [];
  let prevHash: string | null = null;
  let expectedIdx = start;
  for (const row of rows) {
    if (row.chain_index !== expectedIdx) {
      return {
        ok: false,
        eventsChecked: expectedIdx - start,
        firstBrokenChainIndex: row.chain_index as number,
        firstBrokenEventId: row.event_id as string,
        reason: `chain_index gap: expected ${expectedIdx}, got ${row.chain_index}`,
      };
    }
    if ((row.previous_event_hash ?? null) !== prevHash) {
      return {
        ok: false,
        eventsChecked: expectedIdx - start,
        firstBrokenChainIndex: row.chain_index as number,
        firstBrokenEventId: row.event_id as string,
        reason: `previous_event_hash mismatch at chain_index ${row.chain_index}`,
      };
    }
    const recomputed = computeEventHash({
      previousEventHash: row.previous_event_hash as string | null,
      eventId: row.event_id as string,
      eventType: row.event_type as string,
      payload: row.event_payload,
    });
    if (recomputed !== row.event_hash) {
      // NOTE: DB-side hash uses postgres digest() which serializes JSONB differently
      // than app-side canonical JSON. This function is authoritative for app-side chains.
      // For DB-side verification, use the SQL verify_chain function (future).
      return {
        ok: false,
        eventsChecked: expectedIdx - start,
        firstBrokenChainIndex: row.chain_index as number,
        firstBrokenEventId: row.event_id as string,
        reason: `event_hash mismatch at chain_index ${row.chain_index}`,
      };
    }
    prevHash = row.event_hash as string;
    expectedIdx += 1;
  }

  return {
    ok: true,
    eventsChecked: rows.length,
    firstBrokenChainIndex: null,
    firstBrokenEventId: null,
    reason: null,
  };
}
