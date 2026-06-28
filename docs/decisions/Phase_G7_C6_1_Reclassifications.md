# Phase G7-C6.1 Reclassifications

**Date:** 2026-06-27T23:58:46.133Z
**Base triage SHA:** `59398f7` (G7-C6)
**Re-triage SHA:** `59398f74ce7dc826cb27f6279b5a851ec6685546`
**Method:** surgical §4 apply algorithm (21 targeted reclassifications)

## Final counts

| Triage | Gaps |
| --- | ---: |
| fix-now | 102 |
| document-limitation | 99 |
| defer-to-future | 0 |

## Groups

1. **Group A — HC CHNA scope** (4 gaps): `defer-to-future` → `fix-now` for `hc/us-gaap/chna-cycle`.
2. **Group B — MFG inventory US GAAP** (8 gaps): `defer-to-future` → `fix-now` for `mfg/us-gaap/inventory-decomposition` + `cogm-rollforward`.
3. **Group B-bonus — MFG IFRS inventory** (1 gap): `document-limitation` → `fix-now` for `mfg/ifrs/inventory-decomposition`.
4. **Group C — IFRS structural parity** (8 gaps): `document-limitation` → `fix-now` for structural IFRS singletons mirroring US GAAP fix-now clusters.

## Reclassification table

| Gap | Filing | From | To | Group |
| --- | --- | --- | --- | --- |
| GAP-0085 | CVS-10k | defer-to-future | fix-now | A — HC CHNA scope |
| GAP-0090 | HCA-10k | defer-to-future | fix-now | A — HC CHNA scope |
| GAP-0095 | THC-10k | defer-to-future | fix-now | A — HC CHNA scope |
| GAP-0100 | UHS-10k | defer-to-future | fix-now | A — HC CHNA scope |
| GAP-0110 | CAT-10k | defer-to-future | fix-now | B — MFG inventory US GAAP |
| GAP-0115 | ETN-10k | defer-to-future | fix-now | B — MFG inventory US GAAP |
| GAP-0120 | GE-10k | defer-to-future | fix-now | B — MFG inventory US GAAP |
| GAP-0125 | HON-10k | defer-to-future | fix-now | B — MFG inventory US GAAP |
| GAP-0111 | CAT-10k | defer-to-future | fix-now | B — MFG inventory US GAAP |
| GAP-0116 | ETN-10k | defer-to-future | fix-now | B — MFG inventory US GAAP |
| GAP-0121 | GE-10k | defer-to-future | fix-now | B — MFG inventory US GAAP |
| GAP-0126 | HON-10k | defer-to-future | fix-now | B — MFG inventory US GAAP |
| GAP-0105 | SIE-annual | document-limitation | fix-now | B-bonus — MFG IFRS inventory |
| GAP-0001 | BBY-annual | document-limitation | fix-now | C — IFRS structural parity |
| GAP-0002 | BBY-annual | document-limitation | fix-now | C — IFRS structural parity |
| GAP-0003 | BBY-annual | document-limitation | fix-now | C — IFRS structural parity |
| GAP-0082 | HLMA-annual | document-limitation | fix-now | C — IFRS structural parity |
| GAP-0083 | HLMA-annual | document-limitation | fix-now | C — IFRS structural parity |
| GAP-0147 | DLTE-UK-annual | document-limitation | fix-now | C — IFRS structural parity |
| GAP-0181 | SAP-20f | document-limitation | fix-now | C — IFRS structural parity |
| GAP-0150 | DLTE-UK-annual | document-limitation | fix-now | C — IFRS structural parity |

## Deleted limitation files (8)

- `docs/limitations/GAP-0001.md`
- `docs/limitations/GAP-0002.md`
- `docs/limitations/GAP-0003.md`
- `docs/limitations/GAP-0082.md`
- `docs/limitations/GAP-0083.md`
- `docs/limitations/GAP-0147.md`
- `docs/limitations/GAP-0181.md`
- `docs/limitations/GAP-0105.md`

## Deferred gaps registry

All 12 G7-C6 defer-to-future entries removed; `docs/deferred-gaps.md` reset to empty placeholder.
