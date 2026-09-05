# Option D runtime evidence — 2026-09-05a

Authorized bounded full fresh local Option D replay (platform-only ephemeral CLI 2.116.0).

## Pins

- HEAD / OPTION_D_AUTHORIZED_COMMIT: 8a2a43d5a12bb604ef5ffd273fc8478e52db538c
- Manifest SHA-256: 04cd991347959c684293f372418ad6538d2a7ad8715c98caefb760d8789b39ae
- Manifest blob: ddabefe12573bbfd073464a7d220a1e5275ad2c8 (163141 bytes; 150/7)
- PR312: 7f387fe0b662e07ad271ee9db7311eeb45eafc25
- Suite blob: d4afe0584d089d4ad50d479b81a369ca6dbdd168
- Resolver blob: 5178894fc6811d9f9fef84b10fb9294504b4679e
- Supabase CLI: 2.116.0
- Workdir: C:\\Users\\mattj\\tmp-option-d-platform-only-8a2a43d5

## Preflight / provenance

- Preflight: OK (`.tmp-option-d-preflight-8a2a43d5.json`); HEAD/manifest/entry blobs/materialize match; PR312 suite + resolver blobs match; tracked worktree clean; PRs 312/313 draft with correct OIDs; CLI 2.116.0; `sqlApplicationAttempts: 0` before Docker
- Target provenance: OK (`.tmp-option-d-target-provenance-8a2a43d5.json`) — loopback 127.0.0.1:54322/postgres; 0 public relations; 0 schema migration versions; platform catalogs present; empty workdir fingerprint; not prod/cloud/pooled

## Result

- overall: **BLOCKED**
- reason: `vitest_nonzero_exit` (PR #312 structured gate fail)
- scopes:
  - candidateReplay: **PASS** (150/150 applied; git_cat_file_blob)
  - securityImmutabilityChecks: **PASS** (alignment/schemaRls/views/triggers/behavior/functions)
  - pr312RpcValidation: **FAIL**
  - productionDashboardReplayParity: unresolved

### PR #312 gate detail

- Detached worktree materialization: PASS (suite blob `d4afe058…`; authority `git_worktree_detach_pr312_commit`)
- Allowlist JE_REUSE handoff: PASS — `sslmodeDisableAppended: true`; redacted `host=127.0.0.1;port=54322;db=postgres`
- TCP connectivity: PASS
- Suite-mirrored resolver probe: **PASS** — `transport=plaintext_loopback`, `sslIsFalse=true`
- Vitest launch: process.execPath + local `vitest.mjs`, shell:false, worktree root/config
- Vitest result: exit 1; **12 skipped / 0 passed**; `numFailedTestSuites=2`; elapsed ~1026ms
- Skip diagnosis: `beforeAll_connect_failure_reported_as_skipped` (same count signature as 2026-09-04g)
- Note: SSL transport mismatch from 04h is **not** the observed probe failure here (probe succeeded with plaintext). Residual beforeAll failure occurred inside Vitest after successful handoff/probe — likely post-connect suite setup (e.g. re-applying `20260821183525_journal_entry_executions.sql` against an already-applied Option D schema). **No remediation in this authorization.**

## Cleanup

- supabase stop --no-backup: exit 0
- workdir removed: true
- dburl file removed: true
- tcp 54322 open after cleanup: false
- leftover option-d-pr312-worktree-* temps: none
- evidence: `docs/migration-remediation/option-d-runtime-cleanup-2026-09-05a.json`
- left intact: installed software; PRs #312/#313 draft heads unchanged; Option D manifest blob unchanged

## Pins unchanged after run

- PR #312 remains draft @ `7f387fe0…`
- PR #313 remains draft @ `8a2a43d5…`
- Option D manifest blob unchanged: `ddabefe1…` / 163141 / SHA-256 `04cd9913…`
