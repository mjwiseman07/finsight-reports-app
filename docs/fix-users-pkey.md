# public.users single-writer architecture

## Rule

`public.users` has exactly one writer for **row creation**: the `handle_new_auth_user` trigger on `auth.users`.

App code may **update** existing rows (e.g. `business_name`, `trial_used`, `ip_address_signup`) but must not insert/upsert to create the row.

## Do NOT

- Insert into `public.users` from any app code path
- Upsert into `public.users` from any app code path to lazy-create
- Add an `ON CONFLICT DO NOTHING` "helper" that papers over missing rows — that's the band-aid we retired

## If a row is missing

The trigger failed. Investigate the fail-open NOTICE in Postgres logs. Do not lazy-create the row from app code — that reintroduces the multi-writer race.

## Column additions

When adding a NOT NULL column to `public.users`, either:

1. Give it a default, OR
2. Update `handle_new_auth_user` in the same migration to populate it

Otherwise the trigger will fail silently (fail-open) and every new user will start with a missing row.

## Related gaps (deferred)

- `users.stripe_customer_id` is read by billing portal / subscription-sync but has no app writer today. Tracked as FIX-STRIPE-CUSTOMER-ID-WRITE-PATH (separate PR).

## History

Phase FIX-USERS-PKEY (PR #212): retired three app-side creators (check-trial `createMissingUserRecord`, create-session upsert, signup insert) in favor of the trigger. Migration `20260727000100_users_auth_trigger_single_writer.sql`. Signup admin path retains a non-blocking `update` for request-derived `ip_address_signup` only.
