-- =============================================================================
-- EXECUTABLE SQUASH CANDIDATE — DRAFT / NON-DEPLOYABLE
-- Proposed version: 20260907010034
-- Proposed name: esc_application_schema_slice_5_of_5
-- Module: public_application_schema_slice_5
-- Provenance: Option D assembled app files (10) stripped of nested txn markers; RLS/privilege closed before COMMIT
-- NOT in active supabase/migrations/. Production mutation NOT authorized.
-- UTF-8 LF. statements[] must remain non-empty when eventually recorded.
-- =============================================================================
BEGIN;
-- OPTION 2 secure multi-version split: slice 5/5
-- Source BEGIN/COMMIT stripped; exactly one outer transaction.
-- Files: 10; RLS closure tables: 0; fn dispositions: 16

-- >>> begin 20260821183525_journal_entry_executions.sql
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
-- <<< end 20260821183525_journal_entry_executions.sql

-- >>> begin 20260821212020_journal_entry_provider_attempts.sql
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
-- <<< end 20260821212020_journal_entry_provider_attempts.sql

-- >>> begin 20260821220646_journal_entry_provider_discovery_receipts.sql
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
-- <<< end 20260821220646_journal_entry_provider_discovery_receipts.sql

-- >>> begin 20260821221658_journal_entry_provider_attempt_certainty_immutable.sql
-- JE-3B1 — commit_certainty is immutable via generic observation patch.
-- Only dedicated governed RPCs may change certainty (e.g. commit discovered → COMMITTED).
-- Does NOT mint DEFINITELY_NOT_COMMITTED. Does NOT enable governed POST / VERIFIED.

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

  -- Accounting conclusions require dedicated receipted RPCs.
  IF p_patch ? 'qbo_je_id'
     AND NULLIF(p_patch->>'qbo_je_id', '') IS NOT NULL THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: qbo_je_id requires provider_commit_discovered RPC';
  END IF;

  -- commit_certainty is governed custody — generic patch never owns the field.
  IF p_patch ? 'commit_certainty' THEN
    RAISE EXCEPTION
      'je_provider_attempt_patch_forbidden: commit_certainty is immutable via generic patch';
  END IF;

  v_new_status := NULLIF(p_patch->>'status', '');
  IF v_new_status IN ('DISCOVERED_COMMITTED', 'DISCOVERED_NOT_FOUND', 'VERIFIED_PROVIDER_ID') THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: status % requires receipted discovery RPC',
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

COMMENT ON FUNCTION public.patch_journal_entry_provider_attempt(uuid, text, jsonb) IS
  'JE-3B1 observation-only provider-attempt patch. commit_certainty and qbo_je_id are immutable here; use receipted discovery RPCs for accounting conclusions.';
-- <<< end 20260821221658_journal_entry_provider_attempt_certainty_immutable.sql

-- >>> begin 20260821222342_journal_entry_provider_attempt_initial_custody.sql
-- JE-3B1 — Provider-attempt creation owns initial custody.
-- New rows ALWAYS insert as RESERVED + NOT_SENT.
-- Caller cannot mint POSSIBLY_COMMITTED / DEFINITELY_NOT_COMMITTED / COMMITTED at create.
-- Exact reuse preserves existing custody unchanged.
-- Does NOT enable governed POST / VERIFIED.

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
  -- Creation RPC owns initial custody. If caller supplies values, they must match.
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
    -- Exact reuse: preserve existing status/certainty custody unchanged.
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

COMMENT ON FUNCTION public.persist_journal_entry_provider_attempt(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text, boolean
) IS
  'JE-3B1: create provider attempt as RESERVED+NOT_SENT only; exact reuse preserves existing custody. Creation RPC owns status/certainty.';
-- <<< end 20260821222342_journal_entry_provider_attempt_initial_custody.sql

-- >>> begin 20260822011500_journal_entry_provider_dispatch_and_outcomes.sql
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
  IF COALESCE(p_event_payload->>'accounting_connection_id', '') IS DISTINCT FROM v_attempt.accounting_connection_id::text
     OR v_attempt.accounting_connection_id IS DISTINCT FROM v_execution.accounting_connection_id THEN
    RAISE EXCEPTION 'je_provider_dispatch payload accounting_connection_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'proposal_id', '') IS DISTINCT FROM v_execution.proposal_id::text THEN
    RAISE EXCEPTION 'je_provider_dispatch payload proposal_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'approval_id', '') IS DISTINCT FROM v_execution.approval_id::text THEN
    RAISE EXCEPTION 'je_provider_dispatch payload approval_id mismatch';
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
  IF COALESCE(p_event_payload->>'accounting_connection_id', '') IS DISTINCT FROM v_attempt.accounting_connection_id::text
     OR v_attempt.accounting_connection_id IS DISTINCT FROM v_execution.accounting_connection_id THEN
    RAISE EXCEPTION 'je_provider_posted payload accounting_connection_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_request_hash', '') IS DISTINCT FROM v_attempt.provider_request_hash THEN
    RAISE EXCEPTION 'je_provider_posted payload provider_request_hash mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'correlation_marker', '') IS DISTINCT FROM v_attempt.correlation_marker THEN
    RAISE EXCEPTION 'je_provider_posted payload correlation_marker mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'proposal_id', '') IS DISTINCT FROM v_execution.proposal_id::text THEN
    RAISE EXCEPTION 'je_provider_posted payload proposal_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'approval_id', '') IS DISTINCT FROM v_execution.approval_id::text THEN
    RAISE EXCEPTION 'je_provider_posted payload approval_id mismatch';
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
  IF COALESCE(p_event_payload->>'accounting_connection_id', '') IS DISTINCT FROM v_attempt.accounting_connection_id::text
     OR v_attempt.accounting_connection_id IS DISTINCT FROM v_execution.accounting_connection_id THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload accounting_connection_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_request_hash', '') IS DISTINCT FROM v_attempt.provider_request_hash THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload provider_request_hash mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'correlation_marker', '') IS DISTINCT FROM v_attempt.correlation_marker THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload correlation_marker mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'proposal_id', '') IS DISTINCT FROM v_execution.proposal_id::text THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload proposal_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'approval_id', '') IS DISTINCT FROM v_execution.approval_id::text THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload approval_id mismatch';
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
  IF COALESCE(p_event_payload->>'accounting_connection_id', '') IS DISTINCT FROM v_attempt.accounting_connection_id::text
     OR v_attempt.accounting_connection_id IS DISTINCT FROM v_execution.accounting_connection_id THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload accounting_connection_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_request_hash', '') IS DISTINCT FROM v_attempt.provider_request_hash THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload provider_request_hash mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'correlation_marker', '') IS DISTINCT FROM v_attempt.correlation_marker THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload correlation_marker mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'proposal_id', '') IS DISTINCT FROM v_execution.proposal_id::text THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload proposal_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'approval_id', '') IS DISTINCT FROM v_execution.approval_id::text THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload approval_id mismatch';
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

-- Privilege lockdown: SECURITY DEFINER mutations are service_role only.
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_dispatch_started(
  uuid, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_dispatch_started(
  uuid, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_dispatch_started(
  uuid, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_provider_dispatch_started(
  uuid, text, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_posted(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_posted(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_posted(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_provider_posted(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_post_unknown(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_post_unknown(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_post_unknown(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_provider_post_unknown(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_precommit_failed(
  uuid, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_precommit_failed(
  uuid, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_precommit_failed(
  uuid, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_provider_precommit_failed(
  uuid, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

-- Re-assert patch privileges after CREATE OR REPLACE in this migration.
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
-- <<< end 20260822011500_journal_entry_provider_dispatch_and_outcomes.sql

-- >>> begin 20260822050000_journal_entry_verified_readback.sql
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
-- <<< end 20260822050000_journal_entry_verified_readback.sql

-- >>> begin 20260822200000_je3d_sandbox_activation_identity.sql
-- JE-3D — Durable sandbox activation identity (schema only).
-- DO NOT APPLY without direct review. No backfill in this migration.
--
-- Activation allowlist requires BOTH:
--   accounting_connections.provider_environment = 'sandbox'
--   companies.je_activation_demo_role = 'DEMO_A_GENERAL_ACCOUNTING'
--
-- Proposed backfill (review separately; never infer from company name):
--   UPDATE accounting_connections SET provider_environment = 'sandbox'
--     WHERE id = '<independently-verified-sandbox-grant-id>';
--   UPDATE companies SET je_activation_demo_role = 'DEMO_A_GENERAL_ACCOUNTING'
--     WHERE id = '<canonical-demo-a-company-id>';

DO $$
BEGIN
  IF to_regclass('public.accounting_connections') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'accounting_connections'
        AND column_name = 'provider_environment'
    ) THEN
      ALTER TABLE public.accounting_connections
        ADD COLUMN provider_environment text;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accounting_connections_provider_environment_check'
      AND conrelid = 'public.accounting_connections'::regclass
  ) THEN
    ALTER TABLE public.accounting_connections
      ADD CONSTRAINT accounting_connections_provider_environment_check
      CHECK (
        provider_environment IS NULL
        OR provider_environment IN ('sandbox', 'production')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.accounting_connections.provider_environment IS
  'Durable Intuit OAuth grant environment (sandbox|production). Written at canonical OAuth persist from deployment QB_ENVIRONMENT. JE-3D activation requires provider_environment = sandbox.';

DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'companies'
        AND column_name = 'je_activation_demo_role'
    ) THEN
      ALTER TABLE public.companies
        ADD COLUMN je_activation_demo_role text;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'companies_je_activation_demo_role_check'
      AND conrelid = 'public.companies'::regclass
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_je_activation_demo_role_check
      CHECK (
        je_activation_demo_role IS NULL
        OR je_activation_demo_role IN (
          'DEMO_A_GENERAL_ACCOUNTING',
          'DEMO_B_SPECIALTY'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.companies.je_activation_demo_role IS
  'Controlled JE-3D activation demo identity. Allowlist requires DEMO_A_GENERAL_ACCOUNTING. Never derived from company name.';
-- <<< end 20260822200000_je3d_sandbox_activation_identity.sql

-- >>> begin 20260826043000_journal_entry_provider_attempt_reuse_posting_started.sql
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
  v_posting_result record;
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

      SELECT *
        INTO v_posting_result
        FROM public.je_publish_posting_started_from_ready(
          v_execution,
          p_event_payload,
          p_event_payload_canonical,
          p_firm_id,
          p_firm_client_id,
          p_engagement_id,
          p_close_period_id,
          p_actor_id
        );
      IF NOT FOUND THEN
        RAISE EXCEPTION 'je_provider_attempt_posting_started_helper_returned_no_row';
      END IF;
      v_execution := v_posting_result.execution;
      v_event_id := v_posting_result.ledger_event_id;

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
    SELECT *
      INTO v_posting_result
      FROM public.je_publish_posting_started_from_ready(
        v_execution,
        p_event_payload,
        p_event_payload_canonical,
        p_firm_id,
        p_firm_client_id,
        p_engagement_id,
        p_close_period_id,
        p_actor_id
      );
    IF NOT FOUND THEN
      RAISE EXCEPTION 'je_provider_attempt_posting_started_helper_returned_no_row';
    END IF;
    v_execution := v_posting_result.execution;
    v_event_id := v_posting_result.ledger_event_id;
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

      SELECT *
        INTO v_posting_result
        FROM public.je_publish_posting_started_from_ready(
          v_execution,
          p_event_payload,
          p_event_payload_canonical,
          p_firm_id,
          p_firm_client_id,
          p_engagement_id,
          p_close_period_id,
          p_actor_id
        );
      IF NOT FOUND THEN
        RAISE EXCEPTION 'je_provider_attempt_posting_started_helper_returned_no_row';
      END IF;
      v_execution := v_posting_result.execution;
      v_event_id := v_posting_result.ledger_event_id;

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

COMMENT ON FUNCTION public.je_publish_posting_started_from_ready(
  public.journal_entry_executions,
  jsonb,
  text,
  uuid,
  uuid,
  uuid,
  text,
  text
) IS
  'Internal-only helper for persist_journal_entry_provider_attempt. Not a public mutation API.';

-- Privilege lockdown: helper is implementation detail only (owner-chain callable).
REVOKE ALL ON FUNCTION public.je_publish_posting_started_from_ready(
  public.journal_entry_executions,
  jsonb,
  text,
  uuid,
  uuid,
  uuid,
  text,
  text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.je_publish_posting_started_from_ready(
  public.journal_entry_executions,
  jsonb,
  text,
  uuid,
  uuid,
  uuid,
  text,
  text
) FROM anon;

REVOKE ALL ON FUNCTION public.je_publish_posting_started_from_ready(
  public.journal_entry_executions,
  jsonb,
  text,
  uuid,
  uuid,
  uuid,
  text,
  text
) FROM authenticated;

-- Defense-in-depth: CREATE OR REPLACE must not broaden governed persist RPC authority.
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
-- <<< end 20260826043000_journal_entry_provider_attempt_reuse_posting_started.sql

-- >>> begin 2026_07_20__pilot_slots_add_review_assist_pro_tier_key.sql
-- File: supabase/migrations/2026_07_20__pilot_slots_add_review_assist_pro_tier_key.sql
--
-- Phase DEMO-1 — Widen pilot_slots.tier_key CHECK constraint to include
-- review_assist_pro (defined in lib/entitlements.ts but never added to the
-- constraint) and a reserved audit_ready tier_key for later.
--
-- Additive-only. No data changes. Existing rows are unaffected.

-- [ESC] stripped source txn marker: BEGIN;


-- Pre-flight: prove no existing row would be excluded by the new list.
-- (This is defensive; the current list is a subset of the new list.)
DO $$
DECLARE
  bad_count INTEGER;
  bad_examples TEXT;
BEGIN
  SELECT COUNT(*), COALESCE(string_agg(DISTINCT tier_key, ', '), '')
    INTO bad_count, bad_examples
    FROM pilot_slots
   WHERE tier_key NOT IN (
     'solo_bookkeeper',
     'owner_lite',
     'owner_pro',
     'accounting_pro',
     'firm',
     'enterprise_firm',
     'industry_premium',
     'client_seat_alacarte',
     'review_assist',
     'review_assist_pro',
     'audit_ready'
   );

  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'Pre-flight failure: % existing pilot_slots rows have tier_key values outside the widened whitelist: %',
      bad_count, bad_examples;
  END IF;
END $$;

-- Drop the old constraint and add the widened one.
ALTER TABLE public.pilot_slots
  DROP CONSTRAINT IF EXISTS pilot_slots_tier_key_check;

ALTER TABLE public.pilot_slots
  ADD CONSTRAINT pilot_slots_tier_key_check
  CHECK (tier_key = ANY (ARRAY[
    'solo_bookkeeper'::text,
    'owner_lite'::text,
    'owner_pro'::text,
    'accounting_pro'::text,
    'firm'::text,
    'enterprise_firm'::text,
    'industry_premium'::text,
    'client_seat_alacarte'::text,
    'review_assist'::text,
    'review_assist_pro'::text,
    'audit_ready'::text
  ]));

-- Verify the new constraint by attempting a positive fixture insert into a
-- transaction-scoped SAVEPOINT (rolled back so no side-effects).
DO $$
DECLARE
  test_firm_id UUID;
BEGIN
  -- Pick any real firm id; the seed row is rolled back below.
  SELECT id INTO test_firm_id FROM public.firms LIMIT 1;

  IF test_firm_id IS NULL THEN
    RAISE NOTICE 'No firms present; skipping smoke insert (constraint verified structurally).';
    RETURN;
  END IF;

  BEGIN
    -- Schema adaptation: pilot_slots_complimentary_cap_check requires
    -- complimentary_client_cap > 0 when pilot_status = 'complimentary'.
    INSERT INTO public.pilot_slots (
      id, firm_id, tier_key, pilot_status,
      pricing_structure, pricing_cadence,
      complimentary_client_cap
    ) VALUES (
      gen_random_uuid(), test_firm_id, 'review_assist_pro', 'complimentary',
      'complimentary', 'monthly',
      1
    );
    RAISE EXCEPTION 'Rolling back smoke insert (this exception message is expected).';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%Rolling back smoke insert%' THEN
        RAISE;
      END IF;
  END;
END $$;

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 2026_07_20__pilot_slots_add_review_assist_pro_tier_key.sql

-- [ESC] RLS closure: no CREATE TABLE without ENABLE RLS in this slice.

-- [ESC] Function privilege closure before COMMIT
-- Default PUBLIC EXECUTE removed for every application function created/replaced in this slice.
-- Regrant only per disposition (service_role always; authenticated only for allowlisted RLS helpers).
-- disposition public.journal_entry_executions_guard_mutation() => trigger_only
REVOKE EXECUTE ON FUNCTION public.journal_entry_executions_guard_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.journal_entry_executions_guard_mutation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.journal_entry_executions_guard_mutation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.journal_entry_executions_guard_mutation() FROM service_role;
-- disposition public.je_execution_immutable_binding_matches(public.journal_entry_executions,jsonb) => trigger_only
REVOKE EXECUTE ON FUNCTION public.je_execution_immutable_binding_matches(public.journal_entry_executions,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.je_execution_immutable_binding_matches(public.journal_entry_executions,jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.je_execution_immutable_binding_matches(public.journal_entry_executions,jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.je_execution_immutable_binding_matches(public.journal_entry_executions,jsonb) FROM service_role;
-- disposition public.persist_journal_entry_execution_reservation(jsonb,jsonb,text,uuid,uuid,uuid,text,text) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.persist_journal_entry_execution_reservation(jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.persist_journal_entry_execution_reservation(jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.persist_journal_entry_execution_reservation(jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_journal_entry_execution_reservation(jsonb,jsonb,text,uuid,uuid,uuid,text,text) TO service_role;
-- disposition public.transition_journal_entry_execution(uuid,text,int4,text,jsonb,text,jsonb,text,uuid,uuid,uuid,text,text) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.transition_journal_entry_execution(uuid,text,int4,text,jsonb,text,jsonb,text,uuid,uuid,uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.transition_journal_entry_execution(uuid,text,int4,text,jsonb,text,jsonb,text,uuid,uuid,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.transition_journal_entry_execution(uuid,text,int4,text,jsonb,text,jsonb,text,uuid,uuid,uuid,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.transition_journal_entry_execution(uuid,text,int4,text,jsonb,text,jsonb,text,uuid,uuid,uuid,text,text) TO service_role;
-- disposition public.journal_entry_provider_attempts_guard_mutation() => trigger_only
REVOKE EXECUTE ON FUNCTION public.journal_entry_provider_attempts_guard_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.journal_entry_provider_attempts_guard_mutation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.journal_entry_provider_attempts_guard_mutation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.journal_entry_provider_attempts_guard_mutation() FROM service_role;
-- disposition public.persist_journal_entry_provider_attempt(jsonb,jsonb,text,uuid,uuid,uuid,text,text,bool) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.persist_journal_entry_provider_attempt(jsonb,jsonb,text,uuid,uuid,uuid,text,text,bool) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.persist_journal_entry_provider_attempt(jsonb,jsonb,text,uuid,uuid,uuid,text,text,bool) FROM anon;
REVOKE EXECUTE ON FUNCTION public.persist_journal_entry_provider_attempt(jsonb,jsonb,text,uuid,uuid,uuid,text,text,bool) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_journal_entry_provider_attempt(jsonb,jsonb,text,uuid,uuid,uuid,text,text,bool) TO service_role;
-- disposition public.patch_journal_entry_provider_attempt(uuid,text,jsonb) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.patch_journal_entry_provider_attempt(uuid,text,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.patch_journal_entry_provider_attempt(uuid,text,jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.patch_journal_entry_provider_attempt(uuid,text,jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.patch_journal_entry_provider_attempt(uuid,text,jsonb) TO service_role;
-- disposition public.apply_journal_entry_provider_commit_discovered(uuid,text,text,text,jsonb,jsonb,text,uuid,uuid,uuid,text,text) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_commit_discovered(uuid,text,text,text,jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_commit_discovered(uuid,text,text,text,jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_commit_discovered(uuid,text,text,text,jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_provider_commit_discovered(uuid,text,text,text,jsonb,jsonb,text,uuid,uuid,uuid,text,text) TO service_role;
-- disposition public.apply_journal_entry_provider_not_found_confirmed(uuid,text,jsonb,jsonb,text,uuid,uuid,uuid,text,text) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_not_found_confirmed(uuid,text,jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_not_found_confirmed(uuid,text,jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_not_found_confirmed(uuid,text,jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_provider_not_found_confirmed(uuid,text,jsonb,jsonb,text,uuid,uuid,uuid,text,text) TO service_role;
-- disposition public.apply_journal_entry_provider_dispatch_started(uuid,text,jsonb,text,uuid,uuid,uuid,text,text) => migration_admin_or_internal
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_dispatch_started(uuid,text,jsonb,text,uuid,uuid,uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_dispatch_started(uuid,text,jsonb,text,uuid,uuid,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_dispatch_started(uuid,text,jsonb,text,uuid,uuid,uuid,text,text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_dispatch_started(uuid,text,jsonb,text,uuid,uuid,uuid,text,text) FROM service_role;
-- disposition public.apply_journal_entry_provider_posted(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) => migration_admin_or_internal
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_posted(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_posted(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_posted(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_posted(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) FROM service_role;
-- disposition public.apply_journal_entry_provider_post_unknown(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) => migration_admin_or_internal
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_post_unknown(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_post_unknown(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_post_unknown(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_post_unknown(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) FROM service_role;
-- disposition public.apply_journal_entry_provider_precommit_failed(uuid,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) => migration_admin_or_internal
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_precommit_failed(uuid,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_precommit_failed(uuid,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_precommit_failed(uuid,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_provider_precommit_failed(uuid,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) FROM service_role;
-- disposition public.apply_journal_entry_verified(uuid,text,int4,uuid,text,text,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,text,text) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_verified(uuid,text,int4,uuid,text,text,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_verified(uuid,text,int4,uuid,text,text,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_verified(uuid,text,int4,uuid,text,text,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_verified(uuid,text,int4,uuid,text,text,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,text,text) TO service_role;
-- disposition public.apply_journal_entry_verification_mismatch(uuid,text,int4,uuid,text,text,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,text,text) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_verification_mismatch(uuid,text,int4,uuid,text,text,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_verification_mismatch(uuid,text,int4,uuid,text,text,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_journal_entry_verification_mismatch(uuid,text,int4,uuid,text,text,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_verification_mismatch(uuid,text,int4,uuid,text,text,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,text,text) TO service_role;
-- disposition public.je_publish_posting_started_from_ready(public.journal_entry_executions,jsonb,text,uuid,uuid,uuid,text,text) => migration_admin_or_internal
REVOKE EXECUTE ON FUNCTION public.je_publish_posting_started_from_ready(public.journal_entry_executions,jsonb,text,uuid,uuid,uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.je_publish_posting_started_from_ready(public.journal_entry_executions,jsonb,text,uuid,uuid,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.je_publish_posting_started_from_ready(public.journal_entry_executions,jsonb,text,uuid,uuid,uuid,text,text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.je_publish_posting_started_from_ready(public.journal_entry_executions,jsonb,text,uuid,uuid,uuid,text,text) FROM service_role;
COMMIT;
