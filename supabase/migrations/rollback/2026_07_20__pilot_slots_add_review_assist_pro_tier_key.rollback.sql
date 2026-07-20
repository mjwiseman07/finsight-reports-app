-- Rollback for 2026_07_20__pilot_slots_add_review_assist_pro_tier_key.sql
-- Restores the exact original constraint definition.
-- Runbook artifact only — not applied by supabase db push.

BEGIN;

-- Refuse to roll back if any rows would be orphaned by the narrower constraint.
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
    FROM pilot_slots
   WHERE tier_key IN ('review_assist_pro', 'audit_ready');

  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Cannot roll back: % pilot_slots rows would violate the narrower constraint. Delete or re-tier them first.',
      orphan_count;
  END IF;
END $$;

ALTER TABLE public.pilot_slots
  DROP CONSTRAINT IF EXISTS pilot_slots_tier_key_check;

ALTER TABLE public.pilot_slots
  ADD CONSTRAINT pilot_slots_tier_key_check
  CHECK (tier_key = ANY (ARRAY[
    'solo_bookkeeper'::text,
    'owner_lite'::text,
    'owner_pro'::text,
    'accounting_pro'::text,
    'firm'::text,
    'enterprise_firm'::text,
    'industry_premium'::text,
    'client_seat_alacarte'::text,
    'review_assist'::text
  ]));

COMMIT;
