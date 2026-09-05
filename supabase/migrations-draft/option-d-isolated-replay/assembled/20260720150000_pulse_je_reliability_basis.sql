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
