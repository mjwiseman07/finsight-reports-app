-- OPTION D SUBSTITUTION — isolated clean-replay candidate only
-- Replaces: supabase/migrations/20260814221500_accounting_canonical_connected_grant.sql
-- Does NOT modify active supabase/migrations/ or production schema_migrations.
--
-- Justification (omission of prod operational body):
--   Original migration asserts Demo Xero duplicate connected-grant shape and
--   RAISE EXCEPTION when production rows are absent — blocks data-less replay.
--   Required schema invariant retained: partial UNIQUE index enforcing one
--   connected grant per (user_id, provider, tenant_or_realm_id).
--   Prod-specific LOCK/DO/UPDATE supersede surgery is intentionally omitted
--   from the Option D clean-replay candidate (prod-only operational).
--   Production dashboard replay parity remains unresolved (Option A/B / G4).

-- Generic invariant: one authoritative connected grant per user+provider+tenant.
-- Disconnected / expired / failed / superseded / needs_entity_selection rows may share the key.
CREATE UNIQUE INDEX IF NOT EXISTS accounting_connections_one_connected_grant_uidx
  ON public.accounting_connections (user_id, provider, tenant_or_realm_id)
  WHERE status = 'connected'
    AND tenant_or_realm_id IS NOT NULL;
