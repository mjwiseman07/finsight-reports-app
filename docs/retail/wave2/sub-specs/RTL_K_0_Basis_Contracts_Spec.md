---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: true
phase: Retail Vertical Knowledge Stack — Wave 2 / RTL-K-0
artifact: Basis Contracts Sub-Spec
locked: false
mode: SPEC AUTHORING — TYPE CONTRACTS ONLY; NO RUNTIME LOGIC
---

# RTL-K-0 — Basis Contracts Sub-Spec

**Module:** RTL-K-0 — Reporting Basis Foundation (retail additive layer)  
**Baseline:** `9d3afb5` (MFG-K-0 `ReportingBasis` + `basisOf()` — reuse, do not fork)  
**Authority:** [`Phase_RTL_6_Build_Spec.md`](../Phase_RTL_6_Build_Spec.md) at commit **`2e7f67f`** (§4 module sequence, §6 PCs 20–22/28–33, §8 K-0 summary)  
**Wave 1 inputs:** [`Retail_Vertical_Planning_Doc.md`](../../wave1/Retail_Vertical_Planning_Doc.md) §2–§8, [`Retail_ASC606_Sources.md`](../../wave1/Retail_ASC606_Sources.md) Part IX, [`Retail_IFRS_Sources.md`](../../wave1/Retail_IFRS_Sources.md) Part IX, [`Retail_Disclosures_Sources.md`](../../wave1/Retail_Disclosures_Sources.md) Parts I–II/VIII, [`Retail_KPIs_Sources.md`](../../wave1/Retail_KPIs_Sources.md) Part I

**DRAFT / SPEC ONLY — NOT EXECUTABLE.** Shape-only TypeScript contracts. No evaluator, no spine, no verifier.

**Interface provenance.** K-0 interface blocks in §4–§6 are the normative retail Wave 2 contract. They consolidate the binding crosswalks in Wave 1 (`Retail_ASC606_Sources.md` Part IX, `Retail_IFRS_Sources.md` Part IX) and mirror the structural peer in [`docs/Phase_MFG_2_Build_Spec.md`](../../../Phase_MFG_2_Build_Spec.md) §5.2 (`ManufacturingBasisContracts.ts`). `Phase_RTL_2_Build_Spec.md` is not a committed repository artifact; this sub-spec is the authoritative K-0 source for Option A implementation.

---

## 1. Purpose

Define additive retail basis contracts at:

**Path:** `lib/intelligence/synthetic/industry/contracts/retail/RetailBasisContracts.ts`

**In scope:**

- `RetailPanelContext` and retail sub-segment discriminator (`B` | `E` | `O` | `G` | `S`)
- Retail-specific discriminated unions for the six canonical cross-blend traps (gift card, loyalty, returns reserve, RIM/LIFO, store-CGU impairment, fiscal calendar) plus reused manufacturing basis types
- Type-level routing contracts that downstream modules (K-F, K-G, K-H, K-I) must honor via `basisOf()` — **no** `StandardsReportingFramework` literal compares at this layer

**Out of scope:**

- Panel field contract (RTL-K-F)
- KPI math (RTL-K-G)
- Spine composition (RTL-K-H)
- Verifier / D0 (RTL-K-I)
- Forking or redefining `ReportingBasis` / `basisOf()` (owned by MFG-K-0)
- `panels/registry.ts`, Supabase migrations, overlay namespaces

---

## 2. Reuse of MFG-K-0 (`basisOf()`)

Retail **imports** the binary reporting-basis layer delivered by MFG-K-0. No retail fork.

**Path (existing):** `lib/intelligence/synthetic/standards/contracts/ReportingBasis.ts`

```typescript
import type { StandardsReportingFramework } from "./StandardsContracts";

export type ReportingBasis = "US_GAAP" | "IFRS";

/** Maps full accounting enum to binary panel-router discriminator. */
export function basisOf(fw: StandardsReportingFramework): ReportingBasis {
  return fw === "us_gaap" ? "US_GAAP" : "IFRS";
}
```

**Retail routing rule (binding):** All retail basis branches use `context.reportingBasis: ReportingBasis` or `basisOf(reportingFramework)`. Direct comparison against `StandardsReportingFramework` literals (`us_gaap`, `ifrs_iasb`, `ifrs_eu`, …) is **prohibited** in retail lane code — same Amendment 4 discipline as manufacturing (`Phase_MFG_2_Build_Spec.md` §5.4).

**PC bindings:** `CHK-RTL-PC-20` (ReportingBasis alias equivalence), `CHK-RTL-PC-22` (lease guard via `basisOf()`).

---

## 3. Module layout

| File | Responsibility |
|---|---|
| `RetailBasisContracts.ts` | All interfaces and type aliases in §4–§6 |
| `index.ts` | Re-export public retail basis contracts only |

**Additive export barrel (new):** `lib/intelligence/synthetic/industry/contracts/retail/index.ts`

Manufacturing basis types are **imported**, not duplicated:

```typescript
import type {
  USGAAPInventory,
  IFRSInventory,
  USGAAPLease,
  IFRSLease,
  USGAAP_PPE,
  IFRS_PPE,
  USGAAPRevenueContract,
  IFRSRevenueContract,
  USGAAPDisclosurePackage,
  IFRSDisclosurePackage,
} from "../manufacturing/ManufacturingBasisContracts";
```

---

## 4. `RetailPanelContext` (verbatim K-0 contract)

Wave 3 preservation contract — same field-retention discipline as `ManufacturingPanelContext` (`Phase_MFG_2_Build_Spec.md` §5.2).

```typescript
import type { ReportingBasis } from "../../../standards/contracts/ReportingBasis";

/**
 * Panel read context for retail performance surfaces.
 *
 * Wave 2: company-level binding only — entityId is always undefined;
 * naicsCode is optional/nullable until Wave 3 entity schema lands.
 *
 * Wave 3 migration MUST preserve this interface shape when adding
 * tenant→entity→NAICS persistence. Do not rename or remove fields.
 */
export type RetailSubSegment = "B" | "E" | "O" | "G" | "S";

/** NRF 4-5-4 retail fiscal calendar vs ISO calendar-month boundaries. */
export type RetailFiscalCalendar = "4-5-4" | "calendar";

/** Comparable-store policy — NRF 13-month default per planning Q1. */
export type ComparableStorePolicy = "NRF_13_MONTH" | "FOUNDER_DEFINED";

export interface RetailPanelContext {
  companyId: string;
  entityId?: string; // Wave 3 hook; always undefined in Wave 2
  reportingBasis: ReportingBasis;
  /** Alias of reportingBasis exposed at CC surface contract per PC-26. */
  applicableBasis: ReportingBasis;
  subSegment: RetailSubSegment;
  naicsCode?: string; // Wave 3 hook; nullable in Wave 2
  fiscalCalendar: RetailFiscalCalendar;
  comparableStorePolicy: ComparableStorePolicy;
}
```

**Invariant (PC-26):** `applicableBasis === reportingBasis` on every `RetailPanelContext` instance. Composition and panel read factories must set both fields from the same `ReportingBasis` value; divergent values are a verifier FAIL.

**PC bindings:** `CHK-RTL-PC-25` (`RetailPanelContext` exported with required fields), `CHK-RTL-PC-26` (`applicableBasis` present on Command Center surface candidate input — satisfied via context alias).

**Sub-segment definitions** (binding labels for applicability tables):

| Code | Sub-segment | NAICS anchor |
|---|---|---|
| `B` | Brick-and-mortar (general) | 44–45 (excl. pure e-com) |
| `E` | E-commerce (pure-play) | 4541 |
| `O` | Omnichannel | 44–45 + 4541 hybrid |
| `G` | Grocery / CPG | 4451, 4452 |
| `S` | Specialty / apparel | 4481, 4482, 4483 |

---

## 5. Reused manufacturing pattern types (import only)

Per `Retail_IFRS_Sources.md` Part IX.1 — retail **must not fork** these types.

| Reused type | Governing retail inputs | Wave 1 authority |
|---|---|---|
| `USGAAPInventory` / `IFRSInventory` | Merchandise held for resale; LIFO + `lifoReserve` US-only | `Retail_Disclosures_Sources.md` Part I; `Retail_IFRS_Sources.md` §I.2 |
| `USGAAPLease` / `IFRSLease` | Store leases; percentage rent | `Retail_Disclosures_Sources.md` Part VI; `Retail_IFRS_Sources.md` Part IV |
| `USGAAP_PPE` / `IFRS_PPE` | Store fit-out / leasehold improvements | `Retail_IFRS_Sources.md` Part II |
| `USGAAPRevenueContract` / `IFRSRevenueContract` | ASC 606 / IFRS 15 five-step shell | `Retail_ASC606_Sources.md` Part I |
| `USGAAPDisclosurePackage` / `IFRSDisclosurePackage` | Reg S-K + ASC 330/842 vs IAS 1/2/16/36 | `Retail_Disclosures_Sources.md`; `Retail_IFRS_Sources.md` Part IX.3 |

---

## 6. Retail-specific discriminated unions (verbatim K-0 contract)

### 6.1 — Inventory: RIM / LIFO (cross-blend trap #4 of 6)

US GAAP retail inventory method (RIM) and RIM-LIFO are **US_GAAP-only** paths. IFRS uses `IFRSInventory` with IAS 2.22 retail-method convenience — no LIFO enum member.

```typescript
export type USGAAPInventoryMethod =
  | "FIFO"
  | "LIFO"
  | "WeightedAverage"
  | "SpecificID"
  | "RIM"
  | "RIM_LIFO";

export interface USGAAPRIMInventory {
  basis: "US_GAAP";
  method: "RIM" | "RIM_LIFO";
  /** Present only when method === 'RIM_LIFO'. Absent on IFRS branch. */
  lifoReserve?: number;
  /** RIM compares to market (LCM), not pure NRV — ASC 330-10-30-13 */
  measurementBase: "lower_of_cost_or_market";
}

/** IFRS branch: reuse IFRSInventory from ManufacturingBasisContracts — LIFO excluded from enum. */
export type RetailIFRSInventory = IFRSInventory & {
  /** IAS 2.22 retail method permitted as cost-approximation technique only */
  retailMethodPermitted: true;
};
```

**Routing:** `basisOf() === 'US_GAAP'` → `USGAAPRIMInventory` path; `basisOf() === 'IFRS'` → `RetailIFRSInventory` / `IFRSInventory` only.

**PC binding:** `CHK-RTL-PC-29` (RIM/LCM gated to US_GAAP inventory branch).

---

### 6.2 — Gift card breakage (cross-blend trap #1 of 6)

From `Retail_ASC606_Sources.md` Part IX row 1.

```typescript
export type BreakageMode = "EXPECTED_PROPORTIONAL" | "NOT_EXPECTED_REMOTE";

/** US-only escheat overlay — absent from IFRS branch (TRAP A). */
export interface StateEscheatRule {
  jurisdictionCode: string;
  /** Breakage recognized must be net of expected escheat — ASC 606-10-55-49 */
  expectedEscheatPortion: number;
}

export interface USGAAPGiftCardLiability {
  basis: "US_GAAP";
  standard: "ASC606";
  breakageMode: BreakageMode;
  escheatOverlay?: StateEscheatRule;
}

export interface IFRSGiftCardLiability {
  basis: "IFRS";
  standard: "IFRS15";
  breakageMode: BreakageMode;
  /** No escheat overlay on IFRS branch */
}

export type GiftCardLiability = USGAAPGiftCardLiability | IFRSGiftCardLiability;
```

**PC binding:** `CHK-RTL-PC-30`.

---

### 6.3 — Loyalty material right (cross-blend trap #2 of 6)

From `Retail_ASC606_Sources.md` Part IX row 2. Shared computation interface; basis discriminant governs disclosure citation only.

```typescript
export type LoyaltyOptionType =
  | "POINTS"
  | "TIER_STATUS"
  | "PAID_MEMBERSHIP"
  | "CASHBACK"
  | "PARTNER";

export type StandaloneSellingPriceMethod =
  | "ADJ_MARKET"
  | "EXPECTED_COST_PLUS"
  | "RESIDUAL";

export interface LoyaltyMaterialRightCore {
  optionType: LoyaltyOptionType;
  sspMethod: StandaloneSellingPriceMethod;
}

export interface USGAAPMaterialRight extends LoyaltyMaterialRightCore {
  basis: "US_GAAP";
  standard: "ASC606";
}

export interface IFRSMaterialRight extends LoyaltyMaterialRightCore {
  basis: "IFRS";
  standard: "IFRS15";
}

export type LoyaltyMaterialRight = USGAAPMaterialRight | IFRSMaterialRight;
```

**TRAP B guard:** `TIER_STATUS` must not bind to the same deferral path as accumulating `POINTS` (`Retail_ASC606_Sources.md` Part IX).

**PC binding:** `CHK-RTL-PC-31`.

---

### 6.4 — Returns reserve (cross-blend trap #3 of 6)

From `Retail_ASC606_Sources.md` Part IX row 3. Gross presentation required — net collapse prohibited (TRAP C).

```typescript
export type ReturnsChannel = "ECOM" | "BRICK" | "SUBSCRIPTION";

export interface USGAAPRefundLiability {
  basis: "US_GAAP";
  standard: "ASC606";
  channel: ReturnsChannel;
  presentation: "GROSS";
}

export interface USGAAPReturnAsset {
  basis: "US_GAAP";
  standard: "ASC606";
  channel: ReturnsChannel;
  presentation: "GROSS";
}

export interface IFRSRefundLiability {
  basis: "IFRS";
  standard: "IFRS15";
  channel: ReturnsChannel;
  presentation: "GROSS";
}

export interface IFRSReturnAsset {
  basis: "IFRS";
  standard: "IFRS15";
  channel: ReturnsChannel;
  presentation: "GROSS";
}

export type ReturnsReserveUSGAAP = {
  refundLiability: USGAAPRefundLiability;
  returnAsset: USGAAPReturnAsset;
};

export type ReturnsReserveIFRS = {
  refundLiability: IFRSRefundLiability;
  returnAsset: IFRSReturnAsset;
};
```

**PC binding:** `CHK-RTL-PC-28` (returns reserve cites ASC 606-10-32-10 surface, not ASC 605).

---

### 6.5 — Store-level CGU impairment (cross-blend trap #5 of 6)

From `Retail_IFRS_Sources.md` Part IX.2 (`IFRSStoreCGU`) and `Retail_Disclosures_Sources.md` Part VIII (ASC 360 store held-and-used).

```typescript
export type StoreCguScope = "store" | "store_cluster";

export interface ASC360StoreImpairment {
  basis: "US_GAAP";
  standard: "ASC360";
  cguScope: StoreCguScope;
  triggerModel: "undiscounted_cash_flow_held_and_used";
  reversalPermitted: false;
}

export interface IFRSStoreCGU {
  basis: "IFRS";
  standard: "IAS36";
  cguScope: StoreCguScope;
  recoverableAmount: "higher_of_fvlcd_and_viu";
  /** IAS 36.124 — reversal permitted for store CGU, never for goodwill */
  reversalPermitted: true;
  goodwillReversalPermitted: false;
}

export type StoreImpairmentRouting = ASC360StoreImpairment | IFRSStoreCGU;
```

**Routing (binding):**

- `basisOf() === 'IFRS'` → `IFRSStoreCGU` only
- `basisOf() === 'US_GAAP'` → `ASC360StoreImpairment` only

**PC binding:** `CHK-RTL-PC-32` (`store_cgu_basis_routed`).

---

### 6.6 — Fiscal calendar / same-store boundaries (cross-blend trap #6 of 6)

From `Retail_Vertical_Planning_Doc.md` Q2 and `Retail_KPIs_Sources.md` RTL-K-01 notes (NRF 4-5-4, 52/53-week).

```typescript
export type PeriodBoundaryKind = "NRF_454_WEEK" | "ISO_CALENDAR_MONTH";

export interface RetailPeriodBoundary {
  fiscalCalendar: RetailFiscalCalendar;
  boundaryKind: PeriodBoundaryKind;
  /** ISO-8601 period start inclusive */
  periodStart: string;
  /** ISO-8601 period end inclusive */
  periodEnd: string;
}

export interface ComparableStorePeriodPair {
  current: RetailPeriodBoundary;
  prior: RetailPeriodBoundary;
  /** Both periods MUST share boundaryKind — enforced at type-contract level in K-G */
  boundaryMatch: true;
}
```

**Routing (binding):**

| `fiscalCalendar` | Boundary engine | Authority |
|---|---|---|
| `'4-5-4'` | NRF week boundaries (`NRF_454_WEEK`) | NRF — National Retail Federation calendar guidance |
| `'calendar'` | ISO month boundaries (`ISO_CALENDAR_MONTH`) | `Retail_KPIs_Sources.md` RTL-K-01 |

Same-store comparison (`RTL-K-01`) **must** enforce matching `boundaryKind` on both periods of a `ComparableStorePeriodPair`.

**PC binding:** `CHK-RTL-PC-33` (`fiscal_calendar_routed`).

---

### 6.7 — ASC 606 retail surfaces (consignment + principal/agent)

Retained in K-0 for completeness; K-F/K-G consume these shapes.

```typescript
export interface USGAAPConsignmentControl {
  basis: "US_GAAP";
  role: "CONSIGNOR" | "CONSIGNEE";
  controlRetained: boolean;
}

export interface IFRSConsignmentControl {
  basis: "IFRS";
  role: "CONSIGNOR" | "CONSIGNEE";
  controlRetained: boolean;
}

export interface USGAAPPrincipalAgent {
  basis: "US_GAAP";
  role: "PRINCIPAL" | "AGENT";
  grossOrNet: "GROSS" | "NET";
  threeFactor: {
    fulfillment: boolean;
    inventoryRisk: boolean;
    priceDiscretion: boolean;
  };
}

export interface IFRSPrincipalAgent {
  basis: "IFRS";
  role: "PRINCIPAL" | "AGENT";
  grossOrNet: "GROSS" | "NET";
  threeFactor: {
    fulfillment: boolean;
    inventoryRisk: boolean;
    priceDiscretion: boolean;
  };
}
```

**TRAP E guard:** KPI engine must read `grossOrNet` — marketplace net commission must not compare to principal gross GMV (`Retail_ASC606_Sources.md` Part IX row 5).

---

## 7. IFRS divergence (accounting logic touched by K-0)

| Topic | US GAAP branch | IFRS branch | K-0 type / field |
|---|---|---|---|
| Inventory LIFO | Permitted (`USGAAPInventory`, `USGAAPRIMInventory`) | **Prohibited** — `IFRSInventory` enum excludes LIFO | §6.1 |
| RIM measurement | Lower of cost or **market** (ASC 330-10-30-13) | IAS 2.22 cost approximation → lower of cost and **NRV** | §6.1 |
| NRV write-down reversal | Prohibited (new cost basis) | Required when NRV recovers (IAS 2.33) | `IFRSInventory` reuse |
| Gift-card escheat | `escheatOverlay?` on `USGAAPGiftCardLiability` | **Absent** on `IFRSGiftCardLiability` | §6.2 |
| Returns presentation | Gross refund liability + return asset | Gross refund liability + return asset (IFRS 15.B25) | §6.4 |
| Store impairment | `ASC360StoreImpairment` — no reversal | `IFRSStoreCGU` — reversal permitted (non-goodwill) | §6.5 |
| Lease model | Dual operating/finance (`USGAAPLease`) | Single lessee model (`IFRSLease`) | §5 reuse |
| Fiscal calendar | NRF 4-5-4 or ISO month — **operational**, not basis-specific | Same operational calendars; basis does not change boundary kind | §6.6 |

---

## 8. Sub-segment applicability — inventory method matrix (no blank cells)

Per `Retail_Disclosures_Sources.md` Part I.2 and planning doc §2. **●** = primary | **◑** = drill-down | **—** = not applicable.

| Method / surface | B | E | O | G | S |
|---|---|---|---|---|---|
| FIFO | ● | ● | ● | ● | ● |
| LIFO | ◑ | — | ◑ | ● | ◑ |
| RIM / RIM-LIFO | ● | ◑ | ● | ◑ | ● |
| IFRSInventory (no LIFO) | ● | ● | ● | ● | ● |
| Gift card liability | ● | ● | ● | ● | ● |
| Loyalty material right | ● | ● | ● | ● | ● |
| Returns reserve | ● | ● | ● | ◑ | ● |
| Store-CGU impairment | ● | ◑ | ● | ● | ● |
| NRF 4-5-4 calendar | ● | ◑ | ● | ● | ● |

*Note:* Per-cell **value** assertions for sub-segment matrix deferred to RTL-K-J D0 panel probe (`Phase_RTL_6_Build_Spec.md` §6, PC-14 footnote).

---

## 9. Type-routing helpers (spec signatures only — implemented in K-G)

K-0 defines contracts; K-G implements routing. Signatures are normative for cross-module consistency:

```typescript
import type { ReportingBasis } from "../../../standards/contracts/ReportingBasis";

export function assertBasisRoute<T extends { basis: ReportingBasis }>(
  value: T,
  expected: ReportingBasis,
): T;

export function routeStoreImpairment(
  reportingBasis: ReportingBasis,
): StoreImpairmentRouting;

export function resolvePeriodBoundaryKind(
  fiscalCalendar: RetailFiscalCalendar,
): PeriodBoundaryKind;

export function assertComparableStoreBoundaryMatch(
  pair: ComparableStorePeriodPair,
): void;
```

`assertComparableStoreBoundaryMatch` **must** reject mismatched `boundaryKind` between `current` and `prior` (feeds `CHK-RTL-PC-33`).

---

## 10. Export surface

`RetailBasisContracts.ts` **must** export:

| Export | Kind |
|---|---|
| `RetailPanelContext`, `RetailSubSegment` | interface + union (`applicableBasis` + `reportingBasis` invariant) |
| `RetailFiscalCalendar`, `ComparableStorePolicy` | type aliases |
| `USGAAPRIMInventory`, `RetailIFRSInventory` | interfaces |
| `GiftCardLiability`, `LoyaltyMaterialRight` | unions |
| `ReturnsReserveUSGAAP`, `ReturnsReserveIFRS` | type aliases |
| `StoreImpairmentRouting`, `ASC360StoreImpairment`, `IFRSStoreCGU` | interfaces + union |
| `RetailPeriodBoundary`, `ComparableStorePeriodPair` | interfaces |
| Consignment + principal/agent interfaces | §6.7 |
| Routing helper signatures | §9 |

Re-export manufacturing types used by retail from `lib/intelligence/synthetic/industry/contracts/retail/index.ts` for consumer convenience — **do not** redefine them in the retail file body.

---

## 11. Definition of done (RTL-K-0 sub-spec → build)

| # | Criterion |
|---|---|
| 1 | `RetailBasisContracts.ts` + `index.ts` exist at paths in §3 |
| 2 | `RetailPanelContext` matches §4 verbatim; `applicableBasis === reportingBasis` invariant enforced |
| 3 | All six cross-blend trap unions in §6 present |
| 4 | Manufacturing basis types imported, not forked |
| 5 | `basisOf()` imported from MFG-K-0; no local redefinition |
| 6 | No runtime evaluator, spine, or verifier code in K-0 commit |
| 7 | `npx tsc --noEmit` clean after interfaces land |

---

## 12. Anti-patterns

- ❌ Redefining `ReportingBasis` or `basisOf()` in the retail lane
- ❌ Comparing `reportingFramework === 'us_gaap'` instead of `basisOf(reportingFramework)`
- ❌ Placing `lifoReserve` on any IFRS inventory union member
- ❌ Netting refund liability and return asset into a single balance (TRAP C)
- ❌ Routing `IFRSStoreCGU` on a US_GAAP trigger path (or vice versa)
- ❌ Mixing NRF week boundaries with ISO month boundaries in a comp-sales pair
- ❌ Importing Phase 42 healthcare builders from retail contracts

---

**END — RTL-K-0 Basis Contracts Sub-Spec (founder-approved; `applicableBasis` alias added per PC-26)**
