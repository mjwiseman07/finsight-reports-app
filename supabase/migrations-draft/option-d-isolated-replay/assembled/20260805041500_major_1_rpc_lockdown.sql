-- =============================================================================
-- Phase MAJOR #1 — Full-Sweep SECURITY DEFINER RPC + search_path Lockdown
--
-- Purpose: Drive Supabase Security Advisor findings for these 11 functions to
-- zero, without breaking RLS policies, triggers, or the RFC 3161 anchor cron.
--
-- Sources:
--   - PostgreSQL 18 CREATE FUNCTION (SECURITY DEFINER, search_path safety):
--     https://www.postgresql.org/docs/current/sql-createfunction.html
--   - Supabase Database Functions (SECURITY DEFINER + search_path = ''):
--     https://supabase.com/docs/guides/database/functions
--   - Supabase splinter rule 0011 (function_search_path_mutable):
--     https://supabase.github.io/splinter/0011_function_search_path_mutable/
--   - supabase/agent-skills (first-party pattern: revoke EXECUTE from every
--     role on RLS helpers, policy still works):
--     https://github.com/supabase/agent-skills/blob/main/skills/supabase-postgres-best-practices/references/security-rls-performance.md
--   - DBA StackExchange (trigger EXECUTE checked only at CREATE TRIGGER time):
--     https://dba.stackexchange.com/questions/46833/what-are-the-privileges-required-to-execute-a-trigger-function-in-postgresql
--
-- Ground truth verified via pg_proc + information_schema.triggers on
-- jzmdgwwiestcmmeuhhkr (Aug 5 2026 12:00 EDT).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Group A — Trigger-only function on auth.users (handle_new_auth_user)
-- Bound to trigger on_auth_user_created AFTER INSERT on auth.users.
-- Never called via /rest/v1/rpc/... — safe to revoke from all app roles.
-- search_path already pinned to 'public, pg_temp' — leaving as-is (Supabase's
-- User Management guide uses this exact form).
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user()
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Group B — RLS helper functions (5 functions, all SECURITY DEFINER SQL)
-- Called from within RLS policy expressions (USING/CHECK clauses).
-- Revoking EXECUTE from anon/authenticated does NOT break the policies
-- (confirmed by supabase/agent-skills first-party example, which revokes
-- from every role including service_role — policy still works).
-- search_path already pinned to 'public' — leaving as-is (function bodies
-- reference public.company_users / public.firm_users unqualified, so tightening
-- to '' would require re-defining the bodies — deferred).
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.has_active_company_role(uuid, text[])
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_active_firm_role(uuid, text[])
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_active_company_member(uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_active_firm_member(uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_company_admin(uuid)
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Group C — Trigger-only function on public.pilot_lifecycle_events
-- (pilot_lifecycle_events_before_insert)
-- Bound to trigger pilot_lifecycle_events_before_insert_trg BEFORE INSERT.
-- Never called via /rest/v1/rpc/... — safe to revoke from all app roles.
-- search_path already pinned to 'public, extensions, pg_temp' — leaving as-is.
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_before_insert()
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Group D — Ops function used by app for read-only chain verification
-- (pilot_lifecycle_events_verify_chain)
-- Prod grants already at postgres + service_role only (verified via aclexplode
-- on Aug 5 12:00 EDT — anon/authenticated already absent). No-op REVOKE below
-- kept for idempotency and documentation; safe to run repeatedly.
-- search_path already pinned to 'public, extensions, pg_temp' — leaving as-is.
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_verify_chain(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Group E — Mutable-search_path functions (2 functions)
-- Both are IMMUTABLE / plpgsql helpers referenced only from within triggers.
-- Bodies were read via pg_get_functiondef and contain ONLY pg_catalog
-- built-ins (jsonb_build_object, to_char, to_jsonb, unnest, RAISE EXCEPTION) —
-- no references to public.* objects. Empty search_path is safe.
-- Also revoke EXECUTE — no app code calls either directly.
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.pilot_lifecycle_events_canonical_payload(
  text, timestamp with time zone, text, uuid, text, text, text, uuid, uuid,
  text, uuid, text, text[], jsonb, text, text, jsonb
) SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_canonical_payload(
  text, timestamp with time zone, text, uuid, text, text, text, uuid, uuid,
  text, uuid, text, text[], jsonb, text, text, jsonb
) FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.pilot_lifecycle_events_reject_mutations()
  SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_reject_mutations()
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Group F — Cron/API-invoked function (sp_write_anchor_batch)
-- Called by block9_shipped/anchor-batcher.ts via getSupabaseAdmin() (service
-- role). Must remain callable by service_role; must not be callable by
-- anon/authenticated. search_path already pinned to 'public, pg_temp'.
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(
  bigint, bigint, integer, text, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.sp_write_anchor_batch(
  bigint, bigint, integer, text, jsonb, jsonb
) TO service_role;

COMMIT;

-- =============================================================================
-- Post-migration verification queries (run in the Supabase SQL editor after
-- this migration is applied; expect the results described in each header).
--
-- These are NOT part of the migration transaction — they're for the smoke.
-- =============================================================================

-- Verification 1 — Expect zero rows: no public function should have a
-- NULL/missing search_path setting after this migration.
--
-- (Splinter rule 0011 equivalent — this is the exact query shape splinter
-- itself uses. Source:
-- https://supabase.github.io/splinter/0011_function_search_path_mutable/)
--
-- select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid),
--        p.prosecdef, p.proconfig
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in (
--     'pilot_lifecycle_events_canonical_payload',
--     'pilot_lifecycle_events_reject_mutations'
--   )
--   and not exists (
--     select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) as cfg
--     where cfg like 'search_path=%'
--   );

-- Verification 2 — Expect NO rows for anon/authenticated on any of the
-- 11 functions, EXCEPT the postgres owner grant. service_role should appear
-- for sp_write_anchor_batch and pilot_lifecycle_events_verify_chain only.
--
-- select p.proname, pg_get_function_identity_arguments(p.oid) AS args,
--        r.rolname AS grantee, a.privilege_type
-- from pg_proc p join pg_namespace n on n.oid=p.pronamespace,
--      lateral aclexplode(p.proacl) a
--      join pg_roles r on r.oid = a.grantee
-- where n.nspname='public'
--   and p.proname in (
--     'handle_new_auth_user','has_active_company_role','has_active_firm_role',
--     'is_active_company_member','is_active_firm_member','is_company_admin',
--     'pilot_lifecycle_events_before_insert','pilot_lifecycle_events_verify_chain',
--     'pilot_lifecycle_events_canonical_payload','pilot_lifecycle_events_reject_mutations',
--     'sp_write_anchor_batch'
--   )
-- order by p.proname, r.rolname;
