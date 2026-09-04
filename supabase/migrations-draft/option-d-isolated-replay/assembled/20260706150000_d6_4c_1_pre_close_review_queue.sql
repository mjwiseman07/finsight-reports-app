-- Phase D6.4c-1: Pre-Close Review Queue + Basis Guard columns + Directive Audit
-- Idempotent. Safe to re-run.
-- Additive only. No existing tables/columns/constraints are modified destructively.
--
-- Depends on:
--   20260706120000_d_platform_event_sourced_foundation.sql (engagements, portcos, ai_action_log)
--   20260706130000_d_entitlements.sql (ai_action_log_action_category_check current set)
--   20260703_1200_d6_0_vertical_rule_foundation.sql (curated_rule_fires)
begin;

-- ============================================================
-- 1. pre_close_review_items — the review queue itself
-- ============================================================
create table if not exists public.pre_close_review_items (
  id                          uuid primary key default gen_random_uuid(),
  -- Origin: which rule fire produced this proposal
  fire_id                     uuid not null references public.curated_rule_fires(fire_id) on delete restrict,
  firm_client_id              uuid not null references public.firm_clients(id) on delete restrict,
  engagement_id               uuid not null references public.engagements(id) on delete restrict,
  close_period_id             uuid null,  -- FK added conditionally below to survive out-of-order migrations
  rule_id                     text not null,
  rule_version                integer not null,
  -- Basis at time of composition
  accounting_method           text not null check (accounting_method in ('cash','accrual','modified_cash')),
  -- Composed JE draft (balanced; validated at insert-time by trigger)
  je_draft                    jsonb not null,
  je_draft_total_debit_cents  bigint not null check (je_draft_total_debit_cents >= 0),
  je_draft_total_credit_cents bigint not null check (je_draft_total_credit_cents >= 0),
  je_draft_line_count         integer not null check (je_draft_line_count >= 2),
  -- Assertion tags — populated by D-Assertions Part 1; nullable in D6.4c-1
  assertion_tags              text[] null,
  -- Rule-provided proposal metadata
  rule_reason_code            text not null,
  rule_reason_detail          jsonb not null default '{}'::jsonb,
  severity                    text not null check (severity in ('info','warning','error','critical')),
  -- Evidence pointers (deliberately array of jsonb — supports multi-source proposals)
  evidence_refs               jsonb not null default '[]'::jsonb,
  -- Basis guard outcome captured at composition time (redundant but audit-preserving)
  basis_guard_reason_code     text null,
  basis_guard_reason_text     text null,
  -- Decision tail (only these columns are mutable post-insert; immutability trigger enforces)
  decision                    text null check (decision in ('approved','rejected','deferred','edit_and_approved')),
  decision_reason_code        text null,
  decision_reason_text        text null,
  reviewer_user_id            uuid null references auth.users(id) on delete set null,
  decision_at                 timestamptz null,
  edited_je_draft             jsonb null,  -- populated only for edit_and_approved
  -- Downstream link (populated by D6.4c-3)
  posted_je_attempt_id        uuid null,
  created_at                  timestamptz not null default now(),
  -- If decision is set, decision_reason_code must be set (defense-in-depth vs applier)
  constraint pre_close_review_items_decision_pair
    check (
      (decision is null and decision_reason_code is null and decision_at is null)
      or
      (decision is not null and decision_reason_code is not null and decision_at is not null)
    ),
  -- edited_je_draft only allowed for edit_and_approved
  constraint pre_close_review_items_edited_only_for_edit_and_approved
    check (
      (edited_je_draft is null)
      or
      (edited_je_draft is not null and decision = 'edit_and_approved')
    )
);
comment on table public.pre_close_review_items is
  'D6.4c-1: pre-close review queue. Every rule fire that clears the basis guard produces one row. Immutable except decision-tail columns.';

-- Conditional FK to close_periods (defensive against replayed environments where
-- D3 was applied later; on e050803 main close_periods already exists).
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'close_periods') then
    if not exists (
      select 1 from information_schema.table_constraints
      where table_schema = 'public'
        and table_name = 'pre_close_review_items'
        and constraint_name = 'pre_close_review_items_close_period_fk'
    ) then
      execute 'alter table public.pre_close_review_items
               add constraint pre_close_review_items_close_period_fk
               foreign key (close_period_id) references public.close_periods(id) on delete set null';
    end if;
  end if;
end $$;

-- ------------------------------------------------------------
-- 2. Indexes
-- ------------------------------------------------------------
create index if not exists pre_close_review_items_engagement_created_idx
  on public.pre_close_review_items (engagement_id, created_at desc);
create index if not exists pre_close_review_items_client_pending_idx
  on public.pre_close_review_items (firm_client_id, created_at desc)
  where decision is null;
create index if not exists pre_close_review_items_fire_idx
  on public.pre_close_review_items (fire_id);
-- One review item per rule fire. If a rule refires (different inputs_hash → new
-- fire_id), that produces a distinct review item, correct by construction.
create unique index if not exists pre_close_review_items_fire_dedup_idx
  on public.pre_close_review_items (fire_id);
create index if not exists pre_close_review_items_close_period_idx
  on public.pre_close_review_items (close_period_id)
  where close_period_id is not null;
create index if not exists pre_close_review_items_rule_idx
  on public.pre_close_review_items (rule_id, rule_version);

-- ------------------------------------------------------------
-- 3. JE draft shape validator (fires at INSERT and on decision UPDATE)
-- ------------------------------------------------------------
create or replace function public.pre_close_review_items_je_draft_check()
returns trigger language plpgsql as $$
declare
  line_count integer;
  total_dr numeric;
  total_cr numeric;
  edited_line_count integer;
  edited_total_dr numeric;
  edited_total_cr numeric;
begin
  -- Base draft: balanced, >= 2 lines
  if jsonb_typeof(new.je_draft) <> 'object' then
    raise exception 'pre_close_review_items.je_draft must be a JSON object (got %)', jsonb_typeof(new.je_draft);
  end if;
  if not (new.je_draft ? 'lines' and jsonb_typeof(new.je_draft->'lines') = 'array') then
    raise exception 'pre_close_review_items.je_draft.lines must be an array';
  end if;
  select count(*),
         coalesce(sum((l->>'drAmountCents')::numeric), 0),
         coalesce(sum((l->>'crAmountCents')::numeric), 0)
    into line_count, total_dr, total_cr
    from jsonb_array_elements(new.je_draft->'lines') l;
  if line_count < 2 then
    raise exception 'pre_close_review_items.je_draft must have >= 2 lines (got %)', line_count;
  end if;
  if total_dr <> new.je_draft_total_debit_cents then
    raise exception 'pre_close_review_items.je_draft_total_debit_cents (%) != sum(drAmountCents) (%)', new.je_draft_total_debit_cents, total_dr;
  end if;
  if total_cr <> new.je_draft_total_credit_cents then
    raise exception 'pre_close_review_items.je_draft_total_credit_cents (%) != sum(crAmountCents) (%)', new.je_draft_total_credit_cents, total_cr;
  end if;
  if total_dr <> total_cr then
    raise exception 'pre_close_review_items.je_draft unbalanced: DR=% CR=%', total_dr, total_cr;
  end if;
  if new.je_draft_line_count <> line_count then
    raise exception 'pre_close_review_items.je_draft_line_count (%) != actual (%)', new.je_draft_line_count, line_count;
  end if;
  -- Edited draft (only when decision = 'edit_and_approved'): same balance rules
  if new.edited_je_draft is not null then
    if jsonb_typeof(new.edited_je_draft) <> 'object' or not (new.edited_je_draft ? 'lines') then
      raise exception 'pre_close_review_items.edited_je_draft must be an object with lines[]';
    end if;
    select count(*),
           coalesce(sum((l->>'drAmountCents')::numeric), 0),
           coalesce(sum((l->>'crAmountCents')::numeric), 0)
      into edited_line_count, edited_total_dr, edited_total_cr
      from jsonb_array_elements(new.edited_je_draft->'lines') l;
    if edited_line_count < 2 then
      raise exception 'edited_je_draft must have >= 2 lines';
    end if;
    if edited_total_dr <> edited_total_cr then
      raise exception 'edited_je_draft unbalanced: DR=% CR=%', edited_total_dr, edited_total_cr;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists pre_close_review_items_je_draft_check_trg on public.pre_close_review_items;
create trigger pre_close_review_items_je_draft_check_trg
  before insert or update on public.pre_close_review_items
  for each row execute function public.pre_close_review_items_je_draft_check();

-- ------------------------------------------------------------
-- 4. Immutability trigger — only decision-tail fields may change post-insert
-- ------------------------------------------------------------
create or replace function public.pre_close_review_items_immutable()
returns trigger language plpgsql as $$
begin
  if (
    new.id                          is distinct from old.id                          or
    new.fire_id                     is distinct from old.fire_id                     or
    new.firm_client_id              is distinct from old.firm_client_id              or
    new.engagement_id               is distinct from old.engagement_id               or
    new.close_period_id             is distinct from old.close_period_id             or
    new.rule_id                     is distinct from old.rule_id                     or
    new.rule_version                is distinct from old.rule_version                or
    new.accounting_method           is distinct from old.accounting_method           or
    new.je_draft                    is distinct from old.je_draft                    or
    new.je_draft_total_debit_cents  is distinct from old.je_draft_total_debit_cents  or
    new.je_draft_total_credit_cents is distinct from old.je_draft_total_credit_cents or
    new.je_draft_line_count         is distinct from old.je_draft_line_count         or
    new.assertion_tags              is distinct from old.assertion_tags              or
    new.rule_reason_code            is distinct from old.rule_reason_code            or
    new.rule_reason_detail          is distinct from old.rule_reason_detail          or
    new.severity                    is distinct from old.severity                    or
    new.evidence_refs               is distinct from old.evidence_refs               or
    new.basis_guard_reason_code     is distinct from old.basis_guard_reason_code     or
    new.basis_guard_reason_text     is distinct from old.basis_guard_reason_text     or
    new.created_at                  is distinct from old.created_at
  ) then
    raise exception 'pre_close_review_items row is immutable except decision-tail columns (id=%)', old.id;
  end if;
  -- posted_je_attempt_id: allow one-time transition from null to a value (set by D6.4c-3)
  if old.posted_je_attempt_id is not null and new.posted_je_attempt_id is distinct from old.posted_je_attempt_id then
    raise exception 'pre_close_review_items.posted_je_attempt_id is set-once (id=%)', old.id;
  end if;
  -- decision fields: allow one-time transition from null to a value; no re-decisions
  if old.decision is not null and new.decision is distinct from old.decision then
    raise exception 'pre_close_review_items.decision is set-once (id=%)', old.id;
  end if;
  return new;
end $$;
drop trigger if exists pre_close_review_items_immutable_trg on public.pre_close_review_items;
create trigger pre_close_review_items_immutable_trg
  before update on public.pre_close_review_items
  for each row execute function public.pre_close_review_items_immutable();

-- ------------------------------------------------------------
-- 5. RLS (service-role only in D6.4c-1; reviewer/client policies land in D6.4d)
-- ------------------------------------------------------------
alter table public.pre_close_review_items enable row level security;
-- Deny-by-default. Service role bypasses RLS. Anonymous/authenticated cannot see anything.
-- D6.4d will add SELECT/UPDATE policies for reviewers scoped to their firm.

-- ------------------------------------------------------------
-- 6. Directive audit widening — extend ai_action_log check to accept the two
--    D6.4c-1 categories WITHOUT dropping any category set by D-Platform or
--    D-Entitlements. The list below is the reconciled union of the current
--    live constraint (D-Entitlements) plus directive_apply + review_item_compose.
-- ------------------------------------------------------------
alter table public.ai_action_log
  drop constraint if exists ai_action_log_action_category_check;
alter table public.ai_action_log
  add constraint ai_action_log_action_category_check
  check (action_category in (
    'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
    'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
    'agent_close_walkthrough','entitlement_check','other',
    'directive_apply','review_item_compose'
  ));
comment on constraint ai_action_log_action_category_check on public.ai_action_log is
  'D6.4c-1: widened to include directive_apply and review_item_compose (preserves all D-Platform + D-Entitlements categories).';

-- ------------------------------------------------------------
-- 7. Backfill-safe: no data to migrate; pre_close_review_items starts empty.
-- ------------------------------------------------------------
commit;
