# Phase 1 RLS exposure — draft lineage proposal (NOT APPLIED)

**Scope:** Design note only. Does **not** modify recovered production phase1 SQL in `supabase/migrations-draft/recovered-production-history/`.

## Production-recorded sequence (unchanged evidence)

| Migration | Version | RLS behavior |
|-----------|---------|--------------|
| #1 `phase1_subscriptions_core` | `20260701043602` | Creates `subscriptions`, `subscription_items`, `stripe_webhook_events` — **RLS not enabled** |
| #2 `phase1_subscription_seats_and_entitlements` | `20260701043707` | Creates `subscription_seats`, `entitlements` — **RLS not enabled** |
| #3 `phase1_backward_compat_view` | `20260701043911` | View only |
| #4 `phase1_entitlement_rls_policies` | `20260701043931` | **Enables RLS** on all five phase1 tables |

## Observed G2 collateral

On the deleted disposable branch, after baseline rollback, phase1 migration #1 applied before #2 failed — leaving **three empty public tables without RLS** until branch deletion.

## Durable lineage design options (for post-G1/G2 sign-off)

### Option A — RLS at CREATE (recommended for new git lineage)

In promoted git migrations (not recovered prod evidence), append to each phase1 CREATE:

```sql
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
-- service_role-only default until policies migration
```

Migration #4 would become idempotent `CREATE POLICY` only. Final policy behavior matches production contract.

### Option B — Single transaction wrapper (preview branches only)

If dashboard replay supports wrapping migrations 1–4 in one transaction (unlikely for separate `schema_migrations` rows), exposure window closes on commit. **Not proven** for Supabase branch replay.

### Option C — Retain production sequence (evidence-only)

Keep recovered SQL verbatim for production history recording (G4). Accept exposure during partial replay; mitigate by never leaving failed branches running (operational).

## Recommendation

- **G4 production recording:** use Option C (verbatim recovered `statements[]`)
- **Git / GitHub-integrated previews:** use Option A when promoting to `supabase/migrations/` after G2 pass
- **Do not** silently edit recovered evidence files without explicit migration reorder approval

## Test requirements when Option A is implemented

1. Replay simulation asserts RLS enabled immediately after each phase1 CREATE
2. Policy migration #4 remains idempotent
3. No `authenticated`/`anon` access during migrations 1–3 except explicit policies
4. Separate PR from baseline ordering fix
