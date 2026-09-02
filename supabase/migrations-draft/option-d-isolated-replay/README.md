# Option D — isolated Git replay candidate

**Mechanism recommendation only — not merge approval.**  
**Production migration-history repair remains separate (Option A/B / G4).**

## What this directory is

| Path | Purpose |
|------|---------|
| `substitutions/` | Reviewed guarded/schema-only replacements for blockers |
| `assembled/` | Generated candidate lineage (run assembler; do not hand-edit) |

Active `supabase/migrations/` is **unchanged**. Production `schema_migrations` is **unchanged**.

## Assemble

```bash
node scripts/migration-remediation/assemble-option-d-replay.js
node scripts/migration-remediation/audit-option-d-replay-gate.js
```

## Runtime (local-only; stop for review before remote)

```bash
node scripts/migration-remediation/run-option-d-isolated-replay.js
```

Missing Docker/local Postgres ⇒ **BLOCKED** (not PASS).  
Apply requires `OPTION_D_DATABASE_URL` (localhost allowlist only) + `OPTION_D_APPLY=1`.

## Scope distinction

1. **Isolated candidate-lineage** — this directory + manifest + Option D gate  
2. **PR #312 RPC validation** — `test:je-execution-reservation-postgres` after clean apply  
3. **Production dashboard replay parity** — unresolved
