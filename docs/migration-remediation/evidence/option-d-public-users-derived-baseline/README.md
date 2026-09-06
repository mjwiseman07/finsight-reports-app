# Derived baseline — `public.users` (not recovered original SQL)

Original CREATE is unavailable in git and in production `schema_migrations.statements[]`.

This package is a **schema-and-security-only** catalog derivation for Option D clean replay:

| Artifact | Path |
|----------|------|
| Contract | `contract.json` |
| SQL | `supabase/migrations-draft/option-d-isolated-replay/derived-baseline/20260701043598_public_users_derived_baseline.sql` |

- `contains_data_rows: false`
- No Auth identity copy
- Trigger/function `handle_new_auth_user` / `on_auth_user_created` intentionally **excluded** (created by tracked order-107 migration)
- Not deployable via `supabase/migrations/`
