# Review Assist Pro webhook conflict reconciliation

Operator workflow for `failed_conflict` / held `retryable` ledger rows
(including `ra_pro_cutover_commerce_gated` during cutover).

## Bounded steps

1. Inspect sanitized `failure_code` only (no Stripe payload in ledger).
2. Verify Stripe Dashboard + canonical DB identities **read-only**.
3. Resolve underlying data under **separate** authorization (never via mark-success).
4. Reset/requeue only with event-specific authorization + lease protection
   (`claim_stripe_webhook_event` / `finalize_stripe_webhook_event`).
5. Retain an immutable operator audit note (handles/codes only).

## Forbidden

- Editing raw webhook payloads in the ledger
- `mark processed` shortcuts
- Deleting another worker’s lease
- Reopening `RA_PRO_CUTOVER_COMMERCE_GATE` to clear conflicts without meeting
  reopening criteria in `ra-pro-cutover-runbook.md`

## Admin surface

No new public endpoint. Use the operator SQL/runbook queries documented for
lease status counts when an admin console is unavailable.
