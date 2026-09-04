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
