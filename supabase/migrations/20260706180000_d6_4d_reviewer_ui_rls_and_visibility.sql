-- =============================================================================
-- D6.4d — Reviewer UI RLS + Client Visibility + Review Packet Exports
-- =============================================================================
-- ADDITIVE ONLY. Reconciled against live D6.4c-3 constraint unions.
-- DEVIATION: je_backup_packets + je-backup bucket already exist (D6.4a) — this
-- migration adds RLS policies to je_backup_packets only; does not recreate the table.
-- =============================================================================
begin;

-- ------------------------------------------------------------
-- 1. firm_client_users — join table for client-user identity
-- ------------------------------------------------------------
create table if not exists public.firm_client_users (
  id              uuid primary key default gen_random_uuid(),
  firm_client_id  uuid not null references public.firm_clients(id) on delete cascade,
  user_id         uuid not null,
  role            text not null default 'client_owner'
                    check (role in ('client_owner','client_reviewer','client_readonly')),
  status          text not null default 'active'
                    check (status in ('active','revoked')),
  invited_by      uuid null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (firm_client_id, user_id)
);

create index if not exists firm_client_users_user_id_idx
  on public.firm_client_users(user_id);
create index if not exists firm_client_users_firm_client_id_idx
  on public.firm_client_users(firm_client_id) where status = 'active';

alter table public.firm_client_users enable row level security;

drop policy if exists "service_role_all_firm_client_users" on public.firm_client_users;
create policy "service_role_all_firm_client_users"
  on public.firm_client_users for all to service_role
  using (true) with check (true);

drop policy if exists "self_read_firm_client_users" on public.firm_client_users;
create policy "self_read_firm_client_users"
  on public.firm_client_users for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "firm_members_read_firm_client_users" on public.firm_client_users;
create policy "firm_members_read_firm_client_users"
  on public.firm_client_users for select to authenticated
  using (
    firm_client_id in (
      select fc.id from public.firm_clients fc
      where fc.firm_id in (
        select fm.firm_id from public.firm_memberships fm where fm.user_id = auth.uid()
      )
    )
  );

-- ------------------------------------------------------------
-- 2. engagement_review_visibility
-- ------------------------------------------------------------
create table if not exists public.engagement_review_visibility (
  engagement_id             uuid primary key
                             references public.engagements(id) on delete cascade,
  client_can_view_queue     boolean not null default false,
  client_can_view_evidence  boolean not null default false,
  client_can_view_je_draft  boolean not null default false,
  updated_by                uuid null,
  updated_at                timestamptz not null default now(),
  created_at                timestamptz not null default now()
);

comment on table public.engagement_review_visibility is
  'D6.4d: firm-controlled toggles for whether client users can view review items on an engagement. Default: everything off.';

alter table public.engagement_review_visibility enable row level security;

drop policy if exists "service_role_all_engagement_review_visibility" on public.engagement_review_visibility;
create policy "service_role_all_engagement_review_visibility"
  on public.engagement_review_visibility for all to service_role
  using (true) with check (true);

drop policy if exists "firm_members_manage_engagement_review_visibility" on public.engagement_review_visibility;
create policy "firm_members_manage_engagement_review_visibility"
  on public.engagement_review_visibility for all to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm
        where fm.user_id = auth.uid()
          and fm.role in ('firm_admin','controller','fractional_cfo')
      )
    )
  )
  with check (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm
        where fm.user_id = auth.uid()
          and fm.role in ('firm_admin','controller','fractional_cfo')
      )
    )
  );

drop policy if exists "client_users_read_engagement_review_visibility" on public.engagement_review_visibility;
create policy "client_users_read_engagement_review_visibility"
  on public.engagement_review_visibility for select to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      join public.firm_clients fc on fc.firm_id = e.firm_id
      join public.firm_client_users fcu on fcu.firm_client_id = fc.id
      where fcu.user_id = auth.uid() and fcu.status = 'active'
    )
  );

-- ------------------------------------------------------------
-- 3. pre_close_review_items — reviewer/client RLS policies
-- ------------------------------------------------------------
drop policy if exists "service_role_all_pre_close_review_items" on public.pre_close_review_items;
create policy "service_role_all_pre_close_review_items"
  on public.pre_close_review_items for all to service_role
  using (true) with check (true);

drop policy if exists "firm_reviewers_read_pre_close_review_items" on public.pre_close_review_items;
create policy "firm_reviewers_read_pre_close_review_items"
  on public.pre_close_review_items for select to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm where fm.user_id = auth.uid()
      )
    )
  );

drop policy if exists "firm_writers_update_pre_close_review_items" on public.pre_close_review_items;
create policy "firm_writers_update_pre_close_review_items"
  on public.pre_close_review_items for update to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm
        where fm.user_id = auth.uid()
          and fm.role in ('firm_admin','controller','fractional_cfo')
      )
    )
  )
  with check (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm
        where fm.user_id = auth.uid()
          and fm.role in ('firm_admin','controller','fractional_cfo')
      )
    )
  );

drop policy if exists "client_users_read_pre_close_review_items" on public.pre_close_review_items;
create policy "client_users_read_pre_close_review_items"
  on public.pre_close_review_items for select to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      join public.firm_clients fc on fc.firm_id = e.firm_id
      join public.firm_client_users fcu on fcu.firm_client_id = fc.id
      join public.engagement_review_visibility erv on erv.engagement_id = e.id
      where fcu.user_id = auth.uid()
        and fcu.status = 'active'
        and erv.client_can_view_queue = true
    )
  );

-- ------------------------------------------------------------
-- 4. je_backup_packets — RLS only (table created in D6.4a)
-- ------------------------------------------------------------
alter table public.je_backup_packets enable row level security;

drop policy if exists "service_role_all_je_backup_packets" on public.je_backup_packets;
create policy "service_role_all_je_backup_packets"
  on public.je_backup_packets for all to service_role
  using (true) with check (true);

drop policy if exists "firm_members_read_je_backup_packets" on public.je_backup_packets;
create policy "firm_members_read_je_backup_packets"
  on public.je_backup_packets for select to authenticated
  using (
    firm_client_id in (
      select fc.id from public.firm_clients fc
      where fc.firm_id in (
        select fm.firm_id from public.firm_memberships fm where fm.user_id = auth.uid()
      )
    )
  );

-- ------------------------------------------------------------
-- 5. review_item_packet_exports
-- ------------------------------------------------------------
create table if not exists public.review_item_packet_exports (
  export_id           uuid primary key default gen_random_uuid(),
  review_item_id      uuid not null references public.pre_close_review_items(id) on delete cascade,
  firm_client_id      uuid not null references public.firm_clients(id) on delete cascade,
  engagement_id       uuid not null references public.engagements(id) on delete cascade,
  exported_by_user_id uuid not null,
  storage_path        text null,
  sha256              text not null,
  byte_size           bigint not null,
  exported_at         timestamptz not null default now()
);

create index if not exists review_item_packet_exports_review_item_idx
  on public.review_item_packet_exports(review_item_id, exported_at desc);
create index if not exists review_item_packet_exports_user_idx
  on public.review_item_packet_exports(exported_by_user_id, exported_at desc);

alter table public.review_item_packet_exports enable row level security;

drop policy if exists "service_role_all_review_item_packet_exports" on public.review_item_packet_exports;
create policy "service_role_all_review_item_packet_exports"
  on public.review_item_packet_exports for all to service_role
  using (true) with check (true);

drop policy if exists "firm_members_read_review_item_packet_exports" on public.review_item_packet_exports;
create policy "firm_members_read_review_item_packet_exports"
  on public.review_item_packet_exports for select to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm where fm.user_id = auth.uid()
      )
    )
  );

-- ------------------------------------------------------------
-- 6. Widen ai_action_log + ledger_events category checks
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
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change'
    )
  );

alter table public.ledger_events
  drop constraint if exists ledger_events_event_category_check;
alter table public.ledger_events
  add constraint ledger_events_event_category_check check (
    event_category in (
      'intake','ledger','cash_app','ar','ap','recon','close','assertion',
      'rule','directive','ai_action','system','entitlement','posting',
      'reviewer_ui'
    )
  );

-- ------------------------------------------------------------
-- 7. Storage bucket: review-item-packets (je-backup exists from D6.4a)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-item-packets',
  'review-item-packets',
  false,
  52428800,
  array['application/pdf']::text[]
)
on conflict (id) do nothing;

commit;
