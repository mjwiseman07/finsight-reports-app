-- AR Week 3 Block 3.3 — fix infinite RLS recursion on company_users
-- ADDITIVE ONLY. Introduces SECURITY DEFINER helpers, rewrites recursive policy,
-- rewires audit_ready_* policies through the helpers.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) SECURITY DEFINER helpers — read company_users bypassing RLS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_company_member(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.company_id = _company_id
      AND cu.user_id    = (SELECT auth.uid())
      AND cu.status     = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_active_company_role(
  _company_id uuid,
  _roles      text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.company_id = _company_id
      AND cu.user_id    = (SELECT auth.uid())
      AND cu.status     = 'active'
      AND cu.role       = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_active_company_role(_company_id, ARRAY['company_admin']::text[]);
$$;

-- Firm-side symmetry (no recursion today, but keeps engagement policy uniform).
CREATE OR REPLACE FUNCTION public.is_active_firm_member(_firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.firm_memberships fm
    WHERE fm.firm_id = _firm_id
      AND fm.user_id = (SELECT auth.uid())
      AND fm.status  = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_active_firm_role(
  _firm_id uuid,
  _roles   text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.firm_memberships fm
    WHERE fm.firm_id = _firm_id
      AND fm.user_id = (SELECT auth.uid())
      AND fm.status  = 'active'
      AND fm.role    = ANY(_roles)
  );
$$;

-- Only authenticated users invoke these; lock down default privileges.
REVOKE ALL ON FUNCTION public.is_active_company_member(uuid)      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_company_role(uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_company_admin(uuid)              FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_firm_member(uuid)         FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_firm_role(uuid, text[])  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_active_company_member(uuid)      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_active_company_role(uuid, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid)              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_firm_member(uuid)         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_active_firm_role(uuid, text[])  TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2) Fix the recursive policy on company_users
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "company admins can manage company users" ON public.company_users;
CREATE POLICY "company admins can manage company users"
  ON public.company_users
  FOR ALL
  TO public
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_company_admin(company_users.company_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_company_admin(company_users.company_id)
  );

-- ----------------------------------------------------------------------------
-- 3) Rewire audit_ready_engagements policies through the helpers
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS audit_ready_engagements_company_read ON public.audit_ready_engagements;
CREATE POLICY audit_ready_engagements_company_read
  ON public.audit_ready_engagements
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL
    AND public.is_active_company_member(company_id)
  );

DROP POLICY IF EXISTS audit_ready_engagements_firm_read ON public.audit_ready_engagements;
CREATE POLICY audit_ready_engagements_firm_read
  ON public.audit_ready_engagements
  FOR SELECT
  TO authenticated
  USING (
    firm_id IS NOT NULL
    AND public.is_active_firm_member(firm_id)
  );

DROP POLICY IF EXISTS audit_ready_engagements_write ON public.audit_ready_engagements;
CREATE POLICY audit_ready_engagements_write
  ON public.audit_ready_engagements
  FOR ALL
  TO authenticated
  USING (
    (
      company_id IS NOT NULL
      AND public.has_active_company_role(
        company_id,
        ARRAY['company_admin','owner_executive','controller']::text[]
      )
    )
    OR
    (
      firm_id IS NOT NULL
      AND public.has_active_firm_role(
        firm_id,
        ARRAY['firm_admin','controller','fractional_cfo']::text[]
      )
    )
  )
  WITH CHECK (
    (
      company_id IS NOT NULL
      AND public.has_active_company_role(
        company_id,
        ARRAY['company_admin','owner_executive','controller']::text[]
      )
    )
    OR
    (
      firm_id IS NOT NULL
      AND public.has_active_firm_role(
        firm_id,
        ARRAY['firm_admin','controller','fractional_cfo']::text[]
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 4) Rewire audit_ready_pbc_requests policy
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS audit_ready_pbc_requests_all ON public.audit_ready_pbc_requests;
CREATE POLICY audit_ready_pbc_requests_all
  ON public.audit_ready_pbc_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_pbc_requests.engagement_id
        AND (
          (e.company_id IS NOT NULL AND public.is_active_company_member(e.company_id))
          OR
          (e.firm_id    IS NOT NULL AND public.is_active_firm_member(e.firm_id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_pbc_requests.engagement_id
        AND (
          (e.company_id IS NOT NULL AND public.is_active_company_member(e.company_id))
          OR
          (e.firm_id    IS NOT NULL AND public.is_active_firm_member(e.firm_id))
        )
    )
  );

-- ----------------------------------------------------------------------------
-- 5) Rewire audit_ready_auditor_portal_users owner policy
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS audit_ready_portal_owner_all ON public.audit_ready_auditor_portal_users;
CREATE POLICY audit_ready_portal_owner_all
  ON public.audit_ready_auditor_portal_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_auditor_portal_users.engagement_id
        AND (
          (
            e.company_id IS NOT NULL
            AND public.has_active_company_role(
              e.company_id,
              ARRAY['company_admin','owner_executive','controller']::text[]
            )
          )
          OR
          (
            e.firm_id IS NOT NULL
            AND public.has_active_firm_role(
              e.firm_id,
              ARRAY['firm_admin','controller','fractional_cfo']::text[]
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_auditor_portal_users.engagement_id
        AND (
          (
            e.company_id IS NOT NULL
            AND public.has_active_company_role(
              e.company_id,
              ARRAY['company_admin','owner_executive','controller']::text[]
            )
          )
          OR
          (
            e.firm_id IS NOT NULL
            AND public.has_active_firm_role(
              e.firm_id,
              ARRAY['firm_admin','controller','fractional_cfo']::text[]
            )
          )
        )
    )
  );

-- The audit_ready_portal_self policy is fine as-is (auth.uid() equality only).

COMMIT;
