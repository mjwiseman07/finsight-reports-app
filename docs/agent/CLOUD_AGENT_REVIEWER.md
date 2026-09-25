# Cloud Agent reviewer flow

Independent review path for Advisacor Development Orchestrator (after builder).

```text
IMPLEMENTATION_COMPLETE
  + builder cursor_agent { agent_id, pr_url, … }
  → launch-reviewer (separate Cloud Agent, autoCreatePR:false, repos[].prUrl)
  → cursor_reviewer metadata (status stays IMPLEMENTATION_COMPLETE)
  → status-reviewer poll
  → parse ===ORCHESTRATOR_REVIEW_RESULT=== JSON
  → validate plan_id / PR / commit / schema
  → PASS: REVIEW_PASSED → READY_FOR_HUMAN_APPROVAL
  → NEEDS_CHANGES: REVIEW_FAILED
  → BLOCKED: BLOCKED
```

## Separation

| Role | Agent field | May merge | May deploy | May set COMPLETED |
|------|-------------|-----------|------------|-------------------|
| Builder | `cursor_agent` | no | no | no |
| Reviewer | `cursor_reviewer` | no | no | no |

Builder agent id **must** differ from reviewer agent id.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run orchestrator:launch-reviewer -- <plan.md>` | Launch independent reviewer |
| `npm run orchestrator:dry-run-reviewer -- <plan.md> --dry-run` | Preconditions + request only |
| `npm run orchestrator:status-reviewer -- <plan.md>` | Poll + ingest validated result |
| `npm run orchestrator:human-summary -- <plan.md>` | Human approval packet |

## Launch preconditions

- STATUS is exactly `IMPLEMENTATION_COMPLETE`
- Companion integrity OK
- `cursor_agent.agent_id` / `run_id` / `pr_url` present
- Builder PR OPEN, not merged, targets `main`
- No existing `cursor_reviewer.agent_id`
- `CURSOR_API_KEY` configured

## Result schema

See `scripts/orchestrator/reviewer-result.js`. Required markers:

```text
===ORCHESTRATOR_REVIEW_RESULT===
{ … }
===END_ORCHESTRATOR_REVIEW_RESULT===
```

Orchestrator does **not** treat Cloud Agent FINISHED alone as PASS.

## Failure behavior

- API / network errors: status unchanged
- Missing/malformed result after FINISHED: status unchanged (still IMPLEMENTATION_COMPLETE)
- Mismatched plan/PR/commit: rejected
- Duplicate reviewer launch: blocked
