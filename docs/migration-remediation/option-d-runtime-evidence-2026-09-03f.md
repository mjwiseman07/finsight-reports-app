# Option D local runtime evidence (BLOCKED — apply FAIL at order 36)

**Date:** 2026-09-03 / UTC 2026-09-04  
**Overall:** `BLOCKED`  
**Stopped on:** `apply_failed` after platform preflight **PASS**  
**sqlApplicationAttempts:** `36` (orders 1–35 applied; failed on attempt for order 36)

## Authorization pins (verified before Docker/SQL)

| Input | Value |
|-------|--------|
| PR #313 commit | `de535f63335e4e73066903bb5d77489c9f8aad99` (draft) |
| Manifest path | `docs/migration-remediation/option-d-replay-manifest.json` |
| Manifest SHA-256 | `dad4032ecefbb79a9d1a61ba8e843f7e7ea10c8fbe721b9de3ffadbb9b61fc29` |
| Byte length | `113084` |
| Entries / assembled SQL | **149** / **149** (assembledSha256 verify **0** failures) |
| PR #312 pin | `f65730b3d38e9cb3b192e54f62c798c74a07a1c2` (draft, unchanged) |
| Suite blob | `6dfc99e23b8206d3d70b19c8a7d4758d22e0f770` (materialized temporarily; removed on cleanup) |
| SKIP_ASSEMBLE | `1` (no regenerate) |
| CLI binding | `2.116.0` |

Immutable pre-write evidence recorded with `sqlApplicationAttempts: 0` before apply.

## Platform stack

| Item | Value |
|------|--------|
| Workdir | `C:\Users\mattj\tmp-option-d-platform-only-de535f63` (outside Advisacor repo) |
| CLI | `2.116.0` |
| Docker | `29.7.2` |
| Migrations SQL in workdir | **0** |
| Seed | warn only (`no files matched pattern: supabase/seed.sql`) |
| Target | `host=127.0.0.1;port=54322;db=postgres` |
| Platform preflight | **PASS** (target-safety, freshness, Auth/Storage, exact `_realtime`, ownership/grants/RLS, functions, roles, extensions, CLI version) |

## Stop reason

Apply failed at **order 36** / `20260707120000_d_assertions_part_1_schema_and_backfill.sql`:

| Field | Value |
|-------|--------|
| SQLSTATE | `23503` |
| Error | insert or update on table `rule_assertion_coverage` violates FK `rule_assertion_coverage_rule_id_fkey` |
| Detail | Key `(rule_id)=(gen.accrual_reversal_check)` is not present in table `curated_rules_registry` |
| completedCount | `35` |

Per authorization: **no database patch**, **no reorder**, **no code remediation**, **no retry** during this run.

## Distinct scopes

| Scope | Result |
|-------|--------|
| Candidate replay | **FAIL** (35/149 applied; stopped at order 36) |
| Security / immutability | **BLOCKED** |
| PR #312 RPC validation | **BLOCKED** |
| Production dashboard parity | `unresolved` |
| Overall | **BLOCKED** |

## Explicit non-actions

No production/cloud access, no merge/deploy, no migration repair, no QBO/OAuth, no live custody/Memory writes, no capability/kill-switch changes, no assemble regenerate, no PR #312/#313 state change.

## Cleanup

See `docs/migration-remediation/option-d-runtime-cleanup-2026-09-03f.json`.
