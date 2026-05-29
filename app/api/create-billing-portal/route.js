import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "../../../lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function getBaseUrl(request) {
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return `${protocol}://${host}`;
}

export async function POST(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  if (!token) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authData?.user?.id) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const { data: userRecord, error: userError } = await supabaseAdmin
    .from("users")
    .select("subscription_status, stripe_customer_id")
    .eq("id", authData.user.id)
    .single();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!userRecord?.stripe_customer_id || userRecord.subscription_status !== "active") {
    return NextResponse.json({ error: "Billing portal is only available for active subscribers" }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: userRecord.stripe_customer_id,
    return_url: `${getBaseUrl(request)}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
