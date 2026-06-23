---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: true
phase: Retail Vertical Knowledge Stack — Wave 2 / RTL-K-I
artifact: Verifier + D0 Evidence Sub-Spec
locked: false
mode: SPEC AUTHORING — MACHINE VERIFICATION; D0 EMISSION
---

# RTL-K-I — Verifier + D0 Evidence Sub-Spec

**Module:** RTL-K-I — Verifier + D0 Evidence  
**Baseline:** `b139485` (RTL-K-H spine composition) — full sub-spec chain locked  
**Authority:** [`Phase_RTL_6_Build_Spec.md`](../Phase_RTL_6_Build_Spec.md) at commit **`2e7f67f`** (§3 D0 schema, §5 per-case shape, §6 all 34 PCs), K-0..K-H sub-specs

**DRAFT / SPEC ONLY — NOT EXECUTABLE** as a deployed panel path. Machine verifier + D0 evidence generator.

---

## 1. Purpose

Machine-verify the Wave 2 retail knowledge stack against:

- Wave 1 sources (`Retail_KPIs_Sources.md`, `Retail_Citation_Verification_Register.xlsx`, wave1 doc hashes)
- K-0 contracts (`ReportingBasis`, `RetailBasisContracts`, `applicableBasis` alias)
- K-F panel contract (16 panel fields, catalog anchor crosswalk §9)
- K-G evaluator (formula parity, cross-blend routing, absence contract §6.0)
- K-H composition (spine barrel imports, `applicableBasis`, authorization, overlay absence)

Emit D0 evidence artifact on **every** run (pass or fail).

**Target:** **34/34 PASS**, exit **0** only when `failCount === 0` and D0 file written.

---

## 2. Script location

| Item | Path |
|---|---|
| Verifier | `scripts/verify-retail-knowledge-stack.js` |
| npm script | `verify:retail-knowledge-stack` (additive in `package.json`) |
| D0 output | `ops/compliance/retail-knowledge-stack/D0_RTL_KNOWLEDGE_STACK_EVIDENCE.json` |
| MFG reference (PC-34) | `ops/compliance/manufacturing-knowledge-stack/D0_MFG_KNOWLEDGE_STACK_EVIDENCE.json` (commit `9d3afb5`) |

Convention: Node `.js` (matches `scripts/verify-manufacturing-knowledge-stack.js` precedent). **No `throw`** — failures route through `cases[]`.

---

## 3. Wave 1 source ingestion

| Source | Usage |
|---|---|
| `docs/retail/wave1/Retail_KPIs_Sources.md` | Catalog formulas; panel→catalog anchors per K-F §9 |
| `docs/retail/wave1/Retail_Citation_Verification_Register.xlsx` | Verification Register sheet; `registerHash` |
| `docs/retail/wave1/*` | `waveOneDocsHashes` SHA-256 map |

**Formula whitespace rule:** collapse whitespace runs to single space, trim, string-equal. LaTeX normalization: `\times` → `*`, fraction bars preserved, RHS extraction after `=`.

**Dual namespace:** Panel KPI IDs (RTL-K-01..16) ≠ catalog IDs — verifier resolves formulas via K-F §9 **Catalog Row Anchor**, not panel ID alone.

---

## 4. Planning-doc checks (a)–(f)

| Check | PC coverage | Implementation |
|---|---|---|
| (a) Contract↔KPI mapping | PC-01..03 | Parse `contract.ts` field IDs + K-F §9 catalog anchors |
| (b) Formula parity | PC-04..11 | Evaluator source vs catalog formula text (source-level; see §8) |
| (c) Citation register | PC-12..13 | Register rows + HEAD/GET fetch; drift detection |
| (d) Sub-segment matrix | PC-14 | K-F §5 matrix + KPI doc tables; no blank cells. *Wave 3 (RTL-K-J): D0 panel probe will add per-cell value assertions — out of scope for K-I.* |
| (e) Overlay absence | PC-15..17 | Grep retail lane for forbidden imports |
| (f) Spine-export-only | PC-18..19, PC-27 | Composition + spine barrel scans |

---

## 5. PC enumeration — 34 cases (authoritative)

Full table: [`Phase_RTL_6_Build_Spec.md`](../Phase_RTL_6_Build_Spec.md) §6.

Verifier maintains a `cases` array of exactly **34** entries. Each case object conforms to §6 (per-case shape).

| PC ID | Category | Expected | Reason slug (PASS) |
|---|---|---|---|
| CHK-RTL-PC-01 | Contract↔KPI | ALLOW | `contract_kpi_rtl_k01` |
| CHK-RTL-PC-02 | Contract↔KPI | ALLOW | `contract_kpi_rtl_k16` |
| CHK-RTL-PC-03 | Contract↔KPI | ALLOW | `contract_kpi_rtl_fv01` |
| CHK-RTL-PC-04 | Formula parity | ALLOW | `formula_rtl_k01` |
| CHK-RTL-PC-05 | Formula parity | ALLOW | `formula_rtl_k03` |
| CHK-RTL-PC-06 | Formula parity | ALLOW | `formula_rtl_k06` |
| CHK-RTL-PC-07 | Formula parity | ALLOW | `formula_rtl_k07` |
| CHK-RTL-PC-08 | Formula parity | ALLOW | `formula_rtl_k08` |
| CHK-RTL-PC-09 | Formula parity | ALLOW | `formula_rtl_k10` |
| CHK-RTL-PC-10 | Formula parity | ALLOW | `formula_rtl_k04` |
| CHK-RTL-PC-11 | Formula parity | ALLOW | `formula_rtl_fv01` |
| CHK-RTL-PC-12 | Citation register | ALLOW | `citation_nrf_sss` |
| CHK-RTL-PC-13 | Citation register | ALLOW | `citation_ias2_lifo` |
| CHK-RTL-PC-14 | Sub-segment matrix | ALLOW | `subsegment_matrix_complete` |
| CHK-RTL-PC-15 | Overlay absence | ALLOW | `no_cannabis_overlay` |
| CHK-RTL-PC-16 | Overlay absence | ALLOW | `no_firearms_overlay` |
| CHK-RTL-PC-17 | Overlay absence | ALLOW | `no_overlay_namespace` |
| CHK-RTL-PC-18 | Spine import | ALLOW | `spine_public_barrel_only` |
| CHK-RTL-PC-19 | Spine import | DENY | `overlay_import_denied` |
| CHK-RTL-PC-20 | ReportingBasis | ALLOW | `basis_of_alias_equivalent` |
| CHK-RTL-PC-21 | Type isolation | ALLOW | `ifrs_gift_card_no_escheat` |
| CHK-RTL-PC-22 | Lease guard | ALLOW | `lease_basis_routed` |
| CHK-RTL-PC-23 | Phase 42 lock | ALLOW | `phase42_healthcare_absent` |
| CHK-RTL-PC-24 | D0 artifact | ALLOW | `d0_artifact_written` |
| CHK-RTL-PC-25 | Panel context | ALLOW | `retail_panel_context_exported` |
| CHK-RTL-PC-26 | CC guard | ALLOW | `applicable_basis_present` |
| CHK-RTL-PC-27 | Spine barrel | ALLOW | `spine_barrel_reexport_only` |
| CHK-RTL-PC-28 | ASC 606 surface | ALLOW | `asc606_returns_reserve` |
| CHK-RTL-PC-29 | RIM routing | ALLOW | `rim_us_gaap_only` |
| CHK-RTL-PC-30 | Gift card routing | ALLOW | `gift_card_basis_routed` |
| CHK-RTL-PC-31 | Loyalty routing | ALLOW | `loyalty_basis_routed` |
| CHK-RTL-PC-32 | Cross-blend trap | ALLOW | `store_cgu_basis_routed` |
| CHK-RTL-PC-33 | Cross-blend trap | ALLOW | `fiscal_calendar_routed` |
| CHK-RTL-PC-34 | Schema parity | ALLOW | `schema_parity_verified` |

---

## 6. Per-case object shape (normative)

Each `cases[]` element uses **exactly** five keys — mirror manufacturing D0 at `9d3afb5`:

```typescript
interface VerifierCaseResult {
  id: string; // CHK-RTL-PC-NN
  decision: "ALLOW" | "DENY";
  expected: "ALLOW" | "DENY";
  outcome: "PASS" | "FAIL";
  reason: string;
}
```

**Prohibited:** `caseId`, `status`, `evidence`, `failureDetail`, `phase`, `verifiedAt`, `totalChecks`, `checks`.

Serialization via `serializeCaseToMfgParitySchema()` — internal runtime types may differ; **only JSON write** must conform.

---

## 7. D0 evidence emission

Every run writes `ops/compliance/retail-knowledge-stack/D0_RTL_KNOWLEDGE_STACK_EVIDENCE.json`:

```json
{
  "evidenceVersion": "RTL-K-I-1",
  "generatedAt": "<ISO-8601>",
  "commitHash": "<git HEAD>",
  "totalCases": 34,
  "passCount": <number>,
  "failCount": <number>,
  "cases": [
    {
      "id": "CHK-RTL-PC-01",
      "decision": "ALLOW",
      "expected": "ALLOW",
      "outcome": "PASS",
      "reason": "contract_kpi_rtl_k01"
    }
  ],
  "registerHash": "<sha256>",
  "waveOneDocsHashes": { "<filename>": "<sha256>" }
}
```

**Invariants:**

- `passCount + failCount === totalCases === 34`
- Shared top-level keys match MFG: `evidenceVersion`, `generatedAt`, `totalCases`, `passCount`, `failCount`, `cases`
- Retail extensions allowed: `commitHash`, `registerHash`, `waveOneDocsHashes`
- Atomic write: `.tmp` then rename
- Create output directory if missing
- Exit **0** only when `failCount === 0` **and** D0 file exists post-write

**PC-24:** Self-check — verifier confirms D0 file written on every invocation.

---

## 8. Formula parity checks (PC-04..11)

| PC | Panel field | Catalog anchor | Source files |
|---|---|---|---|
| PC-04 | RTL-K-01 | RTL-K-01 | `compSales.ts` vs KPI doc |
| PC-05 | RTL-K-03 | RTL-K-11 | `trafficAndConversion.ts` |
| PC-06 | RTL-K-06 | RTL-K-14 | `marginAndInventory.ts` |
| PC-07 | RTL-K-07 | RTL-K-16 | `marginAndInventory.ts` |
| PC-08 | RTL-K-08 | RTL-K-24 | `marginAndInventory.ts` |
| PC-09 | RTL-K-10 | RTL-K-34 | `merchandising.ts` |
| PC-10 | RTL-K-04 | RTL-K-06 | `basketMetrics.ts` |
| PC-11 | RTL-FV-01 | RTL-K-01 | `forecast.ts` vs `compSales.ts` (source-level mirror) |

**PC-11 note (from K-H §7):** Fires statically — `forecast.ts` formula must mirror `compSales.ts`. Absent runtime `forecastVarianceSection` does **not** vacate PC-11.

---

## 9. Cross-blend absence discrimination (K-G §6.0)

For PC-28/30/31/32, verifier MUST distinguish:

| Scenario | `decision` | `expected` | `outcome` |
|---|---|---|---|
| Input absent — assertion not fired | `DENY` | `DENY` | `PASS` |
| Input present — routing passed | `ALLOW` | `ALLOW` | `PASS` |
| Input present — routing failed | per check | per spec | `FAIL` |
| **Vacuous PASS** — `ALLOW`/`ALLOW` when input never provided | — | — | **FAIL** |

**PC-28 special (Pattern B):** When test fixture has `returnsRate > 0`, `returnsReserve` must be present or evaluator returns `MISSING_RETURNS_RESERVE` — recorded as FAIL, not DENY/DENY.

Implementation: dedicated fixture replay or static analysis of routing modules with annotated test vectors per K-G §6.0.

---

## 10. PC-RTL-VERIFY-LOCK-06 (CHK-RTL-PC-34)

At verifier **startup**, load MFG D0 at `ops/compliance/manufacturing-knowledge-stack/D0_MFG_KNOWLEDGE_STACK_EVIDENCE.json`.

Extract:

1. Required shared top-level keys: `evidenceVersion`, `generatedAt`, `totalCases`, `passCount`, `failCount`, `cases`
2. Per-case keys from `cases[0]`: `id`, `decision`, `expected`, `outcome`, `reason`

After RTL D0 emission, assert retail JSON contains every shared key with matching per-case key set. Retail per-case objects must not contain keys outside the MFG allowlist.

**If MFG D0 unreadable:** CRITICAL — exit non-zero; do not bypass.

**Pass reason:** `schema_parity_verified`

---

## 11. PC-22 bi-directional lease guard

All four sub-assertions required (same contract as MFG-K-I §6):

| Input category | Framework | Expected output |
|---|---|---|
| `asc842_candidate` | `us_gaap` | `asc842_candidate` |
| `asc842_candidate` | `ifrs_iasb` | `ifrs16_lessee_candidate` |
| `ifrs16_lessee_candidate` | `us_gaap` | `asc842_candidate` |
| `ifrs16_lessee_candidate` | `ifrs_iasb` | `ifrs16_lessee_candidate` |

Plus static check: lease observation code calls `basisOf(reportingFramework)` — no framework literal compares.

---

## 12. PC-27 spine barrel lock

Permitted in `lib/intelligence/synthetic/spine/index.ts`:

- Blank lines, comments
- `export { ... } from '...'` (multiline)
- `export type { ... } from '...'`
- `export * from '...'`

Prohibited: `function`, `class`, `const`, `let`, `var`, `interface`, non-re-export `import`.

Fail reason: `spine_barrel_non_reexport`

---

## 13. Citation spot-check

- HIGH-priority register rows fetched fresh each run
- Subscription-gated 200 (Deloitte DART, ifrs.org) accepted per manufacturing precedent
- Drift: register-time bad status + fresh 4xx/5xx → `CITATION_DRIFT_<register_id>` on affected PC
- PC-12: primary NRF SSS citation row (nrf.com/resources/4-5-4-calendar)
- PC-13: IAS 2 LIFO prohibition row

---

## 14. Overlay and Phase 42 static scans

| PC | Scan target | Pattern |
|---|---|---|
| PC-15 | `lib/intelligence/synthetic/industry/retail/` | No cannabis overlay imports |
| PC-16 | same | No firearms/ATF overlay imports |
| PC-17 | same | No `ops/compliance/overlays` imports |
| PC-19 | composition module | Overlay namespace import → expect DENY path exercised |
| PC-23 | retail lane + verifier | No Phase 42 healthcare builder imports |

---

## 15. IFRS divergence checks (evaluator/composition static)

Verifier confirms static evidence for:

| PC | Check |
|---|---|
| PC-21 | `IFRSGiftCardLiability` type excludes `escheatOverlay` |
| PC-28 | `returnsReserve.ts` cites ASC 606-10-32-10; gross presentation |
| PC-29 | `rimRouting.ts` rejects IFRS RIM/LIFO branch |
| PC-32 | `storeCguRouting.ts` basis-discriminated paths |
| PC-33 | `fiscalCalendar.ts` boundary kind enforcement |

### 15.1 — Panel context and CC guard static scans

| PC | Check |
|---|---|
| PC-25 | `RetailBasisContracts.ts` exports `RetailPanelContext` with all required fields per K-0 §4 (`companyId`, `reportingBasis`, `applicableBasis`, `subSegment`, `fiscalCalendar`, `comparableStorePolicy`, Wave 3 hooks); static source scan |
| PC-26 | `composeRetailPerformancePanel.ts` assigns `applicableBasis: context.applicableBasis` (or equivalent) on `RetailCommandCenterSurfaceCandidate`; static source scan; rejects manufacturing-style literal-array hardcode (`['US_GAAP', 'IFRS']`) on retail surface candidate |

---

## 16. No-throw policy

Verifier uses controlled flow and `process.exit()`. No uncaught exceptions. Runtime errors captured in `cases[]` with `outcome: 'FAIL'`.

---

## 17. Definition of done (RTL-K-I sub-spec → build)

| # | Criterion |
|---|---|
| 1 | `scripts/verify-retail-knowledge-stack.js` exists |
| 2 | `verify:retail-knowledge-stack` in `package.json` |
| 3 | Exactly 34 cases emitted per run |
| 4 | D0 conforms to Phase RTL-6 §3 + §5 |
| 5 | PC-34 schema parity green against MFG D0 `9d3afb5` |
| 6 | Exit 0 only on 34/34 PASS + D0 write |
| 7 | No Phase 42 healthcare edits |

*Wave 3 note:* Per-cell sub-segment value assertions deferred to RTL-K-J D0 panel probe (parent build spec §6 PC-14 footnote); K-I Wave 2 scope is no-blank-cells only.

---

## 18. Non-goals

- No fix-up logic at runtime (register xlsx updated in dedicated commit, not by verifier auto-edit)
- No git push operations
- No Wave 1 KPI source prose edits
- No `panels/registry.ts`
- No spine reimplementation
- No evaluator implementation in verifier script (static + fixture replay only)

---

**END — RTL-K-I Verifier + D0 Evidence Sub-Spec (awaiting founder review)**
