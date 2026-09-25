# Plan template — Advisacor Development Orchestrator V1

Copy this file to `docs/plans/<PLAN-ID>.md` and fill every section.

## Valid STATUS values

| STATUS | Meaning |
|--------|---------|
| `DRAFT` | Plan being written; implementation forbidden |
| `READY_FOR_REVIEW` | Plan ready for human review before approval |
| `APPROVED_FOR_IMPLEMENTATION` | Human approved; agents may implement |
| `IN_PROGRESS` | Implementation in progress |
| `IMPLEMENTATION_COMPLETE` | Code complete; ready for independent review |
| `REVIEW_FAILED` | Review failed (`NEEDS_CHANGES` or `BLOCKED`); return to implementation |
| `REVIEW_PASSED` | Independent review passed (`PASS`) |
| `READY_FOR_HUMAN_APPROVAL` | Summary ready for human merge/deploy decision |
| `COMPLETED` | Human marked complete (human-only; never set by scripts) |
| `BLOCKED` | Work blocked; do not continue until unblocked |

Set STATUS in the **Status** section as: `STATUS: <VALUE>`

Companion JSON (optional): `docs/plans/<PLAN-ID>.status.json` — see `docs/agent/STATUS_SCHEMA.md`.

Markdown `STATUS:` and companion `status` **must match** or scripts fail closed.

---

## Plan ID

Plan ID: PLAN-ID-HERE

## Title

Title: Short descriptive title

## Status

STATUS: DRAFT

## Objective

What problem does this plan solve? One paragraph.

## Scope

- Bullet list of files, modules, or behaviors in scope.

## Out of Scope

- Explicit exclusions to prevent scope creep.

## Security Requirements

- Auth, secrets, and production-safety constraints for this plan.

## Tenant Isolation Requirements

- Tenant / RLS isolation requirements (or N/A with justification).

## Acceptance Criteria

- At least one concrete, testable bullet criterion.
- Additional criteria as needed.

## Required Tests

- Unit / integration / smoke tests that must pass before review.

## Validation Commands

Commands to prove success (examples):

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build` (if merge-ready)

## Prohibited Changes

- Explicit list of files/areas agents must not touch.

## Rollback Considerations

How to revert if the change causes problems (git revert, migration down, feature flag, etc.).

## Human Approval Gate

| Field | Value |
|-------|-------|
| Author | |
| Reviewer | |
| Approved by | |
| Approved at | |
| Branch | `feature/...` |

Human sets `STATUS: APPROVED_FOR_IMPLEMENTATION` only after reviewing this plan.
Scripts never write `APPROVED_FOR_IMPLEMENTATION` or `COMPLETED`.
