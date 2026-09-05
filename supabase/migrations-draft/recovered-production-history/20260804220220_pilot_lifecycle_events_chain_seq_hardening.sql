-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260804220220
-- NAME: pilot_lifecycle_events_chain_seq_hardening
-- DATABASE_MD5_UTF8: 0dfe89813e31c0cf5341d8fd65ab4c18
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 17126
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

-- Phase MEM-LIFECYCLE Block 2.5 — chain_seq hardening
--
-- Adds a bigint sequence column as the canonical hash-chain order key,
-- eliminating same-timestamp ordering ambiguity. Serializes concurrent
-- inserts against the same partition via pg_advisory_xact_lock. Adds
-- fork-prevention unique indexes as defense-in-depth.
--
-- Ordering discipline (research-driven — mem2_hash_chain_ordering.md Q1):
--   - chain_seq is the sole ordering primitive for chain-linking.
--   - Trigger: ORDER BY chain_seq DESC LIMIT 1 for prev-hash lookup.
--   - Verifier: ORDER BY chain_seq ASC for the chain walk.
--   - event_at remains for display / range queries only.
--
-- Concurrency (research-driven — mem2_hash_chain_ordering.md Q2):
--   - pg_advisory_xact_lock(hashtext(partition_key)) at trigger top.
--   - Handles first-row-in-partition bootstrap (which SELECT FOR UPDATE
--     cannot, since no tail row exists yet).
--   - Released automatically on commit or rollback.
--   - Non-WAL-logged, invisible to CDC — Block 9's WAL auditor is unaffected.
--
-- Fork prevention (defense-in-depth):
--   - UNIQUE (company_id, prev_hash) WHERE company_id IS NOT NULL AND prev_hash IS NOT NULL
--   - UNIQUE (firm_id, prev_hash)    WHERE firm_id    IS NOT NULL AND prev_hash IS NOT NULL
--   - UNIQUE (company_id)            WHERE company_id IS NOT NULL AND prev_hash IS NULL  -- one genesis per company partition
--   - UNIQUE (firm_id)               WHERE firm_id    IS NOT NULL AND prev_hash IS NULL  -- one genesis per firm partition

-- ---------------------------------------------------------------------------
-- Step 0: Drop the reject-UPDATE trigger temporarily so we can backfill.
-- Reject-DELETE stays on. We reinstall reject-UPDATE at the end.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS pilot_lifecycle_events_reject_update_trg
  ON public.pilot_lifecycle_events;

-- ---------------------------------------------------------------------------
-- Step 1: Create the sequence and add the column (nullable for now).
-- ---------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS public.pilot_lifecycle_events_chain_seq_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

COMMENT ON SEQUENCE public.pilot_lifecycle_events_chain_seq_seq IS
  'Monotonic integer for pilot_lifecycle_events.chain_seq. Assigned by BEFORE INSERT trigger. Sole ordering primitive for hash-chain linking. See research/mem2_hash_chain_ordering.md Q1.';

ALTER TABLE public.pilot_lifecycle_events
  ADD COLUMN IF NOT EXISTS chain_seq bigint;

COMMENT ON COLUMN public.pilot_lifecycle_events.chain_seq IS
  'Monotonic sequence for hash-chain ordering. Assigned by BEFORE INSERT trigger. Do not set from application code — trigger overwrites. Sole primitive for chain-linking; event_at is display-only.';

-- ---------------------------------------------------------------------------
-- Step 2: Backfill chain_seq in event_at ASC, id ASC order.
-- Preserves existing chain integrity: the trigger will use chain_seq DESC
-- for prev-lookup after this migration, and the assigned values match the
-- rows' existing prev_hash / row_hash linkage 1:1.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_row record;
  v_next bigint;
BEGIN
  v_next := 1;
  FOR v_row IN
    SELECT id
    FROM public.pilot_lifecycle_events
    WHERE chain_seq IS NULL
    ORDER BY event_at ASC, id ASC
  LOOP
    UPDATE public.pilot_lifecycle_events
      SET chain_seq = v_next
    WHERE id = v_row.id;
    v_next := v_next + 1;
  END LOOP;

  IF v_next > 1 THEN
    PERFORM setval('public.pilot_lifecycle_events_chain_seq_seq', v_next - 1, true);
    RAISE NOTICE 'chain_seq backfill: assigned % rows, sequence advanced to %', v_next - 1, v_next - 1;
  ELSE
    RAISE NOTICE 'chain_seq backfill: no rows to backfill (table is empty), sequence remains at 1';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Step 3: Set NOT NULL now that all rows have chain_seq populated.
-- ---------------------------------------------------------------------------

ALTER TABLE public.pilot_lifecycle_events
  ALTER COLUMN chain_seq SET NOT NULL;

ALTER TABLE public.pilot_lifecycle_events
  ALTER COLUMN chain_seq SET DEFAULT nextval('public.pilot_lifecycle_events_chain_seq_seq');

-- Note: DEFAULT is set for schema completeness, but the trigger will
-- overwrite it explicitly. The trigger fires BEFORE INSERT and computes
-- chain_seq under the advisory lock, so racing INSERTs cannot see stale
-- sequence values relative to each other's row_hash computation.
-- Actually — nextval() is atomic and every call returns a fresh value
-- regardless of transaction state, so a DEFAULT-assigned chain_seq is
-- monotonic-safe on its own. We keep the trigger doing chain_seq := nextval
-- explicitly for clarity and to keep sequence generation inside the
-- advisory-lock window (defensive; not strictly required for correctness).

-- ---------------------------------------------------------------------------
-- Step 4: Unique constraints for fork prevention (defense-in-depth).
-- These prevent two rows in the same partition from claiming the same
-- prev_hash (or from both being "genesis" rows with prev_hash NULL).
-- The advisory lock is the primary defense; these indexes are the belt.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS pilot_lifecycle_events_no_fork_company
  ON public.pilot_lifecycle_events (company_id, prev_hash)
  WHERE company_id IS NOT NULL AND prev_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pilot_lifecycle_events_no_fork_firm
  ON public.pilot_lifecycle_events (firm_id, prev_hash)
  WHERE firm_id IS NOT NULL AND prev_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pilot_lifecycle_events_one_genesis_company
  ON public.pilot_lifecycle_events (company_id)
  WHERE company_id IS NOT NULL AND prev_hash IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pilot_lifecycle_events_one_genesis_firm
  ON public.pilot_lifecycle_events (firm_id)
  WHERE firm_id IS NOT NULL AND prev_hash IS NULL;

COMMENT ON INDEX public.pilot_lifecycle_events_no_fork_company IS
  'Fork prevention: at most one row per (company_id, prev_hash). Complements pg_advisory_xact_lock in the trigger; does not replace it (research/mem2_hash_chain_ordering.md Q2 §What to avoid).';

COMMENT ON INDEX public.pilot_lifecycle_events_no_fork_firm IS
  'Fork prevention: at most one row per (firm_id, prev_hash). Complements pg_advisory_xact_lock in the trigger.';

COMMENT ON INDEX public.pilot_lifecycle_events_one_genesis_company IS
  'At most one genesis row (prev_hash IS NULL) per company partition.';

COMMENT ON INDEX public.pilot_lifecycle_events_one_genesis_firm IS
  'At most one genesis row (prev_hash IS NULL) per firm partition.';

-- ---------------------------------------------------------------------------
-- Step 5: Replace the BEFORE INSERT trigger function.
--   - Acquire pg_advisory_xact_lock(hashtext(partition_key)) at the top.
--   - Assign chain_seq := nextval() inside the lock.
--   - Use ORDER BY chain_seq DESC LIMIT 1 for prev-hash lookup.
--   - Same canonical_payload / row_hash computation as Block 2.
--   - canonical_payload signature does NOT include chain_seq — chain_seq is
--     a store-assigned pointer, not semantic content. Including it in the
--     hash would make the hash uncheckable from a WAL replay that doesn't
--     have the sequence state.
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
  v_partition_key text;
BEGIN
  -- Step 1: Resolve authoritative isolation from pilot_slots.
  SELECT company_id, firm_id
    INTO v_slot_company_id, v_slot_firm_id
  FROM public.pilot_slots
  WHERE id = NEW.pilot_slot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: pilot_slot_id % does not exist',
      NEW.pilot_slot_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  NEW.company_id := v_slot_company_id;
  NEW.firm_id := v_slot_firm_id;

  -- Step 2: Reject caller-supplied hash / seq values.
  IF NEW.prev_hash IS NOT NULL OR NEW.row_hash IS NOT NULL THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: prev_hash and row_hash are trigger-managed; application code must not set them'
      USING ERRCODE = 'check_violation';
  END IF;

  -- chain_seq is also trigger-managed. Reject any client-supplied value
  -- other than the sequence default (which arrives here as a fresh nextval
  -- from the DEFAULT clause). We overwrite it deterministically inside the
  -- advisory lock below, so we do NOT reject non-null NEW.chain_seq at
  -- this point — Postgres's DEFAULT mechanism already assigned one before
  -- the trigger fired. The overwrite below takes precedence.

  -- Step 3: Build partition_key and acquire the advisory lock.
  -- Partition key format: 'company:<uuid>' or 'firm:<uuid>' — disambiguates
  -- the (rare-but-possible) case where a company_id and firm_id UUID share
  -- lexical prefix or hash collision zones. hashtext() produces int4; that
  -- is the input pg_advisory_xact_lock(bigint) expects (implicit cast).
  IF NEW.company_id IS NOT NULL THEN
    v_partition_key := 'company:' || NEW.company_id::text;
  ELSE
    v_partition_key := 'firm:' || NEW.firm_id::text;
  END IF;

  -- pg_advisory_xact_lock is released automatically at end of transaction
  -- (commit OR rollback), per Postgres docs on advisory locks. This
  -- serializes concurrent inserts against the same partition, closing the
  -- fork race that pure BEFORE-INSERT logic cannot handle.
  PERFORM pg_advisory_xact_lock(hashtext(v_partition_key)::bigint);

  -- Step 4: Look up prev_hash via chain_seq (the canonical order key).
  -- Under the advisory lock, this is the true current tail — no peer
  -- transaction can be in the middle of appending without waiting on us
  -- (or vice versa).
  IF NEW.company_id IS NOT NULL THEN
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE company_id = NEW.company_id
    ORDER BY chain_seq DESC
    LIMIT 1;
  ELSE
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE firm_id = NEW.firm_id
    ORDER BY chain_seq DESC
    LIMIT 1;
  END IF;

  NEW.prev_hash := v_prev_hash;

  -- Step 5: Overwrite chain_seq with a fresh sequence value.
  -- We already got one from DEFAULT nextval() at row-construction time,
  -- but that assignment happened BEFORE the advisory lock. To keep sequence
  -- issuance ordered with respect to prev-hash lookup under contention,
  -- issue a new one now inside the lock. The previous value is burned
  -- (gap in the sequence — that's the documented and acceptable behavior).
  NEW.chain_seq := nextval('public.pilot_lifecycle_events_chain_seq_seq');

  -- Step 6: Compute canonical payload and row_hash.
  -- canonical_payload does NOT include chain_seq — it is a pointer, not
  -- semantic content. Including it would make WAL-replay verification
  -- brittle (a replayed insert on a fresh sequence would get a different
  -- chain_seq and thus a different row_hash).
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

  NEW.row_hash := 'sha256:' || encode(
    digest(convert_to(coalesce(NEW.prev_hash, '') || v_canonical, 'UTF8'), 'sha256'::text),
    'hex'
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_before_insert IS
  'Hash-chain enforcement with advisory-lock serialization. Uses chain_seq (bigint sequence) as the canonical order key — event_at is display-only. Research: /home/user/workspace/research/mem2_hash_chain_ordering.md Q1+Q2.';

-- Trigger itself is unchanged (still BEFORE INSERT FOR EACH ROW), but
-- re-drop / re-create to be idempotent.
DROP TRIGGER IF EXISTS pilot_lifecycle_events_before_insert_trg
  ON public.pilot_lifecycle_events;

CREATE TRIGGER pilot_lifecycle_events_before_insert_trg
  BEFORE INSERT ON public.pilot_lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pilot_lifecycle_events_before_insert();

-- ---------------------------------------------------------------------------
-- Step 6: Replace the verify_chain RPC to walk ORDER BY chain_seq ASC.
-- Same shape as Block 2, but uses chain_seq for both order and internal
-- record-linking. Signature unchanged so callers do not need updates.
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
    ORDER BY chain_seq ASC
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
      digest(convert_to(coalesce(v_row.prev_hash, '') || v_canonical, 'UTF8'), 'sha256'::text),
      'hex'
    );

    -- Check prev_hash linkage
    IF v_row.prev_hash IS DISTINCT FROM v_expected_prev THEN
      first_broken_event_id := v_row.id;
      first_broken_event_at := v_row.event_at;
      expected_prev_hash := v_expected_prev;
      actual_prev_hash := v_row.prev_hash;
      expected_row_hash := v_recomputed_hash;
      actual_row_hash := v_row.row_hash;
      RETURN NEXT;
      RETURN;
    END IF;

    -- Check row_hash integrity
    IF v_row.row_hash IS DISTINCT FROM v_recomputed_hash THEN
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

  -- Chain intact — return zero rows.
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_verify_chain IS
  'Walks the hash chain for one partition (company_id XOR firm_id) in chain_seq ASC order and returns the first broken link, or zero rows if the chain is intact. Order agrees with the BEFORE INSERT trigger by construction (both use chain_seq).';

-- ---------------------------------------------------------------------------
-- Step 7: Reinstall the reject-UPDATE trigger.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS pilot_lifecycle_events_reject_update_trg
  ON public.pilot_lifecycle_events;

CREATE TRIGGER pilot_lifecycle_events_reject_update_trg
  BEFORE UPDATE ON public.pilot_lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pilot_lifecycle_events_reject_mutations();

-- ---------------------------------------------------------------------------
-- Step 8: Revoke EXECUTE on internal helpers (audit hygiene).
-- verify_chain stays callable by service_role and authenticated for the
-- Timeline UI drawer (Block 5) and the Block 9 cron; canonical_payload
-- stays PUBLIC because it is deterministic and side-effect-free.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.pilot_lifecycle_events_before_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pilot_lifecycle_events_reject_mutations() FROM PUBLIC;