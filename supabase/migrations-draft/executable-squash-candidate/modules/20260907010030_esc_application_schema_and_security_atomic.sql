-- =============================================================================
-- EXECUTABLE SQUASH CANDIDATE — DRAFT / NON-DEPLOYABLE
-- Proposed version: 20260907010030
-- Proposed name: esc_application_schema_and_security_atomic
-- Module: public_application_schema_and_security_atomic
-- Provenance: Option D assembled app body (123) + security-named files (15) + ESC boundary RLS/privilege patch; digest qualify excluded (forward-tail only)
-- NOT in active supabase/migrations/. Production mutation NOT authorized.
-- UTF-8 LF. statements[] must remain non-empty when eventually recorded.
-- =============================================================================
-- NOTE: Nested BEGIN/COMMIT from source files may appear; single proposed version
-- closes former module 4→5 RLS exposure for schema_migrations / stop-after-module semantics.

-- >>> begin 20260701_refund_requests.sql
-- Track C Phase 1 — Refund Infrastructure Migration
-- Creates refund_requests + refund_audit_log tables + supporting columns/enum + RLS.
-- Depends on: phase1_subscriptions_core (subscriptions table must exist)
-- Idempotent: safe to re-run.

-- ============================================================================
-- 1. Enum: refund_request_status
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_request_status') THEN
    CREATE TYPE refund_request_status AS ENUM (
      'submitted',
      'pending_review',
      'approved',
      'denied',
      'executing',
      'completed',
      'execution_failed',
      'withdrawn'
    );
  END IF;
END $$;

-- ============================================================================
-- 2. Enum: refund_path
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_path') THEN
    CREATE TYPE refund_path AS ENUM (
      'A',
      'B',
      'C'
    );
  END IF;
END $$;

-- ============================================================================
-- 3. Add first_paid_charge_at to subscriptions (eligibility anchor)
-- ============================================================================
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS first_paid_charge_at TIMESTAMPTZ;

COMMENT ON COLUMN subscriptions.first_paid_charge_at IS
  'Timestamp of first successful invoice.paid event for this subscription. Anchors 30-day refund window per Refund Policy Section 2.';

UPDATE subscriptions
SET first_paid_charge_at = COALESCE(first_paid_charge_at, current_period_start, created_at)
WHERE first_paid_charge_at IS NULL;

-- ============================================================================
-- 4. Table: refund_requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
  requester_user_id UUID,
  requester_email TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('pulse', 'email', 'founder_manual')),
  path refund_path NOT NULL,
  status refund_request_status NOT NULL DEFAULT 'submitted',
  reason_provided TEXT,
  eligibility_reason TEXT NOT NULL,
  first_paid_charge_at TIMESTAMPTZ NOT NULL,
  days_since_first_charge INTEGER NOT NULL,
  stripe_invoice_id TEXT,
  stripe_charge_id TEXT,
  requested_amount_cents INTEGER NOT NULL,
  metered_deduction_cents INTEGER NOT NULL DEFAULT 0,
  refundable_amount_cents INTEGER NOT NULL,
  stripe_refund_id TEXT,
  refund_completed_at TIMESTAMPTZ,
  denial_reason TEXT,
  founder_decision_by TEXT,
  founder_decision_at TIMESTAMPTZ,
  founder_decision_notes TEXT,
  sentiment_flags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS refund_requests_active_per_subscription
  ON refund_requests(subscription_id)
  WHERE status IN ('submitted', 'pending_review', 'approved', 'executing');

CREATE INDEX IF NOT EXISTS refund_requests_status_idx ON refund_requests(status);
CREATE INDEX IF NOT EXISTS refund_requests_path_status_idx ON refund_requests(path, status);
CREATE INDEX IF NOT EXISTS refund_requests_requester_email_idx ON refund_requests(requester_email);
CREATE INDEX IF NOT EXISTS refund_requests_created_at_idx ON refund_requests(created_at DESC);

COMMENT ON TABLE refund_requests IS
  'One row per refund request. Path (A/B/C) is set at submission and drives downstream execution. Founder decisions (Path B) update founder_decision_* columns.';

-- ============================================================================
-- 5. Table: refund_audit_log
-- ============================================================================
CREATE TABLE IF NOT EXISTS refund_audit_log (
  id BIGSERIAL PRIMARY KEY,
  refund_request_id UUID NOT NULL REFERENCES refund_requests(id) ON DELETE RESTRICT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('customer', 'pulse', 'founder', 'system', 'stripe')),
  actor_identifier TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS refund_audit_log_request_id_idx ON refund_audit_log(refund_request_id, created_at);
CREATE INDEX IF NOT EXISTS refund_audit_log_event_type_idx ON refund_audit_log(event_type);

COMMENT ON TABLE refund_audit_log IS
  'Append-only audit trail of every state change and action on a refund_request. Never UPDATE or DELETE rows here. Used for founder queue UI and chargeback contest evidence.';

-- ============================================================================
-- 6. Table: refund_disputes (chargeback tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS refund_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  refund_request_id UUID REFERENCES refund_requests(id) ON DELETE SET NULL,
  stripe_dispute_id TEXT NOT NULL UNIQUE,
  stripe_charge_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  evidence_due_by TIMESTAMPTZ,
  is_within_policy_window BOOLEAN,
  had_prior_contact BOOLEAN,
  founder_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS refund_disputes_status_idx ON refund_disputes(status);
CREATE INDEX IF NOT EXISTS refund_disputes_subscription_id_idx ON refund_disputes(subscription_id);

COMMENT ON TABLE refund_disputes IS
  'Mirrors Stripe charge.dispute.created events. is_within_policy_window and had_prior_contact are computed at ingest to inform contest strategy per Refund Policy Section 10.';

-- ============================================================================
-- 7. updated_at triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refund_requests_updated_at ON refund_requests;
CREATE TRIGGER refund_requests_updated_at
  BEFORE UPDATE ON refund_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS refund_disputes_updated_at ON refund_disputes;
CREATE TRIGGER refund_disputes_updated_at
  BEFORE UPDATE ON refund_disputes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 8. RLS policies
-- ============================================================================
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS refund_requests_owner_read ON refund_requests;
CREATE POLICY refund_requests_owner_read ON refund_requests
  FOR SELECT
  USING (
    requester_user_id = auth.uid()
    OR requester_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS refund_requests_service_all ON refund_requests;
CREATE POLICY refund_requests_service_all ON refund_requests
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS refund_audit_log_owner_read ON refund_audit_log;
CREATE POLICY refund_audit_log_owner_read ON refund_audit_log
  FOR SELECT
  USING (
    refund_request_id IN (
      SELECT id FROM refund_requests
      WHERE requester_user_id = auth.uid()
         OR requester_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS refund_audit_log_service_all ON refund_audit_log;
CREATE POLICY refund_audit_log_service_all ON refund_audit_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS refund_disputes_service_only ON refund_disputes;
CREATE POLICY refund_disputes_service_only ON refund_disputes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 9. Grants
-- ============================================================================
GRANT SELECT ON refund_requests TO authenticated;
GRANT SELECT ON refund_audit_log TO authenticated;

GRANT ALL ON refund_requests TO service_role;
GRANT ALL ON refund_audit_log TO service_role;
GRANT ALL ON refund_disputes TO service_role;
GRANT USAGE, SELECT ON SEQUENCE refund_audit_log_id_seq TO service_role;
-- <<< end 20260701_refund_requests.sql

-- >>> begin 20260702041259_add_received_at_to_stripe_webhook_events.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260702041259
-- NAME: add_received_at_to_stripe_webhook_events
-- DATABASE_MD5_UTF8: 36e917a838d7c7919395194e6e5819b9
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 144
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS received_at timestamptz NOT NULL DEFAULT now(); NOTIFY pgrst, 'reload schema';
-- <<< end 20260702041259_add_received_at_to_stripe_webhook_events.sql

-- >>> begin 20260702_create_mfg_waitlist.sql
create table if not exists public.mfg_waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null unique,
  company text not null,
  revenue_band text not null,
  current_erp text not null,
  pain_point text,
  source text,
  contacted_at timestamptz,
  status text not null default 'new'
);

create index if not exists mfg_waitlist_created_at_idx
  on public.mfg_waitlist (created_at desc);
create index if not exists mfg_waitlist_status_idx
  on public.mfg_waitlist (status);

-- Lock down. Only the service role (server action) can write.
-- Super admins can read/manage from the admin surfaces. No public policies.
alter table public.mfg_waitlist enable row level security;

drop policy if exists "Super admins can manage mfg waitlist" on public.mfg_waitlist;
create policy "Super admins can manage mfg waitlist"
on public.mfg_waitlist
for all
using (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
  or auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin'
)
with check (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
  or auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin'
);
-- <<< end 20260702_create_mfg_waitlist.sql

-- >>> begin 20260703_00_create_close_ledger.sql
-- ============================================================================
-- Advisacor Wave 1 — Doc A0: Close Ledger Foundation
-- Must land before Doc A1 (checklist system) which ALTERs close_periods.
-- ============================================================================

CREATE TABLE IF NOT EXISTS close_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id UUID NOT NULL REFERENCES firm_clients(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','prep','drafting','review_ready','sent','signed_off','locked')),
  drafted_at TIMESTAMPTZ,
  review_ready_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  signed_off_at TIMESTAMPTZ,
  signed_off_by_user_id UUID,
  locked_at TIMESTAMPTZ,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (firm_client_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_close_periods_firm_client ON close_periods(firm_client_id);
CREATE INDEX IF NOT EXISTS idx_close_periods_status ON close_periods(status);
CREATE INDEX IF NOT EXISTS idx_close_periods_period ON close_periods(period_start, period_end);

ALTER TABLE close_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage close periods" ON close_periods;
CREATE POLICY "Super admins manage close periods"
  ON close_periods FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');
-- <<< end 20260703_00_create_close_ledger.sql

-- >>> begin 20260703_01_create_checklist_system.sql
-- ============================================================================
-- Advisacor Wave 1 — Close Checklist System (Doc A, Block A1)
-- Patched for actual schema: close_checklists references firm_clients(id) and
-- uses firm_client_id (not clients / client_id). Requires Doc A0 (close_periods).
-- ============================================================================

-- Templates (system-provided + firm-owned)
CREATE TABLE IF NOT EXISTS close_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  industry TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS close_checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES close_checklist_templates(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  item_type TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  ai_verifier TEXT,
  UNIQUE (template_id, code)
);

-- Per-client checklist
CREATE TABLE IF NOT EXISTS close_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id UUID NOT NULL REFERENCES firm_clients(id) ON DELETE CASCADE,
  source_template_id UUID REFERENCES close_checklist_templates(id) ON DELETE SET NULL,
  run_mode TEXT NOT NULL DEFAULT 'auto' CHECK (run_mode IN ('auto','manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (firm_client_id)
);

CREATE TABLE IF NOT EXISTS close_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES close_checklists(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  item_type TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  ai_verifier TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (checklist_id, code)
);

-- Per-close-period execution
CREATE TABLE IF NOT EXISTS close_checklist_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  close_period_id UUID NOT NULL REFERENCES close_periods(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES close_checklists(id) ON DELETE CASCADE,
  run_mode TEXT NOT NULL CHECK (run_mode IN ('auto','manual')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','passed','failed','waived')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  waived_by_user_id UUID,
  waived_reason TEXT,
  UNIQUE (close_period_id)
);

CREATE TABLE IF NOT EXISTS close_checklist_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES close_checklist_runs(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES close_checklist_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','passed','failed','skipped','manual_confirmed','waived')),
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  evidence_url TEXT,
  note TEXT,
  ai_result_json JSONB,
  UNIQUE (run_id, checklist_item_id)
);

-- Extend close_periods with checklist gating
ALTER TABLE close_periods
  ADD COLUMN IF NOT EXISTS checklist_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (checklist_status IN ('not_started','running','passed','failed','waived','skipped_no_checklist')),
  ADD COLUMN IF NOT EXISTS checklist_run_id UUID REFERENCES close_checklist_runs(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_close_checklists_firm_client ON close_checklists(firm_client_id);
CREATE INDEX IF NOT EXISTS idx_close_checklist_runs_period ON close_checklist_runs(close_period_id);
CREATE INDEX IF NOT EXISTS idx_close_checklist_run_items_run ON close_checklist_run_items(run_id, status);
CREATE INDEX IF NOT EXISTS idx_close_checklist_templates_firm ON close_checklist_templates(firm_id) WHERE firm_id IS NOT NULL;

-- ============================================================================
-- RLS (mirror free_review_leads super_admin JWT pattern)
-- ============================================================================
ALTER TABLE close_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_checklist_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_checklist_run_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage checklist templates" ON close_checklist_templates;
CREATE POLICY "Super admins manage checklist templates"
  ON close_checklist_templates FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins manage checklist template items" ON close_checklist_template_items;
CREATE POLICY "Super admins manage checklist template items"
  ON close_checklist_template_items FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins manage checklists" ON close_checklists;
CREATE POLICY "Super admins manage checklists"
  ON close_checklists FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins manage checklist items" ON close_checklist_items;
CREATE POLICY "Super admins manage checklist items"
  ON close_checklist_items FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins manage checklist runs" ON close_checklist_runs;
CREATE POLICY "Super admins manage checklist runs"
  ON close_checklist_runs FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins manage checklist run items" ON close_checklist_run_items;
CREATE POLICY "Super admins manage checklist run items"
  ON close_checklist_run_items FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');

-- ============================================================================
-- Seed system templates
-- ============================================================================
-- Template 1: Standard Monthly Close
INSERT INTO close_checklist_templates (id, firm_id, name, description, is_system, industry)
VALUES (
  '11111111-1111-1111-1111-111111111001',
  NULL,
  'Standard Monthly Close',
  'Default lightweight checklist for Review Assist. 7 items, mostly AI-verified.',
  TRUE,
  'general_services'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO close_checklist_template_items (template_id, sort_order, code, label, description, category, item_type, is_required, ai_verifier) VALUES
  ('11111111-1111-1111-1111-111111111001', 10, 'zero_uncategorized_txns', 'All transactions categorized', 'No Uncategorized Income, Uncategorized Expense, or Ask My Accountant balances.', 'reconciliation', 'ai_verified', TRUE, 'zero_uncategorized_txns'),
  ('11111111-1111-1111-1111-111111111001', 20, 'bank_recs_current', 'All bank accounts reconciled through period end', 'Every bank account has a reconciliation dated at or after period end.', 'reconciliation', 'ai_verified', TRUE, 'all_bank_accounts_reconciled_through_period_end'),
  ('11111111-1111-1111-1111-111111111001', 30, 'credit_card_recs_current', 'All credit card accounts reconciled', 'Every credit card account has a reconciliation dated at or after period end.', 'reconciliation', 'ai_verified', TRUE, 'all_cc_accounts_reconciled_through_period_end'),
  ('11111111-1111-1111-1111-111111111001', 40, 'ap_current', 'Accounts payable aging reviewed', 'No stale bills over 90 days past due, or any that exist are noted.', 'ap_ar', 'ai_verified', TRUE, 'ap_aging_no_stale_over_90'),
  ('11111111-1111-1111-1111-111111111001', 50, 'ar_current', 'AR aging reviewed', 'AR aging report generated and reviewed.', 'ap_ar', 'ai_verified', TRUE, 'ar_aging_reviewed'),
  ('11111111-1111-1111-1111-111111111001', 60, 'payroll_posted', 'Payroll journal entries posted through period end', 'All payroll JEs entered through the last pay date in the period.', 'payroll', 'confirm_note', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111001', 70, 'management_adjustments', 'Management adjustments received and entered', 'Any client-provided adjustments have been entered.', 'review', 'confirm_note', TRUE, NULL)
ON CONFLICT (template_id, code) DO NOTHING;

-- Template 2: Retail & E-commerce Close
INSERT INTO close_checklist_templates (id, firm_id, name, description, is_system, industry)
VALUES (
  '11111111-1111-1111-1111-111111111002',
  NULL,
  'Retail & E-commerce Close',
  'Standard + inventory, sales tax, merchant deposits, COGS.',
  TRUE,
  'retail_ecom'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO close_checklist_template_items (template_id, sort_order, code, label, description, category, item_type, is_required, ai_verifier) VALUES
  ('11111111-1111-1111-1111-111111111002', 10, 'zero_uncategorized_txns', 'All transactions categorized', NULL, 'reconciliation', 'ai_verified', TRUE, 'zero_uncategorized_txns'),
  ('11111111-1111-1111-1111-111111111002', 20, 'bank_recs_current', 'All bank accounts reconciled through period end', NULL, 'reconciliation', 'ai_verified', TRUE, 'all_bank_accounts_reconciled_through_period_end'),
  ('11111111-1111-1111-1111-111111111002', 30, 'credit_card_recs_current', 'All credit card accounts reconciled', NULL, 'reconciliation', 'ai_verified', TRUE, 'all_cc_accounts_reconciled_through_period_end'),
  ('11111111-1111-1111-1111-111111111002', 40, 'merchant_deposits_reconciled', 'Merchant deposits reconciled (Stripe/Shopify/Square)', 'Gross-to-net merchant deposits tied to platform reports.', 'reconciliation', 'confirm_note', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111002', 50, 'inventory_count_reconciled', 'Inventory count reconciled', 'Physical or cycle count reconciled to GL.', 'accruals', 'confirm_note', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111002', 60, 'cogs_posted', 'COGS entries posted', 'COGS JE posted from inventory movement.', 'accruals', 'confirm_note', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111002', 70, 'sales_tax_accrued', 'Sales tax liability accrued', NULL, 'tax', 'ai_verified', TRUE, 'sales_tax_liability_current'),
  ('11111111-1111-1111-1111-111111111002', 80, 'ap_current', 'Accounts payable aging reviewed', NULL, 'ap_ar', 'ai_verified', TRUE, 'ap_aging_no_stale_over_90'),
  ('11111111-1111-1111-1111-111111111002', 90, 'ar_current', 'AR aging reviewed', NULL, 'ap_ar', 'ai_verified', TRUE, 'ar_aging_reviewed'),
  ('11111111-1111-1111-1111-111111111002', 100, 'payroll_posted', 'Payroll journal entries posted', NULL, 'payroll', 'confirm_note', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111002', 110, 'management_adjustments', 'Management adjustments received and entered', NULL, 'review', 'confirm_note', TRUE, NULL)
ON CONFLICT (template_id, code) DO NOTHING;

-- Template 3: Restaurant Close
INSERT INTO close_checklist_templates (id, firm_id, name, description, is_system, industry)
VALUES (
  '11111111-1111-1111-1111-111111111003',
  NULL,
  'Restaurant Close',
  'Standard + daily sales, tips, food/bev inventory, gift cards, comps.',
  TRUE,
  'restaurant'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO close_checklist_template_items (template_id, sort_order, code, label, description, category, item_type, is_required, ai_verifier) VALUES
  ('11111111-1111-1111-1111-111111111003', 10, 'zero_uncategorized_txns', 'All transactions categorized', NULL, 'reconciliation', 'ai_verified', TRUE, 'zero_uncategorized_txns'),
  ('11111111-1111-1111-1111-111111111003', 20, 'bank_recs_current', 'All bank accounts reconciled through period end', NULL, 'reconciliation', 'ai_verified', TRUE, 'all_bank_accounts_reconciled_through_period_end'),
  ('11111111-1111-1111-1111-111111111003', 30, 'credit_card_recs_current', 'All credit card accounts reconciled', NULL, 'reconciliation', 'ai_verified', TRUE, 'all_cc_accounts_reconciled_through_period_end'),
  ('11111111-1111-1111-1111-111111111003', 40, 'daily_sales_journal', 'Daily sales journal complete', 'DSR entered for every operating day in the period.', 'accruals', 'confirm_note', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111003', 50, 'tip_liability_reconciled', 'Tip liability reconciled', 'Tips owed to staff tied to payroll clearing.', 'payroll', 'confirm_note', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111003', 60, 'food_bev_inventory', 'Food & beverage inventory count entered', 'Period-end inventory count posted.', 'accruals', 'confirm_note', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111003', 70, 'gift_card_liability', 'Gift card liability updated', 'Gift card issued/redeemed activity posted.', 'accruals', 'confirm_note', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111003', 80, 'comps_discounts', 'Comps and discounts posted', 'Contra-revenue entries recorded.', 'accruals', 'confirm_note', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111003', 90, 'sales_tax_accrued', 'Sales tax liability accrued', NULL, 'tax', 'ai_verified', TRUE, 'sales_tax_liability_current'),
  ('11111111-1111-1111-1111-111111111003', 100, 'payroll_posted', 'Payroll journal entries posted', NULL, 'payroll', 'confirm_note', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111003', 110, 'management_adjustments', 'Management adjustments received and entered', NULL, 'review', 'confirm_note', TRUE, NULL)
ON CONFLICT (template_id, code) DO NOTHING;

-- Template 4: Full Close Prep — Detailed (default for Full Close engagements)
INSERT INTO close_checklist_templates (id, firm_id, name, description, is_system, industry)
VALUES (
  '11111111-1111-1111-1111-111111111004',
  NULL,
  'Full Close Prep — Detailed',
  'Heavy 17-item checklist for Full Close engagements. Evidence required on most items.',
  TRUE,
  'full_close_prep'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO close_checklist_template_items (template_id, sort_order, code, label, description, category, item_type, is_required, ai_verifier) VALUES
  ('11111111-1111-1111-1111-111111111004', 10, 'bank_statements_uploaded', 'Bank statements for period uploaded', 'PDF or CSV bank statements for every bank account.', 'reconciliation', 'file_upload', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111004', 20, 'cc_statements_uploaded', 'Credit card statements uploaded', 'Statements for every credit card account.', 'reconciliation', 'file_upload', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111004', 30, 'loan_statements_uploaded', 'Loan/line-of-credit statements uploaded', 'For any debt instruments.', 'reconciliation', 'file_upload', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111004', 40, 'zero_uncategorized_txns', 'All transactions categorized', NULL, 'reconciliation', 'ai_verified', TRUE, 'zero_uncategorized_txns'),
  ('11111111-1111-1111-1111-111111111004', 50, 'bank_recs_current', 'All bank accounts reconciled through period end', NULL, 'reconciliation', 'ai_verified', TRUE, 'all_bank_accounts_reconciled_through_period_end'),
  ('11111111-1111-1111-1111-111111111004', 60, 'credit_card_recs_current', 'All credit card accounts reconciled', NULL, 'reconciliation', 'ai_verified', TRUE, 'all_cc_accounts_reconciled_through_period_end'),
  ('11111111-1111-1111-1111-111111111004', 70, 'bills_through_period_end', 'All bills entered through period end', 'AP entered through last day of period.', 'ap_ar', 'confirm_note', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111004', 80, 'ap_current', 'AP aging reviewed, no stale over 90 days', NULL, 'ap_ar', 'ai_verified', TRUE, 'ap_aging_no_stale_over_90'),
  ('11111111-1111-1111-1111-111111111004', 90, 'ar_current', 'AR aging reviewed', NULL, 'ap_ar', 'ai_verified', TRUE, 'ar_aging_reviewed'),
  ('11111111-1111-1111-1111-111111111004', 100, 'payroll_posted', 'Payroll JEs posted through period end', NULL, 'payroll', 'confirm_note', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111004', 110, 'payroll_taxes_reconciled', 'Payroll tax liabilities reconciled to filings', 'Tie liability accounts to 941/state filings.', 'payroll', 'file_upload', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111004', 120, 'prepaid_amortization', 'Prepaid expense amortization posted', NULL, 'accruals', 'confirm_note', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111004', 130, 'depreciation_posted', 'Depreciation JE posted', NULL, 'accruals', 'confirm_note', TRUE, NULL),
  ('11111111-1111-1111-1111-111111111004', 140, 'accruals_reviewed', 'Recurring accruals posted', 'Utilities, professional fees, recurring vendor accruals.', 'accruals', 'ai_verified', TRUE, 'recurring_accruals_posted'),
  ('11111111-1111-1111-1111-111111111004', 150, 'intercompany_reconciled', 'Intercompany balances reconciled', 'If applicable.', 'reconciliation', 'manual', FALSE, NULL),
  ('11111111-1111-1111-1111-111111111004', 160, 'sales_tax_accrued', 'Sales tax liability accrued', NULL, 'tax', 'ai_verified', TRUE, 'sales_tax_liability_current'),
  ('11111111-1111-1111-1111-111111111004', 170, 'management_adjustments', 'Management adjustments received and entered', NULL, 'review', 'confirm_note', TRUE, NULL)
ON CONFLICT (template_id, code) DO NOTHING;
-- <<< end 20260703_01_create_checklist_system.sql

-- >>> begin 20260704024059_d_entitlements_legacy_stripe_rename.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260704024059
-- NAME: d_entitlements_legacy_stripe_rename
-- DATABASE_MD5_UTF8: 76b4171c8bad53b1ef0965ebf2436366
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 105
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

BEGIN;
ALTER TABLE IF EXISTS public.stripe_webhook_events RENAME TO stripe_webhook_events_legacy;
COMMIT;
-- <<< end 20260704024059_d_entitlements_legacy_stripe_rename.sql

-- >>> begin 20260707_create_close_packet_system.sql
-- ============================================================================
-- Advisacor Wave 1 — Close Packet Renderer (Doc C, Block C1)
-- Depends on Doc A (close_periods, close_checklist_runs) and firm_clients/firms.
-- ============================================================================

-- Rendered packets — one per close_periods row, versioned on each render
CREATE TABLE IF NOT EXISTS close_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  close_period_id UUID NOT NULL REFERENCES close_periods(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','review_ready','sent','signed_off','locked')),
  payload_json JSONB NOT NULL,
  pdf_url TEXT,
  pdf_hash TEXT,
  rendered_by_user_id UUID,
  rendered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_signature_json JSONB,
  UNIQUE (close_period_id, version)
);

-- Section-level authoring — each section can be manually edited by preparer/bookkeeper
CREATE TABLE IF NOT EXISTS close_packet_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id UUID NOT NULL REFERENCES close_packets(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  sort_order INT NOT NULL,
  is_included BOOLEAN NOT NULL DEFAULT TRUE,
  content_json JSONB NOT NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  edited_by_user_id UUID,
  edited_at TIMESTAMPTZ,
  UNIQUE (packet_id, section_key)
);

-- Variance thresholds per firm/client (customizable)
CREATE TABLE IF NOT EXISTS close_packet_variance_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id UUID REFERENCES firm_clients(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  pct_threshold NUMERIC NOT NULL DEFAULT 10.0,
  abs_threshold_usd NUMERIC NOT NULL DEFAULT 1000.00,
  min_baseline_usd NUMERIC NOT NULL DEFAULT 100.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((firm_client_id IS NOT NULL) OR (firm_id IS NOT NULL))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_close_packets_period ON close_packets(close_period_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_close_packet_sections_packet ON close_packet_sections(packet_id);
CREATE INDEX IF NOT EXISTS idx_variance_config_firm_client ON close_packet_variance_config(firm_client_id) WHERE firm_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_variance_config_firm ON close_packet_variance_config(firm_id) WHERE firm_id IS NOT NULL;

-- RLS
ALTER TABLE close_packets ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_packet_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_packet_variance_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage close packets" ON close_packets;
CREATE POLICY "Super admins manage close packets"
  ON close_packets FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins manage packet sections" ON close_packet_sections;
CREATE POLICY "Super admins manage packet sections"
  ON close_packet_sections FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins manage variance config" ON close_packet_variance_config;
CREATE POLICY "Super admins manage variance config"
  ON close_packet_variance_config FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');
-- <<< end 20260707_create_close_packet_system.sql

-- >>> begin 20260707_01_variance_config_unique.sql
-- ============================================================================
-- Doc C2 — unique constraints for close_packet_variance_config upserts.
-- Postgres treats NULLs as distinct, so a UNIQUE on firm_client_id still allows
-- many firm-level rows (firm_client_id NULL) and vice versa.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_variance_config_firm_client'
  ) THEN
    ALTER TABLE close_packet_variance_config
      ADD CONSTRAINT uq_variance_config_firm_client UNIQUE (firm_client_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_variance_config_firm'
  ) THEN
    ALTER TABLE close_packet_variance_config
      ADD CONSTRAINT uq_variance_config_firm UNIQUE (firm_id);
  END IF;
END $$;
-- <<< end 20260707_01_variance_config_unique.sql

-- >>> begin 20260707_02_section_manual_edit_flag.sql
-- ============================================================================
-- Advisacor Wave 1 — Close Packet Renderer (Doc C, Block C3)
-- Track manual edits to individual packet sections + an updated_at timestamp
-- so the section editor can flag hand-edited sections and record edit time.
-- ============================================================================

alter table close_packet_sections
  add column if not exists manually_edited boolean default false;

alter table close_packet_sections
  add column if not exists updated_at timestamptz default now();
-- <<< end 20260707_02_section_manual_edit_flag.sql

-- >>> begin 20260707_03_close_packet_share.sql
-- ============================================================================
-- Advisacor Wave 1 — Close Packet Renderer (Doc C, Block C4)
-- PDF artifact tracking + revocable, signed share links for locked packets.
-- ============================================================================

-- Persist the generated PDF's storage object path + timestamps on the packet.
alter table close_packets
  add column if not exists pdf_object_path text;

alter table close_packets
  add column if not exists pdf_generated_at timestamptz;

alter table close_packets
  add column if not exists locked_by_user_id uuid;

-- Revocable share tokens. Only the SHA-256 hash of the raw token is stored;
-- the raw token is shown to the creator exactly once.
create table if not exists close_packet_share_tokens (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references close_packets(id) on delete cascade,
  token_hash text not null unique,
  created_by_user_id uuid,
  label text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  access_count integer not null default 0
);

create index if not exists idx_share_tokens_packet on close_packet_share_tokens(packet_id);
create index if not exists idx_share_tokens_hash on close_packet_share_tokens(token_hash);

alter table close_packet_share_tokens enable row level security;

drop policy if exists "Super admins manage share tokens" on close_packet_share_tokens;
create policy "Super admins manage share tokens"
  on close_packet_share_tokens for all
  using ((auth.jwt() ->> 'role') = 'super_admin');

-- Atomic access counter used by recordShareAccess (with a JS fallback if absent).
create or replace function increment_share_token_access(p_token_id uuid)
returns void
language sql
as $$
  update close_packet_share_tokens
  set
    access_count = access_count + 1,
    last_accessed_at = now()
  where id = p_token_id;
$$;
-- <<< end 20260707_03_close_packet_share.sql

-- >>> begin 20260708140000_tcp1_w1_pilot_slot_number_nullable.sql
-- Phase TCP1 W1 — Corrective migration for standard-track pilot_slots rows.
--
-- The initial migration (20260708120000) required pilot_slot_number NOT NULL
-- and made (tier_key, pilot_slot_number) globally unique. That blocks the
-- second standard-track subscriber to the same tier because both would take
-- the sentinel value 1000. Fix by:
--   1. Allowing pilot_slot_number NULL for standard-track rows.
--   2. Replacing the global unique constraint with a partial unique index
--      that only enforces uniqueness for pilot_slot_number > 0 (the pilot
--      cohort and complimentary slot 0).
--
-- Additive-only: existing rows are untouched (all had slot_number >= 0).
-- Ref: LOCK-TCP1-W1-AUDIT-CORRECTIVE-PATCH-v1.0
BEGIN;
-- 1. Drop the strict slot_number check that required >= 0.
ALTER TABLE public.pilot_slots
  DROP CONSTRAINT IF EXISTS pilot_slots_slot_number_check;
ALTER TABLE public.pilot_slots
  ADD CONSTRAINT pilot_slots_slot_number_check
  CHECK (pilot_slot_number IS NULL OR pilot_slot_number >= 0);
-- 2. Allow NULL for standard-track subscribers.
ALTER TABLE public.pilot_slots
  ALTER COLUMN pilot_slot_number DROP NOT NULL;
-- 3. Replace the global unique constraint with a partial unique index.
--    Only pilot cohort slots (> 0) and complimentary slot 0 need uniqueness.
--    Standard-track NULL rows never collide.
ALTER TABLE public.pilot_slots
  DROP CONSTRAINT IF EXISTS pilot_slots_unique_slot_per_tier;
CREATE UNIQUE INDEX IF NOT EXISTS pilot_slots_unique_slot_per_tier_partial
  ON public.pilot_slots (tier_key, pilot_slot_number)
  WHERE pilot_slot_number IS NOT NULL;
COMMENT ON INDEX public.pilot_slots_unique_slot_per_tier_partial IS
  'Enforces uniqueness of pilot cohort slots (1-10) and complimentary slot 0 per tier. Standard-track subscribers with pilot_slot_number IS NULL are exempt. Ref LOCK-TCP1-W1-AUDIT-CORRECTIVE-PATCH-v1.0.';
COMMIT;
-- <<< end 20260708140000_tcp1_w1_pilot_slot_number_nullable.sql

-- >>> begin 20260708150000_tcp1_w1_pilot_slots_firm_id.sql
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
-- <<< end 20260708150000_tcp1_w1_pilot_slots_firm_id.sql

-- >>> begin 20260708200000_tcp1_w1_seat_idempotency.sql
-- Phase TCP1 W1 — Seat meter-event idempotency anchor.
-- Additive only. Adds billing_period_anchor + a period-lookup index.
-- We REUSE the existing stripe_usage_event_id column for the deterministic
-- identifier, and we REUSE the existing uq_subscription_seats_active_company
-- unique index as the app-side lifecycle guard.

-- 1) Period anchor — which billing period this seat was last billed for.
ALTER TABLE public.subscription_seats
  ADD COLUMN IF NOT EXISTS billing_period_anchor timestamptz NULL;

-- 2) Reconciliation index by period.
CREATE INDEX IF NOT EXISTS subscription_seats_period_lookup
  ON public.subscription_seats (subscription_item_id, billing_period_anchor)
  WHERE billing_period_anchor IS NOT NULL;

COMMENT ON COLUMN public.subscription_seats.billing_period_anchor IS
  'ISO period_start of the subscription when this seat was billed. Used to build deterministic Stripe meter_event identifier: sha1(subscription_item_id + company_id + iso(period_start)).';

COMMENT ON COLUMN public.subscription_seats.stripe_usage_event_id IS
  'Deterministic identifier passed to Stripe billing.meterEvents.create. Same value across retries within a billing period → Stripe deduplicates (24h window). Populated by activateSeat().';
-- <<< end 20260708200000_tcp1_w1_seat_idempotency.sql

-- >>> begin 20260708_00_d0_identity_and_memory_activation.sql
-- ============================================================================
-- Advisacor Doc D — Block D0: Identity Unification + Memory Framework Activation
-- Idempotent. Safe to re-run.
--   1. Unify firm_clients (close system) with company_id (Pulse/memory system)
--   2. Add industry_vertical + accounting_method to firm_clients
--   3. Materialize the curated rule registry + per-client rule overrides
--   4. Add panel_decision_audit + escalation_audit tables
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1.1 firm_clients: company_id, industry_vertical, accounting_method
-- ---------------------------------------------------------------------------
ALTER TABLE firm_clients
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS industry_vertical text
    CHECK (industry_vertical IN (
      'general',
      'manufacturing',
      'retail',
      'professional_services',
      'construction',
      'healthcare',
      'saas',
      'nonprofit',
      'govcon',
      'fund_accounting'
    )),
  ADD COLUMN IF NOT EXISTS accounting_method text
    CHECK (accounting_method IN ('cash', 'accrual', 'modified_cash'))
    DEFAULT 'accrual';

-- Backfill: generate a company_id for every existing firm_client that lacks one.
UPDATE firm_clients SET company_id = gen_random_uuid() WHERE company_id IS NULL;

-- Enforce NOT NULL now that all rows are populated.
ALTER TABLE firm_clients ALTER COLUMN company_id SET NOT NULL;

-- One company_id per firm_client.
CREATE UNIQUE INDEX IF NOT EXISTS idx_firm_clients_company_id ON firm_clients(company_id);

-- Safe default vertical for existing rows.
UPDATE firm_clients SET industry_vertical = 'general' WHERE industry_vertical IS NULL;

-- ---------------------------------------------------------------------------
-- 1.2 close_periods.firm_client_id (already present in this schema — guard anyway)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'close_periods' AND column_name = 'firm_client_id'
  ) THEN
    ALTER TABLE close_periods ADD COLUMN firm_client_id uuid REFERENCES firm_clients(id);
    UPDATE close_periods cp
    SET firm_client_id = fc.id
    FROM firm_clients fc
    WHERE fc.company_id = cp.company_id
      AND cp.firm_client_id IS NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1.3 curated_rules_registry
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS curated_rules_registry (
  rule_id text PRIMARY KEY,
  rule_name text NOT NULL,
  rule_category text NOT NULL CHECK (rule_category IN (
    'balance_check',
    'period_check',
    'anomaly_detection',
    'accrual_check',
    'revenue_recognition',
    'depreciation',
    'amortization',
    'duplicate_detection',
    'vertical_specific'
  )),
  vertical text NOT NULL CHECK (vertical IN (
    'general',
    'manufacturing',
    'retail',
    'professional_services',
    'construction',
    'healthcare',
    'saas',
    'nonprofit',
    'govcon',
    'fund_accounting'
  )),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  logic_file_path text NOT NULL,
  description text NOT NULL,
  applies_to_cash_basis boolean NOT NULL DEFAULT true,
  applies_to_accrual_basis boolean NOT NULL DEFAULT true,
  requires_history_months integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rules_vertical ON curated_rules_registry(vertical) WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 1.4 client_active_rules (per-client enable/override; empty until onboarding)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_active_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id uuid NOT NULL REFERENCES firm_clients(id) ON DELETE CASCADE,
  rule_id text NOT NULL REFERENCES curated_rules_registry(rule_id),
  is_enabled boolean NOT NULL DEFAULT true,
  override_severity text CHECK (override_severity IN ('info', 'warning', 'error', 'critical')),
  disabled_reason text,
  disabled_by_user_id uuid,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(firm_client_id, rule_id)
);

CREATE INDEX IF NOT EXISTS idx_client_rules_client ON client_active_rules(firm_client_id) WHERE is_enabled = true;

-- ---------------------------------------------------------------------------
-- 1.5 panel_decision_audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS panel_decision_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id uuid REFERENCES firm_clients(id) ON DELETE CASCADE,
  close_period_id uuid REFERENCES close_periods(id) ON DELETE CASCADE,
  caller_persona_handle text NOT NULL,
  industry_handle text NOT NULL,
  topic_handle text NOT NULL,
  treatment_request_id text NOT NULL,
  work_item_summary text,
  routing_decision jsonb NOT NULL,
  panel_advisories jsonb DEFAULT '[]',
  hire_up_recommendation jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panel_audit_client ON panel_decision_audit(firm_client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_panel_audit_period ON panel_decision_audit(close_period_id) WHERE close_period_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 1.6 escalation_audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS escalation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id uuid REFERENCES firm_clients(id) ON DELETE CASCADE,
  close_period_id uuid REFERENCES close_periods(id) ON DELETE CASCADE,
  escalation_reason text NOT NULL,
  from_persona text,
  to_persona text,
  triggered_by text NOT NULL CHECK (triggered_by IN ('automatic', 'user', 'rule_engine')),
  context jsonb DEFAULT '{}',
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escalation_audit_client ON escalation_audit(firm_client_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS (super_admin manage; service role bypasses RLS)
-- ---------------------------------------------------------------------------
ALTER TABLE curated_rules_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_active_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_decision_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage curated rules" ON curated_rules_registry;
CREATE POLICY "Super admins manage curated rules"
  ON curated_rules_registry FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins manage client active rules" ON client_active_rules;
CREATE POLICY "Super admins manage client active rules"
  ON client_active_rules FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins manage panel decision audit" ON panel_decision_audit;
CREATE POLICY "Super admins manage panel decision audit"
  ON panel_decision_audit FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Super admins manage escalation audit" ON escalation_audit;
CREATE POLICY "Super admins manage escalation audit"
  ON escalation_audit FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');

-- ---------------------------------------------------------------------------
-- 1.7 Seed 8 general rules
-- ---------------------------------------------------------------------------
INSERT INTO curated_rules_registry (rule_id, rule_name, rule_category, vertical, severity, logic_file_path, description, applies_to_cash_basis, applies_to_accrual_basis, requires_history_months)
VALUES
  ('gen.je_balance_check', 'JE Balance Check', 'balance_check', 'general', 'critical',
   'lib/rules/logic/general/je_balance_check.ts',
   'Every journal entry must have debits equal to credits.',
   true, true, 0),
  ('gen.je_period_check', 'JE Period Check', 'period_check', 'general', 'error',
   'lib/rules/logic/general/je_period_check.ts',
   'Journal entries must post to the correct accounting period, not to a locked prior period.',
   true, true, 0),
  ('gen.cash_negative_check', 'Cash Account Negative Check', 'anomaly_detection', 'general', 'warning',
   'lib/rules/logic/general/cash_negative_check.ts',
   'Cash and bank accounts should not carry negative balances at period end.',
   true, true, 0),
  ('gen.ap_missed_vendor_check', 'AP Missed Vendor Check', 'accrual_check', 'general', 'warning',
   'lib/rules/logic/general/ap_missed_vendor_check.ts',
   'Detect vendors historically paid monthly that have no bill or accrual this period.',
   false, true, 3),
  ('gen.revenue_cutoff_check', 'Revenue Cutoff Check', 'revenue_recognition', 'general', 'error',
   'lib/rules/logic/general/revenue_cutoff_check.ts',
   'Revenue must be recognized in the period earned; check for ship dates or delivery dates crossing period end.',
   false, true, 0),
  ('gen.depreciation_scheduled_check', 'Depreciation Scheduled Check', 'depreciation', 'general', 'warning',
   'lib/rules/logic/general/depreciation_scheduled_check.ts',
   'Recurring monthly depreciation entries must post each period based on fixed asset register.',
   false, true, 1),
  ('gen.prepaid_amortization_check', 'Prepaid Amortization Check', 'amortization', 'general', 'warning',
   'lib/rules/logic/general/prepaid_amortization_check.ts',
   'Recurring monthly prepaid expense amortization must post each period.',
   false, true, 1),
  ('gen.duplicate_vendor_bill_check', 'Duplicate Vendor Bill Check', 'duplicate_detection', 'general', 'warning',
   'lib/rules/logic/general/duplicate_vendor_bill_check.ts',
   'Detect potential duplicate bills from the same vendor with the same amount within 30 days.',
   true, true, 0)
ON CONFLICT (rule_id) DO NOTHING;
-- <<< end 20260708_00_d0_identity_and_memory_activation.sql

-- >>> begin 20260705_d67_p1_ar_cash_app_layer0_layer1.sql
-- ============================================================================
-- Phase D6.7 Part 1 — AR Cash Application Layer 0 + Layer 1
-- Adds:
--   - customers table (AR payer registry) + email_domain column
--   - 5 new tables (ar_cash_app_remittances, _remittance_lines, _payments,
--                    _match_candidates, _config)
--   - 9 new cash_app ledger event types (enforced in lib/events/publisher.ts)
--   - RLS on all new tables (firm_id scoped)
--   - Default config row per existing firm_clients
-- ============================================================================

-- ---------- 0. customers (AR payer registry — table did not exist pre-D6.7) ----------
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL,
  name text,
  email_domain text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_company
  ON public.customers (company_id);

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS email_domain text;

CREATE INDEX IF NOT EXISTS idx_customers_email_domain
  ON public.customers (company_id, email_domain)
  WHERE email_domain IS NOT NULL;

COMMENT ON COLUMN public.customers.email_domain IS
  'Primary billing domain for cash-app payer resolution. Auto-populated on first unambiguous match. Future D6.8 customer_contacts table becomes source of truth for multi-contact scenarios; this column remains the fast-path lookup.';

-- ---------- 1. ar_cash_app_remittances (Layer 0 raw ingest) ----------
CREATE TABLE IF NOT EXISTS public.ar_cash_app_remittances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL,
  source_channel text NOT NULL CHECK (source_channel IN (
    'postmark_inbound',
    'bank_feed_memo',
    'edi_820',
    'iso20022_camt054',
    'iso20022_pacs008',
    'lockbox_file',
    'manual_upload',
    'portal_paste'
  )),
  source_message_id text,
  raw_payload jsonb NOT NULL,
  raw_body_text text,
  raw_attachments jsonb DEFAULT '[]'::jsonb,
  sender_email text,
  sender_domain text,
  subject text,
  received_at timestamptz NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  parse_status text NOT NULL DEFAULT 'pending' CHECK (parse_status IN (
    'pending', 'parsed', 'parse_failed', 'duplicate'
  )),
  parse_error text,
  dedup_hash text NOT NULL UNIQUE,
  assertions_addressed text[] DEFAULT ARRAY['completeness']::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_remittances_inbox
  ON public.ar_cash_app_remittances (firm_id, company_id, ingested_at DESC);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_remittances_worker
  ON public.ar_cash_app_remittances (company_id, parse_status)
  WHERE parse_status = 'pending';

-- ---------- 2. ar_cash_app_remittance_lines ----------
CREATE TABLE IF NOT EXISTS public.ar_cash_app_remittance_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remittance_id uuid NOT NULL REFERENCES public.ar_cash_app_remittances(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL,
  line_number int NOT NULL,
  invoice_reference text,
  invoice_reference_normalized text,
  amount_paid numeric(18,2),
  amount_discount numeric(18,2) DEFAULT 0,
  amount_deduction numeric(18,2) DEFAULT 0,
  deduction_reason_hint text,
  currency text NOT NULL DEFAULT 'USD',
  payment_date_hint date,
  raw_line_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (remittance_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_lines_matcher_lookup
  ON public.ar_cash_app_remittance_lines (company_id, invoice_reference_normalized)
  WHERE invoice_reference_normalized IS NOT NULL;

-- ---------- 3. ar_cash_app_payments (payment envelope) ----------
CREATE TABLE IF NOT EXISTS public.ar_cash_app_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL,
  payment_source text NOT NULL CHECK (payment_source IN (
    'bank_feed', 'stripe_payout', 'manual_entry',
    'ach_direct', 'wire', 'check_deposit', 'credit_card'
  )),
  external_payment_id text,
  payer_name_raw text,
  payer_name_normalized text,
  customer_id uuid,
  amount_received numeric(18,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  payment_date date NOT NULL,
  posted_to_gl_account_id uuid,
  memo_raw text,
  linked_remittance_id uuid REFERENCES public.ar_cash_app_remittances(id) ON DELETE SET NULL,
  pairing_confidence numeric(5,4),
  pairing_method text CHECK (pairing_method IN (
    'exact_ref', 'exact_amount_date', 'payer_email_domain',
    'manual', 'unpaired'
  )),
  match_status text NOT NULL DEFAULT 'unmatched' CHECK (match_status IN (
    'unmatched', 'matched', 'partial_match', 'in_review', 'applied', 'voided'
  )),
  assertions_addressed text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, payment_source, external_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_payments_queue
  ON public.ar_cash_app_payments (company_id, match_status, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_payments_payer
  ON public.ar_cash_app_payments (company_id, payer_name_normalized)
  WHERE payer_name_normalized IS NOT NULL;

-- ---------- 4. ar_cash_app_match_candidates ----------
CREATE TABLE IF NOT EXISTS public.ar_cash_app_match_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.ar_cash_app_payments(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  matched_amount numeric(18,2) NOT NULL,
  match_strategy text NOT NULL CHECK (match_strategy IN (
    'exact_ref_exact_amt',
    'exact_ref_tolerance',
    'exact_amt_open_invoice',
    'remittance_line_ref',
    'single_open_invoice_exact_amt',
    'payer_domain_scoped_ref_amt'
  )),
  confidence numeric(5,4) NOT NULL,
  tolerance_used_cents int DEFAULT 0,
  tolerance_used_days int DEFAULT 0,
  rationale text NOT NULL,
  posted_je_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_candidates_payment
  ON public.ar_cash_app_match_candidates (payment_id);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_candidates_invoice
  ON public.ar_cash_app_match_candidates (company_id, invoice_id);

-- ---------- 5. ar_cash_app_config ----------
CREATE TABLE IF NOT EXISTS public.ar_cash_app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL UNIQUE,
  exact_amount_tolerance_cents int NOT NULL DEFAULT 0,
  date_window_days_backward int NOT NULL DEFAULT 150,
  date_window_days_forward int NOT NULL DEFAULT 7,
  enable_single_open_invoice_shortcut boolean NOT NULL DEFAULT true,
  undeposited_funds_gl_account_id uuid,
  require_reviewer_approval boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ar_cash_app_config (firm_id, company_id)
SELECT firm_id, company_id
FROM public.firm_clients
ON CONFLICT (company_id) DO NOTHING;

-- ---------- 6. ledger_events event types ----------
-- No event_type CHECK exists on ledger_events; cash_app event types are enforced
-- in lib/events/publisher.ts (CASH_APP_EVENT_TYPES allowlist). New types:
--   remittance_ingested, remittance_parsed, payment_ingested,
--   match_candidate_proposed, match_candidate_approved, match_candidate_rejected,
--   cash_applied_to_invoice, cash_app_config_updated, customer_email_domain_learned

-- ---------- 7. RLS enable + policies ----------
ALTER TABLE public.customers                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_cash_app_remittances       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_cash_app_remittance_lines  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_cash_app_payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_cash_app_match_candidates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_cash_app_config            ENABLE ROW LEVEL SECURITY;

-- customers
DROP POLICY IF EXISTS tbl_customers_select ON public.customers;
DROP POLICY IF EXISTS tbl_customers_insert ON public.customers;
DROP POLICY IF EXISTS tbl_customers_update ON public.customers;
DROP POLICY IF EXISTS tbl_customers_service_role ON public.customers;
CREATE POLICY tbl_customers_select ON public.customers FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_customers_insert ON public.customers FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_customers_update ON public.customers FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_customers_service_role ON public.customers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ar_cash_app_remittances
DROP POLICY IF EXISTS tbl_ar_cash_app_remittances_select ON public.ar_cash_app_remittances;
DROP POLICY IF EXISTS tbl_ar_cash_app_remittances_insert ON public.ar_cash_app_remittances;
DROP POLICY IF EXISTS tbl_ar_cash_app_remittances_update ON public.ar_cash_app_remittances;
DROP POLICY IF EXISTS tbl_ar_cash_app_remittances_service_role ON public.ar_cash_app_remittances;
CREATE POLICY tbl_ar_cash_app_remittances_select ON public.ar_cash_app_remittances FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_remittances_insert ON public.ar_cash_app_remittances FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_remittances_update ON public.ar_cash_app_remittances FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_remittances_service_role ON public.ar_cash_app_remittances FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ar_cash_app_remittance_lines
DROP POLICY IF EXISTS tbl_ar_cash_app_remittance_lines_select ON public.ar_cash_app_remittance_lines;
DROP POLICY IF EXISTS tbl_ar_cash_app_remittance_lines_insert ON public.ar_cash_app_remittance_lines;
DROP POLICY IF EXISTS tbl_ar_cash_app_remittance_lines_update ON public.ar_cash_app_remittance_lines;
DROP POLICY IF EXISTS tbl_ar_cash_app_remittance_lines_service_role ON public.ar_cash_app_remittance_lines;
CREATE POLICY tbl_ar_cash_app_remittance_lines_select ON public.ar_cash_app_remittance_lines FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_remittance_lines_insert ON public.ar_cash_app_remittance_lines FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_remittance_lines_update ON public.ar_cash_app_remittance_lines FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_remittance_lines_service_role ON public.ar_cash_app_remittance_lines FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ar_cash_app_payments
DROP POLICY IF EXISTS tbl_ar_cash_app_payments_select ON public.ar_cash_app_payments;
DROP POLICY IF EXISTS tbl_ar_cash_app_payments_insert ON public.ar_cash_app_payments;
DROP POLICY IF EXISTS tbl_ar_cash_app_payments_update ON public.ar_cash_app_payments;
DROP POLICY IF EXISTS tbl_ar_cash_app_payments_service_role ON public.ar_cash_app_payments;
CREATE POLICY tbl_ar_cash_app_payments_select ON public.ar_cash_app_payments FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_payments_insert ON public.ar_cash_app_payments FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_payments_update ON public.ar_cash_app_payments FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_payments_service_role ON public.ar_cash_app_payments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ar_cash_app_match_candidates
DROP POLICY IF EXISTS tbl_ar_cash_app_match_candidates_select ON public.ar_cash_app_match_candidates;
DROP POLICY IF EXISTS tbl_ar_cash_app_match_candidates_insert ON public.ar_cash_app_match_candidates;
DROP POLICY IF EXISTS tbl_ar_cash_app_match_candidates_update ON public.ar_cash_app_match_candidates;
DROP POLICY IF EXISTS tbl_ar_cash_app_match_candidates_service_role ON public.ar_cash_app_match_candidates;
CREATE POLICY tbl_ar_cash_app_match_candidates_select ON public.ar_cash_app_match_candidates FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_match_candidates_insert ON public.ar_cash_app_match_candidates FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_match_candidates_update ON public.ar_cash_app_match_candidates FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_match_candidates_service_role ON public.ar_cash_app_match_candidates FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ar_cash_app_config
DROP POLICY IF EXISTS tbl_ar_cash_app_config_select ON public.ar_cash_app_config;
DROP POLICY IF EXISTS tbl_ar_cash_app_config_insert ON public.ar_cash_app_config;
DROP POLICY IF EXISTS tbl_ar_cash_app_config_update ON public.ar_cash_app_config;
DROP POLICY IF EXISTS tbl_ar_cash_app_config_service_role ON public.ar_cash_app_config;
CREATE POLICY tbl_ar_cash_app_config_select ON public.ar_cash_app_config FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_config_insert ON public.ar_cash_app_config FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_config_update ON public.ar_cash_app_config FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_config_service_role ON public.ar_cash_app_config FOR ALL TO service_role
  USING (true) WITH CHECK (true);
-- <<< end 20260705_d67_p1_ar_cash_app_layer0_layer1.sql

-- >>> begin 20260706_d67_p2_layer2_layer4.sql
-- ============================================================================
-- Phase D6.7 Part 2 — AR Cash Application Layer 2 (probabilistic + tiered LLM)
--                     + Layer 4 (human review queue) + cross-tenant patterns
-- Adds:
--   - ar_cash_app_match_scores      (Layer 2 scoring breakdown)
--   - ar_cash_app_review_items      (Layer 4 queue rows)
--   - cash_app_payer_patterns_global (anonymized cross-tenant patterns)
--   - firm_llm_config               (per-firm LLM tier + threshold knobs)
--   - 7 new cash_app ledger event types (enforced in lib/events/cash-app-catalog.ts)
--   - RLS on all new tenant-scoped tables
--   - service-role-write / authenticated-read-only RLS on the global table
--   - Default firm_llm_config row per existing firm_clients
-- ============================================================================

-- ---------- 1. firm_llm_config ----------
CREATE TABLE IF NOT EXISTS public.firm_llm_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL UNIQUE,
  layer2_escalation_threshold numeric(4,3) NOT NULL DEFAULT 0.750
    CHECK (layer2_escalation_threshold >= 0 AND layer2_escalation_threshold <= 1),
  layer2_llm_primary_tier text NOT NULL DEFAULT 'primary'
    CHECK (layer2_llm_primary_tier IN ('primary', 'toptier', 'haiku')),
  layer2_llm_escalation_tier text NOT NULL DEFAULT 'toptier'
    CHECK (layer2_llm_escalation_tier IN ('primary', 'toptier', 'haiku')),
  cross_tenant_pattern_contribution_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_firm_llm_config_company
  ON public.firm_llm_config (company_id);

COMMENT ON TABLE public.firm_llm_config IS
  'Per-firm knobs for Layer 2 tiered LLM reasoning. layer2_escalation_threshold governs the Sonnet 4.6 -> Sonnet 5 -> Layer 4 ladder (D6.7 Part 2 Q1/Q1a/Q1b). cross_tenant_pattern_contribution_enabled is a firm-level opt-out from contributing (not reading) to cash_app_payer_patterns_global; reads of the global table are controlled separately by the generic-payer classifier gate, not this flag.';

INSERT INTO public.firm_llm_config (firm_id, company_id)
SELECT firm_id, company_id
FROM public.firm_clients
ON CONFLICT (company_id) DO NOTHING;

-- ---------- 2. ar_cash_app_match_scores (Layer 2 scoring breakdown) ----------
CREATE TABLE IF NOT EXISTS public.ar_cash_app_match_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL,
  payment_id uuid NOT NULL REFERENCES public.ar_cash_app_payments(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL,
  fuzzy_payer_name_score numeric(5,4) NOT NULL,
  amount_tolerance_score numeric(5,4) NOT NULL,
  date_proximity_score numeric(5,4) NOT NULL,
  historical_payer_behavior_score numeric(5,4) NOT NULL,
  global_pattern_score numeric(5,4) NOT NULL DEFAULT 0,
  global_pattern_contribution_capped boolean NOT NULL DEFAULT false,
  aggregate_feature_score numeric(5,4) NOT NULL,
  llm_tier_used text CHECK (llm_tier_used IS NULL OR llm_tier_used IN ('primary', 'toptier', 'haiku')),
  llm_confidence numeric(5,4),
  llm_reasoning_excerpt text,
  llm_preferred_candidate boolean NOT NULL DEFAULT false,
  escalated_to_toptier boolean NOT NULL DEFAULT false,
  final_confidence numeric(5,4) NOT NULL,
  verdict text NOT NULL CHECK (verdict IN (
    'auto_match_candidate', 'route_to_review', 'no_plausible_candidate'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_match_scores_payment
  ON public.ar_cash_app_match_scores (payment_id);
CREATE INDEX IF NOT EXISTS idx_ar_cash_app_match_scores_invoice
  ON public.ar_cash_app_match_scores (company_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_ar_cash_app_match_scores_verdict
  ON public.ar_cash_app_match_scores (company_id, verdict);

COMMENT ON TABLE public.ar_cash_app_match_scores IS
  'Layer 2 (D6.7 Part 2) feature-by-feature scoring breakdown for one payment x candidate-invoice pair, including which LLM tier was used and the resulting verdict. One row per (payment_id, invoice_id) candidate evaluated by Layer 2.';

-- ---------- 3. ar_cash_app_review_items (Layer 4 queue) ----------
CREATE TABLE IF NOT EXISTS public.ar_cash_app_review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL,
  payment_id uuid NOT NULL REFERENCES public.ar_cash_app_payments(id) ON DELETE CASCADE,
  top_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  llm_reasoning_excerpt text,
  llm_confidence numeric(5,4),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'resolved', 'dismissed'
  )),
  resolved_action text CHECK (resolved_action IS NULL OR resolved_action IN (
    'accept', 'reject', 'write_off', 'on_account', 'split'
  )),
  resolved_by uuid,
  resolved_at timestamptz,
  write_off_amount numeric(18,2),
  write_off_gl_account_id uuid,
  on_account_customer_id uuid,
  split_allocations jsonb,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_review_item_resolution_fields CHECK (
    (status = 'pending' AND resolved_action IS NULL AND resolved_by IS NULL AND resolved_at IS NULL)
    OR (status IN ('resolved', 'dismissed'))
  )
);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_review_items_queue
  ON public.ar_cash_app_review_items (company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ar_cash_app_review_items_payment
  ON public.ar_cash_app_review_items (payment_id);
CREATE INDEX IF NOT EXISTS idx_ar_cash_app_review_items_pending
  ON public.ar_cash_app_review_items (company_id, created_at)
  WHERE status = 'pending';

COMMENT ON TABLE public.ar_cash_app_review_items IS
  'Layer 4 (D6.7 Part 2) human review queue. top_candidates is a JSON array of {invoice_id, matched_amount, confidence, feature_breakdown, llm_reasoning} objects surfaced to the reviewer. split_allocations is only populated when resolved_action=split: [{invoice_id, amount}, ...].';

-- ---------- 4. cash_app_payer_patterns_global (cross-tenant, anonymized) ----------
CREATE TABLE IF NOT EXISTS public.cash_app_payer_patterns_global (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_fingerprint text NOT NULL UNIQUE,
  normalized_entity_name text NOT NULL,
  sample_count int NOT NULL DEFAULT 1,
  contributing_tenant_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  weight numeric(5,4) NOT NULL DEFAULT 0.1000
    CHECK (weight >= 0 AND weight <= 0.3),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_app_payer_patterns_global_fingerprint
  ON public.cash_app_payer_patterns_global (pattern_fingerprint);
CREATE INDEX IF NOT EXISTS idx_cash_app_payer_patterns_global_entity
  ON public.cash_app_payer_patterns_global (normalized_entity_name);

COMMENT ON TABLE public.cash_app_payer_patterns_global IS
  'D6.7 Part 2 Q3=B: cross-tenant learning restricted to generic-payer patterns only (public companies, national banks, major utilities -- gated by lib/cash-app/payer-pattern-classifier.ts::isGenericEnoughToPool). No firm-specific or personally-identifying payer data is stored here; pattern_fingerprint is a hash of the normalized generic entity name, never raw payer text tied to a specific customer relationship. contributing_tenant_ids records which firm_ids contributed samples for audit purposes only, never surfaced to other tenants. weight is capped at 0.3 and is the MAXIMUM contribution this pattern can make to a single Layer 2 aggregate confidence score (lib/cash-app/layer2-features.ts::globalPatternScore). This table is NOT the full cross-tenant learning system (Q3=C) -- that requires the ToS data-pooling amendment and is out of scope for Part 2.';

-- ---------- 5. ledger_events event types ----------
-- No event_type CHECK exists on ledger_events; cash_app event types are enforced
-- in lib/events/cash-app-catalog.ts (CASH_APP_EVENT_TYPES allowlist).
-- Part 1 types (flat snake_case):
--   remittance_ingested, remittance_parsed, payment_ingested,
--   match_candidate_proposed, match_candidate_approved, match_candidate_rejected,
--   cash_applied_to_invoice, cash_app_config_updated, customer_email_domain_learned
-- Part 2 additions (cash_app.* dotted prefix):
--   cash_app.layer2_scored, cash_app.layer2_escalated_to_toptier,
--   cash_app.layer2_dropped_to_review, cash_app.review_item_created,
--   cash_app.review_item_resolved, cash_app.pattern_learned, cash_app.pattern_matched

-- ---------- 6. RLS enable + policies ----------
ALTER TABLE public.firm_llm_config                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_cash_app_match_scores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_cash_app_review_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_app_payer_patterns_global    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tbl_firm_llm_config_select ON public.firm_llm_config;
DROP POLICY IF EXISTS tbl_firm_llm_config_insert ON public.firm_llm_config;
DROP POLICY IF EXISTS tbl_firm_llm_config_update ON public.firm_llm_config;
DROP POLICY IF EXISTS tbl_firm_llm_config_service_role ON public.firm_llm_config;
CREATE POLICY tbl_firm_llm_config_select
  ON public.firm_llm_config FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_firm_llm_config_insert
  ON public.firm_llm_config FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_firm_llm_config_update
  ON public.firm_llm_config FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_firm_llm_config_service_role ON public.firm_llm_config FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tbl_ar_cash_app_match_scores_select ON public.ar_cash_app_match_scores;
DROP POLICY IF EXISTS tbl_ar_cash_app_match_scores_insert ON public.ar_cash_app_match_scores;
DROP POLICY IF EXISTS tbl_ar_cash_app_match_scores_update ON public.ar_cash_app_match_scores;
DROP POLICY IF EXISTS tbl_ar_cash_app_match_scores_service_role ON public.ar_cash_app_match_scores;
CREATE POLICY tbl_ar_cash_app_match_scores_select
  ON public.ar_cash_app_match_scores FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_match_scores_insert
  ON public.ar_cash_app_match_scores FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_match_scores_update
  ON public.ar_cash_app_match_scores FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_match_scores_service_role ON public.ar_cash_app_match_scores FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tbl_ar_cash_app_review_items_select ON public.ar_cash_app_review_items;
DROP POLICY IF EXISTS tbl_ar_cash_app_review_items_insert ON public.ar_cash_app_review_items;
DROP POLICY IF EXISTS tbl_ar_cash_app_review_items_update ON public.ar_cash_app_review_items;
DROP POLICY IF EXISTS tbl_ar_cash_app_review_items_service_role ON public.ar_cash_app_review_items;
CREATE POLICY tbl_ar_cash_app_review_items_select
  ON public.ar_cash_app_review_items FOR SELECT
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_review_items_insert
  ON public.ar_cash_app_review_items FOR INSERT
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_review_items_update
  ON public.ar_cash_app_review_items FOR UPDATE
  USING (firm_id = (auth.jwt() ->> 'firm_id')::uuid)
  WITH CHECK (firm_id = (auth.jwt() ->> 'firm_id')::uuid);
CREATE POLICY tbl_ar_cash_app_review_items_service_role ON public.ar_cash_app_review_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tbl_cash_app_payer_patterns_global_select_authenticated ON public.cash_app_payer_patterns_global;
DROP POLICY IF EXISTS tbl_cash_app_payer_patterns_global_write_service_role ON public.cash_app_payer_patterns_global;
DROP POLICY IF EXISTS tbl_cash_app_payer_patterns_global_update_service_role ON public.cash_app_payer_patterns_global;
CREATE POLICY tbl_cash_app_payer_patterns_global_select_authenticated
  ON public.cash_app_payer_patterns_global FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY tbl_cash_app_payer_patterns_global_write_service_role
  ON public.cash_app_payer_patterns_global FOR INSERT
  TO service_role
  WITH CHECK (true);
CREATE POLICY tbl_cash_app_payer_patterns_global_update_service_role
  ON public.cash_app_payer_patterns_global FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
-- <<< end 20260706_d67_p2_layer2_layer4.sql

-- >>> begin 20260708_01_d1_qbo_write_readiness.sql
-- ============================================================================
-- Advisacor Doc D — Block D1: QBO Write Readiness
-- Idempotent. Additive only. No changes to existing OAuth or read paths.
--   1. Per-firm_client write feature flag + health-check tracking columns
--   2. Unified QBO connection view across accounting_connections + erp_connections
--   3. Health-check audit trail table
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1.1 firm_clients write-flag + health columns
-- ---------------------------------------------------------------------------
ALTER TABLE firm_clients
  ADD COLUMN IF NOT EXISTS qbo_write_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qbo_write_enabled_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS qbo_write_enabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS qbo_last_health_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS qbo_last_health_check_status text
    CHECK (qbo_last_health_check_status IN (
      'healthy','token_expired','refresh_failed','realm_invalid','scope_missing','unknown_error'
    ));

CREATE INDEX IF NOT EXISTS idx_firm_clients_qbo_write_enabled
  ON firm_clients(qbo_write_enabled) WHERE qbo_write_enabled = true;

-- ---------------------------------------------------------------------------
-- 1.2 Unified connection view
-- Built with dynamic SQL so the migration is safe whether or not the legacy
-- erp_connections table exists in this environment. accounting_connections is
-- always present (created in 20260531). When erp_connections exists we UNION it.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  base_sql text := $view$
    SELECT
      'accounting_connections'::text AS source_table,
      ac.id AS connection_id,
      ac.user_id,
      ac.access_token,
      ac.refresh_token,
      ac.tenant_or_realm_id AS realm_id,
      ac.token_expires_at AS token_expiry,
      ac.scopes AS granted_scopes,
      ac.status,
      ac.created_at,
      ac.updated_at
    FROM accounting_connections ac
    WHERE ac.provider = 'quickbooks'
      AND ac.status = 'connected'
  $view$;
  erp_sql text := $erp$
    UNION ALL
    SELECT
      'erp_connections'::text AS source_table,
      ec.id AS connection_id,
      ec.user_id,
      ec.access_token,
      ec.refresh_token,
      ec.realm_id,
      ec.token_expiry,
      ARRAY['com.intuit.quickbooks.accounting']::text[] AS granted_scopes,
      'connected'::text AS status,
      ec.created_at,
      ec.updated_at
    FROM erp_connections ec
    WHERE ec.platform = 'quickbooks'
  $erp$;
BEGIN
  IF to_regclass('public.erp_connections') IS NOT NULL THEN
    EXECUTE 'CREATE OR REPLACE VIEW qbo_connections_unified AS ' || base_sql || erp_sql;
  ELSE
    EXECUTE 'CREATE OR REPLACE VIEW qbo_connections_unified AS ' || base_sql;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1.3 Health check audit trail
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qbo_health_check_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id uuid NOT NULL REFERENCES firm_clients(id) ON DELETE CASCADE,
  check_status text NOT NULL CHECK (check_status IN (
    'healthy','token_expired','refresh_failed','realm_invalid','scope_missing','unknown_error'
  )),
  token_source text CHECK (token_source IN ('erp_connections','accounting_connections','none')),
  realm_id text,
  granted_scopes text[],
  error_message text,
  latency_ms integer,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qbo_health_client_time
  ON qbo_health_check_log(firm_client_id, checked_at DESC);

ALTER TABLE qbo_health_check_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage qbo health log" ON qbo_health_check_log;
CREATE POLICY "Super admins manage qbo health log"
  ON qbo_health_check_log FOR ALL
  USING ((auth.jwt() ->> 'role') = 'super_admin');
-- <<< end 20260708_01_d1_qbo_write_readiness.sql

-- >>> begin 20260708_02_d1_1_owner_user_id_backfill.sql
-- ============================================================================
-- Advisacor Doc D — Block D1.1: owner_user_id backfill for seeded firm_clients
-- Idempotent. Links the 4 seeded firm_clients to the super_admin user so the
-- QBO read path (getQboForFirmClient -> resolveQBOTokenForFirmClient) can
-- complete end-to-end in tests.
--
-- NOTE: the actual seeded firm_client IDs all share the prefix
-- 71111111-1111-4111-8111-* (confirmed live), not the 72../73../74.. IDs from
-- the original spec draft. Using the real IDs here.
-- ============================================================================

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'mwiseman@advisacor.com'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    UPDATE firm_clients
    SET owner_user_id = admin_user_id
    WHERE owner_user_id IS NULL
      AND id IN (
        '71111111-1111-4111-8111-111111111111',
        '71111111-1111-4111-8111-222222222222',
        '71111111-1111-4111-8111-333333333333',
        '71111111-1111-4111-8111-444444444444'
      );
  END IF;
END $$;

-- Index for the frequent owner_user_id lookup in the resolver.
CREATE INDEX IF NOT EXISTS idx_firm_clients_owner_user_id
  ON firm_clients(owner_user_id) WHERE owner_user_id IS NOT NULL;
-- <<< end 20260708_02_d1_1_owner_user_id_backfill.sql

-- >>> begin 20260709070000_tcp1_w2_5_review_assist_tier_key_expand.sql
-- Phase TCP1 W2.5 — Review Assist tier_key CHECK expansion.
-- LOCK-TCP1-W2-5-REVIEW-ASSIST-BLOCK-2-2026-07-09
--
-- Rationale: Review Assist ($99/mo, $990/yr) launches W2.5 as a firm-tier SKU.
-- Live Stripe SKUs exist (Block 1). Need to add 'review_assist' to
-- pilot_slots_tier_key_check so checkout.session.completed webhook can insert
-- a pilot_slots row for Review Assist subscribers.
--
-- Safety:
--   - Additive only. Existing 8 tier_key values preserved verbatim.
--   - pilot_slots is empty in prod (David Prussen baseline is the only row,
--     tier_key='solo_bookkeeper', unaffected).
--   - No backfill. No data mutation.
--   - Idempotent: DROP IF EXISTS then CREATE.
--
-- Values (superset of prior constraint from 20260708120000):
--   'solo_bookkeeper','owner_lite','owner_pro','accounting_pro',
--   'firm','enterprise_firm','industry_premium','client_seat_alacarte',
--   'review_assist'   -- NEW

BEGIN;

ALTER TABLE public.pilot_slots
  DROP CONSTRAINT IF EXISTS pilot_slots_tier_key_check;

ALTER TABLE public.pilot_slots
  ADD CONSTRAINT pilot_slots_tier_key_check
  CHECK (tier_key IN (
    'solo_bookkeeper',
    'owner_lite',
    'owner_pro',
    'accounting_pro',
    'firm',
    'enterprise_firm',
    'industry_premium',
    'client_seat_alacarte',
    'review_assist'
  ));

COMMENT ON CONSTRAINT pilot_slots_tier_key_check ON public.pilot_slots IS
  'Allowed pilot_slots.tier_key values. Extended for Review Assist W2.5.';

COMMIT;
-- <<< end 20260709070000_tcp1_w2_5_review_assist_tier_key_expand.sql

-- >>> begin 20260709_00_d2_safe_je_posting.sql
-- === D2: Safe JE Posting Infrastructure ===

-- 1. Idempotency + attempt tracking
CREATE TABLE IF NOT EXISTS je_post_attempts (
  attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id uuid NOT NULL REFERENCES firm_clients(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  qbo_je_id text,
  status text NOT NULL CHECK (status IN ('pending', 'posted', 'rejected', 'failed', 'reversed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_client_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_je_post_attempts_firm_client
  ON je_post_attempts(firm_client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_je_post_attempts_qbo_je_id
  ON je_post_attempts(qbo_je_id) WHERE qbo_je_id IS NOT NULL;

-- 2. Append-only audit trail
CREATE TABLE IF NOT EXISTS je_posting_audit (
  audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES je_post_attempts(attempt_id) ON DELETE RESTRICT,
  firm_client_id uuid NOT NULL REFERENCES firm_clients(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('rule', 'anomaly', 'flux', 'manual', 'reversal')),
  source_id text,
  posted_by text NOT NULL CHECK (posted_by IN ('ai', 'human')),
  posted_by_user_id uuid REFERENCES auth.users(id),
  qbo_je_id text,
  dr_total numeric(18,2) NOT NULL,
  cr_total numeric(18,2) NOT NULL,
  transaction_date date NOT NULL,
  narration text,
  status text NOT NULL CHECK (status IN ('posted', 'rejected', 'failed', 'reversed')),
  rejection_reason text,
  qbo_error_json jsonb,
  reversal_of_attempt_id uuid REFERENCES je_post_attempts(attempt_id),
  payload_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_je_posting_audit_firm_client
  ON je_posting_audit(firm_client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_je_posting_audit_source
  ON je_posting_audit(source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_je_posting_audit_status
  ON je_posting_audit(status);

-- 3. Immutability trigger
CREATE OR REPLACE FUNCTION prevent_je_audit_update()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'je_posting_audit is append-only';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_je_audit_immutable ON je_posting_audit;
CREATE TRIGGER trg_je_audit_immutable
  BEFORE UPDATE OR DELETE ON je_posting_audit
  FOR EACH ROW EXECUTE FUNCTION prevent_je_audit_update();

-- 4. Auto-update je_post_attempts.updated_at
CREATE OR REPLACE FUNCTION touch_je_post_attempts()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_je_post_attempts_touch ON je_post_attempts;
CREATE TRIGGER trg_je_post_attempts_touch
  BEFORE UPDATE ON je_post_attempts
  FOR EACH ROW EXECUTE FUNCTION touch_je_post_attempts();

-- 5. RLS — service-role-only access (consistent with other D-series audit tables).
--    Service role bypasses RLS; this denies direct client reads/writes.
ALTER TABLE je_post_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE je_posting_audit ENABLE ROW LEVEL SECURITY;
-- <<< end 20260709_00_d2_safe_je_posting.sql

-- >>> begin 20260704_0100_d6_4a_je_evidence_attachments_backup.sql
-- D6.4a: Universal JE Evidence + Attachment + Backup Packet Foundation
-- Adds:
--   je_line_evidence      -- per-line structured provenance
--   je_line_attachments   -- per-line source doc references (points to storage)
--   je_backup_packets     -- one PDF backup packet per posted JE (content-addressed)
-- All three FK to je_post_attempts(attempt_id) — the canonical JE identity.
-- Storage: creates 'je-backup' bucket (private, 50MB, PDF+image mime types).
-- RLS: mirror je_post_attempts / je_posting_audit — enabled, zero policies (service-role-only).

BEGIN;

-- === je_line_evidence ===
CREATE TABLE IF NOT EXISTS public.je_line_evidence (
  evidence_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id            UUID NOT NULL REFERENCES public.je_post_attempts(attempt_id) ON DELETE CASCADE,
  firm_client_id        UUID NOT NULL,
  line_index            INTEGER NOT NULL CHECK (line_index >= 0),
  evidence_type         TEXT NOT NULL CHECK (evidence_type IN (
    'qbo_bill','qbo_invoice','qbo_payment','qbo_transaction','qbo_journal_entry',
    'plaid_transaction','bank_statement','credit_card_statement',
    'vendor_invoice_ocr','customer_invoice_ocr','contract_document','signed_agreement',
    'system_calculation','memory_pattern','manual_override','other'
  )),
  source_type           TEXT NOT NULL,
  source_id             TEXT,
  source_key            JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_amount         NUMERIC,
  source_date           DATE,
  evidence_summary      TEXT NOT NULL,
  calculation_notes     TEXT,
  originating_rule_id   TEXT,
  originating_fire_id   UUID,
  content_hash          TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS je_line_evidence_attempt_idx
  ON public.je_line_evidence(attempt_id, line_index);
CREATE INDEX IF NOT EXISTS je_line_evidence_firm_client_idx
  ON public.je_line_evidence(firm_client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS je_line_evidence_source_idx
  ON public.je_line_evidence(source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS je_line_evidence_source_key_idx
  ON public.je_line_evidence USING gin (source_key);

COMMENT ON TABLE public.je_line_evidence IS
  'D6.4a: Structured per-line provenance for every JE. One row per line of a proposed or posted JE. Required by composer contract (see lib/je-evidence/contract.ts).';

-- === je_line_attachments ===
CREATE TABLE IF NOT EXISTS public.je_line_attachments (
  attachment_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id       UUID NOT NULL REFERENCES public.je_line_evidence(evidence_id) ON DELETE CASCADE,
  attempt_id        UUID NOT NULL REFERENCES public.je_post_attempts(attempt_id) ON DELETE CASCADE,
  firm_client_id    UUID NOT NULL,
  line_index        INTEGER NOT NULL,
  storage_bucket    TEXT NOT NULL DEFAULT 'je-backup',
  storage_path      TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type         TEXT NOT NULL,
  byte_size         BIGINT NOT NULL CHECK (byte_size > 0),
  sha256            TEXT NOT NULL,
  ingested_from     TEXT NOT NULL CHECK (ingested_from IN (
    'qbo_attachable','plaid_statement_pdf','ocr_upload','manual_upload','system_generated'
  )),
  ingested_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ingested_by       TEXT NOT NULL DEFAULT 'system',
  UNIQUE (attempt_id, line_index, sha256)
);

CREATE INDEX IF NOT EXISTS je_line_attachments_evidence_idx
  ON public.je_line_attachments(evidence_id);
CREATE INDEX IF NOT EXISTS je_line_attachments_firm_client_idx
  ON public.je_line_attachments(firm_client_id, ingested_at DESC);

COMMENT ON TABLE public.je_line_attachments IS
  'D6.4a: Source document files supporting a JE line evidence record. Files stored in storage.buckets.je-backup, path scoped by firm_client_id.';

-- === je_backup_packets ===
CREATE TABLE IF NOT EXISTS public.je_backup_packets (
  packet_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id        UUID NOT NULL REFERENCES public.je_post_attempts(attempt_id) ON DELETE CASCADE,
  firm_client_id    UUID NOT NULL,
  close_period_id   UUID REFERENCES public.close_periods(id) ON DELETE SET NULL,
  storage_bucket    TEXT NOT NULL DEFAULT 'je-backup',
  storage_path      TEXT NOT NULL,
  sha256            TEXT NOT NULL,
  byte_size         BIGINT NOT NULL CHECK (byte_size > 0),
  generation_status TEXT NOT NULL DEFAULT 'generated' CHECK (generation_status IN (
    'pending','generated','failed','superseded'
  )),
  generation_error  TEXT,
  generator_version TEXT NOT NULL DEFAULT 'd6.4a-v1',
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (attempt_id, sha256)
);

CREATE INDEX IF NOT EXISTS je_backup_packets_firm_client_idx
  ON public.je_backup_packets(firm_client_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS je_backup_packets_close_period_idx
  ON public.je_backup_packets(close_period_id) WHERE close_period_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS je_backup_packets_attempt_idx
  ON public.je_backup_packets(attempt_id, generated_at DESC);

COMMENT ON TABLE public.je_backup_packets IS
  'D6.4a: PDF backup packet generated once a JE is posted. Content-addressed by sha256; regeneration produces a new row rather than overwriting. Bookkeeper/client-facing.';

-- === Storage bucket: je-backup ===
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'je-backup',
  'je-backup',
  false,
  52428800,
  ARRAY['application/pdf','image/png','image/jpeg','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- === RLS — mirror je_post_attempts / je_posting_audit (enabled, zero policies) ===
ALTER TABLE public.je_line_evidence    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.je_line_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.je_backup_packets   ENABLE ROW LEVEL SECURITY;

-- === Storage RLS — mirror close-packets bucket policy ===
DROP POLICY IF EXISTS je_backup_service_role_all ON storage.objects;
CREATE POLICY je_backup_service_role_all
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'je-backup')
  WITH CHECK (bucket_id = 'je-backup');

COMMIT;
-- <<< end 20260704_0100_d6_4a_je_evidence_attachments_backup.sql

-- >>> begin 20260706120000_d_platform_event_sourced_foundation.sql
-- Phase D-Platform: Event-Sourced Ledger Foundation
-- Migration: 20260706120000_d_platform_event_sourced_foundation
-- Base commit: 4268659
-- Additive-only. No existing tables modified except je_posting_audit CHECK.

BEGIN;

-- ============================================================================
-- 1. pgvector extension for AI-native queries (populated by later phases)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 2. Firm hierarchy expansion — engagements + portcos
--    Unified model: firms → clients (bookkeeping)
--                    firms → engagements → portcos (CFO firms)
--                    direct owner (no firm) still supported via firm_clients.firm_id nullable
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.engagements (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                UUID NOT NULL REFERENCES public.firms(id) ON DELETE RESTRICT,
  engagement_name        TEXT NOT NULL,
  engagement_type        TEXT NOT NULL CHECK (engagement_type IN ('bookkeeping','fractional_cfo','audit_prep','tax_prep','advisory','one_time')),
  status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('prospect','onboarding','active','paused','offboarded','completed')),
  start_date             DATE,
  end_date               DATE,
  monthly_fee_cents      BIGINT,
  scope_json             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             TEXT,
  UNIQUE (firm_id, engagement_name)
);
CREATE INDEX IF NOT EXISTS idx_engagements_firm ON public.engagements(firm_id);
CREATE INDEX IF NOT EXISTS idx_engagements_status ON public.engagements(status) WHERE status='active';

CREATE TABLE IF NOT EXISTS public.portcos (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id          UUID NOT NULL REFERENCES public.engagements(id) ON DELETE RESTRICT,
  firm_client_id         UUID REFERENCES public.firm_clients(id) ON DELETE SET NULL,
  portco_name            TEXT NOT NULL,
  legal_name             TEXT,
  ein                    TEXT,
  sector                 TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (engagement_id, portco_name)
);
CREATE INDEX IF NOT EXISTS idx_portcos_engagement ON public.portcos(engagement_id);
CREATE INDEX IF NOT EXISTS idx_portcos_firm_client ON public.portcos(firm_client_id) WHERE firm_client_id IS NOT NULL;

COMMENT ON TABLE public.engagements IS 'CFO firm / accounting firm engagement lifecycle. Firms without engagements (pure bookkeeping) do not need rows here.';
COMMENT ON TABLE public.portcos IS 'Portfolio companies under a CFO engagement. Each portco can optionally link to a firm_client for QBO connection.';

-- ============================================================================
-- 3. ledger_events — immutable append-only event log
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ledger_events (
  event_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_sequence         BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY,
  event_type             TEXT NOT NULL,
  event_category         TEXT NOT NULL CHECK (event_category IN (
    'intake',             -- Universal Intake events (bill received, remit received, doc received)
    'ledger',             -- JE posted, JE reversed, account balance changed
    'cash_app',           -- Payment matched, payment unapplied, remittance parsed
    'ar',                 -- Invoice sent, reminder sent, aging changed
    'ap',                 -- Bill approved, bill paid, accrual created
    'recon',              -- Reconciliation performed, variance detected
    'close',              -- Period opened, period locked, close packet generated
    'assertion',          -- Assertion coverage computed, gap detected, gap remediated
    'rule',               -- Rule fired, rule proposed JE
    'directive',          -- Client directive applied
    'ai_action',          -- LLM took an action
    'system'              -- Health, sync, error
  )),
  event_version          INTEGER NOT NULL DEFAULT 1,  -- Schema version for event_payload
  firm_id                UUID REFERENCES public.firms(id) ON DELETE RESTRICT,
  firm_client_id         UUID REFERENCES public.firm_clients(id) ON DELETE RESTRICT,
  engagement_id          UUID REFERENCES public.engagements(id) ON DELETE RESTRICT,
  portco_id              UUID REFERENCES public.portcos(id) ON DELETE RESTRICT,
  close_period_id        TEXT,  -- Nullable; not all events are close-period-scoped
  aggregate_type         TEXT NOT NULL,  -- 'bill', 'invoice', 'payment', 'je', 'account', etc.
  aggregate_id           TEXT NOT NULL,  -- Domain-key of the thing this event is about
  actor_type             TEXT NOT NULL CHECK (actor_type IN ('user','system','ai_agent','integration','rule','recurring')),
  actor_id               TEXT,  -- User email, system component name, agent name
  event_payload          JSONB NOT NULL,
  event_metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Correlation IDs, request IDs, trace IDs
  causation_event_id     UUID REFERENCES public.ledger_events(event_id),  -- What event caused this event
  correlation_id         UUID,  -- Groups related events into a business transaction
  occurred_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- Always NOW() at insert
  CONSTRAINT ledger_events_scope_check CHECK (
    -- Must be scoped to at least one of: firm, firm_client, engagement, portco
    firm_id IS NOT NULL OR firm_client_id IS NOT NULL OR engagement_id IS NOT NULL OR portco_id IS NOT NULL
  )
);

-- Enforce immutability: no UPDATE, no DELETE
CREATE OR REPLACE FUNCTION public.ledger_events_prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ledger_events is append-only; UPDATE/DELETE is forbidden';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_events_no_update
  BEFORE UPDATE ON public.ledger_events
  FOR EACH ROW EXECUTE FUNCTION public.ledger_events_prevent_mutation();

CREATE TRIGGER ledger_events_no_delete
  BEFORE DELETE ON public.ledger_events
  FOR EACH ROW EXECUTE FUNCTION public.ledger_events_prevent_mutation();

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ledger_events_aggregate
  ON public.ledger_events(aggregate_type, aggregate_id, event_sequence);
CREATE INDEX IF NOT EXISTS idx_ledger_events_firm_client_time
  ON public.ledger_events(firm_client_id, occurred_at DESC)
  WHERE firm_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_events_close_period
  ON public.ledger_events(close_period_id, event_category)
  WHERE close_period_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_events_correlation
  ON public.ledger_events(correlation_id)
  WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_events_category_time
  ON public.ledger_events(event_category, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_events_type_time
  ON public.ledger_events(event_type, occurred_at DESC);

-- Notify listeners on every insert
CREATE OR REPLACE FUNCTION public.ledger_events_notify()
RETURNS TRIGGER AS $$
DECLARE
  channel_name TEXT;
BEGIN
  channel_name := 'ledger_events_' || NEW.event_category;
  PERFORM pg_notify(channel_name, json_build_object(
    'event_id', NEW.event_id,
    'event_sequence', NEW.event_sequence,
    'event_type', NEW.event_type,
    'firm_client_id', NEW.firm_client_id,
    'aggregate_type', NEW.aggregate_type,
    'aggregate_id', NEW.aggregate_id,
    'occurred_at', NEW.occurred_at
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_events_notify_trigger
  AFTER INSERT ON public.ledger_events
  FOR EACH ROW EXECUTE FUNCTION public.ledger_events_notify();

COMMENT ON TABLE public.ledger_events IS 'Immutable append-only event log. Every state change in Advisacor is emitted here. Projections derive from this stream.';

-- ============================================================================
-- 4. event_projections — registry of projection workers + their positions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_projections (
  projection_name        TEXT PRIMARY KEY,
  description            TEXT,
  event_categories       TEXT[] NOT NULL,  -- Which categories this projection subscribes to
  last_processed_seq     BIGINT NOT NULL DEFAULT 0,
  processed_count        BIGINT NOT NULL DEFAULT 0,
  error_count            BIGINT NOT NULL DEFAULT 0,
  last_error             TEXT,
  last_error_at          TIMESTAMPTZ,
  status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','error','rebuilding')),
  worker_lock_holder     TEXT,  -- Which worker instance currently holds the lock
  worker_lock_expires_at TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.event_projections IS 'Registry of projection workers. Each row tracks how far a projection has caught up in the event stream.';

-- ============================================================================
-- 5. ai_action_log — every LLM-driven system action logged
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_action_log (
  action_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id         UUID REFERENCES public.firm_clients(id) ON DELETE RESTRICT,
  action_type            TEXT NOT NULL,  -- 'ocr_extract', 'cash_app_reason', 'dunning_draft', 'assertion_reason', etc.
  action_category        TEXT NOT NULL CHECK (action_category IN (
    'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
    'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
    'agent_close_walkthrough','other'
  )),
  model_name             TEXT NOT NULL,  -- 'claude-3-5-sonnet-20241022', 'gpt-4o-2024-11-20', etc.
  model_provider         TEXT NOT NULL CHECK (model_provider IN ('anthropic','openai','google','aws_bedrock','local')),
  input_summary          TEXT,  -- Short description; full input NOT stored to keep table lean
  input_hash             TEXT,  -- SHA-256 of input for dedup / replay
  input_ref_uri          TEXT,  -- Optional S3 URI to full input if needed for replay
  output_summary         TEXT,
  output_hash            TEXT,
  output_ref_uri         TEXT,
  confidence             NUMERIC(4,3),  -- 0.000 to 1.000
  latency_ms             INTEGER,
  cost_usd               NUMERIC(10,6),
  input_tokens           INTEGER,
  output_tokens          INTEGER,
  temperature            NUMERIC(3,2),
  seed                   BIGINT,  -- If model call was deterministic
  human_reviewed         BOOLEAN NOT NULL DEFAULT FALSE,
  human_approved         BOOLEAN,
  human_reviewer         TEXT,
  human_review_note      TEXT,
  linked_event_id        UUID REFERENCES public.ledger_events(event_id),
  correlation_id         UUID,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_action_log_firm_client_time
  ON public.ai_action_log(firm_client_id, created_at DESC)
  WHERE firm_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_action_log_category_time
  ON public.ai_action_log(action_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_action_log_correlation
  ON public.ai_action_log(correlation_id)
  WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_action_log_needs_review
  ON public.ai_action_log(created_at DESC)
  WHERE human_reviewed = FALSE;
COMMENT ON TABLE public.ai_action_log IS 'Audit trail for every LLM-driven action. Enables decision transparency, cost tracking, and replay.';

-- ============================================================================
-- 6. vector_index — pgvector storage for embeddings (populated by later phases)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vector_index (
  vector_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id         UUID REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  namespace              TEXT NOT NULL,  -- 'vendor_templates', 'invoice_content', 'transaction_memo', 'rule_descriptions', etc.
  aggregate_type         TEXT NOT NULL,
  aggregate_id           TEXT NOT NULL,
  content_text           TEXT NOT NULL,
  content_hash           TEXT NOT NULL,
  embedding              VECTOR(1536),  -- Compatible with OpenAI text-embedding-3-small and Voyage v2
  embedding_model        TEXT NOT NULL,
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (firm_client_id, namespace, aggregate_type, aggregate_id)
);
CREATE INDEX IF NOT EXISTS idx_vector_index_firm_ns
  ON public.vector_index(firm_client_id, namespace)
  WHERE firm_client_id IS NOT NULL;
-- IVFFlat index for approximate nearest neighbor search
-- Note: pgvector recommends creating this AFTER initial data load; leaving commented for D6.5 to enable
-- CREATE INDEX IF NOT EXISTS idx_vector_index_embedding
--   ON public.vector_index USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
COMMENT ON TABLE public.vector_index IS 'Vector embeddings for AI-native semantic search. Populated by D6.5 (vendor templates), D6.7 (payment memos), D8 (JE narratives).';

-- ============================================================================
-- 7. platform_metrics — SLO tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_metrics (
  metric_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id         UUID REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  metric_name            TEXT NOT NULL,  -- 'close_duration_hours', 'categorization_latency_ms', 'je_post_latency_ms', 'intake_to_bill_latency_ms', etc.
  metric_value           NUMERIC NOT NULL,
  metric_unit            TEXT NOT NULL,  -- 'ms', 'seconds', 'hours', 'count', 'percentage'
  dimensions             JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Free-form breakdown (rule_id, source_type, etc.)
  slo_target             NUMERIC,  -- What we're targeting
  slo_met                BOOLEAN,  -- Whether metric_value meets slo_target (direction depends on metric)
  recorded_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_name_time
  ON public.platform_metrics(metric_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_firm_time
  ON public.platform_metrics(firm_client_id, recorded_at DESC)
  WHERE firm_client_id IS NOT NULL;
COMMENT ON TABLE public.platform_metrics IS 'SLO tracking. Populated by all phases. Report surface: are we hitting our cutting-edge targets.';

-- ============================================================================
-- 8. Expand je_posting_audit source_type CHECK to include new categories
-- ============================================================================
ALTER TABLE public.je_posting_audit DROP CONSTRAINT IF EXISTS je_posting_audit_source_type_check;
ALTER TABLE public.je_posting_audit ADD CONSTRAINT je_posting_audit_source_type_check
  CHECK (source_type IN (
    'rule','anomaly','flux','manual','reversal','recurring',
    -- New from D-Platform onward:
    'intake','cash_app','ar_orchestration','assertion_remediation','event_projection'
  ));

-- ============================================================================
-- 9. Row-Level Security scaffolding
--    Enable RLS on new tables. Policies added below.
-- ============================================================================
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portcos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vector_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

-- Service role bypass (Advisacor backend uses service key)
CREATE POLICY "service_role_all_engagements" ON public.engagements FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_portcos" ON public.portcos FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_ledger_events" ON public.ledger_events FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_event_projections" ON public.event_projections FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_ai_action_log" ON public.ai_action_log FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_vector_index" ON public.vector_index FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_platform_metrics" ON public.platform_metrics FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Authenticated user policies: users can see events for firms they belong to
-- (Client-scoped RLS is layered in D6.4d; these are firm-level guards)
CREATE POLICY "firm_members_read_engagements" ON public.engagements FOR SELECT TO authenticated
  USING (firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()));
CREATE POLICY "firm_members_read_portcos" ON public.portcos FOR SELECT TO authenticated
  USING (engagement_id IN (
    SELECT id FROM public.engagements
    WHERE firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid())
  ));
CREATE POLICY "firm_members_read_ledger_events" ON public.ledger_events FOR SELECT TO authenticated
  USING (
    firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid())
    OR firm_client_id IN (
      SELECT id FROM public.firm_clients
      WHERE firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "firm_members_read_ai_action_log" ON public.ai_action_log FOR SELECT TO authenticated
  USING (
    firm_client_id IN (
      SELECT id FROM public.firm_clients
      WHERE firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid())
    )
  );

-- ============================================================================
-- 10. Seed event_projections registry with placeholder rows for phases to come
--     Each subsequent phase will INSERT its own projection row.
-- ============================================================================
INSERT INTO public.event_projections (projection_name, description, event_categories)
VALUES
  ('_healthcheck', 'Baseline projection to verify event bus is alive', ARRAY['system']::TEXT[])
ON CONFLICT (projection_name) DO NOTHING;

COMMIT;
-- <<< end 20260706120000_d_platform_event_sourced_foundation.sql

-- >>> begin 20260706130000_d_entitlements.sql
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
-- <<< end 20260706130000_d_entitlements.sql

-- >>> begin 20260706140000_d_entitlements_followup.sql
-- ============================================================================
-- Phase D-Entitlements-Followup — Legacy Stripe Webhook Reconciliation
-- ============================================================================
-- Purpose:
--   1) Backfill the 4 pre-D-Entitlements Stripe webhook rows from
--      stripe_webhook_events_legacy into the new stripe_webhook_events table.
--   2) Preserve legacy-only columns (api_version, subscription_id,
--      processing_ms, error_message) inside raw_payload.__legacy_meta so no
--      data is lost when the legacy table is dropped in a later migration.
--   3) Append one row to entitlement_check_audit that annotates the existing
--      test-marker row (id=1) — since the table is append-only, annotation
--      requires appending, not updating.
--   4) Mark stripe_webhook_events_legacy for drop in a follow-up migration
--      one week out (verify-then-drop pattern).
--
-- Depends on: 20260706130000_d_entitlements.sql
-- Additive-only. Idempotent (ON CONFLICT DO NOTHING everywhere).
-- ============================================================================
BEGIN;
-- ----------------------------------------------------------------------------
-- 1. Backfill legacy rows into new stripe_webhook_events
-- ----------------------------------------------------------------------------
-- Map legacy columns to new schema.
--   legacy.status  → new.processing_status (both use the same 'processed' value)
--   legacy.payload → new.raw_payload (with __legacy_meta appended)
--   legacy.processed_at → new.processed_at
--   legacy-only columns → embedded in raw_payload.__legacy_meta
--
-- Idempotency: ON CONFLICT (stripe_event_id) DO NOTHING. Running twice is safe.
--
-- We only backfill rows whose legacy status is one of the values allowed by
-- the new CHECK constraint: 'received','processing','processed','skipped','failed'.
-- Any legacy row with an unknown status is left in the legacy table for
-- manual review (there are none today, but this makes the migration robust).
INSERT INTO public.stripe_webhook_events (
  stripe_event_id,
  event_type,
  received_at,
  processed_at,
  processing_status,
  processing_error,
  raw_payload,
  livemode
)
SELECT
  l.stripe_event_id,
  l.event_type,
  l.received_at,
  l.processed_at,
  CASE
    WHEN l.status IN ('received','processing','processed','skipped','failed') THEN l.status
    ELSE 'processed'  -- fallback for pre-existing rows with legacy-only status values
  END AS processing_status,
  l.error_message,
  jsonb_set(
    COALESCE(l.payload, '{}'::jsonb),
    '{__legacy_meta}',
    jsonb_build_object(
      'source', 'stripe_webhook_events_legacy',
      'backfilled_at', to_jsonb(NOW()),
      'api_version', l.api_version,
      'subscription_id', l.subscription_id,
      'processing_ms', l.processing_ms,
      'legacy_status', l.status
    ),
    true
  ) AS raw_payload,
  l.livemode
FROM public.stripe_webhook_events_legacy l
ON CONFLICT (stripe_event_id) DO NOTHING;
-- ----------------------------------------------------------------------------
-- 2. Verify backfill completeness (defensive assertion)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  legacy_count INT;
  backfilled_count INT;
BEGIN
  SELECT COUNT(*) INTO legacy_count FROM public.stripe_webhook_events_legacy;
  SELECT COUNT(*) INTO backfilled_count
    FROM public.stripe_webhook_events
    WHERE raw_payload ? '__legacy_meta';
  IF backfilled_count < legacy_count THEN
    RAISE EXCEPTION
      'D-Entitlements-Followup backfill incomplete: legacy=%, backfilled=%',
      legacy_count, backfilled_count;
  END IF;
  RAISE NOTICE 'D-Entitlements-Followup backfill OK: legacy=%, backfilled=%',
    legacy_count, backfilled_count;
END $$;
-- ----------------------------------------------------------------------------
-- 3. Annotation row for the test-marker in entitlement_check_audit
-- ----------------------------------------------------------------------------
-- The append-only trigger correctly blocks UPDATE on the existing test row
-- (id=1, caller='verify'). To document it, we APPEND a new row that references
-- the original. This is the correct pattern for append-only logs.
--
-- We only insert if the marker row exists AND has not already been annotated
-- (idempotent).
DO $$
DECLARE
  marker_exists BOOLEAN;
  annotation_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.entitlement_check_audit
    WHERE id = 1 AND caller = 'verify'
  ) INTO marker_exists;
  SELECT EXISTS(
    SELECT 1 FROM public.entitlement_check_audit
    WHERE caller = 'ops:d-entitlements-followup'
      AND reason = 'annotation'
      AND (metadata->>'annotates_row_id')::INT = 1
  ) INTO annotation_exists;
  IF marker_exists AND NOT annotation_exists THEN
    INSERT INTO public.entitlement_check_audit (
      addon_code, allowed, caller, reason, actor_type, actor_id, metadata
    ) VALUES (
      'ap_intake',
      FALSE,
      'ops:d-entitlements-followup',
      'annotation',
      'system',
      'migration:20260706140000',
      jsonb_build_object(
        'annotates_row_id', 1,
        'note', 'Row id=1 (caller=verify) was a post-migration append-only trigger verification. Not a real gate check. Left in place because the append-only invariant is intentional.'
      )
    );
  END IF;
END $$;
-- ----------------------------------------------------------------------------
-- 4. Mark legacy table as scheduled for drop
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.stripe_webhook_events_legacy IS
  'DEPRECATED — legacy Stripe webhook idempotency table. Rows backfilled into stripe_webhook_events on 2026-07-06 via D-Entitlements-Followup. Scheduled for DROP in a follow-up migration on or after 2026-07-13 pending confirmation that no code writes to it. Do not add new rows.';
COMMIT;
-- <<< end 20260706140000_d_entitlements_followup.sql

-- >>> begin 20260707000000_d6_5_part1_universal_intake.sql
-- ============================================================================
-- Phase D6.5 Part 1 — Universal Intake Bus
-- Adds:
--   - intake_messages                (raw inbound messages, all channels)
--   - intake_attachments             (per-attachment blobs + SHA256 hash)
--   - intake_dispatch_log            (which handler ran, outcome, timing)
--   - firm_intake_addresses          (per-firm/handler routable addresses w/ HMAC token)
--   - firm_intake_handlers           (per-firm handler enable/disable)
--   - firm_intake_settings           (per-firm LLM classifier knobs)
--   - intake_message ledger events   (enforced in lib/events/intake-catalog.ts)
--   - RLS on all tenant-scoped tables
-- Backward-compat:
--   - ar_cash_app_remittances gains intake_message_id (nullable FK) so the
--     existing cash-app ingestion path becomes a handler outcome, not the
--     primary insert.
-- ============================================================================

-- ---------- 1. intake_messages ----------
CREATE TABLE IF NOT EXISTS public.intake_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid,
  company_id uuid,
  firm_client_id uuid,
  source_channel text NOT NULL
    CHECK (source_channel IN ('postmark_inbound','manual_upload','api_forward')),
  source_message_id text NOT NULL,
  recipient_address text,
  recipient_prefix text,
  recipient_firm_slug text,
  recipient_token text,
  recipient_resolution text NOT NULL DEFAULT 'unresolved'
    CHECK (recipient_resolution IN ('unresolved','address_matched','sender_domain_matched','classifier_matched','manual')),
  sender_email text,
  sender_domain text,
  subject text,
  received_at timestamptz NOT NULL,
  raw_body_text text,
  raw_body_html text,
  raw_headers jsonb,
  raw_payload jsonb NOT NULL,
  content_hash text NOT NULL,
  dedup_key text NOT NULL,
  is_duplicate boolean NOT NULL DEFAULT false,
  duplicate_of uuid REFERENCES public.intake_messages(id),
  dispatch_status text NOT NULL DEFAULT 'pending'
    CHECK (dispatch_status IN ('pending','dispatched','handler_success','handler_failed','no_handler','duplicate')),
  dispatch_handler_key text,
  dispatch_reason text,
  dispatch_confidence numeric(4,3),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT intake_messages_dedup_unique UNIQUE (dedup_key)
);

CREATE INDEX IF NOT EXISTS idx_intake_messages_content_hash
  ON public.intake_messages(content_hash);
CREATE INDEX IF NOT EXISTS idx_intake_messages_firm_status
  ON public.intake_messages(firm_id, dispatch_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intake_messages_recipient
  ON public.intake_messages(recipient_prefix, recipient_firm_slug, recipient_token);

-- ---------- 2. intake_attachments ----------
CREATE TABLE IF NOT EXISTS public.intake_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_message_id uuid NOT NULL REFERENCES public.intake_messages(id) ON DELETE CASCADE,
  firm_id uuid,
  company_id uuid,
  filename text NOT NULL,
  content_type text NOT NULL,
  content_length integer NOT NULL,
  content_sha256 text NOT NULL,
  content_base64 text NOT NULL,
  is_duplicate_of uuid REFERENCES public.intake_attachments(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_attachments_sha256
  ON public.intake_attachments(firm_id, content_sha256);
CREATE INDEX IF NOT EXISTS idx_intake_attachments_message
  ON public.intake_attachments(intake_message_id);

-- ---------- 3. intake_dispatch_log ----------
CREATE TABLE IF NOT EXISTS public.intake_dispatch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_message_id uuid NOT NULL REFERENCES public.intake_messages(id) ON DELETE CASCADE,
  firm_id uuid,
  company_id uuid,
  handler_key text NOT NULL,
  outcome text NOT NULL
    CHECK (outcome IN ('success','failed','skipped_no_entitlement','skipped_disabled','skipped_not_applicable')),
  outcome_detail jsonb,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_dispatch_log_message
  ON public.intake_dispatch_log(intake_message_id);
CREATE INDEX IF NOT EXISTS idx_intake_dispatch_log_firm_handler
  ON public.intake_dispatch_log(firm_id, handler_key, created_at DESC);

-- ---------- 4. firm_intake_addresses ----------
CREATE TABLE IF NOT EXISTS public.firm_intake_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL,
  handler_key text NOT NULL,
  firm_slug text NOT NULL,
  token text NOT NULL,
  full_address text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT firm_intake_addresses_unique UNIQUE (handler_key, firm_slug, token)
);

CREATE INDEX IF NOT EXISTS idx_firm_intake_addresses_firm_client
  ON public.firm_intake_addresses(firm_id, company_id, enabled);
CREATE INDEX IF NOT EXISTS idx_firm_intake_addresses_lookup
  ON public.firm_intake_addresses(handler_key, firm_slug, token)
  WHERE enabled = true;

-- ---------- 5. firm_intake_handlers ----------
CREATE TABLE IF NOT EXISTS public.firm_intake_handlers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL,
  handler_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  required_entitlement text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT firm_intake_handlers_unique UNIQUE (company_id, handler_key)
);

CREATE INDEX IF NOT EXISTS idx_firm_intake_handlers_firm
  ON public.firm_intake_handlers(firm_id, enabled);

-- ---------- 6. firm_intake_settings ----------
CREATE TABLE IF NOT EXISTS public.firm_intake_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  company_id uuid NOT NULL UNIQUE,
  classifier_enabled boolean NOT NULL DEFAULT true,
  classifier_tier text NOT NULL DEFAULT 'primary'
    CHECK (classifier_tier IN ('primary','toptier','haiku')),
  classifier_confidence_floor numeric(4,3) NOT NULL DEFAULT 0.700
    CHECK (classifier_confidence_floor >= 0 AND classifier_confidence_floor <= 1),
  fallback_handler_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- 7. ar_cash_app_remittances backfill link ----------
ALTER TABLE public.ar_cash_app_remittances
  ADD COLUMN IF NOT EXISTS intake_message_id uuid REFERENCES public.intake_messages(id);

CREATE INDEX IF NOT EXISTS idx_ar_cash_app_remittances_intake_message
  ON public.ar_cash_app_remittances(intake_message_id);

-- ---------- 8. RLS ----------
ALTER TABLE public.intake_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_dispatch_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_intake_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_intake_handlers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_intake_settings ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped SELECT/INSERT/UPDATE by firm (firm_memberships, not firm_members)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'intake_messages',
    'intake_attachments',
    'intake_dispatch_log',
    'firm_intake_addresses',
    'firm_intake_handlers',
    'firm_intake_settings'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_select ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY %I_tenant_select ON public.%I
      FOR SELECT TO authenticated
      USING (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships
          WHERE user_id = auth.uid()
        )
      )
    $p$, t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_insert ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY %I_tenant_insert ON public.%I
      FOR INSERT TO authenticated
      WITH CHECK (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships
          WHERE user_id = auth.uid()
        )
      )
    $p$, t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_update ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY %I_tenant_update ON public.%I
      FOR UPDATE TO authenticated
      USING (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships
          WHERE user_id = auth.uid()
        )
      )
    $p$, t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I_service_role ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY %I_service_role ON public.%I
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true)
    $p$, t, t);
  END LOOP;
END $$;

-- ---------- 9. Default settings + handler rows for existing firm_clients ----------
-- required_entitlement uses real Doc D addon codes (engagement_addons.addon_code):
-- ar_cash_app / ap_intake — not the paste-block placeholders ar_cash_application / ap_bill_pay.
INSERT INTO public.firm_intake_settings (firm_id, company_id)
SELECT firm_id, company_id
FROM public.firm_clients
WHERE company_id IS NOT NULL
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO public.firm_intake_handlers (firm_id, company_id, handler_key, enabled, required_entitlement)
SELECT firm_id, company_id, 'cash_app_remit', true, 'ar_cash_app'
FROM public.firm_clients
WHERE company_id IS NOT NULL
ON CONFLICT (company_id, handler_key) DO NOTHING;

INSERT INTO public.firm_intake_handlers (firm_id, company_id, handler_key, enabled, required_entitlement)
SELECT firm_id, company_id, 'bills', false, 'ap_intake'
FROM public.firm_clients
WHERE company_id IS NOT NULL
ON CONFLICT (company_id, handler_key) DO NOTHING;

INSERT INTO public.firm_intake_handlers (firm_id, company_id, handler_key, enabled, required_entitlement)
SELECT firm_id, company_id, 'docs', true, NULL
FROM public.firm_clients
WHERE company_id IS NOT NULL
ON CONFLICT (company_id, handler_key) DO NOTHING;

-- ---------- 10. updated_at triggers ----------
CREATE OR REPLACE FUNCTION public._intake_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'intake_messages','firm_intake_handlers','firm_intake_settings'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch_updated_at ON public.%I', t, t);
    EXECUTE format($p$
      CREATE TRIGGER %I_touch_updated_at
      BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public._intake_touch_updated_at()
    $p$, t, t);
  END LOOP;
END $$;

-- ---------- 11. Allow pre-routing intake events without firm scope ----------
ALTER TABLE public.ledger_events DROP CONSTRAINT IF EXISTS ledger_events_scope_check;
ALTER TABLE public.ledger_events ADD CONSTRAINT ledger_events_scope_check CHECK (
  firm_id IS NOT NULL
  OR firm_client_id IS NOT NULL
  OR engagement_id IS NOT NULL
  OR portco_id IS NOT NULL
  OR (
    event_category = 'intake'
    AND event_type IN (
      'intake_message_received',
      'intake_message_deduped',
      'intake_message_no_handler'
    )
  )
);

-- ============================================================================
-- END Phase D6.5 Part 1
-- ============================================================================
-- <<< end 20260707000000_d6_5_part1_universal_intake.sql

-- >>> begin 20260710_00_d3_memory_indexes.sql
-- === D3: Historical Learning Engine — indexes + targeted immutability relaxation ===
--
-- company_memory_records has no firm_client_id column (identity is company_id,
-- resolved from firm_clients). D3 patterns are queried by (company_id,
-- memory_type, updated_at), so the index is built on company_id.

CREATE INDEX IF NOT EXISTS idx_company_memory_type_client
  ON company_memory_records(company_id, memory_type, updated_at DESC);

-- --------------------------------------------------------------------------
-- Payload immutability is relaxed for the four D3 learning pattern types so
-- the learning engine can upsert derived statistics in place on a
-- deterministic memory_id (re-scan increments sample_count instead of
-- duplicating rows). Governance/analytical memory types (advisor_feedback,
-- threshold_override, recommendation_outcome, posted_je, etc.) keep full
-- payload immutability.
--
-- Because the original umbrella trigger (20260605_harden...) enforces payload
-- immutability for ALL rows, we must (1) drop the payload clause from that
-- umbrella function and (2) delegate payload immutability to a dedicated
-- trigger that exempts the learning types. The umbrella trigger continues to
-- guard identity fields, the persistence_status state machine, deletes, and
-- the other derived-metadata jsonb columns.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_company_memory_record_unsafe_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  if tg_op = 'DELETE' then
    if old.legal_hold = true then
      raise exception 'Company memory records cannot be deleted while legal hold is active';
    end if;

    raise exception 'Company memory records cannot be deleted without a future approved compliance workflow';
  end if;

  if tg_op = 'UPDATE' then
    -- payload immutability is enforced by prevent_memory_payload_update()
    if old.memory_id is distinct from new.memory_id
      or old.memory_group_id is distinct from new.memory_group_id
      or old.memory_key is distinct from new.memory_key
      or old.record_version is distinct from new.record_version
      or old.company_id is distinct from new.company_id
      or old.memory_type is distinct from new.memory_type
      or old.record_input_id is distinct from new.record_input_id
      or old.record_input_determinism_hash is distinct from new.record_input_determinism_hash
      or old.persistence_determinism_hash is distinct from new.persistence_determinism_hash
      or old.source_system is distinct from new.source_system
      or old.tenant_id is distinct from new.tenant_id
      or old.scenario_metadata is distinct from new.scenario_metadata
      or old.external_signal_metadata is distinct from new.external_signal_metadata
      or old.evidence_metadata is distinct from new.evidence_metadata then
      raise exception 'Company memory immutable record fields cannot be changed after insert';
    end if;

    if old.persistence_status = 'pending'
      and new.persistence_status not in ('pending', 'persisted', 'blocked') then
      raise exception 'Company memory persistence_status can only move from pending to persisted or blocked';
    end if;

    if old.persistence_status = 'persisted'
      and new.persistence_status not in ('persisted', 'superseded', 'archived') then
      raise exception 'Company memory persistence_status can only move from persisted to superseded or archived';
    end if;

    if old.persistence_status = 'superseded'
      and new.persistence_status not in ('superseded', 'archived') then
      raise exception 'Company memory persistence_status can only move from superseded to archived';
    end if;

    if old.persistence_status = 'archived'
      and new.persistence_status <> 'archived' then
      raise exception 'Archived company memory records cannot change persistence_status';
    end if;

    if old.persistence_status = 'blocked'
      and new.persistence_status <> 'blocked' then
      raise exception 'Blocked company memory records must remain blocked; future repair must create a new record or version';
    end if;
  end if;

  return new;
end;
$$;

-- Dedicated payload-immutability trigger. Learning pattern types may mutate
-- payload; all other memory types keep payload immutable after insert.
CREATE OR REPLACE FUNCTION public.prevent_memory_payload_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  if new.memory_type in ('vendor_gl_mapping', 'recurring_pattern', 'amount_range', 'scan_run') then
    return new;
  end if;

  if new.payload is distinct from old.payload then
    raise exception 'company_memory_records.payload is immutable for memory_type=%', old.memory_type;
  end if;

  return new;
end;
$$;

DROP TRIGGER IF EXISTS prevent_memory_payload_update ON public.company_memory_records;
CREATE TRIGGER prevent_memory_payload_update
  BEFORE UPDATE ON public.company_memory_records
  FOR EACH ROW EXECUTE FUNCTION public.prevent_memory_payload_update();
-- <<< end 20260710_00_d3_memory_indexes.sql

-- >>> begin 20260713_00_d4_uncategorized_proposals.sql
-- === D4: Uncategorized Cleanup Engine — proposal storage ===
-- Path A (posted-to-uncategorized) proposals + reviewer decisions.
-- Review-only in Wave 1: accepts delegate posting to the D2 poster.

CREATE TABLE IF NOT EXISTS public.uncategorized_proposals (
  proposal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  scan_run_id UUID NOT NULL,        -- links to the D3-style scan_run memory record
  txn_id TEXT NOT NULL,             -- QBO Id
  txn_type TEXT NOT NULL CHECK (txn_type IN ('Purchase','Bill','JournalEntry','Deposit','Expense')),
  txn_date DATE NOT NULL,
  txn_amount NUMERIC(18,2) NOT NULL,
  txn_memo TEXT,
  vendor_id TEXT,
  vendor_name TEXT,
  current_account_id TEXT NOT NULL,
  current_account_name TEXT NOT NULL,
  suggested_account_id TEXT,
  suggested_account_name TEXT,
  suggested_account_type TEXT,
  suggested_account_subtype TEXT,
  source TEXT NOT NULL CHECK (source IN ('vendor_gl_mapping','recurring_pattern','amount_range','no_pattern')),
  memory_id TEXT,                   -- source pattern
  confidence NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  confidence_bucket TEXT NOT NULL CHECK (confidence_bucket IN ('green','yellow','red')),
  sample_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
         CHECK (status IN ('pending','accepted','rejected','modified','skipped')),
  reviewer_user_id UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  final_account_id TEXT,
  final_account_name TEXT,
  posted_je_id TEXT,                -- D2 attempt_id after accept
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uncat_proposals_firm_status
  ON public.uncategorized_proposals (firm_client_id, status, txn_date DESC);
CREATE INDEX IF NOT EXISTS idx_uncat_proposals_txn
  ON public.uncategorized_proposals (firm_client_id, txn_id);

-- Idempotency: one open proposal per (firm_client_id, txn_id, current_account_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_uncat_proposals_open_unique
  ON public.uncategorized_proposals (firm_client_id, txn_id, current_account_id)
  WHERE status IN ('pending');

-- Touch trigger
CREATE OR REPLACE FUNCTION public.touch_uncategorized_proposals_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS touch_uncategorized_proposals ON public.uncategorized_proposals;
CREATE TRIGGER touch_uncategorized_proposals
  BEFORE UPDATE ON public.uncategorized_proposals
  FOR EACH ROW EXECUTE FUNCTION public.touch_uncategorized_proposals_updated_at();

-- Immutability: once decided, decided_at + reviewer_user_id + status cannot change
CREATE OR REPLACE FUNCTION public.prevent_proposal_decision_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('accepted','rejected','modified','skipped') THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.reviewer_user_id IS DISTINCT FROM OLD.reviewer_user_id
       OR NEW.decided_at IS DISTINCT FROM OLD.decided_at
       OR NEW.final_account_id IS DISTINCT FROM OLD.final_account_id
       OR NEW.posted_je_id IS DISTINCT FROM OLD.posted_je_id THEN
      RAISE EXCEPTION 'Proposal decision fields are immutable once status is terminal (was: %)', OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_proposal_decision_mutation ON public.uncategorized_proposals;
CREATE TRIGGER prevent_proposal_decision_mutation
  BEFORE UPDATE ON public.uncategorized_proposals
  FOR EACH ROW EXECUTE FUNCTION public.prevent_proposal_decision_mutation();

-- RLS
ALTER TABLE public.uncategorized_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uncat_proposals_firm_access ON public.uncategorized_proposals;
CREATE POLICY uncat_proposals_firm_access ON public.uncategorized_proposals
  FOR ALL USING (
    firm_client_id IN (
      SELECT id FROM public.firm_clients
      WHERE owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS uncat_proposals_service_role ON public.uncategorized_proposals;
CREATE POLICY uncat_proposals_service_role ON public.uncategorized_proposals
  FOR ALL TO service_role USING (true) WITH CHECK (true);
-- <<< end 20260713_00_d4_uncategorized_proposals.sql

-- >>> begin 20260714_00_d5_recurring_templates.sql
-- D5.0 — Recurring / Template Entries — schema
--
-- Depends on: D0 (firm_clients), D2 (je_post_attempts, je_posting_audit).
-- Adds:
--   - firm_clients.timezone (NEW column)
--   - firm_clients.recurring_auto_post_enabled (NEW column, default false)
--   - je_posting_audit.source_type CHECK expanded to include 'recurring'
--   - recurring_templates table
--   - recurring_schedule_lines table
--   - recurring_fires table
--   - RLS on all three new tables
--   - Immutability trigger on recurring_fires (terminal statuses frozen)
--
-- Idempotent: safe to re-apply.
--
-- NOTE (drift resolution): the firm-user join table in this codebase is
-- public.firm_memberships(firm_id, user_id) (created in
-- 20260530_create_client_briefings.sql), NOT firm_members. All three RLS
-- policies below use firm_memberships accordingly.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Extend firm_clients (timezone + auto-post gate)
-- -----------------------------------------------------------------------------
ALTER TABLE public.firm_clients
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/New_York';

ALTER TABLE public.firm_clients
  ADD COLUMN IF NOT EXISTS recurring_auto_post_enabled boolean NOT NULL DEFAULT false;

-- Backfill timezone from client_briefing_settings where present.
-- Idempotent: only updates rows still on the default.
UPDATE public.firm_clients fc
   SET timezone = cbs.timezone
  FROM public.client_briefing_settings cbs
 WHERE cbs.client_id = fc.id
   AND cbs.timezone IS NOT NULL
   AND fc.timezone = 'America/New_York'
   AND cbs.timezone <> 'America/New_York';

-- -----------------------------------------------------------------------------
-- 2. Extend je_posting_audit.source_type to include 'recurring'
-- -----------------------------------------------------------------------------
-- The CHECK constraint was inlined without a name in the D2 migration, so we
-- have to find and drop the current CHECK on source_type, then re-add with the
-- expanded set. This is idempotent: if already expanded, the second attempt is
-- a no-op because we guard on the constraint's current definition.
DO $$
DECLARE
  con_name text;
  con_def  text;
BEGIN
  SELECT c.conname, pg_get_constraintdef(c.oid)
    INTO con_name, con_def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'je_posting_audit'
     AND c.contype = 'c'
     AND pg_get_constraintdef(c.oid) ILIKE '%source_type%'
   LIMIT 1;

  IF con_name IS NOT NULL AND con_def NOT ILIKE '%''recurring''%' THEN
    EXECUTE format('ALTER TABLE public.je_posting_audit DROP CONSTRAINT %I', con_name);
    ALTER TABLE public.je_posting_audit
      ADD CONSTRAINT je_posting_audit_source_type_check
      CHECK (source_type IN ('rule','anomaly','flux','manual','reversal','recurring'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. recurring_templates
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_templates (
  template_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id      uuid NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  name                text NOT NULL,
  description         text,
  template_type       text NOT NULL
                        CHECK (template_type IN ('fixed','straight_line','schedule')),
  je_payload_template jsonb NOT NULL,
  -- Cadence
  cadence             text NOT NULL
                        CHECK (cadence IN (
                          'weekly','biweekly','semimonthly',
                          'monthly','quarterly','annual','custom_days'
                        )),
  custom_days         integer CHECK (custom_days IS NULL OR custom_days > 0),
  day_of_month        integer CHECK (day_of_month IS NULL OR (day_of_month BETWEEN 1 AND 31)),
  day_of_week         integer CHECK (day_of_week IS NULL OR (day_of_week BETWEEN 0 AND 6)),
  month_of_year       integer CHECK (month_of_year IS NULL OR (month_of_year BETWEEN 1 AND 12)),
  timezone            text NOT NULL DEFAULT 'America/New_York',
  -- Straight-line / schedule
  starting_balance    numeric(18,2),
  total_periods       integer CHECK (total_periods IS NULL OR total_periods > 0),
  periods_elapsed     integer NOT NULL DEFAULT 0 CHECK (periods_elapsed >= 0),
  -- Lifecycle
  start_date          date NOT NULL,
  end_date            date,
  next_fire_date      date NOT NULL,
  last_fired_at       timestamptz,
  status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','paused','ended','archived')),
  -- Mode
  auto_post           boolean NOT NULL DEFAULT false,
  origin              text NOT NULL DEFAULT 'user'
                        CHECK (origin IN ('user','ai_suggested','ai_accepted','imported_qbo')),
  origin_memory_id    text,
  -- Reinforcement counters
  fire_count          integer NOT NULL DEFAULT 0 CHECK (fire_count >= 0),
  post_count          integer NOT NULL DEFAULT 0 CHECK (post_count >= 0),
  skip_count          integer NOT NULL DEFAULT 0 CHECK (skip_count >= 0),
  reject_count        integer NOT NULL DEFAULT 0 CHECK (reject_count >= 0),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by_user_id  uuid,
  ended_by_user_id    uuid,
  ended_at            timestamptz,
  CONSTRAINT custom_days_required CHECK (
    cadence <> 'custom_days' OR custom_days IS NOT NULL
  ),
  CONSTRAINT straight_line_requires_balance CHECK (
    template_type <> 'straight_line'
    OR (starting_balance IS NOT NULL AND total_periods IS NOT NULL AND total_periods > 0)
  ),
  CONSTRAINT end_after_start CHECK (
    end_date IS NULL OR end_date >= start_date
  )
);

CREATE INDEX IF NOT EXISTS idx_recurring_templates_next_fire
  ON public.recurring_templates (next_fire_date)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_recurring_templates_firm_client
  ON public.recurring_templates (firm_client_id, status);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_origin_memory
  ON public.recurring_templates (origin_memory_id)
  WHERE origin_memory_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. recurring_schedule_lines (per-period amounts for template_type='schedule')
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_schedule_lines (
  schedule_line_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       uuid NOT NULL REFERENCES public.recurring_templates(template_id) ON DELETE CASCADE,
  period_index      integer NOT NULL CHECK (period_index >= 1),
  amount            numeric(18,2) NOT NULL,
  memo_override     text,
  CONSTRAINT recurring_schedule_lines_period_uniq UNIQUE (template_id, period_index)
);

CREATE INDEX IF NOT EXISTS idx_recurring_schedule_lines_template
  ON public.recurring_schedule_lines (template_id, period_index);

-- -----------------------------------------------------------------------------
-- 5. recurring_fires (audit trail — every scheduled fire event)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_fires (
  fire_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id        uuid NOT NULL REFERENCES public.recurring_templates(template_id) ON DELETE CASCADE,
  firm_client_id     uuid NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  fire_date          date NOT NULL,
  fired_at           timestamptz NOT NULL DEFAULT now(),
  period_index       integer NOT NULL CHECK (period_index >= 1),
  status             text NOT NULL
                       CHECK (status IN ('proposed','posted','skipped','rejected','failed','cash_basis')),
  je_attempt_id      uuid REFERENCES public.je_post_attempts(attempt_id),
  qbo_je_id          text,
  proposal_id        uuid,
  reviewer_user_id   uuid,
  reviewed_at        timestamptz,
  amount_override    numeric(18,2),
  skip_reason        text,
  reject_reason      text,
  error_detail       text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recurring_fires_period_uniq UNIQUE (template_id, period_index)
);

CREATE INDEX IF NOT EXISTS idx_recurring_fires_firm_client
  ON public.recurring_fires (firm_client_id, fired_at DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_fires_template
  ON public.recurring_fires (template_id, period_index DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_fires_status
  ON public.recurring_fires (status, fired_at DESC)
  WHERE status IN ('proposed','failed');
CREATE INDEX IF NOT EXISTS idx_recurring_fires_qbo_je
  ON public.recurring_fires (qbo_je_id)
  WHERE qbo_je_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 6. Touch triggers (updated_at auto-advance)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_recurring_templates_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recurring_templates_touch ON public.recurring_templates;
CREATE TRIGGER trg_recurring_templates_touch
  BEFORE UPDATE ON public.recurring_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_recurring_templates_updated_at();

CREATE OR REPLACE FUNCTION public.touch_recurring_fires_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recurring_fires_touch ON public.recurring_fires;
CREATE TRIGGER trg_recurring_fires_touch
  BEFORE UPDATE ON public.recurring_fires
  FOR EACH ROW EXECUTE FUNCTION public.touch_recurring_fires_updated_at();

-- -----------------------------------------------------------------------------
-- 7. Fire immutability: once a fire reaches a terminal status, block mutation
--    of the terminal decision fields. Same idempotency-first pattern as
--    d4_uncategorized_proposals.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_recurring_fire_immutability()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IN ('posted','skipped','rejected','cash_basis') THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.reviewer_user_id IS DISTINCT FROM OLD.reviewer_user_id
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
       OR NEW.je_attempt_id IS DISTINCT FROM OLD.je_attempt_id
       OR NEW.qbo_je_id IS DISTINCT FROM OLD.qbo_je_id THEN
      RAISE EXCEPTION 'Recurring fire decision fields are immutable once terminal (fire_id=%, status=%)',
        OLD.fire_id, OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recurring_fires_immutability ON public.recurring_fires;
CREATE TRIGGER trg_recurring_fires_immutability
  BEFORE UPDATE ON public.recurring_fires
  FOR EACH ROW EXECUTE FUNCTION public.guard_recurring_fire_immutability();

-- -----------------------------------------------------------------------------
-- 8. RLS — same firm-scoped pattern as the client_briefings tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.recurring_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_schedule_lines  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_fires           ENABLE ROW LEVEL SECURITY;

-- Templates: firm-scoped via firm_clients.firm_id
DROP POLICY IF EXISTS recurring_templates_firm_scope   ON public.recurring_templates;
DROP POLICY IF EXISTS recurring_templates_service_role ON public.recurring_templates;
CREATE POLICY recurring_templates_firm_scope ON public.recurring_templates
  FOR ALL
  TO authenticated
  USING (
    firm_client_id IN (
      SELECT fc.id
        FROM public.firm_clients fc
        JOIN public.firm_memberships fm ON fm.firm_id = fc.firm_id
       WHERE fm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    firm_client_id IN (
      SELECT fc.id
        FROM public.firm_clients fc
        JOIN public.firm_memberships fm ON fm.firm_id = fc.firm_id
       WHERE fm.user_id = auth.uid()
    )
  );
CREATE POLICY recurring_templates_service_role ON public.recurring_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Schedule lines: inherit access from parent template
DROP POLICY IF EXISTS recurring_schedule_lines_firm_scope   ON public.recurring_schedule_lines;
DROP POLICY IF EXISTS recurring_schedule_lines_service_role ON public.recurring_schedule_lines;
CREATE POLICY recurring_schedule_lines_firm_scope ON public.recurring_schedule_lines
  FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT template_id FROM public.recurring_templates
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT template_id FROM public.recurring_templates
    )
  );
CREATE POLICY recurring_schedule_lines_service_role ON public.recurring_schedule_lines
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Fires: firm-scoped via firm_client_id (denormalized for RLS speed)
DROP POLICY IF EXISTS recurring_fires_firm_scope   ON public.recurring_fires;
DROP POLICY IF EXISTS recurring_fires_service_role ON public.recurring_fires;
CREATE POLICY recurring_fires_firm_scope ON public.recurring_fires
  FOR ALL
  TO authenticated
  USING (
    firm_client_id IN (
      SELECT fc.id
        FROM public.firm_clients fc
        JOIN public.firm_memberships fm ON fm.firm_id = fc.firm_id
       WHERE fm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    firm_client_id IN (
      SELECT fc.id
        FROM public.firm_clients fc
        JOIN public.firm_memberships fm ON fm.firm_id = fc.firm_id
       WHERE fm.user_id = auth.uid()
    )
  );
CREATE POLICY recurring_fires_service_role ON public.recurring_fires
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
-- <<< end 20260714_00_d5_recurring_templates.sql

-- >>> begin 20260703_1200_d6_0_vertical_rule_foundation.sql
-- Phase D6.0: Vertical Rule Execution Foundation
-- Idempotent. Safe to re-run.
--
-- DRIFT RESOLUTION (vs the D6.0 paste spec, reconciled against live schema):
--   * FK targets corrected to real PKs:
--       firm_clients(id)            [not firm_client_id]
--       recurring_fires(fire_id)    [not recurring_fire_id]
--       company_memory_records(memory_id) [not memory_record_id; and it is TEXT,
--         so memory_record_id is declared text to match the FK target type]
--     uncategorized_proposals(proposal_id) was already correct.
--   * curated_rules_registry already exists (D0 migration
--     20260708_00_d0_identity_and_memory_activation.sql) with a different
--     column set than the paste assumed. The seed below maps the 24 rules onto
--     the REAL columns: rule_name, vertical, severity, logic_file_path,
--     description, applies_to_cash_basis, applies_to_accrual_basis, is_active,
--     version. enabled_default=false -> is_active=false. ON CONFLICT (rule_id).
--   * This file is a NEW migration; it does not edit any *_d5_*.sql file.
begin;

-- 1. Kill switch column on firm_clients
alter table firm_clients
  add column if not exists vertical_rules_enabled boolean not null default true;
comment on column firm_clients.vertical_rules_enabled is
  'D6.0 kill switch. When false, vertical rule engine skips this client entirely and recurring fires get status=vertical_blocked.';

-- 2. Extend recurring_fires.status to include vertical_blocked.
--    The D5.0 inline column check is auto-named recurring_fires_status_check.
alter table recurring_fires
  drop constraint if exists recurring_fires_status_check;
alter table recurring_fires
  add constraint recurring_fires_status_check
  check (status in ('proposed','posted','skipped','rejected','failed','cash_basis','vertical_blocked'));

-- 3. curated_rule_fires (append-only audit of every rule evaluation that fired)
create table if not exists curated_rule_fires (
  fire_id                 uuid primary key default gen_random_uuid(),
  firm_client_id          uuid not null references firm_clients(id) on delete cascade,
  rule_id                 text not null,
  rule_version            integer not null,
  proposal_id             uuid null references uncategorized_proposals(proposal_id) on delete set null,
  recurring_fire_id       uuid null references recurring_fires(fire_id) on delete set null,
  target_type             text not null check (target_type in ('transaction','account','period','vendor','customer','item','contract','project','other')),
  target_ref              text not null,
  inputs_hash             text not null,
  outcome                 text not null check (outcome in ('fired','suppressed','error','not_implemented')),
  reason_code             text not null,
  reason_detail           jsonb not null default '{}'::jsonb,
  severity_applied        text not null check (severity_applied in ('info','warning','error','critical')),
  memory_record_id        text null references company_memory_records(memory_id) on delete set null,
  reviewer_user_id        uuid null references auth.users(id) on delete set null,
  reviewer_action         text null check (reviewer_action in ('accepted','dismissed','escalated','override','pending')),
  reviewer_action_at      timestamptz null,
  created_at              timestamptz not null default now()
);
comment on table curated_rule_fires is
  'D6.0 append-only audit trail. Every vertical rule evaluation that fires (or errors) writes exactly one row. Immutable except reviewer_action fields.';

-- Indexes
create index if not exists curated_rule_fires_client_created_idx
  on curated_rule_fires (firm_client_id, created_at desc);
create index if not exists curated_rule_fires_rule_idx
  on curated_rule_fires (rule_id, rule_version);
create index if not exists curated_rule_fires_proposal_idx
  on curated_rule_fires (proposal_id) where proposal_id is not null;
create index if not exists curated_rule_fires_recurring_idx
  on curated_rule_fires (recurring_fire_id) where recurring_fire_id is not null;
create unique index if not exists curated_rule_fires_dedup_idx
  on curated_rule_fires (firm_client_id, rule_id, target_type, target_ref, inputs_hash);

-- Immutability trigger — only reviewer_* fields can change post-insert
create or replace function curated_rule_fires_immutable()
returns trigger language plpgsql as $$
begin
  if (
    new.fire_id            is distinct from old.fire_id            or
    new.firm_client_id     is distinct from old.firm_client_id     or
    new.rule_id            is distinct from old.rule_id            or
    new.rule_version       is distinct from old.rule_version       or
    new.proposal_id        is distinct from old.proposal_id        or
    new.recurring_fire_id  is distinct from old.recurring_fire_id  or
    new.target_type        is distinct from old.target_type        or
    new.target_ref         is distinct from old.target_ref         or
    new.inputs_hash        is distinct from old.inputs_hash        or
    new.outcome            is distinct from old.outcome            or
    new.reason_code        is distinct from old.reason_code        or
    new.reason_detail      is distinct from old.reason_detail      or
    new.severity_applied   is distinct from old.severity_applied   or
    new.memory_record_id   is distinct from old.memory_record_id   or
    new.created_at         is distinct from old.created_at
  ) then
    raise exception 'curated_rule_fires is append-only; only reviewer_* fields are mutable (fire_id=%)', old.fire_id;
  end if;
  return new;
end $$;

drop trigger if exists curated_rule_fires_immutable_trg on curated_rule_fires;
create trigger curated_rule_fires_immutable_trg
  before update on curated_rule_fires
  for each row execute function curated_rule_fires_immutable();

-- 4. Seed 24 new registry rows (all disabled: is_active=false; D6.2a-b enables
--    per client). Mapped to the REAL curated_rules_registry columns.
--    applies_to_cash_basis is true only where the rule's method scope included
--    'cash'; every rule supports accrual (and modified_cash, which the D0
--    execution service does not gate on either boolean).
insert into curated_rules_registry
  (rule_id, rule_name, rule_category, vertical, severity, logic_file_path, description,
   applies_to_cash_basis, applies_to_accrual_basis, requires_history_months, is_active, version)
values
  -- General expansion (4)
  ('gen.accrual_reversal_check',        'Accrual Reversal Check',       'accrual_check',       'general', 'warning', 'lib/rules/logic/general/accrual_reversal_check.ts',        'Detect missing reversing entry for prior-period accrual.', false, true, 0, false, 1),
  ('gen.gl_mapping_variance_check',     'GL Mapping Variance',          'anomaly_detection',   'general', 'info',    'lib/rules/logic/general/gl_mapping_variance_check.ts',     'Flag transactions whose vendor/GL mapping differs from learned pattern.', true, true, 0, false, 1),
  ('gen.subledger_tie_check',           'Subledger Tie-Out',            'balance_check',       'general', 'error',   'lib/rules/logic/general/subledger_tie_check.ts',           'Compare AR/AP subledger totals to GL control accounts.', false, true, 0, false, 1),
  ('gen.reversing_entry_period_check',  'Reversing Entry Period Check', 'period_check',        'general', 'warning', 'lib/rules/logic/general/reversing_entry_period_check.ts',  'Confirm reversing JE posts to correct period.', false, true, 0, false, 1),
  -- Manufacturing (8)
  ('mfg.wip_cutoff_check',                    'WIP Cutoff Check',             'period_check',      'manufacturing', 'error',   'lib/rules/logic/manufacturing/wip_cutoff_check.ts',                    'Flag production activity crossing period boundaries.', false, true, 0, false, 1),
  ('mfg.cogs_variance_check',                 'COGS Variance',                'anomaly_detection', 'manufacturing', 'warning', 'lib/rules/logic/manufacturing/cogs_variance_check.ts',                 'Detect COGS variance vs standard cost.', false, true, 0, false, 1),
  ('mfg.inventory_reconciliation_check',      'Inventory Reconciliation',     'balance_check',     'manufacturing', 'error',   'lib/rules/logic/manufacturing/inventory_reconciliation_check.ts',      'Sub-ledger vs GL inventory tie-out.', false, true, 0, false, 1),
  ('mfg.standard_cost_capitalization_check',  'Standard Cost Capitalization', 'anomaly_detection', 'manufacturing', 'warning', 'lib/rules/logic/manufacturing/standard_cost_capitalization_check.ts',  'Verify labor/OH capitalized to WIP correctly.', false, true, 0, false, 1),
  ('mfg.freight_capitalization_check',        'Freight Capitalization',       'anomaly_detection', 'manufacturing', 'info',    'lib/rules/logic/manufacturing/freight_capitalization_check.ts',        'Inbound freight capitalized to inventory, not expensed.', false, true, 0, false, 1),
  ('mfg.warranty_accrual_check',              'Warranty Accrual',             'accrual_check',     'manufacturing', 'warning', 'lib/rules/logic/manufacturing/warranty_accrual_check.ts',              'Warranty reserve movement vs sales.', false, true, 0, false, 1),
  ('mfg.scrap_variance_check',                'Scrap Variance',               'anomaly_detection', 'manufacturing', 'info',    'lib/rules/logic/manufacturing/scrap_variance_check.ts',                'Scrap posted outside expected range.', false, true, 0, false, 1),
  ('mfg.absorption_check',                    'Overhead Absorption',          'anomaly_detection', 'manufacturing', 'warning', 'lib/rules/logic/manufacturing/absorption_check.ts',                    'Under/over-absorption of manufacturing overhead.', false, true, 0, false, 1),
  -- Retail (6)
  ('rtl.inventory_shrink_check',        'Inventory Shrink',        'anomaly_detection',   'retail', 'warning', 'lib/rules/logic/retail/inventory_shrink_check.ts',        'Shrinkage exceeds threshold.', false, true, 0, false, 1),
  ('rtl.cogs_recognition_check',        'COGS Recognition Timing', 'revenue_recognition', 'retail', 'error',   'lib/rules/logic/retail/cogs_recognition_check.ts',        'COGS recognized alongside matched revenue.', false, true, 0, false, 1),
  ('rtl.gift_card_liability_check',     'Gift Card Liability',     'balance_check',       'retail', 'warning', 'lib/rules/logic/retail/gift_card_liability_check.ts',     'Gift card liability movement + breakage.', false, true, 0, false, 1),
  ('rtl.sales_returns_reserve_check',   'Sales Returns Reserve',   'accrual_check',       'retail', 'warning', 'lib/rules/logic/retail/sales_returns_reserve_check.ts',   'Returns reserve vs historical rate.', false, true, 0, false, 1),
  ('rtl.loyalty_reward_liability_check','Loyalty Reward Liability','balance_check',       'retail', 'info',    'lib/rules/logic/retail/loyalty_reward_liability_check.ts','Loyalty deferred revenue movement.', false, true, 0, false, 1),
  ('rtl.seasonal_markdown_check',       'Seasonal Markdown',       'anomaly_detection',   'retail', 'info',    'lib/rules/logic/retail/seasonal_markdown_check.ts',       'Markdown timing vs seasonal calendar.', false, true, 0, false, 1),
  -- Professional Services (6)
  ('ps.wip_billable_hours_check',       'WIP Billable Hours',       'balance_check',       'professional_services', 'warning', 'lib/rules/logic/professional_services/wip_billable_hours_check.ts',       'Unbilled WIP hours vs project stage.', false, true, 0, false, 1),
  ('ps.revenue_percent_complete_check', 'Revenue Percent Complete', 'revenue_recognition', 'professional_services', 'error',   'lib/rules/logic/professional_services/revenue_percent_complete_check.ts', 'POC revenue vs cost incurred.', false, true, 0, false, 1),
  ('ps.unbilled_receivables_check',     'Unbilled Receivables',     'balance_check',       'professional_services', 'warning', 'lib/rules/logic/professional_services/unbilled_receivables_check.ts',     'Unbilled AR aging beyond threshold.', false, true, 0, false, 1),
  ('ps.contract_asset_reclass_check',   'Contract Asset Reclass',   'balance_check',       'professional_services', 'info',    'lib/rules/logic/professional_services/contract_asset_reclass_check.ts',   'Contract asset reclass to AR upon billing.', false, true, 0, false, 1),
  ('ps.project_margin_flag_check',      'Project Margin Flag',      'anomaly_detection',   'professional_services', 'warning', 'lib/rules/logic/professional_services/project_margin_flag_check.ts',      'Project margin below historical band.', false, true, 0, false, 1),
  ('ps.bill_rate_variance_check',       'Bill Rate Variance',       'anomaly_detection',   'professional_services', 'info',    'lib/rules/logic/professional_services/bill_rate_variance_check.ts',       'Realized bill rate vs contracted rate.', false, true, 0, false, 1)
on conflict (rule_id) do nothing;

commit;
-- <<< end 20260703_1200_d6_0_vertical_rule_foundation.sql

-- >>> begin 20260706150000_d6_4c_1_pre_close_review_queue.sql
-- Phase D6.4c-1: Pre-Close Review Queue + Basis Guard columns + Directive Audit
-- Idempotent. Safe to re-run.
-- Additive only. No existing tables/columns/constraints are modified destructively.
--
-- Depends on:
--   20260706120000_d_platform_event_sourced_foundation.sql (engagements, portcos, ai_action_log)
--   20260706130000_d_entitlements.sql (ai_action_log_action_category_check current set)
--   20260703_1200_d6_0_vertical_rule_foundation.sql (curated_rule_fires)
begin;

-- ============================================================
-- 1. pre_close_review_items — the review queue itself
-- ============================================================
create table if not exists public.pre_close_review_items (
  id                          uuid primary key default gen_random_uuid(),
  -- Origin: which rule fire produced this proposal
  fire_id                     uuid not null references public.curated_rule_fires(fire_id) on delete restrict,
  firm_client_id              uuid not null references public.firm_clients(id) on delete restrict,
  engagement_id               uuid not null references public.engagements(id) on delete restrict,
  close_period_id             uuid null,  -- FK added conditionally below to survive out-of-order migrations
  rule_id                     text not null,
  rule_version                integer not null,
  -- Basis at time of composition
  accounting_method           text not null check (accounting_method in ('cash','accrual','modified_cash')),
  -- Composed JE draft (balanced; validated at insert-time by trigger)
  je_draft                    jsonb not null,
  je_draft_total_debit_cents  bigint not null check (je_draft_total_debit_cents >= 0),
  je_draft_total_credit_cents bigint not null check (je_draft_total_credit_cents >= 0),
  je_draft_line_count         integer not null check (je_draft_line_count >= 2),
  -- Assertion tags — populated by D-Assertions Part 1; nullable in D6.4c-1
  assertion_tags              text[] null,
  -- Rule-provided proposal metadata
  rule_reason_code            text not null,
  rule_reason_detail          jsonb not null default '{}'::jsonb,
  severity                    text not null check (severity in ('info','warning','error','critical')),
  -- Evidence pointers (deliberately array of jsonb — supports multi-source proposals)
  evidence_refs               jsonb not null default '[]'::jsonb,
  -- Basis guard outcome captured at composition time (redundant but audit-preserving)
  basis_guard_reason_code     text null,
  basis_guard_reason_text     text null,
  -- Decision tail (only these columns are mutable post-insert; immutability trigger enforces)
  decision                    text null check (decision in ('approved','rejected','deferred','edit_and_approved')),
  decision_reason_code        text null,
  decision_reason_text        text null,
  reviewer_user_id            uuid null references auth.users(id) on delete set null,
  decision_at                 timestamptz null,
  edited_je_draft             jsonb null,  -- populated only for edit_and_approved
  -- Downstream link (populated by D6.4c-3)
  posted_je_attempt_id        uuid null,
  created_at                  timestamptz not null default now(),
  -- If decision is set, decision_reason_code must be set (defense-in-depth vs applier)
  constraint pre_close_review_items_decision_pair
    check (
      (decision is null and decision_reason_code is null and decision_at is null)
      or
      (decision is not null and decision_reason_code is not null and decision_at is not null)
    ),
  -- edited_je_draft only allowed for edit_and_approved
  constraint pre_close_review_items_edited_only_for_edit_and_approved
    check (
      (edited_je_draft is null)
      or
      (edited_je_draft is not null and decision = 'edit_and_approved')
    )
);
comment on table public.pre_close_review_items is
  'D6.4c-1: pre-close review queue. Every rule fire that clears the basis guard produces one row. Immutable except decision-tail columns.';

-- Conditional FK to close_periods (defensive against replayed environments where
-- D3 was applied later; on e050803 main close_periods already exists).
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'close_periods') then
    if not exists (
      select 1 from information_schema.table_constraints
      where table_schema = 'public'
        and table_name = 'pre_close_review_items'
        and constraint_name = 'pre_close_review_items_close_period_fk'
    ) then
      execute 'alter table public.pre_close_review_items
               add constraint pre_close_review_items_close_period_fk
               foreign key (close_period_id) references public.close_periods(id) on delete set null';
    end if;
  end if;
end $$;

-- ------------------------------------------------------------
-- 2. Indexes
-- ------------------------------------------------------------
create index if not exists pre_close_review_items_engagement_created_idx
  on public.pre_close_review_items (engagement_id, created_at desc);
create index if not exists pre_close_review_items_client_pending_idx
  on public.pre_close_review_items (firm_client_id, created_at desc)
  where decision is null;
create index if not exists pre_close_review_items_fire_idx
  on public.pre_close_review_items (fire_id);
-- One review item per rule fire. If a rule refires (different inputs_hash → new
-- fire_id), that produces a distinct review item, correct by construction.
create unique index if not exists pre_close_review_items_fire_dedup_idx
  on public.pre_close_review_items (fire_id);
create index if not exists pre_close_review_items_close_period_idx
  on public.pre_close_review_items (close_period_id)
  where close_period_id is not null;
create index if not exists pre_close_review_items_rule_idx
  on public.pre_close_review_items (rule_id, rule_version);

-- ------------------------------------------------------------
-- 3. JE draft shape validator (fires at INSERT and on decision UPDATE)
-- ------------------------------------------------------------
create or replace function public.pre_close_review_items_je_draft_check()
returns trigger language plpgsql as $$
declare
  line_count integer;
  total_dr numeric;
  total_cr numeric;
  edited_line_count integer;
  edited_total_dr numeric;
  edited_total_cr numeric;
begin
  -- Base draft: balanced, >= 2 lines
  if jsonb_typeof(new.je_draft) <> 'object' then
    raise exception 'pre_close_review_items.je_draft must be a JSON object (got %)', jsonb_typeof(new.je_draft);
  end if;
  if not (new.je_draft ? 'lines' and jsonb_typeof(new.je_draft->'lines') = 'array') then
    raise exception 'pre_close_review_items.je_draft.lines must be an array';
  end if;
  select count(*),
         coalesce(sum((l->>'drAmountCents')::numeric), 0),
         coalesce(sum((l->>'crAmountCents')::numeric), 0)
    into line_count, total_dr, total_cr
    from jsonb_array_elements(new.je_draft->'lines') l;
  if line_count < 2 then
    raise exception 'pre_close_review_items.je_draft must have >= 2 lines (got %)', line_count;
  end if;
  if total_dr <> new.je_draft_total_debit_cents then
    raise exception 'pre_close_review_items.je_draft_total_debit_cents (%) != sum(drAmountCents) (%)', new.je_draft_total_debit_cents, total_dr;
  end if;
  if total_cr <> new.je_draft_total_credit_cents then
    raise exception 'pre_close_review_items.je_draft_total_credit_cents (%) != sum(crAmountCents) (%)', new.je_draft_total_credit_cents, total_cr;
  end if;
  if total_dr <> total_cr then
    raise exception 'pre_close_review_items.je_draft unbalanced: DR=% CR=%', total_dr, total_cr;
  end if;
  if new.je_draft_line_count <> line_count then
    raise exception 'pre_close_review_items.je_draft_line_count (%) != actual (%)', new.je_draft_line_count, line_count;
  end if;
  -- Edited draft (only when decision = 'edit_and_approved'): same balance rules
  if new.edited_je_draft is not null then
    if jsonb_typeof(new.edited_je_draft) <> 'object' or not (new.edited_je_draft ? 'lines') then
      raise exception 'pre_close_review_items.edited_je_draft must be an object with lines[]';
    end if;
    select count(*),
           coalesce(sum((l->>'drAmountCents')::numeric), 0),
           coalesce(sum((l->>'crAmountCents')::numeric), 0)
      into edited_line_count, edited_total_dr, edited_total_cr
      from jsonb_array_elements(new.edited_je_draft->'lines') l;
    if edited_line_count < 2 then
      raise exception 'edited_je_draft must have >= 2 lines';
    end if;
    if edited_total_dr <> edited_total_cr then
      raise exception 'edited_je_draft unbalanced: DR=% CR=%', edited_total_dr, edited_total_cr;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists pre_close_review_items_je_draft_check_trg on public.pre_close_review_items;
create trigger pre_close_review_items_je_draft_check_trg
  before insert or update on public.pre_close_review_items
  for each row execute function public.pre_close_review_items_je_draft_check();

-- ------------------------------------------------------------
-- 4. Immutability trigger — only decision-tail fields may change post-insert
-- ------------------------------------------------------------
create or replace function public.pre_close_review_items_immutable()
returns trigger language plpgsql as $$
begin
  if (
    new.id                          is distinct from old.id                          or
    new.fire_id                     is distinct from old.fire_id                     or
    new.firm_client_id              is distinct from old.firm_client_id              or
    new.engagement_id               is distinct from old.engagement_id               or
    new.close_period_id             is distinct from old.close_period_id             or
    new.rule_id                     is distinct from old.rule_id                     or
    new.rule_version                is distinct from old.rule_version                or
    new.accounting_method           is distinct from old.accounting_method           or
    new.je_draft                    is distinct from old.je_draft                    or
    new.je_draft_total_debit_cents  is distinct from old.je_draft_total_debit_cents  or
    new.je_draft_total_credit_cents is distinct from old.je_draft_total_credit_cents or
    new.je_draft_line_count         is distinct from old.je_draft_line_count         or
    new.assertion_tags              is distinct from old.assertion_tags              or
    new.rule_reason_code            is distinct from old.rule_reason_code            or
    new.rule_reason_detail          is distinct from old.rule_reason_detail          or
    new.severity                    is distinct from old.severity                    or
    new.evidence_refs               is distinct from old.evidence_refs               or
    new.basis_guard_reason_code     is distinct from old.basis_guard_reason_code     or
    new.basis_guard_reason_text     is distinct from old.basis_guard_reason_text     or
    new.created_at                  is distinct from old.created_at
  ) then
    raise exception 'pre_close_review_items row is immutable except decision-tail columns (id=%)', old.id;
  end if;
  -- posted_je_attempt_id: allow one-time transition from null to a value (set by D6.4c-3)
  if old.posted_je_attempt_id is not null and new.posted_je_attempt_id is distinct from old.posted_je_attempt_id then
    raise exception 'pre_close_review_items.posted_je_attempt_id is set-once (id=%)', old.id;
  end if;
  -- decision fields: allow one-time transition from null to a value; no re-decisions
  if old.decision is not null and new.decision is distinct from old.decision then
    raise exception 'pre_close_review_items.decision is set-once (id=%)', old.id;
  end if;
  return new;
end $$;
drop trigger if exists pre_close_review_items_immutable_trg on public.pre_close_review_items;
create trigger pre_close_review_items_immutable_trg
  before update on public.pre_close_review_items
  for each row execute function public.pre_close_review_items_immutable();

-- ------------------------------------------------------------
-- 5. RLS (service-role only in D6.4c-1; reviewer/client policies land in D6.4d)
-- ------------------------------------------------------------
alter table public.pre_close_review_items enable row level security;
-- Deny-by-default. Service role bypasses RLS. Anonymous/authenticated cannot see anything.
-- D6.4d will add SELECT/UPDATE policies for reviewers scoped to their firm.

-- ------------------------------------------------------------
-- 6. Directive audit widening — extend ai_action_log check to accept the two
--    D6.4c-1 categories WITHOUT dropping any category set by D-Platform or
--    D-Entitlements. The list below is the reconciled union of the current
--    live constraint (D-Entitlements) plus directive_apply + review_item_compose.
-- ------------------------------------------------------------
alter table public.ai_action_log
  drop constraint if exists ai_action_log_action_category_check;
alter table public.ai_action_log
  add constraint ai_action_log_action_category_check
  check (action_category in (
    'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
    'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
    'agent_close_walkthrough','entitlement_check','other',
    'directive_apply','review_item_compose'
  ));
comment on constraint ai_action_log_action_category_check on public.ai_action_log is
  'D6.4c-1: widened to include directive_apply and review_item_compose (preserves all D-Platform + D-Entitlements categories).';

-- ------------------------------------------------------------
-- 7. Backfill-safe: no data to migrate; pre_close_review_items starts empty.
-- ------------------------------------------------------------
commit;
-- <<< end 20260706150000_d6_4c_1_pre_close_review_queue.sql

-- >>> begin 20260707120000_d_assertions_part_1_schema_and_backfill.sql
-- =============================================================================
-- D-Assertions Part 1 — 8-assertion schema + 32-rule backfill tagging
-- =============================================================================
-- Adds:
--   1. assertions_catalog          — 8-row lookup (ISA 315 Revised 2019)
--   2. assertion_relevance_matrix  — account-category × assertion default matrix
--   3. rule_assertion_coverage     — per-rule tagging (primary + secondaries)
--   4. Widens ai_action_log_action_category_check to add
--      'assertion_coverage_scan' and 'assertion_gap_reasoning' (used in Part 2)
--   5. Widens ledger_events_event_category_check to add 'assertion'
-- All new tables have RLS enabled with real policies (service_role bypass +
-- firm-scoped read). Backfill INSERTs the 32 known rules with primary and
-- secondary assertion tags derived from GAAP practitioner consensus.
-- =============================================================================
begin;
-- ---------- 1. assertions_catalog ---------------------------------------
create table if not exists public.assertions_catalog (
  assertion_id            text primary key
                            check (assertion_id in (
                              'existence_occurrence',
                              'completeness',
                              'rights_obligations',
                              'valuation_allocation',
                              'accuracy',
                              'cutoff',
                              'classification',
                              'presentation_disclosure'
                            )),
  display_name            text not null,
  isa_315_label           text not null,
  pcaob_legacy_category   text not null
                            check (pcaob_legacy_category in (
                              'existence_occurrence',
                              'completeness',
                              'rights_obligations',
                              'valuation_allocation',
                              'presentation_disclosure'
                            )),
  applies_transaction     boolean not null,
  applies_balance         boolean not null,
  description             text not null,
  authoritative_citation  text not null,
  version                 integer not null default 1,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
comment on table public.assertions_catalog is
  'D-Assertions canonical 8-concept enum (ISA 315 Revised 2019). PCAOB legacy 5-category cross-walk stored per row.';
alter table public.assertions_catalog enable row level security;
drop policy if exists "assertions_catalog_service_role_all" on public.assertions_catalog;
create policy "assertions_catalog_service_role_all"
  on public.assertions_catalog for all to service_role using (true) with check (true);
drop policy if exists "assertions_catalog_authenticated_read" on public.assertions_catalog;
create policy "assertions_catalog_authenticated_read"
  on public.assertions_catalog for select to authenticated using (true);
-- Seed 8 assertions with real ISA 315 citations
insert into public.assertions_catalog
  (assertion_id, display_name, isa_315_label, pcaob_legacy_category, applies_transaction, applies_balance, description, authoritative_citation)
values
  ('existence_occurrence', 'Existence / Occurrence',
   'Existence (balance) / Occurrence (transaction)',
   'existence_occurrence', true, true,
   'Assets, liabilities, and equity exist at period-end; transactions and events recorded have occurred and pertain to the entity.',
   'ISA 315 (Revised 2019) ¶A190; PCAOB AS 1105'),
  ('completeness', 'Completeness',
   'Completeness',
   'completeness', true, true,
   'All transactions, events, and balances that should have been recorded or disclosed have been.',
   'ISA 315 (Revised 2019) ¶A190; PCAOB AS 1105'),
  ('rights_obligations', 'Rights and Obligations',
   'Rights and Obligations',
   'rights_obligations', false, true,
   'The entity holds or controls rights to recorded assets; recorded liabilities are obligations of the entity.',
   'ISA 315 (Revised 2019) ¶A190'),
  ('valuation_allocation', 'Accuracy, Valuation and Allocation',
   'Accuracy, Valuation and Allocation',
   'valuation_allocation', false, true,
   'Balances are recorded at appropriate amounts; valuation and allocation adjustments (impairment, allowance, depreciation) are properly recorded and disclosed.',
   'ISA 315 (Revised 2019) ¶A190'),
  ('accuracy', 'Accuracy',
   'Accuracy',
   'valuation_allocation', true, false,
   'Amounts, data, and calculations in transaction records are recorded appropriately.',
   'ISA 315 (Revised 2019) ¶A190'),
  ('cutoff', 'Cutoff',
   'Cutoff',
   'valuation_allocation', true, false,
   'Transactions and events are recorded in the correct accounting period.',
   'ISA 315 (Revised 2019) ¶A190; PCAOB AS 2810'),
  ('classification', 'Classification',
   'Classification',
   'presentation_disclosure', true, true,
   'Transactions and balances are recorded in the proper accounts per the chart of accounts and applicable framework.',
   'ISA 315 (Revised 2019) ¶A190'),
  ('presentation_disclosure', 'Presentation and Disclosure',
   'Presentation / Presentation and Disclosure',
   'presentation_disclosure', true, true,
   'Amounts, balances, and disclosures are appropriately aggregated, disaggregated, and described in accordance with the applicable financial-reporting framework.',
   'ISA 315 (Revised 2019) ¶A190; PCAOB AS 2810')
on conflict (assertion_id) do update set
  display_name           = excluded.display_name,
  isa_315_label          = excluded.isa_315_label,
  pcaob_legacy_category  = excluded.pcaob_legacy_category,
  applies_transaction    = excluded.applies_transaction,
  applies_balance        = excluded.applies_balance,
  description            = excluded.description,
  authoritative_citation = excluded.authoritative_citation,
  updated_at             = now();
-- ---------- 2. assertion_relevance_matrix -------------------------------
create table if not exists public.assertion_relevance_matrix (
  account_category    text not null
                        check (account_category in (
                          'cash','accounts_receivable','inventory',
                          'fixed_assets','other_current_assets','other_non_current_assets',
                          'accounts_payable','accrued_liabilities','other_current_liabilities',
                          'long_term_debt','equity',
                          'revenue','cost_of_goods_sold','operating_expenses',
                          'other_income_expense','tax_expense',
                          'off_balance_sheet','disclosure_only'
                        )),
  assertion_id        text not null references public.assertions_catalog(assertion_id),
  relevance           text not null
                        check (relevance in ('relevant','usually_not_primary','not_applicable')),
  rationale           text not null,
  citation            text not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  primary key (account_category, assertion_id)
);
comment on table public.assertion_relevance_matrix is
  'D-Assertions default GAAP relevance matrix per account category × assertion. Firms may override via engagement-level overlay (Part 2).';
alter table public.assertion_relevance_matrix enable row level security;
drop policy if exists "assertion_relevance_matrix_service_role_all" on public.assertion_relevance_matrix;
create policy "assertion_relevance_matrix_service_role_all"
  on public.assertion_relevance_matrix for all to service_role using (true) with check (true);
drop policy if exists "assertion_relevance_matrix_authenticated_read" on public.assertion_relevance_matrix;
create policy "assertion_relevance_matrix_authenticated_read"
  on public.assertion_relevance_matrix for select to authenticated using (true);
-- Seed default relevance matrix. Every (account_category, assertion_id) pair
-- gets one row. 18 categories × 8 assertions = 144 rows. Values follow the
-- GAAP practitioner consensus derived from ISA 315 ¶A190 and CPA Hall Talk
-- relevance defaults. Auditor engagement-level overrides live in a separate
-- table added in Part 2 (out of scope here).
--
-- Convention:
--   'relevant'              = primary test required
--   'usually_not_primary'   = testable, not usually the dominant risk
--   'not_applicable'        = assertion is not defined for this account type
insert into public.assertion_relevance_matrix
  (account_category, assertion_id, relevance, rationale, citation)
values
  -- CASH -------------------------------------------------------------
  ('cash','existence_occurrence','relevant','Cash must exist at period-end; bank confirmation/reconciliation is the primary test.','ISA 315 ¶A190; AICPA Audit Guide ch. 8'),
  ('cash','completeness','relevant','All cash accounts must be recorded; risk of unrecorded bank accounts.','ISA 315 ¶A190'),
  ('cash','rights_obligations','relevant','Entity must control the cash (not restricted, not agent-held).','ISA 315 ¶A190'),
  ('cash','valuation_allocation','usually_not_primary','Foreign-currency cash requires FX revaluation; otherwise cash is at face value.','ASC 830'),
  ('cash','accuracy','relevant','Bank recs must tie to book balance exactly.','AICPA Audit Guide'),
  ('cash','cutoff','relevant','Deposits in transit / outstanding checks must land in correct period.','ISA 315 ¶A190'),
  ('cash','classification','usually_not_primary','Restricted vs unrestricted classification.','ASC 230'),
  ('cash','presentation_disclosure','relevant','Restricted cash disclosure, FX exposure disclosure.','ASC 210, ASC 830'),
  -- ACCOUNTS_RECEIVABLE ---------------------------------------------
  ('accounts_receivable','existence_occurrence','relevant','AR must represent real sales to real customers.','ISA 315 ¶A190; SAS 145'),
  ('accounts_receivable','completeness','relevant','All shipped/delivered sales must be recorded.','ISA 315 ¶A190'),
  ('accounts_receivable','rights_obligations','relevant','Entity must have the legal right to collect (not factored, not pledged as security without disclosure).','ASC 860'),
  ('accounts_receivable','valuation_allocation','relevant','Allowance for doubtful accounts / CECL expected credit loss must reflect collectibility.','ASC 326 (CECL)'),
  ('accounts_receivable','accuracy','relevant','Invoice pricing, quantities, and math must be correct.','ISA 315 ¶A190'),
  ('accounts_receivable','cutoff','relevant','Sales/shipments must land in the period of revenue recognition per ASC 606.','ASC 606-10-25'),
  ('accounts_receivable','classification','usually_not_primary','Trade vs related-party vs long-term AR classification.','ASC 210'),
  ('accounts_receivable','presentation_disclosure','relevant','Aging, credit-risk concentration, allowance rollforward.','ASC 326, ASC 275'),
  -- INVENTORY --------------------------------------------------------
  ('inventory','existence_occurrence','relevant','Physical inventory count is a primary test.','ISA 501; AICPA Audit Guide'),
  ('inventory','completeness','relevant','All owned inventory (including in-transit, consignment) must be counted.','ISA 315 ¶A190'),
  ('inventory','rights_obligations','relevant','Consignment, bill-and-hold, and factored inventory require special treatment.','ASC 606-10-55'),
  ('inventory','valuation_allocation','relevant','Lower of cost or net realizable value; obsolescence reserves.','ASC 330'),
  ('inventory','accuracy','usually_not_primary','Standard costing calculations, absorption math.','ASC 330'),
  ('inventory','cutoff','relevant','Shipping / receiving must align to invoice / bill dates.','ASC 606'),
  ('inventory','classification','usually_not_primary','Raw materials vs WIP vs finished goods.','ASC 330'),
  ('inventory','presentation_disclosure','relevant','Costing method, reserves, LIFO reserve if applicable.','ASC 330'),
  -- FIXED_ASSETS -----------------------------------------------------
  ('fixed_assets','existence_occurrence','relevant','Physical existence and continued use; disposals must be recorded.','ISA 315 ¶A190'),
  ('fixed_assets','completeness','relevant','All acquisitions must be capitalized when meeting recognition criteria.','ASC 360'),
  ('fixed_assets','rights_obligations','relevant','Entity must own or have qualifying lease (right-of-use).','ASC 842'),
  ('fixed_assets','valuation_allocation','relevant','Depreciation, impairment, ROU asset measurement.','ASC 360, ASC 842'),
  ('fixed_assets','accuracy','usually_not_primary','Depreciation schedule math.','ASC 360'),
  ('fixed_assets','cutoff','usually_not_primary','Acquisitions/disposals placed in service correctly.','ASC 360'),
  ('fixed_assets','classification','usually_not_primary','Capital vs expense; asset class buckets.','ASC 360'),
  ('fixed_assets','presentation_disclosure','relevant','Depreciation method, useful lives, impairment triggers, ROU reconciliation.','ASC 360, ASC 842'),
  -- OTHER_CURRENT_ASSETS --------------------------------------------
  ('other_current_assets','existence_occurrence','relevant','Prepaids, advances, deposits must represent real future benefit.','ISA 315 ¶A190'),
  ('other_current_assets','completeness','relevant','All prepaid amounts must be recorded.','ISA 315 ¶A190'),
  ('other_current_assets','rights_obligations','relevant','Entity must control the future benefit.','ISA 315 ¶A190'),
  ('other_current_assets','valuation_allocation','relevant','Amortization of prepaids; recoverability of deposits.','ASC 340'),
  ('other_current_assets','accuracy','usually_not_primary','Amortization math.','ASC 340'),
  ('other_current_assets','cutoff','usually_not_primary','Recognition and amortization periods.','ASC 340'),
  ('other_current_assets','classification','usually_not_primary','Current vs long-term.','ASC 210'),
  ('other_current_assets','presentation_disclosure','usually_not_primary','Material components disclosed.','ASC 210'),
  -- OTHER_NON_CURRENT_ASSETS ----------------------------------------
  ('other_non_current_assets','existence_occurrence','relevant','Intangibles, goodwill, deferred tax assets must exist.','ISA 315 ¶A190'),
  ('other_non_current_assets','completeness','relevant','All qualifying assets recorded.','ISA 315 ¶A190'),
  ('other_non_current_assets','rights_obligations','relevant','Legal or contractual rights must be verified.','ASC 350'),
  ('other_non_current_assets','valuation_allocation','relevant','Impairment testing, amortization, DTA realizability.','ASC 350, ASC 740'),
  ('other_non_current_assets','accuracy','usually_not_primary','Amortization / valuation math.','ASC 350'),
  ('other_non_current_assets','cutoff','usually_not_primary','Recognition timing on acquisition.','ASC 350'),
  ('other_non_current_assets','classification','usually_not_primary','Goodwill vs finite-life vs indefinite-life.','ASC 350'),
  ('other_non_current_assets','presentation_disclosure','relevant','Impairment charges, DTA valuation allowance narrative.','ASC 350, ASC 740'),
  -- ACCOUNTS_PAYABLE ------------------------------------------------
  ('accounts_payable','existence_occurrence','usually_not_primary','Existence rarely the primary risk (understatement is dominant).','ISA 315 ¶A190; AICPA Audit Guide'),
  ('accounts_payable','completeness','relevant','Unrecorded / late-received invoices are the primary AP risk.','ISA 315 ¶A190; SAS 145 inherent-risk factors'),
  ('accounts_payable','rights_obligations','relevant','Recorded payables must be true obligations of the entity.','ISA 315 ¶A190'),
  ('accounts_payable','valuation_allocation','usually_not_primary','Face value; FX for foreign-denominated payables.','ASC 830'),
  ('accounts_payable','accuracy','relevant','Bill amount, terms, and coding must match invoice.','ISA 315 ¶A190'),
  ('accounts_payable','cutoff','relevant','Search for unrecorded liabilities at period end; invoice-date vs receipt-date.','AICPA Audit Guide ch. 10'),
  ('accounts_payable','classification','usually_not_primary','Trade vs accrued vs related-party.','ASC 210'),
  ('accounts_payable','presentation_disclosure','usually_not_primary','Aging, related-party, contingent liabilities.','ASC 275, ASC 850'),
  -- ACCRUED_LIABILITIES ---------------------------------------------
  ('accrued_liabilities','existence_occurrence','usually_not_primary','Similar to AP.','ISA 315 ¶A190'),
  ('accrued_liabilities','completeness','relevant','Unaccrued expenses at period end are the dominant risk.','ISA 315 ¶A190'),
  ('accrued_liabilities','rights_obligations','relevant','Must be a present obligation.','ASC 405'),
  ('accrued_liabilities','valuation_allocation','relevant','Estimation of amount (bonuses, PTO, warranty).','ASC 450, ASC 460'),
  ('accrued_liabilities','accuracy','usually_not_primary','Estimation math.','ISA 315 ¶A190'),
  ('accrued_liabilities','cutoff','relevant','Accrual must fall in the period of the underlying activity.','ASC 720'),
  ('accrued_liabilities','classification','usually_not_primary','Current vs long-term.','ASC 210'),
  ('accrued_liabilities','presentation_disclosure','relevant','Contingent liability disclosure, warranty rollforward.','ASC 450, ASC 460'),
  -- OTHER_CURRENT_LIABILITIES ---------------------------------------
  ('other_current_liabilities','existence_occurrence','usually_not_primary','Rarely primary.','ISA 315 ¶A190'),
  ('other_current_liabilities','completeness','relevant','Unrecorded deferred revenue, customer deposits, tax liabilities.','ASC 606, ASC 740'),
  ('other_current_liabilities','rights_obligations','relevant','Must be a present obligation.','ASC 405'),
  ('other_current_liabilities','valuation_allocation','relevant','Deferred revenue amortization schedules.','ASC 606'),
  ('other_current_liabilities','accuracy','usually_not_primary','Deferred revenue math.','ASC 606'),
  ('other_current_liabilities','cutoff','relevant','Deferred revenue recognition timing.','ASC 606-10-25'),
  ('other_current_liabilities','classification','usually_not_primary','Current vs long-term.','ASC 210'),
  ('other_current_liabilities','presentation_disclosure','relevant','Deferred revenue rollforward, tax positions.','ASC 606, ASC 740'),
  -- LONG_TERM_DEBT --------------------------------------------------
  ('long_term_debt','existence_occurrence','relevant','Confirm with lender; loan agreements.','AICPA Audit Guide'),
  ('long_term_debt','completeness','relevant','Unrecorded debt, guarantees, off-balance-sheet arrangements.','ASC 470, ASC 460'),
  ('long_term_debt','rights_obligations','relevant','Debt covenants, subordination, security.','ASC 470'),
  ('long_term_debt','valuation_allocation','relevant','Discount/premium amortization, effective interest method.','ASC 835'),
  ('long_term_debt','accuracy','usually_not_primary','Interest math, amortization schedule.','ASC 835'),
  ('long_term_debt','cutoff','usually_not_primary','Interest accrual through period end.','ASC 835'),
  ('long_term_debt','classification','relevant','Current portion vs long-term; covenant-violation reclass.','ASC 470-10-45'),
  ('long_term_debt','presentation_disclosure','relevant','Maturity schedule, covenants, interest terms.','ASC 470'),
  -- EQUITY ----------------------------------------------------------
  ('equity','existence_occurrence','usually_not_primary','Rarely primary.','ISA 315 ¶A190'),
  ('equity','completeness','relevant','All issuances, buybacks, dividends must be recorded.','ASC 505'),
  ('equity','rights_obligations','relevant','Legal validity of share classes, options, warrants.','ASC 505, ASC 718'),
  ('equity','valuation_allocation','relevant','Stock-comp expense valuation, treasury stock method.','ASC 718'),
  ('equity','accuracy','usually_not_primary','Share-count math.','ASC 505'),
  ('equity','cutoff','usually_not_primary','Grant date, vesting.','ASC 718'),
  ('equity','classification','relevant','Debt-like preferred vs equity; mezzanine.','ASC 480, ASC 505'),
  ('equity','presentation_disclosure','relevant','Rollforward, dilution, share-based payment terms.','ASC 505, ASC 718'),
  -- REVENUE ---------------------------------------------------------
  ('revenue','existence_occurrence','relevant','Recorded revenue must represent real completed performance obligations.','ASC 606-10-25; PCAOB AS 12 presumed fraud risk'),
  ('revenue','completeness','usually_not_primary','Understated revenue is rare fraud direction.','ASC 606'),
  ('revenue','rights_obligations','not_applicable','Applies to balance sheet only.','ISA 315 ¶A190'),
  ('revenue','valuation_allocation','not_applicable','Applies to balance sheet only.','ISA 315 ¶A190'),
  ('revenue','accuracy','relevant','Contract price allocation across performance obligations, variable consideration.','ASC 606-10-32'),
  ('revenue','cutoff','relevant','Performance-obligation satisfaction timing — over-time vs point-in-time.','ASC 606-10-25'),
  ('revenue','classification','relevant','Gross vs net (principal vs agent), product vs service, revenue vs other income.','ASC 606-10-55'),
  ('revenue','presentation_disclosure','relevant','Disaggregation, contract-balance rollforward, performance-obligation description.','ASC 606-10-50'),
  -- COST_OF_GOODS_SOLD ---------------------------------------------
  ('cost_of_goods_sold','existence_occurrence','usually_not_primary','Rarely primary.','ISA 315 ¶A190'),
  ('cost_of_goods_sold','completeness','relevant','COGS must match revenue recognized.','ASC 606, ASC 330'),
  ('cost_of_goods_sold','rights_obligations','not_applicable','P&L only.','ISA 315 ¶A190'),
  ('cost_of_goods_sold','valuation_allocation','not_applicable','P&L only.','ISA 315 ¶A190'),
  ('cost_of_goods_sold','accuracy','relevant','Costing method, absorption, standard-cost variances.','ASC 330'),
  ('cost_of_goods_sold','cutoff','relevant','Match to revenue period.','ASC 606'),
  ('cost_of_goods_sold','classification','relevant','COGS vs operating-expense classification.','ASC 220'),
  ('cost_of_goods_sold','presentation_disclosure','usually_not_primary','Cost method disclosure.','ASC 330'),
  -- OPERATING_EXPENSES ---------------------------------------------
  ('operating_expenses','existence_occurrence','relevant','Real, business-purpose expenses.','ISA 315 ¶A190'),
  ('operating_expenses','completeness','relevant','Unrecorded expenses — reciprocal of AP completeness.','ISA 315 ¶A190'),
  ('operating_expenses','rights_obligations','not_applicable','P&L only.','ISA 315 ¶A190'),
  ('operating_expenses','valuation_allocation','not_applicable','P&L only.','ISA 315 ¶A190'),
  ('operating_expenses','accuracy','relevant','Amount, GL account, cost center coding.','ISA 315 ¶A190'),
  ('operating_expenses','cutoff','relevant','Period of consumption / accrual.','ASC 720'),
  ('operating_expenses','classification','relevant','Function vs nature classification; COGS vs OpEx boundary.','ASC 220'),
  ('operating_expenses','presentation_disclosure','usually_not_primary','Material line-item disclosure.','ASC 220'),
  -- OTHER_INCOME_EXPENSE -------------------------------------------
  ('other_income_expense','existence_occurrence','usually_not_primary','Rarely primary.','ISA 315 ¶A190'),
  ('other_income_expense','completeness','relevant','Investment income, FX, non-operating gains often understated.','ASC 220'),
  ('other_income_expense','rights_obligations','not_applicable','P&L only.','ISA 315 ¶A190'),
  ('other_income_expense','valuation_allocation','not_applicable','P&L only.','ISA 315 ¶A190'),
  ('other_income_expense','accuracy','usually_not_primary','Investment/FX math.','ASC 320, ASC 830'),
  ('other_income_expense','cutoff','usually_not_primary','Recognition timing.','ASC 320'),
  ('other_income_expense','classification','relevant','Non-operating vs operating classification.','ASC 220'),
  ('other_income_expense','presentation_disclosure','relevant','Nature of non-operating items.','ASC 220'),
  -- TAX_EXPENSE -----------------------------------------------------
  ('tax_expense','existence_occurrence','usually_not_primary','Rarely primary.','ISA 315 ¶A190'),
  ('tax_expense','completeness','relevant','Uncertain tax positions, state/local, R&D credits.','ASC 740'),
  ('tax_expense','rights_obligations','not_applicable','P&L only.','ISA 315 ¶A190'),
  ('tax_expense','valuation_allocation','not_applicable','P&L only.','ISA 315 ¶A190'),
  ('tax_expense','accuracy','relevant','Rate application, permanent vs temporary differences.','ASC 740'),
  ('tax_expense','cutoff','usually_not_primary','Accrual through period end.','ASC 740'),
  ('tax_expense','classification','relevant','Current vs deferred; tax-benefit-of-loss.','ASC 740'),
  ('tax_expense','presentation_disclosure','relevant','Effective rate reconciliation, UTP rollforward.','ASC 740'),
  -- OFF_BALANCE_SHEET ----------------------------------------------
  ('off_balance_sheet','existence_occurrence','relevant','Guarantees, indemnifications, VIEs must be identified.','ASC 460, ASC 810'),
  ('off_balance_sheet','completeness','relevant','Contingent liabilities, purchase commitments often unrecorded.','ASC 450, ASC 460'),
  ('off_balance_sheet','rights_obligations','relevant','Enforceability of guarantee terms.','ASC 460'),
  ('off_balance_sheet','valuation_allocation','relevant','Probable-loss estimation for contingencies.','ASC 450'),
  ('off_balance_sheet','accuracy','usually_not_primary','Estimation math.','ASC 450'),
  ('off_balance_sheet','cutoff','usually_not_primary','Recognition triggers.','ASC 450'),
  ('off_balance_sheet','classification','usually_not_primary','Recognized vs disclosed only.','ASC 450'),
  ('off_balance_sheet','presentation_disclosure','relevant','This is where these items live — footnote narrative.','ASC 450, ASC 460, ASC 810'),
  -- DISCLOSURE_ONLY ------------------------------------------------
  ('disclosure_only','existence_occurrence','not_applicable','No book balance.','ISA 315 ¶A190'),
  ('disclosure_only','completeness','relevant','Required disclosures (segment, related-party, subsequent events) must be complete.','ASC 280, ASC 850, ASC 855'),
  ('disclosure_only','rights_obligations','not_applicable','No book balance.','ISA 315 ¶A190'),
  ('disclosure_only','valuation_allocation','not_applicable','No book balance.','ISA 315 ¶A190'),
  ('disclosure_only','accuracy','relevant','Disclosed amounts / narrative must be factually correct.','ISA 315 ¶A190'),
  ('disclosure_only','cutoff','relevant','Subsequent-events cutoff.','ASC 855'),
  ('disclosure_only','classification','relevant','Related-party vs arms-length labeling.','ASC 850'),
  ('disclosure_only','presentation_disclosure','relevant','Adequacy, understandability, framework compliance.','ISA 315 ¶A190')
on conflict (account_category, assertion_id) do update set
  relevance  = excluded.relevance,
  rationale  = excluded.rationale,
  citation   = excluded.citation,
  updated_at = now();
-- ---------- 3. rule_assertion_coverage ---------------------------------
create table if not exists public.rule_assertion_coverage (
  coverage_id         uuid primary key default gen_random_uuid(),
  rule_id             text not null references public.curated_rules_registry(rule_id) on delete cascade,
  assertion_id        text not null references public.assertions_catalog(assertion_id),
  coverage_strength   text not null
                        check (coverage_strength in ('primary','secondary','partial')),
  account_categories  text[] not null default '{}',
  rationale           text not null,
  citation            text not null,
  version             integer not null default 1,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (rule_id, assertion_id)
);
comment on table public.rule_assertion_coverage is
  'D-Assertions Part 1 — per-rule tagging of which assertions each rule tests. Primary = the rule directly evidences the assertion. Secondary = the rule provides corroborating evidence. Partial = the rule tests one aspect only.';
create index if not exists rule_assertion_coverage_rule_id_idx
  on public.rule_assertion_coverage (rule_id);
create index if not exists rule_assertion_coverage_assertion_id_idx
  on public.rule_assertion_coverage (assertion_id);
alter table public.rule_assertion_coverage enable row level security;
drop policy if exists "rule_assertion_coverage_service_role_all" on public.rule_assertion_coverage;
create policy "rule_assertion_coverage_service_role_all"
  on public.rule_assertion_coverage for all to service_role using (true) with check (true);
drop policy if exists "rule_assertion_coverage_authenticated_read" on public.rule_assertion_coverage;
create policy "rule_assertion_coverage_authenticated_read"
  on public.rule_assertion_coverage for select to authenticated using (true);
-- Backfill 32 rules with primary + secondary assertion tags.
-- See section 5 below for the full derivation and rationale for each row.
-- Each rule gets 1 primary + 1-3 secondary rows.
-- gen.accrual_reversal_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.accrual_reversal_check','cutoff','primary','{accrued_liabilities,operating_expenses}','Ensures period-end accruals reverse in the correct subsequent period.','ASC 720; ISA 315 ¶A190'),
  ('gen.accrual_reversal_check','completeness','secondary','{accrued_liabilities}','Verifies no accruals are left dangling into the next period.','ISA 315 ¶A190'),
  ('gen.accrual_reversal_check','accuracy','secondary','{operating_expenses}','Reversal amount must match original accrual.','ISA 315 ¶A190')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.ap_missed_vendor_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.ap_missed_vendor_check','completeness','primary','{accounts_payable,operating_expenses}','Detects vendors that historically bill but have no bill in the current period — the classic search-for-unrecorded-liabilities test.','AICPA Audit Guide ch. 10'),
  ('gen.ap_missed_vendor_check','cutoff','secondary','{accounts_payable}','Missing bill may indicate a cutoff error rather than true absence.','ISA 315 ¶A190')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.cash_negative_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.cash_negative_check','valuation_allocation','primary','{cash}','Negative book cash indicates recording error or true overdraft (which must reclassify to liability).','ASC 210, ASC 830'),
  ('gen.cash_negative_check','classification','secondary','{cash,accounts_payable}','Overdraft may need reclass from cash to book-overdraft liability.','ASC 210'),
  ('gen.cash_negative_check','accuracy','secondary','{cash}','May reveal recording/coding errors.','ISA 315 ¶A190')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.depreciation_scheduled_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.depreciation_scheduled_check','valuation_allocation','primary','{fixed_assets,operating_expenses}','Depreciation is the mechanical valuation-allocation of fixed-asset cost over useful life.','ASC 360'),
  ('gen.depreciation_scheduled_check','completeness','secondary','{operating_expenses}','Missing depreciation JE means expense is understated.','ISA 315 ¶A190'),
  ('gen.depreciation_scheduled_check','cutoff','secondary','{operating_expenses}','Depreciation must land in the correct period.','ASC 360')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.duplicate_vendor_bill_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.duplicate_vendor_bill_check','existence_occurrence','primary','{accounts_payable,operating_expenses}','A duplicate bill is a fictitious occurrence — the underlying event happened once, not twice.','ISA 315 ¶A190; PCAOB AS 12 fraud presumption'),
  ('gen.duplicate_vendor_bill_check','accuracy','secondary','{accounts_payable,operating_expenses}','May reveal keying errors as opposed to true duplicates.','ISA 315 ¶A190')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.gl_mapping_variance_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.gl_mapping_variance_check','classification','primary','{operating_expenses,cost_of_goods_sold,revenue}','Detects GL accounts that historically posted to one category but suddenly changed.','ISA 315 ¶A190'),
  ('gen.gl_mapping_variance_check','presentation_disclosure','secondary','{operating_expenses,cost_of_goods_sold}','Reclassification affects P&L presentation.','ASC 220')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.je_balance_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.je_balance_check','accuracy','primary','{revenue,operating_expenses,cost_of_goods_sold,accounts_payable,accounts_receivable}','Debits-equal-credits is the foundational accuracy test for double-entry accounting.','FASB Concepts Statement 5; ISA 315 ¶A190'),
  ('gen.je_balance_check','completeness','secondary','{}','An unbalanced JE indicates a missing side.','ISA 315 ¶A190')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.je_period_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.je_period_check','cutoff','primary','{revenue,operating_expenses,cost_of_goods_sold}','Verifies JEs are posted to the intended period.','ISA 315 ¶A190; ASC 720'),
  ('gen.je_period_check','existence_occurrence','secondary','{revenue,operating_expenses}','A JE posted to a closed period may indicate manipulation.','PCAOB AS 12 fraud presumption')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.prepaid_amortization_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.prepaid_amortization_check','valuation_allocation','primary','{other_current_assets,operating_expenses}','Prepaid amortization is a valuation-allocation of prepaid balance over service period.','ASC 340'),
  ('gen.prepaid_amortization_check','cutoff','secondary','{operating_expenses}','Amortization must match consumption period.','ASC 340'),
  ('gen.prepaid_amortization_check','completeness','secondary','{operating_expenses}','Missing amortization understates expense.','ISA 315 ¶A190')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.revenue_cutoff_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.revenue_cutoff_check','cutoff','primary','{revenue,accounts_receivable}','Verifies revenue is recognized in the correct period per ASC 606 performance-obligation satisfaction.','ASC 606-10-25'),
  ('gen.revenue_cutoff_check','existence_occurrence','secondary','{revenue}','Post-period-close bookings may indicate channel stuffing.','PCAOB AS 12 fraud presumption'),
  ('gen.revenue_cutoff_check','accuracy','secondary','{revenue}','Contract price allocation.','ASC 606-10-32')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.reversing_entry_period_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.reversing_entry_period_check','cutoff','primary','{accrued_liabilities,operating_expenses}','Reversing entries must land in the correct period to avoid double-counting.','ISA 315 ¶A190'),
  ('gen.reversing_entry_period_check','accuracy','secondary','{accrued_liabilities,operating_expenses}','Reversal amount must equal original.','ISA 315 ¶A190')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- gen.subledger_tie_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('gen.subledger_tie_check','completeness','primary','{accounts_receivable,accounts_payable,inventory}','GL-to-subledger reconciliation ensures no items are missing from either side.','AICPA Audit Guide'),
  ('gen.subledger_tie_check','accuracy','primary','{accounts_receivable,accounts_payable,inventory}','Detail must tie exactly to control account.','AICPA Audit Guide'),
  ('gen.subledger_tie_check','existence_occurrence','secondary','{accounts_receivable,accounts_payable}','GL balance not supported by subledger detail may be fictitious.','ISA 315 ¶A190')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- mfg.absorption_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('mfg.absorption_check','valuation_allocation','primary','{inventory,cost_of_goods_sold}','Manufacturing overhead absorption is a valuation-allocation of period costs into inventory.','ASC 330'),
  ('mfg.absorption_check','classification','secondary','{cost_of_goods_sold,operating_expenses}','Under/over-absorption affects COGS vs period-cost classification.','ASC 330-10-30'),
  ('mfg.absorption_check','completeness','secondary','{inventory}','Under-absorbed overhead may indicate incomplete cost capitalization.','ASC 330')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- mfg.cogs_variance_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('mfg.cogs_variance_check','accuracy','primary','{cost_of_goods_sold}','Standard-cost vs actual variance flags accuracy errors in cost recording.','ASC 330'),
  ('mfg.cogs_variance_check','valuation_allocation','primary','{inventory,cost_of_goods_sold}','Variance disposition (COGS vs inventory) affects both accounts.','ASC 330-10-30')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- mfg.freight_capitalization_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('mfg.freight_capitalization_check','classification','primary','{inventory,operating_expenses,cost_of_goods_sold}','Freight-in is a capitalizable inventory cost; freight-out is a period cost.','ASC 330-10-30'),
  ('mfg.freight_capitalization_check','valuation_allocation','secondary','{inventory}','Inventory carrying cost.','ASC 330')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- mfg.inventory_reconciliation_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('mfg.inventory_reconciliation_check','existence_occurrence','primary','{inventory}','Physical count reconciliation is the primary existence test for inventory.','ISA 501; AICPA Audit Guide'),
  ('mfg.inventory_reconciliation_check','completeness','primary','{inventory}','Perpetual vs physical variance may reveal missing items.','ISA 501'),
  ('mfg.inventory_reconciliation_check','accuracy','secondary','{inventory}','Cycle-count math must tie.','ASC 330')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- mfg.scrap_variance_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('mfg.scrap_variance_check','valuation_allocation','primary','{inventory,cost_of_goods_sold}','Scrap variance affects inventory valuation and COGS accuracy.','ASC 330-10-30'),
  ('mfg.scrap_variance_check','completeness','secondary','{inventory}','Unrecorded scrap may indicate theft or unrecorded loss.','ASC 330-10-35')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- mfg.standard_cost_capitalization_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('mfg.standard_cost_capitalization_check','valuation_allocation','primary','{inventory}','Standard-cost values must approximate actuals per ASC 330.','ASC 330-10-30'),
  ('mfg.standard_cost_capitalization_check','accuracy','secondary','{inventory,cost_of_goods_sold}','BOM-driven cost math.','ASC 330')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- mfg.warranty_accrual_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('mfg.warranty_accrual_check','completeness','primary','{accrued_liabilities,operating_expenses}','Warranty liability is a mandatory accrual under ASC 460.','ASC 460-10-25'),
  ('mfg.warranty_accrual_check','valuation_allocation','primary','{accrued_liabilities}','Warranty estimate methodology (historical claims rate).','ASC 460-10-30'),
  ('mfg.warranty_accrual_check','presentation_disclosure','secondary','{accrued_liabilities}','Warranty rollforward disclosure.','ASC 460-10-50')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- mfg.wip_cutoff_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('mfg.wip_cutoff_check','cutoff','primary','{inventory,cost_of_goods_sold}','WIP-to-FG transition must be recorded in the correct period.','ASC 330'),
  ('mfg.wip_cutoff_check','completeness','secondary','{inventory}','Missing WIP entries understate inventory.','ASC 330')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- ps.bill_rate_variance_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('ps.bill_rate_variance_check','accuracy','primary','{revenue,accounts_receivable}','Bill rate variance vs standard flags accuracy errors in invoice rate.','ASC 606-10-32'),
  ('ps.bill_rate_variance_check','completeness','secondary','{revenue}','Rate discount without approval may indicate revenue understatement.','ASC 606')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- ps.contract_asset_reclass_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('ps.contract_asset_reclass_check','classification','primary','{accounts_receivable,other_current_assets}','Contract asset → AR reclass upon unconditional right to consideration.','ASC 606-10-45'),
  ('ps.contract_asset_reclass_check','presentation_disclosure','secondary','{other_current_assets}','Contract balance rollforward disclosure.','ASC 606-10-50')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- ps.project_margin_flag_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('ps.project_margin_flag_check','valuation_allocation','primary','{revenue,other_current_assets,accrued_liabilities}','Project margin drives loss-contract accrual and contract-asset impairment.','ASC 606-10-25, ASC 605-35'),
  ('ps.project_margin_flag_check','completeness','secondary','{accrued_liabilities}','Loss contracts must be accrued when identified.','ASC 605-35-25')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- ps.revenue_percent_complete_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('ps.revenue_percent_complete_check','cutoff','primary','{revenue,other_current_assets}','Over-time revenue recognition based on progress measurement.','ASC 606-10-25'),
  ('ps.revenue_percent_complete_check','accuracy','primary','{revenue}','Progress-measurement method must produce accurate revenue amount.','ASC 606-10-25'),
  ('ps.revenue_percent_complete_check','existence_occurrence','secondary','{revenue}','Progress must be actually earned, not merely booked.','ASC 606')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- ps.unbilled_receivables_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('ps.unbilled_receivables_check','completeness','primary','{other_current_assets,revenue}','Unbilled AR (contract asset) must be recorded for revenue earned but not yet invoiced.','ASC 606-10-45'),
  ('ps.unbilled_receivables_check','valuation_allocation','secondary','{other_current_assets}','Contract-asset impairment testing.','ASC 606-10-45')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- ps.wip_billable_hours_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('ps.wip_billable_hours_check','completeness','primary','{revenue,other_current_assets}','Unbilled billable hours must be captured as WIP/contract asset.','ASC 606-10-45'),
  ('ps.wip_billable_hours_check','accuracy','secondary','{revenue}','Hours × rate math.','ASC 606-10-32')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- rtl.cogs_recognition_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('rtl.cogs_recognition_check','cutoff','primary','{cost_of_goods_sold,inventory}','COGS must be matched to revenue in the same period.','ASC 606, ASC 330'),
  ('rtl.cogs_recognition_check','completeness','secondary','{cost_of_goods_sold}','Missing COGS entries overstate margin.','ASC 330')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- rtl.gift_card_liability_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('rtl.gift_card_liability_check','completeness','primary','{other_current_liabilities,revenue}','Gift card sales create deferred revenue until redemption or breakage.','ASC 606-10-25'),
  ('rtl.gift_card_liability_check','valuation_allocation','primary','{other_current_liabilities,revenue}','Breakage estimation.','ASC 606-10-55'),
  ('rtl.gift_card_liability_check','presentation_disclosure','secondary','{other_current_liabilities}','Deferred revenue rollforward disclosure.','ASC 606-10-50')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- rtl.inventory_shrink_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('rtl.inventory_shrink_check','existence_occurrence','primary','{inventory}','Shrinkage indicates recorded inventory that no longer exists.','ISA 501; ASC 330'),
  ('rtl.inventory_shrink_check','valuation_allocation','secondary','{inventory,cost_of_goods_sold}','Shrink loss written to COGS or COGS-shrink line.','ASC 330')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- rtl.loyalty_reward_liability_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('rtl.loyalty_reward_liability_check','completeness','primary','{other_current_liabilities,revenue}','Loyalty rewards are material rights that create separate performance obligations.','ASC 606-10-55'),
  ('rtl.loyalty_reward_liability_check','valuation_allocation','primary','{other_current_liabilities}','Standalone selling price allocation for reward-point issuance.','ASC 606-10-32'),
  ('rtl.loyalty_reward_liability_check','presentation_disclosure','secondary','{other_current_liabilities}','Rollforward and redemption disclosure.','ASC 606-10-50')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- rtl.sales_returns_reserve_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('rtl.sales_returns_reserve_check','valuation_allocation','primary','{accounts_receivable,revenue,other_current_liabilities}','Returns reserve is a variable-consideration adjustment to transaction price.','ASC 606-10-32'),
  ('rtl.sales_returns_reserve_check','completeness','secondary','{other_current_liabilities}','Missing reserve overstates revenue.','ASC 606')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- rtl.seasonal_markdown_check
insert into public.rule_assertion_coverage (rule_id, assertion_id, coverage_strength, account_categories, rationale, citation) values
  ('rtl.seasonal_markdown_check','valuation_allocation','primary','{inventory}','Lower of cost or NRV — seasonal markdowns force NRV testing.','ASC 330-10-35'),
  ('rtl.seasonal_markdown_check','cutoff','secondary','{cost_of_goods_sold}','Markdown recognition period.','ASC 330-10-35')
on conflict (rule_id, assertion_id) do update set
  coverage_strength = excluded.coverage_strength, account_categories = excluded.account_categories,
  rationale = excluded.rationale, citation = excluded.citation, updated_at = now();
-- ---------- 4. Widen ai_action_log_action_category_check -------------
-- IMPORTANT: reconcile against live baseline first. Expected current union
-- (from D6.4d) includes all the D-Platform, D6.4c-1, D6.4c-3, and D6.4d
-- categories. Add exactly two new categories.
alter table public.ai_action_log
  drop constraint if exists ai_action_log_action_category_check;
alter table public.ai_action_log
  add constraint ai_action_log_action_category_check check (
    action_category in (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change',
      'assertion_coverage_scan','assertion_gap_reasoning'
    )
  );
-- ---------- 5. Widen ledger_events_event_category_check --------------
alter table public.ledger_events
  drop constraint if exists ledger_events_event_category_check;
alter table public.ledger_events
  add constraint ledger_events_event_category_check check (
    event_category in (
      'intake','ledger','cash_app','ar','ap','recon','close','assertion',
      'rule','directive','ai_action','system','entitlement','posting',
      'reviewer_ui'
    )
  );
-- (Note: 'assertion' was already in the D-Platform baseline union — no new
-- element needed. Kept the widening call here for idempotence + audit trail.)
commit;
-- <<< end 20260707120000_d_assertions_part_1_schema_and_backfill.sql

-- >>> begin 20260707130000_d_assertions_part_2_coverage_projection.sql
-- =============================================================================
-- D-Assertions Part 2 — close_assertion_coverage projection + gap reasoning
-- =============================================================================
-- Adds:
--   1. advisacor_flags                     — global feature-flag table (creates if missing)
--   2. assertion_gap_root_causes           — enum + descriptions (PCAOB QC 1000 pattern)
--   3. close_assertion_coverage            — per-close × account_category × assertion projection
--   4. close_assertion_coverage_events     — event-sourced audit trail
--   5. Widens ai_action_log_action_category_check (idempotent — Part 1 already added
--      'assertion_coverage_scan' and 'assertion_gap_reasoning')
--   6. Widens ledger_events_event_category_check (idempotent — 'assertion' already present)
--   7. Seeds root-cause taxonomy
--   8. Seeds default flag rows (assertions_gap_reasoning_enabled = false)
-- =============================================================================
begin;
-- ---------------------------------------------------------------------------
-- 1. advisacor_flags — global feature flags (create if not exists)
-- ---------------------------------------------------------------------------
create table if not exists public.advisacor_flags (
  flag_key      text primary key,
  flag_value    boolean not null default false,
  description   text not null,
  updated_at    timestamptz not null default now(),
  updated_by    text
);
comment on table public.advisacor_flags is
  'Global feature flags. Read via lib/flags. Do not add per-firm flags here — use client-level tables for that.';
alter table public.advisacor_flags enable row level security;
drop policy if exists "advisacor_flags_service_role_all" on public.advisacor_flags;
create policy "advisacor_flags_service_role_all"
  on public.advisacor_flags for all to service_role using (true) with check (true);
drop policy if exists "advisacor_flags_authenticated_read" on public.advisacor_flags;
create policy "advisacor_flags_authenticated_read"
  on public.advisacor_flags for select to authenticated using (true);
insert into public.advisacor_flags (flag_key, flag_value, description)
values
  ('assertions_gap_reasoning_enabled', false,
   'When true, close_assertion_coverage gap rows call the LLM gap reasoner. When false, gaps get deterministic status only. Flip to true after Bedrock model access is approved.'),
  ('assertions_projection_worker_enabled', true,
   'When true, POST /assertion-coverage/recompute actually runs the projection. Set to false to hard-disable while investigating a bad projection.')
on conflict (flag_key) do nothing;
-- ---------------------------------------------------------------------------
-- 2. assertion_gap_root_causes — enum-driven taxonomy
-- ---------------------------------------------------------------------------
create table if not exists public.assertion_gap_root_causes (
  root_cause_code    text primary key,
  display_name       text not null,
  description        text not null,
  pcaob_reference    text not null,
  version            integer not null default 1,
  created_at         timestamptz not null default now()
);
comment on table public.assertion_gap_root_causes is
  'Root cause taxonomy for assertion coverage gaps. Mirrors PCAOB QC 1000 root-cause-analysis pattern. LLM reasoner selects from this closed set.';
alter table public.assertion_gap_root_causes enable row level security;
drop policy if exists "assertion_gap_root_causes_service_role_all" on public.assertion_gap_root_causes;
create policy "assertion_gap_root_causes_service_role_all"
  on public.assertion_gap_root_causes for all to service_role using (true) with check (true);
drop policy if exists "assertion_gap_root_causes_authenticated_read" on public.assertion_gap_root_causes;
create policy "assertion_gap_root_causes_authenticated_read"
  on public.assertion_gap_root_causes for select to authenticated using (true);
insert into public.assertion_gap_root_causes
  (root_cause_code, display_name, description, pcaob_reference)
values
  ('no_rule_defined',
   'No rule defined for this assertion × account category',
   'The curated rule registry does not contain any rule that covers this account_category × assertion pair. This is a coverage design gap, not an execution gap.',
   'PCAOB QC 1000 §.15 (root cause: system design)'),
  ('rule_defined_but_not_fired',
   'Rule exists but did not fire this period',
   'A rule tagged with this assertion exists in the registry but produced no fires with outcome=fired for this close period. Possible causes: rule was suppressed, all instances were within threshold, or the underlying data pattern did not trigger.',
   'PCAOB QC 1000 §.15 (root cause: system operation)'),
  ('rule_fired_but_all_suppressed',
   'Rule fired but all fires were suppressed',
   'At least one fire exists but every fire has outcome=suppressed. Coverage is nominal, not substantive.',
   'PCAOB QC 1000 §.15 (root cause: threshold calibration)'),
  ('rule_errored',
   'Rule errored during execution',
   'The rule attempted to run but encountered an execution error. Coverage cannot be claimed until the rule executes successfully.',
   'PCAOB QC 1000 §.15 (root cause: system reliability)'),
  ('assertion_not_relevant',
   'Assertion is not relevant for this account category',
   'The relevance matrix marks this pair as not_applicable or usually_not_primary. No gap remediation needed.',
   'ISA 315 (Revised 2019) ¶A128'),
  ('coverage_partial_by_design',
   'Coverage is partial by design (secondary tag only)',
   'The only rules covering this pair tag the assertion as secondary. This is intentional partial coverage; upgrade the tag or add a primary-tagged rule to strengthen.',
   'ISA 330 ¶7'),
  ('manual_test_documented',
   'Coverage came from a documented manual test',
   'A reviewer attached a manual test workpaper reference. This is an accepted coverage path when automation is not feasible.',
   'PCAOB AS 2301 ¶08')
on conflict (root_cause_code) do nothing;
-- ---------------------------------------------------------------------------
-- 3. close_assertion_coverage — per-close × account_category × assertion projection
-- ---------------------------------------------------------------------------
create table if not exists public.close_assertion_coverage (
  coverage_id                     uuid primary key default gen_random_uuid(),
  firm_client_id                  uuid not null references public.firm_clients(id) on delete cascade,
  close_period_id                 uuid not null references public.close_periods(id) on delete cascade,
  account_category                text not null
                                    check (account_category in (
                                      'cash','accounts_receivable','inventory','fixed_assets',
                                      'other_current_assets','other_non_current_assets',
                                      'accounts_payable','accrued_liabilities','other_current_liabilities',
                                      'long_term_debt','equity','revenue','cost_of_goods_sold',
                                      'operating_expenses','other_income_expense','tax_expense',
                                      'off_balance_sheet','disclosure_only'
                                    )),
  assertion_id                    text not null
                                    references public.assertions_catalog(assertion_id),
  relevance_at_computation        text not null
                                    check (relevance_at_computation in (
                                      'relevant','usually_not_primary','not_applicable'
                                    )),
  coverage_status                 text not null
                                    check (coverage_status in (
                                      'tested','partial','gap','not_applicable'
                                    )),
  covering_rule_ids               text[] not null default '{}',
  covering_fire_ids               uuid[] not null default '{}',
  evidence_strength               text not null default 'unassessed'
                                    check (evidence_strength in (
                                      'strong','moderate','weak','unassessed'
                                    )),
  data_source_reliability_basis   text,
  manual_test_ref                 text,
  gap_root_cause_code             text
                                    references public.assertion_gap_root_causes(root_cause_code),
  gap_reasoning_action_id         uuid
                                    references public.ai_action_log(action_id),
  gap_recommendation              text,
  computed_at                     timestamptz not null default now(),
  computed_by_worker_run_id       uuid,
  version                         integer not null default 1,
  updated_at                      timestamptz not null default now(),
  constraint close_assertion_coverage_unique
    unique (firm_client_id, close_period_id, account_category, assertion_id),
  constraint close_assertion_coverage_gap_needs_root_cause
    check (coverage_status <> 'gap' or gap_root_cause_code is not null)
);
comment on table public.close_assertion_coverage is
  'Projection: per-close × account_category × assertion coverage status. Recompute-safe (unique key). Gaps must carry a root_cause_code.';
create index if not exists close_assertion_coverage_by_close
  on public.close_assertion_coverage (firm_client_id, close_period_id);
create index if not exists close_assertion_coverage_gaps
  on public.close_assertion_coverage (firm_client_id, close_period_id)
  where coverage_status = 'gap';
alter table public.close_assertion_coverage enable row level security;
drop policy if exists "close_assertion_coverage_service_role_all" on public.close_assertion_coverage;
create policy "close_assertion_coverage_service_role_all"
  on public.close_assertion_coverage for all to service_role using (true) with check (true);
drop policy if exists "close_assertion_coverage_firm_read" on public.close_assertion_coverage;
create policy "close_assertion_coverage_firm_read"
  on public.close_assertion_coverage for select to authenticated
  using (
    exists (
      select 1
      from public.firm_clients fc
      join public.firm_memberships fm on fm.firm_id = fc.firm_id
      where fc.id = close_assertion_coverage.firm_client_id
        and fm.user_id = auth.uid()
        and fm.status = 'active'
    )
  );
-- ---------------------------------------------------------------------------
-- 4. close_assertion_coverage_events — event-sourced audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.close_assertion_coverage_events (
  event_id                  uuid primary key default gen_random_uuid(),
  firm_client_id            uuid not null references public.firm_clients(id) on delete cascade,
  close_period_id           uuid not null references public.close_periods(id) on delete cascade,
  worker_run_id             uuid not null,
  event_type                text not null
                              check (event_type in (
                                'projection_started',
                                'projection_completed',
                                'projection_failed',
                                'gap_detected',
                                'gap_reasoner_invoked',
                                'gap_reasoner_completed',
                                'gap_reasoner_skipped_flag_off',
                                'gap_reasoner_failed',
                                'manual_override_applied'
                              )),
  account_category          text,
  assertion_id              text,
  payload                   jsonb not null default '{}'::jsonb,
  actor_type                text not null default 'system'
                              check (actor_type in ('system','user')),
  actor_id                  text,
  linked_action_id          uuid references public.ai_action_log(action_id),
  correlation_id            uuid,
  occurred_at               timestamptz not null default now()
);
comment on table public.close_assertion_coverage_events is
  'Event-sourced audit trail for coverage projections. Every recompute writes projection_started + projection_completed, plus gap_detected per gap. LLM reasoner path writes gap_reasoner_* events. Survives projection rebuild.';
create index if not exists close_assertion_coverage_events_by_close
  on public.close_assertion_coverage_events (firm_client_id, close_period_id, occurred_at desc);
create index if not exists close_assertion_coverage_events_by_worker_run
  on public.close_assertion_coverage_events (worker_run_id);
alter table public.close_assertion_coverage_events enable row level security;
drop policy if exists "cac_events_service_role_all" on public.close_assertion_coverage_events;
create policy "cac_events_service_role_all"
  on public.close_assertion_coverage_events for all to service_role using (true) with check (true);
drop policy if exists "cac_events_firm_read" on public.close_assertion_coverage_events;
create policy "cac_events_firm_read"
  on public.close_assertion_coverage_events for select to authenticated
  using (
    exists (
      select 1
      from public.firm_clients fc
      join public.firm_memberships fm on fm.firm_id = fc.firm_id
      where fc.id = close_assertion_coverage_events.firm_client_id
        and fm.user_id = auth.uid()
        and fm.status = 'active'
    )
  );
-- ---------------------------------------------------------------------------
-- 5. Widen ai_action_log_action_category_check (idempotent)
-- ---------------------------------------------------------------------------
do $$
declare
  cur_def text;
begin
  select pg_get_constraintdef(oid) into cur_def
  from pg_constraint
  where conname = 'ai_action_log_action_category_check';
  if cur_def is null or cur_def not like '%assertion_coverage_scan%' or cur_def not like '%assertion_gap_reasoning%' then
    raise exception 'ai_action_log_action_category_check missing Part 1 widenings; Part 2 refusing to run';
  end if;
end$$;
-- ---------------------------------------------------------------------------
-- 6. Widen ledger_events_event_category_check (idempotent)
-- ---------------------------------------------------------------------------
do $$
declare
  cur_def text;
begin
  select pg_get_constraintdef(oid) into cur_def
  from pg_constraint
  where conname = 'ledger_events_event_category_check';
  if cur_def is null or cur_def not like '%assertion%' then
    raise exception 'ledger_events_event_category_check missing assertion category; Part 2 refusing to run';
  end if;
end$$;
commit;
-- <<< end 20260707130000_d_assertions_part_2_coverage_projection.sql

-- >>> begin 20260707140000_d_assertions_part_3_coverage_statement.sql
-- =============================================================================
-- D-Assertions Part 3 — Coverage Statement (close-packet appendix + snapshot)
-- =============================================================================
begin;

create table if not exists public.assertion_coverage_statement_versions (
  snapshot_id                 uuid primary key default gen_random_uuid(),
  close_packet_id             uuid not null references public.close_packets(id) on delete cascade,
  close_period_id             uuid not null references public.close_periods(id) on delete cascade,
  firm_client_id              uuid not null references public.firm_clients(id) on delete cascade,
  packet_version              integer not null,
  content_json                jsonb  not null,
  content_sha256              text   not null,
  coverage_row_count          integer not null,
  gap_count                   integer not null,
  tested_count                integer not null,
  partial_count               integer not null,
  not_applicable_count        integer not null,
  isa_315_baseline_version    text   not null default 'ISA 315 (Revised 2019)',
  captured_at                 timestamptz not null default now(),
  captured_by_user_id         uuid null,
  unique (close_packet_id, packet_version)
);
comment on table public.assertion_coverage_statement_versions is
  'D-Assertions Part 3 — immutable snapshot of the assertion coverage statement at close-packet lock time. Never updated after creation.';
create index if not exists acsv_by_close_period on public.assertion_coverage_statement_versions (close_period_id, captured_at desc);
create index if not exists acsv_by_firm_client  on public.assertion_coverage_statement_versions (firm_client_id, captured_at desc);
alter table public.assertion_coverage_statement_versions enable row level security;
drop policy if exists "acsv_service_role_all" on public.assertion_coverage_statement_versions;
create policy "acsv_service_role_all"
  on public.assertion_coverage_statement_versions for all to service_role using (true) with check (true);
drop policy if exists "acsv_firm_read" on public.assertion_coverage_statement_versions;
create policy "acsv_firm_read"
  on public.assertion_coverage_statement_versions for select to authenticated
  using (
    exists (
      select 1 from public.firm_memberships fm
      join public.firm_clients fc on fc.firm_id = fm.firm_id
      where fm.user_id = auth.uid()
        and fc.id = assertion_coverage_statement_versions.firm_client_id
    )
  );

create table if not exists public.assertion_coverage_statement_downloads (
  download_id                 uuid primary key default gen_random_uuid(),
  close_period_id             uuid not null references public.close_periods(id) on delete cascade,
  firm_client_id              uuid not null references public.firm_clients(id) on delete cascade,
  requested_by_user_id        uuid null,
  requested_by_email          text null,
  snapshot_id                 uuid null references public.assertion_coverage_statement_versions(snapshot_id) on delete set null,
  content_sha256              text not null,
  byte_size                   bigint not null,
  requested_at                timestamptz not null default now()
);
comment on table public.assertion_coverage_statement_downloads is
  'D-Assertions Part 3 — audit log of every standalone Coverage Statement PDF download for AS 1105 provenance.';
create index if not exists acsd_by_close_period on public.assertion_coverage_statement_downloads (close_period_id, requested_at desc);
create index if not exists acsd_by_firm_client  on public.assertion_coverage_statement_downloads (firm_client_id, requested_at desc);
alter table public.assertion_coverage_statement_downloads enable row level security;
drop policy if exists "acsd_service_role_all" on public.assertion_coverage_statement_downloads;
create policy "acsd_service_role_all"
  on public.assertion_coverage_statement_downloads for all to service_role using (true) with check (true);
drop policy if exists "acsd_firm_read" on public.assertion_coverage_statement_downloads;
create policy "acsd_firm_read"
  on public.assertion_coverage_statement_downloads for select to authenticated
  using (
    exists (
      select 1 from public.firm_memberships fm
      join public.firm_clients fc on fc.firm_id = fm.firm_id
      where fm.user_id = auth.uid()
        and fc.id = assertion_coverage_statement_downloads.firm_client_id
    )
  );

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='close_assertion_coverage') then
    raise exception 'D-Assertions Part 2 close_assertion_coverage missing — Part 3 requires Part 2 applied first';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='assertion_gap_root_causes') then
    raise exception 'D-Assertions Part 2 assertion_gap_root_causes missing — Part 3 requires Part 2 applied first';
  end if;
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='assertions_catalog') then
    raise exception 'D-Assertions Part 1 assertions_catalog missing — Part 3 requires Part 1 applied first';
  end if;
end $$;

commit;
-- <<< end 20260707140000_d_assertions_part_3_coverage_statement.sql

-- >>> begin 20260707150000_d_assertions_part_4_je_propagation.sql
-- D-Assertions Part 4 — JE post-time assertion propagation
-- Adds assertions_addressed to je_posting_audit and lights up assertion_tags
-- on pre_close_review_items with a validation constraint tied to assertions_catalog.
--
-- Non-band-aid guarantees:
-- 1. Both columns validated by a plpgsql function that reads assertions_catalog,
--    so any typo (e.g. 'complete' instead of 'completeness') fails at write time.
-- 2. GIN indexes on both columns for efficient drill-down queries in Part 5.
-- 3. No backfill of historical rows — historical je_posting_audit rows retain '{}'
--    since the rule → assertion mapping did not exist at their post time.
--    Any retrospective mapping would fabricate evidence and violate the AS 1105
--    reliability chain.
BEGIN;

-- 1. Validation function shared by both tables.
CREATE OR REPLACE FUNCTION validate_assertions_array(assertion_ids text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  a text;
  known_count int;
BEGIN
  IF assertion_ids IS NULL OR array_length(assertion_ids, 1) IS NULL THEN
    RETURN true; -- empty array is valid
  END IF;
  -- reject duplicates
  IF array_length(assertion_ids, 1) <> (SELECT count(DISTINCT x) FROM unnest(assertion_ids) x) THEN
    RETURN false;
  END IF;
  -- every element must exist in assertions_catalog
  SELECT count(*) INTO known_count
    FROM assertions_catalog
   WHERE assertion_id = ANY(assertion_ids);
  RETURN known_count = array_length(assertion_ids, 1);
END;
$$;

-- 2. je_posting_audit.assertions_addressed
ALTER TABLE je_posting_audit
  ADD COLUMN IF NOT EXISTS assertions_addressed text[] NOT NULL DEFAULT '{}';

ALTER TABLE je_posting_audit
  ADD CONSTRAINT je_posting_audit_valid_assertions
  CHECK (validate_assertions_array(assertions_addressed));

CREATE INDEX IF NOT EXISTS je_posting_audit_assertions_gin
  ON je_posting_audit USING gin (assertions_addressed);

COMMENT ON COLUMN je_posting_audit.assertions_addressed IS
  'ISA 315 assertion IDs the posted JE addresses at post time. Sourced from the '
  'originating pre_close_review_items.assertion_tags (rule-driven) or resolved '
  'via curated_rule_fires + rule_assertion_coverage. Historical rows before '
  '2026-07-07 are empty by design — retro-tagging would fabricate evidence.';

-- 3. pre_close_review_items.assertion_tags (column exists from D6.4c-1; add validation + index).
--    The column was defined as text[] with default '{}' but no CHECK constraint. Add both.
ALTER TABLE pre_close_review_items
  ALTER COLUMN assertion_tags SET DEFAULT '{}',
  ALTER COLUMN assertion_tags SET NOT NULL;

ALTER TABLE pre_close_review_items
  ADD CONSTRAINT pre_close_review_items_valid_assertions
  CHECK (validate_assertions_array(assertion_tags));

CREATE INDEX IF NOT EXISTS pre_close_review_items_assertion_tags_gin
  ON pre_close_review_items USING gin (assertion_tags);

COMMENT ON COLUMN pre_close_review_items.assertion_tags IS
  'ISA 315 assertion IDs derived from rule_assertion_coverage at compose time. '
  'Propagated onto je_posting_audit.assertions_addressed when the review item is approved-and-posted.';

-- 4. Data-source reliability basis on je_posting_audit (AS 1105 .10A 2025 amendment).
--    Every propagated assertion must record how the underlying data's reliability was established.
ALTER TABLE je_posting_audit
  ADD COLUMN IF NOT EXISTS data_source_reliability_basis text;

COMMENT ON COLUMN je_posting_audit.data_source_reliability_basis IS
  'PCAOB AS 1105 ¶.10A (2025) reliability basis for the electronic evidence '
  'underlying this JE. Values: qbo_api_authenticated | bank_feed_ocr | plaid_direct | '
  'manual_document_upload | inbound_email_parsed | rule_synthesized_from_qbo_ledger. '
  'Required non-null when assertions_addressed is non-empty.';

-- 5. Enforce reliability-basis-required-when-tagged as a CHECK.
--    Non-band-aid rationale: if a JE claims to address an assertion, AS 1105 requires
--    the reliability basis be documented at the same moment. This is not optional metadata.
ALTER TABLE je_posting_audit
  ADD CONSTRAINT je_posting_audit_reliability_required_when_tagged
  CHECK (
    array_length(assertions_addressed, 1) IS NULL
    OR data_source_reliability_basis IS NOT NULL
  );

COMMIT;
-- <<< end 20260707150000_d_assertions_part_4_je_propagation.sql

-- >>> begin 20260707160000_d_assertions_part_5_gap_review_items.sql
-- D-Assertions Part 5 — Gap → Review Item pipeline
--
-- Non-band-aid guarantees:
-- 1. New close_gap_review_items table (does NOT reuse pre_close_review_items — different semantics).
-- 2. Unique (firm_client_id, close_period_id, account_category, assertion_id) prevents duplicate open gaps.
-- 3. FK to close_periods; RLS mirrors close_assertion_coverage (Part 2/3 pattern) exactly.
-- 4. resolution_status CHECK constrains to a controlled vocabulary; open→resolved is one-way, but
--    an auto_close from re-detection sets status back to 'open' with resolution_status_prior recorded.
-- 5. Idempotent UPSERT-friendly design: worker calls .upsert with onConflict on the natural key.
BEGIN;
CREATE TABLE IF NOT EXISTS close_gap_review_items (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id            uuid NOT NULL REFERENCES firm_clients(id) ON DELETE CASCADE,
  engagement_id             uuid NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  close_period_id           uuid NOT NULL REFERENCES close_periods(id) ON DELETE CASCADE,
  account_category          text NOT NULL,
  assertion_id              text NOT NULL REFERENCES assertions_catalog(assertion_id),
  gap_root_cause_code       text NOT NULL,
  gap_recommendation        text,
  relevance_at_detection    text NOT NULL CHECK (relevance_at_detection IN ('relevant','usually_not_primary')),
  severity                  text NOT NULL DEFAULT 'warning'
                            CHECK (severity IN ('critical','warning','info')),
  -- Open/resolved lifecycle
  resolution_status         text NOT NULL DEFAULT 'open'
                            CHECK (resolution_status IN ('open','resolved_remediated','resolved_deferred','resolved_not_applicable','resolved_stale')),
  resolution_type           text CHECK (resolution_type IN ('manual_test','rule_activation','not_applicable_override','deferred_to_next_period')),
  resolution_metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_by_user_id       uuid,
  resolved_at               timestamptz,
  -- Auto-close audit trail: if worker re-detects an already-resolved gap, we keep the prior status
  resolution_status_prior   text,
  reopened_at               timestamptz,
  -- Bookkeeping
  first_detected_at         timestamptz NOT NULL DEFAULT now(),
  last_projected_at         timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  -- Natural key
  CONSTRAINT close_gap_review_items_natural_key
    UNIQUE (firm_client_id, close_period_id, account_category, assertion_id)
);
CREATE INDEX IF NOT EXISTS close_gap_review_items_engagement_idx
  ON close_gap_review_items (engagement_id, resolution_status, created_at DESC);
CREATE INDEX IF NOT EXISTS close_gap_review_items_open_by_period_idx
  ON close_gap_review_items (close_period_id, resolution_status)
  WHERE resolution_status = 'open';
CREATE INDEX IF NOT EXISTS close_gap_review_items_severity_idx
  ON close_gap_review_items (severity, resolution_status);
COMMENT ON TABLE close_gap_review_items IS
  'D-Assertions Part 5. One row per (firm_client_id, close_period_id, account_category, assertion_id) '
  'representing an assertion-coverage gap that needs reviewer remediation. Parallel to '
  'pre_close_review_items (rule-driven) — gaps have no fire_id/rule_id/je_draft and must not share that table.';
-- Enforce that resolution fields are set together
ALTER TABLE close_gap_review_items
  ADD CONSTRAINT close_gap_review_items_resolution_coherent
  CHECK (
    (resolution_status = 'open' AND resolution_type IS NULL AND resolved_at IS NULL)
    OR
    (resolution_status <> 'open' AND resolution_type IS NOT NULL AND resolved_at IS NOT NULL)
  );
-- RLS: mirror close_assertion_coverage (Part 2). Read: firm reader on engagement.
-- Write: service role only (worker + resolve API use service client).
ALTER TABLE close_gap_review_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY close_gap_review_items_firm_read
  ON close_gap_review_items FOR SELECT
  USING (
    engagement_id IN (
      SELECT e.id FROM engagements e
      JOIN firm_memberships fm ON fm.firm_id = e.firm_id
      WHERE fm.user_id = auth.uid()
    )
  );
CREATE POLICY close_gap_review_items_service_all
  ON close_gap_review_items FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
-- Trigger: bump updated_at on UPDATE
CREATE OR REPLACE FUNCTION close_gap_review_items_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER close_gap_review_items_touch_updated_at
  BEFORE UPDATE ON close_gap_review_items
  FOR EACH ROW EXECUTE FUNCTION close_gap_review_items_touch_updated_at();
COMMIT;
-- <<< end 20260707160000_d_assertions_part_5_gap_review_items.sql

-- >>> begin 20260707170000_d_assertions_part_6_manual_test_evidence.sql
-- ============================================================================
-- D-Assertions Part 6 — Manual test evidence + attachments + strength refinement
-- Base: a0cf507 (Part 5). Target ladder: 1554 → ~1590.
-- ============================================================================
BEGIN;
ALTER TABLE public.close_assertion_coverage
  ADD COLUMN IF NOT EXISTS covering_manual_test_ids uuid[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS close_assertion_coverage_manual_tests_gin
  ON public.close_assertion_coverage USING gin (covering_manual_test_ids);
CREATE TABLE IF NOT EXISTS public.manual_test_evidence (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id           uuid NOT NULL REFERENCES public.firm_clients(id),
  engagement_id            uuid NOT NULL REFERENCES public.engagements(id),
  close_period_id          uuid NOT NULL REFERENCES public.close_periods(id),
  account_category         text NOT NULL,
  assertion_id             text NOT NULL,
  evidence_type            text NOT NULL,
  source_type              text NOT NULL,
  source_key               jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_amount            numeric NULL,
  source_date              date NULL,
  evidence_summary         text NOT NULL,
  calculation_notes        text NULL,
  resolves_gap_item_id     uuid NULL REFERENCES public.close_gap_review_items(id),
  data_source_reliability_basis text NULL,
  content_hash             text NOT NULL,
  created_by_user_id       uuid NOT NULL,
  created_by_display_name  text NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manual_test_evidence_evidence_type_check CHECK (evidence_type = ANY (ARRAY[
    'qbo_bill','qbo_invoice','qbo_payment','qbo_transaction','qbo_journal_entry',
    'plaid_transaction','bank_statement','credit_card_statement',
    'vendor_invoice_ocr','customer_invoice_ocr',
    'contract_document','signed_agreement',
    'system_calculation','memory_pattern','manual_override','other',
    'manual_procedure','external_confirmation','analytical_review','reperformance'
  ])),
  CONSTRAINT manual_test_evidence_natural_key UNIQUE
    (firm_client_id, close_period_id, account_category, assertion_id, content_hash)
);
CREATE INDEX IF NOT EXISTS manual_test_evidence_period_idx
  ON public.manual_test_evidence (close_period_id, account_category, assertion_id);
CREATE INDEX IF NOT EXISTS manual_test_evidence_engagement_idx
  ON public.manual_test_evidence (engagement_id, created_at DESC);
CREATE INDEX IF NOT EXISTS manual_test_evidence_gap_idx
  ON public.manual_test_evidence (resolves_gap_item_id)
  WHERE resolves_gap_item_id IS NOT NULL;
ALTER TABLE public.manual_test_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY manual_test_evidence_firm_read
  ON public.manual_test_evidence FOR SELECT
  USING (
    engagement_id IN (
      SELECT e.id
      FROM engagements e
      JOIN firm_memberships fm ON fm.firm_id = e.firm_id
      WHERE fm.user_id = auth.uid()
    )
  );
CREATE POLICY manual_test_evidence_service_all
  ON public.manual_test_evidence FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
CREATE TABLE IF NOT EXISTS public.manual_test_attachments (
  attachment_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id              uuid NOT NULL REFERENCES public.manual_test_evidence(id) ON DELETE CASCADE,
  firm_client_id           uuid NOT NULL,
  storage_bucket           text NOT NULL DEFAULT 'manual-test-evidence',
  storage_path             text NOT NULL,
  original_filename        text NOT NULL,
  mime_type                text NOT NULL,
  byte_size                bigint NOT NULL,
  sha256                   text NOT NULL,
  ingested_from            text NOT NULL,
  ingested_at              timestamptz NOT NULL DEFAULT now(),
  ingested_by              text NOT NULL DEFAULT 'system',
  CONSTRAINT manual_test_attachments_bucket_check CHECK (storage_bucket = 'manual-test-evidence'),
  CONSTRAINT manual_test_attachments_natural_key UNIQUE (evidence_id, sha256)
);
CREATE INDEX IF NOT EXISTS manual_test_attachments_evidence_idx
  ON public.manual_test_attachments (evidence_id);
ALTER TABLE public.manual_test_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY manual_test_attachments_firm_read
  ON public.manual_test_attachments FOR SELECT
  USING (
    evidence_id IN (
      SELECT mte.id
      FROM manual_test_evidence mte
      JOIN engagements e ON e.id = mte.engagement_id
      JOIN firm_memberships fm ON fm.firm_id = e.firm_id
      WHERE fm.user_id = auth.uid()
    )
  );
CREATE POLICY manual_test_attachments_service_all
  ON public.manual_test_attachments FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
INSERT INTO storage.buckets (id, name, public)
VALUES ('manual-test-evidence', 'manual-test-evidence', false)
ON CONFLICT (id) DO NOTHING;
COMMIT;
-- <<< end 20260707170000_d_assertions_part_6_manual_test_evidence.sql

-- >>> begin 20260715180000_mfa_enrollment.sql
-- Phase TCP1 W2.5 Block 10 — MFA enrollment tables (additive-only)

-- MFA recovery codes: 10 one-time codes per user, hashed with SHA-256
CREATE TABLE IF NOT EXISTS public.mfa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_user
  ON public.mfa_recovery_codes(user_id) WHERE used_at IS NULL;

ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_recovery_codes"
  ON public.mfa_recovery_codes FOR SELECT
  USING (user_id = auth.uid());

-- Users cannot INSERT/UPDATE/DELETE directly — server actions with service role only

-- MFA audit log
CREATE TABLE IF NOT EXISTS public.mfa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'enroll_started','enroll_completed','enroll_failed','verify_success',
    'verify_failed','disable','recovery_code_used','recovery_codes_regenerated',
    'admin_enforcement_prompted'
  )),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_user
  ON public.mfa_audit_log(user_id, created_at DESC);

ALTER TABLE public.mfa_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_mfa_audit"
  ON public.mfa_audit_log FOR SELECT
  USING (user_id = auth.uid());

-- Immutability: audit log is append-only, never updated or deleted
CREATE OR REPLACE FUNCTION public.mfa_audit_log_prevent_mutation()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    RAISE EXCEPTION 'mfa_audit_log is append-only';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mfa_audit_log_immutable ON public.mfa_audit_log;
CREATE TRIGGER mfa_audit_log_immutable
  BEFORE UPDATE OR DELETE ON public.mfa_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.mfa_audit_log_prevent_mutation();
-- <<< end 20260715180000_mfa_enrollment.sql

-- >>> begin 20260715190000_mfa_webauthn_and_trusted_devices.sql
-- Gap 1b — WebAuthn credentials + trusted devices + audit event extension

-- ============================================================
-- 1. Extend mfa_audit_log event_type CHECK
-- ============================================================
ALTER TABLE public.mfa_audit_log
  DROP CONSTRAINT IF EXISTS mfa_audit_log_event_type_check;

ALTER TABLE public.mfa_audit_log
  ADD CONSTRAINT mfa_audit_log_event_type_check CHECK (event_type IN (
    'enroll_started','enroll_completed','enroll_failed','verify_success',
    'verify_failed','disable','recovery_code_used','recovery_codes_regenerated',
    'admin_enforcement_prompted',
    'trusted_device_added','trusted_device_revoked','trusted_device_expired',
    'webauthn_register_started','webauthn_register_completed','webauthn_register_failed',
    'webauthn_verify_success','webauthn_verify_failed','webauthn_credential_removed',
    'webauthn_credential_renamed'
  ));

-- ============================================================
-- 2. user_webauthn_credentials
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id BYTEA NOT NULL UNIQUE,
  public_key BYTEA NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  friendly_name TEXT NOT NULL DEFAULT 'Security key',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_user_webauthn_credentials_user
  ON public.user_webauthn_credentials(user_id);

CREATE INDEX IF NOT EXISTS idx_user_webauthn_credentials_credential_id
  ON public.user_webauthn_credentials(credential_id);

ALTER TABLE public.user_webauthn_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_webauthn" ON public.user_webauthn_credentials;
CREATE POLICY "users_select_own_webauthn"
  ON public.user_webauthn_credentials FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_webauthn_friendly_name" ON public.user_webauthn_credentials;
CREATE POLICY "users_update_own_webauthn_friendly_name"
  ON public.user_webauthn_credentials FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Immutability trigger: block updates to credential_id, public_key, user_id
CREATE OR REPLACE FUNCTION public.user_webauthn_credentials_prevent_column_mutation()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.credential_id IS DISTINCT FROM OLD.credential_id THEN
    RAISE EXCEPTION 'credential_id is immutable';
  END IF;
  IF NEW.public_key IS DISTINCT FROM OLD.public_key THEN
    RAISE EXCEPTION 'public_key is immutable';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_webauthn_credentials_immutable_cols ON public.user_webauthn_credentials;
CREATE TRIGGER user_webauthn_credentials_immutable_cols
  BEFORE UPDATE ON public.user_webauthn_credentials
  FOR EACH ROW EXECUTE FUNCTION public.user_webauthn_credentials_prevent_column_mutation();

-- ============================================================
-- 3. mfa_webauthn_challenges (transient, 60s TTL)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mfa_webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('register','authenticate')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '60 seconds')
);

CREATE INDEX IF NOT EXISTS idx_mfa_webauthn_challenges_user_purpose
  ON public.mfa_webauthn_challenges(user_id, purpose, expires_at DESC);

ALTER TABLE public.mfa_webauthn_challenges ENABLE ROW LEVEL SECURITY;
-- Service-role only; no policies for authenticated users (challenges are server-managed)

-- ============================================================
-- 4. mfa_trusted_devices
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mfa_trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id_hash TEXT NOT NULL,
  user_agent TEXT NULL,
  ip_first_seen INET NULL,
  ip_last_seen INET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  revoked_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_user_active
  ON public.mfa_trusted_devices(user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_hash
  ON public.mfa_trusted_devices(device_id_hash)
  WHERE revoked_at IS NULL;

ALTER TABLE public.mfa_trusted_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_trusted_devices" ON public.mfa_trusted_devices;
CREATE POLICY "users_select_own_trusted_devices"
  ON public.mfa_trusted_devices FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_revoke_own_trusted_devices" ON public.mfa_trusted_devices;
CREATE POLICY "users_revoke_own_trusted_devices"
  ON public.mfa_trusted_devices FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND revoked_at IS NOT NULL);
-- <<< end 20260715190000_mfa_webauthn_and_trusted_devices.sql

-- >>> begin 20260716010000_add_qbo_cdc_tables.sql
-- Issue #4 — QBO CDC hourly reconciliation cron
-- Two new tables, both additive.

-- ============================================================================
-- qbo_cdc_cursors — one row per (realm_id, entity_name)
-- Tracks the last observed `MetaData.LastUpdatedTime` from CDC, so the next
-- hourly run can use `changedSince = this_value` to only pull deltas.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.qbo_cdc_cursors (
    id               bigserial PRIMARY KEY,
    realm_id         text NOT NULL,
    entity_name      text NOT NULL,
    last_changed_at  timestamp with time zone NOT NULL,
    updated_at       timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (realm_id, entity_name)
);

CREATE INDEX IF NOT EXISTS idx_qbo_cdc_cursors_realm
    ON public.qbo_cdc_cursors (realm_id);

COMMENT ON TABLE public.qbo_cdc_cursors IS
    'CDC watermark per (realm, entity). Advanced by the hourly CDC cron.';

-- ============================================================================
-- qbo_cdc_runs — audit trail
-- One row per (cron_execution, realm_id). Intuit App Store reviewer evidence.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.qbo_cdc_runs (
    id                  bigserial PRIMARY KEY,
    run_id              uuid NOT NULL,
    realm_id            text NOT NULL,
    started_at          timestamp with time zone NOT NULL DEFAULT now(),
    finished_at         timestamp with time zone,
    entities_queried    integer NOT NULL DEFAULT 0,
    entities_changed    integer NOT NULL DEFAULT 0,
    events_rescued      integer NOT NULL DEFAULT 0,  -- no matching webhook row
    events_confirmed    integer NOT NULL DEFAULT 0,  -- matching webhook row within ±60s
    events_inserted     integer NOT NULL DEFAULT 0,  -- rows we upserted (rescued + already-covered de-duped)
    status              text NOT NULL DEFAULT 'running',
    error_message       text,
    sample_intuit_tid   text,
    elapsed_ms          integer
);

CREATE INDEX IF NOT EXISTS idx_qbo_cdc_runs_run_id
    ON public.qbo_cdc_runs (run_id);
CREATE INDEX IF NOT EXISTS idx_qbo_cdc_runs_started_at
    ON public.qbo_cdc_runs (started_at DESC);

COMMENT ON TABLE public.qbo_cdc_runs IS
    'Audit log for QBO CDC hourly cron runs. Provides Intuit App Store reviewers with evidence of webhook fallback reconciliation.';

-- RLS: service_role only (cron + server). No anon/authenticated policies.
ALTER TABLE public.qbo_cdc_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qbo_cdc_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qbo_cdc_cursors_service_role_all ON public.qbo_cdc_cursors;
CREATE POLICY qbo_cdc_cursors_service_role_all
  ON public.qbo_cdc_cursors
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS qbo_cdc_runs_service_role_all ON public.qbo_cdc_runs;
CREATE POLICY qbo_cdc_runs_service_role_all
  ON public.qbo_cdc_runs
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.qbo_cdc_cursors FROM anon, authenticated;
REVOKE ALL ON public.qbo_cdc_runs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.qbo_cdc_cursors TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.qbo_cdc_runs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.qbo_cdc_cursors_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.qbo_cdc_runs_id_seq TO service_role;
-- <<< end 20260716010000_add_qbo_cdc_tables.sql

-- >>> begin 20260716_00_d6_5_part1_1_firm_clients_slug.sql
-- D6.5 Part 1.1: Add firm_clients.slug with validator + per-firm uniqueness.
-- Backfills from firm_clients.name using the same slugify recipe as
-- scripts/provision-intake-addresses.ts and lib/intake/address.ts.

BEGIN;

-- §1. Add column (nullable while we backfill).
ALTER TABLE public.firm_clients
  ADD COLUMN IF NOT EXISTS slug text;

-- §2. Deterministic slugify helper — mirrors the TS slugFromClientName recipe.
--     lowercase → replace non-[a-z0-9] with '-' → strip leading/trailing '-'
--     → slice(0, 32). Result is intentionally NULL if the derived string
--     is empty; the backfill loop below handles that with a co-{companyId}
--     fallback exactly like the TS code.
CREATE OR REPLACE FUNCTION public._d651_slugify_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    substring(
      regexp_replace(
        regexp_replace(
          lower(coalesce(p_name, '')),
          '[^a-z0-9]+', '-', 'g'
        ),
        '^-+|-+$', '', 'g'
      ),
      1, 32
    ),
    ''
  );
$$;

-- §3. Backfill in a single DO block so we can handle collisions deterministically.
--     Ordering: (firm_id, created_at, id) — the oldest row in a firm wins the
--     base slug; later collisions get -2, -3, ... suffixes. This is stable
--     across re-runs (idempotent) because we only touch rows where slug IS NULL.
DO $backfill$
DECLARE
  r RECORD;
  base_slug text;
  candidate text;
  suffix int;
  fallback text;
BEGIN
  FOR r IN
    SELECT id, firm_id, company_id, name
      FROM public.firm_clients
     WHERE slug IS NULL
     ORDER BY firm_id, created_at, id
  LOOP
    base_slug := public._d651_slugify_name(r.name);

    -- If name doesn't yield a valid base, use the same co-{companyId} fallback
    -- as scripts/provision-intake-addresses.ts.
    IF base_slug IS NULL OR length(base_slug) < 3 THEN
      fallback := 'co-' || substring(replace(r.company_id::text, '-', ''), 1, 8);
      base_slug := fallback;
    END IF;

    -- Enforce validator length bounds. isValidFirmSlug requires 3-32 chars
    -- with alphanumeric anchors. If base is <3 chars after fallback, skip.
    IF length(base_slug) < 3 THEN
      RAISE WARNING 'skip firm_client %: cannot derive valid slug (name=%, company_id=%)',
        r.id, r.name, r.company_id;
      CONTINUE;
    END IF;

    -- Ensure alphanumeric anchors — validator regex requires first & last char
    -- to be [a-z0-9]. Our slugify already strips leading/trailing dashes,
    -- and 'co-' fallback starts with 'c' + ends with [a-z0-9], so both paths
    -- are already anchor-safe. Defensive check:
    IF base_slug !~ '^[a-z0-9]' OR base_slug !~ '[a-z0-9]$' THEN
      RAISE WARNING 'skip firm_client %: derived slug fails anchor check (slug=%)',
        r.id, base_slug;
      CONTINUE;
    END IF;

    -- Collision resolution: try base, then base-2, base-3, ... until unique
    -- within firm_id. Cap the base at 30 chars if we need a -N suffix, so the
    -- final slug still fits in 32 chars for suffixes up to -99.
    candidate := base_slug;
    suffix := 2;
    WHILE EXISTS (
      SELECT 1 FROM public.firm_clients
       WHERE firm_id = r.firm_id
         AND slug = candidate
         AND id <> r.id
    ) LOOP
      candidate := substring(base_slug, 1, 30) || '-' || suffix::text;
      suffix := suffix + 1;
      IF suffix > 100 THEN
        RAISE EXCEPTION 'collision suffix overflow for firm % base %', r.firm_id, base_slug;
      END IF;
    END LOOP;

    UPDATE public.firm_clients SET slug = candidate WHERE id = r.id;
  END LOOP;
END
$backfill$;

-- §4. Validator CHECK constraint — matches lib/intake/address.ts isValidFirmSlug.
--     Applied only to non-null values so new rows can be inserted without a
--     slug and get one via an application-layer default, but any non-null
--     value must be valid.
ALTER TABLE public.firm_clients
  ADD CONSTRAINT firm_clients_slug_valid_ck
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$');

-- §5. Uniqueness — one slug per firm. Partial index so NULLs don't conflict
--     (Postgres treats NULLs as distinct by default, but partial makes intent
--     explicit and slightly faster).
CREATE UNIQUE INDEX IF NOT EXISTS firm_clients_firm_id_slug_uidx
  ON public.firm_clients (firm_id, slug)
  WHERE slug IS NOT NULL;

-- §6. Clean up the helper — it was single-use and shouldn't linger in the
--     schema. New rows should get slugs from the application layer, not this
--     helper (which won't be re-executed).
DROP FUNCTION public._d651_slugify_name(text);

COMMIT;
-- <<< end 20260716_00_d6_5_part1_1_firm_clients_slug.sql

-- >>> begin 20260717010000_d65_p2_block1_visual_fingerprint.sql
-- Phase D6.5 Part 2 — Block 1: Visual Invoice Fingerprint Pipeline
-- Additive only. IF NOT EXISTS everywhere. No ALTER on existing columns.

-- ─── ap_intake_bills (text extraction landing zone) ───────────────────────
CREATE TABLE IF NOT EXISTS public.ap_intake_bills (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id             UUID NOT NULL,
  company_id          UUID NOT NULL,
  firm_client_id      UUID,
  intake_message_id   UUID REFERENCES public.intake_messages(id),
  resolved_vendor_id  UUID,
  mime_type           TEXT,
  raw_text            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ap_intake_bills_firm_company
  ON public.ap_intake_bills (firm_id, company_id);

ALTER TABLE public.ap_intake_bills ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ap_intake_bills' AND policyname = 'ap_intake_bills_service_role'
  ) THEN
    CREATE POLICY ap_intake_bills_service_role ON public.ap_intake_bills
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ap_intake_bills' AND policyname = 'ap_intake_bills_tenant_select'
  ) THEN
    CREATE POLICY ap_intake_bills_tenant_select ON public.ap_intake_bills
      FOR SELECT TO authenticated
      USING (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── Table: vendor_invoice_fingerprints ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_invoice_fingerprints (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id            UUID NOT NULL,
  vendor_id          UUID NOT NULL,
  version            INTEGER NOT NULL,
  bill_id            UUID REFERENCES public.ap_intake_bills(id),
  provenance         TEXT NOT NULL DEFAULT 'live_intake'
                     CHECK (provenance IN ('live_intake', 'onboarding_harvest')),
  layout_bboxes      JSONB NOT NULL,
  font_families      JSONB NOT NULL,
  color_palette      JSONB NOT NULL,
  phash              BYTEA NOT NULL,
  dhash              BYTEA NOT NULL,
  extractor_version  TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vif_unique_firm_vendor_version UNIQUE (firm_id, vendor_id, version)
);

CREATE INDEX IF NOT EXISTS ix_vif_firm_vendor
  ON public.vendor_invoice_fingerprints (firm_id, vendor_id);

CREATE INDEX IF NOT EXISTS ix_vif_bill
  ON public.vendor_invoice_fingerprints (bill_id)
  WHERE bill_id IS NOT NULL;

ALTER TABLE public.vendor_invoice_fingerprints ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_invoice_fingerprints' AND policyname = 'vif_service_role'
  ) THEN
    CREATE POLICY vif_service_role ON public.vendor_invoice_fingerprints
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_invoice_fingerprints' AND policyname = 'vif_tenant_select'
  ) THEN
    CREATE POLICY vif_tenant_select ON public.vendor_invoice_fingerprints
      FOR SELECT TO authenticated
      USING (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_invoice_fingerprints' AND policyname = 'vif_tenant_write'
  ) THEN
    CREATE POLICY vif_tenant_write ON public.vendor_invoice_fingerprints
      FOR ALL TO authenticated
      USING (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── Entitlement flag: ap_intake ─────────────────────────────────────────
-- Canonical registry: lib/entitlements/registry.ts ADDON_REGISTRY + engagement_addons.addon_code CHECK.
-- ap_intake already present — no duplicate insert required.

-- ─── L4 assertion registry (ISA assertions_catalog is a fixed 8-enum) ────
CREATE TABLE IF NOT EXISTS public.ap_intake_assertion_registry (
  assertion_id      TEXT PRIMARY KEY,
  layer             TEXT NOT NULL,
  severity_default  TEXT NOT NULL,
  evaluator_module  TEXT NOT NULL,
  description       TEXT NOT NULL
);

INSERT INTO public.ap_intake_assertion_registry (
  assertion_id, layer, severity_default, evaluator_module, description
) VALUES (
  'fingerprint_drift_within_threshold',
  'L4',
  'HIGH',
  'ap-intake/assertions/fingerprint-drift-within-threshold',
  'Bill fingerprint drift from prior version must stay within configured '
  || 'thresholds (layout 15%, symmetric font-set diff, Delta-E 20 color, '
  || '8-bit pHash Hamming) or route to reviewer.'
) ON CONFLICT (assertion_id) DO NOTHING;

-- ─── AP ledger event type registry ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ap_intake_ledger_event_types (
  event_type         TEXT PRIMARY KEY,
  actor_type         TEXT NOT NULL,
  is_merkle_chained  BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained)
VALUES ('fingerprint.new_version_created', 'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

-- ─── ai_action_log category: visual_fingerprint ──────────────────────────
ALTER TABLE public.ai_action_log
  DROP CONSTRAINT IF EXISTS ai_action_log_action_category_check;

ALTER TABLE public.ai_action_log
  ADD CONSTRAINT ai_action_log_action_category_check CHECK (
    action_category IN (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change',
      'assertion_coverage_scan','assertion_gap_reasoning',
      'visual_fingerprint'
    )
  );
-- <<< end 20260717010000_d65_p2_block1_visual_fingerprint.sql

-- >>> begin 20260707214500_d65_p2_block7a2_prepilot_security.sql
-- Phase D6.5 Part 2 — Block 7a.2 — Pre-Pilot Security Hardening
--
-- Resolves 8 pre-existing ERROR advisors before NY contractor pilot go-live:
--   Group A: RLS disabled on 3 public tables
--   Group B: SECURITY DEFINER on 2 views
--   Group C: user-editable JWT metadata half in 3 super-admin policies (privilege escalation)
--
-- Additive-only. No data touched. No existing tables altered.
-- Super-admin convention: app_metadata.role = 'super_admin' (app_metadata is not user-editable).
BEGIN;

-- =============================================================================
-- GROUP A — Enable RLS on 3 tables
-- =============================================================================

-- A1. engagement_posting_policy — firm-scoped read for firm members, service role manages
ALTER TABLE public.engagement_posting_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "engagement_posting_policy_service_role_all"
  ON public.engagement_posting_policy
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "engagement_posting_policy_firm_members_select"
  ON public.engagement_posting_policy
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.engagements e
      JOIN public.firm_memberships fm
        ON fm.firm_id = e.firm_id
      WHERE e.id = engagement_posting_policy.engagement_id
        AND fm.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.engagement_posting_policy IS
  'Per-engagement posting policy. RLS: service_role full access; authenticated firm members read via engagements.firm_id → firm_memberships.';

-- A2. ap_intake_ledger_event_types — global reference catalog, permissive read
ALTER TABLE public.ap_intake_ledger_event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ap_intake_ledger_event_types_service_role_all"
  ON public.ap_intake_ledger_event_types
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "ap_intake_ledger_event_types_authenticated_select"
  ON public.ap_intake_ledger_event_types
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.ap_intake_ledger_event_types IS
  'Global reference catalog of AP intake ledger event types. Tenant-agnostic. RLS: service_role writes; all authenticated users read.';

-- A3. ap_intake_assertion_registry — global reference catalog, permissive read
ALTER TABLE public.ap_intake_assertion_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ap_intake_assertion_registry_service_role_all"
  ON public.ap_intake_assertion_registry
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "ap_intake_assertion_registry_authenticated_select"
  ON public.ap_intake_assertion_registry
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.ap_intake_assertion_registry IS
  'Global reference catalog of AP intake assertion definitions (runtime mirror). Tenant-agnostic. RLS: service_role writes; all authenticated users read.';

-- =============================================================================
-- GROUP B — Convert SECURITY DEFINER views to security_invoker
-- =============================================================================

ALTER VIEW public.company_billing_compat SET (security_invoker = true);
ALTER VIEW public.qbo_connections_unified SET (security_invoker = true);

-- =============================================================================
-- GROUP C — Remove user-editable JWT metadata privilege-escalation half from super-admin policies
--
-- Codebase super-admin convention (app/signin/page.tsx:33):
--   data.user?.app_metadata?.role === "super_admin"
--
-- The OR user-editable JWT metadata half is user-editable via Supabase auth → privilege escalation.
-- We drop and recreate with app_metadata-only.
-- =============================================================================

-- C1. support_tickets
DROP POLICY IF EXISTS "Super admins can manage support tickets" ON public.support_tickets;
CREATE POLICY "Super admins can manage support tickets"
  ON public.support_tickets
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  );

-- C2. free_review_leads
DROP POLICY IF EXISTS "Super admins can manage free review leads" ON public.free_review_leads;
CREATE POLICY "Super admins can manage free review leads"
  ON public.free_review_leads
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  );

-- C3. mfg_waitlist
DROP POLICY IF EXISTS "Super admins can manage mfg waitlist" ON public.mfg_waitlist;
CREATE POLICY "Super admins can manage mfg waitlist"
  ON public.mfg_waitlist
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'super_admin'
  );

COMMIT;
-- <<< end 20260707214500_d65_p2_block7a2_prepilot_security.sql

-- >>> begin 20260717020000_d65_p2_block2_vendor_mirror.sql
-- ============================================================================
-- D6.5 Part 2 — Block 2: L1 Vendor Existence + Fuzzy Match + vendor_master_mirror
-- Additive-only. Idempotent. Companion to Block 1 (20260717010000).
-- ============================================================================

-- ─── vendor_master_mirror ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_master_mirror (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                 UUID NOT NULL,
  firm_client_id          UUID NOT NULL,
  erp_platform            TEXT NOT NULL,
  external_vendor_id      TEXT NOT NULL,
  display_name            TEXT NOT NULL,
  normalized_name         TEXT NOT NULL,
  metaphone_code          TEXT NOT NULL,
  active                  BOOLEAN NOT NULL DEFAULT TRUE,
  sync_token              TEXT,
  primary_email           TEXT,
  primary_phone           TEXT,
  first_synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_snapshot_hash      TEXT NOT NULL,
  UNIQUE (firm_client_id, erp_platform, external_vendor_id)
);

CREATE INDEX IF NOT EXISTS ix_vendor_master_mirror_firm_client_active
  ON public.vendor_master_mirror (firm_client_id, active);

CREATE INDEX IF NOT EXISTS ix_vendor_master_mirror_normalized
  ON public.vendor_master_mirror (firm_client_id, normalized_name);

CREATE INDEX IF NOT EXISTS ix_vendor_master_mirror_metaphone
  ON public.vendor_master_mirror (firm_client_id, metaphone_code);

ALTER TABLE public.vendor_master_mirror ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_master_mirror' AND policyname = 'vendor_master_mirror_service_role'
  ) THEN
    CREATE POLICY vendor_master_mirror_service_role ON public.vendor_master_mirror
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_master_mirror' AND policyname = 'vendor_master_mirror_tenant_select'
  ) THEN
    CREATE POLICY vendor_master_mirror_tenant_select ON public.vendor_master_mirror
      FOR SELECT TO authenticated
      USING (
        firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- ─── ap_intake_bills column adds ─────────────────────────────────────────
ALTER TABLE public.ap_intake_bills
  ADD COLUMN IF NOT EXISTS vendor_resolution_method      TEXT
    CHECK (vendor_resolution_method IN ('exact','fuzzy_candidate','no_match')),
  ADD COLUMN IF NOT EXISTS vendor_resolution_confidence  NUMERIC(4,3)
    CHECK (vendor_resolution_confidence IS NULL OR (vendor_resolution_confidence >= 0 AND vendor_resolution_confidence <= 1)),
  ADD COLUMN IF NOT EXISTS vendor_candidate_ids          UUID[] DEFAULT '{}'::UUID[];

-- ─── L1 assertion registry insert ────────────────────────────────────────
INSERT INTO public.ap_intake_assertion_registry (
  assertion_id, layer, severity_default, evaluator_module, description
) VALUES (
  'vendor_resolved_or_quarantined',
  'L1',
  'HIGH',
  'lib/ap-intake/assertions/vendor-resolved-or-quarantined',
  'Every bill row must either resolve to a mirror vendor or emit a quarantine routing signal.'
) ON CONFLICT (assertion_id) DO NOTHING;

-- ─── Ledger event type ───────────────────────────────────────────────────
INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('vendor.mirror_refreshed', 'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

-- ─── ai_action_log.action_category widening (canonical drop-and-re-add) ──
ALTER TABLE public.ai_action_log
  DROP CONSTRAINT IF EXISTS ai_action_log_action_category_check;

ALTER TABLE public.ai_action_log
  ADD CONSTRAINT ai_action_log_action_category_check CHECK (
    action_category IN (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change',
      'assertion_coverage_scan','assertion_gap_reasoning',
      'visual_fingerprint','vendor_resolution'
    )
  );
-- <<< end 20260717020000_d65_p2_block2_vendor_mirror.sql

-- >>> begin 20260717030000_d65_p2_block3_quarantine_l3.sql
-- Phase D6.5 Part 2 — Block 3 of 8
-- L3 Bank Change Detection + L2 Quarantine + 4 Gates + NY Bookkeeper Allowlist + Attestation Modal
-- Additive only. IF NOT EXISTS on every DDL. Safe to re-run.

BEGIN;

-- =========================================================================
-- 3.1 ap_intake_quarantine
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ap_intake_quarantine (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                     UUID NOT NULL,
  firm_client_id              UUID NOT NULL,
  bill_id                     UUID NOT NULL REFERENCES public.ap_intake_bills(id),
  intake_message_id           UUID NOT NULL,
  quarantine_reason           TEXT NOT NULL,
  originating_signals         JSONB NOT NULL,
  originating_severity        TEXT NOT NULL CHECK (originating_severity IN ('HIGH','MEDIUM','LOW')),
  status                      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','released','rejected','stale')),
  fraud_score_at_quarantine   NUMERIC(4,3) NOT NULL DEFAULT 0,
  opened_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at                 TIMESTAMPTZ,
  released_by_user_id         UUID,
  release_notes               TEXT,
  UNIQUE (bill_id)
);
CREATE INDEX IF NOT EXISTS ix_quarantine_firm_status ON public.ap_intake_quarantine (firm_id, status);
CREATE INDEX IF NOT EXISTS ix_quarantine_firm_client_status ON public.ap_intake_quarantine (firm_client_id, status);
CREATE INDEX IF NOT EXISTS ix_quarantine_bill ON public.ap_intake_quarantine (bill_id);

ALTER TABLE public.ap_intake_quarantine ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ap_intake_quarantine' AND policyname='ap_intake_quarantine_service_role') THEN
    CREATE POLICY ap_intake_quarantine_service_role ON public.ap_intake_quarantine
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ap_intake_quarantine' AND policyname='ap_intake_quarantine_tenant_select') THEN
    CREATE POLICY ap_intake_quarantine_tenant_select ON public.ap_intake_quarantine
      FOR SELECT TO authenticated
      USING (firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()));
  END IF;
END $$;

-- =========================================================================
-- 3.2 vendor_bank_history (service_role only — no tenant SELECT)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.vendor_bank_history (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                     UUID NOT NULL,
  firm_client_id              UUID NOT NULL,
  vendor_id                   UUID NOT NULL,
  routing_number_last4        TEXT NOT NULL,
  account_number_last4        TEXT NOT NULL,
  account_hash_sha256         TEXT NOT NULL,
  first_observed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_observed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observation_count           INT NOT NULL DEFAULT 1,
  last_seen_bill_id           UUID REFERENCES public.ap_intake_bills(id),
  actor_user_id               UUID,
  UNIQUE (firm_client_id, vendor_id, account_hash_sha256)
);
CREATE INDEX IF NOT EXISTS ix_vendor_bank_history_vendor
  ON public.vendor_bank_history (firm_client_id, vendor_id, last_observed_at DESC);

ALTER TABLE public.vendor_bank_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vendor_bank_history' AND policyname='vendor_bank_history_service_role') THEN
    CREATE POLICY vendor_bank_history_service_role ON public.vendor_bank_history
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =========================================================================
-- 3.3 bookkeeper_release_allowlist (private per-firm data)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.bookkeeper_release_allowlist (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id          UUID NOT NULL,
  user_id          UUID NOT NULL,
  scope            TEXT NOT NULL DEFAULT 'quarantine_release'
                     CHECK (scope IN ('quarantine_release')),
  granted_by       UUID,
  granted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at       TIMESTAMPTZ,
  note             TEXT,
  UNIQUE (firm_id, user_id, scope)
);
CREATE INDEX IF NOT EXISTS ix_bookkeeper_allowlist_firm_active
  ON public.bookkeeper_release_allowlist (firm_id) WHERE revoked_at IS NULL;

ALTER TABLE public.bookkeeper_release_allowlist ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookkeeper_release_allowlist' AND policyname='bookkeeper_release_allowlist_service_role') THEN
    CREATE POLICY bookkeeper_release_allowlist_service_role ON public.bookkeeper_release_allowlist
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookkeeper_release_allowlist' AND policyname='bookkeeper_release_allowlist_firm_admin_select') THEN
    CREATE POLICY bookkeeper_release_allowlist_firm_admin_select ON public.bookkeeper_release_allowlist
      FOR SELECT TO authenticated
      USING (firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- =========================================================================
-- 3.4 quarantine_release_attempts (audit trail — every attempt logged)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.quarantine_release_attempts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                  UUID NOT NULL,
  quarantine_id            UUID NOT NULL REFERENCES public.ap_intake_quarantine(id),
  bill_id                  UUID NOT NULL,
  actor_user_id            UUID NOT NULL,
  attempted_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attestation_text         TEXT NOT NULL,
  gate_results             JSONB NOT NULL,
  overall_pass             BOOLEAN NOT NULL,
  blocking_gates           TEXT[] NOT NULL DEFAULT '{}'::TEXT[]
);
CREATE INDEX IF NOT EXISTS ix_quarantine_release_attempts_quarantine
  ON public.quarantine_release_attempts (quarantine_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS ix_quarantine_release_attempts_actor
  ON public.quarantine_release_attempts (actor_user_id);

ALTER TABLE public.quarantine_release_attempts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quarantine_release_attempts' AND policyname='quarantine_release_attempts_service_role') THEN
    CREATE POLICY quarantine_release_attempts_service_role ON public.quarantine_release_attempts
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quarantine_release_attempts' AND policyname='quarantine_release_attempts_tenant_select') THEN
    CREATE POLICY quarantine_release_attempts_tenant_select ON public.quarantine_release_attempts
      FOR SELECT TO authenticated
      USING (firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()));
  END IF;
END $$;

-- =========================================================================
-- 3.5 ap_intake_bills column adds
-- =========================================================================
ALTER TABLE public.ap_intake_bills
  ADD COLUMN IF NOT EXISTS fraud_score_current       NUMERIC(4,3) NOT NULL DEFAULT 0
    CHECK (fraud_score_current >= 0 AND fraud_score_current <= 1),
  ADD COLUMN IF NOT EXISTS quarantine_id             UUID REFERENCES public.ap_intake_quarantine(id),
  ADD COLUMN IF NOT EXISTS bank_account_hash_current TEXT;

CREATE INDEX IF NOT EXISTS ix_ap_intake_bills_quarantine
  ON public.ap_intake_bills (quarantine_id) WHERE quarantine_id IS NOT NULL;

-- =========================================================================
-- 3.6 Assertion registry inserts (L3 + L2)
-- =========================================================================
INSERT INTO public.ap_intake_assertion_registry (assertion_id, layer, severity_default, evaluator_module, description) VALUES
  ('bank_info_matches_vendor_history', 'L3', 'HIGH',
    'lib/ap-intake/assertions/bank-info-matches-vendor-history',
    'Extracted vendor bank info must match a known-good entry in vendor_bank_history or trigger quarantine.'),
  ('quarantine_release_requires_all_gates', 'L2', 'HIGH',
    'lib/ap-intake/assertions/quarantine-release-requires-all-gates',
    'A quarantined bill can only be released when all 4 gates (qc-01..qc-04) pass and are persisted.')
ON CONFLICT (assertion_id) DO NOTHING;

-- =========================================================================
-- 3.7 Ledger event type inserts (6 new)
-- =========================================================================
INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('bill.quarantined',            'system', TRUE),
  ('bill.release_requested',      'user',   TRUE),
  ('bill.released',               'user',   TRUE),
  ('bill.release_blocked',        'system', TRUE),
  ('vendor.bank_info_observed',   'system', TRUE),
  ('vendor.bank_change_detected', 'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

-- =========================================================================
-- 3.8 ai_action_log.action_category widening
-- =========================================================================
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_action_log_action_category_check'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    ALTER TABLE public.ai_action_log DROP CONSTRAINT ai_action_log_action_category_check;
  END IF;

  ALTER TABLE public.ai_action_log
    ADD CONSTRAINT ai_action_log_action_category_check
    CHECK (action_category IN (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change',
      'assertion_coverage_scan','assertion_gap_reasoning',
      'visual_fingerprint','vendor_resolution',
      'bank_change_detection','quarantine_gate_evaluation'
    ));
END $$;

COMMIT;
-- <<< end 20260717030000_d65_p2_block3_quarantine_l3.sql

-- >>> begin 20260717040000_d65_p2_block4_duplicate_detection.sql
-- Phase D6.5 Part 2 — Block 4: L5 Multi-Strategy Duplicate Detection
-- Additive-only. Idempotent.

BEGIN;

ALTER TABLE public.ap_intake_bills
  ADD COLUMN IF NOT EXISTS invoice_number       TEXT,
  ADD COLUMN IF NOT EXISTS invoice_date         DATE,
  ADD COLUMN IF NOT EXISTS invoice_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS content_hash_sha256  TEXT;

CREATE INDEX IF NOT EXISTS ix_ap_intake_bills_content_hash
  ON public.ap_intake_bills (firm_client_id, resolved_vendor_id, content_hash_sha256)
  WHERE content_hash_sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ap_intake_bills_amount_date
  ON public.ap_intake_bills (firm_client_id, resolved_vendor_id, invoice_amount_cents, invoice_date)
  WHERE invoice_amount_cents IS NOT NULL AND invoice_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ap_intake_bills_invoice_number
  ON public.ap_intake_bills (firm_client_id, resolved_vendor_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ap_intake_bill_duplicates (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                  UUID NOT NULL,
  firm_client_id           UUID NOT NULL,
  bill_id                  UUID NOT NULL REFERENCES public.ap_intake_bills(id),
  matched_bill_id          UUID NOT NULL REFERENCES public.ap_intake_bills(id),
  strategy_id              TEXT NOT NULL CHECK (strategy_id IN (
    'S1_exact_content_hash',
    'S2_amount_vendor_date',
    'S3_invoice_number_vendor',
    'S4_fuzzy_amount_window'
  )),
  confidence               NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  severity                 TEXT NOT NULL CHECK (severity IN ('HIGH','MEDIUM')),
  evidence                 JSONB NOT NULL,
  detected_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quarantined              BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (bill_id, matched_bill_id, strategy_id)
);

CREATE INDEX IF NOT EXISTS ix_ap_intake_bill_duplicates_bill
  ON public.ap_intake_bill_duplicates (bill_id);

CREATE INDEX IF NOT EXISTS ix_ap_intake_bill_duplicates_firm_client_time
  ON public.ap_intake_bill_duplicates (firm_client_id, detected_at DESC);

ALTER TABLE public.ap_intake_bill_duplicates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ap_intake_bill_duplicates'
      AND policyname = 'ap_intake_bill_duplicates_service_role'
  ) THEN
    CREATE POLICY ap_intake_bill_duplicates_service_role
      ON public.ap_intake_bill_duplicates
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ap_intake_bill_duplicates'
      AND policyname = 'ap_intake_bill_duplicates_tenant_select'
  ) THEN
    CREATE POLICY ap_intake_bill_duplicates_tenant_select
      ON public.ap_intake_bill_duplicates
      FOR SELECT TO authenticated
      USING (firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()));
  END IF;
END $$;

COMMENT ON TABLE public.ap_intake_bill_duplicates IS
  'Phase D6.5 Part 2 Block 4: append-only ledger of L5 multi-strategy duplicate-bill detections.';

INSERT INTO public.ap_intake_assertion_registry (
  assertion_id, layer, severity_default, evaluator_module, description
) VALUES (
  'no_duplicate_bills_posted',
  'L5',
  'HIGH',
  'lib/ap-intake/assertions/no-duplicate-bills-posted',
  'No duplicate bill may proceed to posting without quarantine or explicit release.'
) ON CONFLICT (assertion_id) DO NOTHING;

INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('bill.duplicate_detected', 'system', TRUE),
  ('bill.duplicate_flagged',  'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_action_log_action_category_check'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    ALTER TABLE public.ai_action_log DROP CONSTRAINT ai_action_log_action_category_check;
  END IF;

  ALTER TABLE public.ai_action_log
    ADD CONSTRAINT ai_action_log_action_category_check
    CHECK (action_category IN (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change',
      'assertion_coverage_scan','assertion_gap_reasoning',
      'visual_fingerprint','vendor_resolution',
      'bank_change_detection','quarantine_gate_evaluation',
      'duplicate_detection'
    ));
END $$;

COMMIT;
-- <<< end 20260717040000_d65_p2_block4_duplicate_detection.sql

-- >>> begin 20260717050000_d65_p2_block5_anomaly_score_merkle.sql
-- Phase D6.5 Part 2 — Block 5
-- L6 statistical anomaly + L11 fraud score aggregation + Merkle-chained ledger
-- ADDITIVE ONLY.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.bill_history (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                  UUID NOT NULL,
  firm_client_id           UUID NOT NULL,
  vendor_id                UUID NOT NULL,
  bill_id                  UUID NOT NULL REFERENCES public.ap_intake_bills(id),
  invoice_amount_cents     BIGINT,
  invoice_date             DATE,
  invoice_number           TEXT,
  received_at              TIMESTAMPTZ NOT NULL,
  quarantined              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bill_id)
);

CREATE INDEX IF NOT EXISTS ix_bill_history_firm_client_vendor_received
  ON public.bill_history (firm_client_id, vendor_id, received_at DESC);

CREATE INDEX IF NOT EXISTS ix_bill_history_firm_client_amount
  ON public.bill_history (firm_client_id, vendor_id, invoice_amount_cents)
  WHERE invoice_amount_cents IS NOT NULL;

ALTER TABLE public.bill_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.fraud_score_signals (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                   UUID NOT NULL,
  firm_client_id            UUID NOT NULL,
  bill_id                   UUID NOT NULL REFERENCES public.ap_intake_bills(id),
  layer                     TEXT NOT NULL CHECK (layer IN ('L3','L4','L5','L6')),
  signal_code               TEXT NOT NULL,
  severity                  TEXT NOT NULL CHECK (severity IN ('HIGH','MEDIUM','LOW')),
  contribution              NUMERIC(4,3) NOT NULL CHECK (contribution >= 0 AND contribution <= 1),
  evidence                  JSONB NOT NULL,
  disposition               TEXT NOT NULL DEFAULT 'pending'
    CHECK (disposition IN ('pending','confirmed','dismissed','escalated')),
  disposition_note          TEXT,
  disposed_at               TIMESTAMPTZ,
  disposed_by_user_id       UUID,
  detected_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aggregated_score_snapshot NUMERIC(4,3) NOT NULL,
  UNIQUE (bill_id, layer, signal_code)
);

CREATE INDEX IF NOT EXISTS ix_fraud_score_signals_bill
  ON public.fraud_score_signals (bill_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS ix_fraud_score_signals_disposition
  ON public.fraud_score_signals (firm_client_id, disposition, detected_at DESC);

ALTER TABLE public.fraud_score_signals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ledger_events
  ADD COLUMN IF NOT EXISTS event_hash          TEXT,
  ADD COLUMN IF NOT EXISTS previous_event_hash TEXT,
  ADD COLUMN IF NOT EXISTS chain_index         BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_events_chain_index
  ON public.ledger_events (chain_index)
  WHERE chain_index IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ledger_events_event_hash
  ON public.ledger_events (event_hash)
  WHERE event_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ledger_chain_head (
  id                       INTEGER PRIMARY KEY CHECK (id = 1),
  current_chain_index      BIGINT NOT NULL DEFAULT -1,
  current_event_hash       TEXT,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.ledger_chain_head (id, current_chain_index, current_event_hash)
VALUES (1, -1, NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ledger_chain_head ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.publish_ledger_event(
  p_event_type              TEXT,
  p_event_category          TEXT,
  p_event_version           INTEGER,
  p_firm_id                 UUID,
  p_firm_client_id          UUID,
  p_engagement_id           UUID,
  p_portco_id               UUID,
  p_close_period_id         TEXT,
  p_aggregate_type          TEXT,
  p_aggregate_id            TEXT,
  p_actor_type              TEXT,
  p_actor_id                TEXT,
  p_event_payload           JSONB,
  p_event_metadata          JSONB,
  p_causation_event_id      UUID,
  p_event_payload_canonical TEXT
)
RETURNS TABLE(event_id UUID, event_hash TEXT, chain_index BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_head             public.ledger_chain_head%ROWTYPE;
  v_new_chain_index  BIGINT;
  v_new_event_id     UUID := gen_random_uuid();
  v_prev_hash        TEXT;
  v_hash_input       TEXT;
  v_new_hash         TEXT;
BEGIN
  SELECT * INTO v_head FROM public.ledger_chain_head WHERE id = 1 FOR UPDATE;
  v_new_chain_index := v_head.current_chain_index + 1;
  v_prev_hash := v_head.current_event_hash;

  v_hash_input := COALESCE(v_prev_hash, '') || v_new_event_id::TEXT || p_event_type || p_event_payload_canonical;
  v_new_hash := encode(digest(v_hash_input::bytea, 'sha256'), 'hex');

  INSERT INTO public.ledger_events (
    event_id, event_type, event_category, event_version,
    firm_id, firm_client_id, engagement_id, portco_id, close_period_id,
    aggregate_type, aggregate_id,
    actor_type, actor_id,
    event_payload, event_metadata, causation_event_id,
    event_hash, previous_event_hash, chain_index
  ) VALUES (
    v_new_event_id, p_event_type, p_event_category, p_event_version,
    p_firm_id, p_firm_client_id, p_engagement_id, p_portco_id, p_close_period_id,
    p_aggregate_type, p_aggregate_id,
    p_actor_type, p_actor_id,
    p_event_payload, p_event_metadata, p_causation_event_id,
    v_new_hash, v_prev_hash, v_new_chain_index
  );

  UPDATE public.ledger_chain_head
     SET current_chain_index = v_new_chain_index,
         current_event_hash  = v_new_hash,
         updated_at          = NOW()
   WHERE id = 1;

  event_id := v_new_event_id;
  event_hash := v_new_hash;
  chain_index := v_new_chain_index;
  RETURN NEXT;
END;
$fn$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bill_history' AND policyname = 'bill_history_service_role'
  ) THEN
    CREATE POLICY bill_history_service_role ON public.bill_history
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fraud_score_signals' AND policyname = 'fraud_score_signals_service_role'
  ) THEN
    CREATE POLICY fraud_score_signals_service_role ON public.fraud_score_signals
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ledger_chain_head' AND policyname = 'ledger_chain_head_service_role'
  ) THEN
    CREATE POLICY ledger_chain_head_service_role ON public.ledger_chain_head
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('bill.anomaly_detected', 'system', TRUE),
  ('bill.anomaly_flagged', 'system', TRUE),
  ('bill.fraud_score_updated', 'system', TRUE),
  ('bill.fraud_score_quarantine', 'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_action_log_action_category_check'
  ) INTO constraint_exists;
  IF constraint_exists THEN
    ALTER TABLE public.ai_action_log DROP CONSTRAINT ai_action_log_action_category_check;
  END IF;
  ALTER TABLE public.ai_action_log
    ADD CONSTRAINT ai_action_log_action_category_check
    CHECK (action_category IN (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change',
      'assertion_coverage_scan','assertion_gap_reasoning',
      'visual_fingerprint','vendor_resolution',
      'bank_change_detection','quarantine_gate_evaluation',
      'duplicate_detection',
      'statistical_anomaly_detection','fraud_score_aggregation'
    ));
END $$;

COMMIT;
-- <<< end 20260717050000_d65_p2_block5_anomaly_score_merkle.sql

-- >>> begin 20260717060000_d65_p2_block6a_requisitions_harvest_l3.sql
-- Phase D6.5 Part 2 — Block 6a
-- L0 Requisitions + L0.5 Baseline Harvest + L3 Three-Way-Match + Pilot Allowlist + Numbering RPC
-- Additive-only. Idempotent chunks. No user_id literals.
BEGIN;

-- =========================================================
-- Chunk 1: Widen engagement_addons.addon_code CHECK
-- (Also reconciles quarantine_review which exists in TS registry but not in DB CHECK)
-- =========================================================
ALTER TABLE public.engagement_addons DROP CONSTRAINT IF EXISTS engagement_addons_addon_code_check;
ALTER TABLE public.engagement_addons
  ADD CONSTRAINT engagement_addons_addon_code_check
  CHECK (addon_code IN (
    'ap_intake',
    'ap_pay',
    'ar_invoicing',
    'ar_cash_app',
    'ar_collections',
    'voice_collections',
    'quarantine_review',
    'ap_requisitions',
    'ap_baseline_harvest',
    'ap_three_way_match'
  ));

-- =========================================================
-- Chunk 2: pilot_feature_allowlist (PRIVATE per-firm feature gates)
-- Mirrors bookkeeper_release_allowlist shape.
-- =========================================================
CREATE TABLE IF NOT EXISTS public.pilot_feature_allowlist (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id       UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  feature_code  TEXT NOT NULL CHECK (feature_code IN (
    'ap_requisitions',
    'ap_baseline_harvest',
    'ap_three_way_match'
  )),
  granted_by    TEXT,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ,
  note          TEXT,
  UNIQUE (firm_id, feature_code)
);
CREATE INDEX IF NOT EXISTS idx_pilot_feature_allowlist_firm
  ON public.pilot_feature_allowlist (firm_id) WHERE revoked_at IS NULL;
ALTER TABLE public.pilot_feature_allowlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pilot_feature_allowlist_service_all ON public.pilot_feature_allowlist;
CREATE POLICY pilot_feature_allowlist_service_all
  ON public.pilot_feature_allowlist
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS pilot_feature_allowlist_firm_admin_select ON public.pilot_feature_allowlist;
CREATE POLICY pilot_feature_allowlist_firm_admin_select
  ON public.pilot_feature_allowlist
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = pilot_feature_allowlist.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 3: firm_memberships.can_approve column
-- =========================================================
ALTER TABLE public.firm_memberships
  ADD COLUMN IF NOT EXISTS can_approve BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_firm_memberships_can_approve
  ON public.firm_memberships (firm_id, user_id) WHERE can_approve = TRUE;

-- =========================================================
-- Chunk 4: Document numbering (PO-YYYY-NNNN, REQ-YYYY-NNNN, GR-YYYY-NNNN)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.company_document_numbering_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL,
  doc_type          TEXT NOT NULL CHECK (doc_type IN ('purchase_order','requisition','goods_receipt')),
  prefix            TEXT NOT NULL,
  next_seq          INTEGER NOT NULL DEFAULT 1 CHECK (next_seq > 0),
  seq_width         INTEGER NOT NULL DEFAULT 4 CHECK (seq_width BETWEEN 3 AND 8),
  reset_annually    BOOLEAN NOT NULL DEFAULT TRUE,
  current_year      INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, doc_type)
);
ALTER TABLE public.company_document_numbering_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cdnc_service_all ON public.company_document_numbering_config;
CREATE POLICY cdnc_service_all
  ON public.company_document_numbering_config
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.next_document_number(
  p_company_id UUID,
  p_doc_type   TEXT
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_row RECORD;
  v_now_year INTEGER := EXTRACT(YEAR FROM NOW())::INT;
  v_prefix TEXT;
  v_seq INTEGER;
  v_width INTEGER;
  v_default_prefix TEXT;
BEGIN
  v_default_prefix := CASE p_doc_type
    WHEN 'purchase_order' THEN 'PO'
    WHEN 'requisition'    THEN 'REQ'
    WHEN 'goods_receipt'  THEN 'GR'
    ELSE (SELECT 'DOC') END;

  INSERT INTO public.company_document_numbering_config (company_id, doc_type, prefix)
  VALUES (p_company_id, p_doc_type, v_default_prefix)
  ON CONFLICT (company_id, doc_type) DO NOTHING;

  SELECT * INTO v_row
  FROM public.company_document_numbering_config
  WHERE company_id = p_company_id AND doc_type = p_doc_type
  FOR UPDATE;

  IF v_row.reset_annually AND v_row.current_year <> v_now_year THEN
    UPDATE public.company_document_numbering_config
    SET next_seq = 2, current_year = v_now_year, updated_at = NOW()
    WHERE id = v_row.id;
    v_seq := 1;
  ELSE
    UPDATE public.company_document_numbering_config
    SET next_seq = v_row.next_seq + 1, updated_at = NOW()
    WHERE id = v_row.id;
    v_seq := v_row.next_seq;
  END IF;

  v_prefix := v_row.prefix;
  v_width := v_row.seq_width;
  RETURN v_prefix || '-' || v_now_year::TEXT || '-' || LPAD(v_seq::TEXT, v_width, '0');
END;
$$;

-- =========================================================
-- Chunk 5: baseline_harvest_runs (audit trail for L0.5)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.baseline_harvest_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id           UUID NOT NULL,
  firm_client_id    UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  source            TEXT NOT NULL CHECK (source IN ('qbo','csv')),
  status            TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled')),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  actor_id          TEXT,
  counts            JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message     TEXT,
  correlation_id    TEXT
);
CREATE INDEX IF NOT EXISTS idx_baseline_harvest_runs_firm_client
  ON public.baseline_harvest_runs (firm_client_id, started_at DESC);
ALTER TABLE public.baseline_harvest_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bhr_service_all ON public.baseline_harvest_runs;
CREATE POLICY bhr_service_all ON public.baseline_harvest_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS bhr_firm_select ON public.baseline_harvest_runs;
CREATE POLICY bhr_firm_select ON public.baseline_harvest_runs
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = baseline_harvest_runs.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 6: purchase_orders + purchase_order_line_items
-- =========================================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL,
  firm_client_id        UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL,
  po_number             TEXT NOT NULL,
  vendor_id             UUID,
  vendor_external_id    TEXT,
  status                TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','partially_received','closed','cancelled')),
  currency              TEXT NOT NULL DEFAULT 'USD',
  subtotal_cents        BIGINT NOT NULL DEFAULT 0,
  tax_cents             BIGINT NOT NULL DEFAULT 0,
  total_cents           BIGINT NOT NULL DEFAULT 0,
  ordered_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_delivery_at  TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  requisition_id        UUID,
  source                TEXT NOT NULL DEFAULT 'requisition' CHECK (source IN ('requisition','harvest_qbo','harvest_csv','manual')),
  source_external_id    TEXT,
  baseline_harvest_run_id UUID REFERENCES public.baseline_harvest_runs(id),
  memo                  TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, po_number)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_orders_source_external
  ON public.purchase_orders (firm_client_id, source, source_external_id)
  WHERE source_external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor
  ON public.purchase_orders (firm_client_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
  ON public.purchase_orders (firm_client_id, status);

CREATE TABLE IF NOT EXISTS public.purchase_order_line_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  line_number       INTEGER NOT NULL,
  description       TEXT NOT NULL,
  quantity_ordered  NUMERIC(14,4) NOT NULL DEFAULT 1,
  quantity_received NUMERIC(14,4) NOT NULL DEFAULT 0,
  unit_price_cents  BIGINT NOT NULL DEFAULT 0,
  line_total_cents  BIGINT NOT NULL DEFAULT 0,
  gl_account_code   TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (purchase_order_id, line_number)
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS po_service_all ON public.purchase_orders;
CREATE POLICY po_service_all ON public.purchase_orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS poli_service_all ON public.purchase_order_line_items;
CREATE POLICY poli_service_all ON public.purchase_order_line_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS po_firm_select ON public.purchase_orders;
CREATE POLICY po_firm_select ON public.purchase_orders
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = purchase_orders.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );
DROP POLICY IF EXISTS poli_firm_select ON public.purchase_order_line_items;
CREATE POLICY poli_firm_select ON public.purchase_order_line_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      JOIN public.firm_memberships fm ON fm.firm_id = po.firm_id
      WHERE po.id = purchase_order_line_items.purchase_order_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 7: requisitions + requisition_line_items
-- =========================================================
CREATE TABLE IF NOT EXISTS public.requisitions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL,
  firm_client_id        UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL,
  engagement_id         UUID,
  requisition_number    TEXT NOT NULL,
  requester_user_id     UUID NOT NULL,
  approver_user_id      UUID,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','cancelled','converted_to_po')),
  vendor_id             UUID,
  vendor_hint_text      TEXT,
  currency              TEXT NOT NULL DEFAULT 'USD',
  subtotal_cents        BIGINT NOT NULL DEFAULT 0,
  tax_cents             BIGINT NOT NULL DEFAULT 0,
  total_cents           BIGINT NOT NULL DEFAULT 0,
  needed_by             DATE,
  justification         TEXT,
  approved_at           TIMESTAMPTZ,
  approved_by           UUID,
  rejected_at           TIMESTAMPTZ,
  rejection_reason      TEXT,
  purchase_order_id     UUID,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, requisition_number)
);
CREATE INDEX IF NOT EXISTS idx_requisitions_firm_client_status
  ON public.requisitions (firm_client_id, status);
CREATE INDEX IF NOT EXISTS idx_requisitions_approver
  ON public.requisitions (approver_user_id, status);
CREATE INDEX IF NOT EXISTS idx_requisitions_requester
  ON public.requisitions (requester_user_id, status);

CREATE TABLE IF NOT EXISTS public.requisition_line_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id    UUID NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
  line_number       INTEGER NOT NULL,
  description       TEXT NOT NULL,
  quantity          NUMERIC(14,4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents  BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  line_total_cents  BIGINT NOT NULL DEFAULT 0,
  gl_account_code   TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (requisition_id, line_number)
);

ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS fk_purchase_orders_requisition;
ALTER TABLE public.purchase_orders
  ADD CONSTRAINT fk_purchase_orders_requisition
  FOREIGN KEY (requisition_id) REFERENCES public.requisitions(id) ON DELETE SET NULL;
ALTER TABLE public.requisitions
  DROP CONSTRAINT IF EXISTS fk_requisitions_po;
ALTER TABLE public.requisitions
  ADD CONSTRAINT fk_requisitions_po
  FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL;

ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS req_service_all ON public.requisitions;
CREATE POLICY req_service_all ON public.requisitions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS reqli_service_all ON public.requisition_line_items;
CREATE POLICY reqli_service_all ON public.requisition_line_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS req_firm_select ON public.requisitions;
CREATE POLICY req_firm_select ON public.requisitions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = requisitions.firm_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );
DROP POLICY IF EXISTS reqli_firm_select ON public.requisition_line_items;
CREATE POLICY reqli_firm_select ON public.requisition_line_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.requisitions r
      JOIN public.firm_memberships fm ON fm.firm_id = r.firm_id
      WHERE r.id = requisition_line_items.requisition_id
        AND fm.user_id = auth.uid()
        AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 8: goods_receipts + goods_receipt_line_items
-- =========================================================
CREATE TABLE IF NOT EXISTS public.goods_receipts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL,
  firm_client_id        UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL,
  purchase_order_id     UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  gr_number             TEXT NOT NULL,
  received_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by_user_id   UUID,
  status                TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','reversed')),
  source                TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','harvest_qbo','harvest_csv')),
  source_external_id    TEXT,
  baseline_harvest_run_id UUID REFERENCES public.baseline_harvest_runs(id),
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, gr_number)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_goods_receipts_source_external
  ON public.goods_receipts (firm_client_id, source, source_external_id)
  WHERE source_external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.goods_receipt_line_items (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id          UUID NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  purchase_order_line_id    UUID NOT NULL REFERENCES public.purchase_order_line_items(id) ON DELETE RESTRICT,
  quantity_received         NUMERIC(14,4) NOT NULL CHECK (quantity_received > 0),
  metadata                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (goods_receipt_id, purchase_order_line_id)
);

ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gr_service_all ON public.goods_receipts;
CREATE POLICY gr_service_all ON public.goods_receipts FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS grli_service_all ON public.goods_receipt_line_items;
CREATE POLICY grli_service_all ON public.goods_receipt_line_items FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS gr_firm_select ON public.goods_receipts;
CREATE POLICY gr_firm_select ON public.goods_receipts
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = goods_receipts.firm_id
        AND fm.user_id = auth.uid() AND fm.status = 'active'
    )
  );
DROP POLICY IF EXISTS grli_firm_select ON public.goods_receipt_line_items;
CREATE POLICY grli_firm_select ON public.goods_receipt_line_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.goods_receipts gr
      JOIN public.firm_memberships fm ON fm.firm_id = gr.firm_id
      WHERE gr.id = goods_receipt_line_items.goods_receipt_id
        AND fm.user_id = auth.uid() AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 9: bill_history harvest-ready refactor (5 sub-steps)
-- =========================================================
ALTER TABLE public.bill_history
  ALTER COLUMN bill_id DROP NOT NULL;

ALTER TABLE public.bill_history
  ADD COLUMN IF NOT EXISTS company_id UUID,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'intake' CHECK (source IN ('intake','harvest_qbo','harvest_csv','manual')),
  ADD COLUMN IF NOT EXISTS source_external_id TEXT,
  ADD COLUMN IF NOT EXISTS baseline_harvest_run_id UUID REFERENCES public.baseline_harvest_runs(id),
  ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS three_way_match_status TEXT CHECK (three_way_match_status IN ('matched','no_po','price_variance','quantity_variance','po_closed','not_evaluated')),
  ADD COLUMN IF NOT EXISTS three_way_match_signals JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.bill_history bh
SET company_id = fc.company_id
FROM public.firm_clients fc
WHERE bh.firm_client_id = fc.id AND bh.company_id IS NULL;

ALTER TABLE public.bill_history
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.bill_history DROP CONSTRAINT IF EXISTS bill_history_bill_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bill_history_bill_id
  ON public.bill_history (bill_id) WHERE bill_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bill_history_source_external
  ON public.bill_history (firm_client_id, source, source_external_id)
  WHERE source_external_id IS NOT NULL;

ALTER TABLE public.bill_history
  DROP CONSTRAINT IF EXISTS bill_history_identity_check;
ALTER TABLE public.bill_history
  ADD CONSTRAINT bill_history_identity_check
  CHECK (
    bill_id IS NOT NULL
    OR (source IN ('harvest_qbo','harvest_csv') AND source_external_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_bill_history_firm_client_source
  ON public.bill_history (firm_client_id, source);

-- =========================================================
-- Chunk 10: vendor_master_mirror additive columns for baseline harvest
-- =========================================================
ALTER TABLE public.vendor_master_mirror
  ADD COLUMN IF NOT EXISTS baseline_source TEXT CHECK (baseline_source IN ('qbo','csv')),
  ADD COLUMN IF NOT EXISTS baseline_harvest_run_id UUID REFERENCES public.baseline_harvest_runs(id);
CREATE INDEX IF NOT EXISTS idx_vendor_master_mirror_baseline_source
  ON public.vendor_master_mirror (firm_client_id, baseline_source)
  WHERE baseline_source IS NOT NULL;

-- =========================================================
-- Chunk 11: qbo_coa_mirror (read-only Chart of Accounts)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.qbo_coa_mirror (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL,
  firm_client_id        UUID NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  external_account_id   TEXT NOT NULL,
  account_number        TEXT,
  account_name          TEXT NOT NULL,
  account_type          TEXT,
  account_subtype       TEXT,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  baseline_harvest_run_id UUID REFERENCES public.baseline_harvest_runs(id),
  first_synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (firm_client_id, external_account_id)
);
ALTER TABLE public.qbo_coa_mirror ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coa_service_all ON public.qbo_coa_mirror;
CREATE POLICY coa_service_all ON public.qbo_coa_mirror FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS coa_firm_select ON public.qbo_coa_mirror;
CREATE POLICY coa_firm_select ON public.qbo_coa_mirror
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.firm_memberships fm
      WHERE fm.firm_id = qbo_coa_mirror.firm_id
        AND fm.user_id = auth.uid() AND fm.status = 'active'
    )
  );

-- =========================================================
-- Chunk 12: Extend ap_intake_ledger_event_types catalog (13 events)
-- =========================================================
INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('requisition.created',           'user',   TRUE),
  ('requisition.submitted',         'user',   TRUE),
  ('requisition.approved',          'user',   TRUE),
  ('requisition.rejected',          'user',   TRUE),
  ('requisition.converted_to_po',   'user',   TRUE),
  ('purchase_order.created',        'user',   TRUE),
  ('purchase_order.closed',         'user',   TRUE),
  ('goods_receipt.recorded',        'user',   TRUE),
  ('three_way_match.evaluated',     'system', TRUE),
  ('three_way_match.hit',           'system', TRUE),
  ('baseline_harvest.started',      'user',   TRUE),
  ('baseline_harvest.completed',    'system', TRUE),
  ('baseline_harvest.failed',       'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

COMMIT;
-- <<< end 20260717060000_d65_p2_block6a_requisitions_harvest_l3.sql

-- >>> begin 20260717080000_d65_p2_block6b_approval_delegation_budget_comments.sql
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
-- <<< end 20260717080000_d65_p2_block6b_approval_delegation_budget_comments.sql

-- >>> begin 20260717090000_d65_p2_block7a_credits_prepayment.sql
-- Phase D6.5 Part 2 Block 7a — L7 credits / prepayment sub-ledger
-- Depends on: Block 6b (engagement_addons, pilot_feature_allowlist, ap_intake_ledger_event_types, firm_memberships, ap_intake_bills)
BEGIN;

-- 1a. Widen engagement_addons.addon_code CHECK
ALTER TABLE public.engagement_addons DROP CONSTRAINT IF EXISTS engagement_addons_addon_code_check;
ALTER TABLE public.engagement_addons
  ADD CONSTRAINT engagement_addons_addon_code_check
  CHECK (addon_code IN (
    'ap_intake','ap_pay','ar_invoicing','ar_cash_app','ar_collections',
    'voice_collections','quarantine_review','ap_requisitions',
    'ap_baseline_harvest','ap_three_way_match','ap_budget_controls',
    'ap_credit_prepayment'
  ));

-- 1b. Widen pilot_feature_allowlist.feature_code CHECK
ALTER TABLE public.pilot_feature_allowlist DROP CONSTRAINT IF EXISTS pilot_feature_allowlist_feature_code_check;
ALTER TABLE public.pilot_feature_allowlist
  ADD CONSTRAINT pilot_feature_allowlist_feature_code_check
  CHECK (feature_code IN (
    'ap_requisitions','ap_baseline_harvest','ap_three_way_match',
    'ap_approval_matrix','ap_budget_controls','ap_credit_prepayment'
  ));

-- 2. Table: vendor_credits
CREATE TABLE IF NOT EXISTS public.vendor_credits (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                UUID NOT NULL,
  firm_client_id         UUID NOT NULL,
  engagement_id          UUID,
  vendor_id              UUID NOT NULL,
  credit_type            TEXT NOT NULL CHECK (credit_type IN ('credit_memo','debit_memo')),
  source_document_type   TEXT NOT NULL CHECK (source_document_type IN ('vendor_issued','manual_entry','system_derived')),
  source_document_ref    TEXT,
  original_amount_cents  BIGINT NOT NULL CHECK (original_amount_cents >= 0),
  remaining_amount_cents BIGINT NOT NULL CHECK (remaining_amount_cents >= 0),
  currency               CHAR(3) NOT NULL,
  issued_date            DATE NOT NULL,
  expiration_date        DATE,
  status                 TEXT NOT NULL DEFAULT 'open'
                           CHECK (status IN ('open','partially_applied','fully_applied','expired','voided')),
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vendor_credits_firm_vendor_status_idx ON public.vendor_credits (firm_id, vendor_id, status);
CREATE INDEX IF NOT EXISTS vendor_credits_firm_client_status_idx ON public.vendor_credits (firm_client_id, status);
ALTER TABLE public.vendor_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vendor_credits_service_all ON public.vendor_credits;
CREATE POLICY vendor_credits_service_all ON public.vendor_credits
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS vendor_credits_firm_member_select ON public.vendor_credits;
CREATE POLICY vendor_credits_firm_member_select ON public.vendor_credits
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = vendor_credits.firm_id AND fm.user_id = auth.uid()));

-- 3. Table: credit_applications
CREATE TABLE IF NOT EXISTS public.credit_applications (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                     UUID NOT NULL,
  vendor_credit_id            UUID NOT NULL REFERENCES public.vendor_credits(id) ON DELETE RESTRICT,
  bill_id                     UUID NOT NULL REFERENCES public.ap_intake_bills(id) ON DELETE RESTRICT,
  applied_amount_cents        BIGINT NOT NULL CHECK (applied_amount_cents > 0),
  applied_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by                  TEXT NOT NULL CHECK (applied_by IN ('system_auto','user_manual','payment_authorization')),
  application_source_event_id UUID,
  reversed_at                 TIMESTAMPTZ,
  reversal_reason             TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credit_applications_firm_credit_reversed_idx ON public.credit_applications (firm_id, vendor_credit_id, reversed_at);
CREATE INDEX IF NOT EXISTS credit_applications_bill_idx ON public.credit_applications (bill_id);
ALTER TABLE public.credit_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credit_applications_service_all ON public.credit_applications;
CREATE POLICY credit_applications_service_all ON public.credit_applications
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS credit_applications_firm_member_select ON public.credit_applications;
CREATE POLICY credit_applications_firm_member_select ON public.credit_applications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = credit_applications.firm_id AND fm.user_id = auth.uid()));

-- 4. Table: vendor_prepayment_balances
CREATE TABLE IF NOT EXISTS public.vendor_prepayment_balances (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                     UUID NOT NULL,
  firm_client_id              UUID NOT NULL,
  vendor_id                   UUID NOT NULL,
  currency                    CHAR(3) NOT NULL,
  total_paid_cents            BIGINT NOT NULL DEFAULT 0 CHECK (total_paid_cents >= 0),
  total_applied_cents         BIGINT NOT NULL DEFAULT 0 CHECK (total_applied_cents >= 0),
  balance_cents               BIGINT GENERATED ALWAYS AS (total_paid_cents - total_applied_cents) STORED,
  oldest_open_prepayment_date DATE,
  last_movement_at            TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (firm_id, vendor_id, currency)
);
CREATE INDEX IF NOT EXISTS vpb_firm_oldest_prepay_idx ON public.vendor_prepayment_balances (firm_id, oldest_open_prepayment_date)
  WHERE balance_cents > 0;
ALTER TABLE public.vendor_prepayment_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vpb_service_all ON public.vendor_prepayment_balances;
CREATE POLICY vpb_service_all ON public.vendor_prepayment_balances
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS vpb_firm_member_select ON public.vendor_prepayment_balances;
CREATE POLICY vpb_firm_member_select ON public.vendor_prepayment_balances
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = vendor_prepayment_balances.firm_id AND fm.user_id = auth.uid()));

-- 5. Table: prepayment_ledger
CREATE TABLE IF NOT EXISTS public.prepayment_ledger (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id            UUID NOT NULL,
  vendor_id          UUID NOT NULL,
  currency           CHAR(3) NOT NULL,
  movement_type      TEXT NOT NULL CHECK (movement_type IN ('prepayment_received','prepayment_applied','prepayment_reversed','prepayment_written_off')),
  amount_cents       BIGINT NOT NULL,
  source_event_id    UUID,
  source_bill_id     UUID REFERENCES public.ap_intake_bills(id) ON DELETE SET NULL,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID NOT NULL
);
CREATE INDEX IF NOT EXISTS prepayment_ledger_firm_vendor_time_idx ON public.prepayment_ledger (firm_id, vendor_id, created_at);
ALTER TABLE public.prepayment_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prepayment_ledger_service_all ON public.prepayment_ledger;
CREATE POLICY prepayment_ledger_service_all ON public.prepayment_ledger
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS prepayment_ledger_firm_member_select ON public.prepayment_ledger;
CREATE POLICY prepayment_ledger_firm_member_select ON public.prepayment_ledger
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = prepayment_ledger.firm_id AND fm.user_id = auth.uid()));

-- 6. Table: refund_request_drafts
CREATE TABLE IF NOT EXISTS public.refund_request_drafts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL,
  firm_client_id        UUID NOT NULL,
  vendor_id             UUID NOT NULL,
  prepayment_balance_id UUID NOT NULL REFERENCES public.vendor_prepayment_balances(id) ON DELETE RESTRICT,
  draft_amount_cents    BIGINT NOT NULL CHECK (draft_amount_cents > 0),
  currency              CHAR(3) NOT NULL,
  aging_days            INT NOT NULL CHECK (aging_days >= 0),
  status                TEXT NOT NULL DEFAULT 'pending_reviewer'
                          CHECK (status IN ('pending_reviewer','reviewer_approved','reviewer_rejected','reviewer_deferred')),
  reviewer_user_id      UUID,
  reviewer_decided_at   TIMESTAMPTZ,
  reviewer_notes        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rrd_firm_status_idx ON public.refund_request_drafts (firm_id, status, created_at);
ALTER TABLE public.refund_request_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rrd_service_all ON public.refund_request_drafts;
CREATE POLICY rrd_service_all ON public.refund_request_drafts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rrd_firm_member_select ON public.refund_request_drafts;
CREATE POLICY rrd_firm_member_select ON public.refund_request_drafts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = refund_request_drafts.firm_id AND fm.user_id = auth.uid()));

-- 7. Extend ap_intake_ledger_event_types catalog (10 Block 7a events)
INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('vendor_credit.issued',                'user',   TRUE),
  ('vendor_credit.applied',               'user',   TRUE),
  ('vendor_credit.application_reversed',  'user',   TRUE),
  ('vendor_credit.expired',               'system', TRUE),
  ('vendor_credit.voided',                'user',   TRUE),
  ('prepayment.received',                 'user',   TRUE),
  ('prepayment.applied',                  'user',   TRUE),
  ('prepayment.aged_flagged',             'system', TRUE),
  ('prepayment.refund_draft_created',     'system', TRUE),
  ('prepayment.refund_draft_reviewed',    'user',   TRUE)
ON CONFLICT (event_type) DO NOTHING;

-- Document why vendor_id is unconstrained (codebase convention)
COMMENT ON COLUMN public.vendor_credits.vendor_id IS
  'Logical vendor UUID. Unconstrained per codebase convention: vendor_master_mirror is an ERP-owned mirror (QBO/etc), not a canonical registry, so sub-ledger money tables never FK into it. Resolution happens at query time via ap_intake_bills.resolved_vendor_id and matching against vendor_master_mirror.';
COMMENT ON COLUMN public.vendor_prepayment_balances.vendor_id IS
  'Logical vendor UUID. Unconstrained per codebase convention: vendor_master_mirror is an ERP-owned mirror (QBO/etc), not a canonical registry, so sub-ledger money tables never FK into it. Resolution happens at query time via ap_intake_bills.resolved_vendor_id and matching against vendor_master_mirror.';
COMMENT ON COLUMN public.prepayment_ledger.vendor_id IS
  'Logical vendor UUID. Unconstrained per codebase convention: vendor_master_mirror is an ERP-owned mirror (QBO/etc), not a canonical registry, so sub-ledger money tables never FK into it. Resolution happens at query time via ap_intake_bills.resolved_vendor_id and matching against vendor_master_mirror.';
COMMENT ON COLUMN public.refund_request_drafts.vendor_id IS
  'Logical vendor UUID. Unconstrained per codebase convention: vendor_master_mirror is an ERP-owned mirror (QBO/etc), not a canonical registry, so sub-ledger money tables never FK into it. Resolution happens at query time via ap_intake_bills.resolved_vendor_id and matching against vendor_master_mirror.';

COMMENT ON COLUMN public.credit_applications.bill_id IS
  'FK to ap_intake_bills(id) — the canonical bill of record in this codebase. There is no public.bills table.';
COMMENT ON COLUMN public.prepayment_ledger.source_bill_id IS
  'FK to ap_intake_bills(id) — the canonical bill of record in this codebase. Nullable because prepayments can predate the invoice.';

COMMIT;
-- <<< end 20260717090000_d65_p2_block7a_credits_prepayment.sql

-- >>> begin 20260717100000_d65_p2_block7b_multimodal_inbox.sql
-- Phase D6.5 Part 2 Block 7b — L8 Multimodal AP Inbox
-- Depends on: Block 7a (engagement_addons, pilot_feature_allowlist, ap_intake_ledger_event_types, firm_memberships)
BEGIN;

-- 1a. Widen engagement_addons.addon_code CHECK
ALTER TABLE public.engagement_addons DROP CONSTRAINT IF EXISTS engagement_addons_addon_code_check;
ALTER TABLE public.engagement_addons
  ADD CONSTRAINT engagement_addons_addon_code_check
  CHECK (addon_code IN (
    'ap_intake','ap_pay','ar_invoicing','ar_cash_app','ar_collections',
    'voice_collections','quarantine_review','ap_requisitions',
    'ap_baseline_harvest','ap_three_way_match','ap_budget_controls',
    'ap_credit_prepayment','ap_multimodal_inbox'
  ));

-- 1b. Widen pilot_feature_allowlist.feature_code CHECK
ALTER TABLE public.pilot_feature_allowlist DROP CONSTRAINT IF EXISTS pilot_feature_allowlist_feature_code_check;
ALTER TABLE public.pilot_feature_allowlist
  ADD CONSTRAINT pilot_feature_allowlist_feature_code_check
  CHECK (feature_code IN (
    'ap_requisitions','ap_baseline_harvest','ap_three_way_match',
    'ap_approval_matrix','ap_budget_controls','ap_credit_prepayment',
    'ap_multimodal_inbox'
  ));

-- 2. Table: vendor_ap_inbox_messages
CREATE TABLE IF NOT EXISTS public.vendor_ap_inbox_messages (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                  UUID NOT NULL,
  firm_client_id           UUID NOT NULL,
  vendor_id                UUID,
  channel                  TEXT NOT NULL CHECK (channel IN ('email','voice','sms','messaging')),
  direction                TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  external_message_id      TEXT,
  subject                  TEXT,
  body_text                TEXT NOT NULL,
  body_html                TEXT,
  attachments              JSONB NOT NULL DEFAULT '[]'::jsonb,
  received_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  sender_address           TEXT NOT NULL,
  raw_payload              JSONB NOT NULL,
  intent                   TEXT CHECK (intent IN (
                             'invoice_submission','invoice_inquiry','statement_request',
                             'dispute','credit_request','refund_request',
                             'bank_change_request','payment_status','generic',
                             'wire_transfer_initiation','refund_transmission_request'
                           )),
  intent_confidence        NUMERIC(5,4) CHECK (intent_confidence IS NULL OR (intent_confidence >= 0 AND intent_confidence <= 1)),
  intent_classified_at     TIMESTAMPTZ,
  matched_to_message_id    UUID REFERENCES public.vendor_ap_inbox_messages(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vaim_firm_intent_received_idx
  ON public.vendor_ap_inbox_messages (firm_id, intent, received_at DESC);
CREATE INDEX IF NOT EXISTS vaim_firm_vendor_received_idx
  ON public.vendor_ap_inbox_messages (firm_id, vendor_id, received_at DESC);
CREATE INDEX IF NOT EXISTS vaim_firm_direction_idx
  ON public.vendor_ap_inbox_messages (firm_id, direction);
ALTER TABLE public.vendor_ap_inbox_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vaim_service_all ON public.vendor_ap_inbox_messages;
CREATE POLICY vaim_service_all ON public.vendor_ap_inbox_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS vaim_firm_member_select ON public.vendor_ap_inbox_messages;
CREATE POLICY vaim_firm_member_select ON public.vendor_ap_inbox_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = vendor_ap_inbox_messages.firm_id AND fm.user_id = auth.uid()));

-- 3. Table: ap_inbox_drafted_responses
CREATE TABLE IF NOT EXISTS public.ap_inbox_drafted_responses (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                UUID NOT NULL,
  message_id             UUID NOT NULL REFERENCES public.vendor_ap_inbox_messages(id) ON DELETE CASCADE,
  draft_body_text        TEXT NOT NULL,
  draft_body_html        TEXT,
  intent_at_draft_time   TEXT NOT NULL,
  model_id               TEXT NOT NULL,
  tone_profile_id        UUID,
  autonomy_decision      TEXT NOT NULL CHECK (autonomy_decision IN (
                           'needs_approval','auto_send_pending','permanent_exclusion_hold'
                         )),
  autonomy_reason        TEXT NOT NULL,
  reviewer_user_id       UUID,
  reviewer_decided_at    TIMESTAMPTZ,
  reviewer_decision      TEXT CHECK (reviewer_decision IS NULL OR reviewer_decision IN (
                           'approved_as_drafted','approved_with_edits','rejected','deferred'
                         )),
  sent_at                TIMESTAMPTZ,
  sent_message_id        UUID REFERENCES public.vendor_ap_inbox_messages(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aidr_firm_decision_idx
  ON public.ap_inbox_drafted_responses (firm_id, autonomy_decision);
CREATE INDEX IF NOT EXISTS aidr_message_idx
  ON public.ap_inbox_drafted_responses (message_id);
ALTER TABLE public.ap_inbox_drafted_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aidr_service_all ON public.ap_inbox_drafted_responses;
CREATE POLICY aidr_service_all ON public.ap_inbox_drafted_responses
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS aidr_firm_member_select ON public.ap_inbox_drafted_responses;
CREATE POLICY aidr_firm_member_select ON public.ap_inbox_drafted_responses
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = ap_inbox_drafted_responses.firm_id AND fm.user_id = auth.uid()));

-- 4. Table: ap_inbox_autonomy_config (per-firm; UNIQUE(firm_id))
CREATE TABLE IF NOT EXISTS public.ap_inbox_autonomy_config (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                 UUID NOT NULL UNIQUE,
  mode                    TEXT NOT NULL CHECK (mode IN ('approve_all','allowlist_auto_send','auto_send_default')),
  allowlist_intents       JSONB NOT NULL DEFAULT '[]'::jsonb,
  escalation_role_slug    TEXT NOT NULL DEFAULT 'firm_admin',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT aiac_no_permanent_exclusions_in_allowlist CHECK (
    NOT (
      allowlist_intents @> '["bank_change_request"]'::jsonb
      OR allowlist_intents @> '["wire_transfer_initiation"]'::jsonb
      OR allowlist_intents @> '["refund_transmission_request"]'::jsonb
      OR allowlist_intents @> '["refund_request"]'::jsonb
    )
  )
);
ALTER TABLE public.ap_inbox_autonomy_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aiac_service_all ON public.ap_inbox_autonomy_config;
CREATE POLICY aiac_service_all ON public.ap_inbox_autonomy_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS aiac_firm_member_select ON public.ap_inbox_autonomy_config;
CREATE POLICY aiac_firm_member_select ON public.ap_inbox_autonomy_config
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = ap_inbox_autonomy_config.firm_id AND fm.user_id = auth.uid()));

-- 5. Table: ap_inbox_permanent_exclusions_log (append-only observability)
CREATE TABLE IF NOT EXISTS public.ap_inbox_permanent_exclusions_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id             UUID NOT NULL,
  message_id          UUID REFERENCES public.vendor_ap_inbox_messages(id) ON DELETE SET NULL,
  attempted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  intent              TEXT NOT NULL,
  rejected_config     JSONB,
  enforcement_path    TEXT NOT NULL CHECK (enforcement_path IN (
                        'server_config_reject','draft_hold','send_time_reject'
                      )),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aipel_firm_attempted_idx
  ON public.ap_inbox_permanent_exclusions_log (firm_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS aipel_firm_path_idx
  ON public.ap_inbox_permanent_exclusions_log (firm_id, enforcement_path);
ALTER TABLE public.ap_inbox_permanent_exclusions_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aipel_service_all ON public.ap_inbox_permanent_exclusions_log;
CREATE POLICY aipel_service_all ON public.ap_inbox_permanent_exclusions_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS aipel_firm_member_select ON public.ap_inbox_permanent_exclusions_log;
CREATE POLICY aipel_firm_member_select ON public.ap_inbox_permanent_exclusions_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = ap_inbox_permanent_exclusions_log.firm_id AND fm.user_id = auth.uid()));

-- 6. Extend ap_intake_ledger_event_types catalog (12 Block 7b events)
INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('ap_inbox.message_received',           'system', TRUE),
  ('ap_inbox.message_classified',         'system', TRUE),
  ('ap_inbox.classification_failed',      'system', TRUE),
  ('ap_inbox.draft_created',              'system', TRUE),
  ('ap_inbox.draft_reviewer_approved',    'user',   TRUE),
  ('ap_inbox.draft_reviewer_rejected',    'user',   TRUE),
  ('ap_inbox.draft_reviewer_deferred',    'user',   TRUE),
  ('ap_inbox.draft_sent',                 'system', TRUE),
  ('ap_inbox.autonomy_config_updated',    'user',   TRUE),
  ('ap_inbox.permanent_exclusion_enforced','system', TRUE),
  ('ap_inbox.vendor_matched',             'system', TRUE),
  ('ap_inbox.reclassified',               'user',   TRUE)
ON CONFLICT (event_type) DO NOTHING;

COMMENT ON COLUMN public.vendor_ap_inbox_messages.vendor_id IS
  'Logical vendor UUID. Unconstrained per codebase convention: vendor_master_mirror is an ERP-owned mirror (QBO/etc), not a canonical registry, so sub-ledger and messaging tables never FK into it. Resolution happens at query time.';

COMMIT;
-- <<< end 20260717100000_d65_p2_block7b_multimodal_inbox.sql

-- >>> begin 20260717110000_d65_p2_block8a_interlock_rails.sql
-- Phase D6.5 Part 2 Block 8a — L9 Interlock + L10 Banking Rail Fan-Out
-- Depends on: Block 3 (vendor_bank_history), Block 6a (requisitions), Block 6b (gl_account_budgets),
--             Block 7a (vendor_credits, vendor_prepayment_balances, engagement_addons,
--                       pilot_feature_allowlist, ap_intake_ledger_event_types, firm_memberships)
BEGIN;

-- 1a. Widen engagement_addons.addon_code CHECK
ALTER TABLE public.engagement_addons DROP CONSTRAINT IF EXISTS engagement_addons_addon_code_check;
ALTER TABLE public.engagement_addons
  ADD CONSTRAINT engagement_addons_addon_code_check
  CHECK (addon_code IN (
    'ap_intake','ap_pay','ar_invoicing','ar_cash_app','ar_collections',
    'voice_collections','quarantine_review','ap_requisitions',
    'ap_baseline_harvest','ap_three_way_match','ap_budget_controls',
    'ap_credit_prepayment','ap_multimodal_inbox',
    'ap_payment_interlock','ap_banking_fanout'
  ));

-- 1b. Widen pilot_feature_allowlist.feature_code CHECK
ALTER TABLE public.pilot_feature_allowlist DROP CONSTRAINT IF EXISTS pilot_feature_allowlist_feature_code_check;
ALTER TABLE public.pilot_feature_allowlist
  ADD CONSTRAINT pilot_feature_allowlist_feature_code_check
  CHECK (feature_code IN (
    'ap_requisitions','ap_baseline_harvest','ap_three_way_match',
    'ap_approval_matrix','ap_budget_controls','ap_credit_prepayment',
    'ap_multimodal_inbox','ap_payment_interlock','ap_banking_fanout'
  ));

-- 2. Table: payment_batches (parent — every rail attempt must attach to a batch)
CREATE TABLE IF NOT EXISTS public.payment_batches (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                  UUID NOT NULL,
  firm_client_id           UUID NOT NULL,
  engagement_id            UUID NOT NULL,
  batch_number             TEXT NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'USD',
  status                   TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','interlock_pending','interlock_passed','interlock_failed','interlock_reviewer_approved','interlock_reviewer_rejected','executed','cancelled')),
  requested_by_user_id     UUID NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (firm_client_id, batch_number)
);
CREATE INDEX IF NOT EXISTS pb_firm_status_idx
  ON public.payment_batches (firm_id, status);
CREATE INDEX IF NOT EXISTS pb_firm_client_status_idx
  ON public.payment_batches (firm_client_id, status);
ALTER TABLE public.payment_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pb_service_all ON public.payment_batches;
CREATE POLICY pb_service_all ON public.payment_batches
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS pb_firm_member_select ON public.payment_batches;
CREATE POLICY pb_firm_member_select ON public.payment_batches
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = payment_batches.firm_id AND fm.user_id = auth.uid()));

-- 3. Table: payment_batch_lines
CREATE TABLE IF NOT EXISTS public.payment_batch_lines (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id                 UUID NOT NULL REFERENCES public.payment_batches(id) ON DELETE CASCADE,
  firm_id                  UUID NOT NULL,
  firm_client_id           UUID NOT NULL,
  vendor_id                UUID NOT NULL,
  bill_id                  UUID,
  requisition_id           UUID,
  gross_amount_cents       BIGINT NOT NULL CHECK (gross_amount_cents > 0),
  applied_credit_cents     BIGINT NOT NULL DEFAULT 0 CHECK (applied_credit_cents >= 0),
  applied_prepayment_cents BIGINT NOT NULL DEFAULT 0 CHECK (applied_prepayment_cents >= 0),
  net_amount_cents         BIGINT NOT NULL CHECK (net_amount_cents >= 0),
  gl_account_code          TEXT,
  memo                     TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pbl_net_within_gross CHECK (net_amount_cents <= gross_amount_cents)
);
CREATE INDEX IF NOT EXISTS pbl_batch_idx ON public.payment_batch_lines (batch_id);
CREATE INDEX IF NOT EXISTS pbl_firm_vendor_idx ON public.payment_batch_lines (firm_id, vendor_id);
ALTER TABLE public.payment_batch_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pbl_service_all ON public.payment_batch_lines;
CREATE POLICY pbl_service_all ON public.payment_batch_lines
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS pbl_firm_member_select ON public.payment_batch_lines;
CREATE POLICY pbl_firm_member_select ON public.payment_batch_lines
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = payment_batch_lines.firm_id AND fm.user_id = auth.uid()));

-- 4. Table: payment_batch_interlock_events (L9 append-only)
CREATE TABLE IF NOT EXISTS public.payment_batch_interlock_events (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id                  UUID NOT NULL REFERENCES public.payment_batches(id) ON DELETE CASCADE,
  firm_id                   UUID NOT NULL,
  firm_client_id            UUID NOT NULL,
  computed_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  result                    TEXT NOT NULL CHECK (result IN ('passed','failed','reviewer_approved','reviewer_rejected')),
  reviewer_role_slug        TEXT NOT NULL DEFAULT 'firm_admin',
  reviewer_user_id          UUID,
  reviewer_decided_at       TIMESTAMPTZ,
  reason_codes              JSONB NOT NULL DEFAULT '[]'::jsonb,
  per_vendor_net_positions  JSONB NOT NULL DEFAULT '[]'::jsonb,
  gl_budget_snapshot        JSONB NOT NULL DEFAULT '[]'::jsonb,
  vendor_commitment_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pbie_batch_idx ON public.payment_batch_interlock_events (batch_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS pbie_firm_result_idx ON public.payment_batch_interlock_events (firm_id, result);
ALTER TABLE public.payment_batch_interlock_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pbie_service_all ON public.payment_batch_interlock_events;
CREATE POLICY pbie_service_all ON public.payment_batch_interlock_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS pbie_firm_member_select ON public.payment_batch_interlock_events;
CREATE POLICY pbie_firm_member_select ON public.payment_batch_interlock_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = payment_batch_interlock_events.firm_id AND fm.user_id = auth.uid()));

-- 5. Table: vendor_bank_accounts (canonical, firm-managed; per-vendor rail preferences)
CREATE TABLE IF NOT EXISTS public.vendor_bank_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL,
  firm_client_id        UUID NOT NULL,
  vendor_id             UUID NOT NULL,
  nickname              TEXT,
  routing_number_last4  TEXT NOT NULL,
  account_number_last4  TEXT NOT NULL,
  account_hash_sha256   TEXT NOT NULL,
  preferred_rail        TEXT NOT NULL CHECK (preferred_rail IN ('ach','wire','rtp','check','virtual_card')),
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  registered_by_user_id UUID NOT NULL,
  deactivated_at        TIMESTAMPTZ,
  deactivated_by_user_id UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (firm_client_id, vendor_id, account_hash_sha256)
);
CREATE INDEX IF NOT EXISTS vba_firm_vendor_active_idx
  ON public.vendor_bank_accounts (firm_id, vendor_id, is_active);
CREATE INDEX IF NOT EXISTS vba_firm_client_vendor_idx
  ON public.vendor_bank_accounts (firm_client_id, vendor_id);
ALTER TABLE public.vendor_bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vba_service_all ON public.vendor_bank_accounts;
CREATE POLICY vba_service_all ON public.vendor_bank_accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS vba_firm_member_select ON public.vendor_bank_accounts;
CREATE POLICY vba_firm_member_select ON public.vendor_bank_accounts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = vendor_bank_accounts.firm_id AND fm.user_id = auth.uid()));

-- 6. Table: vendor_bank_fanout_events (L10 append-only rail execution attempts)
CREATE TABLE IF NOT EXISTS public.vendor_bank_fanout_events (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id               UUID NOT NULL REFERENCES public.payment_batches(id) ON DELETE CASCADE,
  batch_line_id          UUID NOT NULL REFERENCES public.payment_batch_lines(id) ON DELETE CASCADE,
  firm_id                UUID NOT NULL,
  firm_client_id         UUID NOT NULL,
  vendor_id              UUID NOT NULL,
  vendor_bank_account_id UUID NOT NULL REFERENCES public.vendor_bank_accounts(id),
  rail                   TEXT NOT NULL CHECK (rail IN ('ach','wire','rtp','check','virtual_card')),
  adapter_version        TEXT NOT NULL,
  attempt_type           TEXT NOT NULL CHECK (attempt_type IN ('attempt','record')),
  outcome                TEXT NOT NULL CHECK (outcome IN ('pending','submitted','confirmed','failed','cancelled')),
  amount_cents           BIGINT NOT NULL CHECK (amount_cents > 0),
  external_reference     TEXT,
  raw_adapter_payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempted_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vbfe_batch_idx ON public.vendor_bank_fanout_events (batch_id);
CREATE INDEX IF NOT EXISTS vbfe_firm_vendor_rail_idx ON public.vendor_bank_fanout_events (firm_id, vendor_id, rail);
CREATE INDEX IF NOT EXISTS vbfe_line_attempted_idx ON public.vendor_bank_fanout_events (batch_line_id, attempted_at DESC);
ALTER TABLE public.vendor_bank_fanout_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vbfe_service_all ON public.vendor_bank_fanout_events;
CREATE POLICY vbfe_service_all ON public.vendor_bank_fanout_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS vbfe_firm_member_select ON public.vendor_bank_fanout_events;
CREATE POLICY vbfe_firm_member_select ON public.vendor_bank_fanout_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm
                 WHERE fm.firm_id = vendor_bank_fanout_events.firm_id AND fm.user_id = auth.uid()));

-- 7. Register 12 new Merkle-chained events in ap_intake_ledger_event_types
INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('ap_batch.created',                        'user',   TRUE),
  ('ap_batch.line_added',                     'user',   TRUE),
  ('ap_batch.interlock_computed',             'system', TRUE),
  ('ap_batch.interlock_passed',               'system', TRUE),
  ('ap_batch.interlock_failed',               'system', TRUE),
  ('ap_batch.interlock_reviewer_approved',    'user',   TRUE),
  ('ap_batch.interlock_reviewer_rejected',    'user',   TRUE),
  ('ap_rail.vendor_account_registered',       'user',   TRUE),
  ('ap_rail.vendor_account_updated',          'user',   TRUE),
  ('ap_rail.vendor_account_deactivated',      'user',   TRUE),
  ('ap_rail.fanout_attempted',                'system', TRUE),
  ('ap_rail.fanout_recorded',                 'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

COMMENT ON COLUMN public.payment_batch_lines.vendor_id IS
  'Logical vendor UUID. Unconstrained per codebase convention: vendor_master_mirror is an ERP-owned mirror, not a canonical registry.';
COMMENT ON COLUMN public.vendor_bank_accounts.vendor_id IS
  'Logical vendor UUID. Unconstrained per codebase convention.';
COMMENT ON COLUMN public.payment_batch_interlock_events.reviewer_role_slug IS
  'Stub for Block 8b L12 preset packs — currently defaults to firm_admin; L12 will drive per-pack overrides.';

COMMIT;
-- <<< end 20260717110000_d65_p2_block8a_interlock_rails.sql

-- >>> begin 20260717120000_d65_p2_block8b_presets_selfgov.sql
-- Phase D6.5 Part 2 Block 8b — L12 Preset Packs + L13 Adaptive Self-Governance
-- Depends on: Block 7a (engagement_addons, pilot_feature_allowlist, ap_intake_ledger_event_types, firm_memberships)
BEGIN;

-- 1a. Widen engagement_addons.addon_code CHECK
ALTER TABLE public.engagement_addons DROP CONSTRAINT IF EXISTS engagement_addons_addon_code_check;
ALTER TABLE public.engagement_addons
  ADD CONSTRAINT engagement_addons_addon_code_check
  CHECK (addon_code IN (
    'ap_intake','ap_pay','ar_invoicing','ar_cash_app','ar_collections',
    'voice_collections','quarantine_review','ap_requisitions',
    'ap_baseline_harvest','ap_three_way_match','ap_budget_controls',
    'ap_credit_prepayment','ap_multimodal_inbox',
    'ap_payment_interlock','ap_banking_fanout',
    'ap_preset_packs','ap_adaptive_governance'
  ));

-- 1b. Widen pilot_feature_allowlist.feature_code CHECK
ALTER TABLE public.pilot_feature_allowlist DROP CONSTRAINT IF EXISTS pilot_feature_allowlist_feature_code_check;
ALTER TABLE public.pilot_feature_allowlist
  ADD CONSTRAINT pilot_feature_allowlist_feature_code_check
  CHECK (feature_code IN (
    'ap_requisitions','ap_baseline_harvest','ap_three_way_match',
    'ap_approval_matrix','ap_budget_controls','ap_credit_prepayment',
    'ap_multimodal_inbox','ap_payment_interlock','ap_banking_fanout',
    'ap_preset_packs','ap_adaptive_governance'
  ));

-- 2. preset_pack_registry — 5 immutable seed rows
CREATE TABLE IF NOT EXISTS public.preset_pack_registry (
  pack_code                       TEXT PRIMARY KEY
    CHECK (pack_code IN ('starter','growing','controller_led','firm_managed','high_risk')),
  display_name                    TEXT NOT NULL,
  description                     TEXT NOT NULL,
  fraud_anomaly_zscore_threshold  NUMERIC(5,2) NOT NULL CHECK (fraud_anomaly_zscore_threshold > 0),
  fraud_aggregate_score_threshold NUMERIC(5,2) NOT NULL CHECK (fraud_aggregate_score_threshold BETWEEN 0 AND 1),
  inbox_autonomy_level            TEXT NOT NULL CHECK (inbox_autonomy_level IN ('observe','assist','execute')),
  interlock_reviewer_role_slug    TEXT NOT NULL CHECK (interlock_reviewer_role_slug IN ('firm_admin','controller','cfo')),
  aged_prepay_threshold_days      INT NOT NULL CHECK (aged_prepay_threshold_days > 0),
  requisition_approval_hierarchy  TEXT NOT NULL CHECK (requisition_approval_hierarchy IN ('flat','two_tier','three_tier')),
  cross_tenant_aggregation_optin  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.preset_pack_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ppr_service_all ON public.preset_pack_registry;
CREATE POLICY ppr_service_all ON public.preset_pack_registry FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ppr_authenticated_select ON public.preset_pack_registry;
CREATE POLICY ppr_authenticated_select ON public.preset_pack_registry FOR SELECT TO authenticated USING (true);

INSERT INTO public.preset_pack_registry (
  pack_code, display_name, description,
  fraud_anomaly_zscore_threshold, fraud_aggregate_score_threshold,
  inbox_autonomy_level, interlock_reviewer_role_slug,
  aged_prepay_threshold_days, requisition_approval_hierarchy,
  cross_tenant_aggregation_optin
) VALUES
  ('starter',        'Starter',        'Small businesses with a single approver. Loose thresholds, high-touch reviewer intervention.',
   2.50, 0.75, 'observe',  'firm_admin', 90, 'flat',       FALSE),
  ('growing',        'Growing',        'Scaling teams with two-tier approvals. Balanced automation.',
   2.00, 0.65, 'assist',   'controller', 60, 'two_tier',   FALSE),
  ('controller_led', 'Controller-Led', 'Controller owns AP decisions end-to-end. Elevated autonomy.',
   1.75, 0.55, 'execute',  'controller', 45, 'two_tier',   FALSE),
  ('firm_managed',   'Firm-Managed',   'Outsourced bookkeeping firm operates on behalf of client. Firm-admin gating.',
   1.75, 0.55, 'execute',  'firm_admin', 45, 'three_tier', FALSE),
  ('high_risk',      'High-Risk',      'Elevated fraud posture. Tight thresholds, mandatory CFO review, cross-tenant intel opt-in.',
   1.25, 0.40, 'observe',  'cfo',        30, 'three_tier', TRUE)
ON CONFLICT (pack_code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.preset_pack_registry_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'preset_pack_registry is immutable; canonical seed rows cannot be modified';
END;
$$;

DROP TRIGGER IF EXISTS ppr_prevent_update ON public.preset_pack_registry;
CREATE TRIGGER ppr_prevent_update
  BEFORE UPDATE OR DELETE ON public.preset_pack_registry
  FOR EACH ROW EXECUTE FUNCTION public.preset_pack_registry_immutable();

-- 3. customer_pack_selections
CREATE TABLE IF NOT EXISTS public.customer_pack_selections (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                  UUID NOT NULL,
  firm_client_id           UUID NOT NULL,
  engagement_id            UUID NOT NULL,
  pack_code                TEXT NOT NULL REFERENCES public.preset_pack_registry(pack_code),
  overrides                JSONB NOT NULL DEFAULT '{}'::jsonb,
  selected_by_user_id      UUID NOT NULL,
  selected_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  deactivated_at           TIMESTAMPTZ,
  deactivated_by_user_id   UUID,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cps_one_active_per_firm
  ON public.customer_pack_selections (firm_id)
  WHERE deactivated_at IS NULL;

CREATE INDEX IF NOT EXISTS cps_firm_client_active_idx
  ON public.customer_pack_selections (firm_client_id, deactivated_at);

ALTER TABLE public.customer_pack_selections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cps_service_all ON public.customer_pack_selections;
CREATE POLICY cps_service_all ON public.customer_pack_selections FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS cps_firm_member_select ON public.customer_pack_selections;
CREATE POLICY cps_firm_member_select ON public.customer_pack_selections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm WHERE fm.firm_id = customer_pack_selections.firm_id AND fm.user_id = auth.uid()));

-- 4. observation_events (append-only feed)
CREATE TABLE IF NOT EXISTS public.observation_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               UUID NOT NULL,
  firm_client_id        UUID NOT NULL,
  engagement_id         UUID NOT NULL,
  source_layer          TEXT NOT NULL CHECK (source_layer IN ('L5','L6','L7','L8','L9','L11')),
  observation_type      TEXT NOT NULL CHECK (observation_type IN (
    'reviewer_approved','reviewer_rejected','override_applied',
    'false_positive_dismissed','false_negative_discovered','config_adjusted'
  )),
  target_setting        TEXT NOT NULL,
  observed_value        JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id         UUID,
  context_summary       JSONB NOT NULL DEFAULT '{}'::jsonb,
  causing_event_id      UUID,
  observed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS oe_firm_layer_idx ON public.observation_events (firm_id, source_layer, observed_at DESC);
CREATE INDEX IF NOT EXISTS oe_firm_setting_idx ON public.observation_events (firm_id, target_setting, observed_at DESC);

ALTER TABLE public.observation_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS oe_service_all ON public.observation_events;
CREATE POLICY oe_service_all ON public.observation_events FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS oe_firm_member_select ON public.observation_events;
CREATE POLICY oe_firm_member_select ON public.observation_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm WHERE fm.firm_id = observation_events.firm_id AND fm.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.observation_events_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'observation_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS oe_prevent_mutation ON public.observation_events;
CREATE TRIGGER oe_prevent_mutation
  BEFORE UPDATE OR DELETE ON public.observation_events
  FOR EACH ROW EXECUTE FUNCTION public.observation_events_immutable();

-- 5. drafted_amendments (proposals only — human approves)
CREATE TABLE IF NOT EXISTS public.drafted_amendments (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                        UUID NOT NULL,
  firm_client_id                 UUID NOT NULL,
  engagement_id                  UUID NOT NULL,
  target_setting                 TEXT NOT NULL,
  current_value                  JSONB NOT NULL,
  proposed_value                 JSONB NOT NULL,
  confidence_score               NUMERIC(4,3) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  reason_codes                   JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_summary               JSONB NOT NULL DEFAULT '{}'::jsonb,
  causing_observation_event_ids  UUID[] NOT NULL DEFAULT '{}',
  reviewer_role_slug             TEXT NOT NULL DEFAULT 'firm_admin',
  status                         TEXT NOT NULL DEFAULT 'drafted'
    CHECK (status IN ('drafted','applied','rejected','superseded')),
  drafted_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at                     TIMESTAMPTZ,
  applied_by_user_id             UUID,
  rejected_at                    TIMESTAMPTZ,
  rejected_by_user_id            UUID,
  rejected_reason                TEXT,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT da_terminal_consistency CHECK (
    (status = 'drafted'    AND applied_at IS NULL AND rejected_at IS NULL) OR
    (status = 'applied'    AND applied_at IS NOT NULL AND applied_by_user_id IS NOT NULL AND rejected_at IS NULL) OR
    (status = 'rejected'   AND rejected_at IS NOT NULL AND rejected_by_user_id IS NOT NULL AND rejected_reason IS NOT NULL AND applied_at IS NULL) OR
    (status = 'superseded' AND applied_at IS NULL AND rejected_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS da_firm_status_idx ON public.drafted_amendments (firm_id, status, drafted_at DESC);
CREATE INDEX IF NOT EXISTS da_firm_setting_idx ON public.drafted_amendments (firm_id, target_setting, drafted_at DESC);

ALTER TABLE public.drafted_amendments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS da_service_all ON public.drafted_amendments;
CREATE POLICY da_service_all ON public.drafted_amendments FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS da_firm_member_select ON public.drafted_amendments;
CREATE POLICY da_firm_member_select ON public.drafted_amendments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.firm_memberships fm WHERE fm.firm_id = drafted_amendments.firm_id AND fm.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.drafted_amendments_terminal_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('applied','rejected','superseded') THEN
    RAISE EXCEPTION 'drafted_amendments row in status % is immutable', OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS da_terminal_immutable ON public.drafted_amendments;
CREATE TRIGGER da_terminal_immutable
  BEFORE UPDATE ON public.drafted_amendments
  FOR EACH ROW EXECUTE FUNCTION public.drafted_amendments_terminal_immutable();

-- 6. Register 7 new Merkle-chained events
INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('ap_preset.pack_selected',        'user',   TRUE),
  ('ap_preset.pack_swapped',         'user',   TRUE),
  ('ap_preset.override_applied',     'user',   TRUE),
  ('ap_selfgov.observation_recorded','system', TRUE),
  ('ap_selfgov.amendment_drafted',   'system', TRUE),
  ('ap_selfgov.amendment_applied',   'user',   TRUE),
  ('ap_selfgov.amendment_rejected',  'user',   TRUE)
ON CONFLICT (event_type) DO NOTHING;

COMMENT ON TABLE public.preset_pack_registry IS
  'L12 canonical 5-pack seed. Immutable via trigger; new packs require additive migration.';
COMMENT ON TABLE public.customer_pack_selections IS
  'One active row per firm (partial unique index). Overrides preserved as JSONB without losing pack identity.';
COMMENT ON TABLE public.observation_events IS
  'L13 append-only observation feed. Consumed by synthesizer to draft governance amendments.';
COMMENT ON TABLE public.drafted_amendments IS
  'L13 proposed amendments. Never auto-applied — human authority is the only path from drafted → applied.';

COMMIT;
-- <<< end 20260717120000_d65_p2_block8b_presets_selfgov.sql

-- >>> begin 20260717130000_tcp1_w3_erp_connections_disconnected_at.sql
-- Phase TCP1 W3 — Add soft-delete support to erp_connections.
--
-- Context:
--   - accounting_connections has a `status` column (defaults 'connected')
--   - erp_connections has no status column — rows are implicitly "connected"
--     (the qbo_connections_unified view hardcodes status='connected')
--
-- To support user- and Intuit-initiated QuickBooks disconnect, we need
-- a way to mark erp_connections rows disconnected without deleting them
-- (audit trail, refund debugging, reconnect UX).
--
-- Strategy: additive, nullable timestamp column. NULL = connected. NOT NULL
-- = disconnected at that timestamp. View is updated to filter out
-- disconnected rows so downstream consumers see the same shape as before.

-- Step 1: add the column (idempotent)
DO $$
BEGIN
  IF to_regclass('public.erp_connections') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'erp_connections'
        AND column_name = 'disconnected_at'
    ) THEN
      ALTER TABLE public.erp_connections
        ADD COLUMN disconnected_at timestamptz NULL;
    END IF;
  END IF;
END $$;

-- Step 2: index for fast filter on the disconnect path
DO $$
BEGIN
  IF to_regclass('public.erp_connections') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS erp_connections_disconnected_at_idx
      ON public.erp_connections (disconnected_at)
      WHERE disconnected_at IS NOT NULL;
  END IF;
END $$;

-- Step 3: rewrite the unified view to hide disconnected rows.
-- Preserves the exact column shape from the original 20260708 migration.
DO $$
DECLARE
  base_sql text := $view$
    SELECT
      'accounting_connections'::text AS source_table,
      ac.id AS connection_id,
      ac.user_id,
      ac.access_token,
      ac.refresh_token,
      ac.tenant_or_realm_id AS realm_id,
      ac.token_expires_at AS token_expiry,
      ac.scopes AS granted_scopes,
      ac.status,
      ac.created_at,
      ac.updated_at
    FROM accounting_connections ac
    WHERE ac.provider = 'quickbooks'
      AND ac.status = 'connected'
  $view$;
  erp_sql text := $erp$
    UNION ALL
    SELECT
      'erp_connections'::text AS source_table,
      ec.id AS connection_id,
      ec.user_id,
      ec.access_token,
      ec.refresh_token,
      ec.realm_id,
      ec.token_expiry,
      ARRAY['com.intuit.quickbooks.accounting']::text[] AS granted_scopes,
      'connected'::text AS status,
      ec.created_at,
      ec.updated_at
    FROM erp_connections ec
    WHERE ec.platform = 'quickbooks'
      AND ec.disconnected_at IS NULL
  $erp$;
BEGIN
  IF to_regclass('public.erp_connections') IS NOT NULL THEN
    EXECUTE 'CREATE OR REPLACE VIEW qbo_connections_unified AS ' || base_sql || erp_sql;
  ELSE
    EXECUTE 'CREATE OR REPLACE VIEW qbo_connections_unified AS ' || base_sql;
  END IF;
END $$;
-- <<< end 20260717130000_tcp1_w3_erp_connections_disconnected_at.sql

-- >>> begin 20260718000000_intuit_webhook_events.sql
-- Issue #2 — Intuit QuickBooks webhook event log
--
-- Every notification received on /api/quickbooks/webhook is persisted here
-- BEFORE the 200 response is returned. This gives us:
--   1. A tamper-evident audit trail (required by Intuit App Store review).
--   2. Dedup by CloudEvents id (Intuit may retry).
--   3. A durable queue for async entity refetch (Issue #4 CDC cron reads this).
--   4. Forensic replay if a handler bug drops events.
--
-- Additive-only. Table + RLS + append-only trigger + dedup index. Idempotent.

-- =========================================================================
-- Step 1: table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.qbo_webhook_events (
  -- Local surrogate key
  id                bigserial PRIMARY KEY,

  -- CloudEvents envelope (Intuit fields)
  cloud_event_id    text        NOT NULL,   -- CloudEvents `id` — dedup key
  spec_version      text        NOT NULL,   -- always "1.0" today
  source            text        NULL,       -- CloudEvents `source` (opaque GUID)
  event_type        text        NOT NULL,   -- CloudEvents `type` — e.g. qbo.invoice.updated.v1
  event_time        timestamptz NOT NULL,   -- CloudEvents `time`
  intuit_entity_id  text        NOT NULL,   -- CloudEvents `intuitentityid`
  intuit_account_id text        NOT NULL,   -- CloudEvents `intuitaccountid` (realm id)

  -- Parsed convenience columns (derived from event_type)
  entity_name       text        NOT NULL,   -- e.g. "invoice", "customer"
  operation         text        NOT NULL,   -- e.g. "created", "updated", "deleted", "merged"

  -- Full payload for audit + replay
  data_payload      jsonb       NULL,       -- CloudEvents `data` object (may be empty)
  raw_body          text        NOT NULL,   -- exact bytes we signed against — DO NOT DROP

  -- Delivery metadata
  intuit_signature  text        NOT NULL,   -- raw header value (base64 hmac)
  received_at       timestamptz NOT NULL DEFAULT now(),

  -- Processing state (set by handlers; never mutated after processed_at is stamped)
  processed_at      timestamptz NULL,       -- NULL = handler has not yet run
  processed_status  text        NULL,       -- 'ok' | 'error' | 'skipped'
  processed_error   text        NULL,       -- stack/message if failed
  fetch_pending     boolean     NOT NULL DEFAULT true  -- Issue #4 CDC cron will flip to false after refetch
);

-- =========================================================================
-- Step 2: dedup — CloudEvents id must be unique
-- =========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS qbo_webhook_events_cloud_event_id_uidx
  ON public.qbo_webhook_events (cloud_event_id);

-- =========================================================================
-- Step 3: hot-path indexes
-- =========================================================================
CREATE INDEX IF NOT EXISTS qbo_webhook_events_realm_received_at_idx
  ON public.qbo_webhook_events (intuit_account_id, received_at DESC);

CREATE INDEX IF NOT EXISTS qbo_webhook_events_unprocessed_idx
  ON public.qbo_webhook_events (received_at)
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS qbo_webhook_events_fetch_pending_idx
  ON public.qbo_webhook_events (intuit_account_id, entity_name, intuit_entity_id)
  WHERE fetch_pending = true;

-- =========================================================================
-- Step 4: append-only enforcement
-- Immutable columns after insert. Only processing-state columns may mutate,
-- and only from NULL -> value (not value -> different value).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.qbo_webhook_events_enforce_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Immutable identity + payload columns
  IF NEW.cloud_event_id     IS DISTINCT FROM OLD.cloud_event_id     THEN RAISE EXCEPTION 'qbo_webhook_events.cloud_event_id is immutable'; END IF;
  IF NEW.spec_version       IS DISTINCT FROM OLD.spec_version       THEN RAISE EXCEPTION 'qbo_webhook_events.spec_version is immutable'; END IF;
  IF NEW.event_type         IS DISTINCT FROM OLD.event_type         THEN RAISE EXCEPTION 'qbo_webhook_events.event_type is immutable'; END IF;
  IF NEW.event_time         IS DISTINCT FROM OLD.event_time         THEN RAISE EXCEPTION 'qbo_webhook_events.event_time is immutable'; END IF;
  IF NEW.intuit_entity_id   IS DISTINCT FROM OLD.intuit_entity_id   THEN RAISE EXCEPTION 'qbo_webhook_events.intuit_entity_id is immutable'; END IF;
  IF NEW.intuit_account_id  IS DISTINCT FROM OLD.intuit_account_id  THEN RAISE EXCEPTION 'qbo_webhook_events.intuit_account_id is immutable'; END IF;
  IF NEW.entity_name        IS DISTINCT FROM OLD.entity_name        THEN RAISE EXCEPTION 'qbo_webhook_events.entity_name is immutable'; END IF;
  IF NEW.operation          IS DISTINCT FROM OLD.operation          THEN RAISE EXCEPTION 'qbo_webhook_events.operation is immutable'; END IF;
  IF NEW.raw_body           IS DISTINCT FROM OLD.raw_body           THEN RAISE EXCEPTION 'qbo_webhook_events.raw_body is immutable'; END IF;
  IF NEW.intuit_signature   IS DISTINCT FROM OLD.intuit_signature   THEN RAISE EXCEPTION 'qbo_webhook_events.intuit_signature is immutable'; END IF;
  IF NEW.received_at        IS DISTINCT FROM OLD.received_at        THEN RAISE EXCEPTION 'qbo_webhook_events.received_at is immutable'; END IF;

  -- data_payload is set at insert and never rewritten
  IF NEW.data_payload       IS DISTINCT FROM OLD.data_payload       THEN RAISE EXCEPTION 'qbo_webhook_events.data_payload is immutable'; END IF;

  -- processed_at, processed_status, processed_error — one-shot transitions
  IF OLD.processed_at IS NOT NULL AND NEW.processed_at IS DISTINCT FROM OLD.processed_at THEN
    RAISE EXCEPTION 'qbo_webhook_events.processed_at cannot be rewritten once set';
  END IF;
  IF OLD.processed_status IS NOT NULL AND NEW.processed_status IS DISTINCT FROM OLD.processed_status THEN
    RAISE EXCEPTION 'qbo_webhook_events.processed_status cannot be rewritten once set';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS qbo_webhook_events_append_only_trg ON public.qbo_webhook_events;
CREATE TRIGGER qbo_webhook_events_append_only_trg
  BEFORE UPDATE ON public.qbo_webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION public.qbo_webhook_events_enforce_append_only();

-- Also block deletes at the trigger level (RLS is separate belt).
CREATE OR REPLACE FUNCTION public.qbo_webhook_events_block_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'qbo_webhook_events rows are immutable and cannot be deleted';
END;
$$;

DROP TRIGGER IF EXISTS qbo_webhook_events_block_delete_trg ON public.qbo_webhook_events;
CREATE TRIGGER qbo_webhook_events_block_delete_trg
  BEFORE DELETE ON public.qbo_webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION public.qbo_webhook_events_block_delete();

-- =========================================================================
-- Step 5: RLS — no anon, no authenticated. Only service_role writes/reads.
-- =========================================================================
ALTER TABLE public.qbo_webhook_events ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies idempotently
DROP POLICY IF EXISTS qbo_webhook_events_service_role_all ON public.qbo_webhook_events;
CREATE POLICY qbo_webhook_events_service_role_all
  ON public.qbo_webhook_events
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny everything to anon and authenticated by default (no policy => no access under RLS).
-- We intentionally do NOT create any policy for anon or authenticated.

-- =========================================================================
-- Step 6: revoke any default grants
-- =========================================================================
REVOKE ALL ON public.qbo_webhook_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.qbo_webhook_events TO service_role;
-- <<< end 20260718000000_intuit_webhook_events.sql

-- >>> begin 20260718010000_mc1_home_currency.sql
-- Phase MC-1 — Capture QBO home currency on accounting_connections.
--
-- Context:
--   - Issue #6 (multicurrency compliance). Gap DB-1: there is nowhere to
--     durably record a connected company's home currency (ISO 4217).
--   - accounting_connections already has a jsonb metadata_json column, but
--     home_currency is queried/labelled frequently, so it is added as a
--     first-class, nullable column. NULL = not yet captured (older rows).
--
-- Strategy: additive, nullable text column. Idempotent via DO block +
-- information_schema guard. No data is dropped or altered destructively.

DO $$
BEGIN
  IF to_regclass('public.accounting_connections') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'accounting_connections'
        AND column_name = 'home_currency'
    ) THEN
      ALTER TABLE public.accounting_connections
        ADD COLUMN home_currency text NULL;
    END IF;
  END IF;
END $$;

COMMENT ON COLUMN public.accounting_connections.home_currency IS
  'ISO 4217 home currency captured from QBO Preferences.CurrencyPrefs.HomeCurrency (or inferred from CompanyInfo.Country). NULL = not yet captured. Added Phase MC-1 (Issue #6).';
-- <<< end 20260718010000_mc1_home_currency.sql

-- >>> begin 20260718020000_mc3_je_posting_audit_currency.sql
-- Phase MC-3 (Issue #6, Gap X-1) — Persist currency + exchange rate on je_posting_audit.
--
-- Context:
--   - je_posting_audit currently has no columns to record which currency each
--     JE hit QBO with, nor the ExchangeRate QBO stamped. This blocks MC-3
--     forensics ("did we post this in the right currency?") and future
--     currency-aware reporting.
--
-- Strategy: additive nullable columns only. Historic rows keep NULL.
-- All post-MC-3 attempts always populate. Idempotent via DO blocks.
-- No CHECK constraint on currency (validated at write path, not schema).

DO $$
BEGIN
  IF to_regclass('public.je_posting_audit') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'je_posting_audit'
        AND column_name = 'currency'
    ) THEN
      ALTER TABLE public.je_posting_audit ADD COLUMN currency text NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'je_posting_audit'
        AND column_name = 'exchange_rate'
    ) THEN
      ALTER TABLE public.je_posting_audit ADD COLUMN exchange_rate numeric(18,6) NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'je_posting_audit'
        AND column_name = 'home_currency_at_post'
    ) THEN
      ALTER TABLE public.je_posting_audit ADD COLUMN home_currency_at_post text NULL;
    END IF;
  END IF;
END $$;

COMMENT ON COLUMN public.je_posting_audit.currency IS
  'ISO 4217 transaction currency emitted as CurrencyRef.value on the QBO POST. NULL = pre-MC-3 historic row. Added Phase MC-3 (Issue #6, Gap X-1).';
COMMENT ON COLUMN public.je_posting_audit.exchange_rate IS
  'QBO ExchangeRate stamped on the JournalEntry. 1.0 for home-currency posts. Fetched from /exchangerate as-of transaction_date for foreign currency. NULL = pre-MC-3 historic row.';
COMMENT ON COLUMN public.je_posting_audit.home_currency_at_post IS
  'Snapshot of accounting_connections.home_currency at post time. Denormalized so future changes to the tenant home currency do not invalidate this audit row. NULL = pre-MC-3 historic row.';
-- <<< end 20260718020000_mc3_je_posting_audit_currency.sql

-- >>> begin 20260718030000_mc4c_payment_batch_lines_currency.sql
-- Phase MC-4c (Issue #6, Gap C-3): payment_batch_lines currency dimension.
--
-- Additive column. Nullable during rollout so historic pre-MC-4c batch lines
-- remain readable. A follow-up MC-5 track will backfill + NOT NULL enforce
-- once every live batch has been re-emitted through the currency-aware path.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_batch_lines'
      AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.payment_batch_lines
      ADD COLUMN currency text NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.payment_batch_lines.currency IS
  'ISO 4217 currency code of the line. Must equal the parent payment_batches.currency at write time. Nullable during MC-4c rollout; NOT NULL enforced in MC-5.';
-- <<< end 20260718030000_mc4c_payment_batch_lines_currency.sql

-- >>> begin 20260718040000_q7_qbo_edition.sql
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
-- <<< end 20260718040000_q7_qbo_edition.sql

-- >>> begin 20260718200000_support_ticket_intuit_context.sql
-- Phase Intuit Support Wiring — Block 2
-- Additive-only. Idempotent. Safe to re-run.
--
-- Purpose:
--   Enrich support_tickets with the QBO context Intuit's support team needs
--   to trace a customer's report back to their Intuit logs — realm_id and
--   the most recent intuit_tid we saw for that customer, plus a correlation
--   ID that appears in every email touching this ticket.
--
--   Also create qbo_recent_intuit_tid — a short-TTL server-side cache so
--   the ticket POST can resolve "what was the last tid this user's QBO
--   requests returned?" in O(1) without a cross-table scan.

DO $$
BEGIN
  IF to_regclass('public.support_tickets') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'support_tickets'
        AND column_name = 'qbo_realm_id'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN qbo_realm_id text NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'support_tickets'
        AND column_name = 'last_intuit_tid'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN last_intuit_tid text NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'support_tickets'
        AND column_name = 'workflow_context'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN workflow_context jsonb NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'support_tickets'
        AND column_name = 'correlation_id'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN correlation_id text NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS support_tickets_correlation_id_idx
      ON public.support_tickets (correlation_id) WHERE correlation_id IS NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.support_tickets.qbo_realm_id IS
  'QBO realm_id of the customer''s active QuickBooks Online connection at ticket submit time. NULL when the customer has no connected QBO company. Added Intuit Support Wiring Block 2.';
COMMENT ON COLUMN public.support_tickets.last_intuit_tid IS
  'Most recent intuit_tid seen for this user from any QBO API call in the 24 hours before ticket submit. NULL when no recent Intuit API activity or no QBO connection. Added Intuit Support Wiring Block 2.';
COMMENT ON COLUMN public.support_tickets.workflow_context IS
  'jsonb blob describing what the customer was doing when they submitted (URL path, referrer, any app-surfaced error). Added Intuit Support Wiring Block 2.';
COMMENT ON COLUMN public.support_tickets.correlation_id IS
  'UUID stamped on both support notification and customer confirmation emails so the customer can reference this ticket unambiguously in follow-ups. Added Intuit Support Wiring Block 2.';

CREATE TABLE IF NOT EXISTS public.qbo_recent_intuit_tid (
  user_id      uuid        NOT NULL,
  realm_id     text        NOT NULL,
  intuit_tid   text        NOT NULL,
  endpoint     text        NULL,
  status_code  integer     NULL,
  captured_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, realm_id)
);

CREATE INDEX IF NOT EXISTS qbo_recent_intuit_tid_user_captured_idx
  ON public.qbo_recent_intuit_tid (user_id, captured_at DESC);

COMMENT ON TABLE public.qbo_recent_intuit_tid IS
  'Short-TTL per-(user,realm) cache of the last intuit_tid seen from any QBO API response. Used at support-ticket submit time to enrich the ticket with a traceable Intuit request identifier. Rows older than 24 hours can be swept by future cleanup cron. Added Intuit Support Wiring Block 2.';

ALTER TABLE public.qbo_recent_intuit_tid ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.qbo_recent_intuit_tid;
CREATE POLICY "service_role_all" ON public.qbo_recent_intuit_tid
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.qbo_recent_intuit_tid FROM anon, authenticated;
GRANT ALL ON public.qbo_recent_intuit_tid TO service_role;
-- <<< end 20260718200000_support_ticket_intuit_context.sql

-- >>> begin 20260719000000_support_auto_file_engine.sql
-- Phase Intuit Support Wiring — Block 2.5
-- Additive-only. Idempotent. Safe to re-run.
--
-- Purpose:
--   Extend support_tickets with auto-file fingerprint state, add
--   support_error_circuit for global class-level circuit breaking,
--   and permit two new ticket_type values on the app side.

DO $$
BEGIN
  IF to_regclass('public.support_tickets') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='support_tickets' AND column_name='auto_filed'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN auto_filed boolean NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='support_tickets' AND column_name='auto_file_dedupe_key'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN auto_file_dedupe_key text NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='support_tickets' AND column_name='auto_file_count'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN auto_file_count integer NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='support_tickets' AND column_name='error_class'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN error_class text NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='support_tickets' AND column_name='parent_ticket_id'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN parent_ticket_id uuid NULL
        REFERENCES public.support_tickets(id) ON DELETE SET NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS support_tickets_auto_file_dedupe_key_open_idx
      ON public.support_tickets (auto_file_dedupe_key)
      WHERE auto_filed = true AND status != 'closed';

    CREATE INDEX IF NOT EXISTS support_tickets_parent_ticket_id_idx
      ON public.support_tickets (parent_ticket_id) WHERE parent_ticket_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS support_tickets_user_auto_filed_created_idx
      ON public.support_tickets (user_id, created_at DESC)
      WHERE auto_filed = true;
  END IF;
END $$;

COMMENT ON COLUMN public.support_tickets.auto_filed IS
  'True when this ticket was opened automatically by the auto-file engine rather than by the customer. Added Support Wiring Block 2.5.';
COMMENT ON COLUMN public.support_tickets.auto_file_dedupe_key IS
  'sha256(user_id + error_class + normalized_endpoint + realm_id). Auto-file engine collapses repeat occurrences of the same failure fingerprint into a single ticket within an adaptive window. Added Support Wiring Block 2.5.';
COMMENT ON COLUMN public.support_tickets.auto_file_count IS
  'Occurrence count within the current dedup window. Incremented each time the same fingerprint fires while the ticket is still open. Added Support Wiring Block 2.5.';
COMMENT ON COLUMN public.support_tickets.error_class IS
  'Canonical error taxonomy value (e.g. qbo.auth.token_expired). Set on auto-filed tickets. Added Support Wiring Block 2.5.';
COMMENT ON COLUMN public.support_tickets.parent_ticket_id IS
  'For customer-submitted tickets that were prefilled based on a recent auto-filed ticket, points at that parent so support triage sees the full thread. Added Support Wiring Block 2.5.';

CREATE TABLE IF NOT EXISTS public.support_error_circuit (
  error_class      text        PRIMARY KEY,
  window_start     timestamptz NOT NULL DEFAULT now(),
  occurrence_count integer     NOT NULL DEFAULT 0,
  tripped_at       timestamptz NULL,
  tripped_until    timestamptz NULL,
  last_updated     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.support_error_circuit IS
  'Global circuit-breaker state per error class. When a class fires >100x in 15 min, the engine trips it for 30 min to protect the support inbox from platform-wide incidents. Added Support Wiring Block 2.5.';

ALTER TABLE public.support_error_circuit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.support_error_circuit;
CREATE POLICY "service_role_all" ON public.support_error_circuit
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.support_error_circuit FROM anon, authenticated;
GRANT ALL ON public.support_error_circuit TO service_role;
-- <<< end 20260719000000_support_auto_file_engine.sql

-- >>> begin 20260719050000_gap3_je_approval_flow.sql
-- Gap 3 — JE approval flow. Additive-only extension of D6.4c-1 pre_close_review_items
-- + D6.4c-3 engagement_posting_policy. Adds proposer/approver identity, materiality
-- classification (with per-engagement overrides), SoD trigger, MFA step-up gate,
-- customer-adjustable autonomous-posting toggle, and Intuit support-log trace table.

begin;

-- ============================================================
-- 1. New columns on pre_close_review_items
-- ============================================================
alter table public.pre_close_review_items
  add column if not exists proposed_by_user_id      uuid null references auth.users(id) on delete set null,
  add column if not exists proposed_by_actor_type   text null check (proposed_by_actor_type in ('user','ai_agent','system','rule_engine')),
  add column if not exists approved_by_user_id      uuid null references auth.users(id) on delete set null,
  add column if not exists materiality_bucket       text null check (materiality_bucket in ('low','medium','high')),
  add column if not exists requires_mfa_step_up     boolean not null default false,
  add column if not exists mfa_step_up_verified_at  timestamptz null,
  add column if not exists mfa_step_up_method       text null check (mfa_step_up_method in ('totp','webauthn')),
  add column if not exists sod_check_passed_at      timestamptz null,
  add column if not exists gap3_grandfathered       boolean not null default false,
  add column if not exists autonomous_lane          boolean not null default false;

comment on column public.pre_close_review_items.autonomous_lane is
  'Gap 3: true if this row entered the autonomous-posting lane per engagement_posting_policy.autonomous_posting_enabled. Preserves shipped D6.4c behavior for the engagement; still generates evidence + backup packet.';

-- ============================================================
-- 2. Per-engagement materiality overrides + autonomous toggle on engagement_posting_policy
-- ============================================================
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'engagement_posting_policy') then
    alter table public.engagement_posting_policy
      add column if not exists materiality_low_max_cents      bigint null check (materiality_low_max_cents is null or materiality_low_max_cents >= 0),
      add column if not exists materiality_medium_max_cents   bigint null check (materiality_medium_max_cents is null or materiality_medium_max_cents >= 0),
      add column if not exists materiality_high_requires_mfa  boolean null,
      add column if not exists autonomous_posting_enabled     boolean not null default false,
      add column if not exists autonomous_max_bucket          text null check (autonomous_max_bucket is null or autonomous_max_bucket in ('low','medium','high'));

    comment on column public.engagement_posting_policy.materiality_low_max_cents is
      'Gap 3: per-engagement override for low bucket ceiling. NULL = platform default (100000 = $1000).';
    comment on column public.engagement_posting_policy.materiality_medium_max_cents is
      'Gap 3: per-engagement override for medium bucket ceiling. NULL = platform default (1000000 = $10000).';
    comment on column public.engagement_posting_policy.materiality_high_requires_mfa is
      'Gap 3: per-engagement override for whether high-materiality requires MFA step-up. NULL = platform default (true).';
    comment on column public.engagement_posting_policy.autonomous_posting_enabled is
      'Gap 3: opt-in autonomous-posting lane. When true, system-proposed JEs post under shipped D6.4c controls without requiring a paired approved review_item_id. Firm admin must explicitly enable per engagement. Defaults false to preserve current behavior.';
    comment on column public.engagement_posting_policy.autonomous_max_bucket is
      'Gap 3: maximum materiality bucket eligible for autonomous posting. NULL when autonomous_posting_enabled=false. When true, capped to low or medium; high always requires human approval.';

    if not exists (select 1 from pg_constraint where conname = 'engagement_posting_policy_autonomous_bucket_cap') then
      alter table public.engagement_posting_policy
        add constraint engagement_posting_policy_autonomous_bucket_cap
        check (autonomous_max_bucket is null or autonomous_max_bucket in ('low','medium'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'engagement_posting_policy_autonomous_bucket_required') then
      alter table public.engagement_posting_policy
        add constraint engagement_posting_policy_autonomous_bucket_required
        check (autonomous_posting_enabled = false or autonomous_max_bucket is not null);
    end if;
  end if;
end
$$;

-- ============================================================
-- 3. Materiality classifier — per-engagement + platform defaults
-- ============================================================
create or replace function public.gap3_materiality_bucket(
  total_debit_cents bigint,
  engagement_id_arg uuid default null
)
returns text
language plpgsql
stable
parallel safe
set search_path = public
as $$
declare
  low_max      bigint := 100000;    -- $1000 default
  med_max      bigint := 1000000;   -- $10000 default
begin
  if total_debit_cents is null then
    return null;
  end if;

  if engagement_id_arg is not null then
    select coalesce(materiality_low_max_cents,    low_max),
           coalesce(materiality_medium_max_cents, med_max)
      into low_max, med_max
      from public.engagement_posting_policy
     where engagement_id = engagement_id_arg;
  end if;

  return case
    when total_debit_cents <= low_max then 'low'
    when total_debit_cents <= med_max then 'medium'
    else 'high'
  end;
end
$$;

comment on function public.gap3_materiality_bucket(bigint, uuid) is
  'Gap 3: bucket JE by total debits. Resolves per-engagement thresholds first, falls back to $1K/$10K platform defaults.';

-- ============================================================
-- 4. Compute materiality + requires_mfa_step_up on INSERT
-- ============================================================
create or replace function public.gap3_pre_close_ri_materiality_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  requires_mfa_default boolean := true;
begin
  new.materiality_bucket := public.gap3_materiality_bucket(
    new.je_draft_total_debit_cents,
    new.engagement_id
  );

  select coalesce(materiality_high_requires_mfa, true)
    into requires_mfa_default
    from public.engagement_posting_policy
   where engagement_id = new.engagement_id;

  new.requires_mfa_step_up := (new.materiality_bucket = 'high' and coalesce(requires_mfa_default, true));
  return new;
end
$$;

drop trigger if exists gap3_pre_close_ri_materiality on public.pre_close_review_items;
create trigger gap3_pre_close_ri_materiality
  before insert on public.pre_close_review_items
  for each row
  execute function public.gap3_pre_close_ri_materiality_before_insert();

-- ============================================================
-- 5. SoD hard-block + MFA gate on UPDATE
-- ============================================================
create or replace function public.gap3_pre_close_ri_sod_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.decision in ('approved','edit_and_approved')
     and (old.decision is distinct from new.decision) then

    if coalesce(new.autonomous_lane, false) = false
       and coalesce(new.gap3_grandfathered, false) = false then

      if new.proposed_by_user_id is not null
         and new.approved_by_user_id is not null
         and new.proposed_by_user_id = new.approved_by_user_id then
        raise exception 'gap3_sod_violation: proposer (%) and approver (%) must differ',
          new.proposed_by_user_id, new.approved_by_user_id
          using errcode = 'check_violation';
      end if;
    end if;

    if new.requires_mfa_step_up = true
       and new.mfa_step_up_verified_at is null
       and coalesce(new.gap3_grandfathered, false) = false
       and coalesce(new.autonomous_lane, false) = false then
      raise exception 'gap3_mfa_step_up_required: materiality=high requires fresh MFA verification'
        using errcode = 'check_violation';
    end if;

    new.sod_check_passed_at := now();
  end if;

  return new;
end
$$;

drop trigger if exists gap3_pre_close_ri_sod on public.pre_close_review_items;
create trigger gap3_pre_close_ri_sod
  before update on public.pre_close_review_items
  for each row
  execute function public.gap3_pre_close_ri_sod_before_update();

-- ============================================================
-- 6. Backfill grandfathered flag on existing rows
-- ============================================================
update public.pre_close_review_items
   set gap3_grandfathered = true,
       materiality_bucket = coalesce(materiality_bucket, public.gap3_materiality_bucket(je_draft_total_debit_cents, engagement_id))
 where materiality_bucket is null;

-- ============================================================
-- 7. Extend ai_action_log action_category with Gap 3 event types
-- ============================================================
do $$
begin
  alter table public.ai_action_log
    drop constraint if exists ai_action_log_action_category_check;
  alter table public.ai_action_log
    add constraint ai_action_log_action_category_check
    check (action_category in (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change',
      'assertion_coverage_scan','assertion_gap_reasoning',
      'visual_fingerprint','vendor_resolution',
      'bank_change_detection','quarantine_gate_evaluation',
      'duplicate_detection',
      'statistical_anomaly_detection','fraud_score_aggregation',
      'gap3_approval','gap3_sod_violation','gap3_mfa_step_up','gap3_grandfathered_approval',
      'gap3_autonomous_post','gap3_client_je_report','qbo_api_trace'
    ));
end
$$;

-- ============================================================
-- 8. Approval bundle view (POST-endpoint gate reads this)
-- ============================================================
create or replace view public.v_pre_close_approval_bundle
with (security_invoker=true)
as
select
  ri.id                          as review_item_id,
  ri.firm_client_id,
  ri.engagement_id,
  ri.decision,
  ri.decision_at,
  ri.proposed_by_user_id,
  ri.approved_by_user_id,
  ri.materiality_bucket,
  ri.requires_mfa_step_up,
  ri.mfa_step_up_verified_at,
  ri.mfa_step_up_method,
  ri.sod_check_passed_at,
  ri.je_draft_total_debit_cents,
  ri.je_draft_total_credit_cents,
  ri.gap3_grandfathered,
  ri.autonomous_lane,
  ri.posted_je_attempt_id,
  epp.autonomous_posting_enabled,
  epp.autonomous_max_bucket
from public.pre_close_review_items ri
left join public.engagement_posting_policy epp
  on epp.engagement_id = ri.engagement_id;

comment on view public.v_pre_close_approval_bundle is
  'Gap 3: canonical bundle exposed to POST-endpoint approval gate. security_invoker=true so caller RLS applies.';

-- ============================================================
-- 9. Client-facing posted-JE report view (wires shipped D6.4a + D6.4d)
-- ============================================================
create or replace view public.v_client_posted_je_report
with (security_invoker=true)
as
select
  jpa.attempt_id                as je_attempt_id,
  jpa.firm_client_id,
  jpa.qbo_je_id,
  jpa.status,
  coalesce(jpa.updated_at, jpa.created_at) as posted_at,
  audit.posted_by,
  audit.posted_by_user_id,
  audit.source_type,
  audit.source_id,
  ri.id                         as review_item_id,
  ri.engagement_id,
  ri.materiality_bucket,
  ri.autonomous_lane,
  ri.approved_by_user_id,
  ri.decision_at                as approved_at,
  ri.rule_reason_code,
  ri.rule_reason_detail,
  jbp.packet_id                 as backup_packet_id,
  jbp.storage_path              as backup_packet_storage_path,
  jbp.sha256                    as backup_packet_sha256,
  jbp.byte_size                 as backup_packet_byte_size,
  (
    select count(*)::int
      from public.je_line_evidence e
     where e.attempt_id = jpa.attempt_id
  )                             as evidence_line_count,
  (
    select count(*)::int
      from public.je_line_attachments a
     where a.attempt_id = jpa.attempt_id
  )                             as attachment_count
from public.je_post_attempts jpa
left join lateral (
  select a.posted_by, a.posted_by_user_id, a.source_type, a.source_id
    from public.je_posting_audit a
   where a.attempt_id = jpa.attempt_id
   order by a.created_at desc
   limit 1
) audit on true
left join public.pre_close_review_items ri
  on ri.posted_je_attempt_id = jpa.attempt_id
left join public.je_backup_packets jbp
  on jbp.attempt_id = jpa.attempt_id;

comment on view public.v_client_posted_je_report is
  'Gap 3: client-facing posted-JE report. Joins JE post attempts to their approval record, materiality, backup packet, and evidence counts.';

-- ============================================================
-- 10. QBO API trace log (Intuit support-log requirement)
-- ============================================================
create table if not exists public.qbo_api_trace (
  trace_id           uuid primary key default gen_random_uuid(),
  firm_client_id     uuid not null,
  realm_id           text null,
  endpoint           text not null,
  http_method        text not null check (http_method in ('GET','POST','PUT','DELETE','PATCH')),
  http_status        integer null,
  intuit_tid         text null,
  request_id         text null,
  latency_ms         integer null,
  error_code         text null,
  error_message      text null,
  correlation_id     uuid null,
  attempted_at       timestamptz not null default now(),
  expires_at         timestamptz not null default (now() + interval '7 days')
);

create index if not exists qbo_api_trace_firm_client_idx
  on public.qbo_api_trace (firm_client_id, attempted_at desc);
create index if not exists qbo_api_trace_intuit_tid_idx
  on public.qbo_api_trace (intuit_tid)
  where intuit_tid is not null;
create index if not exists qbo_api_trace_expires_idx
  on public.qbo_api_trace (expires_at);

comment on table public.qbo_api_trace is
  'Gap 3: 7-day rolling trace of QBO API calls for Intuit support handoff. Metadata only (no request/response bodies).';

alter table public.qbo_api_trace enable row level security;

drop policy if exists "deny_all_client_access_qbo_api_trace" on public.qbo_api_trace;
create policy "deny_all_client_access_qbo_api_trace"
  on public.qbo_api_trace
  as restrictive
  for all
  to authenticated, anon
  using (false)
  with check (false);

-- ============================================================
-- 11. Indexes for approval + client-report queries
-- ============================================================
create index if not exists idx_pre_close_ri_pending_approval
  on public.pre_close_review_items (engagement_id, materiality_bucket, created_at desc)
  where decision is null;

create index if not exists idx_pre_close_ri_posted_by_client
  on public.pre_close_review_items (firm_client_id, decision_at desc)
  where posted_je_attempt_id is not null;

commit;
-- <<< end 20260719050000_gap3_je_approval_flow.sql

-- >>> begin 20260719060000_gap2_subscription_lifecycle_purge.sql
-- Gap 2 — Subscription lifecycle purge (30d grace + cascade + audit)
-- Additive-only. Registry supports firm_id / firm_client_id / engagement_id /
-- user_via_membership / subscription_via_subscriber scopes (repo schema reality).

begin;

-- ============================================================================
-- 1. subscription_purge_schedule
-- ============================================================================
create table if not exists public.subscription_purge_schedule (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid references public.firms(id) on delete set null,
  subscription_id uuid null,
  stripe_subscription_id text,
  stripe_customer_id text,
  scheduled_at timestamptz not null default now(),
  grace_until timestamptz not null,
  execution_started_at timestamptz,
  execution_completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  status text not null default 'scheduled' check (
    status in ('scheduled', 'executing', 'completed', 'cancelled', 'failed')
  ),
  reason text not null,
  triggered_by_user_id uuid,
  triggered_by_stripe_event_id text,
  notification_sent_at timestamptz,
  notification_recipient text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscription_purge_schedule_firm_idx
  on public.subscription_purge_schedule (firm_id);
create index if not exists subscription_purge_schedule_grace_until_idx
  on public.subscription_purge_schedule (grace_until)
  where status = 'scheduled';
create index if not exists subscription_purge_schedule_status_idx
  on public.subscription_purge_schedule (status);

alter table public.subscription_purge_schedule enable row level security;

drop policy if exists subscription_purge_schedule_service_role_all on public.subscription_purge_schedule;
create policy subscription_purge_schedule_service_role_all
  on public.subscription_purge_schedule
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists subscription_purge_schedule_firm_admin_read on public.subscription_purge_schedule;
create policy subscription_purge_schedule_firm_admin_read
  on public.subscription_purge_schedule
  for select
  to authenticated
  using (
    firm_id in (
      select fm.firm_id from public.firm_memberships fm
      where fm.user_id = (select auth.uid())
        and fm.role in ('firm_admin', 'controller', 'fractional_cfo')
        and fm.status = 'active'
    )
    or firm_id in (
      select f.id from public.firms f
      where f.owner_user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 2. subscription_purge_audit — append-only
-- ============================================================================
create table if not exists public.subscription_purge_audit (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references public.subscription_purge_schedule(id) on delete set null,
  firm_id uuid,
  event_type text not null check (event_type in (
    'purge_scheduled',
    'notification_sent',
    'reactivated_within_grace',
    'purge_started',
    'table_purged',
    'purge_completed',
    'purge_failed',
    'admin_override',
    'grace_extended',
    'legal_hold_applied'
  )),
  table_name text,
  rows_deleted integer,
  actor_user_id uuid,
  actor_type text not null check (actor_type in ('system_cron', 'stripe_webhook', 'user', 'super_admin')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists subscription_purge_audit_schedule_idx
  on public.subscription_purge_audit (schedule_id);
create index if not exists subscription_purge_audit_firm_idx
  on public.subscription_purge_audit (firm_id);
create index if not exists subscription_purge_audit_created_at_idx
  on public.subscription_purge_audit (created_at desc);

alter table public.subscription_purge_audit enable row level security;

drop policy if exists subscription_purge_audit_service_role_all on public.subscription_purge_audit;
create policy subscription_purge_audit_service_role_all
  on public.subscription_purge_audit
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.gap2_audit_append_only()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  raise exception 'subscription_purge_audit is append-only — % rejected', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists gap2_audit_no_update on public.subscription_purge_audit;
create trigger gap2_audit_no_update
  before update on public.subscription_purge_audit
  for each row execute function public.gap2_audit_append_only();

drop trigger if exists gap2_audit_no_delete on public.subscription_purge_audit;
create trigger gap2_audit_no_delete
  before delete on public.subscription_purge_audit
  for each row execute function public.gap2_audit_append_only();

-- ============================================================================
-- 3. Purge tracking columns on firms
-- ============================================================================
alter table public.firms
  add column if not exists purge_scheduled_at timestamptz,
  add column if not exists purge_grace_until timestamptz,
  add column if not exists purge_completed_at timestamptz,
  add column if not exists purge_schedule_id uuid,
  add column if not exists legal_hold_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'firms_purge_schedule_id_fkey'
  ) then
    alter table public.firms
      add constraint firms_purge_schedule_id_fkey
      foreign key (purge_schedule_id)
      references public.subscription_purge_schedule(id)
      on delete set null;
  end if;
end
$$;

create index if not exists firms_purge_grace_until_idx
  on public.firms (purge_grace_until)
  where purge_scheduled_at is not null and purge_completed_at is null;

-- ============================================================================
-- 4. Customer-initiated purge tokens (24h, hashed)
-- ============================================================================
create table if not exists public.gap2_purge_tokens (
  token_hash text primary key,
  firm_id uuid not null references public.firms(id) on delete cascade,
  requested_by_user_id uuid not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.gap2_purge_tokens enable row level security;

drop policy if exists gap2_purge_tokens_service_role on public.gap2_purge_tokens;
create policy gap2_purge_tokens_service_role
  on public.gap2_purge_tokens
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- 5. Registry of customer-scoped tables
-- ============================================================================
create table if not exists public.gap2_purge_table_registry (
  id serial primary key,
  table_name text not null unique,
  scope_kind text not null check (scope_kind in (
    'firm_id',
    'firm_pk',
    'firm_client_id',
    'engagement_id',
    'user_via_membership',
    'subscription_via_subscriber'
  )),
  scope_column text not null,
  delete_order integer not null,
  notes text,
  active boolean not null default true,
  added_at timestamptz not null default now()
);

insert into public.gap2_purge_table_registry (table_name, scope_kind, scope_column, delete_order, notes)
values
  ('je_line_attachments',        'firm_client_id', 'firm_client_id', 10,  'D6.4a evidence attachments'),
  ('je_line_evidence',           'firm_client_id', 'firm_client_id', 11,  'D6.4a evidence links'),
  ('je_backup_packets',          'firm_client_id', 'firm_client_id', 12,  'D6.4a/d backup packets'),
  ('qbo_api_trace',              'firm_client_id', 'firm_client_id', 15,  'Gap 3 QBO trace'),
  ('je_posting_audit',           'firm_client_id', 'firm_client_id', 20,  'JE posting audit'),
  ('je_post_attempts',           'firm_client_id', 'firm_client_id', 21,  'JE post attempts'),
  ('pre_close_review_items',     'firm_client_id', 'firm_client_id', 25,  'Review queue items'),
  ('engagement_posting_policy',  'engagement_id',  'engagement_id',  90,  'Gap 3 posting policy'),
  ('engagements',                'firm_id',        'firm_id',        100, 'Engagements'),
  ('mfa_trusted_devices',        'user_via_membership', 'user_id',   110, 'Gap 1b trusted devices'),
  ('user_webauthn_credentials',  'user_via_membership', 'user_id',   111, 'Gap 1b passkeys'),
  ('subscription_items',         'subscription_via_subscriber', 'subscription_id', 200, 'Subscription line items'),
  ('subscriptions',              'subscription_via_subscriber', 'subscriber_id', 201, 'Subscriptions (firm)'),
  ('firm_memberships',           'firm_id',        'firm_id',        210, 'Firm memberships'),
  ('firm_clients',               'firm_id',        'firm_id',        220, 'Firm client records'),
  ('firms',                      'firm_pk',        'id',             999, 'Firm root (last)')
on conflict (table_name) do nothing;

-- ============================================================================
-- 6. gap2_schedule_purge
-- ============================================================================
create or replace function public.gap2_schedule_purge(
  p_firm_id uuid,
  p_subscription_id uuid,
  p_stripe_subscription_id text,
  p_stripe_customer_id text,
  p_reason text,
  p_triggered_by_user_id uuid default null,
  p_triggered_by_stripe_event_id text default null,
  p_grace_days integer default 30
)
  returns uuid
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_schedule_id uuid;
  v_grace_until timestamptz;
begin
  if exists (select 1 from public.firms where id = p_firm_id and legal_hold_reason is not null) then
    insert into public.subscription_purge_audit (
      firm_id, event_type, actor_type, details
    ) values (
      p_firm_id, 'legal_hold_applied', 'stripe_webhook',
      jsonb_build_object('attempted_reason', p_reason, 'blocked', true)
    );
    return null;
  end if;

  -- Idempotency: reuse existing scheduled row
  select id into v_schedule_id
    from public.subscription_purge_schedule
   where firm_id = p_firm_id and status = 'scheduled'
   order by scheduled_at desc
   limit 1;
  if v_schedule_id is not null then
    return v_schedule_id;
  end if;

  v_grace_until := now() + (p_grace_days || ' days')::interval;

  insert into public.subscription_purge_schedule (
    firm_id, subscription_id, stripe_subscription_id, stripe_customer_id,
    grace_until, reason, triggered_by_user_id, triggered_by_stripe_event_id
  ) values (
    p_firm_id, p_subscription_id, p_stripe_subscription_id, p_stripe_customer_id,
    v_grace_until, p_reason, p_triggered_by_user_id, p_triggered_by_stripe_event_id
  )
  returning id into v_schedule_id;

  update public.firms
     set purge_scheduled_at = now(),
         purge_grace_until = v_grace_until,
         purge_schedule_id = v_schedule_id,
         updated_at = now()
   where id = p_firm_id;

  insert into public.subscription_purge_audit (
    schedule_id, firm_id, event_type, actor_type, actor_user_id, details
  ) values (
    v_schedule_id, p_firm_id, 'purge_scheduled',
    case when p_triggered_by_user_id is not null then 'user' else 'stripe_webhook' end,
    p_triggered_by_user_id,
    jsonb_build_object(
      'reason', p_reason,
      'grace_days', p_grace_days,
      'grace_until', v_grace_until,
      'stripe_event_id', p_triggered_by_stripe_event_id
    )
  );

  return v_schedule_id;
end;
$$;

-- ============================================================================
-- 7. gap2_cancel_purge
-- ============================================================================
create or replace function public.gap2_cancel_purge(
  p_firm_id uuid,
  p_cancelled_reason text,
  p_actor_user_id uuid default null
)
  returns uuid
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_schedule_id uuid;
begin
  select id into v_schedule_id
    from public.subscription_purge_schedule
   where firm_id = p_firm_id and status = 'scheduled'
   order by scheduled_at desc
   limit 1;

  if v_schedule_id is null then
    return null;
  end if;

  update public.subscription_purge_schedule
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_reason = p_cancelled_reason,
         updated_at = now()
   where id = v_schedule_id;

  update public.firms
     set purge_scheduled_at = null,
         purge_grace_until = null,
         purge_schedule_id = null,
         updated_at = now()
   where id = p_firm_id;

  insert into public.subscription_purge_audit (
    schedule_id, firm_id, event_type, actor_type, actor_user_id, details
  ) values (
    v_schedule_id, p_firm_id, 'reactivated_within_grace',
    case when p_actor_user_id is not null then 'user' else 'stripe_webhook' end,
    p_actor_user_id,
    jsonb_build_object('cancelled_reason', p_cancelled_reason)
  );

  return v_schedule_id;
end;
$$;

revoke all on function public.gap2_schedule_purge(
  uuid, uuid, text, text, text, uuid, text, integer
) from public;
revoke all on function public.gap2_schedule_purge(
  uuid, uuid, text, text, text, uuid, text, integer
) from anon;
revoke all on function public.gap2_schedule_purge(
  uuid, uuid, text, text, text, uuid, text, integer
) from authenticated;
grant execute on function public.gap2_schedule_purge(
  uuid, uuid, text, text, text, uuid, text, integer
) to service_role;

revoke all on function public.gap2_cancel_purge(uuid, text, uuid) from public;
revoke all on function public.gap2_cancel_purge(uuid, text, uuid) from anon;
revoke all on function public.gap2_cancel_purge(uuid, text, uuid) from authenticated;
grant execute on function public.gap2_cancel_purge(uuid, text, uuid) to service_role;

revoke all on function public.gap2_audit_append_only() from public;

commit;
-- <<< end 20260719060000_gap2_subscription_lifecycle_purge.sql

-- >>> begin 20260720000000_v1_5_audit_ready_engagement_state.sql
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
-- <<< end 20260720000000_v1_5_audit_ready_engagement_state.sql

-- >>> begin 20260720120000_ar_week3_pbc_ingest_llm_usage.sql
-- Week 3 Block 3 — PBC ingest + LLM usage tracking + PII redaction maps
-- ADDITIVE ONLY. No modifications to existing tables.
-- Adapted: uses company_users / firm_memberships (repo schema).

BEGIN;

-- ============================================================================
-- 1) audit_ready_pbc_uploads — raw uploaded documents (before parse)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_ready_pbc_uploads (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id          uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  uploaded_by_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  storage_bucket         text NOT NULL DEFAULT 'audit-ready-pbc',
  storage_path           text NOT NULL,
  original_filename      text NOT NULL,
  content_type           text NOT NULL,
  size_bytes             bigint NOT NULL,
  file_sha256            text NOT NULL,
  status                 text NOT NULL DEFAULT 'uploaded'
                         CHECK (status IN ('uploaded','parsing','parsed','failed','rejected')),
  parse_started_at       timestamptz NULL,
  parse_completed_at     timestamptz NULL,
  parse_error            text NULL,
  extracted_request_count integer NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, file_sha256)
);

CREATE INDEX IF NOT EXISTS idx_ar_pbc_uploads_engagement
  ON public.audit_ready_pbc_uploads(engagement_id);
CREATE INDEX IF NOT EXISTS idx_ar_pbc_uploads_status
  ON public.audit_ready_pbc_uploads(engagement_id, status);

ALTER TABLE public.audit_ready_pbc_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ar_pbc_uploads_service_role_all ON public.audit_ready_pbc_uploads;
CREATE POLICY ar_pbc_uploads_service_role_all ON public.audit_ready_pbc_uploads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ar_pbc_uploads_engagement_all ON public.audit_ready_pbc_uploads;
CREATE POLICY ar_pbc_uploads_engagement_all ON public.audit_ready_pbc_uploads
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_pbc_uploads.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
              AND cu.role IN ('company_admin','owner_executive','controller')))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
              AND fm.role IN ('firm_admin','controller','fractional_cfo')))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_pbc_uploads.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
              AND cu.role IN ('company_admin','owner_executive','controller')))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
              AND fm.role IN ('firm_admin','controller','fractional_cfo')))
        )
    )
  );

-- ============================================================================
-- 2) audit_ready_llm_usage — every Bedrock call, engagement-scoped
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_ready_llm_usage (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id            uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  operation                text NOT NULL CHECK (operation IN (
    'pbc_parse','assertion_classify','pii_redaction_ner',
    'response_draft','evidence_bundle_summary','tieout_explain'
  )),
  model_id                 text NOT NULL,
  model_family             text NOT NULL CHECK (model_family IN ('sonnet','haiku','other')),
  prompt_tokens            integer NOT NULL DEFAULT 0,
  completion_tokens        integer NOT NULL DEFAULT 0,
  total_tokens             integer GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
  cost_usd_cents           integer NOT NULL DEFAULT 0,
  latency_ms               integer NULL,
  zero_retention_flag      boolean NOT NULL DEFAULT true,
  redaction_map_id         uuid NULL,
  called_by_user_id        uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  request_hash             text NOT NULL,
  success                  boolean NOT NULL,
  error_code               text NULL,
  called_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_llm_usage_engagement
  ON public.audit_ready_llm_usage(engagement_id, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_ar_llm_usage_engagement_operation
  ON public.audit_ready_llm_usage(engagement_id, operation);
CREATE INDEX IF NOT EXISTS idx_ar_llm_usage_engagement_success
  ON public.audit_ready_llm_usage(engagement_id, success);

ALTER TABLE public.audit_ready_llm_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ar_llm_usage_service_role_all ON public.audit_ready_llm_usage;
CREATE POLICY ar_llm_usage_service_role_all ON public.audit_ready_llm_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ar_llm_usage_engagement_read ON public.audit_ready_llm_usage;
CREATE POLICY ar_llm_usage_engagement_read ON public.audit_ready_llm_usage
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_llm_usage.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'))
        )
    )
  );

-- ============================================================================
-- 3) audit_ready_pii_redaction_maps — engagement-scoped, encrypted at rest
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_ready_pii_redaction_maps (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id         uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  source_upload_id      uuid NULL REFERENCES public.audit_ready_pbc_uploads(id) ON DELETE CASCADE,
  redaction_map_hash    text NOT NULL,
  entity_count          integer NOT NULL DEFAULT 0,
  entity_categories     text[] NOT NULL DEFAULT '{}',
  encrypted_map_ciphertext text NOT NULL,
  encryption_key_ref    text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, redaction_map_hash)
);

CREATE INDEX IF NOT EXISTS idx_ar_pii_maps_engagement
  ON public.audit_ready_pii_redaction_maps(engagement_id);

ALTER TABLE public.audit_ready_pii_redaction_maps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ar_pii_maps_service_role_all ON public.audit_ready_pii_redaction_maps;
CREATE POLICY ar_pii_maps_service_role_all ON public.audit_ready_pii_redaction_maps
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Deliberately no authenticated policy — redaction maps are service-role only.

-- ============================================================================
-- 4) increment_pbc_request_count RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_pbc_request_count(
  p_engagement_id uuid,
  p_delta integer
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.audit_ready_engagements
  SET pbc_request_count = pbc_request_count + p_delta,
      updated_at = now()
  WHERE id = p_engagement_id;
$$;

REVOKE ALL ON FUNCTION public.increment_pbc_request_count(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_pbc_request_count(uuid, integer) TO service_role;

-- ============================================================================
-- 5) Storage bucket for PBC uploads
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audit-ready-pbc',
  'audit-ready-pbc',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/msword',
    'message/rfc822',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS ar_pbc_storage_engagement_write ON storage.objects;
CREATE POLICY ar_pbc_storage_engagement_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'audit-ready-pbc'
    AND EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE (storage.foldername(name))[1] = e.id::text
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
              AND cu.role IN ('company_admin','owner_executive','controller')))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
              AND fm.role IN ('firm_admin','controller','fractional_cfo')))
        )
    )
  );

DROP POLICY IF EXISTS ar_pbc_storage_engagement_read ON storage.objects;
CREATE POLICY ar_pbc_storage_engagement_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'audit-ready-pbc'
    AND EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE (storage.foldername(name))[1] = e.id::text
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'))
        )
    )
  );

COMMIT;
-- <<< end 20260720120000_ar_week3_pbc_ingest_llm_usage.sql

-- >>> begin 20260720150000_pulse_je_reliability_basis.sql
-- PULSE-JE-2: additive CHECK on je_posting_audit.data_source_reliability_basis.
-- Note: posted_journal_entry_attempts does not exist; reliability is on je_posting_audit.
-- Prior value enum CHECK: none (only reliability_required_when_tagged).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'je_posting_audit_data_source_reliability_basis_check'
  ) THEN
    ALTER TABLE public.je_posting_audit
      DROP CONSTRAINT je_posting_audit_data_source_reliability_basis_check;
  END IF;
  ALTER TABLE public.je_posting_audit
    ADD CONSTRAINT je_posting_audit_data_source_reliability_basis_check
    CHECK (
      data_source_reliability_basis IS NULL
      OR data_source_reliability_basis IN (
        'qbo_api_authenticated',
        'bank_feed_ocr',
        'plaid_direct',
        'manual_document_upload',
        'inbound_email_parsed',
        'rule_synthesized_from_qbo_ledger',
        'user_conversational_correction'
      )
    );
END$$;
-- <<< end 20260720150000_pulse_je_reliability_basis.sql

-- >>> begin 20260720170000_ar_tieout2_runs_and_variances.sql
-- PBC-TIEOUT-2 adapted: DROP VIEW before recreate (column order change)
BEGIN;
CREATE TABLE IF NOT EXISTS public.audit_ready_tie_out_runs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id             uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  pbc_request_id            uuid NOT NULL REFERENCES public.audit_ready_pbc_requests(id) ON DELETE CASCADE,
  tie_out_kind              text NOT NULL,
  status                    text NOT NULL DEFAULT 'running'
                            CHECK (status IN ('running','completed','failed','partial')),
  policy_mode               text NOT NULL,
  auto_reconcile_max_dollar  numeric(18,2) NOT NULL,
  auto_reconcile_max_percent numeric(6,4)  NOT NULL,
  kickout_min_dollar         numeric(18,2) NOT NULL,
  kickout_min_percent        numeric(6,4)  NOT NULL,
  authoritative_comparison   text NOT NULL,
  subledger_total_cents     bigint NULL,
  gl_total_cents            bigint NULL,
  totals_variance_cents     bigint NULL,
  totals_status             text NULL
                            CHECK (totals_status IS NULL OR totals_status IN ('tie','auto_reconcile','review','kickout')),
  item_count                integer NOT NULL DEFAULT 0,
  item_auto_reconcile_count integer NOT NULL DEFAULT 0,
  item_review_count         integer NOT NULL DEFAULT 0,
  item_kickout_count        integer NOT NULL DEFAULT 0,
  subledger_source_url      text NULL,
  gl_source_url             text NULL,
  intuit_tid_subledger      text NULL,
  intuit_tid_gl             text NULL,
  period_start              date NULL,
  period_end                date NULL,
  triggered_by_user_id      uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_reason            text NOT NULL DEFAULT 'manual'
                            CHECK (trigger_reason IN ('manual','scheduled','memory_replay','api')),
  started_at                timestamptz NOT NULL DEFAULT now(),
  completed_at              timestamptz NULL,
  duration_ms               integer NULL,
  error_code                text NULL,
  error_message             text NULL
);
CREATE INDEX IF NOT EXISTS idx_ar_tieout_runs_pbc_recent
  ON public.audit_ready_tie_out_runs(pbc_request_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ar_tieout_runs_engagement_recent
  ON public.audit_ready_tie_out_runs(engagement_id, started_at DESC);
ALTER TABLE public.audit_ready_tie_out_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_tieout_runs_service_role_all ON public.audit_ready_tie_out_runs;
CREATE POLICY ar_tieout_runs_service_role_all
  ON public.audit_ready_tie_out_runs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ar_tieout_runs_engagement_read ON public.audit_ready_tie_out_runs;
CREATE POLICY ar_tieout_runs_engagement_read
  ON public.audit_ready_tie_out_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_tie_out_runs.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );
CREATE TABLE IF NOT EXISTS public.audit_ready_tie_out_variances (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                    uuid NOT NULL REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  engagement_id             uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  pbc_request_id            uuid NOT NULL REFERENCES public.audit_ready_pbc_requests(id) ON DELETE CASCADE,
  entity_kind               text NOT NULL
                            CHECK (entity_kind IN ('customer','vendor','item','account','totals','cutoff')),
  entity_qbo_id             text NULL,
  entity_display_name       text NULL,
  subledger_amount_cents    bigint NULL,
  gl_amount_cents           bigint NULL,
  variance_cents            bigint NOT NULL DEFAULT 0,
  variance_percent          numeric(9,6) NULL,
  status                    text NOT NULL
                            CHECK (status IN ('tie','auto_cleared','review','kickout')),
  classification_reason     text NULL,
  narrative                 text NULL,
  created_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ar_tieout_variances_run
  ON public.audit_ready_tie_out_variances(run_id, status);
CREATE INDEX IF NOT EXISTS idx_ar_tieout_variances_engagement_kickout
  ON public.audit_ready_tie_out_variances(engagement_id)
  WHERE status = 'kickout';
CREATE INDEX IF NOT EXISTS idx_ar_tieout_variances_pbc
  ON public.audit_ready_tie_out_variances(pbc_request_id, status);
ALTER TABLE public.audit_ready_tie_out_variances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_tieout_variances_service_role_all ON public.audit_ready_tie_out_variances;
CREATE POLICY ar_tieout_variances_service_role_all
  ON public.audit_ready_tie_out_variances
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ar_tieout_variances_engagement_read ON public.audit_ready_tie_out_variances;
CREATE POLICY ar_tieout_variances_engagement_read
  ON public.audit_ready_tie_out_variances
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_tie_out_variances.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS last_tie_out_run_id uuid NULL
    REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE SET NULL;
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS last_tie_out_status text NULL
    CHECK (last_tie_out_status IS NULL OR last_tie_out_status IN ('tie','auto_reconciled','review','kickout','failed'));
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS last_tie_out_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_ar_pbc_last_tie_out
  ON public.audit_ready_pbc_requests(engagement_id, last_tie_out_status);
DROP VIEW IF EXISTS public.audit_ready_tie_out_summary;
CREATE VIEW public.audit_ready_tie_out_summary AS
SELECT
  r.id                        AS pbc_request_id,
  r.engagement_id,
  r.request_number,
  r.request_description,
  r.assertion_tags,
  r.tie_out_kind,
  r.tie_out_kind_confidence,
  r.tie_out_kind_classifier,
  r.tie_out_kind_classified_at,
  r.status                    AS pbc_status,
  r.last_tie_out_run_id,
  r.last_tie_out_status,
  r.last_tie_out_at,
  CASE
    WHEN p.engagement_id IS NULL           THEN 'no_tolerance_policy'
    WHEN r.tie_out_kind IS NULL            THEN 'not_yet_classified'
    WHEN r.tie_out_kind = 'unclassified'   THEN 'requires_manual_review'
    WHEN r.last_tie_out_run_id IS NULL     THEN 'ready_to_run'
    WHEN r.last_tie_out_status = 'tie'     THEN 'tied_out'
    WHEN r.last_tie_out_status = 'auto_reconciled' THEN 'auto_reconciled'
    WHEN r.last_tie_out_status = 'review'  THEN 'needs_review'
    WHEN r.last_tie_out_status = 'kickout' THEN 'kicked_out'
    WHEN r.last_tie_out_status = 'failed'  THEN 'failed'
    ELSE 'classified'
  END                         AS tie_out_state,
  p.policy_mode,
  p.auto_reconcile_max_dollar,
  p.auto_reconcile_max_percent,
  p.kickout_min_dollar,
  p.kickout_min_percent,
  p.authoritative_comparison
FROM public.audit_ready_pbc_requests r
LEFT JOIN public.audit_ready_tie_out_policies p ON p.engagement_id = r.engagement_id;
ALTER VIEW public.audit_ready_tie_out_summary SET (security_invoker = true);
COMMIT;
-- <<< end 20260720170000_ar_tieout2_runs_and_variances.sql

-- >>> begin 20260720180000_tieout3_grni_binding.sql
-- Phase PBC-TIEOUT-3 — GRNI clearing account binding
-- Additive-only. Optional per engagement. Absent = GRNI resolver returns
-- resolver_config_required cleanly instead of guessing.
alter table public.audit_ready_engagements
  add column if not exists grni_clearing_qbo_account_id text;
comment on column public.audit_ready_engagements.grni_clearing_qbo_account_id is
  'Optional QBO Account ID (numeric string) that maps to the client''s GRNI / '
  'Goods-Received-Not-Invoiced clearing account. Populated by controller during '
  'engagement setup. When null, tie-out for tie_out_kind=grni returns '
  'resolver_config_required.';
-- Optional: also let the AR/AP/Inv account IDs live on the engagement for
-- convenience so the Run modal can prefill. Additive; UI wiring is TIEOUT-4.
alter table public.audit_ready_engagements
  add column if not exists ar_control_qbo_account_id text;
alter table public.audit_ready_engagements
  add column if not exists ap_control_qbo_account_id text;
alter table public.audit_ready_engagements
  add column if not exists inventory_control_qbo_account_id text;
comment on column public.audit_ready_engagements.ar_control_qbo_account_id is
  'Optional QBO AR control account ID. When set, Run modal for ar_aging '
  'prefills this value.';
comment on column public.audit_ready_engagements.ap_control_qbo_account_id is
  'Optional QBO AP control account ID. When set, Run modal for ap_aging '
  'prefills this value.';
comment on column public.audit_ready_engagements.inventory_control_qbo_account_id is
  'Optional QBO Inventory control account ID. When set, Run modal for '
  'inventory prefills this value.';
-- <<< end 20260720180000_tieout3_grni_binding.sql

-- >>> begin 20260721000000_audit_ready_tie_out_variance_evidence.sql
-- PBC-TIEOUT-3.4: Per-source-transaction evidence for tie-out variance rows.
-- One evidence row per source bill/invoice/adjustment that contributed to
-- a rollup variance row. Enables audit-defensible traceability from a
-- rollup number back to the raw QBO transactions + their PO links.
--
-- Design notes:
-- - Foreign-keyed to audit_ready_tie_out_variances via variance_id (cascade delete).
-- - Also foreign-keyed to audit_ready_tie_out_runs via run_id for run-scoped queries.
-- - source_kind discriminator ('bill' | 'invoice' | 'inventory_adjustment') so AR/AP/Inventory
--   resolvers can write evidence uniformly without a new table each.
-- - linked_po_ids stored as text[] (Postgres array) — natural for QBO LinkedTxn.
-- - aging_bucket + age_days_at_run captured at classification time (frozen at run time,
--   not recomputed on read — audit history must not shift as time passes).
CREATE TABLE IF NOT EXISTS public.audit_ready_tie_out_variance_evidence (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variance_id            uuid NOT NULL REFERENCES public.audit_ready_tie_out_variances(id) ON DELETE CASCADE,
  run_id                 uuid NOT NULL REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  engagement_id          uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  -- Source transaction metadata (QBO)
  source_kind            text NOT NULL CHECK (source_kind IN ('bill','invoice','inventory_adjustment')),
  source_qbo_id          text NOT NULL,
  source_txn_date        date,
  source_doc_number      text,          -- null/blank for GRNI bills; populated otherwise
  vendor_ref             text,          -- QBO vendor id (bills)
  customer_ref           text,          -- QBO customer id (invoices)
  -- Financial contribution (cents, always positive for a positive-balance txn)
  total_cents            bigint NOT NULL,
  subtotal_cents         bigint NOT NULL,
  balance_cents          bigint NOT NULL,
  -- Evidence
  linked_po_ids          text[] NOT NULL DEFAULT '{}',
  linked_invoice_ids     text[] NOT NULL DEFAULT '{}',  -- future: AR credit memo links, etc.
  enrichment_error       text,          -- Non-null when per-txn GET-by-id failed
  aging_bucket           text,          -- 'current_0_60' | 'aging_60_90' | 'aging_90_180' | 'aging_over_180' | null
  age_days_at_run        integer,       -- Frozen at run time
  created_at             timestamptz NOT NULL DEFAULT now()
);
-- Indexes for the queries we actually run
CREATE INDEX IF NOT EXISTS idx_arte_variance_id      ON public.audit_ready_tie_out_variance_evidence (variance_id);
CREATE INDEX IF NOT EXISTS idx_arte_run_id           ON public.audit_ready_tie_out_variance_evidence (run_id);
CREATE INDEX IF NOT EXISTS idx_arte_engagement_id    ON public.audit_ready_tie_out_variance_evidence (engagement_id);
CREATE INDEX IF NOT EXISTS idx_arte_source_kind_qbo  ON public.audit_ready_tie_out_variance_evidence (source_kind, source_qbo_id);
-- RLS mirrors audit_ready_tie_out_variances: engagement-scoped, no client writes.
ALTER TABLE public.audit_ready_tie_out_variance_evidence ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS. For authenticated reads, allow if the caller
-- can see the underlying variance row (delegate to the parent table's policy
-- via a SELECT check on audit_ready_tie_out_variances).
DROP POLICY IF EXISTS "arte_select_via_variance" ON public.audit_ready_tie_out_variance_evidence;
CREATE POLICY "arte_select_via_variance"
  ON public.audit_ready_tie_out_variance_evidence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_tie_out_variances v
      WHERE v.id = audit_ready_tie_out_variance_evidence.variance_id
    )
  );
-- No INSERT/UPDATE/DELETE policies for authenticated — only service role writes.
COMMENT ON TABLE public.audit_ready_tie_out_variance_evidence IS
  'Per-source-transaction evidence for tie-out variance rows (PBC-TIEOUT-3.4). One row per QBO bill/invoice/adjustment that contributed to a rollup variance row.';
-- <<< end 20260721000000_audit_ready_tie_out_variance_evidence.sql

-- >>> begin 20260721120000_ar_tieout4b1_bs_recon_artifacts.sql
-- PBC-TIEOUT-4B.1: GL fetch + on-demand BS account recon + XLSX.
-- ADDITIVE ONLY. Idempotent. Non-destructive.
-- Note: 20260720180000 is occupied by TIEOUT-3 GRNI binding.
BEGIN;
-- ─────────────────────────────────────────────────────────────
-- 1) Expand tie_out_kind CHECK to include bs_account_recon.
--    Drop-and-recreate the check so we add one value while keeping all existing values.
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_ready_pbc_requests_tie_out_kind_check'
      AND conrelid = 'public.audit_ready_pbc_requests'::regclass
  ) THEN
    ALTER TABLE public.audit_ready_pbc_requests
      DROP CONSTRAINT audit_ready_pbc_requests_tie_out_kind_check;
  END IF;
  ALTER TABLE public.audit_ready_pbc_requests
    ADD CONSTRAINT audit_ready_pbc_requests_tie_out_kind_check
    CHECK (
      tie_out_kind IS NULL
      OR tie_out_kind IN (
        'ar_aging',
        'ap_aging',
        'inventory',
        'grni',
        'bank_recon',
        'cash_recon',
        'fixed_assets',
        'debt_schedule',
        'equity_rollforward',
        'revenue_cutoff',
        'expense_cutoff',
        'bs_account_recon',
        'unclassified'
      )
    );
END $$;
-- ─────────────────────────────────────────────────────────────
-- 2) Expand entity_kind CHECK on audit_ready_tie_out_variances.
--    Adds 'transaction' and 'subledger_line'. Existing values preserved.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  cname text;
BEGIN
  SELECT c.conname INTO cname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'audit_ready_tie_out_variances'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%entity_kind%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.audit_ready_tie_out_variances DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE public.audit_ready_tie_out_variances
    ADD CONSTRAINT audit_ready_tie_out_variances_entity_kind_check
    CHECK (entity_kind IN (
      'customer','vendor','item','account','totals','cutoff',
      'transaction','subledger_line'
    ));
END $$;
-- ─────────────────────────────────────────────────────────────
-- 3) Fiscal-year start month on engagements (cached from QBO CompanyInfo)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_engagements
  ADD COLUMN IF NOT EXISTS fiscal_year_start_month int NULL
    CHECK (fiscal_year_start_month IS NULL OR fiscal_year_start_month BETWEEN 1 AND 12);
-- ─────────────────────────────────────────────────────────────
-- 4) audit_ready_bs_recon_artifacts
--    One row per generated BS-account recon artifact.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_bs_recon_artifacts (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id             uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  run_id                    uuid NULL REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE SET NULL,
  qbo_account_id            text NOT NULL,
  qbo_account_name          text NOT NULL,
  qbo_account_type          text NULL,
  qbo_account_subtype       text NULL,
  period_start              date NOT NULL,
  period_end                date NOT NULL,
  beginning_balance_cents   bigint NOT NULL DEFAULT 0,
  ending_balance_cents      bigint NOT NULL DEFAULT 0,
  gl_ending_balance_cents   bigint NULL,          -- ties to TB net_cents for this account
  tie_variance_cents        bigint NULL,          -- ending - gl_ending
  activity_count            int NOT NULL DEFAULT 0,
  format                    text NOT NULL
                            CHECK (format IN ('xlsx','pdf','json')),
  storage_bucket            text NOT NULL DEFAULT 'audit-ready-recons',
  storage_object_key        text NOT NULL,
  sha256                    text NOT NULL,
  file_size_bytes           bigint NOT NULL,
  generated_by              text NOT NULL DEFAULT 'manual'
                            CHECK (generated_by IN ('manual','monthly_close_auto','pbc_kickoff','api')),
  visibility                text NOT NULL DEFAULT 'owner_visible'
                            CHECK (visibility IN ('owner_visible','bookkeeper_hidden')),
  notified_bookkeeper_at    timestamptz NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  created_by_user_id        uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_artifacts_engagement_period
  ON public.audit_ready_bs_recon_artifacts(engagement_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_artifacts_account_period
  ON public.audit_ready_bs_recon_artifacts(engagement_id, qbo_account_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_artifacts_run
  ON public.audit_ready_bs_recon_artifacts(run_id)
  WHERE run_id IS NOT NULL;
ALTER TABLE public.audit_ready_bs_recon_artifacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_bs_recon_artifacts_service_role_all ON public.audit_ready_bs_recon_artifacts;
CREATE POLICY ar_bs_recon_artifacts_service_role_all
  ON public.audit_ready_bs_recon_artifacts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ar_bs_recon_artifacts_engagement_read ON public.audit_ready_bs_recon_artifacts;
CREATE POLICY ar_bs_recon_artifacts_engagement_read
  ON public.audit_ready_bs_recon_artifacts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_bs_recon_artifacts.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );
-- ─────────────────────────────────────────────────────────────
-- 5) audit_ready_bs_recon_transactions
--    Every GL activity line for a recon run, with running balance.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_bs_recon_transactions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                    uuid NOT NULL REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  engagement_id             uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  qbo_account_id            text NOT NULL,
  ordinal                   int NOT NULL,               -- row order within the run (chronological)
  txn_date                  date NULL,
  txn_type                  text NULL,                  -- Bill, Invoice, JournalEntry, Deposit, etc.
  txn_ref                   text NULL,                  -- QBO Id
  doc_number                text NULL,
  name_ref                  text NULL,                  -- Customer/Vendor/Employee QBO Id (if applicable)
  name_display              text NULL,
  memo                      text NULL,
  split_account             text NULL,                  -- other side of the entry (from QBO GL "Split" column)
  debit_cents               bigint NOT NULL DEFAULT 0,
  credit_cents              bigint NOT NULL DEFAULT 0,
  net_cents                 bigint NOT NULL DEFAULT 0,  -- signed = debit - credit
  running_balance_cents     bigint NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_txn_run_ordinal
  ON public.audit_ready_bs_recon_transactions(run_id, ordinal);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_txn_name
  ON public.audit_ready_bs_recon_transactions(run_id, name_display)
  WHERE name_display IS NOT NULL;
ALTER TABLE public.audit_ready_bs_recon_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_bs_recon_txn_service_role_all ON public.audit_ready_bs_recon_transactions;
CREATE POLICY ar_bs_recon_txn_service_role_all
  ON public.audit_ready_bs_recon_transactions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ar_bs_recon_txn_engagement_read ON public.audit_ready_bs_recon_transactions;
CREATE POLICY ar_bs_recon_txn_engagement_read
  ON public.audit_ready_bs_recon_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_bs_recon_transactions.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );
-- ─────────────────────────────────────────────────────────────
-- 6) Storage bucket for recon artifacts (private).
--    Idempotent — INSERT ... ON CONFLICT DO NOTHING.
-- ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audit-ready-recons',
  'audit-ready-recons',
  false,
  52428800, -- 50 MB per file
  ARRAY[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
    'application/json'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;
-- Storage RLS: service-role writes; engagement-scoped read is enforced at the API level
-- via signed URLs (10-min TTL). We do NOT expose the bucket directly to authenticated users.
DROP POLICY IF EXISTS ar_bs_recon_storage_service_role_all ON storage.objects;
CREATE POLICY ar_bs_recon_storage_service_role_all
  ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'audit-ready-recons')
  WITH CHECK (bucket_id = 'audit-ready-recons');
COMMIT;
-- <<< end 20260721120000_ar_tieout4b1_bs_recon_artifacts.sql

-- >>> begin 20260721140000_ar_tieout4b2_fa_rollforward_artifacts.sql
-- PBC-TIEOUT-4B.2: Fixed-asset Cost/AccumDepr/NBV roll-forward artifacts + PDF.
-- Additive only. Idempotent. Non-destructive.
-- CHECK enums: APPEND ONLY — preserve all live values from TIEOUT-1 + 4B.1.
BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) Expand tie_out_kind CHECK to include fixed_asset_rollforward.
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_ready_pbc_requests_tie_out_kind_check'
      AND conrelid = 'public.audit_ready_pbc_requests'::regclass
  ) THEN
    ALTER TABLE public.audit_ready_pbc_requests
      DROP CONSTRAINT audit_ready_pbc_requests_tie_out_kind_check;
  END IF;
  ALTER TABLE public.audit_ready_pbc_requests
    ADD CONSTRAINT audit_ready_pbc_requests_tie_out_kind_check
    CHECK (
      tie_out_kind IS NULL
      OR tie_out_kind IN (
        'ar_aging',
        'ap_aging',
        'inventory',
        'grni',
        'bank_recon',
        'cash_recon',
        'fixed_assets',
        'debt_schedule',
        'equity_rollforward',
        'revenue_cutoff',
        'expense_cutoff',
        'bs_account_recon',
        'fixed_asset_rollforward',
        'unclassified'
      )
    );
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2) Expand tie_out_runs.tie_out_kind CHECK only if one already exists.
--    TIEOUT-2 shipped runs.tie_out_kind as unconstrained text — prefer
--    leaving it unconstrained rather than inventing a narrower CHECK.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  cons_name text;
  cons_def  text;
BEGIN
  SELECT c.conname, pg_get_constraintdef(c.oid)
    INTO cons_name, cons_def
  FROM pg_constraint c
  WHERE c.conrelid = 'public.audit_ready_tie_out_runs'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%tie_out_kind%';
  IF cons_name IS NOT NULL AND cons_def NOT ILIKE '%fixed_asset_rollforward%' THEN
    EXECUTE format(
      'ALTER TABLE public.audit_ready_tie_out_runs DROP CONSTRAINT %I',
      cons_name
    );
    ALTER TABLE public.audit_ready_tie_out_runs
      ADD CONSTRAINT audit_ready_tie_out_runs_tie_out_kind_check
      CHECK (
        tie_out_kind IN (
          'ar_aging',
          'ap_aging',
          'inventory',
          'grni',
          'bank_recon',
          'cash_recon',
          'fixed_assets',
          'debt_schedule',
          'equity_rollforward',
          'revenue_cutoff',
          'expense_cutoff',
          'bs_account_recon',
          'fixed_asset_rollforward',
          'unclassified'
        )
      );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3) Expand entity_kind CHECK — append fa_rollforward_line only.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  cname text;
  cdef  text;
BEGIN
  SELECT c.conname, pg_get_constraintdef(c.oid)
    INTO cname, cdef
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'audit_ready_tie_out_variances'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%entity_kind%';
  IF cname IS NOT NULL AND cdef NOT ILIKE '%fa_rollforward_line%' THEN
    EXECUTE format('ALTER TABLE public.audit_ready_tie_out_variances DROP CONSTRAINT %I', cname);
    ALTER TABLE public.audit_ready_tie_out_variances
      ADD CONSTRAINT audit_ready_tie_out_variances_entity_kind_check
      CHECK (entity_kind IN (
        'customer','vendor','item','account','totals','cutoff',
        'transaction','subledger_line','fa_rollforward_line'
      ));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4) audit_ready_fa_rollforward_artifacts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_fa_rollforward_artifacts (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id             uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  run_id                    uuid NOT NULL REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  scope_kind                text NOT NULL DEFAULT 'account'
                            CHECK (scope_kind IN ('account','subclass','all_fixed_assets')),
  scope_key                 text NOT NULL,
  scope_label               text NOT NULL DEFAULT '',
  period_start              date NOT NULL,
  period_end                date NOT NULL,
  cost_beginning_cents      bigint NOT NULL DEFAULT 0,
  cost_additions_cents      bigint NOT NULL DEFAULT 0,
  cost_disposals_cents      bigint NOT NULL DEFAULT 0,
  cost_reclass_cents        bigint NOT NULL DEFAULT 0,
  cost_ending_cents         bigint NOT NULL DEFAULT 0,
  cost_gl_ending_cents      bigint NOT NULL DEFAULT 0,
  cost_variance_cents       bigint NOT NULL DEFAULT 0,
  accum_beginning_cents     bigint NOT NULL DEFAULT 0,
  accum_depreciation_cents  bigint NOT NULL DEFAULT 0,
  accum_disposals_cents     bigint NOT NULL DEFAULT 0,
  accum_reclass_cents       bigint NOT NULL DEFAULT 0,
  accum_ending_cents        bigint NOT NULL DEFAULT 0,
  accum_gl_ending_cents     bigint NOT NULL DEFAULT 0,
  accum_variance_cents      bigint NOT NULL DEFAULT 0,
  nbv_beginning_cents       bigint NOT NULL DEFAULT 0,
  nbv_ending_cents          bigint NOT NULL DEFAULT 0,
  format                    text NOT NULL DEFAULT 'pdf'
                            CHECK (format IN ('pdf','xlsx','json')),
  storage_bucket            text NOT NULL DEFAULT 'audit-ready-recons',
  storage_object_key        text NOT NULL,
  sha256                    text NOT NULL,
  file_size_bytes           bigint NOT NULL,
  generated_by              text NOT NULL DEFAULT 'manual'
                            CHECK (generated_by IN ('manual','monthly_close_auto','pbc_kickoff','api')),
  visibility                text NOT NULL DEFAULT 'owner_visible'
                            CHECK (visibility IN ('owner_visible','bookkeeper_hidden')),
  notified_bookkeeper_at    timestamptz NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  created_by_user_id        uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ar_fa_rf_artifacts_engagement_period
  ON public.audit_ready_fa_rollforward_artifacts(engagement_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_ar_fa_rf_artifacts_scope
  ON public.audit_ready_fa_rollforward_artifacts(engagement_id, scope_kind, scope_key, period_end DESC);

ALTER TABLE public.audit_ready_fa_rollforward_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ar_fa_rf_artifacts_service_role_all ON public.audit_ready_fa_rollforward_artifacts;
CREATE POLICY ar_fa_rf_artifacts_service_role_all
  ON public.audit_ready_fa_rollforward_artifacts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ar_fa_rf_artifacts_engagement_read ON public.audit_ready_fa_rollforward_artifacts;
CREATE POLICY ar_fa_rf_artifacts_engagement_read
  ON public.audit_ready_fa_rollforward_artifacts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_fa_rollforward_artifacts.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 5) audit_ready_fa_rollforward_lines
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_fa_rollforward_lines (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id            uuid NOT NULL REFERENCES public.audit_ready_fa_rollforward_artifacts(id) ON DELETE CASCADE,
  run_id                 uuid NOT NULL REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  engagement_id          uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  qbo_account_id         text NOT NULL,
  qbo_account_name       text NOT NULL DEFAULT '',
  side                   text NOT NULL CHECK (side IN ('cost','accum')),
  bucket                 text NOT NULL CHECK (bucket IN ('addition','disposal','depreciation','reclass','other')),
  ordinal                integer NOT NULL,
  txn_date               date NOT NULL,
  txn_type               text NOT NULL DEFAULT '',
  doc_number             text NULL,
  name_display           text NULL,
  memo                   text NULL,
  split_account          text NULL,
  debit_cents            bigint NOT NULL DEFAULT 0,
  credit_cents           bigint NOT NULL DEFAULT 0,
  signed_cents           bigint NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_fa_rf_lines_artifact
  ON public.audit_ready_fa_rollforward_lines(artifact_id, side, bucket, ordinal);

ALTER TABLE public.audit_ready_fa_rollforward_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ar_fa_rf_lines_service_role_all ON public.audit_ready_fa_rollforward_lines;
CREATE POLICY ar_fa_rf_lines_service_role_all
  ON public.audit_ready_fa_rollforward_lines
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ar_fa_rf_lines_engagement_read ON public.audit_ready_fa_rollforward_lines;
CREATE POLICY ar_fa_rf_lines_engagement_read
  ON public.audit_ready_fa_rollforward_lines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_fa_rollforward_lines.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );

COMMIT;
-- <<< end 20260721140000_ar_tieout4b2_fa_rollforward_artifacts.sql

-- >>> begin 20260721160000_ar_tieout4b3_bs_recon_summary.sql
-- PBC-TIEOUT-4B.3: BS Recon Summary Rollup (engagement-level).
-- ADDITIVE ONLY. Idempotent. Non-destructive.
-- Adds two artifact tables + extends PBC tie_out_kind CHECK to include
-- 'bs_recon_summary'. audit_ready_tie_out_runs.tie_out_kind is free-text,
-- so no CHECK change is required there.
BEGIN;
-- ─────────────────────────────────────────────────────────────
-- 1) Extend audit_ready_pbc_requests.tie_out_kind CHECK.
--    Drop-and-recreate to add 'bs_recon_summary' while preserving
--    every existing value. Values must match the current live check
--    exactly.
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_ready_pbc_requests_tie_out_kind_check'
      AND conrelid = 'public.audit_ready_pbc_requests'::regclass
  ) THEN
    ALTER TABLE public.audit_ready_pbc_requests
      DROP CONSTRAINT audit_ready_pbc_requests_tie_out_kind_check;
  END IF;
  ALTER TABLE public.audit_ready_pbc_requests
    ADD CONSTRAINT audit_ready_pbc_requests_tie_out_kind_check
    CHECK (
      tie_out_kind IS NULL
      OR tie_out_kind IN (
        'ar_aging',
        'ap_aging',
        'inventory',
        'grni',
        'bank_recon',
        'cash_recon',
        'fixed_assets',
        'debt_schedule',
        'equity_rollforward',
        'revenue_cutoff',
        'expense_cutoff',
        'bs_account_recon',
        'fixed_asset_rollforward',
        'bs_recon_summary',
        'unclassified'
      )
    );
END $$;
-- ─────────────────────────────────────────────────────────────
-- 2) audit_ready_bs_recon_summary_artifacts
--    One row per completed engagement-level BS rollup run.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_bs_recon_summary_artifacts (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id                   uuid NOT NULL
                                  REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  run_id                          uuid NOT NULL UNIQUE
                                  REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  period_start                    date NOT NULL,
  period_end                      date NOT NULL,
  account_count_total             int  NOT NULL DEFAULT 0,
  account_count_tie               int  NOT NULL DEFAULT 0,
  account_count_auto_reconcile    int  NOT NULL DEFAULT 0,
  account_count_review            int  NOT NULL DEFAULT 0,
  account_count_kickout           int  NOT NULL DEFAULT 0,
  account_count_failed            int  NOT NULL DEFAULT 0,
  -- Aggregated GL ending balances by classification. Signed cents.
  -- Assets natural-debit positive; Liabilities and Equity natural-credit
  -- stored as-received from QBO (which reports natural balances positive
  -- for L/E in gl_ending_balance_cents).
  assets_ending_cents             bigint NOT NULL DEFAULT 0,
  liabilities_ending_cents        bigint NOT NULL DEFAULT 0,
  equity_ending_cents             bigint NOT NULL DEFAULT 0,
  -- assets - (liabilities + equity). 0 = balanced.
  bs_equation_variance_cents      bigint NOT NULL DEFAULT 0,
  bs_equation_status              text   NOT NULL
                                  CHECK (bs_equation_status IN ('tie','kickout')),
  format                          text NOT NULL DEFAULT 'pdf'
                                  CHECK (format IN ('pdf','xlsx','json')),
  storage_bucket                  text NOT NULL DEFAULT 'audit-ready-recons',
  storage_object_key              text NOT NULL,
  sha256                          text NOT NULL,
  file_size_bytes                 bigint NOT NULL,
  generated_by                    text NOT NULL DEFAULT 'manual'
                                  CHECK (generated_by IN ('manual','monthly_close_auto','pbc_kickoff','api','scheduled')),
  visibility                      text NOT NULL DEFAULT 'owner_visible'
                                  CHECK (visibility IN ('owner_visible','bookkeeper_hidden')),
  notified_bookkeeper_at          timestamptz NULL,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  created_by_user_id              uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_summary_artifacts_engagement_period
  ON public.audit_ready_bs_recon_summary_artifacts(engagement_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_summary_artifacts_run
  ON public.audit_ready_bs_recon_summary_artifacts(run_id);
ALTER TABLE public.audit_ready_bs_recon_summary_artifacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_bs_recon_summary_artifacts_service_role_all
  ON public.audit_ready_bs_recon_summary_artifacts;
CREATE POLICY ar_bs_recon_summary_artifacts_service_role_all
  ON public.audit_ready_bs_recon_summary_artifacts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ar_bs_recon_summary_artifacts_engagement_read
  ON public.audit_ready_bs_recon_summary_artifacts;
CREATE POLICY ar_bs_recon_summary_artifacts_engagement_read
  ON public.audit_ready_bs_recon_summary_artifacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_bs_recon_summary_artifacts.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM public.company_users cu
             WHERE cu.company_id = e.company_id
               AND cu.user_id = (SELECT auth.uid())
               AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM public.firm_memberships fm
             WHERE fm.firm_id = e.firm_id
               AND fm.user_id = (SELECT auth.uid())
               AND fm.status = 'active'
          ))
        )
    )
  );
-- ─────────────────────────────────────────────────────────────
-- 3) audit_ready_bs_recon_summary_lines
--    One row per account included in a rollup run.
--    Points to the per-account child run + artifact so the
--    evidence chain is preserved.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_bs_recon_summary_lines (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_artifact_id       uuid NOT NULL
                            REFERENCES public.audit_ready_bs_recon_summary_artifacts(id)
                            ON DELETE CASCADE,
  engagement_id             uuid NOT NULL
                            REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  -- Parent rollup run id (denormalized for query convenience).
  run_id                    uuid NOT NULL
                            REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  -- Per-account child run + artifact. Nullable when the child failed
  -- before insert or was skipped.
  child_run_id              uuid NULL
                            REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE SET NULL,
  child_artifact_id         uuid NULL
                            REFERENCES public.audit_ready_bs_recon_artifacts(id) ON DELETE SET NULL,
  qbo_account_id            text NOT NULL,
  qbo_account_name          text NOT NULL,
  qbo_account_type          text NULL,
  qbo_account_subtype       text NULL,
  classification            text NOT NULL
                            CHECK (classification IN ('Asset','Liability','Equity')),
  beginning_balance_cents   bigint NOT NULL DEFAULT 0,
  ending_balance_cents      bigint NOT NULL DEFAULT 0,
  gl_ending_balance_cents   bigint NOT NULL DEFAULT 0,
  tie_variance_cents        bigint NOT NULL DEFAULT 0,
  activity_count            int NOT NULL DEFAULT 0,
  totals_status             text NOT NULL
                            CHECK (totals_status IN
                              ('tie','auto_reconcile','review','kickout','failed')),
  sort_order                int NOT NULL DEFAULT 0,
  error_code                text NULL,
  error_message             text NULL,
  created_at                timestamptz NOT NULL DEFAULT now()
);
-- Prevent dup writes if a child gets retried inside the same rollup run.
CREATE UNIQUE INDEX IF NOT EXISTS ux_ar_bs_recon_summary_lines_run_account
  ON public.audit_ready_bs_recon_summary_lines(run_id, qbo_account_id);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_summary_lines_summary_sort
  ON public.audit_ready_bs_recon_summary_lines(summary_artifact_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_ar_bs_recon_summary_lines_engagement
  ON public.audit_ready_bs_recon_summary_lines(engagement_id);
ALTER TABLE public.audit_ready_bs_recon_summary_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_bs_recon_summary_lines_service_role_all
  ON public.audit_ready_bs_recon_summary_lines;
CREATE POLICY ar_bs_recon_summary_lines_service_role_all
  ON public.audit_ready_bs_recon_summary_lines
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ar_bs_recon_summary_lines_engagement_read
  ON public.audit_ready_bs_recon_summary_lines;
CREATE POLICY ar_bs_recon_summary_lines_engagement_read
  ON public.audit_ready_bs_recon_summary_lines
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_bs_recon_summary_lines.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM public.company_users cu
             WHERE cu.company_id = e.company_id
               AND cu.user_id = (SELECT auth.uid())
               AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM public.firm_memberships fm
             WHERE fm.firm_id = e.firm_id
               AND fm.user_id = (SELECT auth.uid())
               AND fm.status = 'active'
          ))
        )
    )
  );
COMMIT;
-- <<< end 20260721160000_ar_tieout4b3_bs_recon_summary.sql

-- >>> begin 20260721180000_ar_tieout4b3_bs_summary_sentinel_unique.sql
-- PBC-TIEOUT-4B.3.2 sentinel amendment.
-- Enforces one system-managed rollup sentinel PBC row per (engagement, tie_out_kind).
-- Additive, idempotent, safe to re-run.
-- Partial UNIQUE index covering the SYS-ROLLUP-* namespace on request_number.
-- The predicate matches all current and future system sentinels while leaving
-- normal user-supplied request_number values unconstrained.
CREATE UNIQUE INDEX IF NOT EXISTS audit_ready_pbc_requests_sys_rollup_sentinel_key
  ON public.audit_ready_pbc_requests (engagement_id, tie_out_kind)
  WHERE request_number LIKE 'SYS-ROLLUP-%';
COMMENT ON INDEX public.audit_ready_pbc_requests_sys_rollup_sentinel_key IS
  'Ensures at most one system-managed sentinel PBC row per (engagement, tie_out_kind). System sentinels are identified by request_number LIKE ''SYS-ROLLUP-%''. Referenced by rollup resolvers (e.g. runBsSummaryResolver) that need to satisfy audit_ready_tie_out_runs.pbc_request_id NOT NULL without polluting the PBC inbox with one row per run.';
-- <<< end 20260721180000_ar_tieout4b3_bs_summary_sentinel_unique.sql

-- >>> begin 20260722221611_bs_recon_summary_basis_and_computed_lines.sql
-- Additive migration for PBC-TIEOUT-4B.3.5.
-- Adds is_computed_line to summary lines (Net Income row support) and
-- accounting_method to summary artifacts (Accrual vs Cash audit trail).

ALTER TABLE public.audit_ready_bs_recon_summary_lines
  ADD COLUMN IF NOT EXISTS is_computed_line boolean NOT NULL DEFAULT false;

-- Per-report accounting basis captured at fixture-capture time.
-- Lives on the summary artifact (not the parent tie_out_runs) because
-- a firm may run BS on Accrual basis and P&L on Cash basis in the same
-- tie-out run — basis is a property of the specific report, not the
-- orchestration run that produced it.
ALTER TABLE public.audit_ready_bs_recon_summary_artifacts
  ADD COLUMN IF NOT EXISTS accounting_method text
  CHECK (accounting_method IN ('Accrual', 'Cash'));

-- Backfill any pre-existing rows to 'Accrual' (default assumption for
-- the pilot). Safe because there are no Cash-basis clients in
-- production yet as of this migration.
UPDATE public.audit_ready_bs_recon_summary_artifacts
  SET accounting_method = 'Accrual'
  WHERE accounting_method IS NULL;
-- <<< end 20260722221611_bs_recon_summary_basis_and_computed_lines.sql

-- >>> begin 20260722233000_bs_recon_summary_lines_qbo_account_id_nullable.sql
-- Phase PBC-TIEOUT-4B.3.5 Fix-up #2
--
-- Relax NOT NULL on audit_ready_bs_recon_summary_lines.qbo_account_id.
-- Computed summary lines (e.g. QBO's Net Income row on the Balance Sheet)
-- have no underlying QBO account — the value is derived on the report
-- itself. The is_computed_line boolean column (added in the prior
-- migration in this phase) already distinguishes these rows from
-- real-account rows. Application code inserts qbo_account_id = NULL
-- for these rows, which the previous NOT NULL constraint rejected.
--
-- Backfill is a no-op: existing rows all have non-null qbo_account_id
-- values (they were all real-account rows before Phase 4B.3.5).
--
-- Idempotent: ALTER COLUMN DROP NOT NULL is a no-op if the column is
-- already nullable.
ALTER TABLE audit_ready_bs_recon_summary_lines
  ALTER COLUMN qbo_account_id DROP NOT NULL;

-- Add a partial CHECK to encode the semantic: qbo_account_id may be NULL
-- ONLY when is_computed_line = true. This prevents accidental future
-- inserts of real-account rows with a null account id — those would
-- indicate a bug in the parser or resolver.
ALTER TABLE audit_ready_bs_recon_summary_lines
  DROP CONSTRAINT IF EXISTS audit_ready_bs_recon_summary_lines_qbo_account_id_computed_check;

ALTER TABLE audit_ready_bs_recon_summary_lines
  ADD CONSTRAINT audit_ready_bs_recon_summary_lines_qbo_account_id_computed_check
  CHECK (
    (is_computed_line = true AND qbo_account_id IS NULL)
    OR (is_computed_line = false AND qbo_account_id IS NOT NULL)
  );
-- <<< end 20260722233000_bs_recon_summary_lines_qbo_account_id_nullable.sql

-- >>> begin 20260723050000_audit_ready_cron_runs.sql
-- Phase PBC-TIEOUT-4B.4: monthly BS recon cron observability table
-- Patterned after qbo_cdc_runs (service-role RLS, timestamptz timestamps, structured counters)

CREATE TABLE IF NOT EXISTS public.audit_ready_cron_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name text NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  as_of_date date NOT NULL,
  engagements_attempted int NOT NULL DEFAULT 0,
  engagements_succeeded_tie int NOT NULL DEFAULT 0,
  engagements_succeeded_kickout int NOT NULL DEFAULT 0,
  engagements_failed int NOT NULL DEFAULT 0,
  engagements_skipped int NOT NULL DEFAULT 0,
  duration_ms int,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_ready_cron_runs_name_time
  ON public.audit_ready_cron_runs (cron_name, triggered_at DESC);

ALTER TABLE public.audit_ready_cron_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_ready_cron_runs_service_role
  ON public.audit_ready_cron_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.audit_ready_cron_runs IS
  'PBC-TIEOUT-4B.4: observability log for scheduled Audit Ready cron runs (e.g. monthly BS recon).';
-- <<< end 20260723050000_audit_ready_cron_runs.sql

-- >>> begin 20260724010000_kickout_investigations.sql
-- PBC-TIEOUT-4.1: Kickout investigations table (append-only)
-- Feeds 4.2 auto-reconcile memory. Polymorphic FK to BS lines and PBC runs.

CREATE TABLE IF NOT EXISTS public.audit_ready_kickout_investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  kickout_source_type TEXT NOT NULL CHECK (kickout_source_type IN ('bs_summary_line', 'pbc_run')),
  kickout_source_id UUID NOT NULL,
  investigated_by UUID NOT NULL REFERENCES auth.users(id),
  investigated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT NOT NULL CHECK (length(trim(note)) > 0),
  resolution_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (resolution_status IN ('pending', 'resolved', 'escalated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kickout_inv_source_lookup
  ON public.audit_ready_kickout_investigations
    (engagement_id, kickout_source_type, kickout_source_id, investigated_at DESC);

CREATE INDEX IF NOT EXISTS idx_kickout_inv_engagement_status
  ON public.audit_ready_kickout_investigations
    (engagement_id, resolution_status, investigated_at DESC);

ALTER TABLE public.audit_ready_kickout_investigations ENABLE ROW LEVEL SECURITY;

-- SELECT: user must have firm or company access to the engagement
CREATE POLICY kickout_inv_select
  ON public.audit_ready_kickout_investigations FOR SELECT
  TO authenticated
  USING (
    engagement_id IN (
      SELECT e.id FROM public.audit_ready_engagements e
      WHERE
        (e.firm_id IS NOT NULL AND e.firm_id IN (
          SELECT firm_id FROM public.firm_memberships
          WHERE user_id = (SELECT auth.uid()) AND status = 'active'
        ))
        OR
        (e.company_id IS NOT NULL AND e.company_id IN (
          SELECT company_id FROM public.company_users
          WHERE user_id = (SELECT auth.uid()) AND status = 'active'
        ))
    )
  );

-- INSERT: same access + user must be the investigator
CREATE POLICY kickout_inv_insert
  ON public.audit_ready_kickout_investigations FOR INSERT
  TO authenticated
  WITH CHECK (
    investigated_by = (SELECT auth.uid())
    AND engagement_id IN (
      SELECT e.id FROM public.audit_ready_engagements e
      WHERE
        (e.firm_id IS NOT NULL AND e.firm_id IN (
          SELECT firm_id FROM public.firm_memberships
          WHERE user_id = (SELECT auth.uid()) AND status = 'active'
        ))
        OR
        (e.company_id IS NOT NULL AND e.company_id IN (
          SELECT company_id FROM public.company_users
          WHERE user_id = (SELECT auth.uid()) AND status = 'active'
        ))
    )
  );

-- No UPDATE, no DELETE (append-only)
-- <<< end 20260724010000_kickout_investigations.sql

-- >>> begin 20260724020000_kickout_dedupe_rpcs.sql
-- Phase PBC-TIEOUT-4.1.1: dedupe RPCs for Kickout Inbox
-- Landmine: audit_ready_tie_out_runs has no created_at — use COALESCE(completed_at, started_at).
-- Landmine: suppress linked bs_account_recon BEFORE DISTINCT ON, else a linked
-- "latest" run wins the (eng, kind, period) slot and orphans disappear.

CREATE OR REPLACE FUNCTION audit_ready_latest_bs_kickout_lines(
  p_engagement_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  engagement_id uuid,
  qbo_account_id text,
  qbo_account_name text,
  qbo_account_type text,
  tie_variance_cents bigint,
  gl_ending_balance_cents bigint,
  child_run_id uuid,
  line_created_at timestamptz,
  artifact_id uuid,
  period_end date,
  artifact_created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (l.engagement_id, art.period_end, l.qbo_account_id)
    l.id,
    l.engagement_id,
    l.qbo_account_id,
    l.qbo_account_name,
    l.qbo_account_type,
    l.tie_variance_cents,
    l.gl_ending_balance_cents,
    l.child_run_id,
    l.created_at AS line_created_at,
    art.id AS artifact_id,
    art.period_end,
    art.created_at AS artifact_created_at
  FROM audit_ready_bs_recon_summary_lines l
  JOIN audit_ready_bs_recon_summary_artifacts art
    ON art.id = l.summary_artifact_id
  WHERE l.engagement_id = ANY (p_engagement_ids)
    AND l.totals_status = 'kickout'
  ORDER BY
    l.engagement_id,
    art.period_end,
    l.qbo_account_id,
    art.created_at DESC,
    l.created_at DESC;
$$;

REVOKE ALL ON FUNCTION audit_ready_latest_bs_kickout_lines(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION audit_ready_latest_bs_kickout_lines(uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION audit_ready_latest_pbc_kickout_runs(
  p_engagement_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  engagement_id uuid,
  tie_out_kind text,
  period_end date,
  subledger_total_cents bigint,
  gl_total_cents bigint,
  subledger_source_url text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH eligible AS (
    -- Fix 3 first: drop bs_account_recon already surfaced via kickout summary lines
    SELECT
      r.id,
      r.engagement_id,
      r.tie_out_kind,
      r.period_end,
      r.subledger_total_cents,
      r.gl_total_cents,
      r.subledger_source_url,
      COALESCE(r.completed_at, r.started_at) AS created_at
    FROM audit_ready_tie_out_runs r
    WHERE r.engagement_id = ANY (p_engagement_ids)
      AND r.totals_status = 'kickout'
      AND r.tie_out_kind <> 'bs_recon_summary'
      AND NOT (
        r.tie_out_kind = 'bs_account_recon'
        AND EXISTS (
          SELECT 1
          FROM audit_ready_bs_recon_summary_lines sl
          WHERE sl.child_run_id = r.id
            AND sl.totals_status = 'kickout'
        )
      )
  )
  -- Fix 2: latest remaining run per (engagement, kind, period)
  SELECT DISTINCT ON (e.engagement_id, e.tie_out_kind, e.period_end)
    e.id,
    e.engagement_id,
    e.tie_out_kind,
    e.period_end,
    e.subledger_total_cents,
    e.gl_total_cents,
    e.subledger_source_url,
    e.created_at
  FROM eligible e
  ORDER BY
    e.engagement_id,
    e.tie_out_kind,
    e.period_end,
    e.created_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION audit_ready_latest_pbc_kickout_runs(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION audit_ready_latest_pbc_kickout_runs(uuid[]) TO authenticated, service_role;
-- <<< end 20260724020000_kickout_dedupe_rpcs.sql

-- >>> begin 20260724030000_ar_tieout412a_kind_reconcile.sql
-- Phase PBC-TIEOUT-4.1.2 Block A: kind reconciliation
-- Rename legacy 'fixed_assets' tie_out_kind values to canonical 'fixed_asset_rollforward'.
-- Idempotent — safe to re-run.

UPDATE public.audit_ready_tie_out_runs
SET tie_out_kind = 'fixed_asset_rollforward'
WHERE tie_out_kind = 'fixed_assets';

-- Also reconcile classifier-persisted kind on PBC requests (if any legacy rows)
UPDATE public.audit_ready_pbc_requests
SET tie_out_kind = 'fixed_asset_rollforward'
WHERE tie_out_kind = 'fixed_assets';

DO $$
DECLARE
  legacy_count int;
BEGIN
  SELECT COUNT(*) INTO legacy_count
  FROM public.audit_ready_tie_out_runs
  WHERE tie_out_kind = 'fixed_assets';
  IF legacy_count > 0 THEN
    RAISE EXCEPTION 'Legacy fixed_assets rows still exist on runs: %', legacy_count;
  END IF;

  SELECT COUNT(*) INTO legacy_count
  FROM public.audit_ready_pbc_requests
  WHERE tie_out_kind = 'fixed_assets';
  IF legacy_count > 0 THEN
    RAISE EXCEPTION 'Legacy fixed_assets rows still exist on pbc_requests: %', legacy_count;
  END IF;
END $$;
-- <<< end 20260724030000_ar_tieout412a_kind_reconcile.sql

-- >>> begin 20260724030100_ar_tieout412a_run_artifacts.sql
-- Phase PBC-TIEOUT-4.1.2 Block A: run artifact storage + regeneration lineage

CREATE TABLE IF NOT EXISTS public.audit_ready_run_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tie_out_run_id uuid NOT NULL
    REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  artifact_kind text NOT NULL CHECK (artifact_kind IN ('xlsx', 'pdf')),
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes >= 0),
  content_hash text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tie_out_run_id, artifact_kind)
);

CREATE INDEX IF NOT EXISTS idx_run_artifacts_run
  ON public.audit_ready_run_artifacts (tie_out_run_id);
CREATE INDEX IF NOT EXISTS idx_run_artifacts_generated_at
  ON public.audit_ready_run_artifacts (generated_at DESC);

ALTER TABLE public.audit_ready_run_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS run_artifacts_select ON public.audit_ready_run_artifacts;
CREATE POLICY run_artifacts_select ON public.audit_ready_run_artifacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_tie_out_runs r
      JOIN public.audit_ready_engagements e ON e.id = r.engagement_id
      WHERE r.id = audit_ready_run_artifacts.tie_out_run_id
        AND (
          EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          )
        )
    )
  );

-- Regeneration lineage on runs
ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS regenerated_from_run_id uuid
    REFERENCES public.audit_ready_tie_out_runs(id),
  ADD COLUMN IF NOT EXISTS trigger_kind text NOT NULL DEFAULT 'initial';

-- Backfill + constrain trigger_kind (column may already exist without check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_ready_tie_out_runs_trigger_kind_check'
  ) THEN
    ALTER TABLE public.audit_ready_tie_out_runs
      ADD CONSTRAINT audit_ready_tie_out_runs_trigger_kind_check
      CHECK (trigger_kind IN ('initial', 'regenerated', 'cron'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tie_out_runs_regenerated_from
  ON public.audit_ready_tie_out_runs (regenerated_from_run_id)
  WHERE regenerated_from_run_id IS NOT NULL;

-- Storage bucket (idempotent). If your project forbids SQL bucket inserts,
-- create `audit-ready-workpapers` via Dashboard and skip this INSERT.
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-ready-workpapers', 'audit-ready-workpapers', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "audit_ready_workpapers_select" ON storage.objects;
CREATE POLICY "audit_ready_workpapers_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audit-ready-workpapers'
    AND EXISTS (
      SELECT 1
      FROM public.audit_ready_run_artifacts a
      JOIN public.audit_ready_tie_out_runs r ON r.id = a.tie_out_run_id
      JOIN public.audit_ready_engagements e ON e.id = r.engagement_id
      WHERE a.storage_path = storage.objects.name
        AND (
          EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          )
        )
    )
  );
-- <<< end 20260724030100_ar_tieout412a_run_artifacts.sql

-- >>> begin 20260724220000_ar_tieout412b_raw_qbo_payload.sql
-- Phase PBC-TIEOUT-4.1.2 Block B: raw QBO payload persistence for Source Data tab
-- Path Y: build() reads from this column, never live-fetches.
ALTER TABLE audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS raw_qbo_payload_jsonb jsonb;

COMMENT ON COLUMN audit_ready_tie_out_runs.raw_qbo_payload_jsonb IS
  'Snapshot of the QBO API response(s) used to compute this run. Read by workpaper emitters for the Source Data tab. Never mutated after run completion.';
-- <<< end 20260724220000_ar_tieout412b_raw_qbo_payload.sql

-- >>> begin 20260725050000_ar_tieout420a_resolution_code.sql
-- Phase PBC-TIEOUT-4.2 Block A: resolution_code on kickout investigations
-- Structured disposition for memory matching.
-- NULL-safe: legacy rows stay NULL; API layer enforces required on new INSERTs.
-- Forward reference: audit_ready_memory AddonCode gates Block B (auto-clear)
-- and Block C (governance); Suggest is not gated in Block A.

ALTER TABLE public.audit_ready_kickout_investigations
  ADD COLUMN IF NOT EXISTS resolution_code text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_ready_kickout_investigations_resolution_code_chk'
      AND conrelid = 'public.audit_ready_kickout_investigations'::regclass
  ) THEN
    ALTER TABLE public.audit_ready_kickout_investigations
      ADD CONSTRAINT audit_ready_kickout_investigations_resolution_code_chk
      CHECK (
        resolution_code IS NULL
        OR resolution_code IN (
          'immaterial',
          'timing',
          'reclass',
          'true_error',
          'other'
        )
      );
  END IF;
END
$$;

COMMENT ON COLUMN public.audit_ready_kickout_investigations.resolution_code IS
  'Structured disposition for memory matching (Block B). Canonical values: '
  'immaterial | timing | reclass | true_error | other. NULL-safe for legacy '
  'rows; API layer enforces required on new INSERTs.';
-- <<< end 20260725050000_ar_tieout420a_resolution_code.sql

-- >>> begin 20260725050100_ar_tieout420a_similar_kickouts_rpc.sql
-- Phase PBC-TIEOUT-4.2 Block A: deterministic similar-resolution query layer.
-- Historical source rows are joined directly because the existing
-- audit_ready_latest_* objects are parameterized functions, not views.

CREATE OR REPLACE FUNCTION public.get_similar_kickout_resolutions(
  p_engagement_id uuid,
  p_source_type text,
  p_source_key jsonb
)
RETURNS TABLE (
  investigation_id uuid,
  investigated_at timestamptz,
  investigated_by uuid,
  note text,
  resolution_code text,
  resolution_status text,
  match_key text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT
      i.id,
      i.investigated_at,
      i.investigated_by,
      i.note,
      i.resolution_code,
      i.resolution_status,
      i.kickout_source_type,
      i.kickout_source_id
    FROM public.audit_ready_kickout_investigations i
    WHERE i.engagement_id = p_engagement_id
      AND i.resolution_status = 'resolved'
      AND i.investigated_at >= now() - interval '6 months'
      AND i.kickout_source_type = p_source_type
  ),
  matched AS (
    SELECT
      s.id AS investigation_id,
      s.investigated_at,
      s.investigated_by,
      s.note,
      s.resolution_code,
      s.resolution_status,
      b.qbo_account_id AS match_key
    FROM scoped s
    JOIN public.audit_ready_bs_recon_summary_lines b
      ON b.id = s.kickout_source_id
    WHERE s.kickout_source_type = 'bs_summary_line'
      AND b.qbo_account_id = p_source_key->>'qbo_account_id'

    UNION ALL

    SELECT
      s.id AS investigation_id,
      s.investigated_at,
      s.investigated_by,
      s.note,
      s.resolution_code,
      s.resolution_status,
      r.tie_out_kind AS match_key
    FROM scoped s
    JOIN public.audit_ready_tie_out_runs r
      ON r.id = s.kickout_source_id
    WHERE s.kickout_source_type = 'pbc_run'
      AND r.tie_out_kind = p_source_key->>'tie_out_kind'
  )
  SELECT
    m.investigation_id,
    m.investigated_at,
    m.investigated_by,
    m.note,
    m.resolution_code,
    m.resolution_status,
    m.match_key
  FROM matched m
  ORDER BY m.investigated_at DESC
  LIMIT 3;
$$;

COMMENT ON FUNCTION public.get_similar_kickout_resolutions(uuid, text, jsonb) IS
  'Returns up to 3 recent resolved investigations matching a candidate '
  'kickout. Block A uses pure recency; code-aware ranking arrives in Block B.';

REVOKE ALL ON FUNCTION public.get_similar_kickout_resolutions(uuid, text, jsonb)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_similar_kickout_resolutions(uuid, text, jsonb)
  TO authenticated, service_role;

-- One batched count query powers first-render Inbox chips without N+1 fetches.
CREATE OR REPLACE FUNCTION public.get_similar_kickout_resolution_counts(
  p_engagement_ids uuid[]
)
RETURNS TABLE (
  engagement_id uuid,
  source_type text,
  match_key text,
  similar_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT
      i.engagement_id,
      i.kickout_source_type,
      i.kickout_source_id
    FROM public.audit_ready_kickout_investigations i
    WHERE i.engagement_id = ANY (p_engagement_ids)
      AND i.resolution_status = 'resolved'
      AND i.investigated_at >= now() - interval '6 months'
  ),
  keyed AS (
    SELECT
      s.engagement_id,
      'bs_summary_line'::text AS source_type,
      b.qbo_account_id AS match_key
    FROM scoped s
    JOIN public.audit_ready_bs_recon_summary_lines b
      ON b.id = s.kickout_source_id
    WHERE s.kickout_source_type = 'bs_summary_line'

    UNION ALL

    SELECT
      s.engagement_id,
      'pbc_run'::text AS source_type,
      r.tie_out_kind AS match_key
    FROM scoped s
    JOIN public.audit_ready_tie_out_runs r
      ON r.id = s.kickout_source_id
    WHERE s.kickout_source_type = 'pbc_run'
  )
  SELECT
    k.engagement_id,
    k.source_type,
    k.match_key,
    count(*)::bigint AS similar_count
  FROM keyed k
  WHERE k.match_key IS NOT NULL
  GROUP BY k.engagement_id, k.source_type, k.match_key;
$$;

COMMENT ON FUNCTION public.get_similar_kickout_resolution_counts(uuid[]) IS
  'Returns batched six-month similar-resolution counts for Kickout Inbox chips.';

REVOKE ALL ON FUNCTION public.get_similar_kickout_resolution_counts(uuid[])
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_similar_kickout_resolution_counts(uuid[])
  TO authenticated, service_role;
-- <<< end 20260725050100_ar_tieout420a_similar_kickouts_rpc.sql

-- >>> begin 20260725060000_ar_tieout42_memory_events.sql
-- Phase PBC-TIEOUT-4.2 Instrumentation: pilot-week event log
-- Purpose: capture Suggest-surface interaction data to drive Block B threshold design.
-- Retention: no TTL for pilot; can add cleanup job later if volume warrants.
-- Not to be reused for Pulse usage or ledger events — memory-specific by design.
-- Landmine: there is no audit_ready_engagement_members table. SELECT RLS mirrors
-- kickout_investigations via firm_memberships / company_users on engagements.

CREATE TABLE IF NOT EXISTS public.audit_ready_memory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  engagement_id uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  actor_user_id uuid NULL,
  event_at timestamptz NOT NULL DEFAULT NOW(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT audit_ready_memory_events_event_type_chk
    CHECK (event_type IN (
      'suggestions_shown',
      'suggestions_none',
      'copy_clicked',
      'resolution_saved'
    ))
);

CREATE INDEX IF NOT EXISTS audit_ready_memory_events_engagement_event_at_idx
  ON public.audit_ready_memory_events (engagement_id, event_at DESC);

CREATE INDEX IF NOT EXISTS audit_ready_memory_events_event_type_at_idx
  ON public.audit_ready_memory_events (event_type, event_at DESC);

ALTER TABLE public.audit_ready_memory_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_ready_memory_events_select
  ON public.audit_ready_memory_events;

CREATE POLICY audit_ready_memory_events_select
  ON public.audit_ready_memory_events
  FOR SELECT
  TO authenticated
  USING (
    engagement_id IN (
      SELECT e.id FROM public.audit_ready_engagements e
      WHERE
        (e.firm_id IS NOT NULL AND e.firm_id IN (
          SELECT firm_id FROM public.firm_memberships
          WHERE user_id = (SELECT auth.uid()) AND status = 'active'
        ))
        OR
        (e.company_id IS NOT NULL AND e.company_id IN (
          SELECT company_id FROM public.company_users
          WHERE user_id = (SELECT auth.uid()) AND status = 'active'
        ))
    )
  );

-- No INSERT/UPDATE/DELETE policies — service role only.

COMMENT ON TABLE public.audit_ready_memory_events IS
  'Phase 4.2 memory instrumentation. Server-side emission for suggestions_shown/none + resolution_saved; client fire-and-forget for copy_clicked. Feeds Block B threshold design. No TTL for pilot.';

COMMENT ON COLUMN public.audit_ready_memory_events.actor_user_id IS
  'User whose action produced the event. NULL for system-emitted (forward-compat for Block B memory_replay).';

COMMENT ON COLUMN public.audit_ready_memory_events.payload IS
  'Event-specific jsonb. Common fields: kickout_source_id, source_type, suggestion_count, top_resolution_code, copied_investigation_id, copied_resolution_code, resolution_status, resolution_code, was_copied, matched_copied_code.';
-- <<< end 20260725060000_ar_tieout42_memory_events.sql

-- >>> begin 20260727000100_users_auth_trigger_single_writer.sql
-- Phase FIX-USERS-PKEY: single-writer auth trigger
-- Retires all app-side inserts to public.users. Handler is source of truth.
-- Idempotent, safe to re-run.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  -- Idempotent insert. Populate metadata columns from raw_user_meta_data
  -- so signup form fields aren't lost when we retire the app-side writers.
  -- created_at has default now(); do not override so new signups get wall-clock time.
  insert into public.users (
    id,
    email,
    first_name,
    last_name,
    business_name
  )
  values (
    new.id,
    new.email,
    nullif(trim(meta->>'first_name'), ''),
    nullif(trim(meta->>'last_name'), ''),
    nullif(trim(meta->>'business_name'), '')
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    -- Fail-open: never block auth. Log for observability.
    raise notice '[handle_new_auth_user] failed to insert public.users row for auth.users.id=%: % (%)',
      new.id, sqlerrm, sqlstate;
    return new;
end;
$$;

-- Drop any prior trigger by this name (idempotency)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- Backfill: any existing auth.users without a public.users row.
-- Copy auth.users.created_at into public.users.created_at explicitly
-- so historical timestamps are preserved (default now() would clobber them).
insert into public.users (
  id,
  email,
  first_name,
  last_name,
  business_name,
  created_at
)
select
  au.id,
  au.email,
  nullif(trim((au.raw_user_meta_data->>'first_name')), ''),
  nullif(trim((au.raw_user_meta_data->>'last_name')), ''),
  nullif(trim((au.raw_user_meta_data->>'business_name')), ''),
  coalesce(au.created_at, now())
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null
on conflict (id) do nothing;

comment on function public.handle_new_auth_user() is
  'Phase FIX-USERS-PKEY: single-writer trigger. Do not add app-side inserts to public.users. See docs/fix-users-pkey.md.';
-- <<< end 20260727000100_users_auth_trigger_single_writer.sql

-- >>> begin 20260804213003_pilot_lifecycle_events.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260804213003
-- NAME: pilot_lifecycle_events
-- DATABASE_MD5_UTF8: 34ca62d02d68fac9fc81bf485ba1a02c
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 5454
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

-- Phase MEM-LIFECYCLE Block 1 — pilot_slots lifecycle memory event log

CREATE TABLE IF NOT EXISTS public.pilot_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event identity
  event_kind text NOT NULL,
  event_at timestamptz NOT NULL DEFAULT NOW(),
  schema_version text NOT NULL DEFAULT '42.7E.1',

  -- Subject
  pilot_slot_id uuid NOT NULL,
  from_status text NULL,
  to_status text NOT NULL,
  classification_hint text NULL,

  -- Isolation (caller-resolved from pilot_slots)
  company_id uuid NULL,
  firm_id uuid NULL,

  -- Actor
  actor_kind text NOT NULL,
  actor_user_id uuid NULL,
  actor_via text NOT NULL,

  -- Assertion tagging (LOCKED PCAOB-6 taxonomy)
  assertions_covered text[] NOT NULL DEFAULT ARRAY[]::text[],

  -- Evidence linkage
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason_code text NOT NULL,
  reason_text text NULL,

  -- Payload
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Hash chain (populated by BEFORE INSERT trigger in Block 2)
  prev_hash text NULL,
  row_hash text NULL,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT pilot_lifecycle_events_event_kind_chk
    CHECK (event_kind IN (
      'pilot.lifecycle.transition',
      'pilot.lifecycle.drift-detected',
      'pilot.lifecycle.auto-reconciled',
      'pilot.lifecycle.escalated',
      'pilot.lifecycle.recurred'
    )),
  CONSTRAINT pilot_lifecycle_events_actor_kind_chk
    CHECK (actor_kind IN ('user', 'system', 'external')),
  CONSTRAINT pilot_lifecycle_events_actor_via_chk
    CHECK (actor_via IN (
      'panel-consumer',
      'role-adapter',
      'org-edge',
      'direct-api',
      'admin-script',
      'stripe-webhook',
      'cdc-auditor'
    )),
  CONSTRAINT pilot_lifecycle_events_isolation_chk
    CHECK (company_id IS NOT NULL OR firm_id IS NOT NULL),
  CONSTRAINT pilot_lifecycle_events_assertions_subset_chk
    CHECK (assertions_covered <@ ARRAY[
      'existence',
      'completeness',
      'accuracy',
      'valuation',
      'rights_obligations',
      'presentation_disclosure'
    ]::text[])
);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_events_pilot_slot_event_at_idx
  ON public.pilot_lifecycle_events (pilot_slot_id, event_at DESC);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_events_company_event_at_idx
  ON public.pilot_lifecycle_events (company_id, event_at DESC)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pilot_lifecycle_events_firm_event_at_idx
  ON public.pilot_lifecycle_events (firm_id, event_at DESC)
  WHERE firm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pilot_lifecycle_events_event_kind_at_idx
  ON public.pilot_lifecycle_events (event_kind, event_at DESC);

ALTER TABLE public.pilot_lifecycle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pilot_lifecycle_events_select
  ON public.pilot_lifecycle_events;

CREATE POLICY pilot_lifecycle_events_select
  ON public.pilot_lifecycle_events
  FOR SELECT
  TO authenticated
  USING (
    (company_id IS NOT NULL AND company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    ))
    OR
    (firm_id IS NOT NULL AND firm_id IN (
      SELECT firm_id FROM public.firm_memberships
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    ))
  );

COMMENT ON TABLE public.pilot_lifecycle_events IS
  'Phase MEM-LIFECYCLE Block 1. First production table storing memory-builder output. Immutable, hash-chained record of every pilot_slots state transition. All writes go through lib/pilot-lifecycle SSOT module (Block 3) and the BEFORE INSERT hash-chain trigger (Block 2). Feeds Timeline UI (Block 5), state machine (Block 6), Coverage PDF (Block 7), RFC 3161 anchoring (Block 9). No TTL — retention is permanent per audit doctrine.';

COMMENT ON COLUMN public.pilot_lifecycle_events.event_kind IS
  'AuditEventKind extension. Reserved namespace pilot.lifecycle.* per audit README convention. See lib/audit-log-writer/types (Block 3 extension).';

COMMENT ON COLUMN public.pilot_lifecycle_events.classification_hint IS
  'Free-text hint for the >2-target-state case (e.g., cancelled vs converted vs drifted). Frontier UX research (2026) recommends Classification as a distinct ISA 315 assertion; we preserve the information here without forking the LOCKED PCAOB-6 taxonomy.';

COMMENT ON COLUMN public.pilot_lifecycle_events.assertions_covered IS
  'Subset of LOCKED PCAOB-6 taxonomy (lib/audit-ready/assertion-taxonomy.ts). CHECK constraint enforces subset. For pilot_slots lifecycle events, typical values: {existence, completeness, accuracy}. Do NOT extend without updating Provisional #6 Component E.';

COMMENT ON COLUMN public.pilot_lifecycle_events.evidence_refs IS
  'jsonb array of evidence pointers. Shape: [{"kind":"stripe.event","id":"evt_...","url":"stripe:dashboard:..."},{"kind":"webhook.event","id":"we_..."},{"kind":"pilot_slot.snapshot","id":"...","hash":"sha256:..."}]. Drives the Trullion-shape evidence drawer in Block 5.';

COMMENT ON COLUMN public.pilot_lifecycle_events.row_hash IS
  'sha256(prev_hash || canonical_payload). Computed in-transaction by BEFORE INSERT trigger (Block 2). NEVER writeable from application layer.';

COMMENT ON COLUMN public.pilot_lifecycle_events.prev_hash IS
  'row_hash of the immediately-prior row for the same (company_id, firm_id) partition. NULL only for the first row per partition. Trigger enforces.';
-- <<< end 20260804213003_pilot_lifecycle_events.sql

-- >>> begin 20260804213819_pilot_lifecycle_events_hash_chain_trigger.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260804213819
-- NAME: pilot_lifecycle_events_hash_chain_trigger
-- DATABASE_MD5_UTF8: 5ede7d6c22fe4b9ba15e9b038e5379dc
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 7738
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_canonical_payload(
  p_event_kind text,
  p_event_at timestamptz,
  p_schema_version text,
  p_pilot_slot_id uuid,
  p_from_status text,
  p_to_status text,
  p_classification_hint text,
  p_company_id uuid,
  p_firm_id uuid,
  p_actor_kind text,
  p_actor_user_id uuid,
  p_actor_via text,
  p_assertions_covered text[],
  p_evidence_refs jsonb,
  p_reason_code text,
  p_reason_text text,
  p_payload jsonb
) RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'event_kind', p_event_kind,
    'event_at', to_char(p_event_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'schema_version', p_schema_version,
    'pilot_slot_id', p_pilot_slot_id::text,
    'from_status', p_from_status,
    'to_status', p_to_status,
    'classification_hint', p_classification_hint,
    'company_id', p_company_id::text,
    'firm_id', p_firm_id::text,
    'actor_kind', p_actor_kind,
    'actor_user_id', p_actor_user_id::text,
    'actor_via', p_actor_via,
    'assertions_covered', to_jsonb(
      ARRAY(SELECT unnest(p_assertions_covered) ORDER BY 1)
    ),
    'evidence_refs', p_evidence_refs,
    'reason_code', p_reason_code,
    'reason_text', p_reason_text,
    'payload', p_payload
  )::text
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_canonical_payload IS
  'Deterministic serializer for hash-chain input. Excludes id/created_at/prev_hash/row_hash. Assertions are sorted alphabetically so a{existence,completeness} hashes identically to {completeness,existence}.';

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_slot_company_id uuid;
  v_slot_firm_id uuid;
  v_prev_hash text;
  v_canonical text;
BEGIN
  SELECT company_id, firm_id
    INTO v_slot_company_id, v_slot_firm_id
  FROM public.pilot_slots
  WHERE id = NEW.pilot_slot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: pilot_slot_id % does not exist',
      NEW.pilot_slot_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  NEW.company_id := v_slot_company_id;
  NEW.firm_id := v_slot_firm_id;

  IF NEW.prev_hash IS NOT NULL OR NEW.row_hash IS NOT NULL THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: prev_hash and row_hash are trigger-managed; application code must not set them'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.company_id IS NOT NULL THEN
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE company_id = NEW.company_id
    ORDER BY event_at DESC, id DESC
    LIMIT 1;
  ELSE
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE firm_id = NEW.firm_id
    ORDER BY event_at DESC, id DESC
    LIMIT 1;
  END IF;

  NEW.prev_hash := v_prev_hash;

  v_canonical := public.pilot_lifecycle_events_canonical_payload(
    NEW.event_kind,
    NEW.event_at,
    NEW.schema_version,
    NEW.pilot_slot_id,
    NEW.from_status,
    NEW.to_status,
    NEW.classification_hint,
    NEW.company_id,
    NEW.firm_id,
    NEW.actor_kind,
    NEW.actor_user_id,
    NEW.actor_via,
    NEW.assertions_covered,
    NEW.evidence_refs,
    NEW.reason_code,
    NEW.reason_text,
    NEW.payload
  );

  NEW.row_hash := 'sha256:' || encode(
    digest(coalesce(NEW.prev_hash, '') || v_canonical, 'sha256'),
    'hex'
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_before_insert IS
  'In-transaction hash-chain enforcement. Frontier UX Q4 Candidate A pattern: computes hash locally in PL/pgSQL, no network hop, fail-closed. Overrides caller-supplied isolation with authoritative pilot_slots values.';

DROP TRIGGER IF EXISTS pilot_lifecycle_events_before_insert_trg
  ON public.pilot_lifecycle_events;

CREATE TRIGGER pilot_lifecycle_events_before_insert_trg
  BEFORE INSERT ON public.pilot_lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pilot_lifecycle_events_before_insert();

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_reject_mutations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'pilot_lifecycle_events is append-only. Corrections must be new INSERTs (audit trail is sacred). Attempted operation: %',
    TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_reject_mutations IS
  'Append-only enforcement. UPDATE and DELETE fail closed. TigerBeetle doctrine: correction by addition, never mutation.';

DROP TRIGGER IF EXISTS pilot_lifecycle_events_reject_update_trg
  ON public.pilot_lifecycle_events;

CREATE TRIGGER pilot_lifecycle_events_reject_update_trg
  BEFORE UPDATE ON public.pilot_lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pilot_lifecycle_events_reject_mutations();

DROP TRIGGER IF EXISTS pilot_lifecycle_events_reject_delete_trg
  ON public.pilot_lifecycle_events;

CREATE TRIGGER pilot_lifecycle_events_reject_delete_trg
  BEFORE DELETE ON public.pilot_lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pilot_lifecycle_events_reject_mutations();

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_verify_chain(
  p_company_id uuid DEFAULT NULL,
  p_firm_id uuid DEFAULT NULL
) RETURNS TABLE (
  first_broken_event_id uuid,
  first_broken_event_at timestamptz,
  expected_prev_hash text,
  actual_prev_hash text,
  expected_row_hash text,
  actual_row_hash text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row record;
  v_expected_prev text := NULL;
  v_recomputed_hash text;
  v_canonical text;
BEGIN
  IF (p_company_id IS NULL AND p_firm_id IS NULL) OR
     (p_company_id IS NOT NULL AND p_firm_id IS NOT NULL) THEN
    RAISE EXCEPTION 'pilot_lifecycle_events_verify_chain: pass exactly one of p_company_id or p_firm_id';
  END IF;

  FOR v_row IN
    SELECT * FROM public.pilot_lifecycle_events
    WHERE (p_company_id IS NOT NULL AND company_id = p_company_id)
       OR (p_firm_id IS NOT NULL AND firm_id = p_firm_id)
    ORDER BY event_at ASC, id ASC
  LOOP
    v_canonical := public.pilot_lifecycle_events_canonical_payload(
      v_row.event_kind, v_row.event_at, v_row.schema_version,
      v_row.pilot_slot_id, v_row.from_status, v_row.to_status,
      v_row.classification_hint, v_row.company_id, v_row.firm_id,
      v_row.actor_kind, v_row.actor_user_id, v_row.actor_via,
      v_row.assertions_covered, v_row.evidence_refs,
      v_row.reason_code, v_row.reason_text, v_row.payload
    );

    v_recomputed_hash := 'sha256:' || encode(
      digest(coalesce(v_expected_prev, '') || v_canonical, 'sha256'),
      'hex'
    );

    IF v_row.prev_hash IS DISTINCT FROM v_expected_prev
       OR v_row.row_hash IS DISTINCT FROM v_recomputed_hash THEN
      first_broken_event_id := v_row.id;
      first_broken_event_at := v_row.event_at;
      expected_prev_hash := v_expected_prev;
      actual_prev_hash := v_row.prev_hash;
      expected_row_hash := v_recomputed_hash;
      actual_row_hash := v_row.row_hash;
      RETURN NEXT;
      RETURN;
    END IF;

    v_expected_prev := v_row.row_hash;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_verify_chain IS
  'Read-only chain verification. Returns exactly one row (the first broken link) if the chain is broken, or no rows if intact. Called by CDC auditor and Block 9 verifier UI. Frontier UX Q2 pattern: honest verification, no silent degradation.';

REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_verify_chain(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_verify_chain(uuid, uuid) FROM authenticated;
-- <<< end 20260804213819_pilot_lifecycle_events_hash_chain_trigger.sql

-- >>> begin 20260804213934_pilot_lifecycle_events_hash_digest_bytea_fix.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260804213934
-- NAME: pilot_lifecycle_events_hash_digest_bytea_fix
-- DATABASE_MD5_UTF8: 804e70213d39474337ad6a0526df4120
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 3968
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_slot_company_id uuid;
  v_slot_firm_id uuid;
  v_prev_hash text;
  v_canonical text;
BEGIN
  SELECT company_id, firm_id
    INTO v_slot_company_id, v_slot_firm_id
  FROM public.pilot_slots
  WHERE id = NEW.pilot_slot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: pilot_slot_id % does not exist',
      NEW.pilot_slot_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  NEW.company_id := v_slot_company_id;
  NEW.firm_id := v_slot_firm_id;

  IF NEW.prev_hash IS NOT NULL OR NEW.row_hash IS NOT NULL THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: prev_hash and row_hash are trigger-managed; application code must not set them'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.company_id IS NOT NULL THEN
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE company_id = NEW.company_id
    ORDER BY event_at DESC, id DESC
    LIMIT 1;
  ELSE
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE firm_id = NEW.firm_id
    ORDER BY event_at DESC, id DESC
    LIMIT 1;
  END IF;

  NEW.prev_hash := v_prev_hash;

  v_canonical := public.pilot_lifecycle_events_canonical_payload(
    NEW.event_kind,
    NEW.event_at,
    NEW.schema_version,
    NEW.pilot_slot_id,
    NEW.from_status,
    NEW.to_status,
    NEW.classification_hint,
    NEW.company_id,
    NEW.firm_id,
    NEW.actor_kind,
    NEW.actor_user_id,
    NEW.actor_via,
    NEW.assertions_covered,
    NEW.evidence_refs,
    NEW.reason_code,
    NEW.reason_text,
    NEW.payload
  );

  NEW.row_hash := 'sha256:' || encode(
    digest(convert_to(coalesce(NEW.prev_hash, '') || v_canonical, 'UTF8'), 'sha256'),
    'hex'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_verify_chain(
  p_company_id uuid DEFAULT NULL,
  p_firm_id uuid DEFAULT NULL
) RETURNS TABLE (
  first_broken_event_id uuid,
  first_broken_event_at timestamptz,
  expected_prev_hash text,
  actual_prev_hash text,
  expected_row_hash text,
  actual_row_hash text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row record;
  v_expected_prev text := NULL;
  v_recomputed_hash text;
  v_canonical text;
BEGIN
  IF (p_company_id IS NULL AND p_firm_id IS NULL) OR
     (p_company_id IS NOT NULL AND p_firm_id IS NOT NULL) THEN
    RAISE EXCEPTION 'pilot_lifecycle_events_verify_chain: pass exactly one of p_company_id or p_firm_id';
  END IF;

  FOR v_row IN
    SELECT * FROM public.pilot_lifecycle_events
    WHERE (p_company_id IS NOT NULL AND company_id = p_company_id)
       OR (p_firm_id IS NOT NULL AND firm_id = p_firm_id)
    ORDER BY event_at ASC, id ASC
  LOOP
    v_canonical := public.pilot_lifecycle_events_canonical_payload(
      v_row.event_kind, v_row.event_at, v_row.schema_version,
      v_row.pilot_slot_id, v_row.from_status, v_row.to_status,
      v_row.classification_hint, v_row.company_id, v_row.firm_id,
      v_row.actor_kind, v_row.actor_user_id, v_row.actor_via,
      v_row.assertions_covered, v_row.evidence_refs,
      v_row.reason_code, v_row.reason_text, v_row.payload
    );

    v_recomputed_hash := 'sha256:' || encode(
      digest(convert_to(coalesce(v_expected_prev, '') || v_canonical, 'UTF8'), 'sha256'),
      'hex'
    );

    IF v_row.prev_hash IS DISTINCT FROM v_expected_prev
       OR v_row.row_hash IS DISTINCT FROM v_recomputed_hash THEN
      first_broken_event_id := v_row.id;
      first_broken_event_at := v_row.event_at;
      expected_prev_hash := v_expected_prev;
      actual_prev_hash := v_row.prev_hash;
      expected_row_hash := v_recomputed_hash;
      actual_row_hash := v_row.row_hash;
      RETURN NEXT;
      RETURN;
    END IF;

    v_expected_prev := v_row.row_hash;
  END LOOP;

  RETURN;
END;
$$;
-- <<< end 20260804213934_pilot_lifecycle_events_hash_digest_bytea_fix.sql

-- >>> begin 20260804220220_pilot_lifecycle_events_chain_seq_hardening.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260804220220
-- NAME: pilot_lifecycle_events_chain_seq_hardening
-- DATABASE_MD5_UTF8: 0dfe89813e31c0cf5341d8fd65ab4c18
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 17126
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

-- Phase MEM-LIFECYCLE Block 2.5 — chain_seq hardening
--
-- Adds a bigint sequence column as the canonical hash-chain order key,
-- eliminating same-timestamp ordering ambiguity. Serializes concurrent
-- inserts against the same partition via pg_advisory_xact_lock. Adds
-- fork-prevention unique indexes as defense-in-depth.
--
-- Ordering discipline (research-driven — mem2_hash_chain_ordering.md Q1):
--   - chain_seq is the sole ordering primitive for chain-linking.
--   - Trigger: ORDER BY chain_seq DESC LIMIT 1 for prev-hash lookup.
--   - Verifier: ORDER BY chain_seq ASC for the chain walk.
--   - event_at remains for display / range queries only.
--
-- Concurrency (research-driven — mem2_hash_chain_ordering.md Q2):
--   - pg_advisory_xact_lock(hashtext(partition_key)) at trigger top.
--   - Handles first-row-in-partition bootstrap (which SELECT FOR UPDATE
--     cannot, since no tail row exists yet).
--   - Released automatically on commit or rollback.
--   - Non-WAL-logged, invisible to CDC — Block 9's WAL auditor is unaffected.
--
-- Fork prevention (defense-in-depth):
--   - UNIQUE (company_id, prev_hash) WHERE company_id IS NOT NULL AND prev_hash IS NOT NULL
--   - UNIQUE (firm_id, prev_hash)    WHERE firm_id    IS NOT NULL AND prev_hash IS NOT NULL
--   - UNIQUE (company_id)            WHERE company_id IS NOT NULL AND prev_hash IS NULL  -- one genesis per company partition
--   - UNIQUE (firm_id)               WHERE firm_id    IS NOT NULL AND prev_hash IS NULL  -- one genesis per firm partition

-- ---------------------------------------------------------------------------
-- Step 0: Drop the reject-UPDATE trigger temporarily so we can backfill.
-- Reject-DELETE stays on. We reinstall reject-UPDATE at the end.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS pilot_lifecycle_events_reject_update_trg
  ON public.pilot_lifecycle_events;

-- ---------------------------------------------------------------------------
-- Step 1: Create the sequence and add the column (nullable for now).
-- ---------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS public.pilot_lifecycle_events_chain_seq_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

COMMENT ON SEQUENCE public.pilot_lifecycle_events_chain_seq_seq IS
  'Monotonic integer for pilot_lifecycle_events.chain_seq. Assigned by BEFORE INSERT trigger. Sole ordering primitive for hash-chain linking. See research/mem2_hash_chain_ordering.md Q1.';

ALTER TABLE public.pilot_lifecycle_events
  ADD COLUMN IF NOT EXISTS chain_seq bigint;

COMMENT ON COLUMN public.pilot_lifecycle_events.chain_seq IS
  'Monotonic sequence for hash-chain ordering. Assigned by BEFORE INSERT trigger. Do not set from application code — trigger overwrites. Sole primitive for chain-linking; event_at is display-only.';

-- ---------------------------------------------------------------------------
-- Step 2: Backfill chain_seq in event_at ASC, id ASC order.
-- Preserves existing chain integrity: the trigger will use chain_seq DESC
-- for prev-lookup after this migration, and the assigned values match the
-- rows' existing prev_hash / row_hash linkage 1:1.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_row record;
  v_next bigint;
BEGIN
  v_next := 1;
  FOR v_row IN
    SELECT id
    FROM public.pilot_lifecycle_events
    WHERE chain_seq IS NULL
    ORDER BY event_at ASC, id ASC
  LOOP
    UPDATE public.pilot_lifecycle_events
      SET chain_seq = v_next
    WHERE id = v_row.id;
    v_next := v_next + 1;
  END LOOP;

  IF v_next > 1 THEN
    PERFORM setval('public.pilot_lifecycle_events_chain_seq_seq', v_next - 1, true);
    RAISE NOTICE 'chain_seq backfill: assigned % rows, sequence advanced to %', v_next - 1, v_next - 1;
  ELSE
    RAISE NOTICE 'chain_seq backfill: no rows to backfill (table is empty), sequence remains at 1';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Step 3: Set NOT NULL now that all rows have chain_seq populated.
-- ---------------------------------------------------------------------------

ALTER TABLE public.pilot_lifecycle_events
  ALTER COLUMN chain_seq SET NOT NULL;

ALTER TABLE public.pilot_lifecycle_events
  ALTER COLUMN chain_seq SET DEFAULT nextval('public.pilot_lifecycle_events_chain_seq_seq');

-- Note: DEFAULT is set for schema completeness, but the trigger will
-- overwrite it explicitly. The trigger fires BEFORE INSERT and computes
-- chain_seq under the advisory lock, so racing INSERTs cannot see stale
-- sequence values relative to each other's row_hash computation.
-- Actually — nextval() is atomic and every call returns a fresh value
-- regardless of transaction state, so a DEFAULT-assigned chain_seq is
-- monotonic-safe on its own. We keep the trigger doing chain_seq := nextval
-- explicitly for clarity and to keep sequence generation inside the
-- advisory-lock window (defensive; not strictly required for correctness).

-- ---------------------------------------------------------------------------
-- Step 4: Unique constraints for fork prevention (defense-in-depth).
-- These prevent two rows in the same partition from claiming the same
-- prev_hash (or from both being "genesis" rows with prev_hash NULL).
-- The advisory lock is the primary defense; these indexes are the belt.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS pilot_lifecycle_events_no_fork_company
  ON public.pilot_lifecycle_events (company_id, prev_hash)
  WHERE company_id IS NOT NULL AND prev_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pilot_lifecycle_events_no_fork_firm
  ON public.pilot_lifecycle_events (firm_id, prev_hash)
  WHERE firm_id IS NOT NULL AND prev_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pilot_lifecycle_events_one_genesis_company
  ON public.pilot_lifecycle_events (company_id)
  WHERE company_id IS NOT NULL AND prev_hash IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pilot_lifecycle_events_one_genesis_firm
  ON public.pilot_lifecycle_events (firm_id)
  WHERE firm_id IS NOT NULL AND prev_hash IS NULL;

COMMENT ON INDEX public.pilot_lifecycle_events_no_fork_company IS
  'Fork prevention: at most one row per (company_id, prev_hash). Complements pg_advisory_xact_lock in the trigger; does not replace it (research/mem2_hash_chain_ordering.md Q2 §What to avoid).';

COMMENT ON INDEX public.pilot_lifecycle_events_no_fork_firm IS
  'Fork prevention: at most one row per (firm_id, prev_hash). Complements pg_advisory_xact_lock in the trigger.';

COMMENT ON INDEX public.pilot_lifecycle_events_one_genesis_company IS
  'At most one genesis row (prev_hash IS NULL) per company partition.';

COMMENT ON INDEX public.pilot_lifecycle_events_one_genesis_firm IS
  'At most one genesis row (prev_hash IS NULL) per firm partition.';

-- ---------------------------------------------------------------------------
-- Step 5: Replace the BEFORE INSERT trigger function.
--   - Acquire pg_advisory_xact_lock(hashtext(partition_key)) at the top.
--   - Assign chain_seq := nextval() inside the lock.
--   - Use ORDER BY chain_seq DESC LIMIT 1 for prev-hash lookup.
--   - Same canonical_payload / row_hash computation as Block 2.
--   - canonical_payload signature does NOT include chain_seq — chain_seq is
--     a store-assigned pointer, not semantic content. Including it in the
--     hash would make the hash uncheckable from a WAL replay that doesn't
--     have the sequence state.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_slot_company_id uuid;
  v_slot_firm_id uuid;
  v_prev_hash text;
  v_canonical text;
  v_partition_key text;
BEGIN
  -- Step 1: Resolve authoritative isolation from pilot_slots.
  SELECT company_id, firm_id
    INTO v_slot_company_id, v_slot_firm_id
  FROM public.pilot_slots
  WHERE id = NEW.pilot_slot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: pilot_slot_id % does not exist',
      NEW.pilot_slot_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  NEW.company_id := v_slot_company_id;
  NEW.firm_id := v_slot_firm_id;

  -- Step 2: Reject caller-supplied hash / seq values.
  IF NEW.prev_hash IS NOT NULL OR NEW.row_hash IS NOT NULL THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: prev_hash and row_hash are trigger-managed; application code must not set them'
      USING ERRCODE = 'check_violation';
  END IF;

  -- chain_seq is also trigger-managed. Reject any client-supplied value
  -- other than the sequence default (which arrives here as a fresh nextval
  -- from the DEFAULT clause). We overwrite it deterministically inside the
  -- advisory lock below, so we do NOT reject non-null NEW.chain_seq at
  -- this point — Postgres's DEFAULT mechanism already assigned one before
  -- the trigger fired. The overwrite below takes precedence.

  -- Step 3: Build partition_key and acquire the advisory lock.
  -- Partition key format: 'company:<uuid>' or 'firm:<uuid>' — disambiguates
  -- the (rare-but-possible) case where a company_id and firm_id UUID share
  -- lexical prefix or hash collision zones. hashtext() produces int4; that
  -- is the input pg_advisory_xact_lock(bigint) expects (implicit cast).
  IF NEW.company_id IS NOT NULL THEN
    v_partition_key := 'company:' || NEW.company_id::text;
  ELSE
    v_partition_key := 'firm:' || NEW.firm_id::text;
  END IF;

  -- pg_advisory_xact_lock is released automatically at end of transaction
  -- (commit OR rollback), per Postgres docs on advisory locks. This
  -- serializes concurrent inserts against the same partition, closing the
  -- fork race that pure BEFORE-INSERT logic cannot handle.
  PERFORM pg_advisory_xact_lock(hashtext(v_partition_key)::bigint);

  -- Step 4: Look up prev_hash via chain_seq (the canonical order key).
  -- Under the advisory lock, this is the true current tail — no peer
  -- transaction can be in the middle of appending without waiting on us
  -- (or vice versa).
  IF NEW.company_id IS NOT NULL THEN
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE company_id = NEW.company_id
    ORDER BY chain_seq DESC
    LIMIT 1;
  ELSE
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE firm_id = NEW.firm_id
    ORDER BY chain_seq DESC
    LIMIT 1;
  END IF;

  NEW.prev_hash := v_prev_hash;

  -- Step 5: Overwrite chain_seq with a fresh sequence value.
  -- We already got one from DEFAULT nextval() at row-construction time,
  -- but that assignment happened BEFORE the advisory lock. To keep sequence
  -- issuance ordered with respect to prev-hash lookup under contention,
  -- issue a new one now inside the lock. The previous value is burned
  -- (gap in the sequence — that's the documented and acceptable behavior).
  NEW.chain_seq := nextval('public.pilot_lifecycle_events_chain_seq_seq');

  -- Step 6: Compute canonical payload and row_hash.
  -- canonical_payload does NOT include chain_seq — it is a pointer, not
  -- semantic content. Including it would make WAL-replay verification
  -- brittle (a replayed insert on a fresh sequence would get a different
  -- chain_seq and thus a different row_hash).
  v_canonical := public.pilot_lifecycle_events_canonical_payload(
    NEW.event_kind,
    NEW.event_at,
    NEW.schema_version,
    NEW.pilot_slot_id,
    NEW.from_status,
    NEW.to_status,
    NEW.classification_hint,
    NEW.company_id,
    NEW.firm_id,
    NEW.actor_kind,
    NEW.actor_user_id,
    NEW.actor_via,
    NEW.assertions_covered,
    NEW.evidence_refs,
    NEW.reason_code,
    NEW.reason_text,
    NEW.payload
  );

  NEW.row_hash := 'sha256:' || encode(
    digest(convert_to(coalesce(NEW.prev_hash, '') || v_canonical, 'UTF8'), 'sha256'::text),
    'hex'
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_before_insert IS
  'Hash-chain enforcement with advisory-lock serialization. Uses chain_seq (bigint sequence) as the canonical order key — event_at is display-only. Research: /home/user/workspace/research/mem2_hash_chain_ordering.md Q1+Q2.';

-- Trigger itself is unchanged (still BEFORE INSERT FOR EACH ROW), but
-- re-drop / re-create to be idempotent.
DROP TRIGGER IF EXISTS pilot_lifecycle_events_before_insert_trg
  ON public.pilot_lifecycle_events;

CREATE TRIGGER pilot_lifecycle_events_before_insert_trg
  BEFORE INSERT ON public.pilot_lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pilot_lifecycle_events_before_insert();

-- ---------------------------------------------------------------------------
-- Step 6: Replace the verify_chain RPC to walk ORDER BY chain_seq ASC.
-- Same shape as Block 2, but uses chain_seq for both order and internal
-- record-linking. Signature unchanged so callers do not need updates.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_verify_chain(
  p_company_id uuid DEFAULT NULL,
  p_firm_id uuid DEFAULT NULL
) RETURNS TABLE (
  first_broken_event_id uuid,
  first_broken_event_at timestamptz,
  expected_prev_hash text,
  actual_prev_hash text,
  expected_row_hash text,
  actual_row_hash text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_row record;
  v_expected_prev text := NULL;
  v_recomputed_hash text;
  v_canonical text;
BEGIN
  IF (p_company_id IS NULL AND p_firm_id IS NULL) OR
     (p_company_id IS NOT NULL AND p_firm_id IS NOT NULL) THEN
    RAISE EXCEPTION 'pilot_lifecycle_events_verify_chain: pass exactly one of p_company_id or p_firm_id';
  END IF;

  FOR v_row IN
    SELECT * FROM public.pilot_lifecycle_events
    WHERE (p_company_id IS NOT NULL AND company_id = p_company_id)
       OR (p_firm_id IS NOT NULL AND firm_id = p_firm_id)
    ORDER BY chain_seq ASC
  LOOP
    v_canonical := public.pilot_lifecycle_events_canonical_payload(
      v_row.event_kind, v_row.event_at, v_row.schema_version,
      v_row.pilot_slot_id, v_row.from_status, v_row.to_status,
      v_row.classification_hint, v_row.company_id, v_row.firm_id,
      v_row.actor_kind, v_row.actor_user_id, v_row.actor_via,
      v_row.assertions_covered, v_row.evidence_refs,
      v_row.reason_code, v_row.reason_text, v_row.payload
    );

    v_recomputed_hash := 'sha256:' || encode(
      digest(convert_to(coalesce(v_row.prev_hash, '') || v_canonical, 'UTF8'), 'sha256'::text),
      'hex'
    );

    -- Check prev_hash linkage
    IF v_row.prev_hash IS DISTINCT FROM v_expected_prev THEN
      first_broken_event_id := v_row.id;
      first_broken_event_at := v_row.event_at;
      expected_prev_hash := v_expected_prev;
      actual_prev_hash := v_row.prev_hash;
      expected_row_hash := v_recomputed_hash;
      actual_row_hash := v_row.row_hash;
      RETURN NEXT;
      RETURN;
    END IF;

    -- Check row_hash integrity
    IF v_row.row_hash IS DISTINCT FROM v_recomputed_hash THEN
      first_broken_event_id := v_row.id;
      first_broken_event_at := v_row.event_at;
      expected_prev_hash := v_expected_prev;
      actual_prev_hash := v_row.prev_hash;
      expected_row_hash := v_recomputed_hash;
      actual_row_hash := v_row.row_hash;
      RETURN NEXT;
      RETURN;
    END IF;

    v_expected_prev := v_row.row_hash;
  END LOOP;

  -- Chain intact — return zero rows.
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.pilot_lifecycle_events_verify_chain IS
  'Walks the hash chain for one partition (company_id XOR firm_id) in chain_seq ASC order and returns the first broken link, or zero rows if the chain is intact. Order agrees with the BEFORE INSERT trigger by construction (both use chain_seq).';

-- ---------------------------------------------------------------------------
-- Step 7: Reinstall the reject-UPDATE trigger.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS pilot_lifecycle_events_reject_update_trg
  ON public.pilot_lifecycle_events;

CREATE TRIGGER pilot_lifecycle_events_reject_update_trg
  BEFORE UPDATE ON public.pilot_lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pilot_lifecycle_events_reject_mutations();

-- ---------------------------------------------------------------------------
-- Step 8: Revoke EXECUTE on internal helpers (audit hygiene).
-- verify_chain stays callable by service_role and authenticated for the
-- Timeline UI drawer (Block 5) and the Block 9 cron; canonical_payload
-- stays PUBLIC because it is deterministic and side-effect-free.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.pilot_lifecycle_events_before_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pilot_lifecycle_events_reject_mutations() FROM PUBLIC;
-- <<< end 20260804220220_pilot_lifecycle_events_chain_seq_hardening.sql

-- >>> begin 20260804234230_lifecycle_issues.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260804234230
-- NAME: lifecycle_issues
-- DATABASE_MD5_UTF8: 0b75c1945dea894acbe0427a847d13c5
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 3274
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

-- Phase MEM_LIFECYCLE Block 6
ALTER TABLE public.pilot_lifecycle_events DROP CONSTRAINT IF EXISTS pilot_lifecycle_events_event_kind_chk;
ALTER TABLE public.pilot_lifecycle_events ADD CONSTRAINT pilot_lifecycle_events_event_kind_chk CHECK (event_kind IN (
  'pilot.lifecycle.transition','pilot.lifecycle.drift-detected','pilot.lifecycle.auto-reconciled','pilot.lifecycle.escalated','pilot.lifecycle.recurred','pilot.lifecycle.created','pilot.lifecycle.assertion.evidence-attached','pilot.lifecycle.transition.rejected'
));
ALTER TABLE public.pilot_lifecycle_events DROP CONSTRAINT IF EXISTS pilot_lifecycle_events_to_status_null_scope_chk;
ALTER TABLE public.pilot_lifecycle_events DROP CONSTRAINT IF EXISTS pilot_lifecycle_events_to_status_scope_chk;
ALTER TABLE public.pilot_lifecycle_events ADD CONSTRAINT pilot_lifecycle_events_to_status_scope_chk CHECK ((to_status IS NOT NULL) OR (event_kind = 'pilot.lifecycle.assertion.evidence-attached'));

CREATE TABLE IF NOT EXISTS public.lifecycle_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  detected_at timestamptz NOT NULL DEFAULT NOW(),
  fingerprint text NOT NULL,
  level text NOT NULL,
  issue_kind text NOT NULL,
  pilot_slot_id uuid NULL,
  company_id uuid NULL,
  firm_id uuid NULL,
  tags jsonb NOT NULL DEFAULT '{}'::jsonb,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz NULL,
  resolved_by uuid NULL,
  resolution_note text NULL,
  sentry_event_id text NULL,
  CONSTRAINT lifecycle_issues_level_chk CHECK (level IN ('info','warning','error','fatal')),
  CONSTRAINT lifecycle_issues_issue_kind_chk CHECK (issue_kind IN ('pilot.lifecycle.drift.detected','pilot.lifecycle.transition.rejected','pilot.lifecycle.chain.integrity.broken','pilot.lifecycle.monitor.error')),
  CONSTRAINT lifecycle_issues_partition_chk CHECK (company_id IS NOT NULL OR firm_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_issues_fingerprint_hour_uidx ON public.lifecycle_issues (fingerprint, (date_trunc('hour', timezone('UTC', detected_at))));
CREATE INDEX IF NOT EXISTS lifecycle_issues_detected_at_idx ON public.lifecycle_issues (detected_at DESC);
CREATE INDEX IF NOT EXISTS lifecycle_issues_company_detected_idx ON public.lifecycle_issues (company_id, detected_at DESC) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lifecycle_issues_firm_detected_idx ON public.lifecycle_issues (firm_id, detected_at DESC) WHERE firm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lifecycle_issues_unresolved_idx ON public.lifecycle_issues (level, detected_at DESC) WHERE resolved_at IS NULL;

ALTER TABLE public.lifecycle_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lifecycle_issues_partition_read ON public.lifecycle_issues;
CREATE POLICY lifecycle_issues_partition_read ON public.lifecycle_issues FOR SELECT TO authenticated USING ((company_id IS NOT NULL AND company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND status = 'active')) OR (firm_id IS NOT NULL AND firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid() AND status = 'active')));
REVOKE ALL ON public.lifecycle_issues FROM anon;
GRANT SELECT ON public.lifecycle_issues TO authenticated;
GRANT ALL ON public.lifecycle_issues TO service_role;
-- <<< end 20260804234230_lifecycle_issues.sql

-- >>> begin 20260805005320_pilot_lifecycle_anchors.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260805005320
-- NAME: pilot_lifecycle_anchors
-- DATABASE_MD5_UTF8: 74f838e87f887acae7cfee3bc65a00cc
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 5905
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

-- Phase MEM_LIFECYCLE Block 9 — RFC 3161 batch anchoring tables.

CREATE TABLE IF NOT EXISTS public.pilot_lifecycle_anchor_batches (
  id                     bigserial PRIMARY KEY,
  created_at             timestamptz NOT NULL DEFAULT now(),
  batch_start_chain_seq  bigint NOT NULL,
  batch_end_chain_seq    bigint NOT NULL,
  leaf_count             integer NOT NULL,
  merkle_root            bytea NOT NULL,
  hash_algorithm         text NOT NULL DEFAULT 'sha256',
  superseded_by_anchor_batch_id bigint
    REFERENCES public.pilot_lifecycle_anchor_batches(id),
  CHECK (batch_end_chain_seq >= batch_start_chain_seq),
  CHECK (leaf_count > 0),
  CHECK (octet_length(merkle_root) = 32),
  CHECK (hash_algorithm = 'sha256')
);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_batches_range_idx
  ON public.pilot_lifecycle_anchor_batches (batch_start_chain_seq, batch_end_chain_seq);
CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_batches_end_seq_idx
  ON public.pilot_lifecycle_anchor_batches (batch_end_chain_seq DESC);

CREATE TABLE IF NOT EXISTS public.pilot_lifecycle_anchor_leaves (
  batch_id         bigint NOT NULL REFERENCES public.pilot_lifecycle_anchor_batches(id) ON DELETE CASCADE,
  leaf_index       integer NOT NULL,
  chain_seq        bigint NOT NULL,
  event_id         uuid NOT NULL,
  row_hash_bytes   bytea NOT NULL,
  PRIMARY KEY (batch_id, leaf_index),
  CHECK (leaf_index >= 0),
  CHECK (octet_length(row_hash_bytes) = 32)
);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_leaves_chain_seq_idx
  ON public.pilot_lifecycle_anchor_leaves (chain_seq);
CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_leaves_event_id_idx
  ON public.pilot_lifecycle_anchor_leaves (event_id);

CREATE TABLE IF NOT EXISTS public.pilot_lifecycle_anchor_tsr (
  id             bigserial PRIMARY KEY,
  batch_id       bigint NOT NULL REFERENCES public.pilot_lifecycle_anchor_batches(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  tsa_name       text NOT NULL,
  tsa_url        text NOT NULL,
  tsr_der        bytea NOT NULL,
  gen_time       timestamptz NOT NULL,
  serial_number  numeric NOT NULL,
  nonce          bytea,
  tsa_cert_chain bytea,
  UNIQUE (batch_id, tsa_name),
  CHECK (tsa_name IN ('digicert', 'sectigo', 'identrust'))
);

CREATE INDEX IF NOT EXISTS pilot_lifecycle_anchor_tsr_gen_time_idx
  ON public.pilot_lifecycle_anchor_tsr (gen_time DESC);

ALTER TABLE public.pilot_lifecycle_anchor_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_lifecycle_anchor_leaves  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_lifecycle_anchor_tsr     ENABLE ROW LEVEL SECURITY;

CREATE POLICY pl_anchor_batches_read ON public.pilot_lifecycle_anchor_batches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY pl_anchor_leaves_read ON public.pilot_lifecycle_anchor_leaves
  FOR SELECT TO authenticated USING (true);
CREATE POLICY pl_anchor_tsr_read ON public.pilot_lifecycle_anchor_tsr
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_partition_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_partition_chk
  CHECK (
    company_id IS NOT NULL
    OR firm_id IS NOT NULL
    OR issue_kind IN ('marketing.seo.drift', 'pilot.lifecycle.chain.anchor')
  );

ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_issue_kind_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_issue_kind_chk
  CHECK (issue_kind IN (
    'pilot.lifecycle.drift.detected',
    'pilot.lifecycle.transition.rejected',
    'pilot.lifecycle.chain.integrity.broken',
    'pilot.lifecycle.monitor.error',
    'pilot.lifecycle.chain.anchor',
    'marketing.seo.drift'
  ));

CREATE OR REPLACE FUNCTION public.sp_write_anchor_batch(
  p_batch_start_chain_seq bigint,
  p_batch_end_chain_seq   bigint,
  p_leaf_count            integer,
  p_merkle_root           text,
  p_leaves                jsonb,
  p_tsrs                  jsonb
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_batch_id bigint;
  v_leaf     jsonb;
  v_tsr      jsonb;
  v_root     bytea;
BEGIN
  v_root := decode(replace(p_merkle_root, E'\\x', ''), 'hex');

  INSERT INTO public.pilot_lifecycle_anchor_batches(
    batch_start_chain_seq, batch_end_chain_seq, leaf_count, merkle_root
  ) VALUES (
    p_batch_start_chain_seq, p_batch_end_chain_seq, p_leaf_count, v_root
  )
  RETURNING id INTO v_batch_id;

  FOR v_leaf IN SELECT * FROM jsonb_array_elements(p_leaves) LOOP
    INSERT INTO public.pilot_lifecycle_anchor_leaves(
      batch_id, leaf_index, chain_seq, event_id, row_hash_bytes
    ) VALUES (
      v_batch_id,
      (v_leaf->>'leaf_index')::integer,
      (v_leaf->>'chain_seq')::bigint,
      (v_leaf->>'event_id')::uuid,
      decode(replace(v_leaf->>'row_hash_bytes', E'\\x', ''), 'hex')
    );
  END LOOP;

  FOR v_tsr IN SELECT * FROM jsonb_array_elements(p_tsrs) LOOP
    INSERT INTO public.pilot_lifecycle_anchor_tsr(
      batch_id, tsa_name, tsa_url, tsr_der, gen_time,
      serial_number, nonce, tsa_cert_chain
    ) VALUES (
      v_batch_id,
      v_tsr->>'tsa_name',
      v_tsr->>'tsa_url',
      decode(replace(v_tsr->>'tsr_der', E'\\x', ''), 'hex'),
      (v_tsr->>'gen_time')::timestamptz,
      (v_tsr->>'serial_number')::numeric,
      CASE WHEN v_tsr->>'nonce' IS NULL THEN NULL
           ELSE decode(replace(v_tsr->>'nonce', E'\\x', ''), 'hex') END,
      CASE WHEN v_tsr->>'tsa_cert_chain' IS NULL THEN NULL
           ELSE decode(replace(v_tsr->>'tsa_cert_chain', E'\\x', ''), 'hex') END
    );
  END LOOP;

  RETURN v_batch_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) TO service_role;
-- <<< end 20260805005320_pilot_lifecycle_anchors.sql

-- >>> begin 20260805054000_schema_drift_issue_policies.sql
-- MAJOR #2 — Schema drift issue read policy for org-wide (null-tenant) rows.
-- The existing lifecycle_issues_partition_read policy scopes reads to
-- company_users / firm_memberships. Schema-drift issues are org-wide with
-- both company_id AND firm_id NULL — so they'd be invisible to every
-- authenticated user without this override.
--
-- Super-admin bypass mirrors lib/super-admin.js:isAllowedSuperAdminEmail and
-- lib/super-admin-security.js role check: JWT app_metadata.role or
-- user_metadata.role must equal 'super_admin'. Email allowlist is enforced
-- separately at the app layer; this policy only requires the role claim
-- because Supabase RLS cannot cheaply consult a table of allowlisted emails.

CREATE POLICY lifecycle_issues_org_wide_super_admin_read
  ON public.lifecycle_issues
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NULL
    AND firm_id IS NULL
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    )
  );

-- Service role bypasses RLS entirely (existing Supabase behavior) so the
-- cron detector inserts freely. No INSERT/UPDATE/DELETE policies are added
-- for authenticated role — schema-drift issue resolution is a super-admin
-- action that will go through a dedicated server route in a follow-up phase.

COMMENT ON POLICY lifecycle_issues_org_wide_super_admin_read
  ON public.lifecycle_issues IS
  'MAJOR #2: super-admin can read org-wide drift issues where both tenant FKs are null. Complements lifecycle_issues_partition_read.';

-- Service-role-only helper for the static repo scanner. PostgREST cannot query
-- information_schema.* directly (Invalid schema), so the scanner calls this RPC.
CREATE OR REPLACE FUNCTION public.sp_list_public_columns()
RETURNS TABLE(table_name text, column_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.table_name::text, c.column_name::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
  ORDER BY 1, 2;
$$;

REVOKE ALL ON FUNCTION public.sp_list_public_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_list_public_columns() TO service_role;

COMMENT ON FUNCTION public.sp_list_public_columns() IS
  'MAJOR #2: service_role-only listing of public.* columns for schema drift repo scanner.';
-- <<< end 20260805054000_schema_drift_issue_policies.sql

-- >>> begin 20260805210000_schema_drift_scanner_issue_kinds.sql
-- MAJOR #2.1 — Register scanner-limitation issue kinds.
--
-- The AST-based scanner in lib/schema-drift/repo-scanner.ts emits these kinds
-- to lifecycle_issues when it can't classify a query with full confidence:
--
--   * schema_drift_scanner_unable_to_classify
--       Dynamic table binding (variable resolved to non-string-literal)
--       or cross-function passthrough (table name is a function parameter
--       with no call-site narrowing). NOT a runtime error — just a signal
--       that this query can't be statically verified against the live schema.
--
--   * schema_drift_scanner_ambiguous_column
--       Table binding is a union of literals (e.g. ternary of two string
--       literals) and the referenced column exists on some but not all of
--       the possible tables. Runtime path may or may not hit the drifted branch.
--
-- issue_kind is a free-text column on lifecycle_issues today (verified via
-- information_schema.columns: data_type='text', is_nullable='NO'), so no DDL
-- is strictly required. This migration exists to (a) leave a searchable audit
-- trail of when the new kinds were introduced and (b) create a lookup table
-- future assertion-coverage rollups can join against.

CREATE TABLE IF NOT EXISTS public.lifecycle_issue_kinds_registry (
  issue_kind text PRIMARY KEY,
  category text NOT NULL,
  description text NOT NULL,
  introduced_at timestamptz NOT NULL DEFAULT now(),
  introduced_by_migration text NOT NULL
);

COMMENT ON TABLE public.lifecycle_issue_kinds_registry IS
  'MAJOR #2.1: canonical registry of lifecycle_issues.issue_kind values. Not a FK constraint — audit surface only.';

INSERT INTO public.lifecycle_issue_kinds_registry (issue_kind, category, description, introduced_by_migration)
VALUES
  ('schema_drift',
   'schema_drift',
   'Runtime postgres error matched a schema-drift signature (column_missing, relation_missing, function_missing, type_mismatch, search_path_missing).',
   '20260805054000_schema_drift_issue_policies'),
  ('schema_drift_detector_degraded',
   'schema_drift',
   'The schema-drift detector cron could not fetch postgres logs (missing management API token or transient failure). Self-degradation signal.',
   '20260805054000_schema_drift_issue_policies'),
  ('schema_drift_scanner_unable_to_classify',
   'schema_drift',
   'Static repo scanner encountered a query whose table binding is a dynamic value (variable, function parameter). No column check performed. Runtime code may still be correct.',
   '20260805210000_schema_drift_scanner_issue_kinds'),
  ('schema_drift_scanner_ambiguous_column',
   'schema_drift',
   'Static repo scanner encountered a query whose table binding is a union of literals (e.g. ternary of string literals). Column exists on some but not all possible tables. Runtime branch coverage undetermined.',
   '20260805210000_schema_drift_scanner_issue_kinds'),
  ('schema_drift_accepted_baseline',
   'schema_drift',
   'Pre-existing schema drift accepted in .schema-drift-baseline.json with a debt ticket. Each entry must be resolved and removed from the baseline; scanner records these on every run for audit trail.',
   '20260805210000_schema_drift_scanner_issue_kinds')
ON CONFLICT (issue_kind) DO NOTHING;

-- Read policy so super-admin can see the registry (RLS enabled to match
-- lifecycle_issues pattern; service role bypasses regardless).
ALTER TABLE public.lifecycle_issue_kinds_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lifecycle_issue_kinds_registry_read
  ON public.lifecycle_issue_kinds_registry;

CREATE POLICY lifecycle_issue_kinds_registry_read
  ON public.lifecycle_issue_kinds_registry
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );
-- <<< end 20260805210000_schema_drift_scanner_issue_kinds.sql

-- >>> begin 20260805211000_sp_list_public_columns_jsonb.sql
-- MAJOR #2.1 follow-up — sp_list_public_columns returns jsonb (single row).
--
-- The original MAJOR #2 function returned SETOF (table_name, column_name).
-- PostgREST applies its max-rows limit (default 1000) to set-returning RPCs,
-- so the scanner silently truncated the live column universe (~3000+ public
-- columns) and false-positived every table alphabetically past the cutoff
-- (e.g. close_packets only appeared as id + close_period_id).
--
-- Returning a single jsonb array escapes the row-limit trap: one response
-- row carries the full listing.

DROP FUNCTION IF EXISTS public.sp_list_public_columns();

CREATE FUNCTION public.sp_list_public_columns()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'table_name', c.table_name,
        'column_name', c.column_name
      )
      ORDER BY c.table_name, c.column_name
    ),
    '[]'::jsonb
  )
  FROM information_schema.columns c
  WHERE c.table_schema = 'public';
$$;

REVOKE ALL ON FUNCTION public.sp_list_public_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sp_list_public_columns() TO service_role;

COMMENT ON FUNCTION public.sp_list_public_columns() IS
  'MAJOR #2.1: service_role-only listing of public.* columns as a single jsonb array (avoids PostgREST max-rows truncation of set-returning RPCs).';
-- <<< end 20260805211000_sp_list_public_columns_jsonb.sql

-- >>> begin 20260806031500_major_2_2_lifecycle_issues_drift_kinds.sql
-- MAJOR #2.2 — Widen lifecycle_issues CHECK constraints to accept schema-drift issue_kinds.
--
-- PR #230 (MAJOR #2) added the schema-drift detector cron and registry rows for:
--   schema_drift
--   schema_drift_detector_degraded
--
-- PR #231 (MAJOR #2.1) added three more scanner-owned registry rows:
--   schema_drift_scanner_ambiguous_column
--   schema_drift_scanner_unable_to_classify
--   schema_drift_accepted_baseline
--
-- Registry was updated in both PRs. The lifecycle_issues_issue_kind_chk CHECK constraint
-- was not. This migration closes that gap.
--
-- lifecycle_issues_partition_chk also needs widening — schema drift is a platform-scope
-- event with no company_id/firm_id, so it needs to be added to the allowlist branch
-- of that constraint.
--
-- Both CHECK constraints must be dropped and recreated (Postgres does not support
-- ALTER CONSTRAINT for CHECK). ADD CONSTRAINT is transactional; if the recreate fails
-- the whole migration rolls back.

BEGIN;

-- 1. Widen lifecycle_issues_issue_kind_chk
ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_issue_kind_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_issue_kind_chk
  CHECK (issue_kind = ANY (ARRAY[
    -- Pre-existing pilot lifecycle kinds
    'pilot.lifecycle.drift.detected'::text,
    'pilot.lifecycle.transition.rejected'::text,
    'pilot.lifecycle.chain.integrity.broken'::text,
    'pilot.lifecycle.monitor.error'::text,
    'pilot.lifecycle.chain.anchor'::text,
    -- Pre-existing marketing kind
    'marketing.seo.drift'::text,
    -- MAJOR #2 (PR #230) — schema drift detector
    'schema_drift'::text,
    'schema_drift_detector_degraded'::text,
    -- MAJOR #2.1 (PR #231) — AST scanner
    'schema_drift_scanner_ambiguous_column'::text,
    'schema_drift_scanner_unable_to_classify'::text,
    'schema_drift_accepted_baseline'::text
  ]));

-- 2. Widen lifecycle_issues_partition_chk to allow platform-scope drift events
ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_partition_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_partition_chk
  CHECK (
    company_id IS NOT NULL
    OR firm_id IS NOT NULL
    OR issue_kind = ANY (ARRAY[
      -- Pre-existing platform-scope kinds
      'marketing.seo.drift'::text,
      'pilot.lifecycle.chain.anchor'::text,
      -- MAJOR #2 / #2.1 — schema drift is platform-scope
      'schema_drift'::text,
      'schema_drift_detector_degraded'::text,
      'schema_drift_scanner_ambiguous_column'::text,
      'schema_drift_scanner_unable_to_classify'::text,
      'schema_drift_accepted_baseline'::text
    ])
  );

-- 3. Sanity check — verify all registry kinds are now accepted by the CHECK.
-- If a registry kind is NOT accepted, this will raise an exception and the
-- transaction rolls back, so the migration is self-verifying.
DO $$
DECLARE
  unaccepted_kind text;
BEGIN
  SELECT r.issue_kind INTO unaccepted_kind
  FROM public.lifecycle_issue_kinds_registry r
  WHERE r.issue_kind <> ALL (ARRAY[
    'pilot.lifecycle.drift.detected',
    'pilot.lifecycle.transition.rejected',
    'pilot.lifecycle.chain.integrity.broken',
    'pilot.lifecycle.monitor.error',
    'pilot.lifecycle.chain.anchor',
    'marketing.seo.drift',
    'schema_drift',
    'schema_drift_detector_degraded',
    'schema_drift_scanner_ambiguous_column',
    'schema_drift_scanner_unable_to_classify',
    'schema_drift_accepted_baseline'
  ])
  LIMIT 1;

  IF unaccepted_kind IS NOT NULL THEN
    RAISE EXCEPTION 'MAJOR #2.2 verify failed: registry has issue_kind % that is not in the widened CHECK. Add it to the ARRAY above and re-run.', unaccepted_kind;
  END IF;
END $$;

COMMIT;
-- <<< end 20260806031500_major_2_2_lifecycle_issues_drift_kinds.sql

-- >>> begin 20260806032000_lifecycle_issues_schema_drift_checks.sql
-- MAJOR #2.1 follow-up — widen lifecycle_issues CHECKs for schema-drift kinds.
--
-- Root cause found during LAUNCH BATCH SMOKE:
--   * lifecycle_issues_issue_kind_chk only allowed pilot.* + marketing.seo.drift
--   * lifecycle_issues_partition_chk only allowed null-tenant rows for
--     marketing.seo.drift + pilot.lifecycle.chain.anchor
-- Both rejected schema_drift* / scanner* / accepted_baseline inserts, so the
-- detector cron and `schema:drift-scan --record` silently wrote 0 rows.

ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_issue_kind_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_issue_kind_chk
  CHECK (issue_kind = ANY (ARRAY[
    'pilot.lifecycle.drift.detected'::text,
    'pilot.lifecycle.transition.rejected'::text,
    'pilot.lifecycle.chain.integrity.broken'::text,
    'pilot.lifecycle.monitor.error'::text,
    'pilot.lifecycle.chain.anchor'::text,
    'marketing.seo.drift'::text,
    'schema_drift'::text,
    'schema_drift_detector_degraded'::text,
    'schema_drift_scanner_unable_to_classify'::text,
    'schema_drift_scanner_ambiguous_column'::text,
    'schema_drift_accepted_baseline'::text
  ]));

ALTER TABLE public.lifecycle_issues
  DROP CONSTRAINT IF EXISTS lifecycle_issues_partition_chk;

ALTER TABLE public.lifecycle_issues
  ADD CONSTRAINT lifecycle_issues_partition_chk
  CHECK (
    (company_id IS NOT NULL)
    OR (firm_id IS NOT NULL)
    OR (issue_kind = ANY (ARRAY[
      'marketing.seo.drift'::text,
      'pilot.lifecycle.chain.anchor'::text,
      'schema_drift'::text,
      'schema_drift_detector_degraded'::text,
      'schema_drift_scanner_unable_to_classify'::text,
      'schema_drift_scanner_ambiguous_column'::text,
      'schema_drift_accepted_baseline'::text
    ]))
  );
-- <<< end 20260806032000_lifecycle_issues_schema_drift_checks.sql

-- >>> begin 20260806040000_major_2_3_block_a_assertion_linkage.sql
-- MAJOR #2.3 Block A — Server-side assertion-impact linkage for schema drift rows.
--
-- Backfills extra.assertion_impact on all existing schema_drift* rows in
-- lifecycle_issues, and installs a BEFORE INSERT trigger so all future drift
-- rows (from any writer — scanner script, detector cron, canary, ad-hoc SQL)
-- are automatically tagged with the assertion impact set they degrade.
--
-- Server-side mirror of lib/schema-drift/assertion-linkage.ts.
-- TypeScript file remains the source of truth for the detector route; this
-- function exists so scanner rows and any raw-SQL writers get identical treatment.
--
-- Design: extra.assertion_impact is JSONB (array of assertion_id text).
-- Idempotent by default — backfill skips rows where the field already exists.
-- Pass p_force_recompute=TRUE to overwrite existing values (used when
-- TABLE_ASSERTION_MAP is refined in a follow-up patch).

BEGIN;

-- 1. Server-side mirror of resolveAssertionImpact.
--    Must be updated in lockstep with lib/schema-drift/assertion-linkage.ts.
CREATE OR REPLACE FUNCTION public.resolve_assertion_impact_by_table(p_table text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  all_assertions CONSTANT text[] := ARRAY[
    'accuracy',
    'classification',
    'completeness',
    'cutoff',
    'existence_occurrence',
    'presentation_disclosure',
    'rights_obligations',
    'valuation_allocation'
  ];
BEGIN
  -- Unknown table → all 8 assertions (fallback per intentional coarse-linkage design)
  IF p_table IS NULL OR length(trim(p_table)) = 0 THEN
    RETURN all_assertions;
  END IF;

  -- Journal/GL tables drive accuracy, existence, cutoff, classification
  IF p_table IN ('qbo_journal_entries', 'qbo_transactions') THEN
    RETURN ARRAY['accuracy', 'existence_occurrence', 'cutoff', 'classification'];
  END IF;

  IF p_table = 'qbo_general_ledger' THEN
    RETURN ARRAY['accuracy', 'existence_occurrence', 'cutoff', 'classification', 'completeness'];
  END IF;

  -- Balance-sheet reconciliation tables drive completeness, valuation, existence
  IF p_table = 'bs_recon_summary' THEN
    RETURN ARRAY['completeness', 'valuation_allocation', 'existence_occurrence'];
  END IF;

  IF p_table = 'balance_sheet_periods' THEN
    RETURN ARRAY['completeness', 'valuation_allocation'];
  END IF;

  -- AP/AR + vendor/customer tables drive rights_obligations + valuation
  IF p_table IN ('qbo_bills', 'qbo_invoices') THEN
    RETURN ARRAY['existence_occurrence', 'rights_obligations', 'valuation_allocation', 'cutoff'];
  END IF;

  IF p_table IN ('qbo_vendors', 'qbo_customers') THEN
    RETURN ARRAY['rights_obligations', 'existence_occurrence'];
  END IF;

  -- Close-period tables drive presentation + cutoff
  IF p_table = 'close_periods' THEN
    RETURN ARRAY['cutoff', 'presentation_disclosure'];
  END IF;

  IF p_table = 'close_packets' THEN
    RETURN ARRAY['presentation_disclosure', 'completeness'];
  END IF;

  -- Assertion coverage tables — drift here degrades ALL assertions (self-referential)
  IF p_table IN ('assertions_catalog', 'assertion_relevance_matrix', 'rule_assertion_coverage') THEN
    RETURN all_assertions;
  END IF;

  -- Users/auth/RLS drift is org-wide → all assertions
  IF p_table IN ('users', 'company_users', 'firm_memberships') THEN
    RETURN all_assertions;
  END IF;

  -- Lifecycle issues drift is self-referential → all assertions
  IF p_table = 'lifecycle_issues' THEN
    RETURN all_assertions;
  END IF;

  -- Fallback for any unmapped table
  RETURN all_assertions;
END;
$$;

COMMENT ON FUNCTION public.resolve_assertion_impact_by_table(text) IS
  'MAJOR #2.3 — server-side mirror of lib/schema-drift/assertion-linkage.ts. Returns the ISA 315 assertion IDs whose evidence flow depends on the given table. Fallback to all 8 assertions for unknown/null tables.';

-- 2. Idempotent backfill function. Callable manually to refill after
--    TABLE_ASSERTION_MAP is refined.
CREATE OR REPLACE FUNCTION public.backfill_schema_drift_assertion_impact(
  p_force_recompute boolean DEFAULT false
)
RETURNS TABLE (
  rows_updated integer,
  rows_skipped integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
  v_skipped integer := 0;
BEGIN
  IF p_force_recompute THEN
    -- Overwrite mode — recompute for every schema_drift* row
    UPDATE public.lifecycle_issues li
    SET extra = coalesce(li.extra, '{}'::jsonb)
      || jsonb_build_object(
        'assertion_impact',
        to_jsonb(public.resolve_assertion_impact_by_table(li.tags->>'table'))
      )
    WHERE li.issue_kind LIKE 'schema_drift%';
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    v_skipped := 0;
  ELSE
    -- Idempotent mode — only fill rows missing the field
    UPDATE public.lifecycle_issues li
    SET extra = coalesce(li.extra, '{}'::jsonb)
      || jsonb_build_object(
        'assertion_impact',
        to_jsonb(public.resolve_assertion_impact_by_table(li.tags->>'table'))
      )
    WHERE li.issue_kind LIKE 'schema_drift%'
      AND (li.extra IS NULL OR li.extra->'assertion_impact' IS NULL);
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    SELECT COUNT(*) INTO v_skipped
    FROM public.lifecycle_issues li
    WHERE li.issue_kind LIKE 'schema_drift%'
      AND li.extra IS NOT NULL
      AND li.extra->'assertion_impact' IS NOT NULL;
  END IF;

  RETURN QUERY SELECT v_updated, v_skipped;
END;
$$;

COMMENT ON FUNCTION public.backfill_schema_drift_assertion_impact(boolean) IS
  'MAJOR #2.3 Block A — backfill extra.assertion_impact for all schema_drift* rows. Idempotent by default; pass p_force_recompute=TRUE to overwrite existing values after TABLE_ASSERTION_MAP is refined.';

REVOKE ALL ON FUNCTION public.backfill_schema_drift_assertion_impact(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_schema_drift_assertion_impact(boolean) TO service_role;

-- 3. BEFORE INSERT trigger — auto-populate extra.assertion_impact for all
--    schema_drift* rows going forward.
CREATE OR REPLACE FUNCTION public.trg_lifecycle_issues_assertion_impact()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only act on schema_drift* rows
  IF NEW.issue_kind NOT LIKE 'schema_drift%' THEN
    RETURN NEW;
  END IF;

  -- Only fill if caller didn't already set it
  IF NEW.extra IS NULL OR NEW.extra->'assertion_impact' IS NULL THEN
    NEW.extra := coalesce(NEW.extra, '{}'::jsonb)
      || jsonb_build_object(
        'assertion_impact',
        to_jsonb(public.resolve_assertion_impact_by_table(NEW.tags->>'table'))
      );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_lifecycle_issues_assertion_impact() IS
  'MAJOR #2.3 Block A — trigger function. Auto-fills extra.assertion_impact on INSERT for schema_drift* rows if caller did not set it.';

DROP TRIGGER IF EXISTS lifecycle_issues_assertion_impact_trg ON public.lifecycle_issues;

CREATE TRIGGER lifecycle_issues_assertion_impact_trg
  BEFORE INSERT ON public.lifecycle_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_lifecycle_issues_assertion_impact();

-- 4. Run the backfill in idempotent mode as part of this migration
--    (records the outcome via RAISE NOTICE for review in migration logs).
DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result FROM public.backfill_schema_drift_assertion_impact(false);
  RAISE NOTICE 'MAJOR #2.3 Block A backfill complete: % rows_updated, % rows_skipped',
    v_result.rows_updated, v_result.rows_skipped;
END;
$$;

-- 5. Self-verify: every schema_drift* row now has a non-empty assertion_impact array.
DO $$
DECLARE
  v_missing integer;
BEGIN
  SELECT COUNT(*) INTO v_missing
  FROM public.lifecycle_issues
  WHERE issue_kind LIKE 'schema_drift%'
    AND (
      extra IS NULL
      OR extra->'assertion_impact' IS NULL
      OR jsonb_typeof(extra->'assertion_impact') <> 'array'
      OR jsonb_array_length(extra->'assertion_impact') = 0
    );

  IF v_missing > 0 THEN
    RAISE EXCEPTION 'MAJOR #2.3 Block A self-verify failed: % schema_drift* rows still missing assertion_impact', v_missing;
  END IF;
END;
$$;

COMMIT;
-- <<< end 20260806040000_major_2_3_block_a_assertion_linkage.sql

-- >>> begin 20260806042000_major_2_3_block_a_1_research_revision.sql
-- MAJOR #2.3 Block A.1 — Research-grounded revision of assertion linkage.
--
-- Applied after 20260806040000_major_2_3_block_a_assertion_linkage.sql.
-- Rewrites the resolve_assertion_impact_by_table() function with mappings
-- restricted to what the audit-literature research supports (research file
-- at research/schema_drift_assertion_mapping_research.md).
--
-- Key changes vs Block A:
--   1. Fallback for unknown tables is now ['completeness','accuracy'] — the
--      ISA 315 Para 12(d)/(i) framework-definition minimum. NOT all 8 assertions.
--   2. Per-table mappings restricted to what research §7 supports.
--   3. New helper functions for assertion_confidence and financial_reporting_relevance.
--   4. Trigger function updated to write all three fields into extra.
--   5. Force-recompute backfill runs at end so the 24 existing rows are
--      overwritten with the new, defensible values.
--
-- Rollback: 20260806042000_major_2_3_block_a_1_research_revision_down.sql
-- restores the Block A functions from the previous migration.

BEGIN;

-- ============================================================================
-- 1. Rewrite the assertion impact resolver
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_assertion_impact_by_table(p_table text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  -- Framework-definition minimum: ISA 315 Para 12(d)/(i)
  framework_minimum CONSTANT text[] := ARRAY['completeness', 'accuracy'];
BEGIN
  IF p_table IS NULL OR length(trim(p_table)) = 0 THEN
    RETURN framework_minimum;
  END IF;

  -- Journal / GL / transactions — completeness + accuracy + existence
  IF p_table IN ('qbo_journal_entries', 'qbo_transactions', 'qbo_general_ledger') THEN
    RETURN ARRAY['completeness', 'accuracy', 'existence_occurrence'];
  END IF;

  -- Balance-sheet reconciliation
  IF p_table = 'bs_recon_summary' THEN
    RETURN ARRAY['completeness', 'accuracy', 'existence_occurrence'];
  END IF;

  IF p_table = 'balance_sheet_periods' THEN
    RETURN ARRAY['completeness', 'accuracy'];
  END IF;

  -- AP/AR
  IF p_table IN ('qbo_bills', 'qbo_invoices') THEN
    RETURN ARRAY['existence_occurrence', 'completeness', 'accuracy'];
  END IF;

  IF p_table IN ('qbo_vendors', 'qbo_customers') THEN
    RETURN ARRAY['existence_occurrence', 'completeness', 'accuracy'];
  END IF;

  -- Close periods
  IF p_table IN ('close_periods', 'close_packets') THEN
    RETURN ARRAY['completeness', 'accuracy'];
  END IF;

  -- Assertion-catalog tables
  IF p_table IN ('assertions_catalog', 'assertion_relevance_matrix', 'rule_assertion_coverage') THEN
    RETURN ARRAY['completeness', 'accuracy'];
  END IF;

  -- Auth/RLS tables
  IF p_table IN ('users', 'company_users', 'firm_memberships') THEN
    RETURN ARRAY['completeness', 'accuracy'];
  END IF;

  -- Ledger events / payments
  IF p_table IN ('ledger_events', 'payment_batches', 'payment_batch_lines') THEN
    RETURN ARRAY['completeness', 'accuracy', 'existence_occurrence'];
  END IF;

  -- Refund requests
  IF p_table = 'refund_requests' THEN
    RETURN ARRAY['completeness', 'accuracy'];
  END IF;

  -- Self-referential
  IF p_table = 'lifecycle_issues' THEN
    RETURN ARRAY['completeness', 'accuracy'];
  END IF;

  -- Table not in allowlist — fall back to framework definition
  RETURN framework_minimum;
END;
$$;

COMMENT ON FUNCTION public.resolve_assertion_impact_by_table(text) IS
  'MAJOR #2.3 Block A.1 — server-side mirror of lib/schema-drift/assertion-linkage.ts, restricted per research/schema_drift_assertion_mapping_research.md §7. Returns contingent assertion risk indicators grounded in ISA 315 Para 12(d)/(i). Fallback for unknown tables is [completeness, accuracy] — the framework-definition minimum, NOT all 8 assertions (which ISA 315 Para A150 explicitly prohibits from a GITC signal alone).';

-- ============================================================================
-- 2. New: assertion_confidence resolver
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_assertion_confidence_by_table(p_table text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_table IS NULL OR length(trim(p_table)) = 0 THEN
    RETURN 'framework_definition';
  END IF;

  -- Grounded per research §7 (direct textual grounding in ISA 315 A190(a)(i)/(ii)/(iii))
  IF p_table IN (
    'qbo_journal_entries', 'qbo_transactions', 'qbo_general_ledger',
    'qbo_bills', 'qbo_invoices',
    'bs_recon_summary', 'balance_sheet_periods',
    'ledger_events', 'payment_batches', 'payment_batch_lines'
  ) THEN
    RETURN 'grounded';
  END IF;

  -- Judgment required per research §7 (linkage exists but requires auditor
  -- judgment about specific account/process affected)
  IF p_table IN (
    'qbo_vendors', 'qbo_customers',
    'close_periods', 'close_packets',
    'assertions_catalog', 'assertion_relevance_matrix', 'rule_assertion_coverage',
    'users', 'company_users', 'firm_memberships',
    'refund_requests', 'lifecycle_issues'
  ) THEN
    RETURN 'judgment_required';
  END IF;

  -- Table not in allowlist — falls back to framework definition
  RETURN 'framework_definition';
END;
$$;

COMMENT ON FUNCTION public.resolve_assertion_confidence_by_table(text) IS
  'MAJOR #2.3 Block A.1 — returns the confidence tag for a drift-affected table. grounded | framework_definition | judgment_required | unknown. Per research §7.';

-- ============================================================================
-- 3. New: financial_reporting_relevance resolver
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_fr_relevance_by_table(p_table text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_table IS NULL OR length(trim(p_table)) = 0 THEN
    RETURN 'unknown';
  END IF;

  -- FR-in-scope allowlist per approved table list (research §8, KPMG Q3.4.20
  -- materiality gate). Every table in TABLE_MAPPING is in_scope.
  IF p_table IN (
    'qbo_journal_entries', 'qbo_transactions', 'qbo_general_ledger',
    'qbo_bills', 'qbo_invoices', 'qbo_vendors', 'qbo_customers',
    'bs_recon_summary', 'balance_sheet_periods',
    'close_periods', 'close_packets',
    'assertions_catalog', 'assertion_relevance_matrix', 'rule_assertion_coverage',
    'users', 'company_users', 'firm_memberships',
    'ledger_events', 'payment_batches', 'payment_batch_lines',
    'refund_requests', 'lifecycle_issues'
  ) THEN
    RETURN 'in_scope';
  END IF;

  -- Everything else — unknown (safer than false out_of_scope claim)
  RETURN 'unknown';
END;
$$;

COMMENT ON FUNCTION public.resolve_fr_relevance_by_table(text) IS
  'MAJOR #2.3 Block A.1 — financial reporting relevance gate per ISA 315 Appendix 5 §19 and KPMG ICFR Handbook Q3.4.20. in_scope | out_of_scope | unknown. Default unknown (never falsely claim out_of_scope for tables we haven''t analyzed).';

-- ============================================================================
-- 4. New: mapping_source resolver
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_mapping_source_by_table(p_table text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_table IS NULL OR length(trim(p_table)) = 0 THEN
    RETURN 'framework_definition_fallback';
  END IF;

  IF p_table IN (
    'qbo_journal_entries', 'qbo_transactions', 'qbo_general_ledger',
    'qbo_bills', 'qbo_invoices',
    'payment_batches', 'payment_batch_lines'
  ) THEN
    RETURN 'ISA_315_A190_a_iii';
  END IF;

  IF p_table IN ('bs_recon_summary', 'balance_sheet_periods', 'ledger_events') THEN
    RETURN 'COBIT_MANAGED_DATA';
  END IF;

  IF p_table IN ('users', 'company_users', 'firm_memberships') THEN
    RETURN 'KPMG_Q6_4_110';
  END IF;

  IF p_table IN (
    'qbo_vendors', 'qbo_customers',
    'close_periods', 'close_packets',
    'assertions_catalog', 'assertion_relevance_matrix', 'rule_assertion_coverage',
    'refund_requests', 'lifecycle_issues'
  ) THEN
    RETURN 'judgment_required_marker';
  END IF;

  RETURN 'framework_definition_fallback';
END;
$$;

COMMENT ON FUNCTION public.resolve_mapping_source_by_table(text) IS
  'MAJOR #2.3 Block A.1 — returns the mapping-source citation reference for Block B footnote rendering. See research/schema_drift_assertion_mapping_research.md for canonical citations.';

-- ============================================================================
-- 5. Rewrite trigger function to write all three new fields
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_lifecycle_issues_assertion_impact()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_table text;
BEGIN
  -- Only act on schema_drift* rows
  IF NEW.issue_kind NOT LIKE 'schema_drift%' THEN
    RETURN NEW;
  END IF;

  v_table := NEW.tags->>'table';

  -- Fill assertion_impact if caller didn't set it
  IF NEW.extra IS NULL OR NEW.extra->'assertion_impact' IS NULL THEN
    NEW.extra := coalesce(NEW.extra, '{}'::jsonb)
      || jsonb_build_object(
        'assertion_impact',
        to_jsonb(public.resolve_assertion_impact_by_table(v_table))
      );
  END IF;

  -- Fill assertion_confidence if caller didn't set it
  IF NEW.extra->'assertion_confidence' IS NULL THEN
    NEW.extra := NEW.extra
      || jsonb_build_object(
        'assertion_confidence',
        public.resolve_assertion_confidence_by_table(v_table)
      );
  END IF;

  -- Fill financial_reporting_relevance if caller didn't set it
  IF NEW.extra->'financial_reporting_relevance' IS NULL THEN
    NEW.extra := NEW.extra
      || jsonb_build_object(
        'financial_reporting_relevance',
        public.resolve_fr_relevance_by_table(v_table)
      );
  END IF;

  -- Fill mapping_source if caller didn't set it
  IF NEW.extra->'mapping_source' IS NULL THEN
    NEW.extra := NEW.extra
      || jsonb_build_object(
        'mapping_source',
        public.resolve_mapping_source_by_table(v_table)
      );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_lifecycle_issues_assertion_impact() IS
  'MAJOR #2.3 Block A.1 — trigger auto-populates the four assertion linkage fields (impact, confidence, fr_relevance, mapping_source) for schema_drift* rows. Caller-set values are preserved.';

-- ============================================================================
-- 6. Rewrite backfill function to populate all four fields
-- ============================================================================

CREATE OR REPLACE FUNCTION public.backfill_schema_drift_assertion_impact(
  p_force_recompute boolean DEFAULT false
)
RETURNS TABLE (
  rows_updated integer,
  rows_skipped integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
  v_skipped integer := 0;
BEGIN
  IF p_force_recompute THEN
    UPDATE public.lifecycle_issues li
    SET extra = coalesce(li.extra, '{}'::jsonb)
      || jsonb_build_object(
        'assertion_impact',
        to_jsonb(public.resolve_assertion_impact_by_table(li.tags->>'table'))
      )
      || jsonb_build_object(
        'assertion_confidence',
        public.resolve_assertion_confidence_by_table(li.tags->>'table')
      )
      || jsonb_build_object(
        'financial_reporting_relevance',
        public.resolve_fr_relevance_by_table(li.tags->>'table')
      )
      || jsonb_build_object(
        'mapping_source',
        public.resolve_mapping_source_by_table(li.tags->>'table')
      )
    WHERE li.issue_kind LIKE 'schema_drift%';
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    v_skipped := 0;
  ELSE
    UPDATE public.lifecycle_issues li
    SET extra = coalesce(li.extra, '{}'::jsonb)
      || jsonb_build_object(
        'assertion_impact',
        to_jsonb(public.resolve_assertion_impact_by_table(li.tags->>'table'))
      )
      || jsonb_build_object(
        'assertion_confidence',
        public.resolve_assertion_confidence_by_table(li.tags->>'table')
      )
      || jsonb_build_object(
        'financial_reporting_relevance',
        public.resolve_fr_relevance_by_table(li.tags->>'table')
      )
      || jsonb_build_object(
        'mapping_source',
        public.resolve_mapping_source_by_table(li.tags->>'table')
      )
    WHERE li.issue_kind LIKE 'schema_drift%'
      AND (
        li.extra IS NULL
        OR li.extra->'assertion_impact' IS NULL
        OR li.extra->'assertion_confidence' IS NULL
        OR li.extra->'financial_reporting_relevance' IS NULL
        OR li.extra->'mapping_source' IS NULL
      );
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    SELECT COUNT(*) INTO v_skipped
    FROM public.lifecycle_issues li
    WHERE li.issue_kind LIKE 'schema_drift%'
      AND li.extra IS NOT NULL
      AND li.extra->'assertion_impact' IS NOT NULL
      AND li.extra->'assertion_confidence' IS NOT NULL
      AND li.extra->'financial_reporting_relevance' IS NOT NULL
      AND li.extra->'mapping_source' IS NOT NULL;
  END IF;

  RETURN QUERY SELECT v_updated, v_skipped;
END;
$$;

COMMENT ON FUNCTION public.backfill_schema_drift_assertion_impact(boolean) IS
  'MAJOR #2.3 Block A.1 — backfill all four assertion linkage fields. Idempotent by default; force mode overwrites (used to correct Block A''s ALL_ASSERTIONS data).';

REVOKE ALL ON FUNCTION public.backfill_schema_drift_assertion_impact(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_schema_drift_assertion_impact(boolean) TO service_role;

-- ============================================================================
-- 7. Force-recompute the 24 existing rows with the new logic
-- ============================================================================

DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result FROM public.backfill_schema_drift_assertion_impact(true);
  RAISE NOTICE 'MAJOR #2.3 Block A.1 force-recompute complete: % rows_updated', v_result.rows_updated;
END;
$$;

-- ============================================================================
-- 8. Self-verify: no drift row is left with ALL_ASSERTIONS impact,
--    every row has all four fields
-- ============================================================================

DO $$
DECLARE
  v_missing_field integer;
  v_still_all_eight integer;
BEGIN
  -- Every drift row must have all 4 fields populated
  SELECT COUNT(*) INTO v_missing_field
  FROM public.lifecycle_issues
  WHERE issue_kind LIKE 'schema_drift%'
    AND (
      extra IS NULL
      OR extra->'assertion_impact' IS NULL
      OR extra->'assertion_confidence' IS NULL
      OR extra->'financial_reporting_relevance' IS NULL
      OR extra->'mapping_source' IS NULL
    );

  IF v_missing_field > 0 THEN
    RAISE EXCEPTION 'MAJOR #2.3 Block A.1 self-verify failed: % rows missing one or more assertion linkage fields', v_missing_field;
  END IF;

  -- No drift row should carry ALL_ASSERTIONS impact (8-element array) unless
  -- caller explicitly set it (caller-set values are preserved by the trigger,
  -- so this only checks that the resolver never produces 8)
  SELECT COUNT(*) INTO v_still_all_eight
  FROM public.lifecycle_issues
  WHERE issue_kind LIKE 'schema_drift%'
    AND jsonb_array_length(extra->'assertion_impact') = 8;

  IF v_still_all_eight > 0 THEN
    RAISE EXCEPTION 'MAJOR #2.3 Block A.1 self-verify failed: % rows still carry ALL_ASSERTIONS (8 assertions) — force-recompute did not overwrite. Investigate before merging.', v_still_all_eight;
  END IF;

  RAISE NOTICE 'MAJOR #2.3 Block A.1 self-verify passed: all schema_drift* rows carry defensible assertion linkage.';
END;
$$;

COMMIT;
-- <<< end 20260806042000_major_2_3_block_a_1_research_revision.sql

-- >>> begin 20260809083000_companies_tenant_identity_columns.sql
-- Provider-aware tenant identity on companies (git parity with prod).
-- Prod already applied equivalent DDL (schema_migrations: companies_tenant_identity_columns).
-- Idempotent: safe to re-run; backfills no-op when tenant columns already set.
-- Enables resolveOrCreateCompanyForProvider to route accounting_syncs writes
-- to the correct companies row by external tenant identifier.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS xero_tenant_id text,
  ADD COLUMN IF NOT EXISTS qbo_realm_id text;

CREATE UNIQUE INDEX IF NOT EXISTS companies_xero_tenant_id_key
  ON companies (xero_tenant_id) WHERE xero_tenant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS companies_qbo_realm_id_key
  ON companies (qbo_realm_id) WHERE qbo_realm_id IS NOT NULL;

COMMENT ON COLUMN companies.xero_tenant_id IS
  'Xero organization tenant UUID (from OAuth /connections). Unique when set. Populated by resolveOrCreateCompanyForProvider.';
COMMENT ON COLUMN companies.qbo_realm_id IS
  'QuickBooks Online realmId. Unique when set. Populated by resolveOrCreateCompanyForProvider.';

-- Backfill known Xero tenant → companies mapping (no-op when already set).
UPDATE companies
   SET xero_tenant_id = 'ceaea696-081f-491e-9daa-a9263a023ca9',
       accounting_system = COALESCE(accounting_system, 'xero'),
       updated_at = now()
 WHERE id = '02edb6c6-a4f1-4bae-825d-2680136dad24'
   AND xero_tenant_id IS NULL;

-- Backfill known QBO realm → seed companies row (no-op when already set).
UPDATE companies
   SET qbo_realm_id = '9341457151063823',
       accounting_system = COALESCE(accounting_system, 'quickbooks'),
       updated_at = now()
 WHERE id = 'aaaaaaaa-2222-4222-8222-222222222222'
   AND qbo_realm_id IS NULL;
-- <<< end 20260809083000_companies_tenant_identity_columns.sql

-- >>> begin 20260810070000_dash_1c_a_accuracy_contract_cache.sql
-- Phase DASH_1C Block A — Accuracy Contract cache.
-- Keyed on (company_id, kpi_code, period, accounting_syncs_id) so a new sync
-- naturally invalidates by creating a row with a new sync id. TTL = new sync.
-- RLS: same access model as accounting_syncs (company_users membership).

CREATE TABLE IF NOT EXISTS public.accuracy_contract_cache (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kpi_code             text NOT NULL,
  period               text NOT NULL,
  accounting_syncs_id  uuid NOT NULL REFERENCES public.accounting_syncs(id) ON DELETE CASCADE,
  kpi_value_numeric    numeric,
  kpi_value_display    text NOT NULL,
  unit                 text NOT NULL,
  computation_status   text NOT NULL,
  formula_json         jsonb NOT NULL,
  composition_json     jsonb NOT NULL,
  provenance_json      jsonb NOT NULL,
  chain_receipt_json   jsonb NOT NULL,
  computed_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accuracy_contract_cache_unique
    UNIQUE (company_id, kpi_code, period, accounting_syncs_id),
  CONSTRAINT accuracy_contract_cache_status_check
    CHECK (computation_status IN ('computed','pending_subledger')),
  CONSTRAINT accuracy_contract_cache_unit_check
    CHECK (unit IN ('currency','percent','ratio','days','count'))
);

CREATE INDEX IF NOT EXISTS idx_accuracy_contract_cache_lookup
  ON public.accuracy_contract_cache (company_id, kpi_code, period, computed_at DESC);

ALTER TABLE public.accuracy_contract_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accuracy_contract_cache_select ON public.accuracy_contract_cache;
CREATE POLICY accuracy_contract_cache_select
  ON public.accuracy_contract_cache
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.company_id = accuracy_contract_cache.company_id
        AND cu.user_id = (SELECT auth.uid())
        AND cu.status = 'active'
    )
  );
-- <<< end 20260810070000_dash_1c_a_accuracy_contract_cache.sql

-- >>> begin 20260810070050_dash_1c_a_widen_provenance.sql
-- Phase DASH_1C Block A — Widen lifecycle event_kind + actor_via for
-- provenance-drawer-opened emits. Additive only; preserves W1c.4a vocabulary.

alter table public.pilot_lifecycle_events
  drop constraint if exists pilot_lifecycle_events_event_kind_chk;

alter table public.pilot_lifecycle_events
  add constraint pilot_lifecycle_events_event_kind_chk
  check (event_kind = any (array[
    'pilot.lifecycle.transition'::text,
    'pilot.lifecycle.drift-detected'::text,
    'pilot.lifecycle.auto-reconciled'::text,
    'pilot.lifecycle.escalated'::text,
    'pilot.lifecycle.recurred'::text,
    'pilot.lifecycle.created'::text,
    'pilot.lifecycle.assertion.evidence-attached'::text,
    'pilot.lifecycle.transition.rejected'::text,
    'pilot.lifecycle.accounting-sync-completed'::text,
    'pilot.lifecycle.accounting-sync-failed'::text,
    'pilot.lifecycle.accounting-connection-connected'::text,
    'pilot.lifecycle.accounting-connection-disconnected'::text,
    'pilot.lifecycle.wbp-probe-result'::text,
    'pilot.lifecycle.write-validated'::text,
    'pilot.lifecycle.write-rejected'::text,
    'pilot.lifecycle.write-posted'::text,
    'pilot.lifecycle.write-drifted'::text,
    'pilot.lifecycle.write-void-succeeded'::text,
    'pilot.lifecycle.write-failed'::text,
    'pilot.lifecycle.cache-refreshed'::text,
    'pilot.lifecycle.provenance-drawer-opened'::text
  ]));

comment on constraint pilot_lifecycle_events_event_kind_chk
  on public.pilot_lifecycle_events is
  'DASH_1C Block A: provenance-drawer-opened added for Accuracy Contract receipt emits.';

alter table public.pilot_lifecycle_events
  drop constraint if exists pilot_lifecycle_events_actor_via_chk;

alter table public.pilot_lifecycle_events
  add constraint pilot_lifecycle_events_actor_via_chk
  check (actor_via = any (array[
    'panel-consumer'::text,
    'role-adapter'::text,
    'org-edge'::text,
    'direct-api'::text,
    'admin-script'::text,
    'stripe-webhook'::text,
    'cdc-auditor'::text,
    'accounting-sync'::text,
    'user-initiated'::text,
    'dashboard-provenance-drawer'::text
  ]));

comment on constraint pilot_lifecycle_events_actor_via_chk
  on public.pilot_lifecycle_events is
  'DASH_1C Block A: dashboard-provenance-drawer added for Accuracy Contract drawer opens.';
-- <<< end 20260810070050_dash_1c_a_widen_provenance.sql

-- >>> begin 20260810070100_dash_1c_a_lifecycle_scan_indexes.sql
-- Phase DASH_1C Block A — freshness + minting-event lookup indexes.
CREATE INDEX IF NOT EXISTS idx_pilot_lifecycle_company_chain_seq_desc
  ON public.pilot_lifecycle_events (company_id, chain_seq DESC);

CREATE INDEX IF NOT EXISTS idx_pilot_lifecycle_company_kind_syncid
  ON public.pilot_lifecycle_events
  (company_id, event_kind, ((payload->>'accounting_syncs_id')::text))
  WHERE payload ? 'accounting_syncs_id';
-- <<< end 20260810070100_dash_1c_a_lifecycle_scan_indexes.sql

-- >>> begin 20260813220000_accounting_connection_supersession.sql
-- Additive connection supersession lifecycle (PR B).
-- EXPAND ONLY: no status backfill, no unique connected index, no data updates.
--
-- Semantics:
--   connected   = eligible authoritative OAuth grant
--   superseded  = historical connection retained for attribution; never eligible
--                 for new accounting reads/writes
--   expired     = token/grant needs reconnect
--   disconnected= intentionally disconnected
--   failed      = unusable connection state
--
-- Do NOT add a restrictive status CHECK here: live DB has free-form text status
-- and historical values must remain compatible.

ALTER TABLE public.accounting_connections
  ADD COLUMN IF NOT EXISTS superseded_by_connection_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'accounting_connections_superseded_by_fkey'
      AND conrelid = 'public.accounting_connections'::regclass
  ) THEN
    ALTER TABLE public.accounting_connections
      ADD CONSTRAINT accounting_connections_superseded_by_fkey
      FOREIGN KEY (superseded_by_connection_id)
      REFERENCES public.accounting_connections(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'accounting_connections_superseded_by_not_self'
      AND conrelid = 'public.accounting_connections'::regclass
  ) THEN
    ALTER TABLE public.accounting_connections
      ADD CONSTRAINT accounting_connections_superseded_by_not_self
      CHECK (
        superseded_by_connection_id IS NULL
        OR superseded_by_connection_id <> id
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS accounting_connections_superseded_by_idx
  ON public.accounting_connections (superseded_by_connection_id)
  WHERE superseded_by_connection_id IS NOT NULL;

COMMENT ON COLUMN public.accounting_connections.superseded_by_connection_id IS
  'When status=superseded, points at the canonical successor connection for the same user/provider/tenant grant. ON DELETE SET NULL preserves predecessor attribution.';
-- <<< end 20260813220000_accounting_connection_supersession.sql

-- >>> begin 20260814060000_accounting_superseded_credential_retirement.sql
-- PR F: retire live OAuth credentials on superseded accounting connections.
-- CODE HARDENING ships with this migration; do NOT apply to production until review.
--
-- Semantics:
--   superseded rows remain permanent historical identity + sync lineage evidence.
--   They must not retain reusable provider authorization secrets.
--   connected / disconnected rows are intentionally untouched here.
--
-- Does NOT call Xero/Intuit token revocation APIs — DB credential retirement only.

ALTER TABLE public.accounting_connections
  ADD COLUMN IF NOT EXISTS credentials_cleared_at timestamptz;

COMMENT ON COLUMN public.accounting_connections.credentials_cleared_at IS
  'Set when live OAuth secrets were intentionally cleared; accounting memory remains.';

-- Clear secrets on superseded only. Preserve id/status/superseded_by/sync lineage.
-- Do not bump updated_at (authority/recency signal stays undisturbed).
-- COALESCE preserves a prior credentials_cleared_at on idempotent re-runs.
UPDATE public.accounting_connections
SET
  access_token = NULL,
  refresh_token = NULL,
  token_expires_at = NULL,
  credentials_cleared_at = COALESCE(credentials_cleared_at, now())
WHERE status = 'superseded'
  AND (
    access_token IS NOT NULL
    OR refresh_token IS NOT NULL
    OR token_expires_at IS NOT NULL
    OR credentials_cleared_at IS NULL
  );
-- <<< end 20260814060000_accounting_superseded_credential_retirement.sql

-- >>> begin 20260815000000_urm2_reconciling_items_persistence.sql
-- URM-2: Persist universal reconciliation outcomes.
-- Additive only. Does not change resolver math or measurement variances.
--
-- Locks:
-- - Identified reconciling items are separate workpaper/remediation objects.
-- - Unidentified residual is derived (Gross − Σ Identified); never a row class.
-- - Variances remain the measurement layer.
-- - Evidence taxonomy expansion deferred to URM-3 (opaque evidence_ids only).

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) Run-level URM outcome columns (nullable until a bridge is persisted)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS identified_items_total_cents bigint NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS unidentified_residual_cents bigint NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS reconciling_item_count integer NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS unresolved_material_count integer NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS recon_outcome text NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  DROP CONSTRAINT IF EXISTS audit_ready_tie_out_runs_recon_outcome_check;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD CONSTRAINT audit_ready_tie_out_runs_recon_outcome_check
  CHECK (
    recon_outcome IS NULL
    OR recon_outcome IN (
      'reconciled_exact',
      'reconciled_with_timing',
      'reconciled_immaterial_residual',
      'open_review',
      'open_material',
      'provider_action_required',
      'failed'
    )
  );

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS allows_timing_reconciled boolean NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS baseline_sync_id uuid NULL
    REFERENCES public.accounting_syncs(id) ON DELETE SET NULL;

ALTER TABLE public.audit_ready_tie_out_runs
  ADD COLUMN IF NOT EXISTS urm_bridge_persisted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_ar_tieout_runs_recon_outcome
  ON public.audit_ready_tie_out_runs(engagement_id, recon_outcome)
  WHERE recon_outcome IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ar_tieout_runs_baseline_sync
  ON public.audit_ready_tie_out_runs(baseline_sync_id)
  WHERE baseline_sync_id IS NOT NULL;

COMMENT ON COLUMN public.audit_ready_tie_out_runs.identified_items_total_cents IS
  'URM-2: Σ identified reconciling item amounts (cents) at bridge persist time.';
COMMENT ON COLUMN public.audit_ready_tie_out_runs.unidentified_residual_cents IS
  'URM-2: derived residual = totals_variance_cents − identified_items_total_cents.';
COMMENT ON COLUMN public.audit_ready_tie_out_runs.recon_outcome IS
  'URM-2: run-level reconOutcome from deriveReconBridge (not legacy totals_status).';
COMMENT ON COLUMN public.audit_ready_tie_out_runs.baseline_sync_id IS
  'URM-2 schema hook for Patent/Accuracy Contract sync pin. Column+FK only; URM-2 helpers MUST NOT populate it. Later custody PR sets from canonical financial context.';

-- ─────────────────────────────────────────────────────────────
-- 2) audit_ready_reconciling_items — identified workpaper items only
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_reconciling_items (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                          uuid NOT NULL
    REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  engagement_id                   uuid NOT NULL
    REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  pbc_request_id                  uuid NOT NULL
    REFERENCES public.audit_ready_pbc_requests(id) ON DELETE CASCADE,
  -- Identified classes only — unidentified residual is NEVER stored here.
  item_class                      text NOT NULL
    CHECK (item_class IN (
      'identified_timing',
      'identified_documented',
      'identified_reclass',
      'identified_error'
    )),
  amount_cents                    bigint NOT NULL,
  entity_kind                     text NULL,
  entity_display_name             text NULL,
  expected_clear_date             date NULL,
  clearance_policy                text NOT NULL
    CHECK (clearance_policy IN (
      'may_reconcile_with_timing',
      'requires_resolution',
      'immaterial_ok'
    )),
  status                          text NOT NULL
    CHECK (status IN ('tie', 'auto_cleared', 'review', 'kickout')),
  -- Optional link to measurement-layer variance (not the item identity).
  measurement_link_variance_id    uuid NULL
    REFERENCES public.audit_ready_tie_out_variances(id) ON DELETE SET NULL,
  -- Opaque evidence refs until URM-3 evidence spine. No FK / taxonomy expansion.
  evidence_ids                    uuid[] NOT NULL DEFAULT '{}',
  narrative                       text NULL,
  sort_order                      integer NOT NULL DEFAULT 0,
  created_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_reconciling_items_run
  ON public.audit_ready_reconciling_items(run_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_ar_reconciling_items_engagement
  ON public.audit_ready_reconciling_items(engagement_id, item_class);

CREATE INDEX IF NOT EXISTS idx_ar_reconciling_items_variance_link
  ON public.audit_ready_reconciling_items(measurement_link_variance_id)
  WHERE measurement_link_variance_id IS NOT NULL;

COMMENT ON TABLE public.audit_ready_reconciling_items IS
  'URM-2: identified reconciling items (workpaper/remediation). Unidentified residual is derived on the run, not stored as an item.';

-- ─────────────────────────────────────────────────────────────
-- 3) RLS — mirror variances: service_role write; engagement-scoped read
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_reconciling_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ar_reconciling_items_service_role_all
  ON public.audit_ready_reconciling_items;
CREATE POLICY ar_reconciling_items_service_role_all
  ON public.audit_ready_reconciling_items
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ar_reconciling_items_engagement_read
  ON public.audit_ready_reconciling_items;
CREATE POLICY ar_reconciling_items_engagement_read
  ON public.audit_ready_reconciling_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_reconciling_items.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 4) Run identity is authoritative — stamp engagement/pbc from run
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_ar_reconciling_items_stamp_run_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_engagement_id uuid;
  v_pbc_request_id uuid;
BEGIN
  SELECT r.engagement_id, r.pbc_request_id
    INTO v_engagement_id, v_pbc_request_id
  FROM public.audit_ready_tie_out_runs r
  WHERE r.id = NEW.run_id;

  IF v_engagement_id IS NULL THEN
    RAISE EXCEPTION 'run_not_found';
  END IF;

  -- Always overwrite caller-supplied engagement/pbc — run is sole authority.
  NEW.engagement_id := v_engagement_id;
  NEW.pbc_request_id := v_pbc_request_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ar_reconciling_items_stamp_run_identity
  ON public.audit_ready_reconciling_items;
CREATE TRIGGER trg_ar_reconciling_items_stamp_run_identity
  BEFORE INSERT OR UPDATE OF run_id, engagement_id, pbc_request_id
  ON public.audit_ready_reconciling_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_ar_reconciling_items_stamp_run_identity();

COMMENT ON FUNCTION public.trg_ar_reconciling_items_stamp_run_identity() IS
  'URM-2: forces engagement_id/pbc_request_id from audit_ready_tie_out_runs; callers cannot stamp cross-engagement identity.';

-- ─────────────────────────────────────────────────────────────
-- 5) Atomic persist / clear RPCs (single state transition)
-- TS owns deriveReconBridge math; this RPC only persists already-derived values.
-- Does NOT set baseline_sync_id (custody PR later).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.persist_audit_ready_recon_bridge(
  p_run_id uuid,
  p_items jsonb,
  p_identified_items_total_cents bigint,
  p_unidentified_residual_cents bigint,
  p_reconciling_item_count integer,
  p_unresolved_material_count integer,
  p_recon_outcome text,
  p_allows_timing_reconciled boolean,
  p_persisted_at timestamptz DEFAULT now()
)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_engagement_id uuid;
  v_pbc_request_id uuid;
  v_totals_variance_cents bigint;
  v_item jsonb;
  v_idx integer := 0;
  v_item_ids uuid[] := '{}';
  v_new_id uuid;
  v_class text;
  v_evidence uuid[];
  v_items_sum_cents bigint;
BEGIN
  SELECT r.engagement_id, r.pbc_request_id, r.totals_variance_cents
    INTO v_engagement_id, v_pbc_request_id, v_totals_variance_cents
  FROM public.audit_ready_tie_out_runs r
  WHERE r.id = p_run_id
  FOR UPDATE;

  IF v_engagement_id IS NULL THEN
    RAISE EXCEPTION 'run_not_found';
  END IF;

  IF v_totals_variance_cents IS NULL THEN
    RAISE EXCEPTION 'urm2_gross_variance_authority_missing';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'urm2_items_must_be_json_array';
  END IF;

  IF p_identified_items_total_cents IS NULL
     OR p_unidentified_residual_cents IS NULL
  THEN
    RAISE EXCEPTION 'urm2_bridge_totals_required';
  END IF;

  IF p_recon_outcome IS NULL OR p_recon_outcome NOT IN (
    'reconciled_exact',
    'reconciled_with_timing',
    'reconciled_immaterial_residual',
    'open_review',
    'open_material',
    'provider_action_required',
    'failed'
  ) THEN
    RAISE EXCEPTION 'urm2_invalid_recon_outcome';
  END IF;

  -- Reject residual-as-item before any mutation.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_class := v_item->>'item_class';
    IF v_class IS NULL
       OR v_class = 'unidentified_residual'
       OR v_class NOT IN (
         'identified_timing',
         'identified_documented',
         'identified_reclass',
         'identified_error'
       )
    THEN
      RAISE EXCEPTION 'urm2_unidentified_residual_not_persistable';
    END IF;
  END LOOP;

  -- Persistence integrity assertions (NOT a second formula engine).
  -- All checks run BEFORE DELETE/INSERT/UPDATE so failures leave prior state intact.
  SELECT COALESCE(SUM((e.value->>'amount_cents')::bigint), 0)
    INTO v_items_sum_cents
  FROM jsonb_array_elements(p_items) AS e(value);

  IF v_items_sum_cents <> p_identified_items_total_cents THEN
    RAISE EXCEPTION 'urm2_identified_total_mismatch';
  END IF;

  IF (p_identified_items_total_cents + p_unidentified_residual_cents)
       <> v_totals_variance_cents
  THEN
    RAISE EXCEPTION 'urm2_cent_exact_bridge_mismatch';
  END IF;

  DELETE FROM public.audit_ready_reconciling_items
  WHERE run_id = p_run_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_evidence := COALESCE(
      ARRAY(
        SELECT jsonb_array_elements_text(COALESCE(v_item->'evidence_ids', '[]'::jsonb))::uuid
      ),
      '{}'::uuid[]
    );

    INSERT INTO public.audit_ready_reconciling_items (
      run_id,
      engagement_id,
      pbc_request_id,
      item_class,
      amount_cents,
      entity_kind,
      entity_display_name,
      expected_clear_date,
      clearance_policy,
      status,
      measurement_link_variance_id,
      evidence_ids,
      narrative,
      sort_order
    ) VALUES (
      p_run_id,
      v_engagement_id,
      v_pbc_request_id,
      v_item->>'item_class',
      (v_item->>'amount_cents')::bigint,
      NULLIF(v_item->>'entity_kind', ''),
      NULLIF(v_item->>'entity_display_name', ''),
      NULLIF(v_item->>'expected_clear_date', '')::date,
      v_item->>'clearance_policy',
      v_item->>'status',
      NULLIF(v_item->>'measurement_link_variance_id', '')::uuid,
      v_evidence,
      NULLIF(v_item->>'narrative', ''),
      v_idx
    )
    RETURNING id INTO v_new_id;

    v_item_ids := array_append(v_item_ids, v_new_id);
    v_idx := v_idx + 1;
  END LOOP;

  UPDATE public.audit_ready_tie_out_runs
  SET
    identified_items_total_cents = p_identified_items_total_cents,
    unidentified_residual_cents = p_unidentified_residual_cents,
    reconciling_item_count = p_reconciling_item_count,
    unresolved_material_count = p_unresolved_material_count,
    recon_outcome = p_recon_outcome,
    allows_timing_reconciled = p_allows_timing_reconciled,
    urm_bridge_persisted_at = p_persisted_at
    -- baseline_sync_id intentionally NOT touched
  WHERE id = p_run_id;

  RETURN v_item_ids;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_audit_ready_recon_bridge(
  p_run_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.audit_ready_tie_out_runs WHERE id = p_run_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'run_not_found';
  END IF;

  DELETE FROM public.audit_ready_reconciling_items
  WHERE run_id = p_run_id;

  UPDATE public.audit_ready_tie_out_runs
  SET
    identified_items_total_cents = NULL,
    unidentified_residual_cents = NULL,
    reconciling_item_count = NULL,
    unresolved_material_count = NULL,
    recon_outcome = NULL,
    allows_timing_reconciled = NULL,
    urm_bridge_persisted_at = NULL
    -- baseline_sync_id intentionally retained
  WHERE id = p_run_id;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_audit_ready_recon_bridge(
  uuid, jsonb, bigint, bigint, integer, integer, text, boolean, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_audit_ready_recon_bridge(
  uuid, jsonb, bigint, bigint, integer, integer, text, boolean, timestamptz
) TO service_role;

REVOKE ALL ON FUNCTION public.clear_audit_ready_recon_bridge(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_audit_ready_recon_bridge(uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.trg_ar_reconciling_items_stamp_run_identity()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.persist_audit_ready_recon_bridge(
  uuid, jsonb, bigint, bigint, integer, integer, text, boolean, timestamptz
) IS
  'URM-2: atomic replace of identified reconciling items + run URM columns. Run identity authoritative. Asserts SUM(items)=identified_total and identified+residual=totals_variance_cents BEFORE mutation. Does not set baseline_sync_id. Does not compute residual/outcome math.';

COMMENT ON FUNCTION public.clear_audit_ready_recon_bridge(uuid) IS
  'URM-2: atomic clear of identified items + run URM columns; retains baseline_sync_id.';

COMMIT;
-- <<< end 20260815000000_urm2_reconciling_items_persistence.sql

-- >>> begin 20260815120000_urm3_universal_evidence_spine.sql
-- URM-3: Universal reconciliation evidence spine.
-- Additive only. Reuses audit_ready_tie_out_variance_evidence (no new evidence table).
--
-- Locks:
-- - Evidence attaches to Identified Reconciling Items (and optionally measurement variances).
-- - Evidence NEVER authors GL/subledger balances or changes unidentified residual math.
-- - GRNI continues to write variance-only evidence rows (variance_id set, reconciling_item_id null).
-- - URM-2 evidence_ids[] remains a denormalized cache; FK reconciling_item_id is source of truth.
-- - content_hash is SHA-256 hex (64 lowercase [a-f0-9]) when present; required for storage_path rows.
--
-- READY ONLY — do not apply to production until authorized live smoke.

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) Link evidence → reconciling items; relax variance-only requirement
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS reconciling_item_id uuid NULL
    REFERENCES public.audit_ready_reconciling_items(id) ON DELETE CASCADE;

-- Legacy GRNI/AR/AP evidence always had variance_id. Third-party item evidence may
-- attach to a reconciling item without a measurement variance row.
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ALTER COLUMN variance_id DROP NOT NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS arte_variance_or_item_required;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT arte_variance_or_item_required
  CHECK (variance_id IS NOT NULL OR reconciling_item_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_arte_reconciling_item_id
  ON public.audit_ready_tie_out_variance_evidence(reconciling_item_id)
  WHERE reconciling_item_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2) Expand source_kind + provider-neutral / third-party fields
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS audit_ready_tie_out_variance_evidence_source_kind_check;

-- Discover legacy check name if auto-generated differently
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.audit_ready_tie_out_variance_evidence'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%source_kind%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.audit_ready_tie_out_variance_evidence DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT audit_ready_tie_out_variance_evidence_source_kind_check
  CHECK (source_kind IN (
    -- Legacy QBO measurement kinds (GRNI / AR / AP / Inventory)
    'bill',
    'invoice',
    'inventory_adjustment',
    -- Provider-neutral / third-party spine (URM-3 lock)
    'bank_statement',
    'vendor_statement',
    'customer_statement',
    'confirmation',
    'count_sheet',
    'amort_schedule',
    'reserve_model',
    'fixed_asset_register',
    'debt_statement',
    'tax_document',
    'lease_schedule',
    'system_generated_schedule',
    'provider_txn',
    'pbc_upload',
    'manual_attachment'
  ));

-- Provider-neutral identity (source_qbo_id remains for GRNI; nullable for third-party).
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ALTER COLUMN source_qbo_id DROP NOT NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS provider text NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS audit_ready_tie_out_variance_evidence_provider_check;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT audit_ready_tie_out_variance_evidence_provider_check
  CHECK (
    provider IS NULL
    OR provider IN ('quickbooks', 'xero', 'external', 'system', 'manual')
  );

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS external_ref text NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS storage_path text NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS content_hash text NULL;

-- Workpaper / document display metadata (URM-3 lock)
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS file_name text NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS content_type text NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS source_date date NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz NULL;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS arte_source_identity_required;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT arte_source_identity_required
  CHECK (
    source_qbo_id IS NOT NULL
    OR external_ref IS NOT NULL
    OR storage_path IS NOT NULL
  );

-- Integrity hash: Advisacor convention = sha256 hex digest (64 lowercase hex),
-- same as upload-artifact / FA / BS recon artifact writers.
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS arte_content_hash_sha256_hex;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT arte_content_hash_sha256_hex
  CHECK (
    content_hash IS NULL
    OR content_hash ~ '^[a-f0-9]{64}$'
  );

-- Uploaded/static storage evidence must carry a real integrity hash.
ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS arte_storage_requires_content_hash;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT arte_storage_requires_content_hash
  CHECK (
    storage_path IS NULL
    OR content_hash ~ '^[a-f0-9]{64}$'
  );

-- Idempotency for logical attachment identity (retry-safe).
-- Same document may support multiple items and/or multiple variances;
-- uniqueness is per attachment identity, not merely (item, hash).
DROP INDEX IF EXISTS uq_arte_item_content_hash;
CREATE UNIQUE INDEX IF NOT EXISTS uq_arte_item_only_content_hash
  ON public.audit_ready_tie_out_variance_evidence(reconciling_item_id, content_hash)
  WHERE reconciling_item_id IS NOT NULL
    AND content_hash IS NOT NULL
    AND variance_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_arte_item_variance_content_hash
  ON public.audit_ready_tie_out_variance_evidence(reconciling_item_id, variance_id, content_hash)
  WHERE reconciling_item_id IS NOT NULL
    AND variance_id IS NOT NULL
    AND content_hash IS NOT NULL;

-- Document / third-party rows may carry zero contribution cents.
-- Keep total/subtotal/balance NOT NULL (callers pass 0).

CREATE INDEX IF NOT EXISTS idx_arte_provider_external_ref
  ON public.audit_ready_tie_out_variance_evidence(provider, external_ref)
  WHERE external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_arte_content_hash
  ON public.audit_ready_tie_out_variance_evidence(content_hash)
  WHERE content_hash IS NOT NULL;

COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.reconciling_item_id IS
  'URM-3: optional FK to identified reconciling item. Source of truth for item↔evidence; URM-2 evidence_ids[] is denormalized repairable cache.';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.provider IS
  'URM-3: quickbooks | xero | external | system | manual. Null allowed for legacy GRNI rows.';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.external_ref IS
  'URM-3: provider-neutral external id (replaces sole reliance on source_qbo_id for non-QBO evidence).';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.storage_path IS
  'URM-3: uploaded third-party document path (PBC / statement / confirmation). Requires content_hash.';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.content_hash IS
  'URM-3: SHA-256 of attached document bytes as 64 lowercase hex (createHash("sha256").digest("hex")). Fail-closed format. Does not affect recon math.';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.file_name IS
  'URM-3: original file name for workpaper display.';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.content_type IS
  'URM-3: MIME type for workpaper display (e.g. application/pdf).';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.source_date IS
  'URM-3: document/source as-of date (statement period end, confirmation date, etc.).';
COMMENT ON COLUMN public.audit_ready_tie_out_variance_evidence.fetched_at IS
  'URM-3: when the evidence bytes/metadata were fetched or uploaded.';

COMMENT ON TABLE public.audit_ready_tie_out_variance_evidence IS
  'URM-3 universal evidence spine (extends PBC-TIEOUT-3.4). Measurement variance and/or identified reconciling item evidence. Never authors residual/outcome math.';

-- ─────────────────────────────────────────────────────────────
-- 3) Same-run integrity stamp (run + engagement from item/variance)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_arte_stamp_run_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_engagement_id uuid;
  v_item_run_id uuid;
  v_var_run_id uuid;
BEGIN
  IF NEW.reconciling_item_id IS NOT NULL THEN
    SELECT i.run_id, i.engagement_id
      INTO v_item_run_id, v_engagement_id
    FROM public.audit_ready_reconciling_items i
    WHERE i.id = NEW.reconciling_item_id;

    IF v_item_run_id IS NULL THEN
      RAISE EXCEPTION 'urm3_reconciling_item_not_found';
    END IF;

    v_run_id := v_item_run_id;
    NEW.run_id := v_item_run_id;
    NEW.engagement_id := v_engagement_id;
  END IF;

  IF NEW.variance_id IS NOT NULL THEN
    SELECT v.run_id, v.engagement_id
      INTO v_var_run_id, v_engagement_id
    FROM public.audit_ready_tie_out_variances v
    WHERE v.id = NEW.variance_id;

    IF v_var_run_id IS NULL THEN
      RAISE EXCEPTION 'urm3_variance_not_found';
    END IF;

    IF v_run_id IS NOT NULL AND v_run_id <> v_var_run_id THEN
      RAISE EXCEPTION 'urm3_cross_run_evidence_forbidden';
    END IF;

    NEW.run_id := v_var_run_id;
    NEW.engagement_id := v_engagement_id;
  END IF;

  -- Normalize content_hash when provided (lowercase; strip optional sha256: prefix).
  IF NEW.content_hash IS NOT NULL THEN
    NEW.content_hash := lower(regexp_replace(btrim(NEW.content_hash), '^sha256:', ''));
    IF NEW.content_hash !~ '^[a-f0-9]{64}$' THEN
      RAISE EXCEPTION 'urm3_invalid_content_hash';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_arte_stamp_run_identity
  ON public.audit_ready_tie_out_variance_evidence;
CREATE TRIGGER trg_arte_stamp_run_identity
  BEFORE INSERT OR UPDATE OF variance_id, reconciling_item_id, run_id, engagement_id, content_hash
  ON public.audit_ready_tie_out_variance_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_arte_stamp_run_identity();

REVOKE ALL ON FUNCTION public.trg_arte_stamp_run_identity()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.trg_arte_stamp_run_identity() IS
  'URM-3: stamps evidence run/engagement from variance and/or reconciling item; forbids cross-run linkage; normalizes/validates content_hash.';

-- ─────────────────────────────────────────────────────────────
-- 4) RLS — explicit engagement membership (cross-engagement denied)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "arte_select_via_variance" ON public.audit_ready_tie_out_variance_evidence;
DROP POLICY IF EXISTS arte_select_engagement_read ON public.audit_ready_tie_out_variance_evidence;
CREATE POLICY arte_select_engagement_read
  ON public.audit_ready_tie_out_variance_evidence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_tie_out_variance_evidence.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );

-- Explicit service_role write policy (mirrors reconciling_items).
DROP POLICY IF EXISTS arte_service_role_all ON public.audit_ready_tie_out_variance_evidence;
CREATE POLICY arte_service_role_all
  ON public.audit_ready_tie_out_variance_evidence
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
-- <<< end 20260815120000_urm3_universal_evidence_spine.sql

-- >>> begin 20260815130000_urm3_hash_normalization_order.sql
-- URM-3.1: Align evidence content_hash normalization with TypeScript contract.
-- Corrective only — does NOT alter already-applied
-- 20260815120000_urm3_universal_evidence_spine.sql or migration history.
--
-- Live defect: trigger did lower(regexp_replace(..., '^sha256:', '')), so
-- case-sensitive prefix strip ran before lowercasing and rejected SHA256:HEX.
-- Fix order (matches normalizeEvidenceContentHash): lower first, then strip.
--
-- READY ONLY — do not apply until authorized after PR review.

CREATE OR REPLACE FUNCTION public.trg_arte_stamp_run_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_engagement_id uuid;
  v_item_run_id uuid;
  v_var_run_id uuid;
BEGIN
  IF NEW.reconciling_item_id IS NOT NULL THEN
    SELECT i.run_id, i.engagement_id
      INTO v_item_run_id, v_engagement_id
    FROM public.audit_ready_reconciling_items i
    WHERE i.id = NEW.reconciling_item_id;

    IF v_item_run_id IS NULL THEN
      RAISE EXCEPTION 'urm3_reconciling_item_not_found';
    END IF;

    v_run_id := v_item_run_id;
    NEW.run_id := v_item_run_id;
    NEW.engagement_id := v_engagement_id;
  END IF;

  IF NEW.variance_id IS NOT NULL THEN
    SELECT v.run_id, v.engagement_id
      INTO v_var_run_id, v_engagement_id
    FROM public.audit_ready_tie_out_variances v
    WHERE v.id = NEW.variance_id;

    IF v_var_run_id IS NULL THEN
      RAISE EXCEPTION 'urm3_variance_not_found';
    END IF;

    IF v_run_id IS NOT NULL AND v_run_id <> v_var_run_id THEN
      RAISE EXCEPTION 'urm3_cross_run_evidence_forbidden';
    END IF;

    NEW.run_id := v_var_run_id;
    NEW.engagement_id := v_engagement_id;
  END IF;

  -- Normalize content_hash: lower first, then strip optional sha256: prefix
  -- (matches lib/audit-ready/tie-out/evidence-spine.ts normalizeEvidenceContentHash).
  IF NEW.content_hash IS NOT NULL THEN
    NEW.content_hash := regexp_replace(lower(btrim(NEW.content_hash)), '^sha256:', '');
    IF NEW.content_hash !~ '^[a-f0-9]{64}$' THEN
      RAISE EXCEPTION 'urm3_invalid_content_hash';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_arte_stamp_run_identity() IS
  'URM-3/URM-3.1: stamps evidence run/engagement from variance and/or reconciling item; forbids cross-run linkage; normalizes content_hash (lower then strip sha256: prefix) then validates.';
-- <<< end 20260815130000_urm3_hash_normalization_order.sql

-- >>> begin 20260815140000_urm3_storage_requires_hash_not_null.sql
-- URM-3.2: Require non-null content_hash when storage_path is set.
-- Corrective only — does NOT alter already-applied:
--   20260815120000_urm3_universal_evidence_spine.sql
--   20260815130000_urm3_hash_normalization_order.sql
--
-- Live defect: CHECK was
--   storage_path IS NULL OR content_hash ~ '^[a-f0-9]{64}$'
-- In PostgreSQL, CHECK fails only on FALSE; NULL passes, so
-- storage_path SET + content_hash NULL slipped through.
--
-- READY ONLY — do not apply until authorized after PR review.

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  DROP CONSTRAINT IF EXISTS arte_storage_requires_content_hash;

ALTER TABLE public.audit_ready_tie_out_variance_evidence
  ADD CONSTRAINT arte_storage_requires_content_hash
  CHECK (
    storage_path IS NULL
    OR (
      content_hash IS NOT NULL
      AND content_hash ~ '^[a-f0-9]{64}$'
    )
  );

COMMENT ON CONSTRAINT arte_storage_requires_content_hash
  ON public.audit_ready_tie_out_variance_evidence IS
  'URM-3.2: storage-backed evidence requires a non-null SHA-256 hex content_hash (NULL regex no longer passes CHECK).';
-- <<< end 20260815140000_urm3_storage_requires_hash_not_null.sql

-- >>> begin 20260818020716_accounting_measurement_snapshots.sql
-- CC-2A1 — AR measurement-input custody.
-- Sibling of accounting_syncs. Do NOT expand accounting_syncs.normalized_payload.
-- Immutable evidence input: no payload/hash/sync/as-of mutation; no historical backfill.
-- Custody authority is the parent accounting_syncs row. Do not duplicate
-- company/connection/provider/tenant columns that can contradict the parent.

CREATE TABLE IF NOT EXISTS public.accounting_measurement_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accounting_sync_id uuid NOT NULL
    REFERENCES public.accounting_syncs(id)
    ON DELETE CASCADE,
  snapshot_kind text NOT NULL,
  as_of_date date NOT NULL,
  schema_version integer NOT NULL,
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  source_request_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_measurement_snapshots_unique
    UNIQUE (accounting_sync_id, snapshot_kind, as_of_date),
  CONSTRAINT accounting_measurement_snapshots_kind_check
    CHECK (snapshot_kind IN ('ar_aging')),
  CONSTRAINT accounting_measurement_snapshots_schema_version_check
    CHECK (schema_version > 0),
  CONSTRAINT accounting_measurement_snapshots_payload_hash_check
    CHECK (payload_hash ~ '^[a-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS accounting_measurement_snapshots_kind_asof_idx
  ON public.accounting_measurement_snapshots (snapshot_kind, as_of_date);

COMMENT ON TABLE public.accounting_measurement_snapshots IS
  'Immutable URM measurement-input custody. Identity authority is accounting_syncs(id); company/connection/provider/tenant are not duplicated.';

CREATE OR REPLACE FUNCTION public.accounting_measurement_snapshots_deny_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'accounting_measurement_snapshots rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS accounting_measurement_snapshots_immutable
  ON public.accounting_measurement_snapshots;
CREATE TRIGGER accounting_measurement_snapshots_immutable
  BEFORE UPDATE ON public.accounting_measurement_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.accounting_measurement_snapshots_deny_update();

ALTER TABLE public.accounting_measurement_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounting_measurement_snapshots_service_role_all
  ON public.accounting_measurement_snapshots;
CREATE POLICY accounting_measurement_snapshots_service_role_all
  ON public.accounting_measurement_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS accounting_measurement_snapshots_select
  ON public.accounting_measurement_snapshots;
CREATE POLICY accounting_measurement_snapshots_select
  ON public.accounting_measurement_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.accounting_syncs s
      JOIN public.company_users cu
        ON cu.company_id = s.company_id
      WHERE s.id = accounting_measurement_snapshots.accounting_sync_id
        AND cu.user_id = (SELECT auth.uid())
        AND cu.status = 'active'
    )
  );

GRANT SELECT ON public.accounting_measurement_snapshots TO authenticated;
GRANT ALL ON public.accounting_measurement_snapshots TO service_role;
-- <<< end 20260818020716_accounting_measurement_snapshots.sql

-- >>> begin 20260818040000_accounting_measurement_snapshots_ap_aging_kind.sql
-- CC-2A2 — permit AP aging measurement snapshots on the existing table.
-- Additive CHECK only. Do not edit 20260818020716. No backfill. No RLS change.

ALTER TABLE public.accounting_measurement_snapshots
  DROP CONSTRAINT IF EXISTS accounting_measurement_snapshots_kind_check;

ALTER TABLE public.accounting_measurement_snapshots
  ADD CONSTRAINT accounting_measurement_snapshots_kind_check
  CHECK (snapshot_kind IN ('ar_aging', 'ap_aging'));
-- <<< end 20260818040000_accounting_measurement_snapshots_ap_aging_kind.sql

-- >>> begin 20260818050000_accounting_measurement_snapshots_inventory_kind.sql
-- CC-2A3 — permit inventory measurement snapshots on the existing table.
-- Additive CHECK only. Do not edit prior applied migrations. No backfill. No RLS change.

ALTER TABLE public.accounting_measurement_snapshots
  DROP CONSTRAINT IF EXISTS accounting_measurement_snapshots_kind_check;

ALTER TABLE public.accounting_measurement_snapshots
  ADD CONSTRAINT accounting_measurement_snapshots_kind_check
  CHECK (snapshot_kind IN ('ar_aging', 'ap_aging', 'inventory'));
-- <<< end 20260818050000_accounting_measurement_snapshots_inventory_kind.sql

-- >>> begin 20260819045253_continuous_close_runs.sql
-- CC-2B — persisted Continuous Close OBSERVE runs.
-- Query/read authority lives here. Patent #6 chain custody stays on ledger_events.
-- Append-only: no UPDATE/DELETE of historical close evaluations.

CREATE TABLE IF NOT EXISTS public.continuous_close_runs (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL
    REFERENCES public.companies(id)
    ON DELETE RESTRICT,
  engagement_id uuid NOT NULL
    REFERENCES public.audit_ready_engagements(id)
    ON DELETE RESTRICT,
  firm_client_id uuid NULL
    REFERENCES public.firm_clients(id)
    ON DELETE RESTRICT,
  close_period_id uuid NULL
    REFERENCES public.close_periods(id)
    ON DELETE SET NULL,
  accounting_sync_id uuid NOT NULL
    REFERENCES public.accounting_syncs(id)
    ON DELETE RESTRICT,
  period_end date NOT NULL,
  mode text NOT NULL,
  readiness text NOT NULL,
  status text NOT NULL,
  policy_hash text NOT NULL,
  input_hash text NOT NULL,
  policy_snapshot jsonb NOT NULL,
  observation_summary jsonb NOT NULL,
  result jsonb NOT NULL,
  created_by uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE RESTRICT,
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  supersedes_run_id uuid NULL
    REFERENCES public.continuous_close_runs(id)
    ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT continuous_close_runs_mode_check
    CHECK (mode = 'OBSERVE'),
  CONSTRAINT continuous_close_runs_readiness_check
    CHECK (readiness IN ('READY', 'READY_WITH_REVIEW', 'BLOCKED')),
  CONSTRAINT continuous_close_runs_status_check
    CHECK (status = 'completed'),
  CONSTRAINT continuous_close_runs_policy_hash_check
    CHECK (policy_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT continuous_close_runs_input_hash_check
    CHECK (input_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT continuous_close_runs_idempotency_key_check
    CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  CONSTRAINT continuous_close_runs_idempotency_key_unique
    UNIQUE (idempotency_key),
  CONSTRAINT continuous_close_runs_not_self_supersede
    CHECK (supersedes_run_id IS NULL OR supersedes_run_id <> id)
);

CREATE INDEX IF NOT EXISTS continuous_close_runs_engagement_period_sync_idx
  ON public.continuous_close_runs (engagement_id, period_end, accounting_sync_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS continuous_close_runs_company_idx
  ON public.continuous_close_runs (company_id, created_at DESC);

COMMENT ON TABLE public.continuous_close_runs IS
  'Immutable Continuous Close OBSERVE evaluations. Ledger chain receipts are ledger_events, not columns here.';

CREATE OR REPLACE FUNCTION public.continuous_close_runs_deny_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'continuous_close_runs rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS continuous_close_runs_immutable_update
  ON public.continuous_close_runs;
CREATE TRIGGER continuous_close_runs_immutable_update
  BEFORE UPDATE ON public.continuous_close_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.continuous_close_runs_deny_mutation();

DROP TRIGGER IF EXISTS continuous_close_runs_immutable_delete
  ON public.continuous_close_runs;
CREATE TRIGGER continuous_close_runs_immutable_delete
  BEFORE DELETE ON public.continuous_close_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.continuous_close_runs_deny_mutation();

ALTER TABLE public.continuous_close_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS continuous_close_runs_service_role_all
  ON public.continuous_close_runs;
CREATE POLICY continuous_close_runs_service_role_all
  ON public.continuous_close_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated SELECT mirrors resolveEngagementActorForVerifiedUser read
-- semantics (any active company or firm membership on the canonical
-- engagement). Super-admin remains server/service-role, not an email
-- allowlist in SQL. Writes stay service_role.
DROP POLICY IF EXISTS continuous_close_runs_select
  ON public.continuous_close_runs;
CREATE POLICY continuous_close_runs_select
  ON public.continuous_close_runs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = continuous_close_runs.engagement_id
        AND (
          (
            e.company_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.company_users cu
              WHERE cu.company_id = e.company_id
                AND cu.user_id = (SELECT auth.uid())
                AND cu.status = 'active'
            )
          )
          OR
          (
            e.firm_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.firm_memberships fm
              WHERE fm.firm_id = e.firm_id
                AND fm.user_id = (SELECT auth.uid())
                AND fm.status = 'active'
            )
          )
        )
    )
  );

GRANT SELECT ON public.continuous_close_runs TO authenticated;
GRANT ALL ON public.continuous_close_runs TO service_role;

-- Atomic insert + Patent #6 receipt. Unique conflict returns the existing row
-- without publishing a second event. publish_ledger_event failure rolls back
-- the CC row so query authority and chain receipt cannot drift.
CREATE OR REPLACE FUNCTION public.persist_continuous_close_observe_run(
  p_row jsonb,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  reused boolean,
  run jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.continuous_close_runs%ROWTYPE;
  v_inserted public.continuous_close_runs%ROWTYPE;
  v_event_id uuid;
BEGIN
  SELECT *
    INTO v_existing
    FROM public.continuous_close_runs
   WHERE idempotency_key = p_row->>'idempotency_key';

  IF FOUND THEN
    reused := true;
    run := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.continuous_close_runs (
    id,
    company_id,
    engagement_id,
    firm_client_id,
    close_period_id,
    accounting_sync_id,
    period_end,
    mode,
    readiness,
    status,
    policy_hash,
    input_hash,
    policy_snapshot,
    observation_summary,
    result,
    created_by,
    started_at,
    completed_at,
    supersedes_run_id,
    idempotency_key
  ) VALUES (
    (p_row->>'id')::uuid,
    (p_row->>'company_id')::uuid,
    (p_row->>'engagement_id')::uuid,
    NULLIF(p_row->>'firm_client_id', '')::uuid,
    NULLIF(p_row->>'close_period_id', '')::uuid,
    (p_row->>'accounting_sync_id')::uuid,
    (p_row->>'period_end')::date,
    p_row->>'mode',
    p_row->>'readiness',
    p_row->>'status',
    p_row->>'policy_hash',
    p_row->>'input_hash',
    COALESCE(p_row->'policy_snapshot', '{}'::jsonb),
    COALESCE(p_row->'observation_summary', '{}'::jsonb),
    COALESCE(p_row->'result', '{}'::jsonb),
    (p_row->>'created_by')::uuid,
    (p_row->>'started_at')::timestamptz,
    (p_row->>'completed_at')::timestamptz,
    NULLIF(p_row->>'supersedes_run_id', '')::uuid,
    p_row->>'idempotency_key'
  )
  RETURNING * INTO v_inserted;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'continuous_close.observe.completed',
      'close',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'continuous_close_run',
      v_inserted.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  reused := false;
  run := to_jsonb(v_inserted);
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO v_existing
      FROM public.continuous_close_runs
     WHERE idempotency_key = p_row->>'idempotency_key';
    IF NOT FOUND THEN
      RAISE;
    END IF;
    reused := true;
    run := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_continuous_close_observe_run(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_continuous_close_observe_run(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.persist_continuous_close_observe_run(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_continuous_close_observe_run(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;
-- <<< end 20260819045253_continuous_close_runs.sql

-- >>> begin 20260820233219_journal_entry_proposals.sql
-- JE-1 — CC-sourced journal entry proposal foundation.
-- Immutable proposal custody + Patent #6 journal_entry.proposed receipt.
-- No approval table, no execution table, no provider write.

CREATE TABLE IF NOT EXISTS public.journal_entry_proposals (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL
    REFERENCES public.companies(id)
    ON DELETE RESTRICT,
  engagement_id uuid NOT NULL
    REFERENCES public.audit_ready_engagements(id)
    ON DELETE RESTRICT,
  firm_client_id uuid NULL
    REFERENCES public.firm_clients(id)
    ON DELETE RESTRICT,
  period_end date NOT NULL,
  source_continuous_close_run_id uuid NOT NULL
    REFERENCES public.continuous_close_runs(id)
    ON DELETE RESTRICT,
  source_accounting_sync_id uuid NOT NULL
    REFERENCES public.accounting_syncs(id)
    ON DELETE RESTRICT,
  source_recon_run_ids jsonb NOT NULL,
  origin_type text NOT NULL,
  reason_code text NOT NULL,
  memo text NULL,
  currency text NOT NULL,
  txn_date date NOT NULL,
  lines jsonb NOT NULL,
  total_debits_cents bigint NOT NULL,
  total_credits_cents bigint NOT NULL,
  expected_effects jsonb NOT NULL,
  policy_snapshot jsonb NOT NULL,
  policy_hash text NOT NULL,
  proposal_hash text NOT NULL,
  status text NOT NULL,
  proposed_by uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE RESTRICT,
  proposed_at timestamptz NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_entry_proposals_origin_type_check
    CHECK (origin_type IN ('ACCRUAL', 'RECLASS')),
  CONSTRAINT journal_entry_proposals_status_check
    CHECK (status = 'SUBMITTED'),
  CONSTRAINT journal_entry_proposals_currency_check
    CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT journal_entry_proposals_totals_check
    CHECK (
      total_debits_cents > 0
      AND total_credits_cents > 0
      AND total_debits_cents = total_credits_cents
    ),
  CONSTRAINT journal_entry_proposals_policy_hash_check
    CHECK (policy_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_proposals_proposal_hash_check
    CHECK (proposal_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_proposals_idempotency_key_check
    CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_proposals_idempotency_key_unique
    UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS journal_entry_proposals_engagement_period_idx
  ON public.journal_entry_proposals (engagement_id, period_end, created_at DESC);

CREATE INDEX IF NOT EXISTS journal_entry_proposals_source_cc_idx
  ON public.journal_entry_proposals (source_continuous_close_run_id);

COMMENT ON TABLE public.journal_entry_proposals IS
  'Immutable CC-sourced JE proposals. Patent #6 receipts live on ledger_events. No provider write in JE-1.';

CREATE OR REPLACE FUNCTION public.journal_entry_proposals_deny_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'journal_entry_proposals rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS journal_entry_proposals_immutable_update
  ON public.journal_entry_proposals;
CREATE TRIGGER journal_entry_proposals_immutable_update
  BEFORE UPDATE ON public.journal_entry_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_proposals_deny_mutation();

DROP TRIGGER IF EXISTS journal_entry_proposals_immutable_delete
  ON public.journal_entry_proposals;
CREATE TRIGGER journal_entry_proposals_immutable_delete
  BEFORE DELETE ON public.journal_entry_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_proposals_deny_mutation();

ALTER TABLE public.journal_entry_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journal_entry_proposals_service_role_all
  ON public.journal_entry_proposals;
CREATE POLICY journal_entry_proposals_service_role_all
  ON public.journal_entry_proposals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated SELECT mirrors continuous_close_runs / engagement read authority.
DROP POLICY IF EXISTS journal_entry_proposals_select
  ON public.journal_entry_proposals;
CREATE POLICY journal_entry_proposals_select
  ON public.journal_entry_proposals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = journal_entry_proposals.engagement_id
        AND (
          (
            e.company_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.company_users cu
              WHERE cu.company_id = e.company_id
                AND cu.user_id = (SELECT auth.uid())
                AND cu.status = 'active'
            )
          )
          OR
          (
            e.firm_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.firm_memberships fm
              WHERE fm.firm_id = e.firm_id
                AND fm.user_id = (SELECT auth.uid())
                AND fm.status = 'active'
            )
          )
        )
    )
  );

GRANT SELECT ON public.journal_entry_proposals TO authenticated;
GRANT ALL ON public.journal_entry_proposals TO service_role;

-- Atomic insert + Patent #6 receipt. Unique conflict returns existing row
-- without publishing a second event. publish_ledger_event failure rolls back.
CREATE OR REPLACE FUNCTION public.persist_journal_entry_proposal(
  p_row jsonb,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  reused boolean,
  proposal jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.journal_entry_proposals%ROWTYPE;
  v_inserted public.journal_entry_proposals%ROWTYPE;
  v_event_id uuid;
BEGIN
  SELECT *
    INTO v_existing
    FROM public.journal_entry_proposals
   WHERE idempotency_key = p_row->>'idempotency_key';

  IF FOUND THEN
    reused := true;
    proposal := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.journal_entry_proposals (
    id,
    company_id,
    engagement_id,
    firm_client_id,
    period_end,
    source_continuous_close_run_id,
    source_accounting_sync_id,
    source_recon_run_ids,
    origin_type,
    reason_code,
    memo,
    currency,
    txn_date,
    lines,
    total_debits_cents,
    total_credits_cents,
    expected_effects,
    policy_snapshot,
    policy_hash,
    proposal_hash,
    status,
    proposed_by,
    proposed_at,
    idempotency_key
  ) VALUES (
    (p_row->>'id')::uuid,
    (p_row->>'company_id')::uuid,
    (p_row->>'engagement_id')::uuid,
    NULLIF(p_row->>'firm_client_id', '')::uuid,
    (p_row->>'period_end')::date,
    (p_row->>'source_continuous_close_run_id')::uuid,
    (p_row->>'source_accounting_sync_id')::uuid,
    COALESCE(p_row->'source_recon_run_ids', '[]'::jsonb),
    p_row->>'origin_type',
    p_row->>'reason_code',
    NULLIF(p_row->>'memo', ''),
    p_row->>'currency',
    (p_row->>'txn_date')::date,
    COALESCE(p_row->'lines', '[]'::jsonb),
    (p_row->>'total_debits_cents')::bigint,
    (p_row->>'total_credits_cents')::bigint,
    COALESCE(p_row->'expected_effects', '[]'::jsonb),
    COALESCE(p_row->'policy_snapshot', '{}'::jsonb),
    p_row->>'policy_hash',
    p_row->>'proposal_hash',
    p_row->>'status',
    (p_row->>'proposed_by')::uuid,
    (p_row->>'proposed_at')::timestamptz,
    p_row->>'idempotency_key'
  )
  RETURNING * INTO v_inserted;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.proposed',
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_proposal',
      v_inserted.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  reused := false;
  proposal := to_jsonb(v_inserted);
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO v_existing
      FROM public.journal_entry_proposals
     WHERE idempotency_key = p_row->>'idempotency_key';
    IF NOT FOUND THEN
      RAISE;
    END IF;
    reused := true;
    proposal := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_journal_entry_proposal(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_journal_entry_proposal(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.persist_journal_entry_proposal(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_journal_entry_proposal(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;
-- <<< end 20260820233219_journal_entry_proposals.sql

-- >>> begin 20260821042800_journal_entry_approvals.sql
-- JE-2 — Governed human approval / SoD custody for immutable JE-1 proposals.
-- Append-only approval decisions + Patent #6 journal_entry.approved|rejected.
-- No proposal mutation. No execution table. No provider write.

CREATE TABLE IF NOT EXISTS public.journal_entry_approvals (
  id uuid PRIMARY KEY,
  proposal_id uuid NOT NULL
    REFERENCES public.journal_entry_proposals(id)
    ON DELETE RESTRICT,
  company_id uuid NOT NULL
    REFERENCES public.companies(id)
    ON DELETE RESTRICT,
  engagement_id uuid NOT NULL
    REFERENCES public.audit_ready_engagements(id)
    ON DELETE RESTRICT,
  proposal_hash text NOT NULL,
  policy_hash text NOT NULL,
  decision text NOT NULL,
  approval_mode text NOT NULL,
  reviewer_user_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE RESTRICT,
  reviewer_role text NULL,
  mfa_level text NULL,
  mfa_verified_at timestamptz NULL,
  decision_reason text NULL,
  policy_snapshot jsonb NOT NULL,
  approved_at timestamptz NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_entry_approvals_decision_check
    CHECK (decision IN ('APPROVED', 'REJECTED')),
  CONSTRAINT journal_entry_approvals_mode_check
    CHECK (approval_mode = 'REVIEW_REQUIRED'),
  CONSTRAINT journal_entry_approvals_proposal_hash_check
    CHECK (proposal_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_approvals_policy_hash_check
    CHECK (policy_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_approvals_idempotency_key_check
    CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_approvals_idempotency_key_unique
    UNIQUE (idempotency_key)
);

-- At most one APPROVED decision per exact proposal + approval-policy binding.
CREATE UNIQUE INDEX IF NOT EXISTS journal_entry_approvals_one_approved_idx
  ON public.journal_entry_approvals (proposal_id, proposal_hash, policy_hash)
  WHERE decision = 'APPROVED';

CREATE INDEX IF NOT EXISTS journal_entry_approvals_proposal_idx
  ON public.journal_entry_approvals (proposal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS journal_entry_approvals_engagement_idx
  ON public.journal_entry_approvals (engagement_id, created_at DESC);

COMMENT ON TABLE public.journal_entry_approvals IS
  'Immutable JE-2 approval decisions for JE-1 proposals. policy_hash is the approval policy hash. No provider write.';

CREATE OR REPLACE FUNCTION public.journal_entry_approvals_deny_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'journal_entry_approvals rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS journal_entry_approvals_immutable_update
  ON public.journal_entry_approvals;
CREATE TRIGGER journal_entry_approvals_immutable_update
  BEFORE UPDATE ON public.journal_entry_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_approvals_deny_mutation();

DROP TRIGGER IF EXISTS journal_entry_approvals_immutable_delete
  ON public.journal_entry_approvals;
CREATE TRIGGER journal_entry_approvals_immutable_delete
  BEFORE DELETE ON public.journal_entry_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_approvals_deny_mutation();

ALTER TABLE public.journal_entry_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journal_entry_approvals_service_role_all
  ON public.journal_entry_approvals;
CREATE POLICY journal_entry_approvals_service_role_all
  ON public.journal_entry_approvals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS journal_entry_approvals_select
  ON public.journal_entry_approvals;
CREATE POLICY journal_entry_approvals_select
  ON public.journal_entry_approvals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = journal_entry_approvals.engagement_id
        AND (
          (
            e.company_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.company_users cu
              WHERE cu.company_id = e.company_id
                AND cu.user_id = (SELECT auth.uid())
                AND cu.status = 'active'
            )
          )
          OR
          (
            e.firm_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.firm_memberships fm
              WHERE fm.firm_id = e.firm_id
                AND fm.user_id = (SELECT auth.uid())
                AND fm.status = 'active'
            )
          )
        )
    )
  );

GRANT SELECT ON public.journal_entry_approvals TO authenticated;
GRANT ALL ON public.journal_entry_approvals TO service_role;

-- Atomic approval insert + Patent #6 receipt.
CREATE OR REPLACE FUNCTION public.persist_journal_entry_approval(
  p_row jsonb,
  p_event_type text,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  reused boolean,
  approval jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.journal_entry_approvals%ROWTYPE;
  v_inserted public.journal_entry_approvals%ROWTYPE;
  v_event_id uuid;
BEGIN
  IF p_event_type NOT IN ('journal_entry.approved', 'journal_entry.rejected') THEN
    RAISE EXCEPTION 'invalid journal entry approval event type: %', p_event_type;
  END IF;

  SELECT *
    INTO v_existing
    FROM public.journal_entry_approvals
   WHERE idempotency_key = p_row->>'idempotency_key';

  IF FOUND THEN
    reused := true;
    approval := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- If an APPROVED decision already binds this proposal+hashes, reuse it
  -- (different reviewer racing) without publishing a second event.
  IF p_row->>'decision' = 'APPROVED' THEN
    SELECT *
      INTO v_existing
      FROM public.journal_entry_approvals
     WHERE proposal_id = (p_row->>'proposal_id')::uuid
       AND proposal_hash = p_row->>'proposal_hash'
       AND policy_hash = p_row->>'policy_hash'
       AND decision = 'APPROVED'
     LIMIT 1;
    IF FOUND THEN
      reused := true;
      approval := to_jsonb(v_existing);
      ledger_event_id := NULL;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.journal_entry_approvals (
    id,
    proposal_id,
    company_id,
    engagement_id,
    proposal_hash,
    policy_hash,
    decision,
    approval_mode,
    reviewer_user_id,
    reviewer_role,
    mfa_level,
    mfa_verified_at,
    decision_reason,
    policy_snapshot,
    approved_at,
    idempotency_key
  ) VALUES (
    (p_row->>'id')::uuid,
    (p_row->>'proposal_id')::uuid,
    (p_row->>'company_id')::uuid,
    (p_row->>'engagement_id')::uuid,
    p_row->>'proposal_hash',
    p_row->>'policy_hash',
    p_row->>'decision',
    p_row->>'approval_mode',
    (p_row->>'reviewer_user_id')::uuid,
    NULLIF(p_row->>'reviewer_role', ''),
    NULLIF(p_row->>'mfa_level', ''),
    NULLIF(p_row->>'mfa_verified_at', '')::timestamptz,
    NULLIF(p_row->>'decision_reason', ''),
    COALESCE(p_row->'policy_snapshot', '{}'::jsonb),
    (p_row->>'approved_at')::timestamptz,
    p_row->>'idempotency_key'
  )
  RETURNING * INTO v_inserted;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      p_event_type,
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_proposal',
      v_inserted.proposal_id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  reused := false;
  approval := to_jsonb(v_inserted);
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO v_existing
      FROM public.journal_entry_approvals
     WHERE idempotency_key = p_row->>'idempotency_key';
    IF NOT FOUND AND p_row->>'decision' = 'APPROVED' THEN
      SELECT *
        INTO v_existing
        FROM public.journal_entry_approvals
       WHERE proposal_id = (p_row->>'proposal_id')::uuid
         AND proposal_hash = p_row->>'proposal_hash'
         AND policy_hash = p_row->>'policy_hash'
         AND decision = 'APPROVED'
       LIMIT 1;
    END IF;
    IF NOT FOUND THEN
      RAISE;
    END IF;
    reused := true;
    approval := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_journal_entry_approval(
  jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_journal_entry_approval(
  jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.persist_journal_entry_approval(
  jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_journal_entry_approval(
  jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;
-- <<< end 20260821042800_journal_entry_approvals.sql

-- >>> begin 20260821183525_journal_entry_executions.sql
-- JE-3A — Governed Journal Entry execution custody + preflight foundation.
-- Domain authority for execution/query. Stops at READY_TO_POST.
-- NO QBO POST. NO je_post_attempts rows. NO Memory. NO auto-governed principal.
-- Future JE-3B binds journal_entry_executions.id → je_post_attempts idempotency.

CREATE TABLE IF NOT EXISTS public.journal_entry_executions (
  id uuid PRIMARY KEY,
  proposal_id uuid NOT NULL
    REFERENCES public.journal_entry_proposals(id)
    ON DELETE RESTRICT,
  approval_id uuid NOT NULL
    REFERENCES public.journal_entry_approvals(id)
    ON DELETE RESTRICT,
  company_id uuid NOT NULL
    REFERENCES public.companies(id)
    ON DELETE RESTRICT,
  engagement_id uuid NOT NULL
    REFERENCES public.audit_ready_engagements(id)
    ON DELETE RESTRICT,
  firm_client_id uuid NULL,
  source_continuous_close_run_id uuid NOT NULL,
  source_accounting_sync_id uuid NOT NULL,
  accounting_connection_id uuid NOT NULL
    REFERENCES public.accounting_connections(id)
    ON DELETE RESTRICT,
  provider text NOT NULL,
  proposal_hash text NOT NULL,
  approval_policy_hash text NOT NULL,
  execution_policy_hash text NOT NULL,
  execution_hash text NOT NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL,
  correlation_marker text NOT NULL,
  execution_policy_snapshot jsonb NOT NULL,
  preflight_result jsonb NOT NULL,
  requested_by uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE RESTRICT,
  requested_at timestamptz NOT NULL,
  state_version integer NOT NULL DEFAULT 1,
  provider_journal_id text NULL,
  provider_request_hash text NULL,
  provider_response_hash text NULL,
  last_error_code text NULL,
  last_error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_entry_executions_provider_check
    CHECK (provider = 'quickbooks'),
  CONSTRAINT journal_entry_executions_status_check
    CHECK (status IN (
      'RESERVED',
      'PRECHECK_FAILED',
      'READY_TO_POST',
      'POSTING',
      'POSTED_UNVERIFIED',
      'UNKNOWN_COMMIT',
      'VERIFIED',
      'FAILED',
      'REVERSAL_REQUIRED'
    )),
  CONSTRAINT journal_entry_executions_proposal_hash_check
    CHECK (proposal_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_executions_approval_policy_hash_check
    CHECK (approval_policy_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_executions_execution_policy_hash_check
    CHECK (execution_policy_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_executions_execution_hash_check
    CHECK (execution_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_executions_idempotency_key_check
    CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_executions_idempotency_key_unique
    UNIQUE (idempotency_key),
  CONSTRAINT journal_entry_executions_correlation_marker_check
    CHECK (char_length(btrim(correlation_marker)) > 0),
  CONSTRAINT journal_entry_executions_correlation_marker_unique
    UNIQUE (correlation_marker),
  CONSTRAINT journal_entry_executions_approval_unique
    UNIQUE (approval_id),
  CONSTRAINT journal_entry_executions_state_version_check
    CHECK (state_version > 0),
  CONSTRAINT journal_entry_executions_provider_journal_null_until_post
    CHECK (provider_journal_id IS NULL OR status IN (
      'POSTED_UNVERIFIED',
      'UNKNOWN_COMMIT',
      'VERIFIED',
      'FAILED',
      'REVERSAL_REQUIRED',
      'POSTING'
    ))
);

CREATE INDEX IF NOT EXISTS journal_entry_executions_proposal_idx
  ON public.journal_entry_executions (proposal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS journal_entry_executions_engagement_idx
  ON public.journal_entry_executions (engagement_id, created_at DESC);

CREATE INDEX IF NOT EXISTS journal_entry_executions_connection_idx
  ON public.journal_entry_executions (accounting_connection_id);

CREATE INDEX IF NOT EXISTS journal_entry_executions_status_idx
  ON public.journal_entry_executions (status, updated_at DESC);

COMMENT ON TABLE public.journal_entry_executions IS
  'JE-3A governed execution custody. Mutable state machine with Patent #6 receipts. Domain authority for JE execution/query. Does not replace je_post_attempts (D2 spine for JE-3B). No provider write in JE-3A.';

COMMENT ON COLUMN public.journal_entry_executions.provider_journal_id IS
  'Nullable until a verified provider commit. JE-3A must never populate this.';

COMMENT ON COLUMN public.journal_entry_executions.accounting_connection_id IS
  'Canonical accounting_connections.id is domain authority; realm is provider metadata only.';

-- Authenticated path never writes; service_role uses RPCs that SET LOCAL.
-- Trigger blocks direct UPDATE/DELETE unless session flag is set by RPC.
CREATE OR REPLACE FUNCTION public.journal_entry_executions_guard_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('advisacor.je_execution_transition', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION
      'journal_entry_executions mutations must use transition_journal_entry_execution RPC';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'journal_entry_executions rows cannot be deleted';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS journal_entry_executions_guard_update
  ON public.journal_entry_executions;
CREATE TRIGGER journal_entry_executions_guard_update
  BEFORE UPDATE ON public.journal_entry_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_executions_guard_mutation();

DROP TRIGGER IF EXISTS journal_entry_executions_guard_delete
  ON public.journal_entry_executions;
CREATE TRIGGER journal_entry_executions_guard_delete
  BEFORE DELETE ON public.journal_entry_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_executions_guard_mutation();

ALTER TABLE public.journal_entry_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journal_entry_executions_service_role_all
  ON public.journal_entry_executions;
CREATE POLICY journal_entry_executions_service_role_all
  ON public.journal_entry_executions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS journal_entry_executions_select
  ON public.journal_entry_executions;
CREATE POLICY journal_entry_executions_select
  ON public.journal_entry_executions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = journal_entry_executions.engagement_id
        AND (
          (
            e.company_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.company_users cu
              WHERE cu.company_id = e.company_id
                AND cu.user_id = (SELECT auth.uid())
                AND cu.status = 'active'
            )
          )
          OR
          (
            e.firm_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.firm_memberships fm
              WHERE fm.firm_id = e.firm_id
                AND fm.user_id = (SELECT auth.uid())
                AND fm.status = 'active'
            )
          )
        )
    )
  );

GRANT SELECT ON public.journal_entry_executions TO authenticated;
GRANT ALL ON public.journal_entry_executions TO service_role;

-- Immutable binding equality for reservation reuse (excludes id/marker/status).
CREATE OR REPLACE FUNCTION public.je_execution_immutable_binding_matches(
  p_existing public.journal_entry_executions,
  p_row jsonb
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN
    p_existing.proposal_id::text = p_row->>'proposal_id'
    AND p_existing.approval_id::text = p_row->>'approval_id'
    AND p_existing.company_id::text = p_row->>'company_id'
    AND p_existing.engagement_id::text = p_row->>'engagement_id'
    AND p_existing.source_continuous_close_run_id::text = p_row->>'source_continuous_close_run_id'
    AND p_existing.source_accounting_sync_id::text = p_row->>'source_accounting_sync_id'
    AND p_existing.accounting_connection_id::text = p_row->>'accounting_connection_id'
    AND p_existing.provider = p_row->>'provider'
    AND p_existing.proposal_hash = p_row->>'proposal_hash'
    AND p_existing.approval_policy_hash = p_row->>'approval_policy_hash'
    AND p_existing.execution_policy_hash = p_row->>'execution_policy_hash'
    AND p_existing.execution_hash = p_row->>'execution_hash'
    AND p_existing.idempotency_key = p_row->>'idempotency_key';
END;
$$;

-- Atomic reservation insert + Patent #6 execution_requested receipt.
-- Exact logical reuse vs approval_id binding conflict are distinguished.
CREATE OR REPLACE FUNCTION public.persist_journal_entry_execution_reservation(
  p_row jsonb,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  reused boolean,
  reuse_reason text,
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.journal_entry_executions%ROWTYPE;
  v_inserted public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
BEGIN
  SELECT *
    INTO v_existing
    FROM public.journal_entry_executions
   WHERE idempotency_key = p_row->>'idempotency_key';

  IF FOUND THEN
    IF NOT public.je_execution_immutable_binding_matches(v_existing, p_row) THEN
      RAISE EXCEPTION 'je_execution_binding_conflict: idempotency_key match with mismatched immutable binding'
        USING ERRCODE = 'P0001';
    END IF;
    reused := true;
    reuse_reason := 'idempotency_key';
    execution := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- One approval → one execution record (UNIQUE approval_id).
  -- Exact binding → reuse. Different binding → fail closed (no silent collapse).
  SELECT *
    INTO v_existing
    FROM public.journal_entry_executions
   WHERE approval_id = (p_row->>'approval_id')::uuid
   LIMIT 1;
  IF FOUND THEN
    IF NOT public.je_execution_immutable_binding_matches(v_existing, p_row) THEN
      RAISE EXCEPTION 'je_execution_binding_conflict: approval_id already reserved under a different immutable binding'
        USING ERRCODE = 'P0001';
    END IF;
    reused := true;
    reuse_reason := 'approval_id';
    execution := to_jsonb(v_existing);
    ledger_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.journal_entry_executions (
    id,
    proposal_id,
    approval_id,
    company_id,
    engagement_id,
    firm_client_id,
    source_continuous_close_run_id,
    source_accounting_sync_id,
    accounting_connection_id,
    provider,
    proposal_hash,
    approval_policy_hash,
    execution_policy_hash,
    execution_hash,
    idempotency_key,
    status,
    correlation_marker,
    execution_policy_snapshot,
    preflight_result,
    requested_by,
    requested_at,
    state_version,
    provider_journal_id,
    provider_request_hash,
    provider_response_hash,
    last_error_code,
    last_error_message
  ) VALUES (
    (p_row->>'id')::uuid,
    (p_row->>'proposal_id')::uuid,
    (p_row->>'approval_id')::uuid,
    (p_row->>'company_id')::uuid,
    (p_row->>'engagement_id')::uuid,
    NULLIF(p_row->>'firm_client_id', '')::uuid,
    (p_row->>'source_continuous_close_run_id')::uuid,
    (p_row->>'source_accounting_sync_id')::uuid,
    (p_row->>'accounting_connection_id')::uuid,
    p_row->>'provider',
    p_row->>'proposal_hash',
    p_row->>'approval_policy_hash',
    p_row->>'execution_policy_hash',
    p_row->>'execution_hash',
    p_row->>'idempotency_key',
    COALESCE(NULLIF(p_row->>'status', ''), 'RESERVED'),
    p_row->>'correlation_marker',
    COALESCE(p_row->'execution_policy_snapshot', '{}'::jsonb),
    COALESCE(p_row->'preflight_result', '{}'::jsonb),
    (p_row->>'requested_by')::uuid,
    (p_row->>'requested_at')::timestamptz,
    COALESCE((p_row->>'state_version')::integer, 1),
    NULL,
    NULLIF(p_row->>'provider_request_hash', ''),
    NULL,
    NULLIF(p_row->>'last_error_code', ''),
    NULLIF(p_row->>'last_error_message', '')
  )
  RETURNING * INTO v_inserted;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.execution_requested',
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_execution',
      v_inserted.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  reused := false;
  reuse_reason := NULL;
  execution := to_jsonb(v_inserted);
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    -- Exact same logical race: reuse by idempotency_key when binding matches.
    SELECT *
      INTO v_existing
      FROM public.journal_entry_executions
     WHERE idempotency_key = p_row->>'idempotency_key';
    IF FOUND THEN
      IF NOT public.je_execution_immutable_binding_matches(v_existing, p_row) THEN
        RAISE EXCEPTION 'je_execution_binding_conflict: race idempotency_key match with mismatched binding'
          USING ERRCODE = 'P0001';
      END IF;
      reused := true;
      reuse_reason := 'idempotency_key';
      execution := to_jsonb(v_existing);
      ledger_event_id := NULL;
      RETURN NEXT;
      RETURN;
    END IF;

    -- Same approval, possibly different binding (must not silently collapse).
    SELECT *
      INTO v_existing
      FROM public.journal_entry_executions
     WHERE approval_id = (p_row->>'approval_id')::uuid
     LIMIT 1;
    IF FOUND THEN
      IF NOT public.je_execution_immutable_binding_matches(v_existing, p_row) THEN
        RAISE EXCEPTION 'je_execution_binding_conflict: race approval_id already reserved under a different immutable binding'
          USING ERRCODE = 'P0001';
      END IF;
      reused := true;
      reuse_reason := 'approval_id';
      execution := to_jsonb(v_existing);
      ledger_event_id := NULL;
      RETURN NEXT;
      RETURN;
    END IF;

    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_journal_entry_execution_reservation(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_journal_entry_execution_reservation(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.persist_journal_entry_execution_reservation(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_journal_entry_execution_reservation(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

-- Guarded state transition + Patent #6 receipt (optimistic concurrency).
-- JE-3A DB mutation authority is intentionally narrower than the domain
-- status vocabulary: only RESERVED → READY_TO_POST | PRECHECK_FAILED,
-- each paired with its exact Patent #6 event type. Future provider lifecycle
-- transitions (POSTING / UNKNOWN_COMMIT / VERIFIED / ...) are authorized in JE-3B.
CREATE OR REPLACE FUNCTION public.transition_journal_entry_execution(
  p_execution_id uuid,
  p_expected_status text,
  p_expected_state_version integer,
  p_new_status text,
  p_patch jsonb,
  p_event_type text,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
  v_pair_ok boolean := false;
BEGIN
  -- Exact JE-3A transition ↔ Patent #6 event coupling (one semantic operation).
  IF p_expected_status = 'RESERVED'
     AND p_new_status = 'READY_TO_POST'
     AND p_event_type = 'journal_entry.execution_ready' THEN
    v_pair_ok := true;
  ELSIF p_expected_status = 'RESERVED'
     AND p_new_status = 'PRECHECK_FAILED'
     AND p_event_type = 'journal_entry.execution_precheck_failed' THEN
    v_pair_ok := true;
  END IF;

  IF NOT v_pair_ok THEN
    RAISE EXCEPTION
      'invalid journal entry execution transition/event pairing: % -> % with %',
      p_expected_status, p_new_status, p_event_type;
  END IF;

  -- Patent #6 payload status must agree with the persisted new status.
  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM p_new_status THEN
    RAISE EXCEPTION
      'journal entry execution event payload status mismatch: payload=% expected=%',
      COALESCE(p_event_payload->>'status', '<null>'), p_new_status;
  END IF;

  SELECT *
    INTO v_row
    FROM public.journal_entry_executions
   WHERE id = p_execution_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found: %', p_execution_id;
  END IF;

  IF v_row.status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'journal_entry_execution status concurrency conflict: expected %, found %',
      p_expected_status, v_row.status;
  END IF;

  IF v_row.state_version IS DISTINCT FROM p_expected_state_version THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict: expected %, found %',
      p_expected_state_version, v_row.state_version;
  END IF;

  PERFORM set_config('advisacor.je_execution_transition', '1', true);

  UPDATE public.journal_entry_executions
     SET status = p_new_status,
         state_version = v_row.state_version + 1,
         preflight_result = COALESCE(p_patch->'preflight_result', preflight_result),
         provider_request_hash = COALESCE(
           NULLIF(p_patch->>'provider_request_hash', ''),
           provider_request_hash
         ),
         last_error_code = CASE
           WHEN p_patch ? 'last_error_code' THEN NULLIF(p_patch->>'last_error_code', '')
           ELSE last_error_code
         END,
         last_error_message = CASE
           WHEN p_patch ? 'last_error_message' THEN NULLIF(p_patch->>'last_error_message', '')
           ELSE last_error_message
         END,
         updated_at = now()
   WHERE id = p_execution_id
  RETURNING * INTO v_row;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      p_event_type,
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_execution',
      v_row.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  execution := to_jsonb(v_row);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_journal_entry_execution(
  uuid, text, integer, text, jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_journal_entry_execution(
  uuid, text, integer, text, jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.transition_journal_entry_execution(
  uuid, text, integer, text, jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.transition_journal_entry_execution(
  uuid, text, integer, text, jsonb, text, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;
-- <<< end 20260821183525_journal_entry_executions.sql

-- >>> begin 20260821212020_journal_entry_provider_attempts.sql
-- JE-3B1 — Governed QBO provider-attempt + unknown-commit recovery foundation.
-- Domain authority remains journal_entry_executions.
-- Provider attempts are network-level CREATE attempt custody.
-- Widens DB mutation for POSTING / UNKNOWN_COMMIT / POSTED_UNVERIFIED / FAILED.
-- Does NOT enable governed QBO JournalEntry POST.
-- Does NOT write je_post_attempts or Memory.
-- D2 je_post_attempts remains legacy spine only — not reused here.

CREATE TABLE IF NOT EXISTS public.journal_entry_provider_attempts (
  id uuid PRIMARY KEY,
  execution_id uuid NOT NULL
    REFERENCES public.journal_entry_executions(id)
    ON DELETE RESTRICT,
  accounting_connection_id uuid NOT NULL
    REFERENCES public.accounting_connections(id)
    ON DELETE RESTRICT,
  provider text NOT NULL,
  provider_request_hash text NOT NULL,
  correlation_marker text NOT NULL,
  status text NOT NULL,
  commit_certainty text NOT NULL,
  request_started_at timestamptz NULL,
  request_completed_at timestamptz NULL,
  qbo_je_id text NULL,
  intuit_tid text NULL,
  provider_response_hash text NULL,
  provider_error_code text NULL,
  provider_error_message text NULL,
  discovery_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_entry_provider_attempts_execution_unique
    UNIQUE (execution_id),
  CONSTRAINT journal_entry_provider_attempts_provider_check
    CHECK (provider = 'quickbooks'),
  CONSTRAINT journal_entry_provider_attempts_request_hash_check
    CHECK (provider_request_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT journal_entry_provider_attempts_correlation_marker_check
    CHECK (char_length(btrim(correlation_marker)) > 0),
  CONSTRAINT journal_entry_provider_attempts_status_check
    CHECK (status IN (
      'RESERVED',
      'REQUEST_STARTED',
      'RESPONSE_RECEIVED',
      'UNKNOWN_RESULT',
      'FAILED_PRECOMMIT',
      'DISCOVERED_COMMITTED',
      'DISCOVERED_NOT_FOUND',
      'VERIFIED_PROVIDER_ID'
    )),
  CONSTRAINT journal_entry_provider_attempts_commit_certainty_check
    CHECK (commit_certainty IN (
      'NOT_SENT',
      'DEFINITELY_NOT_COMMITTED',
      'POSSIBLY_COMMITTED',
      'COMMITTED'
    ))
);

CREATE INDEX IF NOT EXISTS journal_entry_provider_attempts_connection_idx
  ON public.journal_entry_provider_attempts (accounting_connection_id);

CREATE INDEX IF NOT EXISTS journal_entry_provider_attempts_qbo_je_idx
  ON public.journal_entry_provider_attempts (qbo_je_id)
  WHERE qbo_je_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS journal_entry_provider_attempts_marker_idx
  ON public.journal_entry_provider_attempts (correlation_marker);

COMMENT ON TABLE public.journal_entry_provider_attempts IS
  'JE-3B1 governed provider CREATE-attempt custody. One execution → one create attempt. Not domain authority (that is journal_entry_executions). Does not replace je_post_attempts. No Memory. No governed POST in JE-3B1.';

CREATE OR REPLACE FUNCTION public.journal_entry_provider_attempts_guard_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('advisacor.je_provider_attempt_mutation', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION
      'journal_entry_provider_attempts mutations must use governed provider-attempt RPCs';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'journal_entry_provider_attempts rows cannot be deleted';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS journal_entry_provider_attempts_guard_update
  ON public.journal_entry_provider_attempts;
CREATE TRIGGER journal_entry_provider_attempts_guard_update
  BEFORE UPDATE ON public.journal_entry_provider_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_provider_attempts_guard_mutation();

DROP TRIGGER IF EXISTS journal_entry_provider_attempts_guard_delete
  ON public.journal_entry_provider_attempts;
CREATE TRIGGER journal_entry_provider_attempts_guard_delete
  BEFORE DELETE ON public.journal_entry_provider_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entry_provider_attempts_guard_mutation();

ALTER TABLE public.journal_entry_provider_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journal_entry_provider_attempts_service_role_all
  ON public.journal_entry_provider_attempts;
CREATE POLICY journal_entry_provider_attempts_service_role_all
  ON public.journal_entry_provider_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS journal_entry_provider_attempts_select
  ON public.journal_entry_provider_attempts;
CREATE POLICY journal_entry_provider_attempts_select
  ON public.journal_entry_provider_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.journal_entry_executions e
      JOIN public.audit_ready_engagements eng
        ON eng.id = e.engagement_id
      WHERE e.id = journal_entry_provider_attempts.execution_id
        AND (
          (
            eng.company_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.company_users cu
              WHERE cu.company_id = eng.company_id
                AND cu.user_id = (SELECT auth.uid())
                AND cu.status = 'active'
            )
          )
          OR
          (
            eng.firm_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.firm_memberships fm
              WHERE fm.firm_id = eng.firm_id
                AND fm.user_id = (SELECT auth.uid())
                AND fm.status = 'active'
            )
          )
        )
    )
  );

GRANT SELECT ON public.journal_entry_provider_attempts TO authenticated;
GRANT ALL ON public.journal_entry_provider_attempts TO service_role;

-- Atomic provider-attempt reservation (no network). One execution → one attempt.
CREATE OR REPLACE FUNCTION public.persist_journal_entry_provider_attempt(
  p_row jsonb,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text,
  p_publish_posting_started boolean DEFAULT false
)
RETURNS TABLE(
  reused boolean,
  attempt jsonb,
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.journal_entry_provider_attempts%ROWTYPE;
  v_inserted public.journal_entry_provider_attempts%ROWTYPE;
  v_execution public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
BEGIN
  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = (p_row->>'execution_id')::uuid
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found: %', p_row->>'execution_id';
  END IF;

  IF v_execution.accounting_connection_id::text IS DISTINCT FROM p_row->>'accounting_connection_id' THEN
    RAISE EXCEPTION 'je_provider_attempt_connection_mismatch';
  END IF;
  IF v_execution.provider_request_hash IS DISTINCT FROM p_row->>'provider_request_hash' THEN
    RAISE EXCEPTION 'je_provider_attempt_request_hash_mismatch';
  END IF;
  IF v_execution.correlation_marker IS DISTINCT FROM p_row->>'correlation_marker' THEN
    RAISE EXCEPTION 'je_provider_attempt_correlation_mismatch';
  END IF;
  IF v_execution.provider IS DISTINCT FROM p_row->>'provider' THEN
    RAISE EXCEPTION 'je_provider_attempt_provider_mismatch';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.journal_entry_provider_attempts
   WHERE execution_id = v_execution.id;

  IF FOUND THEN
    IF v_existing.provider_request_hash IS DISTINCT FROM p_row->>'provider_request_hash'
       OR v_existing.accounting_connection_id::text IS DISTINCT FROM p_row->>'accounting_connection_id'
       OR v_existing.correlation_marker IS DISTINCT FROM p_row->>'correlation_marker' THEN
      RAISE EXCEPTION 'je_provider_attempt_binding_conflict';
    END IF;
    reused := true;
    attempt := to_jsonb(v_existing);
    execution := to_jsonb(v_execution);
    ledger_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_execution.status IS DISTINCT FROM 'READY_TO_POST'
     AND v_execution.status IS DISTINCT FROM 'POSTING' THEN
    RAISE EXCEPTION 'je_provider_attempt_execution_status_invalid: %', v_execution.status;
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);
  IF p_publish_posting_started AND v_execution.status = 'READY_TO_POST' THEN
    PERFORM set_config('advisacor.je_execution_transition', '1', true);
  END IF;

  INSERT INTO public.journal_entry_provider_attempts (
    id,
    execution_id,
    accounting_connection_id,
    provider,
    provider_request_hash,
    correlation_marker,
    status,
    commit_certainty,
    request_started_at,
    request_completed_at,
    qbo_je_id,
    intuit_tid,
    provider_response_hash,
    provider_error_code,
    provider_error_message,
    discovery_summary
  ) VALUES (
    (p_row->>'id')::uuid,
    v_execution.id,
    (p_row->>'accounting_connection_id')::uuid,
    p_row->>'provider',
    p_row->>'provider_request_hash',
    p_row->>'correlation_marker',
    COALESCE(NULLIF(p_row->>'status', ''), 'RESERVED'),
    COALESCE(NULLIF(p_row->>'commit_certainty', ''), 'NOT_SENT'),
    NULLIF(p_row->>'request_started_at', '')::timestamptz,
    NULLIF(p_row->>'request_completed_at', '')::timestamptz,
    NULLIF(p_row->>'qbo_je_id', ''),
    NULLIF(p_row->>'intuit_tid', ''),
    NULLIF(p_row->>'provider_response_hash', ''),
    NULLIF(p_row->>'provider_error_code', ''),
    NULLIF(p_row->>'provider_error_message', ''),
    COALESCE(p_row->'discovery_summary', '{}'::jsonb)
  )
  RETURNING * INTO v_inserted;

  IF p_publish_posting_started AND v_execution.status = 'READY_TO_POST' THEN
    IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'POSTING' THEN
      RAISE EXCEPTION 'journal entry execution event payload status mismatch: payload=% expected=POSTING',
        COALESCE(p_event_payload->>'status', '<null>');
    END IF;

    UPDATE public.journal_entry_executions
       SET status = 'POSTING',
           state_version = v_execution.state_version + 1,
           updated_at = now()
     WHERE id = v_execution.id
       AND status = 'READY_TO_POST'
       AND state_version = v_execution.state_version
    RETURNING * INTO v_execution;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during posting_started';
    END IF;

    SELECT pe.event_id
      INTO v_event_id
      FROM public.publish_ledger_event(
        'journal_entry.posting_started',
        'posting',
        1,
        p_firm_id,
        p_firm_client_id,
        p_engagement_id,
        NULL,
        p_close_period_id,
        'journal_entry_execution',
        v_execution.id::text,
        'user',
        p_actor_id,
        p_event_payload,
        '{}'::jsonb,
        NULL,
        p_event_payload_canonical
      ) AS pe;
  END IF;

  reused := false;
  attempt := to_jsonb(v_inserted);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO v_existing
      FROM public.journal_entry_provider_attempts
     WHERE execution_id = (p_row->>'execution_id')::uuid;
    IF NOT FOUND THEN
      RAISE;
    END IF;
    IF v_existing.provider_request_hash IS DISTINCT FROM p_row->>'provider_request_hash'
       OR v_existing.accounting_connection_id::text IS DISTINCT FROM p_row->>'accounting_connection_id'
       OR v_existing.correlation_marker IS DISTINCT FROM p_row->>'correlation_marker' THEN
      RAISE EXCEPTION 'je_provider_attempt_binding_conflict';
    END IF;
    SELECT * INTO v_execution FROM public.journal_entry_executions WHERE id = v_existing.execution_id;
    reused := true;
    attempt := to_jsonb(v_existing);
    execution := to_jsonb(v_execution);
    ledger_event_id := NULL;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_journal_entry_provider_attempt(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text, boolean
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_journal_entry_provider_attempt(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text, boolean
) FROM anon;
REVOKE ALL ON FUNCTION public.persist_journal_entry_provider_attempt(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text, boolean
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_journal_entry_provider_attempt(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text, boolean
) TO service_role;

-- Atomic provider-attempt local patch (no network).
CREATE OR REPLACE FUNCTION public.patch_journal_entry_provider_attempt(
  p_attempt_id uuid,
  p_expected_status text,
  p_patch jsonb
)
RETURNS TABLE(attempt jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.journal_entry_provider_attempts%ROWTYPE;
BEGIN
  SELECT *
    INTO v_row
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_row.status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt status concurrency conflict: expected %, found %',
      p_expected_status, v_row.status;
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = COALESCE(NULLIF(p_patch->>'status', ''), status),
         commit_certainty = COALESCE(NULLIF(p_patch->>'commit_certainty', ''), commit_certainty),
         request_started_at = CASE
           WHEN p_patch ? 'request_started_at' THEN NULLIF(p_patch->>'request_started_at', '')::timestamptz
           ELSE request_started_at
         END,
         request_completed_at = CASE
           WHEN p_patch ? 'request_completed_at' THEN NULLIF(p_patch->>'request_completed_at', '')::timestamptz
           ELSE request_completed_at
         END,
         qbo_je_id = CASE
           WHEN p_patch ? 'qbo_je_id' THEN NULLIF(p_patch->>'qbo_je_id', '')
           ELSE qbo_je_id
         END,
         intuit_tid = CASE
           WHEN p_patch ? 'intuit_tid' THEN NULLIF(p_patch->>'intuit_tid', '')
           ELSE intuit_tid
         END,
         provider_response_hash = CASE
           WHEN p_patch ? 'provider_response_hash' THEN NULLIF(p_patch->>'provider_response_hash', '')
           ELSE provider_response_hash
         END,
         provider_error_code = CASE
           WHEN p_patch ? 'provider_error_code' THEN NULLIF(p_patch->>'provider_error_code', '')
           ELSE provider_error_code
         END,
         provider_error_message = CASE
           WHEN p_patch ? 'provider_error_message' THEN NULLIF(p_patch->>'provider_error_message', '')
           ELSE provider_error_message
         END,
         discovery_summary = COALESCE(p_patch->'discovery_summary', discovery_summary),
         updated_at = now()
   WHERE id = p_attempt_id
  RETURNING * INTO v_row;

  attempt := to_jsonb(v_row);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.patch_journal_entry_provider_attempt(
  uuid, text, jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.patch_journal_entry_provider_attempt(
  uuid, text, jsonb
) FROM anon;
REVOKE ALL ON FUNCTION public.patch_journal_entry_provider_attempt(
  uuid, text, jsonb
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.patch_journal_entry_provider_attempt(
  uuid, text, jsonb
) TO service_role;

-- Replace JE-3A transition RPC with JE-3B1 coupled matrix.
-- JE-3A pairs preserved. Provider lifecycle pairs added.
-- POSTED_UNVERIFIED → VERIFIED still NOT authorized.
-- UNKNOWN_COMMIT → POSTING still NOT authorized.
CREATE OR REPLACE FUNCTION public.transition_journal_entry_execution(
  p_execution_id uuid,
  p_expected_status text,
  p_expected_state_version integer,
  p_new_status text,
  p_patch jsonb,
  p_event_type text,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
  v_pair_ok boolean := false;
BEGIN
  -- JE-3A pairs
  IF p_expected_status = 'RESERVED'
     AND p_new_status = 'READY_TO_POST'
     AND p_event_type = 'journal_entry.execution_ready' THEN
    v_pair_ok := true;
  ELSIF p_expected_status = 'RESERVED'
     AND p_new_status = 'PRECHECK_FAILED'
     AND p_event_type = 'journal_entry.execution_precheck_failed' THEN
    v_pair_ok := true;
  -- JE-3B1 provider lifecycle pairs
  ELSIF p_expected_status = 'READY_TO_POST'
     AND p_new_status = 'POSTING'
     AND p_event_type = 'journal_entry.posting_started' THEN
    v_pair_ok := true;
  ELSIF p_expected_status = 'POSTING'
     AND p_new_status = 'POSTED_UNVERIFIED'
     AND p_event_type = 'journal_entry.provider_posted' THEN
    v_pair_ok := true;
  ELSIF p_expected_status = 'POSTING'
     AND p_new_status = 'UNKNOWN_COMMIT'
     AND p_event_type = 'journal_entry.post_unknown' THEN
    v_pair_ok := true;
  ELSIF p_expected_status = 'POSTING'
     AND p_new_status = 'FAILED'
     AND p_event_type = 'journal_entry.execution_failed' THEN
    v_pair_ok := true;
  END IF;
  -- UNKNOWN_COMMIT → POSTING intentionally absent (no blind retry).
  -- POSTED_UNVERIFIED → VERIFIED intentionally absent until JE-3C.

  IF NOT v_pair_ok THEN
    RAISE EXCEPTION
      'invalid journal entry execution transition/event pairing: % -> % with %',
      p_expected_status, p_new_status, p_event_type;
  END IF;

  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM p_new_status THEN
    RAISE EXCEPTION
      'journal entry execution event payload status mismatch: payload=% expected=%',
      COALESCE(p_event_payload->>'status', '<null>'), p_new_status;
  END IF;

  SELECT *
    INTO v_row
    FROM public.journal_entry_executions
   WHERE id = p_execution_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found: %', p_execution_id;
  END IF;

  IF v_row.status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'journal_entry_execution status concurrency conflict: expected %, found %',
      p_expected_status, v_row.status;
  END IF;

  IF v_row.state_version IS DISTINCT FROM p_expected_state_version THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict: expected %, found %',
      p_expected_state_version, v_row.state_version;
  END IF;

  PERFORM set_config('advisacor.je_execution_transition', '1', true);

  UPDATE public.journal_entry_executions
     SET status = p_new_status,
         state_version = v_row.state_version + 1,
         preflight_result = COALESCE(p_patch->'preflight_result', preflight_result),
         provider_request_hash = COALESCE(
           NULLIF(p_patch->>'provider_request_hash', ''),
           provider_request_hash
         ),
         provider_journal_id = CASE
           WHEN p_patch ? 'provider_journal_id' THEN NULLIF(p_patch->>'provider_journal_id', '')
           ELSE provider_journal_id
         END,
         provider_response_hash = CASE
           WHEN p_patch ? 'provider_response_hash' THEN NULLIF(p_patch->>'provider_response_hash', '')
           ELSE provider_response_hash
         END,
         last_error_code = CASE
           WHEN p_patch ? 'last_error_code' THEN NULLIF(p_patch->>'last_error_code', '')
           ELSE last_error_code
         END,
         last_error_message = CASE
           WHEN p_patch ? 'last_error_message' THEN NULLIF(p_patch->>'last_error_message', '')
           ELSE last_error_message
         END,
         updated_at = now()
   WHERE id = p_execution_id
  RETURNING * INTO v_row;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      p_event_type,
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_execution',
      v_row.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  execution := to_jsonb(v_row);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;
-- <<< end 20260821212020_journal_entry_provider_attempts.sql

-- >>> begin 20260821220646_journal_entry_provider_discovery_receipts.sql
-- JE-3B1 — Recovery custody + Patent #6 receipts for discovery conclusions.
-- Narrows generic patch so it cannot establish COMMITTED / DISCOVERED_* / qbo_je_id.
-- Adds dedicated atomic RPCs that couple custody mutation to ledger events.
-- Does NOT enable governed QBO POST. Does NOT enable VERIFIED.

-- A. Narrow generic observation-only patch.
CREATE OR REPLACE FUNCTION public.patch_journal_entry_provider_attempt(
  p_attempt_id uuid,
  p_expected_status text,
  p_patch jsonb
)
RETURNS TABLE(attempt jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.journal_entry_provider_attempts%ROWTYPE;
  v_new_status text;
  v_new_certainty text;
BEGIN
  SELECT *
    INTO v_row
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_row.status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt status concurrency conflict: expected %, found %',
      p_expected_status, v_row.status;
  END IF;

  -- Accounting conclusions require dedicated receipted RPCs.
  IF p_patch ? 'qbo_je_id'
     AND NULLIF(p_patch->>'qbo_je_id', '') IS NOT NULL THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: qbo_je_id requires provider_commit_discovered RPC';
  END IF;

  v_new_certainty := NULLIF(p_patch->>'commit_certainty', '');
  IF v_new_certainty = 'COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: COMMITTED requires provider_commit_discovered RPC';
  END IF;

  v_new_status := NULLIF(p_patch->>'status', '');
  IF v_new_status IN ('DISCOVERED_COMMITTED', 'DISCOVERED_NOT_FOUND', 'VERIFIED_PROVIDER_ID') THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: status % requires receipted discovery RPC',
      v_new_status;
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = COALESCE(v_new_status, status),
         commit_certainty = COALESCE(v_new_certainty, commit_certainty),
         request_started_at = CASE
           WHEN p_patch ? 'request_started_at' THEN NULLIF(p_patch->>'request_started_at', '')::timestamptz
           ELSE request_started_at
         END,
         request_completed_at = CASE
           WHEN p_patch ? 'request_completed_at' THEN NULLIF(p_patch->>'request_completed_at', '')::timestamptz
           ELSE request_completed_at
         END,
         -- qbo_je_id deliberately not updatable here
         intuit_tid = CASE
           WHEN p_patch ? 'intuit_tid' THEN NULLIF(p_patch->>'intuit_tid', '')
           ELSE intuit_tid
         END,
         provider_response_hash = CASE
           WHEN p_patch ? 'provider_response_hash' THEN NULLIF(p_patch->>'provider_response_hash', '')
           ELSE provider_response_hash
         END,
         provider_error_code = CASE
           WHEN p_patch ? 'provider_error_code' THEN NULLIF(p_patch->>'provider_error_code', '')
           ELSE provider_error_code
         END,
         provider_error_message = CASE
           WHEN p_patch ? 'provider_error_message' THEN NULLIF(p_patch->>'provider_error_message', '')
           ELSE provider_error_message
         END,
         discovery_summary = COALESCE(p_patch->'discovery_summary', discovery_summary),
         updated_at = now()
   WHERE id = p_attempt_id
  RETURNING * INTO v_row;

  attempt := to_jsonb(v_row);
  RETURN NEXT;
END;
$$;

-- B. Atomic EXACT_ONE commit discovery + Patent #6 receipt.
CREATE OR REPLACE FUNCTION public.apply_journal_entry_provider_commit_discovered(
  p_attempt_id uuid,
  p_expected_status text,
  p_qbo_je_id text,
  p_provider_response_hash text,
  p_discovery_summary jsonb,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  attempt jsonb,
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.journal_entry_provider_attempts%ROWTYPE;
  v_execution public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
  v_qbo_je_id text;
BEGIN
  v_qbo_je_id := NULLIF(btrim(COALESCE(p_qbo_je_id, '')), '');
  IF v_qbo_je_id IS NULL THEN
    RAISE EXCEPTION 'je_provider_commit_discovered_qbo_je_id_required';
  END IF;

  IF COALESCE(p_event_payload->>'commit_certainty', '') IS DISTINCT FROM 'COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_commit_discovered payload commit_certainty must be COMMITTED';
  END IF;
  IF COALESCE(p_event_payload->>'qbo_je_id', '') IS DISTINCT FROM v_qbo_je_id THEN
    RAISE EXCEPTION 'je_provider_commit_discovered payload qbo_je_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'discovery_result', '') IS DISTINCT FROM 'EXACT_ONE' THEN
    RAISE EXCEPTION 'je_provider_commit_discovered payload discovery_result must be EXACT_ONE';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_attempt.status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt status concurrency conflict: expected %, found %',
      p_expected_status, v_attempt.status;
  END IF;
  IF v_attempt.qbo_je_id IS NOT NULL
     AND v_attempt.qbo_je_id IS DISTINCT FROM v_qbo_je_id THEN
    RAISE EXCEPTION 'je_provider_commit_discovered_qbo_je_id_conflict';
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = v_attempt.execution_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found for attempt %', p_attempt_id;
  END IF;

  IF COALESCE(p_event_payload->>'execution_id', '') IS DISTINCT FROM v_execution.id::text THEN
    RAISE EXCEPTION 'je_provider_commit_discovered payload execution_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_attempt_id', '') IS DISTINCT FROM v_attempt.id::text THEN
    RAISE EXCEPTION 'je_provider_commit_discovered payload provider_attempt_id mismatch';
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = 'DISCOVERED_COMMITTED',
         commit_certainty = 'COMMITTED',
         qbo_je_id = v_qbo_je_id,
         provider_response_hash = COALESCE(
           NULLIF(p_provider_response_hash, ''),
           provider_response_hash
         ),
         discovery_summary = COALESCE(p_discovery_summary, discovery_summary),
         updated_at = now()
   WHERE id = p_attempt_id
  RETURNING * INTO v_attempt;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.provider_commit_discovered',
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_execution',
      v_execution.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  attempt := to_jsonb(v_attempt);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_commit_discovered(
  uuid, text, text, text, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_commit_discovered(
  uuid, text, text, text, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_commit_discovered(
  uuid, text, text, text, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_provider_commit_discovered(
  uuid, text, text, text, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

-- C. Atomic confirmed-not-found + Patent #6 receipt.
-- Only when custody already proves NOT_SENT or DEFINITELY_NOT_COMMITTED.
CREATE OR REPLACE FUNCTION public.apply_journal_entry_provider_not_found_confirmed(
  p_attempt_id uuid,
  p_expected_status text,
  p_discovery_summary jsonb,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  attempt jsonb,
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.journal_entry_provider_attempts%ROWTYPE;
  v_execution public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
BEGIN
  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'DISCOVERED_NOT_FOUND' THEN
    RAISE EXCEPTION 'je_provider_not_found_confirmed payload status must be DISCOVERED_NOT_FOUND';
  END IF;
  IF COALESCE(p_event_payload->>'discovery_result', '') IS DISTINCT FROM 'NONE' THEN
    RAISE EXCEPTION 'je_provider_not_found_confirmed payload discovery_result must be NONE';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_attempt.status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt status concurrency conflict: expected %, found %',
      p_expected_status, v_attempt.status;
  END IF;
  IF v_attempt.commit_certainty NOT IN ('NOT_SENT', 'DEFINITELY_NOT_COMMITTED') THEN
    RAISE EXCEPTION
      'je_provider_not_found_confirmed requires NOT_SENT or DEFINITELY_NOT_COMMITTED; found %',
      v_attempt.commit_certainty;
  END IF;
  IF v_attempt.qbo_je_id IS NOT NULL THEN
    RAISE EXCEPTION 'je_provider_not_found_confirmed cannot apply when qbo_je_id already bound';
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = v_attempt.execution_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found for attempt %', p_attempt_id;
  END IF;

  IF COALESCE(p_event_payload->>'execution_id', '') IS DISTINCT FROM v_execution.id::text THEN
    RAISE EXCEPTION 'je_provider_not_found_confirmed payload execution_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_attempt_id', '') IS DISTINCT FROM v_attempt.id::text THEN
    RAISE EXCEPTION 'je_provider_not_found_confirmed payload provider_attempt_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'commit_certainty', '') IS DISTINCT FROM v_attempt.commit_certainty THEN
    RAISE EXCEPTION 'je_provider_not_found_confirmed payload commit_certainty mismatch';
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = 'DISCOVERED_NOT_FOUND',
         discovery_summary = COALESCE(p_discovery_summary, discovery_summary),
         updated_at = now()
   WHERE id = p_attempt_id
  RETURNING * INTO v_attempt;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.provider_not_found_confirmed',
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_execution',
      v_execution.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  attempt := to_jsonb(v_attempt);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_not_found_confirmed(
  uuid, text, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_not_found_confirmed(
  uuid, text, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_not_found_confirmed(
  uuid, text, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_provider_not_found_confirmed(
  uuid, text, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

COMMENT ON FUNCTION public.apply_journal_entry_provider_commit_discovered IS
  'JE-3B1: atomic DISCOVERED_COMMITTED + COMMITTED + qbo_je_id + journal_entry.provider_commit_discovered. Ledger failure rolls back custody.';

COMMENT ON FUNCTION public.apply_journal_entry_provider_not_found_confirmed IS
  'JE-3B1: atomic DISCOVERED_NOT_FOUND + journal_entry.provider_not_found_confirmed for successful NONE when NOT_SENT/DEFINITELY_NOT_COMMITTED.';
-- <<< end 20260821220646_journal_entry_provider_discovery_receipts.sql

-- >>> begin 20260821221658_journal_entry_provider_attempt_certainty_immutable.sql
-- JE-3B1 — commit_certainty is immutable via generic observation patch.
-- Only dedicated governed RPCs may change certainty (e.g. commit discovered → COMMITTED).
-- Does NOT mint DEFINITELY_NOT_COMMITTED. Does NOT enable governed POST / VERIFIED.

CREATE OR REPLACE FUNCTION public.patch_journal_entry_provider_attempt(
  p_attempt_id uuid,
  p_expected_status text,
  p_patch jsonb
)
RETURNS TABLE(attempt jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.journal_entry_provider_attempts%ROWTYPE;
  v_new_status text;
BEGIN
  SELECT *
    INTO v_row
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_row.status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt status concurrency conflict: expected %, found %',
      p_expected_status, v_row.status;
  END IF;

  -- Accounting conclusions require dedicated receipted RPCs.
  IF p_patch ? 'qbo_je_id'
     AND NULLIF(p_patch->>'qbo_je_id', '') IS NOT NULL THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: qbo_je_id requires provider_commit_discovered RPC';
  END IF;

  -- commit_certainty is governed custody — generic patch never owns the field.
  IF p_patch ? 'commit_certainty' THEN
    RAISE EXCEPTION
      'je_provider_attempt_patch_forbidden: commit_certainty is immutable via generic patch';
  END IF;

  v_new_status := NULLIF(p_patch->>'status', '');
  IF v_new_status IN ('DISCOVERED_COMMITTED', 'DISCOVERED_NOT_FOUND', 'VERIFIED_PROVIDER_ID') THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: status % requires receipted discovery RPC',
      v_new_status;
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = COALESCE(v_new_status, status),
         -- commit_certainty deliberately immutable here
         request_started_at = CASE
           WHEN p_patch ? 'request_started_at' THEN NULLIF(p_patch->>'request_started_at', '')::timestamptz
           ELSE request_started_at
         END,
         request_completed_at = CASE
           WHEN p_patch ? 'request_completed_at' THEN NULLIF(p_patch->>'request_completed_at', '')::timestamptz
           ELSE request_completed_at
         END,
         -- qbo_je_id deliberately not updatable here
         intuit_tid = CASE
           WHEN p_patch ? 'intuit_tid' THEN NULLIF(p_patch->>'intuit_tid', '')
           ELSE intuit_tid
         END,
         provider_response_hash = CASE
           WHEN p_patch ? 'provider_response_hash' THEN NULLIF(p_patch->>'provider_response_hash', '')
           ELSE provider_response_hash
         END,
         provider_error_code = CASE
           WHEN p_patch ? 'provider_error_code' THEN NULLIF(p_patch->>'provider_error_code', '')
           ELSE provider_error_code
         END,
         provider_error_message = CASE
           WHEN p_patch ? 'provider_error_message' THEN NULLIF(p_patch->>'provider_error_message', '')
           ELSE provider_error_message
         END,
         discovery_summary = COALESCE(p_patch->'discovery_summary', discovery_summary),
         updated_at = now()
   WHERE id = p_attempt_id
  RETURNING * INTO v_row;

  attempt := to_jsonb(v_row);
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.patch_journal_entry_provider_attempt(uuid, text, jsonb) IS
  'JE-3B1 observation-only provider-attempt patch. commit_certainty and qbo_je_id are immutable here; use receipted discovery RPCs for accounting conclusions.';
-- <<< end 20260821221658_journal_entry_provider_attempt_certainty_immutable.sql

-- >>> begin 20260821222342_journal_entry_provider_attempt_initial_custody.sql
-- JE-3B1 — Provider-attempt creation owns initial custody.
-- New rows ALWAYS insert as RESERVED + NOT_SENT.
-- Caller cannot mint POSSIBLY_COMMITTED / DEFINITELY_NOT_COMMITTED / COMMITTED at create.
-- Exact reuse preserves existing custody unchanged.
-- Does NOT enable governed POST / VERIFIED.

CREATE OR REPLACE FUNCTION public.persist_journal_entry_provider_attempt(
  p_row jsonb,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text,
  p_publish_posting_started boolean DEFAULT false
)
RETURNS TABLE(
  reused boolean,
  attempt jsonb,
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.journal_entry_provider_attempts%ROWTYPE;
  v_inserted public.journal_entry_provider_attempts%ROWTYPE;
  v_execution public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
BEGIN
  -- Creation RPC owns initial custody. If caller supplies values, they must match.
  IF p_row ? 'status'
     AND NULLIF(p_row->>'status', '') IS NOT NULL
     AND p_row->>'status' IS DISTINCT FROM 'RESERVED' THEN
    RAISE EXCEPTION 'je_provider_attempt_initial_status_forbidden: %', p_row->>'status';
  END IF;
  IF p_row ? 'commit_certainty'
     AND NULLIF(p_row->>'commit_certainty', '') IS NOT NULL
     AND p_row->>'commit_certainty' IS DISTINCT FROM 'NOT_SENT' THEN
    RAISE EXCEPTION 'je_provider_attempt_initial_certainty_forbidden: %',
      p_row->>'commit_certainty';
  END IF;
  IF p_row ? 'qbo_je_id' AND NULLIF(p_row->>'qbo_je_id', '') IS NOT NULL THEN
    RAISE EXCEPTION 'je_provider_attempt_initial_qbo_je_id_forbidden';
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = (p_row->>'execution_id')::uuid
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found: %', p_row->>'execution_id';
  END IF;

  IF v_execution.accounting_connection_id::text IS DISTINCT FROM p_row->>'accounting_connection_id' THEN
    RAISE EXCEPTION 'je_provider_attempt_connection_mismatch';
  END IF;
  IF v_execution.provider_request_hash IS DISTINCT FROM p_row->>'provider_request_hash' THEN
    RAISE EXCEPTION 'je_provider_attempt_request_hash_mismatch';
  END IF;
  IF v_execution.correlation_marker IS DISTINCT FROM p_row->>'correlation_marker' THEN
    RAISE EXCEPTION 'je_provider_attempt_correlation_mismatch';
  END IF;
  IF v_execution.provider IS DISTINCT FROM p_row->>'provider' THEN
    RAISE EXCEPTION 'je_provider_attempt_provider_mismatch';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.journal_entry_provider_attempts
   WHERE execution_id = v_execution.id;

  IF FOUND THEN
    IF v_existing.provider_request_hash IS DISTINCT FROM p_row->>'provider_request_hash'
       OR v_existing.accounting_connection_id::text IS DISTINCT FROM p_row->>'accounting_connection_id'
       OR v_existing.correlation_marker IS DISTINCT FROM p_row->>'correlation_marker' THEN
      RAISE EXCEPTION 'je_provider_attempt_binding_conflict';
    END IF;
    -- Exact reuse: preserve existing status/certainty custody unchanged.
    reused := true;
    attempt := to_jsonb(v_existing);
    execution := to_jsonb(v_execution);
    ledger_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_execution.status IS DISTINCT FROM 'READY_TO_POST'
     AND v_execution.status IS DISTINCT FROM 'POSTING' THEN
    RAISE EXCEPTION 'je_provider_attempt_execution_status_invalid: %', v_execution.status;
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);
  IF p_publish_posting_started AND v_execution.status = 'READY_TO_POST' THEN
    PERFORM set_config('advisacor.je_execution_transition', '1', true);
  END IF;

  INSERT INTO public.journal_entry_provider_attempts (
    id,
    execution_id,
    accounting_connection_id,
    provider,
    provider_request_hash,
    correlation_marker,
    status,
    commit_certainty,
    request_started_at,
    request_completed_at,
    qbo_je_id,
    intuit_tid,
    provider_response_hash,
    provider_error_code,
    provider_error_message,
    discovery_summary
  ) VALUES (
    (p_row->>'id')::uuid,
    v_execution.id,
    (p_row->>'accounting_connection_id')::uuid,
    p_row->>'provider',
    p_row->>'provider_request_hash',
    p_row->>'correlation_marker',
    'RESERVED',
    'NOT_SENT',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '{}'::jsonb
  )
  RETURNING * INTO v_inserted;

  IF p_publish_posting_started AND v_execution.status = 'READY_TO_POST' THEN
    IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'POSTING' THEN
      RAISE EXCEPTION 'journal entry execution event payload status mismatch: payload=% expected=POSTING',
        COALESCE(p_event_payload->>'status', '<null>');
    END IF;

    UPDATE public.journal_entry_executions
       SET status = 'POSTING',
           state_version = v_execution.state_version + 1,
           updated_at = now()
     WHERE id = v_execution.id
       AND status = 'READY_TO_POST'
       AND state_version = v_execution.state_version
    RETURNING * INTO v_execution;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during posting_started';
    END IF;

    SELECT pe.event_id
      INTO v_event_id
      FROM public.publish_ledger_event(
        'journal_entry.posting_started',
        'posting',
        1,
        p_firm_id,
        p_firm_client_id,
        p_engagement_id,
        NULL,
        p_close_period_id,
        'journal_entry_execution',
        v_execution.id::text,
        'user',
        p_actor_id,
        p_event_payload,
        '{}'::jsonb,
        NULL,
        p_event_payload_canonical
      ) AS pe;
  END IF;

  reused := false;
  attempt := to_jsonb(v_inserted);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO v_existing
      FROM public.journal_entry_provider_attempts
     WHERE execution_id = (p_row->>'execution_id')::uuid;
    IF NOT FOUND THEN
      RAISE;
    END IF;
    IF v_existing.provider_request_hash IS DISTINCT FROM p_row->>'provider_request_hash'
       OR v_existing.accounting_connection_id::text IS DISTINCT FROM p_row->>'accounting_connection_id'
       OR v_existing.correlation_marker IS DISTINCT FROM p_row->>'correlation_marker' THEN
      RAISE EXCEPTION 'je_provider_attempt_binding_conflict';
    END IF;
    SELECT * INTO v_execution FROM public.journal_entry_executions WHERE id = v_existing.execution_id;
    reused := true;
    attempt := to_jsonb(v_existing);
    execution := to_jsonb(v_execution);
    ledger_event_id := NULL;
    RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.persist_journal_entry_provider_attempt(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text, boolean
) IS
  'JE-3B1: create provider attempt as RESERVED+NOT_SENT only; exact reuse preserves existing custody. Creation RPC owns status/certainty.';
-- <<< end 20260821222342_journal_entry_provider_attempt_initial_custody.sql

-- >>> begin 20260822011500_journal_entry_provider_dispatch_and_outcomes.sql
-- JE-3B2 — Governed QBO create dispatch + atomic outcome receipts.
-- Hard-disabled at application gate; this migration only adds RPCs.
-- Does NOT enable production invocation, Memory, VERIFIED, GOVERNED_AUTO, or worker.
-- Uncertainty is established BEFORE any QBO POST may leave:
--   RESERVED + NOT_SENT → REQUEST_STARTED + POSSIBLY_COMMITTED
--   + journal_entry.provider_dispatch_started
-- Terminal outcomes are dedicated receipted RPCs only.

-- A. Narrow generic patch: block create-lifecycle conclusion statuses.
CREATE OR REPLACE FUNCTION public.patch_journal_entry_provider_attempt(
  p_attempt_id uuid,
  p_expected_status text,
  p_patch jsonb
)
RETURNS TABLE(attempt jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.journal_entry_provider_attempts%ROWTYPE;
  v_new_status text;
BEGIN
  SELECT *
    INTO v_row
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_row.status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt status concurrency conflict: expected %, found %',
      p_expected_status, v_row.status;
  END IF;

  IF p_patch ? 'qbo_je_id'
     AND NULLIF(p_patch->>'qbo_je_id', '') IS NOT NULL THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: qbo_je_id requires dedicated receipted RPC';
  END IF;

  IF p_patch ? 'commit_certainty' THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: commit_certainty is immutable via generic patch';
  END IF;

  v_new_status := NULLIF(p_patch->>'status', '');
  IF v_new_status IN (
    'REQUEST_STARTED',
    'RESPONSE_RECEIVED',
    'UNKNOWN_RESULT',
    'FAILED_PRECOMMIT',
    'DISCOVERED_COMMITTED',
    'DISCOVERED_NOT_FOUND',
    'VERIFIED_PROVIDER_ID'
  ) THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: status % requires dedicated receipted RPC',
      v_new_status;
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = COALESCE(v_new_status, status),
         -- commit_certainty deliberately immutable here
         request_started_at = CASE
           WHEN p_patch ? 'request_started_at' THEN NULLIF(p_patch->>'request_started_at', '')::timestamptz
           ELSE request_started_at
         END,
         request_completed_at = CASE
           WHEN p_patch ? 'request_completed_at' THEN NULLIF(p_patch->>'request_completed_at', '')::timestamptz
           ELSE request_completed_at
         END,
         intuit_tid = CASE
           WHEN p_patch ? 'intuit_tid' THEN NULLIF(p_patch->>'intuit_tid', '')
           ELSE intuit_tid
         END,
         provider_response_hash = CASE
           WHEN p_patch ? 'provider_response_hash' THEN NULLIF(p_patch->>'provider_response_hash', '')
           ELSE provider_response_hash
         END,
         provider_error_code = CASE
           WHEN p_patch ? 'provider_error_code' THEN NULLIF(p_patch->>'provider_error_code', '')
           ELSE provider_error_code
         END,
         provider_error_message = CASE
           WHEN p_patch ? 'provider_error_message' THEN NULLIF(p_patch->>'provider_error_message', '')
           ELSE provider_error_message
         END,
         discovery_summary = COALESCE(p_patch->'discovery_summary', discovery_summary),
         updated_at = now()
   WHERE id = p_attempt_id
  RETURNING * INTO v_row;

  attempt := to_jsonb(v_row);
  RETURN NEXT;
END;
$$;

-- B. Atomic dispatch boundary — BEFORE any QBO POST may begin.
CREATE OR REPLACE FUNCTION public.apply_journal_entry_provider_dispatch_started(
  p_attempt_id uuid,
  p_expected_status text,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  attempt jsonb,
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.journal_entry_provider_attempts%ROWTYPE;
  v_execution public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
BEGIN
  IF COALESCE(p_expected_status, '') IS DISTINCT FROM 'RESERVED' THEN
    RAISE EXCEPTION 'je_provider_dispatch_expected_status_must_be_RESERVED';
  END IF;
  IF COALESCE(p_event_payload->>'commit_certainty', '') IS DISTINCT FROM 'POSSIBLY_COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_dispatch payload commit_certainty must be POSSIBLY_COMMITTED';
  END IF;
  IF COALESCE(p_event_payload->>'attempt_status', '') IS DISTINCT FROM 'REQUEST_STARTED' THEN
    RAISE EXCEPTION 'je_provider_dispatch payload attempt_status must be REQUEST_STARTED';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_attempt.status IS DISTINCT FROM 'RESERVED'
     OR v_attempt.commit_certainty IS DISTINCT FROM 'NOT_SENT' THEN
    RAISE EXCEPTION 'je_provider_dispatch_custody_invalid: status=% certainty=%',
      v_attempt.status, v_attempt.commit_certainty;
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = v_attempt.execution_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found for attempt %', p_attempt_id;
  END IF;
  IF v_execution.status IS DISTINCT FROM 'POSTING' THEN
    RAISE EXCEPTION 'je_provider_dispatch_execution_status_invalid: %', v_execution.status;
  END IF;

  IF COALESCE(p_event_payload->>'execution_id', '') IS DISTINCT FROM v_execution.id::text THEN
    RAISE EXCEPTION 'je_provider_dispatch payload execution_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_attempt_id', '') IS DISTINCT FROM v_attempt.id::text THEN
    RAISE EXCEPTION 'je_provider_dispatch payload provider_attempt_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_request_hash', '') IS DISTINCT FROM v_attempt.provider_request_hash THEN
    RAISE EXCEPTION 'je_provider_dispatch payload provider_request_hash mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'correlation_marker', '') IS DISTINCT FROM v_attempt.correlation_marker THEN
    RAISE EXCEPTION 'je_provider_dispatch payload correlation_marker mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'accounting_connection_id', '') IS DISTINCT FROM v_attempt.accounting_connection_id::text
     OR v_attempt.accounting_connection_id IS DISTINCT FROM v_execution.accounting_connection_id THEN
    RAISE EXCEPTION 'je_provider_dispatch payload accounting_connection_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'proposal_id', '') IS DISTINCT FROM v_execution.proposal_id::text THEN
    RAISE EXCEPTION 'je_provider_dispatch payload proposal_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'approval_id', '') IS DISTINCT FROM v_execution.approval_id::text THEN
    RAISE EXCEPTION 'je_provider_dispatch payload approval_id mismatch';
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = 'REQUEST_STARTED',
         commit_certainty = 'POSSIBLY_COMMITTED',
         request_started_at = now(),
         updated_at = now()
   WHERE id = p_attempt_id
     AND status = 'RESERVED'
     AND commit_certainty = 'NOT_SENT'
  RETURNING * INTO v_attempt;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'je_provider_dispatch_concurrency_conflict';
  END IF;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.provider_dispatch_started',
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_execution',
      v_execution.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  attempt := to_jsonb(v_attempt);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;

-- C. Success: RESPONSE_RECEIVED + COMMITTED + POSTED_UNVERIFIED + provider_posted
CREATE OR REPLACE FUNCTION public.apply_journal_entry_provider_posted(
  p_attempt_id uuid,
  p_expected_status text,
  p_qbo_je_id text,
  p_intuit_tid text,
  p_provider_response_hash text,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  attempt jsonb,
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.journal_entry_provider_attempts%ROWTYPE;
  v_execution public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
  v_qbo_je_id text;
BEGIN
  v_qbo_je_id := NULLIF(btrim(COALESCE(p_qbo_je_id, '')), '');
  IF v_qbo_je_id IS NULL THEN
    RAISE EXCEPTION 'je_provider_posted_qbo_je_id_required';
  END IF;
  IF COALESCE(p_expected_status, '') IS DISTINCT FROM 'REQUEST_STARTED' THEN
    RAISE EXCEPTION 'je_provider_posted_expected_status_must_be_REQUEST_STARTED';
  END IF;
  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'POSTED_UNVERIFIED' THEN
    RAISE EXCEPTION 'je_provider_posted payload status must be POSTED_UNVERIFIED';
  END IF;
  IF COALESCE(p_event_payload->>'commit_certainty', '') IS DISTINCT FROM 'COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_posted payload commit_certainty must be COMMITTED';
  END IF;
  IF COALESCE(p_event_payload->>'qbo_je_id', '') IS DISTINCT FROM v_qbo_je_id THEN
    RAISE EXCEPTION 'je_provider_posted payload qbo_je_id mismatch';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_attempt.status IS DISTINCT FROM 'REQUEST_STARTED'
     OR v_attempt.commit_certainty IS DISTINCT FROM 'POSSIBLY_COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_posted_custody_invalid: status=% certainty=%',
      v_attempt.status, v_attempt.commit_certainty;
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = v_attempt.execution_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found for attempt %', p_attempt_id;
  END IF;
  IF v_execution.status IS DISTINCT FROM 'POSTING' THEN
    RAISE EXCEPTION 'je_provider_posted_execution_status_invalid: %', v_execution.status;
  END IF;

  IF COALESCE(p_event_payload->>'execution_id', '') IS DISTINCT FROM v_execution.id::text THEN
    RAISE EXCEPTION 'je_provider_posted payload execution_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_attempt_id', '') IS DISTINCT FROM v_attempt.id::text THEN
    RAISE EXCEPTION 'je_provider_posted payload provider_attempt_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'accounting_connection_id', '') IS DISTINCT FROM v_attempt.accounting_connection_id::text
     OR v_attempt.accounting_connection_id IS DISTINCT FROM v_execution.accounting_connection_id THEN
    RAISE EXCEPTION 'je_provider_posted payload accounting_connection_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_request_hash', '') IS DISTINCT FROM v_attempt.provider_request_hash THEN
    RAISE EXCEPTION 'je_provider_posted payload provider_request_hash mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'correlation_marker', '') IS DISTINCT FROM v_attempt.correlation_marker THEN
    RAISE EXCEPTION 'je_provider_posted payload correlation_marker mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'proposal_id', '') IS DISTINCT FROM v_execution.proposal_id::text THEN
    RAISE EXCEPTION 'je_provider_posted payload proposal_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'approval_id', '') IS DISTINCT FROM v_execution.approval_id::text THEN
    RAISE EXCEPTION 'je_provider_posted payload approval_id mismatch';
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);
  PERFORM set_config('advisacor.je_execution_transition', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = 'RESPONSE_RECEIVED',
         commit_certainty = 'COMMITTED',
         qbo_je_id = v_qbo_je_id,
         intuit_tid = NULLIF(p_intuit_tid, ''),
         provider_response_hash = NULLIF(p_provider_response_hash, ''),
         request_completed_at = now(),
         updated_at = now()
   WHERE id = p_attempt_id
  RETURNING * INTO v_attempt;

  UPDATE public.journal_entry_executions
     SET status = 'POSTED_UNVERIFIED',
         provider_journal_id = v_qbo_je_id,
         provider_response_hash = NULLIF(p_provider_response_hash, ''),
         state_version = v_execution.state_version + 1,
         updated_at = now()
   WHERE id = v_execution.id
     AND status = 'POSTING'
     AND state_version = v_execution.state_version
  RETURNING * INTO v_execution;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during provider_posted';
  END IF;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.provider_posted',
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_execution',
      v_execution.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  attempt := to_jsonb(v_attempt);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;

-- D. Unknown: UNKNOWN_RESULT + POSSIBLY_COMMITTED + UNKNOWN_COMMIT + post_unknown
CREATE OR REPLACE FUNCTION public.apply_journal_entry_provider_post_unknown(
  p_attempt_id uuid,
  p_expected_status text,
  p_intuit_tid text,
  p_provider_error_code text,
  p_provider_error_message text,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  attempt jsonb,
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.journal_entry_provider_attempts%ROWTYPE;
  v_execution public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
BEGIN
  IF COALESCE(p_expected_status, '') IS DISTINCT FROM 'REQUEST_STARTED' THEN
    RAISE EXCEPTION 'je_provider_post_unknown_expected_status_must_be_REQUEST_STARTED';
  END IF;
  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'UNKNOWN_COMMIT' THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload status must be UNKNOWN_COMMIT';
  END IF;
  IF COALESCE(p_event_payload->>'commit_certainty', '') IS DISTINCT FROM 'POSSIBLY_COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload commit_certainty must be POSSIBLY_COMMITTED';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_attempt.status IS DISTINCT FROM 'REQUEST_STARTED'
     OR v_attempt.commit_certainty IS DISTINCT FROM 'POSSIBLY_COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_post_unknown_custody_invalid: status=% certainty=%',
      v_attempt.status, v_attempt.commit_certainty;
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = v_attempt.execution_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found for attempt %', p_attempt_id;
  END IF;
  IF v_execution.status IS DISTINCT FROM 'POSTING' THEN
    RAISE EXCEPTION 'je_provider_post_unknown_execution_status_invalid: %', v_execution.status;
  END IF;

  IF COALESCE(p_event_payload->>'execution_id', '') IS DISTINCT FROM v_execution.id::text THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload execution_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_attempt_id', '') IS DISTINCT FROM v_attempt.id::text THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload provider_attempt_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'accounting_connection_id', '') IS DISTINCT FROM v_attempt.accounting_connection_id::text
     OR v_attempt.accounting_connection_id IS DISTINCT FROM v_execution.accounting_connection_id THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload accounting_connection_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_request_hash', '') IS DISTINCT FROM v_attempt.provider_request_hash THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload provider_request_hash mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'correlation_marker', '') IS DISTINCT FROM v_attempt.correlation_marker THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload correlation_marker mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'proposal_id', '') IS DISTINCT FROM v_execution.proposal_id::text THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload proposal_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'approval_id', '') IS DISTINCT FROM v_execution.approval_id::text THEN
    RAISE EXCEPTION 'je_provider_post_unknown payload approval_id mismatch';
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);
  PERFORM set_config('advisacor.je_execution_transition', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = 'UNKNOWN_RESULT',
         commit_certainty = 'POSSIBLY_COMMITTED',
         intuit_tid = COALESCE(NULLIF(p_intuit_tid, ''), intuit_tid),
         provider_error_code = NULLIF(p_provider_error_code, ''),
         provider_error_message = NULLIF(p_provider_error_message, ''),
         request_completed_at = now(),
         updated_at = now()
   WHERE id = p_attempt_id
  RETURNING * INTO v_attempt;

  UPDATE public.journal_entry_executions
     SET status = 'UNKNOWN_COMMIT',
         last_error_code = NULLIF(p_provider_error_code, ''),
         last_error_message = NULLIF(p_provider_error_message, ''),
         state_version = v_execution.state_version + 1,
         updated_at = now()
   WHERE id = v_execution.id
     AND status = 'POSTING'
     AND state_version = v_execution.state_version
  RETURNING * INTO v_execution;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during post_unknown';
  END IF;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.post_unknown',
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_execution',
      v_execution.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  attempt := to_jsonb(v_attempt);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;

-- E. Proven pre-commit failure (rare; not used for speculative 4xx).
CREATE OR REPLACE FUNCTION public.apply_journal_entry_provider_precommit_failed(
  p_attempt_id uuid,
  p_expected_status text,
  p_provider_error_code text,
  p_provider_error_message text,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  attempt jsonb,
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.journal_entry_provider_attempts%ROWTYPE;
  v_execution public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
BEGIN
  IF COALESCE(p_expected_status, '') IS DISTINCT FROM 'REQUEST_STARTED' THEN
    RAISE EXCEPTION 'je_provider_precommit_failed_expected_status_must_be_REQUEST_STARTED';
  END IF;
  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'FAILED' THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload status must be FAILED';
  END IF;
  IF COALESCE(p_event_payload->>'commit_certainty', '') IS DISTINCT FROM 'DEFINITELY_NOT_COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload commit_certainty must be DEFINITELY_NOT_COMMITTED';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_attempt.status IS DISTINCT FROM 'REQUEST_STARTED'
     OR v_attempt.commit_certainty IS DISTINCT FROM 'POSSIBLY_COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_precommit_failed_custody_invalid: status=% certainty=%',
      v_attempt.status, v_attempt.commit_certainty;
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = v_attempt.execution_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found for attempt %', p_attempt_id;
  END IF;
  IF v_execution.status IS DISTINCT FROM 'POSTING' THEN
    RAISE EXCEPTION 'je_provider_precommit_failed_execution_status_invalid: %', v_execution.status;
  END IF;

  IF COALESCE(p_event_payload->>'execution_id', '') IS DISTINCT FROM v_execution.id::text THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload execution_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_attempt_id', '') IS DISTINCT FROM v_attempt.id::text THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload provider_attempt_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'accounting_connection_id', '') IS DISTINCT FROM v_attempt.accounting_connection_id::text
     OR v_attempt.accounting_connection_id IS DISTINCT FROM v_execution.accounting_connection_id THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload accounting_connection_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_request_hash', '') IS DISTINCT FROM v_attempt.provider_request_hash THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload provider_request_hash mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'correlation_marker', '') IS DISTINCT FROM v_attempt.correlation_marker THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload correlation_marker mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'proposal_id', '') IS DISTINCT FROM v_execution.proposal_id::text THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload proposal_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'approval_id', '') IS DISTINCT FROM v_execution.approval_id::text THEN
    RAISE EXCEPTION 'je_provider_precommit_failed payload approval_id mismatch';
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);
  PERFORM set_config('advisacor.je_execution_transition', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = 'FAILED_PRECOMMIT',
         commit_certainty = 'DEFINITELY_NOT_COMMITTED',
         provider_error_code = NULLIF(p_provider_error_code, ''),
         provider_error_message = NULLIF(p_provider_error_message, ''),
         request_completed_at = now(),
         updated_at = now()
   WHERE id = p_attempt_id
  RETURNING * INTO v_attempt;

  UPDATE public.journal_entry_executions
     SET status = 'FAILED',
         last_error_code = NULLIF(p_provider_error_code, ''),
         last_error_message = NULLIF(p_provider_error_message, ''),
         state_version = v_execution.state_version + 1,
         updated_at = now()
   WHERE id = v_execution.id
     AND status = 'POSTING'
     AND state_version = v_execution.state_version
  RETURNING * INTO v_execution;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during precommit_failed';
  END IF;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.execution_failed',
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_execution',
      v_execution.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  attempt := to_jsonb(v_attempt);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.apply_journal_entry_provider_dispatch_started(
  uuid, text, jsonb, text, uuid, uuid, uuid, text, text
) IS
  'JE-3B2: establish POSSIBLY_COMMITTED before any QBO POST may leave. Patent #6 provider_dispatch_started.';

COMMENT ON FUNCTION public.apply_journal_entry_provider_posted(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) IS
  'JE-3B2: atomic success custody + POSTED_UNVERIFIED + provider_posted. No Memory. No VERIFIED.';

COMMENT ON FUNCTION public.apply_journal_entry_provider_post_unknown(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) IS
  'JE-3B2: atomic unknown custody + UNKNOWN_COMMIT + post_unknown. No blind retry.';

COMMENT ON FUNCTION public.apply_journal_entry_provider_precommit_failed(
  uuid, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) IS
  'JE-3B2: proven pre-commit failure only. Speculative 4xx must use post_unknown until Intuit evidence exists.';

-- Privilege lockdown: SECURITY DEFINER mutations are service_role only.
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_dispatch_started(
  uuid, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_dispatch_started(
  uuid, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_dispatch_started(
  uuid, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_provider_dispatch_started(
  uuid, text, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_posted(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_posted(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_posted(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_provider_posted(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_post_unknown(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_post_unknown(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_post_unknown(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_provider_post_unknown(
  uuid, text, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_precommit_failed(
  uuid, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_precommit_failed(
  uuid, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_journal_entry_provider_precommit_failed(
  uuid, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_provider_precommit_failed(
  uuid, text, text, text, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

-- Re-assert patch privileges after CREATE OR REPLACE in this migration.
REVOKE ALL ON FUNCTION public.patch_journal_entry_provider_attempt(
  uuid, text, jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.patch_journal_entry_provider_attempt(
  uuid, text, jsonb
) FROM anon;
REVOKE ALL ON FUNCTION public.patch_journal_entry_provider_attempt(
  uuid, text, jsonb
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.patch_journal_entry_provider_attempt(
  uuid, text, jsonb
) TO service_role;
-- <<< end 20260822011500_journal_entry_provider_dispatch_and_outcomes.sql

-- >>> begin 20260822050000_journal_entry_verified_readback.sql
-- JE-3C — Exact QBO JournalEntry read-back verification receipts.
-- Hard-disabled at application gate; this migration only adds schema + RPCs.
-- Does NOT enable production verification, Memory write, GOVERNED_AUTO, worker, or live QBO.
-- Primary path: GET /journalentry/{persisted qbo_je_id} only — never marker discovery.
-- POSTED_UNVERIFIED → VERIFIED only via apply_journal_entry_verified.
-- Economic mismatch → VERIFICATION_MISMATCH via apply_journal_entry_verification_mismatch.
-- Read/transport failures leave POSTED_UNVERIFIED unchanged (no conclusion receipt).

-- A. Widen execution status vocabulary + provider_journal constraint.
ALTER TABLE public.journal_entry_executions
  DROP CONSTRAINT IF EXISTS journal_entry_executions_status_check;

ALTER TABLE public.journal_entry_executions
  ADD CONSTRAINT journal_entry_executions_status_check
  CHECK (status IN (
    'RESERVED',
    'PRECHECK_FAILED',
    'READY_TO_POST',
    'POSTING',
    'POSTED_UNVERIFIED',
    'UNKNOWN_COMMIT',
    'VERIFIED',
    'VERIFICATION_MISMATCH',
    'FAILED',
    'REVERSAL_REQUIRED'
  ));

ALTER TABLE public.journal_entry_executions
  DROP CONSTRAINT IF EXISTS journal_entry_executions_provider_journal_null_until_post;

ALTER TABLE public.journal_entry_executions
  ADD CONSTRAINT journal_entry_executions_provider_journal_null_until_post
  CHECK (provider_journal_id IS NULL OR status IN (
    'POSTED_UNVERIFIED',
    'UNKNOWN_COMMIT',
    'VERIFIED',
    'VERIFICATION_MISMATCH',
    'FAILED',
    'REVERSAL_REQUIRED',
    'POSTING'
  ));

-- B. Distinct normalized read-back hash + verification custody (never conflate with raw POST hash).
ALTER TABLE public.journal_entry_executions
  ADD COLUMN IF NOT EXISTS provider_readback_hash text NULL;

ALTER TABLE public.journal_entry_executions
  ADD COLUMN IF NOT EXISTS verification_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.journal_entry_executions
  ADD COLUMN IF NOT EXISTS verification_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.journal_entry_executions
  ADD COLUMN IF NOT EXISTS verified_at timestamptz NULL;

ALTER TABLE public.journal_entry_executions
  ADD COLUMN IF NOT EXISTS verification_ledger_event_id uuid NULL;

COMMENT ON COLUMN public.journal_entry_executions.provider_response_hash IS
  'JE-3B2 raw POST-response hash. Never compared to provider_readback_hash.';

COMMENT ON COLUMN public.journal_entry_executions.provider_readback_hash IS
  'JE-3C normalized provider read-back hash used for VERIFIED custody. Distinct from raw POST hash.';

COMMENT ON COLUMN public.journal_entry_executions.verification_snapshot IS
  'Normalized JournalEntry snapshot used for verification custody / hash.';

-- C. Narrow generic provider-attempt patch: block verification conclusion + hash mutation.
CREATE OR REPLACE FUNCTION public.patch_journal_entry_provider_attempt(
  p_attempt_id uuid,
  p_expected_status text,
  p_patch jsonb
)
RETURNS TABLE(attempt jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.journal_entry_provider_attempts%ROWTYPE;
  v_new_status text;
BEGIN
  SELECT *
    INTO v_row
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_row.status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt status concurrency conflict: expected %, found %',
      p_expected_status, v_row.status;
  END IF;

  IF p_patch ? 'qbo_je_id'
     AND NULLIF(p_patch->>'qbo_je_id', '') IS NOT NULL THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: qbo_je_id requires dedicated receipted RPC';
  END IF;

  IF p_patch ? 'commit_certainty' THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: commit_certainty is immutable via generic patch';
  END IF;

  IF p_patch ? 'provider_response_hash'
     OR p_patch ? 'provider_readback_hash'
     OR p_patch ? 'verification_snapshot'
     OR p_patch ? 'verification_metadata'
     OR p_patch ? 'verified_at'
     OR p_patch ? 'verification_ledger_event_id' THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: verification fields require dedicated receipted RPC';
  END IF;

  v_new_status := NULLIF(p_patch->>'status', '');
  IF v_new_status IN (
    'REQUEST_STARTED',
    'RESPONSE_RECEIVED',
    'UNKNOWN_RESULT',
    'FAILED_PRECOMMIT',
    'DISCOVERED_COMMITTED',
    'DISCOVERED_NOT_FOUND',
    'VERIFIED_PROVIDER_ID'
  ) THEN
    RAISE EXCEPTION 'je_provider_attempt_patch_forbidden: status % requires dedicated receipted RPC',
      v_new_status;
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = COALESCE(v_new_status, status),
         request_started_at = CASE
           WHEN p_patch ? 'request_started_at' THEN NULLIF(p_patch->>'request_started_at', '')::timestamptz
           ELSE request_started_at
         END,
         request_completed_at = CASE
           WHEN p_patch ? 'request_completed_at' THEN NULLIF(p_patch->>'request_completed_at', '')::timestamptz
           ELSE request_completed_at
         END,
         intuit_tid = CASE
           WHEN p_patch ? 'intuit_tid' THEN NULLIF(p_patch->>'intuit_tid', '')
           ELSE intuit_tid
         END,
         provider_error_code = CASE
           WHEN p_patch ? 'provider_error_code' THEN NULLIF(p_patch->>'provider_error_code', '')
           ELSE provider_error_code
         END,
         provider_error_message = CASE
           WHEN p_patch ? 'provider_error_message' THEN NULLIF(p_patch->>'provider_error_message', '')
           ELSE provider_error_message
         END,
         discovery_summary = COALESCE(p_patch->'discovery_summary', discovery_summary),
         updated_at = now()
   WHERE id = p_attempt_id
  RETURNING * INTO v_row;

  attempt := to_jsonb(v_row);
  RETURN NEXT;
END;
$$;

-- D. Atomic VERIFIED conclusion.
CREATE OR REPLACE FUNCTION public.apply_journal_entry_verified(
  p_execution_id uuid,
  p_expected_status text,
  p_expected_state_version integer,
  p_attempt_id uuid,
  p_expected_attempt_status text,
  p_provider_readback_hash text,
  p_verification_snapshot jsonb,
  p_verification_metadata jsonb,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  attempt jsonb,
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.journal_entry_provider_attempts%ROWTYPE;
  v_execution public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
  v_hash text;
BEGIN
  v_hash := NULLIF(btrim(COALESCE(p_provider_readback_hash, '')), '');
  IF v_hash IS NULL OR v_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'je_provider_verified_readback_hash_required';
  END IF;
  IF COALESCE(p_expected_status, '') IS DISTINCT FROM 'POSTED_UNVERIFIED' THEN
    RAISE EXCEPTION 'je_provider_verified_expected_status_must_be_POSTED_UNVERIFIED';
  END IF;
  IF COALESCE(p_expected_attempt_status, '') IS DISTINCT FROM 'RESPONSE_RECEIVED' THEN
    RAISE EXCEPTION 'je_provider_verified_expected_attempt_status_must_be_RESPONSE_RECEIVED';
  END IF;
  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'VERIFIED' THEN
    RAISE EXCEPTION 'je_provider_verified payload status must be VERIFIED';
  END IF;
  IF COALESCE(p_event_payload->>'provider_readback_hash', '') IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'je_provider_verified payload provider_readback_hash mismatch';
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = p_execution_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found: %', p_execution_id;
  END IF;
  IF v_execution.status IS DISTINCT FROM 'POSTED_UNVERIFIED' THEN
    RAISE EXCEPTION 'je_provider_verified_execution_status_invalid: %', v_execution.status;
  END IF;
  IF v_execution.state_version IS DISTINCT FROM p_expected_state_version THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during verified';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_attempt.execution_id IS DISTINCT FROM v_execution.id THEN
    RAISE EXCEPTION 'je_provider_verified attempt/execution binding mismatch';
  END IF;
  IF v_attempt.status IS DISTINCT FROM 'RESPONSE_RECEIVED'
     OR v_attempt.commit_certainty IS DISTINCT FROM 'COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_verified_attempt_custody_invalid: status=% certainty=%',
      v_attempt.status, v_attempt.commit_certainty;
  END IF;

  IF COALESCE(p_event_payload->>'execution_id', '') IS DISTINCT FROM v_execution.id::text THEN
    RAISE EXCEPTION 'je_provider_verified payload execution_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_attempt_id', '') IS DISTINCT FROM v_attempt.id::text THEN
    RAISE EXCEPTION 'je_provider_verified payload provider_attempt_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'accounting_connection_id', '') IS DISTINCT FROM v_attempt.accounting_connection_id::text
     OR v_attempt.accounting_connection_id IS DISTINCT FROM v_execution.accounting_connection_id THEN
    RAISE EXCEPTION 'je_provider_verified payload accounting_connection_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_request_hash', '') IS DISTINCT FROM v_attempt.provider_request_hash
     OR v_attempt.provider_request_hash IS DISTINCT FROM v_execution.provider_request_hash THEN
    RAISE EXCEPTION 'je_provider_verified payload provider_request_hash mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'correlation_marker', '') IS DISTINCT FROM v_attempt.correlation_marker
     OR v_attempt.correlation_marker IS DISTINCT FROM v_execution.correlation_marker THEN
    RAISE EXCEPTION 'je_provider_verified payload correlation_marker mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_journal_id', '') IS DISTINCT FROM COALESCE(v_execution.provider_journal_id, '')
     OR COALESCE(v_execution.provider_journal_id, '') IS DISTINCT FROM COALESCE(v_attempt.qbo_je_id, '') THEN
    RAISE EXCEPTION 'je_provider_verified payload provider_journal_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'proposal_id', '') IS DISTINCT FROM v_execution.proposal_id::text THEN
    RAISE EXCEPTION 'je_provider_verified payload proposal_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'approval_id', '') IS DISTINCT FROM v_execution.approval_id::text THEN
    RAISE EXCEPTION 'je_provider_verified payload approval_id mismatch';
  END IF;

  -- Patent #6 ledger scope must equal locked execution custody.
  IF p_engagement_id IS DISTINCT FROM v_execution.engagement_id THEN
    RAISE EXCEPTION 'je_provider_verified engagement_id scope mismatch';
  END IF;
  IF p_firm_client_id IS DISTINCT FROM v_execution.firm_client_id THEN
    RAISE EXCEPTION 'je_provider_verified firm_client_id scope mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'engagement_id', '') IS DISTINCT FROM v_execution.engagement_id::text THEN
    RAISE EXCEPTION 'je_provider_verified payload engagement_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'firm_client_id', '') IS DISTINCT FROM COALESCE(v_execution.firm_client_id::text, '') THEN
    RAISE EXCEPTION 'je_provider_verified payload firm_client_id mismatch';
  END IF;

  -- Idempotent identical replay: already VERIFIED with same readback hash.
  -- (Handled in application before RPC when status is already VERIFIED.)

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);
  PERFORM set_config('advisacor.je_execution_transition', '1', true);

  UPDATE public.journal_entry_provider_attempts
     SET status = 'VERIFIED_PROVIDER_ID',
         updated_at = now()
   WHERE id = p_attempt_id
     AND status = 'RESPONSE_RECEIVED'
     AND commit_certainty = 'COMMITTED'
  RETURNING * INTO v_attempt;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'je_provider_verified_attempt_concurrency_conflict';
  END IF;

  UPDATE public.journal_entry_executions
     SET status = 'VERIFIED',
         provider_readback_hash = v_hash,
         verification_snapshot = COALESCE(p_verification_snapshot, '{}'::jsonb),
         verification_metadata = COALESCE(p_verification_metadata, '{}'::jsonb),
         verified_at = now(),
         state_version = v_execution.state_version + 1,
         updated_at = now()
   WHERE id = v_execution.id
     AND status = 'POSTED_UNVERIFIED'
     AND state_version = v_execution.state_version
  RETURNING * INTO v_execution;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during verified';
  END IF;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.verified',
      'posting',
      1,
      p_firm_id,
      v_execution.firm_client_id,
      v_execution.engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_execution',
      v_execution.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  UPDATE public.journal_entry_executions
     SET verification_ledger_event_id = v_event_id,
         updated_at = now()
   WHERE id = v_execution.id
  RETURNING * INTO v_execution;

  attempt := to_jsonb(v_attempt);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;

-- E. Atomic VERIFICATION_MISMATCH conclusion (fail-closed; no auto-repost).
CREATE OR REPLACE FUNCTION public.apply_journal_entry_verification_mismatch(
  p_execution_id uuid,
  p_expected_status text,
  p_expected_state_version integer,
  p_attempt_id uuid,
  p_expected_attempt_status text,
  p_provider_readback_hash text,
  p_verification_snapshot jsonb,
  p_verification_metadata jsonb,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  attempt jsonb,
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.journal_entry_provider_attempts%ROWTYPE;
  v_execution public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
  v_hash text;
BEGIN
  v_hash := NULLIF(btrim(COALESCE(p_provider_readback_hash, '')), '');
  IF v_hash IS NULL OR v_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch_readback_hash_required';
  END IF;
  IF COALESCE(p_expected_status, '') IS DISTINCT FROM 'POSTED_UNVERIFIED' THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch_expected_status_must_be_POSTED_UNVERIFIED';
  END IF;
  IF COALESCE(p_expected_attempt_status, '') IS DISTINCT FROM 'RESPONSE_RECEIVED' THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch_expected_attempt_status_must_be_RESPONSE_RECEIVED';
  END IF;
  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'VERIFICATION_MISMATCH' THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload status must be VERIFICATION_MISMATCH';
  END IF;
  IF COALESCE(p_event_payload->>'provider_readback_hash', '') IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload provider_readback_hash mismatch';
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = p_execution_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found: %', p_execution_id;
  END IF;
  IF v_execution.status IS DISTINCT FROM 'POSTED_UNVERIFIED' THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch_execution_status_invalid: %', v_execution.status;
  END IF;
  IF v_execution.state_version IS DISTINCT FROM p_expected_state_version THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during verification_mismatch';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.journal_entry_provider_attempts
   WHERE id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_provider_attempt not found: %', p_attempt_id;
  END IF;
  IF v_attempt.execution_id IS DISTINCT FROM v_execution.id THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch attempt/execution binding mismatch';
  END IF;
  IF v_attempt.status IS DISTINCT FROM 'RESPONSE_RECEIVED'
     OR v_attempt.commit_certainty IS DISTINCT FROM 'COMMITTED' THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch_attempt_custody_invalid: status=% certainty=%',
      v_attempt.status, v_attempt.commit_certainty;
  END IF;

  -- Attempt ↔ execution immutable bindings (VERIFIED-strength).
  IF v_attempt.accounting_connection_id IS DISTINCT FROM v_execution.accounting_connection_id THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch attempt/execution accounting_connection_id mismatch';
  END IF;
  IF v_attempt.provider_request_hash IS DISTINCT FROM v_execution.provider_request_hash THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch attempt/execution provider_request_hash mismatch';
  END IF;
  IF v_attempt.correlation_marker IS DISTINCT FROM v_execution.correlation_marker THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch attempt/execution correlation_marker mismatch';
  END IF;
  IF COALESCE(v_execution.provider_journal_id, '') IS DISTINCT FROM COALESCE(v_attempt.qbo_je_id, '') THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch attempt/execution provider_journal_id mismatch';
  END IF;

  IF COALESCE(p_event_payload->>'execution_id', '') IS DISTINCT FROM v_execution.id::text THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload execution_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_attempt_id', '') IS DISTINCT FROM v_attempt.id::text THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload provider_attempt_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'accounting_connection_id', '') IS DISTINCT FROM v_attempt.accounting_connection_id::text THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload accounting_connection_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_request_hash', '') IS DISTINCT FROM v_attempt.provider_request_hash THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload provider_request_hash mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'correlation_marker', '') IS DISTINCT FROM v_attempt.correlation_marker THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload correlation_marker mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'provider_journal_id', '') IS DISTINCT FROM COALESCE(v_execution.provider_journal_id, '') THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload provider_journal_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'proposal_id', '') IS DISTINCT FROM v_execution.proposal_id::text THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload proposal_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'approval_id', '') IS DISTINCT FROM v_execution.approval_id::text THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload approval_id mismatch';
  END IF;

  -- Patent #6 ledger scope must equal locked execution custody.
  IF p_engagement_id IS DISTINCT FROM v_execution.engagement_id THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch engagement_id scope mismatch';
  END IF;
  IF p_firm_client_id IS DISTINCT FROM v_execution.firm_client_id THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch firm_client_id scope mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'engagement_id', '') IS DISTINCT FROM v_execution.engagement_id::text THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload engagement_id mismatch';
  END IF;
  IF COALESCE(p_event_payload->>'firm_client_id', '') IS DISTINCT FROM COALESCE(v_execution.firm_client_id::text, '') THEN
    RAISE EXCEPTION 'je_provider_verification_mismatch payload firm_client_id mismatch';
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);
  PERFORM set_config('advisacor.je_execution_transition', '1', true);

  -- Attempt remains RESPONSE_RECEIVED + COMMITTED; execution fails closed.
  UPDATE public.journal_entry_executions
     SET status = 'VERIFICATION_MISMATCH',
         provider_readback_hash = v_hash,
         verification_snapshot = COALESCE(p_verification_snapshot, '{}'::jsonb),
         verification_metadata = COALESCE(p_verification_metadata, '{}'::jsonb),
         last_error_code = COALESCE(NULLIF(p_event_payload->>'error_code', ''), 'je_verification_mismatch'),
         last_error_message = COALESCE(NULLIF(p_event_payload->>'error_message', ''), 'Provider read-back failed economic verification'),
         state_version = v_execution.state_version + 1,
         updated_at = now()
   WHERE id = v_execution.id
     AND status = 'POSTED_UNVERIFIED'
     AND state_version = v_execution.state_version
  RETURNING * INTO v_execution;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during verification_mismatch';
  END IF;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.verification_mismatch',
      'posting',
      1,
      p_firm_id,
      v_execution.firm_client_id,
      v_execution.engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_execution',
      v_execution.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  UPDATE public.journal_entry_executions
     SET verification_ledger_event_id = v_event_id,
         updated_at = now()
   WHERE id = v_execution.id
  RETURNING * INTO v_execution;

  attempt := to_jsonb(v_attempt);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.apply_journal_entry_verified(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) IS
  'JE-3C: POSTED_UNVERIFIED → VERIFIED after exact GET read-back. No Memory. No POST.';

COMMENT ON FUNCTION public.apply_journal_entry_verification_mismatch(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) IS
  'JE-3C: POSTED_UNVERIFIED → VERIFICATION_MISMATCH on economic/binding mismatch. No auto-repost.';

REVOKE ALL ON FUNCTION public.apply_journal_entry_verified(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_journal_entry_verified(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_journal_entry_verified(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_verified(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.apply_journal_entry_verification_mismatch(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_journal_entry_verification_mismatch(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_journal_entry_verification_mismatch(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_journal_entry_verification_mismatch(
  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.patch_journal_entry_provider_attempt(
  uuid, text, jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.patch_journal_entry_provider_attempt(
  uuid, text, jsonb
) FROM anon;
REVOKE ALL ON FUNCTION public.patch_journal_entry_provider_attempt(
  uuid, text, jsonb
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.patch_journal_entry_provider_attempt(
  uuid, text, jsonb
) TO service_role;
-- <<< end 20260822050000_journal_entry_verified_readback.sql

-- >>> begin 20260822200000_je3d_sandbox_activation_identity.sql
-- JE-3D — Durable sandbox activation identity (schema only).
-- DO NOT APPLY without direct review. No backfill in this migration.
--
-- Activation allowlist requires BOTH:
--   accounting_connections.provider_environment = 'sandbox'
--   companies.je_activation_demo_role = 'DEMO_A_GENERAL_ACCOUNTING'
--
-- Proposed backfill (review separately; never infer from company name):
--   UPDATE accounting_connections SET provider_environment = 'sandbox'
--     WHERE id = '<independently-verified-sandbox-grant-id>';
--   UPDATE companies SET je_activation_demo_role = 'DEMO_A_GENERAL_ACCOUNTING'
--     WHERE id = '<canonical-demo-a-company-id>';

DO $$
BEGIN
  IF to_regclass('public.accounting_connections') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'accounting_connections'
        AND column_name = 'provider_environment'
    ) THEN
      ALTER TABLE public.accounting_connections
        ADD COLUMN provider_environment text;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accounting_connections_provider_environment_check'
      AND conrelid = 'public.accounting_connections'::regclass
  ) THEN
    ALTER TABLE public.accounting_connections
      ADD CONSTRAINT accounting_connections_provider_environment_check
      CHECK (
        provider_environment IS NULL
        OR provider_environment IN ('sandbox', 'production')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.accounting_connections.provider_environment IS
  'Durable Intuit OAuth grant environment (sandbox|production). Written at canonical OAuth persist from deployment QB_ENVIRONMENT. JE-3D activation requires provider_environment = sandbox.';

DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'companies'
        AND column_name = 'je_activation_demo_role'
    ) THEN
      ALTER TABLE public.companies
        ADD COLUMN je_activation_demo_role text;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'companies_je_activation_demo_role_check'
      AND conrelid = 'public.companies'::regclass
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_je_activation_demo_role_check
      CHECK (
        je_activation_demo_role IS NULL
        OR je_activation_demo_role IN (
          'DEMO_A_GENERAL_ACCOUNTING',
          'DEMO_B_SPECIALTY'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.companies.je_activation_demo_role IS
  'Controlled JE-3D activation demo identity. Allowlist requires DEMO_A_GENERAL_ACCOUNTING. Never derived from company name.';
-- <<< end 20260822200000_je3d_sandbox_activation_identity.sql

-- >>> begin 20260826043000_journal_entry_provider_attempt_reuse_posting_started.sql
-- JE-3D — Pre-reserved attempt reuse must still establish posting_started.
-- Exact RESERVED + NOT_SENT reuse with p_publish_posting_started=true atomically:
--   READY_TO_POST → POSTING + journal_entry.posting_started
-- Attempt custody unchanged. No second attempt. No provider POST.

CREATE OR REPLACE FUNCTION public.je_publish_posting_started_from_ready(
  p_execution public.journal_entry_executions,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text
)
RETURNS TABLE(
  execution public.journal_entry_executions,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_execution public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
BEGIN
  v_execution := p_execution;

  IF v_execution.status IS DISTINCT FROM 'READY_TO_POST' THEN
    RAISE EXCEPTION 'je_provider_attempt_execution_status_invalid: %', v_execution.status;
  END IF;

  IF p_engagement_id IS DISTINCT FROM v_execution.engagement_id THEN
    RAISE EXCEPTION 'je_provider_attempt_engagement_mismatch';
  END IF;
  IF p_firm_client_id IS DISTINCT FROM v_execution.firm_client_id THEN
    RAISE EXCEPTION 'je_provider_attempt_firm_client_mismatch';
  END IF;

  IF COALESCE(p_event_payload->>'status', '') IS DISTINCT FROM 'POSTING' THEN
    RAISE EXCEPTION 'journal entry execution event payload status mismatch: payload=% expected=POSTING',
      COALESCE(p_event_payload->>'status', '<null>');
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);
  PERFORM set_config('advisacor.je_execution_transition', '1', true);

  UPDATE public.journal_entry_executions
     SET status = 'POSTING',
         state_version = v_execution.state_version + 1,
         updated_at = now()
   WHERE id = v_execution.id
     AND status = 'READY_TO_POST'
     AND state_version = v_execution.state_version
  RETURNING * INTO v_execution;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution state_version concurrency conflict during posting_started';
  END IF;

  SELECT pe.event_id
    INTO v_event_id
    FROM public.publish_ledger_event(
      'journal_entry.posting_started',
      'posting',
      1,
      p_firm_id,
      p_firm_client_id,
      p_engagement_id,
      NULL,
      p_close_period_id,
      'journal_entry_execution',
      v_execution.id::text,
      'user',
      p_actor_id,
      p_event_payload,
      '{}'::jsonb,
      NULL,
      p_event_payload_canonical
    ) AS pe;

  execution := v_execution;
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.persist_journal_entry_provider_attempt(
  p_row jsonb,
  p_event_payload jsonb,
  p_event_payload_canonical text,
  p_firm_id uuid,
  p_firm_client_id uuid,
  p_engagement_id uuid,
  p_close_period_id text,
  p_actor_id text,
  p_publish_posting_started boolean DEFAULT false
)
RETURNS TABLE(
  reused boolean,
  attempt jsonb,
  execution jsonb,
  ledger_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.journal_entry_provider_attempts%ROWTYPE;
  v_inserted public.journal_entry_provider_attempts%ROWTYPE;
  v_execution public.journal_entry_executions%ROWTYPE;
  v_event_id uuid;
  v_posting_result record;
BEGIN
  IF p_row ? 'status'
     AND NULLIF(p_row->>'status', '') IS NOT NULL
     AND p_row->>'status' IS DISTINCT FROM 'RESERVED' THEN
    RAISE EXCEPTION 'je_provider_attempt_initial_status_forbidden: %', p_row->>'status';
  END IF;
  IF p_row ? 'commit_certainty'
     AND NULLIF(p_row->>'commit_certainty', '') IS NOT NULL
     AND p_row->>'commit_certainty' IS DISTINCT FROM 'NOT_SENT' THEN
    RAISE EXCEPTION 'je_provider_attempt_initial_certainty_forbidden: %',
      p_row->>'commit_certainty';
  END IF;
  IF p_row ? 'qbo_je_id' AND NULLIF(p_row->>'qbo_je_id', '') IS NOT NULL THEN
    RAISE EXCEPTION 'je_provider_attempt_initial_qbo_je_id_forbidden';
  END IF;

  SELECT *
    INTO v_execution
    FROM public.journal_entry_executions
   WHERE id = (p_row->>'execution_id')::uuid
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'journal_entry_execution not found: %', p_row->>'execution_id';
  END IF;

  IF v_execution.accounting_connection_id::text IS DISTINCT FROM p_row->>'accounting_connection_id' THEN
    RAISE EXCEPTION 'je_provider_attempt_connection_mismatch';
  END IF;
  IF v_execution.provider_request_hash IS DISTINCT FROM p_row->>'provider_request_hash' THEN
    RAISE EXCEPTION 'je_provider_attempt_request_hash_mismatch';
  END IF;
  IF v_execution.correlation_marker IS DISTINCT FROM p_row->>'correlation_marker' THEN
    RAISE EXCEPTION 'je_provider_attempt_correlation_mismatch';
  END IF;
  IF v_execution.provider IS DISTINCT FROM p_row->>'provider' THEN
    RAISE EXCEPTION 'je_provider_attempt_provider_mismatch';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.journal_entry_provider_attempts
   WHERE execution_id = v_execution.id;

  IF FOUND THEN
    IF v_existing.provider_request_hash IS DISTINCT FROM p_row->>'provider_request_hash'
       OR v_existing.accounting_connection_id::text IS DISTINCT FROM p_row->>'accounting_connection_id'
       OR v_existing.correlation_marker IS DISTINCT FROM p_row->>'correlation_marker' THEN
      RAISE EXCEPTION 'je_provider_attempt_binding_conflict';
    END IF;

    IF NOT p_publish_posting_started THEN
      reused := true;
      attempt := to_jsonb(v_existing);
      execution := to_jsonb(v_execution);
      ledger_event_id := NULL;
      RETURN NEXT;
      RETURN;
    END IF;

    IF v_execution.status = 'POSTING' THEN
      IF v_existing.status IS DISTINCT FROM 'RESERVED'
         OR v_existing.commit_certainty IS DISTINCT FROM 'NOT_SENT'
         OR v_existing.qbo_je_id IS NOT NULL
         OR v_existing.request_started_at IS NOT NULL THEN
        RAISE EXCEPTION 'je_provider_attempt_reuse_posting_started_forbidden: %', v_existing.status;
      END IF;
      reused := true;
      attempt := to_jsonb(v_existing);
      execution := to_jsonb(v_execution);
      ledger_event_id := NULL;
      RETURN NEXT;
      RETURN;
    END IF;

    IF v_execution.status = 'READY_TO_POST' THEN
      IF v_existing.status IS DISTINCT FROM 'RESERVED'
         OR v_existing.commit_certainty IS DISTINCT FROM 'NOT_SENT'
         OR v_existing.qbo_je_id IS NOT NULL
         OR v_existing.request_started_at IS NOT NULL THEN
        RAISE EXCEPTION 'je_provider_attempt_reuse_posting_started_forbidden: %', v_existing.status;
      END IF;

      SELECT *
        INTO v_posting_result
        FROM public.je_publish_posting_started_from_ready(
          v_execution,
          p_event_payload,
          p_event_payload_canonical,
          p_firm_id,
          p_firm_client_id,
          p_engagement_id,
          p_close_period_id,
          p_actor_id
        );
      IF NOT FOUND THEN
        RAISE EXCEPTION 'je_provider_attempt_posting_started_helper_returned_no_row';
      END IF;
      v_execution := v_posting_result.execution;
      v_event_id := v_posting_result.ledger_event_id;

      reused := true;
      attempt := to_jsonb(v_existing);
      execution := to_jsonb(v_execution);
      ledger_event_id := v_event_id;
      RETURN NEXT;
      RETURN;
    END IF;

    RAISE EXCEPTION 'je_provider_attempt_reuse_posting_started_forbidden: execution=% attempt=%',
      v_execution.status, v_existing.status;
  END IF;

  IF v_execution.status IS DISTINCT FROM 'READY_TO_POST'
     AND v_execution.status IS DISTINCT FROM 'POSTING' THEN
    RAISE EXCEPTION 'je_provider_attempt_execution_status_invalid: %', v_execution.status;
  END IF;

  PERFORM set_config('advisacor.je_provider_attempt_mutation', '1', true);
  IF p_publish_posting_started AND v_execution.status = 'READY_TO_POST' THEN
    PERFORM set_config('advisacor.je_execution_transition', '1', true);
  END IF;

  INSERT INTO public.journal_entry_provider_attempts (
    id,
    execution_id,
    accounting_connection_id,
    provider,
    provider_request_hash,
    correlation_marker,
    status,
    commit_certainty,
    request_started_at,
    request_completed_at,
    qbo_je_id,
    intuit_tid,
    provider_response_hash,
    provider_error_code,
    provider_error_message,
    discovery_summary
  ) VALUES (
    (p_row->>'id')::uuid,
    v_execution.id,
    (p_row->>'accounting_connection_id')::uuid,
    p_row->>'provider',
    p_row->>'provider_request_hash',
    p_row->>'correlation_marker',
    'RESERVED',
    'NOT_SENT',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '{}'::jsonb
  )
  RETURNING * INTO v_inserted;

  IF p_publish_posting_started AND v_execution.status = 'READY_TO_POST' THEN
    SELECT *
      INTO v_posting_result
      FROM public.je_publish_posting_started_from_ready(
        v_execution,
        p_event_payload,
        p_event_payload_canonical,
        p_firm_id,
        p_firm_client_id,
        p_engagement_id,
        p_close_period_id,
        p_actor_id
      );
    IF NOT FOUND THEN
      RAISE EXCEPTION 'je_provider_attempt_posting_started_helper_returned_no_row';
    END IF;
    v_execution := v_posting_result.execution;
    v_event_id := v_posting_result.ledger_event_id;
  END IF;

  reused := false;
  attempt := to_jsonb(v_inserted);
  execution := to_jsonb(v_execution);
  ledger_event_id := v_event_id;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO v_existing
      FROM public.journal_entry_provider_attempts
     WHERE execution_id = (p_row->>'execution_id')::uuid;
    IF NOT FOUND THEN
      RAISE;
    END IF;
    IF v_existing.provider_request_hash IS DISTINCT FROM p_row->>'provider_request_hash'
       OR v_existing.accounting_connection_id::text IS DISTINCT FROM p_row->>'accounting_connection_id'
       OR v_existing.correlation_marker IS DISTINCT FROM p_row->>'correlation_marker' THEN
      RAISE EXCEPTION 'je_provider_attempt_binding_conflict';
    END IF;

    SELECT *
      INTO v_execution
      FROM public.journal_entry_executions
     WHERE id = v_existing.execution_id
     FOR UPDATE;

    IF NOT p_publish_posting_started THEN
      reused := true;
      attempt := to_jsonb(v_existing);
      execution := to_jsonb(v_execution);
      ledger_event_id := NULL;
      RETURN NEXT;
      RETURN;
    END IF;

    IF v_execution.status = 'POSTING' THEN
      IF v_existing.status IS DISTINCT FROM 'RESERVED'
         OR v_existing.commit_certainty IS DISTINCT FROM 'NOT_SENT'
         OR v_existing.qbo_je_id IS NOT NULL
         OR v_existing.request_started_at IS NOT NULL THEN
        RAISE EXCEPTION 'je_provider_attempt_reuse_posting_started_forbidden: %', v_existing.status;
      END IF;
      reused := true;
      attempt := to_jsonb(v_existing);
      execution := to_jsonb(v_execution);
      ledger_event_id := NULL;
      RETURN NEXT;
      RETURN;
    END IF;

    IF v_execution.status = 'READY_TO_POST' THEN
      IF v_existing.status IS DISTINCT FROM 'RESERVED'
         OR v_existing.commit_certainty IS DISTINCT FROM 'NOT_SENT'
         OR v_existing.qbo_je_id IS NOT NULL
         OR v_existing.request_started_at IS NOT NULL THEN
        RAISE EXCEPTION 'je_provider_attempt_reuse_posting_started_forbidden: %', v_existing.status;
      END IF;

      SELECT *
        INTO v_posting_result
        FROM public.je_publish_posting_started_from_ready(
          v_execution,
          p_event_payload,
          p_event_payload_canonical,
          p_firm_id,
          p_firm_client_id,
          p_engagement_id,
          p_close_period_id,
          p_actor_id
        );
      IF NOT FOUND THEN
        RAISE EXCEPTION 'je_provider_attempt_posting_started_helper_returned_no_row';
      END IF;
      v_execution := v_posting_result.execution;
      v_event_id := v_posting_result.ledger_event_id;

      reused := true;
      attempt := to_jsonb(v_existing);
      execution := to_jsonb(v_execution);
      ledger_event_id := v_event_id;
      RETURN NEXT;
      RETURN;
    END IF;

    RAISE EXCEPTION 'je_provider_attempt_reuse_posting_started_forbidden: execution=% attempt=%',
      v_execution.status, v_existing.status;
END;
$$;

COMMENT ON FUNCTION public.persist_journal_entry_provider_attempt(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text, boolean
) IS
  'JE-3B1/3D: create provider attempt as RESERVED+NOT_SENT; exact reuse preserves attempt custody; RESERVED reuse may establish atomic posting_started when execution is READY_TO_POST.';

COMMENT ON FUNCTION public.je_publish_posting_started_from_ready(
  public.journal_entry_executions,
  jsonb,
  text,
  uuid,
  uuid,
  uuid,
  text,
  text
) IS
  'Internal-only helper for persist_journal_entry_provider_attempt. Not a public mutation API.';

-- Privilege lockdown: helper is implementation detail only (owner-chain callable).
REVOKE ALL ON FUNCTION public.je_publish_posting_started_from_ready(
  public.journal_entry_executions,
  jsonb,
  text,
  uuid,
  uuid,
  uuid,
  text,
  text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.je_publish_posting_started_from_ready(
  public.journal_entry_executions,
  jsonb,
  text,
  uuid,
  uuid,
  uuid,
  text,
  text
) FROM anon;

REVOKE ALL ON FUNCTION public.je_publish_posting_started_from_ready(
  public.journal_entry_executions,
  jsonb,
  text,
  uuid,
  uuid,
  uuid,
  text,
  text
) FROM authenticated;

-- Defense-in-depth: CREATE OR REPLACE must not broaden governed persist RPC authority.
REVOKE ALL ON FUNCTION public.persist_journal_entry_provider_attempt(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text, boolean
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.persist_journal_entry_provider_attempt(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text, boolean
) FROM anon;

REVOKE ALL ON FUNCTION public.persist_journal_entry_provider_attempt(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text, boolean
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.persist_journal_entry_provider_attempt(
  jsonb, jsonb, text, uuid, uuid, uuid, text, text, boolean
) TO service_role;
-- <<< end 20260826043000_journal_entry_provider_attempt_reuse_posting_started.sql

-- >>> begin 2026_07_20__pilot_slots_add_review_assist_pro_tier_key.sql
-- File: supabase/migrations/2026_07_20__pilot_slots_add_review_assist_pro_tier_key.sql
--
-- Phase DEMO-1 — Widen pilot_slots.tier_key CHECK constraint to include
-- review_assist_pro (defined in lib/entitlements.ts but never added to the
-- constraint) and a reserved audit_ready tier_key for later.
--
-- Additive-only. No data changes. Existing rows are unaffected.

BEGIN;

-- Pre-flight: prove no existing row would be excluded by the new list.
-- (This is defensive; the current list is a subset of the new list.)
DO $$
DECLARE
  bad_count INTEGER;
  bad_examples TEXT;
BEGIN
  SELECT COUNT(*), COALESCE(string_agg(DISTINCT tier_key, ', '), '')
    INTO bad_count, bad_examples
    FROM pilot_slots
   WHERE tier_key NOT IN (
     'solo_bookkeeper',
     'owner_lite',
     'owner_pro',
     'accounting_pro',
     'firm',
     'enterprise_firm',
     'industry_premium',
     'client_seat_alacarte',
     'review_assist',
     'review_assist_pro',
     'audit_ready'
   );

  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'Pre-flight failure: % existing pilot_slots rows have tier_key values outside the widened whitelist: %',
      bad_count, bad_examples;
  END IF;
END $$;

-- Drop the old constraint and add the widened one.
ALTER TABLE public.pilot_slots
  DROP CONSTRAINT IF EXISTS pilot_slots_tier_key_check;

ALTER TABLE public.pilot_slots
  ADD CONSTRAINT pilot_slots_tier_key_check
  CHECK (tier_key = ANY (ARRAY[
    'solo_bookkeeper'::text,
    'owner_lite'::text,
    'owner_pro'::text,
    'accounting_pro'::text,
    'firm'::text,
    'enterprise_firm'::text,
    'industry_premium'::text,
    'client_seat_alacarte'::text,
    'review_assist'::text,
    'review_assist_pro'::text,
    'audit_ready'::text
  ]));

-- Verify the new constraint by attempting a positive fixture insert into a
-- transaction-scoped SAVEPOINT (rolled back so no side-effects).
DO $$
DECLARE
  test_firm_id UUID;
BEGIN
  -- Pick any real firm id; the seed row is rolled back below.
  SELECT id INTO test_firm_id FROM public.firms LIMIT 1;

  IF test_firm_id IS NULL THEN
    RAISE NOTICE 'No firms present; skipping smoke insert (constraint verified structurally).';
    RETURN;
  END IF;

  BEGIN
    -- Schema adaptation: pilot_slots_complimentary_cap_check requires
    -- complimentary_client_cap > 0 when pilot_status = 'complimentary'.
    INSERT INTO public.pilot_slots (
      id, firm_id, tier_key, pilot_status,
      pricing_structure, pricing_cadence,
      complimentary_client_cap
    ) VALUES (
      gen_random_uuid(), test_firm_id, 'review_assist_pro', 'complimentary',
      'complimentary', 'monthly',
      1
    );
    RAISE EXCEPTION 'Rolling back smoke insert (this exception message is expected).';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%Rolling back smoke insert%' THEN
        RAISE;
      END IF;
  END;
END $$;

COMMIT;
-- <<< end 2026_07_20__pilot_slots_add_review_assist_pro_tier_key.sql

-- --- security / RLS / grants / revokes (former module 5) ---

-- >>> begin 20260703_1400_d6_0_1_rls_curated_rule_fires.sql
-- Phase D6.0.1: Enable RLS on curated_rule_fires
-- Resolves security advisor lint 0013_rls_disabled_in_public.
--
-- Mirrors the EXACT policy predicate used by curated_rules_registry (D0),
-- dumped from pg_policy on the live DB 2026-07-03:
--   polname:         "Super admins manage curated rules"
--   using_expr:      ((auth.jwt() ->> 'role') = 'super_admin')
--   with_check_expr: (null)
--   roles:           public   (polroles = {-})
--   cmd:             ALL, permissive
--
-- The JWT top-level 'role' claim is used (NOT auth.user_metadata), so lint 0015
-- is not triggered. Service role bypasses RLS, so the D6.1 runner is unaffected.
begin;

-- 1. Enable RLS
alter table public.curated_rule_fires enable row level security;

-- 2. Super-admin management policy — identical shape/predicate to
--    curated_rules_registry: permissive, FOR ALL, TO public, USING the JWT role
--    claim, no WITH CHECK (USING is reused as the check for writes).
drop policy if exists "Super admins manage curated_rule_fires" on public.curated_rule_fires;
create policy "Super admins manage curated_rule_fires"
  on public.curated_rule_fires
  as permissive
  for all
  to public
  using ((auth.jwt() ->> 'role') = 'super_admin');

commit;
-- <<< end 20260703_1400_d6_0_1_rls_curated_rule_fires.sql

-- >>> begin 20260706170000_d6_4c_3_posting_policy_and_remediation.sql
-- =============================================================================
-- D6.4c-3 — Approve-and-Post: Posting Policy + Remediation Support
-- =============================================================================
-- ADDITIVE ONLY except:
--   (a) replaces pre_close_review_items_immutable() to permit set-once
--       transition of post_block_reason.
--   (b) extends ai_action_log_action_category_check and
--       ledger_events_event_category_check for D6.4c-3 categories.
-- =============================================================================
begin;

-- ------------------------------------------------------------
-- 1. New table: engagement_posting_policy
-- ------------------------------------------------------------
create table if not exists public.engagement_posting_policy (
  engagement_id                     uuid primary key
                                    references public.engagements(id) on delete cascade,
  policy_code                       text        not null default 'advisacor_balanced',
  advisacor_preset                  text        null,
  auto_post_on_approved             boolean     not null default true,
  auto_post_on_edit_and_approved    boolean     not null default false,
  updated_by                        uuid        null,
  updated_at                        timestamptz not null default now(),
  created_at                        timestamptz not null default now(),
  constraint engagement_posting_policy_preset_chk check (
    advisacor_preset is null or advisacor_preset in (
      'advisacor_conservative',
      'advisacor_balanced',
      'advisacor_aggressive'
    )
  )
);

comment on table public.engagement_posting_policy is
  'D6.4c-3: per-engagement posting policy. Hybrid: pin to an Advisacor preset OR set flags manually.';

comment on column public.engagement_posting_policy.policy_code is
  'Free-text label for humans. When a preset is pinned, this equals the preset code.';

comment on column public.engagement_posting_policy.advisacor_preset is
  'When non-null, flags below must match the preset definition (enforced by trigger).';

-- ------------------------------------------------------------
-- 2. Preset consistency trigger
-- ------------------------------------------------------------
create or replace function public.engagement_posting_policy_preset_consistency()
returns trigger language plpgsql as $$
begin
  if new.advisacor_preset is null then
    return new;
  end if;
  if new.advisacor_preset = 'advisacor_conservative' then
    if new.auto_post_on_approved is distinct from false
       or new.auto_post_on_edit_and_approved is distinct from false then
      raise exception 'advisacor_conservative requires both auto_post flags = false (engagement=%)', new.engagement_id;
    end if;
  elsif new.advisacor_preset = 'advisacor_balanced' then
    if new.auto_post_on_approved is distinct from true
       or new.auto_post_on_edit_and_approved is distinct from false then
      raise exception 'advisacor_balanced requires auto_post_on_approved=true, auto_post_on_edit_and_approved=false (engagement=%)', new.engagement_id;
    end if;
  elsif new.advisacor_preset = 'advisacor_aggressive' then
    if new.auto_post_on_approved is distinct from true
       or new.auto_post_on_edit_and_approved is distinct from true then
      raise exception 'advisacor_aggressive requires both auto_post flags = true (engagement=%)', new.engagement_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists engagement_posting_policy_preset_consistency_trg
  on public.engagement_posting_policy;
create trigger engagement_posting_policy_preset_consistency_trg
  before insert or update on public.engagement_posting_policy
  for each row execute function public.engagement_posting_policy_preset_consistency();

-- ------------------------------------------------------------
-- 3. Backfill: seed advisacor_balanced for every existing engagement
-- ------------------------------------------------------------
insert into public.engagement_posting_policy (
  engagement_id, policy_code, advisacor_preset,
  auto_post_on_approved, auto_post_on_edit_and_approved
)
select
  e.id,
  'advisacor_balanced',
  'advisacor_balanced',
  true,
  false
from public.engagements e
where not exists (
  select 1 from public.engagement_posting_policy p where p.engagement_id = e.id
);

-- ------------------------------------------------------------
-- 4. New column on pre_close_review_items: post_block_reason
-- ------------------------------------------------------------
alter table public.pre_close_review_items
  add column if not exists post_block_reason text null;

comment on column public.pre_close_review_items.post_block_reason is
  'D6.4c-3: machine-readable reason the remediation pipeline blocked posting. Set-once (null -> value).';

-- ------------------------------------------------------------
-- 5. Extend immutability trigger to allow set-once for post_block_reason
-- ------------------------------------------------------------
create or replace function public.pre_close_review_items_immutable()
returns trigger language plpgsql as $$
begin
  if (
    new.id                          is distinct from old.id                          or
    new.fire_id                     is distinct from old.fire_id                     or
    new.firm_client_id              is distinct from old.firm_client_id              or
    new.engagement_id               is distinct from old.engagement_id               or
    new.close_period_id             is distinct from old.close_period_id             or
    new.rule_id                     is distinct from old.rule_id                     or
    new.rule_version                is distinct from old.rule_version                or
    new.accounting_method           is distinct from old.accounting_method           or
    new.je_draft                    is distinct from old.je_draft                    or
    new.je_draft_total_debit_cents  is distinct from old.je_draft_total_debit_cents  or
    new.je_draft_total_credit_cents is distinct from old.je_draft_total_credit_cents or
    new.je_draft_line_count         is distinct from old.je_draft_line_count         or
    new.assertion_tags              is distinct from old.assertion_tags              or
    new.rule_reason_code            is distinct from old.rule_reason_code            or
    new.rule_reason_detail          is distinct from old.rule_reason_detail          or
    new.severity                    is distinct from old.severity                    or
    new.evidence_refs               is distinct from old.evidence_refs               or
    new.basis_guard_reason_code     is distinct from old.basis_guard_reason_code     or
    new.basis_guard_reason_text     is distinct from old.basis_guard_reason_text     or
    new.created_at                  is distinct from old.created_at
  ) then
    raise exception 'pre_close_review_items row is immutable except decision-tail columns (id=%)', old.id;
  end if;
  if old.posted_je_attempt_id is not null and new.posted_je_attempt_id is distinct from old.posted_je_attempt_id then
    raise exception 'pre_close_review_items.posted_je_attempt_id is set-once (id=%)', old.id;
  end if;
  if old.post_block_reason is not null and new.post_block_reason is distinct from old.post_block_reason then
    raise exception 'pre_close_review_items.post_block_reason is set-once (id=%)', old.id;
  end if;
  if old.decision is not null and new.decision is distinct from old.decision then
    raise exception 'pre_close_review_items.decision is set-once (id=%)', old.id;
  end if;
  return new;
end $$;

-- ------------------------------------------------------------
-- 6. Extend ai_action_log_action_category_check (reconciled union)
-- ------------------------------------------------------------
alter table public.ai_action_log
  drop constraint if exists ai_action_log_action_category_check;
alter table public.ai_action_log
  add constraint ai_action_log_action_category_check check (
    action_category in (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation'
    )
  );

comment on constraint ai_action_log_action_category_check on public.ai_action_log is
  'D6.4c-3: widened to include posting_attempt, posting_blocked, posting_remediation (preserves D-Platform + D-Entitlements + D6.4c-1 categories).';

-- ------------------------------------------------------------
-- 7. Extend ledger_events_event_category_check for posting category
-- ------------------------------------------------------------
alter table public.ledger_events
  drop constraint if exists ledger_events_event_category_check;
alter table public.ledger_events
  add constraint ledger_events_event_category_check check (
    event_category in (
      'intake','ledger','cash_app','ar','ap','recon','close','assertion',
      'rule','directive','ai_action','system','entitlement','posting'
    )
  );

comment on constraint ledger_events_event_category_check on public.ledger_events is
  'D6.4c-3: widened to include posting (approve-and-post outcomes).';

commit;
-- <<< end 20260706170000_d6_4c_3_posting_policy_and_remediation.sql

-- >>> begin 20260706180000_d6_4d_reviewer_ui_rls_and_visibility.sql
-- =============================================================================
-- D6.4d — Reviewer UI RLS + Client Visibility + Review Packet Exports
-- =============================================================================
-- ADDITIVE ONLY. Reconciled against live D6.4c-3 constraint unions.
-- DEVIATION: je_backup_packets + je-backup bucket already exist (D6.4a) — this
-- migration adds RLS policies to je_backup_packets only; does not recreate the table.
-- =============================================================================
begin;

-- ------------------------------------------------------------
-- 1. firm_client_users — join table for client-user identity
-- ------------------------------------------------------------
create table if not exists public.firm_client_users (
  id              uuid primary key default gen_random_uuid(),
  firm_client_id  uuid not null references public.firm_clients(id) on delete cascade,
  user_id         uuid not null,
  role            text not null default 'client_owner'
                    check (role in ('client_owner','client_reviewer','client_readonly')),
  status          text not null default 'active'
                    check (status in ('active','revoked')),
  invited_by      uuid null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (firm_client_id, user_id)
);

create index if not exists firm_client_users_user_id_idx
  on public.firm_client_users(user_id);
create index if not exists firm_client_users_firm_client_id_idx
  on public.firm_client_users(firm_client_id) where status = 'active';

alter table public.firm_client_users enable row level security;

drop policy if exists "service_role_all_firm_client_users" on public.firm_client_users;
create policy "service_role_all_firm_client_users"
  on public.firm_client_users for all to service_role
  using (true) with check (true);

drop policy if exists "self_read_firm_client_users" on public.firm_client_users;
create policy "self_read_firm_client_users"
  on public.firm_client_users for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "firm_members_read_firm_client_users" on public.firm_client_users;
create policy "firm_members_read_firm_client_users"
  on public.firm_client_users for select to authenticated
  using (
    firm_client_id in (
      select fc.id from public.firm_clients fc
      where fc.firm_id in (
        select fm.firm_id from public.firm_memberships fm where fm.user_id = auth.uid()
      )
    )
  );

-- ------------------------------------------------------------
-- 2. engagement_review_visibility
-- ------------------------------------------------------------
create table if not exists public.engagement_review_visibility (
  engagement_id             uuid primary key
                             references public.engagements(id) on delete cascade,
  client_can_view_queue     boolean not null default false,
  client_can_view_evidence  boolean not null default false,
  client_can_view_je_draft  boolean not null default false,
  updated_by                uuid null,
  updated_at                timestamptz not null default now(),
  created_at                timestamptz not null default now()
);

comment on table public.engagement_review_visibility is
  'D6.4d: firm-controlled toggles for whether client users can view review items on an engagement. Default: everything off.';

alter table public.engagement_review_visibility enable row level security;

drop policy if exists "service_role_all_engagement_review_visibility" on public.engagement_review_visibility;
create policy "service_role_all_engagement_review_visibility"
  on public.engagement_review_visibility for all to service_role
  using (true) with check (true);

drop policy if exists "firm_members_manage_engagement_review_visibility" on public.engagement_review_visibility;
create policy "firm_members_manage_engagement_review_visibility"
  on public.engagement_review_visibility for all to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm
        where fm.user_id = auth.uid()
          and fm.role in ('firm_admin','controller','fractional_cfo')
      )
    )
  )
  with check (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm
        where fm.user_id = auth.uid()
          and fm.role in ('firm_admin','controller','fractional_cfo')
      )
    )
  );

drop policy if exists "client_users_read_engagement_review_visibility" on public.engagement_review_visibility;
create policy "client_users_read_engagement_review_visibility"
  on public.engagement_review_visibility for select to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      join public.firm_clients fc on fc.firm_id = e.firm_id
      join public.firm_client_users fcu on fcu.firm_client_id = fc.id
      where fcu.user_id = auth.uid() and fcu.status = 'active'
    )
  );

-- ------------------------------------------------------------
-- 3. pre_close_review_items — reviewer/client RLS policies
-- ------------------------------------------------------------
drop policy if exists "service_role_all_pre_close_review_items" on public.pre_close_review_items;
create policy "service_role_all_pre_close_review_items"
  on public.pre_close_review_items for all to service_role
  using (true) with check (true);

drop policy if exists "firm_reviewers_read_pre_close_review_items" on public.pre_close_review_items;
create policy "firm_reviewers_read_pre_close_review_items"
  on public.pre_close_review_items for select to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm where fm.user_id = auth.uid()
      )
    )
  );

drop policy if exists "firm_writers_update_pre_close_review_items" on public.pre_close_review_items;
create policy "firm_writers_update_pre_close_review_items"
  on public.pre_close_review_items for update to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm
        where fm.user_id = auth.uid()
          and fm.role in ('firm_admin','controller','fractional_cfo')
      )
    )
  )
  with check (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm
        where fm.user_id = auth.uid()
          and fm.role in ('firm_admin','controller','fractional_cfo')
      )
    )
  );

drop policy if exists "client_users_read_pre_close_review_items" on public.pre_close_review_items;
create policy "client_users_read_pre_close_review_items"
  on public.pre_close_review_items for select to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      join public.firm_clients fc on fc.firm_id = e.firm_id
      join public.firm_client_users fcu on fcu.firm_client_id = fc.id
      join public.engagement_review_visibility erv on erv.engagement_id = e.id
      where fcu.user_id = auth.uid()
        and fcu.status = 'active'
        and erv.client_can_view_queue = true
    )
  );

-- ------------------------------------------------------------
-- 4. je_backup_packets — RLS only (table created in D6.4a)
-- ------------------------------------------------------------
alter table public.je_backup_packets enable row level security;

drop policy if exists "service_role_all_je_backup_packets" on public.je_backup_packets;
create policy "service_role_all_je_backup_packets"
  on public.je_backup_packets for all to service_role
  using (true) with check (true);

drop policy if exists "firm_members_read_je_backup_packets" on public.je_backup_packets;
create policy "firm_members_read_je_backup_packets"
  on public.je_backup_packets for select to authenticated
  using (
    firm_client_id in (
      select fc.id from public.firm_clients fc
      where fc.firm_id in (
        select fm.firm_id from public.firm_memberships fm where fm.user_id = auth.uid()
      )
    )
  );

-- ------------------------------------------------------------
-- 5. review_item_packet_exports
-- ------------------------------------------------------------
create table if not exists public.review_item_packet_exports (
  export_id           uuid primary key default gen_random_uuid(),
  review_item_id      uuid not null references public.pre_close_review_items(id) on delete cascade,
  firm_client_id      uuid not null references public.firm_clients(id) on delete cascade,
  engagement_id       uuid not null references public.engagements(id) on delete cascade,
  exported_by_user_id uuid not null,
  storage_path        text null,
  sha256              text not null,
  byte_size           bigint not null,
  exported_at         timestamptz not null default now()
);

create index if not exists review_item_packet_exports_review_item_idx
  on public.review_item_packet_exports(review_item_id, exported_at desc);
create index if not exists review_item_packet_exports_user_idx
  on public.review_item_packet_exports(exported_by_user_id, exported_at desc);

alter table public.review_item_packet_exports enable row level security;

drop policy if exists "service_role_all_review_item_packet_exports" on public.review_item_packet_exports;
create policy "service_role_all_review_item_packet_exports"
  on public.review_item_packet_exports for all to service_role
  using (true) with check (true);

drop policy if exists "firm_members_read_review_item_packet_exports" on public.review_item_packet_exports;
create policy "firm_members_read_review_item_packet_exports"
  on public.review_item_packet_exports for select to authenticated
  using (
    engagement_id in (
      select e.id from public.engagements e
      where e.firm_id in (
        select fm.firm_id from public.firm_memberships fm where fm.user_id = auth.uid()
      )
    )
  );

-- ------------------------------------------------------------
-- 6. Widen ai_action_log + ledger_events category checks
-- ------------------------------------------------------------
alter table public.ai_action_log
  drop constraint if exists ai_action_log_action_category_check;
alter table public.ai_action_log
  add constraint ai_action_log_action_category_check check (
    action_category in (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change'
    )
  );

alter table public.ledger_events
  drop constraint if exists ledger_events_event_category_check;
alter table public.ledger_events
  add constraint ledger_events_event_category_check check (
    event_category in (
      'intake','ledger','cash_app','ar','ap','recon','close','assertion',
      'rule','directive','ai_action','system','entitlement','posting',
      'reviewer_ui'
    )
  );

-- ------------------------------------------------------------
-- 7. Storage bucket: review-item-packets (je-backup exists from D6.4a)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-item-packets',
  'review-item-packets',
  false,
  52428800,
  array['application/pdf']::text[]
)
on conflict (id) do nothing;

commit;
-- <<< end 20260706180000_d6_4d_reviewer_ui_rls_and_visibility.sql

-- >>> begin 20260715190001_mfa_webauthn_rls_initplan_and_deny_policy.sql
-- Gap 1b.1 micro-fix: replace auth.uid() with (SELECT auth.uid()) on 4 policies
-- plus add explicit deny policy on mfa_webauthn_challenges to silence rls_enabled_no_policy INFO lint.
-- Service role bypasses RLS entirely, so the deny policy has no functional effect on server-managed challenges.

-- ================================================
-- 1. user_webauthn_credentials policies
-- ================================================
DROP POLICY IF EXISTS "users_select_own_webauthn" ON public.user_webauthn_credentials;
CREATE POLICY "users_select_own_webauthn"
  ON public.user_webauthn_credentials FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_update_own_webauthn_friendly_name" ON public.user_webauthn_credentials;
CREATE POLICY "users_update_own_webauthn_friendly_name"
  ON public.user_webauthn_credentials FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ================================================
-- 2. mfa_trusted_devices policies
-- ================================================
DROP POLICY IF EXISTS "users_select_own_trusted_devices" ON public.mfa_trusted_devices;
CREATE POLICY "users_select_own_trusted_devices"
  ON public.mfa_trusted_devices FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_revoke_own_trusted_devices" ON public.mfa_trusted_devices;
CREATE POLICY "users_revoke_own_trusted_devices"
  ON public.mfa_trusted_devices FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND revoked_at IS NOT NULL);

-- ================================================
-- 3. mfa_webauthn_challenges: explicit deny-all for authenticated + anon
-- Service role bypasses RLS, so server-managed challenge lifecycle is unaffected.
-- ================================================
DROP POLICY IF EXISTS "deny_all_client_access_challenges" ON public.mfa_webauthn_challenges;
CREATE POLICY "deny_all_client_access_challenges"
  ON public.mfa_webauthn_challenges
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
-- <<< end 20260715190001_mfa_webauthn_rls_initplan_and_deny_policy.sql

-- >>> begin 20260717070000_d65_p2_block6a_harden_next_document_number_search_path.sql
-- Phase D6.5 Part 2 — Block 6a hardening
-- Fix Supabase security advisor WARN: function_search_path_mutable on next_document_number
-- Applied to live Supabase in Block 6a audit pass; this file backfills the repo so
-- migration history matches DB state.

BEGIN;

ALTER FUNCTION public.next_document_number(UUID, TEXT) SET search_path = public, pg_temp;

COMMIT;
-- <<< end 20260717070000_d65_p2_block6a_harden_next_document_number_search_path.sql

-- >>> begin 20260718180000_q8a_qbo_view_security_invoker.sql
-- Phase Q8a: Restore security_invoker on qbo_connections_unified view
-- 
-- Root cause: 20260707214500_d65_p2_block7a2_prepilot_security.sql:93
-- set security_invoker=true in July 2026, but two later CREATE OR REPLACE VIEW
-- migrations (20260708_01_d1_qbo_write_readiness.sql and
-- 20260717130000_tcp1_w3_erp_connections_disconnected_at.sql) recreated the
-- view without preserving the option. Postgres silently reset reloptions
-- to NULL, causing the Supabase advisor to flag security_definer_view (ERROR).
--
-- All callers (lib/close-packet/renderer.js, lib/erp/quickbooks/*, etc.) use
-- getSupabaseAdmin() which bypasses RLS regardless, so no behavior change for
-- the app. Anon/authenticated access continues to be governed by RLS on the
-- underlying accounting_connections table.
--
-- Rollback: ALTER VIEW public.qbo_connections_unified RESET (security_invoker);

DO $$
BEGIN
  IF to_regclass('public.qbo_connections_unified') IS NOT NULL THEN
    ALTER VIEW public.qbo_connections_unified SET (security_invoker = true);
  END IF;
END $$;

-- Assertion: fail loud if option not present
DO $$
DECLARE
  v_opts text[];
BEGIN
  SELECT reloptions INTO v_opts
  FROM pg_class
  WHERE relname = 'qbo_connections_unified'
    AND relnamespace = 'public'::regnamespace;

  IF v_opts IS NULL OR NOT ('security_invoker=true' = ANY(v_opts)) THEN
    RAISE EXCEPTION 'q8a: qbo_connections_unified missing security_invoker=true after migration (got: %)', v_opts;
  END IF;
END $$;

-- Test helper: exposes pg_class.reloptions via a read-only view so vitest
-- integration tests can assert view options without needing a bespoke RPC.
-- Read-only, service-role-only in practice (RLS not applicable to system catalogs).
CREATE OR REPLACE VIEW public.pg_class_reloptions_view
WITH (security_invoker = true)
AS
SELECT
  c.relname,
  c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public';

REVOKE ALL ON public.pg_class_reloptions_view FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pg_class_reloptions_view TO service_role, postgres;
-- <<< end 20260718180000_q8a_qbo_view_security_invoker.sql

-- >>> begin 20260718190000_q8b_function_search_path_lockdown.sql
-- Phase Q8b: Lock down search_path on 29 public functions flagged by advisor
--
-- Root cause: Functions without an explicit search_path use the caller's
-- session search_path. This is a search_path hijacking footgun (especially
-- for SECURITY DEFINER functions) and violates Supabase advisor rule
-- function_search_path_mutable.
--
-- Fix: ALTER FUNCTION ... SET search_path = public, pg_temp on each of the
-- 29 flagged functions. Function bodies are untouched.
--
-- All 29 functions were verified live via SELECT from pg_proc:
--   - 28 SECURITY INVOKER, 1 SECURITY DEFINER (publish_ledger_event)
--   - All plpgsql
--   - All proconfig = null (no existing SET clauses to preserve)
--
-- Rollback: ALTER FUNCTION public.<name>(<args>) RESET search_path;

-- Helper: apply search_path to a function if it exists, no-op if not.
DO $$
DECLARE
  fn record;
  fns text[] := ARRAY[
    'public._intake_touch_updated_at()',
    'public.close_gap_review_items_touch_updated_at()',
    'public.curated_rule_fires_immutable()',
    'public.engagement_addons_set_updated_at()',
    'public.engagement_posting_policy_preset_consistency()',
    'public.entitlement_check_audit_no_mutation()',
    'public.guard_recurring_fire_immutability()',
    'public.ledger_events_notify()',
    'public.ledger_events_prevent_mutation()',
    'public.pre_close_review_items_immutable()',
    'public.pre_close_review_items_je_draft_check()',
    'public.prevent_company_memory_append_only_mutation()',
    'public.prevent_company_memory_record_unsafe_mutation()',
    'public.prevent_company_memory_version_unsafe_mutation()',
    'public.prevent_je_audit_update()',
    'public.prevent_memory_payload_update()',
    'public.prevent_proposal_decision_mutation()',
    'public.prevent_si_snapshot_child_mutation_when_parent_locked()',
    'public.prevent_si_snapshot_metadata_mutation()',
    'public.public_pilot_slot_count(text)',
    'public.publish_ledger_event(text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text)',
    'public.set_pilot_slots_updated_at()',
    'public.set_updated_at()',
    'public.tg_set_updated_at()',
    'public.touch_je_post_attempts()',
    'public.touch_recurring_fires_updated_at()',
    'public.touch_recurring_templates_updated_at()',
    'public.touch_uncategorized_proposals_updated_at()',
    'public.validate_assertions_array(text[])'
  ];
  fn_sig text;
BEGIN
  FOREACH fn_sig IN ARRAY fns LOOP
    IF to_regprocedure(fn_sig) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn_sig);
    ELSE
      RAISE NOTICE 'q8b: function % not found, skipping', fn_sig;
    END IF;
  END LOOP;
END $$;

-- Assertion: every target function that exists must now have search_path in proconfig
DO $$
DECLARE
  missing_count int;
  missing_names text;
BEGIN
  SELECT
    count(*),
    string_agg(p.proname, ', ' ORDER BY p.proname)
  INTO missing_count, missing_names
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      '_intake_touch_updated_at','close_gap_review_items_touch_updated_at',
      'curated_rule_fires_immutable','engagement_addons_set_updated_at',
      'engagement_posting_policy_preset_consistency','entitlement_check_audit_no_mutation',
      'guard_recurring_fire_immutability','ledger_events_notify',
      'ledger_events_prevent_mutation','pre_close_review_items_immutable',
      'pre_close_review_items_je_draft_check','prevent_company_memory_append_only_mutation',
      'prevent_company_memory_record_unsafe_mutation','prevent_company_memory_version_unsafe_mutation',
      'prevent_je_audit_update','prevent_memory_payload_update',
      'prevent_proposal_decision_mutation','prevent_si_snapshot_child_mutation_when_parent_locked',
      'prevent_si_snapshot_metadata_mutation','public_pilot_slot_count',
      'publish_ledger_event','set_pilot_slots_updated_at',
      'set_updated_at','tg_set_updated_at',
      'touch_je_post_attempts','touch_recurring_fires_updated_at',
      'touch_recurring_templates_updated_at','touch_uncategorized_proposals_updated_at',
      'validate_assertions_array'
    )
    AND (
      p.proconfig IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) AS c
        WHERE c LIKE 'search_path=%'
      )
    );

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'q8b: % functions still missing search_path: %', missing_count, missing_names;
  END IF;
END $$;

-- Test helper: exposes pg_proc.proconfig for regression tests, service-role only.
CREATE OR REPLACE VIEW public.pg_proc_config_view
WITH (security_invoker = true)
AS
SELECT
  p.proname AS name,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public';

REVOKE ALL ON public.pg_proc_config_view FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pg_proc_config_view TO service_role, postgres;
-- <<< end 20260718190000_q8b_function_search_path_lockdown.sql

-- >>> begin 20260718200000_q8c_security_definer_rpc_revoke.sql
-- Phase Q8c: Revoke EXECUTE on SECURITY DEFINER RPCs from anon/authenticated/PUBLIC
--
-- Root cause: Supabase creates functions with default EXECUTE grants to
-- anon, authenticated, PUBLIC, postgres, service_role. Safe for
-- SECURITY INVOKER (subject to RLS) but a footgun for SECURITY DEFINER
-- (bypasses RLS by design). Advisor rules:
--   - anon_security_definer_function_executable (WARN)
--   - authenticated_security_definer_function_executable (WARN)
--
-- Fix: REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated on both RPCs.
-- Postgres owner and service_role keep EXECUTE. All application callers use
-- service_role via getSupabaseAdmin() / createServiceClient() — verified via
-- repo grep at commit 29b44f5.
--
-- Callers (verified server-side only):
--   - increment_share_token_access → lib/close-packet/share-tokens.js:62 (getSupabaseAdmin)
--   - publish_ledger_event → lib/events/publisher.ts:204 (createServiceClient)
--
-- Rollback:
--   HISTORICAL_EXECUTE_GRANT_REMOVED ON FUNCTION public.increment_share_token_access(uuid) TO anon, authenticated;
--   HISTORICAL_EXECUTE_GRANT_REMOVED ON FUNCTION public.publish_ledger_event(text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text) TO anon, authenticated;

-- Revoke on increment_share_token_access
REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM authenticated;

-- Revoke on publish_ledger_event
REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) FROM anon;
REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) FROM authenticated;

-- Assertion: no anon or authenticated EXECUTE grants remain on either function
DO $$
DECLARE
  bad_count int;
  bad_detail text;
BEGIN
  SELECT count(*), string_agg(format('%s -> %s', p.proname, r.rolname), ', ')
  INTO bad_count, bad_detail
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace,
    aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  JOIN pg_roles r ON r.oid = a.grantee
  WHERE n.nspname = 'public'
    AND p.proname IN ('increment_share_token_access', 'publish_ledger_event')
    AND r.rolname IN ('anon', 'authenticated')
    AND a.privilege_type = 'EXECUTE';

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'q8c: % anon/authenticated EXECUTE grants remain: %', bad_count, bad_detail;
  END IF;
END $$;

-- Test helper view: exposes function ACLs for regression tests, service-role only
CREATE OR REPLACE VIEW public.pg_proc_acl_view
WITH (security_invoker = true)
AS
SELECT
  p.proname AS name,
  pg_get_function_identity_arguments(p.oid) AS args,
  r.rolname AS grantee,
  a.privilege_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace,
  aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
JOIN pg_roles r ON r.oid = a.grantee
WHERE n.nspname = 'public';

REVOKE ALL ON public.pg_proc_acl_view FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pg_proc_acl_view TO service_role, postgres;
-- <<< end 20260718200000_q8c_security_definer_rpc_revoke.sql

-- >>> begin 20260718210000_q8d_vector_schema_move.sql
-- Phase Q8d D1: Move vector extension from public → extensions schema
--
-- Root cause: Extensions in `public` are a footgun. They add many
-- functions/operators/types to a schema on every role's default search_path,
-- creating shadowing risk and privilege bleed. Supabase's standard is a
-- dedicated `extensions` schema (already present, already on default
-- search_path for postgres/authenticator/service_role).
--
-- Advisor rule: extension_in_public (WARN) on vector 0.8.0.
--
-- Live-verified state at authoring:
--   - Extension: vector 0.8.0 in public
--   - `extensions` schema exists (no CREATE SCHEMA needed)
--   - 1 vector column: public.vector_index.embedding VECTOR(1536)
--   - 0 rows in vector_index
--   - 0 ivfflat/hnsw indexes
--
-- Type OIDs are stable across ALTER EXTENSION SET SCHEMA, so
-- vector_index.embedding continues to work without table rewrite.
--
-- Rollback: ALTER EXTENSION vector SET SCHEMA public;

ALTER EXTENSION vector SET SCHEMA extensions;

-- Assertion: extension is now in the extensions schema
DO $$
DECLARE
  ext_schema text;
BEGIN
  SELECT n.nspname INTO ext_schema
  FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'vector';
  IF ext_schema <> 'extensions' THEN
    RAISE EXCEPTION 'q8d D1: vector extension in schema % (expected extensions)', ext_schema;
  END IF;
END $$;

-- Sanity: dependent column still queryable post-move
DO $$
BEGIN
  PERFORM 1 FROM public.vector_index LIMIT 1;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'q8d D1: vector_index unreadable post-move: %', SQLERRM;
END $$;
-- <<< end 20260718210000_q8d_vector_schema_move.sql

-- >>> begin 20260718220000_q8e_rls_service_role_policies.sql
-- Q8e: Lock down 5 service-role-only tables.
-- All runtime access is via getSupabaseAdmin/createServiceClient which bypasses RLS.
-- 1. Revoke raw grants from anon+authenticated so no client-facing surface exists.
-- 2. Add explicit service_role_all_* policy for defense-in-depth and to satisfy
--    the rls_enabled_no_policy linter.

-- je_line_attachments
REVOKE ALL ON public.je_line_attachments FROM anon, authenticated;
DROP POLICY IF EXISTS "je_line_attachments_service_role_all" ON public.je_line_attachments;
CREATE POLICY "je_line_attachments_service_role_all"
  ON public.je_line_attachments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- je_line_evidence
REVOKE ALL ON public.je_line_evidence FROM anon, authenticated;
DROP POLICY IF EXISTS "je_line_evidence_service_role_all" ON public.je_line_evidence;
CREATE POLICY "je_line_evidence_service_role_all"
  ON public.je_line_evidence
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- je_post_attempts
REVOKE ALL ON public.je_post_attempts FROM anon, authenticated;
DROP POLICY IF EXISTS "je_post_attempts_service_role_all" ON public.je_post_attempts;
CREATE POLICY "je_post_attempts_service_role_all"
  ON public.je_post_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- je_posting_audit
REVOKE ALL ON public.je_posting_audit FROM anon, authenticated;
DROP POLICY IF EXISTS "je_posting_audit_service_role_all" ON public.je_posting_audit;
CREATE POLICY "je_posting_audit_service_role_all"
  ON public.je_posting_audit
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- stripe_webhook_events_legacy
REVOKE ALL ON public.stripe_webhook_events_legacy FROM anon, authenticated;
DROP POLICY IF EXISTS "stripe_webhook_events_legacy_service_role_all" ON public.stripe_webhook_events_legacy;
CREATE POLICY "stripe_webhook_events_legacy_service_role_all"
  ON public.stripe_webhook_events_legacy
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Post-migration assertion: every table has exactly one service_role_all policy.
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(t, ', ') INTO missing
  FROM (
    SELECT unnest(ARRAY[
      'je_line_attachments',
      'je_line_evidence',
      'je_post_attempts',
      'je_posting_audit',
      'stripe_webhook_events_legacy'
    ]) AS t
  ) tables
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = tables.t
      AND policyname = tables.t || '_service_role_all'
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'q8e: missing service_role_all policy on: %', missing;
  END IF;
END $$;

-- Post-migration assertion: no anon/authenticated grants linger on the 5 tables.
DO $$
DECLARE
  leaked text;
BEGIN
  SELECT string_agg(table_name || '/' || grantee || '/' || privilege_type, ', ') INTO leaked
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name IN (
      'je_line_attachments', 'je_line_evidence',
      'je_post_attempts', 'je_posting_audit',
      'stripe_webhook_events_legacy'
    )
    AND grantee IN ('anon', 'authenticated');
  IF leaked IS NOT NULL THEN
    RAISE EXCEPTION 'q8e: anon/authenticated still have grants on: %', leaked;
  END IF;
END $$;
-- <<< end 20260718220000_q8e_rls_service_role_policies.sql

-- >>> begin 20260720130000_ar_week3_block3_1_rpc_lockdown.sql
-- Week 3 Block 3.1 — Lock down increment_pbc_request_count RPC
-- ADDITIVE ONLY. Corrective patch for security lints 0028 and 0029.
--
-- Root cause: PostgreSQL default schema grants re-expose EXECUTE on new
-- functions to `anon` and `authenticated` via Supabase's authenticator role,
-- even after `REVOKE ALL ... FROM public`. Explicit per-role revoke required.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.increment_pbc_request_count(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_pbc_request_count(uuid, integer) FROM authenticated;

-- Re-affirm service_role has EXECUTE (idempotent).
GRANT EXECUTE ON FUNCTION public.increment_pbc_request_count(uuid, integer) TO service_role;

COMMIT;
-- <<< end 20260720130000_ar_week3_block3_1_rpc_lockdown.sql

-- >>> begin 20260720140000_ar_week3_block3_3_rls_recursion_fix.sql
-- AR Week 3 Block 3.3 — fix infinite RLS recursion on company_users
-- ADDITIVE ONLY. Introduces SECURITY DEFINER helpers, rewrites recursive policy,
-- rewires audit_ready_* policies through the helpers.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) SECURITY DEFINER helpers — read company_users bypassing RLS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_company_member(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.company_id = _company_id
      AND cu.user_id    = (SELECT auth.uid())
      AND cu.status     = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_active_company_role(
  _company_id uuid,
  _roles      text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.company_id = _company_id
      AND cu.user_id    = (SELECT auth.uid())
      AND cu.status     = 'active'
      AND cu.role       = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_active_company_role(_company_id, ARRAY['company_admin']::text[]);
$$;

-- Firm-side symmetry (no recursion today, but keeps engagement policy uniform).
CREATE OR REPLACE FUNCTION public.is_active_firm_member(_firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.firm_memberships fm
    WHERE fm.firm_id = _firm_id
      AND fm.user_id = (SELECT auth.uid())
      AND fm.status  = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_active_firm_role(
  _firm_id uuid,
  _roles   text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.firm_memberships fm
    WHERE fm.firm_id = _firm_id
      AND fm.user_id = (SELECT auth.uid())
      AND fm.status  = 'active'
      AND fm.role    = ANY(_roles)
  );
$$;

-- Only authenticated users invoke these; lock down default privileges.
REVOKE ALL ON FUNCTION public.is_active_company_member(uuid)      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_company_role(uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_company_admin(uuid)              FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_firm_member(uuid)         FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_firm_role(uuid, text[])  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_active_company_member(uuid)      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_active_company_role(uuid, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid)              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_firm_member(uuid)         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_active_firm_role(uuid, text[])  TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2) Fix the recursive policy on company_users
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "company admins can manage company users" ON public.company_users;
CREATE POLICY "company admins can manage company users"
  ON public.company_users
  FOR ALL
  TO public
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_company_admin(company_users.company_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_company_admin(company_users.company_id)
  );

-- ----------------------------------------------------------------------------
-- 3) Rewire audit_ready_engagements policies through the helpers
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS audit_ready_engagements_company_read ON public.audit_ready_engagements;
CREATE POLICY audit_ready_engagements_company_read
  ON public.audit_ready_engagements
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL
    AND public.is_active_company_member(company_id)
  );

DROP POLICY IF EXISTS audit_ready_engagements_firm_read ON public.audit_ready_engagements;
CREATE POLICY audit_ready_engagements_firm_read
  ON public.audit_ready_engagements
  FOR SELECT
  TO authenticated
  USING (
    firm_id IS NOT NULL
    AND public.is_active_firm_member(firm_id)
  );

DROP POLICY IF EXISTS audit_ready_engagements_write ON public.audit_ready_engagements;
CREATE POLICY audit_ready_engagements_write
  ON public.audit_ready_engagements
  FOR ALL
  TO authenticated
  USING (
    (
      company_id IS NOT NULL
      AND public.has_active_company_role(
        company_id,
        ARRAY['company_admin','owner_executive','controller']::text[]
      )
    )
    OR
    (
      firm_id IS NOT NULL
      AND public.has_active_firm_role(
        firm_id,
        ARRAY['firm_admin','controller','fractional_cfo']::text[]
      )
    )
  )
  WITH CHECK (
    (
      company_id IS NOT NULL
      AND public.has_active_company_role(
        company_id,
        ARRAY['company_admin','owner_executive','controller']::text[]
      )
    )
    OR
    (
      firm_id IS NOT NULL
      AND public.has_active_firm_role(
        firm_id,
        ARRAY['firm_admin','controller','fractional_cfo']::text[]
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 4) Rewire audit_ready_pbc_requests policy
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS audit_ready_pbc_requests_all ON public.audit_ready_pbc_requests;
CREATE POLICY audit_ready_pbc_requests_all
  ON public.audit_ready_pbc_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_pbc_requests.engagement_id
        AND (
          (e.company_id IS NOT NULL AND public.is_active_company_member(e.company_id))
          OR
          (e.firm_id    IS NOT NULL AND public.is_active_firm_member(e.firm_id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_pbc_requests.engagement_id
        AND (
          (e.company_id IS NOT NULL AND public.is_active_company_member(e.company_id))
          OR
          (e.firm_id    IS NOT NULL AND public.is_active_firm_member(e.firm_id))
        )
    )
  );

-- ----------------------------------------------------------------------------
-- 5) Rewire audit_ready_auditor_portal_users owner policy
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS audit_ready_portal_owner_all ON public.audit_ready_auditor_portal_users;
CREATE POLICY audit_ready_portal_owner_all
  ON public.audit_ready_auditor_portal_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_auditor_portal_users.engagement_id
        AND (
          (
            e.company_id IS NOT NULL
            AND public.has_active_company_role(
              e.company_id,
              ARRAY['company_admin','owner_executive','controller']::text[]
            )
          )
          OR
          (
            e.firm_id IS NOT NULL
            AND public.has_active_firm_role(
              e.firm_id,
              ARRAY['firm_admin','controller','fractional_cfo']::text[]
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_auditor_portal_users.engagement_id
        AND (
          (
            e.company_id IS NOT NULL
            AND public.has_active_company_role(
              e.company_id,
              ARRAY['company_admin','owner_executive','controller']::text[]
            )
          )
          OR
          (
            e.firm_id IS NOT NULL
            AND public.has_active_firm_role(
              e.firm_id,
              ARRAY['firm_admin','controller','fractional_cfo']::text[]
            )
          )
        )
    )
  );

-- The audit_ready_portal_self policy is fine as-is (auth.uid() equality only).

COMMIT;
-- <<< end 20260720140000_ar_week3_block3_3_rls_recursion_fix.sql

-- >>> begin 20260720160000_ar_tieout1_policy_and_kind.sql
-- PBC-TIEOUT-1: tolerance policy per engagement + tie_out_kind classifier column.
-- ADDITIVE ONLY. No drops, no reorders. Idempotent.
BEGIN;
-- ─────────────────────────────────────────────────────────────
-- 1) audit_ready_tie_out_policies
-- One row per engagement. Set lazily when the customer initiates tie-out.
-- Aggressive default = tight $ and % tolerances. Customer can edit at any time.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_ready_tie_out_policies (
  engagement_id            uuid PRIMARY KEY REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  -- Tolerance mode: aggressive default, customer-configurable
  policy_mode              text NOT NULL DEFAULT 'aggressive'
                           CHECK (policy_mode IN ('aggressive','standard','conservative','custom')),
  -- Auto-reconcile threshold: variances at or below these tolerances auto-clear.
  -- BOTH dollar and percent are evaluated; whichever is TIGHTER wins.
  -- Setting either to NULL means "unbounded" for that dimension.
  auto_reconcile_max_dollar  numeric(18,2) NOT NULL DEFAULT 5.00,
  auto_reconcile_max_percent numeric(6,4)  NOT NULL DEFAULT 0.0010,   -- 0.10%
  -- Kickout threshold: variances above these tolerances go to the kickout inbox.
  -- Between auto and kickout = "review" bucket.
  kickout_min_dollar         numeric(18,2) NOT NULL DEFAULT 250.00,
  kickout_min_percent        numeric(6,4)  NOT NULL DEFAULT 0.0500,   -- 5.00%
  -- Which comparison is authoritative: dollar-only, percent-only, or the tighter of both
  authoritative_comparison   text NOT NULL DEFAULT 'tighter_of_both'
                             CHECK (authoritative_comparison IN ('dollar_only','percent_only','tighter_of_both')),
  -- Provenance
  set_by_user_id           uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  set_at                   timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id       uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at               timestamptz NOT NULL DEFAULT now(),
  -- Guard rails
  CONSTRAINT tolerance_dollar_non_negative CHECK (
    auto_reconcile_max_dollar >= 0
    AND kickout_min_dollar >= 0
    AND kickout_min_dollar >= auto_reconcile_max_dollar
  ),
  CONSTRAINT tolerance_percent_bounded CHECK (
    auto_reconcile_max_percent >= 0 AND auto_reconcile_max_percent < 1
    AND kickout_min_percent >= 0 AND kickout_min_percent < 1
    AND kickout_min_percent >= auto_reconcile_max_percent
  )
);
CREATE INDEX IF NOT EXISTS idx_ar_tieout_policies_updated
  ON public.audit_ready_tie_out_policies(updated_at DESC);
ALTER TABLE public.audit_ready_tie_out_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_tieout_policies_service_role_all ON public.audit_ready_tie_out_policies;
CREATE POLICY ar_tieout_policies_service_role_all
  ON public.audit_ready_tie_out_policies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- Read: any user who can see the parent engagement can see its policy
DROP POLICY IF EXISTS ar_tieout_policies_engagement_read ON public.audit_ready_tie_out_policies;
CREATE POLICY ar_tieout_policies_engagement_read ON public.audit_ready_tie_out_policies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_tie_out_policies.engagement_id
        AND (
          -- company-scoped engagement
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          -- firm-scoped engagement
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );
-- ─────────────────────────────────────────────────────────────
-- 2) audit_ready_pbc_requests.tie_out_kind
-- Additive column. Nullable until classified.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS tie_out_kind text NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_ready_pbc_requests_tie_out_kind_check'
      AND conrelid = 'public.audit_ready_pbc_requests'::regclass
  ) THEN
    ALTER TABLE public.audit_ready_pbc_requests
      ADD CONSTRAINT audit_ready_pbc_requests_tie_out_kind_check
      CHECK (
        tie_out_kind IS NULL
        OR tie_out_kind IN (
          'ar_aging',
          'ap_aging',
          'inventory',
          'grni',
          'bank_recon',
          'fixed_assets',
          'cash_recon',
          'debt_schedule',
          'equity_rollforward',
          'revenue_cutoff',
          'expense_cutoff',
          'unclassified'
        )
      );
  END IF;
END$$;
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS tie_out_kind_confidence numeric(4,3) NULL;
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS tie_out_kind_classified_at timestamptz NULL;
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS tie_out_kind_classifier text NULL;
  -- 'deterministic' | 'bedrock_sonnet' | 'manual'
CREATE INDEX IF NOT EXISTS idx_ar_pbc_tie_out_kind
  ON public.audit_ready_pbc_requests(engagement_id, tie_out_kind);
-- ─────────────────────────────────────────────────────────────
-- 3) audit_ready_tie_out_summary (VIEW)
-- Read-only view aggregating tie-out state per PBC request for the summary page.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.audit_ready_tie_out_summary AS
SELECT
  r.id                     AS pbc_request_id,
  r.engagement_id,
  r.request_number,
  r.request_description,
  r.assertion_tags,
  r.tie_out_kind,
  r.tie_out_kind_confidence,
  r.tie_out_kind_classifier,
  r.tie_out_kind_classified_at,
  r.status                 AS pbc_status,
  CASE
    WHEN p.engagement_id IS NULL           THEN 'no_tolerance_policy'
    WHEN r.tie_out_kind IS NULL            THEN 'not_yet_classified'
    WHEN r.tie_out_kind = 'unclassified'   THEN 'requires_manual_review'
    ELSE 'classified'
  END                      AS tie_out_state,
  p.policy_mode,
  p.auto_reconcile_max_dollar,
  p.auto_reconcile_max_percent,
  p.kickout_min_dollar,
  p.kickout_min_percent,
  p.authoritative_comparison
FROM public.audit_ready_pbc_requests r
LEFT JOIN public.audit_ready_tie_out_policies p ON p.engagement_id = r.engagement_id;
COMMENT ON VIEW public.audit_ready_tie_out_summary IS
  'PBC-TIEOUT-1 read-only summary of tie-out state per PBC request. Read via RLS on parent tables.';
-- Views inherit RLS from their base tables when created with default security_invoker.
-- Explicitly ensure invoker semantics (matches Phase Q8a pattern).
ALTER VIEW public.audit_ready_tie_out_summary SET (security_invoker = true);

-- PBC-TIEOUT-1 adaptation: allow tie_out_kind_classify on audit_ready_llm_usage.operation
-- (paste classifier logs this op; week-3 CHECK did not include it).
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'audit_ready_llm_usage'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%operation%';
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.audit_ready_llm_usage DROP CONSTRAINT %I', conname);
  END IF;
END$$;
ALTER TABLE public.audit_ready_llm_usage
  ADD CONSTRAINT audit_ready_llm_usage_operation_check
  CHECK (operation IN (
    'pbc_parse','assertion_classify','pii_redaction_ner',
    'response_draft','evidence_bundle_summary','tieout_explain',
    'tie_out_kind_classify'
  ));

COMMIT;
-- <<< end 20260720160000_ar_tieout1_policy_and_kind.sql

-- >>> begin 20260804214151_pilot_lifecycle_events_hash_extensions_search_path.sql
-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260804214151
-- NAME: pilot_lifecycle_events_hash_extensions_search_path
-- DATABASE_MD5_UTF8: 7a5489dd8dd316cf26eb02a413339f71
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 4004
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_slot_company_id uuid;
  v_slot_firm_id uuid;
  v_prev_hash text;
  v_canonical text;
BEGIN
  SELECT company_id, firm_id
    INTO v_slot_company_id, v_slot_firm_id
  FROM public.pilot_slots
  WHERE id = NEW.pilot_slot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: pilot_slot_id % does not exist',
      NEW.pilot_slot_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  NEW.company_id := v_slot_company_id;
  NEW.firm_id := v_slot_firm_id;

  IF NEW.prev_hash IS NOT NULL OR NEW.row_hash IS NOT NULL THEN
    RAISE EXCEPTION 'pilot_lifecycle_events: prev_hash and row_hash are trigger-managed; application code must not set them'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.company_id IS NOT NULL THEN
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE company_id = NEW.company_id
    ORDER BY event_at DESC, id DESC
    LIMIT 1;
  ELSE
    SELECT row_hash INTO v_prev_hash
    FROM public.pilot_lifecycle_events
    WHERE firm_id = NEW.firm_id
    ORDER BY event_at DESC, id DESC
    LIMIT 1;
  END IF;

  NEW.prev_hash := v_prev_hash;

  v_canonical := public.pilot_lifecycle_events_canonical_payload(
    NEW.event_kind,
    NEW.event_at,
    NEW.schema_version,
    NEW.pilot_slot_id,
    NEW.from_status,
    NEW.to_status,
    NEW.classification_hint,
    NEW.company_id,
    NEW.firm_id,
    NEW.actor_kind,
    NEW.actor_user_id,
    NEW.actor_via,
    NEW.assertions_covered,
    NEW.evidence_refs,
    NEW.reason_code,
    NEW.reason_text,
    NEW.payload
  );

  NEW.row_hash := 'sha256:' || encode(
    digest(convert_to(coalesce(NEW.prev_hash, '') || v_canonical, 'UTF8'), 'sha256'::text),
    'hex'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.pilot_lifecycle_events_verify_chain(
  p_company_id uuid DEFAULT NULL,
  p_firm_id uuid DEFAULT NULL
) RETURNS TABLE (
  first_broken_event_id uuid,
  first_broken_event_at timestamptz,
  expected_prev_hash text,
  actual_prev_hash text,
  expected_row_hash text,
  actual_row_hash text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_row record;
  v_expected_prev text := NULL;
  v_recomputed_hash text;
  v_canonical text;
BEGIN
  IF (p_company_id IS NULL AND p_firm_id IS NULL) OR
     (p_company_id IS NOT NULL AND p_firm_id IS NOT NULL) THEN
    RAISE EXCEPTION 'pilot_lifecycle_events_verify_chain: pass exactly one of p_company_id or p_firm_id';
  END IF;

  FOR v_row IN
    SELECT * FROM public.pilot_lifecycle_events
    WHERE (p_company_id IS NOT NULL AND company_id = p_company_id)
       OR (p_firm_id IS NOT NULL AND firm_id = p_firm_id)
    ORDER BY event_at ASC, id ASC
  LOOP
    v_canonical := public.pilot_lifecycle_events_canonical_payload(
      v_row.event_kind, v_row.event_at, v_row.schema_version,
      v_row.pilot_slot_id, v_row.from_status, v_row.to_status,
      v_row.classification_hint, v_row.company_id, v_row.firm_id,
      v_row.actor_kind, v_row.actor_user_id, v_row.actor_via,
      v_row.assertions_covered, v_row.evidence_refs,
      v_row.reason_code, v_row.reason_text, v_row.payload
    );

    v_recomputed_hash := 'sha256:' || encode(
      digest(convert_to(coalesce(v_expected_prev, '') || v_canonical, 'UTF8'), 'sha256'::text),
      'hex'
    );

    IF v_row.prev_hash IS DISTINCT FROM v_expected_prev
       OR v_row.row_hash IS DISTINCT FROM v_recomputed_hash THEN
      first_broken_event_id := v_row.id;
      first_broken_event_at := v_row.event_at;
      expected_prev_hash := v_expected_prev;
      actual_prev_hash := v_row.prev_hash;
      expected_row_hash := v_recomputed_hash;
      actual_row_hash := v_row.row_hash;
      RETURN NEXT;
      RETURN;
    END IF;

    v_expected_prev := v_row.row_hash;
  END LOOP;

  RETURN;
END;
$$;
-- <<< end 20260804214151_pilot_lifecycle_events_hash_extensions_search_path.sql

-- >>> begin 20260805041500_major_1_rpc_lockdown.sql
-- =============================================================================
-- Phase MAJOR #1 — Full-Sweep SECURITY DEFINER RPC + search_path Lockdown
--
-- Purpose: Drive Supabase Security Advisor findings for these 11 functions to
-- zero, without breaking RLS policies, triggers, or the RFC 3161 anchor cron.
--
-- Sources:
--   - PostgreSQL 18 CREATE FUNCTION (SECURITY DEFINER, search_path safety):
--     https://www.postgresql.org/docs/current/sql-createfunction.html
--   - Supabase Database Functions (SECURITY DEFINER + search_path = ''):
--     https://supabase.com/docs/guides/database/functions
--   - Supabase splinter rule 0011 (function_search_path_mutable):
--     https://supabase.github.io/splinter/0011_function_search_path_mutable/
--   - supabase/agent-skills (first-party pattern: revoke EXECUTE from every
--     role on RLS helpers, policy still works):
--     https://github.com/supabase/agent-skills/blob/main/skills/supabase-postgres-best-practices/references/security-rls-performance.md
--   - DBA StackExchange (trigger EXECUTE checked only at CREATE TRIGGER time):
--     https://dba.stackexchange.com/questions/46833/what-are-the-privileges-required-to-execute-a-trigger-function-in-postgresql
--
-- Ground truth verified via pg_proc + information_schema.triggers on
-- jzmdgwwiestcmmeuhhkr (Aug 5 2026 12:00 EDT).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Group A — Trigger-only function on auth.users (handle_new_auth_user)
-- Bound to trigger on_auth_user_created AFTER INSERT on auth.users.
-- Never called via /rest/v1/rpc/... — safe to revoke from all app roles.
-- search_path already pinned to 'public, pg_temp' — leaving as-is (Supabase's
-- User Management guide uses this exact form).
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user()
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Group B — RLS helper functions (5 functions, all SECURITY DEFINER SQL)
-- Called from within RLS policy expressions (USING/CHECK clauses).
-- Revoking EXECUTE from anon/authenticated does NOT break the policies
-- (confirmed by supabase/agent-skills first-party example, which revokes
-- from every role including service_role — policy still works).
-- search_path already pinned to 'public' — leaving as-is (function bodies
-- reference public.company_users / public.firm_users unqualified, so tightening
-- to '' would require re-defining the bodies — deferred).
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.has_active_company_role(uuid, text[])
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_active_firm_role(uuid, text[])
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_active_company_member(uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_active_firm_member(uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_company_admin(uuid)
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Group C — Trigger-only function on public.pilot_lifecycle_events
-- (pilot_lifecycle_events_before_insert)
-- Bound to trigger pilot_lifecycle_events_before_insert_trg BEFORE INSERT.
-- Never called via /rest/v1/rpc/... — safe to revoke from all app roles.
-- search_path already pinned to 'public, extensions, pg_temp' — leaving as-is.
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_before_insert()
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Group D — Ops function used by app for read-only chain verification
-- (pilot_lifecycle_events_verify_chain)
-- Prod grants already at postgres + service_role only (verified via aclexplode
-- on Aug 5 12:00 EDT — anon/authenticated already absent). No-op REVOKE below
-- kept for idempotency and documentation; safe to run repeatedly.
-- search_path already pinned to 'public, extensions, pg_temp' — leaving as-is.
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_verify_chain(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Group E — Mutable-search_path functions (2 functions)
-- Both are IMMUTABLE / plpgsql helpers referenced only from within triggers.
-- Bodies were read via pg_get_functiondef and contain ONLY pg_catalog
-- built-ins (jsonb_build_object, to_char, to_jsonb, unnest, RAISE EXCEPTION) —
-- no references to public.* objects. Empty search_path is safe.
-- Also revoke EXECUTE — no app code calls either directly.
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.pilot_lifecycle_events_canonical_payload(
  text, timestamp with time zone, text, uuid, text, text, text, uuid, uuid,
  text, uuid, text, text[], jsonb, text, text, jsonb
) SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_canonical_payload(
  text, timestamp with time zone, text, uuid, text, text, text, uuid, uuid,
  text, uuid, text, text[], jsonb, text, text, jsonb
) FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.pilot_lifecycle_events_reject_mutations()
  SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.pilot_lifecycle_events_reject_mutations()
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Group F — Cron/API-invoked function (sp_write_anchor_batch)
-- Called by block9_shipped/anchor-batcher.ts via getSupabaseAdmin() (service
-- role). Must remain callable by service_role; must not be callable by
-- anon/authenticated. search_path already pinned to 'public, pg_temp'.
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(
  bigint, bigint, integer, text, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.sp_write_anchor_batch(
  bigint, bigint, integer, text, jsonb, jsonb
) TO service_role;

COMMIT;

-- =============================================================================
-- Post-migration verification queries (run in the Supabase SQL editor after
-- this migration is applied; expect the results described in each header).
--
-- These are NOT part of the migration transaction — they're for the smoke.
-- =============================================================================

-- Verification 1 — Expect zero rows: no public function should have a
-- NULL/missing search_path setting after this migration.
--
-- (Splinter rule 0011 equivalent — this is the exact query shape splinter
-- itself uses. Source:
-- https://supabase.github.io/splinter/0011_function_search_path_mutable/)
--
-- select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid),
--        p.prosecdef, p.proconfig
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in (
--     'pilot_lifecycle_events_canonical_payload',
--     'pilot_lifecycle_events_reject_mutations'
--   )
--   and not exists (
--     select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) as cfg
--     where cfg like 'search_path=%'
--   );

-- Verification 2 — Expect NO rows for anon/authenticated on any of the
-- 11 functions, EXCEPT the postgres owner grant. service_role should appear
-- for sp_write_anchor_batch and pilot_lifecycle_events_verify_chain only.
--
-- select p.proname, pg_get_function_identity_arguments(p.oid) AS args,
--        r.rolname AS grantee, a.privilege_type
-- from pg_proc p join pg_namespace n on n.oid=p.pronamespace,
--      lateral aclexplode(p.proacl) a
--      join pg_roles r on r.oid = a.grantee
-- where n.nspname='public'
--   and p.proname in (
--     'handle_new_auth_user','has_active_company_role','has_active_firm_role',
--     'is_active_company_member','is_active_firm_member','is_company_admin',
--     'pilot_lifecycle_events_before_insert','pilot_lifecycle_events_verify_chain',
--     'pilot_lifecycle_events_canonical_payload','pilot_lifecycle_events_reject_mutations',
--     'sp_write_anchor_batch'
--   )
-- order by p.proname, r.rolname;
-- <<< end 20260805041500_major_1_rpc_lockdown.sql

-- >>> begin ESC_REMEDIATION_MODULE_BOUNDARY_SECURITY
-- Same-module RLS + least-privilege closure for tables/functions first visible here.
-- Legitimate gap2_purge_table_registry caller: lib/gap2/purge-executor.ts (service_role).
-- Legitimate increment_share_token_access caller: lib/close-packet/share-tokens.js (admin/service).
-- Legitimate publish_ledger_event caller: lib/events/publisher.ts (service_role).
-- Anonymous browser execute is NOT required for either RPC.

ALTER TABLE IF EXISTS public.gap2_purge_table_registry ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gap2_purge_table_registry FROM PUBLIC;
REVOKE ALL ON TABLE public.gap2_purge_table_registry FROM anon;
REVOKE ALL ON TABLE public.gap2_purge_table_registry FROM authenticated;
DROP POLICY IF EXISTS gap2_purge_table_registry_service_role ON public.gap2_purge_table_registry;
CREATE POLICY gap2_purge_table_registry_service_role
  ON public.gap2_purge_table_registry
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.engagement_posting_policy ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.engagement_posting_policy FROM PUBLIC;
REVOKE ALL ON TABLE public.engagement_posting_policy FROM anon;
REVOKE ALL ON TABLE public.engagement_posting_policy FROM authenticated;
DROP POLICY IF EXISTS engagement_posting_policy_service_role ON public.engagement_posting_policy;
CREATE POLICY engagement_posting_policy_service_role
  ON public.engagement_posting_policy
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- curated_rule_fires: ENABLE already present via d6_0_1 in this module; assert again.
ALTER TABLE IF EXISTS public.curated_rule_fires ENABLE ROW LEVEL SECURITY;

REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) FROM anon;
REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) FROM authenticated;

DO $esc_priv_assert$
DECLARE
  bad_count int;
  bad_detail text;
BEGIN
  SELECT count(*), string_agg(format('%s -> %s', p.proname, r.rolname), ', ')
  INTO bad_count, bad_detail
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace,
    aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  JOIN pg_roles r ON r.oid = a.grantee
  WHERE n.nspname = 'public'
    AND p.proname IN ('increment_share_token_access', 'publish_ledger_event')
    AND r.rolname IN ('anon', 'authenticated')
    AND a.privilege_type = 'EXECUTE';

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'ESC privilege assert: % anon/authenticated EXECUTE grants remain: %', bad_count, bad_detail;
  END IF;
END
$esc_priv_assert$;
-- <<< end ESC_REMEDIATION_MODULE_BOUNDARY_SECURITY
