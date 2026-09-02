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

## Fresh disposable database (required before APPLY)

1. Create an **empty** local database named `option_d_*` (example: `option_d_clean_replay`).
2. Set `OPTION_D_DISPOSABLE_DB_NAME` to that exact name.
3. Set `OPTION_D_DATABASE_URL` to that database on an allowlisted localhost host.
4. Set `OPTION_D_APPLY=1`.

The harness **refuses** to apply if:
- the DB name is ambiguous (`postgres`) or mismatched;
- any public application relations exist;
- `supabase_migrations.schema_migrations` already contains app versions (partial replay).

It does **not** auto-reset or delete the target.

## Runtime gates (all required for PASS_RUNTIME)

| Gate | Meaning |
|------|---------|
| `candidateReplay` | Fresh-DB precheck + assembled SQL apply |
| `securityImmutabilityChecks` | Executed final schema/RLS, view `security_invoker`, SI/Memory immutability triggers |
| `pr312RpcValidation` | Structured Vitest JSON: expected tests executed, zero skip/todo/pending/fail; pinned to PR #312 `f65730b3` |
| `productionDashboardReplayParity` | Always `unresolved` (Option A/B; not applicable to Option D PASS) |

Listing check names is not execution — absent security evidence fails closed.
