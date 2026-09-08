# QuickBooks canonical credential write concurrency (CAS)

**Base:** `origin/main` @ `9b519165` (PR #316 merged)  
**Branch:** `security/qbo-canonical-token-write-concurrency`  
**Not in scope:** PR #314 / #315, sandbox host creation, schema/migrations, OAuth execution.

## State machine

```
read snapshot (id, user, realm, updated_at[, refresh_token])
        │
        ▼
 provider refresh / OAuth token exchange (in memory)
        │
        ▼
 conditional UPDATE … WHERE binding + status + superseded IS NULL
   + credentials_cleared_at IS NULL + updated_at = snapshot
   [+ refresh_token = snapshot.refresh for refresh writers]
        │
   ┌────┴────┐
   │         │
 1 row     0 rows
 success   stale_connection_state → discard in-memory credentials
           do not retry with same refresh result
           OAuth: typed failure; require fresh operator OAuth
 >1 row    invariant_multiple_rows (fail closed)
```

## Shared predicates

| Predicate | Refresh writers | OAuth existing-row update |
|-----------|-----------------|---------------------------|
| `id` | yes | yes |
| `provider='quickbooks'` | yes | yes |
| `user_id` | yes | yes |
| `tenant_or_realm_id` | yes | yes |
| `status` (expected) | `connected` | snapshot status |
| `superseded_by_connection_id IS NULL` | yes | yes |
| `credentials_cleared_at IS NULL` | yes | yes |
| `updated_at = concurrencyToken` | yes | yes |
| `refresh_token = original` | **yes** | no (grant rotation) |
| Sets `provider_environment` | **never** | only with signed OAuth provenance |

Inserts remain a separate path with uniqueness / ambiguity protection. A stale CAS conflict **never** becomes an insert.

## Consumed OAuth code loses CAS race

Intuit authorization codes are single-use. If callback exchange succeeds but CAS persist returns `stale_connection_state`, the callback redirects with `qbError=connection_conflict`, clears OAuth cookies, and **does not** replay the code. The operator must start a **new** connect/reconnect.

## Why timing-only windows are insufficient

Hourly `/api/quickbooks/cdc` can select a realm winner and hold a refresh result across a callback. Without CAS (and refresh-token equality on refresh writers), a late CDC persist can overwrite newer OAuth credentials. Clock skew relative to `:00` does not eliminate that race.

## Residual risks

- Legacy `erp_connections` / `quickbooks_connections` refresh paths remain unconditional (intentional until #315).
- Non-credential `updated_at` writers (metadata/disconnect) can still advance `updated_at` and cause refresh CAS misses (fail closed — safe).
- Xero credential refresh is out of scope.
- No schema version column; concurrency relies on `updated_at` ISO equality as stored by PostgREST.

## Target #2 sandbox reconnect relationship

This PR is the **CODE_HARDENING_REQUIRED** gate from the sandbox reconnect plan. After merge + deploy, a dedicated sandbox host with correct `QB_REDIRECT_URI` is still required before target `d331891f0424` OAuth execute. Timing-only reconnect remains insufficient even with this CAS; CAS is what makes concurrent CDC safe.

## Capability controls

Unchanged: PREPARE/CREATE/VERIFY, Memory, worker, GOVERNED_AUTO remain OFF; no dormant feature activation; no dispatch control changes.
