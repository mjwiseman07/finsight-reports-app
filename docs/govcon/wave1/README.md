# GovCon/DCAA Wave 1 — Source Bundle (Audit Evidence)

**Vertical:** Government Contracting / DCAA-Compliant
**Lock:** LOCK-GC-1 (Wave 1 Reconnaissance)
**Authored:** 2026-06-25
**Owner:** Matthew Wiseman / Wiseman Financial Technologies LLC
**Product:** Advisacor

## Purpose

This directory is **audit evidence** for LOCK-GC-1, not application code. It documents the source URLs that back every citation handle registered under `lib/intelligence/synthetic/standards/govcon/`. All URLs were verified 2026-06-25 against authoritative `.gov` sources.

These files satisfy SOC 1 / SOC 2 Type 2 audit trail requirements showing **where citation URLs came from**, **when they were verified**, and **who approved their use**. Per the strong-stance binding, no rule text is hard-coded into `lib/` — only URL handles. This bundle is the inspection record.

## Contents

| File | Purpose |
|---|---|
| `GovCon_DCAA_Vertical_Planning_Doc.md` | Architecture, 6 sub-segments (C/N/S/R/F/T), 7-channel audit plan, 12 traps |
| `GovCon_FAR31_Sources.md` | All 52 FAR 31.205 subsections with acquisition.gov URLs |
| `GovCon_CAS_Sources.md` | 8 in-scope CAS (401/402/403/405/406/410/418/420) + 9903 + DS-1/-2 |
| `GovCon_DCAA_Sources.md` | DCAA CAM chapters, MAARs, ICE Model v1.07, SF 1408, DFARS supplements |
| `GovCon_Disclosures_Sources.md` | ICS/ICE, FPRA/FPRR, PBR, DS-1/DS-2 reconciliation chain |
| `GovCon_Benchmarks_Sources.md` | FAR 31.201-3 reasonableness, exec comp cap, DCMA, travel, small biz |
| `GovCon_Citation_Verification_Register.xlsx` | 7 tabs, 193 entries — single source of truth, handle ↔ URL ↔ last-verified |

## Citation Verification

All URLs verified 2026-06-25 against:
acquisition.gov, ecfr.gov, dcaa.mil, dcma.mil, dodig.mil, gsa.gov, sba.gov, state.gov, dod.mil, whitehouse.gov, law.cornell.edu.

## Re-verification Cadence

Per SOC 2 evidence requirements, re-verify all URLs:
- **Annually** for stable references (FAR Part 31, CAS Part 9904, DCAA CAM TOC)
- **At each LOCK-GC-N tag** for any handle modified in that lock
- **Within 30 days** of any OFPP / FAR Council / DCAA notice affecting an in-scope citation (e.g., new exec comp cap memo)

Update the `Last Verified` column in `GovCon_Citation_Verification_Register.xlsx` and bump the planning doc version.

## Related Locks

- Predecessor: LOCK-HC-2 (baseline `5814c8d`)
- This lock: **LOCK-GC-1** (Wave 1 reconnaissance)
- Successor: **LOCK-GC-2** (Wave 2 strong build, target ≥+97%)
