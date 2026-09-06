# Phase1 migration SQL provenance

**Status:** RECOVERED (read-only `schema_migrations` metadata, 2026-09-01)

## Recovered migrations

| Version | Name | Database MD5 (UTF-8 SQL body) | Statements | Provenance file |
|---------|------|-------------------------------|------------|-----------------|
| `20260701043602` | `phase1_subscriptions_core` | `5992414bde50c4562925b60361721b44` | 1 | `supabase/migrations-draft/recovered-production-history/20260701043602_phase1_subscriptions_core.sql` |
| `20260701043707` | `phase1_subscription_seats_and_entitlements` | `60a5d243a32814c9975bd0e1b90e6cee` | 1 | `.../20260701043707_phase1_subscription_seats_and_entitlements.sql` |
| `20260701043911` | `phase1_backward_compat_view` | `6d7ed2de4528c1380dcb0221fc14af39` | 1 | `.../20260701043911_phase1_backward_compat_view.sql` |
| `20260701043931` | `phase1_entitlement_rls_policies` | `d13c0dc54794fe2f0d47dfa43c86ad3e` | 1 | `.../20260701043931_phase1_entitlement_rls_policies.sql` |

Manifest: `docs/migration-remediation/evidence/phase1/provenance-manifest.json`

**Hash note:** Database MD5s match UTF-8 LF line endings. CRLF normalization produces different hashes (documented in manifest verification tests).

## Source

- Project ref: `jzmdgwwiestcmmeuhhkr`
- Table: `supabase_migrations.schema_migrations`
- Mode: read-only metadata query
- `contains_data_rows`: false
- `contains_credentials`: false

## Phase1 dependency findings (from recovered SQL)

### Migration 1 — `phase1_subscriptions_core`

Creates: `subscriptions`, `subscription_items`, `stripe_webhook_events`  
External deps: **none** (polymorphic `subscriber_id` uuid, no FK to firms/companies)  
RLS: **not enabled**

### Migration 2 — `phase1_subscription_seats_and_entitlements`

Creates: `subscription_seats`, `entitlements`, `tg_set_updated_at` + triggers  
External deps: **`public.firms(id)`**, **`public.companies(id)`** — **requires foundation baseline**  
RLS: **not enabled**

### Migration 3 — `phase1_backward_compat_view`

Creates: `company_billing_compat` view  
External deps: `companies` (`practice_id`, `package_level`, `billing_status`), `entitlements`  
RLS: N/A (view)

### Migration 4 — `phase1_entitlement_rls_policies`

Enables RLS + SELECT policies on all 5 phase1 tables  
External deps: `firm_memberships`, `company_users`  
`stripe_webhook_events`: RLS enabled, **no policies** (= service_role only)

### RLS exposure window (production-recorded)

| After migration | Tables without RLS |
|-----------------|-------------------|
| #1 only | `subscriptions`, `subscription_items`, `stripe_webhook_events` |
| #2 only | above + `subscription_seats`, `entitlements` |
| #4 complete | all protected |

Failed replay after migration #1 reproduces the deleted preview branch failure mode.

### Foundation mapping (baseline draft)

| Object | Local source | In hardened baseline |
|--------|-------------|---------------------|
| `firms` | `20260530_create_client_briefings.sql` | Yes |
| `firm_memberships` | same | Yes |
| `companies` | `20260530_create_company_accounts.sql` | Yes |
| `company_users` | same | Yes |
| `company_roles` | same (reference seed allowlisted) | Yes |
| `practice_accounts` / `companies.practice_id` | `20260530_add_account_type_onboarding.sql` | Yes |

## Not original SQL

Nothing in this document is reconstructed DDL. All four bodies are exact recovered production `statements[1]` text verified by MD5.
