# RA Pro accounting-automation migration applicator

## Scope

Applies these two sealed migrations **atomically** (one transaction), in order:

1. `20260917044537_ra_pro_weekly_completeness_findings`
2. `20260917180140_ra_pro_month_end_review_packages`

History contract: **188 → 190**.

## Authority split

| Mode | Required authority |
|---|---|
| **dry-run** | Committed bundle seals + published `precondition_publication` + sealed visible supervise/enter/ceremony chain |
| **apply** | Bundle + precondition + published prior-dry-run + published pre-apply + sealed apply token |

Prior-dry-run / pre-apply pins remain **UNPUBLISHED/null** until a separately reviewed production dry run is sealed. Apply stays unreachable until then.

### Three-commit visible ceremony chain

| Identity | Auth field | Role |
|---|---|---|
| **Freeze** | `authorized_pr_head` | Executable freeze; `-PrHead` must match exactly |
| **Source** | `ceremony_source_commit` | Holds reviewed supervise / enter / operator ceremony bytes |
| **Tip** | `HEAD` publication tip | Publishes OID/SHA-256/byte/LF seals; must be a descendant of source; tip ≠ freeze ≠ source |

Sealed artifacts (each with `path`, `source_commit`, `oid`, `sha256`, `bytes`, `line_endings=LF`):

- `visible_ceremony_supervisor`
- `visible_ceremony_entry`
- `operator_ceremony`
- `standalone_bundle` (unchanged applicator bundle authority)

Gate order (fail-closed):

1. Mandatory standalone bundle authority (`git cat-file`)
2. Committed precondition evidence validation
3. Mode-specific authorization (dry-run skips apply pins; apply requires them)
4. Credential prompt / `RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL`
5. Node / database contact
6. SQL (apply only; dry-run executes **zero** migration SQL)

## Safety

- Credential channel: `RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL` only.
- Forbidden: `DATABASE_URL`, cutover / FRLS / containment apply URL envs.
- Production / ceremony hosts must bind to Supabase project `jzmdgwwiestcmmeuhhkr` (`DATABASE_PROJECT_REF_MISMATCH` otherwise). Loopback is forbidden outside an in-process harness input unavailable via CLI/argv/env/standalone.
- Never sets `ENABLE_RA_PRO_ACCOUNTING_AUTOMATION`.
- Advisory lock: `RA_PRO_ACCOUNTING_AUTOMATION_APPLY`.
- No automatic retry (one authorization → one attempt marker).
- Evidence and seals come from committed Git blobs only — never mutable worktree evidence or ceremony authority.
- Forbid argv/environment overrides of ceremony path, entry path, source commit, publication tip, bundle path, and precondition evidence path/sha.
- Visible ceremony: tip-load auth → ancestry check → `git cat-file` materialize → verify OID/SHA/bytes/LF/UTF-8/no-BOM/non-reparse → launch **only** temporary materialized scripts. Bounded child timeout, scoped process-tree termination, guaranteed removal of material roots, `raw-child-stdout.frame.txt` and `bundle-*.cjs`, truthful `cleanup.*` evidence fields.

## Operator (visible dry-run ceremony)

**Only** the sealed supervisor is the operator entrypoint:

```powershell
# Interactive SecureString prompt (production DB URL). Does NOT apply migrations.
# Requires HEAD = publication tip with seals; -PrHead = authorized_pr_head (freeze).
powershell -NoProfile -File scripts/security/supervise-visible-ra-pro-accounting-automation-ceremony.ps1 `
  -Mode dry-run `
  -PrHead <exact-40-hex-freeze>
```

**Forbidden:** direct execution of the operator ceremony or entry script from the worktree:

```powershell
# DO NOT RUN — rejected (CEREMONY_DIRECT_EXEC_FORBIDDEN / ENTRY_DIRECT_EXEC_FORBIDDEN)
powershell -NoProfile -File scripts/security/operator-ra-pro-accounting-automation-production-dryrun-ceremony.ps1 ...
powershell -NoProfile -File scripts/security/enter-ra-pro-accounting-automation-apply.ps1 ...
```

Apply mode remains refuse-closed while prior/pre-apply pins are unpublished:

```powershell
powershell -NoProfile -File scripts/security/supervise-visible-ra-pro-accounting-automation-ceremony.ps1 `
  -Mode apply `
  -PrHead <exact-40-hex-freeze>
# → AUTHORIZATION_PINS_UNPUBLISHED
```

Offline seal verify (no DB):

```bash
node scripts/security/verify-ra-pro-accounting-automation-apply-authority.js
```

Reseal ceremony authority after reviewing source bytes (does not publish apply pins):

```bash
node scripts/security/reseal-ra-pro-accounting-automation-ceremony-auth.js --freeze <freeze> --source <source>
```

## Harness only

Disposable Docker apply rehearsals may pass `allowUnpublishedForHarness: true` to exercise apply SQL without publishing production prior/pre-apply pins. Dry-run Docker rehearsals use the real published precondition pins (no harness bypass required).

Unit tests may set `RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_DIRECT_HARNESS=1` together with `RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL=1` to invoke the ceremony script in-process; that harness is not an operator path.
