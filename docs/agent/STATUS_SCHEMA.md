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
| `cursor_agent` | object | no | Safe Cloud Agent builder metadata (see below) |
| `cursor_reviewer` | object | no | Safe independent reviewer agent metadata (same shape as `cursor_agent`) |
| `builder_head_sha` | string | no | Builder PR head SHA captured at reviewer launch |
| `merge` | boolean | no | Must be `false` or absent |
| `deploy` | boolean | no | Must be `false` or absent |

## `cursor_agent` fields (builder)

| Field | Type | Description |
|-------|------|-------------|
| `agent_id` | string | Durable Cursor agent id (`bc-…`) |
| `run_id` | string | Initial / latest run id (`run-…`) |
| `status` | string | Convenience status (usually run status) |
| `agent_status` | string | Agent lifecycle (`ACTIVE`/`IDLE`/`ARCHIVED`) |
| `run_status` | string | Run status (`CREATING`/`RUNNING`/`FINISHED`/…) |
| `branch` | string | Isolated `cursor/...` branch when known |
| `pr_url` | string | Auto-created PR URL when known |
| `agent_url` | string | Cursor agent UI URL |
| `latest_run_id` | string | From agent record |
| `launched_at` | ISO-8601 | Set on successful create |
| `last_checked_at` | ISO-8601 | Updated on status poll |

## `cursor_reviewer` fields

Same safe fields as `cursor_agent`. Must use a **different** `agent_id` than the builder. Never stores secrets.

Never store API keys, Authorization headers, or other secrets in these objects.

## Valid status values

`DRAFT`, `READY_FOR_REVIEW`, `APPROVED_FOR_IMPLEMENTATION`, `IN_PROGRESS`, `IMPLEMENTATION_COMPLETE`, `REVIEW_FAILED`, `REVIEW_PASSED`, `READY_FOR_HUMAN_APPROVAL`, `COMPLETED`, `BLOCKED`, `ANALYZING_BLOCKER`, `RESOLUTION_PROPOSED`, `REMEDIATION_IN_PROGRESS`, `REMEDIATION_COMPLETE`, `HUMAN_DECISION_REQUIRED`

## Additional companion fields (remediation)

| Field | Description |
|-------|-------------|
| `cursor_resolver` | Safe resolver agent metadata |
| `cursor_remediation` | Safe remediation builder metadata |
| `builder_head_sha` | Current builder PR head SHA |
| `blocker` / `.blocker.json` | Concise blocker packet (no secrets) |
| `resolver` | Ingested resolver classification + result |
| `resolution` | Proposed remediation_plan |
| `remediation` | `{ cycle_number, max_cycles, attempts, *_attempts }` |
| `human_decision` / `.human-decision.json` | One precise human question |
| `audit_trail` / `.audit.jsonl` | Append-only events (capped, no secrets) |
| `previous_review` / `previous_cursor_reviewer` | Cleared review after remediation |

## Integrity rules (fail closed)

- `IMPLEMENTATION_COMPLETE`, `REVIEW_PASSED`, `REVIEW_FAILED`, `READY_FOR_HUMAN_APPROVAL` require `implementation` evidence.
- `REVIEW_PASSED` and `READY_FOR_HUMAN_APPROVAL` require `review.verdict === "PASS"`.
- `REVIEW_FAILED` requires a non-`PASS` review verdict.
- `merge: true` or `deploy: true` is rejected.
- Hand-editing companion JSON into a late status without evidence fails validation.

## Sync rule

Humans set `APPROVED_FOR_IMPLEMENTATION` and `COMPLETED` in markdown (and companion). Orchestrator scripts update both during automated phases and never write human-only statuses.
