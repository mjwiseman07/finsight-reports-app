# Security and RLS review — foundations baseline draft

**Scope:** `supabase/migrations-draft/20260701043599_foundations_baseline.sql`  
**Production comparison:** BLOCKED (no authenticated read-only DB URL in this session)

## Static scan summary

See `baseline-static-scan.json`.

| Check | Result |
|-------|--------|
| DROP TABLE / TRUNCATE / DISABLE RLS | **0** |
| Nested BEGIN/COMMIT | **Warn** — outer wrapper + source file transactions |
| Data UPDATE | **Warn** — `accounting_syncs` status normalization (2 statements) |
| Data INSERT | **Warn** — `accounting_connections` backfill + `company_roles` seed |
| SECURITY DEFINER | **0** in baseline (good) |
| `auth.uid()` / JWT metadata in policies | **Expected** — tenant isolation pattern |
| Storage / Vault refs | **0** |

## RLS coverage

- 42 `CREATE TABLE` statements; 36+ `ENABLE ROW LEVEL SECURITY` (including `alter table if exists` for company_memory — scanner undercounts).
- **Failed preview branch (deleted):** `subscriptions`, `subscription_items`, `stripe_webhook_events` existed **without RLS** after partial replay — confirms migration failure leaves exposed tables until replay completes or branch is deleted.

## Patent #6

Baseline predates `ledger_events`, `ledger_chain_head`, `publish_ledger_event`, and JE RPC stack. No regression from baseline draft alone.

Post-baseline production migrations must retain:

- `q8c` execute revokes on `publish_ledger_event`
- `SECURITY DEFINER` + `SET search_path = public` on JE reservation RPCs
- Append-only `ledger_events` triggers

## Required hardening before promotion

1. **Remove** `20260531_backfill_accounting_connections_from_quickbooks.sql` body from baseline (production-specific DML).
2. **Remove or guard** `accounting_syncs` UPDATE normalization for empty-DB replay.
3. **Flatten** transaction boundaries (single BEGIN/COMMIT).
4. **Split** reference data (`company_roles` seed) into explicit `REFERENCE_DATA` section or separate seed file excluded from production repair path.
5. **Prove** RLS on every public table via post-apply advisor scan on local replay.

## Authorization patterns

- Policies use `auth.uid()` and `auth.jwt()` metadata — standard Supabase pattern; not provider-success authority.
- Super-admin policies use JWT role claims — verify against production policy set during schema diff.
