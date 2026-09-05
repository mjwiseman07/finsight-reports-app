# Option D runtime evidence — 2026-09-04h

Authorized bounded full fresh local Option D replay (platform-only ephemeral CLI 2.116.0).

## Pins

- HEAD / OPTION_D_AUTHORIZED_COMMIT: e4f71d4e52a04c0ed368680a85a7b4d2cceaf73d
- Manifest SHA-256: 04cd991347959c684293f372418ad6538d2a7ad8715c98caefb760d8789b39ae
- Manifest blob: ddabefe12573bbfd073464a7d220a1e5275ad2c8 (163141 bytes; 150/7)
- PR312: f65730b3d38e9cb3b192e54f62c798c74a07a1c2 / suite blob 6dfc99e23b8206d3d70b19c8a7d4758d22e0f770
- Supabase CLI: 2.116.0
- Workdir: C:\\Users\\mattj\\tmp-option-d-platform-only-e4f71d4e

## Preflight / provenance

- Preflight: OK (.tmp-option-d-preflight-e4f71d4e.json); HEAD/manifest/entry blobs/materialize match; PR312 suite blob match; tracked worktree clean; PRs 312/313 draft with correct OIDs; CLI 2.116.0; handoff + isolated-context modules present; sqlApplicationAttempts: 0 before Docker
- Target provenance: OK (.tmp-option-d-target-provenance-e4f71d4e.json) — loopback 127.0.0.1:54322/postgres; 0 public relations; 0 schema migration versions; platform catalogs present; empty workdir fingerprint; not prod/cloud/pooled/reused

## Result

- overall: BLOCKED
- reason: pr312_env_handoff_or_provenance_failed
- scopes:
  - candidateReplay: PASS (150/150 applied; git_cat_file_blob)
  - securityImmutabilityChecks: PASS (alignment/schemaRls/views/triggers/behavior/functions)
  - pr312RpcValidation: FAIL (blocked before Vitest spawn)
  - productionDashboardReplayParity: unresolved
- PR312 gates reached:
  - detached worktree materialization: PASS (suite blob 6dfc99e2…; authority git_worktree_detach_pr312_commit)
  - allowlist JE_REUSE handoff: constructed (redacted host=127.0.0.1;port=54322;db=postgres; fingerprint cf6453a9f9e48b2d)
  - TCP connectivity: PASS
  - suite-mirrored pg.Client (ssl rejectUnauthorized:false): **FAIL** — `The server does not support SSL connections`
- Vitest: not launched (processExitCode null; npx not used; launcher null by design)

## Cleanup

- supabase stop --no-backup: exit 0
- workdir removed: true
- dburl file removed: true
- tcp 54322 open after cleanup: false
- leftover option-d-pr312-worktree-* temps: none
- left intact: docs/migration-remediation/option-d-runtime-status.json; installed software

## Notes

Confirms 2026-09-04g root cause: local Supabase Postgres rejects the pinned suite’s `ssl: { rejectUnauthorized: false }` Client options. Fail-closed probe stopped before Vitest (no false skip PASS). Suite bodies / describe.skip unchanged (PR312 pin). Remediation requires separate authorization.

HEAD remains e4f71d4e52a04c0ed368680a85a7b4d2cceaf73d. No remediation commit in this authorized run.
