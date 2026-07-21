-- PBC-TIEOUT-4B.1: GL fetch + on-demand BS account recon + XLSX.
-- ADDITIVE ONLY. Idempotent. Non-destructive.
-- Note: 20260720180000 is occupied by TIEOUT-3 GRNI binding.
BEGIN;
-- ─────────────────────────────────────────────────────────────
-- 1) Expand tie_out_kind CHECK to include bs_account_recon.
--    Drop-and-recreate the check so we add one value while keeping all existing values.
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_ready_pbc_requests_tie_out_kind_check'
      AND conrelid = 'public.audit_ready_pbc_requests'::regclass
  ) THEN
    ALTER TABLE public.audit_ready_pbc_requests
      DROP CONSTRAINT audit_ready_pbc_requests_tie_out_kind_check;
  END IF;
  ALTER TABLE public.audit_ready_pbc_requests
    ADD CONSTRAINT audit_ready_pbc_requests_tie_out_kind_check
    CHECK (
      tie_out_kind IS NULL
      OR tie_out_kind IN (
        'ar_aging',
        'ap_aging',
        'inventory',
        'grni',
        'bank_recon',
        'cash_recon',
        'fixed_assets',
        'debt_schedule',
        'equity_rollforward',
        'revenue_cutoff',
        'expense_cutoff',
        'bs_account_recon',
        'unclassified'
      )
    );
END $$;
-- ─────────────────────────────────────────────────────────────
-- 2) Expand entity_kind CHECK on audit_ready_tie_out_variances.
--    Adds 'transaction' and 'subledger_line'. Existing values preserved.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  cname text;
BEGIN
  SELECT c.conname INTO cname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'audit_ready_tie_out_variances'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%entity_kind%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.audit_ready_tie_out_variances DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE public.audit_ready_tie_out_variances
    ADD CONSTRAINT audit_ready_tie_out_variances_entity_kind_check
    CHECK (entity_kind IN (
      'customer','vendor','item','account','totals','cutoff',
      'transaction','subledger_line'
    ));
END $$;
-- ─────────────────────────────────────────────────────────────
-- 3) Fiscal-year start month on engagements (cached from QBO CompanyInfo)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_engagements
  ADD COLUMN IF NOT EXISTS fiscal_year_start_month int NULL
    CHECK (fiscal_year_start_month IS NULL OR fiscal_year_start_month BETWEEN 1 AND 12);
-- ─────────────────────────────────────────────────────────────
-- 4) audit_ready_bs_recon_artifacts
--    One row per generated BS-account recon artifact.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_bs_recon_artifacts (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id             uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  run_id                    uuid NULL REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE SET NULL,
  qbo_account_id            text NOT NULL,
  qbo_account_name          text NOT NULL,
  qbo_account_type          text NULL,
  qbo_account_subtype       text NULL,
  period_start              date NOT NULL,
  period_end                date NOT NULL,
  beginning_balance_cents   bigint NOT NULL DEFAULT 0,
  ending_balance_cents      bigint NOT NULL DEFAULT 0,
  gl_ending_balance_cents   bigint NULL,          -- ties to TB net_cents for this account
  tie_variance_cents        bigint NULL,          -- ending - gl_ending
  activity_count            int NOT NULL DEFAULT 0,
  format                    text NOT NULL
                            CHECK (format IN ('xlsx','pdf','json')),
  storage_bucket            text NOT NULL DEFAULT 'audit-ready-recons',
  storage_object_key        text NOT NULL,
  sha256                    text NOT NULL,
  file_size_bytes           bigint NOT NULL,
  generated_by              text NOT NULL DEFAULT 'manual'
                            CHECK (generated_by IN ('manual','monthly_close_auto','pbc_kickoff','api')),
  visibility                text NOT NULL DEFAULT 'owner_visible'
                            CHECK (visibility IN ('owner_visible','bookkeeper_hidden')),
  notified_bookkeeper_at    timestamptz NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  created_by_user_id        uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_artifacts_engagement_period
  ON public.audit_ready_bs_recon_artifacts(engagement_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_artifacts_account_period
  ON public.audit_ready_bs_recon_artifacts(engagement_id, qbo_account_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_artifacts_run
  ON public.audit_ready_bs_recon_artifacts(run_id)
  WHERE run_id IS NOT NULL;
ALTER TABLE public.audit_ready_bs_recon_artifacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_bs_recon_artifacts_service_role_all ON public.audit_ready_bs_recon_artifacts;
CREATE POLICY ar_bs_recon_artifacts_service_role_all
  ON public.audit_ready_bs_recon_artifacts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ar_bs_recon_artifacts_engagement_read ON public.audit_ready_bs_recon_artifacts;
CREATE POLICY ar_bs_recon_artifacts_engagement_read
  ON public.audit_ready_bs_recon_artifacts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_bs_recon_artifacts.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );
-- ─────────────────────────────────────────────────────────────
-- 5) audit_ready_bs_recon_transactions
--    Every GL activity line for a recon run, with running balance.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_bs_recon_transactions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                    uuid NOT NULL REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  engagement_id             uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  qbo_account_id            text NOT NULL,
  ordinal                   int NOT NULL,               -- row order within the run (chronological)
  txn_date                  date NULL,
  txn_type                  text NULL,                  -- Bill, Invoice, JournalEntry, Deposit, etc.
  txn_ref                   text NULL,                  -- QBO Id
  doc_number                text NULL,
  name_ref                  text NULL,                  -- Customer/Vendor/Employee QBO Id (if applicable)
  name_display              text NULL,
  memo                      text NULL,
  split_account             text NULL,                  -- other side of the entry (from QBO GL "Split" column)
  debit_cents               bigint NOT NULL DEFAULT 0,
  credit_cents              bigint NOT NULL DEFAULT 0,
  net_cents                 bigint NOT NULL DEFAULT 0,  -- signed = debit - credit
  running_balance_cents     bigint NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_txn_run_ordinal
  ON public.audit_ready_bs_recon_transactions(run_id, ordinal);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_txn_name
  ON public.audit_ready_bs_recon_transactions(run_id, name_display)
  WHERE name_display IS NOT NULL;
ALTER TABLE public.audit_ready_bs_recon_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_bs_recon_txn_service_role_all ON public.audit_ready_bs_recon_transactions;
CREATE POLICY ar_bs_recon_txn_service_role_all
  ON public.audit_ready_bs_recon_transactions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ar_bs_recon_txn_engagement_read ON public.audit_ready_bs_recon_transactions;
CREATE POLICY ar_bs_recon_txn_engagement_read
  ON public.audit_ready_bs_recon_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_bs_recon_transactions.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );
-- ─────────────────────────────────────────────────────────────
-- 6) Storage bucket for recon artifacts (private).
--    Idempotent — INSERT ... ON CONFLICT DO NOTHING.
-- ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audit-ready-recons',
  'audit-ready-recons',
  false,
  52428800, -- 50 MB per file
  ARRAY[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
    'application/json'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;
-- Storage RLS: service-role writes; engagement-scoped read is enforced at the API level
-- via signed URLs (10-min TTL). We do NOT expose the bucket directly to authenticated users.
DROP POLICY IF EXISTS ar_bs_recon_storage_service_role_all ON storage.objects;
CREATE POLICY ar_bs_recon_storage_service_role_all
  ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'audit-ready-recons')
  WITH CHECK (bucket_id = 'audit-ready-recons');
COMMIT;
