-- ============================================================================
-- Phase D-Entitlements — Add-On Packaging Foundation
-- ============================================================================
-- Depends on: 20260706120000_d_platform_event_sourced_foundation.sql
-- Additive-only. No prior tables/constraints altered destructively.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Widen D-Platform CHECK constraints (additive)
-- ----------------------------------------------------------------------------

ALTER TABLE public.ai_action_log
  DROP CONSTRAINT IF EXISTS ai_action_log_action_category_check;
ALTER TABLE public.ai_action_log
  ADD CONSTRAINT ai_action_log_action_category_check
  CHECK (action_category IN (
    'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
    'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
    'agent_close_walkthrough','entitlement_check','other'
  ));

ALTER TABLE public.ledger_events
  DROP CONSTRAINT IF EXISTS ledger_events_event_category_check;
ALTER TABLE public.ledger_events
  ADD CONSTRAINT ledger_events_event_category_check
  CHECK (event_category IN (
    'intake','ledger','cash_app','ar','ap','recon','close','assertion',
    'rule','directive','ai_action','system','entitlement'
  ));

-- ----------------------------------------------------------------------------
-- 2. engagement_addons
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.engagement_addons (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id                   UUID NOT NULL REFERENCES public.engagements(id) ON DELETE RESTRICT,
  addon_code                      TEXT NOT NULL CHECK (addon_code IN (
    'ap_intake',
    'ap_pay',
    'ar_invoicing',
    'ar_cash_app',
    'ar_collections',
    'voice_collections'
  )),
  is_active                       BOOLEAN NOT NULL DEFAULT FALSE,
  activated_at                    TIMESTAMPTZ,
  deactivated_at                  TIMESTAMPTZ,
  stripe_subscription_item_id     TEXT,
  stripe_price_id                 TEXT,
  included_volume_override        INTEGER,
  overage_unit_price_cents_override BIGINT,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                      TEXT,
  notes                           TEXT,
  UNIQUE (engagement_id, addon_code)
);
CREATE INDEX IF NOT EXISTS idx_engagement_addons_engagement
  ON public.engagement_addons(engagement_id);
CREATE INDEX IF NOT EXISTS idx_engagement_addons_active
  ON public.engagement_addons(engagement_id, addon_code)
  WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_engagement_addons_stripe_item
  ON public.engagement_addons(stripe_subscription_item_id)
  WHERE stripe_subscription_item_id IS NOT NULL;
COMMENT ON TABLE public.engagement_addons IS
  'Per-engagement entitlements for the 6 Doc D add-ons. No dependency gates: each row is independent. Pricing metadata lives in Stripe.';

-- ----------------------------------------------------------------------------
-- 3. entitlement_check_audit
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.entitlement_check_audit (
  id                     BIGSERIAL PRIMARY KEY,
  checked_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  engagement_id          UUID REFERENCES public.engagements(id) ON DELETE RESTRICT,
  firm_client_id         UUID REFERENCES public.firm_clients(id) ON DELETE RESTRICT,
  addon_code             TEXT NOT NULL,
  allowed                BOOLEAN NOT NULL,
  caller                 TEXT NOT NULL,
  reason                 TEXT,
  correlation_id         TEXT,
  actor_type             TEXT NOT NULL DEFAULT 'system' CHECK (actor_type IN (
    'user','system','ai_agent','integration','rule','recurring'
  )),
  actor_id               TEXT,
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_entitlement_audit_engagement_time
  ON public.entitlement_check_audit(engagement_id, checked_at DESC)
  WHERE engagement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entitlement_audit_addon_denied
  ON public.entitlement_check_audit(addon_code, checked_at DESC)
  WHERE allowed = FALSE;
CREATE INDEX IF NOT EXISTS idx_entitlement_audit_correlation
  ON public.entitlement_check_audit(correlation_id)
  WHERE correlation_id IS NOT NULL;
COMMENT ON TABLE public.entitlement_check_audit IS
  'Append-only log of every entitlement gate check. Feeds D11 Coverage Statement + audit trail.';

-- ----------------------------------------------------------------------------
-- 4. stripe_webhook_events
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  stripe_event_id        TEXT PRIMARY KEY,
  event_type             TEXT NOT NULL,
  received_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at           TIMESTAMPTZ,
  processing_status      TEXT NOT NULL DEFAULT 'received' CHECK (processing_status IN (
    'received','processing','processed','skipped','failed'
  )),
  processing_error       TEXT,
  raw_payload            JSONB NOT NULL,
  livemode               BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_type_time
  ON public.stripe_webhook_events(event_type, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_unprocessed
  ON public.stripe_webhook_events(received_at)
  WHERE processing_status IN ('received','processing');
COMMENT ON TABLE public.stripe_webhook_events IS
  'Idempotency + audit for inbound Stripe webhooks. PK on Stripe event id prevents double-processing.';

-- ----------------------------------------------------------------------------
-- 5. updated_at trigger for engagement_addons
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.engagement_addons_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS engagement_addons_updated_at ON public.engagement_addons;
CREATE TRIGGER engagement_addons_updated_at
  BEFORE UPDATE ON public.engagement_addons
  FOR EACH ROW EXECUTE FUNCTION public.engagement_addons_set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.engagement_addons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlement_check_audit    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_engagement_addons"
  ON public.engagement_addons FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_entitlement_check_audit"
  ON public.entitlement_check_audit FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_stripe_webhook_events"
  ON public.stripe_webhook_events FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "firm_members_read_engagement_addons"
  ON public.engagement_addons FOR SELECT TO authenticated
  USING (engagement_id IN (
    SELECT id FROM public.engagements
    WHERE firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid())
  ));
CREATE POLICY "firm_members_read_entitlement_check_audit"
  ON public.entitlement_check_audit FOR SELECT TO authenticated
  USING (engagement_id IN (
    SELECT id FROM public.engagements
    WHERE firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid())
  ));

-- ----------------------------------------------------------------------------
-- 7. Prevent tamper on entitlement_check_audit (append-only)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.entitlement_check_audit_no_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'entitlement_check_audit is append-only; % blocked', TG_OP;
END;
$$;
DROP TRIGGER IF EXISTS entitlement_audit_no_update ON public.entitlement_check_audit;
DROP TRIGGER IF EXISTS entitlement_audit_no_delete ON public.entitlement_check_audit;
CREATE TRIGGER entitlement_audit_no_update
  BEFORE UPDATE ON public.entitlement_check_audit
  FOR EACH ROW EXECUTE FUNCTION public.entitlement_check_audit_no_mutation();
CREATE TRIGGER entitlement_audit_no_delete
  BEFORE DELETE ON public.entitlement_check_audit
  FOR EACH ROW EXECUTE FUNCTION public.entitlement_check_audit_no_mutation();

COMMIT;
