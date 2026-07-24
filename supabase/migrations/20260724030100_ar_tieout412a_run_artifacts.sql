-- Phase PBC-TIEOUT-4.1.2 Block A: run artifact storage + regeneration lineage

CREATE TABLE IF NOT EXISTS public.audit_ready_run_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tie_out_run_id uuid NOT NULL
    REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  artifact_kind text NOT NULL CHECK (artifact_kind IN ('xlsx', 'pdf')),
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes >= 0),
  content_hash text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tie_out_run_id, artifact_kind)
);

CREATE INDEX IF NOT EXISTS idx_run_artifacts_run
  ON public.audit_ready_run_artifacts (tie_out_run_id);
CREATE INDEX IF NOT EXISTS idx_run_artifacts_generated_at
  ON public.audit_ready_run_artifacts (generated_at DESC);

ALTER TABLE public.audit_ready_run_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS run_artifacts_select ON public.audit_ready_run_artifacts;
CREATE POLICY run_artifacts_select ON public.audit_ready_run_artifacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_tie_out_runs r
      JOIN public.audit_ready_engagements e ON e.id = r.engagement_id
      WHERE r.id = audit_ready_run_artifacts.tie_out_run_id
        AND (
          EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          )
        )
    )
  );

-- Regeneration lineage on runs
ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS regenerated_from_run_id uuid
    REFERENCES public.audit_ready_tie_out_runs(id),
  ADD COLUMN IF NOT EXISTS trigger_kind text NOT NULL DEFAULT 'initial';

-- Backfill + constrain trigger_kind (column may already exist without check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_ready_tie_out_runs_trigger_kind_check'
  ) THEN
    ALTER TABLE public.audit_ready_tie_out_runs
      ADD CONSTRAINT audit_ready_tie_out_runs_trigger_kind_check
      CHECK (trigger_kind IN ('initial', 'regenerated', 'cron'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tie_out_runs_regenerated_from
  ON public.audit_ready_tie_out_runs (regenerated_from_run_id)
  WHERE regenerated_from_run_id IS NOT NULL;

-- Storage bucket (idempotent). If your project forbids SQL bucket inserts,
-- create `audit-ready-workpapers` via Dashboard and skip this INSERT.
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-ready-workpapers', 'audit-ready-workpapers', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "audit_ready_workpapers_select" ON storage.objects;
CREATE POLICY "audit_ready_workpapers_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audit-ready-workpapers'
    AND EXISTS (
      SELECT 1
      FROM public.audit_ready_run_artifacts a
      JOIN public.audit_ready_tie_out_runs r ON r.id = a.tie_out_run_id
      JOIN public.audit_ready_engagements e ON e.id = r.engagement_id
      WHERE a.storage_path = storage.objects.name
        AND (
          EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          )
        )
    )
  );
