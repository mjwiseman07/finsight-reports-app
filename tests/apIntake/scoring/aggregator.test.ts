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
  return { supabase: { from } as unknown as import("@supabase/supabase-js").SupabaseClient, upsert, update, updateEq };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("aggregateFraudScore", () => {
  it("sums layer contributions and caps score at 1.0", async () => {
    const { supabase, upsert, updateEq } = makeSupabase();

    const result = await aggregateFraudScore({
      supabase,
      firmId: "f1",
      firmClientId: "fc1",
      billId: "b1",
      signals: [
        { layer: "L3", code: "bank_change", severity: "HIGH", evidence: {} },
        { layer: "L5", code: "duplicate_detected", severity: "HIGH", evidence: {} },
        { layer: "L6", code: "unit_price_drift", severity: "HIGH", evidence: {} },
      ],
    });

    expect(result.score).toBe(1);
    expect(result.contributions).toHaveLength(3);
    expect(result.contributions[0].contribution).toBe(0.6);
    expect(result.contributions[1].contribution).toBe(0.5);
    expect(result.contributions[2].contribution).toBe(0.35);
    expect(result.quarantine_recommended).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ layer: "L6", signal_code: "unit_price_drift", contribution: 0.35 }),
      ]),
      { onConflict: "bill_id,layer,signal_code", ignoreDuplicates: true },
    );
    expect(updateEq).toHaveBeenCalledWith("id", "b1");
    expect(publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "bill.fraud_score_updated" }),
      supabase,
    );
    expect(publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "bill.fraud_score_quarantine" }),
      supabase,
    );
  });

  it("skips quarantine event when score is below threshold", async () => {
    const { supabase } = makeSupabase();

    const result = await aggregateFraudScore({
      supabase,
      firmId: "f1",
      firmClientId: "fc1",
      billId: "b1",
      signals: [{ layer: "L6", code: "off_hours_submission", severity: "MEDIUM", evidence: {} }],
    });

    expect(result.score).toBe(0.15);
    expect(result.quarantine_recommended).toBe(false);
    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "bill.fraud_score_updated" }),
      supabase,
    );
  });

  it("does not upsert when no signals are provided", async () => {
    const { supabase, upsert, updateEq } = makeSupabase();

    const result = await aggregateFraudScore({
      supabase,
      firmId: "f1",
      firmClientId: "fc1",
      billId: "b1",
      signals: [],
    });

    expect(result.score).toBe(0);
    expect(upsert).not.toHaveBeenCalled();
    expect(updateEq).toHaveBeenCalledWith("id", "b1");
  });
});
