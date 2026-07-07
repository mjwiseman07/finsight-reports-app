import { describe, it, expect } from "vitest";
import { detectRoundNumberClustering } from "@/lib/ap-intake/anomaly/detectors/round-number";
import type { VendorBaseline } from "@/lib/ap-intake/anomaly/schema";

const baseline: VendorBaseline = {
  sample_size: 30,
  amount_mean_cents: 12345,
  amount_stddev_cents: 500,
  amount_p25_cents: 10000,
  amount_p75_cents: 15000,
  avg_arrival_hour_utc: 15,
  arrival_hour_stddev: 1.5,
  round_amount_ratio: 0.1,
};

describe("detectRoundNumberClustering", () => {
  it("returns null when invoice amount missing", () => {
    expect(detectRoundNumberClustering({ invoiceAmountCents: null, baseline })).toBeNull();
  });

  it("returns null when amount is not a round hundred-dollar value", () => {
    expect(detectRoundNumberClustering({ invoiceAmountCents: 12345, baseline })).toBeNull();
  });

  it("returns null when vendor history already has high round-number ratio", () => {
    expect(
      detectRoundNumberClustering({
        invoiceAmountCents: 20000,
        baseline: { ...baseline, round_amount_ratio: 0.3 },
      }),
    ).toBeNull();
  });

  it("returns MEDIUM for round amount when baseline rarely uses round numbers", () => {
    const signal = detectRoundNumberClustering({ invoiceAmountCents: 20000, baseline });
    expect(signal).not.toBeNull();
    expect(signal!.code).toBe("round_number_clustering");
    expect(signal!.severity).toBe("MEDIUM");
    expect(signal!.evidence.baseline_round_ratio).toBe(0.1);
  });
});
