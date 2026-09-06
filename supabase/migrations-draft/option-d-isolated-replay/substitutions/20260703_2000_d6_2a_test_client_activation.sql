-- OPTION D SUBSTITUTION — isolated clean-replay candidate only
-- Replaces: supabase/migrations/20260703_2000_d6_2a_test_client_activation.sql
-- Does NOT modify active supabase/migrations/ or production schema_migrations.
--
-- Justification: unconditional VALUES insert into client_active_rules fails FK on
-- data-less replay. Registry UPDATE is required reference activation; client
-- INSERT is guarded via firm_clients existence (0 rows when fixture absent).

BEGIN;

UPDATE public.curated_rules_registry
   SET is_active = true
 WHERE rule_id IN (
   'gen.subledger_tie_check',
   'gen.gl_mapping_variance_check',
   'gen.accrual_reversal_check',
   'gen.reversing_entry_period_check'
 );

INSERT INTO public.client_active_rules (firm_client_id, rule_id, is_enabled, created_at, updated_at)
SELECT fc.id, v.rule_id, true, now(), now()
FROM public.firm_clients fc
CROSS JOIN (
  VALUES
    ('gen.subledger_tie_check'),
    ('gen.gl_mapping_variance_check'),
    ('gen.accrual_reversal_check'),
    ('gen.reversing_entry_period_check')
) AS v(rule_id)
WHERE fc.id = '71111111-1111-4111-8111-111111111111'::uuid
ON CONFLICT (firm_client_id, rule_id) DO UPDATE
  SET is_enabled = EXCLUDED.is_enabled,
      disabled_at = NULL,
      disabled_reason = NULL,
      disabled_by_user_id = NULL,
      updated_at = now();

COMMIT;
