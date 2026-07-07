import { describe, it, expect } from "vitest";
import { detectUnitPriceDrift } from "@/lib/ap-intake/anomaly/detectors/unit-price-drift";
import type { VendorBaseline } from "@/lib/ap-intake/anomaly/schema";

const baseline: VendorBaseline = {
  sample_size: 20,
  amount_mean_cents: 10000,
  amount_stddev_cents: 1000,
  amount_p25_cents: 9000,
  amount_p75_cents: 11000,
  avg_arrival_hour_utc: 14,
  arrival_hour_stddev: 2,
  round_amount_ratio: 0.1,
};

describe("detectUnitPriceDrift", () => {
  it("returns null when invoice amount missing", () => {
    expect(detectUnitPriceDrift({ invoiceAmountCents: null, baseline })).toBeNull();
  });

  it("returns null when baseline stddev is zero", () => {
    expect(
      detectUnitPriceDrift({
        invoiceAmountCents: 15000,
        baseline: { ...baseline, amount_stddev_cents: 0 },
      }),
    ).toBeNull();
  });

  it("returns null when drift is within thresholds", () => {
    expect(detectUnitPriceDrift({ invoiceAmountCents: 10500, baseline })).toBeNull();
  });

  it("returns MEDIUM when pct delta and sigma exceed medium thresholds", () => {
    const signal = detectUnitPriceDrift({ invoiceAmountCents: 13000, baseline });
    expect(signal).not.toBeNull();
    expect(signal!.code).toBe("unit_price_drift");
    expect(signal!.severity).toBe("MEDIUM");
    expect(signal!.evidence.sigma).toBeGreaterThan(2);
  });

  it("returns HIGH when pct delta and sigma exceed high thresholds", () => {
    const signal = detectUnitPriceDrift({ invoiceAmountCents: 20000, baseline });
    expect(signal).not.toBeNull();
    expect(signal!.severity).toBe("HIGH");
    expect(signal!.evidence.pct_delta_from_mean).toBeGreaterThan(0.4);
    expect(signal!.evidence.sigma).toBeGreaterThan(3);
  });
});
