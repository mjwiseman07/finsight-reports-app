-- Additive migration for PBC-TIEOUT-4B.3.5.
-- Adds is_computed_line to summary lines (Net Income row support) and
-- accounting_method to runs (Accrual vs Cash audit trail).

ALTER TABLE public.audit_ready_bs_recon_summary_lines
  ADD COLUMN IF NOT EXISTS is_computed_line boolean NOT NULL DEFAULT false;

ALTER TABLE public.audit_ready_bs_recon_runs
  ADD COLUMN IF NOT EXISTS accounting_method text NOT NULL DEFAULT 'Accrual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public'
      AND table_name='audit_ready_bs_recon_runs'
      AND constraint_name='audit_ready_bs_recon_runs_accounting_method_chk'
  ) THEN
    ALTER TABLE public.audit_ready_bs_recon_runs
      ADD CONSTRAINT audit_ready_bs_recon_runs_accounting_method_chk
      CHECK (accounting_method IN ('Accrual','Cash'));
  END IF;
END $$;
