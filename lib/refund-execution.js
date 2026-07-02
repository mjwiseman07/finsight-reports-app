// Executes an approved refund. Idempotent — safe to call multiple times on
// the same refund_request.id. Uses request.id as the Stripe idempotency key.

import { stripe } from './stripe.js';
import { getSupabaseAdmin } from './supabase-admin.js';

/**
 * Execute an approved refund.
 * @param {string} refundRequestId - UUID
 * @returns {Promise<{stripeRefundId: string, amountRefundedCents: number, subscriptionCanceled: boolean, alreadyCompleted?: boolean}>}
 */
export async function executeRefund(refundRequestId) {
  const supabase = getSupabaseAdmin();

  const { data: req, error: reqErr } = await supabase
    .from('refund_requests')
    .select('*, subscriptions:subscription_id ( id, stripe_subscription_id, stripe_customer_id )')
    .eq('id', refundRequestId)
    .single();
  if (reqErr) throw reqErr;
  if (!req) throw new Error(`Refund request ${refundRequestId} not found`);

  if (req.status === 'completed') {
    return {
      stripeRefundId: req.stripe_refund_id,
      amountRefundedCents: req.refundable_amount_cents,
      subscriptionCanceled: true,
      alreadyCompleted: true,
    };
  }

  if (req.status !== 'approved' && req.status !== 'executing') {
    throw new Error(
      `Refund request ${refundRequestId} is in status '${req.status}'; cannot execute (must be 'approved' or 'executing')`,
    );
  }

  if (!req.stripe_charge_id) {
    throw new Error(`Refund request ${refundRequestId} has no stripe_charge_id`);
  }

  if (req.refundable_amount_cents <= 0) {
    throw new Error(`Refund request ${refundRequestId} has non-positive refundable amount`);
  }

  const { error: transitionErr } = await supabase
    .from('refund_requests')
    .update({ status: 'executing' })
    .eq('id', req.id)
    .in('status', ['approved', 'executing']);
  if (transitionErr) throw transitionErr;

  await logAudit(supabase, req.id, 'system', 'refund-execution.executeRefund', 'execution.started', {
    stripe_charge_id: req.stripe_charge_id,
    refundable_amount_cents: req.refundable_amount_cents,
  });

  let refund;
  try {
    refund = await stripe.refunds.create(
      {
        charge: req.stripe_charge_id,
        amount: req.refundable_amount_cents,
        reason: 'requested_by_customer',
        metadata: {
          refund_request_id: req.id,
          subscription_id: req.subscription_id,
          path: req.path,
          eligibility_reason: req.eligibility_reason,
        },
      },
      { idempotencyKey: req.id },
    );
  } catch (stripeErr) {
    await supabase
      .from('refund_requests')
      .update({
        status: 'execution_failed',
        denial_reason: `Stripe refund failed: ${stripeErr.message}`,
      })
      .eq('id', req.id);

    await logAudit(supabase, req.id, 'stripe', stripeErr.code || 'unknown', 'execution.failed', {
      error_message: stripeErr.message,
      error_code: stripeErr.code || null,
    });
    throw stripeErr;
  }

  let subscriptionCanceled = false;
  const stripeSubId = req.subscriptions?.stripe_subscription_id;
  if (stripeSubId) {
    try {
      await stripe.subscriptions.cancel(stripeSubId, {
        prorate: false,
        invoice_now: false,
      });
      subscriptionCanceled = true;
    } catch (cancelErr) {
      await logAudit(supabase, req.id, 'stripe', cancelErr.code || 'unknown', 'subscription.cancel_failed', {
        error_message: cancelErr.message,
        stripe_subscription_id: stripeSubId,
      });
    }
  }

  const { error: completeErr } = await supabase
    .from('refund_requests')
    .update({
      status: 'completed',
      stripe_refund_id: refund.id,
      refund_completed_at: new Date().toISOString(),
    })
    .eq('id', req.id);
  if (completeErr) throw completeErr;

  await logAudit(supabase, req.id, 'stripe', refund.id, 'execution.completed', {
    stripe_refund_id: refund.id,
    amount: refund.amount,
    currency: refund.currency,
    subscription_canceled: subscriptionCanceled,
  });

  return {
    stripeRefundId: refund.id,
    amountRefundedCents: refund.amount,
    subscriptionCanceled,
    alreadyCompleted: false,
  };
}

async function logAudit(supabase, refundRequestId, actorType, actorIdentifier, eventType, payload) {
  await supabase.from('refund_audit_log').insert({
    refund_request_id: refundRequestId,
    actor_type: actorType,
    actor_identifier: actorIdentifier,
    event_type: eventType,
    payload: payload || {},
  });
}
