# Rollout and rollback runbook (DRAFT — do not execute without approval)

## Preconditions

- [ ] Independent schema/security sign-off on remediation PR
- [ ] Phase1 SQL recovered via isolated `migration fetch` (provenance labeled)
- [ ] Production schema diff: baseline DDL vs `information_schema` (read-only)
- [ ] Local empty-DB replay passes (Docker required)
- [ ] GitHub integration configured for preview branches
- [ ] PR #312 remains separate

## Phase 1 — Evidence (read-only)

```bash
npx supabase login
# Isolated fetch — see phase1-provenance.md
```

## Phase 2 — Promote draft to executable migrations (remediation PR merge)

1. Harden `migrations-draft/20260701043599_foundations_baseline.sql`.
2. Add recovered phase1 files to `supabase/migrations/` with **production timestamps**.
3. Reconcile remaining timestamp drift (separate commits; out of scope for initial gate).
4. **Do not** place files in `supabase/migrations/` until this review PR merges.

## Phase 3 — Production (requires explicit approval; guarded)

> **WARNING:** `migration repair` alone does not execute SQL and may not populate `statements[]`. Dashboard preview branches will not replay repair-only rows.

**Option 3a — Idempotent apply (preferred if supported):**

1. Deploy baseline migration through controlled `db push` / CI with dry-run.
2. Verify idempotent DDL is no-op on production objects.
3. Confirm `schema_migrations` row includes `statements` array.

**Option 3b — Squash workflow:**

1. Migration freeze window.
2. `supabase migration squash` per official docs.
3. Verify production + history parity.

**Do not run without on-call DBA approval.**

## Phase 4 — Preview verification (after Phase 3)

1. Create **new** data-less Supabase preview branch (GitHub-integrated).
2. Confirm all migrations apply; RLS enabled on public tables.
3. Run JE-3A Postgres integration gate (PR #312 branch, separate step).

## Rollback

| Step | Action |
|------|--------|
| Git | Revert remediation merge |
| History | `migration repair <version> --status reverted` only with schema proof |
| Schema | Production schema unchanged if baseline was true no-op |
| Previews | Delete failed preview branches |

## Explicitly forbidden without new approval

- `migration repair` without runnable SQL proof for dashboard branches
- Manual table creation on previews
- `db push --include-all` on partial databases
- Copying production data to previews
