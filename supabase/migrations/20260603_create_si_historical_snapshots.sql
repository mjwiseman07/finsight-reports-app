create extension if not exists pgcrypto;

create table if not exists public.si_historical_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  source_system text not null,
  adapter_name text,
  tenant_id text,
  tenant_name text not null,
  connection_id uuid references public.accounting_connections(id) on delete set null,
  sync_id text not null,
  report_period_start date not null,
  report_period_end date not null,
  period_key text not null,
  snapshot_version integer not null,
  snapshot_storage_schema_version integer not null default 1,
  snapshot_persistence_version integer not null default 1,
  snapshot_write_source text not null,
  snapshot_status text not null default 'draft',
  source_sync_status text not null,
  snapshot_lineage jsonb not null,
  snapshot_industry_context jsonb not null default '{}'::jsonb,
  supersedes_snapshot_id text,
  superseded_by_snapshot_id text,
  finalized_at timestamptz,
  retention_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint si_historical_snapshots_snapshot_id_unique unique (snapshot_id),
  constraint si_historical_snapshots_identity_version_unique unique (company_id, source_system, tenant_id, period_key, snapshot_version),
  constraint si_historical_snapshots_status_check check (snapshot_status in ('draft', 'finalized', 'superseded', 'invalid')),
  constraint si_historical_snapshots_version_positive_check check (snapshot_version > 0),
  constraint si_historical_snapshots_storage_schema_version_positive_check check (snapshot_storage_schema_version > 0),
  constraint si_historical_snapshots_persistence_version_positive_check check (snapshot_persistence_version > 0),
  constraint si_historical_snapshots_write_source_check check (snapshot_write_source in ('sync', 'backfill', 'repair', 'migration', 'manual_import')),
  constraint si_historical_snapshots_finalized_at_check check (
    snapshot_status not in ('finalized', 'superseded') or finalized_at is not null
  )
);

create index if not exists si_historical_snapshots_identity_version_idx
  on public.si_historical_snapshots (company_id, source_system, tenant_id, period_key desc, snapshot_version desc);

create index if not exists si_historical_snapshots_status_period_idx
  on public.si_historical_snapshots (company_id, source_system, tenant_id, snapshot_status, period_key desc);

create index if not exists si_historical_snapshots_latest_finalized_idx
  on public.si_historical_snapshots (company_id, source_system, tenant_id, period_key desc, snapshot_version desc)
  where snapshot_status = 'finalized';

create index if not exists si_historical_snapshots_connection_created_idx
  on public.si_historical_snapshots (connection_id, created_at desc);

create index if not exists si_historical_snapshots_sync_id_idx
  on public.si_historical_snapshots (sync_id);

create index if not exists si_historical_snapshots_write_source_created_idx
  on public.si_historical_snapshots (snapshot_write_source, created_at desc);

create index if not exists si_historical_snapshots_persistence_version_created_idx
  on public.si_historical_snapshots (snapshot_persistence_version, created_at desc);
