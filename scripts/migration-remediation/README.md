# Supabase migration-lineage remediation (review-only)

**Branch:** `chore/supabase-migration-lineage-remediation`  
**Verdict:** See PR description — `MIGRATION REMEDIATION DRAFT PR: CHANGES REQUIRED`

This package is **architecture, evidence, and local verification only**. It does not modify `supabase/migrations/`, production, or PR #312.

## Contents

| Path | Purpose |
|------|---------|
| `supabase/migrations-draft/` | Non-deployable baseline draft |
| `docs/migration-remediation/` | Design, security, provenance, evidence |
| `scripts/migration-remediation/` | Audits, generator, schema inventory helper |
| `tests/migration-remediation/` | Review gate tests |

## Run review gate

```bash
node scripts/migration-remediation/generate-foundations-baseline.js
node scripts/migration-remediation/audit-baseline-static.js
node scripts/migration-remediation/audit-migration-mapping.js
node scripts/migration-remediation/audit-secret-scan.js
npx vitest run tests/migration-remediation/review-gate.test.ts
```

## Key design doc

Read `docs/migration-remediation/branch-replay-design.md` first — **repair-only baseline is insufficient for dashboard branch replay**.

## Production schema diff (blocked)

Requires `npx supabase login` and read-only DB URL. Use `schema-inventory.js` after auth.

## Local replay (blocked)

Docker not installed in review environment. Do not substitute production.
