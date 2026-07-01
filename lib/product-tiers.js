/**
 * lib/product-tiers.js
 *
 * Advisacor Phase 1 tier catalog and Stripe price resolution.
 *
 * Design principle: lookup keys are the source of truth, not price IDs.
 * All Stripe prices in the Advisacor Sandbox were created with lookup keys
 * following the pattern `{tier}_{track}_{cadence}`, e.g. `owner_lite_std_mo`.
 *
 * This file:
 *   - Defines the 7-tier product catalog (name, description, entitlements,
 *     lookup keys for standard + pilot pricing).
 *   - Provides `resolvePriceIds()` to fetch live Stripe price IDs by lookup
 *     key at server start (or on-demand), then caches them in memory.
 *   - Provides helpers: `getTier(tierKey)`, `getPriceId(tierKey, track, cadence)`,
 *     `isMeteredTier(tierKey)`, `getEntitlements(tierKey)`.
 *
 * Substrate messaging (locked): every user-facing description references the
 * 15-vertical intelligence stack, patented organizational memory substrate,
 * and disclosure validation — the three pillars that differentiate Advisacor.
 */

import { stripe } from './stripe.js';

// ─── Tier catalog ──────────────────────────────────────────────────────────

/**
 * Tier definitions. Ordered by target persona and price point.
 *
 * Each tier declares:
 *   - key: internal identifier (matches product metadata tier_key in Stripe)
 *   - name: customer-facing product name
 *   - persona: who this is for
 *   - description: short marketing description (< 500 chars, matches Stripe)
 *   - metered: true if per-seat/per-unit billed (Firm Client Seat, À la carte)
 *   - lookupKeys: { standard: { monthly, yearly }, pilot: { monthly, yearly } }
 *   - entitlements: feature flags applied when subscription is active
 *   - attachable: true for add-on tiers (Industry-Premium)
 */
export const TIERS = {
  owner_lite: {
    key: 'owner_lite',
    name: 'Owner Lite',
    persona: 'Business owner — up to $2M revenue',
    description:
      'Full-featured Advisacor for owner-operators. 15-vertical intelligence, organizational memory, predictive alerts, and weekly briefings.',
    metered: false,
    attachable: false,
    lookupKeys: {
      standard: { monthly: 'owner_lite_std_mo', yearly: 'owner_lite_std_yr' },
      pilot:    { monthly: 'owner_lite_pilot_mo', yearly: 'owner_lite_pilot_yr' },
    },
    entitlements: {
      max_entities: 1,
      max_verticals: 1,
      pulse_intelligence: true,
      organizational_memory: true,
      predictive_alerts: true,
      weekly_briefings: true,
      disclosure_validation_full: false,
      cross_vertical_synthesis: false,
      firm_seats: 0,
    },
  },

  owner_pro: {
    key: 'owner_pro',
    name: 'Owner Pro',
    persona: 'Business owner — $2M–$10M revenue, multi-entity',
    description:
      'Advisacor for growing owner-operators. Multi-entity consolidation, 15-vertical intelligence, memory substrate, and advanced disclosure prep.',
    metered: false,
    attachable: false,
    lookupKeys: {
      standard: { monthly: 'owner_pro_std_mo', yearly: 'owner_pro_std_yr' },
      pilot:    { monthly: 'owner_pro_pilot_mo', yearly: 'owner_pro_pilot_yr' },
    },
    entitlements: {
      max_entities: 5,
      max_verticals: 3,
      pulse_intelligence: true,
      organizational_memory: true,
      predictive_alerts: true,
      weekly_briefings: true,
      disclosure_validation_full: true,
      cross_vertical_synthesis: false,
      firm_seats: 0,
    },
  },

  solo_bookkeeper: {
    key: 'solo_bookkeeper',
    name: 'Solo Bookkeeper',
    persona: 'Independent bookkeeper — up to 8 clients',
    description:
      'Advisacor for independent bookkeepers. Up to 8 client engagements, full Pulse stack per client, cross-client memory, and weekly briefings.',
    metered: false,
    attachable: false,
    lookupKeys: {
      standard: { monthly: 'solo_bk_std_mo', yearly: 'solo_bk_std_yr' },
      pilot:    { monthly: 'solo_bk_pilot_mo', yearly: 'solo_bk_pilot_yr' },
    },
    entitlements: {
      max_entities: 8,
      max_verticals: 15,
      pulse_intelligence: true,
      organizational_memory: true,
      predictive_alerts: true,
      weekly_briefings: true,
      disclosure_validation_full: false,
      cross_vertical_synthesis: false,
      firm_seats: 8,
    },
  },

  firm: {
    key: 'firm',
    name: 'Firm — Base',
    persona: 'Accounting firm — 9+ clients, multi-user',
    description:
      'Advisacor for accounting firms. Base includes multi-user workspace, firm-wide memory, and cross-client analytics. Add client seats separately.',
    metered: false,
    attachable: false,
    lookupKeys: {
      standard: { monthly: 'firm_base_std_mo', yearly: 'firm_base_std_yr' },
      pilot:    { monthly: 'firm_base_pilot_mo', yearly: 'firm_base_pilot_yr' },
    },
    entitlements: {
      max_entities: 0,  // clients added via firm_seat metered product
      max_verticals: 15,
      pulse_intelligence: true,
      organizational_memory: true,
      predictive_alerts: true,
      weekly_briefings: true,
      disclosure_validation_full: true,
      cross_vertical_synthesis: true,
      firm_seats: 0,  // metered, unlimited
      multi_user: true,
    },
  },

  firm_seat: {
    key: 'firm_seat',
    name: 'Firm — Client Seat',
    persona: 'Add-on to Firm Base',
    description:
      'Per-client seat for firms on the Firm tier. Each seat unlocks the full Pulse intelligence stack for one client engagement. Billed monthly, prorated to active seats.',
    metered: true,
    attachable: false,
    requiresBase: 'firm',
    meterName: 'firm_client_seat_usage',
    meterEvent: 'firm_client_seat_used',
    lookupKeys: {
      standard: { monthly: 'firm_seat_std_mo', yearly: 'firm_seat_std_yr' },
      pilot:    { monthly: 'firm_seat_pilot_mo', yearly: 'firm_seat_pilot_yr' },
    },
    entitlements: {
      per_seat_pulse: true,
      per_seat_memory: true,
      per_seat_briefings: true,
    },
  },

  client_seat_alacarte: {
    key: 'client_seat_alacarte',
    name: 'À la carte Client Seat',
    persona: 'Pay-as-you-grow firms — no tier commitment',
    description:
      'Per-client pricing for firms that prefer pay-as-you-grow over a tier subscription. Recommended: switch to Solo Bookkeeper at 4+ clients or Firm at 9+ clients for better unit economics.',
    metered: true,
    attachable: false,
    requiresBase: null,  // universal — attaches to any firm account
    meterName: 'alacarte_seat_usage',
    meterEvent: 'alacarte_seat_used',
    lookupKeys: {
      standard: { monthly: 'alacarte_seat_std_mo', yearly: 'alacarte_seat_std_yr' },
      pilot:    { monthly: 'alacarte_seat_pilot_mo', yearly: 'alacarte_seat_pilot_yr' },
    },
    entitlements: {
      per_seat_pulse: true,
      per_seat_memory: true,
      per_seat_briefings: true,
    },
  },

  industry_premium_addon: {
    key: 'industry_premium_addon',
    name: 'Industry-Premium Add-on',
    persona: 'Any tier — regulated verticals',
    description:
      'Deep-vertical intelligence for regulated industries — Healthcare, Fund Accounting, Construction, GovCon, Insurance, Banking. Unlocks full disclosure validation, cross-vertical synthesis, and audit-readiness packs.',
    metered: false,
    attachable: true,  // ← add-on, not a standalone tier
    attachableTo: ['owner_lite', 'owner_pro', 'solo_bookkeeper', 'firm', 'enterprise_firm'],
    eligibleVerticals: ['healthcare', 'fund_accounting', 'construction', 'govcon', 'insurance', 'banking'],
    lookupKeys: {
      standard: { monthly: 'industry_premium_std_mo', yearly: 'industry_premium_std_yr' },
      pilot:    { monthly: 'industry_premium_pilot_mo', yearly: 'industry_premium_pilot_yr' },
    },
    entitlements: {
      disclosure_validation_full: true,
      cross_vertical_synthesis: true,
      vertical_kpi_premium: true,
      vertical_benchmark_library: true,
      vertical_audit_readiness: true,
    },
  },
};

// ─── Price ID cache ────────────────────────────────────────────────────────

/**
 * In-memory cache: lookup_key -> Stripe price ID.
 * Populated by resolvePriceIds() on first call, then reused for process lifetime.
 * If Stripe prices are ever archived/replaced, restart the server or call
 * resolvePriceIds({ force: true }) to refresh.
 */
let _priceIdCache = null;

/**
 * Fetch all Stripe prices by lookup_key in a single API call.
 * Returns { lookup_key: price_id } map.
 *
 * @param {Object} [opts]
 * @param {boolean} [opts.force=false] — refetch even if cache is populated
 * @returns {Promise<Object>} lookup_key -> price_id
 */
export async function resolvePriceIds({ force = false } = {}) {
  if (_priceIdCache && !force) return _priceIdCache;

  // Collect every lookup key referenced by any tier (standard + pilot,
  // monthly + yearly). Total for Phase 1: 7 tiers × 2 tracks × 2 cadences = 28.
  const allLookupKeys = [];
  for (const tier of Object.values(TIERS)) {
    for (const track of Object.values(tier.lookupKeys)) {
      for (const cadence of Object.values(track)) {
        allLookupKeys.push(cadence);
      }
    }
  }

  // Stripe's prices.list supports up to 10 lookup_keys per request.
  // Chunk into batches of 10.
  const cache = {};
  for (let i = 0; i < allLookupKeys.length; i += 10) {
    const batch = allLookupKeys.slice(i, i + 10);
    const result = await stripe.prices.list({
      lookup_keys: batch,
      active: true,
      limit: 10,
      expand: ['data.product'],
    });
    for (const price of result.data) {
      if (price.lookup_key) {
        cache[price.lookup_key] = price.id;
      }
    }
  }

  // Warn (do not throw) if any expected lookup key is missing — this catches
  // typos or archived prices without breaking dev/local runs.
  const missing = allLookupKeys.filter(k => !cache[k]);
  if (missing.length > 0) {
    console.warn(
      '[product-tiers] Missing Stripe prices for lookup keys:',
      missing.join(', '),
      '\nThese tiers will return null price IDs until the Stripe prices are created.'
    );
  }

  _priceIdCache = cache;
  return cache;
}

// ─── Public helpers ────────────────────────────────────────────────────────

/**
 * Get a tier definition by key.
 * @param {string} tierKey
 * @returns {Object|null}
 */
export function getTier(tierKey) {
  return TIERS[tierKey] || null;
}

/**
 * Get all tiers as an array.
 * @returns {Array<Object>}
 */
export function getAllTiers() {
  return Object.values(TIERS);
}

/**
 * Get a Stripe price ID for a specific tier/track/cadence combination.
 * Resolves via lookup key + cache.
 *
 * @param {string} tierKey — e.g. 'owner_lite'
 * @param {string} track — 'standard' or 'pilot'
 * @param {string} cadence — 'monthly' or 'yearly'
 * @returns {Promise<string|null>} Stripe price ID or null if not resolvable
 */
export async function getPriceId(tierKey, track, cadence) {
  const tier = TIERS[tierKey];
  if (!tier) return null;
  const lookupKey = tier.lookupKeys?.[track]?.[cadence];
  if (!lookupKey) return null;
  const cache = await resolvePriceIds();
  return cache[lookupKey] || null;
}

/**
 * Get a Stripe price ID directly by lookup key (bypass tier lookup).
 * Useful for the à la carte SKU or add-on scenarios where the caller knows
 * the exact key.
 *
 * @param {string} lookupKey
 * @returns {Promise<string|null>}
 */
export async function getPriceIdByLookupKey(lookupKey) {
  const cache = await resolvePriceIds();
  return cache[lookupKey] || null;
}

/**
 * Check if a tier is metered (per-unit billing).
 * @param {string} tierKey
 * @returns {boolean}
 */
export function isMeteredTier(tierKey) {
  return TIERS[tierKey]?.metered === true;
}

/**
 * Check if a tier is an add-on (attaches to a base subscription).
 * @param {string} tierKey
 * @returns {boolean}
 */
export function isAddonTier(tierKey) {
  return TIERS[tierKey]?.attachable === true;
}

/**
 * Get the entitlement flags for a tier.
 * These are the feature toggles applied when a customer's subscription is active.
 *
 * @param {string} tierKey
 * @returns {Object}
 */
export function getEntitlements(tierKey) {
  return TIERS[tierKey]?.entitlements || {};
}

/**
 * Given an array of active tier keys (base tier + any add-ons), merge their
 * entitlements into a single flat object. Later tiers in the array override
 * earlier ones (add-ons win over base).
 *
 * @param {Array<string>} activeTierKeys
 * @returns {Object} merged entitlements
 */
export function mergeEntitlements(activeTierKeys) {
  const merged = {};
  for (const key of activeTierKeys) {
    Object.assign(merged, getEntitlements(key));
  }
  return merged;
}

/**
 * Diagnostic: return the full price cache. Call after resolvePriceIds()
 * to inspect what got loaded.
 */
export function _debugPriceCache() {
  return _priceIdCache;
}
