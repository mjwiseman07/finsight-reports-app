-- MAJOR #2.3 Block B.1 follow-up: pilot_lifecycle_events uses chain_seq, not seq.
-- Corrects platform_integrity_chain_status after the initial B.1 apply.

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
  v_actual_max_seq bigint;
  v_row_count bigint;
BEGIN
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

  SELECT
    COUNT(*),
    COALESCE(MAX(chain_seq), 0),
    MAX(created_at)
  INTO v_row_count, v_actual_max_seq, latest_event_at
  FROM public.pilot_lifecycle_events
  WHERE firm_id = p_firm_id;

  latest_seq := v_actual_max_seq;

  IF v_row_count = 0 THEN
    chain_intact := true;
    chain_gap_count := 0;
  ELSE
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
  'MAJOR #2.3 Block B.1 — returns chain intact/gap summary for a firm from pilot_lifecycle_events (uses chain_seq). Safe defaults when table missing or firm has no events.';
