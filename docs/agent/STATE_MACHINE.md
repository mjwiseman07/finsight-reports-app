# Orchestrator state machine (V1)

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> READY_FOR_REVIEW: human / plan ready
  DRAFT --> BLOCKED: blocked
  READY_FOR_REVIEW --> APPROVED_FOR_IMPLEMENTATION: human approves
  READY_FOR_REVIEW --> DRAFT: needs revision
  READY_FOR_REVIEW --> BLOCKED: blocked
  APPROVED_FOR_IMPLEMENTATION --> IN_PROGRESS: launch-builder / prepare-implementation
  APPROVED_FOR_IMPLEMENTATION --> BLOCKED: blocked
  IN_PROGRESS --> IMPLEMENTATION_COMPLETE: status-builder / record-implementation
  IN_PROGRESS --> BLOCKED: blocked
  IMPLEMENTATION_COMPLETE --> REVIEW_PASSED: reviewer PASS (via status-reviewer)
  IMPLEMENTATION_COMPLETE --> REVIEW_FAILED: reviewer NEEDS_CHANGES
  IMPLEMENTATION_COMPLETE --> BLOCKED: reviewer BLOCKED
  IMPLEMENTATION_COMPLETE --> IN_PROGRESS: rework
  REVIEW_FAILED --> IN_PROGRESS: fix and re-implement
  REVIEW_FAILED --> BLOCKED: blocked
  REVIEW_PASSED --> READY_FOR_HUMAN_APPROVAL: status-reviewer advance
  REVIEW_PASSED --> BLOCKED: blocked
  READY_FOR_HUMAN_APPROVAL --> COMPLETED: human only
  READY_FOR_HUMAN_APPROVAL --> BLOCKED: blocked
  BLOCKED --> DRAFT: unblock
  BLOCKED --> READY_FOR_REVIEW: unblock
```

## Transition guards

| From | To | Guard |
|------|-----|-------|
| DRAFT / READY_FOR_REVIEW | APPROVED_FOR_IMPLEMENTATION | **Human only** |
| APPROVED_FOR_IMPLEMENTATION | IN_PROGRESS | `launch-builder` / `prepare-implementation` after approval gate |
| IN_PROGRESS | IMPLEMENTATION_COMPLETE | Builder FINISHED + PR URL (`status-builder`) or `record-implementation` |
| IMPLEMENTATION_COMPLETE | REVIEW_PASSED → READY_FOR_HUMAN_APPROVAL | Validated Cloud reviewer `PASS` (`status-reviewer`) |
| IMPLEMENTATION_COMPLETE | REVIEW_FAILED | Validated `NEEDS_CHANGES` |
| IMPLEMENTATION_COMPLETE | BLOCKED | Validated reviewer `BLOCKED` |
| * | COMPLETED | **Human only** |
| IMPLEMENTATION_COMPLETE | READY_FOR_HUMAN_APPROVAL | **BLOCKED** without REVIEW_PASSED |

## CLI reference

| Script | Purpose |
|--------|---------|
| `validate-plan.js` | Structure + sections + companion integrity |
| `confirm-approval.js` | APPROVED_FOR_IMPLEMENTATION gate |
| `launch-builder.js` | Cursor builder create → IN_PROGRESS |
| `status-builder.js` | Poll builder; may → IMPLEMENTATION_COMPLETE |
| `launch-reviewer.js` | Separate Cursor reviewer (status stays IMPLEMENTATION_COMPLETE) |
| `status-reviewer.js` | Poll reviewer; ingest validated result; advance |
| `prepare-review.js` / `record-review.js` | Local/manual review helpers |
| `human-summary.js` | Human approval packet (no COMPLETED write) |

## Human-only transitions

- → `APPROVED_FOR_IMPLEMENTATION`
- → `COMPLETED`
- Merge to `main` and production deploy

Automations must never perform these. Scripts refuse to write human-only statuses.
