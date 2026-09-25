# Review agent guide

Use this guide after implementation is recorded (`STATUS: IMPLEMENTATION_COMPLETE`).

Prefer the **independent Cloud Agent reviewer** for automation. Local CLI recording remains available for manual/emergency use.

## Cloud Agent reviewer (preferred)

```bash
npm run orchestrator:launch-reviewer -- docs/plans/<PLAN-ID>.md
npm run orchestrator:status-reviewer -- docs/plans/<PLAN-ID>.md
```

Dry-run (no network mutation):

```bash
npm run orchestrator:dry-run-reviewer -- docs/plans/<PLAN-ID>.md --dry-run
```

See `docs/agent/CLOUD_AGENT_REVIEWER.md`.

## Local prepare payload (optional)

```bash
node scripts/orchestrator/prepare-review.js docs/plans/<PLAN-ID>.md
```

`prepare-review.js` does **not** advance status.

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
- [ ] Builder branch is isolated (`cursor/...`), not `main`
- [ ] Reviewer agent is distinct from builder agent

## Record verdict (manual CLI)

Verdicts: `PASS` | `NEEDS_CHANGES` | `BLOCKED`

```bash
node scripts/orchestrator/record-review.js docs/plans/<PLAN-ID>.md \
  --verdict PASS --advance --notes "Scope OK; validation evidence attached"
```

```bash
node scripts/orchestrator/record-review.js docs/plans/<PLAN-ID>.md \
  --verdict NEEDS_CHANGES --notes "Describe required fixes"
```

```bash
node scripts/orchestrator/record-review.js docs/plans/<PLAN-ID>.md \
  --verdict BLOCKED --notes "Describe blocking issues"
```

Rules:

- Cloud/manual PASS → `REVIEW_PASSED`; with advance → `READY_FOR_HUMAN_APPROVAL`
- `NEEDS_CHANGES` → `REVIEW_FAILED`
- `BLOCKED` → `BLOCKED` (Cloud ingest) or `REVIEW_FAILED` (legacy CLI without advance)
- Never set `COMPLETED`
- Never merge or deploy

## After PASS

```bash
npm run orchestrator:human-summary -- docs/plans/<PLAN-ID>.md
```

Human approval is still required before merge and production deploy.
