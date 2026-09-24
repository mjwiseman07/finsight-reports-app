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
| **evidence collection** | Published `production_collection_authorization` (AUTHORIZED) naming `authorized_executable_commit` as a strict ancestor executable tip; AUTH-object-only descendant publication; contracts/schema/gates/collector/bundle seals loaded from the executable tip via `git cat-file` |
| **dry-run** | Bundle seals (when published) + published corrective **precondition** evidence pins + corrective credential channel |
| **apply** | Published corrective **precondition** + **pre-apply live** evidence pins + published `production_apply_authorization` (AUTHORIZED) + apply token |

Corrective evidence gates (`RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_V1` and `RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRE_APPLY_LIVE_EVIDENCE_V1`) are schema v3 and bind `authorized_executable_commit` + `authorization_publication_commit` + `authorization_publication_blob_oid`. Free-form attestations such as `collection_tooling_tip` are never authority.

`production_collection_authorization` is **AUTHORIZED** for immutable executable tip `2617f2e4…` via AUTH-only publication `15732f70…` (blob `cd94d9bd…`). Tip `dbdce968…` remains rejected/stale and must never authorize collection.

Non-circular model: the immutable executable tip never stores its own SHA as a collection head constant. A later one-object publication may change only `production_collection_authorization`, name the already-known executable tip, and must not embed the publication commit SHA. Removing that AUTH object must leave the publication JSON byte/semantically identical to the executable-tip JSON.

`precondition_publication` and `pre_apply_live_publication` are **PUBLISHED** from evidence source commit `a055228c…` with byte-exact independently reviewed fresh artifacts and the collection-authority triad (executable `2617f2e4…` / publication `15732f70…` / blob `cd94d9bd…`). Prior identities from `5e368e70…` are superseded and must not satisfy active gates. Pin publication does **not** authorize credentials, dry-run DB contact, apply, merge, deploy, env changes, or automation. Dual-package and cutover evidence protocols remain forbidden substitutions.

`production_apply_authorization` remains **UNPUBLISHED** (`apply_authorized: false`, `attempt_id: null`). It stays unpublished until a separate reviewed publication. Evidence pins and the apply token alone do not authorize apply. Apply fails closed with `APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS` before any database URL is resolved.

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

### Dry-run evidence retention (mandatory)

Dry-run stdout is exactly one sealed **applicator frame**:

`RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_DRY_RUN_EVIDENCE_V1:<base64url>`

#### Frame vs receipt hierarchy

| Artifact | Authority | Contains |
| --- | --- | --- |
| `CORRECTIVE_PRODUCTION_DRY_RUN_EVIDENCE.json` | Sealed applicator bytes (immutable after retain) | Dry-run verdict, bundle/migration seals, pins, CA, counters. **No `cleanup` field.** |
| `CORRECTIVE_PRODUCTION_DRY_RUN_CEREMONY_RECEIPT.json` | Fail-closed ceremony measurements | Credential/material disposal, child termination, orphan check, evidence digest unchanged, `pin_ready`. |
| `CORRECTIVE_PRODUCTION_DRY_RUN_SUMMARY.json` (optional) | Non-authoritative | Binds evidence + receipt by SHA-256/bytes only — never reserializes the sealed frame. |

**Pin-ready requires both:** a schema-valid retained evidence frame **and** a ceremony receipt with `pin_ready: true` (all mandatory cleanup bools true, empty `cleanup_error_codes`, evidence digest unchanged). Frame alone is never pin-ready.

The retained evidence file must be the **exact decoded canonical JSON payload bytes** (UTF-8, LF-only, one trailing LF, no BOM). Capture stdout binary-safe; extract/retain via `ra-pro-accounting-automation-corrective-evidence-decode-frame.js`. **Never** `ConvertFrom-Json` / `ConvertTo-Json` the sealed frame.

Ceremony / bundle / evidence-module seals for reporting come from **`git cat-file` / `git rev-parse tip:path` only** — never from worktree bytes. A CRLF worktree copy of the ceremony script must not substitute for the tip blob.

Rejected / non-pin-ready: any prior CRLF or PowerShell-reserialized artifact (e.g. temp dry-run `bec0a81f…` / 4701 bytes with CR). Do not normalize it — require a new authorized dry run after this tooling passes review.

Operator ceremony (visible SecureString; dry-run only):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1 -PinTip <40-hex-pin-tip>
```

Do not run apply against production until authorization is separately published after review.
