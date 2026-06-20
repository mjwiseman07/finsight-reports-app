# ADVISACOR — HEALTHCARE REASONABLENESS BENCHMARK LIBRARY (42P)
## Recommended / In-Review Reference | Industry Intelligence
## Industry: healthcare | v1.1 — citation correction VER-P-1
CRITICAL — BENCHMARKS, NOT TARGETS (applies to EVERY entry): These
are benchmarks, not targets. They reflect industry median/typical
ranges from published surveys, association reports, and federal data,
and vary materially by payer mix, geography, organization size,
ownership type, and reporting year. They are NOT performance
objectives, NOT pass/fail thresholds, and must NOT be used as
standalone evaluation criteria. How used: ranges are inputs to a
flagging system that surfaces out-of-range metrics for HUMAN REVIEW
and contextual interpretation — never automatic scoring, never
auto-fail. A metric outside the range may reflect entirely legitimate
operational circumstances. The human controller interprets; Advisacor
never determines. COVID-19 distortion: 2020-2022 benchmarks were
materially distorted; post-2022 data used where available, pre-
pandemic (2018-2019) baselines noted where appropriate. Subscription
data: HFMA MAP Keys and MGMA DataDive are subscription programs;
ranges derive from public summaries, award-winner publications, and
white papers — underlying microdata is paywalled.
OPERATING MODEL: These benchmark ranges are recommended in-review
reference baselines — never final. The customer's controller reviews
each range, calibrates to the entity's specific payer mix / geography
/ size, and interprets any out-of-range result in context.
output_classification "recommendation_for_human_review".
STRUCTURAL METADATA (every entry, enforced as data): benchmarkNotTarget
true; feedsHumanReviewFlaggingOnly true; notPassFailThreshold true;
surfacesForHumanInterpretation true; neverAutoScores true;
neverAutoFails true. Ranges keyed to industrySubClassification so a
benchmark surfaces only for the provider type it applies to.
LINKAGE: benchmark entries correspond to KPI definitions in 42N1
(same KPI — definition there, reasonableness range here) and connect
to relevant healthcare treatments. A 42P range is meaningful ONLY
paired with its 42N1 definition.
SUB-TYPE KEY: acute_care_hospital, ambulatory_surgery_center,
skilled_nursing_facility, physician_practice, home_health_or_hospice
(plus critical_access_hospital as a hospital sub-variant where the
source breaks it out).
## BENCHMARK 1 — DAYS IN NET ACCOUNTS RECEIVABLE
id: bench_net_days_in_ar | links to: 42N1 kpi_net_days_in_ar
CAUTION: Highly sensitive to payer mix (Medicare 14-30 days; Medicaid
30-60; commercial 30-45; Medicare Advantage 30-60). High-Medicaid/
self-pay facilities structurally higher. Rural/independent materially
higher than system-affiliated. Lower generally better, but interpret
in payer-mix context.
RANGES (typical median | top quartile):
- acute_care_hospital (community/teaching): 38-55 days | 30-35.
  Caveat: award-winner figures; broad industry median (incl
  independent non-system) runs 55-100+ per CMS HCRIS.
- critical_access_hospital: 40-53 days (target <53) | <40. Cost-based
  Medicare affects calc.
- ambulatory_surgery_center: 30-45 days (avg ~32) | <25. Workers'
  comp/OON extend to 55+; Medicare ASC target ~18.
- skilled_nursing_facility: 35-55 days | <35. Medicare FFS 14-30;
  Medicaid/MA drag higher.
- physician_practice (primary care): 25-35 days | <25. MGMA median
  35; HFMA target <40.
- physician_practice (specialty): 35-50 days | <30. Behavioral/ortho/
  oncology 45-55.
- home_health_or_hospice (home health): 40-65 days | <35 (Medicare
  only). MA 45-55; Medicaid MCO 60+.
- home_health_or_hospice (hospice): 30-45 days | <30. Per-diem faster.
SOURCES: HFMA MAP Award 2024; CMS HCRIS; Synergize AI HCRIS analysis;
CAHMPAS/Flex; MGMA DataDive 2023. DATA YEAR: 2023-2024.
## BENCHMARK 2 — CASH / NET COLLECTION RATE
id: bench_cash_collection_rate | links to: 42N1 kpi_cash_collection_pct (42N1 flags VARIABLE — HFMA vs MGMA differ; benchmark applies to whichever the customer adopts)
CAUTION: Heavily dependent on contractual-adjustment accuracy —
overstated contractuals inflate the rate. Review alongside days-in-AR
and bad-debt rate. HFMA targets >=100% of rolling-3-month NPSR; >100%
indicates prior-period catch-up, not error.
RANGES (typical median | top quartile):
- acute_care_hospital: 95-100% (top 99.5-102%) | 100-102.4%. HFMA
  minimum 95%, optimal 97-99%.
- critical_access_hospital: 97-100% | 100-101%.
- ambulatory_surgery_center: 81-93% (top to 96%) | 97%+. Rose 81->87%
  avg 2024->2025; implant pass-through/OON complicate.
- skilled_nursing_facility: 95-99% | >99%. Sensitive to state Medicaid
  rate adequacy.
- physician_practice (primary/multi-specialty): 95-98% | 97-99%. (HBMA
  2024: hospital-based 93.2%, office-based 84.9% avg.)
- physician_practice (specialty — behavioral/ortho): 88-95% | 96-98%.
  OON-heavy lower.
- home_health_or_hospice (home health): 90-96% | 97%+. <90% systemic
  problem.
- home_health_or_hospice (hospice): 95-99% | ~100%. Per-diem
  predictable.
SOURCES: HFMA MAP Award 2024; HST Pathways 2025; CLA SNF; MGMA KPI
White Paper 2023; HBMA Q1 2024; NAHC HHFMA. DATA YEAR: 2023-2025.
## BENCHMARK 3 — INITIAL DENIAL RATE
id: bench_initial_denial_rate | links to: 42N1 kpi_denial_rate
CAUTION — RISING TREND (critical context): Denial rates rose industry-
wide EVERY year 2020-2025. The 2024 rate (~11.8%) is a major
deterioration from 5-8% of 2018-2020. Context-dependent: a 10% rate
in 2024 is BETTER than industry average though it would have been
concerning pre-2020. Medicare Advantage and commercial run materially
higher than traditional Medicare. The moving baseline means an out-of-
range flag must be read against the current-year trend, not a static
target.
RANGES (typical industry | top quartile/well-managed):
- acute_care_hospital (all-payer): 10-12% (avg 11.4-11.8%) | <5%
  (HFMA well-managed; MAP winners 50th pct 3.2%).
- acute_care_hospital (Medicare Advantage / commercial): 13-16% MA /
  13-15% commercial | <8%. MA 15.7%, commercial 13.9%.
- critical_access_hospital: 8-12% (directional only; extrapolated from
  community-hospital denial-rate patterns, not separately published for
  CAHs) | <5% (well-managed figure inferred from acute-care-hospital
  benchmark, not CAH-specific). HFMA MAP Award 2024 PDF records Initial
  Denial Rate as "not stated" for the CAH winner cohort (FY2022-FY2024);
  the 3.2% / 2.4% percentile figures in that publication apply to the
  physician-practice winner cohort (n=3), not CAHs. CAH-specific denial
  rates are not benchmarked separately at scale in publicly available
  data.
- ambulatory_surgery_center: 4-12% (avg ~8%) | <4%. Top centers 8->4%
  2024-2025; prior-auth-driven.
- skilled_nursing_facility: 6-12% | <5%. Not separately benchmarked
  industry-wide; therapy/medical-necessity denials rising.
- physician_practice: 5-12% (specialty-dependent) | <5%.
- home_health_or_hospice: 8-14% | <6%. Face-to-face/OASIS documentation
  drive denials.
SOURCES: Kodiak Solutions 2025 (1,850+ hospitals: 11.81% 2024); HFMA
MAP Award; AHA/Premier 2024; HST Pathways 2025; Aptarro. DATA YEAR:
2024-2025.
## BENCHMARK 4 — CLEAN CLAIM RATE
id: bench_clean_claim_rate | links to: 42N1 kpi_clean_claim_rate
CAUTION: Pre-submission (scrubber) vs post-submission (payer FPRR)
differ; compare like-for-like. Higher better.
RANGES (typical | best-in-class):
- acute_care_hospital: 90-95% | 98%+.
- ambulatory_surgery_center: 92-96% | 98%+.
- skilled_nursing_facility: 90-95% | 97%+.
- physician_practice: 93-96% | 98-99%.
- home_health_or_hospice: 88-94% | 96%+. OASIS/documentation complexity.
SOURCES: HFMA MAP Keys CL-1; MGMA; industry RCM. DATA YEAR: 2023-2024.
(Narrower public data for this KPI; ranges indicative, flagged for
calibration.)
## BENCHMARK 5 — DAYS CASH ON HAND
id: bench_days_cash_on_hand | links to: 42N1 kpi_days_cash_on_hand (42N1 flags VARIABLE — covenant/rating-agency definitions differ)
CAUTION: Definition-dependent (restricted cash; 365 vs quarterly
denominator; board-designated treatment). For bond-covenanted
entities the loan-document definition governs and the covenant
minimum is operative, not this benchmark. Higher generally better;
very high may indicate under-deployment.
RANGES (typical median | strong):
- acute_care_hospital: 200-250 days (rating-dependent) | 300+ (A-rated+).
  Covenants often impose 50-150 floors. Distressed/rural <50.
- critical_access_hospital: 60-120 days | 150+. Thinner liquidity.
- ambulatory_surgery_center: 30-90 days | 120+. Distribution-model-
  dependent.
- skilled_nursing_facility: 15-45 days | 60+. Structurally thinner;
  Medicaid-dependent lower.
- physician_practice: 30-90 days | 120+. Distribution practices lower.
- home_health_or_hospice: 30-75 days | 100+.
SOURCES: HFMA Ask the Experts; AHA financial ratios; rating-agency
medians. DATA YEAR: 2023-2024. (Ranges vary widely by credit profile;
calibration to rating/covenant essential.)
## BENCHMARK 6 — OPERATING MARGIN
id: bench_operating_margin | links to: 42N1 kpi_operating_margin (42N1 flags VARIABLE — operating-revenue components vary)
CAUTION: "Operating revenue/expense" components vary (DSH, 340B,
grants). Compare same-basis. Negative operating margin common and not
necessarily distress for mission-driven NFPs subsidized by investment
income; interpret with days-cash and total margin.
RANGES (typical median):
- acute_care_hospital: 1-4% (NFP median 0-3%; many negative post-COVID)
  | 6%+. Rural/safety-net frequently negative.
- critical_access_hospital: -2% to +3% | 5%+. Cost-based reimbursement
  compresses.
- ambulatory_surgery_center: 20-30% (EBITDA-rich) | 35%+.
- skilled_nursing_facility: 0-3% | 5%+. Medicaid-rate-dependent; many
  negative.
- physician_practice: model-dependent; independent 5-15% pre-physician-
  comp. Comp model dominates.
- home_health_or_hospice: 5-12% (hospice richer) | 15%+.
SOURCES: AHA chartbook; HFMA Key Hospital Financial Statistics;
MedPAC; HST Pathways; CLA. DATA YEAR: 2023-2024.
## BENCHMARK 7 — BAD DEBT AS % OF GROSS REVENUE
id: bench_bad_debt_pct | links to: 42N1 kpi_bad_debt_pct_gross; treatments T3/T4
CAUTION: Post-ASC-606, most patient "bad debt" is now IPC within net
revenue — pre/post-2018 not comparable. Applies to residual post-606
bad-debt concept. Lower better.
RANGES (typical):
- acute_care_hospital: 1-4% of gross | <1%. High self-pay/uninsured
  raises.
- ambulatory_surgery_center: 1-3% | <1%.
- skilled_nursing_facility: 1-3% | <1%.
- physician_practice: 2-5% | <2%. High-deductible mix raises.
- home_health_or_hospice: 1-3% | <1%.
SOURCES: HFMA AR-7; industry RCM. DATA YEAR: 2023-2024. (Post-606 shift
makes cross-entity comparison sensitive to IPC-vs-bad-debt
classification — calibrate.)
## BENCHMARK 8 — CHARITY CARE AS % OF GROSS REVENUE
id: bench_charity_care_pct | links to: 42N1 kpi_charity_care_pct_gross; treatment T5
CAUTION: Charge-based (HFMA AR-8) vs cost-based (IRS 990 Schedule H)
differ materially. Declined post-ACA. Mission/geography-dependent —
NOT a performance target; a low figure is not "good" and a high figure
is not "bad."
RANGES (typical):
- acute_care_hospital (NFP): 1-4% of gross | mission-dependent. Safety-
  net materially higher (8%+).
- critical_access_hospital: 1-5%.
- skilled_nursing_facility: <1-2%.
- physician_practice / ambulatory_surgery_center: minimal / not primary.
- home_health_or_hospice: <1-3%.
SOURCES: HFMA AR-8; IRS Form 990 Schedule H context. DATA YEAR:
2023-2024. (Descriptive of mission, NOT a performance objective.)
## BENCHMARK 9 — AR >90 DAYS AS % OF TOTAL AR
id: bench_ar_over_90_pct | links to: 42N1 kpi_ar_aging_buckets
CAUTION: Aging start point (discharge vs bill vs service date) affects
comparability. Lower better.
RANGES (typical | best-in-class):
- acute_care_hospital: 20-30% | <15%.
- ambulatory_surgery_center: 15-25% | <12%.
- skilled_nursing_facility: 20-30% | <18%.
- physician_practice: 15-25% | <12% (MGMA better-performer <15%).
- home_health_or_hospice: 20-30% | <15%.
SOURCES: HFMA AR-1; MGMA DataDive. DATA YEAR: 2023-2024.
## BENCHMARK 10 — POINT-OF-SERVICE COLLECTION RATE
id: bench_pos_collection_rate | links to: 42N1 kpi_pos_collection_rate
CAUTION: POS window definition varies (at-service vs 7-day). Higher
better; depends on front-end process and patient financial counseling.
RANGES (typical | strong):
- acute_care_hospital: 20-40% of self-pay at POS | 50%+.
- ambulatory_surgery_center: 30-50% | 60%+ (elective, pre-service
  feasible).
- physician_practice: 30-50% | 60%+.
- skilled_nursing_facility / home_health_or_hospice: lower relevance
  (admissions-based/episodic).
SOURCES: HFMA PA-7. DATA YEAR: 2023-2024.
## BENCHMARK 11 — OCCUPANCY RATE
id: bench_occupancy_rate | links to: 42N1 kpi_occupancy_rate
CAUTION — COVID DISRUPTION: 2020-2022 severely disrupted. SNF hit
pandemic low 69% (Jan 2021), recovering since. Use pre-pandemic
(2018-2019) baselines for structural assessment. Denominator (licensed
vs staffed beds) materially affects figure.
RANGES (pre-pandemic baseline | current 2023-2024):
- acute_care_hospital (all): ~65-70% | ~65-69% (MedPAC 69% FY2023).
  Urban 75-85%, rural 40-60%.
- critical_access_hospital: 35-55% | 30-50%. Low occupancy structurally
  expected (25-bed cap); <30-35% may indicate viability risk.
- ambulatory_surgery_center: N/A — use OR utilization (Benchmark 15).
- skilled_nursing_facility: 84-88% | 80-84% (MedPAC median 84% Oct
  2024; CLA 83.3% 2024). One quarter >92%, one quarter <71%.
- physician_practice: N/A (schedule occupancy, not published
  nationally).
- home_health_or_hospice: N/A — use ADC/caseload (Benchmark 17).
SOURCES: MedPAC Mar/Dec 2025; CLA 40th SNF Report; AHCA 2024; CAHMPAS.
DATA YEAR: 2023-2024.
## BENCHMARK 12 — AVERAGE LENGTH OF STAY (ALOS)
id: bench_alos | links to: 42N1 kpi_alos
CAUTION: Case-mix-dependent — higher-acuity facilities have longer
ALOS by design. Always control for case mix / DRG weight. SNF Medicare
capped at 100 days (co-pays from day 21).
RANGES (typical median):
- acute_care_hospital (all-payer): 4.8-5.1 days (AHRQ HCUP 2023 ~5.1).
  AMCs/transplant/oncology 7-14.
- acute_care_hospital (Medicare FFS): 5.0-6.5 days.
- critical_access_hospital: 3-5 days (statutory <=96-hour acute average,
  psych/rehab exceptions).
- ambulatory_surgery_center: same-day / <24 hours (N/A as benchmarked
  KPI).
- skilled_nursing_facility (Medicare episode): 25-35 days. Long-stay
  Medicaid 300-500+ (tracked separately, ADC/occupancy more relevant).
- home_health_or_hospice: episode-based (HH 60-day certification);
  hospice mean LOS ~97 days, median ~18 (bimodal).
SOURCES: AHRQ HCUP 2023; HCA 2024; MedPAC; CMS. DATA YEAR: 2023-2024.
## BENCHMARK 13 — CASE MIX INDEX (CMI)
id: bench_cmi | links to: 42N1 kpi_case_mix_index (hospital-only)
CAUTION: NOT "higher is better" — CMI reflects patient acuity and
documentation quality, not performance. A higher CMI means a more
complex population (and higher reimbursement), not a "better" hospital.
Interpret only relative to the facility's service mix.
RANGES (typical):
- acute_care_hospital: ~1.4-1.8 (community); 1.8-2.5+ (academic/
  tertiary/transplant). Medicare CMI commonly cited.
- All other sub-types: N/A (hospital-inpatient-only; SNF uses PDPM —
  Benchmark 18 if applicable).
SOURCES: CMS IPPS; HFMA FM-5. DATA YEAR: 2023-2024 (MS-DRG weights
updated each Oct 1).
## BENCHMARK 14 — WORK RVU PRODUCTIVITY (wRVUs PER FTE PHYSICIAN)
id: bench_wrvu_per_fte | links to: 42N1 kpi_wrvu_per_fte (physician-practice-primary)
CAUTION: Specialty-dependent — wRVU benchmarks vary enormously by
specialty; compare only within specialty. GPCI neutralization required.
RANGES (MGMA median, specialty-dependent):
- physician_practice (primary care): ~4,500-5,500 wRVUs/FTE (MGMA
  median ~5,000).
- physician_practice (specialty): wide — 6,000-10,000+ for procedural
  specialties.
- Hospital/ASC employed physicians: partial applicability, same
  specialty benchmarks.
SOURCES: MGMA Provider Compensation and Production. DATA YEAR:
2023-2024. (Specialty-specific median is the operative comparison.)
## BENCHMARK 15 — SURGICAL CASE VOLUME / OR UTILIZATION (ASC)
id: bench_or_utilization | links to: 42N1 kpi_block_utilization (ASC-primary; VARIABLE in 42N1)
CAUTION: No single standard formula (in-room vs incision start).
Higher utilization generally better but very high may indicate
scheduling inflexibility.
RANGES (typical):
- ambulatory_surgery_center: block utilization 70-85% (target 80-85%;
  blocks <70-75% often recaptured). Case volume facility-specific.
- acute_care_hospital (OR): 68-78% prime-time | 80%+.
SOURCES: ASCA; HST Pathways. DATA YEAR: 2023-2024.
## BENCHMARK 16 — RECERTIFICATION RATE (HOME HEALTH)
id: bench_recert_rate | links to: 42N1 kpi_hh_visits_recert (home-health-only; VARIABLE in 42N1)
CAUTION: NOT a performance target — recert rate reflects patient
population (chronic vs post-acute). High recert may reflect appropriate
chronic-care management OR utilization concern; interpret clinically,
not as good/bad.
RANGES (typical):
- home_health_or_hospice (home health): recertification ~30-45% of
  episodes (population-dependent). Visits per day 5-7 (varies).
SOURCES: CMS Home Health PPS (PDGM); NAHC. DATA YEAR: 2023-2024.
(VARIABLE — no formal MAP Key; calibrate to agency population.)
## BENCHMARK 17 — AVERAGE DAILY CENSUS (ADC)
id: bench_adc | links to: 42N1 kpi_adc (SNF/hospice-primary)
CAUTION: Absolute ADC is facility-size-dependent and not cross-
comparable as a ratio; relevant for trend and occupancy derivation,
not as a benchmark "range" across entities. Surfaced for trend/context,
not threshold comparison.
RANGES: Facility-size-specific; no cross-entity range. SNF ADC derives
occupancy (Benchmark 11). Hospice ADC is the core volume measure (per-
diem basis).
SOURCES: CMS Hospice Data Dictionary; AHCA. DATA YEAR: 2023-2024. (This
entry is primarily a trend/context metric, not a cross-entity
threshold — flagged accordingly.)
## BENCHMARK 18 — 30-DAY READMISSION RATE
id: bench_readmission_rate | links to: 42N1 kpi_readmission_rate (hospital/SNF)
CAUTION: CMS risk-standardized rate is NOT the internal all-payer
observed rate — do not conflate. Lower generally better, but case-mix
and population drive it; CMS HRRP penalties use the risk-standardized
measure.
RANGES (typical):
- acute_care_hospital: ~14-16% all-cause (CMS national ~15%); condition-
  specific varies (HF higher). HRRP penalty relative to expected.
- skilled_nursing_facility: ~20-22% (SNFRM-based); higher than hospital
  due to population acuity.
SOURCES: CMS HRRP; CMS SNFRM. DATA YEAR: 2023-2024.
## OPEN VERIFICATION CHECKLIST (carried as metadata flags, NOT closed)
VC-P-1 through VC-P-18: each benchmark range and its source/data-year
to be independently verified against the cited primary source. Current
status: source_faithful_unverified. Benchmark ranges are the most
time-sensitive content in the entire library — figures shift annually,
several sources are paywalled, and the rising-denial-trend and COVID-
occupancy items are especially date-sensitive. These require the most
current-data verification of any module.
VC-P-POSTURE: confirm every entry carries benchmarkNotTarget /
feedsHumanReviewFlaggingOnly / notPassFailThreshold / neverAutoScores /
neverAutoFails as enforced metadata, AND that the flagging system
honors them (out-of-range surfaces for human review only — no auto-
scoring or failing anywhere). Single most important verification in
this module.
VC-P-CAUTION: confirm each benchmark's per-entry CAUTION note travels
with the range wherever surfaced — a range must never be displayed
without its caveat.
VC-P-LINKAGE: each benchmark links to its 42N1 KPI definition and
(where relevant) treatments T3/T4/T5; confirm cross-references resolve
and a benchmark is never surfaced without its paired definition.
VC-P-SUBTYPE: confirm industrySubClassification keying so a benchmark
surfaces only for applicable provider types.
Phase 42P Industry Intelligence Library. All benchmark ranges
classified output_classification "recommendation_for_human_review".
These are benchmarks, not targets, not pass/fail thresholds, not
standalone evaluation criteria. Out-of-range values surface for human
review and contextual interpretation only — Advisacor never auto-scores
or auto-fails against these ranges. The customer's controller
calibrates each range to the entity's payer mix, geography, size, and
reporting year, and interprets any out-of-range result in context.
