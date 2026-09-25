# Blocker resolver / architect agent

Independent third role (not builder, not reviewer).

## Launch

```bash
npm run orchestrator:resolve -- docs/plans/<PLAN>.md [--dry-run]
npm run orchestrator:status-resolver -- docs/plans/<PLAN>.md
```

Preconditions:

- Status in `REVIEW_FAILED` | `ANALYZING_BLOCKER` | `BLOCKED` | `IN_PROGRESS` (technical failure)
- Blocker evidence present (review / implementation / `.blocker.json`)
- No active resolver agent
- Distinct agent id from builder and reviewer
- `CURSOR_API_KEY` configured
- Remediation budget remaining

## Blocker packet

Written to `docs/plans/<PLAN>.blocker.json` (no secrets). Includes plan id, agents, PR, SHA, findings, validation failures, retry counts, scope/prohibited references.

## Result markers

```text
===ORCHESTRATOR_RESOLVER_RESULT===
{ "plan_id", "classification", "root_cause", "evidence", "recommended_resolution",
  "confidence", "human_decision_required", "remediation_plan?", "human_question?",
  "merge": false, "deploy": false }
===END_ORCHESTRATOR_RESOLVER_RESULT===
```

## What the resolver must NOT ask humans

Anything answerable from the repository, approved plan, tests, code, docs, or prior decisions.

## Authority

Resolver does not merge, deploy, mutate production, or set `COMPLETED`. Diagnosis agents use `autoCreatePR: false` and do not require code mutation.
