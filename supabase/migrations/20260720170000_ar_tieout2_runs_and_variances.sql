-- PBC-TIEOUT-2: universal tie-out worker persistence.
-- Adds runs + per-item variances tables. Additive only, idempotent.
BEGIN;
-- ─────────────────────────────────────────────────────────────
-- 1) audit_ready_tie_out_runs
-- One row per execution of a resolver on one PBC line.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_tie_out_runs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id             uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  pbc_request_id            uuid NOT NULL REFERENCES public.audit_ready_pbc_requests(id) ON DELETE CASCADE,
  tie_out_kind              text NOT NULL,      -- copied from PBC line at run start (frozen)
  status                    text NOT NULL DEFAULT 'running'
                            CHECK (status IN ('running','completed','failed','partial')),
  -- Snapshot of the tolerance policy AT RUN TIME (immutable audit evidence).
  policy_mode               text NOT NULL,
  auto_reconcile_max_dollar  numeric(18,2) NOT NULL,
  auto_reconcile_max_percent numeric(6,4)  NOT NULL,
  kickout_min_dollar         numeric(18,2) NOT NULL,
  kickout_min_percent        numeric(6,4)  NOT NULL,
  authoritative_comparison   text NOT NULL,
  -- Totals check
  subledger_total_cents     bigint NULL,
  gl_total_cents            bigint NULL,
  totals_variance_cents     bigint NULL,        -- subledger - GL
  totals_status             text NULL
                            CHECK (totals_status IS NULL OR totals_status IN ('tie','auto_reconcile','review','kickout')),
  -- Rollup of item-level variances (populated at run completion)
  item_count                integer NOT NULL DEFAULT 0,
  item_auto_reconcile_count integer NOT NULL DEFAULT 0,
  item_review_count         integer NOT NULL DEFAULT 0,
  item_kickout_count        integer NOT NULL DEFAULT 0,
  -- QBO / evidence traceability
  subledger_source_url      text NULL,          -- QBO report URL that produced subledger
  gl_source_url             text NULL,          -- QBO report URL that produced GL
  intuit_tid_subledger      text NULL,
  intuit_tid_gl             text NULL,
  period_start              date NULL,
  period_end                date NULL,
  triggered_by_user_id      uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_reason            text NOT NULL DEFAULT 'manual'
                            CHECK (trigger_reason IN ('manual','scheduled','memory_replay','api')),
  started_at                timestamptz NOT NULL DEFAULT now(),
  completed_at              timestamptz NULL,
  duration_ms               integer NULL,
  error_code                text NULL,
  error_message             text NULL
);
CREATE INDEX IF NOT EXISTS idx_ar_tieout_runs_pbc_recent
  ON public.audit_ready_tie_out_runs(pbc_request_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ar_tieout_runs_engagement_recent
  ON public.audit_ready_tie_out_runs(engagement_id, started_at DESC);
ALTER TABLE public.audit_ready_tie_out_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_tieout_runs_service_role_all ON public.audit_ready_tie_out_runs;
CREATE POLICY ar_tieout_runs_service_role_all
  ON public.audit_ready_tie_out_runs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ar_tieout_runs_engagement_read ON public.audit_ready_tie_out_runs;
CREATE POLICY ar_tieout_runs_engagement_read
  ON public.audit_ready_tie_out_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_tie_out_runs.engagement_id
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
-- 2) audit_ready_tie_out_variances
-- Per-item variance rows produced by a resolver run.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_tie_out_variances (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                    uuid NOT NULL REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  engagement_id             uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  pbc_request_id            uuid NOT NULL REFERENCES public.audit_ready_pbc_requests(id) ON DELETE CASCADE,
  -- What the variance is on
  entity_kind               text NOT NULL
                            CHECK (entity_kind IN ('customer','vendor','item','account','totals','cutoff')),
  entity_qbo_id             text NULL,          -- QBO CustomerRef/VendorRef/ItemRef when applicable
  entity_display_name       text NULL,
  -- Comparison
  subledger_amount_cents    bigint NULL,
  gl_amount_cents           bigint NULL,
  variance_cents            bigint NOT NULL DEFAULT 0,        -- subledger - GL, signed
  variance_percent          numeric(9,6) NULL,                -- abs(variance)/max(abs(subledger),abs(gl))
  -- Policy classification
  status                    text NOT NULL
                            CHECK (status IN ('tie','auto_cleared','review','kickout')),
  classification_reason     text NULL,                        -- human-readable "why"
  -- Notes / narrative (populated by TIEOUT-4)
  narrative                 text NULL,
  created_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ar_tieout_variances_run
  ON public.audit_ready_tie_out_variances(run_id, status);
CREATE INDEX IF NOT EXISTS idx_ar_tieout_variances_engagement_kickout
  ON public.audit_ready_tie_out_variances(engagement_id)
  WHERE status = 'kickout';
CREATE INDEX IF NOT EXISTS idx_ar_tieout_variances_pbc
  ON public.audit_ready_tie_out_variances(pbc_request_id, status);
ALTER TABLE public.audit_ready_tie_out_variances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_tieout_variances_service_role_all ON public.audit_ready_tie_out_variances;
CREATE POLICY ar_tieout_variances_service_role_all
  ON public.audit_ready_tie_out_variances
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ar_tieout_variances_engagement_read ON public.audit_ready_tie_out_variances;
CREATE POLICY ar_tieout_variances_engagement_read
  ON public.audit_ready_tie_out_variances
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_tie_out_variances.engagement_id
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
-- 3) audit_ready_pbc_requests — additive columns for last-run rollup
-- Nullable; populated at run completion.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS last_tie_out_run_id uuid NULL
    REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE SET NULL;
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS last_tie_out_status text NULL
    CHECK (last_tie_out_status IS NULL OR last_tie_out_status IN ('tie','auto_reconciled','review','kickout','failed'));
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS last_tie_out_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_ar_pbc_last_tie_out
  ON public.audit_ready_pbc_requests(engagement_id, last_tie_out_status);
-- ─────────────────────────────────────────────────────────────
-- 4) audit_ready_tie_out_summary VIEW — replace to include run rollup
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.audit_ready_tie_out_summary AS
SELECT
  r.id                        AS pbc_request_id,
  r.engagement_id,
  r.request_number,
  r.request_description,
  r.assertion_tags,
  r.tie_out_kind,
  r.tie_out_kind_confidence,
  r.tie_out_kind_classifier,
  r.tie_out_kind_classified_at,
  r.status                    AS pbc_status,
  r.last_tie_out_run_id,
  r.last_tie_out_status,
  r.last_tie_out_at,
  CASE
    WHEN p.engagement_id IS NULL           THEN 'no_tolerance_policy'
    WHEN r.tie_out_kind IS NULL            THEN 'not_yet_classified'
    WHEN r.tie_out_kind = 'unclassified'   THEN 'requires_manual_review'
    WHEN r.last_tie_out_run_id IS NULL     THEN 'ready_to_run'
    WHEN r.last_tie_out_status = 'tie'     THEN 'tied_out'
    WHEN r.last_tie_out_status = 'auto_reconciled' THEN 'auto_reconciled'
    WHEN r.last_tie_out_status = 'review'  THEN 'needs_review'
    WHEN r.last_tie_out_status = 'kickout' THEN 'kicked_out'
    WHEN r.last_tie_out_status = 'failed'  THEN 'failed'
    ELSE 'classified'
  END                         AS tie_out_state,
  p.policy_mode,
  p.auto_reconcile_max_dollar,
  p.auto_reconcile_max_percent,
  p.kickout_min_dollar,
  p.kickout_min_percent,
  p.authoritative_comparison
FROM public.audit_ready_pbc_requests r
LEFT JOIN public.audit_ready_tie_out_policies p ON p.engagement_id = r.engagement_id;
ALTER VIEW public.audit_ready_tie_out_summary SET (security_invoker = true);
COMMIT;
