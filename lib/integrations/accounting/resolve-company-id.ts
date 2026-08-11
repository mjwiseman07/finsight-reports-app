/**
 * Phase L2 — Resolve the real companies.id for a user.
 *
 * Never fall back to user_id. Prefer a company that owns an active/trialing
 * pilot slot; otherwise owner_executive membership; otherwise null.
 *
 * ------------------------------------------------------------------
 * pilot_status vocabulary (DASH_1C.A1 / 2026-08-10)
 * ------------------------------------------------------------------
 * Schema CHECK (TCP1 W1): pending | active | converted | cancelled | complimentary
 *   (and runtime may also see 'trialing' where writers produce it).
 *
 * Live-written values observed/expected: active, trialing, cancelled, complimentary.
 * Schema-reserved / unused by live writers: pending, converted (0 prod rows;
 * no Stripe/app writer as of DASH_1C.A1).
 *
 * Predicate allow-lists for "eligible company context" MUST use only
 * live-written paid-eligible statuses: active | trialing.
 * - Do NOT use 'trial' (bug — never a pilot_slots.pilot_status value).
 * - Do NOT use 'converted' (legacy reserved; 0 rows).
 * - Do NOT include 'complimentary' here — comps intentionally do not grant
 *   paid-tier identity preference via this resolver.
 *
 * See Phase_DASH_1C_A1_Converted_Status_Investigation.md.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// pilot_status enum: pending | active | trialing | converted | cancelled | complimentary
// Live writers only produce: active, trialing, cancelled, complimentary.
// 'converted' is a legacy schema-reserved value with 0 rows in prod (see
// Phase_DASH_1C_A1_Converted_Status_Investigation.md). 'trial' was a bug —
// the actual live status is 'trialing'. 'complimentary' is intentionally excluded
// because comp slots don't grant paid-tier entitlement.
const ACTIVE_PILOT_STATUSES = ["active", "trialing"] as const;

export async function resolveCompanyIdForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  if (!userId) return null;

  const { data: memberships, error: memberErr } = await admin
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .eq("status", "active");
  if (memberErr) {
    console.warn("resolveCompanyIdForUser: company_users lookup failed", {
      userId,
      error: memberErr.message,
    });
    return null;
  }

  const companyIds = Array.from(
    new Set(
      (memberships || [])
        .map((row) => (typeof row.company_id === "string" ? row.company_id : null))
        .filter((id): id is string => Boolean(id)),
    ),
  );
  if (!companyIds.length) {
    console.warn("resolveCompanyIdForUser: no company membership — company_id will be null", {
      userId,
    });
    return null;
  }

  const { data: pilotSlots, error: pilotErr } = await admin
    .from("pilot_slots")
    .select("company_id, updated_at")
    .in("company_id", companyIds)
    .in("pilot_status", [...ACTIVE_PILOT_STATUSES])
    .order("updated_at", { ascending: false })
    .limit(1);
  if (pilotErr) {
    console.warn("resolveCompanyIdForUser: pilot_slots lookup failed", {
      userId,
      error: pilotErr.message,
    });
  } else if (pilotSlots?.[0]?.company_id) {
    return String(pilotSlots[0].company_id);
  }

  const { data: owner, error: ownerErr } = await admin
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .eq("role", "owner_executive")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ownerErr) {
    console.warn("resolveCompanyIdForUser: owner_executive fallback failed", {
      userId,
      error: ownerErr.message,
    });
    return null;
  }
  if (owner?.company_id) return String(owner.company_id);

  console.warn(
    "resolveCompanyIdForUser: no pilot slot or owner company — company_id will be null (was: user_id fallback which is wrong)",
    { userId },
  );
  return null;
}
