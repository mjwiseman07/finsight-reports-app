---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: false
phase: Retail Vertical Knowledge Stack — Wave 1 / RTL-K-D
artifact: Industry Benchmarks Document
peer: docs/manufacturing/wave1/Manufacturing_Benchmarks_Sources.md
---

# Retail Benchmarks — Source Document
**DRAFT / SPEC ONLY — DO NOT EXECUTE. Composition-only reference. No spine code, no D0 proof, no PC gates passed.**

---

**Document Title:** US Retail Operational, Financial, Channel, and Sub-Segment Benchmarks — Advisacor Retail Vertical Knowledge Stack, Module RTL-K-D
**Prepared for:** Wiseman Financial Technologies LLC (Advisacor)
**Generated:** June 23, 2026
**Version:** v0.9 (DRAFT — composition pass; benchmark ranges sourced to primary authorities; verification flags surfaced for RTL-K-E)
**Scope:** US retail benchmarks across five Advisacor sub-segments — B (Brick-and-Mortar), E (E-commerce), O (Omnichannel), G (Grocery/CPG), S (Specialty/Apparel)
**Companion modules:** RTL-K-A (KPIs), RTL-K-C (Disclosures), RTL-K-E (to be authored — verification + gap closure), RTL-K-G (evaluator / threshold logic)
**Data Currency:** Census MARTS advance estimate for May 2026 (released June 17, 2026, CB26-97); Census Quarterly E-Commerce report for Q1 2026 (released May 18, 2026, CB26-81); NACS State of the Industry 2025 Data; NRF 2025 Retail Returns Landscape; Deloitte Global Powers of Retailing 2025; ICSC/Datex trailing-12-month sales-per-square-foot data; FMI/ICSC/Baymard/IHL standards as published through mid-2026.

---

> ## ⚠️ CRITICAL DISCLAIMER — READ BEFORE USE
>
> **These are benchmarks, not targets.** They reflect industry median, top-quartile, and best-in-class reference ranges drawn from federal statistical programs, trade associations, and published industry surveys. They vary **materially** by retail format, store size, geography, product mix, channel mix, and reporting year. They are **NOT** performance objectives, are **NOT** pass/fail thresholds, and must **NOT** be used as standalone evaluation criteria.
>
> **Use of these benchmarks:** These ranges are inputs to Advisacor's automated flagging system and to the RTL-K-G evaluator's threshold logic. Entities outside typical ranges are surfaced for human review and contextual interpretation — never automatic scoring. A metric outside the published range may reflect entirely legitimate circumstances (e.g., a deliberately low-turn luxury specialty boutique, or a grocery banner running thin margins by design).
>
> **Sub-segment legend (used throughout):** **B** = Brick-and-Mortar (NAICS 44-45 excl. e-commerce) · **E** = E-commerce (NAICS 4541) · **O** = Omnichannel (44-45 + 4541 hybrid) · **G** = Grocery / CPG (NAICS 4451, 4452) · **S** = Specialty / Apparel (NAICS 4481, 4482, 4483). A `✓` means the benchmark applies cleanly; `◑` means it applies with documented judgment/adjustment; `—` means not applicable or not meaningfully benchmarked for that sub-segment.
>
> **Subscription / proprietary data:** ICSC/Datex sales-per-square-foot microdata, NACS State of the Industry microdata, FMI The Food Retailing Industry Speaks, Coresight Research store trackers, IHL Group inventory-distortion studies, Baymard Institute premium benchmarks, Incisiv/Manhattan Unified Commerce Benchmark, and Bond Brand Loyalty reports are subscription or member programs. Ranges cited from these are drawn from publicly available summaries, press releases, and methodology pages; the underlying microdata is paywalled and flagged ⚠ where the exact figure could not be independently confirmed from a free primary URL.
>
> **E-commerce-share currency note:** The Census Bureau Quarterly Retail E-Commerce Sales report for Q1 2026 (release CB26-81, May 18, 2026) reports e-commerce at **16.9% of total retail sales** (seasonally adjusted), on e-commerce sales of **$326.7 billion** against total retail of **$1,929.0 billion**, with e-commerce up **9.8% year-over-year** versus **3.9%** for total retail ([Census Quarterly E-Commerce Report](https://www.census.gov/retail/ecommerce.html)). The not-adjusted FRED reading for Q1 2026 is **16.8%** ([FRED ECOMPCTNSA](https://fred.stlouisfed.org/series/ECOMPCTNSA)).

---

## How to Read This Document

Each Part below frames its tables with a one-sentence lead-in, presents benchmark ranges with inline primary-source citations, and closes (where relevant) with a **Judgment Calls & Open Items** subsection marking items ◑ (judgment applied) or ⚠ (verification needed before lock). All formulas use plain-text or `\( ... \)` / `\[ ... \]` math notation; no `$` delimiters are used. Dollar magnitudes are written with the word "dollars" or "USD" or a plain numeral where a unit is implied.

**Table of Contents**

- [Part I — NAICS Structure for Retail](#part-i)
- [Part II — Macroeconomic Context](#part-ii)
- [Part III — Sub-Segment B (Brick-and-Mortar) Benchmarks](#part-iii)
- [Part IV — Sub-Segment E (E-Commerce) Benchmarks](#part-iv)
- [Part V — Sub-Segment O (Omnichannel) Benchmarks](#part-v)
- [Part VI — Sub-Segment G (Grocery / CPG) Benchmarks](#part-vi)
- [Part VII — Sub-Segment S (Specialty / Apparel) Benchmarks](#part-vii)
- [Part VIII — Cross-Segment Industry-Level Benchmarks](#part-viii)
- [Part IX — UK / European IFRS-Jurisdiction Benchmarks](#part-ix)
- [Part X — Benchmark Binding Table for Wave 2](#part-x)
- [Part XI — Sources Reference Table](#part-xi)

---

## Part I — NAICS Structure for Retail {#part-i}

The Advisacor retail vertical is scoped to NAICS Sector 44-45 (Retail Trade), which the US Census Bureau defines as comprising establishments engaged in retailing merchandise, generally without transformation, and rendering services incidental to the sale of merchandise ([Census NAICS](https://www.census.gov/naics/)). The official measurement frame is the Census Monthly and Annual Retail Trade programs ([Census Monthly Retail Trade](https://www.census.gov/retail/index.html); [Census Annual Retail Trade Survey](https://www.census.gov/programs-surveys/arts.html)), with the full classification definitions published in the 2022 NAICS Manual ([2022 NAICS Manual PDF](https://www.census.gov/naics/reference_files_tools/2022_NAICS_Manual.pdf)). The Economic Census Sector 44-45 tables provide the most granular establishment-level frame ([Census Economic Census Sector 44-45](https://www.census.gov/data/tables/2022/econ/economic-census/naics-sector-44-45.html)).

### I.1 — NAICS 44-45 Retail Trade Overview

Sector 44-45 covers retailing of merchandise to the general public; under the legacy structure it was organized into 12 three-digit subsectors spanning store and nonstore retailers, with electronic shopping and mail-order houses (NAICS 4541) the dominant e-commerce code ([Census NAICS](https://www.census.gov/naics/); [Census Economic Census Sector 44-45](https://www.census.gov/data/tables/2022/econ/economic-census/naics-sector-44-45.html)). The Census Bureau's quarterly e-commerce series is built on the Monthly Retail Trade Survey and covers retail (NAICS 44-45), and since the April 2025 benchmark excludes nonemployer establishments ([Census Quarterly E-Commerce Report](https://www.census.gov/retail/ecommerce.html)). The international counterpart structure of Sector 44-45 is mirrored in the harmonized North American classification maintained jointly with Statistics Canada ([Statistics Canada NAICS 2022 Sector 44-45](https://www23.statcan.gc.ca/imdb/p3VD.pl?Function=getVD&TVD=1369825&CVD=1369826&CPV=44-45&CST=27012022&CLV=1&MLV=5)).

### I.2 — Subsector Mapping to Sub-Segments

The table below maps each three-digit (and the key four-digit) NAICS retail code to the Advisacor sub-segment(s) it primarily populates, framed for the founder onboarding NAICS-selection flow (Part X) and the RTL-K-G evaluator binding.

| NAICS | Subsector | Sub-segment | Source |
|---|---|---|---|
| 441 | Motor Vehicle and Parts Dealers | B (specialty B) | [Census NAICS](https://www.census.gov/naics/) |
| 442 | Furniture and Home Furnishings Stores | B / S | [Census NAICS](https://www.census.gov/naics/) |
| 443 | Electronics and Appliance Stores | B / S | [Census NAICS](https://www.census.gov/naics/) |
| 444 | Building Material and Garden Equipment/Supplies Dealers | B | [Census NAICS](https://www.census.gov/naics/) |
| 445 | Food and Beverage Stores | G | [Census NAICS](https://www.census.gov/naics/) |
| 446 | Health and Personal Care Stores | B / S | [Census NAICS](https://www.census.gov/naics/) |
| 447 | Gasoline Stations | B / G hybrid | [Census NAICS](https://www.census.gov/naics/) |
| 448 | Clothing and Clothing Accessories Stores | S | [Census NAICS](https://www.census.gov/naics/) |
| 451 | Sporting Goods, Hobby, Musical Instrument, and Book Stores | S | [Census NAICS](https://www.census.gov/naics/) |
| 452 | General Merchandise Stores | B / G hybrid | [Census NAICS](https://www.census.gov/naics/) |
| 453 | Miscellaneous Store Retailers | B | [Census NAICS](https://www.census.gov/naics/) |
| 4541 | Electronic Shopping and Mail-Order Houses | E | [Census NAICS](https://www.census.gov/naics/); [Census Quarterly E-Commerce Report](https://www.census.gov/retail/ecommerce.html) |

The four-digit grocery / CPG and specialty / apparel codes that anchor sub-segments G and S are enumerated below for the evaluator binding ([Census NAICS](https://www.census.gov/naics/)):

| NAICS | Code Title | Sub-segment | Source |
|---|---|---|---|
| 4451 | Grocery Stores (incl. supermarkets, 445110) | G | [Census NAICS](https://www.census.gov/naics/) |
| 4452 | Specialty Food Stores | G | [Census NAICS](https://www.census.gov/naics/) |
| 4481 | Clothing Stores | S | [Census NAICS](https://www.census.gov/naics/) |
| 4482 | Shoe Stores | S | [Census NAICS](https://www.census.gov/naics/) |
| 4483 | Jewelry, Luggage, and Leather Goods Stores | S | [Census NAICS](https://www.census.gov/naics/) |

### I.3 — NAICS 2017 → NAICS 2022 Transition Notes

The NAICS 2022 revision made material changes to retail trade that any benchmark-binding logic must account for. The Census Bureau's official summary documents the changes ([Census NAICS Changes Story](https://www.census.gov/library/stories/2024/11/naics-changes.html)), and BLS published a dedicated analysis of the effect on retail-trade employment estimates ([BLS NAICS 2022 Retail Update](https://www.bls.gov/opub/mlr/2023/article/the-naics-2022-update-and-its-effect-on-bls-employment-estimates-in-the-retail-trade-sector.htm)). The two structural changes most material to Advisacor are:

1. **Elimination of the store / nonstore distinction.** NAICS 2022 removed the distinction between store and nonstore retailers in retail trade and reclassified the components of nonstore retailers ([BLS NAICS 2022 Retail Update](https://www.bls.gov/opub/mlr/2023/article/the-naics-2022-update-and-its-effect-on-bls-employment-estimates-in-the-retail-trade-sector.htm)).
2. **Reduction from 12 to 9 three-digit retail industries.** Four three-digit NAICS 2017 industries combined into two new NAICS 2022 industries, reducing the number of three-digit retail-trade industries from 12 to 9 ([BLS NAICS 2022 Retail Update](https://www.bls.gov/opub/mlr/2023/article/the-naics-2022-update-and-its-effect-on-bls-employment-estimates-in-the-retail-trade-sector.htm)).

Because of the transition, several Census retail products continued to be re-released on a 2017 NAICS basis for continuity: on September 25, 2024, the Annual Retail Trade Survey re-released estimates on a 2017 NAICS basis for employers only, restating 2022 data against the originally published January 2024 figures ([Census ARTS NAICS Restatement](https://www.census.gov/retail/mrts/www/NAICS_Restatement_Summary.pdf)). Third-party summaries of the 2022 changes corroborate the restructuring ([NAICS Association 2022 Changes](https://www.naics.com/2022-naics-changes/)).

### I.4 — Judgment Calls & Open Items (Part I)

- ◑ **Omnichannel (O) has no native NAICS code.** NAICS classifies establishments by primary activity, so an omnichannel retailer is coded to either its store subsector (44-45) or to 4541 depending on which channel dominates. Advisacor treats O as a derived sub-segment flagged by the founder during onboarding (multi-channel declaration), not by NAICS lookup alone. Cross-ref Part X onboarding flow.
- ◑ **NAICS 4541 vs. store-subsector overlap for E.** Many "e-commerce" retailers operate under a store-subsector code with significant online sales; the Census quarterly e-commerce report measures e-commerce as a *transaction channel* across all of 44-45, not only 4541 ([Census Quarterly E-Commerce Report](https://www.census.gov/retail/ecommerce.html)). The panel therefore reads sub-segment E both by NAICS 4541 establishment code and by online-sales-share declaration.
- ◑ **Gasoline stations (447) and general merchandise (452)** are dual-tagged (B / G hybrid) because fuel + convenience and supercenter formats blend grocery and general-merchandise economics; founder confirmation required.
- ⚠ **Exact Economic Census 2022 dollar figures** per six-digit NAICS retail code not embedded here; to be extracted in RTL-K-E from the Census Sector 44-45 table sets ([Census Economic Census Sector 44-45](https://www.census.gov/data/tables/2022/econ/economic-census/naics-sector-44-45.html)).

---

## Part II — Macroeconomic Context {#part-ii}

This Part documents the federal and survey-based macro context that frames every sub-segment benchmark below. The two binding federal series are the Census Monthly Retail Trade Survey (MARTS) total-sales figure and the Census Quarterly E-Commerce share.

### II.1 — US Census Bureau Monthly Retail Trade Survey (MARTS)

The MARTS advance report is the most timely federal read on retail demand. The advance estimate for **May 2026** (release CB26-97, June 17, 2026) put total US retail and food-services sales at **763.7 billion dollars**, up **0.9%** from April 2026 and up **6.9%** year-over-year, with retail-trade sales (excluding food services) up **1.0%** month-over-month and **7.5%** year-over-year ([Census MARTS May 2026](https://www.census.gov/retail/marts/www/marts_current.pdf)). Nonstore retailers were up **12.2%** from a year earlier, the fastest-growing major line ([Census MARTS May 2026](https://www.census.gov/retail/marts/www/marts_current.pdf)). The headline month-over-month figure is corroborated by aggregators ([Trading Economics US Retail Sales](https://tradingeconomics.com/united-states/retail-sales)).

| MARTS Metric (May 2026 advance) | Value | Source |
|---|---|---|
| Total retail & food-services sales (adjusted) | 763.7 billion USD | [Census MARTS May 2026](https://www.census.gov/retail/marts/www/marts_current.pdf) |
| Month-over-month change | +0.9% | [Census MARTS May 2026](https://www.census.gov/retail/marts/www/marts_current.pdf) |
| Year-over-year change | +6.9% | [Census MARTS May 2026](https://www.census.gov/retail/marts/www/marts_current.pdf) |
| Retail-trade (excl. food services) YoY | +7.5% | [Census MARTS May 2026](https://www.census.gov/retail/marts/www/marts_current.pdf) |
| Nonstore retailers YoY | +12.2% | [Census MARTS May 2026](https://www.census.gov/retail/marts/www/marts_current.pdf) |
| E-commerce share of total retail (Q1 2026, adj.) | 16.9% | [Census Quarterly E-Commerce Report](https://www.census.gov/retail/ecommerce.html) |

**Adjusted vs. not-adjusted distinction.** MARTS publishes both seasonally adjusted (and holiday/trading-day adjusted) estimates and not-adjusted estimates; benchmark comparisons must use the *same* basis on both sides because the not-adjusted series swings sharply by month (e.g., the Q1 2026 e-commerce not-adjusted estimate fell 17.2% from Q4 2025 on a not-adjusted basis even as the adjusted series rose) ([Census Quarterly E-Commerce Report](https://www.census.gov/retail/ecommerce.html)). The MARTS release schedule places the next advance report (June 2026 data) on July 16, 2026 ([Census Retail Release Schedule](https://www.census.gov/retail/release_schedule.html)). The advance retail-trade level feeds the FRED series ([FRED Advance Retail Sales: Retail Trade](https://fred.stlouisfed.org/series/RSXFS/1000)).

### II.2 — US Census Annual Retail Trade Survey (ARTS)

The Annual Retail Trade Survey provides finer, benchmarked detail than MARTS, including annual sales, e-commerce, inventories, purchases, and the inventory-to-sales ratios by NAICS that anchor the inventory-turnover benchmarks in Parts III, VI, and VII ([Census Annual Retail Trade Survey](https://www.census.gov/programs-surveys/arts.html)). MARTS monthly estimates are benchmarked to ARTS once available, and are also being revised in light of the 2023 and 2024 Annual Integrated Economic Survey ([Census Monthly Retail Trade](https://www.census.gov/retail/index.html); [Census MRTS About the Surveys](https://www.census.gov/retail/mrts/about_the_surveys.html)).

The companion Census Manufacturing and Trade Inventories and Sales (MTIS) program reports retail inventory-to-sales ratios on a monthly basis: the **retailers' inventories-to-sales ratio was 1.26 in April 2026** (seasonally adjusted), versus a total-business ratio of 1.31 ([Census MTIS April 2026](https://www.census.gov/mtis/current/index.html); [FRED Retailers Inventories to Sales Ratio](https://fred.stlouisfed.org/series/RETAILIRSA)). The MTIS methodology draws on MRTS, the Monthly Wholesale Trade Survey, and the M3 manufacturers' survey ([Census MTIS Flyer](https://www.census.gov/content/dam/Census/topics/business-and-economy/flyers/mtis-flyer.pdf)).

### II.3 — Federal Reserve / BEA Personal Consumption Expenditures (PCE)

The Bureau of Economic Analysis PCE series provides the consumption-side cross-check on retail demand, split into goods (durable and non-durable) and services ([BEA Consumer Spending](https://www.bea.gov/data/consumer-spending/main)). The relevant FRED series IDs for the goods categories that map to retail are:

| Series | FRED ID | Most recent reading | Source |
|---|---|---|---|
| Personal Consumption Expenditures (total) | PCE | 21,445.9 billion USD (Dec 2025) | [FRED PCE](https://fred.stlouisfed.org/series/PCE) |
| PCE: Nondurable Goods | PCND | 4,300.3 billion USD (Q4 2025) | [FRED PCND](https://fred.stlouisfed.org/series/PCND) |
| Real PCE: Durable Goods (chained) | PCEDGC96 | 2,138.1 (Dec 2025) | [FRED PCEDGC96](https://fred.stlouisfed.org/series/PCEDGC96) |
| Real PCE: Nondurable Goods (chained) | PCENDC96 | 3,541.1 (Dec 2025) | [FRED PCENDC96](https://fred.stlouisfed.org/series/PCENDC96) |
| PCE ex food & energy (price index) | PCEPILFE | 128.4 (Jan 2026) | [FRED PCEPILFE](https://fred.stlouisfed.org/series/PCEPILFE) |

The durables-versus-nondurables split is material to sub-segment routing: durable-goods PCE maps to specialty / big-box durable formats (furniture 442, electronics 443), while non-durable PCE maps to grocery / CPG (G) and apparel-consumable specialty (S) ([FRED PCEDGC96](https://fred.stlouisfed.org/series/PCEDGC96); [FRED PCENDC96](https://fred.stlouisfed.org/series/PCENDC96)). The PCE price index is the Federal Reserve's preferred inflation gauge and contextualizes nominal-versus-real retail-sales growth ([PCE price index overview](https://en.wikipedia.org/wiki/Personal_consumption_expenditures_price_index)).

### II.4 — Consumer Confidence and Discretionary Spending

Three survey programs frame discretionary-spending sentiment that drives sub-segment S (specialty / apparel) most acutely:

- **Conference Board Consumer Confidence Index** — the leading monthly sentiment gauge; tracks present-situation and expectations components ([Conference Board Consumer Confidence](https://www.conference-board.org/topics/consumer-confidence)).
- **University of Michigan Surveys of Consumers (Consumer Sentiment)** — the second principal sentiment index, with finer inflation-expectation detail ([University of Michigan Surveys of Consumers](https://www.sca.isr.umich.edu/)).
- **BLS Consumer Expenditure Survey (CE)** — the household-level spending allocation that complements the macro PCE series and informs category-level discretionary share ([BLS Consumer Expenditure Survey](https://www.bls.gov/cex/); [BLS CE vs. PCE comparison](https://www.bls.gov/cex/pce_compare_0203.pdf)).

### II.5 — Judgment Calls & Open Items (Part II)

- ◑ **MARTS advance is a subsample estimate** superseded by the larger MRTS; the May 2026 figures are advance and carry a 90% confidence interval (±0.4% on the monthly change) ([Census MARTS May 2026](https://www.census.gov/retail/marts/www/marts_current.pdf)). The panel reads MARTS as a trend signal, not a locked level.
- ◑ **E-commerce share is a channel measure, not a sub-sector.** The 16.9% figure (Q1 2026, adjusted) measures online transactions across all of 44-45, not only NAICS 4541 ([Census Quarterly E-Commerce Report](https://www.census.gov/retail/ecommerce.html)). The not-adjusted FRED reading (16.8%) is the conservative alternative ([FRED ECOMPCTNSA](https://fred.stlouisfed.org/series/ECOMPCTNSA)).
- ⚠ **Exact ARTS inventory-to-sales ratios by four-digit NAICS** are not embedded here; to be extracted in RTL-K-E from ARTS table sets ([Census Annual Retail Trade Survey](https://www.census.gov/programs-surveys/arts.html)).

---

## Part III — Sub-Segment B (Brick-and-Mortar) Benchmarks {#part-iii}

This Part documents physical-store benchmark bands. The defining productivity metric for B is sales per square foot, anchored to ICSC/Datex data; the defining cost lever is occupancy cost ratio. Sub-segment tags use the columns **B | E | O | G | S**.

### III.1 — Sales per Square Foot

Sales per square foot is the long-standing gold-standard productivity measure for physical retail ([ICSC Retail Store Planning](https://www.icsc.com/uploads/event_presentations/Retail_Store_Planning.pdf); [Corporate Finance Institute — Sales per Square Foot](https://corporatefinanceinstitute.com/resources/accounting/sales-per-square-foot/)). ICSC publishes annualized trailing-12-month sales-per-square-foot figures compiled from Datex Property Solutions, varying dramatically by retail format ([ICSC Occupancy Cost / Datex update](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O); [CoStar — ICSC Sales per Square Foot](https://www.costar.com/article/1178363696/sales-per-square-foot-for-most-retail-categories-surpass-pre-pandemic-levels)).

| Retail Format | Annualized Sales / Sq Ft (Datex / ICSC) | B | E | O | G | S | Source |
|---|---|---|---|---|---|---|---|
| Beauty supply (top performer) | ~928 USD (TTM Q2 2024, +17.5% YoY) | ✓ | — | ◑ | — | ✓ | [ICSC / Datex update](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O) |
| Fast food / QSR | ~772 USD | ✓ | — | — | — | — | [ICSC / Datex update](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O) |
| Supermarket / grocery | ~688 USD | ✓ | — | ◑ | ✓ | — | [ICSC / Datex (2022 series)](https://www.linkedin.com/posts/mcneiljennifer_icsc-activity-7036013982217814016-Y9Bu) |
| Restaurant | ~643 USD | ✓ | — | — | — | — | [ICSC / Datex update](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O) |
| Mall in-line specialty | $400–$825 (varies by store type) | ◑ | — | ◑ | — | ✓ | [Retail benchmark survey (ICSC-cited)](https://de.slideshare.net/slideshow/retail-benchmarks-final-printing-version-072010/4923463) |
| Top-tier mall non-anchor (enclosed) | >1,000 USD = strong-performance threshold | ◑ | — | ◑ | — | ✓ | [Retail Insider — ICSC mall data](https://retail-insider.com/retail-insider/2026/04/top-canadian-shopping-centres-by-sales-per-square-foot-in-2025/) |
| Fitness (low performer) | ~122 USD | ✓ | — | — | — | ◑ | [ICSC / Datex update](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O) |
| Craft (low performer) | ~119 USD | ✓ | — | — | — | ◑ | [ICSC / Datex update](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O) |
| Movie theater (lowest tracked) | ~104 USD | ✓ | — | — | — | — | [ICSC / Datex update](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O) |

ICSC reports US mall non-anchor productivity hovered between roughly $472 and $475 per square foot through the mid-2010s, with the 2013 mall figure of ~$475 a then-record ([ICSC US Mall Performance](https://www.icsc.com/uploads/t07-subpage/2_18_16.pdf); [ICSC 2014 Annual Report](https://www.icsc.com/uploads/default/2014-Annual-Report.pdf)). Format bands for B therefore span more than an order of magnitude — pop-up / temporary retail, off-price, big-box discount, and outlet centers each carry their own band that the panel applies per format declaration ([ICSC Retail Store Planning](https://www.icsc.com/uploads/event_presentations/Retail_Store_Planning.pdf)).

### III.2 — Sales per Labor Hour

Sales per labor hour (and the related sales-per-employee-hour and units-per-transaction productivity measures) is a core operational-excellence benchmark featured in NRF Big Show / operations programming and in ICSC store-planning frameworks; it is most meaningful for B and the in-store leg of O, and is not benchmarked for pure E ([ICSC Retail Store Planning](https://www.icsc.com/uploads/event_presentations/Retail_Store_Planning.pdf); [NRF research insights](https://nrf.com/research-insights)). Sales per labor hour applies ✓ to B, ◑ to O (store leg only), ◑ to G and S, and — to E.

### III.3 — Conversion Rate (In-Store)

In-store conversion rate (transactions ÷ traffic) is benchmarked by Sensormatic Shopper Insights and the legacy ShopperTrak traffic network, which underpins the same footfall measurement used in the BRC-Sensormatic monitor (Part IX) ([Sensormatic Solutions](https://www.sensormatic.com/); [Sensormatic IHL inventory study host](https://www.sensormatic.com/resources/rp/2023/ihl-inventory-distortion-study)). In-store conversion varies sharply by subsector — high-intent specialty and grocery convert far higher than browse-heavy department and big-box formats — so the panel applies subsector-specific conversion bands rather than a single line ([Sensormatic Solutions](https://www.sensormatic.com/)). Conversion-rate benchmarking applies ✓ to B, S; ◑ to O, G; — to E (see IV.2 for the online analog).

### III.4 — Average Ticket / Average Order Value (In-Store)

Average ticket (basket value) is benchmarked by category through NRF research and through channel-specific surveys; basket value is rising in some channels even as transaction counts fall, a pattern documented in convenience retail where basket value rose 24 cents year-over-year in 2025 while transactions declined ([NRF research insights](https://nrf.com/research-insights); [NACS Magazine — basket value 2025](https://www.nacsmagazine.com/issues/june-2026/5-key-metrics-defining-the-convenience-industrys-health)). Average ticket applies ✓ to B, G, S; ◑ to O.

### III.5 — Inventory Turnover (Brick-and-Mortar)

The Census ARTS / MTIS inventory-to-sales ratio is the primary federal anchor for retail inventory efficiency: the retailers' inventories-to-sales ratio was **1.26 in April 2026** (seasonally adjusted), implying roughly 9–10 annualized turns at the all-retail level, with wide subsector dispersion ([Census MTIS April 2026](https://www.census.gov/mtis/current/index.html); [FRED Retailers Inventories to Sales Ratio](https://fred.stlouisfed.org/series/RETAILIRSA)). Inventory turnover applies ✓ across B, E, O, G, S, but the band differs by subsector (grocery far higher per Part VI; apparel far lower per Part VII).

| Inventory Metric | Value / Band | B | E | O | G | S | Source |
|---|---|---|---|---|---|---|---|
| All-retail inventories-to-sales ratio | 1.26 (Apr 2026, adj.) | ✓ | ✓ | ✓ | ✓ | ✓ | [Census MTIS April 2026](https://www.census.gov/mtis/current/index.html) |
| Implied all-retail annualized turns | ~9–10x (inverse, directional) | ✓ | ✓ | ✓ | ◑ | ◑ | [FRED Retailers Inventories to Sales Ratio](https://fred.stlouisfed.org/series/RETAILIRSA) |
| Subsector inventory-to-sales detail | by NAICS, ARTS table sets | ✓ | ✓ | ✓ | ✓ | ✓ | [Census Annual Retail Trade Survey](https://www.census.gov/programs-surveys/arts.html) |

### III.6 — Occupancy Cost Ratio

Occupancy cost ratio (rent and related occupancy expense as a percent of store sales) is the inverse companion to sales per square foot: as sales per square foot rise, occupancy cost ratio falls ([Arizona CRE / ICSC occupancy explanation](https://investingincre.com/2022/05/26/2661/)). ICSC/Datex occupancy-cost percentages range from low single digits for highly productive formats (sporting goods ~2.2%, beauty supply ~4.8%) to 19–25% for low-productivity formats (fitness ~19.4%, movie theater ~25.0%) ([ICSC / Datex occupancy update](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O)). Occupancy cost ratio applies ✓ to B, S, G (store), ◑ to O (store leg), — to pure E.

| Format | Occupancy Cost % (ICSC/Datex) | Source |
|---|---|---|
| Sporting goods (lowest) | ~2.2% | [ICSC / Datex occupancy update](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O) |
| Beauty supply | ~4.8% | [ICSC / Datex occupancy update](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O) |
| Restaurant | ~6.7% | [ICSC / Datex occupancy update](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O) |
| Craft | ~12.8% | [ICSC / Datex occupancy update](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O) |
| Fitness | ~19.4% | [ICSC / Datex occupancy update](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O) |
| Movie theater (highest) | ~25.0% | [ICSC / Datex occupancy update](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O) |

### III.7 — Judgment Calls & Open Items (Part III)

- ◑ **ICSC/Datex sales-per-square-foot figures are TTM snapshots** by category and shift each release; the figures above are the trailing-12-month series ending Q2 2024 and the 2022 series, retained as reference bands pending the current-year refresh in RTL-K-E ([ICSC / Datex update](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O)).
- ◑ **Format bands (pop-up, off-price, outlet, big-box) are directional**; the panel applies the closest tracked Datex category until a format-specific figure is confirmed.
- ⚠ **ICSC/Datex full microdata is member/subscription-gated**; sales-per-square-foot and occupancy-cost bands here are drawn from public summaries and flagged for RTL-K-E extraction ([ICSC](https://www.icsc.com/)).

---

## Part IV — Sub-Segment E (E-Commerce) Benchmarks {#part-iv}

This Part documents online-channel benchmark bands (NAICS 4541 and the online leg of any 44-45 retailer). The defining metrics are e-commerce share, online conversion, cart abandonment, online AOV, customer acquisition cost, fulfillment cost per order, and online returns rate.

### IV.1 — E-Commerce Share of Retail

E-commerce was **16.9% of total US retail sales in Q1 2026** (seasonally adjusted), on e-commerce sales of **326.7 billion dollars** against total retail of **1,929.0 billion dollars**, up **9.8% year-over-year** versus 3.9% for total retail ([Census Quarterly E-Commerce Report](https://www.census.gov/retail/ecommerce.html)). The not-adjusted Q1 2026 reading was **16.8%** ([FRED ECOMPCTNSA](https://fred.stlouisfed.org/series/ECOMPCTNSA); [YCharts E-Commerce Share](https://ycharts.com/indicators/us_ecommerce_sales_as_percent_retail_sales)). The prior comparable quarter (Q3 2025) had read 16.4%, the then-record seasonally adjusted level, confirming the steady upward channel-share trend ([Marketplace Pulse E-Commerce Share](https://www.marketplacepulse.com/stats/us-e-commerce-sales-as-a-percent-of-total-sales)). This applies ✓ to E and O, ◑ to B (as the channel-shift context), — to G and S as a standalone metric.

### IV.2 — Conversion Rate (Online)

Online conversion rate benchmarks cluster in the low single digits. Adobe's analytics benchmark places the average e-commerce conversion rate at roughly **3.3%–3.65%**, with a typical operating band of **1%–4%** ([Adobe — E-Commerce Conversion Benchmarks](https://business.adobe.com/blog/basics/ecommerce-conversion-rate-benchmarks); [Adobe — Conversion Rate Optimization](https://business.adobe.com/blog/basics/ecommerce-conversion-rate-optimization)). The Baymard Institute checkout-research body and Adobe/Salesforce shopping indices corroborate the low-single-digit range and break it out by device (desktop higher than smartphone) ([Adobe Digital Economy Index](https://blog.adobe.com/en/publish/2021/09/15/adobe-digital-economy-index-ecommerce-hits-new-milestone-online-prices-continue-rise); [Adobe Digital Economy Index resource](https://business.adobe.com/resources/digital-economy-index.html)). Online conversion applies ✓ to E, ✓ to O (online leg), — to pure B and physical G.

| Online Conversion Benchmark | Value | Source |
|---|---|---|
| Average e-commerce conversion | ~3.3%–3.65% | [Adobe — E-Commerce Conversion Benchmarks](https://business.adobe.com/blog/basics/ecommerce-conversion-rate-benchmarks) |
| Typical operating band | 1%–4% | [Adobe — E-Commerce Conversion Benchmarks](https://business.adobe.com/blog/basics/ecommerce-conversion-rate-benchmarks) |
| Baseline cross-industry band | 2%–3% | [Ecorn — Conversion Benchmarks](https://www.ecorn.agency/blog/ecommerce-conversion-rate-benchmarks) |

### IV.3 — Cart Abandonment Rate

The canonical figure is the **Baymard Institute meta-analysis average of 70.22%**, calculated across 50 studies and last updated September 22, 2025 ([Baymard Institute — Cart Abandonment Rate](https://baymard.com/lists/cart-abandonment-rate)). The figure has hovered between roughly 68% and 72% since 2014 and is the value Statista re-publishes ([Baymard Institute — Cart Abandonment Rate](https://baymard.com/lists/cart-abandonment-rate)). Beneath the headline, the spread runs from ~61% (grocery) through 67–76% (mainstream DTC) to 80–84% (B2B) and 81–91% (finance/travel), and live behavioral data runs higher (~78–80%, Dynamic Yield) than the long-run aggregate ([Baymard cross-source breakout](https://eightx.co/blog/average-ecommerce-cart-abandonment-rate-by-vertical-2026); [Zipchat — Cart Abandonment Benchmarks](https://www.zipchat.ai/blog/cart-abandonment-benchmarks-and-causes)). Cart abandonment applies ✓ to E and O (online), — to pure B, physical G.

### IV.4 — Average Order Value (Online)

Online average order value is benchmarked by Adobe Digital Insights and historically by the IBM (Coremetrics) Digital Analytics Benchmark; Adobe's monthly digital-spend reporting tracks aggregate online spend (e.g., record online-spend months in the 2025 holiday season) that, combined with order counts, yields AOV by vertical ([Adobe Digital Economy Index resource](https://business.adobe.com/resources/digital-economy-index.html); [Adobe — record online spend Oct 2025](https://www.linkedin.com/posts/patrickbrown5_adobe-adobedigitalinsights-adobellmo-activity-7393782851864989696-50CR)). Online AOV applies ✓ to E and O (online leg), ◑ to S (high-AOV apparel/jewelry online), — to physical-only B.

### IV.5 — Customer Acquisition Cost (CAC)

Customer acquisition cost for online retail is benchmarked through Shopify/Shopify Plus merchant data and SaaS-side and SimilarWeb traffic-economics benchmarks; CAC varies widely by category and channel mix and is read alongside customer lifetime value (Part V.4, Part VII.6) to derive the LTV:CAC ratio ([Shopify Plus](https://www.shopify.com/plus); [SimilarWeb](https://www.similarweb.com/)). CAC applies ✓ to E, ✓ to O (blended), ◑ to S, — as a standalone for physical-only B and G.

### IV.6 — Fulfillment Cost per Order

Fulfillment cost per order (pick-pack-ship plus last-mile and packaging) is benchmarked by third-party logistics and shipping-software providers including ShipBob, Shipware, and the Logistics Management / LM Group fulfillment-cost reports; it is the single largest incremental cost line that distinguishes E economics from B ([ShipBob](https://www.shipbob.com/); [Shipware](https://shipware.com/); [Logistics Management](https://www.logisticsmgmt.com/)). Inventory distortion compounds the fulfillment-cost problem and ties to returns (IV.7): IHL Group estimates inventory distortion adds roughly $1.73 trillion globally in 2025 while returned goods add a separate $1.9 trillion ([IHL Group — Research Findings](https://www.ihlservices.com/news/ihl-research-findings/)). Fulfillment cost per order applies ✓ to E and O (online), — to pure B.

### IV.7 — Returns Rate (Online)

Online returns run materially higher than in-store. The NRF / Happy Returns 2025 Retail Returns Landscape projects total US returns of nearly **850 billion dollars in 2025** at an overall retail return rate of about **15.8%**, with online returns elevated relative to store ([NRF — 2025 Retail Returns Landscape](https://nrf.com/research/2025-retail-returns-landscape); [NRF — nearly $850B returns press release](https://nrf.com/media-center/press-releases/consumers-expected-to-return-nearly-850-billion-in-merchandise-in-2025)). The 2024 edition put total returns at **890 billion dollars** ([NRF / Happy Returns — 2024 $890B](https://nrf.com/media-center/press-releases/nrf-and-happy-returns-report-2024-retail-returns-total-890-billion)). Cross-source data places the **online return rate near 19.3% of online sales in 2025** ([Clickpost — Returns Statistics](https://www.clickpost.ai/blog/ecommerce-return-statistics)), and the all-channel average e-commerce return rate is commonly cited at **~20%** ([Synctrack — E-Commerce Return Rates](https://synctrack.io/blog/ecommerce-return-rates/)). Online returns rate applies ✓ to E, ✓ to S (highest, see VII.5), ◑ to O, — to physical-only G.

| Returns Benchmark | Value | Source |
|---|---|---|
| Total US returns 2025 (projected) | ~850 billion USD | [NRF — 2025 Retail Returns Landscape](https://nrf.com/research/2025-retail-returns-landscape) |
| Overall retail return rate 2025 | ~15.8% | [NRF — 2025 Retail Returns Landscape](https://nrf.com/research/2025-retail-returns-landscape) |
| Total US returns 2024 | ~890 billion USD | [NRF / Happy Returns — 2024](https://nrf.com/media-center/press-releases/nrf-and-happy-returns-report-2024-retail-returns-total-890-billion) |
| Online return rate (share of online sales) 2025 | ~19.3% | [Clickpost — Returns Statistics](https://www.clickpost.ai/blog/ecommerce-return-statistics) |
| All-channel average online return rate | ~20% | [Synctrack — E-Commerce Return Rates](https://synctrack.io/blog/ecommerce-return-rates/) |

### IV.8 — Judgment Calls & Open Items (Part IV)

- ◑ **Cart abandonment 70.22% is a long-run meta-average**, not a current single-site rate; live-session data runs ~78–80% and should be the band applied to real-time monitoring ([Baymard Institute — Cart Abandonment Rate](https://baymard.com/lists/cart-abandonment-rate)).
- ◑ **CAC and fulfillment-cost-per-order vary by category and order profile**; the panel reads them as entity-relative trends, not absolute thresholds, and pairs CAC with LTV.
- ⚠ **Baymard premium benchmarks, ShipBob/Shipware/LM fulfillment microdata, and Adobe/IBM AOV detail are subscription-gated**; the public summaries above are flagged for RTL-K-E confirmation ([Baymard Institute — Cart Abandonment Rate](https://baymard.com/lists/cart-abandonment-rate); [Adobe Digital Economy Index resource](https://business.adobe.com/resources/digital-economy-index.html)).

---

## Part V — Sub-Segment O (Omnichannel) Benchmarks {#part-v}

This Part documents the cross-channel benchmarks that define sub-segment O — the 44-45 + 4541 hybrid. The defining metrics are BOPIS/BORIS adoption, ship-from-store penetration, omnichannel customer-lifetime-value multipliers, and unified-commerce maturity.

### V.1 — BOPIS Adoption Rate

Buy-online-pickup-in-store (BOPIS) adoption is tracked through Adobe digital-economy reporting and NRF / Forrester omnichannel research; BOPIS surged structurally during the pandemic and remains a permanent fixture of omnichannel fulfillment economics ([Adobe Digital Economy Index resource](https://business.adobe.com/resources/digital-economy-index.html); [NRF research insights](https://nrf.com/research-insights); [Forrester retail research](https://www.forrester.com/research/)). BOPIS applies ✓ to O, ◑ to B and E (as the channels it bridges), — to pure-play single-channel.

### V.2 — BORIS (Buy Online, Return In Store) Rate

Buy-online-return-in-store (BORIS) is documented in the NRF Returns Landscape as a major share of returns handling, blending the online return (IV.7) with the in-store labor and restocking cost; BORIS is a key omnichannel cost-and-traffic lever because returns trips drive incremental store visits ([NRF — 2025 Retail Returns Landscape](https://nrf.com/research/2025-retail-returns-landscape); [Happy Returns — 2025 Returns Report](https://happyreturns.com/2025-happy-returns-nrf-returns-report)). BORIS applies ✓ to O, ◑ to B and E, — to pure single-channel.

### V.3 — Ship-from-Store Penetration

Ship-from-store penetration (using store inventory to fulfill online orders) is analyzed in McKinsey omnichannel research and in the Deloitte Global Powers of Retailing series; it raises store inventory turns and reduces fulfillment cost per order versus dedicated DC fulfillment for many baskets ([McKinsey retail insights](https://www.mckinsey.com/industries/retail/our-insights); [Deloitte — Global Powers of Retailing 2025](https://www.deloitte.com/us/en/Industries/retail/research/global-powers-of-retailing.html)). Ship-from-store applies ✓ to O, ◑ to B (store leg) and E, — to pure-play.

### V.4 — Customer Lifetime Value (Omnichannel Multiplier)

A foundational finding of Harvard Business Review and McKinsey omnichannel research is that omnichannel customers are more valuable than single-channel customers, spending and engaging more across the relationship — the "omnichannel multiplier" ([Harvard Business Review — omnichannel shopper research](https://hbr.org/2017/01/a-study-of-46000-shoppers-shows-that-omnichannel-retailing-works); [McKinsey retail insights](https://www.mckinsey.com/industries/retail/our-insights)). Omnichannel CLV applies ✓ to O, ◑ to B, E, S, — to pure single-channel where the multiplier cannot be measured.

### V.5 — Unified Commerce Maturity Benchmarks

Unified-commerce maturity is benchmarked by the Incisiv / Manhattan Associates Unified Commerce Benchmark and by NRF technology-adoption surveys, which score retailers on the integration of inventory, order management, and customer data across channels ([Incisiv Unified Commerce Benchmark](https://www.incisiv.com/); [Manhattan Associates](https://www.manh.com/); [NRF research insights](https://nrf.com/research-insights)). Unified-commerce maturity applies ✓ to O, ◑ to B, E, G, S as they pursue cross-channel integration.

### V.6 — Judgment Calls & Open Items (Part V)

- ◑ **Omnichannel metrics are entity-architecture-dependent.** BOPIS/BORIS/ship-from-store penetration are meaningful only for retailers operating both store and online channels; the panel suppresses them for declared pure-play E or pure-play B entities.
- ◑ **The CLV omnichannel multiplier is a directional research finding**, not a single citable federal statistic; treated as a documented industry reference ([Harvard Business Review — omnichannel shopper research](https://hbr.org/2017/01/a-study-of-46000-shoppers-shows-that-omnichannel-retailing-works)).
- ⚠ **Incisiv/Manhattan Unified Commerce Benchmark scores and McKinsey/Forrester omnichannel percentages are subscription/report-gated**; flagged for RTL-K-E extraction ([Incisiv Unified Commerce Benchmark](https://www.incisiv.com/); [McKinsey retail insights](https://www.mckinsey.com/industries/retail/our-insights)).

---

## Part VI — Sub-Segment G (Grocery / CPG) Benchmarks {#part-vi}

This Part documents grocery and CPG benchmark bands (NAICS 4451, 4452, and the food-and-beverage leg of 447/452). The defining characteristics are thin net margins, high inventory turns, shrink, payment-mix complexity, private-label penetration, and loyalty-program depth.

### VI.1 — Gross Margin and Net Profit (Grocery)

Grocery is a thin-net-margin business: FMI's The Food Retailing Industry Speaks tracks food-retailer net profit, which has historically run in the **1%–2% range**, with FMI reporting margins falling back toward pre-pandemic levels ([FMI — The Food Retailing Industry Speaks](https://www.fmi.org/our-research/research-reports/food-retailing-industry-speaks); [FMI — Grocery Store Chains Net Profit](https://www.fmi.org/our-research/food-industry-facts/grocery-store-chains-net-profit); [Grocery Dive — FMI margins to pre-pandemic levels](https://www.grocerydive.com/news/grocery-industry-profit-margins-fall-to-pre-pandemic-levels-fmi/720517/)). FMI's most recent annual edition documents the food industry navigating headwinds while offering shoppers value ([FMI — 2025 report press release](https://www.fmi.org/newsroom/news-archive/view/2025/07/15/fmi-report--amid-uncertainty--food-industry-succeeds-in-offering-shoppers-value); [Business Wire — FMI 2025 report](https://www.businesswire.com/news/home/20250715105382/en/FMI-Report-Amid-Uncertainty-Food-Industry-Succeeds-in-Offering-Shoppers-Value)). Gross/net margin benchmarks apply ✓ to G, ◑ to B (grocery-adjacent general merchandise 452), — to E, S.

| Grocery Margin Benchmark | Value | Source |
|---|---|---|
| Grocery net profit margin (typical) | ~1%–2% | [FMI — Grocery Store Chains Net Profit](https://www.fmi.org/our-research/food-industry-facts/grocery-store-chains-net-profit) |
| National-brand grocery gross margin (typical) | ~25%–35% | [Just Food — private label growth](https://www.just-food.com/comment/private-labels-growth-surge-and-the-us-brand-battle-ahead/) |
| Private-label gross margin (typical) | can exceed 40% (vs. ~26% national) | [Just Food — private label growth](https://www.just-food.com/comment/private-labels-growth-surge-and-the-us-brand-battle-ahead/) |

### VI.2 — Inventory Turnover (Grocery)

Grocery inventory turns are structurally far higher than other retail because of perishables and high-velocity center-store SKUs — directionally **12–15x annually** versus the all-retail ~9–10x implied by the MTIS ratio ([Census MTIS April 2026](https://www.census.gov/mtis/current/index.html); [FMI — Food Industry Facts](https://www.fmi.org/our-research/food-industry-facts)). NielsenIQ (NIQ) and Kantar provide the category- and SKU-velocity data that decompose the blended turn ([NielsenIQ](https://nielseniq.com/); [Kantar](https://www.kantar.com/)). Inventory turnover applies ✓ to G (highest band), ◑ to B, O, — relative to S which sits far lower.

### VI.3 — Shrink Rate (Grocery)

Grocery shrink (loss from spoilage, theft, damage, and administrative error) is benchmarked through the National Supermarket Shrink Survey and the NACS State of the Industry for the convenience channel. NACS reported that in 2025 every direct-store-operating-expense category grew except a **slight decline in merchandise shrink**, which had trended upward in prior years ([NACS Magazine — 5 Key Metrics](https://www.nacsmagazine.com/issues/june-2026/5-key-metrics-defining-the-convenience-industrys-health)). Perishable shrink (produce, meat, dairy, bakery) is the largest controllable component, and delayed price changes compound margin leakage ([UniSight — hourly margin leakage](https://www.unisight.com/insights/hourly-margin-leakage.html)). Shrink applies ✓ to G, ◑ to B and S (theft component), — to pure E.

### VI.4 — SNAP / WIC Payment Mix

The Supplemental Nutrition Assistance Program (SNAP) and the WIC program are material to grocery revenue accounting and tender mix; USDA Food and Nutrition Service publishes the program data and retailer-redemption rules that govern how these tenders are recorded ([USDA FNS — SNAP](https://www.fns.usda.gov/snap/supplemental-nutrition-assistance-program); [USDA FNS — WIC](https://www.fns.usda.gov/wic); [USDA FNS data and statistics](https://www.fns.usda.gov/data-research)). SNAP/WIC mix applies ✓ to G, ◑ to B (general-merchandise SNAP-authorized retailers 452), — to E (limited SNAP online), S.

### VI.5 — Private-Label Penetration

Private-label (store-brand) penetration is at record levels. FMI's The Power of Private Brands (citing Circana) reported private-brand **dollar share of 20.9% and unit share of 25.8%** as of mid-2024, with about 1 in 4 products purchased being a private brand and 86% of retailer/manufacturer executives planning to increase private-brand investment, projecting share toward **25.6%** ([Progressive Grocer — FMI Power of Private Brands](https://progressivegrocer.com/retailers-suppliers-bullish-future-private-label-growth); [Grocery Dive — private-brand share to 25.6%](https://www.grocerydive.com/news/grocers-growth-spurt-private-brand-dollar-share/759997/)). Mid-2025 PLMA/NIQ data put private-label dollar share at an all-time-high **21.2%** and unit share at **23.2%**, with 2025 sales projected to approach **277 billion dollars** ([Just Food — private label growth](https://www.just-food.com/comment/private-labels-growth-surge-and-the-us-brand-battle-ahead/)). US private-label penetration (~21–23%) still trails Europe's 39–47% ([3D Color — private label record share](https://3dcolor.com/private-label-at-record-share-heres-how-national-brands-still-win/)). Private-label applies ✓ to G, ◑ to B (general merchandise), S (own-brand apparel), — to pure marketplace E.

| Private-Label Benchmark | Value | Source |
|---|---|---|
| Dollar share (FMI/Circana, mid-2024) | 20.9% | [Progressive Grocer — FMI Power of Private Brands](https://progressivegrocer.com/retailers-suppliers-bullish-future-private-label-growth) |
| Unit share (FMI/Circana, mid-2024) | 25.8% | [Progressive Grocer — FMI Power of Private Brands](https://progressivegrocer.com/retailers-suppliers-bullish-future-private-label-growth) |
| Dollar share (PLMA/NIQ, H1 2025, record) | 21.2% | [Just Food — private label growth](https://www.just-food.com/comment/private-labels-growth-surge-and-the-us-brand-battle-ahead/) |
| Projected total private-label sales 2025 | ~277 billion USD | [Just Food — private label growth](https://www.just-food.com/comment/private-labels-growth-surge-and-the-us-brand-battle-ahead/) |
| US vs. Europe penetration | ~21–23% vs. 39–47% | [3D Color — private label record share](https://3dcolor.com/private-label-at-record-share-heres-how-national-brands-still-win/) |

### VI.6 — Loyalty Program Penetration (Grocery-Specific)

Grocery loyalty-program penetration and engagement are benchmarked by the Bond Brand Loyalty Report and NielsenIQ retail-loyalty research; loyalty depth drives the customer-data foundation for both private-label targeting and personalized promotion ([Bond Brand Loyalty Report](https://bondbrandloyalty.com/the-loyalty-report/); [NielsenIQ](https://nielseniq.com/)). Loyalty penetration applies ✓ to G, O, ◑ to B and S, — to commodity pure-play E without a program.

### VI.7 — Convenience-Channel Context (NAICS 447 / G hybrid)

Because gasoline stations (447) are dual-tagged B / G hybrid (Part I.2), the NACS State of the Industry data is the anchor for the convenience leg. NACS reported US convenience in-store (foodservice + merchandise) sales of **341.2 billion dollars in 2025** (+1.7%, the 23rd consecutive year of inside-sales growth) and total industry sales (in-store + fuel) of **817.5 billion dollars**, with foodservice contributing **28.5%** of inside sales and **38.9%** of in-store gross-profit dollars ([NACS — In-Store Sales Top $340 Billion](https://www.convenience.org/stay-current/news/2026/april/15/u-s-convenience-in-store-sales-top-$340-billion)). Total fuel sales fell **5.4%** to **476.3 billion dollars** on lower gas prices, and the US convenience-store count was **151,975** ([NACS — In-Store Sales Top $340 Billion](https://www.convenience.org/stay-current/news/2026/april/15/u-s-convenience-in-store-sales-top-$340-billion)). When fuel gross profit is stripped out, only the top three deciles of stores are profitable on in-store operations alone ([NACS Magazine — Inside the Store](https://www.nacsmagazine.com/Issues/June-2025/Inside-the-store)). NACS underlying SOI microdata is purchase-gated ([NACS — State of the Industry Report](https://www.convenience.org/stay-current/news/2026/june/16/nacs-state-of-the-industry-report%C2%AE-of-2025-data-is-available-to-purchase)).

### VI.8 — Judgment Calls & Open Items (Part VI)

- ◑ **Grocery inventory-turn band (12–15x) is directional industry consensus**; exact four-digit NAICS turns should be cross-validated against ARTS inventory-to-sales ratios in RTL-K-E ([Census Annual Retail Trade Survey](https://www.census.gov/programs-surveys/arts.html)).
- ◑ **Grocery net margin (1–2%) is a long-run FMI range**; entity margins vary by format (warehouse-club vs. conventional vs. premium-natural) and are entity-confirmed at onboarding ([FMI — Grocery Store Chains Net Profit](https://www.fmi.org/our-research/food-industry-facts/grocery-store-chains-net-profit)).
- ⚠ **FMI The Food Retailing Industry Speaks, National Supermarket Shrink Survey, NACS SOI microdata, NielsenIQ, Kantar, and Bond Brand Loyalty are subscription/member-gated**; figures above are from public summaries and press releases, flagged for RTL-K-E confirmation ([FMI — The Food Retailing Industry Speaks](https://www.fmi.org/our-research/research-reports/food-retailing-industry-speaks); [NACS — State of the Industry Report](https://www.convenience.org/stay-current/news/2026/june/16/nacs-state-of-the-industry-report%C2%AE-of-2025-data-is-available-to-purchase)).

---

## Part VII — Sub-Segment S (Specialty / Apparel) Benchmarks {#part-vii}

This Part documents specialty and apparel benchmark bands (NAICS 4481, 4482, 4483, plus specialty 442/443/446/451). The defining characteristics are sell-through, markdown intensity, initial/maintained markup, low inventory turns, the highest returns rates in retail, and customer-LTV depth.

### VII.1 — Sell-Through Rate

Sell-through rate (units sold ÷ units received over a period) is the core merchandising-velocity metric for apparel and specialty, benchmarked through Circana (the merger of NPD Group and IRI) apparel data and Coresight Research ([Circana (NPD) retail tracking](https://www.circana.com/); [Coresight Research](https://coresight.com/)). Sell-through applies ✓ to S, ◑ to B (seasonal/fashion-adjacent), O, — to commodity G.

### VII.2 — Markdown Rate (Apparel)

Markdown rate (the discount-driven reduction from initial retail price) is benchmarked by Circana/NPD, Edited, and First Insight markdown analytics; apparel carries among the highest markdown intensity in retail because of fashion-season obsolescence and off-price competition ([Circana (NPD) retail tracking](https://www.circana.com/); [Edited retail analytics](https://edited.com/); [First Insight](https://www.firstinsight.com/)). Markdown rate applies ✓ to S, ◑ to B (seasonal), O, — to G.

### VII.3 — Initial Markup (IMU) and Maintained Markup (MMU)

Initial markup (IMU) is the percentage difference between cost and initial retail; maintained markup (MMU) is the realized margin after markdowns and shrink. Department stores and specialty stores both set high IMU to absorb markdowns, with specialty IMU often pressured lower by off-price competition; these are standard merchandising-math benchmarks taught across retail finance ([Corporate Finance Institute — retail metrics](https://corporatefinanceinstitute.com/resources/accounting/sales-per-square-foot/); [NRF research insights](https://nrf.com/research-insights)). IMU/MMU apply ✓ to S, ◑ to B (department-store and specialty formats), — to G (cost-plus pricing) and pure marketplace E.

### VII.4 — Inventory Turnover (Apparel)

Apparel inventory turns are structurally far lower than grocery — directionally **3–5x annually** — because of seasonal buy cycles, size/color SKU proliferation, and fashion risk ([NRF research insights](https://nrf.com/research-insights); [Census Annual Retail Trade Survey](https://www.census.gov/programs-surveys/arts.html)). This sits well below the all-retail ~9–10x implied by the MTIS ratio (Part III.5) and an order of magnitude below grocery (Part VI.2) ([Census MTIS April 2026](https://www.census.gov/mtis/current/index.html)). Inventory turnover applies ✓ to S (lowest band), ◑ to B, O, — relative to G which sits far higher.

### VII.5 — Returns Rate (Apparel / Footwear)

Apparel and footwear carry the highest returns rates in retail, especially online. Coresight Research calculated an **online apparel return rate of ~24.4%** generating tens of billions in processing costs ([Coresight — True Cost of Apparel Returns](https://coresight.com/research/the-true-cost-of-apparel-returns-alarming-return-rates-require-loss-minimization-solutions/)), and cross-source data places online clothing returns near **25%**, with the working range for apparel/footwear commonly cited at **20–40% online** ([UpCounting — return rate, clothing 25%](https://www.upcounting.com/blog/average-ecommerce-return-rate); [Statista — online apparel returns](https://www.statista.com/statistics/1485179/online-returns-apparel-ecommerce-worldwide/)). The NRF Returns Landscape frames the all-retail context (~15.8% in 2025), against which apparel sits well above average ([NRF — 2025 Retail Returns Landscape](https://nrf.com/research/2025-retail-returns-landscape)). Returns-management vendors Loop Returns and Happy Returns benchmark the operational cost of these returns ([Loop Returns](https://www.loopreturns.com/); [Happy Returns — 2025 Returns Report](https://happyreturns.com/2025-happy-returns-nrf-returns-report)). Returns rate applies ✓ to S (highest), ✓ to E, ◑ to O, — to physical-only G.

| Apparel/Footwear Returns Benchmark | Value | Source |
|---|---|---|
| Online apparel return rate (Coresight) | ~24.4% | [Coresight — True Cost of Apparel Returns](https://coresight.com/research/the-true-cost-of-apparel-returns-alarming-return-rates-require-loss-minimization-solutions/) |
| Online clothing return rate (cross-source) | ~25% | [UpCounting — return rate by category](https://www.upcounting.com/blog/average-ecommerce-return-rate) |
| Apparel/footwear online working range | 20%–40% | [Statista — online apparel returns](https://www.statista.com/statistics/1485179/online-returns-apparel-ecommerce-worldwide/) |
| All-retail return rate (context) | ~15.8% (2025) | [NRF — 2025 Retail Returns Landscape](https://nrf.com/research/2025-retail-returns-landscape) |

### VII.6 — Customer LTV (Specialty)

Specialty customer lifetime value and loyalty depth are benchmarked through Bond Brand Loyalty and through e-commerce loyalty platforms LoyaltyLion and Smile.io, which publish repeat-purchase-rate and retention benchmarks for specialty DTC brands ([Bond Brand Loyalty Report](https://bondbrandloyalty.com/the-loyalty-report/); [LoyaltyLion](https://loyaltylion.com/); [Smile.io](https://smile.io/)). Customer LTV applies ✓ to S, O, ◑ to E and B, — to commodity G without a loyalty program.

### VII.7 — Judgment Calls & Open Items (Part VII)

- ◑ **Apparel inventory-turn band (3–5x) and the 20–40% returns range are directional consensus**; exact figures by four-digit NAICS (4481/4482/4483) flagged for RTL-K-E from ARTS and Circana data ([Census Annual Retail Trade Survey](https://www.census.gov/programs-surveys/arts.html); [Circana (NPD) retail tracking](https://www.circana.com/)).
- ◑ **IMU/MMU are merchandising-math conventions**, not federal statistics; the panel applies format-specific defaults (department vs. specialty vs. off-price) confirmed at onboarding.
- ⚠ **Circana/NPD, Edited, First Insight, Coresight, Bond, LoyaltyLion, and Smile.io benchmark microdata are subscription-gated**; figures above are public summaries flagged for RTL-K-E confirmation ([Coresight Research](https://coresight.com/); [Circana (NPD) retail tracking](https://www.circana.com/)).

---

## Part VIII — Cross-Segment Industry-Level Benchmarks {#part-viii}

This Part documents the industry-level rankings and tracker sources that frame all five sub-segments and feed the RTL-K-G evaluator's peer-set logic.

### VIII.1 — Deloitte Global Powers of Retailing

Deloitte's annual Global Powers of Retailing ranks the world's 250 largest retailers by revenue and analyzes revenue concentration and geographic distribution; the most recent edition is **Global Powers of Retailing 2025** ([Deloitte — Global Powers of Retailing 2025](https://www.deloitte.com/us/en/Industries/retail/research/global-powers-of-retailing.html); [Deloitte — GPR 2025 (NA)](https://www.deloitte.com/na/en/Industries/retail/research/global-powers-of-retailing.html)). Deloitte also publishes the companion Fastest 50 Retailers ranking ([Deloitte — Fastest 50 Retailers](https://www.deloitte.com/global/en/industries/consumer/analysis/fastest-50-retailers.html)). Applies across B, E, O, G, S as the global peer frame.

### VIII.2 — NRF Top 100 / STORES Top Retailers

The NRF / STORES Top 100 (and Top 50 Global) rankings provide the US-focused peer frame with year-over-year ranking changes; the **Top 50 Global Retailers 2025** list is the current edition ([NRF — Top 50 Global Retailers 2025](https://nrf.com/research-insights/top-retailers/top-50-global-retailers/top-50-global-retailers-2025); [NRF — Top Retailers research](https://nrf.com/research-insights/top-retailers)). Applies across B, E, O, G, S as the US peer frame.

### VIII.3 — IHL Group Industry Reports

IHL Group quantifies the cost of inventory distortion (out-of-stocks + overstocks): the total reached approximately **1.73–1.77 trillion dollars globally in 2025**, representing about **6.5% of global retail sales**, with supply-chain disruption the largest single contributor (~301 billion dollars) ([IHL Group — Research Findings](https://www.ihlservices.com/news/ihl-research-findings/); [IHL Group — Inventory Crisis Persists](https://www.ihlservices.com/news/analyst-corner/2025/09/retail-inventory-crisis-persists-despite-172-billion-in-improvements/)). IHL separately attributes 2025 losses to supplier missteps (>300 billion), internal inefficiencies (~500 billion), and theft (>500 billion) ([IHL Group — Fixing Inventory Distortion](https://www.ihlservices.com/product/fixing-inventory-distortion-whos-winning-whos-failing-whats-working/)). Inventory-distortion and out-of-stock cost benchmarks apply ✓ to B, E, O, G, S.

| IHL Benchmark | Value | Source |
|---|---|---|
| Global inventory distortion 2025 | ~1.73–1.77 trillion USD | [IHL Group — Research Findings](https://www.ihlservices.com/news/ihl-research-findings/) |
| Inventory distortion as % of global retail sales | ~6.5% | [IHL Group — Inventory Crisis Persists](https://www.ihlservices.com/news/analyst-corner/2025/09/retail-inventory-crisis-persists-despite-172-billion-in-improvements/) |
| Supply-chain-disruption share | ~301 billion USD | [IHL Group — Inventory Crisis Persists](https://www.ihlservices.com/news/analyst-corner/2025/09/retail-inventory-crisis-persists-despite-172-billion-in-improvements/) |
| Returned-goods cost (separate) | ~1.9 trillion USD | [IHL Group — Research Findings](https://www.ihlservices.com/news/ihl-research-findings/) |

### VIII.4 — Sensormatic Shopper Insights

Sensormatic Shopper Insights provides traffic-data trends and conversion benchmarks from its global footfall network, and hosts the IHL inventory-distortion analysis for retail audiences ([Sensormatic Solutions](https://www.sensormatic.com/); [Sensormatic — IHL inventory study](https://www.sensormatic.com/resources/rp/2023/ihl-inventory-distortion-study)). The same network powers the BRC-Sensormatic footfall monitor (Part IX). Applies ✓ to B, O, G, S; — to pure E.

### VIII.5 — Coresight Research

Coresight Research maintains the US (and UK) Store Openings and Closures Tracker, which quantifies store-closure and -opening square footage: Coresight tracked roughly **120–127 million square feet** of US retail space set to close in 2025, outpacing openings by more than 1.5x, and publishes a 2025 review with 2026 outlook ([Coresight — Store Trackers](https://coresight.com/coresight-research-store-trackers/); [Coresight — 2025 Review and 2026 Outlook](https://coresight.com/research/us-store-tracker-extra-store-openings-and-closures-2025-review-and-2026-outlook/); [Coresight — 120M sq ft to close 2025](https://coresight.com/research/us-store-tracker-extra-june-2025-120-million-square-feet-of-retail-space-to-close-this-year-outpacing-openings-by-over-1-5x/)). Applies ✓ to B, O, G, S; ◑ to E (closures shift demand online).

### VIII.6 — Statista Retail Vertical Reports

Statista aggregates cross-source retail averages (re-publishing primary figures such as the Baymard 70.22% cart-abandonment average and apparel-returns shares) and is used strictly as a tertiary cross-reference, never as a sole citation ([Statista — online apparel returns](https://www.statista.com/statistics/1485179/online-returns-apparel-ecommerce-worldwide/); [Statista](https://www.statista.com/)). Applies across B, E, O, G, S as a tertiary cross-check.

### VIII.7 — Judgment Calls & Open Items (Part VIII)

- ◑ **IHL inventory-distortion figures vary by edition** (1.73T vs. 1.77T depending on the study release within 2025); the panel cites the range and the percent-of-sales figure (6.5%) as the stable reference ([IHL Group — Inventory Crisis Persists](https://www.ihlservices.com/news/analyst-corner/2025/09/retail-inventory-crisis-persists-despite-172-billion-in-improvements/)).
- ⚠ **Deloitte GPR underlying tables, Coresight tracker databank, IHL full studies, and Sensormatic microdata are subscription/report-gated**; rankings and figures here are from public summaries and press releases, flagged for RTL-K-E ([Deloitte — Global Powers of Retailing 2025](https://www.deloitte.com/us/en/Industries/retail/research/global-powers-of-retailing.html); [Coresight Research](https://coresight.com/)).

---

## Part IX — UK / European IFRS-Jurisdiction Benchmarks {#part-ix}

This Part documents UK and EU retail benchmarks for cross-blend awareness — material to IFRS-jurisdiction retail entities whose KPI definitions differ subtly from US conventions.

### IX.1 — BRC (British Retail Consortium)

The British Retail Consortium publishes the UK's leading retail-sales and footfall trackers. The **BRC-KPMG Retail Sales Monitor** (published since 1995) reports total and like-for-like sales by category, including online ([BRC — Retail Sales Monitor](https://brc.org.uk/market-intelligence/publications/monitors/retail-sales-monitor/); [BRC — Monitors](https://brc.org.uk/market-intelligence/publications/monitors/)). On a like-for-like basis, UK retail sales rose **0.7% year-over-year in February 2026** and **3.1% in March 2026** ([Trading Economics — BRC Retail Sales Monitor YoY](https://tradingeconomics.com/united-kingdom/brc-retail-sales-monitor-yoy); [FX Blue — BRC Like-for-Like](https://www.fxblue.com/calendar/item/3a35946f-7a82-4e4f-9582-9c61676eecb3/8e5b4bf6-610f-420e-973b-4671801947e7)). The **BRC-Sensormatic Footfall Monitor** draws on 1.5 million measurement devices and over 40 billion shopper visits annually; total UK footfall fell **3.9% across March–April 2026 combined** ([BRC — Footfall Monitor](https://brc.org.uk/market-intelligence/publications/monitors/footfall-monitor/); [BRC — footfall sharp decline April 2026](https://brc.org.uk/news-and-events/news/corporate-affairs/2026/ungated/mounting-pressure-on-retail-as-footfall-takes-sharp-decline/)). The BRC like-for-like measure explicitly strips out floorspace changes from store openings/closures ([BRC — Retail Sales Monitor methodology](https://img1.wsimg.com/blobby/go/4fa3e4f4-7940-4353-bf99-371d87cbfd10/downloads/0f85815f-71ea-4cc5-b871-fdf4cbc2c28a/dec-2025-uk-rsm.pdf)).

### IX.2 — Eurostat Retail Trade Statistics

Eurostat publishes the EU-wide retail-trade volume index. In April 2026, seasonally adjusted retail-trade volume **decreased 0.4% in the euro area and 0.5% in the EU** month-over-month, after growing 0.8% (euro area) and 1.1% (EU) in March 2026 ([Eurostat — retail trade April 2026](https://ec.europa.eu/eurostat/web/products-euro-indicators/w/4-04062026-ap)). The methodology and overview are documented in the Eurostat retail-volume-index pages ([Eurostat — Retail trade volume index overview](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Retail_trade_volume_index_overview); [Eurostat — turnover and volume metadata](https://ec.europa.eu/eurostat/cache/metadata/EN/sts_wrt_ts_esms_hr.htm)). Applies across B, E, O, G, S for EU-domiciled entities.

### IX.3 — Trading Economics Retail Data

Trading Economics is the principal aggregator providing country-level retail KPIs (US, UK, euro area, and individual member states) with consensus and forecast context, used as a tertiary cross-check on the primary BRC/Eurostat/Census series ([Trading Economics — US Retail Sales](https://tradingeconomics.com/united-states/retail-sales); [Trading Economics — Euro Area Retail Sales](https://tradingeconomics.com/euro-area/retail-sales); [Trading Economics — BRC Retail Sales Monitor YoY](https://tradingeconomics.com/united-kingdom/brc-retail-sales-monitor-yoy)). Applies across B, E, O, G, S as a tertiary aggregator.

### IX.4 — Why This Matters for Wave 2

Retail KPI calculations differ subtly between US and UK/EU jurisdictions, and RTL-K (Wave 2) must encode the differences for IFRS-jurisdiction entities:

- **Fiscal calendar.** US retailers commonly use the NRF **4-5-4 retail calendar** and the 13-month/53-week comp rule for comparable-store-sales reporting, whereas UK/EU like-for-like is typically reported on calendar months ([NRF — 4-5-4 calendar](https://nrf.com/resources/4-5-4-calendar); [BRC — Retail Sales Monitor methodology](https://img1.wsimg.com/blobby/go/4fa3e4f4-7940-4353-bf99-371d87cbfd10/downloads/0f85815f-71ea-4cc5-b871-fdf4cbc2c28a/dec-2025-uk-rsm.pdf)).
- **Like-for-like / comparable-sales definitions.** The BRC like-for-like measure strips floorspace changes and treats distance sales variably across participants, which is not identical to the US comparable-store-sales convention ([BRC — Retail Sales Monitor](https://brc.org.uk/market-intelligence/publications/monitors/retail-sales-monitor/)).
- **Volume vs. value.** Eurostat headline retail figures are reported as volume (real) indices, whereas Census MARTS headline figures are value (nominal, not price-adjusted) — a direct comparison requires deflating one side ([Eurostat — Retail trade volume index overview](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Retail_trade_volume_index_overview); [Census MARTS May 2026](https://www.census.gov/retail/marts/www/marts_current.pdf)).

### IX.5 — Judgment Calls & Open Items (Part IX)

- ◑ **UK/EU benchmarks are for cross-blend awareness**, not the default US panel; the panel applies them only when the founder declares a UK/EU-domiciled (IFRS-jurisdiction) entity.
- ⚠ **BRC detailed weekly category data and the Retail Sales Benchmark are member-gated**; figures here are from public BRC releases and aggregators, flagged for RTL-K-E ([BRC — Monitors](https://brc.org.uk/market-intelligence/publications/monitors/)).

---

## Part X — Benchmark Binding Table for Wave 2 {#part-x}

This Part maps each benchmark source to the RTL-K-A KPIs it serves, its update frequency, and the sub-segments served. **This table is the input to the RTL-K-G evaluator's threshold logic.**

| RTL-K KPI | Primary Benchmark Source | Update Frequency | Sub-Segments Served |
|---|---|---|---|
| Total retail sales / demand context | [Census MARTS](https://www.census.gov/retail/marts/www/marts_current.pdf) | Monthly (advance) | B, E, O, G, S |
| E-commerce share of retail | [Census Quarterly E-Commerce Report](https://www.census.gov/retail/ecommerce.html) | Quarterly | E, O (B context) |
| Inventory-to-sales / turns | [Census MTIS](https://www.census.gov/mtis/current/index.html); [Census ARTS](https://www.census.gov/programs-surveys/arts.html) | Monthly / Annual | B, E, O, G, S |
| Goods PCE (durable/non-durable) | [FRED PCE series](https://fred.stlouisfed.org/series/PCE) | Monthly / Quarterly | B, G, S |
| Consumer confidence / sentiment | [Conference Board](https://www.conference-board.org/topics/consumer-confidence); [UMich](https://www.sca.isr.umich.edu/) | Monthly | B, S (discretionary) |
| Sales per square foot | [ICSC / Datex](https://www.icsc.com/) | Periodic (TTM) | B, S, G (store), O (store leg) |
| Occupancy cost ratio | [ICSC / Datex](https://www.icsc.com/) | Periodic (TTM) | B, S, G (store) |
| In-store conversion / traffic | [Sensormatic Shopper Insights](https://www.sensormatic.com/) | Continuous | B, S, O, G |
| Online conversion / AOV | [Adobe Digital Insights](https://business.adobe.com/resources/digital-economy-index.html) | Monthly | E, O |
| Cart abandonment | [Baymard Institute](https://baymard.com/lists/cart-abandonment-rate) | Periodic (annual refresh) | E, O |
| Fulfillment cost per order | [ShipBob](https://www.shipbob.com/) / [Logistics Management](https://www.logisticsmgmt.com/) | Periodic | E, O |
| Returns rate (all / online) | [NRF Returns Landscape](https://nrf.com/research/2025-retail-returns-landscape) | Annual | E, S, O (B, G context) |
| BOPIS / BORIS / ship-from-store | [NRF](https://nrf.com/research-insights) / [Adobe](https://business.adobe.com/resources/digital-economy-index.html) / [McKinsey](https://www.mckinsey.com/industries/retail/our-insights) | Periodic | O |
| Unified-commerce maturity | [Incisiv / Manhattan](https://www.incisiv.com/) | Annual | O |
| Grocery margin / net profit | [FMI — Food Retailing Industry Speaks](https://www.fmi.org/our-research/research-reports/food-retailing-industry-speaks) | Annual | G (B context) |
| Grocery inventory turns | [FMI](https://www.fmi.org/our-research/food-industry-facts); [NielsenIQ](https://nielseniq.com/) | Annual | G |
| Shrink rate | [NACS State of the Industry](https://www.convenience.org/power-your-business/business-intelligence-data-analytics/soisurveys) | Annual | G, B (theft), S |
| SNAP / WIC mix | [USDA FNS](https://www.fns.usda.gov/data-research) | Monthly / Annual | G (B context) |
| Private-label penetration | [FMI — Power of Private Brands](https://www.fmi.org/industry-topics/private-brands) | Annual | G, B, S |
| Loyalty penetration | [Bond Brand Loyalty](https://bondbrandloyalty.com/the-loyalty-report/); [NielsenIQ](https://nielseniq.com/) | Annual | G, O, S |
| Sell-through / markdown / IMU-MMU | [Circana (NPD)](https://www.circana.com/); [Coresight](https://coresight.com/) | Periodic | S, B (seasonal) |
| Apparel returns rate | [Coresight](https://coresight.com/research/the-true-cost-of-apparel-returns-alarming-return-rates-require-loss-minimization-solutions/); [NRF](https://nrf.com/research/2025-retail-returns-landscape) | Periodic / Annual | S, E |
| Specialty customer LTV | [Bond](https://bondbrandloyalty.com/the-loyalty-report/); [LoyaltyLion](https://loyaltylion.com/); [Smile.io](https://smile.io/) | Periodic | S, O |
| Global / US top-retailer ranking | [Deloitte GPR](https://www.deloitte.com/us/en/Industries/retail/research/global-powers-of-retailing.html); [NRF Top 100](https://nrf.com/research-insights/top-retailers) | Annual | B, E, O, G, S |
| Inventory distortion / out-of-stock | [IHL Group](https://www.ihlservices.com/news/ihl-research-findings/) | Annual | B, E, O, G, S |
| Store closures / openings | [Coresight Store Trackers](https://coresight.com/coresight-research-store-trackers/) | Weekly / Annual | B, O, G, S |
| UK like-for-like / footfall | [BRC](https://brc.org.uk/market-intelligence/publications/monitors/) | Monthly | B, O, G, S (UK) |
| EU retail volume | [Eurostat](https://ec.europa.eu/eurostat/web/products-euro-indicators/w/4-04062026-ap) | Monthly | B, E, O, G, S (EU) |

---

## Part XI — Sources Reference Table {#part-xi}

Primary sources (whitelist) used throughout this document, all publicly accessible as of mid-2026 except where noted as subscription-gated. Where a primary authority publishes multiple relevant pages, the specific sub-pages cited or available for verification are enumerated here so the RTL-K-E verification pass can re-pull each one directly.

**Census Bureau — retail measurement frame (PRIMARY for sales, e-commerce share, inventory-to-sales, NAICS):**
- [Monthly Retail Trade (MARTS landing)](https://www.census.gov/retail/index.html)
- [MARTS current release (PDF, May 2026, CB26-97)](https://www.census.gov/retail/marts/www/marts_current.pdf)
- [Quarterly Retail E-Commerce Sales Report (Q1 2026, 16.9%)](https://www.census.gov/retail/ecommerce.html)
- [Annual Retail Trade Survey (ARTS)](https://www.census.gov/programs-surveys/arts.html)
- [ARTS NAICS 2017 restatement summary (PDF)](https://www.census.gov/retail/mrts/www/NAICS_Restatement_Summary.pdf)
- [Manufacturing and Trade Inventories and Sales (MTIS, April 2026)](https://www.census.gov/mtis/current/index.html)
- [MTIS flyer / methodology (PDF)](https://www.census.gov/content/dam/Census/topics/business-and-economy/flyers/mtis-flyer.pdf)
- [MRTS about the surveys](https://www.census.gov/retail/mrts/about_the_surveys.html)
- [Retail release schedule](https://www.census.gov/retail/release_schedule.html)
- [NAICS landing](https://www.census.gov/naics/)
- [2022 NAICS Manual (PDF)](https://www.census.gov/naics/reference_files_tools/2022_NAICS_Manual.pdf)
- [Economic Census Sector 44-45 tables](https://www.census.gov/data/tables/2022/econ/economic-census/naics-sector-44-45.html)
- [Impact of NAICS changes (Census story)](https://www.census.gov/library/stories/2024/11/naics-changes.html)

**BLS / BEA / Federal Reserve — macro context:**
- [BLS — NAICS 2022 update & retail employment](https://www.bls.gov/opub/mlr/2023/article/the-naics-2022-update-and-its-effect-on-bls-employment-estimates-in-the-retail-trade-sector.htm)
- [BLS Consumer Expenditure Survey](https://www.bls.gov/cex/)
- [BLS CE vs. PCE comparison (PDF)](https://www.bls.gov/cex/pce_compare_0203.pdf)
- [BEA Consumer Spending (PCE)](https://www.bea.gov/data/consumer-spending/main)
- [FRED PCE](https://fred.stlouisfed.org/series/PCE); [FRED PCND](https://fred.stlouisfed.org/series/PCND); [FRED PCEDGC96](https://fred.stlouisfed.org/series/PCEDGC96); [FRED PCENDC96](https://fred.stlouisfed.org/series/PCENDC96); [FRED PCEPILFE](https://fred.stlouisfed.org/series/PCEPILFE)
- [FRED E-Commerce % of retail (ECOMPCTNSA)](https://fred.stlouisfed.org/series/ECOMPCTNSA)
- [FRED Retailers Inventories-to-Sales (RETAILIRSA)](https://fred.stlouisfed.org/series/RETAILIRSA)
- [FRED Advance Retail Sales: Retail Trade (RSXFS)](https://fred.stlouisfed.org/series/RSXFS/1000)
- [Conference Board Consumer Confidence](https://www.conference-board.org/topics/consumer-confidence)
- [University of Michigan Surveys of Consumers](https://www.sca.isr.umich.edu/)

**ICSC — physical-retail productivity (sales per square foot, occupancy cost; subscription microdata):**
- [ICSC landing](https://www.icsc.com/)
- [ICSC Retail Store Planning (PDF)](https://www.icsc.com/uploads/event_presentations/Retail_Store_Planning.pdf)
- [ICSC / Datex sales-per-sq-ft & occupancy update](https://www.linkedin.com/posts/jaredmajorhimes_icsc-occ-cost-activity-7232529845002387456-Bl2O)
- [ICSC / Datex 2022 sales-per-sq-ft series](https://www.linkedin.com/posts/mcneiljennifer_icsc-activity-7036013982217814016-Y9Bu)
- [ICSC US Mall Performance (PDF)](https://www.icsc.com/uploads/t07-subpage/2_18_16.pdf)
- [CoStar — ICSC sales per square foot](https://www.costar.com/article/1178363696/sales-per-square-foot-for-most-retail-categories-surpass-pre-pandemic-levels)

**NRF — US retail trade association (returns, top retailers, 4-5-4 calendar):**
- [NRF — 2025 Retail Returns Landscape](https://nrf.com/research/2025-retail-returns-landscape)
- [NRF — nearly $850B returns 2025 (press release)](https://nrf.com/media-center/press-releases/consumers-expected-to-return-nearly-850-billion-in-merchandise-in-2025)
- [NRF / Happy Returns — 2024 $890B](https://nrf.com/media-center/press-releases/nrf-and-happy-returns-report-2024-retail-returns-total-890-billion)
- [NRF — Top 50 Global Retailers 2025](https://nrf.com/research-insights/top-retailers/top-50-global-retailers/top-50-global-retailers-2025)
- [NRF — Top Retailers research](https://nrf.com/research-insights/top-retailers)
- [NRF — 4-5-4 retail calendar](https://nrf.com/resources/4-5-4-calendar)
- [NRF — research insights](https://nrf.com/research-insights)

**E-commerce benchmarks (Baymard, Adobe, fulfillment, returns-management):**
- [Baymard Institute — Cart Abandonment Rate (70.22%)](https://baymard.com/lists/cart-abandonment-rate)
- [Adobe — E-Commerce Conversion Benchmarks](https://business.adobe.com/blog/basics/ecommerce-conversion-rate-benchmarks)
- [Adobe Digital Economy Index resource](https://business.adobe.com/resources/digital-economy-index.html)
- [Shopify Plus](https://www.shopify.com/plus); [SimilarWeb](https://www.similarweb.com/)
- [ShipBob](https://www.shipbob.com/); [Shipware](https://shipware.com/); [Logistics Management](https://www.logisticsmgmt.com/)
- [Loop Returns](https://www.loopreturns.com/); [Happy Returns — 2025 Returns Report](https://happyreturns.com/2025-happy-returns-nrf-returns-report)
- [Clickpost — returns statistics](https://www.clickpost.ai/blog/ecommerce-return-statistics); [Synctrack — return rates](https://synctrack.io/blog/ecommerce-return-rates/)

**Omnichannel research (HBR, McKinsey, Forrester, Incisiv/Manhattan):**
- [Harvard Business Review — omnichannel shopper research](https://hbr.org/2017/01/a-study-of-46000-shoppers-shows-that-omnichannel-retailing-works)
- [McKinsey — retail insights](https://www.mckinsey.com/industries/retail/our-insights)
- [Forrester — retail research](https://www.forrester.com/research/)
- [Incisiv — Unified Commerce Benchmark](https://www.incisiv.com/); [Manhattan Associates](https://www.manh.com/)

**Grocery / CPG (FMI, NACS, USDA, NielsenIQ, Kantar):**
- [FMI — The Food Retailing Industry Speaks](https://www.fmi.org/our-research/research-reports/food-retailing-industry-speaks)
- [FMI — Grocery Store Chains Net Profit](https://www.fmi.org/our-research/food-industry-facts/grocery-store-chains-net-profit)
- [FMI — Food Industry Facts](https://www.fmi.org/our-research/food-industry-facts)
- [FMI — Private Brands](https://www.fmi.org/industry-topics/private-brands)
- [FMI — 2025 report press release](https://www.fmi.org/newsroom/news-archive/view/2025/07/15/fmi-report--amid-uncertainty--food-industry-succeeds-in-offering-shoppers-value)
- [Grocery Dive — FMI margins to pre-pandemic levels](https://www.grocerydive.com/news/grocery-industry-profit-margins-fall-to-pre-pandemic-levels-fmi/720517/)
- [Progressive Grocer — FMI Power of Private Brands](https://progressivegrocer.com/retailers-suppliers-bullish-future-private-label-growth)
- [Grocery Dive — private-brand share to 25.6%](https://www.grocerydive.com/news/grocers-growth-spurt-private-brand-dollar-share/759997/)
- [Just Food — private label growth (PLMA/NIQ)](https://www.just-food.com/comment/private-labels-growth-surge-and-the-us-brand-battle-ahead/)
- [NACS — In-Store Sales Top $340 Billion (2025 data)](https://www.convenience.org/stay-current/news/2026/april/15/u-s-convenience-in-store-sales-top-$340-billion)
- [NACS — State of the Industry Report (purchase)](https://www.convenience.org/stay-current/news/2026/june/16/nacs-state-of-the-industry-report%C2%AE-of-2025-data-is-available-to-purchase)
- [NACS — State of the Industry surveys](https://www.convenience.org/power-your-business/business-intelligence-data-analytics/soisurveys)
- [NACS Magazine — 5 Key Metrics](https://www.nacsmagazine.com/issues/june-2026/5-key-metrics-defining-the-convenience-industrys-health)
- [USDA FNS — SNAP](https://www.fns.usda.gov/snap/supplemental-nutrition-assistance-program); [USDA FNS — WIC](https://www.fns.usda.gov/wic); [USDA FNS — data & research](https://www.fns.usda.gov/data-research)
- [NielsenIQ](https://nielseniq.com/); [Kantar](https://www.kantar.com/)
- [Bond Brand Loyalty Report](https://bondbrandloyalty.com/the-loyalty-report/)

**Specialty / apparel (Circana/NPD, Edited, First Insight, Coresight, loyalty):**
- [Circana (NPD)](https://www.circana.com/); [Edited](https://edited.com/); [First Insight](https://www.firstinsight.com/)
- [Coresight — True Cost of Apparel Returns](https://coresight.com/research/the-true-cost-of-apparel-returns-alarming-return-rates-require-loss-minimization-solutions/)
- [UpCounting — return rate by category](https://www.upcounting.com/blog/average-ecommerce-return-rate); [Statista — online apparel returns](https://www.statista.com/statistics/1485179/online-returns-apparel-ecommerce-worldwide/)
- [LoyaltyLion](https://loyaltylion.com/); [Smile.io](https://smile.io/)

**Cross-segment industry firms (Deloitte, IHL, Sensormatic, Coresight, Statista):**
- [Deloitte — Global Powers of Retailing 2025](https://www.deloitte.com/us/en/Industries/retail/research/global-powers-of-retailing.html)
- [Deloitte — Fastest 50 Retailers](https://www.deloitte.com/global/en/industries/consumer/analysis/fastest-50-retailers.html)
- [IHL Group — Research Findings](https://www.ihlservices.com/news/ihl-research-findings/)
- [IHL Group — Inventory Crisis Persists](https://www.ihlservices.com/news/analyst-corner/2025/09/retail-inventory-crisis-persists-despite-172-billion-in-improvements/)
- [IHL Group — Fixing Inventory Distortion](https://www.ihlservices.com/product/fixing-inventory-distortion-whos-winning-whos-failing-whats-working/)
- [Sensormatic Solutions](https://www.sensormatic.com/); [Sensormatic — IHL inventory study](https://www.sensormatic.com/resources/rp/2023/ihl-inventory-distortion-study)
- [Coresight — Store Trackers](https://coresight.com/coresight-research-store-trackers/); [Coresight — 2025 review / 2026 outlook](https://coresight.com/research/us-store-tracker-extra-store-openings-and-closures-2025-review-and-2026-outlook/)
- [Statista](https://www.statista.com/)

**UK / EU IFRS-jurisdiction (BRC, Eurostat, Trading Economics):**
- [BRC — Monitors](https://brc.org.uk/market-intelligence/publications/monitors/); [BRC — Retail Sales Monitor](https://brc.org.uk/market-intelligence/publications/monitors/retail-sales-monitor/); [BRC — Footfall Monitor](https://brc.org.uk/market-intelligence/publications/monitors/footfall-monitor/)
- [BRC — footfall sharp decline April 2026](https://brc.org.uk/news-and-events/news/corporate-affairs/2026/ungated/mounting-pressure-on-retail-as-footfall-takes-sharp-decline/)
- [BRC — Retail Sales Monitor methodology (PDF)](https://img1.wsimg.com/blobby/go/4fa3e4f4-7940-4353-bf99-371d87cbfd10/downloads/0f85815f-71ea-4cc5-b871-fdf4cbc2c28a/dec-2025-uk-rsm.pdf)
- [Eurostat — retail trade April 2026](https://ec.europa.eu/eurostat/web/products-euro-indicators/w/4-04062026-ap); [Eurostat — retail volume index overview](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Retail_trade_volume_index_overview); [Eurostat — turnover/volume metadata](https://ec.europa.eu/eurostat/cache/metadata/EN/sts_wrt_ts_esms_hr.htm)
- [Trading Economics — US](https://tradingeconomics.com/united-states/retail-sales); [Trading Economics — Euro Area](https://tradingeconomics.com/euro-area/retail-sales); [Trading Economics — BRC Monitor](https://tradingeconomics.com/united-kingdom/brc-retail-sales-monitor-yoy)

Secondary / tertiary cross-references (never sole citation per RTL-K-D discipline): Statista, Trading Economics, YCharts, Marketplace Pulse, FX Blue, and trade-press outlets (Grocery Dive, Progressive Grocer, Just Food, CoStar). None is used as a sole source for any benchmark figure where a primary authority exists.

---

*Document prepared for Advisacor Retail Vertical Knowledge Stack — Module RTL-K-D — Wiseman Financial Technologies LLC. DRAFT / SPEC ONLY — composition-only reference, not executable, no PC gates passed. All benchmarks drawn from publicly available primary sources except where flagged ⚠ (subscription-gated or pending RTL-K-E extraction). This is a living reference — benchmark ranges should be refreshed per the Part X cadence and feed the RTL-K-G evaluator's threshold logic.*

*Generated: June 23, 2026 — v0.9 (DRAFT)*
