# Option D unresolved-reference classification (review)

**No database replay.** Active `supabase/migrations/` and PR #312 unchanged.

Recovered production originals for missing **tables** and required **function identities** are in the Option D **draft** candidate set (`supabase/migrations-draft/recovered-production-history/`). SQL treatment is **original** (no substitution). See `docs/migration-remediation/evidence/option-d-required-creates/` and `evidence/option-d-required-functions/`.

`mergeReady` on the Option D **candidate gate** means `candidateReplayStaticReady` only (fixture scan **and** required table **and** function dependencies resolved). It is **not** overall PR merge and **not** runtime PASS. `prMergeReady` and `runtimeReady` stay false.

No placeholder functions were added. Security lockdown (`major_1_rpc_lockdown` ALTER/REVOKE/GRANT) was **not** removed or guarded away.

## Remaining unresolved — justified exclusion (table)

| # | Object | File | When | Safe if absent? |
|---|--------|------|------|-----------------|
| 1 | table `erp_connections` | `20260717130000_tcp1_w3_erp_connections_disconnected_at.sql` | Only `IF to_regclass('public.erp_connections') IS NOT NULL` | **Yes** — `safe_conditional` |

`requiredCount` = **0** for tables **and** functions. `requiredDependenciesResolved` = true. Candidate static gate may PASS; runtime/PR merge stay false.

## Required functions (major_1 consumers after recovered creators)

| Identity | First creator | Consumers |
|----------|---------------|-----------|
| `public.pilot_lifecycle_events_before_insert()` | `20260804213819` hash_chain_trigger | major_1 REVOKE; later OR REPLACE |
| `public.pilot_lifecycle_events_verify_chain(uuid,uuid)` | `20260804213819` | major_1 REVOKE; later OR REPLACE |
| `public.pilot_lifecycle_events_canonical_payload(text,timestamptz,text,uuid,text,text,text,uuid,uuid,text,uuid,text,text[],jsonb,text,text,jsonb)` | `20260804213819` | major_1 ALTER + REVOKE |
| `public.pilot_lifecycle_events_reject_mutations()` | `20260804213819` | major_1 ALTER + REVOKE |
| `public.sp_write_anchor_batch(int8,int8,int4,text,jsonb,jsonb)` | `20260805005320` anchors | major_1 REVOKE + GRANT |

RLS helpers and `handle_new_auth_user()` already have CREATE in the git candidate set before major_1.

## Graph / analyzer

- Function identities are schema/name/normalized argument types (overloads are distinct).
- `ALTER FUNCTION`, `GRANT`/`REVOKE … ON FUNCTION`, and `CREATE TRIGGER … EXECUTE FUNCTION` consume the identity.
- Same-file CREATE then REVOKE is ordered. Consumer-before-creator without a CREATE is `required_missing_create`.
- `to_regprocedure` / `DROP FUNCTION IF EXISTS` → `safe_conditional` (still listed).
- Recurring_fires order is unchanged (d5 before d6_0).
