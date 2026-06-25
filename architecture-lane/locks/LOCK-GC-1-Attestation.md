# LOCK-GC-1 — GovCon/DCAA Wave 1 Reconnaissance Lock — Attestation

**Lock identifier:** LOCK-GC-1
**Vertical:** Government Contracting / DCAA-Compliant
**Wave:** 1 (Reconnaissance)
**Branch:** architecture-lane-refactor-baseline
**Baseline SHA (pre-Commit 1):** 5814c8d (LOCK-HC-2 SHA-fill)
**Commit 3 SHA:** ca5f35f (populated by SHA-fill follow-up commit)
**Annotated tag:** LOCK-GC-1 (on Commit 3, NOT on SHA-fill)
**Authored:** 2026-06-25
**Lock owner:** Matthew Wiseman / Wiseman Financial Technologies LLC
**Product:** Advisacor
**Founder approval (defaults):** "Approve all defaults" (2026-06-25 02:17 EDT — all 15 §15 defaults accepted verbatim)
**Founder approval (gap resolutions):** "I will go with what you recommend" (2026-06-25 02:27 EDT — GAP-1=A, GAP-2=A, GAP-3=A, DRIFT=stash)

## §1 — Mission

LOCK-GC-1 establishes the reconnaissance foundation for the Government Contracting / DCAA-Compliant vertical. Wave 1 wires the knowledge spine, sub-segment kernel (6 sub-segments: C/N/S/R/F/T), isolation contracts, citation registry references (~135 handles across 5 libraries), the new 5th doctrine binding flag (`containsGovernmentContractData`, scattered per HC-2 parity), and the new framework-scoped-memory dimension value (`US_GAAP_ONLY`). Wave 2 (GC-2, target ≥+97% strong build) lights up structural compliance enforcement, the 7th audit channel (`dcaa-rate-audit`), the FPRA→PBR→Final→ICS reconciliation state machine, MAAR 6 timekeeping enforcement, exec comp cap structural assertion, and 25+ K-V poison cases.

## §2 — Scope (Wave 1)

- 6 sub-segment kernel (CAS-Covered, Non-CAS, Small Business, R&D/SBIR, FFP-Heavy, T&M)
- ~135 citation handles (URL-only — no rule text hard-coded)
- 4 DFARS handles registered (252.242-7006, 252.242-7005, 252.215-7002, 215.407-3)
- Exec comp cap registry: CY 2025 = $671,000 confirmed; CY 2026 = $695,000 ESTIMATED with escalation-audit emission
- 5 structural gate verifiers (A/B/C/D/E) — 64 cases delivered (+60% over 40-case floor)
- Negative tests confirming GC-2 surface is reserved (no rate-state machine, no 7th channel, no K-V cases)
- Anti-pattern guards (no hard-coded FAR text, no overlay/govcon/, no PHASE_42.locked.ts edits, no IFRS_* under govcon/, no fabricated rates, no global DoctrineBinding union)
- `docs/govcon/wave1/` audit-evidence directory (5 source `.md` files + xlsx register + README)

## §3 — Doctrine Bindings (all true)

- containsVerticalComplianceLogic
- builderNeverAuthorsContent
- isNotReplacementForHuman
- humanWorkerParityDoctrine
- containsGovernmentContractData (NEW — scattered flag per GAP-2=A, HC-2 `containsPHI` parity)

## §4 — Sub-Segment Kernel

| ID | Name | FAR scope | CAS scope | Notes |
|---|---|---|---|---|
| C | CAS-Covered | full | all 19 standards (8 in-scope for GC-2 enforcement) | DS-1 / DS-2 required |
| N | Non-CAS | FAR 31 only | n/a | Most common SBIR / small-biz path |
| S | Small Business | FAR 31 + SBA size standards | n/a | Self-certification + SBA rules |
| R | R&D / SBIR | FAR 31 + 13 C.F.R. 121 | conditional | Phase I/II/III phase isolation |
| F | FFP-Heavy | FAR 31 reasonableness only | n/a | Limited DCAA touch |
| T | T&M | FAR 31 + 52.232-7 | conditional | Hour-rate / cost-of-materials split |

## §5 — Citation Handles (5 libraries, ~135 handles)

All URLs verified 2026-06-25 against authoritative `.gov` sources:
acquisition.gov, ecfr.gov, dcaa.mil, dcma.mil, dodig.mil, gsa.gov, sba.gov, state.gov, dod.mil, whitehouse.gov, law.cornell.edu.

| Library | Audit-evidence source doc | Handle count |
|---|---|---|
| FAR Part 31 | docs/govcon/wave1/GovCon_FAR31_Sources.md | ~62 |
| Cost Accounting Standards | docs/govcon/wave1/GovCon_CAS_Sources.md | ~30 |
| DCAA (CAM / MAARs / ICE / SF 1408 / DFARS) | docs/govcon/wave1/GovCon_DCAA_Sources.md | ~25 |
| Disclosures (ICS / FPRA / PBR / DS-1 / DS-2) | docs/govcon/wave1/GovCon_Disclosures_Sources.md | ~22 |
| Benchmarks (exec comp / reasonableness / travel / small biz) | docs/govcon/wave1/GovCon_Benchmarks_Sources.md | ~32 |

Single source of truth: `docs/govcon/wave1/GovCon_Citation_Verification_Register.xlsx` (7 tabs, 193 entries).

## §6 — Verifier Gates (5 gates, 64 cases delivered)

| Gate | Domain | Floor | Delivered |
|---|---|---|---|
| A | Handle resolution | 8 | 13 |
| B | Sub-segment isolation | 8 | 13 |
| C | Doctrine flag presence (containsGovernmentContractData scattered) | 8 | 13 |
| D | US_GAAP_ONLY dim guard (reject IFRS_*) | 8 | 13 |
| E | Exec comp cap CY 2026 EST escalation | 8 | 12 |
| **Total** | | **40** | **64 (+60%)** |

All 64 cases assert `escalation-audit` emission. No silent rejections. No degraded modes.

## §7 — Anti-Patterns Guarded

- ❌ Hard-coded FAR 31.205 rule text under `govcon/`
- ❌ `overlay/govcon/` path
- ❌ Modifications to `PHASE_42.locked.ts`
- ❌ `IFRS_*` handle introduction under `govcon/`
- ❌ Fabricated "typical industry rate" values
- ❌ Global `DoctrineBinding` union introduction (per GAP-2=A — scattered only)
- ❌ 7th `dcaa-rate-audit` audit channel in GC-1 (reserved for GC-2)
- ❌ Rate-state machine scaffolding in GC-1 (reserved for GC-K-F gate in GC-2)
- ❌ K-V poison cases in GC-1 (reserved for GC-2)
- ❌ Path-scoped staging around dirty trees (drift stashed pre-Commit 1)

## §8 — Strong-Stance

- No degraded modes
- No severity tiers (every compliance gap = `escalation-audit` + refuse output)
- No fabricated benchmarks (all rate ranges cite primary `.gov` URLs)
- No silent rejections
- No working-around of dirty repo state (drift stashed clean)

## §9 — SOC 1 / SOC 2 Type 2 / DCAA-Audit Readiness

- All citation URLs verified against authoritative `.gov` sources 2026-06-25
- Citation register tracks last-verified date per handle
- `architecture-lane/locks/INDEX.md` is now the master registry (this lock + future locks; HC-2/FA-2/41.5/42.7 retrofit pending)
- `docs/govcon/wave1/README.md` documents re-verification cadence
- Doctrine flag `containsGovernmentContractData` carries forward into every GC-2 module
- Exec comp cap CY 2026 EST emits escalation-audit on use (auditor transparency)
- Designed to satisfy DCAA SF 1408 pre-award accounting system survey criteria

## §10 — Wave 2 (GC-2) Bridge

Wave 2 strong build (target ≥+97% per founder mandate) inherits all GC-1 foundations and adds:

- Full FAR 31.205 structural enforcement (52 subsections)
- All 8 in-scope CAS standards (401/402/403/405/406/410/418/420)
- FPRA → PBR → Final billing → ICS rate-state machine
- 7th audit channel `dcaa-rate-audit` (default-on)
- MAAR 6 timekeeping integrity enforcement
- Exec comp cap structural assertion (refuses output when exceeded)
- 25+ K-V poison cases (in addition to GC-1's 64 structural cases)
- Full structural assertion of `containsGovernmentContractData` doctrine across all GC-2 modules

## §11 — Founder Approval Record

```
Approved (defaults): "Approve all defaults" (2026-06-25 02:17 EDT)
Approved (gap resolutions): "I will go with what you recommend" (2026-06-25 02:27 EDT)
By: Matthew Wiseman / Wiseman Financial Technologies LLC
Branch state before Commit 1: 5814c8d (LOCK-HC-2 SHA-fill) — clean tree after drift stash
Wave-1 overdelivery target: +60% (40 cases floor → 64+ delivered)
Wave-2 strong-build target: ≥+97%
All 15 §15 defaults accepted verbatim — no overrides
All 4 gap resolutions accepted: GAP-1=A path-substitute, GAP-2=A scattered, GAP-3=A locks/ dir, DRIFT=stash
```

## §12 — References

- `Phase_GC_1_Recon_Spec.md` v1.1 (LOCKED 2026-06-25)
- `Phase_GC_1_Cursor_Paste_Block.md` v1.1
- `docs/govcon/wave1/` (audit-evidence bundle, README + 5 source docs + xlsx register)
- Predecessor locks: LOCK-41.5 (88b4771), LOCK-42.7 (fc0cb43), LOCK-FA-2 (d19a4b4, +80%), LOCK-HC-2 (ee64120 / SHA-fill 5814c8d, +97%)
