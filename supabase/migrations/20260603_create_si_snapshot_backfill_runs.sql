create table if not exists public.si_snapshot_backfill_runs (
  id uuid primary key default gen_random_uuid(),
  backfill_run_id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  source_system text not null,
  tenant_id text,
  connection_id uuid references public.accounting_connections(id) on delete set null,
  requested_window integer not null,
  requested_periods text[] not null default array[]::text[],
  completed_periods text[] not null default array[]::text[],
  failed_periods text[] not null default array[]::text[],
  missing_periods text[] not null default array[]::text[],
  status text not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  provider_rate_limit_notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint si_snapshot_backfill_runs_run_id_unique unique (backfill_run_id),
  constraint si_snapshot_backfill_runs_window_check check (requested_window in (12, 24, 36, 60)),
  constraint si_snapshot_backfill_runs_status_check check (status in ('pending', 'running', 'completed', 'partial', 'failed', 'cancelled'))
);

create index if not exists si_snapshot_backfill_runs_company_source_created_idx
  on public.si_snapshot_backfill_runs (company_id, source_system, tenant_id, created_at desc);

create index if not exists si_snapshot_backfill_runs_status_created_idx
  on public.si_snapshot_backfill_runs (status, created_at desc);

create index if not exists si_snapshot_backfill_runs_connection_created_idx
  on public.si_snapshot_backfill_runs (connection_id, created_at desc);
