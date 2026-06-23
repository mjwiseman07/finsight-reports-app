---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: true
phase: Retail Vertical Knowledge Stack — Wave 1 / RTL-K-C
artifact: Disclosures Sources Document
peer: docs/manufacturing/wave1/Manufacturing_Disclosures_Sources.md
---

# US Retail Disclosures — ASC 330 Inventory (LIFO + LCM/LCNRV + RIM), Shrink, Markdown Cadence, Perishable Obsolescence, ASC 842 Leases, and SEC Reg S-K — Comprehensive Source Reference

**DRAFT / SPEC — NOT EXECUTABLE — NOT LOCKED**

`executable: false`
`containsVerticalComplianceLogic: true`

**Document Title:** Retail Disclosures Source Document — Advisacor Retail Vertical Knowledge Stack, Module RTL-K-C
**Date Generated:** June 23, 2026
**Version:** 1.0 (DRAFT)
**Founder:** Matthew Wiseman (Wiseman Financial Technologies LLC)
**Scope:** US retailers reporting under U.S. GAAP and, where elected at the tenant level, IFRS. This module covers the retail-specific disclosure surfaces under one cover: (I) **ASC 330** *Inventory* — LIFO, LCM/LCNRV, ASU 2015-11; (II) **Retail Inventory Method (RIM)** — AICPA guidance + ASC 330-10-30-13; (III) **Shrink reserve**; (IV) **Markdown cadence**; (V) **Perishable obsolescence** (G sub-segment); (VI) **ASC 842** *Leases* — mall/big-box dual classification, percentage rent, CAM, occupancy cost ratio; (VII) **SEC Regulation S-K** — segment, geographic, risk factors, MD&A; (VIII) **IFRS divergence** — IAS 2 LIFO prohibition, IFRS 16 single lessee model, IAS 36 store-level CGU impairment. Five retail sub-segments — Brick-and-mortar (B), E-commerce (E), Omnichannel (O), Grocery/CPG (G), Specialty/Apparel (S). NAICS sectors 44–45 and 4541.
**Output Classification:** `recommendation_for_human_review`
**Citation Discipline:** Every authoritative claim cites a **primary source**. The canonical citations are: the FASB Accounting Standards Codification (ASC 330, ASC 842, ASC 280, ASC 360, ASC 606) accessed via the Deloitte Accounting Research Tool (DART) at [dart.deloitte.com](https://dart.deloitte.com) and FASB direct ([fasb.org](https://www.fasb.org)); SEC rules and Regulation S-K / S-X via the eCFR ([ecfr.gov](https://www.ecfr.gov)), Cornell LII ([law.cornell.edu](https://www.law.cornell.edu)), and SEC releases/press releases ([sec.gov](https://www.sec.gov)); IFRS Foundation for IAS 2, IAS 36, and IFRS 16 ([ifrs.org](https://www.ifrs.org)); IRC §472 / Treas. Reg. §1.471-8 and §1.472-2 for the retail method and LIFO conformity ([law.cornell.edu](https://www.law.cornell.edu), [ecfr.gov](https://www.ecfr.gov)); the AICPA / AICPA-CIMA for audit-and-accounting guidance ([aicpa-cima.com](https://www.aicpa-cima.com)); the National Retail Federation ([nrf.com](https://nrf.com)) for shrink benchmarks; and the International Council of Shopping Centers ([icsc.com](https://www.icsc.com)) for occupancy-cost and sales-per-square-foot benchmarks. Big-Four and national-firm handbooks (KPMG, EY, PwC, Deloitte, Grant Thornton, RSM US, BDO) are treated as **primary for interpretation** of how the Codification applies to retail. Definitions that turn on facts-and-circumstances judgment are flagged **[JUDGMENT AREA]**.
**IFRS posture:** IFRS receives equal-depth treatment. IAS 2 divergences from ASC 330 (LIFO prohibited; write-down reversal permitted; retail method permitted but less prescriptive), IFRS 16 divergence from ASC 842 (single on-balance-sheet lessee model vs. dual operating/finance classification), and IAS 36 divergence from ASC 360 (store-level CGU impairment vs. trigger-based undiscounted recoverability test) are flagged where material in Parts I, II, VI, and VIII, and inline where useful. The peer IFRS source document `Retail_IFRS_Sources.md` (Module RTL-K-C2) carries the full IAS 2 / IAS 36 / IFRS 15 / IFRS 16 treatment; this document flags only the retail-material divergences.

This document is the retail-vertical analog of `Manufacturing_Disclosures_Sources.md` (Module MFG-K-C) and is governed by `Retail_Vertical_Planning_Doc.md`. Its siblings are `Retail_KPIs_Sources.md` (Module RTL-K-A) and `Retail_ASC606_Sources.md` (Module RTL-K-B); terminology, the sub-segment key, and citation style are kept consistent with those documents.

---

## How to Read This Document

The document is organized in **nine substantive parts plus a closing source table**:

- **Part I — ASC 330 Inventory** (Sections I.1–I.5): scope, cost-flow methods, LIFO disclosure requirements, lower of cost and NRV (ASU 2015-11), and markdown/impairment of carrying value.
- **Part II — Retail Inventory Method (RIM)** (Sections II.1–II.6): AICPA guidance, ASC 330-10-30-13, mechanics, RIM-LIFO, audit considerations, IFRS divergence.
- **Part III — Shrink Reserve** (Sections III.1–III.4): definitions, accounting, disclosure, G sub-segment specifics.
- **Part IV — Markdown Cadence** (Sections IV.1–IV.4): permanent vs. promotional, open-to-buy, NRV interaction, S sub-segment specifics.
- **Part V — Perishable Obsolescence** (Sections V.1–V.3): FIFO discipline, pull-date/donation accounting, G-specific disclosure.
- **Part VI — ASC 842 Leases** (Sections VI.1–VI.8): dual classification, ROU asset/liability, percentage rent, CAM, occupancy cost ratio, Reg S-X interaction, IFRS 16 divergence, lease modifications.
- **Part VII — Reg S-K Disclosures** (Sections VII.1–VII.5): Item 101, Item 105, Item 303, scoped-out items, climate status.
- **Part VIII — IFRS Divergence Summary** (Sections VIII.1–VIII.4): IAS 2 LIFO prohibition, IFRS 16 single model, IAS 36 store-level CGU, IAS 2.22 retail method.
- **Part IX — Disclosure Template Extraction** (Wave 2 binding): tables of disclosures by sub-segment for the Wave 2 `USGAAPDisclosurePackage` / `IFRSDisclosurePackage`.
- **Part X — Sources Reference Table**.

Each substantive topic carries, where applicable: (1) **The standard** — the operative paragraph(s) cited verbatim to DART / eCFR / IFRS; (2) **Retail application** — how it applies to retail patterns; (3) **Sub-segment applicability** — an explicit statement and, where useful, a five-column matrix across B / E / O / G / S; (4) **IFRS note** — where IFRS diverges materially.

**Retail Sub-Segment Key:** **B** = Brick-and-mortar (general) | **E** = E-commerce (pure-play) | **O** = Omnichannel | **G** = Grocery / CPG (food + perishables) | **S** = Specialty / apparel.
Matrix legend: **✓** = applicable / common; **◑** = partially applicable / fact-dependent; **—** = not applicable / rare. **No cell is ever left blank.**

**Math notation:** inline math uses \( \cdots \); display math uses \[ \cdots \]. There are zero `$`-style math delimiters in this document.

---

# PART I — ASC 330 INVENTORY (Retail)

---

## I.1 Scope and Definitions

**The standard.** ASC 330 governs the measurement and presentation of inventory under U.S. GAAP. An asset is inventory if it is tangible personal property (a) held for sale in the ordinary course of business — for retailers, **merchandise / finished goods** — (b) in the process of production for such sale, or (c) to be consumed in the production of goods or services to be available for sale ([US GAAP ASC Topic 330 Inventory — definition of inventory, accountinginfo.com](https://accountinginfo.com/financial-accounting-standards/asc-300/330-inventory.htm)). For a pure retailer, in-scope inventory is overwhelmingly **merchandise held for resale**, with minimal raw materials or work-in-process. The Codification's foundational principle is that the inventory carried at any date is "the balance of costs applicable to goods on hand remaining after the matching of absorbed costs with concurrent revenues," carried forward to future periods provided it does not exceed the amount recoverable from ultimate disposition ([FASB ASC 330 Inventory, via Deloitte DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330)).

The scope range of the general subtopic runs from **ASC 330-10-05 (Overview and Background)** through **ASC 330-10-20-1 (Glossary)**, where inventory and the cost-flow terms are defined ([FASB ASC 330-10 Overall, via Deloitte DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10)).

**Retail application.** Retailers acquire goods at cost and sell at retail; the spread between the two (initial markup) is the central driver of the cost-flow and retail-method mechanics covered below. Inventory cost for purchased merchandise comprises the **purchase price plus freight-in, duties, and handling — all costs of bringing merchandise to its present location and condition, net of trade discounts, rebates, and vendor allowances** ([KPMG — Handbook: Inventory, cost components](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2023/handbook-inventory.pdf)).

**Sub-segment applicability.**

| B | E | O | G | S |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

All five sub-segments hold merchandise inventory within ASC 330. The **composition and velocity differ**: Grocery (G) carries high-velocity, low-margin, perishable-heavy inventory; Specialty/apparel (S) carries seasonal, fashion-risk inventory subject to heavy markdown; E-commerce (E) and Omnichannel (O) hold ship-from-DC and ship-from-store inventory with channel-allocation complexity; Brick-and-mortar (B) holds store-level display and backstock inventory.

---

## I.2 Cost Flow Methods

**The standard.** Verbatim, **ASC 330-10-30-9**: "Cost for inventory purposes may be determined under any one of several assumptions as to the flow of cost factors, such as first-in first-out (FIFO), average, and last-in first-out (LIFO). The major objective in selecting a method should be to choose the one which, under the circumstances, most clearly reflects periodic income." ([FASB ASC 330-10-30-9, quoted in Deloitte DART SEC comment-letter roadmap §2.12A Inventory](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-sec-comment-letter-considerations/chapter-2-financial-statement-accounting-disclosure/2-13-inventory)).

The recognized methods are **FIFO, LIFO, weighted average, specific identification, and the retail method** ([Houseblend — ASC 330 valuation, methods permitted include LIFO and the retail inventory method](https://www.houseblend.io/articles/asc-330-inventory-valuation-write-downs); [KPMG — Handbook: Inventory, retail inventory method (RIM) definition](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2023/handbook-inventory.pdf)). The retail method is detailed in Part II.

**Retail application.** FIFO is the most widely used method by retailers and is mandatory in substance for perishables (Part V); LIFO is elected by some grocery and general-merchandise retailers for tax reasons in inflationary periods; the retail method (often combined with LIFO — "RIM-LIFO") is common in department stores. Per the cost-flow disclosure principle below, the chosen method must be disclosed and consistently applied.

**Sub-segment applicability.**

| Method | B | E | O | G | S |
|---|---|---|---|---|---|
| FIFO | ✓ | ✓ | ✓ | ✓ | ✓ |
| Weighted average | ✓ | ✓ | ✓ | ✓ | ◑ |
| LIFO (US-only) | ◑ | — | ◑ | ✓ | ◑ |
| Retail method (RIM) | ✓ | ◑ | ✓ | ◑ | ✓ |
| Specific identification | ◑ | ◑ | ◑ | — | ◑ |

LIFO is rated **✓** for Grocery (G) — large, stable, inflation-exposed dry-goods assortments where LIFO tax deferral is valuable — but **—** for pure E-commerce (E), where SKU-level perpetual systems and rapid assortment turnover make LIFO impractical, and where perishables (Part V) are categorically unsuited to LIFO. Specific identification is **◑** for high-value, low-volume specialty categories (jewelry — NAICS 4483) and **—** for grocery.

---

## I.3 LIFO Disclosure Requirements

**The standard — basis of stating inventories.** Verbatim, **ASC 330-10-50-1**: "The basis of stating inventories shall be consistently applied and shall be disclosed in the financial statements; whenever a significant change is made therein, there shall be disclosure of the nature of the change and, if material, the effect on income." ([FASB ASC 330-10-50-1, quoted in PhDessay summary of ASC 330-10](https://phdessay.com/asc-330-10/); cross-confirmed at [XBRL US-GAAP reference list, 330-10-50-1 Inventory Policy text blocks](http://xbrlsite.azurewebsites.net/2019/Prototype/References/us-gaap/_330.html)). Required policy-note content includes "the major classes of inventories, bases of stating inventories (for example, lower of cost or market), methods by which amounts are added and removed from inventory classes (for example, FIFO, LIFO, or average cost), loss recognition on impairment of inventories, and situations in which inventories are stated above cost" ([SEC EDGAR — Inventories (Policies) definition block citing major classes / bases of stating inventories](https://www.sec.gov/Archives/edgar/data/1533427/000112785513000240/R24.htm)).

**LIFO reserve and LIFO liquidation disclosures.** An entity that uses LIFO has additional disclosure requirements: it must disclose **(1) the amount of income realized from a LIFO liquidation; and (2) any material excess of replacement or current cost over the reported LIFO value** (the "LIFO reserve") ([KPMG — Handbook: Inventory, additional LIFO disclosure requirements](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2023/handbook-inventory.pdf)). The **LIFO reserve** is the difference between the reported LIFO inventory carrying amount and the inventory amount that would have been reported under FIFO; its disclosure lets analysts adjust cost of sales and ending inventory to a FIFO basis ([AnalystPrep — LIFO Reserve & LIFO Liquidation explained](https://analystprep.com/cfa-level-1-exam/financial-reporting-and-analysis/explain-lifo-reserve-lifo-liquidation/)). FASB's proposed inventory-disclosure ASU (later not finalized as drafted) would have codified these SEC-registrant LIFO disclosures into **ASC 330-10-50-13**, requiring all LIFO entities to disclose "(1) the excess of replacement cost or current cost over the reported inventory amount and (2) the effect on net income of the liquidation of a portion of an entity's LIFO inventory" ([Deloitte — Heads Up: FASB Proposes Updates to Inventory Disclosures, proposed ASC 330-10-50-13](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2017/fasb-proposes-updates-inventory-disclosures-jan)).

A **decline in the LIFO reserve from a prior period may indicate LIFO liquidation has occurred** — the consumption of low-cost old layers, which inflates current income — and therefore triggers the liquidation-impact disclosure ([AnalystPrep — LIFO liquidation signaled by declining LIFO reserve](https://analystprep.com/cfa-level-1-exam/financial-reporting-and-analysis/explain-lifo-reserve-lifo-liquidation/)).

**Tax conformity — IRS LIFO conformity rule.** A taxpayer that elects LIFO for federal income tax must use no method other than LIFO in ascertaining income for "credit purposes or for purposes of reports to shareholders, partners, or other proprietors, or to beneficiaries." Verbatim, **Treas. Reg. §1.472-2(e)(1)**: "The taxpayer must establish to the satisfaction of the Commissioner that the taxpayer, in ascertaining the income, profit, or loss for the taxable year for which the LIFO inventory method is first used, or for any subsequent taxable year, for credit purposes or for purposes of reports to shareholders, partners, or other proprietors, or to beneficiaries, has not used any inventory method other than that referred to in §1.472-1." ([Treas. Reg. §1.472-2(e), Cornell LII](https://www.law.cornell.edu/cfr/text/26/1.472-2); [26 CFR 1.472-2, eCFR](https://www.ecfr.gov/current/title-26/chapter-I/subchapter-A/part-1/subject-group-ECFRb3578fa14bdb9ea/section-1.472-2)). The conformity rule is rooted in **IRC §472(c) and §472(e)(2)**; violation can terminate the LIFO election ([Source Advisors — What is the LIFO Conformity Rule, IRC §472(c)](https://sourceadvisors.com/blogs/lifo/what-is-the-lifo-conformity-rule/)). Critically, the face of the annual income statement must present income on the LIFO method, but **non-LIFO supplemental disclosures are permitted** in notes and supplements as long as they are clearly identified as a supplement to the primary LIFO presentation ([LIFOPro — financial report disclosure requirements, Treas. Reg. §1.472-2(e)(3)(i)](https://lifopro.com/financial-report-disclosure-requirements-alternatives/)). The taxpayer's use of the **lower of LIFO cost or market** to value LIFO inventories for financial reports is expressly permitted under §1.472-2(e)(1)(v) ([Treas. Reg. §1.472-2(e)(1)(v), Cornell LII](https://www.law.cornell.edu/cfr/text/26/1.472-2)).

**LIFO eligibility considerations for retail.** LIFO presumes that costs rise over time and that the most recently purchased goods are charged to cost of sales first. **Perishable inventory is typically NOT LIFO-suitable**, because physical first-in-first-out rotation is mandatory for food safety and spoilage control, and because the unsold "old layers" assumption is incompatible with goods that must be sold or discarded by a pull date (Part V). LIFO is therefore concentrated in non-perishable grocery dry goods, hardware, and general merchandise rather than fresh categories ([Retail Inventory Management Guide — FIFO recommended for perishable products, LIFO for non-perishable / non-obsolescence-risk goods](https://www.scribd.com/document/726220814/2nd-sem-project-1-1)).

**Sub-segment applicability.**

| LIFO disclosure element | B | E | O | G | S |
|---|---|---|---|---|---|
| Basis-of-stating / major classes (50-1) | ✓ | ✓ | ✓ | ✓ | ✓ |
| LIFO reserve disclosure | ◑ | — | ◑ | ✓ | ◑ |
| LIFO liquidation impact | ◑ | — | ◑ | ✓ | ◑ |
| Tax conformity exposure (§1.472-2(e)) | ◑ | — | ◑ | ✓ | ◑ |

---

## I.4 Lower of Cost and Net Realizable Value (LCNRV)

**The standard — ASU 2015-11.** In July 2015 FASB issued **ASU 2015-11, *Inventory (Topic 330): Simplifying the Measurement of Inventory***, which requires entities to measure inventory at the **lower of cost and net realizable value (LCNRV)** — **but only for inventories measured using FIFO or average cost.** The ASU "does not apply to inventories accounted for under last-in, first-out (LIFO) or the retail inventory method," which continue to apply the legacy **lower of cost or market (LCM)** model ([Dean Dorton — Highlights of FASB's ASU 2015-11, LIFO and retail method excluded](https://deandorton.com/highlights-of-fasbs-asu-2015-11/); [CPA Hall Talk — Simplifying the Measurement of Inventory, LIFO/RIM continue LCM where market is replacement cost](https://cpahalltalk.com/accounting-measurement-inventory/)). The ASU was effective for **public business entities for fiscal years beginning after December 15, 2016**, and for **all other entities for fiscal years beginning after December 15, 2017** ([Dean Dorton — ASU 2015-11 effective dates](https://deandorton.com/highlights-of-fasbs-asu-2015-11/)).

**Net realizable value definition.** NRV is "the estimated selling price in the ordinary course of business, less reasonably predictable costs of completion, disposal, and transportation" ([CPA Hall Talk — NRV definition under ASU 2015-11](https://cpahalltalk.com/accounting-measurement-inventory/); [The CPA Journal — "Net Realizable Value" Is the New "Market"](https://www.cpajournal.com/2018/06/26/net-realizable-value-is-the-new-market/)).

**Measurement — ASC 330-10-35.** Verbatim, **ASC 330-10-35-1**: "A departure from the cost basis of pricing the inventory is required when the utility of the goods is no longer as great as their cost." ([FASB ASC 330-10-35-1, quoted in PhDessay summary of ASC 330-10](https://phdessay.com/asc-330-10/)). Under the ASU, for FIFO/average-cost inventory the only comparison is **cost versus NRV** — the need to determine replacement cost and evaluate the ceiling (NRV) and floor (NRV less normal profit margin) is eliminated ([IAS Plus / Deloitte — Heads Up on the ASU, eliminates replacement-cost ceiling/floor for non-LIFO/non-RIM](https://iasplus.com/content/4ae32e9c-dc8c-42ca-8037-db1b0069a630)). The measurement guidance spans **ASC 330-10-35-1 through 35-11**.

**LIFO and retail-method inventories still measured at LCM (legacy).** For inventory measured under LIFO or the retail method, "market" remains **current replacement cost, subject to a ceiling of NRV and a floor of NRV less a normal profit margin" ([KPMG — IFRS vs US GAAP inventory, LIFO/retail compare cost to market not NRV](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html); [AccountingIQ — LCM for LIFO and retail inventory method, ceiling NRV / floor NRV less normal profit](https://www.accountingaitutor.com/study-guides/lower-of-cost-or-market-inventory-write-down-asc-330-journal-entries)). A subtle consequence: the term "market" should no longer appear in inventory accounting-policy disclosures **except** in transition or where inventory is priced on a LIFO or retail-method basis ([The CPA Journal — "market" retained only for LIFO/retail under ASU 2015-11](https://www.cpajournal.com/2018/06/26/net-realizable-value-is-the-new-market/)).

**Sub-segment applicability.**

| Measurement model | B | E | O | G | S |
|---|---|---|---|---|---|
| LCNRV (FIFO / avg cost) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Legacy LCM (LIFO / RIM) | ◑ | — | ◑ | ✓ | ✓ |

Specialty/apparel (S) is **✓** for LCM because RIM-conventional and RIM-LIFO are common in that sector; grocery (G) is **✓** for LCM where LIFO or RIM-LIFO is elected.

---

## I.5 Markdowns and Impairment of Inventory Carrying Value

**The standard.** When the utility of merchandise declines below cost — through obsolescence, fashion risk, seasonal expiry, or perishability — the carrying amount must be written down to the applicable market/NRV measure (ASC 330-10-35-1, quoted in §I.4). For FIFO/average-cost inventory the trigger is **carrying cost > NRV**; for LIFO/RIM inventory the trigger is **carrying cost > market (replacement cost within the NRV ceiling/floor)**.

**Permanent vs. promotional markdowns.** A **permanent markdown** is a reduction in the retail selling price that is not expected to be reversed — it reflects a genuine, sustained decline in the merchandise's realizable value and is recognized as a reduction in inventory carrying value and gross margin. A **promotional (or "point-of-sale") markdown** is a temporary price reduction (e.g., a weekend sale) that does not reflect a permanent decline in utility; it reduces realized gross margin when the sale occurs but does not, on its own, require a carrying-value write-down of unsold inventory. The accounting and RIM mechanics distinguish the two (Part IV expands this). For tax-method RIM, the regulation explicitly distinguishes permanent from temporary markups and markdowns: "A taxpayer must include all permanent markups and markdowns but may not include temporary markups or markdowns in determining the retail selling prices of goods on hand at the end of the taxable year" ([Treas. Reg. §1.471-8(b)(4), Cornell LII](https://www.law.cornell.edu/cfr/text/26/1.471-8)).

**Reversal prohibition for non-LIFO (ASU 2015-11 / ASC 330-10-35).** Under U.S. GAAP, once inventory is written down to NRV (or market), the reduced value **becomes the new cost basis and cannot be written back up** even if value later recovers — a write-down is a permanent impairment ([Houseblend — ASC 330 write-downs irreversible, ASC 330-10-35-14](https://www.houseblend.io/articles/asc-330-inventory-valuation-write-downs); [AccountingIQ — write-downs to LCNRV cannot be reversed under U.S. GAAP](https://www.accountingaitutor.com/study-guides/lower-of-cost-or-market-inventory-write-down-asc-330-journal-entries)). This is the single most-tested U.S. GAAP–vs–IFRS contrast in inventory: under U.S. GAAP the lower value sticks; under IAS 2 a write-down is reversed when NRV recovers (Part VIII) ([KPMG — IFRS vs US GAAP inventory, IFRS permits reversal](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)).

**SEC comment-letter pattern — valuation allowance vs. write-down.** The SEC staff scrutinizes whether registrants maintain an inventory valuation allowance through which subsequent recoveries are recorded, which would be inconsistent with the irreversibility principle; staff cite **SAB Topic 5.BB and ASC 330-10-35-14** in these comments ([Deloitte DART — Roadmap: SEC Comment Letter Considerations §2.12A Inventory, valuation-allowance recovery comments](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-sec-comment-letter-considerations/chapter-2-financial-statement-accounting-disclosure/2-13-inventory)).

**Sub-segment applicability.**

| B | E | O | G | S |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

Markdown/impairment exposure is highest for **Specialty/apparel (S)** (fashion and seasonal risk) and **Grocery (G)** (perishability and pull-date expiry), and is present but lower for staple/basics-heavy assortments. **[JUDGMENT AREA]** — the permanent-vs-promotional distinction and the NRV trigger point both require management judgment.

---

# PART II — RETAIL INVENTORY METHOD (RIM)

---

## II.1 Definition and AICPA Guidance

**Definition.** The **retail inventory method (RIM)** calculates a retail store's ending inventory at cost by applying a **cost-to-retail ratio** (the "cost complement") to ending inventory stated at retail selling prices — a "reverse markup" procedure ([KPMG — Handbook: Inventory, RIM definition (cost-to-retail price ratio)](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2023/handbook-inventory.pdf)). RIM is permitted as a cost-flow / measurement-convenience method under ASC 330 and is widely used by retailers carrying large volumes of similar, fast-moving items ([Oracle NetSuite — Retail Accounting vs Cost Accounting, retail method formula](https://www.netsuite.com/portal/resource/articles/accounting/retail-accounting-cost-accounting.shtml)).

**AICPA guidance — verification of the correct title.** The retail-specific AICPA guidance has a layered history, and there is **no single currently-maintained AICPA Audit and Accounting Guide titled "Retail" or "AAG-CAR"** in the present-day AICPA-CIMA catalog. The historical and current sources are:

- The earliest authoritative retail-method literature is **Accounting Research Bulletin (ARB) No. 43, *Restatement and Revision of Accounting Research Bulletins*** (Chapter 4, Inventory Pricing), which the AICPA's retail-industry Audit Risk Alerts cite as "the primary literature on inventory accounting" — its substance is now codified in ASC 330 ([AICPA — Retail industry developments 2001/02 Audit Risk Alert, ARB No. 43 as primary inventory literature](https://egrove.olemiss.edu/cgi/viewcontent.cgi?article=1182&context=aicpa_indev)).
- The AICPA historically issued retail-sector **Audit Risk Alerts** ("Retail industry developments," e.g., the 1996/97 and 2001/02 editions) discussing inventory valuation, cost-flow assumptions, obsolescence, and shrinkage for retail auditors ([AICPA — Retail industry developments 1996/97 Audit Risk Alert, inventory valuation / obsolescence / shrinkage](https://core.ac.uk/download/pdf/288030073.pdf)).
- Current AICPA-CIMA accounting-and-auditing publications relevant to retailers include the **Audit and Accounting Guide *Revenue Recognition*** (which carries the retail/consumer-products industry implementation papers) ([AICPA-CIMA — Revenue Recognition Audit and Accounting Guide](https://www.aicpa-cima.com/cpe-learning/publication/revenue-recognition-audit-and-accounting-guide)) and the general **Accounting and Auditing Publications** resource index ([AICPA-CIMA — Accounting and Auditing Publications index](https://www.aicpa-cima.com/resources/article/accounting-and-auditing-publications)).

**Correction note (vs. planning-doc placeholder).** The Wave 1 planning document's working reference to "AAG-CAR (Audit & Accounting Guide for Retail)" is **not a verifiable current AICPA guide title** — "AAG-CAR" historically maps to the *Casinos*-adjacent guides, not retail. The accurate position is: **retail inventory-method authority lives in ASC 330 (codifying ARB No. 43), the tax retail method in Treas. Reg. §1.471-8, and AICPA retail guidance is dispersed across Audit Risk Alerts and the Revenue Recognition AAG rather than a standalone retail AAG.** This document cites those primary sources directly rather than a non-existent standalone guide.

**Sub-segment applicability.**

| B | E | O | G | S |
|---|---|---|---|---|
| ✓ | ◑ | ✓ | ◑ | ✓ |

RIM is **✓** for Brick-and-mortar (B), Omnichannel (O), and Specialty/apparel (S) — department-store and apparel chains are the classic RIM users — and **◑** for pure E-commerce (E) and Grocery (G), where SKU-level perpetual cost systems are more common (E) or where perishable categories require item-level cost tracking (G).

---

## II.2 ASC 330-10-30-13 — The Retail Method

**The standard (verbatim).** **ASC 330-10-30-13**: "If a business is dealing in many varied lines, it may use an average, although the business may use different methods for different lines. Some entities use methods of valuing inventory at cost (such as the retail inventory method) that are designed to approximate cost or the lower of cost or market." The Codification expressly recognizes the retail inventory method as a permitted approach to approximate cost ([FASB ASC 330-10-30-13, recognized in KPMG — Handbook: Inventory discussion of cost-flow techniques approximating cost](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2023/handbook-inventory.pdf); methods that "reasonably approximate" one of the recognized cost-flow assumptions are acceptable per the standard-cost / retail-method principle in ASC 330-10-30-12/30-13 as discussed in [Deloitte — Heads Up on inventory disclosures, ASC 330-10-30-12 standard-cost/approximation amendment](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2017/fasb-proposes-updates-inventory-disclosures-jan)).

**Three RIM variants.** RIM is applied under one of three cost-flow approaches ([Chapter 28 Gross Profit and Retail Method — conservative/conventional vs. average vs. FIFO/LIFO approaches](https://pt.scribd.com/document/571093418/CFAS-TFA-28); [Final Exam Intermediate Accounting — average-cost retail method](https://it.scribd.com/document/590003546/Final-Examination-in-Intermediate-Accounting-1-1)):

1. **Conventional RIM (LCM approach).** The cost-to-retail ratio is computed by **including net markups and excluding net markdowns** in goods available for sale at retail. This deliberate omission of markdowns produces a lower (more conservative) cost ratio that **approximates the lower of average cost and market (NRV)** ([CourseHero — conventional retail is the application of LCM to the retail method; markdowns excluded to approximate LCM](https://www.coursehero.com/file/p5add8rd/Question-10-AICPA08211241FAR-IIA-Smith-Co-has-a-checking-account-at-Small-Bank/)).
2. **Cost RIM.** The cost-to-retail ratio reflects **both markups and markdowns**, yielding an approximation of **cost** (not LCM).
3. **Average cost RIM.** Beginning inventory and current purchases are merged, and the cost ratio includes both net markups and net markdowns, producing an **average-cost** approximation ([YouTube — Retail Inventory Average Cost method, includes markups and markdowns before computing ratio](https://www.youtube.com/watch?v=dcQ6xLmZ1WI)).

**IFRS link.** IAS 2 paragraph 22 likewise contemplates that the retail-method percentage "shall take into consideration inventory that has been marked down to below the original selling price," which aligns the IFRS retail-method computation with the **average cost approach** rather than the conventional/LCM approach ([Chapter 28 Gross Profit and Retail Method — PAS/IAS 2 paragraph 22 requires markdown-adjusted percentage, i.e. average cost approach](https://pt.scribd.com/document/571093418/CFAS-TFA-28)).

---

## II.3 Mechanics — Markup and Markdown Application

**Cost-to-retail ratio computation.** The core RIM steps are ([Xero — Understanding the Retail Inventory Method, five-step computation](https://www.xero.com/us/guides/retail-accounting/); [Stord — Should You Use the Retail Inventory Method, cost-to-retail ratio steps](https://www.stord.com/blog/should-you-use-the-retail-inventory-method)):

\[ \text{Cost-to-retail ratio} = \frac{\text{Goods available for sale at cost}}{\text{Goods available for sale at retail}} \]

\[ \text{Ending inventory at retail} = \text{Beginning inventory at retail} + \text{Purchases at retail} - \text{Net sales} \]

\[ \text{Ending inventory at cost} = \text{Ending inventory at retail} \times \text{Cost-to-retail ratio} \]

\[ \text{COGS} = \text{Net sales} \times \text{Cost-to-retail ratio} \]

**Markup application.** Initial markup is the spread between cost and original retail. **Additional markups** (increases in selling price above original retail) are added to the retail column. Under all approaches, markups are included in the goods-available-at-retail denominator before computing the ratio ([YouTube — Retail Inventory Average Cost method, initial vs additional markup terminology](https://www.youtube.com/watch?v=dcQ6xLmZ1WI)).

**Markdown handling (regular vs. clearance).** **Markdowns** (reductions in selling price) are the pivotal RIM variable. Under **conventional (LCM) RIM**, net markdowns are **excluded** from the cost-ratio denominator, intentionally inflating the retail base relative to cost so the resulting ratio is conservative and approximates LCM ([CourseHero — conventional RIM excludes markdowns from the cost ratio for LCM approximation](https://www.coursehero.com/file/p5add8rd/Question-10-AICPA08211241FAR-IIA-Smith-Co-has-a-checking-account-at-Small-Bank/)). Under **cost / average-cost RIM**, markdowns are **included**. *Regular* (promotional) markdowns and *clearance* (permanent) markdowns are both retail-only adjustments; the distinction matters chiefly for whether the markdown signals a permanent NRV decline (Parts I.5 and IV).

**Shrink reserve interaction with RIM.** RIM accumulates a **book inventory at retail**; physical counts reveal that actual on-hand retail value is lower, and the gap is **shrink** (Part III). Shrink is recorded as a reduction to the retail column. In RIM mechanics, **normal (expected) shrinkage is subtracted from the retail column after the cost-to-retail ratio is computed**, whereas **abnormal shortages are subtracted from both the cost and retail columns** before the ratio ([YouTube — Retail Inventory Average Cost method, normal shrinkage subtracted from retail only after ratio; abnormal from both before](https://www.youtube.com/watch?v=dcQ6xLmZ1WI); [Intermediate Accounting 2 reviewer — normal spoilage deducted from both; abnormal after ratio](https://www.scribd.com/document/940582497/Intermediate-Accounting-2-Inventory-Reviewer-3)).

---

## II.4 RIM vs. RIM-LIFO

**Combined RIM + LIFO.** Department stores and general-merchandise chains commonly combine the retail method with LIFO ("RIM-LIFO" or the "LIFO retail method"). A representative disclosure: "Merchandise inventories are valued at lower of cost or market using the last-in, first-out (LIFO) retail inventory method. Under the retail inventory method, inventory is segregated into departments of merchandise having similar characteristics, and is stated at its current retail selling value. Inventory retail values are converted to a cost basis by applying specific average cost factors for each merchandise department." ([SEC EDGAR — LIFO retail inventory method merchandise-inventory disclosure](https://www.sec.gov/Archives/edgar/data/794367/000079436712000145/filename1.htm)).

**Conformity.** Under the tax regulations, **a taxpayer using LIFO with the retail inventory method uses the retail *cost* method** (not the retail LCM method). Verbatim, **Treas. Reg. §1.471-8(c)**: "A taxpayer using the last-in, first-out (LIFO) inventory method with the retail inventory method uses the retail cost method." ([Treas. Reg. §1.471-8(c), Cornell LII](https://www.law.cornell.edu/cfr/text/26/1.471-8)). The combined approach therefore pairs ASC 330-10-30-13 (retail method) with the ASC 330 LIFO model and the §1.472-2(e) conformity rule (Part I.3).

**SEC scrutiny of RIM-LIFO LCM interplay.** SEC staff have commented on registrants stating that "inventories are stated at FIFO cost determined under the retail inventory method which approximates lower of cost or market," noting that under **ASC 330-10-35, paragraphs 4 and 5**, if evidence indicates that LIFO RIM cost will be recovered with approximately normal profit upon sale, no loss should be recognized even where replacement cost is lower ([SEC EDGAR — comment letter citing ASC 330-10-35-4/-5 on LIFO RIM lower-of-cost-or-market](https://www.sec.gov/Archives/edgar/data/28917/000000000012028741/filename1.pdf)).

---

## II.5 Audit Considerations

**RIM precision and estimation uncertainty.** RIM is an **estimation technique**; its accuracy depends on the homogeneity of departments (the cost-to-retail ratio assumes that the items remaining in ending inventory carry the same cost-retail mix as goods available for sale). AICPA retail audit guidance directs auditors to assess inventory valuation through analytical procedures — examining inventory turnover, comparing to industry experience and trends, and evaluating obsolescence, shrinkage, and demand changes on NRV ([AICPA — Retail industry developments 1996/97 Audit Risk Alert, inventory valuation procedures: turnover analysis, obsolescence, shrinkage, NRV](https://core.ac.uk/download/pdf/288030073.pdf)). Existence is established by **observation of physical inventory counts** and confirmation of off-site inventory ([AICPA — Retail Audit Risk Alert, physical-count observation for existence assertion](https://core.ac.uk/download/pdf/288030073.pdf)).

**Estimate review under ASC 275.** **ASC 275-10-50** requires disclosure of significant estimates applicable to inventory — RIM cost-to-retail ratios, shrink reserves, and markdown reserves are all estimates within scope ([Deloitte DART — Roadmap: SEC Comment Letter Considerations §2.12A, ASC 275-10-50 inventory estimate disclosures](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-sec-comment-letter-considerations/chapter-2-financial-statement-accounting-disclosure/2-13-inventory)). **[JUDGMENT AREA].**

---

## II.6 IFRS Divergence

**IAS 2.22 permits the retail method.** Verbatim, the relevant principle: "Techniques for the measurement of the cost of inventories, such as the standard cost method or the retail method, may be used for convenience if the results approximate cost. … The retail method is often used in the retail industry for measuring inventories of large numbers of rapidly changing items with similar margins for which it is impracticable to use other costing methods. The cost of the inventory is determined by reducing the sales value of the inventory by the appropriate percentage gross margin." (IAS 2 paragraph 22.) IAS 2 paragraph 22 further provides that "the percentage used takes into consideration inventory that has been marked down to below its original selling price." ([Chapter 28 Gross Profit and Retail Method — IAS 2 paragraph 22 retail-method percentage including markdowns](https://pt.scribd.com/document/571093418/CFAS-TFA-28); [Oracle NetSuite — retail method as IFRS-acceptable measurement convenience](https://www.netsuite.com/portal/resource/articles/accounting/retail-accounting-cost-accounting.shtml)).

**IAS 2 prohibits LIFO — so RIM-LIFO has no IFRS equivalent.** Because IAS 2 permits only FIFO and weighted average (Part VIII.1), the U.S. GAAP **RIM-LIFO** combined method **has no IFRS counterpart** — an IFRS retailer using the retail method must pair it with FIFO or weighted average, producing an average-cost/markdown-adjusted percentage rather than a LIFO layer ([KPMG — IFRS vs US GAAP inventory, LIFO prohibited under IAS 2](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html); [Deloitte DART — §1.4 Inventories IFRS/US GAAP comparison, LIFO not permitted under IAS 2](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-1-assets/1-4-inventories)). IAS 2 is also less prescriptive than the U.S. conventional-vs-cost-vs-average RIM taxonomy — it specifies only that the percentage take markdowns into account and approximate cost.

**Sub-segment applicability (IFRS retail-method use).**

| B | E | O | G | S |
|---|---|---|---|---|
| ✓ | ◑ | ✓ | ◑ | ✓ |

---

# PART III — SHRINK RESERVE

---

## III.1 Definition and Components

**Definition.** **Shrink (shrinkage)** is the difference between the inventory a retailer's books say it should have and the inventory it actually has on hand, measured at a physical count. Shrink is the aggregate inventory loss from theft, error, and fraud.

**Known vs. unknown shrink.** *Known shrink* is loss that has been identified and counted (e.g., documented damage, recorded write-offs); *unknown shrink* is the residual gap revealed only when a physical count is reconciled to book inventory and must be **estimated** between counts.

**Sources of shrink.** The principal drivers are **external theft / shoplifting, employee (internal) theft, paperwork and process errors, vendor fraud, and organized retail crime (ORC)** ([NRF — The Impact of Retail Theft & Violence 2024, shrink sources](https://nrf.com/research/the-impact-of-retail-theft-violence-2024)).

**NRF benchmarks (most recent edition).** Industry benchmarks put average shrinkage at approximately **1.4% to 1.6% of total retail sales**, based on the most recently published NRF annual shrink data ([InVue — 6 Retail Shrinkage Statistics, ~1.4%–1.6% of total retail sales per last NRF report](https://invue.com/resource-center/blog/6-retail-shrinkage-statistics)). The NRF previously published the annual **National Retail Security Survey (NRSS)** (e.g., the 2023 edition) ([NRF — National Retail Security Survey 2023](https://nrf.com/research/national-retail-security-survey-2023)), and earlier reported retail shrink as a "nearly $100 billion problem" ([NRF — Retail Shrink Nearly a $100B Problem press release](https://nrf.com/media-center/press-releases/nrf-reports-retail-shrink-nearly-100b-problem)). **Currency note:** after more than three decades, the NRF discontinued the standalone annual NRSS in 2024 and folded shrink/loss content into **The Impact of Retail Theft & Violence (2024)** ([Retail Dive — NRF won't publish its annual retail shrink report (2024)](https://www.retaildive.com/news/no-nrf-annual-retail-shrink-report-2024/729009/); [NRF — The Impact of Retail Theft & Violence 2024](https://nrf.com/research/the-impact-of-retail-theft-violence-2024)). Cite the 2024 "Impact" report as the current NRF edition and the 2023 NRSS as the last standalone survey.

---

## III.2 Accounting Treatment

**Cost determination — ASC 330-10-30-1.** Inventory is recorded at cost when first recognized; shrink is the loss of recorded cost when goods physically disappear. The general cost-determination principle is **ASC 330-10-30-1** ("the primary basis of accounting for inventories is cost") ([FASB ASC 330-10-30, initial-measurement guidance via Deloitte DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10/deloitte-guidance/330-10-30-initial-measurement-deloitte)).

**Periodic physical count vs. cycle counts.** Retailers establish actual on-hand quantities through **periodic full physical inventories** (often annual or semi-annual) and/or **cycle counts** (rolling counts of subsets of SKUs). Between counts, **unknown shrink is estimated** based on historical shrink rates by category and location.

**Shrink reserve as inventory contra-account.** The estimate of unknown shrink incurred but not yet revealed by a physical count is booked as a **shrink reserve** — a contra-inventory account that reduces book inventory to expected realizable quantity, with the offsetting charge in cost of sales. The reserve is trued-up when the next physical count establishes actual shrink. A representative accounting-policy disclosure pairs the inventory-valuation basis with explicit shrinkage and reserve policies ([O'Reilly / Wiley GAAP — Example 22.1: Inventory Accounting Policy Including Basis of Valuations, Method of Determining Cost, Shrinkage, Reserves](https://www.oreilly.com/library/view/wiley-gaap-financial/9781118572085/c22.xhtml)).

---

## III.3 Disclosure Requirements

**SEC comment-letter patterns.** The SEC staff frequently comments on inventory **valuation allowances and reserve rollforwards** (Schedule II), asking registrants to clarify whether subsequent recoveries are recorded through the allowance and how that squares with the irreversibility guidance in **SAB Topic 5.BB and ASC 330-10-35-14** ([Deloitte DART — Roadmap: SEC Comment Letter Considerations §2.12A Inventory, reserve-rollforward and recovery comments](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-sec-comment-letter-considerations/chapter-2-financial-statement-accounting-disclosure/2-13-inventory)). Shrink-specific disclosure is typically embedded in the inventory accounting-policy note and in MD&A.

**MD&A discussion (Reg S-K Item 303).** Shrink rate is a standard MD&A metric. Item 303 requires disclosure of "known trends or uncertainties that have had or that are reasonably likely to have a material favorable or unfavorable impact on net sales or revenues or income from continuing operations," and changes in the relationship between costs and revenues — including **inventory adjustments** — must be disclosed ([17 CFR 229.303 (Item 303) MD&A, Cornell LII — known trends, cost/revenue relationship, inventory adjustments](https://www.law.cornell.edu/cfr/text/17/229.303)). A rising shrink rate is precisely the kind of cost-of-sales trend Item 303 targets.

---

## III.4 G Sub-Segment Specifics

**Perishable shrink — higher absolute rates.** Grocery (G) carries the highest absolute shrink because **perishables — produce, dairy, deli, meat — spoil**. Grocery shrink blends **theft** with **spoilage/waste**, and the spoilage component is structurally larger than in non-food retail.

**Spoilage vs. theft distinction.** For accounting and disclosure, grocers distinguish **spoilage/expiry write-offs** (a function of pull dates and demand forecasting — Part V) from **theft/ORC shrink** (a loss-prevention issue). Both reduce inventory, but they are driven by different operational levers and are often disclosed and managed separately. AICPA retail guidance flags obsolescence, shrinkage, and NRV as interrelated valuation considerations requiring industry-specific audit expertise ([AICPA — Retail industry developments Audit Risk Alert, obsolescence/shrinkage/NRV valuation](https://core.ac.uk/download/pdf/288030073.pdf)).

**Sub-segment applicability.**

| Shrink topic | B | E | O | G | S |
|---|---|---|---|---|---|
| Theft / ORC shrink | ✓ | ◑ | ✓ | ✓ | ✓ |
| Spoilage / expiry shrink | ◑ | — | ◑ | ✓ | — |
| Shrink reserve (contra-inventory) | ✓ | ◑ | ✓ | ✓ | ✓ |
| Fraud / process-error shrink | ✓ | ✓ | ✓ | ✓ | ✓ |

E-commerce (E) is **◑** for theft (lower in-store shrink, but higher fulfillment fraud, chargeback, and return-fraud exposure) and **—** for spoilage (except grocery-delivery hybrids).


---

# PART IV — MARKDOWN CADENCE

---

## IV.1 Permanent vs. Promotional Markdowns

**The distinction restated.** Markdown *cadence* — the timing, depth, and reversibility of retail price reductions — is the central margin-management discipline in fashion and seasonal retail, and it drives both the RIM cost-to-retail ratio (Part II.3) and the NRV/LCM write-down trigger (Part I.4–I.5). Two species of markdown must be separated for accounting:

- **Permanent (clearance) markdown** — a sustained, non-reversible reduction in selling price taken because merchandise will not sell at its current ticket. It signals a genuine decline in net realizable value and is the retail-side evidence that an NRV/LCM write-down may be required. In RIM, permanent markdowns are recorded in the retail column as net markdowns.
- **Promotional (point-of-sale / temporary) markdown** — a short-lived price reduction (weekend sale, coupon, flash event) that reduces *realized* gross margin when goods sell but does not, by itself, indicate a permanent NRV decline in the unsold balance. It is a temporary markdown.

**Tax-method parallel (verbatim).** The retail tax method codifies precisely this permanent-vs-temporary split. **Treas. Reg. §1.471-8(b)** provides that, in computing the cost-complement and ending retail value, "a taxpayer must include all permanent markups and markdowns but may not include temporary markups or markdowns" in determining the retail selling prices of goods on hand at year end ([Treas. Reg. §1.471-8, Cornell LII](https://www.law.cornell.edu/cfr/text/26/1.471-8)). The financial-reporting RIM mirrors this: conventional (LCM) RIM excludes net markdowns from the cost-ratio denominator to drive a conservative ratio, while cost/average-cost RIM includes them (Part II.2–II.3).

**Markdown's link to the NRV test.** A permanent markdown that takes ticketed retail below the level at which the cost-to-retail ratio recovers cost is the operational trigger for the ASC 330-10-35-1 departure-from-cost test ("A departure from the cost basis of pricing the inventory is required when the utility of the goods is no longer as great as their cost") ([FASB ASC 330-10-35-1, quoted in PhDessay summary of ASC 330-10](https://phdessay.com/asc-330-10/)). For RIM/LIFO inventory, the SEC staff has noted that no loss is recognized where evidence shows the marked-down goods will still be recovered at approximately normal profit under **ASC 330-10-35-4 and 35-5** ([SEC EDGAR — comment letter citing ASC 330-10-35-4/-5 on LIFO RIM lower of cost or market](https://www.sec.gov/Archives/edgar/data/28917/000000000012028741/filename1.pdf)).

**Sub-segment applicability.**

| Markdown type | B | E | O | G | S |
|---|---|---|---|---|---|
| Permanent / clearance markdown | ✓ | ✓ | ✓ | ◑ | ✓ |
| Promotional / temporary markdown | ✓ | ✓ | ✓ | ✓ | ✓ |
| Markdown-driven NRV write-down | ◑ | ◑ | ◑ | ◑ | ✓ |

Permanent markdown intensity peaks in Specialty/apparel (S), where fashion and seasonal obsolescence force end-of-season clearance; Grocery (G) is **◑** for clearance markdowns (perishables are managed through pull-date markdown-then-discard rather than open-ended clearance — Part V).

---

## IV.2 Open-to-Buy (OTB) and Markdown Budgeting

**The discipline.** **Open-to-buy (OTB)** is the merchandising budget control that governs how much inventory (at retail and at cost) a buyer may commit for a future period, computed as planned sales plus planned markdowns plus planned end-of-period inventory, less planned beginning inventory and merchandise already on order. Markdowns are an explicit budgeted line in OTB; over-buying forces unplanned permanent markdowns, which compress gross margin and accelerate NRV exposure. OTB is a **management-control metric, not a disclosure**, but it produces the markdown-reserve estimate that *is* within the ASC 275 significant-estimate disclosure scope (Part II.5) ([Deloitte DART — Roadmap: SEC Comment Letter Considerations §2.12A Inventory, ASC 275-10-50 inventory estimate disclosures](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-sec-comment-letter-considerations/chapter-2-financial-statement-accounting-disclosure/2-13-inventory)). **[JUDGMENT AREA].**

**Markdown reserve.** Where a retailer estimates future permanent markdowns required to clear current-season inventory, it may book a **markdown reserve** (a contra-inventory estimate) so that ending inventory is stated at the lower expected realizable value. This reserve, like the shrink reserve (Part III.2), is an estimate trued up as actual clearance occurs; it interacts with the irreversibility rule (Part I.5) — once an NRV write-down is taken it cannot be reversed under U.S. GAAP ([Houseblend — ASC 330 write-downs irreversible (ASC 330-10-35-14)](https://www.houseblend.io/articles/asc-330-inventory-valuation-write-downs)).

**Sub-segment applicability.**

| B | E | O | G | S |
|---|---|---|---|---|
| ✓ | ◑ | ✓ | ◑ | ✓ |

OTB and markdown budgeting are core to multi-store assortment planning (B, O, S) and **◑** for pure E-commerce (E) (continuous-replenishment models) and Grocery (G) (perpetual auto-replenishment with pull-date discipline rather than seasonal OTB).

---

## IV.3 NRV Test Interaction (ASC 330-10-35)

**The standard (verbatim).** The markdown cadence feeds directly into the recurring NRV/LCM test. **ASC 330-10-35-1**: "A departure from the cost basis of pricing the inventory is required when the utility of the goods is no longer as great as their cost. Where there is evidence that the utility of goods, in their disposal in the ordinary course of business, will be less than cost, whether due to physical deterioration, obsolescence, changes in price levels, or other causes, the difference shall be recognized as a loss of the current period." ([FASB ASC 330-10-35-1, quoted in PhDessay summary of ASC 330-10](https://phdessay.com/asc-330-10/)). For FIFO/average-cost merchandise the comparison is **cost vs. NRV** (ASU 2015-11; Part I.4); for LIFO/RIM merchandise the comparison is **cost vs. market** within the NRV ceiling / NRV-less-normal-profit floor ([KPMG — IFRS vs US GAAP inventory, LIFO/retail compare cost to market](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)).

**Cadence-to-test linkage.** A retailer's planned markdown schedule is direct evidence in the NRV estimate: deep, accelerating, or repeated permanent markdowns on aging inventory cohorts indicate that NRV (estimated selling price less costs to complete, dispose, and transport — Part I.4) has fallen below carrying cost, requiring a current-period loss. The SEC staff comments on registrants whose markdown patterns suggest unrecognized NRV losses and on valuation-allowance mechanics that would improperly reverse such losses, citing **SAB Topic 5.BB and ASC 330-10-35-14** ([Deloitte DART — Roadmap: SEC Comment Letter Considerations §2.12A Inventory, valuation-allowance recovery comments](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-sec-comment-letter-considerations/chapter-2-financial-statement-accounting-disclosure/2-13-inventory)).

**IFRS note.** Under IAS 2, the same NRV test applies, but a prior write-down is **reversed** (up to original cost) when the circumstances that caused it no longer exist or NRV recovers — so a later-season markup recovery would reverse an earlier markdown-driven write-down for an IFRS tenant, which U.S. GAAP prohibits (Part VIII.1) ([KPMG — IFRS vs US GAAP inventory, IFRS permits reversal](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)).

**Sub-segment applicability.**

| B | E | O | G | S |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

---

## IV.4 S Sub-Segment Specifics — Seasonal Apparel and Clearance

**Fashion and seasonal risk.** Specialty/apparel (S) carries the highest structural markdown cadence: assortments are season-coded (spring/summer, fall/holiday), fashion risk is acute, and unsold inventory at season end has sharply lower NRV. The markdown ladder (first markdown → second markdown → final clearance) is a planned, repeated permanent-markdown sequence, and end-of-season clearance routinely drives NRV write-downs that, once taken, are irreversible under U.S. GAAP ([Houseblend — ASC 330 write-downs irreversible](https://www.houseblend.io/articles/asc-330-inventory-valuation-write-downs)).

**RIM-LIFO interaction.** Apparel and department-store retailers are the classic users of RIM and RIM-LIFO (Part II.4); the markdown ladder is recorded entirely in the retail column, and under conventional (LCM) RIM the exclusion of net markdowns from the cost ratio bakes a conservatism cushion into ending inventory ([CourseHero — conventional RIM excludes markdowns for LCM approximation](https://www.coursehero.com/file/p5add8rd/Question-10-AICPA08211241FAR-IIA-Smith-Co-has-a-checking-account-at-Small-Bank/)).

**Sub-segment applicability.**

| Markdown-cadence feature | B | E | O | G | S |
|---|---|---|---|---|---|
| Seasonal markdown ladder | ◑ | ◑ | ◑ | — | ✓ |
| Fashion-risk obsolescence | ◑ | ◑ | ◑ | — | ✓ |
| End-of-season clearance write-down | ◑ | ◑ | ◑ | — | ✓ |

Grocery (G) is **—** for the seasonal apparel ladder; its analog is the perishable pull-date markdown sequence covered in Part V.

---

# PART V — PERISHABLE OBSOLESCENCE (G SUB-SEGMENT)

---

## V.1 FIFO Discipline for Perishables

**The standard.** ASC 330 permits any consistent cost-flow assumption (ASC 330-10-30-9; Part I.2), but for perishables the physical and accounting flow must both be **first-in, first-out (FIFO)**. Verbatim, **ASC 330-10-30-9**: "Cost for inventory purposes may be determined under any one of several assumptions as to the flow of cost factors, such as first-in first-out (FIFO), average, and last-in first-out (LIFO). The major objective in selecting a method should be to choose the one which, under the circumstances, most clearly reflects periodic income." ([FASB ASC 330-10-30-9, quoted in Deloitte DART SEC comment-letter roadmap §2.12A Inventory](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-sec-comment-letter-considerations/chapter-2-financial-statement-accounting-disclosure/2-13-inventory)). For perishables, FIFO is the method that most clearly reflects income because the physical rotation is mandatory.

**Why LIFO fails for perishables.** LIFO presumes the most recently acquired goods are sold first and that an "old layer" of low-cost inventory persists indefinitely. Perishables cannot carry an old layer — they spoil and must be sold or discarded by a pull date — so LIFO is categorically unsuited to fresh categories ([Retail Inventory Management Guide — FIFO recommended for perishable products, LIFO for non-perishable / non-obsolescence-risk goods](https://www.scribd.com/document/726220814/2nd-sem-project-1-1)). Accordingly LIFO in grocery (Part I.2–I.3) is confined to non-perishable dry goods, and perishables are FIFO/average-cost with an LCNRV (not LCM) measurement model (Part I.4).

**Sub-segment applicability.**

| B | E | O | G | S |
|---|---|---|---|---|
| — | — | ◑ | ✓ | — |

Perishable FIFO discipline is **✓** for Grocery (G), **◑** for Omnichannel (O) with grocery-delivery operations, and **—** for non-food sub-segments.

---

## V.2 Pull-Date / Expiration Write-Offs and Donation Accounting

**Pull-date obsolescence.** Perishable obsolescence is governed by **pull dates / sell-by / use-by dates**. As inventory approaches its pull date, the retailer (a) takes a perishable **markdown** to accelerate sale (the grocery analog of the apparel clearance ladder — Part IV.4), then (b) **writes off** unsold expired product. The write-off is recognized as a current-period loss under ASC 330-10-35-1 ("physical deterioration" being an enumerated cause of the cost-basis departure) ([FASB ASC 330-10-35-1, quoted in PhDessay summary of ASC 330-10](https://phdessay.com/asc-330-10/)). The spoilage/expiry component is distinguished from theft/ORC shrink for management and disclosure (Part III.4).

**Donation accounting and the Bill Emerson Act.** Rather than discard, grocers frequently **donate** near-pull-date but still-wholesome food to food banks. The **Bill Emerson Good Samaritan Food Donation Act** (Pub. L. 104-210, 1996, codified at **42 U.S.C. §1791**) provides that "a person or gleaner shall not be subject to civil or criminal liability arising from the nature, age, packaging, or condition of apparently wholesome food or an apparently fit grocery product that the person or gleaner donates in good faith to a nonprofit organization for ultimate distribution to needy individuals," excepting only gross negligence or intentional misconduct ([Bill Emerson Good Samaritan Food Donation Act, 42 U.S.C. §1791, Cornell LII](https://www.law.cornell.edu/uscode/text/42/1791)). The Act expressly names a "retail grocer" within the definition of "person" and (as amended by the **Food Donation Improvement Act of 2022**, Pub. L. 117-362) extends protection to "qualified direct donors" including retail grocers ([Food Donation Improvement Act of 2022, Pub. L. 117-362, GovInfo](https://www.govinfo.gov/content/pkg/PLAW-117publ362/html/PLAW-117publ362.htm); [Bill Emerson Act overview, USDA Good Samaritan FAQs](https://www.usda.gov/sites/default/files/documents/usda-good-samaritan-faqs.pdf)).

**Accounting for donated inventory.** Donated food inventory is **not revenue**; the carrying cost of donated goods is removed from inventory and recognized as an expense (charitable contribution / cost of donated goods), not as a sale. The Act removes the *liability* barrier to donation but does not change the inventory-derecognition accounting, which follows the ASC 330-10-35-1 utility-decline loss model (the donated goods having little or no realizable sale value) ([FASB ASC 330-10-35-1, quoted in PhDessay summary of ASC 330-10](https://phdessay.com/asc-330-10/)). A C-corporation may claim an enhanced charitable-contribution deduction for qualified food inventory donations under **IRC §170(e)(3)**, a tax (not financial-reporting) consequence ([Bill Emerson Act / enhanced deduction overview, Harvard CHLPI federal liability protection fact sheet](https://chlpi.org/wp-content/uploads/2023/03/Emerson-Fact-Sheet.pdf)).

**Sub-segment applicability.**

| Perishable-obsolescence feature | B | E | O | G | S |
|---|---|---|---|---|---|
| Pull-date markdown then write-off | — | — | ◑ | ✓ | — |
| Donation / Bill Emerson Act | — | — | ◑ | ✓ | — |
| Enhanced charitable deduction (§170(e)(3)) | — | — | ◑ | ✓ | — |

---

## V.3 G-Specific Disclosure

**Disclosure surface.** Perishable obsolescence is disclosed through (a) the inventory accounting-policy note (cost-flow method, LCNRV basis, and spoilage/markdown reserve policy — Part I.3, III.2) ([O'Reilly / Wiley GAAP — Example 22.1: Inventory Accounting Policy including basis of valuation, method of determining cost, shrinkage, reserves](https://www.oreilly.com/library/view/wiley-gaap-financial/9781118572085/c22.xhtml)); (b) the ASC 275 significant-estimates disclosure for the spoilage/markdown reserve ([Deloitte DART — Roadmap: SEC Comment Letter Considerations §2.12A, ASC 275-10-50 inventory estimate disclosures](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-sec-comment-letter-considerations/chapter-2-financial-statement-accounting-disclosure/2-13-inventory)); and (c) MD&A (Reg S-K Item 303) where spoilage/waste trends materially affect cost of sales ([17 CFR 229.303 (Item 303) MD&A, Cornell LII](https://www.law.cornell.edu/cfr/text/17/229.303)). **[JUDGMENT AREA]** — the spoilage-reserve estimate and the markdown-vs-write-off cutoff both require management judgment.

**Sub-segment applicability.**

| B | E | O | G | S |
|---|---|---|---|---|
| — | — | ◑ | ✓ | — |

---

# PART VI — ASC 842 LEASES (Retail)

---

## VI.1 Dual Lessee Classification — The Five Criteria

**The standard (verbatim).** Under U.S. GAAP, a lessee classifies each lease as **finance** or **operating** at commencement. **ASC 842-10-25-2** provides that a lessee shall classify a lease as a **finance lease** if any one of the following five criteria is met: "(a) The lease transfers ownership of the underlying asset to the lessee by the end of the lease term. (b) The lease grants the lessee an option to purchase the underlying asset that the lessee is reasonably certain to exercise. (c) The lease term is for the major part of the remaining economic life of the underlying asset. … (d) The present value of the sum of the lease payments and any residual value guaranteed by the lessee … equals or exceeds substantially all of the fair value of the underlying asset. (e) The underlying asset is of such a specialized nature that it is expected to have no alternative use to the lessor at the end of the lease term." If none is met, the lease is an **operating lease** ([FASB ASC 842-10-25-2 five lease-classification criteria, Deloitte DART Roadmap: Leasing §8.3 Lease Classification](https://dart.deloitte.com/USDART/home/codification/broad-transactions/asc842-10/roadmap-leasing/chapter-8-lessee-accounting/8-3-lease-classification); [FinQuery — Capital/Finance vs Operating Lease under ASC 842, any one of five criteria triggers finance classification](https://finquery.com/blog/capital-finance-lease-vs-operating-lease-asc-842/)).

**Retail application.** Most retail real-estate leases — mall in-line stores, big-box anchors, strip-center units — are **operating leases**: title does not transfer, there is no bargain purchase option, the lease term is a minor part of the building's economic life, and the present-value test is not met. Finance classification arises mainly for build-to-suit / specialized fixtures or equipment leases. Both classes are now recognized on the balance sheet (Part VI.2), but the income-statement and cash-flow presentation differs (single straight-line lease cost for operating; front-loaded interest plus amortization for finance) ([FinQuery — operating vs finance presentation differences under ASC 842](https://finquery.com/blog/capital-finance-lease-vs-operating-lease-asc-842/)).

**Sub-segment applicability.**

| Lease class | B | E | O | G | S |
|---|---|---|---|---|---|
| Operating lease (stores) | ✓ | ◑ | ✓ | ✓ | ✓ |
| Finance lease (specialized / build-to-suit) | ◑ | ◑ | ◑ | ◑ | ◑ |
| Distribution-center / fulfillment lease | ◑ | ✓ | ✓ | ✓ | ◑ |

Pure E-commerce (E) is **◑** for store operating leases (few or no stores) but **✓** for distribution-center / fulfillment leases.

---

## VI.2 ROU Asset and Lease Liability

**The standard.** At commencement a lessee recognizes a **right-of-use (ROU) asset** and a **lease liability** for substantially all leases (both finance and operating), except short-term leases (≤12 months) where the recognition exemption is elected. The lease liability is the present value of the lease payments not yet paid; the ROU asset equals the liability plus initial direct costs and prepaid rent, less lease incentives ([FASB Topic 842 — lessee ROU asset / lease liability model, FASB.org Leases](https://www.fasb.org/leases_1)).

**Discount rate (verbatim).** **ASC 842-20-30-3** provides: "A lessee should use the rate implicit in the lease whenever that rate is readily determinable. If the rate implicit in the lease is not readily determinable, a lessee uses its incremental borrowing rate." A non-public lessee may elect to use a **risk-free rate** by class of underlying asset as a practical expedient ([FASB ASC 842-20-30-3 discount rate — rate implicit or incremental borrowing rate, SEC EDGAR lessee disclosure example](https://www.sec.gov/Archives/edgar/data/823277/000082327725000038/R24.htm)). The discount rate materially affects the lease-liability and ROU-asset measurement for retailers with large multi-store lease portfolios.

**Sub-segment applicability.**

| B | E | O | G | S |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

ROU recognition applies to every sub-segment with real-estate or equipment leases.

---

## VI.3 Percentage Rent

**The standard — variable lease payments.** Retail leases frequently include **percentage rent** — additional rent equal to a percentage of the tenant's sales above a breakpoint. Because percentage rent depends on future sales (not on an index or rate), it is a **variable lease payment** that does **not** depend on an index or rate, and under **ASC 842-10-15-39** such payments are **excluded** from the initial measurement of the lease liability and ROU asset and are instead **recognized in profit or loss in the period in which the obligating event (the sales threshold being met) occurs** ([FASB ASC 842-10-15-39 variable lease payments — percentage-of-sales rent expensed as incurred, RSM — Leases: Overview of ASC 842 (retail percentage-of-sales example)](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/leases-overview-of-asc-842.pdf); [Deloitte DART — Roadmap: Leasing §6.9 Amounts Not Considered Lease Payments](https://dart.deloitte.com/USDART/home/codification/broad-transactions/asc842-10/roadmap-leasing/chapter-6-lease-payments/6-9-amounts-not-considered-a)). The FASB's rationale (ASU 2016-02 Basis for Conclusions BC210) is that sales-based payments are too uncertain at commencement to capitalize ([Lease Ledger — how to treat percentage-of-sales rentals under ASC 842](https://www.leaseledgerapp.com/resources/how-to-treat-percentage-of-sales-rentals)).

**Retail application.** Percentage rent is ubiquitous in mall and shopping-center leases and is a defining feature of the retail occupancy-cost structure (Part VI.5). Only **fixed minimum (base) rent** and in-substance fixed payments are capitalized into the ROU/liability; the percentage-rent overage runs through occupancy expense as sales are recorded.

**Sub-segment applicability.**

| B | E | O | G | S |
|---|---|---|---|---|
| ✓ | — | ◑ | ◑ | ✓ |

Percentage rent is most common for mall/shopping-center tenants (B, S), **◑** for omnichannel/grocery anchors (sometimes percentage-rent-bearing, often flat-rent anchors), and **—** for pure E-commerce (E) with no retail storefronts.

---

## VI.4 CAM and Lease / Non-Lease Component Separation

**The standard.** Retail leases bundle **common-area maintenance (CAM)**, real-estate taxes, and insurance with the right to use the space. Under **ASC 842-10-15-28 through 15-31**, a lessee must identify and separate **lease components** from **non-lease components** (such as CAM, which is a service); consideration is allocated to each on a relative standalone-price basis, and only the lease component is capitalized into the ROU asset and lease liability ([FASB ASC 842-10-15-28 through 15-31 component separation, Deloitte DART Roadmap: Leasing §4.3 Identify Separate Non-Lease Components](https://dart.deloitte.com/USDART/home/codification/broad-transactions/asc842-10/roadmap-leasing/chapter-4-components-a-contract/4-3-identify-separate-nonlease-components)). Variable CAM, property taxes, and insurance that vary with usage or cost are variable payments excluded from the liability and expensed as incurred ([KPMG — Lessee accounting for variable payments under ASC 842](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2023/lessee-accounting-variable-payments.pdf)).

**Practical expedient (verbatim).** **ASC 842-10-15-37** permits a lessee, as an accounting-policy election by class of underlying asset, to "choose, as a practical expedient, not to separate nonlease components from lease components and instead to account for each separate lease component and the nonlease components associated with that lease component as a single lease component." Electing this expedient pulls CAM into the lease component, increasing the ROU asset and liability ([FASB ASC 842-10-15-37 single-lease-component practical expedient, CPEA — FASB ASC 842 Lease / Non-Lease Component Practical Expedient Special Report](https://assets.ctfassets.net/rb9cdnjh59cm/45hm73w6ldjTZUotdEfO8m/7f6e04a33cbb758594498dc6a6729931/cpea-june-2022-special-report-fasb-asc-842-lease-nonlease-component-practical-expedient.pdf)).

**Sub-segment applicability.**

| B | E | O | G | S |
|---|---|---|---|---|
| ✓ | ◑ | ✓ | ✓ | ✓ |

CAM and component separation apply to all real-estate-leasing sub-segments; **◑** for pure E-commerce (E) (warehouse/DC leases may have lighter CAM structures).

---

## VI.5 Occupancy Cost Ratio and ICSC Benchmarks

**Definition.** The **occupancy cost ratio (OCR)** is the retail real-estate efficiency benchmark:

\[ \text{Occupancy cost ratio} = \frac{\text{Total occupancy cost (base rent + CAM + percentage rent + property tax + insurance)}}{\text{Gross store sales}} \]

A healthy OCR sits roughly in the **8% to 12%** range; an OCR above ~15% generally signals tenant stress and renewal/closure risk ([LeaseParse — rent-roll analysis: occupancy cost ratio and healthy ranges](https://leaseparse.com/retail/rent-roll-analysis); [Adventures in CRE — occupancy cost percentage glossary (grocery ~2.5%, apparel 12%+)](https://www.adventuresincre.com/glossary/occupancy-cost-percentage/)).

**ICSC / category benchmarks.** ICSC and Datex category data (Q2 2024) show wide variation in sales per square foot and occupancy cost by tenant category — e.g., beauty supply ~$928 PSF at ~4.8% occupancy cost, fast food ~$772 PSF at ~6.4%, full-service restaurant ~$643 PSF at ~6.7%, movie theaters ~$104 PSF at ~25.0%, craft ~$119 PSF at ~12.8%, and fitness ~$122 PSF at ~19.4% ([ICSC / Datex Q2 2024 occupancy-cost and sales-PSF by category, posted via LinkedIn](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O)). Moody's mall-tier ranges run from ~9–11% (sales <$250 PSF) up to ~14–16% (sales >$350 PSF), with grocery/discount anchors as low as 1.5–2.5% and jewelry above 20% ([WealthManagement — A Guide to Occupancy Costs (mall-tier and category ranges)](https://www.wealthmanagement.com/investing-strategies/a-guide-to-occupancy-costs)). ICSC publishes lease/occupancy-cost teaching materials for its members ([ICSC — Law Conference workshop materials on occupancy cost](https://www.icsc.com/uploads/event_documents/2024LC_WS-16_-_Written_Materials.pdf)).

**Disclosure status.** OCR is a **management/MD&A KPI, not a codified disclosure**; it is the retail-real-estate analog of the occupancy metrics in `Retail_KPIs_Sources.md` (Module RTL-K-A) and is surfaced under Reg S-K Item 303 where occupancy-cost trends are material ([17 CFR 229.303 (Item 303) MD&A, Cornell LII](https://www.law.cornell.edu/cfr/text/17/229.303)). **[JUDGMENT AREA].**

**Sub-segment applicability.**

| B | E | O | G | S |
|---|---|---|---|---|
| ✓ | — | ◑ | ✓ | ✓ |

Grocery (G) carries a structurally low OCR (~2.5%, high sales density); Specialty/apparel (S) runs high (12%+); pure E-commerce (E) is **—** (no store occupancy cost, though fulfillment cost is its analog).

---

## VI.6 Reg S-X / ASC 842-20-50 Lease Disclosures

**The standard.** **ASC 842-20-50** sets the lessee disclosure package: the nature of leases; finance- and operating-lease cost; short-term and variable lease cost; the **weighted-average remaining lease term** and **weighted-average discount rate** for finance and operating leases separately; a **maturity analysis** of lease liabilities (undiscounted cash flows by year for five years plus a total of the remainder, reconciled to the discounted liability); and supplemental cash-flow information ([FASB ASC 842-20-50 lessee disclosure requirements, Deloitte DART Roadmap: Leasing §15.2 Lessee Disclosure Requirements](https://dart.deloitte.com/USDART/home/codification/broad-transactions/asc842-10/roadmap-leasing/chapter-15-disclosure/15-2-lessee-disclosure-requirements); [FinQuery — ASC 842 disclosure requirements: example and explanation](https://finquery.com/blog/asc-842-disclosure-requirements-example-explanation/)). A representative lessee disclosure presents the weighted-average operating-lease term, weighted-average discount rate, and the variable/percentage-rent and short-term lease cost lines ([SEC EDGAR — lessee ASC 842 disclosure example (weighted-average term/rate, variable lease cost)](https://www.sec.gov/Archives/edgar/data/823277/000082327725000038/R24.htm)).

**Retail relevance.** For retailers the maturity table and variable-lease-cost line (which captures percentage rent and variable CAM) are the highest-signal disclosures; analysts reconstruct the occupancy-cost structure (Part VI.5) from them.

**Sub-segment applicability.**

| B | E | O | G | S |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

---

## VI.7 IFRS 16 Single Lessee Model

**The standard.** Under **IFRS 16**, a lessee applies a **single on-balance-sheet model**: with limited exceptions (short-term and low-value-asset leases), all leases are recognized as an ROU asset and a lease liability, and the lessee recognizes **depreciation of the ROU asset and interest on the lease liability separately** — there is no operating/finance distinction for lessees ([IFRS 16 single lessee model, IFRS Foundation — IFRS 16 Leases](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-16-leases/); [KPMG — First Impressions: IFRS 16 Leases (single lessee model)](https://assets.kpmg.com/content/dam/kpmg/pdf/2016/06/first-impressions-ifrs-16-leases.pdf)).

**Divergence from ASC 842.** The U.S. GAAP dual model (Part VI.1) preserves a single straight-line lease *cost* for operating leases, whereas IFRS 16 front-loads total lease expense (interest + depreciation) for every capitalized lease. This re-baselines EBITDA and operating-cash-flow presentation differently for an IFRS-electing tenant; the variable-payment treatment (percentage rent excluded from the liability) is broadly the same under both ([Deloitte DART — Roadmap: IFRS & US GAAP Comparison §5.7 Leases (dual vs single lessee model)](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-5-broad-transactions/5-7-leases)).

**Sub-segment applicability (IFRS lessee model).**

| B | E | O | G | S |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

---

## VI.8 Lease Modifications — Co-Tenancy and Kick-Out Clauses

**The standard.** A **lease modification** is a change to the scope or consideration of a lease not part of the original terms. Under ASC 842, a modification is accounted for either as a separate new lease (if it grants an additional ROU at a standalone price) or as a remeasurement of the existing lease liability and ROU asset using a revised discount rate ([FASB Topic 842 — lease modification model, FASB.org Leases](https://www.fasb.org/leases_1)).

**Retail-specific clauses.** Two retail clauses interact with the modification and variable-payment guidance:

- **Co-tenancy clauses** — entitle a tenant to reduced (often percentage-based) rent or a termination right if anchor tenants or a minimum occupancy threshold is not maintained. Rent reductions triggered by co-tenancy are typically **variable lease payments** recognized when the contingency resolves, not a capitalized adjustment ([FASB ASC 842-10-15-39 variable lease payments, Deloitte DART Roadmap: Leasing §6.9](https://dart.deloitte.com/USDART/home/codification/broad-transactions/asc842-10/roadmap-leasing/chapter-6-lease-payments/6-9-amounts-not-considered-a)).
- **Kick-out clauses** — give the tenant (or landlord) the right to terminate if a sales threshold is not met. The likelihood of exercise affects the **lease term** determination at commencement and on reassessment, which in turn drives the ROU/liability measurement ([FASB ASC 842-10-25-2 classification turns on lease term, Deloitte DART Roadmap: Leasing §8.3](https://dart.deloitte.com/USDART/home/codification/broad-transactions/asc842-10/roadmap-leasing/chapter-8-lessee-accounting/8-3-lease-classification)). **[JUDGMENT AREA].**

**Sub-segment applicability.**

| B | E | O | G | S |
|---|---|---|---|---|
| ✓ | — | ◑ | ◑ | ✓ |

Co-tenancy and kick-out clauses are characteristic of mall/shopping-center tenants (B, S); **◑** for grocery anchors and omnichannel; **—** for pure E-commerce (E).

---

# PART VII — SEC REGULATION S-K DISCLOSURES (Retail)

---

## VII.1 Item 101 — Description of Business

**The standard.** **Reg S-K Item 101** (17 CFR 229.101) requires a description of the registrant's business. Item 101(c) was made **principles-based** by SEC Release No. 33-10825 (adopted August 26, 2020), requiring disclosure of topics material to an understanding of the business — including products/services, distribution methods, competitive conditions, sources and availability of raw materials/merchandise, seasonality, working-capital practices, and **human capital** ([SEC — Final Rule 33-10825, Modernization of Regulation S-K Items 101/103/105](https://www.sec.gov/files/rules/final/2020/33-10825.pdf); [SEC — Modernization of Regulation S-K Items 101, 103, 105 Small Entity Compliance Guide](https://www.sec.gov/resources-small-businesses/small-business-compliance-guides/modernization-regulation-s-k-items-101-103-105-small-entity-compliance-guide)).

**Retail application.** For retailers, Item 101(c) is where **seasonality** (holiday-quarter concentration), **merchandise sourcing / supplier concentration**, **store footprint and channel mix (B/E/O)**, and **working-capital / inventory practices** are narrated ([Cooley PubCo — SEC amendments modernize Reg S-K business and risk-factor disclosure](https://cooleypubco.com/2020/08/31/sec-amendments-modernize-reg-s-k-business-legal-risks/)).

**Sub-segment applicability.**

| Item 101(c) topic | B | E | O | G | S |
|---|---|---|---|---|---|
| Seasonality | ◑ | ◑ | ◑ | ◑ | ✓ |
| Merchandise sourcing / supplier concentration | ✓ | ✓ | ✓ | ✓ | ✓ |
| Store footprint / channel mix | ✓ | ✓ | ✓ | ✓ | ✓ |
| Human capital | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## VII.2 Item 105 — Risk Factors

**The standard.** **Reg S-K Item 105** (17 CFR 229.105), as amended by Release 33-10825, requires disclosure of **"the material factors that make an investment in the registrant or offering speculative or risky,"** organized under relevant headings; if the risk-factor section exceeds **15 pages**, a **summary of no more than two pages** must precede it, and generic risks must appear under a **"General Risk Factors"** heading ([17 CFR 229.105 (Item 105) Risk Factors, eCFR](https://www.ecfr.gov/current/title-17/chapter-II/part-229/subpart-229.100/section-229.105); [SEC — Final Rule 33-10825 (Item 105 materiality standard, 2-page summary, General Risk Factors heading)](https://www.sec.gov/files/rules/final/2020/33-10825.pdf)).

**Retail risk-factor categories.** Typical retail risk factors include consumer-spending sensitivity and macro/cyclicality; inventory/markdown and obsolescence risk; supply-chain and merchandise-sourcing concentration; shrink/theft and ORC; lease/occupancy-cost and co-tenancy exposure; channel-shift / e-commerce competition; data-security and payment-card risk; and seasonality ([Cooley PubCo — modernized Item 105 risk-factor framework](https://cooleypubco.com/2020/08/31/sec-amendments-modernize-reg-s-k-business-legal-risks/)).

**Sub-segment applicability.**

| Risk-factor category | B | E | O | G | S |
|---|---|---|---|---|---|
| Inventory / markdown / obsolescence | ◑ | ◑ | ◑ | ◑ | ✓ |
| Shrink / theft / ORC | ✓ | ◑ | ✓ | ✓ | ✓ |
| Lease / occupancy / co-tenancy | ✓ | — | ◑ | ✓ | ✓ |
| Perishability / food safety | — | — | ◑ | ✓ | — |
| Channel shift / e-commerce competition | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## VII.3 Item 303 — MD&A

**The standard (verbatim).** **Reg S-K Item 303** (17 CFR 229.303) requires Management's Discussion and Analysis. Item 303(b)(2)(ii) requires the registrant to "describe any known trends or uncertainties that have had or that are reasonably likely to have a material favorable or unfavorable impact on net sales or revenues or income from continuing operations," and where the financial statements reflect material changes in the relationship between costs and revenues, to disclose the underlying causes ([17 CFR 229.303 (Item 303) MD&A — known trends/uncertainties, cost/revenue relationship, Cornell LII](https://www.law.cornell.edu/cfr/text/17/229.303)). The SEC staff's MD&A focus areas are summarized in Deloitte's comment-letter roadmap ([Deloitte DART — Roadmap: SEC Comment Letter Considerations §3.1 Management's Discussion and Analysis](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-sec-comment-letter-considerations/chapter-3-sec-disclosure-topics/3-1-management-s-discussion-analysis)).

**Retail MD&A metrics.** Comparable-store (same-store) sales, gross margin and markdown trends, shrink rate, inventory turnover, occupancy-cost ratio, and channel-mix shifts are the standard retail MD&A trend disclosures — each a known-trend candidate under Item 303 ([Deloitte DART — Roadmap: SEC Comment Letter Considerations §3.3 Disclosures About Risk](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-sec-comment-letter-considerations/chapter-3-sec-disclosure-topics/3-3-disclosures-about-risk)).

**Sub-segment applicability.**

| B | E | O | G | S |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

---

## VII.4 Scoped-Out Items (402 / 404)

**Out of scope.** **Item 402** (executive compensation) and **Item 404** (related-party transactions) are general SEC registrant disclosures with no retail-specific content; they are **outside the scope** of this retail-disclosures module and are noted only for completeness. Likewise, FDA food-safety labeling, cannabis-licensing, and product-safety overlays are **out of scope** of this module per the planning-doc boundary.

**Sub-segment applicability.**

| B | E | O | G | S |
|---|---|---|---|---|
| — | — | — | — | — |

(Out of scope across all sub-segments — no retail-specific treatment.)

---

## VII.5 SEC Climate Disclosure — Status

**Status as of June 2026.** The SEC adopted **"The Enhancement and Standardization of Climate-Related Disclosures for Investors"** (Release No. 33-11275) on **March 6, 2024**, then **voluntarily stayed** it on **April 4, 2024** pending judicial review. On **March 27, 2025** the SEC voted to **end its defense** of the rule, and on **May 29, 2026** the SEC **proposed to rescind the climate-related disclosure rules in their entirety**. The climate rule is therefore **not in effect, not being defended, and the subject of a pending rescission proposal** — retailers are **not currently subject** to mandatory SEC climate disclosure ([SEC — Press Release 2025-58, SEC ends defense of climate disclosure rules (March 27, 2025)](https://www.sec.gov/newsroom/press-releases/2025-58); [SEC — Press Release 2026-49, SEC proposes rescission of climate-related disclosure rules (May 29, 2026)](https://www.sec.gov/newsroom/press-releases/2026-49-sec-proposes-rescission-climate-related-disclosure-rules)).

**Sub-segment applicability.**

| SEC climate rule (33-11275) — dormant; rescission proposed | B | E | O | G | S |
|---|---|---|---|---|---|
| Mandatory SEC climate disclosure | — | — | — | — | — |

(Not in effect across all sub-segments; California climate statutes — SB 253 / SB 261 — may apply to large retailers with a California nexus but are addressed in the peer manufacturing module and the IFRS source document, not re-derived here.)

---

# PART VIII — IFRS DIVERGENCE SUMMARY

---

## VIII.1 IAS 2.25 — LIFO Prohibition

**The standard (verbatim).** **IAS 2 paragraph 25**: "The cost of inventories … shall be assigned by using the first-in, first-out (FIFO) or weighted average cost formula." IAS 2 thereby **prohibits LIFO** — only FIFO and weighted-average are permitted ([IAS 2 paragraph 25 — FIFO or weighted-average only, IFRS Foundation IAS 2 Inventories](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2021/issued/ias2.html); [KPMG — Inventory: IFRS vs US GAAP (LIFO prohibited under IAS 2)](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html)).

**Consequence for retail.** An IFRS-electing retailer cannot use LIFO or RIM-LIFO (Part II.4); the LIFO reserve and LIFO-liquidation disclosures (Part I.3) are suppressed for IFRS tenants. Additionally, IAS 2 **requires reversal** of a prior inventory write-down (up to original cost) when NRV recovers — the opposite of the U.S. GAAP irreversibility rule (Parts I.5, IV.3) ([Deloitte DART — Roadmap: IFRS & US GAAP Comparison §1.4 Inventories (LIFO not permitted; write-down reversal required)](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-1-assets/1-4-inventories)).

---

## VIII.2 IFRS 16 — Single Lessee Model

**The standard.** **IFRS 16** applies a single on-balance-sheet lessee model (Part VI.7): all leases except short-term and low-value-asset leases produce an ROU asset and a lease liability, with separate depreciation and interest, and no operating-lease classification for lessees ([IFRS Foundation — IFRS 16 Leases (single lessee model)](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-16-leases/); [KPMG — First Impressions: IFRS 16 Leases](https://assets.kpmg.com/content/dam/kpmg/pdf/2016/06/first-impressions-ifrs-16-leases.pdf)).

**Divergence from ASC 842.** ASC 842 retains the **dual** operating/finance model for lessees (Part VI.1), so an IFRS retailer's store-lease expense is front-loaded (interest + depreciation) rather than straight-lined, re-baselining EBITDA and cash-flow presentation relative to a U.S. GAAP operating-lease peer ([Deloitte DART — Roadmap: IFRS & US GAAP Comparison §5.7 Leases](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-5-broad-transactions/5-7-leases)).

---

## VIII.3 IAS 36 — Store-Level CGU Impairment

**The standard.** **IAS 36** tests non-financial assets for impairment at the level of the **cash-generating unit (CGU)** — "the smallest identifiable group of assets that generates cash inflows that are largely independent of the cash inflows from other assets or groups of assets" (IAS 36.6) — and requires an **annual** impairment test for goodwill and indefinite-life intangibles regardless of indicators (IAS 36.10) ([IAS 36 paragraphs 6/10 — CGU definition and annual goodwill test, IFRS Foundation IAS 36 Impairment of Assets](https://www.ifrs.org/issued-standards/list-of-standards/ias-36-impairment-of-assets/); [IAS 36 PDF, IFRS Foundation](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-36-impairment-of-assets.pdf)). For a retailer, **an individual store is typically the CGU**, because each store generates largely independent cash inflows ([Grant Thornton — IAS 36: identifying cash-generating units (retail store as CGU)](https://www.grantthornton.global/globalassets/1.-member-firms/global/insights/insight-content-blocks-and-media/ifrs/ias-36/IFRS-ias-36---identifying-cash-generating-units.pdf); [IFRS Community — cash-generating units (CGU) knowledge base](https://ifrscommunity.com/knowledge-base/cash-generating-units-cgu/)).

**Divergence from US GAAP ASC 360.** U.S. GAAP tests long-lived assets for impairment at the **asset-group** level using a **two-step, trigger-based** model: a recoverability test (undiscounted future cash flows) followed, only if failed, by a fair-value write-down — and there is no annual test for finite-life store assets absent an indicator. IFRS uses a **single-step recoverable-amount** test (higher of fair value less costs of disposal and value in use, discounted) and **permits reversal** of prior impairments (except goodwill), whereas U.S. GAAP does not. The IAS 36 store-CGU model therefore can recognize store impairments earlier and reverse them later than ASC 360 ([Deloitte DART — Roadmap: IFRS & US GAAP Comparison §1.4 Inventories / impairment comparison context](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-1-assets/1-4-inventories)). **[JUDGMENT AREA].**

---

## VIII.4 IAS 2.22 — Retail Method

**The standard (verbatim).** **IAS 2 paragraph 22**: "Techniques for the measurement of the cost of inventories, such as the standard cost method or the retail method, may be used for convenience if the results approximate cost. … The retail method is often used in the retail industry for measuring inventories of large numbers of rapidly changing items that have similar margins and for which it is impracticable to use other costing methods. The cost of the inventory is determined by reducing the sales value of the inventory by the appropriate percentage gross margin. The percentage used takes into consideration inventory that has been marked down to below its original selling price." ([IAS 2 paragraph 22 — retail method as measurement convenience, percentage takes markdowns into account, IFRS Foundation IAS 2 Inventories](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2021/issued/ias2.html)).

**Divergence from US GAAP RIM.** Because IAS 2 mandates a markdown-adjusted percentage, the IFRS retail method aligns with the U.S. **average-cost** RIM approach rather than the conventional (LCM) approach that *excludes* markdowns (Part II.2). And because IAS 2 prohibits LIFO (VIII.1), **RIM-LIFO has no IFRS counterpart** (Part II.6) ([Deloitte DART — Roadmap: IFRS & US GAAP Comparison §1.4 Inventories](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-1-assets/1-4-inventories)).

**IFRS divergence summary matrix.**

| Topic | US GAAP (default) | IFRS (alternate routing) | Disclosure-template impact |
|---|---|---|---|
| Inventory cost flow | LIFO / RIM-LIFO permitted (ASC 330; Part I, II.4) | **LIFO prohibited** (IAS 2.25) — FIFO / weighted-avg only | Suppress LIFO-reserve and LIFO-liquidation disclosures for IFRS tenants (Part I.3) |
| Inventory write-down | Lower of cost or NRV; **reversal prohibited** (ASC 330-10-35-14; Part I.5) | Lower of cost and NRV; **reversal required** when NRV recovers (IAS 2) | Add a write-down-reversal disclosure line for IFRS tenants (Part IV.3) |
| Retail method | Conventional (LCM) / cost / average-cost variants (ASC 330-10-30-13; Part II.2) | Markdown-adjusted percentage only (IAS 2.22) — aligns to average-cost | Route IFRS RIM to markdown-adjusted percentage; no conventional-LCM variant |
| Lessee lease model | **Dual** finance/operating (ASC 842-10-25-2; Part VI.1) | **Single** on-balance-sheet model (IFRS 16) | Suppress operating-lease single-cost presentation; route all lessee leases to ROU + interest/depreciation; re-baseline EBITDA-based metrics (Part VI.7) |
| Long-lived / store impairment | Trigger-based, asset-group, undiscounted recoverability (ASC 360) | **Store-level CGU**, recoverable-amount test, reversal permitted (IAS 36) | Route IFRS tenants to store-CGU impairment; add impairment-reversal disclosure line (Part VIII.3) |

---

# PART IX — DISCLOSURE TEMPLATE EXTRACTION (WAVE 2 BINDING)

---

This part is the **bridge to Wave 2 module RTL-K-F** (`USGAAPDisclosurePackage` / `IFRSDisclosurePackage`). It distills Parts I–VIII into structured, sub-segment-keyed disclosure templates. **It is binding on Wave 2 schema design.** Each template line maps to a source section and carries the B/E/O/G/S applicability so the Wave 2 routing layer can present only the disclosures relevant to a tenant's sub-segment and reporting basis. All outputs remain `recommendation_for_human_review`.

## IX.1 Inventory Note — Component Applicability

| Disclosure-note component | Source | B | E | O | G | S |
|---|---|---|---|---|---|---|
| Basis of stating inventories / major classes (ASC 330-10-50-1) | Part I.3 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Cost-flow method (FIFO / avg / LIFO / RIM) | Part I.2 | ✓ | ✓ | ✓ | ✓ | ✓ |
| LCNRV basis (FIFO / avg) | Part I.4 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Legacy LCM basis (LIFO / RIM) | Part I.4 | ◑ | — | ◑ | ✓ | ✓ |
| LIFO reserve disclosure | Part I.3 | ◑ | — | ◑ | ✓ | ◑ |
| LIFO liquidation impact | Part I.3 | ◑ | — | ◑ | ✓ | ◑ |
| RIM cost-to-retail ratio policy | Part II.1–II.3 | ✓ | ◑ | ✓ | ◑ | ✓ |
| Shrink reserve policy | Part III.2 | ✓ | ◑ | ✓ | ✓ | ✓ |
| Markdown reserve policy | Part IV.2 | ◑ | ◑ | ◑ | ◑ | ✓ |
| Spoilage / expiry reserve policy | Part V.2–V.3 | — | — | ◑ | ✓ | — |
| ASC 275 significant-estimate disclosure | Part II.5 | ✓ | ✓ | ✓ | ✓ | ✓ |
| **IFRS:** write-down reversal disclosure | Part IV.3, VIII.1 | ✓ | ✓ | ✓ | ✓ | ✓ |
| **IFRS:** suppress LIFO reserve / liquidation | Part VIII.1 | ✓ | ✓ | ✓ | ✓ | ✓ |

## IX.2 Lease Commitments Note — Component Applicability

| Disclosure-note component | Source | B | E | O | G | S |
|---|---|---|---|---|---|---|
| Lease cost (finance vs operating) | Part VI.1, VI.6 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Variable lease cost (percentage rent + variable CAM) | Part VI.3–VI.4, VI.6 | ✓ | ◑ | ◑ | ◑ | ✓ |
| Short-term lease cost | Part VI.2, VI.6 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Weighted-avg remaining lease term | Part VI.6 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Weighted-avg discount rate | Part VI.2, VI.6 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Lease-liability maturity analysis | Part VI.6 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Co-tenancy / kick-out clause disclosure | Part VI.8 | ✓ | — | ◑ | ◑ | ✓ |
| **IFRS:** single-model ROU presentation (no operating class) | Part VI.7, VIII.2 | ✓ | ✓ | ✓ | ✓ | ✓ |

## IX.3 Segment / Reg S-K Narrative — Component Applicability

| Disclosure component | Source | B | E | O | G | S |
|---|---|---|---|---|---|---|
| Item 101(c) seasonality | Part VII.1 | ◑ | ◑ | ◑ | ◑ | ✓ |
| Item 101(c) merchandise sourcing / concentration | Part VII.1 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Item 101(c) channel mix (B/E/O) | Part VII.1 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Item 101(c) human capital | Part VII.1 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Item 105 inventory/markdown risk | Part VII.2 | ◑ | ◑ | ◑ | ◑ | ✓ |
| Item 105 shrink / ORC risk | Part VII.2 | ✓ | ◑ | ✓ | ✓ | ✓ |
| Item 105 lease / co-tenancy risk | Part VII.2 | ✓ | — | ◑ | ✓ | ✓ |
| Item 105 perishability / food-safety risk | Part VII.2 | — | — | ◑ | ✓ | — |
| Item 303 comp-store sales / margin / shrink trends | Part VII.3, III.3 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Item 303 occupancy-cost-ratio trend | Part VI.5, VII.3 | ✓ | — | ◑ | ✓ | ✓ |
| SEC climate disclosure (dormant) | Part VII.5 | — | — | — | — | — |

## IX.4 Wave 2 Routing Rules (binding)

1. **Framework election is tenant-level.** A `reportingBasis ∈ {USGAAP, IFRS}` attribute selects between `USGAAPDisclosurePackage` and `IFRSDisclosurePackage`. The five divergence rows in the Part VIII summary matrix are the mandatory switch points.
2. **Sub-segment gates template rows.** Each disclosure-template row carries a B/E/O/G/S applicability vector; the Wave 2 builder presents a row only where the tenant's sub-segment is **✓** or **◑** (with ◑ flagged for preparer confirmation) and suppresses **—** rows.
3. **IFRS suppress/add rules.** For `reportingBasis = IFRS`: suppress LIFO reserve / LIFO-liquidation / RIM-LIFO rows (IX.1); add inventory write-down-reversal row (IX.1); suppress operating-lease single-cost presentation and route to single-model ROU (IX.2); add store-CGU impairment and impairment-reversal rows (Part VIII.3).
4. **All disclosure outputs are `recommendation_for_human_review`.** No row in any package may be authored, certified, or filed autonomously; the Wave 2 layer surfaces candidate disclosures and divergence flags only.
5. **No cell is ever blank.** Every applicability vector in Part IX is fully populated across B/E/O/G/S, mirroring the matrix discipline of Parts I–VIII.

---

# PART X — SOURCES REFERENCE TABLE

---

All sources below are **primary or authoritative-interpretive** (FASB Codification via Deloitte DART / FASB.org, SEC / eCFR / Cornell LII, IFRS Foundation, IRS / Treasury Regulations, AICPA-CIMA, NRF, ICSC, U.S. Code, Big-Four and national-firm handbooks). Secondary references are cross-reference only.

| Source | URL | Coverage |
|---|---|---|
| FASB ASC 330 (Inventory) via Deloitte DART | [dart.deloitte.com ASC 330](https://dart.deloitte.com/USDART/home/codification/assets/asc330) | Inventory cost, LCNRV / LCM, write-down |
| FASB ASC 330-10 (Overall) via Deloitte DART | [dart.deloitte.com ASC 330-10](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10) | Scope, glossary, cost-flow methods |
| Deloitte DART — SEC Comment Letter Roadmap §2.12A Inventory | [dart.deloitte.com inventory comment letters](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-sec-comment-letter-considerations/chapter-2-financial-statement-accounting-disclosure/2-13-inventory) | ASC 330-10-30-9; valuation-allowance / SAB 5.BB; ASC 275 estimates |
| KPMG — Handbook: Inventory | [kpmg.com Inventory Handbook](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2023/handbook-inventory.pdf) | Cost components, RIM, LIFO disclosures |
| KPMG — Inventory: IFRS vs US GAAP | [kpmg.com IFRS vs US GAAP inventory](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html) | IAS 2 vs ASC 330 (LIFO, write-down reversal, LCM) |
| FASB ASU 2015-11 — Dean Dorton | [deandorton.com ASU 2015-11](https://deandorton.com/highlights-of-fasbs-asu-2015-11/) | Lower of cost or NRV; LIFO/RIM scope exception |
| CPA Hall Talk — Simplifying Inventory Measurement | [cpahalltalk.com inventory measurement](https://cpahalltalk.com/accounting-measurement-inventory/) | NRV definition; LIFO/RIM remain LCM |
| The CPA Journal — NRV is the new "Market" | [cpajournal.com NRV is the new market](https://www.cpajournal.com/2018/06/26/net-realizable-value-is-the-new-market/) | "Market" retained for LIFO/RIM only |
| Deloitte — Heads Up: proposed inventory disclosures (2017) | [dart.deloitte.com inventory disclosures](https://dart.deloitte.com/USDART/home/publications/archive/deloitte-publications/heads-up/2017/fasb-proposes-updates-inventory-disclosures-jan) | Proposed ASC 330-10-50-13 LIFO disclosures |
| Houseblend — ASC 330 inventory write-downs | [houseblend.io ASC 330 write-downs](https://www.houseblend.io/articles/asc-330-inventory-valuation-write-downs) | Write-down irreversibility (ASC 330-10-35-14) |
| AccountingIQ — LCM write-down ASC 330 | [accountingaitutor.com LCM write-down](https://www.accountingaitutor.com/study-guides/lower-of-cost-or-market-inventory-write-down-asc-330-journal-entries) | LCM ceiling/floor; reversal prohibited |
| AnalystPrep — LIFO Reserve & Liquidation | [analystprep.com LIFO reserve](https://analystprep.com/cfa-level-1-exam/financial-reporting-and-analysis/explain-lifo-reserve-lifo-liquidation/) | LIFO reserve & liquidation mechanics |
| Treas. Reg. §1.472-2 (LIFO conformity) — Cornell LII | [law.cornell.edu 26 CFR 1.472-2](https://www.law.cornell.edu/cfr/text/26/1.472-2) | LIFO conformity rule §1.472-2(e) |
| 26 CFR §1.472-2 (LIFO conformity) — eCFR | [ecfr.gov 26 CFR 1.472-2](https://www.ecfr.gov/current/title-26/chapter-I/subchapter-A/part-1/subject-group-ECFRb3578fa14bdb9ea/section-1.472-2) | LIFO conformity rule (current text) |
| Treas. Reg. §1.471-8 (Retail method) — Cornell LII | [law.cornell.edu 26 CFR 1.471-8](https://www.law.cornell.edu/cfr/text/26/1.471-8) | Tax retail method; permanent vs temporary markups/markdowns; retail-LIFO cost method |
| LIFOPro — financial report disclosure requirements | [lifopro.com LIFO disclosure](https://lifopro.com/financial-report-disclosure-requirements-alternatives/) | §1.472-2(e)(3) supplemental non-LIFO disclosures |
| Source Advisors — LIFO Conformity Rule | [sourceadvisors.com LIFO conformity](https://sourceadvisors.com/blogs/lifo/what-is-the-lifo-conformity-rule/) | IRC §472(c)/(e) conformity basis |
| SEC EDGAR — RIM-LIFO merchandise inventory disclosure | [sec.gov RIM-LIFO disclosure](https://www.sec.gov/Archives/edgar/data/794367/000079436712000145/filename1.htm) | Representative LIFO retail-method note |
| SEC EDGAR — comment letter ASC 330-10-35-4/-5 | [sec.gov ASC 330-10-35 comment](https://www.sec.gov/Archives/edgar/data/28917/000000000012028741/filename1.pdf) | LIFO RIM LCM; no loss if normal profit recovered |
| AICPA — Retail industry developments 1996/97 ARA | [core.ac.uk Retail ARA 1996/97](https://core.ac.uk/download/pdf/288030073.pdf) | Retail inventory valuation / obsolescence / shrinkage audit |
| AICPA — Retail industry developments 2001/02 ARA | [egrove.olemiss.edu Retail ARA 2001/02](https://egrove.olemiss.edu/cgi/viewcontent.cgi?article=1182&context=aicpa_indev) | ARB No. 43 as primary inventory literature |
| AICPA-CIMA — Revenue Recognition Audit & Accounting Guide | [aicpa-cima.com Revenue Recognition AAG](https://www.aicpa-cima.com/cpe-learning/publication/revenue-recognition-audit-and-accounting-guide) | Current retail/consumer-products AAG |
| AICPA-CIMA — Accounting & Auditing Publications index | [aicpa-cima.com A&A publications](https://www.aicpa-cima.com/resources/article/accounting-and-auditing-publications) | AICPA guide catalog (title verification) |
| Oracle NetSuite — Retail vs Cost Accounting | [netsuite.com retail accounting](https://www.netsuite.com/portal/resource/articles/accounting/retail-accounting-cost-accounting.shtml) | RIM formula; IFRS retail-method acceptance |
| Xero — Retail Inventory Method | [xero.com retail inventory method](https://www.xero.com/us/guides/retail-accounting/) | Cost-to-retail ratio steps |
| Wiley GAAP — Inventory Accounting Policy (Example 22.1) | [oreilly.com Wiley GAAP inventory policy](https://www.oreilly.com/library/view/wiley-gaap-financial/9781118572085/c22.xhtml) | Policy note: valuation, cost method, shrinkage, reserves |
| NRF — The Impact of Retail Theft & Violence 2024 | [nrf.com Impact of Retail Theft 2024](https://nrf.com/research/the-impact-of-retail-theft-violence-2024) | Current NRF shrink edition; shrink sources |
| NRF — National Retail Security Survey 2023 | [nrf.com NRSS 2023](https://nrf.com/research/national-retail-security-survey-2023) | Last standalone shrink survey |
| Retail Dive — NRF discontinues annual shrink report (2024) | [retaildive.com NRF shrink report](https://www.retaildive.com/news/no-nrf-annual-retail-shrink-report-2024/729009/) | NRSS discontinuation / currency note |
| InVue — Retail Shrinkage Statistics | [invue.com shrinkage statistics](https://invue.com/resource-center/blog/6-retail-shrinkage-statistics) | ~1.4%–1.6% of sales benchmark |
| FASB ASC 842 (Leases) | [fasb.org leases](https://www.fasb.org/leases_1) | Lessee ROU model; modifications |
| Deloitte DART — Roadmap: Leasing §8.3 Lease Classification | [dart.deloitte.com lease classification](https://dart.deloitte.com/USDART/home/codification/broad-transactions/asc842-10/roadmap-leasing/chapter-8-lessee-accounting/8-3-lease-classification) | ASC 842-10-25-2 five criteria |
| FinQuery — Finance vs Operating Lease (ASC 842) | [finquery.com finance vs operating lease](https://finquery.com/blog/capital-finance-lease-vs-operating-lease-asc-842/) | Five-criteria classification; presentation differences |
| Deloitte DART — Roadmap: Leasing §6.9 Amounts Not Lease Payments | [dart.deloitte.com variable lease payments](https://dart.deloitte.com/USDART/home/codification/broad-transactions/asc842-10/roadmap-leasing/chapter-6-lease-payments/6-9-amounts-not-considered-a) | ASC 842-10-15-39 percentage rent / variable payments |
| RSM US — Leases: Overview of ASC 842 | [rsmus.com ASC 842 overview](https://rsmus.com/content/dam/rsm/insights/financial-reporting/1pdf/leases-overview-of-asc-842.pdf) | Percentage-of-sales rent expensed as incurred |
| Lease Ledger — Percentage-of-sales rentals | [leaseledgerapp.com percentage-of-sales rent](https://www.leaseledgerapp.com/resources/how-to-treat-percentage-of-sales-rentals) | ASU 2016-02 BC210 rationale |
| Deloitte DART — Roadmap: Leasing §4.3 Non-Lease Components | [dart.deloitte.com non-lease components](https://dart.deloitte.com/USDART/home/codification/broad-transactions/asc842-10/roadmap-leasing/chapter-4-components-a-contract/4-3-identify-separate-nonlease-components) | ASC 842-10-15-28..31 component separation |
| CPEA — ASC 842 Lease / Non-Lease Practical Expedient | [ctfassets.net CPEA practical expedient](https://assets.ctfassets.net/rb9cdnjh59cm/45hm73w6ldjTZUotdEfO8m/7f6e04a33cbb758594498dc6a6729931/cpea-june-2022-special-report-fasb-asc-842-lease-nonlease-component-practical-expedient.pdf) | ASC 842-10-15-37 single-component expedient |
| KPMG — Lessee accounting for variable payments | [kpmg.com variable lease payments](https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2023/lessee-accounting-variable-payments.pdf) | Variable CAM / tax / insurance treatment |
| Deloitte DART — Roadmap: Leasing §15.2 Lessee Disclosures | [dart.deloitte.com lessee disclosures](https://dart.deloitte.com/USDART/home/codification/broad-transactions/asc842-10/roadmap-leasing/chapter-15-disclosure/15-2-lessee-disclosure-requirements) | ASC 842-20-50 disclosure package |
| FinQuery — ASC 842 disclosure requirements | [finquery.com ASC 842 disclosures](https://finquery.com/blog/asc-842-disclosure-requirements-example-explanation/) | Maturity table; weighted-avg term/rate |
| SEC EDGAR — lessee ASC 842 disclosure example | [sec.gov lessee disclosure example](https://www.sec.gov/Archives/edgar/data/823277/000082327725000038/R24.htm) | ASC 842-20-30-3 discount rate; weighted-avg term/rate |
| LeaseParse — Rent-roll analysis (occupancy cost) | [leaseparse.com rent-roll analysis](https://leaseparse.com/retail/rent-roll-analysis) | Occupancy cost ratio; healthy 8–12% |
| Adventures in CRE — Occupancy cost percentage | [adventuresincre.com occupancy cost](https://www.adventuresincre.com/glossary/occupancy-cost-percentage/) | Grocery ~2.5%, apparel 12%+ |
| ICSC / Datex Q2 2024 — Occupancy cost by category | [linkedin.com ICSC Datex occupancy cost](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O) | Sales PSF & occupancy cost by tenant category |
| WealthManagement — Guide to Occupancy Costs | [wealthmanagement.com occupancy costs](https://www.wealthmanagement.com/investing-strategies/a-guide-to-occupancy-costs) | Moody's mall-tier occupancy-cost ranges |
| ICSC — Law Conference occupancy-cost materials | [icsc.com occupancy cost materials](https://www.icsc.com/uploads/event_documents/2024LC_WS-16_-_Written_Materials.pdf) | ICSC member occupancy-cost teaching materials |
| Bill Emerson Good Samaritan Food Donation Act — 42 U.S.C. §1791 | [law.cornell.edu 42 USC 1791](https://www.law.cornell.edu/uscode/text/42/1791) | Food-donation liability protection (retail grocers) |
| Food Donation Improvement Act of 2022 — Pub. L. 117-362 | [govinfo.gov PLAW-117publ362](https://www.govinfo.gov/content/pkg/PLAW-117publ362/html/PLAW-117publ362.htm) | Qualified-direct-donor amendment |
| USDA — Good Samaritan Act FAQs | [usda.gov Good Samaritan FAQs](https://www.usda.gov/sites/default/files/documents/usda-good-samaritan-faqs.pdf) | Bill Emerson Act overview |
| Harvard CHLPI — Federal liability protection for food donation | [chlpi.org Emerson Act fact sheet](https://chlpi.org/wp-content/uploads/2023/03/Emerson-Fact-Sheet.pdf) | Emerson Act coverage; §170(e)(3) enhanced deduction context |
| SEC — Final Rule 33-10825 (S-K Items 101/103/105 modernization) | [sec.gov 33-10825](https://www.sec.gov/files/rules/final/2020/33-10825.pdf) | Principles-based Item 101(c); Item 105 standard |
| SEC — S-K Items 101/103/105 Small Entity Compliance Guide | [sec.gov S-K modernization guide](https://www.sec.gov/resources-small-businesses/small-business-compliance-guides/modernization-regulation-s-k-items-101-103-105-small-entity-compliance-guide) | Item 101(c) topics; Item 105 summary |
| 17 CFR §229.105 (Item 105 Risk Factors) — eCFR | [ecfr.gov S-K 105](https://www.ecfr.gov/current/title-17/chapter-II/part-229/subpart-229.100/section-229.105) | Material-risk factors; 2-page summary; General Risk Factors |
| 17 CFR §229.303 (Item 303 MD&A) — Cornell LII | [law.cornell.edu 17 CFR 229.303](https://www.law.cornell.edu/cfr/text/17/229.303) | Known trends; cost/revenue relationship |
| Cooley PubCo — Reg S-K modernization (business / risk factors) | [cooleypubco.com Reg S-K modernization](https://cooleypubco.com/2020/08/31/sec-amendments-modernize-reg-s-k-business-legal-risks/) | Item 101(c) / Item 105 modernization summary |
| Deloitte DART — SEC Comment Letter Roadmap §3.1 MD&A | [dart.deloitte.com MD&A](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-sec-comment-letter-considerations/chapter-3-sec-disclosure-topics/3-1-management-s-discussion-analysis) | MD&A staff focus areas |
| Deloitte DART — SEC Comment Letter Roadmap §3.3 Risk | [dart.deloitte.com disclosures about risk](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-sec-comment-letter-considerations/chapter-3-sec-disclosure-topics/3-3-disclosures-about-risk) | Risk disclosures (retail trend metrics) |
| SEC — Press Release 2025-58 (ends climate-rule defense) | [sec.gov 2025-58](https://www.sec.gov/newsroom/press-releases/2025-58) | SEC ends defense of climate disclosure rule |
| SEC — Press Release 2026-49 (proposes climate rescission) | [sec.gov 2026-49](https://www.sec.gov/newsroom/press-releases/2026-49-sec-proposes-rescission-climate-related-disclosure-rules) | Proposed rescission (current status) |
| IFRS Foundation — IAS 2 Inventories | [ifrs.org IAS 2 (HTML)](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2021/issued/ias2.html) | IAS 2.22 retail method; IAS 2.25 LIFO prohibition |
| IFRS Foundation — IFRS 16 Leases | [ifrs.org IFRS 16](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-16-leases/) | Single lessee model |
| KPMG — First Impressions: IFRS 16 Leases | [kpmg.com IFRS 16 First Impressions](https://assets.kpmg.com/content/dam/kpmg/pdf/2016/06/first-impressions-ifrs-16-leases.pdf) | IFRS 16 single-model mechanics |
| IFRS Foundation — IAS 36 Impairment of Assets | [ifrs.org IAS 36](https://www.ifrs.org/issued-standards/list-of-standards/ias-36-impairment-of-assets/) | CGU; annual goodwill test |
| IFRS Foundation — IAS 36 (PDF) | [ifrs.org IAS 36 PDF](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-36-impairment-of-assets.pdf) | CGU definition (IAS 36.6) |
| Grant Thornton — IAS 36 identifying CGUs | [grantthornton.global IAS 36 CGU](https://www.grantthornton.global/globalassets/1.-member-firms/global/insights/insight-content-blocks-and-media/ifrs/ias-36/IFRS-ias-36---identifying-cash-generating-units.pdf) | Retail store as CGU |
| IFRS Community — Cash-generating units (CGU) | [ifrscommunity.com CGU](https://ifrscommunity.com/knowledge-base/cash-generating-units-cgu/) | CGU identification guidance |
| Deloitte DART — Roadmap: IFRS & US GAAP Comparison §1.4 Inventories | [dart.deloitte.com IFRS/US GAAP inventories](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-1-assets/1-4-inventories) | LIFO prohibition; write-down reversal |
| Deloitte DART — Roadmap: IFRS & US GAAP Comparison §5.7 Leases | [dart.deloitte.com IFRS/US GAAP leases](https://dart.deloitte.com/USDART/home/publications/deloitte/additional-deloitte-guidance/roadmap-ifrs-us-gaap-comparison/chapter-5-broad-transactions/5-7-leases) | Dual vs single lessee model |

---

*This document is part of the Advisacor Retail Vertical Knowledge Stack (Module RTL-K-C, Wave 1). It is `DRAFT / SPEC — NOT EXECUTABLE — NOT LOCKED`, `executable: false`, `containsVerticalComplianceLogic: true`. All disclosure analyses, candidate disclosure topics, and divergence flags generated by Advisacor are classified as `output_classification = 'recommendation_for_human_review'`. No statement in this document constitutes final accounting, audit, legal, or filing advice, and nothing here authorizes Advisacor to author, certify, or file any SEC, GAAP, or IFRS disclosure autonomously. Users must validate every disclosure conclusion against the authoritative literature (FASB ASC, SEC Regulation S-K/S-X, IFRS Standards, IRS regulations), against their specific facts and materiality judgments, and against their elected reporting basis (US GAAP or IFRS) before relying on it. The retail KPI, markdown-cadence, occupancy-cost, and shrink panels referenced in this document are internal management views that supply decision-support evidence only; they do not by themselves create, trigger, or satisfy any required SEC or IFRS disclosure — every such disclosure remains the product of a human preparer's judgment. The disclosure data path is spine-gated (tenant isolation + RBAC) per the universal control spine and is proved by the relevant panel probe, not asserted.*
