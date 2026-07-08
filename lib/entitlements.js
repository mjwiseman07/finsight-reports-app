import { getSupabaseAdmin } from './supabase-admin.js';
import { LOOKUP_KEY_TO_TIER } from './product-tiers.js';

/**
 * Get the entitlement row for a subscriber (firm or company).
 * Returns null if no row exists yet (treat as no active subscription).
 */
export async function getEntitlements(subscriberType, subscriberId) {
  if (!['firm', 'company'].includes(subscriberType)) {
    throw new Error(`Invalid subscriber_type: ${subscriberType}`);
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('entitlements')
    .select('*')
    .eq('subscriber_type', subscriberType)
    .eq('subscriber_id', subscriberId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Check if a subscriber has an active tier by tier_key.
 * Considers status ('active' | 'trialing') and active_tier_keys array.
 */
export async function hasTier(subscriberType, subscriberId, tierKey) {
  const ent = await getEntitlements(subscriberType, subscriberId);
  if (!ent) return false;
  if (!['active', 'trialing'].includes(ent.status)) return false;
  return Array.isArray(ent.active_tier_keys) && ent.active_tier_keys.includes(tierKey);
}

/**
 * Check a boolean flag in entitlements.flags jsonb.
 */
export async function hasFlag(subscriberType, subscriberId, flagKey) {
  const ent = await getEntitlements(subscriberType, subscriberId);
  if (!ent) return false;
  if (!['active', 'trialing'].includes(ent.status)) return false;
  return Boolean(ent.flags && ent.flags[flagKey] === true);
}

/**
 * Return remaining seat capacity for a firm subscription.
 */
export async function getSeatCapacity(firmId) {
  const supabase = getSupabaseAdmin();
  const ent = await getEntitlements('firm', firmId);
  if (!ent) return null;

  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('subscriber_type', 'firm')
    .eq('subscriber_id', firmId)
    .in('status', ['active', 'trialing'])
    .maybeSingle();
  if (subErr) throw subErr;
  if (!sub) return null;

  const { data: meteredItems, error: itemsErr } = await supabase
    .from('subscription_items')
    .select('id')
    .eq('subscription_id', sub.id)
    .eq('metered', true);
  if (itemsErr) throw itemsErr;

  const itemIds = meteredItems?.map((r) => r.id) ?? [];
  if (itemIds.length === 0) {
    const limit = ent.seat_limit;
    return { limit, used: 0, remaining: limit === null ? null : limit };
  }

  const { count, error: countErr } = await supabase
    .from('subscription_seats')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .in('subscription_item_id', itemIds);
  if (countErr) throw countErr;

  const limit = ent.seat_limit;
  const used = count ?? 0;
  const remaining = limit === null ? null : Math.max(0, limit - used);
  return { limit, used, remaining };
}

/**
 * Derive entitlement cache fields from subscription_items rows.
 */
export function deriveEntitlementFromItems(items) {
  const tierKeys = [];
  const flags = {};
  let seatLimit = 1;
  let hasMeteredSeats = false;

  for (const item of items) {
    const tierMeta = LOOKUP_KEY_TO_TIER[item.lookup_key];
    if (!tierMeta) continue;
    if (!item.is_addon) {
      if (!tierKeys.includes(tierMeta.tier_key)) tierKeys.push(tierMeta.tier_key);
    }
    if (tierMeta.flags) {
      Object.assign(flags, tierMeta.flags);
    }
    if (tierMeta.tier_key === 'industry_premium') {
      flags.industry_premium = true;
    }
    if (item.metered) {
      hasMeteredSeats = true;
    }
    if (tierMeta.tier_key === 'firm_base') {
      flags.firm_dashboard = true;
      flags.multi_client = true;
    }
  }

  if (hasMeteredSeats) seatLimit = null;

  return { activeTierKeys: tierKeys, flags, seatLimit };
}

export {
  resolveEntitlementsForFirm,
  resolveEntitlementsForCompany,
  resolveEntitlementsForSubject,
  resolveEntitlementsForFirmClient,
  canAddClientForFirm,
  canAddClient,
} from './entitlements.ts';
