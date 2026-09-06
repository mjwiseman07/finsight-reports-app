-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260804234230
-- NAME: lifecycle_issues
-- DATABASE_MD5_UTF8: 0b75c1945dea894acbe0427a847d13c5
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 3274
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

-- Phase MEM_LIFECYCLE Block 6
ALTER TABLE public.pilot_lifecycle_events DROP CONSTRAINT IF EXISTS pilot_lifecycle_events_event_kind_chk;
ALTER TABLE public.pilot_lifecycle_events ADD CONSTRAINT pilot_lifecycle_events_event_kind_chk CHECK (event_kind IN (
  'pilot.lifecycle.transition','pilot.lifecycle.drift-detected','pilot.lifecycle.auto-reconciled','pilot.lifecycle.escalated','pilot.lifecycle.recurred','pilot.lifecycle.created','pilot.lifecycle.assertion.evidence-attached','pilot.lifecycle.transition.rejected'
));
ALTER TABLE public.pilot_lifecycle_events DROP CONSTRAINT IF EXISTS pilot_lifecycle_events_to_status_null_scope_chk;
ALTER TABLE public.pilot_lifecycle_events DROP CONSTRAINT IF EXISTS pilot_lifecycle_events_to_status_scope_chk;
ALTER TABLE public.pilot_lifecycle_events ADD CONSTRAINT pilot_lifecycle_events_to_status_scope_chk CHECK ((to_status IS NOT NULL) OR (event_kind = 'pilot.lifecycle.assertion.evidence-attached'));

CREATE TABLE IF NOT EXISTS public.lifecycle_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  detected_at timestamptz NOT NULL DEFAULT NOW(),
  fingerprint text NOT NULL,
  level text NOT NULL,
  issue_kind text NOT NULL,
  pilot_slot_id uuid NULL,
  company_id uuid NULL,
  firm_id uuid NULL,
  tags jsonb NOT NULL DEFAULT '{}'::jsonb,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz NULL,
  resolved_by uuid NULL,
  resolution_note text NULL,
  sentry_event_id text NULL,
  CONSTRAINT lifecycle_issues_level_chk CHECK (level IN ('info','warning','error','fatal')),
  CONSTRAINT lifecycle_issues_issue_kind_chk CHECK (issue_kind IN ('pilot.lifecycle.drift.detected','pilot.lifecycle.transition.rejected','pilot.lifecycle.chain.integrity.broken','pilot.lifecycle.monitor.error')),
  CONSTRAINT lifecycle_issues_partition_chk CHECK (company_id IS NOT NULL OR firm_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_issues_fingerprint_hour_uidx ON public.lifecycle_issues (fingerprint, (date_trunc('hour', timezone('UTC', detected_at))));
CREATE INDEX IF NOT EXISTS lifecycle_issues_detected_at_idx ON public.lifecycle_issues (detected_at DESC);
CREATE INDEX IF NOT EXISTS lifecycle_issues_company_detected_idx ON public.lifecycle_issues (company_id, detected_at DESC) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lifecycle_issues_firm_detected_idx ON public.lifecycle_issues (firm_id, detected_at DESC) WHERE firm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lifecycle_issues_unresolved_idx ON public.lifecycle_issues (level, detected_at DESC) WHERE resolved_at IS NULL;

ALTER TABLE public.lifecycle_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lifecycle_issues_partition_read ON public.lifecycle_issues;
CREATE POLICY lifecycle_issues_partition_read ON public.lifecycle_issues FOR SELECT TO authenticated USING ((company_id IS NOT NULL AND company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND status = 'active')) OR (firm_id IS NOT NULL AND firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid() AND status = 'active')));
REVOKE ALL ON public.lifecycle_issues FROM anon;
GRANT SELECT ON public.lifecycle_issues TO authenticated;
GRANT ALL ON public.lifecycle_issues TO service_role;
