create extension if not exists pgcrypto;

create table if not exists public.advisory_signals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  signal_type text not null,
  industry text,
  severity text not null default 'low',
  title text not null,
  description text not null,
  detected_metric text not null,
  detected_period text not null default 'current',
  prior_value numeric,
  current_value numeric,
  variance_amount numeric,
  variance_percent numeric,
  confidence_score numeric not null default 0.75,
  source_module text not null default 'advisory_intelligence',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint advisory_signals_severity_check check (severity in ('low', 'medium', 'high', 'critical')),
  constraint advisory_signals_status_check check (status in ('new', 'reviewed', 'dismissed', 'converted_to_package')),
  constraint advisory_signals_confidence_check check (confidence_score >= 0 and confidence_score <= 1)
);

create table if not exists public.advisory_recommendations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  signal_id uuid references public.advisory_signals(id) on delete cascade,
  recommendation_type text not null,
  title text not null,
  summary text not null,
  recommended_actions jsonb not null default '[]'::jsonb,
  expected_impact text,
  created_at timestamptz not null default now()
);

create table if not exists public.advisory_package_queue (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  package_type text not null,
  trigger_source text not null default 'signal',
  trigger_signal_id uuid references public.advisory_signals(id) on delete set null,
  status text not null default 'pending_review',
  recommended_period text,
  created_at timestamptz not null default now(),
  generated_at timestamptz,
  constraint advisory_package_queue_package_type_check check (package_type in ('month_end', 'ytd', 'board_package', 'healthcare_rcm', 'construction_wip', 'manufacturing_variance')),
  constraint advisory_package_queue_trigger_source_check check (trigger_source in ('manual', 'signal', 'scheduled')),
  constraint advisory_package_queue_status_check check (status in ('pending_review', 'approved', 'generated', 'dismissed'))
);

create index if not exists advisory_signals_company_created_idx
  on public.advisory_signals(company_id, created_at desc);

create index if not exists advisory_signals_company_status_idx
  on public.advisory_signals(company_id, status, severity);

create unique index if not exists advisory_signals_company_metric_period_source_idx
  on public.advisory_signals(company_id, signal_type, detected_metric, detected_period, source_module)
  where status in ('new', 'reviewed', 'converted_to_package');

create index if not exists advisory_recommendations_company_created_idx
  on public.advisory_recommendations(company_id, created_at desc);

create unique index if not exists advisory_recommendations_signal_type_idx
  on public.advisory_recommendations(signal_id, recommendation_type)
  where signal_id is not null;

create index if not exists advisory_package_queue_company_status_idx
  on public.advisory_package_queue(company_id, status, created_at desc);

create unique index if not exists advisory_package_queue_signal_type_pending_idx
  on public.advisory_package_queue(company_id, package_type, trigger_signal_id)
  where trigger_signal_id is not null and status in ('pending_review', 'approved');

alter table public.advisory_signals enable row level security;
alter table public.advisory_recommendations enable row level security;
alter table public.advisory_package_queue enable row level security;

drop policy if exists "service role can manage advisory signals" on public.advisory_signals;
create policy "service role can manage advisory signals"
  on public.advisory_signals
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "company members can read advisory signals" on public.advisory_signals;
create policy "company members can read advisory signals"
  on public.advisory_signals
  for select using (
    exists (
      select 1 from public.company_users cu
      where cu.company_id = advisory_signals.company_id
      and cu.user_id = auth.uid()
      and cu.status = 'active'
    )
  );

drop policy if exists "service role can manage advisory recommendations" on public.advisory_recommendations;
create policy "service role can manage advisory recommendations"
  on public.advisory_recommendations
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "company members can read advisory recommendations" on public.advisory_recommendations;
create policy "company members can read advisory recommendations"
  on public.advisory_recommendations
  for select using (
    exists (
      select 1 from public.company_users cu
      where cu.company_id = advisory_recommendations.company_id
      and cu.user_id = auth.uid()
      and cu.status = 'active'
    )
  );

drop policy if exists "service role can manage advisory package queue" on public.advisory_package_queue;
create policy "service role can manage advisory package queue"
  on public.advisory_package_queue
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "company members can read advisory package queue" on public.advisory_package_queue;
create policy "company members can read advisory package queue"
  on public.advisory_package_queue
  for select using (
    exists (
      select 1 from public.company_users cu
      where cu.company_id = advisory_package_queue.company_id
      and cu.user_id = auth.uid()
      and cu.status = 'active'
    )
  );
