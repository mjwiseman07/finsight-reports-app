# Phase G7-C7b Execution — Crossover Validators + Cascade 23–29 + Schema v1.2.0

**Date:** 2026-06-18  
**Predecessor:** G7-C7a-15 (`492e96e`)  
**Register:** unchanged at 0/91/0/110

## Backlog closure (B1–B6)

| Item | Resolution |
| --- | --- |
| **B1** — emitter path integrity | `emitterPathValidator.ts`; NPO C7a-4 five-gaps-one-emitter confirmed legitimate 1:N (`functional-expense-allocation` + `part9-part10-cross-tie` hooks) |
| **B2** — timestamp drift | `timestampDriftValidator.ts` + `.gitattributes` `-diff` on evidence JSON; `stripGeneratedAt` runtime |
| **B3** — collapse-step documentation | `collapseStepValidator.ts`; C7a-7/C7a-10 same-commit reclassify+close gaps documented in decision docs |
| **B4** — verifier matrix vs unit-only | Policy: matrix rows track wiring paths; crossover validators add 7 matrix rows (446→453) |
| **B5** — lessor surveillance | `lessorGapSurveillance.ts` active; no lessor-scoped lease gaps detected |
| **B6** — register classification | `registerClassificationValidator.ts`; GAP-0174/0177/0180 confirmed US GAAP `rtl/channel-disaggregation` doc-lim |

## Crossover validators (`lib/router/crossover/`)

1. `frameworkConsistencyValidator.ts` — entity-level framework comingling (fatal)
2. `emitterPathValidator.ts` — per-gap emitter_path + assertion hook (fatal)
3. `crossoverFootingValidator.ts` — cross-disclosure footing (fatal)
4. `lessorGapSurveillance.ts` — B5 active monitoring (warn-only)
5. `registerClassificationValidator.ts` — triage/closed_in consistency (fatal)
6. `timestampDriftValidator.ts` — generatedAt normalization (warn-only)
7. `collapseStepValidator.ts` — collapse-step pattern docs (fatal)

## Cascade stages 23–29

| Stage | Validator | Halt |
| --- | --- | --- |
| 23 | framework_consistency | YES |
| 24 | emitter_path_integrity | YES |
| 25 | crossover_footing | YES |
| 26 | lessor_gap_surveillance | NO |
| 27 | register_classification | YES |
| 28 | timestamp_drift_normalization | NO |
| 29 | collapse_step_documentation | YES |

Runner version: 1.1.0 → **1.2.0** (29 stages).

## Schema v1.2.0 changelog

Formalized in `schemas/register.schema.json`:

- `emitter_path` — required for `triage=satisfied` + `closure_mechanism=emitter-satisfaction`
- `closed_in` — required for satisfied
- `reclassified_in`, `patched_in` — optional triage move tracking
- `framework_substitute_note`, `framework_violation_handling` — optional IFRS/US GAAP asymmetry docs
- `assertion_hook` — optional B1 precision hook
- `collapse_step` — optional collapse-step marker
- `lessor_scope` — optional B5 surveillance flag

Backwards compatible: optional fields only; emitter_path requirement scoped to emitter-satisfaction closures.

## Audit findings

**B1:** PASS — `functionalExpenseAllocation.ts` legitimately satisfies 5 NPO gaps across 2 assertion hooks (1:N pattern).

**B6:** PASS — GAP-0174/0177/0180 are US GAAP retail channel-disaggregation doc-lim (not IFRS lease); C7a-10 hypothesis stands.

## Ready for C7c

YES — Atlas v2.15 + LOCK-G7 tag.
