# ORCHESTRATOR-SMOKE-001 — Smoke test plan (DO NOT EXECUTE)

Tiny harmless non-production change to validate the orchestrator pipeline. **This plan is DRAFT only.**

## Plan ID

Plan ID: ORCHESTRATOR-SMOKE-001

## Title

Title: Add orchestrator smoke-test note to docs README

## Status

STATUS: DRAFT

## Objective

Verify end-to-end orchestrator flow (validate → approve gate → implement → review → human summary) using a change so small it cannot affect production: a one-line comment in documentation.

## Scope

- Add a single HTML comment or markdown note to `docs/agent/README.md` (create file if missing) stating this was a smoke-test artifact.
- No application code, migrations, or env changes.

## Out of Scope

- Any change under `app/`, `components/`, `lib/`, `supabase/`
- Package dependency changes
- CI workflow changes
- Approving or executing this plan as part of V1 foundation or pre-merge hardening work

## Security Requirements

- Doc-only change; no secrets, credentials, or production system access.
- Do not read or print environment secrets during smoke execution.

## Tenant Isolation Requirements

- N/A — documentation-only smoke plan; no tenant data access.

## Acceptance Criteria

- Orchestrator validate-plan succeeds on this document while STATUS is DRAFT.
- confirm-approval fails while STATUS is DRAFT (fail closed).
- After a future human approval only: a single doc note is added under docs/agent/.

## Required Tests

- `npm run orchestrator` (orchestrator unit suite)
- `node scripts/orchestrator/validate-plan.js docs/plans/ORCHESTRATOR-SMOKE-001.md`
- `node scripts/orchestrator/confirm-approval.js docs/plans/ORCHESTRATOR-SMOKE-001.md` (expect non-zero while DRAFT)

## Validation Commands

- `npm run orchestrator`
- `node scripts/orchestrator/validate-plan.js docs/plans/ORCHESTRATOR-SMOKE-001.md`
- `node scripts/orchestrator/confirm-approval.js docs/plans/ORCHESTRATOR-SMOKE-001.md`

## Prohibited Changes

- Application code under `app/`, `components/`, `lib/`
- Database migrations
- Production deploy or merge to `main`
- Setting STATUS to APPROVED_FOR_IMPLEMENTATION without explicit human action

## Rollback Considerations

Revert the doc commit or delete the smoke-test note.

## Human Approval Gate

| Field | Value |
|-------|-------|
| Author | orchestrator-v1-foundation |
| Reviewer | (pending) |
| Approved by | (not approved) |
| Approved at | (pending) |
| Branch | `feature/orchestrator-smoke-001` |

**Do not set STATUS to APPROVED_FOR_IMPLEMENTATION as part of foundation setup or pre-merge hardening.**
Do not execute this smoke plan until a human explicitly approves a future smoke run.
