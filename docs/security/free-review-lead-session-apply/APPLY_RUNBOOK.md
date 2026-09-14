# Free Review Lead Sessions Apply Runbook (Tooling Only)

**This document describes operator tooling rehearsal only. Do not apply to production from this repository state without a published tooling freeze and separate apply authorization.**

## Package

- Migration: `supabase/migrations/20260913235500_free_review_lead_sessions.sql`
- Version: `20260913235500`
- Artifact commit: `b2c431fa4310f58c9ee667e858333e084c2fed52`
- Apply token: `I_AUTHORIZE_FREE_REVIEW_LEAD_SESSIONS_APPLY_20260913235500`

## Credential channel

Set **only**:

```
FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL
```

Forbidden:

- `DATABASE_URL`
- `CONTAINMENT_APPLY_DATABASE_URL`
- `--database-url` / argv DSN
- `FREE_REVIEW_LEAD_SESSION_APPLY_SSL_ROOTCERT` (embedded CA only)

## Dry-run verdict

Successful dry-run emits:

`DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION`

Apply requires the exact `--i-authorize-production-apply` token on a **separate** invocation after dry-run evidence is reviewed.

## Local disposable rehearsal

1. Ensure Docker is available.
2. Run vitest: `npx vitest run tests/security/free-review-lead-session-applicator.test.ts`
3. Optional full rehearsal: `node scripts/security/rehearse-free-review-lead-session.js`

## Native entry (after freeze publication)

Materialize bootstrap from the **executable freeze** via `enter-free-review-lead-session-apply.ps1` — see `TOOLING_AUTHORIZATION.json` for seals.

## Two-authority tip/freeze model

- **Executable freeze** (`authorized_pr_head` / `-PrHead`): runtime and pin identity. Pass this to ceremonies and bootstrap.
- **Bundle source commit** (`bundle_source_commit`): immutable commit whose tree contains the finalized standalone bundle sealed by tip authorization.
- Bootstrap loads tip authorization, verifies freeze identity and ancestry, then materializes the bundle from `${bundle_source_commit}:…standalone.cjs` (never from the freeze tree). This avoids the circular “bundle embeds its own tip SHA” problem: tip authorization may be a descendant commit that only seals `bundle_source_commit`.

Publication order:

1. Freeze commit — tooling changes; `AUTHORIZED_TOOLING_FREEZE` / `authorized_pr_head` may still be `PENDING_AFTER_COMMIT`.
2. Bundle-source commit — bake freeze SHA into constants, rebuild the standalone bundle, seal OID/SHA/bytes; set `authorized_pr_head` to the freeze; leave `bundle_source_commit` null until the tip pin.
3. Final tip — set `bundle_source_commit` to the bundle-source commit SHA (no bundle rebuild required if the blob is unchanged).

Prior-dry-run pins are published after the authorized production dry-run:

- Evidence SHA-256: `b27e927b98efc8be40d74940cf1e547a968687dfcfccff4b7d0c85c416141209`
- Dry-run freeze: `7e4d4e4b4e57052ed2bdfdc201b12564edc46349`
- Dry-run tip: `d08134526141be86e8936f477da38b76a8ae4c26`
- Dry-run bundle source: `823b466445599b6095e03a376f57ffc86fe0bf1d`

Apply requires `-PriorDryRunEvidencePath` pointing at the exact retained evidence file whose SHA and contents match these seals. Rejected: closed headless attempt; superseded evidence `e5202a46…`.

### Evidence fixture vs migration line endings

- **Prior-dry-run evidence fixture** (`tests/security/helpers/fixtures/frls-prior-production-dry-run-evidence.json`) is intentionally **CRLF**, marked `-text` in `.gitattributes`, and is **byte-authoritative**: tip Git blob SHA-256 must equal `b27e927b…` / 110391 bytes. No EOL conversion is permitted.
- **Migration SQL** remains **LF-authoritative** via git blob OID `7dca9674…` (SHA-256 `b7e1e68b…` / 8108 bytes). Do not conflate the two authorities.

### Dry-run bundle-source pin

`required_prior_dry_run_bundle_source` (`823b4664…`) is tip-authorization metadata. Production evidence does **not** embed that 40-hex as a JSON field; the authoritative present identity is `applicator.bootstrap.bundle_{oid,sha256,bytes}`, which must match `published_prior_dry_run.dry_run_standalone_bundle` (the sealed artifact of that dry-run bundle-source commit). This is never the current apply tip’s `bundle_source_commit` / `standalone_bundle`.
