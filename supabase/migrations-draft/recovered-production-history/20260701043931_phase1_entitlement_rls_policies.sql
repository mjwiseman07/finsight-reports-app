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
