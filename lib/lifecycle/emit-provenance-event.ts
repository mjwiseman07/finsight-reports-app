/**
 * Phase DASH_1C Block A — Emit `pilot.lifecycle.provenance-drawer-opened`.
 *
 * Actor: authenticated user (owner_executive on the company).
 * Purpose: hash-chained audit record that "user X saw the accuracy contract
 *          for KPI Y bound to sync Z at chain_seq N". Provisional #6 SoR
 *          chain — every consumer-facing accuracy claim gets a receipt.
 *
 * The BEFORE-INSERT trigger derives company_id, prev_hash, row_hash, chain_seq.
 * Never set them from application code.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ProvenanceLifecycleEventKind =
  | "pilot.lifecycle.provenance-drawer-opened";

export type EmitProvenanceLifecycleEventParams = {
  admin: SupabaseClient;
  pilotSlotId: string;
  userId: string;
  payload: {
    kpi_code: string;
    period: string;
    accounting_syncs_id: string;
    receipt_chain_seq: number;
    receipt_row_hash: string;
    computation_status: "computed" | "pending_subledger";
    request_id: string;
    user_agent?: string | null;
  };
};

export async function emitProvenanceLifecycleEvent(
  params: EmitProvenanceLifecycleEventParams,
): Promise<void> {
  const { admin, pilotSlotId, userId, payload } = params;

  const { error } = await admin.from("pilot_lifecycle_events").insert({
    pilot_slot_id: pilotSlotId,
    event_kind: "pilot.lifecycle.provenance-drawer-opened",
    actor_kind: "user",
    actor_via: "dashboard-provenance-drawer",
    from_status: "active",
    to_status: "active",
    reason_code: "dashboard.provenance.drawer.opened",
    payload: { ...payload, actor_user_id: userId },
  });

  if (error) {
    console.error("[emitProvenanceLifecycleEvent] insert failed", {
      pilotSlotId,
      userId,
      kpi_code: payload.kpi_code,
      error: error.message,
    });
    // Non-blocking. The GET response still ships to the user; Block C's
    // verify path will surface any chain damage.
  }
}
