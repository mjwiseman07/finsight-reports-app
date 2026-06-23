---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: true
phase: Retail Vertical Knowledge Stack — Wave 1 / RTL-K-A
artifact: KPI Sources Document
peer: docs/manufacturing/wave1/Manufacturing_KPIs_Sources.md
---

# US Retail Operating, Merchandising, and Financial KPIs — Comprehensive Reference

**DRAFT / SPEC — NOT EXECUTABLE — NOT LOCKED**

`executable: false`
`containsVerticalComplianceLogic: true`

**Document Title:** US Retail KPI Reference — Retail Vertical Knowledge Stack, Module RTL-K-A
**Date Generated:** June 23, 2026
**Version:** 1.0 (DRAFT)
**Scope:** US retailers — five sub-segments: Brick-and-mortar / general (B), E-commerce / pure-play (E), Omnichannel / hybrid (O), Grocery / CPG (G), Specialty / apparel (S). NAICS sectors 44–45 and subsector 4541.
**Output Classification:** `recommendation_for_human_review`
**Peer artifact:** `Manufacturing_KPIs_Sources.md` (71 KPIs / 143 citations across 5 manufacturing sub-segments). This document mirrors that precedent for the retail vertical.

**Citation Discipline:** Every KPI definition cites an authoritative **primary source**. For comparable-sales conventions, the 4-5-4 retail calendar, shrink, and returns benchmarks: National Retail Federation (NRF). For shopping-center productivity (sales per square foot) and occupancy-cost methodology: International Council of Shopping Centers (ICSC). For sector/sub-segment scope and macro retail sales: U.S. Census Bureau Monthly Retail Trade Survey (MRTS / MARTS) and the Economic Census. For accounting-derived KPIs (gross margin, inventory valuation, markdowns, right-of-return): FASB Accounting Standards Codification (ASC 330 Inventory; ASC 606 Revenue) via FASB and the Deloitte Accounting Research Tool (DART). For industry structure and top-retailer benchmarks: Deloitte *Global Powers of Retailing*. For grocery-specific metrics: NACS / FMI. Secondary sources (Shopify, Toolio, Lightspeed, Klipfolio, BigCommerce, vendor KPI libraries) are cited only as cross-references, never as a sole citation where a primary standard exists. Definitions that vary materially by organization are flagged **VARIABLE** alongside the most commonly used standard version. Where U.S. GAAP and IFRS diverge, both are stated; UK / IFRS-jurisdiction equivalents (e.g., British Retail Consortium) are noted where applicable.

This document is the retail-vertical analog of `Manufacturing_KPIs_Sources.md` and is governed by the Retail Vertical Wave 1 planning track (RTL-K-A). Each KPI carries a `basisOfStandards:` line whose verbatim text becomes the panel `basisOfStandards` field at Wave 2.

---

## How to Read This Document

Each KPI entry contains ten standardized fields:

1. **KPI ID** — `RTL-K-XX`
2. **Canonical name** — NRF / ICSC / Census standard name where one exists
3. **Definition** — single-sentence operational definition
4. **Formula** — explicit math notation with named variables (LaTeX `\( ... \)` inline / `\[ ... \]` display)
5. **Unit** — %, $, ratio, count, days
6. **Sign convention** — higher-better or lower-better
7. **Sub-segment applicability** — B / E / O / G / S marked **●** primary, **◑** drill-down only, blank = N/A
8. **Authoritative citation** — primary source URL with publication name
9. **Secondary citations** — 1–2 additional sources where available
10. **Notes** — interpretation gotchas (NRF 13-month comp rule, 4-5-4 calendar, exclusions)

Plus a `basisOfStandards:` line per KPI (verbatim citation text for the Wave 2 panel).

**Retail Sub-Segment Key:** **B** = Brick-and-mortar (general) | **E** = E-commerce (pure-play) | **O** = Omnichannel (hybrid) | **G** = Grocery / CPG | **S** = Specialty / apparel

**Applicability legend:** **●** = primary (panel surfaces by default) | **◑** = drill-down only (computed but secondary) | *(blank)* = not applicable. **No KPI is left without a full B/E/O/G/S row.**

**Sign-convention tag (binding):** Each KPI surfaces an **▲ higher-better** or **▼ lower-better** tag to prevent misreading; KPIs whose desirable direction is context-dependent (e.g., markdown rate, weeks of supply) are tagged **◆ target-band** and read against plan.

---

## Part I — Sub-Segment Definitions and Applicability Matrix Template

The retail vertical is organized on a **channel + merchandise** axis. The five Wave-1 sub-segments are defined against U.S. Census NAICS structure. Retail Trade is NAICS Sectors **44 and 45** — two two-digit codes because the sector was too large for a single code at NAICS' 1997 creation ([U.S. Census Bureau — Sector 44-45 Retail Trade](https://www.census.gov/naics/resources/archives/sect44-45.html)); the Monthly and Advance Monthly Retail Trade Surveys (MRTS / MARTS) cover exactly NAICS 44–45 plus food services subsector 722 ([U.S. Census Bureau — Advance Monthly Retail Trade Survey coverage](https://www.census.gov/retail/marts/about_the_surveys.html)).

| Code | Sub-segment | NAICS mapping | Distinguishing characteristic | Primary panel use case |
|------|-------------|---------------|-------------------------------|------------------------|
| **B** | Brick-and-mortar (general) | Store retailers in 44–45 **excluding** nonstore 454 e-commerce | Fixed point-of-sale locations designed for high walk-in volume ([Census — Sector 44-45 scope](https://www.census.gov/naics/resources/archives/sect44-45.html)) | Store-productivity panel: comp sales, sales/sq ft, traffic, conversion, labor % |
| **E** | E-commerce (pure-play) | NAICS **4541** Electronic Shopping and Mail-Order Houses | Nonstore; transactions via IT and delivery by mail/courier; widely used as the e-commerce proxy ([ICSC — Deconstructing the Census E-Commerce Definition](https://www.icsc.com/uploads/t07-subpage/DeconstructingtheCensusBureau-ERetail_new_format.pdf)) | Digital-funnel panel: sessions, AOV, cart abandonment, CAC, returns |
| **O** | Omnichannel (hybrid) | Combined 44–45 store + 4541 nonstore for a single operator | Inventory and demand spanning physical + digital; cross-channel fulfillment | Cross-channel panel: BOPIS, ship-from-store, comparable sales incl. digital |
| **G** | Grocery / CPG | NAICS **4451** Grocery & **4452** Specialty Food Stores (subsector 445 Food & Beverage Retailers) | Perishables, high turns, thin margins, special storage equipment ([BLS — Food and Beverage Stores NAICS 445](https://www.bls.gov/iag/tgs/iag445.htm)) | Perishables panel: turns, perishable shrink, basket size, write-offs |
| **S** | Specialty / apparel | NAICS **4481** Clothing, **4482** Shoe, **4483** Jewelry/Luggage/Leather Stores | Seasonal/fashion assortments, high markdown cadence, high returns | Merchandising panel: sell-through, markdown, GMROI, wardrobing flags |

**NAICS 4541 detail (e-commerce proxy):** 454 Nonstore Retailers → 4541 Electronic Shopping and Mail-Order Houses → 45411 → 454111 Electronic Shopping / 454112 Electronic Auctions / 454113 Mail-Order Houses ([ICSC — Electronic Shopping NAICS Code Group table](https://www.icsc.com/uploads/t07-subpage/DeconstructingtheCensusBureau-ERetail_new_format.pdf)); Census also publishes a supplemental NAICS 4541 e-commerce table ([NAICS Association — Census Releases NAICS 4541 E-Commerce Table](https://www.naics.com/census-bureau-releases-new-supplemental-e-commerce-table-naics-4541/)).

**Industry-scale benchmark context:** the Top 250 global retailers generated aggregate retail revenue of US$6.03T with 3.6% YoY growth and a 3.7% net profit margin in FY2023, per the most recent biennial edition ([Deloitte — Global Powers of Retailing 2025](https://www.deloitte.com/na/en/Industries/retail/research/global-powers-of-retailing.html)).

**Applicability matrix template (per KPI):**

| B | E | O | G | S |
|---|---|---|---|---|
| ● / ◑ / — | ● / ◑ / — | ● / ◑ / — | ● / ◑ / — | ● / ◑ / — |

---

## Part II — KPI Catalog

---

## Category 1 — Sales Productivity (13 KPIs)

---

### RTL-K-01. Comparable / Same-Store Sales (Comp Sales)

**Canonical name:** Comparable store sales ("comps" / same-store sales / identical-store sales)
**Definition:** Year-over-year sales change for the set of stores (and, for omnichannel, digital sales in existing markets) open in both the current and prior comparable periods, isolating organic performance by excluding new and closed units.
**Formula:**
\[ \text{Comp Sales \%} = \frac{S_{c,t} - S_{c,t-1}}{S_{c,t-1}} \times 100 \]
where \( S_{c,t} \) = net sales of the comparable-store base in the current period and \( S_{c,t-1} \) = net sales of the **same** base in the prior comparable period.
**Unit:** % | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ◑ | ● | ● | ● |

**Authoritative citation:** [NRF — 4-5-4 Calendar (comparable-period basis)](https://nrf.com/resources/4-5-4-calendar)
**Secondary:** [Corporate Finance Institute — Same-Store Sales](https://corporatefinanceinstitute.com/resources/accounting/same-store-sales/) | [Ahold Delhaize — Definitions & Abbreviations (comparable sales incl. online)](https://www.aholddelhaize.com/media/xioabwsm/definitions-and-abbreviations_february-13-2024.pdf) | [British Retail Consortium — Retail Sales Monitor (UK like-for-like equivalent)](https://brc.org.uk/market-intelligence/publications/monitors/retail-sales-monitor/) | [Trading Economics — UK BRC Retail Sales Monitor YoY](https://tradingeconomics.com/united-kingdom/brc-retail-sales-monitor-yoy) | [British Retail Consortium — Retail Sales Benchmark](https://brc.org.uk/market-intelligence/publications/benchmarks/retail-sales-benchmark/)
**Notes:** Comp sales is a **non-GAAP** metric — every company sets its own rules. Industry practice includes a store in the comp base after **12–13 full months** of operation; month-on-month reporting specifically requires **13 months** of trading history to qualify a comp store (current month + prior 12). In 53-week fiscal years most companies exclude the extra week so the comparison stays 52-on-52. Treatment of remodeled/relocated/expanded stores varies by company policy.
`basisOfStandards: NRF comparable-period basis (4-5-4 calendar); comparable-store base requires 12–13 full months of operation (13 months for month-on-month reporting); non-GAAP, company-defined. Sources: nrf.com/resources/4-5-4-calendar.`

---

### RTL-K-02. Total Net Sales

**Canonical name:** Net sales (Census MRTS "sales")
**Definition:** Gross revenue from merchandise and related services to final consumers, net of returns, allowances, and discounts, for all establishments primarily engaged in retail trade.
**Formula:**
\[ \text{Net Sales} = \text{Gross Sales} - \text{Returns} - \text{Allowances} - \text{Discounts} \]
**Unit:** $ | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [U.S. Census Bureau — Monthly Retail Trade Definitions (sales of retail establishments)](https://www.census.gov/retail/definitions.html)
**Secondary:** [U.S. Census Bureau — Advance Monthly Sales for Retail and Food Services (MARTS current)](https://www.census.gov/retail/marts/www/marts_current.pdf) | [U.S. Census Bureau — Monthly Retail Trade Sales Report](https://www.census.gov/retail/sales.html) | [U.S. Census Bureau — Quarterly Retail E-Commerce Sales Report](https://www.census.gov/retail/ecommerce.html) | [FRED — E-Commerce Retail Sales (ECOMSA)](https://fred.stlouisfed.org/series/ECOMSA)
**Notes:** Census sales estimates exclude retail-by-manufacturers, wholesalers, and service establishments whose primary activity is not retail trade. Comparable to GAAP "net revenue" presented in the income statement.
`basisOfStandards: U.S. Census Bureau MRTS — operating receipts of establishments primarily engaged in retail trade, net of returns/allowances/discounts. Source: census.gov/retail/definitions.html.`

---

### RTL-K-03. Sales per Square Foot

**Canonical name:** Sales per square foot (ICSC shopping-center productivity metric)
**Definition:** Net sales generated per unit of selling (or gross leasable) area over a period, the headline brick-and-mortar productivity grade.
**Formula:**
\[ \text{Sales per Sq Ft} = \frac{\text{Net Sales}}{\text{Selling Area (sq ft)}} \]
**Unit:** $ / sq ft | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | — | ● | ● | ● |

**Authoritative citation:** [ICSC — Gross Sales to Customers (sales-dollars-per-square-foot productivity metric)](https://www.icsc.com/uploads/education/2018LC_Materials_WS5.pdf)
**Secondary:** [ICSC — 2014 Annual Report (US malls $475/sq ft record)](https://www.icsc.com/uploads/default/2014-Annual-Report.pdf) | [ICSC — Weekly US Chain Store / Shopping-Center Sales dashboard](https://www.icsc.com/uploads/research/general/DashboardUS.pdf) | [Retail Council of Canada / ICSC — Canadian Shopping Centre Study (sales-per-sq-ft methodology)](https://www.retailcouncil.org/wp-content/uploads/2019/12/EN-2019-Shopping-Centre-Study_20200107_WEB_300dpi.pdf) | [ENERGY STAR — Energy Use Intensity by retail property type](https://www.energystar.gov/buildings/benchmark/understand-metrics/what-eui)
**Notes:** ICSC's sales-per-square-foot metric underlies the A+/A/B/C center grades; measure on **Retail Net Leasable Area** — the internal floorspace used for selling/displaying goods — for cross-center comparability ([ICSC — Asia-Pacific Shopping Centre Classification (NLA definition)](https://www.icsc.com/uploads/research/general/Asia-Pacific_Shopping_Centre_Classification_Standard.pdf)). Not applicable to pure-play e-commerce (no selling floor).
`basisOfStandards: ICSC sales-dollars-per-square-foot productivity metric, measured on Retail Net Leasable Area. Source: icsc.com (2018 leasing course materials; classification standard).`

---

### RTL-K-04. Sales per Labor Hour

**Canonical name:** Sales per labor hour (SPLH)
**Definition:** Net sales generated per scheduled or worked labor hour, the core store-labor-efficiency metric.
**Formula:**
\[ \text{SPLH} = \frac{\text{Net Sales}}{\text{Total Labor Hours}} \]
**Unit:** $ / hour | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ◑ | ● | ● | ● |

**Authoritative citation:** [U.S. Census Bureau — Sector 44-45 Retail Trade (after-sales services / store operations scope)](https://www.census.gov/naics/resources/archives/sect44-45.html)
**Secondary:** [Klipfolio — Retail KPI examples](https://www.klipfolio.com/resources/kpi-examples/ecommerce/order-value) | [Ariadne — Retail Labor Cost Benchmark (labor per leased hour methodology)](https://www.ariadne.inc/resources/blogs/retail-labor-cost-benchmark/)
**Notes:** Denominator definition (scheduled vs. worked vs. paid hours) is **VARIABLE**; align with the labor-cost-% KPI (RTL-K-58) and store-ops category. For e-commerce, "labor hour" is fulfillment/CX labor — drill-down only.
`basisOfStandards: Net sales ÷ total labor hours; labor-hour basis (scheduled/worked/paid) is company-defined. Source: U.S. Census Bureau retail-trade store-operations scope.`

---

### RTL-K-05. Transactions / Orders

**Canonical name:** Transaction count (stores) / order count (digital)
**Definition:** The count of completed sales transactions (point-of-sale) or placed orders (digital) in a period.
**Formula:**
\[ \text{Transactions} = \sum (\text{completed POS sales or placed online orders}) \]
**Unit:** count | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [U.S. Census Bureau — Monthly Retail Trade Definitions](https://www.census.gov/retail/definitions.html)
**Secondary:** [Wall Street Prep — Average Order Value (number of orders placed)](https://www.wallstreetprep.com/knowledge/average-order-value-aov/) | [NACS — 5 Key Metrics Defining the Convenience Industry's Health (transactions)](https://www.nacsmagazine.com/issues/june-2026/5-key-metrics-defining-the-convenience-industrys-health) | [Shopify — Average Order Value (number of orders placed)](https://www.shopify.com/blog/average-order-value)
**Notes:** Reconcile transaction count to net sales and to AOV/average ticket (RTL-K-06). Online "orders" may bundle multiple items; in-store "transactions" are per-checkout.
`basisOfStandards: Count of completed POS transactions (stores) or placed orders (digital) in period. Source: U.S. Census MRTS; Wall Street Prep AOV methodology.`

---

### RTL-K-06. Average Order Value (AOV) / Average Ticket

**Canonical name:** Average Order Value (digital) / Average Ticket (stores)
**Definition:** The average revenue per order or transaction over a period.
**Formula:**
\[ \text{AOV} = \frac{\text{Total Revenue}}{\text{Number of Orders}} \]
**Unit:** $ | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [Shopify — Average Order Value (AOV = Total Revenue ÷ Number of Orders)](https://www.shopify.com/blog/average-order-value)
**Secondary:** [Klipfolio — What is Average Order Value (AOV)](https://www.klipfolio.com/resources/kpi-examples/ecommerce/average-order-value) | [Salesforce — Average Order Value](https://www.salesforce.com/blog/average-order-value/) | [BigCommerce — Average Order Value](https://www.bigcommerce.com/articles/ecommerce/average-order-value/)
**Notes:** Global e-commerce AOV benchmark ran ~$110 (Sept 2023) ([BigCommerce — Average Order Value](https://www.bigcommerce.com/articles/ecommerce/average-order-value/)). "Average ticket" is the in-store synonym. Decompose comps as traffic × ticket.
`basisOfStandards: AOV = Total Revenue ÷ Number of Orders. Source: shopify.com/blog/average-order-value; klipfolio.com.`

---

### RTL-K-07. Units per Transaction (UPT) / Basket Size

**Canonical name:** Units per Transaction (UPT) / Items per basket
**Definition:** The average number of merchandise units sold per transaction, a measure of cross-sell / basket-building effectiveness.
**Formula:**
\[ \text{UPT} = \frac{\text{Total Units Sold}}{\text{Number of Transactions}} \]
**Unit:** ratio (units/txn) | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [ICSC — America's Marketplace (ticket size / basket as productivity benchmark)](https://www.icsc.com/uploads/research/general/America-Marketplace.pdf)
**Secondary:** [Shopify — Average Order Value (basket-building strategies)](https://www.shopify.com/blog/average-order-value) | [NACS — Inside the Store (basket and in-store sales metrics)](https://www.nacsmagazine.com/Issues/June-2025/Inside-the-store)
**Notes:** Grocery "basket size" usually means units or dollars per trip; apparel "UPT" is units per transaction. Pair with AOV to separate price effect from unit effect.
`basisOfStandards: UPT = Total Units Sold ÷ Number of Transactions; ICSC ticket/basket productivity benchmark. Source: icsc.com America's Marketplace.`

---

### RTL-K-08. Sales per Visit (Digital)

**Canonical name:** Revenue per visit / revenue per session
**Definition:** Net digital revenue generated per site visit (session), blending conversion and AOV into one digital-productivity figure.
**Formula:**
\[ \text{Sales per Visit} = \frac{\text{Digital Net Revenue}}{\text{Sessions}} = \text{Conversion Rate} \times \text{AOV} \]
**Unit:** $ / visit | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| — | ● | ● | ◑ | ◑ |

**Authoritative citation:** [Klipfolio — E-commerce KPI examples (revenue per visit)](https://www.klipfolio.com/resources/kpi-examples/ecommerce/order-value)
**Secondary:** [Optimizely — Average Order Value glossary](https://www.optimizely.com/optimization-glossary/average-order-value) | [Dynamic Yield — eCommerce conversion-rate benchmarks by industry](https://marketing.dynamicyield.com/benchmarks/conversion-rate/)
**Notes:** Equivalent to RPV (revenue per visitor) in digital analytics. Decomposes cleanly into conversion × AOV, so it is a useful diagnostic top-line.
`basisOfStandards: Sales per visit = Digital Net Revenue ÷ Sessions = Conversion Rate × AOV. Source: klipfolio.com e-commerce KPI library.`

---

### RTL-K-09. Sessions (Digital Traffic)

**Canonical name:** Sessions / visits
**Definition:** The count of distinct browsing sessions on digital properties in a period — the digital analog of store traffic.
**Formula:**
\[ \text{Sessions} = \sum (\text{distinct site/app visits in period}) \]
**Unit:** count | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| — | ● | ● | ◑ | ◑ |

**Authoritative citation:** [Klipfolio — E-commerce KPI examples](https://www.klipfolio.com/resources/kpi-examples/ecommerce/order-value)
**Secondary:** [Optimizely — Average Order Value glossary](https://www.optimizely.com/optimization-glossary/average-order-value) | [Shopify — Retail website conversion rate (purchases ÷ sessions × 100)](https://www.shopify.com/blog/retail-conversion-rate)
**Notes:** Session definition (timeout window, cross-device) is **VARIABLE** by analytics platform; standardize the timeout when comparing periods. Denominator for conversion rate (RTL-K-11).
`basisOfStandards: Count of distinct site/app sessions in period; session timeout/cross-device rules are platform-defined. Source: klipfolio.com e-commerce KPI library.`

---

### RTL-K-10. Traffic Count (Store)

**Canonical name:** Store traffic / footfall
**Definition:** The count of shoppers entering a store or center in a period — the brick-and-mortar demand input to conversion.
**Formula:**
\[ \text{Traffic} = \sum (\text{door-counter entries in period}) \]
**Unit:** count | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | — | ● | ● | ● |

**Authoritative citation:** [ICSC — America's Marketplace (shopper frequency / dwell as productivity benchmarks)](https://www.icsc.com/uploads/research/general/America-Marketplace.pdf)
**Secondary:** [Retail Council of Canada / ICSC — Shopping Centre Study (annual visitor counts)](https://www.retailcouncil.org/wp-content/uploads/2019/12/EN-2019-Shopping-Centre-Study_20200107_WEB_300dpi.pdf) | [Contentsquare — What is conversion rate in retail (transactions ÷ visitors)](https://contentsquare.com/blog/what-is-conversion-rate-in-retail/) | [MRI Software — How to increase conversions in retail stores](https://www.mrisoftware.com/blog/how-to-increase-conversions-in-retail/)
**Notes:** Counter technology (beam vs. video vs. Wi-Fi) affects accuracy; exclude staff entries. Numerator for store conversion rate (RTL-K-11).
`basisOfStandards: Count of door-counter shopper entries in period (staff excluded). Source: ICSC shopping-center productivity benchmarks.`

---

### RTL-K-11. Conversion Rate

**Canonical name:** Conversion rate (store: traffic-to-transaction; digital: session-to-order)
**Definition:** The share of visitors (store traffic or digital sessions) that completes a purchase.
**Formula:**
\[ \text{Conversion Rate} = \frac{\text{Transactions or Orders}}{\text{Traffic or Sessions}} \times 100 \]
**Unit:** % | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [ICSC — America's Marketplace (conversion rates as future center-productivity standard)](https://www.icsc.com/uploads/research/general/America-Marketplace.pdf)
**Secondary:** [Klipfolio — E-commerce KPI examples](https://www.klipfolio.com/resources/kpi-examples/ecommerce/order-value) | [TruRating — Retail conversion rate (Transactions ÷ Visitors × 100)](https://trurating.com/reports/retail-conversion-analysis/) | [V-Count — How to measure and improve retail conversion rate](https://v-count.com/how-to-measure-and-improve-retail-conversion-rate/)
**Notes:** Store conversion (~20–40% typical) and digital conversion (~2–3% typical) are **not** comparable — keep channels separate. Grocery store conversion approaches 100% (most entrants buy), so it is a weak grocery signal.
`basisOfStandards: Conversion = (Transactions or Orders) ÷ (Traffic or Sessions) × 100; store and digital conversion are not directly comparable. Source: ICSC; klipfolio.com.`

---

### RTL-K-12. Add-to-Cart Rate

**Canonical name:** Add-to-cart rate (ATC)
**Definition:** The share of sessions in which at least one product is added to the cart — the mid-funnel intent signal.
**Formula:**
\[ \text{ATC Rate} = \frac{\text{Sessions with} \geq 1 \text{ Cart Add}}{\text{Total Sessions}} \times 100 \]
**Unit:** % | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| — | ● | ● | ◑ | ◑ |

**Authoritative citation:** [Klipfolio — E-commerce KPI examples](https://www.klipfolio.com/resources/kpi-examples/ecommerce/order-value)
**Secondary:** [Optimizely — optimization glossary](https://www.optimizely.com/optimization-glossary/average-order-value) | [Baymard Institute — Cart Abandonment Rate Statistics](https://baymard.com/lists/cart-abandonment-rate)
**Notes:** Sits between sessions and cart abandonment (RTL-K-13) in the funnel; a high ATC with high abandonment points to checkout friction rather than demand weakness.
`basisOfStandards: ATC = Sessions with ≥1 cart add ÷ Total Sessions × 100. Source: klipfolio.com e-commerce KPI library.`

---

### RTL-K-13. Cart Abandonment Rate

**Canonical name:** Shopping-cart abandonment rate
**Definition:** The share of initiated carts that do not result in a completed purchase.
**Formula:**
\[ \text{Abandonment Rate} = \left(1 - \frac{\text{Completed Purchases}}{\text{Carts Created}}\right) \times 100 \]
**Unit:** % | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| — | ● | ● | ◑ | ◑ |

**Authoritative citation:** [Klipfolio — E-commerce KPI examples](https://www.klipfolio.com/resources/kpi-examples/ecommerce/order-value)
**Secondary:** [BigCommerce — Average Order Value / funnel context](https://www.bigcommerce.com/articles/ecommerce/average-order-value/) | [Baymard Institute — Cart Abandonment Rate (70.22% meta-analysis)](https://baymard.com/lists/cart-abandonment-rate) | [Baymard Institute — E-Commerce Checkout Usability Research](https://baymard.com/research/checkout-usability)
**Notes:** Industry abandonment commonly runs ~70%. Distinguish cart abandonment from **checkout** abandonment (a later funnel stage); shipping cost and forced account creation are leading drivers.
`basisOfStandards: Abandonment = (1 − Completed Purchases ÷ Carts Created) × 100. Source: klipfolio.com e-commerce KPI library.`

---

## Category 2 — Gross Margin and Merchandising (10 KPIs)

---

### RTL-K-14. Gross Margin %

**Canonical name:** Gross margin (gross profit margin)
**Definition:** The percentage of net sales remaining after cost of goods sold, the headline merchandising-profitability indicator.
**Formula:**
\[ \text{Gross Margin \%} = \frac{\text{Net Sales} - \text{COGS}}{\text{Net Sales}} \times 100 \]
**Unit:** % | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [FASB ASC 330 Inventory — DART (Deloitte Accounting Research Tool)](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10/deloitte-guidance/330-10-35-subsequent-measurement-deloitte/retail-inventory-method-accounting-for-inventory)
**Secondary:** [Deloitte — Global Powers of Retailing 2025 (Top 250 net margin 3.7%)](https://www.deloitte.com/na/en/Industries/retail/research/global-powers-of-retailing.html) | [Eagle Rock CFO — Retail Business KPI Benchmarks (margins)](https://www.eaglerockcfo.com/blog/industry-kpi-benchmarks/retail-business-kpi-benchmarks)
**Notes:** What is absorbed into COGS (freight-in, vendor allowances, markdowns, shrink) is governed by inventory-valuation policy under ASC 330. Grocery runs structurally thin margins; specialty/apparel structurally higher (offset by markdowns/returns).
`basisOfStandards: Gross Margin % = (Net Sales − COGS) ÷ Net Sales × 100; COGS composition governed by FASB ASC 330. Source: dart.deloitte.com ASC 330.`

---

### RTL-K-15. Gross Margin $ per Store / per Category

**Canonical name:** Gross margin dollars
**Definition:** Absolute gross profit dollars attributable to a store or merchandise category in a period.
**Formula:**
\[ \text{Gross Margin \$} = \text{Net Sales} - \text{COGS} \quad (\text{by store or category}) \]
**Unit:** $ | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [FASB ASC 330 Inventory — DART (subsequent measurement / retail inventory method)](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10/deloitte-guidance/330-10-35-subsequent-measurement-deloitte/retail-inventory-method-accounting-for-inventory)
**Secondary:** [Umbrex — Retailer GMROI analysis (gross profit = revenue − COGS)](https://umbrex.com/resources/industry-analyses/how-to-analyze-a-retail-company/retailer-gross-margin-return-on-investment-gmroi/) | [Corporate Finance Institute — Inventory Turnover (gross profit mechanics)](https://corporatefinanceinstitute.com/resources/accounting/inventory-turnover/)
**Notes:** The dollar (not %) figure drives category-level allocation decisions; pairs with GMROI (RTL-K-16) to weigh margin against inventory investment.
`basisOfStandards: Gross Margin $ = Net Sales − COGS by store/category. Source: FASB ASC 330; Umbrex GMROI methodology.`

---

### RTL-K-16. GMROI — Gross Margin Return on Investment

**Canonical name:** Gross Margin Return on Investment (GMROI)
**Definition:** The gross-margin dollars generated per dollar of average inventory investment at cost, the core merchandising-efficiency ratio.
**Formula:**
\[ \text{GMROI} = \frac{\text{Gross Margin \$}}{\text{Average Inventory at Cost}} \]
**Unit:** ratio ($ margin per $ inventory) | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [Investopedia — GMROI (Gross profit ÷ Average inventory cost)](https://www.investopedia.com/terms/g/gmroi.asp)
**Secondary:** [Umbrex — Retailer GMROI](https://umbrex.com/resources/industry-analyses/how-to-analyze-a-retail-company/retailer-gross-margin-return-on-investment-gmroi/) | [Shopify — GMROI for Retail](https://www.shopify.com/retail/gmroi) | [NetSuite — Inventory Turnover Ratio (average inventory basis)](https://www.netsuite.com/portal/resource/articles/inventory-management/inventory-turnover-ratio.shtml)
**Notes:** Verbatim: "GMROI = Gross profit / Average inventory cost" ([Investopedia](https://www.investopedia.com/terms/g/gmroi.asp)). GMROI > 1.0 means margin exceeds inventory cost; a common retail rule of thumb is ≥3.2 ([Shopify — GMROI](https://www.shopify.com/retail/gmroi)). For an annual figure, average inventory is summed over 12 month-beginnings + final month-end and divided by 13.
`basisOfStandards: GMROI = Gross Margin $ ÷ Average Inventory at Cost; >1.0 profitable, ~3.2 strong. Source: investopedia.com/terms/g/gmroi.asp; shopify.com/retail/gmroi.`

---

### RTL-K-17. GMROF / GMROS — GM Return per Square Foot

**Canonical name:** Gross margin return on footage / on space (GMROF / GMROS)
**Definition:** Gross-margin dollars generated per square foot of selling space, the space-productivity variant of GMROI for physical formats.
**Formula:**
\[ \text{GMROF} = \frac{\text{Gross Margin \$}}{\text{Selling Area (sq ft)}} \]
**Unit:** $ / sq ft | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | — | ● | ● | ● |

**Authoritative citation:** [ICSC — Gross Sales to Customers (sales-per-square-foot productivity basis)](https://www.icsc.com/uploads/education/2018LC_Materials_WS5.pdf)
**Secondary:** [Umbrex — Retailer GMROI](https://umbrex.com/resources/industry-analyses/how-to-analyze-a-retail-company/retailer-gross-margin-return-on-investment-gmroi/) | [ENERGY STAR — Energy Use Intensity by retail property type (per-sq-ft denominators)](https://www.energystar.gov/buildings/benchmark/understand-metrics/what-eui)
**Notes:** Combines the ICSC space-productivity logic of sales/sq ft (RTL-K-03) with margin rather than sales; not applicable to pure-play e-commerce (no selling floor).
`basisOfStandards: GMROF = Gross Margin $ ÷ Selling Area (sq ft); ICSC space-productivity logic applied to margin. Source: icsc.com leasing materials.`

---

### RTL-K-18. Markdown Rate

**Canonical name:** Markdown rate / markdown %
**Definition:** The cumulative value of price reductions as a share of net sales, measuring promotional and clearance intensity.
**Formula:**
\[ \text{Markdown Rate} = \frac{\text{Total Markdown \$}}{\text{Net Sales}} \times 100 \]
**Unit:** % | **Sign:** ◆ target-band (lower generally better; too low signals underpricing of stale stock)

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ◑ | ● |

**Authoritative citation:** [FASB ASC 330 — Retail Inventory Method, markdowns (DART)](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10/deloitte-guidance/330-10-35-subsequent-measurement-deloitte/retail-inventory-method-accounting-for-inventory)
**Secondary:** [Shopify — Open to Buy (planned markdowns)](https://www.shopify.com/blog/open-to-buy-plans) | [YGM Trading — Retail Math Formulas (markdown and markup definitions)](https://www.ygmtrading.com/editor-uploads/files/3e28dca9-b27a-44db-b05a-2545c7220aa8.pdf) | [Retail Dogma — Markup (initial vs maintained)](https://www.retaildogma.com/markup/)
**Notes:** Under the conventional (lower-of-cost-or-market) **retail inventory method**, markdowns are excluded from the cost-to-retail ratio so ending inventory is stated conservatively. Markdowns flow into open-to-buy planning (RTL-K-23). Highest in specialty/apparel.
`basisOfStandards: Markdown Rate = Total Markdown $ ÷ Net Sales × 100; markdowns excluded from cost-to-retail ratio under conventional retail inventory method (ASC 330). Source: dart.deloitte.com ASC 330.`

---

### RTL-K-19. Markdown Cadence (Regular vs. Clearance)

**Canonical name:** Markdown cadence / markdown mix
**Definition:** The split of total markdown dollars between promotional/regular markdowns and end-of-life clearance markdowns, indicating how much margin erosion is planned vs. liquidation.
**Formula:**
\[ \text{Clearance Markdown Share} = \frac{\text{Clearance Markdown \$}}{\text{Total Markdown \$}} \times 100 \]
**Unit:** % | **Sign:** ◆ target-band (high clearance share signals buying/assortment errors)

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ◑ | ● |

**Authoritative citation:** [FASB ASC 330 — Retail Inventory Method / markdowns (DART)](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10/deloitte-guidance/330-10-35-subsequent-measurement-deloitte/retail-inventory-method-accounting-for-inventory)
**Secondary:** [Toolio — Comparable Store Sales / merchandising planning](https://www.toolio.com/post/your-go-to-guide-for-comparable-store-sales-reporting-and-planning) | [RetailNorthstar — Initial Markup (markdown impact on margin)](https://retailnorthstar.ai/resources/glossary/initial-markup)
**Notes:** **VARIABLE** classification — the regular/clearance boundary is a company merchandising-policy choice. A rising clearance share is an early signal of over-buying or weak sell-through (RTL-K-20).
`basisOfStandards: Clearance markdown share = Clearance Markdown $ ÷ Total Markdown $ × 100; regular/clearance boundary is company-defined. Source: FASB ASC 330; Toolio merchandising planning.`

---

### RTL-K-20. Initial Markup (IMU)

**Canonical name:** Initial markup / initial markon (IMU)
**Definition:** The difference between the original retail price and the merchandise cost, expressed as a percentage of retail, set at receipt before any markdowns.
**Formula:**
\[ \text{IMU \%} = \frac{\text{Original Retail} - \text{Cost}}{\text{Original Retail}} \times 100 \]
**Unit:** % | **Sign:** ▲ higher-better (subject to competitive pricing limits)

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [FASB ASC 330 — Retail Inventory Method (initial markup / cost-to-retail ratio) (DART)](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10/deloitte-guidance/330-10-35-subsequent-measurement-deloitte/retail-inventory-method-accounting-for-inventory)
**Secondary:** [Investopedia — GMROI / gross margin mechanics](https://www.investopedia.com/terms/g/gmroi.asp) | [RetailNorthstar — Initial Markup Formula (IMU % = (Retail − Cost) ÷ Retail × 100)](https://retailnorthstar.ai/resources/formulas/initial-markup) | [Study.com — Initial & Maintained Retail Markup definitions](https://study.com/academy/lesson/initial-maintained-retail-markup-definition-calculation.html)
**Notes:** IMU is the **starting** markup at receipt; maintained markup (RTL-K-21) is what survives after markdowns and shrink. The retail inventory method uses the cost-to-retail ratio derived from markups.
`basisOfStandards: IMU % = (Original Retail − Cost) ÷ Original Retail × 100; cost-to-retail markup under retail inventory method (ASC 330). Source: dart.deloitte.com ASC 330.`

---

### RTL-K-21. Maintained Markup (MMU)

**Canonical name:** Maintained markup / maintained markon (MMU)
**Definition:** The actual markup realized after markdowns, employee discounts, and shrink — the markup that converts to gross margin.
**Formula:**
\[ \text{MMU \%} = \frac{\text{Net Sales} - \text{COGS}_{\text{at cost}}}{\text{Net Sales}} \times 100 = \text{IMU} - \text{Reductions} \]
**Unit:** % | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [FASB ASC 330 — Retail Inventory Method (DART)](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10/deloitte-guidance/330-10-35-subsequent-measurement-deloitte/retail-inventory-method-accounting-for-inventory)
**Secondary:** [Umbrex — Retailer GMROI (gross margin = revenue − COGS)](https://umbrex.com/resources/industry-analyses/how-to-analyze-a-retail-company/retailer-gross-margin-return-on-investment-gmroi/) | [Management One — Maintained Markup (MMU definition)](https://www.management-one.com/retail-definitions-mmu-maintained-markup) | [YGM Trading — Retail Math Formulas (MMU = Ticket Price − COGS − Allowances)](https://www.ygmtrading.com/editor-uploads/files/3e28dca9-b27a-44db-b05a-2545c7220aa8.pdf)
**Notes:** MMU ≈ gross margin % once shrink and discounts are accounted; the gap between IMU and MMU quantifies reductions (markdowns + shrink + discounts). Closely tied to RTL-K-14.
`basisOfStandards: MMU % = (Net Sales − COGS) ÷ Net Sales × 100 = IMU − reductions (markdowns + shrink + discounts). Source: FASB ASC 330 retail inventory method.`

---

### RTL-K-22. Cumulative Markup

**Canonical name:** Cumulative markup (cum markup)
**Definition:** The blended markup on total goods handled (beginning inventory + purchases) at retail vs. cost, used to derive the cost-to-retail ratio in the retail inventory method.
**Formula:**
\[ \text{Cumulative Markup \%} = \frac{\text{Total Goods Handled (Retail)} - \text{Total Goods Handled (Cost)}}{\text{Total Goods Handled (Retail)}} \times 100 \]
**Unit:** % | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ◑ | ● | ● | ● |

**Authoritative citation:** [FASB ASC 330 — Retail Inventory Method, cost-to-retail ratio (DART)](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10/deloitte-guidance/330-10-35-subsequent-measurement-deloitte/retail-inventory-method-accounting-for-inventory)
**Secondary:** [U.S. Federal Register — Retail Inventory Method (Treasury reg.)](https://www.federalregister.gov/documents/2011/10/07/2011-25946/retail-inventory-method) | [RetailNorthstar — Initial Markup (cumulative markup context)](https://retailnorthstar.ai/resources/glossary/initial-markup)
**Notes:** The cumulative-markup % is the basis of the cost complement used to value ending inventory under the conventional (LCM) retail method. Primarily a brick-and-mortar / grocery accounting metric.
`basisOfStandards: Cumulative Markup % on total goods handled = (Retail − Cost) ÷ Retail × 100; basis of cost-to-retail ratio in retail inventory method (ASC 330). Source: dart.deloitte.com ASC 330; federalregister.gov.`

---

### RTL-K-23. Price Index / Competitive Price Gap

**Canonical name:** Price index / price gap to competition
**Definition:** A retailer's basket price relative to a defined competitor basket, indexed to 100, measuring price competitiveness.
**Formula:**
\[ \text{Price Index} = \frac{\text{Retailer Basket Price}}{\text{Competitor Basket Price}} \times 100 \]
**Unit:** index (100 = parity) | **Sign:** ◆ target-band (positioning-dependent)

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [U.S. Census Bureau — Monthly Retail Trade (sales/price context)](https://www.census.gov/retail/definitions.html)
**Secondary:** [Deloitte — Global Powers of Retailing 2025 (competitive positioning)](https://www.deloitte.com/na/en/Industries/retail/research/global-powers-of-retailing.html) | [FMI — Food Industry Facts (competitive grocery pricing)](https://www.fmi.org/our-research/food-industry-facts)
**Notes:** **VARIABLE** — basket composition and competitor set are company-defined; grocery uses tightly matched key-value-item (KVI) baskets. Read against price-elasticity and margin (RTL-K-14).
`basisOfStandards: Price Index = Retailer Basket Price ÷ Competitor Basket Price × 100; basket and competitor set are company-defined. Source: U.S. Census MRTS price context; Deloitte Global Powers of Retailing.`

---

## Category 3 — Inventory Productivity (10 KPIs)

---

### RTL-K-24. Inventory Turnover

**Canonical name:** Inventory turnover (stock turn)
**Definition:** The number of times average inventory is sold and replaced over a period, the core inventory-velocity metric.
**Formula:**
\[ \text{Inventory Turnover} = \frac{\text{COGS}}{\text{Average Inventory at Cost}} \]
**Unit:** ratio (turns/year) | **Sign:** ▲ higher-better (within service-level limits)

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [Investopedia — GMROI (Inventory Turnover = COGS ÷ Average Inventory)](https://www.investopedia.com/terms/g/gmroi.asp)
**Secondary:** [Umbrex — Retailer GMROI (Inventory Turnover Rate = COGS ÷ Average Inventory)](https://umbrex.com/resources/industry-analyses/how-to-analyze-a-retail-company/retailer-gross-margin-return-on-investment-gmroi/) | [Corporate Finance Institute — Inventory Turnover (COGS ÷ Average Inventory)](https://corporatefinanceinstitute.com/resources/accounting/inventory-turnover/) | [NetSuite — Inventory Turnover Ratio defined](https://www.netsuite.com/portal/resource/articles/inventory-management/inventory-turnover-ratio.shtml)
**Notes:** Grocery turns are structurally high (perishables); specialty/apparel lower and seasonal. A retail-price variant (Sales ÷ Average Inventory at Retail) is also used — keep cost and retail bases consistent. Inverse relationship to weeks of supply (RTL-K-28).
`basisOfStandards: Inventory Turnover = COGS ÷ Average Inventory at Cost. Source: investopedia.com/terms/g/gmroi.asp; Umbrex GMROI methodology.`

---

### RTL-K-25. Days Inventory on Hand (DIO)

**Canonical name:** Days inventory outstanding / days inventory on hand (DIO / DOH)
**Definition:** The average number of days inventory is held before sale, the time-based complement to turnover.
**Formula:**
\[ \text{DIO} = \frac{\text{Average Inventory at Cost}}{\text{COGS}} \times \text{Days in Period} = \frac{365}{\text{Inventory Turnover}} \]
**Unit:** days | **Sign:** ▼ lower-better (within service-level limits)

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [FASB ASC 330 Inventory — DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10/deloitte-guidance/330-10-35-subsequent-measurement-deloitte/retail-inventory-method-accounting-for-inventory)
**Secondary:** [Investopedia — GMROI / inventory mechanics](https://www.investopedia.com/terms/g/gmroi.asp) | [Allianz Trade — Inventory Turnover Ratio & inventory days](https://www.allianz-trade.com/en_US/insights/inventory-turnover-ratio.html)
**Notes:** Directly inverse to turnover (RTL-K-24). For perishables (G) the binding constraint is product shelf life, not financial DIO; pair with perishable shrink (RTL-K-32).
`basisOfStandards: DIO = (Average Inventory at Cost ÷ COGS) × Days in Period = 365 ÷ Inventory Turnover. Source: FASB ASC 330; investopedia GMROI mechanics.`

---

### RTL-K-26. Stock-to-Sales Ratio

**Canonical name:** Stock-to-sales ratio
**Definition:** The ratio of beginning-of-month inventory to sales for the same period, used to set planned inventory levels in merchandise planning.
**Formula:**
\[ \text{Stock-to-Sales} = \frac{\text{Beginning-of-Period Inventory (Retail)}}{\text{Net Sales for Period}} \]
**Unit:** ratio | **Sign:** ◆ target-band (read against plan)

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [Shopify — Open to Buy (BOM inventory vs. planned sales)](https://www.shopify.com/blog/open-to-buy-plans)
**Secondary:** [Toolio — Weeks of Supply / inventory planning](https://www.toolio.com/post/how-to-calculate-weeks-of-supply-and-set-target-levels) | [RetailNorthstar — Weeks of Supply glossary](https://retailnorthstar.ai/resources/glossary/weeks-of-supply)
**Notes:** Reciprocal of monthly turnover; a key input to open-to-buy (RTL-K-29). Distinct from weeks of supply, which is forward-looking on rate of sale.
`basisOfStandards: Stock-to-Sales = Beginning-of-Period Inventory (Retail) ÷ Net Sales for Period. Source: shopify.com/blog/open-to-buy-plans; Toolio inventory planning.`

---

### RTL-K-27. Sell-Through Rate

**Canonical name:** Sell-through rate (STR)
**Definition:** The percentage of units received that are sold within a defined period, measuring assortment demand alignment.
**Formula:**
\[ \text{Sell-Through Rate} = \frac{\text{Units Sold}}{\text{Units Received}} \times 100 \]
**Unit:** % | **Sign:** ◆ target-band (high is good, but 100% may signal lost sales / under-buying)

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ◑ | ● |

**Authoritative citation:** [Institute for Supply Management — The Monthly Metric: Sell-Through Rate](https://www.ismworld.org/supply-management-news-and-reports/news-publications/inside-supply-management-magazine/blog/2024/2024-10/the-monthly-metric-sell-through-rate/)
**Secondary:** [Lightspeed — Sell-Through Rate (Units Sold ÷ Units Received × 100)](https://www.lightspeedhq.com/blog/sell-through-rate/) | [SPS Commerce — Sell-Through Rate](https://www.spscommerce.com/community/articles/sell-through-rate) | [Toolio — Sell-Through Rate (Units Sold ÷ Units Received × 100)](https://www.toolio.com/post/sell-through-rate-how-to-calculate-and-5-strategies-to-optimize) | [Wall Street Prep — Sell-Through Rate formula](https://www.wallstreetprep.com/knowledge/sell-through-rate/)
**Notes:** Verbatim: "Sell-through rate (%) = (Units Sold / Units Received) × 100" ([Lightspeed](https://www.lightspeedhq.com/blog/sell-through-rate/)). Calculated on styles/SKUs; central to apparel buying. Some variants use "units available" (BOP + received) as denominator.
`basisOfStandards: Sell-through rate (%) = (Units Sold ÷ Units Received) × 100. Source: ismworld.org Monthly Metric; lightspeedhq.com/blog/sell-through-rate.`

---

### RTL-K-28. Weeks of Supply (WOS)

**Canonical name:** Weeks of supply (WOS) / forward weeks of supply (FWOS)
**Definition:** The number of weeks current inventory will last at the current or forecasted rate of sale.
**Formula:**
\[ \text{WOS} = \frac{\text{On-Hand Units (BOP)}}{\text{Average Weekly Unit Sales}} = \frac{52}{\text{Annual Inventory Turns}} \]
**Unit:** weeks | **Sign:** ◆ target-band (set vs. lead time + safety buffer)

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [Toolio — How to Calculate Weeks of Supply (WOS = BOP Inventory ÷ Weekly Rate of Sale = 52 ÷ Annual Turns)](https://www.toolio.com/post/how-to-calculate-weeks-of-supply-and-set-target-levels)
**Secondary:** [RetailNorthstar — Weeks of Supply (On-Hand Units ÷ Average Weekly Unit Sales)](https://retailnorthstar.ai/resources/glossary/weeks-of-supply) | [Parker Avery — Inventory Planning Methods](https://parkeravery.com/retail-expert-guides/inventory-planning-methods/) | [Allianz Trade — Inventory turns to weeks-of-supply conversion](https://www.allianz-trade.com/en_US/insights/inventory-turnover-ratio.html)
**Notes:** Minimum WOS target ≈ Lead Time + (Lead Time × ~25% safety buffer); WOS feeds directly into open-to-buy (RTL-K-29). Inverse of turnover (RTL-K-24).
`basisOfStandards: WOS = On-Hand (BOP) Units ÷ Average Weekly Unit Sales = 52 ÷ Annual Inventory Turns. Source: toolio.com; retailnorthstar.ai weeks-of-supply.`

---

### RTL-K-29. Open-to-Buy (OTB)

**Canonical name:** Open-to-buy (OTB)
**Definition:** The dollar (or unit) budget remaining to purchase merchandise for a period after accounting for planned sales, markdowns, and planned inventory levels.
**Formula:**
\[ \text{OTB} = \text{Planned Sales} + \text{Planned Markdowns} + \text{Planned EOM Inventory} - \text{Planned BOM Inventory} \]
**Unit:** $ (or units) | **Sign:** ◆ target-band (zero ideal vs. plan; negative = over-bought)

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [Shopify — Open to Buy (OTB = Planned sales + Planned markdowns + Planned EOM inventory − Planned BOM inventory)](https://www.shopify.com/blog/open-to-buy-plans)
**Secondary:** [Inventory Planner — Open-to-Buy Planning](https://www.inventory-planner.com/open-to-buy-explained/) | [Retail Dogma — Open to Buy](https://www.retaildogma.com/otb-retail/) | [Shopify — Open-to-Buy plans](https://www.shopify.com/blog/open-to-buy-plans)
**Notes:** Verbatim: "OTB = planned sales + planned markdowns + planned end of month inventory – beginning of month inventory" ([Inventory Planner](https://www.inventory-planner.com/open-to-buy-explained/)). Can be at retail or at cost — keep basis consistent. A unit/cost variant nets on-order commitments ([Toolio — OTB](https://www.toolio.com/post/open-to-buy-planning-what-is-otb-for-retail)).
`basisOfStandards: OTB = Planned Sales + Planned Markdowns + Planned EOM Inventory − Planned BOM Inventory (retail or cost basis). Source: shopify.com/blog/open-to-buy-plans; inventory-planner.com.`

---

### RTL-K-30. In-Stock Rate / Out-of-Stock (OOS) Rate

**Canonical name:** In-stock rate / on-shelf availability (OSA); inverse = out-of-stock rate
**Definition:** The share of SKUs (or SKU-store combinations) available for sale when demanded, the core availability/service-level metric.
**Formula:**
\[ \text{In-Stock Rate} = \frac{\text{SKU-Locations In Stock}}{\text{Total Active SKU-Locations}} \times 100; \quad \text{OOS} = 100 - \text{In-Stock} \]
**Unit:** % | **Sign:** In-stock ▲ higher-better / OOS ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [U.S. Census Bureau — Monthly Retail Trade (inventories of retail stores)](https://www.census.gov/retail/definitions.html)
**Secondary:** [Onebeat — Real-time replenishment / on-shelf availability](https://onebeat.co/blog/how-real-time-replenishment-improves-sell-through-and-full-price-sales/) | [IHL Group — Retail Inventory Crisis Persists Despite $172B in Improvements](https://www.ihlservices.com/news/analyst-corner/2025/09/retail-inventory-crisis-persists-despite-172-billion-in-improvements/) | [Sensormatic / IHL — Inventory Distortion study](https://www.sensormatic.com/resources/rp/2023/ihl-inventory-distortion-study)
**Notes:** Grocery measures on-shelf availability (OSA) at store level; e-commerce measures buyable-SKU availability. OOS directly suppresses comp sales and conversion. **VARIABLE** denominators (SKU vs. SKU-location vs. demand-weighted).
`basisOfStandards: In-Stock Rate = SKU-Locations In Stock ÷ Total Active SKU-Locations × 100; OOS = 100 − In-Stock. Source: U.S. Census MRTS inventories; Onebeat replenishment.`

---

### RTL-K-31. Inventory Aging Buckets (0-30 / 30-60 / 60-90 / 90+ days)

**Canonical name:** Inventory aging / aged-stock buckets
**Definition:** The distribution of on-hand inventory cost across age tiers since receipt, used to target markdowns and write-downs.
**Formula:**
\[ \text{Aging Share}_{b} = \frac{\text{Inventory Cost in Bucket } b}{\text{Total Inventory Cost}} \times 100, \quad b \in \{0\text{-}30, 30\text{-}60, 60\text{-}90, 90+\} \]
**Unit:** % per bucket | **Sign:** ▼ lower-better for 90+ bucket

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ◑ | ● |

**Authoritative citation:** [FASB ASC 330 Inventory — lower of cost and NRV (DART)](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10/deloitte-guidance/330-10-35-subsequent-measurement-deloitte/retail-inventory-method-accounting-for-inventory)
**Secondary:** [Houseblend — ASC 330 Inventory Valuation: Write-Downs](https://www.houseblend.io/articles/asc-330-inventory-valuation-write-downs) | [IHL Group — Fixing Inventory Distortion](https://www.ihlservices.com/product/fixing-inventory-distortion-are-we-there-yet/)
**Notes:** The 90+ bucket triggers lower-of-cost-and-NRV write-downs under ASC 330; write-downs are **permanent** and cannot be reversed under US GAAP ([Houseblend](https://www.houseblend.io/articles/asc-330-inventory-valuation-write-downs)). IFRS (IAS 2) permits reversal of prior write-downs if NRV recovers.
`basisOfStandards: Aging share by bucket {0-30,30-60,60-90,90+} = Inventory Cost in bucket ÷ Total Inventory Cost × 100; 90+ triggers lower-of-cost-and-NRV write-down (ASC 330; write-downs not reversed under US GAAP, reversible under IAS 2). Source: dart.deloitte.com ASC 330.`

---

### RTL-K-32. Perishable Shrink % (Grocery)

**Canonical name:** Perishable shrink / fresh shrink
**Definition:** Loss of perishable inventory (spoilage, expiry, trim/prep loss) as a percentage of perishable net sales, a grocery-specific loss metric.
**Formula:**
\[ \text{Perishable Shrink \%} = \frac{\text{Perishable Loss \$ (spoilage + expiry + trim)}}{\text{Perishable Net Sales}} \times 100 \]
**Unit:** % | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | — | ◑ | ● | — |

**Authoritative citation:** [NRF — The Reality of Retail Shrink (shrink as inventory loss as % of sales)](https://nrf.com/blog/reality-retail-shrink)
**Secondary:** [BLS — Food and Beverage Stores NAICS 445 (perishable handling/storage)](https://www.bls.gov/iag/tgs/iag445.htm) | [National Supermarket Shrink Survey — shrink at 2.70% of retail sales](http://wheresmyshrink.com/executivesummary.html) | [United Fresh / IFPA — 2023 Produce Supermarket Benchmarks (shrink % of sales)](https://www.freshproduce.com/siteassets/files/reports/retail/23produce-benchmark-data.pdf)
**Notes:** Distinct from theft-driven shrink (RTL-K-33); perishable shrink is dominated by spoilage and date-code expiry, so it is highly sensitive to demand forecasting and cold-chain. Predominantly NAICS 4451/4452 (G).
`basisOfStandards: Perishable Shrink % = Perishable Loss $ (spoilage + expiry + trim) ÷ Perishable Net Sales × 100; grocery-specific. Source: nrf.com/blog/reality-retail-shrink; BLS NAICS 445.`

---

### RTL-K-33. Markdown-to-Clear Ratio

**Canonical name:** Markdown-to-clear / liquidation efficiency
**Definition:** The markdown dollars required to clear a unit of aged or clearance inventory, measuring liquidation efficiency.
**Formula:**
\[ \text{Markdown-to-Clear} = \frac{\text{Clearance Markdown \$}}{\text{Clearance Units Sold}} \]
**Unit:** $ / unit | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ◑ | ● |

**Authoritative citation:** [FASB ASC 330 — Retail Inventory Method / markdowns (DART)](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10/deloitte-guidance/330-10-35-subsequent-measurement-deloitte/retail-inventory-method-accounting-for-inventory)
**Secondary:** [Onebeat — full-price sales / clearance dynamics](https://onebeat.co/blog/how-real-time-replenishment-improves-sell-through-and-full-price-sales/) | [RetailNorthstar — Initial Markup (clearance margin impact)](https://retailnorthstar.ai/resources/formulas/initial-markup)
**Notes:** **VARIABLE** definition; complements sell-through (RTL-K-27) and aging (RTL-K-31). High markdown-to-clear with high 90+ aging signals chronic over-buying. Most material in specialty/apparel.
`basisOfStandards: Markdown-to-Clear = Clearance Markdown $ ÷ Clearance Units Sold; company-defined clearance scope. Source: FASB ASC 330; Onebeat clearance dynamics.`

---

## Category 4 — Shrink and Loss Prevention (8 KPIs)

---

### RTL-K-34. Shrink Rate (% of Net Sales)

**Canonical name:** Shrink / shrinkage rate
**Definition:** Inventory loss from theft (internal and external), administrative/operational error, and other identified loss, expressed as a percentage of net sales during an inventory period.
**Formula:**
\[ \text{Shrink Rate} = \frac{\text{Book Inventory} - \text{Physical Inventory}}{\text{Net Sales}} \times 100 \]
**Unit:** % | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ◑ | ● | ● | ● |

**Authoritative citation:** [NRF — The Reality of Retail Shrink (shrink = inventory loss as % of sales)](https://nrf.com/blog/reality-retail-shrink)
**Secondary:** [NRF — National Retail Security Survey 2023](https://nrf.com/research/national-retail-security-survey-2023) | [NRF — Shrink Accounted for Over $112 Billion in 2022](https://nrf.com/media-center/press-releases/shrink-accounted-over-112-billion-industry-losses-2022-according-nrf) | [Checkpoint Systems / FMI — grocery shrink at 3.1% of revenue](https://checkpointsystems.com/wp-content/uploads/Ask-the-Expert_Jason-DeVinney_CKP_Nov-2021_FINAL.pdf) | [National Supermarket Shrink Survey — executive summary (2.70% of retail sales)](http://wheresmyshrink.com/executivesummary.html)
**Notes:** NRF's National Retail Security Survey is the industry benchmark; shrink reached over $112B in industry losses in 2022 ([NRF press release](https://nrf.com/media-center/press-releases/shrink-accounted-over-112-billion-industry-losses-2022-according-nrf)). Shrink includes theft, error, and other identified loss — used to forecast/account for losses on the retail balance sheet.
`basisOfStandards: Shrink Rate = (Book Inventory − Physical Inventory) ÷ Net Sales × 100; NRF National Retail Security Survey benchmark. Source: nrf.com/blog/reality-retail-shrink; nrf.com/research/national-retail-security-survey-2023.`

---

### RTL-K-35. Inventory Accuracy %

**Canonical name:** Inventory record accuracy (IRA)
**Definition:** The share of SKU-location records whose system quantity matches the physically counted quantity within tolerance.
**Formula:**
\[ \text{Inventory Accuracy} = \frac{\text{SKU-Locations Within Tolerance}}{\text{SKU-Locations Counted}} \times 100 \]
**Unit:** % | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [NRF — The Reality of Retail Shrink (administrative/operational error in shrink)](https://nrf.com/blog/reality-retail-shrink)
**Secondary:** [U.S. Census Bureau — Monthly Retail Trade (inventories)](https://www.census.gov/retail/definitions.html) | [IHL Group — Inventory distortion and on-hand accuracy](https://www.ihlservices.com/product/fixing-inventory-distortion-are-we-there-yet/)
**Notes:** Low inventory accuracy directly degrades BOPIS/ship-from-store reliability (RTL-K-49/RTL-K-51) and inflates "unknown" shrink (RTL-K-37). Tolerance band is **VARIABLE** (unit vs. dollar; exact vs. ±1).
`basisOfStandards: Inventory Accuracy = SKU-Locations Within Tolerance ÷ SKU-Locations Counted × 100; tolerance band company-defined. Source: nrf.com/blog/reality-retail-shrink; U.S. Census MRTS inventories.`

---

### RTL-K-36. Cycle Count Variance

**Canonical name:** Cycle count variance
**Definition:** The net difference between counted and system quantities (or value) found during cyclical inventory counts, expressed in units or dollars.
**Formula:**
\[ \text{Cycle Count Variance} = \sum (\text{Counted Qty} - \text{System Qty}) \quad (\text{units or \$}) \]
**Unit:** count or $ | **Sign:** ▼ lower-better (toward zero net variance)

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [NRF — The Reality of Retail Shrink (operational error / counting)](https://nrf.com/blog/reality-retail-shrink)
**Secondary:** [FASB ASC 330 Inventory — physical inventory / book-to-physical (DART)](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10/deloitte-guidance/330-10-35-subsequent-measurement-deloitte/retail-inventory-method-accounting-for-inventory) | [U.S. Census Bureau — Quarterly E-Commerce General FAQs (inventory counts)](https://www.census.gov/retail/ecomm_general_faqs.html)
**Notes:** Continuous cycle counting reduces the year-end book-to-physical shrink surprise; chronic positive/negative variance signals receiving or POS-scan process errors. Feeds inventory accuracy (RTL-K-35).
`basisOfStandards: Cycle Count Variance = Σ (Counted Qty − System Qty) in units or $. Source: nrf.com/blog/reality-retail-shrink; FASB ASC 330 book-to-physical.`

---

### RTL-K-37. Known vs. Unknown Loss Split

**Canonical name:** Identified (known) vs. unidentified (unknown) shrink split
**Definition:** The share of total shrink attributable to identified causes (recorded damage, recalls, vendor error) vs. unexplained loss (presumed theft/error).
**Formula:**
\[ \text{Unknown Loss Share} = \frac{\text{Total Shrink} - \text{Identified Loss}}{\text{Total Shrink}} \times 100 \]
**Unit:** % | **Sign:** ▼ lower-better (lower unknown share = better controls)

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ◑ | ● | ● | ● |

**Authoritative citation:** [NRF — The Reality of Retail Shrink (theft vs. administrative/operational vs. other identified loss)](https://nrf.com/blog/reality-retail-shrink)
**Secondary:** [NRF — National Retail Security Survey 2023](https://nrf.com/research/national-retail-security-survey-2023) | [NRF — The Reality of Retail Shrink (known vs unknown)](https://nrf.com/blog/reality-retail-shrink)
**Notes:** A rising unknown-loss share usually points to external theft / ORC (RTL-K-41) or POS fraud rather than recordable process loss; NRSS categorizes shrink causes for benchmarking.
`basisOfStandards: Unknown Loss Share = (Total Shrink − Identified Loss) ÷ Total Shrink × 100; NRSS shrink-cause categorization. Source: nrf.com/blog/reality-retail-shrink; nrf.com/research/national-retail-security-survey-2023.`

---

### RTL-K-38. Theft Incidents per Store

**Canonical name:** Theft / loss incidents per store
**Definition:** The count of recorded theft or loss-prevention incidents per store over a period, a normalized exposure metric.
**Formula:**
\[ \text{Incidents per Store} = \frac{\text{Total Recorded Theft Incidents}}{\text{Number of Stores}} \]
**Unit:** count / store | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | — | ● | ● | ● |

**Authoritative citation:** [NRF — The Impact of Retail Theft & Violence 2024](https://nrf.com/research/the-impact-of-retail-theft-violence-2024)
**Secondary:** [NRF — National Retail Security Survey 2023](https://nrf.com/research/national-retail-security-survey-2023)
**Notes:** Reporting completeness is **VARIABLE** (many incidents go unrecorded); normalize per store and per $ sales for comparability. Correlates with ORC flags (RTL-K-41) in affected markets.
`basisOfStandards: Incidents per Store = Total Recorded Theft Incidents ÷ Number of Stores; reporting completeness varies. Source: nrf.com/research/the-impact-of-retail-theft-violence-2024.`

---

### RTL-K-39. Refund / Return Fraud Rate

**Canonical name:** Return fraud rate
**Definition:** The share of returns (by count or dollars) determined to be fraudulent or abusive (e.g., receipt fraud, stolen-merchandise returns).
**Formula:**
\[ \text{Return Fraud Rate} = \frac{\text{Fraudulent Return \$}}{\text{Total Return \$}} \times 100 \]
**Unit:** % | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ◑ | ● |

**Authoritative citation:** [NRF and Happy Returns — 2024 Retail Returns Total $890 Billion (return fraud)](https://nrf.com/media-center/press-releases/nrf-and-happy-returns-report-2024-retail-returns-total-890-billion)
**Secondary:** [NRF — 2025 Retail Returns Landscape](https://nrf.com/research/2025-retail-returns-landscape) | [Supply & Demand Chain Executive — NRF: Returns to cost retailers ~$850B in 2025](https://www.sdcexec.com/sourcing-procurement/reverse-logistics/news/22952626/national-retail-federation-nrf-returns-expected-to-cost-retailers-nearly-850b-in-2025)
**Notes:** Return fraud/abuse is a material share of returns (industry estimates of return fraud have run near 15% of returns). Ties to returns rate (RTL-K-42) and wardrobing flags (RTL-K-47).
`basisOfStandards: Return Fraud Rate = Fraudulent Return $ ÷ Total Return $ × 100; NRF/Happy Returns benchmark. Source: nrf.com/media-center/press-releases/nrf-and-happy-returns-report-2024-retail-returns-total-890-billion.`

---

### RTL-K-40. Damaged / Expired Write-Off Rate (Grocery)

**Canonical name:** Damage / spoilage write-off rate
**Definition:** The value of merchandise written off due to damage or expiry as a percentage of net sales, a grocery-weighted loss metric.
**Formula:**
\[ \text{Write-Off Rate} = \frac{\text{Damaged + Expired Write-Off \$}}{\text{Net Sales}} \times 100 \]
**Unit:** % | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | ◑ | ◑ | ● | ◑ |

**Authoritative citation:** [FASB ASC 330 Inventory — lower of cost and NRV / write-downs (DART)](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10/deloitte-guidance/330-10-35-subsequent-measurement-deloitte/retail-inventory-method-accounting-for-inventory)
**Secondary:** [NRF — The Reality of Retail Shrink](https://nrf.com/blog/reality-retail-shrink) | [Houseblend — ASC 330 write-downs are permanent](https://www.houseblend.io/articles/asc-330-inventory-valuation-write-downs) | [IFPA — 2023 Produce Supermarket Benchmarks (shrink/contribution)](https://www.freshproduce.com/siteassets/files/reports/retail/23produce-benchmark-data.pdf) | [FMI — Food Industry Facts](https://www.fmi.org/our-research/food-industry-facts)
**Notes:** Write-offs recognize loss to NRV under ASC 330 and, once taken, are **not reversed** under US GAAP. Overlaps perishable shrink (RTL-K-32) for grocery; separate damaged (general) from expired (date-code) causes.
`basisOfStandards: Write-Off Rate = (Damaged + Expired Write-Off $) ÷ Net Sales × 100; recognized to NRV under ASC 330, not reversed under US GAAP. Source: dart.deloitte.com ASC 330; nrf.com/blog/reality-retail-shrink.`

---

### RTL-K-41. Organized Retail Crime (ORC) Flags

**Canonical name:** Organized retail crime (ORC) incident flags
**Definition:** The count of incidents flagged as organized retail crime (coordinated, high-value, resale-driven theft) over a period.
**Formula:**
\[ \text{ORC Flags} = \sum (\text{incidents classified as organized retail crime}) \]
**Unit:** count | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | — | ● | ● | ● |

**Authoritative citation:** [NRF — The Impact of Retail Theft & Violence 2024](https://nrf.com/research/the-impact-of-retail-theft-violence-2024)
**Secondary:** [NRF National Retail Security Survey — Organized Retail Crime (2022 condensed)](https://www.louroe.com/wp-content/uploads/2022/10/National-Retail-Security-Survey-Organized-Retail-Crime-2022-Condensed.pdf)
**Notes:** ORC is tracked separately from individual shoplifting in the NRSS because of its higher per-incident value and links to external resale; classification criteria are **VARIABLE** by retailer. Drives the unknown-loss share (RTL-K-37) higher.
`basisOfStandards: ORC Flags = count of incidents classified as organized retail crime; classification criteria company-defined; tracked in NRSS. Source: nrf.com/research/the-impact-of-retail-theft-violence-2024.`

---

## Category 5 — Customer / Loyalty (10 KPIs)

---

### RTL-K-42. Customer Lifetime Value (LTV / CLV)

**Canonical name:** Customer lifetime value (LTV / CLV)
**Definition:** The total expected revenue (or gross margin) a customer generates across the entire relationship.
**Formula:**
\[ \text{LTV} = \text{AOV} \times \text{Purchase Frequency} \times \text{Average Customer Lifespan} \]
(gross-margin LTV multiplies the result by gross margin %)
**Unit:** $ | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | ● | ● | ◑ | ● |

**Authoritative citation:** [BDC — Calculating Customer Lifetime Value & Cost of Acquisition](https://www.bdc.ca/en/articles-tools/blog/calculating-customer-lifetime-value-cost-acquisition)
**Secondary:** [Wall Street Prep — LTV/CAC Ratio (LTV mechanics)](https://www.wallstreetprep.com/knowledge/ltv-cac-ratio/) | [Klipfolio — LTV:CAC Ratio](https://www.klipfolio.com/resources/kpi-examples/saas/customer-lifetime-value-to-customer-acquisition-cost) | [Wikipedia — RFM (recency, frequency, monetary) market research](https://en.wikipedia.org/wiki/RFM_(market_research))
**Notes:** **VARIABLE** — revenue-LTV vs. gross-margin-LTV vs. discounted-LTV all in use; use gross-margin LTV for profit-true comparison to CAC (RTL-K-44). Requires identified customers (loyalty/account), so weaker for anonymous brick-and-mortar.
`basisOfStandards: LTV = AOV × Purchase Frequency × Average Customer Lifespan (× gross margin % for margin-LTV). Source: bdc.ca CLV/CAC; wallstreetprep.com LTV/CAC.`

---

### RTL-K-43. Repeat Purchase Rate

**Canonical name:** Repeat purchase rate / repeat customer rate
**Definition:** The share of customers who make more than one purchase over a defined window.
**Formula:**
\[ \text{Repeat Purchase Rate} = \frac{\text{Customers with} \geq 2 \text{ Purchases}}{\text{Total Customers}} \times 100 \]
**Unit:** % | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | ● | ● | ● | ● |

**Authoritative citation:** [Klipfolio — Customer / retention KPI examples](https://www.klipfolio.com/resources/kpi-examples/saas/customer-lifetime-value-to-customer-acquisition-cost)
**Secondary:** [BDC — CLV (repeat transactions component)](https://www.bdc.ca/en/articles-tools/blog/calculating-customer-lifetime-value-cost-acquisition) | [Wall Street Prep — Repeat Purchase Rate (formula + calculator)](https://www.wallstreetprep.com/knowledge/repeat-purchase-rate/) | [Omniconvert — Repeat Purchase Rate (Repeat ÷ Total × 100)](https://www.omniconvert.com/what-is/repeat-purchase-rate-rpr/)
**Notes:** A direct input to the "average number of repeat transactions" in LTV (RTL-K-42). Window choice (90 days, 12 months) is **VARIABLE**; keep consistent for trend.
`basisOfStandards: Repeat Purchase Rate = Customers with ≥2 Purchases ÷ Total Customers × 100; window company-defined. Source: klipfolio.com; bdc.ca CLV.`

---

### RTL-K-44. Customer Acquisition Cost (CAC)

**Canonical name:** Customer acquisition cost (CAC)
**Definition:** The average sales-and-marketing cost to acquire one new customer.
**Formula:**
\[ \text{CAC} = \frac{\text{Total Sales \& Marketing Spend}}{\text{New Customers Acquired}} \]
**Unit:** $ | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | ● | ● | ◑ | ● |

**Authoritative citation:** [BDC — CAC = (Sales costs + Marketing costs) ÷ New Customers Acquired](https://www.bdc.ca/en/articles-tools/blog/calculating-customer-lifetime-value-cost-acquisition)
**Secondary:** [Wall Street Prep — LTV/CAC (CAC = S&M expenses ÷ new customers)](https://www.wallstreetprep.com/knowledge/ltv-cac-ratio/) | [Geckoboard — LTV:CAC Ratio](https://www.geckoboard.com/resources/kpi-examples/ltv-cac-ratio/) | [Productive — Customer acquisition vs retention economics](https://productive.io/blog/customer-retention-rate/)
**Notes:** Include all sales + marketing cost, not just paid media. Primarily an E/O metric; for brick-and-mortar, attribution to a "new customer" is weak without loyalty identification.
`basisOfStandards: CAC = Total Sales & Marketing Spend ÷ New Customers Acquired (all S&M, not just media). Source: bdc.ca CLV/CAC; wallstreetprep.com LTV/CAC.`

---

### RTL-K-45. LTV/CAC Ratio

**Canonical name:** LTV:CAC ratio
**Definition:** The ratio of customer lifetime value to customer acquisition cost, the headline acquisition-efficiency / unit-economics metric.
**Formula:**
\[ \text{LTV/CAC} = \frac{\text{LTV}}{\text{CAC}} \]
**Unit:** ratio | **Sign:** ▲ higher-better (with a target band)

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | ● | ● | ◑ | ● |

**Authoritative citation:** [Wall Street Prep — LTV/CAC Ratio = LTV ÷ CAC](https://www.wallstreetprep.com/knowledge/ltv-cac-ratio/)
**Secondary:** [Klipfolio — LTV:CAC Ratio (3:1 benchmark)](https://www.klipfolio.com/resources/kpi-examples/saas/customer-lifetime-value-to-customer-acquisition-cost) | [BDC — LTV should be 2.5–3× CAC](https://www.bdc.ca/en/articles-tools/blog/calculating-customer-lifetime-value-cost-acquisition) | [Wall Street Prep — LTV/CAC ratio](https://www.wallstreetprep.com/knowledge/ltv-cac-ratio/)
**Notes:** A 3:1 ratio is the common benchmark for healthy unit economics; below ~2:1 is unsustainable, while a very high ratio (>5:1) may signal under-investment in acquisition. Evaluate with payback period and margin.
`basisOfStandards: LTV/CAC = LTV ÷ CAC; ~3:1 healthy benchmark. Source: wallstreetprep.com LTV/CAC; klipfolio.com LTV:CAC; bdc.ca.`

---

### RTL-K-46. New vs. Returning Customer Split

**Canonical name:** New vs. returning customer mix
**Definition:** The share of revenue (or orders) from first-time customers vs. returning customers in a period.
**Formula:**
\[ \text{Returning Revenue Share} = \frac{\text{Revenue from Returning Customers}}{\text{Total Revenue}} \times 100 \]
**Unit:** % | **Sign:** ◆ target-band (balance growth vs. retention)

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | ● | ● | ● | ● |

**Authoritative citation:** [Klipfolio — Customer KPI examples](https://www.klipfolio.com/resources/kpi-examples/saas/customer-lifetime-value-to-customer-acquisition-cost)
**Secondary:** [BDC — CLV / retention](https://www.bdc.ca/en/articles-tools/blog/calculating-customer-lifetime-value-cost-acquisition) | [Productive — Customer Retention Rate (RR formula)](https://productive.io/blog/customer-retention-rate/)
**Notes:** Complements repeat purchase rate (RTL-K-43); a sharp swing toward "new" with falling repeat rate signals retention leakage despite top-line growth.
`basisOfStandards: Returning Revenue Share = Revenue from Returning Customers ÷ Total Revenue × 100. Source: klipfolio.com customer KPIs; bdc.ca CLV.`

---

### RTL-K-47. Loyalty Program Participation Rate

**Canonical name:** Loyalty enrollment / participation rate
**Definition:** The share of transactions (or customers) tied to an identified loyalty-program member.
**Formula:**
\[ \text{Loyalty Participation} = \frac{\text{Loyalty-Tagged Transactions}}{\text{Total Transactions}} \times 100 \]
**Unit:** % | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [Deloitte — Global Powers of Retailing 2025 (customer engagement / loyalty strategies)](https://www.deloitte.com/na/en/Industries/retail/research/global-powers-of-retailing.html)
**Secondary:** [Paytronix — Same-Store Sales / loyalty](https://www.paytronix.com/blog/what-are-same-store-sales) | [FMI — U.S. Grocery Shopper Trends (loyalty/engagement)](https://www.fmi.org/our-research/research-reports/u-s-grocery-shopper-trends)
**Notes:** Loyalty tagging is the mechanism that makes LTV/CAC/RFM computable for brick-and-mortar and grocery; high participation improves the identifiability of all customer KPIs. **VARIABLE** denominator (transactions vs. sales $).
`basisOfStandards: Loyalty Participation = Loyalty-Tagged Transactions ÷ Total Transactions × 100. Source: Deloitte Global Powers of Retailing 2025; Paytronix loyalty.`

---

### RTL-K-48. Loyalty Redemption Rate

**Canonical name:** Loyalty / reward redemption rate
**Definition:** The share of issued loyalty rewards (points, offers) that are redeemed within their validity window.
**Formula:**
\[ \text{Redemption Rate} = \frac{\text{Rewards Redeemed}}{\text{Rewards Issued}} \times 100 \]
**Unit:** % | **Sign:** ▲ higher-better (engagement); ◆ for liability management

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ● | ● |

**Authoritative citation:** [FASB ASC 606 — customer options / loyalty points as performance obligations (DART)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-6-revenue-recognized-a-point)
**Secondary:** [Deloitte — Global Powers of Retailing 2025 (loyalty)](https://www.deloitte.com/na/en/Industries/retail/research/global-powers-of-retailing.html) | [Deloitte DART — 8.8 Customers' Unexercised Rights (Breakage), ASC 606-10-55-46](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-8-customers-unexercised-rights-breakage) | [BDO — ASC 606's Impact on Loyalty Programs (redemption is key)](https://www.bdo.com/insights/industries/restaurants/asc-606%E2%80%99s-impact-on-loyalty-programs-redemption-is-key)
**Notes:** Under ASC 606, material loyalty points are a separate performance obligation; the **breakage** estimate (unredeemed points) directly affects revenue recognition timing, so redemption rate is both an engagement and an accounting input.
`basisOfStandards: Redemption Rate = Rewards Redeemed ÷ Rewards Issued × 100; loyalty points are an ASC 606 performance obligation with breakage estimation. Source: dart.deloitte.com ASC 606; Deloitte Global Powers of Retailing.`

---

### RTL-K-49. RFM Score (Recency / Frequency / Monetary)

**Canonical name:** RFM (recency, frequency, monetary) segmentation score
**Definition:** A composite customer-value score combining how recently, how often, and how much a customer has purchased.
**Formula:**
\[ \text{RFM} = f(R, F, M) \text{ where } R = \text{days since last purchase},\ F = \text{purchase count},\ M = \text{total spend} \]
(typically quintile-scored 1–5 per dimension)
**Unit:** composite score | **Sign:** ▲ higher-better (low recency-days = better)

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | ● | ● | ● | ● |

**Authoritative citation:** [Klipfolio — Customer segmentation KPI examples](https://www.klipfolio.com/resources/kpi-examples/saas/customer-lifetime-value-to-customer-acquisition-cost)
**Secondary:** [BDC — CLV (recency/frequency/monetary drivers)](https://www.bdc.ca/en/articles-tools/blog/calculating-customer-lifetime-value-cost-acquisition) | [Microsoft Learn — Set up Recency, Frequency, Monetary (RFM) analysis](https://learn.microsoft.com/en-us/dynamics365/commerce/set-up-rfm-analysis) | [TechTarget — RFM analysis (recency, frequency, monetary)](https://www.techtarget.com/searchdatamanagement/definition/RFM-analysis)
**Notes:** Scoring scheme (quintiles vs. thresholds, weighting) is **VARIABLE**; RFM segments feed targeting and predicted LTV (RTL-K-42). Requires identified-customer data (loyalty/account).
`basisOfStandards: RFM = f(Recency, Frequency, Monetary), typically quintile-scored 1–5 per dimension; scheme company-defined. Source: klipfolio.com customer KPIs; bdc.ca CLV.`

---

### RTL-K-50. Net Promoter Score (NPS)

**Canonical name:** Net Promoter Score (NPS)
**Definition:** The percentage of promoters (9–10) minus the percentage of detractors (0–6) on the 0–10 "likelihood to recommend" question.
**Formula:**
\[ \text{NPS} = \%\text{Promoters} - \%\text{Detractors} \]
**Unit:** score (−100 to +100) | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | ◑ | ◑ | ◑ | ◑ |

**Authoritative citation:** [Deloitte — Global Powers of Retailing 2025 (customer experience metrics)](https://www.deloitte.com/na/en/Industries/retail/research/global-powers-of-retailing.html)
**Secondary:** [Klipfolio — customer experience KPI examples](https://www.klipfolio.com/resources/kpi-examples/saas/customer-lifetime-value-to-customer-acquisition-cost) | [Bain & Company — Introducing the Net Promoter System](https://www.bain.com/insights/introducing-the-net-promoter-system-loyalty-insights/) | [Bain & Company — Net Promoter Score & System](https://www.bain.com/consulting-services/customer-strategy-and-marketing/net-promoter-score-system/)
**Notes:** Secondary/drill-down for all sub-segments (survey-based, not transactional). Sampling and channel bias make cross-retailer comparison weak; use as a trend, not an absolute.
`basisOfStandards: NPS = %Promoters (9–10) − %Detractors (0–6) on 0–10 recommend scale. Source: Deloitte Global Powers of Retailing 2025; klipfolio.com CX KPIs.`

---

### RTL-K-51. Email / SMS Subscriber Growth

**Canonical name:** Owned-audience (email/SMS) subscriber growth
**Definition:** The net growth rate of opt-in marketing subscribers over a period, a measure of owned-channel reach.
**Formula:**
\[ \text{Subscriber Growth \%} = \frac{\text{Subscribers}_{t} - \text{Subscribers}_{t-1}}{\text{Subscribers}_{t-1}} \times 100 \]
**Unit:** % | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | ● | ● | ◑ | ● |

**Authoritative citation:** [Klipfolio — marketing/owned-audience KPI examples](https://www.klipfolio.com/resources/kpi-examples/ecommerce/order-value)
**Secondary:** [Deloitte — Global Powers of Retailing 2025 (alternative revenue / retail media)](https://www.deloitte.com/na/en/Industries/retail/research/global-powers-of-retailing.html) | [FMI — U.S. Grocery Shopper Trends (digital engagement)](https://www.fmi.org/our-research/research-reports/u-s-grocery-shopper-trends)
**Notes:** Net of unsubscribes/bounces; owned-audience size lowers effective CAC (RTL-K-44) by reducing paid-media dependence. Most relevant for E/O/S.
`basisOfStandards: Subscriber Growth % = (Subscribers_t − Subscribers_{t-1}) ÷ Subscribers_{t-1} × 100, net of unsubscribes/bounces. Source: klipfolio.com; Deloitte Global Powers of Retailing.`

---

## Category 6 — Returns and Reverse Logistics (6 KPIs)

---

### RTL-K-52. Returns Rate (% of Gross Sales)

**Canonical name:** Return rate / returns rate
**Definition:** The value (or units) of merchandise returned as a percentage of gross sales over a period.
**Formula:**
\[ \text{Return Rate} = \frac{\text{Returned Merchandise \$ (or units)}}{\text{Gross Sales \$ (or units)}} \times 100 \]
**Unit:** % | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ◑ | ● |

**Authoritative citation:** [NRF and Happy Returns — 2024 Retail Returns Total $890 Billion (16.9% of sales)](https://nrf.com/media-center/press-releases/nrf-and-happy-returns-report-2024-retail-returns-total-890-billion)
**Secondary:** [NRF — 2025 Retail Returns Landscape (15.8% overall in 2025)](https://nrf.com/research/2025-retail-returns-landscape) | [Shopify — Ecommerce return rate (items returned ÷ items sold × 100)](https://www.shopify.com/enterprise/blog/ecommerce-returns) | [National Retail Federation — 2025 returns expected ~$850B (S&DC Executive)](https://www.sdcexec.com/sourcing-procurement/reverse-logistics/news/22952626/national-retail-federation-nrf-returns-expected-to-cost-retailers-nearly-850b-in-2025)
**Notes:** NRF/Happy Returns is the industry benchmark: overall retail returns were ~16.9% of sales in 2024 and an estimated 15.8% in 2025 ([NRF — 2025 Returns Landscape](https://nrf.com/research/2025-retail-returns-landscape)). Under ASC 606, expected returns reduce recognized revenue (see RTL-K-56).
`basisOfStandards: Return Rate = Returned Merchandise $ (or units) ÷ Gross Sales $ (or units) × 100; NRF/Happy Returns benchmark ~15.8–16.9% overall. Source: nrf.com/research/2025-retail-returns-landscape.`

---

### RTL-K-53. Returns Rate by Channel

**Canonical name:** Channel-level return rate (online vs. in-store)
**Definition:** The return rate computed separately by fulfillment/purchase channel, capturing the structurally higher online return rate.
**Formula:**
\[ \text{Channel Return Rate}_{c} = \frac{\text{Returned \$ in Channel } c}{\text{Gross Sales \$ in Channel } c} \times 100 \]
**Unit:** % | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ◑ | ● |

**Authoritative citation:** [NRF — 2025 Retail Returns Landscape (online returns est. 19.3% in 2025)](https://nrf.com/research/2025-retail-returns-landscape)
**Secondary:** [NRF and Happy Returns — 2024 Returns $890B](https://nrf.com/media-center/press-releases/nrf-and-happy-returns-report-2024-retail-returns-total-890-billion) | [Shopify — Ecommerce returns](https://www.shopify.com/enterprise/blog/ecommerce-returns) | [Capital One Shopping — Average Retail Return Rate by channel](https://capitaloneshopping.com/research/average-retail-return-rate/)
**Notes:** E-commerce return rates are consistently higher than store — NRF estimated ~19.3% of online sales returned in 2025 vs. 15.8% overall. Apparel/footwear runs materially higher still. Read with wardrobing flags (RTL-K-57).
`basisOfStandards: Channel Return Rate = Returned $ in channel ÷ Gross Sales $ in channel × 100; online ~19.3% vs. overall ~15.8% (2025). Source: nrf.com/research/2025-retail-returns-landscape.`

---

### RTL-K-54. Restocking Fee Revenue

**Canonical name:** Restocking fee recovery
**Definition:** Revenue (or cost offset) recovered through restocking fees charged on returns, partially offsetting reverse-logistics cost.
**Formula:**
\[ \text{Restocking Fee Revenue} = \sum (\text{Restocking Fee per Return} \times \text{Returns Subject to Fee}) \]
**Unit:** $ | **Sign:** ▲ higher-better (as cost recovery)

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | ● | ● | — | ● |

**Authoritative citation:** [FASB ASC 606 — right of return / variable consideration (DART)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-6-revenue-recognized-a-point)
**Secondary:** [RevenueHub — Rights of Return and Customer Acceptance in ASC 606](https://www.revenuehub.org/article/rights-of-return-and-customer-acceptance) | [Deloitte DART — Rights of return refund liability (ASC 606 point in time)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-6-revenue-recognized-a-point) | [RSM — A Guide to Revenue Recognition (rights of return)](https://rsmus.com/content/dam/rsm/insights/services/audit/1pdf/a-guide-to-revenue-recognition_V2.pdf)
**Notes:** Restocking fees affect the net refund liability under ASC 606's right-of-return model. Largely absent in grocery (perishables not returnable). Read against reverse-logistics cost (RTL-K-55).
`basisOfStandards: Restocking Fee Revenue = Σ (Restocking Fee per Return × Returns Subject to Fee); affects ASC 606 refund liability. Source: dart.deloitte.com ASC 606; revenuehub.org rights-of-return.`

---

### RTL-K-55. Reverse Logistics Cost per Return

**Canonical name:** Reverse-logistics cost per return
**Definition:** The fully loaded cost (shipping, processing, inspection, restocking, disposal) to handle one returned order.
**Formula:**
\[ \text{Reverse Logistics Cost per Return} = \frac{\text{Total Reverse Logistics Cost}}{\text{Number of Returns}} \]
**Unit:** $ / return | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | ● | ● | ◑ | ● |

**Authoritative citation:** [NRF and Happy Returns — 2024 Retail Returns Total $890 Billion (cost of returns)](https://nrf.com/media-center/press-releases/nrf-and-happy-returns-report-2024-retail-returns-total-890-billion)
**Secondary:** [NRF — 2025 Retail Returns Landscape](https://nrf.com/research/2025-retail-returns-landscape) | [McKinsey & Company — Modernizing reverse logistics (cost per return)](https://www.mckinsey.com/industries/logistics/our-insights/from-cost-center-to-competitive-advantage-modernizing-reverse-logistics-with-ai) | [Capstone Logistics — Reverse logistics by the numbers ($3–$6 per package)](https://www.capstonelogistics.com/blog/reverse-logistics-by-the-numbers/)
**Notes:** Includes the recovery-asset write-down when returned goods cannot be resold at full value (ASC 606 return-asset measurement). Highest for e-commerce due to last-mile shipping. **VARIABLE** cost scope.
`basisOfStandards: Reverse Logistics Cost per Return = Total Reverse Logistics Cost ÷ Number of Returns; cost scope company-defined. Source: nrf.com/media-center returns; nrf.com/research/2025-retail-returns-landscape.`

---

### RTL-K-56. Refund-to-Replacement Ratio

**Canonical name:** Refund vs. exchange/replacement mix
**Definition:** The share of returns resolved by cash/credit refund vs. exchange or replacement, indicating revenue-retention on returns.
**Formula:**
\[ \text{Refund Share} = \frac{\text{Returns Resolved by Refund}}{\text{Total Returns}} \times 100 \]
**Unit:** % | **Sign:** ▼ lower-better (lower refund share retains more revenue)

| B | E | O | G | S |
|---|---|---|---|---|
| ● | ● | ● | ◑ | ● |

**Authoritative citation:** [FASB ASC 606 — right of return, refund liability vs. exchange (DART)](https://dart.deloitte.com/USDART/home/codification/revenue/asc606-10/roadmap-revenue-recognition/chapter-8-step-5-determine-when/8-6-revenue-recognized-a-point)
**Secondary:** [RevenueHub — Rights of Return in ASC 606 (refund liability mechanics)](https://www.revenuehub.org/article/rights-of-return-and-customer-acceptance) | [EY — How the revenue standard affects retail (rights of return)](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-us/technical/accountinglink/documents/ey-tl03068-171us-04-23-2024.pdf)
**Notes:** Refunds reduce recognized revenue and increase the refund liability; exchanges generally do not. Under ASC 606/IFRS 15 an entity recognizes revenue only for goods not expected to be returned ([Data Studios — accounting for sales with a right of return](https://www.datastudios.org/post/how-to-account-for-sales-with-a-right-of-return)).
`basisOfStandards: Refund Share = Returns Resolved by Refund ÷ Total Returns × 100; refunds reduce revenue under ASC 606 right-of-return model. Source: dart.deloitte.com ASC 606; revenuehub.org.`

---

### RTL-K-57. Wardrobing / Return-Abuse Flags (Apparel)

**Canonical name:** Wardrobing flags / serial-return abuse flags
**Definition:** The count of returns flagged as wardrobing (use-then-return) or serial-return abuse, an apparel-weighted return-fraud signal.
**Formula:**
\[ \text{Wardrobing Flags} = \sum (\text{returns flagged as use-then-return or serial abuse}) \]
**Unit:** count | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | ● | ● | — | ● |

**Authoritative citation:** [NRF and Happy Returns — 2024 Retail Returns Total $890 Billion (return fraud/abuse)](https://nrf.com/media-center/press-releases/nrf-and-happy-returns-report-2024-retail-returns-total-890-billion)
**Secondary:** [NRF — 2025 Retail Returns Landscape](https://nrf.com/research/2025-retail-returns-landscape) | [McKinsey & Company — Reverse logistics (return-abuse decisioning)](https://www.mckinsey.com/industries/logistics/our-insights/from-cost-center-to-competitive-advantage-modernizing-reverse-logistics-with-ai)
**Notes:** Subset of return fraud (RTL-K-39) specific to wearable goods; flagging criteria are **VARIABLE** (tag-tampering, tight return windows, repeat returners). Highest in specialty/apparel and online.
`basisOfStandards: Wardrobing Flags = count of returns flagged as use-then-return or serial abuse; criteria company-defined. Source: nrf.com/media-center returns; nrf.com/research/2025-retail-returns-landscape.`

---

## Category 7 — Omnichannel and Digital (10 KPIs)

---

### RTL-K-58. BOPIS Adoption Rate

**Canonical name:** Buy-online-pickup-in-store (BOPIS) adoption rate
**Definition:** The share of online orders fulfilled via in-store pickup rather than shipment.
**Formula:**
\[ \text{BOPIS Adoption} = \frac{\text{BOPIS Orders}}{\text{Total Online Orders}} \times 100 \]
**Unit:** % | **Sign:** ▲ higher-better (lowers fulfillment cost; drives store traffic)

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | — | ● | ● | ● |

**Authoritative citation:** [IBM — What is BOPIS (Buy Online, Pickup in Store)?](https://www.ibm.com/think/topics/bopis-retail)
**Secondary:** [Zebra Technologies — What is Buy Online, Pick Up in Store (BOPIS)?](https://www.zebra.com/us/en/resource-library/faq/What-is-Buy-Online,-Pick-Up-in-Store-BOPIS.html) | [Celerant — What is BOPIS in Retail (US click-and-collect >$150B by 2025)](https://www.celerant.com/blog/what-is-bopis-in-retail/) | [Shopify — Buy Online, Return In-Store (BORIS) guide](https://www.shopify.com/enterprise/blog/buy-online-return-in-store)
**Notes:** BOPIS (a.k.a. click-and-collect) requires accurate store inventory (RTL-K-35); pickup trips drive incremental attach (RTL-K-63). Not applicable to pure-play e-commerce (no stores).
`basisOfStandards: BOPIS Adoption = BOPIS Orders ÷ Total Online Orders × 100. Source: ibm.com/think/topics/bopis-retail; zebra.com BOPIS FAQ.`

---

### RTL-K-59. BORIS (Buy Online, Return In Store) Rate

**Canonical name:** Buy-online-return-in-store (BORIS) rate
**Definition:** The share of online-purchase returns processed at a physical store rather than shipped back.
**Formula:**
\[ \text{BORIS Rate} = \frac{\text{Online Returns Processed In-Store}}{\text{Total Online Returns}} \times 100 \]
**Unit:** % | **Sign:** ▲ higher-better (lower reverse-shipping cost; drives traffic)

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | — | ● | ◑ | ● |

**Authoritative citation:** [NRF — 2025 Retail Returns Landscape (in-store return of online orders)](https://nrf.com/research/2025-retail-returns-landscape)
**Secondary:** [Capital One Shopping — Average Retail Return Rate (59.5% of e-commerce returns made in-store)](https://capitaloneshopping.com/research/average-retail-return-rate/) | [Shopify — What is Buy Online, Return In-Store (BORIS)](https://www.shopify.com/enterprise/blog/buy-online-return-in-store) | [ReverseLogix — Reverse logistics and BORIS](https://www.reverselogix.com/industry-updates/reverse-logistics-and-boris/)
**Notes:** A majority of e-commerce returns are made in-store, so BORIS materially lowers reverse-logistics cost (RTL-K-55) while creating store-visit traffic and re-purchase opportunity. Requires stores (O/S).
`basisOfStandards: BORIS Rate = Online Returns Processed In-Store ÷ Total Online Returns × 100. Source: nrf.com/research/2025-retail-returns-landscape; capitaloneshopping.com return rate.`

---

### RTL-K-60. Ship-from-Store Fulfillment %

**Canonical name:** Ship-from-store (SFS) fulfillment share
**Definition:** The share of online orders fulfilled from store inventory rather than a distribution center.
**Formula:**
\[ \text{SFS \%} = \frac{\text{Orders Shipped from Store}}{\text{Total Online Orders}} \times 100 \]
**Unit:** % | **Sign:** ◆ target-band (improves speed/availability but raises pick cost)

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | — | ● | ◑ | ● |

**Authoritative citation:** [NewStore — What Is a BOPIS Order? (store-based fulfillment models)](https://www.newstore.com/articles/bopis-order/)
**Secondary:** [Tulip — BOPIS / store inventory leverage](https://www.tulip.com/blog/bopis-meaning-in-modern-retail-0625/) | [Bain & Company — Retail fulfillment: the ultimate supply-chain balancing act](https://www.bain.com/insights/retail-fulfillment-the-ultimate-supply-chain-balancing-act/) | [Practical Ecommerce — Ship-from-store fulfillment for brick-and-click retailers](https://www.practicalecommerce.com/ship-from-store-fulfillment-a-must-for-brick-and-click-retailers)
**Notes:** SFS turns stores into mini-fulfillment nodes; depends on inventory accuracy (RTL-K-35) and raises pick/pack labor cost per order (RTL-K-61). Omnichannel-specific.
`basisOfStandards: SFS % = Orders Shipped from Store ÷ Total Online Orders × 100. Source: newstore.com BOPIS order; tulip.com BOPIS.`

---

### RTL-K-61. Fulfillment Cost per Order

**Canonical name:** Cost to fulfill / fulfillment cost per order
**Definition:** The fully loaded cost (pick, pack, ship, last-mile) to fulfill one order, the core omnichannel-economics metric.
**Formula:**
\[ \text{Fulfillment Cost per Order} = \frac{\text{Total Fulfillment Cost}}{\text{Number of Orders Fulfilled}} \]
**Unit:** $ / order | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| — | ● | ● | ● | ● |

**Authoritative citation:** [Deloitte — Global Powers of Retailing 2025 (operational efficiency / fulfillment)](https://www.deloitte.com/na/en/Industries/retail/research/global-powers-of-retailing.html)
**Secondary:** [Deck Commerce — What is BOPIS Fulfillment](https://www.deckcommerce.com/blog/what-is-bopis) | [Shopify — Fulfillment costs (CPO = total order expenses ÷ orders received)](https://www.shopify.com/uk/blog/fulfillment-costs) | [Institute for Supply Management — The Monthly Metric: Fulfillment Cost Per Order](https://www.ismworld.org/supply-management-news-and-reports/news-publications/inside-supply-management-magazine/blog/2023/2023-08/the-monthly-metric-fulfillment-cost-per-order/)
**Notes:** Channel mix drives this: BOPIS/BORIS lower it, ship-from-store and home delivery raise it. Compare against AOV (RTL-K-06) to gauge order-level contribution. **VARIABLE** cost scope.
`basisOfStandards: Fulfillment Cost per Order = Total Fulfillment Cost ÷ Number of Orders Fulfilled; cost scope company-defined. Source: Deloitte Global Powers of Retailing 2025; deckcommerce.com.`

---

### RTL-K-62. Delivery On-Time Rate

**Canonical name:** On-time delivery (OTD) rate
**Definition:** The share of orders delivered by the promised date/window.
**Formula:**
\[ \text{OTD Rate} = \frac{\text{Orders Delivered On Time}}{\text{Total Orders Delivered}} \times 100 \]
**Unit:** % | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| — | ● | ● | ● | ● |

**Authoritative citation:** [Deloitte — Global Powers of Retailing 2025 (service / delivery expectations)](https://www.deloitte.com/na/en/Industries/retail/research/global-powers-of-retailing.html)
**Secondary:** [Zebra Technologies — BOPIS / fulfillment speed](https://www.zebra.com/us/en/resource-library/faq/What-is-Buy-Online,-Pick-Up-in-Store-BOPIS.html) | [Deloitte — Last-mile strategy: enabling speed and flexibility](https://www.deloitte.com/in/en/services/consulting/perspectives/gx-last-mile-strategy.html)
**Notes:** "On time" definition (carrier scan vs. customer receipt; promised-date source) is **VARIABLE**; align with the customer-facing promise. A key driver of repeat purchase (RTL-K-43) and NPS (RTL-K-50).
`basisOfStandards: OTD Rate = Orders Delivered On Time ÷ Total Orders Delivered × 100; on-time basis company-defined. Source: Deloitte Global Powers of Retailing 2025.`

---

### RTL-K-63. Click-and-Collect Attach Rate

**Canonical name:** Pickup attach / incremental basket on collect
**Definition:** The share of in-store pickups that generate an additional in-store purchase (attach), monetizing BOPIS traffic.
**Formula:**
\[ \text{Attach Rate} = \frac{\text{Pickups with Incremental In-Store Purchase}}{\text{Total Pickups}} \times 100 \]
**Unit:** % | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | — | ● | ● | ● |

**Authoritative citation:** [Tulip — BOPIS (nearly half of pickups make additional impulse purchases)](https://www.tulip.com/blog/bopis-meaning-in-modern-retail-0625/)
**Secondary:** [IBM — BOPIS (up-sell/cross-sell on pickup)](https://www.ibm.com/think/topics/bopis-retail) | [Tulip — BOPIS in modern retail (attach-rate context)](https://www.tulip.com/blog/bopis-meaning-in-modern-retail-0625/)
**Notes:** The attach effect is the core financial argument for BOPIS — pickup trips create cross-sell opportunity that pure shipping does not. Omnichannel/grocery/specialty relevant.
`basisOfStandards: Attach Rate = Pickups with Incremental In-Store Purchase ÷ Total Pickups × 100. Source: tulip.com BOPIS; ibm.com/think/topics/bopis-retail.`

---

### RTL-K-64. Endless Aisle Conversion

**Canonical name:** Endless-aisle / save-the-sale conversion
**Definition:** The share of in-store endless-aisle sessions (ordering out-of-stock or extended assortment via in-store digital) that convert to an order.
**Formula:**
\[ \text{Endless Aisle Conversion} = \frac{\text{Endless-Aisle Orders Placed}}{\text{Endless-Aisle Sessions}} \times 100 \]
**Unit:** % | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ◑ | — | ● | ◑ | ● |

**Authoritative citation:** [Deloitte — Global Powers of Retailing 2025 (in-store digital / experience)](https://www.deloitte.com/na/en/Industries/retail/research/global-powers-of-retailing.html)
**Secondary:** [Tulip — omnichannel store technology](https://www.tulip.com/blog/bopis-meaning-in-modern-retail-0625/) | [Deloitte — Unified commerce omnichannel offering](https://www.deloitte.com/cz-sk/en/Industries/consumer/perspectives/unified-commerce.html)
**Notes:** Recaptures sales lost to in-store stockouts (RTL-K-30) by selling the broader online assortment from the floor; an omnichannel and specialty metric. **VARIABLE** definition by platform.
`basisOfStandards: Endless Aisle Conversion = Endless-Aisle Orders Placed ÷ Endless-Aisle Sessions × 100. Source: Deloitte Global Powers of Retailing 2025; tulip.com omnichannel.`

---

### RTL-K-65. Mobile vs. Desktop Conversion

**Canonical name:** Device-level conversion (mobile vs. desktop)
**Definition:** Conversion rate computed separately by device class, exposing mobile-experience gaps.
**Formula:**
\[ \text{Conversion}_{d} = \frac{\text{Orders on Device } d}{\text{Sessions on Device } d} \times 100, \quad d \in \{\text{mobile, desktop, tablet}\} \]
**Unit:** % | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| — | ● | ● | ◑ | ◑ |

**Authoritative citation:** [Klipfolio — E-commerce KPI examples (conversion)](https://www.klipfolio.com/resources/kpi-examples/ecommerce/order-value)
**Secondary:** [Optimizely — conversion / device segmentation glossary](https://www.optimizely.com/optimization-glossary/average-order-value) | [Shopify — Retail website conversion rate (purchases ÷ sessions)](https://www.shopify.com/blog/retail-conversion-rate) | [Dynamic Yield — Conversion-rate benchmarks by device/industry](https://marketing.dynamicyield.com/benchmarks/conversion-rate/)
**Notes:** Mobile typically shows higher traffic but lower conversion than desktop; a persistent mobile gap signals checkout/UX friction. Subset of conversion rate (RTL-K-11) for digital channels.
`basisOfStandards: Device Conversion = Orders on Device ÷ Sessions on Device × 100, by device class. Source: klipfolio.com e-commerce KPIs; optimizely.com.`

---

### RTL-K-66. Page Load Time Impact

**Canonical name:** Site performance / page-load-time impact on conversion
**Definition:** The change in conversion or revenue associated with site/page load latency, a digital-experience performance metric.
**Formula:**
\[ \Delta \text{Conversion} = f(\text{Page Load Time}) \quad (\text{conversion measured across load-time cohorts}) \]
**Unit:** % conversion per second (elasticity) | **Sign:** ▼ lower-better (lower load time = higher conversion)

| B | E | O | G | S |
|---|---|---|---|---|
| — | ● | ● | ◑ | ◑ |

**Authoritative citation:** [Klipfolio — E-commerce KPI examples (site performance / conversion)](https://www.klipfolio.com/resources/kpi-examples/ecommerce/order-value)
**Secondary:** [Optimizely — optimization glossary](https://www.optimizely.com/optimization-glossary/average-order-value) | [Pingdom — How page load time affects conversion rate (Google <3s)](https://www.pingdom.com/blog/how-does-page-load-time-affect-your-conversion-rate/) | [Cloudflare — How website performance affects conversion rates](https://www.cloudflare.com/learning/performance/more/website-performance-conversion-rates/)
**Notes:** Measured by cohorting conversion against load-time buckets (Core Web Vitals are the common technical basis). E/O specific; latency degrades add-to-cart (RTL-K-12) and conversion (RTL-K-11).
`basisOfStandards: Page-load-time impact = conversion/revenue elasticity to load latency, cohorted by load-time bucket. Source: klipfolio.com e-commerce KPIs; optimizely.com.`

---

### RTL-K-67. Search Relevance / Zero-Result Rate

**Canonical name:** On-site search zero-result (null-result) rate
**Definition:** The share of on-site search queries that return no results, an e-commerce findability metric.
**Formula:**
\[ \text{Zero-Result Rate} = \frac{\text{Searches Returning Zero Results}}{\text{Total On-Site Searches}} \times 100 \]
**Unit:** % | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| — | ● | ● | ◑ | ◑ |

**Authoritative citation:** [Klipfolio — E-commerce KPI examples (on-site search / conversion)](https://www.klipfolio.com/resources/kpi-examples/ecommerce/order-value)
**Secondary:** [Optimizely — optimization glossary](https://www.optimizely.com/optimization-glossary/average-order-value) | [Baymard Institute — E-Commerce checkout & search usability research](https://baymard.com/research/checkout-usability)
**Notes:** High zero-result rates suppress conversion (RTL-K-11) and reveal catalog/synonym gaps; searchers convert at materially higher rates than non-searchers, so this is a high-leverage E/O metric.
`basisOfStandards: Zero-Result Rate = Searches Returning Zero Results ÷ Total On-Site Searches × 100. Source: klipfolio.com e-commerce KPIs; optimizely.com.`

---

## Category 8 — Store Operations (6 KPIs)

---

### RTL-K-68. Labor Cost % of Sales

**Canonical name:** Labor cost as a percentage of sales (labor-to-sales ratio)
**Definition:** Store labor cost (wages, benefits, payroll taxes) as a percentage of net sales, the core store-cost-control metric.
**Formula:**
\[ \text{Labor \% of Sales} = \frac{\text{Total Store Labor Cost}}{\text{Net Sales}} \times 100 \]
**Unit:** % | **Sign:** ▼ lower-better (within service-quality limits)

| B | E | O | G | S |
|---|---|---|---|---|
| ● | — | ● | ● | ● |

**Authoritative citation:** [U.S. Census Bureau — Sector 44-45 Retail Trade (store operations scope)](https://www.census.gov/naics/resources/archives/sect44-45.html)
**Secondary:** [Deloitte — Global Powers of Retailing 2025 (operational efficiency)](https://www.deloitte.com/na/en/Industries/retail/research/global-powers-of-retailing.html) | [Ariadne — Retail Labor Cost Benchmark (labor ÷ revenue methodology)](https://www.ariadne.inc/resources/blogs/retail-labor-cost-benchmark/) | [Eagle Rock CFO — Retail KPI benchmarks (labor 10–20% of revenue)](https://www.eaglerockcfo.com/blog/industry-kpi-benchmarks/retail-business-kpi-benchmarks)
**Notes:** Labor scope (store-only vs. including DC/fulfillment) is **VARIABLE**; for grocery this is the largest controllable operating cost. Trades off against customer wait time (RTL-K-71) and conversion (RTL-K-11).
`basisOfStandards: Labor % of Sales = Total Store Labor Cost ÷ Net Sales × 100; labor scope company-defined. Source: U.S. Census Sector 44-45; Deloitte Global Powers of Retailing.`

---

### RTL-K-69. Sales per Labor Hour (Store-Ops View)

**Canonical name:** Sales per labor hour (SPLH) — store operations
**Definition:** Net sales per worked labor hour, the productivity counterpart to labor cost % within store operations.
**Formula:**
\[ \text{SPLH} = \frac{\text{Net Sales}}{\text{Worked Labor Hours}} \]
**Unit:** $ / hour | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | — | ● | ● | ● |

**Authoritative citation:** [U.S. Census Bureau — Sector 44-45 Retail Trade (store operations)](https://www.census.gov/naics/resources/archives/sect44-45.html)
**Secondary:** [Klipfolio — retail productivity KPI examples](https://www.klipfolio.com/resources/kpi-examples/ecommerce/order-value) | [Workforce.com — Retail scheduling best practices (sales per labor hour)](https://www.workforce.com/news/5-retail-scheduling-best-practices)
**Notes:** This is the store-operations framing of RTL-K-04 (sales-productivity category lists the same metric); kept in both categories per the manufacturing-precedent practice of surfacing a metric in each panel where it is used. Pair with labor % (RTL-K-68).
`basisOfStandards: SPLH = Net Sales ÷ Worked Labor Hours. Source: U.S. Census Sector 44-45; klipfolio.com retail KPIs.`

---

### RTL-K-70. Schedule Adherence

**Canonical name:** Schedule adherence / labor-plan compliance
**Definition:** The degree to which actual worked hours match the published/forecast schedule.
**Formula:**
\[ \text{Schedule Adherence} = \left(1 - \frac{|\text{Actual Hours} - \text{Scheduled Hours}|}{\text{Scheduled Hours}}\right) \times 100 \]
**Unit:** % | **Sign:** ▲ higher-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | — | ● | ● | ● |

**Authoritative citation:** [U.S. Census Bureau — Sector 44-45 Retail Trade (store operations / staffing)](https://www.census.gov/naics/resources/archives/sect44-45.html)
**Secondary:** [Deloitte — Global Powers of Retailing 2025 (workforce / operational efficiency)](https://www.deloitte.com/na/en/Industries/retail/research/global-powers-of-retailing.html) | [Aspect — Schedule adherence (Time worked ÷ Time scheduled × 100)](https://www.aspect.com/resources/improving-schedule-adherence) | [Verint — Schedule adherence in the call center (225 ÷ 250 = 90%)](https://www.verint.com/blog/what-is-schedule-adherence-and-why-is-it-important-in-the-call-center/)
**Notes:** Poor adherence breaks the link between forecasted traffic (RTL-K-10) and floor coverage (RTL-K-72), driving either over-spend (labor %) or service gaps (wait time). **VARIABLE** tolerance.
`basisOfStandards: Schedule Adherence = (1 − |Actual − Scheduled Hours| ÷ Scheduled Hours) × 100; tolerance company-defined. Source: U.S. Census Sector 44-45; Deloitte Global Powers of Retailing.`

---

### RTL-K-71. Customer Wait Time

**Canonical name:** Customer / checkout wait time
**Definition:** The average time a customer waits in queue (checkout, service desk, pickup) — a service-quality and conversion-risk metric.
**Formula:**
\[ \text{Average Wait Time} = \frac{\sum \text{Customer Queue Time}}{\text{Number of Customers Served}} \]
**Unit:** minutes (or seconds) | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | — | ● | ● | ● |

**Authoritative citation:** [ICSC — America's Marketplace (dwell time / service as productivity benchmarks)](https://www.icsc.com/uploads/research/general/America-Marketplace.pdf)
**Secondary:** [U.S. Census Bureau — Sector 44-45 Retail Trade (after-sales services)](https://www.census.gov/naics/resources/archives/sect44-45.html) | [MCP Analytics — Schedule adherence and service-level impact](https://mcpanalytics.ai/articles/schedule-adherence-analysis-practical-guide-for-data-driven-decisions)
**Notes:** Long waits depress conversion (RTL-K-11) and NPS (RTL-K-50), especially in grocery checkout and BOPIS pickup. Directly traded off against labor cost % (RTL-K-68) and floor coverage (RTL-K-72).
`basisOfStandards: Average Wait Time = Σ Customer Queue Time ÷ Number of Customers Served. Source: ICSC America's Marketplace; U.S. Census Sector 44-45.`

---

### RTL-K-72. Floor Coverage Ratio

**Canonical name:** Floor coverage / staffing-to-area ratio
**Definition:** The ratio of staffed selling-floor coverage to the area or traffic that must be served, measuring service capacity.
**Formula:**
\[ \text{Floor Coverage} = \frac{\text{Scheduled Floor Associates}}{\text{Selling Area (sq ft) or Forecast Traffic}} \]
**Unit:** ratio (associates per 1,000 sq ft or per traffic unit) | **Sign:** ◆ target-band

| B | E | O | G | S |
|---|---|---|---|---|
| ● | — | ● | ● | ● |

**Authoritative citation:** [U.S. Census Bureau — Sector 44-45 Retail Trade (selling area / store operations)](https://www.census.gov/naics/resources/archives/sect44-45.html)
**Secondary:** [ICSC — Asia-Pacific Shopping Centre Classification (Net Leasable Area basis)](https://www.icsc.com/uploads/research/general/Asia-Pacific_Shopping_Centre_Classification_Standard.pdf) | [Ariadne — Labor per visit / footfall denominator methodology](https://www.ariadne.inc/resources/blogs/retail-labor-cost-benchmark/)
**Notes:** Coverage should be set against forecast traffic by daypart, not a flat ratio; under-coverage raises wait time (RTL-K-71) and lost conversion. Measure area on selling/Net Leasable Area for comparability.
`basisOfStandards: Floor Coverage = Scheduled Floor Associates ÷ Selling Area (sq ft) or Forecast Traffic; set by daypart. Source: U.S. Census Sector 44-45; ICSC NLA basis.`

---

### RTL-K-73. Energy Cost per Square Foot

**Canonical name:** Energy cost / energy use intensity (EUI) per square foot
**Definition:** Energy cost (or kWh) consumed per square foot of store/center area, the core facilities-cost and sustainability metric.
**Formula:**
\[ \text{Energy per Sq Ft} = \frac{\text{Total Energy Cost (or kWh)}}{\text{Gross Leasable Area (sq ft)}} \]
**Unit:** $ / sq ft (or kWh / sq ft) | **Sign:** ▼ lower-better

| B | E | O | G | S |
|---|---|---|---|---|
| ● | — | ● | ● | ● |

**Authoritative citation:** [ICSC — Shopping Center Energy Intensity Benchmarking Study (EUI = total energy kWh ÷ Gross Leasable Area)](https://www.icsc.com/uploads/about/ICSC-Industry-Benchmarking-Report-For-Distribution.pdf)
**Secondary:** [U.S. Census Bureau — Sector 44-45 Retail Trade (store facilities)](https://www.census.gov/naics/resources/archives/sect44-45.html) | [ENERGY STAR — What is Energy Use Intensity (EUI)?](https://www.energystar.gov/buildings/benchmark/understand-metrics/what-eui) | [ENERGY STAR — Energy Use in Retail Stores (DataTrends)](https://www.energystar.gov/sites/default/files/tools/DataTrends_Retail_20150129.pdf)
**Notes:** ICSC's benchmark uses Energy Use Intensity (kWh per sq ft of GLA); reported a mean EUI of ~3.83 kWh/sq ft across centers studied ([ICSC EUI study](https://www.icsc.com/uploads/about/ICSC-Industry-Benchmarking-Report-For-Distribution.pdf)). Grocery is energy-intensive (refrigeration). Not applicable to pure-play e-commerce stores (use DC energy instead).
`basisOfStandards: Energy per Sq Ft = Total Energy Cost (or kWh) ÷ Gross Leasable Area; ICSC EUI methodology (mean ~3.83 kWh/sq ft). Source: icsc.com Energy Intensity Benchmarking Study.`

---

## Appendix A — IFRS / Non-US Jurisdiction Equivalents

- **Comparable sales / 4-5-4 calendar:** UK and EU retailers commonly use a 4-4-5 or 4-5-4 fiscal calendar; the British Retail Consortium (BRC) publishes the UK like-for-like (LFL) sales benchmark, the UK analog of NRF comp sales. LFL excludes new/closed space on the same organic basis as US comps ([NRF — 4-5-4 Calendar](https://nrf.com/resources/4-5-4-calendar)).
- **Inventory valuation:** US GAAP ASC 330 uses lower of cost and net realizable value (NRV) for FIFO/average cost and does **not** permit write-down reversal; **IAS 2** reaches the same lower-of-cost-and-NRV measure but **permits reversal** of prior write-downs when NRV recovers ([iasplus — lower of cost and NRV (IAS 2 / ASU 2015-11)](https://iasplus.com/content/4ae32e9c-dc8c-42ca-8037-db1b0069a630)).
- **Revenue / right of return:** ASC 606 and **IFRS 15** are aligned — both recognize revenue net of expected returns, record a refund liability, and a separate return asset ([Data Studios — accounting for sales with a right of return](https://www.datastudios.org/post/how-to-account-for-sales-with-a-right-of-return)).
- **Shrink / loss benchmarks:** the NRF National Retail Security Survey is US-centric; the BRC Retail Crime Survey is the UK equivalent benchmark for shrink and retail crime ([NRF — National Retail Security Survey 2023](https://nrf.com/research/national-retail-security-survey-2023)).

## Appendix B — Standards Source Registry

- **National Retail Federation (NRF):** comp-sales basis, 4-5-4 calendar, National Retail Security Survey (shrink), NRF/Happy Returns returns landscape — [nrf.com](https://nrf.com/resources/4-5-4-calendar).
- **International Council of Shopping Centers (ICSC):** sales per square foot, occupancy-cost ratios, Net Leasable Area, Energy Use Intensity — [icsc.com](https://www.icsc.com/uploads/education/2018LC_Materials_WS5.pdf).
- **U.S. Census Bureau:** NAICS 44-45 / 4541 scope, Monthly & Advance Monthly Retail Trade Surveys (MRTS/MARTS), Economic Census — [census.gov/retail](https://www.census.gov/retail/definitions.html).
- **FASB ASC (via DART):** ASC 330 Inventory (retail inventory method, markdowns, NRV write-downs), ASC 606 Revenue (right of return, loyalty obligations) — [dart.deloitte.com](https://dart.deloitte.com/USDART/home/codification/assets/asc330-10/deloitte-guidance/330-10-35-subsequent-measurement-deloitte/retail-inventory-method-accounting-for-inventory).
- **Deloitte Global Powers of Retailing 2025:** Top 250 retailer benchmarks, industry structure, FY2023 aggregates — [deloitte.com](https://www.deloitte.com/na/en/Industries/retail/research/global-powers-of-retailing.html).
- **BLS:** NAICS 445 Food and Beverage Stores subsector definition (grocery) — [bls.gov](https://www.bls.gov/iag/tgs/iag445.htm).
- **Cross-reference / secondary (never sole citation where a primary standard exists):** Investopedia, Shopify, Lightspeed, Toolio, Klipfolio, Optimizely, Wall Street Prep, BigCommerce, Umbrex, ISM, IBM, Zebra.

---

**End of RTL-K-A KPI Sources Document — DRAFT / SPEC ONLY — NOT EXECUTABLE.**
