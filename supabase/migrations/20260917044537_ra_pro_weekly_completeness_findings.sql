-- RA Pro weekly accounting completeness review.
--
-- Server automation records immutable weekly observations and aggregate review
-- findings. It never posts invoices, payments, or journal entries. Firm members
-- may read findings for their own workspace; all mutation remains service-only.

BEGIN;

CREATE TABLE public.ra_pro_weekly_completeness_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE RESTRICT,
  firm_client_id uuid NOT NULL REFERENCES public.firm_clients(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  accounting_sync_id uuid NOT NULL REFERENCES public.accounting_syncs(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider IN ('quickbooks', 'xero')),
  week_ending date NOT NULL,
  status text NOT NULL CHECK (status IN ('clear', 'review_required', 'blocked')),
  finding_count integer NOT NULL CHECK (finding_count >= 0),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL UNIQUE CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  completed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_client_id, week_ending, accounting_sync_id)
);

CREATE TABLE public.ra_pro_weekly_completeness_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ra_pro_weekly_completeness_runs(id) ON DELETE RESTRICT,
  category text NOT NULL CHECK (category IN ('bank_activity', 'order_to_invoice', 'accounts_receivable', 'accounts_payable', 'source_data')),
  code text NOT NULL CHECK (code ~ '^[a-z0-9_]+$'),
  severity text NOT NULL CHECK (severity IN ('review', 'block')),
  item_count integer NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  amount_cents bigint NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, code)
);

CREATE INDEX ra_pro_weekly_runs_firm_period_idx
  ON public.ra_pro_weekly_completeness_runs (firm_id, week_ending DESC);
CREATE INDEX ra_pro_weekly_runs_client_period_idx
  ON public.ra_pro_weekly_completeness_runs (firm_client_id, week_ending DESC);
CREATE INDEX ra_pro_weekly_findings_run_idx
  ON public.ra_pro_weekly_completeness_findings (run_id, severity, category);

ALTER TABLE public.ra_pro_weekly_completeness_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ra_pro_weekly_completeness_findings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ra_pro_weekly_completeness_runs FROM anon, authenticated;
REVOKE ALL ON TABLE public.ra_pro_weekly_completeness_findings FROM anon, authenticated;
GRANT SELECT ON TABLE public.ra_pro_weekly_completeness_runs TO authenticated;
GRANT SELECT ON TABLE public.ra_pro_weekly_completeness_findings TO authenticated;
GRANT SELECT, INSERT ON TABLE public.ra_pro_weekly_completeness_runs TO service_role;
GRANT SELECT, INSERT ON TABLE public.ra_pro_weekly_completeness_findings TO service_role;

CREATE POLICY ra_pro_weekly_runs_service_role_insert
  ON public.ra_pro_weekly_completeness_runs FOR INSERT TO service_role
  WITH CHECK (true);
CREATE POLICY ra_pro_weekly_runs_service_role_select
  ON public.ra_pro_weekly_completeness_runs FOR SELECT TO service_role
  USING (true);
CREATE POLICY ra_pro_weekly_runs_firm_member_select
  ON public.ra_pro_weekly_completeness_runs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = ra_pro_weekly_completeness_runs.firm_id
        AND fm.user_id = (SELECT auth.uid())
        AND fm.status = 'active'
    )
  );

CREATE POLICY ra_pro_weekly_findings_service_role_insert
  ON public.ra_pro_weekly_completeness_findings FOR INSERT TO service_role
  WITH CHECK (true);
CREATE POLICY ra_pro_weekly_findings_service_role_select
  ON public.ra_pro_weekly_completeness_findings FOR SELECT TO service_role
  USING (true);
CREATE POLICY ra_pro_weekly_findings_firm_member_select
  ON public.ra_pro_weekly_completeness_findings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ra_pro_weekly_completeness_runs r
      JOIN public.firm_memberships fm ON fm.firm_id = r.firm_id
      WHERE r.id = ra_pro_weekly_completeness_findings.run_id
        AND fm.user_id = (SELECT auth.uid())
        AND fm.status = 'active'
    )
  );

CREATE OR REPLACE FUNCTION public.persist_ra_pro_weekly_completeness(
  p_run jsonb,
  p_findings jsonb
)
RETURNS TABLE(run_id uuid, reused boolean)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_run_id uuid;
  v_finding jsonb;
BEGIN
  SELECT id INTO v_run_id
  FROM public.ra_pro_weekly_completeness_runs
  WHERE idempotency_key = p_run->>'idempotency_key';

  IF FOUND THEN
    run_id := v_run_id;
    reused := true;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.ra_pro_weekly_completeness_runs (
    firm_id, firm_client_id, company_id, accounting_sync_id, provider,
    week_ending, status, finding_count, summary, idempotency_key, completed_at
  ) VALUES (
    (p_run->>'firm_id')::uuid,
    (p_run->>'firm_client_id')::uuid,
    (p_run->>'company_id')::uuid,
    (p_run->>'accounting_sync_id')::uuid,
    p_run->>'provider',
    (p_run->>'week_ending')::date,
    p_run->>'status',
    (p_run->>'finding_count')::integer,
    COALESCE(p_run->'summary', '{}'::jsonb),
    p_run->>'idempotency_key',
    (p_run->>'completed_at')::timestamptz
  ) RETURNING id INTO v_run_id;

  FOR v_finding IN SELECT value FROM jsonb_array_elements(COALESCE(p_findings, '[]'::jsonb))
  LOOP
    INSERT INTO public.ra_pro_weekly_completeness_findings (
      run_id, category, code, severity, item_count, amount_cents, evidence
    ) VALUES (
      v_run_id,
      v_finding->>'category',
      v_finding->>'code',
      v_finding->>'severity',
      COALESCE((v_finding->>'item_count')::integer, 0),
      NULLIF(v_finding->>'amount_cents', '')::bigint,
      COALESCE(v_finding->'evidence', '{}'::jsonb)
    );
  END LOOP;

  run_id := v_run_id;
  reused := false;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_run_id
    FROM public.ra_pro_weekly_completeness_runs
    WHERE idempotency_key = p_run->>'idempotency_key';
    IF NOT FOUND THEN
      RAISE;
    END IF;
    run_id := v_run_id;
    reused := true;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_ra_pro_weekly_completeness(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_ra_pro_weekly_completeness(jsonb, jsonb) TO service_role;

COMMENT ON TABLE public.ra_pro_weekly_completeness_runs IS
  'RA Pro weekly read-only accounting completeness observations; no provider write authority.';
COMMENT ON TABLE public.ra_pro_weekly_completeness_findings IS
  'Aggregate reviewer exceptions from weekly completeness observations. Provider writes require a separate governed workflow.';

COMMIT;
