# Review Assist Pro — authorization matrix (Phase B)

Branch: `security/ra-pro-identity-entitlement-pilot-cap`  
Scope: company-owned RA Pro subscription → linked firm workspace → `/reviewer` access.

**Production note:** Migration `supabase/migrations/20260915004500_ra_pro_firm_billing_company_id.sql` is **not applied to production in this PR**. Schema (`firms.billing_company_id`, activation RPC, protect trigger) lands with a later apply ceremony.

**Cutover decision:** Operator ceremony bound **NO_CUTOVER × 4** (internal smoke/demo). **No backfill.** See `docs/security/ra-pro-cutover-operator-decision.json` and `docs/security/ra-pro-cutover-runbook.md`. Commerce gate: `RA_PRO_CUTOVER_COMMERCE_GATE`.

**Seal authority:** Only committed Git **LF** blobs are authoritative — migration (`docs/security/ra-pro-migration-seal.md`) and operator decision record (`docs/security/ra-pro-decision-record-seal.md`). CRLF worktree digests are superseded and non-authoritative.

**Pilot cohort occupancy:** Every `pilot_slots` row with `pilot_slot_number` in **1..10** occupies capacity regardless of `pilot_status`. Cancelled / failed / expired / otherwise non-active numbered slots are **not** recycled until a separately reviewed reclamation policy exists. Checkout and activation must use the same rule (`lib/review-assist-pro/limits.ts` + activation RPC).

## Identity → entitlement chain

| Principal | Subscription owner | Linked firm | Client entities | Permitted `/reviewer` surfaces |
|-----------|--------------------|-------------|-----------------|--------------------------------|
| Signed-in firm member (`firm_memberships.status=active`) | Company row owning `pilot_slots` where `tier_key=review_assist_pro` with authorizing status | Firm with `billing_company_id = company.id` (server-set; unique) | `firm_clients` under that firm (included cap below) | Firm-scoped reviewer APIs after `filterReviewerAuthorizedFirmIds` |
| Same principal, firm **without** `billing_company_id` | N/A | Unlinked firm **denied** | No `/reviewer` access | Deny (`403 forbidden` when no entitled firms remain) |
| Same principal, firm **with** `billing_company_id` but slot not authorizing | Company present but `pilot_status` not authorizing | Linked firm **dropped** | No reviewer access via that firm | Deny |
| Review Assist base / Solo Bookkeeper firm membership only | Firm-entity pilot slot (if any) does **not** authorize `/reviewer` | Unlinked or non–RA Pro | Their customer UI is a separate workstream | Deny |
| Caller-supplied `firm_id` in Stripe checkout metadata | Rejected for RA Pro | Must not override server linking | — | Checkout activation fails closed (`unexpected_firm_id_on_ra_pro`) |

Canonical activation writes the company → firm link via `activate_review_assist_pro_subscription` (trusted DB role only). Checkout must send `company_id` + buyer; it must **not** send `firm_id`. Buyer must have an active `company_users` row for that company inside the activation transaction.

**No grandfathering:** ordinary firm membership alone never grants `/reviewer`.

## Canonical limits (decisions 1A / 2A / 3A)

| Constant | Value | Meaning |
|----------|------:|---------|
| `RA_PRO_INCLUDED_CLIENT_COMPANIES` | 2 | Included client-company entities under the linked firm |
| `RA_PRO_FIRM_SEATS` | 5 | Authorized firm-user seats on the linked workspace |
| `RA_PRO_PILOT_COHORT_CAP` | 10 | Global pilot cohort occupancy (`pilot_slot_number` 1..N; status ignored) |

**Capacity locking (DB):** Linked-firm client/seat mutations require **READ COMMITTED**. Higher isolation raises `ra_pro_capacity_isolation_unsupported` before mutation. Guards take per-firm **nonblocking** transaction advisory locks (`ra_pro_capacity_lock_busy` on contention). Callers must ROLLBACK and retry the full transaction — no DB auto-retry. See `docs/security/ra-pro-migration-seal.md`.

**Checkout bootstrap (DB):** `bootstrap_checkout_firm_workspace` / `bootstrap_checkout_company_workspace` create firm+membership or company+owner atomically (service_role only). No app-side DELETE compensation. Capacity lock/isolation failures map to sanitized HTTP 503 `workspace_bootstrap_retryable` before Stripe customer/session create.

Keep in sync across:

- `lib/review-assist-pro/limits.ts` (source of truth)
- `lib/entitlements.ts` `TIER_META.review_assist_pro` (`max_entities`, `firm_seats`)
- `lib/product-tiers.js` `TIERS.review_assist_pro.entitlements` + `REVIEW_ASSIST_PRO_BASE_LIMITS`

## Lifecycle (Stripe → pilot → access)

Mapping lives in `lib/subscription-sync.js` (`STRIPE_TO_PILOT_STATUS`). RA Pro `/reviewer` authorization uses `isRaProAuthorizingPilotStatus` (`active` | `complimentary`).

| Stripe `subscription.status` | Pilot status | `/reviewer` access |
|------------------------------|--------------|--------------------|
| `active` | `active` | Allow |
| `trialing` | `active` | Allow |
| `past_due` | `active` (grace) | Allow |
| `unpaid` | `cancelled` | Deny |
| `canceled` | `cancelled` | Deny |
| `paused` | `cancelled` | Deny |
| `incomplete_expired` | `cancelled` | Deny |
| `incomplete` | (no overwrite) | Deny until active |

**Reactivation:** Restoring an authorizing Stripe status maps back to `pilot_status=active` on the **same** `pilot_slots` row / company owner. The firm’s `billing_company_id` link is not rewritten by status sync — reactivation restores access through the existing company → firm link.

**Complimentary** slots (`pilot_status=complimentary`) also authorize `/reviewer` for the linked firm (same filter path as `active`).

## Checkout webhook outcomes

`handleTcp1CheckoutCompleted` returns an explicit outcome. Ledger finalization is
lease-token gated via `claim_stripe_webhook_event` /
`finalize_stripe_webhook_event` (no DELETE-on-retry).

| Outcome | Ledger | HTTP (TCP1 webhook) |
|---------|--------|---------------------|
| `handled` | `processed` | 200 |
| `not_applicable` | `skipped` | 200 |
| `permanent_conflict` | `failed_conflict` | 200 |
| `retryable_failure` | `retryable` (reclaimable) | 500 |
| Active lease held by another worker | unchanged | 409 |
| Terminal duplicate delivery | unchanged | 200 `duplicate` |

See `docs/security/ra-pro-webhook-reconciliation.md` and
`docs/security/ra-pro-cutover-derivation.md`.

## Fixture impact inventory (non-production)

Demo constants (`lib/demo/constants.ts` / `DEMO_FIRMS`): **2** demo firms.

| Fixture firm | `billing_company_id` after seed | `/reviewer` after this change |
|--------------|---------------------------------|-------------------------------|
| Advisacor Demo — Review Assist Firm | unset (RA base) | **Denied** (intentional; base UI is a later workstream) |
| Advisacor Demo — Review Assist Pro Firm | set to RA Pro company | Allowed when membership + authorizing slot present |

Sanitized count: **1 of 2** demo firms lose `/reviewer` via membership alone. No production inventory was queried under this authorization.
