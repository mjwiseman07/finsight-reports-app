# Phase G7-C7a-1b Execution — CON Remainder (Over-Time + PWR Cluster)

**Date:** 2026-06-28  
**Predecessor:** G7-C7a-8 rationale patch (`32b4b60`)  
**Planning doc:** `docs/decisions/Phase_G7_C7a/C7a-1b.md` (committed `14d49d6`)  
**State change:** 42/93/0 → **34/93/0**; satisfied 66 → **74**

## Cluster

CON over-time output measures (units-of-delivery, milestones) + PWR post-completion adjustments. Complements C7a-1's cost-to-cost input measure cluster.

## Emitters added

| Lane | Emitter | Assertions |
| --- | --- | --- |
| US GAAP | `unitsOfDeliveryOutputMeasure.ts` | asc606-over-time |
| US GAAP | `milestoneOutputMeasure.ts` | asc606-over-time, poc-method-declared |
| US GAAP | `postCompletionAdjustments.ts` | contract-balances-rollforward, cost-to-cost-ratio |
| IFRS | `unitsOfDeliveryOutputMeasure.ts` | asc606-over-time |
| IFRS | `milestoneOutputMeasure.ts` | asc606-over-time, poc-method-declared |
| IFRS | `postCompletionAdjustments.ts` | contract-balances-rollforward, cost-to-cost-ratio |

## Router extension

Existing CON router dispatch table extended to route `output_measure.method` ∈ {units-of-delivery, milestones} to new emitters. `cost-to-cost` route unchanged from C7a-1.

## Fail-closed-on-input (C7a-7 pattern reuse)

Unrecognized `output_measure.method` values throw `FrameworkViolationError` with ASC 606-10-25-31 / IFRS 15.B14 citation and remediation guidance.

## Framework non-comingling

`tests/unit/construction-c7a-1b.test.ts` — forbidden-substring grep over all 6 new emitters.

## Per-gap emitter_path precision

`close-g7-c7a-1b-gaps.ts` maps each gap to its specific satisfying emitter — **4 unique emitter paths** across 8 closures.

## Gaps closed (8)

| Gap ID | Filing | Assertion | Emitter |
| --- | --- | --- | --- |
| GAP-0011 | FLR-10k | asc606-over-time | usgaap/unitsOfDeliveryOutputMeasure |
| GAP-0017 | GVA-10k | asc606-over-time | usgaap/milestoneOutputMeasure |
| GAP-0020 | MTZ-10k | contract-balances-rollforward | usgaap/contractBalanceRollforward |
| GAP-0023 | MTZ-10k | asc606-over-time | usgaap/milestoneOutputMeasure |
| GAP-0024 | PWR-10k | poc-method-declared | usgaap/milestoneOutputMeasure |
| GAP-0025 | PWR-10k | cost-to-cost-ratio | usgaap/postCompletionAdjustments |
| GAP-0026 | PWR-10k | contract-balances-rollforward | usgaap/postCompletionAdjustments |
| GAP-0029 | PWR-10k | asc606-over-time | usgaap/milestoneOutputMeasure |

## Collapse-step closures

**0** — all 8 enumerated gaps were already fix-now.

## CON fix-now remainder

**0** — C7a-1b mops up all CON fix-now gaps.
