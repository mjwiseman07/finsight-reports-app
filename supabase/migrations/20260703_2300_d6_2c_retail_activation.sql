-- Phase D6.2c: Activate 6 retail rules in registry + seed test-client activations.
-- Test client is industry_vertical='general' — Guardrail 2 excludes retail rules
-- at load time (never evaluated). Proves vertical scope holds for a third vertical.
begin;

update public.curated_rules_registry
   set is_active = true,
       updated_at = now()
 where rule_id in (
   'rtl.cogs_recognition_check',
   'rtl.gift_card_liability_check',
   'rtl.inventory_shrink_check',
   'rtl.loyalty_reward_liability_check',
   'rtl.sales_returns_reserve_check',
   'rtl.seasonal_markdown_check'
 );

insert into public.client_active_rules (firm_client_id, rule_id, is_enabled, created_at, updated_at)
values
  ('71111111-1111-4111-8111-111111111111', 'rtl.cogs_recognition_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'rtl.gift_card_liability_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'rtl.inventory_shrink_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'rtl.loyalty_reward_liability_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'rtl.sales_returns_reserve_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'rtl.seasonal_markdown_check', true, now(), now())
on conflict (firm_client_id, rule_id) do update
   set is_enabled = true,
       disabled_at = null,
       disabled_reason = null,
       disabled_by_user_id = null,
       updated_at = now();

commit;
