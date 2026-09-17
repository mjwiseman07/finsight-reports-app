# Privilege dispositions — executable squash candidate (users UPDATE + function hardening)

**Not a PASS_SOURCE_REVIEW.** Documents fail-closed dispositions after the fourth source review P0/P1/P2 remediation.

## public.users

| Role | Privileges |
|------|------------|
| anon / PUBLIC | REVOKE ALL |
| authenticated | **SELECT only**; **UPDATE fully revoked** (empty self-service allowlist) |
| service_role | ALL (signup, account PATCH, billing, trial, stripe writers) |

**Evidence:** No browser `.from('users').update` path. `app/api/account` PATCH uses `supabaseAdmin`. Fail-closed: do not column-grant UPDATE when server paths already cover profile writes.

Machine-readable contract: `docs/migration-remediation/evidence/executable-squash-candidate-public-users-column-contract.json`

Protected columns (all `userEditable: false`): id, email, first_name, last_name, business_name, ip_address_signup, trial_used, reports_generated, subscription_status, stripe_customer_id, created_at.

## Function EXECUTE policy

| Class | PUBLIC/anon/authenticated | service_role |
|-------|---------------------------|--------------|
| trigger_only | REVOKED | **REVOKED** (owner/trigger binding) |
| migration_admin_or_internal | REVOKED | **REVOKED** unless proven RPC |
| internal_service_role_only | REVOKED | GRANTED only if name on `SERVICE_ROLE_RPC_NAME_ALLOWLIST` |
| authenticated_rls_helper | PUBLIC/anon REVOKED | authenticated + service_role |
| anonymous_public_rpc | empty allowlist | n/a |

## publish_ledger_event

Every `CREATE OR REPLACE` includes create-time:

`SECURITY DEFINER` + `SET search_path = public, pg_temp`

Forward-tail retains `extensions.digest(..., 'sha256'::text)` + same search_path. PUBLIC/anon/authenticated EXECUTE revoked; service_role granted.
