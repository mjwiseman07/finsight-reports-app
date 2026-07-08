import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "../../../lib/supabase";
import { rateLimit } from "../../../lib/rate-limit";
import { getCheckoutTiers, getSubscriptionEntity } from "../../../lib/product-tiers";

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function getAllowedPriceIds() {
  return getCheckoutTiers().map((tier) => tier.priceId).filter(Boolean);
}

async function resolveCheckoutMetadata({ userId, tierKey, track, pricingStructure, pricingCadence }) {
  const entityType = getSubscriptionEntity(tierKey);

  if (entityType === null) {
    // Add-on tiers attach to the parent firm slot (solo_bookkeeper).
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from("firm_memberships")
      .select("firm_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1);

    if (membershipError) {
      return { error: membershipError.message, status: 500 };
    }
    const firmId = memberships?.[0]?.firm_id;
    if (!firmId) {
      return { error: "Active firm membership required for add-on checkout", status: 403 };
    }

    return {
      metadata: {
        tier_key: tierKey,
        firm_id: firmId,
        track: track || "pilot",
        pricing_structure: pricingStructure || "per_client",
        pricing_cadence: pricingCadence || "monthly",
      },
    };
  }

  if (entityType === "firm") {
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from("firm_memberships")
      .select("firm_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1);

    if (membershipError) {
      return { error: membershipError.message, status: 500 };
    }
    const firmId = memberships?.[0]?.firm_id;
    if (!firmId) {
      return { error: "Active firm membership required for firm-tier checkout", status: 403 };
    }

    return {
      metadata: {
        tier_key: tierKey,
        firm_id: firmId,
        track: track || "pilot",
        pricing_structure: pricingStructure || "flat",
        pricing_cadence: pricingCadence || "monthly",
      },
    };
  }

  if (entityType === "company") {
    const { data: companyUsers, error: companyError } = await supabaseAdmin
      .from("company_users")
      .select("company_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1);

    if (companyError) {
      return { error: companyError.message, status: 500 };
    }
    const companyId = companyUsers?.[0]?.company_id;
    if (!companyId) {
      return { error: "Active company membership required for owner-tier checkout", status: 403 };
    }

    return {
      metadata: {
        tier_key: tierKey,
        company_id: companyId,
        track: track || "pilot",
        pricing_structure: pricingStructure || "flat",
        pricing_cadence: pricingCadence || "monthly",
      },
    };
  }

  return { error: "Unknown subscription entity type", status: 500 };
}

function stripeUnavailableResponse() {
  return NextResponse.json(
    { error: "Stripe is not configured for this deployment." },
    { status: 503 },
  );
}

function getBaseUrl(request) {
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return `${protocol}://${host}`;
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "create-checkout", limit: 10, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const stripe = getStripeClient();
  const allowedPriceIds = getAllowedPriceIds();

  if (!stripe || allowedPriceIds.length === 0) {
    return stripeUnavailableResponse();
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase is not configured for this deployment." },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  if (!token) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }

  const { priceId, tierKey, track, pricingStructure, pricingCadence } = await request.json();

  if (!priceId) {
    return NextResponse.json({ error: "priceId is required" }, { status: 400 });
  }

  if (!allowedPriceIds.includes(priceId)) {
    return NextResponse.json({ error: "Invalid priceId" }, { status: 400 });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authData?.user?.id) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const { data: userRecord, error: userError } = await supabaseAdmin
    .from("users")
    .select("trial_used, subscription_status, email")
    .eq("id", authData.user.id)
    .single();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!userRecord) {
    return NextResponse.json({ error: "User record not found" }, { status: 404 });
  }

  if (userRecord.subscription_status === "active") {
    return NextResponse.json({ error: "User already has an active subscription" }, { status: 400 });
  }

  if (userRecord.trial_used !== true) {
    return NextResponse.json({ error: "Trial must be used before checkout" }, { status: 400 });
  }

  const baseUrl = getBaseUrl(request);

  const sessionParams = {
    mode: "subscription",
    customer_email: userRecord.email || authData.user.email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    automatic_tax: {
      enabled: true,
    },
    success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing`,
  };

  if (tierKey) {
    const metaResult = await resolveCheckoutMetadata({
      userId: authData.user.id,
      tierKey,
      track,
      pricingStructure,
      pricingCadence,
    });
    if (metaResult.error) {
      return NextResponse.json({ error: metaResult.error }, { status: metaResult.status });
    }
    sessionParams.metadata = metaResult.metadata;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return NextResponse.json({ url: session.url });
}
