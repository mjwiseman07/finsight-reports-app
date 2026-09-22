# RA Pro accounting-automation CORRECTIVE apply

## Scope

Applies **only** the sealed corrective migration:

- `20260922003200_ra_pro_accounting_automation_service_role_least_privilege`

History contract: **190 → 191**.

## Never re-run the originals

The dual migrations below are already **committed in production** (history 190):

1. `20260917044537_ra_pro_weekly_completeness_findings`
2. `20260917180140_ra_pro_month_end_review_packages`

Do **not** modify those SQL files. Do **not** re-include or re-execute their statements through this corrective package. Corrective tooling refuses any apply target that names those versions.

The consumed dual-package attempt id `apply-b9926961e32c-8aecb1bd2f5f17dec0483dd550bb395f` must never be reused.

## Authority

| Mode | Required authority |
|---|---|
| **dry-run** | Bundle seals (when published) + corrective credential channel |
| **apply** | Published `production_apply_authorization` (AUTHORIZED) + apply token |

`production_apply_authorization` starts **UNPUBLISHED** (`apply_authorized: false`, `attempt_id: null`). It stays unpublished until a separate reviewed publication. Evidence pins and the apply token alone do not authorize apply.

## Safety

- Credential channel: `RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY_DATABASE_URL` only.
- Forbidden: `DATABASE_URL`, `RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL`, cutover / FRLS / containment apply URL envs.
- Never sets `ENABLE_RA_PRO_ACCOUNTING_AUTOMATION` — automation stays disabled.
- Advisory lock: `RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY`.
- Corrective SQL only revokes excess `service_role` table DML and re-asserts SELECT+INSERT. It does not drop policies/RLS/functions or touch provider/invoice data.

## Commands (offline / harness)

```bash
node scripts/security/verify-ra-pro-accounting-automation-corrective-apply-authority.js
node scripts/security/assemble-ra-pro-accounting-automation-corrective-applicator-standalone-bundle.js
node scripts/security/apply-ra-pro-accounting-automation-corrective.js --dry-run
```

Do not run apply against production until authorization is separately published after review.
