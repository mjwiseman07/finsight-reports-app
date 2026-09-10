# GIT_BLOB_PINNED_SINGLE_VERSION_TX_APPLY

Future production delivery mechanism for migration version `20260908031736` only.
**Executable applicator:** `scripts/security/apply-credential-browser-containment.js`  
**NOT EXECUTED against production in tooling authoring.** No production apply/dry-run is authorized by this turn.

## Advisory lock (fixed committed constant)
- Name: `CREDENTIAL_BROWSER_CONTAINMENT_STAGE1`
- `SELECT pg_advisory_xact_lock(0x43524243, 0x20260908);`
- See `ADVISORY_LOCK.json`

## Forbid
- `supabase db push`
- `supabase db push --include-all`
- replaying missing/local-only migrations
- rewriting or repairing unrelated `schema_migrations` rows
- `supabase migration repair` without executing forward SQL
- raw SQL that leaves the version without non-empty `statements[]`
- MCP `apply_migration` (server-generated version ≠ `20260908031736`)
- any approach that mutates the existing 185 production history rows
- worktree SQL bytes / filesystem fallbacks
- string interpolation for history insertion

## Required workflow (single bounded transaction)
1. Load exact bytes via `git cat-file blob <artifact-commit>:<path>` for
   `supabase/migrations/20260908031736_connection_credential_browser_containment.sql`.
2. Verify blob OID, SHA-256, byte length, UTF-8 LF, no BOM against published Commit-2 seals.
3. Preflight (dry-run default): version `20260908031736` absent; object/grant/view fingerprints match sealed pre-change; count of prior history rows = 185; target #2 sandbox fingerprint booleans only.
4. `BEGIN;` + timeouts + `pg_advisory_xact_lock` using the committed constant above.
5. Execute only the migration **inner body** after deterministically removing its single outer `BEGIN;` / `COMMIT;` pair.
6. Parameterized `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
   VALUES ($1, $2, ARRAY[$3]::text[])` where `$3` is the exact full committed migration file (including outer BEGIN/COMMIT).
7. Verify `statements[1]` digests to the sealed SHA-256; `array_length(statements,1)=1`; statements non-empty.
8. Run privilege/view/RLS probes (no token values).
9. Assert all prior 185 history rows remain digest-identical (version set unchanged except the one new row).
10. `COMMIT;` on success. On any failure: `ROLLBACK;` then read-only verify version absent + pre-change restored.

## Safety proof intent
Atomic SQL + history recording; exact git blob authority; no multi-version replay; fail-closed; `sqlApplicationAttempts: 0` on any pin mismatch.
