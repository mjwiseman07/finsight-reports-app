# PR — Block A + A1 + A2 (Accuracy Contract server foundation)

**Title:** `feat(dash-1c): Block A + A1 + A2 — Accuracy Contract server foundation`

**Base:** `main` ← **Head:** `dash-1-scorecard-and-onboarding`

**Status:** Open for review — **DO NOT MERGE** until Matt approves the diff summary.

---

## 1. Summary

This wave ships the Accuracy Contract **server foundation** end-to-end for DASH_1C. **Block A** adds `GET /api/dashboard/accuracy-contract` with entitlement gate, KPI factorization/cache, and Patent #6 hash-chained `provenance-drawer-opened` emits. **A1** aligns `resolveCompanyIdForUser` with live pilot statuses (`active` | `trialing`) and documents that `converted`/`trial` are dead. **A2** replaces ad-hoc company resolution with a three-tier + fallback identity resolver matching sibling dashboard APIs, and stamps `payload.routing.resolver_tier` onto every successful provenance emit so SoR receipts prove **which identity signal** selected the company — not only which KPI value was shown.

## 2. Block A — what shipped

Commit: `bc907c59`

- Migrations: widen provenance `event_kind` / `actor_via`; `accuracy_contract_cache` + RLS; lifecycle scan indexes
- Modules: `lib/lifecycle/emit-provenance-event.ts`, `lib/dashboard/accuracy-contract/*` (types, factorization, compose, cache, gate)
- Route: `GET /api/dashboard/accuracy-contract`
- **Emit policy:** every successful 2xx response with a `contract` (including **cache hit**) emits `pilot.lifecycle.provenance-drawer-opened`

## 3. A1 — allow-list fix + investigation

Commit: `d0c53e8f`

- Acc Contract company fallback → `resolveCompanyIdForUser` (not oldest `company_users` by `created_at`)
- Allow-list fixed: `["active","trialing"]` (removed dead `trial` / `converted`)
- Gate remains `active|trialing` only
- Investigation: [`Phase_DASH_1C_A1_Converted_Status_Investigation.md`](./Phase_DASH_1C_A1_Converted_Status_Investigation.md) — **(c) legacy schema-reserved**; Stripe maps paying/trial → pilot `active`; **0** `converted` rows; do not widen gate
- A1b: no live views/funcs/indexes on stale tuple — no empty migration
- Adds `npm run type-check`

## 4. A2 — three-tier resolver + Rule 2 routing attribution

Commit: `a1369379`

Resolver order (fail closed on explicit signals; never data-driven):

1. Explicit `companyId` / `company_id` → `getActiveCompanyForUser` + id must match preferred → else 403 `company_not_found_or_no_membership`
2. Explicit `pilot_slot_id` → slot where **`pilot_status IN ('active','trialing')`** → membership on `slot.company_id` → else 403 `pilot_slot_not_found_or_no_membership` (never degrade to tier 3/4)
3. `getActiveCompanyForUser(userId, null)` → `active_company_fallback`
4. `resolveCompanyIdForUser` → `resolver_fallback`
5. Else 403 `no_active_company_for_user`

Lifecycle: every 2xx emit includes required

```json
"routing": { "resolver_tier": "explicit_company_id" | "explicit_pilot_slot_id" | "active_company_fallback" | "resolver_fallback" }
```

(`actor_via` remains CHECK-allowlisted `dashboard-provenance-drawer`; tier is chain-hashed in `payload`.)

Specs: [`Phase_DASH_1C_A2_Build_Spec.md`](./Phase_DASH_1C_A2_Build_Spec.md), [`Phase_DASH_1C_A2_Route_Diff.md`](./Phase_DASH_1C_A2_Route_Diff.md).

## 5. Smoke evidence

### Prior with-slot smoke (Block A)

Host: `advisacor-dv0ifc00n-advisacor.vercel.app` · commit `bc907c59` · forced `pilot_slot_id` (Xero Demo)

| Call | Status | Notes |
|------|--------|-------|
| cash_position ×2 | 200 / 200 | fresh then `cache.hit: true` |
| net_op_cash_flow | 200 | `pending_subledger` |
| north_star | 200 | `pending_subledger` |
| bogus | 400 | `kpi_unsupported` |

Provenance for company `02edb6c6-…`: **+4** at `chain_seq` **67 / 69 / 71 / 73**.

### A2 Sub-test 1 — Tier 1 explicit `companyId` (GREEN)

Host: `https://advisacor-mp478nv10-advisacor.vercel.app` · commit `a1369379` · `companyId=02edb6c6-a4f1-4bae-825d-2680136dad24`

| Call | Status | Notes |
|------|--------|-------|
| cash_position ×2 | 200 / 200 | cache hit confirmed |
| net_op_cash_flow | 200 | `pending_subledger` |
| north_star | 200 | `pending_subledger` |
| bogus | 400 | `kpi_unsupported` |

Provenance baseline → post: count **4 → 8**; new `chain_seq` **75 / 77 / 79 / 81** (strictly > baseline **73**).  
All four emits: `payload.routing.resolver_tier = "explicit_company_id"`.

### A2 Sub-tests 2 & 3 — expected 403 (design consequence, not bug)

| Sub-test | Observed | Why not a bug |
|----------|----------|----------------|
| **2** no signal | 403 `entitlement_denied` / `no_active_pilot_slot` | Tier 3 picked oldest `company_users` membership (**Blue Ridge**, no active/trialing pilot); gate correctly denied. Rule 1 — no routing by receipt/sync. |
| **3** `pilot_slot_id=30c3699c-…` | 403 `pilot_slot_not_found_or_no_membership` | Slot is **complimentary** with `company_id=null`; Q1 fail-closed `active\|trialing` filter rejected. Happy-path Tier 2 re-smoke deferred to Block B (drawer always passes `companyId`). |

## 6. Rule tie-ins

- **Rule 1 — no shortcuts / no data-driven identity:** A2 comment block + resolver never consult receipts, sync recency, or data availability when choosing `companyId`. Explicit bad slots/companies fail closed.
- **Rule 2 — Patent #6 SoR / chain receipts:** Every 2xx contract path emits hash-chained `provenance-drawer-opened`; `routing.resolver_tier` is required on the emit payload type (compile-time) and appears in minted rows.
- **Rule 3 — memory that wows:** Receipt shows not only KPI/sync/chain_seq but **which session signal** selected company identity — ready for Block B drawer to surface.
- **Rule 4 — Cursor + Perplexity:** Cursor implemented 100%; Perplexity/Matt reviewed A2 Route Diff + Build Spec pre-commit (including Q1 status filter fix).

## 7. Design consequence noted

Tier 3 fallback resolves to the user’s **oldest / first** active `company_users` row via `getActiveCompanyForUser(userId, null)`, **regardless of `pilot_status`**. That matches sibling APIs (`ar-aging`, `cash-flow-trailing`). **Not blocking:** Block B drawer will always pass explicit `dashboardCompanyId` as `companyId`. **Post-launch v1.1:** server-side `user_sessions.active_company_id` (or equivalent) as truth source for “current company.”

## 8. Non-goals

- Block B Accuracy Contract drawer UI (spec only; refine after this PR opens — **no Block B code in this PR**)
- Block C verify / TSR anchor
- Ask Pulse Command Center

## Schema Drift Acknowledgement

Main's `pilot_status` CHECK constraint does not include `trialing`. Preview does (added by DASH_1B.2 widening migration, not included in this PR to keep scope surgical). DASH_1C code is defensive: A1 allow-list and A2 tier-2 slot filter both include `trialing`, but on main these queries return 0 rows for that status. This is correct behavior — no live rows use `trialing` today. Follow-up PR must include the DASH_1B.2 widening migration to close the drift before any production writer sets `trialing`.

## Isolation note (Rule 1)

This PR is cut via **δ surgical helpers** onto `main` (not the mega `dash-1-scorecard-and-onboarding` branch):

1. `chore(dash-1c-prep)` — content-only extracts of `resolve-company-id.ts` (A1 tip) + `active-company.ts` (DASH_1A tip)
2. Cherry-picks of Block A → A1 → A2 → docs

Does **not** include L2 `service.ts` / xero callback / FK migration, Scorecard UI, DASH_1B, or WBP. See `DASH_1C_Cherry_Pick_Dependency_Trace.md` / `DASH_1C_Surgical_Helper_Verification.md` (local verification artifacts; optional follow-up commit if desired).

## 9. Follow-ups tracked

- [`Phase_QBO_Sync_Receipt_Gap_Investigation.md`](./Phase_QBO_Sync_Receipt_Gap_Investigation.md) — QBO SUCCESS sync without `accounting-sync-completed` (separate Rule 2 hole; do not fix here)
- Repo-wide `lint --fix` debt (pre-existing)
- Server-side active-company truth source (v1.1)
- **Schema drift close-out:** land DASH_1B.2 `pilot_status` / lifecycle widenings so `trialing` is schema-legal before writers use it

## Commits (Accuracy Contract wave)

- surgical prep — helpers only (`resolve-company-id` + `active-company`)
- Block A — Accuracy Contract server foundation
- A1 — resolver allow-list + type-check + investigation docs
- A2 — three-tier resolver + routing-tier lifecycle attribution
- docs — combined PR description + Block B routing refine

## Test plan

- [x] `npm run type-check` clean for Acc Contract paths (after clearing stale `.next` from other branch)
- [x] Block A with-slot smoke (seqs 67–73) on prior preview
- [x] A2 Sub-test 1 explicit `companyId` smoke (seqs 75–81 + `explicit_company_id`)
- [x] A2 Sub-tests 2/3 expected 403 documented
- [ ] Matt reviews isolated PR diff before merge
- [ ] Do **not** merge / do **not** promote from draft until Matt says go
