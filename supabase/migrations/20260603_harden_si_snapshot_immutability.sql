-- Phase 17C: SI snapshot immutability hardening.
--
-- Required persistence ownership flow:
--   Persistence Service
--     -> si_historical_snapshots metadata
--     -> si_snapshot_payloads payload
--     -> si_snapshot_audit audit
--
-- Direct application writes to si_snapshot_payloads or si_snapshot_audit are not
-- a supported integrity pattern. Payload and audit rows must belong to an
-- existing metadata row and are locked once the parent snapshot is finalized or
-- superseded.

create or replace function public.prevent_si_snapshot_metadata_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.snapshot_status in ('finalized', 'superseded') then
      raise exception 'SI snapshot metadata is immutable once finalized or superseded';
    end if;

    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.snapshot_status = 'superseded' then
      raise exception 'Superseded SI snapshot metadata is immutable';
    end if;

    if old.snapshot_status = 'finalized' then
      if new.snapshot_status = 'superseded'
        and new.superseded_by_snapshot_id is not null
        and (to_jsonb(new) - 'snapshot_status' - 'superseded_by_snapshot_id' - 'updated_at')
          = (to_jsonb(old) - 'snapshot_status' - 'superseded_by_snapshot_id' - 'updated_at') then
        return new;
      end if;

      raise exception 'Finalized SI snapshot metadata only allows transition to superseded with superseded_by_snapshot_id and updated_at';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_si_snapshot_metadata_mutation on public.si_historical_snapshots;
create trigger prevent_si_snapshot_metadata_mutation
  before update or delete on public.si_historical_snapshots
  for each row
  execute function public.prevent_si_snapshot_metadata_mutation();

create or replace function public.prevent_si_snapshot_child_mutation_when_parent_locked()
returns trigger
language plpgsql
as $$
declare
  parent_status text;
begin
  select snapshot_status
  into parent_status
  from public.si_historical_snapshots
  where snapshot_id = old.snapshot_id;

  if parent_status in ('finalized', 'superseded') then
    raise exception 'SI snapshot child rows are immutable when parent snapshot is finalized or superseded';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_si_snapshot_payload_mutation_when_parent_locked on public.si_snapshot_payloads;
create trigger prevent_si_snapshot_payload_mutation_when_parent_locked
  before update or delete on public.si_snapshot_payloads
  for each row
  execute function public.prevent_si_snapshot_child_mutation_when_parent_locked();

drop trigger if exists prevent_si_snapshot_audit_mutation_when_parent_locked on public.si_snapshot_audit;
create trigger prevent_si_snapshot_audit_mutation_when_parent_locked
  before update or delete on public.si_snapshot_audit
  for each row
  execute function public.prevent_si_snapshot_child_mutation_when_parent_locked();
