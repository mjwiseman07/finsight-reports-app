-- Phase DASH_1B.2 — Widen pilot_lifecycle_events.event_kind to include accounting-sync events.
-- Precedent: 20260806031500 (MAJOR #2.2 CHECK DROP + RECREATE).

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
    'pilot.lifecycle.accounting-sync-failed'::text
  ]));

comment on constraint pilot_lifecycle_events_event_kind_chk on public.pilot_lifecycle_events is
  'DASH_1B.2: accounting-sync-completed / accounting-sync-failed added for Option B single-chain anchor.';
