-- Phase TCP1 W1 — Solo Bookkeeper Launch
--
-- Creates:
--   1. pilot_slots table (per-tier pilot cohort tracking)
--   2. sku_launch_waitlist table (email capture from grayed cards)
--   3. public_pilot_slot_count() function (excludes slot 0 complimentary)
--   4. Seed: NY contractor complimentary row for solo_bookkeeper, slot 0
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
-- 4. Seed — NY contractor complimentary row for solo_bookkeeper
-- =============================================================================
INSERT INTO public.pilot_slots (
  tier_key,
  company_id,
  pilot_slot_number,
  pilot_status,
  pricing_structure,
  pricing_cadence,
  complimentary_client_cap,
  pilot_converts_at,
  notes
) VALUES (
  'solo_bookkeeper',
  '00000000-0000-0000-0000-000000000001',
  0,
  'complimentary',
  'complimentary',
  NULL,
  3,
  'infinity'::timestamptz,
  'NY contractor complimentary tier — 3 permanent client seats for life. Does NOT count against the 10-slot public pilot cap. 4th+ client requires upgrade to flat plan or per-client à la carte billing.'
)
ON CONFLICT (tier_key, company_id) DO NOTHING;

COMMIT;
