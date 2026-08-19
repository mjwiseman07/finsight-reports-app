-- CC-2B — persisted Continuous Close OBSERVE runs.
-- Query/read authority lives here. Patent #6 chain custody stays on ledger_events.
-- Append-only: no UPDATE/DELETE of historical close evaluations.

CREATE TABLE IF NOT EXISTS public.continuous_close_runs (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL
    REFERENCES public.companies(id)
    ON DELETE RESTRICT,
  engagement_id uuid NOT NULL
    REFERENCES public.audit_ready_engagements(id)
    ON DELETE RESTRICT,
  firm_client_id uuid NULL
    REFERENCES public.firm_clients(id)
    ON DELETE RESTRICT,
  close_period_id uuid NULL
    REFERENCES public.close_periods(id)
    ON DELETE SET NULL,
  accounting_sync_id uuid NOT NULL
    REFERENCES public.accounting_syncs(id)
    ON DELETE RESTRICT,
  period_end date NOT NULL,
  mode text NOT NULL,
  readiness text NOT NULL,
  status text NOT NULL,
  policy_hash text NOT NULL,
  input_hash text NOT NULL,
  policy_snapshot jsonb NOT NULL,
  observation_summary jsonb NOT NULL,
  result jsonb NOT NULL,
  created_by uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE RESTRICT,
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  supersedes_run_id uuid NULL
    REFERENCES public.continuous_close_runs(id)
    ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT continuous_close_runs_mode_check
    CHECK (mode = 'OBSERVE'),
  CONSTRAINT continuous_close_runs_readiness_check
    CHECK (readiness IN ('READY', 'READY_WITH_REVIEW', 'BLOCKED')),
  CONSTRAINT continuous_close_runs_status_check
    CHECK (status = 'completed'),
  CONSTRAINT continuous_close_runs_policy_hash_check
    CHECK (policy_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT continuous_close_runs_input_hash_check
    CHECK (input_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT continuous_close_runs_idempotency_key_check
    CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  CONSTRAINT continuous_close_runs_idempotency_key_unique
    UNIQUE (idempotency_key),
  CONSTRAINT continuous_close_runs_not_self_supersede
    CHECK (supersedes_run_id IS NULL OR supersedes_run_id <> id)
);

CREATE INDEX IF NOT EXISTS continuous_close_runs_engagement_period_sync_idx
  ON public.continuous_close_runs (engagement_id, period_end, accounting_sync_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS continuous_close_runs_company_idx
  ON public.continuous_close_runs (company_id, created_at DESC);

COMMENT ON TABLE public.continuous_close_runs IS
  'Immutable Continuous Close OBSERVE evaluations. Ledger chain receipts are ledger_events, not columns here.';

CREATE OR REPLACE FUNCTION public.continuous_close_runs_deny_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'continuous_close_runs rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS continuous_close_runs_immutable_update
  ON public.continuous_close_runs;
CREATE TRIGGER continuous_close_runs_immutable_update
  BEFORE UPDATE ON public.continuous_close_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.continuous_close_runs_deny_mutation();

DROP TRIGGER IF EXISTS continuous_close_runs_immutable_delete
  ON public.continuous_close_runs;
CREATE TRIGGER continuous_close_runs_immutable_delete
  BEFORE DELETE ON public.continuous_close_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.continuous_close_runs_deny_mutation();

ALTER TABLE public.continuous_close_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS continuous_close_runs_service_role_all
  ON public.continuous_close_runs;
CREATE POLICY continuous_close_runs_service_role_all
  ON public.continuous_close_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS continuous_close_runs_select
  ON public.continuous_close_runs;
CREATE POLICY continuous_close_runs_select
  ON public.continuous_close_runs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_users cu
      WHERE cu.company_id = continuous_close_runs.company_id
        AND cu.user_id = (SELECT auth.uid())
        AND cu.status = 'active'
    )
  );

GRANT SELECT ON public.continuous_close_runs TO authenticated;
GRANT ALL ON public.continuous_close_runs TO service_role;

-- Atomic insert + Patent #6 receipt. Unique conflict returns the existing row
-- without publishing a second event. publish_ledger_event failure rolls back
-- the CC row so query authority and chain receipt cannot drift.
CREATE OR REPLACE FUNCTION public.persist_continuous_close_observe_run(
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
  run jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.continuous_close_runs%ROWTYPE;
  v_inserted public.continuous_close_runs%ROWTYPE;
  v_event_id uuid;
BEGIN
  SELECT *
    INTO v_existing
    FROM public.continuous_close_runs
   WHERE idempotency_key = p_row->>'idempotency_key';

  IF FOUND THEN
    reused := true;
    run := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.continuous_close_runs (
    id,
    company_id,
    engagement_id,
    firm_client_id,
    close_period_id,
    accounting_sync_id,
    period_end,
    mode,
    readiness,
    status,
    policy_hash,
    input_hash,
    policy_snapshot,
    observation_summary,
    result,
    created_by,
    started_at,
    completed_at,
    supersedes_run_id,
    idempotency_key
  ) VALUES (
    (p_row->>'id')::uuid,
    (p_row->>'company_id')::uuid,
    (p_row->>'engagement_id')::uuid,
    NULLIF(p_row->>'firm_client_id', '')::uuid,
    NULLIF(p_row->>'close_period_id', '')::uuid,
    (p_row->>'accounting_sync_id')::uuid,
    (p_row->>'period_end')::date,
    p_row->>'mode',
    p_row->>'readiness',
    p_row->>'status',
    p_row->>'policy_hash',
    p_row->>'input_hash',
    COALESCE(p_row->'policy_snapshot', '{}'::jsonb),
    COALESCE(p_row->'observation_summary', '{}'::jsonb),
    COALESCE(p_row->'result', '{}'::jsonb),
    (p_row->>'created_by')::uuid,
    (p_row->>'started_at')::timestamptz,
    (p_row->>'completed_at')::timestamptz,
    NULLIF(p_row->>'supersedes_run_id', '')::uuid,
    p_row->>'idempotency_key'
  )
  RETURNING * INTO v_inserted;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'continuous_close.observe.completed',
      'close',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'continuous_close_run',
      v_inserted.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  reused := false;
  run := to_jsonb(v_inserted);
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO v_existing
      FROM public.continuous_close_runs
     WHERE idempotency_key = p_row->>'idempotency_key';
    IF NOT FOUND THEN
      RAISE;
    END IF;
    reused := true;
    run := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_continuous_close_observe_run(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_continuous_close_observe_run(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.persist_continuous_close_observe_run(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_continuous_close_observe_run(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;
