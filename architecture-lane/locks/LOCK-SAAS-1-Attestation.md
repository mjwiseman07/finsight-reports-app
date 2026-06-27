# LOCK-SAAS-1 — SaaS Wave 1 Reconnaissance Lock — Attestation

**Lock identifier:** LOCK-SAAS-1
**Vertical:** SaaS (Software as a Service) — vertical 8 of 8 (terminal vertical of 8-vertical cascade)
**Wave:** 1 (Reconnaissance)
**Branch:** architecture-lane-refactor-baseline
**Baseline SHA (pre-Commit 1):** c32fe91 (LOCK-PS-2 SHA-fill)
**Commit 3 SHA:** PENDING_SHA_FILL (populated by SHA-fill follow-up commit)
**Annotated tag:** LOCK-SAAS-1 (on Commit 3, NOT on SHA-fill)
**Authored:** 2026-06-27
**Lock owner:** Matthew Wiseman / Wiseman Financial Technologies LLC
**Product:** Advisacor
**Founder approval:** "approved" (2026-06-27 00:00 EDT — all 15 §15 defaults at recommended answer; Q10 at recommended B, all other 14 at A)

## §1 — Mission

LOCK-SAAS-1 establishes the reconnaissance foundation for the SaaS vertical, the 8th and final vertical of the 8-vertical cascade. Wave 1 wires the canonical library content (ASC 606 SaaS rev-rec — over-time recognition, distinct hosting vs license, material rights, commission cap, SSP multi-element, variable consideration, usage-based stand-ready, contract modifications; ASC 985-605 legacy lens; ASC 350-40 customer-side internal-use software; ARR/MRR/NRR/GRR computation core (the 5 Q12=A tagged modules); SOC 2 TSC runtime stack (CC always-on, A/C default-ON, PI/P conditional per AICPA TSP Section 100, 2017 TSC revised 2022); IFRS 15, IFRIC March 2019 SaaS configuration/customization, IFRIC April 2021 cloud customer agenda decision, IAS 38), the 5-way sub-segment kernel (P/H/U/F/V — Pure-SaaS / Hybrid / Usage-Based / Freemium-PLG / Vertical-SaaS), citation registry (across 6 domains, see Register), the new 7th doctrine binding flag (containsSaaSARRData, scattered per HC-2 / GC-2 / CON-1 / PS-1 lineage — completes 7-flag doctrine matrix), the new 10th audit channel (arr-mrr-audit, default-ON, 7-yr retention, hash-chained, fail-closed — completes channel-10 audit surface), the new `saas_item` surface category, the K-F dual-framework runtime switch wired with 5 discriminated points (3rd K-F live vertical — CON-2 + PS-2 + SAAS-1), and 5 new runtime guards (commission-amortization-period-guard, material-right-detector, ssp-multi-element-saas-guard, usage-based-stand-ready-classifier, ias-38-cloud-customer-cost-gate). Wave 2 (LOCK-SAAS-2, target ≥121 K-V cases) lifts the doctrine flag to structural assertion across ~50 modules, activates all 26 arr-mrr-audit discriminated outcomes, fully gates K-F switch at all 5 points, activates the vertical-SaaS cross-overlay (HIPAA / SOC 1 / AICPA-Code / UPL re-fire), and lands ≥121 K-V poison cases — closing the 8-vertical cascade.

## §2 — Scope (Wave 1)

- 5 sub-segment kernel (P Pure-SaaS / H Hybrid / U Usage-Based / F Freemium-PLG / V Vertical-SaaS)
- Citation handles across 6-tab register (ASC606 / Specialized / IFRS / Benchmarks / CrossWalk / About) — URL-only, no rule text hard-coded; paywall benchmark handles URL-only per recon pattern
- ~50 module files across libraries / kpi / disclosure-variants / reasonableness / profile / classifiers / frameworks / guards / audit-channels / doctrine-flags
- 5 structural gate verifiers (A/B/C/D/E) — 15 cases delivered (verify-saas-1.js)
- 15 K-V seed cases — verifier-asserted escalation-audit
- IFRS libraries wired AND K-F runtime switch wired at Wave 1 (3rd K-F live vertical)
- 5 ARR/MRR-touching modules structurally tagged with `containsSaaSARRData: true` (Q12=A ~5-module surface)
- Sub-segment classifier `SaaSSubSegmentClassifier` throws on ambiguity (Q4=A)
- arr-mrr-audit channel 10 default-ON (Q1=A), 7-yr retention (Q2=A), hash-chained, fail-closed
- containsSaaSARRData doctrine flag #7 declared in doctrine bus (Q3=A — completes 7-flag matrix)
- SOC 2 TSC runtime stack: CC1.1-CC9.2 always-on; A1/C1 default-ON; PI/P conditional (Q5=A — matches AICPA TSP Section 100 scope intent)
- K-F default US-GAAP (Q6=A); IFRS toggle via `framework: 'ifrs'` runtime param emits to framework-switch-audit
- Commission amortization default = initial term + reasonably-expected renewals (Q7=A — FASB Q&A 79 + Deloitte DART 13.4)
- Material-right threshold = 10% below SSP (Q8=A)
- Usage-based stand-ready = all 3 Deloitte 7.5 conditions strict (Q9=A)
- IAS 38 cloud customer cost gate = attempt 6-criterion test, capitalize if met (Q10=B — recommended answer)
- Vertical-SaaS cross-overlay registered as hooks only; firing deferred to Wave 2 (Q11=B)
- `verify:saas-1` script (Q13=A)
- `docs/saas/wave1/` lowercase (Q14=A)
- Single 11-section REGISTRY_CHANGE_LOG entry (Q15=A)
- 5 runtime guards present at surface (egregious-only throw): commission-amortization-period-guard, material-right-detector, ssp-multi-element-saas-guard, usage-based-stand-ready-classifier, ias-38-cloud-customer-cost-gate
- `saas_item` surface category added (mirrors construction_item / prof_services_item)

## §3 — Doctrine Bindings (all 5 true; 7th flag scattered)

- containsVerticalComplianceLogic
- builderNeverAuthorsContent
- isNotReplacementForHuman
- humanWorkerParityDoctrine
- **containsSaaSARRData** (NEW — scattered flag per HC-2 / GC-2 / CON-1 / PS-1 lineage — 7th and final flag completing the matrix)

## §4 — Sub-Segment Kernel

| ID | Name | Pricing model | Specialized stack |
|---|---|---|---|
| P | Pure-SaaS | Subscription (annual/multi-year) | Over-time recognition (ASC 606-10-25-27a), full SOC 2 TSC CC + A + C |
| H | Hybrid | Subscription + impl services | SSP multi-element allocation, material-right detection, services may be distinct or combined |
| U | Usage-Based | Per-API/per-transaction/per-GB | Variable consideration with constraint, invoice expedient (all 3 strict per Q9=A) |
| F | Freemium-PLG | Free tier + paid upgrade | Material-right detection on free→paid conversion, deferred-revenue triggers on first paid invoice |
| V | Vertical-SaaS | Industry-specific (healthcare, fintech, legal, cpa-tech) | All P stack + cross-overlay (HIPAA / SOC 1 / AICPA-Code / UPL re-fire) — overlay registered Wave 1, fires Wave 2 (Q11=B) |

## §5 — K-F Dual-Framework Switch (5 Discriminated Points)

| # | US GAAP path (default per Q6=A) | IFRS path (toggle via `framework: 'ifrs'`) |
|---|---|---|
| 1 | ASC 606-10-25-27(a) over-time recognition | IFRS 15.35(a) over-time recognition |
| 2 | ASC 350-40 capitalize CCA impl costs | IFRIC Apr 2021 — attempt IAS 38 6-criterion test, capitalize if met (Q10=B) |
| 3 | ASC 985-20-15-5 license-vs-service two-criterion | IFRIC Mar 2019 — always-service |
| 4 | ASC 340-40-35-1 commission amortization "consistent with transfer" | IFRS 15.91-94 substantively parallel |
| 5 | ASC 606-10-32-11 "probable" + 606-10-55-18 invoice expedient | IFRS 15.56-58 "highly probable" + B16 |

Every toggle event emits to `framework-switch-audit` (channel 8).

## §6 — Citation Handles (6-tab register)

| Library | Audit-evidence source doc | Tab |
|---|---|---|
| ASC 606 + ASC 340-40 + ASC 985-605 + ASC 350-40 | docs/saas/wave1/SaaS_ASC606_Sources.md | ASC606 |
| Specialized (SOC 2 TSC + ARR/MRR/NRR/GRR + KPI canonical) | docs/saas/wave1/SaaS_Specialized_Sources.md | Specialized |
| IFRS (15 / IFRIC Mar 2019 / IFRIC Apr 2021 / IAS 38 / IFRS 16) | docs/saas/wave1/SaaS_IFRS_Sources.md | IFRS |
| Benchmarks (KeyBanc / OPEXEngine / SaaStr / Bessemer / Benchmarkit / SaaS Capital / Aleph) | docs/saas/wave1/SaaS_Benchmarks_Sources.md | Benchmarks |
| Cross-walk (US-GAAP ↔ IFRS handle pairing for 5 K-F points) | Register CrossWalk tab | CrossWalk |
| About / metadata | Register About tab | About |

Single source of truth: `docs/saas/wave1/SaaS_Citation_Verification_Register.xlsx` (6 tabs).

## §7 — Verifier Gates (5 gates, 15 cases delivered)

| Gate | Domain | Floor | Delivered |
|---|---|---|---|
| A | Handle resolution (all SaaS handles resolve) | 3 | 3 |
| B | Sub-segment isolation (P/H/U/F/V static enum) + classifier ambiguity throw | 3 | 3 |
| C | Doctrine flag header presence on 5 Q12=A modules + flag declared in doctrine bus | 3 | 3 |
| D | Framework set declared (US_GAAP + IFRS) + K-F 5 discriminated points wired | 3 | 3 |
| E | Audit channel inventory = 10 (arr-mrr-audit default-ON, 7-yr, hash-chained, fail-closed) | 3 | 3 |
| **Total** | | **15** | **15 (SAAS-1 recon level)** |

All 15 cases assert `escalation-audit` emission. No silent rejections. No degraded modes. No severity tiers.

## §8 — Anti-Patterns Guarded

- ❌ Hard-coded ASC / IFRS / TSC rule text under `saas/`
- ❌ Global `DoctrineBinding` union introduction for `containsSaaSARRData` (scattered only per recon pattern)
- ❌ 11th audit channel creation in SAAS-1 (only 10 channels)
- ❌ Runtime sub-segment classifier without ambiguity throw (Q4=A — must throw)
- ❌ Dual-framework K-F switch with non-US-GAAP default (Q6=A US-GAAP default)
- ❌ Commission amortization period = initial contract term only (Q7=A — renewals required)
- ❌ Material right ignored at <10% renewal discount? — NO; rule is: flag AT/ABOVE 10% (Q8=A)
- ❌ Usage-based invoice expedient with 2-of-3 conditions (Q9=A all 3 strict)
- ❌ IFRS-path capitalized CCA impl costs without 6-criterion IAS 38 test (Q10=B)
- ❌ Vertical-SaaS overlay firing in Wave 1 (Q11=B — Wave 2 only)
- ❌ More than 5 modules tagged in Wave 1 (Q12=A — exactly ~5)
- ❌ SOC 2 PI/P always-on default (Q5=A — conditional)
- ❌ SOC 2 CC stack opt-in / conditional (Q5=A — CC always-on)
- ❌ Severity tiers anywhere
- ❌ Degraded modes
- ❌ Fabricated benchmarks — paywall handles URL-only; ranges cite KeyBanc / OPEXEngine / SaaStr / Bessemer / Benchmarkit / SaaS Capital / Aleph
- ❌ Silent rejections — every reject emits `escalation-audit`
- ❌ ARR/MRR computation without `arr-mrr-audit` emission (channel 10 fail-closed)
- ❌ Module asserting on ARR/MRR without `containsSaaSARRData` flag (flag fail-closed)
- ❌ K-F switch toggle without `framework-switch-audit` emission
- ❌ Path-scoped staging around dirty trees — drift stashed pre-Commit 1

## §9 — Strong-Stance

- No degraded modes
- No severity tiers
- No fabricated benchmarks (paywall sources URL-only)
- No silent rejections
- No working-around of dirty repo state (drift stashed)
- Fail-closed posture on all doctrine flag mismatches, audit channel uninitialization, sub-segment ambiguity, and SOC 2 TSC violations

## §10 — SOC 1 / SOC 2 Type 2 / HIPAA Readiness

- All citation URLs verified against authoritative sources 2026-06-27 (asc.fasb.org, ifrs.org, eur-lex.europa.eu, AICPA TSC, HHS HIPAA, KeyBanc, OPEXEngine, SaaStr, Bessemer, Benchmarkit, SaaS Capital, Aleph, Deloitte DART)
- Paywall benchmark handles retained URL-only — no content reproduction
- Citation register tracks last-verified date per handle across 6 tabs
- Doctrine flag `containsSaaSARRData` carries forward into every SAAS-2 module
- `docs/saas/wave1/README.md` documents re-verification cadence (90 days)
- SOC 2 TSC runtime stack matches AICPA TSP Section 100 scope intent (CC always-on, A/C default-ON, PI/P conditional)
- arr-mrr-audit channel 10 default-ON + 7-yr retention + Merkle hash-chain + fail-closed matches SOC 2 Processing Integrity TSC + SEC SOX 802 books-and-records adjacency
- Vertical-SaaS (V) sub-segment hooks registered for HIPAA / SOC 1 / AICPA-Code / UPL re-fire — firing activates in SAAS-2
- Designed to satisfy AICPA TSC, HHS HIPAA, SEC SOX, and EU IFRS audit postures

## §11 — Wave 2 (SAAS-2) Bridge — Cascade-Closing Lock

Wave 2 strong build (target 121/121 PASS: 79 gates +98% / 30 K-V +20% / 12 anti-pattern +50% — parity with GC-2 / CON-2 / PS-2) inherits all SAAS-1 foundations and adds:

- Structural assertion of `containsSaaSARRData` doctrine across ~50 SaaS modules (lift from 5 to ~50)
- All 26 `arr-mrr-audit` discriminated outcomes fire structurally (lift from 5 to 26)
- K-F dual-framework switch fully gated at all 5 discriminated points (structural, not surface)
- SOC 2 TSC fully runtime-active (CC + A + C + PI + P with structural gating, not surface)
- Vertical-SaaS (V) cross-overlay activated — HIPAA / SOC 1 / AICPA-Code / UPL stacks re-fire on V-sub-segment routing (Q11=B Wave 2 activation)
- 5 runtime guards lift from egregious-only-throw to structural fail-closed
- ≥121 K-V poison cases (GC-2 / CON-2 / PS-2 parity)
- K-LOCK D0 evidence + attestation + REGISTRY_CHANGE_LOG + annotated tag LOCK-SAAS-2

**Closing the cascade**: LOCK-SAAS-2 is the terminal lock of the 8-vertical cascade. After LOCK-SAAS-2, Atlas rolls v2.2 → v2.3, and the cascade is COMPLETE.

## §12 — Founder Approval Record

```
Approved (all 15 §15 defaults at recommended answer; Q10 at recommended B,
other 14 at A): "approved" (2026-06-27 00:00 EDT)
By: Matthew Wiseman / Wiseman Financial Technologies LLC
Branch state before Commit 1: c32fe91 (LOCK-PS-2 SHA-fill) — clean tree after drift stash
Wave-1 reconnaissance target: 15 K-V seed cases ✅ delivered exactly 15
Wave-2 strong-build target: 121/121 PASS (GC-2 / CON-2 / PS-2 parity) — cascade-closing
```

## §13 — References

- `Phase_SAAS_1_Recon_Spec.md` v1.0 (LOCKED 2026-06-27)
- `Phase_SAAS_1_Cursor_Paste_Block.md` v1.0
- `docs/saas/wave1/` (audit-evidence bundle: planning doc + 4 source docs + xlsx register + README + handle-index + arr-mrr-audit-channel-spec + k-f-switch-discriminated-points + soc2-tsc-runtime-stack)
- Predecessor locks: LOCK-41.5 (88b4771), LOCK-42.7 (fc0cb43), LOCK-FA-2 (d19a4b4, +80%), LOCK-HC-2 (ee64120 / SHA-fill 5814c8d, +97%), LOCK-GC-1 + LOCK-GC-2 (d6ea0ff / SHA-fill 5432ea0, 121/121), LOCK-CON-1 + LOCK-CON-2 (928a377 / SHA-fill 66960c9, 121/121), LOCK-PS-1 + LOCK-PS-2 (c2b685e / SHA-fill c32fe91, 121/121)
