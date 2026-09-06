# Option D runtime evidence — 2026-09-04f

Authorized bounded full fresh local Option D replay (platform-only ephemeral CLI 2.116.0).

## Pins

- HEAD / OPTION_D_AUTHORIZED_COMMIT: d2dd5818f237f85f8d7c64e7862005991da2a1e6
- Manifest SHA-256: 04cd991347959c684293f372418ad6538d2a7ad8715c98caefb760d8789b39ae
- Manifest blob: ddabefe12573bbfd073464a7d220a1e5275ad2c8 (163141 bytes; 150/7)
- PR312: f65730b3d38e9cb3b192e54f62c798c74a07a1c2 / suite blob 6dfc99e23b8206d3d70b19c8a7d4758d22e0f770
- Supabase CLI: 2.116.0
- Workdir: C:\Users\mattj\tmp-option-d-platform-only-d2dd5818

## Preflight / provenance

- Preflight: OK (.tmp-option-d-preflight-d2dd5818.json); launcher tracked; no npx.cmd in replay runner; CLI 2.116.0; PRs 312/313 draft
- Target provenance: OK (.tmp-option-d-target-provenance-d2dd5818.json) — loopback 127.0.0.1:54322/postgres; 0 public relations; 0 schema migration versions; platform catalogs present; empty workdir fingerprint

## Result

- overall: BLOCKED
- reason: vitest_nonzero_exit
- scopes:
  - candidateReplay: PASS
  - securityImmutabilityChecks: PASS
  - pr312RpcValidation: FAIL
  - productionDashboardReplayParity: unresolved
- applyResult: migrationsApplied=150, sqlApplicationAttempts=150, applied=true
- Memory / SI behavioral probes: reached and PASS (`security.immutability.behavior.ok`; alignment/schemaRls/views/triggers/functions all ok; no security failures recorded in `option-d-runtime-status.json`)
- PR312: launcher used process.execPath + local vitest (npxUsed=false); processExitCode=1; structured 0/12 (zero_tests_in_report)
- Root cause (classified post-run): suite was materialized to an absolute temp path outside the Vitest project root; `vitest.config.ts` include globs never matched, so Vitest collected zero tests. Candidate replay and security remain PASS; PR #312 blocked solely for this discovery failure.

## Cleanup

- supabase stop --no-backup: exit 0
- workdir removed: true
- dburl file removed: true
- tcp 54322 open after cleanup: false
- matching containers/volumes for this workdir: none observed
- left intact: docs/migration-remediation/option-d-runtime-status.json

## Remediation

Needed for PR312 vitest collecting zero tests (zero_tests_in_report / 0 of 12). Launcher npx issue is resolved. Not remediated in this authorized run.

HEAD remains d2dd5818f237f85f8d7c64e7862005991da2a1e6. No commit performed.
