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

// v1.4 launch status lifecycle. Never delete a tier — retire it by setting archived: true.
// launch_status governs whether marketing/checkout can see the tier; super-admin can always see it.
export const LAUNCH_STATUS = Object.freeze({
  LIVE: "live",           // Visible to real customers in marketing/checkout
  TESTING: "testing",     // Super-admin only, still being QA'd
  COMING_SOON: "coming_soon", // Announced but unbuilt; super-admin sees but no checkout wiring
  ARCHIVED: "archived",   // Retired, preserved for existing subscribers, hidden everywhere else
});

export const LAUNCH_STATUS_VALUES = Object.freeze([
  LAUNCH_STATUS.LIVE,
  LAUNCH_STATUS.TESTING,
  LAUNCH_STATUS.COMING_SOON,
  LAUNCH_STATUS.ARCHIVED,
]);

// Super-admin display grouping for the /admin tier switcher.
export const SUPER_ADMIN_PACKAGE_GROUP = Object.freeze({
  V14_LIVE: "v14Live",       // v1.4 tiers currently live
  V14_TESTING: "v14Testing", // v1.4 tiers under super-admin QA
  V14_COMING_SOON: "v14ComingSoon",
  LEGACY_OWNER: "legacyOwner", // Legacy Essential/Professional/Virtual CFO labels
  ARCHIVED: "archived",      // Retired tiers preserved for existing subscribers
});

/** Display labels still used by demo companies / package_switched validation. */
export const LEGACY_OWNER_DISPLAY_LABELS = Object.freeze([
  "Essential",
  "Professional",
  "Virtual CFO",
]);

// ─── Tier catalog ──────────────────────────────────────────────────────────
//
// TODO(TCP1-W3): When accounting_pro is added to this catalog, set
// subscriptionEntity: 'firm' per LOCK-TCP1-W1-RETROFIT-2026-07-08.

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
    subscriptionEntity: 'company',
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
    subscriptionEntity: 'company',
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
    archived: true,           // v1.4: retired, historical subs preserved
    launch_status: LAUNCH_STATUS.ARCHIVED,
    name: 'Solo Bookkeeper',
    persona: 'Independent bookkeeper — up to 10 QBO clients',
    description:
      'Advisacor for independent bookkeepers on QuickBooks Online. Flat monthly or per-client à la carte. Full Pulse stack per client, cross-client memory, weekly briefings, and disclosure prep. Xero coming soon.',
    metered: false,
    attachable: false,
    subscriptionEntity: 'firm',
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
    subscriptionEntity: 'firm',
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
  review_assist: {
    key: 'review_assist',
    launch_status: LAUNCH_STATUS.TESTING,
    name: 'Review Assist',
    persona: 'Bookkeeper or firm — pre-close review layer',
    description:
      'Advisacor Review Assist for bookkeepers and firms. Runs disclosure and severity review on close packets before hand-off, produces a findings report (blocker / warning / note), and attaches the review PDF to any close package. Firm-scoped. Add-on friendly. Xero coming soon.',
    metered: false,
    attachable: false,
    subscriptionEntity: 'firm',
    lookupKeys: {
      standard: { monthly: 'review_assist_std_mo', yearly: 'review_assist_std_yr' },
      pilot:    { monthly: 'review_assist_pilot_mo', yearly: 'review_assist_pilot_yr' },
    },
    erpSupport: {
      quickbooks: 'live',
      xero: 'coming_soon',
    },
    entitlements: {
      max_entities: 0,          // Review Assist is a review layer — does not own clients
      max_verticals: 15,
      pulse_intelligence: false,
      organizational_memory: false,
      predictive_alerts: false,
      weekly_briefings: false,
      disclosure_validation_full: true,
      cross_vertical_synthesis: false,
      firm_seats: 0,
      review_assist_pdf_mode: true,
      review_assist_findings_composer: true,
      review_assist_severity_surface: true,
      review_assist_close_packet_gate: true,
      // v1.4 additions — bank matching + JE proposals (rules engine)
      review_assist_bank_matching_csv: true,
      review_assist_bank_matching_qbo_feed: true,
      review_assist_je_proposal: true,
      review_assist_matching_engine: 'rules',
      review_assist_write_qbo: false,
      review_assist_historical_cleanup: false,
      review_assist_multi_client: false,
      // v1.4 additions — always-on cadence
      review_assist_je_cadence_configurable: true,
      review_assist_je_cadence_default: 'daily',
      review_assist_je_always_on: true,
      // v1.4 additions — print/export path
      review_assist_print_pdf: true,
      review_assist_print_csv: true,
      // v1.4 additions — cash app (off unless RA Cash App add-on attached)
      review_assist_cash_app: false,
      review_assist_cash_app_engine: null,
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
    subscriptionEntity: null,
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
    subscriptionEntity: null,
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
    subscriptionEntity: null,
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

  ra_cashapp_addon: {
    key: 'ra_cashapp_addon',
    launch_status: LAUNCH_STATUS.TESTING,
    name: 'Review Assist — Cash Application Add-on',
    persona: 'RA base user — auto-match deposits to invoices',
    description:
      'Rule-based cash application for Review Assist. Auto-matches bank deposits to open QuickBooks invoices by customer name + amount + date tolerance. Handles exact-amount single-invoice payments. For AI-reasoned check parsing, split payments, and short-pay handling, upgrade to Review Assist Pro Cash Application.',
    metered: false,
    attachable: true,
    subscriptionEntity: null,
    attachableTo: ['review_assist'],
    lookupKeys: {
      standard: { monthly: 'ra_cashapp_std_mo', yearly: 'ra_cashapp_std_yr' },
      pilot:    { monthly: 'ra_cashapp_pilot_mo', yearly: 'ra_cashapp_pilot_yr' },
    },
    erpSupport: {
      quickbooks: 'live',
      xero: 'coming_soon',
    },
    entitlements: {
      review_assist_cash_app: true,
      review_assist_cash_app_engine: 'rules',
      review_assist_cash_app_max_per_month: 100,
    },
  },

  ra_je_write_addon: {
    key: 'ra_je_write_addon',
    launch_status: LAUNCH_STATUS.TESTING,
    name: 'Review Assist — JE Write Add-on',
    persona: 'RA base user — write proposed JEs to QuickBooks',
    description:
      'Enables direct posting of Review Assist journal entry proposals to QuickBooks via the QBO JournalEntry API, with full audit trail and reversal path. Requires currency-aware writeback (MC-3). For customers who want the write scope but do not need the full Review Assist Pro workflow.',
    metered: false,
    attachable: true,
    subscriptionEntity: null,
    attachableTo: ['review_assist'],
    requires: ['mc_3_je_writeback'],   // build-time flag; not an entitlement
    lookupKeys: {
      standard: { monthly: 'ra_je_write_std_mo', yearly: 'ra_je_write_std_yr' },
      pilot:    { monthly: 'ra_je_write_pilot_mo', yearly: 'ra_je_write_pilot_yr' },
    },
    erpSupport: {
      quickbooks: 'live',
      xero: 'coming_soon',
    },
    entitlements: {
      review_assist_write_qbo: true,
      review_assist_je_audit_trail: true,
      review_assist_je_reversal: true,
    },
  },

  review_assist_pro: {
    key: 'review_assist_pro',
    launch_status: LAUNCH_STATUS.TESTING,
    name: 'Review Assist Pro',
    persona: 'Bookkeeping firms, controllers, multi-client workflows',
    description:
      'Advisacor Review Assist Pro. Everything in Review Assist plus AI-reasoned matching, patented memory substrate, historical cleanup, multi-client portfolio workspace, firm seats (default 5), Ask Pulse Command Center access, industry-native templates across 15 verticals, and evidence-linked JE proposals with citations and assertion coverage. Direct QuickBooks write included. Xero coming soon.',
    metered: false,
    attachable: false,
    subscriptionEntity: 'company',
    lookupKeys: {
      standard: { monthly: 'review_assist_pro_std_mo', yearly: 'review_assist_pro_std_yr' },
      pilot:    { monthly: 'review_assist_pro_pilot_mo', yearly: 'review_assist_pro_pilot_yr' },
    },
    erpSupport: {
      quickbooks: 'live',
      xero: 'coming_soon',
    },
    requires: ['mc_3_je_writeback', 'mc_4_reconciliation'],
    entitlements: {
      max_entities: 10,
      max_verticals: 15,
      pulse_intelligence: true,
      organizational_memory: true,
      predictive_alerts: true,
      weekly_briefings: true,
      disclosure_validation_full: true,
      cross_vertical_synthesis: true,
      firm_seats: 5,
      // RA baseline flags (all elevated)
      review_assist_pdf_mode: true,
      review_assist_findings_composer: true,
      review_assist_severity_surface: true,
      review_assist_close_packet_gate: true,
      review_assist_bank_matching_csv: true,
      review_assist_bank_matching_qbo_feed: true,
      review_assist_je_proposal: true,
      review_assist_je_cadence_configurable: true,
      review_assist_je_cadence_default: 'realtime',
      review_assist_je_always_on: true,
      review_assist_print_pdf: true,
      review_assist_print_csv: true,
      // RA Pro elevated
      review_assist_write_qbo: true,
      review_assist_matching_engine: 'ai_memory',
      review_assist_historical_cleanup: true,
      review_assist_historical_lookback_months: 24,
      review_assist_multi_client: true,
      review_assist_ai_reasoning: true,
      review_assist_memory_substrate: true,
      review_assist_evidence_citations: true,
      review_assist_assertion_coverage: true,
      review_assist_industry_templates: true,
      ask_pulse_command_center: true,
    },
  },

  ra_pro_cashapp_addon: {
    key: 'ra_pro_cashapp_addon',
    launch_status: LAUNCH_STATUS.TESTING,
    name: 'Review Assist Pro — Cash Application Add-on',
    persona: 'RA Pro user — AI-reasoned cash application',
    description:
      'AI-reasoned cash application for Review Assist Pro. Parses cryptic bank memos, OCRs remittance advice, splits payments across multiple invoices, handles short-pay and earned-discount logic, and produces confidence-scored matches. Unlimited volume. Memory substrate learns customer payment patterns over time.',
    metered: false,
    attachable: true,
    subscriptionEntity: null,
    attachableTo: ['review_assist_pro'],
    lookupKeys: {
      standard: { monthly: 'ra_pro_cashapp_std_mo', yearly: 'ra_pro_cashapp_std_yr' },
      pilot:    { monthly: 'ra_pro_cashapp_pilot_mo', yearly: 'ra_pro_cashapp_pilot_yr' },
    },
    erpSupport: {
      quickbooks: 'live',
      xero: 'coming_soon',
    },
    entitlements: {
      review_assist_cash_app: true,
      review_assist_cash_app_engine: 'ai_memory',
      review_assist_cash_app_max_per_month: null,
      cash_app_check_image_ocr: true,
      cash_app_split_payments: true,
      cash_app_short_pay_handling: true,
      cash_app_discount_logic: true,
      cash_app_confidence_scoring: true,
    },
  },

  ra_pro_ar_addon: {
    key: 'ra_pro_ar_addon',
    launch_status: LAUNCH_STATUS.TESTING,
    name: 'Review Assist Pro — AR Billing Add-on',
    persona: 'RA Pro user — invoice creation, send, and reconciliation',
    description:
      'AR billing module for Review Assist Pro. Invoice CRUD with customer management, invoice send via email with embedded Stripe payment links, AR aging native to the workspace, and automatic reconciliation against QuickBooks invoice records.',
    metered: false,
    attachable: true,
    subscriptionEntity: null,
    attachableTo: ['review_assist_pro'],
    requires: ['mc_3_je_writeback'],
    lookupKeys: {
      standard: { monthly: 'ra_pro_ar_std_mo', yearly: 'ra_pro_ar_std_yr' },
      pilot:    { monthly: 'ra_pro_ar_pilot_mo', yearly: 'ra_pro_ar_pilot_yr' },
    },
    erpSupport: {
      quickbooks: 'live',
      xero: 'coming_soon',
    },
    entitlements: {
      ra_pro_ar_billing: true,
      ra_pro_ar_customer_mgmt: true,
      ra_pro_ar_invoice_send: true,
      ra_pro_ar_stripe_payment_links: true,
      ra_pro_ar_aging_native: true,
      ra_pro_ar_reconciliation: true,
    },
  },

  ra_pro_ap_addon: {
    key: 'ra_pro_ap_addon',
    launch_status: LAUNCH_STATUS.TESTING,
    name: 'Review Assist Pro — AP Bills Add-on',
    persona: 'RA Pro user — bill entry with AI fraud stack',
    description:
      'AP bill entry for Review Assist Pro. Full vendor management with W-9 storage, configurable approval workflows, mark-as-paid recording via the QuickBooks BillPayment API, and 1099 tracking. Integrated AP vendor fraud control stack: duplicate detection, new-vendor cooling-off period, amount-outlier flags, vendor bank-account change alerts, velocity limits, and split-invoice detection. Bill Pay Native builds on top of this.',
    metered: false,
    attachable: true,
    subscriptionEntity: null,
    attachableTo: ['review_assist_pro'],
    requires: ['mc_3_je_writeback'],
    lookupKeys: {
      standard: { monthly: 'ra_pro_ap_std_mo', yearly: 'ra_pro_ap_std_yr' },
      pilot:    { monthly: 'ra_pro_ap_pilot_mo', yearly: 'ra_pro_ap_pilot_yr' },
    },
    erpSupport: {
      quickbooks: 'live',
      xero: 'coming_soon',
    },
    entitlements: {
      ra_pro_ap_bills: true,
      ra_pro_ap_vendor_mgmt: true,
      ra_pro_ap_approval_workflow: true,
      ra_pro_ap_qbo_bill_write: true,
      ra_pro_ap_1099_tracking: true,
      ra_pro_ap_aging_native: true,
      ra_pro_ap_fraud_stack: true,
      ra_pro_ap_fraud_duplicate_detection: true,
      ra_pro_ap_fraud_new_vendor_hold: true,
      ra_pro_ap_fraud_amount_outlier: true,
      ra_pro_ap_fraud_bank_change_alert: true,
      ra_pro_ap_fraud_velocity_limit: true,
      ra_pro_ap_fraud_split_invoice: true,
    },
  },

  ra_pro_billpay_connector_addon: {
    key: 'ra_pro_billpay_connector_addon',
    launch_status: LAUNCH_STATUS.TESTING,
    name: 'Review Assist Pro — Bill Pay Connector',
    persona: 'RA Pro user with existing bill-pay tool (Bill.com, Melio, Ramp, QBO Bill Pay)',
    description:
      "Bill Pay Connector for Review Assist Pro. Integrates with the customer's existing bill-pay tool (Bill.com, Melio, Ramp Bill Pay, or QuickBooks Bill Pay), reads bills, applies the Advisacor AP fraud control stack, orchestrates approvals through the Advisacor workflow, and reconciles executed payments back to the general ledger. No money movement through Advisacor. Partner integrations ship sequentially: Bill.com, Melio, Ramp, QBO Bill Pay.",
    metered: false,
    attachable: true,
    subscriptionEntity: null,
    attachableTo: ['review_assist_pro'],
    lookupKeys: {
      standard: { monthly: 'ra_pro_billpay_conn_std_mo', yearly: 'ra_pro_billpay_conn_std_yr' },
      pilot:    { monthly: 'ra_pro_billpay_conn_pilot_mo', yearly: 'ra_pro_billpay_conn_pilot_yr' },
    },
    erpSupport: {
      quickbooks: 'live',
      xero: 'coming_soon',
    },
    entitlements: {
      ra_pro_billpay_connector: true,
      ra_pro_billpay_connector_bill_com: false,
      ra_pro_billpay_connector_melio: false,
      ra_pro_billpay_connector_ramp: false,
      ra_pro_billpay_connector_qbo: false,
      ra_pro_billpay_fraud_stack_apply: true,
      ra_pro_billpay_orchestration: true,
      ra_pro_billpay_reconciliation: true,
    },
  },

  ra_pro_billpay_native_addon: {
    key: 'ra_pro_billpay_native_addon',
    launch_status: LAUNCH_STATUS.TESTING,
    name: 'Review Assist Pro — Bill Pay Native',
    persona: 'RA Pro user with AP Bills — native ACH/check/wire execution',
    description:
      'Bill Pay Native for Review Assist Pro. Executes ACH payments, check printing/mailing, and wire transfers via a payments partner (Modern Treasury, Increase, Column, or Stripe Treasury), with full fraud control stack applied pre-execution: vendor bank verification, 2FA over configurable threshold, OFAC sanctions screening, and bank velocity checks. Requires AP Bills add-on and separate compliance approval before enablement.',
    metered: false,
    attachable: true,
    subscriptionEntity: null,
    attachableTo: ['review_assist_pro'],
    requires: ['ra_pro_ap_addon', 'compliance_billpay_native'],
    status: 'compliance_pending',
    lookupKeys: {
      standard: { monthly: 'ra_pro_billpay_native_std_mo', yearly: 'ra_pro_billpay_native_std_yr' },
      pilot:    { monthly: 'ra_pro_billpay_native_pilot_mo', yearly: 'ra_pro_billpay_native_pilot_yr' },
    },
    erpSupport: {
      quickbooks: 'live',
      xero: 'coming_soon',
    },
    entitlements: {
      ra_pro_billpay_native: true,
      ra_pro_billpay_native_ach: true,
      ra_pro_billpay_native_check: false,
      ra_pro_billpay_native_wire: false,
      ra_pro_billpay_native_partner: null,
      ra_pro_billpay_native_2fa_threshold_usd: 10000,
      ra_pro_billpay_native_sanctions_screening: true,
      ra_pro_billpay_native_vendor_bank_verification: true,
      ra_pro_billpay_native_1099_auto: true,
    },
  },

  ra_pro_payroll_addon: {
    key: 'ra_pro_payroll_addon',
    launch_status: LAUNCH_STATUS.COMING_SOON,
    name: 'Review Assist Pro — Payroll Add-on',
    persona: 'RA Pro user — full-service payroll (coming soon)',
    description:
      'Payroll add-on for Review Assist Pro. Full-service payroll via a payments partner (Gusto Embedded, Check.hq, or Rippling Embedded), including direct deposit, tax filing, benefits, workers compensation, and 1099 contractor payments. Coming soon: partner selection and compliance track underway.',
    metered: false,
    attachable: true,
    subscriptionEntity: null,
    attachableTo: ['review_assist_pro'],
    status: 'coming_soon',
    lookupKeys: {
      standard: { monthly: 'ra_pro_payroll_std_mo', yearly: 'ra_pro_payroll_std_yr' },
      pilot:    { monthly: 'ra_pro_payroll_pilot_mo', yearly: 'ra_pro_payroll_pilot_yr' },
    },
    erpSupport: {
      quickbooks: 'live',
      xero: 'coming_soon',
    },
    entitlements: {
      ra_pro_payroll: false,
      ra_pro_payroll_partner: null,
      ra_pro_payroll_max_employees: 0,
      ra_pro_payroll_direct_deposit: false,
      ra_pro_payroll_tax_filing: false,
      ra_pro_payroll_benefits: false,
      ra_pro_payroll_workers_comp: false,
      ra_pro_payroll_1099_contractors: false,
    },
  },

  ra_pro_full_bundle: {
    key: 'ra_pro_full_bundle',
    launch_status: LAUNCH_STATUS.TESTING,
    name: 'Review Assist Pro Full',
    persona: 'RA Pro customer — everything except Bill Pay Native and Payroll',
    description:
      'Bundle SKU that includes Review Assist Pro, Cash Application, AR Billing, AP Bills, and Bill Pay Connector for a single monthly price with locked-in savings versus purchasing add-ons a la carte.',
    metered: false,
    attachable: false,
    subscriptionEntity: 'company',
    bundleIncludes: [
      'review_assist_pro',
      'ra_pro_cashapp_addon',
      'ra_pro_ar_addon',
      'ra_pro_ap_addon',
      'ra_pro_billpay_connector_addon',
    ],
    lookupKeys: {
      standard: { monthly: 'ra_pro_full_std_mo', yearly: 'ra_pro_full_std_yr' },
      pilot:    { monthly: 'ra_pro_full_pilot_mo', yearly: 'ra_pro_full_pilot_yr' },
    },
    erpSupport: {
      quickbooks: 'live',
      xero: 'coming_soon',
    },
    requires: ['mc_3_je_writeback', 'mc_4_reconciliation'],
    entitlements: {}, // computed at resolution time from bundleIncludes
  },

  ra_pro_full_native_bundle: {
    key: 'ra_pro_full_native_bundle',
    launch_status: LAUNCH_STATUS.TESTING,
    name: 'Review Assist Pro Full+ Native',
    persona: 'RA Pro customer — everything including native Bill Pay execution',
    description:
      'Premium bundle SKU that includes Review Assist Pro, Cash Application, AR Billing, AP Bills, and Bill Pay Native. Requires compliance approval for Bill Pay Native before enablement.',
    metered: false,
    attachable: false,
    subscriptionEntity: 'company',
    bundleIncludes: [
      'review_assist_pro',
      'ra_pro_cashapp_addon',
      'ra_pro_ar_addon',
      'ra_pro_ap_addon',
      'ra_pro_billpay_native_addon',
    ],
    lookupKeys: {
      standard: { monthly: 'ra_pro_full_native_std_mo', yearly: 'ra_pro_full_native_std_yr' },
      pilot:    { monthly: 'ra_pro_full_native_pilot_mo', yearly: 'ra_pro_full_native_pilot_yr' },
    },
    erpSupport: {
      quickbooks: 'live',
      xero: 'coming_soon',
    },
    requires: ['mc_3_je_writeback', 'mc_4_reconciliation', 'compliance_billpay_native'],
    status: 'compliance_pending',
    entitlements: {},
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
  // monthly + yearly). Total varies with the v1.4 catalog; the batch
  // logic below chunks into groups of 10 so total count doesn't matter.
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
 * Returns the entity type a tier's pilot_slots row attaches to.
 * - 'firm'    → row's firm_id column is set, company_id is NULL
 * - 'company' → row's company_id column is set, firm_id is NULL
 * - null      → tier is an add-on that does NOT create its own pilot_slots row
 *
 * The pilot-slot writer branches on this value. Throws for unknown tier keys
 * so schema drift surfaces loudly at runtime rather than silently writing to
 * the wrong column.
 */
export function getSubscriptionEntity(tierKey) {
  const tier = TIERS[tierKey];
  if (!tier) {
    throw new Error(`getSubscriptionEntity: unknown tier_key "${tierKey}"`);
  }
  // subscriptionEntity is a required field on every tier; explicit `null` for add-ons.
  if (tier.subscriptionEntity === undefined) {
    throw new Error(
      `getSubscriptionEntity: tier "${tierKey}" missing subscriptionEntity field — registry drift`,
    );
  }
  return tier.subscriptionEntity;
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
 * @param {string|null} [structure] — 'flat' or 'perClient' for dual-pricing tiers
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
export const SUBSCRIPTION_TIER_KEYS = {
  owner_lite: 'owner_lite',
  owner_pro: 'owner_pro',
  solo_bookkeeper: 'solo_bookkeeper',
  firm: 'firm_base',
  firm_seat: 'firm_client_seat',
  client_seat_alacarte: 'alacarte_seat',
  industry_premium_addon: 'industry_premium',
  review_assist: 'review_assist',
  // v1.4 additions
  ra_cashapp_addon: 'ra_cashapp_addon',
  ra_je_write_addon: 'ra_je_write_addon',
  review_assist_pro: 'review_assist_pro',
  ra_pro_cashapp_addon: 'ra_pro_cashapp_addon',
  ra_pro_ar_addon: 'ra_pro_ar_addon',
  ra_pro_ap_addon: 'ra_pro_ap_addon',
  ra_pro_billpay_connector_addon: 'ra_pro_billpay_connector_addon',
  ra_pro_billpay_native_addon: 'ra_pro_billpay_native_addon',
  ra_pro_payroll_addon: 'ra_pro_payroll_addon',
  ra_pro_full_bundle: 'ra_pro_full_bundle',
  ra_pro_full_native_bundle: 'ra_pro_full_native_bundle',
};

/** Feature flags merged into entitlements.flags by deriveEntitlementFromItems. */
const TIER_FLAGS = {
  owner_lite: {
    core_close: true,
    disclosure_validation: false,
    memory: 'basic',
    // Block 6 gate flags — spec-canonical names.
    full_assertion_output: false,     // Owner Pro+ upsell
    close_packet_generation: true,
    pulse_intelligence: false,        // Pulse is Pro+
    qbo_write_back: true,
    review_assist_findings: false,
  },
  owner_pro: {
    core_close: true,
    disclosure_validation: true,
    memory: 'standard',
    full_assertion_output: true,
    close_packet_generation: true,
    pulse_intelligence: true,
    qbo_write_back: true,
    review_assist_findings: false,
  },
  solo_bookkeeper: {
    core_close: true,
    disclosure_validation: true,
    memory: 'standard',
    full_assertion_output: true,
    close_packet_generation: true,
    pulse_intelligence: true,
    qbo_write_back: true,
    review_assist_findings: false,
  },
  firm: {
    core_close: true,
    disclosure_validation: true,
    memory: 'standard',
    firm_dashboard: true,
    multi_client: true,
    full_assertion_output: true,
    close_packet_generation: true,
    pulse_intelligence: true,
    qbo_write_back: true,
    review_assist_findings: false,
  },
  // review_assist_findings toggles the read-only findings composer at
  // GET /api/review-assist/findings/[firm_client_id]/[period]. Only the
  // review_assist tier ships it; other tiers use the full close-packet flow.
  // Reference: Track_C_Phase_1_Tier_Spec_v1_2_Review_Assist_Addendum, Block 6.
  // Review Assist — read-only review layer. Explicitly denied on all
  // four write-path gates. See Track_C_Phase_1_Tier_Spec_v1_2_Review_Assist_Addendum.
  review_assist: {
    core_close: false,
    disclosure_validation: true,      // read-only disclosure review is core to RA
    memory: 'basic',
    full_assertion_output: false,
    close_packet_generation: false,
    pulse_intelligence: false,
    qbo_write_back: false,
    review_assist_findings: true,
  },
  firm_seat: {
    full_assertion_output: true,
    close_packet_generation: true,
    pulse_intelligence: true,
    qbo_write_back: true,
    review_assist_findings: false,
  },
  client_seat_alacarte: {
    full_assertion_output: true,
    close_packet_generation: true,
    pulse_intelligence: true,
    qbo_write_back: true,
    review_assist_findings: false,
  },
  industry_premium_addon: { industry_premium: true },
  ra_cashapp_addon: {
    review_assist_cash_app: true,
  },
  ra_je_write_addon: {
    review_assist_write_qbo: true,
    qbo_write_back: true,
  },
  review_assist_pro: {
    core_close: true,
    disclosure_validation: true,
    memory: 'ai_substrate',
    full_assertion_output: true,
    close_packet_generation: true,
    pulse_intelligence: true,
    qbo_write_back: true,
    review_assist_findings: true,
    review_assist_pro: true,
    firm_dashboard: true,
    multi_client: true,
    ask_pulse_command_center: true,
  },
  ra_pro_cashapp_addon: {
    review_assist_cash_app: true,
    cash_app_ai: true,
  },
  ra_pro_ar_addon: {
    ra_pro_ar_billing: true,
  },
  ra_pro_ap_addon: {
    ra_pro_ap_bills: true,
    ra_pro_ap_fraud_stack: true,
  },
  ra_pro_billpay_connector_addon: {
    ra_pro_billpay_connector: true,
  },
  ra_pro_billpay_native_addon: {
    ra_pro_billpay_native: true,
  },
  ra_pro_payroll_addon: {
    ra_pro_payroll: false, // toggled true when partner selected + compliance cleared
  },
  ra_pro_full_bundle: {
    // bundle flags are computed at resolution time from bundleIncludes
    // but we ship the union here for fast lookup:
    core_close: true,
    disclosure_validation: true,
    memory: 'ai_substrate',
    full_assertion_output: true,
    close_packet_generation: true,
    pulse_intelligence: true,
    qbo_write_back: true,
    review_assist_findings: true,
    review_assist_pro: true,
    firm_dashboard: true,
    multi_client: true,
    ask_pulse_command_center: true,
    review_assist_cash_app: true,
    cash_app_ai: true,
    ra_pro_ar_billing: true,
    ra_pro_ap_bills: true,
    ra_pro_ap_fraud_stack: true,
    ra_pro_billpay_connector: true,
  },
  ra_pro_full_native_bundle: {
    core_close: true,
    disclosure_validation: true,
    memory: 'ai_substrate',
    full_assertion_output: true,
    close_packet_generation: true,
    pulse_intelligence: true,
    qbo_write_back: true,
    review_assist_findings: true,
    review_assist_pro: true,
    firm_dashboard: true,
    multi_client: true,
    ask_pulse_command_center: true,
    review_assist_cash_app: true,
    cash_app_ai: true,
    ra_pro_ar_billing: true,
    ra_pro_ap_bills: true,
    ra_pro_ap_fraud_stack: true,
    ra_pro_billpay_native: true,
  },
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

/**
 * Returns true if a tier is archived (retired but retained for historical
 * subscription resolution).
 *
 * @param {string} tierKey
 * @returns {boolean}
 */
export function isArchivedTier(tierKey) {
  return TIERS[tierKey]?.archived === true;
}

/**
 * Returns all tiers that are not archived. Use this in any customer-facing
 * surface (checkout, marketing, onboarding) so retired SKUs are not offered
 * to new customers. Historical subscriptions on archived tiers continue to
 * resolve via getTier() and the entitlements resolver.
 *
 * @returns {Array<Object>}
 */
export function getActiveTiers() {
  return Object.values(TIERS).filter(t => !t.archived);
}

/**
 * Returns tiers filtered by `attachableTo`. Used by add-on selection UIs
 * to show only the add-ons compatible with the customer's active base tier.
 *
 * @param {string} baseTierKey
 * @returns {Array<Object>}
 */
export function getAttachableTiersFor(baseTierKey) {
  return Object.values(TIERS).filter(t =>
    !t.archived
    && t.attachable === true
    && Array.isArray(t.attachableTo)
    && t.attachableTo.includes(baseTierKey)
  );
}

/**
 * Returns the list of tier keys a bundle SKU expands to. For non-bundle
 * tiers, returns [tierKey].
 *
 * @param {string} tierKey
 * @returns {Array<string>}
 */
export function expandBundle(tierKey) {
  const tier = TIERS[tierKey];
  if (!tier) return [];
  if (Array.isArray(tier.bundleIncludes) && tier.bundleIncludes.length > 0) {
    return tier.bundleIncludes;
  }
  return [tierKey];
}

/**
 * Given a set of tier keys (which may include bundles), returns the
 * expanded, deduplicated list of effective tier keys.
 *
 * @param {Array<string>} tierKeys
 * @returns {Array<string>}
 */
export function expandActiveTiers(tierKeys) {
  const expanded = new Set();
  for (const key of tierKeys) {
    for (const inner of expandBundle(key)) {
      expanded.add(inner);
    }
  }
  return Array.from(expanded);
}

/**
 * Returns tiers with launch_status === 'live'.
 * Legacy tiers (no launch_status field) are also treated as live.
 * Archived tiers are always excluded.
 */
export function getLiveTiers() {
  return Object.entries(TIERS)
    .filter(([, tier]) => {
      if (tier?.archived === true) return false;
      const status = tier?.launch_status;
      // No status field = legacy tier = treat as live
      if (status === undefined || status === null) return true;
      return status === LAUNCH_STATUS.LIVE;
    })
    .map(([key]) => key);
}

/**
 * Returns tiers with launch_status === 'testing'.
 */
export function getTestingTiers() {
  return Object.entries(TIERS)
    .filter(([, tier]) => tier?.launch_status === LAUNCH_STATUS.TESTING)
    .map(([key]) => key);
}

/**
 * Returns tiers with launch_status === 'coming_soon'.
 */
export function getComingSoonTiers() {
  return Object.entries(TIERS)
    .filter(([, tier]) => tier?.launch_status === LAUNCH_STATUS.COMING_SOON)
    .map(([key]) => key);
}

/**
 * Computed bundle launch status — worst-case of children.
 * If any child is not live, bundle cannot be live. Precedence:
 * archived > coming_soon > testing > live.
 * A manual `launch_status_override` field on the bundle wins if present.
 * Uses Block 1 `bundleIncludes` (not a renamed field).
 *
 * @param {string} bundleKey - tier key of the bundle
 * @returns {string} launch status (one of LAUNCH_STATUS values)
 */
export function getBundleLaunchStatus(bundleKey) {
  const bundle = TIERS[bundleKey];
  if (!bundle) return LAUNCH_STATUS.ARCHIVED;
  if (bundle.launch_status_override) return bundle.launch_status_override;
  const children = Array.isArray(bundle.bundleIncludes) ? bundle.bundleIncludes : [];
  if (children.length === 0) return bundle.launch_status || LAUNCH_STATUS.TESTING;

  const precedence = {
    [LAUNCH_STATUS.ARCHIVED]: 4,
    [LAUNCH_STATUS.COMING_SOON]: 3,
    [LAUNCH_STATUS.TESTING]: 2,
    [LAUNCH_STATUS.LIVE]: 1,
  };

  let worst = LAUNCH_STATUS.LIVE;
  let worstRank = 1;

  for (const childKey of children) {
    const child = TIERS[childKey];
    if (!child) {
      // Missing child dependency — treat as coming_soon (unbuilt)
      if (precedence[LAUNCH_STATUS.COMING_SOON] > worstRank) {
        worst = LAUNCH_STATUS.COMING_SOON;
        worstRank = precedence[LAUNCH_STATUS.COMING_SOON];
      }
      continue;
    }
    const childStatus = child.launch_status || LAUNCH_STATUS.LIVE; // Legacy = live
    const rank = precedence[childStatus] || 0;
    if (rank > worstRank) {
      worst = childStatus;
      worstRank = rank;
    }
  }

  return worst;
}

/**
 * True if every child of the bundle is live and the bundle has no override blocking it.
 */
export function isBundleReadyForLive(bundleKey) {
  return getBundleLaunchStatus(bundleKey) === LAUNCH_STATUS.LIVE;
}

/**
 * Returns the flat list of package-level keys that super-admin should be able to switch between.
 * Includes all non-archived catalog tier keys plus legacy Essential/Professional/Virtual CFO
 * display labels so demo-company package_switched validation keeps working.
 */
export function getSuperAdminPackageLevels() {
  const catalogKeys = Object.entries(TIERS)
    .filter(([, tier]) => tier?.archived !== true)
    .map(([key]) => key);
  return [...catalogKeys, ...LEGACY_OWNER_DISPLAY_LABELS];
}

/**
 * Returns grouped tier keys for the /admin tier switcher UI.
 * v14Live / v14Testing / v14ComingSoon: v1.4 catalog keys by launch_status
 *   (bundles use computed worst-case of bundleIncludes children).
 * legacyOwner: pre-v1.4 catalog keys (no launch_status) + Essential/Professional/Virtual CFO labels.
 * archived: archived === true.
 */
export function getSuperAdminPackageGroups() {
  const groups = {
    [SUPER_ADMIN_PACKAGE_GROUP.V14_LIVE]: [],
    [SUPER_ADMIN_PACKAGE_GROUP.V14_TESTING]: [],
    [SUPER_ADMIN_PACKAGE_GROUP.V14_COMING_SOON]: [],
    [SUPER_ADMIN_PACKAGE_GROUP.LEGACY_OWNER]: [],
    [SUPER_ADMIN_PACKAGE_GROUP.ARCHIVED]: [],
  };

  const V14_KEYS = new Set([
    "review_assist",
    "ra_cashapp_addon",
    "ra_je_write_addon",
    "review_assist_pro",
    "ra_pro_cashapp_addon",
    "ra_pro_ar_addon",
    "ra_pro_ap_addon",
    "ra_pro_billpay_connector_addon",
    "ra_pro_billpay_native_addon",
    "ra_pro_payroll_addon",
    "ra_pro_full_bundle",
    "ra_pro_full_native_bundle",
  ]);

  for (const [key, tier] of Object.entries(TIERS)) {
    if (!tier) continue;

    if (tier.archived === true) {
      groups[SUPER_ADMIN_PACKAGE_GROUP.ARCHIVED].push(key);
      continue;
    }

    // v1.4 catalog tiers
    if (V14_KEYS.has(key)) {
      const isBundle = Array.isArray(tier.bundleIncludes) && tier.bundleIncludes.length > 0;
      const status = isBundle ? getBundleLaunchStatus(key) : (tier.launch_status || LAUNCH_STATUS.TESTING);

      if (status === LAUNCH_STATUS.LIVE) {
        groups[SUPER_ADMIN_PACKAGE_GROUP.V14_LIVE].push(key);
      } else if (status === LAUNCH_STATUS.TESTING) {
        groups[SUPER_ADMIN_PACKAGE_GROUP.V14_TESTING].push(key);
      } else if (status === LAUNCH_STATUS.COMING_SOON) {
        groups[SUPER_ADMIN_PACKAGE_GROUP.V14_COMING_SOON].push(key);
      }
      continue;
    }

    // Legacy catalog tiers (no launch_status field) → legacyOwner
    if (!tier.launch_status) {
      groups[SUPER_ADMIN_PACKAGE_GROUP.LEGACY_OWNER].push(key);
    }
  }

  // Demo companies still store Essential / Professional / Virtual CFO labels.
  for (const label of LEGACY_OWNER_DISPLAY_LABELS) {
    if (!groups[SUPER_ADMIN_PACKAGE_GROUP.LEGACY_OWNER].includes(label)) {
      groups[SUPER_ADMIN_PACKAGE_GROUP.LEGACY_OWNER].push(label);
    }
  }

  return groups;
}

// ============================================================
// v1.5 — Audit Ready add-on SKUs
// Seeded inactive in Stripe; flipped to active in Phase 3.
// ============================================================
export const AUDIT_READY_SKU_CATALOG = {
  ra_pro_audit_ready_small: {
    tier_key: "ra_pro_audit_ready_small",
    display_name: "Audit Ready — Small",
    tier_type: "attachable_addon",
    attaches_to: "review_assist_pro",
    subscription_entity: ["company", "firm"],
    audit_ready_size: "small",
    limits: {
      max_entities: 1,
      max_pbc_requests: 50,
      max_auditor_users: 3,
    },
    pricing: {
      monthly_standard: 9900,
      yearly_standard: 99000,
      monthly_pilot: 5900,
      per_engagement_standard: 29900,
    },
    engagement_config: {
      prep_window_days: 90,
      hard_timeout_days: 180,
      renewal_price_pct: 50,
    },
    launch_phase: "v1.5_phase_3",
    status: "seeded_inactive",
  },
  ra_pro_audit_ready_standard: {
    tier_key: "ra_pro_audit_ready_standard",
    display_name: "Audit Ready — Standard",
    tier_type: "attachable_addon",
    attaches_to: "review_assist_pro",
    subscription_entity: ["company", "firm"],
    audit_ready_size: "standard",
    limits: {
      max_entities: 2,
      max_pbc_requests: 150,
      max_auditor_users: 5,
    },
    pricing: {
      monthly_standard: 19900,
      yearly_standard: 199000,
      monthly_pilot: 13900,
      per_engagement_standard: 69900,
    },
    engagement_config: {
      prep_window_days: 90,
      hard_timeout_days: 180,
      renewal_price_pct: 50,
    },
    launch_phase: "v1.5_phase_3",
    status: "seeded_inactive",
  },
  ra_pro_audit_ready_complex: {
    tier_key: "ra_pro_audit_ready_complex",
    display_name: "Audit Ready — Complex",
    tier_type: "attachable_addon",
    attaches_to: "review_assist_pro",
    subscription_entity: ["company", "firm"],
    audit_ready_size: "complex",
    limits: {
      max_entities: 5,
      max_pbc_requests: 400,
      max_auditor_users: 10,
    },
    pricing: {
      monthly_standard: 39900,
      yearly_standard: 399000,
      monthly_pilot: 27900,
      per_engagement_standard: 149900,
    },
    engagement_config: {
      prep_window_days: 90,
      hard_timeout_days: 180,
      renewal_price_pct: 50,
    },
    launch_phase: "v1.5_phase_3",
    status: "seeded_inactive",
  },
  ra_pro_audit_ready_multi_entity: {
    tier_key: "ra_pro_audit_ready_multi_entity",
    display_name: "Audit Ready — Multi-entity",
    tier_type: "attachable_addon",
    attaches_to: "review_assist_pro",
    subscription_entity: ["company", "firm"],
    audit_ready_size: "multi_entity",
    limits: {
      max_entities: Number.MAX_SAFE_INTEGER,
      max_pbc_requests: Number.MAX_SAFE_INTEGER,
      max_auditor_users: 25,
    },
    pricing: {
      monthly_standard: 69900,
      yearly_standard: 699000,
      monthly_pilot: 48900,
      per_engagement_standard: 249900,
    },
    engagement_config: {
      prep_window_days: 90,
      hard_timeout_days: 180,
      renewal_price_pct: 50,
    },
    launch_phase: "v1.5_phase_3",
    status: "seeded_inactive",
  },
};

/**
 * Deterministic tier assignment given engagement facts.
 * See Track_C_Phase_1_Tier_Spec_v1_5.md §7A.2
 */
export function assignAuditReadyTier(input) {
  const { entity_count, pbc_request_count } = input;

  if (entity_count >= 5 || pbc_request_count > 400) return "multi_entity";
  if (
    entity_count >= 2 &&
    entity_count <= 5 &&
    pbc_request_count >= 150 &&
    pbc_request_count <= 400
  ) {
    return "complex";
  }
  if (entity_count <= 2 && pbc_request_count >= 50 && pbc_request_count <= 150) {
    return "standard";
  }
  return "small";
}
