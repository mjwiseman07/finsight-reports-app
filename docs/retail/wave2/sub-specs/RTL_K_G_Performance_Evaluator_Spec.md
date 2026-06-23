---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: true
phase: Retail Vertical Knowledge Stack — Wave 2 / RTL-K-G
artifact: Performance Evaluator Sub-Spec
locked: false
mode: SPEC AUTHORING — PURE FUNCTIONS; NO SPINE I/O
---

# RTL-K-G — Performance Evaluator Sub-Spec

**Module:** RTL-K-G — Retail Performance Evaluator  
**Baseline:** `d1f73aa` (RTL-K-F panel contract)  
**Authority:** [`Phase_RTL_6_Build_Spec.md`](../Phase_RTL_6_Build_Spec.md) at commit **`2e7f67f`** (§6 PCs 04–11/28–33), [`RTL_K_F_Panel_Contract_Spec.md`](./RTL_K_F_Panel_Contract_Spec.md), [`RTL_K_0_Basis_Contracts_Spec.md`](./RTL_K_0_Basis_Contracts_Spec.md)  
**Wave 1 inputs:** [`Retail_KPIs_Sources.md`](../../wave1/Retail_KPIs_Sources.md) (catalog anchors per K-F §9), [`Retail_ASC606_Sources.md`](../../wave1/Retail_ASC606_Sources.md), [`Retail_Disclosures_Sources.md`](../../wave1/Retail_Disclosures_Sources.md), [`Retail_IFRS_Sources.md`](../../wave1/Retail_IFRS_Sources.md)

**DRAFT / SPEC ONLY — NOT EXECUTABLE** as a deployed panel path. Pure-function evaluator with dual-basis routing compliance logic.

---

## 1. Purpose

Pure-function evaluator that takes retail operating inputs, inventory/revenue basis objects, and period metadata and returns a `RetailPerformancePanelContract`-shaped output.

- No I/O, no spine, no Phase 42 imports
- Deterministic, side-effect free, no thrown exceptions
- Basis routing via `context.reportingBasis`, `context.applicableBasis`, and `basisOf()` only
- Explicit dual-basis branches for all six cross-blend traps plus lease guard

**Path:** `lib/intelligence/synthetic/industry/retail/performance/`

---

## 2. Module layout

**20-file layout:** 18 evaluator modules + `types.ts` + `index.ts` support files (authoritative count per DoD §12 #1).

Directory: `lib/intelligence/synthetic/industry/retail/performance/`

| File | Responsibility |
|---|---|
| `types.ts` | `RetailEvaluatorInputs`, `RetailEvaluatorResult`, error codes |
| `fieldBuilder.ts` | `buildKpiField()` — `basisOfStandards`, sentinel gating, applicability |
| `compSales.ts` | Panel RTL-K-01 / catalog RTL-K-01; fiscal calendar boundaries (PC-33) |
| `trafficAndConversion.ts` | Panel RTL-K-02, RTL-K-03; catalog RTL-K-10, RTL-K-11 |
| `basketMetrics.ts` | Panel RTL-K-04, RTL-K-05; catalog RTL-K-06, RTL-K-07 |
| `marginAndInventory.ts` | Panel RTL-K-06..08; RIM/LIFO routing (PC-29); catalog RTL-K-14, RTL-K-16, RTL-K-24 |
| `merchandising.ts` | Panel RTL-K-09..11; catalog RTL-K-27, RTL-K-34, RTL-K-52 |
| `digitalMetrics.ts` | Panel RTL-K-14..16; catalog RTL-K-09, RTL-K-13, RTL-K-44 |
| `spaceProductivity.ts` | Panel RTL-K-13; catalog RTL-K-03 |
| `attachRate.ts` | Panel RTL-K-12 optional; catalog RTL-K-63 |
| `returnsReserve.ts` | Returns reserve gross presentation (PC-28); ASC 606-10-32-10 / IFRS 15.B20–B27 |
| `giftCardRouting.ts` | Gift card breakage branch (PC-30) |
| `loyaltyRouting.ts` | Loyalty material-right branch (PC-31) |
| `leaseGuard.ts` | Lease observation via `basisOf()` only (PC-22) |
| `storeCguRouting.ts` | Store-CGU impairment branch (PC-32) |
| `fiscalCalendar.ts` | NRF 4-5-4 vs ISO month boundaries (PC-33); implements K-0 §9 helpers |
| `rimRouting.ts` | US GAAP RIM/LCM vs IFRS IAS 2.22 (PC-29) |
| `forecast.ts` | RTL-FV-01..16 mirror block |
| `evaluate.ts` | Top-level orchestrator |
| `index.ts` | Re-exports |

---

## 3. Pure-function contract

All evaluator functions MUST be:

- **Deterministic** — same inputs → same outputs
- **Side-effect free** — no I/O, no `console`, no `Date.now()`, no `Math.random()`
- **Total** — invalid inputs return `RetailEvaluatorResult` error; never `throw`

```typescript
type RetailEvaluatorResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RetailEvaluatorError };

type RetailEvaluatorError =
  | "MISSING_NET_SALES"
  | "MISSING_COMPARABLE_PERIOD"
  | "FISCAL_BOUNDARY_MISMATCH"
  | "IFRS_LIFO_INPUT_REJECTED"
  | "IFRS_RIM_BRANCH_REJECTED"
  | "BASIS_MISMATCH"
  | "GIFT_CARD_ESCHEAT_DOUBLE_COUNT"
  | "RETURNS_NET_PRESENTATION_REJECTED"
  | "LOYALTY_TIER_STATUS_MISROUTED"
  | "STORE_CGU_BASIS_MISROUTED"
  | "LEASE_FRAMEWORK_LITERAL_REJECTED"
  | "SUB_SEGMENT_FIELD_UNAVAILABLE"
  | "MISSING_RETURNS_RESERVE";
```

**Error union:** 13 codes covering six cross-blend traps, basis mismatch, sub-segment, fiscal/comp inputs, and material returns reserve.

---

## 4. Input types

```typescript
import type { RetailPerformancePanelContract } from "../../../../dashboard/panels/retail-performance/contract";
import type {
  RetailPanelContext,
  USGAAPRIMInventory,
  RetailIFRSInventory,
  GiftCardLiability,
  LoyaltyMaterialRight,
  ReturnsReserveUSGAAP,
  ReturnsReserveIFRS,
  StoreImpairmentRouting,
  ComparableStorePeriodPair,
} from "../../contracts/retail/RetailBasisContracts";

export interface RetailEvaluatorInputs {
  context: RetailPanelContext;
  netSalesForPeriod: number;
  comparableStoreCount: number;
  compPeriodPair: ComparableStorePeriodPair;

  /** Basis-discriminated inventory branch */
  inventory:
    | { basis: "US_GAAP"; rim?: USGAAPRIMInventory }
    | { basis: "IFRS"; ifrs: RetailIFRSInventory };

  /** Optional revenue-surface objects for cross-blend routing */
  giftCard?: GiftCardLiability;
  loyalty?: LoyaltyMaterialRight;
  returnsReserve?: ReturnsReserveUSGAAP | ReturnsReserveIFRS;
  storeImpairment?: StoreImpairmentRouting;

  /** Operating numerators/denominators per KPI module */
  operating: RetailOperatingInputs;

  /** Optional forecast block → RTL-FV section */
  forecast?: RetailForecastInputs;
}
```

**Basis rule:** `inputs.context.reportingBasis` and `inputs.context.applicableBasis` must be equal. Evaluator rejects `BASIS_MISMATCH` otherwise. Panel root `reportingBasis` is **output-only** — set from `context.reportingBasis`, never accepted as independent input.

---

## 5. KPI formulas (panel ID → catalog anchor)

Formulas are **verbatim** from [`Retail_KPIs_Sources.md`](../../wave1/Retail_KPIs_Sources.md) catalog rows referenced in K-F §9.

| Panel KPI | Catalog | Formula (normalized) | Module |
|---|---|---|---|
| RTL-K-01 | RTL-K-01 | `(S_c,t − S_c,t−1) / S_c,t−1 × 100` | `compSales.ts` |
| RTL-K-02 | RTL-K-10 | `count(door-counter entries)` | `trafficAndConversion.ts` |
| RTL-K-03 | RTL-K-11 | `(transactions or orders) / (traffic or sessions) × 100` | `trafficAndConversion.ts` |
| RTL-K-04 | RTL-K-06 | `total revenue / number of orders` | `basketMetrics.ts` |
| RTL-K-05 | RTL-K-07 | `total units sold / number of transactions` | `basketMetrics.ts` |
| RTL-K-06 | RTL-K-14 | `(net sales − COGS) / net sales × 100` | `marginAndInventory.ts` |
| RTL-K-07 | RTL-K-16 | `gross margin $ / average inventory at cost` | `marginAndInventory.ts` |
| RTL-K-08 | RTL-K-24 | `COGS / average inventory at cost` | `marginAndInventory.ts` |
| RTL-K-09 | RTL-K-27 | `(units sold / units received) × 100` | `merchandising.ts` |
| RTL-K-10 | RTL-K-34 | `(book inventory − physical inventory) / net sales × 100` | `merchandising.ts` |
| RTL-K-11 | RTL-K-52 | `returned merchandise / gross sales × 100` | `merchandising.ts` + `returnsReserve.ts` |
| RTL-K-12 | RTL-K-63 | `incremental in-store purchases / total pickups × 100` | `attachRate.ts` |
| RTL-K-13 | RTL-K-03 | `net sales / selling area (sq ft)` | `spaceProductivity.ts` |
| RTL-K-14 | RTL-K-09 | `count(distinct sessions)` | `digitalMetrics.ts` |
| RTL-K-15 | RTL-K-13 | `(1 − completed purchases / carts created) × 100` | `digitalMetrics.ts` |
| RTL-K-16 | RTL-K-44 | `total S&M spend / new customers acquired` | `digitalMetrics.ts` |

**Forecast block (RTL-FV-01..16):** identical formulas with forecast inputs substituted (`forecast.ts`).

---

## 6. Dual-basis branching (compliance-critical)

### 6.0 — Optional cross-blend input absence contract

Inputs `giftCard?`, `loyalty?`, `returnsReserve?`, and `storeImpairment?` are optional at the TypeScript level but carry HIGH-priority PC bindings (PC-28/30/31/32). **Vacuous PASS is prohibited.**

**Pattern A — optional-with-decision (gift card, loyalty, store-CGU):** When the corresponding input object is **absent**, the routing module returns `{ ok: true, value: null }` (no compliance assertion exercised). RTL-K-I records per-case objects as:

| Input state | `decision` | `expected` | `outcome` | Meaning |
|---|---|---|---|---|
| Absent | `DENY` | `DENY` | `PASS` | Assertion correctly **not** fired |
| Present, routing OK | `ALLOW` | `ALLOW` | `PASS` | Assertion exercised and passed |
| Present, routing FAIL | `ALLOW` or `DENY` | per spec | `FAIL` | Assertion exercised and failed |

Recording `ALLOW` / `ALLOW` / `PASS` when the input was never provided is a verifier FAIL (vacuous PASS).

**Pattern B — materiality gate (returns reserve):** When panel `returnsRate` (RTL-K-11) is **non-zero** (computed amount `> 0` after merchandising module), `returnsReserve` is **required**. Absence → evaluator error `MISSING_RETURNS_RESERVE` (evaluate returns `{ ok: false }`). When `returnsRate` is zero or sentinel-only for the active sub-segment, `returnsReserve` absence is permitted and Pattern A applies at the K-I layer (`DENY`/`DENY`/`PASS`).

### 6.1 — RIM / LIFO (PC-29) — `rimRouting.ts`

| Branch | Condition | Behavior |
|---|---|---|
| US GAAP | `context.reportingBasis === 'US_GAAP'` | Allow `USGAAPRIMInventory` with `measurementBase: 'lower_of_cost_or_market'` per ASC 330-10-30-13 |
| IFRS | `context.reportingBasis === 'IFRS'` | **Reject** `USGAAPRIMInventory`; use `RetailIFRSInventory` / IAS 2.22 retail-method convenience only |
| Error | LIFO layers on IFRS branch | `IFRS_LIFO_INPUT_REJECTED` |

**IFRS divergence:** US GAAP RIM compares to market (LCM); IFRS retail method feeds lower of cost and NRV (IAS 2.22; KPMG IFRS vs US GAAP inventory).

### 6.2 — Gift card breakage (PC-30) — `giftCardRouting.ts`

| Branch | Type | Behavior |
|---|---|---|
| US GAAP | `USGAAPGiftCardLiability` | Breakage net of `escheatOverlay` (ASC 606-10-55-49); error `GIFT_CARD_ESCHEAT_DOUBLE_COUNT` if escheat not netted |
| IFRS | `IFRSGiftCardLiability` | IFRS 15.B44–B47 expected-breakage; **no** escheat overlay field |

**Absence (Pattern A):** `giftCard` absent → `{ ok: true, value: null }`; K-I PC-30 records `DENY`/`DENY`/`PASS`.

### 6.3 — Loyalty material right (PC-31) — `loyaltyRouting.ts`

| Branch | Behavior |
|---|---|
| Shared computation | `LoyaltyMaterialRightCore` SSP allocation |
| Basis | `USGAAPMaterialRight` vs `IFRSMaterialRight` — disclosure citation differs; recognition logic converged |
| TRAP B guard | `TIER_STATUS` must not route to accumulating `POINTS` deferral path — error `LOYALTY_TIER_STATUS_MISROUTED` |

**Absence (Pattern A):** `loyalty` absent → `{ ok: true, value: null }`; K-I PC-31 records `DENY`/`DENY`/`PASS`.

### 6.4 — Returns reserve (PC-28) — `returnsReserve.ts`

| Branch | Behavior |
|---|---|
| US GAAP | `USGAAPRefundLiability` + `USGAAPReturnAsset` — **gross**; cite ASC 606-10-32-10 |
| IFRS | `IFRSRefundLiability` + `IFRSReturnAsset` — **gross**; IFRS 15.B25 |
| Prohibited | Netting refund liability and return asset — error `RETURNS_NET_PRESENTATION_REJECTED` |

Panel `returnsRate` (RTL-K-11) uses operational return rate formula; `returnsReserve.ts` validates gross balance routing for accounting cross-blend.

**Absence (Pattern B):** `returnsRate > 0` and `returnsReserve` absent → `{ ok: false, error: 'MISSING_RETURNS_RESERVE' }`. `returnsRate` zero/sentinel and `returnsReserve` absent → `{ ok: true, value: null }`; K-I PC-28 records `DENY`/`DENY`/`PASS`.

### 6.5 — Lease guard (PC-22) — `leaseGuard.ts`

```typescript
import { basisOf } from "../../../standards/contracts/ReportingBasis";

const basis = basisOf(reportingFramework);
if (basis === "US_GAAP") {
  // ASC 842 operating/finance branch
} else {
  // IFRS 16 single lessee model
}
```

Direct `StandardsReportingFramework` literal compares prohibited — error `LEASE_FRAMEWORK_LITERAL_REJECTED`.

### 6.6 — Store-CGU impairment (PC-32) — `storeCguRouting.ts`

| Branch | Type | Trigger |
|---|---|---|
| IFRS | `IFRSStoreCGU` | **Only** when `basisOf() === 'IFRS'` / `context.reportingBasis === 'IFRS'` |
| US GAAP | `ASC360StoreImpairment` | **Only** on US_GAAP path — undiscounted cash flow held-and-used (ASC 360) |
| Error | Cross-branch reach | `STORE_CGU_BASIS_MISROUTED` |

**IFRS divergence:** IAS 36.124 — reversal permitted for store CGU (non-goodwill); ASC 360 — no reversal.

**Absence (Pattern A):** `storeImpairment` absent → `{ ok: true, value: null }`; K-I PC-32 records `DENY`/`DENY`/`PASS`.

### 6.7 — Fiscal calendar (PC-33) — `fiscalCalendar.ts`

Implements K-0 routing helpers:

| `fiscalCalendar` | `boundaryKind` | Engine |
|---|---|---|
| `'4-5-4'` | `NRF_454_WEEK` | NRF week boundaries — nrf.com/resources/4-5-4-calendar |
| `'calendar'` | `ISO_CALENDAR_MONTH` | ISO month boundaries |

`assertComparableStoreBoundaryMatch(compPeriodPair)` runs before RTL-K-01 comp sales. Mismatched `boundaryKind` between current and prior → `FISCAL_BOUNDARY_MISMATCH`.

---

## 7. Sub-segment gating (K-F §5 sentinel contract)

`fieldBuilder.ts` implements sentinel pattern:

```typescript
export function buildKpiField(
  context: RetailPanelContext,
  spec: RetailKpiFieldSpec,
): RetailKpiField {
  const applicable = spec.applicableSubSegments.includes(context.subSegment);
  return {
    id: spec.id,
    label: spec.label,
    basisOfStandards: spec.basisOfStandards,
    applicableSubSegments: spec.applicableSubSegments,
    value: applicable
      ? spec.computeValue()
      : { amount: 0, unitOfMeasure: spec.unit, signConvention: spec.signConvention },
  };
}
```

All 16 fields always present on output contract; display filters on `applicableSubSegments`.

---

## 8. Basis routing (general)

- Authoritative basis: `context.reportingBasis` from `RetailPanelContext`
- `context.applicableBasis` must equal `context.reportingBasis` (PC-26)
- Branch via `basisOf()` / `context.reportingBasis` only — no `StandardsReportingFramework` literal compares
- COGS / inventory denominators on IFRS branch exclude LIFO reserve and RIM-LIFO layers

---

## 9. IFRS divergence (evaluator modules)

| Module | US GAAP | IFRS | Paragraph anchors |
|---|---|---|---|
| `rimRouting.ts` | RIM/LCM (ASC 330-10-30-13) | IAS 2.22 retail method → NRV | ASC 330-10-30-13; IAS 2.22 |
| `marginAndInventory.ts` | COGS may include LIFO liquidation | LIFO prohibited; NRV reversal (IAS 2.33) | IAS 2.25, IAS 2.33 |
| `returnsReserve.ts` | ASC 606-10-32-10 variable consideration | IFRS 15.B20–B27 refund liability | ASC 606-10-32-10; IFRS 15.B25 |
| `giftCardRouting.ts` | ASC 606-10-55-46..49 + escheat | IFRS 15.B44–B47 | ASC 606-10-55-49 |
| `loyaltyRouting.ts` | ASC 606-10-55-42..45 | IFRS 15.B39–B43 | ASC 606-10-55-42 |
| `leaseGuard.ts` | ASC 842 dual model | IFRS 16 single model | ASC 842; IFRS 16 |
| `storeCguRouting.ts` | ASC 360 — no reversal | IAS 36.124 — reversal permitted | IAS 36.124 |
| `fiscalCalendar.ts` | Operational (basis-neutral) | Operational (basis-neutral) | NRF 4-5-4 calendar |

---

## 10. Forecast variance section

`evaluate.ts` produces `forecastVarianceSection` when `forecast` block present on inputs. Formulas mirror realized KPIs per §5 with forecast numerators substituted. Same dual-basis branches apply to forecast inventory/revenue objects.

---

## 11. CHK-RTL mapping

| Evaluator function / module | PC ID | Reason slug (on FAIL) |
|---|---|---|
| `compSales` formula | CHK-RTL-PC-04 | `formula_rtl_k01` |
| `conversionRate` formula | CHK-RTL-PC-05 | `formula_rtl_k03` |
| `grossMarginPercent` formula | CHK-RTL-PC-06 | `formula_rtl_k06` |
| `grossMarginROI` formula | CHK-RTL-PC-07 | `formula_rtl_k07` |
| `inventoryTurnover` formula | CHK-RTL-PC-08 | `formula_rtl_k08` |
| `shrinkRate` formula | CHK-RTL-PC-09 | `formula_rtl_k10` |
| `averageOrderValue` formula | CHK-RTL-PC-10 | `formula_rtl_k04` |
| forecast `compSales` | CHK-RTL-PC-11 | `formula_rtl_fv01` |
| `returnsReserve` gross routing | CHK-RTL-PC-28 | `asc606_returns_reserve` |
| `rimRouting` | CHK-RTL-PC-29 | `rim_us_gaap_only` |
| `giftCardRouting` | CHK-RTL-PC-30 | `gift_card_basis_routed` |
| `loyaltyRouting` | CHK-RTL-PC-31 | `loyalty_basis_routed` |
| `storeCguRouting` | CHK-RTL-PC-32 | `store_cgu_basis_routed` |
| `fiscalCalendar` | CHK-RTL-PC-33 | `fiscal_calendar_routed` |
| `leaseGuard` | CHK-RTL-PC-22 | `lease_basis_routed` |

**K-I absence discrimination:** For PC-28/30/31/32, verifier reads evaluator routing metadata (or replays with fixture inputs) to assert `decision`/`expected` pairs per §6.0 — never `ALLOW`/`ALLOW`/`PASS` on absent optional inputs.

---

## 12. Definition of done (RTL-K-G sub-spec → build)

| # | Criterion |
|---|---|
| 1 | All modules in §2 exist under `lib/intelligence/synthetic/industry/retail/performance/` |
| 2 | `evaluate()` returns `RetailPerformancePanelContract` shape |
| 3 | All seven dual-basis branches in §6 implemented |
| 4 | No spine I/O, no Phase 42 imports, no thrown exceptions |
| 5 | Sentinel sub-segment gating per K-F §5 |
| 6 | `npx tsc --noEmit` clean after build |

---

## 13. Non-goals

- No spine composition (RTL-K-H)
- No Command Center surface emission (RTL-K-H)
- No Supabase reads
- No `panels/registry.ts`
- No Phase 42 healthcare imports
- No cannabis / firearms overlay code
- No verifier / D0 (RTL-K-I)

---

**END — RTL-K-G Performance Evaluator Sub-Spec (founder-approved)**
