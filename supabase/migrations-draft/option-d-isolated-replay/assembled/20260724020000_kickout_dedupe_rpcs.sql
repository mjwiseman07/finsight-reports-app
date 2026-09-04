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
