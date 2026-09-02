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