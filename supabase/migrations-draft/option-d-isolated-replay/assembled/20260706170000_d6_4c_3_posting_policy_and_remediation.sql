-- =============================================================================
-- D6.4c-3 — Approve-and-Post: Posting Policy + Remediation Support
-- =============================================================================
-- ADDITIVE ONLY except:
--   (a) replaces pre_close_review_items_immutable() to permit set-once
--       transition of post_block_reason.
--   (b) extends ai_action_log_action_category_check and
--       ledger_events_event_category_check for D6.4c-3 categories.
-- =============================================================================
begin;

-- ------------------------------------------------------------
-- 1. New table: engagement_posting_policy
-- ------------------------------------------------------------
create table if not exists public.engagement_posting_policy (
  engagement_id                     uuid primary key
                                    references public.engagements(id) on delete cascade,
  policy_code                       text        not null default 'advisacor_balanced',
  advisacor_preset                  text        null,
  auto_post_on_approved             boolean     not null default true,
  auto_post_on_edit_and_approved    boolean     not null default false,
  updated_by                        uuid        null,
  updated_at                        timestamptz not null default now(),
  created_at                        timestamptz not null default now(),
  constraint engagement_posting_policy_preset_chk check (
    advisacor_preset is null or advisacor_preset in (
      'advisacor_conservative',
      'advisacor_balanced',
      'advisacor_aggressive'
    )
  )
);

comment on table public.engagement_posting_policy is
  'D6.4c-3: per-engagement posting policy. Hybrid: pin to an Advisacor preset OR set flags manually.';

comment on column public.engagement_posting_policy.policy_code is
  'Free-text label for humans. When a preset is pinned, this equals the preset code.';

comment on column public.engagement_posting_policy.advisacor_preset is
  'When non-null, flags below must match the preset definition (enforced by trigger).';

-- ------------------------------------------------------------
-- 2. Preset consistency trigger
-- ------------------------------------------------------------
create or replace function public.engagement_posting_policy_preset_consistency()
returns trigger language plpgsql as $$
begin
  if new.advisacor_preset is null then
    return new;
  end if;
  if new.advisacor_preset = 'advisacor_conservative' then
    if new.auto_post_on_approved is distinct from false
       or new.auto_post_on_edit_and_approved is distinct from false then
      raise exception 'advisacor_conservative requires both auto_post flags = false (engagement=%)', new.engagement_id;
    end if;
  elsif new.advisacor_preset = 'advisacor_balanced' then
    if new.auto_post_on_approved is distinct from true
       or new.auto_post_on_edit_and_approved is distinct from false then
      raise exception 'advisacor_balanced requires auto_post_on_approved=true, auto_post_on_edit_and_approved=false (engagement=%)', new.engagement_id;
    end if;
  elsif new.advisacor_preset = 'advisacor_aggressive' then
    if new.auto_post_on_approved is distinct from true
       or new.auto_post_on_edit_and_approved is distinct from true then
      raise exception 'advisacor_aggressive requires both auto_post flags = true (engagement=%)', new.engagement_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists engagement_posting_policy_preset_consistency_trg
  on public.engagement_posting_policy;
create trigger engagement_posting_policy_preset_consistency_trg
  before insert or update on public.engagement_posting_policy
  for each row execute function public.engagement_posting_policy_preset_consistency();

-- ------------------------------------------------------------
-- 3. Backfill: seed advisacor_balanced for every existing engagement
-- ------------------------------------------------------------
insert into public.engagement_posting_policy (
  engagement_id, policy_code, advisacor_preset,
  auto_post_on_approved, auto_post_on_edit_and_approved
)
select
  e.id,
  'advisacor_balanced',
  'advisacor_balanced',
  true,
  false
from public.engagements e
where not exists (
  select 1 from public.engagement_posting_policy p where p.engagement_id = e.id
);

-- ------------------------------------------------------------
-- 4. New column on pre_close_review_items: post_block_reason
-- ------------------------------------------------------------
alter table public.pre_close_review_items
  add column if not exists post_block_reason text null;

comment on column public.pre_close_review_items.post_block_reason is
  'D6.4c-3: machine-readable reason the remediation pipeline blocked posting. Set-once (null -> value).';

-- ------------------------------------------------------------
-- 5. Extend immutability trigger to allow set-once for post_block_reason
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
  if old.posted_je_attempt_id is not null and new.posted_je_attempt_id is distinct from old.posted_je_attempt_id then
    raise exception 'pre_close_review_items.posted_je_attempt_id is set-once (id=%)', old.id;
  end if;
  if old.post_block_reason is not null and new.post_block_reason is distinct from old.post_block_reason then
    raise exception 'pre_close_review_items.post_block_reason is set-once (id=%)', old.id;
  end if;
  if old.decision is not null and new.decision is distinct from old.decision then
    raise exception 'pre_close_review_items.decision is set-once (id=%)', old.id;
  end if;
  return new;
end $$;

-- ------------------------------------------------------------
-- 6. Extend ai_action_log_action_category_check (reconciled union)
-- ------------------------------------------------------------
alter table public.ai_action_log
  drop constraint if exists ai_action_log_action_category_check;
alter table public.ai_action_log
  add constraint ai_action_log_action_category_check check (
    action_category in (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation'
    )
  );

comment on constraint ai_action_log_action_category_check on public.ai_action_log is
  'D6.4c-3: widened to include posting_attempt, posting_blocked, posting_remediation (preserves D-Platform + D-Entitlements + D6.4c-1 categories).';

-- ------------------------------------------------------------
-- 7. Extend ledger_events_event_category_check for posting category
-- ------------------------------------------------------------
alter table public.ledger_events
  drop constraint if exists ledger_events_event_category_check;
alter table public.ledger_events
  add constraint ledger_events_event_category_check check (
    event_category in (
      'intake','ledger','cash_app','ar','ap','recon','close','assertion',
      'rule','directive','ai_action','system','entitlement','posting'
    )
  );

comment on constraint ledger_events_event_category_check on public.ledger_events is
  'D6.4c-3: widened to include posting (approve-and-post outcomes).';

commit;
