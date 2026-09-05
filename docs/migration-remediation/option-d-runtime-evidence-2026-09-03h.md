# Option D local runtime evidence (BLOCKED — apply FAIL at order 89)

**Date:** 2026-09-03 / UTC 2026-09-04  
**Overall:** `BLOCKED`  
**Stopped on:** `apply_failed` after platform preflight **PASS**  
**sqlApplicationAttempts:** `89` (orders 1–88 applied; failed on attempt for order 89)

## Authorization pins (verified before Docker/SQL)

| Input | Value |
|-------|--------|
| PR #313 commit | `bf2092b0ccdfb49daff329775972fd0a4ae1fde9` (draft) |
| Manifest path | `docs/migration-remediation/option-d-replay-manifest.json` |
| Manifest SHA-256 (LF git blob via Node `git cat-file`) | `6167fe3140cff39a84cadf11025358f50e8d5f83e9d2420de58b4c211c0140c6` |
| Byte length | `113577` |
| Entries / assembled SQL | **149** / **149** (assembledSha256 verify **0** failures) |
| PR #312 pin | `f65730b3d38e9cb3b192e54f62c798c74a07a1c2` (draft, unchanged) |
| Suite blob | `6dfc99e23b8206d3d70b19c8a7d4758d22e0f770` (materialized temporarily; removed on cleanup) |
| SKIP_ASSEMBLE | `1` (no regenerate) |
| CLI binding | `2.116.0` |

Immutable pre-write evidence recorded with `sqlApplicationAttempts: 0` and matching LF blob hash before apply.

## Platform stack

| Item | Value |
|------|--------|
| Workdir | `C:\Users\mattj\tmp-option-d-platform-only-bf2092b0` (outside Advisacor repo) |
| CLI | `2.116.0` |
| Docker | `29.7.2` |
| Migrations SQL in workdir | **0** |
| Target | `host=127.0.0.1;port=54322;db=postgres` |
| Platform preflight | **PASS** (apply reached order 89) |

## Progress vs prior failure

| Prior (03f @ de535f63) | This run (03h @ bf2092b0) |
|------------------------|---------------------------|
| Fail order **36** Part 1 / FK `gen.accrual_reversal_check` | **Cleared** — 88 migrations applied |
| — | Fail order **89** AR tie-out view rename |

## Stop reason

Apply failed at **order 89** / `20260720170000_ar_tieout2_runs_and_variances.sql`:

| Field | Value |
|-------|--------|
| SQLSTATE | `42P16` |
| Error | cannot change name of view column `"tie_out_state"` to `"last_tie_out_run_id"` |
| Hint | Use `ALTER VIEW ... RENAME COLUMN ...` to change name of view column instead |
| completedCount | `88` |

Per authorization: **no database patch**, **no reorder**, **no code remediation**, **no retry** during this run.

## Distinct scopes

| Scope | Result |
|-------|--------|
| Candidate replay | **FAIL** (88/149 applied; stopped at order 89) |
| Security / immutability | **BLOCKED** |
| PR #312 RPC validation | **BLOCKED** |
| Production dashboard parity | `unresolved` |
| Overall | **BLOCKED** |

## Explicit non-actions

No production/cloud access, no merge/deploy, no migration repair, no QBO/OAuth, no live custody/Memory writes, no capability/kill-switch changes, no assemble regenerate, no PR #312/#313 merge/state change beyond evidence commit.

## Cleanup

See `docs/migration-remediation/option-d-runtime-cleanup-2026-09-03h.json`.
