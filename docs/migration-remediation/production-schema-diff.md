# Production schema diff (G1)
**Verdict:** `PASS` — schema-definition review only; clean replay is **G2**.
## Contract provenance
| Field | Value |
|-------|-------|
| SHA-256 | `461C94A36E9CB0B9193DE526AED284E3DBBA854FAA7D200F90692CF6D1246577` |
| Project ref | `jzmdgwwiestcmmeuhhkr` |
| Tables | 47 |
| Columns | 737 |
| Constraints | 171 |
| Indexes | 232 |
| Policies | 82 |
| Triggers | 13 |
| Trigger functions | 7 |
| Views | 1 |
| Contains data rows | false |
## Comparison model
```
hardened_baseline → recovered_phase1 → remaining_authoritative_migration_lineage → expected_final → production_contract
```
Differences are **not** treated as baseline defects when attributable to later migrations.
## Summary
- Tables compared: **47**
- All 47 tables in baseline+phase1 draft: **true**
- `company_billing_compat` view match: **true**
- Tables with unexplained column drift: **0**
### Classification counts
- `expected_later_migration_change`: 48
## Security findings
- **[advisory]** `phase1_exposure_window` — subscriptions, subscription_items, subscription_seats, entitlements, stripe_webhook_events: Recovered production phase1 migrations 1–3 create subscription tables before migration 4 enables RLS. Current production has RLS on all five. New lineage should enable RLS at CREATE where feasible.
- **[info]** `environment_specific_expected` — company_roles.authenticated_users_can_read_company_roles: Intentional reference-data read for authenticated; seed DML is only allowlisted baseline INSERT
- **[info]** `environment_specific_expected` — prevent_company_memory_append_only_mutation, prevent_company_memory_record_unsafe_mutation, prevent_company_memory_version_unsafe_mutation, prevent_memory_payload_update, prevent_si_snapshot_child_mutation_when_parent_locked, prevent_si_snapshot_metadata_mutation: Memory/SI immutability trigger functions present in production contract
## Unresolved lineage gaps
- `production_only_migration_missing_from_git` (79): 79 production migrations have no exact git filename match; 4 phase1 recovered; remainder need cumulative SQL for full replay proof
- `repository_migration_missing_from_production_lineage` (63): 63 local migrations including 34 pre-phase1 squashed into baseline draft
- `unresolved_timestamp_semantic_drift` (106): 106 semantic name pairs with version timestamp drift; column-level drift flagged per table above
## Baseline validation
- singleTransaction: **true**
- companyRolesSeedOnly: **true**
- backfillExcluded: **true**
- foundationPrerequisitesInDraft: **true**
- phase1PrerequisitesInDraft: **true**
## Tables needing review
_None — all column drift classified._
## G2 gate
- **G2 local clean replay** remains **BLOCKED** (Docker unavailable).
- Do **not** create a new Supabase preview branch until G1 sign-off **and** G2 pass.
