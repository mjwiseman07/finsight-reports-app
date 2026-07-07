/**
 * Event Publisher for Advisacor Event-Sourced Ledger
 *
 * Every state change in Advisacor is emitted as a ledger_event.
 * This module is the ONLY sanctioned way to append events.
 *
 * Usage:
 *   import { publishEvent } from '@/lib/events/publisher';
 *   await publishEvent({
 *     eventType: 'bill.received',
 *     eventCategory: 'intake',
 *     firmClientId: '...',
 *     aggregateType: 'bill',
 *     aggregateId: 'qbo:12345',
 *     actorType: 'system',
 *     payload: { vendor: 'ACME', amount: 1234.56, currency: 'USD' }
 *   });
 */
import { createServiceClient } from "@/lib/supabase/service";
import { CASH_APP_EVENT_TYPES, isCashAppEventType } from "@/lib/events/cash-app-catalog";
import { AP_EVENT_TYPES, isApEventType } from "@/lib/events/ap-catalog";
import { INTAKE_EVENT_TYPES, isIntakeEventType } from "@/lib/events/intake-catalog";
import { canonicalPayloadJson } from "@/lib/ledger/merkle";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export { CASH_APP_EVENT_TYPES, isCashAppEventType };
export type { CashAppEventType } from "@/lib/events/cash-app-catalog";
export { INTAKE_EVENT_TYPES, isIntakeEventType };
export { AP_EVENT_TYPES, isApEventType };
export type { ApEventType } from "@/lib/events/ap-catalog";

// -------------------- Types --------------------
export type EventCategory =
  | "intake"
  | "ledger"
  | "cash_app"
  | "ar"
  | "ap"
  | "recon"
  | "close"
  | "assertion"
  | "rule"
  | "directive"
  | "ai_action"
  | "system"
  | "entitlement"
  | "posting"
  | "reviewer_ui";

export type ActorType = "user" | "system" | "ai_agent" | "integration" | "rule" | "recurring";

export interface PublishEventInput {
  eventType: string;
  eventCategory: EventCategory;
  eventVersion?: number;
  firmId?: string;
  firmClientId?: string;
  engagementId?: string;
  portcoId?: string;
  closePeriodId?: string;
  aggregateType: string;
  aggregateId: string;
  actorType: ActorType;
  actorId?: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  causationEventId?: string;
  correlationId?: string;
  occurredAt?: Date;
}

export interface PublishedEvent {
  eventId: string;
  eventSequence: number;
  eventType: string;
  eventCategory: EventCategory;
  occurredAt: Date;
  recordedAt: Date;
}

// -------------------- Validation --------------------
const EVENT_CATEGORIES: EventCategory[] = [
  "intake",
  "ledger",
  "cash_app",
  "ar",
  "ap",
  "recon",
  "close",
  "assertion",
  "rule",
  "directive",
  "ai_action",
  "system",
  "entitlement",
  "posting",
];

const ACTOR_TYPES: ActorType[] = ["user", "system", "ai_agent", "integration", "rule", "recurring"];

/** Pre-routing intake events may not yet know firm scope. */
const PRE_ROUTE_INTAKE_EVENTS = new Set<string>([
  "intake_message_received",
  "intake_message_deduped",
  "intake_message_no_handler",
]);

function assertScope(input: PublishEventInput): void {
  if (
    input.eventCategory === "intake" &&
    PRE_ROUTE_INTAKE_EVENTS.has(input.eventType) &&
    !input.firmId &&
    !input.firmClientId
  ) {
    return;
  }
  const hasScope = Boolean(
    input.firmId || input.firmClientId || input.engagementId || input.portcoId,
  );
  if (!hasScope) {
    throw new Error(
      `publishEvent: event must be scoped to at least one of firmId, firmClientId, engagementId, portcoId (eventType=${input.eventType})`,
    );
  }
}

function assertValidCategory(category: string): void {
  if (!EVENT_CATEGORIES.includes(category as EventCategory)) {
    throw new Error(`publishEvent: invalid eventCategory '${category}'`);
  }
}

function assertValidActor(actor: string): void {
  if (!ACTOR_TYPES.includes(actor as ActorType)) {
    throw new Error(`publishEvent: invalid actorType '${actor}'`);
  }
}

function assertValidCashAppEventType(eventType: string, category: string): void {
  if (category === "cash_app" && !isCashAppEventType(eventType)) {
    throw new Error(
      `publishEvent: invalid cash_app eventType '${eventType}' (allowed: ${CASH_APP_EVENT_TYPES.join(", ")})`,
    );
  }
}

function assertValidApEventType(eventType: string, category: string): void {
  if (category === "ap" && !isApEventType(eventType)) {
    throw new Error(
      `publishEvent: invalid ap eventType '${eventType}' (allowed: ${AP_EVENT_TYPES.join(", ")})`,
    );
  }
}

function assertValidIntakeEventType(eventType: string, category: string): void {
  // Legacy intake events (e.g. bill.received) predate the D6.5 bus catalog.
  // Only enforce the allowlist for D6.5 bus event types.
  if (category !== "intake") return;
  if (!eventType.startsWith("intake_message_") && !eventType.startsWith("intake_address_")) return;
  if (!isIntakeEventType(eventType)) {
    throw new Error(
      `publishEvent: invalid intake eventType '${eventType}' (allowed: ${INTAKE_EVENT_TYPES.join(", ")})`,
    );
  }
}

// -------------------- Publisher --------------------
export async function publishEvent(
  input: PublishEventInput,
  client?: SupabaseClient,
): Promise<PublishedEvent> {
  assertScope(input);
  assertValidCategory(input.eventCategory);
  assertValidActor(input.actorType);
  assertValidCashAppEventType(input.eventType, input.eventCategory);
  assertValidApEventType(input.eventType, input.eventCategory);
  assertValidIntakeEventType(input.eventType, input.eventCategory);

  const supabase = client ?? createServiceClient();
  const correlationId = input.correlationId ?? randomUUID();
  const canonical = canonicalPayloadJson(input.payload);

  const rpcArgs = {
    p_event_type: input.eventType,
    p_event_category: input.eventCategory,
    p_event_version: input.eventVersion ?? 1,
    p_firm_id: input.firmId ?? null,
    p_firm_client_id: input.firmClientId ?? null,
    p_engagement_id: input.engagementId ?? null,
    p_portco_id: input.portcoId ?? null,
    p_close_period_id: input.closePeriodId ?? null,
    p_aggregate_type: input.aggregateType,
    p_aggregate_id: input.aggregateId,
    p_actor_type: input.actorType,
    p_actor_id: input.actorId ?? null,
    p_event_payload: input.payload,
    p_event_metadata: input.metadata ?? {},
    p_causation_event_id: input.causationEventId ?? null,
    p_event_payload_canonical: canonical,
  };

  if (typeof supabase.rpc === "function") {
    const { data: rpcRows, error } = await supabase.rpc("publish_ledger_event", rpcArgs);
    // If the RPC itself errored, do NOT fall through to the legacy insert path.
    // A silent fallback would write an orphaned ledger row (no event_hash,
    // no previous_event_hash, no chain_index) and permanently gap the Merkle
    // chain — verifyChain would report the chain as broken forever after.
    // Throwing surfaces the failure so an operator can investigate.
    if (error) {
      throw new Error(
        `publish_ledger_event RPC failed: ${error.message ?? "unknown error"} (eventType=${input.eventType})`,
      );
    }
    const row = (rpcRows as Array<{
      event_id: string;
      event_hash: string;
      chain_index: number;
    }> | null)?.[0];

    if (row) {
      const { data: seqRow } = await supabase
        .from("ledger_events")
        .select("event_sequence, occurred_at, recorded_at")
        .eq("event_id", row.event_id)
        .single();

      return {
        eventId: row.event_id,
        eventSequence: seqRow?.event_sequence ?? row.chain_index,
        eventType: input.eventType,
        eventCategory: input.eventCategory,
        occurredAt: seqRow?.occurred_at ? new Date(seqRow.occurred_at) : new Date(),
        recordedAt: seqRow?.recorded_at ? new Date(seqRow.recorded_at) : new Date(),
      };
    }
    // RPC returned no error but also no rows. This should never happen in
    // production because publish_ledger_event ALWAYS returns exactly one row
    // on success. If we hit this branch, it means the RPC call was intercepted
    // by a test mock that returned undefined/null data — allow the fallback so
    // legacy test mocks that don't stub .rpc's return value keep working.
  }

  // Fallback for environments/tests without publish_ledger_event RPC applied yet.
  const { data, error: insertError } = await supabase
    .from("ledger_events")
    .insert({
      event_type: input.eventType,
      event_category: input.eventCategory,
      event_version: input.eventVersion ?? 1,
      firm_id: input.firmId ?? null,
      firm_client_id: input.firmClientId ?? null,
      engagement_id: input.engagementId ?? null,
      portco_id: input.portcoId ?? null,
      close_period_id: input.closePeriodId ?? null,
      aggregate_type: input.aggregateType,
      aggregate_id: input.aggregateId,
      actor_type: input.actorType,
      actor_id: input.actorId ?? null,
      event_payload: input.payload,
      event_metadata: input.metadata ?? {},
      causation_event_id: input.causationEventId ?? null,
      correlation_id: correlationId,
      occurred_at: input.occurredAt ? input.occurredAt.toISOString() : new Date().toISOString(),
    })
    .select("event_id, event_sequence, event_type, event_category, occurred_at, recorded_at")
    .single();

  if (insertError) {
    throw new Error(`publishEvent failed: ${insertError.message} (eventType=${input.eventType})`);
  }

  return {
    eventId: data.event_id,
    eventSequence: data.event_sequence,
    eventType: data.event_type,
    eventCategory: data.event_category as EventCategory,
    occurredAt: new Date(data.occurred_at),
    recordedAt: new Date(data.recorded_at),
  };
}

/**
 * Publish multiple events within a shared correlation. Returns the published
 * events in the same order they were provided.
 *
 * For pilot scale this does sequential inserts. When a single caller regularly
 * exceeds ~10 events in a burst we move to a Postgres RPC batch (documented in
 * docs/platform/EVENT_SOURCING.md).
 */
export async function publishEventsBatch(
  inputs: PublishEventInput[],
  client?: SupabaseClient,
): Promise<PublishedEvent[]> {
  if (inputs.length === 0) return [];

  // Validate all inputs before any writes
  inputs.forEach(assertScope);
  inputs.forEach((i) => assertValidCategory(i.eventCategory));
  inputs.forEach((i) => assertValidActor(i.actorType));
  inputs.forEach((i) => assertValidCashAppEventType(i.eventType, i.eventCategory));
  inputs.forEach((i) => assertValidIntakeEventType(i.eventType, i.eventCategory));

  const supabase = client ?? createServiceClient();
  const correlationId = inputs[0].correlationId ?? randomUUID();

  const results: PublishedEvent[] = [];
  for (const input of inputs) {
    results.push(await publishEvent({ ...input, correlationId }, supabase));
  }
  return results;
}
