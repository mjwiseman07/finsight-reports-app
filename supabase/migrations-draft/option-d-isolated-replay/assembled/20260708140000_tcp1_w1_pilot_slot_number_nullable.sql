-- Phase TCP1 W1 — Corrective migration for standard-track pilot_slots rows.
--
-- The initial migration (20260708120000) required pilot_slot_number NOT NULL
-- and made (tier_key, pilot_slot_number) globally unique. That blocks the
-- second standard-track subscriber to the same tier because both would take
-- the sentinel value 1000. Fix by:
--   1. Allowing pilot_slot_number NULL for standard-track rows.
--   2. Replacing the global unique constraint with a partial unique index
--      that only enforces uniqueness for pilot_slot_number > 0 (the pilot
--      cohort and complimentary slot 0).
--
-- Additive-only: existing rows are untouched (all had slot_number >= 0).
-- Ref: LOCK-TCP1-W1-AUDIT-CORRECTIVE-PATCH-v1.0
BEGIN;
-- 1. Drop the strict slot_number check that required >= 0.
ALTER TABLE public.pilot_slots
  DROP CONSTRAINT IF EXISTS pilot_slots_slot_number_check;
ALTER TABLE public.pilot_slots
  ADD CONSTRAINT pilot_slots_slot_number_check
  CHECK (pilot_slot_number IS NULL OR pilot_slot_number >= 0);
-- 2. Allow NULL for standard-track subscribers.
ALTER TABLE public.pilot_slots
  ALTER COLUMN pilot_slot_number DROP NOT NULL;
-- 3. Replace the global unique constraint with a partial unique index.
--    Only pilot cohort slots (> 0) and complimentary slot 0 need uniqueness.
--    Standard-track NULL rows never collide.
ALTER TABLE public.pilot_slots
  DROP CONSTRAINT IF EXISTS pilot_slots_unique_slot_per_tier;
CREATE UNIQUE INDEX IF NOT EXISTS pilot_slots_unique_slot_per_tier_partial
  ON public.pilot_slots (tier_key, pilot_slot_number)
  WHERE pilot_slot_number IS NOT NULL;
COMMENT ON INDEX public.pilot_slots_unique_slot_per_tier_partial IS
  'Enforces uniqueness of pilot cohort slots (1-10) and complimentary slot 0 per tier. Standard-track subscribers with pilot_slot_number IS NULL are exempt. Ref LOCK-TCP1-W1-AUDIT-CORRECTIVE-PATCH-v1.0.';
COMMIT;
