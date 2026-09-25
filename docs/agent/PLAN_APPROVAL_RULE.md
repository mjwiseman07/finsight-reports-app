# Plan approval rule

## Hard gate

**NEVER implement a plan unless its STATUS is exactly `APPROVED_FOR_IMPLEMENTATION`.**

This applies to:

- Cursor agents (see `.cursor/rules/plan-execution.mdc`)
- CLI orchestrator scripts (`confirm-approval.js`, `prepare-implementation.js`)
- Any automation wired to this repository

## STATUS: DRAFT (and other non-approved)

While STATUS is `DRAFT`, `READY_FOR_REVIEW`, `IN_PROGRESS`, `IMPLEMENTATION_COMPLETE`, `REVIEW_FAILED`, `REVIEW_PASSED`, `READY_FOR_HUMAN_APPROVAL`, `COMPLETED`, `BLOCKED`, or missing:

- Agents may read plans as documentation.
- Agents must NOT write application code, migrations, or config for the plan.
- `confirm-approval.js` MUST exit non-zero.

## How to approve

1. Complete all required sections in `docs/agent/PLAN_TEMPLATE.md`.
2. Run `node scripts/orchestrator/validate-plan.js docs/plans/<PLAN-ID>.md`.
3. Human reviewer sets `STATUS: APPROVED_FOR_IMPLEMENTATION` in the plan markdown.
4. Sync companion JSON: `"status": "APPROVED_FOR_IMPLEMENTATION"`.
5. Run `node scripts/orchestrator/confirm-approval.js docs/plans/<PLAN-ID>.md` — must exit 0.

## Revoking approval

Set STATUS back to `DRAFT` or `BLOCKED` before further implementation. If work already landed, follow the plan's rollback section.

## No auto-approval

Agents and scripts must never write `APPROVED_FOR_IMPLEMENTATION` or `COMPLETED`. Smoke tests and scaffolding plans remain `DRAFT` until a human explicitly approves.
