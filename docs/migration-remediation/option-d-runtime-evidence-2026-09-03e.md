# Option D local runtime evidence (BLOCKED — platform freshness/preflight FAIL)

**Date:** 2026-09-03 / UTC 2026-09-04  
**Overall:** `BLOCKED`  
**Stopped on:** `target_not_fresh_disposable_db` **before any Option D SQL apply**  
**sqlApplicationAttempts:** `0`

## Authorization pins (verified before Docker/SQL)

| Input | Value |
|-------|--------|
| PR #313 commit | `d5e44f3ef21078b6d973aac4bf91c4fe3ca26ee8` (draft) |
| Manifest path | `docs/migration-remediation/option-d-replay-manifest.json` |
| Manifest SHA-256 | `dad4032ecefbb79a9d1a61ba8e843f7e7ea10c8fbe721b9de3ffadbb9b61fc29` |
| Byte length | `113084` |
| Entries / assembled SQL | **149** / **149** (assembledSha256 verify **0** failures) |
| PR #312 pin | `f65730b3d38e9cb3b192e54f62c798c74a07a1c2` (draft, unchanged) |
| Suite blob | `6dfc99e23b8206d3d70b19c8a7d4758d22e0f770` (materialized temporarily; removed on cleanup) |
| SKIP_ASSEMBLE | `1` (no regenerate) |
| CLI binding | `2.116.0` |

Immutable pre-write evidence recorded with `sqlApplicationAttempts: 0` before apply.

Note: working-tree manifest was restored to exact committed LF bytes for hash match only (not a regenerate; not committed).

## Platform stack

| Item | Value |
|------|--------|
| Workdir | `C:\Users\mattj\tmp-option-d-platform-only-d5e44f3e` (outside Advisacor repo) |
| CLI | `2.116.0` |
| Docker | `29.7.2` |
| Migrations SQL in workdir | **0** |
| Seed | warn only (`no files matched pattern: supabase/seed.sql`); no Advisacor migrations applied |
| Target | `host=127.0.0.1;port=54322;db=postgres` |
| public application relations | **0** |
| Advisacor migration versions | **0** |

## Stop reason

Freshness / platform prerequisite gate failed (`target_not_fresh_disposable_db`). Failures:

1. **`_realtime` schema** present with relations (`extensions`, `feature_flags`, `schema_migrations`, `tenants`) — not on the bootstrap allowlist (allowlist has `realtime` but not `_realtime`).
2. **`auth.token_expired`** required by platform contract but missing on this CLI `2.116.0` genuine empty-workdir start.

No Option D SQL was applied. Per authorization: **no database patch**, **no code remediation**, **no reorder** during this run.

## Distinct scopes

| Scope | Result |
|-------|--------|
| Candidate replay | **FAIL** (0/149 applied; preflight blocked apply) |
| Security / immutability | **BLOCKED** |
| PR #312 RPC validation | **BLOCKED** |
| Production dashboard parity | `unresolved` |
| Overall | **BLOCKED** |

## Explicit non-actions

No production/cloud access, no merge/deploy, no migration repair, no QBO/OAuth, no live custody/Memory writes, no capability/kill-switch changes, no assemble regenerate, no dump/restore, no PR #312/#313 state change.

## Cleanup

See `docs/migration-remediation/option-d-runtime-cleanup-2026-09-03e.json`.
