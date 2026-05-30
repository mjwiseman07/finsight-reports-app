create extension if not exists pgcrypto;

create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (
    job_type in (
      'PDF generation',
      'PowerPoint generation',
      'Weekly Executive Brief',
      'Monthly Executive Package',
      'AI Commentary Generation',
      'Forecast Generation',
      'Oversight Review'
    )
  ),
  status text not null default 'Scheduled' check (
    status in (
      'Scheduled',
      'Queued',
      'Processing',
      'Awaiting Approval',
      'Sent',
      'Failed'
    )
  ),
  company_id text not null,
  persona_mode text not null default 'Business Owner',
  package_level text not null default 'Virtual CFO',
  created_by uuid null,
  error_message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists background_jobs_company_id_idx on public.background_jobs (company_id);
create index if not exists background_jobs_status_idx on public.background_jobs (status);
create index if not exists background_jobs_created_at_idx on public.background_jobs (created_at desc);

alter table public.background_jobs enable row level security;

drop policy if exists "background_jobs_service_role_all" on public.background_jobs;
create policy "background_jobs_service_role_all"
on public.background_jobs
for all
to service_role
using (true)
with check (true);
