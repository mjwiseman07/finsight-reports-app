# JE-4 — Post-Write Accounting Refresh and Continuous-Close Verification

## Plan ID

Plan ID: JE-4-POST-WRITE-VERIFICATION

## Title

Title: Governed post-VERIFIED JE accounting refresh and continuous-close verification pipeline

## Status

STATUS: APPROVED_FOR_IMPLEMENTATION

## Objective

Implement an idempotent, fail-closed, execution-bound **post-write verification pipeline** that runs only after a governed journal entry reaches `VERIFIED` custody (exact provider read-back), then:

1. refreshes provider accounting into a new canonical `accounting_syncs` SUCCESS snapshot for the execution’s company/period,
2. recomputes affected authoritative reconciliations / URM observations against that sync,
3. re-runs Continuous Close OBSERVE (and Tie-Out where architecture requires snapshot-backed baselines),
4. verifies **expected accounting effects** from the JE proposal against refreshed canonical/URM state,
5. refreshes close/readiness impact from the new OBSERVE run,
6. persists evidence/audit lineage linking `execution_id` ↔ sync ↔ CC run,

**without** enabling JE create/verify gates, removing kill switches, executing any real/sandbox JE write, merging, or deploying.

Repository discovery (Phase 0) is the source of truth: JE-3B2/3C/3D create+verify remain hard-disabled; JE-4 must be fully unit/integration testable with fixtures and injected deps while those gates stay `false`.

## Architecture Discovered

### Current JE state

- **JE-1** proposal + source custody: `lib/journal-entry-governance/service.ts`, `source-custody.ts`, `repository.ts`
- **JE-2** human approval: `approval-service.ts`, `approval-custody.ts`
- **JE-3A** execution prepare: `execution-service.ts`, `execution-prepare-internal.ts`
- **JE-3B1** provider attempt custody (no live POST): `provider-attempt-service.ts`
- **JE-3B2** governed QBO CREATE: **hard-disabled** (`je3b2-feature-gate.ts`, `assertGovernedProviderPostNotEnabled`)
- **JE-3C** exact GET verification → `VERIFIED`: **hard-disabled** (`je3c-feature-gate.ts`, `provider-verification-orchestration.ts`)
- **JE-3D** sandbox activation: CREATE/VERIFY/PREPARE OFF + dispatch kill switch ON (`je3d-*-activation*`)
- Production activation/workflows: fail-closed (`production-activation-policy.ts`, `production-workflow-policy.ts`)
- Memory projection contract exists but writes OFF (`memory-projection-contract.ts`, `verified-memory-projection.ts`)

### Accounting / CC / Tie-Out

- Provider sync → canonical: `lib/integrations/accounting/service.ts`, `advisacor-data-model.ts`
- Snapshots / authoritative observation: `lib/audit-ready/measurement-snapshots/`, `lib/audit-ready/authoritative-observation/`
- Tie-Out worker/resolvers: `lib/audit-ready/tie-out/`
- Continuous Close OBSERVE + readiness: `lib/continuous-close/observe.ts`, `readiness.ts`, `persistence/run-and-persist-observe.ts`
- **Gap:** no post-VERIFIED JE → scoped refresh → new sync → re-observe → expected-effects proof orchestrator

### Recommended insertion points

1. New module(s) under `lib/journal-entry-governance/` (e.g. `post-write-verification-*.ts`) bound to `execution_id` requiring status `VERIFIED` + ledger receipt (mirror verified-memory custody patterns).
2. Refresh via governed measurement/sync acquisition (engagement/period from execution custody) — **not** hourly-refresh eligibility as-is.
3. Recompute URM via `runAuthoritativeArApInventoryObservation` (`FRESH_CAPTURE`) where AR/AP/inventory effects apply; BS paths follow existing `bs_account_recon` / Tie-Out baseline rules.
4. CC re-observe via `runAndPersistAuthoritativeObserve` with new sync + policy/input hashes.
5. Optional thin API under `app/api/governed/journal-entries/executions/[executionId]/…` for inspection/trigger — **read/verify orchestration only**; never call create transports.
6. Additive migration only if needed to link `journal_entry_executions` ↔ post-write verification runs / `continuous_close_runs` (prefer additive tables/columns; no destructive RLS weakening).

## Current JE State (for implementers)

| Capability | State |
|------------|-------|
| Proposal / approval / prepare code | Present |
| Live provider POST (create) | Hard-disabled |
| Live provider GET verify | Hard-disabled |
| Sandbox dispatch | Kill switch ON |
| Memory write | OFF |
| JE-4 post-write pipeline | **Does not exist — this plan** |

JE-4 must compile, test, and document the pipeline using **fixtures / injected VERIFIED execution custody**. It must not flip feature gates or call live create.

## Scope

- Implement JE-4 post-write verification orchestration and types under `lib/journal-entry-governance/`
- Expected-effect verification against refreshed canonical/URM state derived from JE proposal `expected_effects` / line economics (as represented in existing proposal/execution types)
- Affected-scope selection: prefer targeted recomputation from proposal source recon ids + expected effects; if dependency resolution is uncertain, use safest deterministic broader snapshot-backed recompute documented in code comments/tests
- Wire Continuous Close OBSERVE re-run against the **new** post-write `accounting_sync_id`
- Tie-Out: regenerate/re-run only where existing architecture requires snapshot-backed baselines for affected kinds; do not treat live regenerate as CC-authoritative truth
- Idempotency key: at least `(execution_id, accounting_sync_id, policy_hash)` or equivalent unique constraint / custody row reuse
- Partial-failure states: explicit non-VERIFIED / incomplete conclusions — never claim VERIFIED/READY when evidence incomplete
- Unit + integration tests with mocks/fixtures; JE write gates remain false
- Thin governed API or service entry for post-write verification **if** consistent with existing API patterns
- Additive schema only if required for run persistence / lineage

## Out of Scope

- Enabling JE-3B2 / JE-3C / JE-3D create or verify capabilities
- Releasing sandbox or production dispatch kill switches
- Executing any real JE or first sandbox JE
- Production Supabase writes outside normal local/test harness patterns already used by JE tests
- Stripe / billing / auth / RLS policy weakening
- Automatic merge or deploy
- Setting plan STATUS to COMPLETED
- Broad competitor-gap roadmap work
- Changing fundamental JE approval/governance model
- Hourly refresh redesign unrelated to execution-bound post-write path

## Affected Components

- `lib/journal-entry-governance/*` (new post-write modules + tests)
- Possibly thin calls into `lib/audit-ready/authoritative-observation/*`, `lib/audit-ready/measurement-snapshots/*`, `lib/continuous-close/persistence/*`, `lib/audit-ready/tie-out/*`
- Optional `app/api/governed/journal-entries/executions/[executionId]/*`
- Optional additive migration under `supabase/migrations/` (additive only)

## Expected Data Flow

```
VERIFIED execution (+ ledger receipt)
  → load custody (company, connection, period, proposal expected effects) — never caller-supplied company/sync
  → fresh provider accounting sync / measurement acquisition → accounting_syncs SUCCESS
  → identify affected objects / reconciliations from proposal source + expected effects
  → authoritative observation / reconciliation recompute (FRESH_CAPTURE against new sync)
  → Tie-Out re-run only where required for affected kinds (snapshot-backed)
  → Continuous Close OBSERVE persist (new sync + hashes)
  → expected-effect verification (debits/credits/accounts/amounts; fail closed on mismatch/stale/lag)
  → close/readiness from new OBSERVE
  → persist JE-4 run evidence (execution_id, sync_id, cc_run_id, effect proof, status)
```

Provider API success alone does **not** prove accounting effect — require refreshed canonical/URM evidence.

## Provider Refresh Behavior

- Use existing accounting sync / measurement acquisition paths bound to execution’s connection and period.
- Sandbox/production environment rules: follow existing JE custody environment pins; never force production QB environment for tests.
- Do not invoke `provider-qbo-create-transport` or create orchestration.

## Canonical Refresh Behavior

- Require `accounting_syncs.validation_status = SUCCESS` (or equivalent existing success gate) before treating sync as post-write baseline.
- Reject synces that cannot be proven to be at-or-after the post-write verification request when architecture provides timestamps; otherwise document deterministic acceptance rule and test it.

## Reconciliation Rerun Selection

- Prefer affected-only from proposal source recon ids + expected effect accounts.
- If uncertain which recons are affected: safest deterministic recompute of AR/AP/inventory authoritative observation for the engagement/period against the new sync (document why).
- Do not invent a parallel reconciliation engine.

## Tie-Out Behavior

- Use existing Tie-Out worker/resolvers.
- Authoritative close path must remain sync/snapshot-backed (`baseline_sync_id` rules in existing custody).
- Live `regenerate-run` is not CC-authoritative baseline.

## Continuous-Close Behavior

- Call existing OBSERVE persistence (`runAndPersistAuthoritativeObserve` or equivalent).
- New CC run must reference the new sync; do not reuse a pre-write CC run as post-write truth.
- Readiness composed via existing `composeContinuousCloseReadiness` (or equivalent).

## Expected-Effect Verification

Must account for:

- expected debit/credit economics from proposal
- affected account(s)
- expected amount (cents)
- provider sync lag / not-yet-visible → explicit `PENDING_PROVIDER_VISIBILITY` (or similar) — **not** success
- duplicate/replay → idempotent reuse
- missing provider confirmation / stale canonical → fail closed
- partial sync → fail closed / incomplete

Do not report effect VERIFIED when evidence incomplete.

## Close / Readiness Impact

- Refresh from the new Continuous Close OBSERVE run only.
- Memory projection is non-authoritative for close proof (may remain OFF).

## Audit / Evidence Requirements

- Persist lineage: `execution_id`, provider journal id (if present), `accounting_sync_id`, observation/CC run ids, effect-verification conclusion, policy/input/idempotency hashes.
- Prefer Patent #6 / existing ledger patterns where applicable; do not weaken custody.

## Idempotency

Safe against duplicated events, polling, Cloud Agent retries, worker retries, provider retries, process restart, repeated verification requests.

Identical inputs must reuse prior JE-4 run row / conclusion without corrupting close state or duplicating material effects.

## Failure / Partial Failure Handling

| Failure | Required behavior |
|---------|-------------------|
| Provider refresh fails | Terminal/recoverable JE-4 failure; no fake SUCCESS sync |
| Canonical refresh fails | Do not OBSERVE; incomplete status |
| Reconciliation rerun fails | Record failure; do not claim effects verified |
| Tie-Out fails (when required) | Fail closed for that path |
| Continuous-close fails | No readiness refresh from stale run |
| Expected-effect fails | Explicit mismatch / incomplete — never silent pass |
| Provider lag | Pending visibility state; retryable; not VERIFIED |

Prefer recoverable observable states over silent failure.

## Retry Behavior

- Bounded retries only for transient provider/network errors (align with existing patterns).
- Do not retry indefinitely on auth/permission/gate/safety violations.
- Idempotent on retry.

## Security Requirements

- Documentation and code must not introduce secrets, credentials, or production system access beyond existing JE test harness patterns.
- Do not read or print environment secrets in logs, status JSON, evidence payloads, or Cloud Agent output.
- Do not modify authentication, authorization, RLS policies (weaken), Stripe, billing, or production data.
- JE-3B2/3C/3D write/verify gates and kill switches must remain hard-disabled.
- Load company/connection/engagement exclusively from execution custody; forbid caller-supplied company/sync identifiers.
- Mutations via existing service_role / RPC patterns used by JE tests only.

## Tenant Isolation Requirements

- Preserve engagement membership / company_users / firm_memberships assumptions already used by JE tables.
- No cross-tenant reads or writes; no authenticated INSERT/UPDATE policy expansion on `journal_entry_*` or `continuous_close_runs`.
- Sandbox Demo A / company allowlists must not be expanded via env for this plan.
- JE-4 entrypoints must be execution-bound and tenant-scoped through existing custody loaders.

## Feature-Flag Behavior

- JE-3B2 / JE-3C / JE-3D / production activation files listed in Prohibited Changes must remain hard-disabled.
- JE-4 entry may have its own explicit enablement for API trigger if needed, defaulting OFF in production — but unit tests must exercise orchestration with injected deps regardless.
- Never interpret JE-4 enablement as JE write enablement.

## Rollback Considerations

- Additive schema: reverse by stopping JE-4 entrypoints; leave custody tables.
- Code: revert PR.
- No need to roll back provider books (JE-4 does not write JE).

## Acceptance Criteria

- JE-4 orchestration module exists and is execution-bound to `VERIFIED` custody (or clearly documented fixture path that simulates VERIFIED without enabling gates).
- Post-write path performs or clearly stages: provider/canonical refresh → affected recon/URM → Tie-Out where required → CC OBSERVE → expected-effect verification → readiness refresh → evidence persistence.
- Expected-effect verification fails closed on mismatch, stale, partial, or lag-without-evidence.
- Idempotent re-entry does not duplicate material CC/recon corruption.
- Partial failures produce explicit non-success statuses.
- Unit/integration tests cover happy path (fixture), effect mismatch, idempotent replay, and at least one partial-failure path.
- Existing JE hard-disable / kill-switch / production activation tests still pass; gate files unchanged.
- No live JE execution performed by this work.
- PR targets `main`, remains unmerged by automation; plan may reach `READY_FOR_HUMAN_APPROVAL` only after independent reviewer PASS.

## Required Tests

- New JE-4 unit tests under `lib/journal-entry-governance/__tests__/` (or adjacent)
- Existing JE gate-lock / hard-disable tests still green
- Continuous-close observe/persistence tests still green where touched
- Authoritative observation / tie-out tests if call sites change
- `npm run orchestrator:test`
- Lint / typecheck / build as available in CI and local validation commands below

## Validation Commands

- `npm run orchestrator:test`
- `npm run orchestrator:lint`
- `npm run brand:lint`
- `npx vitest run lib/journal-entry-governance/__tests__` (or targeted JE-4 test path once created)
- `npx vitest run tests/continuous-close lib/continuous-close` (if CC touched)
- `npx tsc --noEmit` (report pre-existing failures separately if any)
- `npm run brand:lint`

Do not disable tests to pass. Distinguish pre-existing failures from JE-4 regressions in the PR/summary.

## Prohibited Changes

- `lib/journal-entry-governance/je3b2-feature-gate.ts`
- `lib/journal-entry-governance/je3c-feature-gate.ts`
- `lib/journal-entry-governance/je3d-activation-policy.ts` (capability defaults)
- `lib/journal-entry-governance/je3d-first-controlled-create-activation.ts`
- `lib/journal-entry-governance/production-activation-policy.ts`
- `lib/journal-entry-governance/production-workflow-policy.ts`
- Calling or wiring `provider-qbo-create-transport` / live create for JE-4
- Weakening RLS on `journal_entry_*` / `continuous_close_runs`
- Changing `assertGovernedProviderPostNotEnabled` to allow posts
- Expanding Demo A / company allowlists via env for this plan
- Merge to main / production deploy / setting COMPLETED by automation
- AuthN/AuthZ weakenings; Stripe/billing changes; production secret introduction

## Autonomous Decision Rules

- Prefer smallest implementation consistent with existing Advisacor architecture.
- Fix low-risk localized defects necessary for JE-4 when covered by tests.
- Prefer additive schema over destructive change.
- Fix defects introduced by this implementation automatically via resolver/remediation.
- Resolve ambiguities from repository architecture, tests, and docs autonomously.
- Ordinary test/build/lint failures → resolver/remediation — not human escalation.

## Human Escalation Rules

Stop for HUMAN_DECISION_REQUIRED only if necessary for:

- production credentials/secrets
- destructive production database action
- undefined accounting-policy decision with multiple material behaviors
- weakening auth / authorization / RLS
- cross-tenant access
- changing fundamental JE approval/governance model
- enabling live JE execution or first sandbox JE
- production deployment / merge to main
- significant scope expansion outside JE-4

## Pre-Mortem (risks → preventative controls)

1. **Flip JE write gates** → Prohibited file list + existing static gate tests must remain green.
2. **Sandbox POST via “refresh”** → Refresh uses sync/measurement read+persist only; forbid create transport imports in JE-4 modules (test/guard).
3. **Production write via ERP/Pulse** → Do not touch production workflow/activation policies.
4. **RLS weaken** → No authenticated write policy changes; service_role patterns only.
5. **Caller-supplied company/sync** → Custody-only loaders; forbidden caller keys.
6. **Stale CC as post-write truth** → Require new CC run bound to new sync; reject reuse of pre-write run.
7. **Wrong recon scope** → Drive from expected_effects + source recon ids; else deterministic safe broaden + document.
8. **Live regenerate as authoritative** → Snapshot-backed baselines only for close truth.
9. **Duplicate processing** → Unique idempotency on (execution_id, sync_id, policy_hash).
10. **Memory as close proof** → Readiness from OBSERVE only; Memory optional/non-authoritative.
11. **Hourly refresh race** → Execution-bound acquisition; do not share hourly eligibility blindly.
12. **Effects cleared without check** → Explicit expected-effect verifier; fail closed on residual/mismatch.
13. **Provider lag treated as success** → Pending visibility status; not VERIFIED.
14. **Non-resumable overnight** → Idempotent run rows + orchestrator resume; no one-shot side effects without custody.

## Human Approval Gate

| Field | Value |
|-------|-------|
| Author | matthew-via-orchestrator |
| Reviewer | matthew |
| Approved by | matthew |
| Approved at | 2026-09-25T06:45:00.000Z |
| Branch | `cursor/...` (Cloud Agent isolated branch) |

Matthew’s overnight authorization approved this plan for implementation: scope remains JE-4, safety boundaries hold, no undefined accounting-policy fork required. Do not merge the resulting implementation PR without further human review. Do not enable JE execution.
