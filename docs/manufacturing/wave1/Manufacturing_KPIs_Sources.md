# US Manufacturing Operating, Cost-Accounting, and Financial KPIs — Comprehensive Reference

**DRAFT / SPEC — NOT EXECUTABLE — NOT LOCKED**

`executable: false`
`containsVerticalComplianceLogic: true`

**Document Title:** US Manufacturing KPI Reference — Advisacor Manufacturing Vertical Knowledge Stack, Module MFG-K-A  
**Date Generated:** June 22, 2026  
**Version:** 1.0 (DRAFT)  
**Scope:** US manufacturers — five sub-segments: Discrete (D), Process (P), Hybrid/Mixed-Mode (H), Job-Shop/Project (J), Engineer-to-Order/ETO (E). Production-strategy axis (MTS / MTO / ATO / ETO) noted where a metric is sensitive to it. NAICS sectors 31–33.  
**Prepared for:** Advisacor — Wiseman Financial Technologies LLC (Matthew Wiseman, founder)  
**Output Classification:** `recommendation_for_human_review`  
**Citation Discipline:** Every KPI definition cites an authoritative **primary source**. For cost accounting and variance analysis: Institute of Management Accountants (IMA) Statements on Management Accounting, AICPA. For inventory/revenue: FASB Codification (ASC 330, ASC 606) via DART (Deloitte Accounting Research Tool), KPMG handbooks, IFRS Foundation. For operations/OEE/inventory turns: APICS/ASCM body of knowledge and the SCOR model. For quality: ASQ and ISO 9001. For benchmarks: Federal Reserve G.17, BLS Producer Price Index, U.S. Census Annual Survey of Manufactures, NACM credit metrics. For sustainability: EPA, the GHG Protocol, ISO 14001. Secondary sources (IndustryWeek, Oracle NetSuite KPI library, Dintec, Eagle Rock CFO) are cited only as cross-references, never as a sole citation. Definitions that vary materially by organization are flagged as **VARIABLE** alongside the most commonly used standard version. Where U.S. GAAP and IFRS diverge, both are stated.

This document is the manufacturing-vertical analog of `Healthcare_KPIs_42N1_Sources.md` and is governed by `MANUFACTURING_VERTICAL_PLANNING_DOCUMENT.md`. **Section II (Cost Accounting / Variance KPIs) is the binding contract for the Command Center "Manufacturing Variances" panel** — every panel field maps 1-to-1 to a variance KPI defined here.

---

## How to Read This Document

Each KPI entry contains six standardized fields:

1. **Definition** — Concise, citation-backed description  
2. **Formula** — Explicit numerator and denominator, using LaTeX \( ... \) inline or \[ ... \] display  
3. **Data Source** — Where numerator/denominator data originates  
4. **Sub-Segment Applicability** — Five-column matrix (✓ = applicable, — = not applicable, ◑ = partially applicable). **No cell is ever left blank.**  
5. **Standard vs. Variable** — Whether the definition is standardized (IMA/ASCM/ASQ/FASB/CMS-equivalent) or varies by organization  
6. **Authoritative Citation** — Primary source with full URL in markdown-link format  

**Manufacturing Sub-Segment Key:** **D** = Discrete | **P** = Process | **H** = Hybrid / Mixed-Mode | **J** = Job-Shop / Project | **E** = Engineer-to-Order (ETO)

**Variance sign convention (binding, IMA/AICPA):** A **favorable** variance is **negative** (actual cost came in under standard); an **unfavorable** variance is **positive** (actual cost came in over standard). The panel surfaces an **F / U** tag next to each value to prevent sign misreading.

---

## Section I — Financial / Revenue Cycle KPIs (Manufacturing)

---

### MFG-FIN-01. Days Sales Outstanding (DSO) — Manufacturing

**(1) Definition**  
DSO measures the average number of days a manufacturer takes to collect cash after a credit sale. It is the manufacturing analog of healthcare "Net Days in AR" and is the primary receivables-liquidity indicator. NACM treats DSO as a core credit-department performance metric and cautions that DSO must be read against the firm's selling terms (a DSO meaningfully above terms signals collection deterioration). For manufacturers selling on net-30/net-60 terms with progress billing on long-lead orders, DSO is sensitive to the production strategy (ETO/MTO contracts with milestone billing distort a naive DSO).

**(2) Formula**

\[ \text{DSO} = \frac{\text{Accounts Receivable}}{\text{Net Credit Sales}} \times \text{Number of Days in Period} \]

The "countback" / true-DSO method is preferred by NACM where sales are seasonal: peel AR back month-by-month against actual sales until AR is exhausted.

**(3) Data Source**  
- Numerator: Balance Sheet (trade accounts receivable, net of allowance)  
- Denominator: Income Statement (net credit sales for the period); period days typically 365 (annual) or days-in-month (monthly)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ◑ |

ETO is partial: long-cycle ETO contracts use milestone/progress billing and contract-asset (unbilled) balances under ASC 606, so raw trade-AR DSO understates working-capital tie-up; a contract-asset-inclusive variant is more meaningful.

**(5) Standard vs. Variable**  
**VARIABLE** — The basic formula is standard, but the denominator (gross vs. net credit sales, inclusion of cash sales) and method (simple vs. countback) vary. NACM documents the methodological choices.

**(6) Authoritative Citation**  
[NACM — The Art of Measuring Modern Credit Department Performance (DSO metrics)](https://nacm.org/pdfs/white-papers/Whitepaper-Metrics-apr23.pdf) | [NACM — Keep DSO in Its Place](https://nacm.org/587-white-papers/3244-keep-dso-in-its-place.html)

---

### MFG-FIN-02. Gross Margin

**(1) Definition**  
Gross Margin is the percentage of revenue remaining after cost of goods sold (COGS), which for a manufacturer comprises direct materials, direct labor, and manufacturing overhead absorbed into product cost. It is the headline manufacturing profitability indicator and the most direct financial reflection of cost-variance performance — unfavorable manufacturing variances compress gross margin. SEC registrants present and discuss gross profit/margin trends in MD&A under Reg S-K Item 303.

**(2) Formula**

\[ \text{Gross Margin} = \frac{\text{Net Revenue} - \text{Cost of Goods Sold}}{\text{Net Revenue}} \times 100 \]

**(3) Data Source**  
- Numerator and denominator: Audited Income Statement / General Ledger (net revenue; COGS, which absorbs standard product cost plus capitalized variances per ASC 330)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**VARIABLE** — The formula is universal, but what is absorbed into COGS (overhead absorption policy, treatment of variances, idle-capacity charges expensed per ASC 330-10-30) varies by costing policy. Under U.S. GAAP, abnormal idle facility expense, freight, handling, and spoilage are recognized as current-period charges (ASC 330); IAS 2 reaches the same conclusion, so gross margin is comparable across bases on this point.

**(6) Authoritative Citation**  
[FASB ASC 330 Inventory — DART (Deloitte Accounting Research Tool)](https://dart.deloitte.com/USDART/home/codification/assets/asc330) | [SEC Regulation S-K Item 303 (MD&A)](https://www.ecfr.gov/current/title-17/chapter-II/part-229/subpart-229.300/section-229.303)

---

### MFG-FIN-03. Operating Margin

**(1) Definition**  
Operating Margin measures operating income (gross profit less operating expenses such as SG&A and R&D) as a percentage of net revenue. It captures profitability of core manufacturing operations before interest and taxes (operating income is effectively EBIT for most manufacturers).

**(2) Formula**

\[ \text{Operating Margin} = \frac{\text{Operating Income}}{\text{Net Revenue}} \times 100 \]

where Operating Income = Net Revenue − COGS − Operating Expenses (SG&A, R&D, depreciation/amortization classified as operating).

**(3) Data Source**  
- Audited Income Statement / General Ledger (operating income line; net revenue)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**VARIABLE** — Classification of items as operating vs. non-operating (restructuring, impairment, gains on asset sales) varies; SEC MD&A guidance governs presentation for registrants.

**(6) Authoritative Citation**  
[SEC Regulation S-K Item 303 (MD&A — results of operations)](https://www.ecfr.gov/current/title-17/chapter-II/part-229/subpart-229.300/section-229.303) | [FASB ASC 330 Inventory — DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330)

---

### MFG-FIN-04. Net Margin

**(1) Definition**  
Net Margin (net profit margin) measures net income (after interest, taxes, and all non-operating items) as a percentage of net revenue — the bottom-line profitability of the manufacturing enterprise.

**(2) Formula**

\[ \text{Net Margin} = \frac{\text{Net Income}}{\text{Net Revenue}} \times 100 \]

**(3) Data Source**  
- Audited Income Statement (net income; net revenue)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**STANDARDIZED** conceptually (net income ÷ revenue), governed by the income-statement presentation rules of SEC Reg S-X for registrants. Tax-rate and non-recurring-item effects make period-to-period comparability the analytical challenge, not the formula.

**(6) Authoritative Citation**  
[SEC Regulation S-X (financial statement form and content)](https://www.ecfr.gov/current/title-17/chapter-II/part-210) | [SEC Regulation S-K Item 303 (MD&A)](https://www.ecfr.gov/current/title-17/chapter-II/part-229/subpart-229.300/section-229.303)

---

### MFG-FIN-05. Manufacturing Cost as % of Revenue

**(1) Definition**  
Total Manufacturing Cost as a percentage of revenue expresses the combined direct materials, direct labor, and manufacturing overhead (i.e., the manufacturing cost of production, closely related to COGS) as a share of net revenue. It is a top-line efficiency benchmark; the manufacturing-industry target is commonly cited as below ~65% of revenue. It is the financial roll-up that the Section II variances explain at the line-item level.

**(2) Formula**

\[ \text{Mfg Cost \% of Revenue} = \frac{\text{Total Manufacturing Cost (DM + DL + MOH)}}{\text{Net Revenue}} \times 100 \]

**(3) Data Source**  
- Numerator: Cost accounting system / General Ledger (direct materials issued, direct labor, applied manufacturing overhead)  
- Denominator: Income Statement (net revenue)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**VARIABLE** — Whether the numerator is total manufacturing cost incurred (production basis) or COGS (sales basis) varies; in periods of inventory build the two diverge by the change in inventory. Overhead absorption policy (ASC 330) drives comparability.

**(6) Authoritative Citation**  
[FASB ASC 330 Inventory — DART (product cost composition, absorption)](https://dart.deloitte.com/USDART/home/codification/assets/asc330) | Cross-reference (secondary, benchmark only): [Oracle NetSuite Manufacturing KPI library](https://www.netsuite.com/portal/resource/articles/erp/manufacturing-kpis-metrics.shtml)

---

### MFG-FIN-06. Working Capital Cycle (Cash Conversion Cycle)

**(1) Definition**  
The Cash Conversion Cycle (CCC), also called the working-capital cycle, measures the number of days between paying for inputs and collecting cash from the sale of finished goods. For manufacturers it is especially material because inventory passes through three stages (raw material → WIP → finished goods), so DIO is large and CCC is a primary liquidity stress indicator. NACM treats the CCC components (DSO, DIO, DPO) as core credit/working-capital metrics.

**(2) Formula**

\[ \text{CCC} = \text{DSO} + \text{DIO} - \text{DPO} \]

where DSO = MFG-FIN-01, DIO = MFG-FIN-07, DPO = MFG-FIN-08.

**(3) Data Source**  
- Derived from Balance Sheet (AR, inventory, AP) and Income Statement (revenue, COGS), per the three component KPIs.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

Job-Shop and ETO are partial: with milestone/progress billing and customer deposits/advances, the conventional CCC can be negative or distorted; a contract-asset/contract-liability-adjusted CCC is more meaningful.

**(5) Standard vs. Variable**  
**STANDARDIZED** as the identity DSO + DIO − DPO; the variability is inherited from the component definitions.

**(6) Authoritative Citation**  
[NACM — The Art of Measuring Modern Credit Department Performance](https://nacm.org/pdfs/white-papers/Whitepaper-Metrics-apr23.pdf) | [NACM — Four Key Metrics Your Credit Department Should Consider](https://nacm.org/pdfs/articles/FourKeyMetricsToConsiderTracking.pdf)

---

### MFG-FIN-07. Days Inventory Outstanding (DIO)

**(1) Definition**  
DIO (also Days Inventory on Hand, Days' Sales in Inventory) measures the average number of days inventory is held before it is sold. It is the inventory leg of the CCC and the financial-statement complement to the operational Inventory Turnover ratio (MFG-SC-01). For manufacturers the inventory carried is measured under ASC 330 at the lower of cost or net realizable value (FIFO/weighted average) — under IAS 2 the same lower-of-cost-and-NRV principle applies but **LIFO is prohibited** and write-down reversals are **permitted** (material divergence, see MFG-SC flagging).

**(2) Formula**

\[ \text{DIO} = \frac{\text{Average Inventory}}{\text{Cost of Goods Sold}} \times \text{Number of Days in Period} \]

Equivalently, DIO = 365 ÷ Inventory Turnover.

**(3) Data Source**  
- Numerator: Balance Sheet (average of beginning and ending inventory, all stages)  
- Denominator: Income Statement (COGS for the period)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

Job-Shop and ETO carry WIP as contract assets/costs-to-fulfill rather than stocked inventory; conventional DIO on balance-sheet inventory understates the true holding period of long-cycle work.

**(5) Standard vs. Variable**  
**VARIABLE** — Average vs. period-end inventory, and COGS vs. revenue in the denominator, vary by source. The inventory carrying value depends on the costing method (FIFO/LIFO/weighted-average) elected under ASC 330; LIFO firms' DIO is not comparable to FIFO firms' DIO.

**(6) Authoritative Citation**  
[FASB ASC 330 Inventory — DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330) | [APICS/ASCM SCOR Digital Standard (inventory days of supply)](https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/)

---

### MFG-FIN-08. Days Payable Outstanding (DPO)

**(1) Definition**  
DPO measures the average number of days a manufacturer takes to pay its trade suppliers. It is the payables leg of the CCC; extending DPO conserves cash but, taken too far, can damage supplier relationships and on-time delivery (MFG-SC-08). NACM tracks DPO as a counterpart to DSO in working-capital analysis.

**(2) Formula**

\[ \text{DPO} = \frac{\text{Accounts Payable}}{\text{Cost of Goods Sold}} \times \text{Number of Days in Period} \]

Some firms use total purchases (rather than COGS) in the denominator for a purer payables-period measure.

**(3) Data Source**  
- Numerator: Balance Sheet (trade accounts payable)  
- Denominator: Income Statement (COGS) or purchases ledger (total credit purchases)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**VARIABLE** — COGS vs. purchases in the denominator is the main methodological choice; supply-chain-finance/reverse-factoring arrangements (now subject to ASU 2022-04 supplier-finance disclosure) can materially inflate apparent DPO.

**(6) Authoritative Citation**  
[NACM — The Art of Measuring Modern Credit Department Performance](https://nacm.org/pdfs/white-papers/Whitepaper-Metrics-apr23.pdf) | [FASB ASC 330 / supplier-finance disclosure context — DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330)

---

### MFG-FIN-09. Return on Net Assets (RONA) — Manufacturing

**(1) Definition**  
RONA measures how efficiently a manufacturer generates profit from its invested capital base of fixed assets plus net working capital. It is a manufacturing-specific capital-efficiency metric because manufacturing is asset-intensive (plant, machinery, tooling, inventory); RONA penalizes idle or excess productive assets and excess working capital, complementing the operational OEE and inventory-turns metrics.

**(2) Formula**

\[ \text{RONA} = \frac{\text{Net Income}}{\text{Fixed Assets} + \text{Net Working Capital}} \times 100 \]

where Net Working Capital = Current Assets − Current Liabilities.

**(3) Data Source**  
- Numerator: Income Statement (net income, sometimes operating income after tax)  
- Denominator: Balance Sheet (net fixed assets/PP&E + net working capital)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

Process manufacturing (capital-intensive plants) and discrete manufacturing track RONA most actively. Job-Shop and ETO are partial because much of their asset base is project WIP/contract assets rather than dedicated fixed plant; capital intensity is lower and more variable.

**(5) Standard vs. Variable**  
**VARIABLE** — The numerator (net income vs. NOPAT) and the asset base (gross vs. net fixed assets; whether to use average balances) vary. There is no single FASB-prescribed definition; it is a managerial ratio.

**(6) Authoritative Citation**  
[FASB ASC 330 / financial-statement basis — DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330) | Cross-reference (secondary, benchmark only): [Oracle NetSuite Manufacturing KPI library](https://www.netsuite.com/portal/resource/articles/erp/manufacturing-kpis-metrics.shtml)

---
## Section II — Cost Accounting / Variance KPIs (THE PANEL BIND — CRITICAL)

This section is the binding contract for the Command Center **Manufacturing Variances** panel (`lib/dashboard/panels/manufacturing-variance/`). Each realized-variance KPI (MFG-V-01 through MFG-V-08) maps **1-to-1** to a panel field named in `MANUFACTURING_VERTICAL_PLANNING_DOCUMENT.md` and is mirrored by a forecast-variance KPI (MFG-FV-01 through MFG-FV-08). The closing **Panel Contract Crosswalk Table** restates every mapping.

**Sign convention (binding, IMA/AICPA):** Favorable = **negative** (under standard); Unfavorable = **positive** (over standard). The panel renders an **F / U** tag next to each value.

**Standards basis (binding, resolved Q2 — all three supported; per-tenant config via `basisOfStandards`):**

- **Budgeted** — standards derived from the current operating budget / master budget; "standard price/rate/quantity/hours" equal the budgeted amounts for the period. Most common; ties variances directly to the financial plan.
- **Engineered** — standards derived from industrial-engineering studies (bill of materials, routings, time-and-motion studies, equipment-rated throughput). The most rigorous basis; "standard quantity/hours allowed" reflect engineered ideal usage. Common in mature discrete/process plants with strong IE functions.
- **Historical-rolling** — standards set to a trailing rolling average of actuals (e.g., trailing 6–12 months). Easiest to maintain and self-calibrating, but embeds prior inefficiency into the standard, muting variances. Common in job-shops and where engineered standards are impractical.

The variance **formula structure is identical across all three bases**; only the source of the "standard" inputs changes. The evaluator accepts the basis as an explicit input and never silently defaults.

**Definitional authority for all variances in this section:** the IMA standard-cost / variance-analysis framework (Institute of Management Accountants Statements on Management Accounting), the AICPA/managerial-accounting standard-costing canon, and the manufacturing-cost-accounting body of knowledge. The IMA SMA literature on standard costing and variance analysis enumerates exactly these variances: direct materials price and efficiency (usage) variances, direct labor rate and efficiency variances, variable manufacturing overhead spending and efficiency variances, and fixed manufacturing overhead spending and production-volume variances.

---

### MFG-V-01. Direct Materials Price Variance

**Panel field:** `directMaterialsPriceVariance`

**(1) Definition**  
The Direct Materials Price Variance (also called the materials purchase-price variance) measures the difference between the actual price paid for raw materials and the standard price, multiplied by the actual quantity purchased. It isolates the procurement/price effect of materials cost away from the usage effect. A favorable (negative) value means materials were bought below standard price; unfavorable (positive) means above. It is part of the IMA/AICPA standard-cost variance set.

**(2) Formula**

\[ \text{DM Price Variance} = (\text{Actual Price} - \text{Standard Price}) \times \text{Actual Quantity Purchased} \]

**(3) Data Source**  
- Actual Price, Actual Quantity Purchased: Purchasing/AP system, purchase orders, supplier invoices  
- Standard Price: standards master (budgeted / engineered / historical-rolling per tenant `basisOfStandards`)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ◑ |

Applies across all sub-types. ETO is partial: bespoke per-order materials often have no recurring "standard price," so the variance is computed against the contract-estimated/quoted price rather than a catalog standard (contract-variance prominence over standard-variance prominence).

**(5) Standard vs. Variable**  
**STANDARDIZED** (IMA/AICPA). One documented variation: the price variance may be computed on quantity **purchased** (isolates purchasing at time of buy — most common) or on quantity **used** (defers recognition to consumption). The panel uses quantity **purchased**.

**(6) Authoritative Citation**  
[IMA — Statement on Management Accounting / standard costing & variance analysis (SCVA framework)](https://www.imanet.org/-/media/002311a905634b6a9840236afbb60428.ashx) | [IMA (Institute of Management Accountants) — Statements on Management Accounting library](https://www.imanet.org/insights-and-trends/strategic-cost-management)

---

### MFG-V-02. Direct Materials Usage (Quantity) Variance

**Panel field:** `directMaterialsUsageVariance`

**(1) Definition**  
The Direct Materials Usage Variance (also called the materials quantity or efficiency variance) measures the difference between the actual quantity of material used and the standard quantity allowed for the actual output, valued at the standard price. It isolates the consumption/efficiency effect (scrap, yield loss, over-issue) from the price effect. Favorable (negative) = used less than standard allowed; unfavorable (positive) = used more.

**(2) Formula**

\[ \text{DM Usage Variance} = (\text{Actual Quantity Used} - \text{Standard Quantity Allowed}) \times \text{Standard Price} \]

where Standard Quantity Allowed = standard usage per unit × actual good output.

**(3) Data Source**  
- Actual Quantity Used: production/MES material-issue records, bill-of-materials backflush  
- Standard Quantity Allowed: BOM standard usage × actual output  
- Standard Price: standards master (per `basisOfStandards`)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ◑ |

Highly prominent in process manufacturing (yield-driven). For process/hybrid, the usage variance is often further decomposed into **mix** and **yield** variances (see MFG-V-09, MFG-V-10). ETO partial as in MFG-V-01.

**(5) Standard vs. Variable**  
**STANDARDIZED** (IMA/AICPA). Decomposition into mix + yield for multi-input processes is a documented extension (Section MFG-V-09/10).

**(6) Authoritative Citation**  
[IMA — standard costing & variance analysis (SCVA) framework](https://www.imanet.org/-/media/002311a905634b6a9840236afbb60428.ashx) | [IMA — Statements on Management Accounting / strategic cost management](https://www.imanet.org/insights-and-trends/strategic-cost-management)

---

### MFG-V-03. Direct Labor Rate Variance

**Panel field:** `directLaborRateVariance`

**(1) Definition**  
The Direct Labor Rate Variance measures the difference between the actual wage rate paid and the standard wage rate, multiplied by the actual hours worked. It isolates the wage-rate/labor-mix effect (overtime premium, skill-mix, wage changes) from the efficiency effect. Favorable (negative) = paid below standard rate; unfavorable (positive) = above.

**(2) Formula**

\[ \text{DL Rate Variance} = (\text{Actual Rate} - \text{Standard Rate}) \times \text{Actual Hours Worked} \]

**(3) Data Source**  
- Actual Rate, Actual Hours: payroll/timekeeping system, labor distribution  
- Standard Rate: standards master (per `basisOfStandards`)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**STANDARDIZED** (IMA/AICPA).

**(6) Authoritative Citation**  
[IMA — standard costing & variance analysis (SCVA) framework](https://www.imanet.org/-/media/002311a905634b6a9840236afbb60428.ashx) | [IMA — Statements on Management Accounting / strategic cost management](https://www.imanet.org/insights-and-trends/strategic-cost-management)

---

### MFG-V-04. Direct Labor Efficiency Variance

**Panel field:** `directLaborEfficiencyVariance`

**(1) Definition**  
The Direct Labor Efficiency Variance (labor usage/quantity variance) measures the difference between the actual hours worked and the standard hours allowed for the actual output, valued at the standard rate. It isolates productivity/efficiency (learning, downtime, rework) from the rate effect. Favorable (negative) = fewer hours than standard allowed; unfavorable (positive) = more.

**(2) Formula**

\[ \text{DL Efficiency Variance} = (\text{Actual Hours} - \text{Standard Hours Allowed}) \times \text{Standard Rate} \]

where Standard Hours Allowed = standard hours per unit × actual good output.

**(3) Data Source**  
- Actual Hours: timekeeping/MES labor records  
- Standard Hours Allowed: routing standard hours × actual output  
- Standard Rate: standards master (per `basisOfStandards`)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ◑ | ✓ | ✓ | ✓ |

Prominent in labor-intensive discrete, hybrid, job-shop, and ETO. Process manufacturing is partial — labor is often a small, largely fixed share of conversion cost in continuous process plants, so the labor efficiency variance carries less management attention than materials yield and overhead.

**(5) Standard vs. Variable**  
**STANDARDIZED** (IMA/AICPA).

**(6) Authoritative Citation**  
[IMA — standard costing & variance analysis (SCVA) framework](https://www.imanet.org/-/media/002311a905634b6a9840236afbb60428.ashx) | [IMA — Statements on Management Accounting / strategic cost management](https://www.imanet.org/insights-and-trends/strategic-cost-management)

---

### MFG-V-05. Variable Overhead Spending Variance

**Panel field:** `variableOverheadSpendingVariance`

**(1) Definition**  
The Variable Overhead (VOH) Spending Variance measures the difference between the actual variable-overhead rate and the standard variable-overhead rate, multiplied by the actual hours of the allocation base. It captures whether variable overhead resources (indirect materials, indirect labor, utilities, supplies) cost more or less per unit of activity than standard. Favorable (negative) = below standard spending rate; unfavorable (positive) = above.

**(2) Formula**

\[ \text{VOH Spending Variance} = (\text{Actual VOH Rate} - \text{Standard VOH Rate}) \times \text{Actual Hours} \]

Equivalently: Actual VOH Cost − (Standard VOH Rate × Actual Hours).

**(3) Data Source**  
- Actual VOH cost / rate: General Ledger overhead accounts ÷ actual hours of allocation base  
- Standard VOH Rate: overhead standards master (per `basisOfStandards`)  
- Actual Hours: timekeeping/MES (allocation-base hours, e.g., direct-labor or machine hours)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**STANDARDIZED** (IMA/AICPA). One documented variation: the allocation base may be direct-labor hours (labor-paced shops) or machine hours (capital-paced/process plants); the choice must match the engineering reality of the cost driver.

**(6) Authoritative Citation**  
[IMA — standard costing & variance analysis (SCVA) framework](https://www.imanet.org/-/media/002311a905634b6a9840236afbb60428.ashx) | [IMA — Statements on Management Accounting / strategic cost management](https://www.imanet.org/insights-and-trends/strategic-cost-management)

---

### MFG-V-06. Variable Overhead Efficiency Variance

**Panel field:** `variableOverheadEfficiencyVariance`

**(1) Definition**  
The Variable Overhead Efficiency Variance measures the difference between actual hours and standard hours allowed for the actual output, valued at the standard variable-overhead rate. It reflects the overhead consequence of using more or fewer hours of the allocation base than standard — i.e., variable overhead efficiency tracks the efficiency of the underlying activity base. Favorable (negative) = fewer hours than allowed; unfavorable (positive) = more.

**(2) Formula**

\[ \text{VOH Efficiency Variance} = (\text{Actual Hours} - \text{Standard Hours Allowed}) \times \text{Standard VOH Rate} \]

**(3) Data Source**  
- Actual Hours: timekeeping/MES  
- Standard Hours Allowed: routing standard × actual output  
- Standard VOH Rate: overhead standards master (per `basisOfStandards`)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ◑ | ✓ | ✓ | ✓ |

Process manufacturing partial for the same reason as labor efficiency (MFG-V-04): when the allocation base is largely fixed/automated, the efficiency component is small.

**(5) Standard vs. Variable**  
**STANDARDIZED** (IMA/AICPA).

**(6) Authoritative Citation**  
[IMA — standard costing & variance analysis (SCVA) framework](https://www.imanet.org/-/media/002311a905634b6a9840236afbb60428.ashx) | [IMA — Statements on Management Accounting / strategic cost management](https://www.imanet.org/insights-and-trends/strategic-cost-management)

---

### MFG-V-07a. Fixed Overhead Spending (Budget) Variance

**Panel field:** `fixedOverheadSpendingVariance`

**(1) Definition**  
The Fixed Overhead Spending Variance (also called the fixed-overhead budget variance) measures the difference between actual fixed manufacturing overhead incurred and budgeted fixed manufacturing overhead. Because fixed overhead does not flex with volume, the spending variance is simply actual minus budget. Favorable (negative) = spent less than budget; unfavorable (positive) = spent more.

**(2) Formula**

\[ \text{FOH Spending Variance} = \text{Actual Fixed Overhead} - \text{Budgeted Fixed Overhead} \]

**(3) Data Source**  
- Actual Fixed Overhead: General Ledger fixed-overhead accounts (depreciation, plant salaries, rent, insurance)  
- Budgeted Fixed Overhead: budget master (per `basisOfStandards`; for engineered/historical bases the "budget" is the period fixed-overhead standard)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**STANDARDIZED** (IMA/AICPA).

**(6) Authoritative Citation**  
[IMA — standard costing & variance analysis (SCVA) framework](https://www.imanet.org/-/media/002311a905634b6a9840236afbb60428.ashx) | [IMA — Statements on Management Accounting / strategic cost management](https://www.imanet.org/insights-and-trends/strategic-cost-management)

---

### MFG-V-07b. Fixed Overhead Volume Variance

**Panel field:** `fixedOverheadVolumeVariance`

**(1) Definition**  
The Fixed Overhead Volume (Production-Volume) Variance measures the difference between budgeted fixed overhead and fixed overhead applied to actual output (standard fixed-overhead rate × standard hours allowed for actual output). It reflects over- or under-utilization of capacity: producing below the denominator volume under-absorbs fixed overhead (unfavorable), above over-absorbs (favorable). It has no cash-spending meaning — it is purely an absorption/capacity-utilization measure. Favorable (negative) = applied more than budget (over-absorbed); unfavorable (positive) = applied less (under-absorbed).

**(2) Formula**

\[ \text{FOH Volume Variance} = \text{Budgeted FOH} - (\text{Standard FOH Rate} \times \text{Standard Hours Allowed for Actual Output}) \]

**(3) Data Source**  
- Budgeted FOH: budget master  
- Standard FOH Rate: budgeted FOH ÷ denominator (normal-capacity) hours  
- Standard Hours Allowed: routing standard × actual output

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

Most meaningful where fixed overhead is large and capacity is the binding constraint (discrete, process, hybrid). Job-Shop and ETO are partial: with high product variety and project-based capacity, a single denominator-volume basis is harder to define; under ASC 330 abnormal idle capacity is expensed rather than capitalized, which interacts with this variance.

**(5) Standard vs. Variable**  
**STANDARDIZED** (IMA/AICPA). Variation: the denominator level may be theoretical, practical, normal, or budgeted (master-budget) capacity; the choice shifts the volume variance materially. The basis must be disclosed.

**(6) Authoritative Citation**  
[IMA — standard costing & variance analysis (SCVA) framework](https://www.imanet.org/-/media/002311a905634b6a9840236afbb60428.ashx) | [FASB ASC 330 — idle-capacity expensing interaction — DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330)

---

### MFG-V-08. Total Manufacturing Cost Variance

**Panel field:** `totalManufacturingCostVariance`

**(1) Definition**  
The Total Manufacturing Cost Variance is the algebraic sum of all eight component variances above. It reconciles total standard manufacturing cost for the actual output to total actual manufacturing cost. Favorable (negative) overall = actual manufacturing cost below standard; unfavorable (positive) = above. This is the panel's roll-up line and the bridge to the gross-margin impact (MFG-FIN-02).

**(2) Formula**

\[ \text{Total Mfg Cost Variance} = \sum (\text{MFG-V-01} \dots \text{MFG-V-07b}) \]

\[ = \text{DM Price} + \text{DM Usage} + \text{DL Rate} + \text{DL Efficiency} + \text{VOH Spending} + \text{VOH Efficiency} + \text{FOH Spending} + \text{FOH Volume} \]

**(3) Data Source**  
- Computed: sum of MFG-V-01 through MFG-V-07b outputs for the same (tenant, accounting period).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**STANDARDIZED** (IMA/AICPA) as the sum identity. The composition of the sum reflects each component's sub-segment prominence.

**(6) Authoritative Citation**  
[IMA — standard costing & variance analysis (SCVA) framework](https://www.imanet.org/-/media/002311a905634b6a9840236afbb60428.ashx) | [IMA — Statements on Management Accounting / strategic cost management](https://www.imanet.org/insights-and-trends/strategic-cost-management)

---

### MFG-V-09. Direct Materials Mix Variance (Process / Hybrid)

**(1) Definition**  
For multi-input processes (chemicals, food & beverage, metals, refining), the Materials Mix Variance decomposes part of the usage variance: it measures the cost effect of using a different **blend** of inputs than the standard blend, holding total input quantity constant. Favorable (negative) = cheaper blend than standard; unfavorable (positive) = costlier blend.

**(2) Formula**

\[ \text{Mix Variance} = \sum_i \left[ (\text{Actual Mix}_i - \text{Standard Mix}_i) \times \text{Total Actual Input Quantity} \right] \times \text{Standard Price}_i \]

i.e., for each input i, (actual input quantity − total actual quantity × standard mix proportion) × standard price.

**(3) Data Source**  
- Actual input quantities by component: process/batch records, MES  
- Standard mix proportions and standard prices: formulation/recipe standards (per `basisOfStandards`)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ◑ | ✓ | ✓ | — | — |

Primarily Process and Hybrid (blended/formulated inputs). Discrete partial (only where substitutable component mixes exist, e.g., alloy blends). Not applicable to single-input Job-Shop/ETO contract work.

**(5) Standard vs. Variable**  
**STANDARDIZED** (IMA/AICPA process-costing extension); mix/yield decomposition is a documented standard-costing technique for multi-input processes.

**(6) Authoritative Citation**  
[IMA — standard costing & variance analysis (SCVA), mix/yield decomposition](https://www.imanet.org/-/media/002311a905634b6a9840236afbb60428.ashx) | [IMA — Statements on Management Accounting / strategic cost management](https://www.imanet.org/insights-and-trends/strategic-cost-management)

---

### MFG-V-10. Direct Materials Yield Variance (Process / Hybrid)

**(1) Definition**  
The Materials Yield Variance is the complement to the mix variance: it measures the cost effect of total input quantity yielding more or less output than the standard yield, holding the input mix at standard. Together, mix + yield reconcile to the total materials usage variance for multi-input processes. Favorable (negative) = higher yield than standard (less input per unit output); unfavorable (positive) = lower yield.

**(2) Formula**

\[ \text{Yield Variance} = (\text{Actual Total Input} - \text{Standard Total Input for Actual Output}) \times \text{Standard Weighted-Average Input Price} \]

**(3) Data Source**  
- Actual total input and actual output: process/batch yield records, MES  
- Standard yield ratio and standard weighted-average price: formulation/recipe standards (per `basisOfStandards`)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ◑ | ✓ | ✓ | — | — |

Same prominence pattern as MFG-V-09: yield variance is the defining materials variance for process/hybrid (continuous/batch yield is the core economic lever).

**(5) Standard vs. Variable**  
**STANDARDIZED** (IMA/AICPA process-costing extension).

**(6) Authoritative Citation**  
[IMA — standard costing & variance analysis (SCVA), mix/yield decomposition](https://www.imanet.org/-/media/002311a905634b6a9840236afbb60428.ashx) | [IMA — Statements on Management Accounting / strategic cost management](https://www.imanet.org/insights-and-trends/strategic-cost-management)

---

### Forecast Variance Parallel Block — MFG-FV-01 through MFG-FV-08

**Binding (resolved Q6):** Forecast variances are in scope at v1.0. Each MFG-FV-0n KPI uses the **identical formula** to its realized MFG-V-0n counterpart, with **forecast inputs replacing actuals**. The "actual" price/rate/quantity/hours are replaced by the forecasted price/rate/quantity/hours for the forecast horizon (`forecastHorizon: { periodsAhead }`), while the "standard" inputs remain the same standards master (per `basisOfStandards`). The forecast inputs originate from one documented `forecastInputSource`:

- **`sop`** — Sales-and-Operations-Planning output (the consensus operational plan; preferred for production-volume and hours/usage forecasts).
- **`demand-forecast`** — statistical/ML demand forecast (preferred for output-volume-driven usage and overhead-absorption forecasts).
- **`sales-pipeline`** — CRM/sales pipeline (preferred for revenue-linked and order-driven forecasts; most relevant to MTO/ATO/ETO order books).

Forecast drill-down stops at the forecast **input record** (a future journal entry does not yet exist). Sign convention and F/U tagging are identical to the realized block.

| Forecast KPI | Mirrors | Panel field (`forecastVarianceSection.*`) | Formula (forecast input substituted) | Typical `forecastInputSource` |
|---|---|---|---|---|
| **MFG-FV-01** Forecast DM Price Variance | MFG-V-01 | `directMaterialsPriceVariance` | (Forecast Price − Standard Price) × Forecast Quantity Purchased | `demand-forecast` / `sop` |
| **MFG-FV-02** Forecast DM Usage Variance | MFG-V-02 | `directMaterialsUsageVariance` | (Forecast Quantity Used − Standard Quantity Allowed) × Standard Price | `sop` / `demand-forecast` |
| **MFG-FV-03** Forecast DL Rate Variance | MFG-V-03 | `directLaborRateVariance` | (Forecast Rate − Standard Rate) × Forecast Hours | `sop` |
| **MFG-FV-04** Forecast DL Efficiency Variance | MFG-V-04 | `directLaborEfficiencyVariance` | (Forecast Hours − Standard Hours Allowed) × Standard Rate | `sop` / `demand-forecast` |
| **MFG-FV-05** Forecast VOH Spending Variance | MFG-V-05 | `variableOverheadSpendingVariance` | (Forecast VOH Rate − Standard VOH Rate) × Forecast Hours | `sop` |
| **MFG-FV-06** Forecast VOH Efficiency Variance | MFG-V-06 | `variableOverheadEfficiencyVariance` | (Forecast Hours − Standard Hours Allowed) × Standard VOH Rate | `sop` / `demand-forecast` |
| **MFG-FV-07a** Forecast FOH Spending Variance | MFG-V-07a | `fixedOverheadSpendingVariance` | Forecast Fixed Overhead − Budgeted Fixed Overhead | `sop` |
| **MFG-FV-07b** Forecast FOH Volume Variance | MFG-V-07b | `fixedOverheadVolumeVariance` | Budgeted FOH − (Standard FOH Rate × Standard Hours Allowed for Forecast Output) | `demand-forecast` / `sales-pipeline` |
| **MFG-FV-08** Forecast Total Mfg Cost Variance | MFG-V-08 | `totalManufacturingCostForecastVariance` | Σ of MFG-FV-01 … MFG-FV-07b | (inherits) |

**Sub-Segment Applicability (forecast block, all eight):** mirrors the realized counterpart's matrix exactly (a forecast variance applies wherever its realized variance applies). Forecast variances are most operationally valuable for MTS/ATO strategies (forward production planning); for pure ETO the forecast variance reduces to a contract-estimate-vs-standard comparison and is correspondingly less central.

**Authoritative Citation (forecast block):** [IMA — standard costing & variance analysis (SCVA) framework, applied to planned/forecast inputs](https://www.imanet.org/-/media/002311a905634b6a9840236afbb60428.ashx) | [IMA — Statements on Management Accounting / strategic cost management & planning](https://www.imanet.org/insights-and-trends/strategic-cost-management)

---
## Section III — Operations / OEE KPIs

Primary definitional authority for OEE and its components: the **ASCM Supply Chain Dictionary** (APICS/ASCM body of knowledge). Per ASCM, "OEE is the measurement of the effectiveness of a company's equipment based on the product of its availability, performance and production quality." MTBF/MTTR follow ASQ reliability-engineering definitions.

---

### MFG-OPS-01. Overall Equipment Effectiveness (OEE)

**(1) Definition**  
OEE is the product of three rates — Availability, Performance, and Quality — expressing the share of fully productive time relative to planned production time. Per the ASCM Supply Chain Dictionary, OEE measures equipment effectiveness as the product of availability, performance, and production quality. World-class OEE is commonly benchmarked at ~85%; typical plants run ~60%.

**(2) Formula**

\[ \text{OEE} = \text{Availability} \times \text{Performance} \times \text{Quality} \]

**(3) Data Source**  
- Machine/MES logs (run time, downtime, cycle counts), production counts, scrap/rework counts.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

Core to discrete, process, and hybrid (equipment-paced production). Job-Shop and ETO are partial: with high changeover and low repetition, OEE on a given machine is noisy and less central than utilization and on-time delivery.

**(5) Standard vs. Variable**  
**STANDARDIZED** (ASCM) as the three-factor product. Variation exists in what counts as "planned production time" (whether planned downtime/breaks are excluded) and is the source of the OEE-vs-TEEP distinction (MFG-OPS-05).

**(6) Authoritative Citation**  
[ASCM — Overall Equipment Effectiveness (ASCM Supply Chain Dictionary definition)](https://www.ascm.org/ascm-insights/OEE-for-production-scheduling/)

---

### MFG-OPS-02. Availability Rate (OEE component)

**(1) Definition**  
Availability captures all downtime losses (breakdowns, preventive maintenance, minor stops, setup/changeover). Per ASCM it is calculated as actual operating time divided by planned production time.

**(2) Formula**

\[ \text{Availability} = \frac{\text{Actual Operating Time}}{\text{Planned Production Time}} \]

where Actual Operating Time = Planned Operating Time − Downtime Losses.

**(3) Data Source**  
- MES/machine logs (planned production time, downtime events).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

**(5) Standard vs. Variable**  
**STANDARDIZED** (ASCM).

**(6) Authoritative Citation**  
[ASCM — Availability component of OEE](https://www.ascm.org/ascm-insights/OEE-for-production-scheduling/)

---

### MFG-OPS-03. Performance Rate (OEE component)

**(1) Definition**  
Performance captures the loss in productivity when equipment runs below its rated throughput rate (speed losses, minor stops). Per ASCM it is actual throughput divided by rated throughput.

**(2) Formula**

\[ \text{Performance} = \frac{\text{Actual Throughput}}{\text{Rated Throughput}} \]

**(3) Data Source**  
- MES/machine logs (actual units/cycles), engineering nameplate (rated/ideal cycle time).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

**(5) Standard vs. Variable**  
**STANDARDIZED** (ASCM).

**(6) Authoritative Citation**  
[ASCM — Performance component of OEE](https://www.ascm.org/ascm-insights/OEE-for-production-scheduling/)

---

### MFG-OPS-04. Quality Rate (OEE component)

**(1) Definition**  
Quality captures the loss when out-of-specification product is made (scrap, rework, startup/changeover yield loss). Per ASCM it is the quantity of first-grade material divided by the total quantity produced.

**(2) Formula**

\[ \text{Quality} = \frac{\text{Quantity of First-Grade Material}}{\text{Total Quantity Produced}} \]

**(3) Data Source**  
- Production counts and quality-inspection records (good vs. scrap/rework counts).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**STANDARDIZED** (ASCM). Closely related to First-Pass Yield (MFG-Q-01) but scoped to a machine/line within the OEE calculation.

**(6) Authoritative Citation**  
[ASCM — Quality component of OEE](https://www.ascm.org/ascm-insights/OEE-for-production-scheduling/)

---

### MFG-OPS-05. Total Effective Equipment Performance (TEEP)

**(1) Definition**  
TEEP extends OEE by measuring effectiveness against **all calendar time** (24/7), not just planned production time. It multiplies OEE by Utilization (the share of calendar time that is scheduled for production), exposing the capacity headroom hidden by unplanned/idle calendar time.

**(2) Formula**

\[ \text{TEEP} = \text{OEE} \times \text{Utilization}, \quad \text{Utilization} = \frac{\text{Planned Production Time}}{\text{All Calendar Time}} \]

**(3) Data Source**  
- MES/scheduling system (planned production time, total calendar time), OEE inputs.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | — |

Most relevant to capital-intensive discrete/process/hybrid plants evaluating whether to add shifts vs. capacity. Job-Shop partial; ETO not meaningful (no continuous calendar-capacity benchmark).

**(5) Standard vs. Variable**  
**VARIABLE** — TEEP is built on the OEE base (ASCM) but the utilization factor depends on the chosen calendar-time denominator; not a single fixed standard.

**(6) Authoritative Citation**  
[ASCM — OEE/TEEP and calendar-time utilization](https://www.ascm.org/ascm-insights/OEE-for-production-scheduling/)

---

### MFG-OPS-06. Mean Time Between Failures (MTBF)

**(1) Definition**  
MTBF is the reliability metric expressing the average operating time between inherent (repairable) failures of equipment. It is a core ASQ reliability-engineering measure used to drive preventive-maintenance strategy and feeds the Availability component of OEE.

**(2) Formula**

\[ \text{MTBF} = \frac{\text{Total Operating Time}}{\text{Number of Failures}} \]

**(3) Data Source**  
- CMMS/maintenance system (operating hours, failure event counts).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

**(5) Standard vs. Variable**  
**STANDARDIZED** (ASQ reliability engineering). Variation: definition of "failure" (functional vs. total) and whether MTBF (repairable) vs. MTTF (non-repairable) is used.

**(6) Authoritative Citation**  
[ASQ — Reliability / quality glossary (MTBF)](https://asq.org/quality-resources/reliability)

---

### MFG-OPS-07. Mean Time To Repair (MTTR)

**(1) Definition**  
MTTR is the maintainability metric expressing the average time to restore failed equipment to operation (diagnose + repair + test). With MTBF it determines achievable availability. It is an ASQ reliability/maintainability measure.

**(2) Formula**

\[ \text{MTTR} = \frac{\text{Total Repair (Downtime) Time}}{\text{Number of Repairs}} \]

**(3) Data Source**  
- CMMS/maintenance system (repair durations, repair event counts).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

**(5) Standard vs. Variable**  
**STANDARDIZED** (ASQ). Variation: whether logistic/waiting time for parts is included in "repair time."

**(6) Authoritative Citation**  
[ASQ — Reliability / maintainability glossary (MTTR)](https://asq.org/quality-resources/reliability)

---

### MFG-OPS-08. Capacity Utilization

**(1) Definition**  
Capacity Utilization measures actual output as a percentage of sustainable potential (capacity) output. At the macro level the Federal Reserve G.17 release defines the rate of capacity utilization as "the seasonally adjusted output index expressed as a percentage of the related capacity index," and reports it for total manufacturing (NAICS 31–33) — the primary external benchmark for a manufacturer's plant utilization.

**(2) Formula**

\[ \text{Capacity Utilization} = \frac{\text{Actual Output}}{\text{Capacity (Potential) Output}} \times 100 \]

(Fed G.17: seasonally adjusted output index ÷ capacity index × 100.)

**(3) Data Source**  
- Internal: production/ERP output vs. engineered/rated capacity  
- External benchmark: Federal Reserve G.17 Industrial Production and Capacity Utilization (manufacturing series)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

**(5) Standard vs. Variable**  
**STANDARDIZED** (Federal Reserve G.17 at the macro/benchmark level). Internal plant-level capacity definitions (theoretical/practical/effective capacity) vary by firm, so the internal numerator/denominator basis must be disclosed.

**(6) Authoritative Citation**  
[Federal Reserve G.17 — Industrial Production and Capacity Utilization (about/definitions)](https://www.federalreserve.gov/releases/g17/about.htm) | [Federal Reserve G.17 — current release](https://www.federalreserve.gov/releases/g17/current/default.htm)

---

### MFG-OPS-09. Throughput (Units per Period)

**(1) Definition**  
Throughput is the rate at which a process produces good (saleable) output per unit of time. In the Theory-of-Constraints/Lean sense (and the ASCM dictionary), it is the rate at which the system generates output; it is the operational driver of revenue and the basis of the OEE Performance rate.

**(2) Formula**

\[ \text{Throughput} = \frac{\text{Total Good Units Produced}}{\text{Time Period}} \]

**(3) Data Source**  
- MES/production counting system (good-unit counts), time base.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

Process throughput is often measured in mass/volume per time (lb, kg, gallon per hour) rather than discrete units — consistent with the panel `unitOfMeasure` union. Job-Shop/ETO partial: low-volume/high-variety makes a single throughput rate less meaningful than order cycle time.

**(5) Standard vs. Variable**  
**VARIABLE** — Unit of measure and whether "throughput" counts gross vs. good output vary; ASCM defines the concept but the operational measure is plant-specific.

**(6) Authoritative Citation**  
[ASCM — throughput / OEE context (Supply Chain Dictionary)](https://www.ascm.org/ascm-insights/OEE-for-production-scheduling/) | [ASCM SCOR Digital Standard](https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/)

---

### MFG-OPS-10. Cycle Time

**(1) Definition**  
Cycle Time is the actual elapsed time to complete one unit (or one process cycle) from start to finish of a defined operation or the whole production process. It is a core Lean/ASCM operational metric; reducing cycle time increases throughput and reduces WIP.

**(2) Formula**

\[ \text{Cycle Time} = \frac{\text{Total Production Run Time}}{\text{Total Units Produced in the Run}} \]

(Process/operation cycle time = net operating time ÷ units through that operation.)

**(3) Data Source**  
- MES/time-study data (operation start/stop timestamps, unit counts).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

For ETO/Job-Shop, cycle time generalizes to order/project lead time (see MFG-SC-10).

**(5) Standard vs. Variable**  
**STANDARDIZED** conceptually (ASCM/Lean). Variation: machine cycle time vs. total/effective cycle time (including waiting, setup) differ; the scope must be stated.

**(6) Authoritative Citation**  
[ASCM — cycle time / OEE context (Supply Chain Dictionary)](https://www.ascm.org/ascm-insights/OEE-for-production-scheduling/) | [ASCM SCOR Digital Standard](https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/)

---

### MFG-OPS-11. Takt Time

**(1) Definition**  
Takt Time is the rate at which units must be produced to meet customer demand — the available production time divided by customer demand for the period. It is the Lean pacing benchmark against which cycle time is balanced (cycle time ≤ takt time to meet demand without overproduction). Defined in the ASCM/Lean body of knowledge.

**(2) Formula**

\[ \text{Takt Time} = \frac{\text{Available Production Time per Period}}{\text{Customer Demand (Units) per Period}} \]

**(3) Data Source**  
- Available time: production schedule / shift calendar  
- Customer demand: S&OP / demand plan / order book

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ◑ | ✓ | ◑ | — |

Most meaningful in repetitive discrete/hybrid flow lines. Process partial (continuous flow is rate-set differently). Job-Shop partial; ETO not applicable (one-off, demand is the single order).

**(5) Standard vs. Variable**  
**STANDARDIZED** conceptually (Lean/ASCM). Variation: "available production time" net of breaks/planned downtime varies by convention.

**(6) Authoritative Citation**  
[ASCM — takt time / Lean operations (Supply Chain Dictionary)](https://www.ascm.org/ascm-insights/OEE-for-production-scheduling/) | [ASCM SCOR Digital Standard](https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/)

---
## Section IV — Supply-Chain / Inventory KPIs

Primary definitional authority: the **APICS/ASCM SCOR (Supply Chain Operations Reference) Digital Standard** for supply-chain reliability/responsiveness/asset metrics, and **FASB ASC 330** (via DART) for inventory accounting. **IFRS divergence flag:** where inventory is measured/valued, IAS 2 differs materially from ASC 330 — **LIFO is prohibited under IAS 2**, and **write-downs to NRV are reversible under IAS 2 but not under ASC 330** (reversal not permitted under U.S. GAAP except for foreign-exchange effects). Any tenant electing `reportingBasis: 'IFRS'` must route inventory-valuation logic through IFRS-aware handling.

---

### MFG-SC-01. Inventory Turnover Ratio (Inventory Turns)

**(1) Definition**  
Inventory Turnover measures how many times inventory is sold and replaced over a period — the velocity of inventory. It is the SCOR-family asset-efficiency metric and the operational complement to DIO (MFG-FIN-07). Manufacturing benchmark: ~4–6× average, 10–12× top quartile.

**(2) Formula**

\[ \text{Inventory Turnover} = \frac{\text{Cost of Goods Sold}}{\text{Average Inventory}} \]

**(3) Data Source**  
- Numerator: Income Statement (COGS)  
- Denominator: Balance Sheet (average inventory, all stages, valued per ASC 330 method)

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

Job-Shop/ETO partial: project WIP/contract assets are not "turned" like stock inventory.

**(5) Standard vs. Variable**  
**VARIABLE** — COGS vs. sales in the numerator and average vs. ending inventory vary; LIFO vs. FIFO carrying value (ASC 330) makes cross-firm turns non-comparable.

**(6) Authoritative Citation**  
[ASCM SCOR Digital Standard (asset-management / inventory metrics)](https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/) | [FASB ASC 330 Inventory — DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330)

---

### MFG-SC-02. Days Inventory on Hand

**(1) Definition**  
Days Inventory on Hand expresses inventory holding in days — the inverse of inventory turns scaled to the period — i.e., how many days of cost the on-hand inventory represents. Operationally identical to DIO (MFG-FIN-07) but tracked as a supply-chain (not just financial) metric and often computed by inventory stage.

**(2) Formula**

\[ \text{Days Inventory on Hand} = \frac{365}{\text{Inventory Turnover}} = \frac{\text{Average Inventory}}{\text{COGS}} \times 365 \]

**(3) Data Source**  
- Inventory subledger (by stage) and Income Statement (COGS).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

**(5) Standard vs. Variable**  
**VARIABLE** — same drivers as inventory turns (MFG-SC-01).

**(6) Authoritative Citation**  
[ASCM SCOR Digital Standard (days of supply)](https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/) | [FASB ASC 330 Inventory — DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330)

---

### MFG-SC-03. Raw Material Inventory Turns

**(1) Definition**  
Raw Material Inventory Turns isolate the turnover velocity of the raw-material stage of inventory, measuring purchasing and inbound-supply efficiency independent of WIP and finished goods.

**(2) Formula**

\[ \text{Raw Material Turns} = \frac{\text{Cost of Materials Consumed (in COGS)}}{\text{Average Raw Material Inventory}} \]

**(3) Data Source**  
- Materials issued/consumed (cost accounting) and raw-material subledger (Balance Sheet).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

Highly material in process manufacturing (bulk raw inputs). ETO/Job-Shop partial: materials are often purchased per-order, not stocked.

**(5) Standard vs. Variable**  
**VARIABLE** — numerator (materials consumed vs. total COGS) and stage-level inventory cut vary.

**(6) Authoritative Citation**  
[ASCM SCOR Digital Standard (inventory by stage)](https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/) | [FASB ASC 330 Inventory (inventory categories) — DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330)

---

### MFG-SC-04. WIP Inventory Turns

**(1) Definition**  
Work-in-Process (WIP) Inventory Turns measure how rapidly partially completed goods move through production — a proxy for production cycle efficiency; high WIP turns indicate short cycle times and low WIP buffers (Lean).

**(2) Formula**

\[ \text{WIP Turns} = \frac{\text{Cost of Goods Manufactured (COGM)}}{\text{Average WIP Inventory}} \]

**(3) Data Source**  
- Cost of goods manufactured (cost accounting) and WIP subledger (Balance Sheet).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

For Job-Shop/ETO, WIP is dominated by long-cycle project costs/contract assets; conventional WIP turns are low and less informative than project schedule-performance metrics.

**(5) Standard vs. Variable**  
**VARIABLE** — COGM vs. COGS in the numerator varies.

**(6) Authoritative Citation**  
[ASCM SCOR Digital Standard (WIP / make-process metrics)](https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/) | [FASB ASC 330 Inventory — DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330)

---

### MFG-SC-05. Finished Goods Inventory Turns

**(1) Definition**  
Finished Goods (FG) Inventory Turns measure how rapidly completed product is sold — a proxy for demand-planning accuracy and FG-stocking efficiency; most relevant to make-to-stock (MTS) strategies.

**(2) Formula**

\[ \text{FG Turns} = \frac{\text{Cost of Goods Sold}}{\text{Average Finished Goods Inventory}} \]

**(3) Data Source**  
- COGS (Income Statement) and FG subledger (Balance Sheet).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | — |

MTS-dominant discrete/process/hybrid track FG turns closely. Job-Shop partial; pure ETO not applicable (no FG stock — product ships on completion against an order).

**(5) Standard vs. Variable**  
**VARIABLE** — averaging method varies; FG carrying value follows the ASC 330 cost method.

**(6) Authoritative Citation**  
[ASCM SCOR Digital Standard (deliver/FG metrics)](https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/) | [FASB ASC 330 Inventory — DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330)

---

### MFG-SC-06. Inventory Carrying Cost

**(1) Definition**  
Inventory Carrying Cost is the total annual cost of holding inventory — capital cost, storage/warehousing, insurance/taxes, and risk (obsolescence, shrinkage, damage) — expressed as a percentage of average inventory value. SCOR/APICS treats carrying cost (commonly 20–30% of inventory value annually) as the economic justification for inventory reduction.

**(2) Formula**

\[ \text{Inventory Carrying Cost \%} = \frac{\text{Capital + Storage + Service + Risk Costs}}{\text{Average Inventory Value}} \times 100 \]

**(3) Data Source**  
- General Ledger (warehousing, insurance, obsolescence reserves), cost of capital (treasury), inventory subledger.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

**(5) Standard vs. Variable**  
**VARIABLE** — which cost components are included and the cost-of-capital rate vary widely; APICS provides the standard taxonomy but not a single mandated percentage.

**(6) Authoritative Citation**  
[ASCM SCOR Digital Standard (inventory cost-to-serve)](https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/) | [FASB ASC 330 (inventory write-downs / obsolescence) — DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330)

---

### MFG-SC-07. Inventory Record Accuracy

**(1) Definition**  
Inventory Record Accuracy measures the percentage of inventory records (by location/SKU) whose system quantity matches the physically counted quantity within tolerance — the integrity metric underpinning MRP/planning. APICS treats cycle-count accuracy as a foundational data-quality KPI; world-class is commonly ≥ 95–99%.

**(2) Formula**

\[ \text{Inventory Accuracy} = \frac{\text{Records Within Count Tolerance}}{\text{Total Records Counted}} \times 100 \]

**(3) Data Source**  
- Cycle-count / physical-inventory results vs. ERP perpetual inventory.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

**(5) Standard vs. Variable**  
**VARIABLE** — the count tolerance (unit vs. dollar; ± %) varies by firm; the concept is APICS-standard.

**(6) Authoritative Citation**  
[ASCM SCOR Digital Standard (data accuracy / asset management)](https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/)

---

### MFG-SC-08. Supplier On-Time Delivery

**(1) Definition**  
Supplier On-Time Delivery (OTD) measures the percentage of supplier receipts delivered on or before the promised/required date (often within a tolerance window). It is a SCOR "source" reliability metric and a leading indicator of production-schedule attainment and inbound risk.

**(2) Formula**

\[ \text{Supplier OTD} = \frac{\text{Receipts On Time (within window)}}{\text{Total Receipts}} \times 100 \]

**(3) Data Source**  
- Receiving/ERP records (promised date vs. actual receipt date).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**VARIABLE** — the on-time window (on-time-in-full vs. date-only; ± days) and date basis (promised vs. requested) vary; SCOR defines the reliability concept.

**(6) Authoritative Citation**  
[ASCM SCOR Digital Standard (Source — supplier reliability)](https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/)

---

### MFG-SC-09. Perfect Order Rate

**(1) Definition**  
The Perfect Order rate is the flagship SCOR reliability metric: the percentage of orders delivered complete, on time, damage-free, and with correct/complete documentation. It is the multiplicative product of the component rates, so it is sensitive to failure in any dimension.

**(2) Formula**

\[ \text{Perfect Order \%} = (\%\text{On Time}) \times (\%\text{Complete}) \times (\%\text{Damage-Free}) \times (\%\text{Correct Documentation}) \times 100 \]

**(3) Data Source**  
- Order management/ERP, shipping/logistics, returns/claims, invoicing records.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

Core to volume order fulfillment (discrete/process/hybrid). Job-Shop/ETO partial: with single large project deliveries, "perfect order" reduces to milestone/contract acceptance rather than an order-population rate.

**(5) Standard vs. Variable**  
**STANDARDIZED** (SCOR) as the multiplicative reliability composite. The component definitions/tolerances vary by firm.

**(6) Authoritative Citation**  
[ASCM SCOR Digital Standard (RL.1.1 Perfect Order Fulfillment)](https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/)

---

### MFG-SC-10. Order Fulfillment / Production Lead Time

**(1) Definition**  
Order Fulfillment Lead Time (also Production/Order Lead Time) is the elapsed time from customer order receipt to delivery (or order release to completion). It is a SCOR "responsiveness" metric and the dominant customer-facing operational KPI for MTO/ATO/ETO strategies.

**(2) Formula**

\[ \text{Order Fulfillment Lead Time} = \text{Delivery Date} - \text{Order Receipt Date} \quad (\text{averaged over orders}) \]

**(3) Data Source**  
- Order management/ERP timestamps (order, release, completion, ship, delivery).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ◑ | ◑ | ◑ | ✓ | ✓ |

Defining KPI for Job-Shop and ETO (order/project lead time is the core promise). For MTS discrete/process/hybrid, fulfillment is from stock so this is partial (delivery lead time, not production lead time).

**(5) Standard vs. Variable**  
**STANDARDIZED** (SCOR responsiveness) conceptually; the start/stop events measured vary.

**(6) Authoritative Citation**  
[ASCM SCOR Digital Standard (RS — Order Fulfillment Cycle Time)](https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/)

---

### MFG-SC-11. Fill Rate

**(1) Definition**  
Fill Rate measures the percentage of customer demand met from available stock without backorder, at the time of order — a SCOR/service-level reliability metric (line fill, unit fill, or order fill). Most relevant to make-to-stock service performance.

**(2) Formula**

\[ \text{Fill Rate} = \frac{\text{Units (or Lines/Orders) Shipped Complete from Stock}}{\text{Units (or Lines/Orders) Ordered}} \times 100 \]

**(3) Data Source**  
- Order management/ERP (ordered vs. shipped quantities), inventory availability.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | — |

MTS discrete/process/hybrid track fill rate as the customer service level. Job-Shop partial; ETO not applicable (built-to-order, no stock to fill from).

**(5) Standard vs. Variable**  
**VARIABLE** — unit vs. line vs. order fill, and whether backorders later filled count, vary; SCOR defines the service-level family.

**(6) Authoritative Citation**  
[ASCM SCOR Digital Standard (RL — fill rate / order fulfillment)](https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/)

---

## Section V — Quality KPIs

Primary definitional authority: **ASQ (American Society for Quality)** and the **ISO 9001** quality-management-system standard; Six Sigma standard definitions for sigma level and PPM.

---

### MFG-Q-01. First-Pass Yield (FPY)

**(1) Definition**  
First-Pass Yield (also First-Time Yield) is the percentage of units that pass through a process correctly the first time, without rework or scrap. For multi-step processes, Rolled Throughput Yield (RTY) is the product of step FPYs. It is the ASQ/Lean-Six-Sigma core process-quality measure; manufacturing benchmark ~95%+.

**(2) Formula**

\[ \text{FPY} = \frac{\text{Units Passing First Time (no rework/scrap)}}{\text{Units Entering the Process}} \times 100 \]

\[ \text{RTY} = \prod_i \text{FPY}_i \]

**(3) Data Source**  
- Quality/inspection records, MES (units in, units passing first time, rework/scrap counts).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**STANDARDIZED** (ASQ/Six Sigma). Variation: FPY (single step) vs. RTY (multi-step) must be distinguished.

**(6) Authoritative Citation**  
[ASQ — Process capability / quality glossary (first-pass yield context)](https://asq.org/quality-resources/process-capability) | [ISO 9001:2015 Quality management systems — Requirements](https://www.iso.org/standard/62085.html)

---

### MFG-Q-02. Defect Rate (Parts Per Million — PPM)

**(1) Definition**  
Defect Rate in PPM (also DPPM / defective parts per million) expresses defects per one million units produced or shipped — the standard quality scale for low-defect manufacturing (automotive/electronics targets often < 50 PPM). It is the ASQ/Six Sigma standard defectives measure and converts directly to sigma level.

**(2) Formula**

\[ \text{Defect Rate (PPM)} = \frac{\text{Number of Defective Units}}{\text{Total Units Produced}} \times 1{,}000{,}000 \]

(Defects-per-million-opportunities, DPMO, uses opportunities rather than units in the denominator.)

**(3) Data Source**  
- Quality/inspection records, customer-return (field) data, MES production counts.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

PPM is the discrete/electronics/automotive lingua franca. Process partial — defects are often measured as off-spec yield/% rather than PPM. Job-Shop/ETO partial: very low volumes make PPM statistically thin; defects tracked per-job.

**(5) Standard vs. Variable**  
**STANDARDIZED** (ASQ/Six Sigma). Variation: PPM (defective units) vs. DPMO (defects per opportunity) are distinct; opportunities counting varies.

**(6) Authoritative Citation**  
[ASQ — Six Sigma quality programs (PPM / DPMO)](https://asq.org/quality-progress/articles/six-sigma-quality-programs?id=f84a5024b2d24bdba36858c647d82d44) | [ISO 9001:2015](https://www.iso.org/standard/62085.html)

---

### MFG-Q-03. Scrap Rate

**(1) Definition**  
Scrap Rate measures material that is discarded as unrecoverable (cannot be reworked), as a percentage of material input or production. It is a direct driver of the materials usage variance (MFG-V-02) and the OEE quality rate; manufacturing benchmark < 2% of material cost.

**(2) Formula**

\[ \text{Scrap Rate} = \frac{\text{Scrapped Units (or Material Value)}}{\text{Total Units Produced (or Material Input)}} \times 100 \]

**(3) Data Source**  
- Scrap-reporting/MES records, cost accounting (scrap value).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ◑ |

**(5) Standard vs. Variable**  
**VARIABLE** — unit-based vs. material-cost-based scrap rate, and treatment of normal vs. abnormal scrap (ASC 330 expenses abnormal spoilage), vary.

**(6) Authoritative Citation**  
[ASQ — quality cost / scrap (cost of quality context)](https://asq.org/quality-resources/cost-of-quality) | [FASB ASC 330 (abnormal spoilage) — DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330)

---

### MFG-Q-04. Rework Rate

**(1) Definition**  
Rework Rate measures the percentage of units requiring additional processing to bring them into specification (recoverable defects, unlike scrap). It is an internal-failure cost component (COPQ) and reduces the OEE quality rate and FPY.

**(2) Formula**

\[ \text{Rework Rate} = \frac{\text{Units Requiring Rework}}{\text{Total Units Produced}} \times 100 \]

**(3) Data Source**  
- Quality/MES rework records, labor charged to rework operations.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ◑ | ✓ | ✓ | ✓ |

Process partial: continuous product is often reprocessed/reblended rather than discretely "reworked"; the concept maps to reprocessing yield.

**(5) Standard vs. Variable**  
**VARIABLE** — scope of "rework" (in-line touch-up vs. full reprocessing) varies; ASQ defines it as an internal-failure category.

**(6) Authoritative Citation**  
[ASQ — Cost of Quality (internal failure: rework)](https://asq.org/quality-resources/cost-of-quality) | [ISO 9001:2015 (nonconformity/rework control)](https://www.iso.org/standard/62085.html)

---

### MFG-Q-05. Cost of Poor Quality (COPQ)

**(1) Definition**  
COPQ (a subset of Cost of Quality) is the total cost of internal failures (scrap, rework) plus external failures (returns, warranty, recalls) — the cost that would disappear if every product were made right the first time. ASQ's Cost of Quality framework structures quality cost into prevention, appraisal, internal failure, and external failure; COPQ is the failure portion.

**(2) Formula**

\[ \text{COPQ} = \text{Internal Failure Costs} + \text{External Failure Costs} \]

Often expressed as \( \text{COPQ \% of Revenue} = \dfrac{\text{COPQ}}{\text{Net Revenue}} \times 100 \).

**(3) Data Source**  
- General Ledger / cost accounting (scrap, rework labor, warranty reserve, returns, recall costs).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**STANDARDIZED** (ASQ Cost of Quality categories) conceptually; which costs are captured/estimated (especially hidden failure costs) varies materially.

**(6) Authoritative Citation**  
[ASQ — Cost of Quality (prevention/appraisal/internal & external failure)](https://asq.org/quality-resources/cost-of-quality)

---

### MFG-Q-06. Customer Complaint Rate

**(1) Definition**  
Customer Complaint Rate measures customer-reported quality complaints per unit shipped (or per period) — an external-failure leading indicator tracked under ISO 9001's customer-satisfaction and nonconformity-handling clauses.

**(2) Formula**

\[ \text{Complaint Rate} = \frac{\text{Number of Customer Complaints}}{\text{Units Shipped (or per million shipped)}} \times \text{scale} \]

**(3) Data Source**  
- CRM/quality complaint system, returns/warranty system, shipment records.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**VARIABLE** — per-unit vs. per-order vs. per-period scaling varies; ISO 9001 requires complaint handling but not a single rate formula.

**(6) Authoritative Citation**  
[ISO 9001:2015 Quality management systems — Requirements (customer satisfaction, complaints)](https://www.iso.org/standard/62085.html) | [ASQ — Cost of Quality (external failure)](https://asq.org/quality-resources/cost-of-quality)

---

### MFG-Q-07. Right-First-Time (RFT)

**(1) Definition**  
Right-First-Time is the percentage of units (or batches) completed correctly with no error, deviation, rework, or reprocessing — closely related to FPY but commonly applied at the batch/lot level (notably in pharmaceutical/process GMP environments where RFT is a release-quality metric). An ASQ/quality-systems metric.

**(2) Formula**

\[ \text{RFT} = \frac{\text{Units/Batches Completed With No Error or Deviation}}{\text{Total Units/Batches Completed}} \times 100 \]

**(3) Data Source**  
- Batch records / quality release records / MES (deviation and rework flags).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

Particularly emphasized in process/hybrid (batch release; GMP). 

**(5) Standard vs. Variable**  
**VARIABLE** — unit-level (≈FPY) vs. batch/deviation-level definitions differ by industry; ASQ/ISO 9001 frame the concept.

**(6) Authoritative Citation**  
[ISO 9001:2015 (control of nonconforming output)](https://www.iso.org/standard/62085.html) | [ASQ — process capability / quality glossary](https://asq.org/quality-resources/process-capability)

---

### MFG-Q-08. Process Capability Index (Cpk)

**(1) Definition**  
Per ASQ, process capability is "a statistical measure of the inherent process variability of a given characteristic," and Cp/Cpk "show how capable a process is of meeting its specification limits." **Cp** is the potential capability; **Cpk** is the actual capability during production, accounting for process centering relative to the specification limits. A Cpk ≥ 1.33 is a common manufacturing acceptance threshold.

**(2) Formula**

\[ \text{Cpk} = \min\!\left( \frac{\text{USL} - \mu}{3\sigma},\; \frac{\mu - \text{LSL}}{3\sigma} \right) \]

\[ \text{Cp} = \frac{\text{USL} - \text{LSL}}{6\sigma} \]

where USL/LSL = upper/lower specification limits, μ = process mean, σ = process standard deviation. (ASQ states the index reflects a ratio of the specification limits to process spread.)

**(3) Data Source**  
- SPC/measurement data (sampled characteristic values → μ and σ), engineering specification limits.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

Requires sufficient sample volume and a stable process. Job-Shop/ETO partial: low-volume one-off work rarely yields a statistically valid Cpk; capability is assessed differently (e.g., first-article inspection).

**(5) Standard vs. Variable**  
**STANDARDIZED** (ASQ/SPC). ASQ's public page describes the concept (ratio of spec limits to process spread) but does not restate the explicit algebra; the min-of-two-ratios Cpk formula above is the universally accepted ASQ/SPC standard form.

**(6) Authoritative Citation**  
[ASQ — What is Process Capability? (Cp, Cpk definitions)](https://asq.org/quality-resources/process-capability)

---

### MFG-Q-09. Sigma Level

**(1) Definition**  
Sigma Level expresses process quality on the Six Sigma scale — the number of standard deviations between the process mean and the nearest specification limit, conventionally mapped to DPMO with the 1.5-sigma long-term shift (Six Sigma = 3.4 DPMO). Per ASQ, "sigma" is a capability estimate typically used with attribute data (defect rates).

**(2) Formula**

\[ \text{Sigma Level} \approx 0.8406 + \sqrt{29.37 - 2.221 \times \ln(\text{DPMO})} \]

(common Six Sigma approximation with the 1.5σ shift; equivalently, sigma level is read from a Z-to-DPMO conversion table).

**(3) Data Source**  
- DPMO derived from defect counts and opportunity counts (quality/MES data).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

Same volume caveat as Cpk for Job-Shop/ETO.

**(5) Standard vs. Variable**  
**STANDARDIZED** (Six Sigma/ASQ). Variation: inclusion of the 1.5σ shift (long-term vs. short-term sigma) materially changes the value; the convention must be stated.

**(6) Authoritative Citation**  
[ASQ — Six-Sigma Quality Programs (sigma level / DPMO)](https://asq.org/quality-progress/articles/six-sigma-quality-programs?id=f84a5024b2d24bdba36858c647d82d44) | [ASQ — Process capability](https://asq.org/quality-resources/process-capability)

---
## Section VI — Labor / Workforce KPIs

Primary definitional authority: **BLS** (OSHA recordable / DART safety rates and labor-productivity methodology), and the **IMA** standard-cost framework for labor-cost and labor-efficiency metrics.

---

### MFG-LBR-01. Labor Productivity (Units per Labor Hour)

**(1) Definition**  
Labor Productivity measures output produced per labor hour — the core workforce-efficiency metric. At the macro level BLS publishes manufacturing labor productivity (output per hour); at the plant level it is good units (or value-added) per direct-labor hour.

**(2) Formula**

\[ \text{Labor Productivity} = \frac{\text{Output (Good Units or Value-Added)}}{\text{Total Labor Hours}} \]

**(3) Data Source**  
- Production counts (MES), labor hours (timekeeping/payroll). Macro benchmark: BLS Productivity program.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ◑ | ✓ | ✓ | ✓ |

Process partial: in highly automated continuous process plants, labor is a small share and "units per labor hour" is less central than throughput per asset.

**(5) Standard vs. Variable**  
**VARIABLE** — output measure (physical units vs. value-added) and labor scope (direct only vs. total) vary; BLS defines the macro methodology.

**(6) Authoritative Citation**  
[BLS — Productivity (output per hour, manufacturing)](https://www.bls.gov/productivity/) | [BLS — Producer Price Index (deflators for value-added productivity)](https://www.bls.gov/ppi/)

---

### MFG-LBR-02. Direct Labor Efficiency

**(1) Definition**  
Direct Labor Efficiency expresses actual output relative to the standard labor time it should have taken — the operational sibling of the Direct Labor Efficiency Variance (MFG-V-04). Expressed as standard hours earned ÷ actual hours worked.

**(2) Formula**

\[ \text{Direct Labor Efficiency} = \frac{\text{Standard Hours Earned for Actual Output}}{\text{Actual Hours Worked}} \times 100 \]

**(3) Data Source**  
- Routing standards (standard hours/unit) × output; actual hours (timekeeping).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ◑ | ✓ | ✓ | ✓ |

Process partial, mirroring MFG-V-04.

**(5) Standard vs. Variable**  
**STANDARDIZED** (IMA standard-cost framework) — directly tied to the labor efficiency variance.

**(6) Authoritative Citation**  
[IMA — standard costing & variance analysis (labor efficiency)](https://www.imanet.org/-/media/002311a905634b6a9840236afbb60428.ashx) | [IMA — Statements on Management Accounting](https://www.imanet.org/insights-and-trends/strategic-cost-management)

---

### MFG-LBR-03. Labor Cost as % of Revenue

**(1) Definition**  
Labor Cost as a percentage of revenue expresses total labor cost (direct + indirect manufacturing labor, sometimes including burden) as a share of net revenue — a top-line workforce-cost-efficiency indicator and an input to make-vs-automate decisions.

**(2) Formula**

\[ \text{Labor Cost \% of Revenue} = \frac{\text{Total Labor Cost}}{\text{Net Revenue}} \times 100 \]

**(3) Data Source**  
- Payroll/cost accounting (labor + burden), Income Statement (net revenue).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**VARIABLE** — labor scope (direct only vs. fully burdened; inclusion of indirect labor) varies; IMA frames labor cost within product cost.

**(6) Authoritative Citation**  
[IMA — strategic cost management (labor cost in product cost)](https://www.imanet.org/insights-and-trends/strategic-cost-management) | [BLS — Employer Costs for Employee Compensation (benchmark)](https://www.bls.gov/ncs/ect/)

---

### MFG-LBR-04. Overtime Rate

**(1) Definition**  
Overtime Rate measures overtime hours as a percentage of total (or regular) labor hours — a workforce-utilization and cost-pressure indicator; chronic high overtime signals capacity shortfall and inflates the labor rate variance (MFG-V-03 via premium pay).

**(2) Formula**

\[ \text{Overtime Rate} = \frac{\text{Overtime Hours}}{\text{Total Hours Worked}} \times 100 \]

**(3) Data Source**  
- Timekeeping/payroll (overtime vs. regular hours).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**VARIABLE** — denominator (total vs. regular hours) varies; no single standard body defines a formula.

**(6) Authoritative Citation**  
[BLS — Labor productivity and hours (overtime context, manufacturing)](https://www.bls.gov/productivity/) | [IMA — labor rate variance interaction](https://www.imanet.org/insights-and-trends/strategic-cost-management)

---

### MFG-LBR-05. Workforce Turnover Rate

**(1) Definition**  
Workforce Turnover Rate measures the rate at which employees leave and are replaced over a period — a retention/stability indicator with direct cost (recruiting, training, lost productivity) and quality implications. BLS Job Openings and Labor Turnover Survey (JOLTS) provides the manufacturing-sector benchmark (separations rate).

**(2) Formula**

\[ \text{Turnover Rate} = \frac{\text{Separations During Period}}{\text{Average Number of Employees}} \times 100 \]

**(3) Data Source**  
- HRIS (separations, headcount). Macro benchmark: BLS JOLTS manufacturing separations rate.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**VARIABLE** — voluntary vs. total turnover, annualization method vary; BLS JOLTS defines the macro separations methodology.

**(6) Authoritative Citation**  
[BLS — Job Openings and Labor Turnover Survey (JOLTS), manufacturing](https://www.bls.gov/jlt/)

---

### MFG-LBR-06. Safety Incident Rate (OSHA Recordable / TRIR)

**(1) Definition**  
The OSHA recordable incidence rate (Total Recordable Incident Rate, TRIR) measures recordable injuries and illnesses per 100 full-time-equivalent workers per year. Per BLS, the 200,000-hour base "represents the equivalent of 100 employees working 40 hours per week, 50 weeks per year, and provides the standard base for the incidence rates." It is the primary manufacturing safety KPI.

**(2) Formula**

\[ \text{TRIR} = \frac{\text{Number of Recordable Injuries and Illnesses} \times 200{,}000}{\text{Total Employee Hours Worked}} \]

**(3) Data Source**  
- OSHA Form 300/300A log (recordable cases), payroll (total hours worked).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**STANDARDIZED** (BLS/OSHA) — the 200,000-hour-base formula is the regulatory standard; not subject to organizational variation.

**(6) Authoritative Citation**  
[BLS — How To Compute Your Firm's Incidence Rate (OSHA recordable / DART)](https://www.bls.gov/iif/overview/compute-nonfatal-incidence-rates.htm)

---

### MFG-LBR-07. DART Rate (Days Away, Restricted, or Transferred)

**(1) Definition**  
The DART rate measures the more serious subset of recordable cases — those involving days away from work, job restriction, or transfer — per 100 FTE workers per year. Per BLS, the same 200,000-hour-base formula is used, with the numerator restricted to DART cases (OSHA 300 log Column H + Column I).

**(2) Formula**

\[ \text{DART Rate} = \frac{\text{Number of DART Cases (Column H + Column I)} \times 200{,}000}{\text{Total Employee Hours Worked}} \]

**(3) Data Source**  
- OSHA Form 300 log (Columns H + I), payroll (total hours worked).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | ✓ |

**(5) Standard vs. Variable**  
**STANDARDIZED** (BLS/OSHA) — regulatory-standard formula, same 200,000-hour base as TRIR.

**(6) Authoritative Citation**  
[BLS — How To Compute Your Firm's Incidence Rate (DART = Column H + Column I)](https://www.bls.gov/iif/overview/compute-nonfatal-incidence-rates.htm)

---

## Section VII — Sustainability / ESG Operational KPIs (Manufacturing-Relevant)

Primary definitional authority: **U.S. EPA**, the **GHG Protocol** (Corporate Accounting and Reporting Standard, incl. Scope 2 Guidance), and **ISO 14001** environmental-management-system standard.

---

### MFG-ESG-01. Energy Consumption per Unit Produced

**(1) Definition**  
Energy Intensity measures total energy consumed per unit of output — the core manufacturing energy-efficiency and decarbonization metric, tracked within ISO 14001 environmental performance and EPA ENERGY STAR industrial programs.

**(2) Formula**

\[ \text{Energy per Unit} = \frac{\text{Total Energy Consumed (kWh, MMBtu, GJ)}}{\text{Units Produced}} \]

**(3) Data Source**  
- Utility meters/energy management system, production counts.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ◑ | ✓ | ✓ | ◑ | ◑ |

Most material in energy-intensive process manufacturing (refining, chemicals, metals, glass) and hybrid. Discrete/Job-Shop/ETO partial (energy is a smaller cost/footprint share).

**(5) Standard vs. Variable**  
**VARIABLE** — energy units and the production denominator (units vs. tonnes vs. value-added) vary; EPA/ISO 14001 frame the concept, not a single formula.

**(6) Authoritative Citation**  
[EPA — ENERGY STAR for Industrial Plants (energy intensity)](https://www.energystar.gov/industrial_plants) | [ISO 14001:2015 Environmental management systems](https://www.iso.org/standard/60857.html)

---

### MFG-ESG-02. Water Usage per Unit

**(1) Definition**  
Water Intensity measures freshwater withdrawn/consumed per unit of output — an environmental-performance and operating-cost metric, especially in process manufacturing (food & beverage, chemicals, semiconductors), tracked under ISO 14001 and EPA water-stewardship programs.

**(2) Formula**

\[ \text{Water per Unit} = \frac{\text{Total Water Consumed (gallons, m}^3\text{)}}{\text{Units Produced}} \]

**(3) Data Source**  
- Water meters/EMS, production counts.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ◑ | ✓ | ✓ | — | — |

Defining for process and hybrid (water as a process input). Discrete partial; Job-Shop/ETO not material.

**(5) Standard vs. Variable**  
**VARIABLE** — withdrawal vs. consumption vs. discharge basis varies; EPA/ISO 14001 frame the concept.

**(6) Authoritative Citation**  
[EPA — Water management / industrial water use](https://www.epa.gov/watersense/commercial-buildings) | [ISO 14001:2015 Environmental management systems](https://www.iso.org/standard/60857.html)

---

### MFG-ESG-03. Waste Generated per Unit

**(1) Definition**  
Waste Intensity measures total waste generated (hazardous + non-hazardous) per unit of output — a circular-economy and compliance metric tracked under ISO 14001 and EPA RCRA waste-reporting frameworks; complements scrap rate (MFG-Q-03) with an environmental lens.

**(2) Formula**

\[ \text{Waste per Unit} = \frac{\text{Total Waste Generated (lb, kg, tonnes)}}{\text{Units Produced}} \]

**(3) Data Source**  
- Waste-manifest/EMS records, production counts.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ◑ | ✓ | ✓ | ◑ | ◑ |

**(5) Standard vs. Variable**  
**VARIABLE** — hazardous vs. total waste, diverted vs. landfilled basis varies; EPA RCRA/ISO 14001 frame the concept.

**(6) Authoritative Citation**  
[EPA — Resource Conservation and Recovery Act (RCRA) waste management](https://www.epa.gov/rcra) | [ISO 14001:2015 Environmental management systems](https://www.iso.org/standard/60857.html)

---

### MFG-ESG-04. Carbon Intensity (Scope 1 + 2 per Unit Produced)

**(1) Definition**  
Carbon Intensity measures greenhouse-gas emissions per unit of output, combining Scope 1 (direct emissions from owned/controlled sources, e.g., on-site fuel combustion) and Scope 2 (indirect emissions from purchased electricity, steam, heat, cooling) as defined by the GHG Protocol Corporate Standard and its Scope 2 Guidance. It is the headline manufacturing decarbonization metric.

**(2) Formula**

\[ \text{Carbon Intensity} = \frac{\text{Scope 1 Emissions} + \text{Scope 2 Emissions (tCO}_2\text{e)}}{\text{Units Produced}} \]

**(3) Data Source**  
- Scope 1: fuel/process emissions records × emission factors; Scope 2: purchased-energy invoices × grid/supplier emission factors (location- or market-based per GHG Protocol Scope 2 Guidance); production counts.

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ◑ | ✓ | ✓ | ◑ | ◑ |

Most material in process/hybrid (combustion- and energy-intensive). Discrete/Job-Shop/ETO partial.

**(5) Standard vs. Variable**  
**STANDARDIZED** (GHG Protocol) for Scope 1/2 boundaries and the location- vs. market-based dual reporting of Scope 2; the per-unit denominator (units vs. tonnes vs. revenue) is firm-chosen.

**(6) Authoritative Citation**  
[GHG Protocol — Corporate Standard (Scope 1 & 2, Scope 2 Guidance)](https://ghgprotocol.org/corporate-standard) | [EPA — GHG Reporting Program / emission factors](https://www.epa.gov/ghgreporting)

---

### MFG-ESG-05. Recycling / Reuse Rate

**(1) Definition**  
Recycling/Reuse Rate measures the percentage of waste material diverted from disposal through recycling, reuse, or recovery — a circular-economy performance metric under ISO 14001 and EPA waste-diversion frameworks; "zero-waste-to-landfill" programs target ≥ 90%.

**(2) Formula**

\[ \text{Recycling/Reuse Rate} = \frac{\text{Material Recycled + Reused + Recovered}}{\text{Total Waste Generated}} \times 100 \]

**(3) Data Source**  
- Waste-manifest/EMS records (diverted vs. disposed tonnages).

**(4) Sub-Segment Applicability**

| D | P | H | J | E |
|---|---|---|---|---|
| ✓ | ✓ | ✓ | ◑ | ◑ |

**(5) Standard vs. Variable**  
**VARIABLE** — what counts as "diverted" (recycling vs. waste-to-energy) varies; EPA/ISO 14001 frame the concept.

**(6) Authoritative Citation**  
[EPA — Sustainable Materials Management / recycling measurement](https://www.epa.gov/smm) | [ISO 14001:2015 Environmental management systems](https://www.iso.org/standard/60857.html)

---
## Closing Section — Panel Contract Crosswalk Table (BINDING)

This table is the binding bridge between this source document and the Wave 2 evaluator code (`lib/intelligence/synthetic/industry/manufacturing/variance/`) and panel contract (`lib/dashboard/panels/manufacturing-variance/contract.ts`). Every variance KPI in Section II maps 1-to-1 to a TS contract field. The sub-segment applicability row is repeated for ready reference. **Sign convention:** F = favorable = negative; U = unfavorable = positive.

### Realized Variances (panel root fields)

| KPI ID | Panel Field (TS contract) | Formula (standard) | D | P | H | J | E | Sign tag |
|---|---|---|---|---|---|---|---|---|
| MFG-V-01 | `directMaterialsPriceVariance` | (Actual Price − Standard Price) × Actual Quantity Purchased | ✓ | ✓ | ✓ | ✓ | ◑ | F=neg / U=pos |
| MFG-V-02 | `directMaterialsUsageVariance` | (Actual Quantity Used − Standard Quantity Allowed) × Standard Price | ✓ | ✓ | ✓ | ✓ | ◑ | F=neg / U=pos |
| MFG-V-03 | `directLaborRateVariance` | (Actual Rate − Standard Rate) × Actual Hours Worked | ✓ | ✓ | ✓ | ✓ | ✓ | F=neg / U=pos |
| MFG-V-04 | `directLaborEfficiencyVariance` | (Actual Hours − Standard Hours Allowed) × Standard Rate | ✓ | ◑ | ✓ | ✓ | ✓ | F=neg / U=pos |
| MFG-V-05 | `variableOverheadSpendingVariance` | (Actual VOH Rate − Standard VOH Rate) × Actual Hours | ✓ | ✓ | ✓ | ✓ | ✓ | F=neg / U=pos |
| MFG-V-06 | `variableOverheadEfficiencyVariance` | (Actual Hours − Standard Hours Allowed) × Standard VOH Rate | ✓ | ◑ | ✓ | ✓ | ✓ | F=neg / U=pos |
| MFG-V-07a | `fixedOverheadSpendingVariance` | Actual Fixed Overhead − Budgeted Fixed Overhead | ✓ | ✓ | ✓ | ✓ | ✓ | F=neg / U=pos |
| MFG-V-07b | `fixedOverheadVolumeVariance` | Budgeted FOH − (Standard FOH Rate × Standard Hours Allowed for Actual Output) | ✓ | ✓ | ✓ | ◑ | ◑ | F=neg / U=pos |
| MFG-V-08 | `totalManufacturingCostVariance` | Σ of MFG-V-01 … MFG-V-07b | ✓ | ✓ | ✓ | ✓ | ✓ | F=neg / U=pos |

### Process/Hybrid Decomposition (drill-down within MFG-V-02)

| KPI ID | Decomposes | Formula | D | P | H | J | E |
|---|---|---|---|---|---|---|---|
| MFG-V-09 | DM Usage → Mix | Σ (Actual Mix − Standard Mix) × Total Actual Qty × Standard Price | ◑ | ✓ | ✓ | — | — |
| MFG-V-10 | DM Usage → Yield | (Actual Total Input − Standard Total Input for Output) × Std Wtd-Avg Price | ◑ | ✓ | ✓ | — | — |

### Forecast Variances (`forecastVarianceSection.*`)

| KPI ID | Panel Field | Mirrors | Forecast Input Source | D | P | H | J | E |
|---|---|---|---|---|---|---|---|---|
| MFG-FV-01 | `forecastVarianceSection.directMaterialsPriceVariance` | MFG-V-01 | `demand-forecast` / `sop` | ✓ | ✓ | ✓ | ✓ | ◑ |
| MFG-FV-02 | `forecastVarianceSection.directMaterialsUsageVariance` | MFG-V-02 | `sop` / `demand-forecast` | ✓ | ✓ | ✓ | ✓ | ◑ |
| MFG-FV-03 | `forecastVarianceSection.directLaborRateVariance` | MFG-V-03 | `sop` | ✓ | ✓ | ✓ | ✓ | ✓ |
| MFG-FV-04 | `forecastVarianceSection.directLaborEfficiencyVariance` | MFG-V-04 | `sop` / `demand-forecast` | ✓ | ◑ | ✓ | ✓ | ✓ |
| MFG-FV-05 | `forecastVarianceSection.variableOverheadSpendingVariance` | MFG-V-05 | `sop` | ✓ | ✓ | ✓ | ✓ | ✓ |
| MFG-FV-06 | `forecastVarianceSection.variableOverheadEfficiencyVariance` | MFG-V-06 | `sop` / `demand-forecast` | ✓ | ◑ | ✓ | ✓ | ✓ |
| MFG-FV-07a | `forecastVarianceSection.fixedOverheadSpendingVariance` | MFG-V-07a | `sop` | ✓ | ✓ | ✓ | ✓ | ✓ |
| MFG-FV-07b | `forecastVarianceSection.fixedOverheadVolumeVariance` | MFG-V-07b | `demand-forecast` / `sales-pipeline` | ✓ | ✓ | ✓ | ◑ | ◑ |
| MFG-FV-08 | `forecastVarianceSection.totalManufacturingCostForecastVariance` | MFG-V-08 | (inherits) | ✓ | ✓ | ✓ | ✓ | ✓ |

**Panel metadata fields (non-variance, from the planning-doc contract):** `basisOfStandards: 'budgeted' | 'engineered' | 'historical-rolling'` (per-tenant, no silent default — Section II documents all three); `productionVolumeForPeriod: number`; `unitOfMeasure: 'unit' | 'lb' | 'kg' | 'gallon' | 'meter' | 'sqft' | string`; `reportingBasis: 'US_GAAP' | 'IFRS'` (IFRS routing required where inventory valuation diverges — see Section IV flag); `forecastHorizon: { periodsAhead: number }`.

---

## Appendix A — Standard vs. Variable Summary

| KPI ID | KPI | Primary Authority | Standard / Variable | Note |
|---|---|---|---|---|
| MFG-FIN-01 | DSO | NACM | Variable | gross vs. net sales; simple vs. countback |
| MFG-FIN-02 | Gross Margin | FASB ASC 330 / SEC S-K | Variable | overhead absorption / variance treatment |
| MFG-FIN-03 | Operating Margin | SEC S-K | Variable | operating vs. non-operating classification |
| MFG-FIN-04 | Net Margin | SEC S-X | Standard | net income ÷ revenue |
| MFG-FIN-05 | Mfg Cost % Revenue | FASB ASC 330 | Variable | production vs. sales basis |
| MFG-FIN-06 | Cash Conversion Cycle | NACM | Standard | identity DSO+DIO−DPO |
| MFG-FIN-07 | DIO | FASB ASC 330 / ASCM | Variable | LIFO/FIFO carrying value; averaging |
| MFG-FIN-08 | DPO | NACM | Variable | COGS vs. purchases; supplier finance |
| MFG-FIN-09 | RONA | FASB / managerial | Variable | NI vs. NOPAT; gross vs. net assets |
| MFG-V-01..08 | Cost Variances | IMA / AICPA | Standard | purchased vs. used; capacity denominator (V-07b) |
| MFG-V-09/10 | Mix / Yield | IMA / AICPA | Standard | process-costing extension |
| MFG-FV-01..08 | Forecast Variances | IMA / AICPA | Standard | forecast inputs substitute for actuals |
| MFG-OPS-01..04 | OEE & components | ASCM | Standard | planned-time definition varies |
| MFG-OPS-05 | TEEP | ASCM | Variable | calendar-time denominator |
| MFG-OPS-06/07 | MTBF / MTTR | ASQ | Standard | failure / repair-time definition varies |
| MFG-OPS-08 | Capacity Utilization | Federal Reserve G.17 | Standard | macro standard; internal capacity basis varies |
| MFG-OPS-09 | Throughput | ASCM | Variable | UoM; gross vs. good |
| MFG-OPS-10 | Cycle Time | ASCM | Standard | machine vs. total cycle time |
| MFG-OPS-11 | Takt Time | ASCM / Lean | Standard | available-time convention varies |
| MFG-SC-01..05 | Inventory Turns (all stages) | ASCM SCOR / ASC 330 | Variable | numerator; LIFO/FIFO |
| MFG-SC-06 | Inventory Carrying Cost | ASCM | Variable | component scope; cost of capital |
| MFG-SC-07 | Inventory Accuracy | ASCM | Variable | count tolerance |
| MFG-SC-08 | Supplier OTD | ASCM SCOR | Variable | on-time window |
| MFG-SC-09 | Perfect Order | ASCM SCOR | Standard | multiplicative composite |
| MFG-SC-10 | Order Fulfillment Lead Time | ASCM SCOR | Standard | start/stop events vary |
| MFG-SC-11 | Fill Rate | ASCM SCOR | Variable | unit/line/order fill |
| MFG-Q-01 | First-Pass Yield | ASQ / ISO 9001 | Standard | FPY vs. RTY |
| MFG-Q-02 | Defect Rate (PPM) | ASQ / Six Sigma | Standard | PPM vs. DPMO |
| MFG-Q-03 | Scrap Rate | ASQ / ASC 330 | Variable | unit vs. cost; normal vs. abnormal |
| MFG-Q-04 | Rework Rate | ASQ / ISO 9001 | Variable | rework scope |
| MFG-Q-05 | COPQ | ASQ | Standard | hidden-cost capture varies |
| MFG-Q-06 | Customer Complaint Rate | ISO 9001 / ASQ | Variable | scaling basis |
| MFG-Q-07 | Right-First-Time | ISO 9001 / ASQ | Variable | unit vs. batch/deviation level |
| MFG-Q-08 | Process Capability (Cpk) | ASQ | Standard | min-of-two-ratios standard form |
| MFG-Q-09 | Sigma Level | ASQ / Six Sigma | Standard | 1.5σ shift convention |
| MFG-LBR-01 | Labor Productivity | BLS | Variable | output measure; labor scope |
| MFG-LBR-02 | Direct Labor Efficiency | IMA | Standard | tied to MFG-V-04 |
| MFG-LBR-03 | Labor Cost % Revenue | IMA / BLS | Variable | labor scope/burden |
| MFG-LBR-04 | Overtime Rate | BLS / IMA | Variable | denominator |
| MFG-LBR-05 | Workforce Turnover | BLS JOLTS | Variable | voluntary vs. total |
| MFG-LBR-06 | TRIR (OSHA recordable) | BLS / OSHA | Standard | 200,000-hour-base regulatory standard |
| MFG-LBR-07 | DART Rate | BLS / OSHA | Standard | 200,000-hour-base regulatory standard |
| MFG-ESG-01 | Energy per Unit | EPA / ISO 14001 | Variable | units; denominator |
| MFG-ESG-02 | Water per Unit | EPA / ISO 14001 | Variable | withdrawal vs. consumption |
| MFG-ESG-03 | Waste per Unit | EPA / ISO 14001 | Variable | hazardous vs. total |
| MFG-ESG-04 | Carbon Intensity (S1+S2) | GHG Protocol / EPA | Standard | scope boundaries standardized; denominator varies |
| MFG-ESG-05 | Recycling/Reuse Rate | EPA / ISO 14001 | Variable | diversion definition |

---

## Appendix B — US GAAP vs. IFRS Divergence (Inventory KPIs)

Per the planning doc (resolved Q5), standards reference both U.S. GAAP and IFRS where they differ. The material divergences affecting inventory-related KPIs (MFG-FIN-02, -05, -07; MFG-SC-01..06; MFG-Q-03) are:

| Issue | ASC 330 (US GAAP) | IAS 2 (IFRS) | KPI impact |
|---|---|---|---|
| LIFO cost formula | **Permitted** | **Prohibited** | DIO, inventory turns, gross margin not comparable across bases for LIFO firms |
| Measurement floor | FIFO/weighted-average: **lower of cost and NRV**; LIFO/retail: **lower of cost and market** (replacement cost, NRV ceiling, NRV-less-normal-margin floor) | **Lower of cost and NRV** for all | inventory carrying value and write-down magnitude differ |
| Write-down reversal | **Not permitted** (except FX) | **Permitted/required** up to original cost when NRV recovers | inventory value and gross margin diverge in recovery periods; `reportingBasis: 'IFRS'` must route reversal logic |

Source: [KPMG — Inventory accounting: IFRS Accounting Standards vs US GAAP (Top 10 differences, IAS 2 vs ASC 330)](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html) | [IFRS Foundation — IAS 2 Inventories](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/) | [FASB ASC 330 Inventory — DART](https://dart.deloitte.com/USDART/home/codification/assets/asc330)

---

## Appendix C — Primary Source Index

All citations are to primary authoritative sources. URLs verified as resolving as of the date of document generation (June 22, 2026). Verbatim cited-text verification is recorded in the Citation Verification Register (MFG-K-E, `Manufacturing_KPI_Citation_Verification_Register.xlsx`).

| Source | URL | Coverage |
|--------|-----|----------|
| IMA — SMA / Standard Costing & Variance Analysis (SCVA) | [imanet.org SCVA SMA](https://www.imanet.org/-/media/002311a905634b6a9840236afbb60428.ashx) | All Section II variances (MFG-V / MFG-FV); mix/yield |
| IMA — Statements on Management Accounting / strategic cost management | [imanet.org strategic cost management](https://www.imanet.org/insights-and-trends/strategic-cost-management) | Cost-accounting framework; labor cost/efficiency |
| ASCM — OEE (Supply Chain Dictionary) | [ascm.org OEE](https://www.ascm.org/ascm-insights/OEE-for-production-scheduling/) | OEE, availability, performance, quality, TEEP, throughput, cycle/takt time |
| ASCM — SCOR Digital Standard | [ascm.org SCOR-DS](https://www.ascm.org/corporate-solutions/standards-tools/scor-ds/) | Inventory turns/days, perfect order, OTD, lead time, fill rate |
| ASQ — Process Capability (Cp/Cpk) | [asq.org process capability](https://asq.org/quality-resources/process-capability) | Cpk, FPY, RFT |
| ASQ — Six-Sigma Quality Programs | [asq.org six sigma](https://asq.org/quality-progress/articles/six-sigma-quality-programs?id=f84a5024b2d24bdba36858c647d82d44) | PPM/DPMO, sigma level |
| ASQ — Cost of Quality | [asq.org cost of quality](https://asq.org/quality-resources/cost-of-quality) | COPQ, scrap, rework, external failure |
| ASQ — Reliability | [asq.org reliability](https://asq.org/quality-resources/reliability) | MTBF, MTTR |
| ISO 9001:2015 | [iso.org/standard/62085](https://www.iso.org/standard/62085.html) | Quality management system; FPY, RFT, complaints |
| ISO 14001:2015 | [iso.org/standard/60857](https://www.iso.org/standard/60857.html) | Environmental management; energy/water/waste/recycling |
| FASB ASC 330 Inventory (DART) | [dart.deloitte.com ASC 330](https://dart.deloitte.com/USDART/home/codification/assets/asc330) | Inventory measurement, absorption, idle capacity, abnormal spoilage |
| IFRS Foundation — IAS 2 Inventories | [ifrs.org IAS 2](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/) | IFRS inventory; LIFO prohibition; write-down reversal |
| KPMG — IAS 2 vs ASC 330 | [kpmg.com inventory IFRS vs US GAAP](https://kpmg.com/us/en/articles/2026/inventory-accounting-ifrs-accounting-standards-vs-us-gaap.html) | GAAP/IFRS divergence table |
| SEC Regulation S-K Item 303 (MD&A) | [ecfr.gov S-K 303](https://www.ecfr.gov/current/title-17/chapter-II/part-229/subpart-229.300/section-229.303) | Operating-metric & margin disclosure |
| SEC Regulation S-X | [ecfr.gov Reg S-X](https://www.ecfr.gov/current/title-17/chapter-II/part-210) | Financial-statement form & content |
| Federal Reserve G.17 — Capacity Utilization (about) | [federalreserve.gov g17/about](https://www.federalreserve.gov/releases/g17/about.htm) | Capacity utilization definition |
| Federal Reserve G.17 — current release | [federalreserve.gov g17/current](https://www.federalreserve.gov/releases/g17/current/default.htm) | Manufacturing capacity-utilization benchmark |
| BLS — Producer Price Index | [bls.gov/ppi](https://www.bls.gov/ppi/) | Input/output price deflators; price benchmarks |
| BLS — Incidence Rate (OSHA recordable / DART) | [bls.gov incidence rates](https://www.bls.gov/iif/overview/compute-nonfatal-incidence-rates.htm) | TRIR, DART rate (200,000-hour base) |
| BLS — Productivity | [bls.gov/productivity](https://www.bls.gov/productivity/) | Labor productivity (manufacturing) |
| BLS — JOLTS | [bls.gov/jlt](https://www.bls.gov/jlt/) | Workforce turnover/separations benchmark |
| U.S. Census — Annual Survey of Manufactures (ASM) | [census.gov/programs-surveys/asm](https://www.census.gov/programs-surveys/asm.html) | NAICS 31–33 manufacturing benchmarks |
| U.S. Census — 2022 NAICS Sector 31-33 Manufacturing | [census.gov NAICS 31-33](https://www.census.gov/data/tables/2022/econ/economic-census/naics-sector-31-33.html) | Sub-segment NAICS mapping |
| NACM — Credit Department Performance Metrics | [nacm.org metrics whitepaper](https://nacm.org/pdfs/white-papers/Whitepaper-Metrics-apr23.pdf) | DSO, DPO, CCC credit metrics |
| GHG Protocol — Corporate Standard | [ghgprotocol.org corporate-standard](https://ghgprotocol.org/corporate-standard) | Scope 1 & 2 emissions; carbon intensity |
| EPA — GHG Reporting Program | [epa.gov/ghgreporting](https://www.epa.gov/ghgreporting) | Emission factors; Scope 1/2 reporting |
| EPA — ENERGY STAR Industrial Plants | [energystar.gov/industrial_plants](https://www.energystar.gov/industrial_plants) | Energy intensity |
| EPA — RCRA Waste Management | [epa.gov/rcra](https://www.epa.gov/rcra) | Waste generation/diversion |
| Oracle NetSuite — Manufacturing KPI library (secondary, cross-ref only) | [netsuite.com manufacturing KPIs](https://www.netsuite.com/portal/resource/articles/erp/manufacturing-kpis-metrics.shtml) | Benchmark cross-reference only — never sole citation |

---

*This document is part of the Advisacor Manufacturing Vertical Knowledge Stack (Module MFG-K-A, Wave 1). It is `DRAFT / SPEC — NOT EXECUTABLE — NOT LOCKED`, `executable: false`, `containsVerticalComplianceLogic: true`. All KPI computations generated by Advisacor are classified as `output_classification = 'recommendation_for_human_review'`. No KPI value or benchmark in this document constitutes final financial advice or audit-quality certification. Users must validate formulas against their specific ERP, cost-accounting, and general-ledger configuration — and against their elected reporting basis (US GAAP or IFRS) — before implementation. Section II is the binding contract for the Command Center Manufacturing Variances panel; the panel data path is spine-gated (tenant isolation + RBAC) per the Phase 42.5 universal control spine and is proved by the D0 panel probe (MFG-K-J), not asserted.*
