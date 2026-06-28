# Phase G7-C7a-10 Execution — RTL Lease IFRS 16 Lessee Parity

**Date:** 2026-06-28  
**Predecessor:** G7-C7a-9 (`d83da05`)  
**State change:** 19/93/0 → **19/91/0**; satisfied 89 → **91** (2 doc-lim reclassified + satisfied)

## §1 enumeration note

Register pre-flight found **2** IFRS `rtl/lease-obligations` gaps (not the hypothesized GAP-0174/0177/0180 cluster — those are US GAAP `channel-disaggregation` doc-lim entries):

| Gap ID | Filing | Emitter |
| --- | --- | --- |
| GAP-0166 | AD-annual | `ifrs/leaseExpenseBreakdown.ts` |
| GAP-0170 | TSCO-annual | `ifrs/leaseMaturityIFRS.ts` |

Both were `document-limitation` (manual IFRS archive stub) — reclassified to `fix-now` per C7a-7 pattern.

`rouAssetRollforward.ts` added to IFRS lessee suite (no register gap — IFRS 16.53(j) has no ASC 842 dual-model analog).

**Lessor gaps surfaced:** none. B5 backlog not required.

## Emitters added

| Emitter | Citation | Register gap |
| --- | --- | --- |
| `lib/router/lanes/retail/emitters/ifrs/leaseExpenseBreakdown.ts` | IFRS 16.53(a)–(e) | GAP-0166 |
| `lib/router/lanes/retail/emitters/ifrs/leaseMaturityIFRS.ts` | IFRS 16.58 + IFRS 7.39 | GAP-0170 |
| `lib/router/lanes/retail/emitters/ifrs/rouAssetRollforward.ts` | IFRS 16.53(j) | suite only |

## Framework substitute note

GAP-0166: IFRS 16.53(c)/(d) require short-term and low-value lease expense disclosed separately; US GAAP ASC 842-20-50-4 collapses short-term only.

## Framework guardrails

- IFRS lane rejects ASC 842 inputs; US GAAP lane rejects IFRS 16 inputs
- Forbidden IFRS output: `operating lease cost`, `finance lease cost`, `ASC 842`, `two-model`, `lessee dual model`, `Thereafter`
- Replaces C7a-9 `frameworkViolation` placeholder for IFRS-routed lease inputs

## Cross-cutting fixtures

- `tests/fixtures/retail/cross-cutting/TGT-10K-LEASE.json` (US GAAP ASC 842 — C7a-9)
- `tests/fixtures/retail/cross-cutting/TSCO-AR-LEASE.json` (IFRS 16 — C7a-10)

## RTL IFRS 16 lessee fix-now remainder

**0** after this commit.
