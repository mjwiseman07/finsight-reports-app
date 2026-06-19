# ADVISACOR — GENERIC INDUSTRY TREATMENT LIBRARY (42I)
## Generic Baseline Treatments — Recommended / In-Review
### Multi-Framework Launch Scope | Conformant Spine + Customer-Adaptable Joints
OPERATING MODEL: Advisacor treatments are recommended baselines in
review on Advisacor's side — never "final." The customer's
controller reviews the recommended default, adapts it to their
facts, and locks it in through implementation at the customer ID.
The customer takes responsibility for the model they sign off on.
## LIMITATION OF USE (LIB-1)
This library is a recommendation for human review, not
professional accounting services. Wiseman Financial Technologies,
LLC does not render accounting opinions, audit, or tax services.
The customer's controller, CPA, or specialist is responsible for
treatment selection, adaptation, attestation, and audit defense.
## CUSTOMER ADAPTATION AUDIT LOG (LIB-2)
Every adaptation captures: prior value, new value, rationale,
attestor name, attestor credentials, attestation date,
reviewSampleEligible flag. Visible to customer; exportable for
their auditor.
## DEFAULT ACCEPTANCE ATTESTATION (LIB-3)
Accepting an unmodified default requires affirmative attestation:
"I have reviewed the conformant default for [treatment] and
confirm it is appropriate for my entity's facts. I understand it
is a generic baseline and not customized to my entity."
## MATERIAL CHANGE RE-ATTESTATION (LIB-4)
When an ASC standard changes and Advisacor updates the library,
customers must re-attest before continued reliance.
## GENERIC VERIFICATION CHECKLIST (GVC — must close before customer reliance)
- GVC-1: ASC 326-20-30-7 historical experience requirement (Treatment 11)
---
## 1. PROFESSIONAL SERVICES REVENUE
Topic: professional_services_revenue | compositionOutcome: extendsFrameworkDefault | displacementLineage: null
CONFORMANT SPINE: Revenue from professional services is recognized
under ASC 606's five-step model in the amount the entity expects to
be entitled to (ASC 606-10-10-1). Services transferred over time
are recognized over time where an ASC 606-10-25-27 criterion is
met; otherwise at the point the performance obligation is
satisfied. Over-time progress is measured by an input or output
method (ASC 606-10-25-31). Stand-ready/retainer arrangements are a
series of distinct services under ASC 606-10-25-14(b) and 25-15.
Variable consideration is subject to the constraint (ASC
606-10-32-11).
ADAPTABLE JOINTS: Over-time vs point-in-time — default over-time
where a 25-27 criterion is met, input method (costs/hours); output
methods equally permitted; customer-adaptable. Stand-ready —
default ratable as series of distinct services; customer-adaptable.
Variable consideration (conservative) — default: contingent/
variable fees constrained to zero until the measurement period
closes and the amount is reliably estimable; earlier recognition
routes to advised-override; customer-adaptable.
CITATIONS: ASC 606-10-10-1; 25-14(b); 25-15; 25-27; 25-31; 32-11.
IFRS NOTE: IFRS 15 substantially converged.
---
## 2. SMB INVENTORY
Topic: smb_inventory | compositionOutcome: extendsFrameworkDefault | displacementLineage: null
CONFORMANT SPINE: Inventory measured at lower of cost and net
realizable value under ASC 330 (ASC 330-10-35-1B). Cost includes
items per ASC 330-10-30-9 [GVC]. Under us_gaap FIFO, weighted-
average, and LIFO all permitted (LIFO us_gaap only). NRV write-
downs recognized when identified, not reversed.
ADAPTABLE JOINTS: Cost-flow method — default FIFO (most commonly
adopted in US SMB practice; approximates physical flow). Weighted-
average equally permitted and more IFRS-portable; LIFO permitted
but carries LIFO conformity and disclosure obligations; customer-
adaptable. NRV — default assessed by item or logical group each
reporting date; customer-adaptable.
CITATIONS: ASC 330-10-35-1B [GVC]; 330-10-30-9 [GVC]; 330-10-50.
IFRS NOTE: IAS 2 PROHIBITS LIFO and PERMITS NRV reversal —
substantive divergence; IFRS spine must differ.
---
## 3. LIGHT MANUFACTURING COST ACCOUNTING
Topic: light_manufacturing_cost_accounting | compositionOutcome: extendsFrameworkDefault | displacementLineage: null
CONFORMANT SPINE: Manufactured inventory cost includes direct
materials, direct labor, and systematic allocation of fixed and
variable production overhead under ASC 330-10-30. Fixed overhead
allocated on normal capacity; unallocated overhead from abnormally
low production expensed as incurred. Fixed overhead per unit is
not reduced below normal-capacity rates in periods of abnormally
high production (ASC 330-10-30-7). Standard cost permitted (ASC
330-10-30-12) where it approximates actual.
ADAPTABLE JOINTS: Overhead base — default normal capacity,
consistent driver; customer-adaptable. Variance — default
significant variances allocated between inventory and COGS,
immaterial expensed, entity defines materiality, reviewed
annually; customer-adaptable. Costing system — default actual or
standard where standard approximates actual; customer-adaptable.
CITATIONS: ASC 330-10-30; 330-10-30-7; 330-10-30-12.
IFRS NOTE: IAS 2 normal-capacity treatment substantially aligned.
---
## 4. DISTRIBUTOR INVENTORY AND FREIGHT
Topic: distributor_inventory_and_freight | compositionOutcome: extendsFrameworkDefault | displacementLineage: null
CONFORMANT SPINE: Purchased inventory recorded at cost including
freight-in and other costs to bring inventory to present location
and condition (ASC 330-10-30; 330-10-30-9). Freight-out is a
fulfillment cost, not inventory cost. In-transit inventory
recognized per shipping terms (FOB origin: buyer at shipment; FOB
destination: at receipt). Inventory at LCNRV.
ADAPTABLE JOINTS: Freight-in — default capitalized into inventory
cost, reasonable systematic allocation (per-unit/pound/dollar);
expensing only where clearly immaterial under a documented
materiality policy; customer-adaptable. Freight-out — default
fulfillment/selling cost; ASC 606-10-25-18B shipping-and-handling
expedient available where activities occur after control transfers;
customer-adaptable. Shipping terms — default per FOB; customer-
adaptable.
CITATIONS: ASC 330-10-30; 330-10-30-9 [GVC]; 606-10-25-18B.
IFRS NOTE: IAS 2 cost definition substantially aligned.
---
## 5. HOLDING COMPANY INTERCOMPANY ELIMINATIONS
Topic: holding_company_intercompany_eliminations | compositionOutcome: extendsFrameworkDefault | displacementLineage: null
CONFORMANT SPINE: In consolidated statements, intercompany
balances, transactions, and unrealized intercompany profit are
eliminated in full (ASC 810-10-45). ASC 810 has two models —
voting interest (general) and VIE (entities lacking substantive
equity at risk or where equity holders lack typical controlling
characteristics). Unrealized intercompany profit deferred until
realized externally. Less-than-controlling interests with
significant influence (typically 20-50%) follow the equity method
(ASC 323) — outside this treatment.
ADAPTABLE JOINTS: Consolidation/VIE — default consolidate where a
controlling financial interest exists; SMB operating-co/property-
holding-co splits often trigger VIE analysis; customer must affirm
whether VIE analysis performed for each potentially-consolidated
entity; customer-adaptable. Private-company VIE exemption — default
available; private companies may elect ASU 2018-17 /
ASC 810-10-15-17AD alternative to not consolidate common-control
VIEs meeting criteria; by class; requires disclosure [GVC];
customer-adaptable. Unrealized profit — default full elimination
until realized externally; customer-adaptable.
CITATIONS: ASC 810-10-45; 810-10-15; 810-10-15-17AD / ASU 2018-17
[GVC]; ASC 323 (sibling).
IFRS NOTE: IFRS 10 control model differs from ASC 810 — substantive
divergence; IFRS spine must differ.
---
## 6. SMB PAYROLL AND BENEFITS ACCRUALS
Topic: smb_payroll_and_benefits_accruals | compositionOutcome: extendsFrameworkDefault | displacementLineage: null
CONFORMANT SPINE: Compensation cost recognized in the period the
employee renders service. Accrued payroll, employer-side payroll
taxes (FICA, FUTA, SUTA — accrued with related wages), and benefits
recognized as liabilities for services rendered but unpaid at
period end. Compensated absences accrued when attributable to
services rendered, vested or accumulated, probable, and estimable
(ASC 710-10-25). Stock-based compensation (ASC 718) outside this
treatment — sibling.
ADAPTABLE JOINTS: Payroll tax — default accrued with related wages;
customer-adaptable. Compensated absences — default accrued for
vested/accumulating PTO meeting 710-10-25; sabbaticals/non-vesting
assessed separately; customer-adaptable. Bonus — default accrued
when probable and estimable; ratable through service period where
probable and reasonably estimable at each interim; discretionary or
wholly contingent bonuses accrued only when criteria met, which may
be late in period; customer-adaptable. Self-insured health — default
where entity self-insures, an IBNR-style reserve for incurred-but-
not-reported claims accrued; document estimation basis; customer-
adaptable (advised-override where material).
CITATIONS: ASC 710-10-25; 710; 718 (sibling).
IFRS NOTE: IAS 19 short-term benefits substantially aligned.
---
## 7. SMB FIXED ASSET CATEGORIES
Topic: smb_fixed_asset_categories | compositionOutcome: extendsFrameworkDefault | displacementLineage: null
CONFORMANT SPINE: PP&E recognized at historical cost and
depreciated over estimated useful life under ASC 360-10-30/35.
Tested for impairment when indicators present (ASC 360-10-35-21).
Under us_gaap PP&E carried at cost less accumulated depreciation;
revaluation model NOT permitted. Disposals: gain/loss on
derecognition (ASC 360-10-40). Held-for-sale per ASC 360-10-45-9.
ADAPTABLE JOINTS: Useful lives — default per entity's documented
depreciation policy by asset category; customer-adaptable.
Depreciation method — default straight-line unless usage-based
better reflects consumption; customer-adaptable. Componentization —
default not componentized unless entity policy or materiality
requires; customer-adaptable.
CITATIONS: ASC 360-10-30; 360-10-35; 360-10-35-21 [GVC]; 360-10-40;
360-10-45-9.
IFRS NOTE: IAS 16 PERMITS revaluation and REQUIRES component
depreciation — substantive divergence; IFRS spine must differ.
---
## 8. SMB PREPAID AND ACCRUAL CONVENTIONS
Topic: smb_prepaid_and_accrual_conventions | compositionOutcome: extendsFrameworkDefault | displacementLineage: null
CONFORMANT SPINE: Under accrual accounting, expenses recognized
when incurred and revenues when earned, irrespective of cash
timing. Costs recognized in periods the related benefits are
realized, consistent with the FASB Conceptual Framework's expense
recognition principles. "Matching" is a useful operating concept
but is not itself an authoritative standard. Prepaid expenses
recorded as assets and expensed as benefit consumed; accrued
liabilities recognized for costs incurred but unpaid. Contract-
related deferred costs follow ASC 340-40.
ADAPTABLE JOINTS: Prepaid threshold — default capitalized above a
stated materiality threshold documented in entity policies, below
expensed; customer-adaptable. Accrual estimation — default
estimated from known obligations and historical patterns at each
close; customer-adaptable. Contract costs — default ASC 340-40
acquisition/fulfillment costs capitalized where criteria met; many
SMBs expense immaterial amounts; customer-adaptable.
CITATIONS: FASB Conceptual Framework; ASC 340-10; ASC 340-40 [GVC].
IFRS NOTE: Accrual/prepaid conventions substantially aligned.
---
## 9. BASIC SMB DEFERRED REVENUE
Topic: basic_smb_deferred_revenue | compositionOutcome: extendsFrameworkDefault | displacementLineage: null
CONFORMANT SPINE: Consideration received or due before the
performance obligation is satisfied is a contract liability
(deferred revenue) under ASC 606-10-45-1/45-2. Revenue recognized
as the obligation is satisfied. Refund liabilities (ASC 606-10-32-26
through 32-30) are a separate liability from deferred revenue,
recognized where the customer has a refund right. A significant
financing component (ASC 606-10-32-15 through 32-20) may require
imputed interest for arrangements with a financing element over 12
months.
ADAPTABLE JOINTS: Recognition pattern — default ratable over
service period for stand-ready/subscription, at point of
satisfaction for discrete; customer-adaptable. Current/non-current
split — default for annual subscription/multi-period prepaid the
contract liability bifurcated current (satisfaction within 12
months) vs non-current, refreshed each period; customer-adaptable.
Refund liabilities — default recognized separately where refund
rights exist; customer-adaptable. Financing component — default not
imputed unless arrangement exceeds 12 months and financing element
significant; customer-adaptable.
CITATIONS: ASC 606-10-45-1/45-2; 32-26 through 32-30; 32-15 through
32-20.
IFRS NOTE: IFRS 15 contract-liability treatment substantially
converged.
---
## 10. SMB LEASE CLASSIFICATION
Topic: smb_lease_classification | compositionOutcome: extendsFrameworkDefault | displacementLineage: null
NOTE: This treatment is a SPECIFICATION of the ASC 842 classification
and recognition model. The actual finance-vs-operating determination
and ROU/liability calculation is execution-layer (roadmap item), not
performed in this metadata treatment.
CONFORMANT SPINE: Lessees recognize a right-of-use asset and a lease
liability for leases over 12 months under ASC 842. Classification
(finance vs operating) determined per ASC 842-10-25-2 criteria: (a)
ownership transfers by end of term; (b) reasonably certain purchase
option; (c) lease term is major part of remaining economic life; (d)
PV of payments substantially all of fair value; (e) asset so
specialized it has no alternative use to the lessor. If any criterion
met -> finance; otherwise -> operating. Both on-balance-sheet;
expense recognition differs (finance: front-loaded interest +
amortization; operating: single straight-line cost). The lease
liability is the present value of lease payments at the discount
rate; the ROU asset is the liability plus initial direct costs and
prepayments, less incentives. Lessor accounting (ASC 842-30) and
sale-leaseback (ASC 842-40) outside this treatment — sibling/flag.
ADAPTABLE JOINTS: Classification — default per 842-10-25-2 criteria,
operating unless a finance criterion met; customer-adaptable. Short-
term exemption — default available; customer elects by asset class
with documented rationale (customer choice); customer-adaptable.
Discount rate — default rate implicit where determinable, else
incremental borrowing rate; risk-free-rate expedient available to
private companies by class; customer-adaptable. Modifications —
default lease modifications (ASC 842-10-25-8 through 25-12) assessed
as separate contract or remeasurement per criteria; customer-
adaptable.
CITATIONS: ASC 842-10-25-2; 842-20; 842-10-25-8 through 25-12;
842-30 (sibling); 842-40 (sibling) [GVC].
IFRS NOTE: IFRS 16 has NO operating/finance distinction for lessees
— single on-balance-sheet model. Substantive divergence; IFRS spine
must differ materially.
---
## 11. AR ALLOWANCE / CECL
Topic: generic_smb_ar_allowance_cecl | Generalist-adequate |
compositionOutcome: extendsFrameworkDefault | displacementLineage: null
CONFORMANT SPINE: Trade receivables not measured at fair value
through net income are subject to ASC 326-20 expected credit loss
measurement. The allowance for credit losses reflects expected
credit losses over the contractual life of receivables, estimated
using historical experience, current conditions, and reasonable
and supportable forecasts when available. For entities without
sufficient relevant loss history, a transitional starting-point
methodology may apply until entity-calibrated estimates are
attested.
NON-ADAPTABLE SPINE (verbatim): This starting-point matrix is a
generic, non-calibrated placeholder intended only for entities
that do not yet have 24+ months of relevant loss history. The
matrix steps progressively (0% / 10% / 25% / 50% / 75% / 100%)
to reflect the general pattern that recoverability declines as
receivables age past standard payment terms, with full reserve at
12 months past due. The specific percentages are not calibrated
to any particular industry, customer base, or credit policy, and
are not intended to be retained as the entity's ongoing allowance
methodology. ASC 326-20-30-7 requires the allowance to reflect
the entity's own historical credit loss experience adjusted for
current conditions and reasonable and supportable forecasts; this
matrix is a transitional estimate only and must be replaced with
an entity-calibrated approach within 24 months of initial
attestation.
ADAPTABLE JOINTS:
- Aging-matrix default (starting-point placeholder):
  0-90 days: 0%
  91-120 days: 10%
  121-150 days: 25%
  151-180 days: 50%
  181-360 days: 75%
  360+ days: 100%
- Current-bucket flag: 0-90 = 0% retained. CECL expects
  consideration of some expected loss even on current
  receivables; 0% is a customer calibration decision, not a CECL
  conclusion.
- Estimation method: aging-matrix placeholder default for
  no_relevant_history determination outcome; entity-calibrated
  historical experience when sufficient.
APPLICABILITY GUARD (metadata declaration only):
  blockedIndustries: ["healthcare_provider"]
  blockReason: Patient service revenue receivables are measured
    under ASC 606 implicit price concession methodology (42M
    Treatments 1 and 3), not ASC 326-20 CECL.
  overrideAllowed: false
  bypassRequiresEngineering: true
  nonPatientPoolException:
    allowed: true
    poolLevelOnly: true
    requiresAttestation:
      poolName: string
      nonPatientCharacterization: string
      authoritativeBasis: string
      attestor: LIB-2 shape
      specialistReviewerOfRecord: LIB-2 shape, REQUIRED
EXECUTION CONSTRAINTS (metadata declaration only; future execution
layer reads this; no Phase 42 execution behavior implemented):
  forcedRecalibration:
    appliesWhen: determinationOutcome == 'no_relevant_history'
    thresholdMonths: 24
    warningSchedule: [18, 21, 23]
    blockBehavior: refuse_period_close
    resolutionPaths: [history_sufficient_transition,
      no_history_reattestation, treatment_unbind,
      support_grace_extension]
    gracePeriodDays: 60
    gracePeriodRenewable: false
SETTING NOTES: Generic SMB trade receivables; healthcare provider
patient-service receivables blocked per applicabilityGuard.
CITATIONS: ASC 326-20; ASC 326-20-30-7 [GVC-1].
---
## 12. AP CUTOFF AND EXPENSE RECOGNITION
Topic: ap_cutoff_and_expense_recognition | compositionOutcome: extendsFrameworkDefault | displacementLineage: null
NOTE: The vendor-miss detection and controller-alert capability is
execution-layer (roadmap item). This metadata treatment defines the
cutoff accounting baseline it implements against.
CONFORMANT SPINE: Expenses are recognized in the period in which
they are incurred (goods/services received), regardless of when the
vendor invoice is entered or paid. At period end, liabilities are
accrued for goods and services received but not yet invoiced or
entered (cutoff). An invoice dated in one period but entered in a
subsequent period does not change the period in which the expense
is properly recognized — the expense belongs to the period the
goods/services were received. Proper cutoff requires accruing such
items in the correct period.
ADAPTABLE JOINTS: Accrual cutoff — default at each period close,
accrue for received-but-unentered goods/services based on receiving
records and known obligations; customer-adaptable. Materiality
threshold — default cutoff accruals applied above a documented
materiality threshold; customer-adaptable.
EXECUTION SPEC (roadmap): a monitoring capability should detect
invoices whose invoice date precedes their entry period, track
recurring missed vendors, and alert the controller with the reason
— human review, not auto-posting.
CITATIONS: FASB Conceptual Framework (expense recognition); ASC 405.
IFRS NOTE: Accrual/cutoff principles substantially aligned.
