# P0 launch authorization matrix

Reviewed base: `c6b3332560120c5832dbbe994307f2d2c788bedd`  
Branch: `security/p0-launch-authorization-hardening`

| Caller | Resource | Required relationship | Denial |
|--------|----------|----------------------|--------|
| Reviewer API caller | `GET /api/reviewer/qbo-accounts?firmClientId=` | Active `firm_memberships` for a firm that owns `firm_clients.id`; rechecked before QBO token resolve | `401` missing/invalid auth; `404 {error:not_found}` for wrong firm / unknown id (no existence oracle); no QBO call |
| Audit Ready writer | `POST .../pbc/upload` | Cookie auth (`401` if missing) + engagement actor with `canWrite`; rechecked before service-role storage/DB | `404 {error:not_found}` for no write / wrong engagement; no storage path in denials |
| Audit Ready writer | `POST .../pbc/parse` | Same write actor; upload id bound to path `engagementId`; rechecked before service-role load and again before Bedrock parse | `401` unauthenticated; `404 {error:not_found}` for wrong engagement/upload; parse never runs |
| Signed-in dashboard user | `/api/accounting/active-context`, `latest-normalized`, `report-availability`, `schedule-diagnostics` | Bearer → `auth.getUser`; context scoped to that `userId` | `401` invalid token |
| Free Review lead | Same accounting routes | HttpOnly `free_review_lead_id` cookie + live `free_review_leads` row; optional body/query `leadId` must match cookie | `401 Unauthorized` for body-only leadId, mismatched leadId, or missing/invalid cookie lead |

## Neighboring-route review

Same leadId substitution pattern was present on:

- `app/api/accounting/active-context/route.js` (in scope)
- `app/api/accounting/latest-normalized/route.js`
- `app/api/accounting/report-availability/route.js`
- `app/api/accounting/schedule-diagnostics/route.js`

All four now use `resolveAccountingRequestPrincipal`.  

Xero `lead-entities` / `select-lead-entity` already require matching lead cookies and were left unchanged.
