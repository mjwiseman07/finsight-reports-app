create extension if not exists pgcrypto;

create table if not exists public.pdf_package_customizations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  client_id uuid,
  user_id uuid not null,
  package_period text,
  report_key text not null,
  report_title text not null,
  subscription_plan text,
  recurrence text not null default 'one_time',
  status text not null default 'pending_confirmation',
  request_text text not null,
  pulse_response text,
  report_payload jsonb not null default '{}'::jsonb,
  added_to_table_of_contents boolean not null default true,
  added_to_executive_summary boolean not null default false,
  section_placement text not null default 'supporting_schedules',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pdf_package_customizations_user_created_idx
  on public.pdf_package_customizations(user_id, created_at desc);

create index if not exists pdf_package_customizations_company_report_idx
  on public.pdf_package_customizations(company_id, report_key, recurrence);

alter table public.pdf_package_customizations enable row level security;

drop policy if exists "users can read their pdf package customizations" on public.pdf_package_customizations;
create policy "users can read their pdf package customizations" on public.pdf_package_customizations
  for select using (user_id = auth.uid());

drop policy if exists "users can insert their pdf package customizations" on public.pdf_package_customizations;
create policy "users can insert their pdf package customizations" on public.pdf_package_customizations
  for insert with check (user_id = auth.uid());

drop policy if exists "users can update their pdf package customizations" on public.pdf_package_customizations;
create policy "users can update their pdf package customizations" on public.pdf_package_customizations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Recurrence values: one_time, monthly, quarterly, year_end.
-- Placement values: executive_summary, financial_statements, supporting_schedules, board_package, appendix.
