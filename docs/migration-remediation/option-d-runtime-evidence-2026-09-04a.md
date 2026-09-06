# Option D local runtime evidence (BLOCKED — apply FAIL at order 107)

**Date:** 2026-09-04  
**Overall:** `BLOCKED`  
**Stopped on:** `apply_failed` after platform preflight **PASS**  
**sqlApplicationAttempts:** `107` (orders 1–106 applied; failed on attempt for order 107)

## Authorization pins (verified before Docker/SQL)

| Input | Value |
|-------|--------|
| PR #313 commit | `3be1765c0d7bda50913b55421541aa8e55cf9c11` (draft) |
| Manifest path | `docs/migration-remediation/option-d-replay-manifest.json` |
| Manifest SHA-256 (LF git blob via Node `git cat-file`) | `12f2a06ecc977289fc44b69145eccff8dd6273571e265e6be3e027f17160425f` |
| Byte length | `114566` |
| Entries / substitutions / assembled SQL | **149** / **7** / **149** (assembledSha256 verify **0** failures) |
| PR #312 pin | `f65730b3d38e9cb3b192e54f62c798c74a07a1c2` (draft, unchanged) |
| Suite blob | `6dfc99e23b8206d3d70b19c8a7d4758d22e0f770` (materialized temporarily; removed on cleanup) |
| SKIP_ASSEMBLE | `1` (no regenerate) |
| CLI binding | `2.116.0` |

Immutable pre-write evidence recorded with `sqlApplicationAttempts: 0` and matching LF blob hash before apply.

## Platform stack

| Item | Value |
|------|--------|
| Workdir | `C:\Users\mattj\tmp-option-d-platform-only-3be1765c` (outside Advisacor repo) |
| CLI | `2.116.0` |
| Docker | `29.7.2` |
| Migrations SQL in workdir | **0** |
| Target | `host=127.0.0.1;port=54322;db=postgres` |
| Platform preflight | **PASS** (apply reached order 107) |

## Progress vs prior failures

| Prior | This run |
|-------|----------|
| Order 36 rule-seed FK | **Cleared** |
| Order 89 view 42P16 | **Cleared** (production DROP+CREATE substitution applied) |
| — | Fail order **107** `public.users` missing |

## Stop reason

Apply failed at **order 107** / `20260727000100_users_auth_trigger_single_writer.sql`:

| Field | Value |
|-------|--------|
| SQLSTATE | `42P01` |
| Error | relation `"public.users"` does not exist |
| completedCount | `106` |

Per authorization: **no database patch**, **no reorder**, **no code remediation**, **no retry** during this run.

## Distinct scopes

| Scope | Result |
|-------|--------|
| Candidate replay | **FAIL** (106/149 applied; stopped at order 107) |
| Security / immutability | **BLOCKED** |
| PR #312 RPC validation | **BLOCKED** |
| Production dashboard parity | `unresolved` |
| Overall | **BLOCKED** |

## Explicit non-actions

No production/cloud access, no merge/deploy, no migration repair, no QBO/OAuth, no live custody/Memory writes, no capability/kill-switch changes, no assemble regenerate, no PR #312/#313 merge.

## Cleanup

See `docs/migration-remediation/option-d-runtime-cleanup-2026-09-04a.json`.
