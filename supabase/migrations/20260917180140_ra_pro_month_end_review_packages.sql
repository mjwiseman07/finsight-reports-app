-- Immutable, review-only RA Pro month-end packages. No provider write authority.
BEGIN;

CREATE TABLE public.ra_pro_month_end_review_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE RESTRICT,
  firm_client_id uuid NOT NULL REFERENCES public.firm_clients(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  accounting_sync_id uuid NOT NULL REFERENCES public.accounting_syncs(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider IN ('quickbooks', 'xero')),
  period_end date NOT NULL,
  status text NOT NULL CHECK (status IN ('ready', 'review_required', 'blocked')),
  review_package jsonb NOT NULL,
  idempotency_key text NOT NULL UNIQUE CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  completed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_client_id, period_end, accounting_sync_id),
  CHECK ((review_package->>'review_only')::boolean IS TRUE),
  CHECK ((review_package->>'provider_writes')::boolean IS FALSE)
);

CREATE INDEX ra_pro_month_end_firm_period_idx
  ON public.ra_pro_month_end_review_packages (firm_id, period_end DESC);
CREATE INDEX ra_pro_month_end_client_period_idx
  ON public.ra_pro_month_end_review_packages (firm_client_id, period_end DESC);

ALTER TABLE public.ra_pro_month_end_review_packages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ra_pro_month_end_review_packages FROM anon, authenticated;
GRANT SELECT ON TABLE public.ra_pro_month_end_review_packages TO authenticated;
GRANT SELECT, INSERT ON TABLE public.ra_pro_month_end_review_packages TO service_role;

CREATE POLICY ra_pro_month_end_service_insert
  ON public.ra_pro_month_end_review_packages FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY ra_pro_month_end_service_select
  ON public.ra_pro_month_end_review_packages FOR SELECT TO service_role USING (true);
CREATE POLICY ra_pro_month_end_member_select
  ON public.ra_pro_month_end_review_packages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.firm_memberships fm
    WHERE fm.firm_id = ra_pro_month_end_review_packages.firm_id
      AND fm.user_id = (SELECT auth.uid())
      AND fm.status = 'active'
  ));

CREATE OR REPLACE FUNCTION public.persist_ra_pro_month_end_review_package(p_package jsonb)
RETURNS TABLE(package_id uuid, reused boolean)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.ra_pro_month_end_review_packages
  WHERE idempotency_key = p_package->>'idempotency_key';
  IF FOUND THEN
    package_id := v_id; reused := true; RETURN NEXT; RETURN;
  END IF;

  INSERT INTO public.ra_pro_month_end_review_packages (
    firm_id, firm_client_id, company_id, accounting_sync_id, provider,
    period_end, status, review_package, idempotency_key, completed_at
  ) VALUES (
    (p_package->>'firm_id')::uuid, (p_package->>'firm_client_id')::uuid,
    (p_package->>'company_id')::uuid, (p_package->>'accounting_sync_id')::uuid,
    p_package->>'provider', (p_package->>'period_end')::date, p_package->>'status',
    p_package->'review_package', p_package->>'idempotency_key',
    (p_package->>'completed_at')::timestamptz
  ) RETURNING id INTO v_id;
  package_id := v_id; reused := false; RETURN NEXT; RETURN;
EXCEPTION WHEN unique_violation THEN
  SELECT id INTO v_id FROM public.ra_pro_month_end_review_packages
  WHERE idempotency_key = p_package->>'idempotency_key';
  IF NOT FOUND THEN RAISE; END IF;
  package_id := v_id; reused := true; RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_ra_pro_month_end_review_package(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_ra_pro_month_end_review_package(jsonb) TO service_role;

COMMENT ON TABLE public.ra_pro_month_end_review_packages IS
  'Immutable RA Pro month-end review packages. Review-only; provider writes are prohibited.';

COMMIT;
