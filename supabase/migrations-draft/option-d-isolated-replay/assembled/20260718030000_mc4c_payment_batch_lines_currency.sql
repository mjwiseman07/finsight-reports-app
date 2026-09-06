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
