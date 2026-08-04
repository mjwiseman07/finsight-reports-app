import { stripe } from './stripe.js';
import { getSupabaseAdmin } from './supabase-admin.js';
import { LOOKUP_KEY_TO_TIER } from './product-tiers.js';
import { deriveEntitlementFromItems } from './entitlements.js';
import { writePilotSlotAndEventAtomic } from './pilot-lifecycle/pilot-slots-writer.ts';
import { derivePilotStatusFromStripe } from './pilot-lifecycle/status-mapping.ts';

const EXPECT_LIVEMODE = process.env.STRIPE_EXPECT_LIVEMODE === 'true';

/** Empty-content sha256 — used when Stripe provides no payload bytes to hash. */
const STRIPE_EVIDENCE_SHA256_PLACEHOLDER =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

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
 *
 * MEM-LIFECYCLE Block 4:
 * - Added livemode guard (C2). Callers should pass event.livemode in ctx.
 * - Added post-sync pilot_slot status reconciliation (C1).
 */
export async function syncSubscriptionFromStripe(stripeSubscriptionId, ctx = {}) {
  const supabase = getSupabaseAdmin();

  // --- C2: livemode guard when caller provides livemode context ---
  if (typeof ctx.livemode === 'boolean') {
    if (EXPECT_LIVEMODE && !ctx.livemode) {
      console.error('[subscription-sync] REJECTED test-mode event on live env', {
        stripeSubscriptionId,
      });
      return { skipped: 'livemode_mismatch_expected_live' };
    }
    if (!EXPECT_LIVEMODE && ctx.livemode) {
      console.error('[subscription-sync] REJECTED live-mode event on test env', {
        stripeSubscriptionId,
      });
      return { skipped: 'livemode_mismatch_expected_test' };
    }
  }

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

  // --- C1: reconcile pilot_slot.pilot_status via SSOT ---
  await reconcilePilotSlotStatus({
    supabase,
    stripeSubscriptionId: sub.id,
    stripeStatus: sub.status,
    stripeEventId: ctx.stripeEventId ?? null,
  });

  return { subscriptionId: subRow.id, subscriberType, subscriberId };
}

/**
 * Locate the pilot_slot(s) for a subscription and, if the derived pilot_status
 * differs from the DB, emit a state transition through the SSOT.
 */
async function reconcilePilotSlotStatus({
  supabase,
  stripeSubscriptionId,
  stripeStatus,
  stripeEventId,
}) {
  const { data: slots, error } = await supabase
    .from('pilot_slots')
    .select('id, firm_id, company_id, pilot_status, tier_key')
    .eq('stripe_subscription_id', stripeSubscriptionId);
  if (error) throw error;
  if (!slots || slots.length === 0) return;

  const desired = derivePilotStatusFromStripe(stripeStatus);

  for (const slot of slots) {
    if (slot.pilot_status === desired) continue;

    const subject = slot.firm_id
      ? { pilotSlotId: slot.id, firmId: slot.firm_id }
      : { pilotSlotId: slot.id, companyId: slot.company_id };

    await writePilotSlotAndEventAtomic(
      {
        slotOp: { op: 'update_status', id: slot.id, pilot_status: desired },
        eventKind: 'pilot.lifecycle.transition',
        subject,
        actor: { kind: 'system', userId: null, via: 'stripe-webhook' },
        fromStatus: slot.pilot_status,
        toStatus: desired,
        reasonCode: `stripe.status_change.${stripeStatus}`,
        reasonText: `Stripe status=${stripeStatus} → pilot_status=${desired}`,
        classificationHint: null,
        assertionsCovered: ['existence', 'rights_obligations'],
        evidenceRefs: stripeEventId
          ? [
              {
                kind: 'stripe_event',
                uri: `stripe://event/${stripeEventId}`,
                sha256: STRIPE_EVIDENCE_SHA256_PLACEHOLDER,
              },
            ]
          : [],
        payload: {
          stripe_subscription_id: stripeSubscriptionId,
          stripe_status: stripeStatus,
          stripe_event_id: stripeEventId,
          tier_key: slot.tier_key,
        },
        eventAt: new Date(),
      },
      supabase,
    );
  }
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
