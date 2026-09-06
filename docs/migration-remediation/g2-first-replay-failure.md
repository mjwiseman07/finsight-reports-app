# G2 first replay failure report

**Status:** Remediated in generator (dependency manifest ordering). Second disposable replay **not yet authorized**.

## Failure summary

| Field | Value |
|-------|-------|
| Verdict | `PR #313 G2 CLEAN REPLAY: CHANGES REQUIRED` (first attempt) |
| Failed branch ref | `ewegbkbknmepmmohdxdw` |
| Failed branch ID | `854c3107-d734-473f-9040-ffb9c20143c9` |
| Branch status | **Deleted and confirmed absent** |
| Production | **Untouched** |
| Baseline blob SHA (GitHub) | `4b955a1d48a0b6d07d2fa6c27e3f6f2dea784f91` |
| SQLSTATE | `42P01` |
| Message | `relation "public.companies" does not exist` |
| Failing source | `20260530_add_account_type_onboarding.sql` |
| Recorded in `schema_migrations` | **No** — transaction rolled back |

## Root cause

The generator at `scripts/migration-remediation/generate-foundations-baseline.js` concatenated 33 pre-phase1 source files using **lexicographic filename sort**. On `20260530_*`, `add_account_type_onboarding` sorted before `create_company_accounts`, so:

```sql
ALTER TABLE public.companies ...
```

ran before:

```sql
CREATE TABLE public.companies ...
```

G1 schema-definition comparison **passed** (production contract matched cumulative column sets) but **did not prove statement execution order**. The first real Supabase branch replay disproved the implicit ordering claim.

## Collateral exposure on disposable branch

During normal Supabase branch initialization (after baseline rollback), Phase 1 migration #1 applied and migration #2 failed, temporarily leaving three empty public tables without RLS. The entire disposable branch was deleted; hourly charges stopped.

## Remediation applied

1. **Explicit dependency manifest:** `docs/migration-remediation/baseline-source-dependency-manifest.json`
2. **Topological phase ordering** replaces filename sort in generator
3. **Fail-closed replay validator:** `scripts/migration-remediation/baseline-sql-analyzer.js` + `validate-baseline-order.js`
4. **Regression tests:** `tests/migration-remediation/baseline-order.test.ts`

## Lexicographic ordering defects (all fixed)

| Defect | Bad order | Fixed by |
|--------|-----------|----------|
| Companies ALTER before CREATE | `add_account_type` #3, `create_company_accounts` #6 | Phase 2 after phase 1 root |
| PDF ALTER before CREATE | `alter_pdf` #10, `create_pdf` #12 | Phase 3 after PDF create |
| SI RLS before SI tables | `add_si_rls` #20, `create_si_*` #21+ | Phase 8 after phase 7 |
| Company memory DDL before core | constraints/indexes/RLS #29–31, core #32 | Phase 9 after core in phase 1 |

## G1 vs G2 status (honest)

| Gate | Status |
|------|--------|
| **G1 schema-definition diff** | PASS (production contract comparison) |
| **G1 dependency-order claim** | **INVALIDATED by G2** — documentation updated |
| **G2 clean replay** | **BLOCKED until review** of ordering remediation |

## Approval for second G2 disposable replay

**Required before creating another Supabase branch:**

1. Review and merge approval of ordering remediation commit on PR #313
2. Local test suite green (`review-gate` + `baseline-order`)
3. `validate-baseline-order.js` reports `ok: true` with `lexicographicOrderReplay.ok: false`
4. Explicit human sign-off to create a **new** data-less disposable branch

Do **not** reuse branch ref `ewegbkbknmepmmohdxdw`.

## Phase 1 RLS exposure (separate finding)

See `docs/migration-remediation/phase1-rls-lineage-proposal.md`. Recovered production evidence is unchanged; durable lineage should enable RLS at CREATE for new public tables where feasible.
