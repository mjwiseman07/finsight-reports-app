---
status: DRAFT / PLANNING ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: false
phase: Retail Vertical Knowledge Stack — Wave 1 / Planning
artifact: Vertical Planning Document
locked: false
peer: docs/manufacturing/wave1/MANUFACTURING_VERTICAL_PLANNING_DOCUMENT.md
---

# Retail Vertical Knowledge Stack — Wave 1 Planning Document

**Founder:** Matthew Wiseman (Wiseman Financial Technologies LLC)
**Drafted:** 2026-06-23
**Peer vertical:** Manufacturing (Wave 2 closed at commit `9d3afb5`, 29/29 verifier PASS)
**Status:** PLANNING DOC — not "lock". Locking requires real spine code + D0 proof + 20+ PCs green + CPA engaged.

---

## 1. Scope (founder-confirmed 2026-06-23 01:10 EDT)

| Decision | Value |
|---|---|
| Sub-segments | All five — see Section 2 |
| ASC 606 surfaces | All five — gift card breakage, loyalty, returns, consignment, principal/agent |
| Disclosure depth | Full — ASC 330 + RIM + shrink + ASC 842 + Reg S-K + IFRS divergence |
| Panel binding | Single **Retail Performance Panel** (operations + merchandising combined) |

---

## 2. Sub-segment codes (canonical for this vertical)

Each retail sub-segment gets a single-letter code mirroring the manufacturing D/P/H/J/E pattern. These codes propagate into Wave 2 `RetailPanelContext.subSegment` and Wave 1 KPI sub-segment applicability matrix.

| Code | Sub-segment | NAICS anchor | Distinguishing characteristics |
|---|---|---|---|
| **B** | Brick-and-mortar (general) | 44–45 (excl. e-com) | Physical store base, foot traffic, in-store conversion, store-level P&L |
| **E** | E-commerce (pure-play) | 4541 (Electronic Shopping & Mail-Order) | Online sessions, cart abandonment, CAC, fulfillment cost, ship-from-DC |
| **O** | Omnichannel | 44–45 + 4541 hybrid | BOPIS / BORIS / ship-from-store, unified inventory, attribution complexity |
| **G** | Grocery / CPG (food + perishables) | 4451 (Grocery Stores), 4452 (Specialty Food) | Perishables, shrink severity, LIFO-eligible inventory, low-margin/high-velocity |
| **S** | Specialty / apparel | 4481 (Clothing), 4482 (Shoe), 4483 (Jewelry) | Seasonal markdown cadence, sell-through obsession, brand/category mix |

Cross-segment KPIs use applicability matrix marks: `●` (primary), `◑` (drill-down only), blank (not applicable).

---

## 3. Module sequence (mirrors manufacturing Wave 1)

| ID | Artifact | Status |
|---|---|---|
| RTL-K-A | Retail_KPIs_Sources.md | Pending |
| RTL-K-B | Retail_ASC606_Sources.md | Pending |
| RTL-K-C | Retail_Disclosures_Sources.md | Pending |
| RTL-K-C2 | Retail_IFRS_Sources.md | Pending |
| RTL-K-D | Retail_Benchmarks_Sources.md | Pending |
| RTL-K-E | Retail_Citation_Verification_Register.xlsx | Pending |

Wave 2 (out of scope here): RTL-K-0 reporting basis foundation (additive to existing K-0; retail reuses `ReportingBasis` + `basisOf()`), RTL-K-F panel contract, RTL-K-G evaluator, RTL-K-H composition, RTL-K-I verifier.

---

## 4. Panel binding — Retail Performance Panel

Single panel covering operations + merchandising. Field list (canonical for Wave 2 RTL-K-F):

### Realized KPIs (RTL-K-01..16)

| KPI ID | Field name | Sub-segments | Notes |
|---|---|---|---|
| RTL-K-01 | sameStoreSalesGrowth (comp sales) | B, O, G, S | E-com: digital comp instead |
| RTL-K-02 | trafficCount | B, O, S | E-com: sessions in RTL-K-09 |
| RTL-K-03 | conversionRate | B, E, O, S | Transactions ÷ traffic (or sessions for E) |
| RTL-K-04 | averageOrderValue (AOV) / averageTicket | B, E, O, G, S | All sub-segments |
| RTL-K-05 | unitsPerTransaction (UPT) / basketSize | B, E, O, G, S | All sub-segments |
| RTL-K-06 | grossMarginPercent | B, E, O, G, S | All sub-segments |
| RTL-K-07 | grossMarginROI (GMROI) | B, E, O, G, S | Gross margin $ ÷ avg inventory cost |
| RTL-K-08 | inventoryTurnover | B, E, O, G, S | COGS ÷ avg inventory; G highest velocity |
| RTL-K-09 | sellThroughRate | B, O, S | (●) S primary; G secondary for non-perishable |
| RTL-K-10 | shrinkRate (% of net sales) | B, O, G, S | G highest absolute; E lower but fraud risk |
| RTL-K-11 | returnsRate | B, E, O, S | E highest; G near-zero for perishable |
| RTL-K-12 | attachRate | B, E, O, S | Optional drill-down |
| RTL-K-13 | salesPerSquareFoot | B, O, G, S | Not applicable for pure E |
| RTL-K-14 | onlineSessions | E, O | E-com / omni only |
| RTL-K-15 | cartAbandonmentRate | E, O | E-com / omni only |
| RTL-K-16 | digitalCAC (customer acquisition cost) | E, O | E-com / omni only |

### Forecast variance fields (RTL-FV-01..16)

Mirror realized KPIs. `forecastVarianceSection?` optional per panel read.

### Panel metadata fields (carry-forward from manufacturing pattern)

- `companyId`, `accountingPeriod`
- `context: RetailPanelContext` (extends `ManufacturingPanelContext` pattern: companyId, entityId?, reportingBasis, subSegment 'B'|'E'|'O'|'G'|'S', naicsCode?)
- `reportingBasis: ReportingBasis` (root denormalized)
- `productionVolumeForPeriod` → replaced with `netSalesForPeriod: number`
- `unitOfMeasure: 'USD'` (retail is dollar-denominated unlike manufacturing's mixed units)
- Comparable-store count + period methodology marker (52/53-week retail calendar issue)

---

## 5. Q-resolutions (locked before deep work begins)

| ID | Question | Resolution |
|---|---|---|
| **Q1** | Comparable-store sales methodology — 13-month rule or founder-defined? | Document NRF 13-month convention as default; expose `comparableStorePolicy` as panel-level config |
| **Q2** | 52/53-week retail calendar handling | Document NRF 4-5-4 calendar; period field carries explicit `fiscalCalendar: '4-5-4' \| 'calendar'` marker |
| **Q3** | E-commerce specific KPIs — separate panel or unified? | Unified per founder decision; channel-specific fields gated by sub-segment applicability matrix (RTL-K-14..16 E/O only) |
| **Q4** | Returns reserve — ASC 606 vs ASC 605 carryover handling | ASC 606 only; ASC 605 explicitly excluded; cite ASU 2014-09 transition |
| **Q5** | RIM (Retail Inventory Method) treatment — separate doc or inline in C? | Inline in Retail_Disclosures_Sources.md §3 with full FASB ASC 330-10-30-13 + AICPA AAG-CAR (Audit & Accounting Guide for Retail) references |
| **Q6** | Gift card breakage — escheatment law layer | Document FASB 606-10-55-46..49 + state unclaimed property law variance; flag as "jurisdictional overlay" for Wave 3 |
| **Q7** | Principal vs agent for marketplaces (Amazon 3P, eBay model) | Cover 606-10-55-36..40 with three-factor test; cite EITF 99-19 legacy + ASC 606 supersession |

---

## 6. Source authority list (binding for citations)

### US GAAP / SEC
- FASB Accounting Standards Codification (ASC) — primary
  - ASC 330 Inventory (LIFO + LCM/LCNRV)
  - ASC 606 Revenue from Contracts with Customers
  - ASC 842 Leases
  - ASC 360 PP&E impairment (retail store-level)
- SEC Regulation S-K (segment + geographic disclosures)
- AICPA Audit and Accounting Guide — Retail (AAG-CAR) for RIM
- Deloitte DART (subscription-gated 200 accepted per manufacturing precedent)

### IFRS
- IFRS Foundation — primary
  - IAS 2 Inventories (LIFO prohibition)
  - IAS 16 Property, Plant and Equipment (componentization, revaluation)
  - IFRS 15 Revenue from Contracts with Customers
  - IFRS 16 Leases (single lessee model)
  - IAS 36 Impairment of Assets (CGU identification for store-level)
- KPMG / EY / PwC IFRS interpretive guides (secondary)

### Industry benchmarks
- US Census Bureau MARTS (Monthly Retail Trade Survey) — NAICS 44/45
- NRF (National Retail Federation) — annual benchmarks, calendar
- ICSC (International Council of Shopping Centers) — sales/sqft, occupancy cost
- Statista retail vertical reports — secondary
- Deloitte Global Powers of Retailing — annual
- IHL Group — shrink/loss prevention benchmarks
- NACS (National Association of Convenience Stores) — for G adjacent
- BRC (British Retail Consortium) — for IFRS-jurisdiction peers

### KPI definitions
- NRF KPI library — primary for SSS, traffic, AOV
- ICSC industry definitions
- Retail TouchPoints / RIS News — secondary
- Harvard Business Review retail benchmarks — tertiary

---

## 7. Citation discipline (carry-forward from manufacturing)

- Every cited fact carries inline source link with publication name as anchor text
- Citation Verification Register (RTL-K-E) tracks: register ID, URL, status code, cited-text-found Y/N, fetch date, priority (HIGH/MEDIUM/LOW)
- HIGH-priority rows machine-checked on every Wave 2 verifier run
- Subscription-gated 200 responses (DART, Deloitte interpretive) accepted per manufacturing precedent
- Each KPI carries `basisOfStandards: string` field-level citation (e.g., "NRF KPI Glossary — Same-Store Sales", "ASC 606-10-55-46")

---

## 8. Cross-blend traps (retail-specific, beyond manufacturing's five)

Retail introduces **three new cross-blend traps** beyond manufacturing's LIFO/lease/PP&E set:

| Trap | US GAAP | IFRS | Guard layer |
|---|---|---|---|
| **Gift card breakage** | ASC 606-10-55-46..49 — proportional recognition based on historical pattern | IFRS 15.B45..B47 — similar but lacks specific breakage paragraph; uses material right framework | Discriminated union `USGAAPGiftCardLiability` / `IFRSGiftCardLiability` at Wave 2 K-0 |
| **Loyalty program** | ASC 606-10-55-42..45 — material right separate performance obligation | IFRS 15.B39..B43 — same conceptual treatment but example-driven | Shared TS interface; basis-routing only on disclosure text |
| **Returns reserve** | ASC 606-10-32-10 — variable consideration, refund liability | IFRS 15.B20..B27 — refund liability with same mechanics | Shared TS interface; convergence point |

Plus all five manufacturing traps still apply (LIFO/lease/PP&E componentization/PP&E revaluation/disclosure templates) — retail just adds three on top.

---

## 9. Definition of done (Wave 1)

| # | Criterion |
|---|---|
| 1 | This planning doc reviewed by founder and signed off |
| 2 | RTL-K-A through RTL-K-E delivered with full citation discipline |
| 3 | Each doc carries DRAFT/SPEC banner, executable: false, containsVerticalComplianceLogic: true (where applicable) |
| 4 | Citation Verification Register tracks ≥30 register rows, ≥10 HIGH-priority |
| 5 | All five sub-segments (B/E/O/G/S) appear in every applicable KPI / disclosure section |
| 6 | IFRS divergence documented for every ASC 606 surface and every ASC 330/842 section |
| 7 | Wave 2 RTL-K-F panel field list extractable from RTL-K-A applicability matrix |

---

## 10. Out of scope (Wave 1)

- Wave 2 panel contract / evaluator / composition / verifier (separate phase)
- Multi-entity NAICS wizard / entities table (Wave 3 — shared with manufacturing)
- Cross-vertical retail-manufacturing reconciliation (e.g., DTC brands that manufacture + retail — defer to Wave 3+ "hybrid entity" pattern)
- Cannabis / firearms / age-gated retail sub-overlays (jurisdictional; Wave 4+)
- POS / e-com platform integrations (Shopify, NetSuite SuiteCommerce, Lightspeed — those are spine reads, not Wave 1 knowledge)
- Restaurant / hospitality (NAICS 72, separate vertical)
- B2B wholesale / distribution (NAICS 42, separate vertical — distinct from B2C retail)

---

## 11. Execution gate

**STOP — DO NOT START RTL-K-A DEEP WORK UNTIL FOUNDER APPROVES THIS PLANNING DOC.**

After approval, sequence: RTL-K-A → B → C → C2 → D → E. Each doc is a single artifact; deep research per module.

---

END — Retail Vertical Wave 1 Planning Document (DRAFT). Awaiting founder review.
