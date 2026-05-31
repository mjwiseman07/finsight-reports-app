create extension if not exists pgcrypto;

create table if not exists public.pulse_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  company_id uuid,
  client_id uuid,
  subscription_plan text,
  question text not null,
  response_source text not null default 'openai',
  tokens_estimated integer,
  created_at timestamptz not null default now()
);

create index if not exists pulse_usage_events_user_created_idx
  on public.pulse_usage_events(user_id, created_at desc);

create index if not exists pulse_usage_events_company_created_idx
  on public.pulse_usage_events(company_id, created_at desc);

alter table public.pulse_usage_events enable row level security;

drop policy if exists "users can read their pulse usage" on public.pulse_usage_events;
create policy "users can read their pulse usage" on public.pulse_usage_events
  for select using (user_id = auth.uid());
