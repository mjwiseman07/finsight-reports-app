# P0 launch authorization matrix

Reviewed base: `c6b3332560120c5832dbbe994307f2d2c788bedd`  
Branch: `security/p0-launch-authorization-hardening`

## Free Review lead session contract

| Item | Value |
|------|--------|
| Cookie name | `free_review_lead_session` |
| Cookie value | Opaque 32-byte random (`base64url`); never the lead UUID |
| Cookie flags | HttpOnly, Secure (production), SameSite=Lax, host-only, path=`/api` |
| Server store | `free_review_lead_sessions.token_hash` = SHA-256(token) hex |
| Active session | `revoked_at IS NULL` AND `expires_at > now()` AND lead status ∈ allowlist |
| Active lead statuses (allowlist) | `lead_captured`, `onboarding_started`, `quickbooks_connected`, `xero_connected` |
| Fail closed | empty/null/unknown/converted/suspended/blocked/deleted/rejected/expired/… |
| Rotation | Atomic RPC `rotate_free_review_lead_session` (lead `FOR UPDATE`); revoke all unrevoked then insert one |
| Active invariant | Partial unique index `UNIQUE (lead_id) WHERE revoked_at IS NULL` |
| Active DELETE | BEFORE DELETE trigger rejects unrevoked + unexpired rows; cleanup deletes only non-authorizing |
| Retention | 30 days after session becomes non-authorizing; cleanup via `cleanup_free_review_lead_sessions` (no production cron in this PR) |
| Status writes | Server-controlled only; PATCH rejects client `status` / `lead_status`; UPDATE uses exact status predicate |
| Legacy | `free_review_lead_id` never authorizes; cleared on set/deny |
| Never auth | body/query/URL/localStorage lead UUID |

Bearer precedence: valid bearer → user principal (cookie ignored). Invalid bearer → 401 (no cookie fallback).

| Caller | Resource | Required relationship | Denial |
|--------|----------|----------------------|--------|
| Reviewer API caller | `GET /api/reviewer/qbo-accounts?firmClientId=` | Active firm membership owning `firm_clients.id`; rechecked before cache return and before QBO token resolve | `401` / `404 {error:not_found}` |
| Audit Ready writer | `POST .../pbc/upload` | Cookie auth + write engagement actor; rechecked before service-role storage/DB | `401` / `404` |
| Audit Ready writer | `POST .../pbc/parse` | Write actor; upload bound to engagement; storage key must match `{engagementId}/{sha256}-{safeName}` | `401` / `404` (no path leak) |
| Signed-in user | accounting routes | Bearer `auth.getUser` | `401` invalid token |
| Free Review lead | accounting + connect + free-review APIs | Opaque session cookie → hashed active session + allowlisted lead | `401 Unauthorized` |

## Neighboring routes

`active-context`, `latest-normalized`, `report-availability`, `schedule-diagnostics` share `resolveAccountingRequestPrincipal`.
