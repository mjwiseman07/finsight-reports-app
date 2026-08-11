-- DASH_1B.3 v2 — extend event_kind whitelist with accounting-connection-connected.
-- disconnected already added in 20260807110000; this migration is additive and idempotent-safe.

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
    'pilot.lifecycle.accounting-connection-disconnected'::text
  ]));

comment on constraint pilot_lifecycle_events_event_kind_chk on public.pilot_lifecycle_events is
  'DASH_1B.3 v2: connection-connected + connection-disconnected allowed for connect/disconnect lifecycle memory.';
