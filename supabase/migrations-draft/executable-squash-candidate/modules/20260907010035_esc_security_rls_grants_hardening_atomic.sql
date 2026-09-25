-- =============================================================================
-- EXECUTABLE SQUASH CANDIDATE — DRAFT / NON-DEPLOYABLE
-- Proposed version: 20260907010035
-- Proposed name: esc_security_rls_grants_hardening_atomic
-- Module: security_rls_grants_triggers_functions_atomic
-- Provenance: Option D security-named files (14) + ESC boundary patch; single outer txn
-- NOT in active supabase/migrations/. Production mutation NOT authorized.
-- UTF-8 LF. statements[] must remain non-empty when eventually recorded.
-- =============================================================================
BEGIN;
-- OPTION 2 security slice: RLS policies, Q8 lockdowns, ESC boundary patch
-- Nested source txn markers stripped; one outer transaction.

-- >>> begin 20260703_1400_d6_0_1_rls_curated_rule_fires.sql
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
-- [ESC] stripped source txn marker: begin;


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

-- [ESC] stripped source txn marker: commit;

-- <<< end 20260703_1400_d6_0_1_rls_curated_rule_fires.sql

-- >>> begin 20260706180000_d6_4d_reviewer_ui_rls_and_visibility.sql
-- =============================================================================
-- D6.4d — Reviewer UI RLS + Client Visibility + Review Packet Exports
-- =============================================================================
-- ADDITIVE ONLY. Reconciled against live D6.4c-3 constraint unions.
-- DEVIATION: je_backup_packets + je-backup bucket already exist (D6.4a) — this
-- migration adds RLS policies to je_backup_packets only; does not recreate the table.
-- =============================================================================
-- [ESC] stripped source txn marker: begin;


-- ------------------------------------------------------------
-- 1. firm_client_users — join table for client-user identity
-- ------------------------------------------------------------
create table if not exists public.firm_client_users (
  id              uuid primary key default gen_random_uuid(),
  firm_client_id  uuid not null references public.firm_clients(id) on delete cascade,
  user_id         uuid not null,
  role            text not null default 'client_owner'
                    check (role in ('client_owner','client_reviewer','client_readonly')),
  status          text not null default 'active'
                    check (status in ('active','revoked')),
  invited_by      uuid null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (firm_client_id, user_id)
);

create index if not exists firm_client_users_user_id_idx
  on public.firm_client_users(user_id);
create index if not exists firm_client_users_firm_client_id_idx
  on public.firm_client_users(firm_client_id) where status = 'active';

alter table public.firm_client_users enable row level security;

drop policy if exists "service_role_all_firm_client_users" on public.firm_client_users;
create policy "service_role_all_firm_client_users"
  on public.firm_client_users for all to service_role
  using (true) with check (true);

drop policy if exists "self_read_firm_client_users" on public.firm_client_users;
create policy "self_read_firm_client_users"
  on public.firm_client_users for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "firm_members_read_firm_client_users" on public.firm_client_users;
create policy "firm_members_read_firm_client_users"
  on public.firm_client_users for select to authenticated
  using (
    firm_client_id in (
      select fc.id from public.firm_clients fc
      where fc.firm_id in (
        select fm.firm_id from public.firm_memberships fm where fm.user_id = auth.uid()
      )
    )
  );

-- ------------------------------------------------------------
-- 2. engagement_review_visibility
-- ------------------------------------------------------------
create table if not exists public.engagement_review_visibility (
  engagement_id             uuid primary key
                             references public.engagements(id) on delete cascade,
  client_can_view_queue     boolean not null default false,
  client_can_view_evidence  boolean not null default false,
  client_can_view_je_draft  boolean not null default false,
  updated_by                uuid null,
  updated_at                timestamptz not null default now(),
  created_at                timestamptz not null default now()
);

comment on table public.engagement_review_visibility is
  'D6.4d: firm-controlled toggles for whether client users can view review items on an engagement. Default: everything off.';

alter table public.engagement_review_visibility enable row level security;

drop policy if exists "service_role_all_engagement_review_visibility" on public.engagement_review_visibility;
create policy "service_role_all_engagement_review_visibility"
  on public.engagement_review_visibility for all to service_role
  using (true) with check (true);

drop policy if exists "firm_members_manage_engagement_review_visibility" on public.engagement_review_visibility;
create policy "firm_members_manage_engagement_review_visibility"
  on public.engagement_review_visibility for all to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm
        where fm.user_id = auth.uid()
          and fm.role in ('firm_admin','controller','fractional_cfo')
      )
    )
  )
  with check (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm
        where fm.user_id = auth.uid()
          and fm.role in ('firm_admin','controller','fractional_cfo')
      )
    )
  );

drop policy if exists "client_users_read_engagement_review_visibility" on public.engagement_review_visibility;
create policy "client_users_read_engagement_review_visibility"
  on public.engagement_review_visibility for select to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      join public.firm_clients fc on fc.firm_id = e.firm_id
      join public.firm_client_users fcu on fcu.firm_client_id = fc.id
      where fcu.user_id = auth.uid() and fcu.status = 'active'
    )
  );

-- ------------------------------------------------------------
-- 3. pre_close_review_items — reviewer/client RLS policies
-- ------------------------------------------------------------
drop policy if exists "service_role_all_pre_close_review_items" on public.pre_close_review_items;
create policy "service_role_all_pre_close_review_items"
  on public.pre_close_review_items for all to service_role
  using (true) with check (true);

drop policy if exists "firm_reviewers_read_pre_close_review_items" on public.pre_close_review_items;
create policy "firm_reviewers_read_pre_close_review_items"
  on public.pre_close_review_items for select to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm where fm.user_id = auth.uid()
      )
    )
  );

drop policy if exists "firm_writers_update_pre_close_review_items" on public.pre_close_review_items;
create policy "firm_writers_update_pre_close_review_items"
  on public.pre_close_review_items for update to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm
        where fm.user_id = auth.uid()
          and fm.role in ('firm_admin','controller','fractional_cfo')
      )
    )
  )
  with check (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm
        where fm.user_id = auth.uid()
          and fm.role in ('firm_admin','controller','fractional_cfo')
      )
    )
  );

drop policy if exists "client_users_read_pre_close_review_items" on public.pre_close_review_items;
create policy "client_users_read_pre_close_review_items"
  on public.pre_close_review_items for select to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      join public.firm_clients fc on fc.firm_id = e.firm_id
      join public.firm_client_users fcu on fcu.firm_client_id = fc.id
      join public.engagement_review_visibility erv on erv.engagement_id = e.id
      where fcu.user_id = auth.uid()
        and fcu.status = 'active'
        and erv.client_can_view_queue = true
    )
  );

-- ------------------------------------------------------------
-- 4. je_backup_packets — RLS only (table created in D6.4a)
-- ------------------------------------------------------------
alter table public.je_backup_packets enable row level security;

drop policy if exists "service_role_all_je_backup_packets" on public.je_backup_packets;
create policy "service_role_all_je_backup_packets"
  on public.je_backup_packets for all to service_role
  using (true) with check (true);

drop policy if exists "firm_members_read_je_backup_packets" on public.je_backup_packets;
create policy "firm_members_read_je_backup_packets"
  on public.je_backup_packets for select to authenticated
  using (
    firm_client_id in (
      select fc.id from public.firm_clients fc
      where fc.firm_id in (
        select fm.firm_id from public.firm_memberships fm where fm.user_id = auth.uid()
      )
    )
  );

-- ------------------------------------------------------------
-- 5. review_item_packet_exports
-- ------------------------------------------------------------
create table if not exists public.review_item_packet_exports (
  export_id           uuid primary key default gen_random_uuid(),
  review_item_id      uuid not null references public.pre_close_review_items(id) on delete cascade,
  firm_client_id      uuid not null references public.firm_clients(id) on delete cascade,
  engagement_id       uuid not null references public.engagements(id) on delete cascade,
  exported_by_user_id uuid not null,
  storage_path        text null,
  sha256              text not null,
  byte_size           bigint not null,
  exported_at         timestamptz not null default now()
);

create index if not exists review_item_packet_exports_review_item_idx
  on public.review_item_packet_exports(review_item_id, exported_at desc);
create index if not exists review_item_packet_exports_user_idx
  on public.review_item_packet_exports(exported_by_user_id, exported_at desc);

alter table public.review_item_packet_exports enable row level security;

drop policy if exists "service_role_all_review_item_packet_exports" on public.review_item_packet_exports;
create policy "service_role_all_review_item_packet_exports"
  on public.review_item_packet_exports for all to service_role
  using (true) with check (true);

drop policy if exists "firm_members_read_review_item_packet_exports" on public.review_item_packet_exports;
create policy "firm_members_read_review_item_packet_exports"
  on public.review_item_packet_exports for select to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm where fm.user_id = auth.uid()
      )
    )
  );

-- ------------------------------------------------------------
-- 6. Widen ai_action_log + ledger_events category checks
-- ------------------------------------------------------------
alter table public.ai_action_log
  drop constraint if exists ai_action_log_action_category_check;
alter table public.ai_action_log
  add constraint ai_action_log_action_category_check check (
    action_category in (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change'
    )
  );

alter table public.ledger_events
  drop constraint if exists ledger_events_event_category_check;
alter table public.ledger_events
  add constraint ledger_events_event_category_check check (
    event_category in (
      'intake','ledger','cash_app','ar','ap','recon','close','assertion',
      'rule','directive','ai_action','system','entitlement','posting',
      'reviewer_ui'
    )
  );

-- ------------------------------------------------------------
-- 7. Storage bucket: review-item-packets (je-backup exists from D6.4a)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-item-packets',
  'review-item-packets',
  false,
  52428800,
  array['application/pdf']::text[]
)
on conflict (id) do nothing;

-- [ESC] stripped source txn marker: commit;

-- <<< end 20260706180000_d6_4d_reviewer_ui_rls_and_visibility.sql

-- >>> begin 20260715190001_mfa_webauthn_rls_initplan_and_deny_policy.sql
-- Gap 1b.1 micro-fix: replace auth.uid() with (SELECT auth.uid()) on 4 policies
-- plus add explicit deny policy on mfa_webauthn_challenges to silence rls_enabled_no_policy INFO lint.
-- Service role bypasses RLS entirely, so the deny policy has no functional effect on server-managed challenges.

-- ================================================
-- 1. user_webauthn_credentials policies
-- ================================================
DROP POLICY IF EXISTS "users_select_own_webauthn" ON public.user_webauthn_credentials;
CREATE POLICY "users_select_own_webauthn"
  ON public.user_webauthn_credentials FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_update_own_webauthn_friendly_name" ON public.user_webauthn_credentials;
CREATE POLICY "users_update_own_webauthn_friendly_name"
  ON public.user_webauthn_credentials FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ================================================
-- 2. mfa_trusted_devices policies
-- ================================================
DROP POLICY IF EXISTS "users_select_own_trusted_devices" ON public.mfa_trusted_devices;
CREATE POLICY "users_select_own_trusted_devices"
  ON public.mfa_trusted_devices FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_revoke_own_trusted_devices" ON public.mfa_trusted_devices;
CREATE POLICY "users_revoke_own_trusted_devices"
  ON public.mfa_trusted_devices FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND revoked_at IS NOT NULL);

-- ================================================
-- 3. mfa_webauthn_challenges: explicit deny-all for authenticated + anon
-- Service role bypasses RLS, so server-managed challenge lifecycle is unaffected.
-- ================================================
DROP POLICY IF EXISTS "deny_all_client_access_challenges" ON public.mfa_webauthn_challenges;
CREATE POLICY "deny_all_client_access_challenges"
  ON public.mfa_webauthn_challenges
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
-- <<< end 20260715190001_mfa_webauthn_rls_initplan_and_deny_policy.sql

-- >>> begin 20260717070000_d65_p2_block6a_harden_next_document_number_search_path.sql
-- Phase D6.5 Part 2 — Block 6a hardening
-- Fix Supabase security advisor WARN: function_search_path_mutable on next_document_number
-- Applied to live Supabase in Block 6a audit pass; this file backfills the repo so
-- migration history matches DB state.

-- [ESC] stripped source txn marker: BEGIN;


ALTER FUNCTION public.next_document_number(UUID, TEXT) SET search_path = public, pg_temp;

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260717070000_d65_p2_block6a_harden_next_document_number_search_path.sql

-- >>> begin 20260718180000_q8a_qbo_view_security_invoker.sql
-- Phase Q8a: Restore security_invoker on qbo_connections_unified view
-- 
-- Root cause: 20260707214500_d65_p2_block7a2_prepilot_security.sql:93
-- set security_invoker=true in July 2026, but two later CREATE OR REPLACE VIEW
-- migrations (20260708_01_d1_qbo_write_readiness.sql and
-- 20260717130000_tcp1_w3_erp_connections_disconnected_at.sql) recreated the
-- view without preserving the option. Postgres silently reset reloptions
-- to NULL, causing the Supabase advisor to flag security_definer_view (ERROR).
--
-- All callers (lib/close-packet/renderer.js, lib/erp/quickbooks/*, etc.) use
-- getSupabaseAdmin() which bypasses RLS regardless, so no behavior change for
-- the app. Anon/authenticated access continues to be governed by RLS on the
-- underlying accounting_connections table.
--
-- Rollback: ALTER VIEW public.qbo_connections_unified RESET (security_invoker);

DO $$
BEGIN
  IF to_regclass('public.qbo_connections_unified') IS NOT NULL THEN
    ALTER VIEW public.qbo_connections_unified SET (security_invoker = true);
  END IF;
END $$;

-- Assertion: fail loud if option not present
DO $$
DECLARE
  v_opts text[];
BEGIN
  SELECT reloptions INTO v_opts
  FROM pg_class
  WHERE relname = 'qbo_connections_unified'
    AND relnamespace = 'public'::regnamespace;

  IF v_opts IS NULL OR NOT ('security_invoker=true' = ANY(v_opts)) THEN
    RAISE EXCEPTION 'q8a: qbo_connections_unified missing security_invoker=true after migration (got: %)', v_opts;
  END IF;
END $$;

-- Test helper: exposes pg_class.reloptions via a read-only view so vitest
-- integration tests can assert view options without needing a bespoke RPC.
-- Read-only, service-role-only in practice (RLS not applicable to system catalogs).
CREATE OR REPLACE VIEW public.pg_class_reloptions_view
WITH (security_invoker = true)
AS
SELECT
  c.relname,
  c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public';

REVOKE ALL ON public.pg_class_reloptions_view FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pg_class_reloptions_view TO service_role, postgres;
-- <<< end 20260718180000_q8a_qbo_view_security_invoker.sql

-- >>> begin 20260718190000_q8b_function_search_path_lockdown.sql
-- Phase Q8b: Lock down search_path on 29 public functions flagged by advisor
--
-- Root cause: Functions without an explicit search_path use the caller's
-- session search_path. This is a search_path hijacking footgun (especially
-- for SECURITY DEFINER functions) and violates Supabase advisor rule
-- function_search_path_mutable.
--
-- Fix: ALTER FUNCTION ... SET search_path = public, pg_temp on each of the
-- 29 flagged functions. Function bodies are untouched.
--
-- All 29 functions were verified live via SELECT from pg_proc:
--   - 28 SECURITY INVOKER, 1 SECURITY DEFINER (publish_ledger_event)
--   - All plpgsql
--   - All proconfig = null (no existing SET clauses to preserve)
--
-- Rollback: ALTER FUNCTION public.<name>(<args>) RESET search_path;

-- Helper: apply search_path to a function if it exists, no-op if not.
DO $$
DECLARE
  fn record;
  fns text[] := ARRAY[
    'public._intake_touch_updated_at()',
    'public.close_gap_review_items_touch_updated_at()',
    'public.curated_rule_fires_immutable()',
    'public.engagement_addons_set_updated_at()',
    'public.engagement_posting_policy_preset_consistency()',
    'public.entitlement_check_audit_no_mutation()',
    'public.guard_recurring_fire_immutability()',
    'public.ledger_events_notify()',
    'public.ledger_events_prevent_mutation()',
    'public.pre_close_review_items_immutable()',
    'public.pre_close_review_items_je_draft_check()',
    'public.prevent_company_memory_append_only_mutation()',
    'public.prevent_company_memory_record_unsafe_mutation()',
    'public.prevent_company_memory_version_unsafe_mutation()',
    'public.prevent_je_audit_update()',
    'public.prevent_memory_payload_update()',
    'public.prevent_proposal_decision_mutation()',
    'public.prevent_si_snapshot_child_mutation_when_parent_locked()',
    'public.prevent_si_snapshot_metadata_mutation()',
    'public.public_pilot_slot_count(text)',
    'public.publish_ledger_event(text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text)',
    'public.set_pilot_slots_updated_at()',
    'public.set_updated_at()',
    'public.tg_set_updated_at()',
    'public.touch_je_post_attempts()',
    'public.touch_recurring_fires_updated_at()',
    'public.touch_recurring_templates_updated_at()',
    'public.touch_uncategorized_proposals_updated_at()',
    'public.validate_assertions_array(text[])'
  ];
  fn_sig text;
BEGIN
  FOREACH fn_sig IN ARRAY fns LOOP
    IF to_regprocedure(fn_sig) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn_sig);
    ELSE
      RAISE NOTICE 'q8b: function % not found, skipping', fn_sig;
    END IF;
  END LOOP;
END $$;

-- Assertion: every target function that exists must now have search_path in proconfig
DO $$
DECLARE
  missing_count int;
  missing_names text;
BEGIN
  SELECT
    count(*),
    string_agg(p.proname, ', ' ORDER BY p.proname)
  INTO missing_count, missing_names
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      '_intake_touch_updated_at','close_gap_review_items_touch_updated_at',
      'curated_rule_fires_immutable','engagement_addons_set_updated_at',
      'engagement_posting_policy_preset_consistency','entitlement_check_audit_no_mutation',
      'guard_recurring_fire_immutability','ledger_events_notify',
      'ledger_events_prevent_mutation','pre_close_review_items_immutable',
      'pre_close_review_items_je_draft_check','prevent_company_memory_append_only_mutation',
      'prevent_company_memory_record_unsafe_mutation','prevent_company_memory_version_unsafe_mutation',
      'prevent_je_audit_update','prevent_memory_payload_update',
      'prevent_proposal_decision_mutation','prevent_si_snapshot_child_mutation_when_parent_locked',
      'prevent_si_snapshot_metadata_mutation','public_pilot_slot_count',
      'publish_ledger_event','set_pilot_slots_updated_at',
      'set_updated_at','tg_set_updated_at',
      'touch_je_post_attempts','touch_recurring_fires_updated_at',
      'touch_recurring_templates_updated_at','touch_uncategorized_proposals_updated_at',
      'validate_assertions_array'
    )
    AND (
      p.proconfig IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) AS c
        WHERE c LIKE 'search_path=%'
      )
    );

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'q8b: % functions still missing search_path: %', missing_count, missing_names;
  END IF;
END $$;

-- Test helper: exposes pg_proc.proconfig for regression tests, service-role only.
CREATE OR REPLACE VIEW public.pg_proc_config_view
WITH (security_invoker = true)
AS
SELECT
  p.proname AS name,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public';

REVOKE ALL ON public.pg_proc_config_view FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pg_proc_config_view TO service_role, postgres;
-- <<< end 20260718190000_q8b_function_search_path_lockdown.sql

-- >>> begin 20260718200000_q8c_security_definer_rpc_revoke.sql
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
--   HISTORICAL_EXECUTE_GRANT_REMOVED ON FUNCTION public.increment_share_token_access(uuid) TO anon, authenticated;
--   HISTORICAL_EXECUTE_GRANT_REMOVED ON FUNCTION public.publish_ledger_event(text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text) TO anon, authenticated;

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
-- <<< end 20260718200000_q8c_security_definer_rpc_revoke.sql

-- >>> begin 20260718210000_q8d_vector_schema_move.sql
-- Phase Q8d D1: Move vector extension from public → extensions schema
--
-- Root cause: Extensions in `public` are a footgun. They add many
-- functions/operators/types to a schema on every role's default search_path,
-- creating shadowing risk and privilege bleed. Supabase's standard is a
-- dedicated `extensions` schema (already present, already on default
-- search_path for postgres/authenticator/service_role).
--
-- Advisor rule: extension_in_public (WARN) on vector 0.8.0.
--
-- Live-verified state at authoring:
--   - Extension: vector 0.8.0 in public
--   - `extensions` schema exists (no CREATE SCHEMA needed)
--   - 1 vector column: public.vector_index.embedding VECTOR(1536)
--   - 0 rows in vector_index
--   - 0 ivfflat/hnsw indexes
--
-- Type OIDs are stable across ALTER EXTENSION SET SCHEMA, so
-- vector_index.embedding continues to work without table rewrite.
--
-- Rollback: ALTER EXTENSION vector SET SCHEMA public;

ALTER EXTENSION vector SET SCHEMA extensions;

-- Assertion: extension is now in the extensions schema
DO $$
DECLARE
  ext_schema text;
BEGIN
  SELECT n.nspname INTO ext_schema
  FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'vector';
  IF ext_schema <> 'extensions' THEN
    RAISE EXCEPTION 'q8d D1: vector extension in schema % (expected extensions)', ext_schema;
  END IF;
END $$;

-- Sanity: dependent column still queryable post-move
DO $$
BEGIN
  PERFORM 1 FROM public.vector_index LIMIT 1;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'q8d D1: vector_index unreadable post-move: %', SQLERRM;
END $$;
-- <<< end 20260718210000_q8d_vector_schema_move.sql

-- >>> begin 20260718220000_q8e_rls_service_role_policies.sql
-- Q8e: Lock down 5 service-role-only tables.
-- All runtime access is via getSupabaseAdmin/createServiceClient which bypasses RLS.
-- 1. Revoke raw grants from anon+authenticated so no client-facing surface exists.
-- 2. Add explicit service_role_all_* policy for defense-in-depth and to satisfy
--    the rls_enabled_no_policy linter.

-- je_line_attachments
REVOKE ALL ON public.je_line_attachments FROM anon, authenticated;
DROP POLICY IF EXISTS "je_line_attachments_service_role_all" ON public.je_line_attachments;
CREATE POLICY "je_line_attachments_service_role_all"
  ON public.je_line_attachments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- je_line_evidence
REVOKE ALL ON public.je_line_evidence FROM anon, authenticated;
DROP POLICY IF EXISTS "je_line_evidence_service_role_all" ON public.je_line_evidence;
CREATE POLICY "je_line_evidence_service_role_all"
  ON public.je_line_evidence
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- je_post_attempts
REVOKE ALL ON public.je_post_attempts FROM anon, authenticated;
DROP POLICY IF EXISTS "je_post_attempts_service_role_all" ON public.je_post_attempts;
CREATE POLICY "je_post_attempts_service_role_all"
  ON public.je_post_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- je_posting_audit
REVOKE ALL ON public.je_posting_audit FROM anon, authenticated;
DROP POLICY IF EXISTS "je_posting_audit_service_role_all" ON public.je_posting_audit;
CREATE POLICY "je_posting_audit_service_role_all"
  ON public.je_posting_audit
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- stripe_webhook_events_legacy
REVOKE ALL ON public.stripe_webhook_events_legacy FROM anon, authenticated;
DROP POLICY IF EXISTS "stripe_webhook_events_legacy_service_role_all" ON public.stripe_webhook_events_legacy;
CREATE POLICY "stripe_webhook_events_legacy_service_role_all"
  ON public.stripe_webhook_events_legacy
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Post-migration assertion: every table has exactly one service_role_all policy.
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(t, ', ') INTO missing
  FROM (
    SELECT unnest(ARRAY[
      'je_line_attachments',
      'je_line_evidence',
      'je_post_attempts',
      'je_posting_audit',
      'stripe_webhook_events_legacy'
    ]) AS t
  ) tables
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = tables.t
      AND policyname = tables.t || '_service_role_all'
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'q8e: missing service_role_all policy on: %', missing;
  END IF;
END $$;

-- Post-migration assertion: no anon/authenticated grants linger on the 5 tables.
DO $$
DECLARE
  leaked text;
BEGIN
  SELECT string_agg(table_name || '/' || grantee || '/' || privilege_type, ', ') INTO leaked
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name IN (
      'je_line_attachments', 'je_line_evidence',
      'je_post_attempts', 'je_posting_audit',
      'stripe_webhook_events_legacy'
    )
    AND grantee IN ('anon', 'authenticated');
  IF leaked IS NOT NULL THEN
    RAISE EXCEPTION 'q8e: anon/authenticated still have grants on: %', leaked;
  END IF;
END $$;
-- <<< end 20260718220000_q8e_rls_service_role_policies.sql

-- >>> begin 20260720130000_ar_week3_block3_1_rpc_lockdown.sql
-- Week 3 Block 3.1 — Lock down increment_pbc_request_count RPC
-- ADDITIVE ONLY. Corrective patch for security lints 0028 and 0029.
--
-- Root cause: PostgreSQL default schema grants re-expose EXECUTE on new
-- functions to `anon` and `authenticated` via Supabase's authenticator role,
-- even after `REVOKE ALL ... FROM public`. Explicit per-role revoke required.

-- [ESC] stripped source txn marker: BEGIN;


REVOKE EXECUTE ON FUNCTION public.increment_pbc_request_count(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_pbc_request_count(uuid, integer) FROM authenticated;

-- Re-affirm service_role has EXECUTE (idempotent).
GRANT EXECUTE ON FUNCTION public.increment_pbc_request_count(uuid, integer) TO service_role;

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260720130000_ar_week3_block3_1_rpc_lockdown.sql

-- >>> begin 20260720140000_ar_week3_block3_3_rls_recursion_fix.sql
-- AR Week 3 Block 3.3 — fix infinite RLS recursion on company_users
-- ADDITIVE ONLY. Introduces SECURITY DEFINER helpers, rewrites recursive policy,
-- rewires audit_ready_* policies through the helpers.

-- [ESC] stripped source txn marker: BEGIN;


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

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260720140000_ar_week3_block3_3_rls_recursion_fix.sql

-- >>> begin 20260720160000_ar_tieout1_policy_and_kind.sql
-- PBC-TIEOUT-1: tolerance policy per engagement + tie_out_kind classifier column.
-- ADDITIVE ONLY. No drops, no reorders. Idempotent.
-- [ESC] stripped source txn marker: BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) audit_ready_tie_out_policies
-- One row per engagement. Set lazily when the customer initiates tie-out.
-- Aggressive default = tight $ and % tolerances. Customer can edit at any time.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_tie_out_policies (
  engagement_id            uuid PRIMARY KEY REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  -- Tolerance mode: aggressive default, customer-configurable
  policy_mode              text NOT NULL DEFAULT 'aggressive'
                           CHECK (policy_mode IN ('aggressive','standard','conservative','custom')),
  -- Auto-reconcile threshold: variances at or below these tolerances auto-clear.
  -- BOTH dollar and percent are evaluated; whichever is TIGHTER wins.
  -- Setting either to NULL means "unbounded" for that dimension.
  auto_reconcile_max_dollar  numeric(18,2) NOT NULL DEFAULT 5.00,
  auto_reconcile_max_percent numeric(6,4)  NOT NULL DEFAULT 0.0010,   -- 0.10%
  -- Kickout threshold: variances above these tolerances go to the kickout inbox.
  -- Between auto and kickout = "review" bucket.
  kickout_min_dollar         numeric(18,2) NOT NULL DEFAULT 250.00,
  kickout_min_percent        numeric(6,4)  NOT NULL DEFAULT 0.0500,   -- 5.00%
  -- Which comparison is authoritative: dollar-only, percent-only, or the tighter of both
  authoritative_comparison   text NOT NULL DEFAULT 'tighter_of_both'
                             CHECK (authoritative_comparison IN ('dollar_only','percent_only','tighter_of_both')),
  -- Provenance
  set_by_user_id           uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  set_at                   timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id       uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at               timestamptz NOT NULL DEFAULT now(),
  -- Guard rails
  CONSTRAINT tolerance_dollar_non_negative CHECK (
    auto_reconcile_max_dollar >= 0
    AND kickout_min_dollar >= 0
    AND kickout_min_dollar >= auto_reconcile_max_dollar
  ),
  CONSTRAINT tolerance_percent_bounded CHECK (
    auto_reconcile_max_percent >= 0 AND auto_reconcile_max_percent < 1
    AND kickout_min_percent >= 0 AND kickout_min_percent < 1
    AND kickout_min_percent >= auto_reconcile_max_percent
  )
);
CREATE INDEX IF NOT EXISTS idx_ar_tieout_policies_updated
  ON public.audit_ready_tie_out_policies(updated_at DESC);
ALTER TABLE public.audit_ready_tie_out_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_tieout_policies_service_role_all ON public.audit_ready_tie_out_policies;
CREATE POLICY ar_tieout_policies_service_role_all
  ON public.audit_ready_tie_out_policies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- Read: any user who can see the parent engagement can see its policy
DROP POLICY IF EXISTS ar_tieout_policies_engagement_read ON public.audit_ready_tie_out_policies;
CREATE POLICY ar_tieout_policies_engagement_read ON public.audit_ready_tie_out_policies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_tie_out_policies.engagement_id
        AND (
          -- company-scoped engagement
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          -- firm-scoped engagement
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );
-- ─────────────────────────────────────────────────────────────
-- 2) audit_ready_pbc_requests.tie_out_kind
-- Additive column. Nullable until classified.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS tie_out_kind text NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_ready_pbc_requests_tie_out_kind_check'
      AND conrelid = 'public.audit_ready_pbc_requests'::regclass
  ) THEN
    ALTER TABLE public.audit_ready_pbc_requests
      ADD CONSTRAINT audit_ready_pbc_requests_tie_out_kind_check
      CHECK (
        tie_out_kind IS NULL
        OR tie_out_kind IN (
          'ar_aging',
          'ap_aging',
          'inventory',
          'grni',
          'bank_recon',
          'fixed_assets',
          'cash_recon',
          'debt_schedule',
          'equity_rollforward',
          'revenue_cutoff',
          'expense_cutoff',
          'unclassified'
        )
      );
  END IF;
END$$;
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS tie_out_kind_confidence numeric(4,3) NULL;
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS tie_out_kind_classified_at timestamptz NULL;
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS tie_out_kind_classifier text NULL;
  -- 'deterministic' | 'bedrock_sonnet' | 'manual'
CREATE INDEX IF NOT EXISTS idx_ar_pbc_tie_out_kind
  ON public.audit_ready_pbc_requests(engagement_id, tie_out_kind);
-- ─────────────────────────────────────────────────────────────
-- 3) audit_ready_tie_out_summary (VIEW)
-- Read-only view aggregating tie-out state per PBC request for the summary page.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.audit_ready_tie_out_summary AS
SELECT
  r.id                     AS pbc_request_id,
  r.engagement_id,
  r.request_number,
  r.request_description,
  r.assertion_tags,
  r.tie_out_kind,
  r.tie_out_kind_confidence,
  r.tie_out_kind_classifier,
  r.tie_out_kind_classified_at,
  r.status                 AS pbc_status,
  CASE
    WHEN p.engagement_id IS NULL           THEN 'no_tolerance_policy'
    WHEN r.tie_out_kind IS NULL            THEN 'not_yet_classified'
    WHEN r.tie_out_kind = 'unclassified'   THEN 'requires_manual_review'
    ELSE 'classified'
  END                      AS tie_out_state,
  p.policy_mode,
  p.auto_reconcile_max_dollar,
  p.auto_reconcile_max_percent,
  p.kickout_min_dollar,
  p.kickout_min_percent,
  p.authoritative_comparison
FROM public.audit_ready_pbc_requests r
LEFT JOIN public.audit_ready_tie_out_policies p ON p.engagement_id = r.engagement_id;
COMMENT ON VIEW public.audit_ready_tie_out_summary IS
  'PBC-TIEOUT-1 read-only summary of tie-out state per PBC request. Read via RLS on parent tables.';
-- Views inherit RLS from their base tables when created with default security_invoker.
-- Explicitly ensure invoker semantics (matches Phase Q8a pattern).
ALTER VIEW public.audit_ready_tie_out_summary SET (security_invoker = true);

-- PBC-TIEOUT-1 adaptation: allow tie_out_kind_classify on audit_ready_llm_usage.operation
-- (paste classifier logs this op; week-3 CHECK did not include it).
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'audit_ready_llm_usage'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%operation%';
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.audit_ready_llm_usage DROP CONSTRAINT %I', conname);
  END IF;
END$$;
ALTER TABLE public.audit_ready_llm_usage
  ADD CONSTRAINT audit_ready_llm_usage_operation_check
  CHECK (operation IN (
    'pbc_parse','assertion_classify','pii_redaction_ner',
    'response_draft','evidence_bundle_summary','tieout_explain',
    'tie_out_kind_classify'
  ));

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260720160000_ar_tieout1_policy_and_kind.sql

-- >>> begin 20260804214151_pilot_lifecycle_events_hash_extensions_search_path.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260804214151
-- NAME: pilot_lifecycle_events_hash_extensions_search_path
-- DATABASE_MD5_UTF8: 7a5489dd8dd316cf26eb02a413339f71
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 4004
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_slot_company_id uuid;
  v_slot_firm_id uuid;
  v_prev_hash text;
  v_canonical text;
BEGIN
  SELECT company_id, firm_id
    INTO v_slot_company_id, v_slot_firm_id
  FROM public.pilot_slots
  WHERE id = NEW.pilot_slot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: pilot_slot_id % does not exist',
      NEW.pilot_slot_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  NEW.company_id := v_slot_company_id;
  NEW.firm_id := v_slot_firm_id;

  IF NEW.prev_hash IS NOT NULL OR NEW.row_hash IS NOT NULL THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: prev_hash and row_hash are trigger-managed; application code must not set them'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.company_id IS NOT NULL THEN
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE company_id = NEW.company_id
    ORDER BY event_at DESC, id DESC
    LIMIT 1;
  ELSE
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE firm_id = NEW.firm_id
    ORDER BY event_at DESC, id DESC
    LIMIT 1;
  END IF;

  NEW.prev_hash := v_prev_hash;

  v_canonical := public.pilot_lifecycle_events_canonical_payload(
    NEW.event_kind,
    NEW.event_at,
    NEW.schema_version,
    NEW.pilot_slot_id,
    NEW.from_status,
    NEW.to_status,
    NEW.classification_hint,
    NEW.company_id,
    NEW.firm_id,
    NEW.actor_kind,
    NEW.actor_user_id,
    NEW.actor_via,
    NEW.assertions_covered,
    NEW.evidence_refs,
    NEW.reason_code,
    NEW.reason_text,
    NEW.payload
  );

  NEW.row_hash := 'sha256:' || encode(
    digest(convert_to(coalesce(NEW.prev_hash, '') || v_canonical, 'UTF8'), 'sha256'::text),
    'hex'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_verify_chain(
  p_company_id uuid DEFAULT NULL,
  p_firm_id uuid DEFAULT NULL
) RETURNS TABLE (
  first_broken_event_id uuid,
  first_broken_event_at timestamptz,
  expected_prev_hash text,
  actual_prev_hash text,
  expected_row_hash text,
  actual_row_hash text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_row record;
  v_expected_prev text := NULL;
  v_recomputed_hash text;
  v_canonical text;
BEGIN
  IF (p_company_id IS NULL AND p_firm_id IS NULL) OR
     (p_company_id IS NOT NULL AND p_firm_id IS NOT NULL) THEN
    RAISE EXCEPTION 'pilot_lifecycle_events_verify_chain: pass exactly one of p_company_id or p_firm_id';
  END IF;

  FOR v_row IN
    SELECT * FROM public.pilot_lifecycle_events
    WHERE (p_company_id IS NOT NULL AND company_id = p_company_id)
       OR (p_firm_id IS NOT NULL AND firm_id = p_firm_id)
    ORDER BY event_at ASC, id ASC
  LOOP
    v_canonical := public.pilot_lifecycle_events_canonical_payload(
      v_row.event_kind, v_row.event_at, v_row.schema_version,
      v_row.pilot_slot_id, v_row.from_status, v_row.to_status,
      v_row.classification_hint, v_row.company_id, v_row.firm_id,
      v_row.actor_kind, v_row.actor_user_id, v_row.actor_via,
      v_row.assertions_covered, v_row.evidence_refs,
      v_row.reason_code, v_row.reason_text, v_row.payload
    );

    v_recomputed_hash := 'sha256:' || encode(
      digest(convert_to(coalesce(v_expected_prev, '') || v_canonical, 'UTF8'), 'sha256'::text),
      'hex'
    );

    IF v_row.prev_hash IS DISTINCT FROM v_expected_prev
       OR v_row.row_hash IS DISTINCT FROM v_recomputed_hash THEN
      first_broken_event_id := v_row.id;
      first_broken_event_at := v_row.event_at;
      expected_prev_hash := v_expected_prev;
      actual_prev_hash := v_row.prev_hash;
      expected_row_hash := v_recomputed_hash;
      actual_row_hash := v_row.row_hash;
      RETURN NEXT;
      RETURN;
    END IF;

    v_expected_prev := v_row.row_hash;
  END LOOP;

  RETURN;
END;
$$;
-- <<< end 20260804214151_pilot_lifecycle_events_hash_extensions_search_path.sql

-- >>> begin 20260805041500_major_1_rpc_lockdown.sql
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

-- [ESC] stripped source txn marker: BEGIN;


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

-- [ESC] sp_write_anchor_batch owner/admin-only: no proven runtime .rpc() caller — REVOKE service_role (separate auth required before re-grant).
REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(int8,int8,int4,text,jsonb,jsonb) FROM service_role;

-- [ESC] stripped source txn marker: COMMIT;


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
-- <<< end 20260805041500_major_1_rpc_lockdown.sql

-- >>> begin ESC_REMEDIATION_MODULE_BOUNDARY_SECURITY
-- Same-module RLS + least-privilege closure (security slice).
-- Legitimate gap2_purge_table_registry caller: lib/gap2/purge-executor.ts (service_role).
-- Legitimate increment_share_token_access caller: lib/close-packet/share-tokens.js (admin/service).
-- Legitimate publish_ledger_event caller: lib/events/publisher.ts (service_role).
-- Anonymous browser execute is NOT required for either RPC.

ALTER TABLE IF EXISTS public.gap2_purge_table_registry ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gap2_purge_table_registry FROM PUBLIC;
REVOKE ALL ON TABLE public.gap2_purge_table_registry FROM anon;
REVOKE ALL ON TABLE public.gap2_purge_table_registry FROM authenticated;
DROP POLICY IF EXISTS gap2_purge_table_registry_service_role ON public.gap2_purge_table_registry;
CREATE POLICY gap2_purge_table_registry_service_role
  ON public.gap2_purge_table_registry
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.engagement_posting_policy ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.engagement_posting_policy FROM PUBLIC;
REVOKE ALL ON TABLE public.engagement_posting_policy FROM anon;
REVOKE ALL ON TABLE public.engagement_posting_policy FROM authenticated;
DROP POLICY IF EXISTS engagement_posting_policy_service_role ON public.engagement_posting_policy;
CREATE POLICY engagement_posting_policy_service_role
  ON public.engagement_posting_policy
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.curated_rule_fires ENABLE ROW LEVEL SECURITY;

REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) FROM anon;
REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) FROM authenticated;

DO $esc_priv_assert$
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
    RAISE EXCEPTION 'ESC privilege assert: % anon/authenticated EXECUTE grants remain: %', bad_count, bad_detail;
  END IF;
END
$esc_priv_assert$;
-- <<< end ESC_REMEDIATION_MODULE_BOUNDARY_SECURITY
-- [ESC] sp_write_anchor_batch: owner/admin-only (no proven runtime .rpc() caller).
REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) FROM service_role;

-- [ESC] Function privilege closure before COMMIT
-- Default PUBLIC EXECUTE removed for every application function created/replaced in this slice.
-- Regrant only per disposition (service_role always; authenticated only for allowlisted RLS helpers).
-- disposition public.is_active_company_member(uuid) => authenticated_rls_helper
REVOKE EXECUTE ON FUNCTION public.is_active_company_member(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_active_company_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_active_company_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_company_member(uuid) TO service_role;
-- disposition public.has_active_company_role(uuid,text[]) => authenticated_rls_helper
REVOKE EXECUTE ON FUNCTION public.has_active_company_role(uuid,text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_active_company_role(uuid,text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_active_company_role(uuid,text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_company_role(uuid,text[]) TO service_role;
-- disposition public.is_company_admin(uuid) => authenticated_rls_helper
REVOKE EXECUTE ON FUNCTION public.is_company_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_company_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid) TO service_role;
-- disposition public.is_active_firm_member(uuid) => authenticated_rls_helper
REVOKE EXECUTE ON FUNCTION public.is_active_firm_member(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_active_firm_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_active_firm_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_firm_member(uuid) TO service_role;
-- disposition public.has_active_firm_role(uuid,text[]) => authenticated_rls_helper
REVOKE EXECUTE ON FUNCTION public.has_active_firm_role(uuid,text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_active_firm_role(uuid,text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_active_firm_role(uuid,text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_firm_role(uuid,text[]) TO service_role;
-- disposition public.pilot_lifecycle_events_before_insert() => trigger_only
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_before_insert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_before_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_before_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_before_insert() FROM service_role;
-- disposition public.pilot_lifecycle_events_verify_chain(uuid,uuid) => migration_admin_or_internal
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_verify_chain(uuid,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_verify_chain(uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_verify_chain(uuid,uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_verify_chain(uuid,uuid) FROM service_role;
COMMIT;
