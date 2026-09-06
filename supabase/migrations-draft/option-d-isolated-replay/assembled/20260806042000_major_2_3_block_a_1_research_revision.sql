-- MAJOR #2.3 Block A.1 — Research-grounded revision of assertion linkage.
--
-- Applied after 20260806040000_major_2_3_block_a_assertion_linkage.sql.
-- Rewrites the resolve_assertion_impact_by_table() function with mappings
-- restricted to what the audit-literature research supports (research file
-- at research/schema_drift_assertion_mapping_research.md).
--
-- Key changes vs Block A:
--   1. Fallback for unknown tables is now ['completeness','accuracy'] — the
--      ISA 315 Para 12(d)/(i) framework-definition minimum. NOT all 8 assertions.
--   2. Per-table mappings restricted to what research §7 supports.
--   3. New helper functions for assertion_confidence and financial_reporting_relevance.
--   4. Trigger function updated to write all three fields into extra.
--   5. Force-recompute backfill runs at end so the 24 existing rows are
--      overwritten with the new, defensible values.
--
-- Rollback: 20260806042000_major_2_3_block_a_1_research_revision_down.sql
-- restores the Block A functions from the previous migration.

BEGIN;

-- ============================================================================
-- 1. Rewrite the assertion impact resolver
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_assertion_impact_by_table(p_table text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  -- Framework-definition minimum: ISA 315 Para 12(d)/(i)
  framework_minimum CONSTANT text[] := ARRAY['completeness', 'accuracy'];
BEGIN
  IF p_table IS NULL OR length(trim(p_table)) = 0 THEN
    RETURN framework_minimum;
  END IF;

  -- Journal / GL / transactions — completeness + accuracy + existence
  IF p_table IN ('qbo_journal_entries', 'qbo_transactions', 'qbo_general_ledger') THEN
    RETURN ARRAY['completeness', 'accuracy', 'existence_occurrence'];
  END IF;

  -- Balance-sheet reconciliation
  IF p_table = 'bs_recon_summary' THEN
    RETURN ARRAY['completeness', 'accuracy', 'existence_occurrence'];
  END IF;

  IF p_table = 'balance_sheet_periods' THEN
    RETURN ARRAY['completeness', 'accuracy'];
  END IF;

  -- AP/AR
  IF p_table IN ('qbo_bills', 'qbo_invoices') THEN
    RETURN ARRAY['existence_occurrence', 'completeness', 'accuracy'];
  END IF;

  IF p_table IN ('qbo_vendors', 'qbo_customers') THEN
    RETURN ARRAY['existence_occurrence', 'completeness', 'accuracy'];
  END IF;

  -- Close periods
  IF p_table IN ('close_periods', 'close_packets') THEN
    RETURN ARRAY['completeness', 'accuracy'];
  END IF;

  -- Assertion-catalog tables
  IF p_table IN ('assertions_catalog', 'assertion_relevance_matrix', 'rule_assertion_coverage') THEN
    RETURN ARRAY['completeness', 'accuracy'];
  END IF;

  -- Auth/RLS tables
  IF p_table IN ('users', 'company_users', 'firm_memberships') THEN
    RETURN ARRAY['completeness', 'accuracy'];
  END IF;

  -- Ledger events / payments
  IF p_table IN ('ledger_events', 'payment_batches', 'payment_batch_lines') THEN
    RETURN ARRAY['completeness', 'accuracy', 'existence_occurrence'];
  END IF;

  -- Refund requests
  IF p_table = 'refund_requests' THEN
    RETURN ARRAY['completeness', 'accuracy'];
  END IF;

  -- Self-referential
  IF p_table = 'lifecycle_issues' THEN
    RETURN ARRAY['completeness', 'accuracy'];
  END IF;

  -- Table not in allowlist — fall back to framework definition
  RETURN framework_minimum;
END;
$$;

COMMENT ON FUNCTION public.resolve_assertion_impact_by_table(text) IS
  'MAJOR #2.3 Block A.1 — server-side mirror of lib/schema-drift/assertion-linkage.ts, restricted per research/schema_drift_assertion_mapping_research.md §7. Returns contingent assertion risk indicators grounded in ISA 315 Para 12(d)/(i). Fallback for unknown tables is [completeness, accuracy] — the framework-definition minimum, NOT all 8 assertions (which ISA 315 Para A150 explicitly prohibits from a GITC signal alone).';

-- ============================================================================
-- 2. New: assertion_confidence resolver
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_assertion_confidence_by_table(p_table text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_table IS NULL OR length(trim(p_table)) = 0 THEN
    RETURN 'framework_definition';
  END IF;

  -- Grounded per research §7 (direct textual grounding in ISA 315 A190(a)(i)/(ii)/(iii))
  IF p_table IN (
    'qbo_journal_entries', 'qbo_transactions', 'qbo_general_ledger',
    'qbo_bills', 'qbo_invoices',
    'bs_recon_summary', 'balance_sheet_periods',
    'ledger_events', 'payment_batches', 'payment_batch_lines'
  ) THEN
    RETURN 'grounded';
  END IF;

  -- Judgment required per research §7 (linkage exists but requires auditor
  -- judgment about specific account/process affected)
  IF p_table IN (
    'qbo_vendors', 'qbo_customers',
    'close_periods', 'close_packets',
    'assertions_catalog', 'assertion_relevance_matrix', 'rule_assertion_coverage',
    'users', 'company_users', 'firm_memberships',
    'refund_requests', 'lifecycle_issues'
  ) THEN
    RETURN 'judgment_required';
  END IF;

  -- Table not in allowlist — falls back to framework definition
  RETURN 'framework_definition';
END;
$$;

COMMENT ON FUNCTION public.resolve_assertion_confidence_by_table(text) IS
  'MAJOR #2.3 Block A.1 — returns the confidence tag for a drift-affected table. grounded | framework_definition | judgment_required | unknown. Per research §7.';

-- ============================================================================
-- 3. New: financial_reporting_relevance resolver
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_fr_relevance_by_table(p_table text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_table IS NULL OR length(trim(p_table)) = 0 THEN
    RETURN 'unknown';
  END IF;

  -- FR-in-scope allowlist per approved table list (research §8, KPMG Q3.4.20
  -- materiality gate). Every table in TABLE_MAPPING is in_scope.
  IF p_table IN (
    'qbo_journal_entries', 'qbo_transactions', 'qbo_general_ledger',
    'qbo_bills', 'qbo_invoices', 'qbo_vendors', 'qbo_customers',
    'bs_recon_summary', 'balance_sheet_periods',
    'close_periods', 'close_packets',
    'assertions_catalog', 'assertion_relevance_matrix', 'rule_assertion_coverage',
    'users', 'company_users', 'firm_memberships',
    'ledger_events', 'payment_batches', 'payment_batch_lines',
    'refund_requests', 'lifecycle_issues'
  ) THEN
    RETURN 'in_scope';
  END IF;

  -- Everything else — unknown (safer than false out_of_scope claim)
  RETURN 'unknown';
END;
$$;

COMMENT ON FUNCTION public.resolve_fr_relevance_by_table(text) IS
  'MAJOR #2.3 Block A.1 — financial reporting relevance gate per ISA 315 Appendix 5 §19 and KPMG ICFR Handbook Q3.4.20. in_scope | out_of_scope | unknown. Default unknown (never falsely claim out_of_scope for tables we haven''t analyzed).';

-- ============================================================================
-- 4. New: mapping_source resolver
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_mapping_source_by_table(p_table text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_table IS NULL OR length(trim(p_table)) = 0 THEN
    RETURN 'framework_definition_fallback';
  END IF;

  IF p_table IN (
    'qbo_journal_entries', 'qbo_transactions', 'qbo_general_ledger',
    'qbo_bills', 'qbo_invoices',
    'payment_batches', 'payment_batch_lines'
  ) THEN
    RETURN 'ISA_315_A190_a_iii';
  END IF;

  IF p_table IN ('bs_recon_summary', 'balance_sheet_periods', 'ledger_events') THEN
    RETURN 'COBIT_MANAGED_DATA';
  END IF;

  IF p_table IN ('users', 'company_users', 'firm_memberships') THEN
    RETURN 'KPMG_Q6_4_110';
  END IF;

  IF p_table IN (
    'qbo_vendors', 'qbo_customers',
    'close_periods', 'close_packets',
    'assertions_catalog', 'assertion_relevance_matrix', 'rule_assertion_coverage',
    'refund_requests', 'lifecycle_issues'
  ) THEN
    RETURN 'judgment_required_marker';
  END IF;

  RETURN 'framework_definition_fallback';
END;
$$;

COMMENT ON FUNCTION public.resolve_mapping_source_by_table(text) IS
  'MAJOR #2.3 Block A.1 — returns the mapping-source citation reference for Block B footnote rendering. See research/schema_drift_assertion_mapping_research.md for canonical citations.';

-- ============================================================================
-- 5. Rewrite trigger function to write all three new fields
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_lifecycle_issues_assertion_impact()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_table text;
BEGIN
  -- Only act on schema_drift* rows
  IF NEW.issue_kind NOT LIKE 'schema_drift%' THEN
    RETURN NEW;
  END IF;

  v_table := NEW.tags->>'table';

  -- Fill assertion_impact if caller didn't set it
  IF NEW.extra IS NULL OR NEW.extra->'assertion_impact' IS NULL THEN
    NEW.extra := coalesce(NEW.extra, '{}'::jsonb)
      || jsonb_build_object(
        'assertion_impact',
        to_jsonb(public.resolve_assertion_impact_by_table(v_table))
      );
  END IF;

  -- Fill assertion_confidence if caller didn't set it
  IF NEW.extra->'assertion_confidence' IS NULL THEN
    NEW.extra := NEW.extra
      || jsonb_build_object(
        'assertion_confidence',
        public.resolve_assertion_confidence_by_table(v_table)
      );
  END IF;

  -- Fill financial_reporting_relevance if caller didn't set it
  IF NEW.extra->'financial_reporting_relevance' IS NULL THEN
    NEW.extra := NEW.extra
      || jsonb_build_object(
        'financial_reporting_relevance',
        public.resolve_fr_relevance_by_table(v_table)
      );
  END IF;

  -- Fill mapping_source if caller didn't set it
  IF NEW.extra->'mapping_source' IS NULL THEN
    NEW.extra := NEW.extra
      || jsonb_build_object(
        'mapping_source',
        public.resolve_mapping_source_by_table(v_table)
      );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_lifecycle_issues_assertion_impact() IS
  'MAJOR #2.3 Block A.1 — trigger auto-populates the four assertion linkage fields (impact, confidence, fr_relevance, mapping_source) for schema_drift* rows. Caller-set values are preserved.';

-- ============================================================================
-- 6. Rewrite backfill function to populate all four fields
-- ============================================================================

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
    UPDATE public.lifecycle_issues li
    SET extra = coalesce(li.extra, '{}'::jsonb)
      || jsonb_build_object(
        'assertion_impact',
        to_jsonb(public.resolve_assertion_impact_by_table(li.tags->>'table'))
      )
      || jsonb_build_object(
        'assertion_confidence',
        public.resolve_assertion_confidence_by_table(li.tags->>'table')
      )
      || jsonb_build_object(
        'financial_reporting_relevance',
        public.resolve_fr_relevance_by_table(li.tags->>'table')
      )
      || jsonb_build_object(
        'mapping_source',
        public.resolve_mapping_source_by_table(li.tags->>'table')
      )
    WHERE li.issue_kind LIKE 'schema_drift%';
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    v_skipped := 0;
  ELSE
    UPDATE public.lifecycle_issues li
    SET extra = coalesce(li.extra, '{}'::jsonb)
      || jsonb_build_object(
        'assertion_impact',
        to_jsonb(public.resolve_assertion_impact_by_table(li.tags->>'table'))
      )
      || jsonb_build_object(
        'assertion_confidence',
        public.resolve_assertion_confidence_by_table(li.tags->>'table')
      )
      || jsonb_build_object(
        'financial_reporting_relevance',
        public.resolve_fr_relevance_by_table(li.tags->>'table')
      )
      || jsonb_build_object(
        'mapping_source',
        public.resolve_mapping_source_by_table(li.tags->>'table')
      )
    WHERE li.issue_kind LIKE 'schema_drift%'
      AND (
        li.extra IS NULL
        OR li.extra->'assertion_impact' IS NULL
        OR li.extra->'assertion_confidence' IS NULL
        OR li.extra->'financial_reporting_relevance' IS NULL
        OR li.extra->'mapping_source' IS NULL
      );
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    SELECT COUNT(*) INTO v_skipped
    FROM public.lifecycle_issues li
    WHERE li.issue_kind LIKE 'schema_drift%'
      AND li.extra IS NOT NULL
      AND li.extra->'assertion_impact' IS NOT NULL
      AND li.extra->'assertion_confidence' IS NOT NULL
      AND li.extra->'financial_reporting_relevance' IS NOT NULL
      AND li.extra->'mapping_source' IS NOT NULL;
  END IF;

  RETURN QUERY SELECT v_updated, v_skipped;
END;
$$;

COMMENT ON FUNCTION public.backfill_schema_drift_assertion_impact(boolean) IS
  'MAJOR #2.3 Block A.1 — backfill all four assertion linkage fields. Idempotent by default; force mode overwrites (used to correct Block A''s ALL_ASSERTIONS data).';

REVOKE ALL ON FUNCTION public.backfill_schema_drift_assertion_impact(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_schema_drift_assertion_impact(boolean) TO service_role;

-- ============================================================================
-- 7. Force-recompute the 24 existing rows with the new logic
-- ============================================================================

DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result FROM public.backfill_schema_drift_assertion_impact(true);
  RAISE NOTICE 'MAJOR #2.3 Block A.1 force-recompute complete: % rows_updated', v_result.rows_updated;
END;
$$;

-- ============================================================================
-- 8. Self-verify: no drift row is left with ALL_ASSERTIONS impact,
--    every row has all four fields
-- ============================================================================

DO $$
DECLARE
  v_missing_field integer;
  v_still_all_eight integer;
BEGIN
  -- Every drift row must have all 4 fields populated
  SELECT COUNT(*) INTO v_missing_field
  FROM public.lifecycle_issues
  WHERE issue_kind LIKE 'schema_drift%'
    AND (
      extra IS NULL
      OR extra->'assertion_impact' IS NULL
      OR extra->'assertion_confidence' IS NULL
      OR extra->'financial_reporting_relevance' IS NULL
      OR extra->'mapping_source' IS NULL
    );

  IF v_missing_field > 0 THEN
    RAISE EXCEPTION 'MAJOR #2.3 Block A.1 self-verify failed: % rows missing one or more assertion linkage fields', v_missing_field;
  END IF;

  -- No drift row should carry ALL_ASSERTIONS impact (8-element array) unless
  -- caller explicitly set it (caller-set values are preserved by the trigger,
  -- so this only checks that the resolver never produces 8)
  SELECT COUNT(*) INTO v_still_all_eight
  FROM public.lifecycle_issues
  WHERE issue_kind LIKE 'schema_drift%'
    AND jsonb_array_length(extra->'assertion_impact') = 8;

  IF v_still_all_eight > 0 THEN
    RAISE EXCEPTION 'MAJOR #2.3 Block A.1 self-verify failed: % rows still carry ALL_ASSERTIONS (8 assertions) — force-recompute did not overwrite. Investigate before merging.', v_still_all_eight;
  END IF;

  RAISE NOTICE 'MAJOR #2.3 Block A.1 self-verify passed: all schema_drift* rows carry defensible assertion linkage.';
END;
$$;

COMMIT;
