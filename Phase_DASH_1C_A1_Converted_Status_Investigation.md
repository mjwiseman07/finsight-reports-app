# Phase DASH_1C A1 — `pilot_status = 'converted'` investigation

**Date:** 2026-08-10  
**Branch:** `dash-1-scorecard-and-onboarding`  
**Context:** A1 `resolveCompanyId` fix is local (uses `resolveCompanyIdForUser`). No commit / PR / smoke until this report is reviewed.  
**Constraint:** Do not modify `gate.ts` or `resolveCompanyIdForUser` based on this file until product owner decides.

---

## 1) Grep: `'converted'` near pilot / slot / status

Command (PowerShell equivalent of the requested filter):

```text
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.sql lib,app,supabase
  | Select-String -Pattern "'converted'|\"converted\""
```

**Pilot / slot / status hits (verbatim lines):**

```text
supabase/migrations/20260708120000_tcp1_w1_solo_bk_pilot_slots.sql:38:
  CHECK (pilot_status IN ('pending','active','converted','cancelled','complimentary')),

supabase/migrations/20260808043000_accounting_syncs_company_fk_and_backfill.sql:20:
  AND ps.pilot_status IN ('active', 'trial', 'converted')

supabase/migrations/20260808043000_accounting_syncs_company_fk_and_backfill.sql:48:
  AND ps.pilot_status IN ('active', 'trial', 'converted')

lib/integrations/accounting/resolve-company-id.ts:10:
  const ACTIVE_PILOT_STATUSES = ["active", "trial", "converted"] as const;
```

**Non-pilot noise (excluded from semantics):**

```text
lib/intelligence/synthetic/types/recommendation.ts:15:
  export type SyntheticRecommendationCandidateStatus = ... | "converted" | ...
```

No other `lib/` / `app/` writers of `pilot_status: "converted"` were found.

---

## 2) Code paths that WRITE `pilot_status = 'converted'`

**None found.**

Searches for:

- `pilot_status: "converted"` / `'converted'`
- `pilot_status = 'converted'`
- Assignment via Stripe map targeting `'converted'`

**Stripe webhook path (`lib/subscription-sync.js` → `reconcilePilotSlotStatus`):**

```js
export const STRIPE_TO_PILOT_STATUS = Object.freeze({
  active: 'active',
  trialing: 'active',
  past_due: 'active',
  unpaid: 'cancelled',
  paused: 'cancelled',
  canceled: 'cancelled',
  incomplete_expired: 'cancelled',
  incomplete: null,
});
```

Comments in that file (research-locked):

- Stripe `active` / `trialing` / `past_due` → pilot **`active`**
- Stripe `unpaid` / `paused` / `canceled` / `incomplete_expired` → pilot **`cancelled`**
- Stripe `incomplete` → leave pilot row untouched

**Other writers:**

| File | Function | Sets |
|------|----------|------|
| `lib/lifecycle/ensure-anchor.ts` | `ensureLifecycleAnchor` | `pilot_status: "active"` |
| `lib/tcp1/stripe-pilot-checkout.ts` | checkout create path | `pilot_status: "active"`; cancel update → `"cancelled"` |
| `lib/subscription-sync.js` | `reconcilePilotSlotStatus` | only mapped values above (`active` / `cancelled`) |

**Schema origin only:**  
`supabase/migrations/20260708120000_tcp1_w1_solo_bk_pilot_slots.sql` — CHECK includes `'converted'` as an allowed enum member (`pending|active|converted|cancelled|complimentary`). No seed row in that migration sets `converted`.

**Live row count (2026-08-10, via service-role select on `pilot_slots`):**

```json
{
  "total": 14,
  "counts": {
    "complimentary": 4,
    "cancelled": 4,
    "active": 6
  }
}
```

`converted_sample_count=0`

---

## 3) Code paths that READ `pilot_status = 'converted'` (and could grant access)

| File | Function | Behavior |
|------|----------|----------|
| `lib/integrations/accounting/resolve-company-id.ts` | `resolveCompanyIdForUser` | Filters `.in("pilot_status", ["active","trial","converted"])`, orders `updated_at DESC`, returns that `company_id`. **This is a company-resolution helper, not a feature entitlement.** |
| `supabase/migrations/20260808043000_accounting_syncs_company_fk_and_backfill.sql` | one-time backfill SQL | Same triad used to pick a company when backfilling `accounting_syncs.company_id` |

**Not readers of `converted`:**

| File | Function | Status filter |
|------|----------|---------------|
| `lib/dashboard/accuracy-contract/gate.ts` | `checkAccuracyContractGate` | `['active', 'trialing']` only |
| `lib/pulse-je/entitlement.ts` | pulse JE entitlement | `active` \|\| `complimentary` |
| `lib/entitlements.ts` | slot → entitlement mapping | special-case `complimentary`; passes through `pilot_status` without a `converted` branch |

Note: DB CHECK allows `pending|active|converted|cancelled|complimentary`. It does **not** list `trial` or `trialing`. So:

- `resolveCompanyIdForUser`'s `"trial"` literal is currently **dead** against schema CHECK (no row can hold `trial` unless the constraint was widened without a matching migration in-repo).
- `gate.ts`'s `"trialing"` is likewise **dead** against the published CHECK (Stripe `trialing` is written as pilot `active` by subscription-sync).

---

## 4) Downstream entitlement between resolver and real feature serve

**Yes — for Accuracy Contract there is a second gate.**

Flow in `app/api/dashboard/accuracy-contract/route.ts`:

1. `resolveCompanyId` → (after A1 local edit) `resolveCompanyIdForUser`  
   → may return a company whose newest matching slot is theoretically `converted`.
2. `checkAccuracyContractGate(admin, { userId, companyId })`  
   → requires active `company_users` membership **and** a `pilot_slots` row with `pilot_status IN ('active','trialing')`.

So a company resolved only because of a `converted` slot would still get:

```json
{ "code": "entitlement_denied", "reason": "no_active_pilot_slot" }
```

unless another slot on that same company is `active`/`trialing`.

**Broader caveats (outside Block A route):**

- Other call sites of `resolveCompanyIdForUser` (write-boundary / accounting sync metadata) use it to stamp `company_id`, **not** as a product entitlement. Entitlement for paid features typically lives in `lib/entitlements*` / Stripe subscription status / pulse JE checks.
- Accepting `converted` in the resolver therefore means: “prefer this company as identity SoR if such a slot exists,” **not** “grant paid Accuracy Contract access.” For Block A specifically, gate is the entitlement layer.

---

## 5) Stripe state for a `converted` slot

**Unknown / unused in current writers.**

- No webhook path stamps `converted`.
- Paying / trial / past_due subs are stamped **`active`**.
- Terminal Stripe statuses stamp **`cancelled`**.
- Live DB has **0** `converted` rows.

Therefore there is **no observed typical pairing** of `pilot_status='converted'` ↔ `subscriptions.status='active'`. If historical rows ever existed, they predate/outlive the current `STRIPE_TO_PILOT_STATUS` map and are not maintained by it.

`pilot_converts_at` exists as a column (selected in `lib/entitlements.ts`) — naming implies “when trial converts” — but no in-repo writer sets status to `converted` when that fires.

---

## 6) One-sentence semantic answer

**(c) Something else — schema-reserved / legacy enum member from TCP1 W1 that is never written by current Stripe or app paths; live data has zero rows; not “still paying” (that is `active`) and not “awaiting paid conversion” (that path is also stamped `active` while Stripe `trialing`, or simply never created).**

---

## 7) Implications for A1 / harmonization (decision pending — no code)

| Option | Meaning |
|--------|---------|
| Keep `converted` in resolver allow-list | Harmless today (0 rows); theoretically could resolve identity to a zombie company if a row appeared without an `active` sibling. Block A gate still denies Accuracy Contract. |
| Remove `converted` (and dead `trial`) from resolver | Cleanup / defense-in-depth; matches what writers actually produce (`active`/`cancelled`/`complimentary`/`pending`). |
| Widen `gate.ts` to include `converted` | **Not indicated** by evidence — would invent entitlement for a status Stripe never writes. |

**Recommended product call (evidence-based, not applied):** treat `converted` as **dead legacy**; remove it (and `"trial"`) from `resolveCompanyIdForUser` in the same A1 commit **or** a tiny follow-up, and leave `gate.ts` on `active` (+ note that `trialing` is already dead vs CHECK / Stripe map). Do **not** add `converted` to `gate.ts`.

---

## 8) Local A1 state (not committed)

- `app/api/dashboard/accuracy-contract/route.ts` — fallback uses `resolveCompanyIdForUser` instead of `ORDER BY created_at ASC LIMIT 1`.
- `package.json` — `"type-check": "tsc --noEmit"` added.
- Waiting on PO decision before commit / smoke-without-slot / PR.
