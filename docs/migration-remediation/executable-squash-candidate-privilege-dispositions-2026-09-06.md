# Privilege dispositions — executable squash candidate (remediation)

**Not a PASS_SOURCE_REVIEW.** Documents authoritative call-path evidence used for P0 anon-execute remediation.

## `public.publish_ledger_event`

| Field | Disposition |
|-------|-------------|
| Security mode | `SECURITY DEFINER` |
| Search path | `public, pg_temp` (Q8b; digest qualify preserves) |
| Tables touched | `ledger_chain_head`, `ledger_events` (and related chain bookkeeping) |
| Execute privileges | **REVOKE** from `PUBLIC`, `anon`, `authenticated` (Q8c + ESC patch) |
| Application caller | `lib/events/publisher.ts` → `createServiceClient()` (service role) |
| DB role | `service_role` |
| Anonymous required? | **No** |
| Input binding | Server-side publish API; not a browser RPC |

**Required disposition applied:** remove anon (and authenticated/PUBLIC) execute; preserve service-role RPC callability only.

## `public.increment_share_token_access`

| Field | Disposition |
|-------|-------------|
| Security mode | SQL function (non-definer in create site); updates by `id` only |
| Search path | default at create; Q8b lockdown applies where present |
| Tables touched | `close_packet_share_tokens` (`access_count`, `last_accessed_at`) |
| Execute privileges | **REVOKE** from `PUBLIC`, `anon`, `authenticated` (Q8c + ESC patch) |
| Application caller | `lib/close-packet/share-tokens.js` → `getSupabaseAdmin()` → `rpc('increment_share_token_access')` |
| DB role | service/admin client — **not** browser `anon` |
| Anonymous required? | **No** — share flow hashes token and reads/updates via admin client |
| Narrowness | Updates single row by `p_token_id`; does not enumerate tokens |

**Evidence-backed disposition:** revoke anon. Conditions for keeping anon execute were **not** proven (caller is admin, not anonymous PostgREST). Negative privilege assertions included in module 4 ESC patch + Q8c.

## Negative assertions

Module `20260907010030` includes `DO $esc_priv_assert$` failing if either function retains `anon`/`authenticated` EXECUTE.
