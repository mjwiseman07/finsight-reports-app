-- Phase Intuit Support Wiring — Block 2
-- Additive-only. Idempotent. Safe to re-run.
--
-- Purpose:
--   Enrich support_tickets with the QBO context Intuit's support team needs
--   to trace a customer's report back to their Intuit logs — realm_id and
--   the most recent intuit_tid we saw for that customer, plus a correlation
--   ID that appears in every email touching this ticket.
--
--   Also create qbo_recent_intuit_tid — a short-TTL server-side cache so
--   the ticket POST can resolve "what was the last tid this user's QBO
--   requests returned?" in O(1) without a cross-table scan.

DO $$
BEGIN
  IF to_regclass('public.support_tickets') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'support_tickets'
        AND column_name = 'qbo_realm_id'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN qbo_realm_id text NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'support_tickets'
        AND column_name = 'last_intuit_tid'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN last_intuit_tid text NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'support_tickets'
        AND column_name = 'workflow_context'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN workflow_context jsonb NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'support_tickets'
        AND column_name = 'correlation_id'
    ) THEN
      ALTER TABLE public.support_tickets ADD COLUMN correlation_id text NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS support_tickets_correlation_id_idx
      ON public.support_tickets (correlation_id) WHERE correlation_id IS NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.support_tickets.qbo_realm_id IS
  'QBO realm_id of the customer''s active QuickBooks Online connection at ticket submit time. NULL when the customer has no connected QBO company. Added Intuit Support Wiring Block 2.';
COMMENT ON COLUMN public.support_tickets.last_intuit_tid IS
  'Most recent intuit_tid seen for this user from any QBO API call in the 24 hours before ticket submit. NULL when no recent Intuit API activity or no QBO connection. Added Intuit Support Wiring Block 2.';
COMMENT ON COLUMN public.support_tickets.workflow_context IS
  'jsonb blob describing what the customer was doing when they submitted (URL path, referrer, any app-surfaced error). Added Intuit Support Wiring Block 2.';
COMMENT ON COLUMN public.support_tickets.correlation_id IS
  'UUID stamped on both support notification and customer confirmation emails so the customer can reference this ticket unambiguously in follow-ups. Added Intuit Support Wiring Block 2.';

CREATE TABLE IF NOT EXISTS public.qbo_recent_intuit_tid (
  user_id      uuid        NOT NULL,
  realm_id     text        NOT NULL,
  intuit_tid   text        NOT NULL,
  endpoint     text        NULL,
  status_code  integer     NULL,
  captured_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, realm_id)
);

CREATE INDEX IF NOT EXISTS qbo_recent_intuit_tid_user_captured_idx
  ON public.qbo_recent_intuit_tid (user_id, captured_at DESC);

COMMENT ON TABLE public.qbo_recent_intuit_tid IS
  'Short-TTL per-(user,realm) cache of the last intuit_tid seen from any QBO API response. Used at support-ticket submit time to enrich the ticket with a traceable Intuit request identifier. Rows older than 24 hours can be swept by future cleanup cron. Added Intuit Support Wiring Block 2.';

ALTER TABLE public.qbo_recent_intuit_tid ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.qbo_recent_intuit_tid;
CREATE POLICY "service_role_all" ON public.qbo_recent_intuit_tid
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.qbo_recent_intuit_tid FROM anon, authenticated;
GRANT ALL ON public.qbo_recent_intuit_tid TO service_role;
