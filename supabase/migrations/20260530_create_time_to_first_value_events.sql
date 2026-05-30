create table if not exists public.time_to_first_value_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  company_id uuid references public.companies(id) on delete set null,
  event_type text not null check (event_type in ('onboarding_started', 'onboarding_completed', 'first_package_generated', 'first_ai_interaction')),
  event_source text not null default 'app',
  account_type text,
  step_label text,
  estimated_seconds_remaining integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ttfv_events_user_id_idx on public.time_to_first_value_events(user_id);
create index if not exists ttfv_events_company_id_idx on public.time_to_first_value_events(company_id);
create index if not exists ttfv_events_event_type_idx on public.time_to_first_value_events(event_type);

alter table public.time_to_first_value_events enable row level security;

drop policy if exists "users can read own ttfv events" on public.time_to_first_value_events;
create policy "users can read own ttfv events" on public.time_to_first_value_events
  for select using (user_id = auth.uid());

drop policy if exists "users can insert own ttfv events" on public.time_to_first_value_events;
create policy "users can insert own ttfv events" on public.time_to_first_value_events
  for insert with check (user_id = auth.uid() or user_id is null);
