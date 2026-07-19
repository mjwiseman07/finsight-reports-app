-- V1.5 Audit Ready — engagement lifecycle tracking
-- ADDITIVE ONLY. No existing tables modified.
-- Adapted to repo schema: firm_client_id (not client_seats),
-- company_users / firm_memberships (not company_members / firm_members).

BEGIN;

-- 1) audit_ready_engagements: one row per audit engagement per customer
CREATE TABLE IF NOT EXISTS public.audit_ready_engagements (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                 uuid NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  firm_id                    uuid NULL REFERENCES public.firms(id) ON DELETE RESTRICT,
  firm_client_id             uuid NULL REFERENCES public.firm_clients(id) ON DELETE RESTRICT,
  audit_ready_tier           text NOT NULL CHECK (audit_ready_tier IN ('small','standard','complex','multi_entity')),
  billing_mode               text NOT NULL CHECK (billing_mode IN ('monthly','per_engagement')),
  status                     text NOT NULL DEFAULT 'open' CHECK (status IN ('open','prep_window','closed','timeout_expired','cancelled')),

  -- Volume tracking
  entity_count               integer NOT NULL DEFAULT 1,
  pbc_request_count          integer NOT NULL DEFAULT 0,
  auditor_user_count         integer NOT NULL DEFAULT 0,

  -- Engagement lifecycle
  engagement_name            text NULL,
  auditor_firm_name          text NULL,
  audit_period_start         date NULL,
  audit_period_end           date NULL,
  opened_at                  timestamptz NOT NULL DEFAULT now(),
  prep_window_ends_at        timestamptz NULL,
  hard_timeout_at            timestamptz NOT NULL DEFAULT (now() + interval '180 days'),
  closed_at                  timestamptz NULL,
  cancellation_reason        text NULL,

  -- Stripe linkage
  stripe_subscription_id     text NULL,
  stripe_price_id            text NULL,
  stripe_invoice_id          text NULL,

  -- Timestamps
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT audit_ready_engagement_company_or_firm CHECK (
    (company_id IS NOT NULL AND firm_id IS NULL AND firm_client_id IS NULL)
    OR
    (company_id IS NULL AND firm_id IS NOT NULL AND firm_client_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_audit_ready_engagements_company
  ON public.audit_ready_engagements(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_ready_engagements_firm
  ON public.audit_ready_engagements(firm_id) WHERE firm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_ready_engagements_firm_client
  ON public.audit_ready_engagements(firm_client_id) WHERE firm_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_ready_engagements_status
  ON public.audit_ready_engagements(status);
CREATE INDEX IF NOT EXISTS idx_audit_ready_engagements_timeout
  ON public.audit_ready_engagements(hard_timeout_at)
  WHERE status IN ('open','prep_window');

COMMENT ON TABLE public.audit_ready_engagements IS
  'V1.5 Audit Ready engagement lifecycle. Company XOR firm+firm_client scoped. Seeded inactive SKUs until Phase 3.';

ALTER TABLE public.audit_ready_engagements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_ready_engagements_service_role_all ON public.audit_ready_engagements;
CREATE POLICY audit_ready_engagements_service_role_all
  ON public.audit_ready_engagements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS audit_ready_engagements_company_read ON public.audit_ready_engagements;
CREATE POLICY audit_ready_engagements_company_read ON public.audit_ready_engagements
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = audit_ready_engagements.company_id
        AND cu.user_id = (SELECT auth.uid())
        AND cu.status = 'active'
    )
  );

DROP POLICY IF EXISTS audit_ready_engagements_firm_read ON public.audit_ready_engagements;
CREATE POLICY audit_ready_engagements_firm_read ON public.audit_ready_engagements
  FOR SELECT
  TO authenticated
  USING (
    firm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = audit_ready_engagements.firm_id
        AND fm.user_id = (SELECT auth.uid())
        AND fm.status = 'active'
    )
  );

DROP POLICY IF EXISTS audit_ready_engagements_write ON public.audit_ready_engagements;
CREATE POLICY audit_ready_engagements_write ON public.audit_ready_engagements
  FOR ALL
  TO authenticated
  USING (
    (
      company_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = audit_ready_engagements.company_id
          AND cu.user_id = (SELECT auth.uid())
          AND cu.status = 'active'
          AND cu.role IN ('company_admin', 'owner_executive', 'controller')
      )
    )
    OR
    (
      firm_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.firm_memberships fm
        WHERE fm.firm_id = audit_ready_engagements.firm_id
          AND fm.user_id = (SELECT auth.uid())
          AND fm.status = 'active'
          AND fm.role IN ('firm_admin', 'controller', 'fractional_cfo')
      )
    )
  )
  WITH CHECK (
    (
      company_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = audit_ready_engagements.company_id
          AND cu.user_id = (SELECT auth.uid())
          AND cu.status = 'active'
          AND cu.role IN ('company_admin', 'owner_executive', 'controller')
      )
    )
    OR
    (
      firm_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.firm_memberships fm
        WHERE fm.firm_id = audit_ready_engagements.firm_id
          AND fm.user_id = (SELECT auth.uid())
          AND fm.status = 'active'
          AND fm.role IN ('firm_admin', 'controller', 'fractional_cfo')
      )
    )
  );

-- 2) audit_ready_pbc_requests: parsed PBC list items per engagement
CREATE TABLE IF NOT EXISTS public.audit_ready_pbc_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id         uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  request_number        text NOT NULL,
  request_description   text NOT NULL,
  requested_by          text NULL,
  assertion_tags        text[] NOT NULL DEFAULT '{}',
  source_account_hint   text NULL,
  due_date              date NULL,
  status                text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','submitted','accepted','rework_needed','withdrawn')),
  submitted_at          timestamptz NULL,
  submitted_evidence_bundle_id uuid NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_ready_pbc_engagement
  ON public.audit_ready_pbc_requests(engagement_id);
CREATE INDEX IF NOT EXISTS idx_audit_ready_pbc_status
  ON public.audit_ready_pbc_requests(engagement_id, status);

ALTER TABLE public.audit_ready_pbc_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_ready_pbc_requests_service_role_all ON public.audit_ready_pbc_requests;
CREATE POLICY audit_ready_pbc_requests_service_role_all
  ON public.audit_ready_pbc_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS audit_ready_pbc_requests_all ON public.audit_ready_pbc_requests;
CREATE POLICY audit_ready_pbc_requests_all ON public.audit_ready_pbc_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_pbc_requests.engagement_id
        AND (
          (
            e.company_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.company_users cu
              WHERE cu.company_id = e.company_id
                AND cu.user_id = (SELECT auth.uid())
                AND cu.status = 'active'
            )
          )
          OR
          (
            e.firm_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.firm_memberships fm
              WHERE fm.firm_id = e.firm_id
                AND fm.user_id = (SELECT auth.uid())
                AND fm.status = 'active'
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_pbc_requests.engagement_id
        AND (
          (
            e.company_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.company_users cu
              WHERE cu.company_id = e.company_id
                AND cu.user_id = (SELECT auth.uid())
                AND cu.status = 'active'
            )
          )
          OR
          (
            e.firm_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.firm_memberships fm
              WHERE fm.firm_id = e.firm_id
                AND fm.user_id = (SELECT auth.uid())
                AND fm.status = 'active'
            )
          )
        )
    )
  );

-- 3) audit_ready_auditor_portal_users: engagement-scoped auditor accounts
CREATE TABLE IF NOT EXISTS public.audit_ready_auditor_portal_users (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id         uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  auth_user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auditor_email         text NOT NULL,
  auditor_name          text NULL,
  role                  text NOT NULL DEFAULT 'auditor' CHECK (role IN ('auditor','lead_auditor','partner','staff')),
  mfa_required          boolean NOT NULL DEFAULT true,
  last_login_at         timestamptz NULL,
  invite_sent_at        timestamptz NOT NULL DEFAULT now(),
  invite_accepted_at    timestamptz NULL,
  revoked_at            timestamptz NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, auth_user_id)
);

CREATE INDEX IF NOT EXISTS idx_audit_ready_portal_engagement
  ON public.audit_ready_auditor_portal_users(engagement_id);
CREATE INDEX IF NOT EXISTS idx_audit_ready_portal_auth_user
  ON public.audit_ready_auditor_portal_users(auth_user_id);

ALTER TABLE public.audit_ready_auditor_portal_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_ready_portal_service_role_all ON public.audit_ready_auditor_portal_users;
CREATE POLICY audit_ready_portal_service_role_all
  ON public.audit_ready_auditor_portal_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS audit_ready_portal_owner_all ON public.audit_ready_auditor_portal_users;
CREATE POLICY audit_ready_portal_owner_all ON public.audit_ready_auditor_portal_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_auditor_portal_users.engagement_id
        AND (
          (
            e.company_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.company_users cu
              WHERE cu.company_id = e.company_id
                AND cu.user_id = (SELECT auth.uid())
                AND cu.status = 'active'
                AND cu.role IN ('company_admin', 'owner_executive', 'controller')
            )
          )
          OR
          (
            e.firm_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.firm_memberships fm
              WHERE fm.firm_id = e.firm_id
                AND fm.user_id = (SELECT auth.uid())
                AND fm.status = 'active'
                AND fm.role IN ('firm_admin', 'controller', 'fractional_cfo')
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_auditor_portal_users.engagement_id
        AND (
          (
            e.company_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.company_users cu
              WHERE cu.company_id = e.company_id
                AND cu.user_id = (SELECT auth.uid())
                AND cu.status = 'active'
                AND cu.role IN ('company_admin', 'owner_executive', 'controller')
            )
          )
          OR
          (
            e.firm_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.firm_memberships fm
              WHERE fm.firm_id = e.firm_id
                AND fm.user_id = (SELECT auth.uid())
                AND fm.status = 'active'
                AND fm.role IN ('firm_admin', 'controller', 'fractional_cfo')
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS audit_ready_portal_self ON public.audit_ready_auditor_portal_users;
CREATE POLICY audit_ready_portal_self ON public.audit_ready_auditor_portal_users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

COMMIT;
