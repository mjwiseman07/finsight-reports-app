-- JE-3B2 — Governed QBO create dispatch + atomic outcome receipts.
-- Hard-disabled at application gate; this migration only adds RPCs.
-- Does NOT enable production invocation, Memory, VERIFIED, GOVERNED_AUTO, or worker.
-- Uncertainty is established BEFORE any QBO POST may leave:
--   RESERVED + NOT_SENT → REQUEST_STARTED + POSSIBLY_COMMITTED
--   + journal_entry.provider_dispatch_started
-- Terminal outcomes are dedicated receipted RPCs only.

-- A. Narrow generic patch: block create-lifecycle conclusion statuses.
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
         -- commit_certainty deliberately immutable here
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
         provider_response_hash = CASE
           WHEN p_patch ? 'provider_response_hash' THEN NULLIF(p_patch->>'provider_response_hash', '')
           ELSE provider_response_hash
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

-- B. Atomic dispatch boundary — BEFORE any QBO POST may begin.
CREATE OR REPLACE FUNCTION public.apply_journal_entry_provider_dispatch_started(
  p_attempt_id uuid,
  p_expected_status text,
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
BEGIN
  IF COALESCE(p_expected_status, '') IS DISTINCT FROM 'RESERVED' THEN
    RAISE EXCEPTION 'je_provider_dispatch_expected_status_must_be_RESERVED';
  END IF;
  IF COALESCE(p_event_payload->>'commit_certainty', '') IS DISTINCT FROM 'POSSIBLY_COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_dispatch payload commit_certainty must be POSSIBLY_COMMITTED';
  END IF;
  IF COALESCE(p_event_payload->>'attempt_status', '') IS DISTINCT FROM 'REQUEST_STARTED' THEN
    RAISE EXCEPTION 'je_provider_dispatch payload attempt_status must be REQUEST_STARTED';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_attempt.status IS DISTINCT FROM 'RESERVED'
     OR v_attempt.commit_certainty IS DISTINCT FROM 'NOT_SENT' THEN
    RAISE EXCEPTION 'je_provider_dispatch_custody_invalid: status=% certainty=%',
      v_attempt.status, v_attempt.commit_certainty;
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = v_attempt.execution_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found for attempt %', p_attempt_id;
  END IF;
  IF v_execution.status IS DISTINCT FROM 'POSTING' THEN
    RAISE EXCEPTION 'je_provider_dispatch_execution_status_invalid: %', v_execution.status;
  END IF;

  IF COALESCE(p_event_payload->>'execution_id', '') IS DISTINCT FROM v_execution.id::text THEN
    RAISE EXCEPTION 'je_provider_dispatch payload execution_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_attempt_id', '') IS DISTINCT FROM v_attempt.id::text THEN
    RAISE EXCEPTION 'je_provider_dispatch payload provider_attempt_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_request_hash', '') IS DISTINCT FROM v_attempt.provider_request_hash THEN
    RAISE EXCEPTION 'je_provider_dispatch payload provider_request_hash mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'correlation_marker', '') IS DISTINCT FROM v_attempt.correlation_marker THEN
    RAISE EXCEPTION 'je_provider_dispatch payload correlation_marker mismatch';
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = 'REQUEST_STARTED',
         commit_certainty = 'POSSIBLY_COMMITTED',
         request_started_at = now(),
         updated_at = now()
   WHERE id = p_attempt_id
     AND status = 'RESERVED'
     AND commit_certainty = 'NOT_SENT'
  RETURNING * INTO v_attempt;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'je_provider_dispatch_concurrency_conflict';
  END IF;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.provider_dispatch_started',
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
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

  attempt := to_jsonb(v_attempt);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;

-- C. Success: RESPONSE_RECEIVED + COMMITTED + POSTED_UNVERIFIED + provider_posted
CREATE OR REPLACE FUNCTION public.apply_journal_entry_provider_posted(
  p_attempt_id uuid,
  p_expected_status text,
  p_qbo_je_id text,
  p_intuit_tid text,
  p_provider_response_hash text,
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
  v_qbo_je_id text;
BEGIN
  v_qbo_je_id := NULLIF(btrim(COALESCE(p_qbo_je_id, '')), '');
  IF v_qbo_je_id IS NULL THEN
    RAISE EXCEPTION 'je_provider_posted_qbo_je_id_required';
  END IF;
  IF COALESCE(p_expected_status, '') IS DISTINCT FROM 'REQUEST_STARTED' THEN
    RAISE EXCEPTION 'je_provider_posted_expected_status_must_be_REQUEST_STARTED';
  END IF;
  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'POSTED_UNVERIFIED' THEN
    RAISE EXCEPTION 'je_provider_posted payload status must be POSTED_UNVERIFIED';
  END IF;
  IF COALESCE(p_event_payload->>'commit_certainty', '') IS DISTINCT FROM 'COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_posted payload commit_certainty must be COMMITTED';
  END IF;
  IF COALESCE(p_event_payload->>'qbo_je_id', '') IS DISTINCT FROM v_qbo_je_id THEN
    RAISE EXCEPTION 'je_provider_posted payload qbo_je_id mismatch';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_attempt.status IS DISTINCT FROM 'REQUEST_STARTED'
     OR v_attempt.commit_certainty IS DISTINCT FROM 'POSSIBLY_COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_posted_custody_invalid: status=% certainty=%',
      v_attempt.status, v_attempt.commit_certainty;
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = v_attempt.execution_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found for attempt %', p_attempt_id;
  END IF;
  IF v_execution.status IS DISTINCT FROM 'POSTING' THEN
    RAISE EXCEPTION 'je_provider_posted_execution_status_invalid: %', v_execution.status;
  END IF;

  IF COALESCE(p_event_payload->>'execution_id', '') IS DISTINCT FROM v_execution.id::text THEN
    RAISE EXCEPTION 'je_provider_posted payload execution_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_attempt_id', '') IS DISTINCT FROM v_attempt.id::text THEN
    RAISE EXCEPTION 'je_provider_posted payload provider_attempt_id mismatch';
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);
  PERFORM set_config('advisacor.je_execution_transition', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = 'RESPONSE_RECEIVED',
         commit_certainty = 'COMMITTED',
         qbo_je_id = v_qbo_je_id,
         intuit_tid = NULLIF(p_intuit_tid, ''),
         provider_response_hash = NULLIF(p_provider_response_hash, ''),
         request_completed_at = now(),
         updated_at = now()
   WHERE id = p_attempt_id
  RETURNING * INTO v_attempt;

  UPDATE public.journal_entry_executions
     SET status = 'POSTED_UNVERIFIED',
         provider_journal_id = v_qbo_je_id,
         provider_response_hash = NULLIF(p_provider_response_hash, ''),
         state_version = v_execution.state_version + 1,
         updated_at = now()
   WHERE id = v_execution.id
     AND status = 'POSTING'
     AND state_version = v_execution.state_version
  RETURNING * INTO v_execution;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during provider_posted';
  END IF;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.provider_posted',
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
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

  attempt := to_jsonb(v_attempt);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;

-- D. Unknown: UNKNOWN_RESULT + POSSIBLY_COMMITTED + UNKNOWN_COMMIT + post_unknown
CREATE OR REPLACE FUNCTION public.apply_journal_entry_provider_post_unknown(
  p_attempt_id uuid,
  p_expected_status text,
  p_intuit_tid text,
  p_provider_error_code text,
  p_provider_error_message text,
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
BEGIN
  IF COALESCE(p_expected_status, '') IS DISTINCT FROM 'REQUEST_STARTED' THEN
    RAISE EXCEPTION 'je_provider_post_unknown_expected_status_must_be_REQUEST_STARTED';
  END IF;
  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'UNKNOWN_COMMIT' THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload status must be UNKNOWN_COMMIT';
  END IF;
  IF COALESCE(p_event_payload->>'commit_certainty', '') IS DISTINCT FROM 'POSSIBLY_COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload commit_certainty must be POSSIBLY_COMMITTED';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_attempt.status IS DISTINCT FROM 'REQUEST_STARTED'
     OR v_attempt.commit_certainty IS DISTINCT FROM 'POSSIBLY_COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_post_unknown_custody_invalid: status=% certainty=%',
      v_attempt.status, v_attempt.commit_certainty;
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = v_attempt.execution_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found for attempt %', p_attempt_id;
  END IF;
  IF v_execution.status IS DISTINCT FROM 'POSTING' THEN
    RAISE EXCEPTION 'je_provider_post_unknown_execution_status_invalid: %', v_execution.status;
  END IF;

  IF COALESCE(p_event_payload->>'execution_id', '') IS DISTINCT FROM v_execution.id::text THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload execution_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_attempt_id', '') IS DISTINCT FROM v_attempt.id::text THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload provider_attempt_id mismatch';
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);
  PERFORM set_config('advisacor.je_execution_transition', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = 'UNKNOWN_RESULT',
         commit_certainty = 'POSSIBLY_COMMITTED',
         intuit_tid = COALESCE(NULLIF(p_intuit_tid, ''), intuit_tid),
         provider_error_code = NULLIF(p_provider_error_code, ''),
         provider_error_message = NULLIF(p_provider_error_message, ''),
         request_completed_at = now(),
         updated_at = now()
   WHERE id = p_attempt_id
  RETURNING * INTO v_attempt;

  UPDATE public.journal_entry_executions
     SET status = 'UNKNOWN_COMMIT',
         last_error_code = NULLIF(p_provider_error_code, ''),
         last_error_message = NULLIF(p_provider_error_message, ''),
         state_version = v_execution.state_version + 1,
         updated_at = now()
   WHERE id = v_execution.id
     AND status = 'POSTING'
     AND state_version = v_execution.state_version
  RETURNING * INTO v_execution;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during post_unknown';
  END IF;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.post_unknown',
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
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

  attempt := to_jsonb(v_attempt);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;

-- E. Proven pre-commit failure (rare; not used for speculative 4xx).
CREATE OR REPLACE FUNCTION public.apply_journal_entry_provider_precommit_failed(
  p_attempt_id uuid,
  p_expected_status text,
  p_provider_error_code text,
  p_provider_error_message text,
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
BEGIN
  IF COALESCE(p_expected_status, '') IS DISTINCT FROM 'REQUEST_STARTED' THEN
    RAISE EXCEPTION 'je_provider_precommit_failed_expected_status_must_be_REQUEST_STARTED';
  END IF;
  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'FAILED' THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload status must be FAILED';
  END IF;
  IF COALESCE(p_event_payload->>'commit_certainty', '') IS DISTINCT FROM 'DEFINITELY_NOT_COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload commit_certainty must be DEFINITELY_NOT_COMMITTED';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_attempt.status IS DISTINCT FROM 'REQUEST_STARTED'
     OR v_attempt.commit_certainty IS DISTINCT FROM 'POSSIBLY_COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_precommit_failed_custody_invalid: status=% certainty=%',
      v_attempt.status, v_attempt.commit_certainty;
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = v_attempt.execution_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found for attempt %', p_attempt_id;
  END IF;
  IF v_execution.status IS DISTINCT FROM 'POSTING' THEN
    RAISE EXCEPTION 'je_provider_precommit_failed_execution_status_invalid: %', v_execution.status;
  END IF;

  IF COALESCE(p_event_payload->>'execution_id', '') IS DISTINCT FROM v_execution.id::text THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload execution_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_attempt_id', '') IS DISTINCT FROM v_attempt.id::text THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload provider_attempt_id mismatch';
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);
  PERFORM set_config('advisacor.je_execution_transition', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = 'FAILED_PRECOMMIT',
         commit_certainty = 'DEFINITELY_NOT_COMMITTED',
         provider_error_code = NULLIF(p_provider_error_code, ''),
         provider_error_message = NULLIF(p_provider_error_message, ''),
         request_completed_at = now(),
         updated_at = now()
   WHERE id = p_attempt_id
  RETURNING * INTO v_attempt;

  UPDATE public.journal_entry_executions
     SET status = 'FAILED',
         last_error_code = NULLIF(p_provider_error_code, ''),
         last_error_message = NULLIF(p_provider_error_message, ''),
         state_version = v_execution.state_version + 1,
         updated_at = now()
   WHERE id = v_execution.id
     AND status = 'POSTING'
     AND state_version = v_execution.state_version
  RETURNING * INTO v_execution;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during precommit_failed';
  END IF;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.execution_failed',
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
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

  attempt := to_jsonb(v_attempt);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.apply_journal_entry_provider_dispatch_started(
  uuid, text, jsonb, text, uuid, uuid, uuid, text, text
) IS
  'JE-3B2: establish POSSIBLY_COMMITTED before any QBO POST may leave. Patent #6 provider_dispatch_started.';

COMMENT ON FUNCTION public.apply_journal_entry_provider_posted(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) IS
  'JE-3B2: atomic success custody + POSTED_UNVERIFIED + provider_posted. No Memory. No VERIFIED.';

COMMENT ON FUNCTION public.apply_journal_entry_provider_post_unknown(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) IS
  'JE-3B2: atomic unknown custody + UNKNOWN_COMMIT + post_unknown. No blind retry.';

COMMENT ON FUNCTION public.apply_journal_entry_provider_precommit_failed(
  uuid, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) IS
  'JE-3B2: proven pre-commit failure only. Speculative 4xx must use post_unknown until Intuit evidence exists.';
