import { describe, it, expect } from "vitest";
import { computeEventHash } from "@/lib/ledger/merkle";
import { verifyChain } from "@/lib/ledger/chain-verifier";

function buildChainRow(args: {
  chainIndex: number;
  previousEventHash: string | null;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
}) {
  const eventHash = computeEventHash({
    previousEventHash: args.previousEventHash,
    eventId: args.eventId,
    eventType: args.eventType,
    payload: args.payload,
  });
  return {
    event_id: args.eventId,
    event_type: args.eventType,
    event_payload: args.payload,
    event_hash: eventHash,
    previous_event_hash: args.previousEventHash,
    chain_index: args.chainIndex,
  };
}

function makeSupabase(rows: ReturnType<typeof buildChainRow>[]) {
  const chain = {
    select: () => chain,
    not: () => chain,
    gte: () => chain,
    lte: () => chain,
    order: () => chain,
    limit: () => Promise.resolve({ data: rows, error: null }),
  };
  return { from: () => chain } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

describe("verifyChain", () => {
  it("returns ok for a valid contiguous hash chain", async () => {
    const row0 = buildChainRow({
      chainIndex: 0,
      previousEventHash: null,
      eventId: "e0",
      eventType: "bill.received",
      payload: { n: 1 },
    });
    const row1 = buildChainRow({
      chainIndex: 1,
      previousEventHash: row0.event_hash,
      eventId: "e1",
      eventType: "bill.fraud_score_updated",
      payload: { score: 0.5 },
    });

    const result = await verifyChain({ supabase: makeSupabase([row0, row1]) });
    expect(result.ok).toBe(true);
    expect(result.eventsChecked).toBe(2);
    expect(result.reason).toBeNull();
  });

  it("detects chain_index gaps", async () => {
    const row = buildChainRow({
      chainIndex: 2,
      previousEventHash: null,
      eventId: "e2",
      eventType: "bill.received",
      payload: {},
    });

    const result = await verifyChain({ supabase: makeSupabase([row]) });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/chain_index gap/);
    expect(result.firstBrokenChainIndex).toBe(2);
  });

  it("detects previous_event_hash mismatch", async () => {
    const row = buildChainRow({
      chainIndex: 0,
      previousEventHash: "wrong-prev",
      eventId: "e0",
      eventType: "bill.received",
      payload: {},
    });

    const result = await verifyChain({ supabase: makeSupabase([row]) });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/previous_event_hash mismatch/);
  });

  it("detects recomputed event_hash mismatch", async () => {
    const row = buildChainRow({
      chainIndex: 0,
      previousEventHash: null,
      eventId: "e0",
      eventType: "bill.received",
      payload: { ok: true },
    });
    row.event_hash = "deadbeef";

    const result = await verifyChain({ supabase: makeSupabase([row]) });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/event_hash mismatch/);
  });

  it("returns query_error when supabase query fails", async () => {
    const chain = {
      select: () => chain,
      not: () => chain,
      gte: () => chain,
      order: () => chain,
      limit: () => Promise.resolve({ data: null, error: { message: "timeout" } }),
    };
    const supabase = { from: () => chain } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await verifyChain({ supabase });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("query_error: timeout");
  });
});
