# Root cause — `ledger_events_engagement_id_fkey` (Option D / PR #312 A after digest fix)

## Authoritative classification

**Fixture-only defect.** Schema-only disposable DB correctly has zero application rows. Seed inserts JE custody into `audit_ready_engagements` under synthetic `IDS.engagement`, then `persist_journal_entry_execution_reservation` → `publish_ledger_event` writes `ledger_events.engagement_id` which FKs **`public.engagements(id)`** — a different parent table that was never seeded.

This is **not** an ACL / `aclGrantsOmitted` defect (error is FK violation, SQLSTATE class **23503**).

## Parent FK provenance

Migration `supabase/migrations/20260706120000_d_platform_event_sourced_foundation.sql`:

```sql
engagement_id UUID REFERENCES public.engagements(id) ON DELETE RESTRICT,
```

Postgres auto-names this `ledger_events_engagement_id_fkey`.

Also non-null publish scope args require parents for:
- `ledger_events.firm_id` → `public.firms(id)`
- `ledger_events.firm_client_id` → `public.firm_clients(id)`

## Call chain (test A)

1. `seedFixture` → `runJeReuseSeedOperations` (prior pin): `auth.users` → `companies` → **`audit_ready_engagements`** → connections/syncs/CC/proposals/approvals. **No** `firms` / `firm_clients` / `engagements`.
2. `persist_journal_entry_execution_reservation(...)` with `$4=firm`, `$5=firmClient`, `$6=engagement` (= `IDS.engagement`).
3. Execution row INSERT succeeds (JE tables FK `audit_ready_engagements`).
4. `publish_ledger_event(..., p_engagement_id=IDS.engagement, ...)` INSERT into `ledger_events` → **23503** / `ledger_events_engagement_id_fkey`.

## Production RPC contract

`publish_ledger_event` correctly scopes ledger events to `public.engagements`. Production writers create real engagement custody. The disposable suite must mirror that parent with synthetic deterministic rows (same UUID bridge to `audit_ready_engagements` is fixture-only).

## Remediation (PR #312)

Add ordered seed ops after `seed_companies`:
1. `seed_firms`
2. `seed_firm_clients`
3. `seed_engagements` (same UUID as audit_ready engagement)
4. existing `seed_audit_ready_engagements` …

Do **not** null `engagement_id`, disable the FK, or change RPC/Patent #6 assertions.

## Why B–J fail

Shared transaction abort after A. Fallout unless a post-fix replay proves otherwise.
