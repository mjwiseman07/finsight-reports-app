-- Phase D6.5 Part 2 — Block 7a.2 — Pre-Pilot Security Hardening
--
-- Resolves 8 pre-existing ERROR advisors before NY contractor pilot go-live:
--   Group A: RLS disabled on 3 public tables
--   Group B: SECURITY DEFINER on 2 views
--   Group C: user-editable JWT metadata half in 3 super-admin policies (privilege escalation)
--
-- Additive-only. No data touched. No existing tables altered.
-- Super-admin convention: app_metadata.role = 'super_admin' (app_metadata is not user-editable).
BEGIN;

-- =============================================================================
-- GROUP A — Enable RLS on 3 tables
-- =============================================================================

-- A1. engagement_posting_policy — firm-scoped read for firm members, service role manages
ALTER TABLE public.engagement_posting_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "engagement_posting_policy_service_role_all"
  ON public.engagement_posting_policy
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "engagement_posting_policy_firm_members_select"
  ON public.engagement_posting_policy
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.engagements e
      JOIN public.firm_memberships fm
        ON fm.firm_id = e.firm_id
      WHERE e.id = engagement_posting_policy.engagement_id
        AND fm.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.engagement_posting_policy IS
  'Per-engagement posting policy. RLS: service_role full access; authenticated firm members read via engagements.firm_id → firm_memberships.';

-- A2. ap_intake_ledger_event_types — global reference catalog, permissive read
ALTER TABLE public.ap_intake_ledger_event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ap_intake_ledger_event_types_service_role_all"
  ON public.ap_intake_ledger_event_types
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "ap_intake_ledger_event_types_authenticated_select"
  ON public.ap_intake_ledger_event_types
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.ap_intake_ledger_event_types IS
  'Global reference catalog of AP intake ledger event types. Tenant-agnostic. RLS: service_role writes; all authenticated users read.';

-- A3. ap_intake_assertion_registry — global reference catalog, permissive read
ALTER TABLE public.ap_intake_assertion_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ap_intake_assertion_registry_service_role_all"
  ON public.ap_intake_assertion_registry
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "ap_intake_assertion_registry_authenticated_select"
  ON public.ap_intake_assertion_registry
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.ap_intake_assertion_registry IS
  'Global reference catalog of AP intake assertion definitions (runtime mirror). Tenant-agnostic. RLS: service_role writes; all authenticated users read.';

-- =============================================================================
-- GROUP B — Convert SECURITY DEFINER views to security_invoker
-- =============================================================================

ALTER VIEW public.company_billing_compat SET (security_invoker = true);
ALTER VIEW public.qbo_connections_unified SET (security_invoker = true);

-- =============================================================================
-- GROUP C — Remove user-editable JWT metadata privilege-escalation half from super-admin policies
--
-- Codebase super-admin convention (app/signin/page.tsx:33):
--   data.user?.app_metadata?.role === "super_admin"
--
-- The OR user-editable JWT metadata half is user-editable via Supabase auth → privilege escalation.
-- We drop and recreate with app_metadata-only.
-- =============================================================================

-- C1. support_tickets
DROP POLICY IF EXISTS "Super admins can manage support tickets" ON public.support_tickets;
CREATE POLICY "Super admins can manage support tickets"
  ON public.support_tickets
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  );

-- C2. free_review_leads
DROP POLICY IF EXISTS "Super admins can manage free review leads" ON public.free_review_leads;
CREATE POLICY "Super admins can manage free review leads"
  ON public.free_review_leads
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  );

-- C3. mfg_waitlist
DROP POLICY IF EXISTS "Super admins can manage mfg waitlist" ON public.mfg_waitlist;
CREATE POLICY "Super admins can manage mfg waitlist"
  ON public.mfg_waitlist
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  );

COMMIT;
