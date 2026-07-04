/**
 * Stripe webhook endpoint. Verifies signature, delegates to handleStripeWebhook.
 */
import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { handleStripeWebhook, type MinimalStripeEvent } from "@/lib/entitlements/stripe-sync";

export const runtime = "nodejs";

const stripeSecret = process.env.STRIPE_SECRET_KEY ?? "";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 400 },
    );
  }

  const result = await handleStripeWebhook(
    event as unknown as MinimalStripeEvent,
    JSON.parse(rawBody),
  );
  return NextResponse.json({ received: true, status: result.status });
}
