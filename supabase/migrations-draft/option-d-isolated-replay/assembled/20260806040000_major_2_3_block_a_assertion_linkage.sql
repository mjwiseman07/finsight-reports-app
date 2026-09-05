-- MAJOR #2.3 Block A — Server-side assertion-impact linkage for schema drift rows.
--
-- Backfills extra.assertion_impact on all existing schema_drift* rows in
-- lifecycle_issues, and installs a BEFORE INSERT trigger so all future drift
-- rows (from any writer — scanner script, detector cron, canary, ad-hoc SQL)
-- are automatically tagged with the assertion impact set they degrade.
--
-- Server-side mirror of lib/schema-drift/assertion-linkage.ts.
-- TypeScript file remains the source of truth for the detector route; this
-- function exists so scanner rows and any raw-SQL writers get identical treatment.
--
-- Design: extra.assertion_impact is JSONB (array of assertion_id text).
-- Idempotent by default — backfill skips rows where the field already exists.
-- Pass p_force_recompute=TRUE to overwrite existing values (used when
-- TABLE_ASSERTION_MAP is refined in a follow-up patch).

BEGIN;

-- 1. Server-side mirror of resolveAssertionImpact.
--    Must be updated in lockstep with lib/schema-drift/assertion-linkage.ts.
CREATE OR REPLACE FUNCTION public.resolve_assertion_impact_by_table(p_table text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  all_assertions CONSTANT text[] := ARRAY[
    'accuracy',
    'classification',
    'completeness',
    'cutoff',
    'existence_occurrence',
    'presentation_disclosure',
    'rights_obligations',
    'valuation_allocation'
  ];
BEGIN
  -- Unknown table → all 8 assertions (fallback per intentional coarse-linkage design)
  IF p_table IS NULL OR length(trim(p_table)) = 0 THEN
    RETURN all_assertions;
  END IF;

  -- Journal/GL tables drive accuracy, existence, cutoff, classification
  IF p_table IN ('qbo_journal_entries', 'qbo_transactions') THEN
    RETURN ARRAY['accuracy', 'existence_occurrence', 'cutoff', 'classification'];
  END IF;

  IF p_table = 'qbo_general_ledger' THEN
    RETURN ARRAY['accuracy', 'existence_occurrence', 'cutoff', 'classification', 'completeness'];
  END IF;

  -- Balance-sheet reconciliation tables drive completeness, valuation, existence
  IF p_table = 'bs_recon_summary' THEN
    RETURN ARRAY['completeness', 'valuation_allocation', 'existence_occurrence'];
  END IF;

  IF p_table = 'balance_sheet_periods' THEN
    RETURN ARRAY['completeness', 'valuation_allocation'];
  END IF;

  -- AP/AR + vendor/customer tables drive rights_obligations + valuation
  IF p_table IN ('qbo_bills', 'qbo_invoices') THEN
    RETURN ARRAY['existence_occurrence', 'rights_obligations', 'valuation_allocation', 'cutoff'];
  END IF;

  IF p_table IN ('qbo_vendors', 'qbo_customers') THEN
    RETURN ARRAY['rights_obligations', 'existence_occurrence'];
  END IF;

  -- Close-period tables drive presentation + cutoff
  IF p_table = 'close_periods' THEN
    RETURN ARRAY['cutoff', 'presentation_disclosure'];
  END IF;

  IF p_table = 'close_packets' THEN
    RETURN ARRAY['presentation_disclosure', 'completeness'];
  END IF;

  -- Assertion coverage tables — drift here degrades ALL assertions (self-referential)
  IF p_table IN ('assertions_catalog', 'assertion_relevance_matrix', 'rule_assertion_coverage') THEN
    RETURN all_assertions;
  END IF;

  -- Users/auth/RLS drift is org-wide → all assertions
  IF p_table IN ('users', 'company_users', 'firm_memberships') THEN
    RETURN all_assertions;
  END IF;

  -- Lifecycle issues drift is self-referential → all assertions
  IF p_table = 'lifecycle_issues' THEN
    RETURN all_assertions;
  END IF;

  -- Fallback for any unmapped table
  RETURN all_assertions;
END;
$$;

COMMENT ON FUNCTION public.resolve_assertion_impact_by_table(text) IS
  'MAJOR #2.3 — server-side mirror of lib/schema-drift/assertion-linkage.ts. Returns the ISA 315 assertion IDs whose evidence flow depends on the given table. Fallback to all 8 assertions for unknown/null tables.';

-- 2. Idempotent backfill function. Callable manually to refill after
--    TABLE_ASSERTION_MAP is refined.
CREATE OR REPLACE FUNCTION public.backfill_schema_drift_assertion_impact(
  p_force_recompute boolean DEFAULT false
)
RETURNS TABLE (
  rows_updated integer,
  rows_skipped integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
  v_skipped integer := 0;
BEGIN
  IF p_force_recompute THEN
    -- Overwrite mode — recompute for every schema_drift* row
    UPDATE public.lifecycle_issues li
    SET extra = coalesce(li.extra, '{}'::jsonb)
      || jsonb_build_object(
        'assertion_impact',
        to_jsonb(public.resolve_assertion_impact_by_table(li.tags->>'table'))
      )
    WHERE li.issue_kind LIKE 'schema_drift%';
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    v_skipped := 0;
  ELSE
    -- Idempotent mode — only fill rows missing the field
    UPDATE public.lifecycle_issues li
    SET extra = coalesce(li.extra, '{}'::jsonb)
      || jsonb_build_object(
        'assertion_impact',
        to_jsonb(public.resolve_assertion_impact_by_table(li.tags->>'table'))
      )
    WHERE li.issue_kind LIKE 'schema_drift%'
      AND (li.extra IS NULL OR li.extra->'assertion_impact' IS NULL);
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    SELECT COUNT(*) INTO v_skipped
    FROM public.lifecycle_issues li
    WHERE li.issue_kind LIKE 'schema_drift%'
      AND li.extra IS NOT NULL
      AND li.extra->'assertion_impact' IS NOT NULL;
  END IF;

  RETURN QUERY SELECT v_updated, v_skipped;
END;
$$;

COMMENT ON FUNCTION public.backfill_schema_drift_assertion_impact(boolean) IS
  'MAJOR #2.3 Block A — backfill extra.assertion_impact for all schema_drift* rows. Idempotent by default; pass p_force_recompute=TRUE to overwrite existing values after TABLE_ASSERTION_MAP is refined.';

REVOKE ALL ON FUNCTION public.backfill_schema_drift_assertion_impact(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_schema_drift_assertion_impact(boolean) TO service_role;

-- 3. BEFORE INSERT trigger — auto-populate extra.assertion_impact for all
--    schema_drift* rows going forward.
CREATE OR REPLACE FUNCTION public.trg_lifecycle_issues_assertion_impact()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only act on schema_drift* rows
  IF NEW.issue_kind NOT LIKE 'schema_drift%' THEN
    RETURN NEW;
  END IF;

  -- Only fill if caller didn't already set it
  IF NEW.extra IS NULL OR NEW.extra->'assertion_impact' IS NULL THEN
    NEW.extra := coalesce(NEW.extra, '{}'::jsonb)
      || jsonb_build_object(
        'assertion_impact',
        to_jsonb(public.resolve_assertion_impact_by_table(NEW.tags->>'table'))
      );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_lifecycle_issues_assertion_impact() IS
  'MAJOR #2.3 Block A — trigger function. Auto-fills extra.assertion_impact on INSERT for schema_drift* rows if caller did not set it.';

DROP TRIGGER IF EXISTS lifecycle_issues_assertion_impact_trg ON public.lifecycle_issues;

CREATE TRIGGER lifecycle_issues_assertion_impact_trg
  BEFORE INSERT ON public.lifecycle_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_lifecycle_issues_assertion_impact();

-- 4. Run the backfill in idempotent mode as part of this migration
--    (records the outcome via RAISE NOTICE for review in migration logs).
DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result FROM public.backfill_schema_drift_assertion_impact(false);
  RAISE NOTICE 'MAJOR #2.3 Block A backfill complete: % rows_updated, % rows_skipped',
    v_result.rows_updated, v_result.rows_skipped;
END;
$$;

-- 5. Self-verify: every schema_drift* row now has a non-empty assertion_impact array.
DO $$
DECLARE
  v_missing integer;
BEGIN
  SELECT COUNT(*) INTO v_missing
  FROM public.lifecycle_issues
  WHERE issue_kind LIKE 'schema_drift%'
    AND (
      extra IS NULL
      OR extra->'assertion_impact' IS NULL
      OR jsonb_typeof(extra->'assertion_impact') <> 'array'
      OR jsonb_array_length(extra->'assertion_impact') = 0
    );

  IF v_missing > 0 THEN
    RAISE EXCEPTION 'MAJOR #2.3 Block A self-verify failed: % schema_drift* rows still missing assertion_impact', v_missing;
  END IF;
END;
$$;

COMMIT;
