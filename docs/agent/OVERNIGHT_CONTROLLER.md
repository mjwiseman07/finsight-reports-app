# Overnight controller

Unattended lifecycle driver for an **already approved** plan.

```bash
npm run orchestrator:run -- docs/plans/<PLAN>.md
npm run orchestrator:resume -- docs/plans/<PLAN>.md
npm run orchestrator:morning-report -- docs/plans/<PLAN>.md
```

## Stops when

- `READY_FOR_HUMAN_APPROVAL`
- `HUMAN_DECISION_REQUIRED`
- Max remediation cycles
- Fatal infrastructure block (via human decision packet)

## Never

- Merge to main
- Production deploy
- Set `COMPLETED`
- Assume answers to human decisions
- Launch duplicate agents when one is already active (resume-safe)

## Resume

`orchestrator:resume` inspects companion status JSON + agent run status + GitHub PR and continues from the next safe action.

## Workspace / Git safety

Overnight entrypoints load `.env.local` (if present) and run a **worktree guard** before any Cloud Agent launch:

- Non-interactive Git only (`GIT_TERMINAL_PROMPT=0`, no editors/pagers)
- Refuse dirty **tracked** files (no stash / commit / discard UI)
- Never auto-discard local changes
- Never check out `cursor/...` agent branches into the controller tree — inspect via GitHub/API or a separate clean worktree
- On unsafe Git state: machine-readable `FATAL_INFRASTRUCTURE_BLOCK` (not an interactive prompt)

Run overnight from a dedicated clean worktree checked out from `origin/main` (example: `finsight-reports-je4-overnight`).

## Config (non-secret)

| Env | Default | Purpose |
|-----|---------|---------|
| `ORCHESTRATOR_MAX_REMEDIATION_CYCLES` | 5 | Loop budget |
| `ORCHESTRATOR_MAX_TRANSIENT_RETRIES` | 3 | 429/5xx/network |
| `ORCHESTRATOR_TRANSIENT_RETRY_BASE_MS` | 1000 | Backoff base |
| `ORCHESTRATOR_POLL_INTERVAL_MS` | 15000 | Poll cadence |
| `ORCHESTRATOR_MAX_POLL_MS` | 2700000 | Per-agent poll cap |

## Morning report

Concise summary: plan, state, attempt counts, PR, whether human intervention is required, remaining action.
