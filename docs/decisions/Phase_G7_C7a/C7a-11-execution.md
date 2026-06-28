# Phase G7-C7a-11 Execution — HC Payor Mix + Bad-Debt + IFRS 9 ECL

**Date:** 2026-06-18  
**Predecessor:** G7-C7a-10 (`be22c73`)  
**State change:** 19/91/0 → **9/91/0**; satisfied 91 → **101** (10 fix-now gaps closed)

## §1 enumeration note

Register pre-flight found **10** HC fix-now gaps in the payor-mix / bad-debt-vs-charity cluster (not the hypothesized HCA/Tenet/CHS-only set — register also includes CVS, THC, UHS, HLMA):

| Gap ID | Filing | Framework | Assertion | Emitter |
| --- | --- | --- | --- | --- |
| GAP-0082 | HLMA-annual | IFRS | bad-debt-vs-charity | `ifrs/receivablesECL.ts` |
| GAP-0083 | HLMA-annual | IFRS | payor-mix | `ifrs/payorMixIFRS.ts` |
| GAP-0087 | CVS-10k | US GAAP | bad-debt-vs-charity | `allowanceRollforward.ts` |
| GAP-0088 | CVS-10k | US GAAP | payor-mix | `payorMixDisaggregation.ts` |
| GAP-0092 | HCA-10k | US GAAP | bad-debt-vs-charity | `implicitPriceConcession.ts` |
| GAP-0093 | HCA-10k | US GAAP | payor-mix | `payorMixDisaggregation.ts` |
| GAP-0097 | THC-10k | US GAAP | bad-debt-vs-charity | `allowanceRollforward.ts` |
| GAP-0098 | THC-10k | US GAAP | payor-mix | `payorMixDisaggregation.ts` |
| GAP-0102 | UHS-10k | US GAAP | bad-debt-vs-charity | `implicitPriceConcession.ts` |
| GAP-0103 | UHS-10k | US GAAP | payor-mix | `payorMixDisaggregation.ts` |

**Suite-only emitters:** none — all 5 emitters map to at least one register gap.

## Framework substitute note

GAP-0082 (IFRS bad-debt-vs-charity): US GAAP ASC 606 implicit price concession at contract inception has no direct IFRS 15 analog; IFRS uses variable consideration constraint (IFRS 15.56–58) plus IFRS 9 ECL post-recognition.

## Dual-lane guardrails

First C7a commit touching both US GAAP and IFRS in one sub-commit.

- US GAAP lane rejects IFRS 9 ECL inputs (`frameworkViolation`, citation ASC 606)
- IFRS lane rejects ASC 606 revenue inputs (`frameworkViolation`, citation IFRS 15)
- Forbidden US GAAP output: IFRS 9 stages, lifetime ECL, variable consideration constraint
- Forbidden IFRS output: implicit price concession, ASC 606, ASC 326, CECL
- Pre-ASC 606 model rejection: bad-debt expense > 5% of net patient service revenue

## Cross-cutting fixtures

- `tests/fixtures/healthcare/cross-cutting/HCA-10K-PAYOR.json` (US GAAP ASC 606 + ASC 326)
- `tests/fixtures/healthcare/cross-cutting/NHS-AR-RECEIVABLES.json` (IFRS 15 + IFRS 9)

## HC fix-now remainder after this commit

**9** (non payor/IPC/ECL cluster).
