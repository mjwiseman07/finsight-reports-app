-- =============================================================================
-- Phase D6.5 Part 2 · Block 6b
-- L0 Approval Matrix + Delegation + Comment Threads + L7 Budget Checks
-- =============================================================================
-- Additive-only. Idempotent. RLS on every new table.
-- Depends on Block 6a (requisitions, requisition_line_items, pilot_feature_allowlist,
-- engagement_addons addon_code CHECK, ap event catalog).
-- =============================================================================
BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Widen engagement_addons.addon_code CHECK — add ap_budget_controls
-- -----------------------------------------------------------------------------
ALTER TABLE public.engagement_addons DROP CONSTRAINT IF EXISTS engagement_addons_addon_code_check;
ALTER TABLE public.engagement_addons
  ADD CONSTRAINT engagement_addons_addon_code_check
  CHECK (addon_code IN (
    'ap_intake','ap_pay','ar_invoicing','ar_cash_app','ar_collections',
    'voice_collections','quarantine_review','ap_requisitions',
    'ap_baseline_harvest','ap_three_way_match','ap_budget_controls'
  ));

-- -----------------------------------------------------------------------------
-- 1b. Widen pilot_feature_allowlist.feature_code CHECK
-- -----------------------------------------------------------------------------
ALTER TABLE public.pilot_feature_allowlist DROP CONSTRAINT IF EXISTS pilot_feature_allowlist_feature_code_check;
ALTER TABLE public.pilot_feature_allowlist
  ADD CONSTRAINT pilot_feature_allowlist_feature_code_check
  CHECK (feature_code IN (
    'ap_requisitions',
    'ap_baseline_harvest',
    'ap_three_way_match',
    'ap_approval_matrix',
    'ap_budget_controls'
  ));

-- -----------------------------------------------------------------------------
-- 2. requisition_approval_chains — ordered approver list per requisition
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requisition_approval_chains (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                UUID NOT NULL,
  firm_client_id         UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  requisition_id         UUID NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
  strategy               TEXT NOT NULL DEFAULT 'sequential'
    CHECK (strategy IN ('sequential','parallel','any_of')),
  status                 TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','cancelled','rejected')),
  total_steps            INTEGER NOT NULL DEFAULT 0,
  completed_steps        INTEGER NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at           TIMESTAMPTZ,
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (requisition_id)
);
CREATE INDEX IF NOT EXISTS idx_rac_firm ON public.requisition_approval_chains(firm_id);
CREATE INDEX IF NOT EXISTS idx_rac_status ON public.requisition_approval_chains(status);
ALTER TABLE public.requisition_approval_chains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rac_service_all ON public.requisition_approval_chains;
CREATE POLICY rac_service_all ON public.requisition_approval_chains
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rac_firm_select ON public.requisition_approval_chains;
CREATE POLICY rac_firm_select ON public.requisition_approval_chains
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = requisition_approval_chains.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- -----------------------------------------------------------------------------
-- 3. requisition_approval_steps — one row per approver in the chain
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requisition_approval_steps (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id               UUID NOT NULL REFERENCES public.requisition_approval_chains(id) ON DELETE CASCADE,
  requisition_id         UUID NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
  firm_id                UUID NOT NULL,
  order_index            INTEGER NOT NULL,
  required_role          TEXT,
  approver_user_id       UUID NOT NULL,
  threshold_amount_cents BIGINT,
  status                 TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','delegated','skipped')),
  acted_at               TIMESTAMPTZ,
  acted_by_user_id       UUID,
  delegated_to_user_id   UUID,
  comment                TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- multiple rows allowed per slot (delegation creates a sibling)
);
CREATE INDEX IF NOT EXISTS idx_ras_requisition ON public.requisition_approval_steps(requisition_id);
CREATE INDEX IF NOT EXISTS idx_ras_approver ON public.requisition_approval_steps(approver_user_id, status);
CREATE INDEX IF NOT EXISTS idx_ras_firm ON public.requisition_approval_steps(firm_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ras_pending_slot
  ON public.requisition_approval_steps(chain_id, order_index)
  WHERE status = 'pending';
ALTER TABLE public.requisition_approval_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ras_service_all ON public.requisition_approval_steps;
CREATE POLICY ras_service_all ON public.requisition_approval_steps
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ras_firm_select ON public.requisition_approval_steps;
CREATE POLICY ras_firm_select ON public.requisition_approval_steps
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = requisition_approval_steps.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- -----------------------------------------------------------------------------
-- 4. approval_delegations — user → user delegation windows (per firm)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.approval_delegations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                UUID NOT NULL,
  delegator_user_id      UUID NOT NULL,
  delegate_user_id       UUID NOT NULL,
  scope                  TEXT NOT NULL DEFAULT 'ap_requisitions'
    CHECK (scope IN ('ap_requisitions','ap_amendments','ap_all')),
  effective_from         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to           TIMESTAMPTZ NOT NULL,
  reason                 TEXT,
  revoked_at             TIMESTAMPTZ,
  created_by             UUID NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (delegator_user_id <> delegate_user_id),
  CHECK (effective_to > effective_from)
);
CREATE INDEX IF NOT EXISTS idx_deleg_firm_delegator ON public.approval_delegations(firm_id, delegator_user_id);
CREATE INDEX IF NOT EXISTS idx_deleg_firm_delegate ON public.approval_delegations(firm_id, delegate_user_id);
CREATE INDEX IF NOT EXISTS idx_deleg_active
  ON public.approval_delegations(firm_id, delegator_user_id, effective_to)
  WHERE revoked_at IS NULL;
ALTER TABLE public.approval_delegations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deleg_service_all ON public.approval_delegations;
CREATE POLICY deleg_service_all ON public.approval_delegations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS deleg_firm_select ON public.approval_delegations;
CREATE POLICY deleg_firm_select ON public.approval_delegations
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = approval_delegations.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- -----------------------------------------------------------------------------
-- 5. requisition_comments — threaded discussion on a requisition
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requisition_comments (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id         UUID NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
  firm_id                UUID NOT NULL,
  firm_client_id         UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  parent_comment_id      UUID REFERENCES public.requisition_comments(id) ON DELETE CASCADE,
  author_user_id         UUID NOT NULL,
  body                   TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 10000),
  edited_at              TIMESTAMPTZ,
  deleted_at             TIMESTAMPTZ,
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rc_requisition ON public.requisition_comments(requisition_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rc_firm ON public.requisition_comments(firm_id);
CREATE INDEX IF NOT EXISTS idx_rc_parent ON public.requisition_comments(parent_comment_id);
ALTER TABLE public.requisition_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rc_service_all ON public.requisition_comments;
CREATE POLICY rc_service_all ON public.requisition_comments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rc_firm_select ON public.requisition_comments;
CREATE POLICY rc_firm_select ON public.requisition_comments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = requisition_comments.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- -----------------------------------------------------------------------------
-- 6. requisition_amendments — post-approval change requests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requisition_amendments (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id         UUID NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
  firm_id                UUID NOT NULL,
  firm_client_id         UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  amender_user_id        UUID NOT NULL,
  reason                 TEXT NOT NULL CHECK (length(reason) > 0),
  changes_json           JSONB NOT NULL,
  prior_total_cents      BIGINT NOT NULL,
  new_total_cents        BIGINT NOT NULL,
  requires_controller    BOOLEAN NOT NULL DEFAULT FALSE,
  status                 TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by            UUID,
  approved_at            TIMESTAMPTZ,
  rejected_by            UUID,
  rejected_at            TIMESTAMPTZ,
  rejection_reason       TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ra_requisition ON public.requisition_amendments(requisition_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ra_firm_status ON public.requisition_amendments(firm_id, status);
ALTER TABLE public.requisition_amendments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ra_service_all ON public.requisition_amendments;
CREATE POLICY ra_service_all ON public.requisition_amendments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ra_firm_select ON public.requisition_amendments;
CREATE POLICY ra_firm_select ON public.requisition_amendments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = requisition_amendments.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- -----------------------------------------------------------------------------
-- 7. gl_account_budgets — monthly budget by GL account
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gl_account_budgets (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                UUID NOT NULL,
  firm_client_id         UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  company_id             UUID NOT NULL,
  gl_account_code        TEXT NOT NULL,
  gl_account_name        TEXT,
  period_year            INTEGER NOT NULL CHECK (period_year BETWEEN 2020 AND 2100),
  period_month           INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  budget_amount_cents    BIGINT NOT NULL CHECK (budget_amount_cents >= 0),
  currency               TEXT NOT NULL DEFAULT 'USD',
  tolerance_pct          NUMERIC(6,3) NOT NULL DEFAULT 0.000
    CHECK (tolerance_pct >= 0 AND tolerance_pct <= 100),
  source                 TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','qbo','csv_upload','api')),
  created_by             UUID NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, gl_account_code, period_year, period_month)
);
CREATE INDEX IF NOT EXISTS idx_glab_firm ON public.gl_account_budgets(firm_id);
CREATE INDEX IF NOT EXISTS idx_glab_company_period ON public.gl_account_budgets(company_id, period_year, period_month);
ALTER TABLE public.gl_account_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS glab_service_all ON public.gl_account_budgets;
CREATE POLICY glab_service_all ON public.gl_account_budgets
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS glab_firm_select ON public.gl_account_budgets;
CREATE POLICY glab_firm_select ON public.gl_account_budgets
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = gl_account_budgets.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- -----------------------------------------------------------------------------
-- 8. vendor_spend_history — rolling actuals per vendor per period
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_spend_history (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                UUID NOT NULL,
  firm_client_id         UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  company_id             UUID NOT NULL,
  vendor_id              UUID,
  vendor_external_id     TEXT,
  gl_account_code        TEXT,
  period_year            INTEGER NOT NULL CHECK (period_year BETWEEN 2020 AND 2100),
  period_month           INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  spend_amount_cents     BIGINT NOT NULL DEFAULT 0 CHECK (spend_amount_cents >= 0),
  invoice_count          INTEGER NOT NULL DEFAULT 0 CHECK (invoice_count >= 0),
  currency               TEXT NOT NULL DEFAULT 'USD',
  last_updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, vendor_id, gl_account_code, period_year, period_month)
);
CREATE INDEX IF NOT EXISTS idx_vsh_firm ON public.vendor_spend_history(firm_id);
CREATE INDEX IF NOT EXISTS idx_vsh_vendor_period ON public.vendor_spend_history(company_id, vendor_id, period_year, period_month);
ALTER TABLE public.vendor_spend_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vsh_service_all ON public.vendor_spend_history;
CREATE POLICY vsh_service_all ON public.vendor_spend_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS vsh_firm_select ON public.vendor_spend_history;
CREATE POLICY vsh_firm_select ON public.vendor_spend_history
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = vendor_spend_history.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- -----------------------------------------------------------------------------
-- 9. budget_check_results — audit trail of every budget evaluation
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budget_check_results (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                UUID NOT NULL,
  firm_client_id         UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  company_id             UUID NOT NULL,
  aggregate_type         TEXT NOT NULL CHECK (aggregate_type IN ('requisition','bill','purchase_order')),
  aggregate_id           UUID NOT NULL,
  gl_account_code        TEXT NOT NULL,
  period_year            INTEGER NOT NULL,
  period_month           INTEGER NOT NULL,
  budget_amount_cents    BIGINT NOT NULL,
  committed_cents        BIGINT NOT NULL,
  incoming_cents         BIGINT NOT NULL,
  tolerance_pct          NUMERIC(6,3) NOT NULL,
  result                 TEXT NOT NULL CHECK (result IN ('within_budget','within_tolerance','exceeds_budget','no_budget_set')),
  evaluated_by_user_id   UUID,
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bcr_aggregate ON public.budget_check_results(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_bcr_firm_created ON public.budget_check_results(firm_id, created_at DESC);
ALTER TABLE public.budget_check_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bcr_service_all ON public.budget_check_results;
CREATE POLICY bcr_service_all ON public.budget_check_results
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS bcr_firm_select ON public.budget_check_results;
CREATE POLICY bcr_firm_select ON public.budget_check_results
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = budget_check_results.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- -----------------------------------------------------------------------------
-- 10. Extend ap_intake_ledger_event_types catalog (16 Block 6b events)
-- -----------------------------------------------------------------------------
INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('requisition.approval_chain_created',    'user',   TRUE),
  ('requisition.approval_step_assigned',   'user',   TRUE),
  ('requisition.approval_step_approved',    'user',   TRUE),
  ('requisition.approval_step_rejected',    'user',   TRUE),
  ('requisition.approval_step_delegated',   'user',   TRUE),
  ('requisition.approval_chain_completed',  'user',   TRUE),
  ('approval.delegation_created',           'user',   TRUE),
  ('approval.delegation_revoked',           'user',   TRUE),
  ('requisition.commented',                 'user',   TRUE),
  ('requisition.comment_edited',            'user',   TRUE),
  ('requisition.comment_deleted',           'user',   TRUE),
  ('requisition.amendment_requested',       'user',   TRUE),
  ('requisition.amendment_approved',          'user',   TRUE),
  ('requisition.amendment_rejected',          'user',   TRUE),
  ('budget.evaluated',                      'user',   TRUE),
  ('budget.exceeded',                       'user',   TRUE),
  ('budget.tolerance_hit',                  'user',   TRUE),
  ('vendor_spend.updated',                  'user',   TRUE)
ON CONFLICT (event_type) DO NOTHING;

COMMIT;
