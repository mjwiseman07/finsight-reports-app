-- JE-2 — Governed human approval / SoD custody for immutable JE-1 proposals.
-- Append-only approval decisions + Patent #6 journal_entry.approved|rejected.
-- No proposal mutation. No execution table. No provider write.

CREATE TABLE IF NOT EXISTS public.journal_entry_approvals (
  id uuid PRIMARY KEY,
  proposal_id uuid NOT NULL
    REFERENCES public.journal_entry_proposals(id)
    ON DELETE RESTRICT,
  company_id uuid NOT NULL
    REFERENCES public.companies(id)
    ON DELETE RESTRICT,
  engagement_id uuid NOT NULL
    REFERENCES public.audit_ready_engagements(id)
    ON DELETE RESTRICT,
  proposal_hash text NOT NULL,
  policy_hash text NOT NULL,
  decision text NOT NULL,
  approval_mode text NOT NULL,
  reviewer_user_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE RESTRICT,
  reviewer_role text NULL,
  mfa_level text NULL,
  mfa_verified_at timestamptz NULL,
  decision_reason text NULL,
  policy_snapshot jsonb NOT NULL,
  approved_at timestamptz NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_entry_approvals_decision_check
    CHECK (decision IN ('APPROVED', 'REJECTED')),
  CONSTRAINT journal_entry_approvals_mode_check
    CHECK (approval_mode = 'REVIEW_REQUIRED'),
  CONSTRAINT journal_entry_approvals_proposal_hash_check
    CHECK (proposal_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_approvals_policy_hash_check
    CHECK (policy_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_approvals_idempotency_key_check
    CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_approvals_idempotency_key_unique
    UNIQUE (idempotency_key)
);

-- At most one APPROVED decision per exact proposal + approval-policy binding.
CREATE UNIQUE INDEX IF NOT EXISTS journal_entry_approvals_one_approved_idx
  ON public.journal_entry_approvals (proposal_id, proposal_hash, policy_hash)
  WHERE decision = 'APPROVED';

CREATE INDEX IF NOT EXISTS journal_entry_approvals_proposal_idx
  ON public.journal_entry_approvals (proposal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS journal_entry_approvals_engagement_idx
  ON public.journal_entry_approvals (engagement_id, created_at DESC);

COMMENT ON TABLE public.journal_entry_approvals IS
  'Immutable JE-2 approval decisions for JE-1 proposals. policy_hash is the approval policy hash. No provider write.';

CREATE OR REPLACE FUNCTION public.journal_entry_approvals_deny_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'journal_entry_approvals rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS journal_entry_approvals_immutable_update
  ON public.journal_entry_approvals;
CREATE TRIGGER journal_entry_approvals_immutable_update
  BEFORE UPDATE ON public.journal_entry_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_approvals_deny_mutation();

DROP TRIGGER IF EXISTS journal_entry_approvals_immutable_delete
  ON public.journal_entry_approvals;
CREATE TRIGGER journal_entry_approvals_immutable_delete
  BEFORE DELETE ON public.journal_entry_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_approvals_deny_mutation();

ALTER TABLE public.journal_entry_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journal_entry_approvals_service_role_all
  ON public.journal_entry_approvals;
CREATE POLICY journal_entry_approvals_service_role_all
  ON public.journal_entry_approvals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS journal_entry_approvals_select
  ON public.journal_entry_approvals;
CREATE POLICY journal_entry_approvals_select
  ON public.journal_entry_approvals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = journal_entry_approvals.engagement_id
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

GRANT SELECT ON public.journal_entry_approvals TO authenticated;
GRANT ALL ON public.journal_entry_approvals TO service_role;

-- Atomic approval insert + Patent #6 receipt.
CREATE OR REPLACE FUNCTION public.persist_journal_entry_approval(
  p_row jsonb,
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
  reused boolean,
  approval jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.journal_entry_approvals%ROWTYPE;
  v_inserted public.journal_entry_approvals%ROWTYPE;
  v_event_id uuid;
BEGIN
  IF p_event_type NOT IN ('journal_entry.approved', 'journal_entry.rejected') THEN
    RAISE EXCEPTION 'invalid journal entry approval event type: %', p_event_type;
  END IF;

  SELECT *
    INTO v_existing
    FROM public.journal_entry_approvals
   WHERE idempotency_key = p_row->>'idempotency_key';

  IF FOUND THEN
    reused := true;
    approval := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- If an APPROVED decision already binds this proposal+hashes, reuse it
  -- (different reviewer racing) without publishing a second event.
  IF p_row->>'decision' = 'APPROVED' THEN
    SELECT *
      INTO v_existing
      FROM public.journal_entry_approvals
     WHERE proposal_id = (p_row->>'proposal_id')::uuid
       AND proposal_hash = p_row->>'proposal_hash'
       AND policy_hash = p_row->>'policy_hash'
       AND decision = 'APPROVED'
     LIMIT 1;
    IF FOUND THEN
      reused := true;
      approval := to_jsonb(v_existing);
      ledger_event_id := NULL;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.journal_entry_approvals (
    id,
    proposal_id,
    company_id,
    engagement_id,
    proposal_hash,
    policy_hash,
    decision,
    approval_mode,
    reviewer_user_id,
    reviewer_role,
    mfa_level,
    mfa_verified_at,
    decision_reason,
    policy_snapshot,
    approved_at,
    idempotency_key
  ) VALUES (
    (p_row->>'id')::uuid,
    (p_row->>'proposal_id')::uuid,
    (p_row->>'company_id')::uuid,
    (p_row->>'engagement_id')::uuid,
    p_row->>'proposal_hash',
    p_row->>'policy_hash',
    p_row->>'decision',
    p_row->>'approval_mode',
    (p_row->>'reviewer_user_id')::uuid,
    NULLIF(p_row->>'reviewer_role', ''),
    NULLIF(p_row->>'mfa_level', ''),
    NULLIF(p_row->>'mfa_verified_at', '')::timestamptz,
    NULLIF(p_row->>'decision_reason', ''),
    COALESCE(p_row->'policy_snapshot', '{}'::jsonb),
    (p_row->>'approved_at')::timestamptz,
    p_row->>'idempotency_key'
  )
  RETURNING * INTO v_inserted;

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
      'journal_entry_proposal',
      v_inserted.proposal_id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  reused := false;
  approval := to_jsonb(v_inserted);
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO v_existing
      FROM public.journal_entry_approvals
     WHERE idempotency_key = p_row->>'idempotency_key';
    IF NOT FOUND AND p_row->>'decision' = 'APPROVED' THEN
      SELECT *
        INTO v_existing
        FROM public.journal_entry_approvals
       WHERE proposal_id = (p_row->>'proposal_id')::uuid
         AND proposal_hash = p_row->>'proposal_hash'
         AND policy_hash = p_row->>'policy_hash'
         AND decision = 'APPROVED'
       LIMIT 1;
    END IF;
    IF NOT FOUND THEN
      RAISE;
    END IF;
    reused := true;
    approval := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_journal_entry_approval(
  jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_journal_entry_approval(
  jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.persist_journal_entry_approval(
  jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_journal_entry_approval(
  jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;
