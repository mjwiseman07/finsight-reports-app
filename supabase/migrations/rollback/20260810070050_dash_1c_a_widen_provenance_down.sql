-- Rollback DASH_1C Block A provenance widen — restore W1c.4a constraint sets.

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
    'pilot.lifecycle.cache-refreshed'::text
  ]));

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
    'user-initiated'::text
  ]));
