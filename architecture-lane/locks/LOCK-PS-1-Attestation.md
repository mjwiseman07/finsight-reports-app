# LOCK-PS-1 — Professional Services Wave 1 Reconnaissance Lock — Attestation

**Lock identifier:** LOCK-PS-1
**Vertical:** Professional Services
**Wave:** 1 (Reconnaissance)
**Branch:** architecture-lane-refactor-baseline
**Baseline SHA (pre-Commit 1):** 66960c9 (LOCK-CON-2 SHA-fill)
**Commit 3 SHA:** PENDING_SHA_FILL (populated by SHA-fill follow-up commit)
**Annotated tag:** LOCK-PS-1 (on Commit 3, NOT on SHA-fill)
**Authored:** 2026-06-26
**Lock owner:** Matthew Wiseman / Wiseman Financial Technologies LLC
**Product:** Advisacor
**Founder approval:** "approved" (2026-06-26 23:03 EDT — all 20 §15 defaults locked at A)

## §1 — Mission

LOCK-PS-1 establishes the reconnaissance foundation for the Professional Services vertical. Wave 1 wires the canonical library content (ASC 606 full rev-rec depth — over-time / retainer-series / contingent-success / multi-element-SSP / principal-vs-agent / WIP-unbilled / contract-mods / backlog; ASC 340-40 contract costs; Specialized — engagement letter, conflict of interest, PE seal, AICPA independence, IT-Services SOC 1/2 + HIPAA + GDPR stack, marketing IP work-for-hire, state UPL/UPA; IFRS 15/16, IAS 38 stub, IAS 37 onerous-contracts), the 6-way sub-segment kernel (L/A/M/I/E/K — Law / Accounting-Advisory / Mgmt-Consulting / IT-Services / Engineering-Architecture / Marketing-Creative), citation registry (142 handles across 6 domains), the new 6th doctrine binding flag (containsProfessionalEngagementData, scattered per HC-2 / GC-2 / CON-1 lineage), the new `prof_services_item` surface category, and the IFRS-parity library suite (2nd vertical to require dual-framework structural support at Wave 1 — Construction was 1st). Wave 2 (PS-2, target ≥+97.5% strong build, ≥121 K-V cases) creates the 9th audit channel (engagement-letter-audit) structurally, lifts the doctrine flag to structural assertion, activates the dual-framework K-F runtime switch across all 5 discriminated switch points, and adds ≥121 K-V poison cases (parity with GC-2 / CON-2).

## §2 — Scope (Wave 1)

- 6 sub-segment kernel (L Law / A Accounting-Advisory / M Mgmt-Consulting / I IT-Services / E Engineering-Architecture / K Marketing-Creative)
- 142 citation handles (URL-only, no rule text hard-coded; 4 paywall handles URL-only per Q17=A)
- ~50 module files across libraries / kpi / disclosure-variants / reasonableness / profile
- 5 structural gate verifiers (A/B/C/D/E) — 15 cases delivered (verify-ps-1.js)
- 10 K-V seed-case categories (15 cases total) — verifier-asserted escalation-audit
- IFRS libraries wired (Q3=A) — framework switch activation deferred to PS-2
- Engagement-letter required-fields schema present (Q4=A — structural enforcement deferred to PS-2)
- COI L+A structural, M conditional (Q5=A — I/E/K out of COI scope at Wave 1)
- PE-seal gate E sub-segment only (Q6=A)
- IT-Services full SOC 1/2 Type 2 + HIPAA BAA + GDPR Art 28 default-ON (Q7=A)
- IAS 38 scaffold stub only (Q8=A — full logic in PS-2)
- Principal-vs-agent net/agent default when no positive control evidence (Q9=A)
- Retainer requires explicit series-of-distinct analysis, fail-closed (Q10=A)
- Multi-element SSP allocation ordered hierarchy enforced top-down (Q11=A)
- Variable-consideration engagement-level estimation with mandatory constraint (Q12=A)
- New `prof_services_item` surface category added (Q19=A — mirrors construction_item / govcon_item)
- IFRS for SMEs deferred to PS-2 (Q20=A)
- docs/prof-services/wave1/ audit-evidence directory (planning + 4 source .md + xlsx register + README + handle-index + engagement-letter-schema + ssp-allocation-hierarchy)

## §3 — Doctrine Bindings (all 6 true)

- containsVerticalComplianceLogic
- builderNeverAuthorsContent
- isNotReplacementForHuman
- humanWorkerParityDoctrine
- **containsProfessionalEngagementData** (NEW — scattered flag per HC-2 / GC-2 / CON-1 lineage)

## §4 — Sub-Segment Kernel

| ID | Name | Default standard | Specialized stack |
|---|---|---|---|
| L | Law | US GAAP / IFRS | Engagement letter + ABA Model Rule 1.5/1.7/1.8/1.9/1.10 + state UPL |
| A | Accounting-Advisory | US GAAP / IFRS | Engagement letter + AICPA ET 1.310 + AICPA independence + state UPA |
| M | Mgmt-Consulting | US GAAP / IFRS | Engagement letter + MCA conditional COI |
| I | IT-Services | US GAAP / IFRS | Engagement letter + SOC 1/2 Type 2 + HIPAA BAA + GDPR Art 28 + IAS 38 (stub PS-1, structural PS-2) |
| E | Engineering-Architecture | US GAAP / IFRS | Engagement letter + NCEES §240.15 PE seal + state PE statutes |
| K | Marketing-Creative | US GAAP / IFRS | Engagement letter + 17 USC §101/201(b) work-for-hire + DMCA |

## §5 — Citation Handles (4 domain libraries + federal/regulatory, 142 handles)

| Library | Audit-evidence source doc | Handle count |
|---|---|---|
| ASC 606 + ASC 340-40 | docs/prof-services/wave1/Prof_Services_ASC606_Sources.md | 52 |
| Specialized (engagement-letter, COI, PE seal, AICPA independence, IT-Services compliance, marketing IP, state UPL/UPA) | docs/prof-services/wave1/Prof_Services_Specialized_Sources.md | 38 |
| IFRS (15 / 16 / IAS 38 / IAS 37 / EUR-Lex) | docs/prof-services/wave1/Prof_Services_IFRS_Sources.md | 18 |
| Benchmarks (Rosenberg / SPI / Source Global / SoDA — 4 paywall URL-only) | docs/prof-services/wave1/Prof_Services_Benchmarks_Sources.md | 17 |
| Federal/Regulatory (auxiliary) | xlsx FederalRegulatory tab | 17 |
| **Total** | | **142** |

Single source of truth: `docs/prof-services/wave1/Prof_Services_Citation_Verification_Register.xlsx` (6 tabs: Index + ASC606 + IFRS + Specialized + Benchmarks + FederalRegulatory).

## §6 — Verifier Gates (5 gates, 15 cases delivered)

| Gate | Domain | Floor | Delivered |
|---|---|---|---|
| A | Handle resolution (all 142 handles resolve) | 3 | 3 |
| B | Sub-segment isolation (L/A/M/I/E/K static enum) | 3 | 3 |
| C | Doctrine flag header presence (~50 modules) | 3 | 3 |
| D | Framework set declared (US_GAAP + IFRS) | 3 | 3 |
| E | engagement-letter-audit channel surface reserved | 3 | 3 |
| **Total** | | **15** | **15 (PS-1 recon level)** |

All 15 cases assert `escalation-audit` emission. No silent rejections. No degraded modes. No severity tiers.

## §7 — Anti-Patterns Guarded

- ❌ Hard-coded ASC / IFRS / statute rule text under `prof-services/`
- ❌ Global `DoctrineBinding` union introduction (scattered only per recon pattern)
- ❌ 9th `engagement-letter-audit` audit channel creation in PS-1 (reserved for PS-2)
- ❌ Runtime sub-segment classifier in PS-1 (static profile only)
- ❌ Dual-framework runtime switch activation in PS-1 (per Q3=A — libraries only)
- ❌ Retainer recognized as straight-line without explicit series-of-distinct analysis (Q10=A fail-closed)
- ❌ Contingent / success fee recognized without variable-consideration constraint (Q12=A constraint mandatory)
- ❌ Multi-element revenue allocated by residual when observable / adjusted-market / expected-cost SSP feasible (Q11=A hierarchy top-down)
- ❌ Reimbursable expense recorded gross without positive principal-control evidence (Q9=A net/agent default)
- ❌ Sales commission expensed when ASC 340-40-25-1 capitalization conditions met
- ❌ PE-seal-required E deliverable shipped without seal-presence gate (Q6=A NCEES §240.15)
- ❌ IT-Services engagement shipped without SOC 1/2 + HIPAA + GDPR trigger evaluation (Q7=A)
- ❌ L/A claiming engineering/valuation work outside licensure (UPL / UPA boundary)
- ❌ IFRS path using US "probable" threshold for variable-consideration constraint (DIV-2: must use "highly probable")
- ❌ IAS 38 internally-generated intangibles capitalized in Wave 1 (Q8=A stub only)
- ❌ IFRS for SMEs scaffolding in Wave 1 (Q20=A — PS-2 only)
- ❌ Severity tiers anywhere
- ❌ Degraded modes
- ❌ Fabricated benchmarks — paywall handles URL-only (Q17=A); ranges cite Rosenberg / SPI / Source Global / SoDA
- ❌ Silent rejections — every reject emits `escalation-audit`
- ❌ Path-scoped staging around dirty trees — drift stashed pre-Commit 1

## §8 — Strong-Stance

- No degraded modes
- No severity tiers
- No fabricated benchmarks (paywall sources URL-only per Q17=A)
- No silent rejections
- No working-around of dirty repo state (drift stashed)

## §9 — SOC 1 / SOC 2 Type 2 / HIPAA / GDPR Readiness

- All citation URLs verified against authoritative sources 2026-06-26 (asc.fasb.org, ifrs.org, eur-lex.europa.eu, uscode.house.gov, ecfr.gov, state statute portals, AICPA, ABA, NCEES, USPTO, AICPA TSC, HHS HIPAA, GDPR-Info)
- EUR-Lex Flag #64 (`EU-REG-2023-1803-OIC`) upgraded to EUR-Lex primary URL where verified (Q18=A)
- Paywall benchmark handles (Rosenberg #109, SPI #117, Source Global #119, SoDA #124) retained URL-only — no content reproduction (Q17=A)
- Citation register tracks last-verified date per handle across 6 tabs
- Doctrine flag `containsProfessionalEngagementData` carries forward into every PS-2 module
- `docs/prof-services/wave1/README.md` documents re-verification cadence
- I-sub-segment carries full SOC 1/SOC 2 Type 2 + HIPAA BAA + GDPR Art 28 stack default-ON (Q7=A) — matches founder SOC/HIPAA mandate
- Designed to satisfy AICPA AAG-PS, ABA professional-responsibility, NCEES PE seal, HHS HIPAA BAA, and EU GDPR Art 28 (processor) audit postures

## §10 — Wave 2 (PS-2) Bridge

Wave 2 strong build (target ≥+97.5%, ≥121 K-V cases per Q14=A) inherits all PS-1 foundations and adds:

- 9th audit channel `engagement-letter-audit` (default-on all PS-2 modules; 7-year retention + hash-chaining)
- Structural assertion of `containsProfessionalEngagementData` doctrine across all PS-2 public functions
- K-0 industry kernel (6-flag cross-doctrine coexistence: PHI + GovCon + Construction + Fund + Healthcare-other + ProfessionalEngagement)
- K-F framework-aware capability routing (dual US GAAP + IFRS switch live across 5 discriminated switch points — incl. DIV-2 highly-probable vs probable, IAS 37 onerous-contract path, IAS 38 capitalization)
- K-G sub-segment governance (L/A/M/I/E/K runtime routing + classifier)
- K-H regulatory controls (engagement letter structural enforcement, COI registry runtime, PE-seal gate, AICPA independence gate, SOC 1/2 + HIPAA + GDPR Art 28 trigger stack, work-for-hire defaults, UPL/UPA boundary enforcement)
- K-I 9-channel audit integration (engagement-letter-audit is channel 9)
- K-J 12+ cross-blend trap defenses
- K-V ≥121 poison cases (parity with GC-2 / CON-2)
- K-LOCK D0 evidence + attestation + REGISTRY_CHANGE_LOG + annotated tag
- IAS 38 full capitalization gate logic (PS-1 ships stub only per Q8=A)

## §11 — Founder Approval Record

```
Approved (all 20 §15 defaults at A): "approved" (2026-06-26 23:03 EDT)
By: Matthew Wiseman / Wiseman Financial Technologies LLC
Branch state before Commit 1: 66960c9 (LOCK-CON-2 SHA-fill) — clean tree after drift stash
Wave-1 reconnaissance target: 15+ K-V seed cases ✅ delivered exactly 15
Wave-2 strong-build target: ≥121 K-V cases (GC-2 / CON-2 parity per Q14=A)
```

## §12 — References

- `Phase_PS_1_Recon_Spec.md` v1.0 (LOCKED 2026-06-26)
- `Phase_PS_1_Cursor_Paste_Block.md` v1.0
- `docs/prof-services/wave1/` (audit-evidence bundle: planning doc + 4 source docs + xlsx register + README + handle-index + engagement-letter-schema + ssp-allocation-hierarchy)
- Predecessor locks: LOCK-41.5 (88b4771), LOCK-42.7 (fc0cb43), LOCK-FA-2 (d19a4b4, +80%), LOCK-HC-2 (ee64120 / SHA-fill 5814c8d, +97%), LOCK-GC-1 (ca5f35f / SHA-fill 14edb99), LOCK-GC-2 (d6ea0ff / SHA-fill 5432ea0, +97.5% / 121 cases), LOCK-CON-1 (813b96d / SHA-fill 17bdde4), LOCK-CON-2 (928a377 / SHA-fill 66960c9, 121/121)
