import { stripe } from './stripe.js';
import { getSupabaseAdmin } from './supabase-admin.js';
import { LOOKUP_KEY_TO_TIER } from './product-tiers.js';
import { deriveEntitlementFromItems } from './entitlements.js';

const toIso = (epochSeconds) =>
  epochSeconds ? new Date(epochSeconds * 1000).toISOString() : null;

/**
 * Stripe removed `current_period_start` / `current_period_end` from the
 * Subscription object in API version 2025-06-30.basil — the billing period now
 * lives on each subscription item. lib/stripe.js pins 2026-04-22.dahlia, so
 * reading them off `sub` yields undefined and every synced row landed with a
 * NULL period. That in turn hard-fails activateSeat(), which refuses to emit a
 * meter event without a period anchor.
 *
 * Items on one subscription share a period unless they were explicitly given
 * separate billing anchors, so the first item carrying a period is the anchor.
 * The `sub`-level fallback keeps replays of pre-basil events working.
 */
function resolveBillingPeriod(sub) {
  const item = (sub.items?.data ?? []).find(
    (candidate) => candidate?.current_period_start || candidate?.current_period_end,
  );
  return {
    start: toIso(item?.current_period_start ?? sub.current_period_start),
    end: toIso(item?.current_period_end ?? sub.current_period_end),
  };
}

/**
 * Sync a Stripe subscription into our 5-table domain.
 */
export async function syncSubscriptionFromStripe(stripeSubscriptionId) {
  const supabase = getSupabaseAdmin();

  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
    expand: ['items.data.price'],
  });

  const stripeCustomerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  if (!stripeCustomerId) {
    throw new Error(`Subscription ${stripeSubscriptionId} has no customer`);
  }

  const { subscriberType, subscriberId } = await resolveSubscriber(stripeCustomerId);
  const billingPeriod = resolveBillingPeriod(sub);

  const { data: subRow, error: subErr } = await supabase
    .from('subscriptions')
    .upsert(
      {
        subscriber_type: subscriberType,
        subscriber_id: subscriberId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: sub.id,
        status: sub.status,
        current_period_start: billingPeriod.start,
        current_period_end: billingPeriod.end,
        trial_end: toIso(sub.trial_end),
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        canceled_at: toIso(sub.canceled_at),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'stripe_subscription_id' },
    )
    .select()
    .single();
  if (subErr) throw subErr;

  const itemRows = [];
  for (const item of sub.items.data) {
    const lookupKey = item.price.lookup_key;
    const tierMeta = LOOKUP_KEY_TO_TIER[lookupKey];
    if (!tierMeta) {
      console.warn(`[subscription-sync] Unknown lookup_key: ${lookupKey}`);
      continue;
    }
    itemRows.push({
      subscription_id: subRow.id,
      stripe_subscription_item_id: item.id,
      stripe_price_id: item.price.id,
      lookup_key: lookupKey,
      tier_key: tierMeta.tier_key,
      track: tierMeta.track,
      cadence: tierMeta.cadence,
      quantity: item.quantity ?? 1,
      metered: item.price.recurring?.usage_type === 'metered',
      is_addon: tierMeta.tier_key === 'industry_premium',
      updated_at: new Date().toISOString(),
    });
  }

  if (itemRows.length > 0) {
    const { error: itemErr } = await supabase
      .from('subscription_items')
      .upsert(itemRows, { onConflict: 'stripe_subscription_item_id' });
    if (itemErr) throw itemErr;
  }

  const activeItemIds = itemRows.map((r) => r.stripe_subscription_item_id);
  const { data: existingItems, error: existErr } = await supabase
    .from('subscription_items')
    .select('id, stripe_subscription_item_id')
    .eq('subscription_id', subRow.id);
  if (existErr) throw existErr;

  const staleIds = (existingItems ?? [])
    .filter((row) => !activeItemIds.includes(row.stripe_subscription_item_id))
    .map((row) => row.id);
  if (staleIds.length > 0) {
    const { error: delErr } = await supabase.from('subscription_items').delete().in('id', staleIds);
    if (delErr) throw delErr;
  }

  const { data: freshItems, error: freshErr } = await supabase
    .from('subscription_items')
    .select('*')
    .eq('subscription_id', subRow.id);
  if (freshErr) throw freshErr;

  const { activeTierKeys, flags, seatLimit } = deriveEntitlementFromItems(freshItems ?? []);
  const { error: entErr } = await supabase.from('entitlements').upsert(
    {
      subscriber_type: subscriberType,
      subscriber_id: subscriberId,
      active_tier_keys: activeTierKeys,
      flags,
      seat_limit: seatLimit,
      status: sub.status,
      // entitlements tracks freshness as computed_at; it has no updated_at
      // column, and the default only fires on insert, not on upsert-update.
      computed_at: new Date().toISOString(),
    },
    { onConflict: 'subscriber_type,subscriber_id' },
  );
  if (entErr) throw entErr;

  return { subscriptionId: subRow.id, subscriberType, subscriberId };
}

async function resolveSubscriber(stripeCustomerId) {
  const supabase = getSupabaseAdmin();
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();
  if (userErr) throw userErr;
  if (!user) {
    throw new Error(`No user linked to stripe_customer_id ${stripeCustomerId}`);
  }

  const { data: firm } = await supabase
    .from('firms')
    .select('id')
    .eq('owner_user_id', user.id)
    .maybeSingle();
  if (firm) return { subscriberType: 'firm', subscriberId: firm.id };

  const { data: companyMembership } = await supabase
    .from('company_users')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .eq('status', 'active')
    .maybeSingle();
  if (companyMembership) {
    return { subscriberType: 'company', subscriberId: companyMembership.company_id };
  }

  throw new Error(`User ${user.id} owns neither a firm nor a company`);
}
