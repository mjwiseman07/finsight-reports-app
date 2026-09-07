# Cutover readiness — remove legacy QuickBooks connection fallbacks

## Aggregate counts (read-only; no identifiers / tokens)

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
| View/function dependents on legacy table (catalog) | 0 (query partial; no view_table_usage hits attempted after first probe) |

## Cutover verdict

**READY_FOR_REVIEW** — unmatched/ambiguous/conflicting/unusable counts are all **0**.

Live merge still requires human review of the draft PR; this gate does **not** authorize merge/deploy.

## Notes

- No token values, row ids, realms, or customer data were retrieved into evidence beyond aggregate counts.
- No production DDL/DML; legacy table and four rows retained.
- `erp_connections` is absent in production; prior runtime fallbacks landed on `quickbooks_connections`. After this PR, resolution uses `accounting_connections` only.
