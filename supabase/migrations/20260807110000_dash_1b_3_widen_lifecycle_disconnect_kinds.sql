-- Phase DASH_1B.3 — Widen lifecycle event_kind + actor_via for disconnect UX emit.
-- Additive only. Preserves all DASH_1B.2 / prior allowed values.

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
    'pilot.lifecycle.accounting-connection-disconnected'::text
  ]));

comment on constraint pilot_lifecycle_events_event_kind_chk on public.pilot_lifecycle_events is
  'DASH_1B.3: accounting-connection-disconnected added for Disconnect UX lifecycle memory.';

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

comment on constraint pilot_lifecycle_events_actor_via_chk on public.pilot_lifecycle_events is
  'DASH_1B.3: user-initiated added for dashboard Disconnect lifecycle emits.';
