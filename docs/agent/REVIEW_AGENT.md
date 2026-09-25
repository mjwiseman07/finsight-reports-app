# Review agent guide

Use this guide after implementation is recorded (`STATUS: IMPLEMENTATION_COMPLETE`).

## Preconditions

```bash
node scripts/orchestrator/prepare-review.js docs/plans/<PLAN-ID>.md
```

Review the emitted payload: plan scope, implementation notes, and changed files.

`prepare-review.js` does **not** advance status; it stays `IMPLEMENTATION_COMPLETE` until a verdict is recorded.

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

Verdicts: `PASS` | `NEEDS_CHANGES` | `BLOCKED`

Pass (and optionally advance to human approval):

```bash
node scripts/orchestrator/record-review.js docs/plans/<PLAN-ID>.md \
  --verdict PASS --advance --notes "Scope OK; validation evidence attached"
```

Needs changes:

```bash
node scripts/orchestrator/record-review.js docs/plans/<PLAN-ID>.md \
  --verdict NEEDS_CHANGES --notes "Describe required fixes"
```

Blocked:

```bash
node scripts/orchestrator/record-review.js docs/plans/<PLAN-ID>.md \
  --verdict BLOCKED --notes "Describe blocking issues"
```

Rules:

- `PASS` → `REVIEW_PASSED`; with `--advance` → `READY_FOR_HUMAN_APPROVAL`
- `NEEDS_CHANGES` or `BLOCKED` → `REVIEW_FAILED`; `--advance` MUST exit non-zero
- Mismatched `--plan-id` MUST exit non-zero
- Missing / malformed verdict MUST exit non-zero

## After PASS + advance

Human summary for merge decision:

```bash
node scripts/orchestrator/human-summary.js docs/plans/<PLAN-ID>.md
```

Human approval is still required before merge and production deploy. Scripts never set `COMPLETED`.
