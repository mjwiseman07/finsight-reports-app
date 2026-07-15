-- Phase TCP1 W3 — Add soft-delete support to erp_connections.
--
-- Context:
--   - accounting_connections has a `status` column (defaults 'connected')
--   - erp_connections has no status column — rows are implicitly "connected"
--     (the qbo_connections_unified view hardcodes status='connected')
--
-- To support user- and Intuit-initiated QuickBooks disconnect, we need
-- a way to mark erp_connections rows disconnected without deleting them
-- (audit trail, refund debugging, reconnect UX).
--
-- Strategy: additive, nullable timestamp column. NULL = connected. NOT NULL
-- = disconnected at that timestamp. View is updated to filter out
-- disconnected rows so downstream consumers see the same shape as before.

-- Step 1: add the column (idempotent)
DO $$
BEGIN
  IF to_regclass('public.erp_connections') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'erp_connections'
        AND column_name = 'disconnected_at'
    ) THEN
      ALTER TABLE public.erp_connections
        ADD COLUMN disconnected_at timestamptz NULL;
    END IF;
  END IF;
END $$;

-- Step 2: index for fast filter on the disconnect path
DO $$
BEGIN
  IF to_regclass('public.erp_connections') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS erp_connections_disconnected_at_idx
      ON public.erp_connections (disconnected_at)
      WHERE disconnected_at IS NOT NULL;
  END IF;
END $$;

-- Step 3: rewrite the unified view to hide disconnected rows.
-- Preserves the exact column shape from the original 20260708 migration.
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
      AND ec.disconnected_at IS NULL
  $erp$;
BEGIN
  IF to_regclass('public.erp_connections') IS NOT NULL THEN
    EXECUTE 'CREATE OR REPLACE VIEW qbo_connections_unified AS ' || base_sql || erp_sql;
  ELSE
    EXECUTE 'CREATE OR REPLACE VIEW qbo_connections_unified AS ' || base_sql;
  END IF;
END $$;
