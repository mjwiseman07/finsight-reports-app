/**
 * Phase DASH_1B.2 — Anchor bootstrap for the single-chain lifecycle log.
 *
 * On first accounting connect, every authenticated user gets:
 *   1. A `companies` row (name copied from source system) if none exists.
 *   2. A `pilot_slots` row with tier_key='free_trial_connected', status='active'.
 *
 * This satisfies the patent-6 single-subject requirement: billing + sync +
 * assertion lifecycle events all resolve to the same pilot_slot.
 *
 * Idempotent. Safe to call on every sync.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { bootstrapCompanyForUser } from "../tcp1/create-session-company";

export type EnsureAnchorParams = {
  admin: SupabaseClient;
  userId: string;
  sourceSystemCompanyName: string; // Xero: external_entity_name. QBO: realm CompanyName.
};

export type EnsureAnchorResult = {
  companyId: string;
  pilotSlotId: string;
  companyCreated: boolean;
  pilotSlotCreated: boolean;
};

export async function ensureLifecycleAnchor(params: EnsureAnchorParams): Promise<EnsureAnchorResult> {
  const { admin, userId, sourceSystemCompanyName } = params;

  if (!sourceSystemCompanyName || sourceSystemCompanyName.trim().length === 0) {
    throw new Error("ensureLifecycleAnchor: sourceSystemCompanyName is required (must copy from source system, not fallback)");
  }

  // 1. Reuse existing bootstrap (idempotent on company_users lookup).
  const { companyId, created: companyCreated } = await bootstrapCompanyForUser({
    admin,
    userId,
    businessName: sourceSystemCompanyName,
  });

  // 2. Upsert the free_trial_connected pilot_slot.
  const { data: existingSlot, error: lookupErr } = await admin
    .from("pilot_slots")
    .select("id")
    .eq("tier_key", "free_trial_connected")
    .eq("company_id", companyId)
    .maybeSingle();

  if (lookupErr) {
    console.error("[ensureLifecycleAnchor] pilot_slots lookup failed", lookupErr);
    throw new Error("pilot_slot_lookup_failed");
  }

  if (existingSlot?.id) {
    return {
      companyId,
      pilotSlotId: existingSlot.id as string,
      companyCreated,
      pilotSlotCreated: false,
    };
  }

  const { data: newSlot, error: insertErr } = await admin
    .from("pilot_slots")
    .insert({
      tier_key: "free_trial_connected",
      pilot_status: "active",
      pricing_structure: "flat",
      pricing_cadence: "monthly",
      company_id: companyId,
      firm_id: null,
    })
    .select("id")
    .single();

  if (insertErr || !newSlot) {
    console.error("[ensureLifecycleAnchor] pilot_slots insert failed", insertErr);
    throw new Error("pilot_slot_create_failed");
  }

  return {
    companyId,
    pilotSlotId: newSlot.id as string,
    companyCreated,
    pilotSlotCreated: true,
  };
}
