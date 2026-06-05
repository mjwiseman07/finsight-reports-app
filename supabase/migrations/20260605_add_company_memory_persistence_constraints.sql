do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_record_sources_memory_id_fkey'
  ) then
    alter table if exists public.company_memory_record_sources
      add constraint company_memory_record_sources_memory_id_fkey
      foreign key (memory_id)
      references public.company_memory_records (memory_id)
      on update no action
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_record_lineage_memory_id_fkey'
  ) then
    alter table if exists public.company_memory_record_lineage
      add constraint company_memory_record_lineage_memory_id_fkey
      foreign key (memory_id)
      references public.company_memory_records (memory_id)
      on update no action
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_record_audit_memory_id_fkey'
  ) then
    alter table if exists public.company_memory_record_audit
      add constraint company_memory_record_audit_memory_id_fkey
      foreign key (memory_id)
      references public.company_memory_records (memory_id)
      on update no action
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_record_versions_memory_id_fkey'
  ) then
    alter table if exists public.company_memory_record_versions
      add constraint company_memory_record_versions_memory_id_fkey
      foreign key (memory_id)
      references public.company_memory_records (memory_id)
      on update no action
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_record_versions_superseded_by_memory_id_fkey'
  ) then
    alter table if exists public.company_memory_record_versions
      add constraint company_memory_record_versions_superseded_by_memory_id_fkey
      foreign key (superseded_by_memory_id)
      references public.company_memory_records (memory_id)
      on update no action
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_record_retention_events_memory_id_fkey'
  ) then
    alter table if exists public.company_memory_record_retention_events
      add constraint company_memory_record_retention_events_memory_id_fkey
      foreign key (memory_id)
      references public.company_memory_records (memory_id)
      on update no action
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_records_company_group_version_unique'
  ) then
    alter table if exists public.company_memory_records
      add constraint company_memory_records_company_group_version_unique
      unique (company_id, memory_group_id, record_version);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_records_record_input_hash_unique'
  ) then
    alter table if exists public.company_memory_records
      add constraint company_memory_records_record_input_hash_unique
      unique (company_id, record_input_determinism_hash);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_records_persistence_hash_unique'
  ) then
    alter table if exists public.company_memory_records
      add constraint company_memory_records_persistence_hash_unique
      unique (company_id, persistence_determinism_hash);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_record_lineage_company_memory_lineage_hash_unique'
  ) then
    alter table if exists public.company_memory_record_lineage
      add constraint company_memory_record_lineage_company_memory_lineage_hash_unique
      unique (company_id, memory_id, lineage_hash);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_record_audit_company_event_hash_unique'
  ) then
    alter table if exists public.company_memory_record_audit
      add constraint company_memory_record_audit_company_event_hash_unique
      unique (company_id, event_hash);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_record_retention_events_company_event_hash_unique'
  ) then
    alter table if exists public.company_memory_record_retention_events
      add constraint company_memory_record_retention_events_company_event_hash_unique
      unique (company_id, event_hash);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_record_versions_company_group_version_unique'
  ) then
    alter table if exists public.company_memory_record_versions
      add constraint company_memory_record_versions_company_group_version_unique
      unique (company_id, memory_group_id, record_version);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_records_record_version_check'
  ) then
    alter table if exists public.company_memory_records
      add constraint company_memory_records_record_version_check
      check (record_version > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_records_confidence_score_check'
  ) then
    alter table if exists public.company_memory_records
      add constraint company_memory_records_confidence_score_check
      check (confidence_score is null or confidence_score between 0.00 and 1.00);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_records_data_completeness_score_check'
  ) then
    alter table if exists public.company_memory_records
      add constraint company_memory_records_data_completeness_score_check
      check (data_completeness_score is null or data_completeness_score between 0.00 and 1.00);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_records_entity_scope_check'
  ) then
    alter table if exists public.company_memory_records
      add constraint company_memory_records_entity_scope_check
      check (entity_scope is null or entity_scope in ('entity', 'consolidated', 'group'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_records_persistence_status_check'
  ) then
    alter table if exists public.company_memory_records
      add constraint company_memory_records_persistence_status_check
      check (persistence_status in ('pending', 'persisted', 'superseded', 'archived', 'blocked'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_records_intelligence_scope_check'
  ) then
    alter table if exists public.company_memory_records
      add constraint company_memory_records_intelligence_scope_check
      check (intelligence_scope is null or intelligence_scope in ('platform', 'industry', 'customer'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_record_versions_record_version_check'
  ) then
    alter table if exists public.company_memory_record_versions
      add constraint company_memory_record_versions_record_version_check
      check (record_version > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_record_versions_version_status_check'
  ) then
    alter table if exists public.company_memory_record_versions
      add constraint company_memory_record_versions_version_status_check
      check (version_status in ('active', 'superseded', 'archived', 'blocked'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_record_audit_event_type_check'
  ) then
    alter table if exists public.company_memory_record_audit
      add constraint company_memory_record_audit_event_type_check
      check (
        event_type in (
          'memory_persisted',
          'memory_superseded',
          'memory_archived',
          'memory_blocked',
          'retention_updated',
          'legal_hold_enabled',
          'legal_hold_released',
          'governance_status_changed',
          'refresh_status_changed',
          'repair_applied',
          'backfill_applied'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_memory_record_retention_events_event_type_check'
  ) then
    alter table if exists public.company_memory_record_retention_events
      add constraint company_memory_record_retention_events_event_type_check
      check (
        event_type in (
          'retention_updated',
          'legal_hold_enabled',
          'legal_hold_released',
          'memory_archived',
          'memory_superseded',
          'restore_requested'
        )
      );
  end if;
end $$;
