-- =============================================================================
-- D-Assertions Part 2 — close_assertion_coverage projection + gap reasoning
-- =============================================================================
-- Adds:
--   1. advisacor_flags                     — global feature-flag table (creates if missing)
--   2. assertion_gap_root_causes           — enum + descriptions (PCAOB QC 1000 pattern)
--   3. close_assertion_coverage            — per-close × account_category × assertion projection
--   4. close_assertion_coverage_events     — event-sourced audit trail
--   5. Widens ai_action_log_action_category_check (idempotent — Part 1 already added
--      'assertion_coverage_scan' and 'assertion_gap_reasoning')
--   6. Widens ledger_events_event_category_check (idempotent — 'assertion' already present)
--   7. Seeds root-cause taxonomy
--   8. Seeds default flag rows (assertions_gap_reasoning_enabled = false)
-- =============================================================================
begin;
-- ---------------------------------------------------------------------------
-- 1. advisacor_flags — global feature flags (create if not exists)
-- ---------------------------------------------------------------------------
create table if not exists public.advisacor_flags (
  flag_key      text primary key,
  flag_value    boolean not null default false,
  description   text not null,
  updated_at    timestamptz not null default now(),
  updated_by    text
);
comment on table public.advisacor_flags is
  'Global feature flags. Read via lib/flags. Do not add per-firm flags here — use client-level tables for that.';
alter table public.advisacor_flags enable row level security;
drop policy if exists "advisacor_flags_service_role_all" on public.advisacor_flags;
create policy "advisacor_flags_service_role_all"
  on public.advisacor_flags for all to service_role using (true) with check (true);
drop policy if exists "advisacor_flags_authenticated_read" on public.advisacor_flags;
create policy "advisacor_flags_authenticated_read"
  on public.advisacor_flags for select to authenticated using (true);
insert into public.advisacor_flags (flag_key, flag_value, description)
values
  ('assertions_gap_reasoning_enabled', false,
   'When true, close_assertion_coverage gap rows call the LLM gap reasoner. When false, gaps get deterministic status only. Flip to true after Bedrock model access is approved.'),
  ('assertions_projection_worker_enabled', true,
   'When true, POST /assertion-coverage/recompute actually runs the projection. Set to false to hard-disable while investigating a bad projection.')
on conflict (flag_key) do nothing;
-- ---------------------------------------------------------------------------
-- 2. assertion_gap_root_causes — enum-driven taxonomy
-- ---------------------------------------------------------------------------
create table if not exists public.assertion_gap_root_causes (
  root_cause_code    text primary key,
  display_name       text not null,
  description        text not null,
  pcaob_reference    text not null,
  version            integer not null default 1,
  created_at         timestamptz not null default now()
);
comment on table public.assertion_gap_root_causes is
  'Root cause taxonomy for assertion coverage gaps. Mirrors PCAOB QC 1000 root-cause-analysis pattern. LLM reasoner selects from this closed set.';
alter table public.assertion_gap_root_causes enable row level security;
drop policy if exists "assertion_gap_root_causes_service_role_all" on public.assertion_gap_root_causes;
create policy "assertion_gap_root_causes_service_role_all"
  on public.assertion_gap_root_causes for all to service_role using (true) with check (true);
drop policy if exists "assertion_gap_root_causes_authenticated_read" on public.assertion_gap_root_causes;
create policy "assertion_gap_root_causes_authenticated_read"
  on public.assertion_gap_root_causes for select to authenticated using (true);
insert into public.assertion_gap_root_causes
  (root_cause_code, display_name, description, pcaob_reference)
values
  ('no_rule_defined',
   'No rule defined for this assertion × account category',
   'The curated rule registry does not contain any rule that covers this account_category × assertion pair. This is a coverage design gap, not an execution gap.',
   'PCAOB QC 1000 §.15 (root cause: system design)'),
  ('rule_defined_but_not_fired',
   'Rule exists but did not fire this period',
   'A rule tagged with this assertion exists in the registry but produced no fires with outcome=fired for this close period. Possible causes: rule was suppressed, all instances were within threshold, or the underlying data pattern did not trigger.',
   'PCAOB QC 1000 §.15 (root cause: system operation)'),
  ('rule_fired_but_all_suppressed',
   'Rule fired but all fires were suppressed',
   'At least one fire exists but every fire has outcome=suppressed. Coverage is nominal, not substantive.',
   'PCAOB QC 1000 §.15 (root cause: threshold calibration)'),
  ('rule_errored',
   'Rule errored during execution',
   'The rule attempted to run but encountered an execution error. Coverage cannot be claimed until the rule executes successfully.',
   'PCAOB QC 1000 §.15 (root cause: system reliability)'),
  ('assertion_not_relevant',
   'Assertion is not relevant for this account category',
   'The relevance matrix marks this pair as not_applicable or usually_not_primary. No gap remediation needed.',
   'ISA 315 (Revised 2019) ¶A128'),
  ('coverage_partial_by_design',
   'Coverage is partial by design (secondary tag only)',
   'The only rules covering this pair tag the assertion as secondary. This is intentional partial coverage; upgrade the tag or add a primary-tagged rule to strengthen.',
   'ISA 330 ¶7'),
  ('manual_test_documented',
   'Coverage came from a documented manual test',
   'A reviewer attached a manual test workpaper reference. This is an accepted coverage path when automation is not feasible.',
   'PCAOB AS 2301 ¶08')
on conflict (root_cause_code) do nothing;
-- ---------------------------------------------------------------------------
-- 3. close_assertion_coverage — per-close × account_category × assertion projection
-- ---------------------------------------------------------------------------
create table if not exists public.close_assertion_coverage (
  coverage_id                     uuid primary key default gen_random_uuid(),
  firm_client_id                  uuid not null references public.firm_clients(id) on delete cascade,
  close_period_id                 uuid not null references public.close_periods(id) on delete cascade,
  account_category                text not null
                                    check (account_category in (
                                      'cash','accounts_receivable','inventory','fixed_assets',
                                      'other_current_assets','other_non_current_assets',
                                      'accounts_payable','accrued_liabilities','other_current_liabilities',
                                      'long_term_debt','equity','revenue','cost_of_goods_sold',
                                      'operating_expenses','other_income_expense','tax_expense',
                                      'off_balance_sheet','disclosure_only'
                                    )),
  assertion_id                    text not null
                                    references public.assertions_catalog(assertion_id),
  relevance_at_computation        text not null
                                    check (relevance_at_computation in (
                                      'relevant','usually_not_primary','not_applicable'
                                    )),
  coverage_status                 text not null
                                    check (coverage_status in (
                                      'tested','partial','gap','not_applicable'
                                    )),
  covering_rule_ids               text[] not null default '{}',
  covering_fire_ids               uuid[] not null default '{}',
  evidence_strength               text not null default 'unassessed'
                                    check (evidence_strength in (
                                      'strong','moderate','weak','unassessed'
                                    )),
  data_source_reliability_basis   text,
  manual_test_ref                 text,
  gap_root_cause_code             text
                                    references public.assertion_gap_root_causes(root_cause_code),
  gap_reasoning_action_id         uuid
                                    references public.ai_action_log(action_id),
  gap_recommendation              text,
  computed_at                     timestamptz not null default now(),
  computed_by_worker_run_id       uuid,
  version                         integer not null default 1,
  updated_at                      timestamptz not null default now(),
  constraint close_assertion_coverage_unique
    unique (firm_client_id, close_period_id, account_category, assertion_id),
  constraint close_assertion_coverage_gap_needs_root_cause
    check (coverage_status <> 'gap' or gap_root_cause_code is not null)
);
comment on table public.close_assertion_coverage is
  'Projection: per-close × account_category × assertion coverage status. Recompute-safe (unique key). Gaps must carry a root_cause_code.';
create index if not exists close_assertion_coverage_by_close
  on public.close_assertion_coverage (firm_client_id, close_period_id);
create index if not exists close_assertion_coverage_gaps
  on public.close_assertion_coverage (firm_client_id, close_period_id)
  where coverage_status = 'gap';
alter table public.close_assertion_coverage enable row level security;
drop policy if exists "close_assertion_coverage_service_role_all" on public.close_assertion_coverage;
create policy "close_assertion_coverage_service_role_all"
  on public.close_assertion_coverage for all to service_role using (true) with check (true);
drop policy if exists "close_assertion_coverage_firm_read" on public.close_assertion_coverage;
create policy "close_assertion_coverage_firm_read"
  on public.close_assertion_coverage for select to authenticated
  using (
    exists (
      select 1
      from public.firm_clients fc
      join public.firm_memberships fm on fm.firm_id = fc.firm_id
      where fc.id = close_assertion_coverage.firm_client_id
        and fm.user_id = auth.uid()
        and fm.status = 'active'
    )
  );
-- ---------------------------------------------------------------------------
-- 4. close_assertion_coverage_events — event-sourced audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.close_assertion_coverage_events (
  event_id                  uuid primary key default gen_random_uuid(),
  firm_client_id            uuid not null references public.firm_clients(id) on delete cascade,
  close_period_id           uuid not null references public.close_periods(id) on delete cascade,
  worker_run_id             uuid not null,
  event_type                text not null
                              check (event_type in (
                                'projection_started',
                                'projection_completed',
                                'projection_failed',
                                'gap_detected',
                                'gap_reasoner_invoked',
                                'gap_reasoner_completed',
                                'gap_reasoner_skipped_flag_off',
                                'gap_reasoner_failed',
                                'manual_override_applied'
                              )),
  account_category          text,
  assertion_id              text,
  payload                   jsonb not null default '{}'::jsonb,
  actor_type                text not null default 'system'
                              check (actor_type in ('system','user')),
  actor_id                  text,
  linked_action_id          uuid references public.ai_action_log(action_id),
  correlation_id            uuid,
  occurred_at               timestamptz not null default now()
);
comment on table public.close_assertion_coverage_events is
  'Event-sourced audit trail for coverage projections. Every recompute writes projection_started + projection_completed, plus gap_detected per gap. LLM reasoner path writes gap_reasoner_* events. Survives projection rebuild.';
create index if not exists close_assertion_coverage_events_by_close
  on public.close_assertion_coverage_events (firm_client_id, close_period_id, occurred_at desc);
create index if not exists close_assertion_coverage_events_by_worker_run
  on public.close_assertion_coverage_events (worker_run_id);
alter table public.close_assertion_coverage_events enable row level security;
drop policy if exists "cac_events_service_role_all" on public.close_assertion_coverage_events;
create policy "cac_events_service_role_all"
  on public.close_assertion_coverage_events for all to service_role using (true) with check (true);
drop policy if exists "cac_events_firm_read" on public.close_assertion_coverage_events;
create policy "cac_events_firm_read"
  on public.close_assertion_coverage_events for select to authenticated
  using (
    exists (
      select 1
      from public.firm_clients fc
      join public.firm_memberships fm on fm.firm_id = fc.firm_id
      where fc.id = close_assertion_coverage_events.firm_client_id
        and fm.user_id = auth.uid()
        and fm.status = 'active'
    )
  );
-- ---------------------------------------------------------------------------
-- 5. Widen ai_action_log_action_category_check (idempotent)
-- ---------------------------------------------------------------------------
do $$
declare
  cur_def text;
begin
  select pg_get_constraintdef(oid) into cur_def
  from pg_constraint
  where conname = 'ai_action_log_action_category_check';
  if cur_def is null or cur_def not like '%assertion_coverage_scan%' or cur_def not like '%assertion_gap_reasoning%' then
    raise exception 'ai_action_log_action_category_check missing Part 1 widenings; Part 2 refusing to run';
  end if;
end$$;
-- ---------------------------------------------------------------------------
-- 6. Widen ledger_events_event_category_check (idempotent)
-- ---------------------------------------------------------------------------
do $$
declare
  cur_def text;
begin
  select pg_get_constraintdef(oid) into cur_def
  from pg_constraint
  where conname = 'ledger_events_event_category_check';
  if cur_def is null or cur_def not like '%assertion%' then
    raise exception 'ledger_events_event_category_check missing assertion category; Part 2 refusing to run';
  end if;
end$$;
commit;
