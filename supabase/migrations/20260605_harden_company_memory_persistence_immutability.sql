create or replace function public.prevent_company_memory_record_unsafe_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.legal_hold = true then
      raise exception 'Company memory records cannot be deleted while legal hold is active';
    end if;

    raise exception 'Company memory records cannot be deleted without a future approved compliance workflow';
  end if;

  if tg_op = 'UPDATE' then
    if old.memory_id is distinct from new.memory_id
      or old.memory_group_id is distinct from new.memory_group_id
      or old.memory_key is distinct from new.memory_key
      or old.record_version is distinct from new.record_version
      or old.company_id is distinct from new.company_id
      or old.memory_type is distinct from new.memory_type
      or old.record_input_id is distinct from new.record_input_id
      or old.record_input_determinism_hash is distinct from new.record_input_determinism_hash
      or old.persistence_determinism_hash is distinct from new.persistence_determinism_hash
      or old.source_system is distinct from new.source_system
      or old.tenant_id is distinct from new.tenant_id
      or old.payload is distinct from new.payload
      or old.scenario_metadata is distinct from new.scenario_metadata
      or old.external_signal_metadata is distinct from new.external_signal_metadata
      or old.evidence_metadata is distinct from new.evidence_metadata then
      raise exception 'Company memory immutable record fields cannot be changed after insert';
    end if;

    if old.persistence_status = 'pending'
      and new.persistence_status not in ('pending', 'persisted', 'blocked') then
      raise exception 'Company memory persistence_status can only move from pending to persisted or blocked';
    end if;

    if old.persistence_status = 'persisted'
      and new.persistence_status not in ('persisted', 'superseded', 'archived') then
      raise exception 'Company memory persistence_status can only move from persisted to superseded or archived';
    end if;

    if old.persistence_status = 'superseded'
      and new.persistence_status not in ('superseded', 'archived') then
      raise exception 'Company memory persistence_status can only move from superseded to archived';
    end if;

    if old.persistence_status = 'archived'
      and new.persistence_status <> 'archived' then
      raise exception 'Archived company memory records cannot change persistence_status';
    end if;

    if old.persistence_status = 'blocked'
      and new.persistence_status <> 'blocked' then
      raise exception 'Blocked company memory records must remain blocked; future repair must create a new record or version';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_company_memory_record_unsafe_mutation on public.company_memory_records;
create trigger prevent_company_memory_record_unsafe_mutation
  before update or delete on public.company_memory_records
  for each row
  execute function public.prevent_company_memory_record_unsafe_mutation();

create or replace function public.prevent_company_memory_append_only_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Company memory %.% rows are append-only and cannot be %', tg_table_schema, tg_table_name, tg_op;
end;
$$;

drop trigger if exists prevent_company_memory_record_sources_mutation on public.company_memory_record_sources;
create trigger prevent_company_memory_record_sources_mutation
  before update or delete on public.company_memory_record_sources
  for each row
  execute function public.prevent_company_memory_append_only_mutation();

drop trigger if exists prevent_company_memory_record_lineage_mutation on public.company_memory_record_lineage;
create trigger prevent_company_memory_record_lineage_mutation
  before update or delete on public.company_memory_record_lineage
  for each row
  execute function public.prevent_company_memory_append_only_mutation();

drop trigger if exists prevent_company_memory_record_audit_mutation on public.company_memory_record_audit;
create trigger prevent_company_memory_record_audit_mutation
  before update or delete on public.company_memory_record_audit
  for each row
  execute function public.prevent_company_memory_append_only_mutation();

drop trigger if exists prevent_company_memory_retention_events_mutation on public.company_memory_record_retention_events;
create trigger prevent_company_memory_retention_events_mutation
  before update or delete on public.company_memory_record_retention_events
  for each row
  execute function public.prevent_company_memory_append_only_mutation();

create or replace function public.prevent_company_memory_version_unsafe_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Company memory version rows cannot be deleted';
  end if;

  if old.version_id is distinct from new.version_id
    or old.company_id is distinct from new.company_id
    or old.memory_group_id is distinct from new.memory_group_id
    or old.memory_id is distinct from new.memory_id
    or old.memory_key is distinct from new.memory_key
    or old.record_version is distinct from new.record_version then
    raise exception 'Company memory version identity fields cannot be changed after insert';
  end if;

  if old.version_status = 'active'
    and new.version_status not in ('active', 'superseded', 'archived', 'blocked') then
    raise exception 'Company memory active version status can only move to superseded, archived, or blocked';
  end if;

  if old.version_status = 'superseded'
    and new.version_status not in ('superseded', 'archived') then
    raise exception 'Company memory superseded version status can only move to archived';
  end if;

  if old.version_status = 'archived'
    and new.version_status <> 'archived' then
    raise exception 'Company memory archived version rows cannot change version_status';
  end if;

  if old.version_status = 'blocked'
    and new.version_status <> 'blocked' then
    raise exception 'Company memory blocked version rows must remain blocked';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_company_memory_version_unsafe_mutation on public.company_memory_record_versions;
create trigger prevent_company_memory_version_unsafe_mutation
  before update or delete on public.company_memory_record_versions
  for each row
  execute function public.prevent_company_memory_version_unsafe_mutation();
