-- =============================================================================
-- EXECUTABLE SQUASH CANDIDATE — DRAFT / NON-DEPLOYABLE
-- Proposed version: 20260907010020
-- Proposed name: esc_phase1_subscriptions_rls_atomic
-- Module: phase1_atomic_with_rls_closure
-- Provenance: Option D assembled recovered phase1 ×4 concatenated to close historical RLS window in one version
-- NOT in active supabase/migrations/. Production mutation NOT authorized.
-- UTF-8 LF. statements[] must remain non-empty when eventually recorded.
-- =============================================================================
-- Security: single proposed version closes CREATE→RLS gap that existed across prod versions 1–4.
BEGIN;

-- >>> begin 20260701043602_phase1_subscriptions_core.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260701043602
-- NAME: phase1_subscriptions_core
-- DATABASE_MD5_UTF8: 5992414bde50c4562925b60361721b44
-- WARNING: NOT AN APPROVED MIGRATION — evidence only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false

-- Phase 1 subscription domain model — core tables
-- Adds proper subscription/entitlement layer without modifying existing tables.
-- Existing columns (companies.package_level, companies.billing_status, users.subscription_status)
-- are preserved and remain writable. A compatibility view (in a later migration) exposes
-- the new state in the old shape so existing readers keep working.

-- ─── subscriptions ────────────────────────────────────────────────────────
-- One row per active Stripe subscription. A subscription belongs to EITHER a firm
-- or a company (mutually exclusive) — enforced by CHECK constraint.

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_type           text NOT NULL CHECK (subscriber_type IN ('firm', 'company')),
  subscriber_id             uuid NOT NULL,
  stripe_customer_id        text NOT NULL,
  stripe_subscription_id    text NOT NULL UNIQUE,
  status                    text NOT NULL CHECK (status IN (
                              'trialing', 'active', 'past_due', 'canceled',
                              'incomplete', 'incomplete_expired', 'unpaid', 'paused'
                            )),
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  cancel_at_period_end      boolean NOT NULL DEFAULT false,
  canceled_at               timestamptz,
  trial_start               timestamptz,
  trial_end                 timestamptz,
  metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber
  ON public.subscriptions (subscriber_type, subscriber_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON public.subscriptions (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON public.subscriptions (status) WHERE status IN ('trialing', 'active', 'past_due');

COMMENT ON TABLE public.subscriptions IS 'Advisacor Phase 1: master subscription record. One per active Stripe subscription. Subscriber is either a firm or a company (polymorphic via subscriber_type/subscriber_id).';
COMMENT ON COLUMN public.subscriptions.subscriber_type IS 'firm | company — determines which table subscriber_id references';
COMMENT ON COLUMN public.subscriptions.status IS 'Mirrors Stripe subscription status. Only trialing/active/past_due grant entitlements.';

-- ─── subscription_items ───────────────────────────────────────────────────
-- Line items on a subscription. A subscription can have multiple items:
--   - a base tier (owner_lite, owner_pro, solo_bookkeeper, firm)
--   - metered seats (firm_seat, client_seat_alacarte) with a quantity
--   - add-ons (industry_premium_addon)

CREATE TABLE IF NOT EXISTS public.subscription_items (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id             uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  stripe_subscription_item_id text NOT NULL UNIQUE,
  stripe_price_id             text NOT NULL,
  tier_key                    text NOT NULL,
  lookup_key                  text NOT NULL,
  track                       text NOT NULL CHECK (track IN ('standard', 'pilot')),
  cadence                     text NOT NULL CHECK (cadence IN ('monthly', 'yearly')),
  quantity                    integer NOT NULL DEFAULT 1,
  metered                     boolean NOT NULL DEFAULT false,
  is_addon                    boolean NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_items_subscription
  ON public.subscription_items (subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_items_tier_key
  ON public.subscription_items (tier_key);

CREATE INDEX IF NOT EXISTS idx_subscription_items_lookup_key
  ON public.subscription_items (lookup_key);

COMMENT ON TABLE public.subscription_items IS 'Advisacor Phase 1: individual line items on a subscription (base tier + metered seats + add-ons).';
COMMENT ON COLUMN public.subscription_items.tier_key IS 'Canonical tier key from lib/product-tiers.js — e.g. owner_lite, firm, firm_seat, industry_premium_addon';
COMMENT ON COLUMN public.subscription_items.lookup_key IS 'Stripe price lookup_key for audit trail — e.g. firm_seat_std_mo';
COMMENT ON COLUMN public.subscription_items.quantity IS 'For metered items: current seat count. For flat-rate: always 1.';

-- ─── stripe_webhook_events ────────────────────────────────────────────────
-- Idempotency + audit log. Every webhook event processed inserts a row here;
-- duplicate event IDs (Stripe retries) become no-ops via ON CONFLICT DO NOTHING.

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  stripe_event_id     text PRIMARY KEY,
  event_type          text NOT NULL,
  api_version         text,
  subscription_id     uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  livemode            boolean NOT NULL DEFAULT false,
  processed_at        timestamptz NOT NULL DEFAULT now(),
  processing_ms       integer,
  status              text NOT NULL DEFAULT 'processed' CHECK (status IN ('processed', 'failed', 'skipped')),
  error_message       text,
  payload             jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type
  ON public.stripe_webhook_events (event_type, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_subscription
  ON public.stripe_webhook_events (subscription_id) WHERE subscription_id IS NOT NULL;

COMMENT ON TABLE public.stripe_webhook_events IS 'Advisacor Phase 1: idempotency ledger + audit log for Stripe webhook events. Primary key is Stripe event ID.';
-- <<< end 20260701043602_phase1_subscriptions_core.sql

-- >>> begin 20260701043707_phase1_subscription_seats_and_entitlements.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260701043707
-- NAME: phase1_subscription_seats_and_entitlements
-- DATABASE_MD5_UTF8: 60a5d243a32814c9975bd0e1b90e6cee
-- WARNING: NOT AN APPROVED MIGRATION — evidence only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false

-- Phase 1 subscription domain model — seats and entitlements cache

-- ─── subscription_seats ─────────────────────────────────────────────────
-- For metered seat items (firm_seat, client_seat_alacarte): tracks which client
-- (companies row) each active seat is allocated to. When a seat is activated we
-- report usage to Stripe; when deactivated we log the end time (no negative usage).

CREATE TABLE IF NOT EXISTS public.subscription_seats (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_item_id      uuid NOT NULL REFERENCES public.subscription_items(id) ON DELETE CASCADE,
  firm_id                   uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  company_id                uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  active                    boolean NOT NULL DEFAULT true,
  activated_at              timestamptz NOT NULL DEFAULT now(),
  deactivated_at            timestamptz,
  stripe_usage_event_id     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- One active seat per (subscription_item, company) pair. Deactivated seats keep
-- historical rows; a new activation for the same company creates a new row.
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_seats_active_company
  ON public.subscription_seats (subscription_item_id, company_id)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_subscription_seats_firm
  ON public.subscription_seats (firm_id) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_subscription_seats_company
  ON public.subscription_seats (company_id) WHERE active = true;

COMMENT ON TABLE public.subscription_seats IS 'Advisacor Phase 1: per-client seat allocation for metered firm_seat / client_seat_alacarte items. Active seats drive Stripe usage reporting.';
COMMENT ON COLUMN public.subscription_seats.stripe_usage_event_id IS 'Stripe meter event ID from the activation call — used to correlate with Stripe usage records.';

-- ─── entitlements ─────────────────────────────────────────────────────────────
-- Pre-computed access rights per subscriber. Written whenever a subscription
-- event fires; read by app code on every request that gates features.

CREATE TABLE IF NOT EXISTS public.entitlements (
  subscriber_type       text NOT NULL CHECK (subscriber_type IN ('firm', 'company')),
  subscriber_id         uuid NOT NULL,
  active_tier_keys      text[] NOT NULL DEFAULT '{}',
  primary_tier_key      text,
  flags                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  seat_limit            integer,
  active_seat_count     integer NOT NULL DEFAULT 0,
  is_metered_seats      boolean NOT NULL DEFAULT false,
  status                text NOT NULL DEFAULT 'none' CHECK (status IN (
                          'none', 'trialing', 'active', 'past_due', 'canceled'
                        )),
  trial_end             timestamptz,
  current_period_end    timestamptz,
  computed_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subscriber_type, subscriber_id)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_primary_tier
  ON public.entitlements (primary_tier_key) WHERE primary_tier_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entitlements_status
  ON public.entitlements (status) WHERE status IN ('trialing', 'active');

COMMENT ON TABLE public.entitlements IS 'Advisacor Phase 1: pre-computed access rights per subscriber. One row per firm or company. Rewritten on every subscription event by lib/entitlements.js#recomputeEntitlements.';
COMMENT ON COLUMN public.entitlements.flags IS 'Merged flat object of all active tier + addon entitlements. Consumed directly by feature gates.';
COMMENT ON COLUMN public.entitlements.primary_tier_key IS 'The base tier (owner_lite, firm, etc.) — excludes add-ons. Null when no active subscription.';
COMMENT ON COLUMN public.entitlements.seat_limit IS 'Hard cap on seats for flat-rate tiers (e.g. solo_bookkeeper=8). Null for metered/unlimited tiers.';

-- ─── updated_at triggers ────────────────────────────────────────────────────
-- Auto-maintain updated_at on the new tables.

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_subscription_items_updated_at ON public.subscription_items;
CREATE TRIGGER trg_subscription_items_updated_at
  BEFORE UPDATE ON public.subscription_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_subscription_seats_updated_at ON public.subscription_seats;
CREATE TRIGGER trg_subscription_seats_updated_at
  BEFORE UPDATE ON public.subscription_seats
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
-- <<< end 20260701043707_phase1_subscription_seats_and_entitlements.sql

-- >>> begin 20260701043911_phase1_backward_compat_view.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260701043911
-- NAME: phase1_backward_compat_view
-- DATABASE_MD5_UTF8: 6d7ed2de4528c1380dcb0221fc14af39
-- WARNING: NOT AN APPROVED MIGRATION — evidence only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false

-- Phase 1: Backward-compat view for legacy companies.package_level / billing_status
-- Computes tier + status from new entitlements table so existing reads keep working
-- until Phase 1.5 grep-clean.

CREATE OR REPLACE VIEW public.company_billing_compat AS
SELECT
  c.id AS company_id,
  c.practice_id AS firm_id,
  -- Prefer company-scoped entitlement; fall back to firm-scoped entitlement; else legacy column
  COALESCE(
    (SELECT (e.active_tier_keys)[1]
       FROM public.entitlements e
      WHERE e.subscriber_type = 'company' AND e.subscriber_id = c.id
      LIMIT 1),
    (SELECT (e.active_tier_keys)[1]
       FROM public.entitlements e
      WHERE e.subscriber_type = 'firm' AND e.subscriber_id = c.practice_id
      LIMIT 1),
    c.package_level
  ) AS effective_package_level,
  COALESCE(
    (SELECT e.status::text
       FROM public.entitlements e
      WHERE e.subscriber_type = 'company' AND e.subscriber_id = c.id
      LIMIT 1),
    (SELECT e.status::text
       FROM public.entitlements e
      WHERE e.subscriber_type = 'firm' AND e.subscriber_id = c.practice_id
      LIMIT 1),
    c.billing_status
  ) AS effective_billing_status,
  c.package_level AS legacy_package_level,
  c.billing_status AS legacy_billing_status
FROM public.companies c;

COMMENT ON VIEW public.company_billing_compat IS
  'Phase 1 backward-compat view. Prefers new entitlements table; falls back to legacy companies.package_level / billing_status columns. Drop legacy columns in Phase 1.5 after all reads migrated.';
-- <<< end 20260701043911_phase1_backward_compat_view.sql

-- >>> begin 20260701043931_phase1_entitlement_rls_policies.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260701043931
-- NAME: phase1_entitlement_rls_policies
-- DATABASE_MD5_UTF8: d13c0dc54794fe2f0d47dfa43c86ad3e
-- WARNING: NOT AN APPROVED MIGRATION — evidence only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false

-- Phase 1: RLS policies for entitlement domain model

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- subscriptions: read own firm or company
CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT
  USING (
    (subscriber_type = 'firm' AND EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = subscriptions.subscriber_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    ))
    OR
    (subscriber_type = 'company' AND EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = subscriptions.subscriber_id
        AND cu.user_id = auth.uid()
        AND cu.status = 'active'
    ))
  );

-- subscription_items: inherit from parent subscription
CREATE POLICY subscription_items_select_own ON public.subscription_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.id = subscription_items.subscription_id
        AND (
          (s.subscriber_type = 'firm' AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = s.subscriber_id
              AND fm.user_id = auth.uid()
              AND fm.status = 'active'
          ))
          OR
          (s.subscriber_type = 'company' AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = s.subscriber_id
              AND cu.user_id = auth.uid()
              AND cu.status = 'active'
          ))
        )
    )
  );

-- subscription_seats: firm members OR seated company members
CREATE POLICY subscription_seats_select_firm ON public.subscription_seats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.subscription_items si
      JOIN public.subscriptions s ON s.id = si.subscription_id
      JOIN public.firm_memberships fm ON fm.firm_id = s.subscriber_id
      WHERE si.id = subscription_seats.subscription_item_id
        AND s.subscriber_type = 'firm'
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = subscription_seats.company_id
        AND cu.user_id = auth.uid()
        AND cu.status = 'active'
    )
  );

-- entitlements: read own firm or company
CREATE POLICY entitlements_select_own ON public.entitlements
  FOR SELECT
  USING (
    (subscriber_type = 'firm' AND EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = entitlements.subscriber_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    ))
    OR
    (subscriber_type = 'company' AND EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = entitlements.subscriber_id
        AND cu.user_id = auth.uid()
        AND cu.status = 'active'
    ))
  );

-- stripe_webhook_events: RLS enabled, no policies = service_role only

COMMENT ON POLICY subscriptions_select_own ON public.subscriptions IS
  'Users can read subscriptions for firms or companies they are active members of.';
COMMENT ON POLICY entitlements_select_own ON public.entitlements IS
  'Users can read entitlements for firms or companies they are active members of. Writes are service_role only.';
-- <<< end 20260701043931_phase1_entitlement_rls_policies.sql

-- Hardening: ensure RLS enabled on phase1 subscription tables before COMMIT.
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- [ESC] Function privilege closure before COMMIT
-- Same-slice revoke of default PUBLIC EXECUTE (+ anon/authenticated per disposition).
-- disposition public.tg_set_updated_at() => trigger_only
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.tg_set_updated_at() TO service_role;
COMMIT;
