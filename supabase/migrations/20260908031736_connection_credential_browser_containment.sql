-- Stage-1 emergency credential browser containment
-- Objects: public.quickbooks_connections, public.accounting_connections, public.qbo_connections_unified
-- Scope: privilege + policy + safe view rebuild ONLY. No row data mutation. No FORCE RLS.
-- Rollback: docs/security/connection-credential-browser-containment/ROLLBACK_SECURITY_REGRESSION_BREAK_GLASS_ONLY.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Dependency gate for view rebuild (no CASCADE ever)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  dep_count integer;
  dep_names text;
BEGIN
  SELECT count(*), string_agg(format('%s.%s', n.nspname, c.relname), ', ' ORDER BY n.nspname, c.relname)
  INTO dep_count, dep_names
  FROM pg_depend d
  JOIN pg_rewrite r ON r.oid = d.objid
  JOIN pg_class c ON c.oid = r.ev_class
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE d.refobjid = 'public.qbo_connections_unified'::regclass
    AND c.oid <> 'public.qbo_connections_unified'::regclass
    AND d.deptype <> 'i';

  IF dep_count > 0 THEN
    RAISE EXCEPTION 'DEPENDENCY_BLOCKED: cannot DROP VIEW public.qbo_connections_unified safely; dependents present (%). Refusing forced drop.', dep_names;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Revoke browser / PUBLIC privileges on credential surfaces
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.quickbooks_connections FROM PUBLIC;
REVOKE ALL ON TABLE public.quickbooks_connections FROM anon;
REVOKE ALL ON TABLE public.quickbooks_connections FROM authenticated;

REVOKE ALL ON TABLE public.accounting_connections FROM PUBLIC;
REVOKE ALL ON TABLE public.accounting_connections FROM anon;
REVOKE ALL ON TABLE public.accounting_connections FROM authenticated;

REVOKE ALL ON TABLE public.qbo_connections_unified FROM PUBLIC;
REVOKE ALL ON TABLE public.qbo_connections_unified FROM anon;
REVOKE ALL ON TABLE public.qbo_connections_unified FROM authenticated;

-- ---------------------------------------------------------------------------
-- 2) Remove browser-write / browser credential policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can access own QB connection" ON public.quickbooks_connections;
DROP POLICY IF EXISTS "users can update their accounting connections" ON public.accounting_connections;
-- SELECT policy remains for defense-in-depth IF grants are ever re-added, but Stage-1
-- grants are zero for browser roles. Keep the SELECT policy name for clarity that
-- row filtering exists; privilege removal is the Stage-1 confidentiality control.
-- Do NOT keep UPDATE.

-- ---------------------------------------------------------------------------
-- 3) Preserve / restore required service_role privileges
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.quickbooks_connections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.accounting_connections TO service_role;

-- Ensure service_role ALL policies remain (defense-in-depth even if BYPASSRLS changes)
DROP POLICY IF EXISTS service_role_all_accounting_connections ON public.accounting_connections;
CREATE POLICY service_role_all_accounting_connections
  ON public.accounting_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all_quickbooks_connections ON public.quickbooks_connections;
CREATE POLICY service_role_all_quickbooks_connections
  ON public.quickbooks_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4) Keep RLS enabled (do not FORCE)
-- ---------------------------------------------------------------------------
ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_connections ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5) Rebuild unified view without credential columns (DROP without CASCADE)
-- ---------------------------------------------------------------------------
DROP VIEW public.qbo_connections_unified;

CREATE VIEW public.qbo_connections_unified
WITH (security_invoker = true)
AS
SELECT
  'accounting_connections'::text AS source_table,
  id AS connection_id,
  user_id,
  tenant_or_realm_id AS realm_id,
  token_expires_at AS token_expiry,
  scopes AS granted_scopes,
  status,
  created_at,
  updated_at
FROM public.accounting_connections ac
WHERE provider = 'quickbooks'::text
  AND status = 'connected'::text;

ALTER VIEW public.qbo_connections_unified OWNER TO postgres;
REVOKE ALL ON TABLE public.qbo_connections_unified FROM PUBLIC;
REVOKE ALL ON TABLE public.qbo_connections_unified FROM anon;
REVOKE ALL ON TABLE public.qbo_connections_unified FROM authenticated;
GRANT SELECT ON TABLE public.qbo_connections_unified TO service_role;

-- ---------------------------------------------------------------------------
-- 6) Fail-closed assertions (no token values selected)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  view_sql text;
  bad boolean;
BEGIN
  -- Browser cannot SELECT token columns on base tables
  IF has_column_privilege('anon', 'public.quickbooks_connections', 'access_token', 'SELECT')
     OR has_column_privilege('anon', 'public.quickbooks_connections', 'refresh_token', 'SELECT')
     OR has_column_privilege('authenticated', 'public.quickbooks_connections', 'access_token', 'SELECT')
     OR has_column_privilege('authenticated', 'public.quickbooks_connections', 'refresh_token', 'SELECT')
     OR has_column_privilege('anon', 'public.accounting_connections', 'access_token', 'SELECT')
     OR has_column_privilege('anon', 'public.accounting_connections', 'refresh_token', 'SELECT')
     OR has_column_privilege('authenticated', 'public.accounting_connections', 'access_token', 'SELECT')
     OR has_column_privilege('authenticated', 'public.accounting_connections', 'refresh_token', 'SELECT')
  THEN
    RAISE EXCEPTION 'ASSERT_FAIL: browser roles can still SELECT token columns';
  END IF;

  -- Browser cannot INSERT/UPDATE/DELETE either base table
  IF has_table_privilege('anon', 'public.quickbooks_connections', 'INSERT')
     OR has_table_privilege('anon', 'public.quickbooks_connections', 'UPDATE')
     OR has_table_privilege('anon', 'public.quickbooks_connections', 'DELETE')
     OR has_table_privilege('authenticated', 'public.quickbooks_connections', 'INSERT')
     OR has_table_privilege('authenticated', 'public.quickbooks_connections', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.quickbooks_connections', 'DELETE')
     OR has_table_privilege('anon', 'public.accounting_connections', 'INSERT')
     OR has_table_privilege('anon', 'public.accounting_connections', 'UPDATE')
     OR has_table_privilege('anon', 'public.accounting_connections', 'DELETE')
     OR has_table_privilege('authenticated', 'public.accounting_connections', 'INSERT')
     OR has_table_privilege('authenticated', 'public.accounting_connections', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.accounting_connections', 'DELETE')
  THEN
    RAISE EXCEPTION 'ASSERT_FAIL: browser roles retain write privileges on credential tables';
  END IF;

  -- Browser cannot SELECT the view
  IF has_table_privilege('anon', 'public.qbo_connections_unified', 'SELECT')
     OR has_table_privilege('authenticated', 'public.qbo_connections_unified', 'SELECT')
  THEN
    RAISE EXCEPTION 'ASSERT_FAIL: browser roles can SELECT qbo_connections_unified';
  END IF;

  -- service_role retains required DML on base tables
  IF NOT (
    has_table_privilege('service_role', 'public.quickbooks_connections', 'SELECT')
    AND has_table_privilege('service_role', 'public.quickbooks_connections', 'INSERT')
    AND has_table_privilege('service_role', 'public.quickbooks_connections', 'UPDATE')
    AND has_table_privilege('service_role', 'public.quickbooks_connections', 'DELETE')
    AND has_table_privilege('service_role', 'public.accounting_connections', 'SELECT')
    AND has_table_privilege('service_role', 'public.accounting_connections', 'INSERT')
    AND has_table_privilege('service_role', 'public.accounting_connections', 'UPDATE')
    AND has_table_privilege('service_role', 'public.accounting_connections', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'ASSERT_FAIL: service_role missing required base-table privileges';
  END IF;

  -- service_role can access safe view
  IF NOT has_table_privilege('service_role', 'public.qbo_connections_unified', 'SELECT') THEN
    RAISE EXCEPTION 'ASSERT_FAIL: service_role cannot SELECT qbo_connections_unified';
  END IF;

  -- View definition contains no token columns
  view_sql := pg_get_viewdef('public.qbo_connections_unified'::regclass, true);
  IF view_sql ~* 'access_token' OR view_sql ~* 'refresh_token' THEN
    RAISE EXCEPTION 'ASSERT_FAIL: rebuilt view still references token columns';
  END IF;

  -- View is security_invoker
  SELECT NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'qbo_connections_unified'
      AND c.reloptions @> ARRAY['security_invoker=true']
  ) INTO bad;
  IF bad THEN
    RAISE EXCEPTION 'ASSERT_FAIL: qbo_connections_unified missing security_invoker=true';
  END IF;

  -- RLS remains enabled (not forced)
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'quickbooks_connections' AND c.relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'accounting_connections' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'ASSERT_FAIL: RLS not enabled on credential tables';
  END IF;

  -- No remaining browser-write policy on either table
  IF EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'quickbooks_connections'
      AND p.polcmd IN ('*', 'a', 'w', 'd')
      AND p.polname <> 'service_role_all_quickbooks_connections'
      AND (
        cardinality(p.polroles) = 0
        OR EXISTS (
          SELECT 1 FROM unnest(p.polroles) u(oid)
          JOIN pg_roles r ON r.oid = u.oid
          WHERE r.rolname IN ('anon', 'authenticated')
        )
      )
  ) THEN
    RAISE EXCEPTION 'ASSERT_FAIL: browser-capable write policy remains on quickbooks_connections';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'accounting_connections'
      AND p.polcmd IN ('*', 'a', 'w', 'd')
      AND p.polname <> 'service_role_all_accounting_connections'
      AND (
        cardinality(p.polroles) = 0
        OR EXISTS (
          SELECT 1 FROM unnest(p.polroles) u(oid)
          JOIN pg_roles r ON r.oid = u.oid
          WHERE r.rolname IN ('anon', 'authenticated')
        )
      )
  ) THEN
    RAISE EXCEPTION 'ASSERT_FAIL: browser-capable write policy remains on accounting_connections';
  END IF;
END $$;

COMMIT;
