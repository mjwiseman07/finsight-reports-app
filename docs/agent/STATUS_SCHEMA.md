# Status JSON schema (companion file)

Each plan may have a companion file next to the markdown plan:

`docs/plans/<PLAN-ID>.status.json`

Orchestrator scripts read/write this file. When both markdown `STATUS:` and JSON `status` exist, they **must match** or scripts fail closed.

Automated phase transitions update **both** the companion JSON and the markdown `STATUS:` line so they stay synchronized.

## Example

```json
{
  "planId": "ORCHESTRATOR-SMOKE-001",
  "planPath": "docs/plans/ORCHESTRATOR-SMOKE-001.md",
  "status": "DRAFT",
  "phase": "planning",
  "updatedAt": "2026-09-24T00:00:00.000Z"
}
```

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `planId` | string | yes | Matches Plan ID in markdown |
| `planPath` | string | yes | Absolute or repo-relative path to plan |
| `status` | string | yes | One of valid STATUS values (see PLAN_TEMPLATE.md) |
| `phase` | string | no | `planning`, `implementation`, `review`, `human_approval` |
| `updatedAt` | ISO-8601 | auto | Set by orchestrator on write |
| `startedAt` | ISO-8601 | no | Phase start timestamp |
| `implementation` | object | no | `{ completedAt, results }` — required for late statuses |
| `review` | object | no | `{ completedAt, verdict, notes }` — verdict `PASS`\|`NEEDS_CHANGES`\|`BLOCKED` |
| `merge` | boolean | no | Must be `false` or absent |
| `deploy` | boolean | no | Must be `false` or absent |

## Valid status values

`DRAFT`, `READY_FOR_REVIEW`, `APPROVED_FOR_IMPLEMENTATION`, `IN_PROGRESS`, `IMPLEMENTATION_COMPLETE`, `REVIEW_FAILED`, `REVIEW_PASSED`, `READY_FOR_HUMAN_APPROVAL`, `COMPLETED`, `BLOCKED`

## Integrity rules (fail closed)

- `IMPLEMENTATION_COMPLETE`, `REVIEW_PASSED`, `REVIEW_FAILED`, `READY_FOR_HUMAN_APPROVAL` require `implementation` evidence.
- `REVIEW_PASSED` and `READY_FOR_HUMAN_APPROVAL` require `review.verdict === "PASS"`.
- `REVIEW_FAILED` requires a non-`PASS` review verdict.
- `merge: true` or `deploy: true` is rejected.
- Hand-editing companion JSON into a late status without evidence fails validation.

## Sync rule

Humans set `APPROVED_FOR_IMPLEMENTATION` and `COMPLETED` in markdown (and companion). Orchestrator scripts update both during automated phases and never write human-only statuses.
