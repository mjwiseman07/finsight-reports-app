-- JE-3A — Governed Journal Entry execution custody + preflight foundation.
-- Domain authority for execution/query. Stops at READY_TO_POST.
-- NO QBO POST. NO je_post_attempts rows. NO Memory. NO auto-governed principal.
-- Future JE-3B binds journal_entry_executions.id → je_post_attempts idempotency.

CREATE TABLE IF NOT EXISTS public.journal_entry_executions (
  id uuid PRIMARY KEY,
  proposal_id uuid NOT NULL
    REFERENCES public.journal_entry_proposals(id)
    ON DELETE RESTRICT,
  approval_id uuid NOT NULL
    REFERENCES public.journal_entry_approvals(id)
    ON DELETE RESTRICT,
  company_id uuid NOT NULL
    REFERENCES public.companies(id)
    ON DELETE RESTRICT,
  engagement_id uuid NOT NULL
    REFERENCES public.audit_ready_engagements(id)
    ON DELETE RESTRICT,
  firm_client_id uuid NULL,
  source_continuous_close_run_id uuid NOT NULL,
  source_accounting_sync_id uuid NOT NULL,
  accounting_connection_id uuid NOT NULL
    REFERENCES public.accounting_connections(id)
    ON DELETE RESTRICT,
  provider text NOT NULL,
  proposal_hash text NOT NULL,
  approval_policy_hash text NOT NULL,
  execution_policy_hash text NOT NULL,
  execution_hash text NOT NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL,
  correlation_marker text NOT NULL,
  execution_policy_snapshot jsonb NOT NULL,
  preflight_result jsonb NOT NULL,
  requested_by uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE RESTRICT,
  requested_at timestamptz NOT NULL,
  state_version integer NOT NULL DEFAULT 1,
  provider_journal_id text NULL,
  provider_request_hash text NULL,
  provider_response_hash text NULL,
  last_error_code text NULL,
  last_error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_entry_executions_provider_check
    CHECK (provider = 'quickbooks'),
  CONSTRAINT journal_entry_executions_status_check
    CHECK (status IN (
      'RESERVED',
      'PRECHECK_FAILED',
      'READY_TO_POST',
      'POSTING',
      'POSTED_UNVERIFIED',
      'UNKNOWN_COMMIT',
      'VERIFIED',
      'FAILED',
      'REVERSAL_REQUIRED'
    )),
  CONSTRAINT journal_entry_executions_proposal_hash_check
    CHECK (proposal_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_executions_approval_policy_hash_check
    CHECK (approval_policy_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_executions_execution_policy_hash_check
    CHECK (execution_policy_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_executions_execution_hash_check
    CHECK (execution_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_executions_idempotency_key_check
    CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_executions_idempotency_key_unique
    UNIQUE (idempotency_key),
  CONSTRAINT journal_entry_executions_correlation_marker_check
    CHECK (char_length(btrim(correlation_marker)) > 0),
  CONSTRAINT journal_entry_executions_correlation_marker_unique
    UNIQUE (correlation_marker),
  CONSTRAINT journal_entry_executions_approval_unique
    UNIQUE (approval_id),
  CONSTRAINT journal_entry_executions_state_version_check
    CHECK (state_version > 0),
  CONSTRAINT journal_entry_executions_provider_journal_null_until_post
    CHECK (provider_journal_id IS NULL OR status IN (
      'POSTED_UNVERIFIED',
      'UNKNOWN_COMMIT',
      'VERIFIED',
      'FAILED',
      'REVERSAL_REQUIRED',
      'POSTING'
    ))
);

CREATE INDEX IF NOT EXISTS journal_entry_executions_proposal_idx
  ON public.journal_entry_executions (proposal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS journal_entry_executions_engagement_idx
  ON public.journal_entry_executions (engagement_id, created_at DESC);

CREATE INDEX IF NOT EXISTS journal_entry_executions_connection_idx
  ON public.journal_entry_executions (accounting_connection_id);

CREATE INDEX IF NOT EXISTS journal_entry_executions_status_idx
  ON public.journal_entry_executions (status, updated_at DESC);

COMMENT ON TABLE public.journal_entry_executions IS
  'JE-3A governed execution custody. Mutable state machine with Patent #6 receipts. Domain authority for JE execution/query. Does not replace je_post_attempts (D2 spine for JE-3B). No provider write in JE-3A.';

COMMENT ON COLUMN public.journal_entry_executions.provider_journal_id IS
  'Nullable until a verified provider commit. JE-3A must never populate this.';

COMMENT ON COLUMN public.journal_entry_executions.accounting_connection_id IS
  'Canonical accounting_connections.id is domain authority; realm is provider metadata only.';

-- Authenticated path never writes; service_role uses RPCs that SET LOCAL.
-- Trigger blocks direct UPDATE/DELETE unless session flag is set by RPC.
CREATE OR REPLACE FUNCTION public.journal_entry_executions_guard_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('advisacor.je_execution_transition', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION
      'journal_entry_executions mutations must use transition_journal_entry_execution RPC';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'journal_entry_executions rows cannot be deleted';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS journal_entry_executions_guard_update
  ON public.journal_entry_executions;
CREATE TRIGGER journal_entry_executions_guard_update
  BEFORE UPDATE ON public.journal_entry_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_executions_guard_mutation();

DROP TRIGGER IF EXISTS journal_entry_executions_guard_delete
  ON public.journal_entry_executions;
CREATE TRIGGER journal_entry_executions_guard_delete
  BEFORE DELETE ON public.journal_entry_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_executions_guard_mutation();

ALTER TABLE public.journal_entry_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journal_entry_executions_service_role_all
  ON public.journal_entry_executions;
CREATE POLICY journal_entry_executions_service_role_all
  ON public.journal_entry_executions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS journal_entry_executions_select
  ON public.journal_entry_executions;
CREATE POLICY journal_entry_executions_select
  ON public.journal_entry_executions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = journal_entry_executions.engagement_id
        AND (
          (
            e.company_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.company_users cu
              WHERE cu.company_id = e.company_id
                AND cu.user_id = (SELECT auth.uid())
                AND cu.status = 'active'
            )
          )
          OR
          (
            e.firm_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.firm_memberships fm
              WHERE fm.firm_id = e.firm_id
                AND fm.user_id = (SELECT auth.uid())
                AND fm.status = 'active'
            )
          )
        )
    )
  );

GRANT SELECT ON public.journal_entry_executions TO authenticated;
GRANT ALL ON public.journal_entry_executions TO service_role;

-- Immutable binding equality for reservation reuse (excludes id/marker/status).
CREATE OR REPLACE FUNCTION public.je_execution_immutable_binding_matches(
  p_existing public.journal_entry_executions,
  p_row jsonb
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN
    p_existing.proposal_id::text = p_row->>'proposal_id'
    AND p_existing.approval_id::text = p_row->>'approval_id'
    AND p_existing.company_id::text = p_row->>'company_id'
    AND p_existing.engagement_id::text = p_row->>'engagement_id'
    AND p_existing.source_continuous_close_run_id::text = p_row->>'source_continuous_close_run_id'
    AND p_existing.source_accounting_sync_id::text = p_row->>'source_accounting_sync_id'
    AND p_existing.accounting_connection_id::text = p_row->>'accounting_connection_id'
    AND p_existing.provider = p_row->>'provider'
    AND p_existing.proposal_hash = p_row->>'proposal_hash'
    AND p_existing.approval_policy_hash = p_row->>'approval_policy_hash'
    AND p_existing.execution_policy_hash = p_row->>'execution_policy_hash'
    AND p_existing.execution_hash = p_row->>'execution_hash'
    AND p_existing.idempotency_key = p_row->>'idempotency_key';
END;
$$;

-- Atomic reservation insert + Patent #6 execution_requested receipt.
-- Exact logical reuse vs approval_id binding conflict are distinguished.
CREATE OR REPLACE FUNCTION public.persist_journal_entry_execution_reservation(
  p_row jsonb,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  reused boolean,
  reuse_reason text,
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.journal_entry_executions%ROWTYPE;
  v_inserted public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
BEGIN
  SELECT *
    INTO v_existing
    FROM public.journal_entry_executions
   WHERE idempotency_key = p_row->>'idempotency_key';

  IF FOUND THEN
    IF NOT public.je_execution_immutable_binding_matches(v_existing, p_row) THEN
      RAISE EXCEPTION 'je_execution_binding_conflict: idempotency_key match with mismatched immutable binding'
        USING ERRCODE = 'P0001';
    END IF;
    reused := true;
    reuse_reason := 'idempotency_key';
    execution := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- One approval → one execution record (UNIQUE approval_id).
  -- Exact binding → reuse. Different binding → fail closed (no silent collapse).
  SELECT *
    INTO v_existing
    FROM public.journal_entry_executions
   WHERE approval_id = (p_row->>'approval_id')::uuid
   LIMIT 1;
  IF FOUND THEN
    IF NOT public.je_execution_immutable_binding_matches(v_existing, p_row) THEN
      RAISE EXCEPTION 'je_execution_binding_conflict: approval_id already reserved under a different immutable binding'
        USING ERRCODE = 'P0001';
    END IF;
    reused := true;
    reuse_reason := 'approval_id';
    execution := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.journal_entry_executions (
    id,
    proposal_id,
    approval_id,
    company_id,
    engagement_id,
    firm_client_id,
    source_continuous_close_run_id,
    source_accounting_sync_id,
    accounting_connection_id,
    provider,
    proposal_hash,
    approval_policy_hash,
    execution_policy_hash,
    execution_hash,
    idempotency_key,
    status,
    correlation_marker,
    execution_policy_snapshot,
    preflight_result,
    requested_by,
    requested_at,
    state_version,
    provider_journal_id,
    provider_request_hash,
    provider_response_hash,
    last_error_code,
    last_error_message
  ) VALUES (
    (p_row->>'id')::uuid,
    (p_row->>'proposal_id')::uuid,
    (p_row->>'approval_id')::uuid,
    (p_row->>'company_id')::uuid,
    (p_row->>'engagement_id')::uuid,
    NULLIF(p_row->>'firm_client_id', '')::uuid,
    (p_row->>'source_continuous_close_run_id')::uuid,
    (p_row->>'source_accounting_sync_id')::uuid,
    (p_row->>'accounting_connection_id')::uuid,
    p_row->>'provider',
    p_row->>'proposal_hash',
    p_row->>'approval_policy_hash',
    p_row->>'execution_policy_hash',
    p_row->>'execution_hash',
    p_row->>'idempotency_key',
    COALESCE(NULLIF(p_row->>'status', ''), 'RESERVED'),
    p_row->>'correlation_marker',
    COALESCE(p_row->'execution_policy_snapshot', '{}'::jsonb),
    COALESCE(p_row->'preflight_result', '{}'::jsonb),
    (p_row->>'requested_by')::uuid,
    (p_row->>'requested_at')::timestamptz,
    COALESCE((p_row->>'state_version')::integer, 1),
    NULL,
    NULLIF(p_row->>'provider_request_hash', ''),
    NULL,
    NULLIF(p_row->>'last_error_code', ''),
    NULLIF(p_row->>'last_error_message', '')
  )
  RETURNING * INTO v_inserted;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.execution_requested',
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_execution',
      v_inserted.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  reused := false;
  reuse_reason := NULL;
  execution := to_jsonb(v_inserted);
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    -- Exact same logical race: reuse by idempotency_key when binding matches.
    SELECT *
      INTO v_existing
      FROM public.journal_entry_executions
     WHERE idempotency_key = p_row->>'idempotency_key';
    IF FOUND THEN
      IF NOT public.je_execution_immutable_binding_matches(v_existing, p_row) THEN
        RAISE EXCEPTION 'je_execution_binding_conflict: race idempotency_key match with mismatched binding'
          USING ERRCODE = 'P0001';
      END IF;
      reused := true;
      reuse_reason := 'idempotency_key';
      execution := to_jsonb(v_existing);
      ledger_event_id := NULL;
      RETURN NEXT;
      RETURN;
    END IF;

    -- Same approval, possibly different binding (must not silently collapse).
    SELECT *
      INTO v_existing
      FROM public.journal_entry_executions
     WHERE approval_id = (p_row->>'approval_id')::uuid
     LIMIT 1;
    IF FOUND THEN
      IF NOT public.je_execution_immutable_binding_matches(v_existing, p_row) THEN
        RAISE EXCEPTION 'je_execution_binding_conflict: race approval_id already reserved under a different immutable binding'
          USING ERRCODE = 'P0001';
      END IF;
      reused := true;
      reuse_reason := 'approval_id';
      execution := to_jsonb(v_existing);
      ledger_event_id := NULL;
      RETURN NEXT;
      RETURN;
    END IF;

    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_journal_entry_execution_reservation(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_journal_entry_execution_reservation(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.persist_journal_entry_execution_reservation(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_journal_entry_execution_reservation(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

-- Guarded state transition + Patent #6 receipt (optimistic concurrency).
-- JE-3A DB mutation authority is intentionally narrower than the domain
-- status vocabulary: only RESERVED → READY_TO_POST | PRECHECK_FAILED,
-- each paired with its exact Patent #6 event type. Future provider lifecycle
-- transitions (POSTING / UNKNOWN_COMMIT / VERIFIED / ...) are authorized in JE-3B.
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
  -- Exact JE-3A transition ↔ Patent #6 event coupling (one semantic operation).
  IF p_expected_status = 'RESERVED'
     AND p_new_status = 'READY_TO_POST'
     AND p_event_type = 'journal_entry.execution_ready' THEN
    v_pair_ok := true;
  ELSIF p_expected_status = 'RESERVED'
     AND p_new_status = 'PRECHECK_FAILED'
     AND p_event_type = 'journal_entry.execution_precheck_failed' THEN
    v_pair_ok := true;
  END IF;

  IF NOT v_pair_ok THEN
    RAISE EXCEPTION
      'invalid journal entry execution transition/event pairing: % -> % with %',
      p_expected_status, p_new_status, p_event_type;
  END IF;

  -- Patent #6 payload status must agree with the persisted new status.
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

REVOKE ALL ON FUNCTION public.transition_journal_entry_execution(
  uuid, text, integer, text, jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_journal_entry_execution(
  uuid, text, integer, text, jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.transition_journal_entry_execution(
  uuid, text, integer, text, jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.transition_journal_entry_execution(
  uuid, text, integer, text, jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;
