-- URM-2: Persist universal reconciliation outcomes.
-- Additive only. Does not change resolver math or measurement variances.
--
-- Locks:
-- - Identified reconciling items are separate workpaper/remediation objects.
-- - Unidentified residual is derived (Gross − Σ Identified); never a row class.
-- - Variances remain the measurement layer.
-- - Evidence taxonomy expansion deferred to URM-3 (opaque evidence_ids only).

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) Run-level URM outcome columns (nullable until a bridge is persisted)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS identified_items_total_cents bigint NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS unidentified_residual_cents bigint NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS reconciling_item_count integer NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS unresolved_material_count integer NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS recon_outcome text NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  DROP CONSTRAINT IF EXISTS audit_ready_tie_out_runs_recon_outcome_check;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD CONSTRAINT audit_ready_tie_out_runs_recon_outcome_check
  CHECK (
    recon_outcome IS NULL
    OR recon_outcome IN (
      'reconciled_exact',
      'reconciled_with_timing',
      'reconciled_immaterial_residual',
      'open_review',
      'open_material',
      'provider_action_required',
      'failed'
    )
  );

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS allows_timing_reconciled boolean NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS baseline_sync_id uuid NULL
    REFERENCES public.accounting_syncs(id) ON DELETE SET NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS urm_bridge_persisted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_ar_tieout_runs_recon_outcome
  ON public.audit_ready_tie_out_runs(engagement_id, recon_outcome)
  WHERE recon_outcome IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ar_tieout_runs_baseline_sync
  ON public.audit_ready_tie_out_runs(baseline_sync_id)
  WHERE baseline_sync_id IS NOT NULL;

COMMENT ON COLUMN public.audit_ready_tie_out_runs.identified_items_total_cents IS
  'URM-2: Σ identified reconciling item amounts (cents) at bridge persist time.';
COMMENT ON COLUMN public.audit_ready_tie_out_runs.unidentified_residual_cents IS
  'URM-2: derived residual = totals_variance_cents − identified_items_total_cents.';
COMMENT ON COLUMN public.audit_ready_tie_out_runs.recon_outcome IS
  'URM-2: run-level reconOutcome from deriveReconBridge (not legacy totals_status).';
COMMENT ON COLUMN public.audit_ready_tie_out_runs.baseline_sync_id IS
  'URM-2: optional Patent/Accuracy Contract sync pin. NULL until explicitly supplied.';

-- ─────────────────────────────────────────────────────────────
-- 2) audit_ready_reconciling_items — identified workpaper items only
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_reconciling_items (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                          uuid NOT NULL
    REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  engagement_id                   uuid NOT NULL
    REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  pbc_request_id                  uuid NOT NULL
    REFERENCES public.audit_ready_pbc_requests(id) ON DELETE CASCADE,
  -- Identified classes only — unidentified residual is NEVER stored here.
  item_class                      text NOT NULL
    CHECK (item_class IN (
      'identified_timing',
      'identified_documented',
      'identified_reclass',
      'identified_error'
    )),
  amount_cents                    bigint NOT NULL,
  entity_kind                     text NULL,
  entity_display_name             text NULL,
  expected_clear_date             date NULL,
  clearance_policy                text NOT NULL
    CHECK (clearance_policy IN (
      'may_reconcile_with_timing',
      'requires_resolution',
      'immaterial_ok'
    )),
  status                          text NOT NULL
    CHECK (status IN ('tie', 'auto_cleared', 'review', 'kickout')),
  -- Optional link to measurement-layer variance (not the item identity).
  measurement_link_variance_id    uuid NULL
    REFERENCES public.audit_ready_tie_out_variances(id) ON DELETE SET NULL,
  -- Opaque evidence refs until URM-3 evidence spine. No FK / taxonomy expansion.
  evidence_ids                    uuid[] NOT NULL DEFAULT '{}',
  narrative                       text NULL,
  sort_order                      integer NOT NULL DEFAULT 0,
  created_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_reconciling_items_run
  ON public.audit_ready_reconciling_items(run_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_ar_reconciling_items_engagement
  ON public.audit_ready_reconciling_items(engagement_id, item_class);

CREATE INDEX IF NOT EXISTS idx_ar_reconciling_items_variance_link
  ON public.audit_ready_reconciling_items(measurement_link_variance_id)
  WHERE measurement_link_variance_id IS NOT NULL;

COMMENT ON TABLE public.audit_ready_reconciling_items IS
  'URM-2: identified reconciling items (workpaper/remediation). Unidentified residual is derived on the run, not stored as an item.';

-- ─────────────────────────────────────────────────────────────
-- 3) RLS — mirror variances: service_role write; engagement-scoped read
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_reconciling_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ar_reconciling_items_service_role_all
  ON public.audit_ready_reconciling_items;
CREATE POLICY ar_reconciling_items_service_role_all
  ON public.audit_ready_reconciling_items
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ar_reconciling_items_engagement_read
  ON public.audit_ready_reconciling_items;
CREATE POLICY ar_reconciling_items_engagement_read
  ON public.audit_ready_reconciling_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_reconciling_items.engagement_id
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
