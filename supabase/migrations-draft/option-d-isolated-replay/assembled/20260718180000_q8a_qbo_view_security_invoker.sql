-- Phase Q8a: Restore security_invoker on qbo_connections_unified view
-- 
-- Root cause: 20260707214500_d65_p2_block7a2_prepilot_security.sql:93
-- set security_invoker=true in July 2026, but two later CREATE OR REPLACE VIEW
-- migrations (20260708_01_d1_qbo_write_readiness.sql and
-- 20260717130000_tcp1_w3_erp_connections_disconnected_at.sql) recreated the
-- view without preserving the option. Postgres silently reset reloptions
-- to NULL, causing the Supabase advisor to flag security_definer_view (ERROR).
--
-- All callers (lib/close-packet/renderer.js, lib/erp/quickbooks/*, etc.) use
-- getSupabaseAdmin() which bypasses RLS regardless, so no behavior change for
-- the app. Anon/authenticated access continues to be governed by RLS on the
-- underlying accounting_connections table.
--
-- Rollback: ALTER VIEW public.qbo_connections_unified RESET (security_invoker);

DO $$
BEGIN
  IF to_regclass('public.qbo_connections_unified') IS NOT NULL THEN
    ALTER VIEW public.qbo_connections_unified SET (security_invoker = true);
  END IF;
END $$;

-- Assertion: fail loud if option not present
DO $$
DECLARE
  v_opts text[];
BEGIN
  SELECT reloptions INTO v_opts
  FROM pg_class
  WHERE relname = 'qbo_connections_unified'
    AND relnamespace = 'public'::regnamespace;

  IF v_opts IS NULL OR NOT ('security_invoker=true' = ANY(v_opts)) THEN
    RAISE EXCEPTION 'q8a: qbo_connections_unified missing security_invoker=true after migration (got: %)', v_opts;
  END IF;
END $$;

-- Test helper: exposes pg_class.reloptions via a read-only view so vitest
-- integration tests can assert view options without needing a bespoke RPC.
-- Read-only, service-role-only in practice (RLS not applicable to system catalogs).
CREATE OR REPLACE VIEW public.pg_class_reloptions_view
WITH (security_invoker = true)
AS
SELECT
  c.relname,
  c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public';

REVOKE ALL ON public.pg_class_reloptions_view FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pg_class_reloptions_view TO service_role, postgres;
