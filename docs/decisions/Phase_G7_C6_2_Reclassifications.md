# Phase G7-C6.2 — IFRS Parity Finalize Reclassifications

**Date:** 2026-06-28
**Predecessor:** G7-C6.1 (`0e422f2`)
**State change:** 102/99/0 → 106/95/0

## Reclassifications

| Gap ID | Pattern | From | To | Sub-commit | IFRS citation |
|---|---|---|---|---|---|
| GAP-0080 | hc/ifrs/chna-cycle | document-limitation | fix-now | C7a-3 | IFRS for SMEs §27 + EU 2014/95/EU + UK Charities SORP module 3 |
| GAP-0182 | saas/ifrs/contract-asset-liability-split | document-limitation | fix-now | C7a-5 | IFRS 15.105–.109 |
| GAP-0183 | saas/ifrs/revenue-disaggregation | document-limitation | fix-now | C7a-5 | IFRS 15.114 + B87–B89 |
| GAP-0184 | saas/ifrs/cost-to-obtain-contract | document-limitation | fix-now | C7a-5 | IFRS 15.91–.94 |

## Rationale

C6.1 Group A: IFRS parity is fix-now whenever US GAAP partner is fix-now AND IFRS standard imposes an applicable disclosure requirement. Verification post-C6.1 surfaced 4 asymmetries missed in the surgical pass.

## Framework non-comingling

- §501(r) is US IRC. NO IFRS analog. GAP-0080 emitter must use neutral language and IFRS citations only. NEVER emit "§501(r)" or "Community Health Needs Assessment" literal under IFRS path.
- GAP-0182/0183/0184 emitters under IFRS path reference IFRS 15 paragraphs only. NEVER ASC 606-10-* or ASC 340-40-* under IFRS path.

## Held at document-limitation

- **GAP-0106** `mfg/ifrs/cogm-rollforward` stays doc-lim. IAS 2 does NOT require a COGM rollforward. Framework correctness > blind parity.

## File deletions

- `docs/limitations/GAP-0080.md`
- `docs/limitations/GAP-0150.md` (orphan from C6.1)
- `docs/limitations/GAP-0182.md`
- `docs/limitations/GAP-0183.md`
- `docs/limitations/GAP-0184.md`

## Final counts

| Bucket | Pre-C6.2 | Post-C6.2 |
|---|---|---|
| fix-now | 102 | **106** |
| document-limitation | 99 | **95** |
| defer-to-future | 0 | **0** |
| **Total** | **201** | **201** |
