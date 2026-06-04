create table if not exists public.si_snapshot_payloads (
  id uuid primary key default gen_random_uuid(),
  snapshot_id text not null references public.si_historical_snapshots(snapshot_id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  balance_sheet jsonb not null default '[]'::jsonb,
  income_statement jsonb not null default '[]'::jsonb,
  income_statement_ytd jsonb not null default '[]'::jsonb,
  trial_balance jsonb not null default '[]'::jsonb,
  ar_aging jsonb not null default '[]'::jsonb,
  ap_aging jsonb not null default '[]'::jsonb,
  fixed_assets jsonb not null default '[]'::jsonb,
  inventory jsonb not null default '[]'::jsonb,
  payroll jsonb not null default '[]'::jsonb,
  debt jsonb not null default '[]'::jsonb,
  budgets jsonb not null default '[]'::jsonb,
  dimensions jsonb not null default '{}'::jsonb,
  payload_hash text not null,
  payload_schema_version integer not null default 1,
  snapshot_storage_schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint si_snapshot_payloads_snapshot_id_unique unique (snapshot_id),
  constraint si_snapshot_payloads_payload_schema_version_positive_check check (payload_schema_version > 0),
  constraint si_snapshot_payloads_storage_schema_version_positive_check check (snapshot_storage_schema_version > 0)
);

create index if not exists si_snapshot_payloads_snapshot_id_idx
  on public.si_snapshot_payloads (snapshot_id);

create index if not exists si_snapshot_payloads_company_created_idx
  on public.si_snapshot_payloads (company_id, created_at desc);
