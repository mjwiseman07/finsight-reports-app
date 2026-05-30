import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "../../../lib/supabase";
import { rateLimit } from "../../../lib/rate-limit";

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function getAllowedPriceIds() {
  return [
    process.env.STRIPE_PRICE_ESSENTIAL,
    process.env.STRIPE_PRICE_PROFESSIONAL,
    process.env.STRIPE_PRICE_VIRTUAL_CFO,
  ].filter(Boolean);
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

  const { priceId } = await request.json();

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
  const session = await stripe.checkout.sessions.create({
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
  });

  return NextResponse.json({ url: session.url });
}
