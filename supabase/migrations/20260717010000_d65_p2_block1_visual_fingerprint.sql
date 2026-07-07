-- Phase D6.5 Part 2 — Block 1: Visual Invoice Fingerprint Pipeline
-- Additive only. IF NOT EXISTS everywhere. No ALTER on existing columns.

-- ─── ap_intake_bills (text extraction landing zone) ───────────────────────
CREATE TABLE IF NOT EXISTS public.ap_intake_bills (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id             UUID NOT NULL,
  company_id          UUID NOT NULL,
  firm_client_id      UUID,
  intake_message_id   UUID REFERENCES public.intake_messages(id),
  resolved_vendor_id  UUID,
  mime_type           TEXT,
  raw_text            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ap_intake_bills_firm_company
  ON public.ap_intake_bills (firm_id, company_id);

ALTER TABLE public.ap_intake_bills ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ap_intake_bills' AND policyname = 'ap_intake_bills_service_role'
  ) THEN
    CREATE POLICY ap_intake_bills_service_role ON public.ap_intake_bills
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ap_intake_bills' AND policyname = 'ap_intake_bills_tenant_select'
  ) THEN
    CREATE POLICY ap_intake_bills_tenant_select ON public.ap_intake_bills
      FOR SELECT TO authenticated
      USING (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── Table: vendor_invoice_fingerprints ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_invoice_fingerprints (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id            UUID NOT NULL,
  vendor_id          UUID NOT NULL,
  version            INTEGER NOT NULL,
  bill_id            UUID REFERENCES public.ap_intake_bills(id),
  provenance         TEXT NOT NULL DEFAULT 'live_intake'
                     CHECK (provenance IN ('live_intake', 'onboarding_harvest')),
  layout_bboxes      JSONB NOT NULL,
  font_families      JSONB NOT NULL,
  color_palette      JSONB NOT NULL,
  phash              BYTEA NOT NULL,
  dhash              BYTEA NOT NULL,
  extractor_version  TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vif_unique_firm_vendor_version UNIQUE (firm_id, vendor_id, version)
);

CREATE INDEX IF NOT EXISTS ix_vif_firm_vendor
  ON public.vendor_invoice_fingerprints (firm_id, vendor_id);

CREATE INDEX IF NOT EXISTS ix_vif_bill
  ON public.vendor_invoice_fingerprints (bill_id)
  WHERE bill_id IS NOT NULL;

ALTER TABLE public.vendor_invoice_fingerprints ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_invoice_fingerprints' AND policyname = 'vif_service_role'
  ) THEN
    CREATE POLICY vif_service_role ON public.vendor_invoice_fingerprints
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_invoice_fingerprints' AND policyname = 'vif_tenant_select'
  ) THEN
    CREATE POLICY vif_tenant_select ON public.vendor_invoice_fingerprints
      FOR SELECT TO authenticated
      USING (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_invoice_fingerprints' AND policyname = 'vif_tenant_write'
  ) THEN
    CREATE POLICY vif_tenant_write ON public.vendor_invoice_fingerprints
      FOR ALL TO authenticated
      USING (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        firm_id IN (
          SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── Entitlement flag: ap_intake ─────────────────────────────────────────
-- Canonical registry: lib/entitlements/registry.ts ADDON_REGISTRY + engagement_addons.addon_code CHECK.
-- ap_intake already present — no duplicate insert required.

-- ─── L4 assertion registry (ISA assertions_catalog is a fixed 8-enum) ────
CREATE TABLE IF NOT EXISTS public.ap_intake_assertion_registry (
  assertion_id      TEXT PRIMARY KEY,
  layer             TEXT NOT NULL,
  severity_default  TEXT NOT NULL,
  evaluator_module  TEXT NOT NULL,
  description       TEXT NOT NULL
);

INSERT INTO public.ap_intake_assertion_registry (
  assertion_id, layer, severity_default, evaluator_module, description
) VALUES (
  'fingerprint_drift_within_threshold',
  'L4',
  'HIGH',
  'ap-intake/assertions/fingerprint-drift-within-threshold',
  'Bill fingerprint drift from prior version must stay within configured '
  || 'thresholds (layout 15%, symmetric font-set diff, Delta-E 20 color, '
  || '8-bit pHash Hamming) or route to reviewer.'
) ON CONFLICT (assertion_id) DO NOTHING;

-- ─── AP ledger event type registry ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ap_intake_ledger_event_types (
  event_type         TEXT PRIMARY KEY,
  actor_type         TEXT NOT NULL,
  is_merkle_chained  BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained)
VALUES ('fingerprint.new_version_created', 'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

-- ─── ai_action_log category: visual_fingerprint ──────────────────────────
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
      'visual_fingerprint'
    )
  );
