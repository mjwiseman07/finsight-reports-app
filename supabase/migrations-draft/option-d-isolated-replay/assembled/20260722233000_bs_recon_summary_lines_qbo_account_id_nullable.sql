-- Phase PBC-TIEOUT-4B.3.5 Fix-up #2
--
-- Relax NOT NULL on audit_ready_bs_recon_summary_lines.qbo_account_id.
-- Computed summary lines (e.g. QBO's Net Income row on the Balance Sheet)
-- have no underlying QBO account — the value is derived on the report
-- itself. The is_computed_line boolean column (added in the prior
-- migration in this phase) already distinguishes these rows from
-- real-account rows. Application code inserts qbo_account_id = NULL
-- for these rows, which the previous NOT NULL constraint rejected.
--
-- Backfill is a no-op: existing rows all have non-null qbo_account_id
-- values (they were all real-account rows before Phase 4B.3.5).
--
-- Idempotent: ALTER COLUMN DROP NOT NULL is a no-op if the column is
-- already nullable.
ALTER TABLE audit_ready_bs_recon_summary_lines
  ALTER COLUMN qbo_account_id DROP NOT NULL;

-- Add a partial CHECK to encode the semantic: qbo_account_id may be NULL
-- ONLY when is_computed_line = true. This prevents accidental future
-- inserts of real-account rows with a null account id — those would
-- indicate a bug in the parser or resolver.
ALTER TABLE audit_ready_bs_recon_summary_lines
  DROP CONSTRAINT IF EXISTS audit_ready_bs_recon_summary_lines_qbo_account_id_computed_check;

ALTER TABLE audit_ready_bs_recon_summary_lines
  ADD CONSTRAINT audit_ready_bs_recon_summary_lines_qbo_account_id_computed_check
  CHECK (
    (is_computed_line = true AND qbo_account_id IS NULL)
    OR (is_computed_line = false AND qbo_account_id IS NOT NULL)
  );
