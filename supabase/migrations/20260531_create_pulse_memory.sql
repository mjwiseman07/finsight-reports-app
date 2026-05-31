create extension if not exists pgcrypto;

create table if not exists public.pulse_historical_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  client_id uuid,
  user_id uuid,
  period_start date not null,
  period_end date not null,
  profit_and_loss jsonb not null default '{}'::jsonb,
  balance_sheet jsonb not null default '{}'::jsonb,
  cash_flow jsonb not null default '{}'::jsonb,
  payroll jsonb not null default '{}'::jsonb,
  employee_counts jsonb not null default '{}'::jsonb,
  customer_metrics jsonb not null default '{}'::jsonb,
  vendor_metrics jsonb not null default '{}'::jsonb,
  industry_metrics jsonb not null default '{}'::jsonb,
  forecast_data jsonb not null default '{}'::jsonb,
  generated_forecasts jsonb not null default '[]'::jsonb,
  generated_reports jsonb not null default '[]'::jsonb,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pulse_historical_snapshots_company_period_idx
  on public.pulse_historical_snapshots(company_id, period_end desc);

create index if not exists pulse_historical_snapshots_client_period_idx
  on public.pulse_historical_snapshots(client_id, period_end desc);

create index if not exists pulse_historical_snapshots_user_period_idx
  on public.pulse_historical_snapshots(user_id, period_end desc);

create table if not exists public.pulse_conversation_memory (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  client_id uuid,
  user_id uuid,
  question text not null,
  response text not null,
  intent text,
  source_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pulse_conversation_memory_company_created_idx
  on public.pulse_conversation_memory(company_id, created_at desc);

create index if not exists pulse_conversation_memory_client_created_idx
  on public.pulse_conversation_memory(client_id, created_at desc);

create index if not exists pulse_conversation_memory_user_created_idx
  on public.pulse_conversation_memory(user_id, created_at desc);

alter table public.pulse_historical_snapshots enable row level security;
alter table public.pulse_conversation_memory enable row level security;

drop policy if exists "users can read their pulse historical snapshots" on public.pulse_historical_snapshots;
create policy "users can read their pulse historical snapshots" on public.pulse_historical_snapshots
  for select using (user_id = auth.uid());

drop policy if exists "users can read their pulse conversation memory" on public.pulse_conversation_memory;
create policy "users can read their pulse conversation memory" on public.pulse_conversation_memory
  for select using (user_id = auth.uid());

-- Keep the app-facing memory window to a rolling 12 months per client/company.
-- Server jobs should upsert monthly snapshots and may prune records older than 12 months after a successful import.
