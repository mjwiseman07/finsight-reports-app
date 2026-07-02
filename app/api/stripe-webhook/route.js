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
    payload: event,
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
    case 'invoice.paid': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription.id;
        await syncSubscriptionFromStripe(subscriptionId);
      }
      if (invoice.subscription && invoice.status === 'paid') {
        const supabase = getSupabaseAdmin();
        const stripeSubId =
          typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
        await supabase
          .from('subscriptions')
          .update({
            first_paid_charge_at: new Date(
              (invoice.status_transitions?.paid_at || invoice.created) * 1000,
            ).toISOString(),
          })
          .eq('stripe_subscription_id', stripeSubId)
          .is('first_paid_charge_at', null);
      }
      break;
    }
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
    case 'charge.refunded': {
      const charge = event.data.object;
      const supabase = getSupabaseAdmin();
      const refundId = charge.refunds?.data?.[0]?.id;
      if (refundId) {
        const { data: matched } = await supabase
          .from('refund_requests')
          .select('id, status')
          .eq('stripe_refund_id', refundId)
          .maybeSingle();
        if (matched) {
          await supabase.from('refund_audit_log').insert({
            refund_request_id: matched.id,
            actor_type: 'stripe',
            actor_identifier: event.id,
            event_type: 'stripe.charge.refunded',
            payload: {
              charge_id: charge.id,
              amount_refunded: charge.amount_refunded,
              currency: charge.currency,
            },
          });
        } else {
          console.info(`[stripe-webhook] charge.refunded received for un-tracked refund ${refundId}`);
        }
      }
      break;
    }
    case 'charge.dispute.created': {
      const dispute = event.data.object;
      const supabase = getSupabaseAdmin();
      const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
      let subscriptionId = null;
      let priorRefundRequest = null;

      if (chargeId) {
        const charge = await stripe.charges.retrieve(chargeId);
        let stripeSubId = null;
        if (charge.invoice) {
          const invoiceId = typeof charge.invoice === 'string' ? charge.invoice : charge.invoice.id;
          const invoice = await stripe.invoices.retrieve(invoiceId);
          stripeSubId =
            typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id || null;
        }
        if (stripeSubId) {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('id, first_paid_charge_at')
            .eq('stripe_subscription_id', stripeSubId)
            .maybeSingle();
          if (sub) {
            subscriptionId = sub.id;
            const { data: prior } = await supabase
              .from('refund_requests')
              .select('id, status')
              .eq('subscription_id', sub.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            priorRefundRequest = prior;
          }
        }

        const chargeCreatedAt = new Date(charge.created * 1000);
        const isWithinPolicyWindow =
          (Date.now() - chargeCreatedAt.getTime()) / (1000 * 60 * 60 * 24) <= 30;
        const hadPriorContact = Boolean(priorRefundRequest);

        const disputeRow = {
          subscription_id: subscriptionId,
          refund_request_id: priorRefundRequest?.id || null,
          stripe_dispute_id: dispute.id,
          stripe_charge_id: chargeId,
          reason: dispute.reason,
          amount_cents: dispute.amount,
          currency: dispute.currency,
          status: dispute.status,
          evidence_due_by: dispute.evidence_details?.due_by
            ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
            : null,
          is_within_policy_window: isWithinPolicyWindow,
          had_prior_contact: hadPriorContact,
        };

        const { error: insertErr } = await supabase.from('refund_disputes').insert(disputeRow);

        if (!insertErr) {
          const { alertChargebackCreated } = await import('@/lib/founder-alerts');
          await alertChargebackCreated({
            dispute: disputeRow,
            priorRefundRequest,
          });
        }
      }
      break;
    }
    case 'customer.updated':
      break;
    default:
      console.log(`[stripe-webhook] unhandled event type: ${event.type}`);
  }
}
