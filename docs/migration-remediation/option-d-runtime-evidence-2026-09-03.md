# Option D local runtime evidence (FAILURE — stopped)

**Date:** 2026-09-03  
**Overall:** `BLOCKED` / `candidateReplay: FAIL`  
**Stopped on:** migration apply failure (no guard bypass, no manual DDL patch to force PASS)

## Tested commits

| Ref | SHA |
|-----|-----|
| PR #313 HEAD | `879d3d5957bc31034566ce80b802319d7b91f34c` |
| PR #312 pin | `f65730b3d38e9cb3b192e54f62c798c74a07a1c2` |
| PR #312 suite blob | `6dfc99e23b8206d3d70b19c8a7d4758d22e0f770` (content match verified before run) |

## Runtime versions

| Component | Version |
|-----------|---------|
| Node | v24.16.0 (PATH at runtime) |
| Vitest | 4.1.9 (not executed — apply failed first) |
| Docker Engine | 29.7.2 |
| Supabase CLI | 2.116.0 |
| Postgres (local Supabase image) | 17.6 |
| Manifest SHA-256 (assembled verify) | `0e0b294b2c6cbfeba29c134fee8ea9b699c9f0518c8a1d0ebf5b32181a049d04` |
| Assembled migrations | **148** |
| Recovered required originals | **8** |
| Hash verification (assembled vs manifest) | **0 failures** |

Installed software **left in place** per authorization: Docker Desktop, WSL, Scoop, Supabase CLI.

## Target (redacted)

`host=127.0.0.1;port=54322;db=option_d_clean_replay`

Platform bootstrap (allowlisted schemas + auth schema-only dump from local Supabase `postgres`; empty `public`; empty `supabase_migrations.schema_migrations`). Freshness guard **PASS** and target-safety **PASS** before apply.

## Migration apply result

| Metric | Value |
|--------|-------|
| Assembled migrations | **148** |
| Completed before failure | **10** (orders 1–10) |
| Failed order | **11** |
| Failed file | `20260705_d67_p1_ar_cash_app_layer0_layer1.sql` |
| Error | `column "company_id" does not exist` |

### Completed (orders 1–10)

1. `20260701043599_foundations_baseline.sql`
2. `20260701043602_phase1_subscriptions_core.sql`
3. `20260701043707_phase1_subscription_seats_and_entitlements.sql`
4. `20260701043911_phase1_backward_compat_view.sql`
5. `20260701043931_phase1_entitlement_rls_policies.sql`
6. `20260701_refund_requests.sql`
7. `20260702_create_mfg_waitlist.sql`
8. `20260703_00_create_close_ledger.sql`
9. `20260703_01_create_checklist_system.sql`
10. `20260704024059_d_entitlements_legacy_stripe_rename.sql`

### Note vs prior 2026-09-02 run

Prior failure was order 10 `recurring_fires` missing (`d6_0_vertical_rule_foundation`). On this 148-file HEAD that stop did **not** recur; apply advanced through order 10 and failed at AR cash-app `company_id`.

## Distinct gate results

| Scope | Result |
|-------|--------|
| Fresh-DB / target-safety precheck | PASS (before apply) |
| Candidate replay apply | **FAIL** at order 11 |
| Schema / RLS / view / SI-Memory immutability | **BLOCKED** (not executed after apply fail) |
| PR #312 Vitest (12 expected) | **BLOCKED** (not executed) |
| Skips / todos | N/A (suite not run) |
| `productionDashboardReplayParity` | `unresolved` |

## Explicit non-actions

No paid cloud resources, no Supabase branches, no production access/changes, no merge/deploy, no active migration promotion, no QBO/OAuth, no live custody/Memory writes, no capability changes, no SQL patch/reorder/omit to force PASS. Both PRs remain draft/unmerged; PR #312 HEAD unchanged.

## Cleanup

See cleanup confirmation under `.tmp-option-d-supabase/` after this evidence write (then ephemeral dir removed). Only this-run DB, stack, volumes, and temporary suite file are in scope.
