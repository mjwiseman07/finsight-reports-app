-- Rollback for MAJOR #2.3 Block A.1.
-- Restores the Block A (ALL_ASSERTIONS-fallback) resolver and strips the three
-- new fields from existing rows. Note: this leaves the underlying INDEFENSIBLE
-- data in place — rollback is for emergency only. Prefer forward-fix.

BEGIN;

-- Drop A.1-only functions
DROP FUNCTION IF EXISTS public.resolve_assertion_confidence_by_table(text);
DROP FUNCTION IF EXISTS public.resolve_fr_relevance_by_table(text);
DROP FUNCTION IF EXISTS public.resolve_mapping_source_by_table(text);

-- Restore Block A resolver (ALL_ASSERTIONS fallback — INDEFENSIBLE, emergency only)
CREATE OR REPLACE FUNCTION public.resolve_assertion_impact_by_table(p_table text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  all_assertions CONSTANT text[] := ARRAY[
    'accuracy','classification','completeness','cutoff',
    'existence_occurrence','presentation_disclosure',
    'rights_obligations','valuation_allocation'
  ];
BEGIN
  IF p_table IS NULL OR length(trim(p_table)) = 0 THEN RETURN all_assertions; END IF;
  IF p_table IN ('qbo_journal_entries','qbo_transactions') THEN
    RETURN ARRAY['accuracy','existence_occurrence','cutoff','classification'];
  END IF;
  IF p_table = 'qbo_general_ledger' THEN
    RETURN ARRAY['accuracy','existence_occurrence','cutoff','classification','completeness'];
  END IF;
  IF p_table = 'bs_recon_summary' THEN
    RETURN ARRAY['completeness','valuation_allocation','existence_occurrence'];
  END IF;
  IF p_table = 'balance_sheet_periods' THEN
    RETURN ARRAY['completeness','valuation_allocation'];
  END IF;
  IF p_table IN ('qbo_bills','qbo_invoices') THEN
    RETURN ARRAY['existence_occurrence','rights_obligations','valuation_allocation','cutoff'];
  END IF;
  IF p_table IN ('qbo_vendors','qbo_customers') THEN
    RETURN ARRAY['rights_obligations','existence_occurrence'];
  END IF;
  IF p_table = 'close_periods' THEN
    RETURN ARRAY['cutoff','presentation_disclosure'];
  END IF;
  IF p_table = 'close_packets' THEN
    RETURN ARRAY['presentation_disclosure','completeness'];
  END IF;
  IF p_table IN ('assertions_catalog','assertion_relevance_matrix','rule_assertion_coverage') THEN
    RETURN all_assertions;
  END IF;
  IF p_table IN ('users','company_users','firm_memberships') THEN RETURN all_assertions; END IF;
  IF p_table = 'lifecycle_issues' THEN RETURN all_assertions; END IF;
  RETURN all_assertions;
END;
$$;

-- Restore Block A trigger (no confidence, fr_relevance, mapping_source)
CREATE OR REPLACE FUNCTION public.trg_lifecycle_issues_assertion_impact()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.issue_kind NOT LIKE 'schema_drift%' THEN RETURN NEW; END IF;
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

-- Strip A.1-added fields from existing rows
UPDATE public.lifecycle_issues
SET extra = extra - 'assertion_confidence' - 'financial_reporting_relevance' - 'mapping_source'
WHERE issue_kind LIKE 'schema_drift%'
  AND (extra ? 'assertion_confidence' OR extra ? 'financial_reporting_relevance' OR extra ? 'mapping_source');

COMMIT;
