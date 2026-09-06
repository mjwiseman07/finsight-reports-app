-- JE-3B1 — Recovery custody + Patent #6 receipts for discovery conclusions.
-- Narrows generic patch so it cannot establish COMMITTED / DISCOVERED_* / qbo_je_id.
-- Adds dedicated atomic RPCs that couple custody mutation to ledger events.
-- Does NOT enable governed QBO POST. Does NOT enable VERIFIED.

-- A. Narrow generic observation-only patch.
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
  v_new_certainty text;
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

  -- Accounting conclusions require dedicated receipted RPCs.
  IF p_patch ? 'qbo_je_id'
     AND NULLIF(p_patch->>'qbo_je_id', '') IS NOT NULL THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: qbo_je_id requires provider_commit_discovered RPC';
  END IF;

  v_new_certainty := NULLIF(p_patch->>'commit_certainty', '');
  IF v_new_certainty = 'COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: COMMITTED requires provider_commit_discovered RPC';
  END IF;

  v_new_status := NULLIF(p_patch->>'status', '');
  IF v_new_status IN ('DISCOVERED_COMMITTED', 'DISCOVERED_NOT_FOUND', 'VERIFIED_PROVIDER_ID') THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: status % requires receipted discovery RPC',
      v_new_status;
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = COALESCE(v_new_status, status),
         commit_certainty = COALESCE(v_new_certainty, commit_certainty),
         request_started_at = CASE
           WHEN p_patch ? 'request_started_at' THEN NULLIF(p_patch->>'request_started_at', '')::timestamptz
           ELSE request_started_at
         END,
         request_completed_at = CASE
           WHEN p_patch ? 'request_completed_at' THEN NULLIF(p_patch->>'request_completed_at', '')::timestamptz
           ELSE request_completed_at
         END,
         -- qbo_je_id deliberately not updatable here
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

-- B. Atomic EXACT_ONE commit discovery + Patent #6 receipt.
CREATE OR REPLACE FUNCTION public.apply_journal_entry_provider_commit_discovered(
  p_attempt_id uuid,
  p_expected_status text,
  p_qbo_je_id text,
  p_provider_response_hash text,
  p_discovery_summary jsonb,
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
    RAISE EXCEPTION 'je_provider_commit_discovered_qbo_je_id_required';
  END IF;

  IF COALESCE(p_event_payload->>'commit_certainty', '') IS DISTINCT FROM 'COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_commit_discovered payload commit_certainty must be COMMITTED';
  END IF;
  IF COALESCE(p_event_payload->>'qbo_je_id', '') IS DISTINCT FROM v_qbo_je_id THEN
    RAISE EXCEPTION 'je_provider_commit_discovered payload qbo_je_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'discovery_result', '') IS DISTINCT FROM 'EXACT_ONE' THEN
    RAISE EXCEPTION 'je_provider_commit_discovered payload discovery_result must be EXACT_ONE';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_attempt.status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt status concurrency conflict: expected %, found %',
      p_expected_status, v_attempt.status;
  END IF;
  IF v_attempt.qbo_je_id IS NOT NULL
     AND v_attempt.qbo_je_id IS DISTINCT FROM v_qbo_je_id THEN
    RAISE EXCEPTION 'je_provider_commit_discovered_qbo_je_id_conflict';
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = v_attempt.execution_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found for attempt %', p_attempt_id;
  END IF;

  IF COALESCE(p_event_payload->>'execution_id', '') IS DISTINCT FROM v_execution.id::text THEN
    RAISE EXCEPTION 'je_provider_commit_discovered payload execution_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_attempt_id', '') IS DISTINCT FROM v_attempt.id::text THEN
    RAISE EXCEPTION 'je_provider_commit_discovered payload provider_attempt_id mismatch';
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = 'DISCOVERED_COMMITTED',
         commit_certainty = 'COMMITTED',
         qbo_je_id = v_qbo_je_id,
         provider_response_hash = COALESCE(
           NULLIF(p_provider_response_hash, ''),
           provider_response_hash
         ),
         discovery_summary = COALESCE(p_discovery_summary, discovery_summary),
         updated_at = now()
   WHERE id = p_attempt_id
  RETURNING * INTO v_attempt;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.provider_commit_discovered',
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

REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_commit_discovered(
  uuid, text, text, text, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_commit_discovered(
  uuid, text, text, text, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_commit_discovered(
  uuid, text, text, text, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_provider_commit_discovered(
  uuid, text, text, text, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

-- C. Atomic confirmed-not-found + Patent #6 receipt.
-- Only when custody already proves NOT_SENT or DEFINITELY_NOT_COMMITTED.
CREATE OR REPLACE FUNCTION public.apply_journal_entry_provider_not_found_confirmed(
  p_attempt_id uuid,
  p_expected_status text,
  p_discovery_summary jsonb,
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
  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'DISCOVERED_NOT_FOUND' THEN
    RAISE EXCEPTION 'je_provider_not_found_confirmed payload status must be DISCOVERED_NOT_FOUND';
  END IF;
  IF COALESCE(p_event_payload->>'discovery_result', '') IS DISTINCT FROM 'NONE' THEN
    RAISE EXCEPTION 'je_provider_not_found_confirmed payload discovery_result must be NONE';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_attempt.status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt status concurrency conflict: expected %, found %',
      p_expected_status, v_attempt.status;
  END IF;
  IF v_attempt.commit_certainty NOT IN ('NOT_SENT', 'DEFINITELY_NOT_COMMITTED') THEN
    RAISE EXCEPTION
      'je_provider_not_found_confirmed requires NOT_SENT or DEFINITELY_NOT_COMMITTED; found %',
      v_attempt.commit_certainty;
  END IF;
  IF v_attempt.qbo_je_id IS NOT NULL THEN
    RAISE EXCEPTION 'je_provider_not_found_confirmed cannot apply when qbo_je_id already bound';
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = v_attempt.execution_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found for attempt %', p_attempt_id;
  END IF;

  IF COALESCE(p_event_payload->>'execution_id', '') IS DISTINCT FROM v_execution.id::text THEN
    RAISE EXCEPTION 'je_provider_not_found_confirmed payload execution_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_attempt_id', '') IS DISTINCT FROM v_attempt.id::text THEN
    RAISE EXCEPTION 'je_provider_not_found_confirmed payload provider_attempt_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'commit_certainty', '') IS DISTINCT FROM v_attempt.commit_certainty THEN
    RAISE EXCEPTION 'je_provider_not_found_confirmed payload commit_certainty mismatch';
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = 'DISCOVERED_NOT_FOUND',
         discovery_summary = COALESCE(p_discovery_summary, discovery_summary),
         updated_at = now()
   WHERE id = p_attempt_id
  RETURNING * INTO v_attempt;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.provider_not_found_confirmed',
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

REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_not_found_confirmed(
  uuid, text, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_not_found_confirmed(
  uuid, text, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_not_found_confirmed(
  uuid, text, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_provider_not_found_confirmed(
  uuid, text, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

COMMENT ON FUNCTION public.apply_journal_entry_provider_commit_discovered IS
  'JE-3B1: atomic DISCOVERED_COMMITTED + COMMITTED + qbo_je_id + journal_entry.provider_commit_discovered. Ledger failure rolls back custody.';

COMMENT ON FUNCTION public.apply_journal_entry_provider_not_found_confirmed IS
  'JE-3B1: atomic DISCOVERED_NOT_FOUND + journal_entry.provider_not_found_confirmed for successful NONE when NOT_SENT/DEFINITELY_NOT_COMMITTED.';
