# Orchestrator state machine (V1 + autonomous remediation)

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> READY_FOR_REVIEW
  READY_FOR_REVIEW --> APPROVED_FOR_IMPLEMENTATION: human
  APPROVED_FOR_IMPLEMENTATION --> IN_PROGRESS: launch-builder
  IN_PROGRESS --> IMPLEMENTATION_COMPLETE: status-builder
  IN_PROGRESS --> ANALYZING_BLOCKER: technical failure
  IMPLEMENTATION_COMPLETE --> REVIEW_PASSED: reviewer PASS
  IMPLEMENTATION_COMPLETE --> REVIEW_FAILED: NEEDS_CHANGES
  IMPLEMENTATION_COMPLETE --> BLOCKED: reviewer BLOCKED
  REVIEW_PASSED --> READY_FOR_HUMAN_APPROVAL
  READY_FOR_HUMAN_APPROVAL --> COMPLETED: human only
  REVIEW_FAILED --> ANALYZING_BLOCKER: launch-resolver
  BLOCKED --> ANALYZING_BLOCKER: reclassify
  ANALYZING_BLOCKER --> RESOLUTION_PROPOSED: AUTONOMOUSLY_RESOLVABLE
  ANALYZING_BLOCKER --> HUMAN_DECISION_REQUIRED: human-only / fatal
  RESOLUTION_PROPOSED --> REMEDIATION_IN_PROGRESS: launch-remediation
  REMEDIATION_IN_PROGRESS --> REMEDIATION_COMPLETE: status-remediation
  REMEDIATION_COMPLETE --> IMPLEMENTATION_COMPLETE: clear prior review
  IMPLEMENTATION_COMPLETE --> REVIEW_PASSED: re-review PASS
  HUMAN_DECISION_REQUIRED --> [*]: wait for Matthew
```

## Human-only

- → `APPROVED_FOR_IMPLEMENTATION`
- → `COMPLETED`
- Merge to `main`
- Production deploy
- Answering `HUMAN_DECISION_REQUIRED` (no automatic assumption)

## CLI

| Command | Role |
|---------|------|
| `orchestrator:launch` / `status` | Builder |
| `orchestrator:launch-reviewer` / `status-reviewer` | Reviewer |
| `orchestrator:resolve` / `status-resolver` | Resolver |
| `orchestrator:remediate` / `status-remediation` | Remediation builder |
| `orchestrator:run` / `resume` | Overnight controller |
