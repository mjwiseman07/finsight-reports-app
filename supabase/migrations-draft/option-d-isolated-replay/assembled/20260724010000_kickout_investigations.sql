-- PBC-TIEOUT-4.1: Kickout investigations table (append-only)
-- Feeds 4.2 auto-reconcile memory. Polymorphic FK to BS lines and PBC runs.

CREATE TABLE IF NOT EXISTS public.audit_ready_kickout_investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  kickout_source_type TEXT NOT NULL CHECK (kickout_source_type IN ('bs_summary_line', 'pbc_run')),
  kickout_source_id UUID NOT NULL,
  investigated_by UUID NOT NULL REFERENCES auth.users(id),
  investigated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT NOT NULL CHECK (length(trim(note)) > 0),
  resolution_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (resolution_status IN ('pending', 'resolved', 'escalated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kickout_inv_source_lookup
  ON public.audit_ready_kickout_investigations
    (engagement_id, kickout_source_type, kickout_source_id, investigated_at DESC);

CREATE INDEX IF NOT EXISTS idx_kickout_inv_engagement_status
  ON public.audit_ready_kickout_investigations
    (engagement_id, resolution_status, investigated_at DESC);

ALTER TABLE public.audit_ready_kickout_investigations ENABLE ROW LEVEL SECURITY;

-- SELECT: user must have firm or company access to the engagement
CREATE POLICY kickout_inv_select
  ON public.audit_ready_kickout_investigations FOR SELECT
  TO authenticated
  USING (
    engagement_id IN (
      SELECT e.id FROM public.audit_ready_engagements e
      WHERE
        (e.firm_id IS NOT NULL AND e.firm_id IN (
          SELECT firm_id FROM public.firm_memberships
          WHERE user_id = (SELECT auth.uid()) AND status = 'active'
        ))
        OR
        (e.company_id IS NOT NULL AND e.company_id IN (
          SELECT company_id FROM public.company_users
          WHERE user_id = (SELECT auth.uid()) AND status = 'active'
        ))
    )
  );

-- INSERT: same access + user must be the investigator
CREATE POLICY kickout_inv_insert
  ON public.audit_ready_kickout_investigations FOR INSERT
  TO authenticated
  WITH CHECK (
    investigated_by = (SELECT auth.uid())
    AND engagement_id IN (
      SELECT e.id FROM public.audit_ready_engagements e
      WHERE
        (e.firm_id IS NOT NULL AND e.firm_id IN (
          SELECT firm_id FROM public.firm_memberships
          WHERE user_id = (SELECT auth.uid()) AND status = 'active'
        ))
        OR
        (e.company_id IS NOT NULL AND e.company_id IN (
          SELECT company_id FROM public.company_users
          WHERE user_id = (SELECT auth.uid()) AND status = 'active'
        ))
    )
  );

-- No UPDATE, no DELETE (append-only)
