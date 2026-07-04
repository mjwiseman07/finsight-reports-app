import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeMockClient, type MockClientHandle } from "../events/_mock-supabase-events";

const state = vi.hoisted(() => ({ handle: null as unknown as MockClientHandle }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => state.handle.client,
}));

import { recordMetric, SLO_TARGETS, type RecordMetricInput } from "@/lib/metrics/platform-metrics";

function base(overrides: Partial<RecordMetricInput> = {}): RecordMetricInput {
  return {
    firmClientId: "fc-1",
    metricName: "je_post_latency_ms",
    metricValue: 850,
    metricUnit: "ms",
    ...overrides,
  };
}

beforeEach(() => {
  state.handle = makeMockClient();
});

describe("recordMetric", () => {
  it("inserts a mapped row", async () => {
    state.handle.queue("platform_metrics", { data: null, error: null });
    await recordMetric(base({ dimensions: { rule_id: "r1" }, sloTarget: 1000, sloMet: true }));
    const row = state.handle.firstArg("platform_metrics", "insert") as Record<string, unknown>;
    expect(row).toMatchObject({
      firm_client_id: "fc-1",
      metric_name: "je_post_latency_ms",
      metric_value: 850,
      metric_unit: "ms",
      dimensions: { rule_id: "r1" },
      slo_target: 1000,
      slo_met: true,
    });
  });

  it("defaults dimensions to {} and slo fields to null", async () => {
    state.handle.queue("platform_metrics", { data: null, error: null });
    await recordMetric(base());
    const row = state.handle.firstArg("platform_metrics", "insert") as Record<string, unknown>;
    expect(row.dimensions).toEqual({});
    expect(row.slo_target).toBeNull();
    expect(row.slo_met).toBeNull();
  });

  it("nulls firm_client_id when omitted", async () => {
    state.handle.queue("platform_metrics", { data: null, error: null });
    await recordMetric(base({ firmClientId: undefined }));
    const row = state.handle.firstArg("platform_metrics", "insert") as Record<string, unknown>;
    expect(row.firm_client_id).toBeNull();
  });

  it("swallows a DB error (never throws) and warns", async () => {
    state.handle.queue("platform_metrics", { data: null, error: { message: "nope" } });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(recordMetric(base())).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith("[platform_metrics] insert failed:", "nope");
    warn.mockRestore();
  });

  it.each(["ms", "seconds", "hours", "count", "percentage", "usd"] as const)(
    "accepts unit '%s'",
    async (unit) => {
      state.handle.queue("platform_metrics", { data: null, error: null });
      await recordMetric(base({ metricUnit: unit }));
      const row = state.handle.firstArg("platform_metrics", "insert") as Record<string, unknown>;
      expect(row.metric_unit).toBe(unit);
    },
  );
});

describe("SLO_TARGETS", () => {
  it.each([
    ["categorization_latency_ms", 300000],
    ["je_post_latency_ms", 1000],
    ["intake_to_bill_latency_ms", 60000],
    ["full_close_duration_hours", 48],
    ["cash_app_straight_through_pct", 90],
    ["ocr_extraction_accuracy_pct", 99],
    ["assertion_coverage_pct", 95],
  ] as const)("defines %s = %d", (key, value) => {
    expect(SLO_TARGETS[key as keyof typeof SLO_TARGETS]).toBe(value);
  });
});
