-- Phase TCP1 W2.5 — Review Assist tier_key CHECK expansion.
-- LOCK-TCP1-W2-5-REVIEW-ASSIST-BLOCK-2-2026-07-09
--
-- Rationale: Review Assist ($99/mo, $990/yr) launches W2.5 as a firm-tier SKU.
-- Live Stripe SKUs exist (Block 1). Need to add 'review_assist' to
-- pilot_slots_tier_key_check so checkout.session.completed webhook can insert
-- a pilot_slots row for Review Assist subscribers.
--
-- Safety:
--   - Additive only. Existing 8 tier_key values preserved verbatim.
--   - pilot_slots is empty in prod (David Prussen baseline is the only row,
--     tier_key='solo_bookkeeper', unaffected).
--   - No backfill. No data mutation.
--   - Idempotent: DROP IF EXISTS then CREATE.
--
-- Values (superset of prior constraint from 20260708120000):
--   'solo_bookkeeper','owner_lite','owner_pro','accounting_pro',
--   'firm','enterprise_firm','industry_premium','client_seat_alacarte',
--   'review_assist'   -- NEW

BEGIN;

ALTER TABLE public.pilot_slots
  DROP CONSTRAINT IF EXISTS pilot_slots_tier_key_check;

ALTER TABLE public.pilot_slots
  ADD CONSTRAINT pilot_slots_tier_key_check
  CHECK (tier_key IN (
    'solo_bookkeeper',
    'owner_lite',
    'owner_pro',
    'accounting_pro',
    'firm',
    'enterprise_firm',
    'industry_premium',
    'client_seat_alacarte',
    'review_assist'
  ));

COMMENT ON CONSTRAINT pilot_slots_tier_key_check ON public.pilot_slots IS
  'Allowed pilot_slots.tier_key values. Extended for Review Assist W2.5.';

COMMIT;
