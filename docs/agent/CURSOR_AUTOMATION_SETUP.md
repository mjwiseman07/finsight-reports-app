# Cursor automation setup

Guide for wiring Cursor Cloud Agents and Automations to the Advisacor Development Orchestrator **without embedding secrets in source**.

## Principles

- **No API keys in repo** — use Cursor Dashboard / local `.env.local` / OS env only.
- **Fail closed** — orchestrator scripts exit non-zero and do not advance state on API/auth failures.
- **Human gates** — never auto-approve plans, merge, or deploy production.
- **Isolated branches** — Cloud Agents always use `workOnCurrentBranch: false` (new `cursor/...` branch).

## 1. Create a Cursor API key

1. Open [Cursor Dashboard → API Keys](https://cursor.com/dashboard?tab=integrations).
2. Create a user or service-account API key with Cloud Agents access.
3. Copy the key once — store it only in a secret store or local env file that is gitignored.

## 2. Environment configuration (local)

Add to `.env.local` (gitignored) or your shell:

```bash
CURSOR_API_KEY=your_key_here
```

`.env.example` documents the empty placeholder:

```bash
CURSOR_API_KEY=
```

Never commit a real key. Never paste a real key into chat, plans, status JSON, or logs.

Optional:

```bash
CURSOR_API_BASE_URL=https://api.cursor.com
CURSOR_API_TIMEOUT_MS=60000
```

Non-secret defaults live in `scripts/orchestrator/config.js`:

| Setting | Value |
|---------|-------|
| Repository | `https://github.com/mjwiseman07/finsight-reports-app` |
| startingRef | `main` |
| workOnCurrentBranch | `false` |
| autoCreatePR | `true` |
| skipReviewerRequest | `false` |

## 3. GitHub repository connection

1. Ensure the GitHub app / Cursor GitHub integration can access `mjwiseman07/finsight-reports-app`.
2. Confirm Cloud Agents can clone the repo from Cursor’s Cloud Agents UI.
3. Do not grant production Supabase/Stripe credentials to the Cloud Agent environment for builder V1.

## 4. Cursor Cloud Agent repository access

- Connect the repo in Cursor Cloud Agents settings.
- Confirm `.cursor/environment.json` is present (install: `npm ci`) so agents can install dependencies.
- Builder V1 needs ordinary code/test/build ability only — **no** `SUPABASE_SERVICE_ROLE_KEY`, **no** Stripe live keys.

## 5. Launch command

Only after a human sets `STATUS: APPROVED_FOR_IMPLEMENTATION` (markdown + companion):

```bash
# Load CURSOR_API_KEY into the environment first
npm run orchestrator:launch -- docs/plans/<PLAN-ID>.md
```

Order enforced by the launcher:

1. Path safety + `docs/plans/` confinement  
2. Plan validation + companion integrity  
3. Exact `APPROVED_FOR_IMPLEMENTATION`  
4. No existing `cursor_agent` association  
5. `CURSOR_API_KEY` present  
6. Prompt build + API create  
7. **Only after successful create** → `IN_PROGRESS` + safe `cursor_agent` metadata  

## 6. Dry-run command

```bash
npm run orchestrator:dry-run -- docs/plans/<PLAN-ID>.md --dry-run
```

(or `node scripts/orchestrator/launch-builder.js docs/plans/<PLAN-ID>.md --dry-run`)

Dry-run validates path/plan/approval/state and constructs the API request. It does **not** call Cursor, create an agent, create a branch/PR, or change status. It never prints `CURSOR_API_KEY`.

## 7. Status command

```bash
npm run orchestrator:status -- docs/plans/<PLAN-ID>.md
```

Polls Cursor for builder agent/run status, updates safe `cursor_agent` fields, and may advance `IN_PROGRESS` → `IMPLEMENTATION_COMPLETE` when the run is `FINISHED` **and** a `pr_url` exists.

It will **never** set `REVIEW_PASSED`, `READY_FOR_HUMAN_APPROVAL`, or `COMPLETED`.

## 7b. Independent reviewer commands

After `IMPLEMENTATION_COMPLETE` with builder PR metadata:

```bash
npm run orchestrator:dry-run-reviewer -- docs/plans/<PLAN-ID>.md --dry-run
npm run orchestrator:launch-reviewer -- docs/plans/<PLAN-ID>.md
npm run orchestrator:status-reviewer -- docs/plans/<PLAN-ID>.md
npm run orchestrator:human-summary -- docs/plans/<PLAN-ID>.md
```

Reviewer uses a **separate** Cloud Agent (`autoCreatePR: false`, `repos[].prUrl` = builder PR). Validated `PASS` advances to `READY_FOR_HUMAN_APPROVAL`. See `docs/agent/CLOUD_AGENT_REVIEWER.md`.

## 8. Expected Cloud Agent branch behavior

- `startingRef: main`
- `workOnCurrentBranch: false`
- Cursor creates an isolated `cursor/...` branch for the work

## 9. Expected automatic PR behavior

- `autoCreatePR: true`
- When the builder finishes successfully, Cursor opens a PR against the base ref
- Orchestrator records `pr_url` on status poll

## 10. Security restrictions

- No secrets in prompts, status JSON, or logs
- No shell execution from plan content
- Plans must live under `docs/plans/`
- API failures leave plan status unchanged (not `IN_PROGRESS`)
- Duplicate launch blocked when `cursor_agent.agent_id` already exists

## 11. Human approval gates

- Humans alone set `APPROVED_FOR_IMPLEMENTATION` and `COMPLETED`
- Independent review is a separate phase after builder completion
- Merge to `main` and production deploy remain human-only

## Legacy / future automation phases

Plan validation, prepare-review, and human-summary scripts remain available. Cursor Automations MCP may call these later; store secrets in Cursor automation secret UI, not in committed workflow JSON.

## Smoke plan

`docs/plans/ORCHESTRATOR-SMOKE-001.md` remains `DRAFT` until a human explicitly approves a controlled smoke launch.
