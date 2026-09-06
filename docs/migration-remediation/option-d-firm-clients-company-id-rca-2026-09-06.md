# Root cause — `firm_clients.company_id` NOT NULL (Option D / PR #312 SETUP)

## Classification

**Fixture-only.** `seed_companies` already inserts synthetic `IDS.company`, but `seed_firm_clients` omitted `company_id`. Migration `20260708_00_d0_identity_and_memory_activation.sql` sets `firm_clients.company_id` **NOT NULL** (unique index; no FK to `companies`). SQLSTATE **23502**.

## Parent chain (canonical synthetic scope)

1. `auth.users` (requested_by / connection owner)
2. `companies` — minimal NOT NULL: `id`, `name` (+ seed fills persona/package/billing/onboarding/demo/account_type/industry_type)
3. `firms` — `id`, `name`, `is_demo`
4. `firm_clients` — `id`, `firm_id`, **`company_id` (= companies.id)**, `name`, `is_demo`
5. `engagements` — `id`, `firm_id`, name/type/status (ledger parent)
6. `audit_ready_engagements` — `id` (= engagement), `company_id`
7. proposals / approvals — `company_id` + `engagement_id`

## Remediation

Set `firm_clients.company_id = IDS.company` in `seed_firm_clients`. Do not weaken NOT NULL.
