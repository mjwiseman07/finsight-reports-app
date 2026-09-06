-- Additive migration for PBC-TIEOUT-4B.3.5.
-- Adds is_computed_line to summary lines (Net Income row support) and
-- accounting_method to summary artifacts (Accrual vs Cash audit trail).

ALTER TABLE public.audit_ready_bs_recon_summary_lines
  ADD COLUMN IF NOT EXISTS is_computed_line boolean NOT NULL DEFAULT false;

-- Per-report accounting basis captured at fixture-capture time.
-- Lives on the summary artifact (not the parent tie_out_runs) because
-- a firm may run BS on Accrual basis and P&L on Cash basis in the same
-- tie-out run — basis is a property of the specific report, not the
-- orchestration run that produced it.
ALTER TABLE public.audit_ready_bs_recon_summary_artifacts
  ADD COLUMN IF NOT EXISTS accounting_method text
  CHECK (accounting_method IN ('Accrual', 'Cash'));

-- Backfill any pre-existing rows to 'Accrual' (default assumption for
-- the pilot). Safe because there are no Cash-basis clients in
-- production yet as of this migration.
UPDATE public.audit_ready_bs_recon_summary_artifacts
  SET accounting_method = 'Accrual'
  WHERE accounting_method IS NULL;
