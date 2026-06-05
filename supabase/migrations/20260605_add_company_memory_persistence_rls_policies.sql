alter table if exists public.company_memory_records enable row level security;
alter table if exists public.company_memory_record_sources enable row level security;
alter table if exists public.company_memory_record_lineage enable row level security;
alter table if exists public.company_memory_record_audit enable row level security;
alter table if exists public.company_memory_record_versions enable row level security;
alter table if exists public.company_memory_record_retention_events enable row level security;

drop policy if exists "service role can manage company memory records" on public.company_memory_records;
create policy "service role can manage company memory records"
  on public.company_memory_records
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "company members can read company memory records" on public.company_memory_records;
create policy "company members can read company memory records"
  on public.company_memory_records
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_users cu
      where cu.company_id = company_memory_records.company_id
        and cu.user_id = auth.uid()
        and cu.status = 'active'
    )
  );

drop policy if exists "service role can manage company memory record sources" on public.company_memory_record_sources;
create policy "service role can manage company memory record sources"
  on public.company_memory_record_sources
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "company members can read company memory record sources" on public.company_memory_record_sources;
create policy "company members can read company memory record sources"
  on public.company_memory_record_sources
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_users cu
      where cu.company_id = company_memory_record_sources.company_id
        and cu.user_id = auth.uid()
        and cu.status = 'active'
    )
  );

drop policy if exists "service role can manage company memory record lineage" on public.company_memory_record_lineage;
create policy "service role can manage company memory record lineage"
  on public.company_memory_record_lineage
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "company members can read company memory record lineage" on public.company_memory_record_lineage;
create policy "company members can read company memory record lineage"
  on public.company_memory_record_lineage
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_users cu
      where cu.company_id = company_memory_record_lineage.company_id
        and cu.user_id = auth.uid()
        and cu.status = 'active'
    )
  );

drop policy if exists "service role can manage company memory record audit" on public.company_memory_record_audit;
create policy "service role can manage company memory record audit"
  on public.company_memory_record_audit
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "company members can read company memory record audit" on public.company_memory_record_audit;
create policy "company members can read company memory record audit"
  on public.company_memory_record_audit
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_users cu
      where cu.company_id = company_memory_record_audit.company_id
        and cu.user_id = auth.uid()
        and cu.status = 'active'
    )
  );

drop policy if exists "service role can manage company memory record versions" on public.company_memory_record_versions;
create policy "service role can manage company memory record versions"
  on public.company_memory_record_versions
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "company members can read company memory record versions" on public.company_memory_record_versions;
create policy "company members can read company memory record versions"
  on public.company_memory_record_versions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_users cu
      where cu.company_id = company_memory_record_versions.company_id
        and cu.user_id = auth.uid()
        and cu.status = 'active'
    )
  );

drop policy if exists "service role can manage company memory record retention events" on public.company_memory_record_retention_events;
create policy "service role can manage company memory record retention events"
  on public.company_memory_record_retention_events
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "company members can read company memory record retention events" on public.company_memory_record_retention_events;
create policy "company members can read company memory record retention events"
  on public.company_memory_record_retention_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_users cu
      where cu.company_id = company_memory_record_retention_events.company_id
        and cu.user_id = auth.uid()
        and cu.status = 'active'
    )
  );
