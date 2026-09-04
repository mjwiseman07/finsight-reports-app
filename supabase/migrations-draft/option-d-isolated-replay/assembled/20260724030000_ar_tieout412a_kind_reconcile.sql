-- Phase PBC-TIEOUT-4.1.2 Block A: kind reconciliation
-- Rename legacy 'fixed_assets' tie_out_kind values to canonical 'fixed_asset_rollforward'.
-- Idempotent — safe to re-run.

UPDATE public.audit_ready_tie_out_runs
SET tie_out_kind = 'fixed_asset_rollforward'
WHERE tie_out_kind = 'fixed_assets';

-- Also reconcile classifier-persisted kind on PBC requests (if any legacy rows)
UPDATE public.audit_ready_pbc_requests
SET tie_out_kind = 'fixed_asset_rollforward'
WHERE tie_out_kind = 'fixed_assets';

DO $$
DECLARE
  legacy_count int;
BEGIN
  SELECT COUNT(*) INTO legacy_count
  FROM public.audit_ready_tie_out_runs
  WHERE tie_out_kind = 'fixed_assets';
  IF legacy_count > 0 THEN
    RAISE EXCEPTION 'Legacy fixed_assets rows still exist on runs: %', legacy_count;
  END IF;

  SELECT COUNT(*) INTO legacy_count
  FROM public.audit_ready_pbc_requests
  WHERE tie_out_kind = 'fixed_assets';
  IF legacy_count > 0 THEN
    RAISE EXCEPTION 'Legacy fixed_assets rows still exist on pbc_requests: %', legacy_count;
  END IF;
END $$;
