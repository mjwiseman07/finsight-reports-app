-- Phase Q8c: Revoke EXECUTE on SECURITY DEFINER RPCs from anon/authenticated/PUBLIC
--
-- Root cause: Supabase creates functions with default EXECUTE grants to
-- anon, authenticated, PUBLIC, postgres, service_role. Safe for
-- SECURITY INVOKER (subject to RLS) but a footgun for SECURITY DEFINER
-- (bypasses RLS by design). Advisor rules:
--   - anon_security_definer_function_executable (WARN)
--   - authenticated_security_definer_function_executable (WARN)
--
-- Fix: REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated on both RPCs.
-- Postgres owner and service_role keep EXECUTE. All application callers use
-- service_role via getSupabaseAdmin() / createServiceClient() — verified via
-- repo grep at commit 29b44f5.
--
-- Callers (verified server-side only):
--   - increment_share_token_access → lib/close-packet/share-tokens.js:62 (getSupabaseAdmin)
--   - publish_ledger_event → lib/events/publisher.ts:204 (createServiceClient)
--
-- Rollback:
--   GRANT EXECUTE ON FUNCTION public.increment_share_token_access(uuid) TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.publish_ledger_event(text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text) TO anon, authenticated;

-- Revoke on increment_share_token_access
REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM authenticated;

-- Revoke on publish_ledger_event
REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) FROM anon;
REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) FROM authenticated;

-- Assertion: no anon or authenticated EXECUTE grants remain on either function
DO $$
DECLARE
  bad_count int;
  bad_detail text;
BEGIN
  SELECT count(*), string_agg(format('%s -> %s', p.proname, r.rolname), ', ')
  INTO bad_count, bad_detail
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace,
    aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  JOIN pg_roles r ON r.oid = a.grantee
  WHERE n.nspname = 'public'
    AND p.proname IN ('increment_share_token_access', 'publish_ledger_event')
    AND r.rolname IN ('anon', 'authenticated')
    AND a.privilege_type = 'EXECUTE';

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'q8c: % anon/authenticated EXECUTE grants remain: %', bad_count, bad_detail;
  END IF;
END $$;

-- Test helper view: exposes function ACLs for regression tests, service-role only
CREATE OR REPLACE VIEW public.pg_proc_acl_view
WITH (security_invoker = true)
AS
SELECT
  p.proname AS name,
  pg_get_function_identity_arguments(p.oid) AS args,
  r.rolname AS grantee,
  a.privilege_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace,
  aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
JOIN pg_roles r ON r.oid = a.grantee
WHERE n.nspname = 'public';

REVOKE ALL ON public.pg_proc_acl_view FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pg_proc_acl_view TO service_role, postgres;
