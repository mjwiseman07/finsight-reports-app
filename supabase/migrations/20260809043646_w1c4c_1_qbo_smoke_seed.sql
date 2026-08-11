-- W1c.4c.1 — Seed firm_client + pilot_slot for QBO sandbox connection user
-- Rule 3: is_demo=true so it shows up as demo/smoke data.
--
-- Schema deviations from paste (reported in commit body):
-- 1. companies row required first — pilot_slots.company_id FK → companies(id)
-- 2. pilot_slots_entity_xor_check forbids BOTH firm_id and company_id;
--    seed uses company-scoped slot (company_id set, firm_id null)
-- 3. complimentary requires complimentary_client_cap > 0
-- 4. pricing_structure 'per_seat' invalid; use 'complimentary'
-- 5. firm_clients.package_level uses display casing 'Essential' (existing rows)

-- 0. Demo company for the smoke firm_client / company-scoped slot
insert into companies (
  id, name, primary_persona, package_level, billing_status, onboarding_status,
  is_demo, account_type, industry_type, created_at, updated_at
) values (
  'aaaaaaaa-2222-4222-8222-222222222222'::uuid,
  'QBO Sandbox Smoke Company',
  'business-owner',
  'essential',
  'trial',
  'not_started',
  true,
  'my-own-company',
  'Other',
  now(),
  now()
)
on conflict (id) do update
  set updated_at = now(),
      is_demo = true,
      name = excluded.name;

-- 1. Firm client for QBO sandbox owner user (55b6c46e-…)
insert into firm_clients (
  id, name, firm_id, company_id, owner_user_id, is_demo,
  package_level, subscription_status, health_status,
  slug, created_at, updated_at
) values (
  'aaaaaaaa-1111-4111-8111-111111111111'::uuid,
  'QBO Sandbox Smoke Company',
  '11111111-1111-1111-1111-111111111111'::uuid,
  'aaaaaaaa-2222-4222-8222-222222222222'::uuid,
  '55b6c46e-963b-4d4a-8e29-074773f141ff'::uuid,
  true,
  'Essential',
  'active',
  'healthy',
  'qbo-sandbox-smoke',
  now(),
  now()
)
on conflict (id) do update
  set updated_at = now(),
      owner_user_id = excluded.owner_user_id,
      company_id = excluded.company_id,
      firm_id = excluded.firm_id,
      is_demo = true,
      name = excluded.name,
      slug = excluded.slug;

-- 2. Company-scoped pilot slot (firm_id MUST be null — XOR check)
insert into pilot_slots (
  id, tier_key, company_id, firm_id, pilot_slot_number, pilot_status,
  pricing_structure, pricing_cadence, complimentary_client_cap,
  created_at, updated_at
) values (
  'aaaaaaaa-3333-4333-8333-333333333333'::uuid,
  'review_assist',
  'aaaaaaaa-2222-4222-8222-222222222222'::uuid,
  null,
  99,
  'complimentary',
  'complimentary',
  'monthly',
  5,
  now(),
  now()
)
on conflict (id) do update
  set updated_at = now(),
      company_id = excluded.company_id,
      firm_id = null,
      complimentary_client_cap = excluded.complimentary_client_cap,
      pricing_structure = excluded.pricing_structure;
