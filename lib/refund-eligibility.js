// Pure eligibility computation. Reads Stripe + Supabase. Writes nothing.
// Returns { eligible, path, reason, metadata } describing what SHOULD happen.
// Callers decide whether to act (Pulse handler, founder UI, admin scripts).

import { stripe } from './stripe.js';
import { getSupabaseAdmin } from './supabase-admin.js';
import { LOOKUP_KEY_TO_TIER } from './product-tiers.js';
import {
  REFUND_WINDOW_DAYS,
  REFUND_PATHS,
  TIER_TO_INWINDOW_PATH,
  METERED_LOOKUP_KEY_PREFIXES,
} from './refund-config.js';

/**
 * Check refund eligibility for a subscription.
 * Does not write to any table. Does not call Stripe write endpoints.
 *
 * @param {string} subscriptionId - Supabase subscriptions.id (UUID)
 * @param {Object} [options]
 * @param {Date} [options.asOf] - Reference date for window computation. Defaults to now.
 * @returns {Promise<Object>}
 */
export async function checkRefundEligibility(subscriptionId, options = {}) {
  const asOf = options.asOf || new Date();
  const supabase = getSupabaseAdmin();

  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('id, stripe_subscription_id, stripe_customer_id, status, first_paid_charge_at, current_period_start')
    .eq('id', subscriptionId)
    .single();
  if (subErr) throw subErr;
  if (!sub) throw new Error(`Subscription ${subscriptionId} not found`);

  const { data: items, error: itemsErr } = await supabase
    .from('subscription_items')
    .select('lookup_key, tier_key, track, metered')
    .eq('subscription_id', sub.id);
  if (itemsErr) throw itemsErr;

  const tier = deriveTier(items || []);

  const { data: existing } = await supabase
    .from('refund_requests')
    .select('id, status')
    .eq('subscription_id', sub.id)
    .in('status', ['submitted', 'pending_review', 'approved', 'executing', 'completed'])
    .maybeSingle();

  if (existing && existing.status === 'completed') {
    return {
      eligible: false,
      path: REFUND_PATHS.C,
      reason: 'already_refunded',
      humanReason: 'This subscription has already received a refund under this policy.',
      metadata: emptyAmountMetadata(sub, tier),
    };
  }

  if (existing) {
    return {
      eligible: false,
      path: REFUND_PATHS.C,
      reason: 'request_already_active',
      humanReason: `An active refund request already exists (status: ${existing.status}).`,
      metadata: emptyAmountMetadata(sub, tier),
    };
  }

  const firstPaidAt = sub.first_paid_charge_at ? new Date(sub.first_paid_charge_at) : null;
  if (!firstPaidAt) {
    return {
      eligible: false,
      path: REFUND_PATHS.C,
      reason: 'no_paid_charge',
      humanReason: 'No successful charge has been recorded on this subscription.',
      metadata: emptyAmountMetadata(sub, tier),
    };
  }

  const daysSince = Math.floor((asOf.getTime() - firstPaidAt.getTime()) / (1000 * 60 * 60 * 24));

  const invoiceInfo = await findFirstPaidInvoice(sub.stripe_customer_id, sub.stripe_subscription_id);
  const requestedAmountCents = invoiceInfo?.subscriptionAmountCents || 0;
  const meteredDeductionCents = invoiceInfo?.meteredAmountCents || 0;
  const refundableAmountCents = Math.max(0, requestedAmountCents - meteredDeductionCents);

  const commonMetadata = {
    daysSinceFirstCharge: daysSince,
    firstPaidChargeAt: firstPaidAt.toISOString(),
    requestedAmountCents,
    meteredDeductionCents,
    refundableAmountCents,
    stripeInvoiceId: invoiceInfo?.invoiceId || null,
    stripeChargeId: invoiceInfo?.chargeId || null,
    tier,
  };

  if (daysSince > REFUND_WINDOW_DAYS) {
    return {
      eligible: false,
      path: REFUND_PATHS.C,
      reason: 'outside_window',
      humanReason: `Request received ${daysSince} days after first charge (window: ${REFUND_WINDOW_DAYS} days).`,
      metadata: commonMetadata,
    };
  }

  if (refundableAmountCents <= 0) {
    return {
      eligible: false,
      path: REFUND_PATHS.C,
      reason: 'no_refundable_amount',
      humanReason: `All charges on the first billing cycle are non-refundable metered usage (${(meteredDeductionCents / 100).toFixed(2)} of ${(requestedAmountCents / 100).toFixed(2)}).`,
      metadata: commonMetadata,
    };
  }

  const path = TIER_TO_INWINDOW_PATH[tier] || REFUND_PATHS.B;
  return {
    eligible: true,
    path,
    reason: path === REFUND_PATHS.A ? 'within_window_pilot_auto' : 'within_window_standard_review',
    humanReason:
      path === REFUND_PATHS.A
        ? `Pilot subscription within ${REFUND_WINDOW_DAYS}-day window (day ${daysSince}). Auto-approved.`
        : `Standard subscription within ${REFUND_WINDOW_DAYS}-day window (day ${daysSince}). Founder review required.`,
    metadata: commonMetadata,
  };
}

function emptyAmountMetadata(sub, tier) {
  return {
    daysSinceFirstCharge: null,
    firstPaidChargeAt: sub.first_paid_charge_at,
    requestedAmountCents: 0,
    meteredDeductionCents: 0,
    refundableAmountCents: 0,
    stripeInvoiceId: null,
    stripeChargeId: null,
    tier,
  };
}

function deriveTier(items) {
  const nonMetered = items.filter((i) => !i.metered);
  const withTrack = nonMetered.find((i) => i.track === 'pilot' || i.track === 'standard');
  if (withTrack) return withTrack.track;

  for (const item of nonMetered) {
    const meta = LOOKUP_KEY_TO_TIER[item.lookup_key];
    if (meta?.track) return meta.track;
  }

  return 'unknown';
}

async function findFirstPaidInvoice(stripeCustomerId, stripeSubscriptionId) {
  const invoices = await stripe.invoices.list({
    customer: stripeCustomerId,
    subscription: stripeSubscriptionId,
    status: 'paid',
    limit: 100,
  });

  if (!invoices.data.length) return null;

  const sorted = invoices.data.sort((a, b) => (a.created || 0) - (b.created || 0));
  const first = sorted[0];

  let subscriptionAmountCents = 0;
  let meteredAmountCents = 0;

  for (const line of first.lines?.data || []) {
    const lookupKey = line.price?.lookup_key || '';
    const isMetered =
      line.price?.recurring?.usage_type === 'metered' ||
      METERED_LOOKUP_KEY_PREFIXES.some((prefix) => lookupKey.startsWith(prefix));
    if (isMetered) {
      meteredAmountCents += line.amount || 0;
    } else {
      subscriptionAmountCents += line.amount || 0;
    }
  }

  if (subscriptionAmountCents === 0 && meteredAmountCents === 0) {
    subscriptionAmountCents = first.amount_paid || 0;
  }

  return {
    invoiceId: first.id,
    chargeId: typeof first.charge === 'string' ? first.charge : first.charge?.id || null,
    subscriptionAmountCents,
    meteredAmountCents,
  };
}
