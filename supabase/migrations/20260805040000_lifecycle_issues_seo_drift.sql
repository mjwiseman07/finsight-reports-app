-- Phase MEM_LIFECYCLE Block 8 — allow marketing.seo.drift issues without
-- company/firm partition (SEO surface is global, not engagement-scoped).

ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_issue_kind_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_issue_kind_chk
  CHECK (issue_kind IN (
    'pilot.lifecycle.drift.detected',
    'pilot.lifecycle.transition.rejected',
    'pilot.lifecycle.chain.integrity.broken',
    'pilot.lifecycle.monitor.error',
    'marketing.seo.drift'
  ));

ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_partition_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_partition_chk
  CHECK (
    (company_id IS NOT NULL OR firm_id IS NOT NULL)
    OR (issue_kind = 'marketing.seo.drift')
  );

COMMENT ON CONSTRAINT lifecycle_issues_issue_kind_chk ON public.lifecycle_issues IS
  'Block 6 pilot kinds + Block 8 marketing.seo.drift';

COMMENT ON CONSTRAINT lifecycle_issues_partition_chk ON public.lifecycle_issues IS
  'Partition XOR for pilot issues; marketing.seo.drift may have both null';
