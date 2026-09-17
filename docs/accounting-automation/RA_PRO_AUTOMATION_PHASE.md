# RA Pro accounting automation phase

## Guardrails

- RA Pro commerce remains closed until this phase is independently reviewed.
- Provider access is read-only for hourly and weekly collection.
- No invoice issuance, customer charging, vendor payment, or automatic journal
  posting is introduced by this phase.
- Any future accounting write must enter the existing reviewer approval and
  posting-governance path.
- Automation is limited to client companies beneath a linked, authorizing RA
  Pro firm. Legacy unlinked firms fail closed.

## Cadence

| Cadence | Outcome |
| --- | --- |
| Hourly | Capture QBO CDC changes and refresh normalized QBO/Xero accounting snapshots. |
| Weekly | Check bank activity completeness, AR shipment/order-to-invoice exceptions, AP posting/payment-state completeness, and surface review exceptions. |
| Month end | Reconcile bank and other balance-sheet activity to the GL and produce reviewer-ready reconciliation evidence. |

## Existing foundation reused

- QBO CDC runs hourly at `/api/quickbooks/cdc`.
- Provider-neutral normalized accounting sync supports QBO and Xero.
- Monthly balance-sheet summary cron and audit-ready artifact pipeline exist.
- AR/AP/inventory/GRNI tie-out resolvers and workpaper emitters exist.
- Reviewer decisions and governed QBO journal-entry posting exist.

## Delivery sequence

1. Hourly provider-neutral refresh, RA Pro eligibility gate, and observability.
2. Weekly completeness orchestrator and reviewer exception persistence.
3. Bank/cash, revenue-cutoff, and expense-cutoff resolvers plus workpapers.
4. Provider-neutral month-end orchestration and Xero parity.
5. Closed production deployment, monitored pilot rehearsal, and separate
   commerce-open authorization.

