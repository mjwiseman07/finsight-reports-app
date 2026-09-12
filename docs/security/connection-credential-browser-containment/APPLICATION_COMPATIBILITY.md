# Stage-1 credential browser containment — application compatibility

Base: `6cf3ea64718e2a5ba6d6e1365fbf37e0f18947a1`

## Verdict
**APPLICATION_COMPATIBILITY_OK** for Stage-1 privilege removal with zero browser grants.

## Browser callers
No production browser (`createBrowserClient` / client components) call sites were found that
`from("accounting_connections")`, `from("quickbooks_connections")`, or `from("qbo_connections_unified")`.

## View consumers (all service-role / server)
| Caller | Selected columns | Tokens? |
|--------|------------------|---------|
| `app/api/support/tickets/route.js` | `realm_id` | no |
| `lib/qbo/cdc.js` | `user_id` | no |
| `lib/support/workflow-signals.ts` | `realm_id, token_expiry, status` / `realm_id` | no |

Rebuilt view retains: `source_table`, `connection_id`, `user_id`, `realm_id`, `token_expiry`, `granted_scopes`, `status`, `created_at`, `updated_at`.
Removed: `access_token`, `refresh_token`.
No `select('*')` on the view among production callers.

## Credential readers/writers
Remain on `supabaseAdmin` / service-role paths (OAuth callback, adapter, token resolver, CAS, CDC, disconnect, health, currency, sync, admin). Legacy fallback continues for server-side callers.

## Stage-1 grant posture
Zero anon/authenticated privileges (no speculative safe-column grants).
