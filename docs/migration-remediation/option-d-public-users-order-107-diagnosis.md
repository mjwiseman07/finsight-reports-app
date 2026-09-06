# Option D order-107 — `public.users` provenance (2026-09-04)

## Runtime evidence retained

- `option-d-runtime-evidence-2026-09-04a.md`
- `option-d-runtime-cleanup-2026-09-04a.json`
- Tested HEAD: `3be1765c0d7bda50913b55421541aa8e55cf9c11`
- Fail: order **107** / `20260727000100_users_auth_trigger_single_writer.sql` / SQLSTATE **42P01** / missing `public.users`

## Authoritative provenance

| Source | CREATE `public.users`? |
|--------|-------------------------|
| Git `supabase/migrations` | **No** |
| Git history (`git log -S 'create table public.users'`) | **No** |
| Foundations baseline | **No** (known gap) |
| Production `schema_migrations.statements[]` | **No** (only consumer `20260727030443` / `users_auth_trigger_single_writer`) |
| First tracked production version | `20260701043602` `phase1_subscriptions_core` (comments reference pre-existing `users.subscription_status`) |

Live production (schema/security only; no user rows): table exists, owner `postgres`, RLS on, PK/UNIQUE/FK→`auth.users`, policies read/update own row, writer `handle_new_auth_user` is SECURITY DEFINER with `search_path=public, pg_temp`.

`public.users` ≠ platform `auth.users`.

## Root-cause classification

**Primary:** `historical_reliance_on_preexisting_application_state`

**Secondary:** `creator_incorrectly_excluded_from_baseline`, `production_only_lineage_gap`

**Static defect (fixed):** bare `users` was listed as platform-provided, conflating application `public.users` with `auth.users` and suppressing `required_missing_create`.

## Remediation this change

- Fail closed in static gates when `public.users` has no in-set CREATE
- Extend analyzer to consume relations inside function/policy/DO/grant SQL (qualified `public.` + DML)
- Remove bare `users` from `platformProvidedTables` / `optionalExternalTables`
- **Do not** fabricate CREATE DDL (no `statements[]` original; catalog reconstruction not authorized here)

## Fresh local replay

**Not ready** — requires separately authorized schema/security-only baseline recovery of `public.users` (no row data, no `auth.users` copy).
