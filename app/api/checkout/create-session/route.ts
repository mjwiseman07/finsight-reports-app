/**
 * Stripe Checkout session creator.
 *
 * Modes:
 *   A) Track 4.5 Block A — public marketing checkout via `lookup_key`
 *      (Review Assist / Review Assist Pro prices). No auth required.
 *   B) Phase TCP1 — authenticated firm checkout via `tier_key` (+ firm bootstrap,
 *      pilot cap, customer link). Returns `checkout_url`.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";
import { getPriceId, getSubscriptionEntity } from "@/lib/product-tiers";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureStripeCustomerForUser } from "@/lib/stripe-customer";
import {
  isSoloBkGated,
  isSoloBkBypassAllowed,
  isReviewAssistGated,
  isReviewAssistBypassAllowed,
} from "@/lib/tcp1/launch-gates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  req: NextRequest,
  body: LookupKeyBody,
): Promise<NextResponse> {
  if (!body.lookup_key || !ALLOWED_LOOKUP_KEYS.has(body.lookup_key)) {
    return NextResponse.json(
      { error: "Unknown or unauthorized lookup_key" },
      { status: 400 },
    );
  }

  // RA Pro prices are always checkoutable from /pricing. Base RA remains subject
  // to the Review Assist launch gate (parity with tier_key path).
  const isRaPro = body.lookup_key.startsWith("review_assist_pro_");
  if (
    !isRaPro &&
    body.lookup_key.startsWith("review_assist_") &&
    isReviewAssistGated() &&
    !isReviewAssistBypassAllowed(req)
  ) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    const priceList = await stripe.prices.list({
      lookup_keys: [body.lookup_key],
      active: true,
      limit: 1,
    });
    if (priceList.data.length === 0) {
      return NextResponse.json(
        { error: `Price not found for lookup_key ${body.lookup_key}` },
        { status: 404 },
      );
    }
    const primaryPrice = priceList.data[0];

    const lineItems: Array<{ price: string; quantity: number }> = [
      { price: primaryPrice.id, quantity: 1 },
    ];

    if (
      body.overage_quantity &&
      body.overage_quantity > 0 &&
      body.overage_lookup_key
    ) {
      if (!ALLOWED_LOOKUP_KEYS.has(body.overage_lookup_key)) {
        return NextResponse.json(
          { error: "Unknown overage lookup_key" },
          { status: 400 },
        );
      }
      const overageList = await stripe.prices.list({
        lookup_keys: [body.overage_lookup_key],
        active: true,
        limit: 1,
      });
      if (overageList.data.length > 0) {
        lineItems.push({
          price: overageList.data[0].id,
          quantity: body.overage_quantity,
        });
      }
    }

    const origin =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      req.nextUrl.origin ??
      "https://www.advisacor.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: lineItems,
      allow_promotion_codes: true,
      customer_email: body.customer_email,
      success_url: `${origin}${body.success_path ?? "/onboarding"}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${body.cancel_path ?? "/pricing"}?checkout=cancelled`,
      subscription_data: {
        metadata: {
          primary_lookup_key: body.lookup_key,
          primary_price_id: primaryPrice.id,
        },
      },
      metadata: {
        primary_lookup_key: body.lookup_key,
        primary_price_id: primaryPrice.id,
      },
    });

    return NextResponse.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error("[create-session] lookup_key checkout failed", err);
    return NextResponse.json(
      {
        error: "stripe_checkout_failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}

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

  // Track 4.5 Block A — public marketing checkout (returns `{ url }`).
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
  // No path that reaches Stripe checkout may originate from an unconfirmed
  // email, regardless of client-side flow. `email_confirmed_at` is the field
  // that flips when the user clicks the Supabase confirmation link — this is
  // distinct from raw_user_meta_data.email_verified (which is set at signup
  // time and is not proof of confirmation). Blocks: config drift where email
  // confirmation is disabled, admin-created users without confirmation, and
  // any race where a session appears before verification completes.
  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: "email_not_confirmed" }, { status: 403 });
  }

  const tierKey = body.tier_key;
  const pricingStructure = body.pricing_structure;
  const pricingCadence = body.pricing_cadence ?? "monthly";
  const track = body.track ?? "pilot";
  const businessName = (body.business_name ?? "").trim();

  // Phase TCP1 W2.5 (Block 9b) — accept solo_bookkeeper OR review_assist. Other
  // tiers still 400 until their respective launch weeks.
  if (tierKey !== "solo_bookkeeper" && tierKey !== "review_assist") {
    return NextResponse.json(
      { error: "tier_not_supported_in_w1", tier_key: tierKey },
      { status: 400 },
    );
  }
  // Launch gates — parity with middleware.ts via shared launch-gates helper.
  // If gate is on AND request has no valid bypass (token / cookie / IP),
  // return 404 symmetric with the middleware redirect on the /signup surface.
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
  if (pricingCadence !== "monthly") {
    return NextResponse.json({ error: "invalid_pricing_cadence" }, { status: 400 });
  }
  if (track !== "pilot" && track !== "standard") {
    return NextResponse.json({ error: "invalid_track" }, { status: 400 });
  }
  if (!businessName) {
    return NextResponse.json({ error: "missing_business_name" }, { status: 400 });
  }

  // 3. Invariant: solo_bookkeeper is a firm-tier subscription. If this ever
  //    flips, the webhook (lib/tcp1/stripe-pilot-checkout.ts) will reject.
  //    Guard here so the misconfig fails loud at checkout time, not at webhook time.
  const entityType = getSubscriptionEntity(tierKey);
  if (entityType !== "firm") {
    return NextResponse.json(
      { error: "tier_entity_mismatch", tier_key: tierKey, entity: entityType },
      { status: 500 },
    );
  }

  // 4. Service-role client for firm membership writes (bypasses RLS).
  //    public.users row is created by handle_new_auth_user trigger (FIX-USERS-PKEY).
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

  // 5. Look up existing firm_membership.
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

  let firmId: string;
  if (existingMembership?.firm_id) {
    firmId = existingMembership.firm_id as string;
  } else {
    // Create firm + membership.
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

  // 7. Pilot-cap enforcement — only applies to solo_bookkeeper pilot track.
  //    Review Assist is standard-track only, so no cap.
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

  // 8. Resolve Stripe price ID via lookup key.
  const priceId = await getPriceId(tierKey, track, "monthly", pricingStructure);
  if (!priceId) {
    console.error(
      "[create-session] price resolution failed",
      { tier_key: tierKey, track, cadence: "monthly", structure: pricingStructure },
    );
    return NextResponse.json({ error: "price_resolution_failed" }, { status: 500 });
  }

  // 9. Build absolute origin for success/cancel URLs.
  const origin =
    req.headers.get("origin") ??
    req.nextUrl.origin ??
    "https://www.advisacor.com";

  const metadata = {
    tier_key: tierKey,
    pricing_structure: pricingStructure,
    pricing_cadence: "monthly",
    track,
    firm_id: firmId,
  };

  // 10. Link this user to a Stripe Customer before checkout. Downstream
  //     subscription.* webhooks resolve the user via users.stripe_customer_id
  //     (lib/subscription-sync.js resolveSubscriber), so the link has to exist
  //     before Stripe can fire anything.
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
  //
  // Phase TCP1 W2.5 Block 9f: explicitly allowlist payment_method_types to
  // card + US bank account (ACH). Excludes Apple Pay, Google Pay, Link,
  // Amazon Pay, Klarna, Cash App Pay, and any other alternative payment
  // methods that Stripe may enable by default via the payment_method_configuration.
  //
  //   - "card":            Debit + credit
  //   - "us_bank_account": ACH direct debit with Stripe-collected mandate.
  //                        For subscriptions Stripe automatically shows the
  //                        mandate acceptance UI. Verification is "instant"
  //                        via Financial Connections when supported by the
  //                        customer's bank, falling back to microdeposits.
  //
  // NOTE: setting payment_method_types explicitly disables Stripe's
  // Dynamic Payment Methods (payment_method_configuration). This is
  // intentional — we want a hard allowlist, not a bank/geography-driven
  // dynamic set.
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      // Only permitted alongside `customer`, and required for Checkout to save
      // the name/address it collects back onto the Customer.
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
      firm_id: firmId,
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
