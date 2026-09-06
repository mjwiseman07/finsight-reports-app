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
