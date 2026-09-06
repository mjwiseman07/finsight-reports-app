-- Phase MC-3 (Issue #6, Gap X-1) — Persist currency + exchange rate on je_posting_audit.
--
-- Context:
--   - je_posting_audit currently has no columns to record which currency each
--     JE hit QBO with, nor the ExchangeRate QBO stamped. This blocks MC-3
--     forensics ("did we post this in the right currency?") and future
--     currency-aware reporting.
--
-- Strategy: additive nullable columns only. Historic rows keep NULL.
-- All post-MC-3 attempts always populate. Idempotent via DO blocks.
-- No CHECK constraint on currency (validated at write path, not schema).

DO $$
BEGIN
  IF to_regclass('public.je_posting_audit') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'je_posting_audit'
        AND column_name = 'currency'
    ) THEN
      ALTER TABLE public.je_posting_audit ADD COLUMN currency text NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'je_posting_audit'
        AND column_name = 'exchange_rate'
    ) THEN
      ALTER TABLE public.je_posting_audit ADD COLUMN exchange_rate numeric(18,6) NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'je_posting_audit'
        AND column_name = 'home_currency_at_post'
    ) THEN
      ALTER TABLE public.je_posting_audit ADD COLUMN home_currency_at_post text NULL;
    END IF;
  END IF;
END $$;

COMMENT ON COLUMN public.je_posting_audit.currency IS
  'ISO 4217 transaction currency emitted as CurrencyRef.value on the QBO POST. NULL = pre-MC-3 historic row. Added Phase MC-3 (Issue #6, Gap X-1).';
COMMENT ON COLUMN public.je_posting_audit.exchange_rate IS
  'QBO ExchangeRate stamped on the JournalEntry. 1.0 for home-currency posts. Fetched from /exchangerate as-of transaction_date for foreign currency. NULL = pre-MC-3 historic row.';
COMMENT ON COLUMN public.je_posting_audit.home_currency_at_post IS
  'Snapshot of accounting_connections.home_currency at post time. Denormalized so future changes to the tenant home currency do not invalidate this audit row. NULL = pre-MC-3 historic row.';
