create table if not exists public.si_snapshot_audit (
  id uuid primary key default gen_random_uuid(),
  snapshot_id text not null references public.si_historical_snapshots(snapshot_id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  snapshot_version integer not null,
  snapshot_storage_schema_version integer not null default 1,
  created_by_process text not null,
  source_sync_id text not null,
  normalized_data_hash text not null,
  payload_hash text not null,
  validation_warnings jsonb not null default '[]'::jsonb,
  availability_summary jsonb not null default '{}'::jsonb,
  snapshot_industry_context jsonb not null default '{}'::jsonb,
  snapshot_quality_score numeric not null,
  snapshot_quality_factors jsonb not null default '[]'::jsonb,
  supersedes_snapshot_id text,
  superseded_by_snapshot_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint si_snapshot_audit_snapshot_id_unique unique (snapshot_id),
  constraint si_snapshot_audit_version_positive_check check (snapshot_version > 0),
  constraint si_snapshot_audit_storage_schema_version_positive_check check (snapshot_storage_schema_version > 0),
  constraint si_snapshot_audit_quality_score_check check (snapshot_quality_score >= 0 and snapshot_quality_score <= 1)
);

create index if not exists si_snapshot_audit_company_created_idx
  on public.si_snapshot_audit (company_id, created_at desc);

create index if not exists si_snapshot_audit_normalized_data_hash_idx
  on public.si_snapshot_audit (normalized_data_hash);

create index if not exists si_snapshot_audit_payload_hash_idx
  on public.si_snapshot_audit (payload_hash);

create index if not exists si_snapshot_audit_company_quality_score_idx
  on public.si_snapshot_audit (company_id, snapshot_quality_score);
