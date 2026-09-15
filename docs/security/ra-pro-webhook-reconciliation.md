# RA Pro — webhook failed_conflict operator reconciliation

**Scope:** Durable Stripe webhook ledger after lease remediation (`processing` /
`processed` / `skipped` / `retryable` / `failed_conflict`).

**No production writes** from this runbook without separate authorization.

## When to use

`checkout.session.completed` (or other TCP1-handled events) finalized as
`failed_conflict` with a sanitized `failure_code` (for example
`pilot_cap_reached`, `buyer_not_company_member`, `subscription_conflict`).

These rows are **terminal**. They are never auto-reclaimed. Operator recovery is
explicit and event-specific.

## Workflow (bounded)

1. **Inspect sanitized conflict code only**
   - Read `stripe_event_id`, `event_type`, `processing_status`, `failure_code`,
     `attempt_count`, `updated_at` from `stripe_webhook_events`.
   - Do **not** paste `raw_payload`, customer PII, or secrets into tickets/chat.

2. **Verify identities read-only**
   - Stripe Dashboard: subscription / customer / checkout session for the event.
   - Database: canonical `pilot_slots`, `companies`, `company_users`, `firms`
     (`billing_company_id`), `firm_memberships` — count/status only unless a
     separate investigation auth expands scope.

3. **Resolve underlying data under separate authorization**
   - Examples: fix buyer membership, wait for pilot capacity, correct company
     ownership. Prefer forward-fixing data so a **new** authorized retry path
     can succeed — never “mark success” on the conflicted row.

4. **Reset / requeue only with event-specific authorization + lease protection**
   - Allowed transition (authorized SQL/RPC only): `failed_conflict` →
     `retryable` with a new operator audit note, **or** insert a fresh
     operational work item that triggers a controlled replay.
   - Must use lease-aware reclaim (`claim_stripe_webhook_event`) — never DELETE
     the ledger row, never `UPDATE … SET processing_status='processed'` as a
     shortcut.

5. **Immutable audit**
   - Record operator identity, authorization ticket id, event id, prior
     `failure_code`, and action taken in the existing ops/audit channel.
   - Do not edit historical `failure_code` values in place to hide conflicts.

## Admin surface

No new public endpoint is introduced in this PR. Operators use the documented
SQL/ops channel above. If an existing internal admin webhook/status surface is
later extended, it must show **counts and sanitized codes only** (no payloads).

## HTTP semantics (runtime)

| Ledger state | Stripe HTTP |
|--------------|-------------|
| `processed` / `skipped` / `failed_conflict` (duplicate delivery) | 2xx duplicate ack |
| `retryable` reclaim path after claim | continues work |
| `retryable_error` response | 500 |
| `lease_held` | 409 |
