-- Phase PBC-TIEOUT-4.2 Block A: resolution_code on kickout investigations
-- Structured disposition for memory matching.
-- NULL-safe: legacy rows stay NULL; API layer enforces required on new INSERTs.
-- Forward reference: audit_ready_memory AddonCode gates Block B (auto-clear)
-- and Block C (governance); Suggest is not gated in Block A.

ALTER TABLE public.audit_ready_kickout_investigations
  ADD COLUMN IF NOT EXISTS resolution_code text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_ready_kickout_investigations_resolution_code_chk'
      AND conrelid = 'public.audit_ready_kickout_investigations'::regclass
  ) THEN
    ALTER TABLE public.audit_ready_kickout_investigations
      ADD CONSTRAINT audit_ready_kickout_investigations_resolution_code_chk
      CHECK (
        resolution_code IS NULL
        OR resolution_code IN (
          'immaterial',
          'timing',
          'reclass',
          'true_error',
          'other'
        )
      );
  END IF;
END
$$;

COMMENT ON COLUMN public.audit_ready_kickout_investigations.resolution_code IS
  'Structured disposition for memory matching (Block B). Canonical values: '
  'immaterial | timing | reclass | true_error | other. NULL-safe for legacy '
  'rows; API layer enforces required on new INSERTs.';
