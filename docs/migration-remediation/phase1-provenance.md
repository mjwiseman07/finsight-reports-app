# Phase1 migration SQL provenance

**Status:** NOT RECOVERED in this review gate.

| Production version | Name | Git | Fetch | Provenance |
|------------------:|------|-----|-------|------------|
| `20260701043602` | `phase1_subscriptions_core` | **Absent** | **Blocked** (CLI auth) | Unknown |
| `20260701043707` | `phase1_subscription_seats_and_entitlements` | **Absent** | **Blocked** | Unknown |
| `20260701043911` | `phase1_backward_compat_view` | **Absent** | **Blocked** | Unknown |
| `20260701043931` | `phase1_entitlement_rls_policies` | **Absent** | **Blocked** | Unknown |

## Evidence

- `git log --all -- "**/phase1_*"` → empty (never committed).
- Track C application code references these migrations by name only.
- `tests/entitlements/subscription-sync-schema-contract.test.ts` captures **column lists** from production `information_schema` — not DDL.

## Reconstructed schema hints (NOT original SQL)

From application contracts — **do not treat as migration bodies**:

### `subscriptions` columns

`id`, `subscriber_type`, `subscriber_id`, `stripe_customer_id`, `stripe_subscription_id`, `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `canceled_at`, `trial_start`, `trial_end`, `metadata`, `created_at`, `updated_at`, `first_paid_charge_at`

### `subscription_items` columns

`id`, `subscription_id`, `stripe_subscription_item_id`, `stripe_price_id`, `tier_key`, `lookup_key`, `track`, `cadence`, `quantity`, `metered`, `is_addon`, `created_at`, `updated_at`

### `entitlements` columns

`subscriber_type`, `subscriber_id`, `active_tier_keys`, `primary_tier_key`, `flags`, `seat_limit`, `active_seat_count`, `is_metered_seats`, `status`, `trial_end`, `current_period_end`, `computed_at`

### `subscription_seats` (from `lib/seat-management.js`)

`subscription_item_id`, `firm_id`, `company_id`, `active`, `activated_at`, `billing_period_anchor`, `stripe_usage_event_id`; partial unique `uq_subscription_seats_active_company`.

## Recovery procedure (post-login, isolated)

```bash
# ISOLATED — do not overwrite repo supabase/migrations/
mkdir ../supabase-fetch-isolated && cd ../supabase-fetch-isolated
supabase init
supabase link --project-ref jzmdgwwiestcmmeuhhkr
supabase migration fetch --linked
# Copy fetched 20260701043602_*.sql etc. to docs/migration-remediation/evidence/fetched/
```

Label fetched files: `PROVENANCE=FETCHED_PRODUCTION_<timestamp>`.

## Placeholder evidence files

See `docs/migration-remediation/evidence/phase1/` — README only until fetch completes.
