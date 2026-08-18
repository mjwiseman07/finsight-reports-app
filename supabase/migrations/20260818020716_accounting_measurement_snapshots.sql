-- CC-2A1 — AR measurement-input custody.
-- Sibling of accounting_syncs. Do NOT expand accounting_syncs.normalized_payload.
-- Immutable evidence input: no payload/hash/sync/as-of mutation; no historical backfill.

CREATE TABLE IF NOT EXISTS public.accounting_measurement_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accounting_sync_id uuid NOT NULL
    REFERENCES public.accounting_syncs(id)
    ON DELETE CASCADE,
  company_id uuid NOT NULL,
  accounting_connection_id uuid NOT NULL,
  provider text NOT NULL,
  tenant_or_realm_id text NOT NULL,
  snapshot_kind text NOT NULL,
  as_of_date date NOT NULL,
  schema_version integer NOT NULL,
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  source_request_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_measurement_snapshots_unique
    UNIQUE (accounting_sync_id, snapshot_kind, as_of_date),
  CONSTRAINT accounting_measurement_snapshots_kind_check
    CHECK (snapshot_kind IN ('ar_aging')),
  CONSTRAINT accounting_measurement_snapshots_schema_version_check
    CHECK (schema_version > 0),
  CONSTRAINT accounting_measurement_snapshots_payload_hash_check
    CHECK (payload_hash ~ '^[a-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS accounting_measurement_snapshots_company_idx
  ON public.accounting_measurement_snapshots (company_id, snapshot_kind, as_of_date);

COMMENT ON TABLE public.accounting_measurement_snapshots IS
  'Immutable URM measurement-input custody tied to an existing accounting_syncs.id. Not Scorecard memory.';

CREATE OR REPLACE FUNCTION public.accounting_measurement_snapshots_deny_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'accounting_measurement_snapshots rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS accounting_measurement_snapshots_immutable
  ON public.accounting_measurement_snapshots;
CREATE TRIGGER accounting_measurement_snapshots_immutable
  BEFORE UPDATE ON public.accounting_measurement_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.accounting_measurement_snapshots_deny_update();

ALTER TABLE public.accounting_measurement_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounting_measurement_snapshots_service_role_all
  ON public.accounting_measurement_snapshots;
CREATE POLICY accounting_measurement_snapshots_service_role_all
  ON public.accounting_measurement_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS accounting_measurement_snapshots_select
  ON public.accounting_measurement_snapshots;
CREATE POLICY accounting_measurement_snapshots_select
  ON public.accounting_measurement_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = accounting_measurement_snapshots.company_id
        AND cu.user_id = (SELECT auth.uid())
        AND cu.status = 'active'
    )
  );

GRANT SELECT ON public.accounting_measurement_snapshots TO authenticated;
GRANT ALL ON public.accounting_measurement_snapshots TO service_role;
