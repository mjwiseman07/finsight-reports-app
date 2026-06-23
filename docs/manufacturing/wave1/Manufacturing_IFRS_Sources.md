# Manufacturing IFRS — IAS 2 Inventories, IAS 16 Property, Plant and Equipment, IFRS 15 Revenue, and IFRS 16 Leases — Comprehensive Source Reference

**DRAFT / SPEC — NOT EXECUTABLE — NOT LOCKED**

`executable: false`
`containsVerticalComplianceLogic: true`

**Document Title:** Manufacturing IFRS Source Document — Advisacor Manufacturing Vertical Knowledge Stack, Module MFG-K-C2
**Date Generated:** June 22, 2026
**Version:** 1.0 (DRAFT)
**Scope:** Manufacturers electing **International Financial Reporting Standards (IFRS Accounting Standards)** as their tenant-level reporting basis. This module covers, at equal depth to the U.S. GAAP source documents, four standards as applied to manufacturing: (I) **IAS 2** *Inventories*, (II) **IAS 16** *Property, Plant and Equipment* (with the closely related IAS 23 *Borrowing Costs* and IAS 36 *Impairment of Assets*), (III) **IFRS 15** *Revenue from Contracts with Customers*, and (IV) **IFRS 16** *Leases*. Five sub-segments — Discrete (D), Process (P), Hybrid/Mixed-Mode (H), Job-Shop/Project (J), Engineer-to-Order/ETO (E). NAICS sectors 31–33.
**Prepared for:** Advisacor — Wiseman Financial Technologies LLC (Matthew Wiseman, founder)
**Output Classification:** `recommendation_for_human_review`
**Authoring basis (resolved Q5).** This document was added by founder resolution to Open Question Q5 in `MANUFACTURING_VERTICAL_PLANNING_DOCUMENT.md`: *"FULL IFRS AUTHORING at v1.0, equal depth to U.S. GAAP."* Advisacor clients can elect IFRS as their reporting basis at the tenant level, so IFRS receives **stand-alone, equal-depth coverage** here — **not** a divergence callout buried inside the GAAP documents. Each IFRS standard below is authored as if it were the only standard governing the topic; U.S. GAAP (ASC 330 / ASC 360 / ASC 606 / ASC 842) is cross-referenced **only where a divergence is material to a manufacturer**, and where it is, both standards are cited.

**Citation Discipline:** Every authoritative claim cites a **primary source**. The canonical citation for each standard is the **IFRS Foundation** issued standard ([ifrs.org](https://www.ifrs.org)); the IFRS Foundation Educational Material and the official issued-standards list ([ifrs.org list of standards](https://www.ifrs.org/issued-standards/list-of-standards/)) are treated as canonical. The Big-Four and national-firm IFRS handbooks — **Deloitte IAS Plus** ([iasplus.com](https://www.iasplus.com)), **KPMG** *Insights into IFRS* / IFRS comparison articles ([kpmg.com](https://kpmg.com)), **EY** *International GAAP* / *IFRS Core Tools* ([ey.com](https://www.ey.com)), **PwC** *Inform* / industry IFRS guides ([pwc.com](https://www.pwc.com)), and **Grant Thornton** *Insights into IFRS* ([grantthornton.global](https://www.grantthornton.global)) — are treated as **primary for interpretation** of how the standards apply to manufacturing. Some IFRS Foundation standard pages sit behind a **free registration wall** but are the canonical text; they are cited regardless, with the note **[REGISTRATION WALL]** where relevant. Definitions and treatments that turn on facts-and-circumstances judgment are flagged **[JUDGMENT AREA]**.

This document is the IFRS peer of `Manufacturing_ASC606_Sources.md` (Module MFG-K-B) and `Manufacturing_Disclosures_Sources.md` (Module MFG-K-C), and a sibling of `Manufacturing_KPIs_Sources.md` (Module MFG-K-A). It **complements, and does not replace,** those documents. The U.S. GAAP documents remain authoritative for `US_GAAP` tenants; **this document is loaded for tenants that elect the `IFRS` reporting basis** (per the planning-doc panel contract `reportingBasis: 'US_GAAP' | 'IFRS'` field). Where the IFRS standards conflict with the GAAP documents, **this document governs for IFRS tenants** (see Part V). Terminology, the sub-segment key, the six-field per-topic structure, and the citation style are kept consistent with the three sibling documents; this document does **not** duplicate the existing `IFRS_Full_Sources.md`, `IFRS_EU_Sources.md`, or `IFRS_for_SMEs_Sources.md` — it is manufacturing-specific.

---

## How to Read This Document

The document is organized in **five parts plus a closing source index**:

- **Part I — IAS 2 Inventories** (Sections 1.1–1.7): scope, cost composition (purchase, conversion, normal-capacity overhead, borrowing costs, excluded costs), cost formulas (FIFO / weighted-average / specific identification; **LIFO prohibited**), net realisable value, **reversal of write-downs**, disclosure, and manufacturing-specific application.
- **Part II — IAS 16 Property, Plant and Equipment** (Sections 2.1–2.9): scope, initial measurement, **componentization**, cost model vs **revaluation model**, depreciation, impairment under IAS 36 (**reversal permitted**), derecognition, disclosure, and manufacturing-specific application.
- **Part III — IFRS 15 Revenue from Contracts with Customers** (Sections 3.1–3.4): convergence with ASC 606, manufacturing-specific divergences, industry application, and disclosure — a focused complement to `Manufacturing_ASC606_Sources.md`.
- **Part IV — IFRS 16 Leases** (Sections 4.1–4.5): the **single lessee on-balance-sheet model**, lessor accounting, P&L / EBITDA impact vs ASC 842, disclosure, and manufacturing-specific application — a focused complement to `Manufacturing_Disclosures_Sources.md` Part II.
- **Part V — IFRS Reporting-Basis Routing for Advisacor** (Sections 5.1–5.3): tenant election, knowledge-stack routing implications, and where reporting basis affects the variance panel.
- **Closing** — Primary Source Index of every cited source with URLs.

Each substantive topic carries, where applicable: (1) **The standard** — the operative paragraph(s) cited to the IFRS Foundation / interpretive handbooks; (2) **Manufacturing application** — how it applies to manufacturing patterns; (3) **Sub-segment applicability** — an explicit statement and, where useful, a five-column matrix across D / P / H / J / E; (4) **Cost / Formula** — quantitative mechanics where relevant; (5) **U.S. GAAP divergence** — where IFRS diverges materially (with both standards cited); (6) **Citation** — primary source.

**Manufacturing Sub-Segment Key:** **D** = Discrete | **P** = Process | **H** = Hybrid / Mixed-Mode | **J** = Job-Shop / Project | **E** = Engineer-to-Order (ETO).
Matrix legend: **✓** = applicable / common; **◑** = partially applicable / fact-dependent; **—** = not applicable / rare. **No cell is ever left blank.**

**Production-strategy axis (orthogonal to sub-type):** **MTS** = Make-to-Stock | **MTO** = Make-to-Order | **ATO** = Assemble-to-Order | **ETO** = Engineer-to-Order. Noted where a topic is sensitive to it (e.g., inventory composition skews toward finished goods for MTS and toward WIP / contract assets for ETO).

**Math notation:** inline math uses \( \cdots \); display math uses \[ \cdots \]. There are zero `$`-style math delimiters in this document.

---

# PART I — IAS 2 INVENTORIES (Manufacturing)

---

## 1.1 Scope and Recognition

**The standard.** IAS 2 *Inventories* prescribes the accounting for inventories, the primary issue being the amount of cost to be recognised as an asset and carried forward until the related revenues are recognised. The Standard provides guidance on the determination of cost and its subsequent recognition as an expense, **including any write-down to net realisable value** ([IFRS Foundation — IAS 2 *Inventories*, objective](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). Inventories are defined as assets (a) held for sale in the ordinary course of business, (b) in the process of production for such sale (work-in-process), or (c) in the form of materials or supplies to be consumed in the production process or in the rendering of services. For a manufacturer, in-scope inventory comprises **raw materials, work-in-process (WIP), finished goods, and production supplies** ([IFRS Foundation — IAS 2 summary](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/)).

**Exclusions.** IAS 2 does **not** apply to financial instruments (IAS 32 / IFRS 9) or to biological assets related to agricultural activity and agricultural produce at the point of harvest (**IAS 41** *Agriculture*) ([IFRS Foundation — IAS 2 scope, paragraph 2](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). The Standard's **measurement** requirements (lower of cost and NRV) do not apply to (a) inventories held by producers of agricultural and forest products, agricultural produce after harvest, and minerals/mineral products, to the extent measured at net realisable value under established industry practice; and (b) inventories held by commodity broker-traders measured at fair value less costs to sell — these are excluded from **only the measurement** requirements ([IFRS Foundation — IAS 2 paragraphs 3–4](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). This carve-out parallels the ASC 330 carve-out for the same producer / broker-dealer fact patterns ([KPMG — *Inventory: IFRS Accounting Standards vs US GAAP*](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)).

**Manufacturing application.** Long-cycle engineer-to-order (E) and project (J) work that transfers to the customer **over time** under IFRS 15 is accounted for as a **contract cost / contract asset** (IFRS 15 and IAS 2 paragraph 8 service-provider analogue), **not** as IAS 2 inventory — exactly as under ASC 606 in `Manufacturing_ASC606_Sources.md`. So a meaningful slice of an E/J manufacturer's "production in process" sits outside IAS 2.

**Sub-segment applicability.**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ◑ |

All five hold raw materials and finished goods within IAS 2, but the **mix differs**: Process (P) carries heavy bulk raw-material and continuous-WIP balances; Discrete (D) carries distinct component and finished-unit inventory; Hybrid (H) carries both plus packaging; Job-Shop (J) carries job-specific WIP; ETO (E) is **partial (◑)** because over-time IFRS 15 contracts move production cost out of IAS 2 and into contract assets.

---

## 1.2 Cost of Inventory under IAS 2

**The standard.** The cost of inventories comprises **all costs of purchase, costs of conversion, and other costs incurred in bringing the inventories to their present location and condition** (IAS 2 paragraph 10) ([IFRS Foundation — IAS 2 paragraph 10](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)).

**Costs of purchase (IAS 2.11).** The purchase price, **import duties and other non-refundable taxes**, and transport, handling, and other costs directly attributable to the acquisition of finished goods, materials, and services — **less trade discounts, rebates, and other similar items** ([IFRS Foundation — IAS 2 paragraph 11](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). Import duties / tariffs are reflected in the cost of the related inventories ([Deloitte IAS Plus — *iGAAP in Focus*, tariffs reflected in inventory cost](https://iasplus.com/content/f2d8d9b4-fd01-4665-97bd-8dc20a872f0c)).

**Costs of conversion (IAS 2.12–14).** Conversion cost comprises **direct labour plus a systematic allocation of fixed and variable production overheads** incurred in converting materials into finished goods ([IFRS Foundation — IAS 2 paragraphs 12–14](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)).

**Normal-capacity basis for fixed overhead (IAS 2.13 — explicit).** The **allocation of fixed production overheads** to the costs of conversion is based on the **normal capacity** of the production facilities — the production expected to be achieved on average over a number of periods or seasons under normal circumstances, taking into account capacity lost from planned maintenance. The amount of fixed overhead allocated to each unit of production is **not increased** as a consequence of low production or idle plant; unallocated fixed overhead is recognised as an **expense in the period incurred**. In periods of abnormally high production, the amount allocated per unit is **decreased** so inventories are not measured above cost ([IFRS Foundation — IAS 2 paragraph 13](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). **Variable production overheads** are allocated on the basis of the **actual use** of the production facilities (IAS 2.13).

\[ \text{Inventoriable unit cost} = \text{direct materials} + \text{direct labour} + \text{variable OH (actual basis)} + \frac{\text{fixed OH}}{\text{normal capacity}} \]

with unabsorbed (idle-capacity) fixed overhead and abnormal waste **excluded** and expensed as incurred. This is the IAS 2 analogue of the ASC 330-10-30-3 normal-capacity rule and ties directly to the **fixed-overhead volume variance** (`Manufacturing_KPIs_Sources.md` Section II): sub-normal volume produces unabsorbed fixed overhead, the accounting analogue of an unfavourable FOH volume variance.

**Other costs / costs to bring to present location and condition (IAS 2.15).** Other costs are included in the cost of inventories **only to the extent** they are incurred in bringing the inventories to their present location and condition — for example, non-production overheads or product-design costs for specific customers ([IFRS Foundation — IAS 2 paragraph 15](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)).

**Borrowing costs (IAS 2.17 / IAS 23).** Borrowing costs are capitalised into inventory **only for a qualifying asset** under IAS 23 — an asset that **necessarily takes a substantial period of time** to get ready for its intended use or sale ([IFRS Foundation — IAS 23 *Borrowing Costs*, paragraphs 5, 7–8](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ias23.html)). **Inventories that are manufactured, or otherwise produced, in large quantities on a repetitive basis are excluded** from mandatory capitalisation (IAS 23.4(b)), but inventory that takes a long time to produce — e.g., **aged spirits, cheese, long-cycle E/J product** — **can** be a qualifying asset, and KPMG treats this as an accounting-policy choice ([KPMG — *Borrowing costs: Top 10 differences between IFRS Standards and US GAAP*](https://kpmg.com/us/en/articles/2023/borrowing-costs.html)). Capitalisation begins when expenditure and borrowing costs are being incurred and preparatory activities are in progress, and ceases when the asset is substantially ready ([KPMG — *Borrowing costs*](https://kpmg.com/us/en/articles/2023/borrowing-costs.html)).

**Excluded costs (IAS 2.16).** The following are recognised as **expenses in the period incurred** and excluded from inventory cost: (a) **abnormal amounts of wasted materials, labour, or other production costs**; (b) **storage costs, unless those costs are necessary in the production process** before a further production stage; (c) **administrative overheads** that do not contribute to bringing inventories to their present location and condition; and (d) **selling costs** ([IFRS Foundation — IAS 2 paragraph 16](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html); abnormal-loss exclusion confirmed in [PwC — IAS 2 abnormal losses excluded from inventory](https://www.pwc.com/ng/en/assets/pdf/covid19-key-financial-reporting%20implication-nigeria.pdf)).

**U.S. GAAP divergence.** None material in **cost composition**: ASC 330 reaches substantively identical conclusions on normal-capacity fixed-OH absorption, idle-capacity period-cost treatment, abnormal-loss exclusion, and storage/admin/selling exclusions ([KPMG — *Inventory: IFRS vs US GAAP*](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)). The material divergences are in **cost formulas (LIFO; §1.3)** and **write-down reversal (§1.5)**.

**Sub-segment applicability.**

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Normal-capacity fixed-OH absorption (2.13) | ✓ | ✓ | ✓ | ✓ | ◑ |
| Variable OH on actual basis (2.13) | ✓ | ✓ | ✓ | ✓ | ◑ |
| Borrowing-cost capitalisation (IAS 23) | ◑ | ✓ | ◑ | ◑ | ✓ |
| Abnormal-waste / storage / selling exclusion (2.16) | ✓ | ✓ | ✓ | ✓ | ✓ |

Normal-capacity absorption is most consequential for capital-intensive **Process (P)** and high-fixed-cost **Discrete (D)** plants. Borrowing-cost capitalisation is most relevant where production cycles are long: **Process (P)** aged product and **ETO (E)** long-cycle qualifying assets; for D / H / J it is fact-dependent (◑). J and E hold much production cost as contract/job cost rather than IAS 2 inventory, so the absorption rows are partial (◑).

---

## 1.3 Cost Formulas (IAS 2.23–27)

**The standard.** IAS 2 permits the following techniques to assign cost ([IFRS Foundation — IAS 2 paragraphs 23–27](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html); [IFRS Foundation — IAS 2 summary](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/)):

- **Specific identification (IAS 2.23–24) — REQUIRED for non-interchangeable items.** Costs of items that are **not ordinarily interchangeable**, and of goods or services produced and **segregated for specific projects**, are assigned by specific identification of their individual costs ([IFRS Foundation — IAS 2 paragraph 23](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html); cross-check [IFRS — IASB staff paper AP26A, specific identification for project goods](https://www.ifrs.org/content/dam/ifrs/meetings/2019/october/iasb/ap26a-ias-8.pdf)). This is the natural method for high-value, serialised, or custom **J / E** output.
- **First-in, first-out (FIFO) — ACCEPTABLE (IAS 2.25).** FIFO assumes the earliest-acquired or earliest-produced items are sold first; ending inventory reflects the most recent costs ([IFRS Foundation — IAS 2 paragraph 25 / summary](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/)).
- **Weighted-average cost — ACCEPTABLE (IAS 2.25).** Cost is determined from the weighted average of the cost of similar items at the beginning of a period and the cost of those purchased or produced during the period, computed periodically or on each receipt (moving average) ([IFRS Foundation — IAS 2 paragraph 27 / summary](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/)).

**LIFO PROHIBITED (IAS 2.25) — BINDING DIVERGENCE from ASC 330.** IAS 2 permits FIFO and weighted-average for ordinarily-interchangeable items and **does not permit the last-in, first-out (LIFO) cost formula**. LIFO was eliminated from IAS 2 in the 2003 revision; under IFRS, **LIFO is not an acceptable cost formula** ([KPMG — *Inventory: IFRS vs US GAAP*, LIFO prohibited under IAS 2](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)). **This is the first binding IAS 2 divergence from ASC 330**, which permits LIFO (`Manufacturing_Disclosures_Sources.md` §1.3 / §1.5). A U.S. manufacturer that elects LIFO under ASC 330 — and is bound by the IRC §472 book-tax conformity rule — **cannot** carry LIFO into an IFRS basis; it must recast inventory on a FIFO or weighted-average basis. **There is no LIFO reserve, no LIFO liquidation effect, and no LIFO-conformity issue under IFRS.** (See Part V §5.3 for the variance-panel consequence.) **[FLAG CLEARLY for IFRS tenants.]**

**Consistency (IAS 2.25–26).** An entity shall use the **same cost formula for all inventories having a similar nature and use** to the entity. For inventories with a different nature or use, different cost formulas may be justified ([IFRS Foundation — IAS 2 paragraphs 25–26](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). A geographical difference in location, by itself, is not sufficient to justify the use of different cost formulas.

**Sub-segment applicability.**

| Cost formula | D | P | H | J | E |
|---|---|---|---|---|---|
| Specific identification (required, non-interchangeable) | ◑ | — | ◑ | ✓ | ✓ |
| FIFO | ✓ | ✓ | ✓ | ◑ | ◑ |
| Weighted-average | ✓ | ✓ | ✓ | ◑ | ◑ |
| LIFO | — | — | — | — | — |

LIFO is **— (not applicable)** for every IFRS sub-segment because IAS 2 prohibits it outright. Specific identification is required for non-interchangeable **J / E** custom output and is fact-dependent for serialised **D / H** units (◑); it is rare for fungible bulk **P** product (—). FIFO and weighted-average dominate fungible D / P / H stock.

---

## 1.4 Net Realisable Value (NRV)

**The standard (IAS 2.9, 6, 28–33).** Inventories shall be measured at the **lower of cost AND net realisable value** (IAS 2.9) ([IFRS Foundation — IAS 2 paragraph 9](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). **Net realisable value** is defined as **the estimated selling price in the ordinary course of business less the estimated costs of completion and the estimated costs necessary to make the sale** (IAS 2.6) ([IFRS Foundation — IAS 2 paragraph 6](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). NRV is an **entity-specific** value and may **not** equal fair value less costs to sell (which is not entity-specific) ([IFRS Foundation — IAS 2 paragraph 7](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html); [Deloitte IAS Plus — *iGAAP in Focus*, NRV entity-specific](https://iasplus.com/content/f2d8d9b4-fd01-4665-97bd-8dc20a872f0c)).

**Costs necessary to make the sale.** Unlike some other IFRS standards, IAS 2 does **not** limit the deduction to *incremental* selling costs; an entity includes **all costs necessary to make the sale** in the ordinary course of business, using judgement on which costs are necessary given the nature of the inventories ([IFRS Foundation — IFRS Interpretations Committee staff paper, *IAS 2 — costs necessary to sell inventories*](https://www.ifrs.org/content/dam/ifrs/meetings/2021/february/ifric/ap03-ias2-costs-necessary-to-sell-inventories.pdf)). **[JUDGMENT AREA.]**

**Item-by-item or group basis (IAS 2.29).** NRV is generally assessed **item by item**. Items may be **grouped** where they relate to the same product line, have similar purposes or end uses, are produced and marketed in the same geographical area, and cannot be practicably evaluated separately. It is **not** appropriate to write inventories down on the basis of a whole classification (e.g., all finished goods) ([IFRS Foundation — IAS 2 paragraph 29](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)).

**Write-down recognised as expense (IAS 2.34).** The amount of any write-down of inventories to NRV and **all losses of inventories** are recognised as an **expense in the period the write-down or loss occurs** ([IFRS Foundation — IAS 2 paragraph 34 / summary](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/)).

**Manufacturing application / NRV triggers.** NRV may fall below cost for many reasons relevant to manufacturers: a fall in selling prices, product obsolescence, physical damage, an increase in estimated costs to complete WIP, or — topically — an **inability to pass cost increases (e.g., new or increased tariffs) through to customers** ([Deloitte IAS Plus — *iGAAP in Focus*, tariff-driven NRV write-downs](https://iasplus.com/content/f2d8d9b4-fd01-4665-97bd-8dc20a872f0c)). Raw materials are **not** written down below cost if the finished products in which they will be incorporated are expected to be sold at or above cost (IAS 2.32).

**U.S. GAAP divergence (measurement base).** ASC 330 (post-ASU 2015-11) measures most inventory at the **lower of cost or NRV** — the same NRV ceiling as IAS 2 — but ASC 330 retains **lower of cost or market** for LIFO and retail-method inventory, whereas IAS 2 uniformly applies **lower of cost and NRV** (`Manufacturing_Disclosures_Sources.md` §1.2). The decisive divergence is **reversal** (§1.5), not the measurement base.

**Sub-segment applicability.**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

All hold the lower-of-cost-and-NRV test on IAS 2 inventory. **J / E** are partial (◑) because much of their production sits in IFRS 15 contract assets (tested for impairment under IFRS 15, not NRV under IAS 2); residual job-shop materials and finished stock remain within IAS 2 NRV. Obsolescence-driven write-downs bite hardest where product life cycles are short — **Discrete (D)** electronics and **Hybrid (H)** consumer goods.

---

## 1.5 REVERSAL of Write-Downs (IAS 2.33–34) — BINDING DIVERGENCE from ASC 330

**The standard (IAS 2.33).** A new assessment of NRV is made in **each subsequent period**. **When the circumstances that previously caused inventories to be written down below cost no longer exist, or when there is clear evidence of an increase in NRV because of changed economic circumstances, the amount of the write-down is REVERSED** (i.e., the reversal is limited to the amount of the original write-down) so that the **new carrying amount is the lower of cost and the revised net realisable value** ([IFRS Foundation — IAS 2 paragraph 33](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html); [Deloitte IAS Plus — *iGAAP in Focus*, IAS 2 requires disclosure of reversals of previous write-downs](https://iasplus.com/content/f2d8d9b4-fd01-4665-97bd-8dc20a872f0c)).

**Recognition (IAS 2.34).** The amount of any **reversal** of a write-down, arising from an increase in NRV, is recognised as a **reduction in the amount of inventories recognised as expense** (i.e., a reduction of cost of sales) in the period in which the reversal occurs ([IFRS Foundation — IAS 2 paragraph 34](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)).

**Limit (the ceiling).** The reversal is **capped at the amount of the original write-down**: the carrying amount after reversal cannot exceed what cost would have been. Inventory can be restored **up to original cost but never above it** ([IFRS Foundation — IAS 2 paragraph 33](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)).

\[ \text{Carrying amount after reversal} = \min\big(\text{original cost},\ \text{revised NRV}\big) \]

**This is the second binding IAS 2 divergence from ASC 330.** Under **ASC 330 (U.S. GAAP)**, a write-down to NRV (or market) establishes a **new cost basis** that is **not subsequently reversed** even if NRV recovers (`Manufacturing_Disclosures_Sources.md` §1.6; ASC 330-10-35) ([KPMG — *Inventory: IFRS vs US GAAP*, IFRS requires reversal; US GAAP prohibits reversal](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)). The practical effect: under IFRS, a manufacturer that wrote down commodity-linked raw materials or obsolescing finished goods when prices fell **must write them back up** (to the lower of cost and recovered NRV) when prices recover; a U.S. GAAP manufacturer **cannot**. **[FLAG CLEARLY for IFRS tenants.]**

**Manufacturing example.** A Process (P) chemicals manufacturer writes down a base-stock raw material by \( 4{,}000{,}000 \) when its NRV falls below cost in Q1. In Q3 the input price recovers and revised NRV exceeds the written-down value by \( 5{,}000{,}000 \). Under IFRS the entity reverses **only \( 4{,}000{,}000 \)** (capped at the original write-down) as a reduction of cost of sales; the carrying amount returns to original cost, never above it. Under U.S. GAAP no reversal is recognised.

**Sub-segment applicability.**

| D | P | H | J | E |
|---|---|---|---|---|
| ◑ | ✓ | ◑ | — | — |

Reversal is most consequential where NRV swings with **commodity / input prices** — **Process (P)** bulk materials. **Discrete (D)** and **Hybrid (H)** are partial (◑): technological obsolescence write-downs rarely reverse, but price-driven raw-material write-downs can. **Job-Shop (J)** and **ETO (E)** are **— (rare)**: custom output written down for specific-project losses seldom recovers because the underlying contract economics are fixed.

---

## 1.6 Disclosure Requirements (IAS 2.36)

**The standard.** The financial statements shall disclose (IAS 2.36) ([IFRS Foundation — IAS 2 disclosure paragraph 36](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-2-inventories.pdf)):

1. **(a)** the **accounting policies** adopted in measuring inventories, **including the cost formula used** (FIFO, weighted-average, or specific identification);
2. **(b)** the **total carrying amount** of inventories and the carrying amount **in classifications appropriate to the entity** (e.g., merchandise, production supplies, raw materials, work-in-process, finished goods);
3. **(c)** the carrying amount of inventories carried at **fair value less costs to sell** (where applicable, e.g., commodity broker-trader stock);
4. **(d)** the **amount of inventories recognised as an expense** during the period (typically cost of sales);
5. **(e)** the **amount of any write-down** of inventories recognised as an expense in the period (per paragraph 34);
6. **(f)** the **amount of any reversal of any write-down** recognised as a reduction in inventory expense in the period (per paragraph 34);
7. **(g)** the **circumstances or events that led to the reversal** of a write-down of inventories;
8. **(h)** the carrying amount of inventories **pledged as security** for liabilities.

**U.S. GAAP divergence (disclosure quantum).** The IAS 2.36(f)–(g) **reversal disclosures have no ASC 330 analogue** (because ASC 330 prohibits reversal), and IAS 2 has **no LIFO-reserve / LIFO-liquidation disclosures** (because LIFO is prohibited). Conversely, an IFRS tenant's disclosure package **adds** a write-down-reversal line with the causing circumstances and **suppresses** all LIFO notes relative to a U.S. GAAP package (`Manufacturing_Disclosures_Sources.md` §4.1).

**Sub-segment applicability.**

| Disclosure | D | P | H | J | E |
|---|---|---|---|---|---|
| Cost-formula policy (36(a)) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Carrying amount by class (36(b)) | ✓ | ✓ | ✓ | ✓ | ◑ |
| Expense recognised (36(d)) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Write-down amount (36(e)) | ✓ | ✓ | ✓ | ◑ | ◑ |
| Reversal amount + circumstances (36(f)–(g)) | ◑ | ✓ | ◑ | — | — |
| Inventories pledged as security (36(h)) | ✓ | ✓ | ✓ | ◑ | ◑ |

The reversal-disclosure rows track §1.5 applicability. The classification disclosure is partial (◑) for **E** because contract assets are presented under IFRS 15, not as IAS 2 classes.

---

## 1.7 Manufacturing-Specific IAS 2 Application

**Standard costs (IAS 2.21).** Techniques for the measurement of the cost of inventories — the **standard cost method** or the **retail method** — may be used for convenience **if the results approximate cost**. Standard costs take into account normal levels of materials and supplies, labour, efficiency, and capacity utilisation; they are **regularly reviewed and, if necessary, revised** in the light of current conditions ([IFRS Foundation — IAS 2 paragraph 21](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html)). This is the IAS 2 hook for the Advisacor variance panel: **standards-based inventory measurement is permitted only insofar as standard cost approximates actual cost** — material variances must be allocated back so that inventory is not stated at a standard that diverges from actual.

**Variances in inventory valuation. [JUDGMENT AREA].** Because IAS 2.21 requires standard cost to approximate actual cost, **significant variances** (e.g., a large unfavourable material-price or fixed-overhead volume variance) must be **apportioned** between inventory (on hand) and cost of sales (sold), rather than expensed entirely, so the ending inventory reflects approximate actual cost. **Abnormal** variances (abnormal waste, idle-capacity unabsorbed fixed overhead) are expensed under IAS 2.16 / 2.13 and **not** capitalised. This connects the **standard-cost basis option** (resolved Q2) to IAS 2: the variance evaluator's standards are the same inputs IAS 2.21 contemplates.

**Joint products and by-products (IAS 2.14).** When a production process yields more than one product simultaneously (joint products, or a main product and a by-product) and the conversion costs of each are **not separately identifiable**, they are allocated between the products **on a rational and consistent basis** — for example, on the relative sales value of each product at the point they become separately identifiable or at completion. **By-products** that are immaterial are often measured at NRV and that value deducted from the cost of the main product ([IFRS Foundation — IAS 2 paragraph 14](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-2-inventories.pdf)). This is highly relevant to **Process (P)** manufacturers — refining, chemicals, food processing, pulp & paper — where joint-product split-off is routine.

**Service-provider inventories (IAS 2.8 / 2.19).** To the extent service providers have inventories, they measure them at the **costs of their production**, consisting primarily of the **labour and other costs of personnel directly engaged in providing the service, including supervisory personnel, and attributable overheads**; labour and other costs relating to sales and general administrative personnel are **not** included but recognised as expenses ([IFRS Foundation — IAS 2 service-provider inventory, IASB/FASB observer note quoting IAS 2.19](https://www.ifrs.org/content/dam/ifrs/meetings/2010/march/joint-iasb-fasb-with-efrag/rr-0310-ap7c-obs.pdf)). Relevant for **Hybrid (H)** and **Job-Shop (J)** manufacturers that bundle services (installation, MRO, field service) with product.

**Sub-segment applicability.**

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Standard-cost measurement (2.21) | ✓ | ✓ | ✓ | ◑ | ◑ |
| Variance apportionment to inventory | ✓ | ✓ | ✓ | ◑ | ◑ |
| Joint products / by-products (2.14) | — | ✓ | ◑ | — | — |
| Service-provider inventory (2.19) | — | — | ◑ | ✓ | ◑ |

Joint-product allocation is a **Process (P)** signature topic (✓), fact-dependent for **Hybrid (H)** (◑), and not applicable for discrete-assembly D / J / E (—). Service-provider inventory is most relevant for service-bundling **J** and **H**.

---

# PART II — IAS 16 PROPERTY, PLANT AND EQUIPMENT (Manufacturing)

---

## 2.1 Scope and Recognition

**The standard.** IAS 16 *Property, Plant and Equipment* establishes principles for recognising PP&E as assets, measuring their carrying amounts, and measuring the depreciation charges and impairment losses to be recognised. **Property, plant and equipment** are tangible items that (a) are **held for use in the production or supply of goods or services, for rental to others, or for administrative purposes**; and (b) are **expected to be used during more than one period** ([IFRS Foundation — IAS 16 summary](https://www.ifrs.org/issued-standards/list-of-standards/ias-16-property-plant-and-equipment/)).

**Recognition criteria.** The cost of an item of PP&E is recognised as an asset **if, and only if**: (a) it is **probable that future economic benefits** associated with the item will flow to the entity; and (b) the **cost of the item can be measured reliably** ([IFRS Foundation — IAS 16 summary / recognition](https://www.ifrs.org/issued-standards/list-of-standards/ias-16-property-plant-and-equipment/)).

**Manufacturing PP&E categories.** For a manufacturer, IAS 16 governs **land**; **buildings** (plant, warehouse, distribution centre); **machinery and equipment** (CNC machines, robotics, conveyors, presses, furnaces, reactors, packaging lines); **tooling, dies, jigs, and fixtures** that meet the more-than-one-period test; **vehicles and material-handling equipment**; and **office and IT equipment**. The classification of a given item drives its depreciation, componentization, and (if elected) revaluation.

**Sub-segment applicability.**

| Category | D | P | H | J | E |
|---|---|---|---|---|---|
| Land & buildings (plant) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Heavy / continuous-process machinery | ◑ | ✓ | ◑ | ◑ | ✓ |
| Discrete machine tools (CNC, robotics) | ✓ | ◑ | ✓ | ✓ | ◑ |
| Specialised tooling / dies / fixtures | ✓ | ◑ | ✓ | ✓ | ✓ |

Capital intensity skews to **Process (P)** (reactors, furnaces, continuous lines) and **ETO (E)** (large fabrication equipment), with discrete machine tools dominating **D / H / J**.

---

## 2.2 Initial Measurement at Cost

**The standard (IAS 16.15–16).** An item of PP&E that qualifies for recognition is **initially measured at its cost**. Cost comprises ([IFRS Foundation — IAS 16 summary / cost components](https://www.ifrs.org/issued-standards/list-of-standards/ias-16-property-plant-and-equipment/)):

- **(a)** its **purchase price**, including **import duties and non-refundable purchase taxes**, **after deducting trade discounts and rebates**;
- **(b)** any costs **directly attributable** to bringing the asset to the location and condition necessary for it to be capable of operating in the manner intended by management; and
- **(c)** the **initial estimate of the costs of dismantling and removing the item and restoring the site** on which it is located (a decommissioning / restoration obligation under IAS 37), unless those costs relate to inventories produced during the period.

**Directly attributable costs (IAS 16.17).** These include **site preparation; initial delivery and handling; installation and assembly; professional fees; and the cost of testing** whether the asset functions properly (net of the proceeds from selling any items produced while bringing the asset to that condition — post-2020 amendment) ([Deloitte IAS Plus — IAS 16 summary](https://www.iasplus.com/en/standards/ias/ias16)).

**Borrowing costs (IAS 23).** Borrowing costs directly attributable to the acquisition, construction, or production of a **qualifying asset** — including **manufacturing plants and power-generation facilities under construction** — are **capitalised** as part of the asset's cost during the construction period ([IFRS Foundation — IAS 23 paragraphs 7–8, qualifying assets include manufacturing plants and power-generation facilities](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ias23.html)). Capitalisation is suspended during extended interruptions of active development and ceases when the asset is substantially ready ([KPMG — *Borrowing costs*](https://kpmg.com/us/en/articles/2023/borrowing-costs.html)).

**Self-constructed assets (IAS 16.22).** The cost of a self-constructed asset is determined using the same principles as for an acquired asset: **materials, direct labour, and a systematic allocation of production overhead**. **No internal profit is recognised**, and the costs of **abnormal amounts of wasted material, labour, or other resources** are **not** included in the cost of the asset ([IFRS Foundation — IAS 16, self-constructed assets](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)). This matters for **ETO (E)** and **Job-Shop (J)** manufacturers that build their own production rigs and fixtures.

**Sub-segment applicability.**

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Decommissioning / restoration in cost (16.16(c)) | ◑ | ✓ | ◑ | — | ◑ |
| Borrowing-cost capitalisation in construction (IAS 23) | ◑ | ✓ | ◑ | ◑ | ✓ |
| Self-constructed-asset cost (16.22) | ◑ | ✓ | ◑ | ✓ | ✓ |

Decommissioning/restoration obligations are most common for **Process (P)** (chemical plants, refineries, environmental remediation). Borrowing-cost capitalisation and self-construction skew to **P** and **E** (long construction periods, in-house rig building).

---

## 2.3 COMPONENTIZATION (IAS 16.43–49) — BINDING DIVERGENCE from U.S. GAAP Practice

**The standard (IAS 16.43–44).** **Each part of an item of PP&E with a cost that is significant in relation to the total cost of the item shall be depreciated separately.** An entity allocates the amount initially recognised in respect of an item to its significant parts and **depreciates each such part separately**. Significant parts with the **same useful life and depreciation method** may be **grouped** in determining the depreciation charge ([IFRS Foundation — IAS 16 paragraphs 43–44, component depreciation](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf); [Deloitte IAS Plus — IFRS asset componentization, separate components depreciated over respective useful lives](https://iasplus.com/content/e9c03b91-02b0-4cd9-a970-048588494e0c)).

**IAS 16 REQUIRES the component approach** — it is not optional. Significant components are identified, allocated a portion of the total cost, and depreciated over their **own** useful lives; **group depreciation methods are not permitted** ([Deloitte IAS Plus — group depreciation not permitted under IFRS; gains/losses on retirement recognised in earnings](https://iasplus.com/content/e9c03b91-02b0-4cd9-a970-048588494e0c)).

**Manufacturing example.** A **CNC machining centre** is capitalised at \( 250{,}000 \): a \( 200{,}000 \) main structure with a 20-year useful life and a \( 50{,}000 \) CNC control / electronics system with a 5-year useful life. Under IAS 16 the control system is a **separate component depreciated over 5 years**:

\[ \text{Annual depreciation} = \frac{200{,}000}{20} + \frac{50{,}000}{5} = 10{,}000 + 10{,}000 = 20{,}000 \]

versus a single composite life that a U.S. manufacturer might apply: \( 250{,}000 / 20 = 12{,}500 \) per year. At the end of the control system's 5-year life, its **replacement is capitalised** (it is a new component), and the carrying amount of the replaced component is **derecognised** — not expensed as a repair ([PwC — *Financial reporting in the power and utilities industry*, replacement part capitalised and replaced component derecognised](https://www.pwc.com/id/en/publications/assets/utilities-ifrs.pdf)).

**Major inspections and overhauls (IAS 16.14).** When a major inspection or overhaul is a condition of continuing to operate an item (e.g., a **scheduled aircraft-engine overhaul** or a **furnace relining** in steel/glass manufacturing), the cost is **recognised as a separate component** in the carrying amount of the asset (and the carrying amount of the previous inspection is derecognised), then depreciated over the period to the next inspection — rather than expensed as incurred ([KPMG — Ind AS 16 / IAS 16, planned major maintenance recognised as a separate component](https://assets.kpmg.com/content/dam/kpmgsites/in/pdf/2020/02/chapter-04-tangibles-intangibles-assets-ind-as-implementation-guide.pdf); [Deloitte IAS Plus — assets related to planned major maintenance identified as separate components](https://iasplus.com/content/e9c03b91-02b0-4cd9-a970-048588494e0c)).

**U.S. GAAP divergence.** **U.S. GAAP permits component depreciation but does not require it.** Many U.S. manufacturers depreciate a whole machine or building over a **single composite life**, and group/composite depreciation methods (common in power & utilities) are acceptable under U.S. GAAP but **not** under IAS 16 ([Deloitte IAS Plus — group depreciation common under US GAAP not permitted under IFRS](https://iasplus.com/content/e9c03b91-02b0-4cd9-a970-048588494e0c)). **This is a material divergence for manufacturers with major industrial equipment**: in any given period, IFRS componentization typically produces **higher early-life depreciation** (short-life components depreciate faster) and a different capital-vs-repair split on overhauls, which **flows into the standard fixed-overhead rate** used by the variance panel (Part V §5.3). **[FLAG CLEARLY for IFRS tenants.]**

**Sub-segment applicability.**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ◑ | ◑ | ✓ |

Componentization bites hardest where equipment is **large and multi-part with differing component lives** — **Discrete (D)** machine tools (structure vs control vs spindle), **Process (P)** plant (vessel vs catalyst vs instrumentation; furnace relining), and **ETO (E)** heavy equipment. **Hybrid (H)** and **Job-Shop (J)** are partial (◑): consequential for major lines, immaterial for small/short-lived tooling.

---

## 2.4 Subsequent Measurement — Cost Model vs Revaluation Model

**The standard (IAS 16.29).** After recognition, an entity chooses **either the cost model or the revaluation model** as its accounting policy and applies that policy to an **entire class** of PP&E ([IFRS Foundation — IAS 16, revaluation applied to entire class](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)).

**Cost model (IAS 16.30).** The item is carried at its **cost less any accumulated depreciation and any accumulated impairment losses** ([IFRS Foundation — IAS 16 cost model](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)).

**Revaluation model (IAS 16.31, 34, 39–40).** An item whose **fair value can be measured reliably** is carried at a **revalued amount** — its fair value at the date of revaluation, less subsequent accumulated depreciation and subsequent accumulated impairment losses. **Revaluations are made with sufficient regularity** to ensure the carrying amount does not differ materially from fair value at the reporting date. If an item is revalued, the **entire class** to which it belongs is revalued ([IFRS Foundation — IAS 16 revaluation model](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)). Revaluation movements:

- An **increase** is recognised in **other comprehensive income (OCI)** and accumulated in equity as a **revaluation surplus** (unless it reverses a decrease of the same asset previously recognised in profit or loss, to that extent recognised in P&L);
- A **decrease** is recognised in **profit or loss** (unless a credit balance exists in the revaluation surplus for that asset, to that extent recognised in OCI);
- Depreciation is based on the **revalued carrying amount**, typically producing a **higher depreciable basis and higher depreciation expense**; the revaluation surplus is **not recycled** to P&L on derecognition ([Deloitte IAS Plus — revaluation model: changes to equity/OCI, higher depreciable basis, surplus not recycled](https://iasplus.com/content/e9c03b91-02b0-4cd9-a970-048588494e0c)).

**Manufacturing reporting consequence.** The revaluation model can present a **higher asset base** when industrial property (land, plant) has appreciated, improving reported equity and gearing ratios — but it imposes recurring fair-value measurement cost and higher depreciation. In practice, **few manufacturers** elect the revaluation model even when IFRS-reporting, because of the complexity and recurring valuation burden; the cost model dominates ([Deloitte IAS Plus — revaluation model not widely used under IFRS](https://iasplus.com/content/e9c03b91-02b0-4cd9-a970-048588494e0c)).

**U.S. GAAP divergence.** **U.S. GAAP does NOT permit revaluation of PP&E** to fair value (other than acquisition accounting under ASC 805 and certain industry-specific guidance); the **historical-cost model is required** ([Deloitte IAS Plus — historical cost is the required model under US GAAP; revaluation is an IFRS option](https://iasplus.com/content/e9c03b91-02b0-4cd9-a970-048588494e0c)). **This is a binding divergence**: an IFRS tenant that elects revaluation will report a PP&E base and depreciation expense that a U.S. GAAP tenant cannot replicate. **[FLAG CLEARLY for IFRS tenants electing revaluation.]**

**Sub-segment applicability (revaluation election).**

| D | P | H | J | E |
|---|---|---|---|---|
| ◑ | ◑ | ◑ | — | ◑ |

The revaluation model is a **policy choice**, so all asset-holding sub-segments could in principle elect it (◑), but it is **rare for small-asset Job-Shop (J)** (—) and uncommon generally; it is most plausibly seen where appreciated **land and buildings** dominate the asset base.

---

## 2.5 Depreciation

**The standard (IAS 16.50, 60–62).** The **depreciable amount** (cost or revalued amount, less residual value) is **allocated on a systematic basis over the asset's useful life**. The depreciation **method reflects the pattern in which the asset's future economic benefits are expected to be consumed**; acceptable methods include **straight-line, diminishing (reducing) balance, and units of production** ([IFRS Foundation — IAS 16, depreciable amount and methods](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)).

**Revenue-based depreciation prohibited (IAS 16.62A).** In May 2014 the IASB amended IAS 16 to **prohibit the use of a revenue-based depreciation method** ([IFRS Foundation — IAS 16 summary, revenue-based depreciation prohibited](https://www.ifrs.org/issued-standards/list-of-standards/ias-16-property-plant-and-equipment/)).

**Annual review (IAS 16.51 / 16.61).** The **residual value and useful life** of an asset are **reviewed at least at each financial year-end**, and the **depreciation method** is reviewed at least annually; changes are accounted for **prospectively as a change in accounting estimate** under IAS 8 ([IFRS Foundation — IAS 16 paragraph 51, annual review of useful life and residual value](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)).

**Depreciation start / land (IAS 16.55, 58).** **Depreciation begins when the asset is available for use** — i.e., when it is in the location and condition necessary to operate in the manner intended by management — **not** when it is actually brought into use, and continues until derecognition (it does not cease merely because the asset becomes idle). **Land has an unlimited useful life and is not depreciated** ([IFRS Foundation — IAS 16, depreciation begins when available for use; land not depreciated](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)).

**U.S. GAAP note.** Depreciation method choices are broadly consistent with U.S. GAAP; the IFRS-specific items are the **mandatory annual review** of residual value / useful life / method (U.S. GAAP requires review only when events indicate a change) and the interaction with **componentization** (§2.3), which changes the depreciation amount even where the method label is identical.

**Sub-segment applicability.**

| Method | D | P | H | J | E |
|---|---|---|---|---|---|
| Straight-line | ✓ | ✓ | ✓ | ✓ | ✓ |
| Units of production | ◑ | ✓ | ◑ | ◑ | ◑ |
| Diminishing balance | ◑ | ◑ | ◑ | ◑ | ◑ |

Units-of-production fits **Process (P)** continuous output and usage-driven D/H/J/E equipment (◑). Straight-line is the universal default.

---

## 2.6 Impairment (IAS 36)

**The standard (IAS 36.8–9, 18).** At each reporting date an entity assesses whether there is any **indication** that an asset may be impaired; if so (and annually for certain assets), it estimates the asset's **recoverable amount**. An **impairment loss** is the amount by which the carrying amount of an asset or cash-generating unit (CGU) **exceeds its recoverable amount**, recognised immediately in profit or loss (or in OCI for a revalued asset) ([IFRS Foundation — IAS 36 *Impairment of Assets*, recoverable amount and impairment loss](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2026/issued/ias36.html)).

**Recoverable amount (IAS 36.18).** Recoverable amount is the **higher of (a) fair value less costs of disposal AND (b) value in use** ([IFRS Foundation — IAS 36 summary, recoverable amount = higher of FVLCD and VIU](https://www.ifrs.org/issued-standards/list-of-standards/ias-36-impairment-of-assets/)). **Value in use** is the present value of the future cash flows expected to be derived from the asset (or CGU) in its current condition, discounted at an appropriate pre-tax rate ([IFRS Foundation — IAS 36, value in use](https://www.ifrs.org/issued-standards/list-of-standards/ias-36-impairment-of-assets/)).

**Cash-generating unit (IAS 36.66).** Where the recoverable amount of an individual asset cannot be determined, it is determined for the **smallest group of assets that generates largely independent cash inflows — the CGU** ([IFRS Foundation — IAS 36, CGU concept](https://www.ifrs.org/issued-standards/list-of-standards/ias-36-impairment-of-assets/)). The CGU is the closest IFRS analogue to the U.S. GAAP **"asset group"** under ASC 360, but the indicators, the measurement (IFRS uses recoverable amount as higher of FVLCD and value in use; ASC 360 uses an undiscounted-cash-flow recoverability test followed by a fair-value write-down), and — decisively — the **reversal rules differ materially**.

**REVERSAL of impairment losses (IAS 36.110–125) PERMITTED — BINDING DIVERGENCE from U.S. GAAP.** At each reporting date an entity assesses whether there is any indication that an impairment loss recognised in **prior periods** for an asset (other than goodwill) **may no longer exist or may have decreased**; if so, it estimates the recoverable amount. **When the circumstances that caused the impairment are favourably resolved, the impairment loss is REVERSED** immediately in profit or loss (or in OCI for a revalued asset). On reversal, the carrying amount is increased to the recoverable amount, **but not above the carrying amount (net of depreciation) that would have been determined had no impairment loss been recognised** in prior periods; depreciation is adjusted prospectively. **An impairment loss for goodwill is never reversed** ([IFRS Foundation — IAS 36, reversal of impairment for non-goodwill assets; goodwill never reversed](https://www.ifrs.org/issued-standards/list-of-standards/ias-36-impairment-of-assets/); [Grant Thornton — *IAS 36: Reversing impairment losses*, indicators and CGU pro-rata ceiling](https://www.grantthornton.global/en/insights/articles/IFRS-ias-36/ifrs-Reversing-impairment-losses/)).

\[ \text{Carrying amount after reversal} \le \min\big(\text{recoverable amount},\ \text{depreciated cost had no impairment occurred}\big) \]

Under **U.S. GAAP, ASC 360 PROHIBITS reversal** of an impairment loss for a long-lived asset that is **held and used** — once written down, the reduced carrying amount is the new cost basis. **This is a binding divergence** with direct manufacturing consequence: an IFRS manufacturer that impaired a plant or production line during a demand trough **must reverse** the impairment (up to the depreciated-cost ceiling) when conditions recover; a U.S. GAAP manufacturer **cannot**. **[FLAG CLEARLY for IFRS tenants.]**

**Manufacturing application.** Common impairment triggers for manufacturers: **plant closure or idling**, **technological obsolescence** of a production line, **structural demand decline** in a product market, adverse changes in input or output prices, and physical damage. Reversal indicators include observable increases in the asset's value and favourable changes in the technological, market, economic, or legal environment ([Grant Thornton — *IAS 36: Reversing impairment losses*, external indicators](https://www.grantthornton.global/en/insights/articles/IFRS-ias-36/ifrs-Reversing-impairment-losses/)).

**Sub-segment applicability.**

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Impairment indicator review (36.9) | ✓ | ✓ | ✓ | ✓ | ✓ |
| CGU identification (36.66) | ✓ | ✓ | ✓ | ◑ | ◑ |
| Impairment reversal (36.114) | ◑ | ✓ | ◑ | ◑ | ◑ |

CGU identification is cleaner where lines/plants generate independent cash flows (D / P / H); for **J / E**, cash flows are often **contract-level** (◑). Reversal is most consequential for **Process (P)** plant impaired in cyclical troughs that later recover (✓).

---

## 2.7 Derecognition

**The standard (IAS 16.67–71).** The carrying amount of an item of PP&E is **derecognised on disposal**, or **when no future economic benefits are expected** from its use or disposal. The **gain or loss** arising from derecognition is included in **profit or loss** (gains are not classified as revenue) and is the difference between the net disposal proceeds and the carrying amount ([IFRS Foundation — IAS 16, derecognition and gain/loss in P&L](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)). On replacement of a component, the carrying amount of the **replaced component is derecognised** (§2.3).

**Sub-segment applicability.** Applies uniformly:

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 2.8 IAS 16 Disclosures (IAS 16.73–79)

**The standard.** For each class of PP&E the financial statements disclose ([IFRS Foundation — IAS 16 disclosure, paragraphs 73–79](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)):

1. the **measurement bases** used (cost or revaluation);
2. the **depreciation methods** used;
3. the **useful lives or depreciation rates** used;
4. the **gross carrying amount and accumulated depreciation** (with accumulated impairment) at the **beginning and end** of the period;
5. a **reconciliation of the carrying amount** at the beginning and end of the period showing **additions; disposals; acquisitions through business combinations; revaluation increases/decreases; impairment losses recognised and reversed; depreciation; and net exchange differences**;
6. the **existence and amounts of restrictions on title**, and PP&E **pledged as security** for liabilities;
7. the amount of **contractual commitments** for the acquisition of PP&E;
8. for the **revaluation model**: the **effective date of the revaluation**, whether an **independent valuer** was involved, and the **revaluation surplus** with its movement during the period.

**Sub-segment applicability.**

| Disclosure | D | P | H | J | E |
|---|---|---|---|---|---|
| Carrying-amount reconciliation (73(e)) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Impairment recognised / reversed in reconciliation | ◑ | ✓ | ◑ | ◑ | ◑ |
| Restrictions on title / pledged as security | ✓ | ✓ | ✓ | ◑ | ◑ |
| Acquisition commitments | ◑ | ✓ | ◑ | ◑ | ✓ |
| Revaluation-model disclosures (77) | ◑ | ◑ | ◑ | — | ◑ |

The revaluation-disclosure row tracks §2.4 election (rare for J). Acquisition-commitment disclosures are most material for capital-intensive **P** and **E** with large capex programmes.

---

## 2.9 Manufacturing-Specific IAS 16 Application

**Spare parts and servicing equipment (IAS 16.8).** Items such as **spare parts, stand-by equipment, and servicing equipment** are recognised as **PP&E when they meet the definition** of PP&E (held for use over more than one period); **otherwise they are classified as inventory** under IAS 2 ([IFRS Foundation — IAS 16 paragraph 8, spare parts as PP&E or inventory](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)). **Critical / insurance spares** for a specific machine that will be used over more than one period are PP&E; **consumable** spares are IAS 2 inventory.

**Tooling. [JUDGMENT AREA].** **Specialised, long-lived tooling, dies, and fixtures** that meet the more-than-one-period test are PP&E (depreciated, often componentised with the host machine); **generic, short-lived, or consumable tooling** is inventory. Customer-funded production tooling may instead be a **contract cost under IFRS 15** — cross-reference `Manufacturing_ASC606_Sources.md` on pre-production / tooling costs and the IFRS 15 contract-cost analogue (Part III §3.3).

**Idle / decommissioned plant (IAS 16.55).** An item **continues to be depreciated** while idle (depreciation does not cease merely because the asset is not in use), **unless** it is depreciated using a units-of-production method (zero production yields zero depreciation), **or unless** it is classified as **held for sale under IFRS 5**, in which case it is measured at the lower of carrying amount and fair value less costs to sell and **no longer depreciated** ([IFRS Foundation — IAS 16, depreciation does not cease when idle](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf)). Idle-plant carrying-cost treatment connects to the IAS 2.13 / fixed-overhead-volume-variance analysis (Part I §1.2; Part V §5.3).

**Sub-segment applicability.**

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Critical spares as PP&E (16.8) | ◑ | ✓ | ◑ | ◑ | ✓ |
| Specialised tooling as PP&E | ✓ | ◑ | ✓ | ✓ | ✓ |
| Idle / held-for-sale plant (IFRS 5) | ◑ | ✓ | ◑ | ◑ | ◑ |

Critical/insurance spares are a **Process (P)** and **ETO (E)** signature (long-lead, single-machine spares). Specialised tooling capitalisation is universal to discrete/assembly D / H / J / E.

---

# PART III — IFRS 15 REVENUE FROM CONTRACTS WITH CUSTOMERS (Manufacturing)

This part is a **focused complement** to `Manufacturing_ASC606_Sources.md`, whose **Section 13** already catalogues the IFRS 15 divergences and whose Sections 1–12 set out the full five-step model. **The full five-step model is not repeated verbatim here.** This part confirms convergence, deepens the manufacturing-relevant divergences, and states the IFRS 15 disclosure posture for IFRS tenants.

---

## 3.1 Standard Overview and Convergence

**The standard.** IFRS 15 *Revenue from Contracts with Customers* applies the **same five-step model** and the same converged core principle as ASC 606: an entity recognises revenue to depict the transfer of promised goods or services to customers in an amount that reflects the consideration to which the entity expects to be entitled in exchange ([IFRS Foundation — IFRS 15](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/)). The five steps — (1) identify the contract; (2) identify the performance obligations; (3) determine the transaction price; (4) allocate the transaction price; (5) recognise revenue as/when performance obligations are satisfied — are **converged** with ASC 606, and for most manufacturing transactions the outcome is **identical** ([IFRS Foundation — IFRS 15](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/); confirmed in `Manufacturing_ASC606_Sources.md` Section 13).

**Effective date.** IFRS 15 is effective for **annual reporting periods beginning on or after 1 January 2018** ([IFRS Foundation — IFRS 15, effective date](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/)).

**Convergence confirmation.** The following are **converged** (no material manufacturing divergence): the five-step architecture; the distinct-performance-obligation criteria; the three over-time recognition criteria (including "no alternative use plus an enforceable right to payment for performance to date"); input and output measures of progress, including cost-to-cost; the variable-consideration **constraint**; the contract-modification framework; assurance- vs service-type warranties; and contract-cost capitalisation criteria (apart from impairment reversal — §3.2) ([RSM US — *US GAAP vs IFRS: Revenue from Contracts with Customers*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/us-gaap-vs-ifrs-comparisons/wp_as_us_gaap_vs_ifrs_revenue_recognition.pdf); cross-reference `Manufacturing_ASC606_Sources.md` Section 13).

**Sub-segment applicability (recognition timing).**

| Recognition pattern | D | P | H | J | E |
|---|---|---|---|---|---|
| Point-in-time (standard MTS product) | ✓ | ✓ | ✓ | ◑ | — |
| Over-time (no-alternative-use + right to payment) | ◑ | ◑ | ◑ | ✓ | ✓ |

As under ASC 606, **MTS Discrete/Process/Hybrid** product is typically point-in-time on control transfer; **Job-Shop (J)** and **ETO (E)** custom contracts frequently meet an over-time criterion.

---

## 3.2 Manufacturing-Specific Divergences from ASC 606

A focused catalogue of the IFRS 15 ≠ ASC 606 differences that **matter to manufacturers** (all sourced to [RSM US — *US GAAP vs IFRS*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/us-gaap-vs-ifrs-comparisons/wp_as_us_gaap_vs_ifrs_revenue_recognition.pdf), cross-checked against [IFRS Foundation — IFRS 15](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/) and `Manufacturing_ASC606_Sources.md` Section 13):

| Topic | ASC 606 (U.S. GAAP) | IFRS 15 | Manufacturing impact |
|---|---|---|---|
| **Shipping and handling** | **Policy election** to treat post-control shipping/handling as a **fulfilment activity** (single PO with the goods) | **No such election** — substance analysis required; may need to identify a **separate performance obligation** | An IFRS manufacturer cannot default freight to fulfilment; must assess whether post-control shipping is a separate PO |
| **Sales / use / value-added taxes** | **Practical expedient** to **exclude all** sales and similar taxes from the transaction price (net presentation) | **No such election** — substance analysis (principal vs agent) **per jurisdiction / per tax** | More analysis per jurisdiction for IFRS filers; affects transaction-price measurement |
| **Non-cash consideration — measurement date** | Measured at fair value at **contract inception** | Measured at **fair value at the date received** (or earliest measurement); variable-consideration guidance applies regardless of the reason for variability | Affects measurement of customer-furnished materials / equity / barter in IFRS contracts |
| **Reversal of impairment on capitalised contract costs** | **Not permitted** | **Required** when conditions improve | An IFRS manufacturer may write capitalised contract (fulfilment / mobilisation) costs back up; a U.S. GAAP manufacturer cannot |
| **Collectibility threshold (Step 1)** | "**Probable**" = **likely to occur** (high threshold) | "**Probable**" = **more likely than not** (lower threshold) | A contract may pass Step 1 under IFRS while failing under U.S. GAAP for marginal-credit customers |
| **Disclosure quantum** | More **prescriptive**; scaled relief for **non-public** entities | Principles-based; **limited exemptions**; **all entities apply the core principle** | An IFRS manufacturer has fewer "private-company" disclosure carve-outs (§3.4) |

**Recent amendments.** For **IFRS 15**, the IASB completed its **post-implementation review without major amendments**; the standard is in a steady state as of June 2026 ([IFRS Foundation — IFRS 15 / PIR status](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/)). **[FLAG: VERIFY AT FILING DATE]** — confirm the latest IFRS-amendment status against the IFRS work plan ([ifrs.org](https://www.ifrs.org)) at the entity's reporting date; if a manufacturing-relevant amendment has been issued since this document's date it must be incorporated.

**Sub-segment applicability (divergence salience).**

| Divergence | D | P | H | J | E |
|---|---|---|---|---|---|
| Shipping & handling | ✓ | ✓ | ✓ | ◑ | ◑ |
| Sales / VAT taxes | ✓ | ✓ | ✓ | ✓ | ✓ |
| Non-cash consideration | ◑ | ◑ | ◑ | ◑ | ◑ |
| Contract-cost impairment reversal | ◑ | ◑ | ◑ | ✓ | ✓ |
| Collectibility threshold | ◑ | ◑ | ◑ | ◑ | ◑ |

Shipping/handling salience is highest for product shippers (D / P / H). Contract-cost impairment reversal is most salient for over-time **J / E** with capitalised mobilisation / fulfilment costs.

---

## 3.3 Industry-Specific Application Differences (Manufacturing)

**Long-term construction-type contracts (formerly IAS 11).** IFRS 15 **superseded IAS 11** *Construction Contracts*. Long-term, custom production contracts that were under IAS 11 are now assessed under the IFRS 15 **over-time** criteria; where the asset has **no alternative use** to the manufacturer and the manufacturer has an **enforceable right to payment for performance completed to date**, revenue is recognised **over time** — the same conclusion as ASC 606, but the enforceable-right-to-payment analysis is **jurisdiction-specific** (it turns on local contract law) ([IFRS Foundation — IFRS 15, over-time criteria](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/); cross-reference `Manufacturing_ASC606_Sources.md` over-time recognition). **[JUDGMENT AREA — legal review where enforceable-right-to-payment is determinative.]**

**Performance-obligation identification in production-line contracts (series guidance).** A series of distinct goods that are **substantially the same** and have the **same pattern of transfer** is treated as a **single performance obligation** ("series guidance"), with one measure of progress — relevant to repeat-unit production-line contracts under both standards; the application is converged ([IFRS Foundation — IFRS 15](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/)).

**Variable consideration constraint.** The constraint — recognise variable consideration **only to the extent it is highly probable that a significant reversal will not occur** — is converged with ASC 606, though **interpretation can vary by jurisdiction** in practice ([RSM US — *US GAAP vs IFRS*](https://rsmus.com/content/dam/rsm/insights/financial-reporting/us-gaap-vs-ifrs-comparisons/wp_as_us_gaap_vs_ifrs_revenue_recognition.pdf)).

**Significant financing component.** Both standards provide the **same one-year practical expedient** (an entity need not adjust for a significant financing component if, at contract inception, the period between transfer and payment is one year or less) ([IFRS Foundation — IFRS 15, significant financing component practical expedient](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/)).

**Sub-segment applicability.**

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Former-IAS 11 long-term contracts | ◑ | ◑ | ◑ | ✓ | ✓ |
| Series-guidance production lines | ✓ | ✓ | ✓ | ◑ | — |
| Variable-consideration constraint | ✓ | ✓ | ✓ | ✓ | ✓ |
| Significant-financing-component expedient | ◑ | ◑ | ◑ | ✓ | ✓ |

Former-IAS 11 long-term-contract treatment is the **J / E** signature; series guidance fits repeat-unit **D / P / H** lines.

---

## 3.4 Manufacturing IFRS 15 Disclosures (IFRS 15.110–129)

**The standard.** IFRS 15 requires disclosure of qualitative and quantitative information about contracts with customers, significant judgements, and contract-cost assets, including ([IFRS Foundation — IFRS 15, disclosure objective and requirements](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/)):

1. **Disaggregation of revenue** into categories depicting how the nature, amount, timing, and uncertainty of revenue and cash flows are affected by economic factors (e.g., by product line, by sub-segment, by geography, by recognition pattern point-in-time vs over-time);
2. **Contract balances** — opening and closing **contract assets and contract liabilities**, and revenue recognised in the period that was included in the opening contract-liability balance;
3. **Remaining performance obligations (RPO / backlog)** — the aggregate transaction price allocated to unsatisfied (or partially unsatisfied) performance obligations and when it is expected to be recognised;
4. **Significant judgements** — the timing of satisfaction of performance obligations, the transaction price, and amounts allocated to performance obligations.

**U.S. GAAP divergence (disclosure quantum).** ASC 606 grants **non-public** entities prescriptive disclosure **relief** (e.g., a practical expedient from the RPO disclosure for certain contracts and reduced disaggregation). **IFRS 15 has only limited exemptions** and **all entities apply the core principle** — so an IFRS manufacturer, even if privately held, generally provides **fuller RPO and disaggregation disclosure** than a comparable U.S. GAAP private filer ([IFRS Foundation — IFRS 15, all entities apply the core principle](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/); contrast `Manufacturing_ASC606_Sources.md` non-public relief). **[FLAG for IFRS tenants — fewer private-company disclosure carve-outs.]**

**Sub-segment applicability.**

| Disclosure | D | P | H | J | E |
|---|---|---|---|---|---|
| Disaggregation of revenue | ✓ | ✓ | ✓ | ✓ | ✓ |
| Contract assets / liabilities | ◑ | ◑ | ◑ | ✓ | ✓ |
| Remaining performance obligations (backlog) | ◑ | ◑ | ◑ | ✓ | ✓ |
| Significant judgements | ◑ | ◑ | ◑ | ✓ | ✓ |

Contract-balance and RPO disclosures are most material for over-time **J / E** with backlog and contract assets; point-in-time **D / P / H** carry lighter contract-balance disclosure (◑).

---

# PART IV — IFRS 16 LEASES (Manufacturing)

This part is a **focused complement** to `Manufacturing_Disclosures_Sources.md` Part II (ASC 842). **The full lease-identification narrative is not repeated** — IFRS 16's "identified asset plus right to control use" test is **converged** with ASC 842 (`Manufacturing_Disclosures_Sources.md` §2.1). This part focuses on the **lessee single-model accounting** and manufacturing application.

---

## 4.1 Lessee Single On-Balance-Sheet Model (IFRS 16.22) — BINDING DIVERGENCE from ASC 842

**The standard (IFRS 16.22–35).** IFRS 16 introduces a **single lessee accounting model** and requires a lessee to recognise, for **all leases with a term of more than 12 months** (unless the underlying asset is of low value), a **right-of-use (ROU) asset** representing its right to use the underlying asset and a **lease liability** representing its obligation to make lease payments, measured at commencement at the present value of the lease payments ([IFRS Foundation — IFRS 16 summary, single lessee model, ROU asset + lease liability](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-16-leases/)).

**NO operating-lease classification for lessees.** Unlike ASC 842 — which retains a **dual** lessee model (finance vs operating) — IFRS 16 has **no operating-lease classification for lessees**: every on-balance-sheet lease is accounted for in a **finance-style** manner, with the income-statement charge consisting of **depreciation of the ROU asset plus interest on the lease liability** ([KPMG — *Lease accounting: IFRS Accounting Standards vs US GAAP*, IFRS 16 effectively treats all on-balance-sheet leases as finance leases](https://kpmg.com/us/en/articles/2025/lease-accounting-ifrs-standards-us-gaap.html); [Deloitte DART — *IFRS / US GAAP comparison: Leases*, single model, front-loaded expense](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-5-broad-transactions/5-7-leases)). **This is the binding divergence from ASC 842.** **[FLAG CLEARLY for IFRS tenants.]**

**Short-term lease exemption (IFRS 16.5–6).** A lessee **may elect** not to recognise ROU assets and lease liabilities for **short-term leases** (lease term of **12 months or less** at commencement, with no purchase option); the election is made **by class of underlying asset**. Lease payments are recognised as an expense on a **straight-line basis** ([IFRS Foundation — IFRS 16 paragraphs 5–6, 8, short-term lease election by class](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ifrs16.html)).

**Low-value-asset exemption (IFRS 16.5 / B3–B8) — NO ASC 842 EQUIVALENT.** A lessee **may elect** not to apply the recognition and measurement requirements to **leases of low-value assets**, on a **lease-by-lease** basis, **even if such leases are material in aggregate**. IFRS 16 does **not** define "low value," but the Basis for Conclusions refers to assets with a value, **when new, of approximately USD 5,000 or less** — e.g., **tablets, laptops, phones, and small office equipment**. **ASC 842 has no low-value-asset exemption** (a U.S. lessee may rely only on a reasonable materiality-based capitalisation policy) ([IFRS Foundation — IFRS 16 low-value-asset exemption, lease-by-lease](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ifrs16.html); [Deloitte DART — *IFRS / US GAAP comparison: Leases*, low-value ~USD 5,000; no US GAAP exemption](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-5-broad-transactions/5-7-leases); [KPMG — *Lease accounting: IFRS vs US GAAP*, low-value exemption has no Topic 842 equivalent](https://kpmg.com/us/en/articles/2025/lease-accounting-ifrs-standards-us-gaap.html)). **[FLAG CLEARLY for IFRS tenants.]**

**Sub-segment applicability.**

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Single on-balance-sheet lessee model | ✓ | ✓ | ✓ | ✓ | ✓ |
| Short-term lease election | ✓ | ✓ | ✓ | ✓ | ✓ |
| Low-value-asset election | ✓ | ✓ | ✓ | ◑ | ◑ |

The single model applies to every manufacturer that leases. Low-value election is universally available but lighter for **J / E** whose lease portfolios skew to high-value equipment rather than small office items (◑).

---

## 4.2 Lessor Accounting

**The standard (IFRS 16.61–97).** **Lessor accounting under IFRS 16 is largely converged with ASC 842** and substantially carries forward the predecessor model: a lessor classifies each lease as either an **operating lease** or a **finance lease** based on whether it transfers substantially all the risks and rewards incidental to ownership ([IFRS Foundation — IFRS 16, lessor classifies each lease as operating or finance](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ifrs-16-leases.pdf)). The dual finance/operating distinction is **retained for lessors** under both IFRS 16 and ASC 842 — the single-model change affects **lessees only**.

**Manufacturer / dealer (sale-type) leases (IFRS 16.71).** At commencement, a **manufacturer or dealer lessor** recognises, for each finance lease: (a) **revenue** equal to the fair value of the underlying asset, or, if lower, the present value of the lease payments discounted at a market rate; (b) **cost of sale** equal to the cost (or carrying amount, if different) of the underlying asset less the present value of the unguaranteed residual value; and (c) **selling profit or loss** recognised at commencement in accordance with its policy for outright sales under IFRS 15 ([IFRS Foundation — IFRS 16 paragraph 71, manufacturer/dealer lessor selling profit at commencement](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ifrs-16-leases.pdf)). This is directly relevant to **equipment manufacturers (D / E)** that **lease their own products** to customers (captive-finance / lease-to-own arrangements).

**Sub-segment applicability.**

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Lessor operating/finance classification | ◑ | ◑ | ◑ | ◑ | ◑ |
| Manufacturer-dealer (sale-type) leases | ✓ | — | ◑ | — | ✓ |

Manufacturer-dealer leases are the **Discrete (D)** and **ETO (E)** signature (equipment makers leasing their own machinery); lessor accounting generally is fact-dependent across all sub-segments (◑).

---

## 4.3 P&L and EBITDA Impact of IFRS 16 vs ASC 842

**The mechanics.** Under **IFRS 16**, a lessee's income-statement charge for an on-balance-sheet lease is **depreciation of the ROU asset (straight-line, above EBIT) plus interest on the lease liability (below EBIT)** — producing a **front-loaded total cost** profile (higher in early years). Under **ASC 842 operating-lease** treatment, the lessee recognises a **single straight-line lease cost** within operating expenses ([Deloitte DART — *IFRS / US GAAP comparison: Leases*, IFRS 16 single model produces a front-loaded expense profile like an ASC 842 finance lease](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-5-broad-transactions/5-7-leases); [KPMG — *Lease accounting: IFRS vs US GAAP*](https://kpmg.com/us/en/articles/2025/lease-accounting-ifrs-standards-us-gaap.html)).

**EBITDA impact.** Because depreciation and interest both sit **below the EBITDA line** under IFRS 16, while an ASC 842 operating-lease cost sits **above it** (in operating expense), **IFRS 16 reports HIGHER EBITDA than ASC 842 operating-lease treatment** for the same lease portfolio ([MRI Software — *ASC 842 vs IFRS 16*, IFRS 16 increases reported EBITDA vs operating-lease treatment](https://www.mrisoftware.com/blog/asc-842-vs-ifrs-16-2026-compliance-checklist-for-lease-accounting/); [Rubli — *ASC 842 vs IFRS 16*, operating-lease expense reduces EBITDA, materially lower EBITDA under ASC 842](https://www.rubli.co/guides/asc-842/asc-842-vs-ifrs-16/)). Cash-flow presentation also differs: under IFRS 16 the **principal** portion of lease payments is presented in **financing** activities and **interest** per IAS 7, whereas an ASC 842 operating-lease payment is presented in **operating** activities ([Trullion — *IFRS 16 vs ASC 842*, cash-flow split and EBITDA effect](https://trullion.com/blog/ifrs-16-vs-asc-842-the-differences-in-lease-accounting-standards/)).

**Manufacturer-specific impact.** Many manufacturers carry **significant equipment and facility leases** (production machinery, plants, warehouses, fleet). Under IFRS the entire lessee portfolio moves to ROU + interest/amortisation, which (a) **increases reported EBITDA** and gross PP&E-equivalent assets, (b) **changes leverage and coverage ratios**, and therefore (c) carries **debt-covenant and performance-reporting consequences** — a covenant negotiated on a U.S. GAAP operating-lease basis behaves differently under IFRS 16. The variance panel's standard-overhead-rate calculation is also affected where leased production equipment depreciation hits manufacturing overhead (Part V §5.3).

**Sub-segment applicability.**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

EBITDA and covenant effects are largest where lease portfolios are large — capital-intensive **D / P / H** with leased plant and machinery. **J / E** are partial (◑): smaller leased footprints, more owned/contract-specific equipment.

---

## 4.4 IFRS 16 Disclosures (IFRS 16.51–60, 89–97)

**The standard — lessee.** A lessee discloses, in a single note or section, amounts that give a basis for assessing the effect of leases on its financial position, performance, and cash flows, including ([IFRS Foundation — IFRS 16 lessee disclosure, paragraphs 51–58](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ifrs-16-leases.pdf); [Deloitte IAS Plus — *Need to know*, IFRS 16 quantitative lessee disclosures](https://iasplus.com/api/v1/client/publications/50926/document)):

1. **Depreciation charge for ROU assets by class** of underlying asset;
2. **Interest expense on lease liabilities**;
3. The **expense relating to short-term leases**;
4. The **expense relating to leases of low-value assets**;
5. The **total cash outflow for leases**;
6. **Additions to ROU assets**;
7. The **carrying amount of ROU assets at the end of the reporting period by class** of underlying asset;
8. A **maturity analysis of lease liabilities** applying **IFRS 7** *Financial Instruments: Disclosures* (separately from other financial liabilities).

**Presentation (IFRS 16.47–48).** ROU assets are presented **separately** from other assets (or within the line item in which the corresponding owned asset would sit, with disclosure of which line); lease liabilities are presented **separately** from other liabilities (or with disclosure of which line) ([IFRS Foundation — IFRS 16, presentation of ROU assets and lease liabilities](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ifrs-16-leases.pdf)).

**Lessor disclosures (IFRS 16.89–97).** A lessor discloses **finance-lease** selling profit/loss, finance income on the net investment, and a **maturity analysis of lease payments receivable**; and **operating-lease** lease income and a maturity analysis of operating-lease payments — plus information about its risk-management of residual-asset risk ([IFRS Foundation — IFRS 16 lessor disclosure](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ifrs-16-leases.pdf)).

**Sub-segment applicability.**

| Disclosure | D | P | H | J | E |
|---|---|---|---|---|---|
| ROU depreciation + interest by class | ✓ | ✓ | ✓ | ◑ | ◑ |
| Short-term / low-value lease expense | ✓ | ✓ | ✓ | ◑ | ◑ |
| Lease-liability maturity analysis (IFRS 7) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Lessor disclosures | ◑ | — | ◑ | — | ◑ |

Lessor disclosures track §4.2 (D / E equipment lessors). Lessee disclosures scale with lease-portfolio size (largest for D / P / H).

---

## 4.5 Manufacturing-Specific IFRS 16 Application

**Embedded leases in supply contracts.** The **lease-identification framework is converged** with ASC 842 — a contract contains a lease if it conveys the right to control the use of an **identified asset** for a period in exchange for consideration. A **dedicated production line, tooling, vessel, or storage tank** embedded in a long-term supply or take-or-pay contract can be an embedded lease ([IFRS Foundation — IFRS 16, identified-asset / control test](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-16-leases/); cross-reference `Manufacturing_Disclosures_Sources.md` §2.4 on embedded leases). The **difference under IFRS** is that, once identified as a lease for the customer (lessee), it is accounted for under the **single on-balance-sheet model** (§4.1), not a dual operating/finance split. **[JUDGMENT AREA.]**

**Sale-and-leaseback (IFRS 16.98–103).** Whether a sale-and-leaseback is accounted for as a sale plus a lease turns on whether the transfer **meets the IFRS 15 criteria for a sale**. If it does: the seller-lessee measures the **ROU asset as the proportion of the previous carrying amount that relates to the right of use retained**, and recognises **gain or loss only to the extent the rights transferred to the buyer-lessor** — i.e., **not** the full gain on the asset. If the transfer is **not** a sale under IFRS 15, the seller-lessee continues to recognise the asset and accounts for the proceeds as a **financial liability** (IFRS 9 financing). The **2022 amendments** (effective **1 January 2024**) require the seller-lessee to subsequently measure the leaseback so as **not to recognise a gain or loss on the retained right of use**, including where lease payments are variable ([IFRS Foundation — IFRS 16 paragraph 100, gain limited to rights transferred](https://www.ifrs.org/content/dam/ifrs/meetings/2020/june/ifric/ap03a-ifrs16-sale-and-leaseback-cls.pdf); [KPMG — *Leases: Sale and leaseback*, ROU as proportion of carrying amount; 2024 amendments](https://assets.kpmg.com/content/dam/kpmgsites/xx/pdf/ifrg/2024/isg-handbook-sale-and-leaseback.pdf.coredownload.pdf); [Deloitte IAS Plus — *Need to know*, sale-and-leaseback gain limited to transferred rights](https://iasplus.com/api/v1/client/publications/50926/document)). This **differs from ASC 842** in several mechanics (the gain-recognition pattern and the leaseback-classification interaction); cross-reference `Manufacturing_Disclosures_Sources.md` §2.x sale-leaseback. **[FLAG for IFRS tenants.]**

**Variable lease payments.** As under ASC 842, **only in-substance fixed payments and payments that depend on an index or rate** (measured initially at the index/rate at commencement) are included in the lease liability; **truly variable payments** (e.g., usage- or output-based) are **expensed as incurred** and excluded from the liability ([IFRS Foundation — IFRS 16, lease-liability measurement](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-16-leases/); cross-reference `Manufacturing_Disclosures_Sources.md` §2.x).

**Sub-segment applicability.**

| Topic | D | P | H | J | E |
|---|---|---|---|---|---|
| Embedded leases in supply contracts | ◑ | ✓ | ◑ | ◑ | ◑ |
| Sale-and-leaseback (plant / equipment) | ✓ | ✓ | ◑ | ◑ | ◑ |
| Variable lease payments | ✓ | ✓ | ✓ | ◑ | ◑ |

Embedded leases are most common in **Process (P)** take-or-pay / dedicated-asset supply arrangements (✓). Sale-and-leaseback of plant and machinery is most common for capital-intensive **D / P**.

---

# PART V — IFRS REPORTING-BASIS ROUTING FOR ADVISACOR

This part records how the **tenant-level reporting-basis election** drives which knowledge-stack documents govern and where the variance panel must route to IFRS-aware logic. It mirrors the cross-vertical routing notes in `Manufacturing_Disclosures_Sources.md` Part IV and is binding for the planning-doc panel contract `reportingBasis` field.

---

## 5.1 Tenant Election of Reporting Basis

**The election.** At onboarding, a tenant elects **`US_GAAP` or `IFRS`** as its reporting basis — the planning-doc panel contract `reportingBasis: 'US_GAAP' | 'IFRS'` field (`MANUFACTURING_VERTICAL_PLANNING_DOCUMENT.md`, resolved Q5). The election is a **tenant-level attribute** (and, for multi-entity tenants, may be set per operating company under the one-to-many tenant→entity relationship established by resolved Q7).

**Platform-wide, no per-period mixing.** The election applies **platform-wide for that tenant** (or per entity for multi-entity tenants) and **cannot be mixed per period** — a tenant does not report some periods on U.S. GAAP and others on IFRS within the same entity. Consistency of basis is itself an IFRS/GAAP requirement (IAS 8 consistency; comparatives).

**Change in election.** A change of reporting basis requires **founder / admin approval** and proper change documentation (the same governance posture as the industry-config change controls in 42.5G). A basis change is a significant event: it triggers recasting of inventory cost flows (LIFO removal — §1.3 / §5.3), lease re-baselining (§4.1 / §5.3), and PP&E depreciation recomputation (componentization — §2.3 / §5.3), and must be flagged for human preparer review.

---

## 5.2 Knowledge-Stack Routing Implications

**For `US_GAAP` tenants.** `Manufacturing_KPIs_Sources.md` (MFG-K-A), `Manufacturing_ASC606_Sources.md` (MFG-K-B), and `Manufacturing_Disclosures_Sources.md` (MFG-K-C) are **authoritative**. This IFRS document is **not loaded** as governing literature (it remains available as cross-reference).

**For `IFRS` tenants.** **This document (`Manufacturing_IFRS_Sources.md`, MFG-K-C2) is loaded in addition** to the KPI and ASC documents. Where the IAS / IFRS standards covered here **conflict** with the GAAP documents, **this document governs** for the IFRS tenant. The principal governing overrides are:

| Topic | GAAP doc default | IFRS override (this doc) | Governing section |
|---|---|---|---|
| Inventory cost flow | LIFO permitted (`Disclosures` §1.3 / §1.5) | **LIFO prohibited** — FIFO / weighted-avg / specific-id only | §1.3 |
| Inventory write-down | Lower of cost or NRV; **reversal prohibited** (`Disclosures` §1.6) | Lower of cost and NRV; **reversal required** when NRV recovers (capped at original cost) | §1.5 |
| PP&E componentization | Permitted, not required (composite life common) | **Component approach required** (significant parts depreciated separately) | §2.3 |
| PP&E subsequent measurement | Historical cost required | **Cost OR revaluation model** (entire class) | §2.4 |
| Long-lived-asset impairment reversal | **Prohibited** (ASC 360, held-and-used) | **Reversal permitted** (IAS 36, non-goodwill; capped at depreciated-cost ceiling) | §2.6 |
| Lessee lease model | **Dual** finance/operating (ASC 842) | **Single** on-balance-sheet model; all leases finance-style; **low-value exemption** | §4.1 |
| Revenue (IFRS 15 vs ASC 606) | Shipping/handling + sales-tax elections available | **No such elections**; lower collectibility threshold; contract-cost impairment **reversal required** | §3.2 |

**Variance math is reporting-basis-neutral.** The variance evaluator and the panel contract function **identically** under either basis: the **eight variance formulas** (MFG-V-01..MFG-V-08) are arithmetic on (standard inputs, actual inputs, production volume) and do **not** change with the reporting basis. What changes is the **inputs** — the standards that feed the math may be recast under IFRS (next section). The variance **computation** is basis-neutral; only the variance **composition** (the input values) may differ.

---

## 5.3 Where Reporting Basis Affects the Variance Panel

Four IFRS divergences materially affect the **inputs** to the manufacturing variance panel for an IFRS tenant. In each case the evaluator math is unchanged; the standards / baselines fed into it must be IFRS-recast **before** variance computation.

**(1) Inventory baseline — LIFO absence (§1.3).** If a tenant uses **LIFO** under U.S. GAAP but **elects IFRS**, the LIFO cost basis is **invalid** under IAS 2. The standard cost of input materials must be **recast on a non-LIFO basis** (FIFO or weighted-average) **before** the material-price and material-usage variances (MFG-V-01 / MFG-V-02) are computed; otherwise the standard against which actuals are measured embeds a prohibited LIFO layer. **There is no LIFO reserve to carry; the recast is to the underlying FIFO / weighted-average cost.**

**(2) ROU-asset depreciation under IFRS 16 (§4.1, §4.3).** Under IFRS 16, **all leases** (including leased production equipment) generate **ROU-asset depreciation plus interest**, which hits **manufacturing overhead** differently than an ASC 842 **operating-lease** straight-line expense. Where leased machinery sits in the production cost pool, the **standard overhead rate** (the denominator and pools behind MFG-V-05..MFG-V-07b) must reflect **ROU depreciation in manufacturing overhead** and **interest below the line**, not a single operating-lease cost above the line. This changes the standard FOH and VOH rates an IFRS tenant should use.

**(3) Componentization under IAS 16 (§2.3).** IAS 16 **component depreciation** produces a **different depreciation expense in any given period** than U.S. GAAP composite-life depreciation (typically higher early-life, with overhauls capitalised rather than expensed). Because production-equipment depreciation is a component of **fixed manufacturing overhead**, componentization **changes the standard FOH rate** — and therefore the fixed-overhead spending and volume variances (MFG-V-07a / MFG-V-07b) — for an IFRS tenant relative to a composite-life GAAP tenant.

**(4) Inventory write-down reversal under IAS 2 (§1.5).** If an IFRS tenant **reverses** a prior inventory write-down (when NRV recovers), the **inventory baseline** used in cost-accounting changes in the reversal period. Where standards or actuals are derived from carrying amounts that were written down and then written back up, the **variance compositions may need adjustment** so the reversal (a reduction of inventory expense, capped at the original write-down) is not mistaken for a favourable cost variance. The reversal is an accounting remeasurement, **not** a production-efficiency gain, and must be isolated from the operational variances.

**Critical boundary (carried from the sibling docs).** The variance panel is an **internal management view**. It does **not** by itself create, trigger, or satisfy any required IFRS disclosure; every IAS 2 / IAS 16 / IAS 36 / IFRS 15 / IFRS 16 disclosure remains the product of a **human preparer's judgement** using the panel as decision-support evidence, classified as `recommendation_for_human_review`. The reporting-basis flag routes the divergent inputs above to IFRS-aware logic; it does **not** authorise Advisacor to author or file any IFRS disclosure autonomously. The IFRS panel data path is **spine-gated** (tenant isolation + RBAC) per the Phase 42.5 universal control spine and is **proved** by the relevant panel probe (PC-MFG-01..PC-MFG-05), not asserted. The verifier (MFG-K-I) must confirm that an IFRS-electing tenant routes through IFRS-aware logic wherever the standards diverge (LIFO absence, lease classification, componentization, write-down reversal).

**Sub-segment applicability (basis-sensitive panel inputs).**

| Basis-sensitive input | D | P | H | J | E |
|---|---|---|---|---|---|
| LIFO recast (inventory standards) | ◑ | ✓ | ◑ | — | — |
| IFRS 16 ROU depreciation in FOH/VOH rate | ✓ | ✓ | ✓ | ◑ | ◑ |
| IAS 16 componentization in FOH rate | ✓ | ✓ | ◑ | ◑ | ✓ |
| IAS 2 write-down reversal in baseline | ◑ | ✓ | ◑ | — | — |

LIFO recast and write-down reversal bite hardest for commodity-input **Process (P)** (✓); lease and componentization effects scale with capital intensity (D / P / H ✓; J / E ◑ except componentization for heavy-equipment E).

---

## Primary Source Index

All sources below are **primary or authoritative-interpretive**: the **IFRS Foundation** issued standards and Educational Material (canonical; some pages behind a free **[REGISTRATION WALL]**, cited regardless), and the Big-Four / national-firm IFRS handbooks (Deloitte IAS Plus, KPMG *Insights into IFRS* / comparisons, EY, PwC, Grant Thornton), treated as **primary for interpretation** of how the standards apply to manufacturing. Cross-references to ASC counterparts cite the relevant GAAP sibling document. URLs verified as resolving as of June 22, 2026; verbatim cited-text verification is recorded in the Citation Verification Register (MFG-K-E, `Manufacturing_KPI_Citation_Verification_Register.xlsx`).

| Source | URL | Coverage |
|---|---|---|
| IFRS Foundation — IAS 2 *Inventories* (issued standard, HTML) | [ifrs.org — IAS 2 (2024 issued)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias2.html) | Scope, cost composition, NRV, reversal, cost formulas |
| IFRS Foundation — IAS 2 *Inventories* (PDF, Part A) | [ifrs.org — IAS 2 (2021 PDF)](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-2-inventories.pdf) | Joint products (14); disclosure (36) verbatim |
| IFRS Foundation — IAS 2 summary | [ifrs.org — IAS 2 standard page](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/) [REGISTRATION WALL] | Lower of cost and NRV; cost formulas; expense recognition |
| IFRS Foundation — IFRIC staff paper: IAS 2 costs necessary to sell | [ifrs.org — IAS 2 costs necessary to sell](https://www.ifrs.org/content/dam/ifrs/meetings/2021/february/ifric/ap03-ias2-costs-necessary-to-sell-inventories.pdf) | NRV = all costs necessary to make the sale |
| IFRS Foundation — IASB staff paper AP26A (IAS 8 / IAS 2) | [ifrs.org — AP26A IAS 8 / IAS 2](https://www.ifrs.org/content/dam/ifrs/meetings/2019/october/iasb/ap26a-ias-8.pdf) | Specific identification for non-interchangeable / project goods |
| IFRS Foundation — IAS 2 service-provider observer note | [ifrs.org — service-provider inventory (IAS 2.19)](https://www.ifrs.org/content/dam/ifrs/meetings/2010/march/joint-iasb-fasb-with-efrag/rr-0310-ap7c-obs.pdf) | Service-provider inventory measured at cost of production |
| Deloitte IAS Plus — *iGAAP in Focus* (inventory / tariffs) | [iasplus.com — iGAAP in Focus, inventory NRV / tariffs](https://iasplus.com/content/f2d8d9b4-fd01-4665-97bd-8dc20a872f0c) | Tariffs in cost; NRV entity-specific; reversal disclosure |
| KPMG — *Inventory: IFRS Accounting Standards vs US GAAP* | [kpmg.com — inventory IFRS vs US GAAP](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html) | LIFO prohibited; write-down reversal required; cost composition |
| PwC — IAS 2 abnormal losses note | [pwc.com — IAS 2 abnormal losses](https://www.pwc.com/ng/en/assets/pdf/covid19-key-financial-reporting%20implication-nigeria.pdf) | Abnormal losses excluded from inventory |
| IFRS Foundation — IAS 16 *Property, Plant and Equipment* (PDF, Part A) | [ifrs.org — IAS 16 (2021 PDF)](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf) | Componentization (43); cost/revaluation models; depreciation; derecognition; disclosure; spares (8) |
| IFRS Foundation — IAS 16 summary | [ifrs.org — IAS 16 standard page](https://www.ifrs.org/issued-standards/list-of-standards/ias-16-property-plant-and-equipment/) [REGISTRATION WALL] | PP&E definition; recognition; cost components; revenue-based depreciation prohibited |
| Deloitte IAS Plus — IFRS asset componentization / revaluation | [iasplus.com — IFRS componentization & revaluation](https://iasplus.com/content/e9c03b91-02b0-4cd9-a970-048588494e0c) | Component approach required; group depreciation not permitted; revaluation option |
| Deloitte IAS Plus — IAS 16 summary | [iasplus.com — IAS 16 summary](https://www.iasplus.com/en/standards/ias/ias16) | Initial measurement; directly attributable costs; subsequent measurement |
| PwC — *Financial reporting in the power and utilities industry* (IFRS) | [pwc.com — utilities IFRS, component depreciation](https://www.pwc.com/id/en/publications/assets/utilities-ifrs.pdf) | Component depreciation; replacement capitalised, replaced component derecognised |
| KPMG — Ind AS / IAS 16 tangibles & intangibles guide | [kpmg.com — IAS 16 component accounting (Ind AS guide)](https://assets.kpmg.com/content/dam/kpmgsites/in/pdf/2020/02/chapter-04-tangibles-intangibles-assets-ind-as-implementation-guide.pdf) | Component depreciation; major-maintenance components; revaluation by class |
| IFRS Foundation — IAS 23 *Borrowing Costs* (issued standard, HTML) | [ifrs.org — IAS 23 (2025 issued)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ias23.html) | Qualifying assets; capitalisation; repetitive-inventory exclusion |
| Deloitte IAS Plus — Revised IAS 23 news | [iasplus.com — revised IAS 23](https://www.iasplus.com/en/news/2007/March/news3473) | Mandatory capitalisation; repetitive-production exclusion |
| KPMG — *Borrowing costs: Top 10 differences IFRS vs US GAAP* | [kpmg.com — borrowing costs](https://kpmg.com/us/en/articles/2023/borrowing-costs.html) | Qualifying assets; long-production-period inventory as policy choice; capitalisation period |
| IFRS Foundation — IAS 36 *Impairment of Assets* (issued standard, HTML) | [ifrs.org — IAS 36 (2026 issued)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2026/issued/ias36.html) | Recoverable amount; impairment loss; CGU |
| IFRS Foundation — IAS 36 summary | [ifrs.org — IAS 36 standard page](https://www.ifrs.org/issued-standards/list-of-standards/ias-36-impairment-of-assets/) [REGISTRATION WALL] | Recoverable amount = higher of FVLCD and VIU; reversal permitted (non-goodwill); goodwill never reversed |
| Grant Thornton — *IAS 36: Reversing impairment losses* | [grantthornton.global — reversing impairment losses](https://www.grantthornton.global/en/insights/articles/IFRS-ias-36/ifrs-Reversing-impairment-losses/) | Reversal indicators; CGU pro-rata reversal ceiling |
| IFRS Foundation — IFRS 15 *Revenue from Contracts with Customers* | [ifrs.org — IFRS 15 standard page](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/) [REGISTRATION WALL] | Five-step model; over-time criteria; disclosure; PIR status; effective date |
| RSM US — *US GAAP vs IFRS: Revenue from Contracts with Customers* | [rsmus.com — US GAAP vs IFRS revenue (PDF)](https://rsmus.com/content/dam/rsm/insights/financial-reporting/us-gaap-vs-ifrs-comparisons/wp_as_us_gaap_vs_ifrs_revenue_recognition.pdf) | Shipping/handling; sales tax; non-cash; collectibility; contract-cost reversal |
| IFRS Foundation — IFRS 16 *Leases* (PDF, Part A) | [ifrs.org — IFRS 16 (2021 PDF)](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ifrs-16-leases.pdf) | ROU cost; presentation; lessee disclosure; manufacturer/dealer lessor (71); lessor classification |
| IFRS Foundation — IFRS 16 *Leases* (issued standard, HTML) | [ifrs.org — IFRS 16 (2025 issued)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ifrs16.html) | Short-term & low-value elections (5–6, 8); ROU measurement (23) |
| IFRS Foundation — IFRS 16 summary | [ifrs.org — IFRS 16 standard page](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-16-leases/) [REGISTRATION WALL] | Single lessee model; ROU + lease liability; identified-asset test |
| IFRS Foundation — IFRIC comment letters: IFRS 16 sale-and-leaseback | [ifrs.org — IFRS 16 sale-and-leaseback (para 100)](https://www.ifrs.org/content/dam/ifrs/meetings/2020/june/ifric/ap03a-ifrs16-sale-and-leaseback-cls.pdf) | Gain limited to rights transferred to buyer-lessor |
| Deloitte DART — *IFRS / US GAAP comparison: Leases* | [dart.deloitte.com — IFRS vs US GAAP leases](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-5-broad-transactions/5-7-leases) | Single vs dual model; low-value ~USD 5,000; front-loaded expense |
| KPMG — *Lease accounting: IFRS Accounting Standards vs US GAAP* | [kpmg.com — lease accounting IFRS vs US GAAP](https://kpmg.com/us/en/articles/2025/lease-accounting-ifrs-standards-us-gaap.html) | All on-balance-sheet leases finance-style; low-value exemption no Topic 842 equivalent |
| KPMG — *IFRS 16: An overview* | [kpmg.com — IFRS 16 overview (PDF)](https://assets.kpmg.com/content/dam/kpmgsites/xx/pdf/ifrg/2024/leases-overview.pdf.coredownload.inline.pdf) | Single model; recognition exemptions; low-value lease-by-lease |
| KPMG — *Leases: Sale and leaseback* | [kpmg.com — sale and leaseback (PDF)](https://assets.kpmg.com/content/dam/kpmgsites/xx/pdf/ifrg/2024/isg-handbook-sale-and-leaseback.pdf.coredownload.pdf) | ROU as proportion of carrying amount; 2024 amendments |
| Deloitte IAS Plus — *Need to know* (IFRS 16) | [iasplus.com — IFRS 16 Need to know (PDF)](https://iasplus.com/api/v1/client/publications/50926/document) | Quantitative lessee disclosures; sale-and-leaseback |
| MRI Software — *ASC 842 vs IFRS 16: 2026 compliance checklist* (cross-reference) | [mrisoftware.com — ASC 842 vs IFRS 16](https://www.mrisoftware.com/blog/asc-842-vs-ifrs-16-2026-compliance-checklist-for-lease-accounting/) | EBITDA / low-value comparison (never sole citation) |
| Rubli — *ASC 842 vs IFRS 16* (cross-reference) | [rubli.co — ASC 842 vs IFRS 16](https://www.rubli.co/guides/asc-842/asc-842-vs-ifrs-16/) | Single vs dual; EBITDA impact (never sole citation) |
| Trullion — *IFRS 16 vs ASC 842* (cross-reference) | [trullion.com — IFRS 16 vs ASC 842](https://trullion.com/blog/ifrs-16-vs-asc-842-the-differences-in-lease-accounting-standards/) | Cash-flow split; EBITDA effect (never sole citation) |
| RevenueHub — *ASC 606 vs IFRS 15* (cross-reference) | [revenuehub.org — ASC 606 vs IFRS 15](https://www.revenuehub.org/article/asc-606-ifrs-15) | IFRS 15 divergence cross-reference (never sole citation) |
| `Manufacturing_ASC606_Sources.md` (MFG-K-B) | (workspace sibling) | ASC 606 five-step model; IFRS 15 divergence Section 13 |
| `Manufacturing_Disclosures_Sources.md` (MFG-K-C) | (workspace sibling) | ASC 330 inventory; ASC 842 leases; LIFO; reporting-basis routing |
| `Manufacturing_KPIs_Sources.md` (MFG-K-A) | (workspace sibling) | Variance KPIs MFG-V-01..MFG-V-08; standard-cost basis |

---

*This document is part of the Advisacor Manufacturing Vertical Knowledge Stack (Module MFG-K-C2, Wave 1). It is `DRAFT / SPEC — NOT EXECUTABLE — NOT LOCKED`, `executable: false`, `containsVerticalComplianceLogic: true`. All inventory-, PP&E-, revenue-, and lease-accounting conclusions and divergence flags generated by Advisacor under an IFRS reporting basis are classified as `output_classification = 'recommendation_for_human_review'`. No statement in this document constitutes final accounting, audit, legal, or filing advice, and nothing here authorizes Advisacor to author, certify, or file any IFRS disclosure autonomously. Users must validate every IAS 2 / IAS 16 / IAS 23 / IAS 36 / IFRS 15 / IFRS 16 paragraph citation against the current IFRS Foundation standards (some of which sit behind a free registration wall but are canonical), apply the analysis to their specific facts, sub-segment (D / P / H / J / E), production strategy (MTS / MTO / ATO / ETO), and their elected reporting basis, and confirm the latest amendment status against the IFRS work plan at their reporting date before relying on it. This document is loaded for tenants electing the `IFRS` reporting basis and complements — it does not replace — `Manufacturing_ASC606_Sources.md` and `Manufacturing_Disclosures_Sources.md`; where the IAS/IFRS standards conflict with those GAAP documents, this document governs for the IFRS tenant. The four binding divergences from U.S. GAAP — LIFO prohibition (IAS 2), inventory write-down reversal (IAS 2), impairment reversal (IAS 36), and the single lessee model (IFRS 16), together with IAS 16 mandatory componentization and the IFRS 16 low-value exemption — are facts-and-circumstances and basis-sensitive matters flagged throughout; they require professional judgment. The variance and KPI panels referenced in Part V are internal management views that supply decision-support evidence only and are reporting-basis-neutral in their computation; they do not by themselves create, trigger, or satisfy any required IFRS disclosure — every such disclosure remains the product of a human preparer's judgment. The IFRS panel data path is spine-gated (tenant isolation + RBAC) per the Phase 42.5 universal control spine and is proved by the relevant panel probe, not asserted.*
