-- OPTION D SUBSTITUTION — isolated clean-replay candidate only
-- Replaces: supabase/migrations/20260703_2200_d6_2b_mfg_activation.sql
-- Does NOT modify active supabase/migrations/ or production schema_migrations.
--
-- Justification: registry UPDATE is required; client_active_rules VALUES insert
-- is guarded so data-less branches no-op instead of FK failure.

BEGIN;

UPDATE public.curated_rules_registry
   SET is_active = true,
       updated_at = now()
 WHERE rule_id IN (
   'mfg.absorption_check',
   'mfg.cogs_variance_check',
   'mfg.freight_capitalization_check',
   'mfg.inventory_reconciliation_check',
   'mfg.scrap_variance_check',
   'mfg.standard_cost_capitalization_check',
   'mfg.warranty_accrual_check',
   'mfg.wip_cutoff_check'
 );

INSERT INTO public.client_active_rules (firm_client_id, rule_id, is_enabled, created_at, updated_at)
SELECT fc.id, v.rule_id, true, now(), now()
FROM public.firm_clients fc
CROSS JOIN (
  VALUES
    ('mfg.absorption_check'),
    ('mfg.cogs_variance_check'),
    ('mfg.freight_capitalization_check'),
    ('mfg.inventory_reconciliation_check'),
    ('mfg.scrap_variance_check'),
    ('mfg.standard_cost_capitalization_check'),
    ('mfg.warranty_accrual_check'),
    ('mfg.wip_cutoff_check')
) AS v(rule_id)
WHERE fc.id = '71111111-1111-4111-8111-111111111111'::uuid
ON CONFLICT (firm_client_id, rule_id) DO UPDATE
   SET is_enabled = true,
       disabled_at = NULL,
       disabled_reason = NULL,
       disabled_by_user_id = NULL,
       updated_at = now();

COMMIT;
