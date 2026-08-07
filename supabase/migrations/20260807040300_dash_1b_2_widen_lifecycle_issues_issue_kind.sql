-- Phase DASH_1B.2 — Widen lifecycle_issues.issue_kind for sync-drift entries.
-- Verified live CHECK 2026-08-07 against jzmdgwwiestcmmeuhhkr: keep ALL existing
-- MAJOR #2 / #2.1 / #2.2 kinds and ADD only the three accounting-sync.* values.
-- Do NOT drop values the app already writes.

do $$
declare
  cur_def text;
begin
  select pg_get_constraintdef(c.oid) into cur_def
  from pg_constraint c
  where c.conrelid = 'public.lifecycle_issues'::regclass
    and c.conname = 'lifecycle_issues_issue_kind_chk';

  if cur_def is null then
    raise notice 'lifecycle_issues_issue_kind_chk not present — skipping widen (nothing to relax).';
    return;
  end if;
end $$;

alter table public.lifecycle_issues
  drop constraint if exists lifecycle_issues_issue_kind_chk;

alter table public.lifecycle_issues
  add constraint lifecycle_issues_issue_kind_chk
  check (issue_kind = any (array[
    -- Existing (live 2026-08-07)
    'pilot.lifecycle.drift.detected'::text,
    'pilot.lifecycle.transition.rejected'::text,
    'pilot.lifecycle.chain.integrity.broken'::text,
    'pilot.lifecycle.monitor.error'::text,
    'pilot.lifecycle.chain.anchor'::text,
    'marketing.seo.drift'::text,
    'schema_drift'::text,
    'schema_drift_detector_degraded'::text,
    'schema_drift_scanner_ambiguous_column'::text,
    'schema_drift_scanner_unable_to_classify'::text,
    'schema_drift_accepted_baseline'::text,
    -- DASH_1B.2 additions
    'accounting-sync.failed'::text,
    'accounting-sync.stale'::text,
    'accounting-sync.schema-drift'::text
  ]));

comment on constraint lifecycle_issues_issue_kind_chk on public.lifecycle_issues is
  'DASH_1B.2: accounting-sync.{failed,stale,schema-drift} added for schema-drift detector output. Preserves MAJOR #2.x kinds.';
