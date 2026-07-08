// lib/entitlements.ts
//
// Phase TCP1 W1 — Entitlements resolver.
// Reads a firm-client's active subscription + complimentary status and returns
// the entitlement bag used across the UI and API.

import { createServiceClient } from "@/lib/supabase/service";

/** Tier metadata for W1 — avoids importing product-tiers.js (Stripe side-effect at load). */
const TIER_META: Record<
  string,
  {
    entitlements: Record<string, boolean | number | string>;
    erpSupport: ResolvedEntitlements["erp_support"];
  }
> = {
  solo_bookkeeper: {
    entitlements: {
      max_entities: 10,
      max_verticals: 15,
      pulse_intelligence: true,
      organizational_memory: true,
      predictive_alerts: true,
      weekly_briefings: true,
      disclosure_validation_full: true,
      cross_vertical_synthesis: false,
      firm_seats: 10,
    },
    erpSupport: { quickbooks: "live", xero: "coming_soon" },
  },
};

export interface ResolvedEntitlements {
  tier_key: string;
  pricing_track: "standard" | "pilot" | "complimentary";
  pricing_structure: "flat" | "per_client" | "complimentary";
  max_entities: number;
  active_client_count: number;
  client_capacity_remaining: number;
  is_complimentary: boolean;
  complimentary_client_cap: number | null;
  pilot_slot_number: number | null;
  pilot_status: string | null;
  entitlement_flags: Record<string, boolean | number | string>;
  erp_support: {
    quickbooks: "live" | "coming_soon" | "not_supported";
    xero: "live" | "coming_soon" | "not_supported";
  };
}

export async function resolveEntitlementsForFirmClient(
  firmClientId: string,
): Promise<ResolvedEntitlements | null> {
  const supabase = createServiceClient();

  const { data: slot, error: slotErr } = await supabase
    .from("pilot_slots")
    .select(
      "tier_key, pilot_slot_number, pilot_status, complimentary_client_cap, pilot_converts_at, pricing_structure",
    )
    .eq("company_id", firmClientId)
    .maybeSingle();
  if (slotErr) throw slotErr;

  if (!slot) return null;

  const tier = TIER_META[slot.tier_key];
  if (!tier) return null;

  const { data: firmRow } = await supabase
    .from("firms")
    .select("id")
    .eq("id", firmClientId)
    .maybeSingle();

  let clientCount = 0;
  if (firmRow?.id) {
    const { count, error: countErr } = await supabase
      .from("firm_clients")
      .select("*", { count: "exact", head: true })
      .eq("firm_id", firmRow.id)
      .eq("subscription_status", "active");
    if (countErr) throw countErr;
    clientCount = count ?? 0;
  } else {
    const { count, error: countErr } = await supabase
      .from("firm_clients")
      .select("*", { count: "exact", head: true })
      .eq("company_id", firmClientId)
      .eq("subscription_status", "active");
    if (countErr) throw countErr;
    clientCount = count ?? 0;
  }

  const isComp = slot.pilot_status === "complimentary";
  const track: "standard" | "pilot" | "complimentary" = isComp
    ? "complimentary"
    : slot.pilot_slot_number && slot.pilot_slot_number > 0
      ? "pilot"
      : "standard";

  const structure: "flat" | "per_client" | "complimentary" = isComp
    ? "complimentary"
    : (slot.pricing_structure as "flat" | "per_client" | null) ?? "flat";

  const capacity = isComp
    ? (slot.complimentary_client_cap ?? 3)
    : (tier.entitlements.max_entities as number | undefined) ?? 10;

  return {
    tier_key: slot.tier_key,
    pricing_track: track,
    pricing_structure: structure,
    max_entities: capacity,
    active_client_count: clientCount,
    client_capacity_remaining: Math.max(0, capacity - clientCount),
    is_complimentary: isComp,
    complimentary_client_cap: slot.complimentary_client_cap ?? null,
    pilot_slot_number: slot.pilot_slot_number ?? null,
    pilot_status: slot.pilot_status ?? null,
    entitlement_flags: tier.entitlements,
    erp_support: tier.erpSupport,
  };
}

export async function canAddClient(
  firmClientId: string,
): Promise<{ allowed: boolean; reason?: string; capacity_remaining: number }> {
  const ent = await resolveEntitlementsForFirmClient(firmClientId);
  if (!ent) return { allowed: false, reason: "no_active_plan", capacity_remaining: 0 };
  if (ent.client_capacity_remaining <= 0) {
    return {
      allowed: false,
      reason: ent.is_complimentary ? "complimentary_cap_reached" : "tier_max_entities_reached",
      capacity_remaining: 0,
    };
  }
  return { allowed: true, capacity_remaining: ent.client_capacity_remaining };
}
