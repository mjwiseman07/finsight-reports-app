-- Phase DASH_1B.2 — Widen pilot_lifecycle_events.actor_via to include 'accounting-sync'.

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
    'accounting-sync'::text
  ]));

comment on constraint pilot_lifecycle_events_actor_via_chk on public.pilot_lifecycle_events is
  'DASH_1B.2: accounting-sync added as caller channel for lifecycle events emitted from lib/integrations/accounting/service.ts.';
