# RA Pro billing-company cutover apply runbook (tooling only)

**Tooling rehearsal only. Do not apply to production without a published tooling freeze, published prior dry-run pins, and separate apply authorization.**

## Package

- Migration: `supabase/migrations/20260915004500_ra_pro_firm_billing_company_id.sql`
- Version: `20260915004500`
- Artifact commit: `b4f06a1ca889bdfb477397b990860b21e788a877`
- Decision: `docs/security/ra-pro-cutover-operator-decision.json` (NO_CUTOVER × 4)
- Apply token: `I_AUTHORIZE_RA_PRO_BILLING_COMPANY_CUTOVER_APPLY_20260915004500`
- Advisory lock: `RA_PRO_BILLING_COMPANY_CUTOVER_APPLY` (`0x52415052`, `0x20260915`)

## Credential channel

Set **only**:

```
RA_PRO_CUTOVER_APPLY_DATABASE_URL
```

Forbidden:

- `DATABASE_URL`
- `CONTAINMENT_APPLY_DATABASE_URL`
- `FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL`
- `--database-url` / argv DSN
- `RA_PRO_CUTOVER_APPLY_SSL_ROOTCERT` (embedded CA only)

## Pre-apply (fresh evidence)

See `PRE_CHANGE_CONTRACT.json`. Historical PASS is not permanently fresh. Independently confirm:

- Gate-aware build serving checkout/webhook
- Commerce gate closed/unset on that serving build
- Old deployment URLs protected
- Ledger/Stripe quiescence within bounded window
- Ceremony inventory NO_CUTOVER × 4; no drift
- History count 187; version/objects absent

## Dry-run verdict

`DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION`

Dry-run is read-only: `sqlApplicationAttempts=0`, `advisory_lock_acquired=false`, history 187, version absent.

## Apply gate

Apply fails closed with `PRIOR_DRY_RUN_PINS_UNPUBLISHED` when `required_prior_dry_run_*` are null or `published_prior_dry_run.status` is `UNPUBLISHED` — **before** prompting or connecting.

Post-apply: history 188; version exactly once; `billing_company_id` present; linked firms = 0; bootstrap/activate RPCs service_role EXECUTE only.

## Local disposable rehearsal

1. Docker available
2. `npx vitest run tests/security/ra-pro-cutover-applicator.test.ts`

## Freeze placeholders

`authorized_pr_head`, `AUTHORIZED_TOOLING_FREEZE`, and `bundle_source_commit` remain `PLACEHOLDER_40HEX_…` until freeze commits.
