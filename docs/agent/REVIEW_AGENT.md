# Review agent guide

Use this guide after implementation is recorded (`IMPLEMENTATION_COMPLETE` or `IN_REVIEW`).

## Preconditions

```bash
node scripts/orchestrator/prepare-review.js docs/plans/<PLAN-ID>.md
```

Review the emitted payload: plan scope, implementation notes, and changed files.

## Review checklist

### Scope fidelity

- [ ] Changes match approved Scope only
- [ ] Out of Scope items were not touched

### Security

- [ ] No auth/authorization regressions
- [ ] RLS and tenant isolation preserved
- [ ] No secrets, tokens, or credentials in diff
- [ ] No production data modifications

### Quality

- [ ] Validation commands from plan were run (or failure explained)
- [ ] No tests disabled to pass CI
- [ ] Migrations present for schema changes

### Process

- [ ] Plan STATUS was `APPROVED_FOR_IMPLEMENTATION` before work started
- [ ] Branch is feature branch, not `main`

## Record verdict

Pass:

```bash
node scripts/orchestrator/record-review.js docs/plans/<PLAN-ID>.md \
  --verdict PASS --advance --notes "Scope OK; validation evidence attached"
```

Fail:

```bash
node scripts/orchestrator/record-review.js docs/plans/<PLAN-ID>.md \
  --verdict FAIL --notes "Describe blocking issues"
```

`--advance` with `--verdict FAIL` MUST exit non-zero (unsafe transition blocked).

## After PASS + advance

Human summary for merge decision:

```bash
node scripts/orchestrator/human-summary.js docs/plans/<PLAN-ID>.md
```

Human approval is still required before merge and production deploy.
