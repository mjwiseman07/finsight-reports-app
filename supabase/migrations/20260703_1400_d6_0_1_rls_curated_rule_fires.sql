-- Phase D6.0.1: Enable RLS on curated_rule_fires
-- Resolves security advisor lint 0013_rls_disabled_in_public.
--
-- Mirrors the EXACT policy predicate used by curated_rules_registry (D0),
-- dumped from pg_policy on the live DB 2026-07-03:
--   polname:         "Super admins manage curated rules"
--   using_expr:      ((auth.jwt() ->> 'role') = 'super_admin')
--   with_check_expr: (null)
--   roles:           public   (polroles = {-})
--   cmd:             ALL, permissive
--
-- The JWT top-level 'role' claim is used (NOT auth.user_metadata), so lint 0015
-- is not triggered. Service role bypasses RLS, so the D6.1 runner is unaffected.
begin;

-- 1. Enable RLS
alter table public.curated_rule_fires enable row level security;

-- 2. Super-admin management policy — identical shape/predicate to
--    curated_rules_registry: permissive, FOR ALL, TO public, USING the JWT role
--    claim, no WITH CHECK (USING is reused as the check for writes).
drop policy if exists "Super admins manage curated_rule_fires" on public.curated_rule_fires;
create policy "Super admins manage curated_rule_fires"
  on public.curated_rule_fires
  as permissive
  for all
  to public
  using ((auth.jwt() ->> 'role') = 'super_admin');

commit;
