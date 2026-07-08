// lib/entitlements.ts
//
// Phase TCP1 W1 — Entitlements resolver.
// Reads active subscription + complimentary status and returns the entitlement
// bag used across the UI and API.

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

type PilotSlotRow = {
  tier_key: string;
  pilot_slot_number: number | null;
  pilot_status: string;
  complimentary_client_cap: number | null;
  pilot_converts_at: string | null;
  pricing_structure: string | null;
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

function buildResolvedEntitlements(
  slot: PilotSlotRow,
  clientCount: number,
): ResolvedEntitlements | null {
  const tier = TIER_META[slot.tier_key];
  if (!tier) return null;

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

const SLOT_SELECT =
  "tier_key, pilot_slot_number, pilot_status, complimentary_client_cap, pilot_converts_at, pricing_structure";

/** Owner-tier products — reads pilot_slots by company_id only. */
export async function resolveEntitlementsForCompany(
  companyId: string,
): Promise<ResolvedEntitlements | null> {
  const supabase = createServiceClient();

  const { data: slot, error: slotErr } = await supabase
    .from("pilot_slots")
    .select(SLOT_SELECT)
    .eq("company_id", companyId)
    .maybeSingle();
  if (slotErr) throw slotErr;
  if (!slot) return null;

  const { count, error: countErr } = await supabase
    .from("firm_clients")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("subscription_status", "active");
  if (countErr) throw countErr;

  return buildResolvedEntitlements(slot, count ?? 0);
}

/** Firm-tier products — reads pilot_slots by firm_id. */
export async function resolveEntitlementsForFirm(
  firmId: string,
): Promise<ResolvedEntitlements | null> {
  const supabase = createServiceClient();

  const { data: slot, error: slotErr } = await supabase
    .from("pilot_slots")
    .select(SLOT_SELECT)
    .eq("firm_id", firmId)
    .maybeSingle();
  if (slotErr) throw slotErr;
  if (!slot) return null;

  const { count, error: countErr } = await supabase
    .from("firm_clients")
    .select("*", { count: "exact", head: true })
    .eq("firm_id", firmId)
    .eq("subscription_status", "active");
  if (countErr) throw countErr;

  return buildResolvedEntitlements(slot, count ?? 0);
}

/**
 * Dispatches to firm-tier or owner-tier resolver. New call sites SHOULD use
 * resolveEntitlementsForFirm / resolveEntitlementsForCompany directly once the
 * entity type is known. This exists for legacy callers during migration.
 */
export async function resolveEntitlementsForSubject(
  subjectId: string,
): Promise<ResolvedEntitlements | null> {
  const firmEnt = await resolveEntitlementsForFirm(subjectId);
  if (firmEnt) return firmEnt;
  return resolveEntitlementsForCompany(subjectId);
}

/**
 * @deprecated Use resolveEntitlementsForFirm for firm-tier products or
 * resolveEntitlementsForCompany for owner-tier products. Routes through
 * resolveEntitlementsForSubject for backward compatibility.
 */
export async function resolveEntitlementsForFirmClient(
  firmClientId: string,
): Promise<ResolvedEntitlements | null> {
  return resolveEntitlementsForSubject(firmClientId);
}

export async function canAddClientForFirm(
  firmId: string,
): Promise<{ allowed: boolean; reason?: string; capacity_remaining: number }> {
  const ent = await resolveEntitlementsForFirm(firmId);
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

/**
 * @deprecated Use canAddClientForFirm when the entity type is known to be a firm.
 */
export async function canAddClient(
  subjectId: string,
): Promise<{ allowed: boolean; reason?: string; capacity_remaining: number }> {
  const ent = await resolveEntitlementsForSubject(subjectId);
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
