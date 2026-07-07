import { describe, it, expect, vi, beforeEach } from "vitest";

const publishEvent = vi.hoisted(() => vi.fn().mockResolvedValue({ eventId: "e1" }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent }));

import { aggregateFraudScore } from "@/lib/ap-intake/scoring/aggregator";

function makeSupabase() {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: updateEq }));
  const from = vi.fn((table: string) => {
    if (table === "fraud_score_signals") return { upsert };
    if (table === "ap_intake_bills") return { update };
    throw new Error(`unexpected table ${table}`);
  });
  return { supabase: { from } as unknown as import("@supabase/supabase-js").SupabaseClient, upsert };
}

const signals = [
  { layer: "L6" as const, code: "unit_price_drift", severity: "HIGH" as const, evidence: { sigma: 4 } },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("aggregateFraudScore idempotency", () => {
  it("uses ignoreDuplicates on fraud_score_signals upsert for repeat calls", async () => {
    const { supabase, upsert } = makeSupabase();

    await aggregateFraudScore({
      supabase,
      firmId: "f1",
      firmClientId: "fc1",
      billId: "b1",
      signals,
    });
    await aggregateFraudScore({
      supabase,
      firmId: "f1",
      firmClientId: "fc1",
      billId: "b1",
      signals,
    });

    expect(upsert).toHaveBeenCalledTimes(2);
    for (const call of upsert.mock.calls) {
      expect(call[1]).toEqual({
        onConflict: "bill_id,layer,signal_code",
        ignoreDuplicates: true,
      });
    }
  });

  it("returns the same score shape on repeated aggregation", async () => {
    const { supabase } = makeSupabase();

    const first = await aggregateFraudScore({
      supabase,
      firmId: "f1",
      firmClientId: "fc1",
      billId: "b1",
      signals,
    });
    const second = await aggregateFraudScore({
      supabase,
      firmId: "f1",
      firmClientId: "fc1",
      billId: "b1",
      signals,
    });

    expect(second.score).toBe(first.score);
    expect(second.contributions).toEqual(first.contributions);
    expect(second.quarantine_recommended).toBe(first.quarantine_recommended);
  });
});
