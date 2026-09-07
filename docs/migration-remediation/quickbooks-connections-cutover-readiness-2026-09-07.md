# Cutover readiness — remove legacy QuickBooks connection fallbacks

## Aggregate counts (prior read-only check; no identifiers / tokens)

| Metric | Count |
|--------|------:|
| Total `quickbooks_connections` rows | 4 |
| Unique canonical match (`user_id` + QBO realm → `accounting_connections`) | 4 |
| Unmatched legacy rows | 0 |
| Ambiguous (multiple) canonical matches | 0 |
| Matches with all token fields null/empty | 0 |
| Unique **usable** canonical matches (connected, not superseded, tokens present) | 4 |
| Matched but not usable | 0 |
| Conflicting/superseded-only matches | 0 |
| Legacy without usable canonical | 0 |
| Canonical usable QBO rows after cutover | 20 |
| Canonical QBO total | 20 |
| `erp_connections` exists | false |
| View/function dependents on legacy table (catalog) | 0 |
| **Unique usable matches with null `provider_environment`** | **3** |

## Authority contract (post review-fix)

- Canonical source is **`accounting_connections` only**.
- There are **no live** `quickbooks_connections` queries or writes in app/lib/scripts.
- Legacy promote sources (`quickbooks_connections` / `erp_connections`) are **retired** — promote context load fails closed without selecting those tables.
- **Environment is mandatory:** server `QB_ENVIRONMENT` must be `sandbox` or `production`; every selected row must have non-null `provider_environment` equal to that value. Null is never treated as the configured environment.
- **Company / firm-client authority:** `accounting_connections` has **no** `company_id` or `firm_client_id` column. Hard binding is:
  `firm_clients.company_id` → `companies.qbo_realm_id` → `accounting_connections.tenant_or_realm_id`.
  When `companyId` is in scope without a resolvable realm, selection fails closed (schema prerequisite — do not use `metadata_json` for authority).
- Refresh persistence is an **atomic conditional update** constrained by connection id, provider, environment, realm, connected status, not superseded, credentials not cleared, and original `updated_at` concurrency token. Zero-row updates fail typed `stale_connection_state` — never fallback to another row or legacy storage.

## Fresh hardened readiness counts (read-only; post code fix)

Assumes server `QB_ENVIRONMENT` ∈ {`production`,`sandbox`}. Counts only; no identifiers/tokens.

| Metric | Count |
|--------|------:|
| Legacy-selected rows | 4 |
| Unique usable under **production** env | **0** |
| Unique usable under **sandbox** env | **1** |
| Ambiguous under production / sandbox | 0 / 0 |
| Legacy rows with null-env connected+token match | **3** |
| Legacy rows with malformed env | 0 |
| Zero usable under either env | **3** |
| Missing tokens (connected, same realm) | 0 |
| Stale/inactive/superseded/cleared signal | 0 |
| Merge-ready matches if server env = production | **0** |
| Merge-ready matches if server env = sandbox | **1** |

Company/firm-client hard column on `accounting_connections`: **absent** (`company_id` / `firm_client_id` not in schema). Authority is realm-mediated only; missing/mismatched realm fails closed in code. No production backfill performed.

**Verdict: CODE_READY_DATA_REMEDIATION_REQUIRED** — keep draft; do not merge.
