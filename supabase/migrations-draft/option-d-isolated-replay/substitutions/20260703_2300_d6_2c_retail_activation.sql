-- OPTION D SUBSTITUTION — isolated clean-replay candidate only
-- Replaces: supabase/migrations/20260703_2300_d6_2c_retail_activation.sql
-- Does NOT modify active supabase/migrations/ or production schema_migrations.
--
-- Justification: registry UPDATE required; client INSERT guarded via firm_clients.

BEGIN;

UPDATE public.curated_rules_registry
   SET is_active = true,
       updated_at = now()
 WHERE rule_id IN (
   'rtl.cogs_recognition_check',
   'rtl.gift_card_liability_check',
   'rtl.inventory_shrink_check',
   'rtl.loyalty_reward_liability_check',
   'rtl.sales_returns_reserve_check',
   'rtl.seasonal_markdown_check'
 );

INSERT INTO public.client_active_rules (firm_client_id, rule_id, is_enabled, created_at, updated_at)
SELECT fc.id, v.rule_id, true, now(), now()
FROM public.firm_clients fc
CROSS JOIN (
  VALUES
    ('rtl.cogs_recognition_check'),
    ('rtl.gift_card_liability_check'),
    ('rtl.inventory_shrink_check'),
    ('rtl.loyalty_reward_liability_check'),
    ('rtl.sales_returns_reserve_check'),
    ('rtl.seasonal_markdown_check')
) AS v(rule_id)
WHERE fc.id = '71111111-1111-4111-8111-111111111111'::uuid
ON CONFLICT (firm_client_id, rule_id) DO UPDATE
   SET is_enabled = true,
       disabled_at = NULL,
       disabled_reason = NULL,
       disabled_by_user_id = NULL,
       updated_at = now();

COMMIT;
