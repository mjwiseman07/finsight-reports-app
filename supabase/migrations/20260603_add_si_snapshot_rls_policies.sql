alter table public.si_historical_snapshots enable row level security;
alter table public.si_snapshot_payloads enable row level security;
alter table public.si_snapshot_audit enable row level security;
alter table public.si_snapshot_backfill_runs enable row level security;
alter table public.si_snapshot_retrieval_log enable row level security;
alter table public.si_snapshot_retention_events enable row level security;

drop policy if exists "service role can manage si historical snapshots" on public.si_historical_snapshots;
create policy "service role can manage si historical snapshots"
  on public.si_historical_snapshots
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "company members can read si historical snapshots" on public.si_historical_snapshots;
create policy "company members can read si historical snapshots"
  on public.si_historical_snapshots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_users cu
      where cu.company_id = si_historical_snapshots.company_id
        and cu.user_id = auth.uid()
        and cu.status = 'active'
    )
  );

drop policy if exists "service role can manage si snapshot payloads" on public.si_snapshot_payloads;
create policy "service role can manage si snapshot payloads"
  on public.si_snapshot_payloads
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "company members can read si snapshot payloads" on public.si_snapshot_payloads;
create policy "company members can read si snapshot payloads"
  on public.si_snapshot_payloads
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_users cu
      where cu.company_id = si_snapshot_payloads.company_id
        and cu.user_id = auth.uid()
        and cu.status = 'active'
    )
  );

drop policy if exists "service role can manage si snapshot audit" on public.si_snapshot_audit;
create policy "service role can manage si snapshot audit"
  on public.si_snapshot_audit
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "company members can read si snapshot audit" on public.si_snapshot_audit;
create policy "company members can read si snapshot audit"
  on public.si_snapshot_audit
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_users cu
      where cu.company_id = si_snapshot_audit.company_id
        and cu.user_id = auth.uid()
        and cu.status = 'active'
    )
  );

drop policy if exists "service role can manage si snapshot backfill runs" on public.si_snapshot_backfill_runs;
create policy "service role can manage si snapshot backfill runs"
  on public.si_snapshot_backfill_runs
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "company members can read si snapshot backfill runs" on public.si_snapshot_backfill_runs;
create policy "company members can read si snapshot backfill runs"
  on public.si_snapshot_backfill_runs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_users cu
      where cu.company_id = si_snapshot_backfill_runs.company_id
        and cu.user_id = auth.uid()
        and cu.status = 'active'
    )
  );

drop policy if exists "service role can manage si snapshot retrieval log" on public.si_snapshot_retrieval_log;
create policy "service role can manage si snapshot retrieval log"
  on public.si_snapshot_retrieval_log
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "company members can read si snapshot retrieval log" on public.si_snapshot_retrieval_log;
create policy "company members can read si snapshot retrieval log"
  on public.si_snapshot_retrieval_log
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_users cu
      where cu.company_id = si_snapshot_retrieval_log.company_id
        and cu.user_id = auth.uid()
        and cu.status = 'active'
    )
  );

drop policy if exists "service role can manage si snapshot retention events" on public.si_snapshot_retention_events;
create policy "service role can manage si snapshot retention events"
  on public.si_snapshot_retention_events
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "company members can read si snapshot retention events" on public.si_snapshot_retention_events;
create policy "company members can read si snapshot retention events"
  on public.si_snapshot_retention_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_users cu
      where cu.company_id = si_snapshot_retention_events.company_id
        and cu.user_id = auth.uid()
        and cu.status = 'active'
    )
  );
