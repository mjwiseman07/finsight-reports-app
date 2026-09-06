-- Phase TCP1 W1 Retrofit — pilot_slots.firm_id for firm-tier products.
-- LOCK-TCP1-W1-RETROFIT-2026-07-08
--
-- Rationale: pilot_slots.company_id FKs to public.companies, but firm-tier
-- products (solo_bookkeeper, firm, future accounting_pro) subscribe at the
-- firm level, not the company level. Add firm_id alongside company_id and
-- enforce exactly one via CHECK. Owner-tier products (owner_pro, owner_lite)
-- continue writing company_id.
--
-- Safety: pilot_slots is empty in prod (deferred NY seed never landed). No
-- backfill needed. Additive column. Existing owner-tier code paths untouched.
BEGIN;
ALTER TABLE public.pilot_slots
  ADD COLUMN firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE;
-- Required by pilot_slots_entity_xor_check: firm-tier rows use firm_id with company_id NULL.
ALTER TABLE public.pilot_slots
  ALTER COLUMN company_id DROP NOT NULL;
-- Exactly one of firm_id / company_id must be set per row.
ALTER TABLE public.pilot_slots
  ADD CONSTRAINT pilot_slots_entity_xor_check
  CHECK (
    (firm_id IS NOT NULL AND company_id IS NULL)
    OR
    (firm_id IS NULL AND company_id IS NOT NULL)
  );
-- Firm-tier composite uniqueness (parallel to the existing company-side
-- pilot_slots_unique_per_company_tier). A firm gets one active slot per tier.
ALTER TABLE public.pilot_slots
  ADD CONSTRAINT pilot_slots_unique_per_firm_tier
  UNIQUE (tier_key, firm_id);
-- Index for firm-tier reads (mirrors the implicit company_id index from the
-- existing unique constraint).
CREATE INDEX IF NOT EXISTS pilot_slots_firm_id_idx
  ON public.pilot_slots (firm_id)
  WHERE firm_id IS NOT NULL;
-- Extend the RLS "firm_members can see their firm's slots" policy so it also
-- covers firm-tier rows via the new firm_id path. The existing policy already
-- covers company-tier rows via company_users.
DROP POLICY IF EXISTS pilot_slots_firm_members_select ON public.pilot_slots;
CREATE POLICY pilot_slots_firm_members_select ON public.pilot_slots
  FOR SELECT
  USING (
    -- Firm-tier: user is a member of the firm that owns this slot
    (
      firm_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.firm_memberships fm
        WHERE fm.firm_id = pilot_slots.firm_id
          AND fm.user_id = auth.uid()
          AND fm.status = 'active'
      )
    )
    OR
    -- Owner-tier: user is a member of the company that owns this slot
    (
      company_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = pilot_slots.company_id
          AND cu.user_id = auth.uid()
          AND cu.status = 'active'
      )
    )
  );
COMMIT;
