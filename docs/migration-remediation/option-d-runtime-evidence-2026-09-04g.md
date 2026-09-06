# Option D runtime evidence — 2026-09-04g

Authorized bounded full fresh local Option D replay (platform-only ephemeral CLI 2.116.0).

## Pins

- HEAD / OPTION_D_AUTHORIZED_COMMIT: b1a9c80fa4085eb568aefe8d3f49b3ff1c9714b0
- Manifest SHA-256: 04cd991347959c684293f372418ad6538d2a7ad8715c98caefb760d8789b39ae
- Manifest blob: ddabefe12573bbfd073464a7d220a1e5275ad2c8 (163141 bytes; 150/7)
- PR312: f65730b3d38e9cb3b192e54f62c798c74a07a1c2 / suite blob 6dfc99e23b8206d3d70b19c8a7d4758d22e0f770
- Supabase CLI: 2.116.0
- Workdir: C:\\Users\\mattj\\tmp-option-d-platform-only-b1a9c80f

## Preflight / provenance

- Preflight: OK (.tmp-option-d-preflight-b1a9c80f.json); HEAD contains option-d-pr312-isolated-context.js; replay uses preparePr312IsolatedContext; CLI 2.116.0; PRs 312/313 draft with correct OIDs; tracked worktree clean
- Target provenance: OK (.tmp-option-d-target-provenance-b1a9c80f.json) — loopback 127.0.0.1:54322/postgres; 0 public relations; 0 schema migration versions; platform catalogs present; empty workdir fingerprint; not prod/cloud/pooled/reused

## Result

- overall: BLOCKED
- reason: vitest_nonzero_exit
- scopes:
  - candidateReplay: PASS
  - securityImmutabilityChecks: PASS
  - pr312RpcValidation: FAIL
  - productionDashboardReplayParity: unresolved
- applyResult: migrationsApplied=150, sqlApplicationAttempts=150, applied=true
- Memory / SI behavioral probes: reached and PASS (security.immutability.behavior.ok; alignment/schemaRls/views/triggers/functions all ok)
- PR312: preparePr312IsolatedContext worktree model (git_worktree_detach_pr312_commit); launcher npxUsed=false; cwd/config/root under option-d-pr312-worktree-*; processExitCode=1; structured 0/12 passed (12 skipped — skipped_present / all_skipped_cannot_pass); numFailedTestSuites=2; elapsedMs≈927
- isolatedContext: not a top-level runtime-status field; suiteMaterialization.authority=git_worktree_detach_pr312_commit
- targetRedacted: host=127.0.0.1;port=54322;db=postgres

## Cleanup

- supabase stop --no-backup: exit 0
- workdir removed: true
- dburl file removed: true
- tcp 54322 open after cleanup: false
- matching containers/volumes: none
- leftover option-d-pr312-worktree-* temps: none after cleanup
- left intact: docs/migration-remediation/option-d-runtime-status.json

## PR312 skip root cause (post-run investigation; code-only)

Pinned suite contract (`6dfc99e2…`):

1. `TEST_DB_URL = process.env.JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL`
2. `describeIf = TEST_DB_URL ? describe : describe.skip` wraps the 12 expected titles
3. When URL falsy: additional BLOCKED sentinel describe runs and **passes**
4. When URL truthy: `beforeAll` runs `pg.Client({ connectionString, ssl: { rejectUnauthorized: false } }).connect()`

Reproduced with the exact suite blob + isolated worktree launcher (Vitest 4.1.9):

| Condition | total | skipped | passed | BLOCKED | exit | failedSuites | ~ms |
|---|---:|---:|---:|---|---:|---:|---:|
| JE_REUSE absent | 13 | 12 | 1 | passed | 0 | 0 | — |
| JE_REUSE present + connect fail | **12** | **12** | **0** | absent | **1** | **2** | **~920** |
| **2026-09-04g observed** | **12** | **12** | **0** | absent | **1** | **2** | **927** |

**Exact evaluated reason:** JE_REUSE was truthy (no BLOCKED sentinel). Vitest reported all 12 titles as `status=skipped` after `beforeAll` `client.connect()` failed — not `describe.skip` from a missing env var. Harness security checks used `new Client({ connectionString })` **without** the suite’s `ssl: { rejectUnauthorized: false }`, so same-run security PASS does not prove suite-mirrored connect.

Not remediated in this authorized runtime run (evidence only). Follow-up code remediation: fail-closed allowlist JE_REUSE handoff + suite-mirrored pg probe before Vitest spawn.

HEAD at evidence capture: b1a9c80fa4085eb568aefe8d3f49b3ff1c9714b0.
