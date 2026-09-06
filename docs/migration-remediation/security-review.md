# Security and RLS review — foundations baseline + recovered phase1

**Updated:** 2026-09-01

## Baseline draft (hardened)

| Check | Result |
|-------|--------|
| DROP / TRUNCATE / DISABLE RLS | 0 |
| Production backfills removed | Yes (`accounting_connections` INSERT, `accounting_syncs` UPDATE) |
| Reference data allowlist | `company_roles` seed only |
| Single outer BEGIN/COMMIT | Yes |
| SECURITY DEFINER in baseline | 0 |

## Recovered phase1 RLS model (production-recorded)

| Migration | RLS state |
|-----------|-----------|
| `20260701043602` subscriptions_core | Tables created, **RLS off** |
| `20260701043707` seats_and_entitlements | +2 tables, **RLS off** |
| `20260701043911` backward_compat_view | View only |
| `20260701043931` entitlement_rls_policies | **RLS enabled** on 5 tables |

### Exposure window

Between migrations 1–3, subscription domain tables are in `public` **without RLS**. This matches the deleted preview branch failure (migration #1 only → 3 exposed tables).

Policies in migration 4:
- `subscriptions`, `subscription_items`, `entitlements`: member SELECT via `firm_memberships` / `company_users`
- `subscription_seats`: firm member OR seated company member
- `stripe_webhook_events`: RLS on, **no policies** → service_role only (correct for webhook ledger)

No `SECURITY DEFINER` functions in phase1 recovered SQL. `tg_set_updated_at` is `plpgsql` invoker (trigger function).

## Patent #6

Phase1 predates `ledger_events` / JE stack. No regression from recovered evidence.

## Production diff

Still **BLOCKED** — requires authenticated read-only schema comparison.
