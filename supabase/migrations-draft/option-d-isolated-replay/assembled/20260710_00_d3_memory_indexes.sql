-- === D3: Historical Learning Engine — indexes + targeted immutability relaxation ===
--
-- company_memory_records has no firm_client_id column (identity is company_id,
-- resolved from firm_clients). D3 patterns are queried by (company_id,
-- memory_type, updated_at), so the index is built on company_id.

CREATE INDEX IF NOT EXISTS idx_company_memory_type_client
  ON company_memory_records(company_id, memory_type, updated_at DESC);

-- --------------------------------------------------------------------------
-- Payload immutability is relaxed for the four D3 learning pattern types so
-- the learning engine can upsert derived statistics in place on a
-- deterministic memory_id (re-scan increments sample_count instead of
-- duplicating rows). Governance/analytical memory types (advisor_feedback,
-- threshold_override, recommendation_outcome, posted_je, etc.) keep full
-- payload immutability.
--
-- Because the original umbrella trigger (20260605_harden...) enforces payload
-- immutability for ALL rows, we must (1) drop the payload clause from that
-- umbrella function and (2) delegate payload immutability to a dedicated
-- trigger that exempts the learning types. The umbrella trigger continues to
-- guard identity fields, the persistence_status state machine, deletes, and
-- the other derived-metadata jsonb columns.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_company_memory_record_unsafe_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  if tg_op = 'DELETE' then
    if old.legal_hold = true then
      raise exception 'Company memory records cannot be deleted while legal hold is active';
    end if;

    raise exception 'Company memory records cannot be deleted without a future approved compliance workflow';
  end if;

  if tg_op = 'UPDATE' then
    -- payload immutability is enforced by prevent_memory_payload_update()
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

-- Dedicated payload-immutability trigger. Learning pattern types may mutate
-- payload; all other memory types keep payload immutable after insert.
CREATE OR REPLACE FUNCTION public.prevent_memory_payload_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  if new.memory_type in ('vendor_gl_mapping', 'recurring_pattern', 'amount_range', 'scan_run') then
    return new;
  end if;

  if new.payload is distinct from old.payload then
    raise exception 'company_memory_records.payload is immutable for memory_type=%', old.memory_type;
  end if;

  return new;
end;
$$;

DROP TRIGGER IF EXISTS prevent_memory_payload_update ON public.company_memory_records;
CREATE TRIGGER prevent_memory_payload_update
  BEFORE UPDATE ON public.company_memory_records
  FOR EACH ROW EXECUTE FUNCTION public.prevent_memory_payload_update();
