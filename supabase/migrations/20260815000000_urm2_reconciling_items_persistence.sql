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
  'URM-2 schema hook for Patent/Accuracy Contract sync pin. Column+FK only; URM-2 helpers MUST NOT populate it. Later custody PR sets from canonical financial context.';

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

-- ─────────────────────────────────────────────────────────────
-- 4) Run identity is authoritative — stamp engagement/pbc from run
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_ar_reconciling_items_stamp_run_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_engagement_id uuid;
  v_pbc_request_id uuid;
BEGIN
  SELECT r.engagement_id, r.pbc_request_id
    INTO v_engagement_id, v_pbc_request_id
  FROM public.audit_ready_tie_out_runs r
  WHERE r.id = NEW.run_id;

  IF v_engagement_id IS NULL THEN
    RAISE EXCEPTION 'run_not_found';
  END IF;

  -- Always overwrite caller-supplied engagement/pbc — run is sole authority.
  NEW.engagement_id := v_engagement_id;
  NEW.pbc_request_id := v_pbc_request_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ar_reconciling_items_stamp_run_identity
  ON public.audit_ready_reconciling_items;
CREATE TRIGGER trg_ar_reconciling_items_stamp_run_identity
  BEFORE INSERT OR UPDATE OF run_id, engagement_id, pbc_request_id
  ON public.audit_ready_reconciling_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_ar_reconciling_items_stamp_run_identity();

COMMENT ON FUNCTION public.trg_ar_reconciling_items_stamp_run_identity() IS
  'URM-2: forces engagement_id/pbc_request_id from audit_ready_tie_out_runs; callers cannot stamp cross-engagement identity.';

-- ─────────────────────────────────────────────────────────────
-- 5) Atomic persist / clear RPCs (single state transition)
-- TS owns deriveReconBridge math; this RPC only persists already-derived values.
-- Does NOT set baseline_sync_id (custody PR later).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.persist_audit_ready_recon_bridge(
  p_run_id uuid,
  p_items jsonb,
  p_identified_items_total_cents bigint,
  p_unidentified_residual_cents bigint,
  p_reconciling_item_count integer,
  p_unresolved_material_count integer,
  p_recon_outcome text,
  p_allows_timing_reconciled boolean,
  p_persisted_at timestamptz DEFAULT now()
)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_engagement_id uuid;
  v_pbc_request_id uuid;
  v_totals_variance_cents bigint;
  v_item jsonb;
  v_idx integer := 0;
  v_item_ids uuid[] := '{}';
  v_new_id uuid;
  v_class text;
  v_evidence uuid[];
  v_items_sum_cents bigint;
BEGIN
  SELECT r.engagement_id, r.pbc_request_id, r.totals_variance_cents
    INTO v_engagement_id, v_pbc_request_id, v_totals_variance_cents
  FROM public.audit_ready_tie_out_runs r
  WHERE r.id = p_run_id
  FOR UPDATE;

  IF v_engagement_id IS NULL THEN
    RAISE EXCEPTION 'run_not_found';
  END IF;

  IF v_totals_variance_cents IS NULL THEN
    RAISE EXCEPTION 'urm2_gross_variance_authority_missing';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'urm2_items_must_be_json_array';
  END IF;

  IF p_identified_items_total_cents IS NULL
     OR p_unidentified_residual_cents IS NULL
  THEN
    RAISE EXCEPTION 'urm2_bridge_totals_required';
  END IF;

  IF p_recon_outcome IS NULL OR p_recon_outcome NOT IN (
    'reconciled_exact',
    'reconciled_with_timing',
    'reconciled_immaterial_residual',
    'open_review',
    'open_material',
    'provider_action_required',
    'failed'
  ) THEN
    RAISE EXCEPTION 'urm2_invalid_recon_outcome';
  END IF;

  -- Reject residual-as-item before any mutation.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_class := v_item->>'item_class';
    IF v_class IS NULL
       OR v_class = 'unidentified_residual'
       OR v_class NOT IN (
         'identified_timing',
         'identified_documented',
         'identified_reclass',
         'identified_error'
       )
    THEN
      RAISE EXCEPTION 'urm2_unidentified_residual_not_persistable';
    END IF;
  END LOOP;

  -- Persistence integrity assertions (NOT a second formula engine).
  -- All checks run BEFORE DELETE/INSERT/UPDATE so failures leave prior state intact.
  SELECT COALESCE(SUM((e.value->>'amount_cents')::bigint), 0)
    INTO v_items_sum_cents
  FROM jsonb_array_elements(p_items) AS e(value);

  IF v_items_sum_cents <> p_identified_items_total_cents THEN
    RAISE EXCEPTION 'urm2_identified_total_mismatch';
  END IF;

  IF (p_identified_items_total_cents + p_unidentified_residual_cents)
       <> v_totals_variance_cents
  THEN
    RAISE EXCEPTION 'urm2_cent_exact_bridge_mismatch';
  END IF;

  DELETE FROM public.audit_ready_reconciling_items
  WHERE run_id = p_run_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_evidence := COALESCE(
      ARRAY(
        SELECT jsonb_array_elements_text(COALESCE(v_item->'evidence_ids', '[]'::jsonb))::uuid
      ),
      '{}'::uuid[]
    );

    INSERT INTO public.audit_ready_reconciling_items (
      run_id,
      engagement_id,
      pbc_request_id,
      item_class,
      amount_cents,
      entity_kind,
      entity_display_name,
      expected_clear_date,
      clearance_policy,
      status,
      measurement_link_variance_id,
      evidence_ids,
      narrative,
      sort_order
    ) VALUES (
      p_run_id,
      v_engagement_id,
      v_pbc_request_id,
      v_item->>'item_class',
      (v_item->>'amount_cents')::bigint,
      NULLIF(v_item->>'entity_kind', ''),
      NULLIF(v_item->>'entity_display_name', ''),
      NULLIF(v_item->>'expected_clear_date', '')::date,
      v_item->>'clearance_policy',
      v_item->>'status',
      NULLIF(v_item->>'measurement_link_variance_id', '')::uuid,
      v_evidence,
      NULLIF(v_item->>'narrative', ''),
      v_idx
    )
    RETURNING id INTO v_new_id;

    v_item_ids := array_append(v_item_ids, v_new_id);
    v_idx := v_idx + 1;
  END LOOP;

  UPDATE public.audit_ready_tie_out_runs
  SET
    identified_items_total_cents = p_identified_items_total_cents,
    unidentified_residual_cents = p_unidentified_residual_cents,
    reconciling_item_count = p_reconciling_item_count,
    unresolved_material_count = p_unresolved_material_count,
    recon_outcome = p_recon_outcome,
    allows_timing_reconciled = p_allows_timing_reconciled,
    urm_bridge_persisted_at = p_persisted_at
    -- baseline_sync_id intentionally NOT touched
  WHERE id = p_run_id;

  RETURN v_item_ids;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_audit_ready_recon_bridge(
  p_run_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.audit_ready_tie_out_runs WHERE id = p_run_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'run_not_found';
  END IF;

  DELETE FROM public.audit_ready_reconciling_items
  WHERE run_id = p_run_id;

  UPDATE public.audit_ready_tie_out_runs
  SET
    identified_items_total_cents = NULL,
    unidentified_residual_cents = NULL,
    reconciling_item_count = NULL,
    unresolved_material_count = NULL,
    recon_outcome = NULL,
    allows_timing_reconciled = NULL,
    urm_bridge_persisted_at = NULL
    -- baseline_sync_id intentionally retained
  WHERE id = p_run_id;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_audit_ready_recon_bridge(
  uuid, jsonb, bigint, bigint, integer, integer, text, boolean, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_audit_ready_recon_bridge(
  uuid, jsonb, bigint, bigint, integer, integer, text, boolean, timestamptz
) TO service_role;

REVOKE ALL ON FUNCTION public.clear_audit_ready_recon_bridge(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_audit_ready_recon_bridge(uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.trg_ar_reconciling_items_stamp_run_identity()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.persist_audit_ready_recon_bridge(
  uuid, jsonb, bigint, bigint, integer, integer, text, boolean, timestamptz
) IS
  'URM-2: atomic replace of identified reconciling items + run URM columns. Run identity authoritative. Asserts SUM(items)=identified_total and identified+residual=totals_variance_cents BEFORE mutation. Does not set baseline_sync_id. Does not compute residual/outcome math.';

COMMENT ON FUNCTION public.clear_audit_ready_recon_bridge(uuid) IS
  'URM-2: atomic clear of identified items + run URM columns; retains baseline_sync_id.';

COMMIT;
