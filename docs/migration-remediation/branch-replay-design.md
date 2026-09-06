# Branch replay: how migration SQL becomes authoritative

**Updated:** 2026-09-01 with recovered phase1 evidence.

## Proven facts

| Fact | Evidence |
|------|----------|
| `schema_migrations` has `statements text[]` | CLI issue dumps, `INSERT ... (version, name, statements)` |
| Phase1 migrations each store **1 SQL statement** | Recovered metadata + `provenance-manifest.json` |
| Dashboard replay executes stored statements | [MIGRATIONS_FAILED troubleshooting](https://supabase.com/docs/guides/troubleshooting/branch-in-migrations-failed-status) — Postgres logs show `execute:` per statement |
| `migration repair` does not execute SQL | [Database migrations guide](https://supabase.com/docs/guides/deployment/database-migrations) |
| GitHub-integrated previews run git `supabase/migrations/` | [GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration) |

## Blocking design conclusion

**A baseline marked `applied` via `migration repair` alone does NOT provide runnable SQL for dashboard/MCP preview branches** unless the repair row includes the full `statements[]` array (not documented as standard repair behavior).

Durable remediation must record real executable statements through an approved workflow:

1. **Execute** idempotent baseline DDL on production (asserted no-op) so `statements[]` is stored, OR
2. **Squash** to official baseline per Supabase docs, OR
3. **Use GitHub-integrated previews** where git files are authoritative (production recording still separate)

## Recovered phase1 replay chain (production order)

```
20260701043599_foundations_baseline  ← NOT in production history (proposed)
20260701043602 phase1_subscriptions_core      (no RLS)
20260701043707 phase1_subscription_seats...   (needs firms, companies)
20260701043911 phase1_backward_compat_view
20260701043931 phase1_entitlement_rls_policies  (RLS enabled)
```

Production history **starts at** `20260701043602` — no foundation migration recorded. This is the root cause of dashboard replay failure.

## Open question for Supabase Support (if needed)

> Does `migration repair --status applied` populate `statements[]` from a local file, or only `(version, name)`?

Until answered, assume **repair-only is insufficient** for dashboard replay.
