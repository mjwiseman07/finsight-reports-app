# GIT_BLOB_PINNED_SINGLE_VERSION_TX_APPLY

Future production delivery mechanism for migration version `20260908031736` only.
**NOT EXECUTED in this PR.** No production apply is authorized by authoring or sealing.

## Forbid
- `supabase db push`
- `supabase db push --include-all`
- replaying missing/local-only migrations
- rewriting or repairing unrelated `schema_migrations` rows
- `supabase migration repair` without executing forward SQL
- raw SQL that leaves the version without non-empty `statements[]`
- MCP `apply_migration` (server-generated version ≠ `20260908031736`)
- any approach that mutates the existing 185 production history rows

## Required workflow (single bounded transaction)
1. Load exact bytes via `git cat-file blob <commit>:<path>` for
   `supabase/migrations/20260908031736_connection_credential_browser_containment.sql`.
2. Verify SHA-256 and byte length against published Commit-2 seals for that commit.
3. Preflight: version `20260908031736` absent; object/grant/view fingerprints match sealed pre-change; count of prior history rows = 185.
4. `BEGIN;` + `pg_advisory_xact_lock` dedicated to this apply.
5. Execute only the migration **inner body** after deterministically removing its single outer `BEGIN;` / `COMMIT;` pair.
6. `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
   VALUES ('20260908031736', 'connection_credential_browser_containment', ARRAY[<exact committed full migration file text>]);`
7. Verify `statements[1]` digests to the sealed SHA-256; `array_length(statements,1)=1`; statements non-empty.
8. Run privilege/view/RLS probes (no token values).
9. Assert all prior 185 history rows remain byte-identical (version set unchanged except the one new row).
10. `COMMIT;` on success. On any failure: `ROLLBACK;` (no history row, no privilege change).

## Safety proof intent
Atomic SQL + history recording; exact git blob authority; no multi-version replay; fail-closed.
