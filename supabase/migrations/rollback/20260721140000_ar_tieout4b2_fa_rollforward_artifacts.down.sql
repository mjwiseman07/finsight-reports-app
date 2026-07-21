-- Rollback stub for PBC-TIEOUT-4B.2 FA roll-forward tables.
-- Does NOT restore prior CHECK constraint definitions (manual if needed).
BEGIN;
DROP TABLE IF EXISTS public.audit_ready_fa_rollforward_lines;
DROP TABLE IF EXISTS public.audit_ready_fa_rollforward_artifacts;
COMMIT;
