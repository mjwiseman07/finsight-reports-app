# Phase G7-C7a-2b Execution — FA Remainder (Top-Holdings + SPY-NQ + VFIAX-NCSR)

**Date:** 2026-06-28  
**Predecessor:** G7-C7a-1b (`32acc0d`)  
**Planning doc:** `docs/decisions/Phase_G7_C7a/C7a-2b.md` (committed `14d49d6`)  
**State change:** 34/93/0 → **22/93/0**; satisfied 74 → **86**

## Cluster

§1 enumeration confirmed **12** FA fix-now gaps:

- **4** `top-holdings` (FXAIX, IVV, SPY, VFIAX)
- **8** C7a-2 assertion reuse on SPY-NQ and VFIAX-NCSR (nav, expense, portfolio, realized-unrealized)

No derivatives/brokerage/turnover assertion gaps in queue — those emitters added for full FA disclosure suite and cross-cutting fixture.

## Emitters added

| Lane | Emitter | Closes gaps |
| --- | --- | --- |
| US GAAP | `topHoldingsDisclosure.ts` | top-holdings (4) |
| US GAAP | `derivativesScheduleDisclosure.ts` | — (suite) |
| US GAAP | `brokerageCommissionDisclosure.ts` | — (suite) |
| US GAAP | `portfolioTurnoverDisclosure.ts` | — (suite) |
| IFRS | `topHoldingsDisclosure.ts` | — (IFRS parity) |
| IFRS | `derivativesScheduleDisclosure.ts` | — (suite) |
| IFRS | `brokerageCommissionDisclosure.ts` | — (IFRS substitute) |

C7a-2 emitters reused for GAP-0044–0049, 0051–0052, 0054, 0056.

## Router extension

Multiple emitters fire per entity when structured `fund_accounting` inputs are present. Base C7a-2 four emitters always run.

## IFRS substitutes

- **brokerageCommissionDisclosure:** No IFRS equivalent to Form N-CSR Item 31. Uses IFRS 9.B5.4.8 + IAS 1.97-.98. `FRAMEWORK_SUBSTITUTE_NOTE` exported; output text is framework-pure.
- **portfolioTurnover:** US GAAP only — no IFRS requirement.

## SEC-form-identifier non-comingling

IFRS lane forbids: N-CSR, N-1A, N-Q, Item 27, Item 31, Rule 17a-7. Verified in `tests/unit/fund-accounting-c7a-2b.test.ts`.

## Per-gap emitter_path precision

**5 unique emitter paths** across 12 closures:

| Gap ID | Filing | Assertion | Emitter |
| --- | --- | --- | --- |
| GAP-0034 | FXAIX-NCSR | top-holdings | topHoldingsDisclosure |
| GAP-0041 | IVV-NCSR | top-holdings | topHoldingsDisclosure |
| GAP-0048 | SPY-NQ | top-holdings | topHoldingsDisclosure |
| GAP-0055 | VFIAX-NCSR | top-holdings | topHoldingsDisclosure |
| GAP-0044 | SPY-NQ | nav-computation | navPerShareRollforward |
| GAP-0045 | SPY-NQ | expense-ratio | expenseRatioDisclosure |
| GAP-0047 | SPY-NQ | portfolio-composition | investmentScheduleSummary |
| GAP-0049 | SPY-NQ | realized-unrealized-gains | realizedUnrealizedGains |
| GAP-0051 | VFIAX-NCSR | nav-computation | navPerShareRollforward |
| GAP-0052 | VFIAX-NCSR | expense-ratio | expenseRatioDisclosure |
| GAP-0054 | VFIAX-NCSR | portfolio-composition | investmentScheduleSummary |
| GAP-0056 | VFIAX-NCSR | realized-unrealized-gains | realizedUnrealizedGains |

## Collapse-step closures

**0**

## FA fix-now remainder

**0**
