---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: true
phase: Manufacturing Vertical Knowledge Stack — Wave 2 / MFG-K-H
artifact: Spine Composition Sub-Spec
locked: false
mode: SPEC AUTHORING — COMPOSITION I/O BOUNDARY; SPINE-GATED READS
---

# MFG-K-H — Spine Composition Sub-Spec

**Module:** MFG-K-H — Spine Composition  
**Baseline:** `a1eaf99` (MFG-K-G)  
**Authority:** [`docs/Phase_MFG_2_Build_Spec.md`](../../Phase_MFG_2_Build_Spec.md) section 8, [`MFG_K_G_Variance_Evaluator_Spec.md`](./MFG_K_G_Variance_Evaluator_Spec.md), [`MFG_K_F_Panel_Field_Contract_Spec.md`](./MFG_K_F_Panel_Field_Contract_Spec.md)

**DRAFT / SPEC ONLY — NOT EXECUTABLE** as a deployed panel path. Composition binds K-G evaluator to spine isolation helpers.

---

## 1. Purpose

Compose the K-G variance evaluator with the spine isolation layer to produce a Command Center surface candidate.

- Spine reads supply raw inputs (standard costs, actuals, inventory basis objects, optional forecast feeds)
- K-G evaluator transforms inputs into `ManufacturingVariancePanelContract`
- Composition emits a `CommandCenterSurfaceCandidate` wrapping the panel payload and CC surface metadata
- **No spine reimplementation** — imports spine isolation helpers exported by Phase 42.5B/C/P via the public consumption barrel

---

## 2. Module layout

Directory: `lib/intelligence/synthetic/industry/manufacturing/composition/`

| File | Responsibility |
|---|---|
| `types.ts` | `ManufacturingSpineDependencies`, `ManufacturingSpineSession`, `CommandCenterSurfaceCandidate` |
| `resolveReportingFramework.ts` | `ReportingBasis` → `StandardsReportingFramework` (J-02) |
| `resolveForecastInputSource.ts` | Tenant-config forecast feed selection |
| `authorizeManufacturingPanelRead.ts` | Authorization gate before any read |
| `composeManufacturingVariancePanel.ts` | Main orchestrator |
| `createManufacturingSpineDependencies.ts` | Default DI wiring factory |
| `index.ts` | Re-exports |

Public spine consumption barrel (new): `lib/intelligence/synthetic/spine/index.ts` — re-exports Phase 42.5B/C/P helpers from `ops/control-spine/*/index.ts`.

---

## 3. Composition signature

```typescript
export function composeManufacturingVariancePanel(
  params: ManufacturingVariancePanelReadParams,
  spineDependencies: ManufacturingSpineDependencies,
): Promise<ManufacturingEvaluatorResult<CommandCenterSurfaceCandidate>>;
```

| Param | Type | Source |
|---|---|---|
| `params` | `ManufacturingVariancePanelReadParams` | K-F contract (`companyId`, `accountingPeriod`, `context`) |
| `spineDependencies` | `ManufacturingSpineDependencies` | DI-style spine helper + read bindings (testable without spine fixtures) |

Returns a `Promise` (spine reads are async) wrapping the K-G `ManufacturingEvaluatorResult` type extended with composition error codes.

---

## 4. Spine isolation imports (Phase 42 lock discipline)

**Rule (verbatim):** Composition module imports spine isolation helpers from their public export barrels only. Direct imports from `lib/intelligence/synthetic/spine/<internal>/...` are prohibited. If a needed helper is not exported, the resolution is to expand the spine export surface (separate spine ticket, not Wave 2 work) — not to deep-import.

### Public consumption barrel

`lib/intelligence/synthetic/spine/index.ts` re-exports from `ops/control-spine` public barrels only:

| Export barrel | Helpers consumed by manufacturing composition |
|---|---|
| `ops/control-spine/isolation/index.ts` | `classifyIsolationReach`, `evaluateIsolationBoundary`, `ClassifyIsolationReachInput`, `ControlSpineIsolationScope` |
| `ops/control-spine/rbac/index.ts` | `evaluateRbacAccess`, `EvaluateRbacAccessInput` |
| `ops/control-spine/verification/panel-data-paths/index.ts` | `panelDataPathHarness`, `buildIsolationScopeFromTenantId`, `PanelDataPathHarness` |

Recon Section E does not enumerate individual export names; the above table was verified against Phase 42.5B/C/P barrels at K-H authoring time.

### Prohibited import paths

- `ops/control-spine/isolation/evaluateIsolationBoundary.ts` (internal)
- `ops/compliance/overlays/**` (overlay namespace — PC-21 DENY)
- `lib/intelligence/synthetic/industry/healthcare/**` (Phase 42 lock — PC-25)
- Any `lib/intelligence/synthetic/spine/<internal>/...` deep path

---

## 5. Cross-tenant / persona refusal

`authorizeManufacturingPanelRead` runs **before any data read**:

1. Cross-tenant guard: `params.companyId` and `params.context.companyId` must match `session.tenantId`
2. RBAC + isolation composition via `evaluateRbacAccess` with `isolationInput`
3. Panel boundary via `panelDataPathHarness.assertTenantScope`

On unauthorized persona or cross-tenant attempt:

```typescript
return { ok: false, error: "UNAUTHORIZED" };
```

Never `throw`. Never return a partial panel.

---

## 6. `reportingFramework` resolution (Amendment 4 echo)

`resolveReportingFramework.ts`:

| `ReportingBasis` | `StandardsReportingFramework` |
|---|---|
| `US_GAAP` | `us_gaap` |
| `IFRS` | `ifrs_iasb` (J-02 internal default) |

**Hard rule:** Composition MUST pass the resolved `reportingFramework` explicitly to every downstream call that accepts it — notably `buildLeaseIntelligenceObservation`. The lease guard's `us_gaap` default MUST never be relied upon by composition; passing explicitly is mandatory.

Composition call site for lease guard:

```typescript
buildLeaseObservation({
  ...leaseInput,
  reportingFramework, // explicit — never omitted
});
```

K-I verifier **CHK-MFG-PC-24** must test both reclassification directions:

- `US_GAAP` → `ifrs16_lessee_candidate` when input category is `asc842_candidate` under IFRS framework
- `IFRS` → `asc842_candidate` when input category is `ifrs16_lessee_candidate` under US GAAP framework

---

## 7. Forecast input source resolution

When forecast variance is requested, composition reads forecast inputs from spine via `readForecastInputs` callback.

Feed selection is **tenant-config driven** (`session.forecastInputSource` or tenant attribute), not hard-coded preference order:

| Config value | Feed |
|---|---|
| `sop` | S&OP feed |
| `demand-forecast` | Demand-forecast feed |
| `sales-pipeline` | Sales-pipeline feed |

When no forecast source is configured or spine returns `null`: `forecastVarianceSection` is **undefined** in output — **not an error**.

---

## 8. `CommandCenterSurfaceCandidate` shaping

```typescript
interface ManufacturingCommandCenterSurfaceCandidate {
  surfaceCandidate: SyntheticStructuredCommandCenterSurfaceCandidate;
  payload: ManufacturingVariancePanelContract;
  applicableBasis: ReportingBasis[];
}
```

| Field | Value |
|---|---|
| `applicableBasis` | `['US_GAAP', 'IFRS']` — basis-agnostic at surface level; basis routing inside evaluator |
| `payload` | K-G `ManufacturingVariancePanelContract` |
| `surfaceCandidate` | Built via `buildCommandCenterSurfaceCandidate` |

Surface metadata per existing CC conventions (`buildCommandCenterSurfaceCandidate.ts`):

| Field | Manufacturing value |
|---|---|
| `surfaceArtifactCategory` | `industry_item` |
| `surfacePlacement` | `primary_surface` |
| `consumptionChannels` | `company_surface`, `executive_summary` |
| `decisionSurfaceCategory` | `monitoring` |
| `surfaceCategory` | `controller_command` |
| `visibleRoleCategories` | `controller`, `cfo`, `operations` |
| `applicableBasis` | `DEFAULT_COMMAND_CENTER_APPLICABLE_BASIS` |

---

## 9. `ManufacturingSpineDependencies` (DI interface)

```typescript
interface ManufacturingSpineDependencies {
  session: ManufacturingSpineSession;
  authorizePanelRead: AuthorizeManufacturingPanelRead;
  readVarianceInputs: ReadManufacturingVarianceInputs;
  readForecastInputs?: ReadManufacturingForecastInputs;
  readLeaseObservationInput?: ReadLeaseObservationInput;
  buildPrioritizationPackage: BuildManufacturingPrioritizationPackage;
  buildLeaseObservation?: BuildLeaseObservation;
}
```

- `readVarianceInputs` maps spine reads to K-G `ManufacturingEvaluatorInputs` (discriminated union preserves CHK-MFG-PC-23)
- `buildPrioritizationPackage` supplies the prioritization package required by `buildCommandCenterSurfaceCandidate`
- Optional spine helper overrides for test injection

---

## 10. Error handling

Extends K-G `ManufacturingEvaluatorError`:

| Code | When |
|---|---|
| `UNAUTHORIZED` | Cross-tenant or persona denial before read |
| `MISSING_FORECAST_INPUTS` | Defensive guard in K-G `buildForecastSection` (K-H cleanup) |
| `SURFACE_CANDIDATE_BUILD_FAILED` | `buildCommandCenterSurfaceCandidate` skipped |

All K-G codes remain valid. Never `throw`.

---

## 11. CHK-MFG mapping for K-I

| Check | Expected | Description |
|---|---|---|
| CHK-MFG-PC-20 | ALLOW | Composition imports from spine public barrel only |
| CHK-MFG-PC-21 | DENY | Composition must not import overlay namespace |
| CHK-MFG-PC-25 | ALLOW | Composition must not import locked Phase 42 healthcare builders |
| CHK-MFG-PC-28 | ALLOW | Surface candidate has `applicableBasis` populated |
| CHK-MFG-PC-24 | ALLOW | Lease guard both directions via explicit `reportingFramework` |

---

## 12. Non-goals

- No spine logic reimplementation
- No Supabase migration
- No `panels/registry.ts` modification
- No Command Center router edits beyond K-0 `applicableBasis` field
- No `app/upload/page.tsx` changes
- No Phase 42 healthcare file edits
- No overlay namespace imports

---

## 13. K-G evaluator cleanup (folded into K-H)

| Item | Resolution |
|---|---|
| `buildForecastSection` unreachable `!inputs.forecast` guard | Kept as defensive code; error code changed to `MISSING_FORECAST_INPUTS` |
| Unused `forecastInputs` local | Removed; `resolveStandardMaterialPrice` inlined with `{ ...inputs, directMaterials: inputs.forecast.directMaterials }` |

---

**END — MFG-K-H Spine Composition Sub-Spec**
