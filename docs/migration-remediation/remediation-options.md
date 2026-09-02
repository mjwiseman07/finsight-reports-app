# Remediation design comparison (review-only)

## A. Earlier baseline migration (idempotent) + proper apply on production

| Criterion | Assessment |
|-----------|------------|
| Dashboard branch runnable SQL | **Only if** `statements[]` populated when recorded; **not** via repair-only |
| GitHub-integrated branch | **Yes** — runs git file on empty DB |
| Production SQL execution | Must run once (idempotent) OR squash; repair-only insufficient |
| Duplicate-object risk | Low with `IF NOT EXISTS` / idempotent patterns |
| Patent #6 | Unaffected if baseline predates ledger/JE |
| Rollback | Revert git + repair revert; schema unchanged if true no-op |
| Supabase-supported | Partially — repair documented; statement backfill not |
| Maintenance | Medium — dual lineage reconciliation still needed |
| **Verdict** | **Accept only with git-integrated previews OR proven statement storage** |

## B. Correct first replayable production migration (phase1 spine)

| Criterion | Assessment |
|-----------|------------|
| Dashboard branch | Requires rewriting stored `statements` for `20260701043602+` |
| Production impact | **High** — mutates already-applied migration bodies in history |
| Risk | History falsification if not exact; breaks `migration fetch` parity |
| **Verdict** | **Reject** — cannot safely rewrite applied migration SQL in place |

## C. Official squash / baseline workflow

| Criterion | Assessment |
|-----------|------------|
| Dashboard branch | **Yes** — new squashed migration with full `statements` |
| Production impact | **Major** — coordinated history reset / squash deploy |
| Duplicate risk | Medium during transition |
| Patent #6 | Preserved if squash includes full schema |
| Rollback | Hard |
| **Verdict** | **Viable** for large drift; requires migration freeze + approval |

## D. Reconstruct history from `migration fetch` + schema diff

| Criterion | Assessment |
|-----------|------------|
| Dashboard branch | **Yes** if fetch returns complete `statements` chain |
| Production impact | Read-only fetch; write only after review |
| Gap | No migration before `20260701043602` in history — fetch cannot recover missing foundation |
| **Verdict** | **Necessary evidence step**, not sufficient alone |

## E. GitHub-integrated preview workflow (recommended component)

| Criterion | Assessment |
|-----------|------------|
| Runnable SQL on fresh branch | **Yes** — documented git `supabase/migrations/` apply |
| Production impact | None until merge + deploy-to-production enabled |
| PR #312 Postgres gate | Suitable target after baseline lands in git |
| **Verdict** | **Recommended** for preview reconstruction |

## F. Schema-only bootstrap outside migration replay

| Criterion | Assessment |
|-----------|------------|
| Runnable SQL | Custom script — not in `schema_migrations` |
| Divergence risk | **High** |
| **Verdict** | **Reject**

---

## Rejected shortcuts

| Shortcut | Why unsafe |
|----------|------------|
| Repair-only baseline on production | No runnable SQL for dashboard replay |
| Manual `firms`/`companies` on preview | Next dependency fails; non-durable |
| `db push --include-all` on partial DB | Divergent schema |
| Mark applied without schema proof | False green |
| Mix into PR #312 | Couples JE feature to infra surgery |

## Recommended package (pending schema diff sign-off)

1. **Harden** `migrations-draft/20260701043599_foundations_baseline.sql` (remove backfills, fix transaction nesting).
2. **Recover** phase1 SQL via isolated `migration fetch` (provenance: `FETCHED_PRODUCTION`).
3. **Promote** to `supabase/migrations/` on remediation PR merge (not before).
4. **Enable** GitHub integration previews for PR gates.
5. **Production apply** via idempotent one-time execution recording `statements`, or approved squash.
6. **Verify** new data-less branch after independent sign-off (not in this PR).
