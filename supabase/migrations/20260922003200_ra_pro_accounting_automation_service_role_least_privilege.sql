-- RA Pro accounting-automation corrective: service_role table least privilege.
-- History contract: 190 → 191.
-- Original dual migrations 20260917044537 / 20260917180140 remain committed.
-- This migration only revokes excess table DML from service_role and re-asserts
-- SELECT+INSERT. It does not recreate tables, drop policies/RLS/functions,
-- change default privileges, or touch provider/invoice data or row contents.

BEGIN;

DO $$
DECLARE
  hist int;
  v_weekly int;
  v_month int;
  t record;
  expected text[] := ARRAY[
    'ra_pro_weekly_completeness_runs',
    'ra_pro_weekly_completeness_findings',
    'ra_pro_month_end_review_packages'
  ];
  found int := 0;
BEGIN
  SELECT count(*)::int INTO hist FROM supabase_migrations.schema_migrations;
  IF hist <> 190 THEN
    RAISE EXCEPTION 'CORRECTIVE_HISTORY_COUNT_MISMATCH: got %, expected 190', hist
      USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*)::int INTO v_weekly
  FROM supabase_migrations.schema_migrations
  WHERE version = '20260917044537';
  SELECT count(*)::int INTO v_month
  FROM supabase_migrations.schema_migrations
  WHERE version = '20260917180140';
  IF v_weekly <> 1 OR v_month <> 1 THEN
    RAISE EXCEPTION
      'CORRECTIVE_ORIGINAL_VERSIONS_MISMATCH: weekly=% month=% (each must be exactly once)',
      v_weekly, v_month
      USING ERRCODE = 'P0001';
  END IF;

  IF to_regprocedure('public.persist_ra_pro_weekly_completeness(jsonb,jsonb)') IS NULL
     OR to_regprocedure('public.persist_ra_pro_month_end_review_package(jsonb)') IS NULL THEN
    RAISE EXCEPTION 'CORRECTIVE_PERSIST_FUNCTIONS_MISSING'
      USING ERRCODE = 'P0001';
  END IF;

  FOR t IN
    SELECT c.relname, pg_get_userbyid(c.relowner) AS owner_name, c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname = ANY (expected)
  LOOP
    found := found + 1;
    IF t.owner_name <> 'postgres' THEN
      RAISE EXCEPTION 'CORRECTIVE_TABLE_OWNER_MISMATCH: %.% owned by %',
        'public', t.relname, t.owner_name
        USING ERRCODE = 'P0001';
    END IF;
    IF t.relrowsecurity IS NOT TRUE THEN
      RAISE EXCEPTION 'CORRECTIVE_RLS_DISABLED: public.%', t.relname
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  IF found <> array_length(expected, 1) THEN
    RAISE EXCEPTION 'CORRECTIVE_TABLES_MISSING: found % of %', found, array_length(expected, 1)
      USING ERRCODE = 'P0001';
  END IF;
END $$;

REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.ra_pro_weekly_completeness_runs FROM service_role;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.ra_pro_weekly_completeness_findings FROM service_role;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.ra_pro_month_end_review_packages FROM service_role;

DO $$
BEGIN
  IF current_setting('server_version_num')::int >= 170000 THEN
    EXECUTE 'REVOKE MAINTAIN ON TABLE public.ra_pro_weekly_completeness_runs FROM service_role';
    EXECUTE 'REVOKE MAINTAIN ON TABLE public.ra_pro_weekly_completeness_findings FROM service_role';
    EXECUTE 'REVOKE MAINTAIN ON TABLE public.ra_pro_month_end_review_packages FROM service_role';
  END IF;
END $$;

REVOKE ALL ON TABLE public.ra_pro_weekly_completeness_runs FROM anon;
REVOKE ALL ON TABLE public.ra_pro_weekly_completeness_findings FROM anon;
REVOKE ALL ON TABLE public.ra_pro_month_end_review_packages FROM anon;

GRANT SELECT ON TABLE public.ra_pro_weekly_completeness_runs TO authenticated;
GRANT SELECT ON TABLE public.ra_pro_weekly_completeness_findings TO authenticated;
GRANT SELECT ON TABLE public.ra_pro_month_end_review_packages TO authenticated;

GRANT SELECT, INSERT ON TABLE public.ra_pro_weekly_completeness_runs TO service_role;
GRANT SELECT, INSERT ON TABLE public.ra_pro_weekly_completeness_findings TO service_role;
GRANT SELECT, INSERT ON TABLE public.ra_pro_month_end_review_packages TO service_role;

COMMIT;
