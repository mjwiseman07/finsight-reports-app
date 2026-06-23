---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: true
phase: Retail Vertical Knowledge Stack — Wave 2 / RTL-K-F
artifact: Panel Field Contract Sub-Spec
locked: false
mode: SPEC AUTHORING — SHAPE-ONLY CONTRACT; NO RUNTIME LOGIC
---

# RTL-K-F — Panel Field Contract Sub-Spec

**Module:** RTL-K-F — Retail Performance Panel Field Contract  
**Baseline:** `f6758df` (RTL-K-0 `RetailPanelContext` + `applicableBasis` alias)  
**Authority:** [`Phase_RTL_6_Build_Spec.md`](../Phase_RTL_6_Build_Spec.md) at commit **`2e7f67f`** (§8 RTL-K-F summary), [`RTL_K_0_Basis_Contracts_Spec.md`](./RTL_K_0_Basis_Contracts_Spec.md)  
**Wave 1 inputs:** [`Retail_Vertical_Planning_Doc.md`](../../wave1/Retail_Vertical_Planning_Doc.md) §4, [`Retail_KPIs_Sources.md`](../../wave1/Retail_KPIs_Sources.md)

**DRAFT / SPEC ONLY — NOT EXECUTABLE.** Shape-only panel field contract for the Retail Performance Panel (operations + merchandising combined).

---

## 1. Purpose

Define the typed, shape-only contract at:

**Path:** `lib/dashboard/panels/retail-performance/contract.ts`

**In scope:** field names, units, sign convention, read signature, sub-segment applicability metadata (`B` | `E` | `O` | `G` | `S`), forecast section shape, PC-26 `applicableBasis` exposure via `RetailPanelContext`.

**Out of scope:** KPI math (RTL-K-G), spine composition (RTL-K-H), verifier (RTL-K-I), runtime functions, drill-down evidence resolution.

---

## 2. Read signature

Wave 2 binds at **company level** (entity schema deferred to Wave 3).

```
(companyId: string, accountingPeriod: string, context: RetailPanelContext)
```

| Param | Type | Source |
|---|---|---|
| `companyId` | `string` | Company-level panel read (Wave 2) |
| `accountingPeriod` | `string` | Fiscal period key (`YYYY-MM`, NRF 4-5-4 period id, or firm-defined) |
| `context` | `RetailPanelContext` | Basis + sub-segment + fiscal calendar from RTL-K-0 |

`RetailPanelContext` is imported from [`RetailBasisContracts.ts`](../../../lib/intelligence/synthetic/industry/contracts/retail/RetailBasisContracts.ts).

**PC-26:** `context.applicableBasis` must be present and equal to `context.reportingBasis` on every panel read (RTL-K-0 invariant).

---

## 3. Sign convention and value types

Retail KPIs are predominantly **percentages, ratios, counts, and rates** — not IMA dollar variances. Dollar-forecast deltas (RTL-FV section) reuse the manufacturing F/U convention where applicable.

```typescript
import type {
  RetailPanelContext,
  RetailSubSegment,
} from "../../../intelligence/synthetic/industry/contracts/retail/RetailBasisContracts";
import type { ReportingBasis } from "../../../intelligence/synthetic/standards/contracts/ReportingBasis";

/** Higher-better / lower-better / target-band per Retail_KPIs_Sources.md sign tags. */
export type RetailKpiSignConvention = "higher-better" | "lower-better" | "target-band";

export interface RetailKpiValue {
  amount: number;
  unitOfMeasure: "%" | "USD" | "ratio" | "count" | "USD_per_sqft" | string;
  signConvention: RetailKpiSignConvention;
}

export interface RetailKpiField {
  id: string; // RTL-K-NN or RTL-FV-NN
  label: string;
  value: RetailKpiValue;
  basisOfStandards: string; // verbatim from Retail_KPIs_Sources.md
  applicableSubSegments: RetailSubSegment[];
}

/** Dollar forecast variance — F/U only in forecast section optional fields. */
export type RetailForecastSignTag = "F" | "U";

export interface RetailSignedDollarDelta {
  amountUsd: number;
  signTag: RetailForecastSignTag;
}
```

**Dollar variance rule (forecast only):** F = favorable negative; U = unfavorable positive — same as manufacturing where RTL-FV fields express period-over-period dollar deltas.

---

## 4. Root contract shape

Root export: `RetailPerformancePanelContract`.

```typescript
export interface RetailPerformancePanelReadParams {
  companyId: string;
  accountingPeriod: string;
  context: RetailPanelContext;
}

export interface RetailPerformancePanelContract {
  companyId: string;
  accountingPeriod: string;
  context: RetailPanelContext;

  /** Denormalized from context — must match context.reportingBasis and context.applicableBasis */
  reportingBasis: ReportingBasis;

  netSalesForPeriod: number;
  unitOfMeasure: "USD";
  comparableStoreCount: number;
  fiscalCalendar: RetailPanelContext["fiscalCalendar"];

  /** RTL-K-01..16 realized fields */
  sameStoreSalesGrowth: RetailKpiField;
  trafficCount: RetailKpiField;
  conversionRate: RetailKpiField;
  averageOrderValue: RetailKpiField;
  unitsPerTransaction: RetailKpiField;
  grossMarginPercent: RetailKpiField;
  grossMarginROI: RetailKpiField;
  inventoryTurnover: RetailKpiField;
  sellThroughRate: RetailKpiField;
  shrinkRate: RetailKpiField;
  returnsRate: RetailKpiField;
  attachRate?: RetailKpiField;
  salesPerSquareFoot: RetailKpiField;
  onlineSessions: RetailKpiField;
  cartAbandonmentRate: RetailKpiField;
  digitalCAC: RetailKpiField;

  forecastVarianceSection?: RetailForecastVarianceSection;
}
```

---

## 5. Realized KPI fields (RTL-K-01..16)

Applicability: **●** primary | **◑** drill-down | **—** not applicable. **No blank cells.**

| KPI ID | Contract field | Label | B | E | O | G | S |
|---|---|---|---|---|---|---|---|
| RTL-K-01 | `sameStoreSalesGrowth` | Comparable / Same-Store Sales Growth | ● | ◑ | ● | ● | ● |
| RTL-K-02 | `trafficCount` | Store Traffic Count | ● | — | ● | ◑ | ● |
| RTL-K-03 | `conversionRate` | Conversion Rate | ● | ● | ● | ● | ● |
| RTL-K-04 | `averageOrderValue` | Average Order Value (AOV) | ● | ● | ● | ● | ● |
| RTL-K-05 | `unitsPerTransaction` | Units per Transaction (UPT) | ● | ● | ● | ● | ● |
| RTL-K-06 | `grossMarginPercent` | Gross Margin % | ● | ● | ● | ● | ● |
| RTL-K-07 | `grossMarginROI` | GMROI | ● | ● | ● | ● | ● |
| RTL-K-08 | `inventoryTurnover` | Inventory Turnover | ● | ● | ● | ● | ● |
| RTL-K-09 | `sellThroughRate` | Sell-Through Rate | ● | — | ● | ◑ | ● |
| RTL-K-10 | `shrinkRate` | Shrink Rate (% of Net Sales) | ● | ◑ | ● | ● | ● |
| RTL-K-11 | `returnsRate` | Returns Rate | ● | ● | ● | ◑ | ● |
| RTL-K-12 | `attachRate?` | Attach Rate (drill-down) | ◑ | ◑ | ◑ | ◑ | ◑ |
| RTL-K-13 | `salesPerSquareFoot` | Sales per Square Foot | ● | — | ● | ● | ● |
| RTL-K-14 | `onlineSessions` | Online Sessions | — | ● | ● | — | ◑ |
| RTL-K-15 | `cartAbandonmentRate` | Cart Abandonment Rate | — | ● | ● | — | — |
| RTL-K-16 | `digitalCAC` | Digital Customer Acquisition Cost | — | ● | ● | — | ◑ |

**Sub-segment gating (type vs display):** All 16 realized fields remain **required** on `RetailPerformancePanelContract` (optional `attachRate` only). Display eligibility is determined at runtime:

1. Consumers check `field.applicableSubSegments.includes(context.subSegment)` before rendering.
2. Fields not applicable to the active sub-segment carry a **sentinel** `RetailKpiValue` — e.g. `{ amount: 0, unitOfMeasure: field.value.unitOfMeasure, signConvention: field.value.signConvention }` — with full `applicableSubSegments` metadata preserved on the `RetailKpiField`.
3. The display layer filters on `applicableSubSegments`; it does **not** omit keys from the contract object.

Optional `attachRate` follows the same sentinel pattern when drill-down is not requested.

**E-com note (RTL-K-01):** Pure-play `E` uses digital comparable-sales methodology (◑); comp methodology must respect `context.fiscalCalendar` and `context.comparableStorePolicy` (RTL-K-0).

---

## 6. Forecast variance section (`forecastVarianceSection?`)

Optional mirror of realized KPIs. Typed as `RetailForecastVarianceSection`.

```typescript
export type RetailForecastInputSource =
  | "demand-forecast"
  | "open-to-buy"
  | "merchandise-plan"
  | "sop"
  | string;

export interface RetailForecastVarianceSection {
  forecastHorizon: { periodsAhead: number };
  forecastInputSource: RetailForecastInputSource;

  /** RTL-FV-01 — mirrors RTL-K-01 */
  sameStoreSalesGrowth: RetailKpiField;
  /** RTL-FV-02 */
  trafficCount: RetailKpiField;
  /** RTL-FV-03 */
  conversionRate: RetailKpiField;
  /** RTL-FV-04 */
  averageOrderValue: RetailKpiField;
  /** RTL-FV-05 */
  unitsPerTransaction: RetailKpiField;
  /** RTL-FV-06 */
  grossMarginPercent: RetailKpiField;
  /** RTL-FV-07 */
  grossMarginROI: RetailKpiField;
  /** RTL-FV-08 */
  inventoryTurnover: RetailKpiField;
  /** RTL-FV-09 */
  sellThroughRate: RetailKpiField;
  /** RTL-FV-10 */
  shrinkRate: RetailKpiField;
  /** RTL-FV-11 */
  returnsRate: RetailKpiField;
  /** RTL-FV-12 */
  attachRate?: RetailKpiField;
  /** RTL-FV-13 */
  salesPerSquareFoot: RetailKpiField;
  /** RTL-FV-14 */
  onlineSessions: RetailKpiField;
  /** RTL-FV-15 */
  cartAbandonmentRate: RetailKpiField;
  /** RTL-FV-16 */
  digitalCAC: RetailKpiField;
}
```

Forecast formulas mirror realized KPIs with forecast inputs substituted (RTL-K-G implements; same sub-segment gating as §5).

---

## 7. Panel metadata

| Field | Type | Notes |
|---|---|---|
| `netSalesForPeriod` | `number` | Replaces manufacturing `productionVolumeForPeriod`; denominator for rate KPIs |
| `unitOfMeasure` | `'USD'` | Retail panel is dollar-denominated (planning doc §4) |
| `reportingBasis` | `ReportingBasis` | Denormalized; must equal `context.reportingBasis` and `context.applicableBasis` |
| `comparableStoreCount` | `number` | Stores in comp base for RTL-K-01 |
| `fiscalCalendar` | `RetailFiscalCalendar` | Copied from context; drives period boundary display |

---

## 8. CHK-RTL field mapping (verifier binding)

| PC case | KPI ID | Contract field |
|---|---|---|
| CHK-RTL-PC-01 | RTL-K-01 | `sameStoreSalesGrowth` |
| CHK-RTL-PC-02 | RTL-K-16 | `digitalCAC` |
| CHK-RTL-PC-03 | RTL-FV-01 | `forecastVarianceSection.sameStoreSalesGrowth` |
| CHK-RTL-PC-25 | — | `context` (`RetailPanelContext`) |
| CHK-RTL-PC-26 | — | `context.applicableBasis` |

---

## 9. Authoritative citations (`basisOfStandards` per field)

Each `RetailKpiField.basisOfStandards` carries **verbatim** text from the **`basisOfStandards:`** line of the mapped catalog row in [`Retail_KPIs_Sources.md`](../../wave1/Retail_KPIs_Sources.md) (Wave 1 lock `1531c38`).

**Dual namespace (critical):** Panel KPI IDs (`RTL-K-01`..`16` in §5) are a **curated 16-field panel subset**. They do **not** align 1:1 with catalog sequence IDs in the 71-KPI Wave 1 catalog. Verifier citation drift checks resolve `basisOfStandards` via the **Catalog Row Anchor** column below — not via panel ID alone.

| Panel KPI | Contract field | Catalog Row Anchor | Catalog canonical name (verification) | `basisOfStandards` (verbatim from catalog row) |
|---|---|---|---|---|
| RTL-K-01 | `sameStoreSalesGrowth` | RTL-K-01 | Comparable / Same-Store Sales | `NRF comparable-period basis (4-5-4 calendar); comparable-store base requires 12–13 full months of operation (13 months for month-on-month reporting); non-GAAP, company-defined. Sources: nrf.com/resources/4-5-4-calendar.` |
| RTL-K-02 | `trafficCount` | RTL-K-10 | Traffic Count (Store) | `Count of door-counter shopper entries in period (staff excluded). Source: ICSC shopping-center productivity benchmarks.` |
| RTL-K-03 | `conversionRate` | RTL-K-11 | Conversion Rate | `Conversion = (Transactions or Orders) ÷ (Traffic or Sessions) × 100; store and digital conversion are not directly comparable. Source: ICSC; klipfolio.com.` |
| RTL-K-04 | `averageOrderValue` | RTL-K-06 | Average Order Value (AOV) | `AOV = Total Revenue ÷ Number of Orders. Source: shopify.com/blog/average-order-value; klipfolio.com.` |
| RTL-K-05 | `unitsPerTransaction` | RTL-K-07 | Units per Transaction (UPT) | `UPT = Total Units Sold ÷ Number of Transactions; ICSC ticket/basket productivity benchmark. Source: icsc.com America's Marketplace.` |
| RTL-K-06 | `grossMarginPercent` | RTL-K-14 | Gross Margin % | `Gross Margin % = (Net Sales − COGS) ÷ Net Sales × 100; COGS composition governed by FASB ASC 330. Source: dart.deloitte.com ASC 330.` |
| RTL-K-07 | `grossMarginROI` | RTL-K-16 | GMROI | `GMROI = Gross Margin $ ÷ Average Inventory at Cost; >1.0 profitable, ~3.2 strong. Source: investopedia.com/terms/g/gmroi.asp; shopify.com/retail/gmroi.` |
| RTL-K-08 | `inventoryTurnover` | RTL-K-24 | Inventory Turnover | `Inventory Turnover = COGS ÷ Average Inventory at Cost. Source: investopedia.com/terms/g/gmroi.asp; Umbrex GMROI methodology.` |
| RTL-K-09 | `sellThroughRate` | RTL-K-27 | Sell-Through Rate | `Sell-through rate (%) = (Units Sold ÷ Units Received) × 100. Source: ismworld.org Monthly Metric; lightspeedhq.com/blog/sell-through-rate.` |
| RTL-K-10 | `shrinkRate` | RTL-K-34 | Shrink Rate (% of Net Sales) | `Shrink Rate = (Book Inventory − Physical Inventory) ÷ Net Sales × 100; NRF National Retail Security Survey benchmark. Source: nrf.com/blog/reality-retail-shrink; nrf.com/research/national-retail-security-survey-2023.` |
| RTL-K-11 | `returnsRate` | RTL-K-52 | Returns Rate (% of Gross Sales) | `Return Rate = Returned Merchandise $ (or units) ÷ Gross Sales $ (or units) × 100; NRF/Happy Returns benchmark ~15.8–16.9% overall. Source: nrf.com/research/2025-retail-returns-landscape.` |
| RTL-K-12 | `attachRate` | RTL-K-63 | Click-and-Collect Attach Rate | `Attach Rate = Pickups with Incremental In-Store Purchase ÷ Total Pickups × 100. Source: tulip.com BOPIS; ibm.com/think/topics/bopis-retail.` |
| RTL-K-13 | `salesPerSquareFoot` | RTL-K-03 | Sales per Square Foot | `ICSC sales-dollars-per-square-foot productivity metric, measured on Retail Net Leasable Area. Source: icsc.com (2018 leasing course materials; classification standard).` |
| RTL-K-14 | `onlineSessions` | RTL-K-09 | Sessions (Digital Traffic) | `Count of distinct site/app sessions in period; session timeout/cross-device rules are platform-defined. Source: klipfolio.com e-commerce KPI library.` |
| RTL-K-15 | `cartAbandonmentRate` | RTL-K-13 | Cart Abandonment Rate | `Abandonment = (1 − Completed Purchases ÷ Carts Created) × 100. Source: klipfolio.com e-commerce KPI library.` |
| RTL-K-16 | `digitalCAC` | RTL-K-44 | Customer Acquisition Cost (CAC) | `CAC = Total Sales & Marketing Spend ÷ New Customers Acquired (all S&M, not just media). Source: bdc.ca CLV/CAC; wallstreetprep.com LTV/CAC.` |

**Re-verification notes (founder review):**

- Panel `RTL-K-13` → catalog **RTL-K-03** (*Sales per Square Foot*) — correct. Catalog RTL-K-01 is same-store sales; RTL-K-03 is square-foot productivity.
- Panel `RTL-K-14` → catalog **RTL-K-09** (*Sessions / Digital Traffic*) — correct. Catalog RTL-K-27 is sell-through; sell-through is panel `RTL-K-09` → catalog RTL-K-27.

RTL-FV-01..16 mirror the same catalog anchor and verbatim `basisOfStandards` as their realized panel counterpart.

---

## 10. IFRS divergence (accounting-touched KPI fields)

| Field | US GAAP citation emphasis | IFRS divergence | Panel behavior |
|---|---|---|---|
| `grossMarginPercent` | FASB ASC 330 — COGS composition | IAS 2 — LIFO prohibited; NRV reversal required | `basisOfStandards` text unchanged; K-G routes COGS via `RetailBasisContracts` |
| `grossMarginROI` | ASC 330 average inventory at cost | IAS 2 — no LIFO reserve adjustment | IFRS branch excludes `lifoReserve` from denominator |
| `inventoryTurnover` | ASC 330 COGS ÷ average inventory | IAS 2 cost formula enum | Same formula; basis routing in K-G |
| `shrinkRate` | ASC 330 book-to-physical | IAS 2.34 expense recognition | Disclosure citation differs by basis |
| `returnsRate` | ASC 606-10-32-10 variable consideration | IFRS 15.B20–B27 refund liability | Gross presentation both branches (K-0 TRAP C) |
| `sameStoreSalesGrowth` | NRF non-GAAP comp convention | Operational metric — basis-neutral | `fiscalCalendar` drives boundary engine (K-0 §6.6) |

---

## 11. Sub-segment matrix — full panel (16 × 5, zero blanks)

See §5 table. Verifier PC-14 checks Wave 1 KPI doc matrices for RTL-K-01..16 catalog rows; per-cell value assertions deferred to RTL-K-J.

---

## 12. Definition of done (RTL-K-F sub-spec → build)

| # | Criterion |
|---|---|
| 1 | `contract.ts` exists at path in §1 |
| 2 | All 16 realized fields + 16 forecast fields typed |
| 3 | `RetailPanelContext` imported from K-0; no local redefinition |
| 4 | `applicableBasis` accessible via `context` for PC-26 |
| 5 | Sub-segment applicability metadata on every `RetailKpiField`; sentinel gating per §5 |
| 6 | No runtime functions in `contract.ts` |
| 7 | `npx tsc --noEmit` clean after interfaces land |

---

## 13. Non-goals

- No evaluator logic (RTL-K-G)
- No spine composition (RTL-K-H)
- No Phase 42 healthcare imports
- No `panels/registry.ts`
- No redefinition of `ReportingBasis`, `basisOf()`, or `RetailPanelContext`

---

**END — RTL-K-F Panel Field Contract Sub-Spec (founder-approved)**
