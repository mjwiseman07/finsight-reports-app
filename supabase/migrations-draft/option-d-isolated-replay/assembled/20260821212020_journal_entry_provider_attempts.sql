-- JE-3B1 — Governed QBO provider-attempt + unknown-commit recovery foundation.
-- Domain authority remains journal_entry_executions.
-- Provider attempts are network-level CREATE attempt custody.
-- Widens DB mutation for POSTING / UNKNOWN_COMMIT / POSTED_UNVERIFIED / FAILED.
-- Does NOT enable governed QBO JournalEntry POST.
-- Does NOT write je_post_attempts or Memory.
-- D2 je_post_attempts remains legacy spine only — not reused here.

CREATE TABLE IF NOT EXISTS public.journal_entry_provider_attempts (
  id uuid PRIMARY KEY,
  execution_id uuid NOT NULL
    REFERENCES public.journal_entry_executions(id)
    ON DELETE RESTRICT,
  accounting_connection_id uuid NOT NULL
    REFERENCES public.accounting_connections(id)
    ON DELETE RESTRICT,
  provider text NOT NULL,
  provider_request_hash text NOT NULL,
  correlation_marker text NOT NULL,
  status text NOT NULL,
  commit_certainty text NOT NULL,
  request_started_at timestamptz NULL,
  request_completed_at timestamptz NULL,
  qbo_je_id text NULL,
  intuit_tid text NULL,
  provider_response_hash text NULL,
  provider_error_code text NULL,
  provider_error_message text NULL,
  discovery_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_entry_provider_attempts_execution_unique
    UNIQUE (execution_id),
  CONSTRAINT journal_entry_provider_attempts_provider_check
    CHECK (provider = 'quickbooks'),
  CONSTRAINT journal_entry_provider_attempts_request_hash_check
    CHECK (provider_request_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_provider_attempts_correlation_marker_check
    CHECK (char_length(btrim(correlation_marker)) > 0),
  CONSTRAINT journal_entry_provider_attempts_status_check
    CHECK (status IN (
      'RESERVED',
      'REQUEST_STARTED',
      'RESPONSE_RECEIVED',
      'UNKNOWN_RESULT',
      'FAILED_PRECOMMIT',
      'DISCOVERED_COMMITTED',
      'DISCOVERED_NOT_FOUND',
      'VERIFIED_PROVIDER_ID'
    )),
  CONSTRAINT journal_entry_provider_attempts_commit_certainty_check
    CHECK (commit_certainty IN (
      'NOT_SENT',
      'DEFINITELY_NOT_COMMITTED',
      'POSSIBLY_COMMITTED',
      'COMMITTED'
    ))
);

CREATE INDEX IF NOT EXISTS journal_entry_provider_attempts_connection_idx
  ON public.journal_entry_provider_attempts (accounting_connection_id);

CREATE INDEX IF NOT EXISTS journal_entry_provider_attempts_qbo_je_idx
  ON public.journal_entry_provider_attempts (qbo_je_id)
  WHERE qbo_je_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS journal_entry_provider_attempts_marker_idx
  ON public.journal_entry_provider_attempts (correlation_marker);

COMMENT ON TABLE public.journal_entry_provider_attempts IS
  'JE-3B1 governed provider CREATE-attempt custody. One execution → one create attempt. Not domain authority (that is journal_entry_executions). Does not replace je_post_attempts. No Memory. No governed POST in JE-3B1.';

CREATE OR REPLACE FUNCTION public.journal_entry_provider_attempts_guard_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('advisacor.je_provider_attempt_mutation', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION
      'journal_entry_provider_attempts mutations must use governed provider-attempt RPCs';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'journal_entry_provider_attempts rows cannot be deleted';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS journal_entry_provider_attempts_guard_update
  ON public.journal_entry_provider_attempts;
CREATE TRIGGER journal_entry_provider_attempts_guard_update
  BEFORE UPDATE ON public.journal_entry_provider_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_provider_attempts_guard_mutation();

DROP TRIGGER IF EXISTS journal_entry_provider_attempts_guard_delete
  ON public.journal_entry_provider_attempts;
CREATE TRIGGER journal_entry_provider_attempts_guard_delete
  BEFORE DELETE ON public.journal_entry_provider_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_provider_attempts_guard_mutation();

ALTER TABLE public.journal_entry_provider_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journal_entry_provider_attempts_service_role_all
  ON public.journal_entry_provider_attempts;
CREATE POLICY journal_entry_provider_attempts_service_role_all
  ON public.journal_entry_provider_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS journal_entry_provider_attempts_select
  ON public.journal_entry_provider_attempts;
CREATE POLICY journal_entry_provider_attempts_select
  ON public.journal_entry_provider_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.journal_entry_executions e
      JOIN public.audit_ready_engagements eng
        ON eng.id = e.engagement_id
      WHERE e.id = journal_entry_provider_attempts.execution_id
        AND (
          (
            eng.company_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.company_users cu
              WHERE cu.company_id = eng.company_id
                AND cu.user_id = (SELECT auth.uid())
                AND cu.status = 'active'
            )
          )
          OR
          (
            eng.firm_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.firm_memberships fm
              WHERE fm.firm_id = eng.firm_id
                AND fm.user_id = (SELECT auth.uid())
                AND fm.status = 'active'
            )
          )
        )
    )
  );

GRANT SELECT ON public.journal_entry_provider_attempts TO authenticated;
GRANT ALL ON public.journal_entry_provider_attempts TO service_role;

-- Atomic provider-attempt reservation (no network). One execution → one attempt.
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
    reused := true;
    attempt := to_jsonb(v_existing);
    execution := to_jsonb(v_execution);
    ledger_event_id := NULL;
    RETURN NEXT;
    RETURN;
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
    COALESCE(NULLIF(p_row->>'status', ''), 'RESERVED'),
    COALESCE(NULLIF(p_row->>'commit_certainty', ''), 'NOT_SENT'),
    NULLIF(p_row->>'request_started_at', '')::timestamptz,
    NULLIF(p_row->>'request_completed_at', '')::timestamptz,
    NULLIF(p_row->>'qbo_je_id', ''),
    NULLIF(p_row->>'intuit_tid', ''),
    NULLIF(p_row->>'provider_response_hash', ''),
    NULLIF(p_row->>'provider_error_code', ''),
    NULLIF(p_row->>'provider_error_message', ''),
    COALESCE(p_row->'discovery_summary', '{}'::jsonb)
  )
  RETURNING * INTO v_inserted;

  IF p_publish_posting_started AND v_execution.status = 'READY_TO_POST' THEN
    IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'POSTING' THEN
      RAISE EXCEPTION 'journal entry execution event payload status mismatch: payload=% expected=POSTING',
        COALESCE(p_event_payload->>'status', '<null>');
    END IF;

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
    SELECT * INTO v_execution FROM public.journal_entry_executions WHERE id = v_existing.execution_id;
    reused := true;
    attempt := to_jsonb(v_existing);
    execution := to_jsonb(v_execution);
    ledger_event_id := NULL;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_journal_entry_provider_attempt(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text, boolean
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_journal_entry_provider_attempt(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text, boolean
) FROM anon;
REVOKE ALL ON FUNCTION public.persist_journal_entry_provider_attempt(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text, boolean
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_journal_entry_provider_attempt(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text, boolean
) TO service_role;

-- Atomic provider-attempt local patch (no network).
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

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = COALESCE(NULLIF(p_patch->>'status', ''), status),
         commit_certainty = COALESCE(NULLIF(p_patch->>'commit_certainty', ''), commit_certainty),
         request_started_at = CASE
           WHEN p_patch ? 'request_started_at' THEN NULLIF(p_patch->>'request_started_at', '')::timestamptz
           ELSE request_started_at
         END,
         request_completed_at = CASE
           WHEN p_patch ? 'request_completed_at' THEN NULLIF(p_patch->>'request_completed_at', '')::timestamptz
           ELSE request_completed_at
         END,
         qbo_je_id = CASE
           WHEN p_patch ? 'qbo_je_id' THEN NULLIF(p_patch->>'qbo_je_id', '')
           ELSE qbo_je_id
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

-- Replace JE-3A transition RPC with JE-3B1 coupled matrix.
-- JE-3A pairs preserved. Provider lifecycle pairs added.
-- POSTED_UNVERIFIED → VERIFIED still NOT authorized.
-- UNKNOWN_COMMIT → POSTING still NOT authorized.
CREATE OR REPLACE FUNCTION public.transition_journal_entry_execution(
  p_execution_id uuid,
  p_expected_status text,
  p_expected_state_version integer,
  p_new_status text,
  p_patch jsonb,
  p_event_type text,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
  v_pair_ok boolean := false;
BEGIN
  -- JE-3A pairs
  IF p_expected_status = 'RESERVED'
     AND p_new_status = 'READY_TO_POST'
     AND p_event_type = 'journal_entry.execution_ready' THEN
    v_pair_ok := true;
  ELSIF p_expected_status = 'RESERVED'
     AND p_new_status = 'PRECHECK_FAILED'
     AND p_event_type = 'journal_entry.execution_precheck_failed' THEN
    v_pair_ok := true;
  -- JE-3B1 provider lifecycle pairs
  ELSIF p_expected_status = 'READY_TO_POST'
     AND p_new_status = 'POSTING'
     AND p_event_type = 'journal_entry.posting_started' THEN
    v_pair_ok := true;
  ELSIF p_expected_status = 'POSTING'
     AND p_new_status = 'POSTED_UNVERIFIED'
     AND p_event_type = 'journal_entry.provider_posted' THEN
    v_pair_ok := true;
  ELSIF p_expected_status = 'POSTING'
     AND p_new_status = 'UNKNOWN_COMMIT'
     AND p_event_type = 'journal_entry.post_unknown' THEN
    v_pair_ok := true;
  ELSIF p_expected_status = 'POSTING'
     AND p_new_status = 'FAILED'
     AND p_event_type = 'journal_entry.execution_failed' THEN
    v_pair_ok := true;
  END IF;
  -- UNKNOWN_COMMIT → POSTING intentionally absent (no blind retry).
  -- POSTED_UNVERIFIED → VERIFIED intentionally absent until JE-3C.

  IF NOT v_pair_ok THEN
    RAISE EXCEPTION
      'invalid journal entry execution transition/event pairing: % -> % with %',
      p_expected_status, p_new_status, p_event_type;
  END IF;

  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM p_new_status THEN
    RAISE EXCEPTION
      'journal entry execution event payload status mismatch: payload=% expected=%',
      COALESCE(p_event_payload->>'status', '<null>'), p_new_status;
  END IF;

  SELECT *
    INTO v_row
    FROM public.journal_entry_executions
   WHERE id = p_execution_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found: %', p_execution_id;
  END IF;

  IF v_row.status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'journal_entry_execution status concurrency conflict: expected %, found %',
      p_expected_status, v_row.status;
  END IF;

  IF v_row.state_version IS DISTINCT FROM p_expected_state_version THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict: expected %, found %',
      p_expected_state_version, v_row.state_version;
  END IF;

  PERFORM set_config('advisacor.je_execution_transition', '1', true);

  UPDATE public.journal_entry_executions
     SET status = p_new_status,
         state_version = v_row.state_version + 1,
         preflight_result = COALESCE(p_patch->'preflight_result', preflight_result),
         provider_request_hash = COALESCE(
           NULLIF(p_patch->>'provider_request_hash', ''),
           provider_request_hash
         ),
         provider_journal_id = CASE
           WHEN p_patch ? 'provider_journal_id' THEN NULLIF(p_patch->>'provider_journal_id', '')
           ELSE provider_journal_id
         END,
         provider_response_hash = CASE
           WHEN p_patch ? 'provider_response_hash' THEN NULLIF(p_patch->>'provider_response_hash', '')
           ELSE provider_response_hash
         END,
         last_error_code = CASE
           WHEN p_patch ? 'last_error_code' THEN NULLIF(p_patch->>'last_error_code', '')
           ELSE last_error_code
         END,
         last_error_message = CASE
           WHEN p_patch ? 'last_error_message' THEN NULLIF(p_patch->>'last_error_message', '')
           ELSE last_error_message
         END,
         updated_at = now()
   WHERE id = p_execution_id
  RETURNING * INTO v_row;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      p_event_type,
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_execution',
      v_row.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  execution := to_jsonb(v_row);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;
