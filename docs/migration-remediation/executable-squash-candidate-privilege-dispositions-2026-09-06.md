# Privilege dispositions — executable squash candidate (privilege remediation)

**Not a PASS_SOURCE_REVIEW.** Documents fail-closed dispositions applied in candidate modules after the third Option-2 source review (`CHANGES REQUIRED`).

Machine-readable inventory: `docs/migration-remediation/evidence/executable-squash-candidate-function-privilege-inventory.json`

## Policy

1. Every `CREATE FUNCTION` / `CREATE OR REPLACE FUNCTION` in a slice receives an explicit disposition before that slice’s `COMMIT`.
2. Default PostgreSQL `PUBLIC EXECUTE` is always revoked in the creating slice.
3. `anon` and `authenticated` EXECUTE are revoked unless an evidence-backed allowlist entry exists.
4. `service_role` is re-granted EXECUTE so server callers continue to work.
5. No unclassified function may pass builder refuse or fail-closed tests.

## Classification totals (current sealed package)

See inventory `classCounts`. Expected classes:

| Class | Meaning |
|-------|---------|
| `trigger_only` | Trigger/immutability helpers — not browser RPCs |
| `internal_service_role_only` | Sensitive / SECURITY DEFINER / custody-Memory-SI-execution paths |
| `migration_admin_or_internal` | Fail-closed default when no browser RPC proof |
| `authenticated_rls_helper` | Q8 RLS predicates only (allowlisted) |
| `anonymous_public_rpc` | Empty allowlist — none proven |

## Authenticated RLS helper allowlist

These may retain `EXECUTE` for `authenticated` (and `service_role`) after PUBLIC/anon revoke:

- `public.is_active_company_member(uuid)`
- `public.has_active_company_role(uuid,text[])`
- `public.is_company_admin(uuid)`
- `public.is_active_firm_member(uuid)`
- `public.has_active_firm_role(uuid,text[])`

Provenance: Q8 security slice least-privilege grants for policy evaluation. Not table RPCs.

## Anonymous RPC allowlist

**Empty.** No `lib/` / `app/` browser `.rpc` callers were found. All inventoried `.rpc` call sites use service/admin clients.

## Named sensitive RPCs

### `public.publish_ledger_event`

| Field | Disposition |
|-------|-------------|
| Execute | REVOKE from PUBLIC, anon, authenticated; GRANT service_role |
| Caller | `lib/events/publisher.ts` → `createServiceClient()` |
| Anonymous required? | No |

### `public.increment_share_token_access`

| Field | Disposition |
|-------|-------------|
| Execute | REVOKE from PUBLIC, anon, authenticated; GRANT service_role |
| Caller | `lib/close-packet/share-tokens.js` → `getSupabaseAdmin()` |
| Anonymous required? | No |

## `public.users` table grants

| Role | Disposition |
|------|-------------|
| `anon` | **REVOKE ALL** — no anon client queries `public.users`; signup uses service_role |
| `PUBLIC` | **REVOKE ALL** |
| `authenticated` | **GRANT SELECT, UPDATE** only (matches own-row RLS policies) |
| `service_role` | **GRANT ALL** retained |

RLS is not treated as justification for `GRANT ALL … TO anon`.

## `engagement_posting_policy` ordering

- Source `20260706170000_d6_4c_3_posting_policy_and_remediation.sql` is **FORCE_APP** (filename contains `policy` but creates the table).
- CREATE + ENABLE RLS co-located in module `20260907010031` (create before enable).
- Prepilot firm-member SELECT policy remains later in the same module after CREATE.
- Security module no longer owns the CREATE.

## Negative assertions

Builder refuse + `tests/migration-remediation/executable-squash-candidate-privilege-remediation.test.ts` fail on:

- Missing same-slice PUBLIC revoke
- Unclassified functions
- `GRANT ALL ON public.users TO anon`
- `engagement_posting_policy` ENABLE before CREATE / create in 10035
- Internal function EXECUTE granted to anon
- Digest count ≠ 1
- Manifest/seal drift
- Active migration contamination
