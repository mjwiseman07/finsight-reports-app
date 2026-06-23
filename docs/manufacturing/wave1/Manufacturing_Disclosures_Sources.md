# US Manufacturing Disclosures — ASC 330 Inventory, ASC 842 Leases, and Supply-Chain / SEC Reg S-K — Comprehensive Source Reference

**DRAFT / SPEC — NOT EXECUTABLE — NOT LOCKED**

`executable: false`
`containsVerticalComplianceLogic: true`

**Document Title:** Manufacturing Disclosures Source Document — Advisacor Manufacturing Vertical Knowledge Stack, Module MFG-K-C
**Date Generated:** June 22, 2026
**Version:** 1.0 (DRAFT)
**Scope:** US manufacturers reporting under U.S. GAAP and, where elected at the tenant level, IFRS. This module covers **three related disclosure domains under one cover**: (I) **ASC 330** *Inventory*, (II) **ASC 842** *Leases*, and (III) **supply-chain and SEC Regulation S-K** disclosures (description of business, MD&A, conflict minerals, climate, segments, concentrations, going concern, subsequent events). Five sub-segments — Discrete (D), Process (P), Hybrid/Mixed-Mode (H), Job-Shop/Project (J), Engineer-to-Order/ETO (E). NAICS sectors 31–33.
**Prepared for:** Advisacor — Wiseman Financial Technologies LLC (Matthew Wiseman, founder)
**Output Classification:** `recommendation_for_human_review`
**Citation Discipline:** Every authoritative claim cites a **primary source**. The canonical citations are: the FASB Accounting Standards Codification (ASC 330, ASC 842, ASC 280, ASC 205-40, ASC 855, ASC 340-40) accessed via the Deloitte Accounting Research Tool (DART) at [dart.deloitte.com](https://dart.deloitte.com) and FASB direct ([fasb.org](https://www.fasb.org)); SEC rules and Regulation S-K / S-X via the eCFR ([ecfr.gov](https://www.ecfr.gov)) and SEC releases/Form SD/CDIs ([sec.gov](https://www.sec.gov)); IFRS Foundation for IAS 2 and IFRS 16 ([ifrs.org](https://www.ifrs.org)); IRC §472 / Treas. Reg. §1.472 for LIFO conformity ([law.cornell.edu](https://www.law.cornell.edu)); the GHG Protocol for emissions scopes ([ghgprotocol.org](https://ghgprotocol.org)); the California Attorney General and California Air Resources Board (CARB) for California statutes ([oag.ca.gov](https://oag.ca.gov), [arb.ca.gov](https://ww2.arb.ca.gov)); and U.S. Census for NAICS ([census.gov](https://www.census.gov)). Big-Four and national-firm handbooks (KPMG, EY, PwC, Deloitte, Grant Thornton, RSM US) are treated as **primary for interpretation** of how the Codification applies to manufacturing. Definitions that turn on facts-and-circumstances judgment are flagged **[JUDGMENT AREA]**.
**IFRS posture (resolved Q5):** IFRS receives equal-depth treatment. IAS 2 divergences from ASC 330 (LIFO prohibited; write-down reversal permitted) and IFRS 16 divergence from ASC 842 (single on-balance-sheet lessee model vs. dual operating/finance classification) are flagged where material in Sections 1.6 and 2.6 respectively, and inline where useful.

This document is the manufacturing-vertical analog of `Healthcare_Disclosures_42O_Sources.md` and is governed by `MANUFACTURING_VERTICAL_PLANNING_DOCUMENT.md`. Its siblings are `Manufacturing_KPIs_Sources.md` (Module MFG-K-A) and `Manufacturing_ASC606_Sources.md` (Module MFG-K-B); terminology, the sub-segment key, and citation style are kept consistent with those documents. The peer IFRS source document `Manufacturing_IFRS_Sources.md` (resolved Q5) carries the full IAS 2 / IAS 16 / IFRS 15 / IFRS 16 treatment; this document flags only the manufacturing-material divergences.

---

## How to Read This Document

The document is organized in **four parts plus a closing source table**:

- **Part I — ASC 330 Inventory** (Sections 1.1–1.7): scope, cost measurement, costing methods (FIFO / LIFO / weighted-average / specific identification), lower of cost or NRV (ASU 2015-11), disclosure requirements, the IAS 2 divergence, and manufacturing-specific inventory topics.
- **Part II — ASC 842 Leases** (Sections 2.1–2.7): scope, lessee accounting, lessor accounting, embedded leases, disclosures, the IFRS 16 divergence, and manufacturing-specific lease patterns.
- **Part III — Supply-Chain and SEC Reg S-K Disclosures** (Sections 3.1–3.8): Item 101 description of business, Item 303 MD&A, supply-chain due-diligence regimes, climate-related disclosures, segment reporting (ASC 280), concentration disclosures, going concern (ASC 205-40), and subsequent events (ASC 855).
- **Part IV — Cross-Vertical Disclosure Notes** (Sections 4.1–4.2): multi-tenant IFRS routing and the interaction between disclosures and the Manufacturing Variances panel.
- **Closing** — Source Reference Table of every cited primary source with URLs.

Each substantive topic carries, where applicable: (1) **The standard** — the operative paragraph(s) cited to DART / eCFR / IFRS; (2) **Manufacturing application** — how it applies to manufacturing patterns; (3) **Sub-segment applicability** — an explicit statement and, where useful, a five-column matrix across D / P / H / J / E; (4) **IFRS note** — where IFRS diverges materially.

**Manufacturing Sub-Segment Key:** **D** = Discrete | **P** = Process | **H** = Hybrid / Mixed-Mode | **J** = Job-Shop / Project | **E** = Engineer-to-Order (ETO).
Matrix legend: **✓** = applicable / common; **◑** = partially applicable / fact-dependent; **—** = not applicable / rare. **No cell is ever left blank.**

**Production-strategy axis (orthogonal to sub-type):** **MTS** = Make-to-Stock | **MTO** = Make-to-Order | **ATO** = Assemble-to-Order | **ETO** = Engineer-to-Order. Noted where a topic is sensitive to it (e.g., inventory composition skews toward finished goods for MTS and toward WIP/contract assets for ETO).

**Math notation:** inline math uses \( \cdots \); display math uses \[ \cdots \]. There are zero `$`-style math delimiters in this document.

---

# PART I — ASC 330 INVENTORY (Manufacturing)

---

## 1.1 Scope of ASC 330

**The standard.** ASC 330 governs the measurement and presentation of inventory under U.S. GAAP. An asset is inventory if it is a tangible asset that is (a) held for sale in the ordinary course of business, (b) in the process of production for such sale (work-in-process), or (c) to be currently consumed in the production of goods or services to be available for sale (raw materials and manufacturing supplies). For manufacturers, in-scope inventory therefore comprises **raw materials, work-in-process (WIP), finished goods, and supplies that become part of the product** ([KPMG — Handbook: Inventory, definition of inventory under ASC 330 Glossary](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-inventory-2024.pdf)). The Codification's foundational principle is that the inventory carried at any date is "the balance of costs applicable to goods on hand remaining after the matching of absorbed costs with concurrent revenues," carried forward to future periods provided it does not exceed the amount recoverable from ultimate disposition ([FASB ASC 330 Inventory, via DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330)).

**What is excluded.** ASC 330 does not govern financial instruments, and certain inventories fall under industry-specific subtopics (for example, ASC 908-330 for airlines and other industry guidance) rather than the general Topic 330 cost model ([Deloitte — FAQs on ASU 2024-03, scope of "purchases of inventory" limited to ASC 330 and industry-specific subtopics](https://dart.deloitte.com/USDART/home/publications/deloitte/accounting-spotlight/2025/asu-2024-03-faq-disaggregation-income-statement-expense)). Costs colloquially called "inventory" but accumulated for long-term construction or production contracts (recognized over time under ASC 606) and film costs are not ASC 330 inventory ([Deloitte — ASU 2024-03 FAQ, items outside ASC 330](https://dart.deloitte.com/USDART/home/publications/deloitte/accounting-spotlight/2025/asu-2024-03-faq-disaggregation-income-statement-expense)). Biological/agricultural assets and certain commodity broker-dealer and producer inventories carried at fair value or NRV are addressed by specialized guidance rather than the general lower-of-cost-or-NRV model — a scope carve-out that exactly parallels the IAS 2 carve-out for producers of agricultural/forest products and commodity broker-dealers ([KPMG — IFRS vs US GAAP inventory, IAS 2 measurement carve-outs](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)).

**Sub-segment applicability.**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ◑ |

All five sub-segments hold raw materials and finished goods within ASC 330, but the **mix differs**: Process (P) manufacturers carry heavy bulk raw-material and continuous-WIP balances; Discrete (D) carry distinct component and finished-unit inventory; Job-Shop (J) carry job-specific WIP; ETO (E) is partial (◑) because long-cycle engineer-to-order work that transfers to the customer over time under ASC 606 is accounted for as a contract cost / contract asset, **not** as ASC 330 inventory — so a meaningful slice of an ETO manufacturer's "production in process" sits outside Topic 330 ([Deloitte — Aerospace & Defense Spotlight: materials purchased for over-time contracts](https://dart.deloitte.com/USDART/home/publications/deloitte/industry/aerospace-defense/materials-purchased-overtime-contracts-dise-disclosures); cross-reference `Manufacturing_ASC606_Sources.md` Section 5 on over-time recognition).

---

## 1.2 Inventory Measurement — Cost

**The standard.** Inventory cost includes all expenditures and charges directly or indirectly incurred to bring an article to its existing condition and location. For a manufacturer this resolves into two cost pools.

**Acquisition cost (raw materials and purchased goods).** Cost comprises the **purchase price plus freight-in, duties, and handling** — all costs of bringing materials to their present location and condition, net of trade discounts, rebates, and subsidies ([KPMG — Handbook: Inventory, cost components](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-inventory-2024.pdf)). Warehousing costs may be capitalized into inventory where they are a necessary part of bringing inventory to a saleable condition ([Deloitte — Capitalization of Warehousing Costs Into Inventory, ASC 330-10-30 (Q&A 05)](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10/deloitte-guidance/330-10-30-initial-measurement-deloitte/capitalization-warehousing-costs-into-inventory-330)).

**Conversion cost (WIP and finished goods).** Conversion cost comprises **direct labor plus manufacturing overhead** (both variable and fixed) applied to convert raw materials into finished product ([FASB ASC 330-10-30 Initial Measurement, via DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10/deloitte-guidance/330-10-30-initial-measurement-deloitte)).

**Absorption of fixed overhead at normal capacity (ASC 330-10-30-3).** The allocation of **fixed production overhead** to conversion costs is based on the **normal capacity** of the production facilities. Normal capacity is the production expected to be achieved on average over a number of periods under normal circumstances, taking into account capacity lost to planned maintenance. The amount of fixed overhead allocated to each unit of production is **not increased** as a consequence of abnormally low production or an idle plant ([FASB ASC 330 / KPMG — Handbook: Inventory, normal-capacity absorption](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-inventory-2024.pdf)).

**Idle facility expense (period cost).** Unallocated fixed overhead arising because actual production is below normal capacity is recognized as a **period expense** in the period incurred, not inventoried. This prevents inflation of unit cost during downturns ([KPMG — Handbook: Inventory, treatment of unabsorbed fixed overhead](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-inventory-2024.pdf)).

**Abnormal spoilage (period cost).** Abnormal amounts of wasted materials (spoilage), labor, and other production costs are charged to expense in the period incurred, not capitalized into inventory ([KPMG — Handbook: Inventory, abnormal spoilage](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-inventory-2024.pdf)). IAS 2 reaches the same conclusion — it prohibits abnormal losses being charged to cost of sales / inventory ([PwC — COVID-19 financial-reporting note, IAS 2 abnormal losses excluded from inventory](https://www.pwc.com/ng/en/assets/pdf/covid19-key-financial-reporting%20implication-nigeria.pdf)).

**Variable overhead.** Variable production overhead is allocated to each unit on the basis of the **actual** use of the production facilities ([KPMG — Handbook: Inventory, variable overhead allocation on actual production](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-inventory-2024.pdf)).

**Standard costs.** Standard costs are an acceptable basis for measuring inventory if they are set at levels that **reasonably approximate** costs computed under one of the recognized cost-flow assumptions (FIFO, average, etc.) and are **reviewed and adjusted at reasonable intervals**. ASU 2015-11 amended ASC 330-10-30-12 to remove the prior requirement to describe the relationship between standard costs and another measurement basis, on the rationale that regularly updated standard costs should approximate FIFO or average cost ([Deloitte — FASB Proposes Updates to Inventory Disclosures, ASC 330-10-30-12 amendment](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2017/fasb-proposes-updates-inventory-disclosures-jan)).

\[ \text{Inventoriable unit cost} = \text{direct materials} + \text{direct labor} + \text{variable OH (actual basis)} + \frac{\text{fixed OH}}{\text{normal capacity}} \]

with idle-facility expense and abnormal spoilage **excluded** (expensed as incurred).

**Sub-segment applicability.**

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Normal-capacity fixed-OH absorption (330-10-30-3) | ✓ | ✓ | ✓ | ✓ | ◑ |
| Idle-facility expense as period cost | ✓ | ✓ | ✓ | ✓ | ◑ |
| Abnormal-spoilage period cost | ✓ | ✓ | ✓ | ✓ | ◑ |
| Standard-cost measurement | ✓ | ✓ | ✓ | ◑ | ◑ |

Normal-capacity absorption is most consequential for capital-intensive **Process (P)** and high-fixed-cost **Discrete (D)** plants, where a volume shortfall produces large unabsorbed fixed overhead. **Job-Shop (J)** and **ETO (E)** are partial (◑) because much of their production cost is captured as job-cost / contract-cost rather than absorbed-overhead inventory; standard costing is also less common in pure J/E environments, which favor actual job costing. This section connects directly to the **fixed-overhead volume variance** in `Manufacturing_KPIs_Sources.md` Section II — unabsorbed fixed overhead at sub-normal volume is the accounting analog of an unfavorable FOH volume variance.

**IFRS note.** IAS 2 contains a substantively identical normal-capacity absorption requirement, identical idle-capacity period-cost treatment, and identical abnormal-loss exclusion ([KPMG — IFRS vs US GAAP inventory, cost = purchase + conversion + costs to bring to present location/condition](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)). No material divergence in cost composition.

---

## 1.3 Inventory Costing Methods

**The standard.** ASC 330-10-30-9 permits several cost-flow assumptions: "Cost for inventory purposes may be determined under any one of several assumptions as to the flow of cost factors, such as first-in first-out (FIFO), average, and last-in first-out (LIFO). The major objective in selecting a method should be to choose the one which, under the circumstances, most clearly reflects periodic income." ([Deloitte — Roadmap, SEC Comment Letter Considerations §2.12A Inventory, quoting ASC 330-10-30-9](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-sec-comment-letter-considerations/chapter-2-financial-statement-accounting-disclosure/2-13-inventory)). U.S. GAAP also permits **specific identification** and the **retail inventory method (RIM)** ([Houseblend — ASC 330 valuation, permitted methods include FIFO, average, specific identification, LIFO, and RIM](https://www.houseblend.io/articles/asc-330-inventory-valuation-write-downs)).

### FIFO (First-In, First-Out)
FIFO assumes the earliest-purchased or earliest-produced units are sold first, so ending inventory reflects the most recent costs. It is permitted under both U.S. GAAP and IFRS and is the most common method for manufacturers with perishable, dated, or technologically obsolescing product ([KPMG — IFRS vs US GAAP inventory, FIFO cost formula](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)).

### LIFO (Last-In, First-Out) — INCLUDED per resolved Q3
LIFO assumes the most recently acquired or produced units are sold first; ending inventory consists of the oldest cost layers. In a rising-cost environment LIFO produces a higher COGS and lower taxable income, which is the principal reason U.S. manufacturers elect it ([KPMG — IFRS vs US GAAP inventory, LIFO inventory layers](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)).

- **LIFO conformity rule (IRC §472).** A taxpayer that elects LIFO for income-tax purposes **must also use LIFO for financial reporting** to shareholders, partners, other proprietors, beneficiaries, and for credit purposes. IRC §472(c) imposes this conformity condition; Treas. Reg. §1.472-2(e) sets out the limited exceptions ([26 U.S. Code §472, LIFO inventories](https://www.law.cornell.edu/uscode/text/26/472); [26 CFR §1.472-2, requirements incident to adoption and use of LIFO](https://www.law.cornell.edu/cfr/text/26/1.472-2); [IRS — Practice Unit: LIFO Conformity](https://www.irs.gov/pub/fatca/int_practice_units/cor_c_017.pdf)).
- **Lower of LIFO cost or market exception.** A LIFO taxpayer may value inventory at the **lower of LIFO cost or market** for book purposes without violating conformity, but must value tax inventory at actual LIFO cost on the return ([IRS — Practice Unit: LIFO Conformity, exception 5](https://www.irs.gov/pub/fatca/int_practice_units/cor_c_017.pdf); [26 CFR §1.472-2(e), lower of LIFO cost or market for financial reports](https://www.law.cornell.edu/cfr/text/26/1.472-2)).
- **LIFO reserve disclosure.** A LIFO entity must disclose the **excess of replacement or current cost over the reported LIFO value** (the "LIFO reserve") ([KPMG — Handbook: Inventory, LIFO additional disclosures](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-inventory-2024.pdf)). See Section 1.5.
- **LIFO liquidation effects.** When a LIFO entity sells more units than it produces/purchases in a period, it "liquidates" older, lower-cost layers into COGS, inflating gross margin. The **effect on net income of a LIFO liquidation** must be disclosed when material ([Deloitte — Tentative Board Decisions, disclose effect of LIFO liquidations on income](https://dart.deloitte.com/USDART/ov-resource/c80f55d7-81c4-11e6-b675-9fcba25a5d7e.html); [KPMG — Handbook: Inventory, disclose income realized from a LIFO liquidation](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-inventory-2024.pdf)).
- **Dollar-value LIFO method.** Rather than tracking physical units, dollar-value LIFO measures inventory layers in **base-year dollars** using price indices, pooling many items into a single measure; it is governed for tax by Treas. Reg. §1.472-8 ([26 CFR §1.472-1, LIFO inventories — dollar-value reference and raw-material-only election](https://www.law.cornell.edu/cfr/text/26/1.472-1); [IRS — Dollar-Value LIFO Regulations, TD 8976](https://www.irs.gov/pub/irs-regs/td8976.pdf)).
- **LIFO pool selection.** A manufacturer may apply LIFO to **raw materials only** (including raw materials embedded in WIP and finished goods) or to broader pools; pool definition affects the frequency and magnitude of liquidations ([26 CFR §1.472-1(c), manufacturer raw-material LIFO election](https://www.law.cornell.edu/cfr/text/26/1.472-1)).

### Weighted-Average Cost
The weighted-average method assigns to each unit the weighted-average cost of the goods available for sale during the period (periodic) or after each purchase (moving-average). Permitted under both U.S. GAAP and IAS 2 ([KPMG — IFRS vs US GAAP inventory, weighted-average cost formula](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)).

### Specific Identification
Costs are tracked to specific identified units. Required under IAS 2 for items that are **not ordinarily interchangeable** or that are produced and segregated for specific projects; permitted under U.S. GAAP ([IFRS — IASB staff paper AP26A, specific identification for non-interchangeable items / project goods](https://www.ifrs.org/content/dam/ifrs/meetings/2019/october/iasb/ap26a-ias-8.pdf)). This is the natural method for high-value, serialized, or custom J/E output.

### Retail Inventory Method (RIM)
RIM estimates ending inventory cost from retail selling prices using a cost-to-retail ratio. It is principally a **specialty-retailer** technique with limited manufacturing relevance, but it is cross-referenced here because, like LIFO, RIM is **excluded from the ASU 2015-11 lower-of-cost-or-NRV measurement** and instead retains the legacy lower-of-cost-or-market test (see Section 1.4) ([KPMG — IFRS vs US GAAP inventory, RIM uses market not NRV under US GAAP](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)).

**Sub-segment applicability — method-by-sub-segment patterns.**

| Method | D | P | H | J | E |
|---|---|---|---|---|---|
| FIFO | ✓ | ✓ | ✓ | ✓ | ◑ |
| LIFO | ✓ | ✓ | ✓ | ◑ | — |
| Weighted-average | ◑ | ✓ | ✓ | ◑ | ◑ |
| Specific identification | ◑ | — | ◑ | ✓ | ✓ |
| Retail inventory method | — | — | — | — | — |

**Judgment calls in the matrix.** **Process (P)** manufacturers (commodities, chemicals, food, metals) most commonly use weighted-average or LIFO because their interchangeable bulk inventory makes unit tracking impractical and LIFO tax deferral is attractive in inflationary input markets. **Discrete (D)** manufacturers use FIFO or LIFO depending on tax strategy. **Job-Shop (J)** and **ETO (E)** favor **specific identification** because output is custom and serialized; LIFO is rare-to-inapplicable for E (marked —) because ETO production rarely produces homogeneous, repeatedly purchased layers and much of the cost lives in ASC 606 contract assets rather than ASC 330 inventory. RIM is "—" across all five because it is a retail, not a manufacturing, technique (cross-reference only) ([KPMG — Handbook: Inventory, costing-method overview](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-inventory-2024.pdf)).

---

## 1.4 Lower of Cost or Net Realizable Value (ASU 2015-11)

**The standard.** ASU 2015-11, *Inventory (Topic 330): Simplifying the Measurement of Inventory*, requires inventory measured using **FIFO, weighted-average, or specific identification** to be measured at the **lower of cost and net realizable value (NRV)** — not the older "lower of cost or market" (LCM) with its ceiling/floor structure ([Dean Dorton — Highlights of FASB's ASU 2015-11](https://deandorton.com/highlights-of-fasbs-asu-2015-11/); [Weaver — Adopting the new FASB inventory reporting guidelines](https://weaver.com/resources/adopting-new-and-improved-fasb-inventory-reporting-guidelines/)). It is **effective for public business entities** for fiscal years beginning after December 15, 2016 (calendar 2017) and for **all other entities** for fiscal years beginning after December 15, 2016 with interim periods within fiscal years beginning after December 15, 2017 (calendar 2018 annual / 2018 interim) ([Dean Dorton — ASU 2015-11 effective dates](https://deandorton.com/highlights-of-fasbs-asu-2015-11/)).

**LIFO and RIM exception.** Inventory measured using **LIFO or the retail inventory method continues to apply lower of cost or market (LCM)**, where "market" is current replacement cost subject to a ceiling of NRV and a floor of NRV less a normal profit margin ([KPMG — IFRS vs US GAAP inventory, LIFO/RIM compare cost to market not NRV](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html); [EY — US GAAP vs IFRS: The basics, LIFO and RIM carried at lower of cost or market](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-us/technical/accountinglink/documents/ey-ifrs11560-211us-01-14-2021.pdf)).

**NRV definition.** NRV is the **estimated selling price in the ordinary course of business less reasonably predictable costs of completion, disposal, and transportation** ([KPMG — Fair value Q&A, ASC Master Glossary NRV definition](https://assets.kpmg.com/content/dam/kpmg/pdf/2015/12/fair-value-qa-2015.pdf); [Weaver — NRV = estimated selling price minus costs of completion, disposal, transportation](https://weaver.com/resources/adopting-new-and-improved-fasb-inventory-reporting-guidelines/)).

\[ \text{NRV} = \text{estimated selling price} - \text{costs of completion} - \text{costs of disposal} - \text{costs of transportation} \]

**Write-down recognition.** When NRV falls below cost, the entity reduces the carrying amount to NRV and recognizes the loss as a **period expense** (typically in COGS) in the period of the decline ([Weaver — write-down recognized in the period of decline](https://weaver.com/resources/adopting-new-and-improved-fasb-inventory-reporting-guidelines/)).

**Irreversibility under U.S. GAAP.** Once inventory is written down, the reduced amount becomes the **new cost basis** and **cannot be written back up** if NRV later recovers (absent correction of an error). ASC 330-10-35-14 makes a year-end write-down final ([Houseblend — ASC 330 write-downs and reversals, no write-up under US GAAP](https://www.houseblend.io/articles/asc-330-inventory-valuation-write-downs); [KPMG — IFRS vs US GAAP inventory, US GAAP write-downs not reversed except FX](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)). **This is a binding divergence from IAS 2 (see Section 1.6).**

**Manufacturing-specific NRV scenarios.** NRV write-downs are most often triggered in manufacturing by: **obsolete inventory** (superseded SKUs, end-of-life components); **slow-moving WIP** (partly built product with no current demand); **finished goods with a declining selling price** (commodity price collapse, competitive pricing pressure); and **raw materials whose price has declined** below the cost embedded in on-hand stock ([KPMG — Handbook: Inventory, lower of cost or NRV write-down triggers](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-inventory-2024.pdf)).

**Sub-segment applicability.**

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Lower of cost or NRV (FIFO/WA/spec-ID) | ✓ | ✓ | ✓ | ✓ | ◑ |
| LCM retained (LIFO/RIM) | ◑ | ◑ | ◑ | — | — |
| Obsolescence write-downs | ✓ | ◑ | ✓ | ◑ | ◑ |

Obsolescence exposure is highest for **Discrete (D)** and **Hybrid (H)** manufacturers of technology-driven, model-cycle product; **Process (P)** obsolescence is lower (commodities rarely "obsolesce") but price-decline NRV write-downs are common. **ETO (E)** is partial (◑) because custom output is largely contract-accounted (ASC 606), but uninstalled or cancelled-order materials can require NRV write-down. **[JUDGMENT AREA]** — NRV estimation depends on forecasted selling prices and completion costs and is a significant estimate.

**IFRS note.** IAS 2 applies lower of cost and NRV to **all** inventory regardless of cost formula (because LIFO is prohibited and RIM is only a costing technique), and **requires reversal** of prior write-downs when NRV recovers — both material divergences detailed in Section 1.6.

---

## 1.5 Inventory Disclosure Requirements (ASC 330-10-50)

**The standard.** ASC 330-10-50 and related SEC staff guidance require manufacturers to disclose the following in the notes to the financial statements.

- **Method used.** The basis of inventory measurement — FIFO, LIFO, weighted-average, or specific identification — must be disclosed, because the choice materially affects reported income and inventory ([Deloitte — Roadmap, SEC Comment Letter Considerations §2.12A, disclose inventory valuation policies and estimates; ASC 275-10-50 significant estimates](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-sec-comment-letter-considerations/chapter-2-financial-statement-accounting-disclosure/2-13-inventory)).
- **Carrying amount by major class.** Inventory is presented disaggregated into its major components — **raw materials, work-in-process, and finished goods** (and manufacturing supplies where material). The FASB's inventory-disclosure deliberations confirm disaggregation by component and by measurement basis ([Deloitte — Tentative Board Decisions, disaggregate inventory by component and by measurement basis](https://dart.deloitte.com/USDART/ov-resource/c80f55d7-81c4-11e6-b675-9fcba25a5d7e.html)).
- **LIFO reserve (when LIFO is used).** Disclose the **excess of replacement or current cost over the reported LIFO carrying amount** ([KPMG — Handbook: Inventory, disclose excess of replacement/current cost over LIFO value](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-inventory-2024.pdf); [Deloitte — Tentative Board Decisions, replacement cost for LIFO inventory](https://dart.deloitte.com/USDART/ov-resource/c80f55d7-81c4-11e6-b675-9fcba25a5d7e.html)).

\[ \text{LIFO reserve} = \text{inventory at current/replacement cost} - \text{inventory at LIFO carrying amount} \]

- **Substantial and unusual write-downs.** Material losses from the subsequent measurement of inventory (write-downs to NRV/market) and the facts and circumstances leading to them are disclosed ([Deloitte — FASB Proposes Updates to Inventory Disclosures, atypical losses from subsequent measurement and shrinkage/spoilage/damage](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2017/fasb-proposes-updates-inventory-disclosures-jan)).
- **Material LIFO liquidations.** Disclose the **effect on income of a LIFO liquidation** when material ([KPMG — Handbook: Inventory, disclose income realized from LIFO liquidation](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-inventory-2024.pdf); [Deloitte — Tentative Board Decisions, effect of LIFO liquidations on income](https://dart.deloitte.com/USDART/ov-resource/c80f55d7-81c4-11e6-b675-9fcba25a5d7e.html)).
- **Changes in inventory method.** A change in inventory method (e.g., LIFO to FIFO, or a change in LIFO pools) is a change in accounting principle requiring justification on the basis of **preferability**; SEC registrants must file a **preferability letter** from the auditor. The change is generally applied retrospectively under ASC 250, except that a change **to** LIFO is typically applied prospectively because retrospective restatement is impracticable ([Deloitte — Roadmap, SEC Comment Letter Considerations §2.12A Inventory, ASC 330 method selection and disclosure](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-sec-comment-letter-considerations/chapter-2-financial-statement-accounting-disclosure/2-13-inventory)).

**Sub-segment applicability.**

| Disclosure | D | P | H | J | E |
|---|---|---|---|---|---|
| Method used | ✓ | ✓ | ✓ | ✓ | ✓ |
| Class breakdown (RM / WIP / FG) | ✓ | ✓ | ✓ | ✓ | ◑ |
| LIFO reserve | ◑ | ◑ | ◑ | — | — |
| LIFO-liquidation income effect | ◑ | ◑ | ◑ | — | — |
| Write-down disclosure | ✓ | ✓ | ✓ | ◑ | ◑ |

Method disclosure is universal. The RM/WIP/FG split is partial for **ETO (E)** because much production sits in contract assets, not the three ASC 330 classes. LIFO disclosures appear only where LIFO is elected (D/P/H), and never for pure J/E (marked —).

**Note (recent FASB activity).** The FASB has explored expanded inventory disclosures (component and measurement-basis disaggregation, qualitative description of capitalized costs, reportable-segment inventory) and proposed adding ASC 330-10-50-13 to require all LIFO entities to disclose the excess of replacement/current cost over reported LIFO and the income effect of LIFO liquidations; users should confirm the current codified text against DART before implementation ([Deloitte — FASB Proposes Updates to Inventory Disclosures, proposed ASC 330-10-50-13](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2017/fasb-proposes-updates-inventory-disclosures-jan); [Deloitte — Tentative Board Decisions, inventory disclosure package](https://dart.deloitte.com/USDART/ov-resource/c80f55d7-81c4-11e6-b675-9fcba25a5d7e.html)).

---

## 1.6 IFRS Divergence — IAS 2 (resolved Q5)

IAS 2 *Inventories* and ASC 330 share the lower-of-cost-and-NRV core principle and identical NRV definition, but four divergences are material for a U.S. manufacturer that elects (or is required to use) IFRS at the tenant level.

1. **IAS 2 PROHIBITS LIFO (binding divergence).** The IASB removed LIFO from IAS 2 in its 2003 revision on the ground that LIFO does not faithfully represent inventory flows. A manufacturer reporting under IFRS **may not use LIFO** ([KPMG — IFRS vs US GAAP inventory, "IAS 2 prohibits LIFO; US GAAP allows its use"](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html); [IFRS — IASB staff paper, LIFO prohibited by IAS 2 since 2003 revision](https://www.ifrs.org/content/dam/ifrs/meetings/2016/september/iasb/review-ias-8-accounting-policies/ap26a-changes-in-wording.pdf); [EY — US GAAP vs IFRS: The basics, "LIFO is prohibited"](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-us/technical/accountinglink/documents/ey-ifrs11560-211us-01-14-2021.pdf)).

2. **IAS 2 PERMITS / REQUIRES write-down REVERSAL (binding divergence).** When the NRV of previously written-down inventory recovers, IAS 2 **requires the prior write-down to be reversed** (up to original cost) and recognized as a reduction of inventory expense in the period of recovery. U.S. GAAP **prohibits** any such reversal ([KPMG — IFRS vs US GAAP inventory, "Reversal of writedowns required under IAS 2; prohibited under US GAAP"](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html); [IFRS — IFRIC staff paper on NRV, IAS 2 para 28 write-down to NRV](https://www.ifrs.org/content/dam/ifrs/meetings/2021/february/ifric/ap03-ias2-costs-necessary-to-sell-inventories.pdf)).

3. **Same NRV definition.** IAS 2 paragraph 5 defines NRV as "the estimated selling price in the ordinary course of business less the estimated costs of completion and the estimated costs necessary to make the sale" — substantively the same as ASC 330 post-ASU 2015-11 ([IFRS — IFRIC staff paper, IAS 2 para 5 NRV definition](https://www.ifrs.org/content/dam/ifrs/meetings/2021/february/ifric/ap03-ias2-costs-necessary-to-sell-inventories.pdf); [KPMG — IFRS vs US GAAP inventory, NRV definition convergence](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)). A subtle difference: IAS 2 applies lower of cost and NRV to **all** inventory (including any that U.S. GAAP would carry under LCM), whereas U.S. GAAP retains LCM for LIFO/RIM ([KPMG — IFRS vs US GAAP inventory, IAS 2 applies NRV regardless of cost formula](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)).

4. **Cost-formula choices.** IAS 2 permits **FIFO or weighted-average** for ordinarily interchangeable inventory, and requires **specific identification** for items that are not ordinarily interchangeable or are produced/segregated for specific projects. The **same cost formula must be used for all inventories of similar nature and use** to the entity — a consistency requirement that U.S. GAAP does not explicitly impose ([EY — US GAAP vs IFRS: The basics, "same cost formula must be applied to all inventories similar in nature"](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-us/technical/accountinglink/documents/ey-ifrs11560-211us-01-14-2021.pdf); [IFRS — IAS 2 staff paper, selecting FIFO or weighted-average is an accounting policy](https://www.ifrs.org/content/dam/ifrs/meetings/2019/october/iasb/ap26a-ias-8.pdf)).

**Reporting consequence.** A U.S. manufacturer that uses LIFO under U.S. GAAP and **elects an IFRS reporting basis must restate inventory to a non-LIFO method** (FIFO or weighted-average), which eliminates the LIFO reserve, generally increases reported inventory and equity in inflationary environments, and changes COGS and gross margin. Because IRC §472 conformity ties LIFO for books to LIFO for tax, switching the financial-reporting basis to IFRS has direct U.S. tax consequences that require coordinated tax planning ([26 U.S. Code §472, LIFO conformity](https://www.law.cornell.edu/uscode/text/26/472); [KPMG — IFRS vs US GAAP inventory, LIFO prohibition](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)).

**Sub-segment applicability.** Not applicable as a matrix — the IAS 2 divergence applies **universally** to any tenant that elects IFRS, regardless of sub-segment. The practical impact is largest for LIFO-using **D / P / H** manufacturers, but the rule itself is sub-segment-agnostic.

---

## 1.7 Manufacturing-Specific Inventory Topics

**Standard-cost variances and inventory valuation.** When a manufacturer measures inventory at standard cost, period-end **cost variances** (material price/usage, labor rate/efficiency, overhead spending/volume) must be analyzed: variances that are **material** are allocated back to inventory and COGS so that inventory approximates an acceptable actual-cost basis; **immaterial** variances are expensed to COGS as a period cost. ASU 2015-11 removed the explicit requirement to reconcile standard cost to another basis, on the rationale that regularly updated standards approximate FIFO/average ([Deloitte — FASB Proposes Updates to Inventory Disclosures, ASC 330-10-30-12 standard-cost update](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2017/fasb-proposes-updates-inventory-disclosures-jan)). This topic is the direct accounting counterpart to the variance KPIs in `Manufacturing_KPIs_Sources.md` Section II — see Part IV §4.2 for the variance-panel interaction.

**Tooling inventory.** Pre-production and tooling/engineering costs incurred to fulfill a customer contract are frequently **capitalized as contract fulfillment costs under ASC 340-40** (recoverable costs that generate or enhance resources used to satisfy future performance obligations) rather than inventoried under ASC 330. ASC 340-40-25-5 sets the capitalization criteria; the FASB retained legacy pre-production cost guidance for long-term supply arrangements ([Deloitte — Roadmap, Costs of Fulfilling a Contract, ASC 340-40-25-5](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-13-contract-costs/13-3-costs-fulfilling-a-contract); [KPMG — Defining Issues 16-33, FASB retains pre-production cost guidance](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2016/defining-issues-16-33-preproduction-costs.pdf); cross-reference `Manufacturing_ASC606_Sources.md` on contract costs and tooling).

**Spare parts.** Spare and replacement parts are **capitalized as depreciable PP&E** when they are major, dedicated to specific equipment, and used over more than one period; they are **inventoried under ASC 330** when they are consumable parts (e.g., reusable/returnable parts, consumable lubricants) that will be consumed directly in production ([KPMG — Handbook: Inventory, spare parts classification](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-inventory-2024.pdf)).

**Returnable containers.** Returnable containers (kegs, totes, pallets, cylinders) for which the manufacturer retains ownership are generally **not** product inventory; depending on use and life they are inventoried (if short-lived/consumable) or capitalized as PP&E (if long-lived returnable assets) — the same consumable-vs-depreciable test as spare parts ([KPMG — Handbook: Inventory, consumable vs depreciable classification](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-inventory-2024.pdf)).

**Consigned inventory.** Inventory held on **consignment remains on the consignor's balance sheet** until control transfers to the end customer, because the consignee has not obtained control (the consignor retains the risks and the ability to direct the goods). This is an ASC 606 control-transfer determination applied to inventory presentation ([Deloitte — ASC 606 Roadmap, control-transfer principle; cross-reference `Manufacturing_ASC606_Sources.md`](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition)).

**Inventory at customer/vendor location.** Inventory physically located at a customer site (consignment, vendor-managed inventory) or at a contract manufacturer/processor remains the reporting entity's asset where the entity retains control and the risks/rewards of ownership; **physical location does not determine ownership** ([KPMG — Handbook: Inventory, recognition based on control not physical possession](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-inventory-2024.pdf)).

**Sub-segment applicability.**

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Standard-cost variance capitalization | ✓ | ✓ | ✓ | ◑ | ◑ |
| Tooling (ASC 340-40) | ✓ | ◑ | ✓ | ✓ | ✓ |
| Spare parts (PP&E vs inventory) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Returnable containers | ◑ | ✓ | ◑ | — | — |
| Consigned inventory | ✓ | ◑ | ✓ | ◑ | ◑ |
| Inventory at customer/vendor location | ✓ | ◑ | ✓ | ◑ | ◑ |

Tooling is especially material for **D / H / J / E** manufacturers that build to customer specification (automotive, aerospace, industrial OEM supply). Returnable containers concentrate in **Process (P)** (bulk liquids, gases, food). Standard-cost variance handling is partial for **J / E**, which favor actual job/contract costing.

---

# PART II — ASC 842 LEASES (Manufacturing-Specific)

---

## 2.1 Scope of ASC 842

**The standard.** ASC 842 *Leases* requires a lessee to recognize, for **all leases with a term greater than 12 months**, a right-of-use (ROU) asset and a lease liability on the balance sheet. A lessee may make an accounting-policy election **not** to recognize ROU assets and lease liabilities for **short-term leases** (a lease term of 12 months or less at commencement that does not include a purchase option the lessee is reasonably certain to exercise) ([FASB — Leases under Topic 842, short-term-lease exemption and ASC 842-20-50 disclosures](https://www.fasb.org/leases_1)).

**Asset categories common in manufacturing.** Manufacturers commonly lease: **facilities** (plants, warehouses, distribution centers); **heavy equipment** (CNC machines, presses, forklifts, robotics, production lines); **vehicles** (delivery trucks, forklifts, fleet); and assets embedded within **supply or service contracts** (dedicated tanks, rail cars, logistics equipment) ([PwC — Embedded leases under ASC 842, dedicated/specialty equipment](https://www.pwc.com/us/en/services/consulting/deals/library/embedded-leases.html)).

**Distinguishing a lease from a service contract.** A contract is or contains a lease if it conveys the **right to control the use of an identified asset** for a period in exchange for consideration. Control requires both (a) the right to obtain **substantially all the economic benefits** from use of the identified asset and (b) the right to **direct the use** of the asset. An asset is "identified" if it is explicitly or implicitly specified and the supplier does **not** have a substantive right to substitute it ([PwC — Embedded leases, identified asset + right to control](https://www.pwc.com/us/en/services/consulting/deals/library/embedded-leases.html)).

**Sub-segment applicability.**

| Asset category | D | P | H | J | E |
|---|---|---|---|---|---|
| Facilities (plants, warehouses) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Heavy production equipment | ✓ | ✓ | ✓ | ✓ | ◑ |
| Vehicles / fleet | ✓ | ✓ | ✓ | ◑ | ◑ |
| Embedded leases in supply/service contracts | ✓ | ✓ | ✓ | ◑ | ◑ |

All five sub-segments lease facilities. Heavy production-equipment leasing is universal except partial for **ETO (E)**, whose project-specific equipment is more often owned or project-charged. Embedded leases concentrate in **D / P / H** with large supply/tolling/logistics footprints.

---

## 2.2 Lessee Accounting — Right-of-Use Asset and Lease Liability

**Initial recognition.** At the commencement date, the lessee recognizes a **lease liability** measured at the **present value of the remaining lease payments** and an **ROU asset** measured at the lease liability plus any prepaid lease payments and initial direct costs, less lease incentives received ([FASB — Leases under Topic 842, ROU asset / lease liability recognition](https://www.fasb.org/leases_1)).

\[ \text{Lease liability}_{0} = \sum_{t=1}^{n} \frac{\text{Lease payment}_{t}}{(1 + r)^{t}} \]

**Discount rate.** The lessee uses the **rate implicit in the lease** if that rate is readily determinable; otherwise it uses its **incremental borrowing rate** (the rate it would pay to borrow, on a collateralized basis over a similar term, the funds necessary to obtain an asset of similar value). Non-public-business-entity lessees may elect a risk-free-rate practical expedient by asset class ([FASB — Leases under Topic 842, discount-rate determination](https://www.fasb.org/leases_1)).

**Lease classification (lessee).** A lessee classifies a lease as a **finance lease** (the successor concept to the legacy capital lease) if **any one** of five criteria is met at commencement:

1. The lease transfers **ownership** of the asset to the lessee by the end of the term;
2. The lease grants a **purchase option** the lessee is **reasonably certain** to exercise;
3. The lease term is for the **major part** of the asset's remaining economic life;
4. The present value of lease payments (plus residual value guaranteed) is **substantially all** of the asset's fair value; or
5. The asset is so **specialized** that it has no alternative use to the lessor at the end of the term.

A lease that meets none of the five criteria is an **operating lease** ([FASB — Leases under Topic 842, finance vs operating classification criteria](https://www.fasb.org/leases_1); [IFRS — Topic 842 Post-Implementation Review staff paper, GAAP dual finance/operating classification](https://www.ifrs.org/content/dam/ifrs/meetings/2024/june/fasb-iasb/ap7b-pir-topic-842.pdf)).

**Subsequent measurement.**

- **Finance lease:** the lessee recognizes **interest expense** on the lease liability (effective-interest method) **plus amortization** of the ROU asset (generally straight-line). The combined expense is **front-loaded** because interest is higher in early periods ([IFRS — Topic 842 PIR staff paper, finance-lease P&L pattern](https://www.ifrs.org/content/dam/ifrs/meetings/2024/june/fasb-iasb/ap7b-pir-topic-842.pdf)).
- **Operating lease:** the lessee recognizes a **single lease cost on a straight-line basis** over the lease term, even though the liability still unwinds using the effective-interest method (the ROU amortization is the plug that straight-lines total cost) ([FASB — Leases under Topic 842, operating-lease single-cost model](https://www.fasb.org/leases_1)).

**Manufacturing patterns.** **Equipment leases** in manufacturing frequently meet the finance-lease criteria — long terms relative to economic life, specialized/dedicated production assets, or bargain purchase options at the end. **Facility leases** (multi-tenant plants and warehouses with renewal optionality and no transfer of ownership) are frequently **operating** leases ([IFRS — Topic 842 PIR staff paper, lessee classification distinction](https://www.ifrs.org/content/dam/ifrs/meetings/2024/june/fasb-iasb/ap7b-pir-topic-842.pdf)).

**Sub-segment applicability.**

| Pattern | D | P | H | J | E |
|---|---|---|---|---|---|
| Equipment leases tend finance | ✓ | ✓ | ✓ | ◑ | ◑ |
| Facility leases tend operating | ✓ | ✓ | ✓ | ✓ | ✓ |

**[JUDGMENT AREA]** — classification turns on facts (term vs. economic life, specialization, purchase-option likelihood) and is sub-segment-influenced but not sub-segment-determined.

---

## 2.3 Lessor Accounting (less common for manufacturers)

**The standard.** A lessor classifies each lease as a **sales-type lease**, a **direct-financing lease**, or an **operating lease**. Sales-type and direct-financing classification mirrors the lessee finance-lease criteria (transfer of control); leases failing those criteria are operating leases for the lessor ([FASB — Leases under Topic 842, lessor classification](https://www.fasb.org/leases_1)).

**Manufacturer-dealer leases.** When the lessor **manufactured or dealt in** the leased asset and the lease is a **sales-type** lease, the lessor recognizes **selling profit or loss at lease commencement** (the difference between the fair value of the asset and its carrying amount), in addition to interest income over the lease term. This is the lease analog of an outright sale by a manufacturer-dealer ([FASB — Leases under Topic 842, manufacturer/dealer selling profit at commencement](https://www.fasb.org/leases_1)).

**Sub-segment applicability.**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | — | ◑ | — | — |

Lessor / manufacturer-dealer accounting is **primarily a Discrete (D)** and **Hybrid (H)** concern — equipment manufacturers that lease their own product to customers (industrial machinery, vehicles, capital equipment). It is rare-to-inapplicable for pure Process (P), Job-Shop (J), and ETO (E), which sell rather than lease their output (marked — / ◑ accordingly).

**IFRS note.** Lessor accounting is **largely converged** between ASC 842 and IFRS 16 — both retain a dual finance/operating classification for lessors and recognize manufacturer-dealer selling profit on finance leases ([IFRS — Topic 842 PIR staff paper, lessor accounting largely the same as IFRS 16](https://www.ifrs.org/content/dam/ifrs/meetings/2024/june/fasb-iasb/ap7b-pir-topic-842.pdf)).

---

## 2.4 Embedded Leases in Manufacturing Supply Contracts

**The standard.** A contract that is not labeled a "lease" may nonetheless **contain an embedded lease** if it conveys the right to control the use of an identified asset. The two pieces an embedded lease requires are (1) an **identified asset** and (2) the **right to control** that asset's use (the right to obtain substantially all the economic benefits and to direct the use) ([PwC — Embedded leases under ASC 842, "an embedded lease contains two pieces: identified asset; right to control"](https://www.pwc.com/us/en/services/consulting/deals/library/embedded-leases.html)).

**Common manufacturing arrangements that may contain embedded leases.**

- **Take-or-pay contracts** — long-term supply commitments where the customer pays for minimum volumes regardless of usage; if a dedicated plant/unit serves the contract, the asset may be "identified."
- **Tolling agreements** — a customer supplies raw material to a processor that converts it using **dedicated** equipment; if the customer controls the use of identified conversion assets, a lease may be embedded.
- **Logistics / transportation contracts** — where a **dedicated truck, rail car, or tank** is provided and the customer directs its use.

Indicators of an identified asset include highly customized or dedicated machinery and the absence of a substantive supplier substitution right ([PwC — Embedded leases, indicators of an identified asset (customized/dedicated machinery)](https://www.pwc.com/us/en/services/consulting/deals/library/embedded-leases.html)).

**Why this is a manufacturing trap.** Manufacturers routinely sign supply, tolling, and logistics contracts that were historically accounted for as executory/service contracts; under ASC 842 these may require **separation of a lease component** and on-balance-sheet recognition of an ROU asset and lease liability. PwC specifically flags asking the right questions to surface dedicated/specialty equipment buried in operating contracts ([PwC — Embedded leases, "ask the right questions" to identify embedded leases](https://www.pwc.com/us/en/services/consulting/deals/library/embedded-leases.html)).

**Sub-segment applicability.**

| Arrangement | D | P | H | J | E |
|---|---|---|---|---|---|
| Take-or-pay | ◑ | ✓ | ◑ | — | — |
| Tolling agreements | ◑ | ✓ | ◑ | — | — |
| Dedicated logistics equipment | ✓ | ✓ | ✓ | ◑ | ◑ |

Embedded leases concentrate heavily in **Process (P)** manufacturing (chemicals, metals, food, energy), where take-or-pay and tolling are common; dedicated-logistics embedded leases span D / P / H. **[JUDGMENT AREA]**.

---

## 2.5 Lease Disclosures (ASC 842-20-50)

**The standard.** ASC 842-20-50 requires lessees to disclose qualitative and quantitative information enabling users to assess the amount, timing, and uncertainty of cash flows arising from leases.

- **General description of leases** — nature of the entity's leases, basis and terms of variable payments, options (renewal, termination, purchase), and residual-value guarantees.
- **Quantitative disclosures** — **weighted-average remaining lease term** and **weighted-average discount rate**, each **segregated between finance and operating leases**, and the **components of lease cost** (finance-lease interest and amortization, operating-lease cost, short-term lease cost, variable lease cost, sublease income) ([FASB — Leases under Topic 842, ASC 842-20-50-4 weighted-average term/rate by finance vs operating; illustrative tagged elements L31–L33](https://www.fasb.org/leases_1)).
- **Maturity analysis** of lease liabilities — undiscounted future lease payments by year for at least five years plus a total of the remainder, reconciled to the discounted lease liability, presented separately for finance and operating leases ([FASB — Leases under Topic 842, maturity analysis](https://www.fasb.org/leases_1)).
- **Cash paid for amounts included in the measurement of lease liabilities** (operating cash flows for operating and finance leases; financing cash flows for finance-lease principal).
- **ROU assets obtained in exchange for new lease liabilities** — disclosed separately for finance and operating leases (illustrative elements L29–L30) ([FASB — Leases under Topic 842, ROU assets obtained in exchange for lease liabilities](https://www.fasb.org/leases_1)).
- **Short-term lease cost and variable lease cost** — including the illustrative variable-lease-payment element (L28) ([FASB — Leases under Topic 842, short-term and variable lease cost](https://www.fasb.org/leases_1)).
- **Income from subleases.**

**Sub-segment applicability.**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

The disclosure package is required of every lessee regardless of sub-segment; the **content** (mix of finance vs operating, variable payments) varies by sub-segment but the requirement is universal.

---

## 2.6 IFRS Divergence — IFRS 16 (resolved Q5)

**The standard.** IFRS 16 *Leases* applies a **single on-balance-sheet lessee model**: a lessee recognizes an ROU asset and a lease liability for **all** leases over 12 months, with **no operating/finance distinction**. Every lessee lease produces a **finance-style P&L pattern** — interest on the liability plus amortization of the ROU asset (front-loaded total cost) ([IFRS — Topic 842 PIR staff paper, "IFRS 16 requires that all leases be accounted for consistent with the Topic 842 approach for finance leases"](https://www.ifrs.org/content/dam/ifrs/meetings/2024/june/fasb-iasb/ap7b-pir-topic-842.pdf)).

**The divergence from ASC 842.** The primary difference between Topic 842 and IFRS 16 is that **U.S. GAAP distinguishes finance leases from operating leases in a lessee's financial statements, while IFRS 16 does not**. Leases classified as **operating** under ASC 842 are accounted for **differently** under IFRS 16 — they get finance-style (interest + amortization) treatment rather than a single straight-line lease cost ([IFRS — Topic 842 PIR staff paper, main GAAP/IFRS difference is lessee finance vs operating classification](https://www.ifrs.org/content/dam/ifrs/meetings/2024/june/fasb-iasb/ap7b-pir-topic-842.pdf)).

**Lessor accounting largely converged** (see Section 2.3) ([IFRS — Topic 842 PIR staff paper, lessor accounting largely the same](https://www.ifrs.org/content/dam/ifrs/meetings/2024/june/fasb-iasb/ap7b-pir-topic-842.pdf)).

**Manufacturing reporting consequence.** A U.S. manufacturer with significant **operating** leases under ASC 842 will see **different P&L geography under IFRS 16**: operating-lease cost (a single operating expense above EBITDA under ASC 842) is replaced by **depreciation/amortization and interest** under IFRS 16, which **raises reported EBITDA** and reclassifies cost below the EBITDA line. The PIR staff paper specifically notes differences in **cash-flow classification and EBITDA** resulting from the GAAP dual model versus the IFRS 16 single model ([IFRS — Topic 842 PIR staff paper, EBITDA and cash-flow effects of dual vs single model](https://www.ifrs.org/content/dam/ifrs/meetings/2024/june/fasb-iasb/ap7b-pir-topic-842.pdf)). For a manufacturer leasing plants and warehouses, this materially changes EBITDA-based covenants and benchmark metrics — a tenant electing IFRS must re-baseline its leverage and margin KPIs accordingly.

**Sub-segment applicability.** Not applicable as a matrix — the IFRS 16 single-model divergence applies **universally** to any tenant that elects IFRS, regardless of sub-segment. The EBITDA impact is largest for facility-heavy lessees (which under ASC 842 carry many operating leases), but the rule itself is sub-segment-agnostic.

---

## 2.7 Manufacturing-Specific Lease Patterns

**Sale-leaseback of manufacturing facilities.** A manufacturer that sells a plant and leases it back must first determine whether the transfer qualifies as a **sale under ASC 606** (control transfer); ASC 842-40 sale-and-leaseback guidance is **aligned with ASC 606** on the control-transfer notion. If the transfer is **not** a sale (e.g., the leaseback is a finance lease or a repurchase option precludes sale accounting), the transaction is accounted for as a **financing**, with no gain recognized and the "sold" asset remaining on the balance sheet ([Deloitte — Roadmap: Leasing §10.3, sale-leaseback transfer assessed for sale under ASC 606 / control transfer](https://dart.deloitte.com/USDART/home/codification/broad-transactions/asc842-10/roadmap-leasing/chapter-10-sale-leaseback-transactions/10-3-determining-whether-transfer-an); cross-reference `Manufacturing_ASC606_Sources.md` on control transfer).

**Equipment financing structures.** A manufacturer acquiring production equipment must distinguish a **finance lease** (right-of-use of an asset it does not legally own at inception) from a **purchase financed by a loan** (legal ownership at inception with a separate debt instrument). The distinction drives whether the asset is an ROU asset under ASC 842 or owned PP&E under ASC 360 with a corresponding note payable ([FASB — Leases under Topic 842, finance-lease vs purchase distinction](https://www.fasb.org/leases_1)).

**Lease incentives.** **Tenant improvement allowances** and **free-rent periods** are **lease incentives** that reduce the ROU asset (and are reflected in the straight-line cost for operating leases). Whether a TI allowance is a lease incentive or a reimbursement for a lessee asset depends on who owns/controls the improvement ([FASB — Leases under Topic 842, lease incentives reduce ROU asset](https://www.fasb.org/leases_1)).

**Variable lease payments.** Payments that vary with an **index or rate (e.g., CPI escalators)** are included in the lease liability **at the index/rate in effect at commencement** and remeasured only on specified triggers; payments that vary with **usage or output** are **excluded** from the lease liability and expensed as incurred — **unless** they are **in-substance fixed payments**, which are included ([FASB — Leases under Topic 842, variable payments and in-substance fixed payments](https://www.fasb.org/leases_1)).

**Sub-segment applicability.**

| Pattern | D | P | H | J | E |
|---|---|---|---|---|---|
| Sale-leaseback of facilities | ✓ | ✓ | ✓ | ◑ | ◑ |
| Equipment finance vs purchase+loan | ✓ | ✓ | ✓ | ◑ | ◑ |
| Lease incentives (TI / free rent) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Variable lease payments (CPI / usage) | ✓ | ✓ | ✓ | ◑ | ◑ |

Sale-leaseback and equipment-financing structures are most prevalent in capital-intensive **D / P / H** manufacturing; lease incentives (facility leases) are universal. **[JUDGMENT AREA]** for in-substance fixed payments and TI-allowance characterization.

---

# PART III — SUPPLY-CHAIN AND SEC REGULATION S-K DISCLOSURES (Manufacturing)

Part III covers the **non-codification** disclosure obligations that bear most heavily on manufacturers: the SEC's narrative business and MD&A items (Regulation S-K), supply-chain transparency regimes (conflict minerals, forced-labor laws, cybersecurity), climate-related disclosure, and the codified disclosures most material to manufacturers (segment reporting, concentrations, going concern, subsequent events). Reg S-K applies to **SEC registrants** filing on Forms 10-K / 10-Q / S-1, etc.; private tenants will not file these but the *substance* (backlog, raw-material sourcing, concentrations) often appears in lender packages and management reporting.

---

## 3.1 Item 101 — Description of Business

**The rule.** Regulation S-K **Item 101** (17 CFR 229.101) requires a narrative description of the registrant's business. The SEC **modernized** Item 101 in 2020 (Release No. 33-10825), shifting Item 101(c) from a prescriptive list to a **principles-based** disclosure that requires only information **material** to an understanding of the business ([eCFR — 17 CFR 229.101 (Item 101)](https://www.law.cornell.edu/cfr/text/17/229.101); [SEC — Final Rule 33-10825, Modernization of Regulation S-K Items 101, 103, 105](https://www.sec.gov/files/rules/final/2020/33-10825.pdf)).

**Manufacturing-relevant Item 101(c) topics.** Topics historically enumerated and still disclosable when material include: **sources and availability of raw materials**; **dependence on a few major customers**; **backlog of firm orders** (the dollar amount and how much is expected to be filled within the current year); **seasonality** of the business; **practices regarding working capital** (inventory levels, return rights); **competitive conditions**; **environmental compliance** costs; **government contracts** (renegotiation/termination); and **human capital** measures and objectives. The 2020 modernization **removed the explicit line-item mandates** for backlog and working capital but they remain disclosable under the materiality principle ([eCFR — 17 CFR 229.101(c)](https://www.law.cornell.edu/cfr/text/17/229.101); [SEC — Final Rule 33-10825 (added human capital, made disclosures principles-based)](https://www.sec.gov/files/rules/final/2020/33-10825.pdf)).

**Why this matters for a manufacturer.** Raw-material sourcing, backlog, and customer/supplier concentration are precisely the items a manufacturer's MD&A and notes must support. Advisacor's variance and KPI outputs (backlog coverage, raw-material price variance, supplier concentration) are the *internal evidence base* that would feed an Item 101(c) narrative — though the Item 101 narrative itself is a human-authored disclosure, not an Advisacor output.

**Sub-segment applicability.**

| Item 101(c) topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Sources/availability of raw materials | ✓ | ✓ | ✓ | ✓ | ✓ |
| Backlog of firm orders (\(\$\) and % fillable this year) | ◑ | — | ◑ | ✓ | ✓ |
| Seasonality | ◑ | ◑ | ◑ | ◑ | ◑ |
| Working-capital / inventory practices | ✓ | ✓ | ✓ | ◑ | ◑ |
| Major-customer dependence | ◑ | ◑ | ◑ | ✓ | ✓ |
| Human capital | ✓ | ✓ | ✓ | ✓ | ✓ |

**[JUDGMENT AREA].** Backlog is **most meaningful for Job-Shop (J) and Engineer-to-Order (E)** producers, who operate against firm customer orders; it is rated **◑** for Discrete (D) and Hybrid (H) (build-to-stock plus build-to-order mix) and **—** for pure Process (P) producers running continuous make-to-stock output, where firm-order backlog is rarely a meaningful figure. No cell is left blank: seasonality is **◑** across all sub-segments because materiality is entity-specific rather than sub-segment-driven.

---

## 3.2 Item 303 — Management's Discussion and Analysis (MD&A)

**The rule.** Regulation S-K **Item 303** (17 CFR 229.303) requires MD&A covering **liquidity, capital resources, results of operations, and critical accounting estimates**, with the objective of giving investors the ability to see the company **"through the eyes of management."** The SEC amended Item 303 in 2020 (Release No. 33-10890), codifying the requirement to disclose **material cash requirements** (including commitments for capital expenditures) and **eliminating the tabular contractual-obligations disclosure** that was previously required ([eCFR — 17 CFR 229.303 (Item 303 MD&A)](https://www.ecfr.gov/current/title-17/chapter-II/part-229/subpart-229.300/section-229.303); [SEC — Final Rule 33-10890, MD&A and Selected Financial Data amendments](https://www.sec.gov/files/rules/final/2020/33-10890.pdf)).

**Manufacturing-relevant MD&A content.** Material drivers a manufacturer must discuss include: **changes in raw-material and input costs** and their margin effects; **capacity utilization** and its effect on fixed-overhead absorption; **inventory build/draw** and its liquidity effect; **LIFO liquidation** effects on cost of sales (where LIFO is used — see §1.5); **known trends or uncertainties** reasonably likely to have a material effect (e.g., supply disruption, commodity volatility); and **material cash requirements** including capital-expenditure commitments for plant and equipment ([eCFR — 17 CFR 229.303(b) results of operations / known trends](https://www.ecfr.gov/current/title-17/chapter-II/part-229/subpart-229.300/section-229.303)).

**Variance-panel linkage (cross-reference `Manufacturing_KPIs_Sources.md` §II).** The internal variance panel is the analytical engine behind MD&A narrative: **unfavorable material-price variance** explains input-cost commentary; **capacity-utilization** and **fixed-overhead volume variance** explain absorption commentary; **LIFO reserve** movement explains LIFO-liquidation commentary. The panel is an **internal management view** and does **not by itself constitute** or trigger any required MD&A disclosure — it is decision-support evidence a human preparer uses.

**Sub-segment applicability.**

| MD&A driver | D | P | H | J | E |
|---|---|---|---|---|---|
| Raw-material / input-cost trends | ✓ | ✓ | ✓ | ✓ | ✓ |
| Capacity utilization / FOH absorption | ✓ | ✓ | ✓ | ◑ | ◑ |
| Inventory build/draw liquidity effect | ✓ | ✓ | ✓ | ◑ | ◑ |
| LIFO liquidation effect on COGS | ◑ | ◑ | ◑ | ◑ | ◑ |
| Material cash requirements (capex commitments) | ✓ | ✓ | ✓ | ◑ | ◑ |

Capacity/absorption and inventory-liquidity narratives are central for capital- and inventory-intensive **D / P / H** producers and **◑** (situational) for order-driven **J / E** shops. LIFO commentary is **◑** universally because it applies only where the LIFO election exists (see §1.5).

---

## 3.3 Supply-Chain Transparency and Forced-Labor Disclosures

Manufacturers face a layered set of **supply-chain transparency** mandates spanning U.S. federal securities law, U.S. state law, and foreign due-diligence regimes.

**Conflict minerals (Dodd-Frank §1502 / Reg S-K Item 1502).** SEC rules require companies that manufacture (or contract to manufacture) products in which **conflict minerals** are **necessary to functionality or production** to determine whether those minerals — **tantalum, tin, gold, and tungsten (3TG)** — originated in the **Democratic Republic of the Congo or adjoining countries**. The process is a **reasonable country-of-origin inquiry (RCOI)**; depending on the result the company files **Form SD** and, if applicable, a **Conflict Minerals Report (CMR)** with an **independent private sector audit**. Form SD is filed annually by **May 31** ([SEC — Press Release 2012-163, Conflict Minerals adopting release (3TG, Form SD, RCOI, CMR)](https://www.sec.gov/newsroom/press-releases/2012-2012-163-related-materials)).

**California Transparency in Supply Chains Act (SB 657).** Retail sellers and manufacturers **doing business in California** with **annual worldwide gross receipts exceeding \(\$100\) million** must **disclose their efforts** to eradicate slavery and human trafficking from their direct supply chains, addressing **verification, supplier audits, certification, internal accountability, and training** ([California Attorney General — SB 657 Transparency in Supply Chains Act](https://oag.ca.gov/SB657)).

**Foreign due-diligence regimes.** The **German Supply Chain Due Diligence Act (LkSG)** applied to companies with **≥3,000 employees from 2023** and **≥1,000 employees from 2024**, with fines up to **€8 million or 2% of annual turnover**; the **EU Corporate Sustainability Due Diligence Directive (CSDDD)** phases in mandatory human-rights and environmental due diligence for large companies (broadly **>1,000 employees and >€450 million turnover**); and the **UK Modern Slavery Act** requires a slavery-and-human-trafficking statement and has **extraterritorial** reach to entities carrying on business in the UK ([Circularise — German Supply Chain Act (LkSG) thresholds and penalties](https://www.circularise.com/blogs/german-supply-chain-act-lksg-what-you-need-to-know)).

**Sub-segment applicability.**

| Supply-chain regime | D | P | H | J | E |
|---|---|---|---|---|---|
| Conflict minerals 3TG (Form SD) | ✓ | ◑ | ✓ | ◑ | ✓ |
| CA SB 657 (>\(\$100\)M worldwide receipts) | ◑ | ◑ | ◑ | ◑ | ◑ |
| German LkSG / EU CSDDD | ◑ | ◑ | ◑ | ◑ | ◑ |
| UK Modern Slavery Act | ◑ | ◑ | ◑ | ◑ | ◑ |

**[JUDGMENT AREA].** Conflict-minerals exposure is rated **✓** for **Discrete (D), Hybrid (H), and Engineer-to-Order (E)** producers, whose products (electronics, machined assemblies, capital equipment) commonly contain 3TG, and **◑** for **Process (P)** and **Job-Shop (J)** producers, where 3TG presence is product-dependent. The state/foreign forced-labor regimes are **◑ across all sub-segments** because applicability is driven by **size and jurisdictional nexus**, not manufacturing mode — no cell is left blank.

---

## 3.4 Cybersecurity Disclosure (Reg S-K Item 106 / Form 8-K Item 1.05)

**The rule.** The SEC adopted cybersecurity disclosure rules in 2023 (Release No. 33-11216). Registrants must disclose a **material cybersecurity incident** on **Form 8-K, Item 1.05, within four business days** of determining the incident is material, describing the nature, scope, timing, and material impact. Annually, **Regulation S-K Item 106** requires disclosure in **Form 10-K, Item 1C** of the registrant's **processes for assessing, identifying, and managing material cybersecurity risks**, and of **board oversight and management's role**. The rules were effective **December 18, 2023** (Form 8-K reporting; smaller reporting companies June 15, 2024), with Item 1C annual disclosure beginning for **fiscal years ending on or after December 15, 2023** ([SEC — Final Rule 33-11216, Cybersecurity Risk Management, Strategy, Governance, and Incident Disclosure](https://www.sec.gov/files/rules/final/2023/33-11216.pdf); [Deloitte — Heads Up: SEC's Final Rule on Cybersecurity Disclosures](https://dart.deloitte.com/USDART/home/publications/deloitte/heads-up/2023/sec-rule-cyber-disclosures)).

**Why this matters for a manufacturer.** Manufacturers increasingly run **connected operational technology (OT)** — MES, SCADA, ERP-integrated production lines — where a cyber incident can halt production and is therefore frequently **material**. The four-business-day clock on Item 1.05 is operationally demanding for OT-heavy producers.

**Sub-segment applicability.** Universal for SEC registrants — applies regardless of sub-segment:

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| 8-K Item 1.05 material incident (4 business days) | ✓ | ✓ | ✓ | ✓ | ✓ |
| 10-K Item 1C risk management & governance | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 3.5 Climate-Related Disclosures — Most-Current Status

**SEC climate rule — status as of June 2026.** The SEC adopted **"The Enhancement and Standardization of Climate-Related Disclosures for Investors"** (Release No. 33-11275) on **March 6, 2024**. The Commission **voluntarily stayed** the rule on **April 4, 2024** pending judicial review (consolidated in the Eighth Circuit, *Iowa v. SEC*). On **March 27, 2025** the SEC voted to **end its defense** of the rule. On **May 29, 2026** the SEC **proposed to rescind the climate-related disclosure rules in their entirety** (Chairman Atkins's statement). **The climate rule is therefore not in effect, is not being defended, and is the subject of a pending rescission proposal** — manufacturers are **not currently subject** to mandatory SEC climate disclosure ([SEC — Press Release 2025-58, SEC ends defense of climate disclosure rules (March 27, 2025)](https://www.sec.gov/newsroom/press-releases/2025-58); [SEC — Press Release 2026-49, SEC proposes rescission of climate-related disclosure rules (May 29, 2026)](https://www.sec.gov/newsroom/press-releases/2026-49-sec-proposes-rescission-climate-related-disclosure-rules); [Deloitte — Sustainability Spotlight: sustainability-related reporting requirements and standards](https://dart.deloitte.com/USDART/home/publications/deloitte/sustainability-spotlight/2025/sustainability-related-reporting-requirements-and-standards)).

**California climate laws — the operative U.S. regime.** With the federal rule dormant, **California's climate statutes** are the binding U.S. mandate for large manufacturers with a California nexus:

- **SB 253 (Climate Corporate Data Accountability Act).** Companies with **>\(\$1\) billion** total annual revenue doing business in California must report **Scope 1 and Scope 2** greenhouse-gas emissions (first deadline **August 10, 2026**) and **Scope 3** emissions beginning **2027**. The California Air Resources Board (CARB) approved the initial implementing regulation on **February 26, 2026** ([EY — California climate disclosure laws (SB 253 / SB 261) implementation update](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-us/technical/accountinglink/documents/ey-ttp30067-261us-03-04-2026.pdf)).
- **SB 261 (Climate-Related Financial Risk Act).** Companies with **>\(\$500\) million** total annual revenue must publish a **climate-related financial risk report** aligned with the **TCFD framework / IFRS S2**. SB 261 was subject to a **preliminary injunction** development in late 2025 ([EY — California SB 261 climate financial risk reporting](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-us/technical/accountinglink/documents/ey-ttp30067-261us-03-04-2026.pdf)).

**GHG Protocol (the measurement backbone).** Emissions scopes used by SB 253 and global frameworks come from the **GHG Protocol Corporate Standard**: **Scope 1** = direct emissions from owned/controlled sources (e.g., fuel combustion in furnaces and boilers); **Scope 2** = indirect emissions from **purchased electricity, steam, heating, cooling**; **Scope 3** = other indirect upstream/downstream value-chain emissions (purchased goods, transportation, use of sold products) ([GHG Protocol — A Corporate Accounting and Reporting Standard (Revised Edition)](https://ghgprotocol.org/sites/default/files/standards/ghg-protocol-revised.pdf)).

**Manufacturing reporting consequence.** Manufacturing is **Scope 1- and Scope 2-intensive** (process heat, electricity for machinery), so SB 253's Scope 1+2 mandate hits large manufacturers directly; Scope 3 inventories require **supplier and product-use data** that overlap the supply-chain regimes in §3.3.

**Sub-segment applicability.**

| Climate regime | D | P | H | J | E |
|---|---|---|---|---|---|
| SEC climate rule (33-11275) — *dormant; rescission proposed* | — | — | — | — | — |
| CA SB 253 Scope 1+2 (>\(\$1\)B revenue) | ◑ | ✓ | ◑ | — | ◑ |
| CA SB 253 Scope 3 (2027) | ◑ | ◑ | ◑ | — | ◑ |
| CA SB 261 climate financial risk (>\(\$500\)M) | ◑ | ◑ | ◑ | — | ◑ |
| GHG Protocol Scope 1/2/3 measurement | ✓ | ✓ | ✓ | ◑ | ✓ |

**[JUDGMENT AREA].** The SEC rule row is **—** uniformly because it is currently dormant/rescission-proposed and binds no one. **Process (P)** producers (chemicals, metals, food processing) are rated **✓** for SB 253 Scope 1+2 as the most emissions-intensive, energy-heavy mode; **Discrete / Hybrid / ETO** are **◑** (size- and process-dependent); **Job-Shop (J)** is rated **—** for the revenue-threshold California laws because small job shops rarely meet the \(\$500\)M–\(\$1\)B revenue tests, but **◑** for GHG Protocol measurement (voluntary/customer-driven). No cell is blank.

---

## 3.6 Segment Reporting — ASC 280

**The standard.** ASC 280 requires public entities to report information about **operating segments** — components whose operating results are **regularly reviewed by the chief operating decision maker (CODM)** to allocate resources and assess performance, and for which discrete financial information is available. An operating segment is a **reportable segment** if it meets any **10% quantitative threshold**: its reported **revenue** (including intersegment) is ≥10% of combined revenue, the absolute amount of its **profit or loss** is ≥10% of the greater of combined profits or combined losses, or its **assets** are ≥10% of combined assets (ASC 280-10-50-12). Identified reportable segments must in total represent **at least 75% of consolidated external revenue** (the 75% test), or additional segments are added ([Deloitte — Roadmap: Segment Reporting §3.3, Step 2: perform the quantitative thresholds](https://dart.deloitte.com/USDART/home/codification/presentation/asc280-10/roadmap-segment-reporting/chapter-3-reportable-segments/3-3-step-2-perform-quantitative)).

**Manufacturing application.** A diversified manufacturer operating multiple **lines of business / plant groups** (the founder's environment includes **13 LOBs**) must aggregate or disaggregate them into operating segments based on CODM review and the aggregation criteria, then apply the 10% / 75% tests. The 2023 ASU on segment disclosures (ASU 2023-07) additionally requires disclosure of **significant segment expenses** regularly provided to the CODM.

**Sub-segment applicability.** Segment reporting is **entity-structure-driven**, not manufacturing-mode-driven; it applies to any public registrant with more than one operating segment:

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Operating-segment identification (CODM) | ✓ | ✓ | ✓ | ✓ | ✓ |
| 10% revenue/profit/asset thresholds | ✓ | ✓ | ✓ | ✓ | ✓ |
| 75% external-revenue coverage test | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 3.7 Concentration Disclosures — ASC 275

**The standard.** ASC 275 (*Risks and Uncertainties*) requires disclosure of **certain significant concentrations** — including concentrations in the **volume of business with a particular customer, supplier, or lender**, in **sources of supply of materials/labor/services**, and in **the market or geographic area** of operations — when (a) the concentration exists at the balance-sheet date, (b) it makes the entity **vulnerable to the risk of a near-term severe impact**, and (c) it is at least reasonably possible the impact will occur in the near term. Separately, **ASC 825-10-50-20/21** (and legacy ASC 275 guidance) addresses **concentrations of credit risk** ([Deloitte — Roadmap: Segment Reporting §3.3 (concentration and disaggregation context)](https://dart.deloitte.com/USDART/home/codification/presentation/asc280-10/roadmap-segment-reporting/chapter-3-reportable-segments/3-3-step-2-perform-quantitative)).

**Manufacturing application.** Manufacturers are commonly exposed to **single-source raw-material suppliers**, **major-customer concentration** (especially J / E shops working to large OEM contracts), and **geographic concentration** of plants. These concentration risks are also surfaced in Item 101(c) (§3.1). Advisacor's supplier- and customer-concentration KPIs supply the internal evidence base; the ASC 275 note is a human-authored disclosure.

**Sub-segment applicability.**

| Concentration type | D | P | H | J | E |
|---|---|---|---|---|---|
| Customer concentration | ◑ | ◑ | ◑ | ✓ | ✓ |
| Supplier / single-source material | ✓ | ✓ | ✓ | ◑ | ◑ |
| Geographic / market concentration | ◑ | ◑ | ◑ | ◑ | ◑ |

**[JUDGMENT AREA].** Customer concentration is **✓** for order-driven **J / E** shops (often reliant on a few OEM customers) and **◑** for **D / P / H** producers selling to broader markets. Single-source supplier risk is **✓** for material-intensive **D / P / H** modes and **◑** for **J / E**. No cell is blank — geographic concentration is **◑** universally as it is entity-specific.

---

## 3.8 Going Concern — ASC 205-40

**The standard.** ASC 205-40 requires management, **each annual and interim reporting period**, to evaluate whether **conditions and events, considered in the aggregate, raise substantial doubt** about the entity's ability to **continue as a going concern within one year after the date the financial statements are issued** (or available to be issued). If substantial doubt is raised but **alleviated** by management's plans, the entity discloses the principal conditions/events, management's evaluation, and the plans that alleviated the doubt; if substantial doubt is **not alleviated**, the entity must additionally state that **substantial doubt exists** (ASC 205-40-50-12 and 50-13) ([KPMG — Handbook: Going Concern](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-going-concern.pdf); [Deloitte — Codification ASC 205-40 (Presentation — Going Concern)](https://dart.deloitte.com/USDART/home/codification/presentation/asc205-40)).

**Manufacturing application.** Going-concern triggers for manufacturers include **recurring operating losses, working-capital deficiency, loss of a key customer or single-source supplier, debt-covenant breaches**, and **inability to refinance maturing debt**. Inventory write-downs (§1.2) and unfavorable variances may be **corroborating evidence** of conditions; the assessment itself is a management judgment.

**Sub-segment applicability.** Universal — the one-year assessment applies to every reporting entity:

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| One-year substantial-doubt assessment | ✓ | ✓ | ✓ | ✓ | ✓ |
| Disclosure of conditions/plans (50-12/13) | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 3.9 Subsequent Events — ASC 855

**The standard.** ASC 855 distinguishes **Type I (recognized) subsequent events** — those providing **additional evidence about conditions that existed at the balance-sheet date** (e.g., settlement of pre-existing litigation, bankruptcy of a customer whose receivable was impaired at year-end), which are **recognized** in the financial statements — from **Type II (non-recognized) subsequent events** — those arising from conditions that **arose after the balance-sheet date** (e.g., a fire destroying a plant after year-end), which are **disclosed** but **not recognized** if material ([Deloitte — Codification ASC 205-40 / subsequent-events context](https://dart.deloitte.com/USDART/home/codification/presentation/asc205-40); [KPMG — Handbook: Going Concern (subsequent-events interaction with one-year assessment)](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-going-concern.pdf)).

**Manufacturing application.** Common Type I events: confirmation of a **net realizable value** estimate when post-year-end sales prices crystallize an NRV write-down whose condition existed at year-end (links to §1.2). Common Type II events: a **post-year-end plant casualty, major customer loss, or acquisition**.

**Sub-segment applicability.** Universal:

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Type I (recognized) events | ✓ | ✓ | ✓ | ✓ | ✓ |
| Type II (disclosed-only) events | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# PART IV — CROSS-VERTICAL DISCLOSURE NOTES

Part IV records how the three disclosure topics interact across Advisacor's multi-tenant architecture and how they relate to the internal variance/KPI engine. These notes are **design guidance for the knowledge stack**, not authoritative accounting literature.

---

## 4.1 Multi-Tenant Considerations (GAAP vs IFRS Routing)

**The routing problem.** Advisacor serves tenants on different reporting frameworks. A tenant electing **IFRS** (per the planning document's resolved Q5) requires **IAS 2** routing for inventory and **IFRS 16** routing for leases, which diverge from US GAAP in ways that change the **disclosure templates** that should be surfaced:

| Topic | US GAAP (default) | IFRS (alternate routing) | Disclosure-template impact |
|---|---|---|---|
| Inventory cost flow | LIFO permitted (ASC 330; §1.5) | **LIFO prohibited** (IAS 2) — FIFO / weighted-avg only | Suppress LIFO-reserve and LIFO-liquidation disclosures for IFRS tenants; no LIFO reserve note (§1.5, §1.7) |
| Inventory write-down | Lower of cost or NRV; **reversal prohibited** (ASC 330; §1.2) | Lower of cost and NRV; **reversal required** when NRV recovers (IAS 2) | Add a write-down-reversal disclosure line for IFRS tenants (§1.6) |
| Lessee lease model | **Dual** model: finance vs operating (ASC 842; §2.2) | **Single** on-balance-sheet model; all leases finance-style (IFRS 16) | Suppress operating-lease single-cost presentation; route all lessee leases to ROU + interest/amortization; re-baseline EBITDA-based metrics (§2.6) |

**Design rule.** The framework election should be a **tenant-level attribute** that switches which disclosure templates and KPI baselines are presented. Where a divergence affects a template (LIFO suppression, write-down reversal, single-model leases), the routing layer must **flag the divergence** so a human preparer reviewing the tenant's package sees the IFRS-specific behavior rather than a GAAP default. These divergences are documented at primary-source depth in §1.5, §1.6, and §2.6.

---

## 4.2 Disclosure Workflow Implications for the Variance Panel

**The binding contract.** Section II of `Manufacturing_KPIs_Sources.md` is the binding specification for the manufacturing variance panel. Part IV records only the **disclosure-relevant** touch-points; it does not redefine the panel.

**Variance-panel → disclosure evidence map.**

| Variance / KPI signal | Disclosure it provides *evidence* for | Direction of the linkage |
|---|---|---|
| Unfavorable material-usage / price variance; standard-cost above NRV | ASC 330 NRV write-down (§1.2); MD&A input-cost narrative (§3.2) | Variance is **corroborating evidence**; write-down is a separate accounting judgment |
| Capacity-utilization KPI; fixed-overhead **volume variance** | MD&A capacity/absorption narrative (§3.2); abnormal-idle-capacity expensing under ASC 330 (§1.3) | Low utilization → period-expense of abnormal idle FOH; also MD&A commentary |
| LIFO reserve movement (standard-cost basis vs LIFO basis) | LIFO reserve disclosure & LIFO-liquidation MD&A effect (§1.5, §3.2) | Reserve change quantifies LIFO-liquidation income effect |
| Supplier / customer concentration KPI | ASC 275 concentration note (§3.7); Item 101(c) (§3.1) | Internal KPI is the evidence base for a human-authored note |
| Backlog-coverage KPI | Item 101(c) backlog narrative (§3.1) | Most relevant for J / E sub-segments |

**Critical boundary.** The variance panel is an **internal management view**. It **does not directly drive any required SEC or IFRS disclosure** — every disclosure listed above is the product of a **human preparer's judgment** using the panel as decision-support evidence. Advisacor's role is to surface the evidence and the candidate disclosure topics, classified as a recommendation for human review, never to author or file a disclosure autonomously.

**Sub-segment note.** The evidence-map linkages above carry the same sub-segment weightings established in their source sections (NRV write-down weighting per §1.2; capacity/absorption per §3.2; backlog per §3.1). No new matrix is introduced here because Part IV is descriptive of cross-references already matrixed in Parts I–III.

---

## Primary Source Index

All sources below are **primary or authoritative-interpretive** (FASB Codification via Deloitte DART, fasb.org, SEC/eCFR, IFRS Foundation, GHG Protocol, IRS, Big-Four handbooks, census.gov). Secondary references are flagged as cross-reference only.

| Source | URL | Coverage |
|---|---|---|
| FASB ASC 330 (Inventory) via Deloitte DART | [dart.deloitte.com ASC 330](https://dart.deloitte.com/USDART/home/codification/assets/asc330) | Inventory cost, lower-of-cost-or-NRV, abnormal cost expensing |
| KPMG — Handbook: Inventory (2024) | [kpmg.com Inventory Handbook](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-inventory-2024.pdf) | Inventory recognition, costing, disclosure |
| KPMG — Inventory: IFRS vs US GAAP | [kpmg.com IFRS vs US GAAP inventory](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html) | IAS 2 vs ASC 330 (LIFO, write-down reversal) |
| FASB ASU 2015-11 (Simplifying Inventory Measurement) — Dean Dorton | [deandorton.com ASU 2015-11](https://deandorton.com/highlights-of-fasbs-asu-2015-11/) | Lower of cost or NRV; scope exception for LIFO/retail |
| FASB ASU 2015-11 — Weaver | [weaver.com ASU 2015-11](https://weaver.com/resources/adopting-new-and-improved-fasb-inventory-reporting-guidelines/) | NRV measurement adoption |
| Deloitte — Heads Up: proposed inventory disclosures (2017) | [dart.deloitte.com inventory disclosures](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2017/fasb-proposes-updates-inventory-disclosures-jan) | Disaggregation & inventory disclosure proposals |
| Deloitte — Tentative Board Decisions (inventory disclosure) | [dart.deloitte.com tentative decisions](https://dart.deloitte.com/USDART/ov-resource/c80f55d7-81c4-11e6-b675-9fcba25a5d7e.html) | Inventory disclosure project status |
| Houseblend — ASC 330 inventory write-downs | [houseblend.io ASC 330 write-downs](https://www.houseblend.io/articles/asc-330-inventory-valuation-write-downs) | NRV write-down mechanics (cross-reference) |
| IRC §472 (LIFO) | [law.cornell.edu 26 USC 472](https://www.law.cornell.edu/uscode/text/26/472) | LIFO election; conformity requirement |
| 26 CFR §1.472-2 (LIFO conformity) | [law.cornell.edu 26 CFR 1.472-2](https://www.law.cornell.edu/cfr/text/26/1.472-2) | LIFO book-tax conformity rule |
| 26 CFR §1.472-1 (LIFO method) | [law.cornell.edu 26 CFR 1.472-1](https://www.law.cornell.edu/cfr/text/26/1.472-1) | LIFO method mechanics |
| IRS — LIFO Practice Unit | [irs.gov LIFO practice unit](https://www.irs.gov/pub/fatca/int_practice_units/cor_c_017.pdf) | LIFO conformity & liquidation |
| IRS — Dollar-Value LIFO (TD 8976) | [irs.gov TD 8976](https://www.irs.gov/pub/irs-regs/td8976.pdf) | Dollar-value LIFO pooling |
| EY — US GAAP vs IFRS basics | [ey.com US GAAP vs IFRS](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-us/technical/accountinglink/documents/ey-ifrs11560-211us-01-14-2021.pdf) | Inventory & leases GAAP/IFRS divergences |
| IFRS — IAS 2 staff paper (accounting policies) | [ifrs.org IAS 8 / IAS 2 paper](https://www.ifrs.org/content/dam/ifrs/meetings/2019/october/iasb/ap26a-ias-8.pdf) | IAS 2 cost-flow and policy guidance |
| IFRS — IAS 2 costs necessary to sell | [ifrs.org IAS 2 selling costs](https://www.ifrs.org/content/dam/ifrs/meetings/2021/february/ifric/ap03-ias2-costs-necessary-to-sell-inventories.pdf) | NRV measurement under IAS 2 |
| IFRS — IAS 8/IAS 2 wording review | [ifrs.org IAS 8 wording](https://www.ifrs.org/content/dam/ifrs/meetings/2016/september/iasb/review-ias-8-accounting-policies/ap26a-changes-in-wording.pdf) | IAS 2 policy disclosure |
| ASC 340-40 contract costs / tooling — Deloitte | [dart.deloitte.com ASC 340-40 contract costs](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-13-contract-costs/13-3-costs-fulfilling-a-contract) | Pre-production / tooling cost capitalization |
| KPMG — Defining Issues 16-33 (pre-production costs) | [kpmg.com Defining Issues 16-33](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2016/defining-issues-16-33-preproduction-costs.pdf) | Tooling & pre-production cost treatment |
| FASB — Leases (Topic 842) | [fasb.org leases](https://www.fasb.org/leases_1) | Lessee/lessor model, ROU asset, classification |
| PwC — Embedded leases | [pwc.com embedded leases](https://www.pwc.com/us/en/services/consulting/deals/library/embedded-leases.html) | Identifying embedded leases in contracts |
| IFRS — Topic 842 PIR staff paper (842 vs IFRS 16) | [ifrs.org Topic 842 PIR](https://www.ifrs.org/content/dam/ifrs/meetings/2024/june/fasb-iasb/ap7b-pir-topic-842.pdf) | Dual vs single model; EBITDA & cash-flow divergence |
| Deloitte — Roadmap: Leasing §10.3 (sale-leaseback) | [dart.deloitte.com sale-leaseback](https://dart.deloitte.com/USDART/home/codification/broad-transactions/asc842-10/roadmap-leasing/chapter-10-sale-leaseback-transactions/10-3-determining-whether-transfer-an) | Sale-leaseback transfer/control assessment |
| SEC Regulation S-K Item 101 (eCFR) | [law.cornell.edu 17 CFR 229.101](https://www.law.cornell.edu/cfr/text/17/229.101) | Description of business; raw materials, backlog, human capital |
| SEC — Final Rule 33-10825 (S-K modernization) | [sec.gov 33-10825](https://www.sec.gov/files/rules/final/2020/33-10825.pdf) | Principles-based Item 101(c); human capital |
| SEC Regulation S-K Item 303 (eCFR) | [ecfr.gov S-K 303](https://www.ecfr.gov/current/title-17/chapter-II/part-229/subpart-229.300/section-229.303) | MD&A: liquidity, results, material cash requirements |
| SEC — Final Rule 33-10890 (MD&A amendments) | [sec.gov 33-10890](https://www.sec.gov/files/rules/final/2020/33-10890.pdf) | Material cash requirements; removed contractual-obligations table |
| SEC — Press Release 2012-163 (Conflict Minerals) | [sec.gov 2012-163](https://www.sec.gov/newsroom/press-releases/2012-2012-163-related-materials) | 3TG, Form SD, RCOI, Conflict Minerals Report |
| California AG — SB 657 (Supply Chains) | [oag.ca.gov SB 657](https://oag.ca.gov/SB657) | CA forced-labor supply-chain disclosure (>\(\$100\)M) |
| Circularise — German Supply Chain Act (LkSG) | [circularise.com LkSG](https://www.circularise.com/blogs/german-supply-chain-act-lksg-what-you-need-to-know) | LkSG thresholds & penalties; EU CSDDD / UK MSA context |
| SEC — Final Rule 33-11216 (Cybersecurity) | [sec.gov 33-11216](https://www.sec.gov/files/rules/final/2023/33-11216.pdf) | 8-K Item 1.05; Reg S-K Item 106 / 10-K Item 1C |
| Deloitte — Heads Up: SEC Cybersecurity Disclosures | [dart.deloitte.com cyber disclosures](https://dart.deloitte.com/USDART/home/publications/deloitte/heads-up/2023/sec-rule-cyber-disclosures) | Cyber incident & governance disclosure |
| SEC — Press Release 2025-58 (ends climate-rule defense) | [sec.gov 2025-58](https://www.sec.gov/newsroom/press-releases/2025-58) | SEC ends defense of climate disclosure rule |
| SEC — Press Release 2026-49 (proposes climate rescission) | [sec.gov 2026-49](https://www.sec.gov/newsroom/press-releases/2026-49-sec-proposes-rescission-climate-related-disclosure-rules) | Proposed rescission of climate rule (current status) |
| Deloitte — Sustainability Spotlight (reporting standards) | [dart.deloitte.com sustainability spotlight](https://dart.deloitte.com/USDART/home/publications/deloitte/sustainability-spotlight/2025/sustainability-related-reporting-requirements-and-standards) | Sustainability-reporting landscape |
| EY — California climate laws (SB 253 / SB 261) | [ey.com CA climate disclosure](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-us/technical/accountinglink/documents/ey-ttp30067-261us-03-04-2026.pdf) | SB 253 Scope 1/2/3; SB 261 climate financial risk |
| GHG Protocol — Corporate Standard (Revised) | [ghgprotocol.org corporate standard](https://ghgprotocol.org/sites/default/files/standards/ghg-protocol-revised.pdf) | Scope 1 / 2 / 3 emissions definitions |
| Deloitte — Roadmap: Segment Reporting §3.3 (ASC 280) | [dart.deloitte.com ASC 280 segments](https://dart.deloitte.com/USDART/home/codification/presentation/asc280-10/roadmap-segment-reporting/chapter-3-reportable-segments/3-3-step-2-perform-quantitative) | Operating segments; 10% / 75% tests; concentrations |
| KPMG — Handbook: Going Concern | [kpmg.com Going Concern Handbook](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2024/handbook-going-concern.pdf) | ASC 205-40 one-year assessment; subsequent events |
| Deloitte — Codification ASC 205-40 (Going Concern) | [dart.deloitte.com ASC 205-40](https://dart.deloitte.com/USDART/home/codification/presentation/asc205-40) | Going concern; subsequent-events interaction |
| U.S. Census — 2022 NAICS Sector 31-33 Manufacturing | [census.gov NAICS 31-33](https://www.census.gov/data/tables/2022/econ/economic-census/naics-sector-31-33.html) | Sub-segment NAICS mapping |

---

*This document is part of the Advisacor Manufacturing Vertical Knowledge Stack (Module MFG-K-C, Wave 1). It is `DRAFT / SPEC — NOT EXECUTABLE — NOT LOCKED`, `executable: false`, `containsVerticalComplianceLogic: true`. All disclosure analyses, candidate disclosure topics, and divergence flags generated by Advisacor are classified as `output_classification = 'recommendation_for_human_review'`. No statement in this document constitutes final accounting, audit, legal, or filing advice, and nothing here authorizes Advisacor to author, certify, or file any SEC, GAAP, or IFRS disclosure autonomously. Users must validate every disclosure conclusion against the authoritative literature (FASB ASC, SEC Regulation S-K/S-X, IFRS Standards), against their specific facts and materiality judgments, and against their elected reporting basis (US GAAP or IFRS) before relying on it. The variance and KPI panels referenced in Part IV are internal management views that supply decision-support evidence only; they do not by themselves create, trigger, or satisfy any required SEC or IFRS disclosure — every such disclosure remains the product of a human preparer's judgment. The disclosure data path is spine-gated (tenant isolation + RBAC) per the Phase 42.5 universal control spine and is proved by the relevant panel probe, not asserted.*
