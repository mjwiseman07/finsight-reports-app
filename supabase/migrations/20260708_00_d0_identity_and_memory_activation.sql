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
