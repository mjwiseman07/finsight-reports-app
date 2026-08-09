-- Phase WBP W1c.4c.2 — provider-aware tenant identity on companies.
-- Enables resolveOrCreateCompanyForProvider to route accounting_syncs writes
-- to the correct companies row by external tenant identifier.
-- Unblocks the last remaining Xero tile hydration failure discovered in W1c.4c smoke.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS xero_tenant_id text,
  ADD COLUMN IF NOT EXISTS qbo_realm_id text;

CREATE UNIQUE INDEX IF NOT EXISTS companies_xero_tenant_id_key
  ON companies (xero_tenant_id) WHERE xero_tenant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS companies_qbo_realm_id_key
  ON companies (qbo_realm_id) WHERE qbo_realm_id IS NOT NULL;

COMMENT ON COLUMN companies.xero_tenant_id IS
  'Xero organization tenant UUID (from OAuth /connections). Unique when set. Populated by resolveOrCreateCompanyForProvider.';
COMMENT ON COLUMN companies.qbo_realm_id IS
  'QuickBooks Online realmId. Unique when set. Populated by resolveOrCreateCompanyForProvider.';

-- Backfill known Xero tenant → companies mapping for existing owner user.
UPDATE companies
   SET xero_tenant_id = 'ceaea696-081f-491e-9daa-a9263a023ca9',
       accounting_system = COALESCE(accounting_system, 'xero'),
       updated_at = now()
 WHERE id = '02edb6c6-a4f1-4bae-825d-2680136dad24'
   AND xero_tenant_id IS NULL;

-- Backfill known QBO realm → seed companies row.
UPDATE companies
   SET qbo_realm_id = '9341457151063823',
       accounting_system = COALESCE(accounting_system, 'quickbooks'),
       updated_at = now()
 WHERE id = 'aaaaaaaa-2222-4222-8222-222222222222'
   AND qbo_realm_id IS NULL;
