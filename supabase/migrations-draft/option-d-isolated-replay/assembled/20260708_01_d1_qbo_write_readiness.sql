-- ============================================================================
-- Advisacor Doc D — Block D1: QBO Write Readiness
-- Idempotent. Additive only. No changes to existing OAuth or read paths.
--   1. Per-firm_client write feature flag + health-check tracking columns
--   2. Unified QBO connection view across accounting_connections + erp_connections
--   3. Health-check audit trail table
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1.1 firm_clients write-flag + health columns
-- ---------------------------------------------------------------------------
ALTER TABLE firm_clients
  ADD COLUMN IF NOT EXISTS qbo_write_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qbo_write_enabled_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS qbo_write_enabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS qbo_last_health_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS qbo_last_health_check_status text
    CHECK (qbo_last_health_check_status IN (
      'healthy','token_expired','refresh_failed','realm_invalid','scope_missing','unknown_error'
    ));

CREATE INDEX IF NOT EXISTS idx_firm_clients_qbo_write_enabled
  ON firm_clients(qbo_write_enabled) WHERE qbo_write_enabled = true;

-- ---------------------------------------------------------------------------
-- 1.2 Unified connection view
-- Built with dynamic SQL so the migration is safe whether or not the legacy
-- erp_connections table exists in this environment. accounting_connections is
-- always present (created in 20260531). When erp_connections exists we UNION it.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  base_sql text := $view$
    SELECT
      'accounting_connections'::text AS source_table,
      ac.id AS connection_id,
      ac.user_id,
      ac.access_token,
      ac.refresh_token,
      ac.tenant_or_realm_id AS realm_id,
      ac.token_expires_at AS token_expiry,
      ac.scopes AS granted_scopes,
      ac.status,
      ac.created_at,
      ac.updated_at
    FROM accounting_connections ac
    WHERE ac.provider = 'quickbooks'
      AND ac.status = 'connected'
  $view$;
  erp_sql text := $erp$
    UNION ALL
    SELECT
      'erp_connections'::text AS source_table,
      ec.id AS connection_id,
      ec.user_id,
      ec.access_token,
      ec.refresh_token,
      ec.realm_id,
      ec.token_expiry,
      ARRAY['com.intuit.quickbooks.accounting']::text[] AS granted_scopes,
      'connected'::text AS status,
      ec.created_at,
      ec.updated_at
    FROM erp_connections ec
    WHERE ec.platform = 'quickbooks'
  $erp$;
BEGIN
  IF to_regclass('public.erp_connections') IS NOT NULL THEN
    EXECUTE 'CREATE OR REPLACE VIEW qbo_connections_unified AS ' || base_sql || erp_sql;
  ELSE
    EXECUTE 'CREATE OR REPLACE VIEW qbo_connections_unified AS ' || base_sql;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1.3 Health check audit trail
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qbo_health_check_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id uuid NOT NULL REFERENCES firm_clients(id) ON DELETE CASCADE,
  check_status text NOT NULL CHECK (check_status IN (
    'healthy','token_expired','refresh_failed','realm_invalid','scope_missing','unknown_error'
  )),
  token_source text CHECK (token_source IN ('erp_connections','accounting_connections','none')),
  realm_id text,
  granted_scopes text[],
  error_message text,
  latency_ms integer,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qbo_health_client_time
  ON qbo_health_check_log(firm_client_id, checked_at DESC);

ALTER TABLE qbo_health_check_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage qbo health log" ON qbo_health_check_log;
CREATE POLICY "Super admins manage qbo health log"
  ON qbo_health_check_log FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');
