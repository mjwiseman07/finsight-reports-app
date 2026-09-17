# RA Pro — production cutover derivation (read-only)

**Date:** 2026-09-15  
**Channel:** Supabase read-only `execute_sql` (no writes)  
**Superseded status:** Operator decision bound — see
`ra-pro-cutover-operator-decision.json` and `ra-pro-cutover-runbook.md`.

## Decision (bound)

**`NO_CUTOVER × 4`** — mapping artifact SHA-256
`93f6fe31360222ccd282e814a3764ccf07929e7cb91c25c70e10b750ec0ec953`.

All four authorizing RA Pro entitlements were classified as **internal
smoke/demo** records. **No production customer backfill** is authorized.
Migration leaves every existing `billing_company_id` **NULL**.

## Candidate counts (sanitized) — historical derivation

Strong chain (required for automatic link) found **zero** unambiguous mappings:

| Class | Count |
|-------|------:|
| Company-owned authorizing · exactly one firm | 0 |
| Company-owned authorizing · zero | 3 |
| Firm-owned authorizing · exactly one company (strong) | 0 |
| Firm-owned authorizing · zero (strong) | 1 |

## Implications

- Base RA / Solo BK / no-entitlement firms stay unlinked and denied `/reviewer`.
- Smoke/demo slots remain for audit history; they do not grant `/reviewer` after
  the linked-firm entitlement filter ships.
- Future legitimate customers enter only via canonical activation after the
  cutover commerce gate reopens.
