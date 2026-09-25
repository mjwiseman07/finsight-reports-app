# Autonomous remediation

The orchestrator can resolve **technical** blockers without Matthew acting as a clipboard.

```text
APPROVED → BUILDER → REVIEWER
  PASS → READY_FOR_HUMAN_APPROVAL
  NEEDS_CHANGES / technical failure
    → ANALYZING_BLOCKER (resolver)
    → RESOLUTION_PROPOSED
    → REMEDIATION_IN_PROGRESS (same PR branch)
    → REMEDIATION_COMPLETE → IMPLEMENTATION_COMPLETE
    → NEW reviewer (never reuse old result)
    → repeat until PASS | HUMAN_DECISION_REQUIRED | max cycles
```

## Blocker classes

| Class | Meaning | Automation |
|-------|---------|------------|
| `AUTONOMOUSLY_RESOLVABLE` | Tests/lint/build/defects fixable from repo evidence | Resolver → remediation builder → re-review |
| `HUMAN_DECISION_REQUIRED` | Secret, prod action, business rule, scope, merge, deploy | Stop; one decision packet |
| `TRANSIENT_RETRY` | 429 / network / 5xx | Bounded backoff retry |
| `FATAL_INFRASTRUCTURE_BLOCK` | Unrecoverable env/infra | Human decision packet |

## Commands

```bash
npm run orchestrator:resolve -- docs/plans/<PLAN>.md
npm run orchestrator:status-resolver -- docs/plans/<PLAN>.md
npm run orchestrator:remediate -- docs/plans/<PLAN>.md
npm run orchestrator:status-remediation -- docs/plans/<PLAN>.md
npm run orchestrator:run -- docs/plans/<PLAN>.md
npm run orchestrator:resume -- docs/plans/<PLAN>.md
```

Dry-run: append `--dry-run` (no Cloud Agent create).

## Budget

`MAX_REMEDIATION_CYCLES` (default 5) via `ORCHESTRATOR_MAX_REMEDIATION_CYCLES`.

After budget exhaustion → `HUMAN_DECISION_REQUIRED` with attempt summary (not generic `BLOCKED`).

## Security (unchanged)

- No autonomous merge
- No autonomous production deploy
- No `COMPLETED` write by scripts
- Remediation never targets `main`
- Remediation requires verified builder PR branch
- No production secrets in agent env / packets / audit trail
