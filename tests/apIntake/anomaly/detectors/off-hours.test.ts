import { describe, it, expect } from "vitest";
import { detectOffHoursSubmission } from "@/lib/ap-intake/anomaly/detectors/off-hours";
import type { VendorBaseline } from "@/lib/ap-intake/anomaly/schema";

const baseline: VendorBaseline = {
  sample_size: 25,
  amount_mean_cents: 10000,
  amount_stddev_cents: 1000,
  amount_p25_cents: 9000,
  amount_p75_cents: 11000,
  avg_arrival_hour_utc: 14,
  arrival_hour_stddev: 2,
  round_amount_ratio: 0.05,
};

describe("detectOffHoursSubmission", () => {
  it("returns null when arrival hour stddev is zero", () => {
    expect(
      detectOffHoursSubmission({
        receivedAt: "2026-06-01T22:00:00Z",
        baseline: { ...baseline, arrival_hour_stddev: 0 },
      }),
    ).toBeNull();
  });

  it("returns null when submission hour is within 3 sigma of baseline", () => {
    expect(
      detectOffHoursSubmission({
        receivedAt: "2026-06-01T15:00:00Z",
        baseline,
      }),
    ).toBeNull();
  });

  it("returns MEDIUM when submission hour exceeds 3 sigma from baseline mean", () => {
    const signal = detectOffHoursSubmission({
      receivedAt: "2026-06-01T22:00:00Z",
      baseline,
    });
    expect(signal).not.toBeNull();
    expect(signal!.code).toBe("off_hours_submission");
    expect(signal!.severity).toBe("MEDIUM");
    expect(signal!.evidence.received_hour_utc).toBe(22);
    expect(signal!.evidence.sigma).toBeGreaterThan(3);
  });

  it("handles wraparound across midnight", () => {
    const signal = detectOffHoursSubmission({
      receivedAt: "2026-06-01T02:00:00Z",
      baseline: { ...baseline, avg_arrival_hour_utc: 22, arrival_hour_stddev: 0.5 },
    });
    expect(signal).not.toBeNull();
    expect(signal!.evidence.sigma).toBeGreaterThan(3);
  });
});
