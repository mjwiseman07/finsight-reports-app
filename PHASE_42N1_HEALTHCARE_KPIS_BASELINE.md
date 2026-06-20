# ADVISACOR — HEALTHCARE KPI DEFINITION LIBRARY (42N1)
## Recommended / In-Review Reasonableness Reference | Industry Intelligence
## Industry: healthcare
OPERATING MODEL: These KPI definitions are recommended in-review
reference baselines on Advisacor's side — never final. The customer's
controller reviews each definition, confirms or adapts the formula to
their own EHR / practice-management / GL configuration, and takes
responsibility for the definition they apply. KPI computations
Advisacor produces are classified output_classification
"recommendation_for_human_review". No KPI value constitutes final
financial advice or audit-quality certification.
MODULE SCOPE: 24 KPIs across two domains — financial/revenue-cycle
(1-14) and operational/clinical sub-type-specific (15-24). Each KPI
carries a domain tag, a subTypeApplicability matrix across the five
healthcare sub-classifications, and a standardVsVariable flag. KPIs
flagged VARIABLE have materially competing industry definitions and
load acknowledging that — NOT asserted as having one authoritative
formula.
PHI / SMALL-CELL NOTE (applies to every KPI): KPI computations that
would expose patient-level or small-cell data are subject to the
small-cell suppression rule enforced by the verifier
(healthcare-KPI-cell-size guard). KPI outputs aggregate to the
entity/sub-unit level; no KPI here is defined in a way that requires
patient-identifiable data in its output. containsPHI false for all
definitions; computed values must respect cell-size suppression
before display.
SUB-TYPE KEY: H = acute_care_hospital | A = ambulatory_surgery_center
| S = skilled_nursing_facility | P = physician_practice | HH =
home_health_or_hospice. (applicable / partial / not_applicable.)
## SECTION I — FINANCIAL / REVENUE-CYCLE KPIs (domain: financial_revenue_cycle)
### KPI 1 — NET DAYS IN ACCOUNTS RECEIVABLE
id: kpi_net_days_in_ar | HFMA MAP Key FM-1 | domain: financial_revenue_cycle
DEFINITION: Primary liquidity indicator of overall AR performance —
how many days of average net patient service revenue are tied up in
net AR at a point in time. Net AR is the balance-sheet net patient
receivable reduced by allowances for uncollectibles, contractual
discounts, and charity care. Credit balances, non-patient AR,
non-patient-specific cost-report settlements, and capitation/premium
revenue are excluded.
FORMULA: Net A/R (balance sheet) / Average Daily Net Patient Service
Revenue. Average Daily NPSR = most recent three-month sum of NPSR /
calendar days in those three months (HFMA P&P Board Statement 16,
three-month rolling average for internal reporting).
DATA SOURCE: Numerator balance sheet (net AR); denominator income
statement (NPSR), three-month rolling internal; external users use
365-day average.
SUB-TYPE APPLICABILITY: H applicable | A applicable | S applicable |
P applicable | HH applicable
STANDARD vs VARIABLE: STANDARDIZED (HFMA FM-1). Known variation:
external stakeholders use 365-day denominator vs internal three-month.
CITATION: HFMA MAP Key FM-1; HFMA Ask the Experts (P&P Board Statement 16).
### KPI 2 — GROSS DAYS IN ACCOUNTS RECEIVABLE
id: kpi_gross_days_in_ar | MGMA DataDive (physician variant) | domain: financial_revenue_cycle
DEFINITION: Average collection period based on gross (undiscounted,
pre-contractual-adjustment) charges rather than net revenue. Used
alongside Net Days in AR to evaluate discounting patterns and payer
mix.
FORMULA: Total AR / (Gross FFS Charges / 365).
DATA SOURCE: Numerator aged trial balance (total AR, all payers);
denominator patient financial system (gross FFS charges).
SUB-TYPE APPLICABILITY: H applicable | A applicable | S applicable |
P applicable | HH partial (less standard in HH due to episodic/
visit-based reimbursement)
STANDARD vs VARIABLE: VARIABLE — no single HFMA MAP Key defines gross
AR days for hospitals; MGMA defines the physician variant. Hospital
denominator varies (single-month vs rolling three months).
CITATION: MGMA DataDive Definitions Glossary 2025.
### KPI 3 — CASH COLLECTION % / NET COLLECTION RATE
id: kpi_cash_collection_pct | HFMA MAP Key FM-2 / MGMA equivalent | domain: financial_revenue_cycle
DEFINITION: Two distinct, non-interchangeable definitions exist. HFMA
FM-2: revenue cycle's ability to convert NPSR into cash (cash
collected vs net revenue; can exceed 100% on timing). MGMA Adjusted
FFS Collection %: cash collected vs adjusted/expected charges (true
collection effectiveness; should approach 100%).
FORMULA: HFMA FM-2 — Total Patient Service Cash Collected / Average
Monthly NPSR x 100. MGMA — Net FFS Revenue x 100 / Adjusted FFS
Charges (gross charges minus contractual allowances).
DATA SOURCE: GL (cash collected, incl bad-debt recoveries); income
statement (NPSR three-month avg) or patient financial system
(adjusted FFS charges, MGMA variant).
SUB-TYPE APPLICABILITY: H applicable | A applicable | S applicable |
P applicable | HH applicable
STANDARD vs VARIABLE: VARIABLE — one of the most commonly misdefined
metrics. HFMA (vs net revenue) and MGMA (vs adjusted charges) are not
interchangeable; many organizations conflate them. This module
surfaces BOTH definitions; customer selects which applies.
CITATION: HFMA MAP Key FM-2; MGMA DataDive 2025.
### KPI 4 — GROSS COLLECTION RATE
id: kpi_gross_collection_rate | MGMA Gross FFS Collection % | domain: financial_revenue_cycle
DEFINITION: Total net revenue collected as a percentage of total
gross (undiscounted) charges. Declines as payer mix shifts toward
higher-discount payers (Medicare, Medicaid); reflects combined effect
of contractual adjustments, discounts, write-offs, and collections.
FORMULA: Net FFS Revenue x 100 / Gross FFS Charges.
DATA SOURCE: GL / patient financial system (net FFS revenue); patient
financial system (gross FFS charges).
SUB-TYPE APPLICABILITY: H applicable | A applicable | S partial | P
applicable | HH partial (less emphasized where capitation/bundled
models dominate)
STANDARD vs VARIABLE: STANDARDIZED (MGMA) for physician practices;
VARIABLE in hospital settings. HFMA MAP Keys do not define a
standalone gross collection rate.
CITATION: MGMA DataDive Definitions Glossary 2025.
### KPI 5 — DENIAL RATE
id: kpi_denial_rate | HFMA MAP Keys AR-5 (remittance), AR-6 (write-offs) | domain: financial_revenue_cycle
DEFINITION: AR-5 — percentage of claims denied at adjudication,
defined by HFMA as ACTIONABLE denials (correctable, may yield
reimbursement); excludes non-covered (PR group code),
patient-responsibility, RAC recoupment, and duplicate denials. AR-6 —
financial impact of denials ultimately written off, as % of average
monthly NPSR.
FORMULA: AR-5 — Claims Denied / Claims Remitted x 100. AR-6 — Net
Dollars Written Off as Denials / Average Monthly NPSR x 100.
DATA SOURCE: AR system (835 remittance files / denial codes) for
AR-5; patient financial system (denial write-off dollars net of
recoveries) and income statement (three-month NPSR) for AR-6.
SUB-TYPE APPLICABILITY: H applicable | A applicable | S applicable |
P applicable | HH applicable
STANDARD vs VARIABLE: STANDARDIZED (HFMA AR-5/AR-6). Practice
variation: many dashboards include non-actionable denials, inflating
the rate. The HFMA actionable-denial definition is the benchmarking
standard.
CITATION: HFMA MAP Keys AR-5, AR-6.
### KPI 6 — CLEAN CLAIM RATE (FIRST PASS RESOLUTION)
id: kpi_clean_claim_rate | HFMA MAP Key CL-1 | domain: financial_revenue_cycle
DEFINITION: Percentage of claims passing all claims-scrubbing edits
with no manual intervention before submission. Leading indicator of
data quality at patient access, charge capture, and coding. "First
Pass Resolution Rate" (FPRR) is the payer-adjudication analogue.
FORMULA: Claims Passing Edits With No Manual Intervention / Claims
Accepted into Claims Processing Tool x 100.
DATA SOURCE: Claims processing tool / clearinghouse (monthly aggregate).
SUB-TYPE APPLICABILITY: H applicable | A applicable | S applicable |
P applicable | HH applicable
STANDARD vs VARIABLE: STANDARDIZED (HFMA CL-1). Variation: CL-1 is
pre-submission (clearinghouse/scrubber level); FPRR can be
post-submission (payer level).
CITATION: HFMA MAP Key CL-1.
### KPI 7 — DAYS CASH ON HAND
id: kpi_days_cash_on_hand | HFMA P&P Board guidance (conceptual) | domain: financial_revenue_cycle
DEFINITION: Liquidity ratio — days of operating expenses fundable
from unrestricted cash and short-term investments. For debt
covenants, the loan/master-trust-indenture definition governs; rating
agencies (Moody's, S&P, Fitch) use their own formulas.
FORMULA: (Unrestricted Cash + Short-term Investments) / [(Total
Operating Expenses - Depreciation & Amortization) / 365].
DATA SOURCE: Balance sheet (unrestricted cash, short-term
investments); income statement (operating expenses less D&A).
365-day annualized (rating agency) or three-month average (internal).
SUB-TYPE APPLICABILITY: H applicable | A applicable | S applicable |
P applicable | HH applicable (most actively tracked for
bond-covenanted hospitals/systems, 50-150 day minimums)
STANDARD vs VARIABLE: VARIABLE — no single HFMA MAP Key. Variations:
restricted cash inclusion; 365-day vs quarterly denominator;
board-designated funds classification. For bond-covenanted entities
the loan-document definition governs.
CITATION: HFMA Ask the Experts (Days Cash on Hand); AHA Aggregate
Hospital Margins and Financial Ratios.
### KPI 8 — OPERATING MARGIN (and EBIDA MARGIN)
id: kpi_operating_margin | AHA / HFMA | domain: financial_revenue_cycle
DEFINITION: Operating Margin — % of total operating revenue retained
after operating expenses; operational self-sufficiency before
non-operating items. EBIDA Margin — earnings before interest,
depreciation, amortization, as proxy for cash-generating capacity
(healthcare uses EBIDA not EBITDA because interest is typically
reported separately for non-profit hospitals).
FORMULA: Operating Margin — (Total Operating Revenue - Total
Operating Expenses) / Total Operating Revenue x 100. EBIDA Margin —
(Operating Income + D&A + Interest Expense) / Total Operating Revenue
x 100.
DATA SOURCE: Audited income statement / GL. Operating revenue = NPSR
+ other operating revenue; operating expenses = all expenses
classified operating.
SUB-TYPE APPLICABILITY: H applicable | A applicable | S applicable |
P applicable | HH applicable (EBIDA most common for bond-rated
hospitals/systems; practices/ASCs more commonly track operating
margin)
STANDARD vs VARIABLE: VARIABLE — formula conceptually consistent, but
components of operating revenue/expenses vary by structure and
accounting policy (ASC 606; whether DSH, 340B revenue, or grant
funding is classified operating).
CITATION: AHA Hospital Margins and Financial Ratios; HFMA Key
Hospital Financial Statistics.
### KPI 9 — BAD DEBT AS % OF GROSS REVENUE
id: kpi_bad_debt_pct_gross | HFMA MAP Key AR-7 | domain: financial_revenue_cycle
DEFINITION: Provision for uncollectible accounts as % of gross
patient service revenue. Per HFMA, the income-statement provision
(not period AR write-offs, which differ on timing).
FORMULA: Bad Debt (income statement) / Gross Patient Service Revenue
x 100.
DATA SOURCE: Income statement (bad-debt provision) / GL (allowance
for doubtful accounts); income statement (gross patient service
revenue).
SUB-TYPE APPLICABILITY: H applicable | A applicable | S applicable |
P applicable | HH applicable
STANDARD vs VARIABLE: STANDARDIZED (HFMA AR-7). ASC 606 transition
note: post-2018 most traditional "bad debt" for patient AR is
reported as an implicit price concession within NPSR, not a revenue
deduction — pre/post-ASC-606 comparisons require reconciliation.
Links to healthcare treatment T3 implicit_price_concessions and T2
contractual_allowance_reserves.
CITATION: HFMA MAP Key AR-7.
### KPI 10 — CHARITY CARE AS % OF GROSS REVENUE
id: kpi_charity_care_pct_gross | HFMA MAP Key AR-8 | domain: financial_revenue_cycle
DEFINITION: Provision for services under the organization's financial
assistance policy as % of gross patient service revenue. Intentional
forgiveness of charges for qualifying patients — distinct from bad
debt. Community benefit amounts excluded.
FORMULA: Charity Care (income statement) / Gross Patient Service
Revenue x 100.
DATA SOURCE: Income statement / financial statement footnotes
(charity care provision); income statement (gross patient service
revenue).
SUB-TYPE APPLICABILITY: H applicable | A partial | S applicable | P
partial | HH partial (hospitals and not-for-profit SNFs with
community-benefit obligations track most actively)
STANDARD vs VARIABLE: STANDARDIZED (HFMA AR-8). Variation: charity
care vs uninsured discounts (FM-3) vs community benefit. IRS Form 990
Schedule H requires COST-based charity care (not charge-based as HFMA
AR-8) — a material definitional difference. Links to healthcare
treatment T5 charity_care_and_community_benefit.
CITATION: HFMA MAP Key AR-8.
### KPI 11 — COST-TO-CHARGE RATIO (CCR)
id: kpi_cost_to_charge_ratio | CMS / HCRIS / AHRQ HCUP | domain: financial_revenue_cycle
DEFINITION: Converts gross charges into an approximation of actual
cost; derived from the Medicare Cost Report (CMS Form 2552). Used by
CMS, AHRQ, and payers to estimate cost where actual cost accounting
is unavailable.
FORMULA: Total Allowable Costs (Medicare Cost Report) / Total Gross
Charges. Department-level: dept allowable costs / dept gross charges.
Estimated cost = gross charges x CCR.
DATA SOURCE: Medicare Cost Report (Form 2552-10) by cost center;
UB-04 / revenue codes (gross charges). CMS publishes via HCRIS; AHRQ
via HCUP.
SUB-TYPE APPLICABILITY: H applicable | A partial | S applicable | P
not_applicable | HH partial (applies to Medicare-participating
hospitals, SNFs, HH agencies filing cost reports; ASCs file a
different form; not used by physician practices)
STANDARD vs VARIABLE: STANDARDIZED (CMS/HCRIS) — formally determined
under 42 CFR Part 413. Variation in cost-allocation methodology and
department-level vs overall CCR.
CITATION: CMS Medicare Cost Report (Form 2552); AHRQ HCUP CCR
Methodology Report #2021-05.
### KPI 12 — AR AGING BUCKETS (>90 / >120 DAYS AS % OF TOTAL)
id: kpi_ar_aging_buckets | HFMA MAP Keys AR-1 (billed), AR-3 (incl unbilled) | domain: financial_revenue_cycle
DEFINITION: Stratifies AR by elapsed time since discharge (inpatient)
or date of service (outpatient/ambulatory/physician/post-acute). HFMA
standard buckets: 0-30, 31-60, 61-90, 91-120, >120 days. The >90 and
>120 buckets are the common write-off-risk leading indicators.
FORMULA: Billed AR in Aging Category / Total Billed AR x 100. Buckets
mutually exclusive, sum to 100% of billed AR.
DATA SOURCE: Aged trial balance (month-end snapshot); active billed
debit-balance accounts only (credit balances, DNFB, in-house
excluded).
SUB-TYPE APPLICABILITY: H applicable | A applicable | S applicable |
P applicable | HH applicable
STANDARD vs VARIABLE: STANDARDIZED (HFMA AR-1/AR-3). Variation: aging
start point (discharge vs billing vs service date) differs; HFMA
specifies discharge (inpatient) / date of service (outpatient).
Including unbilled (DNFB) is HFMA AR-3, separate from AR-1.
CITATION: HFMA MAP Keys AR-1, AR-3.
### KPI 13 — DAYS IN DISCHARGED-NOT-FINAL-BILLED (DNFB)
id: kpi_dnfb_days | HFMA MAP Key PB-1 | domain: financial_revenue_cycle
DEFINITION: Gross dollar value of accounts discharged but not yet
released as final bill, in days of gross patient service revenue.
Leading cash-flow indicator; identifies coding,
clinical-documentation, or charge-capture bottlenecks. Month-end
snapshot of accounts in suspense or pending final-billed status.
FORMULA: Gross Dollars in DNFB (unbilled AR) / Average Daily Gross
Patient Service Revenue. Avg daily gross = monthly gross PSR / days in
month (single-month average).
DATA SOURCE: Unbilled AR (patient accounting snapshot); income
statement (monthly gross PSR / days). Includes system suspense,
charge-lag holds, coding holds; excludes in-house, FBNS, late-charge
bills.
SUB-TYPE APPLICABILITY: H applicable | A applicable | S applicable |
P applicable | HH applicable
STANDARD vs VARIABLE: STANDARDIZED (HFMA PB-1). Variation: some split
DNFB into clinical (CDI/coding) vs technical (charge capture) holds.
Related: FBNS (PB-2), DNSP (PB-3).
CITATION: HFMA MAP Key PB-1.
### KPI 14 — POINT-OF-SERVICE COLLECTION RATE
id: kpi_pos_collection_rate | HFMA MAP Key PA-7 | domain: financial_revenue_cycle
DEFINITION: Proportion of self-pay cash collected at/near time of
service (prior to, at, or within seven days of discharge for current
encounters; or at the current visit for prior-encounter balances)
relative to total self-pay cash collected.
FORMULA: POS Self-Pay Cash Collected / Total Self-Pay Cash Collected
x 100 (HFMA seven-day post-discharge window for current encounters).
DATA SOURCE: Patient financial system / POS collection logs; GL
(total self-pay cash).
SUB-TYPE APPLICABILITY: H applicable | A applicable | S applicable |
P applicable | HH partial
STANDARD vs VARIABLE: STANDARDIZED (HFMA PA-7). Variation: POS window
defined as "at service," "within 48 hours," or "within seven days";
HFMA specifies seven days post-discharge. Some define a separate
pre-service collection rate.
CITATION: HFMA MAP Key PA-7.
## SECTION II — OPERATIONAL / CLINICAL SUB-TYPE-SPECIFIC KPIs (domain: operational_clinical)
These KPIs apply only to specific provider sub-types. The resolver
scopes which surface for which industrySubClassification.
### KPI 15 — CASE MIX INDEX (CMI)
id: kpi_case_mix_index | HFMA MAP Key FM-5 / CMS IPPS | domain: operational_clinical
DEFINITION: Average clinical complexity / resource intensity of a
hospital's inpatient population, from CMS MS-DRG relative weights. CMI
1.0 = average resource use; higher = more complex. Drives inpatient
IPPS reimbursement; reflects CDI/coding quality. MS-DRG weights
applied to all discharged inpatients regardless of payer.
FORMULA: Sum of MS-DRG Relative Weights for All Discharged Inpatients
/ Number of Discharged Inpatients (excluding normal newborns).
DATA SOURCE: Encoder/decision-support system; CMS IPPS Final Rule
MS-DRG weights (updated each Oct 1).
SUB-TYPE APPLICABILITY: H applicable | A not_applicable | S
not_applicable | P not_applicable | HH not_applicable (hospital
inpatient only; SNFs use PDPM acuity — see KPI 24)
STANDARD vs VARIABLE: STANDARDIZED (HFMA FM-5 / CMS IPPS). Variation:
separate CMIs by payer, service line, or population; HFMA FM-5
excludes normal newborns and IPPS-exempt units.
CITATION: HFMA MAP Key FM-5; CMS IPPS MS-DRG Relative Weights.
### KPI 16 — AVERAGE LENGTH OF STAY (ALOS)
id: kpi_alos | AHA / CMS | domain: operational_clinical
DEFINITION: Mean inpatient days per discharge over a period.
Hospitals — clinical efficiency/utilization. SNFs — average duration
of Medicare Part A covered and long-term-care stays (short-stay vs
long-stay separately).
FORMULA: Total Inpatient Days / Total Discharges. SNF Medicare Part
A: separate short-stay (<100 days) vs long-stay (>=100 days).
DATA SOURCE: ADT system (inpatient days, discharges); CMS MedPAR /
cost report Worksheet S-3 for Medicare-specific.
SUB-TYPE APPLICABILITY: H applicable | A not_applicable | S
applicable | P not_applicable | HH not_applicable (not meaningful for
ASCs, practices; HH uses episode length under OASIS)
STANDARD vs VARIABLE: STANDARDIZED conceptually. Variation: hospital
ALOS may exclude same-day discharges; SNF short-stay vs long-stay
separate.
CITATION: AHA Hospital Statistics; CMS IPPS ALOS Methodology;
AHCA/NCAL SNF Fast Facts.
### KPI 17 — OCCUPANCY RATE
id: kpi_occupancy_rate | AHA / AHCA | domain: operational_clinical
DEFINITION: Proportion of staffed beds in active use on average —
capacity utilization. Hospitals — average daily census / staffed
beds. SNFs — key financial viability indicator (national SNF avg
~77-80% by 2023-2024 per AHCA/NCAL).
FORMULA: Average Daily Census / Total Staffed Beds x 100. ADC = total
inpatient days in period / days in period.
DATA SOURCE: ADT system (census) / cost report Worksheet S-3;
facility records (staffed/licensed beds); AHA Annual Survey, AHCA
Fast Facts.
SUB-TYPE APPLICABILITY: H applicable | A not_applicable | S
applicable | P not_applicable | HH not_applicable (ASCs no inpatient
beds; practices N/A; hospice uses ADC — see KPI 21)
STANDARD vs VARIABLE: STANDARDIZED conceptually. Material variation in
denominator: licensed vs staffed vs available beds — AHA uses staffed,
CMS cost reports use licensed; yield materially different rates.
CITATION: AHA Hospital Statistics; AHCA/NCAL SNF Fast Facts; CMS
HCRIS Worksheet S-3.
### KPI 18 — SURGICAL CASE VOLUME / BLOCK UTILIZATION (ASC)
id: kpi_block_utilization | ASCA / CMS | domain: operational_clinical
DEFINITION: Case Volume — total operative cases per period (by
room/surgeon/specialty); primary ASC throughput measure. Block
Utilization — % of scheduled/blocked OR time actually used (typical
target 80-85%; blocks below 70-75% may be recaptured).
FORMULA: Block Utilization — Actual OR Time Used (in-room to
out-of-room) / Scheduled Block Time Allocated x 100. Case Volume —
total operative cases completed.
DATA SOURCE: OR scheduling/management system; practice management /
ASC EHR (case count, CPT); ASCA QCDR for benchmarking.
SUB-TYPE APPLICABILITY: H partial | A applicable | S not_applicable |
P not_applicable | HH not_applicable (ASC primary; hospital OR
partial)
STANDARD vs VARIABLE: VARIABLE — no single published standard
formula; in-room vs incision start point varies.
CITATION: ASCA OR utilization guidance; CMS ASC data.
### KPI 19 — WORK RVUs PER CLINICAL FTE
id: kpi_wrvu_per_fte | MGMA | domain: operational_clinical
DEFINITION: Physician productivity — work RVUs generated per clinical
full-time-equivalent. Core MGMA physician-practice productivity
measure.
FORMULA: Total Work RVUs / Clinical FTE count (GPCI-neutralized; work
RVUs, not total RVUs).
DATA SOURCE: Practice management system (wRVUs by provider);
HR/staffing (clinical FTE).
SUB-TYPE APPLICABILITY: H partial | A partial | S not_applicable | P
applicable | HH not_applicable (physician practice primary;
employed-physician hospital/ASC partial)
STANDARD vs VARIABLE: STANDARDIZED (MGMA). Variation: wRVU vs total
RVU; GPCI neutralization required.
CITATION: MGMA Provider Compensation and Production benchmarks.
### KPI 20 — VISITS PER DAY / RECERTIFICATION RATE (HOME HEALTH/HOSPICE)
id: kpi_hh_visits_recert | CMS / NAHC | domain: operational_clinical
DEFINITION: Visits per Day — clinician productivity / visit volume
per period. Recertification Rate — proportion of patients recertified
for continued care beyond the initial episode (home health under
PDGM).
FORMULA: Visits per Day — total billable visits / clinician days.
Recert Rate — recertified episodes / total eligible episodes x 100.
DATA SOURCE: HH EHR / OASIS; CMS Home Health PPS (PDGM) data.
SUB-TYPE APPLICABILITY: H not_applicable | A not_applicable | S
not_applicable | P not_applicable | HH applicable (home health/
hospice only)
STANDARD vs VARIABLE: VARIABLE — not a formal MAP Key; denominator
varies.
CITATION: CMS Home Health PPS (PDGM); NAHC HH-FMA.
### KPI 21 — AVERAGE DAILY CENSUS (ADC)
id: kpi_adc | CMS / AHCA | domain: operational_clinical
DEFINITION: Average number of patients under care per day. SNF —
occupancy/viability input. Hospice — primary census/volume measure
(per-diem reimbursement basis).
FORMULA: Total Patient Days in Period / Number of Days in Period.
DATA SOURCE: ADT / census system; CMS Hospice Data Dictionary; AHCA
Fast Facts (SNF).
SUB-TYPE APPLICABILITY: H partial | A not_applicable | S applicable |
P not_applicable | HH applicable (SNF and hospice primary; hospital
partial)
STANDARD vs VARIABLE: STANDARDIZED. Variation: leave-day inclusion;
hospice vs SNF census definitions differ.
CITATION: CMS Hospice Data Dictionary; AHCA/NCAL Fast Facts.
### KPI 22 — 30-DAY READMISSION RATE
id: kpi_readmission_rate | CMS HRRP / SNFRM | domain: operational_clinical
DEFINITION: Proportion of patients readmitted within 30 days.
Hospital — CMS Hospital Readmissions Reduction Program
(risk-standardized). SNF — SNF Readmission Measure (SNFRM v2.0).
FORMULA: Readmissions within 30 days / eligible discharges (CMS
risk-standardized methodology differs from internal all-payer
observed rate).
DATA SOURCE: CMS claims-based measures (HRRP, SNFRM); internal
observed rate from ADT.
SUB-TYPE APPLICABILITY: H applicable | A not_applicable | S
applicable | P not_applicable | HH not_applicable (hospital and SNF;
CMS programs)
STANDARD vs VARIABLE: STANDARDIZED (CMS). Important: CMS
risk-standardized readmission rate is not the internal all-payer
observed rate — do not conflate.
CITATION: CMS HRRP; CMS SNFRM 2023 Measure Updates.
### KPI 23 — HCAHPS / PATIENT SATISFACTION SCORES
id: kpi_hcahps | CMS / AHRQ | domain: operational_clinical
DEFINITION: Standardized hospital patient-experience survey scores
(HCAHPS). Tied to value-based purchasing.
FORMULA: CMS-standardized survey scoring (top-box percentages by
domain); core questions cannot be modified.
DATA SOURCE: CMS HCAHPS survey vendor data.
SUB-TYPE APPLICABILITY: H applicable | A not_applicable | S
not_applicable | P not_applicable | HH not_applicable (hospital only
as defined; other settings have their own CAHPS instruments, out of
scope here)
STANDARD vs VARIABLE: STANDARDIZED (CMS/AHRQ) — strictly
standardized; core questions fixed.
CITATION: CMS HCAHPS Survey.
### KPI 24 — PDPM SCORE / NTA ACUITY (SNF-SPECIFIC)
id: kpi_pdpm_nta_acuity | CMS | domain: operational_clinical
DEFINITION: SNF acuity/case-mix under the Patient Driven Payment
Model — component-based (PT, OT, SLP, Nursing, NTA) scoring driving
SNF Medicare reimbursement. NTA (Non-Therapy Ancillary) acuity is a
key high-cost-comorbidity component. SNF analogue to hospital CMI.
FORMULA: CMS PDPM component scoring from MDS assessment data
(case-mix indices by component).
DATA SOURCE: MDS (Minimum Data Set) assessments; CMS PDPM grouper.
SUB-TYPE APPLICABILITY: H not_applicable | A not_applicable | S
applicable | P not_applicable | HH not_applicable (SNF only)
STANDARD vs VARIABLE: STANDARDIZED (CMS). Accuracy depends on MDS
coding quality.
CITATION: CMS PDPM.
## OPEN VERIFICATION CHECKLIST (carried as metadata flags, NOT closed)
VC-N1-1 through VC-N1-24: each KPI's authoritative citation to be
independently verified against the primary source. Current status:
source_faithful_unverified.
VC-N1-VARIABLE: the KPIs flagged VARIABLE (2, 3, 7, 8, 18, 20; plus
gross-collection hospital variant in 4) load surfacing competing
definitions; confirm the customer-selection UX presents both.
VC-N1-CELLSIZE: confirm every computed KPI output passes the
verifier's healthcare-KPI-cell-size suppression guard before display.
VC-N1-LINKAGE: KPIs 9 and 10 reference healthcare treatments T2/T3
and T5 — confirm cross-references resolve.
Phase 42N1 Industry Intelligence Library. All KPI computations
classified output_classification "recommendation_for_human_review".
No KPI value or definition constitutes final financial advice or
audit-quality certification. The customer's controller validates each
formula against their specific EHR, practice-management system, and
GL configuration before implementation, and owns the definition they
apply.
