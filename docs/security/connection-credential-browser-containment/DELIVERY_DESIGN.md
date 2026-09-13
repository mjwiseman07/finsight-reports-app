# GIT_BLOB_PINNED_SINGLE_VERSION_TX_APPLY

Executable delivery mechanism for migration version `20260908031736` only.
**Launcher:** `scripts/security/launch-credential-browser-containment-apply.js`  
**NOT EXECUTED against production in tooling remediation.** No production apply/dry-run is authorized by this turn.

## Self-authority
Authoritative applicator modules are loaded from committed Git blobs at `authorized_pr_head`, materialized to a temp directory, and executed with a controlled environment (`NODE_PATH` / preload loaders forbidden). Worktree code may bootstrap verification only.

## Credential channel
`CONTAINMENT_APPLY_DATABASE_URL` only. Argv database URLs are prohibited.

## Advisory lock (fixed committed constant)
- Name: `CREDENTIAL_BROWSER_CONTAINMENT_STAGE1`
- `SELECT pg_advisory_xact_lock(0x43524243, 0x20260908);`

## Forbid
- `supabase db push` / `--include-all`
- migration repair / MCP alternate versioning
- worktree SQL / worktree applicator execution for production ops
- `--database-url` / generic `DATABASE_URL`
- automatic retry after indeterminate COMMIT

## Required workflow
1. Launch via self-authority launcher with `--pr-head` equality-checked to authorized HEAD.
2. Load migration via `git cat-file blob` from artifact commit; verify OID/SHA/bytes.
3. Dry-run default: read-only; `sqlApplicationAttempts: 0`.
4. Apply: single connection transaction + advisory xact lock; strip outer BEGIN/COMMIT; parameterized history insert of full sealed file; verify digests + prior 185-row manifest; privilege probes; COMMIT.
5. Uncertain COMMIT → `INDETERMINATE_OUTCOME` + read-only reconciliation; no auto-retry.
