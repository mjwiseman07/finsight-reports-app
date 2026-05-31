create extension if not exists pgcrypto;

create table if not exists public.pulse_insight_memory (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  client_id uuid,
  user_id uuid,
  date_identified date not null default current_date,
  insight_category text not null,
  insight_type text not null default 'risk',
  severity text not null default 'medium',
  description text not null,
  financial_impact numeric,
  financial_impact_label text,
  recommended_action text,
  status text not null default 'open',
  current_trend text not null default 'monitoring',
  follow_up_notes text,
  source_type text not null default 'pulse',
  source_reference jsonb not null default '{}'::jsonb,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pulse_insight_memory_company_date_idx
  on public.pulse_insight_memory(company_id, date_identified desc);

create index if not exists pulse_insight_memory_client_date_idx
  on public.pulse_insight_memory(client_id, date_identified desc);

create index if not exists pulse_insight_memory_user_date_idx
  on public.pulse_insight_memory(user_id, date_identified desc);

create index if not exists pulse_insight_memory_status_idx
  on public.pulse_insight_memory(status, current_trend);

alter table public.pulse_insight_memory enable row level security;

drop policy if exists "users can read their pulse insight memory" on public.pulse_insight_memory;
create policy "users can read their pulse insight memory" on public.pulse_insight_memory
  for select using (user_id = auth.uid());

drop policy if exists "users can insert their pulse insight memory" on public.pulse_insight_memory;
create policy "users can insert their pulse insight memory" on public.pulse_insight_memory
  for insert with check (user_id = auth.uid());

drop policy if exists "users can update their pulse insight memory" on public.pulse_insight_memory;
create policy "users can update their pulse insight memory" on public.pulse_insight_memory
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Categories used by the Pulse CFO Memory Engine:
-- Revenue, Cash Flow, Payroll, Profitability, Gross Margin, Accounts Receivable,
-- Accounts Payable, Inventory, Staffing, Industry Specific Metrics.
