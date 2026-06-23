# Manufacturing ASC 606 Revenue Recognition — Authoritative Sources Reference

**DRAFT / SPEC — NOT EXECUTABLE — NOT LOCKED**

`executable: false`
`containsVerticalComplianceLogic: true`

**Document Title:** Manufacturing ASC 606 Revenue Recognition Source Document — Advisacor Manufacturing Vertical Knowledge Stack, Module MFG-K-B
**Date Generated:** June 22, 2026
**Version:** 1.0 (DRAFT)
**Scope:** US manufacturers reporting under U.S. GAAP (ASC 606, *Revenue from Contracts with Customers*) and, where elected at the tenant level, IFRS (IFRS 15). Five sub-segments — Discrete (D), Process (P), Hybrid/Mixed-Mode (H), Job-Shop/Project (J), Engineer-to-Order/ETO (E). Production-strategy axis (MTS / MTO / ATO / ETO) carried throughout because it drives point-in-time vs. over-time recognition. NAICS sectors 31–33.
**Prepared for:** Advisacor — Wiseman Financial Technologies LLC (Matthew Wiseman, founder)
**Output Classification:** `recommendation_for_human_review`
**Citation Discipline:** Every authoritative claim cites a **primary source**. The canonical citation for the standard is the FASB Accounting Standards Codification, Topic 606, accessed via the Deloitte Accounting Research Tool (DART) at [dart.deloitte.com — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606). Supplemental authority: FASB direct ([fasb.org](https://www.fasb.org)); SEC interpretive guidance (SAB Topic 13 successor releases, the SEC bill-and-hold release) for public-filer concerns; ASC 340-40 (contract costs) and ASC 460 (guarantees/warranties) via DART; SEC Regulation S-K Item 303 via eCFR. Big-Four and national-firm manufacturing/industrial application guides (KPMG, EY, Grant Thornton, Deloitte, RSM US, PwC, BDO) are treated as **primary for interpretation** of how the Codification applies to manufacturing. IFRS 15 is cited from the IFRS Foundation. Definitions and treatments that turn on facts-and-circumstances judgment are flagged **[JUDGMENT AREA]**.
**IFRS 15 cross-reference posture (resolved Q5):** IFRS 15 receives equal-depth treatment. The five-step model is converged with ASC 606; manufacturing-relevant divergences are flagged where material (Section 13 is the consolidated divergence section, and divergences are also flagged inline within the affected step).

This document is the manufacturing-vertical analog of `ASC606_Healthcare_Sources.md` and is governed by `MANUFACTURING_VERTICAL_PLANNING_DOCUMENT.md`. Its upstream sibling is `Manufacturing_KPIs_Sources.md` (Module MFG-K-A); terminology, sub-segment keys, and citation style are kept consistent with that document. Revenue recognition timing (point-in-time vs. over-time) interacts directly with the Manufacturing Variances panel only indirectly — through gross-margin and cost-absorption effects — but the recognition basis is a per-tenant configuration that the knowledge stack must render correctly under either U.S. GAAP or IFRS.

---

## How to Read This Document

The document follows the **five-step model of ASC 606 in order** (Sections 1–5), then layers manufacturing-specific application topics (Sections 6–10), disclosure (Section 11), practical expedients (Section 12), the consolidated IFRS 15 divergence section (Section 13), concrete sub-segment application notes (Section 14), a controller's implementation checklist (Section 15), and the source reference table (Section 16). Section 0 establishes scope.

Each substantive topic carries, where applicable:

1. **The standard** — the operative ASC 606 / ASC 340-40 / ASC 460 paragraph(s), cited to DART.
2. **Manufacturing application** — how the paragraph applies to manufacturing contract patterns, cited to a Big-Four/national-firm industrial guide.
3. **Sub-segment applicability** — an explicit statement (and, where useful, a five-column matrix) of how the topic applies differently across D / P / H / J / E and across the MTS / MTO / ATO / ETO production-strategy axis.
4. **IFRS 15 note** — where IFRS 15 diverges materially.

**Manufacturing Sub-Segment Key:** **D** = Discrete | **P** = Process | **H** = Hybrid / Mixed-Mode | **J** = Job-Shop / Project | **E** = Engineer-to-Order (ETO).
Matrix legend: ✓ = applicable / common; ◑ = partially applicable / fact-dependent; — = not applicable / rare. **No cell is left blank.**

**Production-strategy axis (orthogonal to sub-type):** **MTS** = Make-to-Stock | **MTO** = Make-to-Order | **ATO** = Assemble-to-Order | **ETO** = Engineer-to-Order. This axis is the primary driver of the Step 5 recognition pattern: MTS finished goods almost always transfer at a point in time; ETO custom work frequently transfers over time. Where a topic is sensitive to the strategy axis, the text says so explicitly.

**Dual-basis presentation:** ASC 606 is stated first as the governing U.S. GAAP authority. IFRS 15 treatment is stated inline only where it diverges materially; the full divergence catalogue is consolidated in Section 13. Because IFRS 15 and ASC 606 share the same five-step architecture and converged core principle, the absence of an IFRS note means the treatments are substantively the same.

**Math notation:** inline math uses \( \cdots \); display math uses \[ \cdots \]. The variance sign convention from MFG-K-A is not used here (this document concerns revenue, not cost variances).

---

## Section 0 — Scope and Applicability

**[AUTHORITATIVE STANDARD]**

ASC 606, *Revenue from Contracts with Customers*, is the U.S. GAAP authority governing revenue recognition for substantially all manufacturing contracts. Its core principle (ASC 606-10-10-2) is that an entity recognizes revenue "to depict the transfer of promised goods or services to customers in an amount that reflects the consideration to which the entity expects to be entitled in exchange for those goods or services," as quoted by [RSM US — *Revenue Recognition for Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf). ASC 606 superseded the legacy industry guidance most relevant to manufacturers — ASC 605-35 (*Construction-Type and Production-Type Contracts*) and ASC 605-10-S99 (SAB Topic 13) — meaning every manufacturer must re-evaluate its recognition pattern under the new model regardless of prior practice ([BDO — *Revenue from Contracts with Customers – Manufacturing Industry*](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry)).

**In scope of ASC 606 for manufacturers:**

- Most product sales (standard finished goods, made-to-order goods, assembled-to-order configurations, custom-engineered products).
- Long-term contracts to build or produce customized assets (job-shop and ETO programs).
- Post-shipment and post-installation services that are promised in a contract with a customer (installation, commissioning, training, service-type warranties, maintenance, spare-parts entitlements).
- Tooling, molds, and dies provided to the customer in connection with a supply contract (subject to the unit-of-account analysis in Section 2 and Section 7).

**Out of scope of ASC 606 (governed by other Topics):**

- **Leases** — ASC 842. Manufacturer-as-lessor arrangements (equipment leased rather than sold) and embedded leases in supply contracts fall under ASC 842, not ASC 606. The boundary is addressed in `Manufacturing_Disclosures_Sources.md` (MFG-K-C).
- **Insurance contracts** — ASC 944.
- **Financial instruments and guarantees within ASC 815/ASC 825** — e.g., certain commodity derivatives used to hedge input costs.
- **Nonmonetary exchanges between entities in the same line of business to facilitate sales to customers** — scoped out of ASC 606 (ASC 606-10-15-2).
- **Contributions / certain collaborative arrangements** — collaborative arrangements (ASC 808) are in scope of ASC 606 only when the counterparty is a customer.

**Scope ordering note (contract-cost interaction):** Before applying ASC 340-40 to costs incurred in fulfilling a manufacturing contract, the manufacturer must first determine whether the cost is within the scope of other guidance — ASC 330 (Inventory), ASC 360 (PP&E), ASC 350-40 (internal-use software), ASC 340-10 (pre-production costs / molds, dies, and tools under long-term supply arrangements). Only if no other Topic applies does ASC 340-40 govern ([BDO, *Manufacturing Industry* guide](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry); [RSM, *Industrial Entities* guide](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf)).

**Sub-segment applicability:** ASC 606 applies to all five sub-types and all four production strategies. What varies is *which step is hard*: Step 1 (contract identification) is hardest for J/E (complex change-order-laden contracts); Step 2 (performance obligations) is hardest for H and bundled D sales; Step 5 (timing) is the central judgment for J/E (over-time) versus D-MTS/P-spot (point-in-time).

---

## Section 1 — Step 1: Identify the Contract with a Customer

### 1A. The Five Contract Criteria

**[AUTHORITATIVE STANDARD — ASC 606-10-25-1]**

A contract exists for ASC 606 purposes only when all five criteria are met:

1. **Approval and commitment** — the parties have approved the contract (in writing, orally, or per customary business practices) and are committed to perform.
2. **Identifiable rights** — the entity can identify each party's rights regarding the goods or services to be transferred.
3. **Identifiable payment terms** — the entity can identify the payment terms for the goods or services.
4. **Commercial substance** — the contract has commercial substance (the risk, timing, or amount of the entity's future cash flows is expected to change as a result of the contract).
5. **Collectibility probable** — it is probable that the entity will collect substantially all of the consideration to which it will be entitled in exchange for the goods or services that will be transferred (assessed after reflecting any price concessions the entity intends to offer).

These criteria are cited to [DART — ASC 606, Step 1 (Identify the Contract)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-1-overview/1-4-step-1-identify-contract) and [DART — ASC 606 codification](https://dart.deloitte.com/USDART/home/codification/revenue/asc606). For a U.S. GAAP filer, "probable" means **likely to occur** (a relatively high threshold) per [RSM US — *US GAAP vs IFRS: Revenue from Contracts with Customers*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/us-gaap-vs-ifrs-comparisons/wp_as_us_gaap_vs_ifrs_revenue_recognition.pdf).

**If the criteria are not met:** the arrangement is not yet a contract. Consideration received is recognized as revenue only when (i) the entity has no remaining obligation and substantially all consideration has been received and is nonrefundable, or (ii) the contract has been terminated and consideration received is nonrefundable. Amounts received in the interim are recorded as a liability ([DART — ASC 606 Step 1](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-1-overview/1-4-step-1-identify-contract)).

### 1B. Manufacturing-Specific Contract Patterns

**[INTERPRETIVE — INDUSTRIAL APPLICATION]**

Manufacturing contracts rarely arrive as a single tidy document. The unit "contract" for ASC 606 must be identified from the operative commercial documents:

| Pattern | Description | ASC 606 contract-identification note |
|---|---|---|
| **Purchase order (PO)** | A discrete order placed against a quote or catalog | A standalone PO that the manufacturer accepts (explicitly or per customary practice) is typically the ASC 606 contract. Acceptance can be implicit through customary business practice (criterion 1). |
| **Master service agreement (MSA) / master supply agreement** | A framework agreement that sets terms but not always quantities or firm commitments | The MSA alone may not be the contract if it lacks enforceable quantity/payment commitments; the contract often crystallizes at the PO/release level. Judgment required on whether the MSA + release together meet all five criteria. **[JUDGMENT AREA]** |
| **Blanket PO** | A standing order for a volume over a period, with releases | The enforceable unit may be the blanket commitment (if minimum quantities are enforceable) or each release. Affects Step 2 (series) and disclosure of remaining performance obligations. |
| **Long-term supply contract (LTSA)** | Multi-year obligation to supply parts/components, often with pricing escalators | Frequently meets all five criteria at the contract level; the repeated deliveries are usually analyzed under the series guidance (Section 2C / 5D). |
| **ETO fixed-price contract** | Single price for a designed-and-built asset | Single contract; the central question is Step 5 timing (over-time vs. point-in-time). |
| **ETO / job-shop time-and-materials (T&M)** | Customer pays for hours and materials at agreed rates | Contract exists; transaction price is largely the right-to-invoice amount; the right-to-invoice expedient (Section 12) often applies. |
| **ETO / job-shop cost-plus** | Customer reimburses cost plus a fee/margin | Contract exists; the cost-plus payment mechanism is highly relevant to the Step 5 "enforceable right to payment" analysis (Section 5B). |

Sources: [BDO — *Manufacturing Industry* guide](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry); [Grant Thornton — *Navigating the guidance in ASC 606 and 340-40*](https://www.grantthornton.com/insights/articles/audit/2022/navigating-asc-606-and-340-40); [RSM US — *A guide to revenue recognition*](https://rsmus.com/insights/financial-reporting/a-guide-to-revenue-recognition.html).

### 1C. Contract Combination

**[AUTHORITATIVE STANDARD — ASC 606-10-25-9]**

Two or more contracts entered into at or near the same time with the same customer (or related parties of the customer) are combined and accounted for as a single contract if one or more of the following are met:

- The contracts are negotiated as a package with a single commercial objective;
- The amount of consideration in one contract depends on the price or performance of the other; or
- The goods or services promised (or some of them) are a single performance obligation under the Step 2 analysis.

**Manufacturing application:** A separately documented tooling order and the related production PO, placed together to support one program, frequently must be combined (single commercial objective). Likewise, a "design" contract and a follow-on "build" contract negotiated as a package for one ETO program are candidates for combination. This combination question feeds directly into Step 2 (whether tooling and production are one or multiple performance obligations) and Section 7 (tooling as a separate PO vs. a fulfillment cost).

### 1D. Sub-Segment Applicability — Step 1

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| PO / catalog order is the contract | ✓ | ✓ | ✓ | ◑ | — |
| MSA / blanket PO + release analysis | ✓ | ✓ | ✓ | ◑ | ◑ |
| Long-term supply contract | ◑ | ✓ | ✓ | — | — |
| ETO fixed-price / T&M / cost-plus | — | — | ◑ | ✓ | ✓ |
| Contract combination (tooling + production; design + build) | ✓ | ◑ | ✓ | ✓ | ✓ |
| Collectibility a recurring gating issue | ◑ | ◑ | ◑ | ✓ | ✓ |

Job-shop and ETO contracts carry the heaviest Step 1 burden because they are change-order-laden (Section 6), often combine multiple documents, and have customer-credit exposure on large single contracts. Discrete MTS catalog sales clear Step 1 trivially in most cases.

---

## Section 2 — Step 2: Identify the Performance Obligations

### 2A. The "Distinct" Criteria

**[AUTHORITATIVE STANDARD — ASC 606-10-25-14 through 25-22]**

At contract inception the entity identifies the promised goods and services and determines which are **distinct** performance obligations. A good or service is distinct if **both**:

1. **Capable of being distinct** — the customer can benefit from the good or service on its own or together with other resources readily available to the customer; **and**
2. **Distinct within the context of the contract** — the promise to transfer the good or service is separately identifiable from other promises (i.e., it is not highly interdependent or integrated with, does not significantly modify, and is not significantly customized by, other promised goods or services).

[BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry) states the manufacturer must identify the "units of account" and assess whether orders for multiple products or services are a single performance obligation or separate obligations for each item. Source: [DART — ASC 606 codification](https://dart.deloitte.com/USDART/home/codification/revenue/asc606).

### 2B. The Series Guidance

**[AUTHORITATIVE STANDARD — ASC 606-10-25-14(b) and 25-15]**

A **series** of distinct goods or services that are **substantially the same** and have the **same pattern of transfer** to the customer is accounted for as a **single performance obligation** when (i) each distinct good/service in the series would be satisfied **over time** and (ii) the same method would be used to measure the entity's progress. The series provision is not optional where its conditions are met. Source: [DART — ASC 606 codification](https://dart.deloitte.com/USDART/home/codification/revenue/asc606); [KPMG — *Handbook: Revenue recognition*](https://kpmg.com/us/en/frv/reference-library/2025/handbook-revenue-recognition.html).

The series guidance is the workhorse for **repetitive / continuous-production manufacturing under long-term supply contracts** (see Section 5D).

### 2C. Manufacturing-Specific Performance-Obligation Patterns

**[INTERPRETIVE — INDUSTRIAL APPLICATION]**

| Pattern | Typical PO conclusion | Source / note |
|---|---|---|
| **Multiple distinct products in one PO** | Each product line typically a separate PO if each is capable of benefit and separately identifiable; quantities of the same SKU may form a series | [BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry) |
| **Product + installation** | Two POs if installation is distinct (not complex/specialized, customer could engage a third party); one PO if installation significantly integrates/modifies the product | [Grant Thornton](https://www.grantthornton.com/insights/articles/audit/2022/navigating-asc-606-and-340-40); [RSM](https://rsmus.com/insights/financial-reporting/a-guide-to-revenue-recognition.html) |
| **Product + assurance warranty** | The assurance warranty is **not** a separate PO; it is a cost accrual under ASC 460 (Section 8) | [BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry), citing ASC 460-10-25-5 to -7 |
| **Product + service-type (extended) warranty** | The service warranty **is** a separate PO; transaction price is allocated to it and recognized over the coverage period (Section 8) | [BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry), citing ASC 606-10-55-34 |
| **Product + maintenance / spare-parts entitlement** | Maintenance is typically a separate over-time PO; a spare-parts *entitlement* may be a material right or a separate PO depending on terms | [RSM](https://rsmus.com/insights/financial-reporting/a-guide-to-revenue-recognition.html) |
| **Tooling / molds / dies and pre-production assets** | Often a **separate PO** (the customer pays for tooling and may own it); if not a separate revenue PO, the costs are evaluated under ASC 340-10 / ASC 340-40 (Section 7). ASC 340-10 guidance on molds, dies, and tools under long-term supply agreements was **not** superseded by ASC 606 | [BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry); [RSM](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf) |
| **Custom engineering bundled with deliverables (ETO)** | Engineering/design that significantly customizes the deliverable is typically **combined** with the build into a single PO (highly interdependent) — a key reason ETO programs are single over-time POs | [BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry); [Grant Thornton](https://www.grantthornton.com/insights/articles/audit/2022/navigating-asc-606-and-340-40) |
| **Contract-manufacturing arrangement** | Frequently a **single** performance obligation; the entity then determines whether that single PO is satisfied over time or at a point in time | [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf) |

**Pre-production activities** that do not transfer control of a good or service to the customer are **not** promised goods or services and are not separate performance obligations; if they relate to an over-time PO, they are **excluded** from the measure of progress (because no control passes), and their costs are evaluated as fulfillment/pre-production costs (Section 7) ([BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry)).

### 2D. Series Guidance for Continuous-Production Manufacturing

**[INTERPRETIVE — INDUSTRIAL APPLICATION]**

In process (P) and hybrid (H) manufacturing — and in discrete (D) high-volume supply — a long-term contract to deliver many units of substantially the same product over time can be a single performance obligation under the series guidance when each unit would individually be recognized over time and the same measure of progress applies. Where units transfer at a point in time on shipment (typical), the series-as-single-PO conclusion does **not** apply, and each delivery (or the quantity shipped) is the unit of recognition. The series analysis is therefore tightly coupled to the Step 5 over-time/point-in-time conclusion (Section 5D). Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606); [KPMG — *Handbook: Revenue recognition*](https://kpmg.com/us/en/frv/reference-library/2025/handbook-revenue-recognition.html).

### 2E. Sub-Segment Applicability — Step 2

| PO pattern | D | P | H | J | E |
|---|---|---|---|---|---|
| Multiple distinct products per order | ✓ | ◑ | ✓ | ◑ | ◑ |
| Product + installation as separate PO | ✓ | ◑ | ✓ | ◑ | ◑ |
| Service-type (extended) warranty as separate PO | ✓ | ◑ | ✓ | ◑ | ✓ |
| Maintenance / spare-parts PO | ✓ | ◑ | ✓ | ◑ | ✓ |
| Tooling / pre-production as separate PO | ✓ | ◑ | ✓ | ✓ | ✓ |
| Engineering combined with build (single PO) | ◑ | — | ◑ | ✓ | ✓ |
| Series guidance (single PO across many units) | ◑ | ✓ | ✓ | — | — |

---

## Section 3 — Step 3: Determine the Transaction Price

### 3A. Fixed Consideration and the Definition of Transaction Price

**[AUTHORITATIVE STANDARD — ASC 606-10-32-2 through 32-4]**

The transaction price is the amount of consideration to which the entity **expects to be entitled** in exchange for transferring promised goods or services, excluding amounts collected on behalf of third parties. Fixed consideration (a stated contract price) is the starting point; the manufacturer then adjusts for variable consideration, a significant financing component, noncash consideration, and consideration payable to the customer. Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606).

### 3B. Variable Consideration

**[AUTHORITATIVE STANDARD — ASC 606-10-32-5 through 32-9]**

Consideration is variable if it can change due to discounts, rebates, refunds, credits, price concessions, incentives, performance bonuses, penalties, rights of return, or similar items. Importantly, ASC 606 does **not** require price to be fixed and determinable to recognize revenue — potential price concessions, price protection, and return rights are variable consideration subject to the constraint, not bars to recognition ([BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry)). For manufacturers, common forms identified by [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf) include early-payment discounts, volume discounts, rebates, price concessions, and rights of return; a fixed (non-conditional) contract discount is **not** variable consideration.

**Estimation methods (ASC 606-10-32-8):**

- **Expected value** — the probability-weighted sum of possible amounts; generally better when the entity has a large number of contracts with similar characteristics (e.g., a manufacturer's volume-rebate population across many customers).
- **Most likely amount** — the single most likely outcome; generally better for binary outcomes (e.g., a one-off performance bonus that is either earned in full or not).

The entity selects the method that **better predicts** the amount to which it will be entitled and applies it consistently. [RSM](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf) frames this as a two-step process: (1) estimate using expected value or most likely amount, then (2) apply the constraint.

### 3C. The Variable-Consideration Constraint

**[AUTHORITATIVE STANDARD — ASC 606-10-32-11 through 32-13]**

Variable consideration is included in the transaction price only to the extent it is **probable that a significant reversal** of cumulative revenue recognized **will not occur** when the uncertainty is subsequently resolved. Factors that increase the likelihood or magnitude of reversal (ASC 606-10-32-12): susceptibility to factors outside the entity's influence (e.g., commodity prices, customer actions); long resolution horizon; limited entity experience; broad range of possible outcomes; and a practice of offering concessions. The estimate (and the constraint) is **reassessed each reporting period** until the uncertainty is resolved ([RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf)). Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606).

### 3D. Significant Financing Component

**[AUTHORITATIVE STANDARD — ASC 606-10-32-15 through 32-20]**

When the timing of payments agreed by the parties provides the customer or the entity with a **significant benefit of financing**, the transaction price is adjusted to reflect the cash selling price (the time value of money). **Manufacturing relevance:** long-cycle ETO and large job-shop programs commonly involve substantial up-front or milestone payments well ahead of (or well behind) the transfer of control, which can create a significant financing component. A **practical expedient** (ASC 606-10-32-18) permits the entity to ignore the financing component if, at contract inception, the period between transfer of control and customer payment is one year or less (Section 12). Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606); [KPMG — *Handbook*](https://kpmg.com/us/en/frv/reference-library/2025/handbook-revenue-recognition.html).

### 3E. Noncash Consideration

**[AUTHORITATIVE STANDARD — ASC 606-10-32-21 through 32-24]**

Noncash consideration (e.g., customer-furnished materials, equity, or other goods) is measured at fair value. Under U.S. GAAP the measurement date is **contract inception**, and where noncash consideration varies for reasons *other than its form*, that variability is treated as variable consideration. (IFRS 15 prescribes no measurement date and applies the variable-consideration guidance regardless of the reason for variability — see Section 13.) Source: [RSM — *US GAAP vs IFRS*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/us-gaap-vs-ifrs-comparisons/wp_as_us_gaap_vs_ifrs_revenue_recognition.pdf).

### 3F. Consideration Payable to the Customer

**[AUTHORITATIVE STANDARD — ASC 606-10-32-25 through 32-27]**

Consideration payable to a customer (cash, credits, slotting fees, vendor allowances, cooperative-advertising payments) is a **reduction of the transaction price** — and thus revenue — unless it is payment for a distinct good or service the customer transfers to the entity (in which case it is accounted for as a purchase, to the extent of fair value). **Manufacturing/CPG relevance:** slotting fees and trade allowances paid by hybrid (H) consumer-packaged-goods manufacturers to retailers are typically revenue reductions. Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606); [KPMG — *Handbook*](https://kpmg.com/us/en/frv/reference-library/2025/handbook-revenue-recognition.html).

### 3G. Manufacturing-Specific Transaction-Price Topics

| Topic | Treatment | Source |
|---|---|---|
| **Liquidated damages** | Typically variable consideration that **reduces** the transaction price (e.g., late-delivery penalties on ETO programs); estimate and constrain | [Grant Thornton](https://www.grantthornton.com/insights/articles/audit/2022/navigating-asc-606-and-340-40) |
| **Performance bonuses / penalties** | Variable consideration; often estimated with the **most likely amount** method (binary) and constrained | [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf) |
| **Indexed / escalator pricing (commodity)** | Price changes tied to a commodity index (steel, resin, energy) are variable consideration; subject to the constraint because they are outside the entity's influence (ASC 606-10-32-12(a)) | [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf) |
| **Rights of return** | Variable consideration (not a separate PO); recognize revenue only for amounts not expected to be reversed, plus a refund liability and a return asset (Section 10) | [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf) |
| **Volume rebates / tiered discounts** | Variable consideration; commonly retrospective (price drops once a volume threshold is crossed), requiring catch-up adjustment of prior-period revenue (RSM Example 5-1) | [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf) |
| **Price protection (distributor)** | Variable consideration; under sell-through legacy methods, ASC 606 may permit **earlier** recognition once control transfers and only pricing is uncertain | [BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry) |

### 3H. Sub-Segment Applicability — Step 3

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Volume rebates / tiered discounts | ✓ | ✓ | ✓ | ◑ | — |
| Rights of return | ✓ | ◑ | ✓ | ◑ | — |
| Commodity escalators / indexed pricing | ◑ | ✓ | ✓ | ◑ | ✓ |
| Liquidated damages / late-delivery penalties | ◑ | ◑ | ◑ | ✓ | ✓ |
| Performance bonuses | ◑ | ◑ | ◑ | ✓ | ✓ |
| Significant financing component | ◑ | ◑ | ◑ | ◑ | ✓ |
| Slotting fees / trade allowances (consideration payable) | ◑ | ◑ | ✓ | — | — |

The significant financing component is flagged ✓ for ETO because long build cycles with milestone or advance payments are where it most often becomes material; it is ◑ elsewhere because most short-cycle product sales fall under the one-year expedient.

---

## Section 4 — Step 4: Allocate the Transaction Price

### 4A. Standalone Selling Price (SSP)

**[AUTHORITATIVE STANDARD — ASC 606-10-32-28 through 32-35]**

When a contract has more than one performance obligation, the transaction price is allocated to each PO in proportion to its **standalone selling price** (SSP) — the price at which the entity would sell the promised good or service separately to a customer. The best evidence of SSP is an observable price; when not directly observable, the entity estimates it. Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606); [KPMG — *Handbook: Revenue recognition*](https://kpmg.com/us/en/frv/reference-library/2025/handbook-revenue-recognition.html).

### 4B. Methods for Estimating SSP

**[AUTHORITATIVE STANDARD — ASC 606-10-32-34]**

| Method | When used |
|---|---|
| **Observable price** | A directly observable standalone selling price exists (e.g., a maintenance plan sold separately at a list price). Preferred. |
| **Adjusted market assessment** | Evaluate the market and estimate the price customers would be willing to pay (competitor pricing, market data). |
| **Expected cost plus a margin** | Forecast the costs of satisfying the PO and add an appropriate margin — common for custom-engineered components with no observable price. |
| **Residual approach (limited)** | Permitted only where the selling price is **highly variable or uncertain**; allocate the residual of the transaction price after observable SSPs of other POs. Not a default. |

Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606); [Grant Thornton — *Navigating ASC 606 and 340-40*](https://www.grantthornton.com/insights/articles/audit/2022/navigating-asc-606-and-340-40).

### 4C. Allocation Methodology and Exceptions

**[AUTHORITATIVE STANDARD — ASC 606-10-32-36 through 32-41]**

- **Discount allocation (ASC 606-10-32-36 to -38):** a discount is allocated proportionately to all POs unless observable evidence shows the discount relates to only some POs, in which case it is allocated to those POs.
- **Variable-consideration allocation (ASC 606-10-32-39 to -41):** variable consideration may be allocated entirely to a specific PO (or to a distinct good/service in a series) when (i) the variable payment relates specifically to the entity's efforts to satisfy that PO (or transfer that distinct good/service) **and** (ii) allocating it entirely there is consistent with the overall allocation objective. [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf) describes both criteria; otherwise variable consideration is allocated proportionately.

### 4D. Manufacturing-Specific Allocation Issues

| Bundle | Allocation challenge | Source |
|---|---|---|
| **Product + installation + training** | Each PO needs an SSP; installation and training often lack observable prices, requiring expected-cost-plus-margin estimates | [Grant Thornton](https://www.grantthornton.com/insights/articles/audit/2022/navigating-asc-606-and-340-40) |
| **Product + service-type (extended) warranty** | The **warranty SSP is often the hardest to estimate** — extended warranties are frequently bundled and rarely sold separately at an observable price, so cost-plus-margin or adjusted-market-assessment is typically required | [BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry) |
| **Tooling fee + per-unit price (LTSA)** | If tooling is a separate PO, the up-front tooling fee and the per-unit production price must each be allocated an SSP; a below-cost tooling fee with above-market per-unit prices can signal that the "fee" is partly advance consideration for production | [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf) |

### 4E. Sub-Segment Applicability — Step 4

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Multi-PO allocation a common issue | ✓ | ◑ | ✓ | ◑ | ✓ |
| Warranty-SSP estimation difficulty | ✓ | ◑ | ✓ | ◑ | ✓ |
| Tooling-fee vs. per-unit allocation | ✓ | ◑ | ✓ | ✓ | ◑ |
| Residual approach used | ◑ | — | ◑ | ◑ | ◑ |

For single-PO ETO and job-shop programs (engineering combined with build), Step 4 is frequently a non-event because there is only one performance obligation; allocation matters only when a distinct service-type warranty, installation, or training is also promised.

---

## Section 5 — Step 5: Recognize Revenue When/As Performance Obligations Are Satisfied

**THE CRITICAL SECTION FOR MANUFACTURING.** Revenue is recognized when (point in time) or as (over time) the entity satisfies a performance obligation by transferring control of the promised good or service. The entity **first** determines whether each PO is satisfied **over time** (the three criteria in 5B); if **none** of the over-time criteria is met, the PO is satisfied at a **point in time** (5A), and the control indicators determine *when*. Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606); [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf).

### 5A. Point-in-Time Recognition (PIT)

**[AUTHORITATIVE STANDARD — ASC 606-10-25-30]**

Control of an asset has transferred when the customer can **direct the use of, and obtain substantially all the remaining benefits from**, the asset (including the ability to prevent others from doing so). The **five indicators** of transfer of control at a point in time:

1. **Present right to payment** — the entity has a present right to payment for the asset.
2. **Legal title** — the customer has legal title.
3. **Physical possession** — the customer has physical possession.
4. **Risks and rewards** — the customer has the significant risks and rewards of ownership.
5. **Customer acceptance** — the customer has accepted the asset.

No single indicator is determinative; the entity weighs them together. Both [BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry) and [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf) enumerate these five indicators for manufacturers.

**Manufacturing application — where most discrete MTS shipping happens:** for standard finished goods made to stock and sold from inventory, control typically transfers at **shipment or delivery** depending on shipping terms, when most indicators align. This is the default recognition pattern for D-MTS and most P spot sales.

**FOB shipping point vs. FOB destination:**

- **FOB shipping point** — title and risk pass when goods leave the manufacturer's dock; control generally transfers at shipment, and revenue is recognized then.
- **FOB destination** — title and risk pass on delivery to the customer; control generally transfers on delivery.

Shipping and handling activities performed **after** control transfers may be treated, by accounting-policy election, as a **fulfillment activity** rather than a separate performance obligation under U.S. GAAP (Section 12; this election does not exist under IFRS 15 — Section 13). Source: [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf); [RSM — *US GAAP vs IFRS*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/us-gaap-vs-ifrs-comparisons/wp_as_us_gaap_vs_ifrs_revenue_recognition.pdf).

**Bill-and-hold arrangements:** revenue may be recognized before the customer takes physical possession only if control has transferred, which requires **all** of the following (in addition to the normal control analysis):

1. The reason for the arrangement is **substantive** (e.g., the customer requested it);
2. The product is **separately identified** as belonging to the customer;
3. The product is **ready for physical transfer** to the customer; and
4. The entity **cannot use the product or direct it to another customer**.

These criteria derive from the SEC's interpretive framework and ASC 606's bill-and-hold guidance. Source: [SEC — *Commission Guidance Regarding Revenue Recognition for Bill-and-Hold Arrangements* (Release 33-10402, 2017)](https://www.sec.gov/files/rules/interp/2017/33-10402.pdf); [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606). **[JUDGMENT AREA]** Bill-and-hold remains an SEC comment-letter focus area; substantiveness of the customer's reason is the most scrutinized criterion.

**Sub-segment applicability (PIT):** predominantly **D** and **H** under **MTS / ATO** strategies, and **P** spot sales. ATO products often transfer at **customer acceptance** (indicator 5) where configuration must be confirmed before control passes.

### 5B. Over-Time Recognition (OT)

**[AUTHORITATIVE STANDARD — ASC 606-10-25-27]**

A performance obligation is satisfied **over time** if **any one** of three criteria is met:

1. **Simultaneous receipt and consumption** — the customer simultaneously receives and consumes the benefits provided by the entity's performance as the entity performs (typical of routine/recurring services; rare for manufactured goods).
2. **Customer-controlled asset** — the entity's performance creates or enhances an asset (e.g., work in process) that the **customer controls** as it is created or enhanced.
3. **No alternative use + enforceable right to payment** — the entity's performance does **not** create an asset with an **alternative use** to the entity, **and** the entity has an **enforceable right to payment** for performance completed to date.

[BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry) notes that for most manufacturers **only criteria 2 and 3 are potentially applicable**, and [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf) restates all three. Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606).

**Criterion 3 is the workhorse for custom manufacturing.** Two components:

- **No alternative use (ASC 606-10-25-28):** the asset cannot be readily redirected to another customer, either because of contractual restrictions or because the asset is so customized that redirecting it would be impractical/uneconomic. A highly unique, customer-specified product typically has no alternative use ([BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry)).
- **Enforceable right to payment (ASC 606-10-25-29):** the entity is entitled, throughout the contract, to an amount that at least **compensates it for performance completed to date** (cost incurred to date **plus a reasonable profit margin**) if the customer terminates for reasons other than the entity's failure to perform. [BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry) states this explicitly: compensation includes recovery of costs incurred through the cancellation date **plus a reasonable profit margin** on those costs.

**Practical consequence:** long-term ETO and job-shop contracts typically meet criterion 3 **when the contract contains a termination-for-convenience clause that pays cost-plus-margin** for work performed to date. Absent an enforceable right to that margin (e.g., a contract that pays only costs, or only a fixed milestone with no interim entitlement), the over-time conclusion may fail and the PO reverts to point-in-time at delivery. **[JUDGMENT AREA]** The enforceability of the right to payment is assessed under the contract terms **and** the relevant legal jurisdiction; legal interpretation may be required.

**BDO's aircraft-engine illustration:** a manufacturer that previously used cost-to-cost under legacy ASC 605-35 may **fail** ASC 606 over-time criteria if the engines could theoretically be sold to another customer (alternative use exists) and the customer does not obtain control as the product is manufactured — flipping that program to point-in-time recognition ([BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry)).

**Sub-segment applicability (OT):** predominantly **J** (job-shop/project) and **E** (ETO), and **large custom programs within D** (e.g., custom machinery, aerospace structures). Process (P) and hybrid (H) reach over-time recognition mainly through the **series** route on long-term supply contracts where individual deliveries are themselves over-time (less common) — most P/H product flows are point-in-time on shipment.

### 5C. Measuring Progress Toward Completion

**[AUTHORITATIVE STANDARD — ASC 606-10-25-31 through 25-37]**

When a PO is satisfied over time, the entity recognizes revenue by measuring progress toward complete satisfaction, using a method whose objective is to **depict the transfer of control** of the goods/services. [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf): "The objective of this method should be to measure the progress made in transferring control of the underlying goods or services to the customer."

**Input methods vs. output methods:**

| Method type | Examples | Manufacturing note |
|---|---|---|
| **Input methods** (efforts/inputs consumed) | **Cost-to-cost** (most common in manufacturing), labor hours, machine hours, time elapsed | "Input methods rely on the efforts put forth by the industrial entity" ([RSM](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf)). Cost-to-cost dominates heavy/custom manufacturing. |
| **Output methods** (value transferred) | Units produced, units delivered, milestones reached, surveys of performance/appraisals of results | "Output methods rely on the value of the underlying goods or services" ([RSM](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf)). A units-produced/units-delivered method must account for WIP at period boundaries. |

**Cost-to-cost mechanics:** revenue recognized to date is the contract revenue scaled by the ratio of cost incurred to date over total estimated cost:

\[ \text{Percent complete} = \frac{\text{Cumulative cost incurred to date}}{\text{Total estimated cost at completion}} \]

\[ \text{Revenue recognized this period} = \big(\text{Percent complete} \times \text{Total estimated contract revenue}\big) - \text{Revenue recognized to date} \]

**Uninstalled materials adjustment:** when a significant portion of total contract cost is for materials that have been procured (and control of which has transferred to the customer) but **not yet installed/incorporated**, recognizing revenue on the full cost-to-cost ratio would **overstate** progress — the entity has spent cost without transferring proportionate value. ASC 606-10-25-37 addresses this: progress is adjusted so that revenue on such uninstalled materials is recognized **only to the extent of cost (zero margin)** when (i) the materials are not distinct, (ii) control transfers significantly before installation, (iii) the cost is significant relative to total expected costs, and (iv) the entity procures the materials but is not significantly involved in designing/manufacturing them. The materials cost is included in the measure of progress, but the related revenue is capped at cost. Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606); [Baker Tilly — *Revenue recognition: what to know about uninstalled materials*](https://www.bakertilly.com/insights/revenue-recognition-uninstalled-materials).

**Wasted materials / inefficiencies:** costs that do not contribute to transferring control — **wasted materials, abnormal scrap, unexpected rework, and other inefficiencies** — are **excluded** from the cost-to-cost measure of progress (and recognized as period costs). Including them would overstate progress. [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf): progress should "not reflect ... any activities that are not themselves promised goods or services," and the entity must reflect only goods/services for which control has transferred. (This dovetails with the abnormal-spoilage charge under ASC 330 documented in `Manufacturing_KPIs_Sources.md`.)

**Standard-costing caution:** entities using standard costing for inventory must evaluate period-end cost-absorption adjustments — if standard costs are stale or actual costs have fluctuated, the cost-to-cost percentage may misstate economic progress ([RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf)).

**Change of estimate (ASC 606-10-25-35; ASC 250):** revisions to total estimated cost or total estimated revenue are accounted for as a **change in accounting estimate** using the **cumulative catch-up** method — the cumulative effect is recognized in the period of revision, not restated retrospectively. Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606); [Grant Thornton](https://www.grantthornton.com/insights/articles/audit/2022/navigating-asc-606-and-340-40).

**Sub-segment applicability (measure of progress):** **J** and **E** use cost-to-cost heavily; **H** sometimes (large custom subassemblies); **D** for its large custom programs. The uninstalled-materials issue is most acute in **E** (large procured components shipped to site but not yet integrated).

### 5D. Series Guidance for Repetitive Manufacturing

**[AUTHORITATIVE STANDARD — ASC 606-10-25-14(b)]**

When a long-term contract calls for many distinct deliveries of substantially the same good or service, **each** of which would be satisfied **over time** under the same measure of progress, the contract is treated as a **single performance obligation** (a series). The practical effect is a single measure of progress across the whole contract rather than per-delivery accounting. This applies most cleanly to long-term supply contracts in **P** and **H** (and high-volume **D** supply) where the over-time conditions are met. Where deliveries instead transfer control at a point in time on shipment (the more common manufacturing fact pattern), the series-single-PO conclusion does **not** apply and each shipment is recognized at delivery (Section 2D). Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606); [KPMG — *Handbook*](https://kpmg.com/us/en/frv/reference-library/2025/handbook-revenue-recognition.html).

### 5E. Sub-Segment Applicability — Step 5 (Recognition Pattern Summary)

| Recognition pattern | D | P | H | J | E |
|---|---|---|---|---|---|
| Point-in-time at shipment/delivery (MTS) | ✓ | ✓ | ✓ | ◑ | — |
| Point-in-time at customer acceptance (ATO) | ✓ | ◑ | ✓ | ◑ | ◑ |
| Over-time, criterion 2 (customer-controlled WIP) | ◑ | ◑ | ◑ | ✓ | ✓ |
| Over-time, criterion 3 (no alt use + right to payment) | ◑ | — | ◑ | ✓ | ✓ |
| Cost-to-cost measure of progress | ◑ | ◑ | ◑ | ✓ | ✓ |
| Series guidance (single PO across deliveries) | ◑ | ✓ | ✓ | — | — |
| Uninstalled-materials adjustment | ◑ | — | ◑ | ◑ | ✓ |

**Production-strategy mapping (binding axis):** **MTS → PIT** (almost always); **ATO → PIT at acceptance** (typically); **MTO → PIT or OT** depending on customization and right-to-payment; **ETO → OT under criterion 3** (typically).

---

## Section 6 — Contract Modifications

**[AUTHORITATIVE STANDARD — ASC 606-10-25-10 through 25-13]**

A contract modification is a change in scope or price (or both) approved by the parties. There are **three** accounting outcomes:

1. **Separate contract** — the modification is accounted for as a **separate contract** when (a) the scope increases by adding **distinct** goods/services **and** (b) the price increases by an amount that reflects the **standalone selling prices** of those added goods/services (with appropriate adjustment for the specific circumstances). The original contract is unaffected.
2. **Termination of the old contract + creation of a new contract (prospective)** — when the remaining goods/services are **distinct** from those already transferred, the modification is treated as the termination of the existing contract and the creation of a new one; remaining consideration is allocated to the remaining (distinct) POs prospectively.
3. **Cumulative catch-up (modification of a single PO)** — when the remaining goods/services are **not distinct** and form part of a single PO that is partially satisfied (e.g., an over-time program), the modification is accounted for on a **cumulative catch-up** basis as if it had been part of the original contract.

Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606); [KPMG — *Handbook: Revenue recognition*](https://kpmg.com/us/en/frv/reference-library/2025/handbook-revenue-recognition.html).

**Manufacturing-specific patterns:**

- **Change orders in ETO / job-shop programs** — the dominant modification fact pattern. A change order that adds distinct, separately-priced scope is a separate contract; a change order that revises the design/scope of the **single** over-time PO (the usual case) is a **cumulative catch-up** to the cost-to-cost measure of progress. **[JUDGMENT AREA]** Unpriced or disputed change orders require judgment about whether and when enforceable rights/obligations exist (a Step 1/Step 3 question that precedes the modification accounting).
- **Scope changes mid-build** — revised quantities, specifications, or delivery schedules on a partially-completed over-time PO are typically cumulative catch-up.
- **Blanket-PO modifications** — adding volume at the same price is often a continuation; adding volume of distinct items at SSP is a separate contract; renegotiating remaining price is prospective.

**Sub-segment applicability:** modification accounting is **central** to **J** and **E** (frequent change orders), **relevant** to **H** and large custom **D**, and **occasional** for **P** (price/volume renegotiation on supply contracts).

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Frequent change orders / cumulative catch-up | ◑ | — | ◑ | ✓ | ✓ |
| Separate-contract add-ons at SSP | ✓ | ✓ | ✓ | ◑ | ◑ |
| Prospective (termination + new) treatment | ◑ | ✓ | ◑ | ✓ | ◑ |

---

## Section 7 — Contract Costs (ASC 340-40)

**[AUTHORITATIVE STANDARD — ASC 340-40]**

ASC 340-40, *Other Assets and Deferred Costs — Contracts with Customers*, was issued concurrently with ASC 606 and governs **costs of obtaining** and **costs of fulfilling** a contract. **Scope ordering:** ASC 340-40 applies to fulfillment costs **only if no other Topic applies** — the entity first checks ASC 330 (Inventory), ASC 360 (PP&E), ASC 350-40 (internal-use software), ASC 340-10 (pre-production / molds, dies, tools under long-term supply arrangements), and other Topics ([BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry); [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf)). Source: [DART — ASC 340-40 / Roadmap Chapter 13: Contract Costs](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-13-contract-costs/13-3-costs-fulfilling-a-contract).

### 7A. Incremental Costs of Obtaining a Contract

**[ASC 340-40-25-1 through 25-4]**

Incremental costs of obtaining a contract are costs the entity would **not** have incurred had the contract not been obtained — the classic example is a **sales commission**. These are **capitalized** if the entity expects to recover them. **Non-incremental** costs (e.g., bid/proposal travel that would have been incurred regardless) are expensed unless explicitly chargeable to the customer regardless of whether the contract is won ([RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf)). **Practical expedient (ASC 340-40-25-4):** the entity may **expense** these costs immediately when the amortization period would otherwise be **one year or less** (Section 12).

### 7B. Costs to Fulfill a Contract

**[ASC 340-40-25-5 through 25-8]**

When not within another Topic's scope, fulfillment costs are **capitalized** (capitalization is **mandatory**, not elective, when the criteria are met — [RSM](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf)) if **all three**:

1. The costs **relate directly** to a contract (or anticipated contract) the entity can specifically identify;
2. The costs **generate or enhance resources** of the entity that will be used to satisfy (future) performance obligations; **and**
3. The costs are **expected to be recovered**.

There is **no** one-year practical expedient for fulfillment costs (unlike costs to obtain) ([BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry)).

### 7C. Manufacturing-Specific Application

| Cost | Treatment | Source |
|---|---|---|
| **Pre-production setup costs** | Evaluate under ASC 340-10 first (pre-production costs under long-term supply arrangements: design/development of products, and of molds, dies, tools). If not within ASC 340-10/330/360, evaluate under ASC 340-40. Activities that do not transfer control are excluded from a measure of progress | [BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry); [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf) |
| **Tooling, molds, dies** | Often a **separate revenue PO** (Section 2). If not, ASC 340-10 governs design/development of molds, dies, and tools under long-term supply agreements (not superseded by ASC 606); otherwise ASC 340-40 fulfillment cost | [BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry) |
| **Learning-curve / start-up costs** | Costs that enhance resources used to satisfy future POs may be capitalizable fulfillment costs if recovery is expected; abnormal start-up inefficiencies are period costs | [DART — Roadmap Ch. 13](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-13-contract-costs/13-3-costs-fulfilling-a-contract) |

### 7D. Amortization and Impairment

**[ASC 340-40-35-1 through 35-6]**

Capitalized contract costs are **amortized** on a systematic basis consistent with the **pattern of transfer** of the related goods/services (which may span anticipated/renewal contracts). They are tested for **impairment** when the carrying amount exceeds the remaining consideration expected, less remaining costs to provide. **U.S. GAAP does not permit reversal** of a contract-cost impairment loss (IFRS 15 **requires** reversal when conditions improve — Section 13). Source: [DART — ASC 340-40](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-13-contract-costs/13-3-costs-fulfilling-a-contract); [RSM — *US GAAP vs IFRS*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/us-gaap-vs-ifrs-comparisons/wp_as_us_gaap_vs_ifrs_revenue_recognition.pdf).

### 7E. Sub-Segment Applicability — Contract Costs

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Sales-commission capitalization | ✓ | ✓ | ✓ | ◑ | ◑ |
| One-year expedient (costs to obtain) | ✓ | ✓ | ✓ | ◑ | — |
| Pre-production / tooling costs | ✓ | ◑ | ✓ | ✓ | ✓ |
| Learning-curve / start-up costs | ◑ | ◑ | ◑ | ✓ | ✓ |

---

## Section 8 — Warranties

**[AUTHORITATIVE STANDARD — ASC 606-10-55-30 through 55-35; ASC 460]**

ASC 606 distinguishes two warranty types, and the distinction drives wholly different accounting:

| Warranty type | Nature | Accounting |
|---|---|---|
| **Assurance-type** | Provides only assurance that the product complies with **agreed-upon specifications** | **Not** a performance obligation. Accrue expected warranty cost when revenue is recognized, under **ASC 460** (Guarantees) — a cost-of-sales accrual | 
| **Service-type** | Provides the customer with a **service** beyond assurance (e.g., maintenance, extended coverage) | **Separate performance obligation** under ASC 606. Allocate transaction price to it (Section 4) and recognize over the coverage period |

Sources: [BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry) (citing ASC 460-10-25-5 to -7 for assurance warranties and ASC 606-10-55-34 for the single-PO fallback); [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf).

**Distinguishing assurance from service warranties — factors:**

- If the customer has the **option to purchase the warranty separately**, it is a **service-type** warranty and a separate PO ([BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry); [RSM](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf)).
- A warranty **required by law** is indicative of an **assurance**-type warranty.
- The **longer the coverage period**, the more likely the warranty includes a service component.
- The **nature of the tasks** the entity promises to perform — steps performed only to provide assurance of specification compliance are likely not a separate PO.

**Single-PO fallback (ASC 606-10-55-34):** if the entity **cannot reasonably account** for the assurance and service components separately, it accounts for **both together as a single performance obligation** under ASC 606 ([BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry)).

**Manufacturing application:** extended warranties are common in **durable goods** (D) and **medical devices / appliances** (H), and ETO programs (E) often include service-type warranties or maintenance as separate POs. The **SSP of the service-type warranty is frequently the hardest allocation input** (Section 4D). Exchanges for **defective** products are accounted for as warranties (not as returns) ([RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf)).

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Assurance warranty (ASC 460 accrual) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Service-type (extended) warranty PO | ✓ | ◑ | ✓ | ◑ | ✓ |

---

## Section 9 — Repurchase Agreements, Consignment, Bill-and-Hold, Customer Acceptance

**[AUTHORITATIVE STANDARD — ASC 606-10-55-66 through 55-88]**

### 9A. Repurchase Agreements

A repurchase agreement is a contract in which the entity sells an asset and also has a right or obligation to repurchase it. Three forms:

- **Forward (entity obligation to repurchase) / Call option (entity right to repurchase):** the customer does **not** obtain control. If the repurchase price is **below** the original selling price, account as a **lease** (ASC 842); if **at or above** original selling price, account as a **financing arrangement** (recognize a liability, not revenue).
- **Put option (customer right to require repurchase):** analyze whether the customer has a significant economic incentive to exercise. If yes and the repurchase price is below original selling price, account as a **lease**; if at/above selling price and above expected market value, account as a **financing**; otherwise account as a **sale with a right of return**.

Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606); [KPMG — *Handbook*](https://kpmg.com/us/en/frv/reference-library/2025/handbook-revenue-recognition.html).

### 9B. Consignment Arrangements

**[ASC 606-10-55-79 through 55-80]** When a manufacturer delivers product to a dealer/distributor on **consignment**, the dealer does not obtain control on delivery — **no revenue** is recognized until the consigned product **sells through** to the end customer (or the consignee's return right lapses / it becomes obligated to pay). Indicators of a consignment include: the product is controlled by the entity until a specified event, the entity can require return or transfer to a third party, and the dealer has no unconditional payment obligation. [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf) discusses consignment as a control-transfer issue.

### 9C. Bill-and-Hold

See Section 5A for the four criteria. Cross-reference: [SEC Release 33-10402](https://www.sec.gov/files/rules/interp/2017/33-10402.pdf); [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606).

### 9D. Customer Acceptance Clauses

**[ASC 606-10-55-85 through 55-88]** If the entity can **objectively determine** that control has transferred per the agreed specifications, customer acceptance is a **formality (perfunctory)** and does not delay revenue. If the entity **cannot** objectively determine that the product meets the agreed specifications until the customer tests/accepts it, acceptance is **substantive** and revenue is deferred until acceptance — common for ATO and complex/custom equipment. **[JUDGMENT AREA]** Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606).

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Repurchase agreements | ◑ | ◑ | ◑ | ◑ | ◑ |
| Consignment (no revenue until sell-through) | ✓ | ◑ | ✓ | — | — |
| Bill-and-hold | ✓ | ✓ | ✓ | ◑ | ◑ |
| Substantive customer acceptance | ◑ | ◑ | ◑ | ✓ | ✓ |

---

## Section 10 — Variable Consideration in Manufacturing

This section consolidates the manufacturing variable-consideration mechanics introduced in Section 3.

### 10A. Rights of Return

**[AUTHORITATIVE STANDARD — ASC 606-10-55-22 through 55-29]**

A right of return is **variable consideration**, not a separate performance obligation. The entity recognizes:

1. **Revenue** only for the amount of consideration to which it expects to be entitled — i.e., **excluding** products expected to be returned (subject to the constraint);
2. A **refund liability** for the consideration expected to be refunded; and
3. An **asset** (and corresponding adjustment to cost of sales) for its **right to recover products** from customers on settling the refund liability, measured at the former carrying amount less expected recovery costs.

The estimate is **reassessed** each reporting period. Exchanges of the same product (same type, quality, condition, price) are **not** returns; exchanges of **defective** product are **warranties** (Section 8). Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606); [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf).

### 10B. Volume Rebates and Tiered Pricing

Retrospective volume rebates/tiered prices are variable consideration estimated (typically expected value) and constrained. When a threshold is crossed and a lower retrospective price applies, **prior-period revenue is adjusted** (catch-up). [RSM Example 5-1](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf): a USD 100/unit product retrospectively repriced to USD 90/unit once annual purchases exceed 1,000 units, with revenue reassessed and prior periods adjusted.

### 10C. Performance Bonuses and Liquidated Damages

Performance bonuses (e.g., early-completion incentives) and **liquidated damages / late-delivery penalties** are variable consideration. Bonuses (often binary) commonly use the **most likely amount** method; penalties reduce the transaction price. Both are constrained. Source: [RSM — *Industrial Entities*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf); [Grant Thornton](https://www.grantthornton.com/insights/articles/audit/2022/navigating-asc-606-and-340-40).

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Right of return (liability + return asset) | ✓ | ◑ | ✓ | ◑ | — |
| Volume rebates / tiered pricing | ✓ | ✓ | ✓ | ◑ | — |
| Performance bonuses | ◑ | ◑ | ◑ | ✓ | ✓ |
| Liquidated damages | ◑ | ◑ | ◑ | ✓ | ✓ |

---

## Section 11 — Disclosure Requirements (ASC 606-10-50)

**[AUTHORITATIVE STANDARD — ASC 606-10-50-1 through 50-23]**

The disclosure objective is to enable users to understand the **nature, amount, timing, and uncertainty** of revenue and cash flows from contracts with customers. Required disclosures (public entities; reduced for nonpublic):

- **Disaggregation of revenue (ASC 606-10-50-5 to -7):** disaggregate revenue into categories depicting how economic factors affect its nature/amount/timing/uncertainty. Manufacturing-relevant categories: **timing of transfer** (point-in-time vs. over-time), **geography**, **product type / product line**, **customer type / market** (OEM vs. aftermarket; government vs. commercial), and **contract type** (fixed-price vs. cost-plus/T&M).
- **Contract balances (ASC 606-10-50-8 to -10):** opening/closing balances of **receivables, contract assets** (unbilled — common in over-time ETO/job-shop), and **contract liabilities** (advance payments/deferred revenue); revenue recognized in the period that was in the opening contract-liability balance; explanation of significant changes.
- **Performance obligations / remaining performance obligations (RPO) (ASC 606-10-50-12 to -15):** the **aggregate transaction price allocated to unsatisfied (or partially unsatisfied) performance obligations** — the ASC 606 analog of **backlog**. Manufacturers with **long-cycle J/E programs** have substantial RPO disclosure, including expected timing of recognition. A practical expedient exempts contracts with an original expected duration of **one year or less** (Section 12).
- **Significant judgments (ASC 606-10-50-17 to -21):** judgments in determining timing of satisfaction (the over-time vs. point-in-time conclusion and the measure of progress), and in determining the transaction price and amounts allocated to POs (variable-consideration estimation and constraint).
- **Contract costs (ASC 340-40-50-1 to -3):** closing balances of capitalized costs to obtain/fulfill by main category, and amortization/impairment recognized.

Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606); [KPMG — *Handbook: Revenue recognition*](https://kpmg.com/us/en/frv/reference-library/2025/handbook-revenue-recognition.html). SEC registrants also discuss revenue trends in MD&A under [Regulation S-K Item 303](https://www.ecfr.gov/current/title-17/chapter-II/part-229/subpart-229.300/section-229.303).

| Disclosure | D | P | H | J | E |
|---|---|---|---|---|---|
| Disaggregation by timing (PIT vs OT) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Contract assets (unbilled) | ◑ | ◑ | ◑ | ✓ | ✓ |
| Contract liabilities (advances) | ◑ | ◑ | ◑ | ✓ | ✓ |
| RPO / backlog disclosure | ◑ | ◑ | ◑ | ✓ | ✓ |
| Significant-judgment disclosure (timing/measure) | ◑ | ◑ | ◑ | ✓ | ✓ |

---

## Section 12 — Practical Expedients

**[AUTHORITATIVE STANDARD — various ASC 606 / ASC 340-40 paragraphs]**

| Expedient | Reference | Manufacturing relevance |
|---|---|---|
| **Portfolio approach** | ASC 606-10-10-4 | Apply ASC 606 to a portfolio of contracts/POs with similar characteristics if the result would not differ materially from contract-by-contract — useful for high-volume D-MTS and P/H supply where rebates/returns are estimated across populations |
| **Significant financing component — one year** | ASC 606-10-32-18 | Need not adjust for financing if, at inception, the period between transfer of control and payment is one year or less — covers most short-cycle product sales |
| **Right to invoice (output measure)** | ASC 606-10-55-18 | If the entity has a right to consideration that **corresponds directly with the value to the customer** of performance to date, it may recognize revenue at the **amount it has the right to invoice** — common for **T&M job-shop** work |
| **Sales taxes (gross vs. net)** | ASC 606-10-32-2A (policy election) | May **exclude all sales and similar taxes** collected from customers from the transaction price (present net). U.S.-GAAP-only election; **no IFRS 15 equivalent** (Section 13) |
| **Shipping and handling** | ASC 606-10-25-18A/18B (policy election) | May elect to treat shipping/handling **after** control transfers as a **fulfillment activity** rather than a separate PO. U.S.-GAAP-only election; **no IFRS 15 equivalent** ([RSM — *US GAAP vs IFRS*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/us-gaap-vs-ifrs-comparisons/wp_as_us_gaap_vs_ifrs_revenue_recognition.pdf)) |
| **Costs of obtaining a contract — one-year amortization** | ASC 340-40-25-4 | May expense incremental costs to obtain a contract immediately if the amortization period would be one year or less ([BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry)) |
| **RPO / backlog disclosure exemption** | ASC 606-10-50-14 | Need not disclose RPO for contracts with an **original expected duration of one year or less** — exempts most short-cycle product orders, leaving long-cycle J/E backlog as the focus |

Source: [DART — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606).

---

## Section 13 — IFRS 15 Divergence (resolved Q5)

**[AUTHORITATIVE STANDARD — IFRS 15, IFRS Foundation]**

IFRS 15, *Revenue from Contracts with Customers*, applies the **same five-step model** and the same converged core principle as ASC 606; for most manufacturing transactions the outcome is identical. Source: [IFRS Foundation — IFRS 15](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/). The material manufacturing-relevant **divergences** (all from [RSM US — *US GAAP vs IFRS: Revenue from Contracts with Customers*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/us-gaap-vs-ifrs-comparisons/wp_as_us_gaap_vs_ifrs_revenue_recognition.pdf), cross-checked against [RevenueHub — *ASC 606 vs IFRS 15*](https://www.revenuehub.org/article/asc-606-ifrs-15)) are catalogued below.

| Topic | ASC 606 (U.S. GAAP) | IFRS 15 | Manufacturing impact |
|---|---|---|---|
| **Collectibility threshold ("probable")** | "Probable" = **likely to occur** (higher threshold) | "Probable" = **more likely than not** (lower threshold) | Step 1 contract-existence conclusions can differ at the margin for credit-stressed J/E customers |
| **Shipping and handling** | **Policy election** to treat post-control shipping/handling as a fulfillment activity | **No such election** | An IFRS manufacturer must assess whether post-control shipping is a separate PO; cannot default to fulfillment |
| **Sales and other similar taxes** | **Policy election** to exclude all such taxes from the transaction price (net presentation) | **No such election** — requires substance analysis (principal vs. agent for each tax) | Affects transaction-price measurement for IFRS filers; more analysis per jurisdiction |
| **Noncash consideration — measurement date** | Measured at **contract inception**; variability **other than form** is variable consideration | **No prescribed measurement date**; variable-consideration guidance applies **regardless of the reason** for variability | Relevant where customers furnish materials/equipment or pay in kind |
| **Reversal of impairment on capitalized contract costs** | **Not permitted** | **Required** when conditions improve | An IFRS manufacturer may write capitalized contract costs back up; a U.S. GAAP manufacturer cannot (Section 7D) |
| **Onerous (loss-making) contracts** | Onerous test under **ASC 605-35/606 framework** may be applied at the **contract or performance-obligation level** | Onerous test (IAS 37) performed at the **contract level** | Loss recognition timing/scope can differ on loss-making ETO/job-shop programs |
| **Licensing (functional vs. symbolic IP)** | Classify IP as **functional** (point-in-time) or **symbolic** (over-time); license renewals cannot be recognized before the renewal period begins | **No functional/symbolic distinction** — assess right-to-use vs. right-to-access; **no renewal restriction** | Generally **less relevant to manufacturing** (cross-reference only); matters for manufacturers licensing embedded software/IP with products |

**Topics that are converged (no material manufacturing divergence):** the five-step architecture; the distinct-PO criteria; the three over-time criteria (including "no alternative use + enforceable right to payment"); input/output measures of progress and cost-to-cost; the variable-consideration constraint (the constraint operates similarly under both); the contract-modification framework; warranties (assurance vs. service); and the contract-cost capitalization criteria (largely converged apart from impairment reversal).

**Disclosure quantum:** IFRS 15 disclosure is **slightly less prescriptive** than ASC 606 in some respects but is built on the same principles-based objective; some IFRS practical-expedient disclosures and the public/nonpublic scaling differ. Source: [IFRS Foundation — IFRS 15](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/).

**Recently issued amendments:** for **ASC 606**, the standard is in a steady state; the FASB completed a post-implementation review and periodic Codification improvements (no substantive change to the manufacturing five-step application as of June 2026) — see [DART — Roadmap: Revenue Recognition](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition). For **IFRS 15**, the IASB completed its post-implementation review without major amendments — see [IFRS Foundation — Post-implementation Review of IFRS 15](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/). **[FLAG: VERIFY AT FILING DATE]** Confirm the latest ASU/IFRS-amendment status against the FASB technical agenda ([fasb.org](https://www.fasb.org)) and the IFRS work plan at the entity's reporting date.

**Tenant routing note:** the panel/evaluator `reportingBasis: 'US_GAAP' | 'IFRS'` flag (per `Manufacturing_KPIs_Sources.md` and the planning-doc contract) must route the divergent items above — most consequentially the **shipping/handling** and **sales-tax** policy elections (which simply do not exist under IFRS), the **collectibility threshold**, and the **contract-cost impairment-reversal** behavior — to IFRS-aware logic where an IFRS basis is elected.

---

## Section 14 — Industry-Specific Application Notes

This section applies the entire model concretely to the five sub-segments.

### 14A. D — Discrete Manufacturing

- **MTS** (machinery components, electronics, appliances from stock) → **point-in-time at shipment/delivery** per the control indicators (Section 5A); FOB terms determine the exact moment.
- **ATO** (configured-to-order assemblies) → **point-in-time, often at customer acceptance** where configuration must be confirmed (Section 9D).
- **Large custom programs** (custom machinery, aerospace structures) → **over-time under criterion 3** when no alternative use **and** an enforceable cost-plus-margin right to payment exist, measured by **cost-to-cost**. BDO's aircraft-engine example shows such a program can still be **point-in-time** if the asset has alternative use ([BDO](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry)).
- Common topics: rights of return, volume rebates, extended (service-type) warranties, distributor consignment/sell-through.

### 14B. P — Process Manufacturing

- **Long-term supply contracts** (chemicals, food ingredients, basic metals) → analyze under **series guidance**; most deliveries transfer **point-in-time on shipment**, so each shipment/quantity is the recognition unit unless the over-time conditions are met.
- **Spot sales** → **point-in-time**.
- **Pricing escalators** (commodity-indexed prices) → **variable consideration**, constrained because indices are outside the entity's influence (Section 3G).
- Lower incidence of multi-PO bundles; warranties usually assurance-type.

### 14C. H — Hybrid / Mixed-Mode

- **CPG** (consumer packaged goods) → typically **point-in-time at delivery**; heavy use of **consideration payable to customer** (slotting fees, trade allowances) reducing revenue (Section 3F), volume rebates, and rights of return.
- **Medical devices** → frequently sold with **separate service contracts / maintenance** → **multiple POs** (device PIT + service over time); extended warranties common; substantive customer acceptance possible.
- Series guidance applies to repetitive supply lines.

### 14D. J — Job-Shop / Project

- **Almost always over-time under criterion 3** (custom, no alternative use; enforceable cost-plus-margin right to payment), measured by **cost-to-cost** (Section 5B/5C).
- **Change orders frequent** → contract-modification rules dominate (Section 6), usually **cumulative catch-up** on the single over-time PO.
- T&M arrangements often use the **right-to-invoice** expedient (Section 12).
- Contract assets (unbilled) and significant-judgment disclosures are prominent.

### 14E. E — ETO / Engineer-to-Order

- **Almost always over-time under criterion 3**; **cost-to-cost dominant**.
- **Significant financing component** analysis is most material here (long cycles, milestone/advance payments) (Section 3D).
- **Uninstalled-materials** issue is common (large procured components delivered to site but not yet integrated) → adjust cost-to-cost / recognize zero margin on those materials (Section 5C).
- **Warranty often service-type** (extended coverage, maintenance) → separate PO with difficult SSP estimation.
- Substantial **RPO/backlog** disclosure; heavy change-order activity; potential onerous-contract considerations (with the IFRS contract-level divergence in Section 13).

| Sub-type | Dominant strategy | Dominant Step 5 pattern | Dominant measure of progress | Signature complications |
|---|---|---|---|---|
| **D** | MTS / ATO | PIT (shipment / acceptance) | n/a (PIT) | returns, rebates, extended warranty, consignment |
| **P** | MTS / MTO | PIT (shipment) | n/a (PIT) / series | commodity escalators, series analysis |
| **H** | MTS / ATO | PIT (delivery / acceptance) | n/a (PIT) | slotting fees, multi-PO (device + service) |
| **J** | MTO / ETO | OT (criterion 3) | cost-to-cost | change orders, right-to-invoice |
| **E** | ETO | OT (criterion 3) | cost-to-cost | financing component, uninstalled materials, service warranty |

---

## Section 15 — Practical Implementation Checklist for Manufacturers

A controller can run a new manufacturing contract type through these steps:

1. **Step 1 — Contract.** Do all five criteria hold (approval/commitment, identifiable rights, identifiable payment terms, commercial substance, collectibility *probable* — likely to occur under U.S. GAAP, more-likely-than-not under IFRS)? Is this a PO, MSA, blanket PO, or LTSA — and what is the unit "contract"? Do any contracts need **combination** (tooling + production; design + build)?
2. **Step 2 — Performance obligations.** What are the promised goods/services? Which are **distinct** (capable of being distinct **and** separately identifiable)? Is there a **series**? Is the warranty **assurance** (not a PO) or **service-type** (a PO)? Is tooling a **separate PO** or a contract cost?
3. **Step 3 — Transaction price.** Fixed consideration plus **variable consideration** (rebates, returns, escalators, bonuses, liquidated damages) estimated by **expected value** or **most likely amount** and **constrained**. Significant **financing component**? Noncash consideration? **Consideration payable** to the customer (slotting/allowances)?
4. **Step 4 — Allocate.** Determine **SSP** for each PO (observable → adjusted market → expected-cost-plus-margin → residual). Allocate discounts and variable consideration (proportionate unless the specific-allocation criteria are met). Watch the **service-type-warranty SSP** and the **tooling-fee vs. per-unit** split.
5. **Step 5 — Recognize.** For each PO: **point-in-time** (control indicators; FOB terms; bill-and-hold; customer acceptance) or **over-time** (one of the three criteria — for custom work, criterion 3: **no alternative use + enforceable cost-plus-margin right to payment**)? If over-time, choose a **measure of progress** (cost-to-cost most common); handle **uninstalled materials** (zero margin) and **exclude wasted materials/inefficiencies**; account for estimate changes via **cumulative catch-up**.
6. **Costs (ASC 340-40).** Check other Topics first (ASC 330/360/350-40/340-10). Capitalize recoverable **costs to obtain** (commissions; one-year expedient available) and qualifying **costs to fulfill** (mandatory when criteria met; no one-year expedient). Amortize on the transfer pattern; test for impairment (no reversal under U.S. GAAP; reversal under IFRS).
7. **Disclosure.** Capture **disaggregation** (PIT vs OT, product/geography/customer/contract type), **contract balances** (receivables, contract assets, contract liabilities), **RPO/backlog** (long-cycle J/E; one-year exemption), **significant judgments** (timing, measure of progress, variable consideration), and **contract-cost** balances.
8. **Basis check.** Confirm the elected **reporting basis** (US GAAP vs IFRS) and route the Section 13 divergences accordingly (shipping/handling and sales-tax elections, collectibility threshold, contract-cost impairment reversal, onerous-contract level).

---

## Section 16 — Source Reference Table

All citations are to primary authoritative sources (the FASB Codification via DART, FASB, SEC, eCFR, IFRS Foundation) or to Big-Four / national-firm manufacturing-application guides, which are treated as **primary for interpretation** of the Codification in this lane (planning-doc citation discipline). URLs verified as resolving as of June 22, 2026. Verbatim cited-text verification is recorded in the Citation Verification Register (MFG-K-E, `Manufacturing_KPI_Citation_Verification_Register.xlsx`).

| Source | URL | Coverage in this document |
|--------|-----|---------------------------|
| FASB ASC 606 — DART (Deloitte Accounting Research Tool), canonical citation | [dart.deloitte.com — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606) | All five steps; modifications; warranties; repurchase/consignment/bill-and-hold/acceptance; returns; disclosure; expedients |
| Deloitte — Roadmap: Revenue Recognition (ASC 606) | [dart.deloitte.com — Roadmap](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition) | Interpretive roadmap; recent-ASU status |
| Deloitte — Roadmap Ch. 1.4, Step 1: Identify the Contract | [dart.deloitte.com — Step 1](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-1-overview/1-4-step-1-identify-contract) | Five contract criteria; failed-contract recognition |
| Deloitte — Roadmap Ch. 13.3, Costs of Fulfilling a Contract (ASC 340-40) | [dart.deloitte.com — Ch. 13.3](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-13-contract-costs/13-3-costs-fulfilling-a-contract) | Contract-cost capitalization, amortization, impairment |
| FASB (standard-setter, technical agenda) | [fasb.org](https://www.fasb.org) | Recent-ASU / agenda verification |
| SEC — Commission Guidance on Revenue Recognition for Bill-and-Hold Arrangements (Release 33-10402, 2017) | [sec.gov — 33-10402](https://www.sec.gov/files/rules/interp/2017/33-10402.pdf) | Bill-and-hold criteria |
| SEC Regulation S-K Item 303 (MD&A) | [ecfr.gov — S-K 303](https://www.ecfr.gov/current/title-17/chapter-II/part-229/subpart-229.300/section-229.303) | Revenue-trend / operating-metric MD&A disclosure |
| IFRS Foundation — IFRS 15 Revenue from Contracts with Customers | [ifrs.org — IFRS 15](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/) | IFRS five-step model; divergence baseline; PIR status |
| KPMG — Handbook: Revenue recognition | [kpmg.com — Revenue handbook](https://kpmg.com/us/en/frv/reference-library/2025/handbook-revenue-recognition.html) | Series; SSP; modifications; financing; expedients |
| EY — Financial Reporting Developments: Revenue from Contracts with Customers (ASC 606) | [ey.com — FRD ASC 606](https://www.ey.com/en_us/technical/accountinglink/financial-reporting-developments---revenue-from-contracts-with-c) | Comprehensive ASC 606 interpretation (cross-reference) |
| Grant Thornton — Revenue from Contracts with Customers: Navigating the guidance in ASC 606 and 340-40 | [grantthornton.com — ASC 606 & 340-40](https://www.grantthornton.com/insights/articles/audit/2022/navigating-asc-606-and-340-40) | Installation PO; SSP methods; liquidated damages; modifications |
| RSM US — Revenue Recognition for Industrial Entities | [rsmus.com — Industrial Entities (PDF)](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/revenue-recognition-for-industrial-entities.pdf) | Over-time/PIT criteria; control indicators; measure of progress; variable consideration; returns; warranties; contract costs |
| RSM US — A guide to revenue recognition | [rsmus.com — Revenue guide](https://rsmus.com/insights/financial-reporting/a-guide-to-revenue-recognition.html) | General ASC 606 interpretation (cross-reference) |
| RSM US — US GAAP vs IFRS: Revenue from Contracts with Customers | [rsmus.com — US GAAP vs IFRS (PDF)](https://rsmus.com/content/dam/rsm/insights/financial-reporting/us-gaap-vs-ifrs-comparisons/wp_as_us_gaap_vs_ifrs_revenue_recognition.pdf) | IFRS 15 divergence table (Section 13) |
| BDO — Revenue from Contracts with Customers – Manufacturing Industry | [bdo.com — Manufacturing guide](https://www.bdo.com/insights/industries/manufacturing/revenue-from-contracts-with-customers-manufacturing-industry) | Distinct PO; over-time criteria; right to payment; warranties; variable consideration; sell-through; contract costs; tooling (ASC 340-10) |
| Baker Tilly — Revenue recognition: what to know about uninstalled materials | [bakertilly.com — uninstalled materials](https://www.bakertilly.com/insights/revenue-recognition-uninstalled-materials) | Uninstalled-materials cost-to-cost adjustment (Section 5C) |
| RevenueHub — ASC 606 vs IFRS 15 (cross-reference) | [revenuehub.org — ASC 606 vs IFRS 15](https://www.revenuehub.org/article/asc-606-ifrs-15) | IFRS divergence cross-reference (never sole citation) |

---

*This document is part of the Advisacor Manufacturing Vertical Knowledge Stack (Module MFG-K-B, Wave 1). It is `DRAFT / SPEC — NOT EXECUTABLE — NOT LOCKED`, `executable: false`, `containsVerticalComplianceLogic: true`. All revenue-recognition conclusions generated by Advisacor are classified as `output_classification = 'recommendation_for_human_review'`. No conclusion in this document constitutes final accounting advice or audit-quality certification. Users must validate every ASC 606 / ASC 340-40 / ASC 460 paragraph citation against the current FASB Codification, and every IFRS 15 reference against the current IFRS Foundation standard, and must apply the analysis to their specific contracts, sub-segment (D / P / H / J / E), production strategy (MTS / MTO / ATO / ETO), and elected reporting basis (US GAAP or IFRS) before implementation. The point-in-time vs. over-time determination, the over-time measure of progress, and the variable-consideration constraint are facts-and-circumstances judgments flagged throughout as [JUDGMENT AREA]; they require professional judgment and, where enforceable-right-to-payment turns on contract law, legal review.*
