/**
 * Phase DASH_1B.2 / DASH_1B.3 — Sync + connection lifecycle event emitter.
 *
 * Emits hash-chained pilot_lifecycle_events rows for accounting sync and
 * connection offboarding. State-modeling contract (Option 2): from_status =
 * to_status = 'active'; outcome lives in payload.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type SyncLifecycleEventKind =
  | "pilot.lifecycle.accounting-sync-completed"
  | "pilot.lifecycle.accounting-sync-failed"
  | "pilot.lifecycle.accounting-connection-connected"
  | "pilot.lifecycle.accounting-connection-disconnected";

export type EmitSyncLifecycleEventParams = {
  admin: SupabaseClient;
  pilotSlotId: string;
  eventKind: SyncLifecycleEventKind;
  payload: {
    connection_id: string;
    tenant_id: string | null;
    tenant_name: string;
    sync_id?: string;
    source_system: string;
    outcome: "succeeded" | "failed";
    // For failures:
    error_code?: string;
    error_message?: string;
    // For successes:
    records_synced?: number;
    duration_ms?: number;
    // Universal:
    provenance: "live" | "backfill_reconciliation";
    triggered_by?: string;
  };
};

function reasonCodeForEvent(eventKind: SyncLifecycleEventKind): string {
  if (eventKind === "pilot.lifecycle.accounting-sync-completed") return "accounting.sync.completed";
  if (eventKind === "pilot.lifecycle.accounting-sync-failed") return "accounting.sync.failed";
  if (eventKind === "pilot.lifecycle.accounting-connection-connected") return "accounting.connection.connected";
  return "accounting.connection.disconnected";
}

function actorViaForEvent(eventKind: SyncLifecycleEventKind): string {
  // v2: disconnect/connect retain actor_via=accounting-sync (CHECK already allows it).
  // Intent lives in payload.triggered_by when present.
  void eventKind;
  return "accounting-sync";
}

export async function emitSyncLifecycleEvent(params: EmitSyncLifecycleEventParams): Promise<void> {
  const { admin, pilotSlotId, eventKind, payload } = params;

  const { error } = await admin.from("pilot_lifecycle_events").insert({
    pilot_slot_id: pilotSlotId,
    event_kind: eventKind,
    actor_kind: "system",
    actor_via: actorViaForEvent(eventKind),
    from_status: "active",
    to_status: "active", // Option 2: self-transition. Outcome is in payload.
    reason_code: reasonCodeForEvent(eventKind),
    payload,
    // DO NOT SET: prev_hash, row_hash, chain_seq, company_id, firm_id.
    // The BEFORE-INSERT trigger derives/overwrites these.
  });

  if (error) {
    console.error("[emitSyncLifecycleEvent] insert failed", { eventKind, pilotSlotId, error });
    // Do NOT throw. Lifecycle emission MUST NOT block the sync/disconnect path.
  }
}
