/**
 * Stripe Checkout session creator.
 *
 * Modes:
 *   A) Track 4.5 Block A — public marketing checkout via `lookup_key`
 *      DEPRECATED in Block B (returns 410). Kept as rollback lever.
 *   B) Phase TCP1 — authenticated firm/company checkout via `tier_key`
 *      (+ entity bootstrap, pilot cap, customer link). Returns `checkout_url`.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";
import { getPriceId, getSubscriptionEntity } from "@/lib/product-tiers";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureStripeCustomerForUser } from "@/lib/stripe-customer";
import { bootstrapCompanyForUser } from "@/lib/tcp1/create-session-company";
import {
  isSoloBkGated,
  isSoloBkBypassAllowed,
  isReviewAssistGated,
  isReviewAssistBypassAllowed,
  isReviewAssistProGated,
  isReviewAssistProBypassAllowed,
} from "@/lib/tcp1/launch-gates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Preserved for Path A revival — do not delete.
const ALLOWED_LOOKUP_KEYS = new Set([
  "review_assist_std_mo",
  "review_assist_std_yr",
  "review_assist_pilot_mo",
  "review_assist_pilot_yr",
  "review_assist_pro_std_mo",
  "review_assist_pro_std_yr",
  "review_assist_pro_pilot_mo",
  "review_assist_pro_pilot_yr",
]);
void ALLOWED_LOOKUP_KEYS;

interface LookupKeyBody {
  lookup_key: string;
  overage_quantity?: number;
  overage_lookup_key?: string;
  success_path?: string;
  cancel_path?: string;
  customer_email?: string;
}

interface CreateSessionBody {
  tier_key?: string;
  pricing_structure?: string;
  pricing_cadence?: string;
  track?: string;
  business_name?: string;
  lookup_key?: string;
  overage_quantity?: number;
  overage_lookup_key?: string;
  success_path?: string;
  cancel_path?: string;
  customer_email?: string;
}

async function createLookupKeySession(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _body: LookupKeyBody,
): Promise<NextResponse> {
  // Track 4.5 Block B — Path A (unauthenticated lookup_key checkout) is
  // deprecated in favor of auth-first flow via /signup?persona=&plan=.
  // Public /pricing no longer calls this. Kept as 410 for rollback lever.
  //
  // See Phase_TRACK_4_5_Block_B_Build_Spec.md.
  return NextResponse.json(
    {
      error: "path_a_deprecated_use_auth_first",
      hint: "Public checkout requires sign-in. /pricing clicks route through /signup.",
    },
    { status: 410 },
  );
}

/* ── Path A revival block (commented). Uncomment + restore early body if needed.
async function createLookupKeySession_REVIVAL(
  req: NextRequest,
  body: LookupKeyBody,
): Promise<NextResponse> {
  if (!body.lookup_key || !ALLOWED_LOOKUP_KEYS.has(body.lookup_key)) {
    return NextResponse.json(
      { error: "Unknown or unauthorized lookup_key" },
      { status: 400 },
    );
  }
  const isRaPro = body.lookup_key.startsWith("review_assist_pro_");
  if (
    !isRaPro &&
    body.lookup_key.startsWith("review_assist_") &&
    isReviewAssistGated() &&
    !isReviewAssistBypassAllowed(req)
  ) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  // ... remaining Block A body restored from git history before Block B ...
}
── */

async function getSupabaseSsr() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Cookie set on read-only context — safe to ignore in this route.
          }
        },
        remove: (name: string, options: CookieOptions) => {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Cookie remove on read-only context — safe to ignore in this route.
          }
        },
      },
    },
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Parse body once — branch on public lookup_key vs authenticated tier_key.
  let body: CreateSessionBody;
  try {
    body = (await req.json()) as CreateSessionBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Track 4.5 Block A — public marketing checkout (now 410).
  if (typeof body.lookup_key === "string" && body.lookup_key.length > 0) {
    return createLookupKeySession(req, body as LookupKeyBody);
  }

  // 1. Auth check (legacy tier_key path).
  const supabaseSsr = await getSupabaseSsr();
  const {
    data: { user },
    error: authError,
  } = await supabaseSsr.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  // Phase TCP1 W2.5 (Block 9c) — SERVER IS AUTHORITATIVE ON EMAIL CONFIRMATION.
  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: "email_not_confirmed" }, { status: 403 });
  }

  const tierKey = body.tier_key;
  const pricingStructure = body.pricing_structure;
  const pricingCadence = body.pricing_cadence ?? "monthly";
  const track = body.track ?? "pilot";
  const businessName = (body.business_name ?? "").trim();

  // Track 4.5 Block B — accept solo_bookkeeper, review_assist, review_assist_pro.
  if (
    tierKey !== "solo_bookkeeper" &&
    tierKey !== "review_assist" &&
    tierKey !== "review_assist_pro"
  ) {
    return NextResponse.json(
      { error: "tier_not_supported", tier_key: tierKey },
      { status: 400 },
    );
  }
  // Launch gates — parity with middleware.ts via shared launch-gates helper.
  if (
    tierKey === "solo_bookkeeper" &&
    isSoloBkGated() &&
    !isSoloBkBypassAllowed(req)
  ) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  if (
    tierKey === "review_assist" &&
    isReviewAssistGated() &&
    !isReviewAssistBypassAllowed(req)
  ) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  if (
    tierKey === "review_assist_pro" &&
    isReviewAssistProGated() &&
    !isReviewAssistProBypassAllowed(req)
  ) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  if (pricingStructure !== "flat" && pricingStructure !== "perClient") {
    return NextResponse.json({ error: "invalid_pricing_structure" }, { status: 400 });
  }
  // Review Assist is flat-only (single SKU: review_assist_std_mo).
  if (tierKey === "review_assist" && pricingStructure !== "flat") {
    return NextResponse.json(
      { error: "invalid_pricing_structure_for_tier", tier_key: tierKey, pricing_structure: pricingStructure },
      { status: 400 },
    );
  }
  // Review Assist is standard-track only (no pilot pricing).
  if (tierKey === "review_assist" && track !== "standard") {
    return NextResponse.json(
      { error: "invalid_track_for_tier", tier_key: tierKey, track },
      { status: 400 },
    );
  }
  // RA Pro is flat-only; pilot + standard tracks both allowed.
  if (tierKey === "review_assist_pro" && pricingStructure !== "flat") {
    return NextResponse.json(
      { error: "invalid_pricing_structure_for_tier", tier_key: tierKey, pricing_structure: pricingStructure },
      { status: 400 },
    );
  }
  if (tierKey === "review_assist_pro" && track !== "pilot" && track !== "standard") {
    return NextResponse.json(
      { error: "invalid_track_for_tier", tier_key: tierKey, track },
      { status: 400 },
    );
  }
  if (pricingCadence !== "monthly" && pricingCadence !== "yearly") {
    return NextResponse.json({ error: "invalid_pricing_cadence" }, { status: 400 });
  }
  if (tierKey === "solo_bookkeeper" && pricingCadence !== "monthly") {
    return NextResponse.json(
      { error: "invalid_pricing_cadence_for_tier", tier_key: tierKey, pricing_cadence: pricingCadence },
      { status: 400 },
    );
  }
  if (track !== "pilot" && track !== "standard") {
    return NextResponse.json({ error: "invalid_track" }, { status: 400 });
  }
  if (!businessName) {
    return NextResponse.json({ error: "missing_business_name" }, { status: 400 });
  }

  const entityType = getSubscriptionEntity(tierKey);
  if (entityType !== "firm" && entityType !== "company") {
    return NextResponse.json(
      { error: "unknown_subscription_entity", tier_key: tierKey, entity: entityType },
      { status: 500 },
    );
  }

  // 4. Service-role client for membership writes (bypasses RLS).
  const admin = createServiceClient();

  const { data: userRow, error: userLookupError } = await admin
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (userLookupError) {
    console.error("[create-session] users lookup failed", userLookupError);
    return NextResponse.json({ error: "USERS_LOOKUP_FAILED" }, { status: 500 });
  }
  if (!userRow) {
    console.error("[create-session] missing users row for authenticated user", {
      userId: user.id,
    });
    return NextResponse.json({ error: "USER_ROW_MISSING" }, { status: 500 });
  }

  let firmId: string | null = null;
  let companyId: string | null = null;

  if (entityType === "firm") {
    // Existing firm bootstrap — keep verbatim.
    const { data: existingMembership, error: membershipLookupError } = await admin
      .from("firm_memberships")
      .select("firm_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (membershipLookupError) {
      console.error("[create-session] firm_memberships lookup failed", membershipLookupError);
      return NextResponse.json({ error: "membership_lookup_failed" }, { status: 500 });
    }

    if (existingMembership?.firm_id) {
      firmId = existingMembership.firm_id as string;
    } else {
      const { data: newFirm, error: firmInsertError } = await admin
        .from("firms")
        .insert({ name: businessName, owner_user_id: user.id })
        .select("id")
        .single();
      if (firmInsertError || !newFirm) {
        console.error("[create-session] firms insert failed", firmInsertError);
        return NextResponse.json({ error: "firm_create_failed" }, { status: 500 });
      }
      firmId = newFirm.id as string;

      const { error: membershipInsertError } = await admin
        .from("firm_memberships")
        .insert({
          firm_id: firmId,
          user_id: user.id,
          role: "firm_admin",
          status: "active",
        });
      if (membershipInsertError) {
        console.error("[create-session] firm_memberships insert failed", membershipInsertError);
        return NextResponse.json({ error: "membership_create_failed" }, { status: 500 });
      }
    }
  } else {
    // entityType === "company" — RA Pro path.
    try {
      const bootstrap = await bootstrapCompanyForUser({
        admin,
        userId: user.id,
        businessName,
      });
      companyId = bootstrap.companyId;
    } catch (err) {
      console.error("[create-session] company bootstrap failed", err);
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // 7. Pilot-cap enforcement.
  if (tierKey === "solo_bookkeeper" && track === "pilot") {
    const { count, error: capError } = await admin
      .from("pilot_slots")
      .select("id", { count: "exact", head: true })
      .eq("tier_key", "solo_bookkeeper")
      .eq("pilot_status", "active")
      .not("pilot_slot_number", "is", null);
    if (capError) {
      console.error("[create-session] pilot-cap query failed", capError);
      return NextResponse.json({ error: "pilot_cap_query_failed" }, { status: 500 });
    }
    if ((count ?? 0) >= 10) {
      return NextResponse.json({ error: "pilot_cap_reached" }, { status: 409 });
    }
  }

  if (tierKey === "review_assist_pro" && track === "pilot") {
    const cap = parseInt(process.env.PILOT_CAP_REVIEW_ASSIST_PRO ?? "25", 10);
    const { count, error: capError } = await admin
      .from("pilot_slots")
      .select("id", { count: "exact", head: true })
      .eq("tier_key", "review_assist_pro")
      .eq("pilot_status", "active");
    if (capError) {
      console.error("[create-session] RA Pro pilot-cap query failed", capError);
      return NextResponse.json({ error: "pilot_cap_query_failed" }, { status: 500 });
    }
    if ((count ?? 0) >= cap) {
      return NextResponse.json({ error: "pilot_cap_reached" }, { status: 409 });
    }
  }

  // 8. Resolve Stripe price ID via lookup key.
  const priceId = await getPriceId(tierKey, track, pricingCadence, pricingStructure);
  if (!priceId) {
    console.error(
      "[create-session] price resolution failed",
      { tier_key: tierKey, track, cadence: pricingCadence, structure: pricingStructure },
    );
    return NextResponse.json({ error: "price_resolution_failed" }, { status: 500 });
  }

  // 9. Build absolute origin for success/cancel URLs.
  const origin =
    req.headers.get("origin") ??
    req.nextUrl.origin ??
    "https://www.advisacor.com";

  const metadata: Record<string, string> = {
    tier_key: tierKey,
    pricing_structure: pricingStructure,
    pricing_cadence: pricingCadence,
    track,
  };
  if (firmId) metadata.firm_id = firmId;
  if (companyId) metadata.company_id = companyId;

  // 10. Link this user to a Stripe Customer before checkout.
  if (!user.email) {
    return NextResponse.json({ error: "email_required_for_checkout" }, { status: 400 });
  }
  let stripeCustomerId: string;
  try {
    ({ stripeCustomerId } = await ensureStripeCustomerForUser({
      userId: user.id,
      email: user.email,
      admin,
      stripeClient: stripe,
    }));
  } catch (err) {
    console.error("[create-session] stripe customer link failed", err);
    return NextResponse.json(
      {
        error: "stripe_customer_link_failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  // 11. Create checkout session.
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      customer_update: { address: "auto", name: "auto" },
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata },
      metadata,
      success_url: `${origin}/onboarding?checkout=success&tier=${tierKey}`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      allow_promotion_codes: false,
      payment_method_types: ["card", "us_bank_account"],
      payment_method_options: {
        us_bank_account: {
          verification_method: "instant",
          financial_connections: {
            permissions: ["payment_method"],
          },
        },
      },
    });

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
      ...(firmId ? { firm_id: firmId } : {}),
      ...(companyId ? { company_id: companyId } : {}),
    });
  } catch (err) {
    console.error("[create-session] stripe checkout.sessions.create failed", err);
    return NextResponse.json(
      {
        error: "stripe_checkout_failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
