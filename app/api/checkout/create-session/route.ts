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

  if (tierKey !== "solo_bookkeeper") {
    return NextResponse.json(
      { error: "tier_not_supported_in_w1", tier_key: tierKey },
      { status: 400 },
    );
  }
  if (pricingStructure !== "flat" && pricingStructure !== "perClient") {
    return NextResponse.json({ error: "invalid_pricing_structure" }, { status: 400 });
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

  // 7. Pilot-cap enforcement (mirrors webhook logic but pre-flight so users see
  //    a clean error before hitting Stripe).
  if (track === "pilot") {
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
  const priceId = await getPriceId("solo_bookkeeper", track, "monthly", pricingStructure);
  if (!priceId) {
    console.error(
      "[create-session] price resolution failed",
      { tier_key: "solo_bookkeeper", track, cadence: "monthly", structure: pricingStructure },
    );
    return NextResponse.json({ error: "price_resolution_failed" }, { status: 500 });
  }

  // 9. Build absolute origin for success/cancel URLs.
  const origin =
    req.headers.get("origin") ??
    req.nextUrl.origin ??
    "https://www.advisacor.com";

  const metadata = {
    tier_key: "solo_bookkeeper",
    pricing_structure: pricingStructure,
    pricing_cadence: "monthly",
    track,
    firm_id: firmId,
  };

  // 10. Create checkout session.
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata },
      metadata,
      success_url: `${origin}/onboarding?checkout=success&tier=solo_bookkeeper`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      allow_promotion_codes: false,
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
