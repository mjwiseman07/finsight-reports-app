# LOCK-CON-1 — Construction Wave 1 Reconnaissance Lock — Attestation

**Lock identifier:** LOCK-CON-1
**Vertical:** Construction
**Wave:** 1 (Reconnaissance)
**Branch:** architecture-lane-refactor-baseline
**Baseline SHA (pre-Commit 1):** 5432ea0 (LOCK-GC-2 SHA-fill)
**Commit 3 SHA:** PENDING_SHA_FILL (populated by SHA-fill follow-up commit)
**Annotated tag:** LOCK-CON-1 (on Commit 3, NOT on SHA-fill)
**Authored:** 2026-06-26
**Lock owner:** Matthew Wiseman / Wiseman Financial Technologies LLC
**Product:** Advisacor
**Founder approval:** "Approved" (2026-06-26 21:14 EDT — all 18 §15 defaults locked at A)

## §1 — Mission

LOCK-CON-1 establishes the reconnaissance foundation for the Construction vertical. Wave 1 wires the canonical library content (ASC 606 / 340-40 / 842 / 460 / 810 / 323 / 360 / AICPA AAG-CON / AIA G702-G703 / federal & state statutes / surety / IFRS 15-16-IFRIC 12), sub-segment kernel (6 sub-segments G/S/R/C/H/D), citation registry (109 handles across 6 domains), the new 5th doctrine binding flag (containsConstructionContractData, scattered per HC-2 / GC-2 lineage), and the IFRS-parity library suite (first vertical to require dual-framework structural support at Wave 1). Wave 2 (CON-2) creates the 8th audit channel (poc-progress-audit), lifts the doctrine flag to structural assertion, activates the dual-framework switch, and adds 30+ K-V poison cases.

## §2 — Scope (Wave 1)

- 6 sub-segment kernel (G General / S Subcontractor / R Residential / C Commercial-Industrial / H Heavy-Civil / D Design-Build)
- 109 citation handles (URL-only, no rule text hard-coded)
- ~46 module files across libraries / kpi / disclosure-variants / reasonableness / profile
- 5 structural gate verifiers (A/B/C/D/E) — 15 cases delivered (verify-con-1.js)
- 9 K-V seed-case categories (15 cases total) — verifier-asserted escalation-audit
- IFRS libraries wired (Q3=A) — framework switch activation deferred to CON-2
- Federal statutes included (Q7=A — Miller Act, Little Miller TX+NY, Buy American, BABAA)
- IFRIC 12 included (Q8=A — H-sub-segment P3/PPP)
- OSHA reference-only (Q9=A — no enforcement)
- docs/construction/wave1/ audit-evidence directory

## §3 — Doctrine Bindings (all 5 true)

- containsVerticalComplianceLogic
- builderNeverAuthorsContent
- isNotReplacementForHuman
- humanWorkerParityDoctrine
- **containsConstructionContractData** (NEW — scattered flag per Q1=A)

## §4 — Sub-Segment Kernel

| ID | Name | Default standard | ASC 606 over-time | Notes |
|---|---|---|---|---|
| G | General Contractor | US GAAP / IFRS | ✅ | WIP complexity highest |
| S | Subcontractor | US GAAP / IFRS | ✅ | Mechanic's lien rights primary |
| R | Residential | US GAAP / IFRS | ⚠️ point-in-time fallback | Spec homes often fail 25-30(c) |
| C | Commercial / Industrial | US GAAP / IFRS | ✅ | Cost-to-cost dominant |
| H | Heavy Civil / Infrastructure | US GAAP / IFRS / IFRIC 12 | ✅ | P3/PPP possible; Davis-Bacon |
| D | Specialty Design-Build | US GAAP / IFRS | ✅ | ASC 340-40 fulfill-cost dominant |

## §5 — Citation Handles (6 domain libraries, 109 handles)

| Library | Source doc | Handle count |
|---|---|---|
| ASC 606 + 340-40 | Construction_ASC606_Sources.md | 43 |
| ASC 842 | Construction_ASC842_Sources.md | 10 |
| Specialized | Construction_Specialized_Sources.md | 35 |
| IFRS | Construction_IFRS_Sources.md | 9 |
| Benchmarks | Construction_Benchmarks_Sources.md (§1) | 6 |
| Federal Statutes | Construction_Benchmarks_Sources.md (§9) | 4 |
| **Total** | | **109** |

## §6 — Verifier Gates (5 gates, 15 cases delivered)

| Gate | Domain | Floor | Delivered |
|---|---|---|---|
| A | Handle resolution | 3 | 3 |
| B | Sub-segment isolation (G/S/R/C/H/D) | 3 | 3 |
| C | Doctrine flag header presence | 3 | 3 |
| D | Framework set declared (US_GAAP + IFRS) | 3 | 3 |
| E | poc-progress-audit channel surface reserved | 3 | 3 |
| **Total** | | **15** | **15** |

## §7 — Anti-Patterns Guarded

- ❌ Hard-coded rule text under construction/
- ❌ Global DoctrineBinding union (Q1=A — scattered only)
- ❌ 8th poc-progress-audit channel creation in CON-1
- ❌ Runtime sub-segment classifier in CON-1 (Q4=A)
- ❌ Dual-framework switch activation in CON-1 (Q3=A)
- ❌ Silent rejections — every reject emits escalation-audit
- ❌ OSHA enforcement logic (Q9=A — reference-only)

## §8 — Strong-Stance

No degraded modes. No severity tiers. No fabricated benchmarks. No silent rejections. Drift stashed pre-Commit 1.

## §9 — Founder Approval Record

```
Approved (all 18 §15 defaults at A): "Approved" (2026-06-26 21:14 EDT)
By: Matthew Wiseman / Wiseman Financial Technologies LLC
Wave-1 reconnaissance target: 15+ K-V seed cases ✅ delivered exactly 15
```

## §10 — References

- Phase_CON_1_Recon_Spec.md v1.0
- docs/construction/wave1/
- Predecessor: LOCK-GC-2 (d6ea0ff / SHA-fill 5432ea0)
