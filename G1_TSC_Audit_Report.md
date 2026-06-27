# G1 TSC Audit Report

**Branch:** `architecture-lane-refactor-baseline`  
**HEAD:** `5aa330b` (Atlas v2.9 SHA-fill)  
**Command:** `npx tsc --noEmit` (full repo)  
**Date:** 2026-06-18  
**Scope:** Diagnostic only — no code fixes in this commit.

---

## 1. Total Error Count

| Metric | Value |
|---|---|
| **Total TSC errors** | **271** |
| In `architecture-lane/k-v-cases/*` | 59 (22%) |
| Outside `k-v-cases` | 212 (78%) |

Verifier baseline at audit HEAD (unchanged): Meta **26/26**, Main **435/435** (`npm run verify:phase-42-7f:all`).

---

## 2. Errors by File (Top 20, Descending)

| Count | File |
|---:|---|
| 26 | `lib/intelligence/synthetic/standards/resolver/__tests__/memoryCache.test.ts` |
| 16 | `lib/intelligence/synthetic/libraries/construction/index.ts` |
| 12 | `lib/intelligence/synthetic/libraries/prof-services/index.ts` |
| 12 | `lib/intelligence/synthetic/industry/construction/index.ts` |
| 12 | `lib/intelligence/synthetic/libraries/saas/index.ts` |
| 6 | `lib/intelligence/synthetic/industry/prof-services/index.ts` |
| 4 | `architecture-lane/k-v-cases/ps-1/contingent-fee-constraint-bypass.ts` |
| 4 | `architecture-lane/k-v-cases/ps-1/over-time-3-criteria-fail.ts` |
| 4 | `architecture-lane/k-v-cases/ps-1/multi-element-residual-abuse.ts` |
| 4 | `architecture-lane/k-v-cases/ps-1/retainer-straight-line-no-series.ts` |
| 3 | `lib/intelligence/synthetic/libraries/construction/asc606/unpriced-change-orders.ts` |
| 3 | `lib/intelligence/synthetic/standards/resolver/memory/persistence-schema.ts` |
| 3 | `lib/intelligence/synthetic/libraries/construction/asc606/claims.ts` |
| 3 | `architecture-lane/k-v-cases/con-1/over-time-criteria-fail.ts` |
| 3 | `architecture-lane/k-v-cases/con-1/retention-classification.ts` |
| 3 | `tests/verticals/saas/saas-2.verify.test.ts` |
| 3 | `architecture-lane/k-v-cases/con-1/jv-proportionate-lockout.ts` |
| 3 | `lib/intelligence/synthetic/libraries/construction/asc606/change-orders.ts` |
| 3 | `lib/intelligence/synthetic/libraries/construction/asc606/claim-vs-change-order.ts` |
| 3 | `architecture-lane/k-v-cases/con-1/uninstalled-materials-gate.ts` |

Full per-file breakdown: `G1_errors_by_file.log`.

---

## 3. Errors by TS Error Code (All Codes, Descending)

| Count | Code | Description |
|---:|---|---|
| 58 | TS2307 | Cannot find module |
| 57 | TS2308 | Module has already exported a member (ambiguous re-export) |
| 35 | TS7006 | Parameter implicitly has an `any` type |
| 33 | TS18046 | `'err' is of type 'unknown'` |
| 27 | TS2345 | Argument not assignable to parameter |
| 13 | TS2352 | Conversion may be a mistake (insufficient overlap) |
| 12 | TS2554 | Expected N arguments, but got M |
| 11 | TS5097 | Import path ends with `.ts` extension |
| 9 | TS2322 | Type not assignable |
| 4 | TS2300 | Duplicate identifier |
| 3 | TS2559 | Type has no properties in common |
| 2 | TS2540 | Cannot assign to read-only property |
| 2 | TS4104 | `readonly` type not assignable to mutable |
| 1 | TS2561 | Object literal unknown property |
| 1 | TS1117 | Object literal duplicate property |
| 1 | TS2353 | Object literal unknown property |
| 1 | TS2339 | Property does not exist on type |
| 1 | TS2305 | Module has no exported member |

Full breakdown: `G1_errors_by_code.log`.

---

## 4. Errors by Directory

**Concentration:** Errors are **not** confined to `architecture-lane/k-v-cases/*`. The majority (78%) lie outside k-v-cases, primarily in `lib/intelligence`.

| Count | Directory |
|---:|---|
| 166 | `lib/intelligence` |
| 59 | `architecture-lane/k-v-cases` |
| 31 | `kpi/*` (doctrine import path drift) |
| 11 | `tests/verticals` |
| 2 | `architecture-lane/verifier-42-7f` |
| 2 | `industry-profiles/saas` |

Full breakdown: `G1_errors_by_dir.log`.

---

## 5. Per-Error-Category Root Cause & Proposed Fix Pattern

### TS2307 — Cannot find module (58) — **P6**

Three distinct clusters:

1. **KPI doctrine imports (31 errors):** Files under `kpi/*` import `../lib/intelligence/synthetic/standards/doctrine/contains*` — one `../` short; doctrine modules exist at `lib/intelligence/synthetic/standards/doctrine/`. **Fix:** Correct relative paths to `../../lib/intelligence/...` (or `@/` alias).

2. **LOCK-VC vertical type imports (5 errors):** `persistence-schema.ts`, `org-defaults.ts`, `vertical-default-resolver.ts` import `../../../../../src/verticals/{retail,manufacturing,nonprofit}/types` — one `../` short (resolves to `lib/src/...`). **Fix:** Use `../../../../../../src/verticals/...` or canonical `@/src/verticals/...` re-export.

3. **Scattered lib/intelligence gaps (22 errors):** Missing govcon doctrine paths (`../../../standards/govcon/doctrine`), saas `./soc2-tsc-runtime`, saas revenue `../handles` and `../errors`, prof-services `ps-audit-emitter` path, industry construction doctrine relative path. **Fix:** P6 path correction or add missing stub modules if files were never committed.

### TS2308 — Ambiguous barrel re-exports (57) — **P2/P6**

`industry/construction/index.ts`, `industry/prof-services/index.ts`, `libraries/construction/index.ts`, `libraries/prof-services/index.ts`, `libraries/saas/index.ts` each re-export multiple submodules that all export `evaluate`. **Fix:** Named re-exports (`export { evaluate as evaluateX } from '...'`) or stop wildcard re-exporting conflicting symbols.

### TS7006 — Implicit `any` parameters (35) — **P2**

Concentrated in k-v-cases `con-1/*` and `ps-1/*` helper functions (`runPoison(id, input)`, `runPoison(id, criteria)`). **Fix:** Add explicit parameter types matching evaluator signatures.

### TS18046 — `unknown` in catch blocks (33) — **P5**

All k-v-cases poison runners access `err.escalationAudits` without narrowing. **Fix:** `instanceof` guard on domain error type, or `if (err && typeof err === 'object' && 'escalationAudits' in err)` pattern; type-bridge only if no canonical error type exists.

### TS2345 / TS2322 — Assignability (36 combined) — **P1**

Dominant in `memoryCache.test.ts` (26) — `CacheEntry` generic mismatches in test fixtures. Secondary in construction asc606 library files. **Fix:** Align fixture types with `CacheEntry<T>` signature; update call sites if library signature is canonical.

### TS2554 — Wrong arity (12) — **P1**

All in `ps-1/*` — evaluator functions now expect 2 arguments; call sites pass 1. **Fix:** Add second argument per canonical evaluator signature (likely context/options param).

### TS2352 — Unsafe casts (13) — **P1**

`verifier-42-7f/caseMatrix.ts`, `extendedVerticalCases.ts` — `TreatmentResolution` cast from fixture union. **Fix:** `as unknown as TreatmentResolution` with `// G1: type-bridge` if fixture shape is intentional test stub.

### TS5097 — `.ts` extension imports (11) — **P6**

Five `*-2.verify.test.ts` files under `tests/verticals/` import with `.ts` suffix. **Fix:** Remove `.ts` from import paths.

### TS4104 — Readonly mismatch (2) — **P1**

`derivePanelDecisionContextPure.ts` — LOCK-VC `verticalContext` work made advisory arrays `readonly`; return type expects mutable `PanelAdvisorySummary[]`. **Fix:** Widen return type to `readonly PanelAdvisorySummary[]` or spread to mutable copy.

### TS2300 — Duplicate identifier (4) — **P2**

`industry-profiles/saas/profile.ts` — `classifySaaSSubSegment` declared twice. **Fix:** Remove duplicate declaration/export.

### Remaining singleton codes (5) — mixed P1/P2

Scattered one-offs in resolver handlers and library asc606 files.

---

## 6. Suggested Commit Split

| Commit | Scope | ~Errors | Patterns |
|---|---|---:|---|
| **C1** | `architecture-lane/k-v-cases/*` (con-1, ps-1, saas-1) | 59 | P5 (`unknown` err), P2 (implicit any), P1 (TS2554 arity) |
| **C2** | Barrel re-exports: `lib/intelligence/synthetic/industry/*/index.ts` + `libraries/*/index.ts` | 57 | P2/P6 (TS2308 named re-exports) |
| **C3** | Module resolution: `kpi/*` doctrine paths, govcon/saas handles, LOCK-VC `persistence-schema` + `org-edge/*` vertical imports | 58 | P6 (TS2307) |
| **C4** | `memoryCache.test.ts` + construction asc606 TS2345/TS7006 scatter in libraries | 35 | P1/P2 |
| **C5** | Verifier TS2352, `derivePanelDecisionContextPure` TS4104, `tests/verticals/*-2.verify.test.ts` TS5097, `industry-profiles/saas` TS2300 | 18 | P1/P6/P2 |
| **C6** | Remaining lib/intelligence scatter (saas revenue, prof-services ifrs, runtime guards, resolver handlers) | 44 | P1/P2/P6 mix |

**Total fix commits:** 6 (C1–C6). Hard gate after each: `npx tsc --noEmit` count must decrease; `npm run verify:phase-42-7f:all` must hold Meta 26/26, Main 435/435.

---

## 7. Risk Register

Errors requiring types or modules **outside** `architecture-lane/k-v-cases/*`:

| Risk | Files | External dependency | Severity |
|---|---|---|---|
| LOCK-VC regression | `persistence-schema.ts`, `org-defaults.ts`, `vertical-default-resolver.ts` | `src/verticals/{retail,manufacturing,nonprofit}/types` — wrong relative depth | **High** — fix is path-only; types exist |
| Verifier fixture casts | `caseMatrix.ts`, `extendedVerticalCases.ts` | `TreatmentResolution` from standards resolver types | Medium — may need type-bridge |
| Panel consumer readonly | `derivePanelDecisionContextPure.ts` | `PanelAdvisorySummary` return contract | Medium — signature widen vs copy |
| Missing govcon modules | `industry/govcon/doctrine.ts`, `types.ts`, `handles-wave2-supplement.ts` | `standards/govcon/*` tree may be incomplete | **High** — may need file creation or path fix |
| Missing saas revenue siblings | `libraries/saas/revenue/saas/*.ts` | `../handles`, `../errors` modules | Medium — confirm if files exist elsewhere |
| Doctrine path drift (kpi) | 31 `kpi/*` files | Doctrine modules exist; paths wrong | Low — mechanical fix |
| D0 extension | None at audit | `repoCompilesClean` is SHA-fill scope (Step 3), not fix chain | N/A |

No k-v-cases error requires D0 type extension. ps-1 arity fixes may need inspection of evaluator signatures in `lib/intelligence/synthetic/libraries/prof-services/`.

---

## 8. `tsconfig.json` Review

```json
{
  "compilerOptions": {
    "strict": true,          // ✓ enabled
    "noEmit": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ...],
  "exclude": ["node_modules"]   // ✓ only node_modules
}
```

| Check | Result |
|---|---|
| `strict: false` | **Not present** ✓ |
| `strictNullChecks` relaxed | **Not present** (inherits `strict: true`) ✓ |
| Over-broad `exclude` | **None** — only `node_modules` ✓ |
| Hidden-error risk | Full repo included via `**/*.ts` — all 271 errors are real surface |

**Conclusion:** No tsconfig relaxation or exclude expansion should be used during G1 fix chain. All 271 errors require source-level fixes.

---

## Artifacts

| File | Contents |
|---|---|
| `G1_tsc_raw_output.log` | Full `npx tsc --noEmit` stdout |
| `G1_errors_by_file.log` | Per-file error counts (top 20 captured above) |
| `G1_errors_by_code.log` | Per TS code counts |
| `G1_errors_by_dir.log` | Per-directory counts |

**Carries 5+ LOCK debt:** TSC errors persisted unchanged since LOCK-CON-2 era. Verifier passes; compiler does not.
