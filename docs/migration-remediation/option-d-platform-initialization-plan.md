# Option D — platform-only local initialization (review plan)

**Mode:** Documentation only — not an authorization to start Docker or apply SQL.  
**CLI observed on this machine:** Supabase CLI `2.116.0` (`C:\Users\mattj\scoop\shims\supabase.exe`).  
**Sources:** installed `supabase start|init|db reset|stop|status --help`; official CLI reference and local workflow docs (links below).

## Decision: selective dump/restore is REJECTED

Selective `pg_dump` of auth/storage (or similar) into a second database is **not** the supported bootstrap path.

It is **not proven** to preserve, without live verification we refuse to claim:

- schema/object ownership  
- grants / default privileges  
- extensions and extension ownership  
- functions and exact signatures  
- platform migration state  
- constraints, indexes, triggers, RLS  
- database-level settings and required roles  

**Rejected alternatives (unchanged):** hand-written fake auth/storage DDL; production data import; cloud/paid branches; applying from the Advisacor repo `supabase/migrations/` tree.

## Why a separate temp project is required

Official CLI behavior (docs + start response example):

- `supabase start` starts the local stack and **applies project migrations**, then may **seed** (`Applying migration …` / `Seeding data supabase/seed.sql…`).  
  Sources: [CLI `supabase start`](https://supabase.com/docs/reference/cli/supabase-start), [Local development workflow](https://supabase.com/docs/guides/local-development/cli-workflows) (“`supabase start` — Starts the local stack, applies migrations + seed”).
- `supabase db reset` recreates local Postgres and applies all files under that project’s `supabase/migrations/` (then seed unless `--no-seed`).  
  Source: installed `supabase db reset --help`; [CLI `supabase db reset`](https://supabase.com/docs/reference/cli/supabase-db-reset).

Therefore starting from the **Advisacor repo workdir** would apply Advisacor application migrations during platform startup. That is forbidden for platform-only bootstrap.

## Supported commands (exact; from installed `--help`)

Pinned CLI: **2.116.0**. Do not invent flags beyond these.

| Step | Command (flags from `--help` only) |
|------|--------------------------------------|
| Create neutral project dir | OS mkdir of an ephemeral path **outside** Advisacor migrations (e.g. sibling `.tmp-option-d-platform-only/`, gitignored) |
| Init | `supabase init --yes` with `--workdir <ephemeral>` (global `--workdir` / `--yes` documented on installed CLI) |
| Ensure empty app lineage | Confirm `<workdir>/supabase/migrations/` has **zero** `.sql` files; remove/disable any seed paths so start cannot load Advisacor seeds |
| Start platform stack | `supabase start --workdir <ephemeral>` |
| Record versions | `supabase --version`; `supabase status -o json --workdir <ephemeral>` (capture DB URL + image/service metadata available in status) |
| Stop / cleanup | `supabase stop --workdir <ephemeral> --no-backup` (deletes data volumes per `--help`) |

Optional exclude list exists (`start -x …`) but is **not** required for platform-only correctness; default start is preferred so Auth/Storage services match a genuine local stack.

## Apply target (genuine platform DB)

**Preferred:** run Option D application SQL against the **same** local database the CLI initialized — the DB URL reported by `supabase status -o json` for the ephemeral workdir (host `127.0.0.1`, port typically `54322`, database name `postgres`) — after preflight proves:

- platform contract PASS (relations/columns/types, functions/signatures, owners/grants/RLS where contracted, extensions, roles);  
- **no** Advisacor application migration versions in `supabase_migrations.schema_migrations`;  
- **no** application sentinel relations in `public`;  
- workdir evidence: empty migrations directory fingerprint.

Disposable naming:

- With `OPTION_D_PLATFORM_ONLY_TARGET=1`, the freshness gate may accept database name `postgres` **only** when the platform-only fingerprint passes.  
- Creating a second `option_d_*` via selective catalog copy remains **rejected**.  
- Full `CREATE DATABASE … TEMPLATE postgres` is **not** adopted in this plan (requires live proof under a future authorization; still not selective dump, but also not needed if applying to the genuine platform DB).

## Freshness reconciliation

| Class | Rule |
|-------|------|
| Platform-managed objects | Present on genuine CLI stack; **positively verified** by expanded contract |
| Application `public` objects | Must be absent before Option D apply |
| Advisacor-shaped migration versions | Must be absent (detect “app migrations applied during platform startup”) |
| Unknown / incomplete platform inventory | Fail closed |
| Selective dump/restore DB | Not a valid target |

## Authorization binding (apply path)

Before assemble or SQL writes:

1. `OPTION_D_AUTHORIZED_COMMIT` must equal current `git rev-parse HEAD`.  
2. `OPTION_D_EXPECTED_MANIFEST_SHA256` must equal SHA-256 of exact on-disk `docs/migration-remediation/option-d-replay-manifest.json` bytes at that commit.  
3. Write immutable pre-write evidence (`option-d-prewrite-authorization-evidence.json`) with commit, path, expected hash, actual hash, `sqlApplicationAttempts: 0`.  
4. `OPTION_D_APPLY=1` requires `OPTION_D_SKIP_ASSEMBLE=1`. Re-running assemble after authorization changes `generatedAt` and **must abort** (require new authorization) rather than accepting regenerated output.

## Cleanup plan (when a future runtime is authorized)

1. `supabase stop --workdir <ephemeral> --no-backup`  
2. Delete ephemeral project directory  
3. Confirm no containers/volumes matching the ephemeral project id  
4. Confirm `:54322` closed  
5. Remove temporary PR #312 suite materialization if any  
6. Leave Docker Desktop / WSL / Scoop / Supabase CLI installed; leave unrelated `.tmp-*` untouched  
7. Do not touch production, PR #312, capabilities, or tracked `supabase/migrations/`

## Contract artifact

`docs/migration-remediation/option-d-platform-prerequisite-contract.json` — generated from all 149 Option D candidate migrations by `audit-option-d-platform-deps.js`, with expanded verification fields consumed by `option-d-platform-bootstrap.js`.

### `schema_migrations` absence (CLI 2.116.0)

Observed on a genuine empty-workdir `supabase start` with CLI **2.116.0**: schemas `auth` / `storage` / `extensions` / `public` are present and Storage/Auth catalogs exist, but **`supabase_migrations.schema_migrations` is absent**.

Policy (`schemaMigrationsPolicy`):

- **Do not fabricate** the relation.
- **If present:** require zero Advisacor application migration versions; nonempty unknown history fails closed.
- **If absent:** accept only when `OPTION_D_PLATFORM_ONLY_TARGET` provenance is verified, CLI version is exactly allowlisted (`2.116.0`), empty-workdir fingerprint passes, Auth/Storage catalogs pass, and platform version evidence is present.
- **Version drift:** any other CLI version with absence → fail closed.

### `_realtime` exact inventory (CLI 2.116.0)

Genuine empty-workdir `supabase start` with CLI **2.116.0** creates schema **`_realtime`** (Realtime service tenant registry — distinct from schema `realtime`). Observed exact relations (kind `r`, owner `supabase_admin`, RLS off):

| Relation | Role |
|----------|------|
| `_realtime.extensions` | Tenant extension registry |
| `_realtime.feature_flags` | Feature-flag registry |
| `_realtime.schema_migrations` | Ecto migrations for Realtime (not `supabase_migrations`) |
| `_realtime.tenants` | Multi-tenant registry |

Policy (`realtimeInternalSchemaPolicy` / `option-d-realtime-internal-schema.js`):

- Allow the schema name on the freshness allowlist **only** with this exact inventory.
- Reject extra, missing, misowned, RLS-enabled, or Advisacor sentinel relations inside `_realtime`.
- On verified platform-only CLI `2.116.0`, absence of `_realtime` fails closed (incomplete platform).
- Do **not** broadly allow `_realtime.*`. Inventory drift fails closed.

### `auth.token_expired` classification

Static audit previously promoted `auth.token_expired` from a **COMMENT** string (`qbo.auth.token_expired` taxonomy in `20260719000000_support_auto_file_engine.sql`). That is **not** an executable `auth.token_expired()` call and the function is **not** present on CLI 2.116.0 platform startup. Reclassified as `non_executing_reference` / string taxonomy — **not** a startup prerequisite. Genuine call-site deps (e.g. `auth.uid()`) remain required.

