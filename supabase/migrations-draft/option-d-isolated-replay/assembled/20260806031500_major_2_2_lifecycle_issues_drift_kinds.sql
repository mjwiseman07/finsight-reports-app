-- MAJOR #2.2 — Widen lifecycle_issues CHECK constraints to accept schema-drift issue_kinds.
--
-- PR #230 (MAJOR #2) added the schema-drift detector cron and registry rows for:
--   schema_drift
--   schema_drift_detector_degraded
--
-- PR #231 (MAJOR #2.1) added three more scanner-owned registry rows:
--   schema_drift_scanner_ambiguous_column
--   schema_drift_scanner_unable_to_classify
--   schema_drift_accepted_baseline
--
-- Registry was updated in both PRs. The lifecycle_issues_issue_kind_chk CHECK constraint
-- was not. This migration closes that gap.
--
-- lifecycle_issues_partition_chk also needs widening — schema drift is a platform-scope
-- event with no company_id/firm_id, so it needs to be added to the allowlist branch
-- of that constraint.
--
-- Both CHECK constraints must be dropped and recreated (Postgres does not support
-- ALTER CONSTRAINT for CHECK). ADD CONSTRAINT is transactional; if the recreate fails
-- the whole migration rolls back.

BEGIN;

-- 1. Widen lifecycle_issues_issue_kind_chk
ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_issue_kind_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_issue_kind_chk
  CHECK (issue_kind = ANY (ARRAY[
    -- Pre-existing pilot lifecycle kinds
    'pilot.lifecycle.drift.detected'::text,
    'pilot.lifecycle.transition.rejected'::text,
    'pilot.lifecycle.chain.integrity.broken'::text,
    'pilot.lifecycle.monitor.error'::text,
    'pilot.lifecycle.chain.anchor'::text,
    -- Pre-existing marketing kind
    'marketing.seo.drift'::text,
    -- MAJOR #2 (PR #230) — schema drift detector
    'schema_drift'::text,
    'schema_drift_detector_degraded'::text,
    -- MAJOR #2.1 (PR #231) — AST scanner
    'schema_drift_scanner_ambiguous_column'::text,
    'schema_drift_scanner_unable_to_classify'::text,
    'schema_drift_accepted_baseline'::text
  ]));

-- 2. Widen lifecycle_issues_partition_chk to allow platform-scope drift events
ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_partition_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_partition_chk
  CHECK (
    company_id IS NOT NULL
    OR firm_id IS NOT NULL
    OR issue_kind = ANY (ARRAY[
      -- Pre-existing platform-scope kinds
      'marketing.seo.drift'::text,
      'pilot.lifecycle.chain.anchor'::text,
      -- MAJOR #2 / #2.1 — schema drift is platform-scope
      'schema_drift'::text,
      'schema_drift_detector_degraded'::text,
      'schema_drift_scanner_ambiguous_column'::text,
      'schema_drift_scanner_unable_to_classify'::text,
      'schema_drift_accepted_baseline'::text
    ])
  );

-- 3. Sanity check — verify all registry kinds are now accepted by the CHECK.
-- If a registry kind is NOT accepted, this will raise an exception and the
-- transaction rolls back, so the migration is self-verifying.
DO $$
DECLARE
  unaccepted_kind text;
BEGIN
  SELECT r.issue_kind INTO unaccepted_kind
  FROM public.lifecycle_issue_kinds_registry r
  WHERE r.issue_kind <> ALL (ARRAY[
    'pilot.lifecycle.drift.detected',
    'pilot.lifecycle.transition.rejected',
    'pilot.lifecycle.chain.integrity.broken',
    'pilot.lifecycle.monitor.error',
    'pilot.lifecycle.chain.anchor',
    'marketing.seo.drift',
    'schema_drift',
    'schema_drift_detector_degraded',
    'schema_drift_scanner_ambiguous_column',
    'schema_drift_scanner_unable_to_classify',
    'schema_drift_accepted_baseline'
  ])
  LIMIT 1;

  IF unaccepted_kind IS NOT NULL THEN
    RAISE EXCEPTION 'MAJOR #2.2 verify failed: registry has issue_kind % that is not in the widened CHECK. Add it to the ARRAY above and re-run.', unaccepted_kind;
  END IF;
END $$;

COMMIT;
