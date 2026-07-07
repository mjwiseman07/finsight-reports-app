import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeMockClient, type MockClientHandle } from "./_mock-supabase-events";

const state = vi.hoisted(() => ({ handle: null as unknown as MockClientHandle }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => state.handle.client,
}));

import {
  publishEvent,
  publishEventsBatch,
  type EventCategory,
  type ActorType,
} from "@/lib/events/publisher";

let seqCounter = 0;
function okEvent(overrides: Record<string, unknown> = {}) {
  seqCounter += 1;
  return {
    data: {
      event_id: `evt-${seqCounter}`,
      event_sequence: seqCounter,
      event_type: "test.event",
      event_category: "system",
      occurred_at: "2026-07-06T00:00:00.000Z",
      recorded_at: "2026-07-06T00:00:00.000Z",
      ...overrides,
    },
    error: null as { message: string } | null,
  };
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    eventType: "test.event",
    eventCategory: "system" as EventCategory,
    firmClientId: "fc-1",
    aggregateType: "test",
    aggregateId: "agg-1",
    actorType: "system" as ActorType,
    payload: { a: 1 },
    ...overrides,
  };
}

beforeEach(() => {
  state.handle = makeMockClient();
  seqCounter = 0;
});

describe("publishEvent — scope validation", () => {
  it("rejects an event with no scope", async () => {
    await expect(
      publishEvent(baseInput({ firmClientId: undefined }) as never),
    ).rejects.toThrow(/must be scoped/);
  });

  it.each([
    ["firmId", { firmId: "firm-1" }],
    ["firmClientId", { firmClientId: "fc-1" }],
    ["engagementId", { engagementId: "eng-1" }],
    ["portcoId", { portcoId: "pc-1" }],
  ])("accepts an event scoped only by %s", async (_label, scope) => {
    state.handle.queue("ledger_events", okEvent());
    const res = await publishEvent(baseInput({ firmClientId: undefined, ...scope }));
    expect(res.eventId).toBeTruthy();
  });

  it("does not touch the DB when scope validation fails", async () => {
    await expect(publishEvent(baseInput({ firmClientId: undefined }) as never)).rejects.toThrow();
    expect(state.handle.callsFor("ledger_events")).toHaveLength(0);
  });
});

describe("publishEvent — category validation", () => {
  const categories: EventCategory[] = [
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
  ];

  it.each(categories)("accepts valid category '%s' and maps it onto the row", async (cat) => {
    state.handle.queue("ledger_events", okEvent({ event_category: cat }));
    const eventType =
      cat === "cash_app"
        ? "remittance_ingested"
        : cat === "ap"
          ? "bill.received"
          : "test.event";
    const res = await publishEvent(baseInput({ eventCategory: cat, eventType }));
    expect(res.eventCategory).toBe(cat);
    const row = state.handle.firstArg("ledger_events", "insert") as Record<string, unknown>;
    expect(row.event_category).toBe(cat);
  });

  it.each(["nope", "Intake", "", "ledgerx"])(
    "rejects invalid category '%s'",
    async (bad) => {
      await expect(
        publishEvent(baseInput({ eventCategory: bad as never })),
      ).rejects.toThrow(/invalid eventCategory/);
    },
  );
});

describe("publishEvent — actor validation", () => {
  const actors: ActorType[] = ["user", "system", "ai_agent", "integration", "rule", "recurring"];

  it.each(actors)("accepts valid actorType '%s'", async (actor) => {
    state.handle.queue("ledger_events", okEvent());
    const res = await publishEvent(baseInput({ actorType: actor }));
    expect(res.eventId).toBeTruthy();
    const row = state.handle.firstArg("ledger_events", "insert") as Record<string, unknown>;
    expect(row.actor_type).toBe(actor);
  });

  it.each(["admin", "bot", ""])("rejects invalid actorType '%s'", async (bad) => {
    await expect(publishEvent(baseInput({ actorType: bad as never }))).rejects.toThrow(
      /invalid actorType/,
    );
  });
});

describe("publishEvent — field mapping + defaults", () => {
  it("defaults event_version=1, empty metadata, and generates correlation + occurred_at", async () => {
    state.handle.queue("ledger_events", okEvent());
    await publishEvent(baseInput());
    const row = state.handle.firstArg("ledger_events", "insert") as Record<string, unknown>;
    expect(row.event_version).toBe(1);
    expect(row.event_metadata).toEqual({});
    expect(row.correlation_id).toBeTruthy();
    expect(row.occurred_at).toBeTruthy();
    expect(row.firm_id).toBeNull();
    expect(row.engagement_id).toBeNull();
    expect(row.portco_id).toBeNull();
    expect(row.close_period_id).toBeNull();
    expect(row.actor_id).toBeNull();
    expect(row.causation_event_id).toBeNull();
  });

  it("passes through all optional fields when provided", async () => {
    state.handle.queue("ledger_events", okEvent());
    const occurred = new Date("2026-01-02T03:04:05.000Z");
    await publishEvent(
      baseInput({
        eventVersion: 3,
        firmId: "firm-9",
        engagementId: "eng-9",
        portcoId: "pc-9",
        closePeriodId: "cp-9",
        actorId: "ceo@x.com",
        metadata: { trace: "t1" },
        causationEventId: "cause-1",
        correlationId: "corr-fixed",
        occurredAt: occurred,
      }),
    );
    const row = state.handle.firstArg("ledger_events", "insert") as Record<string, unknown>;
    expect(row.event_version).toBe(3);
    expect(row.firm_id).toBe("firm-9");
    expect(row.engagement_id).toBe("eng-9");
    expect(row.portco_id).toBe("pc-9");
    expect(row.close_period_id).toBe("cp-9");
    expect(row.actor_id).toBe("ceo@x.com");
    expect(row.event_metadata).toEqual({ trace: "t1" });
    expect(row.causation_event_id).toBe("cause-1");
    expect(row.correlation_id).toBe("corr-fixed");
    expect(row.occurred_at).toBe(occurred.toISOString());
  });

  it("returns a normalized PublishedEvent shape", async () => {
    state.handle.queue(
      "ledger_events",
      okEvent({ event_id: "evt-x", event_sequence: 77, event_type: "t.z", event_category: "ar" }),
    );
    const res = await publishEvent(baseInput({ eventType: "t.z", eventCategory: "ar" }));
    expect(res).toMatchObject({
      eventId: "evt-x",
      eventSequence: 77,
      eventType: "t.z",
      eventCategory: "ar",
    });
    expect(res.occurredAt).toBeInstanceOf(Date);
    expect(res.recordedAt).toBeInstanceOf(Date);
  });

  it("wraps a Supabase insert error", async () => {
    state.handle.queue("ledger_events", { data: null, error: { message: "boom" } });
    await expect(publishEvent(baseInput())).rejects.toThrow(/publishEvent failed: boom/);
  });

  it("uses an injected client over createServiceClient", async () => {
    const injected = makeMockClient();
    injected.queue("ledger_events", okEvent());
    await publishEvent(baseInput(), injected.client as never);
    expect(injected.callsFor("ledger_events")).toHaveLength(1);
    // Default mock (state.handle) untouched
    expect(state.handle.callsFor("ledger_events")).toHaveLength(0);
  });
});

describe("publishEvent — core field mapping", () => {
  it("maps aggregateType, aggregateId, eventType and payload verbatim", async () => {
    state.handle.queue("ledger_events", okEvent());
    await publishEvent(
      baseInput({
        eventType: "bill.received",
        aggregateType: "bill",
        aggregateId: "qbo:12345",
        payload: { vendor: "ACME", amount: 1234.56 },
      }),
    );
    const row = state.handle.firstArg("ledger_events", "insert") as Record<string, unknown>;
    expect(row.event_type).toBe("bill.received");
    expect(row.aggregate_type).toBe("bill");
    expect(row.aggregate_id).toBe("qbo:12345");
    expect(row.event_payload).toEqual({ vendor: "ACME", amount: 1234.56 });
  });

  it("maps firm_client_id when firmClientId is supplied", async () => {
    state.handle.queue("ledger_events", okEvent());
    await publishEvent(baseInput({ firmClientId: "fc-77" }));
    const row = state.handle.firstArg("ledger_events", "insert") as Record<string, unknown>;
    expect(row.firm_client_id).toBe("fc-77");
  });

  it("generates a fresh correlation_id per call when none provided", async () => {
    state.handle.queue("ledger_events", okEvent(), okEvent());
    await publishEvent(baseInput());
    await publishEvent(baseInput());
    const inserts = state.handle
      .callsFor("ledger_events")
      .map((c) => c.args[c.ops.indexOf("insert")][0] as Record<string, unknown>);
    expect(inserts[0].correlation_id).not.toBe(inserts[1].correlation_id);
  });

  it("defaults occurred_at to a valid ISO timestamp string", async () => {
    state.handle.queue("ledger_events", okEvent());
    await publishEvent(baseInput());
    const row = state.handle.firstArg("ledger_events", "insert") as Record<string, unknown>;
    expect(Number.isNaN(Date.parse(row.occurred_at as string))).toBe(false);
  });

  it("accepts an event scoped by both firmId and firmClientId together", async () => {
    state.handle.queue("ledger_events", okEvent());
    const res = await publishEvent(baseInput({ firmId: "firm-1", firmClientId: "fc-1" }));
    expect(res.eventId).toBeTruthy();
  });

  it("accepts an event scoped by all four scope fields", async () => {
    state.handle.queue("ledger_events", okEvent());
    const res = await publishEvent(
      baseInput({ firmId: "firm-1", firmClientId: "fc-1", engagementId: "eng-1", portcoId: "pc-1" }),
    );
    expect(res.eventId).toBeTruthy();
  });
});

describe("publishEventsBatch", () => {
  it("returns [] for empty input without touching the DB", async () => {
    const res = await publishEventsBatch([]);
    expect(res).toEqual([]);
    expect(state.handle.callsFor("ledger_events")).toHaveLength(0);
  });

  it("preserves order and shares one correlation_id across all events", async () => {
    state.handle.queue(
      "ledger_events",
      okEvent({ event_id: "b1", event_sequence: 1 }),
      okEvent({ event_id: "b2", event_sequence: 2 }),
      okEvent({ event_id: "b3", event_sequence: 3 }),
    );
    const res = await publishEventsBatch([
      baseInput({ eventType: "b.1" }),
      baseInput({ eventType: "b.2" }),
      baseInput({ eventType: "b.3" }),
    ]);
    expect(res.map((r) => r.eventSequence)).toEqual([1, 2, 3]);
    const inserts = state.handle
      .callsFor("ledger_events")
      .map((c) => c.args[c.ops.indexOf("insert")][0] as Record<string, unknown>);
    const corrIds = new Set(inserts.map((r) => r.correlation_id));
    expect(corrIds.size).toBe(1);
  });

  it("reuses a provided correlationId from the first input", async () => {
    state.handle.queue("ledger_events", okEvent(), okEvent());
    await publishEventsBatch([
      baseInput({ correlationId: "shared-corr" }),
      baseInput(),
    ]);
    const inserts = state.handle
      .callsFor("ledger_events")
      .map((c) => c.args[c.ops.indexOf("insert")][0] as Record<string, unknown>);
    expect(inserts.every((r) => r.correlation_id === "shared-corr")).toBe(true);
  });

  it("validates every input before any write (invalid one rejects, nothing written)", async () => {
    await expect(
      publishEventsBatch([baseInput(), baseInput({ eventCategory: "bad" as never })]),
    ).rejects.toThrow(/invalid eventCategory/);
    expect(state.handle.callsFor("ledger_events")).toHaveLength(0);
  });
});
