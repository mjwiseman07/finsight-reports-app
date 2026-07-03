-- D6.4a: Universal JE Evidence + Attachment + Backup Packet Foundation
-- Adds:
--   je_line_evidence      -- per-line structured provenance
--   je_line_attachments   -- per-line source doc references (points to storage)
--   je_backup_packets     -- one PDF backup packet per posted JE (content-addressed)
-- All three FK to je_post_attempts(attempt_id) — the canonical JE identity.
-- Storage: creates 'je-backup' bucket (private, 50MB, PDF+image mime types).
-- RLS: mirror je_post_attempts / je_posting_audit — enabled, zero policies (service-role-only).

BEGIN;

-- === je_line_evidence ===
CREATE TABLE IF NOT EXISTS public.je_line_evidence (
  evidence_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id            UUID NOT NULL REFERENCES public.je_post_attempts(attempt_id) ON DELETE CASCADE,
  firm_client_id        UUID NOT NULL,
  line_index            INTEGER NOT NULL CHECK (line_index >= 0),
  evidence_type         TEXT NOT NULL CHECK (evidence_type IN (
    'qbo_bill','qbo_invoice','qbo_payment','qbo_transaction','qbo_journal_entry',
    'plaid_transaction','bank_statement','credit_card_statement',
    'vendor_invoice_ocr','customer_invoice_ocr','contract_document','signed_agreement',
    'system_calculation','memory_pattern','manual_override','other'
  )),
  source_type           TEXT NOT NULL,
  source_id             TEXT,
  source_key            JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_amount         NUMERIC,
  source_date           DATE,
  evidence_summary      TEXT NOT NULL,
  calculation_notes     TEXT,
  originating_rule_id   TEXT,
  originating_fire_id   UUID,
  content_hash          TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS je_line_evidence_attempt_idx
  ON public.je_line_evidence(attempt_id, line_index);
CREATE INDEX IF NOT EXISTS je_line_evidence_firm_client_idx
  ON public.je_line_evidence(firm_client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS je_line_evidence_source_idx
  ON public.je_line_evidence(source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS je_line_evidence_source_key_idx
  ON public.je_line_evidence USING gin (source_key);

COMMENT ON TABLE public.je_line_evidence IS
  'D6.4a: Structured per-line provenance for every JE. One row per line of a proposed or posted JE. Required by composer contract (see lib/je-evidence/contract.ts).';

-- === je_line_attachments ===
CREATE TABLE IF NOT EXISTS public.je_line_attachments (
  attachment_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id       UUID NOT NULL REFERENCES public.je_line_evidence(evidence_id) ON DELETE CASCADE,
  attempt_id        UUID NOT NULL REFERENCES public.je_post_attempts(attempt_id) ON DELETE CASCADE,
  firm_client_id    UUID NOT NULL,
  line_index        INTEGER NOT NULL,
  storage_bucket    TEXT NOT NULL DEFAULT 'je-backup',
  storage_path      TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type         TEXT NOT NULL,
  byte_size         BIGINT NOT NULL CHECK (byte_size > 0),
  sha256            TEXT NOT NULL,
  ingested_from     TEXT NOT NULL CHECK (ingested_from IN (
    'qbo_attachable','plaid_statement_pdf','ocr_upload','manual_upload','system_generated'
  )),
  ingested_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ingested_by       TEXT NOT NULL DEFAULT 'system',
  UNIQUE (attempt_id, line_index, sha256)
);

CREATE INDEX IF NOT EXISTS je_line_attachments_evidence_idx
  ON public.je_line_attachments(evidence_id);
CREATE INDEX IF NOT EXISTS je_line_attachments_firm_client_idx
  ON public.je_line_attachments(firm_client_id, ingested_at DESC);

COMMENT ON TABLE public.je_line_attachments IS
  'D6.4a: Source document files supporting a JE line evidence record. Files stored in storage.buckets.je-backup, path scoped by firm_client_id.';

-- === je_backup_packets ===
CREATE TABLE IF NOT EXISTS public.je_backup_packets (
  packet_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id        UUID NOT NULL REFERENCES public.je_post_attempts(attempt_id) ON DELETE CASCADE,
  firm_client_id    UUID NOT NULL,
  close_period_id   UUID REFERENCES public.close_periods(id) ON DELETE SET NULL,
  storage_bucket    TEXT NOT NULL DEFAULT 'je-backup',
  storage_path      TEXT NOT NULL,
  sha256            TEXT NOT NULL,
  byte_size         BIGINT NOT NULL CHECK (byte_size > 0),
  generation_status TEXT NOT NULL DEFAULT 'generated' CHECK (generation_status IN (
    'pending','generated','failed','superseded'
  )),
  generation_error  TEXT,
  generator_version TEXT NOT NULL DEFAULT 'd6.4a-v1',
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (attempt_id, sha256)
);

CREATE INDEX IF NOT EXISTS je_backup_packets_firm_client_idx
  ON public.je_backup_packets(firm_client_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS je_backup_packets_close_period_idx
  ON public.je_backup_packets(close_period_id) WHERE close_period_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS je_backup_packets_attempt_idx
  ON public.je_backup_packets(attempt_id, generated_at DESC);

COMMENT ON TABLE public.je_backup_packets IS
  'D6.4a: PDF backup packet generated once a JE is posted. Content-addressed by sha256; regeneration produces a new row rather than overwriting. Bookkeeper/client-facing.';

-- === Storage bucket: je-backup ===
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'je-backup',
  'je-backup',
  false,
  52428800,
  ARRAY['application/pdf','image/png','image/jpeg','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- === RLS — mirror je_post_attempts / je_posting_audit (enabled, zero policies) ===
ALTER TABLE public.je_line_evidence    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.je_line_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.je_backup_packets   ENABLE ROW LEVEL SECURITY;

-- === Storage RLS — mirror close-packets bucket policy ===
DROP POLICY IF EXISTS je_backup_service_role_all ON storage.objects;
CREATE POLICY je_backup_service_role_all
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'je-backup')
  WITH CHECK (bucket_id = 'je-backup');

COMMIT;
