# SECURITY_REGRESSION_BREAK_GLASS_ONLY

## Purpose
Rollback runbook for Stage-1 credential browser containment migration
`supabase/migrations/20260908031736_connection_credential_browser_containment.sql`.

## Label
**SECURITY_REGRESSION_BREAK_GLASS_ONLY**

Applying rollback **reopens the confirmed HIGH-severity browser credential exposure**,
including restoration of the residual SELECT policy
`users can read their accounting connection metadata` plus anon/authenticated grants.

## Artifact
- SQL: `ROLLBACK_SECURITY_REGRESSION_BREAK_GLASS_ONLY.sql`
- Pre-change contract: `PRE_CHANGE_CONTRACT.json` (actual pre-change production state)

## What rollback restores
- Original `qbo_connections_unified` definition (including token columns)
- Original RLS policies (browser ALL / UPDATE / residual SELECT)
- Original grants to `anon`, `authenticated`, `service_role`, `postgres`
- Removes forward-only `service_role_all_quickbooks_connections`

## What rollback must not do
- Restore row data or token values
- Rotate / revoke tokens
- Change environments, Vercel, redirects, or Intuit settings
- Delete connections
- Weaken unrelated objects
