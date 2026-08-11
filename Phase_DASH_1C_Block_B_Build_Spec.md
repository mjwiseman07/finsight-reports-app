# Phase DASH_1C Block B — Accuracy Contract Drawer UI (Build Spec)

**Date:** 2026-08-11 (refined vs A2 routing)  
**Branch:** `dash-1-scorecard-and-onboarding`  
**Upstream (shipped):** Block A + A1 + A2 — `GET /api/dashboard/accuracy-contract` (`app/api/dashboard/accuracy-contract/route.ts`)  
**Depends on:** `components/dashboard/Scorecard.tsx` `onOpenProvenance` affordance (link icon per tile)  
**Constraint:** Cursor-executable paste block. Do not invent fields beyond `AccuracyContract` in `lib/dashboard/accuracy-contract/types.ts`.  
**A2 routing (mandatory for Block B):** Production drawer fetches **must** pass explicit `companyId` (= `dashboardCompanyId` from `app/dashboard/page.jsx`). Do **not** rely on Tier 3/4 fallback — that resolves to the user’s first `company_users` row (often a non-pilot demo company) and yields `403 entitlement_denied`. Expect SoR emits with `routing.resolver_tier = "explicit_company_id"`. `pilot_slot_id` remains smoke/defense-in-depth only — not normal UX.

---

## 1) Goal / non-goals

### Goal

Wire the **Accuracy Contract drawer** (slide-over) to Scorecard tile provenance clicks so a signed-in owner executive sees the **memory-wow** stack for one KPI:

1. **Formula** — recursive factor tree (`FormulaNode`)
2. **Composition** — leaf-level source pointers with amounts
3. **Chain Receipt** — Patent #6 SoR row (`chain_receipt`: `event_id`, `chain_seq`, `row_hash`, `prev_hash`, `anchor_status`, …) plus (A2) identity routing when surfaced from the mint emit / optional future read of latest provenance payload
4. **Freshness** — sync + chain staleness (`freshness.is_stale`, `latest_sync_at`, seq comparison)

Data loads from Block A API. **Server already emits** `pilot.lifecycle.provenance-drawer-opened` on every successful GET (`emitProvenanceLifecycleEvent` in the route), now including `payload.routing.resolver_tier`. **Client must not emit lifecycle events** or duplicate that receipt.

### Non-goals (Block B)

- Block C: verify endpoint, TSR anchor UI, “Verify on chain” CTA, anchor URL deep-link actions beyond read-only display of `anchor_tsr_url` when present
- Editing KPI definitions, recomputing server-side, or bypassing cache
- New KPI codes beyond the five supported by Block A
- Marketing-page redesign; dashboard keeps **Scorecard product aesthetic** (charcoal cards, gold accent — not purple/cream AI themes)
- Replacing Scorecard tile values with contract values (drawer is provenance overlay only)
- Relying on Tier 3/4 (no-query) or `pilot_slot_id` for normal UX — **always pass `companyId`** (A2). Optional `pilot_slot_id` remains for smoke/defense only.

---

## 2) Files to create / edit

### Create

| Path | Purpose |
|------|---------|
| `lib/dashboard/accuracy-contract/client.ts` | Typed fetch helper + period/kpi mappers |
| `components/dashboard/accuracy-contract/AccuracyContractDrawer.tsx` | Slide-over shell, tabs, loading/error states |
| `components/dashboard/accuracy-contract/FormulaTab.tsx` | Renders `FormulaNode` tree |
| `components/dashboard/accuracy-contract/CompositionTab.tsx` | Table of `CompositionRow[]` + totals footer |
| `components/dashboard/accuracy-contract/ChainReceiptTab.tsx` | Read-only chain receipt panel (Patent #6 SoR) |
| `components/dashboard/accuracy-contract/FreshnessTab.tsx` | Sync time, chain seq, stale banner |
| `components/dashboard/accuracy-contract/drawer-utils.ts` | Shared formatters (currency/percent/unit), tab ids |
| `components/dashboard/accuracy-contract/__tests__/AccuracyContractDrawer.test.tsx` | Minimal RTL: open, tabs, pending copy, Escape close |

### Edit

| Path | Change |
|------|--------|
| `app/dashboard/page.jsx` | Replace hash stub in `onOpenProvenance` with drawer state + render `<AccuracyContractDrawer />` |
| `components/dashboard/Scorecard.tsx` | **No prop changes.** Optionally export tile→API kpi map constant if parent needs it (prefer keeping map in `client.ts` only). |

### Do not edit (Block B)

- `app/api/dashboard/accuracy-contract/route.ts` (Block A)
- `lib/dashboard/accuracy-contract/compose-contract.ts`, `gate.ts`, `cache.ts`
- `lib/lifecycle/emit-provenance-event.ts`

---

## 3) UX — drawer layout & states

### Shell pattern

Mirror `components/audit-ready/recon-face/WorkpaperSlideOver.tsx`:

- Fixed backdrop `bg-[#111112]/70 backdrop-blur-sm`
- Panel `max-w-2xl` (provenance is narrower than workpaper), `bg-[#111112]`, border `border-[#C9A961]/30`
- Header sticky; body scrollable
- `role="dialog"` `aria-modal="true"` `aria-labelledby="accuracy-contract-drawer-title"`
- Escape closes; backdrop click closes; body scroll locked while open
- Close button uses `focusRing()` from `components/site-ui.ts`

**Scorecard token alignment** (product UI, not marketing scope):

- Surfaces: `#111112` root, `#1B1B1D` inner cards, borders `#3A3A3D` / `#C9A961/20–40`
- Text: `#ECEBE7` primary, `#A29E93` muted, `#7A7974` faint
- Headings: `${headingFont}` — never `font-black`
- Primary actions (if any): `primaryCtaClass` — never `.premium-button`

### Header (always visible when loaded)

```
┌─────────────────────────────────────────────────────────┐
│ [kpi_label]                              [× Close]      │
│ [kpi_value_display] · [period]                          │
│ [computation_status badge] [cache.hit badge if true]    │
│ [stale pill if freshness.is_stale]                      │
├─────────────────────────────────────────────────────────┤
│ Formula | Composition | Chain Receipt | Freshness       │
├─────────────────────────────────────────────────────────┤
│ … tab body …                                            │
└─────────────────────────────────────────────────────────┘
```

- Title id: `accuracy-contract-drawer-title`
- Tab list: `role="tablist"`; panels `role="tabpanel"` with `aria-labelledby`
- Default tab on open: **Formula** (switch to Composition automatically when `computation_status === "pending_subledger"` and formula is null — optional UX nicety, not required for acceptance)

### Tab content (bind strictly to contract fields)

#### Formula

- If `contract.formula === null`: centered muted message (see pending copy below)
- Else: recursive tree for `FormulaNode`:
  - `kind: "ref"` → label, formatted amount (respect `contract.unit`), provider chip from `source.provider`, `source.sourceReport`, truncated `hierarchyPath.join(" › ")`
  - `kind: "sum"` → label + indented operand list
  - `kind: "div"` → label + numerator / denominator sub-trees
- Footer if `totals.variance_note`: amber-muted callout (use existing Scorecard-adjacent tone, not orange `#FF7A1A`)

#### Composition

- If `composition.length === 0`: same pending/empty copy as Formula
- Else: responsive table — columns: Label, Amount (unit-aware), Section, Source (provider + report), Contribution % when `contribution_pct != null`
- Footer row block from `totals`: `total_from_composition`, `reported_by_provider`, `variance` (show `variance_note` when set)

#### Chain Receipt (Patent #6 SoR — required visible)

Display all fields from `chain_receipt`:

| Field | Display |
|-------|---------|
| `event_id` | monospace, copy-friendly |
| `chain_seq` | `#${chain_seq}` |
| `company_chain_ordinal` | ordinal label |
| `row_hash` | monospace truncated + “Copy hash” |
| `prev_hash` | monospace or “Genesis” when null |
| `minted_at` | locale datetime |
| `event_kind` | literal |
| `anchor_status` | badge: `anchored` (success green semantic OK), `pending`, `not_anchored` |
| `anchor_tsr_url` | read-only link when non-null (opens new tab); **no verify action** |

Subheading copy (static): *“Every accuracy view is hash-chained to your company’s lifecycle log.”*

#### Freshness

- `latest_sync_at` → “Last sync” (or “Unknown” if null)
- `receipt_chain_seq` vs `latest_chain_seq_for_company`
- When `freshness.is_stale === true`: prominent banner — *“A newer chain event exists since this receipt was minted. Re-open after sync to refresh.”*
- Show `cache.computed_at` as “Contract computed at” (informational)

### Loading / error / domain states

| State | Trigger | UI |
|-------|---------|-----|
| **Loading** | fetch in flight | Skeleton or spinner in panel; disable tabs |
| **Error — 403** | `entitlement_denied` | “Accuracy Contract isn’t available on your current plan.” + Close |
| **Error — 404** | `no_company_for_user`, `no_sync_for_company` | Actionable copy: connect books / wait for sync |
| **Error — 400** | bad kpi/period | Dev-facing code in muted text; user message: “Couldn’t load provenance.” |
| **Error — network** | fetch throw | Retry button (calls same fetch) |
| **`pending_subledger`** | `computation_status === "pending_subledger"` | Banner above tabs: use **`contract.kpi_value_display`** as primary message (e.g. “Pending T12M cash-flow synthesis”, “Vertical north-star engine coming online”). Subtext: *“This KPI needs subledger data that isn’t in your current sync. Other scorecard tiles may still be live.”* Formula/Composition tabs show empty state pointing at banner; Chain Receipt + Freshness still render if present in payload. |
| **`computed`** | normal | All tabs populated |
| **Stale receipt** | `freshness.is_stale` | Pill in header + Freshness tab banner (drawer still usable) |

### KPI code mapping (important)

Scorecard north-star tile calls `onOpenProvenance(northStar.code)` (e.g. `operating_gross_margin`, `mrr_nrr`). Block A API accepts only:

`cash_position` | `net_profit_margin` | `net_op_cash_flow` | `ar_aging` | `north_star`

Implement in `client.ts`:

```typescript
const SUPPORTED_KPI_CODES = [
  "cash_position",
  "net_profit_margin",
  "net_op_cash_flow",
  "ar_aging",
  "north_star",
] as const;

/** Scorecard tile code → API kpi_code */
export function resolveApiKpiCode(tileCode: string): KpiCode | null {
  if ((SUPPORTED_KPI_CODES as readonly string[]).includes(tileCode)) {
    return tileCode as KpiCode;
  }
  // North-star tile uses industry-specific codes; API bucket is always north_star
  return "north_star";
}
```

Guard: if `resolveApiKpiCode` returns null (future unknown tile), drawer opens with error state — do not call API.

### Period derivation

API expects `period` matching `/^\d{4}-\d{2}(\.\.\d{4}-\d{2})?$/`.

From dashboard parent:

```typescript
/** Prefer end date of active report window → YYYY-MM */
export function deriveAccuracyContractPeriod(reportPeriod?: {
  startDate?: string;
  endDate?: string;
} | null): string {
  const iso = reportPeriod?.endDate ?? reportPeriod?.startDate;
  if (iso && /^\d{4}-\d{2}/.test(iso)) return iso.slice(0, 7);
  // fallback: current UTC month
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
```

Pass `period` **and** `companyId` (`dashboardCompanyId`) on every fetch. Do **not** pass `pilot_slot_id` in production UI. Do **not** omit `companyId` (Tier 3 will pick a non-pilot membership for multi-company users).

---

## 4) Wire Scorecard parent (`app/dashboard/page.jsx`)

### Current stub (remove)

```javascript
onOpenProvenance={(kpiCode) => {
  // DASH_1A.1 will wire this to the Accuracy Contract drawer.
  if (typeof window !== "undefined") {
    window.location.hash = `#accuracy-contract-${kpiCode}`;
  }
}}
```

### Target wiring

Add state near other dashboard overlays:

```javascript
const [provenanceDrawer, setProvenanceDrawer] = useState({
  open: false,
  tileKpiCode: null, // raw code from Scorecard
});
```

Handler:

```javascript
onOpenProvenance={(kpiCode) => {
  setProvenanceDrawer({ open: true, tileKpiCode: kpiCode });
}}
```

Render sibling to Scorecard (same conditional branch where Scorecard mounts):

```jsx
<AccuracyContractDrawer
  open={provenanceDrawer.open}
  tileKpiCode={provenanceDrawer.tileKpiCode}
  companyId={dashboardCompanyId}
  period={deriveAccuracyContractPeriod(activeReportContext?.reportPeriod)}
  onClose={() => setProvenanceDrawer({ open: false, tileKpiCode: null })}
/>
```

If `!dashboardCompanyId`, drawer should show an honest empty/error state (“Select or reconnect a company”) and **must not** call the API without `companyId`.

Drawer owns fetch lifecycle internally (fetch when `open && tileKpiCode && companyId`). Parent does **not** call lifecycle emitters.

---

## 5) API client helper

**File:** `lib/dashboard/accuracy-contract/client.ts`

```typescript
import type { AccuracyContract, KpiCode } from "./types";

export type AccuracyContractSuccess = {
  ok: true;
  request_id: string;
  duration_ms: number;
  contract: AccuracyContract;
};

export type AccuracyContractError = {
  ok: false;
  error: { code: string; [key: string]: unknown };
  request_id: string;
};

export async function fetchAccuracyContract(args: {
  kpiCode: KpiCode;
  period: string;
  /** A2: required — Scorecard dashboardCompanyId (Tier 1 explicit_company_id). */
  companyId: string;
  signal?: AbortSignal;
}): Promise<AccuracyContractSuccess> {
  const qs = new URLSearchParams({
    kpi_code: args.kpiCode,
    period: args.period,
    companyId: args.companyId,
  });
  const res = await fetch(`/api/dashboard/accuracy-contract?${qs}`, {
    method: "GET",
    credentials: "include",
    signal: args.signal,
  });
  const body = (await res.json()) as AccuracyContractSuccess | AccuracyContractError;
  if (!res.ok || !body.ok) {
    const code = body.ok === false ? body.error?.code : `http_${res.status}`;
    throw Object.assign(new Error(code), { code, status: res.status, body });
  }
  return body;
}
```

**Caching behavior:** rely on server `accuracy_contract_cache` — surface `contract.cache.hit` in UI (e.g. subtle “Cached” chip). Optional client memo: `Map<string, AccuracyContract>` keyed by `${kpiCode}:${period}` to avoid flicker on re-open within session; second network call should still return `cache.hit: true` from server.

**Abort:** abort in-flight fetch on drawer close or KPI change (`useEffect` cleanup).

---

## 6) Brand / a11y checklist

Before saving any component file:

- [ ] Grep banned tokens (Tier A global): no `FF7A1A`, `premium-button`, `AdvisacorLogo`, `font-black`, etc.
- [ ] Accent only `#C9A961` / hover `#DFC084`
- [ ] Interactive elements: `focusRing()` or gold ring offset `#111112`
- [ ] Focus trap inside drawer while open (tab cycles within dialog; consider simple `focus-trap-react` only if already in deps — otherwise manual first/last focusable)
- [ ] Escape closes drawer (match WorkpaperSlideOver)
- [ ] Restore focus to provenance trigger button on close (store `document.activeElement` or trigger ref)
- [ ] `aria-live="polite"` on loading → loaded transitions
- [ ] Monospace hashes must remain readable (`text-xs`, break-all)
- [ ] No client-side `emitProvenanceLifecycleEvent` / no POST to lifecycle endpoints for drawer open

---

## 7) Acceptance criteria / smoke

### Manual (dashboard)

1. Sign in as owner executive with connected books and active pilot slot.
2. Click link icon on **Cash Position** → drawer opens; network request includes **`companyId=<dashboardCompanyId>`** (never omit; never send `pilot_slot_id` in production).
3. Response includes `contract.chain_receipt.row_hash`; Chain Receipt tab shows it.
4. Close drawer; re-open same tile → network response has `contract.cache.hit === true` (second open).
5. Click **Net Op Cash Flow** (or **north star** tile) → `computation_status === "pending_subledger"` shows `kpi_value_display` banner; drawer does not crash on empty formula/composition.
6. Escape closes drawer; focus returns to link button.
7. Confirm lifecycle: **only one** new `pilot.lifecycle.provenance-drawer-opened` row per open (server-side from GET). Client bundle has **zero** calls to lifecycle emit helpers.

### API smoke (PowerShell / curl — authenticated cookie or Bearer)

```powershell
# First open — expect cache.hit false (or true if warmed)
curl -s -H "Authorization: Bearer $JWT" `
  "$BASE/api/dashboard/accuracy-contract?kpi_code=cash_position&period=2026-07" | jq '.contract.cache.hit, .contract.chain_receipt.chain_seq'

# Second identical call — expect cache.hit true
curl -s -H "Authorization: Bearer $JWT" `
  "$BASE/api/dashboard/accuracy-contract?kpi_code=cash_position&period=2026-07" | jq '.contract.cache.hit'
```

```powershell
# Pending KPI
curl -s -H "Authorization: Bearer $JWT" `
  "$BASE/api/dashboard/accuracy-contract?kpi_code=net_op_cash_flow&period=2026-07" | jq '.contract.computation_status, .contract.kpi_value_display'
```

### Automated

- `AccuracyContractDrawer.test.tsx`: render with mocked fetch → Formula tab shows tree; pending contract shows banner text; Escape calls `onClose`.
- `npm run type-check` passes.
- `npm run brand:lint` passes on touched component files.

---

## 8) Out of scope (Block C and later)

| Item | Phase |
|------|-------|
| Verify / challenge flow against chain | Block C |
| TSR anchor submission UI | Block C |
| Deep link `#accuracy-contract-${kpiCode}` routing | Optional follow-up; remove stub hash navigation |
| North-star per-industry factorization (real formula/composition) | Backend/kpi-factorization follow-up |
| Entitlement widening (`converted`, etc.) | A1 investigation — do not change `gate.ts` in Block B |
| Drawer analytics / duplicate lifecycle telemetry | Never on client |

---

## 9) Proposed commit message

```
feat(dashboard): wire Accuracy Contract provenance drawer (DASH_1C Block B)

Replace Scorecard provenance hash stub with a slide-over drawer that
loads GET /api/dashboard/accuracy-contract and renders formula,
composition, chain receipt, and freshness tabs. Server lifecycle receipt
on GET is preserved; client does not double-emit.
```

---

## Reference snippets

### API success shape (Block A)

```typescript
// lib/dashboard/accuracy-contract/types.ts — AccuracyContract
{
  kpi_code, kpi_label, kpi_value_numeric, kpi_value_display, unit, period,
  computation_status: "computed" | "pending_subledger",
  formula: FormulaNode | null,
  composition: CompositionRow[],
  totals: { total_from_composition, reported_by_provider, variance, variance_note },
  chain_receipt: ChainReceipt,
  freshness: { latest_chain_seq_for_company, receipt_chain_seq, is_stale, latest_sync_at },
  cache: { hit: boolean, computed_at: string }
}
```

### Scorecard provenance affordance (unchanged)

```tsx
// components/dashboard/Scorecard.tsx
onProvenance={() => onOpenProvenance("cash_position")}
// … per tile; north star uses onOpenProvenance(northStar.code)
```

### Server emit (do not duplicate client-side)

```typescript
// app/api/dashboard/accuracy-contract/route.ts — on success only
void emitProvenanceLifecycleEvent({ … event_kind: "pilot.lifecycle.provenance-drawer-opened" … });
```

---

**End of Block B build spec.**
