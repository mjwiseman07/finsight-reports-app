# Apply runbook — GIT_BLOB_PINNED_SINGLE_VERSION_TX_APPLY

**Status:** Operational tooling ready for independent operational review.  
**Production apply:** NOT authorized by the tooling PR turn.  
**Production dry-run:** NOT authorized in the tooling authoring turn.

## Sealed artifact authority (unchanged)
- Artifact commit: `dadd4345c6b4f5df718f1e31f27b161d05fe7aa9`
- Migration path: `supabase/migrations/20260908031736_connection_credential_browser_containment.sql`
- Blob OID: `a5051f23da5bc889d0612f76a61eec1c3cd487e7`
- SHA-256: `71500fc8c56f484e3f2d5b49ff2b3161aad474027291a4eda22f26e7fc8071e7`
- Bytes: `10586`
- Version / name: `20260908031736` / `connection_credential_browser_containment`
- Prior history rows: exactly `185` (must remain byte-identical)

## Advisory lock (committed constant)
See `ADVISORY_LOCK.json` and `scripts/security/credential-browser-containment-constants.js`:
- name: `CREDENTIAL_BROWSER_CONTAINMENT_STAGE1`
- `pg_advisory_xact_lock(0x43524243, 0x20260908)`

## Script
`node scripts/security/apply-credential-browser-containment.js`

Default mode is **dry-run** (read-only). Real apply requires `--apply`.

### Required inputs (all explicit)
```
--project-ref jzmdgwwiestcmmeuhhkr
--pr-head <full 40-char PR HEAD SHA>
--artifact-commit dadd4345c6b4f5df718f1e31f27b161d05fe7aa9
--migration-path supabase/migrations/20260908031736_connection_credential_browser_containment.sql
--migration-blob-oid a5051f23da5bc889d0612f76a61eec1c3cd487e7
--migration-sha256 71500fc8c56f484e3f2d5b49ff2b3161aad474027291a4eda22f26e7fc8071e7
--migration-bytes 10586
--version 20260908031736
--name connection_credential_browser_containment
--database-url <session-only privileged URL; never logged>
```

Apply extra: `--apply`

Optional: `--target2-fingerprint d331891f0424`

### Behavior
1. Verify all pins via `git cat-file blob` (never worktree SQL).
2. Dry-run: read-only checks → `DRY_RUN_READY` or fail-closed; `sqlApplicationAttempts: 0`.
3. Apply: single connection transaction, advisory xact lock, strip outer BEGIN/COMMIT for execution, parameterized history insert of the **full** sealed file, verify digests + prior 185-row manifest, privilege asserts (no token values), COMMIT or ROLLBACK.

### Forbidden
- `supabase db push` / `--include-all`
- migration repair / MCP alternate versioning
- worktree SQL / string-interpolated history insert
- multiple connections for the write transaction

## Rehearsal
`node scripts/security/rehearse-credential-browser-containment.js`  
Loads migration/rollback/contract/fixture exclusively from git blobs pinned by `SEALS.json` at HEAD + artifact commit.
