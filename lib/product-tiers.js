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

let _stripeClient = null;

async function getStripe() {
  if (!_stripeClient) {
    const { stripe } = await import('./stripe.js');
    _stripeClient = stripe;
  }
  return _stripeClient;
}

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
    persona: 'Independent bookkeeper — up to 10 QBO clients',
    description:
      'Advisacor for independent bookkeepers on QuickBooks Online. Flat monthly or per-client à la carte. Full Pulse stack per client, cross-client memory, weekly briefings, and disclosure prep. Xero coming soon.',
    metered: false,
    attachable: false,
    lookupKeys: {
      flat: {
        standard: { monthly: 'solo_bk_std_mo', yearly: 'solo_bk_std_yr' },
        pilot:    { monthly: 'solo_bk_pilot_mo', yearly: 'solo_bk_pilot_yr' },
      },
      perClient: {
        standard: { monthly: 'client_seat_std_mo' },
        pilot:    { monthly: 'client_seat_pilot_mo' },
      },
    },
    erpSupport: {
      quickbooks: 'live',
      xero: 'coming_soon',
    },
    entitlements: {
      max_entities: 10,
      max_verticals: 15,
      pulse_intelligence: true,
      organizational_memory: true,
      predictive_alerts: true,
      weekly_briefings: true,
      disclosure_validation_full: true,
      cross_vertical_synthesis: false,
      firm_seats: 10,
      complimentary_client_cap: 3,
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
    name: 'Client Seat (à la carte)',
    persona: 'Per-client seat for Solo Bookkeeper on the à la carte plan',
    description:
      'Per-client seat, $99/mo per active client. Billed monthly, metered by client-count at cycle end. Attaches to Solo Bookkeeper only.',
    metered: true,
    attachable: true,
    attachableTo: ['solo_bookkeeper'],
    lookupKeys: {
      standard: { monthly: 'client_seat_std_mo' },
      pilot:    { monthly: 'client_seat_pilot_mo' },
    },
    erpSupport: {
      quickbooks: 'live',
      xero: 'coming_soon',
    },
    entitlements: {},
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

/** Recursively collect string lookup keys from nested tier.lookupKeys shapes. */
function flattenLookupKeys(lookupKeys) {
  const out = [];
  if (!lookupKeys || typeof lookupKeys !== 'object') return out;
  for (const value of Object.values(lookupKeys)) {
    if (typeof value === 'string') out.push(value);
    else if (value && typeof value === 'object') out.push(...flattenLookupKeys(value));
  }
  return out;
}

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
    allLookupKeys.push(...flattenLookupKeys(tier.lookupKeys));
  }

  // Stripe's prices.list supports up to 10 lookup_keys per request.
  // Chunk into batches of 10.
  const cache = {};
  for (let i = 0; i < allLookupKeys.length; i += 10) {
    const batch = allLookupKeys.slice(i, i + 10);
    const stripe = await getStripe();
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
export async function getPriceId(tierKey, track, cadence, structure = null) {
  const tier = TIERS[tierKey];
  if (!tier) return null;
  let lookupKey;
  if (structure && tier.lookupKeys?.[structure]) {
    lookupKey = tier.lookupKeys[structure]?.[track]?.[cadence];
  } else {
    lookupKey = tier.lookupKeys?.[track]?.[cadence];
  }
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

// ─── Subscription sync / entitlement enforcement (Phase 1 Track C) ─────────

/** Catalog keys → subscription_items.tier_key values used in Supabase. */
const SUBSCRIPTION_TIER_KEYS = {
  owner_lite: 'owner_lite',
  owner_pro: 'owner_pro',
  solo_bookkeeper: 'solo_bookkeeper',
  firm: 'firm_base',
  firm_seat: 'firm_client_seat',
  client_seat_alacarte: 'alacarte_seat',
  industry_premium_addon: 'industry_premium',
};

/** Feature flags merged into entitlements.flags by deriveEntitlementFromItems. */
const TIER_FLAGS = {
  owner_lite: { core_close: true, disclosure_validation: false, memory: 'basic' },
  owner_pro: { core_close: true, disclosure_validation: true, memory: 'standard' },
  solo_bookkeeper: { core_close: true, disclosure_validation: true, memory: 'standard' },
  firm: { core_close: true, disclosure_validation: true, memory: 'standard', firm_dashboard: true, multi_client: true },
  firm_seat: {},
  client_seat_alacarte: {},
  industry_premium_addon: { industry_premium: true },
};

function buildLookupKeyToTier() {
  const map = {};
  for (const [catalogKey, tier] of Object.entries(TIERS)) {
    const walk = (node, ctx) => {
      if (!node || typeof node !== 'object') return;
      for (const [k, v] of Object.entries(node)) {
        if (typeof v === 'string') {
          // Resolve track/cadence from ctx (3-level nested) or from the leaf
          // key k (legacy 2-level: standard→monthly). Bug 1 was the object-
          // branch `...ctx` spread erasing newly-set values — not this fallback.
          const track = ctx.track ?? (k === 'standard' || k === 'pilot' ? k : undefined);
          const cadence = ctx.cadence ?? (k === 'monthly' || k === 'yearly' ? k : undefined);
          if (track === undefined || cadence === undefined) {
            throw new Error(
              `[product-tiers] LOOKUP_KEY_TO_TIER: lookupKey "${v}" reached string node without track+cadence resolved. catalog=${catalogKey} ctx=${JSON.stringify(ctx)} k=${k}`
            );
          }
          if (!map[v]) {
            map[v] = {
              tier_key: SUBSCRIPTION_TIER_KEYS[catalogKey] ?? catalogKey,
              track,
              cadence,
              structure: ctx.structure ?? null,
              flags: TIER_FLAGS[catalogKey] ?? {},
            };
          }
        } else {
          // Derive the NEXT ctx by extending the current one. Never spread
          // ctx AFTER the new assignments — that erases the new values when
          // the parent ctx has these keys as undefined (Bug 1).
          const nextCtx = {
            structure: k === 'flat' || k === 'perClient' ? k : ctx.structure,
            track:     k === 'standard' || k === 'pilot' ? k : ctx.track,
            cadence:   k === 'monthly' || k === 'yearly' ? k : ctx.cadence,
          };
          walk(v, nextCtx);
        }
      }
    };
    walk(tier.lookupKeys, {});
  }
  return map;
}

/** Alias for subscription-sync / entitlements imports. */
export const PRODUCT_TIERS = TIERS;

/** lookup_key → { tier_key, track, cadence, flags } for all 28 Phase 1 prices. */
export const LOOKUP_KEY_TO_TIER = buildLookupKeyToTier();

// --- Legacy Pulse tier catalog (backward compat for dashboard/checkout) ---

export const advisacorProductMission = {
  overview:
    "Advisacor is an AI-powered financial intelligence and CFO automation platform for business owners, bookkeeping firms, CPA firms, controllers, and fractional CFOs.",
  objectives: ["Explain what happened", "Predict what will happen", "Recommend what to do next"],
  promise:
    "Provide every business with an AI-powered CFO, analyst, controller, and board reporting team through a single platform.",
};

export const advisacorProductTiers = [
  {
    key: "pulse_starter",
    legacyKeys: ["essential"],
    name: "Pulse Starter",
    priceRange: "$49-$79/mo",
    targetCustomer: "Small business owners, solopreneurs, and companies under $1M revenue",
    stripeEnvVar: "STRIPE_PRICE_PULSE_STARTER",
    fallbackStripeEnvVar: "STRIPE_PRICE_ESSENTIAL",
    features: [
      "Financial dashboard",
      "Revenue trends",
      "Expense trends",
      "Cash balance tracking",
      "Gross profit tracking",
      "Net income tracking",
      "Financial health score",
      "Pulse AI natural language chat",
      "Financial and KPI explanations",
      "Weekly AI briefing",
      "Revenue, expense, and cash forecasts",
      "30, 60, and 90-day projections",
      "Simple What-If Analysis",
    ],
    summaryFeatures: [
      "QuickBooks integration",
      "Business dashboard",
      "Revenue and expense trends",
      "Basic KPI monitoring",
      "Weekly AI business briefing",
      "Pulse AI chat",
      "Basic 30-60 day forecasting",
      "Financial health score",
    ],
    entitlements: {
      quickbooksIntegration: true,
      dashboard: true,
      weeklyPulseBrief: true,
      pulseChat: true,
      pulseQuestionLimitMonthly: 100,
      pulseIntelligenceLevel: "ai-cfo",
      historicalDataMonths: 12,
      forecastDays: 60,
      whatIfModeling: "simple",
      savedScenarioLimit: 3,
      scenarioVariables: "single-variable",
      scenarioForecastHorizon: "90 days",
      customKpis: false,
      boardPackages: false,
      multiCompany: false,
      whiteLabel: false,
    },
    whatIfScenario: {
      label: "Simple What-If Analysis",
      inputs: ["Revenue increase/decrease %", "Expense increase/decrease %", "One-time expense additions", "One employee hire"],
      outputs: ["Estimated profit impact", "Cash impact", "Basic forecast changes"],
      limits: ["3 saved scenarios", "Single-variable changes only", "90-day forecast horizon"],
      examples: [
        "What happens if sales increase 10%?",
        "What happens if I hire one employee at $50,000?",
        "What happens if rent increases by $1,000 per month?",
      ],
    },
  },
  {
    key: "pulse_pro",
    legacyKeys: [],
    name: "Pulse Pro",
    priceRange: "$149-$249/mo",
    targetCustomer: "Growing businesses and businesses with internal accounting staff",
    stripeEnvVar: "STRIPE_PRICE_PULSE_PRO",
    fallbackStripeEnvVar: "STRIPE_PRICE_PROFESSIONAL",
    features: [
      "Everything in Starter",
      "Advanced revenue, EBITDA, cash flow, and budget forecasting",
      "Custom KPI builder",
      "Department and operational metrics",
      "Advanced predictive analytics",
      "Revenue, expense, margin, and cash runway predictions",
      "Predictive alerts",
      "Advanced What-If Modeling",
    ],
    summaryFeatures: [
      "Advanced forecasting",
      "Custom KPI creation",
      "Predictive alerts",
      "Cash flow forecasting",
      "Scenario planning",
      "Employee productivity metrics",
      "Enhanced Pulse AI analysis",
    ],
    entitlements: {
      quickbooksIntegration: true,
      dashboard: true,
      weeklyPulseBrief: true,
      pulseChat: true,
      pulseQuestionLimitMonthly: 500,
      pulseIntelligenceLevel: "ai-cfo",
      historicalDataMonths: 12,
      unlimitedSavedConversations: true,
      forecastDays: 90,
      whatIfModeling: "advanced",
      savedScenarioLimit: "unlimited",
      scenarioVariables: "multi-variable",
      scenarioForecastHorizon: "12 months",
      customKpis: true,
      scenarioPlanning: true,
      predictiveAlerts: true,
      boardPackages: false,
      multiCompany: false,
      whiteLabel: false,
    },
    whatIfScenario: {
      label: "Advanced What-If Modeling",
      inputs: ["Multiple revenue drivers", "Multiple expense categories", "Hiring plans", "Pricing changes", "Customer growth assumptions"],
      outputs: ["Profit forecast", "Cash forecast", "EBITDA forecast", "KPI impact analysis"],
      limits: ["Unlimited scenarios", "Multi-variable scenarios", "12-month forecasting"],
      examples: [
        "What happens if I hire 2 technicians and increase prices by 5%?",
        "What happens if revenue grows 15% but labor costs increase 8%?",
      ],
    },
  },
  {
    key: "advisacor_professional",
    legacyKeys: ["professional"],
    name: "Advisacor Professional",
    priceRange: "$399-$799/mo",
    targetCustomer: "Bookkeeping firms, CPA firms, and multi-location companies",
    stripeEnvVar: "STRIPE_PRICE_ADVISACOR_PROFESSIONAL",
    fallbackStripeEnvVar: "STRIPE_PRICE_PROFESSIONAL",
    featured: true,
    features: [
      "Everything in Pro",
      "Automated board packages",
      "Financial statements",
      "KPI dashboards",
      "Variance analysis",
      "Executive summaries",
      "PowerPoint generation",
      "Flux Analysis Engine",
      "AI-generated management commentary",
      "Multi-company support",
      "Client portfolio dashboard",
      "Industry-specific analytics",
      "Monthly executive reporting",
      "White-label branding options",
      "Healthcare, Construction, and Manufacturing dashboards",
    ],
    summaryFeatures: [
      "Automated board packages",
      "PowerPoint generation",
      "Flux analysis",
      "AI-generated management commentary",
      "Client portfolio dashboard",
      "Industry-specific analytics",
      "White-label branding options",
    ],
    entitlements: {
      quickbooksIntegration: true,
      dashboard: true,
      weeklyPulseBrief: true,
      pulseChat: true,
      pulseQuestionLimitMonthly: 2500,
      pulseIntelligenceLevel: "ai-cfo",
      historicalDataMonths: 12,
      forecastDays: 90,
      whatIfModeling: "strategic",
      savedScenarioLimit: "unlimited",
      scenarioVariables: "client, department, budget, workforce",
      scenarioForecastHorizon: "12 months",
      customKpis: true,
      scenarioPlanning: true,
      predictiveAlerts: true,
      boardPackages: true,
      powerpointGeneration: true,
      multiCompany: true,
      whiteLabel: true,
    },
    whatIfScenario: {
      label: "Strategic Scenario Planning",
      inputs: ["Client-wide scenario analysis", "Industry benchmarking", "Department-level modeling", "Budget planning scenarios", "Workforce planning"],
      outputs: ["Client portfolio impact", "Department-level forecast", "Budget scenario variance", "Workforce planning impact"],
      limits: ["Unlimited scenarios", "Multi-company/client modeling", "12-month forecasting"],
      examples: [
        "What happens if all 20 clients increase labor costs by 10%?",
        "What impact would opening a new location have?",
      ],
    },
  },
  {
    key: "advisacor_cfo",
    legacyKeys: ["virtual_cfo", "virtualCfo"],
    name: "Advisacor CFO",
    priceRange: "$999-$2,499+/mo",
    targetCustomer: "Fractional CFO firms and mid-market organizations",
    stripeEnvVar: "STRIPE_PRICE_ADVISACOR_CFO",
    fallbackStripeEnvVar: "STRIPE_PRICE_VIRTUAL_CFO",
    features: [
      "Everything in Professional",
      "Strategic Planning Suite",
      "Advanced predictive models",
      "Multi-year forecasting",
      "Scenario simulations",
      "Risk analysis",
      "Capital planning",
      "Acquisition modeling",
      "Executive scorecards",
      "Investor reporting",
    ],
    summaryFeatures: [
      "Strategic planning tools",
      "Advanced predictive models",
      "Capital investment analysis",
      "Acquisition modeling",
      "Executive scorecards",
    ],
    entitlements: {
      quickbooksIntegration: true,
      dashboard: true,
      weeklyPulseBrief: true,
      pulseChat: true,
      pulseQuestionLimitMonthly: "unlimited",
      pulseIntelligenceLevel: "ai-cfo",
      historicalDataMonths: 12,
      forecastDays: 365,
      whatIfModeling: "ai-strategic-planning",
      savedScenarioLimit: "unlimited",
      scenarioVariables: "probability, capital, acquisition, long-range",
      scenarioForecastHorizon: "long-range",
      customKpis: true,
      scenarioPlanning: true,
      predictiveAlerts: true,
      boardPackages: true,
      powerpointGeneration: true,
      multiCompany: true,
      whiteLabel: true,
      workforcePlanning: true,
      dedicatedSupport: true,
    },
    whatIfScenario: {
      label: "AI Strategic Planning Engine",
      inputs: ["Monte Carlo simulations", "Probability-based forecasting", "Risk-adjusted projections", "Long-range planning", "Capital investment analysis", "Acquisition modeling"],
      outputs: ["Risk-adjusted forecast", "Probability range", "Capital ROI estimate", "Strategic recommendation"],
      limits: ["Unlimited scenarios", "Probability-based modeling", "Long-range planning"],
      examples: [
        "Should we open a second location?",
        "What is the probability we miss our EBITDA target?",
        "What is the likely ROI of a $500,000 equipment purchase?",
      ],
    },
  },
];

export const productTierRank = advisacorProductTiers.reduce((accumulator, tier, index) => {
  accumulator[tier.key] = index + 1;
  tier.legacyKeys.forEach((legacyKey) => {
    accumulator[legacyKey] = index + 1;
  });
  return accumulator;
}, {});

export function normalizeProductTierKey(key) {
  const tier = advisacorProductTiers.find((item) => item.key === key || item.legacyKeys.includes(key));
  return tier?.key || "pulse_starter";
}

export function getProductTier(key) {
  const normalizedKey = normalizeProductTierKey(key);
  return advisacorProductTiers.find((tier) => tier.key === normalizedKey) || advisacorProductTiers[0];
}

export function getPulseQuestionLimit(key) {
  return getProductTier(key).entitlements.pulseQuestionLimitMonthly;
}

export function getTierPriceId(tier) {
  return process.env[tier.stripeEnvVar] || process.env[tier.fallbackStripeEnvVar] || "";
}

export function getCheckoutTiers() {
  return advisacorProductTiers.map((tier) => ({
    ...tier,
    priceId: getTierPriceId(tier),
  }));
}
