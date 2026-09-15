# ESC privilege-remediation fourth independent source review — 2026-09-07

**Verdict: CHANGES REQUIRED**

| Pin | Value |
|-----|-------|
| Reviewed HEAD | `d558c39b4a42540f9c485b30c6b9f0972b4ac500` |
| Seal | `c5c360d8325e2cbfa474d97ea0d33e0f2449ab89820770146def8c4c13da5a37` |
| Prior seal superseded | `74d3b749…` (not selectable as current) |
| Bytes | 1,190,718 |
| Modules | 12 |
| Candidate SQL/manifest byte-identical | **true** |
| Local replay readiness | **NO** |
| Production dump authorized | **NO** |

Review authority: `git cat-file` / `git show` at pinned HEAD only. Candidate SQL and `MANIFEST.json` were not modified.

## Source accounting

`144 unchanged + 6 overlays + 1 forward = 151`

- Digest qualify marker: **exactly once** in forward-tail `20260907010060`
- Missing / duplicated Option D operations: **0**
- Active `supabase/migrations/`: no ESC versions

## Independent function inventory (do not trust committed inventory)

| Metric | Count |
|--------|------:|
| Regex `CREATE [OR REPLACE] FUNCTION` hits | 116 |
| Unique normalized identities | **95** |
| Committed inventory disposition rows | 100 |
| Unclassified identities | **0** |
| Parse failures | **0** |

**Why ~111 / 116 ≠ 100 ≠ 95:** Prior reviews counted create/replace *occurrences* (~111 then; **116** now). Unique identities collapse `OR REPLACE` redefinitions across slices (**95**). The remediation inventory’s **100** rows include five identities listed more than once (multi-slice create/replace bookkeeping), not 100 distinct functions. Independent unique identity count is authoritative for closure.

Parser probes (arrays, defaults, quoted identifiers, multiline, schema-qualified args): pass (see evidence JSON).

### Class totals (independent)

| Class | Count |
|-------|------:|
| trigger_only | 53 |
| internal_service_role_only | 28 |
| migration_admin_or_internal | 9 |
| authenticated_rls_helper | 5 |
| anonymous_public_rpc | **0** |

Exact class counts and per-identity dispositions: `docs/migration-remediation/evidence/executable-squash-candidate-source-review-privilege-2026-09-07.json`.

## Per-class privilege verdict

1. **trigger_only** — PUBLIC/anon/authenticated revoked at create COMMIT (**PASS**). Blanket `GRANT EXECUTE TO service_role` is **unnecessary** (triggers do not require caller EXECUTE) → **P2** hygiene.
2. **internal_service_role_only** — Named RPCs (`publish_ledger_event`, `increment_share_token_access`, JE/gap2 persist paths) have service-role lib callers (**PASS** for those). Not every internal identity was re-proven in this pass; no anon/authenticated net EXECUTE found at COMMIT.
3. **migration_admin_or_internal** — Fail-closed browser revoke (**PASS**); `service_role` grants without demonstrated runtime callers → **P2**.
4. **authenticated_rls_helper** — Allowlist of five Q8 predicates only; required for RLS evaluation (**PASS** with prior Q8 provenance).
5. **anonymous_public_rpc** — Count **0** (**PASS**).

Same-slice / net-at-COMMIT **PUBLIC EXECUTE** gaps: **0**.

## public.users column-security verdict — **FAIL (P0)**

Module `20260907010010` (`esc_public_users_and_foundations_baseline`):

| Check | Result |
|-------|--------|
| Anon ALL / any table grant | **Absent** (overlay + REVOKE) |
| Authenticated INSERT/DELETE grant | **Absent** |
| Authenticated SELECT, UPDATE (table-level) | **Present** |
| Own-row RLS UPDATE policy | **Present** (`auth.uid() = id`) |
| Column-level `GRANT UPDATE (…)` | **Absent** |
| BEFORE UPDATE protecting trigger | **Absent** |

**Privilege-sensitive columns writable by authenticated on own row:**  
`email`, `stripe_customer_id`, `subscription_status`, `trial_used`, `reports_generated`, `ip_address_signup`, `business_name` (plus profile fields).

RLS row ownership is **not** column protection. Escalation path: JWT user updates billing/trial/email on `public.users` where `id = auth.uid()`.

**Required remediation (next auth):** column-level UPDATE allowlist (e.g. `first_name`, `last_name`, `business_name` only) **or** an authoritative BEFORE UPDATE trigger rejecting protected-column changes; keep INSERT/DELETE denied; keep anon denied.

## engagement_posting_policy / RLS boundaries

| Object | Create slice | RLS slice | Same-module closure |
|--------|--------------|-----------|---------------------|
| `engagement_posting_policy` | `20260907010031` | `20260907010031` | **PASS** (CREATE before ENABLE) |
| `curated_rule_fires` | same-module | same-module | **PASS** |
| `gap2_purge_table_registry` | same-module | same-module | **PASS** |

Per-COMMIT cumulative tables without RLS: **0** across all 12 modules.

## Transaction / extension / module size

- App slices + phase1 + security: outer `BEGIN=1` / `COMMIT=1` / no intermediate COMMIT (**PASS**).
- Extensions: treated OK inside PG15/Supabase transactions (see evidence).
- Several app slices ~190–210KB / high statement counts → **HIGH_TIMEOUT_LOCK_RISK_FOR_LOCAL_REHEARSAL** when replay is later authorized (timeouts / per-module timing evidence recommended). Not a source-seal failure.

## DML / platform isolation

- No `auth.*` inserts detected.
- Comparison status remains `PARTIAL_COVERAGE_DOCUMENTED`; `readyForLocalReplay: false`.
- Full production `pg_dump --schema-only` seal remains **mandatory** before local replay.
- Platform Auth/Storage prerequisites remain contract-only in module `10000`.

## Frozen authority

- Option D manifest SHA-256 matches pin `9dc080cf…`.
- `journal_entry_executions` HEAD vs frozen `assembleAuthority.sourceCommit`: drift detected and documented as expected source evolution; candidate not mutated.

## Findings ranked

- **P0** `USERS_AUTHENTICATED_COLUMN_UPDATE_ESCALATION` @ `esc_public_users_and_foundations_baseline` (~L56 grant + L47–51 policy): authenticated table UPDATE without column lock/trigger.
- **P1** `SECURITY_DEFINER_MISSING_SEARCH_PATH` @ create chunk for `publish_ledger_event` in slice `10031` (final lockdown may appear later; verify locked path before every COMMIT that exposes the definer).
- **P2** `TRIGGER_ONLY_SERVICE_ROLE_EXECUTE_GRANTED` (aggregated per module): unnecessary service_role EXECUTE on trigger functions.
- **P2** `MIGRATION_ADMIN_SERVICE_ROLE_GRANT_WITHOUT_CALLER_PROOF` (aggregated): service_role grants without runtime caller proof.

## Tests / secret scan

- Fourth-review harness + ESC privilege/remediation gates: run via review commit tests.
- Secret scan: must be clean (`ok: true`).
- Candidate seal unchanged by this review.

## Next bounded authorization

**Candidate-only fix** for `public.users` column UPDATE safety (column grants and/or immutability trigger), optionally tighten trigger-only / migration-admin `service_role` EXECUTE grants, then **fifth independent source review**.

Do **not** authorize dump, Docker, SQL execution, or active migration changes on this verdict.
