# Option D required-function recovered originals (draft)

**Status:** Recovered production `statements[]` for Option D draft replay only.  
**Not** approved `supabase/migrations/` files. **Not** a runtime or merge PASS.

| Field | Value |
|-------|--------|
| Source project | `jzmdgwwiestcmmeuhhkr` (read-only) |
| Source table | `supabase_migrations.schema_migrations` |
| Retrieval | metadata + `statements[]` only; no application/customer rows |
| SQL treatment | **original** — no Option D substitution |
| Reconstruction | none |

Each production row stores **one** SQL string in `statements[1]`. Draft files keep that element bytes-for-bytes after a provenance header. Hashes in `provenance-manifest.json` are of the SQL body only.

## Recovered rows

| Version | Name | Bytes | MD5 (UTF-8 body) | Supplies |
|---------|------|------:|------------------|----------|
| `20260804213819` | `pilot_lifecycle_events_hash_chain_trigger` | 7738 | `5ede7d6c22fe4b9ba15e9b038e5379dc` | First CREATE of `canonical_payload`, `before_insert`, `reject_mutations`, `verify_chain` + triggers |
| `20260804213934` | `pilot_lifecycle_events_hash_digest_bytea_fix` | 3968 | `804e70213d39474337ad6a0526df4120` | OR REPLACE `before_insert` + `verify_chain` |
| `20260804214151` | `pilot_lifecycle_events_hash_extensions_search_path` | 4004 | `7a5489dd8dd316cf26eb02a413339f71` | OR REPLACE with `search_path = public, extensions, pg_temp` |
| `20260804220220` | `pilot_lifecycle_events_chain_seq_hardening` | 17126 | `0dfe89813e31c0cf5341d8fd65ab4c18` | `chain_seq` column; empty-table backfill UPDATE (no-op); OR REPLACE + REVOKE on helpers |
| `20260805005320` | `pilot_lifecycle_anchors` | 5905 | `74f838e87f887acae7cfee3bc65a00cc` | Anchor tables + `sp_write_anchor_batch` |

## Inspection

| Check | Result |
|-------|--------|
| Credentials / URLs / JWT | none |
| INSERT / COPY of customer rows | none. Anchors INSERT is inside `sp_write_anchor_batch` (caller params). chain_seq UPDATE is an empty-table backfill. |
| Security lockdown | **not** weakened. Git `major_1_rpc_lockdown` REVOKE/ALTER FUNCTION statements remain. |

## Not imported

- `20260804223816` event_kind_widen (no functions)
- `20260804225750` / `20260804234244` `sp_write_pilot_slot_*` (have INSERT; not consumed by the candidate set)
