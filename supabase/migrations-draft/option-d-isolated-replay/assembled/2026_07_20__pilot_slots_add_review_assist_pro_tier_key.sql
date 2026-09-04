-- File: supabase/migrations/2026_07_20__pilot_slots_add_review_assist_pro_tier_key.sql
--
-- Phase DEMO-1 — Widen pilot_slots.tier_key CHECK constraint to include
-- review_assist_pro (defined in lib/entitlements.ts but never added to the
-- constraint) and a reserved audit_ready tier_key for later.
--
-- Additive-only. No data changes. Existing rows are unaffected.

BEGIN;

-- Pre-flight: prove no existing row would be excluded by the new list.
-- (This is defensive; the current list is a subset of the new list.)
DO $$
DECLARE
  bad_count INTEGER;
  bad_examples TEXT;
BEGIN
  SELECT COUNT(*), COALESCE(string_agg(DISTINCT tier_key, ', '), '')
    INTO bad_count, bad_examples
    FROM pilot_slots
   WHERE tier_key NOT IN (
     'solo_bookkeeper',
     'owner_lite',
     'owner_pro',
     'accounting_pro',
     'firm',
     'enterprise_firm',
     'industry_premium',
     'client_seat_alacarte',
     'review_assist',
     'review_assist_pro',
     'audit_ready'
   );

  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'Pre-flight failure: % existing pilot_slots rows have tier_key values outside the widened whitelist: %',
      bad_count, bad_examples;
  END IF;
END $$;

-- Drop the old constraint and add the widened one.
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
    'review_assist'::text,
    'review_assist_pro'::text,
    'audit_ready'::text
  ]));

-- Verify the new constraint by attempting a positive fixture insert into a
-- transaction-scoped SAVEPOINT (rolled back so no side-effects).
DO $$
DECLARE
  test_firm_id UUID;
BEGIN
  -- Pick any real firm id; the seed row is rolled back below.
  SELECT id INTO test_firm_id FROM public.firms LIMIT 1;

  IF test_firm_id IS NULL THEN
    RAISE NOTICE 'No firms present; skipping smoke insert (constraint verified structurally).';
    RETURN;
  END IF;

  BEGIN
    -- Schema adaptation: pilot_slots_complimentary_cap_check requires
    -- complimentary_client_cap > 0 when pilot_status = 'complimentary'.
    INSERT INTO public.pilot_slots (
      id, firm_id, tier_key, pilot_status,
      pricing_structure, pricing_cadence,
      complimentary_client_cap
    ) VALUES (
      gen_random_uuid(), test_firm_id, 'review_assist_pro', 'complimentary',
      'complimentary', 'monthly',
      1
    );
    RAISE EXCEPTION 'Rolling back smoke insert (this exception message is expected).';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%Rolling back smoke insert%' THEN
        RAISE;
      END IF;
  END;
END $$;

COMMIT;
