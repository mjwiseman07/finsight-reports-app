-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260702041259
-- NAME: add_received_at_to_stripe_webhook_events
-- DATABASE_MD5_UTF8: 36e917a838d7c7919395194e6e5819b9
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 144
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS received_at timestamptz NOT NULL DEFAULT now(); NOTIFY pgrst, 'reload schema';
