# WFT AI Workforce Foundation

## Plan ID

Plan ID: WFT-AI-WORKFORCE-FOUNDATION-001

## Title

Title: Wiseman Financial Technologies Governed AI Workforce Foundation

## Status

STATUS: READY_FOR_REVIEW

## Objective

Extend the existing Advisacor Development Orchestrator into a governed Wiseman Financial Technologies AI workforce. The foundation will support multiple specialized AI workers for software engineering, independent review, research, intellectual-property support, documentation/training, finance/operations support, sales/customer-success support, and executive-assistant work while preserving human approval for high-impact actions.

The workforce must reuse the repository's existing plan approval, builder, reviewer, resolver, remediation, audit, and human-escalation patterns rather than creating an ungoverned parallel agent system.

## Scope

### Workforce control plane

- Introduce a worker registry defining worker identity, department, responsibilities, tools, authority level, prohibited actions, escalation rules, and allowed task types.
- Introduce a task registry / queue with explicit task owner, assigned worker, status, priority, dependencies, approval requirements, evidence, outputs, and timestamps.
- Introduce immutable or append-only execution/audit records for every AI worker run.
- Persist model, token/cost, tool-use, outcome, failure, reviewer result, and human approval metadata for every run.
- Make every workforce run addressable by a stable run/task ID.

### Initial worker roster

1. **WFT Chief Orchestrator**
   - Routes approved work.
   - Enforces dependencies and authority gates.
   - Never grants itself additional permissions.

2. **Software Builder**
   - Reuses existing implementation-agent patterns.
   - Writes code only on feature branches after approved plans.

3. **Independent Code Reviewer**
   - Must be logically separate from the builder.
   - Reviews requirements, tests, security, regressions, and scope adherence.
   - Cannot merge its own reviewed work.

4. **Resolver / Remediation Worker**
   - Reuses existing autonomous remediation flow.
   - May fix technical blockers only within approved scope.

5. **IP & Patent Research Worker**
   - Performs invention intake, prior-art research preparation, claim mapping support, technical differentiation analysis, and evidence organization.
   - May draft attorney-review materials.
   - Must never represent its output as legal advice or independently authorize/file a patent, trademark, assignment, response, declaration, or other legal filing.

6. **Legal / Compliance Support Worker**
   - Tracks deadlines, document status, contracts, compliance inventories, and attorney-review items.
   - Draft/research only unless a specific human-approved action grants more authority.

7. **Documentation & Training Worker**
   - Converts completed features and operating procedures into internal documentation, customer documentation, SOPs, and training drafts.

8. **Finance & Operations Worker**
   - May analyze internal WFT operating data, prepare forecasts/reconciliations/drafts, and surface exceptions.
   - No autonomous movement of money, payroll changes, bank changes, tax filing, or binding accounting/tax representations.

9. **Sales & Customer Success Worker**
   - May research leads, prepare proposals, onboarding materials, account summaries, and draft communications.
   - No autonomous pricing commitments, contract acceptance, discounts beyond policy, or binding customer commitments.

10. **Executive Assistant Worker**
    - Organizes tasks, deadlines, decisions, meeting/action-item summaries, and pending approvals for Matthew and Janice.
    - External communications remain draft-only unless specifically approved.

### Authority model

- **A0 — Observe:** read/research only.
- **A1 — Draft:** create drafts, plans, analysis, proposed code changes, and proposed communications.
- **A2 — Execute Reversible Internal Actions:** permitted only for explicitly allowlisted reversible actions with complete audit evidence.
- **A3 — Human Approval Required:** production deploys, merges to main, external communications, customer commitments, legal filings, financial transactions, permission/security changes, destructive operations, and changes to workforce authority.
- **A4 — Prohibited Autonomous Actions:** secrets disclosure, bypassing security/RLS, self-escalation of permissions, disabling controls, deleting audit evidence, fabricating evidence, or representing AI output as professional legal/tax advice.

### Human authority

Matthew and Janice are human principals. The control plane must support both as human approvers without forcing either person to share credentials. Human approval events must identify which principal approved, what was approved, and the exact version/hash approved.

## Out of Scope

- Automatic merge to `main`.
- Automatic production deployment.
- Autonomous legal filing or attorney substitution.
- Autonomous movement of money or changes to banking/payment instructions.
- Autonomous execution of contracts or customer commitments.
- Autonomous privilege escalation.
- Autonomous alteration of approval rules.
- Replacing Advisacor product-level tenant governance with WFT internal governance.
- Production database modifications during the planning phase.
- Building every department in one implementation pass.

## Security Requirements

- Preserve all existing authentication, authorization, tenant-isolation, and RLS controls.
- Never expose Supabase service-role keys, provider tokens, GitHub credentials, Vercel tokens, Stripe secrets, email credentials, patent-system credentials, or other secrets.
- Tool access must be least-privilege and allowlisted by worker role.
- Workers may never call a tool merely because the underlying model technically has access to it.
- Every high-impact action must be fail-closed when approval evidence is missing, expired, mismatched, or ambiguous.
- Human approval must be bound to task ID + action type + content/version hash.
- Worker definitions and authority rules must be versioned and auditable.
- Any change to worker permissions must itself require human approval.
- No production data mutation during development.
- Any future external-email or inbound-email automation must treat message content as untrusted input and must resist prompt injection.

## Tenant Isolation Requirements

This workforce is an internal WFT control plane and must remain logically separated from customer tenant data.

If any worker operates on Advisacor tenant data:
- Existing tenant identifiers and RLS rules remain authoritative.
- Task/run records must capture the tenant scope without granting broader access.
- Workers must not cross tenant boundaries.
- A worker's internal WFT role does not confer Advisacor customer-data access.

## Acceptance Criteria

- A canonical worker registry exists with the initial worker roster, authority levels, allowed actions, prohibited actions, and escalation policy.
- A canonical task/run state machine exists and integrates with the existing orchestrator semantics where applicable.
- Every AI run has a unique ID created before model/tool execution.
- Every run persists model, status, timestamps, token usage/cost where available, tool calls, evidence references, outcome, and errors.
- Every high-impact action fails closed without a valid human approval artifact.
- Existing builder/reviewer/remediation workflow remains functional.
- Existing prohibition on automatic merge and automatic production deploy remains enforced.
- Builder and reviewer are prevented from being the same execution identity for independently reviewed tasks.
- IP/legal workers are technically constrained to research/draft workflows unless a specific human-approved integration is later added.
- A human-readable WFT Workforce dashboard/API can show pending tasks, running work, blocked work, items awaiting Matthew/Janice, and completed work.
- Tests prove a worker cannot self-elevate authority or bypass an approval gate.
- Tests prove a low-authority worker cannot invoke high-impact actions.

## Required Tests

- Worker registry schema validation.
- Authority/permission matrix tests.
- Human approval artifact validation tests.
- Worker self-escalation denial test.
- Cross-worker restricted-tool denial test.
- Builder/reviewer separation test.
- Task state-machine transition tests.
- Run persistence/audit tests.
- Failure/retry/idempotency tests.
- Existing orchestrator regression suite.
- Supabase RLS/security tests for any new tables.
- Integration test covering: approved task -> routed worker -> execution -> independent review -> human gate.

## Validation Commands

- `npm run orchestrator:lint`
- `npm run orchestrator:test`
- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run test:integration`
- `npm run build`
- Supabase security advisor check after any schema implementation.

## Prohibited Changes

- Do not commit directly to `main`.
- Do not weaken or remove existing plan approval rules.
- Do not enable automatic merge.
- Do not enable automatic production deploy.
- Do not modify live Stripe.
- Do not modify production data.
- Do not weaken Supabase RLS.
- Do not put secrets in code, logs, plan files, prompts, or database records.
- Do not grant patent/legal workers autonomous filing authority.
- Do not grant finance workers autonomous money-movement authority.
- Do not create a worker capable of modifying its own permission definition without human approval.
- Do not allow the orchestrator to mark its own task human-approved.

## Rollback Considerations

- All implementation must occur on feature branches and remain unmerged until human approval.
- Code changes must be revertible by normal Git revert.
- New workforce features should be protected by a default-off internal feature flag until validation is complete.
- New database structures should be additive first; avoid destructive migrations.
- If a workforce component fails security or isolation testing, disable the feature flag and revert the relevant commit/migration before re-enabling.
- Existing development orchestrator must remain independently usable during rollout.

## Proposed Implementation Waves

### Wave 1 — Control Plane
Worker registry, authority model, tasks, runs, approvals, audit/event persistence, and internal APIs. Reuse existing orchestrator state machine.

### Wave 2 — Engineering Department
Connect current Builder, Reviewer, Resolver, and Remediation roles to the workforce registry and shared task/run tracking. Add parallel-work concurrency controls.

### Wave 3 — Research / IP / Documentation
Add Patent/IP Research, Legal/Compliance Support, and Documentation/Training workers as research/draft workers only.

### Wave 4 — Business Operations
Add Finance/Operations, Sales/Customer Success, and Executive Assistant workers with strict allowlists and human gates.

### Wave 5 — Command Center
Create the human dashboard for Matthew and Janice: workforce status, approvals, costs, evidence, queues, worker performance, and audit history.

## Human Approval Gate

| Field | Value |
|-------|-------|
| Author | WFT AI planning session |
| Reviewer | Matthew Wiseman / Janice Wiseman |
| Approved by | |
| Approved at | |
| Branch | `feature/wft-ai-workforce-foundation` |

**Human action required:** Review this plan. Only a human may change `STATUS: READY_FOR_REVIEW` to `STATUS: APPROVED_FOR_IMPLEMENTATION`. Agents/scripts must never perform that approval transition.
