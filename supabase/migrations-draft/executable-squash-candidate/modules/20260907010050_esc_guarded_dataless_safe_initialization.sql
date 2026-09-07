-- =============================================================================
-- EXECUTABLE SQUASH CANDIDATE — DRAFT / NON-DEPLOYABLE
-- Proposed version: 20260907010050
-- Proposed name: esc_guarded_dataless_safe_initialization
-- Module: guarded_data_less_safe_initialization
-- Provenance: d6: Option D guarded substitutions; tcp1: Option D schema/RLS/functions with complimentary seed omitted; grant: schema-only unique index
-- NOT in active supabase/migrations/. Production mutation NOT authorized.
-- UTF-8 LF. statements[] must remain non-empty when eventually recorded.
-- =============================================================================

-- >>> guarded 20260703_2000_d6_2a_test_client_activation.sql
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
-- <<< end 20260703_2000_d6_2a_test_client_activation.sql


-- >>> guarded 20260703_2200_d6_2b_mfg_activation.sql
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
-- <<< end 20260703_2200_d6_2b_mfg_activation.sql


-- >>> guarded 20260703_2300_d6_2c_retail_activation.sql
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
-- <<< end 20260703_2300_d6_2c_retail_activation.sql


-- >>> guarded 20260703_2400_d6_2d_ps_activation.sql
-- OPTION D SUBSTITUTION — isolated clean-replay candidate only
-- Replaces: supabase/migrations/20260703_2400_d6_2d_ps_activation.sql
-- Does NOT modify active supabase/migrations/ or production schema_migrations.
--
-- Justification: registry UPDATE required; client INSERT guarded via firm_clients.

BEGIN;

UPDATE public.curated_rules_registry
   SET is_active = true,
       updated_at = now()
 WHERE rule_id IN (
   'ps.bill_rate_variance_check',
   'ps.contract_asset_reclass_check',
   'ps.project_margin_flag_check',
   'ps.revenue_percent_complete_check',
   'ps.unbilled_receivables_check',
   'ps.wip_billable_hours_check'
 );

INSERT INTO public.client_active_rules (firm_client_id, rule_id, is_enabled, created_at, updated_at)
SELECT fc.id, v.rule_id, true, now(), now()
FROM public.firm_clients fc
CROSS JOIN (
  VALUES
    ('ps.bill_rate_variance_check'),
    ('ps.contract_asset_reclass_check'),
    ('ps.project_margin_flag_check'),
    ('ps.revenue_percent_complete_check'),
    ('ps.unbilled_receivables_check'),
    ('ps.wip_billable_hours_check')
) AS v(rule_id)
WHERE fc.id = '71111111-1111-4111-8111-111111111111'::uuid
ON CONFLICT (firm_client_id, rule_id) DO UPDATE
   SET is_enabled = true,
       disabled_at = NULL,
       disabled_reason = NULL,
       disabled_by_user_id = NULL,
       updated_at = now();

COMMIT;
-- <<< end 20260703_2400_d6_2d_ps_activation.sql

-- >>> tcp1 schema without complimentary seed
-- OPTION D SUBSTITUTION — isolated clean-replay candidate only
-- Replaces: supabase/migrations/20260708120000_tcp1_w1_solo_bk_pilot_slots.sql
-- Does NOT modify active supabase/migrations/ or production schema_migrations.
--
-- Justification: schema/RLS/function required; complimentary pilot_slots seed
-- INSERT guarded via companies existence so data-less branches no-op on FK.
--
-- Phase TCP1 W1 — Solo Bookkeeper Launch (guarded seed)
-- Creates:
--   1. pilot_slots table (per-tier pilot cohort tracking)
--   2. sku_launch_waitlist table (email capture from grayed cards)
--   3. public_pilot_slot_count() function (excludes slot 0 complimentary)
--   4. Seed: NY contractor complimentary row for solo_bookkeeper, slot 0 (guarded)
--
-- Additive-only. Depends on: existing companies table, existing pilot_feature_allowlist.
-- Ref: LOCK-TRACK-C-P1-TIER-SPEC-v1.1 (Track_C_Phase_1_Tier_Spec_v1_1.md)

BEGIN;

-- =============================================================================
-- 1. pilot_slots
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pilot_slots (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_key                    TEXT NOT NULL,
  company_id                  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pilot_slot_number           INTEGER NOT NULL,
  pilot_status                TEXT NOT NULL,
  pricing_structure           TEXT,
  pricing_cadence             TEXT,
  complimentary_client_cap    INTEGER,
  pilot_converts_at           TIMESTAMPTZ,
  stripe_subscription_id      TEXT,
  stripe_customer_id          TEXT,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pilot_slots_tier_key_check
    CHECK (tier_key IN (
      'solo_bookkeeper','owner_lite','owner_pro','accounting_pro','firm','enterprise_firm','industry_premium','client_seat_alacarte'
    )),
  CONSTRAINT pilot_slots_status_check
    CHECK (pilot_status IN ('pending','active','converted','cancelled','complimentary')),
  CONSTRAINT pilot_slots_pricing_structure_check
    CHECK (pricing_structure IS NULL OR pricing_structure IN ('flat','per_client','complimentary')),
  CONSTRAINT pilot_slots_pricing_cadence_check
    CHECK (pricing_cadence IS NULL OR pricing_cadence IN ('monthly','yearly')),
  CONSTRAINT pilot_slots_complimentary_cap_check
    CHECK (
      (pilot_status = 'complimentary' AND complimentary_client_cap IS NOT NULL AND complimentary_client_cap > 0)
      OR
      (pilot_status <> 'complimentary' AND complimentary_client_cap IS NULL)
    ),
  CONSTRAINT pilot_slots_slot_number_check
    CHECK (pilot_slot_number >= 0),
  CONSTRAINT pilot_slots_unique_per_company_tier UNIQUE (tier_key, company_id),
  CONSTRAINT pilot_slots_unique_slot_per_tier UNIQUE (tier_key, pilot_slot_number)
);

CREATE INDEX IF NOT EXISTS idx_pilot_slots_tier_status
  ON public.pilot_slots(tier_key, pilot_status);
CREATE INDEX IF NOT EXISTS idx_pilot_slots_company
  ON public.pilot_slots(company_id);

ALTER TABLE public.pilot_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pilot_slots_service_role_all" ON public.pilot_slots;
CREATE POLICY "pilot_slots_service_role_all"
  ON public.pilot_slots
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "pilot_slots_firm_members_select" ON public.pilot_slots;
CREATE POLICY "pilot_slots_firm_members_select"
  ON public.pilot_slots
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.firm_memberships fm
      WHERE fm.firm_id = pilot_slots.company_id
        AND fm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pilot_slots_super_admin_all" ON public.pilot_slots;
CREATE POLICY "pilot_slots_super_admin_all"
  ON public.pilot_slots
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin')
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin');

COMMENT ON TABLE public.pilot_slots IS
  'Per-tier pilot cohort tracking. Slot 0 is reserved for complimentary (e.g. NY contractor). Slots 1-10 are the public pilot cohort per tier. Ref LOCK-TRACK-C-P1-TIER-SPEC-v1.1.';

CREATE OR REPLACE FUNCTION public.set_pilot_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pilot_slots_set_updated_at ON public.pilot_slots;
CREATE TRIGGER pilot_slots_set_updated_at
  BEFORE UPDATE ON public.pilot_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pilot_slots_updated_at();

-- =============================================================================
-- 2. sku_launch_waitlist
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.sku_launch_waitlist (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_key           TEXT NOT NULL,
  email             TEXT NOT NULL,
  persona_context   TEXT,
  submitted_from    TEXT,
  utm_source        TEXT,
  utm_medium        TEXT,
  utm_campaign      TEXT,
  notified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT sku_launch_waitlist_sku_key_check
    CHECK (sku_key IN (
      'owner_lite','owner_pro','accounting_pro','firm','enterprise_firm','industry_premium'
    )),
  CONSTRAINT sku_launch_waitlist_email_check
    CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT sku_launch_waitlist_unique_email_per_sku UNIQUE (sku_key, email)
);

CREATE INDEX IF NOT EXISTS idx_sku_launch_waitlist_sku
  ON public.sku_launch_waitlist(sku_key, created_at DESC);

ALTER TABLE public.sku_launch_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sku_launch_waitlist_service_role_all" ON public.sku_launch_waitlist;
CREATE POLICY "sku_launch_waitlist_service_role_all"
  ON public.sku_launch_waitlist
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "sku_launch_waitlist_super_admin_read" ON public.sku_launch_waitlist;
CREATE POLICY "sku_launch_waitlist_super_admin_read"
  ON public.sku_launch_waitlist
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin');

COMMENT ON TABLE public.sku_launch_waitlist IS
  'Email captures from grayed "coming soon" pricing cards. One row per (sku_key, email). Ref LOCK-TRACK-C-P1-TIER-SPEC-v1.1.';

-- =============================================================================
-- 3. public_pilot_slot_count() — excludes slot 0 (complimentary)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.public_pilot_slot_count(p_tier_key TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
    INTO v_count
    FROM public.pilot_slots
   WHERE tier_key = p_tier_key
     AND pilot_slot_number > 0
     AND pilot_status IN ('pending','active');

  RETURN COALESCE(v_count, 0);
END;
$$;

COMMENT ON FUNCTION public.public_pilot_slot_count(TEXT) IS
  'Returns the count of active/pending PUBLIC pilot slots for a tier. Excludes slot 0 (complimentary). Ref LOCK-TRACK-C-P1-TIER-SPEC-v1.1.';

-- =============================================================================
-- 4. Seed — OMITTED in executable-squash-candidate
-- Disposition: production deferred complimentary INSERT; Option D guarded seed is
-- divergent. Empty DB remains valid without slot-0 complimentary row.
-- =============================================================================

-- [ESC] Function privilege closure before COMMIT
-- Same-slice revoke of default PUBLIC EXECUTE (+ anon/authenticated per disposition).
-- disposition public.set_pilot_slots_updated_at() => trigger_only
REVOKE EXECUTE ON FUNCTION public.set_pilot_slots_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_pilot_slots_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_pilot_slots_updated_at() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_pilot_slots_updated_at() TO service_role;
-- disposition public.public_pilot_slot_count(text) => migration_admin_or_internal
REVOKE EXECUTE ON FUNCTION public.public_pilot_slot_count(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.public_pilot_slot_count(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.public_pilot_slot_count(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.public_pilot_slot_count(text) TO service_role;
COMMIT;
-- <<< end tcp1

-- >>> accounting connected grant schema-only
-- OPTION D SUBSTITUTION — isolated clean-replay candidate only
-- Replaces: supabase/migrations/20260814221500_accounting_canonical_connected_grant.sql
-- Does NOT modify active supabase/migrations/ or production schema_migrations.
--
-- Justification (omission of prod operational body):
--   Original migration asserts Demo Xero duplicate connected-grant shape and
--   RAISE EXCEPTION when production rows are absent — blocks data-less replay.
--   Required schema invariant retained: partial UNIQUE index enforcing one
--   connected grant per (user_id, provider, tenant_or_realm_id).
--   Prod-specific LOCK/DO/UPDATE supersede surgery is intentionally omitted
--   from the Option D clean-replay candidate (prod-only operational).
--   Production dashboard replay parity remains unresolved (Option A/B / G4).

-- Generic invariant: one authoritative connected grant per user+provider+tenant.
-- Disconnected / expired / failed / superseded / needs_entity_selection rows may share the key.
CREATE UNIQUE INDEX IF NOT EXISTS accounting_connections_one_connected_grant_uidx
  ON public.accounting_connections (user_id, provider, tenant_or_realm_id)
  WHERE status = 'connected'
    AND tenant_or_realm_id IS NOT NULL;
-- <<< end grant
