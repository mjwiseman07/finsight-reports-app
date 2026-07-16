-- Issue #2 — Intuit QuickBooks webhook event log
--
-- Every notification received on /api/quickbooks/webhook is persisted here
-- BEFORE the 200 response is returned. This gives us:
--   1. A tamper-evident audit trail (required by Intuit App Store review).
--   2. Dedup by CloudEvents id (Intuit may retry).
--   3. A durable queue for async entity refetch (Issue #4 CDC cron reads this).
--   4. Forensic replay if a handler bug drops events.
--
-- Additive-only. Table + RLS + append-only trigger + dedup index. Idempotent.

-- =========================================================================
-- Step 1: table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.qbo_webhook_events (
  -- Local surrogate key
  id                bigserial PRIMARY KEY,

  -- CloudEvents envelope (Intuit fields)
  cloud_event_id    text        NOT NULL,   -- CloudEvents `id` — dedup key
  spec_version      text        NOT NULL,   -- always "1.0" today
  source            text        NULL,       -- CloudEvents `source` (opaque GUID)
  event_type        text        NOT NULL,   -- CloudEvents `type` — e.g. qbo.invoice.updated.v1
  event_time        timestamptz NOT NULL,   -- CloudEvents `time`
  intuit_entity_id  text        NOT NULL,   -- CloudEvents `intuitentityid`
  intuit_account_id text        NOT NULL,   -- CloudEvents `intuitaccountid` (realm id)

  -- Parsed convenience columns (derived from event_type)
  entity_name       text        NOT NULL,   -- e.g. "invoice", "customer"
  operation         text        NOT NULL,   -- e.g. "created", "updated", "deleted", "merged"

  -- Full payload for audit + replay
  data_payload      jsonb       NULL,       -- CloudEvents `data` object (may be empty)
  raw_body          text        NOT NULL,   -- exact bytes we signed against — DO NOT DROP

  -- Delivery metadata
  intuit_signature  text        NOT NULL,   -- raw header value (base64 hmac)
  received_at       timestamptz NOT NULL DEFAULT now(),

  -- Processing state (set by handlers; never mutated after processed_at is stamped)
  processed_at      timestamptz NULL,       -- NULL = handler has not yet run
  processed_status  text        NULL,       -- 'ok' | 'error' | 'skipped'
  processed_error   text        NULL,       -- stack/message if failed
  fetch_pending     boolean     NOT NULL DEFAULT true  -- Issue #4 CDC cron will flip to false after refetch
);

-- =========================================================================
-- Step 2: dedup — CloudEvents id must be unique
-- =========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS qbo_webhook_events_cloud_event_id_uidx
  ON public.qbo_webhook_events (cloud_event_id);

-- =========================================================================
-- Step 3: hot-path indexes
-- =========================================================================
CREATE INDEX IF NOT EXISTS qbo_webhook_events_realm_received_at_idx
  ON public.qbo_webhook_events (intuit_account_id, received_at DESC);

CREATE INDEX IF NOT EXISTS qbo_webhook_events_unprocessed_idx
  ON public.qbo_webhook_events (received_at)
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS qbo_webhook_events_fetch_pending_idx
  ON public.qbo_webhook_events (intuit_account_id, entity_name, intuit_entity_id)
  WHERE fetch_pending = true;

-- =========================================================================
-- Step 4: append-only enforcement
-- Immutable columns after insert. Only processing-state columns may mutate,
-- and only from NULL -> value (not value -> different value).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.qbo_webhook_events_enforce_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Immutable identity + payload columns
  IF NEW.cloud_event_id     IS DISTINCT FROM OLD.cloud_event_id     THEN RAISE EXCEPTION 'qbo_webhook_events.cloud_event_id is immutable'; END IF;
  IF NEW.spec_version       IS DISTINCT FROM OLD.spec_version       THEN RAISE EXCEPTION 'qbo_webhook_events.spec_version is immutable'; END IF;
  IF NEW.event_type         IS DISTINCT FROM OLD.event_type         THEN RAISE EXCEPTION 'qbo_webhook_events.event_type is immutable'; END IF;
  IF NEW.event_time         IS DISTINCT FROM OLD.event_time         THEN RAISE EXCEPTION 'qbo_webhook_events.event_time is immutable'; END IF;
  IF NEW.intuit_entity_id   IS DISTINCT FROM OLD.intuit_entity_id   THEN RAISE EXCEPTION 'qbo_webhook_events.intuit_entity_id is immutable'; END IF;
  IF NEW.intuit_account_id  IS DISTINCT FROM OLD.intuit_account_id  THEN RAISE EXCEPTION 'qbo_webhook_events.intuit_account_id is immutable'; END IF;
  IF NEW.entity_name        IS DISTINCT FROM OLD.entity_name        THEN RAISE EXCEPTION 'qbo_webhook_events.entity_name is immutable'; END IF;
  IF NEW.operation          IS DISTINCT FROM OLD.operation          THEN RAISE EXCEPTION 'qbo_webhook_events.operation is immutable'; END IF;
  IF NEW.raw_body           IS DISTINCT FROM OLD.raw_body           THEN RAISE EXCEPTION 'qbo_webhook_events.raw_body is immutable'; END IF;
  IF NEW.intuit_signature   IS DISTINCT FROM OLD.intuit_signature   THEN RAISE EXCEPTION 'qbo_webhook_events.intuit_signature is immutable'; END IF;
  IF NEW.received_at        IS DISTINCT FROM OLD.received_at        THEN RAISE EXCEPTION 'qbo_webhook_events.received_at is immutable'; END IF;

  -- data_payload is set at insert and never rewritten
  IF NEW.data_payload       IS DISTINCT FROM OLD.data_payload       THEN RAISE EXCEPTION 'qbo_webhook_events.data_payload is immutable'; END IF;

  -- processed_at, processed_status, processed_error — one-shot transitions
  IF OLD.processed_at IS NOT NULL AND NEW.processed_at IS DISTINCT FROM OLD.processed_at THEN
    RAISE EXCEPTION 'qbo_webhook_events.processed_at cannot be rewritten once set';
  END IF;
  IF OLD.processed_status IS NOT NULL AND NEW.processed_status IS DISTINCT FROM OLD.processed_status THEN
    RAISE EXCEPTION 'qbo_webhook_events.processed_status cannot be rewritten once set';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS qbo_webhook_events_append_only_trg ON public.qbo_webhook_events;
CREATE TRIGGER qbo_webhook_events_append_only_trg
  BEFORE UPDATE ON public.qbo_webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION public.qbo_webhook_events_enforce_append_only();

-- Also block deletes at the trigger level (RLS is separate belt).
CREATE OR REPLACE FUNCTION public.qbo_webhook_events_block_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'qbo_webhook_events rows are immutable and cannot be deleted';
END;
$$;

DROP TRIGGER IF EXISTS qbo_webhook_events_block_delete_trg ON public.qbo_webhook_events;
CREATE TRIGGER qbo_webhook_events_block_delete_trg
  BEFORE DELETE ON public.qbo_webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION public.qbo_webhook_events_block_delete();

-- =========================================================================
-- Step 5: RLS — no anon, no authenticated. Only service_role writes/reads.
-- =========================================================================
ALTER TABLE public.qbo_webhook_events ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies idempotently
DROP POLICY IF EXISTS qbo_webhook_events_service_role_all ON public.qbo_webhook_events;
CREATE POLICY qbo_webhook_events_service_role_all
  ON public.qbo_webhook_events
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny everything to anon and authenticated by default (no policy => no access under RLS).
-- We intentionally do NOT create any policy for anon or authenticated.

-- =========================================================================
-- Step 6: revoke any default grants
-- =========================================================================
REVOKE ALL ON public.qbo_webhook_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.qbo_webhook_events TO service_role;
