# Cloud Agent builder flow

End-to-end builder path for Advisacor Development Orchestrator V1 (Phase 2).

```text
APPROVED_FOR_IMPLEMENTATION
  → validate-plan / confirm gates
  → launch-builder (Cursor Cloud Agents API v1)
  → IN_PROGRESS + cursor_agent { agent_id, run_id, ... }
  → Cloud Agent on cursor/... branch
  → autoCreatePR
  → status-builder poll
  → IMPLEMENTATION_COMPLETE (only if FINISHED + pr_url)
  → independent review (next phase — not automatic)
  → human merge / deploy
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run orchestrator:launch -- <plan.md>` | Create Cloud Agent after approval gates |
| `npm run orchestrator:dry-run -- <plan.md> --dry-run` | Validate + build request; no network |
| `npm run orchestrator:status -- <plan.md>` | Poll agent/run; update metadata |
| `npm run orchestrator` | Run orchestrator unit tests |

## Request shape (fixed)

```json
{
  "prompt": { "text": "…" },
  "repos": [
    {
      "url": "https://github.com/mjwiseman07/finsight-reports-app",
      "startingRef": "main"
    }
  ],
  "workOnCurrentBranch": false,
  "autoCreatePR": true,
  "skipReviewerRequest": false
}
```

## Status fields (`cursor_agent`)

Safe fields only:

- `agent_id`, `run_id`, `status`, `agent_status`, `run_status`
- `branch`, `pr_url`, `agent_url`, `latest_run_id`
- `launched_at`, `last_checked_at`
- optional `result_summary`, `duration_ms`

Never stored: API key, Authorization header, env secrets.

## What builder completion is not

Builder `FINISHED` + PR ≠ review pass.

Forbidden automatic transitions from builder:

- `REVIEW_PASSED`
- `READY_FOR_HUMAN_APPROVAL`
- `COMPLETED`

## Cloud environment

`.cursor/environment.json` runs `npm ci` at build time so agents can lint/test/build without production credentials.

Manual setup still required:

1. `CURSOR_API_KEY` in local/CI secret env
2. GitHub repo connected to Cursor Cloud Agents
3. No production Supabase/Stripe secrets in the Cloud Agent environment for V1
