-- Phase DASH_1C Block A — Accuracy Contract cache.
-- Keyed on (company_id, kpi_code, period, accounting_syncs_id) so a new sync
-- naturally invalidates by creating a row with a new sync id. TTL = new sync.
-- RLS: same access model as accounting_syncs (company_users membership).

CREATE TABLE IF NOT EXISTS public.accuracy_contract_cache (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kpi_code             text NOT NULL,
  period               text NOT NULL,
  accounting_syncs_id  uuid NOT NULL REFERENCES public.accounting_syncs(id) ON DELETE CASCADE,
  kpi_value_numeric    numeric,
  kpi_value_display    text NOT NULL,
  unit                 text NOT NULL,
  computation_status   text NOT NULL,
  formula_json         jsonb NOT NULL,
  composition_json     jsonb NOT NULL,
  provenance_json      jsonb NOT NULL,
  chain_receipt_json   jsonb NOT NULL,
  computed_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accuracy_contract_cache_unique
    UNIQUE (company_id, kpi_code, period, accounting_syncs_id),
  CONSTRAINT accuracy_contract_cache_status_check
    CHECK (computation_status IN ('computed','pending_subledger')),
  CONSTRAINT accuracy_contract_cache_unit_check
    CHECK (unit IN ('currency','percent','ratio','days','count'))
);

CREATE INDEX IF NOT EXISTS idx_accuracy_contract_cache_lookup
  ON public.accuracy_contract_cache (company_id, kpi_code, period, computed_at DESC);

ALTER TABLE public.accuracy_contract_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accuracy_contract_cache_select ON public.accuracy_contract_cache;
CREATE POLICY accuracy_contract_cache_select
  ON public.accuracy_contract_cache
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = accuracy_contract_cache.company_id
        AND cu.user_id = (SELECT auth.uid())
        AND cu.status = 'active'
    )
  );
