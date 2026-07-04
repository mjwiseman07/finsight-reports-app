import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeMockClient, type MockClientHandle } from "./_mock-supabase-events";

const state = vi.hoisted(() => ({ handle: null as unknown as MockClientHandle }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => state.handle.client,
}));

import {
  registerProjection,
  listProjections,
  readAggregateStream,
  rowToEvent,
  startProjectionWorker,
  _clearProjectionsForTest,
  type LedgerEvent,
} from "@/lib/events/consumer";

function fullRow(overrides: Record<string, unknown> = {}) {
  return {
    event_id: "evt-1",
    event_sequence: 10,
    event_type: "t.a",
    event_category: "system",
    event_version: 1,
    firm_id: "firm-1",
    firm_client_id: "fc-1",
    engagement_id: "eng-1",
    portco_id: "pc-1",
    close_period_id: "cp-1",
    aggregate_type: "agg",
    aggregate_id: "agg-1",
    actor_type: "system",
    actor_id: "sys",
    event_payload: { a: 1 },
    event_metadata: { m: 2 },
    causation_event_id: "cause-1",
    correlation_id: "corr-1",
    occurred_at: "2026-07-06T00:00:00.000Z",
    recorded_at: "2026-07-06T00:00:01.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  state.handle = makeMockClient();
  _clearProjectionsForTest();
});

describe("registerProjection / listProjections", () => {
  it("registers a projection and lists it", () => {
    registerProjection({ name: "p1", description: "d", categories: ["system"], handler: async () => {} });
    expect(listProjections()).toContain("p1");
  });

  it("rejects duplicate registration", () => {
    registerProjection({ name: "dup", description: "d", categories: ["system"], handler: async () => {} });
    expect(() =>
      registerProjection({ name: "dup", description: "d", categories: ["system"], handler: async () => {} }),
    ).toThrow(/already registered/);
  });

  it("supports multiple distinct projections", () => {
    registerProjection({ name: "a", description: "d", categories: ["ar"], handler: async () => {} });
    registerProjection({ name: "b", description: "d", categories: ["ap"], handler: async () => {} });
    expect(listProjections()).toEqual(expect.arrayContaining(["a", "b"]));
  });
});

describe("rowToEvent", () => {
  it("maps every column onto the camelCase event shape", () => {
    const e = rowToEvent(fullRow());
    expect(e).toMatchObject({
      eventId: "evt-1",
      eventSequence: 10,
      eventType: "t.a",
      eventCategory: "system",
      eventVersion: 1,
      firmId: "firm-1",
      firmClientId: "fc-1",
      engagementId: "eng-1",
      portcoId: "pc-1",
      closePeriodId: "cp-1",
      aggregateType: "agg",
      aggregateId: "agg-1",
      actorType: "system",
      actorId: "sys",
      causationEventId: "cause-1",
      correlationId: "corr-1",
    });
    expect(e.payload).toEqual({ a: 1 });
    expect(e.metadata).toEqual({ m: 2 });
    expect(e.occurredAt).toBeInstanceOf(Date);
    expect(e.recordedAt).toBeInstanceOf(Date);
  });

  it("coalesces missing nullable columns to null and defaults payload/metadata", () => {
    const e = rowToEvent({
      event_id: "e",
      event_sequence: 1,
      event_type: "t",
      event_category: "system",
      event_version: 1,
      aggregate_type: "a",
      aggregate_id: "a1",
      actor_type: "system",
      occurred_at: "2026-07-06T00:00:00.000Z",
      recorded_at: "2026-07-06T00:00:00.000Z",
    });
    expect(e.firmId).toBeNull();
    expect(e.firmClientId).toBeNull();
    expect(e.engagementId).toBeNull();
    expect(e.portcoId).toBeNull();
    expect(e.closePeriodId).toBeNull();
    expect(e.actorId).toBeNull();
    expect(e.causationEventId).toBeNull();
    expect(e.correlationId).toBeNull();
    expect(e.payload).toEqual({});
    expect(e.metadata).toEqual({});
  });
});

describe("readAggregateStream", () => {
  it("returns mapped events in the order the DB returns them", async () => {
    state.handle.queue("ledger_events", {
      data: [fullRow({ event_type: "t.a", event_sequence: 1 }), fullRow({ event_type: "t.b", event_sequence: 2 })],
      error: null,
    });
    const stream = await readAggregateStream("agg", "agg-1", state.handle.client as never);
    expect(stream.map((s) => s.eventType)).toEqual(["t.a", "t.b"]);
    expect(stream[0].eventSequence).toBeLessThan(stream[1].eventSequence);
  });

  it("returns [] when there are no events", async () => {
    state.handle.queue("ledger_events", { data: [], error: null });
    const stream = await readAggregateStream("agg", "none", state.handle.client as never);
    expect(stream).toEqual([]);
  });

  it("throws when the query errors", async () => {
    state.handle.queue("ledger_events", { data: null, error: { message: "db down" } });
    await expect(readAggregateStream("agg", "x", state.handle.client as never)).rejects.toThrow(
      /readAggregateStream failed: db down/,
    );
  });

  it("filters by aggregate_type + aggregate_id and orders by sequence", async () => {
    state.handle.queue("ledger_events", { data: [], error: null });
    await readAggregateStream("bill", "b-9", state.handle.client as never);
    const call = state.handle.callsFor("ledger_events")[0];
    expect(call.ops).toContain("eq");
    expect(call.ops).toContain("order");
    // Two eq calls: aggregate_type then aggregate_id
    const eqArgs = call.args.filter((_, i) => call.ops[i] === "eq");
    expect(eqArgs).toEqual([
      ["aggregate_type", "bill"],
      ["aggregate_id", "b-9"],
    ]);
  });
});

describe("startProjectionWorker", () => {
  it("throws for an unregistered projection", () => {
    expect(() => startProjectionWorker("ghost", state.handle.client as never)).toThrow(
      /not registered/,
    );
  });

  it("processes a batch, invokes the handler, and checkpoints", async () => {
    state.handle.queue("ledger_events", {
      data: [fullRow({ event_type: "t.worker", event_sequence: 42 })],
      error: null,
    });
    const seen: LedgerEvent[] = [];
    let resolveFirst!: () => void;
    const firstProcessed = new Promise<void>((r) => (resolveFirst = r));
    registerProjection({
      name: "worker_ok",
      description: "d",
      categories: ["system"],
      pollIntervalMs: 5,
      handler: async (e) => {
        seen.push(e);
        resolveFirst();
      },
    });

    const worker = startProjectionWorker("worker_ok", state.handle.client as never);
    await firstProcessed;
    await new Promise((r) => setTimeout(r, 30));
    worker.stop();

    expect(seen).toHaveLength(1);
    expect(seen[0].eventType).toBe("t.worker");
    // event_projections upsert (register) + update (checkpoint) both happened
    const epOps = state.handle.callsFor("event_projections").flatMap((c) => c.ops);
    expect(epOps).toContain("upsert");
    expect(epOps).toContain("update");
  });

  it("records an error and does not crash when the handler throws", async () => {
    state.handle.queue("ledger_events", {
      data: [fullRow({ event_type: "t.err", event_sequence: 7 })],
      error: null,
    });
    let resolveErr!: () => void;
    const errored = new Promise<void>((r) => (resolveErr = r));
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    registerProjection({
      name: "worker_err",
      description: "d",
      categories: ["system"],
      pollIntervalMs: 5,
      handler: async () => {
        resolveErr();
        throw new Error("handler blew up");
      },
    });

    const worker = startProjectionWorker("worker_err", state.handle.client as never);
    await errored;
    await new Promise((r) => setTimeout(r, 30));
    worker.stop();

    const updates = state.handle
      .callsFor("event_projections")
      .filter((c) => c.ops.includes("update"))
      .map((c) => c.args[c.ops.indexOf("update")][0] as Record<string, unknown>);
    expect(updates.some((u) => u.status === "error")).toBe(true);
    warn.mockRestore();
  });
});
