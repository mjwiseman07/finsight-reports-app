-- Phase Intuit Support Wiring — Block 2.5
-- Additive-only. Idempotent. Safe to re-run.
--
-- Purpose:
--   Extend support_tickets with auto-file fingerprint state, add
--   support_error_circuit for global class-level circuit breaking,
--   and permit two new ticket_type values on the app side.

DO $$
BEGIN
  IF to_regclass('public.support_tickets') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='support_tickets' AND column_name='auto_filed'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN auto_filed boolean NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='support_tickets' AND column_name='auto_file_dedupe_key'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN auto_file_dedupe_key text NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='support_tickets' AND column_name='auto_file_count'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN auto_file_count integer NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='support_tickets' AND column_name='error_class'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN error_class text NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='support_tickets' AND column_name='parent_ticket_id'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN parent_ticket_id uuid NULL
        REFERENCES public.support_tickets(id) ON DELETE SET NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS support_tickets_auto_file_dedupe_key_open_idx
      ON public.support_tickets (auto_file_dedupe_key)
      WHERE auto_filed = true AND status != 'closed';

    CREATE INDEX IF NOT EXISTS support_tickets_parent_ticket_id_idx
      ON public.support_tickets (parent_ticket_id) WHERE parent_ticket_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS support_tickets_user_auto_filed_created_idx
      ON public.support_tickets (user_id, created_at DESC)
      WHERE auto_filed = true;
  END IF;
END $$;

COMMENT ON COLUMN public.support_tickets.auto_filed IS
  'True when this ticket was opened automatically by the auto-file engine rather than by the customer. Added Support Wiring Block 2.5.';
COMMENT ON COLUMN public.support_tickets.auto_file_dedupe_key IS
  'sha256(user_id + error_class + normalized_endpoint + realm_id). Auto-file engine collapses repeat occurrences of the same failure fingerprint into a single ticket within an adaptive window. Added Support Wiring Block 2.5.';
COMMENT ON COLUMN public.support_tickets.auto_file_count IS
  'Occurrence count within the current dedup window. Incremented each time the same fingerprint fires while the ticket is still open. Added Support Wiring Block 2.5.';
COMMENT ON COLUMN public.support_tickets.error_class IS
  'Canonical error taxonomy value (e.g. qbo.auth.token_expired). Set on auto-filed tickets. Added Support Wiring Block 2.5.';
COMMENT ON COLUMN public.support_tickets.parent_ticket_id IS
  'For customer-submitted tickets that were prefilled based on a recent auto-filed ticket, points at that parent so support triage sees the full thread. Added Support Wiring Block 2.5.';

CREATE TABLE IF NOT EXISTS public.support_error_circuit (
  error_class      text        PRIMARY KEY,
  window_start     timestamptz NOT NULL DEFAULT now(),
  occurrence_count integer     NOT NULL DEFAULT 0,
  tripped_at       timestamptz NULL,
  tripped_until    timestamptz NULL,
  last_updated     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.support_error_circuit IS
  'Global circuit-breaker state per error class. When a class fires >100x in 15 min, the engine trips it for 30 min to protect the support inbox from platform-wide incidents. Added Support Wiring Block 2.5.';

ALTER TABLE public.support_error_circuit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.support_error_circuit;
CREATE POLICY "service_role_all" ON public.support_error_circuit
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.support_error_circuit FROM anon, authenticated;
GRANT ALL ON public.support_error_circuit TO service_role;
