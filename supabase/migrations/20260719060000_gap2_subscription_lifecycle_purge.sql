-- Gap 2 — Subscription lifecycle purge (30d grace + cascade + audit)
-- Additive-only. Registry supports firm_id / firm_client_id / engagement_id /
-- user_via_membership / subscription_via_subscriber scopes (repo schema reality).

begin;

-- ============================================================================
-- 1. subscription_purge_schedule
-- ============================================================================
create table if not exists public.subscription_purge_schedule (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid references public.firms(id) on delete set null,
  subscription_id uuid null,
  stripe_subscription_id text,
  stripe_customer_id text,
  scheduled_at timestamptz not null default now(),
  grace_until timestamptz not null,
  execution_started_at timestamptz,
  execution_completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  status text not null default 'scheduled' check (
    status in ('scheduled', 'executing', 'completed', 'cancelled', 'failed')
  ),
  reason text not null,
  triggered_by_user_id uuid,
  triggered_by_stripe_event_id text,
  notification_sent_at timestamptz,
  notification_recipient text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscription_purge_schedule_firm_idx
  on public.subscription_purge_schedule (firm_id);
create index if not exists subscription_purge_schedule_grace_until_idx
  on public.subscription_purge_schedule (grace_until)
  where status = 'scheduled';
create index if not exists subscription_purge_schedule_status_idx
  on public.subscription_purge_schedule (status);

alter table public.subscription_purge_schedule enable row level security;

drop policy if exists subscription_purge_schedule_service_role_all on public.subscription_purge_schedule;
create policy subscription_purge_schedule_service_role_all
  on public.subscription_purge_schedule
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists subscription_purge_schedule_firm_admin_read on public.subscription_purge_schedule;
create policy subscription_purge_schedule_firm_admin_read
  on public.subscription_purge_schedule
  for select
  to authenticated
  using (
    firm_id in (
      select fm.firm_id from public.firm_memberships fm
      where fm.user_id = (select auth.uid())
        and fm.role in ('firm_admin', 'controller', 'fractional_cfo')
        and fm.status = 'active'
    )
    or firm_id in (
      select f.id from public.firms f
      where f.owner_user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 2. subscription_purge_audit — append-only
-- ============================================================================
create table if not exists public.subscription_purge_audit (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references public.subscription_purge_schedule(id) on delete set null,
  firm_id uuid,
  event_type text not null check (event_type in (
    'purge_scheduled',
    'notification_sent',
    'reactivated_within_grace',
    'purge_started',
    'table_purged',
    'purge_completed',
    'purge_failed',
    'admin_override',
    'grace_extended',
    'legal_hold_applied'
  )),
  table_name text,
  rows_deleted integer,
  actor_user_id uuid,
  actor_type text not null check (actor_type in ('system_cron', 'stripe_webhook', 'user', 'super_admin')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists subscription_purge_audit_schedule_idx
  on public.subscription_purge_audit (schedule_id);
create index if not exists subscription_purge_audit_firm_idx
  on public.subscription_purge_audit (firm_id);
create index if not exists subscription_purge_audit_created_at_idx
  on public.subscription_purge_audit (created_at desc);

alter table public.subscription_purge_audit enable row level security;

drop policy if exists subscription_purge_audit_service_role_all on public.subscription_purge_audit;
create policy subscription_purge_audit_service_role_all
  on public.subscription_purge_audit
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.gap2_audit_append_only()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  raise exception 'subscription_purge_audit is append-only — % rejected', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists gap2_audit_no_update on public.subscription_purge_audit;
create trigger gap2_audit_no_update
  before update on public.subscription_purge_audit
  for each row execute function public.gap2_audit_append_only();

drop trigger if exists gap2_audit_no_delete on public.subscription_purge_audit;
create trigger gap2_audit_no_delete
  before delete on public.subscription_purge_audit
  for each row execute function public.gap2_audit_append_only();

-- ============================================================================
-- 3. Purge tracking columns on firms
-- ============================================================================
alter table public.firms
  add column if not exists purge_scheduled_at timestamptz,
  add column if not exists purge_grace_until timestamptz,
  add column if not exists purge_completed_at timestamptz,
  add column if not exists purge_schedule_id uuid,
  add column if not exists legal_hold_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'firms_purge_schedule_id_fkey'
  ) then
    alter table public.firms
      add constraint firms_purge_schedule_id_fkey
      foreign key (purge_schedule_id)
      references public.subscription_purge_schedule(id)
      on delete set null;
  end if;
end
$$;

create index if not exists firms_purge_grace_until_idx
  on public.firms (purge_grace_until)
  where purge_scheduled_at is not null and purge_completed_at is null;

-- ============================================================================
-- 4. Customer-initiated purge tokens (24h, hashed)
-- ============================================================================
create table if not exists public.gap2_purge_tokens (
  token_hash text primary key,
  firm_id uuid not null references public.firms(id) on delete cascade,
  requested_by_user_id uuid not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.gap2_purge_tokens enable row level security;

drop policy if exists gap2_purge_tokens_service_role on public.gap2_purge_tokens;
create policy gap2_purge_tokens_service_role
  on public.gap2_purge_tokens
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- 5. Registry of customer-scoped tables
-- ============================================================================
create table if not exists public.gap2_purge_table_registry (
  id serial primary key,
  table_name text not null unique,
  scope_kind text not null check (scope_kind in (
    'firm_id',
    'firm_pk',
    'firm_client_id',
    'engagement_id',
    'user_via_membership',
    'subscription_via_subscriber'
  )),
  scope_column text not null,
  delete_order integer not null,
  notes text,
  active boolean not null default true,
  added_at timestamptz not null default now()
);

insert into public.gap2_purge_table_registry (table_name, scope_kind, scope_column, delete_order, notes)
values
  ('je_line_attachments',        'firm_client_id', 'firm_client_id', 10,  'D6.4a evidence attachments'),
  ('je_line_evidence',           'firm_client_id', 'firm_client_id', 11,  'D6.4a evidence links'),
  ('je_backup_packets',          'firm_client_id', 'firm_client_id', 12,  'D6.4a/d backup packets'),
  ('qbo_api_trace',              'firm_client_id', 'firm_client_id', 15,  'Gap 3 QBO trace'),
  ('je_posting_audit',           'firm_client_id', 'firm_client_id', 20,  'JE posting audit'),
  ('je_post_attempts',           'firm_client_id', 'firm_client_id', 21,  'JE post attempts'),
  ('pre_close_review_items',     'firm_client_id', 'firm_client_id', 25,  'Review queue items'),
  ('engagement_posting_policy',  'engagement_id',  'engagement_id',  90,  'Gap 3 posting policy'),
  ('engagements',                'firm_id',        'firm_id',        100, 'Engagements'),
  ('mfa_trusted_devices',        'user_via_membership', 'user_id',   110, 'Gap 1b trusted devices'),
  ('user_webauthn_credentials',  'user_via_membership', 'user_id',   111, 'Gap 1b passkeys'),
  ('subscription_items',         'subscription_via_subscriber', 'subscription_id', 200, 'Subscription line items'),
  ('subscriptions',              'subscription_via_subscriber', 'subscriber_id', 201, 'Subscriptions (firm)'),
  ('firm_memberships',           'firm_id',        'firm_id',        210, 'Firm memberships'),
  ('firm_clients',               'firm_id',        'firm_id',        220, 'Firm client records'),
  ('firms',                      'firm_pk',        'id',             999, 'Firm root (last)')
on conflict (table_name) do nothing;

-- ============================================================================
-- 6. gap2_schedule_purge
-- ============================================================================
create or replace function public.gap2_schedule_purge(
  p_firm_id uuid,
  p_subscription_id uuid,
  p_stripe_subscription_id text,
  p_stripe_customer_id text,
  p_reason text,
  p_triggered_by_user_id uuid default null,
  p_triggered_by_stripe_event_id text default null,
  p_grace_days integer default 30
)
  returns uuid
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_schedule_id uuid;
  v_grace_until timestamptz;
begin
  if exists (select 1 from public.firms where id = p_firm_id and legal_hold_reason is not null) then
    insert into public.subscription_purge_audit (
      firm_id, event_type, actor_type, details
    ) values (
      p_firm_id, 'legal_hold_applied', 'stripe_webhook',
      jsonb_build_object('attempted_reason', p_reason, 'blocked', true)
    );
    return null;
  end if;

  -- Idempotency: reuse existing scheduled row
  select id into v_schedule_id
    from public.subscription_purge_schedule
   where firm_id = p_firm_id and status = 'scheduled'
   order by scheduled_at desc
   limit 1;
  if v_schedule_id is not null then
    return v_schedule_id;
  end if;

  v_grace_until := now() + (p_grace_days || ' days')::interval;

  insert into public.subscription_purge_schedule (
    firm_id, subscription_id, stripe_subscription_id, stripe_customer_id,
    grace_until, reason, triggered_by_user_id, triggered_by_stripe_event_id
  ) values (
    p_firm_id, p_subscription_id, p_stripe_subscription_id, p_stripe_customer_id,
    v_grace_until, p_reason, p_triggered_by_user_id, p_triggered_by_stripe_event_id
  )
  returning id into v_schedule_id;

  update public.firms
     set purge_scheduled_at = now(),
         purge_grace_until = v_grace_until,
         purge_schedule_id = v_schedule_id,
         updated_at = now()
   where id = p_firm_id;

  insert into public.subscription_purge_audit (
    schedule_id, firm_id, event_type, actor_type, actor_user_id, details
  ) values (
    v_schedule_id, p_firm_id, 'purge_scheduled',
    case when p_triggered_by_user_id is not null then 'user' else 'stripe_webhook' end,
    p_triggered_by_user_id,
    jsonb_build_object(
      'reason', p_reason,
      'grace_days', p_grace_days,
      'grace_until', v_grace_until,
      'stripe_event_id', p_triggered_by_stripe_event_id
    )
  );

  return v_schedule_id;
end;
$$;

-- ============================================================================
-- 7. gap2_cancel_purge
-- ============================================================================
create or replace function public.gap2_cancel_purge(
  p_firm_id uuid,
  p_cancelled_reason text,
  p_actor_user_id uuid default null
)
  returns uuid
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_schedule_id uuid;
begin
  select id into v_schedule_id
    from public.subscription_purge_schedule
   where firm_id = p_firm_id and status = 'scheduled'
   order by scheduled_at desc
   limit 1;

  if v_schedule_id is null then
    return null;
  end if;

  update public.subscription_purge_schedule
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_reason = p_cancelled_reason,
         updated_at = now()
   where id = v_schedule_id;

  update public.firms
     set purge_scheduled_at = null,
         purge_grace_until = null,
         purge_schedule_id = null,
         updated_at = now()
   where id = p_firm_id;

  insert into public.subscription_purge_audit (
    schedule_id, firm_id, event_type, actor_type, actor_user_id, details
  ) values (
    v_schedule_id, p_firm_id, 'reactivated_within_grace',
    case when p_actor_user_id is not null then 'user' else 'stripe_webhook' end,
    p_actor_user_id,
    jsonb_build_object('cancelled_reason', p_cancelled_reason)
  );

  return v_schedule_id;
end;
$$;

revoke all on function public.gap2_schedule_purge(
  uuid, uuid, text, text, text, uuid, text, integer
) from public;
revoke all on function public.gap2_schedule_purge(
  uuid, uuid, text, text, text, uuid, text, integer
) from anon;
revoke all on function public.gap2_schedule_purge(
  uuid, uuid, text, text, text, uuid, text, integer
) from authenticated;
grant execute on function public.gap2_schedule_purge(
  uuid, uuid, text, text, text, uuid, text, integer
) to service_role;

revoke all on function public.gap2_cancel_purge(uuid, text, uuid) from public;
revoke all on function public.gap2_cancel_purge(uuid, text, uuid) from anon;
revoke all on function public.gap2_cancel_purge(uuid, text, uuid) from authenticated;
grant execute on function public.gap2_cancel_purge(uuid, text, uuid) to service_role;

revoke all on function public.gap2_audit_append_only() from public;

commit;
