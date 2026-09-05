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
