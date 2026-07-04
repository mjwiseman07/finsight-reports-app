# Advisacor Event-Sourced Ledger

## Overview

Every state change in Advisacor emits an event to `ledger_events`. Projections derive materialized views (aging, balance sheet, coverage reports) from the event stream.

## Why event sourcing

- **Immutable audit trail** — every action is preserved forever (`ledger_events` has UPDATE/DELETE triggers that raise).
- **AI-native reasoning** — LLMs can traverse the event stream to explain "why did this happen".
- **Rebuildable projections** — new report? new dashboard? Replay the event stream.
- **Continuous assurance** — assertion coverage is computed from events, not from snapshots.

## Publishing an event

Use `publishEvent` from `lib/events/publisher.ts`. Never write to `ledger_events` directly.

```ts
import { publishEvent } from "@/lib/events/publisher";

await publishEvent({
  eventType: "bill.received",
  eventCategory: "intake",
  firmClientId,
  aggregateType: "bill",
  aggregateId: "qbo:12345",
  actorType: "system",
  payload: { vendor: "ACME", amount: 1234.56, currency: "USD" },
});
```

Every event must be scoped to at least one of `firmId`, `firmClientId`, `engagementId`, `portcoId` (enforced both in the publisher and by the `ledger_events_scope_check` DB constraint).

## Consuming events

Use `registerProjection` + `startProjectionWorker` from `lib/events/consumer.ts`. Workers poll `ledger_events` by category, invoke the handler per event, and checkpoint `event_projections.last_processed_seq`.

```ts
import { registerProjection, startProjectionWorker } from "@/lib/events/consumer";

registerProjection({
  name: "ar_aging_projection",
  description: "Maintains AR aging buckets",
  categories: ["ar"],
  handler: async (event, client) => {
    /* update materialized view */
  },
});

const worker = startProjectionWorker("ar_aging_projection");
// worker.stop() to halt
```

## Event categories

See `lib/events/publisher.ts` for the canonical `EventCategory` list: `intake`, `ledger`, `cash_app`, `ar`, `ap`, `recon`, `close`, `assertion`, `rule`, `directive`, `ai_action`, `system`.

## Service-role client

All server-side event code resolves the service-role Supabase client via `createServiceClient()` in `lib/supabase/service.ts`, a thin adapter over `getSupabaseAdmin()`.

## Event bus implementation

- **Pilot (through v1.1):** Postgres `LISTEN/NOTIFY` (the `ledger_events_notify` trigger fires `pg_notify` on `ledger_events_{category}`) + consumer polling.
- **v1.2+:** Redpanda/Kafka (swap-in via the consumer module).

## Migration path when Redpanda is introduced

The publisher and consumer APIs are the swap surface. `ledger_events` remains the durable source of truth; Redpanda becomes a fan-out mechanism for cross-service consumers. No consumer code changes required.

## Batch atomicity

`publishEventsBatch` currently does sequential inserts under a shared `correlation_id`. When a single caller regularly exceeds ~10 events in a burst, move to a Postgres RPC batch function; the publisher API stays the same.

## Testing convention

Committed tests use a **mocked** Supabase client (no live writes) — `ledger_events` is append-only, so live test rows can never be cleaned up. The real trigger / `pg_notify` / insert path is exercised manually via `scripts/smoke/d-platform-foundation.ts` against live Supabase.
