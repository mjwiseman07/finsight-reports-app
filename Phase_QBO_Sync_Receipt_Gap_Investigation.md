# Phase QBO Sync Receipt Gap — Investigation (scope only)

**Status:** Separate ticket from DASH_1C A2. **Do not fix in A2.**  
**Severity:** Rule 2 / Patent #6 chain-of-custody hole.

## Symptom

QBO Sandbox company (`aaaaaaaa-2222-4222-8222-222222222222`) has at least one `accounting_syncs` row with **SUCCESS** status (e.g. `debb1e49-…`) that does **not** have a matching `pilot.lifecycle.accounting-sync-completed` row whose `payload.sync_id` (or equivalent) binds that sync into the SoR chain.

Accuracy Contract compose then correctly throws **409 `no_receipt_for_sync`** when that company is the resolved identity — honest fail-closed on missing custody, not a resolver bug.

## Why this violates Rule 2

Patent #6 requires consumer-facing accuracy claims to sit on a hash-chained receipt trail. A SUCCESS sync without `accounting-sync-completed` means:

- Operational / UI paths can treat the sync as “done”
- SoR chain cannot prove custody for that sync_id
- Downstream Accuracy Contract correctly refuses to mint a provenance-drawer view bound to an unreceipted sync

That is a **writer / emit gap**, not an Accuracy Contract routing gap.

## In-scope for a future fix ticket

1. Trace write paths that persist `accounting_syncs` SUCCESS for QBO (`active-context`, `fetch-reports`, write-boundary, any backfill scripts).
2. Confirm whether `emitSyncLifecycleEvent` / accounting-sync-completed runs only after full preflight success, while SUCCESS can be written earlier.
3. Inventory orphan SUCCESS syncs (SUCCESS row, no matching lifecycle event for that sync_id) per company / provider.
4. Design remediations: emit-on-SUCCESS, repair backfill for orphan syncs, or demote SUCCESSes that never completed the chain (product decision).
5. Add an invariant test or auditor job: SUCCESS sync ⇒ ≥1 `accounting-sync-completed` with matching sync_id (or explicit void/supersede receipt).

## Out of scope (this ticket)

- Changing Accuracy Contract resolver tiers (A2)
- Preferring “company with receipt” in identity resolution (forbidden — Rule 1 / data-driven identity)
- Block B UI
- Silent skip of 409 to return a softer empty contract

## Related context (DASH_1C)

| Item | Note |
|------|------|
| Xero Demo `02edb6c6-…` | Has sync-completed receipt (e.g. chain_seq 61); Acc Contract works when that company is explicit |
| QBO Sandbox | Preferenced by `resolveCompanyIdForUser` via newer `pilot_slots.updated_at` before A2 client `companyId` |
| A2 remediation for product path | Client passes `companyId` / scorecard context; does **not** heal QBO chain hole |

## Proposed next owner artifacts (when started)

- Reproduce: query SUCCESS syncs for QBO sandbox lacking lifecycle receipt
- File fix wave after root cause (likely `fetch-reports` / preflight / active-context ordering)
- Smoke Acc Contract against QBO only after receipt exists or orphan sync is repaired
