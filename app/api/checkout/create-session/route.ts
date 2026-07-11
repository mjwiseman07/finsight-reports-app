/**
 * Phase TCP1 W1 — Stripe Checkout session creator for Solo Bookkeeper pilot.
 *
 * Flow:
 *   1. Verify authenticated Supabase session via SSR cookie helper.
 *   2. Ensure public.users row exists (upsert on auth.uid).
 *   3. Ensure the user has a firm_membership. If none, create a firms row and
 *      a firm_memberships row (role=firm_admin, status=active).
 *   4. Enforce the pilot cap: max 10 active solo_bookkeeper pilot slots.
 *   5. Resolve Stripe price via getPriceId(tier, track, cadence, structure).
 *   6. Create checkout.session with tier_key, pricing_structure, pricing_cadence,
 *      track, firm_id metadata — mirrored on subscription_data.metadata so the
 *      webhook (lib/tcp1/stripe-pilot-checkout.ts) sees consistent shape.
 *
 * W1 accepts only tier_key === "solo_bookkeeper". Other tiers are rejected until
 * their respective launch weeks (W2 owner_pro, W3 accounting_pro, W4 enterprise_firm).
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";
import { getPriceId, getSubscriptionEntity } from "@/lib/product-tiers";
import { createServiceClient } from "@/lib/supabase/service";
import {
  isSoloBkGated,
  isSoloBkBypassAllowed,
  isReviewAssistGated,
  isReviewAssistBypassAllowed,
} from "@/lib/tcp1/launch-gates";

export const runtime = "nodejs";

interface CreateSessionBody {
  tier_key?: string;
  pricing_structure?: string;
  pricing_cadence?: string;
  track?: string;
  business_name?: string;
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
  // 1. Auth check.
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

  // 2. Parse + validate body.
  let body: CreateSessionBody;
  try {
    body = (await req.json()) as CreateSessionBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
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

  // 4. Service-role client for user/firm upserts (bypasses RLS).
  const admin = createServiceClient();
  const userMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const firstName = String(userMetadata.first_name ?? "");
  const lastName = String(userMetadata.last_name ?? "");

  // 5. Upsert public.users row.
  const { error: userUpsertError } = await admin
    .from("users")
    .upsert(
      {
        id: user.id,
        email: user.email ?? "",
        first_name: firstName || null,
        last_name: lastName || null,
        business_name: businessName,
      },
      { onConflict: "id" },
    );
  if (userUpsertError) {
    console.error("[create-session] users upsert failed", userUpsertError);
    return NextResponse.json({ error: "user_upsert_failed" }, { status: 500 });
  }

  // 6. Look up existing firm_membership.
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

  // 10. Create checkout session.
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
      customer_email: user.email ?? undefined,
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
