/**
 * RA Pro gate for conversational JE preview.
 * Prefer entitlements flag / tier; fall back to pilot_slots for complimentary demos.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
// @ts-expect-error — plain JS module
import { hasFlag, hasTier } from "@/lib/entitlements.js";

export const RA_PRO_PULSE_JE_FLAG = "ra_pro_pulse_journal_entry";

export async function requirePulseJeEntitlement(
  firmId: string | null | undefined,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!firmId) {
    return {
      ok: false,
      reason: "Conversational journal entries require Review Assist Pro.",
    };
  }

  try {
    if (await hasFlag("firm", firmId, RA_PRO_PULSE_JE_FLAG)) {
      return { ok: true };
    }
    if (await hasTier("firm", firmId, "review_assist_pro")) {
      return { ok: true };
    }
  } catch (err) {
    console.warn("[pulse-je] entitlement lookup failed", err);
  }

  // Complimentary / demo firms may only have pilot_slots (no entitlements row yet).
  try {
    const supabase = getSupabaseAdmin();
    const { data: pilot } = await supabase
      .from("pilot_slots")
      .select("tier_key, pilot_status")
      .eq("firm_id", firmId)
      .maybeSingle();
    if (
      pilot?.tier_key === "review_assist_pro" &&
      (pilot.pilot_status === "active" || pilot.pilot_status === "complimentary")
    ) {
      return { ok: true };
    }
  } catch (err) {
    console.warn("[pulse-je] pilot_slots lookup failed", err);
  }

  return {
    ok: false,
    reason: "Conversational journal entries require Review Assist Pro.",
  };
}
