-- SECURITY_REGRESSION_BREAK_GLASS_ONLY
-- Restores the sealed Stage-1 pre-change privilege/policy/view contract for:
--   public.quickbooks_connections
--   public.accounting_connections
--   public.qbo_connections_unified
--
-- WARNING: Applying this rollback REOPENS the confirmed HIGH-severity browser
-- credential exposure, including the residual authenticated SELECT policy
-- "users can read their accounting connection metadata" (which, together with
-- restored table grants, again permits owner token-column SELECT).
-- Use only if an immediate material production outage cannot be resolved
-- safely after the forward containment migration.
--
-- This rollback does NOT:
-- - restore row data or token values
-- - rotate/revoke tokens
-- - change environments / Vercel / Intuit config
-- - delete connections
-- - weaken unrelated objects
--
-- Sealed against: docs/security/connection-credential-browser-containment/PRE_CHANGE_CONTRACT.json
-- (pre-change production state — not the desired forward contained state)

BEGIN;

-- Recreate original token-bearing view (exact sealed definition)
DROP VIEW IF EXISTS public.qbo_connections_unified;

CREATE VIEW public.qbo_connections_unified
WITH (security_invoker = true)
AS
SELECT
  'accounting_connections'::text AS source_table,
  id AS connection_id,
  user_id,
  access_token,
  refresh_token,
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

-- Restore original policies (exact catalog-verified pre-change names)
DROP POLICY IF EXISTS service_role_all_quickbooks_connections ON public.quickbooks_connections;

DROP POLICY IF EXISTS "Users can access own QB connection" ON public.quickbooks_connections;
CREATE POLICY "Users can access own QB connection"
  ON public.quickbooks_connections
  FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can update their accounting connections" ON public.accounting_connections;
CREATE POLICY "users can update their accounting connections"
  ON public.accounting_connections
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users can read their accounting connection metadata" ON public.accounting_connections;
CREATE POLICY "users can read their accounting connection metadata"
  ON public.accounting_connections
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS service_role_all_accounting_connections ON public.accounting_connections;
CREATE POLICY service_role_all_accounting_connections
  ON public.accounting_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_connections ENABLE ROW LEVEL SECURITY;

-- Restore sealed grants (anon / authenticated / service_role / postgres)
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.quickbooks_connections TO anon, authenticated, service_role, postgres;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.accounting_connections TO anon, authenticated, service_role, postgres;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.qbo_connections_unified TO anon, authenticated, service_role, postgres;

COMMIT;
