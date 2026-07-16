-- Issue #4 — QBO CDC hourly reconciliation cron
-- Two new tables, both additive.

-- ============================================================================
-- qbo_cdc_cursors — one row per (realm_id, entity_name)
-- Tracks the last observed `MetaData.LastUpdatedTime` from CDC, so the next
-- hourly run can use `changedSince = this_value` to only pull deltas.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.qbo_cdc_cursors (
    id               bigserial PRIMARY KEY,
    realm_id         text NOT NULL,
    entity_name      text NOT NULL,
    last_changed_at  timestamp with time zone NOT NULL,
    updated_at       timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (realm_id, entity_name)
);

CREATE INDEX IF NOT EXISTS idx_qbo_cdc_cursors_realm
    ON public.qbo_cdc_cursors (realm_id);

COMMENT ON TABLE public.qbo_cdc_cursors IS
    'CDC watermark per (realm, entity). Advanced by the hourly CDC cron.';

-- ============================================================================
-- qbo_cdc_runs — audit trail
-- One row per (cron_execution, realm_id). Intuit App Store reviewer evidence.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.qbo_cdc_runs (
    id                  bigserial PRIMARY KEY,
    run_id              uuid NOT NULL,
    realm_id            text NOT NULL,
    started_at          timestamp with time zone NOT NULL DEFAULT now(),
    finished_at         timestamp with time zone,
    entities_queried    integer NOT NULL DEFAULT 0,
    entities_changed    integer NOT NULL DEFAULT 0,
    events_rescued      integer NOT NULL DEFAULT 0,  -- no matching webhook row
    events_confirmed    integer NOT NULL DEFAULT 0,  -- matching webhook row within ±60s
    events_inserted     integer NOT NULL DEFAULT 0,  -- rows we upserted (rescued + already-covered de-duped)
    status              text NOT NULL DEFAULT 'running',
    error_message       text,
    sample_intuit_tid   text,
    elapsed_ms          integer
);

CREATE INDEX IF NOT EXISTS idx_qbo_cdc_runs_run_id
    ON public.qbo_cdc_runs (run_id);
CREATE INDEX IF NOT EXISTS idx_qbo_cdc_runs_started_at
    ON public.qbo_cdc_runs (started_at DESC);

COMMENT ON TABLE public.qbo_cdc_runs IS
    'Audit log for QBO CDC hourly cron runs. Provides Intuit App Store reviewers with evidence of webhook fallback reconciliation.';

-- RLS: service_role only (cron + server). No anon/authenticated policies.
ALTER TABLE public.qbo_cdc_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qbo_cdc_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qbo_cdc_cursors_service_role_all ON public.qbo_cdc_cursors;
CREATE POLICY qbo_cdc_cursors_service_role_all
  ON public.qbo_cdc_cursors
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS qbo_cdc_runs_service_role_all ON public.qbo_cdc_runs;
CREATE POLICY qbo_cdc_runs_service_role_all
  ON public.qbo_cdc_runs
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.qbo_cdc_cursors FROM anon, authenticated;
REVOKE ALL ON public.qbo_cdc_runs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.qbo_cdc_cursors TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.qbo_cdc_runs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.qbo_cdc_cursors_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.qbo_cdc_runs_id_seq TO service_role;
