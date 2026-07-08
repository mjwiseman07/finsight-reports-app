-- Phase D6.5 Part 2 Block 7a — L7 credits / prepayment sub-ledger
-- Depends on: Block 6b (engagement_addons, pilot_feature_allowlist, ap_intake_ledger_event_types, firm_memberships, vendors, bills)
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
  vendor_id              UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
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
  bill_id                     UUID NOT NULL REFERENCES public.bills(id) ON DELETE RESTRICT,
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
  vendor_id                   UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
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
  vendor_id          UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  currency           CHAR(3) NOT NULL,
  movement_type      TEXT NOT NULL CHECK (movement_type IN ('prepayment_received','prepayment_applied','prepayment_reversed','prepayment_written_off')),
  amount_cents       BIGINT NOT NULL,
  source_event_id    UUID,
  source_bill_id     UUID REFERENCES public.bills(id) ON DELETE SET NULL,
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
  vendor_id             UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
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

COMMIT;
