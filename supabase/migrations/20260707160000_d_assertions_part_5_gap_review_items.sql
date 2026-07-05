-- D-Assertions Part 5 — Gap → Review Item pipeline
--
-- Non-band-aid guarantees:
-- 1. New close_gap_review_items table (does NOT reuse pre_close_review_items — different semantics).
-- 2. Unique (firm_client_id, close_period_id, account_category, assertion_id) prevents duplicate open gaps.
-- 3. FK to close_periods; RLS mirrors close_assertion_coverage (Part 2/3 pattern) exactly.
-- 4. resolution_status CHECK constrains to a controlled vocabulary; open→resolved is one-way, but
--    an auto_close from re-detection sets status back to 'open' with resolution_status_prior recorded.
-- 5. Idempotent UPSERT-friendly design: worker calls .upsert with onConflict on the natural key.
BEGIN;
CREATE TABLE IF NOT EXISTS close_gap_review_items (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_client_id            uuid NOT NULL REFERENCES firm_clients(id) ON DELETE CASCADE,
  engagement_id             uuid NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  close_period_id           uuid NOT NULL REFERENCES close_periods(id) ON DELETE CASCADE,
  account_category          text NOT NULL,
  assertion_id              text NOT NULL REFERENCES assertions_catalog(assertion_id),
  gap_root_cause_code       text NOT NULL,
  gap_recommendation        text,
  relevance_at_detection    text NOT NULL CHECK (relevance_at_detection IN ('relevant','usually_not_primary')),
  severity                  text NOT NULL DEFAULT 'warning'
                            CHECK (severity IN ('critical','warning','info')),
  -- Open/resolved lifecycle
  resolution_status         text NOT NULL DEFAULT 'open'
                            CHECK (resolution_status IN ('open','resolved_remediated','resolved_deferred','resolved_not_applicable','resolved_stale')),
  resolution_type           text CHECK (resolution_type IN ('manual_test','rule_activation','not_applicable_override','deferred_to_next_period')),
  resolution_metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_by_user_id       uuid,
  resolved_at               timestamptz,
  -- Auto-close audit trail: if worker re-detects an already-resolved gap, we keep the prior status
  resolution_status_prior   text,
  reopened_at               timestamptz,
  -- Bookkeeping
  first_detected_at         timestamptz NOT NULL DEFAULT now(),
  last_projected_at         timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  -- Natural key
  CONSTRAINT close_gap_review_items_natural_key
    UNIQUE (firm_client_id, close_period_id, account_category, assertion_id)
);
CREATE INDEX IF NOT EXISTS close_gap_review_items_engagement_idx
  ON close_gap_review_items (engagement_id, resolution_status, created_at DESC);
CREATE INDEX IF NOT EXISTS close_gap_review_items_open_by_period_idx
  ON close_gap_review_items (close_period_id, resolution_status)
  WHERE resolution_status = 'open';
CREATE INDEX IF NOT EXISTS close_gap_review_items_severity_idx
  ON close_gap_review_items (severity, resolution_status);
COMMENT ON TABLE close_gap_review_items IS
  'D-Assertions Part 5. One row per (firm_client_id, close_period_id, account_category, assertion_id) '
  'representing an assertion-coverage gap that needs reviewer remediation. Parallel to '
  'pre_close_review_items (rule-driven) — gaps have no fire_id/rule_id/je_draft and must not share that table.';
-- Enforce that resolution fields are set together
ALTER TABLE close_gap_review_items
  ADD CONSTRAINT close_gap_review_items_resolution_coherent
  CHECK (
    (resolution_status = 'open' AND resolution_type IS NULL AND resolved_at IS NULL)
    OR
    (resolution_status <> 'open' AND resolution_type IS NOT NULL AND resolved_at IS NOT NULL)
  );
-- RLS: mirror close_assertion_coverage (Part 2). Read: firm reader on engagement.
-- Write: service role only (worker + resolve API use service client).
ALTER TABLE close_gap_review_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY close_gap_review_items_firm_read
  ON close_gap_review_items FOR SELECT
  USING (
    engagement_id IN (
      SELECT e.id FROM engagements e
      JOIN firm_memberships fm ON fm.firm_id = e.firm_id
      WHERE fm.user_id = auth.uid()
    )
  );
CREATE POLICY close_gap_review_items_service_all
  ON close_gap_review_items FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
-- Trigger: bump updated_at on UPDATE
CREATE OR REPLACE FUNCTION close_gap_review_items_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER close_gap_review_items_touch_updated_at
  BEFORE UPDATE ON close_gap_review_items
  FOR EACH ROW EXECUTE FUNCTION close_gap_review_items_touch_updated_at();
COMMIT;
