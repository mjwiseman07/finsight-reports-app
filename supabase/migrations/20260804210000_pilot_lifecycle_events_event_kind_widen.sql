-- Phase MEM-LIFECYCLE Block 3.5 — widen event_kind CHECK, make to_status
-- nullable for assertion-evidence-attached events.
--
-- Idempotent. Preserves chain integrity — no row_hash / prev_hash / chain_seq
-- touched. NO backfill of shim rows: event_kind, to_status, and payload are
-- all fields of pilot_lifecycle_events_canonical_payload (hash inputs).
-- Rewriting them would break verify_chain. Historical Block 3 shim rows stay
-- as transition + payload.ssot_event_kind artifacts; only forward writes flip.

-- ---------------------------------------------------------------------------
-- Step 1: Widen the event_kind CHECK.
-- ---------------------------------------------------------------------------

ALTER TABLE public.pilot_lifecycle_events
  DROP CONSTRAINT IF EXISTS pilot_lifecycle_events_event_kind_chk;

ALTER TABLE public.pilot_lifecycle_events
  ADD CONSTRAINT pilot_lifecycle_events_event_kind_chk
  CHECK (event_kind IN (
    'pilot.lifecycle.transition',
    'pilot.lifecycle.drift-detected',
    'pilot.lifecycle.auto-reconciled',
    'pilot.lifecycle.escalated',
    'pilot.lifecycle.recurred',
    -- New in Block 3.5:
    'pilot.lifecycle.created',
    'pilot.lifecycle.assertion.evidence-attached'
  ));

-- ---------------------------------------------------------------------------
-- Step 2: Make to_status nullable, but ONLY for evidence-attached events.
-- Everything else remains effectively NOT NULL via the scope-tight CHECK.
-- ---------------------------------------------------------------------------

ALTER TABLE public.pilot_lifecycle_events
  ALTER COLUMN to_status DROP NOT NULL;

ALTER TABLE public.pilot_lifecycle_events
  DROP CONSTRAINT IF EXISTS pilot_lifecycle_events_to_status_scope_chk;

ALTER TABLE public.pilot_lifecycle_events
  ADD CONSTRAINT pilot_lifecycle_events_to_status_scope_chk
  CHECK (
    -- Evidence-attached: to_status MAY be NULL (no state change).
    (event_kind = 'pilot.lifecycle.assertion.evidence-attached')
    OR
    -- Everything else: to_status MUST be non-null.
    (to_status IS NOT NULL)
  );

COMMENT ON CONSTRAINT pilot_lifecycle_events_to_status_scope_chk
  ON public.pilot_lifecycle_events IS
  'to_status may be NULL only for pilot.lifecycle.assertion.evidence-attached rows (no state change). Block 3.5.';

-- ---------------------------------------------------------------------------
-- Step 3: Refresh column comment on event_kind.
-- ---------------------------------------------------------------------------

COMMENT ON COLUMN public.pilot_lifecycle_events.event_kind IS
  'One of: pilot.lifecycle.{transition,drift-detected,auto-reconciled,escalated,recurred,created,assertion.evidence-attached}. Widened in Block 3.5.';
