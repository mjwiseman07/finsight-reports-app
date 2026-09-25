# Implementation agent guide

Use this guide when executing an **approved** plan (`STATUS: APPROVED_FOR_IMPLEMENTATION`).

## Preconditions

```bash
node scripts/orchestrator/validate-plan.js docs/plans/<PLAN-ID>.md
node scripts/orchestrator/confirm-approval.js docs/plans/<PLAN-ID>.md
node scripts/orchestrator/prepare-implementation.js docs/plans/<PLAN-ID>.md
```

If `confirm-approval.js` fails, STOP — do not implement.

`prepare-implementation.js` advances STATUS to `IN_PROGRESS` (markdown + companion).

## Implementation rules

1. **Scope only** — Implement what is listed under Scope; ignore unrelated improvements.
2. **Architecture** — Follow existing patterns in touched directories.
3. **Security** — Never weaken auth, RLS, or tenant isolation. No secrets in source.
4. **Data** — No production data changes. Migrations only when the plan requires schema changes.
5. **Quality** — Run validation commands from the plan's Validation Commands section.

## During work

- Prefer isolated worktrees or feature branches named in the plan.
- Commit logically; do not merge to `main`.
- Document blockers in the plan or status JSON rather than bypassing gates.

## Completion

Run validation and record results (STATUS must already be `IN_PROGRESS`):

```bash
node scripts/orchestrator/record-implementation.js docs/plans/<PLAN-ID>.md \
  --results '{"planId":"<PLAN-ID>","lint":"pass","typecheck":"pass","tests":"pass","build":"pass","success":true}'
```

Then hand off to review:

```bash
node scripts/orchestrator/prepare-review.js docs/plans/<PLAN-ID>.md
```

## Forbidden

- Implementing from `DRAFT` or any non-approved status
- Recording implementation without `prepare-implementation` first
- Claiming success when lint/typecheck/tests/build failed
- Disabling tests or lint rules to pass
- Auto-deploying or auto-merging
- Setting `STATUS: COMPLETED`
- Modifying production Supabase/Stripe without explicit human instruction
