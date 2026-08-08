-- WBP W1c.4a — Add "pilot.lifecycle.cache-refreshed" to the pilot_lifecycle_events
-- event_kind CHECK constraint. Extends the 19-kind vocabulary shipped in
-- 20260808070100_wbp_w1a_widen_write_event_kinds.sql.
--
-- Constraint name and form (= any (array[...])) preserved verbatim from source
-- migration to keep pg_get_constraintdef output consistent.

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

comment on constraint pilot_lifecycle_events_event_kind_chk
  on public.pilot_lifecycle_events is
  'WBP W1c.4a: extended 2026-08-08 to include cache-refreshed (20 kinds).';
