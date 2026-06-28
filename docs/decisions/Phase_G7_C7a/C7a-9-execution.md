# Phase G7-C7a-9 Execution — RTL Lease Disclosures (ASC 842 Lessee)

**Date:** 2026-06-28  
**Predecessor:** G7-C7a-2b (`aa942aa`)  
**State change:** 22/93/0 → **19/93/0**; satisfied 86 → **89**

## Scope

US GAAP ASC 842 lessee dual-model (operating + finance lease classification). IFRS 16 single right-of-use model deferred to **C7a-10**.

## Emitters added

| Emitter | Citation | Gap |
| --- | --- | --- |
| `lib/router/lanes/retail/emitters/leaseCostBreakdown.ts` | ASC 842-20-50-4(a)–(c) | GAP-0173 |
| `lib/router/lanes/retail/emitters/leaseWeightedAverages.ts` | ASC 842-20-50-4(g)(1)–(2) | GAP-0176 |
| `lib/router/lanes/retail/emitters/leaseMaturityReconciliation.ts` | ASC 842-20-50-6 | GAP-0179 |

## Error classes

- `LeaseCostIncompleteError` extends `FrameworkViolationError` — fail-closed on incomplete cost breakdown input
- `LeaseWeightedAveragesInvalidError` — sanity band rejection (term 0–99 years, rate 0–25%)
- `LeaseMaturityReconciliationError` — footing and balance sheet reconciliation (≤ $1 tolerance)

## Framework guardrails

- All lease emitters branch on `framework === 'US_GAAP_ASC842'` at entry
- IFRS filings with ASC 842 lease inputs route to `frameworkViolation` (C7a-10 placeholder)
- Forbidden US GAAP output substrings: `IFRS 16`, `right-of-use single model`, `lessee single model`

## Gaps closed (3)

| Gap ID | Filing | Emitter |
| --- | --- | --- |
| GAP-0173 | COST-10k | leaseCostBreakdown |
| GAP-0176 | TGT-10k | leaseWeightedAverages |
| GAP-0179 | WMT-10k | leaseMaturityReconciliation |

## RTL US GAAP fix-now remainder

**0** lease-obligations gaps after this commit.

## Fixtures

10 fixtures under `tests/fixtures/retail/leases/` plus `tests/fixtures/retail/cross-cutting/TGT-10K-LEASE.json`.
