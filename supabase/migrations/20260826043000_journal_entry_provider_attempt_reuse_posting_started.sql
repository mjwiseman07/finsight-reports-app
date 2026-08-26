-- JE-3D — Pre-reserved attempt reuse must still establish posting_started.
-- Exact RESERVED + NOT_SENT reuse with p_publish_posting_started=true atomically:
--   READY_TO_POST → POSTING + journal_entry.posting_started
-- Attempt custody unchanged. No second attempt. No provider POST.

CREATE OR REPLACE FUNCTION public.je_publish_posting_started_from_ready(
  p_execution public.journal_entry_executions,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  execution public.journal_entry_executions,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_execution public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
BEGIN
  v_execution := p_execution;

  IF v_execution.status IS DISTINCT FROM 'READY_TO_POST' THEN
    RAISE EXCEPTION 'je_provider_attempt_execution_status_invalid: %', v_execution.status;
  END IF;

  IF p_engagement_id IS DISTINCT FROM v_execution.engagement_id THEN
    RAISE EXCEPTION 'je_provider_attempt_engagement_mismatch';
  END IF;
  IF p_firm_client_id IS DISTINCT FROM v_execution.firm_client_id THEN
    RAISE EXCEPTION 'je_provider_attempt_firm_client_mismatch';
  END IF;

  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'POSTING' THEN
    RAISE EXCEPTION 'journal entry execution event payload status mismatch: payload=% expected=POSTING',
      COALESCE(p_event_payload->>'status', '<null>');
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);
  PERFORM set_config('advisacor.je_execution_transition', '1', true);

  UPDATE public.journal_entry_executions
     SET status = 'POSTING',
         state_version = v_execution.state_version + 1,
         updated_at = now()
   WHERE id = v_execution.id
     AND status = 'READY_TO_POST'
     AND state_version = v_execution.state_version
  RETURNING * INTO v_execution;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during posting_started';
  END IF;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.posting_started',
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

  execution := v_execution;
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.persist_journal_entry_provider_attempt(
  p_row jsonb,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text,
  p_publish_posting_started boolean DEFAULT false
)
RETURNS TABLE(
  reused boolean,
  attempt jsonb,
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.journal_entry_provider_attempts%ROWTYPE;
  v_inserted public.journal_entry_provider_attempts%ROWTYPE;
  v_execution public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
BEGIN
  IF p_row ? 'status'
     AND NULLIF(p_row->>'status', '') IS NOT NULL
     AND p_row->>'status' IS DISTINCT FROM 'RESERVED' THEN
    RAISE EXCEPTION 'je_provider_attempt_initial_status_forbidden: %', p_row->>'status';
  END IF;
  IF p_row ? 'commit_certainty'
     AND NULLIF(p_row->>'commit_certainty', '') IS NOT NULL
     AND p_row->>'commit_certainty' IS DISTINCT FROM 'NOT_SENT' THEN
    RAISE EXCEPTION 'je_provider_attempt_initial_certainty_forbidden: %',
      p_row->>'commit_certainty';
  END IF;
  IF p_row ? 'qbo_je_id' AND NULLIF(p_row->>'qbo_je_id', '') IS NOT NULL THEN
    RAISE EXCEPTION 'je_provider_attempt_initial_qbo_je_id_forbidden';
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = (p_row->>'execution_id')::uuid
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found: %', p_row->>'execution_id';
  END IF;

  IF v_execution.accounting_connection_id::text IS DISTINCT FROM p_row->>'accounting_connection_id' THEN
    RAISE EXCEPTION 'je_provider_attempt_connection_mismatch';
  END IF;
  IF v_execution.provider_request_hash IS DISTINCT FROM p_row->>'provider_request_hash' THEN
    RAISE EXCEPTION 'je_provider_attempt_request_hash_mismatch';
  END IF;
  IF v_execution.correlation_marker IS DISTINCT FROM p_row->>'correlation_marker' THEN
    RAISE EXCEPTION 'je_provider_attempt_correlation_mismatch';
  END IF;
  IF v_execution.provider IS DISTINCT FROM p_row->>'provider' THEN
    RAISE EXCEPTION 'je_provider_attempt_provider_mismatch';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.journal_entry_provider_attempts
   WHERE execution_id = v_execution.id;

  IF FOUND THEN
    IF v_existing.provider_request_hash IS DISTINCT FROM p_row->>'provider_request_hash'
       OR v_existing.accounting_connection_id::text IS DISTINCT FROM p_row->>'accounting_connection_id'
       OR v_existing.correlation_marker IS DISTINCT FROM p_row->>'correlation_marker' THEN
      RAISE EXCEPTION 'je_provider_attempt_binding_conflict';
    END IF;

    IF NOT p_publish_posting_started THEN
      reused := true;
      attempt := to_jsonb(v_existing);
      execution := to_jsonb(v_execution);
      ledger_event_id := NULL;
      RETURN NEXT;
      RETURN;
    END IF;

    IF v_execution.status = 'POSTING' THEN
      IF v_existing.status IS DISTINCT FROM 'RESERVED'
         OR v_existing.commit_certainty IS DISTINCT FROM 'NOT_SENT'
         OR v_existing.qbo_je_id IS NOT NULL
         OR v_existing.request_started_at IS NOT NULL THEN
        RAISE EXCEPTION 'je_provider_attempt_reuse_posting_started_forbidden: %', v_existing.status;
      END IF;
      reused := true;
      attempt := to_jsonb(v_existing);
      execution := to_jsonb(v_execution);
      ledger_event_id := NULL;
      RETURN NEXT;
      RETURN;
    END IF;

    IF v_execution.status = 'READY_TO_POST' THEN
      IF v_existing.status IS DISTINCT FROM 'RESERVED'
         OR v_existing.commit_certainty IS DISTINCT FROM 'NOT_SENT'
         OR v_existing.qbo_je_id IS NOT NULL
         OR v_existing.request_started_at IS NOT NULL THEN
        RAISE EXCEPTION 'je_provider_attempt_reuse_posting_started_forbidden: %', v_existing.status;
      END IF;

      SELECT ps.execution, ps.ledger_event_id
        INTO v_execution, v_event_id
        FROM public.je_publish_posting_started_from_ready(
          v_execution,
          p_event_payload,
          p_event_payload_canonical,
          p_firm_id,
          p_firm_client_id,
          p_engagement_id,
          p_close_period_id,
          p_actor_id
        ) AS ps;

      reused := true;
      attempt := to_jsonb(v_existing);
      execution := to_jsonb(v_execution);
      ledger_event_id := v_event_id;
      RETURN NEXT;
      RETURN;
    END IF;

    RAISE EXCEPTION 'je_provider_attempt_reuse_posting_started_forbidden: execution=% attempt=%',
      v_execution.status, v_existing.status;
  END IF;

  IF v_execution.status IS DISTINCT FROM 'READY_TO_POST'
     AND v_execution.status IS DISTINCT FROM 'POSTING' THEN
    RAISE EXCEPTION 'je_provider_attempt_execution_status_invalid: %', v_execution.status;
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);
  IF p_publish_posting_started AND v_execution.status = 'READY_TO_POST' THEN
    PERFORM set_config('advisacor.je_execution_transition', '1', true);
  END IF;

  INSERT INTO public.journal_entry_provider_attempts (
    id,
    execution_id,
    accounting_connection_id,
    provider,
    provider_request_hash,
    correlation_marker,
    status,
    commit_certainty,
    request_started_at,
    request_completed_at,
    qbo_je_id,
    intuit_tid,
    provider_response_hash,
    provider_error_code,
    provider_error_message,
    discovery_summary
  ) VALUES (
    (p_row->>'id')::uuid,
    v_execution.id,
    (p_row->>'accounting_connection_id')::uuid,
    p_row->>'provider',
    p_row->>'provider_request_hash',
    p_row->>'correlation_marker',
    'RESERVED',
    'NOT_SENT',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '{}'::jsonb
  )
  RETURNING * INTO v_inserted;

  IF p_publish_posting_started AND v_execution.status = 'READY_TO_POST' THEN
    SELECT ps.execution, ps.ledger_event_id
      INTO v_execution, v_event_id
      FROM public.je_publish_posting_started_from_ready(
        v_execution,
        p_event_payload,
        p_event_payload_canonical,
        p_firm_id,
        p_firm_client_id,
        p_engagement_id,
        p_close_period_id,
        p_actor_id
      ) AS ps;
  END IF;

  reused := false;
  attempt := to_jsonb(v_inserted);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO v_existing
      FROM public.journal_entry_provider_attempts
     WHERE execution_id = (p_row->>'execution_id')::uuid;
    IF NOT FOUND THEN
      RAISE;
    END IF;
    IF v_existing.provider_request_hash IS DISTINCT FROM p_row->>'provider_request_hash'
       OR v_existing.accounting_connection_id::text IS DISTINCT FROM p_row->>'accounting_connection_id'
       OR v_existing.correlation_marker IS DISTINCT FROM p_row->>'correlation_marker' THEN
      RAISE EXCEPTION 'je_provider_attempt_binding_conflict';
    END IF;

    SELECT *
      INTO v_execution
      FROM public.journal_entry_executions
     WHERE id = v_existing.execution_id
     FOR UPDATE;

    IF NOT p_publish_posting_started THEN
      reused := true;
      attempt := to_jsonb(v_existing);
      execution := to_jsonb(v_execution);
      ledger_event_id := NULL;
      RETURN NEXT;
      RETURN;
    END IF;

    IF v_execution.status = 'POSTING' THEN
      IF v_existing.status IS DISTINCT FROM 'RESERVED'
         OR v_existing.commit_certainty IS DISTINCT FROM 'NOT_SENT'
         OR v_existing.qbo_je_id IS NOT NULL
         OR v_existing.request_started_at IS NOT NULL THEN
        RAISE EXCEPTION 'je_provider_attempt_reuse_posting_started_forbidden: %', v_existing.status;
      END IF;
      reused := true;
      attempt := to_jsonb(v_existing);
      execution := to_jsonb(v_execution);
      ledger_event_id := NULL;
      RETURN NEXT;
      RETURN;
    END IF;

    IF v_execution.status = 'READY_TO_POST' THEN
      IF v_existing.status IS DISTINCT FROM 'RESERVED'
         OR v_existing.commit_certainty IS DISTINCT FROM 'NOT_SENT'
         OR v_existing.qbo_je_id IS NOT NULL
         OR v_existing.request_started_at IS NOT NULL THEN
        RAISE EXCEPTION 'je_provider_attempt_reuse_posting_started_forbidden: %', v_existing.status;
      END IF;

      SELECT ps.execution, ps.ledger_event_id
        INTO v_execution, v_event_id
        FROM public.je_publish_posting_started_from_ready(
          v_execution,
          p_event_payload,
          p_event_payload_canonical,
          p_firm_id,
          p_firm_client_id,
          p_engagement_id,
          p_close_period_id,
          p_actor_id
        ) AS ps;

      reused := true;
      attempt := to_jsonb(v_existing);
      execution := to_jsonb(v_execution);
      ledger_event_id := v_event_id;
      RETURN NEXT;
      RETURN;
    END IF;

    RAISE EXCEPTION 'je_provider_attempt_reuse_posting_started_forbidden: execution=% attempt=%',
      v_execution.status, v_existing.status;
END;
$$;

COMMENT ON FUNCTION public.persist_journal_entry_provider_attempt(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text, boolean
) IS
  'JE-3B1/3D: create provider attempt as RESERVED+NOT_SENT; exact reuse preserves attempt custody; RESERVED reuse may establish atomic posting_started when execution is READY_TO_POST.';
