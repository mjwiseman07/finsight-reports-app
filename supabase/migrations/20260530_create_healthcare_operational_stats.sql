create table if not exists public.healthcare_operational_stats (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_type text not null check (period_type in ('month', 'quarter', 'year')),
  period_label text not null,
  period_start date,
  period_end date,
  patient_days numeric not null default 0,
  total_operating_expenses numeric not null default 0,
  payroll_expense numeric not null default 0,
  total_revenue numeric not null default 0,
  medical_supplies_expense numeric not null default 0,
  contract_labor_expense numeric not null default 0,
  input_source text not null default 'manual' check (input_source in ('manual', 'uploaded_census_data', 'imported_operational_statistics')),
  census_file_name text,
  import_batch_id text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, period_type, period_label)
);

create index if not exists healthcare_operational_stats_company_id_idx on public.healthcare_operational_stats(company_id);
create index if not exists healthcare_operational_stats_period_idx on public.healthcare_operational_stats(company_id, period_type, period_start);

alter table public.healthcare_operational_stats enable row level security;

drop policy if exists "company members can read healthcare stats" on public.healthcare_operational_stats;
create policy "company members can read healthcare stats" on public.healthcare_operational_stats
  for select using (
    exists (
      select 1 from public.company_users cu
      where cu.company_id = healthcare_operational_stats.company_id
      and cu.user_id = auth.uid()
      and cu.status = 'active'
    )
  );

drop policy if exists "company preparers can manage healthcare stats" on public.healthcare_operational_stats;
create policy "company preparers can manage healthcare stats" on public.healthcare_operational_stats
  for all using (
    exists (
      select 1 from public.company_users cu
      where cu.company_id = healthcare_operational_stats.company_id
      and cu.user_id = auth.uid()
      and cu.status = 'active'
      and cu.role in ('company_admin', 'controller', 'bookkeeper', 'advisor_fractional_cfo')
    )
  );
