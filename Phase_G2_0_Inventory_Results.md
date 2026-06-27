# Phase G2.0 Inventory Results

Generated: 2026-06-27T20:43:36.371Z
Scanner: `advisacor-stub-inventory` v1.0.0 @ `5ad68d8b5d374d28b5d0e2bc22a1a73ef682d327`

## Top-line Totals

| Metric | Value |
| --- | ---: |
| Hard stubs (main total) | 0 |
| Soft signals (review queue) | 13 |
| All captured signals | 13 |

## Per-vertical Breakdown (hard)

| Vertical | Hard | Soft |
| --- | ---: | ---: |
| FA | 0 | 0 |
| HC | 0 | 0 |
| GC | 0 | 0 |
| CON | 0 | 0 |
| PS | 0 | 0 |
| SAAS | 0 | 0 |
| NPO | 0 | 0 |
| MFG | 0 | 8 |
| RTL | 0 | 0 |
| CONTROL | 0 | 5 |
| SHARED | 0 | 0 |

## Complexity Distribution (hard)

| LOW | MEDIUM | HIGH |
| ---: | ---: | ---: |
| 0 | 0 | 0 |

## Suggested G2 Vertical Ordering Options

1. **Cascade order (existing W2 sequence):** FA → HC → GC → CON → PS → SAAS → NPO → MFG → RTL (filter to verticals with hard stubs)
2. **By hard-stub count (desc):** (none)
3. **By complexity-weighted hotspots:** (none)

## Estimated G2 Sessions (heuristic)

Formula: `(LOW × 0.05) + (MEDIUM × 0.15) + (HIGH × 0.35)` on **hard** stubs only.

- **Estimated sessions:** 0

## Top Files

lib/intelligence/synthetic/industry/manufacturing/variance/index.ts=8, lib/intelligence/synthetic/spine/index.ts=4, lib/accounting/supporting-schedules/scheduleDiagnostics.ts=1

## Anomalies Requiring Founder Attention

- Q-G2.0-E — Zero hard stubs: AST scan found 0 hard signals (patterns 1–3). Main G2 vertical stub-removal scope may be empty; only soft review-queue signals remain.

## Artifacts

- `reports/stub-inventory.json`
- `reports/stub-inventory.md`

