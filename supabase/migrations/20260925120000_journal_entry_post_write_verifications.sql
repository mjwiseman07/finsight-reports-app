-- JE-4 post-write verification evidence.
-- Additive lineage for a VERIFIED execution: new accounting sync, observation,
-- snapshot-backed tie-out run ids, and a new Continuous Close OBSERVE run.
-- Does not enable journal-entry create or verify. Authenticated role is SELECT
-- only. Mutations are service_role (same pattern as other JE custody writes).

CREATE TABLE IF NOT EXISTS public.journal_entry_post_write_verifications (
  id uuid PRIMARY KEY,
  execution_id uuid NOT NULL
    REFERENCES public.journal_entry_executions(id)
    ON DELETE RESTRICT,
  company_id uuid NOT NULL
    REFERENCES public.companies(id)
    ON DELETE RESTRICT,
  engagement_id uuid NOT NULL
    REFERENCES public.audit_ready_engagements(id)
    ON DELETE RESTRICT,
  firm_client_id uuid NULL,
  accounting_connection_id uuid NOT NULL
    REFERENCES public.accounting_connections(id)
    ON DELETE RESTRICT,
  provider_journal_id text NULL,
  provider_readback_hash text NOT NULL,
  verification_ledger_event_id uuid NOT NULL
    REFERENCES public.ledger_events(event_id)
    ON DELETE RESTRICT,
  source_accounting_sync_id uuid NOT NULL
    REFERENCES public.accounting_syncs(id)
    ON DELETE RESTRICT,
  accounting_sync_id uuid NULL
    REFERENCES public.accounting_syncs(id)
    ON DELETE RESTRICT,
  observation_id text NULL,
  tie_out_run_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  continuous_close_run_id uuid NULL
    REFERENCES public.continuous_close_runs(id)
    ON DELETE RESTRICT,
  source_continuous_close_run_id uuid NOT NULL
    REFERENCES public.continuous_close_runs(id)
    ON DELETE RESTRICT,
  policy_hash text NOT NULL,
  input_hash text NOT NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL,
  effect_conclusion text NOT NULL,
  retryable boolean NOT NULL DEFAULT false,
  readiness text NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_code text NULL,
  failure_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_entry_post_write_verifications_status_check
    CHECK (status IN (
      'IN_PROGRESS',
      'REFRESH_FAILED',
      'CANONICAL_INCOMPLETE',
      'RECON_FAILED',
      'TIE_OUT_FAILED',
      'OBSERVE_FAILED',
      'PENDING_PROVIDER_VISIBILITY',
      'EFFECTS_MISMATCH',
      'EFFECTS_INCOMPLETE',
      'EFFECTS_VERIFIED'
    )),
  CONSTRAINT journal_entry_post_write_verifications_conclusion_check
    CHECK (effect_conclusion IN (
      'NOT_EVALUATED',
      'PENDING_PROVIDER_VISIBILITY',
      'INCOMPLETE',
      'MISMATCH',
      'VERIFIED'
    )),
  CONSTRAINT journal_entry_post_write_verifications_readiness_check
    CHECK (readiness IS NULL OR readiness IN ('READY', 'READY_WITH_REVIEW', 'BLOCKED')),
  CONSTRAINT journal_entry_post_write_verifications_policy_hash_check
    CHECK (policy_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_post_write_verifications_input_hash_check
    CHECK (input_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_post_write_verifications_idempotency_key_check
    CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_post_write_verifications_idempotency_key_unique
    UNIQUE (idempotency_key),
  CONSTRAINT journal_entry_post_write_verifications_hash_present_check
    CHECK (char_length(btrim(provider_readback_hash)) > 0),
  CONSTRAINT journal_entry_post_write_verifications_sync_distinct_check
    CHECK (
      accounting_sync_id IS NULL
      OR accounting_sync_id IS DISTINCT FROM source_accounting_sync_id
    ),
  CONSTRAINT journal_entry_post_write_verifications_verified_alignment_check
    CHECK (
      (status = 'EFFECTS_VERIFIED' AND effect_conclusion = 'VERIFIED')
      OR (status <> 'EFFECTS_VERIFIED' AND effect_conclusion <> 'VERIFIED')
    ),
  CONSTRAINT journal_entry_post_write_verifications_verified_lineage_check
    CHECK (
      status <> 'EFFECTS_VERIFIED'
      OR (
        accounting_sync_id IS NOT NULL
        AND continuous_close_run_id IS NOT NULL
        AND readiness IS NOT NULL
        AND retryable = false
        AND continuous_close_run_id IS DISTINCT FROM source_continuous_close_run_id
      )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS journal_entry_post_write_verifications_exec_sync_policy_uidx
  ON public.journal_entry_post_write_verifications (execution_id, accounting_sync_id, policy_hash)
  WHERE accounting_sync_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS journal_entry_post_write_verifications_exec_policy_pending_uidx
  ON public.journal_entry_post_write_verifications (execution_id, policy_hash)
  WHERE accounting_sync_id IS NULL;

CREATE INDEX IF NOT EXISTS journal_entry_post_write_verifications_execution_idx
  ON public.journal_entry_post_write_verifications (execution_id, updated_at DESC);

COMMENT ON TABLE public.journal_entry_post_write_verifications IS
  'JE-4 post-VERIFIED accounting refresh evidence. Does not authorize provider journal create or verify. Readiness is from the linked post-write continuous_close_runs row, not Memory.';

ALTER TABLE public.journal_entry_post_write_verifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.journal_entry_post_write_verifications FROM PUBLIC;
REVOKE ALL ON TABLE public.journal_entry_post_write_verifications FROM anon, authenticated;

DROP POLICY IF EXISTS journal_entry_post_write_verifications_service_role_all
  ON public.journal_entry_post_write_verifications;
CREATE POLICY journal_entry_post_write_verifications_service_role_all
  ON public.journal_entry_post_write_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS journal_entry_post_write_verifications_select
  ON public.journal_entry_post_write_verifications;
CREATE POLICY journal_entry_post_write_verifications_select
  ON public.journal_entry_post_write_verifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = journal_entry_post_write_verifications.engagement_id
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

GRANT SELECT ON TABLE public.journal_entry_post_write_verifications TO authenticated;
GRANT ALL ON TABLE public.journal_entry_post_write_verifications TO service_role;
