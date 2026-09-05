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
