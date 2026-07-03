-- Phase D6.0: Vertical Rule Execution Foundation
-- Idempotent. Safe to re-run.
--
-- DRIFT RESOLUTION (vs the D6.0 paste spec, reconciled against live schema):
--   * FK targets corrected to real PKs:
--       firm_clients(id)            [not firm_client_id]
--       recurring_fires(fire_id)    [not recurring_fire_id]
--       company_memory_records(memory_id) [not memory_record_id]
--     uncategorized_proposals(proposal_id) was already correct.
--   * curated_rules_registry already exists (D0 migration
--     20260708_00_d0_identity_and_memory_activation.sql) with a different
--     column set than the paste assumed. The seed below maps the 24 rules onto
--     the REAL columns: rule_name, vertical, severity, logic_file_path,
--     description, applies_to_cash_basis, applies_to_accrual_basis, is_active,
--     version. enabled_default=false -> is_active=false. ON CONFLICT (rule_id).
--   * This file is a NEW migration; it does not edit any *_d5_*.sql file.
begin;

-- 1. Kill switch column on firm_clients
alter table firm_clients
  add column if not exists vertical_rules_enabled boolean not null default true;
comment on column firm_clients.vertical_rules_enabled is
  'D6.0 kill switch. When false, vertical rule engine skips this client entirely and recurring fires get status=vertical_blocked.';

-- 2. Extend recurring_fires.status to include vertical_blocked.
--    The D5.0 inline column check is auto-named recurring_fires_status_check.
alter table recurring_fires
  drop constraint if exists recurring_fires_status_check;
alter table recurring_fires
  add constraint recurring_fires_status_check
  check (status in ('proposed','posted','skipped','rejected','failed','cash_basis','vertical_blocked'));

-- 3. curated_rule_fires (append-only audit of every rule evaluation that fired)
create table if not exists curated_rule_fires (
  fire_id                 uuid primary key default gen_random_uuid(),
  firm_client_id          uuid not null references firm_clients(id) on delete cascade,
  rule_id                 text not null,
  rule_version            integer not null,
  proposal_id             uuid null references uncategorized_proposals(proposal_id) on delete set null,
  recurring_fire_id       uuid null references recurring_fires(fire_id) on delete set null,
  target_type             text not null check (target_type in ('transaction','account','period','vendor','customer','item','contract','project','other')),
  target_ref              text not null,
  inputs_hash             text not null,
  outcome                 text not null check (outcome in ('fired','suppressed','error','not_implemented')),
  reason_code             text not null,
  reason_detail           jsonb not null default '{}'::jsonb,
  severity_applied        text not null check (severity_applied in ('info','warning','error','critical')),
  memory_record_id        uuid null references company_memory_records(memory_id) on delete set null,
  reviewer_user_id        uuid null references auth.users(id) on delete set null,
  reviewer_action         text null check (reviewer_action in ('accepted','dismissed','escalated','override','pending')),
  reviewer_action_at      timestamptz null,
  created_at              timestamptz not null default now()
);
comment on table curated_rule_fires is
  'D6.0 append-only audit trail. Every vertical rule evaluation that fires (or errors) writes exactly one row. Immutable except reviewer_action fields.';

-- Indexes
create index if not exists curated_rule_fires_client_created_idx
  on curated_rule_fires (firm_client_id, created_at desc);
create index if not exists curated_rule_fires_rule_idx
  on curated_rule_fires (rule_id, rule_version);
create index if not exists curated_rule_fires_proposal_idx
  on curated_rule_fires (proposal_id) where proposal_id is not null;
create index if not exists curated_rule_fires_recurring_idx
  on curated_rule_fires (recurring_fire_id) where recurring_fire_id is not null;
create unique index if not exists curated_rule_fires_dedup_idx
  on curated_rule_fires (firm_client_id, rule_id, target_type, target_ref, inputs_hash);

-- Immutability trigger — only reviewer_* fields can change post-insert
create or replace function curated_rule_fires_immutable()
returns trigger language plpgsql as $$
begin
  if (
    new.fire_id            is distinct from old.fire_id            or
    new.firm_client_id     is distinct from old.firm_client_id     or
    new.rule_id            is distinct from old.rule_id            or
    new.rule_version       is distinct from old.rule_version       or
    new.proposal_id        is distinct from old.proposal_id        or
    new.recurring_fire_id  is distinct from old.recurring_fire_id  or
    new.target_type        is distinct from old.target_type        or
    new.target_ref         is distinct from old.target_ref         or
    new.inputs_hash        is distinct from old.inputs_hash        or
    new.outcome            is distinct from old.outcome            or
    new.reason_code        is distinct from old.reason_code        or
    new.reason_detail      is distinct from old.reason_detail      or
    new.severity_applied   is distinct from old.severity_applied   or
    new.memory_record_id   is distinct from old.memory_record_id   or
    new.created_at         is distinct from old.created_at
  ) then
    raise exception 'curated_rule_fires is append-only; only reviewer_* fields are mutable (fire_id=%)', old.fire_id;
  end if;
  return new;
end $$;

drop trigger if exists curated_rule_fires_immutable_trg on curated_rule_fires;
create trigger curated_rule_fires_immutable_trg
  before update on curated_rule_fires
  for each row execute function curated_rule_fires_immutable();

-- 4. Seed 24 new registry rows (all disabled: is_active=false; D6.2a-b enables
--    per client). Mapped to the REAL curated_rules_registry columns.
--    applies_to_cash_basis is true only where the rule's method scope included
--    'cash'; every rule supports accrual (and modified_cash, which the D0
--    execution service does not gate on either boolean).
insert into curated_rules_registry
  (rule_id, rule_name, rule_category, vertical, severity, logic_file_path, description,
   applies_to_cash_basis, applies_to_accrual_basis, requires_history_months, is_active, version)
values
  -- General expansion (4)
  ('gen.accrual_reversal_check',        'Accrual Reversal Check',       'accrual_check',       'general', 'warning', 'lib/rules/logic/general/accrual_reversal_check.ts',        'Detect missing reversing entry for prior-period accrual.', false, true, 0, false, 1),
  ('gen.gl_mapping_variance_check',     'GL Mapping Variance',          'anomaly_detection',   'general', 'info',    'lib/rules/logic/general/gl_mapping_variance_check.ts',     'Flag transactions whose vendor/GL mapping differs from learned pattern.', true, true, 0, false, 1),
  ('gen.subledger_tie_check',           'Subledger Tie-Out',            'balance_check',       'general', 'error',   'lib/rules/logic/general/subledger_tie_check.ts',           'Compare AR/AP subledger totals to GL control accounts.', false, true, 0, false, 1),
  ('gen.reversing_entry_period_check',  'Reversing Entry Period Check', 'period_check',        'general', 'warning', 'lib/rules/logic/general/reversing_entry_period_check.ts',  'Confirm reversing JE posts to correct period.', false, true, 0, false, 1),
  -- Manufacturing (8)
  ('mfg.wip_cutoff_check',                    'WIP Cutoff Check',             'period_check',      'manufacturing', 'error',   'lib/rules/logic/manufacturing/wip_cutoff_check.ts',                    'Flag production activity crossing period boundaries.', false, true, 0, false, 1),
  ('mfg.cogs_variance_check',                 'COGS Variance',                'anomaly_detection', 'manufacturing', 'warning', 'lib/rules/logic/manufacturing/cogs_variance_check.ts',                 'Detect COGS variance vs standard cost.', false, true, 0, false, 1),
  ('mfg.inventory_reconciliation_check',      'Inventory Reconciliation',     'balance_check',     'manufacturing', 'error',   'lib/rules/logic/manufacturing/inventory_reconciliation_check.ts',      'Sub-ledger vs GL inventory tie-out.', false, true, 0, false, 1),
  ('mfg.standard_cost_capitalization_check',  'Standard Cost Capitalization', 'anomaly_detection', 'manufacturing', 'warning', 'lib/rules/logic/manufacturing/standard_cost_capitalization_check.ts',  'Verify labor/OH capitalized to WIP correctly.', false, true, 0, false, 1),
  ('mfg.freight_capitalization_check',        'Freight Capitalization',       'anomaly_detection', 'manufacturing', 'info',    'lib/rules/logic/manufacturing/freight_capitalization_check.ts',        'Inbound freight capitalized to inventory, not expensed.', false, true, 0, false, 1),
  ('mfg.warranty_accrual_check',              'Warranty Accrual',             'accrual_check',     'manufacturing', 'warning', 'lib/rules/logic/manufacturing/warranty_accrual_check.ts',              'Warranty reserve movement vs sales.', false, true, 0, false, 1),
  ('mfg.scrap_variance_check',                'Scrap Variance',               'anomaly_detection', 'manufacturing', 'info',    'lib/rules/logic/manufacturing/scrap_variance_check.ts',                'Scrap posted outside expected range.', false, true, 0, false, 1),
  ('mfg.absorption_check',                    'Overhead Absorption',          'anomaly_detection', 'manufacturing', 'warning', 'lib/rules/logic/manufacturing/absorption_check.ts',                    'Under/over-absorption of manufacturing overhead.', false, true, 0, false, 1),
  -- Retail (6)
  ('rtl.inventory_shrink_check',        'Inventory Shrink',        'anomaly_detection',   'retail', 'warning', 'lib/rules/logic/retail/inventory_shrink_check.ts',        'Shrinkage exceeds threshold.', false, true, 0, false, 1),
  ('rtl.cogs_recognition_check',        'COGS Recognition Timing', 'revenue_recognition', 'retail', 'error',   'lib/rules/logic/retail/cogs_recognition_check.ts',        'COGS recognized alongside matched revenue.', false, true, 0, false, 1),
  ('rtl.gift_card_liability_check',     'Gift Card Liability',     'balance_check',       'retail', 'warning', 'lib/rules/logic/retail/gift_card_liability_check.ts',     'Gift card liability movement + breakage.', false, true, 0, false, 1),
  ('rtl.sales_returns_reserve_check',   'Sales Returns Reserve',   'accrual_check',       'retail', 'warning', 'lib/rules/logic/retail/sales_returns_reserve_check.ts',   'Returns reserve vs historical rate.', false, true, 0, false, 1),
  ('rtl.loyalty_reward_liability_check','Loyalty Reward Liability','balance_check',       'retail', 'info',    'lib/rules/logic/retail/loyalty_reward_liability_check.ts','Loyalty deferred revenue movement.', false, true, 0, false, 1),
  ('rtl.seasonal_markdown_check',       'Seasonal Markdown',       'anomaly_detection',   'retail', 'info',    'lib/rules/logic/retail/seasonal_markdown_check.ts',       'Markdown timing vs seasonal calendar.', false, true, 0, false, 1),
  -- Professional Services (6)
  ('ps.wip_billable_hours_check',       'WIP Billable Hours',       'balance_check',       'professional_services', 'warning', 'lib/rules/logic/professional_services/wip_billable_hours_check.ts',       'Unbilled WIP hours vs project stage.', false, true, 0, false, 1),
  ('ps.revenue_percent_complete_check', 'Revenue Percent Complete', 'revenue_recognition', 'professional_services', 'error',   'lib/rules/logic/professional_services/revenue_percent_complete_check.ts', 'POC revenue vs cost incurred.', false, true, 0, false, 1),
  ('ps.unbilled_receivables_check',     'Unbilled Receivables',     'balance_check',       'professional_services', 'warning', 'lib/rules/logic/professional_services/unbilled_receivables_check.ts',     'Unbilled AR aging beyond threshold.', false, true, 0, false, 1),
  ('ps.contract_asset_reclass_check',   'Contract Asset Reclass',   'balance_check',       'professional_services', 'info',    'lib/rules/logic/professional_services/contract_asset_reclass_check.ts',   'Contract asset reclass to AR upon billing.', false, true, 0, false, 1),
  ('ps.project_margin_flag_check',      'Project Margin Flag',      'anomaly_detection',   'professional_services', 'warning', 'lib/rules/logic/professional_services/project_margin_flag_check.ts',      'Project margin below historical band.', false, true, 0, false, 1),
  ('ps.bill_rate_variance_check',       'Bill Rate Variance',       'anomaly_detection',   'professional_services', 'info',    'lib/rules/logic/professional_services/bill_rate_variance_check.ts',       'Realized bill rate vs contracted rate.', false, true, 0, false, 1)
on conflict (rule_id) do nothing;

commit;
