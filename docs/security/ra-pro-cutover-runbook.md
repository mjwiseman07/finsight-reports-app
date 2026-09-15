# RA Pro cutover — operator decision & deployment sequence

## Authorized operator decision

Committed sanitized record:

`docs/security/ra-pro-cutover-operator-decision.json`

| Field | Value |
|-------|-------|
| Protocol | `ra-pro-cutover-operator-decision/v1` |
| Mapping artifact SHA-256 | `93f6fe31360222ccd282e814a3764ccf07929e7cb91c25c70e10b750ec0ec953` |
| Decision-record Git OID | `0dd39de5ffbfd2b35d3d73887dd0fa915a061c93` |
| Decision-record SHA-256 (Git **LF** blob) | `f00039cb536b0ffef09ea41c0613ce83d7f52067b2bffc4ff27980f8e9bd46e1` |
| Decision-record bytes | `1122` |
| Actions | **NO_CUTOVER × 4** |
| Link / create | 0 / 0 |
| Collisions | 0 |
| Backfill authorized | **false** |
| Classification | internal smoke/demo entitlements excluded |

Digest authority: committed Git **LF** blob only (see
`docs/security/ra-pro-decision-record-seal.md`). Superseded CRLF worktree digest
`8499dd36…` / 1148 bytes is non-authoritative.

The detailed handle-bearing ceremony artifact remains **local-only** under
`scripts/output/` (gitignored). Do not commit handles, names, emails, or IDs.

This release **does not** backfill `firms.billing_company_id`. Existing unlinked
firms stay denied from `/reviewer`. Legacy smoke/demo pilot rows are left for
audit history and grant no new reviewer access. Future customers must use the
canonical activation path after commerce reopening.

## Cutover commerce gate contract

| Item | Value |
|------|-------|
| Env var | `RA_PRO_CUTOVER_COMMERCE_GATE` |
| `open` | RA Pro checkout + webhook activation allowed |
| `closed` | Checkout returns **503** `ra_pro_cutover_commerce_gated` before Stripe session create; RA Pro webhook activation finalizes **retryable** (not processed/skipped) |
| missing / malformed | **closed** (fail closed) |
| Authority | Server process env only |
| Forbidden inputs | client body, query, cookies, Stripe metadata, `NEXT_PUBLIC_*` |

Distinct from `LAUNCH_GATE_REVIEW_ASSIST_PRO` (cookie/token bypass). Cutover must
**not** rely on that bypass path.

This authorization does **not** mutate Vercel. Operators set the variable under
separate environment authorization.

## Cutover sequence (production)

1. Confirm mapping artifact SHA still matches the committed decision record.
2. Set `RA_PRO_CUTOVER_COMMERCE_GATE=closed` in production (separate auth).
3. Deploy application build that includes the gate + entitlement filter (this PR),
   or ensure gate-closed is live before migration if code already deployed.
4. Run sanitized read-only preconditions (`assertCutoverPreconditions`):
   - authorizing slots still 4 (3 company / 1 firm)
   - zero new slots after mapping snapshot
   - `billing_company_id` column absent
   - migration version absent
   - no unexpired processing leases
   - no unreviewed held/retryable RA Pro events
   - commerce gate confirmed closed
5. Apply migration `20260915004500_ra_pro_firm_billing_company_id` (separate auth).
6. Independently verify migration + zero linked firms.
7. Deploy / confirm production deployment healthy with `/reviewer` denying unlinked firms.
8. Do **not** reopen until reopening criteria below are met.

Any inventory drift → **stop** and require a new mapping ceremony.

## Reopening criteria

Reopen only when **all** are true:

- Migration applied and independently verified
- PR #321 merged and production deployment healthy
- `/reviewer` denies every unlinked firm
- Canonical activation succeeds in controlled non-prod or separately authorized smoke
- Webhook lease/idempotency passes
- Limits 2 / 5 / 10 pass
- No held/retryable RA Pro event needs reconciliation
- Monitoring + operator reconciliation runbook ready

Then set `RA_PRO_CUTOVER_COMMERCE_GATE=open` (separate auth). Do not leave the
gate permanently closed as a product shutdown.
