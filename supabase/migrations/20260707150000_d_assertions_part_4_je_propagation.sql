-- D-Assertions Part 4 — JE post-time assertion propagation
-- Adds assertions_addressed to je_posting_audit and lights up assertion_tags
-- on pre_close_review_items with a validation constraint tied to assertions_catalog.
--
-- Non-band-aid guarantees:
-- 1. Both columns validated by a plpgsql function that reads assertions_catalog,
--    so any typo (e.g. 'complete' instead of 'completeness') fails at write time.
-- 2. GIN indexes on both columns for efficient drill-down queries in Part 5.
-- 3. No backfill of historical rows — historical je_posting_audit rows retain '{}'
--    since the rule → assertion mapping did not exist at their post time.
--    Any retrospective mapping would fabricate evidence and violate the AS 1105
--    reliability chain.
BEGIN;

-- 1. Validation function shared by both tables.
CREATE OR REPLACE FUNCTION validate_assertions_array(assertion_ids text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  a text;
  known_count int;
BEGIN
  IF assertion_ids IS NULL OR array_length(assertion_ids, 1) IS NULL THEN
    RETURN true; -- empty array is valid
  END IF;
  -- reject duplicates
  IF array_length(assertion_ids, 1) <> (SELECT count(DISTINCT x) FROM unnest(assertion_ids) x) THEN
    RETURN false;
  END IF;
  -- every element must exist in assertions_catalog
  SELECT count(*) INTO known_count
    FROM assertions_catalog
   WHERE assertion_id = ANY(assertion_ids);
  RETURN known_count = array_length(assertion_ids, 1);
END;
$$;

-- 2. je_posting_audit.assertions_addressed
ALTER TABLE je_posting_audit
  ADD COLUMN IF NOT EXISTS assertions_addressed text[] NOT NULL DEFAULT '{}';

ALTER TABLE je_posting_audit
  ADD CONSTRAINT je_posting_audit_valid_assertions
  CHECK (validate_assertions_array(assertions_addressed));

CREATE INDEX IF NOT EXISTS je_posting_audit_assertions_gin
  ON je_posting_audit USING gin (assertions_addressed);

COMMENT ON COLUMN je_posting_audit.assertions_addressed IS
  'ISA 315 assertion IDs the posted JE addresses at post time. Sourced from the '
  'originating pre_close_review_items.assertion_tags (rule-driven) or resolved '
  'via curated_rule_fires + rule_assertion_coverage. Historical rows before '
  '2026-07-07 are empty by design — retro-tagging would fabricate evidence.';

-- 3. pre_close_review_items.assertion_tags (column exists from D6.4c-1; add validation + index).
--    The column was defined as text[] with default '{}' but no CHECK constraint. Add both.
ALTER TABLE pre_close_review_items
  ALTER COLUMN assertion_tags SET DEFAULT '{}',
  ALTER COLUMN assertion_tags SET NOT NULL;

ALTER TABLE pre_close_review_items
  ADD CONSTRAINT pre_close_review_items_valid_assertions
  CHECK (validate_assertions_array(assertion_tags));

CREATE INDEX IF NOT EXISTS pre_close_review_items_assertion_tags_gin
  ON pre_close_review_items USING gin (assertion_tags);

COMMENT ON COLUMN pre_close_review_items.assertion_tags IS
  'ISA 315 assertion IDs derived from rule_assertion_coverage at compose time. '
  'Propagated onto je_posting_audit.assertions_addressed when the review item is approved-and-posted.';

-- 4. Data-source reliability basis on je_posting_audit (AS 1105 .10A 2025 amendment).
--    Every propagated assertion must record how the underlying data's reliability was established.
ALTER TABLE je_posting_audit
  ADD COLUMN IF NOT EXISTS data_source_reliability_basis text;

COMMENT ON COLUMN je_posting_audit.data_source_reliability_basis IS
  'PCAOB AS 1105 ¶.10A (2025) reliability basis for the electronic evidence '
  'underlying this JE. Values: qbo_api_authenticated | bank_feed_ocr | plaid_direct | '
  'manual_document_upload | inbound_email_parsed | rule_synthesized_from_qbo_ledger. '
  'Required non-null when assertions_addressed is non-empty.';

-- 5. Enforce reliability-basis-required-when-tagged as a CHECK.
--    Non-band-aid rationale: if a JE claims to address an assertion, AS 1105 requires
--    the reliability basis be documented at the same moment. This is not optional metadata.
ALTER TABLE je_posting_audit
  ADD CONSTRAINT je_posting_audit_reliability_required_when_tagged
  CHECK (
    array_length(assertions_addressed, 1) IS NULL
    OR data_source_reliability_basis IS NOT NULL
  );

COMMIT;
