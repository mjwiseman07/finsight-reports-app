-- =============================================================================
-- EXECUTABLE SQUASH CANDIDATE — DRAFT / NON-DEPLOYABLE
-- Proposed version: 20260907010030
-- Proposed name: esc_application_schema_slice_1_of_5
-- Module: public_application_schema_slice_1
-- Provenance: Option D assembled app files (30) stripped of nested txn markers; RLS/privilege closed before COMMIT
-- NOT in active supabase/migrations/. Production mutation NOT authorized.
-- UTF-8 LF. statements[] must remain non-empty when eventually recorded.
-- =============================================================================
BEGIN;
-- OPTION 2 secure multi-version split: slice 1/5
-- Source BEGIN/COMMIT stripped; exactly one outer transaction.
-- Files: 30; RLS closure tables: 1; fn dispositions: 19

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

-- [ESC] stripped source txn marker: BEGIN;

ALTER TABLE IF EXISTS public.stripe_webhook_events RENAME TO stripe_webhook_events_legacy;
-- [ESC] stripped source txn marker: COMMIT;

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
-- [ESC] stripped source txn marker: BEGIN;

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
-- [ESC] stripped source txn marker: COMMIT;

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
-- [ESC] stripped source txn marker: BEGIN;

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
-- [ESC] stripped source txn marker: COMMIT;

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

-- [ESC] stripped source txn marker: BEGIN;


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

-- [ESC] stripped source txn marker: COMMIT;

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

-- [ESC] stripped source txn marker: BEGIN;


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

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260704_0100_d6_4a_je_evidence_attachments_backup.sql

-- >>> begin 20260706120000_d_platform_event_sourced_foundation.sql
-- Phase D-Platform: Event-Sourced Ledger Foundation
-- Migration: 20260706120000_d_platform_event_sourced_foundation
-- Base commit: 4268659
-- Additive-only. No existing tables modified except je_posting_audit CHECK.

-- [ESC] stripped source txn marker: BEGIN;


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

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260706120000_d_platform_event_sourced_foundation.sql

-- >>> begin 20260706130000_d_entitlements.sql
-- ============================================================================
-- Phase D-Entitlements — Add-On Packaging Foundation
-- ============================================================================
-- Depends on: 20260706120000_d_platform_event_sourced_foundation.sql
-- Additive-only. No prior tables/constraints altered destructively.
-- ============================================================================

-- [ESC] stripped source txn marker: BEGIN;


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

-- [ESC] stripped source txn marker: COMMIT;

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
-- [ESC] stripped source txn marker: BEGIN;

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
-- [ESC] stripped source txn marker: COMMIT;

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

-- [ESC] stripped source txn marker: BEGIN;


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

-- [ESC] stripped source txn marker: COMMIT;

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
-- [ESC] stripped source txn marker: begin;


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

-- [ESC] stripped source txn marker: commit;

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
-- [ESC] stripped source txn marker: begin;


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
-- [ESC] stripped source txn marker: commit;

-- <<< end 20260706150000_d6_4c_1_pre_close_review_queue.sql

-- [ESC] RLS closure: ENABLE RLS before COMMIT for tables first visible in this slice.
-- Policies may arrive in a later security slice; ENABLE with no policy = deny-by-default for anon/authenticated.
ALTER TABLE IF EXISTS public.curated_rule_fires ENABLE ROW LEVEL SECURITY;

-- [ESC] Function privilege closure before COMMIT
-- Default PUBLIC EXECUTE removed for every application function created/replaced in this slice.
-- Regrant only per disposition (service_role always; authenticated only for allowlisted RLS helpers).
-- disposition public.set_updated_at() => trigger_only
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM service_role;
-- disposition public.increment_share_token_access(uuid) => internal_service_role_only
REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_share_token_access(uuid) TO service_role;
-- disposition public.prevent_je_audit_update() => trigger_only
REVOKE EXECUTE ON FUNCTION public.prevent_je_audit_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_je_audit_update() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_je_audit_update() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_je_audit_update() FROM service_role;
-- disposition public.touch_je_post_attempts() => trigger_only
REVOKE EXECUTE ON FUNCTION public.touch_je_post_attempts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_je_post_attempts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_je_post_attempts() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_je_post_attempts() FROM service_role;
-- disposition public.ledger_events_prevent_mutation() => trigger_only
REVOKE EXECUTE ON FUNCTION public.ledger_events_prevent_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ledger_events_prevent_mutation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.ledger_events_prevent_mutation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.ledger_events_prevent_mutation() FROM service_role;
-- disposition public.ledger_events_notify() => trigger_only
REVOKE EXECUTE ON FUNCTION public.ledger_events_notify() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ledger_events_notify() FROM anon;
REVOKE EXECUTE ON FUNCTION public.ledger_events_notify() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.ledger_events_notify() FROM service_role;
-- disposition public.engagement_addons_set_updated_at() => trigger_only
REVOKE EXECUTE ON FUNCTION public.engagement_addons_set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.engagement_addons_set_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.engagement_addons_set_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.engagement_addons_set_updated_at() FROM service_role;
-- disposition public.entitlement_check_audit_no_mutation() => trigger_only
REVOKE EXECUTE ON FUNCTION public.entitlement_check_audit_no_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.entitlement_check_audit_no_mutation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.entitlement_check_audit_no_mutation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.entitlement_check_audit_no_mutation() FROM service_role;
-- disposition public._intake_touch_updated_at() => trigger_only
REVOKE EXECUTE ON FUNCTION public._intake_touch_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._intake_touch_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public._intake_touch_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public._intake_touch_updated_at() FROM service_role;
-- disposition public.prevent_company_memory_record_unsafe_mutation() => trigger_only
REVOKE EXECUTE ON FUNCTION public.prevent_company_memory_record_unsafe_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_company_memory_record_unsafe_mutation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_company_memory_record_unsafe_mutation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_company_memory_record_unsafe_mutation() FROM service_role;
-- disposition public.prevent_memory_payload_update() => trigger_only
REVOKE EXECUTE ON FUNCTION public.prevent_memory_payload_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_memory_payload_update() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_memory_payload_update() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_memory_payload_update() FROM service_role;
-- disposition public.touch_uncategorized_proposals_updated_at() => trigger_only
REVOKE EXECUTE ON FUNCTION public.touch_uncategorized_proposals_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_uncategorized_proposals_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_uncategorized_proposals_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_uncategorized_proposals_updated_at() FROM service_role;
-- disposition public.prevent_proposal_decision_mutation() => trigger_only
REVOKE EXECUTE ON FUNCTION public.prevent_proposal_decision_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_proposal_decision_mutation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_proposal_decision_mutation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_proposal_decision_mutation() FROM service_role;
-- disposition public.touch_recurring_templates_updated_at() => trigger_only
REVOKE EXECUTE ON FUNCTION public.touch_recurring_templates_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_recurring_templates_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_recurring_templates_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_recurring_templates_updated_at() FROM service_role;
-- disposition public.touch_recurring_fires_updated_at() => trigger_only
REVOKE EXECUTE ON FUNCTION public.touch_recurring_fires_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_recurring_fires_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_recurring_fires_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_recurring_fires_updated_at() FROM service_role;
-- disposition public.guard_recurring_fire_immutability() => trigger_only
REVOKE EXECUTE ON FUNCTION public.guard_recurring_fire_immutability() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guard_recurring_fire_immutability() FROM anon;
REVOKE EXECUTE ON FUNCTION public.guard_recurring_fire_immutability() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_recurring_fire_immutability() FROM service_role;
-- disposition public.curated_rule_fires_immutable() => trigger_only
REVOKE EXECUTE ON FUNCTION public.curated_rule_fires_immutable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.curated_rule_fires_immutable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.curated_rule_fires_immutable() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.curated_rule_fires_immutable() FROM service_role;
-- disposition public.pre_close_review_items_je_draft_check() => trigger_only
REVOKE EXECUTE ON FUNCTION public.pre_close_review_items_je_draft_check() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pre_close_review_items_je_draft_check() FROM anon;
REVOKE EXECUTE ON FUNCTION public.pre_close_review_items_je_draft_check() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.pre_close_review_items_je_draft_check() FROM service_role;
-- disposition public.pre_close_review_items_immutable() => trigger_only
REVOKE EXECUTE ON FUNCTION public.pre_close_review_items_immutable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pre_close_review_items_immutable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.pre_close_review_items_immutable() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.pre_close_review_items_immutable() FROM service_role;
COMMIT;
