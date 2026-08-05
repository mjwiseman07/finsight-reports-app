-- Phase MEM_LIFECYCLE Block 7 — coverage-PDF download audit trail.
-- Parallels assertion_coverage_statement_downloads but scoped to engagements
-- (via company_id/firm_id partition) instead of close_periods/firm_clients.

BEGIN;

CREATE TABLE IF NOT EXISTS public.pilot_lifecycle_coverage_downloads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE RESTRICT,
  company_id uuid NULL,
  firm_id uuid NULL,
  requested_by_user_id uuid NULL,
  requested_by_email text NULL,
  content_sha256 text NOT NULL,
  byte_size integer NOT NULL,
  overlay_event_count integer NOT NULL DEFAULT 0,
  overlay_assertion_count integer NOT NULL DEFAULT 0,
  reconciliation_warning_count integer NOT NULL DEFAULT 0,
  chain_verified_at timestamptz NULL,
  requested_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT pilot_lifecycle_coverage_downloads_partition_chk
    CHECK (company_id IS NOT NULL OR firm_id IS NOT NULL),
  CONSTRAINT pilot_lifecycle_coverage_downloads_sha256_chk
    CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT pilot_lifecycle_coverage_downloads_byte_size_chk
    CHECK (byte_size > 0)
);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_coverage_downloads_engagement_idx
  ON public.pilot_lifecycle_coverage_downloads (engagement_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_coverage_downloads_company_idx
  ON public.pilot_lifecycle_coverage_downloads (company_id, requested_at DESC)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pilot_lifecycle_coverage_downloads_firm_idx
  ON public.pilot_lifecycle_coverage_downloads (firm_id, requested_at DESC)
  WHERE firm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pilot_lifecycle_coverage_downloads_user_idx
  ON public.pilot_lifecycle_coverage_downloads (requested_by_user_id, requested_at DESC)
  WHERE requested_by_user_id IS NOT NULL;

ALTER TABLE public.pilot_lifecycle_coverage_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pilot_lifecycle_coverage_downloads_partition_read
  ON public.pilot_lifecycle_coverage_downloads;

CREATE POLICY pilot_lifecycle_coverage_downloads_partition_read
  ON public.pilot_lifecycle_coverage_downloads
  FOR SELECT
  TO authenticated
  USING (
    (company_id IS NOT NULL AND company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND status = 'active'
    ))
    OR
    (firm_id IS NOT NULL AND firm_id IN (
      SELECT firm_id FROM public.firm_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    ))
  );

REVOKE ALL ON public.pilot_lifecycle_coverage_downloads FROM anon;
GRANT SELECT ON public.pilot_lifecycle_coverage_downloads TO authenticated;
GRANT ALL ON public.pilot_lifecycle_coverage_downloads TO service_role;

COMMENT ON TABLE public.pilot_lifecycle_coverage_downloads IS
  'Block 7: Audit trail for AR assertion-coverage PDF downloads. Immutable — INSERT only from service_role. Content sha256 is on the actual rendered PDF bytes.';

COMMIT;
