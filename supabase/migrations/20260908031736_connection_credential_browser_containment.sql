-- Stage-1 emergency credential browser containment
-- Objects: public.quickbooks_connections, public.accounting_connections, public.qbo_connections_unified
-- Scope: privilege + policy + safe view rebuild ONLY. No row data mutation. No FORCE RLS.
-- Rollback: docs/security/connection-credential-browser-containment/ROLLBACK_SECURITY_REGRESSION_BREAK_GLASS_ONLY.sql
-- Policy disposition: drop ALL browser policies including residual SELECT on accounting_connections.

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
-- 2) Remove all browser policies (including residual SELECT)
-- Catalog-verified names from production pre-change contract.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can access own QB connection" ON public.quickbooks_connections;
DROP POLICY IF EXISTS "users can update their accounting connections" ON public.accounting_connections;
DROP POLICY IF EXISTS "users can read their accounting connection metadata" ON public.accounting_connections;

-- ---------------------------------------------------------------------------
-- 3) Preserve / restore required service_role privileges
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.quickbooks_connections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.accounting_connections TO service_role;

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
-- 6) Fail-closed assertions (metadata only; no token values selected/emitted)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r text;
  t text;
  view_sql text;
  browser_policy_count integer;
  view_priv_count integer;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH t IN ARRAY ARRAY['public.quickbooks_connections', 'public.accounting_connections'] LOOP
      IF has_table_privilege(r, t, 'SELECT')
         OR has_table_privilege(r, t, 'INSERT')
         OR has_table_privilege(r, t, 'UPDATE')
         OR has_table_privilege(r, t, 'DELETE')
         OR has_table_privilege(r, t, 'TRUNCATE')
         OR has_table_privilege(r, t, 'REFERENCES')
         OR has_table_privilege(r, t, 'TRIGGER')
      THEN
        RAISE EXCEPTION 'ASSERT_FAIL: role % retains table privilege on %', r, t;
      END IF;

      IF has_column_privilege(r, t, 'access_token', 'SELECT')
         OR has_column_privilege(r, t, 'access_token', 'INSERT')
         OR has_column_privilege(r, t, 'access_token', 'UPDATE')
         OR has_column_privilege(r, t, 'refresh_token', 'SELECT')
         OR has_column_privilege(r, t, 'refresh_token', 'INSERT')
         OR has_column_privilege(r, t, 'refresh_token', 'UPDATE')
      THEN
        RAISE EXCEPTION 'ASSERT_FAIL: role % retains token-column privilege on %', r, t;
      END IF;
    END LOOP;

    IF has_table_privilege(r, 'public.qbo_connections_unified', 'SELECT')
       OR has_table_privilege(r, 'public.qbo_connections_unified', 'INSERT')
       OR has_table_privilege(r, 'public.qbo_connections_unified', 'UPDATE')
       OR has_table_privilege(r, 'public.qbo_connections_unified', 'DELETE')
       OR has_table_privilege(r, 'public.qbo_connections_unified', 'TRUNCATE')
       OR has_table_privilege(r, 'public.qbo_connections_unified', 'REFERENCES')
       OR has_table_privilege(r, 'public.qbo_connections_unified', 'TRIGGER')
    THEN
      RAISE EXCEPTION 'ASSERT_FAIL: role % retains privilege on qbo_connections_unified', r;
    END IF;
  END LOOP;

  -- No anon/authenticated/PUBLIC policies remain on either credential table
  SELECT count(*) INTO browser_policy_count
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('quickbooks_connections', 'accounting_connections')
    AND p.polname NOT IN (
      'service_role_all_quickbooks_connections',
      'service_role_all_accounting_connections'
    )
    AND (
      cardinality(p.polroles) = 0
      OR EXISTS (
        SELECT 1
        FROM unnest(p.polroles) AS u(oid)
        JOIN pg_roles r ON r.oid = u.oid
        WHERE r.rolname IN ('anon', 'authenticated')
      )
    );

  IF browser_policy_count > 0 THEN
    RAISE EXCEPTION 'ASSERT_FAIL: % non-service browser-applicable policies remain on credential tables', browser_policy_count;
  END IF;

  -- service_role required access
  IF NOT (
    has_table_privilege('service_role', 'public.quickbooks_connections', 'SELECT')
    AND has_table_privilege('service_role', 'public.quickbooks_connections', 'INSERT')
    AND has_table_privilege('service_role', 'public.quickbooks_connections', 'UPDATE')
    AND has_table_privilege('service_role', 'public.quickbooks_connections', 'DELETE')
    AND has_table_privilege('service_role', 'public.accounting_connections', 'SELECT')
    AND has_table_privilege('service_role', 'public.accounting_connections', 'INSERT')
    AND has_table_privilege('service_role', 'public.accounting_connections', 'UPDATE')
    AND has_table_privilege('service_role', 'public.accounting_connections', 'DELETE')
    AND has_table_privilege('service_role', 'public.qbo_connections_unified', 'SELECT')
  ) THEN
    RAISE EXCEPTION 'ASSERT_FAIL: service_role missing required privileges';
  END IF;

  -- View: no token columns; security_invoker; service-only
  view_sql := pg_get_viewdef('public.qbo_connections_unified'::regclass, true);
  IF view_sql ~* 'access_token' OR view_sql ~* 'refresh_token' THEN
    RAISE EXCEPTION 'ASSERT_FAIL: rebuilt view still references token columns';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'qbo_connections_unified'
      AND c.reloptions @> ARRAY['security_invoker=true']
  ) THEN
    RAISE EXCEPTION 'ASSERT_FAIL: qbo_connections_unified missing security_invoker=true';
  END IF;

  SELECT count(*) INTO view_priv_count
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name = 'qbo_connections_unified'
    AND grantee IN ('anon', 'authenticated', 'PUBLIC');

  IF view_priv_count > 0 THEN
    RAISE EXCEPTION 'ASSERT_FAIL: browser/PUBLIC grants remain on qbo_connections_unified';
  END IF;

  -- RLS remains enabled (not forced as column security)
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
END $$;

COMMIT;
