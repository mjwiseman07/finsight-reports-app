# Option D local runtime evidence (FAILURE — stopped)

**Date:** 2026-09-03 (evening run)  
**Overall:** `BLOCKED` / `candidateReplay: FAIL`  
**Stopped on:** migration apply failure (no guard bypass, no manual DDL patch, no reorder)

## Tested commits

| Ref | SHA |
|-----|-----|
| PR #313 HEAD | `3e3a7bea30257315eaec80730f19679b7ea9a2f9` |
| PR #312 pin | `f65730b3d38e9cb3b192e54f62c798c74a07a1c2` |
| PR #312 suite blob | `6dfc99e23b8206d3d70b19c8a7d4758d22e0f770` (content match verified before run) |

## Runtime versions

| Component | Version |
|-----------|---------|
| Node | v24.16.0 |
| Vitest | 4.1.9 (not executed — apply failed first) |
| Docker Engine | 29.7.2 |
| Supabase CLI | 2.116.0 |
| Manifest SHA-256 (assembled verify) | `5f21baa428d643ae8f40dfabd58ad80dd08763d14188a0e8011f0e77a92bb794` |
| Assembled migrations | **149** |
| Recovered required originals | **9** |
| Hash verification (assembled vs manifest) | **0 failures** |

Installed software **left in place**: Docker Desktop, WSL, Scoop, Supabase CLI.

## Target (redacted)

`host=127.0.0.1;port=54322;db=option_d_clean_replay`

Platform bootstrap: allowlisted schemas + auth schema-only dump from local Supabase `postgres`; empty `public`; empty `supabase_migrations.schema_migrations`. Freshness guard **PASS** and target-safety **PASS** before apply.

## Migration apply result

| Metric | Value |
|--------|-------|
| Assembled migrations | **149** |
| Completed before failure | **12** (orders 1–12) |
| Failed order | **13** |
| Failed file | `20260707140000_d_assertions_part_3_coverage_statement.sql` |
| SQLSTATE | `P0001` |
| Error | `D-Assertions Part 2 close_assertion_coverage missing — Part 3 requires Part 2 applied first` |
| Statement context | DO block RAISE when `public.close_assertion_coverage` absent |
| Missing object | **table `public.close_assertion_coverage`** (created by Part 2) |
| Part 2 in set | `20260707130000_d_assertions_part_2_coverage_projection.sql` at assembled order **38** (after Part 3 @ 13) |

### Completed (orders 1–12)

1. `20260701043599_foundations_baseline.sql`
2. `20260701043602_phase1_subscriptions_core.sql`
3. `20260701043707_phase1_subscription_seats_and_entitlements.sql`
4. `20260701043911_phase1_backward_compat_view.sql`
5. `20260701043931_phase1_entitlement_rls_policies.sql`
6. `20260701_refund_requests.sql`
7. `20260702041259_add_received_at_to_stripe_webhook_events.sql`
8. `20260702_create_mfg_waitlist.sql`
9. `20260703_00_create_close_ledger.sql`
10. `20260703_01_create_checklist_system.sql`
11. `20260704024059_d_entitlements_legacy_stripe_rename.sql`
12. `20260707_create_close_packet_system.sql`

### Note vs prior order-11 `company_id` failure

Prior FAIL at order 11 (`firm_clients.company_id`) did **not** recur under the column-lineage graph. Apply advanced through order 12 and failed on D-Assertions Part 3 before Part 2.

## Distinct gate results

| Scope | Result |
|-------|--------|
| Fresh-DB / target-safety precheck | PASS (before apply) |
| Candidate replay apply | **FAIL** at order 13 |
| Schema / RLS / view / SI-Memory immutability | **BLOCKED** (not executed after apply fail) |
| PR #312 Vitest (12 expected) | **BLOCKED** (not executed) |
| `productionDashboardReplayParity` | `unresolved` |

## Explicit non-actions

No paid cloud resources, no Supabase branches, no production access/changes, no merge/deploy, no active migration promotion, no QBO/OAuth, no live custody/Memory writes, no capability changes, no SQL patch/reorder/omit to force PASS. PR #313 remains draft; PR #312 HEAD unchanged. No remediation started.

## Cleanup

See `docs/migration-remediation/option-d-runtime-cleanup-2026-09-03b.json`.
