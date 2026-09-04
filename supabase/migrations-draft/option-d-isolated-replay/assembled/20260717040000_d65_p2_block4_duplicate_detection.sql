-- Phase D6.5 Part 2 — Block 4: L5 Multi-Strategy Duplicate Detection
-- Additive-only. Idempotent.

BEGIN;

ALTER TABLE public.ap_intake_bills
  ADD COLUMN IF NOT EXISTS invoice_number       TEXT,
  ADD COLUMN IF NOT EXISTS invoice_date         DATE,
  ADD COLUMN IF NOT EXISTS invoice_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS content_hash_sha256  TEXT;

CREATE INDEX IF NOT EXISTS ix_ap_intake_bills_content_hash
  ON public.ap_intake_bills (firm_client_id, resolved_vendor_id, content_hash_sha256)
  WHERE content_hash_sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ap_intake_bills_amount_date
  ON public.ap_intake_bills (firm_client_id, resolved_vendor_id, invoice_amount_cents, invoice_date)
  WHERE invoice_amount_cents IS NOT NULL AND invoice_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ap_intake_bills_invoice_number
  ON public.ap_intake_bills (firm_client_id, resolved_vendor_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ap_intake_bill_duplicates (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id                  UUID NOT NULL,
  firm_client_id           UUID NOT NULL,
  bill_id                  UUID NOT NULL REFERENCES public.ap_intake_bills(id),
  matched_bill_id          UUID NOT NULL REFERENCES public.ap_intake_bills(id),
  strategy_id              TEXT NOT NULL CHECK (strategy_id IN (
    'S1_exact_content_hash',
    'S2_amount_vendor_date',
    'S3_invoice_number_vendor',
    'S4_fuzzy_amount_window'
  )),
  confidence               NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  severity                 TEXT NOT NULL CHECK (severity IN ('HIGH','MEDIUM')),
  evidence                 JSONB NOT NULL,
  detected_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quarantined              BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (bill_id, matched_bill_id, strategy_id)
);

CREATE INDEX IF NOT EXISTS ix_ap_intake_bill_duplicates_bill
  ON public.ap_intake_bill_duplicates (bill_id);

CREATE INDEX IF NOT EXISTS ix_ap_intake_bill_duplicates_firm_client_time
  ON public.ap_intake_bill_duplicates (firm_client_id, detected_at DESC);

ALTER TABLE public.ap_intake_bill_duplicates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ap_intake_bill_duplicates'
      AND policyname = 'ap_intake_bill_duplicates_service_role'
  ) THEN
    CREATE POLICY ap_intake_bill_duplicates_service_role
      ON public.ap_intake_bill_duplicates
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ap_intake_bill_duplicates'
      AND policyname = 'ap_intake_bill_duplicates_tenant_select'
  ) THEN
    CREATE POLICY ap_intake_bill_duplicates_tenant_select
      ON public.ap_intake_bill_duplicates
      FOR SELECT TO authenticated
      USING (firm_id IN (SELECT firm_id FROM public.firm_memberships WHERE user_id = auth.uid()));
  END IF;
END $$;

COMMENT ON TABLE public.ap_intake_bill_duplicates IS
  'Phase D6.5 Part 2 Block 4: append-only ledger of L5 multi-strategy duplicate-bill detections.';

INSERT INTO public.ap_intake_assertion_registry (
  assertion_id, layer, severity_default, evaluator_module, description
) VALUES (
  'no_duplicate_bills_posted',
  'L5',
  'HIGH',
  'lib/ap-intake/assertions/no-duplicate-bills-posted',
  'No duplicate bill may proceed to posting without quarantine or explicit release.'
) ON CONFLICT (assertion_id) DO NOTHING;

INSERT INTO public.ap_intake_ledger_event_types (event_type, actor_type, is_merkle_chained) VALUES
  ('bill.duplicate_detected', 'system', TRUE),
  ('bill.duplicate_flagged',  'system', TRUE)
ON CONFLICT (event_type) DO NOTHING;

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
      'bank_change_detection','quarantine_gate_evaluation',
      'duplicate_detection'
    ));
END $$;

COMMIT;
