-- WBP W1a — Accounts cache tables for xero + qbo.
-- Purpose (rule 3): make forbidden-account rules and account metadata queryable
-- from Ask Pulse, PBC tie-out, and write-boundary validators. Dedicated tables
-- (not jsonb columns) so joins are cheap and RLS is enforceable per row.
-- Prior wave: W0.5 (spike findings 7ccb9315 documented silent line-strip; this
-- table's SystemAccount / AccountSubType columns are the enforcement source).
--
-- Non-negotiables: no shortcuts (dedicated tables + rollback), patent-aligned
-- (RLS matches accounting_connections owner), usable memory (query surface for
-- Ask Pulse to answer "which accounts are safe to write to?").

BEGIN;

-- =========================================================================
-- xero_accounts_cache
-- Snapshot of Xero /api.xro/2.0/Accounts response per connection+tenant.
-- Refreshed on connect + daily via xeroProvider.refreshAccountsCache (W1c).
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.xero_accounts_cache (
  id                             uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id                  uuid            NOT NULL REFERENCES public.accounting_connections(id) ON DELETE CASCADE,
  tenant_id                      text            NOT NULL,
  account_id                     text            NOT NULL,     -- Xero AccountID (UUID)
  account_code                   text            NOT NULL,     -- Xero Code (e.g. "090", "200"); canonical for our JournalEntry.lines.accountCode
  account_name                   text            NOT NULL,
  account_type                   text            NOT NULL,     -- Xero Type (BANK, CURRENT, EQUITY, ...)
  account_class                  text            NULL,         -- Xero Class (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
  system_account                 text            NULL,         -- Xero SystemAccount enum (DEBTORS, CREDITORS, RETAINEDEARNINGS, ...)
  status                         text            NOT NULL,     -- ACTIVE / ARCHIVED
  enable_payments_to_account     boolean         NOT NULL DEFAULT false,
  tax_type                       text            NULL,
  description                    text            NULL,
  updated_date_utc               timestamptz     NULL,         -- from Xero response
  cached_at                      timestamptz     NOT NULL DEFAULT now(),
  raw_payload                    jsonb           NOT NULL      -- full Xero account object for evidence + future field access
);

CREATE UNIQUE INDEX IF NOT EXISTS xero_accounts_cache_conn_code_uidx
  ON public.xero_accounts_cache (connection_id, account_code);

CREATE INDEX IF NOT EXISTS xero_accounts_cache_conn_type_idx
  ON public.xero_accounts_cache (connection_id, account_type);

CREATE INDEX IF NOT EXISTS xero_accounts_cache_conn_system_idx
  ON public.xero_accounts_cache (connection_id, system_account)
  WHERE system_account IS NOT NULL;

COMMENT ON TABLE public.xero_accounts_cache IS
  'WBP W1a: snapshot of Xero /Accounts response per connection. Refreshed by xeroProvider.refreshAccountsCache. Powers write-boundary forbidden-account validation and Ask Pulse safe-write queries.';

COMMENT ON COLUMN public.xero_accounts_cache.system_account IS
  'Xero SystemAccount enum. DEBTORS/CREDITORS/RETAINEDEARNINGS/etc. are forbidden for ManualJournal writes (WBP W0.5 finding 3A).';


-- =========================================================================
-- qbo_accounts_cache
-- Snapshot of QBO /v3/query SELECT * FROM Account per connection+realm.
-- Refreshed on connect + daily via qboProvider.refreshAccountsCache (W1c).
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.qbo_accounts_cache (
  id                             uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id                  uuid            NOT NULL REFERENCES public.accounting_connections(id) ON DELETE CASCADE,
  realm_id                       text            NOT NULL,
  account_id                     text            NOT NULL,     -- QBO Id
  account_name                   text            NOT NULL,     -- QBO Name
  fully_qualified_name           text            NULL,         -- QBO FullyQualifiedName (with parent path)
  account_type                   text            NOT NULL,     -- QBO AccountType (Bank, Accounts Receivable, ...)
  account_sub_type               text            NULL,         -- QBO AccountSubType (Checking, OpeningBalanceEquity, ...)
  classification                 text            NULL,         -- QBO Classification (Asset, Liability, Equity, Revenue, Expense)
  active                         boolean         NOT NULL DEFAULT true,
  currency_ref                   text            NULL,         -- QBO CurrencyRef.value (ISO code)
  parent_ref                     text            NULL,         -- QBO ParentRef.value (Account Id of parent)
  meta_created_time              timestamptz     NULL,
  meta_last_updated_time         timestamptz     NULL,
  cached_at                      timestamptz     NOT NULL DEFAULT now(),
  raw_payload                    jsonb           NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS qbo_accounts_cache_conn_acct_uidx
  ON public.qbo_accounts_cache (connection_id, account_id);

CREATE INDEX IF NOT EXISTS qbo_accounts_cache_conn_type_idx
  ON public.qbo_accounts_cache (connection_id, account_type);

CREATE INDEX IF NOT EXISTS qbo_accounts_cache_conn_subtype_idx
  ON public.qbo_accounts_cache (connection_id, account_sub_type)
  WHERE account_sub_type IS NOT NULL;

COMMENT ON TABLE public.qbo_accounts_cache IS
  'WBP W1a: snapshot of QBO SELECT * FROM Account response per connection. Refreshed by qboProvider.refreshAccountsCache. Powers write-boundary forbidden-account validation and Ask Pulse safe-write queries.';

COMMENT ON COLUMN public.qbo_accounts_cache.account_sub_type IS
  'QBO AccountSubType. OpeningBalanceEquity/RetainedEarnings/UndepositedFunds are forbidden for JournalEntry writes. AccountType=Bank|Accounts Receivable|Accounts Payable|Credit Card also forbidden per Intuit docs.';


-- =========================================================================
-- RLS
-- =========================================================================
ALTER TABLE public.xero_accounts_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qbo_accounts_cache  ENABLE ROW LEVEL SECURITY;

-- SELECT: connection owner OR service_role
CREATE POLICY xero_accounts_cache_select ON public.xero_accounts_cache
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accounting_connections ac
      WHERE ac.id = xero_accounts_cache.connection_id
        AND ac.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY qbo_accounts_cache_select ON public.qbo_accounts_cache
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accounting_connections ac
      WHERE ac.id = qbo_accounts_cache.connection_id
        AND ac.user_id = (SELECT auth.uid())
    )
  );

-- INSERT / UPDATE / DELETE: service_role only.
-- No explicit policy needed — service_role bypasses RLS. Any other role is denied by default.

-- Deny-by-default explicit policy (belt + suspenders, matches Gap1b_1 pattern)
CREATE POLICY xero_accounts_cache_deny_writes ON public.xero_accounts_cache
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY qbo_accounts_cache_deny_writes ON public.qbo_accounts_cache
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Explanation: the SELECT policy above narrows reads to the connection owner.
-- The FOR ALL false-USING policy blocks INSERT/UPDATE/DELETE for any non-service role.
-- Because service_role bypasses RLS entirely, refresh writes from the adapter (service_role
-- Supabase client) succeed. Any user-role INSERT/UPDATE/DELETE is denied.

COMMIT;
