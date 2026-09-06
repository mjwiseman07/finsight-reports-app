-- Gap 3 — JE approval flow. Additive-only extension of D6.4c-1 pre_close_review_items
-- + D6.4c-3 engagement_posting_policy. Adds proposer/approver identity, materiality
-- classification (with per-engagement overrides), SoD trigger, MFA step-up gate,
-- customer-adjustable autonomous-posting toggle, and Intuit support-log trace table.

begin;

-- ============================================================
-- 1. New columns on pre_close_review_items
-- ============================================================
alter table public.pre_close_review_items
  add column if not exists proposed_by_user_id      uuid null references auth.users(id) on delete set null,
  add column if not exists proposed_by_actor_type   text null check (proposed_by_actor_type in ('user','ai_agent','system','rule_engine')),
  add column if not exists approved_by_user_id      uuid null references auth.users(id) on delete set null,
  add column if not exists materiality_bucket       text null check (materiality_bucket in ('low','medium','high')),
  add column if not exists requires_mfa_step_up     boolean not null default false,
  add column if not exists mfa_step_up_verified_at  timestamptz null,
  add column if not exists mfa_step_up_method       text null check (mfa_step_up_method in ('totp','webauthn')),
  add column if not exists sod_check_passed_at      timestamptz null,
  add column if not exists gap3_grandfathered       boolean not null default false,
  add column if not exists autonomous_lane          boolean not null default false;

comment on column public.pre_close_review_items.autonomous_lane is
  'Gap 3: true if this row entered the autonomous-posting lane per engagement_posting_policy.autonomous_posting_enabled. Preserves shipped D6.4c behavior for the engagement; still generates evidence + backup packet.';

-- ============================================================
-- 2. Per-engagement materiality overrides + autonomous toggle on engagement_posting_policy
-- ============================================================
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'engagement_posting_policy') then
    alter table public.engagement_posting_policy
      add column if not exists materiality_low_max_cents      bigint null check (materiality_low_max_cents is null or materiality_low_max_cents >= 0),
      add column if not exists materiality_medium_max_cents   bigint null check (materiality_medium_max_cents is null or materiality_medium_max_cents >= 0),
      add column if not exists materiality_high_requires_mfa  boolean null,
      add column if not exists autonomous_posting_enabled     boolean not null default false,
      add column if not exists autonomous_max_bucket          text null check (autonomous_max_bucket is null or autonomous_max_bucket in ('low','medium','high'));

    comment on column public.engagement_posting_policy.materiality_low_max_cents is
      'Gap 3: per-engagement override for low bucket ceiling. NULL = platform default (100000 = $1000).';
    comment on column public.engagement_posting_policy.materiality_medium_max_cents is
      'Gap 3: per-engagement override for medium bucket ceiling. NULL = platform default (1000000 = $10000).';
    comment on column public.engagement_posting_policy.materiality_high_requires_mfa is
      'Gap 3: per-engagement override for whether high-materiality requires MFA step-up. NULL = platform default (true).';
    comment on column public.engagement_posting_policy.autonomous_posting_enabled is
      'Gap 3: opt-in autonomous-posting lane. When true, system-proposed JEs post under shipped D6.4c controls without requiring a paired approved review_item_id. Firm admin must explicitly enable per engagement. Defaults false to preserve current behavior.';
    comment on column public.engagement_posting_policy.autonomous_max_bucket is
      'Gap 3: maximum materiality bucket eligible for autonomous posting. NULL when autonomous_posting_enabled=false. When true, capped to low or medium; high always requires human approval.';

    if not exists (select 1 from pg_constraint where conname = 'engagement_posting_policy_autonomous_bucket_cap') then
      alter table public.engagement_posting_policy
        add constraint engagement_posting_policy_autonomous_bucket_cap
        check (autonomous_max_bucket is null or autonomous_max_bucket in ('low','medium'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'engagement_posting_policy_autonomous_bucket_required') then
      alter table public.engagement_posting_policy
        add constraint engagement_posting_policy_autonomous_bucket_required
        check (autonomous_posting_enabled = false or autonomous_max_bucket is not null);
    end if;
  end if;
end
$$;

-- ============================================================
-- 3. Materiality classifier — per-engagement + platform defaults
-- ============================================================
create or replace function public.gap3_materiality_bucket(
  total_debit_cents bigint,
  engagement_id_arg uuid default null
)
returns text
language plpgsql
stable
parallel safe
set search_path = public
as $$
declare
  low_max      bigint := 100000;    -- $1000 default
  med_max      bigint := 1000000;   -- $10000 default
begin
  if total_debit_cents is null then
    return null;
  end if;

  if engagement_id_arg is not null then
    select coalesce(materiality_low_max_cents,    low_max),
           coalesce(materiality_medium_max_cents, med_max)
      into low_max, med_max
      from public.engagement_posting_policy
     where engagement_id = engagement_id_arg;
  end if;

  return case
    when total_debit_cents <= low_max then 'low'
    when total_debit_cents <= med_max then 'medium'
    else 'high'
  end;
end
$$;

comment on function public.gap3_materiality_bucket(bigint, uuid) is
  'Gap 3: bucket JE by total debits. Resolves per-engagement thresholds first, falls back to $1K/$10K platform defaults.';

-- ============================================================
-- 4. Compute materiality + requires_mfa_step_up on INSERT
-- ============================================================
create or replace function public.gap3_pre_close_ri_materiality_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  requires_mfa_default boolean := true;
begin
  new.materiality_bucket := public.gap3_materiality_bucket(
    new.je_draft_total_debit_cents,
    new.engagement_id
  );

  select coalesce(materiality_high_requires_mfa, true)
    into requires_mfa_default
    from public.engagement_posting_policy
   where engagement_id = new.engagement_id;

  new.requires_mfa_step_up := (new.materiality_bucket = 'high' and coalesce(requires_mfa_default, true));
  return new;
end
$$;

drop trigger if exists gap3_pre_close_ri_materiality on public.pre_close_review_items;
create trigger gap3_pre_close_ri_materiality
  before insert on public.pre_close_review_items
  for each row
  execute function public.gap3_pre_close_ri_materiality_before_insert();

-- ============================================================
-- 5. SoD hard-block + MFA gate on UPDATE
-- ============================================================
create or replace function public.gap3_pre_close_ri_sod_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.decision in ('approved','edit_and_approved')
     and (old.decision is distinct from new.decision) then

    if coalesce(new.autonomous_lane, false) = false
       and coalesce(new.gap3_grandfathered, false) = false then

      if new.proposed_by_user_id is not null
         and new.approved_by_user_id is not null
         and new.proposed_by_user_id = new.approved_by_user_id then
        raise exception 'gap3_sod_violation: proposer (%) and approver (%) must differ',
          new.proposed_by_user_id, new.approved_by_user_id
          using errcode = 'check_violation';
      end if;
    end if;

    if new.requires_mfa_step_up = true
       and new.mfa_step_up_verified_at is null
       and coalesce(new.gap3_grandfathered, false) = false
       and coalesce(new.autonomous_lane, false) = false then
      raise exception 'gap3_mfa_step_up_required: materiality=high requires fresh MFA verification'
        using errcode = 'check_violation';
    end if;

    new.sod_check_passed_at := now();
  end if;

  return new;
end
$$;

drop trigger if exists gap3_pre_close_ri_sod on public.pre_close_review_items;
create trigger gap3_pre_close_ri_sod
  before update on public.pre_close_review_items
  for each row
  execute function public.gap3_pre_close_ri_sod_before_update();

-- ============================================================
-- 6. Backfill grandfathered flag on existing rows
-- ============================================================
update public.pre_close_review_items
   set gap3_grandfathered = true,
       materiality_bucket = coalesce(materiality_bucket, public.gap3_materiality_bucket(je_draft_total_debit_cents, engagement_id))
 where materiality_bucket is null;

-- ============================================================
-- 7. Extend ai_action_log action_category with Gap 3 event types
-- ============================================================
do $$
begin
  alter table public.ai_action_log
    drop constraint if exists ai_action_log_action_category_check;
  alter table public.ai_action_log
    add constraint ai_action_log_action_category_check
    check (action_category in (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change',
      'assertion_coverage_scan','assertion_gap_reasoning',
      'visual_fingerprint','vendor_resolution',
      'bank_change_detection','quarantine_gate_evaluation',
      'duplicate_detection',
      'statistical_anomaly_detection','fraud_score_aggregation',
      'gap3_approval','gap3_sod_violation','gap3_mfa_step_up','gap3_grandfathered_approval',
      'gap3_autonomous_post','gap3_client_je_report','qbo_api_trace'
    ));
end
$$;

-- ============================================================
-- 8. Approval bundle view (POST-endpoint gate reads this)
-- ============================================================
create or replace view public.v_pre_close_approval_bundle
with (security_invoker=true)
as
select
  ri.id                          as review_item_id,
  ri.firm_client_id,
  ri.engagement_id,
  ri.decision,
  ri.decision_at,
  ri.proposed_by_user_id,
  ri.approved_by_user_id,
  ri.materiality_bucket,
  ri.requires_mfa_step_up,
  ri.mfa_step_up_verified_at,
  ri.mfa_step_up_method,
  ri.sod_check_passed_at,
  ri.je_draft_total_debit_cents,
  ri.je_draft_total_credit_cents,
  ri.gap3_grandfathered,
  ri.autonomous_lane,
  ri.posted_je_attempt_id,
  epp.autonomous_posting_enabled,
  epp.autonomous_max_bucket
from public.pre_close_review_items ri
left join public.engagement_posting_policy epp
  on epp.engagement_id = ri.engagement_id;

comment on view public.v_pre_close_approval_bundle is
  'Gap 3: canonical bundle exposed to POST-endpoint approval gate. security_invoker=true so caller RLS applies.';

-- ============================================================
-- 9. Client-facing posted-JE report view (wires shipped D6.4a + D6.4d)
-- ============================================================
create or replace view public.v_client_posted_je_report
with (security_invoker=true)
as
select
  jpa.attempt_id                as je_attempt_id,
  jpa.firm_client_id,
  jpa.qbo_je_id,
  jpa.status,
  coalesce(jpa.updated_at, jpa.created_at) as posted_at,
  audit.posted_by,
  audit.posted_by_user_id,
  audit.source_type,
  audit.source_id,
  ri.id                         as review_item_id,
  ri.engagement_id,
  ri.materiality_bucket,
  ri.autonomous_lane,
  ri.approved_by_user_id,
  ri.decision_at                as approved_at,
  ri.rule_reason_code,
  ri.rule_reason_detail,
  jbp.packet_id                 as backup_packet_id,
  jbp.storage_path              as backup_packet_storage_path,
  jbp.sha256                    as backup_packet_sha256,
  jbp.byte_size                 as backup_packet_byte_size,
  (
    select count(*)::int
      from public.je_line_evidence e
     where e.attempt_id = jpa.attempt_id
  )                             as evidence_line_count,
  (
    select count(*)::int
      from public.je_line_attachments a
     where a.attempt_id = jpa.attempt_id
  )                             as attachment_count
from public.je_post_attempts jpa
left join lateral (
  select a.posted_by, a.posted_by_user_id, a.source_type, a.source_id
    from public.je_posting_audit a
   where a.attempt_id = jpa.attempt_id
   order by a.created_at desc
   limit 1
) audit on true
left join public.pre_close_review_items ri
  on ri.posted_je_attempt_id = jpa.attempt_id
left join public.je_backup_packets jbp
  on jbp.attempt_id = jpa.attempt_id;

comment on view public.v_client_posted_je_report is
  'Gap 3: client-facing posted-JE report. Joins JE post attempts to their approval record, materiality, backup packet, and evidence counts.';

-- ============================================================
-- 10. QBO API trace log (Intuit support-log requirement)
-- ============================================================
create table if not exists public.qbo_api_trace (
  trace_id           uuid primary key default gen_random_uuid(),
  firm_client_id     uuid not null,
  realm_id           text null,
  endpoint           text not null,
  http_method        text not null check (http_method in ('GET','POST','PUT','DELETE','PATCH')),
  http_status        integer null,
  intuit_tid         text null,
  request_id         text null,
  latency_ms         integer null,
  error_code         text null,
  error_message      text null,
  correlation_id     uuid null,
  attempted_at       timestamptz not null default now(),
  expires_at         timestamptz not null default (now() + interval '7 days')
);

create index if not exists qbo_api_trace_firm_client_idx
  on public.qbo_api_trace (firm_client_id, attempted_at desc);
create index if not exists qbo_api_trace_intuit_tid_idx
  on public.qbo_api_trace (intuit_tid)
  where intuit_tid is not null;
create index if not exists qbo_api_trace_expires_idx
  on public.qbo_api_trace (expires_at);

comment on table public.qbo_api_trace is
  'Gap 3: 7-day rolling trace of QBO API calls for Intuit support handoff. Metadata only (no request/response bodies).';

alter table public.qbo_api_trace enable row level security;

drop policy if exists "deny_all_client_access_qbo_api_trace" on public.qbo_api_trace;
create policy "deny_all_client_access_qbo_api_trace"
  on public.qbo_api_trace
  as restrictive
  for all
  to authenticated, anon
  using (false)
  with check (false);

-- ============================================================
-- 11. Indexes for approval + client-report queries
-- ============================================================
create index if not exists idx_pre_close_ri_pending_approval
  on public.pre_close_review_items (engagement_id, materiality_bucket, created_at desc)
  where decision is null;

create index if not exists idx_pre_close_ri_posted_by_client
  on public.pre_close_review_items (firm_client_id, decision_at desc)
  where posted_je_attempt_id is not null;

commit;
