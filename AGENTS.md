<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Advisacor engineering requirements

All agents working in this repository MUST follow these rules in addition to the Next.js guidance above.

## Architecture and scope

- Follow existing architecture, naming, and patterns. Read surrounding code before changing it.
- Minimize scope: implement only what the approved plan or user request requires.
- Do not modify unrelated functionality, refactor opportunistically, or expand scope without approval.

## Security, auth, and data

- Never weaken authentication, authorization, or Supabase Row Level Security (RLS).
- Preserve tenant isolation in all queries, API routes, and server actions.
- Never expose secrets, API keys, tokens, or credentials in source, logs, or commits.
- Never modify production data, production Supabase projects, or live Stripe during development.
- Database schema changes require migrations under `supabase/migrations/`.
- Security-sensitive changes (auth, RLS, billing, PII handling) require explicit human review.

## Quality gates

- Never disable or skip tests to pass CI or local validation.
- Do not bypass lint, type-check, or build failures with suppressions unless explicitly approved.
- Run validation before marking work complete.

### Validation commands (actual)

```bash
npm run lint
npm run type-check
npm test
npm run test:integration
npm run build
```

Brand token compliance for UI changes: `npm run brand:lint`.

## Git, merge, and deployment

- All orchestrated work happens on a feature branch — never commit directly to `main`.
- Never auto-merge to `main` or auto-deploy to production.
- Human approval is required before merge and before any production deployment.
- Plans under `docs/plans/` must have `STATUS: APPROVED_FOR_IMPLEMENTATION` before implementation begins (see `docs/agent/PLAN_APPROVAL_RULE.md`).

## Orchestrator references

- Plan template: `docs/agent/PLAN_TEMPLATE.md`
- Approval gate: `docs/agent/PLAN_APPROVAL_RULE.md`
- State machine: `docs/agent/STATE_MACHINE.md`
- Implementation agent guide: `docs/agent/IMPLEMENTATION_AGENT.md`
- Review agent guide: `docs/agent/REVIEW_AGENT.md`
- CLI scripts: `scripts/orchestrator/`
