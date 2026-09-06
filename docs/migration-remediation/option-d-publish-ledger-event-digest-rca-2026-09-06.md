# Root cause — `digest(bytea, unknown) does not exist` (Option D / PR #312 A)

## Authoritative classification

**Unqualified pgcrypto `digest` under a locked `search_path` that excludes schema `extensions`.**  
Second-argument untyped literal (`'sha256'`) yields the reported `digest(bytea, unknown)` signature in the error text.  
This is **not** established as an `aclGrantsOmitted` / permission-denied defect.

## Call chain from test A

1. `execution-reservation.postgres.integration.test.ts` case **A** → `persist_journal_entry_execution_reservation`
2. `supabase/migrations/20260821183525_journal_entry_executions.sql` → `public.publish_ledger_event(...)`
3. `supabase/migrations/20260717050000_d65_p2_block5_anomaly_score_merkle.sql` line ~122:
   `encode(digest(v_hash_input::bytea, 'sha256'), 'hex')` (unqualified)
4. `supabase/migrations/20260718190000_q8b_function_search_path_lockdown.sql` sets  
   `publish_ledger_event` → `search_path = public, pg_temp` (excludes `extensions`)
5. Platform contract / local Supabase CLI: **`pgcrypto` in schema `extensions`**  
   (`docs/migration-remediation/option-d-platform-prerequisite-contract.json`)

## Why B–J fail

Test suite shares one transaction. A’s ERROR aborts the transaction; later cases see  
`current transaction is aborted, commands ignored until end of transaction block`  
(or assertion mismatch against that abort). Fallout unless a post-fix replay proves otherwise.

## Production vs clean replay

- **Latent on any environment** where `pgcrypto` is only in `extensions` and Q8b lockdown is applied (matches Option D platform-only stacks and typical Supabase).
- **Not** introduced by schema-only suite restore ACL omission.
- Historical pilot-lifecycle hash migrations already used `search_path = public, extensions, pg_temp` or typed `'sha256'::text`; **`publish_ledger_event` never received that remediation** until the forward migration below.

## Remediation (no lineage rewrite)

Forward migration only (does not edit `20260717050000` bytes):

`supabase/migrations/20260906184500_publish_ledger_event_extensions_digest_qualify.sql`

- `extensions.digest(v_hash_input::bytea, 'sha256'::text)` — same `::bytea` cast for hash continuity
- `SET search_path = public, pg_temp` retained (not weakened)
- No public `digest` wrapper / duplicate

Option D: re-assembled to **151** entries including that forward migration.
