import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { syncSubscriptionFromStripe } from '@/lib/subscription-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req) {
  if (!WEBHOOK_SECRET) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET missing');
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'no_signature' }, { status: 400 });

  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed', err.message);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error: insertErr } = await supabase.from('stripe_webhook_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    received_at: new Date().toISOString(),
  });

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('[stripe-webhook] ledger insert failed', insertErr);
    return NextResponse.json({ error: 'ledger_failed' }, { status: 500 });
  }

  try {
    await handleEvent(event);
    await supabase
      .from('stripe_webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('stripe_event_id', event.id);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[stripe-webhook] handler failed for ${event.type}`, err);
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 });
  }
}

async function handleEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.subscription) {
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
        await syncSubscriptionFromStripe(subscriptionId);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.trial_will_end': {
      const sub = event.data.object;
      await syncSubscriptionFromStripe(sub.id);
      break;
    }
    case 'invoice.paid':
    case 'invoice.payment_failed':
    case 'invoice.upcoming': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription.id;
        await syncSubscriptionFromStripe(subscriptionId);
      }
      break;
    }
    case 'customer.updated':
      break;
    default:
      console.log(`[stripe-webhook] unhandled event type: ${event.type}`);
  }
}
