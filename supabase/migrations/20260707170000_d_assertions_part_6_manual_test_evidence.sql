-- ============================================================================
-- D-Assertions Part 6 — Manual test evidence + attachments + strength refinement
-- Base: a0cf507 (Part 5). Target ladder: 1554 → ~1590.
-- ============================================================================
BEGIN;
ALTER TABLE public.close_assertion_coverage
  ADD COLUMN IF NOT EXISTS covering_manual_test_ids uuid[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS close_assertion_coverage_manual_tests_gin
  ON public.close_assertion_coverage USING gin (covering_manual_test_ids);
CREATE TABLE IF NOT EXISTS public.manual_test_evidence (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id           uuid NOT NULL REFERENCES public.firm_clients(id),
  engagement_id            uuid NOT NULL REFERENCES public.engagements(id),
  close_period_id          uuid NOT NULL REFERENCES public.close_periods(id),
  account_category         text NOT NULL,
  assertion_id             text NOT NULL,
  evidence_type            text NOT NULL,
  source_type              text NOT NULL,
  source_key               jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_amount            numeric NULL,
  source_date              date NULL,
  evidence_summary         text NOT NULL,
  calculation_notes        text NULL,
  resolves_gap_item_id     uuid NULL REFERENCES public.close_gap_review_items(id),
  data_source_reliability_basis text NULL,
  content_hash             text NOT NULL,
  created_by_user_id       uuid NOT NULL,
  created_by_display_name  text NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manual_test_evidence_evidence_type_check CHECK (evidence_type = ANY (ARRAY[
    'qbo_bill','qbo_invoice','qbo_payment','qbo_transaction','qbo_journal_entry',
    'plaid_transaction','bank_statement','credit_card_statement',
    'vendor_invoice_ocr','customer_invoice_ocr',
    'contract_document','signed_agreement',
    'system_calculation','memory_pattern','manual_override','other',
    'manual_procedure','external_confirmation','analytical_review','reperformance'
  ])),
  CONSTRAINT manual_test_evidence_natural_key UNIQUE
    (firm_client_id, close_period_id, account_category, assertion_id, content_hash)
);
CREATE INDEX IF NOT EXISTS manual_test_evidence_period_idx
  ON public.manual_test_evidence (close_period_id, account_category, assertion_id);
CREATE INDEX IF NOT EXISTS manual_test_evidence_engagement_idx
  ON public.manual_test_evidence (engagement_id, created_at DESC);
CREATE INDEX IF NOT EXISTS manual_test_evidence_gap_idx
  ON public.manual_test_evidence (resolves_gap_item_id)
  WHERE resolves_gap_item_id IS NOT NULL;
ALTER TABLE public.manual_test_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY manual_test_evidence_firm_read
  ON public.manual_test_evidence FOR SELECT
  USING (
    engagement_id IN (
      SELECT e.id
      FROM engagements e
      JOIN firm_memberships fm ON fm.firm_id = e.firm_id
      WHERE fm.user_id = auth.uid()
    )
  );
CREATE POLICY manual_test_evidence_service_all
  ON public.manual_test_evidence FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
CREATE TABLE IF NOT EXISTS public.manual_test_attachments (
  attachment_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id              uuid NOT NULL REFERENCES public.manual_test_evidence(id) ON DELETE CASCADE,
  firm_client_id           uuid NOT NULL,
  storage_bucket           text NOT NULL DEFAULT 'manual-test-evidence',
  storage_path             text NOT NULL,
  original_filename        text NOT NULL,
  mime_type                text NOT NULL,
  byte_size                bigint NOT NULL,
  sha256                   text NOT NULL,
  ingested_from            text NOT NULL,
  ingested_at              timestamptz NOT NULL DEFAULT now(),
  ingested_by              text NOT NULL DEFAULT 'system',
  CONSTRAINT manual_test_attachments_bucket_check CHECK (storage_bucket = 'manual-test-evidence'),
  CONSTRAINT manual_test_attachments_natural_key UNIQUE (evidence_id, sha256)
);
CREATE INDEX IF NOT EXISTS manual_test_attachments_evidence_idx
  ON public.manual_test_attachments (evidence_id);
ALTER TABLE public.manual_test_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY manual_test_attachments_firm_read
  ON public.manual_test_attachments FOR SELECT
  USING (
    evidence_id IN (
      SELECT mte.id
      FROM manual_test_evidence mte
      JOIN engagements e ON e.id = mte.engagement_id
      JOIN firm_memberships fm ON fm.firm_id = e.firm_id
      WHERE fm.user_id = auth.uid()
    )
  );
CREATE POLICY manual_test_attachments_service_all
  ON public.manual_test_attachments FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
INSERT INTO storage.buckets (id, name, public)
VALUES ('manual-test-evidence', 'manual-test-evidence', false)
ON CONFLICT (id) DO NOTHING;
COMMIT;
