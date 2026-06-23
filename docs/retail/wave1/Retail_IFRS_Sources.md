---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: true
phase: Retail Vertical Knowledge Stack — Wave 1 / RTL-K-C2
artifact: IFRS Sources Document
peer: docs/manufacturing/wave1/Manufacturing_IFRS_Sources.md
---

# Retail IFRS — IAS 2 Inventories, IAS 16 Property, Plant and Equipment, IFRS 15 Revenue, IFRS 16 Leases, IAS 36 Impairment, IAS 1 / IAS 7 Presentation, IAS 37 Provisions, and IFRS for SMEs — Comprehensive Source Reference

**DRAFT / SPEC — NOT EXECUTABLE — NOT LOCKED**

`executable: false`
`containsVerticalComplianceLogic: true`

**Document Title:** Retail IFRS Source Document — Advisacor Retail Vertical Knowledge Stack, Module RTL-K-C2
**Date Generated:** June 23, 2026
**Version:** 1.0 (DRAFT)
**Scope:** Retail entities electing **International Financial Reporting Standards (IFRS Accounting Standards)** as their tenant-level reporting basis. This module covers, at equal depth to the U.S. GAAP source documents and as a structural peer of `Manufacturing_IFRS_Sources.md` (Module MFG-K-C2), eight standards as applied to retail: (I) **IAS 2** *Inventories*; (II) **IAS 16** *Property, Plant and Equipment*; (III) **IFRS 15** *Revenue from Contracts with Customers* (retail surfaces); (IV) **IFRS 16** *Leases*; (V) **IAS 36** *Impairment of Assets* (store-level CGU); (VI) **IAS 1** *Presentation of Financial Statements* / **IAS 7** *Statement of Cash Flows*; (VII) **IAS 37** *Provisions, Contingent Liabilities and Contingent Assets*; and (VIII) the **IFRS for SMEs** Accounting Standard. NAICS sectors 44–45 (retail trade).
**Prepared for:** Advisacor — Wiseman Financial Technologies LLC (Matthew Wiseman, founder)
**Output Classification:** `recommendation_for_human_review`

**Authoring basis.** This document is the IFRS peer of `Retail_ASC606_Sources.md` (Module RTL-K-B) and a sibling of the manufacturing IFRS module. Advisacor retail clients can elect IFRS as their reporting basis at the tenant level, so IFRS receives **stand-alone, equal-depth coverage** here — **not** a divergence callout buried inside the GAAP documents. Each IFRS standard below is authored as if it were the only standard governing the topic; U.S. GAAP (ASC 330 / ASC 360 / ASC 350 / ASC 606 / ASC 842 / ASC 230 / ASC 420 / ASC 450) is cross-referenced **only where a divergence is material to a retailer**, and where it is, both standards are cited.

**Citation Discipline.** Every authoritative claim cites a **primary source**. The canonical citation for each standard is the **IFRS Foundation** issued standard ([ifrs.org](https://www.ifrs.org)); the official issued-standards list ([ifrs.org list of standards](https://www.ifrs.org/issued-standards/list-of-standards/)) is treated as canonical. The Big-Four and national-firm IFRS handbooks — **Deloitte IAS Plus / DART** ([iasplus.com](https://www.iasplus.com)), **KPMG** ([kpmg.com](https://kpmg.com)), **EY** ([ey.com](https://www.ey.com)), **PwC** ([pwc.com](https://www.pwc.com)), **Grant Thornton** ([grantthornton.global](https://www.grantthornton.global)), and **BDO** ([bdo.global](https://www.bdo.global)) — are treated as **primary for interpretation** of how the standards apply to retail. Some IFRS Foundation standard pages sit behind a **free registration wall** but are the canonical text; they are cited regardless, with the note **[REGISTRATION WALL]** where relevant. Definitions and treatments that turn on facts-and-circumstances judgment are flagged **[JUDGMENT AREA]**. Math notation uses \( \cdots \) inline and \[ \cdots \] display; there are zero `$`-style math delimiters.

**Relationship to RTL-K-B.** Part III (IFRS 15) **references, and does not duplicate,** the ASC 606 retail-surfaces analysis in `Retail_ASC606_Sources.md` (Module RTL-K-B). Where RTL-K-B authored a retail revenue surface (gift cards, loyalty, returns, consignment, principal/agent) under ASC 606, this document quotes the **IFRS 15 paragraphs** and flags divergence; it does not re-derive the underlying mechanics already established in RTL-K-B.

---

## How to Read This Document

The document is organized in **ten parts**:

- **Part I — IAS 2 Inventories (Retail Application):** scope, lower of cost and NRV, cost formulas (**LIFO prohibited**), the **retail method (IAS 2.22)**, NRV write-down and **reversal**, and disclosure.
- **Part II — IAS 16 PP&E (Retail Application):** **componentization (IAS 16.43)**, cost vs **revaluation model**, useful-life / residual-value annual review, and impairment trigger.
- **Part III — IFRS 15 Revenue (Retail Surfaces):** five-step recap, gift cards / breakage, loyalty, returns, consignment, principal vs agent.
- **Part IV — IFRS 16 Leases (Retail Tenant Impact):** **single lessee model**, short-term & low-value exemptions, variable (percentage-rent) payments, modifications, disclosure.
- **Part V — IAS 36 Impairment (Store-Level CGU):** CGU definition and identification for retail chains, recoverable amount, and **reversal**.
- **Part VI — IAS 1 / IAS 7 (Presentation):** statement of financial position, profit or loss (function vs nature of expense), and cash-flow lease classification.
- **Part VII — IAS 37 Provisions:** returns interaction, **restructuring of underperforming stores**, and onerous lease contracts.
- **Part VIII — IFRS for SMEs (Retail Application):** scope, retail-relevant simplifications, and when applicable.
- **Part IX — Wave 2 binding crosswalk:** IFRS standards mapped to manufacturing-pattern type reuse plus new retail-specific IFRS types.
- **Part X — Sources Reference Table.**

Each substantive topic carries, where applicable: (1) **The standard** — the operative paragraph(s) cited to the IFRS Foundation / interpretive handbooks; (2) **Retail application**; (3) **U.S. GAAP divergence** — where IFRS diverges materially (with both standards cited); (4) **Citation** — primary source.

---

# PART I — IAS 2 INVENTORIES (RETAIL APPLICATION)

---

## I.1 Scope and Core Principle

**The standard.** IAS 2 *Inventories* prescribes the accounting for inventories, the primary issue being the amount of cost to be recognised as an asset and carried forward until the related revenues are recognised ([IFRS Foundation — IAS 2 *Inventories*, objective](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). Inventories are defined (IAS 2.6) as assets **(a) held for sale in the ordinary course of business**, **(b) in the process of production for such sale**, or **(c) in the form of materials or supplies to be consumed in the production process or in the rendering of services** ([IFRS Foundation — IAS 2 paragraph 6](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). For a retailer, in-scope inventory is overwhelmingly **merchandise held for resale** — limb (a) — together with packaging and store supplies ([IFRS Foundation — IAS 2 summary](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/)).

**Core principle (IAS 2.1, IAS 2.9).** "Inventories shall be measured at the **lower of cost and net realisable value**" (IAS 2.9) ([IFRS Foundation — IAS 2 paragraph 9](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). This single lower-of-cost-and-NRV rule governs **all** retail merchandise under IFRS — there is no class (such as LIFO or retail-method stock under U.S. GAAP) carried at lower of cost or market ([KPMG — *Inventory: IFRS Accounting Standards vs US GAAP*](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html); [Deloitte IAS Plus — IAS 2 *Inventories* summary, lower of cost and NRV](https://www.iasplus.com/en/standards/ias/ias2)).

**Exclusions.** IAS 2 does **not** apply to financial instruments (IAS 32 / IFRS 9) or to biological assets and agricultural produce at the point of harvest (IAS 41) ([IFRS Foundation — IAS 2 scope, paragraphs 2–4](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). These carve-outs are rarely material to a general-merchandise retailer but matter for grocery / agri-retail formats.

---

## I.2 Cost Flow Methods — IAS 2.25

**The standard (IAS 2.23–27).** For items **not ordinarily interchangeable**, and goods produced and segregated for specific projects, cost is assigned by **specific identification** (IAS 2.23–24) ([IFRS Foundation — IAS 2 paragraphs 23–24](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). For ordinarily-interchangeable items — the normal retail case — IAS 2.25 provides:

> "The cost of inventories, other than those dealt with in paragraph 23, shall be assigned by using the **first-in, first-out (FIFO) or weighted average cost formula**. An entity shall use the same cost formula for all inventories having a similar nature and use to the entity." ([IFRS Foundation — IAS 2 paragraph 25](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html))

- **FIFO permitted (IAS 2.25).** Earliest-acquired items are deemed sold first; ending inventory reflects the most recent costs ([IFRS Foundation — IAS 2 paragraph 27 / summary](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/)).
- **Weighted average permitted (IAS 2.25, 27).** Cost is the weighted average of beginning balances and period purchases, computed periodically or on each receipt (moving average) ([IFRS Foundation — IAS 2 paragraph 27](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)).
- **LIFO PROHIBITED (IAS 2.25) — explicit departure from U.S. GAAP.** IAS 2.25 permits only FIFO and weighted average for interchangeable items and **does not permit the last-in, first-out (LIFO) cost formula**. LIFO was eliminated from IAS 2 in the 2003 revision; under IFRS, **LIFO is not an acceptable cost formula** ([KPMG — *Inventory: IFRS vs US GAAP*, LIFO prohibited under IAS 2](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)). A U.S. retailer electing LIFO under ASC 330 — and bound by the IRC §472 book-tax conformity rule — **cannot** carry LIFO into an IFRS basis; it must recast inventory on a FIFO or weighted-average basis. **There is no LIFO reserve, no LIFO liquidation effect, and no LIFO-conformity issue under IFRS.** **[FLAG CLEARLY for IFRS tenants.]**

**Consistency (IAS 2.25–26).** The same cost formula must be used for all inventories of similar nature and use; a geographical difference in location, by itself, is **not** sufficient to justify a different cost formula ([IFRS Foundation — IAS 2 paragraphs 25–26](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)).

**U.S. GAAP divergence.** ASC 330 permits **LIFO, FIFO, weighted average, and specific identification**; IAS 2 permits all but LIFO ([KPMG — *Inventory: IFRS vs US GAAP*](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)). This is the first binding retail IAS 2 divergence: U.S. grocers, drug, and department stores that have historically used LIFO to defer tax on rising prices must abandon it under IFRS.

---

## I.3 Retail Method — IAS 2.22

**The standard.** IAS 2.21–22 permits measurement techniques that approximate cost as a convenience. IAS 2.22 provides verbatim:

> "The **retail method** is often used in the retail industry for measuring inventories of large numbers of rapidly changing items with similar margins for which it is impracticable to use other costing methods. The cost of the inventory is determined by **reducing the sales value of the inventory by the appropriate percentage gross margin**. The percentage used takes into consideration inventory that has been **marked down to below its original selling price**. An average percentage for each retail department is often used." ([IFRS Foundation — IAS 2 paragraph 22 (2021 PDF, Part A)](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-2-inventories.pdf))

IAS 2.21 frames it as a permitted convenience: "Techniques for the measurement of the cost of inventories, such as the standard cost method or the retail method, may be used **for convenience if the results approximate cost**." ([IFRS Foundation — IAS 2 paragraph 21](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-2-inventories.pdf))

**Cost-to-retail ratio mechanics.** The retail method derives cost from selling price using a cost-to-retail (cost complement) percentage. The general form:

\[ \text{Cost-to-retail ratio} = \frac{\text{cost of goods available for sale}}{\text{retail (selling) value of goods available for sale}} \]

\[ \text{Ending inventory at cost} = \text{ending inventory at retail} \times \text{cost-to-retail ratio} \]

where ending inventory at retail equals goods available at retail less net sales, and the percentage takes account of markdowns below original selling price (IAS 2.22) ([IFRS Foundation — IAS 2 paragraph 22](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-2-inventories.pdf)).

**Less prescriptive than U.S. GAAP RIM — but reviewed regularly under IAS 2.** IAS 2 devotes a single paragraph (2.22) to the retail method, whereas ASC 330-10-30 contains detailed retail-inventory-method (RIM) mechanics (markons, markdowns, the conventional/LCM cost complement). Critically, KPMG notes that "**unlike US GAAP, IAS 2 requires companies using the retail method to review the calculation regularly — in our view, at least at each reporting date — to ensure it approximates cost**," with the gross-profit-margin percentage revised as necessary to reflect markdowns ([KPMG — *Inventory: IFRS vs US GAAP*, retail method reviewed regularly under IAS 2](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)). **[JUDGMENT AREA — the percentage and departmental groupings are judgmental.]**

**U.S. GAAP divergence.** Under US GAAP, companies applying the retail method compare cost to **market value** (current replacement cost, subject to a ceiling of NRV and a floor of NRV less a normal profit margin), **not NRV**; under IAS 2 the retail method is simply a cost-approximation technique feeding the uniform lower-of-cost-and-NRV test ([KPMG — *Inventory: IFRS vs US GAAP*, retail/LIFO compare to market not NRV under US GAAP](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)).

---

## I.4 NRV Measurement and Write-Down

**NRV definition (IAS 2.6).** "Net realisable value is the **estimated selling price in the ordinary course of business less the estimated costs of completion and the estimated costs necessary to make the sale**." (IAS 2.6) ([IFRS Foundation — IAS 2 paragraph 6](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). NRV is an **entity-specific** value and may not equal fair value less costs to sell (IAS 2.7) ([IFRS Foundation — IAS 2 paragraph 7](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)).

**Costs necessary to make the sale.** IAS 2 does **not** limit the deduction to incremental selling costs; an entity includes **all costs necessary to make the sale** in the ordinary course of business, applying judgement ([IFRS Foundation — IFRS Interpretations Committee staff paper, *IAS 2 — costs necessary to sell inventories*](https://www.ifrs.org/content/dam/ifrs/meetings/2021/february/ifric/ap03-ias2-costs-necessary-to-sell-inventories.pdf)). **[JUDGMENT AREA.]**

**Item-by-item or group basis (IAS 2.28–29).** NRV is generally assessed **item by item**; items may be grouped where they relate to the same product line, have similar purposes or end uses, are produced and marketed in the same geographical area, and cannot be practicably evaluated separately. It is **not** appropriate to write inventories down on the basis of a whole classification such as all finished goods or all the inventory in a particular industry/geographical segment (IAS 2.29) ([IFRS Foundation — IAS 2 paragraphs 28–29](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). For retail, the natural grouping is the SKU or department.

**Write-down recognised as expense (IAS 2.34).** "The amount of any write-down of inventories to net realisable value and **all losses of inventories shall be recognised as an expense in the period the write-down or loss occurs**." (IAS 2.34) ([IFRS Foundation — IAS 2 paragraph 34](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)).

**Reversal required (IAS 2.33) — differs from U.S. GAAP non-reversal for FIFO/avg per ASU 2015-11.** IAS 2.33 provides verbatim:

> "A new assessment is made of net realisable value in each subsequent period. **When the circumstances that previously caused inventories to be written down below cost no longer exist or when there is clear evidence of an increase in net realisable value because of changed economic circumstances, the amount of the write-down is reversed** (ie the reversal is limited to the amount of the original write-down) so that the new carrying amount is the lower of the cost and the revised net realisable value." ([IFRS Foundation — IAS 2 paragraph 33](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html))

The reversal is recognised (IAS 2.34) as a **reduction in the amount of inventories recognised as expense** (a reduction of cost of sales) in the period of reversal ([IFRS Foundation — IAS 2 paragraph 34](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). The reversal is **capped at the amount of the original write-down**:

\[ \text{Carrying amount after reversal} = \min\big(\text{original cost},\ \text{revised NRV}\big) \]

**U.S. GAAP divergence.** Under **ASC 330 (U.S. GAAP)**, a write-down to NRV (for FIFO/average inventory, post-ASU 2015-11) or to market (for LIFO/retail-method inventory) establishes a **new cost basis** that is **not subsequently reversed** even if NRV recovers (ASC 330-10-35) ([KPMG — *Inventory: IFRS vs US GAAP*, IFRS requires reversal; US GAAP prohibits reversal](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)). The practical retail effect: an IFRS retailer that marked down seasonal or fashion merchandise when its NRV fell, and then sees NRV recover (e.g., a delayed season, a price rebound), **must write it back up** to the lower of cost and recovered NRV; a U.S. GAAP retailer **cannot**. **[FLAG CLEARLY for IFRS tenants.]**

---

## I.5 Inventory Disclosure — IAS 2.36

**The standard.** The financial statements shall disclose (IAS 2.36) ([IFRS Foundation — IAS 2 disclosure paragraph 36 (2021 PDF)](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-2-inventories.pdf)):

1. **(a)** the **accounting policies** adopted in measuring inventories, including the **cost formula used** (FIFO, weighted average, or specific identification);
2. **(b)** the **total carrying amount** of inventories and the carrying amount **in classifications appropriate to the entity** (for a retailer: merchandise, packaging, store supplies);
3. **(c)** the carrying amount of inventories carried at **fair value less costs to sell**;
4. **(d)** the **amount of inventories recognised as an expense** during the period (typically cost of sales);
5. **(e)** the **amount of any write-down** of inventories recognised as an expense in the period (per IAS 2.34);
6. **(f)** the **amount of any reversal of any write-down** recognised as a reduction in inventory expense in the period (per IAS 2.34);
7. **(g)** the **circumstances or events that led to the reversal** of a write-down;
8. **(h)** the carrying amount of inventories **pledged as security** for liabilities.

**U.S. GAAP divergence (disclosure quantum).** The IAS 2.36(f)–(g) **reversal disclosures have no ASC 330 analogue** (because ASC 330 prohibits reversal), and IAS 2 has **no LIFO-reserve / LIFO-liquidation disclosures** (because LIFO is prohibited). An IFRS retailer's disclosure package therefore **adds** a write-down-reversal line and **suppresses** all LIFO notes relative to a U.S. GAAP package.

---

## I.6 U.S. GAAP Divergence Summary — IAS 2

| Topic | U.S. GAAP (ASC 330) | IFRS (IAS 2) |
|---|---|---|
| LIFO | **Permitted** | **Prohibited** (IAS 2.25) |
| Retail method | ASC 330-10-30-13 detailed (RIM mechanics; compare to market) | IAS 2.22 brief; cost-approximation feeding lower of cost and NRV; reviewed regularly |
| Measurement base | Lower of cost or NRV (FIFO/avg); lower of cost or **market** (LIFO/retail) | Lower of cost **and NRV** uniformly |
| NRV reversal | **Prohibited** (new cost basis) | **Required** when NRV recovers (capped at original cost; IAS 2.33) |
| Borrowing costs | Excluded from inventory | **Capitalizable if qualifying** (IAS 23) — rare for fast-turning retail stock |

Sources for table: ([KPMG — *Inventory: IFRS vs US GAAP*](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)); ([IFRS Foundation — IAS 2 (2024 issued HTML)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)); ([IFRS Foundation — IAS 23 *Borrowing Costs*](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ias23.html)).

---

# PART II — IAS 16 PROPERTY, PLANT AND EQUIPMENT (RETAIL APPLICATION)

---

## II.1 Componentization — IAS 16.43

**The standard.** IAS 16.43 provides verbatim:

> "**Each part of an item of property, plant and equipment with a cost that is significant in relation to the total cost of the item shall be depreciated separately.**" (IAS 16.43) ([IFRS Foundation — IAS 16 paragraph 43 (2021 PDF, Part A)](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf))

IAS 16.44 adds that "an entity **allocates the amount initially recognised** in respect of an item of property, plant and equipment **to its significant parts and depreciates separately each such part**," and IAS 16.46 requires that the remainder (parts individually not significant) also be depreciated ([IFRS Foundation — IAS 16 paragraphs 43–47](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)). This component approach is **mandatory, not optional**, under IFRS — a significant part with a useful life or depreciation method differing from other parts must be depreciated separately ([Deloitte CPDbox / IAS 16.43 component accounting](https://www.cpdbox.com/question/component-accounting-approach-ppe-ias-16-examples/); [BDO — IAS 16 component disaggregation required](https://www.bdo.global/getmedia/1024bf48-54c9-4d7e-bfce-24d495786310/IAS-16-AAG.pdf.aspx)).

**Retail-specific components.** For a retail store fit-out and building, the significant parts typically depreciated separately include: **HVAC / building services**, **store fixtures and shelving**, **signage and façade**, **point-of-sale and IT hardware**, and **leasehold improvements** (each commonly with a distinct useful life — e.g., a 5–7-year fixture life versus a 15–20-year HVAC life versus a lease-term-limited leasehold-improvement life). IAS 16 does not define a numeric "significant" threshold; entities apply judgement (common practice treats parts representing roughly 10–20% or more of total cost as candidates) ([CPCON — IAS 16.43 component approach, significance judgment](https://cpcongroup.com/insights/article/ias-16-component-approach/)). **[JUDGMENT AREA.]**

**Replacement and derecognition (IAS 16.13, 70).** When a retailer capitalises the cost of replacing a store component (e.g., a refit of shelving or HVAC), it **derecognises the carrying amount of the replaced part** regardless of whether that part had been depreciated separately (IAS 16.13, 70) ([IFRS Foundation — IAS 16 paragraphs 13, 70](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)).

---

## II.2 Cost Model vs Revaluation Model — IAS 16.29 through 16.42

**Election (IAS 16.29).** "An entity shall choose either the **cost model** in paragraph 30 or the **revaluation model** in paragraph 31 as its accounting policy and shall apply that policy to **an entire class** of property, plant and equipment." (IAS 16.29) ([IFRS Foundation — IAS 16 paragraph 29](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)).

**Cost model (IAS 16.30 — default; matches U.S. GAAP ASC 360).** "After recognition as an asset, an item of property, plant and equipment shall be carried at its **cost less any accumulated depreciation and any accumulated impairment losses**." (IAS 16.30) ([IFRS Foundation — IAS 16 paragraph 30 (2025 issued HTML)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ias16.html)).

**Revaluation model (IAS 16.31) — material U.S. GAAP divergence.** IAS 16.31 provides verbatim:

> "After recognition as an asset, an item of property, plant and equipment whose **fair value can be measured reliably shall be carried at a revalued amount, being its fair value at the date of the revaluation less any subsequent accumulated depreciation and subsequent accumulated impairment losses**. Revaluations shall be made **with sufficient regularity** to ensure that the carrying amount does not differ materially from that which would be determined using fair value at the end of the reporting period." (IAS 16.31) ([IFRS Foundation — IAS 16 paragraph 31](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)).

**Revaluation surplus to OCI; not recycled (IAS 16.39–41).** An increase in carrying amount on revaluation is recognised in **other comprehensive income** and accumulated in equity as a **revaluation surplus** (IAS 16.39); a decrease is recognised in profit or loss except to the extent of any credit balance in the surplus for that asset (IAS 16.40). On derecognition, the surplus may be transferred **directly to retained earnings** — it is **not recycled** through profit or loss (IAS 16.41) ([IFRS Foundation — IAS 16 paragraphs 39–41](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)). For a retailer that owns (rather than leases) flagship real estate, the revaluation model can materially lift the carrying value of land and buildings — an option simply unavailable under U.S. GAAP ([ACCA — IAS 16 revaluation entire class, sufficient regularity](https://www.accaglobal.com/gb/en/student/exam-support-resources/fundamentals-exams-study-resources/f7/technical-articles/ppe.html)).

---

## II.3 Useful Life and Residual Value — IAS 16.51

**The standard.** IAS 16.51 provides verbatim:

> "The **residual value and the useful life of an asset shall be reviewed at least at each financial year-end** and, if expectations differ from previous estimates, the change(s) shall be accounted for as a **change in an accounting estimate** in accordance with IAS 8 *Accounting Policies, Changes in Accounting Estimates and Errors*." (IAS 16.51) ([IFRS Foundation — IAS 16 paragraph 51](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf); [BDO — IAS 16.51 annual review, prospective adjustment](https://www.bdo.com.au/en-au/content/accounting-news/accounting-news-may-2018/more-common-errors)).

Changes are accounted for **prospectively** (no restatement of prior periods) ([ACCA — IAS 16, useful life reviewed each reporting period, prospective](https://www.accaglobal.com/gb/en/student/exam-support-resources/fundamentals-exams-study-resources/f7/technical-articles/ppe.html)). For retail, the annual review bites where a lease term changes (driving leasehold-improvement life), where a banner is being phased out, or where fixtures are refreshed on a shorter cycle than originally estimated. The depreciation method is likewise reviewed at least annually (IAS 16.61).

---

## II.4 Impairment Trigger

A fall in store performance, a decision to close or convert a store, or physical damage are impairment indicators that trigger an IAS 36 test of the store's carrying amount. The recognition, measurement, store-level CGU identification, and **reversal** mechanics are addressed in **Part V (IAS 36)** below; IAS 16.63 cross-refers impairment of PP&E to IAS 36 ([IFRS Foundation — IAS 16 paragraph 63](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ias16.html)).

---

## II.5 U.S. GAAP Divergence Summary — IAS 16

| Topic | U.S. GAAP (ASC 360) | IFRS (IAS 16) |
|---|---|---|
| Componentization | **Permitted, not required** (composite-life common) | **Required** — significant parts depreciated separately (IAS 16.43) |
| Subsequent measurement | **Historical cost only** | **Cost OR revaluation model** by class (IAS 16.29, 31) |
| Revaluation surplus | n/a (prohibited) | To OCI; accumulated in equity; **not recycled** (IAS 16.39–41) |
| Useful-life / residual-value review | **Trigger / event-based** (review when events indicate) | **Annual** — at least each financial year-end (IAS 16.51) |
| Impairment | ASC 360 two-step (undiscounted CF then FV); **no reversal** | IAS 36 recoverable-amount (FVLCD vs VIU); **reversal permitted** (non-goodwill) |

Sources: ([IFRS Foundation — IAS 16 (2021 PDF)](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)); ([Deloitte DART — IFRS/US GAAP comparison: nonfinancial-asset impairment](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-1-assets/1-7-impairment-nonfinancial-assets)); ([Grant Thornton — Special Edition on IFRS for SMEs (revaluation option history)](https://www.grantthornton.global/globalassets/1.-member-firms/global/insights/article-pdfs/ifrs/ifrs-for-smes-2015-special-edition-portrait.pdf)).

---

# PART III — IFRS 15 REVENUE (RETAIL SURFACES)

This part **references, and does not duplicate,** the ASC 606 retail-surfaces analysis in `Retail_ASC606_Sources.md` (Module RTL-K-B). For each surface, RTL-K-B established the mechanics under ASC 606; here we quote the **IFRS 15 paragraphs** and flag divergence. IFRS 15 and ASC 606 are the product of a joint IASB/FASB project and are **substantially converged**; the residual retail divergences are noted below.

---

## III.1 Five-Step Model Recap — IFRS 15.9–IFRS 15.32

IFRS 15's core principle (IFRS 15.2) is that an entity recognises revenue to depict the transfer of promised goods or services to customers in an amount that reflects the consideration to which the entity expects to be entitled. The model is applied in five steps ([IFRS Foundation — IFRS 15 standard page](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/); [IFRS Foundation — IFRS 15 (2024 issued, HTML), core principle and five steps (paragraph 2)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ifrs15.html)):

1. **Identify the contract(s) with a customer (IFRS 15.9–16).** A contract is in scope only when, among other criteria, "**it is probable that the entity will collect the consideration to which it will be entitled**" (IFRS 15.9(e)) ([IFRS Foundation — IFRS 15.9 (2021 PDF, Part A)](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ifrs-15-revenue-from-contracts-with-customers.pdf)).
2. **Identify the performance obligations (IFRS 15.22–30).** Each promise to transfer a distinct good or service is a performance obligation.
3. **Determine the transaction price (IFRS 15.46–72).** Including variable consideration, constrained to the extent it is highly probable a significant reversal will not occur.
4. **Allocate the transaction price (IFRS 15.73–90).** On a relative stand-alone-selling-price basis.
5. **Recognise revenue when (or as) a performance obligation is satisfied (IFRS 15.31–45).** When the customer obtains control. For a typical retail over-the-counter sale, control transfers at the point of sale (IFRS 15.31–32) ([IFRS Foundation — IFRS 15.31–32](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ifrs-15-revenue-from-contracts-with-customers.pdf)).

**U.S. GAAP convergence note.** ASC 606 collectibility is "probable" defined as "likely to occur" (a higher U.S. threshold) whereas IFRS 15 "probable" means "more likely than not"; this is a recognized convergence difference (see RTL-K-B for the ASC 606 treatment) ([IFRS Foundation — IFRS 15 standard page](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/)).

---

## III.2 Gift Cards — IFRS 15.B44–B47 (Breakage Analog)

**The standard — customers' unexercised rights (breakage).** A retailer that sells a gift card receives prepayment for future goods/services and recognises a **contract liability** (IFRS 15.106). When the card is redeemed, revenue is recognised. For the portion expected to go unredeemed (**breakage**), IFRS 15.B44–B46 govern. IFRS 15.B46 provides verbatim:

> "If an entity **expects to be entitled to a breakage amount** in a contract liability, the entity shall recognise the expected breakage amount as revenue **in proportion to the pattern of rights exercised by the customer**. If an entity does **not** expect to be entitled to a breakage amount, the entity shall recognise the expected breakage amount as revenue **when the likelihood of the customer exercising its remaining rights becomes remote**." (IFRS 15.B46) ([IFRS Foundation — IFRS 15 illustrative examples (gift-card / breakage)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ifrs15-ie.html); [PwC — *Revenue from contracts with customers: retailers* (IFRS 15)](https://www.pwc.com/m1/en/services/cmaas/documents/ifrs15/ifrs-15-retailers.pdf)).

The breakage amount is estimated subject to the variable-consideration constraint (IFRS 15.B45 → IFRS 15.56–58). Where the retailer is required to remit unexercised rights to a government (unclaimed-property / escheatment), it does **not** recognise breakage on those amounts (IFRS 15.B47) ([IFRS Foundation — IFRS 15.B47](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ifrs15-ie.html)).

**Material right framework.** A gift card sold at a discount, or bundled with a "bonus card" promotion, may convey a **material right** (a customer option for additional goods at a discount incremental to the usual range) under IFRS 15.B40 — analysed in III.3 below.

**U.S. GAAP divergence (more prescriptive breakage paragraph).** PwC notes that under IFRS, "**no specific models are provided for recognising breakage. The models used under US GAAP are acceptable under IFRS**," whereas ASC 606-10-55-46 through 55-49 sets out the breakage guidance with more granularity ([PwC — *IFRS 15: retailers*, no specific IFRS breakage model; US GAAP models acceptable](https://www.pwc.com/m1/en/services/cmaas/documents/ifrs15/ifrs-15-retailers.pdf)). The retail effect is convergent in substance: a retailer that expects breakage recognises it proportionally to redemptions; one that does not expects it recognises it when redemption becomes remote (see RTL-K-B for the ASC 606 mechanics) ([RevenueHub — Unexercised Rights (Breakage) in ASC 606 (cross-reference)](https://www.revenuehub.org/article/unexercised-rights)).

---

## III.3 Loyalty Programs — IFRS 15.B39–B43

**The standard — customer options for additional goods or services.** IFRS 15.B40 provides verbatim:

> "If, in a contract, an entity grants a customer the option to acquire additional goods or services, that option **gives rise to a performance obligation in the contract only if the option provides a material right to the customer that it would not receive without entering into that contract** (for example, a discount that is **incremental to the range of discounts typically given for those goods or services to that class of customer** in that geographical area or market). If the option provides a material right to the customer, the customer in effect pays the entity in advance for future goods or services and the entity recognises revenue when those future goods or services are transferred or when the option expires." (IFRS 15.B40) ([IFRS Foundation — TRG paper, IFRS 15.B40 material right (606-10-55-42)](https://www.ifrs.org/content/dam/ifrs/meetings/2014/october/trg-rev/rev-rec/ap6-customer-options.pdf)).

A retail loyalty program that awards points redeemable for future goods is the canonical material-right case: a portion of the transaction price is allocated to the points (the option) on a relative-stand-alone-selling-price basis (adjusted for the likelihood of redemption) and deferred until the points are redeemed or expire (IFRS 15.B39–B43) ([IFRS Community — Customer Loyalty Programmes (IFRS 15)](https://ifrscommunity.com/knowledge-base/customer-loyalty-programmes/)).

**Worked examples IE249–IE252.** The IFRS 15 illustrative examples set (Example 52, customer loyalty programme) demonstrate the allocation of transaction price to award credits based on relative stand-alone selling price and expected redemption ([IFRS Foundation — IFRS 15 illustrative examples (loyalty)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ifrs15-ie.html)).

**Replaces legacy IFRIC 13.** The IFRS 15 material-right model **superseded IFRIC 13 *Customer Loyalty Programmes*** (withdrawn on IFRS 15's effective date of 1 January 2018); IFRIC 13's "fair value of award credits" approach no longer applies ([IFRS Foundation — IFRS 15 standard page (supersedes IFRIC 13)](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/)).

**U.S. GAAP divergence.** Converged — ASC 606-10-55-42 mirrors IFRS 15.B40 (see RTL-K-B) ([IFRS Foundation — TRG paper aligning 606-10-55-42 / B40](https://www.ifrs.org/content/dam/ifrs/meetings/2014/october/trg-rev/rev-rec/ap6-customer-options.pdf)).

---

## III.4 Returns — IFRS 15.B20–B27

**The standard — right of return.** IFRS 15.B21 requires that, for a transfer of products with a right of return, the entity recognise **revenue only for the amount of consideration to which it expects to be entitled** (i.e., not for products expected to be returned), a **refund liability**, and an **asset for its right to recover products** ([IFRS Foundation — IFRS 15.B20–B21 (2021 PDF)](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ifrs-15-revenue-from-contracts-with-customers.pdf)). The refund liability is measured at the consideration the entity does not expect to be entitled to and updated at each reporting date (IFRS 15.B23–B24). The return asset must be **presented separately from inventory** and from the refund liability (on a gross basis), and is updated for changes in expected returns ([EY — *Applying IFRS 15 Revenue from Contracts with Customers*, refund liability and separately-presented return asset](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-gl/technical/ifrs-technical-resources/documents/ey-how-ifrs-15-revenue-from-contracts-with-customers.pdf)).

**Asset for the right to recover (IFRS 15.B25).** IFRS 15.B25 provides verbatim:

> "An asset recognised for an entity's right to recover products from a customer on settling a refund liability shall **initially be measured by reference to the former carrying amount of the product (for example, inventory) less any expected costs to recover those products** (including potential decreases in the value to the entity of returned products)." (IFRS 15.B25) ([IFRS Foundation — IFRS 15.B25; via Ciferi glossary citing B25](https://ciferi.com/glossary/right-of-return); [IFRS Foundation — IASB/FASB staff paper on right of return asset (former carrying amount)](https://www.ifrs.org/content/dam/ifrs/meetings/2009/december/joint-iasb-fasb/rr-1209b03bobs.pdf)).

The refund liability and the return asset are presented **separately** (gross), not netted (IFRS 15.B21, B25). IFRS 15.B26 limits the return guidance in B20–B27 to **transfers of products**; exchanges of a product for another of the same type/quality/price (e.g., a colour swap) and returns of defective items for functioning ones (warranty) are scoped out (IFRS 15.B26–B27) ([IFRS Foundation — IFRS 15.B26–B27 (warranty / exchange carve-out)](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ifrs-15-revenue-from-contracts-with-customers.pdf)).

**U.S. GAAP divergence.** Converged with ASC 606-10-55-22 through 55-29 — same refund-liability / return-asset structure (see RTL-K-B for the ASC 606 returns-reserve mechanics) ([Journal Entries Hub — ASC 606-10-55-22 / IFRS 15 B20-B27 returns (cross-reference)](https://www.journalentrieshub.com/entries/fmcg-returns-reserve-right-of-return)).

---

## III.5 Consignment — IFRS 15.B77–B78

**The standard.** IFRS 15.B77 provides verbatim:

> "When an entity delivers a product to another party (such as a dealer or a distributor) for sale to end customers, the entity shall **evaluate whether that other party has obtained control of the product at that point in time**. A product that has been delivered to another party may be held in a **consignment arrangement** if that other party has not obtained control of the product. Accordingly, an entity **shall not recognise revenue upon delivery of the product** to another party if the delivered product is held on consignment." (IFRS 15.B77) ([PwC — *IFRS 15 solutions for the retail and consumer industry*, quoting IFRS 15.B77 verbatim](https://www.pwc.at/de/newsletter/ifrs/in-brief-in-depth/2018/ifrs15_solutions_for_the_retail_consumer_industry.pdf)).

**Indicators (IFRS 15.B78).** Indicators that an arrangement is a consignment include: **(a)** the product is controlled by the entity until a specified event occurs (e.g., sale to a customer) or until a specified period expires; **(b)** the entity is able to **require the return** of the product or transfer it to a third party (such as another dealer); and **(c)** the dealer does **not** have an unconditional obligation to pay for the product (although it might be required to pay a deposit) (IFRS 15.B78) ([IFRS Community — IFRS 15.B78 consignment indicators](https://ifrscommunity.com/knowledge-base/ifrs-15-performance-obligations-and-timing-of-revenue-recognition/); [Ciferi — IFRS 15.B77–B78 consignment indicators](https://ciferi.com/glossary/consignment-arrangement)). Consignment is common in retail concession / vendor-owned-inventory arrangements (e.g., shop-in-shop, magazine and apparel concessions).

**U.S. GAAP divergence.** Converged with ASC 606-10-55-79 through 55-80 (see RTL-K-B).

---

## III.6 Principal vs Agent — IFRS 15.B34–B38

**The standard — control-based assessment.** IFRS 15.B35 establishes that an entity is a **principal** if it **controls the specified good or service before that good or service is transferred to the customer**; it is an **agent** if its performance obligation is to **arrange** for another party to provide the goods or services (in which case it recognises revenue net, as a fee or commission) ([IFRS Foundation — IFRS 15.B34–B35 (2021 PDF)](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ifrs-15-revenue-from-contracts-with-customers.pdf); [IFRS Foundation — PIR staff paper, IFRS 15.B37 control indicators](https://www.ifrs.org/content/dam/ifrs/meetings/2024/february/iasb/ap6b-ifrs-15-pir-principal-vs-agent-considerations.pdf)). For retailers, the principal/agent assessment most often turns on **third-party / marketplace and concession sales**, where careful evaluation of gross-versus-net presentation is required ([EY — *Technical Line: How the revenue standard affects retail and consumer products entities*, gross vs net for third-party sales](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-us/technical/accountinglink/documents/ey-tl03068-171us-04-23-2024.pdf)).

**Three-factor (control) indicators — IFRS 15.B37.** To help assess whether it controls the specified good or service before transfer, IFRS 15.B37 provides a **non-exhaustive list of indicators** verbatim:

> "(a) the entity is **primarily responsible for fulfilling** the promise to provide the specified good or service; (b) the entity has **inventory risk** before the specified good or service has been transferred to a customer or after transfer of control to the customer ...; and/or (c) the entity has **discretion in establishing the price** for the specified good or service." (IFRS 15.B37) ([IFRS Foundation — PIR staff paper quoting IFRS 15.B37 indicators](https://www.ifrs.org/content/dam/ifrs/meetings/2024/february/iasb/ap6b-ifrs-15-pir-principal-vs-agent-considerations.pdf)).

The assessment is **one step**, not two — control is the determinative principle, and the B37 indicators support (but do not replace) the control conclusion ([Deloitte iasplus — Principal vs Agent, control then IFRS 15.B37 indicators](https://www.iasplus.com/en/meeting-notes/ifrs-ic/2021/november/ifrs-15)). This is the core test for retail marketplaces, drop-ship, and concession sales.

**Worked examples IE231–IE239.** The IFRS 15 illustrative examples (Examples 45–48A, principal vs agent) work through reseller, intermediary, and arranging-for-services fact patterns ([IFRS Foundation — IFRS 15 illustrative examples (principal vs agent)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ifrs15-ie.html)).

**U.S. GAAP divergence.** Converged with ASC 606-10-55-36 through 55-40 — same control test and indicators (see RTL-K-B) ([IFRS Foundation — IFRS 15.B37 / ASC 606 control indicators alignment](https://www.ifrs.org/content/dam/ifrs/meetings/2024/february/iasb/ap6b-ifrs-15-pir-principal-vs-agent-considerations.pdf)).

---

## III.7 U.S. GAAP Divergence Summary — IFRS 15

| Retail surface | IFRS 15 | ASC 606 | Status |
|---|---|---|---|
| Gift cards / breakage | B44–B47 (no specific breakage model; US GAAP models acceptable) | 606-10-55-46..55-49 (more prescriptive) | **Materially convergent**; US GAAP more prescriptive on breakage paragraph |
| Loyalty / material right | B39–B43 (supersedes IFRIC 13) | 606-10-55-41..55-45 | Converged |
| Returns | B20–B27 (refund liability + return asset) | 606-10-55-22..55-29 | Converged |
| Consignment | B77–B78 | 606-10-55-79..55-80 | Converged |
| Principal vs agent | B34–B38 (control + 3 indicators) | 606-10-55-36..55-40 | Converged |
| Collectibility threshold | "probable" = more likely than not | "probable" = likely to occur (higher) | Minor divergence |

Sources: ([PwC — IFRS 15 retailers](https://www.pwc.com/m1/en/services/cmaas/documents/ifrs15/ifrs-15-retailers.pdf)); ([IFRS Foundation — IFRS 15 standard page](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/)); ([RevenueHub — ASC 606 vs IFRS 15 (cross-reference, never sole citation)](https://www.revenuehub.org/article/asc-606-ifrs-15)). See `Retail_ASC606_Sources.md` (RTL-K-B) for the ASC 606 mechanics of each surface.

---

# PART IV — IFRS 16 LEASES (RETAIL TENANT IMPACT)

Leases are the single most consequential IFRS difference for a retailer, because retail is a **lease-intensive** business model: stores, malls, warehouses, and distribution centres are predominantly leased. IFRS 16 brings essentially all of them on balance sheet.

---

## IV.1 Single Lessee Model — IFRS 16.22–IFRS 16.60

**The standard.** IFRS 16 **eliminates the operating/finance lease classification for lessees**. At the commencement date a lessee recognises a **right-of-use (ROU) asset** and a **lease liability** for all leases except those to which the recognition exemptions apply (IFRS 16.22) ([IFRS Foundation — IFRS 16 (2025 issued HTML), recognition](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ifrs16.html); [IFRS Foundation — IFRS 16 *Effects Analysis*, single lessee model](https://www.ifrs.org/content/dam/ifrs/project/leases/ifrs/published-documents/ifrs16-effects-analysis.pdf)).

**Measurement.** The **lease liability** is measured at the present value of the lease payments not yet paid, discounted at the rate implicit in the lease (or, if not readily determinable, the lessee's **incremental borrowing rate**) (IFRS 16.26). The **ROU asset** comprises the initial lease liability, lease payments at or before commencement (less incentives received), initial direct costs, and estimated restoration/dismantling costs (IFRS 16.23–24) ([Deloitte iasplus — IFRS 16 ROU asset and lease liability measurement](https://iasplus.com/content/38c4d68d-3374-4c2b-a4d2-a2641f1bd5ae)).

**P&L pattern (IFRS 16.31–38).** The ROU asset is depreciated (applying IAS 16) and the lease liability accretes interest. The single straight-line operating-lease expense of IAS 17 is replaced by a **depreciation charge** (in operating costs) plus an **interest expense** (in finance costs) — a **front-loaded total expense** profile ([IFRS Foundation — IFRS 16 Effects Analysis, depreciation + interest replaces single expense](https://www.ifrs.org/content/dam/ifrs/project/leases/ifrs/published-documents/ifrs16-effects-analysis.pdf); [HLB — IFRS 16, depreciation + interest replace operating-lease expense](https://www.hlb.global/wp-content/uploads/2022/08/HLB_IFRS16_leases_a_guide.pdf)).

**Departure from U.S. GAAP ASC 842.** ASC 842 retains a **dual** lessee model: **operating leases** keep a single straight-line lease expense (with an ROU asset and liability still on balance sheet), while **finance leases** produce front-loaded depreciation-plus-interest. IFRS 16 has **no operating-lease category for lessees** — every capitalised lease is accounted for finance-style ([KPMG — *Lease accounting: IFRS vs US GAAP*, single vs dual model](https://kpmg.com/us/en/articles/2025/lease-accounting-ifrs-standards-us-gaap.html); [Deloitte DART — IFRS/US GAAP comparison: leases](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-5-broad-transactions/5-7-leases)).

---

## IV.2 Short-Term and Low-Value Exemptions — IFRS 16.5–IFRS 16.8

**The standard.** IFRS 16.5 permits a lessee to elect **not** to apply the ROU/lease-liability model to **(a) short-term leases** and **(b) leases for which the underlying asset is of low value** (IFRS 16.5) ([IFRS Foundation — IFRS 16.5–8 (2025 issued HTML)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ifrs16.html)). For those leases, payments are recognised as an expense on a straight-line basis (or another systematic basis) over the lease term (IFRS 16.6).

- **Short-term threshold (12 months).** A short-term lease is a lease that, at commencement, has a **lease term of 12 months or less** and does **not** contain a purchase option (IFRS 16.5(a); Appendix A definition). The election is made by **class of underlying asset** ([KPMG — *IFRS 16 overview*, short-term ≤ 12 months](https://assets.kpmg.com/content/dam/kpmgsites/xx/pdf/ifrg/2024/leases-overview.pdf.coredownload.inline.pdf)).
- **Low-value (~USD 5,000 guideline — IFRS 16.BC100).** The threshold is not in the standard text but in the Basis for Conclusions: IFRS 16.BC100 indicates the Board had in mind underlying assets with a value, **when new**, of approximately **USD 5,000 or less** (assessed on an absolute basis, on the asset's value when new, regardless of the lessee's size or the asset's age) ([IFRS Foundation — *Leases of small assets* staff paper, value-when-new basis](https://www.ifrs.org/content/dam/ifrs/meetings/2015/february/iasb/leases/ap3e-leases-small-assets.pdf); [Ciferi — IFRS 16.BC100 ~USD 5,000 low-value threshold](https://ciferi.com/glossary/low-value-asset-exemption)). The low-value exemption is applied on a **lease-by-lease** basis (unlike the short-term election) ([KPMG — IFRS 16 overview, low-value lease-by-lease, even if material in aggregate](https://assets.kpmg.com/content/dam/kpmgsites/xx/pdf/ifrg/2024/leases-overview.pdf.coredownload.inline.pdf)). For retail, this captures items such as small IT peripherals, handheld scanners, and small back-office equipment — but **not** store premises, fixtures, or vehicles.

**U.S. GAAP divergence.** ASC 842 provides a **short-term lease** exemption but has **no low-value-asset exemption** equivalent to IFRS 16 ([KPMG — IFRS vs US GAAP leases, low-value exemption has no Topic 842 equivalent](https://kpmg.com/us/en/articles/2025/lease-accounting-ifrs-standards-us-gaap.html)).

---

## IV.3 Variable Lease Payments — IFRS 16.27

**The standard.** The lease liability includes variable lease payments that depend on an index or a rate, and amounts that are **in-substance fixed payments** (IFRS 16.27(a)–(b)). **Truly variable payments** that depend on sales or usage of the underlying asset are **excluded** from the lease liability and recognised in profit or loss in the period in which the triggering event occurs ([IFRS Foundation — IFRS 16.27 (2025 issued HTML)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ifrs16.html); [HLB — IFRS 16, sales/usage-based variable payments excluded from liability](https://www.hlb.global/wp-content/uploads/2022/08/HLB_IFRS16_leases_a_guide.pdf)).

**Retail percentage rent.** This is acutely retail-relevant: a mall lease with **percentage rent** (e.g., a base rent plus X% of sales over a breakpoint) splits into (i) the **base / in-substance-fixed** component, capitalised in the lease liability, and (ii) the **sales-based percentage-rent** component, expensed as incurred. Only the in-substance-fixed portion grosses up the balance sheet ([RSM — IFRS 16, variable payments depending on sales excluded from liability](https://www.rsm.global/kuwait/sites/default/files/media/publications/IFRS%20Updates/financial_reporting_guide_to_ifrs_16_leases.pdf)).

**U.S. GAAP divergence.** **Same treatment as ASC 842** — sales-based / usage-based variable lease payments are excluded from the lease liability and expensed as incurred under both standards (see RTL-K-B / ASC 842 sibling).

---

## IV.4 Lease Modifications — IFRS 16.44–IFRS 16.46

**The standard.** A lease modification is a change in the scope of, or consideration for, a lease that was not part of the original terms and conditions (IFRS 16 Appendix A). IFRS 16.44 provides verbatim:

> "A lessee shall account for a lease modification as a **separate lease** if both: (a) the modification **increases the scope** of the lease by adding the right to use **one or more underlying assets**; and (b) the consideration for the lease **increases by an amount commensurate with the stand-alone price** for the increase in scope and any appropriate adjustments to that stand-alone price ...." (IFRS 16.44) ([IFRS Foundation / NZ IFRS 16.44–46 verbatim](https://www.xrb.govt.nz/dmsdocument/3838/); [KPMG — *Lease modifications*, IFRS 16.44–46 separate-lease vs remeasure](https://assets.kpmg.com/content/dam/kpmgsites/xx/pdf/ifrg/2024/lease-modifications-2018.pdf)).

For a modification **not** accounted for as a separate lease, the lessee at the effective date **remeasures the lease liability** by discounting the revised payments at a **revised discount rate** (IFRS 16.45(c)), and: **(a)** for modifications that **decrease scope**, decreases the ROU asset to reflect the partial/full termination and recognises any gain or loss in profit or loss; **(b)** for **all other** modifications, makes a corresponding adjustment to the ROU asset (IFRS 16.46) ([IFRS Foundation / NZ IFRS 16.45–46 verbatim](https://www.xrb.govt.nz/dmsdocument/3838/); [Ciferi — IFRS 16.44–46 modification two-condition test and remeasurement](https://ciferi.com/blog/ifrs-16-lease-modifications-guide)).

**Retail-specific modification triggers.** Retail leases are unusually modification-prone: **mall co-tenancy clauses** (rent abatement if anchor tenants leave), **kick-out / break clauses** (the right to exit if a sales threshold is not met), **percentage-rent breakpoint** renegotiations, and **COVID-style rent concessions**. Each is screened under the IFRS 16.44 two-condition test — a term extension or rent change generally **fails** condition (a) (it adds no new underlying asset) and therefore flows through the **remeasurement** route, not separate-lease treatment ([Ciferi — IFRS 16.44 term-extension/rent-change fail condition (a)](https://ciferi.com/blog/ifrs-16-lease-modifications-guide)). **[JUDGMENT AREA.]**

**U.S. GAAP divergence.** ASC 842 has analogous modification mechanics but operates within its dual-model framework (a modified operating lease can remain operating); the IFRS single model means every remeasured lease stays finance-style (see RTL-K-B / ASC 842 sibling) ([KPMG — IFRS vs US GAAP leases](https://kpmg.com/us/en/articles/2025/lease-accounting-ifrs-standards-us-gaap.html)).

---

## IV.5 Disclosure Requirements — IFRS 16.51–IFRS 16.60

**The standard.** IFRS 16.51 sets the objective: disclose information that enables users to assess the effect of leases on financial position, financial performance, and cash flows ([IFRS Foundation — IFRS 16.51 disclosure objective](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ifrs16.html)). The **quantitative tabular** lessee disclosures (IFRS 16.53) include, by class of underlying asset where relevant ([KPMG — IFRS 16 overview, required quantitative lessee disclosures](https://assets.kpmg.com/content/dam/kpmgsites/xx/pdf/ifrg/2024/leases-overview.pdf.coredownload.inline.pdf); [Deloitte iasplus — IFRS 16 quantitative lessee disclosures](https://iasplus.com/content/38c4d68d-3374-4c2b-a4d2-a2641f1bd5ae)):

- depreciation charge for ROU assets by class;
- interest expense on lease liabilities;
- expense relating to **short-term leases** and to **leases of low-value assets**;
- expense relating to **variable lease payments** not in the liability (e.g., percentage rent);
- income from subleasing ROU assets;
- **total cash outflow** for leases;
- additions to ROU assets; and
- carrying amount of ROU assets at period-end by class.

**Maturity analysis (IFRS 16.58).** A lessee discloses a **maturity analysis of lease liabilities** applying IFRS 7.39 and B11 (separately from other financial liabilities) ([Deloitte iasplus — IFRS 16 maturity analysis of lease liabilities under IFRS 7](https://iasplus.com/content/38c4d68d-3374-4c2b-a4d2-a2641f1bd5ae)). For a multi-store retailer with a long-dated lease portfolio, this maturity profile is a headline disclosure.

---

## IV.6 U.S. GAAP Divergence Summary — IFRS 16

| Topic | U.S. GAAP (ASC 842) | IFRS (IFRS 16) |
|---|---|---|
| Lessee model | **Dual** (operating + finance) | **Single** — all leases finance-style (IFRS 16.22) |
| Operating-lease P&L | Single straight-line expense | Depreciation + interest (front-loaded) |
| Low-value exemption | **None** | ~USD 5,000 when new (IFRS 16.BC100) |
| Short-term exemption | Yes (≤ 12 months) | Yes (≤ 12 months, IFRS 16.5(a)) |
| Sales-based variable payments | Excluded from liability; expensed | Excluded from liability; expensed (IFRS 16.27) — **same** |
| EBITDA / balance-sheet gross-up | Operating leases inflate operating expense, not D&A/interest | **Every** retail operating lease on balance sheet; rent reclassified to D&A + interest, **boosting EBITDA** |

**Gross-up impact for retail tenants.** Because retailers lease most of their store estate, IFRS 16 grosses up **both sides of the balance sheet** far more than for capital-intensive owner-operators: a large multi-store chain recognises ROU assets and lease liabilities running to a substantial share of total assets. Rent that was a single operating expense becomes depreciation plus interest, **lifting EBITDA and operating profit** while raising reported leverage ([IFRS Foundation — IFRS 16 Effects Analysis, balance-sheet and EBITDA effect](https://www.ifrs.org/content/dam/ifrs/project/leases/ifrs/published-documents/ifrs16-effects-analysis.pdf)).

**Comparability challenge with U.S. peers.** An IFRS retailer's EBITDA, operating profit, leverage, and lease-expense geography are **not directly comparable** to a U.S. GAAP peer whose operating-lease store rent remains a single above-the-line expense — a key analyst-adjustment caveat for cross-border retail benchmarking ([KPMG — IFRS vs US GAAP leases, comparability](https://kpmg.com/us/en/articles/2025/lease-accounting-ifrs-standards-us-gaap.html); [Deloitte DART — IFRS/US GAAP leases, front-loaded vs straight-line](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-5-broad-transactions/5-7-leases)).

---

# PART V — IAS 36 IMPAIRMENT (STORE-LEVEL CGU)

Impairment is where IFRS asks a retailer a distinctly retail question: **at what level do you test?** IAS 36's cash-generating-unit (CGU) machinery typically lands impairment testing at the individual store.

---

## V.1 Cash-Generating Unit Definition — IAS 36.6

**The standard.** IAS 36.6 (definitions) provides verbatim:

> "A **cash-generating unit** is the **smallest identifiable group of assets that generates cash inflows that are largely independent of the cash inflows from other assets or groups of assets**." (IAS 36.6) ([IFRS Foundation — IAS 36 standard page (CGU definition)](https://www.ifrs.org/issued-standards/list-of-standards/ias-36-impairment-of-assets/); [BDO — IAS 36 CGU definition (smallest identifiable group)](https://www.bdo.global/getmedia/fd3078e0-d4a0-4ddf-be7c-9143adc0401b/IAS-36-AAG.pdf.aspx)).

Where the **recoverable amount of an individual asset cannot be determined** (because the asset does not generate cash inflows largely independent of those from other assets), the entity determines the recoverable amount of the **CGU to which the asset belongs** (IAS 36.66) ([IFRS Foundation — IAS 36 standard page, recoverable amount at CGU level](https://www.ifrs.org/issued-standards/list-of-standards/ias-36-impairment-of-assets/)).

**Retail application: typically store-level.** For most retail chains, the individual **store** is the natural CGU because each store generates largely independent footfall-driven cash inflows. The retail magazine-title example in the IAS 36 illustrative examples illustrates the "largely independent cash inflows" test (each title a separate CGU) ([IFRS Foundation — IAS 36 illustrative examples (independent cash inflows)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias36-ie.html); [Grant Thornton — *Insights into IAS 36: identifying CGUs*, lowest-level test](https://www.grantthorntonni.com/globalassets/1.-member-firms/ireland/insights/publications/grant-thornton---insights-into-ias-36---identifying-cash-generating-units.pdf)).

---

## V.2 CGU Identification for Retail Chains — IAS 36.68–IAS 36.69

**The standard.** IAS 36.68–69 require CGUs to be identified **consistently from period to period** and at the **lowest level** at which cash inflows are largely independent. Even if part or all of the output of an asset (or group) is used internally, it forms a separate CGU **if the entity could sell the output on an active market** (IAS 36.70) ([Grant Thornton — IAS 36 CGUs identified at lowest level; active-market output test](https://www.grantthorntonni.com/globalassets/1.-member-firms/ireland/insights/publications/grant-thornton---insights-into-ias-36---identifying-cash-generating-units.pdf)).

**Store-level vs district-level vs format-level — the retail judgement.** The hard question is whether an individual store is sufficiently **independent**:

- **Store-level CGU (the default).** Where each store has its own discrete customer catchment and its closure would not materially alter other stores' cash flows, the store is the CGU.
- **District / region-level CGU.** Where stores in a city share **inter-store dependencies** — common delivery, shared regional fulfilment, "buy-online-pick-up-in-store" routing, cannibalising catchments, or shared inventory pools — the smallest independent group may be a cluster of stores.
- **Format / banner-level.** Rare; only where individual stores cannot generate largely independent inflows (e.g., a network where customers freely substitute between adjacent branches).

This identification is **judgmental and fact-specific**, and the analysis must consider how management monitors operations and makes continue/close decisions (IAS 36.69) ([Grant Thornton — IAS 36, judgement in identifying retail-style CGUs](https://www.grantthorntonni.com/globalassets/1.-member-firms/ireland/insights/publications/grant-thornton---insights-into-ias-36---identifying-cash-generating-units.pdf)). **[JUDGMENT AREA.]** **Goodwill** is allocated to CGUs (or groups of CGUs) at the **lowest level monitored internally**, not larger than an operating segment (IAS 36.80) ([Deloitte DART — IAS 36.80 goodwill CGU allocation, lowest monitored level / not larger than operating segment](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-1-assets/1-7-impairment-nonfinancial-assets)).

---

## V.3 Annual Impairment Test Triggers — IAS 36.10, IAS 36.12

**The standard.** IAS 36.10 requires an **annual** impairment test (irrespective of any indicator) for: **(a)** intangible assets with an **indefinite useful life** or not yet available for use; and **(b)** **goodwill** acquired in a business combination ([IFRS Foundation — IAS 36 standard page, annual goodwill/indefinite-life test](https://www.ifrs.org/issued-standards/list-of-standards/ias-36-impairment-of-assets/)). For **all other assets** (including store PP&E and finite-life intangibles), the entity assesses at each reporting date whether there is any **indicator of impairment** (IAS 36.9, 12); only if an indicator exists is the recoverable amount estimated. IAS 36.12 lists external indicators (decline in market value, adverse market/economic/legal/technological changes, increased interest rates, net-asset carrying amount exceeding market capitalisation) and internal indicators (obsolescence/physical damage, idle/restructuring/disposal plans, worse-than-expected economic performance) ([IFRS Foundation — IAS 36 standard page, indicators of impairment](https://www.ifrs.org/issued-standards/list-of-standards/ias-36-impairment-of-assets/)). For retail, **declining store sales, a decision to close, and lease-exit plans** are classic IAS 36.12 internal triggers.

**U.S. GAAP comparison.** Under **ASC 350** (goodwill / indefinite-life intangibles) testing is **annual** (with an optional qualitative screen) — broadly aligned with IAS 36.10. Under **ASC 360** (long-lived assets, including store PP&E) testing is **trigger-based** and uses a **recoverability test** (undiscounted cash flows) before any fair-value measurement — structurally different from IAS 36's single recoverable-amount step ([Deloitte DART — IFRS/US GAAP impairment, ASC 350 vs ASC 360 vs IAS 36](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-1-assets/1-7-impairment-nonfinancial-assets)).

---

## V.4 Recoverable Amount — IAS 36.18–IAS 36.57

**The standard.** "Recoverable amount" is the **higher of an asset's (or CGU's) fair value less costs of disposal (FVLCD) and its value in use (VIU)** (IAS 36.18) ([IFRS Foundation — IAS 36 standard page, recoverable amount = higher of FVLCD and VIU](https://www.ifrs.org/issued-standards/list-of-standards/ias-36-impairment-of-assets/)). An impairment loss is recognised when carrying amount exceeds recoverable amount (IAS 36.59).

**Value in use (IAS 36.30–57).** VIU is the present value of the future cash flows expected from the asset/CGU. The cash-flow projections (IAS 36.33) are based on reasonable and supportable assumptions, most recent budgets/forecasts (generally ≤ 5 years), and a steady or declining growth-rate extrapolation thereafter (IAS 36.35–36) ([IFRS Foundation — IAS 36 standard page, VIU cash-flow projection basis](https://www.ifrs.org/issued-standards/list-of-standards/ias-36-impairment-of-assets/)).

**Discount rate (IAS 36.55–57).** The discount rate is a **pre-tax rate** reflecting current market assessments of the time value of money and the risks specific to the asset/CGU for which the future-cash-flow estimates have not been adjusted (IAS 36.55). When an asset-specific rate is not directly available, the entity uses surrogates such as its **weighted average cost of capital**, its incremental borrowing rate, and other market borrowing rates (IAS 36.56–57) ([IFRS Foundation — IAS 36 standard page, pre-tax discount-rate selection](https://www.ifrs.org/issued-standards/list-of-standards/ias-36-impairment-of-assets/)). **[JUDGMENT AREA.]** A CGU's carrying amount must be determined on a basis consistent with the recoverable amount (e.g., including allocated corporate assets and the lease liability/ROU asset where appropriate).

---

## V.5 Reversal of Impairment — IAS 36.114–IAS 36.124

**The standard (non-goodwill reversal — IAS 36.114–117).** An entity assesses at each reporting date whether there is any indication that a previously recognised impairment loss (other than for goodwill) **may no longer exist or may have decreased**; if so, it estimates the recoverable amount and **reverses** the loss (IAS 36.110, 114). The reversal is **capped** so the increased carrying amount does **not exceed the carrying amount that would have been determined (net of depreciation/amortisation) had no impairment loss been recognised** (IAS 36.117) ([Grant Thornton — *IAS 36: Reversing impairment losses*, reversal ceiling](https://www.grantthornton.global/en/insights/articles/IFRS-ias-36/ifrs-Reversing-impairment-losses/)).

For a **CGU**, the reversal is allocated **pro rata to the carrying amounts of the assets of the unit, except goodwill** (IAS 36.122), subject to each asset's ceiling (its recoverable amount, if determinable, and the no-prior-impairment carrying amount) (IAS 36.123) ([Grant Thornton — IAS 36 reversal allocated pro rata to CGU assets except goodwill, subject to ceiling](https://www.grantthornton.global/en/insights/articles/IFRS-ias-36/ifrs-Reversing-impairment-losses/)).

**Goodwill impairment NEVER reversed (IAS 36.124).** IAS 36.124 provides verbatim:

> "**An impairment loss recognised for goodwill shall not be reversed in a subsequent period.**" (IAS 36.124) ([Hayot Expertise — IAS 36.124, goodwill impairment can never be reversed](https://hayot-expertise.fr/en/blog/impairment-test-under-ias-36-in-2026-methodology-and-best-practices); [IFRS Foundation — IFRIC staff paper, IAS 36 goodwill impairments not reversed](https://www.ifrs.org/content/dam/ifrs/meetings/2010/march/ifric/1003ap6bobsifricreversalofimpairmentlossesrelatingtogoodwill.pdf)).

The retail effect: a store written down when sales slumped, that subsequently recovers, **must be written back up** (capped at the depreciated-cost ceiling) under IFRS — but any goodwill impaired in that store's CGU is gone for good.

---

## V.6 U.S. GAAP Divergence Summary — IAS 36

| Topic | U.S. GAAP (ASC 360 / ASC 350) | IFRS (IAS 36) |
|---|---|---|
| Long-lived-asset test | **Trigger-based**; two-step (undiscounted CF recoverability → FV) | Indicator-based; single recoverable-amount step (IAS 36.9, 12) |
| Goodwill / indefinite-life test | **Annual** (ASC 350) | **Annual** (IAS 36.10) — aligned |
| Recoverable measure | Fair value (after failing undiscounted-CF test) | **Higher of FVLCD and VIU** (IAS 36.18) |
| Discounting in test | Undiscounted CF in step 1 (ASC 360) | **Discounted** (VIU, pre-tax rate, IAS 36.55) |
| Unit of account | Asset group (ASC 360); reporting unit (ASC 350) | **CGU** (IAS 36.6) — typically store-level for retail |
| Reversal (non-goodwill) | **Prohibited** | **Required** when indicators reverse; capped at depreciated-cost ceiling (IAS 36.117) |
| Reversal (goodwill) | **Prohibited** | **Prohibited** (IAS 36.124) — aligned |

Sources: ([IFRS Foundation — IAS 36 standard page](https://www.ifrs.org/issued-standards/list-of-standards/ias-36-impairment-of-assets/)); ([Deloitte DART — IFRS/US GAAP nonfinancial-asset impairment](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-1-assets/1-7-impairment-nonfinancial-assets)); ([Grant Thornton — IAS 36 reversal](https://www.grantthornton.global/en/insights/articles/IFRS-ias-36/ifrs-Reversing-impairment-losses/)).

---

# PART VI — IAS 1 / IAS 7 (PRESENTATION)

---

## VI.1 IAS 1 Statement of Financial Position

**The standard.** IAS 1 requires an entity to present **current and non-current assets, and current and non-current liabilities, as separate classifications** on the face of the statement of financial position, **except** when a **presentation based on liquidity** provides reliable and more relevant information (IAS 1.60) ([IFRS Foundation — IAS 1 standard page (current/non-current vs liquidity)](https://www.ifrs.org/issued-standards/list-of-standards/ias-1-presentation-of-financial-statements/)). IAS 1.54 sets the minimum line items, including inventories, trade and other receivables, and trade and other payables ([IFRS Foundation — IAS 1 standard page, minimum line items](https://www.ifrs.org/issued-standards/list-of-standards/ias-1-presentation-of-financial-statements/)).

> **Note — IFRS 18 transition.** IAS 1 is being **replaced by IFRS 18 *Presentation and Disclosure in Financial Statements***, effective for annual periods beginning on or after **1 January 2027** (early application permitted). For periods up to that date IAS 1 governs; an IFRS retail tenant should confirm the applicable standard at its reporting date ([IFRS Foundation — IAS 1 standard page (replaced by IFRS 18 from 2027)](https://www.ifrs.org/issued-standards/list-of-standards/ias-1-presentation-of-financial-statements/)). **[VERIFY AT REPORTING DATE.]**

**Retail-specific line items.** A retailer's statement of financial position prominently features **inventories (merchandise)**, **trade receivables** (limited for cash-and-carry retail, larger for credit/wholesale), **right-of-use assets** and **lease liabilities** (IFRS 16, presented separately or disclosed — see Part IV), and a **gift card / contract liability** (IFRS 15.105–106, deferred revenue for unredeemed cards). The gift-card balance is a **contract liability**, distinct from a refund liability (returns) and from trade payables ([IFRS Foundation — IFRS 15.105–106 contract liability presentation](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ifrs-15-revenue-from-contracts-with-customers.pdf)).

---

## VI.2 IAS 1 Statement of Profit or Loss

**The standard.** IAS 1.99 requires an entity to present an analysis of expenses recognised in profit or loss using a classification based **either on their nature or on their function** within the entity, whichever provides reliable and more relevant information (IAS 1.99–105) ([IFRS Foundation — IAS 1 standard page, nature vs function of expense](https://www.ifrs.org/issued-standards/list-of-standards/ias-1-presentation-of-financial-statements/)):

- **Function-of-expense ("cost of sales") method.** Expenses are classified by function — e.g., **cost of sales**, distribution costs, administrative expenses. An entity using this method must disclose **additional information on the nature of expenses**, including depreciation, amortisation, and employee-benefits expense (IAS 1.104).
- **Nature-of-expense method.** Expenses are aggregated by nature (changes in inventories, purchases of merchandise, employee benefits, depreciation) and not reallocated to functions.

**Retail typically function-of-expense.** Retailers almost universally present a **cost of sales** line (and hence a **gross margin**) — the function-of-expense method — because gross margin is the headline retail metric ([IFRS Foundation — IAS 1 standard page, function-of-expense (cost of sales)](https://www.ifrs.org/issued-standards/list-of-standards/ias-1-presentation-of-financial-statements/)). Under IFRS 16, the IAS 17 single rent expense is split: **depreciation of ROU store assets** (typically within cost of sales / distribution) and **interest on lease liabilities** within **finance costs** (IAS 1 requires finance costs to be presented separately) ([EY — IFRS 16 presentation: interest within finance costs, depreciation in P&L](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-gl/technical/ifrs-technical-resources/documents/ey-apply-leases-pd-december-2019.pdf)).

---

## VI.3 IAS 7 Cash Flow Statement

**The standard.** IAS 7 classifies cash flows into **operating, investing, and financing** activities (IAS 7.10). Operating activities are the principal revenue-producing activities (IAS 7.14) ([IFRS Foundation — IAS 7 standard page (operating/investing/financing)](https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows/)).

**Lease payment classification under IFRS 16 — the retail-material rule.** Under IFRS 16, a lessee splits lease cash outflows: the **principal portion of the lease liability is classified within financing activities**, while the **interest portion** is classified applying the IAS 7 policy for interest paid (within operating **or** financing). Payments for **short-term leases, leases of low-value assets, and variable lease payments not in the liability** (e.g., percentage rent) are classified within **operating activities** ([EY — IFRS 16: principal in financing, interest per IAS 7, variable/short-term/low-value in operating](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-gl/technical/ifrs-technical-resources/documents/ey-apply-leases-pd-december-2019.pdf); [IFRS Foundation — IFRS 16 Effects Analysis, cash-flow split principal/interest](https://www.ifrs.org/content/dam/ifrs/project/leases/ifrs/published-documents/ifrs16-effects-analysis.pdf)). For a lease-intensive retailer, this **reclassifies a large slice of former operating cash outflow into financing**, materially improving reported operating cash flow versus the pre-IFRS-16 (IAS 17) presentation.

**U.S. GAAP (ASC 230) divergence.** Under **ASC 842 / ASC 230**, **operating-lease** payments remain within **operating** activities in their entirety, and only **finance-lease** payments are split (principal in financing, interest in operating). Because IFRS 16 has no operating-lease lessee category, **all** capitalised-lease principal moves to financing under IFRS — a structural cash-flow geography divergence from U.S. GAAP for retailers ([EY — IFRS 16 cash-flow classification vs IAS 7](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-gl/technical/ifrs-technical-resources/documents/ey-apply-leases-pd-december-2019.pdf); [BDO — IAS 7 in practice, lease cash-flow classification](https://www.bdo.global/getmedia/019a82c6-9901-4f17-9c71-29077fe583d7/IFRS-In-Practice-IAS-7-2022-2023.pdf.aspx)).

---

# PART VII — IAS 37 PROVISIONS

IAS 37 governs **provisions, contingent liabilities, and contingent assets**. A provision is recognised when an entity has a **present obligation (legal or constructive)** as a result of a past event, it is **probable** that an outflow of resources will be required, and a **reliable estimate** can be made (IAS 37.14) ([IFRS Foundation — IAS 37 standard page (recognition criteria)](https://www.ifrs.org/issued-standards/list-of-standards/ias-37-provisions-contingent-liabilities-and-contingent-assets/)).

---

## VII.1 Returns Provision Interaction

**IFRS 15 takes precedence for revenue contracts.** A retailer's obligation to accept **product returns** under a sales contract is **not** an IAS 37 provision — it is a **refund liability** measured and presented under **IFRS 15.B20–B27 / IFRS 15.55** (see Part III.4 above). IAS 37 explicitly scopes out provisions covered by other standards, and the returns/refund obligation arising from a contract with a customer sits within IFRS 15 ([IFRS Foundation — IAS 37 standard page, scope excludes obligations covered by other standards](https://www.ifrs.org/issued-standards/list-of-standards/ias-37-provisions-contingent-liabilities-and-contingent-assets/); [Ciferi — refund liability governed by IFRS 15, not generic provision](https://ciferi.com/glossary/right-of-return)).

**IAS 37 applies to non-revenue obligations.** IAS 37 continues to govern retail obligations **outside** the IFRS 15 refund mechanism — for example, **warranty obligations** that extend beyond the revenue contract (assurance-type warranties not accounted for as separate performance obligations), legal claims, decommissioning/restoration of leased premises, and the **restructuring** and **onerous-contract** provisions below. (Service-type warranties that are distinct performance obligations are IFRS 15 items, not IAS 37 provisions; assurance warranties are provided for under IAS 37) ([IFRS Foundation — IAS 37 standard page (warranties, restructuring scope)](https://www.ifrs.org/issued-standards/list-of-standards/ias-37-provisions-contingent-liabilities-and-contingent-assets/)).

---

## VII.2 Restructuring Provisions for Underperforming Stores — IAS 37.70–IAS 37.83

**The standard.** A restructuring is a programme planned and controlled by management that materially changes the scope of the business or the manner in which it is conducted (IAS 37.10), and IAS 37.70 lists examples including the **closure of business locations** ([IFRS Foundation — IAS 37 standard page, restructuring examples incl. closure of locations](https://www.ifrs.org/issued-standards/list-of-standards/ias-37-provisions-contingent-liabilities-and-contingent-assets/)).

**Constructive obligation — detailed formal plan and announcement test (IAS 37.72).** A constructive obligation to restructure arises **only when** an entity (IAS 37.72):

> "(a) has a **detailed formal plan** for the restructuring identifying at least: the business or part of a business concerned; the principal locations affected; the location, function, and approximate number of employees who will be compensated for terminating their services; the expenditures that will be undertaken; and when the plan will be implemented; and (b) has **raised a valid expectation in those affected** that it will carry out the restructuring **by starting to implement that plan or announcing its main features to those affected by it**." (IAS 37.72) ([IFRS Foundation — IAS 37 standard page, IAS 37.72 detailed formal plan + announcement](https://www.ifrs.org/issued-standards/list-of-standards/ias-37-provisions-contingent-liabilities-and-contingent-assets/); [ACCA — IAS 37 restructuring constructive-obligation test](https://www.accaglobal.com/gb/en/student/exam-support-resources/fundamentals-exams-study-resources/f7/technical-articles/ias-37.html)).

A board decision **alone** does not create a constructive obligation before the reporting date unless implementation has started or the plan's main features have been announced (IAS 37.75). A restructuring provision includes **only the direct expenditures necessarily entailed** by the restructuring and **not** associated with the ongoing activities of the entity — it **excludes** costs such as retraining or relocating continuing staff, marketing, or investment in new systems (IAS 37.80) ([IFRS Foundation — IAS 37 standard page, IAS 37.80 direct expenditures only](https://www.ifrs.org/issued-standards/list-of-standards/ias-37-provisions-contingent-liabilities-and-contingent-assets/)).

**Retail-specific application.** For a chain rationalising its estate: a **store-closure programme** provision is recognised only once a detailed formal plan exists **and** has been announced (e.g., to staff, unions, or the market). Costs typically provided include **redundancy / termination benefits** (subject also to IAS 19) and **lease-exit costs** — though, as VII.3 explains, IFRS 16 has changed how lease-exit economics are captured. **[JUDGMENT AREA.]**

---

## VII.3 Onerous Contract Provisions — IAS 37.66–IAS 37.69

**The standard.** IAS 37 defines an **onerous contract** as "a contract in which the **unavoidable costs of meeting the obligations under the contract exceed the economic benefits expected to be received under it**" (IAS 37.10); IAS 37.66 requires that the present obligation under an onerous contract be **recognised and measured as a provision** ([IFRS Foundation — IFRIC staff paper, IAS 37.66 recognise onerous contract as provision](https://www.ifrs.org/content/dam/ifrs/meetings/2017/june/ifric/ias-37-provisions-contingemnt-liabilities-and-contingent-assets/ap4-ias-37-costs-considered-in-assessing-whether-a-contract-is-onerous.pdf); [KPMG — *Do you have an onerous contract?*, IAS 37 onerous-contract definition](https://kpmg.com/us/en/articles/2023/do-you-have-onerous-contract.html)).

**Unavoidable costs (IAS 37.68).** The unavoidable costs reflect the **least net cost of exiting** from the contract — the **lower of (i) the cost of fulfilling it and (ii) any compensation or penalties arising from failure to fulfil it** (IAS 37.68). The "cost of fulfilling a contract" comprises the costs that **relate directly to the contract** — both the incremental costs and an allocation of other directly-related costs (e.g., depreciation of an item of PP&E used in fulfilling the contract) (per the 2020 IAS 37 amendments) ([KPMG — IAS 37, unavoidable costs = lower of fulfil vs penalty; directly-related cost approach](https://kpmg.com/us/en/articles/2023/do-you-have-onerous-contract.html); [BDO — IAS 37, onerous-contract provision at lower of fulfilment vs cancellation cost](https://www.bdo.global/getmedia/80f4c6bb-0793-4b7d-bc78-e57c7e4bd027/IAS-37-AAG.pdf.aspx)). Before recognising an onerous-contract provision, the entity first **tests for impairment any assets dedicated to the contract** (IAS 37.69) ([KPMG — IAS 37, impair contract assets before onerous provision](https://kpmg.com/us/en/articles/2023/do-you-have-onerous-contract.html)).

**Retail lease onerous contract — and how IFRS 16 changed it.** Historically a retailer with a loss-making (e.g., dark or underperforming) store recognised an **onerous-lease provision** for the future rent on a vacated store under IAS 37. **IFRS 16 made many such provisions unnecessary**: because **operating leases are now on the balance sheet as ROU assets and lease liabilities**, a loss-making store's economics are captured by **impairing the ROU asset under IAS 36** (Part V), not by an IAS 37 onerous-lease provision on the (already-recognised) lease liability. The IAS 37 onerous-contract analysis now bites mainly on **non-lease retail contracts** (e.g., onerous supply, services, or fit-out commitments) and on the **non-lease components** of a retail contract ([KPMG — onerous contracts under IFRS, interaction with IFRS 16 on-balance-sheet leases](https://kpmg.com/us/en/articles/2023/do-you-have-onerous-contract.html)). **[JUDGMENT AREA.]**

**U.S. GAAP divergence (Part VII summary).** Under U.S. GAAP, exit and disposal costs (including lease-exit / store-closure costs) are governed by **ASC 420** and termination benefits by **ASC 712 / ASC 420**; ASC 420 generally requires a liability to be recognised when it is **incurred** (e.g., a cease-use date) rather than on the IAS 37 "detailed formal plan + announcement" constructive-obligation trigger, and U.S. GAAP has **no general onerous-contract (loss-contract) provision** outside specific scopes (e.g., ASC 605/606 loss contracts) — a material divergence from IAS 37.66 ([KPMG — IAS 37 vs US GAAP onerous-contract recognition](https://kpmg.com/us/en/articles/2023/do-you-have-onerous-contract.html); [IFRS Foundation — IAS 37 standard page](https://www.ifrs.org/issued-standards/list-of-standards/ias-37-provisions-contingent-liabilities-and-contingent-assets/)).

---

# PART VIII — IFRS FOR SMEs (RETAIL APPLICATION)

---

## VIII.1 Scope

**The standard.** The **IFRS for SMEs Accounting Standard** is a self-contained, simplified standard for entities that **do not have public accountability** and that publish general purpose financial statements for external users. An entity has public accountability (and so cannot use IFRS for SMEs) if its debt or equity instruments are traded in a public market, or it holds assets in a fiduciary capacity for a broad group of outsiders (e.g., banks, insurers) ([IFRS Foundation — IFRS for SMEs (third edition, simplified standard)](https://www.iasplus.com/en/standards/other/ifrs-for-smes); [KPMG — IFRS for SMEs third edition largely aligned with full IFRS](https://kpmg.com/xx/en/our-insights/ifrg/2024/ifrs-sme.html)).

**Current version — third edition, February 2025.** The **third edition** of the IFRS for SMEs Accounting Standard was issued in **February 2025**, with updates that now largely align it with full IFRS Accounting Standards ([IFRS Foundation — *IFRS for SMEs Accounting Standard, Third Edition* (markup)](https://www.ifrs.org/content/dam/ifrs/supporting-implementation/smes/2025/ifrs-for-smes-standard-markup.pdf); [EY — IASB issues third edition of IFRS for SMEs (March 2025)](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-gl/technical/ifrs-technical-resources/documents/en-gl-iasb-issues-third-edition-of-ifrs-for-smes-accounting-standard-03-2025.pdf)). An IFRS-for-SMEs retail tenant must confirm whether it is on the **second** or **third** edition at its reporting date, because the revenue and disclosure requirements differ materially between editions. **[VERIFY EDITION AT REPORTING DATE.]**

---

## VIII.2 Retail-Relevant Simplifications

- **Section 13 *Inventories* — simpler than IAS 2 but same LIFO prohibition.** Section 13 measures inventories at "the **lower of cost and estimated selling price less costs to complete and sell**" (Section 13.4) — the IFRS-for-SMEs phrasing of lower of cost and NRV — and assigns cost using **FIFO or weighted average** (specific identification for non-interchangeable items); **LIFO is not permitted**, consistent with IAS 2 ([IFRS Foundation — *Module 13 Inventories* (third edition, Feb 2025), Section 13.4 lower of cost and estimated selling price less costs](https://www.ifrs.org/content/dam/ifrs/supporting-implementation/smes/2026-modules/module-13.pdf)). The third edition expanded Section 13's scope to inventories arising from construction contracts and to **returns assets classified as inventories**, as a consequence of revised Sections 11 and 23 ([IFRS Foundation — Module 13, third-edition scope changes (returns assets, construction contracts)](https://www.ifrs.org/content/dam/ifrs/supporting-implementation/smes/2026-modules/module-13.pdf)).
- **Section 17 *Property, Plant and Equipment* — revaluation now permitted.** Originally the IFRS for SMEs permitted **only the cost model** in Section 17. A 2015 amendment (carried into later editions) introduced the **option of the revaluation model**, giving SMEs the same choice as full IFRS under IAS 16 ([Grant Thornton — *Special Edition on the IFRS for SMEs*, Section 17 revaluation model option added (previously cost only)](https://www.grantthornton.global/globalassets/1.-member-firms/global/insights/article-pdfs/ifrs/ifrs-for-smes-2015-special-edition-portrait.pdf); [Studocu — IFRS for SMEs Section 17 cost or revaluation model](https://www.studocu.com/ph/document/university-of-the-east-ramon-magsaysay/fundamentals-of-accounting/ppe-property-plant-and-equipment/48052341)). *(Verified: the historical "cost model only" framing in the task scope reflects the original standard; the current standard permits revaluation.)*
- **Section 20 *Leases* — NOT aligned with IFRS 16 (operating/finance distinction retained).** The IASB **deferred alignment** of Section 20 with IFRS 16 in the third edition — Section 20 received **editorial amendments only**. SMEs therefore **retain the operating/finance lease classification** (an IAS 17-style model), and do **not** apply the IFRS 16 single on-balance-sheet model ([IFRS Foundation — third-edition markup, Section 20 Leases "editorial amendments only"](https://www.ifrs.org/content/dam/ifrs/supporting-implementation/smes/2025/ifrs-for-smes-standard-markup.pdf); [KPMG — IFRS for SMEs third edition, IASB deferred IFRS 16 alignment for Section 20](https://kpmg.com/xx/en/our-insights/ifrg/2024/ifrs-sme.html)). *(Verified per task instruction to confirm post-IFRS-16 status: alignment was deferred, not adopted.)*
- **Section 23 *Revenue from Contracts with Customers* — now aligned with IFRS 15.** In the third edition (Feb 2025), Section 23 was **revised and renamed** "Revenue from Contracts with Customers" to **align with IFRS 15**, introducing a **simplified five-step model** (with simplifications for warranties, customer options, allocation of the transaction price, and costs of obtaining a contract). In the **second** edition, Section 23 was based on the legacy IAS 11 / IAS 18 model ([IFRS Foundation — *Module 23* (third edition), Section 23 revised to align with IFRS 15, simplified five-step](https://www.ifrs.org/content/dam/ifrs/supporting-implementation/smes/2025-modules/module-23.pdf); [EY — third edition, Section 23 aligns with IFRS 15 simplified five-step](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-gl/technical/ifrs-technical-resources/documents/en-gl-iasb-issues-third-edition-of-ifrs-for-smes-accounting-standard-03-2025.pdf); [World Bank — IFRS for SMEs 3rd edition update, Section 23 aligned with IFRS 15 with simplifications](https://cfrr.worldbank.org/sites/default/files/2026-03/IFRS%20for%20SMEs%20Update%20(2025%20edition).pdf)). *(Verified per task instruction to confirm status of revisions: Section 23 was revised in the third edition.)*
- **Section 27 *Impairment of Assets* — simpler than IAS 36.** Section 27 applies a recoverable-amount model conceptually similar to IAS 36 (with CGU concepts) but with reduced detail; like IAS 36 it permits **reversal of impairment for assets other than goodwill** ([Deloitte iasplus — IFRS for SMEs overview (Section 27 impairment)](https://www.iasplus.com/en/standards/other/ifrs-for-smes)).

---

## VIII.3 When Applicable

The IFRS for SMEs is used by **non-listed retail entities** without public accountability — frequently **family-owned, owner-operated, or private-equity-backed** retail businesses. Adoption is commonly **lender-driven**: banks and other creditors require IFRS-for-SMEs (rather than local-GAAP or full-IFRS) financial statements as a covenant or credit condition, because the standard offers comparable, internationally recognised reporting at a lower preparation cost than full IFRS ([KPMG — IFRS for SMEs for non-publicly-accountable entities](https://kpmg.com/xx/en/our-insights/ifrg/2024/ifrs-sme.html); [IFRS Foundation — IFRS for SMEs scope (no public accountability)](https://www.iasplus.com/en/standards/other/ifrs-for-smes)). A PE-backed retail roll-up that anticipates a future IPO may instead adopt **full IFRS** early to avoid a later conversion.

---

# PART IX — WAVE 2 BINDING CROSSWALK (IFRS PATTERN-TYPE REUSE)

---

This part is **binding on the Wave 2 build**. It records how each IFRS standard covered above maps onto the **manufacturing-vertical IFRS pattern types** already defined in the Manufacturing Wave 1/Wave 2 stack (so the retail vertical **reuses** rather than re-implements them), and identifies the **new retail-specific IFRS types** that Wave 2 must define because the manufacturing stack has no analog. It mirrors the reporting-basis routing discipline of `Manufacturing_IFRS_Sources.md` Part V: the **tenant-level `reportingBasis: 'US_GAAP' | 'IFRS'`** election drives whether this document is loaded as governing literature, and where the IAS/IFRS standards here conflict with the GAAP retail documents (`Retail_ASC606_Sources.md` RTL-K-B and the retail disclosures module), **this document governs for the IFRS tenant**. Every conclusion remains `recommendation_for_human_review`; nothing here authorizes Advisacor to author or file any IFRS disclosure autonomously.

---

## IX.1 Reused Manufacturing Pattern Types

The following types are **already defined** in the manufacturing IFRS basis-contracts layer (the K-0 `ManufacturingBasisContracts` module referenced by `Manufacturing_IFRS_Sources.md`). The retail vertical **imports and reuses** them unchanged; only the **inputs** differ (retail merchandise rather than manufactured finished goods, store ROU assets rather than plant/equipment ROU assets). Wave 2 must **not** fork these types.

| Pattern type (reused) | Source standard(s) | Manufacturing definition reused | Retail-specific inputs fed to it | Governing section (this doc) |
|---|---|---|---|---|
| `IFRSInventory` | IAS 2 | Lower of cost and NRV; cost formula enum **{FIFO, weighted_average, specific_identification}** with **LIFO excluded from the enum**; write-down + **reversal-required** flag (capped at original cost) | Merchandise held for resale; **retail-method cost approximation (IAS 2.22)** as a permitted cost-measurement technique; markdown-driven NRV write-downs; packaging/store supplies | §I.2, §I.3, §I.4, §I.5 |
| `IFRS_PPE` | IAS 16 | Component approach **required** (significant parts depreciated separately); cost **or** revaluation model (by class); annual review of useful life/residual value; impairment trigger to IAS 36 | Store fit-out / leasehold-improvement components (shopfit, HVAC, refrigeration); revaluation rare in retail but available | §II.1, §II.2, §II.3, §II.4 |
| `IFRSLease` (`ifrs16_single_model`) | IFRS 16 | **Single lessee on-balance-sheet model**; ROU asset + lease liability; short-term & **low-value** recognition exemptions; variable-payment rule (index/rate in liability, truly-variable expensed); modification remeasurement | Retail **store leases** as the dominant population; **percentage / turnover rent** as the canonical truly-variable payment; renewal-option and break-clause term judgments; high lease-modification volume (estate churn) | §IV.1, §IV.2, §IV.3, §IV.4, §IV.5 |
| `IFRSRevenueContract` | IFRS 15 | Five-step model; performance-obligation enum; variable-consideration constraint; principal/agent indicators (IFRS 15.B37); contract-cost capitalization with **reversal-required** impairment | Retail surfaces: gift cards / **breakage (B44–B47)**, **loyalty points (B39–B43)**, **rights of return (B20–B27)** with refund liability + return asset, **consignment (B77–B78)**, **principal vs agent (B34–B38)** for marketplaces/concessions | §III.1–§III.6 |
| `IFRSDisclosurePackage` | IAS 1 / IAS 7 (+ IFRS 18 transition) | Statement-of-financial-position ordering; P&L by function or nature; cash-flow classification harness; transition note scaffold for **IFRS 18** (effective annual periods beginning on/after 1 Jan 2027) | Function-of-expense P&L typical for retail (cost of sales, distribution, administrative); lease cash-flow split (principal in financing, interest per policy); SoFP current/non-current split of lease liabilities | §VI.1, §VI.2, §VI.3 |

**Reuse rule.** Because the variance/KPI math and the disclosure harness are **reporting-basis-neutral in computation** (as established in the manufacturing Part V), the retail Wave 2 build binds the **same** evaluator and disclosure-package code to these reused types; it changes only the **input composition** (retail cost flows, store ROU assets, retail revenue surfaces). The reporting-basis flag routes divergent inputs (LIFO absence, single-lease model, write-down reversal, impairment reversal) to IFRS-aware logic; it is **spine-gated** (tenant isolation + RBAC) and **proved** by the retail panel probes, not asserted.

---

## IX.2 New Retail-Specific IFRS Types (Wave 2 Must Define)

The manufacturing stack has **no analog** for the following three retail surfaces; Wave 2 must **define** them as new types (each composing a reused base type where shown). Each is a binding contract for the retail panel data path.

| New type (Wave 2 defines) | Source standard | Why no manufacturing analog | Binding behavior | Governing section |
|---|---|---|---|---|
| `IFRSStoreCGU` | IAS 36 | Manufacturing impairment groups at **plant / production-line** CGUs; retail impairment groups at the **individual store** (or store cluster) because each store has **largely independent cash inflows** (IAS 36.6, 36.68–36.69) | Store (or smallest store-cluster) as the CGU; allocate shared/HQ and goodwill to CGUs/groups; recoverable amount = higher of FVLCD and VIU; **reversal permitted for the store CGU but never for goodwill (IAS 36.124)** | §V.1, §V.2, §V.3, §V.4 |
| `IFRSGiftCardLiabilityIFRS` | IFRS 15.B44–B47 | Manufacturing has no consumer **stored-value / gift-card** surface | Contract liability on issuance; **breakage** recognised in proportion to redemption pattern when breakage is expected (B46), else when remote (B44); escheat / unclaimed-property carve-out flagged for human review; composes `IFRSRevenueContract` | §III.2 |
| `IFRSReturnsProvision` (refund liability + return asset) | IFRS 15.B20–B27 (esp. B25) | Manufacturing returns are episodic warranty/defect; retail has **systemic high-volume rights of return** | **Refund liability** for consideration not expected to be retained (B21–B23); **asset for the right to recover products** measured at former carrying amount less expected recovery costs (B25), tested for impairment; net of the IAS 37 interaction (IFRS 15 takes precedence for the customer-contract refund); composes `IFRSRevenueContract` | §III.4, §VII.1 |

**Note on a fourth candidate.** Onerous-contract / store-restructuring provisioning (IAS 37) is handled by the **reused** disclosure/provision harness with retail inputs rather than a wholly new type, because — as §VII.3 explains — **IFRS 16 moved most loss-making-store economics into ROU-asset impairment under IAS 36 (`IFRSStoreCGU`)**, leaving IAS 37 to bite on non-lease retail contracts. Wave 2 therefore routes store-closure and onerous-contract logic through `IFRSStoreCGU` (for the ROU/PP&E impairment) plus the reused provision harness (for redundancy and non-lease onerous costs), not a new dedicated type. **[JUDGMENT AREA.]**

---

## IX.3 Governing Overrides for the IFRS Retail Tenant

Where this document conflicts with the GAAP retail documents, the IFRS override below governs for an `IFRS`-electing tenant. This mirrors the manufacturing override table (`Manufacturing_IFRS_Sources.md` §5.2) with retail-specific surfaces added.

| Topic | GAAP retail default (RTL-K-B / disclosures) | IFRS override (this doc) | Governing section |
|---|---|---|---|
| Inventory cost flow | LIFO permitted (US GAAP) | **LIFO prohibited** — FIFO / weighted-average / specific-identification only | §I.2 |
| Inventory write-down | Lower of cost or NRV (or market); **reversal prohibited** | Lower of cost and NRV; **reversal required** when NRV recovers (capped at original cost) | §I.4 |
| Retail inventory method | Retail inventory method long-standing under US GAAP | **Retail method permitted only as a cost-measurement convenience (IAS 2.22)** that approximates cost; not a separate measurement basis | §I.3 |
| PP&E componentization | Permitted, not required | **Component approach required** (significant store-fit parts depreciated separately) | §II.1 |
| PP&E subsequent measurement | Historical cost required | **Cost OR revaluation model** (entire class) | §II.2 |
| Store impairment reversal | **Prohibited** (ASC 360, held-and-used) | **Reversal permitted** (IAS 36, non-goodwill store CGU; capped at depreciated-cost ceiling) | §V.4 |
| Lessee lease model | **Dual** finance/operating (ASC 842) | **Single** on-balance-sheet model; **low-value exemption** (no ASC 842 equivalent) | §IV.1, §IV.2 |
| Gift-card breakage | Recognised on redemption pattern (ASC 606 consistent) | IFRS 15.B46 expected-breakage pattern; close but cite IFRS paragraph | §III.2 |
| Loyalty programmes | Material-right deferral (ASC 606) | IFRS 15.B39–B43 material right; **supersedes IFRIC 13**; cite IFRS paragraph | §III.3 |
| Revenue elections | Shipping/handling & sales-tax practical expedients available (ASC 606) | **No such elections** under IFRS 15; lower collectibility threshold; contract-cost impairment **reversal required** | §III.1, §III.6 |
| Store-closure / exit costs | ASC 420 (liability when incurred / cease-use) | IAS 37 **detailed-formal-plan + announcement** constructive-obligation trigger; **onerous-contract provision** exists (no general US GAAP equivalent) | §VII.2, §VII.3 |

**Critical boundary.** The retail panel is an **internal management view**. It does **not** by itself create, trigger, or satisfy any required IFRS disclosure; every IAS 2 / IAS 16 / IFRS 15 / IFRS 16 / IAS 36 / IAS 37 disclosure remains the product of a **human preparer's judgement**, classified `recommendation_for_human_review`. The verifier (retail Wave 2) must confirm that an `IFRS`-electing retail tenant routes through IFRS-aware logic wherever the standards diverge — **LIFO absence, single-lease model, write-down reversal, store-CGU impairment reversal, gift-card breakage, returns refund-liability/return-asset, and the IAS 37 store-closure trigger**.

---

# PART X — SOURCES REFERENCE TABLE

---

All sources below are **primary or authoritative-interpretive**: the **IFRS Foundation** issued standards, illustrative examples, modules, and staff/IFRIC papers (canonical; some pages behind a free **[REGISTRATION WALL]**, cited regardless), and the Big-Four / national-firm IFRS handbooks (Deloitte IAS Plus / DART, KPMG, EY, PwC, Grant Thornton, BDO, ACCA), treated as **primary for interpretation** of how the standards apply to retail. Cross-references to ASC counterparts cite the relevant GAAP sibling document or a clearly-labelled comparison source (**never** as a sole citation). URLs verified as resolving as of June 23, 2026.

| Source | URL | Coverage |
|---|---|---|
| IFRS Foundation — IAS 2 *Inventories* (issued standard, HTML) | [ifrs.org — IAS 2 (2024 issued)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html) | Objective; scope (1, 6, 9); lower of cost and NRV; cost formulas (LIFO not among them) |
| IFRS Foundation — IAS 2 *Inventories* (PDF, Part A) | [ifrs.org — IAS 2 (2021 PDF)](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-2-inventories.pdf) | **Retail method (IAS 2.22)** verbatim; NRV reversal (33–34); disclosure (36) verbatim |
| IFRS Foundation — IAS 2 summary | [ifrs.org — IAS 2 standard page](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/) [REGISTRATION WALL] | Lower of cost and NRV; merchandise held for resale |
| IFRS Foundation — IFRIC staff paper: IAS 2 costs necessary to sell | [ifrs.org — IAS 2 costs necessary to sell](https://www.ifrs.org/content/dam/ifrs/meetings/2021/february/ifric/ap03-ias2-costs-necessary-to-sell-inventories.pdf) | NRV = estimated selling price less all costs necessary to make the sale |
| KPMG — *Inventory: IFRS Accounting Standards vs US GAAP* | [kpmg.com — inventory IFRS vs US GAAP](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html) | LIFO prohibited; write-down reversal required; single lower-of-cost-and-NRV rule |
| Deloitte IAS Plus — IAS 2 *Inventories* summary | [iasplus.com — IAS 2 summary](https://www.iasplus.com/en/standards/ias/ias2) | Lower of cost and NRV; cost formulas; NRV write-down and reversal; disclosure |
| IFRS Foundation — IAS 16 *Property, Plant and Equipment* (PDF, Part A) | [ifrs.org — IAS 16 (2021 PDF)](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf) | Componentization (43) verbatim; cost/revaluation (29–42); revaluation (31); useful-life review (51) verbatim |
| IFRS Foundation — IAS 16 *Property, Plant and Equipment* (issued standard, HTML) | [ifrs.org — IAS 16 (2025 issued)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ias16.html) | Recognition; subsequent measurement; depreciation; derecognition |
| BDO — *IAS 16 At a Glance* | [bdo.global — IAS 16 AAG](https://www.bdo.global/getmedia/1024bf48-54c9-4d7e-bfce-24d495786310/IAS-16-AAG.pdf.aspx) | Component depreciation; revaluation by class; residual/useful-life review |
| ACCA — *Property, plant and equipment (IAS 16)* | [accaglobal.com — IAS 16 PPE](https://www.accaglobal.com/gb/en/student/exam-support-resources/fundamentals-exams-study-resources/f7/technical-articles/ppe.html) | Component approach; revaluation model mechanics; depreciation review |
| IFRS Foundation — IAS 23 *Borrowing Costs* (issued standard, HTML) | [ifrs.org — IAS 23 (2025 issued)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ias23.html) | Qualifying assets (store-construction context) |
| IFRS Foundation — IFRS 15 *Revenue from Contracts with Customers* (PDF, Part A) | [ifrs.org — IFRS 15 (2021 PDF)](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ifrs-15-revenue-from-contracts-with-customers.pdf) | Five-step (9–32); returns (B20–B27, B25); agent (B34–B38, B37); loyalty (B39–B43, B40); breakage (B44–B47, B46); consignment (B77–B78, B77) |
| IFRS Foundation — IFRS 15 (issued standard, HTML) | [ifrs.org — IFRS 15 (2024 issued)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ifrs15.html) | Core principle (2); five-step model; contract criteria (9); distinct (27) |
| IFRS Foundation — IFRS 15 illustrative examples (HTML) | [ifrs.org — IFRS 15 IE (2024)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ifrs15-ie.html) | Loyalty IE (IE249–252); principal/agent IE (IE231–239) |
| EY — *Applying IFRS 15 Revenue from Contracts with Customers* | [ey.com — Applying IFRS 15](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-gl/technical/ifrs-technical-resources/documents/ey-how-ifrs-15-revenue-from-contracts-with-customers.pdf) | Refund liability; return asset presented gross; variable consideration constraint |
| EY — *Technical Line: how the revenue standard affects retail and consumer products* | [ey.com — Technical Line retail revenue](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-us/technical/accountinglink/documents/ey-tl03068-171us-04-23-2024.pdf) | Principal vs agent for third-party / marketplace retail sales; gross vs net |
| IFRS Foundation — IFRS 15 standard page | [ifrs.org — IFRS 15 standard page](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/) [REGISTRATION WALL] | Five-step model; effective date; PIR status |
| IFRS Foundation — IFRS 15 PIR staff paper (principal vs agent) | [ifrs.org — IFRS 15 PIR principal-vs-agent](https://www.ifrs.org/content/dam/ifrs/meetings/2024/february/iasb/ap6b-ifrs-15-pir-principal-vs-agent-considerations.pdf) | Control before transfer; B37 indicators application |
| IFRS Foundation — TRG staff paper (customer options / loyalty) | [ifrs.org — TRG customer options](https://www.ifrs.org/content/dam/ifrs/meetings/2014/october/trg-rev/rev-rec/ap6-customer-options.pdf) | Material right; allocation of transaction price to loyalty points (B40) |
| IFRS Foundation — staff paper (right to recover returned goods) | [ifrs.org — returns right-to-recover](https://www.ifrs.org/content/dam/ifrs/meetings/2009/december/joint-iasb-fasb/rr-1209b03bobs.pdf) | Return asset measurement; refund liability (B25) |
| PwC — *IFRS 15 for retailers* | [pwc.com — IFRS 15 retailers](https://www.pwc.com/m1/en/services/cmaas/documents/ifrs15/ifrs-15-retailers.pdf) | Gift cards, loyalty, returns, vouchers in a retail context |
| PwC — *IFRS 15 solutions for the retail & consumer industry* | [pwc.at — IFRS 15 retail & consumer](https://www.pwc.at/de/newsletter/ifrs/in-brief-in-depth/2018/ifrs15_solutions_for_the_retail_consumer_industry.pdf) | Consignment (B77) verbatim context; principal/agent for concessions |
| RevenueHub — *ASC 606 vs IFRS 15* (cross-reference) | [revenuehub.org — ASC 606 vs IFRS 15](https://www.revenuehub.org/article/asc-606-ifrs-15) | IFRS 15 divergence cross-reference (never sole citation) |
| IFRS Foundation — IFRS 16 *Leases* (issued standard, HTML) | [ifrs.org — IFRS 16 (2025 issued)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ifrs16.html) | Single model (22–60); short-term & low-value exemptions (5–8); variable payments (27); disclosure (51–60) |
| IFRS Foundation — IFRS 16 *Leases* (PDF, Part A) | [ifrs.org — IFRS 16 (2021 PDF)](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ifrs-16-leases.pdf) | Modifications (44–46); ROU and lease-liability measurement |
| IFRS Foundation — IFRS 16 small-assets staff paper (BC100) | [ifrs.org — IFRS 16 small assets](https://www.ifrs.org/content/dam/ifrs/meetings/2015/february/iasb/leases/ap3e-leases-small-assets.pdf) | Low-value threshold rationale (~USD 5,000 new) |
| IFRS Foundation — IFRS 16 Effects Analysis | [ifrs.org — IFRS 16 Effects Analysis](https://www.ifrs.org/content/dam/ifrs/project/leases/ifrs/published-documents/ifrs16-effects-analysis.pdf) | On-balance-sheet effect; retail estate impact; EBITDA gross-up |
| KPMG — *Lease accounting: IFRS Accounting Standards vs US GAAP* | [kpmg.com — lease accounting IFRS vs US GAAP](https://kpmg.com/us/en/articles/2025/lease-accounting-ifrs-standards-us-gaap.html) | Single vs dual model; low-value exemption no Topic 842 equivalent |
| KPMG — *IFRS 16: An overview* | [kpmg.com — IFRS 16 overview (PDF)](https://assets.kpmg.com/content/dam/kpmgsites/xx/pdf/ifrg/2024/leases-overview.pdf.coredownload.inline.pdf) | Single model; recognition exemptions; variable payments |
| KPMG — *Lease modifications* | [kpmg.com — lease modifications (PDF)](https://assets.kpmg.com/content/dam/kpmgsites/xx/pdf/ifrg/2024/lease-modifications-2018.pdf) | Separate-lease vs remeasurement (44–46); retail estate churn |
| EY — *Applying IFRS 16: presentation and disclosure* | [ey.com — IFRS 16 presentation & disclosure](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-gl/technical/ifrs-technical-resources/documents/ey-apply-leases-pd-december-2019.pdf) | Quantitative lessee disclosures (51–60) |
| Deloitte IAS Plus — IFRS 16 summary | [iasplus.com — IFRS 16](https://iasplus.com/content/38c4d68d-3374-4c2b-a4d2-a2641f1bd5ae) | Single lessee model; exemptions; variable payments |
| Deloitte DART — *IFRS / US GAAP comparison: Leases* | [dart.deloitte.com — IFRS vs US GAAP leases](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-5-broad-transactions/5-7-leases) | Single vs dual model; low-value ~USD 5,000; front-loaded expense |
| New Zealand XRB — IFRS 16 (NZ IFRS 16) | [xrb.govt.nz — NZ IFRS 16](https://www.xrb.govt.nz/dmsdocument/3838/) | Modifications (44–46) verbatim cross-check |
| Ciferi — low-value asset exemption (glossary, cross-reference) | [ciferi.com — low-value asset exemption](https://ciferi.com/glossary/low-value-asset-exemption) | Low-value exemption lease-by-lease (never sole citation) |
| Ciferi — IFRS 16 lease modifications (cross-reference) | [ciferi.com — IFRS 16 lease modifications](https://ciferi.com/blog/ifrs-16-lease-modifications-guide) | Modification decision tree (never sole citation) |
| IFRS Foundation — IAS 36 *Impairment of Assets* standard page | [ifrs.org — IAS 36 standard page](https://www.ifrs.org/issued-standards/list-of-standards/ias-36-impairment-of-assets/) [REGISTRATION WALL] | CGU (6); recoverable amount = higher of FVLCD and VIU; reversal (non-goodwill); goodwill never reversed (124) |
| IFRS Foundation — IAS 36 illustrative examples (HTML) | [ifrs.org — IAS 36 IE (2024)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias36-ie.html) | CGU identification (retail-store example); allocation of goodwill |
| IFRS Foundation — IFRIC staff paper: reversal of goodwill impairment | [ifrs.org — goodwill reversal IFRIC](https://www.ifrs.org/content/dam/ifrs/meetings/2010/march/ifric/1003ap6bobsifricreversalofimpairmentlossesrelatingtogoodwill.pdf) | IAS 36.124 — impairment of goodwill never reversed |
| Grant Thornton — *IAS 36: Reversing impairment losses* | [grantthornton.global — reversing impairment losses](https://www.grantthornton.global/en/insights/articles/IFRS-ias-36/ifrs-Reversing-impairment-losses/) | Reversal indicators; CGU pro-rata reversal ceiling |
| Grant Thornton — *Insights into IAS 36: identifying cash-generating units* | [grantthorntonni.com — identifying CGUs](https://www.grantthorntonni.com/globalassets/1.-member-firms/ireland/insights/publications/grant-thornton---insights-into-ias-36---identifying-cash-generating-units.pdf) | Store-level CGU; independent cash inflows (68–69) |
| Deloitte DART — *IFRS / US GAAP comparison: impairment of non-financial assets* | [dart.deloitte.com — IFRS vs US GAAP impairment](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-1-assets/1-7-impairment-nonfinancial-assets) | One-step vs two-step; reversal permitted (IFRS) vs prohibited (US GAAP) |
| Hayot Expertise — *Impairment test under IAS 36* | [hayot-expertise.fr — IAS 36 impairment test](https://hayot-expertise.fr/en/blog/impairment-test-under-ias-36-in-2026-methodology-and-best-practices) | Recoverable-amount methodology; IAS 36.124 reversal scope |
| IFRS Foundation — IAS 1 *Presentation of Financial Statements* standard page | [ifrs.org — IAS 1 standard page](https://www.ifrs.org/issued-standards/list-of-standards/ias-1-presentation-of-financial-statements/) | SoFP; P&L by function or nature; IFRS 18 replacement (from 2027) |
| IFRS Foundation — IAS 7 *Statement of Cash Flows* standard page | [ifrs.org — IAS 7 standard page](https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows/) | Operating/investing/financing classification; lease cash-flow split |
| BDO — *IFRS in Practice: IAS 7 Statement of Cash Flows* | [bdo.global — IAS 7 in practice](https://www.bdo.global/getmedia/019a82c6-9901-4f17-9c71-29077fe583d7/IFRS-In-Practice-IAS-7-2022-2023.pdf.aspx) | Lease principal in financing; interest classification policy |
| IFRS Foundation — IAS 37 *Provisions, Contingent Liabilities and Contingent Assets* standard page | [ifrs.org — IAS 37 standard page](https://www.ifrs.org/issued-standards/list-of-standards/ias-37-provisions-contingent-liabilities-and-contingent-assets/) | Restructuring (10, 70–83, 72, 80); onerous-contract definition (10) |
| IFRS Foundation — IFRIC staff paper: IAS 37 onerous-contract costs | [ifrs.org — IAS 37 onerous-contract costs](https://www.ifrs.org/content/dam/ifrs/meetings/2017/june/ifric/ias-37-provisions-contingemnt-liabilities-and-contingent-assets/ap4-ias-37-costs-considered-in-assessing-whether-a-contract-is-onerous.pdf) | Onerous contract recognised as provision (66); unavoidable costs (68) |
| KPMG — *Do you have an onerous contract?* | [kpmg.com — onerous contract](https://kpmg.com/us/en/articles/2023/do-you-have-onerous-contract.html) | Unavoidable costs = lower of fulfil vs penalty; IFRS 16 interaction; US GAAP divergence |
| BDO — *IAS 37 At a Glance* | [bdo.global — IAS 37 AAG](https://www.bdo.global/getmedia/80f4c6bb-0793-4b7d-bc78-e57c7e4bd027/IAS-37-AAG.pdf.aspx) | Provision recognition; onerous-contract measurement; restructuring |
| ACCA — *IAS 37 Provisions* | [accaglobal.com — IAS 37](https://www.accaglobal.com/gb/en/student/exam-support-resources/fundamentals-exams-study-resources/f7/technical-articles/ias-37.html) | Restructuring constructive-obligation test (72); detailed formal plan + announcement |
| IFRS Foundation — *IFRS for SMEs Accounting Standard, Third Edition* (markup) | [ifrs.org — IFRS for SMEs 3rd ed markup](https://www.ifrs.org/content/dam/ifrs/supporting-implementation/smes/2025/ifrs-for-smes-standard-markup.pdf) | Third edition (Feb 2025); Section 20 editorial-only (no IFRS 16 alignment) |
| IFRS Foundation — *Module 13 Inventories* (3rd ed) | [ifrs.org — IFRS for SMEs Module 13](https://www.ifrs.org/content/dam/ifrs/supporting-implementation/smes/2026-modules/module-13.pdf) | Section 13 lower of cost and estimated selling price; LIFO prohibited; returns-asset scope |
| IFRS Foundation — *Module 23 Revenue* (3rd ed) | [ifrs.org — IFRS for SMEs Module 23](https://www.ifrs.org/content/dam/ifrs/supporting-implementation/smes/2025-modules/module-23.pdf) | Section 23 revised to align with IFRS 15; simplified five-step |
| KPMG — *IFRS for SMEs (third edition)* | [kpmg.com — IFRS for SMEs 3rd ed](https://kpmg.com/xx/en/our-insights/ifrg/2024/ifrs-sme.html) | Third edition largely aligned with full IFRS; Section 20 IFRS 16 alignment deferred |
| EY — *IASB issues third edition of IFRS for SMEs* | [ey.com — IFRS for SMEs 3rd ed](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-gl/technical/ifrs-technical-resources/documents/en-gl-iasb-issues-third-edition-of-ifrs-for-smes-accounting-standard-03-2025.pdf) | Third edition Feb 2025; Section 23 aligns with IFRS 15 |
| Grant Thornton — *Special Edition on the IFRS for SMEs* | [grantthornton.global — IFRS for SMEs special edition](https://www.grantthornton.global/globalassets/1.-member-firms/global/insights/article-pdfs/ifrs/ifrs-for-smes-2015-special-edition-portrait.pdf) | Section 17 revaluation model option added (previously cost only) |
| World Bank CFRR — *IFRS for SMEs Update (2025 edition)* | [worldbank.org — IFRS for SMEs 2025 update](https://cfrr.worldbank.org/sites/default/files/2026-03/IFRS%20for%20SMEs%20Update%20(2025%20edition).pdf) | Third-edition scope; Section 23 aligned with IFRS 15 with simplifications |
| Deloitte IAS Plus — IFRS for SMEs overview | [iasplus.com — IFRS for SMEs](https://www.iasplus.com/en/standards/other/ifrs-for-smes) | Scope (no public accountability); Section 27 impairment (reversal permitted) |
| `Retail_ASC606_Sources.md` (RTL-K-B) | (workspace sibling) | ASC 606 retail revenue surfaces; IFRS 15 divergence cross-reference |
| `Manufacturing_IFRS_Sources.md` (MFG-K-C2) | (workspace sibling) | Reused IFRS pattern types; reporting-basis routing precedent |

---

*This document is part of the Advisacor Retail Vertical Knowledge Stack (Module RTL-K-C2, Wave 1). It is `DRAFT / SPEC — NOT EXECUTABLE — NOT LOCKED`, `executable: false`, `containsVerticalComplianceLogic: true`. All inventory-, PP&E-, revenue-, lease-, impairment-, presentation-, and provision-accounting conclusions and divergence flags generated by Advisacor under an IFRS reporting basis are classified as `output_classification = 'recommendation_for_human_review'`. No statement in this document constitutes final accounting, audit, legal, or filing advice, and nothing here authorizes Advisacor to author, certify, or file any IFRS disclosure autonomously. Users must validate every IAS 2 / IAS 16 / IAS 23 / IFRS 15 / IFRS 16 / IAS 36 / IAS 1 / IAS 7 / IAS 37 / IFRS-for-SMEs paragraph citation against the current IFRS Foundation standards (some of which sit behind a free registration wall but are canonical), apply the analysis to their specific facts, retail sub-format (department store, specialty, grocery, e-commerce, franchise/concession), and their elected reporting basis, and confirm the latest amendment status against the IFRS work plan at their reporting date — including the transition to **IFRS 18** (effective annual periods beginning on or after 1 January 2027) and the edition of the IFRS for SMEs in force — before relying on it. This document is loaded for tenants electing the `IFRS` reporting basis and complements — it does not replace — `Retail_ASC606_Sources.md`; where the IAS/IFRS standards conflict with that GAAP document, this document governs for the IFRS tenant. The binding divergences from U.S. GAAP — LIFO prohibition (IAS 2), inventory write-down reversal (IAS 2), store-CGU impairment reversal (IAS 36), the single lessee model and low-value exemption (IFRS 16), mandatory componentization (IAS 16), the absence of IFRS 15 practical-expedient elections, and the IAS 37 onerous-contract / store-closure constructive-obligation trigger — are facts-and-circumstances and basis-sensitive matters flagged throughout; they require professional judgment. The retail panels referenced in Part IX are internal management views that supply decision-support evidence only and are reporting-basis-neutral in their computation; they do not by themselves create, trigger, or satisfy any IFRS disclosure, which remains the product of a human preparer's judgement and is spine-gated (tenant isolation + RBAC) and proved by the retail panel probes, not asserted.*
