-- Phase D6.2a: Activate 4 general rules for the test client only.
-- No global registry flip beyond these 4 rows. Other clients unaffected.
-- Idempotent. client_active_rules has UNIQUE(firm_client_id, rule_id)
-- (constraint client_active_rules_firm_client_id_rule_id_key), verified live.
begin;

insert into public.client_active_rules
  (firm_client_id, rule_id, is_enabled, created_at, updated_at)
values
  ('71111111-1111-4111-8111-111111111111', 'gen.subledger_tie_check',          true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'gen.gl_mapping_variance_check',    true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'gen.accrual_reversal_check',       true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'gen.reversing_entry_period_check', true, now(), now())
on conflict (firm_client_id, rule_id) do update
  set is_enabled = excluded.is_enabled,
      disabled_at = null,
      disabled_reason = null,
      disabled_by_user_id = null,
      updated_at = now();

-- Flip the 4 registry rows to is_active=true so loadActiveRules picks them up.
-- (Registry gate + per-client activation are BOTH required for a rule to run.)
update public.curated_rules_registry
   set is_active = true
 where rule_id in (
   'gen.subledger_tie_check',
   'gen.gl_mapping_variance_check',
   'gen.accrual_reversal_check',
   'gen.reversing_entry_period_check'
 );

commit;
