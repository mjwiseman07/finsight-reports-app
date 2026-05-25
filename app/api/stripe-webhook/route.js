import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "../../../lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const priceIdToPlan = {
  [process.env.STRIPE_PRICE_ESSENTIAL]: "essential",
  [process.env.STRIPE_PRICE_PROFESSIONAL]: "professional",
  [process.env.STRIPE_PRICE_VIRTUAL_CFO]: "virtualCfo",
};

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event;

  try {
    const rawBody = Buffer.from(await request.arrayBuffer());
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${error.message}` },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email;
    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
    const priceId = lineItems.data[0]?.price?.id || null;
    const subscriptionPlan = priceIdToPlan[priceId] || null;

    if (email && stripeCustomerId) {
      const { data: userRecord, error: lookupError } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (lookupError) {
        return NextResponse.json({ error: lookupError.message }, { status: 500 });
      }

      if (userRecord?.id) {
        const { error: updateError } = await supabaseAdmin
          .from("users")
          .update({
            subscription_status: "active",
            stripe_customer_id: stripeCustomerId,
            subscription_price_id: priceId,
            subscription_plan: subscriptionPlan,
          })
          .eq("id", userRecord.id);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const stripeCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;

    if (stripeCustomerId) {
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({
          subscription_status: "cancelled",
        })
        .eq("stripe_customer_id", stripeCustomerId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
