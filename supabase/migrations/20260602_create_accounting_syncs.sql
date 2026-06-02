create table if not exists public.accounting_syncs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  connection_id uuid not null references public.accounting_connections(id) on delete cascade,
  source_system text not null,
  adapter_name text,
  tenant_id text,
  tenant_name text,
  report_period_start date not null,
  report_period_end date not null,
  normalized_payload jsonb not null,
  raw_reports_pulled jsonb,
  validation_status text not null,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists accounting_syncs_source_connection_idx
  on public.accounting_syncs (company_id, connection_id, source_system, created_at desc);

alter table public.accounting_syncs enable row level security;

drop policy if exists "accounting_syncs_service_role_all" on public.accounting_syncs;
create policy "accounting_syncs_service_role_all"
  on public.accounting_syncs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
