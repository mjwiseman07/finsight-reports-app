/**
 * Phase DASH_1B.2 — Sync lifecycle event emitter.
 *
 * Emits a `pilot.lifecycle.accounting-sync-completed` or
 * `pilot.lifecycle.accounting-sync-failed` event into the hash-chained
 * pilot_lifecycle_events table.
 *
 * State-modeling contract (Option 2 — synthetic self-transition):
 *   - from_status = to_status = 'active' (the pilot_slot's current status)
 *   - Outcome (succeeded/failed) lives in payload.outcome
 *   - Rationale documented in Phase_DASH_1B_2_SyncEventModel_Research.md
 *
 * Trigger behavior (verified from pg_proc.prosrc):
 *   - The BEFORE-INSERT trigger overwrites chain_seq/prev_hash/row_hash inside
 *     a pg_advisory_xact_lock. Do NOT pass those columns — they will be rejected.
 *   - The trigger derives company_id/firm_id from pilot_slot_id. Do NOT pass
 *     them either.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type SyncLifecycleEventKind =
  | "pilot.lifecycle.accounting-sync-completed"
  | "pilot.lifecycle.accounting-sync-failed";

export type EmitSyncLifecycleEventParams = {
  admin: SupabaseClient;
  pilotSlotId: string;
  eventKind: SyncLifecycleEventKind;
  payload: {
    connection_id: string;
    tenant_id: string | null;
    tenant_name: string;
    sync_id: string;
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
  };
};

export async function emitSyncLifecycleEvent(params: EmitSyncLifecycleEventParams): Promise<void> {
  const { admin, pilotSlotId, eventKind, payload } = params;

  const { error } = await admin.from("pilot_lifecycle_events").insert({
    pilot_slot_id: pilotSlotId,
    event_kind: eventKind,
    actor_kind: "system",
    actor_via: "accounting-sync",
    from_status: "active",
    to_status: "active", // Option 2: self-transition. Outcome is in payload.
    reason_code:
      eventKind === "pilot.lifecycle.accounting-sync-completed"
        ? "accounting.sync.completed"
        : "accounting.sync.failed",
    payload,
    // DO NOT SET: prev_hash, row_hash, chain_seq, company_id, firm_id.
    // The BEFORE-INSERT trigger derives/overwrites these.
  });

  if (error) {
    console.error("[emitSyncLifecycleEvent] insert failed", { eventKind, pilotSlotId, error });
    // Do NOT throw. Lifecycle emission MUST NOT block the sync path. Alert via log
    // and continue — the schema-drift detector will flag missing events via
    // separate rails (lifecycle_issues.accounting-sync.stale).
  }
}
