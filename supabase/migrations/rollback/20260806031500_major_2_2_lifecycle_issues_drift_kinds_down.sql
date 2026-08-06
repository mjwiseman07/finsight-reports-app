-- Rollback for MAJOR #2.2. Restores the CHECK constraints to their pre-migration state.
-- WARNING: this will fail if any drift-detector rows have been inserted, because they
-- won't satisfy the narrower CHECK. Delete drift rows first if needed:
--   DELETE FROM public.lifecycle_issues WHERE issue_kind LIKE 'schema_drift%';

BEGIN;

ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_issue_kind_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_issue_kind_chk
  CHECK (issue_kind = ANY (ARRAY[
    'pilot.lifecycle.drift.detected'::text,
    'pilot.lifecycle.transition.rejected'::text,
    'pilot.lifecycle.chain.integrity.broken'::text,
    'pilot.lifecycle.monitor.error'::text,
    'pilot.lifecycle.chain.anchor'::text,
    'marketing.seo.drift'::text
  ]));

ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_partition_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_partition_chk
  CHECK (
    company_id IS NOT NULL
    OR firm_id IS NOT NULL
    OR issue_kind = ANY (ARRAY[
      'marketing.seo.drift'::text,
      'pilot.lifecycle.chain.anchor'::text
    ])
  );

COMMIT;
