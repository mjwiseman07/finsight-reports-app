-- Phase D6.2d: Activate 6 professional-services rules in registry + seed
-- test-client activations for the GENERAL client so Guardrail 2 excludes them
-- at load time (never evaluated). Proves vertical scope holds for a fourth vertical.
--
-- NOTE: The PS test client (73333333-...) is NOT seeded into live firm_clients.
-- Following the D6.2c precedent (retail client 72222222-... was mock-only), the
-- PS-client "rules ARE evaluated" proof runs entirely in the integration-test
-- mock. Seeding a fake firm_clients row into prod is intentionally avoided, and
-- its client_active_rules would violate the firm_clients FK anyway.
begin;

update public.curated_rules_registry
   set is_active = true,
       updated_at = now()
 where rule_id in (
   'ps.bill_rate_variance_check',
   'ps.contract_asset_reclass_check',
   'ps.project_margin_flag_check',
   'ps.revenue_percent_complete_check',
   'ps.unbilled_receivables_check',
   'ps.wip_billable_hours_check'
 );

insert into public.client_active_rules (firm_client_id, rule_id, is_enabled, created_at, updated_at)
values
  ('71111111-1111-4111-8111-111111111111', 'ps.bill_rate_variance_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'ps.contract_asset_reclass_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'ps.project_margin_flag_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'ps.revenue_percent_complete_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'ps.unbilled_receivables_check', true, now(), now()),
  ('71111111-1111-4111-8111-111111111111', 'ps.wip_billable_hours_check', true, now(), now())
on conflict (firm_client_id, rule_id) do update
   set is_enabled = true,
       disabled_at = null,
       disabled_reason = null,
       disabled_by_user_id = null,
       updated_at = now();

commit;
