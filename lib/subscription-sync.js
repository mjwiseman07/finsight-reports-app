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
 * Deterministic mapping from Stripe subscription.status → pilot_slots.pilot_status.
 *
 * Rules (research-locked, see /Critical_1_2_Webhook_Hardening_Research.md § Q2):
 *   - `active` / `trialing`  → pilot 'active' (paying or in trial, keep access on)
 *   - `past_due`             → pilot 'active' (Stripe explicitly documents grace here;
 *                                              revoke on `unpaid`, not `past_due`)
 *   - `unpaid` / `paused`    → pilot 'cancelled' (Stripe: revoke access on `unpaid`)
 *   - `canceled` / `incomplete_expired` → pilot 'cancelled' (terminal per Stripe)
 *   - `incomplete`           → return null (checkout in flight; do not overwrite)
 *
 * Spelling: `pilot_status='cancelled'` (double-L) matches the existing enum on
 * prod. Do not change to single-L.
 */
export const STRIPE_TO_PILOT_STATUS = Object.freeze({
  active: 'active',
  trialing: 'active',
  past_due: 'active',
  unpaid: 'cancelled',
  paused: 'cancelled',
  canceled: 'cancelled',
  incomplete_expired: 'cancelled',
  incomplete: null,
});

/**
 * Reconciles pilot_slots.pilot_status for a subscription.
 *
 * Called from:
 *   - syncSubscriptionFromStripe() at end of every sub upsert (legacy handler
 *     covers all non-engagement pilot subs on customer.subscription.*)
 *   - lib/entitlements/stripe-sync.ts handleStripeWebhook() for engagement
 *     subs (belt-and-suspenders alongside handleTcp1SubscriptionDeleted)
 *
 * Idempotent: safe to call repeatedly with the same status. No-op if the
 * pilot_slots row already matches the target status.
 *
 * @param {string} stripeSubscriptionId
 * @param {string} stripeStatus  Stripe subscription.status
 * @returns {Promise<{updated: boolean, targetStatus: string|null, previousStatus: string|null, rowsAffected: number}>}
 */
export async function reconcilePilotSlotStatus(stripeSubscriptionId, stripeStatus) {
  const supabase = getSupabaseAdmin();

  const targetStatus = STRIPE_TO_PILOT_STATUS[stripeStatus] ?? null;
  if (targetStatus === null) {
    // Either unmapped Stripe status or 'incomplete' (checkout in flight).
    // Leave pilot_slots untouched.
    return {
      updated: false,
      targetStatus: null,
      previousStatus: null,
      rowsAffected: 0,
    };
  }

  // Read current row(s) first to compute previousStatus for audit logging.
  // A pilot subscription is expected to map to exactly one pilot_slots row,
  // but the query is defensive against duplicates.
  const { data: existing, error: readErr } = await supabase
    .from('pilot_slots')
    .select('id, pilot_status')
    .eq('stripe_subscription_id', stripeSubscriptionId);
  if (readErr) throw readErr;

  if (!existing || existing.length === 0) {
    // No pilot_slots row for this subscription — not an error. This is
    // expected for engagement-tier subscriptions handled by D-Entitlements
    // (which write to engagement_addons, not pilot_slots).
    return {
      updated: false,
      targetStatus,
      previousStatus: null,
      rowsAffected: 0,
    };
  }

  const previousStatus = existing[0].pilot_status;
  if (previousStatus === targetStatus) {
    return {
      updated: false,
      targetStatus,
      previousStatus,
      rowsAffected: 0,
    };
  }

  const { error: updateErr, count } = await supabase
    .from('pilot_slots')
    .update({
      pilot_status: targetStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .select('id', { count: 'exact', head: true });
  if (updateErr) throw updateErr;

  console.log('[subscription-sync] reconcilePilotSlotStatus', {
    stripe_subscription_id: stripeSubscriptionId,
    stripe_status: stripeStatus,
    previous_pilot_status: previousStatus,
    target_pilot_status: targetStatus,
    rows_affected: count ?? existing.length,
  });

  return {
    updated: true,
    targetStatus,
    previousStatus,
    rowsAffected: count ?? existing.length,
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

  // Reconcile pilot_slots.pilot_status from the just-refreshed Stripe status.
  // This is the fix for CRITICAL #1 — the legacy path previously updated
  // `subscriptions` and `entitlements` but never touched `pilot_slots`, so a
  // canceled Stripe subscription left pilot_status='active' indefinitely.
  await reconcilePilotSlotStatus(sub.id, sub.status);

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
    .eq('role', 'owner_executive')
    .eq('status', 'active')
    .maybeSingle();
  if (companyMembership) {
    return { subscriberType: 'company', subscriberId: companyMembership.company_id };
  }

  throw new Error(`User ${user.id} owns neither a firm nor a company`);
}
