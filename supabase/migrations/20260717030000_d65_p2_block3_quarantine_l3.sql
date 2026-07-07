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
