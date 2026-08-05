/**
 * Stripe webhook livemode enforcement.
 *
 * Rejects sandbox (event.livemode=false) events received on a LIVE-mode
 * webhook endpoint (and vice versa if EXPECT_LIVEMODE=false is configured
 * for a sandbox-only preview).
 *
 * Design (see /Critical_1_2_Webhook_Hardening_Research.md § Q1):
 *   - Return HTTP 200 (not 4xx) for a mismatch. A 4xx tells Stripe the
 *     delivery failed and triggers up-to-3-day retry storms; a 200 with
 *     no-op body is the documented pattern for "successfully received
 *     but intentionally ignored" events per Stripe webhook status-code
 *     semantics.
 *   - Log the mismatch to stripe_webhook_events with
 *     processing_status='rejected_livemode' + processing_error so ops
 *     can see when a misconfigured sandbox is pointed at LIVE.
 *
 * Sources:
 *   - https://docs.stripe.com/connect/webhooks  ("check the livemode value...
 *     you must define separate webhook endpoints for your sandbox accounts")
 *   - https://docs.stripe.com/webhooks         (retry/backoff semantics)
 *   - https://docs.stripe.com/api/events/object (livemode field on Event)
 */

/**
 * Returns the expected livemode boolean for the current runtime.
 *
 * Precedence:
 *   1. Explicit STRIPE_EXPECT_LIVEMODE env var ('true' / 'false').
 *   2. Fallback: NODE_ENV === 'production' → true, else false.
 */
export function getExpectedLivemode() {
  const explicit = process.env.STRIPE_EXPECT_LIVEMODE;
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

/**
 * Compares event.livemode against the expected value for this deployment.
 *
 * @param {{livemode?: boolean}} event Stripe Event object.
 * @returns {{ok: true} | {ok: false, expected: boolean, actual: boolean|null}}
 */
export function checkLivemode(event) {
  const expected = getExpectedLivemode();
  const actual = typeof event?.livemode === 'boolean' ? event.livemode : null;
  if (actual === expected) return { ok: true };
  return { ok: false, expected, actual };
}
