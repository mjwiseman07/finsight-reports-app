-- WBP W1c.3 — link je_posting_audit rows back to the patented
-- pilot_lifecycle_events chain emitted by QuickBooksWriteProvider.
-- Nullable because legacy path emits no lifecycle events.
ALTER TABLE public.je_posting_audit
  ADD COLUMN IF NOT EXISTS lifecycle_event_ids jsonb;

COMMENT ON COLUMN public.je_posting_audit.lifecycle_event_ids IS
  'WBP W1c.3: uuid[] of pilot_lifecycle_events rows emitted by QuickBooksWriteProvider for this attempt. NULL for legacy-path posts (WRITE_BOUNDARY_ENABLED=false).';

CREATE INDEX IF NOT EXISTS idx_je_posting_audit_lifecycle_event_ids
  ON public.je_posting_audit USING gin (lifecycle_event_ids)
  WHERE lifecycle_event_ids IS NOT NULL;
