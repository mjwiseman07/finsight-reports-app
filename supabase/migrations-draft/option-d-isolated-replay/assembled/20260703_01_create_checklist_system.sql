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
