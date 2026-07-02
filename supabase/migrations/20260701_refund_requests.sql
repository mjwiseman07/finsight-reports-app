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
