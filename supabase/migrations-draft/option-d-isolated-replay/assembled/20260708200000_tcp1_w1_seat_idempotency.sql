-- Phase TCP1 W1 — Seat meter-event idempotency anchor.
-- Additive only. Adds billing_period_anchor + a period-lookup index.
-- We REUSE the existing stripe_usage_event_id column for the deterministic
-- identifier, and we REUSE the existing uq_subscription_seats_active_company
-- unique index as the app-side lifecycle guard.

-- 1) Period anchor — which billing period this seat was last billed for.
ALTER TABLE public.subscription_seats
  ADD COLUMN IF NOT EXISTS billing_period_anchor timestamptz NULL;

-- 2) Reconciliation index by period.
CREATE INDEX IF NOT EXISTS subscription_seats_period_lookup
  ON public.subscription_seats (subscription_item_id, billing_period_anchor)
  WHERE billing_period_anchor IS NOT NULL;

COMMENT ON COLUMN public.subscription_seats.billing_period_anchor IS
  'ISO period_start of the subscription when this seat was billed. Used to build deterministic Stripe meter_event identifier: sha1(subscription_item_id + company_id + iso(period_start)).';

COMMENT ON COLUMN public.subscription_seats.stripe_usage_event_id IS
  'Deterministic identifier passed to Stripe billing.meterEvents.create. Same value across retries within a billing period → Stripe deduplicates (24h window). Populated by activateSeat().';
