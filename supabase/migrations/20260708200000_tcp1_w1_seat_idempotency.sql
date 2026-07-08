-- Phase TCP1 W1 — Seat idempotency: enforce one active seat per (item, company)
-- and add billing_period_anchor for meter-event idempotency identifier.
-- Additive only. Safe to re-run.

-- 1) Add billing_period_anchor column to record which period the seat was last billed for.
--    NULL until first successful meter emit. Populated by activateSeat().
ALTER TABLE public.subscription_seats
  ADD COLUMN IF NOT EXISTS billing_period_anchor timestamptz NULL;

-- 2) Add last_meter_event_id to record the deterministic identifier we used.
--    Purely audit — lets us reconcile against Stripe.
ALTER TABLE public.subscription_seats
  ADD COLUMN IF NOT EXISTS last_meter_event_id text NULL;

-- 3) Partial unique index — only one active seat per (item, company) at any time.
--    Released seats do not block re-activation. This is the primary app-side guard.
CREATE UNIQUE INDEX IF NOT EXISTS subscription_seats_active_unique
  ON public.subscription_seats (subscription_item_id, company_id)
  WHERE status = 'active';

-- 4) Index for reconciliation queries by billing period.
CREATE INDEX IF NOT EXISTS subscription_seats_period_lookup
  ON public.subscription_seats (subscription_item_id, billing_period_anchor)
  WHERE billing_period_anchor IS NOT NULL;

COMMENT ON COLUMN public.subscription_seats.billing_period_anchor IS
  'ISO period_start of the subscription when this seat was billed. Used to build deterministic Stripe meter_event identifier: sha1(subscription_item_id + company_id + iso(period_start)).';

COMMENT ON COLUMN public.subscription_seats.last_meter_event_id IS
  'Deterministic identifier passed to Stripe billing.meterEvents.create. Same value across retries within a billing period → Stripe deduplicates (24h window).';

COMMENT ON INDEX public.subscription_seats_active_unique IS
  'Phase TCP1 W1: prevents duplicate active client seats for the same (subscription_item, company). Toggling seat off then on within a period reuses the existing row.';
