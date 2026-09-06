# Option D local runtime evidence (BLOCKED — preflight tooling crash)

**Date:** 2026-09-03 / UTC 2026-09-04  
**Overall:** `BLOCKED`  
**Stopped on:** platform-prerequisite preflight crash **before any Option D SQL apply**  
**sqlApplicationAttempts:** `0`

## Authorization pins (verified before Docker/SQL)

| Input | Value |
|-------|--------|
| PR #313 commit | `53ff435ff6a596cc6d3ef409c18e48825c4a8205` (draft) |
| Manifest path | `docs/migration-remediation/option-d-replay-manifest.json` |
| Manifest SHA-256 | `dad4032ecefbb79a9d1a61ba8e843f7e7ea10c8fbe721b9de3ffadbb9b61fc29` |
| Byte length | `113084` |
| Entries / assembled SQL | **149** / **149** (assembledSha256 verify **0** failures) |
| PR #312 pin | `f65730b3d38e9cb3b192e54f62c798c74a07a1c2` |
| Suite blob | `6dfc99e23b8206d3d70b19c8a7d4758d22e0f770` |
| SKIP_ASSEMBLE | `1` (no regenerate) |

Immutable pre-write evidence recorded with `sqlApplicationAttempts: 0` before apply.

Note: working-tree manifest was CRLF-smudged by Git autocrlf; exact committed LF bytes were restored on disk for hash match only (not a regenerate; not committed).

## Platform stack

| Item | Value |
|------|--------|
| Workdir | `C:\Users\mattj\tmp-option-d-platform-only-53ff435f` (outside Advisacor repo) |
| CLI | `2.116.0` |
| Docker | `29.7.2` |
| Migrations SQL in workdir | **0** |
| Seed | warn only (`no files matched pattern: supabase/seed.sql`); no Advisacor migrations applied |
| Postgres | `17.6` |
| Target | `host=127.0.0.1;port=54322;db=postgres` |

### Live catalog probe (read-only)

| Object | Present |
|--------|---------|
| `storage.buckets` | yes |
| `storage.objects` | yes |
| `auth.users` | yes |
| `supabase_migrations` schema | **absent** |
| `supabase_migrations.schema_migrations` | **null** |
| public application relations | **0** |

## Stop reason

`evaluatePlatformBootstrap` threw:

`TypeError: (c.columns || []).map is not a function`

Cause: `pg` returned `array_agg(...)` constraint columns as a **string** (e.g. `"{bucket_id}"`), not a JS array. No Option D SQL was applied.

Per authorization: **no code remediation** and **no database patch** during this run.

Even after a fix, contract currently requires `supabase_migrations.schema_migrations`; that relation was **absent** on this CLI `2.116.0` platform-only start — would need separate review.

## Distinct scopes

| Scope | Result |
|-------|--------|
| Candidate replay | **BLOCKED** (0/149 applied) |
| Security / immutability | **BLOCKED** |
| PR #312 RPC validation | **BLOCKED** |
| Production dashboard parity | `unresolved` |
| Overall | **BLOCKED** |

## Explicit non-actions

No production/cloud access, no merge/deploy, no migration repair, no QBO/OAuth, no live custody/Memory writes, no capability changes, no commit of runtime remediation, no assemble regenerate, no dump/restore of auth/storage.

## Cleanup

See `docs/migration-remediation/option-d-runtime-cleanup-2026-09-03d.json`.
