-- WBP W1a — Widen pilot_lifecycle_events.event_kind for write-boundary events.
-- Adds 6 new kinds emitted by lib/accounting/write-boundary (built in W1b, wired in W1c):
--   * pilot.lifecycle.write-validated       — pre-flight passed
--   * pilot.lifecycle.write-rejected        — pre-flight failed; never hit provider
--   * pilot.lifecycle.write-posted          — provider returned 200, no drift
--   * pilot.lifecycle.write-drifted         — provider returned 200 but response differs from request (W0.5 finding 3A silent-strip)
--   * pilot.lifecycle.write-void-succeeded  — auto-void of drifted DRAFT succeeded
--   * pilot.lifecycle.write-failed          — provider returned 4xx/5xx
--
-- Precedent: 20260808060000_widen_event_kind_wbp_probe.sql (WBP W0.5).
-- Additive only. Preserves all prior 13 allowed values.

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
    'pilot.lifecycle.write-failed'::text
  ]));

comment on constraint pilot_lifecycle_events_event_kind_chk on public.pilot_lifecycle_events is
  'WBP W1a: 6 write-boundary event kinds added (write-{validated,rejected,posted,drifted,void-succeeded,failed}) for hash-chained evidence of every automated write. Emitted by lib/accounting/write-boundary (W1b).';
