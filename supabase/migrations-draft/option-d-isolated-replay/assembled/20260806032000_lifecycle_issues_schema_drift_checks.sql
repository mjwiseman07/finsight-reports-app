-- MAJOR #2.1 follow-up — widen lifecycle_issues CHECKs for schema-drift kinds.
--
-- Root cause found during LAUNCH BATCH SMOKE:
--   * lifecycle_issues_issue_kind_chk only allowed pilot.* + marketing.seo.drift
--   * lifecycle_issues_partition_chk only allowed null-tenant rows for
--     marketing.seo.drift + pilot.lifecycle.chain.anchor
-- Both rejected schema_drift* / scanner* / accepted_baseline inserts, so the
-- detector cron and `schema:drift-scan --record` silently wrote 0 rows.

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
    'marketing.seo.drift'::text,
    'schema_drift'::text,
    'schema_drift_detector_degraded'::text,
    'schema_drift_scanner_unable_to_classify'::text,
    'schema_drift_scanner_ambiguous_column'::text,
    'schema_drift_accepted_baseline'::text
  ]));

ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_partition_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_partition_chk
  CHECK (
    (company_id IS NOT NULL)
    OR (firm_id IS NOT NULL)
    OR (issue_kind = ANY (ARRAY[
      'marketing.seo.drift'::text,
      'pilot.lifecycle.chain.anchor'::text,
      'schema_drift'::text,
      'schema_drift_detector_degraded'::text,
      'schema_drift_scanner_unable_to_classify'::text,
      'schema_drift_scanner_ambiguous_column'::text,
      'schema_drift_accepted_baseline'::text
    ]))
  );
