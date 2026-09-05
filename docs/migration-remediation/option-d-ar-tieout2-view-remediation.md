# Option D audit_ready_tie_out_summary remediation (order 89)

**Tested failure HEAD:** `bf2092b0ccdfb49daff329775972fd0a4ae1fde9`  
**Evidence:** `option-d-runtime-evidence-2026-09-03h.md` (SQLSTATE 42P16)

## Root cause

**historically invalid CREATE OR REPLACE VIEW** (column insertion/reorder) **plus git↔production divergence**.

| Stage | DDL |
|-------|-----|
| Order 88 (`ar_tieout1`) | `CREATE OR REPLACE VIEW` ends `… pbc_status, tie_out_state, policy_mode…` |
| Order 89 git | `CREATE OR REPLACE VIEW` inserts `last_tie_out_*` **before** `tie_out_state` → 42P16 |
| Production `20260720212538` | `DROP VIEW IF EXISTS …` (**no CASCADE**) + `CREATE VIEW` + `security_invoker=true` |

## Remediation

Option D substitution uses the **exact** production `schema_migrations.statements[1]` body:

- version `20260720212538` / name `ar_tieout2_runs_and_variances`
- bytes `8474` / MD5 `867ea82859717c3bc8dfe98e71be518b` / SHA-256 `1a17fa2e86d5b08e85132d8d22ca3dc83e9dd6d04938fc1b4a93df228d8c35af`
- No credentials or tenant rows
- Active `supabase/migrations/` unchanged

Consumers select by column name (`select('*')` / `tie_out_state`); recreation preserves names, types, and `security_invoker`.
