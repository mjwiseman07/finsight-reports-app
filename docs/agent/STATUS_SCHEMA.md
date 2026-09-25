# Status JSON schema (companion file)

Each plan may have a companion file next to the markdown plan:

`docs/plans/<PLAN-ID>.status.json`

Orchestrator scripts read/write this file. When both markdown `STATUS:` and JSON `status` exist, they **must match** or scripts fail closed.

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
| `phase` | string | no | `planning`, `implementation`, `review`, `human_review` |
| `updatedAt` | ISO-8601 | auto | Set by orchestrator on write |
| `startedAt` | ISO-8601 | no | Phase start timestamp |
| `implementation` | object | no | `{ completedAt, results }` |
| `review` | object | no | `{ startedAt, completedAt, verdict, notes }` |

## Valid status values

`DRAFT`, `APPROVED_FOR_IMPLEMENTATION`, `IN_IMPLEMENTATION`, `IMPLEMENTATION_COMPLETE`, `IN_REVIEW`, `REVIEW_PASS`, `REVIEW_FAIL`, `READY_FOR_HUMAN_REVIEW`, `APPROVED_FOR_MERGE`, `REJECTED`, `CANCELLED`

## Sync rule

Prefer updating STATUS in markdown when humans approve or reject plans. Orchestrator scripts update JSON during automated phases. Keep both in sync for approved states.
