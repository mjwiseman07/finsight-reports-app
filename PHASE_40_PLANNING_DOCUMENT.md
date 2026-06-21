# Phase 40 Planning Document - Final

## Organizational Operating System

**Document Owner:** Matthew Wiseman  
**Company:** Wiseman Financial Technologies LLC  
**Product:** Advisacor  
**Phase:** Phase 40 - Organizational Operating System  
**Status:** Planning Finalized - Ready for Cursor Implementation  
**Depends On:** Phase 39 locked - all 47 modules verified across Waves 1-11  
**Namespace:** `lib/intelligence/synthetic/organization/`  
**Verifier:** `scripts/verify-si-organizational-operating-system.js`

## Purpose

Phase 40 transforms Advisacor from a platform of individual AI workers into a complete Organizational Operating System.

By the end of Phase 39, Advisacor can operate individual digital workers: AI Staff Accountant, AI Senior Accountant, AI Accounting Manager, AI Controller Helper, AI CFO Helper, AI Staff Auditor, AI Senior Auditor, AI Audit Manager Helper, and AI Partner Helper.

Phase 40 introduces team orchestration, workforce coordination, human and AI collaboration, organizational capacity management, work allocation intelligence, escalation intelligence, and digital department management.

Phase 40 is not about creating new accounting capabilities. Phase 40 is about coordinating workers.

## Phase 40 Exit Criteria

Phase 40 is complete and lockable only when all of the following are true. 40W verifies against this checklist:

- 40V verifier exits 0.
- TypeScript clean across `lib/intelligence/synthetic/organization/`.
- Every module has its own per-module audit doc committed.
- No `executable=true` marker anywhere in the namespace.
- Phase 39 handoff hash matches across all consuming modules.
- All guardrail markers present and literal true where required.
- Cross-isolation test passes: no tenant A artifact appears in any tenant B output.
- Every recommendation produces a `RecommendationAuditEntry`.

## Phase 40 Non-Goals

To prevent scope creep mid-build, Phase 40 explicitly does not include:

- Live execution of any coordination decision.
- Any real staffing, scheduling, or calendar integration.
- Any connection to HR systems, payroll runs, or timekeeping for evaluation.
- Real-time data feeds; Phase 40 operates on snapshot artifacts.
- Any module that writes to a customer system.
- Any new accounting or audit capability. Those live in Phase 39 and earlier.
- SOC 2 controls, SOC 2 evidence collection, HIPAA controls, BAA workflows, breach notification, encryption-at-rest verification, access reviews, or any other compliance program component. Those live in Phase 42.5 Enterprise Trust & Compliance.

Anything proposed mid-build that falls in this list is deferred, not absorbed.

## Architectural Position

```text
Evidence
-> Observations
-> Packages
-> Memory
-> Knowledge
-> Methodology
-> Actions
-> Role Execution
-> Organizational Coordination
```

Phase 40 owns Organizational Coordination.

## Core Concept

Most AI systems stop at AI Worker.

Advisacor moves to AI Workforce.

The platform becomes capable of coordinating humans, AI workers, departments, teams, capacity, escalations, and organizational priorities.

## Non-Negotiable Guardrails

Every Phase 40 module must obey these:

- No autonomous staffing decisions.
- No hiring decisions.
- No firing decisions.
- No employee ranking.
- No employee scoring.
- No HR evaluation.
- Work allocation is recommendation-only.
- Escalation is recommendation-only.
- Capacity intelligence is observational only.
- Workforce health is operational metrics only.
- Humans make all final coordination decisions.
- Every output carries `executable` as literal `false`.
- `customerIsolation`, `firmIsolation`, `clientIsolation` remain separate fields on every artifact.
- Deterministic `stableSnapshotHash` IDs throughout.
- Fail closed on missing identifiers.
- Consume Phase 39 role handoff artifacts.
- Preserve Phase 39, 38, 37, 36, 34 lineage where required.
- No Phase 40 module performs AI model inference. Coordination, capacity, and allocation logic is deterministic and rules-based.
- Recommendation staleness: every recommendation records the snapshot hash of the inputs it was computed from. A stale recommendation is marked `isStale: true`.
- PHI awareness: any module that may handle Protected Health Information must mark outputs with `containsPHI`. If `containsPHI` cannot be determined, default to `true`.

## Objectives

Build:

- Organizational Workforce Engine.
- Department Intelligence.
- Team Coordination Intelligence.
- Work Allocation Intelligence.
- Capacity Intelligence.
- Escalation Intelligence.
- Organizational Governance Intelligence.
- Workforce Health Intelligence.

The system should understand who should do work, when work should be done, whether capacity exists, whether escalation is required, whether staffing is sufficient, and whether bottlenecks exist as recommendations and observations, never as autonomous decisions.

## Module Order

Every module from 40B through 40R imports its contract types only from 40A. No module defines its own contract types. This prevents contract drift across later waves.

### Wave 1 - Organizational Foundation

- 40A Organizational Contracts
- 40B Organizational Unit Intelligence
- 40C Workforce Registry
- 40D Capacity Intelligence
- 40E Work Allocation Intelligence
- 40F Escalation Intelligence

### Wave 2 - Organizational Health and Performance

- 40G Organizational Health Intelligence
- 40H Workforce Performance Intelligence

### Wave 3 - Command Centers

- 40I Close Command Center
- 40J Audit Command Center
- 40K Revenue Cycle Command Center
- 40L Payroll Command Center

### Wave 4 - Digital Twin and Simulation

- 40M Organizational Digital Twin
- 40N Organizational Simulation

### Wave 5 - Departments and Governance

- 40O Digital Departments
- 40P Organizational Governance
- 40Q Workforce Marketplace
- 40R Organizational Handoff Layer

### Wave 6 - Verification and Lock

- 40V Organizational Operating System Verifier
- 40W Final Phase 40 Audit and Lock

## Phase 40A - Organizational Contracts

Purpose: Create shared type-only contracts for teams, departments, organizational units, workforce assignments, capacity models, escalation models, and workforce health.

Outputs:

- `OrganizationalUnitContract`
- `TeamContract`
- `WorkforceAssignmentContract`
- `CapacityContract`
- `EscalationContract`
- `WorkforceHealthContract`
- `RecommendationAuditEntry` (shared contract used by 40E, 40F, 40D recommendations; full spec in 40P)

Contract fields and guardrails:

- Phase 39 handoff consumption: `phase39RoleHandoffHandle`, `phase39RoleInstanceReferenceIds`, `boundPhase39SnapshotHash`.
- `isRecommendationOnly: true` on assignment and escalation contracts.
- `noAutomaticAssignment: true` on assignment contract.
- `isObservationalOnly: true` on capacity contract.
- `isOperationalMetricsOnly: true`, `noEmployeeRanking: true`, `noEmployeeScoring: true`, `noHrEvaluation: true` on workforce health contract.
- `executable: false` on every contract.
- Separate `customerIsolation`, `firmIsolation`, `clientIsolation` fields.

Type contracts only. No execution. No staffing decisions. Do not begin 40B until 40A is implemented, audited, and committed.

## Phase 40B - Organizational Unit Intelligence

Purpose: Model organizational structure.

Examples: Finance, Accounting, Audit, Revenue Cycle, Payroll, Compliance, Operations.

Outputs: Organizational Unit Objects, Department Objects, Team Objects.

Preserve: hierarchy, reporting structure, ownership, governance.

Escalation chains are configured per organizational unit here in 40B, not hardcoded in 40F. A unit may have variations: no CFO Helper, dual-partner review, industry specialists. 40B stores the configured chain; 40F consumes it.

Deterministic builders. Metadata only. No execution.

## Phase 40C - Workforce Registry

Purpose: Create registry of humans, AI workers, contractors, shared services.

Examples: Controller, Accounting Manager, AI Staff Accountant, AI Senior Accountant, AI Staff Auditor.

Outputs: Workforce Objects, Workforce Assignments, Workforce Capabilities.

Every Workforce Object carries `workforceType: human | ai | contractor | shared_service`, and `aiWorkerSourcePhase39CompositionId` where applicable.

Health and performance views must be filterable by `workforceType`. Human and AI metrics are never co-mingled in any view, preserving the no-HR-evaluation guardrail.

Human workforce members carry only the minimum identity needed for coordination: an internal workforce ID, role, unit, and capability references. The registry does not store performance history, compensation, personal data, or any field that could constitute an HR record.

AI workers reference their Phase 39 role composition. Humans are recorded as workforce members without HR scoring or evaluation. Metadata only.

## Phase 40D - Capacity Intelligence

Purpose: Understand workload. Observational only.

Preserve: assigned work, available capacity, estimated effort, workload trends.

Outputs: Capacity Objects, Capacity Packages.

Questions answered observationally: who has capacity, who is overloaded, where are bottlenecks.

The system observes and reports; it never reassigns work autonomously.

`isObservationalOnly: true`.

## Phase 40E - Work Allocation Intelligence

Purpose: Determine work ownership recommendations.

Inputs: role capabilities, permissions, capacity, priorities.

Outputs: Work Allocation Packages, Assignment Candidates.

Work Allocation Packages must consume the latest Capacity Package and surface a `capacityConflictFlag` when a recommendation targets a worker flagged overloaded in 40D.

Allocation recommendations are explainable. Every Assignment Candidate records why it was recommended as structured `reasonCodes`:

- Capability match.
- Available capacity.
- Priority.
- Escalation chain position.

Rules: No automatic assignment. No execution. Only recommendations. `isRecommendationOnly: true` and `noAutomaticAssignment: true`. A human approves every allocation.

## Ad-Hoc Authority Routing (Path A) — LOCKED

**Status:** LOCKED — founder redline complete; folded from [`PHASE_40_AD_HOC_AUTHORITY_ROUTING_ADDENDUM.md`](PHASE_40_AD_HOC_AUTHORITY_ROUTING_ADDENDUM.md) on 2026-06-18.  
**Track:** Path A (build now). Path B deferred — see Deliberately Dormant / Deferred below.  
**Namespace extensions:** `organization/work-allocation/` (evaluator, tier config, widening gate/ticket, routing, advise-to-deploy), `organization/workforce-registry/deployment-index/`  
**Verifier extension:** `scripts/verify-si-organizational-operating-system.js` — poison cases PC-AAR-01..19 (add-only discipline)

### Founder decision summary

Path A creates and routes **artifacts** (evaluations, routing packages, handoff refs, queue-assignment metadata, notifications). It does **not** lift `executable: false`, does **not** relax `noAutonomousEscalation` on escalation packages, and does **not** run an execution loop or AI-to-AI completion. Human governance gates remain on all outputs.

| Track | Scope |
|-------|-------|
| **Path A (locked, built)** | Authority evaluator + tier-configurable authority + widening gate/ticket + routing orchestrator + advise-to-deploy |
| **Path B (deferred)** | In-lane autonomous execution depth; fully-autonomous AI-to-AI **completion** — separate gated phase |

**Deployment-index sequencing (founder decision — option 3):** Contract + fail-closed stub resolver now (`resolveRoleDeployment` → `not_deployed` unless explicit record passes deployed predicate). Live tenant-scoped lookup and index **writers** deferred post–Phase 42.5 D0. Advise-to-deploy notification builder is wired but **production-dormant** until writers land.

### Problem statement

Phase 39 declares lanes (`allowedTaskFamilies` / `forbiddenTaskFamilies`), escalation targets, and governance gates — but nothing evaluates an ad-hoc task against the acting role or routes above-authority work. Phase 40E/40F core modules produce **recommendations** only. This extension closes the **ad-hoc authority routing** gap while preserving Phase 40 non-execution guardrails.

### Four-outcome authority evaluator (40E-EXT-A)

Classifies each ad-hoc task (pure classifier; `executable: false`). Reads Phase 39 restriction, capability, and governance defs plus optional fraud/reasonableness status. Consumes `RoleAuthorityTierConfig` (default builder when none supplied).

| Outcome | Rule |
|---------|------|
| `forbidden` | Task family ∈ acting role's `forbiddenTaskFamilies`, or fail-closed on missing/ambiguous inputs |
| `in_lane` | Task family allowed AND capability `reviewLevel` ≤ acting role tier AND no fraud/reasonableness flag |
| `above_authority` | Task family allowed but `reviewLevel` exceeds acting role tier |
| `requires_human` | Fraud or reasonableness **flagged** — hard stop (see bright line below) |

**Non-goals:** no new materiality engine; no new authority tiers; no `executable: true`.

**Module:** `organization/work-allocation/authority-evaluation/` — `buildAuthorityEvaluation()`, `classifyAuthority()`.

### Tier-configurable authority (RoleAuthorityTierConfig)

Default 9-role tier map (`configSource: "default"`; `customer_override` reserved for future writer). Builder: `buildDefaultRoleAuthorityTierConfig()`.

**Non-configurable floor:** fraud/reasonableness → `human_controller` is **not** representable as a `maxReviewLevel` value and cannot be widened by customer override. Evaluator enforces this bright line **before** tier config is consulted.

**Module:** `organization/work-allocation/authority-tier-config/`.

### Tier-widening request gate + review ticket

Pure classifiers; no config mutation, no approval/resolution logic in these modules.

**Gate rule (auto_allow is the narrow, must-be-proven path; ticket is the safe default):**

- **AUTO_ALLOWED** only if ALL: (a) requested tier is exactly one rank above current (adjacent), AND (b) requested tier is **below** controller.
- **REQUIRES_TICKET** if EITHER: (a) requested tier is controller or above, OR (b) jump is more than one tier.
- **Fail-closed:** ambiguous, unparseable, non-widening, or missing fields → `requires_ticket`. Never `auto_allowed` on doubt.

**Ticket generator:** emits open `TierWideningReviewTicket` **only** when gate outcome is `requires_ticket`. Never on `auto_allowed`.

**Modules:** `organization/work-allocation/tier-widening-gate/`, `organization/work-allocation/tier-widening-ticket/`.

**Deferred (not built):** human-review workflow / UI ("pulse box"); writer that turns an **approved** ticket into a `customer_override` `RoleAuthorityTierConfig` — future modules.

### Routing orchestrator (40E-EXT-B)

Consumes `AuthorityEvaluationResult` + deployment resolver result. Emits `AuthorityRoutingPackage` only — **no queue mutation, no task-state writes, no notifications, no execution loop**.

**Routing outcomes** (`SyntheticAuthorityRoutingOutcome` — additive union members preserved):

| Evaluation | Deployment | Routing outcome | Behavior |
|------------|--------------|-----------------|----------|
| `in_lane` | n/a | `routed_to_source` | Task stays at acting role's source queue |
| `above_authority` | target deployed | `routed_to_target` | Artifact references target queue ref (auto-route = artifact creation only) |
| `above_authority` | target not deployed | `advise_to_deploy_required` | Held in source; signals 40E-EXT-C (no notification built here) |
| `requires_human` | any | `human_escalation` | `human_controller`; never AI target; never advise-to-deploy |
| `forbidden` | n/a | `forbidden` | No route |
| fail-closed (missing target, ambiguous deployment) | n/a | `held_in_source` | Never `routed_to_target` on doubt |

**"Auto-route" means:** deterministic creation of handoff + queue-assignment **artifacts** only. Target role **prepares** under existing human gates; completion remains human-gated.

**Module:** `organization/work-allocation/authority-routing/` — `buildAuthorityRoutingPackage()`, `classifyAuthorityRouting()`.

### Advise-to-deploy notification (40E-EXT-C)

Emits `AdviseToDeployNotification` **only** when routing outcome is `advise_to_deploy_required`. Factual, non-pushy `adviseReason`. **Never** fires on `human_escalation` (fraud bright line — mutually exclusive by construction).

**Production-dormant:** under option 3, orchestrator yields `advise_to_deploy_required` only when resolver returns `not_deployed`; live index population deferred post–42.5. Fires in tests with explicit not-deployed records only until writers land.

**Module:** `organization/work-allocation/advise-to-deploy/` — `buildAdviseToDeployNotification()`.

### Fraud / reasonableness bright line (non-negotiable)

- Flagged fraud or reasonableness → evaluator `requires_human`, target `human_controller`, **regardless** of task family or tier config.
- Orchestrator → `human_escalation` to `human_controller`, **regardless** of deployment state.
- Advise-to-deploy → **null/skipped** on `human_escalation`. Never convert fraud path to advise-to-deploy.
- Tier config and widening gate → `human_controller` is type-level non-representable as a widening target or tier value.

### Customer role deployment index (40C-EXT — stub)

**Gap addressed:** no pre-existing `(customer, roleType) → deployed?` query. Stub: `resolveRoleDeployment(scope, roleType, explicitRecord?)` fail-closed → `not_deployed` unless explicit record passes deployed predicate.

**Module:** `organization/workforce-registry/deployment-index/`.

Writers and live resolver deferred post–Phase 42.5 D0 (option 3).

### Preserved boundaries (Path A)

| Guardrail | Status |
|-----------|--------|
| `executable: false` on all outputs | **Preserved** |
| `noAutonomousEscalation: true` on escalation packages | **Preserved** (routing module does not emit escalation packages) |
| Phase 40 non-goal: live execution of coordination decisions | **Preserved** |
| Human final decision on material items | **Preserved** |
| Phase 42.5 control spine | Separate layer; index inherits isolation fields from Phase 39/40 contracts |

### Built + verified status

**Commits:** `cd82319`..`5c6ac13` on `architecture-lane-refactor-baseline` (9 commits, 11 module/delivery units).

| # | Module / delivery unit | Commit | Namespace |
|---|------------------------|--------|-----------|
| 1 | 40A — initial AAR contracts | `cd82319` | `organization/contracts/` |
| 2 | 40C-EXT deployment index (stub) | `64fe407` | `workforce-registry/deployment-index/` |
| 3 | Role authority tier config | `d611c40` | `work-allocation/authority-tier-config/` |
| 4 | 40E-EXT-A authority evaluator | `e7d55dd` | `work-allocation/authority-evaluation/` |
| 5 | Tier-widening request gate + contracts | `a415456` | `work-allocation/tier-widening-gate/` |
| 6 | Tier-widening review ticket + contract | `030974c` | `work-allocation/tier-widening-ticket/` |
| 7 | 40E-EXT-B routing orchestrator | `e81afcc` | `work-allocation/authority-routing/` |
| 8 | 40A — routing union amendment (`routed_to_source`, `advise_to_deploy_required`) | `e81afcc` | `organization/contracts/` |
| 9 | 40E-EXT-C advise-to-deploy notification | `2142645` | `work-allocation/advise-to-deploy/` |
| 10 | 40A — tier-widening + tier-config contract deltas (across gate/ticket/config commits) | `d611c40`..`030974c` | `organization/contracts/` |
| 11 | 40V verifier — PC-AAR-01..19 | `5c6ac13` | `scripts/verify-si-organizational-operating-system.js` |

**Verifier:** `scripts/verify-si-organizational-operating-system.js` — 19 add-only poison cases PC-AAR-01..19; **exit 0**. Proves fraud/reasonableness→human at all layers, fail-closed paths, gate logic, distinct routing outcomes, `executable: false` across all AAR module outputs, deployment stub fail-closed.

**TypeScript:** clean (`npx tsc --noEmit`).

### Deliberately dormant / deferred (do not lose)

| Item | Status | Notes |
|------|--------|-------|
| Advise-to-deploy **production** firing | **Dormant** | Wired builder; production-dormant until post–42.5 deployment-index **writers** (option 3) |
| Live `resolveRoleDeployment` tenant lookup | **Deferred** | Stub fail-closed only; replace after 42.5 D0 without changing result shape |
| Tier-widening ticket **review workflow** + UI | **Future module** | Open ticket artifact only; no pulse-box surfacing or resolution |
| Approved-ticket → `customer_override` config writer | **Future module** | Not built; gate/ticket classify only |
| 40F-EXT fraud/reasonableness human escalation bridge | **Not built** | Evaluator + orchestrator enforce bright line; dedicated bridge deferred |
| Path B — autonomous in-lane execution / AI-to-AI completion | **Separate gated phase** | Explicitly prohibited in Path A; `executable: true` never |

### Path A vs Path B (reference)

| Capability | Path A (locked) | Path B (deferred) |
|------------|-----------------|-------------------|
| Authority evaluation | Built | Reuse evaluator |
| Handoff artifact on above-authority | Auto-create (artifact) | Same + optional live dispatch |
| Queue routing metadata | Auto-populate refs | Same + dequeue/enqueue runtime |
| In-lane work execution | Human-gated prepare only | Autonomous in-lane depth TBD |
| AI-to-AI completion | **Prohibited** | TBD — separate lock + guardrails |
| `executable: true` | **Never** | Separate phase decision |
| Advise-to-deploy | Built (production-dormant) | Unchanged when live |

### Wiring to Phase 39 consumers (reference)

| Phase 39 module | Path A wiring |
|-----------------|---------------|
| `email-intake` | Orchestrator supplies `restrictionCheckResult`, `capabilityMatch` from evaluator |
| `email-task-mapper` | Orchestrator supplies `approvalRoutingTargetRoleType` from 39E |
| `role-task-queue` | Routing package references target `taskQueueReferenceId` |
| `role-response` | `responseType: "escalated"` when routed; fraud → `human_controller` |
| `controller-notification` | Fraud/reasonableness → escalation refs (bridge module deferred) |
| `role-execution-audit-log` | Every evaluation + routing decision logged |

### References

- Addendum source (superseded): [`PHASE_40_AD_HOC_AUTHORITY_ROUTING_ADDENDUM.md`](PHASE_40_AD_HOC_AUTHORITY_ROUTING_ADDENDUM.md)
- Phase 39 restriction: `lib/intelligence/synthetic/roles/role-restriction/buildRoleRestriction.ts`
- Phase 39 capability: `lib/intelligence/synthetic/roles/role-capability/buildRoleCapability.ts`
- Phase 40 escalation: `lib/intelligence/synthetic/organization/escalation/buildEscalationPackage.ts`
- Phase 42.5 planning: [`PHASE_42_5_PLANNING_DOCUMENT.md`](PHASE_42_5_PLANNING_DOCUMENT.md)

---

## Phase 40F - Escalation Intelligence

Purpose: Manage escalation chain recommendations.

40F does not hardcode chains. It consumes the chain configured per organizational unit in 40B and produces recommendations against that configured chain.

Default accounting chain:

```text
Staff Accountant -> Senior Accountant -> Controller Helper -> human Controller -> CFO Helper -> human CFO
```

Default audit chain:

```text
Staff Auditor -> Senior Auditor -> Audit Manager Helper -> human Audit Manager -> Partner Helper -> human Partner
```

Outputs: Escalation Packages, Escalation Candidates.

Escalation is recommendation-only. Fraud and reasonableness flags from Phase 39 always escalate to the human in the chain.

`isRecommendationOnly: true`.

## Phase 40G - Organizational Health Intelligence

Purpose: Expand Pulse into organizational health.

Track:

- Team Health.
- Department Health.
- Capacity Health.
- Workload Health.
- Escalation Health.

Outputs: Organizational Health Packages.

Surfaces to controller, CFO, manager, and partner personas.

Operational metrics only. No employee scoring. Simulation outputs are excluded from these aggregations by contract.

## Phase 40H - Workforce Performance Intelligence

Purpose: Track work outcomes operationally.

Examples: throughput, completion, backlog, aging.

Rules: Do not rank employees. Do not score employees. Do not perform HR evaluations. Only preserve operational metrics.

`noEmployeeRanking: true`, `noEmployeeScoring: true`, `noHrEvaluation: true`.

Views filterable by `workforceType`; human and AI metrics never co-mingled. Simulation outputs are excluded from these aggregations by contract.

## Phase 40I - Close Command Center

Purpose: Coordinate month-end close.

Track: close tasks, ownership, dependencies, blockers, escalations.

Outputs: Command Center Packages.

Command Center Packages are keyed by period, organizational unit, and `stableSnapshotHash`. Re-running for the same key updates in place and never creates duplicates. The hash inputs must be stable across reruns and must not include a timestamp.

Major controller-facing feature. Consumes Phase 39 role outputs and overnight queue results. Surfaces close status, who owns what, what is blocked, and what needs human decision.

## Phase 40J - Audit Command Center

Purpose: Coordinate audit execution.

Track: audit programs, evidence collection, workpaper status, open items.

Outputs: Command Center Packages.

Keyed by period, organizational unit, and `stableSnapshotHash`, update-in-place, no duplicates, no timestamp in hash inputs.

Consumes Phase 39 audit role outputs, PBC tracking, and document connector results. Surfaces engagement status to audit manager and partner personas.

## Phase 40K - Revenue Cycle Command Center

Purpose: Coordinate collections teams.

Track: denials, collections, DSO, aging, escalations.

Outputs: Command Center Packages.

Keyed by period, organizational unit, and `stableSnapshotHash`, update-in-place, no duplicates, no timestamp in hash inputs.

Supports healthcare and general revenue cycle. Surfaces per-patient-day metrics and predictive analysis where the industry intelligence library supports it.

Healthcare data handling: when configured for a healthcare organizational unit, 40K outputs are marked `containsPHI: true`. Phase 40 stores PHI-marked artifacts with the same isolation guarantees as all other artifacts but does not implement HIPAA-specific controls. Those controls are implemented in Phase 42.5.

## Phase 40L - Payroll Command Center

Purpose: Coordinate payroll workflows.

Track: payroll tasks, approvals, deadlines, escalations.

Outputs: Command Center Packages.

Keyed by period, organizational unit, and `stableSnapshotHash`, update-in-place, no duplicates, no timestamp in hash inputs.

Consumes payroll and FTE intelligence. Surfaces payroll close status and approvals needing human decision.

## Phase 40M - Organizational Digital Twin

Purpose: Create organizational model.

Represents: teams, departments, workers, AI workers, responsibilities, capacity.

Foundation for future simulation. Metadata model only. No execution.

## Phase 40N - Organizational Simulation

Purpose: Simulate workforce scenarios.

Examples:

- What if we lose an accountant?
- What if we add an AI Staff Accountant?
- What if we add two auditors?
- What if volume increases twenty percent?

Outputs: Simulation Packages.

Simulation Packages carry `isSimulation: true` and a separate `simulationIsolation` field. Simulation outputs are excluded by contract from 40G Organizational Health and 40H Workforce Performance aggregations.

Simulations reference workforce IDs but never leak into production reporting.

Simulation outputs are clearly labeled as projections with assumptions attached. They are decision-support, not forecasts of record. No execution. Simulations never trigger real staffing actions.

## Phase 40O - Digital Departments

Purpose: Create AI-powered departments.

Examples:

- Accounting Department.
- Audit Department.
- Revenue Cycle Department.
- Payroll Department.

Each department consists of humans, AI workers, governance, and assignments. A department composes Phase 39 roles plus Phase 40 coordination into a managed unit.

## Phase 40P - Organizational Governance

Purpose: Preserve governance structures.

Examples:

- Approval hierarchies.
- Escalation hierarchies.
- Reporting hierarchies.

Outputs: Governance Packages.

Every recommendation, including allocation, escalation, and capacity flags, produces an immutable `RecommendationAuditEntry` with:

- Timestamp.
- Recommender module.
- Recipient.
- Payload hash.
- Human decision outcome when resolved.

The `RecommendationAuditEntry` chain is append-only and immutable. Entries are never edited or deleted. A superseding recommendation creates a new entry referencing the prior one.

This chain supports SOC 1 and SOC 2 evidence, but detailed SOC 1 and SOC 2 programs are built in Phase 42.5 Enterprise Trust & Compliance, not Phase 40.

## Phase 40Q - Workforce Marketplace

Purpose: Marketplace of AI workers, department templates, and organizational templates.

Examples:

- Accounting Team Template.
- Audit Team Template.
- Healthcare Revenue Cycle Template.

Marketplace deployment requires a human approver designated in 40P Governance. The verifier rejects any deployment artifact lacking a `humanApproverId`. No autonomous deployment.

## Phase 40R - Organizational Handoff Layer

Purpose: Prepare organizational intelligence for future phases.

Produces:

- `phase40OrganizationalHandoffHandle`
- `phase40DepartmentReferenceIds`
- `phase40GovernanceReferenceIds`
- `boundPhase40SnapshotHash`

This mirrors the Phase 39 handoff structure. Metadata only.

## Phase 40V - Organizational Operating System Verifier

Create: `scripts/verify-si-organizational-operating-system.js`

Verify:

- Organizational contracts.
- Workforce contracts.
- Capacity contracts.
- Escalation contracts.
- Command center packages.
- Digital twin packages.
- All required directories and files.
- Deterministic IDs.
- Fail-closed handling.
- `executable: false`.
- Separate isolation fields.
- Phase 39 handoff consumption.
- `RecommendationAuditEntry` presence on every recommendation.
- No-AI-inference compliance.
- All guardrail markers.

Cross-isolation test: construct two synthetic tenants and verify no artifact from tenant A appears in any package, twin, or simulation output for tenant B.

Reject and fail on:

- Autonomous staffing decisions.
- HR scoring.
- Employee ranking.
- Hiring decisions.
- Firing decisions.
- Any `executable: true` marker.
- Any missing guardrail marker.
- Any marketplace deployment lacking `humanApproverId`.
- Any recommendation lacking a `RecommendationAuditEntry`.
- Any AI model inference call in the namespace.
- Any 40K healthcare-configured artifact missing `containsPHI`.
- Any artifact marked `containsPHI: true` that lacks tenant isolation fields.
- Any artifact that mixes PHI-marked and non-PHI-marked content in the same payload.
- Banned runtime imports.
- Ad-hoc authority routing poison cases PC-AAR-01..19 (add-only; bright-line cases 1–5 and fail-closed cases 6–10 must never be weakened).

Built incrementally. Skeleton created early, expanded by 40V (including Path A extension), exits 0 on PASS and 1 on FAIL, Node built-ins only.

## Phase 40W - Final Phase 40 Audit and Lock

Read-only comprehensive audit verifying against the Phase 40 Exit Criteria:

- 40V verifier exits 0.
- TypeScript clean across the namespace.
- Every module has its own per-module audit doc committed.
- No `executable=true` marker anywhere in the namespace.
- Phase 39 handoff hash matches across all consuming modules.
- All guardrail markers present and literal true where required.
- Cross-isolation test passes.
- Every recommendation produces a `RecommendationAuditEntry`.

Also verify workforce intelligence, capacity intelligence, organizational governance, simulation, digital departments, and **Ad-Hoc Authority Routing (Path A)** poison cases PC-AAR-01..19.

If any area is PARTIAL or FAIL, report gaps and do not lock.

Lock only when all areas pass, mirroring the Phase 38 and Phase 39 lock discipline.

## Namespace And Build Conventions

Namespace: `lib/intelligence/synthetic/organization/`

Verifier: `scripts/verify-si-organizational-operating-system.js`

Build cadence: one module at a time. Implement, run verifier and TypeScript, audit the single module, commit, then proceed. Do not begin the next module until the current one passes, is audited, and is committed.

Real-data test register: as each Phase 40 module is built, any assumption that only real organizational data can confirm is recorded in `PHASE_40_TEST_REGISTER.md`.

Examples:

- Capacity-estimate accuracy against real workloads.
- Escalation-chain fit against real firm structures.
- Command-center idempotency under real rerun patterns.
- Cross-isolation under real multi-tenant load.

## Commercial Value

Phase 39 sells AI Workers.

Phase 40 sells AI Departments and Workforce Simulation.

AI Departments:

- AI Accounting Department.
- AI Audit Department.
- AI Revenue Cycle Department.
- AI Payroll Department.

Workforce Simulation is among the most CFO-attractive features in Phase 40: model the impact of adding staff, adding AI workers, losing staff, or volume changes before committing real resources.

## Strategic Position

By the end of Phase 40, Advisacor becomes an Enterprise Intelligence Operating System plus a Digital Workforce Platform plus a Department Operating System, capable of coordinating both human and AI workers across an organization.

## Recommended First Implementation

Begin with 40A Organizational Contracts.

Do not begin 40B until 40A is implemented, audited, and committed.

Planning is finalized. Implementation may begin once this document is locked.
