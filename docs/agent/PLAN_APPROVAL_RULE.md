# Plan approval rule

## Hard gate

**NEVER implement a plan unless its STATUS is exactly `APPROVED_FOR_IMPLEMENTATION`.**

This applies to:

- Cursor agents (see `.cursor/rules/plan-execution.mdc`)
- CLI orchestrator scripts (`confirm-approval.js`, `prepare-implementation.js`)
- Any automation wired to this repository

## STATUS: DRAFT

While STATUS is `DRAFT`:

- Agents may read and refine the plan.
- Agents must NOT write production code, migrations, or config for the plan.
- `confirm-approval.js` MUST exit non-zero.

## How to approve

1. Complete all sections in `docs/agent/PLAN_TEMPLATE.md`.
2. Run `node scripts/orchestrator/validate-plan.js docs/plans/<PLAN-ID>.md`.
3. Human reviewer sets `STATUS: APPROVED_FOR_IMPLEMENTATION` in the plan markdown.
4. Optionally sync companion JSON: `"status": "APPROVED_FOR_IMPLEMENTATION"`.
5. Run `node scripts/orchestrator/confirm-approval.js docs/plans/<PLAN-ID>.md` — must exit 0.

## Revoking approval

Set STATUS back to `DRAFT` or `REJECTED` before further implementation. If work already landed, follow the plan's rollback section.

## No auto-approval

Agents must never self-approve plans. Smoke tests and scaffolding plans remain `DRAFT` until a human explicitly approves.
