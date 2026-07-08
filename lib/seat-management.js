import crypto from 'node:crypto';
import { stripe } from './stripe.js';
import { getSupabaseAdmin } from './supabase-admin.js';

/**
 * Build a deterministic meter-event identifier for (item, company, period).
 * Same inputs → same identifier → Stripe dedupes within 24h window.
 * Combined with the uq_subscription_seats_active_company partial unique index,
 * we get exactly-once billing per (subscription_item, company, billing_period).
 */
function buildMeterEventIdentifier({ subscriptionItemId, companyId, periodStartIso }) {
  const material = `${subscriptionItemId}|${companyId}|${periodStartIso}`;
  const hash = crypto.createHash('sha1').update(material).digest('hex');
  return `seat-${hash}`;
}

/**
 * Activate a client seat on a firm's subscription.
 * Idempotent: safe to call repeatedly for the same (firmId, companyId).
 */
export async function activateSeat({ firmId, companyId, seatTier }) {
  const supabase = getSupabaseAdmin();

  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('id, stripe_customer_id, current_period_start')
    .eq('subscriber_type', 'firm')
    .eq('subscriber_id', firmId)
    .in('status', ['active', 'trialing'])
    .maybeSingle();
  if (subErr) throw subErr;
  if (!sub) throw new Error(`No active subscription for firm ${firmId}`);
  if (!sub.current_period_start) {
    throw new Error(`Subscription ${sub.id} missing current_period_start — refuse to emit meter event without a period anchor`);
  }

  const { data: item, error: itemErr } = await supabase
    .from('subscription_items')
    .select('id, stripe_subscription_item_id, metered')
    .eq('subscription_id', sub.id)
    .eq('tier_key', seatTier)
    .eq('metered', true)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!item) throw new Error(`No metered ${seatTier} item on subscription`);

  const periodStartIso = new Date(sub.current_period_start).toISOString();
  const identifier = buildMeterEventIdentifier({
    subscriptionItemId: item.id,
    companyId,
    periodStartIso,
  });

  // App-side lifecycle guard #1: if an active seat already exists this period, no-op.
  // uq_subscription_seats_active_company enforces this at the DB layer.
  const { data: existing } = await supabase
    .from('subscription_seats')
    .select('id, billing_period_anchor, stripe_usage_event_id')
    .eq('subscription_item_id', item.id)
    .eq('company_id', companyId)
    .eq('active', true)
    .maybeSingle();
  if (existing) {
    return { seatId: existing.id, meterEventEmitted: false, reason: 'seat_already_active' };
  }

  // Insert. uq_subscription_seats_active_company will 23505 if a race inserts a duplicate.
  const { data: seat, error: seatErr } = await supabase
    .from('subscription_seats')
    .insert({
      subscription_item_id: item.id,
      firm_id: firmId,
      company_id: companyId,
      active: true,
      activated_at: new Date().toISOString(),
      billing_period_anchor: periodStartIso,
      stripe_usage_event_id: identifier,
    })
    .select()
    .single();
  if (seatErr) {
    // 23505 = unique_violation on uq_subscription_seats_active_company.
    if (seatErr.code === '23505') {
      const { data: winner } = await supabase
        .from('subscription_seats')
        .select('id')
        .eq('subscription_item_id', item.id)
        .eq('company_id', companyId)
        .eq('active', true)
        .maybeSingle();
      if (winner) return { seatId: winner.id, meterEventEmitted: false, reason: 'race_lost_to_winner' };
    }
    throw seatErr;
  }

  const meterEvent =
    seatTier === 'firm_client_seat' ? 'firm_client_seat_used' : 'alacarte_seat_used';

  // Stripe-side dedup lock: identifier is deterministic across retries.
  try {
    await stripe.billing.meterEvents.create({
      event_name: meterEvent,
      identifier,
      payload: {
        stripe_customer_id: sub.stripe_customer_id,
        value: '1',
      },
    });
    return { seatId: seat.id, meterEventEmitted: true, identifier };
  } catch (err) {
    const isDupIdentifier =
      err?.raw?.code === 'meter_event_already_exists' ||
      /already exists|duplicate/i.test(err?.message || '');
    if (isDupIdentifier) {
      return { seatId: seat.id, meterEventEmitted: false, reason: 'stripe_dedup' };
    }
    console.error('[seat-management] meter event failed (non-dup)', {
      identifier,
      code: err?.raw?.code,
      message: err?.message,
    });
    return { seatId: seat.id, meterEventEmitted: false, reason: 'stripe_error' };
  }
}

/**
 * Release a client seat.
 * Does NOT emit a Stripe event — releasing does not un-bill the current period.
 * If the customer re-activates the same (item, company) in the same period, activateSeat()
 * will detect the release (no active row exists), create a new active row, but the
 * deterministic identifier still matches → Stripe dedupes → no double bill.
 */
export async function releaseSeat({ seatId }) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('subscription_seats')
    .update({ active: false, deactivated_at: new Date().toISOString() })
    .eq('id', seatId);
  if (error) throw error;
}
