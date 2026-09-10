# Apply runbook — GIT_BLOB_PINNED_SINGLE_VERSION_TX_APPLY

**Status:** Tooling remediation; awaiting fresh independent operational re-review.  
**Production apply / dry-run:** NOT authorized by this tooling turn.

## Entry point (required)
Use the bootstrap launcher (worktree may only bootstrap verification):

```
node scripts/security/launch-credential-browser-containment-apply.js \
  --pr-head <full-40-char-authorized-PR-HEAD> \
  --mode dry-run
```

The launcher:
1. Equality-checks `--pr-head` against `git rev-parse HEAD` and `TOOLING_AUTHORIZATION.json`
2. Loads applicator modules from exact Git blobs
3. Verifies OID / SHA-256 / bytes
4. Materializes LF bytes into a fresh temp directory
5. Spawns only that materialized applicator
6. Cleans the temp directory on exit

Do **not** run `apply-credential-browser-containment.js` directly for production operations.

## Database URL channel
- Env var only: `CONTAINMENT_APPLY_DATABASE_URL`
- **Forbidden:** `--database-url`, generic `DATABASE_URL`, argv secrets
- Never printed, never written into evidence

## Apply mode
```
--mode apply \
--i-authorize-production-apply I_AUTHORIZE_CONTAINMENT_APPLY_20260908031736
```

Dry-run must not include the apply authorization token. Conflicting flags fail closed.

## Required pins
See `TOOLING_AUTHORIZATION.json` for authorized PR HEAD, artifact commit, migration seals, and tooling module seals.

## Advisory lock
`pg_advisory_xact_lock(0x43524243, 0x20260908)` — `CREDENTIAL_BROWSER_CONTAINMENT_STAGE1`

## Indeterminate COMMIT
If connection loss occurs during/after COMMIT acknowledgement, verdict is `INDETERMINATE_OUTCOME` (never `APPLY_ROLLED_BACK`). Operator must read reconciliation classification and obtain a new authorization before retry/rollback.

## Target #2
Always checked (booleans/fingerprints only). `--skip-target2-check` is not available.
