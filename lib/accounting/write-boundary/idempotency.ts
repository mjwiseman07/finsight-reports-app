// WBP W1b — Duplicate-write detection.
// Single source of truth: pilot_lifecycle_events. If a prior write-validated
// or write-posted event exists with the same external_ref for the same
// connection, this externalRef is already claimed.

import type { SupabaseClient } from "@supabase/supabase-js";

export type PriorWriteHit = {
  id: string;
  event_kind: string;
  chain_seq: number;
  event_at: string;
};

export async function findPriorWriteByExternalRef(
  admin: SupabaseClient,
  connectionId: string,
  externalRef: string,
): Promise<PriorWriteHit | null> {
  const { data, error } = await admin
    .from("pilot_lifecycle_events")
    .select("id, event_kind, chain_seq, event_at, payload")
    .in("event_kind", [
      "pilot.lifecycle.write-validated",
      "pilot.lifecycle.write-posted",
    ])
    .filter("payload->>connection_id", "eq", connectionId)
    .filter("payload->>external_ref", "eq", externalRef)
    .order("chain_seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    // Log but do not throw — validator will treat as "no prior write found".
    // Being conservative here would risk blocking legitimate writes on transient DB errors.
    console.error("[findPriorWriteByExternalRef] query failed", { connectionId, externalRef, error });
    return null;
  }
  if (!data) return null;
  return {
    id: data.id as string,
    event_kind: data.event_kind as string,
    chain_seq: data.chain_seq as number,
    event_at: data.event_at as string,
  };
}
