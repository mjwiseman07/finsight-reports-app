import { describe, it, expect, beforeEach, vi } from "vitest";
import { canonicalPayloadJson } from "@/lib/ledger/merkle";

const { rpc, createServiceClient, fromSingle } = vi.hoisted(() => {
  const rpc = vi.fn();
  const fromSingle = vi.fn();
  const createServiceClient = vi.fn(() => ({
    rpc,
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          single: fromSingle,
        }),
      }),
    })),
  }));
  return { rpc, createServiceClient, fromSingle };
});

vi.mock("@/lib/supabase/service", () => ({ createServiceClient }));

import { publishEvent } from "@/lib/events/publisher";

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({
    data: [{ event_id: "evt-chain-1", event_hash: "hash-1", chain_index: 0 }],
    error: null,
  });
  fromSingle.mockResolvedValue({
    data: {
      event_sequence: 1,
      occurred_at: "2026-06-01T12:00:00Z",
      recorded_at: "2026-06-01T12:00:01Z",
      event_category: "ap",
    },
    error: null,
  });
});

describe("publishEvent — merkle chain RPC", () => {
  it("calls publish_ledger_event with canonical payload JSON", async () => {
    const payload = { bill_id: "b1", score: 0.35, nested: { z: 9, a: 1 } };
    const supabase = createServiceClient();

    await publishEvent(
      {
        eventType: "bill.fraud_score_updated",
        eventCategory: "ap",
        firmId: "f1",
        firmClientId: "fc1",
        aggregateType: "ap_intake_bill",
        aggregateId: "b1",
        actorType: "system",
        payload,
      },
      supabase as never,
    );

    expect(rpc).toHaveBeenCalledWith(
      "publish_ledger_event",
      expect.objectContaining({
        p_event_type: "bill.fraud_score_updated",
        p_event_category: "ap",
        p_event_payload: payload,
        p_event_payload_canonical: canonicalPayloadJson(payload),
      }),
    );
    expect(rpc.mock.calls[0][1].p_event_payload_canonical).toBe(
      JSON.stringify({ bill_id: "b1", nested: { a: 1, z: 9 }, score: 0.35 }),
    );
  });

  it("passes canonical JSON independent of payload key order", async () => {
    const payloadA = { b: 2, a: 1 };
    const payloadB = { a: 1, b: 2 };
    const supabase = createServiceClient();
    const base = {
      eventType: "bill.fraud_score_updated",
      eventCategory: "ap" as const,
      firmClientId: "fc1",
      aggregateType: "ap_intake_bill",
      aggregateId: "b1",
      actorType: "system" as const,
    };

    await publishEvent({ ...base, payload: payloadA }, supabase as never);
    await publishEvent({ ...base, payload: payloadB }, supabase as never);

    const firstCanonical = rpc.mock.calls[0][1].p_event_payload_canonical;
    const secondCanonical = rpc.mock.calls[1][1].p_event_payload_canonical;
    expect(firstCanonical).toBe(secondCanonical);
    expect(firstCanonical).toBe('{"a":1,"b":2}');
  });

  it("uses injected client rpc instead of createServiceClient default", async () => {
    const injectedRpc = vi.fn().mockResolvedValue({
      data: [{ event_id: "evt-injected", event_hash: "hash-x", chain_index: 5 }],
      error: null,
    });
    const injectedFromSingle = vi.fn().mockResolvedValue({
      data: {
        event_sequence: 5,
        occurred_at: "2026-06-01T12:00:00Z",
        recorded_at: "2026-06-01T12:00:01Z",
        event_category: "ap",
      },
      error: null,
    });
    const injectedClient = {
      rpc: injectedRpc,
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            single: injectedFromSingle,
          }),
        }),
      })),
    };

    const res = await publishEvent(
      {
        eventType: "bill.fraud_score_updated",
        eventCategory: "ap",
        firmClientId: "fc1",
        aggregateType: "ap_intake_bill",
        aggregateId: "b1",
        actorType: "system",
        payload: { score: 0.1 },
      },
      injectedClient as never,
    );

    expect(injectedRpc).toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(res.eventId).toBe("evt-injected");
    expect(res.eventSequence).toBe(5);
  });

  it("throws instead of silently falling back when RPC returns an error", async () => {
    const supabase = createServiceClient();
    // Simulate an RPC error (e.g. transient network / permission / function bug)
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "connection reset by peer" },
    });
    await expect(
      publishEvent(
        {
          eventType: "bill.fraud_score_updated",
          eventCategory: "ap",
          firmId: "f1",
          firmClientId: "fc1",
          aggregateType: "ap_intake_bill",
          aggregateId: "b-err",
          actorType: "system",
          payload: { bill_id: "b-err" },
        },
        supabase as never,
      ),
    ).rejects.toThrow(/publish_ledger_event RPC failed.*connection reset by peer/);
    // Confirm the legacy fallback insert path was NOT touched
    // (the mock's .from() would have been called if fallback happened).
    // The rpc mock IS called exactly once.
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("falls back to legacy insert only when supabase.rpc is undefined", async () => {
    // Build a legacy-style supabase mock with NO rpc method — matches the
    // 240+ pre-Block-5 tests. Confirms the fallback path still fires when
    // .rpc doesn't exist on the client at all.
    const insertMock = vi.fn().mockReturnValue({
      select: () => ({
        single: async () => ({
          data: {
            event_id: "evt-legacy-1",
            event_sequence: 42,
            event_type: "bill.fraud_score_updated",
            event_category: "ap",
            occurred_at: "2026-07-07T00:00:00Z",
            recorded_at: "2026-07-07T00:00:01Z",
          },
          error: null,
        }),
      }),
    });
    const legacySupabase = {
      from: vi.fn(() => ({ insert: insertMock })),
      // NOTE: no rpc property at all
    };
    const result = await publishEvent(
      {
        eventType: "bill.fraud_score_updated",
        eventCategory: "ap",
        firmId: "f1",
        firmClientId: "fc1",
        aggregateType: "ap_intake_bill",
        aggregateId: "b-legacy",
        actorType: "system",
        payload: { bill_id: "b-legacy" },
      },
      legacySupabase as never,
    );
    expect(result.eventId).toBe("evt-legacy-1");
    expect(result.eventSequence).toBe(42);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });
});
