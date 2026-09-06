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
