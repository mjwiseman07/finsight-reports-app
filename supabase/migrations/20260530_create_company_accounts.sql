create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  revenue_range text,
  employee_count integer,
  accounting_system text,
  reporting_cadence text,
  primary_persona text not null default 'business-owner',
  package_level text not null default 'essential',
  billing_status text not null default 'trial',
  onboarding_status text not null default 'not_started',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_roles (
  role text primary key,
  label text not null,
  permissions jsonb not null default '[]'::jsonb,
  denied_permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null,
  role text not null references public.company_roles(role),
  status text not null default 'active',
  invited_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, user_id)
);

create table if not exists public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role text not null references public.company_roles(role),
  status text not null default 'pending',
  invited_by uuid,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  integrations jsonb not null default '{}'::jsonb,
  permissions jsonb not null default '{}'::jsonb,
  package_scope jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  weekly_brief_enabled boolean not null default true,
  monthly_package_enabled boolean not null default true,
  quarterly_review_enabled boolean not null default false,
  recipient_emails text[] not null default array[]::text[],
  approval_required boolean not null default true,
  auto_send_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.onboarding_progress (
  company_id uuid primary key references public.companies(id) on delete cascade,
  status text not null default 'not_started',
  completed_steps jsonb not null default '[]'::jsonb,
  started_by uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_users_user_id_idx on public.company_users(user_id);
create index if not exists company_users_company_id_idx on public.company_users(company_id);
create index if not exists company_invitations_company_id_idx on public.company_invitations(company_id);
create index if not exists companies_is_demo_idx on public.companies(is_demo);

alter table public.companies enable row level security;
alter table public.company_roles enable row level security;
alter table public.company_users enable row level security;
alter table public.company_invitations enable row level security;
alter table public.company_settings enable row level security;
alter table public.delivery_settings enable row level security;
alter table public.onboarding_progress enable row level security;

drop policy if exists "company members can read their companies" on public.companies;
create policy "company members can read their companies" on public.companies
  for select using (
    exists (
      select 1 from public.company_users cu
      where cu.company_id = companies.id
      and cu.user_id = auth.uid()
      and cu.status = 'active'
    )
  );

drop policy if exists "company admins can manage company users" on public.company_users;
create policy "company admins can manage company users" on public.company_users
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from public.company_users admin_cu
      where admin_cu.company_id = company_users.company_id
      and admin_cu.user_id = auth.uid()
      and admin_cu.role = 'company_admin'
      and admin_cu.status = 'active'
    )
  );

drop policy if exists "company members can read settings" on public.company_settings;
create policy "company members can read settings" on public.company_settings
  for select using (
    exists (
      select 1 from public.company_users cu
      where cu.company_id = company_settings.company_id
      and cu.user_id = auth.uid()
      and cu.status = 'active'
    )
  );

drop policy if exists "company admins can manage delivery settings" on public.delivery_settings;
create policy "company admins can manage delivery settings" on public.delivery_settings
  for all using (
    exists (
      select 1 from public.company_users cu
      where cu.company_id = delivery_settings.company_id
      and cu.user_id = auth.uid()
      and cu.role = 'company_admin'
      and cu.status = 'active'
    )
  );

drop policy if exists "company members can read onboarding progress" on public.onboarding_progress;
create policy "company members can read onboarding progress" on public.onboarding_progress
  for select using (
    exists (
      select 1 from public.company_users cu
      where cu.company_id = onboarding_progress.company_id
      and cu.user_id = auth.uid()
      and cu.status = 'active'
    )
  );

insert into public.company_roles (role, label, permissions, denied_permissions)
values
  ('company_admin', 'Company Admin', '["manage_company_settings","manage_users","manage_package","manage_integrations","manage_delivery_schedules","view_all_company_data"]'::jsonb, '[]'::jsonb),
  ('owner_executive', 'Owner/Executive', '["view_executive_summaries","receive_weekly_briefs","ask_owner_questions","view_reports"]'::jsonb, '["je_testing","ap_cutoff_mechanics","internal_audit_logs","raw_validation_errors","preparer_notes"]'::jsonb),
  ('controller', 'Controller', '["review_close_quality","review_oversight_items","review_schedules","approve_commentary","generate_packages"]'::jsonb, '[]'::jsonb),
  ('bookkeeper', 'Bookkeeper', '["upload_files","review_ap_ar","review_payroll_fte","review_reserves","prepare_package_inputs"]'::jsonb, '[]'::jsonb),
  ('advisor_fractional_cfo', 'Advisor/Fractional CFO', '["executive_commentary","forecasting","budgeting","board_packages","client_advisory_workflows"]'::jsonb, '[]'::jsonb),
  ('viewer', 'Viewer', '["read_approved_reports"]'::jsonb, '[]'::jsonb)
on conflict (role) do update
set label = excluded.label,
    permissions = excluded.permissions,
    denied_permissions = excluded.denied_permissions;
