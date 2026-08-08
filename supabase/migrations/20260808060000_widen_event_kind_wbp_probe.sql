-- WBP W0.5 — allow lifecycle emit for Preview sandbox probe findings.

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
    'pilot.lifecycle.wbp-probe-result'::text
  ]));

comment on constraint pilot_lifecycle_events_event_kind_chk on public.pilot_lifecycle_events is
  'WBP W0.5: wbp-probe-result added for Preview sandbox spike findings hash-chain.';
