# Option D runtime evidence — 2026-09-04c

**Date:** 2026-09-04  
**HEAD pin:** `07a356e5ad51d48324cc3a07b3737ddd0102c119`  
**Mode:** platform-only local disposable stack (CLI 2.116.0), full fresh replay, stop at first failure  
**Remediation:** none · **Production:** none

## Preflight (immutable pins)

| Pin | Result |
|-----|--------|
| HEAD | `07a356e5…` match |
| Manifest via `git cat-file blob HEAD:…option-d-replay-manifest.json` | SHA-256 `5a668153…`, 115488 bytes, 150 entries, 7 substitutions |
| PR312 commit / suite blob | `f65730b3…` / `6dfc99e2…` (worktree suite already matched; no temp materialize) |
| Supabase CLI | 2.116.0 |
| Tracked worktree | clean (untracked `.tmp*` OK) |

## Platform stack

- Workdir: `C:\Users\mattj\tmp-option-d-platform-only-07a356e5` (outside repo)
- `supabase init`; migration SQL count = 0; no Advisacor migrations copied
- `supabase start` OK; DB URL `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- TCP `127.0.0.1:54322` open before harness

## Harness verdict

**overall:** `BLOCKED`  
**reason:** `manifest_authorization_failed` (`manifest_sha256_mismatch`)  
**sqlApplicationAttempts:** `0`

Harness hashed **on-disk** `docs/migration-remediation/option-d-replay-manifest.json` → SHA-256 `1bf72919…` (117826 bytes), not the HEAD blob pin `5a668153…` (115488 bytes). Abort before assemble/SQL per authorization rules.

### Scopes

| Scope | Result |
|-------|--------|
| candidateReplay | FAIL |
| securityImmutabilityChecks | BLOCKED |
| pr312RpcValidation | BLOCKED |
| productionDashboardReplayParity | unresolved |

### applyResult / security / pr312

- **applyResult:** absent (no SQL apply)
- **security summary:** not run (blocked upstream)
- **pr312:** not run (blocked upstream)

## Cleanup proof

- `supabase stop --workdir … --no-backup` exit 0
- Workdir removed
- `.tmp-option-d-dburl-07a356e5.txt` removed
- No untracked PR312 temp suite written
- TCP 54322 closed after stop

Artifacts: `.tmp-option-d-harness-07a356e5.out.txt`, `.tmp-option-d-stack-07a356e5.json`, `option-d-runtime-status.json`, `option-d-runtime-cleanup-2026-09-04c.json`.
