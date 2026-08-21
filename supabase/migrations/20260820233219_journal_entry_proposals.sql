-- JE-1 — CC-sourced journal entry proposal foundation.
-- Immutable proposal custody + Patent #6 journal_entry.proposed receipt.
-- No approval table, no execution table, no provider write.

CREATE TABLE IF NOT EXISTS public.journal_entry_proposals (
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
  period_end date NOT NULL,
  source_continuous_close_run_id uuid NOT NULL
    REFERENCES public.continuous_close_runs(id)
    ON DELETE RESTRICT,
  source_accounting_sync_id uuid NOT NULL
    REFERENCES public.accounting_syncs(id)
    ON DELETE RESTRICT,
  source_recon_run_ids jsonb NOT NULL,
  origin_type text NOT NULL,
  reason_code text NOT NULL,
  memo text NULL,
  currency text NOT NULL,
  txn_date date NOT NULL,
  lines jsonb NOT NULL,
  total_debits_cents bigint NOT NULL,
  total_credits_cents bigint NOT NULL,
  expected_effects jsonb NOT NULL,
  policy_snapshot jsonb NOT NULL,
  policy_hash text NOT NULL,
  proposal_hash text NOT NULL,
  status text NOT NULL,
  proposed_by uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE RESTRICT,
  proposed_at timestamptz NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_entry_proposals_origin_type_check
    CHECK (origin_type IN ('ACCRUAL', 'RECLASS')),
  CONSTRAINT journal_entry_proposals_status_check
    CHECK (status = 'SUBMITTED'),
  CONSTRAINT journal_entry_proposals_currency_check
    CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT journal_entry_proposals_totals_check
    CHECK (
      total_debits_cents > 0
      AND total_credits_cents > 0
      AND total_debits_cents = total_credits_cents
    ),
  CONSTRAINT journal_entry_proposals_policy_hash_check
    CHECK (policy_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_proposals_proposal_hash_check
    CHECK (proposal_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_proposals_idempotency_key_check
    CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_proposals_idempotency_key_unique
    UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS journal_entry_proposals_engagement_period_idx
  ON public.journal_entry_proposals (engagement_id, period_end, created_at DESC);

CREATE INDEX IF NOT EXISTS journal_entry_proposals_source_cc_idx
  ON public.journal_entry_proposals (source_continuous_close_run_id);

COMMENT ON TABLE public.journal_entry_proposals IS
  'Immutable CC-sourced JE proposals. Patent #6 receipts live on ledger_events. No provider write in JE-1.';

CREATE OR REPLACE FUNCTION public.journal_entry_proposals_deny_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'journal_entry_proposals rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS journal_entry_proposals_immutable_update
  ON public.journal_entry_proposals;
CREATE TRIGGER journal_entry_proposals_immutable_update
  BEFORE UPDATE ON public.journal_entry_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_proposals_deny_mutation();

DROP TRIGGER IF EXISTS journal_entry_proposals_immutable_delete
  ON public.journal_entry_proposals;
CREATE TRIGGER journal_entry_proposals_immutable_delete
  BEFORE DELETE ON public.journal_entry_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_proposals_deny_mutation();

ALTER TABLE public.journal_entry_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journal_entry_proposals_service_role_all
  ON public.journal_entry_proposals;
CREATE POLICY journal_entry_proposals_service_role_all
  ON public.journal_entry_proposals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated SELECT mirrors continuous_close_runs / engagement read authority.
DROP POLICY IF EXISTS journal_entry_proposals_select
  ON public.journal_entry_proposals;
CREATE POLICY journal_entry_proposals_select
  ON public.journal_entry_proposals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = journal_entry_proposals.engagement_id
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

GRANT SELECT ON public.journal_entry_proposals TO authenticated;
GRANT ALL ON public.journal_entry_proposals TO service_role;

-- Atomic insert + Patent #6 receipt. Unique conflict returns existing row
-- without publishing a second event. publish_ledger_event failure rolls back.
CREATE OR REPLACE FUNCTION public.persist_journal_entry_proposal(
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
  proposal jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.journal_entry_proposals%ROWTYPE;
  v_inserted public.journal_entry_proposals%ROWTYPE;
  v_event_id uuid;
BEGIN
  SELECT *
    INTO v_existing
    FROM public.journal_entry_proposals
   WHERE idempotency_key = p_row->>'idempotency_key';

  IF FOUND THEN
    reused := true;
    proposal := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.journal_entry_proposals (
    id,
    company_id,
    engagement_id,
    firm_client_id,
    period_end,
    source_continuous_close_run_id,
    source_accounting_sync_id,
    source_recon_run_ids,
    origin_type,
    reason_code,
    memo,
    currency,
    txn_date,
    lines,
    total_debits_cents,
    total_credits_cents,
    expected_effects,
    policy_snapshot,
    policy_hash,
    proposal_hash,
    status,
    proposed_by,
    proposed_at,
    idempotency_key
  ) VALUES (
    (p_row->>'id')::uuid,
    (p_row->>'company_id')::uuid,
    (p_row->>'engagement_id')::uuid,
    NULLIF(p_row->>'firm_client_id', '')::uuid,
    (p_row->>'period_end')::date,
    (p_row->>'source_continuous_close_run_id')::uuid,
    (p_row->>'source_accounting_sync_id')::uuid,
    COALESCE(p_row->'source_recon_run_ids', '[]'::jsonb),
    p_row->>'origin_type',
    p_row->>'reason_code',
    NULLIF(p_row->>'memo', ''),
    p_row->>'currency',
    (p_row->>'txn_date')::date,
    COALESCE(p_row->'lines', '[]'::jsonb),
    (p_row->>'total_debits_cents')::bigint,
    (p_row->>'total_credits_cents')::bigint,
    COALESCE(p_row->'expected_effects', '[]'::jsonb),
    COALESCE(p_row->'policy_snapshot', '{}'::jsonb),
    p_row->>'policy_hash',
    p_row->>'proposal_hash',
    p_row->>'status',
    (p_row->>'proposed_by')::uuid,
    (p_row->>'proposed_at')::timestamptz,
    p_row->>'idempotency_key'
  )
  RETURNING * INTO v_inserted;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.proposed',
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_proposal',
      v_inserted.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  reused := false;
  proposal := to_jsonb(v_inserted);
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO v_existing
      FROM public.journal_entry_proposals
     WHERE idempotency_key = p_row->>'idempotency_key';
    IF NOT FOUND THEN
      RAISE;
    END IF;
    reused := true;
    proposal := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_journal_entry_proposal(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_journal_entry_proposal(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.persist_journal_entry_proposal(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_journal_entry_proposal(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;
