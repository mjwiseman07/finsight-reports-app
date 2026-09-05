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