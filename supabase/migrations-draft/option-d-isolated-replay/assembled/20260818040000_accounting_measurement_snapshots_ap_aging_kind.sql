-- CC-2A2 — permit AP aging measurement snapshots on the existing table.
-- Additive CHECK only. Do not edit 20260818020716. No backfill. No RLS change.

ALTER TABLE public.accounting_measurement_snapshots
  DROP CONSTRAINT IF EXISTS accounting_measurement_snapshots_kind_check;

ALTER TABLE public.accounting_measurement_snapshots
  ADD CONSTRAINT accounting_measurement_snapshots_kind_check
  CHECK (snapshot_kind IN ('ar_aging', 'ap_aging'));
