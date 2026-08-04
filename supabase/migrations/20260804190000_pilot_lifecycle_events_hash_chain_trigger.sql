-- Phase MEM-LIFECYCLE Block 2 — in-transaction hash-chain enforcement
--
-- Guarantee: every row in pilot_lifecycle_events has row_hash computed
-- in-transaction from prev_hash || canonical_payload. Application code
-- CANNOT set these fields; the trigger overwrites them. No network hop.
--
-- Isolation: trigger reads pilot_slots.{company_id, firm_id} and overrides
-- NEW.company_id / NEW.firm_id with the authoritative values. If pilot_slot
-- does not exist, INSERT is rejected.
--
-- Append-only: UPDATE and DELETE are rejected outright. Corrections happen
-- as additional INSERTs (per TigerBeetle append-only doctrine and the
-- "audit trail is sacred" principle from lib/assertions/opportunity-worker).
--
-- Ordering: prev_hash is the row_hash of the immediately-prior row for the
-- same (company_id, firm_id) partition, ordered by event_at DESC then id
-- DESC. NULL only for the first row in a partition.
--
-- Fail-closed: any error inside the trigger aborts the transaction. This
-- is intentional — the audit-log-writer doctrine (fail-closed on audit
-- write failure) applies here too.

-- ---------------------------------------------------------------------------
-- canonical_payload function
-- ---------------------------------------------------------------------------
-- Serializes the row's semantic content (excluding hash columns and
-- auto-generated id/created_at) into a deterministic text blob suitable
-- for hashing. Key ordering is enforced by the explicit jsonb_build_object
-- key sequence. Uses ::text of jsonb to get canonical form.
--
-- Purposely excludes: id, prev_hash, row_hash, created_at. These are
-- either random (id), computed (hash columns), or non-semantic (created_at).
-- event_at IS included because it's the semantic timestamp.

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_canonical_payload(
  p_event_kind text,
  p_event_at timestamptz,
  p_schema_version text,
  p_pilot_slot_id uuid,
  p_from_status text,
  p_to_status text,
  p_classification_hint text,
  p_company_id uuid,
  p_firm_id uuid,
  p_actor_kind text,
  p_actor_user_id uuid,
  p_actor_via text,
  p_assertions_covered text[],
  p_evidence_refs jsonb,
  p_reason_code text,
  p_reason_text text,
  p_payload jsonb
) RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'event_kind', p_event_kind,
    'event_at', to_char(p_event_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'schema_version', p_schema_version,
    'pilot_slot_id', p_pilot_slot_id::text,
    'from_status', p_from_status,
    'to_status', p_to_status,
    'classification_hint', p_classification_hint,
    'company_id', p_company_id::text,
    'firm_id', p_firm_id::text,
    'actor_kind', p_actor_kind,
    'actor_user_id', p_actor_user_id::text,
    'actor_via', p_actor_via,
    'assertions_covered', to_jsonb(
      ARRAY(SELECT unnest(p_assertions_covered) ORDER BY 1)
    ),
    'evidence_refs', p_evidence_refs,
    'reason_code', p_reason_code,
    'reason_text', p_reason_text,
    'payload', p_payload
  )::text
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_canonical_payload IS
  'Deterministic serializer for hash-chain input. Excludes id/created_at/prev_hash/row_hash. Assertions are sorted alphabetically so a{existence,completeness} hashes identically to {completeness,existence}.';

-- ---------------------------------------------------------------------------
-- BEFORE INSERT trigger: resolve isolation, chain hash, populate hash cols
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_slot_company_id uuid;
  v_slot_firm_id uuid;
  v_prev_hash text;
  v_canonical text;
BEGIN
  -- Step 1: Resolve authoritative isolation from pilot_slots.
  -- Reject if the referenced slot does not exist.
  SELECT company_id, firm_id
    INTO v_slot_company_id, v_slot_firm_id
  FROM public.pilot_slots
  WHERE id = NEW.pilot_slot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: pilot_slot_id % does not exist',
      NEW.pilot_slot_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Overwrite caller-supplied isolation with authoritative values.
  -- pilot_slots enforces XOR (exactly one of company_id / firm_id is
  -- non-null), so this always satisfies pilot_lifecycle_events_isolation_chk.
  NEW.company_id := v_slot_company_id;
  NEW.firm_id := v_slot_firm_id;

  -- Step 2: Reject caller-supplied hash values. Application code MUST NOT
  -- set prev_hash or row_hash. If it did, that's a bug — fail loud.
  IF NEW.prev_hash IS NOT NULL OR NEW.row_hash IS NOT NULL THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: prev_hash and row_hash are trigger-managed; application code must not set them'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Step 3: Look up prev_hash for this partition.
  -- Partition key: (company_id, firm_id) — exactly one is non-null per XOR.
  -- Order: event_at DESC then id DESC for deterministic tie-breaking.
  IF NEW.company_id IS NOT NULL THEN
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE company_id = NEW.company_id
    ORDER BY event_at DESC, id DESC
    LIMIT 1;
  ELSE
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE firm_id = NEW.firm_id
    ORDER BY event_at DESC, id DESC
    LIMIT 1;
  END IF;

  -- v_prev_hash may be NULL — that's correct for the first row in a partition.
  NEW.prev_hash := v_prev_hash;

  -- Step 4: Compute canonical payload and hash it.
  v_canonical := public.pilot_lifecycle_events_canonical_payload(
    NEW.event_kind,
    NEW.event_at,
    NEW.schema_version,
    NEW.pilot_slot_id,
    NEW.from_status,
    NEW.to_status,
    NEW.classification_hint,
    NEW.company_id,
    NEW.firm_id,
    NEW.actor_kind,
    NEW.actor_user_id,
    NEW.actor_via,
    NEW.assertions_covered,
    NEW.evidence_refs,
    NEW.reason_code,
    NEW.reason_text,
    NEW.payload
  );

  -- row_hash = sha256(coalesce(prev_hash, '') || canonical_payload)
  -- Using coalesce('') for the first row keeps the domain of the hash
  -- input the same (always text) and makes the first row's hash
  -- reproducible from the row content alone.
  -- pgcrypto lives in schema extensions on Supabase; search_path includes it.
  NEW.row_hash := 'sha256:' || encode(
    digest(convert_to(coalesce(NEW.prev_hash, '') || v_canonical, 'UTF8'), 'sha256'::text),
    'hex'
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_before_insert IS
  'In-transaction hash-chain enforcement. Frontier UX Q4 Candidate A pattern: computes hash locally in PL/pgSQL, no network hop, fail-closed. Overrides caller-supplied isolation with authoritative pilot_slots values.';

-- Digest function needed for sha256. Available via pgcrypto extension.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

DROP TRIGGER IF EXISTS pilot_lifecycle_events_before_insert_trg
  ON public.pilot_lifecycle_events;

CREATE TRIGGER pilot_lifecycle_events_before_insert_trg
  BEFORE INSERT ON public.pilot_lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pilot_lifecycle_events_before_insert();

-- ---------------------------------------------------------------------------
-- Reject UPDATE and DELETE — append-only enforcement
-- ---------------------------------------------------------------------------
-- Even service role writes go through the SSOT module (Block 3), which
-- only INSERTs. If any code path attempts UPDATE or DELETE against this
-- table, it's a bug or a bypass attempt — either way, refuse it at the
-- DB layer.

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_reject_mutations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'pilot_lifecycle_events is append-only. Corrections must be new INSERTs (audit trail is sacred). Attempted operation: %',
    TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_reject_mutations IS
  'Append-only enforcement. UPDATE and DELETE fail closed. TigerBeetle doctrine: correction by addition, never mutation.';

DROP TRIGGER IF EXISTS pilot_lifecycle_events_reject_update_trg
  ON public.pilot_lifecycle_events;

CREATE TRIGGER pilot_lifecycle_events_reject_update_trg
  BEFORE UPDATE ON public.pilot_lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pilot_lifecycle_events_reject_mutations();

DROP TRIGGER IF EXISTS pilot_lifecycle_events_reject_delete_trg
  ON public.pilot_lifecycle_events;

CREATE TRIGGER pilot_lifecycle_events_reject_delete_trg
  BEFORE DELETE ON public.pilot_lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pilot_lifecycle_events_reject_mutations();

-- ---------------------------------------------------------------------------
-- Chain verification RPC (read-only, callable by CDC auditor and Block 9
-- verifier). Walks the chain for a given partition and returns the first
-- broken link, or NULL if the chain is intact.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_verify_chain(
  p_company_id uuid DEFAULT NULL,
  p_firm_id uuid DEFAULT NULL
) RETURNS TABLE (
  first_broken_event_id uuid,
  first_broken_event_at timestamptz,
  expected_prev_hash text,
  actual_prev_hash text,
  expected_row_hash text,
  actual_row_hash text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_row record;
  v_expected_prev text := NULL;
  v_recomputed_hash text;
  v_canonical text;
BEGIN
  IF (p_company_id IS NULL AND p_firm_id IS NULL) OR
     (p_company_id IS NOT NULL AND p_firm_id IS NOT NULL) THEN
    RAISE EXCEPTION 'pilot_lifecycle_events_verify_chain: pass exactly one of p_company_id or p_firm_id';
  END IF;

  FOR v_row IN
    SELECT * FROM public.pilot_lifecycle_events
    WHERE (p_company_id IS NOT NULL AND company_id = p_company_id)
       OR (p_firm_id IS NOT NULL AND firm_id = p_firm_id)
    ORDER BY event_at ASC, id ASC
  LOOP
    v_canonical := public.pilot_lifecycle_events_canonical_payload(
      v_row.event_kind, v_row.event_at, v_row.schema_version,
      v_row.pilot_slot_id, v_row.from_status, v_row.to_status,
      v_row.classification_hint, v_row.company_id, v_row.firm_id,
      v_row.actor_kind, v_row.actor_user_id, v_row.actor_via,
      v_row.assertions_covered, v_row.evidence_refs,
      v_row.reason_code, v_row.reason_text, v_row.payload
    );

    v_recomputed_hash := 'sha256:' || encode(
      digest(convert_to(coalesce(v_expected_prev, '') || v_canonical, 'UTF8'), 'sha256'::text),
      'hex'
    );

    IF v_row.prev_hash IS DISTINCT FROM v_expected_prev
       OR v_row.row_hash IS DISTINCT FROM v_recomputed_hash THEN
      first_broken_event_id := v_row.id;
      first_broken_event_at := v_row.event_at;
      expected_prev_hash := v_expected_prev;
      actual_prev_hash := v_row.prev_hash;
      expected_row_hash := v_recomputed_hash;
      actual_row_hash := v_row.row_hash;
      RETURN NEXT;
      RETURN;
    END IF;

    v_expected_prev := v_row.row_hash;
  END LOOP;

  -- Chain intact — return no rows
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_verify_chain IS
  'Read-only chain verification. Returns exactly one row (the first broken link) if the chain is broken, or no rows if intact. Called by CDC auditor and Block 9 verifier UI. Frontier UX Q2 pattern: honest verification, no silent degradation.';

-- Lock down RPC EXECUTE — matches M1 pattern (revoked audit RPCs from anon/authenticated)
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_verify_chain(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_verify_chain(uuid, uuid) FROM authenticated;
-- service_role retains EXECUTE by default
