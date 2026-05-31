create extension if not exists pgcrypto;

create table if not exists public.firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  advisor_name text,
  reply_to_email text,
  footer_disclaimer text,
  custom_intro_message text,
  owner_user_id uuid,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.firm_memberships (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'firm_admin',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(firm_id, user_id)
);

create table if not exists public.firm_clients (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  name text not null,
  group_name text,
  package_level text not null default 'Essential',
  subscription_status text not null default 'active',
  health_status text not null default 'Moderate Review',
  health_score integer not null default 75,
  last_package_generated text,
  last_login text,
  outstanding_review_items integer not null default 0,
  upcoming_deliveries integer not null default 0,
  weekly_brief_status text not null default 'Scheduled',
  monthly_package_status text not null default 'Scheduled',
  quarterly_review_status text not null default 'Scheduled',
  owner_visibility_restricted boolean not null default true,
  review_items jsonb not null default '[]'::jsonb,
  persona_views jsonb not null default '[]'::jsonb,
  owner_user_id uuid,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_briefing_settings (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  client_id uuid not null references public.firm_clients(id) on delete cascade,
  cadence text not null default 'weekly',
  day_of_week text not null default 'Friday',
  delivery_time text not null default '08:00',
  timezone text not null default 'America/New_York',
  delivery_method text not null default 'both',
  approval_required boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(firm_id, client_id)
);

create table if not exists public.client_briefings (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  client_id uuid not null references public.firm_clients(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  briefing_type text not null default 'both',
  status text not null default 'Draft',
  client_briefing_content jsonb not null default '{}'::jsonb,
  advisor_briefing_content jsonb not null default '{}'::jsonb,
  missing_reports jsonb not null default '[]'::jsonb,
  risk_level text not null default 'Low',
  generated_at timestamptz,
  approved_at timestamptz,
  sent_at timestamptz,
  created_by uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.client_briefing_events (
  id uuid primary key default gen_random_uuid(),
  briefing_id uuid not null references public.client_briefings(id) on delete cascade,
  event_type text not null,
  event_description text not null,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists firm_memberships_user_id_idx on public.firm_memberships(user_id);
create index if not exists firm_clients_firm_id_idx on public.firm_clients(firm_id);
create index if not exists client_briefing_settings_firm_client_idx on public.client_briefing_settings(firm_id, client_id);
create index if not exists client_briefings_firm_client_idx on public.client_briefings(firm_id, client_id);
create index if not exists client_briefings_status_idx on public.client_briefings(status);
create index if not exists client_briefing_events_briefing_id_idx on public.client_briefing_events(briefing_id);

alter table public.firms enable row level security;
alter table public.firm_memberships enable row level security;
alter table public.firm_clients enable row level security;
alter table public.client_briefing_settings enable row level security;
alter table public.client_briefings enable row level security;
alter table public.client_briefing_events enable row level security;

drop policy if exists "firm members can read firms" on public.firms;
create policy "firm members can read firms" on public.firms
  for select using (
    exists (
      select 1 from public.firm_memberships fm
      where fm.firm_id = firms.id
      and fm.user_id = auth.uid()
      and fm.status = 'active'
    )
  );

drop policy if exists "firm members can read memberships" on public.firm_memberships;
create policy "firm members can read memberships" on public.firm_memberships
  for select using (user_id = auth.uid());

drop policy if exists "firm members can read clients" on public.firm_clients;
create policy "firm members can read clients" on public.firm_clients
  for select using (
    exists (
      select 1 from public.firm_memberships fm
      where fm.firm_id = firm_clients.firm_id
      and fm.user_id = auth.uid()
      and fm.status = 'active'
    )
  );

drop policy if exists "firm members can read briefing settings" on public.client_briefing_settings;
create policy "firm members can read briefing settings" on public.client_briefing_settings
  for select using (
    exists (
      select 1 from public.firm_memberships fm
      where fm.firm_id = client_briefing_settings.firm_id
      and fm.user_id = auth.uid()
      and fm.status = 'active'
    )
  );

drop policy if exists "firm admins can manage briefing settings" on public.client_briefing_settings;
create policy "firm admins can manage briefing settings" on public.client_briefing_settings
  for all using (
    exists (
      select 1 from public.firm_memberships fm
      where fm.firm_id = client_briefing_settings.firm_id
      and fm.user_id = auth.uid()
      and fm.status = 'active'
      and fm.role in ('firm_admin','controller','fractional_cfo')
    )
  );

drop policy if exists "firm members can read briefings" on public.client_briefings;
create policy "firm members can read briefings" on public.client_briefings
  for select using (
    exists (
      select 1 from public.firm_memberships fm
      where fm.firm_id = client_briefings.firm_id
      and fm.user_id = auth.uid()
      and fm.status = 'active'
    )
  );

drop policy if exists "firm advisors can manage briefings" on public.client_briefings;
create policy "firm advisors can manage briefings" on public.client_briefings
  for all using (
    exists (
      select 1 from public.firm_memberships fm
      where fm.firm_id = client_briefings.firm_id
      and fm.user_id = auth.uid()
      and fm.status = 'active'
      and fm.role in ('firm_admin','controller','fractional_cfo')
    )
  );

drop policy if exists "firm members can read briefing events" on public.client_briefing_events;
create policy "firm members can read briefing events" on public.client_briefing_events
  for select using (
    exists (
      select 1 from public.client_briefings cb
      join public.firm_memberships fm on fm.firm_id = cb.firm_id
      where cb.id = client_briefing_events.briefing_id
      and fm.user_id = auth.uid()
      and fm.status = 'active'
    )
  );
