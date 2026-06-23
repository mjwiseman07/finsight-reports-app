---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: true
phase: Retail Vertical Knowledge Stack — Wave 1 / RTL-K-B
artifact: ASC 606 Sources Document
peer: docs/manufacturing/wave1/Manufacturing_ASC606_Sources.md
---

# Retail ASC 606 Revenue Recognition — Authoritative Sources Reference

**DRAFT / SPEC — NOT EXECUTABLE — NOT LOCKED**

`executable: false`
`containsVerticalComplianceLogic: true`

**Document Title:** Retail ASC 606 Revenue Recognition Source Document — Advisacor Retail Vertical Knowledge Stack, Module RTL-K-B
**Date Generated:** June 23, 2026
**Version:** 1.0 (DRAFT)
**Scope:** US retailers reporting under U.S. GAAP (ASC 606, *Revenue from Contracts with Customers*) and, where elected at the tenant level, IFRS (IFRS 15). Five retail-specific revenue-recognition surfaces: (1) Gift card breakage; (2) Loyalty programs (material right); (3) Returns reserve (right of return); (4) Consignment (control transfer); (5) Principal vs. agent (marketplaces). NAICS sectors 44–45 (Retail Trade) plus e-commerce (454110) and electronic marketplaces.
**Prepared for:** Advisacor — Wiseman Financial Technologies LLC (Matthew Wiseman, founder)
**Output Classification:** `recommendation_for_human_review`
**Citation Discipline:** Every authoritative claim cites a **primary source**. The canonical citation for the standard is the FASB Accounting Standards Codification, Topic 606, accessed via the Deloitte Accounting Research Tool (DART) at [dart.deloitte.com — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606), with paragraph text quoted **verbatim**. Supplemental authority: FASB direct ([fasb.org](https://www.fasb.org)); IFRS 15 from the IFRS Foundation ([ifrs.org](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/)); the U.S. Supreme Court for escheatment priority law. Big-Four and national-firm retail/consumer-products application guides (Deloitte DART, EY Financial Reporting Developments, PwC Accounting and Reporting Manual, KPMG Handbook, Grant Thornton, RSM US, BDO) are treated as **primary for interpretation** of how the Codification applies to retail. Definitions and treatments that turn on facts-and-circumstances judgment are flagged **[JUDGMENT AREA]**.
**IFRS 15 cross-reference posture:** IFRS 15 receives equal-depth treatment for every surface. The five-step model is converged with ASC 606; retail-relevant divergences are flagged inline within each surface (Sections II.5 / III.5 / IV.6 / V.5 / VI.6) and consolidated in Part VIII.

This document is the retail-vertical analog of `Manufacturing_ASC606_Sources.md` (Module MFG-K-B), which covered 17 sections with FASB ASC paragraph depth and IFRS 15 divergence. Its downstream siblings are the RTL-K-C disclosures document and the RTL-K-F Wave 2 binding crosswalk (Part IX). Terminology, citation style, and the `[JUDGMENT AREA]` flagging convention are kept consistent with the manufacturing precedent.

---

## How to Read This Document

Part I is a brief five-step refresher with retail application notes. Parts II–VI treat the five retail surfaces, each with: (a) definition and scope; (b) **paragraph-by-paragraph** FASB treatment with verbatim quotation; (c) estimation/methodology notes; (d) the IFRS 15 divergence; and (e) worked fact patterns where applicable. Part VII covers cross-surface interactions. Part VIII consolidates the ASC 605 / IFRIC 13 transition. Part IX is the Wave 2 binding crosswalk to RTL-K-F.

**Citation note on verbatim quotation:** Where a FASB paragraph is quoted, the text is reproduced from DART, which renders the Codification text. Some DART pages are subscription-gated to the standard "200-response" preview; per the manufacturing precedent this is acceptable, and verbatim text is cross-confirmed against FASB direct and Big-4 reproductions where the DART body is gated.

**Math notation:** inline math uses \( \cdots \); display math uses \[ \cdots \].

---

## Part I — ASC 606 Framework Refresher (Brief)

**[AUTHORITATIVE STANDARD — ASC 606-10-05-3 through 05-4; ASC 606-10-10-2]**

ASC 606, *Revenue from Contracts with Customers*, was created by Accounting Standards Update (ASU) 2014-09 and supersedes substantially all prior revenue guidance, including the retail-relevant legacy guidance in ASC 605. Its **core principle** is that an entity recognizes revenue "to depict the transfer of promised goods or services to customers in an amount that reflects the consideration to which the entity expects to be entitled in exchange for those goods or services" (ASC 606-10-10-2), and to achieve it an entity applies the **five-step model** ([Grant Thornton — *Revenue from Contracts with Customers (ASC 606)*](https://www.grantthornton.com/content/dam/grantthornton/website/assets/content-page-files/audit/pdfs/2022/revenue-from-contracts-with-customers-updated-220124.pdf)):

| Step | Action | Retail-specific application note |
|---|---|---|
| **Step 1** | Identify the contract with the customer (ASC 606-10-25-1) | For most retail sales the contract is the point-of-sale transaction; gift cards and loyalty enrollments create *forward* obligations evaluated at issuance |
| **Step 2** | Identify the performance obligations (ASC 606-10-25-14 through 25-22) | A loyalty point award is a **material right** (a separate PO); a right of return is **not** a separate PO; an assurance warranty is not a PO |
| **Step 3** | Determine the transaction price (ASC 606-10-32-2 through 32-27) | Right-of-return and breakage are **variable consideration** subject to the constraint; consideration collected on behalf of a third party (marketplace seller) is excluded |
| **Step 4** | Allocate the transaction price (ASC 606-10-32-28 through 32-41) | Loyalty material rights are allocated on a **relative standalone selling price** basis |
| **Step 5** | Recognize revenue when (or as) each PO is satisfied (ASC 606-10-25-23 through 25-30) | Gift-card revenue on redemption; loyalty revenue on point exercise or expiry; consignment revenue only on sale to end customer |

The standard's core-principle and five-step recitation is reproduced verbatim by [Grant Thornton — *Revenue from Contracts with Customers (ASC 606)*](https://www.grantthornton.com/content/dam/grantthornton/website/assets/content-page-files/audit/pdfs/2022/revenue-from-contracts-with-customers-updated-220124.pdf) and the [Deloitte — Roadmap: Revenue Recognition](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition). The transition from legacy ASC 605 to ASC 606 was effected by ASU 2014-09 (effective public business entities for annual periods beginning after December 15, 2017; all other entities after December 15, 2018) — see Part VIII and [RevenueHub — *Transition Dates and Methods*](https://www.revenuehub.org/article/transition-dates-and-methods).

---

## Part II — Surface 1: Gift Card Breakage

### II.1 Definition and Scope

A **gift card** is a prepaid stored-value instrument: the customer pays cash today in exchange for a contractual right to receive goods or services in the future. Under ASC 606 this prepayment is recorded as a **contract liability** at issuance, not as revenue ([Deloitte DART — *8.8 Customers' Unexercised Rights — Breakage*](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-8-customers-unexercised-rights-breakage)). The breakage analysis is the accounting for the portion of those prepayments that the holder never redeems.

Scoping dimensions that drive the analysis:

| Dimension | Variants | Accounting impact |
|---|---|---|
| **Redemption** | Reload-able (stored-value card topped up) vs. single-use | Reload-able cards aggregate balances; breakage estimated at portfolio level |
| **Form** | Physical plastic vs. digital / e-gift / in-app credit | Same ASC 606 treatment; digital cards often have richer redemption telemetry, improving breakage estimation |
| **Network** | Closed-loop (redeemable only at the issuing retailer) vs. open-loop (network-branded, redeemable broadly) | Closed-loop cards are squarely within ASC 606-10-55-46 through 55-49; open-loop / network-branded cards may be **financial instruments** within ASC 405-20 as amended by ASU 2016-04 (see II.3) |

The breakage guidance addressed here is the **ASC 606 customers'-unexercised-rights** model for closed-loop retailer cards. Open-loop prepaid stored-value products that are financial liabilities are addressed by ASU 2016-04 (II.3), which the FASB describes as "consistent with … the method of accounting for breakage described in ASC 606" ([Deloitte DART — *FASB Issues ASUs in Response to EITF Consensuses*](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2016/fasb-issues-asus-in-response-eitf)).

### II.2 FASB Paragraph-by-Paragraph Treatment

**[AUTHORITATIVE STANDARD — ASC 606-10-55-46 through 55-49]**

**ASC 606-10-55-46** (recognition of the contract liability upon prepayment), verbatim:

> "In accordance with paragraph 606-10-45-2, upon receipt of a prepayment from a customer, an entity should recognize a contract liability in the amount of the prepayment for its performance obligation to transfer, or to stand ready to transfer, goods or services in the future. An entity should derecognize that contract liability (and recognize revenue) when it transfers those goods or services and, therefore, satisfies its performance obligation."

Source: [Deloitte DART — *8.8 Customers' Unexercised Rights — Breakage* (ASC 606-10-55-46)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-8-customers-unexercised-rights-breakage).

**ASC 606-10-55-47** (the definition of breakage), verbatim:

> "A customer's nonrefundable prepayment to an entity gives the customer a right to receive a good or service in the future (and obliges the entity to stand ready to transfer a good or service). However, customers may not exercise all of their contractual rights. Those unexercised rights are often referred to as breakage."

Source: [Deloitte DART — *8.8 Customers' Unexercised Rights — Breakage* (ASC 606-10-55-47)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-8-customers-unexercised-rights-breakage).

**ASC 606-10-55-48** (the two recognition patterns — expected vs. not-expected breakage), verbatim:

> "If an entity expects to be entitled to a breakage amount in a contract liability, the entity should recognize the expected breakage amount as revenue in proportion to the pattern of rights exercised by the customer. If an entity does not expect to be entitled to a breakage amount, the entity should recognize the expected breakage amount as revenue when the likelihood of the customer exercising its remaining rights becomes remote. To determine whether an entity expects to be entitled to a breakage amount, the entity should consider the guidance in paragraphs 606-10-32-11 through 32-13 on constraining estimates of variable consideration."

Source: [Deloitte DART — *8.8 Customers' Unexercised Rights — Breakage* (ASC 606-10-55-48)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-8-customers-unexercised-rights-breakage); the proportional-vs-remote dichotomy is reproduced in [LegalClarity — *Accounting for Breakage Revenue Under ASC 606*](https://legalclarity.org/accounting-for-breakage-revenue-under-asc-606/) and in the FASB ASU summary at [Deloitte DART — *FASB Issues ASUs in Response to EITF Consensuses*](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2016/fasb-issues-asus-in-response-eitf).

*Drafting note:* the task labels the recognition pattern as 55-46, the "when expected" branch as 55-47, the "not expected / remote" branch as 55-48, and the state-law interaction as 55-49. The operative Codification text actually packs **both** recognition branches (proportional when expected; remote when not expected) into the single paragraph **55-48**, with 55-46 establishing the contract liability and 55-47 defining breakage. This document quotes the paragraphs as the Codification renders them and flags the mapping so RTL-K-F bindings reference the correct paragraph numbers.

**ASC 606-10-55-49** (interaction with state law / amounts payable to others — escheatment), summarized from the Codification and Big-4 guides: any prepaid amount the entity will be required to remit to a government entity (e.g., under an unclaimed-property statute) is **not** breakage the entity is entitled to; it remains a liability and is never recognized as revenue. As [LegalClarity — *Accounting for Breakage Revenue Under ASC 606*](https://legalclarity.org/accounting-for-breakage-revenue-under-asc-606/) puts the rule: "ASC 606-10-55-49 is blunt: any prepaid amount the company must eventually remit to a government entity stays as a liability and is never recognized as revenue." This is the bridge to the escheatment overlay in II.4.

### II.3 Estimating Breakage

**[JUDGMENT AREA]** Breakage estimation rests on a **portfolio approach** and **historical redemption-pattern analysis**.

- **Portfolio approach (ASC 606-10-10-4).** The Codification permits applying the guidance to a portfolio of contracts with similar characteristics if the entity reasonably expects the effects on the financial statements would not differ materially from applying it to individual contracts. Retailers use this to estimate breakage across a card population rather than card-by-card.
- **Historical redemption pattern.** The entity analyzes the historical curve of redemptions over time (e.g., what fraction of the issued balance is redeemed in months 1–3, 4–12, 13–24, etc.) and projects the never-redeemed tail. Expected breakage is then recognized **proportionally** as actual redemptions occur (per 55-48), so the breakage release tracks the redemption curve rather than being front-loaded.
- **The constraint applies.** Because breakage is an estimate of variable consideration, ASC 606-10-32-11 through 32-13 constrain it: the entity recognizes expected breakage only to the extent it is **probable that a significant reversal will not occur**. The FASB's ASU summary confirms the constraint governs breakage: an entity recognizes expected breakage "to the extent that it is probable that a significant reversal of the breakage amount will not subsequently occur" ([Deloitte DART — *FASB Issues ASUs in Response to EITF Consensuses*](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2016/fasb-issues-asus-in-response-eitf)).
- **Reassessment.** Breakage estimates are reassessed each reporting period, with changes accounted for as a change in accounting estimate ([Deloitte DART — *FASB Issues ASUs in Response to EITF Consensuses*](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2016/fasb-issues-asus-in-response-eitf)).

**ASU 2016-04, *Recognition of Breakage for Certain Prepaid Stored-Value Products* (Subtopic 405-20).** This ASU, issued in March 2016 in response to an EITF consensus, addresses prepaid stored-value products that are **financial liabilities** (e.g., certain open-loop / network-branded cards) — products that would otherwise fall under the financial-instrument derecognition guidance rather than ASC 606. It requires the same breakage methodology as ASC 606: "the entity will recognize the effects of the expected breakage 'in proportion to the pattern of rights expected to be exercised' by the product holder to the extent that it is probable that a significant reversal of the breakage amount will not subsequently occur … Otherwise, the expected breakage would be recognized when the likelihood becomes remote that the holder will exercise its remaining rights" ([IASPlus / Deloitte — *Heads Up: FASB Issues ASUs in Response to EITF Consensuses*](https://iasplus.com/content/f4cbf36b-094a-4839-b494-d81a94937fc7)). The FASB notes the ASU is "consistent with the views expressed by the SEC staff and the method of accounting for breakage described in ASC 606" ([IASPlus / Deloitte — *Heads Up*](https://iasplus.com/content/f4cbf36b-094a-4839-b494-d81a94937fc7)).

### II.4 State Escheatment / Unclaimed Property Law Layer

**[JUDGMENT AREA — JURISDICTIONAL OVERLAY: defer detailed state-by-state mapping to Wave 3]**

Breakage that the retailer is legally obligated to remit to a state under that state's **unclaimed property (escheatment)** statute is never revenue (per ASC 606-10-55-49). The governing federal common-law priority rules come from the U.S. Supreme Court.

- **Federal supremacy / priority rule — *Texas v. New Jersey*, 379 U.S. 674 (1965).** The Court held that "jurisdiction to escheat abandoned intangible personal property lies in the State of the creditor's last known address on the debtor's books and records or, absent such address or an escheat law, in the State of corporate domicile — but subject to later escheat to the former State if it proves such an address to be within its borders and provides for escheat of such property" ([*Texas v. New Jersey*, 379 U.S. 674 (1965) — Justia](https://supreme.justia.com/cases/federal/us/379/674/)). This established the **first-priority rule** (creditor's last known address) and the **second-priority rule** (state of the debtor/holder's incorporation) for abandoned intangibles such as unredeemed gift-card balances ([DeCarrera Law — *Unclaimed Property Priority Rules Established in Texas v. New Jersey*](https://decarreralaw.com/unclaimed-property/litigation/texas-v-new-jersey/)).
- **Federal preemption boundaries.** The priority order is a matter of federal common law; the Supreme Court reaffirmed and applied the *Texas v. New Jersey* framework in *Delaware v. Pennsylvania* (2023), confirming that the proceeds of abandoned financial products escheat "to the State of the creditor's last known address … or where such records are not kept, to the State in which the company holding the funds is incorporated" ([*Delaware v. Pennsylvania*, Cornell LII](https://www.law.cornell.edu/supremecourt/text/23O145)). Federal law fixes *which* state may take custody; the *amount and timing* of any retailer obligation is set by that state's own statute.
- **State-by-state variance.** Whether (and when) unredeemed gift-card balances escheat at all varies materially: many states **exempt** closed-loop merchant gift cards from escheat; others subject a percentage of the unredeemed balance to escheat after a dormancy period. This document **flags the state-by-state schedule as a jurisdictional overlay for Wave 3** and does not enumerate it here.
- **Delaware practice.** Because so many retailers are incorporated in Delaware, Delaware is the second-priority custodian for balances with no recorded address; Delaware's unclaimed-property administration is widely regarded as the most aggressive, making the "no last-known-address" tail particularly consequential for Delaware-incorporated retailers. (Flagged for Wave 3 detail.)

**Interaction with breakage recognition:** the breakage an entity may recognize is net of amounts expected to escheat. A retailer operating in escheat-imposing states must reduce its recognized breakage by the expected remittance, holding that portion as a liability (per ASC 606-10-55-49 and [LegalClarity — *Accounting for Breakage Revenue Under ASC 606*](https://legalclarity.org/accounting-for-breakage-revenue-under-asc-606/)).

### II.5 IFRS 15 Divergence

**[AUTHORITATIVE STANDARD — IFRS 15.B44 through B47]**

IFRS 15 does **not** have a separately titled "gift card breakage" paragraph; instead the customers'-unexercised-rights (breakage) guidance sits in **IFRS 15.B44–B47**, which the FASB expressly maps to ASC 606-10-55-46 through 55-49. The Deloitte roadmap states the breakage implementation guidance appears "in ASC 606-10-55-46 through 55-49 (paragraphs B44 through B47 of IFRS 15)" ([Deloitte DART — *8.8 Customers' Unexercised Rights — Breakage*](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-8-customers-unexercised-rights-breakage)). Substantive convergence: IFRS 15 applies the same proportional-when-expected / remote-when-not-expected dichotomy and treats unexercised rights within its customer-options and variable-consideration framework, citing the IFRS 15 standard text at [IFRS Foundation — IFRS 15](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/). The customer-options framework that anchors loyalty-type rights is IFRS 15.B39–B43 (see III.5); breakage on an unredeemed prepaid balance is the B44–B47 special case. **Practical convergence outcome:** for closed-loop retailer gift cards, a U.S. GAAP filer and an IFRS filer reach substantially the same recognition pattern; the escheatment overlay (II.4) is a U.S.-specific legal-remittance question, not an IFRS-vs-GAAP accounting divergence.

### II.6 Example Fact Patterns

**Example A — Expected breakage (proportional recognition).** A retailer sells $1,000 of closed-loop gift cards in a year. Based on a multi-year portfolio history, the retailer expects 80% ($800) to be redeemed and 20% ($200) to break (and the relevant states exempt merchant cards, so no escheat reduces the estimate). Per ASC 606-10-55-48, the retailer recognizes the $200 expected breakage **proportionally as the $800 is redeemed** — i.e., $200 of breakage recognized over time at 25% of each redemption (\(200/800 = 25\%\)), so the contract liability "will be further reduced by the breakage amount equaling 25 percent of the gift card amount being redeemed" ([IASPlus / Deloitte — *Heads Up*](https://iasplus.com/content/f4cbf36b-094a-4839-b494-d81a94937fc7)). This avoids front-loading breakage before redemption evidence accrues ([LegalClarity — *Accounting for Breakage Revenue Under ASC 606*](https://legalclarity.org/accounting-for-breakage-revenue-under-asc-606/)).

**Example B — Indeterminate breakage (remote-likelihood recognition).** A newly launched retailer has no reliable redemption history and cannot estimate breakage in a way that satisfies the constraint, **or** operates entirely in states that subject unredeemed balances to escheat. Because it does **not** expect to be entitled to a breakage amount, per ASC 606-10-55-48 it recognizes the expected breakage as revenue only "when the likelihood of the customer exercising its remaining rights becomes remote" — typically when the card expires or the dormancy/remote threshold is reached — recognizing the remaining contract liability in a single period at that point ([LegalClarity — *Accounting for Breakage Revenue Under ASC 606*](https://legalclarity.org/accounting-for-breakage-revenue-under-asc-606/)). Big-4 interpretive treatment of the same dichotomy appears across [Deloitte DART — Breakage chapter](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-8-customers-unexercised-rights-breakage) and the RSM consumer-products guide's breakage section ([RSM US — *Revenue recognition considerations for the consumer products industry*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/Changes-to-revenue-recognition-in-the-consumer-products-industry-202309.pdf)).

---

## Part III — Surface 2: Loyalty Programs (Material Right)

### III.1 Definition and Scope

A retail loyalty program grants the customer, by virtue of a current purchase, a future benefit the customer would not otherwise receive. Under ASC 606 such a benefit is a **customer option for additional goods or services** that, if it confers a **material right**, is a **separate performance obligation**. Program archetypes:

| Program type | Mechanic | ASC 606 characterization |
|---|---|---|
| **Points-based** | Earn points per dollar; redeem for goods/discounts | Classic material right; defer SSP of the points option |
| **Tier-based / status** | Spending unlocks status benefits (free shipping, early access) | Distinguish *accumulating* benefits (material right) from pure *status* benefits (often a marketing offer) — see III.6 |
| **Paid membership** (Amazon Prime-style) | Customer pays a fee for ongoing benefits | The membership fee is its own PO (often over time); embedded discounts may be separate material rights |
| **Cash-back** | Earn cash/credit toward future purchases | Material right if incremental to discounts available to the class of customer |
| **Partner / coalition** | Points earned/redeemed across third parties | Material right plus a principal-vs-agent question (who is obligated to supply awards) — cross-reference Part VI |

The defining test is whether the option provides a discount **incremental to the range of discounts typically given to that class of customer** ([Deloitte DART — *11.2 Determining Whether an Option … Represents a Material Right*](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-11-customer-options-for-additional/11-2-determining-whether-an-option)). [Stripe — *What is a material right?*](https://stripe.com/resources/more/what-is-a-material-right-how-to-account-for-it-with-asc-606) notes that "loyalty points or discounts on future buys can create a material right," requiring deferral of revenue until the points are used or expire.

### III.2 FASB Paragraph-by-Paragraph Treatment

**[AUTHORITATIVE STANDARD — ASC 606-10-25-23 through 25-30 (performance-obligation satisfaction) and ASC 606-10-55-41 through 55-45 (customer options / material right)]**

**Material-right identification — ASC 606-10-25-23 through 25-30.** Step 5's satisfaction model (revenue recognized when or as control transfers) is the recognition anchor for the material-right PO: the deferred option amount is recognized when the customer exercises the option (redeems points) or when the option expires. The promise to grant options that provide a material right is itself an identified promised good or service — the Codification lists "granting options to purchase additional goods or services (when those options provide a customer with a material right, as described in paragraphs 606-10-55-41 through 55-45)" among the promises in a contract ([Deloitte DART — *5.2 Promises in Contracts With Customers*](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-5-step-2-identify-performance/5-2-promises-in-contracts-with)).

**ASC 606-10-55-41** (customer options for additional goods/services). The option gives rise to a separate performance obligation only if it provides a **material right**; this is the gateway paragraph for the 55-42 through 55-45 sequence ([Deloitte DART — *11.2 Determining Whether an Option … Represents a Material Right* (referring to ASC 606-10-55-41 through 55-45)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-11-customer-options-for-additional/11-2-determining-whether-an-option)).

**ASC 606-10-55-42** (material right vs. marketing offer — the operative distinction), verbatim in relevant part:

> "[An] option gives rise to a performance obligation in the contract only if the option provides a material right to the customer that it would not receive without entering into that contract (for example, a discount that is incremental to the range of discounts typically given for those goods or services to that class of customer in that geographic area or market)."

Source: [Deloitte DART — *11.2 Determining Whether an Option … Represents a Material Right* (ASC 606-10-55-42)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-11-customer-options-for-additional/11-2-determining-whether-an-option). The objective of 55-42 and 55-43 "is to determine whether a customer option to receive discounted goods is independent of an existing contract" ([Deloitte DART — *11.2*](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-11-customer-options-for-additional/11-2-determining-whether-an-option)).

**ASC 606-10-55-43** (marketing-offer carve-out). Even where a present contract gives the customer a right to exercise an option, "that option is considered a marketing offer if there is not a material right" ([RSM US — *Revenue recognition for business and professional services* (quoting paragraph 606-10-55-43)](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/Revenue-recognition-for-business-and-professional-services-202310.pdf)). An option exercisable by any customer at the standard price (no incremental discount) is a marketing offer, not a PO.

**ASC 606-10-55-44** (estimating the standalone selling price of the option). The SSP of the option must reflect (a) the discount the customer would obtain on exercise, adjusted for (b) any discount the customer could receive without exercising the option, and (c) the **likelihood of exercise**. As the RSM consumer-products guide applies 55-44: "the entity estimates an 80 percent likelihood that a customer will redeem the voucher," and the SSP of the option reflects expected — not maximum — exercise ([RSM US — *Revenue recognition considerations for the consumer products industry* (applying ASC 606-10-55-44)](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/Changes-to-revenue-recognition-in-the-consumer-products-industry-202309.pdf)).

**ASC 606-10-55-45** (likelihood of exercise / breakage on the option). The SSP estimate incorporates the probability the option is exercised; the unexercised portion is "conceptually … a form of breakage (i.e., unexercised customer rights)" — the standalone selling price "should reflect the expected purchases … and not the maximum possible purchases" ([RSM US — *Revenue recognition considerations for the consumer products industry*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/Changes-to-revenue-recognition-in-the-consumer-products-industry-202309.pdf)). This is the cross-link to Surface 1 breakage (III.4).

**Recognition on exercise (DART interpretive — two acceptable alternatives).** When the customer exercises the material right, an entity may treat the exercise either as a continuation of the original contract (Alternative A — generally preferable) or as a contract modification (Alternative B — acceptable). Under Alternative A, "the additional consideration is allocated only to the additional performance obligation underlying the material right" ([Deloitte DART — *11.7 Customer's Exercise of a Material Right*](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-11-customer-options-for-additional/11-7-customer-s-exercise-a)).

### III.3 Standalone Selling Price Methodology

**[AUTHORITATIVE STANDARD — ASC 606-10-32-31 through 32-35; methods at 32-33; allocation objective at 32-28]**

Once the loyalty option is a PO, the transaction price is allocated on a **relative standalone selling price** basis (ASC 606-10-32-31). Where the SSP is not directly observable, the entity estimates it using one of the three methods the standard describes ([EY — *Financial Reporting Developments: Revenue from Contracts with Customers (ASC 606)*](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-us/technical/accountinglink/documents/ey-frdbb3043-08-07-2025-v2.pdf)):

1. **Adjusted market assessment approach** — evaluate the market in which the goods/services are sold and estimate the price a customer would be willing to pay.
2. **Expected cost plus a margin approach** — forecast the cost of satisfying the PO and add an appropriate margin.
3. **Residual approach** (only if certain conditions are met) — total transaction price less the sum of observable SSPs of other goods/services.

EY confirms the standard "states that suitable estimation methods include, but are not limited to, an adjusted market assessment approach, an expected cost plus a margin approach or a residual approach (if certain conditions are met)" ([EY — *FRD: Revenue from Contracts with Customers (ASC 606)*](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-us/technical/accountinglink/documents/ey-frdbb3043-08-07-2025-v2.pdf)). For loyalty points, the SSP of the option is built from the value per point × expected redemption rate (likelihood of exercise per 55-44/55-45), then allocated against the SSP of the goods sold in the originating transaction ([Stripe — *What is a material right?*](https://stripe.com/resources/more/what-is-a-material-right-how-to-account-for-it-with-asc-606)).

### III.4 Breakage on Loyalty Points

**[JUDGMENT AREA — cross-reference Surface 1]** Points that are never redeemed are loyalty-program breakage. The SSP of the option (III.3) already embeds the expected exercise rate (55-44/55-45), so a portion of the deferred amount is recognized as the *expected* points are redeemed and the unexercised tail is recognized when redeemed-or-expired — mirroring the Surface 1 proportional-vs-remote dichotomy of ASC 606-10-55-48. RSM expressly frames the unexercised loyalty option as "a form of breakage … discussed in Section 5.1.4" ([RSM US — *Revenue recognition considerations for the consumer products industry*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/Changes-to-revenue-recognition-in-the-consumer-products-industry-202309.pdf)). See Part II.3 for the estimation mechanics and the constraint (ASC 606-10-32-11 through 32-13).

### III.5 IFRS 15 Divergence

**[AUTHORITATIVE STANDARD — IFRS 15.B39 through B43; Illustrative Example IE249–IE252]**

IFRS 15 addresses loyalty/customer options in **IFRS 15.B39–B43** ("customer options for additional goods or services"), the converged analog of ASC 606-10-55-41 through 55-45. The Deloitte roadmap maps the ASC paragraphs to IFRS: the breakage special case is "paragraphs B44 through B47 of IFRS 15" ([Deloitte DART — Breakage chapter](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-8-customers-unexercised-rights-breakage)), and the customer-options material-right test sits in B39–B43, illustrated by the **customer loyalty programme** illustrative example **IE249–IE252** accompanying IFRS 15 ([IFRS Foundation — IFRS 15](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/)).

- **Practical convergence with ASC 606.** Both standards treat a loyalty point award that confers a material right as a separate performance obligation, defer a relative-SSP portion of the transaction price, and recognize it on redemption or expiry. A comparative academic study concludes that, examining IFRS 15 and IFRIC 13 within customer-loyalty programs, "there is no significant difference" in the deferral outcome ([*IFRS 15 and customer loyalty programmes*, ijbemp.com](https://ijbemp.com/files/d52d1d7f-18de-4c73-9b4a-2128c4a9315e.pdf)).
- **Difference from legacy IFRIC 13 (Customer Loyalty Programmes) — superseded.** Before IFRS 15, customer loyalty programmes were governed by **IFRIC 13**, which used an "award credits" allocation and a principal/agent split for third-party-supplied awards ([New Zealand equivalent to IFRIC 13, XRB](https://www.xrb.govt.nz/dmsdocument/354/)). IFRIC 13 was **superseded by IFRS 15** for annual reporting periods beginning on or after **1 January 2018** ([BetterRegulation — *IFRIC 13: Customer Loyalty Programmes*](https://service.betterregulation.com/document/259234); [IASPlus — *IFRIC 13*](https://www.iasplus.com/en-ca/standards/part-i-ifrs/ifric-interpretations/ifric13)). Both standards defer the points revenue, but IFRS 15 reframes the award as a material right within the unified five-step model rather than an "award credit" under the interpretation ([*MÜŞTERİ SADAKAT PROGRAMLARI / IFRS 15*, ijbemp.com](https://ijbemp.com/GoogleScholarPDF/777c5a7d-45ce-4e0c-a278-7766537aa854.pdf)).

### III.6 Tier-Based Program Complexity

**[JUDGMENT AREA]** Status benefits (free shipping, early access, dedicated support) earned by reaching a spending tier must be distinguished from **accumulating** points/credits. A pure status benefit that does not give the customer a transferable, incremental discount on a future purchase may be a **marketing offer** (no separate PO, per the 55-42/55-43 marketing-offer carve-out), whereas accumulating points redeemable for goods are a **material right** (a separate PO). Deloitte cautions that an option "designed to influence customer behavior" is an indicator of a material right and that incentives "may not be material for an individual contract but could be material for contracts in the aggregate and accounted for as a material right" ([Deloitte DART — *5.2 Promises in Contracts With Customers*](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-5-step-2-identify-performance/5-2-promises-in-contracts-with); [Deloitte DART — *C.10 Material Rights*](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/appendix-c-summary-issues-addressed-in/c-10-material-rights-chapter-11)). The aggregation point matters in retail because individually trivial point awards can be a material right in the aggregate.

---

## Part IV — Surface 3: Returns Reserve (Right of Return)

### IV.1 Definition and Scope

A right of return entitles the customer to a refund, credit, or exchange. Under ASC 606 the right of return is **variable consideration**, not a separate performance obligation. The standing-ready-to-accept-a-return obligation does not give rise to a distinct PO; instead, the return right reduces the revenue recognized at the point of sale and creates a refund liability and a return asset ([RevenueHub — *Rights of Return and Customer Acceptance in ASC 606*](https://www.revenuehub.org/article/rights-of-return-and-customer-acceptance)). CliftonLarsonAllen summarizes the rule: a right of return is "[n]ot a separate performance obligation under the new standard, BUT it affects the estimated transaction price for transferred goods" ([CLA — *ASC Topic 606 … Manufacturers and Distributors*](https://www.claconnect.com/-/media/files/presentations/asctopic606-howthenewrevenuerecognitionstandardmayimpactmanufacturersanddis.pdf)).

### IV.2 FASB Paragraph-by-Paragraph Treatment

**[AUTHORITATIVE STANDARD — ASC 606-10-32-2 through 32-13 (variable consideration); ASC 606-10-32-10 (refund liability); ASC 606-10-55-22 through 55-29 (sales with a right of return)]**

**Variable-consideration framework — ASC 606-10-32-2 through 32-13.** The transaction price is the amount the entity "expects to be entitled" to (32-2 through 32-4); variable consideration (including rights of return) is estimated by expected value or most likely amount (32-5 through 32-9) and constrained (32-11 through 32-13).

**ASC 606-10-32-10** (refund liability — verbatim):

> "An entity shall recognize a refund liability if the entity receives consideration from a customer and expects to refund some or all of that consideration to the customer. A refund liability is measured at the amount of consideration received (or receivable) for which the entity does not expect to be entitled (that is, amounts not included in the transaction price). The refund liability (and corresponding change in the transaction price and, therefore, the contract liability) shall be updated at the end of each reporting period for changes in circumstances. To account for a refund liability relating to a sale with a right of return, an entity shall apply the guidance in paragraphs 606-10-55-22 through 55-29."

Source: [Deloitte DART — *6.3 Variable Consideration* (ASC 606-10-32-10)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-6-step-3-determine-transaction/6-3-variable-consideration). DART notes that "[r]efund liabilities are first introduced in ASC 606 as a form of variable consideration — specifically, in ASC 606-10-32-10," and that the FASB "expressly linked the accounting for refund liabilities to their most common application, in sales with a right of return" ([Deloitte DART — *6.3 Variable Consideration*](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-6-step-3-determine-transaction/6-3-variable-consideration)).

**ASC 606-10-32-11** (the constraint — verbatim):

> "An entity shall include in the transaction price some or all of an amount of variable consideration estimated in accordance with paragraph 606-10-32-8 only to the extent that it is probable that a significant reversal in the amount of cumulative revenue recognized will not occur when the uncertainty associated with the variable consideration is subsequently resolved."

Source: [Deloitte DART — *6.3 Variable Consideration* (ASC 606-10-32-11)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-6-step-3-determine-transaction/6-3-variable-consideration). "Probable" means "likely to occur," a higher standard than "more likely than not" ([RevenueHub — *Variable Consideration and the Constraint*](https://www.revenuehub.org/article/variable-consideration-constraint)). ASC 606-10-32-12 directs the entity to "consider both the likelihood and the magnitude of the revenue reversal" ([Deloitte DART — *6.3 Variable Consideration* (ASC 606-10-32-12)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-6-step-3-determine-transaction/6-3-variable-consideration)).

**ASC 606-10-55-22** (return right is not a performance obligation). In a sale with a right of return, the entity does not account for the obligation to stand ready to accept a returned product as a performance obligation; instead it recognizes revenue net of expected returns, a refund liability, and a return asset. Grant Thornton lists "[s]ale with a right of return (paragraphs 606-10-55-22 through 55-29)" as the operative implementation-guidance range ([Grant Thornton — *Revenue from Contracts with Customers (ASC 606)*](https://www.grantthornton.com/content/dam/grantthornton/website/assets/content-page-files/audit/pdfs/2022/revenue-from-contracts-with-customers-updated-220124.pdf)).

**ASC 606-10-55-23** (recognize revenue net; record a refund liability). The entity recognizes revenue for the transferred products in the amount it expects to be entitled to (excluding products expected to be returned) and recognizes a refund liability for amounts expected to be returned ([RevenueHub — *Rights of Return and Customer Acceptance*](https://www.revenuehub.org/article/rights-of-return-and-customer-acceptance)).

**ASC 606-10-55-25** (refund liability for amounts not expected to be entitled — verbatim):

> "For any amounts received (or receivable) for which an entity does not expect to be entitled, the entity should not recognize revenue when it transfers products to customers but should recognize those amounts received (or receivable) as a refund liability."

Source: [Deloitte DART — *4.15 Sales With a Right of Return* (quoting ASC 606-10-55-25)](https://dart.deloitte.com/USDART/home/codification/broad-transactions/asc830-10/roadmap-foreign-currency-transactions-translations/chapter-4-foreign-currency-transactions/4-15-sales-with-a-right).

**ASC 606-10-55-24 through 55-29** (asset for the right to recover returned goods; measurement and update). The entity recognizes an **asset** (and a corresponding adjustment to cost of sales) for its right to recover products from customers on settling the refund liability. The asset is "initially measured at the carrying amount of the goods at the time of sale, less any expected costs to recover the goods and any expected reduction in value" ([CLA — *ASC Topic 606*](https://www.claconnect.com/-/media/files/presentations/asctopic606-howthenewrevenuerecognitionstandardmayimpactmanufacturersanddis.pdf)). Both the refund liability and the return asset are **updated each reporting period** for changes in estimate, with the asset assessed separately for impairment ([RevenueHub — *Rights of Return and Customer Acceptance*](https://www.revenuehub.org/article/rights-of-return-and-customer-acceptance); [HubiFi — *What Is a Right of Return Asset?*](https://www.hubifi.com/blog/right-of-return-accounting)).

### IV.3 Refund Liability vs. Asset for Returned Goods (Net-Presentation Prohibition)

**[AUTHORITATIVE STANDARD — ASC 606-10-55-22 through 55-29; presentation in ASC 606-10-45]** The refund liability and the return asset are presented **gross / separately** — netting is prohibited. RevenueHub: "[w]hile some may consider it reasonable to present refund liabilities and refund assets on a net basis, the standard explicitly states that these items should be presented separately," and accounting firms argue the refund asset should also be presented separately from inventory ([RevenueHub — *Rights of Return and Customer Acceptance* (citing EY §5.4; KPMG §5.4.20)](https://www.revenuehub.org/article/rights-of-return-and-customer-acceptance)). DART adds that a refund liability "represents the customer's conditional right to consideration from the seller … and does not represent a performance obligation. Consequently … the refund liability should be presented separately from the contract liability" and "would not be netted with any contract assets" ([Deloitte DART — *14-3 Refund Liabilities*](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-14-presentation/14-3-refund-liabilities)). **ASU 2016-12** (*Narrow-Scope Improvements and Practical Expedients*) clarified several Step 3 / transition points relevant to returns and collectibility ([Deloitte DART — *FASB Makes Narrow-Scope Amendments to Revenue Standard*](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2016/fasb-makes-narrow-scope-amendments-revenue); [Journal of Accountancy — *FASB issues revenue recognition changes, practical expedients*](https://www.journalofaccountancy.com/news/2016/may/fasb-issues-revenue-recognition-changes-practical-expedients-201614390/)).

### IV.4 Restocking Fees

**[JUDGMENT AREA]** A restocking fee charged on a return is generally treated either as a **reduction of the refund** (and thus reflected in the refund-liability measurement — i.e., the entity retains the fee and refunds less) or, where it represents consideration for a distinct activity, as a component of the transaction price. The Big-4 interpretive position is that restocking fees and any costs to recover the goods are factored into the measurement of the **return asset** ("less any expected costs to recover the goods … such as restocking costs, freight, damages") and the **refund liability** (the customer's net refund) — so the fee economics flow through the same returns-reserve mechanics rather than a separate PO ([Journal Entries Hub — *Right-of-Return Provision (ASC 606 / IFRS 15)*](https://www.journalentrieshub.com/entries/fmcg-returns-reserve-right-of-return); [HubiFi — *What Is a Right of Return Asset?*](https://www.hubifi.com/blog/right-of-return-accounting)).

### IV.5 Channel-Specific Return Patterns

**[JUDGMENT AREA — drives the expected-value estimate]** Return rates vary sharply by channel and category, which is the central estimation input under ASC 606-10-32-8 (expected value):

| Channel / category | Typical return-rate behavior | Estimation note |
|---|---|---|
| **E-commerce apparel/footwear** | Highest — frequently 20–30% | Wide range of outcomes raises constraint sensitivity ([Journal Entries Hub](https://www.journalentrieshub.com/entries/fmcg-returns-reserve-right-of-return)) |
| **Brick-and-mortar general merchandise** | Lower | Narrower historical distribution; estimate by SKU/season |
| **Subscription / curated box** | Pattern-specific (try-and-keep) | Returns concentrated in early cycles; new-product launches lack history ([RevenueHub — *Common ASC 606 Issues: Retail Entities*](https://www.revenuehub.org/article/asc-606-retail-entities)) |

The estimate is built "by product category, customer, and selling season — historical 12-month return rate by SKU provides the baseline," with analogous-product rates used for new products lacking history ([Journal Entries Hub — *Right-of-Return Provision*](https://www.journalentrieshub.com/entries/fmcg-returns-reserve-right-of-return)).

### IV.6 IFRS 15 Divergence

**[AUTHORITATIVE STANDARD — IFRS 15.B20 through B27]**

IFRS 15 addresses rights of return in **IFRS 15.B20–B27**, the converged analog of ASC 606-10-55-22 through 55-29. The mechanics are substantively identical: revenue is recognized only for goods **not** expected to be returned, a **refund liability** is recognized for expected refunds, and an **asset for the right to recover** goods is recognized (IFRS 15.B25), measured at the former carrying amount less expected recovery costs and any reduction in value. PwC's IFRS 15 retail guide states: "Revenue should not be recognised for goods expected to be returned, and a liability should be recognised for expected refunds to customers … An asset and corresponding adjustment to cost of sales should be recognised for the right to recover goods from customers on settling the refund liability" ([PwC — *Revenue from contracts with customers (IFRS 15 retailers)*](https://www.pwc.com/m1/en/services/cmaas/documents/ifrs15/ifrs-15-retailers.pdf)). The Journal Entries Hub confirms the convergence by citing both standards together: "Under ASC 606-10-55-22 / IFRS 15 B20-B27, when the right of return exists" ([Journal Entries Hub — *Right-of-Return Provision (ASC 606 / IFRS 15)*](https://www.journalentrieshub.com/entries/fmcg-returns-reserve-right-of-return)). **Convergence outcome:** no material GAAP-vs-IFRS divergence on right-of-return mechanics; PwC notes IFRS 15 likewise requires gross presentation of the refund obligation and the return asset, eliminating prior diversity ([PwC — *IFRS 15 retailers*](https://www.pwc.com/m1/en/services/cmaas/documents/ifrs15/ifrs-15-retailers.pdf)).

### IV.7 ASC 605 Transition

**[AUTHORITATIVE STANDARD — ASC 606-10-65-1]** Legacy returns provisioning under **ASC 605** (and the legacy "fixed-or-determinable / returns reasonably estimable" model) was superseded by ASC 606; the return right is now variable consideration under the constraint rather than a recognition bar. Adopters in 2018 (public) / 2019 (non-public) applied the transition guidance in **ASC 606-10-65-1**, choosing full retrospective or modified retrospective transition (see Part VIII), with the modified-retrospective method recording a cumulative-effect adjustment to opening retained earnings under ASC 606-10-65-1(i) and disclosing line-item impacts ([Deloitte DART — *ASC 606 Is Here — How Do Your Revenue Disclosures Stack Up?*](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2018/asc-606-is-here-how-do)).

---

## Part V — Surface 4: Consignment (Control Transfer)

### V.1 Definition and Scope

In a **consignment arrangement** a party (the consignor) delivers product to another party (the consignee) for sale to end customers, **without** transferring control of the product to the consignee. Because control has not passed, the consignor does **not** recognize revenue on delivery to the consignee. Retail-specific patterns include department stores and specialty boutiques accepting third-party inventory, antique malls and consignment shops, and brand "shop-in-shop" concessions. The consignor continues to own the goods, which remain in the consignor's inventory until sold to the end customer ([LinkedIn / W. Chowdhury — *Consignment: [IFRS 15, B77-B78]*](https://www.linkedin.com/pulse/consignment-ifrs-15-b77-b78-wazed-chowdhury); [Ciferi — *Consignment Arrangement glossary*](https://ciferi.com/glossary/consignment-arrangement)).

### V.2 FASB Paragraph-by-Paragraph Treatment

**[AUTHORITATIVE STANDARD — ASC 606-10-25-23 (control transfer); ASC 606-10-55-79 through 55-80 (consignment)]**

**ASC 606-10-25-23** (transfer of control / satisfaction of a performance obligation). An entity recognizes revenue when (or as) it satisfies a performance obligation by transferring a promised good or service — i.e., when the customer obtains **control**. In a consignment, control does not pass to the consignee on delivery, so no revenue is recognized then ([BDO — *Revenue Recognition Under ASC 606 (Blueprint)*](https://arch.bdo.com/getContentAsset/118430f1-fe4d-4112-adf6-884d6a0347f3/bb620d56-5e9c-4774-8d17-fb9323eefdf4/Revenue-Recognition-Under-ASC-606-BDO-Blueprint-10-2025.pdf?language=en)).

**ASC 606-10-55-79** (consignment overview — verbatim):

> "When an entity delivers a product to another party (such as a dealer or a distributor) for sale to end customers, the entity should evaluate whether that other party has obtained control of the product at that point in time."

Source: [Deloitte DART — *8.6 Revenue Recognized at a Point in Time* (ASC 606-10-55-79)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-6-revenue-recognized-a-point).

**ASC 606-10-55-80** (indicators of a consignment arrangement — verbatim):

> "Indicators that an arrangement is a consignment arrangement include, but are not limited to, the following:
> 1. The product is controlled by the entity until a specified event occurs, such as the sale of the product to a customer of the dealer, or until a specified period expires.
> 2. The entity is able to require the return of the product or transfer the product to a third party (such as another dealer).
> 3. The dealer does not have an unconditional obligation to pay for the product (although it might be required to pay a deposit)."

Source: [Deloitte DART — *8.6 Revenue Recognized at a Point in Time* (ASC 606-10-55-80)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-6-revenue-recognized-a-point).

### V.3 Control-Transfer Indicators (ASC 606-10-25-30)

**[AUTHORITATIVE STANDARD — ASC 606-10-25-30]** When the consignment indicators (55-80) are absent and the question is whether control has in fact passed, the entity applies the five point-in-time control indicators of **ASC 606-10-25-30**, which DART quotes: "an entity shall consider indicators of the transfer of control, which include, but are not limited to, the following" ([Deloitte DART — *8.6 Revenue Recognized at a Point in Time* (ASC 606-10-25-30)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-6-revenue-recognized-a-point)):

1. **Present right to payment** — the entity has a present right to payment for the asset.
2. **Legal title** — the customer has legal title to the asset.
3. **Physical possession** — the entity has transferred physical possession of the asset to the customer (DART: the customer's physical possession "may indicate that the customer has obtained control of the asset," per ASC 606-10-25-30(c)).
4. **Significant risks and rewards of ownership** — the customer has the significant risks and rewards of ownership.
5. **Customer acceptance** — the customer has accepted the asset.

Applied to the consignment fact pattern, indicators 1, 3, and 4 typically point **away** from control transfer to the consignee: the consignee has physical possession but no unconditional obligation to pay (no present right to payment for the consignor against the consignee), and the consignor retains inventory risk (risks and rewards) until end-customer sale ([Deloitte DART — *8.6 Revenue Recognized at a Point in Time*](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-6-revenue-recognized-a-point)).

### V.4 Revenue Recognition Timing

The **consignor** recognizes revenue only when the consignee sells the product to the end customer (or when control otherwise transfers, e.g., a specified period expires). At that point the consignor records the sale and removes the related inventory ([LinkedIn / W. Chowdhury — *Consignment: [IFRS 15, B77-B78]*](https://www.linkedin.com/pulse/consignment-ifrs-15-b77-b78-wazed-chowdhury)). The **consignee** does not recognize the gross sale; it recognizes only its **fee or commission** for arranging the sale — i.e., the consignee is acting as an agent for the consigned goods (cross-reference Part VI principal-vs-agent). Any deposit paid by the consignee is recorded as a payable/receivable, not as a purchase ([LinkedIn / W. Chowdhury — *Consignment*](https://www.linkedin.com/pulse/consignment-ifrs-15-b77-b78-wazed-chowdhury)).

### V.5 IFRS 15 Divergence

**[AUTHORITATIVE STANDARD — IFRS 15.B77 through B78]** IFRS 15 addresses consignment in **IFRS 15.B77–B78**, the converged analog of ASC 606-10-55-79 through 55-80, with **substantively identical** indicators and only minor wording differences. The IFRS standard text lists the same three indicators — the entity controls the product until a specified event/period, the entity can require return or transfer to a third party, and the dealer lacks an unconditional obligation to pay ([IFRS Community — *Performance Obligations (IFRS 15) — Consignment arrangements*](https://ifrscommunity.com/knowledge-base/ifrs-15-performance-obligations-and-timing-of-revenue-recognition/); [IFRS Foundation — IFRS 15 (standard PDF, B77–B78)](https://objectstorage.ap-dcc-gazipur-1.oraclecloud15.com/n/axvjbnqprylg/b/V2Ministry/o/office-frc/2024/12/cd9a4e6eedf044ef94dde53a5390bc8c.pdf)). IFRS 15.B77 is described as treating consignment "as a form of bill-and-hold in reverse: the goods sit at the consignee's location, but the consignor keeps control," and the consignor recognizes revenue only on the consignee's onward sale ([Ciferi — *Consignment Arrangement glossary*](https://ciferi.com/glossary/consignment-arrangement)). **Convergence outcome:** no material divergence; both standards key recognition to control, not physical possession.

### V.6 Inventory Disclosure Interaction (Cross-Reference ASC 330 → RTL-K-C)

Because the consignor retains control, **consigned goods remain in the consignor's inventory** under ASC 330 and are **excluded** from the consignee's inventory — the consignee never owns them ([Ciferi — *Consignment Arrangement glossary*](https://ciferi.com/glossary/consignment-arrangement)). This is a recognition-vs-disclosure interaction: the ASC 606 control conclusion (no transfer to consignee) drives the ASC 330 inventory presentation (consignor includes; consignee excludes). The detailed inventory-disclosure mechanics (ASC 330 and any consigned-goods footnote disclosure) are deferred to the **RTL-K-C disclosures document** — flagged here as a forward cross-reference.

---

## Part VI — Surface 5: Principal vs. Agent (Marketplaces)

### VI.1 Definition and Scope

When another party is involved in providing goods or services to the end customer, the reporting entity must determine whether it is a **principal** (controls the specified good or service before transfer; recognizes **gross** revenue) or an **agent** (arranges for another party to provide the good or service; recognizes **net** commission). This is the central question for retail marketplaces and intermediated channels:

| Pattern | Typical question |
|---|---|
| **Amazon 3P (third-party seller marketplace)** | Does Amazon control the seller's goods before transfer, or merely facilitate? |
| **eBay / Etsy** | Marketplace facilitator vs. principal |
| **Shopify partner stores** | Platform vs. merchant of record |
| **Walmart Marketplace** | Facilitator vs. principal |
| **Drop-ship** | Retailer never takes possession; manufacturer ships direct (see VI.7) |
| **Fulfillment-by-Amazon (FBA) variations** | Logistics service vs. control of inventory |

The analysis is two-step: (1) identify the **specified good or service** to the end customer; (2) assess whether the entity **controls** that specified good or service before transfer ([RevenueHub — *Principal/Agent Considerations (Gross vs Net) in ASC 606*](https://www.revenuehub.org/article/principalagent-considerations-gross-vs-net)).

### VI.2 FASB Paragraph-by-Paragraph Treatment

**[AUTHORITATIVE STANDARD — ASC 606-10-55-36 through 55-40]**

**ASC 606-10-55-36 / 55-37** (control is the principle). "An entity is a principal if it controls the specified good or service before that good or service is transferred to a customer" (ASC 606-10-55-37) ([RevenueHub — *Principal/Agent Considerations (Gross vs Net)* (quoting ASC 606-10-55-37)](https://www.revenuehub.org/article/principalagent-considerations-gross-vs-net)). The meaning of control is consistent with ASC 606-10-25-25 — "the ability to direct the use of an asset and obtain substantially all of the remaining benefits from it" ([Rashty — *Amendment to Gross Versus Net Revenue Recognition* (ASU 2016-08)](http://josefrashty.com/uploads/3/4/1/9/34190589/2017-01_gr_vs._n_tcpa.pdf)). The BillingPlatform summary: everything "flows from one question: does the entity control the specified good or service before transferring it to the customer? … (ASC 606-10-55-36)" ([BillingPlatform — *ASC 606 Principal vs. Agent*](https://billingplatform.com/blog/asc-606-principal-vs-agent)).

**ASC 606-10-55-37B** (principal recognizes gross). An entity that is a principal "recognizes revenue in the gross amount of consideration to which it expects to be entitled in exchange for those goods or services transferred" ([IFRS Foundation / FASB staff paper — *Principal versus Agent Considerations* (quoting 606-10-55-37 [B35])](https://www.ifrs.org/content/dam/ifrs/meetings/2015/june/iasb/revenue-from-contracts-with-customers/ap7a-principal-versus-agent-considerations.pdf); [Rashty — *Gross Versus Net*](http://josefrashty.com/uploads/3/4/1/9/34190589/2017-01_gr_vs._n_tcpa.pdf)).

**ASC 606-10-55-38** (agent recognizes net). "ASC 606-10-55-38 states that an entity is an agent and recognizes revenue in the net amount if the entity's performance obligation is to arrange for another entity to render goods and services" ([Rashty — *Amendment to Gross Versus Net Revenue Recognition*](http://josefrashty.com/uploads/3/4/1/9/34190589/2017-01_gr_vs._n_tcpa.pdf)).

**ASC 606-10-55-39** (the three indicators that the entity controls the good/service — i.e., is a principal), per the ASU 2016-08 revision, verbatim list as reproduced by Deloitte:

> "1. The entity is primarily responsible for fulfilling the promise to provide the specified good or service" to the customer (including responsibility for the good or service meeting customer expectations);
> 2. The entity has inventory risk before the specified good or service has been transferred to a customer or after transfer of control to the customer (e.g., if the customer has a right of return);
> 3. The entity has discretion in establishing the price for the specified good or service.

Source: [Deloitte / IASPlus — *Revenue Recognition: Evaluating Whether an Entity Is Acting as a Principal or an Agent* (quoting the ASC 606-10-55-39 indicators)](https://iasplus.com/content/1ef6d9b1-8b59-44c0-a07f-fa681dac2b22); enumerated identically by [RevenueHub — *Principal/Agent Considerations (Gross vs Net)*](https://www.revenuehub.org/article/principalagent-considerations-gross-vs-net). The indicators **support**, but do not override, the control assessment: "[a]n evaluation of the indicators does not override or replace the control evaluation, nor is it the entirety of the control evaluation" ([IFRS Foundation / FASB staff — *Principal versus Agent Considerations*](https://www.ifrs.org/content/dam/ifrs/meetings/2015/june/iasb/revenue-from-contracts-with-customers/ap7a-principal-versus-agent-considerations.pdf)).

**ASC 606-10-55-40** (agent commission recognition). An agent recognizes revenue in the amount of any fee or commission to which it expects to be entitled in exchange for arranging for the other party to provide its goods or services ([RevenueHub — *Principal/Agent Considerations (Gross vs Net)*](https://www.revenuehub.org/article/principalagent-considerations-gross-vs-net)).

### VI.3 Three-Factor Control Test (ASU 2016-08)

**[AUTHORITATIVE STANDARD — ASU 2016-08, *Principal Versus Agent Considerations (Reporting Revenue Gross Versus Net)*]** ASU 2016-08, issued March 2016, "amended the principal-versus-agent implementation guidance and illustrations in ASU 2014-09 to clarify how the principal-versus-agent indicators should be evaluated to support an entity's conclusion that it controls a specified good or service before it is transferred to a customer" ([Deloitte / IASPlus — *Evaluating Whether an Entity Is Acting as a Principal or an Agent*](https://iasplus.com/content/1ef6d9b1-8b59-44c0-a07f-fa681dac2b22)). The ASU reframed the indicators around the three control-supporting factors:

1. **Primary responsibility for fulfilling the promise** to provide the specified good or service (including responsibility for acceptability).
2. **Inventory risk** before transfer to the customer (or after, if the customer has a right of return).
3. **Discretion in establishing the price** for the specified good or service.

These are **evidence, not a mechanical three-part test**: "[m]eeting two of three doesn't automatically make the entity a principal. Failing two of three doesn't make it an agent" ([BillingPlatform — *ASC 606 Principal vs. Agent*](https://billingplatform.com/blog/asc-606-principal-vs-agent)). The ASU also clarified the unit of account and that the indicator list is not exhaustive ([Rashty — *Amendment to Gross Versus Net Revenue Recognition*](http://josefrashty.com/uploads/3/4/1/9/34190589/2017-01_gr_vs._n_tcpa.pdf)).

### VI.4 EITF 99-19 Legacy

**[LEGACY — SUPERSEDED]** Before ASC 606, gross-vs-net presentation was governed by **EITF 99-19, *Reporting Revenue Gross as a Principal versus Net as an Agent*** (codified in legacy ASC 605-45). EITF 99-19 used a **risks-and-rewards** model with "eight indicators that suggested an entity was a principal and three indicators that suggested an entity was an agent" ([Deloitte / IASPlus — *Evaluating Whether an Entity Is Acting as a Principal or an Agent*](https://iasplus.com/content/1ef6d9b1-8b59-44c0-a07f-fa681dac2b22)). ASC 606 (as clarified by ASU 2016-08) **superseded** that approach: "[t]he revenue recognition model has changed from a risks and rewards model to a model based on control (ASC 606-10-55-37)" ([Rashty — *Amendment to Gross Versus Net Revenue Recognition*](http://josefrashty.com/uploads/3/4/1/9/34190589/2017-01_gr_vs._n_tcpa.pdf)). The transition therefore can change the gross-vs-net answer for marketplaces that previously concluded under the legacy risks-and-rewards indicators.

### VI.5 Gross vs. Net Presentation and Retail KPI Impact

The principal/agent conclusion drives the income-statement geography: a principal reports the **entire** sale amount as gross revenue; an agent reports only the **net commission** ([HubiFi — *IFRS 15 B34 Principal vs Agent*](https://www.hubifi.com/blog/agent-principal-ifrs15); [AccountingTools — *Revenue at gross or net*](https://www.accountingtools.com/articles/revenue-at-gross-or-net)). This "fundamentally changes how your company's size and performance are presented" ([HubiFi — *IFRS 15 B34 Principal vs Agent*](https://www.hubifi.com/blog/agent-principal-ifrs15)). **Retail KPI impact:** because gross-vs-net moves the top line without changing gross profit dollars on an agent commission, it materially distorts revenue-based KPIs — **Average Order Value (AOV)** and **GMROI** (Gross Margin Return on Inventory Investment) computations must be calibrated to whether the entity reports gross (principal) or net (agent); a marketplace reporting net commission has a far smaller "revenue" denominator than a principal reporting GMV. This is a Wave 2 binding trap (Part IX) — the same physical transaction yields different KPI inputs depending on the principal/agent flag.

### VI.6 IFRS 15 Divergence

**[AUTHORITATIVE STANDARD — IFRS 15.B34 through B38; Illustrative Examples IE231–IE239]** IFRS 15 addresses principal vs. agent in **IFRS 15.B34–B38**, applying the **same control principle and the same three indicators** as ASC 606 (the FASB and IASB amended the guidance jointly via ASU 2016-08 and the corresponding IFRS 15 *Clarifications*). IFRS 15.B34 states: "When another party is involved in providing goods or services to a customer, the entity shall determine whether the nature of its promise is a performance obligation to provide the specified goods or services itself (ie the entity is a principal) or to arrange for those goods or services to be provided by the other party (ie the entity is an agent)" ([EFRAG — *Clarifications to IFRS 15* (quoting IFRS 15.B34)](https://www.efrag.org/system/files/sites/webpublishing/Project%20Documents/330/Clarifications%20to%20IFRS%2015%20-%20IASB%20Amendments.pdf)). IFRS 15.B37 lists the same indicators (primary responsibility, inventory risk, pricing discretion) ([IFRS Community — *Principal vs Agent, or Reporting Revenue Gross vs Net*](https://ifrscommunity.com/knowledge-base/principal-vs-agent-revenue-gross-vs-net/)). The principal/agent illustrative examples are **IE230–IE239** (e.g., IE231–IE232 describing an entity that arranges for a supplier to deliver goods directly and concludes it is an agent) ([annualreporting.info — *IFRS 15 — entity is an agent (IE232)*](https://annualreporting.info/intfinrepstan/ifrs-15-entity-is-an-agent/)). **Convergence outcome:** substantively converged; both use the control-based two-step framework and the same three indicators, and the FASB staff paper confirms the joint cross-reference (606-10-55-37 [B35]; 606-10-55-39 [B37]) ([IFRS Foundation / FASB staff — *Principal versus Agent Considerations*](https://www.ifrs.org/content/dam/ifrs/meetings/2015/june/iasb/revenue-from-contracts-with-customers/ap7a-principal-versus-agent-considerations.pdf)).

### VI.7 Drop-Ship Arrangements

**[JUDGMENT AREA]** In a **drop-ship** arrangement the retailer never takes physical possession: the manufacturer (or distributor) ships directly to the end customer at the retailer's direction. The principal/agent question turns on whether the retailer **controls** the specified good before transfer — which can occur even without physical possession (e.g., the retailer obtains legal title momentarily, bears inventory/return risk, sets the price, and is primarily responsible for fulfillment). The Big-4 interpretive position emphasizes that "momentary control before transfer to the customer may not qualify," and that an entity can be a principal where it "first obtains control of the inputs to the specified good or service" before directing transfer — the assessment looks to inventory risk, pricing discretion, and primary responsibility rather than possession ([RevenueHub — *Principal/Agent Considerations (Gross vs Net)*](https://www.revenuehub.org/article/principalagent-considerations-gross-vs-net); [IFRS Foundation — *Principal versus agent: IT resellers (IFRS 15)*](https://www.ifrs.org/content/dam/ifrs/groups/ifric/requests-to-be-considered-at-a-future-committee-meeting/submission-principal-versus-agent-it-resellers-ifrs-15.pdf)). Drop-ship retailers that set price, bear return/inventory risk, and are the customer-facing obligor typically conclude **principal/gross**; pure facilitators conclude **agent/net**.

---

## Part VII — Cross-Surface Interactions

These interactions are where two surfaces compose in a single retail transaction. Each is a `[JUDGMENT AREA]` and a Wave 2 binding hazard (Part IX).

### VII.1 Gift Card + Loyalty Stacking

Two composite patterns: (a) a **gift card purchased with loyalty points** — the points redemption is exercise of a material right (Part III) and the resulting gift card is a new prepaid contract liability (Part II); the entity should not double-count revenue (the points were already deferred). (b) **Loyalty points earned on a gift-card purchase** — generally a gift-card *sale* is a financing/prepayment event, not a revenue event, so awarding points on the purchase requires care that the material-right SSP allocation does not draw from the (not-yet-recognized) gift-card contract liability. Both rest on the breakage-and-material-right interaction of ASC 606-10-55-46 through 55-49 and 55-41 through 55-45 ([Deloitte DART — Breakage chapter](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-8-customers-unexercised-rights-breakage); [Deloitte DART — *11.2 Material Right*](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-11-customer-options-for-additional/11-2-determining-whether-an-option)).

### VII.2 Returns + Loyalty

When a purchase that earned loyalty points is **returned**, the points award (material right) must be **reversed** in tandem with the refund-liability adjustment (Part IV). The transaction-price allocation that funded the material right is unwound proportionally as the refund liability is settled, consistent with the period-end update requirement of ASC 606-10-32-10 and the material-right SSP mechanics of ASC 606-10-55-44 ([Deloitte DART — *6.3 Variable Consideration* (ASC 606-10-32-10)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-6-step-3-determine-transaction/6-3-variable-consideration); [Deloitte DART — *11.2 Material Right*](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-11-customer-options-for-additional/11-2-determining-whether-an-option)).

### VII.3 Marketplace + Returns

On a third-party marketplace sale, the **principal/agent determination drives who carries the refund liability**. If the marketplace is a **principal** (controls the good before transfer), it recognizes gross revenue and carries the full refund liability and return asset (Part IV mechanics). If it is an **agent**, it recognizes only net commission and the **seller** (the principal) carries the refund liability; the agent's only return exposure is any commission clawback. This is the intersection of ASC 606-10-55-36 through 55-40 (Part VI) and 606-10-55-22 through 55-29 (Part IV) — note that inventory risk "before or after (i.e., customer has a right of return)" is itself a principal indicator under ASC 606-10-55-39 ([RevenueHub — *Principal/Agent Considerations (Gross vs Net)*](https://www.revenuehub.org/article/principalagent-considerations-gross-vs-net)).

### VII.4 Consignment + Returns

When consigned goods are **returned** by the end customer, the control-transfer that occurred on the end-customer sale (Part V) reverses: the consignor (who recognized revenue on the onward sale) records a refund liability and recovers the return asset (Part IV), and the goods return to the **consignor's** inventory under ASC 330 (Part V.6) — not the consignee's. The consignee's commission (agent fee, Part VI) is correspondingly reversed. This composes ASC 606-10-55-79/80 (consignment) with 606-10-55-22 through 55-29 (returns) ([Deloitte DART — *8.6 Revenue Recognized at a Point in Time*](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-6-revenue-recognized-a-point); [RevenueHub — *Rights of Return and Customer Acceptance*](https://www.revenuehub.org/article/rights-of-return-and-customer-acceptance)).

---

## Part VIII — Transition from ASC 605 / IFRIC 13

### VIII.1 Effective Date

ASC 606 (ASU 2014-09) is effective for **public business entities** for annual reporting periods beginning after **December 15, 2017** (i.e., calendar 2018), and for **all other entities** for annual periods beginning after **December 15, 2018** (calendar 2019), with interim periods beginning after December 15, 2019 ([RevenueHub — *Transition Dates and Methods*](https://www.revenuehub.org/article/transition-dates-and-methods); [EY — *Comprehensive Guide to Revenue from Contracts with Customers*](https://www.reit.com/sites/default/files/meetings/REITWise17/Implementing%20the%20Rev%20Rec%20Standard/EY%20Comprehensive%20Guide%20to%20Revenue%20from%20Contracts%20with%20Customers.pdf)). **IFRS 15** has a single effective date — annual periods beginning on or after **1 January 2018** (early application permitted from 1 January 2017) ([RevenueHub — *Transition Dates and Methods*](https://www.revenuehub.org/article/transition-dates-and-methods)).

### VIII.2 Transition Methods

ASC 606 offers a choice between the **full retrospective method** and the **modified retrospective method**. Under full retrospective, the standard is applied to all prior periods presented per ASC 250; under modified retrospective, it is applied "with a recorded cumulative adjustment to opening retained earnings in the year of adoption" ([Deloitte DART — *ASC 606 Is Here — How Do Your Revenue Disclosures Stack Up?*](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2018/asc-606-is-here-how-do)). Both methods are anchored in the transition guidance of **ASC 606-10-65-1** ([Deloitte — *Heads Up: The New Revenue Standard — Adoption and Transition*](https://www2.deloitte.com/content/dam/Deloitte/us/Documents/audit/ASC/HU/2016/us-aers-headsup-the-new-revenue-standard-adoption-and-transition-observations-011416.pdf)).

### VIII.3 Required Transition Disclosures

**[AUTHORITATIVE STANDARD — ASC 606-10-65-1; ASC 606-10-50-1 and 50-2]** Entities applying the modified retrospective method must, under **ASC 606-10-65-1(i)(1) and (2)**, "disclose the amount by which each financial statement line item is affected by the application of the new revenue standard in the current period, as well as an explanation of the reasons for any significant changes," and under **ASC 606-10-65-1(h)** whether the guidance was applied to all contracts or only those not completed at the date of initial application ([Deloitte DART — *ASC 606 Is Here*](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2018/asc-606-is-here-how-do)). Under **both** methods entities disclose whether they applied the transition practical expedients in **ASC 606-10-65-1(f)** ([Deloitte DART — *ASC 606 Is Here*](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2018/asc-606-is-here-how-do)). The ongoing revenue disclosures (disaggregation, contract balances, performance obligations, significant judgments) sit in **ASC 606-10-50-1 and 50-2** and are developed in RTL-K-C.

### VIII.4 Legacy Items (Superseded References)

| Legacy authority | Subject | Superseded by | Citation |
|---|---|---|---|
| **EITF 99-19 / ASC 605-45** | Reporting revenue gross vs. net (risks-and-rewards model) | ASC 606-10-55-36 through 55-40 (control model), via ASU 2016-08 | [Rashty — *Gross Versus Net*](http://josefrashty.com/uploads/3/4/1/9/34190589/2017-01_gr_vs._n_tcpa.pdf); [Deloitte/IASPlus — *Principal or Agent*](https://iasplus.com/content/1ef6d9b1-8b59-44c0-a07f-fa681dac2b22) |
| **IFRIC 13** | Customer Loyalty Programmes (award credits) | IFRS 15 (material right, B39–B43), effective 1 Jan 2018 | [BetterRegulation — *IFRIC 13*](https://service.betterregulation.com/document/259234); [IASPlus — *IFRIC 13*](https://www.iasplus.com/en-ca/standards/part-i-ifrs/ifric-interpretations/ifric13) |
| **ASC 605-25 / 605-15** | Multiple-element / returns provisioning | ASC 606 (variable consideration + material right) | [RevenueHub — *Transition Dates and Methods*](https://www.revenuehub.org/article/transition-dates-and-methods) |

---

## Part IX — Wave 2 Binding Crosswalk (Bridge to RTL-K-F)

This table maps each retail surface to its Wave 2 TypeScript binding contracts, the reused `ManufacturingBasisContracts` pattern, the recommended discriminated-union shape, and the **cross-blend traps** the bindings must guard against. `[SPEC ONLY — these interface names are recommendations for RTL-K-F, not executable code.]`

| Surface | US GAAP TS interface | IFRS TS interface | Reused MfgBasisContracts pattern | Discriminated-union shape recommendation | Cross-blend trap notation |
|---|---|---|---|---|---|
| **1. Gift card breakage** | `USGAAPGiftCardLiability` | `IFRSGiftCardLiability` | `VariableConsiderationEstimate` + `ContractLiability` (mfg refund/contract-liability pattern) | `{ basis: 'US_GAAP' \| 'IFRS'; breakageMode: 'EXPECTED_PROPORTIONAL' \| 'NOT_EXPECTED_REMOTE'; escheatOverlay?: StateEscheatRule }` discriminated on `breakageMode` | **TRAP A — escheat-vs-breakage double count:** recognized breakage must be net of expected escheat (ASC 606-10-55-49); a binding that recognizes proportional breakage without subtracting the escheat liability overstates revenue. Escheat is a US-only overlay absent from `IFRSGiftCardLiability`. |
| **2. Loyalty material right** | `USGAAPMaterialRight` | `IFRSMaterialRight` | `PerformanceObligation` + `StandaloneSellingPriceEstimate` (mfg SSP allocation pattern) | `{ basis; optionType: 'POINTS' \| 'TIER_STATUS' \| 'PAID_MEMBERSHIP' \| 'CASHBACK' \| 'PARTNER'; sspMethod: 'ADJ_MARKET' \| 'EXPECTED_COST_PLUS' \| 'RESIDUAL' }` discriminated on `optionType` | **TRAP B — status-vs-accumulating misclassification:** a `TIER_STATUS` benefit (often a marketing offer, no PO) must not bind to the same deferral path as accumulating `POINTS` (a material right). Mislabeling defers revenue that should be recognized at sale (ASC 606-10-55-42/55-43). |
| **3. Returns reserve** | `USGAAPRefundLiability` + `USGAAPReturnAsset` | `IFRSRefundLiability` + `IFRSReturnAsset` | `RefundLiability` + `ReturnAsset` (mfg right-of-return pattern, Section 10 of MFG-K-B) | `{ basis; channel: 'ECOM' \| 'BRICK' \| 'SUBSCRIPTION'; presentation: 'GROSS' /* net prohibited */ }` discriminated on `channel` for rate selection | **TRAP C — net-presentation collapse:** refund liability and return asset MUST be bound as separate gross balances; a union that nets them violates ASC 606-10-55-22/29 and the DART separate-presentation rule. (This is the first of the 3 new traps flagged in planning-doc Section 8.) |
| **4. Consignment** | `USGAAPConsignmentControl` | `IFRSConsignmentControl` | `ControlTransferIndicators` (mfg point-in-time control pattern, Section 5A of MFG-K-B) | `{ basis; role: 'CONSIGNOR' \| 'CONSIGNEE'; controlRetained: boolean }` discriminated on `role` | **TRAP D (new):** consignor revenue must bind to end-customer-sale event, NOT consignee delivery; and consigned inventory must bind to the `CONSIGNOR` inventory disclosure (ASC 330) — a binding that lets `CONSIGNEE` carry the inventory double-books it. |
| **5. Principal vs agent** | `USGAAPPrincipalAgent` | `IFRSPrincipalAgent` | `PrincipalAgentControlTest` (mfg gross/net + control pattern) | `{ basis; role: 'PRINCIPAL' \| 'AGENT'; grossOrNet: 'GROSS' \| 'NET'; threeFactor: { fulfillment: boolean; inventoryRisk: boolean; priceDiscretion: boolean } }` discriminated on `role` | **TRAP E (new):** the same physical sale yields different KPI inputs (AOV, GMROI) depending on `role`; bindings feeding the KPI engine must read `grossOrNet`, or a marketplace's net commission will be compared against a principal's gross GMV. Three-factor flags are evidence, not a 2-of-3 switch (ASU 2016-08). |
| **Cross-surface (VII)** | composite | composite | n/a — composition guard | `{ surfaces: Surface[]; reversalLinkage: boolean }` | **TRAP F (new):** returns must cascade reversals across linked surfaces (loyalty point reversal VII.2; marketplace refund-liability owner VII.3; consignment control reversal VII.4). A binding that reverses revenue without reversing the linked material right or commission leaves orphaned deferrals. |

**Binding posture:** every surface is dual-basis (`basis: 'US_GAAP' | 'IFRS'`). Because IFRS 15 is substantively converged on all five surfaces (B44–B47 breakage; B39–B43 loyalty; B20–B27 returns; B77–B78 consignment; B34–B38 principal/agent), the IFRS interfaces differ from the US GAAP interfaces principally in (i) the **absence of the escheat overlay** on `IFRSGiftCardLiability` and (ii) terminology — not in core recognition logic. RTL-K-F must nonetheless instantiate both so the tenant `reportingBasis` flag routes correctly.

---

## Source Reference Table

All citations are to primary authoritative sources (the FASB Codification via DART; FASB; the IFRS Foundation; the U.S. Supreme Court) or to Big-Four / national-firm retail and consumer-products application guides, treated as **primary for interpretation** of the Codification in this lane. URLs verified as resolving as of June 23, 2026. Some DART pages are subscription-gated to the 200-response preview (acceptable per manufacturing precedent); verbatim paragraph text is cross-confirmed against FASB-derived reproductions where the DART body is gated.

| Source | URL | Coverage in this document |
|--------|-----|---------------------------|
| FASB ASC 606 — DART, canonical | [dart.deloitte.com — ASC 606](https://dart.deloitte.com/USDART/home/codification/revenue/asc606) | All five surfaces |
| Deloitte DART — Roadmap: Revenue Recognition | [dart.deloitte.com — Roadmap](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition) | Five-step refresher; recent-ASU status |
| Deloitte DART — 8.8 Customers' Unexercised Rights — Breakage | [DART — 8.8 Breakage](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-8-customers-unexercised-rights-breakage) | ASC 606-10-55-46/47/48; IFRS B44–B47 mapping (Part II) |
| Deloitte DART — FASB Issues ASUs in Response to EITF Consensuses (ASU 2016-04) | [DART — ASU 2016-04 Heads Up](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2016/fasb-issues-asus-in-response-eitf) | Breakage estimation; constraint; open-loop products (Part II) |
| IASPlus / Deloitte — Heads Up: ASU 2016-04 | [iasplus — Heads Up ASU 2016-04](https://iasplus.com/content/f4cbf36b-094a-4839-b494-d81a94937fc7) | ASU 2016-04 verbatim; 25%-of-redemption example (Part II.3, II.6) |
| LegalClarity — Accounting for Breakage Revenue Under ASC 606 | [legalclarity.org — Breakage](https://legalclarity.org/accounting-for-breakage-revenue-under-asc-606/) | 55-48 proportional/remote; 55-49 escheat rule (Part II) |
| Deloitte DART — 11.2 Material Right Determination | [DART — 11.2 Material Right](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-11-customer-options-for-additional/11-2-determining-whether-an-option) | ASC 606-10-55-41/42/43 verbatim (Part III) |
| Deloitte DART — 5.2 Promises in Contracts With Customers | [DART — 5.2 Promises](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-5-step-2-identify-performance/5-2-promises-in-contracts-with) | Material-right promise; loyalty aggregation (Part III) |
| Deloitte DART — 11.7 Customer's Exercise of a Material Right | [DART — 11.7 Exercise](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-11-customer-options-for-additional/11-7-customer-s-exercise-a) | Alternative A/B recognition on redemption (Part III.2) |
| Deloitte DART — C.10 Material Rights | [DART — C.10 Material Rights](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/appendix-c-summary-issues-addressed-in/c-10-material-rights-chapter-11) | Material-right indicators; aggregation (Part III.6) |
| Deloitte DART — 6.3 Variable Consideration | [DART — 6.3 Variable Consideration](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-6-step-3-determine-transaction/6-3-variable-consideration) | ASC 606-10-32-10/11/12 verbatim (Part IV) |
| Deloitte DART — 4.15 Sales With a Right of Return | [DART — 4.15 Right of Return](https://dart.deloitte.com/USDART/home/codification/broad-transactions/asc830-10/roadmap-foreign-currency-transactions-translations/chapter-4-foreign-currency-transactions/4-15-sales-with-a-right) | ASC 606-10-55-25 verbatim (Part IV.2) |
| Deloitte DART — 14-3 Refund Liabilities | [DART — 14.3 Refund Liabilities](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-14-presentation/14-3-refund-liabilities) | Separate-presentation / netting prohibition (Part IV.3) |
| Deloitte DART — 8.6 Revenue Recognized at a Point in Time | [DART — 8.6 Point in Time](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-6-revenue-recognized-a-point) | ASC 606-10-55-79/80 + 25-30 verbatim (Part V) |
| Deloitte DART — FASB Makes Narrow-Scope Amendments (ASU 2016-12) | [DART — ASU 2016-12](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2016/fasb-makes-narrow-scope-amendments-revenue) | ASU 2016-12 narrow-scope improvements (Part IV.3) |
| Deloitte DART — ASC 606 Is Here (transition disclosures) | [DART — ASC 606 Is Here](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2018/asc-606-is-here-how-do) | ASC 606-10-65-1 transition disclosures (Parts IV.7, VIII) |
| Deloitte / IASPlus — Evaluating Whether an Entity Is a Principal or Agent | [iasplus — Principal vs Agent](https://iasplus.com/content/1ef6d9b1-8b59-44c0-a07f-fa681dac2b22) | ASC 606-10-55-39 indicators; ASU 2016-08; EITF 99-19 legacy (Part VI) |
| Rashty — Amendment to Gross Versus Net Revenue Recognition | [josefrashty.com — Gross vs Net](http://josefrashty.com/uploads/3/4/1/9/34190589/2017-01_gr_vs._n_tcpa.pdf) | ASC 606-10-55-37/38; control model; EITF 99-19 supersession (Part VI) |
| RevenueHub — Principal/Agent Considerations (Gross vs Net) | [revenuehub.org — Principal/Agent](https://www.revenuehub.org/article/principalagent-considerations-gross-vs-net) | ASC 606-10-55-37/39/40; two-step; drop-ship (Part VI) |
| BillingPlatform — ASC 606 Principal vs. Agent | [billingplatform.com — Principal vs Agent](https://billingplatform.com/blog/asc-606-principal-vs-agent) | Control principle; indicators are evidence not test (Part VI) |
| RevenueHub — Variable Consideration and the Constraint | [revenuehub.org — Constraint](https://www.revenuehub.org/article/variable-consideration-constraint) | "Probable" = likely to occur; constraint (Part IV.2) |
| RevenueHub — Rights of Return and Customer Acceptance | [revenuehub.org — Rights of Return](https://www.revenuehub.org/article/rights-of-return-and-customer-acceptance) | Refund liability/return asset; separate presentation (Part IV) |
| RevenueHub — Common ASC 606 Issues: Retail Entities | [revenuehub.org — Retail Entities](https://www.revenuehub.org/article/asc-606-retail-entities) | Returns liability/asset; subscription returns (Part IV.5) |
| RevenueHub — Transition Dates and Methods | [revenuehub.org — Transition](https://www.revenuehub.org/article/transition-dates-and-methods) | Effective dates; full/modified retrospective (Part VIII) |
| Grant Thornton — Revenue from Contracts with Customers (ASC 606) | [grantthornton.com — ASC 606 (PDF)](https://www.grantthornton.com/content/dam/grantthornton/website/assets/content-page-files/audit/pdfs/2022/revenue-from-contracts-with-customers-updated-220124.pdf) | Five-step recitation; 55-22/29 range; principal/agent range (Parts I, IV) |
| RSM US — Revenue recognition considerations for the consumer products industry | [rsmus.com — Consumer Products (PDF)](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/Changes-to-revenue-recognition-in-the-consumer-products-industry-202309.pdf) | 55-44/45 SSP & likelihood; loyalty breakage (Part III) |
| RSM US — Revenue recognition for business and professional services | [rsmus.com — Business & Professional Services (PDF)](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/Revenue-recognition-for-business-and-professional-services-202310.pdf) | ASC 606-10-55-43 marketing-offer carve-out (Part III.2) |
| EY — Financial Reporting Developments: Revenue (ASC 606) | [ey.com — FRD ASC 606 (PDF)](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-us/technical/accountinglink/documents/ey-frdbb3043-08-07-2025-v2.pdf) | SSP methods (adj market / cost-plus / residual) (Part III.3) |
| EY — Comprehensive Guide to Revenue from Contracts with Customers | [ey.com — Comprehensive Guide (PDF)](https://www.reit.com/sites/default/files/meetings/REITWise17/Implementing%20the%20Rev%20Rec%20Standard/EY%20Comprehensive%20Guide%20to%20Revenue%20from%20Contracts%20with%20Customers.pdf) | Effective dates; transition expedients (Part VIII) |
| PwC — Revenue from contracts with customers (IFRS 15 retailers) | [pwc.com — IFRS 15 retailers (PDF)](https://www.pwc.com/m1/en/services/cmaas/documents/ifrs15/ifrs-15-retailers.pdf) | IFRS 15.B20–B27 right of return; gross presentation (Part IV.6) |
| CliftonLarsonAllen — ASC Topic 606 (Manufacturers & Distributors) | [claconnect.com — ASC 606 (PDF)](https://www.claconnect.com/-/media/files/presentations/asctopic606-howthenewrevenuerecognitionstandardmayimpactmanufacturersanddis.pdf) | Right of return not a PO; refund liability/return asset measurement (Part IV) |
| Journal Entries Hub — Right-of-Return Provision (ASC 606 / IFRS 15) | [journalentrieshub.com — Right of Return](https://www.journalentrieshub.com/entries/fmcg-returns-reserve-right-of-return) | ASC 606 / IFRS 15 B20–B27 convergence; channel return rates; restocking (Part IV) |
| HubiFi — What Is a Right of Return Asset? | [hubifi.com — Right of Return Asset](https://www.hubifi.com/blog/right-of-return-accounting) | Return asset measurement; restocking/recovery costs (Part IV.2, IV.4) |
| HubiFi — IFRS 15 B34 Principal vs Agent | [hubifi.com — IFRS 15 B34 Principal/Agent](https://www.hubifi.com/blog/agent-principal-ifrs15) | IFRS 15.B34–B38; gross-vs-net financial-statement impact (Parts VI.5, VI.6) |
| AccountingTools — Revenue at gross or net | [accountingtools.com — Gross or Net](https://www.accountingtools.com/articles/revenue-at-gross-or-net) | Gross-vs-net presentation (Part VI.5) |
| Stripe — What is a material right? (ASC 606) | [stripe.com — Material Right](https://stripe.com/resources/more/what-is-a-material-right-how-to-account-for-it-with-asc-606) | Loyalty points as material right; SSP; recognition on exercise/expiry (Part III) |
| BDO — Revenue Recognition Under ASC 606 (Blueprint, 2025) | [bdo.com — ASC 606 Blueprint (PDF)](https://arch.bdo.com/getContentAsset/118430f1-fe4d-4112-adf6-884d6a0347f3/bb620d56-5e9c-4774-8d17-fb9323eefdf4/Revenue-Recognition-Under-ASC-606-BDO-Blueprint-10-2025.pdf?language=en) | Control / satisfaction; SSP allocation objective (Parts I, V) |
| Ciferi — Consignment Arrangement (Audit & IFRS Glossary) | [ciferi.com — Consignment](https://ciferi.com/glossary/consignment-arrangement) | IFRS 15.B77–B78; consignor inventory under ASC 330 (Part V) |
| IFRS Community — Performance Obligations (IFRS 15) / Consignment | [ifrscommunity.com — Performance Obligations](https://ifrscommunity.com/knowledge-base/ifrs-15-performance-obligations-and-timing-of-revenue-recognition/) | IFRS 15.B77–B78 consignment indicators (Part V.5) |
| IFRS Community — Principal vs Agent (Revenue Gross vs Net) | [ifrscommunity.com — Principal vs Agent](https://ifrscommunity.com/knowledge-base/principal-vs-agent-revenue-gross-vs-net/) | IFRS 15.B34/B37 indicators (Part VI.6) |
| LinkedIn / W. Chowdhury — Consignment [IFRS 15, B77-B78] | [linkedin.com — Consignment B77-B78](https://www.linkedin.com/pulse/consignment-ifrs-15-b77-b78-wazed-chowdhury) | IFRS 15.B77–B78; consignor/consignee entries (Part V) |
| EFRAG — Clarifications to IFRS 15 (IASB Amendments) | [efrag.org — IFRS 15 Clarifications (PDF)](https://www.efrag.org/system/files/sites/webpublishing/Project%20Documents/330/Clarifications%20to%20IFRS%2015%20-%20IASB%20Amendments.pdf) | IFRS 15.B34/B35/B36/B37 verbatim (Part VI.6) |
| annualreporting.info — IFRS 15 entity is an agent (IE232) | [annualreporting.info — IE232](https://annualreporting.info/intfinrepstan/ifrs-15-entity-is-an-agent/) | IFRS 15 IE231–IE239 principal/agent examples (Part VI.6) |
| IFRS Foundation / FASB staff — Principal versus Agent Considerations | [ifrs.org — Principal vs Agent staff paper (PDF)](https://www.ifrs.org/content/dam/ifrs/meetings/2015/june/iasb/revenue-from-contracts-with-customers/ap7a-principal-versus-agent-considerations.pdf) | 606-10-55-37 [B35] / 55-39 [B37] joint mapping; indicators don't override control (Part VI) |
| IFRS Foundation — Principal versus agent: IT resellers (IFRS 15) | [ifrs.org — IT resellers submission (PDF)](https://www.ifrs.org/content/dam/ifrs/groups/ifric/requests-to-be-considered-at-a-future-committee-meeting/submission-principal-versus-agent-it-resellers-ifrs-15.pdf) | Control of combined output; drop-ship/reseller (Part VI.7) |
| IFRS Foundation — IFRS 15 Revenue from Contracts with Customers | [ifrs.org — IFRS 15](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/) | IFRS divergence baseline (all surfaces) |
| IFRS Foundation — IFRS 15 standard text (B77–B78 consignment) | [oraclecloud — IFRS 15 standard PDF](https://objectstorage.ap-dcc-gazipur-1.oraclecloud15.com/n/axvjbnqprylg/b/V2Ministry/o/office-frc/2024/12/cd9a4e6eedf044ef94dde53a5390bc8c.pdf) | IFRS 15.B77–B78 consignment (Part V.5) |
| U.S. Supreme Court — Texas v. New Jersey, 379 U.S. 674 (1965) | [supreme.justia.com — 379 U.S. 674](https://supreme.justia.com/cases/federal/us/379/674/) | Escheat priority rules — verbatim holding (Part II.4) |
| U.S. Supreme Court — Delaware v. Pennsylvania (Cornell LII) | [law.cornell.edu — Delaware v. Pennsylvania](https://www.law.cornell.edu/supremecourt/text/23O145) | Reaffirmation of Texas v. New Jersey priority rules (Part II.4) |
| DeCarrera Law — Unclaimed Property Priority Rules (Texas v. New Jersey) | [decarreralaw.com — Texas v. New Jersey](https://decarreralaw.com/unclaimed-property/litigation/texas-v-new-jersey/) | First/second priority rule framing (Part II.4) |
| BetterRegulation — IFRIC 13: Customer Loyalty Programmes | [betterregulation.com — IFRIC 13](https://service.betterregulation.com/document/259234) | IFRIC 13 superseded by IFRS 15, 1 Jan 2018 (Parts III.5, VIII.4) |
| IASPlus — IFRIC 13 Customer Loyalty Programmes | [iasplus.com — IFRIC 13](https://www.iasplus.com/en-ca/standards/part-i-ifrs/ifric-interpretations/ifric13) | IFRIC 13 supersession date (Parts III.5, VIII.4) |
| XRB — NZ equivalent to IFRIC 13 | [xrb.govt.nz — IFRIC 13](https://www.xrb.govt.nz/dmsdocument/354/) | IFRIC 13 award-credits / principal-agent split (Part III.5) |
| ijbemp — IFRS 15 and customer loyalty programmes | [ijbemp.com — IFRS 15 loyalty](https://ijbemp.com/files/d52d1d7f-18de-4c73-9b4a-2128c4a9315e.pdf) | IFRS 15 vs IFRIC 13 convergence (Part III.5) |
| ijbemp — Müşteri Sadakat Programları / IFRS 15 | [ijbemp.com — IFRS 15 loyalty (2)](https://ijbemp.com/GoogleScholarPDF/777c5a7d-45ce-4e0c-a278-7766537aa854.pdf) | IFRS 15 vs IFRIC 13 deferral convergence (Part III.5) |
| Deloitte — Heads Up: The New Revenue Standard — Adoption and Transition | [deloitte.com — Adoption & Transition (PDF)](https://www2.deloitte.com/content/dam/Deloitte/us/Documents/audit/ASC/HU/2016/us-aers-headsup-the-new-revenue-standard-adoption-and-transition-observations-011416.pdf) | ASC 606-10-65-1 transition methods (Part VIII.2) |
| Journal of Accountancy — FASB issues revenue recognition changes (ASU 2016-12) | [journalofaccountancy.com — ASU 2016-12](https://www.journalofaccountancy.com/news/2016/may/fasb-issues-revenue-recognition-changes-practical-expedients-201614390/) | ASU 2016-12 narrow-scope improvements (Part IV.3) |
| FASB (standard-setter / technical agenda) | [fasb.org](https://www.fasb.org) | Recent-ASU / agenda verification |

---

*This document is part of the Advisacor Retail Vertical Knowledge Stack (Module RTL-K-B, Wave 1). It is `DRAFT / SPEC — NOT EXECUTABLE — NOT LOCKED`, `executable: false`, `containsVerticalComplianceLogic: true`. All revenue-recognition conclusions generated by Advisacor are classified as `output_classification = 'recommendation_for_human_review'`. No conclusion in this document constitutes final accounting advice or audit-quality certification. Users must validate every ASC 606 paragraph citation against the current FASB Codification, and every IFRS 15 reference against the current IFRS Foundation standard, and must apply the analysis to their specific facts, channel, and elected reporting basis (US GAAP or IFRS) before implementation. Gift-card breakage estimation, the escheatment overlay (a jurisdictional overlay deferred to Wave 3), loyalty material-right SSP, the right-of-return constraint, the consignment control conclusion, and the principal-vs-agent control assessment are facts-and-circumstances judgments flagged throughout as [JUDGMENT AREA]; they require professional judgment and, where escheatment or marketplace-obligor questions turn on law, legal review. Part IX interface names are recommendations for RTL-K-F, not executable code.*
