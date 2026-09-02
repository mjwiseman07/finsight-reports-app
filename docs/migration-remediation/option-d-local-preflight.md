# Option D — local infrastructure preflight (read-only)

**PR #313 HEAD:** `8ad27be6d8260669d9e800aee11397e4bb545988`  
**PR #312 pin (unchanged):** `f65730b3d38e9cb3b192e54f62c798c74a07a1c2`  
**Date:** 2026-09-02  
**Mode:** Read-only inspection only — no installs, starts, creates, deletes, or migration applies.

---

## 1. Tooling status (this machine)

| Component | Status | Evidence |
|-----------|--------|----------|
| Docker Desktop | **NOT INSTALLED** | `C:\Program Files\Docker\Docker\Docker Desktop.exe` → False; `docker` not on PATH |
| Docker Engine | **Unavailable** | No Docker install / no docker service found |
| WSL2 | **NOT INSTALLED** | `wsl -l -v` → “Windows Subsystem for Linux is not installed” |
| Supabase CLI | **NOT INSTALLED** | `supabase` not on PATH; not in `package.json` scripts as a local binary |
| `psql` / `pg_isready` | **NOT INSTALLED** | not on PATH; no `C:\Program Files\PostgreSQL` |
| Node | **OK** | `v22.22.0` |
| npm | **OK** | `11.13.0` |
| Vitest (local) | **OK** | `vitest/4.1.9` (`devDependencies`: `vitest@4.1.9`) |
| `pg` (local) | **OK** | `devDependencies`: `pg@^8.21.0`; `node_modules/pg` present |
| Repo `supabase/config.toml` | **Absent** | No local Supabase project config in this checkout |
| Prior harness probe | Matches | `option-d-runtime-status.json`: `dockerOk: false`, `localPostgres54322: false` |

### Occupied ports (read-only)

No listeners found on `:5432`, `:54322`, `:54321`, `:54323`, `:6543`, `:8000`, `:8443`.

### Existing containers / databases

None detectable (Docker unavailable). No local Postgres service found. **No existing local DB resources to preserve or conflict with.**

---

## 2. Why plain empty Postgres is not equivalent

Option D assembled lineage (baseline + phase1 + post-phase1) assumes a **Supabase-shaped** database:

- Schemas such as `auth` (e.g. `auth.uid()`), plus platform roles (`anon`, `authenticated`, `service_role`)
- Extensions typically provided via Supabase (`pgcrypto` at minimum; often `extensions` schema)
- Optional but expected empty platform schemas on allowlist: `storage`, `realtime`, `graphql*`, `supabase_migrations`, etc.

A brand-new cluster with only `public` will fail many migrations that reference `auth` / roles / extension layouts.

The freshness guard (`option-d-fresh-db-guard.js`) **allows** those platform schemas by name, but requires:

- DB name `option_d_*` (not `postgres`)
- **Empty** `public` relations/functions/types/sequences/triggers (no application DDL yet)
- **Empty** `supabase_migrations.schema_migrations` versions
- No objects in non-allowlisted schemas

So bootstrap must install **platform only**, leave `public` virgin, and leave migration history empty — then the harness applies the Option D assembled set.

---

## 3. Proposed isolated setup (for later authorization — not executed)

### Pinned runtime versions

| Piece | Pin |
|-------|-----|
| PR #313 harness / lineage | `8ad27be6d8260669d9e800aee11397e4bb545988` |
| PR #312 suite commit | `f65730b3d38e9cb3b192e54f62c798c74a07a1c2` |
| PR #312 suite blob | `6dfc99e23b8206d3d70b19c8a7d4758d22e0f770` |
| Suite path | `lib/journal-entry-governance/__tests__/execution-reservation.postgres.integration.test.ts` |
| Node | 22.22.0 (observed) |
| Vitest | 4.1.9 |
| `pg` | ^8.21.0 (lockfile resolve at install time) |
| Supabase CLI | **TBD at install** — pin to a specific CLI release after approval (recommend current stable; record exact `supabase -v` in runtime status) |
| Postgres (via Supabase local) | Whatever image the pinned Supabase CLI ships — record `SHOW server_version` after start |

### Target topology

1. Install **WSL2** (Windows prerequisite for Docker Desktop).
2. Install **Docker Desktop** (WSL2 backend).
3. Install **Supabase CLI** (user-local; version recorded).
4. Use an **ephemeral local Supabase project directory** under a disposable path (e.g. `.tmp-option-d-supabase/` gitignored) with `supabase init` + `supabase start` — **does not** rewrite tracked `supabase/migrations/` or production.
5. On the local Postgres port (typically `127.0.0.1:54322`), create database **`option_d_clean_replay`** only.
6. Bootstrap **into that DB only**:
   - Create allowlisted empty/platform schemas as needed (`auth`, `extensions`, …)
   - Install required extensions (`pgcrypto`, others only if Supabase baseline requires)
   - Create Supabase roles if missing (`anon`, `authenticated`, `service_role`, `supabase_admin` as required by local image)
   - Minimal `auth.uid()` (and related) stubs **only if** not already provided by platform bootstrap — no application tables
7. Confirm freshness inventory PASS **before** any assembled migration apply.
8. Run Option D harness with:
   - `OPTION_D_DISPOSABLE_DB_NAME=option_d_clean_replay`
   - `OPTION_D_DATABASE_URL=…@127.0.0.1:54322/option_d_clean_replay`
   - `OPTION_D_APPLY=1`

### Freshness satisfaction

| Guard requirement | How bootstrap satisfies it |
|-------------------|----------------------------|
| Name `option_d_*` | Dedicated DB `option_d_clean_replay` |
| Allowlisted schemas only | Only create schemas on the documented allowlist |
| Empty `public` app objects | No application DDL until harness apply |
| Empty `schema_migrations` versions | Do not run `supabase db reset` / do not record app migrations into this DB before harness |
| No prod data | Local Docker volume only; never point at production project `jzmdgwwiestcmmeuhhkr` |

---

## 4. PR #312 tests without modifying PR #312 or user work

**Facts**

- Suite **exists in git** at `f65730b3` (`git cat-file` OK).
- Suite is **not on disk** on the remediation branch (`suite_on_disk=no`).
- Harness requires on-disk file **byte-identical** to `f65730b3` content.

**Proposed run method (no PR #312 branch checkout, no commit on #313)**

1. Stay on `chore/supabase-migration-lineage-remediation` @ `8ad27be6`.
2. Materialize the suite **locally and temporarily**:
   ```text
   git show f65730b3:lib/journal-entry-governance/__tests__/execution-reservation.postgres.integration.test.ts
   ```
   → write to that path in the working tree **without staging/committing**.
3. Harness `resolvePr312SuiteProvenance` verifies SHA match to pinned commit.
4. After runtime, **delete or restore** that untracked/local file so the branch tree returns to pre-test state (no PR #312 merge, no commit of the suite onto #313).

Alternative (heavier): a disposable `git worktree` of `f65730b3` used only to copy the one test file — still no modification of PR #312 remote/branch.

Vitest invocation remains harness-owned (`evaluateVitestRunGate`: exit 0 **and** structured 12/12 pass).

---

## 5. Exact plans (pending your single bounded authorization)

### A. Setup plan (requires approval — installs)

1. **You approve** installing:
   - WSL2 (`wsl --install` / reboot if required)
   - Docker Desktop (WSL2 engine)
   - Supabase CLI (pinned version recorded)
2. Agent starts local Supabase in a **gitignored ephemeral dir**.
3. Agent creates **only** `option_d_clean_replay` and platform bootstrap (no app schema).
4. Agent runs freshness precheck; stop if not virgin.

### B. Runtime test plan

1. Assemble Option D set + static gate (already green offline).
2. Materialize PR #312 suite file from `f65730b3` (uncommitted).
3. `OPTION_D_APPLY=1` → harness:
   - fresh-DB guard
   - apply assembled SQL
   - security/RLS/view/behavioral immutability
   - structured Vitest PR #312 suite
4. Persist redacted `option-d-runtime-status.json` (no secrets).
5. Overall `PASS_RUNTIME` only if all three applicable gates PASS; production dashboard parity remains `unresolved`.

### C. Scoped cleanup plan

Delete **only** resources created in this authorization:

| Resource | Cleanup |
|----------|---------|
| DB `option_d_clean_replay` | `DROP DATABASE` on local instance |
| Ephemeral Supabase project dir / local stack | `supabase stop` + remove gitignored dir |
| Docker volumes created for that ephemeral project | remove only those named/labeled for this run |
| Temporary PR #312 suite file on disk | remove / restore working tree |
| **Do not** touch | production, other Docker projects, user DBs, PR #312 branch, tracked migrations, capabilities |

---

## 6. Installation steps that need your approval (blocking)

Nothing further can be done for local runtime until you authorize installs:

1. **Install WSL2** (Microsoft): `wsl --install` (may require reboot).
2. **Install Docker Desktop for Windows** with WSL2 backend; start engine; verify `docker info`.
3. **Install Supabase CLI** for Windows; verify `supabase -v` (pin recorded in status).

Optional (nice-to-have, not strictly required if harness uses `pg` only): install `psql` client.

---

## 7. Requested next authorization (single bounded grant)

After you review this preflight, please authorize **one** bounded local action set:

> Install WSL2 + Docker Desktop + Supabase CLI (if still missing); start an ephemeral local Supabase stack; create and platform-bootstrap only `option_d_clean_replay`; run Option D assemble → apply → security/immutability → PR #312 Vitest at `f65730b3`; write redacted status; then clean up **only** the newly created local test resources (DB, ephemeral stack/volumes, temp suite file). No paid Supabase branches, no production, no merge/deploy, no capability/QBO/Memory changes, PR #312 unchanged.

---

## Verdict

| Gate | Result |
|------|--------|
| Source harness @ `8ad27be6` | Ready for runtime **once** infra exists |
| Local Docker / WSL / Supabase CLI | **BLOCKED — missing** (approval required to install) |
| Existing local DB conflicts | None observed |
| Paid / remote / production | Not used; not proposed |
