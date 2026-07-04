/**
 * D-Platform live smoke — exercises the REAL event-sourced foundation against
 * live Supabase. Run manually (writes un-deletable rows into the append-only
 * ledger, so do NOT run in CI):
 *
 *   npx tsx scripts/smoke/d-platform-foundation.ts
 *
 * Verifies:
 *   1. publishEvent inserts a real ledger_events row + returns a sequence
 *   2. ledger_events is immutable (UPDATE + DELETE both rejected by trigger)
 *   3. readAggregateStream reconstructs the aggregate in sequence order
 *   4. logAiAction writes ai_action_log + links a ledger event
 *   5. recordMetric writes platform_metrics
 *   6. event_projections _healthcheck row present
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { publishEvent } from "@/lib/events/publisher";
import { readAggregateStream } from "@/lib/events/consumer";
import { logAiAction } from "@/lib/ai/action-logger";
import { recordMetric } from "@/lib/metrics/platform-metrics";
import { randomUUID } from "node:crypto";

async function main(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: fc } = await supabase.from("firm_clients").select("id").limit(1).single();
  const firmClientId = fc!.id as string;
  console.log("=== D-Platform Live Smoke ===");
  console.log("firm_client_id:", firmClientId);

  // 1. publishEvent
  const aggregateId = `smoke_${randomUUID()}`;
  const e1 = await publishEvent({
    eventType: "smoke.event.a",
    eventCategory: "system",
    firmClientId,
    aggregateType: "smoke_agg",
    aggregateId,
    actorType: "system",
    payload: { step: 1 },
  });
  console.log("published:", e1.eventId, "seq:", e1.eventSequence);

  // 2. immutability
  const upd = await supabase
    .from("ledger_events")
    .update({ event_type: "mutated" })
    .eq("event_id", e1.eventId);
  console.log("UPDATE rejected:", Boolean(upd.error), upd.error?.message);
  const del = await supabase.from("ledger_events").delete().eq("event_id", e1.eventId);
  console.log("DELETE rejected:", Boolean(del.error), del.error?.message);

  // 3. readAggregateStream
  await publishEvent({
    eventType: "smoke.event.b",
    eventCategory: "system",
    firmClientId,
    aggregateType: "smoke_agg",
    aggregateId,
    actorType: "system",
    payload: { step: 2 },
  });
  const stream = await readAggregateStream("smoke_agg", aggregateId);
  console.log("aggregate stream length:", stream.length, "ordered:", stream.map((s) => s.eventType));

  // 4. logAiAction
  const ai = await logAiAction({
    firmClientId,
    actionType: "smoke_extract",
    actionCategory: "intake_ocr",
    modelName: "claude-3-5-sonnet-20241022",
    modelProvider: "anthropic",
    input: { pdf: "s3://smoke/x.pdf" },
    output: { vendor: "ACME", amount: 100 },
    confidence: 0.97,
  });
  console.log("ai action:", ai.actionId, "linked event:", ai.eventId);

  // 5. recordMetric
  await recordMetric({
    firmClientId,
    metricName: "smoke_latency_ms",
    metricValue: 42,
    metricUnit: "ms",
  });
  console.log("metric recorded");

  // 6. healthcheck projection
  const { data: hc } = await supabase
    .from("event_projections")
    .select("projection_name, event_categories")
    .eq("projection_name", "_healthcheck")
    .single();
  console.log("_healthcheck projection:", hc);

  console.log("=== smoke complete ===");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
