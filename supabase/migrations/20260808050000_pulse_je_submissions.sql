-- WBP W0: provider-agnostic JE write history (supersedes je_post_attempts for new writers).
-- Schema corrected for live je_post_attempts (6 columns) — see Phase WBP W0 Matt corrections.
-- Legacy QBO attempts are backfilled with NULL request/response/connection_id (not retained).

CREATE TABLE IF NOT EXISTS public.pulse_je_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (
    provider = ANY (ARRAY[
      'quickbooks'::text,
      'xero'::text,
      'sage_intacct'::text,
      'netsuite'::text,
      'dynamics_365_bc'::text
    ])
  ),
  status TEXT NOT NULL CHECK (
    status = ANY (ARRAY[
      'pending'::text,
      'posted'::text,
      'rejected'::text,
      'failed'::text,
      'voided'::text,
      'reversed'::text
    ])
  ),
  idempotency_key TEXT NOT NULL,
  provider_je_id TEXT,
  connection_id UUID REFERENCES public.accounting_connections(id) ON DELETE SET NULL,
  request_payload JSONB,
  response_payload JSONB,
  posted_by_user_id UUID,
  firm_client_id UUID,
  actor_user_id UUID,
  canonical_hash TEXT,
  source_type TEXT,
  source_id TEXT,
  posted_by TEXT CHECK (posted_by IS NULL OR posted_by = ANY (ARRAY['ai'::text, 'human'::text])),
  posted_at TIMESTAMPTZ,
  rejection_reason TEXT,
  failure_error TEXT,
  retryable BOOLEAN,
  assertions_addressed TEXT[],
  data_source_reliability_basis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pulse_je_submissions IS
  'Provider-agnostic JE write history (WBP W0 — supersedes je_post_attempts). Legacy QBO attempts backfilled 2026-08-08 with NULL request/response/connection_id (not retained in original schema). All new writes populate all fields.';

CREATE UNIQUE INDEX IF NOT EXISTS pulse_je_submissions_provider_idempotency_uk
  ON public.pulse_je_submissions (provider, idempotency_key);

CREATE INDEX IF NOT EXISTS pulse_je_submissions_company_status_idx
  ON public.pulse_je_submissions (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS pulse_je_submissions_conn_idx
  ON public.pulse_je_submissions (connection_id, created_at DESC)
  WHERE connection_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pulse_je_submissions_provider_je_idx
  ON public.pulse_je_submissions (provider, provider_je_id)
  WHERE provider_je_id IS NOT NULL;

ALTER TABLE public.pulse_je_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pulse_je_submissions_company_read ON public.pulse_je_submissions;
CREATE POLICY pulse_je_submissions_company_read ON public.pulse_je_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.company_users cu
      WHERE cu.company_id = pulse_je_submissions.company_id
        AND cu.user_id = auth.uid()
        AND cu.status = 'active'
    )
  );

DROP POLICY IF EXISTS pulse_je_submissions_service_write ON public.pulse_je_submissions;
CREATE POLICY pulse_je_submissions_service_write ON public.pulse_je_submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Backfill legacy QBO attempts only when firm_clients.company_id resolves to a real companies row.
-- Orphan company_ids (demo fixture drift) are excluded — do NOT fabricate companies.
INSERT INTO public.pulse_je_submissions (
  id,
  company_id,
  provider,
  status,
  idempotency_key,
  provider_je_id,
  connection_id,
  request_payload,
  response_payload,
  posted_by_user_id,
  firm_client_id,
  created_at,
  updated_at
)
SELECT
  jpa.attempt_id AS id,
  fc.company_id AS company_id,
  'quickbooks' AS provider,
  jpa.status AS status,
  jpa.idempotency_key AS idempotency_key,
  jpa.qbo_je_id AS provider_je_id,
  NULL::uuid AS connection_id,
  NULL::jsonb AS request_payload,
  NULL::jsonb AS response_payload,
  NULL::uuid AS posted_by_user_id,
  jpa.firm_client_id AS firm_client_id,
  jpa.created_at AS created_at,
  jpa.updated_at AS updated_at
FROM public.je_post_attempts jpa
JOIN public.firm_clients fc ON fc.id = jpa.firm_client_id
INNER JOIN public.companies c ON c.id = fc.company_id
ON CONFLICT (provider, idempotency_key) DO NOTHING;

DO $$
DECLARE
  excluded_count INT;
BEGIN
  SELECT COUNT(*) INTO excluded_count
  FROM public.je_post_attempts jpa
  JOIN public.firm_clients fc ON fc.id = jpa.firm_client_id
  LEFT JOIN public.companies c ON c.id = fc.company_id
  WHERE c.id IS NULL;
  RAISE NOTICE 'W0 backfill: excluded % je_post_attempts rows with orphan firm_clients.company_id → follow-up: reconcile firm_clients FK', excluded_count;
END $$;
