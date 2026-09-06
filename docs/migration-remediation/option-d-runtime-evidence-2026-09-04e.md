# Option D runtime evidence — 2026-09-04e

Authorized corrected full fresh local Option D replay (platform-only ephemeral CLI 2.116.0).

## Pins

- HEAD / OPTION_D_AUTHORIZED_COMMIT: 6d98987fec0f80a820e37e75945a760c3eeb92cf
- Manifest SHA-256: 04cd991347959c684293f372418ad6538d2a7ad8715c98caefb760d8789b39ae
- Manifest blob: ddabefe12573bbfd073464a7d220a1e5275ad2c8 (163141 bytes; 150/7)
- PR312: f65730b3d38e9cb3b192e54f62c798c74a07a1c2 / suite blob 6dfc99e23b8206d3d70b19c8a7d4758d22e0f770
- Supabase CLI: 2.116.0
- Workdir: C:\Users\mattj\tmp-option-d-platform-only-6d98987f-e

## Preflight / provenance

- Preflight: OK (.tmp-option-d-preflight-6d98987f-e.json)
- Target provenance: OK (.tmp-option-d-target-provenance-6d98987f-e.json) — loopback 127.0.0.1:54322/postgres; 0 public relations; 0 schema migration versions; platform catalogs present; empty workdir fingerprint

## Result

- overall: BLOCKED
- reason: vitest_spawn_error (spawnSync npx.cmd EINVAL)
- scopes:
  - candidateReplay: PASS
  - securityImmutabilityChecks: PASS
  - pr312RpcValidation: FAIL
  - productionDashboardReplayParity: unresolved
- applyResult: migrationsApplied=150, sqlApplicationAttempts=150, applied=true
- Memory / SI behavioral probes: reached and PASS (`security.immutability.behavior.ok`; alignment/schemaRls/views/triggers/functions all ok; no security failures recorded in `option-d-runtime-status.json`)
- PR312: vitest did not start (spawn error); 12 structured passes not produced

## Cleanup

- supabase stop --no-backup: exit 0
- workdir removed: true
- dburl file removed: true
- tcp 54322 open after cleanup: false
- matching containers/volumes for this workdir: none observed

## Remediation

Needed for PR312 vitest spawn on this host (npx.cmd EINVAL). Not remediated in this authorized run.

HEAD remains 6d98987fec0f80a820e37e75945a760c3eeb92cf. No commit performed.
