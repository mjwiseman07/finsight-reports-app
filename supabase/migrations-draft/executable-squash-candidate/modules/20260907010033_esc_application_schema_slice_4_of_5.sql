-- =============================================================================
-- EXECUTABLE SQUASH CANDIDATE — DRAFT / NON-DEPLOYABLE
-- Proposed version: 20260907010033
-- Proposed name: esc_application_schema_slice_4_of_5
-- Module: public_application_schema_slice_4
-- Provenance: Option D assembled app files (41) stripped of nested txn markers; RLS/privilege closed before COMMIT
-- NOT in active supabase/migrations/. Production mutation NOT authorized.
-- UTF-8 LF. statements[] must remain non-empty when eventually recorded.
-- =============================================================================
BEGIN;
-- OPTION 2 secure multi-version split: slice 4/5
-- Source BEGIN/COMMIT stripped; exactly one outer transaction.
-- Files: 41; RLS closure tables: 0; fn dispositions: 28

-- >>> begin 20260722221611_bs_recon_summary_basis_and_computed_lines.sql
-- Additive migration for PBC-TIEOUT-4B.3.5.
-- Adds is_computed_line to summary lines (Net Income row support) and
-- accounting_method to summary artifacts (Accrual vs Cash audit trail).

ALTER TABLE public.audit_ready_bs_recon_summary_lines
  ADD COLUMN IF NOT EXISTS is_computed_line boolean NOT NULL DEFAULT false;

-- Per-report accounting basis captured at fixture-capture time.
-- Lives on the summary artifact (not the parent tie_out_runs) because
-- a firm may run BS on Accrual basis and P&L on Cash basis in the same
-- tie-out run — basis is a property of the specific report, not the
-- orchestration run that produced it.
ALTER TABLE public.audit_ready_bs_recon_summary_artifacts
  ADD COLUMN IF NOT EXISTS accounting_method text
  CHECK (accounting_method IN ('Accrual', 'Cash'));

-- Backfill any pre-existing rows to 'Accrual' (default assumption for
-- the pilot). Safe because there are no Cash-basis clients in
-- production yet as of this migration.
UPDATE public.audit_ready_bs_recon_summary_artifacts
  SET accounting_method = 'Accrual'
  WHERE accounting_method IS NULL;
-- <<< end 20260722221611_bs_recon_summary_basis_and_computed_lines.sql

-- >>> begin 20260722233000_bs_recon_summary_lines_qbo_account_id_nullable.sql
-- Phase PBC-TIEOUT-4B.3.5 Fix-up #2
--
-- Relax NOT NULL on audit_ready_bs_recon_summary_lines.qbo_account_id.
-- Computed summary lines (e.g. QBO's Net Income row on the Balance Sheet)
-- have no underlying QBO account — the value is derived on the report
-- itself. The is_computed_line boolean column (added in the prior
-- migration in this phase) already distinguishes these rows from
-- real-account rows. Application code inserts qbo_account_id = NULL
-- for these rows, which the previous NOT NULL constraint rejected.
--
-- Backfill is a no-op: existing rows all have non-null qbo_account_id
-- values (they were all real-account rows before Phase 4B.3.5).
--
-- Idempotent: ALTER COLUMN DROP NOT NULL is a no-op if the column is
-- already nullable.
ALTER TABLE audit_ready_bs_recon_summary_lines
  ALTER COLUMN qbo_account_id DROP NOT NULL;

-- Add a partial CHECK to encode the semantic: qbo_account_id may be NULL
-- ONLY when is_computed_line = true. This prevents accidental future
-- inserts of real-account rows with a null account id — those would
-- indicate a bug in the parser or resolver.
ALTER TABLE audit_ready_bs_recon_summary_lines
  DROP CONSTRAINT IF EXISTS audit_ready_bs_recon_summary_lines_qbo_account_id_computed_check;

ALTER TABLE audit_ready_bs_recon_summary_lines
  ADD CONSTRAINT audit_ready_bs_recon_summary_lines_qbo_account_id_computed_check
  CHECK (
    (is_computed_line = true AND qbo_account_id IS NULL)
    OR (is_computed_line = false AND qbo_account_id IS NOT NULL)
  );
-- <<< end 20260722233000_bs_recon_summary_lines_qbo_account_id_nullable.sql

-- >>> begin 20260723050000_audit_ready_cron_runs.sql
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
-- <<< end 20260723050000_audit_ready_cron_runs.sql

-- >>> begin 20260724010000_kickout_investigations.sql
-- PBC-TIEOUT-4.1: Kickout investigations table (append-only)
-- Feeds 4.2 auto-reconcile memory. Polymorphic FK to BS lines and PBC runs.

CREATE TABLE IF NOT EXISTS public.audit_ready_kickout_investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  kickout_source_type TEXT NOT NULL CHECK (kickout_source_type IN ('bs_summary_line', 'pbc_run')),
  kickout_source_id UUID NOT NULL,
  investigated_by UUID NOT NULL REFERENCES auth.users(id),
  investigated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT NOT NULL CHECK (length(trim(note)) > 0),
  resolution_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (resolution_status IN ('pending', 'resolved', 'escalated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kickout_inv_source_lookup
  ON public.audit_ready_kickout_investigations
    (engagement_id, kickout_source_type, kickout_source_id, investigated_at DESC);

CREATE INDEX IF NOT EXISTS idx_kickout_inv_engagement_status
  ON public.audit_ready_kickout_investigations
    (engagement_id, resolution_status, investigated_at DESC);

ALTER TABLE public.audit_ready_kickout_investigations ENABLE ROW LEVEL SECURITY;

-- SELECT: user must have firm or company access to the engagement
CREATE POLICY kickout_inv_select
  ON public.audit_ready_kickout_investigations FOR SELECT
  TO authenticated
  USING (
    engagement_id IN (
      SELECT e.id FROM public.audit_ready_engagements e
      WHERE
        (e.firm_id IS NOT NULL AND e.firm_id IN (
          SELECT firm_id FROM public.firm_memberships
          WHERE user_id = (SELECT auth.uid()) AND status = 'active'
        ))
        OR
        (e.company_id IS NOT NULL AND e.company_id IN (
          SELECT company_id FROM public.company_users
          WHERE user_id = (SELECT auth.uid()) AND status = 'active'
        ))
    )
  );

-- INSERT: same access + user must be the investigator
CREATE POLICY kickout_inv_insert
  ON public.audit_ready_kickout_investigations FOR INSERT
  TO authenticated
  WITH CHECK (
    investigated_by = (SELECT auth.uid())
    AND engagement_id IN (
      SELECT e.id FROM public.audit_ready_engagements e
      WHERE
        (e.firm_id IS NOT NULL AND e.firm_id IN (
          SELECT firm_id FROM public.firm_memberships
          WHERE user_id = (SELECT auth.uid()) AND status = 'active'
        ))
        OR
        (e.company_id IS NOT NULL AND e.company_id IN (
          SELECT company_id FROM public.company_users
          WHERE user_id = (SELECT auth.uid()) AND status = 'active'
        ))
    )
  );

-- No UPDATE, no DELETE (append-only)
-- <<< end 20260724010000_kickout_investigations.sql

-- >>> begin 20260724020000_kickout_dedupe_rpcs.sql
-- Phase PBC-TIEOUT-4.1.1: dedupe RPCs for Kickout Inbox
-- Landmine: audit_ready_tie_out_runs has no created_at — use COALESCE(completed_at, started_at).
-- Landmine: suppress linked bs_account_recon BEFORE DISTINCT ON, else a linked
-- "latest" run wins the (eng, kind, period) slot and orphans disappear.

CREATE OR REPLACE FUNCTION audit_ready_latest_bs_kickout_lines(
  p_engagement_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  engagement_id uuid,
  qbo_account_id text,
  qbo_account_name text,
  qbo_account_type text,
  tie_variance_cents bigint,
  gl_ending_balance_cents bigint,
  child_run_id uuid,
  line_created_at timestamptz,
  artifact_id uuid,
  period_end date,
  artifact_created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (l.engagement_id, art.period_end, l.qbo_account_id)
    l.id,
    l.engagement_id,
    l.qbo_account_id,
    l.qbo_account_name,
    l.qbo_account_type,
    l.tie_variance_cents,
    l.gl_ending_balance_cents,
    l.child_run_id,
    l.created_at AS line_created_at,
    art.id AS artifact_id,
    art.period_end,
    art.created_at AS artifact_created_at
  FROM audit_ready_bs_recon_summary_lines l
  JOIN audit_ready_bs_recon_summary_artifacts art
    ON art.id = l.summary_artifact_id
  WHERE l.engagement_id = ANY (p_engagement_ids)
    AND l.totals_status = 'kickout'
  ORDER BY
    l.engagement_id,
    art.period_end,
    l.qbo_account_id,
    art.created_at DESC,
    l.created_at DESC;
$$;

REVOKE ALL ON FUNCTION audit_ready_latest_bs_kickout_lines(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION audit_ready_latest_bs_kickout_lines(uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION audit_ready_latest_pbc_kickout_runs(
  p_engagement_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  engagement_id uuid,
  tie_out_kind text,
  period_end date,
  subledger_total_cents bigint,
  gl_total_cents bigint,
  subledger_source_url text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH eligible AS (
    -- Fix 3 first: drop bs_account_recon already surfaced via kickout summary lines
    SELECT
      r.id,
      r.engagement_id,
      r.tie_out_kind,
      r.period_end,
      r.subledger_total_cents,
      r.gl_total_cents,
      r.subledger_source_url,
      COALESCE(r.completed_at, r.started_at) AS created_at
    FROM audit_ready_tie_out_runs r
    WHERE r.engagement_id = ANY (p_engagement_ids)
      AND r.totals_status = 'kickout'
      AND r.tie_out_kind <> 'bs_recon_summary'
      AND NOT (
        r.tie_out_kind = 'bs_account_recon'
        AND EXISTS (
          SELECT 1
          FROM audit_ready_bs_recon_summary_lines sl
          WHERE sl.child_run_id = r.id
            AND sl.totals_status = 'kickout'
        )
      )
  )
  -- Fix 2: latest remaining run per (engagement, kind, period)
  SELECT DISTINCT ON (e.engagement_id, e.tie_out_kind, e.period_end)
    e.id,
    e.engagement_id,
    e.tie_out_kind,
    e.period_end,
    e.subledger_total_cents,
    e.gl_total_cents,
    e.subledger_source_url,
    e.created_at
  FROM eligible e
  ORDER BY
    e.engagement_id,
    e.tie_out_kind,
    e.period_end,
    e.created_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION audit_ready_latest_pbc_kickout_runs(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION audit_ready_latest_pbc_kickout_runs(uuid[]) TO authenticated, service_role;
-- <<< end 20260724020000_kickout_dedupe_rpcs.sql

-- >>> begin 20260724030000_ar_tieout412a_kind_reconcile.sql
-- Phase PBC-TIEOUT-4.1.2 Block A: kind reconciliation
-- Rename legacy 'fixed_assets' tie_out_kind values to canonical 'fixed_asset_rollforward'.
-- Idempotent — safe to re-run.

UPDATE public.audit_ready_tie_out_runs
SET tie_out_kind = 'fixed_asset_rollforward'
WHERE tie_out_kind = 'fixed_assets';

-- Also reconcile classifier-persisted kind on PBC requests (if any legacy rows)
UPDATE public.audit_ready_pbc_requests
SET tie_out_kind = 'fixed_asset_rollforward'
WHERE tie_out_kind = 'fixed_assets';

DO $$
DECLARE
  legacy_count int;
BEGIN
  SELECT COUNT(*) INTO legacy_count
  FROM public.audit_ready_tie_out_runs
  WHERE tie_out_kind = 'fixed_assets';
  IF legacy_count > 0 THEN
    RAISE EXCEPTION 'Legacy fixed_assets rows still exist on runs: %', legacy_count;
  END IF;

  SELECT COUNT(*) INTO legacy_count
  FROM public.audit_ready_pbc_requests
  WHERE tie_out_kind = 'fixed_assets';
  IF legacy_count > 0 THEN
    RAISE EXCEPTION 'Legacy fixed_assets rows still exist on pbc_requests: %', legacy_count;
  END IF;
END $$;
-- <<< end 20260724030000_ar_tieout412a_kind_reconcile.sql

-- >>> begin 20260724030100_ar_tieout412a_run_artifacts.sql
-- Phase PBC-TIEOUT-4.1.2 Block A: run artifact storage + regeneration lineage

CREATE TABLE IF NOT EXISTS public.audit_ready_run_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tie_out_run_id uuid NOT NULL
    REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  artifact_kind text NOT NULL CHECK (artifact_kind IN ('xlsx', 'pdf')),
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes >= 0),
  content_hash text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tie_out_run_id, artifact_kind)
);

CREATE INDEX IF NOT EXISTS idx_run_artifacts_run
  ON public.audit_ready_run_artifacts (tie_out_run_id);
CREATE INDEX IF NOT EXISTS idx_run_artifacts_generated_at
  ON public.audit_ready_run_artifacts (generated_at DESC);

ALTER TABLE public.audit_ready_run_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS run_artifacts_select ON public.audit_ready_run_artifacts;
CREATE POLICY run_artifacts_select ON public.audit_ready_run_artifacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_tie_out_runs r
      JOIN public.audit_ready_engagements e ON e.id = r.engagement_id
      WHERE r.id = audit_ready_run_artifacts.tie_out_run_id
        AND (
          EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          )
        )
    )
  );

-- Regeneration lineage on runs
ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS regenerated_from_run_id uuid
    REFERENCES public.audit_ready_tie_out_runs(id),
  ADD COLUMN IF NOT EXISTS trigger_kind text NOT NULL DEFAULT 'initial';

-- Backfill + constrain trigger_kind (column may already exist without check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_ready_tie_out_runs_trigger_kind_check'
  ) THEN
    ALTER TABLE public.audit_ready_tie_out_runs
      ADD CONSTRAINT audit_ready_tie_out_runs_trigger_kind_check
      CHECK (trigger_kind IN ('initial', 'regenerated', 'cron'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tie_out_runs_regenerated_from
  ON public.audit_ready_tie_out_runs (regenerated_from_run_id)
  WHERE regenerated_from_run_id IS NOT NULL;

-- Storage bucket (idempotent). If your project forbids SQL bucket inserts,
-- create `audit-ready-workpapers` via Dashboard and skip this INSERT.
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-ready-workpapers', 'audit-ready-workpapers', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "audit_ready_workpapers_select" ON storage.objects;
CREATE POLICY "audit_ready_workpapers_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audit-ready-workpapers'
    AND EXISTS (
      SELECT 1
      FROM public.audit_ready_run_artifacts a
      JOIN public.audit_ready_tie_out_runs r ON r.id = a.tie_out_run_id
      JOIN public.audit_ready_engagements e ON e.id = r.engagement_id
      WHERE a.storage_path = storage.objects.name
        AND (
          EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          )
        )
    )
  );
-- <<< end 20260724030100_ar_tieout412a_run_artifacts.sql

-- >>> begin 20260724220000_ar_tieout412b_raw_qbo_payload.sql
-- Phase PBC-TIEOUT-4.1.2 Block B: raw QBO payload persistence for Source Data tab
-- Path Y: build() reads from this column, never live-fetches.
ALTER TABLE audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS raw_qbo_payload_jsonb jsonb;

COMMENT ON COLUMN audit_ready_tie_out_runs.raw_qbo_payload_jsonb IS
  'Snapshot of the QBO API response(s) used to compute this run. Read by workpaper emitters for the Source Data tab. Never mutated after run completion.';
-- <<< end 20260724220000_ar_tieout412b_raw_qbo_payload.sql

-- >>> begin 20260725050000_ar_tieout420a_resolution_code.sql
-- Phase PBC-TIEOUT-4.2 Block A: resolution_code on kickout investigations
-- Structured disposition for memory matching.
-- NULL-safe: legacy rows stay NULL; API layer enforces required on new INSERTs.
-- Forward reference: audit_ready_memory AddonCode gates Block B (auto-clear)
-- and Block C (governance); Suggest is not gated in Block A.

ALTER TABLE public.audit_ready_kickout_investigations
  ADD COLUMN IF NOT EXISTS resolution_code text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_ready_kickout_investigations_resolution_code_chk'
      AND conrelid = 'public.audit_ready_kickout_investigations'::regclass
  ) THEN
    ALTER TABLE public.audit_ready_kickout_investigations
      ADD CONSTRAINT audit_ready_kickout_investigations_resolution_code_chk
      CHECK (
        resolution_code IS NULL
        OR resolution_code IN (
          'immaterial',
          'timing',
          'reclass',
          'true_error',
          'other'
        )
      );
  END IF;
END
$$;

COMMENT ON COLUMN public.audit_ready_kickout_investigations.resolution_code IS
  'Structured disposition for memory matching (Block B). Canonical values: '
  'immaterial | timing | reclass | true_error | other. NULL-safe for legacy '
  'rows; API layer enforces required on new INSERTs.';
-- <<< end 20260725050000_ar_tieout420a_resolution_code.sql

-- >>> begin 20260725050100_ar_tieout420a_similar_kickouts_rpc.sql
-- Phase PBC-TIEOUT-4.2 Block A: deterministic similar-resolution query layer.
-- Historical source rows are joined directly because the existing
-- audit_ready_latest_* objects are parameterized functions, not views.

CREATE OR REPLACE FUNCTION public.get_similar_kickout_resolutions(
  p_engagement_id uuid,
  p_source_type text,
  p_source_key jsonb
)
RETURNS TABLE (
  investigation_id uuid,
  investigated_at timestamptz,
  investigated_by uuid,
  note text,
  resolution_code text,
  resolution_status text,
  match_key text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT
      i.id,
      i.investigated_at,
      i.investigated_by,
      i.note,
      i.resolution_code,
      i.resolution_status,
      i.kickout_source_type,
      i.kickout_source_id
    FROM public.audit_ready_kickout_investigations i
    WHERE i.engagement_id = p_engagement_id
      AND i.resolution_status = 'resolved'
      AND i.investigated_at >= now() - interval '6 months'
      AND i.kickout_source_type = p_source_type
  ),
  matched AS (
    SELECT
      s.id AS investigation_id,
      s.investigated_at,
      s.investigated_by,
      s.note,
      s.resolution_code,
      s.resolution_status,
      b.qbo_account_id AS match_key
    FROM scoped s
    JOIN public.audit_ready_bs_recon_summary_lines b
      ON b.id = s.kickout_source_id
    WHERE s.kickout_source_type = 'bs_summary_line'
      AND b.qbo_account_id = p_source_key->>'qbo_account_id'

    UNION ALL

    SELECT
      s.id AS investigation_id,
      s.investigated_at,
      s.investigated_by,
      s.note,
      s.resolution_code,
      s.resolution_status,
      r.tie_out_kind AS match_key
    FROM scoped s
    JOIN public.audit_ready_tie_out_runs r
      ON r.id = s.kickout_source_id
    WHERE s.kickout_source_type = 'pbc_run'
      AND r.tie_out_kind = p_source_key->>'tie_out_kind'
  )
  SELECT
    m.investigation_id,
    m.investigated_at,
    m.investigated_by,
    m.note,
    m.resolution_code,
    m.resolution_status,
    m.match_key
  FROM matched m
  ORDER BY m.investigated_at DESC
  LIMIT 3;
$$;

COMMENT ON FUNCTION public.get_similar_kickout_resolutions(uuid, text, jsonb) IS
  'Returns up to 3 recent resolved investigations matching a candidate '
  'kickout. Block A uses pure recency; code-aware ranking arrives in Block B.';

REVOKE ALL ON FUNCTION public.get_similar_kickout_resolutions(uuid, text, jsonb)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_similar_kickout_resolutions(uuid, text, jsonb)
  TO authenticated, service_role;

-- One batched count query powers first-render Inbox chips without N+1 fetches.
CREATE OR REPLACE FUNCTION public.get_similar_kickout_resolution_counts(
  p_engagement_ids uuid[]
)
RETURNS TABLE (
  engagement_id uuid,
  source_type text,
  match_key text,
  similar_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT
      i.engagement_id,
      i.kickout_source_type,
      i.kickout_source_id
    FROM public.audit_ready_kickout_investigations i
    WHERE i.engagement_id = ANY (p_engagement_ids)
      AND i.resolution_status = 'resolved'
      AND i.investigated_at >= now() - interval '6 months'
  ),
  keyed AS (
    SELECT
      s.engagement_id,
      'bs_summary_line'::text AS source_type,
      b.qbo_account_id AS match_key
    FROM scoped s
    JOIN public.audit_ready_bs_recon_summary_lines b
      ON b.id = s.kickout_source_id
    WHERE s.kickout_source_type = 'bs_summary_line'

    UNION ALL

    SELECT
      s.engagement_id,
      'pbc_run'::text AS source_type,
      r.tie_out_kind AS match_key
    FROM scoped s
    JOIN public.audit_ready_tie_out_runs r
      ON r.id = s.kickout_source_id
    WHERE s.kickout_source_type = 'pbc_run'
  )
  SELECT
    k.engagement_id,
    k.source_type,
    k.match_key,
    count(*)::bigint AS similar_count
  FROM keyed k
  WHERE k.match_key IS NOT NULL
  GROUP BY k.engagement_id, k.source_type, k.match_key;
$$;

COMMENT ON FUNCTION public.get_similar_kickout_resolution_counts(uuid[]) IS
  'Returns batched six-month similar-resolution counts for Kickout Inbox chips.';

REVOKE ALL ON FUNCTION public.get_similar_kickout_resolution_counts(uuid[])
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_similar_kickout_resolution_counts(uuid[])
  TO authenticated, service_role;
-- <<< end 20260725050100_ar_tieout420a_similar_kickouts_rpc.sql

-- >>> begin 20260725060000_ar_tieout42_memory_events.sql
-- Phase PBC-TIEOUT-4.2 Instrumentation: pilot-week event log
-- Purpose: capture Suggest-surface interaction data to drive Block B threshold design.
-- Retention: no TTL for pilot; can add cleanup job later if volume warrants.
-- Not to be reused for Pulse usage or ledger events — memory-specific by design.
-- Landmine: there is no audit_ready_engagement_members table. SELECT RLS mirrors
-- kickout_investigations via firm_memberships / company_users on engagements.

CREATE TABLE IF NOT EXISTS public.audit_ready_memory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  engagement_id uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  actor_user_id uuid NULL,
  event_at timestamptz NOT NULL DEFAULT NOW(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT audit_ready_memory_events_event_type_chk
    CHECK (event_type IN (
      'suggestions_shown',
      'suggestions_none',
      'copy_clicked',
      'resolution_saved'
    ))
);

CREATE INDEX IF NOT EXISTS audit_ready_memory_events_engagement_event_at_idx
  ON public.audit_ready_memory_events (engagement_id, event_at DESC);

CREATE INDEX IF NOT EXISTS audit_ready_memory_events_event_type_at_idx
  ON public.audit_ready_memory_events (event_type, event_at DESC);

ALTER TABLE public.audit_ready_memory_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_ready_memory_events_select
  ON public.audit_ready_memory_events;

CREATE POLICY audit_ready_memory_events_select
  ON public.audit_ready_memory_events
  FOR SELECT
  TO authenticated
  USING (
    engagement_id IN (
      SELECT e.id FROM public.audit_ready_engagements e
      WHERE
        (e.firm_id IS NOT NULL AND e.firm_id IN (
          SELECT firm_id FROM public.firm_memberships
          WHERE user_id = (SELECT auth.uid()) AND status = 'active'
        ))
        OR
        (e.company_id IS NOT NULL AND e.company_id IN (
          SELECT company_id FROM public.company_users
          WHERE user_id = (SELECT auth.uid()) AND status = 'active'
        ))
    )
  );

-- No INSERT/UPDATE/DELETE policies — service role only.

COMMENT ON TABLE public.audit_ready_memory_events IS
  'Phase 4.2 memory instrumentation. Server-side emission for suggestions_shown/none + resolution_saved; client fire-and-forget for copy_clicked. Feeds Block B threshold design. No TTL for pilot.';

COMMENT ON COLUMN public.audit_ready_memory_events.actor_user_id IS
  'User whose action produced the event. NULL for system-emitted (forward-compat for Block B memory_replay).';

COMMENT ON COLUMN public.audit_ready_memory_events.payload IS
  'Event-specific jsonb. Common fields: kickout_source_id, source_type, suggestion_count, top_resolution_code, copied_investigation_id, copied_resolution_code, resolution_status, resolution_code, was_copied, matched_copied_code.';
-- <<< end 20260725060000_ar_tieout42_memory_events.sql

-- >>> begin 20260727000100_users_auth_trigger_single_writer.sql
-- Phase FIX-USERS-PKEY: single-writer auth trigger
-- Retires all app-side inserts to public.users. Handler is source of truth.
-- Idempotent, safe to re-run.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  -- Idempotent insert. Populate metadata columns from raw_user_meta_data
  -- so signup form fields aren't lost when we retire the app-side writers.
  -- created_at has default now(); do not override so new signups get wall-clock time.
  insert into public.users (
    id,
    email,
    first_name,
    last_name,
    business_name
  )
  values (
    new.id,
    new.email,
    nullif(trim(meta->>'first_name'), ''),
    nullif(trim(meta->>'last_name'), ''),
    nullif(trim(meta->>'business_name'), '')
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    -- Fail-open: never block auth. Log for observability.
    raise notice '[handle_new_auth_user] failed to insert public.users row for auth.users.id=%: % (%)',
      new.id, sqlerrm, sqlstate;
    return new;
end;
$$;

-- Drop any prior trigger by this name (idempotency)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- Backfill: any existing auth.users without a public.users row.
-- Copy auth.users.created_at into public.users.created_at explicitly
-- so historical timestamps are preserved (default now() would clobber them).
insert into public.users (
  id,
  email,
  first_name,
  last_name,
  business_name,
  created_at
)
select
  au.id,
  au.email,
  nullif(trim((au.raw_user_meta_data->>'first_name')), ''),
  nullif(trim((au.raw_user_meta_data->>'last_name')), ''),
  nullif(trim((au.raw_user_meta_data->>'business_name')), ''),
  coalesce(au.created_at, now())
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null
on conflict (id) do nothing;

comment on function public.handle_new_auth_user() is
  'Phase FIX-USERS-PKEY: single-writer trigger. Do not add app-side inserts to public.users. See docs/fix-users-pkey.md.';
-- <<< end 20260727000100_users_auth_trigger_single_writer.sql

-- >>> begin 20260804213003_pilot_lifecycle_events.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260804213003
-- NAME: pilot_lifecycle_events
-- DATABASE_MD5_UTF8: 34ca62d02d68fac9fc81bf485ba1a02c
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 5454
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

-- Phase MEM-LIFECYCLE Block 1 — pilot_slots lifecycle memory event log

CREATE TABLE IF NOT EXISTS public.pilot_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event identity
  event_kind text NOT NULL,
  event_at timestamptz NOT NULL DEFAULT NOW(),
  schema_version text NOT NULL DEFAULT '42.7E.1',

  -- Subject
  pilot_slot_id uuid NOT NULL,
  from_status text NULL,
  to_status text NOT NULL,
  classification_hint text NULL,

  -- Isolation (caller-resolved from pilot_slots)
  company_id uuid NULL,
  firm_id uuid NULL,

  -- Actor
  actor_kind text NOT NULL,
  actor_user_id uuid NULL,
  actor_via text NOT NULL,

  -- Assertion tagging (LOCKED PCAOB-6 taxonomy)
  assertions_covered text[] NOT NULL DEFAULT ARRAY[]::text[],

  -- Evidence linkage
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason_code text NOT NULL,
  reason_text text NULL,

  -- Payload
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Hash chain (populated by BEFORE INSERT trigger in Block 2)
  prev_hash text NULL,
  row_hash text NULL,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT pilot_lifecycle_events_event_kind_chk
    CHECK (event_kind IN (
      'pilot.lifecycle.transition',
      'pilot.lifecycle.drift-detected',
      'pilot.lifecycle.auto-reconciled',
      'pilot.lifecycle.escalated',
      'pilot.lifecycle.recurred'
    )),
  CONSTRAINT pilot_lifecycle_events_actor_kind_chk
    CHECK (actor_kind IN ('user', 'system', 'external')),
  CONSTRAINT pilot_lifecycle_events_actor_via_chk
    CHECK (actor_via IN (
      'panel-consumer',
      'role-adapter',
      'org-edge',
      'direct-api',
      'admin-script',
      'stripe-webhook',
      'cdc-auditor'
    )),
  CONSTRAINT pilot_lifecycle_events_isolation_chk
    CHECK (company_id IS NOT NULL OR firm_id IS NOT NULL),
  CONSTRAINT pilot_lifecycle_events_assertions_subset_chk
    CHECK (assertions_covered <@ ARRAY[
      'existence',
      'completeness',
      'accuracy',
      'valuation',
      'rights_obligations',
      'presentation_disclosure'
    ]::text[])
);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_events_pilot_slot_event_at_idx
  ON public.pilot_lifecycle_events (pilot_slot_id, event_at DESC);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_events_company_event_at_idx
  ON public.pilot_lifecycle_events (company_id, event_at DESC)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pilot_lifecycle_events_firm_event_at_idx
  ON public.pilot_lifecycle_events (firm_id, event_at DESC)
  WHERE firm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pilot_lifecycle_events_event_kind_at_idx
  ON public.pilot_lifecycle_events (event_kind, event_at DESC);

ALTER TABLE public.pilot_lifecycle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pilot_lifecycle_events_select
  ON public.pilot_lifecycle_events;

CREATE POLICY pilot_lifecycle_events_select
  ON public.pilot_lifecycle_events
  FOR SELECT
  TO authenticated
  USING (
    (company_id IS NOT NULL AND company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    ))
    OR
    (firm_id IS NOT NULL AND firm_id IN (
      SELECT firm_id FROM public.firm_memberships
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    ))
  );

COMMENT ON TABLE public.pilot_lifecycle_events IS
  'Phase MEM-LIFECYCLE Block 1. First production table storing memory-builder output. Immutable, hash-chained record of every pilot_slots state transition. All writes go through lib/pilot-lifecycle SSOT module (Block 3) and the BEFORE INSERT hash-chain trigger (Block 2). Feeds Timeline UI (Block 5), state machine (Block 6), Coverage PDF (Block 7), RFC 3161 anchoring (Block 9). No TTL — retention is permanent per audit doctrine.';

COMMENT ON COLUMN public.pilot_lifecycle_events.event_kind IS
  'AuditEventKind extension. Reserved namespace pilot.lifecycle.* per audit README convention. See lib/audit-log-writer/types (Block 3 extension).';

COMMENT ON COLUMN public.pilot_lifecycle_events.classification_hint IS
  'Free-text hint for the >2-target-state case (e.g., cancelled vs converted vs drifted). Frontier UX research (2026) recommends Classification as a distinct ISA 315 assertion; we preserve the information here without forking the LOCKED PCAOB-6 taxonomy.';

COMMENT ON COLUMN public.pilot_lifecycle_events.assertions_covered IS
  'Subset of LOCKED PCAOB-6 taxonomy (lib/audit-ready/assertion-taxonomy.ts). CHECK constraint enforces subset. For pilot_slots lifecycle events, typical values: {existence, completeness, accuracy}. Do NOT extend without updating Provisional #6 Component E.';

COMMENT ON COLUMN public.pilot_lifecycle_events.evidence_refs IS
  'jsonb array of evidence pointers. Shape: [{"kind":"stripe.event","id":"evt_...","url":"stripe:dashboard:..."},{"kind":"webhook.event","id":"we_..."},{"kind":"pilot_slot.snapshot","id":"...","hash":"sha256:..."}]. Drives the Trullion-shape evidence drawer in Block 5.';

COMMENT ON COLUMN public.pilot_lifecycle_events.row_hash IS
  'sha256(prev_hash || canonical_payload). Computed in-transaction by BEFORE INSERT trigger (Block 2). NEVER writeable from application layer.';

COMMENT ON COLUMN public.pilot_lifecycle_events.prev_hash IS
  'row_hash of the immediately-prior row for the same (company_id, firm_id) partition. NULL only for the first row per partition. Trigger enforces.';
-- <<< end 20260804213003_pilot_lifecycle_events.sql

-- >>> begin 20260804213819_pilot_lifecycle_events_hash_chain_trigger.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260804213819
-- NAME: pilot_lifecycle_events_hash_chain_trigger
-- DATABASE_MD5_UTF8: 5ede7d6c22fe4b9ba15e9b038e5379dc
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 7738
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_canonical_payload(
  p_event_kind text,
  p_event_at timestamptz,
  p_schema_version text,
  p_pilot_slot_id uuid,
  p_from_status text,
  p_to_status text,
  p_classification_hint text,
  p_company_id uuid,
  p_firm_id uuid,
  p_actor_kind text,
  p_actor_user_id uuid,
  p_actor_via text,
  p_assertions_covered text[],
  p_evidence_refs jsonb,
  p_reason_code text,
  p_reason_text text,
  p_payload jsonb
) RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'event_kind', p_event_kind,
    'event_at', to_char(p_event_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'schema_version', p_schema_version,
    'pilot_slot_id', p_pilot_slot_id::text,
    'from_status', p_from_status,
    'to_status', p_to_status,
    'classification_hint', p_classification_hint,
    'company_id', p_company_id::text,
    'firm_id', p_firm_id::text,
    'actor_kind', p_actor_kind,
    'actor_user_id', p_actor_user_id::text,
    'actor_via', p_actor_via,
    'assertions_covered', to_jsonb(
      ARRAY(SELECT unnest(p_assertions_covered) ORDER BY 1)
    ),
    'evidence_refs', p_evidence_refs,
    'reason_code', p_reason_code,
    'reason_text', p_reason_text,
    'payload', p_payload
  )::text
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_canonical_payload IS
  'Deterministic serializer for hash-chain input. Excludes id/created_at/prev_hash/row_hash. Assertions are sorted alphabetically so a{existence,completeness} hashes identically to {completeness,existence}.';

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_slot_company_id uuid;
  v_slot_firm_id uuid;
  v_prev_hash text;
  v_canonical text;
BEGIN
  SELECT company_id, firm_id
    INTO v_slot_company_id, v_slot_firm_id
  FROM public.pilot_slots
  WHERE id = NEW.pilot_slot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: pilot_slot_id % does not exist',
      NEW.pilot_slot_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  NEW.company_id := v_slot_company_id;
  NEW.firm_id := v_slot_firm_id;

  IF NEW.prev_hash IS NOT NULL OR NEW.row_hash IS NOT NULL THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: prev_hash and row_hash are trigger-managed; application code must not set them'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.company_id IS NOT NULL THEN
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE company_id = NEW.company_id
    ORDER BY event_at DESC, id DESC
    LIMIT 1;
  ELSE
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE firm_id = NEW.firm_id
    ORDER BY event_at DESC, id DESC
    LIMIT 1;
  END IF;

  NEW.prev_hash := v_prev_hash;

  v_canonical := public.pilot_lifecycle_events_canonical_payload(
    NEW.event_kind,
    NEW.event_at,
    NEW.schema_version,
    NEW.pilot_slot_id,
    NEW.from_status,
    NEW.to_status,
    NEW.classification_hint,
    NEW.company_id,
    NEW.firm_id,
    NEW.actor_kind,
    NEW.actor_user_id,
    NEW.actor_via,
    NEW.assertions_covered,
    NEW.evidence_refs,
    NEW.reason_code,
    NEW.reason_text,
    NEW.payload
  );

  NEW.row_hash := 'sha256:' || encode(
    digest(coalesce(NEW.prev_hash, '') || v_canonical, 'sha256'),
    'hex'
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_before_insert IS
  'In-transaction hash-chain enforcement. Frontier UX Q4 Candidate A pattern: computes hash locally in PL/pgSQL, no network hop, fail-closed. Overrides caller-supplied isolation with authoritative pilot_slots values.';

DROP TRIGGER IF EXISTS pilot_lifecycle_events_before_insert_trg
  ON public.pilot_lifecycle_events;

CREATE TRIGGER pilot_lifecycle_events_before_insert_trg
  BEFORE INSERT ON public.pilot_lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pilot_lifecycle_events_before_insert();

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_reject_mutations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'pilot_lifecycle_events is append-only. Corrections must be new INSERTs (audit trail is sacred). Attempted operation: %',
    TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_reject_mutations IS
  'Append-only enforcement. UPDATE and DELETE fail closed. TigerBeetle doctrine: correction by addition, never mutation.';

DROP TRIGGER IF EXISTS pilot_lifecycle_events_reject_update_trg
  ON public.pilot_lifecycle_events;

CREATE TRIGGER pilot_lifecycle_events_reject_update_trg
  BEFORE UPDATE ON public.pilot_lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pilot_lifecycle_events_reject_mutations();

DROP TRIGGER IF EXISTS pilot_lifecycle_events_reject_delete_trg
  ON public.pilot_lifecycle_events;

CREATE TRIGGER pilot_lifecycle_events_reject_delete_trg
  BEFORE DELETE ON public.pilot_lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pilot_lifecycle_events_reject_mutations();

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_verify_chain(
  p_company_id uuid DEFAULT NULL,
  p_firm_id uuid DEFAULT NULL
) RETURNS TABLE (
  first_broken_event_id uuid,
  first_broken_event_at timestamptz,
  expected_prev_hash text,
  actual_prev_hash text,
  expected_row_hash text,
  actual_row_hash text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row record;
  v_expected_prev text := NULL;
  v_recomputed_hash text;
  v_canonical text;
BEGIN
  IF (p_company_id IS NULL AND p_firm_id IS NULL) OR
     (p_company_id IS NOT NULL AND p_firm_id IS NOT NULL) THEN
    RAISE EXCEPTION 'pilot_lifecycle_events_verify_chain: pass exactly one of p_company_id or p_firm_id';
  END IF;

  FOR v_row IN
    SELECT * FROM public.pilot_lifecycle_events
    WHERE (p_company_id IS NOT NULL AND company_id = p_company_id)
       OR (p_firm_id IS NOT NULL AND firm_id = p_firm_id)
    ORDER BY event_at ASC, id ASC
  LOOP
    v_canonical := public.pilot_lifecycle_events_canonical_payload(
      v_row.event_kind, v_row.event_at, v_row.schema_version,
      v_row.pilot_slot_id, v_row.from_status, v_row.to_status,
      v_row.classification_hint, v_row.company_id, v_row.firm_id,
      v_row.actor_kind, v_row.actor_user_id, v_row.actor_via,
      v_row.assertions_covered, v_row.evidence_refs,
      v_row.reason_code, v_row.reason_text, v_row.payload
    );

    v_recomputed_hash := 'sha256:' || encode(
      digest(coalesce(v_expected_prev, '') || v_canonical, 'sha256'),
      'hex'
    );

    IF v_row.prev_hash IS DISTINCT FROM v_expected_prev
       OR v_row.row_hash IS DISTINCT FROM v_recomputed_hash THEN
      first_broken_event_id := v_row.id;
      first_broken_event_at := v_row.event_at;
      expected_prev_hash := v_expected_prev;
      actual_prev_hash := v_row.prev_hash;
      expected_row_hash := v_recomputed_hash;
      actual_row_hash := v_row.row_hash;
      RETURN NEXT;
      RETURN;
    END IF;

    v_expected_prev := v_row.row_hash;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_verify_chain IS
  'Read-only chain verification. Returns exactly one row (the first broken link) if the chain is broken, or no rows if intact. Called by CDC auditor and Block 9 verifier UI. Frontier UX Q2 pattern: honest verification, no silent degradation.';

REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_verify_chain(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_verify_chain(uuid, uuid) FROM authenticated;
-- <<< end 20260804213819_pilot_lifecycle_events_hash_chain_trigger.sql

-- >>> begin 20260804213934_pilot_lifecycle_events_hash_digest_bytea_fix.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260804213934
-- NAME: pilot_lifecycle_events_hash_digest_bytea_fix
-- DATABASE_MD5_UTF8: 804e70213d39474337ad6a0526df4120
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 3968
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_slot_company_id uuid;
  v_slot_firm_id uuid;
  v_prev_hash text;
  v_canonical text;
BEGIN
  SELECT company_id, firm_id
    INTO v_slot_company_id, v_slot_firm_id
  FROM public.pilot_slots
  WHERE id = NEW.pilot_slot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: pilot_slot_id % does not exist',
      NEW.pilot_slot_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  NEW.company_id := v_slot_company_id;
  NEW.firm_id := v_slot_firm_id;

  IF NEW.prev_hash IS NOT NULL OR NEW.row_hash IS NOT NULL THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: prev_hash and row_hash are trigger-managed; application code must not set them'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.company_id IS NOT NULL THEN
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE company_id = NEW.company_id
    ORDER BY event_at DESC, id DESC
    LIMIT 1;
  ELSE
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE firm_id = NEW.firm_id
    ORDER BY event_at DESC, id DESC
    LIMIT 1;
  END IF;

  NEW.prev_hash := v_prev_hash;

  v_canonical := public.pilot_lifecycle_events_canonical_payload(
    NEW.event_kind,
    NEW.event_at,
    NEW.schema_version,
    NEW.pilot_slot_id,
    NEW.from_status,
    NEW.to_status,
    NEW.classification_hint,
    NEW.company_id,
    NEW.firm_id,
    NEW.actor_kind,
    NEW.actor_user_id,
    NEW.actor_via,
    NEW.assertions_covered,
    NEW.evidence_refs,
    NEW.reason_code,
    NEW.reason_text,
    NEW.payload
  );

  NEW.row_hash := 'sha256:' || encode(
    digest(convert_to(coalesce(NEW.prev_hash, '') || v_canonical, 'UTF8'), 'sha256'),
    'hex'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_verify_chain(
  p_company_id uuid DEFAULT NULL,
  p_firm_id uuid DEFAULT NULL
) RETURNS TABLE (
  first_broken_event_id uuid,
  first_broken_event_at timestamptz,
  expected_prev_hash text,
  actual_prev_hash text,
  expected_row_hash text,
  actual_row_hash text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row record;
  v_expected_prev text := NULL;
  v_recomputed_hash text;
  v_canonical text;
BEGIN
  IF (p_company_id IS NULL AND p_firm_id IS NULL) OR
     (p_company_id IS NOT NULL AND p_firm_id IS NOT NULL) THEN
    RAISE EXCEPTION 'pilot_lifecycle_events_verify_chain: pass exactly one of p_company_id or p_firm_id';
  END IF;

  FOR v_row IN
    SELECT * FROM public.pilot_lifecycle_events
    WHERE (p_company_id IS NOT NULL AND company_id = p_company_id)
       OR (p_firm_id IS NOT NULL AND firm_id = p_firm_id)
    ORDER BY event_at ASC, id ASC
  LOOP
    v_canonical := public.pilot_lifecycle_events_canonical_payload(
      v_row.event_kind, v_row.event_at, v_row.schema_version,
      v_row.pilot_slot_id, v_row.from_status, v_row.to_status,
      v_row.classification_hint, v_row.company_id, v_row.firm_id,
      v_row.actor_kind, v_row.actor_user_id, v_row.actor_via,
      v_row.assertions_covered, v_row.evidence_refs,
      v_row.reason_code, v_row.reason_text, v_row.payload
    );

    v_recomputed_hash := 'sha256:' || encode(
      digest(convert_to(coalesce(v_expected_prev, '') || v_canonical, 'UTF8'), 'sha256'),
      'hex'
    );

    IF v_row.prev_hash IS DISTINCT FROM v_expected_prev
       OR v_row.row_hash IS DISTINCT FROM v_recomputed_hash THEN
      first_broken_event_id := v_row.id;
      first_broken_event_at := v_row.event_at;
      expected_prev_hash := v_expected_prev;
      actual_prev_hash := v_row.prev_hash;
      expected_row_hash := v_recomputed_hash;
      actual_row_hash := v_row.row_hash;
      RETURN NEXT;
      RETURN;
    END IF;

    v_expected_prev := v_row.row_hash;
  END LOOP;

  RETURN;
END;
$$;
-- <<< end 20260804213934_pilot_lifecycle_events_hash_digest_bytea_fix.sql

-- >>> begin 20260804220220_pilot_lifecycle_events_chain_seq_hardening.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260804220220
-- NAME: pilot_lifecycle_events_chain_seq_hardening
-- DATABASE_MD5_UTF8: 0dfe89813e31c0cf5341d8fd65ab4c18
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 17126
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

-- Phase MEM-LIFECYCLE Block 2.5 — chain_seq hardening
--
-- Adds a bigint sequence column as the canonical hash-chain order key,
-- eliminating same-timestamp ordering ambiguity. Serializes concurrent
-- inserts against the same partition via pg_advisory_xact_lock. Adds
-- fork-prevention unique indexes as defense-in-depth.
--
-- Ordering discipline (research-driven — mem2_hash_chain_ordering.md Q1):
--   - chain_seq is the sole ordering primitive for chain-linking.
--   - Trigger: ORDER BY chain_seq DESC LIMIT 1 for prev-hash lookup.
--   - Verifier: ORDER BY chain_seq ASC for the chain walk.
--   - event_at remains for display / range queries only.
--
-- Concurrency (research-driven — mem2_hash_chain_ordering.md Q2):
--   - pg_advisory_xact_lock(hashtext(partition_key)) at trigger top.
--   - Handles first-row-in-partition bootstrap (which SELECT FOR UPDATE
--     cannot, since no tail row exists yet).
--   - Released automatically on commit or rollback.
--   - Non-WAL-logged, invisible to CDC — Block 9's WAL auditor is unaffected.
--
-- Fork prevention (defense-in-depth):
--   - UNIQUE (company_id, prev_hash) WHERE company_id IS NOT NULL AND prev_hash IS NOT NULL
--   - UNIQUE (firm_id, prev_hash)    WHERE firm_id    IS NOT NULL AND prev_hash IS NOT NULL
--   - UNIQUE (company_id)            WHERE company_id IS NOT NULL AND prev_hash IS NULL  -- one genesis per company partition
--   - UNIQUE (firm_id)               WHERE firm_id    IS NOT NULL AND prev_hash IS NULL  -- one genesis per firm partition

-- ---------------------------------------------------------------------------
-- Step 0: Drop the reject-UPDATE trigger temporarily so we can backfill.
-- Reject-DELETE stays on. We reinstall reject-UPDATE at the end.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS pilot_lifecycle_events_reject_update_trg
  ON public.pilot_lifecycle_events;

-- ---------------------------------------------------------------------------
-- Step 1: Create the sequence and add the column (nullable for now).
-- ---------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS public.pilot_lifecycle_events_chain_seq_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

COMMENT ON SEQUENCE public.pilot_lifecycle_events_chain_seq_seq IS
  'Monotonic integer for pilot_lifecycle_events.chain_seq. Assigned by BEFORE INSERT trigger. Sole ordering primitive for hash-chain linking. See research/mem2_hash_chain_ordering.md Q1.';

ALTER TABLE public.pilot_lifecycle_events
  ADD COLUMN IF NOT EXISTS chain_seq bigint;

COMMENT ON COLUMN public.pilot_lifecycle_events.chain_seq IS
  'Monotonic sequence for hash-chain ordering. Assigned by BEFORE INSERT trigger. Do not set from application code — trigger overwrites. Sole primitive for chain-linking; event_at is display-only.';

-- ---------------------------------------------------------------------------
-- Step 2: Backfill chain_seq in event_at ASC, id ASC order.
-- Preserves existing chain integrity: the trigger will use chain_seq DESC
-- for prev-lookup after this migration, and the assigned values match the
-- rows' existing prev_hash / row_hash linkage 1:1.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_row record;
  v_next bigint;
BEGIN
  v_next := 1;
  FOR v_row IN
    SELECT id
    FROM public.pilot_lifecycle_events
    WHERE chain_seq IS NULL
    ORDER BY event_at ASC, id ASC
  LOOP
    UPDATE public.pilot_lifecycle_events
      SET chain_seq = v_next
    WHERE id = v_row.id;
    v_next := v_next + 1;
  END LOOP;

  IF v_next > 1 THEN
    PERFORM setval('public.pilot_lifecycle_events_chain_seq_seq', v_next - 1, true);
    RAISE NOTICE 'chain_seq backfill: assigned % rows, sequence advanced to %', v_next - 1, v_next - 1;
  ELSE
    RAISE NOTICE 'chain_seq backfill: no rows to backfill (table is empty), sequence remains at 1';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Step 3: Set NOT NULL now that all rows have chain_seq populated.
-- ---------------------------------------------------------------------------

ALTER TABLE public.pilot_lifecycle_events
  ALTER COLUMN chain_seq SET NOT NULL;

ALTER TABLE public.pilot_lifecycle_events
  ALTER COLUMN chain_seq SET DEFAULT nextval('public.pilot_lifecycle_events_chain_seq_seq');

-- Note: DEFAULT is set for schema completeness, but the trigger will
-- overwrite it explicitly. The trigger fires BEFORE INSERT and computes
-- chain_seq under the advisory lock, so racing INSERTs cannot see stale
-- sequence values relative to each other's row_hash computation.
-- Actually — nextval() is atomic and every call returns a fresh value
-- regardless of transaction state, so a DEFAULT-assigned chain_seq is
-- monotonic-safe on its own. We keep the trigger doing chain_seq := nextval
-- explicitly for clarity and to keep sequence generation inside the
-- advisory-lock window (defensive; not strictly required for correctness).

-- ---------------------------------------------------------------------------
-- Step 4: Unique constraints for fork prevention (defense-in-depth).
-- These prevent two rows in the same partition from claiming the same
-- prev_hash (or from both being "genesis" rows with prev_hash NULL).
-- The advisory lock is the primary defense; these indexes are the belt.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS pilot_lifecycle_events_no_fork_company
  ON public.pilot_lifecycle_events (company_id, prev_hash)
  WHERE company_id IS NOT NULL AND prev_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pilot_lifecycle_events_no_fork_firm
  ON public.pilot_lifecycle_events (firm_id, prev_hash)
  WHERE firm_id IS NOT NULL AND prev_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pilot_lifecycle_events_one_genesis_company
  ON public.pilot_lifecycle_events (company_id)
  WHERE company_id IS NOT NULL AND prev_hash IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pilot_lifecycle_events_one_genesis_firm
  ON public.pilot_lifecycle_events (firm_id)
  WHERE firm_id IS NOT NULL AND prev_hash IS NULL;

COMMENT ON INDEX public.pilot_lifecycle_events_no_fork_company IS
  'Fork prevention: at most one row per (company_id, prev_hash). Complements pg_advisory_xact_lock in the trigger; does not replace it (research/mem2_hash_chain_ordering.md Q2 §What to avoid).';

COMMENT ON INDEX public.pilot_lifecycle_events_no_fork_firm IS
  'Fork prevention: at most one row per (firm_id, prev_hash). Complements pg_advisory_xact_lock in the trigger.';

COMMENT ON INDEX public.pilot_lifecycle_events_one_genesis_company IS
  'At most one genesis row (prev_hash IS NULL) per company partition.';

COMMENT ON INDEX public.pilot_lifecycle_events_one_genesis_firm IS
  'At most one genesis row (prev_hash IS NULL) per firm partition.';

-- ---------------------------------------------------------------------------
-- Step 5: Replace the BEFORE INSERT trigger function.
--   - Acquire pg_advisory_xact_lock(hashtext(partition_key)) at the top.
--   - Assign chain_seq := nextval() inside the lock.
--   - Use ORDER BY chain_seq DESC LIMIT 1 for prev-hash lookup.
--   - Same canonical_payload / row_hash computation as Block 2.
--   - canonical_payload signature does NOT include chain_seq — chain_seq is
--     a store-assigned pointer, not semantic content. Including it in the
--     hash would make the hash uncheckable from a WAL replay that doesn't
--     have the sequence state.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_slot_company_id uuid;
  v_slot_firm_id uuid;
  v_prev_hash text;
  v_canonical text;
  v_partition_key text;
BEGIN
  -- Step 1: Resolve authoritative isolation from pilot_slots.
  SELECT company_id, firm_id
    INTO v_slot_company_id, v_slot_firm_id
  FROM public.pilot_slots
  WHERE id = NEW.pilot_slot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: pilot_slot_id % does not exist',
      NEW.pilot_slot_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  NEW.company_id := v_slot_company_id;
  NEW.firm_id := v_slot_firm_id;

  -- Step 2: Reject caller-supplied hash / seq values.
  IF NEW.prev_hash IS NOT NULL OR NEW.row_hash IS NOT NULL THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: prev_hash and row_hash are trigger-managed; application code must not set them'
      USING ERRCODE = 'check_violation';
  END IF;

  -- chain_seq is also trigger-managed. Reject any client-supplied value
  -- other than the sequence default (which arrives here as a fresh nextval
  -- from the DEFAULT clause). We overwrite it deterministically inside the
  -- advisory lock below, so we do NOT reject non-null NEW.chain_seq at
  -- this point — Postgres's DEFAULT mechanism already assigned one before
  -- the trigger fired. The overwrite below takes precedence.

  -- Step 3: Build partition_key and acquire the advisory lock.
  -- Partition key format: 'company:<uuid>' or 'firm:<uuid>' — disambiguates
  -- the (rare-but-possible) case where a company_id and firm_id UUID share
  -- lexical prefix or hash collision zones. hashtext() produces int4; that
  -- is the input pg_advisory_xact_lock(bigint) expects (implicit cast).
  IF NEW.company_id IS NOT NULL THEN
    v_partition_key := 'company:' || NEW.company_id::text;
  ELSE
    v_partition_key := 'firm:' || NEW.firm_id::text;
  END IF;

  -- pg_advisory_xact_lock is released automatically at end of transaction
  -- (commit OR rollback), per Postgres docs on advisory locks. This
  -- serializes concurrent inserts against the same partition, closing the
  -- fork race that pure BEFORE-INSERT logic cannot handle.
  PERFORM pg_advisory_xact_lock(hashtext(v_partition_key)::bigint);

  -- Step 4: Look up prev_hash via chain_seq (the canonical order key).
  -- Under the advisory lock, this is the true current tail — no peer
  -- transaction can be in the middle of appending without waiting on us
  -- (or vice versa).
  IF NEW.company_id IS NOT NULL THEN
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE company_id = NEW.company_id
    ORDER BY chain_seq DESC
    LIMIT 1;
  ELSE
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE firm_id = NEW.firm_id
    ORDER BY chain_seq DESC
    LIMIT 1;
  END IF;

  NEW.prev_hash := v_prev_hash;

  -- Step 5: Overwrite chain_seq with a fresh sequence value.
  -- We already got one from DEFAULT nextval() at row-construction time,
  -- but that assignment happened BEFORE the advisory lock. To keep sequence
  -- issuance ordered with respect to prev-hash lookup under contention,
  -- issue a new one now inside the lock. The previous value is burned
  -- (gap in the sequence — that's the documented and acceptable behavior).
  NEW.chain_seq := nextval('public.pilot_lifecycle_events_chain_seq_seq');

  -- Step 6: Compute canonical payload and row_hash.
  -- canonical_payload does NOT include chain_seq — it is a pointer, not
  -- semantic content. Including it would make WAL-replay verification
  -- brittle (a replayed insert on a fresh sequence would get a different
  -- chain_seq and thus a different row_hash).
  v_canonical := public.pilot_lifecycle_events_canonical_payload(
    NEW.event_kind,
    NEW.event_at,
    NEW.schema_version,
    NEW.pilot_slot_id,
    NEW.from_status,
    NEW.to_status,
    NEW.classification_hint,
    NEW.company_id,
    NEW.firm_id,
    NEW.actor_kind,
    NEW.actor_user_id,
    NEW.actor_via,
    NEW.assertions_covered,
    NEW.evidence_refs,
    NEW.reason_code,
    NEW.reason_text,
    NEW.payload
  );

  NEW.row_hash := 'sha256:' || encode(
    digest(convert_to(coalesce(NEW.prev_hash, '') || v_canonical, 'UTF8'), 'sha256'::text),
    'hex'
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_before_insert IS
  'Hash-chain enforcement with advisory-lock serialization. Uses chain_seq (bigint sequence) as the canonical order key — event_at is display-only. Research: /home/user/workspace/research/mem2_hash_chain_ordering.md Q1+Q2.';

-- Trigger itself is unchanged (still BEFORE INSERT FOR EACH ROW), but
-- re-drop / re-create to be idempotent.
DROP TRIGGER IF EXISTS pilot_lifecycle_events_before_insert_trg
  ON public.pilot_lifecycle_events;

CREATE TRIGGER pilot_lifecycle_events_before_insert_trg
  BEFORE INSERT ON public.pilot_lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pilot_lifecycle_events_before_insert();

-- ---------------------------------------------------------------------------
-- Step 6: Replace the verify_chain RPC to walk ORDER BY chain_seq ASC.
-- Same shape as Block 2, but uses chain_seq for both order and internal
-- record-linking. Signature unchanged so callers do not need updates.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_verify_chain(
  p_company_id uuid DEFAULT NULL,
  p_firm_id uuid DEFAULT NULL
) RETURNS TABLE (
  first_broken_event_id uuid,
  first_broken_event_at timestamptz,
  expected_prev_hash text,
  actual_prev_hash text,
  expected_row_hash text,
  actual_row_hash text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_row record;
  v_expected_prev text := NULL;
  v_recomputed_hash text;
  v_canonical text;
BEGIN
  IF (p_company_id IS NULL AND p_firm_id IS NULL) OR
     (p_company_id IS NOT NULL AND p_firm_id IS NOT NULL) THEN
    RAISE EXCEPTION 'pilot_lifecycle_events_verify_chain: pass exactly one of p_company_id or p_firm_id';
  END IF;

  FOR v_row IN
    SELECT * FROM public.pilot_lifecycle_events
    WHERE (p_company_id IS NOT NULL AND company_id = p_company_id)
       OR (p_firm_id IS NOT NULL AND firm_id = p_firm_id)
    ORDER BY chain_seq ASC
  LOOP
    v_canonical := public.pilot_lifecycle_events_canonical_payload(
      v_row.event_kind, v_row.event_at, v_row.schema_version,
      v_row.pilot_slot_id, v_row.from_status, v_row.to_status,
      v_row.classification_hint, v_row.company_id, v_row.firm_id,
      v_row.actor_kind, v_row.actor_user_id, v_row.actor_via,
      v_row.assertions_covered, v_row.evidence_refs,
      v_row.reason_code, v_row.reason_text, v_row.payload
    );

    v_recomputed_hash := 'sha256:' || encode(
      digest(convert_to(coalesce(v_row.prev_hash, '') || v_canonical, 'UTF8'), 'sha256'::text),
      'hex'
    );

    -- Check prev_hash linkage
    IF v_row.prev_hash IS DISTINCT FROM v_expected_prev THEN
      first_broken_event_id := v_row.id;
      first_broken_event_at := v_row.event_at;
      expected_prev_hash := v_expected_prev;
      actual_prev_hash := v_row.prev_hash;
      expected_row_hash := v_recomputed_hash;
      actual_row_hash := v_row.row_hash;
      RETURN NEXT;
      RETURN;
    END IF;

    -- Check row_hash integrity
    IF v_row.row_hash IS DISTINCT FROM v_recomputed_hash THEN
      first_broken_event_id := v_row.id;
      first_broken_event_at := v_row.event_at;
      expected_prev_hash := v_expected_prev;
      actual_prev_hash := v_row.prev_hash;
      expected_row_hash := v_recomputed_hash;
      actual_row_hash := v_row.row_hash;
      RETURN NEXT;
      RETURN;
    END IF;

    v_expected_prev := v_row.row_hash;
  END LOOP;

  -- Chain intact — return zero rows.
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_verify_chain IS
  'Walks the hash chain for one partition (company_id XOR firm_id) in chain_seq ASC order and returns the first broken link, or zero rows if the chain is intact. Order agrees with the BEFORE INSERT trigger by construction (both use chain_seq).';

-- ---------------------------------------------------------------------------
-- Step 7: Reinstall the reject-UPDATE trigger.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS pilot_lifecycle_events_reject_update_trg
  ON public.pilot_lifecycle_events;

CREATE TRIGGER pilot_lifecycle_events_reject_update_trg
  BEFORE UPDATE ON public.pilot_lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pilot_lifecycle_events_reject_mutations();

-- ---------------------------------------------------------------------------
-- Step 8: Revoke EXECUTE on internal helpers (audit hygiene).
-- verify_chain stays callable by service_role and authenticated for the
-- Timeline UI drawer (Block 5) and the Block 9 cron; canonical_payload
-- stays PUBLIC because it is deterministic and side-effect-free.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.pilot_lifecycle_events_before_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pilot_lifecycle_events_reject_mutations() FROM PUBLIC;
-- <<< end 20260804220220_pilot_lifecycle_events_chain_seq_hardening.sql

-- >>> begin 20260804234230_lifecycle_issues.sql
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
-- <<< end 20260804234230_lifecycle_issues.sql

-- >>> begin 20260805005320_pilot_lifecycle_anchors.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260805005320
-- NAME: pilot_lifecycle_anchors
-- DATABASE_MD5_UTF8: 74f838e87f887acae7cfee3bc65a00cc
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 5905
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

-- Phase MEM_LIFECYCLE Block 9 — RFC 3161 batch anchoring tables.

CREATE TABLE IF NOT EXISTS public.pilot_lifecycle_anchor_batches (
  id                     bigserial PRIMARY KEY,
  created_at             timestamptz NOT NULL DEFAULT now(),
  batch_start_chain_seq  bigint NOT NULL,
  batch_end_chain_seq    bigint NOT NULL,
  leaf_count             integer NOT NULL,
  merkle_root            bytea NOT NULL,
  hash_algorithm         text NOT NULL DEFAULT 'sha256',
  superseded_by_anchor_batch_id bigint
    REFERENCES public.pilot_lifecycle_anchor_batches(id),
  CHECK (batch_end_chain_seq >= batch_start_chain_seq),
  CHECK (leaf_count > 0),
  CHECK (octet_length(merkle_root) = 32),
  CHECK (hash_algorithm = 'sha256')
);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_batches_range_idx
  ON public.pilot_lifecycle_anchor_batches (batch_start_chain_seq, batch_end_chain_seq);
CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_batches_end_seq_idx
  ON public.pilot_lifecycle_anchor_batches (batch_end_chain_seq DESC);

CREATE TABLE IF NOT EXISTS public.pilot_lifecycle_anchor_leaves (
  batch_id         bigint NOT NULL REFERENCES public.pilot_lifecycle_anchor_batches(id) ON DELETE CASCADE,
  leaf_index       integer NOT NULL,
  chain_seq        bigint NOT NULL,
  event_id         uuid NOT NULL,
  row_hash_bytes   bytea NOT NULL,
  PRIMARY KEY (batch_id, leaf_index),
  CHECK (leaf_index >= 0),
  CHECK (octet_length(row_hash_bytes) = 32)
);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_leaves_chain_seq_idx
  ON public.pilot_lifecycle_anchor_leaves (chain_seq);
CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_leaves_event_id_idx
  ON public.pilot_lifecycle_anchor_leaves (event_id);

CREATE TABLE IF NOT EXISTS public.pilot_lifecycle_anchor_tsr (
  id             bigserial PRIMARY KEY,
  batch_id       bigint NOT NULL REFERENCES public.pilot_lifecycle_anchor_batches(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  tsa_name       text NOT NULL,
  tsa_url        text NOT NULL,
  tsr_der        bytea NOT NULL,
  gen_time       timestamptz NOT NULL,
  serial_number  numeric NOT NULL,
  nonce          bytea,
  tsa_cert_chain bytea,
  UNIQUE (batch_id, tsa_name),
  CHECK (tsa_name IN ('digicert', 'sectigo', 'identrust'))
);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_tsr_gen_time_idx
  ON public.pilot_lifecycle_anchor_tsr (gen_time DESC);

ALTER TABLE public.pilot_lifecycle_anchor_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_lifecycle_anchor_leaves  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_lifecycle_anchor_tsr     ENABLE ROW LEVEL SECURITY;

CREATE POLICY pl_anchor_batches_read ON public.pilot_lifecycle_anchor_batches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY pl_anchor_leaves_read ON public.pilot_lifecycle_anchor_leaves
  FOR SELECT TO authenticated USING (true);
CREATE POLICY pl_anchor_tsr_read ON public.pilot_lifecycle_anchor_tsr
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_partition_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_partition_chk
  CHECK (
    company_id IS NOT NULL
    OR firm_id IS NOT NULL
    OR issue_kind IN ('marketing.seo.drift', 'pilot.lifecycle.chain.anchor')
  );

ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_issue_kind_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_issue_kind_chk
  CHECK (issue_kind IN (
    'pilot.lifecycle.drift.detected',
    'pilot.lifecycle.transition.rejected',
    'pilot.lifecycle.chain.integrity.broken',
    'pilot.lifecycle.monitor.error',
    'pilot.lifecycle.chain.anchor',
    'marketing.seo.drift'
  ));

CREATE OR REPLACE FUNCTION public.sp_write_anchor_batch(
  p_batch_start_chain_seq bigint,
  p_batch_end_chain_seq   bigint,
  p_leaf_count            integer,
  p_merkle_root           text,
  p_leaves                jsonb,
  p_tsrs                  jsonb
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_batch_id bigint;
  v_leaf     jsonb;
  v_tsr      jsonb;
  v_root     bytea;
BEGIN
  v_root := decode(replace(p_merkle_root, E'\\x', ''), 'hex');

  INSERT INTO public.pilot_lifecycle_anchor_batches(
    batch_start_chain_seq, batch_end_chain_seq, leaf_count, merkle_root
  ) VALUES (
    p_batch_start_chain_seq, p_batch_end_chain_seq, p_leaf_count, v_root
  )
  RETURNING id INTO v_batch_id;

  FOR v_leaf IN SELECT * FROM jsonb_array_elements(p_leaves) LOOP
    INSERT INTO public.pilot_lifecycle_anchor_leaves(
      batch_id, leaf_index, chain_seq, event_id, row_hash_bytes
    ) VALUES (
      v_batch_id,
      (v_leaf->>'leaf_index')::integer,
      (v_leaf->>'chain_seq')::bigint,
      (v_leaf->>'event_id')::uuid,
      decode(replace(v_leaf->>'row_hash_bytes', E'\\x', ''), 'hex')
    );
  END LOOP;

  FOR v_tsr IN SELECT * FROM jsonb_array_elements(p_tsrs) LOOP
    INSERT INTO public.pilot_lifecycle_anchor_tsr(
      batch_id, tsa_name, tsa_url, tsr_der, gen_time,
      serial_number, nonce, tsa_cert_chain
    ) VALUES (
      v_batch_id,
      v_tsr->>'tsa_name',
      v_tsr->>'tsa_url',
      decode(replace(v_tsr->>'tsr_der', E'\\x', ''), 'hex'),
      (v_tsr->>'gen_time')::timestamptz,
      (v_tsr->>'serial_number')::numeric,
      CASE WHEN v_tsr->>'nonce' IS NULL THEN NULL
           ELSE decode(replace(v_tsr->>'nonce', E'\\x', ''), 'hex') END,
      CASE WHEN v_tsr->>'tsa_cert_chain' IS NULL THEN NULL
           ELSE decode(replace(v_tsr->>'tsa_cert_chain', E'\\x', ''), 'hex') END
    );
  END LOOP;

  RETURN v_batch_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) TO service_role;
-- <<< end 20260805005320_pilot_lifecycle_anchors.sql

-- >>> begin 20260805054000_schema_drift_issue_policies.sql
-- MAJOR #2 — Schema drift issue read policy for org-wide (null-tenant) rows.
-- The existing lifecycle_issues_partition_read policy scopes reads to
-- company_users / firm_memberships. Schema-drift issues are org-wide with
-- both company_id AND firm_id NULL — so they'd be invisible to every
-- authenticated user without this override.
--
-- Super-admin bypass mirrors lib/super-admin.js:isAllowedSuperAdminEmail and
-- lib/super-admin-security.js role check: JWT app_metadata.role or
-- user_metadata.role must equal 'super_admin'. Email allowlist is enforced
-- separately at the app layer; this policy only requires the role claim
-- because Supabase RLS cannot cheaply consult a table of allowlisted emails.

CREATE POLICY lifecycle_issues_org_wide_super_admin_read
  ON public.lifecycle_issues
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NULL
    AND firm_id IS NULL
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    )
  );

-- Service role bypasses RLS entirely (existing Supabase behavior) so the
-- cron detector inserts freely. No INSERT/UPDATE/DELETE policies are added
-- for authenticated role — schema-drift issue resolution is a super-admin
-- action that will go through a dedicated server route in a follow-up phase.

COMMENT ON POLICY lifecycle_issues_org_wide_super_admin_read
  ON public.lifecycle_issues IS
  'MAJOR #2: super-admin can read org-wide drift issues where both tenant FKs are null. Complements lifecycle_issues_partition_read.';

-- Service-role-only helper for the static repo scanner. PostgREST cannot query
-- information_schema.* directly (Invalid schema), so the scanner calls this RPC.
CREATE OR REPLACE FUNCTION public.sp_list_public_columns()
RETURNS TABLE(table_name text, column_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.table_name::text, c.column_name::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
  ORDER BY 1, 2;
$$;

REVOKE ALL ON FUNCTION public.sp_list_public_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_list_public_columns() TO service_role;

COMMENT ON FUNCTION public.sp_list_public_columns() IS
  'MAJOR #2: service_role-only listing of public.* columns for schema drift repo scanner.';
-- <<< end 20260805054000_schema_drift_issue_policies.sql

-- >>> begin 20260805210000_schema_drift_scanner_issue_kinds.sql
-- MAJOR #2.1 — Register scanner-limitation issue kinds.
--
-- The AST-based scanner in lib/schema-drift/repo-scanner.ts emits these kinds
-- to lifecycle_issues when it can't classify a query with full confidence:
--
--   * schema_drift_scanner_unable_to_classify
--       Dynamic table binding (variable resolved to non-string-literal)
--       or cross-function passthrough (table name is a function parameter
--       with no call-site narrowing). NOT a runtime error — just a signal
--       that this query can't be statically verified against the live schema.
--
--   * schema_drift_scanner_ambiguous_column
--       Table binding is a union of literals (e.g. ternary of two string
--       literals) and the referenced column exists on some but not all of
--       the possible tables. Runtime path may or may not hit the drifted branch.
--
-- issue_kind is a free-text column on lifecycle_issues today (verified via
-- information_schema.columns: data_type='text', is_nullable='NO'), so no DDL
-- is strictly required. This migration exists to (a) leave a searchable audit
-- trail of when the new kinds were introduced and (b) create a lookup table
-- future assertion-coverage rollups can join against.

CREATE TABLE IF NOT EXISTS public.lifecycle_issue_kinds_registry (
  issue_kind text PRIMARY KEY,
  category text NOT NULL,
  description text NOT NULL,
  introduced_at timestamptz NOT NULL DEFAULT now(),
  introduced_by_migration text NOT NULL
);

COMMENT ON TABLE public.lifecycle_issue_kinds_registry IS
  'MAJOR #2.1: canonical registry of lifecycle_issues.issue_kind values. Not a FK constraint — audit surface only.';

INSERT INTO public.lifecycle_issue_kinds_registry (issue_kind, category, description, introduced_by_migration)
VALUES
  ('schema_drift',
   'schema_drift',
   'Runtime postgres error matched a schema-drift signature (column_missing, relation_missing, function_missing, type_mismatch, search_path_missing).',
   '20260805054000_schema_drift_issue_policies'),
  ('schema_drift_detector_degraded',
   'schema_drift',
   'The schema-drift detector cron could not fetch postgres logs (missing management API token or transient failure). Self-degradation signal.',
   '20260805054000_schema_drift_issue_policies'),
  ('schema_drift_scanner_unable_to_classify',
   'schema_drift',
   'Static repo scanner encountered a query whose table binding is a dynamic value (variable, function parameter). No column check performed. Runtime code may still be correct.',
   '20260805210000_schema_drift_scanner_issue_kinds'),
  ('schema_drift_scanner_ambiguous_column',
   'schema_drift',
   'Static repo scanner encountered a query whose table binding is a union of literals (e.g. ternary of string literals). Column exists on some but not all possible tables. Runtime branch coverage undetermined.',
   '20260805210000_schema_drift_scanner_issue_kinds'),
  ('schema_drift_accepted_baseline',
   'schema_drift',
   'Pre-existing schema drift accepted in .schema-drift-baseline.json with a debt ticket. Each entry must be resolved and removed from the baseline; scanner records these on every run for audit trail.',
   '20260805210000_schema_drift_scanner_issue_kinds')
ON CONFLICT (issue_kind) DO NOTHING;

-- Read policy so super-admin can see the registry (RLS enabled to match
-- lifecycle_issues pattern; service role bypasses regardless).
ALTER TABLE public.lifecycle_issue_kinds_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lifecycle_issue_kinds_registry_read
  ON public.lifecycle_issue_kinds_registry;

CREATE POLICY lifecycle_issue_kinds_registry_read
  ON public.lifecycle_issue_kinds_registry
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );
-- <<< end 20260805210000_schema_drift_scanner_issue_kinds.sql

-- >>> begin 20260805211000_sp_list_public_columns_jsonb.sql
-- MAJOR #2.1 follow-up — sp_list_public_columns returns jsonb (single row).
--
-- The original MAJOR #2 function returned SETOF (table_name, column_name).
-- PostgREST applies its max-rows limit (default 1000) to set-returning RPCs,
-- so the scanner silently truncated the live column universe (~3000+ public
-- columns) and false-positived every table alphabetically past the cutoff
-- (e.g. close_packets only appeared as id + close_period_id).
--
-- Returning a single jsonb array escapes the row-limit trap: one response
-- row carries the full listing.

DROP FUNCTION IF EXISTS public.sp_list_public_columns();

CREATE FUNCTION public.sp_list_public_columns()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'table_name', c.table_name,
        'column_name', c.column_name
      )
      ORDER BY c.table_name, c.column_name
    ),
    '[]'::jsonb
  )
  FROM information_schema.columns c
  WHERE c.table_schema = 'public';
$$;

REVOKE ALL ON FUNCTION public.sp_list_public_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_list_public_columns() TO service_role;

COMMENT ON FUNCTION public.sp_list_public_columns() IS
  'MAJOR #2.1: service_role-only listing of public.* columns as a single jsonb array (avoids PostgREST max-rows truncation of set-returning RPCs).';
-- <<< end 20260805211000_sp_list_public_columns_jsonb.sql

-- >>> begin 20260806031500_major_2_2_lifecycle_issues_drift_kinds.sql
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

-- [ESC] stripped source txn marker: BEGIN;


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

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260806031500_major_2_2_lifecycle_issues_drift_kinds.sql

-- >>> begin 20260806032000_lifecycle_issues_schema_drift_checks.sql
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
-- <<< end 20260806032000_lifecycle_issues_schema_drift_checks.sql

-- >>> begin 20260806040000_major_2_3_block_a_assertion_linkage.sql
-- MAJOR #2.3 Block A — Server-side assertion-impact linkage for schema drift rows.
--
-- Backfills extra.assertion_impact on all existing schema_drift* rows in
-- lifecycle_issues, and installs a BEFORE INSERT trigger so all future drift
-- rows (from any writer — scanner script, detector cron, canary, ad-hoc SQL)
-- are automatically tagged with the assertion impact set they degrade.
--
-- Server-side mirror of lib/schema-drift/assertion-linkage.ts.
-- TypeScript file remains the source of truth for the detector route; this
-- function exists so scanner rows and any raw-SQL writers get identical treatment.
--
-- Design: extra.assertion_impact is JSONB (array of assertion_id text).
-- Idempotent by default — backfill skips rows where the field already exists.
-- Pass p_force_recompute=TRUE to overwrite existing values (used when
-- TABLE_ASSERTION_MAP is refined in a follow-up patch).

-- [ESC] stripped source txn marker: BEGIN;


-- 1. Server-side mirror of resolveAssertionImpact.
--    Must be updated in lockstep with lib/schema-drift/assertion-linkage.ts.
CREATE OR REPLACE FUNCTION public.resolve_assertion_impact_by_table(p_table text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  all_assertions CONSTANT text[] := ARRAY[
    'accuracy',
    'classification',
    'completeness',
    'cutoff',
    'existence_occurrence',
    'presentation_disclosure',
    'rights_obligations',
    'valuation_allocation'
  ];
BEGIN
  -- Unknown table → all 8 assertions (fallback per intentional coarse-linkage design)
  IF p_table IS NULL OR length(trim(p_table)) = 0 THEN
    RETURN all_assertions;
  END IF;

  -- Journal/GL tables drive accuracy, existence, cutoff, classification
  IF p_table IN ('qbo_journal_entries', 'qbo_transactions') THEN
    RETURN ARRAY['accuracy', 'existence_occurrence', 'cutoff', 'classification'];
  END IF;

  IF p_table = 'qbo_general_ledger' THEN
    RETURN ARRAY['accuracy', 'existence_occurrence', 'cutoff', 'classification', 'completeness'];
  END IF;

  -- Balance-sheet reconciliation tables drive completeness, valuation, existence
  IF p_table = 'bs_recon_summary' THEN
    RETURN ARRAY['completeness', 'valuation_allocation', 'existence_occurrence'];
  END IF;

  IF p_table = 'balance_sheet_periods' THEN
    RETURN ARRAY['completeness', 'valuation_allocation'];
  END IF;

  -- AP/AR + vendor/customer tables drive rights_obligations + valuation
  IF p_table IN ('qbo_bills', 'qbo_invoices') THEN
    RETURN ARRAY['existence_occurrence', 'rights_obligations', 'valuation_allocation', 'cutoff'];
  END IF;

  IF p_table IN ('qbo_vendors', 'qbo_customers') THEN
    RETURN ARRAY['rights_obligations', 'existence_occurrence'];
  END IF;

  -- Close-period tables drive presentation + cutoff
  IF p_table = 'close_periods' THEN
    RETURN ARRAY['cutoff', 'presentation_disclosure'];
  END IF;

  IF p_table = 'close_packets' THEN
    RETURN ARRAY['presentation_disclosure', 'completeness'];
  END IF;

  -- Assertion coverage tables — drift here degrades ALL assertions (self-referential)
  IF p_table IN ('assertions_catalog', 'assertion_relevance_matrix', 'rule_assertion_coverage') THEN
    RETURN all_assertions;
  END IF;

  -- Users/auth/RLS drift is org-wide → all assertions
  IF p_table IN ('users', 'company_users', 'firm_memberships') THEN
    RETURN all_assertions;
  END IF;

  -- Lifecycle issues drift is self-referential → all assertions
  IF p_table = 'lifecycle_issues' THEN
    RETURN all_assertions;
  END IF;

  -- Fallback for any unmapped table
  RETURN all_assertions;
END;
$$;

COMMENT ON FUNCTION public.resolve_assertion_impact_by_table(text) IS
  'MAJOR #2.3 — server-side mirror of lib/schema-drift/assertion-linkage.ts. Returns the ISA 315 assertion IDs whose evidence flow depends on the given table. Fallback to all 8 assertions for unknown/null tables.';

-- 2. Idempotent backfill function. Callable manually to refill after
--    TABLE_ASSERTION_MAP is refined.
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
    -- Overwrite mode — recompute for every schema_drift* row
    UPDATE public.lifecycle_issues li
    SET extra = coalesce(li.extra, '{}'::jsonb)
      || jsonb_build_object(
        'assertion_impact',
        to_jsonb(public.resolve_assertion_impact_by_table(li.tags->>'table'))
      )
    WHERE li.issue_kind LIKE 'schema_drift%';
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    v_skipped := 0;
  ELSE
    -- Idempotent mode — only fill rows missing the field
    UPDATE public.lifecycle_issues li
    SET extra = coalesce(li.extra, '{}'::jsonb)
      || jsonb_build_object(
        'assertion_impact',
        to_jsonb(public.resolve_assertion_impact_by_table(li.tags->>'table'))
      )
    WHERE li.issue_kind LIKE 'schema_drift%'
      AND (li.extra IS NULL OR li.extra->'assertion_impact' IS NULL);
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    SELECT COUNT(*) INTO v_skipped
    FROM public.lifecycle_issues li
    WHERE li.issue_kind LIKE 'schema_drift%'
      AND li.extra IS NOT NULL
      AND li.extra->'assertion_impact' IS NOT NULL;
  END IF;

  RETURN QUERY SELECT v_updated, v_skipped;
END;
$$;

COMMENT ON FUNCTION public.backfill_schema_drift_assertion_impact(boolean) IS
  'MAJOR #2.3 Block A — backfill extra.assertion_impact for all schema_drift* rows. Idempotent by default; pass p_force_recompute=TRUE to overwrite existing values after TABLE_ASSERTION_MAP is refined.';

REVOKE ALL ON FUNCTION public.backfill_schema_drift_assertion_impact(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_schema_drift_assertion_impact(boolean) TO service_role;

-- 3. BEFORE INSERT trigger — auto-populate extra.assertion_impact for all
--    schema_drift* rows going forward.
CREATE OR REPLACE FUNCTION public.trg_lifecycle_issues_assertion_impact()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only act on schema_drift* rows
  IF NEW.issue_kind NOT LIKE 'schema_drift%' THEN
    RETURN NEW;
  END IF;

  -- Only fill if caller didn't already set it
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

COMMENT ON FUNCTION public.trg_lifecycle_issues_assertion_impact() IS
  'MAJOR #2.3 Block A — trigger function. Auto-fills extra.assertion_impact on INSERT for schema_drift* rows if caller did not set it.';

DROP TRIGGER IF EXISTS lifecycle_issues_assertion_impact_trg ON public.lifecycle_issues;

CREATE TRIGGER lifecycle_issues_assertion_impact_trg
  BEFORE INSERT ON public.lifecycle_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_lifecycle_issues_assertion_impact();

-- 4. Run the backfill in idempotent mode as part of this migration
--    (records the outcome via RAISE NOTICE for review in migration logs).
DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result FROM public.backfill_schema_drift_assertion_impact(false);
  RAISE NOTICE 'MAJOR #2.3 Block A backfill complete: % rows_updated, % rows_skipped',
    v_result.rows_updated, v_result.rows_skipped;
END;
$$;

-- 5. Self-verify: every schema_drift* row now has a non-empty assertion_impact array.
DO $$
DECLARE
  v_missing integer;
BEGIN
  SELECT COUNT(*) INTO v_missing
  FROM public.lifecycle_issues
  WHERE issue_kind LIKE 'schema_drift%'
    AND (
      extra IS NULL
      OR extra->'assertion_impact' IS NULL
      OR jsonb_typeof(extra->'assertion_impact') <> 'array'
      OR jsonb_array_length(extra->'assertion_impact') = 0
    );

  IF v_missing > 0 THEN
    RAISE EXCEPTION 'MAJOR #2.3 Block A self-verify failed: % schema_drift* rows still missing assertion_impact', v_missing;
  END IF;
END;
$$;

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260806040000_major_2_3_block_a_assertion_linkage.sql

-- >>> begin 20260806042000_major_2_3_block_a_1_research_revision.sql
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

-- [ESC] stripped source txn marker: BEGIN;


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

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260806042000_major_2_3_block_a_1_research_revision.sql

-- >>> begin 20260809083000_companies_tenant_identity_columns.sql
-- Provider-aware tenant identity on companies (git parity with prod).
-- Prod already applied equivalent DDL (schema_migrations: companies_tenant_identity_columns).
-- Idempotent: safe to re-run; backfills no-op when tenant columns already set.
-- Enables resolveOrCreateCompanyForProvider to route accounting_syncs writes
-- to the correct companies row by external tenant identifier.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS xero_tenant_id text,
  ADD COLUMN IF NOT EXISTS qbo_realm_id text;

CREATE UNIQUE INDEX IF NOT EXISTS companies_xero_tenant_id_key
  ON companies (xero_tenant_id) WHERE xero_tenant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS companies_qbo_realm_id_key
  ON companies (qbo_realm_id) WHERE qbo_realm_id IS NOT NULL;

COMMENT ON COLUMN companies.xero_tenant_id IS
  'Xero organization tenant UUID (from OAuth /connections). Unique when set. Populated by resolveOrCreateCompanyForProvider.';
COMMENT ON COLUMN companies.qbo_realm_id IS
  'QuickBooks Online realmId. Unique when set. Populated by resolveOrCreateCompanyForProvider.';

-- Backfill known Xero tenant → companies mapping (no-op when already set).
UPDATE companies
   SET xero_tenant_id = 'ceaea696-081f-491e-9daa-a9263a023ca9',
       accounting_system = COALESCE(accounting_system, 'xero'),
       updated_at = now()
 WHERE id = '02edb6c6-a4f1-4bae-825d-2680136dad24'
   AND xero_tenant_id IS NULL;

-- Backfill known QBO realm → seed companies row (no-op when already set).
UPDATE companies
   SET qbo_realm_id = '9341457151063823',
       accounting_system = COALESCE(accounting_system, 'quickbooks'),
       updated_at = now()
 WHERE id = 'aaaaaaaa-2222-4222-8222-222222222222'
   AND qbo_realm_id IS NULL;
-- <<< end 20260809083000_companies_tenant_identity_columns.sql

-- >>> begin 20260810070000_dash_1c_a_accuracy_contract_cache.sql
-- Phase DASH_1C Block A — Accuracy Contract cache.
-- Keyed on (company_id, kpi_code, period, accounting_syncs_id) so a new sync
-- naturally invalidates by creating a row with a new sync id. TTL = new sync.
-- RLS: same access model as accounting_syncs (company_users membership).

CREATE TABLE IF NOT EXISTS public.accuracy_contract_cache (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kpi_code             text NOT NULL,
  period               text NOT NULL,
  accounting_syncs_id  uuid NOT NULL REFERENCES public.accounting_syncs(id) ON DELETE CASCADE,
  kpi_value_numeric    numeric,
  kpi_value_display    text NOT NULL,
  unit                 text NOT NULL,
  computation_status   text NOT NULL,
  formula_json         jsonb NOT NULL,
  composition_json     jsonb NOT NULL,
  provenance_json      jsonb NOT NULL,
  chain_receipt_json   jsonb NOT NULL,
  computed_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accuracy_contract_cache_unique
    UNIQUE (company_id, kpi_code, period, accounting_syncs_id),
  CONSTRAINT accuracy_contract_cache_status_check
    CHECK (computation_status IN ('computed','pending_subledger')),
  CONSTRAINT accuracy_contract_cache_unit_check
    CHECK (unit IN ('currency','percent','ratio','days','count'))
);

CREATE INDEX IF NOT EXISTS idx_accuracy_contract_cache_lookup
  ON public.accuracy_contract_cache (company_id, kpi_code, period, computed_at DESC);

ALTER TABLE public.accuracy_contract_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accuracy_contract_cache_select ON public.accuracy_contract_cache;
CREATE POLICY accuracy_contract_cache_select
  ON public.accuracy_contract_cache
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = accuracy_contract_cache.company_id
        AND cu.user_id = (SELECT auth.uid())
        AND cu.status = 'active'
    )
  );
-- <<< end 20260810070000_dash_1c_a_accuracy_contract_cache.sql

-- >>> begin 20260810070050_dash_1c_a_widen_provenance.sql
-- Phase DASH_1C Block A — Widen lifecycle event_kind + actor_via for
-- provenance-drawer-opened emits. Additive only; preserves W1c.4a vocabulary.

alter table public.pilot_lifecycle_events
  drop constraint if exists pilot_lifecycle_events_event_kind_chk;

alter table public.pilot_lifecycle_events
  add constraint pilot_lifecycle_events_event_kind_chk
  check (event_kind = any (array[
    'pilot.lifecycle.transition'::text,
    'pilot.lifecycle.drift-detected'::text,
    'pilot.lifecycle.auto-reconciled'::text,
    'pilot.lifecycle.escalated'::text,
    'pilot.lifecycle.recurred'::text,
    'pilot.lifecycle.created'::text,
    'pilot.lifecycle.assertion.evidence-attached'::text,
    'pilot.lifecycle.transition.rejected'::text,
    'pilot.lifecycle.accounting-sync-completed'::text,
    'pilot.lifecycle.accounting-sync-failed'::text,
    'pilot.lifecycle.accounting-connection-connected'::text,
    'pilot.lifecycle.accounting-connection-disconnected'::text,
    'pilot.lifecycle.wbp-probe-result'::text,
    'pilot.lifecycle.write-validated'::text,
    'pilot.lifecycle.write-rejected'::text,
    'pilot.lifecycle.write-posted'::text,
    'pilot.lifecycle.write-drifted'::text,
    'pilot.lifecycle.write-void-succeeded'::text,
    'pilot.lifecycle.write-failed'::text,
    'pilot.lifecycle.cache-refreshed'::text,
    'pilot.lifecycle.provenance-drawer-opened'::text
  ]));

comment on constraint pilot_lifecycle_events_event_kind_chk
  on public.pilot_lifecycle_events is
  'DASH_1C Block A: provenance-drawer-opened added for Accuracy Contract receipt emits.';

alter table public.pilot_lifecycle_events
  drop constraint if exists pilot_lifecycle_events_actor_via_chk;

alter table public.pilot_lifecycle_events
  add constraint pilot_lifecycle_events_actor_via_chk
  check (actor_via = any (array[
    'panel-consumer'::text,
    'role-adapter'::text,
    'org-edge'::text,
    'direct-api'::text,
    'admin-script'::text,
    'stripe-webhook'::text,
    'cdc-auditor'::text,
    'accounting-sync'::text,
    'user-initiated'::text,
    'dashboard-provenance-drawer'::text
  ]));

comment on constraint pilot_lifecycle_events_actor_via_chk
  on public.pilot_lifecycle_events is
  'DASH_1C Block A: dashboard-provenance-drawer added for Accuracy Contract drawer opens.';
-- <<< end 20260810070050_dash_1c_a_widen_provenance.sql

-- >>> begin 20260810070100_dash_1c_a_lifecycle_scan_indexes.sql
-- Phase DASH_1C Block A — freshness + minting-event lookup indexes.
CREATE INDEX IF NOT EXISTS idx_pilot_lifecycle_company_chain_seq_desc
  ON public.pilot_lifecycle_events (company_id, chain_seq DESC);

CREATE INDEX IF NOT EXISTS idx_pilot_lifecycle_company_kind_syncid
  ON public.pilot_lifecycle_events
  (company_id, event_kind, ((payload->>'accounting_syncs_id')::text))
  WHERE payload ? 'accounting_syncs_id';
-- <<< end 20260810070100_dash_1c_a_lifecycle_scan_indexes.sql

-- >>> begin 20260813220000_accounting_connection_supersession.sql
-- Additive connection supersession lifecycle (PR B).
-- EXPAND ONLY: no status backfill, no unique connected index, no data updates.
--
-- Semantics:
--   connected   = eligible authoritative OAuth grant
--   superseded  = historical connection retained for attribution; never eligible
--                 for new accounting reads/writes
--   expired     = token/grant needs reconnect
--   disconnected= intentionally disconnected
--   failed      = unusable connection state
--
-- Do NOT add a restrictive status CHECK here: live DB has free-form text status
-- and historical values must remain compatible.

ALTER TABLE public.accounting_connections
  ADD COLUMN IF NOT EXISTS superseded_by_connection_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'accounting_connections_superseded_by_fkey'
      AND conrelid = 'public.accounting_connections'::regclass
  ) THEN
    ALTER TABLE public.accounting_connections
      ADD CONSTRAINT accounting_connections_superseded_by_fkey
      FOREIGN KEY (superseded_by_connection_id)
      REFERENCES public.accounting_connections(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'accounting_connections_superseded_by_not_self'
      AND conrelid = 'public.accounting_connections'::regclass
  ) THEN
    ALTER TABLE public.accounting_connections
      ADD CONSTRAINT accounting_connections_superseded_by_not_self
      CHECK (
        superseded_by_connection_id IS NULL
        OR superseded_by_connection_id <> id
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS accounting_connections_superseded_by_idx
  ON public.accounting_connections (superseded_by_connection_id)
  WHERE superseded_by_connection_id IS NOT NULL;

COMMENT ON COLUMN public.accounting_connections.superseded_by_connection_id IS
  'When status=superseded, points at the canonical successor connection for the same user/provider/tenant grant. ON DELETE SET NULL preserves predecessor attribution.';
-- <<< end 20260813220000_accounting_connection_supersession.sql

-- >>> begin 20260814060000_accounting_superseded_credential_retirement.sql
-- PR F: retire live OAuth credentials on superseded accounting connections.
-- CODE HARDENING ships with this migration; do NOT apply to production until review.
--
-- Semantics:
--   superseded rows remain permanent historical identity + sync lineage evidence.
--   They must not retain reusable provider authorization secrets.
--   connected / disconnected rows are intentionally untouched here.
--
-- Does NOT call Xero/Intuit token revocation APIs — DB credential retirement only.

ALTER TABLE public.accounting_connections
  ADD COLUMN IF NOT EXISTS credentials_cleared_at timestamptz;

COMMENT ON COLUMN public.accounting_connections.credentials_cleared_at IS
  'Set when live OAuth secrets were intentionally cleared; accounting memory remains.';

-- Clear secrets on superseded only. Preserve id/status/superseded_by/sync lineage.
-- Do not bump updated_at (authority/recency signal stays undisturbed).
-- COALESCE preserves a prior credentials_cleared_at on idempotent re-runs.
UPDATE public.accounting_connections
SET
  access_token = NULL,
  refresh_token = NULL,
  token_expires_at = NULL,
  credentials_cleared_at = COALESCE(credentials_cleared_at, now())
WHERE status = 'superseded'
  AND (
    access_token IS NOT NULL
    OR refresh_token IS NOT NULL
    OR token_expires_at IS NOT NULL
    OR credentials_cleared_at IS NULL
  );
-- <<< end 20260814060000_accounting_superseded_credential_retirement.sql

-- >>> begin 20260815000000_urm2_reconciling_items_persistence.sql
-- URM-2: Persist universal reconciliation outcomes.
-- Additive only. Does not change resolver math or measurement variances.
--
-- Locks:
-- - Identified reconciling items are separate workpaper/remediation objects.
-- - Unidentified residual is derived (Gross − Σ Identified); never a row class.
-- - Variances remain the measurement layer.
-- - Evidence taxonomy expansion deferred to URM-3 (opaque evidence_ids only).

-- [ESC] stripped source txn marker: BEGIN;


-- ─────────────────────────────────────────────────────────────
-- 1) Run-level URM outcome columns (nullable until a bridge is persisted)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS identified_items_total_cents bigint NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS unidentified_residual_cents bigint NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS reconciling_item_count integer NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS unresolved_material_count integer NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS recon_outcome text NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  DROP CONSTRAINT IF EXISTS audit_ready_tie_out_runs_recon_outcome_check;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD CONSTRAINT audit_ready_tie_out_runs_recon_outcome_check
  CHECK (
    recon_outcome IS NULL
    OR recon_outcome IN (
      'reconciled_exact',
      'reconciled_with_timing',
      'reconciled_immaterial_residual',
      'open_review',
      'open_material',
      'provider_action_required',
      'failed'
    )
  );

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS allows_timing_reconciled boolean NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS baseline_sync_id uuid NULL
    REFERENCES public.accounting_syncs(id) ON DELETE SET NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS urm_bridge_persisted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_ar_tieout_runs_recon_outcome
  ON public.audit_ready_tie_out_runs(engagement_id, recon_outcome)
  WHERE recon_outcome IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ar_tieout_runs_baseline_sync
  ON public.audit_ready_tie_out_runs(baseline_sync_id)
  WHERE baseline_sync_id IS NOT NULL;

COMMENT ON COLUMN public.audit_ready_tie_out_runs.identified_items_total_cents IS
  'URM-2: Σ identified reconciling item amounts (cents) at bridge persist time.';
COMMENT ON COLUMN public.audit_ready_tie_out_runs.unidentified_residual_cents IS
  'URM-2: derived residual = totals_variance_cents − identified_items_total_cents.';
COMMENT ON COLUMN public.audit_ready_tie_out_runs.recon_outcome IS
  'URM-2: run-level reconOutcome from deriveReconBridge (not legacy totals_status).';
COMMENT ON COLUMN public.audit_ready_tie_out_runs.baseline_sync_id IS
  'URM-2 schema hook for Patent/Accuracy Contract sync pin. Column+FK only; URM-2 helpers MUST NOT populate it. Later custody PR sets from canonical financial context.';

-- ─────────────────────────────────────────────────────────────
-- 2) audit_ready_reconciling_items — identified workpaper items only
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_reconciling_items (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                          uuid NOT NULL
    REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  engagement_id                   uuid NOT NULL
    REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  pbc_request_id                  uuid NOT NULL
    REFERENCES public.audit_ready_pbc_requests(id) ON DELETE CASCADE,
  -- Identified classes only — unidentified residual is NEVER stored here.
  item_class                      text NOT NULL
    CHECK (item_class IN (
      'identified_timing',
      'identified_documented',
      'identified_reclass',
      'identified_error'
    )),
  amount_cents                    bigint NOT NULL,
  entity_kind                     text NULL,
  entity_display_name             text NULL,
  expected_clear_date             date NULL,
  clearance_policy                text NOT NULL
    CHECK (clearance_policy IN (
      'may_reconcile_with_timing',
      'requires_resolution',
      'immaterial_ok'
    )),
  status                          text NOT NULL
    CHECK (status IN ('tie', 'auto_cleared', 'review', 'kickout')),
  -- Optional link to measurement-layer variance (not the item identity).
  measurement_link_variance_id    uuid NULL
    REFERENCES public.audit_ready_tie_out_variances(id) ON DELETE SET NULL,
  -- Opaque evidence refs until URM-3 evidence spine. No FK / taxonomy expansion.
  evidence_ids                    uuid[] NOT NULL DEFAULT '{}',
  narrative                       text NULL,
  sort_order                      integer NOT NULL DEFAULT 0,
  created_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_reconciling_items_run
  ON public.audit_ready_reconciling_items(run_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_ar_reconciling_items_engagement
  ON public.audit_ready_reconciling_items(engagement_id, item_class);

CREATE INDEX IF NOT EXISTS idx_ar_reconciling_items_variance_link
  ON public.audit_ready_reconciling_items(measurement_link_variance_id)
  WHERE measurement_link_variance_id IS NOT NULL;

COMMENT ON TABLE public.audit_ready_reconciling_items IS
  'URM-2: identified reconciling items (workpaper/remediation). Unidentified residual is derived on the run, not stored as an item.';

-- ─────────────────────────────────────────────────────────────
-- 3) RLS — mirror variances: service_role write; engagement-scoped read
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_reconciling_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ar_reconciling_items_service_role_all
  ON public.audit_ready_reconciling_items;
CREATE POLICY ar_reconciling_items_service_role_all
  ON public.audit_ready_reconciling_items
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ar_reconciling_items_engagement_read
  ON public.audit_ready_reconciling_items;
CREATE POLICY ar_reconciling_items_engagement_read
  ON public.audit_ready_reconciling_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_reconciling_items.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 4) Run identity is authoritative — stamp engagement/pbc from run
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_ar_reconciling_items_stamp_run_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_engagement_id uuid;
  v_pbc_request_id uuid;
BEGIN
  SELECT r.engagement_id, r.pbc_request_id
    INTO v_engagement_id, v_pbc_request_id
  FROM public.audit_ready_tie_out_runs r
  WHERE r.id = NEW.run_id;

  IF v_engagement_id IS NULL THEN
    RAISE EXCEPTION 'run_not_found';
  END IF;

  -- Always overwrite caller-supplied engagement/pbc — run is sole authority.
  NEW.engagement_id := v_engagement_id;
  NEW.pbc_request_id := v_pbc_request_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ar_reconciling_items_stamp_run_identity
  ON public.audit_ready_reconciling_items;
CREATE TRIGGER trg_ar_reconciling_items_stamp_run_identity
  BEFORE INSERT OR UPDATE OF run_id, engagement_id, pbc_request_id
  ON public.audit_ready_reconciling_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_ar_reconciling_items_stamp_run_identity();

COMMENT ON FUNCTION public.trg_ar_reconciling_items_stamp_run_identity() IS
  'URM-2: forces engagement_id/pbc_request_id from audit_ready_tie_out_runs; callers cannot stamp cross-engagement identity.';

-- ─────────────────────────────────────────────────────────────
-- 5) Atomic persist / clear RPCs (single state transition)
-- TS owns deriveReconBridge math; this RPC only persists already-derived values.
-- Does NOT set baseline_sync_id (custody PR later).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.persist_audit_ready_recon_bridge(
  p_run_id uuid,
  p_items jsonb,
  p_identified_items_total_cents bigint,
  p_unidentified_residual_cents bigint,
  p_reconciling_item_count integer,
  p_unresolved_material_count integer,
  p_recon_outcome text,
  p_allows_timing_reconciled boolean,
  p_persisted_at timestamptz DEFAULT now()
)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_engagement_id uuid;
  v_pbc_request_id uuid;
  v_totals_variance_cents bigint;
  v_item jsonb;
  v_idx integer := 0;
  v_item_ids uuid[] := '{}';
  v_new_id uuid;
  v_class text;
  v_evidence uuid[];
  v_items_sum_cents bigint;
BEGIN
  SELECT r.engagement_id, r.pbc_request_id, r.totals_variance_cents
    INTO v_engagement_id, v_pbc_request_id, v_totals_variance_cents
  FROM public.audit_ready_tie_out_runs r
  WHERE r.id = p_run_id
  FOR UPDATE;

  IF v_engagement_id IS NULL THEN
    RAISE EXCEPTION 'run_not_found';
  END IF;

  IF v_totals_variance_cents IS NULL THEN
    RAISE EXCEPTION 'urm2_gross_variance_authority_missing';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'urm2_items_must_be_json_array';
  END IF;

  IF p_identified_items_total_cents IS NULL
     OR p_unidentified_residual_cents IS NULL
  THEN
    RAISE EXCEPTION 'urm2_bridge_totals_required';
  END IF;

  IF p_recon_outcome IS NULL OR p_recon_outcome NOT IN (
    'reconciled_exact',
    'reconciled_with_timing',
    'reconciled_immaterial_residual',
    'open_review',
    'open_material',
    'provider_action_required',
    'failed'
  ) THEN
    RAISE EXCEPTION 'urm2_invalid_recon_outcome';
  END IF;

  -- Reject residual-as-item before any mutation.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_class := v_item->>'item_class';
    IF v_class IS NULL
       OR v_class = 'unidentified_residual'
       OR v_class NOT IN (
         'identified_timing',
         'identified_documented',
         'identified_reclass',
         'identified_error'
       )
    THEN
      RAISE EXCEPTION 'urm2_unidentified_residual_not_persistable';
    END IF;
  END LOOP;

  -- Persistence integrity assertions (NOT a second formula engine).
  -- All checks run BEFORE DELETE/INSERT/UPDATE so failures leave prior state intact.
  SELECT COALESCE(SUM((e.value->>'amount_cents')::bigint), 0)
    INTO v_items_sum_cents
  FROM jsonb_array_elements(p_items) AS e(value);

  IF v_items_sum_cents <> p_identified_items_total_cents THEN
    RAISE EXCEPTION 'urm2_identified_total_mismatch';
  END IF;

  IF (p_identified_items_total_cents + p_unidentified_residual_cents)
       <> v_totals_variance_cents
  THEN
    RAISE EXCEPTION 'urm2_cent_exact_bridge_mismatch';
  END IF;

  DELETE FROM public.audit_ready_reconciling_items
  WHERE run_id = p_run_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_evidence := COALESCE(
      ARRAY(
        SELECT jsonb_array_elements_text(COALESCE(v_item->'evidence_ids', '[]'::jsonb))::uuid
      ),
      '{}'::uuid[]
    );

    INSERT INTO public.audit_ready_reconciling_items (
      run_id,
      engagement_id,
      pbc_request_id,
      item_class,
      amount_cents,
      entity_kind,
      entity_display_name,
      expected_clear_date,
      clearance_policy,
      status,
      measurement_link_variance_id,
      evidence_ids,
      narrative,
      sort_order
    ) VALUES (
      p_run_id,
      v_engagement_id,
      v_pbc_request_id,
      v_item->>'item_class',
      (v_item->>'amount_cents')::bigint,
      NULLIF(v_item->>'entity_kind', ''),
      NULLIF(v_item->>'entity_display_name', ''),
      NULLIF(v_item->>'expected_clear_date', '')::date,
      v_item->>'clearance_policy',
      v_item->>'status',
      NULLIF(v_item->>'measurement_link_variance_id', '')::uuid,
      v_evidence,
      NULLIF(v_item->>'narrative', ''),
      v_idx
    )
    RETURNING id INTO v_new_id;

    v_item_ids := array_append(v_item_ids, v_new_id);
    v_idx := v_idx + 1;
  END LOOP;

  UPDATE public.audit_ready_tie_out_runs
  SET
    identified_items_total_cents = p_identified_items_total_cents,
    unidentified_residual_cents = p_unidentified_residual_cents,
    reconciling_item_count = p_reconciling_item_count,
    unresolved_material_count = p_unresolved_material_count,
    recon_outcome = p_recon_outcome,
    allows_timing_reconciled = p_allows_timing_reconciled,
    urm_bridge_persisted_at = p_persisted_at
    -- baseline_sync_id intentionally NOT touched
  WHERE id = p_run_id;

  RETURN v_item_ids;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_audit_ready_recon_bridge(
  p_run_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.audit_ready_tie_out_runs WHERE id = p_run_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'run_not_found';
  END IF;

  DELETE FROM public.audit_ready_reconciling_items
  WHERE run_id = p_run_id;

  UPDATE public.audit_ready_tie_out_runs
  SET
    identified_items_total_cents = NULL,
    unidentified_residual_cents = NULL,
    reconciling_item_count = NULL,
    unresolved_material_count = NULL,
    recon_outcome = NULL,
    allows_timing_reconciled = NULL,
    urm_bridge_persisted_at = NULL
    -- baseline_sync_id intentionally retained
  WHERE id = p_run_id;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_audit_ready_recon_bridge(
  uuid, jsonb, bigint, bigint, integer, integer, text, boolean, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_audit_ready_recon_bridge(
  uuid, jsonb, bigint, bigint, integer, integer, text, boolean, timestamptz
) TO service_role;

REVOKE ALL ON FUNCTION public.clear_audit_ready_recon_bridge(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_audit_ready_recon_bridge(uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.trg_ar_reconciling_items_stamp_run_identity()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.persist_audit_ready_recon_bridge(
  uuid, jsonb, bigint, bigint, integer, integer, text, boolean, timestamptz
) IS
  'URM-2: atomic replace of identified reconciling items + run URM columns. Run identity authoritative. Asserts SUM(items)=identified_total and identified+residual=totals_variance_cents BEFORE mutation. Does not set baseline_sync_id. Does not compute residual/outcome math.';

COMMENT ON FUNCTION public.clear_audit_ready_recon_bridge(uuid) IS
  'URM-2: atomic clear of identified items + run URM columns; retains baseline_sync_id.';

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260815000000_urm2_reconciling_items_persistence.sql

-- >>> begin 20260815120000_urm3_universal_evidence_spine.sql
-- URM-3: Universal reconciliation evidence spine.
-- Additive only. Reuses audit_ready_tie_out_variance_evidence (no new evidence table).
--
-- Locks:
-- - Evidence attaches to Identified Reconciling Items (and optionally measurement variances).
-- - Evidence NEVER authors GL/subledger balances or changes unidentified residual math.
-- - GRNI continues to write variance-only evidence rows (variance_id set, reconciling_item_id null).
-- - URM-2 evidence_ids[] remains a denormalized cache; FK reconciling_item_id is source of truth.
-- - content_hash is SHA-256 hex (64 lowercase [a-f0-9]) when present; required for storage_path rows.
--
-- READY ONLY — do not apply to production until authorized live smoke.

-- [ESC] stripped source txn marker: BEGIN;


-- ─────────────────────────────────────────────────────────────
-- 1) Link evidence → reconciling items; relax variance-only requirement
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS reconciling_item_id uuid NULL
    REFERENCES public.audit_ready_reconciling_items(id) ON DELETE CASCADE;

-- Legacy GRNI/AR/AP evidence always had variance_id. Third-party item evidence may
-- attach to a reconciling item without a measurement variance row.
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ALTER COLUMN variance_id DROP NOT NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS arte_variance_or_item_required;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT arte_variance_or_item_required
  CHECK (variance_id IS NOT NULL OR reconciling_item_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_arte_reconciling_item_id
  ON public.audit_ready_tie_out_variance_evidence(reconciling_item_id)
  WHERE reconciling_item_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2) Expand source_kind + provider-neutral / third-party fields
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS audit_ready_tie_out_variance_evidence_source_kind_check;

-- Discover legacy check name if auto-generated differently
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.audit_ready_tie_out_variance_evidence'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%source_kind%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.audit_ready_tie_out_variance_evidence DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT audit_ready_tie_out_variance_evidence_source_kind_check
  CHECK (source_kind IN (
    -- Legacy QBO measurement kinds (GRNI / AR / AP / Inventory)
    'bill',
    'invoice',
    'inventory_adjustment',
    -- Provider-neutral / third-party spine (URM-3 lock)
    'bank_statement',
    'vendor_statement',
    'customer_statement',
    'confirmation',
    'count_sheet',
    'amort_schedule',
    'reserve_model',
    'fixed_asset_register',
    'debt_statement',
    'tax_document',
    'lease_schedule',
    'system_generated_schedule',
    'provider_txn',
    'pbc_upload',
    'manual_attachment'
  ));

-- Provider-neutral identity (source_qbo_id remains for GRNI; nullable for third-party).
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ALTER COLUMN source_qbo_id DROP NOT NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS provider text NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS audit_ready_tie_out_variance_evidence_provider_check;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT audit_ready_tie_out_variance_evidence_provider_check
  CHECK (
    provider IS NULL
    OR provider IN ('quickbooks', 'xero', 'external', 'system', 'manual')
  );

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS external_ref text NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS storage_path text NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS content_hash text NULL;

-- Workpaper / document display metadata (URM-3 lock)
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS file_name text NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS content_type text NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS source_date date NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS arte_source_identity_required;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT arte_source_identity_required
  CHECK (
    source_qbo_id IS NOT NULL
    OR external_ref IS NOT NULL
    OR storage_path IS NOT NULL
  );

-- Integrity hash: Advisacor convention = sha256 hex digest (64 lowercase hex),
-- same as upload-artifact / FA / BS recon artifact writers.
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS arte_content_hash_sha256_hex;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT arte_content_hash_sha256_hex
  CHECK (
    content_hash IS NULL
    OR content_hash ~ '^[a-f0-9]{64}$'
  );

-- Uploaded/static storage evidence must carry a real integrity hash.
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS arte_storage_requires_content_hash;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT arte_storage_requires_content_hash
  CHECK (
    storage_path IS NULL
    OR content_hash ~ '^[a-f0-9]{64}$'
  );

-- Idempotency for logical attachment identity (retry-safe).
-- Same document may support multiple items and/or multiple variances;
-- uniqueness is per attachment identity, not merely (item, hash).
DROP INDEX IF EXISTS uq_arte_item_content_hash;
CREATE UNIQUE INDEX IF NOT EXISTS uq_arte_item_only_content_hash
  ON public.audit_ready_tie_out_variance_evidence(reconciling_item_id, content_hash)
  WHERE reconciling_item_id IS NOT NULL
    AND content_hash IS NOT NULL
    AND variance_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_arte_item_variance_content_hash
  ON public.audit_ready_tie_out_variance_evidence(reconciling_item_id, variance_id, content_hash)
  WHERE reconciling_item_id IS NOT NULL
    AND variance_id IS NOT NULL
    AND content_hash IS NOT NULL;

-- Document / third-party rows may carry zero contribution cents.
-- Keep total/subtotal/balance NOT NULL (callers pass 0).

CREATE INDEX IF NOT EXISTS idx_arte_provider_external_ref
  ON public.audit_ready_tie_out_variance_evidence(provider, external_ref)
  WHERE external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_arte_content_hash
  ON public.audit_ready_tie_out_variance_evidence(content_hash)
  WHERE content_hash IS NOT NULL;

COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.reconciling_item_id IS
  'URM-3: optional FK to identified reconciling item. Source of truth for item↔evidence; URM-2 evidence_ids[] is denormalized repairable cache.';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.provider IS
  'URM-3: quickbooks | xero | external | system | manual. Null allowed for legacy GRNI rows.';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.external_ref IS
  'URM-3: provider-neutral external id (replaces sole reliance on source_qbo_id for non-QBO evidence).';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.storage_path IS
  'URM-3: uploaded third-party document path (PBC / statement / confirmation). Requires content_hash.';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.content_hash IS
  'URM-3: SHA-256 of attached document bytes as 64 lowercase hex (createHash("sha256").digest("hex")). Fail-closed format. Does not affect recon math.';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.file_name IS
  'URM-3: original file name for workpaper display.';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.content_type IS
  'URM-3: MIME type for workpaper display (e.g. application/pdf).';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.source_date IS
  'URM-3: document/source as-of date (statement period end, confirmation date, etc.).';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.fetched_at IS
  'URM-3: when the evidence bytes/metadata were fetched or uploaded.';

COMMENT ON TABLE public.audit_ready_tie_out_variance_evidence IS
  'URM-3 universal evidence spine (extends PBC-TIEOUT-3.4). Measurement variance and/or identified reconciling item evidence. Never authors residual/outcome math.';

-- ─────────────────────────────────────────────────────────────
-- 3) Same-run integrity stamp (run + engagement from item/variance)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_arte_stamp_run_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_engagement_id uuid;
  v_item_run_id uuid;
  v_var_run_id uuid;
BEGIN
  IF NEW.reconciling_item_id IS NOT NULL THEN
    SELECT i.run_id, i.engagement_id
      INTO v_item_run_id, v_engagement_id
    FROM public.audit_ready_reconciling_items i
    WHERE i.id = NEW.reconciling_item_id;

    IF v_item_run_id IS NULL THEN
      RAISE EXCEPTION 'urm3_reconciling_item_not_found';
    END IF;

    v_run_id := v_item_run_id;
    NEW.run_id := v_item_run_id;
    NEW.engagement_id := v_engagement_id;
  END IF;

  IF NEW.variance_id IS NOT NULL THEN
    SELECT v.run_id, v.engagement_id
      INTO v_var_run_id, v_engagement_id
    FROM public.audit_ready_tie_out_variances v
    WHERE v.id = NEW.variance_id;

    IF v_var_run_id IS NULL THEN
      RAISE EXCEPTION 'urm3_variance_not_found';
    END IF;

    IF v_run_id IS NOT NULL AND v_run_id <> v_var_run_id THEN
      RAISE EXCEPTION 'urm3_cross_run_evidence_forbidden';
    END IF;

    NEW.run_id := v_var_run_id;
    NEW.engagement_id := v_engagement_id;
  END IF;

  -- Normalize content_hash when provided (lowercase; strip optional sha256: prefix).
  IF NEW.content_hash IS NOT NULL THEN
    NEW.content_hash := lower(regexp_replace(btrim(NEW.content_hash), '^sha256:', ''));
    IF NEW.content_hash !~ '^[a-f0-9]{64}$' THEN
      RAISE EXCEPTION 'urm3_invalid_content_hash';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_arte_stamp_run_identity
  ON public.audit_ready_tie_out_variance_evidence;
CREATE TRIGGER trg_arte_stamp_run_identity
  BEFORE INSERT OR UPDATE OF variance_id, reconciling_item_id, run_id, engagement_id, content_hash
  ON public.audit_ready_tie_out_variance_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_arte_stamp_run_identity();

REVOKE ALL ON FUNCTION public.trg_arte_stamp_run_identity()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.trg_arte_stamp_run_identity() IS
  'URM-3: stamps evidence run/engagement from variance and/or reconciling item; forbids cross-run linkage; normalizes/validates content_hash.';

-- ─────────────────────────────────────────────────────────────
-- 4) RLS — explicit engagement membership (cross-engagement denied)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "arte_select_via_variance" ON public.audit_ready_tie_out_variance_evidence;
DROP POLICY IF EXISTS arte_select_engagement_read ON public.audit_ready_tie_out_variance_evidence;
CREATE POLICY arte_select_engagement_read
  ON public.audit_ready_tie_out_variance_evidence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_tie_out_variance_evidence.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );

-- Explicit service_role write policy (mirrors reconciling_items).
DROP POLICY IF EXISTS arte_service_role_all ON public.audit_ready_tie_out_variance_evidence;
CREATE POLICY arte_service_role_all
  ON public.audit_ready_tie_out_variance_evidence
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260815120000_urm3_universal_evidence_spine.sql

-- >>> begin 20260815130000_urm3_hash_normalization_order.sql
-- URM-3.1: Align evidence content_hash normalization with TypeScript contract.
-- Corrective only — does NOT alter already-applied
-- 20260815120000_urm3_universal_evidence_spine.sql or migration history.
--
-- Live defect: trigger did lower(regexp_replace(..., '^sha256:', '')), so
-- case-sensitive prefix strip ran before lowercasing and rejected SHA256:HEX.
-- Fix order (matches normalizeEvidenceContentHash): lower first, then strip.
--
-- READY ONLY — do not apply until authorized after PR review.

CREATE OR REPLACE FUNCTION public.trg_arte_stamp_run_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_engagement_id uuid;
  v_item_run_id uuid;
  v_var_run_id uuid;
BEGIN
  IF NEW.reconciling_item_id IS NOT NULL THEN
    SELECT i.run_id, i.engagement_id
      INTO v_item_run_id, v_engagement_id
    FROM public.audit_ready_reconciling_items i
    WHERE i.id = NEW.reconciling_item_id;

    IF v_item_run_id IS NULL THEN
      RAISE EXCEPTION 'urm3_reconciling_item_not_found';
    END IF;

    v_run_id := v_item_run_id;
    NEW.run_id := v_item_run_id;
    NEW.engagement_id := v_engagement_id;
  END IF;

  IF NEW.variance_id IS NOT NULL THEN
    SELECT v.run_id, v.engagement_id
      INTO v_var_run_id, v_engagement_id
    FROM public.audit_ready_tie_out_variances v
    WHERE v.id = NEW.variance_id;

    IF v_var_run_id IS NULL THEN
      RAISE EXCEPTION 'urm3_variance_not_found';
    END IF;

    IF v_run_id IS NOT NULL AND v_run_id <> v_var_run_id THEN
      RAISE EXCEPTION 'urm3_cross_run_evidence_forbidden';
    END IF;

    NEW.run_id := v_var_run_id;
    NEW.engagement_id := v_engagement_id;
  END IF;

  -- Normalize content_hash: lower first, then strip optional sha256: prefix
  -- (matches lib/audit-ready/tie-out/evidence-spine.ts normalizeEvidenceContentHash).
  IF NEW.content_hash IS NOT NULL THEN
    NEW.content_hash := regexp_replace(lower(btrim(NEW.content_hash)), '^sha256:', '');
    IF NEW.content_hash !~ '^[a-f0-9]{64}$' THEN
      RAISE EXCEPTION 'urm3_invalid_content_hash';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_arte_stamp_run_identity() IS
  'URM-3/URM-3.1: stamps evidence run/engagement from variance and/or reconciling item; forbids cross-run linkage; normalizes content_hash (lower then strip sha256: prefix) then validates.';
-- <<< end 20260815130000_urm3_hash_normalization_order.sql

-- >>> begin 20260815140000_urm3_storage_requires_hash_not_null.sql
-- URM-3.2: Require non-null content_hash when storage_path is set.
-- Corrective only — does NOT alter already-applied:
--   20260815120000_urm3_universal_evidence_spine.sql
--   20260815130000_urm3_hash_normalization_order.sql
--
-- Live defect: CHECK was
--   storage_path IS NULL OR content_hash ~ '^[a-f0-9]{64}$'
-- In PostgreSQL, CHECK fails only on FALSE; NULL passes, so
-- storage_path SET + content_hash NULL slipped through.
--
-- READY ONLY — do not apply until authorized after PR review.

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS arte_storage_requires_content_hash;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT arte_storage_requires_content_hash
  CHECK (
    storage_path IS NULL
    OR (
      content_hash IS NOT NULL
      AND content_hash ~ '^[a-f0-9]{64}$'
    )
  );

COMMENT ON CONSTRAINT arte_storage_requires_content_hash
  ON public.audit_ready_tie_out_variance_evidence IS
  'URM-3.2: storage-backed evidence requires a non-null SHA-256 hex content_hash (NULL regex no longer passes CHECK).';
-- <<< end 20260815140000_urm3_storage_requires_hash_not_null.sql

-- >>> begin 20260818020716_accounting_measurement_snapshots.sql
-- CC-2A1 — AR measurement-input custody.
-- Sibling of accounting_syncs. Do NOT expand accounting_syncs.normalized_payload.
-- Immutable evidence input: no payload/hash/sync/as-of mutation; no historical backfill.
-- Custody authority is the parent accounting_syncs row. Do not duplicate
-- company/connection/provider/tenant columns that can contradict the parent.

CREATE TABLE IF NOT EXISTS public.accounting_measurement_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accounting_sync_id uuid NOT NULL
    REFERENCES public.accounting_syncs(id)
    ON DELETE CASCADE,
  snapshot_kind text NOT NULL,
  as_of_date date NOT NULL,
  schema_version integer NOT NULL,
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  source_request_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_measurement_snapshots_unique
    UNIQUE (accounting_sync_id, snapshot_kind, as_of_date),
  CONSTRAINT accounting_measurement_snapshots_kind_check
    CHECK (snapshot_kind IN ('ar_aging')),
  CONSTRAINT accounting_measurement_snapshots_schema_version_check
    CHECK (schema_version > 0),
  CONSTRAINT accounting_measurement_snapshots_payload_hash_check
    CHECK (payload_hash ~ '^[a-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS accounting_measurement_snapshots_kind_asof_idx
  ON public.accounting_measurement_snapshots (snapshot_kind, as_of_date);

COMMENT ON TABLE public.accounting_measurement_snapshots IS
  'Immutable URM measurement-input custody. Identity authority is accounting_syncs(id); company/connection/provider/tenant are not duplicated.';

CREATE OR REPLACE FUNCTION public.accounting_measurement_snapshots_deny_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'accounting_measurement_snapshots rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS accounting_measurement_snapshots_immutable
  ON public.accounting_measurement_snapshots;
CREATE TRIGGER accounting_measurement_snapshots_immutable
  BEFORE UPDATE ON public.accounting_measurement_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.accounting_measurement_snapshots_deny_update();

ALTER TABLE public.accounting_measurement_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounting_measurement_snapshots_service_role_all
  ON public.accounting_measurement_snapshots;
CREATE POLICY accounting_measurement_snapshots_service_role_all
  ON public.accounting_measurement_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS accounting_measurement_snapshots_select
  ON public.accounting_measurement_snapshots;
CREATE POLICY accounting_measurement_snapshots_select
  ON public.accounting_measurement_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.accounting_syncs s
      JOIN public.company_users cu
        ON cu.company_id = s.company_id
      WHERE s.id = accounting_measurement_snapshots.accounting_sync_id
        AND cu.user_id = (SELECT auth.uid())
        AND cu.status = 'active'
    )
  );

GRANT SELECT ON public.accounting_measurement_snapshots TO authenticated;
GRANT ALL ON public.accounting_measurement_snapshots TO service_role;
-- <<< end 20260818020716_accounting_measurement_snapshots.sql

-- >>> begin 20260818040000_accounting_measurement_snapshots_ap_aging_kind.sql
-- CC-2A2 — permit AP aging measurement snapshots on the existing table.
-- Additive CHECK only. Do not edit 20260818020716. No backfill. No RLS change.

ALTER TABLE public.accounting_measurement_snapshots
  DROP CONSTRAINT IF EXISTS accounting_measurement_snapshots_kind_check;

ALTER TABLE public.accounting_measurement_snapshots
  ADD CONSTRAINT accounting_measurement_snapshots_kind_check
  CHECK (snapshot_kind IN ('ar_aging', 'ap_aging'));
-- <<< end 20260818040000_accounting_measurement_snapshots_ap_aging_kind.sql

-- >>> begin 20260818050000_accounting_measurement_snapshots_inventory_kind.sql
-- CC-2A3 — permit inventory measurement snapshots on the existing table.
-- Additive CHECK only. Do not edit prior applied migrations. No backfill. No RLS change.

ALTER TABLE public.accounting_measurement_snapshots
  DROP CONSTRAINT IF EXISTS accounting_measurement_snapshots_kind_check;

ALTER TABLE public.accounting_measurement_snapshots
  ADD CONSTRAINT accounting_measurement_snapshots_kind_check
  CHECK (snapshot_kind IN ('ar_aging', 'ap_aging', 'inventory'));
-- <<< end 20260818050000_accounting_measurement_snapshots_inventory_kind.sql

-- >>> begin 20260819045253_continuous_close_runs.sql
-- CC-2B — persisted Continuous Close OBSERVE runs.
-- Query/read authority lives here. Patent #6 chain custody stays on ledger_events.
-- Append-only: no UPDATE/DELETE of historical close evaluations.

CREATE TABLE IF NOT EXISTS public.continuous_close_runs (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL
    REFERENCES public.companies(id)
    ON DELETE RESTRICT,
  engagement_id uuid NOT NULL
    REFERENCES public.audit_ready_engagements(id)
    ON DELETE RESTRICT,
  firm_client_id uuid NULL
    REFERENCES public.firm_clients(id)
    ON DELETE RESTRICT,
  close_period_id uuid NULL
    REFERENCES public.close_periods(id)
    ON DELETE SET NULL,
  accounting_sync_id uuid NOT NULL
    REFERENCES public.accounting_syncs(id)
    ON DELETE RESTRICT,
  period_end date NOT NULL,
  mode text NOT NULL,
  readiness text NOT NULL,
  status text NOT NULL,
  policy_hash text NOT NULL,
  input_hash text NOT NULL,
  policy_snapshot jsonb NOT NULL,
  observation_summary jsonb NOT NULL,
  result jsonb NOT NULL,
  created_by uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE RESTRICT,
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  supersedes_run_id uuid NULL
    REFERENCES public.continuous_close_runs(id)
    ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT continuous_close_runs_mode_check
    CHECK (mode = 'OBSERVE'),
  CONSTRAINT continuous_close_runs_readiness_check
    CHECK (readiness IN ('READY', 'READY_WITH_REVIEW', 'BLOCKED')),
  CONSTRAINT continuous_close_runs_status_check
    CHECK (status = 'completed'),
  CONSTRAINT continuous_close_runs_policy_hash_check
    CHECK (policy_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT continuous_close_runs_input_hash_check
    CHECK (input_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT continuous_close_runs_idempotency_key_check
    CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  CONSTRAINT continuous_close_runs_idempotency_key_unique
    UNIQUE (idempotency_key),
  CONSTRAINT continuous_close_runs_not_self_supersede
    CHECK (supersedes_run_id IS NULL OR supersedes_run_id <> id)
);

CREATE INDEX IF NOT EXISTS continuous_close_runs_engagement_period_sync_idx
  ON public.continuous_close_runs (engagement_id, period_end, accounting_sync_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS continuous_close_runs_company_idx
  ON public.continuous_close_runs (company_id, created_at DESC);

COMMENT ON TABLE public.continuous_close_runs IS
  'Immutable Continuous Close OBSERVE evaluations. Ledger chain receipts are ledger_events, not columns here.';

CREATE OR REPLACE FUNCTION public.continuous_close_runs_deny_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'continuous_close_runs rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS continuous_close_runs_immutable_update
  ON public.continuous_close_runs;
CREATE TRIGGER continuous_close_runs_immutable_update
  BEFORE UPDATE ON public.continuous_close_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.continuous_close_runs_deny_mutation();

DROP TRIGGER IF EXISTS continuous_close_runs_immutable_delete
  ON public.continuous_close_runs;
CREATE TRIGGER continuous_close_runs_immutable_delete
  BEFORE DELETE ON public.continuous_close_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.continuous_close_runs_deny_mutation();

ALTER TABLE public.continuous_close_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS continuous_close_runs_service_role_all
  ON public.continuous_close_runs;
CREATE POLICY continuous_close_runs_service_role_all
  ON public.continuous_close_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated SELECT mirrors resolveEngagementActorForVerifiedUser read
-- semantics (any active company or firm membership on the canonical
-- engagement). Super-admin remains server/service-role, not an email
-- allowlist in SQL. Writes stay service_role.
DROP POLICY IF EXISTS continuous_close_runs_select
  ON public.continuous_close_runs;
CREATE POLICY continuous_close_runs_select
  ON public.continuous_close_runs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = continuous_close_runs.engagement_id
        AND (
          (
            e.company_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.company_users cu
              WHERE cu.company_id = e.company_id
                AND cu.user_id = (SELECT auth.uid())
                AND cu.status = 'active'
            )
          )
          OR
          (
            e.firm_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.firm_memberships fm
              WHERE fm.firm_id = e.firm_id
                AND fm.user_id = (SELECT auth.uid())
                AND fm.status = 'active'
            )
          )
        )
    )
  );

GRANT SELECT ON public.continuous_close_runs TO authenticated;
GRANT ALL ON public.continuous_close_runs TO service_role;

-- Atomic insert + Patent #6 receipt. Unique conflict returns the existing row
-- without publishing a second event. publish_ledger_event failure rolls back
-- the CC row so query authority and chain receipt cannot drift.
CREATE OR REPLACE FUNCTION public.persist_continuous_close_observe_run(
  p_row jsonb,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  reused boolean,
  run jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.continuous_close_runs%ROWTYPE;
  v_inserted public.continuous_close_runs%ROWTYPE;
  v_event_id uuid;
BEGIN
  SELECT *
    INTO v_existing
    FROM public.continuous_close_runs
   WHERE idempotency_key = p_row->>'idempotency_key';

  IF FOUND THEN
    reused := true;
    run := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.continuous_close_runs (
    id,
    company_id,
    engagement_id,
    firm_client_id,
    close_period_id,
    accounting_sync_id,
    period_end,
    mode,
    readiness,
    status,
    policy_hash,
    input_hash,
    policy_snapshot,
    observation_summary,
    result,
    created_by,
    started_at,
    completed_at,
    supersedes_run_id,
    idempotency_key
  ) VALUES (
    (p_row->>'id')::uuid,
    (p_row->>'company_id')::uuid,
    (p_row->>'engagement_id')::uuid,
    NULLIF(p_row->>'firm_client_id', '')::uuid,
    NULLIF(p_row->>'close_period_id', '')::uuid,
    (p_row->>'accounting_sync_id')::uuid,
    (p_row->>'period_end')::date,
    p_row->>'mode',
    p_row->>'readiness',
    p_row->>'status',
    p_row->>'policy_hash',
    p_row->>'input_hash',
    COALESCE(p_row->'policy_snapshot', '{}'::jsonb),
    COALESCE(p_row->'observation_summary', '{}'::jsonb),
    COALESCE(p_row->'result', '{}'::jsonb),
    (p_row->>'created_by')::uuid,
    (p_row->>'started_at')::timestamptz,
    (p_row->>'completed_at')::timestamptz,
    NULLIF(p_row->>'supersedes_run_id', '')::uuid,
    p_row->>'idempotency_key'
  )
  RETURNING * INTO v_inserted;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'continuous_close.observe.completed',
      'close',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'continuous_close_run',
      v_inserted.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  reused := false;
  run := to_jsonb(v_inserted);
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO v_existing
      FROM public.continuous_close_runs
     WHERE idempotency_key = p_row->>'idempotency_key';
    IF NOT FOUND THEN
      RAISE;
    END IF;
    reused := true;
    run := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_continuous_close_observe_run(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_continuous_close_observe_run(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.persist_continuous_close_observe_run(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_continuous_close_observe_run(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;
-- <<< end 20260819045253_continuous_close_runs.sql

-- >>> begin 20260820233219_journal_entry_proposals.sql
-- JE-1 — CC-sourced journal entry proposal foundation.
-- Immutable proposal custody + Patent #6 journal_entry.proposed receipt.
-- No approval table, no execution table, no provider write.

CREATE TABLE IF NOT EXISTS public.journal_entry_proposals (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL
    REFERENCES public.companies(id)
    ON DELETE RESTRICT,
  engagement_id uuid NOT NULL
    REFERENCES public.audit_ready_engagements(id)
    ON DELETE RESTRICT,
  firm_client_id uuid NULL
    REFERENCES public.firm_clients(id)
    ON DELETE RESTRICT,
  period_end date NOT NULL,
  source_continuous_close_run_id uuid NOT NULL
    REFERENCES public.continuous_close_runs(id)
    ON DELETE RESTRICT,
  source_accounting_sync_id uuid NOT NULL
    REFERENCES public.accounting_syncs(id)
    ON DELETE RESTRICT,
  source_recon_run_ids jsonb NOT NULL,
  origin_type text NOT NULL,
  reason_code text NOT NULL,
  memo text NULL,
  currency text NOT NULL,
  txn_date date NOT NULL,
  lines jsonb NOT NULL,
  total_debits_cents bigint NOT NULL,
  total_credits_cents bigint NOT NULL,
  expected_effects jsonb NOT NULL,
  policy_snapshot jsonb NOT NULL,
  policy_hash text NOT NULL,
  proposal_hash text NOT NULL,
  status text NOT NULL,
  proposed_by uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE RESTRICT,
  proposed_at timestamptz NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_entry_proposals_origin_type_check
    CHECK (origin_type IN ('ACCRUAL', 'RECLASS')),
  CONSTRAINT journal_entry_proposals_status_check
    CHECK (status = 'SUBMITTED'),
  CONSTRAINT journal_entry_proposals_currency_check
    CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT journal_entry_proposals_totals_check
    CHECK (
      total_debits_cents > 0
      AND total_credits_cents > 0
      AND total_debits_cents = total_credits_cents
    ),
  CONSTRAINT journal_entry_proposals_policy_hash_check
    CHECK (policy_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_proposals_proposal_hash_check
    CHECK (proposal_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_proposals_idempotency_key_check
    CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_proposals_idempotency_key_unique
    UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS journal_entry_proposals_engagement_period_idx
  ON public.journal_entry_proposals (engagement_id, period_end, created_at DESC);

CREATE INDEX IF NOT EXISTS journal_entry_proposals_source_cc_idx
  ON public.journal_entry_proposals (source_continuous_close_run_id);

COMMENT ON TABLE public.journal_entry_proposals IS
  'Immutable CC-sourced JE proposals. Patent #6 receipts live on ledger_events. No provider write in JE-1.';

CREATE OR REPLACE FUNCTION public.journal_entry_proposals_deny_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'journal_entry_proposals rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS journal_entry_proposals_immutable_update
  ON public.journal_entry_proposals;
CREATE TRIGGER journal_entry_proposals_immutable_update
  BEFORE UPDATE ON public.journal_entry_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_proposals_deny_mutation();

DROP TRIGGER IF EXISTS journal_entry_proposals_immutable_delete
  ON public.journal_entry_proposals;
CREATE TRIGGER journal_entry_proposals_immutable_delete
  BEFORE DELETE ON public.journal_entry_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_proposals_deny_mutation();

ALTER TABLE public.journal_entry_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journal_entry_proposals_service_role_all
  ON public.journal_entry_proposals;
CREATE POLICY journal_entry_proposals_service_role_all
  ON public.journal_entry_proposals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated SELECT mirrors continuous_close_runs / engagement read authority.
DROP POLICY IF EXISTS journal_entry_proposals_select
  ON public.journal_entry_proposals;
CREATE POLICY journal_entry_proposals_select
  ON public.journal_entry_proposals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = journal_entry_proposals.engagement_id
        AND (
          (
            e.company_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.company_users cu
              WHERE cu.company_id = e.company_id
                AND cu.user_id = (SELECT auth.uid())
                AND cu.status = 'active'
            )
          )
          OR
          (
            e.firm_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.firm_memberships fm
              WHERE fm.firm_id = e.firm_id
                AND fm.user_id = (SELECT auth.uid())
                AND fm.status = 'active'
            )
          )
        )
    )
  );

GRANT SELECT ON public.journal_entry_proposals TO authenticated;
GRANT ALL ON public.journal_entry_proposals TO service_role;

-- Atomic insert + Patent #6 receipt. Unique conflict returns existing row
-- without publishing a second event. publish_ledger_event failure rolls back.
CREATE OR REPLACE FUNCTION public.persist_journal_entry_proposal(
  p_row jsonb,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  reused boolean,
  proposal jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.journal_entry_proposals%ROWTYPE;
  v_inserted public.journal_entry_proposals%ROWTYPE;
  v_event_id uuid;
BEGIN
  SELECT *
    INTO v_existing
    FROM public.journal_entry_proposals
   WHERE idempotency_key = p_row->>'idempotency_key';

  IF FOUND THEN
    reused := true;
    proposal := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.journal_entry_proposals (
    id,
    company_id,
    engagement_id,
    firm_client_id,
    period_end,
    source_continuous_close_run_id,
    source_accounting_sync_id,
    source_recon_run_ids,
    origin_type,
    reason_code,
    memo,
    currency,
    txn_date,
    lines,
    total_debits_cents,
    total_credits_cents,
    expected_effects,
    policy_snapshot,
    policy_hash,
    proposal_hash,
    status,
    proposed_by,
    proposed_at,
    idempotency_key
  ) VALUES (
    (p_row->>'id')::uuid,
    (p_row->>'company_id')::uuid,
    (p_row->>'engagement_id')::uuid,
    NULLIF(p_row->>'firm_client_id', '')::uuid,
    (p_row->>'period_end')::date,
    (p_row->>'source_continuous_close_run_id')::uuid,
    (p_row->>'source_accounting_sync_id')::uuid,
    COALESCE(p_row->'source_recon_run_ids', '[]'::jsonb),
    p_row->>'origin_type',
    p_row->>'reason_code',
    NULLIF(p_row->>'memo', ''),
    p_row->>'currency',
    (p_row->>'txn_date')::date,
    COALESCE(p_row->'lines', '[]'::jsonb),
    (p_row->>'total_debits_cents')::bigint,
    (p_row->>'total_credits_cents')::bigint,
    COALESCE(p_row->'expected_effects', '[]'::jsonb),
    COALESCE(p_row->'policy_snapshot', '{}'::jsonb),
    p_row->>'policy_hash',
    p_row->>'proposal_hash',
    p_row->>'status',
    (p_row->>'proposed_by')::uuid,
    (p_row->>'proposed_at')::timestamptz,
    p_row->>'idempotency_key'
  )
  RETURNING * INTO v_inserted;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.proposed',
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_proposal',
      v_inserted.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  reused := false;
  proposal := to_jsonb(v_inserted);
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO v_existing
      FROM public.journal_entry_proposals
     WHERE idempotency_key = p_row->>'idempotency_key';
    IF NOT FOUND THEN
      RAISE;
    END IF;
    reused := true;
    proposal := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_journal_entry_proposal(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_journal_entry_proposal(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.persist_journal_entry_proposal(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_journal_entry_proposal(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;
-- <<< end 20260820233219_journal_entry_proposals.sql

-- >>> begin 20260821042800_journal_entry_approvals.sql
-- JE-2 — Governed human approval / SoD custody for immutable JE-1 proposals.
-- Append-only approval decisions + Patent #6 journal_entry.approved|rejected.
-- No proposal mutation. No execution table. No provider write.

CREATE TABLE IF NOT EXISTS public.journal_entry_approvals (
  id uuid PRIMARY KEY,
  proposal_id uuid NOT NULL
    REFERENCES public.journal_entry_proposals(id)
    ON DELETE RESTRICT,
  company_id uuid NOT NULL
    REFERENCES public.companies(id)
    ON DELETE RESTRICT,
  engagement_id uuid NOT NULL
    REFERENCES public.audit_ready_engagements(id)
    ON DELETE RESTRICT,
  proposal_hash text NOT NULL,
  policy_hash text NOT NULL,
  decision text NOT NULL,
  approval_mode text NOT NULL,
  reviewer_user_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE RESTRICT,
  reviewer_role text NULL,
  mfa_level text NULL,
  mfa_verified_at timestamptz NULL,
  decision_reason text NULL,
  policy_snapshot jsonb NOT NULL,
  approved_at timestamptz NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_entry_approvals_decision_check
    CHECK (decision IN ('APPROVED', 'REJECTED')),
  CONSTRAINT journal_entry_approvals_mode_check
    CHECK (approval_mode = 'REVIEW_REQUIRED'),
  CONSTRAINT journal_entry_approvals_proposal_hash_check
    CHECK (proposal_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_approvals_policy_hash_check
    CHECK (policy_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_approvals_idempotency_key_check
    CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_approvals_idempotency_key_unique
    UNIQUE (idempotency_key)
);

-- At most one APPROVED decision per exact proposal + approval-policy binding.
CREATE UNIQUE INDEX IF NOT EXISTS journal_entry_approvals_one_approved_idx
  ON public.journal_entry_approvals (proposal_id, proposal_hash, policy_hash)
  WHERE decision = 'APPROVED';

CREATE INDEX IF NOT EXISTS journal_entry_approvals_proposal_idx
  ON public.journal_entry_approvals (proposal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS journal_entry_approvals_engagement_idx
  ON public.journal_entry_approvals (engagement_id, created_at DESC);

COMMENT ON TABLE public.journal_entry_approvals IS
  'Immutable JE-2 approval decisions for JE-1 proposals. policy_hash is the approval policy hash. No provider write.';

CREATE OR REPLACE FUNCTION public.journal_entry_approvals_deny_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'journal_entry_approvals rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS journal_entry_approvals_immutable_update
  ON public.journal_entry_approvals;
CREATE TRIGGER journal_entry_approvals_immutable_update
  BEFORE UPDATE ON public.journal_entry_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_approvals_deny_mutation();

DROP TRIGGER IF EXISTS journal_entry_approvals_immutable_delete
  ON public.journal_entry_approvals;
CREATE TRIGGER journal_entry_approvals_immutable_delete
  BEFORE DELETE ON public.journal_entry_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_approvals_deny_mutation();

ALTER TABLE public.journal_entry_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journal_entry_approvals_service_role_all
  ON public.journal_entry_approvals;
CREATE POLICY journal_entry_approvals_service_role_all
  ON public.journal_entry_approvals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS journal_entry_approvals_select
  ON public.journal_entry_approvals;
CREATE POLICY journal_entry_approvals_select
  ON public.journal_entry_approvals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = journal_entry_approvals.engagement_id
        AND (
          (
            e.company_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.company_users cu
              WHERE cu.company_id = e.company_id
                AND cu.user_id = (SELECT auth.uid())
                AND cu.status = 'active'
            )
          )
          OR
          (
            e.firm_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.firm_memberships fm
              WHERE fm.firm_id = e.firm_id
                AND fm.user_id = (SELECT auth.uid())
                AND fm.status = 'active'
            )
          )
        )
    )
  );

GRANT SELECT ON public.journal_entry_approvals TO authenticated;
GRANT ALL ON public.journal_entry_approvals TO service_role;

-- Atomic approval insert + Patent #6 receipt.
CREATE OR REPLACE FUNCTION public.persist_journal_entry_approval(
  p_row jsonb,
  p_event_type text,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  reused boolean,
  approval jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.journal_entry_approvals%ROWTYPE;
  v_inserted public.journal_entry_approvals%ROWTYPE;
  v_event_id uuid;
BEGIN
  IF p_event_type NOT IN ('journal_entry.approved', 'journal_entry.rejected') THEN
    RAISE EXCEPTION 'invalid journal entry approval event type: %', p_event_type;
  END IF;

  SELECT *
    INTO v_existing
    FROM public.journal_entry_approvals
   WHERE idempotency_key = p_row->>'idempotency_key';

  IF FOUND THEN
    reused := true;
    approval := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- If an APPROVED decision already binds this proposal+hashes, reuse it
  -- (different reviewer racing) without publishing a second event.
  IF p_row->>'decision' = 'APPROVED' THEN
    SELECT *
      INTO v_existing
      FROM public.journal_entry_approvals
     WHERE proposal_id = (p_row->>'proposal_id')::uuid
       AND proposal_hash = p_row->>'proposal_hash'
       AND policy_hash = p_row->>'policy_hash'
       AND decision = 'APPROVED'
     LIMIT 1;
    IF FOUND THEN
      reused := true;
      approval := to_jsonb(v_existing);
      ledger_event_id := NULL;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.journal_entry_approvals (
    id,
    proposal_id,
    company_id,
    engagement_id,
    proposal_hash,
    policy_hash,
    decision,
    approval_mode,
    reviewer_user_id,
    reviewer_role,
    mfa_level,
    mfa_verified_at,
    decision_reason,
    policy_snapshot,
    approved_at,
    idempotency_key
  ) VALUES (
    (p_row->>'id')::uuid,
    (p_row->>'proposal_id')::uuid,
    (p_row->>'company_id')::uuid,
    (p_row->>'engagement_id')::uuid,
    p_row->>'proposal_hash',
    p_row->>'policy_hash',
    p_row->>'decision',
    p_row->>'approval_mode',
    (p_row->>'reviewer_user_id')::uuid,
    NULLIF(p_row->>'reviewer_role', ''),
    NULLIF(p_row->>'mfa_level', ''),
    NULLIF(p_row->>'mfa_verified_at', '')::timestamptz,
    NULLIF(p_row->>'decision_reason', ''),
    COALESCE(p_row->'policy_snapshot', '{}'::jsonb),
    (p_row->>'approved_at')::timestamptz,
    p_row->>'idempotency_key'
  )
  RETURNING * INTO v_inserted;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      p_event_type,
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_proposal',
      v_inserted.proposal_id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  reused := false;
  approval := to_jsonb(v_inserted);
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO v_existing
      FROM public.journal_entry_approvals
     WHERE idempotency_key = p_row->>'idempotency_key';
    IF NOT FOUND AND p_row->>'decision' = 'APPROVED' THEN
      SELECT *
        INTO v_existing
        FROM public.journal_entry_approvals
       WHERE proposal_id = (p_row->>'proposal_id')::uuid
         AND proposal_hash = p_row->>'proposal_hash'
         AND policy_hash = p_row->>'policy_hash'
         AND decision = 'APPROVED'
       LIMIT 1;
    END IF;
    IF NOT FOUND THEN
      RAISE;
    END IF;
    reused := true;
    approval := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_journal_entry_approval(
  jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_journal_entry_approval(
  jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.persist_journal_entry_approval(
  jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_journal_entry_approval(
  jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;
-- <<< end 20260821042800_journal_entry_approvals.sql

-- [ESC] RLS closure: no CREATE TABLE without ENABLE RLS in this slice.

-- [ESC] Function privilege closure before COMMIT
-- Default PUBLIC EXECUTE removed for every application function created/replaced in this slice.
-- Regrant only per disposition (service_role always; authenticated only for allowlisted RLS helpers).
-- disposition public.audit_ready_latest_bs_kickout_lines(uuid[]) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.audit_ready_latest_bs_kickout_lines(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_ready_latest_bs_kickout_lines(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_ready_latest_bs_kickout_lines(uuid[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.audit_ready_latest_bs_kickout_lines(uuid[]) TO service_role;
-- disposition public.audit_ready_latest_pbc_kickout_runs(uuid[]) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.audit_ready_latest_pbc_kickout_runs(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_ready_latest_pbc_kickout_runs(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_ready_latest_pbc_kickout_runs(uuid[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.audit_ready_latest_pbc_kickout_runs(uuid[]) TO service_role;
-- disposition public.get_similar_kickout_resolutions(uuid,text,jsonb) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.get_similar_kickout_resolutions(uuid,text,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_similar_kickout_resolutions(uuid,text,jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_similar_kickout_resolutions(uuid,text,jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_similar_kickout_resolutions(uuid,text,jsonb) TO service_role;
-- disposition public.get_similar_kickout_resolution_counts(uuid[]) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.get_similar_kickout_resolution_counts(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_similar_kickout_resolution_counts(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_similar_kickout_resolution_counts(uuid[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_similar_kickout_resolution_counts(uuid[]) TO service_role;
-- disposition public.handle_new_auth_user() => trigger_only
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM service_role;
-- disposition public.pilot_lifecycle_events_canonical_payload(text,timestamptz,text,uuid,text,text,text,uuid,uuid,text,uuid,text,text[],jsonb,text,text,jsonb) => trigger_only
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_canonical_payload(text,timestamptz,text,uuid,text,text,text,uuid,uuid,text,uuid,text,text[],jsonb,text,text,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_canonical_payload(text,timestamptz,text,uuid,text,text,text,uuid,uuid,text,uuid,text,text[],jsonb,text,text,jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_canonical_payload(text,timestamptz,text,uuid,text,text,text,uuid,uuid,text,uuid,text,text[],jsonb,text,text,jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_canonical_payload(text,timestamptz,text,uuid,text,text,text,uuid,uuid,text,uuid,text,text[],jsonb,text,text,jsonb) FROM service_role;
-- disposition public.pilot_lifecycle_events_before_insert() => trigger_only
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_before_insert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_before_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_before_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_before_insert() FROM service_role;
-- disposition public.pilot_lifecycle_events_reject_mutations() => trigger_only
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_reject_mutations() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_reject_mutations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_reject_mutations() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_reject_mutations() FROM service_role;
-- disposition public.pilot_lifecycle_events_verify_chain(uuid,uuid) => migration_admin_or_internal
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_verify_chain(uuid,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_verify_chain(uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_verify_chain(uuid,uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_verify_chain(uuid,uuid) FROM service_role;
-- disposition public.sp_write_anchor_batch(int8,int8,int4,text,jsonb,jsonb) => migration_admin_or_internal
REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(int8,int8,int4,text,jsonb,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(int8,int8,int4,text,jsonb,jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(int8,int8,int4,text,jsonb,jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(int8,int8,int4,text,jsonb,jsonb) FROM service_role;
-- disposition public.sp_list_public_columns() => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.sp_list_public_columns() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sp_list_public_columns() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sp_list_public_columns() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sp_list_public_columns() TO service_role;
-- disposition public.resolve_assertion_impact_by_table(text) => migration_admin_or_internal
REVOKE EXECUTE ON FUNCTION public.resolve_assertion_impact_by_table(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_assertion_impact_by_table(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_assertion_impact_by_table(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_assertion_impact_by_table(text) FROM service_role;
-- disposition public.backfill_schema_drift_assertion_impact(bool) => migration_admin_or_internal
REVOKE EXECUTE ON FUNCTION public.backfill_schema_drift_assertion_impact(bool) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.backfill_schema_drift_assertion_impact(bool) FROM anon;
REVOKE EXECUTE ON FUNCTION public.backfill_schema_drift_assertion_impact(bool) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.backfill_schema_drift_assertion_impact(bool) FROM service_role;
-- disposition public.trg_lifecycle_issues_assertion_impact() => trigger_only
REVOKE EXECUTE ON FUNCTION public.trg_lifecycle_issues_assertion_impact() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_lifecycle_issues_assertion_impact() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_lifecycle_issues_assertion_impact() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_lifecycle_issues_assertion_impact() FROM service_role;
-- disposition public.resolve_assertion_confidence_by_table(text) => migration_admin_or_internal
REVOKE EXECUTE ON FUNCTION public.resolve_assertion_confidence_by_table(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_assertion_confidence_by_table(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_assertion_confidence_by_table(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_assertion_confidence_by_table(text) FROM service_role;
-- disposition public.resolve_fr_relevance_by_table(text) => migration_admin_or_internal
REVOKE EXECUTE ON FUNCTION public.resolve_fr_relevance_by_table(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_fr_relevance_by_table(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_fr_relevance_by_table(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_fr_relevance_by_table(text) FROM service_role;
-- disposition public.resolve_mapping_source_by_table(text) => trigger_only
REVOKE EXECUTE ON FUNCTION public.resolve_mapping_source_by_table(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_mapping_source_by_table(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_mapping_source_by_table(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_mapping_source_by_table(text) FROM service_role;
-- disposition public.trg_ar_reconciling_items_stamp_run_identity() => trigger_only
REVOKE EXECUTE ON FUNCTION public.trg_ar_reconciling_items_stamp_run_identity() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_ar_reconciling_items_stamp_run_identity() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_ar_reconciling_items_stamp_run_identity() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_ar_reconciling_items_stamp_run_identity() FROM service_role;
-- disposition public.persist_audit_ready_recon_bridge(uuid,jsonb,int8,int8,int4,int4,text,bool,timestamptz) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.persist_audit_ready_recon_bridge(uuid,jsonb,int8,int8,int4,int4,text,bool,timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.persist_audit_ready_recon_bridge(uuid,jsonb,int8,int8,int4,int4,text,bool,timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.persist_audit_ready_recon_bridge(uuid,jsonb,int8,int8,int4,int4,text,bool,timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_audit_ready_recon_bridge(uuid,jsonb,int8,int8,int4,int4,text,bool,timestamptz) TO service_role;
-- disposition public.clear_audit_ready_recon_bridge(uuid) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.clear_audit_ready_recon_bridge(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clear_audit_ready_recon_bridge(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.clear_audit_ready_recon_bridge(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.clear_audit_ready_recon_bridge(uuid) TO service_role;
-- disposition public.trg_arte_stamp_run_identity() => trigger_only
REVOKE EXECUTE ON FUNCTION public.trg_arte_stamp_run_identity() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_arte_stamp_run_identity() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_arte_stamp_run_identity() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_arte_stamp_run_identity() FROM service_role;
-- disposition public.accounting_measurement_snapshots_deny_update() => trigger_only
REVOKE EXECUTE ON FUNCTION public.accounting_measurement_snapshots_deny_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accounting_measurement_snapshots_deny_update() FROM anon;
REVOKE EXECUTE ON FUNCTION public.accounting_measurement_snapshots_deny_update() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.accounting_measurement_snapshots_deny_update() FROM service_role;
-- disposition public.continuous_close_runs_deny_mutation() => trigger_only
REVOKE EXECUTE ON FUNCTION public.continuous_close_runs_deny_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.continuous_close_runs_deny_mutation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.continuous_close_runs_deny_mutation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.continuous_close_runs_deny_mutation() FROM service_role;
-- disposition public.persist_continuous_close_observe_run(jsonb,jsonb,text,uuid,uuid,uuid,text,text) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.persist_continuous_close_observe_run(jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.persist_continuous_close_observe_run(jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.persist_continuous_close_observe_run(jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_continuous_close_observe_run(jsonb,jsonb,text,uuid,uuid,uuid,text,text) TO service_role;
-- disposition public.journal_entry_proposals_deny_mutation() => trigger_only
REVOKE EXECUTE ON FUNCTION public.journal_entry_proposals_deny_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.journal_entry_proposals_deny_mutation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.journal_entry_proposals_deny_mutation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.journal_entry_proposals_deny_mutation() FROM service_role;
-- disposition public.persist_journal_entry_proposal(jsonb,jsonb,text,uuid,uuid,uuid,text,text) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.persist_journal_entry_proposal(jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.persist_journal_entry_proposal(jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.persist_journal_entry_proposal(jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_journal_entry_proposal(jsonb,jsonb,text,uuid,uuid,uuid,text,text) TO service_role;
-- disposition public.journal_entry_approvals_deny_mutation() => trigger_only
REVOKE EXECUTE ON FUNCTION public.journal_entry_approvals_deny_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.journal_entry_approvals_deny_mutation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.journal_entry_approvals_deny_mutation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.journal_entry_approvals_deny_mutation() FROM service_role;
-- disposition public.persist_journal_entry_approval(jsonb,text,jsonb,text,uuid,uuid,uuid,text,text) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.persist_journal_entry_approval(jsonb,text,jsonb,text,uuid,uuid,uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.persist_journal_entry_approval(jsonb,text,jsonb,text,uuid,uuid,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.persist_journal_entry_approval(jsonb,text,jsonb,text,uuid,uuid,uuid,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_journal_entry_approval(jsonb,text,jsonb,text,uuid,uuid,uuid,text,text) TO service_role;
COMMIT;
