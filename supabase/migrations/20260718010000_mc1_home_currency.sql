-- Phase MC-1 — Capture QBO home currency on accounting_connections.
--
-- Context:
--   - Issue #6 (multicurrency compliance). Gap DB-1: there is nowhere to
--     durably record a connected company's home currency (ISO 4217).
--   - accounting_connections already has a jsonb metadata_json column, but
--     home_currency is queried/labelled frequently, so it is added as a
--     first-class, nullable column. NULL = not yet captured (older rows).
--
-- Strategy: additive, nullable text column. Idempotent via DO block +
-- information_schema guard. No data is dropped or altered destructively.

DO $$
BEGIN
  IF to_regclass('public.accounting_connections') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'accounting_connections'
        AND column_name = 'home_currency'
    ) THEN
      ALTER TABLE public.accounting_connections
        ADD COLUMN home_currency text NULL;
    END IF;
  END IF;
END $$;

COMMENT ON COLUMN public.accounting_connections.home_currency IS
  'ISO 4217 home currency captured from QBO Preferences.CurrencyPrefs.HomeCurrency (or inferred from CompanyInfo.Country). NULL = not yet captured. Added Phase MC-1 (Issue #6).';
