-- Phase D6.2b: Activate 8 MFG rules in registry + seed test-client activations.
-- Test client is industry_vertical='general' — Guardrail 2 excludes MFG rules
-- at load time (never evaluated). Activations prove the join path only.
begin;

update public.curated_rules_registry
   set is_active = true,
       updated_at = now()
 where rule_id in (
   'mfg.absorption_check',
   'mfg.cogs_variance_check',
   'mfg.freight_capitalization_check',
   'mfg.inventory_reconciliation_check',
   'mfg.scrap_variance_check',
   'mfg.standard_cost_capitalization_check',
   'mfg.warranty_accrual_check',
   'mfg.wip_cutoff_check'
 );

insert into public.client_active_rules (firm_client_id, rule_id, is_enabled, created_at, updated_at)
values
  ('71111111-1111-4111-8111-111111111111', 'mfg.absorption_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'mfg.cogs_variance_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'mfg.freight_capitalization_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'mfg.inventory_reconciliation_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'mfg.scrap_variance_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'mfg.standard_cost_capitalization_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'mfg.warranty_accrual_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'mfg.wip_cutoff_check', true, now(), now())
on conflict (firm_client_id, rule_id) do update
   set is_enabled = true,
       disabled_at = null,
       disabled_reason = null,
       disabled_by_user_id = null,
       updated_at = now();

commit;
