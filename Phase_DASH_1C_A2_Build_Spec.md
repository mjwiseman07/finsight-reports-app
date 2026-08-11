# Phase DASH_1C A2 — Build Spec

**Wave:** Accuracy Contract three-tier company resolver  
**Branch target:** `dash-1-scorecard-and-onboarding` (after approval)  
**Commit message (approved wording):**  
`fix(dash-1c-a2): three-tier resolver for Accuracy Contract endpoint with routing-tier lifecycle attribution`

## Goal

Align `GET /api/dashboard/accuracy-contract` company identity with Scorecard + sibling tile APIs (`ar-aging`, `cash-flow-trailing`): explicit client company → membership-validated slot → active-company helper → A1 `resolveCompanyIdForUser`. Stamp the winning **resolver tier** onto every Patent #6 `provenance-drawer-opened` emit.

## Out of scope

- Smoke / JWT / preview wait (post-approval only)
- Block B drawer UI (do not start; do not edit Block B spec)
- `resolveCompanyIdForUser` / `getActiveCompanyForUser` bodies (untouched)
- QBO SUCCESS-without-sync-completed hole (separate ticket — see `Phase_QBO_Sync_Receipt_Gap_Investigation.md`)

## Resolver tiers (strict order)

| Tier | Signal | Helper | Fail |
|------|--------|--------|------|
| 1 | `companyId` \| `company_id` query | `getActiveCompanyForUser(userId, preferred)` + **id must === preferred** | 403 `company_not_found_or_no_membership` |
| 2 | `pilot_slot_id` query | slot lookup with **`pilot_status IN ('active','trialing')` fail closed** → `getActiveCompanyForUser(userId, slot.company_id)` + id match | 403 `pilot_slot_not_found_or_no_membership` |
| 3 | (none) | `getActiveCompanyForUser(userId, null)` | fall through |
| 4 | (none) | `resolveCompanyIdForUser(admin, userId)` | fall through |
| 5 | — | — | 403 `no_active_company_for_user` |

**Fail-closed note (Tier 1/2):** `getActiveCompanyForUser` silently falls through to “first active membership” when a preferred id misses. A2 rejects unless `company.id === preferred` / `slotCompanyId` so a bad explicit signal cannot leak another company’s contract. Tier 2 also rejects inactive slots (`cancelled` / `complimentary` / `pending` / `converted`) via `pilot_status IN ('active','trialing')` — explicit `pilot_slot_id` never degrades to Tier 3/4.

**Tier 4 import:** static `import { resolveCompanyIdForUser } from "@/lib/integrations/accounting/resolve-company-id"` (dynamic import was an accidental Block A leftover; no circular dependency).

**Tier precedence:** If `companyId` is present, `pilot_slot_id` is ignored. Explicit params never fall through to Tier 3/4 on membership failure.

## Lifecycle attribution

On every successful path that emits (`if (contract) { void emit… }`, including cache hit):

```json
"routing": { "resolver_tier": "explicit_company_id" | "explicit_pilot_slot_id" | "active_company_fallback" | "resolver_fallback" }
```

- Column `actor_via` remains `dashboard-provenance-drawer` (CHECK constraint; no migration in A2).
- Tier lives in hash-chained `payload.routing.resolver_tier` (SoR-visible).

## ar-aging shape alignment

- Variable: `preferredCompanyId` from `companyId` \| `company_id`
- Helper: `getActiveCompanyForUser(userId, preferredCompanyId || null)`
- Accuracy Contract keeps firm auth (`requireFirmAuth`) and Acc Contract error envelope; only the **resolver** matches sibling pattern.

## Rules tie-in

### Rule 1 — No shortcuts / cutting-edge, no data-driven identity

**Evidence:** `resolveCompanyIdWithRoutingTier` comment block + body never consults `accounting_syncs`, receipts, or sync recency when choosing `companyId`. Missing receipts surface later as compose 409 / gate / sync 404 **after** identity is fixed.

### Rule 2 — Patent 6 SoR / chain receipts / lifecycle

**Evidence:** Existing `pilot.lifecycle.provenance-drawer-opened` emit retained; payload now includes `routing.resolver_tier`. Emit helper types require `routing` so callers cannot ship a 2xx contract without identity attribution. Chain hash covers routing because payload is insert body for the SoR trigger.

### Rule 3 — Memory that wows (identity provenance)

**Evidence:** Drawer-open receipt documents not only KPI / sync / chain_seq but **which session signal** selected the company — matches Scorecard memory (`dashboardCompanyId` / URL / active-report payload) when Block B passes `companyId`. Customers see custody of *who* and *which company context*, not only *what number*.

### Rule 4 — Cursor implements; Perplexity reviews before commit

**Evidence:** Implementation + review docs landed pre-commit:

- `Phase_DASH_1C_A2_Route_Diff.md` (full route)
- `Phase_DASH_1C_A2_Build_Spec.md` (this file)

Matt / Perplexity review gate before commit + push.

## Post-approval checklist (not run yet)

1. Commit with message above  
2. Push; wait for preview Ready  
3. Report preview URL + pre-smoke SQL baseline (max provenance `chain_seq` / counts)  
4. Matt runs smoke locally (with explicit `companyId` for Xero Demo and without-slot tier exercises)  
5. PR only after smoke green  

## Files

| File | Role |
|------|------|
| `app/api/dashboard/accuracy-contract/route.ts` | Resolver + emit stamp |
| `lib/lifecycle/emit-provenance-event.ts` | `ResolverTier` + required `routing` |
| `Phase_DASH_1C_A2_Route_Diff.md` | Review artifact |
| `Phase_DASH_1C_A2_Build_Spec.md` | This spec |
| `Phase_QBO_Sync_Receipt_Gap_Investigation.md` | Separate Rule 2 hole (scope only) |
