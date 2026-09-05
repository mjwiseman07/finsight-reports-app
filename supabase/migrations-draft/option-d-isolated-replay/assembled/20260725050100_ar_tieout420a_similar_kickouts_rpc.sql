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
