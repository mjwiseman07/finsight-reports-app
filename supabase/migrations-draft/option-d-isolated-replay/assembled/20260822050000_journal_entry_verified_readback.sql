-- JE-3C — Exact QBO JournalEntry read-back verification receipts.
-- Hard-disabled at application gate; this migration only adds schema + RPCs.
-- Does NOT enable production verification, Memory write, GOVERNED_AUTO, worker, or live QBO.
-- Primary path: GET /journalentry/{persisted qbo_je_id} only — never marker discovery.
-- POSTED_UNVERIFIED → VERIFIED only via apply_journal_entry_verified.
-- Economic mismatch → VERIFICATION_MISMATCH via apply_journal_entry_verification_mismatch.
-- Read/transport failures leave POSTED_UNVERIFIED unchanged (no conclusion receipt).

-- A. Widen execution status vocabulary + provider_journal constraint.
ALTER TABLE public.journal_entry_executions
  DROP CONSTRAINT IF EXISTS journal_entry_executions_status_check;

ALTER TABLE public.journal_entry_executions
  ADD CONSTRAINT journal_entry_executions_status_check
  CHECK (status IN (
    'RESERVED',
    'PRECHECK_FAILED',
    'READY_TO_POST',
    'POSTING',
    'POSTED_UNVERIFIED',
    'UNKNOWN_COMMIT',
    'VERIFIED',
    'VERIFICATION_MISMATCH',
    'FAILED',
    'REVERSAL_REQUIRED'
  ));

ALTER TABLE public.journal_entry_executions
  DROP CONSTRAINT IF EXISTS journal_entry_executions_provider_journal_null_until_post;

ALTER TABLE public.journal_entry_executions
  ADD CONSTRAINT journal_entry_executions_provider_journal_null_until_post
  CHECK (provider_journal_id IS NULL OR status IN (
    'POSTED_UNVERIFIED',
    'UNKNOWN_COMMIT',
    'VERIFIED',
    'VERIFICATION_MISMATCH',
    'FAILED',
    'REVERSAL_REQUIRED',
    'POSTING'
  ));

-- B. Distinct normalized read-back hash + verification custody (never conflate with raw POST hash).
ALTER TABLE public.journal_entry_executions
  ADD COLUMN IF NOT EXISTS provider_readback_hash text NULL;

ALTER TABLE public.journal_entry_executions
  ADD COLUMN IF NOT EXISTS verification_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.journal_entry_executions
  ADD COLUMN IF NOT EXISTS verification_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.journal_entry_executions
  ADD COLUMN IF NOT EXISTS verified_at timestamptz NULL;

ALTER TABLE public.journal_entry_executions
  ADD COLUMN IF NOT EXISTS verification_ledger_event_id uuid NULL;

COMMENT ON COLUMN public.journal_entry_executions.provider_response_hash IS
  'JE-3B2 raw POST-response hash. Never compared to provider_readback_hash.';

COMMENT ON COLUMN public.journal_entry_executions.provider_readback_hash IS
  'JE-3C normalized provider read-back hash used for VERIFIED custody. Distinct from raw POST hash.';

COMMENT ON COLUMN public.journal_entry_executions.verification_snapshot IS
  'Normalized JournalEntry snapshot used for verification custody / hash.';

-- C. Narrow generic provider-attempt patch: block verification conclusion + hash mutation.
CREATE OR REPLACE FUNCTION public.patch_journal_entry_provider_attempt(
  p_attempt_id uuid,
  p_expected_status text,
  p_patch jsonb
)
RETURNS TABLE(attempt jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.journal_entry_provider_attempts%ROWTYPE;
  v_new_status text;
BEGIN
  SELECT *
    INTO v_row
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_row.status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt status concurrency conflict: expected %, found %',
      p_expected_status, v_row.status;
  END IF;

  IF p_patch ? 'qbo_je_id'
     AND NULLIF(p_patch->>'qbo_je_id', '') IS NOT NULL THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: qbo_je_id requires dedicated receipted RPC';
  END IF;

  IF p_patch ? 'commit_certainty' THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: commit_certainty is immutable via generic patch';
  END IF;

  IF p_patch ? 'provider_response_hash'
     OR p_patch ? 'provider_readback_hash'
     OR p_patch ? 'verification_snapshot'
     OR p_patch ? 'verification_metadata'
     OR p_patch ? 'verified_at'
     OR p_patch ? 'verification_ledger_event_id' THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: verification fields require dedicated receipted RPC';
  END IF;

  v_new_status := NULLIF(p_patch->>'status', '');
  IF v_new_status IN (
    'REQUEST_STARTED',
    'RESPONSE_RECEIVED',
    'UNKNOWN_RESULT',
    'FAILED_PRECOMMIT',
    'DISCOVERED_COMMITTED',
    'DISCOVERED_NOT_FOUND',
    'VERIFIED_PROVIDER_ID'
  ) THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: status % requires dedicated receipted RPC',
      v_new_status;
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = COALESCE(v_new_status, status),
         request_started_at = CASE
           WHEN p_patch ? 'request_started_at' THEN NULLIF(p_patch->>'request_started_at', '')::timestamptz
           ELSE request_started_at
         END,
         request_completed_at = CASE
           WHEN p_patch ? 'request_completed_at' THEN NULLIF(p_patch->>'request_completed_at', '')::timestamptz
           ELSE request_completed_at
         END,
         intuit_tid = CASE
           WHEN p_patch ? 'intuit_tid' THEN NULLIF(p_patch->>'intuit_tid', '')
           ELSE intuit_tid
         END,
         provider_error_code = CASE
           WHEN p_patch ? 'provider_error_code' THEN NULLIF(p_patch->>'provider_error_code', '')
           ELSE provider_error_code
         END,
         provider_error_message = CASE
           WHEN p_patch ? 'provider_error_message' THEN NULLIF(p_patch->>'provider_error_message', '')
           ELSE provider_error_message
         END,
         discovery_summary = COALESCE(p_patch->'discovery_summary', discovery_summary),
         updated_at = now()
   WHERE id = p_attempt_id
  RETURNING * INTO v_row;

  attempt := to_jsonb(v_row);
  RETURN NEXT;
END;
$$;

-- D. Atomic VERIFIED conclusion.
CREATE OR REPLACE FUNCTION public.apply_journal_entry_verified(
  p_execution_id uuid,
  p_expected_status text,
  p_expected_state_version integer,
  p_attempt_id uuid,
  p_expected_attempt_status text,
  p_provider_readback_hash text,
  p_verification_snapshot jsonb,
  p_verification_metadata jsonb,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  attempt jsonb,
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.journal_entry_provider_attempts%ROWTYPE;
  v_execution public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
  v_hash text;
BEGIN
  v_hash := NULLIF(btrim(COALESCE(p_provider_readback_hash, '')), '');
  IF v_hash IS NULL OR v_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'je_provider_verified_readback_hash_required';
  END IF;
  IF COALESCE(p_expected_status, '') IS DISTINCT FROM 'POSTED_UNVERIFIED' THEN
    RAISE EXCEPTION 'je_provider_verified_expected_status_must_be_POSTED_UNVERIFIED';
  END IF;
  IF COALESCE(p_expected_attempt_status, '') IS DISTINCT FROM 'RESPONSE_RECEIVED' THEN
    RAISE EXCEPTION 'je_provider_verified_expected_attempt_status_must_be_RESPONSE_RECEIVED';
  END IF;
  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'VERIFIED' THEN
    RAISE EXCEPTION 'je_provider_verified payload status must be VERIFIED';
  END IF;
  IF COALESCE(p_event_payload->>'provider_readback_hash', '') IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'je_provider_verified payload provider_readback_hash mismatch';
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = p_execution_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found: %', p_execution_id;
  END IF;
  IF v_execution.status IS DISTINCT FROM 'POSTED_UNVERIFIED' THEN
    RAISE EXCEPTION 'je_provider_verified_execution_status_invalid: %', v_execution.status;
  END IF;
  IF v_execution.state_version IS DISTINCT FROM p_expected_state_version THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during verified';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_attempt.execution_id IS DISTINCT FROM v_execution.id THEN
    RAISE EXCEPTION 'je_provider_verified attempt/execution binding mismatch';
  END IF;
  IF v_attempt.status IS DISTINCT FROM 'RESPONSE_RECEIVED'
     OR v_attempt.commit_certainty IS DISTINCT FROM 'COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_verified_attempt_custody_invalid: status=% certainty=%',
      v_attempt.status, v_attempt.commit_certainty;
  END IF;

  IF COALESCE(p_event_payload->>'execution_id', '') IS DISTINCT FROM v_execution.id::text THEN
    RAISE EXCEPTION 'je_provider_verified payload execution_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_attempt_id', '') IS DISTINCT FROM v_attempt.id::text THEN
    RAISE EXCEPTION 'je_provider_verified payload provider_attempt_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'accounting_connection_id', '') IS DISTINCT FROM v_attempt.accounting_connection_id::text
     OR v_attempt.accounting_connection_id IS DISTINCT FROM v_execution.accounting_connection_id THEN
    RAISE EXCEPTION 'je_provider_verified payload accounting_connection_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_request_hash', '') IS DISTINCT FROM v_attempt.provider_request_hash
     OR v_attempt.provider_request_hash IS DISTINCT FROM v_execution.provider_request_hash THEN
    RAISE EXCEPTION 'je_provider_verified payload provider_request_hash mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'correlation_marker', '') IS DISTINCT FROM v_attempt.correlation_marker
     OR v_attempt.correlation_marker IS DISTINCT FROM v_execution.correlation_marker THEN
    RAISE EXCEPTION 'je_provider_verified payload correlation_marker mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_journal_id', '') IS DISTINCT FROM COALESCE(v_execution.provider_journal_id, '')
     OR COALESCE(v_execution.provider_journal_id, '') IS DISTINCT FROM COALESCE(v_attempt.qbo_je_id, '') THEN
    RAISE EXCEPTION 'je_provider_verified payload provider_journal_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'proposal_id', '') IS DISTINCT FROM v_execution.proposal_id::text THEN
    RAISE EXCEPTION 'je_provider_verified payload proposal_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'approval_id', '') IS DISTINCT FROM v_execution.approval_id::text THEN
    RAISE EXCEPTION 'je_provider_verified payload approval_id mismatch';
  END IF;

  -- Patent #6 ledger scope must equal locked execution custody.
  IF p_engagement_id IS DISTINCT FROM v_execution.engagement_id THEN
    RAISE EXCEPTION 'je_provider_verified engagement_id scope mismatch';
  END IF;
  IF p_firm_client_id IS DISTINCT FROM v_execution.firm_client_id THEN
    RAISE EXCEPTION 'je_provider_verified firm_client_id scope mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'engagement_id', '') IS DISTINCT FROM v_execution.engagement_id::text THEN
    RAISE EXCEPTION 'je_provider_verified payload engagement_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'firm_client_id', '') IS DISTINCT FROM COALESCE(v_execution.firm_client_id::text, '') THEN
    RAISE EXCEPTION 'je_provider_verified payload firm_client_id mismatch';
  END IF;

  -- Idempotent identical replay: already VERIFIED with same readback hash.
  -- (Handled in application before RPC when status is already VERIFIED.)

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);
  PERFORM set_config('advisacor.je_execution_transition', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = 'VERIFIED_PROVIDER_ID',
         updated_at = now()
   WHERE id = p_attempt_id
     AND status = 'RESPONSE_RECEIVED'
     AND commit_certainty = 'COMMITTED'
  RETURNING * INTO v_attempt;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'je_provider_verified_attempt_concurrency_conflict';
  END IF;

  UPDATE public.journal_entry_executions
     SET status = 'VERIFIED',
         provider_readback_hash = v_hash,
         verification_snapshot = COALESCE(p_verification_snapshot, '{}'::jsonb),
         verification_metadata = COALESCE(p_verification_metadata, '{}'::jsonb),
         verified_at = now(),
         state_version = v_execution.state_version + 1,
         updated_at = now()
   WHERE id = v_execution.id
     AND status = 'POSTED_UNVERIFIED'
     AND state_version = v_execution.state_version
  RETURNING * INTO v_execution;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during verified';
  END IF;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.verified',
      'posting',
      1,
      p_firm_id,
      v_execution.firm_client_id,
      v_execution.engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_execution',
      v_execution.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  UPDATE public.journal_entry_executions
     SET verification_ledger_event_id = v_event_id,
         updated_at = now()
   WHERE id = v_execution.id
  RETURNING * INTO v_execution;

  attempt := to_jsonb(v_attempt);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;

-- E. Atomic VERIFICATION_MISMATCH conclusion (fail-closed; no auto-repost).
CREATE OR REPLACE FUNCTION public.apply_journal_entry_verification_mismatch(
  p_execution_id uuid,
  p_expected_status text,
  p_expected_state_version integer,
  p_attempt_id uuid,
  p_expected_attempt_status text,
  p_provider_readback_hash text,
  p_verification_snapshot jsonb,
  p_verification_metadata jsonb,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  attempt jsonb,
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.journal_entry_provider_attempts%ROWTYPE;
  v_execution public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
  v_hash text;
BEGIN
  v_hash := NULLIF(btrim(COALESCE(p_provider_readback_hash, '')), '');
  IF v_hash IS NULL OR v_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch_readback_hash_required';
  END IF;
  IF COALESCE(p_expected_status, '') IS DISTINCT FROM 'POSTED_UNVERIFIED' THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch_expected_status_must_be_POSTED_UNVERIFIED';
  END IF;
  IF COALESCE(p_expected_attempt_status, '') IS DISTINCT FROM 'RESPONSE_RECEIVED' THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch_expected_attempt_status_must_be_RESPONSE_RECEIVED';
  END IF;
  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'VERIFICATION_MISMATCH' THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload status must be VERIFICATION_MISMATCH';
  END IF;
  IF COALESCE(p_event_payload->>'provider_readback_hash', '') IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload provider_readback_hash mismatch';
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = p_execution_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found: %', p_execution_id;
  END IF;
  IF v_execution.status IS DISTINCT FROM 'POSTED_UNVERIFIED' THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch_execution_status_invalid: %', v_execution.status;
  END IF;
  IF v_execution.state_version IS DISTINCT FROM p_expected_state_version THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during verification_mismatch';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_attempt.execution_id IS DISTINCT FROM v_execution.id THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch attempt/execution binding mismatch';
  END IF;
  IF v_attempt.status IS DISTINCT FROM 'RESPONSE_RECEIVED'
     OR v_attempt.commit_certainty IS DISTINCT FROM 'COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch_attempt_custody_invalid: status=% certainty=%',
      v_attempt.status, v_attempt.commit_certainty;
  END IF;

  -- Attempt ↔ execution immutable bindings (VERIFIED-strength).
  IF v_attempt.accounting_connection_id IS DISTINCT FROM v_execution.accounting_connection_id THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch attempt/execution accounting_connection_id mismatch';
  END IF;
  IF v_attempt.provider_request_hash IS DISTINCT FROM v_execution.provider_request_hash THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch attempt/execution provider_request_hash mismatch';
  END IF;
  IF v_attempt.correlation_marker IS DISTINCT FROM v_execution.correlation_marker THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch attempt/execution correlation_marker mismatch';
  END IF;
  IF COALESCE(v_execution.provider_journal_id, '') IS DISTINCT FROM COALESCE(v_attempt.qbo_je_id, '') THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch attempt/execution provider_journal_id mismatch';
  END IF;

  IF COALESCE(p_event_payload->>'execution_id', '') IS DISTINCT FROM v_execution.id::text THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload execution_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_attempt_id', '') IS DISTINCT FROM v_attempt.id::text THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload provider_attempt_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'accounting_connection_id', '') IS DISTINCT FROM v_attempt.accounting_connection_id::text THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload accounting_connection_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_request_hash', '') IS DISTINCT FROM v_attempt.provider_request_hash THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload provider_request_hash mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'correlation_marker', '') IS DISTINCT FROM v_attempt.correlation_marker THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload correlation_marker mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_journal_id', '') IS DISTINCT FROM COALESCE(v_execution.provider_journal_id, '') THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload provider_journal_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'proposal_id', '') IS DISTINCT FROM v_execution.proposal_id::text THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload proposal_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'approval_id', '') IS DISTINCT FROM v_execution.approval_id::text THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload approval_id mismatch';
  END IF;

  -- Patent #6 ledger scope must equal locked execution custody.
  IF p_engagement_id IS DISTINCT FROM v_execution.engagement_id THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch engagement_id scope mismatch';
  END IF;
  IF p_firm_client_id IS DISTINCT FROM v_execution.firm_client_id THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch firm_client_id scope mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'engagement_id', '') IS DISTINCT FROM v_execution.engagement_id::text THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload engagement_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'firm_client_id', '') IS DISTINCT FROM COALESCE(v_execution.firm_client_id::text, '') THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload firm_client_id mismatch';
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);
  PERFORM set_config('advisacor.je_execution_transition', '1', true);

  -- Attempt remains RESPONSE_RECEIVED + COMMITTED; execution fails closed.
  UPDATE public.journal_entry_executions
     SET status = 'VERIFICATION_MISMATCH',
         provider_readback_hash = v_hash,
         verification_snapshot = COALESCE(p_verification_snapshot, '{}'::jsonb),
         verification_metadata = COALESCE(p_verification_metadata, '{}'::jsonb),
         last_error_code = COALESCE(NULLIF(p_event_payload->>'error_code', ''), 'je_verification_mismatch'),
         last_error_message = COALESCE(NULLIF(p_event_payload->>'error_message', ''), 'Provider read-back failed economic verification'),
         state_version = v_execution.state_version + 1,
         updated_at = now()
   WHERE id = v_execution.id
     AND status = 'POSTED_UNVERIFIED'
     AND state_version = v_execution.state_version
  RETURNING * INTO v_execution;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during verification_mismatch';
  END IF;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.verification_mismatch',
      'posting',
      1,
      p_firm_id,
      v_execution.firm_client_id,
      v_execution.engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_execution',
      v_execution.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  UPDATE public.journal_entry_executions
     SET verification_ledger_event_id = v_event_id,
         updated_at = now()
   WHERE id = v_execution.id
  RETURNING * INTO v_execution;

  attempt := to_jsonb(v_attempt);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.apply_journal_entry_verified(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) IS
  'JE-3C: POSTED_UNVERIFIED → VERIFIED after exact GET read-back. No Memory. No POST.';

COMMENT ON FUNCTION public.apply_journal_entry_verification_mismatch(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) IS
  'JE-3C: POSTED_UNVERIFIED → VERIFICATION_MISMATCH on economic/binding mismatch. No auto-repost.';

REVOKE ALL ON FUNCTION public.apply_journal_entry_verified(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_journal_entry_verified(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_journal_entry_verified(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_verified(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.apply_journal_entry_verification_mismatch(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_journal_entry_verification_mismatch(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_journal_entry_verification_mismatch(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_verification_mismatch(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.patch_journal_entry_provider_attempt(
  uuid, text, jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.patch_journal_entry_provider_attempt(
  uuid, text, jsonb
) FROM anon;
REVOKE ALL ON FUNCTION public.patch_journal_entry_provider_attempt(
  uuid, text, jsonb
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.patch_journal_entry_provider_attempt(
  uuid, text, jsonb
) TO service_role;
