-- ============================================================================
-- D6.5 Part 2 — Block 2: L1 Vendor Existence + Fuzzy Match + vendor_master_mirror
-- Additive-only. Idempotent. Companion to Block 1 (20260717010000).
-- ============================================================================

-- ─── vendor_master_mirror ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_master_mirror (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                 UUID NOT NULL,
  firm_client_id          UUID NOT NULL,
  erp_platform            TEXT NOT NULL,
  external_vendor_id      TEXT NOT NULL,
  display_name            TEXT NOT NULL,
  normalized_name         TEXT NOT NULL,
  metaphone_code          TEXT NOT NULL,
  active                  BOOLEAN NOT NULL DEFAULT TRUE,
  sync_token              TEXT,
  primary_email           TEXT,
  primary_phone           TEXT,
  first_synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_snapshot_hash      TEXT NOT NULL,
  UNIQUE (firm_client_id, erp_platform, external_vendor_id)
);

CREATE INDEX IF NOT EXISTS ix_vendor_master_mirror_firm_client_active
  ON public.vendor_master_mirror (firm_client_id, active);

CREATE INDEX IF NOT EXISTS ix_vendor_master_mirror_normalized
  ON public.vendor_master_mirror (firm_client_id, normalized_name);

CREATE INDEX IF NOT EXISTS ix_vendor_master_mirror_metaphone
  ON public.vendor_master_mirror (firm_client_id, metaphone_code);

ALTER TABLE public.vendor_master_mirror ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_master_mirror' AND policyname = 'vendor_master_mirror_service_role'
  ) THEN
    CREATE POLICY vendor_master_mirror_service_role ON public.vendor_master_mirror
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_master_mirror' AND policyname = 'vendor_master_mirror_tenant_select'
  ) THEN
    CREATE POLICY vendor_master_mirror_tenant_select ON public.vendor_master_mirror
      FOR SELECT TO authenticated
      USING (
        firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- ─── ap_intake_bills column adds ─────────────────────────────────────────
ALTER TABLE public.ap_intake_bills
  ADD COLUMN IF NOT EXISTS vendor_resolution_method      TEXT
    CHECK (vendor_resolution_method IN ('exact','fuzzy_candidate','no_match')),
  ADD COLUMN IF NOT EXISTS vendor_resolution_confidence  NUMERIC(4,3)
    CHECK (vendor_resolution_confidence IS NULL OR (vendor_resolution_confidence >= 0 AND vendor_resolution_confidence <= 1)),
  ADD COLUMN IF NOT EXISTS vendor_candidate_ids          UUID[] DEFAULT '{}'::UUID[];

-- ─── L1 assertion registry insert ────────────────────────────────────────
INSERT INTO public.ap_intake_assertion_registry (
  assertion_id, layer, severity_default, evaluator_module, description
) VALUES (
  'vendor_resolved_or_quarantined',
  'L1',
  'HIGH',
  'lib/ap-intake/assertions/vendor-resolved-or-quarantined',
  'Every bill row must either resolve to a mirror vendor or emit a quarantine routing signal.'
) ON CONFLICT (assertion_id) DO NOTHING;

-- ─── Ledger event type ───────────────────────────────────────────────────
INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('vendor.mirror_refreshed', 'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

-- ─── ai_action_log.action_category widening (canonical drop-and-re-add) ──
ALTER TABLE public.ai_action_log
  DROP CONSTRAINT IF EXISTS ai_action_log_action_category_check;

ALTER TABLE public.ai_action_log
  ADD CONSTRAINT ai_action_log_action_category_check CHECK (
    action_category IN (
      'intake_ocr','intake_classify','cash_app_reasoning','ar_dunning_draft',
      'assertion_reasoning','je_proposal','anomaly_reasoning','recon_reasoning',
      'agent_close_walkthrough','entitlement_check','other',
      'directive_apply','review_item_compose',
      'posting_attempt','posting_blocked','posting_remediation',
      'reviewer_ui_export','reviewer_ui_visibility_change','reviewer_ui_policy_change',
      'assertion_coverage_scan','assertion_gap_reasoning',
      'visual_fingerprint','vendor_resolution'
    )
  );
