/**
 * Event Consumer for Advisacor Projection Workers
 *
 * Projection workers subscribe to event categories and update materialized views
 * (balance sheet, P&L, AR aging, AP aging, assertion coverage, etc).
 *
 * For pilot scale we use polling rather than LISTEN/NOTIFY because polling is
 * simpler to reason about, retryable, and works across horizontal replicas.
 * When we swap to Redpanda in v1.2, this file is the single point of change.
 *
 * Usage:
 *   import { registerProjection, startProjectionWorker } from '@/lib/events/consumer';
 *   registerProjection({
 *     name: 'ar_aging_projection',
 *     description: 'Maintains AR aging buckets',
 *     categories: ['ar'],
 *     handler: async (event) => { ... }
 *   });
 *   const worker = startProjectionWorker('ar_aging_projection');
 */
import { createServiceClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventCategory } from "./publisher";

export interface LedgerEvent {
  eventId: string;
  eventSequence: number;
  eventType: string;
  eventCategory: EventCategory;
  eventVersion: number;
  firmId: string | null;
  firmClientId: string | null;
  engagementId: string | null;
  portcoId: string | null;
  closePeriodId: string | null;
  aggregateType: string;
  aggregateId: string;
  actorType: string;
  actorId: string | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  causationEventId: string | null;
  correlationId: string | null;
  occurredAt: Date;
  recordedAt: Date;
}

export type ProjectionHandler = (event: LedgerEvent, client: SupabaseClient) => Promise<void>;

interface ProjectionDefinition {
  name: string;
  description: string;
  categories: EventCategory[];
  handler: ProjectionHandler;
  batchSize: number;
  pollIntervalMs: number;
}

const projections = new Map<string, ProjectionDefinition>();

export function registerProjection(
  def: Omit<ProjectionDefinition, "batchSize" | "pollIntervalMs"> & {
    batchSize?: number;
    pollIntervalMs?: number;
  },
): void {
  if (projections.has(def.name)) {
    throw new Error(`Projection '${def.name}' already registered`);
  }
  projections.set(def.name, {
    ...def,
    batchSize: def.batchSize ?? 100,
    pollIntervalMs: def.pollIntervalMs ?? 200,
  });
}

export function listProjections(): string[] {
  return Array.from(projections.keys());
}

/** Test-only: clear the in-memory registry. */
export function _clearProjectionsForTest(): void {
  projections.clear();
}

export function rowToEvent(row: Record<string, unknown>): LedgerEvent {
  return {
    eventId: row.event_id as string,
    eventSequence: row.event_sequence as number,
    eventType: row.event_type as string,
    eventCategory: row.event_category as EventCategory,
    eventVersion: row.event_version as number,
    firmId: (row.firm_id as string) ?? null,
    firmClientId: (row.firm_client_id as string) ?? null,
    engagementId: (row.engagement_id as string) ?? null,
    portcoId: (row.portco_id as string) ?? null,
    closePeriodId: (row.close_period_id as string) ?? null,
    aggregateType: row.aggregate_type as string,
    aggregateId: row.aggregate_id as string,
    actorType: row.actor_type as string,
    actorId: (row.actor_id as string) ?? null,
    payload: (row.event_payload as Record<string, unknown>) ?? {},
    metadata: (row.event_metadata as Record<string, unknown>) ?? {},
    causationEventId: (row.causation_event_id as string) ?? null,
    correlationId: (row.correlation_id as string) ?? null,
    occurredAt: new Date(row.occurred_at as string),
    recordedAt: new Date(row.recorded_at as string),
  };
}

/**
 * Ensure the projection is registered in event_projections table.
 * Called once at worker startup.
 */
async function ensureProjectionRegistered(
  def: ProjectionDefinition,
  client: SupabaseClient,
): Promise<void> {
  const { error } = await client.from("event_projections").upsert(
    {
      projection_name: def.name,
      description: def.description,
      event_categories: def.categories,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "projection_name", ignoreDuplicates: false },
  );
  if (error) throw new Error(`ensureProjectionRegistered failed: ${error.message}`);
}

/**
 * Fetch a batch of unprocessed events for this projection.
 */
async function fetchBatch(
  def: ProjectionDefinition,
  client: SupabaseClient,
): Promise<LedgerEvent[]> {
  const { data: state, error: stateError } = await client
    .from("event_projections")
    .select("last_processed_seq")
    .eq("projection_name", def.name)
    .single();
  if (stateError) throw new Error(`fetchBatch state read failed: ${stateError.message}`);

  const lastSeq = (state?.last_processed_seq as number) ?? 0;

  const { data, error } = await client
    .from("ledger_events")
    .select("*")
    .in("event_category", def.categories)
    .gt("event_sequence", lastSeq)
    .order("event_sequence", { ascending: true })
    .limit(def.batchSize);
  if (error) throw new Error(`fetchBatch read failed: ${error.message}`);

  return (data ?? []).map(rowToEvent);
}

async function commitCheckpoint(
  def: ProjectionDefinition,
  newLastSeq: number,
  _processedIncrement: number,
  client: SupabaseClient,
): Promise<void> {
  const { error } = await client
    .from("event_projections")
    .update({
      last_processed_seq: newLastSeq,
      updated_at: new Date().toISOString(),
    })
    .eq("projection_name", def.name);
  if (error) throw new Error(`commitCheckpoint failed: ${error.message}`);
}

async function recordProjectionError(
  def: ProjectionDefinition,
  err: Error,
  client: SupabaseClient,
): Promise<void> {
  await client
    .from("event_projections")
    .update({
      last_error: err.message.slice(0, 2000),
      last_error_at: new Date().toISOString(),
      status: "error",
    })
    .eq("projection_name", def.name);
}

/**
 * Start a projection worker. Returns a stop function.
 */
export function startProjectionWorker(
  name: string,
  client?: SupabaseClient,
): { stop: () => void } {
  const def = projections.get(name);
  if (!def) throw new Error(`Projection '${name}' not registered`);

  const supabase = client ?? createServiceClient();
  let stopped = false;

  const loop = async (): Promise<void> => {
    try {
      await ensureProjectionRegistered(def, supabase);
    } catch (err) {
      console.error(`[projection ${name}] failed to register:`, err);
      return;
    }

    while (!stopped) {
      try {
        const batch = await fetchBatch(def, supabase);
        if (batch.length === 0) {
          await new Promise((r) => setTimeout(r, def.pollIntervalMs));
          continue;
        }
        for (const event of batch) {
          await def.handler(event, supabase);
        }
        const lastSeq = batch[batch.length - 1].eventSequence;
        await commitCheckpoint(def, lastSeq, batch.length, supabase);
      } catch (err) {
        console.error(`[projection ${name}] batch failed:`, err);
        await recordProjectionError(def, err as Error, supabase);
        await new Promise((r) => setTimeout(r, Math.min(5000, def.pollIntervalMs * 10)));
      }
    }
  };

  void loop();

  return {
    stop: () => {
      stopped = true;
    },
  };
}

/**
 * Convenience: read events for a specific aggregate. Useful for
 * event-sourced state reconstruction and debugging.
 */
export async function readAggregateStream(
  aggregateType: string,
  aggregateId: string,
  client?: SupabaseClient,
): Promise<LedgerEvent[]> {
  const supabase = client ?? createServiceClient();
  const { data, error } = await supabase
    .from("ledger_events")
    .select("*")
    .eq("aggregate_type", aggregateType)
    .eq("aggregate_id", aggregateId)
    .order("event_sequence", { ascending: true });
  if (error) throw new Error(`readAggregateStream failed: ${error.message}`);
  return (data ?? []).map(rowToEvent);
}
