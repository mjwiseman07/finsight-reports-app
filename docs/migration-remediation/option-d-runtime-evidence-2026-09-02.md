# Option D local runtime evidence (FAILURE — stopped)

**Date:** 2026-09-02  
**Overall:** `BLOCKED` / `candidateReplay: FAIL`  
**Stopped on:** migration apply failure (no guard bypass, no manual DDL patch to force PASS)

## Tested commits

| Ref | SHA |
|-----|-----|
| PR #313 HEAD | `8ad27be6d8260669d9e800aee11397e4bb545988` |
| PR #312 pin | `f65730b3d38e9cb3b192e54f62c798c74a07a1c2` |
| PR #312 suite blob | `6dfc99e23b8206d3d70b19c8a7d4758d22e0f770` (content match verified before run) |

## Runtime versions

| Component | Version |
|-----------|---------|
| Node | v24.16.0 (PATH at runtime; earlier preflight saw v22.22.0) |
| npm | 11.13.0 |
| Vitest | 4.1.9 |
| Docker Engine | 29.7.2 |
| Docker Desktop | 4.89.0 (238018) |
| Supabase CLI | 2.116.0 (Scoop) |
| Postgres (local Supabase image) | 17.6 (`public.ecr.aws/supabase/postgres:17.6.1.165`) |
| WSL | installed; distro `docker-desktop` Running / version 2 |

Installed software **left in place** per authorization: WSL package, Docker Desktop, Scoop, Supabase CLI.

## Target (redacted)

`host=127.0.0.1;port=54322;db=option_d_clean_replay`

Platform bootstrap (allowlisted schemas + auth schema-only dump from local Supabase `postgres`; **no** `_realtime` copy; empty `public`; empty `supabase_migrations.schema_migrations`). Freshness guard **PASS** before apply.

## Migration apply result

| Metric | Value |
|--------|-------|
| Assembled migrations | **140** |
| Completed before failure | **9** (orders 1–9) |
| Failed order | **10** |
| Failed file | `20260703_1200_d6_0_vertical_rule_foundation.sql` |
| Error | `relation "recurring_fires" does not exist` |

### Completed (orders 1–9)

1. `20260701043599_foundations_baseline.sql`
2. `20260701043602_phase1_subscriptions_core.sql`
3. `20260701043707_phase1_subscription_seats_and_entitlements.sql`
4. `20260701043911_phase1_backward_compat_view.sql`
5. `20260701043931_phase1_entitlement_rls_policies.sql`
6. `20260701_refund_requests.sql`
7. `20260702_create_mfg_waitlist.sql`
8. `20260703_00_create_close_ledger.sql`
9. `20260703_01_create_checklist_system.sql`

### Dependency note (for review — not fixed in this run)

Assembled set mentions `recurring_fires` in:

- `20260703_1200_d6_0_vertical_rule_foundation.sql` (fails here)
- `20260714_00_d5_recurring_templates.sql` (creates it — **later** in Option D order)
- `20260718190000_q8b_function_search_path_lockdown.sql`

So this is an **Option D lineage / ordering** defect relative to a clean replay, not missing Docker/tooling.

## Security / Vitest

| Gate | Result |
|------|--------|
| Fresh-DB precheck | PASS (before apply) |
| Candidate replay apply | **FAIL** at order 10 |
| Schema / RLS / view / behavioral immutability | **BLOCKED** (not executed after apply fail) |
| PR #312 Vitest (12 expected) | **BLOCKED** (not executed) |
| Skips / todos | N/A (suite not run) |
| `productionDashboardReplayParity` | `unresolved` |

## Prior apply attempts (infra bootstrap only — not lineage patches)

1. Missing `auth.jwt()` → expanded platform auth helpers  
2. Missing `auth.users` → restored platform `auth` schema-only dump  
3. Lineage stop at `recurring_fires` → **no further bootstrap/SQL patches**

## Cleanup confirmation

Performed after evidence capture (see `.tmp-option-d-supabase/cleanup-confirmation.json`):

- `DROP DATABASE option_d_clean_replay` — confirmed; zero `option_d_%` DBs remain
- Removed temporary on-disk PR #312 suite file (uncommitted materialization) — confirmed absent
- `supabase stop --no-backup` for project `tmp-option-d-supabase` — status 0; zero remaining containers/volumes for that project name
- **Not** removed: Docker Desktop, WSL, Scoop, Supabase CLI
- **Not** touched: production, paid branches, other containers/DBs, PR #312 remote, capability flags
- No automatic reboot was performed

## Explicit non-actions

No paid cloud resources, no Supabase branches, no production access/changes, no merge/deploy, no active migration promotion, no QBO/OAuth, no live custody/Memory writes, no capability changes. Both PRs remain unmerged.
