import { stripe } from './stripe.js';
import { getSupabaseAdmin } from './supabase-admin.js';

/**
 * Activate a client seat on a firm's subscription.
 */
export async function activateSeat({ firmId, companyId, seatTier }) {
  const supabase = getSupabaseAdmin();

  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('id, stripe_customer_id')
    .eq('subscriber_type', 'firm')
    .eq('subscriber_id', firmId)
    .in('status', ['active', 'trialing'])
    .maybeSingle();
  if (subErr) throw subErr;
  if (!sub) throw new Error(`No active subscription for firm ${firmId}`);

  const { data: item, error: itemErr } = await supabase
    .from('subscription_items')
    .select('id, stripe_subscription_item_id, metered')
    .eq('subscription_id', sub.id)
    .eq('tier_key', seatTier)
    .eq('metered', true)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!item) throw new Error(`No metered ${seatTier} item on subscription`);

  const { data: existing } = await supabase
    .from('subscription_seats')
    .select('id')
    .eq('subscription_item_id', item.id)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .maybeSingle();
  if (existing) return { seatId: existing.id };

  const { data: seat, error: seatErr } = await supabase
    .from('subscription_seats')
    .insert({
      subscription_item_id: item.id,
      company_id: companyId,
      status: 'active',
      activated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (seatErr) throw seatErr;

  const meterEvent =
    seatTier === 'firm_client_seat' ? 'firm_client_seat_used' : 'alacarte_seat_used';
  try {
    await stripe.billing.meterEvents.create({
      event_name: meterEvent,
      payload: {
        stripe_customer_id: sub.stripe_customer_id,
        value: '1',
      },
    });
  } catch (err) {
    console.error('[seat-management] meter event failed', err);
  }

  return { seatId: seat.id };
}

/**
 * Release a client seat.
 */
export async function releaseSeat({ seatId }) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('subscription_seats')
    .update({ status: 'released', released_at: new Date().toISOString() })
    .eq('id', seatId);
  if (error) throw error;
}
