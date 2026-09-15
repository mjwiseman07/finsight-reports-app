# Review Assist Pro — authorization matrix (Phase B)

Branch: `security/ra-pro-identity-entitlement-pilot-cap`  
Scope: company-owned RA Pro subscription → linked firm workspace → `/reviewer` access.

**Production note:** Migration `supabase/migrations/20260915004500_ra_pro_firm_billing_company_id.sql` is **not applied to production in this PR**. Schema (`firms.billing_company_id`, activation RPC, protect trigger) lands with a later apply ceremony.

## Identity → entitlement chain

| Principal | Subscription owner | Linked firm | Client entities | Permitted `/reviewer` surfaces |
|-----------|--------------------|-------------|-----------------|--------------------------------|
| Signed-in firm member (`firm_memberships.status=active`) | Company row owning `pilot_slots` where `tier_key=review_assist_pro` | Firm with `billing_company_id = company.id` (server-set; unique) | `firm_clients` under that firm (included cap below) | Firm-scoped reviewer APIs after `filterReviewerAuthorizedFirmIds` |
| Same principal, firm **without** `billing_company_id` | N/A (legacy / RA base / solo BK firm-tier path) | Unlinked firm passes filter unchanged | Firm’s own clients | Legacy firm-tier `/reviewer` (no company RA Pro check) |
| Same principal, firm **with** `billing_company_id` but slot not authorizing | Company present but `pilot_status` not authorizing | Linked firm **dropped** from authorized set | No reviewer access via that firm | Deny (`403 forbidden` at auth layer when no firms remain) |
| Caller-supplied `firm_id` in Stripe checkout metadata | Rejected for RA Pro | Must not override server linking | — | Checkout activation fails closed (`unexpected_firm_id_on_ra_pro`) |

Canonical activation writes the company → firm link via `activate_review_assist_pro_subscription` (service role). Checkout must send `company_id` + buyer; it must **not** send `firm_id`.

## Canonical limits (decisions 1A / 2A / 3A)

| Constant | Value | Meaning |
|----------|------:|---------|
| `RA_PRO_INCLUDED_CLIENT_COMPANIES` | 2 | Included client-company entities under the linked firm |
| `RA_PRO_FIRM_SEATS` | 5 | Authorized firm-user seats on the linked workspace |
| `RA_PRO_PILOT_COHORT_CAP` | 10 | Global paid pilot cohort (`pilot_slot_number` 1..N) |

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
