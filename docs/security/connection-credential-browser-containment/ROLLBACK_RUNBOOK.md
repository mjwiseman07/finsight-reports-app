# SECURITY_REGRESSION_BREAK_GLASS_ONLY

## Purpose
Rollback runbook for Stage-1 credential browser containment migration
`supabase/migrations/20260908031736_connection_credential_browser_containment.sql`.

## Label
**SECURITY_REGRESSION_BREAK_GLASS_ONLY**

Applying rollback **reopens the confirmed HIGH-severity browser credential exposure**.
Use only when an immediate material production outage cannot be resolved safely.

## Artifact
- SQL: `ROLLBACK_SECURITY_REGRESSION_BREAK_GLASS_ONLY.sql`
- Pre-change contract: `PRE_CHANGE_CONTRACT.json`

## What rollback restores
- Original `qbo_connections_unified` definition (including token columns)
- Original RLS policies (including browser ALL / UPDATE)
- Original grants to `anon`, `authenticated`, `service_role`, `postgres`

## What rollback must not do
- Restore row data or token values
- Rotate / revoke tokens
- Change environments, Vercel, redirects, or Intuit settings
- Delete connections
- Weaken unrelated objects

## Apply gate (production)
1. Independent incident owner approval recorded.
2. Confirm outage is caused by Stage-1 privilege removal.
3. Prefer temporary service-role-only app hotfix over privilege rollback when possible.
4. If rollback is unavoidable, apply the SQL artifact then schedule immediate re-containment.
