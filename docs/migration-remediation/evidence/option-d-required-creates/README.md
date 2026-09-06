# Option D required-CREATE recovered originals (draft)

**Status:** Recovered production `statements[]` for Option D draft replay only.  
**Not** approved `supabase/migrations/` files. **Not** a runtime or merge PASS.

| Field | Value |
|-------|--------|
| Source project | `jzmdgwwiestcmmeuhhkr` (read-only) |
| Source table | `supabase_migrations.schema_migrations` |
| Retrieval | metadata + `statements[]` only; no application/customer rows |
| SQL treatment | **original** — no Option D substitution |
| Reconstruction | none (not inferred from live table defs) |

Each production row stores **one** SQL string in `statements[1]`. Draft files keep that element bytes-for-bytes after a provenance header. Hashes in `provenance-manifest.json` are of the SQL body only.

## Recovered rows

| Version | Name | Kind | Bytes | MD5 (UTF-8 body) | Statements |
|---------|------|------|------:|------------------|------------|
| `20260704024059` | `d_entitlements_legacy_stripe_rename` | `ALTER TABLE … RENAME TO` | 105 | `76b4171c8bad53b1ef0965ebf2436366` | 1 |
| `20260804213003` | `pilot_lifecycle_events` | `CREATE TABLE` | 5454 | `34ca62d02d68fac9fc81bf485ba1a02c` | 1 |
| `20260804234230` | `lifecycle_issues` | `ALTER` + `CREATE TABLE` | 3274 | `0b75c1945dea894acbe0427a847d13c5` | 1 |

`lifecycle_issues` is the **only** production version whose body contains `CREATE TABLE … lifecycle_issues`. `stripe_webhook_events_legacy` is a **rename**, not a CREATE. Source table `public.stripe_webhook_events` is created in phase1 prefix `20260701043602_phase1_subscriptions_core.sql`.

## Inspection (no secrets committed)

| Check | Result |
|-------|--------|
| INSERT / COPY / row UPDATEs | none |
| Credentials / URLs / JWT | none (`GRANT … TO service_role` is a role name) |
| RLS | both CREATE tables `ENABLE ROW LEVEL SECURITY` + partition SELECT policies on `company_users` / `firm_memberships` (foundations) |
| Grants | `lifecycle_issues`: `REVOKE` anon; `GRANT SELECT` authenticated; `GRANT ALL` service_role |
| Functions / triggers in these bodies | none. Comments mention a later hash-chain trigger (Block 2) — **not imported** |
| Operational writes | none |
| Prerequisites | `lifecycle_issues` ALTERs `pilot_lifecycle_events` CHECKs → recovered pilot CREATE must precede it. Rename needs prefix `stripe_webhook_events` and must precede git `20260706130000_d_entitlements.sql` |

## Not imported (semantic duplicate / out of scope)

- Production `20260704025937` `d_entitlements_followup` — git already has `20260706140000_d_entitlements_followup.sql`.
- Later MEM-LIFECYCLE function/trigger versions. Git `20260805041500_major_1_rpc_lockdown.sql` REVOKEs those functions; that is a **separate** runtime risk, not one of the nine required **table** CREATEs.

## Option D integration

Assembled as `role: recovered_production_original` in the post-prefix candidate set (same filenames, draft directory). Explicit edge: rename before `20260706130000_d_entitlements.sql`.
