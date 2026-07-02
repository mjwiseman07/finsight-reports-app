// Refund policy constants. Single source of truth — the Refund Policy document
// (public) and the /refund-policy page MUST match these values.
// Changing any value here without updating the policy doc is a compliance bug.

/**
 * 30-day window from first successful charge.
 * See Refund Policy Section 2.1.
 */
export const REFUND_WINDOW_DAYS = 30;

/**
 * Path definitions. See Refund Policy Section 6.
 * A = Pilot, within window, auto-execute
 * B = Standard, within window, founder review
 * C = Outside window, strict denial
 */
export const REFUND_PATHS = Object.freeze({
  A: 'A',
  B: 'B',
  C: 'C',
});

/**
 * Tier → path mapping for in-window requests.
 * Anything not listed here defaults to Path B (safer to require review than auto-refund).
 */
export const TIER_TO_INWINDOW_PATH = Object.freeze({
  pilot: 'A',
  standard: 'B',
});

/**
 * Lookup-key prefixes that indicate metered/usage-based line items.
 * These are non-refundable per Refund Policy Section 4.
 * Must match lookup keys in Stripe — verify against `lib/product-tiers.js`.
 */
export const METERED_LOOKUP_KEY_PREFIXES = Object.freeze([
  'seat_overage_',
  'metered_',
]);

/**
 * Sentiment triggers that fire silent founder escalation.
 * Case-insensitive substring match against customer message.
 * Do NOT surface these terms to the customer. Do NOT include them in any
 * customer-facing response.
 */
export const SENTIMENT_TRIGGERS = Object.freeze([
  'chargeback',
  'charge back',
  'dispute',
  'attorney',
  'lawyer',
  'legal action',
  'sue',
  'bbb',
  'better business bureau',
  'scam',
  'fraud',
  'fraudulent',
  'ripoff',
  'rip off',
  'ripped off',
  'consumer protection',
  'attorney general',
]);

/**
 * Additional signals that indicate an "upset" customer without necessarily
 * triggering a chargeback-tier escalation. These fire the softer escalation
 * (founder alert but no immediate contest posture).
 */
export const UPSET_TRIGGERS = Object.freeze([
  'refuse',
  'unacceptable',
  'terrible',
  'worst',
  'furious',
  'outraged',
]);

/**
 * Email addresses. Public inbox is customer-facing; founder alerts are silent.
 * Overridable via env for staging/testing.
 */
export function getRefundEmailConfig() {
  return {
    publicInbox:
      process.env.REFUNDS_INBOX_EMAIL ||
      process.env.REFUNDS_EMAIL ||
      'refunds@advisacor.com',
    founderAlerts: (process.env.FOUNDER_ALERT_EMAILS || 'jwiseman@advisacor.com,mwiseman@advisacor.com')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    fromCustomer: process.env.REFUNDS_FROM_EMAIL || 'Advisacor Refunds <refunds@advisacor.com>',
    fromFounderAlert: process.env.FOUNDER_ALERT_FROM_EMAIL || 'Advisacor Alerts <alerts@advisacor.com>',
  };
}
