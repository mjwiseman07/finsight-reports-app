# ADVISACOR — HEALTHCARE INDUSTRY TREATMENT LIBRARY (42M)
## Generic Baseline Treatments — Recommended / In-Review
### US GAAP | For-Profit Healthcare | Conformant Spine + Customer-Adaptable Joints
OPERATING MODEL: Advisacor treatments are always recommended
baselines in review on Advisacor's side — never "final." The
customer's controller reviews the recommended default, adapts it
to their facts, and locks it in through implementation at the
customer ID. The customer takes responsibility for the model they
sign off on. Every treatment is in_review / recommended on
Advisacor's side; this is the correct permanent state.
## LIMITATION OF USE (LIB-1)
This library is a recommendation for human review, not
professional accounting services. Wiseman Financial Technologies,
LLC does not render accounting opinions, audit, tax, or 340B
compliance services. The customer's controller, CPA, specialist,
or compliance officer is responsible for treatment selection,
adaptation, attestation, and audit defense. The library reflects
ASC 606 and related US GAAP as of [DATE]; subsequent amendments
may not be reflected, and the customer is responsible for
re-attestation when standards change. The library is not
customized to any entity's facts; customer adaptation and
attestation is required before any treatment is relied upon.
## THREE-TIER GOVERNANCE MODEL (LIB-5)
Conformant tier: customer accepts default; composes with customer
default-acceptance attestation. Advised-override tier: customer
adapts default; composes only after customer attestation +
Advisacor review. Fraud-block tier: customer attempts an
adaptation conflicting with an ASC requirement or routing outside
permitted scope; fails closed.
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
## PHI INTERACTION (LIB-8)
Treatments are PHI-free by design. Execution outputs that consume
PHI-tagged source data inherit phiDerivationStatus per 42H. The
treatment definitions do not themselves carry PHI.
## VERIFICATION CHECKLIST (must close before customer reliance)
- VC-1: ASC 954-310 exact paragraph (Treatments 1, 3)
- VC-2: ASC 954-440 vs 954-450 for capitation (Treatment 6)
- VC-3: ASC 450-20-30 discounting + insurance-recovery (Treatment 9)
- VC-4: ASC 350-30 CON life-classification (Treatment 10)
- VC-5: 340B replenishment-model vs audit experience (Treatment 8)
- VC-6: Treatment 4 boundary default removed — confirmed
- VC-7: ASC 606-10-32-10 downside-risk basis (Treatment 7)
- VC-8: ASC 606-10-25-14(b)/25-15 series basis (Treatment 6)
- VC-9: Treatment 8 external 340B reviewer retained
- VC-10: BIZ items (E&O insurance, master-agreement language)
---
## 1. NET PATIENT SERVICE REVENUE RECOGNITION
Topic: net_patient_service_revenue | Specialist-gated |
compositionOutcome: extendsFrameworkDefault | displacementLineage: null
CONFORMANT SPINE: Net patient service revenue is recognized under
ASC 606's five-step model, in the amount the entity expects to be
entitled to — the transaction price — not at gross chargemaster
amounts (ASC 606-10-10-1; 606-10-32-2). The contract with the
customer is the provider-patient arrangement; third-party payor
arrangements are not contracts with customers but affect the
transaction price (ASC 606-10-32). Both contractual allowances and
implicit price concessions are variable consideration reducing the
transaction price at recognition; neither is a separate expense
(ASC 606-10-32-5 through 32-7). Variable consideration is included
only to the extent significant reversal is improbable — the
constraint (ASC 606-10-32-11 through 32-13) — re-estimated each
reporting date (ASC 606-10-32-14). Charity care does not qualify
for revenue recognition (ASC 954-605-25-10). Patient receivables
are presented net of estimated implicit price concession (ASC
954-310 — VC-1 verify paragraph). Three-way boundary: charity care
(T5) is determined before or at the encounter under bona fide
policy; subsequent inability to collect is not retroactive charity
care. The boundary among charity care (T5), implicit price
concession (T3), and bad debt/credit loss (T4) must be applied at
recognition, not retrospectively.
ADAPTABLE JOINTS (simplest conservative default; customer-adaptable):
- IPC vs bad-debt boundary (Option A evidence-required): When
  credit-assessment status is unknown or undocumented, treat
  uncollected amounts as implicit price concession only when
  supported by historical collection data for the relevant
  portfolio. Absent supporting data, default is to record at gross
  less explicit concessions and recognize subsequent
  uncollectibility as credit loss.
- Estimation/portfolio: expected-value method, historical
  collection data stratified by payor class + service line;
  constraint applied at portfolio level; portfolio data used for
  estimates without formally electing the ASC 606-10-10-4 expedient.
- Performance obligation: single PO per encounter.
- Timing: inpatient/over-time over the stay; outpatient/physician
  point-in-time (ASC 606-10-25-23 through 25-37).
SETTING NOTES: Acute-care: defaults as written. ASC: procedure-
level point-in-time. SNF: each day may be a separate PO (per-diem).
Physician practice: point-in-time. Home health/hospice: per-episode.
CITATIONS: ASC 606-10-10-1; 32-2; 32-5 through 32-14; 25-23 through
25-37; ASC 954-605-25-10; ASC 954-310 [VC-1]; ASU 2014-09 BC194;
AICPA Rev Rec Guide Ch.7; HFMA Statement 15 (June 2019).
---
## 2. CONTRACTUAL ALLOWANCE RESERVES
Topic: contractual_allowance_reserves | Specialist-gated |
compositionOutcome: extendsFrameworkDefault | displacementLineage: null
CONFORMANT SPINE: Contractual allowances — the difference between
gross charges and rates expected from third-party payors — are
explicit price concessions and variable consideration under ASC
606-10-32-5 through 32-7. They reduce transaction price and revenue
at recognition; not bad debt or credit loss. Re-estimated each
reporting date (ASC 606-10-32-14). The payor arrangement is not
itself a contract with a customer; it affects the patient
contract's transaction price.
ADAPTABLE JOINTS:
- Estimation basis (layered): contracted/expected rates as the
  starting transaction price by payor class, with historical
  realized-rate adjustments layered on for denials, takebacks, and
  retroactive adjustments.
- True-up frequency: re-estimated each reporting date.
GOVERNMENT PROGRAM SETTLEMENTS (absorbed): Medicare/Medicaid
cost-report settlements are variable consideration in the patient
contract, estimated under the constraint (ASC 606-10-32-11) with
multi-year settlement windows. Default: estimate using the
constraint; re-open prior estimates as settlements finalize.
Material for acute-care hospitals.
SETTING NOTES: Application identical across settings; payor mix
drives materiality.
CITATIONS: ASC 606-10-32-5 through 32-14; AICPA Rev Rec Guide Ch.7.
---
## 3. IMPLICIT PRICE CONCESSIONS
Topic: implicit_price_concessions | Specialist-gated |
compositionOutcome: extendsFrameworkDefault | displacementLineage: null
CONFORMANT SPINE: An implicit price concession arises when the
entity's customary practices indicate it will accept less than the
stated price (ASC 606-10-32-7). It is variable consideration
reducing transaction price and revenue at recognition — not bad
debt. Estimated using the expected-value method, which is the
default because portfolio characteristics (large number of similar
contracts) make it most predictive under ASC 606-10-32-8; the
most-likely-amount method is permitted only for binary outcomes.
Subject to the constraint (ASC 606-10-32-11), re-estimated each
period (ASC 606-10-32-14). Receivables presented net of the
concession (ASC 954-310 — VC-1 verify paragraph).
ADAPTABLE JOINTS:
- Estimation basis (Option A aligned): IPC recognized only when
  supported by historical collection data for the relevant
  portfolio; absent supporting data, no IPC presumed and
  uncollectibility routes to credit loss.
- Subsequent changes: changes require documented attribution to
  either (a) new information about the original estimate (revenue
  adjustment, ASC 606-10-32-14) or (b) post-recognition credit
  deterioration (credit loss, ASC 326-20). Undocumented changes
  default to credit-loss treatment as the more conservative
  presentation.
SELF-PAY DISCOUNT PROGRAMS — IMPLICIT (absorbed): Customary-
practice self-pay concessions (not a published policy) are
implicit price concessions under this treatment. Policy-based
explicit self-pay discounts are addressed in Treatment 2.
SETTING NOTES: Most significant for self-pay/uninsured.
CITATIONS: ASC 606-10-32-7, 32-8, 32-11, 32-14; ASC 326-20; ASC
954-310 [VC-1]; ASU 2014-09 BC194.
---
## 4. DENIAL RESERVES / BAD-DEBT vs CREDIT-LOSS BOUNDARY
Topic: denial_reserves_and_credit_loss_boundary | Specialist-gated |
ALWAYS ADVISED-OVERRIDE — NO CONFORMANT DEFAULT |
compositionOutcome: extendsFrameworkDefault | displacementLineage: null
CONFORMANT SPINE (considerations only — no default placement):
This treatment has the highest liability exposure and provides no
default boundary placement. Amounts uncollected due to implicit
price concession reduce revenue (ASC 606); amounts uncollected
after the entity assessed the patient as able and willing to pay,
with a post-assessment credit event, are credit losses (ASC
326-20), presented as operating expense — not a revenue deduction.
ASC 606 provides no bright-line (ASU 2014-09 BC194); facts-and-
circumstances judgment. Payor denials representing contractual
non-payment are variable consideration, not bad debt.
REQUIRED CUSTOMER CONFIGURATION: The customer must affirmatively
configure a boundary_policy field with attestation before this
treatment composes. The composition engine fails closed if this
treatment attempts to compose without a customer-populated
boundary_policy + attestation. There is no default.
DENIAL SUB-TYPES: Contractual denials (variable consideration);
authorization/medical-necessity denials (variable consideration
with appeal-success probability); technical denials (provider
write-off). Customer adaptation may warrant different estimation
by sub-type.
GOVERNANCE: Always advised-override; never conformant; fails closed
without customer boundary_policy.
CITATIONS: ASC 606-10-32-7; ASC 326-20; ASU 2014-09 BC194; HFMA
Statement 15 (June 2019).
---
## 5. CHARITY CARE & COMMUNITY BENEFIT
Topic: charity_care_and_community_benefit | Specialist-gated |
For-profit only | compositionOutcome: extendsFrameworkDefault |
displacementLineage: null
CONFORMANT SPINE: Charity care does not qualify for revenue
recognition — no revenue recorded for services under a bona fide
charity policy with no expectation of collection (ASC 954-605-25-10,
survived ASU 2014-09). Distinct from implicit price concessions and
bad debt. Disclosure of the charity policy and estimated cost of
charity care is required (ASC 954-605-50-3). For-profit only; a
501(c)(3) or ASC 958 entity is NFP and out of scope (fails NFP
boundary test).
ADAPTABLE JOINTS:
- Cost-of-charity-care basis: cost-to-charge ratio applied to
  charity charges.
- Community benefit presentation: no community-benefit presentation
  by default. Community benefit reporting is a 501(c)(3) Schedule H
  concept and not GAAP-required for for-profit entities. Voluntary
  uncompensated-care disclosure is customer-elected, not default.
SETTING NOTES: For-profit settings; NFP fund accounting excluded.
CITATIONS: ASC 954-605-25-10; ASC 954-605-50-3.
---
## 6. CAPITATION REVENUE
Topic: capitation_revenue | Specialist-gated |
compositionOutcome: extendsFrameworkDefault | displacementLineage: null
CONFORMANT SPINE: Under capitation, the provider receives a fixed
PMPM amount to stand ready to provide covered services. Treated as
a stand-ready performance obligation that is a series of distinct
services under ASC 606-10-25-14(b) and 25-15, recognized ratably
over the coverage period (VC-8 verify series basis). Amounts
subject to retroactive adjustment are variable consideration under
the constraint (ASC 606-10-32-11). Loss-contract provisions may
apply where the arrangement is expected to be unprofitable — ASC
954-440 may be CCRC-specific; if so, fall back to ASC 450 for
general loss-contract provisions (VC-2 verify).
ADAPTABLE JOINTS:
- Recognition pattern: ratable over the coverage period.
- Retroactive adjustments: estimated as variable consideration
  under the constraint.
SETTING NOTES: Most relevant to managed-care/at-risk providers.
CITATIONS: ASC 606-10-25-14(b), 25-15 [VC-8]; 32-11; ASC
954-440/954-450 or ASC 450 [VC-2]; HFMA capitation issue analysis.
---
## 7. RISK-SHARING / VALUE-BASED CARE (PROVIDER-SIDE)
Topic: risk_sharing_value_based_care | Specialist-gated |
Provider-side only | compositionOutcome: extendsFrameworkDefault |
displacementLineage: null
CONFORMANT SPINE: Provider-side risk-sharing (ACO shared savings,
value-based incentive/downside-risk corridors) generates variable
consideration contingent on quality, cost, or outcome metrics —
recognized only to the extent significant reversal is improbable
(constraint, ASC 606-10-32-11 through 32-13), re-estimated each
period (ASC 606-10-32-14). Entities operating as regulated insurers
(DSNP, insurance subsidiaries) are out of scope and route to the
insurance industry — provider-side only.
ADAPTABLE JOINTS:
- Shared-savings/incentive timing (conservative): no recognition
  until the measurement period closes AND the settlement amount is
  contractually confirmed in writing by the counterparty. More
  conservative than ASC 606-10-32-11 requires; customers adapting
  to earlier recognition take ownership of that adaptation.
- Downside-risk/corridor liabilities: default basis is ASC
  606-10-32-10 (consideration payable to a customer reduces
  transaction price); ASC 450 applies only where the obligation
  falls outside ASC 606 scope (VC-7 verify 32-10 basis).
SETTING NOTES: Provider-side only; insurer-side fails closed.
CITATIONS: ASC 606-10-32-10, 32-11 through 32-14 [VC-7]; ASC 450
(out-of-606-scope obligations only); HFMA risk-sharing issue analysis.
---
## 8. 340B DRUG PRICING PROGRAM (ACCOUNTING FOR PARTICIPATION)
Topic: drug_pricing_program_340b | Specialist-gated — DUAL 340B
CREDENTIAL GATE | REVENUE RECOGNITION BLOCKED UNTIL 340B COMPLETE |
compositionOutcome: extendsFrameworkDefault | displacementLineage: null
DISCLAIMER: Wiseman Financial Technologies does not provide 340B
compliance services. This treatment addresses accounting for 340B
participation only; eligibility, drug-by-drug classification,
duplicate-discount-prevention, and HRSA program compliance are the
responsibility of the covered entity's 340B compliance function.
CONFORMANT SPINE: Covers accounting for 340B participation: revenue
on dispensed 340B-acquired drugs, inventory valuation, and
replenishment-model accounting. Excludes eligibility, drug-by-drug
classification, duplicate-discount-prevention, and HRSA compliance.
340B-acquired drug inventory carried at cost under ASC 330; revenue
on dispensed drugs follows ASC 606; the 340B discount is reflected
in inventory cost, not as separate revenue. (VC-5: verify against
340B audit experience.)
DUAL CREDENTIAL GATE: Treatment 8 composes active only with BOTH
(a) an external 340B-credentialed reviewer attestation on
Advisacor's side, AND (b) the customer's own 340B-credentialed
reviewer attestation. Founder credential alone is insufficient.
(VC-9: external reviewer not yet retained.)
REVENUE RECOGNITION GATE: Advisacor will not recognize revenue
involving 340B for a customer until the 340B section is completed
(both reviews). Until complete, 340B revenue recognition is blocked.
CUSTOMER ATTESTATION: "Customer attests that its 340B accounting
reflects its compliance program's actual replenishment mechanics
and HRSA program requirements; Advisacor's treatment does not
validate the underlying compliance."
ADAPTABLE JOINTS:
- Replenishment-model inventory: 340B-acquired inventory at actual
  340B acquisition cost under ASC 330; replenishment recognized as
  inventory is dispensed and replaced. Default assumes in-house
  dispensing.
- Revenue on 340B dispensing: standard ASC 606 pharmacy/patient
  revenue; 340B savings accrue through reduced cost of goods, not
  separate revenue.
- Contract pharmacy: contract pharmacy arrangements have different
  revenue/cost mechanics than in-house dispensing. Default assumes
  in-house; customers with contract pharmacy must adapt with
  documented mechanics.
SETTING NOTES: Covered entities participating in 340B; compliance/
eligibility excluded.
CITATIONS: ASC 330; ASC 606; HRSA program-integrity guidance (by
reference, compliance context only).
---
## 9. MEDICAL MALPRACTICE ACCRUALS
Topic: medical_malpractice_accruals | Specialist-gated | Actuarial
input expected | compositionOutcome: extendsFrameworkDefault |
displacementLineage: null
CONFORMANT SPINE: Malpractice loss exposure is a loss contingency
under ASC 450, accrued when probable and reasonably estimable (ASC
450-20-25), including reported and IBNR claims. Self-insured
liability recorded gross; insurance recoveries recognized
separately when realization is probable (not netted). Discounting
permitted only when amount and timing are fixed or reliably
determinable (VC-3 verify).
ADAPTABLE JOINTS:
- IBNR estimation: for material exposure, actuarial determination
  is the expected method. Customers without actuarial input must
  document why historical-claims-experience is adequate; this
  adaptation routes to advised-override review before active.
- Discounting: undiscounted by default. Discounting is advised-
  override, not conformant-eligible — rare in practice and high-
  risk if misapplied.
- Tail coverage: tail exposure included in IBNR reserve.
CAPTIVE INSURERS: Where the entity operates a captive insurer, ASC
944 (insurance contracts) may apply to the captive's accounting in
addition to the loss-contingency framework here. Captive
arrangements require separate review.
SETTING NOTES: Most significant for self-insured retention or captives.
CITATIONS: ASC 450-20-25; ASC 450-20-30 [VC-3]; ASC 944 (captives).
---
## 10. HEALTHCARE-SPECIFIC INTANGIBLES
Topic: healthcare_specific_intangibles | Specialist-gated |
compositionOutcome: extendsFrameworkDefault | displacementLineage: null
CONFORMANT SPINE: Healthcare intangibles — certificates of need
(CON), payor contracts, physician/provider contracts — are
accounted for under ASC 350, and ASC 805 when acquired in a
business combination. Finite-lived intangibles amortized over
useful life; indefinite-lived not amortized but tested for
impairment at least annually (ASC 350-30). Acquired intangibles
recognized at fair value at acquisition (ASC 805-20).
ADAPTABLE JOINTS:
- Useful life/indefinite determination: indefinite-life
  classification for CON requires entity-specific assessment of
  renewal expectation and renewal cost; not all states' CON regimes
  support indefinite classification. Default presumption is
  indefinite where the state regime supports renewal without
  substantial cost; customer must affirm state-specific
  applicability. Payor and physician contracts amortized over
  contractual/expected term. (VC-4.)
- Impairment approach: ASC 350-30 annual test for indefinite-lived;
  trigger-based for finite-lived. Common healthcare triggers:
  physician departure/retirement (physician-contract intangibles),
  payor contract termination or material rate change (payor-contract
  intangibles), CON challenge or regulatory change (CON intangibles).
SETTING NOTES: CON relevance varies by state regulatory regime.
CITATIONS: ASC 350-30 [VC-4]; ASC 805-20.
---
## 11. HEALTHCARE-SPECIFIC FIXED ASSETS
Topic: healthcare_specific_fixed_assets | GENERALIST-ADEQUATE
(specialist review opted out with justification) |
compositionOutcome: extendsFrameworkDefault | displacementLineage: null
SPECIALIST OPT-OUT: justification: "Standard ASC 360 PP&E
accounting; healthcare specificity limited to useful-life
conventions which are entity policy, not specialized standard
interpretation"; reviewSampleEligible: true.
CONFORMANT SPINE: Healthcare fixed assets — medical equipment,
building improvements, imaging/diagnostic equipment — accounted for
under ASC 360. Recognized at cost, depreciated over estimated
useful life, tested for impairment when indicators present (ASC
360-10-35). Standard PP&E accounting; healthcare specificity is in
useful-life conventions, not a different framework.
ADAPTABLE JOINTS:
- Useful lives: per the entity's documented depreciation policy.
- Componentization: not componentized unless entity policy requires.
SETTING NOTES: Application identical across settings; equipment mix differs.
CITATIONS: ASC 360-10; ASC 360-10-35.
---
## 12. HEALTHCARE-SPECIFIC LEASE CONSIDERATIONS
Topic: healthcare_specific_lease_considerations | GENERALIST-
ADEQUATE (specialist review opted out with justification) |
compositionOutcome: extendsFrameworkDefault (framework default =
Phase 41.5 lease treatment) | displacementLineage: null
SPECIALIST OPT-OUT: justification: "Consumes Phase 41.5 framework
ASC 842 lease treatment; healthcare content limited to application
notes, not specialized standard interpretation";
reviewSampleEligible: true.
CONFORMANT SPINE: Healthcare leases — medical office buildings,
equipment, ground leases — accounted for under ASC 842. This is an
industry application note on top of the Phase 41.5 framework lease
treatment, not a separate framework. Classification, ROU asset, and
lease liability recognition follow ASC 842 as in the framework
treatment.
ADAPTABLE JOINTS:
- Usage-based/variable components: variable payments not based on an
  index/rate expensed as incurred (ASC 842).
- Embedded leases in service arrangements: assessed per ASC 842
  embedded-lease guidance; flagged for customer review where service
  contracts contain equipment.
SETTING NOTES: Medical office buildings and equipment leases are the
common types; framework treatment governs.
CITATIONS: ASC 842 — primarily via the Phase 41.5 framework lease
treatment, with healthcare application notes only.
