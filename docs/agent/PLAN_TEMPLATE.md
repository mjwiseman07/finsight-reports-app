# Plan template — Advisacor Development Orchestrator V1

Copy this file to `docs/plans/<PLAN-ID>.md` and fill every section.

## Valid STATUS values

| STATUS | Meaning |
|--------|---------|
| `DRAFT` | Plan being written; implementation forbidden |
| `APPROVED_FOR_IMPLEMENTATION` | Human approved; agents may implement |
| `IN_IMPLEMENTATION` | Implementation in progress |
| `IMPLEMENTATION_COMPLETE` | Code complete; ready for review |
| `IN_REVIEW` | Automated or agent review in progress |
| `REVIEW_PASS` | Review passed |
| `REVIEW_FAIL` | Review failed; return to implementation |
| `READY_FOR_HUMAN_REVIEW` | Summary ready for human merge/deploy decision |
| `APPROVED_FOR_MERGE` | Human approved merge (not auto-merge) |
| `REJECTED` | Plan rejected; do not implement |
| `CANCELLED` | Plan cancelled |

Set STATUS in the **Status** section as: `STATUS: <VALUE>`

Companion JSON (optional): `docs/plans/<PLAN-ID>.status.json` — see `docs/agent/STATUS_SCHEMA.md`.

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

## Risks and Constraints

- Security, RLS, tenant isolation, migration, or rollout risks.
- Dependencies on external systems.

## Validation Plan

Commands and manual checks to prove success:

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run test:integration` (if applicable)
- `npm run build` (if merge-ready)

## Rollback Plan

How to revert if the change causes problems (git revert, migration down, feature flag, etc.).

## Approval

| Field | Value |
|-------|-------|
| Author | |
| Reviewer | |
| Approved by | |
| Approved at | |
| Branch | `feature/...` |

Human sets `STATUS: APPROVED_FOR_IMPLEMENTATION` only after reviewing this plan.
