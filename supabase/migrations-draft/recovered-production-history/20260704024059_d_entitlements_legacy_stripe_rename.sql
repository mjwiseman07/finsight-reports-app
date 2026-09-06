-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260704024059
-- NAME: d_entitlements_legacy_stripe_rename
-- DATABASE_MD5_UTF8: 76b4171c8bad53b1ef0965ebf2436366
-- STATEMENT_COUNT: 1
-- STATEMENT_BYTE_LENGTH: 105
-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false
-- CONTAINS_CREDENTIALS: false
-- SUBSTITUTION: none — original statements[1] preserved in order.

BEGIN;
ALTER TABLE IF EXISTS public.stripe_webhook_events RENAME TO stripe_webhook_events_legacy;
COMMIT;