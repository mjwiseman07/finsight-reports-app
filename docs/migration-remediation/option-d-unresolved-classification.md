# Option D unresolved-reference classification (review)

**HEAD this step builds on:** `69323c96`  
**No database replay.** Active `supabase/migrations/` and PR #312 unchanged.

`mergeReady` on the Option D **candidate gate** now means `candidateReplayStaticReady` only (fixture scan **and** required dependencies resolved). It is **not** overall PR merge and **not** runtime PASS. `prMergeReady` and `runtimeReady` stay false. The gate **fails** while any `required_missing_create` remains.

No placeholder tables were added. Unresolved rows are kept even when classified as a justified exclusion.

There is **no** `ALTER TABLE … RENAME TO` in the Option D candidate SQL set.

## The eight requested occurrences

| # | Table | File | SQL that executes | When | Prerequisite | Safe if absent? | Edge / exclusion |
|---|--------|------|-------------------|------|--------------|-----------------|------------------|
| 1 | `erp_connections` | `20260717130000_tcp1_w3_erp_connections_disconnected_at.sql` | `DO $$` `ALTER TABLE public.erp_connections ADD COLUMN disconnected_at`; `DO $$` `CREATE INDEX … ON public.erp_connections`; third `DO $$` rewrites `qbo_connections_unified` | Only `IF to_regclass('public.erp_connections') IS NOT NULL`. ELSE rebuilds the view from `accounting_connections` only (in foundations). | **None in candidate/baseline CREATE/RENAME.** Optional leftover table (`optionalExternalTables` in the foundations baseline manifest). Canonical table is `accounting_connections`. | **Yes** — missing table is a no-op, not 42P01 | **Justified exclusion** `safe_conditional` — **no** required edge |
| 2 | `lifecycle_issues` | `20260805054000_schema_drift_issue_policies.sql` | `CREATE POLICY lifecycle_issues_org_wide_super_admin_read ON public.lifecycle_issues` | Unconditional on apply | Production `lifecycle_issues` @ `20260804234230` (`localFilename: null`, `unknown_prod_only`) | **No** — 42P01 | **Required missing CREATE** |
| 3 | `lifecycle_issues` | `20260806031500_major_2_2_lifecycle_issues_drift_kinds.sql` | `ALTER TABLE public.lifecycle_issues DROP/ADD CONSTRAINT` (issue_kind + partition CHECKs) | Unconditional | Same prod-only CREATE | **No** | **Required missing CREATE** |
| 4 | `lifecycle_issues` | `20260806032000_lifecycle_issues_schema_drift_checks.sql` | Same unconditional `ALTER TABLE` CHECK widen | Unconditional | Same | **No** | **Required missing CREATE** |
| 5 | `lifecycle_issues` | `20260806040000_major_2_3_block_a_assertion_linkage.sql` | `DROP/CREATE TRIGGER … ON public.lifecycle_issues`; `DO $$` `SELECT … FROM public.lifecycle_issues` | Unconditional | Same | **No** | **Required missing CREATE** |
| 6 | `pilot_lifecycle_events` | `20260810070050_dash_1c_a_widen_provenance.sql` | `ALTER TABLE public.pilot_lifecycle_events` drop/add CHECKs | Unconditional | Production `pilot_lifecycle_events` @ `20260804213003` (not in git) | **No** | **Required missing CREATE** |
| 7 | `pilot_lifecycle_events` | `20260810070100_dash_1c_a_lifecycle_scan_indexes.sql` | `CREATE INDEX … ON public.pilot_lifecycle_events` | Unconditional. `IF NOT EXISTS` does **not** skip a missing relation. | Same | **No** | **Required missing CREATE** |
| 8 | `stripe_webhook_events_legacy` | `20260718220000_q8e_rls_service_role_policies.sql` | `REVOKE ALL ON public.stripe_webhook_events_legacy`; `DROP POLICY IF EXISTS … ON public.stripe_webhook_events_legacy`; `CREATE POLICY … ON public.stripe_webhook_events_legacy` | Unconditional. `DROP POLICY IF EXISTS` still requires the table. | **No RENAME/CREATE in git.** New `stripe_webhook_events` is created by `20260706130000_d_entitlements.sql`. | **No** | **Required missing CREATE** (not a rename in this candidate set) |

## Additional occurrences found by the same rules (not suppressed)

Extending consume analysis to `INSERT … FROM public.<ident>`, `COMMENT ON TABLE`, and `FROM public.<ident>` inside `DO $$` (excluding function calls) surfaced two more **required** rows. They are kept.

| # | Table | File | SQL that executes | When | Prerequisite | Safe if absent? | Edge / exclusion |
|---|--------|------|-------------------|------|--------------|-----------------|------------------|
| 9 | `stripe_webhook_events_legacy` | `20260706140000_d_entitlements_followup.sql` | `INSERT INTO public.stripe_webhook_events … FROM public.stripe_webhook_events_legacy`; `DO $$` `SELECT COUNT(*) FROM public.stripe_webhook_events_legacy`; `COMMENT ON TABLE public.stripe_webhook_events_legacy` | Unconditional | Same as #8 — follow-up **reads** `_legacy` and never creates/renames it | **No** | **Required missing CREATE**. Graph edge added: follow-up **does** depend on `20260706130000_d_entitlements.sql` for `stripe_webhook_events` |
| 10 | `lifecycle_issues` | `20260806042000_major_2_3_block_a_1_research_revision.sql` | `DO $$` `SELECT COUNT(*) FROM public.lifecycle_issues` (self-verify) | Unconditional | Same prod-only CREATE as #2–#5 | **No** | **Required missing CREATE** |

## Graph / analyzer changes

- `ALTER TABLE … RENAME TO` is `rename_table`: consumes the old name and **creates** the new name. Consumers of the new name depend on the rename file. Replay simulation removes the old name after rename. **No such statement exists** in this candidate set, so no live rename edge; coverage is in unit tests.
- `to_regclass` / top-level `ALTER TABLE IF EXISTS` → `safe_conditional` (still **listed**). `DROP POLICY IF EXISTS` / `CREATE INDEX IF NOT EXISTS` on a missing table are **not** safe.
- `INSERT`/`DO` consume `FROM public.<table>` only when the ident is not a function call (`foo(`).
- `REVOKE ON FUNCTION` is ignored; only table REVOKEs consume.
- Candidate gate **fails** while `required_missing_create` count > 0 (`requiredUnresolvedCount` = 9). `fixtureScanOk` stays independent.
- Dependency-manifest `ok` is false until required unresolved is 0. Recurring_fires order is unchanged (d5 before d6_0). Follow-up now has `dependsOn: [20260706130000_d_entitlements.sql]`.
- No placeholder tables added.

## Remaining required (9)

Recovered SQL for `lifecycle_issues`, `pilot_lifecycle_events`, and `stripe_webhook_events_legacy` (or a real `RENAME TO` in-set) is still needed before a fresh local replay can be expected to pass these files.
