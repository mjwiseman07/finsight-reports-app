create table if not exists public.si_snapshot_retention_events (
  id uuid primary key default gen_random_uuid(),
  retention_event_id text not null,
  snapshot_id text not null references public.si_historical_snapshots(snapshot_id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  event_type text not null,
  event_reason text,
  retention_policy text,
  retention_expires_at timestamptz,
  legal_hold boolean not null default false,
  performed_by uuid,
  performed_by_role text,
  created_at timestamptz not null default now(),
  constraint si_snapshot_retention_events_event_id_unique unique (retention_event_id),
  constraint si_snapshot_retention_events_type_check check (
    event_type in (
      'retained',
      'archived',
      'restored',
      'deleted',
      'legal_hold_applied',
      'legal_hold_released',
      'retention_extended',
      'retention_expired'
    )
  )
);

create index if not exists si_snapshot_retention_events_company_created_idx
  on public.si_snapshot_retention_events (company_id, created_at desc);

create index if not exists si_snapshot_retention_events_snapshot_created_idx
  on public.si_snapshot_retention_events (snapshot_id, created_at desc);

create index if not exists si_snapshot_retention_events_type_created_idx
  on public.si_snapshot_retention_events (event_type, created_at desc);

create index if not exists si_snapshot_retention_events_legal_hold_created_idx
  on public.si_snapshot_retention_events (legal_hold, created_at desc);
