# Branch replay: how migration SQL becomes authoritative

**Status:** Review-only design note. No production mutations performed.

## Executive finding (blocking)

`supabase migration repair --status applied` updates **tracking history only** and does **not** execute SQL ([Supabase database migrations guide](https://supabase.com/docs/guides/deployment/database-migrations)).

Therefore, a remediation that only:

1. adds a baseline file to git, and
2. marks `20260701043599` as applied on production via `migration repair`,

**does not prove** dashboard-created preview branches can reconstruct schema — unless the repair row also carries runnable `statements` (not documented; inferred **false** from CLI behavior and repair semantics).

**Do not accept repair-only baseline for dashboard/MCP branch creation.**

---

## `supabase_migrations.schema_migrations` structure

From Supabase CLI / Postgres dumps (public issue evidence, e.g. [supabase/cli#1850](https://github.com/supabase/cli/issues/1850)):

| Column | Type | Role |
|--------|------|------|
| `version` | `text` PK | Migration timestamp id |
| `name` | `text` | Migration name |
| `statements` | `text[]` | Executable SQL fragments applied when migration originally ran |

Normal apply path (`db push`, migration runner) inserts:

```sql
INSERT INTO supabase_migrations.schema_migrations(version, name, statements) VALUES($1, $2, $3)
```

`supabase migration fetch` writes files **from this table** ([branch troubleshooting guide](https://supabase.com/docs/guides/troubleshooting/branch-in-migrations-failed-status)).

### Read-only verification still required

After `npx supabase login`, run in an isolated temp directory (never overwrite repo `supabase/migrations/`):

```bash
mkdir /tmp/supabase-fetch-isolated && cd /tmp/supabase-fetch-isolated
supabase init
supabase link --project-ref jzmdgwwiestcmmeuhhkr
supabase migration fetch --linked
```

Then inspect fetched files for `20260701043602` and whether any row exists before it.

Also query metadata (no row data):

```sql
SELECT version, name,
       COALESCE(array_length(statements, 1), 0) AS statement_count
FROM supabase_migrations.schema_migrations
ORDER BY version
LIMIT 10;
```

---

## Two branch-creation paths (do not conflate)

### Path 1: Dashboard / API / MCP preview branch

Documented behavior ([MIGRATIONS_FAILED troubleshooting](https://supabase.com/docs/guides/troubleshooting/branch-in-migrations-failed-status)):

> Preview Branch is created … by **replaying the migration history** from your `main` branch against a fresh database.

Postgres logs show `execute:` lines per statement — consistent with replaying stored `statements[]` from `schema_migrations`, not git files.

**Implication:** History rows without `statements` are not replayable. Repair-only rows are history falsification for this path.

### Path 2: GitHub integration preview branch

Documented behavior ([GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration)):

> Its database schema is not cloned. Instead, it is **built from the migrations you commit to your repository**.

> The migrations in the `migrations` subdirectory … are automatically run when the branch is created.

**Implication:** Runnable SQL comes from **git** `supabase/migrations/*.sql`. Production `repair` does not need to store statements for this path, but git must contain the full ordered lineage.

---

## What happened to `pr312-je3a-rpc-test`

| Fact | Evidence |
|------|----------|
| Created via MCP/API (`create_branch`), not GitHub auto-branch | Prior session |
| `with_data=false`, replay from empty DB | User-confirmed |
| Only `20260701043602_phase1_subscriptions_core` applied | MCP `list_migrations` |
| Failed at `20260701043707` — `public.firms` missing | Postgres error |
| Three subscription tables existed; RLS disabled on failed partial state | Prior inspection; branch now deleted |

This matches **Path 1** replay of production history starting at phase1, with **no foundation migration** in recorded history.

---

## Runnable SQL requirements by remediation design

| Design | Dashboard branch SQL source | Repair-only sufficient? |
|--------|----------------------------|-------------------------|
| A. Earlier baseline + repair on prod | Needs `statements[]` OR git integration | **No** (repair alone) |
| B. Fix first replayable migration | Same | Depends on apply path |
| C. Squash/baseline workflow | New squashed file + history reset | Requires supported squash rollout |
| D. Reconstruct history from fetch | Fetched `statements` per version | Only if complete chain fetchable |
| E. GitHub-integrated previews | Git `supabase/migrations/` | Repair on prod optional for previews |
| F. External bootstrap | Out of band | **No** — two sources of truth |

---

## Recommended durable direction (pending sign-off)

**Primary:** **Design E + A** — GitHub-integrated preview branches + versioned baseline in `supabase/migrations/` (draft currently in `migrations-draft/`).

**Production rollout:** Baseline must be introduced through a path that either:

- executes once on production as idempotent DDL and records `statements` (preferred), or
- uses an official **squash/baseline** workflow (Design C) if history surgery is approved.

**Reject:** `migration repair --status applied` alone for baseline on production when dashboard branches are in scope.

---

## Open question for Supabase Support (if fetch inspect inconclusive)

> When `migration repair --status applied <version>` is used, does the inserted `schema_migrations` row include the `statements` array from a local file, or only `(version, name)`? Do dashboard preview branches replay from `statements[]`, linked git migrations, or both?
