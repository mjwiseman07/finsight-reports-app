# Apply runbook — GIT_BLOB_PINNED_SINGLE_VERSION_TX_APPLY (standalone bundle)

**Status:** Tooling remediation (sealed standalone bundle); awaiting fresh independent operational re-review.  
**Production apply / dry-run:** NOT authorized by this tooling turn.

## Entry point (required)
```
node scripts/security/launch-credential-browser-containment-apply.js \
  --pr-head <authorized_tooling_freeze_40_hex> \
  --mode dry-run
```

`--pr-head` must equal tip `TOOLING_AUTHORIZATION.json` → `authorized_pr_head` (executable tooling freeze).  
Do **not** pass the evidence tip SHA when it differs from the freeze.

The launcher:
1. Loads authorization metadata from the current tip Git blob (not the worktree file)
2. Verifies `--pr-head` equals `authorized_pr_head`
3. Verifies source-module seals at the freeze commit
4. Extracts the sealed **standalone bundle** (`standalone_bundle`) via `git cat-file`
5. Verifies bundle OID / SHA-256 / bytes
6. Materializes the bundle into a fresh OS temp directory
7. Spawns only that bundle with sanitized env (`CONTAINMENT_ATTESTED_FREEZE`, `CONTAINMENT_GIT_CWD`, `CONTAINMENT_APPLY_DATABASE_URL`)
8. Cleans the temp directory on success, failure, and interruption

Child resolves `pg` **only** from the sealed bundle — never from repository `node_modules`, `NODE_PATH`, or cwd.

## Database URL channel
- Env var only: `CONTAINMENT_APPLY_DATABASE_URL`
- **Forbidden:** `--database-url`, generic `DATABASE_URL`, argv secrets

## Apply mode
```
--mode apply \
--i-authorize-production-apply I_AUTHORIZE_CONTAINMENT_APPLY_20260908031736
```

Dry-run must not include the apply authorization token. Conflicting flags fail closed.

## Pins
See `TOOLING_AUTHORIZATION.json` and `STANDALONE_BUNDLE_MANIFEST.json`.

## Advisory lock
`pg_advisory_xact_lock(0x43524243, 0x20260908)` — apply only (not dry-run).

## Indeterminate COMMIT
`INDETERMINATE_OUTCOME` + read-only reconciliation classifications. No automatic retry/rollback.

## Target #2
Always checked. `--skip-target2-check` is not available.

## Rebuild (seal publication only)
```
node scripts/security/build-containment-applicator-standalone-bundle.js
```
Never run during production dry-run/apply.
