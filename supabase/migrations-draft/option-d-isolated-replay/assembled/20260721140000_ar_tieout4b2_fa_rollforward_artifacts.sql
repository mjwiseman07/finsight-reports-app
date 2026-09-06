-- PBC-TIEOUT-4B.2: Fixed-asset Cost/AccumDepr/NBV roll-forward artifacts + PDF.
-- Additive only. Idempotent. Non-destructive.
-- CHECK enums: APPEND ONLY — preserve all live values from TIEOUT-1 + 4B.1.
BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) Expand tie_out_kind CHECK to include fixed_asset_rollforward.
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
        'unclassified'
      )
    );
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2) Expand tie_out_runs.tie_out_kind CHECK only if one already exists.
--    TIEOUT-2 shipped runs.tie_out_kind as unconstrained text — prefer
--    leaving it unconstrained rather than inventing a narrower CHECK.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  cons_name text;
  cons_def  text;
BEGIN
  SELECT c.conname, pg_get_constraintdef(c.oid)
    INTO cons_name, cons_def
  FROM pg_constraint c
  WHERE c.conrelid = 'public.audit_ready_tie_out_runs'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%tie_out_kind%';
  IF cons_name IS NOT NULL AND cons_def NOT ILIKE '%fixed_asset_rollforward%' THEN
    EXECUTE format(
      'ALTER TABLE public.audit_ready_tie_out_runs DROP CONSTRAINT %I',
      cons_name
    );
    ALTER TABLE public.audit_ready_tie_out_runs
      ADD CONSTRAINT audit_ready_tie_out_runs_tie_out_kind_check
      CHECK (
        tie_out_kind IN (
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
          'unclassified'
        )
      );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3) Expand entity_kind CHECK — append fa_rollforward_line only.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  cname text;
  cdef  text;
BEGIN
  SELECT c.conname, pg_get_constraintdef(c.oid)
    INTO cname, cdef
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'audit_ready_tie_out_variances'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%entity_kind%';
  IF cname IS NOT NULL AND cdef NOT ILIKE '%fa_rollforward_line%' THEN
    EXECUTE format('ALTER TABLE public.audit_ready_tie_out_variances DROP CONSTRAINT %I', cname);
    ALTER TABLE public.audit_ready_tie_out_variances
      ADD CONSTRAINT audit_ready_tie_out_variances_entity_kind_check
      CHECK (entity_kind IN (
        'customer','vendor','item','account','totals','cutoff',
        'transaction','subledger_line','fa_rollforward_line'
      ));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4) audit_ready_fa_rollforward_artifacts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_fa_rollforward_artifacts (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id             uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  run_id                    uuid NOT NULL REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  scope_kind                text NOT NULL DEFAULT 'account'
                            CHECK (scope_kind IN ('account','subclass','all_fixed_assets')),
  scope_key                 text NOT NULL,
  scope_label               text NOT NULL DEFAULT '',
  period_start              date NOT NULL,
  period_end                date NOT NULL,
  cost_beginning_cents      bigint NOT NULL DEFAULT 0,
  cost_additions_cents      bigint NOT NULL DEFAULT 0,
  cost_disposals_cents      bigint NOT NULL DEFAULT 0,
  cost_reclass_cents        bigint NOT NULL DEFAULT 0,
  cost_ending_cents         bigint NOT NULL DEFAULT 0,
  cost_gl_ending_cents      bigint NOT NULL DEFAULT 0,
  cost_variance_cents       bigint NOT NULL DEFAULT 0,
  accum_beginning_cents     bigint NOT NULL DEFAULT 0,
  accum_depreciation_cents  bigint NOT NULL DEFAULT 0,
  accum_disposals_cents     bigint NOT NULL DEFAULT 0,
  accum_reclass_cents       bigint NOT NULL DEFAULT 0,
  accum_ending_cents        bigint NOT NULL DEFAULT 0,
  accum_gl_ending_cents     bigint NOT NULL DEFAULT 0,
  accum_variance_cents      bigint NOT NULL DEFAULT 0,
  nbv_beginning_cents       bigint NOT NULL DEFAULT 0,
  nbv_ending_cents          bigint NOT NULL DEFAULT 0,
  format                    text NOT NULL DEFAULT 'pdf'
                            CHECK (format IN ('pdf','xlsx','json')),
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

CREATE INDEX IF NOT EXISTS idx_ar_fa_rf_artifacts_engagement_period
  ON public.audit_ready_fa_rollforward_artifacts(engagement_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_ar_fa_rf_artifacts_scope
  ON public.audit_ready_fa_rollforward_artifacts(engagement_id, scope_kind, scope_key, period_end DESC);

ALTER TABLE public.audit_ready_fa_rollforward_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ar_fa_rf_artifacts_service_role_all ON public.audit_ready_fa_rollforward_artifacts;
CREATE POLICY ar_fa_rf_artifacts_service_role_all
  ON public.audit_ready_fa_rollforward_artifacts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ar_fa_rf_artifacts_engagement_read ON public.audit_ready_fa_rollforward_artifacts;
CREATE POLICY ar_fa_rf_artifacts_engagement_read
  ON public.audit_ready_fa_rollforward_artifacts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_fa_rollforward_artifacts.engagement_id
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
-- 5) audit_ready_fa_rollforward_lines
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_fa_rollforward_lines (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id            uuid NOT NULL REFERENCES public.audit_ready_fa_rollforward_artifacts(id) ON DELETE CASCADE,
  run_id                 uuid NOT NULL REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  engagement_id          uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  qbo_account_id         text NOT NULL,
  qbo_account_name       text NOT NULL DEFAULT '',
  side                   text NOT NULL CHECK (side IN ('cost','accum')),
  bucket                 text NOT NULL CHECK (bucket IN ('addition','disposal','depreciation','reclass','other')),
  ordinal                integer NOT NULL,
  txn_date               date NOT NULL,
  txn_type               text NOT NULL DEFAULT '',
  doc_number             text NULL,
  name_display           text NULL,
  memo                   text NULL,
  split_account          text NULL,
  debit_cents            bigint NOT NULL DEFAULT 0,
  credit_cents           bigint NOT NULL DEFAULT 0,
  signed_cents           bigint NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_fa_rf_lines_artifact
  ON public.audit_ready_fa_rollforward_lines(artifact_id, side, bucket, ordinal);

ALTER TABLE public.audit_ready_fa_rollforward_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ar_fa_rf_lines_service_role_all ON public.audit_ready_fa_rollforward_lines;
CREATE POLICY ar_fa_rf_lines_service_role_all
  ON public.audit_ready_fa_rollforward_lines
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ar_fa_rf_lines_engagement_read ON public.audit_ready_fa_rollforward_lines;
CREATE POLICY ar_fa_rf_lines_engagement_read
  ON public.audit_ready_fa_rollforward_lines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_fa_rollforward_lines.engagement_id
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
