create table if not exists public.si_snapshot_retrieval_log (
  id uuid primary key default gen_random_uuid(),
  retrieval_id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  requested_by uuid,
  requested_by_role text,
  source_system text not null,
  tenant_id text,
  retrieval_type text not null,
  version_policy text not null,
  end_period text,
  window integer,
  exact_version integer,
  include_superseded boolean not null default false,
  snapshot_ids text[] not null default array[]::text[],
  result_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint si_snapshot_retrieval_log_retrieval_id_unique unique (retrieval_id),
  constraint si_snapshot_retrieval_log_type_check check (retrieval_type in ('latest_finalized', 'exact_version', 'window')),
  constraint si_snapshot_retrieval_log_version_policy_check check (version_policy in ('latest_finalized', 'include_superseded', 'exact_version')),
  constraint si_snapshot_retrieval_log_window_check check (window is null or window in (12, 24, 36, 60)),
  constraint si_snapshot_retrieval_log_exact_version_check check (exact_version is null or exact_version > 0),
  constraint si_snapshot_retrieval_log_result_count_check check (result_count >= 0)
);

create index if not exists si_snapshot_retrieval_log_company_created_idx
  on public.si_snapshot_retrieval_log (company_id, created_at desc);

create index if not exists si_snapshot_retrieval_log_requested_by_created_idx
  on public.si_snapshot_retrieval_log (requested_by, created_at desc);

create index if not exists si_snapshot_retrieval_log_source_tenant_created_idx
  on public.si_snapshot_retrieval_log (source_system, tenant_id, created_at desc);
