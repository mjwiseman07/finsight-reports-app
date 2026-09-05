-- Phase Q7 — Capture QBO edition + subscription status on accounting_connections.
--
-- Context:
--   - Issue #7 (App Store edition matrix). We need to know which QBO edition a
--     connected company is on (Simple Start / Essentials / Plus / Advanced) so
--     the write path can reject unsupported features cleanly instead of
--     letting Intuit return a confusing 400. We also need SubscriptionStatus
--     so we fail closed when the subscription is in a read-only state
--     (EXPIRED/RESTRICTED/SUSPENDED/CANCELLED).
--   - Two nullable text columns keep the migration additive. NULL means
--     "not yet captured" — the health-checker back-fills on the next
--     successful CompanyInfo fetch (same retrofit pattern MC-1 used for
--     home_currency).
--
-- Source of truth:
--   - CompanyInfo.NameValue[OfferingSku]
--     https://developer.intuit.com/app/developer/qbo/docs/workflows/manage-business-units
--   - CompanyInfo.SubscriptionStatus
--     https://developer.intuit.com/app/developer/qbo/docs/develop/troubleshooting/subscription-states

DO $$
BEGIN
  IF to_regclass('public.accounting_connections') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'accounting_connections'
        AND column_name = 'qbo_edition'
    ) THEN
      ALTER TABLE public.accounting_connections
        ADD COLUMN qbo_edition text NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'accounting_connections'
        AND column_name = 'qbo_subscription_status'
    ) THEN
      ALTER TABLE public.accounting_connections
        ADD COLUMN qbo_subscription_status text NULL;
    END IF;
  END IF;
END $$;

COMMENT ON COLUMN public.accounting_connections.qbo_edition IS
  'Normalized QBO edition (simple_start|essentials|plus|advanced) parsed from CompanyInfo.NameValue[OfferingSku]. NULL = not yet captured; fail-closed callers treat NULL as simple_start. Added Phase Q7 (Issue #7).';

COMMENT ON COLUMN public.accounting_connections.qbo_subscription_status IS
  'Normalized QBO subscription status (trial|trialoptin|subscribed|expired|restricted|suspended|cancelled|unknown) from CompanyInfo.SubscriptionStatus. Anything other than trial/trialoptin/subscribed is read-only per Intuit. Added Phase Q7 (Issue #7).';
