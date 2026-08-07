-- Phase DASH_1B.2 — One-shot backfill for the pre-existing Xero sync
-- 5272037e-3636-4c15-b7de-6036513572de on connection 01574f0d-2e74-40e3-837a-68a36a2645b2.
--
-- Backfill discipline (per Phase_DASH_1B_2_Backfill_Research.md §5):
--   - Append at current chain tail; NEVER retroactively insert.
--   - payload.event_at = historical time (as DATA, not chain position).
--   - payload.recorded_at = now() at trigger time (chain-actual write time).
--   - payload.provenance = 'backfill_reconciliation' (distinct from 'live').
--   - payload.authorized_by names THIS migration file.
--
-- IMPORTANT: this migration must run AFTER 20260807040000..040400.
-- If the pilot_slot / company do not yet exist for user a4ebf834, create them here
-- with the same shape ensureLifecycleAnchor would produce.

do $$
declare
  v_user_id uuid := 'a4ebf834-a698-4f79-a945-8498f2e6c45d';
  v_connection_id uuid := '01574f0d-2e74-40e3-837a-68a36a2645b2';
  v_sync_id uuid := '5272037e-3636-4c15-b7de-6036513572de';
  v_tenant_id text := 'ceaea696-081f-491e-9daa-a9263a023ca9';
  v_tenant_name text := 'Demo Company (US)';
  v_event_at timestamptz := '2026-08-07 06:42:24+00';
  v_company_id uuid;
  v_pilot_slot_id uuid;
  v_existing_event_id uuid;
begin
  -- Idempotency guard: skip if event already exists.
  select id into v_existing_event_id
  from pilot_lifecycle_events
  where event_kind = 'pilot.lifecycle.accounting-sync-completed'
    and payload->>'sync_id' = v_sync_id::text
  limit 1;

  if v_existing_event_id is not null then
    raise notice 'Backfill already applied — event % exists. Skipping.', v_existing_event_id;
    return;
  end if;

  -- 1. Ensure company exists for the user.
  select cu.company_id into v_company_id
  from company_users cu
  where cu.user_id = v_user_id
    and cu.role = 'owner_executive'
    and cu.status = 'active'
  limit 1;

  if v_company_id is null then
    insert into companies (
      name, primary_persona, package_level, billing_status,
      onboarding_status, account_type, industry_type
    )
    values (
      v_tenant_name, 'business-owner', 'essential', 'trial',
      'not_started', 'my-own-company', 'Other'
    )
    returning id into v_company_id;

    insert into company_users (company_id, user_id, role, status)
    values (v_company_id, v_user_id, 'owner_executive', 'active');
  end if;

  -- 2. Ensure pilot_slot exists.
  select id into v_pilot_slot_id
  from pilot_slots
  where tier_key = 'free_trial_connected'
    and company_id = v_company_id
  limit 1;

  if v_pilot_slot_id is null then
    insert into pilot_slots (
      tier_key, pilot_status, pricing_structure, pricing_cadence,
      company_id, firm_id
    )
    values (
      'free_trial_connected', 'active', 'flat', 'monthly',
      v_company_id, null
    )
    returning id into v_pilot_slot_id;
  end if;

  -- 3. Append the backfill event at the CURRENT chain tail.
  --    The BEFORE-INSERT trigger will overwrite chain_seq/prev_hash/row_hash.
  insert into pilot_lifecycle_events (
    pilot_slot_id, event_kind, actor_kind, actor_via,
    from_status, to_status, reason_code, payload
  )
  values (
    v_pilot_slot_id,
    'pilot.lifecycle.accounting-sync-completed',
    'system',
    'accounting-sync',
    'active',
    'active',
    'accounting.sync.completed',
    jsonb_build_object(
      'connection_id', v_connection_id,
      'tenant_id', v_tenant_id,
      'tenant_name', v_tenant_name,
      'sync_id', v_sync_id,
      'source_system', 'xero',
      'outcome', 'succeeded',
      'event_at', to_char(v_event_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'recorded_at', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'provenance', 'backfill_reconciliation',
      'authorized_by', 'migration_20260807040500_phase_dash_1b_2'
    )
  );

  raise notice 'Backfill event appended for sync %.', v_sync_id;
end $$;
