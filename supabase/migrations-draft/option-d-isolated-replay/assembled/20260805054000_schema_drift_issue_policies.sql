-- MAJOR #2 — Schema drift issue read policy for org-wide (null-tenant) rows.
-- The existing lifecycle_issues_partition_read policy scopes reads to
-- company_users / firm_memberships. Schema-drift issues are org-wide with
-- both company_id AND firm_id NULL — so they'd be invisible to every
-- authenticated user without this override.
--
-- Super-admin bypass mirrors lib/super-admin.js:isAllowedSuperAdminEmail and
-- lib/super-admin-security.js role check: JWT app_metadata.role or
-- user_metadata.role must equal 'super_admin'. Email allowlist is enforced
-- separately at the app layer; this policy only requires the role claim
-- because Supabase RLS cannot cheaply consult a table of allowlisted emails.

CREATE POLICY lifecycle_issues_org_wide_super_admin_read
  ON public.lifecycle_issues
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NULL
    AND firm_id IS NULL
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    )
  );

-- Service role bypasses RLS entirely (existing Supabase behavior) so the
-- cron detector inserts freely. No INSERT/UPDATE/DELETE policies are added
-- for authenticated role — schema-drift issue resolution is a super-admin
-- action that will go through a dedicated server route in a follow-up phase.

COMMENT ON POLICY lifecycle_issues_org_wide_super_admin_read
  ON public.lifecycle_issues IS
  'MAJOR #2: super-admin can read org-wide drift issues where both tenant FKs are null. Complements lifecycle_issues_partition_read.';

-- Service-role-only helper for the static repo scanner. PostgREST cannot query
-- information_schema.* directly (Invalid schema), so the scanner calls this RPC.
CREATE OR REPLACE FUNCTION public.sp_list_public_columns()
RETURNS TABLE(table_name text, column_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.table_name::text, c.column_name::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
  ORDER BY 1, 2;
$$;

REVOKE ALL ON FUNCTION public.sp_list_public_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_list_public_columns() TO service_role;

COMMENT ON FUNCTION public.sp_list_public_columns() IS
  'MAJOR #2: service_role-only listing of public.* columns for schema drift repo scanner.';
