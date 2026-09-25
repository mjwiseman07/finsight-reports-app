# Cursor automation setup

Guide for wiring Cursor Automations to the Advisacor Development Orchestrator V1 **without embedding secrets in source**.

## Principles

- **No API keys in repo** — use Cursor/ Vercel / Supabase dashboard secrets only.
- **Fail closed** — automations call orchestrator scripts; non-zero exit stops the workflow.
- **Human gates** — never auto-approve plans, merge, or deploy production.

## Suggested automation phases

### 1. Plan validation (on PR or schedule)

Trigger: new/edited file under `docs/plans/*.md`

```bash
node scripts/orchestrator/validate-plan.js docs/plans/<PLAN-ID>.md
```

### 2. Implementation (manual trigger only)

Only after human sets `STATUS: APPROVED_FOR_IMPLEMENTATION`:

```bash
node scripts/orchestrator/confirm-approval.js docs/plans/<PLAN-ID>.md
node scripts/orchestrator/prepare-implementation.js docs/plans/<PLAN-ID>.md
```

Pass the JSON payload to an implementation agent prompt referencing `docs/agent/IMPLEMENTATION_AGENT.md`.

### 3. Review (after implementation recorded)

```bash
node scripts/orchestrator/prepare-review.js docs/plans/<PLAN-ID>.md
```

Review agent uses `docs/agent/REVIEW_AGENT.md`.

### 4. Human summary

```bash
node scripts/orchestrator/human-summary.js docs/plans/<PLAN-ID>.md
```

Post output to PR comment or Slack — human decides merge/deploy.

## Cursor Automations MCP

Use `build_automation_prefill_url` (Cursor backend MCP) to draft workflows. Store secrets in Cursor automation secret UI, not in workflow JSON committed to git.

## GitHub Actions

This repo has no `.github/workflows` yet. If added later:

- Run validation scripts on plan changes
- Do NOT auto-merge on green CI
- Require environment protection rules for production deploy jobs

## Environment variables

| Variable | Where | Never in repo |
|----------|-------|---------------|
| Supabase keys | Vercel / local `.env` | yes |
| Stripe keys | Vercel / Stripe dashboard | yes |
| Cursor tokens | Cursor automation secrets | yes |

## Smoke plan

`docs/plans/ORCHESTRATOR-SMOKE-001.md` is intentionally `DRAFT` — use it to test validation and approval gates without executing changes.
