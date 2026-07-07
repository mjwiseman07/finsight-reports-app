import { describe, it, expect, vi, beforeEach } from "vitest";

const { getVendorBaseline, detectUnitPriceDrift, detectRoundNumberClustering, detectOffHoursSubmission, detectThresholdSplitting } =
  vi.hoisted(() => ({
    getVendorBaseline: vi.fn(),
    detectUnitPriceDrift: vi.fn(),
    detectRoundNumberClustering: vi.fn(),
    detectOffHoursSubmission: vi.fn(),
    detectThresholdSplitting: vi.fn(),
  }));

vi.mock("@/lib/ap-intake/anomaly/baseline", () => ({ getVendorBaseline }));
vi.mock("@/lib/ap-intake/anomaly/detectors/unit-price-drift", () => ({ detectUnitPriceDrift }));
vi.mock("@/lib/ap-intake/anomaly/detectors/round-number", () => ({
  detectRoundNumberClustering,
}));
vi.mock("@/lib/ap-intake/anomaly/detectors/off-hours", () => ({ detectOffHoursSubmission }));
vi.mock("@/lib/ap-intake/anomaly/detectors/threshold-splitting", () => ({
  detectThresholdSplitting,
}));

import { detectAnomalies } from "@/lib/ap-intake/anomaly/detector";

const supabase = {} as import("@supabase/supabase-js").SupabaseClient;
const baseArgs = {
  supabase,
  firmId: "f1",
  firmClientId: "fc1",
  vendorId: "v1",
  billId: "b-new",
  invoiceAmountCents: 950_000,
  receivedAt: "2026-06-01T12:00:00Z",
  approvalThresholdCents: 1_000_000,
};

const baseline = {
  sample_size: 20,
  amount_mean_cents: 10000,
  amount_stddev_cents: 1000,
  amount_p25_cents: 9000,
  amount_p75_cents: 11000,
  avg_arrival_hour_utc: 14,
  arrival_hour_stddev: 2,
  round_amount_ratio: 0.1,
};

beforeEach(() => {
  vi.clearAllMocks();
  getVendorBaseline.mockResolvedValue(baseline);
  detectUnitPriceDrift.mockReturnValue(null);
  detectRoundNumberClustering.mockReturnValue(null);
  detectOffHoursSubmission.mockReturnValue(null);
  detectThresholdSplitting.mockResolvedValue(null);
});

describe("detectAnomalies orchestrator", () => {
  it("runs baseline detectors when vendor baseline exists", async () => {
    detectThresholdSplitting.mockResolvedValue({
      code: "threshold_splitting",
      severity: "HIGH",
      evidence: { prior_matches_14d: 2 },
    });

    const result = await detectAnomalies(baseArgs);

    expect(getVendorBaseline).toHaveBeenCalledWith({
      supabase,
      firmClientId: "fc1",
      vendorId: "v1",
    });
    expect(detectUnitPriceDrift).toHaveBeenCalled();
    expect(detectRoundNumberClustering).toHaveBeenCalled();
    expect(detectOffHoursSubmission).toHaveBeenCalled();
    expect(detectThresholdSplitting).toHaveBeenCalled();
    expect(result.signals).toHaveLength(1);
    expect(result.hasHighSeverity).toBe(true);
  });

  it("still runs threshold splitting when baseline is unavailable", async () => {
    getVendorBaseline.mockResolvedValue(null);
    detectThresholdSplitting.mockResolvedValue({
      code: "threshold_splitting",
      severity: "HIGH",
      evidence: {},
    });

    const result = await detectAnomalies(baseArgs);

    expect(detectUnitPriceDrift).not.toHaveBeenCalled();
    expect(detectRoundNumberClustering).not.toHaveBeenCalled();
    expect(detectOffHoursSubmission).not.toHaveBeenCalled();
    expect(detectThresholdSplitting).toHaveBeenCalled();
    expect(result.signals).toHaveLength(1);
  });

  it("aggregates multiple L6 signals and sets hasHighSeverity", async () => {
    detectUnitPriceDrift.mockReturnValue({
      code: "unit_price_drift",
      severity: "MEDIUM",
      evidence: {},
    });
    detectOffHoursSubmission.mockReturnValue({
      code: "off_hours_submission",
      severity: "MEDIUM",
      evidence: {},
    });

    const result = await detectAnomalies(baseArgs);

    expect(result.signals).toHaveLength(2);
    expect(result.hasHighSeverity).toBe(false);
  });
});
