-- Rollback for MAJOR #2.3 Block A.
-- Drops the trigger, functions, and clears assertion_impact from existing rows.

BEGIN;

DROP TRIGGER IF EXISTS lifecycle_issues_assertion_impact_trg ON public.lifecycle_issues;

DROP FUNCTION IF EXISTS public.trg_lifecycle_issues_assertion_impact();
DROP FUNCTION IF EXISTS public.backfill_schema_drift_assertion_impact(boolean);
DROP FUNCTION IF EXISTS public.resolve_assertion_impact_by_table(text);

-- Strip assertion_impact from existing rows
UPDATE public.lifecycle_issues
SET extra = extra - 'assertion_impact'
WHERE issue_kind LIKE 'schema_drift%'
  AND extra ? 'assertion_impact';

COMMIT;
