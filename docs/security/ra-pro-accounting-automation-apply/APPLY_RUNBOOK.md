# RA Pro accounting-automation migration apply

Status: **UNPUBLISHED / production apply disabled**.

This package is dedicated to the two review-only accounting-automation
migrations. It must not reuse or retarget the RA Pro cutover, containment, or
free-review applicators.

## Fixed order

1. `20260917044537_ra_pro_weekly_completeness_findings.sql`
2. `20260917180140_ra_pro_month_end_review_packages.sql`

The production history contract is `188 -> 190`. Both versions must be absent
before an apply. Either version already being present, any unexpected history
count, or any seal mismatch blocks the ceremony without applying SQL.

## Safety boundary

- `ENABLE_RA_PRO_ACCOUNTING_AUTOMATION` stays absent/false through apply and
  post-apply verification.
- The two migrations execute in one transaction under the dedicated advisory
  lock `RA_PRO_ACCOUNTING_AUTOMATION_APPLY`.
- No invoice, bill, payment, journal-entry, QuickBooks, or Xero write is part of
  this ceremony.
- There is no automatic retry after a production attempt.
- Only `RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL` may carry the database
  credential, and it must never be supplied on argv or retained in evidence.

## Required review sequence

1. Verify committed Git blobs and the `188 -> 190` contract offline.
2. Complete a disposable PostgreSQL boot/apply/security/concurrency rehearsal.
3. Freeze and independently review the executable bundle and operator ceremony.
4. Collect and publish a sanitized read-only production precondition artifact.
5. Run one separately authorized production dry run.
6. Publish and independently review the prior-dry-run pin.
7. Collect fresh pre-apply live evidence while the feature flag remains closed.
8. Obtain a separate one-attempt production apply authorization.
9. Apply once, then independently verify history, RLS, grants, functions,
   idempotency, and absence of provider-side writes.

The offline verifier is:

```text
node scripts/security/verify-ra-pro-accounting-automation-apply-authority.js
```

It contacts no production service and cannot apply SQL.
