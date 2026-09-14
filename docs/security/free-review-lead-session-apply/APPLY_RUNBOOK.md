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

Materialize bootstrap from freeze via `enter-free-review-lead-session-apply.ps1` — see `TOOLING_AUTHORIZATION.json` for seals.
