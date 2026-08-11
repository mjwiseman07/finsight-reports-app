/**
 * Phase DASH_1C Block A — Emit `pilot.lifecycle.provenance-drawer-opened`.
 *
 * Actor: authenticated user (owner_executive on the company).
 * Purpose: hash-chained audit record that "user X saw the accuracy contract
 *          for KPI Y bound to sync Z at chain_seq N", plus (A2) which company
 *          routing tier selected identity (`payload.routing.resolver_tier`).
 *          Provisional #6 SoR chain — accuracy + identity both receipted.
 *
 * The BEFORE-INSERT trigger derives company_id, prev_hash, row_hash, chain_seq.
 * Never set them from application code.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ProvenanceLifecycleEventKind =
  | "pilot.lifecycle.provenance-drawer-opened";

/** A2 — which identity signal selected company_id for this open (Patent #6 payload). */
export type ResolverTier =
  | "explicit_company_id"
  | "explicit_pilot_slot_id"
  | "active_company_fallback"
  | "resolver_fallback";

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
    /**
     * Rule 2 / A2: identity-routing provenance. actor_via column stays
     * CHECK-allowlisted `dashboard-provenance-drawer`; the resolver tier is
     * chain-receipted here so SoR proves which signal picked the company.
     */
    routing: { resolver_tier: ResolverTier };
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
