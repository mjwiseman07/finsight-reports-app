-- =============================================================================
-- EXECUTABLE SQUASH CANDIDATE — DRAFT / NON-DEPLOYABLE
-- Proposed version: 20260907010032
-- Proposed name: esc_application_schema_slice_3_of_5
-- Module: public_application_schema_slice_3
-- Provenance: Option D assembled app files (33) stripped of nested txn markers; RLS/privilege closed before COMMIT
-- NOT in active supabase/migrations/. Production mutation NOT authorized.
-- UTF-8 LF. statements[] must remain non-empty when eventually recorded.
-- =============================================================================
BEGIN;
-- OPTION 2 secure multi-version split: slice 3/5
-- Source BEGIN/COMMIT stripped; exactly one outer transaction.
-- Files: 33; RLS closure tables: 1

-- >>> begin 20260717090000_d65_p2_block7a_credits_prepayment.sql
-- Phase D6.5 Part 2 Block 7a — L7 credits / prepayment sub-ledger
-- Depends on: Block 6b (engagement_addons, pilot_feature_allowlist, ap_intake_ledger_event_types, firm_memberships, ap_intake_bills)
-- [ESC] stripped source txn marker: BEGIN;


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

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260717090000_d65_p2_block7a_credits_prepayment.sql

-- >>> begin 20260717100000_d65_p2_block7b_multimodal_inbox.sql
-- Phase D6.5 Part 2 Block 7b — L8 Multimodal AP Inbox
-- Depends on: Block 7a (engagement_addons, pilot_feature_allowlist, ap_intake_ledger_event_types, firm_memberships)
-- [ESC] stripped source txn marker: BEGIN;


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

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260717100000_d65_p2_block7b_multimodal_inbox.sql

-- >>> begin 20260717110000_d65_p2_block8a_interlock_rails.sql
-- Phase D6.5 Part 2 Block 8a — L9 Interlock + L10 Banking Rail Fan-Out
-- Depends on: Block 3 (vendor_bank_history), Block 6a (requisitions), Block 6b (gl_account_budgets),
--             Block 7a (vendor_credits, vendor_prepayment_balances, engagement_addons,
--                       pilot_feature_allowlist, ap_intake_ledger_event_types, firm_memberships)
-- [ESC] stripped source txn marker: BEGIN;


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

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260717110000_d65_p2_block8a_interlock_rails.sql

-- >>> begin 20260717120000_d65_p2_block8b_presets_selfgov.sql
-- Phase D6.5 Part 2 Block 8b — L12 Preset Packs + L13 Adaptive Self-Governance
-- Depends on: Block 7a (engagement_addons, pilot_feature_allowlist, ap_intake_ledger_event_types, firm_memberships)
-- [ESC] stripped source txn marker: BEGIN;


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

-- [ESC] stripped source txn marker: COMMIT;

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

-- [ESC] stripped source txn marker: begin;


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

-- [ESC] stripped source txn marker: commit;

-- <<< end 20260719050000_gap3_je_approval_flow.sql

-- >>> begin 20260719060000_gap2_subscription_lifecycle_purge.sql
-- Gap 2 — Subscription lifecycle purge (30d grace + cascade + audit)
-- Additive-only. Registry supports firm_id / firm_client_id / engagement_id /
-- user_via_membership / subscription_via_subscriber scopes (repo schema reality).

-- [ESC] stripped source txn marker: begin;


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

-- [ESC] stripped source txn marker: commit;

-- <<< end 20260719060000_gap2_subscription_lifecycle_purge.sql

-- >>> begin 20260720000000_v1_5_audit_ready_engagement_state.sql
-- V1.5 Audit Ready — engagement lifecycle tracking
-- ADDITIVE ONLY. No existing tables modified.
-- Adapted to repo schema: firm_client_id (not client_seats),
-- company_users / firm_memberships (not company_members / firm_members).

-- [ESC] stripped source txn marker: BEGIN;


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

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260720000000_v1_5_audit_ready_engagement_state.sql

-- >>> begin 20260720120000_ar_week3_pbc_ingest_llm_usage.sql
-- Week 3 Block 3 — PBC ingest + LLM usage tracking + PII redaction maps
-- ADDITIVE ONLY. No modifications to existing tables.
-- Adapted: uses company_users / firm_memberships (repo schema).

-- [ESC] stripped source txn marker: BEGIN;


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

-- [ESC] stripped source txn marker: COMMIT;

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
-- [ESC] stripped source txn marker: BEGIN;

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
-- [ESC] stripped source txn marker: COMMIT;

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
-- [ESC] stripped source txn marker: BEGIN;

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
-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260721120000_ar_tieout4b1_bs_recon_artifacts.sql

-- >>> begin 20260721140000_ar_tieout4b2_fa_rollforward_artifacts.sql
-- PBC-TIEOUT-4B.2: Fixed-asset Cost/AccumDepr/NBV roll-forward artifacts + PDF.
-- Additive only. Idempotent. Non-destructive.
-- CHECK enums: APPEND ONLY — preserve all live values from TIEOUT-1 + 4B.1.
-- [ESC] stripped source txn marker: BEGIN;


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

-- [ESC] stripped source txn marker: COMMIT;

-- <<< end 20260721140000_ar_tieout4b2_fa_rollforward_artifacts.sql

-- >>> begin 20260721160000_ar_tieout4b3_bs_recon_summary.sql
-- PBC-TIEOUT-4B.3: BS Recon Summary Rollup (engagement-level).
-- ADDITIVE ONLY. Idempotent. Non-destructive.
-- Adds two artifact tables + extends PBC tie_out_kind CHECK to include
-- 'bs_recon_summary'. audit_ready_tie_out_runs.tie_out_kind is free-text,
-- so no CHECK change is required there.
-- [ESC] stripped source txn marker: BEGIN;

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
-- [ESC] stripped source txn marker: COMMIT;

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

-- [ESC] RLS closure: ENABLE RLS before COMMIT for tables first visible in this slice.
-- Policies may arrive in a later security slice; ENABLE with no policy = deny-by-default for anon/authenticated.
ALTER TABLE IF EXISTS public.gap2_purge_table_registry ENABLE ROW LEVEL SECURITY;
COMMIT;
