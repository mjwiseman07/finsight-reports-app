-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: 20260701043911
-- NAME: phase1_backward_compat_view
-- DATABASE_MD5_UTF8: 6d7ed2de4528c1380dcb0221fc14af39
-- WARNING: NOT AN APPROVED MIGRATION — evidence only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false

-- Phase 1: Backward-compat view for legacy companies.package_level / billing_status
-- Computes tier + status from new entitlements table so existing reads keep working
-- until Phase 1.5 grep-clean.

CREATE OR REPLACE VIEW public.company_billing_compat AS
SELECT
  c.id AS company_id,
  c.practice_id AS firm_id,
  -- Prefer company-scoped entitlement; fall back to firm-scoped entitlement; else legacy column
  COALESCE(
    (SELECT (e.active_tier_keys)[1]
       FROM public.entitlements e
      WHERE e.subscriber_type = 'company' AND e.subscriber_id = c.id
      LIMIT 1),
    (SELECT (e.active_tier_keys)[1]
       FROM public.entitlements e
      WHERE e.subscriber_type = 'firm' AND e.subscriber_id = c.practice_id
      LIMIT 1),
    c.package_level
  ) AS effective_package_level,
  COALESCE(
    (SELECT e.status::text
       FROM public.entitlements e
      WHERE e.subscriber_type = 'company' AND e.subscriber_id = c.id
      LIMIT 1),
    (SELECT e.status::text
       FROM public.entitlements e
      WHERE e.subscriber_type = 'firm' AND e.subscriber_id = c.practice_id
      LIMIT 1),
    c.billing_status
  ) AS effective_billing_status,
  c.package_level AS legacy_package_level,
  c.billing_status AS legacy_billing_status
FROM public.companies c;

COMMENT ON VIEW public.company_billing_compat IS
  'Phase 1 backward-compat view. Prefers new entitlements table; falls back to legacy companies.package_level / billing_status columns. Drop legacy columns in Phase 1.5 after all reads migrated.';
