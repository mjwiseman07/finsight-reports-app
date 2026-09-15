# RA Pro — production cutover derivation (read-only)

**Date:** 2026-09-15  
**Channel:** Supabase read-only `execute_sql` (no writes)  
**PR tip baseline:** `0ba6cee8…` inventory, re-derived during lease remediation.

## Decision

**`RA_PRO_CUTOVER_DECISION_REQUIRED`**

No deterministic fail-closed backfill was added to the migration. Ambiguous or
missing canonical company↔firm mappings for paid RA Pro entitlements.

## Candidate counts (sanitized)

Strong chain (required for automatic link):

- Company-owned slot: Stripe customer user is active `company_users` of the slot
  company **and** active `firm_memberships` on the candidate firm.
- Firm-owned slot: Stripe customer user is active firm member **and** active
  `company_users` of the candidate company **and** (firm_client links that
  company **or** firm.owner_user_id is that user).

| Class | Count |
|-------|------:|
| Company-owned authorizing slots | 3 |
| … exactly one candidate firm | **0** |
| … zero candidate firms | **3** |
| … multiple candidate firms | **0** |
| Firm-owned authorizing slots | 1 |
| … exactly one candidate billing company | **0** |
| … zero candidate companies (strong chain) | **1** |
| … multiple companies (weak union of membership/client/owner heuristics) | 1 |
| Proposed firm-uniqueness collisions | 0 (no proposed links) |
| Proposed billing-company uniqueness collisions | 0 (no proposed links) |
| Paid users who would retain `/reviewer` after an empty backfill | **0** |
| Distinct active firm members who lose `/reviewer` if filter ships without links | **7** |

Weak-union firm-owned mapping produced multiple companies and is **not**
authorized for auto-link (no name/email/proximity inference).

## Implications

- Base RA / Solo BK / no-entitlement firms stay unlinked and denied `/reviewer`
  (locked product model).
- A separately authorized cutover decision must choose how to map the four paid
  RA Pro entitlements (especially the legacy firm-owned slot and three
  company-owned slots with no strong firm candidate) before any backfill SQL
  lands.
- Sealed prior classification for the firm-owned slot should be preserved in the
  eventual cutover artifact without exposing customer identifiers.
