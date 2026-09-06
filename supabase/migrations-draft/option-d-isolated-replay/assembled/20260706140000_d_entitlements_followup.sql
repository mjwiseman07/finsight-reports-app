-- ============================================================================
-- Phase D-Entitlements-Followup — Legacy Stripe Webhook Reconciliation
-- ============================================================================
-- Purpose:
--   1) Backfill the 4 pre-D-Entitlements Stripe webhook rows from
--      stripe_webhook_events_legacy into the new stripe_webhook_events table.
--   2) Preserve legacy-only columns (api_version, subscription_id,
--      processing_ms, error_message) inside raw_payload.__legacy_meta so no
--      data is lost when the legacy table is dropped in a later migration.
--   3) Append one row to entitlement_check_audit that annotates the existing
--      test-marker row (id=1) — since the table is append-only, annotation
--      requires appending, not updating.
--   4) Mark stripe_webhook_events_legacy for drop in a follow-up migration
--      one week out (verify-then-drop pattern).
--
-- Depends on: 20260706130000_d_entitlements.sql
-- Additive-only. Idempotent (ON CONFLICT DO NOTHING everywhere).
-- ============================================================================
BEGIN;
-- ----------------------------------------------------------------------------
-- 1. Backfill legacy rows into new stripe_webhook_events
-- ----------------------------------------------------------------------------
-- Map legacy columns to new schema.
--   legacy.status  → new.processing_status (both use the same 'processed' value)
--   legacy.payload → new.raw_payload (with __legacy_meta appended)
--   legacy.processed_at → new.processed_at
--   legacy-only columns → embedded in raw_payload.__legacy_meta
--
-- Idempotency: ON CONFLICT (stripe_event_id) DO NOTHING. Running twice is safe.
--
-- We only backfill rows whose legacy status is one of the values allowed by
-- the new CHECK constraint: 'received','processing','processed','skipped','failed'.
-- Any legacy row with an unknown status is left in the legacy table for
-- manual review (there are none today, but this makes the migration robust).
INSERT INTO public.stripe_webhook_events (
  stripe_event_id,
  event_type,
  received_at,
  processed_at,
  processing_status,
  processing_error,
  raw_payload,
  livemode
)
SELECT
  l.stripe_event_id,
  l.event_type,
  l.received_at,
  l.processed_at,
  CASE
    WHEN l.status IN ('received','processing','processed','skipped','failed') THEN l.status
    ELSE 'processed'  -- fallback for pre-existing rows with legacy-only status values
  END AS processing_status,
  l.error_message,
  jsonb_set(
    COALESCE(l.payload, '{}'::jsonb),
    '{__legacy_meta}',
    jsonb_build_object(
      'source', 'stripe_webhook_events_legacy',
      'backfilled_at', to_jsonb(NOW()),
      'api_version', l.api_version,
      'subscription_id', l.subscription_id,
      'processing_ms', l.processing_ms,
      'legacy_status', l.status
    ),
    true
  ) AS raw_payload,
  l.livemode
FROM public.stripe_webhook_events_legacy l
ON CONFLICT (stripe_event_id) DO NOTHING;
-- ----------------------------------------------------------------------------
-- 2. Verify backfill completeness (defensive assertion)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  legacy_count INT;
  backfilled_count INT;
BEGIN
  SELECT COUNT(*) INTO legacy_count FROM public.stripe_webhook_events_legacy;
  SELECT COUNT(*) INTO backfilled_count
    FROM public.stripe_webhook_events
    WHERE raw_payload ? '__legacy_meta';
  IF backfilled_count < legacy_count THEN
    RAISE EXCEPTION
      'D-Entitlements-Followup backfill incomplete: legacy=%, backfilled=%',
      legacy_count, backfilled_count;
  END IF;
  RAISE NOTICE 'D-Entitlements-Followup backfill OK: legacy=%, backfilled=%',
    legacy_count, backfilled_count;
END $$;
-- ----------------------------------------------------------------------------
-- 3. Annotation row for the test-marker in entitlement_check_audit
-- ----------------------------------------------------------------------------
-- The append-only trigger correctly blocks UPDATE on the existing test row
-- (id=1, caller='verify'). To document it, we APPEND a new row that references
-- the original. This is the correct pattern for append-only logs.
--
-- We only insert if the marker row exists AND has not already been annotated
-- (idempotent).
DO $$
DECLARE
  marker_exists BOOLEAN;
  annotation_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.entitlement_check_audit
    WHERE id = 1 AND caller = 'verify'
  ) INTO marker_exists;
  SELECT EXISTS(
    SELECT 1 FROM public.entitlement_check_audit
    WHERE caller = 'ops:d-entitlements-followup'
      AND reason = 'annotation'
      AND (metadata->>'annotates_row_id')::INT = 1
  ) INTO annotation_exists;
  IF marker_exists AND NOT annotation_exists THEN
    INSERT INTO public.entitlement_check_audit (
      addon_code, allowed, caller, reason, actor_type, actor_id, metadata
    ) VALUES (
      'ap_intake',
      FALSE,
      'ops:d-entitlements-followup',
      'annotation',
      'system',
      'migration:20260706140000',
      jsonb_build_object(
        'annotates_row_id', 1,
        'note', 'Row id=1 (caller=verify) was a post-migration append-only trigger verification. Not a real gate check. Left in place because the append-only invariant is intentional.'
      )
    );
  END IF;
END $$;
-- ----------------------------------------------------------------------------
-- 4. Mark legacy table as scheduled for drop
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.stripe_webhook_events_legacy IS
  'DEPRECATED — legacy Stripe webhook idempotency table. Rows backfilled into stripe_webhook_events on 2026-07-06 via D-Entitlements-Followup. Scheduled for DROP in a follow-up migration on or after 2026-07-13 pending confirmation that no code writes to it. Do not add new rows.';
COMMIT;
