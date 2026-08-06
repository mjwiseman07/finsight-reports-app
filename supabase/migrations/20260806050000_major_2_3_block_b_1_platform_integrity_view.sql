-- MAJOR #2.3 Block B.1 — Platform Integrity read view.
--
-- Ships a SECURITY INVOKER view over lifecycle_issues + pilot_lifecycle_events
-- for the customer-facing Platform Integrity surface. RLS applies naturally.
--
-- Design:
--   * Columns are the exact fields Block B.2's card component renders.
--   * mapping_source stays as the enum-ish text — the API route converts to
--     citation URL server-side (single source of truth).
--   * chain_intact/chain_gap_count come from pilot_lifecycle_events, computed
--     per firm_id. If the firm has no lifecycle events yet, chain_intact = true
--     and chain_gap_count = 0 (safe default).
--
-- Rollback: DROP VIEW public.v_platform_integrity_current;

BEGIN;

CREATE OR REPLACE VIEW public.v_platform_integrity_current
WITH (security_invoker = true) AS
SELECT
  li.id,
  li.detected_at,
  li.fingerprint,
  li.issue_kind,
  li.level,
  li.firm_id,
  li.company_id,
  li.tags,
  li.tags->>'table' AS drift_table,
  li.tags->>'column_name' AS drift_column,
  li.tags->>'reason' AS drift_reason,
  li.extra->'assertion_impact' AS assertion_impact,
  li.extra->>'assertion_confidence' AS assertion_confidence,
  li.extra->>'financial_reporting_relevance' AS financial_reporting_relevance,
  li.extra->>'mapping_source' AS mapping_source,
  li.extra->>'detector_version' AS detector_version
FROM public.lifecycle_issues li
WHERE li.issue_kind LIKE 'schema_drift%'
  AND li.extra->'assertion_impact' IS NOT NULL
  AND li.extra->>'assertion_confidence' IS NOT NULL
  AND li.extra->>'financial_reporting_relevance' IS NOT NULL
  AND li.extra->>'mapping_source' IS NOT NULL;

COMMENT ON VIEW public.v_platform_integrity_current IS
  'MAJOR #2.3 Block B.1 — customer-facing read view for the Platform Integrity surface. SECURITY INVOKER: caller RLS on lifecycle_issues applies. Filters to schema_drift* rows with all 4 A.1 assertion linkage fields populated. Rows missing any A.1 field are excluded (self-diagnostic — if this happens, investigate the trigger).';

GRANT SELECT ON public.v_platform_integrity_current TO authenticated;

-- ============================================================================
-- Companion helper: chain integrity summary (per firm)
-- ============================================================================
--
-- Reads pilot_lifecycle_events (Phase MEM_LIFECYCLE Block 2 hash chain).
-- Returns whether the chain is intact for a given firm_id.
--
-- Safe defaults: firm with no events → intact, 0 gaps.

CREATE OR REPLACE FUNCTION public.platform_integrity_chain_status(p_firm_id uuid)
RETURNS TABLE (
  chain_intact boolean,
  chain_gap_count integer,
  latest_seq bigint,
  latest_event_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_expected_seq bigint;
  v_actual_max_seq bigint;
  v_row_count bigint;
BEGIN
  -- If pilot_lifecycle_events table doesn't exist (older env), return safe default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pilot_lifecycle_events'
  ) THEN
    chain_intact := true;
    chain_gap_count := 0;
    latest_seq := NULL;
    latest_event_at := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Query the chain for this firm.
  -- Column is chain_seq (not seq) — MEM_LIFECYCLE Block 2 hash-chain table.
  SELECT
    COUNT(*),
    COALESCE(MAX(chain_seq), 0),
    MAX(created_at)
  INTO v_row_count, v_actual_max_seq, latest_event_at
  FROM public.pilot_lifecycle_events
  WHERE firm_id = p_firm_id;

  latest_seq := v_actual_max_seq;

  IF v_row_count = 0 THEN
    -- No events yet — intact by default
    chain_intact := true;
    chain_gap_count := 0;
  ELSE
    -- If max(chain_seq) != count, there is a gap
    IF v_actual_max_seq = v_row_count THEN
      chain_intact := true;
      chain_gap_count := 0;
    ELSE
      chain_intact := false;
      chain_gap_count := (v_actual_max_seq - v_row_count)::integer;
    END IF;
  END IF;

  RETURN NEXT;
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.platform_integrity_chain_status(uuid) IS
  'MAJOR #2.3 Block B.1 — returns chain intact/gap summary for a firm from pilot_lifecycle_events. Safe defaults when table missing or firm has no events.';

REVOKE ALL ON FUNCTION public.platform_integrity_chain_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_integrity_chain_status(uuid) TO authenticated;

-- ============================================================================
-- Self-verify
-- ============================================================================

DO $$
DECLARE
  v_view_rowcount bigint;
BEGIN
  SELECT COUNT(*) INTO v_view_rowcount FROM public.v_platform_integrity_current;
  RAISE NOTICE 'Block B.1 self-verify: v_platform_integrity_current returned % rows', v_view_rowcount;

  IF v_view_rowcount = 0 THEN
    RAISE WARNING 'Block B.1 view returned 0 rows. If lifecycle_issues has schema_drift* rows without all 4 A.1 fields, they were filtered out — investigate.';
  END IF;
END;
$$;

COMMIT;
