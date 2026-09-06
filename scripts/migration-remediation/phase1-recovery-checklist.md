# Phase1 migration recovery checklist

These four migrations exist in production `schema_migrations` but are **absent from git**:

| Production version | Name |
|------------------|------|
| `20260701043602` | `phase1_subscriptions_core` |
| `20260701043707` | `phase1_subscription_seats_and_entitlements` |
| `20260701043911` | `phase1_backward_compat_view` |
| `20260701043931` | `phase1_entitlement_rls_policies` |

## Recover SQL (requires authenticated Supabase CLI)

After `npx supabase login`:

```bash
# Link to production project (read-only export)
npx supabase link --project-ref jzmdgwwiestcmmeuhhkr

# Option A: pull migration history into local folder for inspection
npx supabase db pull --schema public

# Option B: query migration statements if stored (verify column exists first)
# SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
```

Place recovered files in `supabase/migrations-draft/` with production timestamps
for diff review before promoting to `supabase/migrations/`.

## Known schema contract (from app code + prod information_schema capture)

Captured in `tests/entitlements/subscription-sync-schema-contract.test.ts`:

### `subscriptions`

`id`, `subscriber_type`, `subscriber_id`, `stripe_customer_id`,
`stripe_subscription_id`, `status`, `current_period_start`, `current_period_end`,
`cancel_at_period_end`, `canceled_at`, `trial_start`, `trial_end`, `metadata`,
`created_at`, `updated_at`, `first_paid_charge_at`

### `subscription_items`

`id`, `subscription_id`, `stripe_subscription_item_id`, `stripe_price_id`,
`tier_key`, `lookup_key`, `track`, `cadence`, `quantity`, `metered`, `is_addon`,
`created_at`, `updated_at`

### `entitlements`

`subscriber_type`, `subscriber_id`, `active_tier_keys`, `primary_tier_key`,
`flags`, `seat_limit`, `active_seat_count`, `is_metered_seats`, `status`,
`trial_end`, `current_period_end`, `computed_at`

### `subscription_seats` (from `lib/seat-management.js`)

`subscription_item_id`, `firm_id`, `company_id`, `active`, `activated_at`,
`billing_period_anchor`, `stripe_usage_event_id`

Partial unique index: `uq_subscription_seats_active_company`

### `stripe_webhook_events`

Created by migration #1 on preview branch (confirmed applied before failure).

## Objects still requiring production schema export

- Exact `CREATE TABLE` DDL for phase1 tables (do not infer from app code alone)
- `public.users` (referenced by `resolveSubscriber`; not in pre-phase1 baseline)
- Phase1 views and RLS policies (migrations 3–4)

## Verification after recovery

1. Recovered SQL + baseline draft → new data-less preview branch replays cleanly.
2. `pg_dump --schema-only` diff vs production (exclude data, auth, storage).
3. No duplicate-object errors on production repair-only path.
