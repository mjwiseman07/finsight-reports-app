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
    entitlements: Record<string, boolean | number | string | null>;
    erpSupport: ResolvedEntitlements["erp_support"];
    archived?: boolean;
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
    archived: true, // v1.4: retired
  },
  review_assist: {
    entitlements: {
      max_entities: 0,
      max_verticals: 15,
      pulse_intelligence: false,
      organizational_memory: false,
      predictive_alerts: false,
      weekly_briefings: false,
      disclosure_validation_full: true,
      cross_vertical_synthesis: false,
      firm_seats: 0,
      review_assist_pdf_mode: true,
      review_assist_findings_composer: true,
      review_assist_severity_surface: true,
      review_assist_close_packet_gate: true,
      // v1.4 additions
      review_assist_bank_matching_csv: true,
      review_assist_bank_matching_qbo_feed: true,
      review_assist_je_proposal: true,
      review_assist_matching_engine: "rules",
      review_assist_write_qbo: false,
      review_assist_historical_cleanup: false,
      review_assist_multi_client: false,
      review_assist_je_cadence_configurable: true,
      review_assist_je_cadence_default: "daily",
      review_assist_je_always_on: true,
      review_assist_print_pdf: true,
      review_assist_print_csv: true,
      review_assist_cash_app: false,
      review_assist_cash_app_engine: null,
    },
    erpSupport: { quickbooks: "live", xero: "coming_soon" },
  },
  review_assist_pro: {
    entitlements: {
      max_entities: 10,
      max_verticals: 15,
      pulse_intelligence: true,
      organizational_memory: true,
      predictive_alerts: true,
      weekly_briefings: true,
      disclosure_validation_full: true,
      cross_vertical_synthesis: true,
      firm_seats: 5,
      review_assist_pdf_mode: true,
      review_assist_findings_composer: true,
      review_assist_severity_surface: true,
      review_assist_close_packet_gate: true,
      review_assist_bank_matching_csv: true,
      review_assist_bank_matching_qbo_feed: true,
      review_assist_je_proposal: true,
      review_assist_je_cadence_configurable: true,
      review_assist_je_cadence_default: "realtime",
      review_assist_je_always_on: true,
      review_assist_print_pdf: true,
      review_assist_print_csv: true,
      review_assist_write_qbo: true,
      review_assist_matching_engine: "ai_memory",
      review_assist_historical_cleanup: true,
      review_assist_historical_lookback_months: 24,
      review_assist_multi_client: true,
      review_assist_ai_reasoning: true,
      review_assist_memory_substrate: true,
      review_assist_evidence_citations: true,
      review_assist_assertion_coverage: true,
      review_assist_industry_templates: true,
      ask_pulse_command_center: true,
      // v1.5 RA Pro capabilities (default ON)
      review_assist_evidence_bundles_visible: true,
      review_assist_evidence_bundle_download: true,
      review_assist_reconciliation_view: true,
      review_assist_variance_narratives: true,
      review_assist_prior_period_lookup: true,
      ai_workforce_enabled: false, // reserved — advertised, not shipped
    },
    erpSupport: { quickbooks: "live", xero: "coming_soon" },
  },
  ra_cashapp_addon: {
    entitlements: {
      review_assist_cash_app: true,
      review_assist_cash_app_engine: "rules",
      review_assist_cash_app_max_per_month: 100,
    },
    erpSupport: { quickbooks: "live", xero: "coming_soon" },
  },
  ra_je_write_addon: {
    entitlements: {
      review_assist_write_qbo: true,
      review_assist_je_audit_trail: true,
      review_assist_je_reversal: true,
    },
    erpSupport: { quickbooks: "live", xero: "coming_soon" },
  },
  ra_pro_cashapp_addon: {
    entitlements: {
      review_assist_cash_app: true,
      review_assist_cash_app_engine: "ai_memory",
      cash_app_check_image_ocr: true,
      cash_app_split_payments: true,
      cash_app_short_pay_handling: true,
      cash_app_discount_logic: true,
      cash_app_confidence_scoring: true,
    },
    erpSupport: { quickbooks: "live", xero: "coming_soon" },
  },
  ra_pro_ar_addon: {
    entitlements: {
      ra_pro_ar_billing: true,
      ra_pro_ar_customer_mgmt: true,
      ra_pro_ar_invoice_send: true,
      ra_pro_ar_stripe_payment_links: true,
      ra_pro_ar_aging_native: true,
      ra_pro_ar_reconciliation: true,
    },
    erpSupport: { quickbooks: "live", xero: "coming_soon" },
  },
  ra_pro_ap_addon: {
    entitlements: {
      ra_pro_ap_bills: true,
      ra_pro_ap_vendor_mgmt: true,
      ra_pro_ap_approval_workflow: true,
      ra_pro_ap_qbo_bill_write: true,
      ra_pro_ap_1099_tracking: true,
      ra_pro_ap_aging_native: true,
      ra_pro_ap_fraud_stack: true,
      ra_pro_ap_fraud_duplicate_detection: true,
      ra_pro_ap_fraud_new_vendor_hold: true,
      ra_pro_ap_fraud_amount_outlier: true,
      ra_pro_ap_fraud_bank_change_alert: true,
      ra_pro_ap_fraud_velocity_limit: true,
      ra_pro_ap_fraud_split_invoice: true,
    },
    erpSupport: { quickbooks: "live", xero: "coming_soon" },
  },
  ra_pro_billpay_connector_addon: {
    entitlements: {
      ra_pro_billpay_connector: true,
      ra_pro_billpay_fraud_stack_apply: true,
      ra_pro_billpay_orchestration: true,
      ra_pro_billpay_reconciliation: true,
    },
    erpSupport: { quickbooks: "live", xero: "coming_soon" },
  },
  ra_pro_billpay_native_addon: {
    entitlements: {
      ra_pro_billpay_native: true,
      ra_pro_billpay_native_ach: true,
      ra_pro_billpay_native_2fa_threshold_usd: 10000,
      ra_pro_billpay_native_sanctions_screening: true,
      ra_pro_billpay_native_vendor_bank_verification: true,
      ra_pro_billpay_native_1099_auto: true,
    },
    erpSupport: { quickbooks: "live", xero: "coming_soon" },
  },
  ra_pro_payroll_addon: {
    entitlements: {
      ra_pro_payroll: false,
      ra_pro_payroll_max_employees: 0,
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
  entitlement_flags: Record<string, boolean | number | string | null>;
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
