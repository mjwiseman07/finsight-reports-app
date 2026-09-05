# Option D column-lineage diagnosis — order 11 `company_id` (review-only)

**Tested runtime HEAD:** `879d3d5957bc31034566ce80b802319d7b91f34c`  
**Evidence commit:** `16b7cb819c38e5d787b3bc114776652467f5e699`  
**PR #312 pin (unchanged):** `f65730b3d38e9cb3b192e54f62c798c74a07a1c2`  
**Mode:** Static review only — no Docker replay, no production mutation

## Exact failing statement

Runtime error: `column "company_id" does not exist` at assembled **order 11** (pre-column-graph)  
File: `20260705_d67_p1_ar_cash_app_layer0_layer1.sql`

```sql
INSERT INTO public.ar_cash_app_config (firm_id, company_id)
SELECT firm_id, company_id
FROM public.firm_clients
ON CONFLICT (company_id) DO NOTHING;
```

| Field | Value |
|-------|--------|
| Statement kind | `INSERT … SELECT` |
| Target relation | `public.ar_cash_app_config` (same-file CREATE includes `company_id`) |
| Source relation | `public.firm_clients` |
| Missing column object | **`firm_clients.company_id`** |

## Column lineage for `firm_clients.company_id`

| Step | Migration | Pre-column-graph order | With column graph | Action |
|------|-----------|-----------------------:|------------------:|--------|
| Table create | foundations baseline | 1 | 1 | CREATE without `company_id` |
| Column create | `20260708_00_d0_identity_and_memory_activation.sql` | 22 | 21 | `ADD COLUMN IF NOT EXISTS company_id` |
| Column consume | `20260705_d67_p1_ar_cash_app_layer0_layer1.sql` | **11** | **26** | SELECT from `firm_clients` |

## Root cause (runtime failure)

**`creator_alter_ordered_too_late`** — d0 ADD COLUMN exists in-set but was ordered after d67 under table-only analysis.

Not: missing production original for `firm_clients.company_id`; not local-vs-prod schema variant; not wrong canonical object (source is unambiguously `firm_clients`).

## Full-candidate column audit follow-on

| Identity | Cause | Recovery |
|----------|-------|----------|
| `stripe_webhook_events_legacy.received_at` | Missing production ALTER before rename | Recovered `20260702041259_add_received_at_to_stripe_webhook_events` from `supabase_migrations.schema_migrations` (project `jzmdgwwiestcmmeuhhkr`, MD5 `36e917a838d7c7919395194e6e5819b9`, 144 bytes) |

## Analyzer changes

- Column create/consume tracking; `consume_column` + `rename_column_requires` edges
- RENAME transfers only columns that existed before the rename
- ALTER depends only on prior creators (not later re-CREATE)
- Qualified `REFERENCES`/`ON` skips `auth`/`storage` platform schemas; CREATE VIEW tracked; self-FK on CREATE allowed
- Static gate fails on required missing columns
- Assembled set **149**; recovered required originals **9**
- Unresolved: tables **1** (`erp_connections` = `safe_conditional`); required tables/functions/columns **0**

No Docker replay in this step. Stop for review before another runtime authorization.
