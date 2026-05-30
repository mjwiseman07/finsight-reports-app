create extension if not exists pgcrypto;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_user_id uuid null,
  actor_email text null,
  target_user_id uuid null,
  firm_id text null,
  company_id text null,
  client_id text null,
  resource_type text null,
  resource_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_event_type_idx on public.audit_logs (event_type);
create index if not exists audit_logs_actor_user_id_idx on public.audit_logs (actor_user_id);
create index if not exists audit_logs_company_id_idx on public.audit_logs (company_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_service_role_all" on public.audit_logs;
create policy "audit_logs_service_role_all"
on public.audit_logs
for all
to service_role
using (true)
with check (true);
