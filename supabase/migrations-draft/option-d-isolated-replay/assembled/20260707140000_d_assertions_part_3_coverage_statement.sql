-- =============================================================================
-- D-Assertions Part 3 — Coverage Statement (close-packet appendix + snapshot)
-- =============================================================================
begin;

create table if not exists public.assertion_coverage_statement_versions (
  snapshot_id                 uuid primary key default gen_random_uuid(),
  close_packet_id             uuid not null references public.close_packets(id) on delete cascade,
  close_period_id             uuid not null references public.close_periods(id) on delete cascade,
  firm_client_id              uuid not null references public.firm_clients(id) on delete cascade,
  packet_version              integer not null,
  content_json                jsonb  not null,
  content_sha256              text   not null,
  coverage_row_count          integer not null,
  gap_count                   integer not null,
  tested_count                integer not null,
  partial_count               integer not null,
  not_applicable_count        integer not null,
  isa_315_baseline_version    text   not null default 'ISA 315 (Revised 2019)',
  captured_at                 timestamptz not null default now(),
  captured_by_user_id         uuid null,
  unique (close_packet_id, packet_version)
);
comment on table public.assertion_coverage_statement_versions is
  'D-Assertions Part 3 — immutable snapshot of the assertion coverage statement at close-packet lock time. Never updated after creation.';
create index if not exists acsv_by_close_period on public.assertion_coverage_statement_versions (close_period_id, captured_at desc);
create index if not exists acsv_by_firm_client  on public.assertion_coverage_statement_versions (firm_client_id, captured_at desc);
alter table public.assertion_coverage_statement_versions enable row level security;
drop policy if exists "acsv_service_role_all" on public.assertion_coverage_statement_versions;
create policy "acsv_service_role_all"
  on public.assertion_coverage_statement_versions for all to service_role using (true) with check (true);
drop policy if exists "acsv_firm_read" on public.assertion_coverage_statement_versions;
create policy "acsv_firm_read"
  on public.assertion_coverage_statement_versions for select to authenticated
  using (
    exists (
      select 1 from public.firm_memberships fm
      join public.firm_clients fc on fc.firm_id = fm.firm_id
      where fm.user_id = auth.uid()
        and fc.id = assertion_coverage_statement_versions.firm_client_id
    )
  );

create table if not exists public.assertion_coverage_statement_downloads (
  download_id                 uuid primary key default gen_random_uuid(),
  close_period_id             uuid not null references public.close_periods(id) on delete cascade,
  firm_client_id              uuid not null references public.firm_clients(id) on delete cascade,
  requested_by_user_id        uuid null,
  requested_by_email          text null,
  snapshot_id                 uuid null references public.assertion_coverage_statement_versions(snapshot_id) on delete set null,
  content_sha256              text not null,
  byte_size                   bigint not null,
  requested_at                timestamptz not null default now()
);
comment on table public.assertion_coverage_statement_downloads is
  'D-Assertions Part 3 — audit log of every standalone Coverage Statement PDF download for AS 1105 provenance.';
create index if not exists acsd_by_close_period on public.assertion_coverage_statement_downloads (close_period_id, requested_at desc);
create index if not exists acsd_by_firm_client  on public.assertion_coverage_statement_downloads (firm_client_id, requested_at desc);
alter table public.assertion_coverage_statement_downloads enable row level security;
drop policy if exists "acsd_service_role_all" on public.assertion_coverage_statement_downloads;
create policy "acsd_service_role_all"
  on public.assertion_coverage_statement_downloads for all to service_role using (true) with check (true);
drop policy if exists "acsd_firm_read" on public.assertion_coverage_statement_downloads;
create policy "acsd_firm_read"
  on public.assertion_coverage_statement_downloads for select to authenticated
  using (
    exists (
      select 1 from public.firm_memberships fm
      join public.firm_clients fc on fc.firm_id = fm.firm_id
      where fm.user_id = auth.uid()
        and fc.id = assertion_coverage_statement_downloads.firm_client_id
    )
  );

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='close_assertion_coverage') then
    raise exception 'D-Assertions Part 2 close_assertion_coverage missing — Part 3 requires Part 2 applied first';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='assertion_gap_root_causes') then
    raise exception 'D-Assertions Part 2 assertion_gap_root_causes missing — Part 3 requires Part 2 applied first';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='assertions_catalog') then
    raise exception 'D-Assertions Part 1 assertions_catalog missing — Part 3 requires Part 1 applied first';
  end if;
end $$;

commit;
