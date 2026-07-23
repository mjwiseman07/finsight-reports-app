-- Phase PBC-TIEOUT-4B.4: monthly BS recon cron observability table
-- Patterned after qbo_cdc_runs (service-role RLS, timestamptz timestamps, structured counters)

CREATE TABLE IF NOT EXISTS public.audit_ready_cron_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name text NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  as_of_date date NOT NULL,
  engagements_attempted int NOT NULL DEFAULT 0,
  engagements_succeeded_tie int NOT NULL DEFAULT 0,
  engagements_succeeded_kickout int NOT NULL DEFAULT 0,
  engagements_failed int NOT NULL DEFAULT 0,
  engagements_skipped int NOT NULL DEFAULT 0,
  duration_ms int,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_ready_cron_runs_name_time
  ON public.audit_ready_cron_runs (cron_name, triggered_at DESC);

ALTER TABLE public.audit_ready_cron_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_ready_cron_runs_service_role
  ON public.audit_ready_cron_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.audit_ready_cron_runs IS
  'PBC-TIEOUT-4B.4: observability log for scheduled Audit Ready cron runs (e.g. monthly BS recon).';
