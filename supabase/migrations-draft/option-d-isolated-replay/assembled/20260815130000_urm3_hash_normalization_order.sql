-- URM-3.1: Align evidence content_hash normalization with TypeScript contract.
-- Corrective only — does NOT alter already-applied
-- 20260815120000_urm3_universal_evidence_spine.sql or migration history.
--
-- Live defect: trigger did lower(regexp_replace(..., '^sha256:', '')), so
-- case-sensitive prefix strip ran before lowercasing and rejected SHA256:HEX.
-- Fix order (matches normalizeEvidenceContentHash): lower first, then strip.
--
-- READY ONLY — do not apply until authorized after PR review.

CREATE OR REPLACE FUNCTION public.trg_arte_stamp_run_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_engagement_id uuid;
  v_item_run_id uuid;
  v_var_run_id uuid;
BEGIN
  IF NEW.reconciling_item_id IS NOT NULL THEN
    SELECT i.run_id, i.engagement_id
      INTO v_item_run_id, v_engagement_id
    FROM public.audit_ready_reconciling_items i
    WHERE i.id = NEW.reconciling_item_id;

    IF v_item_run_id IS NULL THEN
      RAISE EXCEPTION 'urm3_reconciling_item_not_found';
    END IF;

    v_run_id := v_item_run_id;
    NEW.run_id := v_item_run_id;
    NEW.engagement_id := v_engagement_id;
  END IF;

  IF NEW.variance_id IS NOT NULL THEN
    SELECT v.run_id, v.engagement_id
      INTO v_var_run_id, v_engagement_id
    FROM public.audit_ready_tie_out_variances v
    WHERE v.id = NEW.variance_id;

    IF v_var_run_id IS NULL THEN
      RAISE EXCEPTION 'urm3_variance_not_found';
    END IF;

    IF v_run_id IS NOT NULL AND v_run_id <> v_var_run_id THEN
      RAISE EXCEPTION 'urm3_cross_run_evidence_forbidden';
    END IF;

    NEW.run_id := v_var_run_id;
    NEW.engagement_id := v_engagement_id;
  END IF;

  -- Normalize content_hash: lower first, then strip optional sha256: prefix
  -- (matches lib/audit-ready/tie-out/evidence-spine.ts normalizeEvidenceContentHash).
  IF NEW.content_hash IS NOT NULL THEN
    NEW.content_hash := regexp_replace(lower(btrim(NEW.content_hash)), '^sha256:', '');
    IF NEW.content_hash !~ '^[a-f0-9]{64}$' THEN
      RAISE EXCEPTION 'urm3_invalid_content_hash';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_arte_stamp_run_identity() IS
  'URM-3/URM-3.1: stamps evidence run/engagement from variance and/or reconciling item; forbids cross-run linkage; normalizes content_hash (lower then strip sha256: prefix) then validates.';
