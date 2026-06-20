# ADVISACOR — HEALTHCARE DISCLOSURE REQUIREMENTS LIBRARY (42O)
## Recommended / In-Review Reference | Industry Intelligence
## Industry: healthcare

OPERATING MODEL: These disclosure requirements are recommended
in-review reference baselines on Advisacor's side — never final. The
customer's controller and external auditor determine which
disclosures apply to the entity's facts, draft the actual footnote
language, and take responsibility for the financial statements.
Advisacor surfaces the applicable requirement and the authoritative
citation; it does NOT author the entity's disclosures.
output_classification "recommendation_for_human_review". Nothing here
is audit-quality certification.

MODULE SCOPE: 19 disclosure requirements across four sections — A
(Revenue & Receivables, ASC 606), B (Healthcare Industry-Specific,
ASC 954), C (340B & Government Payment Programs), D (Community Benefit
& Tax-Exempt). Each item carries paragraph-level ASC citation(s), a
requiredVsVoluntary flag, whatMustBeDisclosed, providerApplicability,
and an asc606TransitionNote where the 2018 standard changed
presentation.

KEY TRANSITION CONTEXT (module-wide): ASU 2014-09 (ASC 606, effective
2018 public / 2019 non-public) reframed contractual allowances and
bad debt for patient AR as variable consideration / implicit price
concessions embedded in net revenue — eliminating the legacy
gross-revenue-minus-bad-debt presentation. ASC 954-605 retained ONLY
for charity care. ASU 2016-13 (ASC 326 CECL) applies to non-patient
financial assets. Pre/post-2018 comparisons require reconciliation.
Connects to treatments T1 net_patient_service_revenue, T2
contractual_allowance_reserves, T3 implicit_price_concessions, T5
charity_care_and_community_benefit, T8 drug_pricing_program_340b.

## SECTION A — REVENUE & RECEIVABLES (ASC 606)

### A.1 — NET PATIENT SERVICE REVENUE PRESENTATION
id: disc_npsr_presentation | requiredVsVoluntary: REQUIRED
ASC: 606-10-25-1; 606-10-32-11 through 32-16; 954-605 (residual charity care)
WHAT MUST BE DISCLOSED: Patient service revenue presented net of
contractual allowances, implicit and explicit price concessions — NOT
at gross charges. Bad debt is no longer a deduction from patient
service revenue. Disaggregation per A.2. Accounting policies for
variable-consideration estimation. Nature of patient service revenue
and the payer classes it arises from (606-10-50-12).
PROVIDER APPLICABILITY: All (H/A/S/P/HH); tax-exempt and for-profit
both subject to ASC 606.
ASC 606 TRANSITION: ASU 2014-09 superseded most ASC 954-605 revenue
guidance (charity care retained); eliminated gross-revenue-with-
separate-bad-debt presentation. Links to treatment T1.

### A.2 — DISAGGREGATION OF REVENUE
id: disc_revenue_disaggregation | requiredVsVoluntary: REQUIRED
ASC: 606-10-50-5; 50-6; 50-7; 55-89 through 55-91
WHAT MUST BE DISCLOSED: Revenue disaggregated into categories
depicting how nature, amount, timing, and uncertainty of cash flows
are affected by economic factors. For healthcare, payer type
(Medicare, Medicaid, commercial, self-pay, other) is the most common
category because payer classes carry materially different cash-flow
risk. Reconcile to segment disclosures (ASC 280). Non-public entities
may elect reduced disclosure (606-10-50-7) but must still meet the
50-5 objective.
PROVIDER APPLICABILITY: All; hospitals/systems most complex (multiple
payers, service lines); SNF/HH/practice often simpler.

### A.3 — CONTRACTUAL ALLOWANCES POLICY
id: disc_contractual_allowances | requiredVsVoluntary: REQUIRED
ASC: 954-310-50-1; 606-10-32-5 through 32-9; 606-10-50-12; 235-10-50-1
WHAT MUST BE DISCLOSED: Accounting policy for contractual adjustments
— the difference between established/list rates and contractually
agreed reimbursement. Basis of estimation (contract-specific rates,
payer-specific historical settlement, fee schedules), updating
methodology, interim-period adjustment treatment. Significant payment
terms incl. variable consideration and its constraint (606-10-50-12).
PROVIDER APPLICABILITY: All; complexity scales with payer mix.
Hospitals with large Medicare/Medicaid have extensive disclosures;
commercial-heavy practices simpler.
ASC 606 TRANSITION: "Contractual allowances" now framed as variable
consideration (explicit price concessions) under 606-10-32-5 through
32-9. Links to treatment T2.

### A.4 — IMPLICIT PRICE CONCESSIONS (IPC)
id: disc_implicit_price_concessions | requiredVsVoluntary: REQUIRED
ASC: 606-10-32-7; 32-11 through 32-16; 50-12A; 50-17 through 50-20
WHAT MUST BE DISCLOSED: (1) IPC estimation methodology (expected value
vs. most likely amount); (2) data inputs (historical collection rates
by payer class, portfolio composition, current economic conditions);
(3) how the variable-consideration constraint is applied; (4) revenue
recognized in current period from changes in IPC estimates on
prior-period obligations. Under the IPC model, expected non-collection
reduces revenue, NOT bad debt expense.
PROVIDER APPLICABILITY: All; most material for hospitals/SNFs with
significant uninsured/high-deductible populations. HFMA P&P Board
Statement 15 (June 2019) governs the IPC-vs-bad-debt-vs-charity
distinction.
ASC 606 TRANSITION: IPC introduced by ASU 2014-09. The intermediate
ASU 2011-07 (bad debt as operating expense, 2012-2018) is now moot
under ASC 606. Links to treatment T3.

### A.5 — PORTFOLIO APPROACH
id: disc_portfolio_approach | requiredVsVoluntary: PERMITTED EXPEDIENT (use requires disclosure as significant judgment)
ASC: 606-10-10-4; 606-10-50-17
WHAT MUST BE DISCLOSED: When applying the portfolio expedient: (1)
that revenue is applied on a portfolio basis; (2) how portfolios are
defined (payer class, service line, financial class); (3) the
estimates/assumptions reflecting portfolio size and composition; (4)
basis for concluding portfolio results don't differ materially from
individual-contract accounting.
PROVIDER APPLICABILITY: All; universally applied in healthcare
(providers can't negotiate per-patient at service time;
self-pay/under-insured status often unknown until after service).
Hospitals/systems typically run multiple portfolios (one per payer
class).

### A.6 — PATIENT RECEIVABLES PRESENTATION / ELIMINATION OF BAD DEBT AS REVENUE DEDUCTION
id: disc_patient_receivables_presentation | requiredVsVoluntary: REQUIRED
ASC: 310-10-45-4; 954-310-50-1; 606-10-32-11 through 32-16; 310-20; 326-20-45-1
WHAT MUST BE DISCLOSED: Gross patient AR and the allowance(s)
reducing it to net: (1) allowance for contractual adjustments; (2)
allowance for IPC; (3) allowance for credit losses (ASC 326,
non-patient financial assets). Write-off policy.
PROVIDER APPLICABILITY: All; hospitals with large self-pay/uninsured
have material IPC allowances; SNF/HH differ on write-off timing.
ASC 606 TRANSITION: The legacy "provision for bad debts" as a
deduction from gross patient revenue is eliminated for entities fully
applying the IPC model. ASU 2011-07 intermediate presentation
superseded. Links to treatments T3 and T4
denial_reserves_and_credit_loss_boundary.

### A.7 — CONTRACT ASSETS, CONTRACT LIABILITIES, REMAINING PERFORMANCE OBLIGATIONS
id: disc_contract_balances | requiredVsVoluntary: REQUIRED
ASC: 606-10-45-3; 45-2; 50-8 through 50-11; 50-13 through 50-16; 50-14A
WHAT MUST BE DISCLOSED: Opening/closing balances of receivables,
contract assets, contract liabilities; revenue recognized from
opening contract-liability balance; revenue from prior-period
obligations; explanation of significant changes. Remaining-
performance-obligation disclosure UNLESS the 50-14A one-year
expedient applies (most routine patient care qualifies). In
healthcare, contract assets are uncommon (patient AR is typically
unconditional); contract liabilities arise from prepayments/deposits.
PROVIDER APPLICABILITY: All; 50-14A expedient widely used for routine
care. Long-term care (SNF/HH/CCRC) and multi-year capitation/bundled
arrangements need analysis on expedient availability.

### A.8 — SIGNIFICANT JUDGMENTS IN REVENUE RECOGNITION
id: disc_significant_judgments | requiredVsVoluntary: REQUIRED (public); non-public may elect reductions (606-10-50-21) EXCEPT variable-consideration constraint disclosure, which all entities must give
ASC: 606-10-50-17 through 50-21
WHAT MUST BE DISCLOSED: Judgments significantly affecting amount/
timing of revenue; methods, inputs, assumptions for transaction price
and constraint. Healthcare-critical judgments: (a) portfolio
definition/homogeneity; (b) IPC methodology; (c) variable-
consideration constraint; (d) third-party settlement estimation; and
the charity-care vs. IPC vs. bad-debt classification.
PROVIDER APPLICABILITY: All; SEC registrants comply fully; non-public
NFP may elect 50-21 reductions; constraint disclosure always required.

## SECTION B — HEALTHCARE INDUSTRY-SPECIFIC (ASC 954)

### B.9 — CHARITY CARE DISCLOSURE
id: disc_charity_care | requiredVsVoluntary: REQUIRED
ASC: 954-605-50-3 through 50-7 (as modified by ASU 2010-23); 954-605-25-6 through 25-9 (charity care NOT recorded as revenue)
WHAT MUST BE DISCLOSED: (a) charity care policy; (b) level of charity
care provided, measured on a COST basis (ASU 2010-23, not charges
foregone); (c) measurement basis (direct/indirect cost, or
ratio-of-cost-to-charges applied to gross charges foregone as
acceptable approximation); (d) contributions/grants/restricted net
assets used to fund charity care; (e) material methodology changes.
Charity care is NOT revenue (954-605-25-7) — ASC 606 does not override
this.
PROVIDER APPLICABILITY: Entities for which ASC 954 is principal
guidance — tax-exempt hospitals/systems/NFP specialty facilities
primarily. For-profit "financial assistance" programs aren't required
under 954-605-50 unless that framework is adopted.
ASC 606 TRANSITION: ASU 2010-23 (2011) mandated cost-basis. ASU
2014-09 did NOT change charity care; 954-605 retained. The IPC
category created a new three-way classification challenge: charity
care (no compensation expected) vs. IPC (expected collection 
billed) vs. later bad debt. Links to treatment T5.

### B.10 — CHARITY CARE POLICY DISCLOSURE
id: disc_charity_care_policy | requiredVsVoluntary: REQUIRED
ASC: 954-605-50-3; 954-605-25-4 through 25-6
WHAT MUST BE DISCLOSED: The entity's policy for providing charity
care — when care is classified as charity (no expectation of payment,
based on patient financial need), which drives the boundary among
charity care, IPC, and bad debt post-ASU 2014-09. (Typically:
financial-assistance-policy income thresholds as % of Federal Poverty
Level, required documentation.)
PROVIDER APPLICABILITY: ASC 954 entities (primarily tax-exempt/NFP).
Links to treatment T5.

### B.11 — REVENUE DISAGGREGATION BY PAYER (HEALTHCARE-SPECIFIC)
id: disc_payer_disaggregation | requiredVsVoluntary: REQUIRED
ASC: 606-10-50-5; 954-310-50-2 (concentration risk)
WHAT MUST BE DISCLOSED: Revenue disaggregated by payer categories
reflecting cash-flow economics: Medicare (cost-based + DRG/PDPM,
retroactive settlement risk); Medicaid (state-variable, settlement
risk); commercial/managed care (contractual rates, authorization);
self-pay (IPC-heavy); other (workers' comp, TRICARE, VA, grants).
Concentration risk disclosure where a significant portion is from a
single payer; portion of receivables by payer class (954-310-50-2).
PROVIDER APPLICABILITY: All; payer mix varies widely (rural CAH 80%+
Medicare/Medicaid; urban AMC balanced; high-income practices
commercial-heavy).

### B.12 — SETTLEMENTS WITH THIRD-PARTY PAYERS / CONTRACTUAL DISPUTES
id: disc_third_party_settlements | requiredVsVoluntary: REQUIRED
ASC: 954-310-50-1; 954-405-50-1; 606-10-50-12A; 450-20-50
WHAT MUST BE DISCLOSED: (1) policy for estimating retroactive
adjustments (Medicare/Medicaid cost reports, RAC audit adjustments);
(2) estimated settlement liabilities/receivables; (3) estimation
basis (cost reports, audit history, payer correspondence); (4)
current-period changes in estimate; (5) range of years open for
audit/settlement. Disputed amounts that are reasonably
possible/probable and estimable lead to 450-20-50 contingency
disclosure.
PROVIDER APPLICABILITY: All entities with government payer revenue;
most material for hospitals/SNFs with cost-based reimbursement,
outlier, DSH. Fee-schedule practices simpler.
ASC 606 TRANSITION: Settlement adjustments now framed as variable
consideration under 606-10-32; same economic substance, new
conceptual reference.

### B.13 — ESTIMATED RETROACTIVE ADJUSTMENTS UNDER REIMBURSEMENT AGREEMENTS
id: disc_retroactive_adjustments | requiredVsVoluntary: REQUIRED
ASC: 954-310-45-1; 954-405-50-1; 606-10-32-11 through 32-16; 606-10-50-18 through 50-20
WHAT MUST BE DISCLOSED: (1) methodology for estimating retroactive
adjustments (DSH, outlier, value-based purchasing); (2) estimated
receivables/liabilities; (3) years open for final settlement; (4)
treatment of changes in estimate (current-period via 606-10-32, not
prior-period error unless an actual error per ASC 250-10). Per HFMA,
RAC adjustments are generally changes in estimate recorded in the
current period (954-405-25).
PROVIDER APPLICABILITY: Entities with Medicare/Medicaid cost report
programs — hospitals, SNFs, HH agencies, CAHs. Fee-schedule practices
have MAC/RAC audit exposure but no cost-based retroactive adjustments.

## SECTION C — 340B & GOVERNMENT PAYMENT PROGRAMS

### C.14 — 340B DRUG PRICING PROGRAM DISCLOSURE
id: disc_340b_program | requiredVsVoluntary: NO SPECIFIC 340B FOOTNOTE REQUIRED; material 340B revenue/savings implicitly require ASC 606 + significant-policy disclosure (235-10-50-1)
ASC: 606-10-32-5 through 32-9; 606-10-50-5; 50-17 through 50-20; 235-10-50-1
WHAT MUST BE DISCLOSED (best practice, where material): (1)
participation in the 340B program; (2) how 340B savings are reflected
(reduced pharmacy acquisition cost as reduction of drug expense, OR
component of outpatient pharmacy drug revenue); (3) split-billing and
contract-pharmacy accounting; (4) rebate/recoupment obligations under
HRSA guidance; (5) HRSA audit/litigation contingencies (post-Novartis/
Sanofi contract-pharmacy disputes) under 450-20-50.
PROVIDER APPLICABILITY: 340B "covered entities" — DSH hospitals,
children's hospitals, sole community providers, CAHs, certain FQHCs,
Ryan White entities. NOT for-profit hospitals without DSH
qualification.
NOTE: No FASB sector-specific 340B guidance exists; industry
disclosure is inconsistent. Links to treatment T8
drug_pricing_program_340b (dual-credential-gated, never
Advisacor-locked).

### C.15 — MEDICARE / MEDICAID SETTLEMENTS
id: disc_medicare_medicaid_settlements | requiredVsVoluntary: REQUIRED (see B.12/B.13 for primary treatment)
ASC: 954-310-50-1; 954-405-50-1; 606-10-32-11; 450-20-50-3 through 50-4; 250-10-50
WHAT MUST BE DISCLOSED: Medicare cost report settlement process
(annual cost report to MAC, may take 2-5 years to finalize);
significant-judgment methodology (606-10-50-18) for in-process vs.
final settlement estimates; Medicaid settlement exposure by program
type (UPL, DSH, supplemental pools) and state.
PROVIDER APPLICABILITY: Entities with Medicare/Medicaid cost-based
programs.

### C.16 — PASS-THROUGH PROGRAMS & SUPPLEMENTAL PAYMENTS (DSH, UPL)
id: disc_dsh_upl_supplemental | requiredVsVoluntary: REQUIRED where material
ASC: 606-10-32-5 through 32-9; 606-10-50-12; 958-605; 606-10-50-18
WHAT MUST BE DISCLOSED: Where DSH/supplemental payments are material:
(1) policy (patient service revenue vs. government grant); (2)
estimation method (intergovernmental transfer programs, state
allotment, historical rates); (3) timing of receipt vs. earned
eligibility; (4) contingent recoupment risk. Medicaid DSH audits (42
U.S.C. 1396r-4(j)) may surface retroactive adjustments leading to
450-20-50.
PROVIDER APPLICABILITY: Medicare/Medicaid DSH hospitals. SNFs and
physician practices do not receive DSH. FQHC/RHC may receive
alternative supplemental payments.

### C.17 — EHR INCENTIVE PAYMENTS (LEGACY ARRA/HITECH)
id: disc_ehr_incentive_legacy | requiredVsVoluntary: REQUIRED to the extent material; legacy as of 2026
ASC: 450-30 OR IAS 20 by analogy (HFMA); 235-10-50-1; 606-10-50-17
WHAT MUST BE DISCLOSED: Accounting policy (contingency vs. grant);
recognition conditions; current-period amounts; remaining contingent
recoupment risk (HITECH payment adjustments).
PROVIDER APPLICABILITY: Hospitals/eligible professionals who received
Medicare/Medicaid EHR incentives. By 2026 the program is complete
(Medicaid concluded 2021, Medicare 2016); primary remaining
consideration is open-audit recoupment under 450-20-50. Successor
programs (Promoting Interoperability, QPP) embedded in Medicare rates
as value-based adjustments (variable consideration).

### C.18 — PROVIDER RELIEF FUNDS (HHS PRF)
id: disc_provider_relief_funds | requiredVsVoluntary: REQUIRED to the extent material; legacy for most entities as of 2026
ASC: 958-605; 606 / 450-30 (for-profit alternatives); 235-10-50-1
WHAT MUST BE DISCLOSED: (1) accounting policy selected; (2) total PRF
received, recognized as revenue, remaining deferred; (3) HHS
conditions and basis for "substantially met"; (4) amounts subject to
HHS recoupment; (5) restricted vs. unrestricted classification (NFP).
Open PRF reporting periods lead to 450-20-50 contingency.
PROVIDER APPLICABILITY: All providers that received CARES Act PRF
(2020-2022). By 2026 final HRSA audit/recoupment ongoing; entities
with unresolved findings maintain 450-20-50 disclosures. For-profit
groups used varied models (450-30, IAS 20 by analogy).

## SECTION D — COMMUNITY BENEFIT & TAX-EXEMPT

### D.19 — COMMUNITY BENEFIT (TAX-EXEMPT HOSPITALS)
id: disc_community_benefit | requiredVsVoluntary: NOT a US GAAP financial-statement requirement; driven by IRS Form 990 Schedule H (tax) and state law — distinguished from charity care
ASC: Not ASC-required as financial-statement disclosure; relates to 954-605 charity care (B.9) but broader; IRS Form 990 Schedule H (cost-based) is the operative reporting regime
WHAT MUST BE DISCLOSED: Community benefit (broader than charity care:
unreimbursed Medicaid, community health programs, education, research,
subsidized services) is reported on IRS Form 990 Schedule H on a COST
basis for tax-exempt hospitals — NOT in the ASC financial statements
per se. Distinguish from HFMA AR-8 charity care (charge-based).
Excluded from the financial-statement charity care figure (B.9).
PROVIDER APPLICABILITY: Tax-exempt 501(c)(3) hospitals (Form 990
Schedule H filers). Not a for-profit requirement. Links to treatment
T5 (for-profit-only on the charity side, community benefit excluded
by design).
NOTE: Included as reference so the boundary between financial-
statement charity care (ASC 954, B.9) and tax-reported community
benefit (IRS 990 Schedule H) is explicit — a common point of
confusion. It is NOT an ASC financial-statement disclosure obligation.

## OPEN VERIFICATION CHECKLIST (carried as metadata flags, NOT closed)

VC-O-1 through VC-O-19: each disclosure item's ASC paragraph
citation(s) to be independently verified at asc.fasb.org. Current
status: source_faithful_unverified.
VC-O-REQUIRED: confirm the requiredVsVoluntary classification on each
item, especially A.5, A.8, C.14, D.19.
VC-O-TRANSITION: confirm the ASC 606 transition notes (bad-debt-to-
IPC, ASU 2011-07 supersession, charity-care retention) are stated
correctly.
VC-O-LINKAGE: items reference treatments T1, T2, T3, T4, T5, T8 —
confirm cross-references resolve.

Phase 42O Industry Intelligence Library. All disclosure references
classified output_classification "recommendation_for_human_review". No
item constitutes the entity's actual disclosure or audit-quality
certification. The customer's controller and external auditor
determine applicability and draft the financial statements; Advisacor
surfaces the applicable requirement and citation only.
