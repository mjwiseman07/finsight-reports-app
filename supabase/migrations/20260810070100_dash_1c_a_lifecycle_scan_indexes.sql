-- Phase DASH_1C Block A — freshness + minting-event lookup indexes.
CREATE INDEX IF NOT EXISTS idx_pilot_lifecycle_company_chain_seq_desc
  ON public.pilot_lifecycle_events (company_id, chain_seq DESC);

CREATE INDEX IF NOT EXISTS idx_pilot_lifecycle_company_kind_syncid
  ON public.pilot_lifecycle_events
  (company_id, event_kind, ((payload->>'accounting_syncs_id')::text))
  WHERE payload ? 'accounting_syncs_id';
