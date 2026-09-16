# RA Pro billing-company cutover apply runbook (tooling only)

**Tooling rehearsal only. Do not apply to production without a published freeze→bundle-source→tip chain, published fresh-precondition pins, published prior dry-run pins (apply), and separate apply authorization.**

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

## Three-commit authority chain (non-circular)

1. **Executable freeze** — final scripts/modules; constants may still hold `PLACEHOLDER_40HEX_…`; tip auth may still say `PENDING_AFTER_COMMIT` / `bundle_source_commit=null`; staged bundle is not selected at tip.
2. **Bundle source** (direct descendant of freeze) — bake `AUTHORIZED_TOOLING_FREEZE` to the exact freeze SHA, rebuild standalone `.cjs`, set `authorized_pr_head` to freeze, leave `bundle_source_commit` null until tip pin.
3. **Final tip** (descendant of bundle source) — set `bundle_source_commit` to the bundle-source SHA only (no tip-only executable constant edits).

Required tip relations:

- `authorized_pr_head` = executable freeze
- `bundle_source_commit` = bundle source
- freeze ≠ bundle source
- bundle source descends from freeze
- tip descends from bundle source

Bootstrap materializes the standalone bundle from `${bundle_source_commit}:scripts/security/bundles/ra-pro-cutover-applicator.standalone.cjs` and verifies OID/SHA/bytes/non-reparse plus exact embedded 40-hex freeze. Other executable authority follows freeze seals.

### Mixed authority map (visible dry-run path)

| Artifact | Authority commit | Notes |
| --- | --- | --- |
| `TOOLING_AUTHORIZATION.json` | publication tip (`HEAD`, exact 40-hex) | Loaded only via `git cat-file ${tip}:…` |
| `visible_ceremony_entry` | publication tip | Supervisor tip-materializes; entry self-verifies tip seals |
| `operator_ceremony` (dry-run) | publication tip | Entry materializes `${PublicationTip}:${operator_ceremony.path}` and verifies tip seal OID/SHA/bytes/non-reparse. **No freeze fallback when precondition evidence is PUBLISHED.** |
| `visible_ceremony_launcher` | executable freeze | Entry materializes from freeze seals |
| `operator_apply_ceremony` | executable freeze | Apply path only |
| `native_entry` / `native_bootstrap` / precondition gates / evidence modules | executable freeze | Ceremony materializes freeze-owned companions |
| standalone applicator `.cjs` | `bundle_source_commit` | Bootstrap only |

Publication tip must be an exact resolved 40-hex commit with freeze ← bundle_source ← tip ancestry. Argv/env/ref-name/abbrev-SHA/mutable-worktree substitutions for tip or ceremony path are rejected before prompt/Node/DB.

### `auth_seals_digest` coverage

SHA-256 of `JSON.stringify` over exactly:

`artifact_commit`, `project_ref`, `migration_path`, `migration_blob_oid`, `migration_sha256`, `migration_bytes`, `migration_version`, `migration_name`, `database_url_env`, `apply_authorization_token`, `advisory_lock`, `pg_version`, `lockfile_path`

Independent blob checks (not in digest): standalone bundle, decision, native/ceremony/evidence/gate modules, `AUTHORIZED_TOOLING_FREEZE`, freeze/source ancestry.

`EXPECTED_STANDALONE_BUNDLE_SHA256` may remain `PENDING_*` and is **inert** unless `requireStandaloneBundleSelfHash` is set; bootstrap never treats it as tip authority.

## Fresh precondition evidence (dry-run gate)

Protocol: `RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_V1` — see `PRECONDITION_EVIDENCE_CONTRACT.json`.

Tip pins `required_precondition_*` + `published_precondition_evidence`. When **UNPUBLISHED/null**, the production dry-run ceremony refuses **before** SecureString prompt, Node, or DB (`PRECONDITION_PINS_UNPUBLISHED`). When **PUBLISHED**, the dry-run ceremony materializes the tip-sealed evidence fixture via `git cat-file` only (env/argv/worktree path overrides are forbidden) and asserts SHA/bytes/content before prompting.

Distinct from prior-dry-run pins (apply-only).

## Pre-apply inventory (when pins published)

See `PRE_CHANGE_CONTRACT.json` / precondition contract. Independently confirm via sealed evidence:

- Gate-aware build serving checkout/webhook (merge `19e8bd071bae5f8afed85340f50168d4ca8e5586`)
- Commerce gate closed/absent (never open)
- Old deployment URLs protected; custom domains public
- Ledger/Stripe quiescence within bounded window
- Ceremony inventory NO_CUTOVER × 4 (company 3 / firm 1); no drift
- History count 187; version/objects absent

## Dry-run verdict

`DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION`

Dry-run is read-only: `sqlApplicationAttempts=0`, `advisory_lock_acquired=false`, history 187, version absent.

## Apply gate

Apply fails closed with `PRIOR_DRY_RUN_PINS_UNPUBLISHED` when `required_prior_dry_run_*` are null or `published_prior_dry_run.status` is `UNPUBLISHED` — **before** prompting or connecting.

Post-apply: history 188; version exactly once; `billing_company_id` present; linked firms = 0; bootstrap/activate RPCs service_role EXECUTE only.

## Local disposable rehearsal

1. Docker available
2. `npx vitest run tests/security/ra-pro-cutover-applicator.test.ts tests/security/ra-pro-cutover-bootstrap-e2e.test.ts tests/security/ra-pro-cutover-ceremony-launch.test.ts tests/security/ra-pro-cutover-precondition-gates.test.ts`
