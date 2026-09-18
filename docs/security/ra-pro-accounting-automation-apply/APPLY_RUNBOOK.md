# RA Pro accounting-automation migration applicator

## Scope

Applies these two sealed migrations **atomically** (one transaction), in order:

1. `20260917044537_ra_pro_weekly_completeness_findings`
2. `20260917180140_ra_pro_month_end_review_packages`

History contract: **188 → 190**.

## Safety

- Credential channel: `RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL` only.
- Forbidden: `DATABASE_URL`, cutover / FRLS / containment apply URL envs.
- Never sets `ENABLE_RA_PRO_ACCOUNTING_AUTOMATION`.
- Advisory lock: `RA_PRO_ACCOUNTING_AUTOMATION_APPLY`.
- No automatic retry.
- Production apply remains **unreachable** while `TOOLING_AUTHORIZATION.json` publication pins are `UNPUBLISHED` / null.
- The reviewed precondition evidence is independently sealed and checked before the still-unpublished prior-dry-run/apply authority. Publishing it alone cannot authorize production contact.

## Operator

```powershell
# Always blocked on this tip (pins unpublished):
powershell -NoProfile -File scripts/security/enter-ra-pro-accounting-automation-apply.ps1 -Mode dry-run
```

Offline seal verify (no DB):

```bash
node scripts/security/verify-ra-pro-accounting-automation-apply-authority.js
```

## Harness only

Disposable Docker rehearsals may pass `allowUnpublishedForHarness: true` to exercise apply logic without publishing production pins.
