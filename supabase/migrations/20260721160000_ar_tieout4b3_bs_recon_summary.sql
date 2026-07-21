-- PBC-TIEOUT-4B.3: BS Recon Summary Rollup (engagement-level).
-- ADDITIVE ONLY. Idempotent. Non-destructive.
-- Adds two artifact tables + extends PBC tie_out_kind CHECK to include
-- 'bs_recon_summary'. audit_ready_tie_out_runs.tie_out_kind is free-text,
-- so no CHECK change is required there.
BEGIN;
-- ─────────────────────────────────────────────────────────────
-- 1) Extend audit_ready_pbc_requests.tie_out_kind CHECK.
--    Drop-and-recreate to add 'bs_recon_summary' while preserving
--    every existing value. Values must match the current live check
--    exactly.
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
        'fixed_asset_rollforward',
        'bs_recon_summary',
        'unclassified'
      )
    );
END $$;
-- ─────────────────────────────────────────────────────────────
-- 2) audit_ready_bs_recon_summary_artifacts
--    One row per completed engagement-level BS rollup run.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_bs_recon_summary_artifacts (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id                   uuid NOT NULL
                                  REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  run_id                          uuid NOT NULL UNIQUE
                                  REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  period_start                    date NOT NULL,
  period_end                      date NOT NULL,
  account_count_total             int  NOT NULL DEFAULT 0,
  account_count_tie               int  NOT NULL DEFAULT 0,
  account_count_auto_reconcile    int  NOT NULL DEFAULT 0,
  account_count_review            int  NOT NULL DEFAULT 0,
  account_count_kickout           int  NOT NULL DEFAULT 0,
  account_count_failed            int  NOT NULL DEFAULT 0,
  -- Aggregated GL ending balances by classification. Signed cents.
  -- Assets natural-debit positive; Liabilities and Equity natural-credit
  -- stored as-received from QBO (which reports natural balances positive
  -- for L/E in gl_ending_balance_cents).
  assets_ending_cents             bigint NOT NULL DEFAULT 0,
  liabilities_ending_cents        bigint NOT NULL DEFAULT 0,
  equity_ending_cents             bigint NOT NULL DEFAULT 0,
  -- assets - (liabilities + equity). 0 = balanced.
  bs_equation_variance_cents      bigint NOT NULL DEFAULT 0,
  bs_equation_status              text   NOT NULL
                                  CHECK (bs_equation_status IN ('tie','kickout')),
  format                          text NOT NULL DEFAULT 'pdf'
                                  CHECK (format IN ('pdf','xlsx','json')),
  storage_bucket                  text NOT NULL DEFAULT 'audit-ready-recons',
  storage_object_key              text NOT NULL,
  sha256                          text NOT NULL,
  file_size_bytes                 bigint NOT NULL,
  generated_by                    text NOT NULL DEFAULT 'manual'
                                  CHECK (generated_by IN ('manual','monthly_close_auto','pbc_kickoff','api','scheduled')),
  visibility                      text NOT NULL DEFAULT 'owner_visible'
                                  CHECK (visibility IN ('owner_visible','bookkeeper_hidden')),
  notified_bookkeeper_at          timestamptz NULL,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  created_by_user_id              uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_summary_artifacts_engagement_period
  ON public.audit_ready_bs_recon_summary_artifacts(engagement_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_summary_artifacts_run
  ON public.audit_ready_bs_recon_summary_artifacts(run_id);
ALTER TABLE public.audit_ready_bs_recon_summary_artifacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_bs_recon_summary_artifacts_service_role_all
  ON public.audit_ready_bs_recon_summary_artifacts;
CREATE POLICY ar_bs_recon_summary_artifacts_service_role_all
  ON public.audit_ready_bs_recon_summary_artifacts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ar_bs_recon_summary_artifacts_engagement_read
  ON public.audit_ready_bs_recon_summary_artifacts;
CREATE POLICY ar_bs_recon_summary_artifacts_engagement_read
  ON public.audit_ready_bs_recon_summary_artifacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_bs_recon_summary_artifacts.engagement_id
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
-- 3) audit_ready_bs_recon_summary_lines
--    One row per account included in a rollup run.
--    Points to the per-account child run + artifact so the
--    evidence chain is preserved.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_bs_recon_summary_lines (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_artifact_id       uuid NOT NULL
                            REFERENCES public.audit_ready_bs_recon_summary_artifacts(id)
                            ON DELETE CASCADE,
  engagement_id             uuid NOT NULL
                            REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  -- Parent rollup run id (denormalized for query convenience).
  run_id                    uuid NOT NULL
                            REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  -- Per-account child run + artifact. Nullable when the child failed
  -- before insert or was skipped.
  child_run_id              uuid NULL
                            REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE SET NULL,
  child_artifact_id         uuid NULL
                            REFERENCES public.audit_ready_bs_recon_artifacts(id) ON DELETE SET NULL,
  qbo_account_id            text NOT NULL,
  qbo_account_name          text NOT NULL,
  qbo_account_type          text NULL,
  qbo_account_subtype       text NULL,
  classification            text NOT NULL
                            CHECK (classification IN ('Asset','Liability','Equity')),
  beginning_balance_cents   bigint NOT NULL DEFAULT 0,
  ending_balance_cents      bigint NOT NULL DEFAULT 0,
  gl_ending_balance_cents   bigint NOT NULL DEFAULT 0,
  tie_variance_cents        bigint NOT NULL DEFAULT 0,
  activity_count            int NOT NULL DEFAULT 0,
  totals_status             text NOT NULL
                            CHECK (totals_status IN
                              ('tie','auto_reconcile','review','kickout','failed')),
  sort_order                int NOT NULL DEFAULT 0,
  error_code                text NULL,
  error_message             text NULL,
  created_at                timestamptz NOT NULL DEFAULT now()
);
-- Prevent dup writes if a child gets retried inside the same rollup run.
CREATE UNIQUE INDEX IF NOT EXISTS ux_ar_bs_recon_summary_lines_run_account
  ON public.audit_ready_bs_recon_summary_lines(run_id, qbo_account_id);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_summary_lines_summary_sort
  ON public.audit_ready_bs_recon_summary_lines(summary_artifact_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_summary_lines_engagement
  ON public.audit_ready_bs_recon_summary_lines(engagement_id);
ALTER TABLE public.audit_ready_bs_recon_summary_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_bs_recon_summary_lines_service_role_all
  ON public.audit_ready_bs_recon_summary_lines;
CREATE POLICY ar_bs_recon_summary_lines_service_role_all
  ON public.audit_ready_bs_recon_summary_lines
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ar_bs_recon_summary_lines_engagement_read
  ON public.audit_ready_bs_recon_summary_lines;
CREATE POLICY ar_bs_recon_summary_lines_engagement_read
  ON public.audit_ready_bs_recon_summary_lines
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_bs_recon_summary_lines.engagement_id
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
COMMIT;
