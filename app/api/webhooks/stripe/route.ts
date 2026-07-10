/**
 * Stripe webhook endpoint. Verifies signature, delegates to handleStripeWebhook.
 */
import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { handleStripeWebhook, type MinimalStripeEvent } from "@/lib/entitlements/stripe-sync";

export const runtime = "nodejs";

const stripeSecret = process.env.STRIPE_SECRET_KEY ?? "";
// Phase TCP1 W2.5 Block 3.5 — This endpoint receives ONLY checkout.session.completed
// from a dedicated Stripe LIVE webhook (webhook #2). The legacy endpoint
// /api/stripe-webhook retains its own STRIPE_WEBHOOK_SECRET for all other events.
// Each Stripe webhook endpoint has a distinct signing secret; sharing one env var
// across two endpoints breaks signature verification on whichever endpoint the
// shared secret does not match.
const webhookSecret =
  process.env.STRIPE_WEBHOOK_SECRET_TCP1 ??
  process.env.STRIPE_WEBHOOK_SECRET ??
  "";
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
