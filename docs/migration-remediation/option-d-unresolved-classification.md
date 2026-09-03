# Option D unresolved-reference classification (review)

**HEAD this step builds on:** `28eaeb77`  
**No database replay.** Active `supabase/migrations/` and PR #312 unchanged.

Recovered production originals for the three missing relations are now in the Option D **draft** candidate set (`supabase/migrations-draft/recovered-production-history/`). SQL treatment is **original** (no substitution). See `docs/migration-remediation/evidence/option-d-required-creates/`.

`mergeReady` on the Option D **candidate gate** means `candidateReplayStaticReady` only (fixture scan **and** required dependencies resolved). It is **not** overall PR merge and **not** runtime PASS. `prMergeReady` and `runtimeReady` stay false.

No placeholder tables were added. Unresolved rows are kept even when classified as a justified exclusion.

## Remaining unresolved (1) — justified exclusion

| # | Table | File | SQL that executes | When | Prerequisite | Safe if absent? | Edge / exclusion |
|---|--------|------|-------------------|------|--------------|-----------------|------------------|
| 1 | `erp_connections` | `20260717130000_tcp1_w3_erp_connections_disconnected_at.sql` | `DO $$` `ALTER TABLE public.erp_connections ADD COLUMN disconnected_at`; `DO $$` `CREATE INDEX … ON public.erp_connections`; third `DO $$` rewrites `qbo_connections_unified` | Only `IF to_regclass('public.erp_connections') IS NOT NULL`. ELSE rebuilds the view from `accounting_connections` only (in foundations). | **None in candidate/baseline CREATE/RENAME.** Optional leftover table. Canonical table is `accounting_connections`. | **Yes** — missing table is a no-op, not 42P01 | **Justified exclusion** `safe_conditional` — **no** required edge |

`requiredCount` / `requiredUnresolvedCount` = **0**. `requiredDependenciesResolved` = true. Candidate static gate may PASS; runtime/PR merge stay false.

## Previously required — now supplied in-set

| Table | Recovered source | Kind | Option D treatment |
|-------|------------------|------|-------------------|
| `stripe_webhook_events_legacy` | prod `20260704024059` `d_entitlements_legacy_stripe_rename` | `ALTER TABLE IF EXISTS public.stripe_webhook_events RENAME TO stripe_webhook_events_legacy` | original |
| `pilot_lifecycle_events` | prod `20260804213003` | `CREATE TABLE IF NOT EXISTS` | original |
| `lifecycle_issues` | prod `20260804234230` | ALTER `pilot_lifecycle_events` CHECKs, then `CREATE TABLE IF NOT EXISTS` | original |

Consumers (`schema_drift_issue_policies`, dash_1c ALTERs/indexes, `d_entitlements_followup`, `q8e_rls_service_role_policies`, etc.) now have a CREATE/RENAME in the candidate graph. They are **not** unresolved.

Rename source table `stripe_webhook_events` is created in the phase1 prefix. Git `20260706130000_d_entitlements.sql` creates the **replacement** `stripe_webhook_events` after the rename (`explicitDependsOn` + `semanticConstraint`). Later consumers of `_legacy` use the renamed name.

No second CREATE of these three names exists in `supabase/migrations/`. Production `d_entitlements_followup` @ `20260704025937` was **not** imported (git already has a followup).

## Graph / analyzer

- `ALTER TABLE … RENAME TO` is `rename_table`: consumes the old name and **creates** the new name. Replay simulation removes the old name after rename.
- Recovered rename is in the candidate set; consumers of `_legacy` depend on `20260704024059_d_entitlements_legacy_stripe_rename.sql`.
- `to_regclass` / top-level `ALTER TABLE IF EXISTS` → `safe_conditional` (still **listed**). `DROP POLICY IF EXISTS` / `CREATE INDEX IF NOT EXISTS` on a missing table are **not** safe.
- Recurring_fires order is unchanged (d5 before d6_0).
- No placeholder tables added.

## Not claimed by this static PASS

Git `20260805041500_major_1_rpc_lockdown.sql` REVOKEs MEM-LIFECYCLE functions that live in **later** production versions (not in these three recovered bodies). That is outside the nine required **table** CREATEs. Static PASS ≠ runtime PASS.
