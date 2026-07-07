import { describe, it, expect, vi } from "vitest";
import { detectThresholdSplitting } from "@/lib/ap-intake/anomaly/detectors/threshold-splitting";

function makeSplitChain(rows: Array<{ invoice_amount_cents: number; received_at: string }>) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    lt: () => Promise.resolve({ data: rows, error: null }),
  };
  return chain;
}

describe("detectThresholdSplitting", () => {
  it("returns null when invoice amount missing", async () => {
    const supabase = { from: vi.fn() } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const signal = await detectThresholdSplitting({
      supabase,
      firmClientId: "fc1",
      vendorId: "v1",
      invoiceAmountCents: null,
      approvalThresholdCents: 1_000_000,
    });
    expect(signal).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns null when amount is outside the lower band", async () => {
    const supabase = { from: vi.fn() } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const signal = await detectThresholdSplitting({
      supabase,
      firmClientId: "fc1",
      vendorId: "v1",
      invoiceAmountCents: 800_000,
      approvalThresholdCents: 1_000_000,
    });
    expect(signal).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns null when no prior matches in 14-day window", async () => {
    const supabase = {
      from: () => makeSplitChain([]),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const signal = await detectThresholdSplitting({
      supabase,
      firmClientId: "fc1",
      vendorId: "v1",
      invoiceAmountCents: 950_000,
      approvalThresholdCents: 1_000_000,
    });
    expect(signal).toBeNull();
  });

  it("returns HIGH when amount sits just below threshold with prior matches", async () => {
    const supabase = {
      from: () =>
        makeSplitChain([
          { invoice_amount_cents: 920_000, received_at: "2026-06-20T12:00:00Z" },
        ]),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const signal = await detectThresholdSplitting({
      supabase,
      firmClientId: "fc1",
      vendorId: "v1",
      invoiceAmountCents: 950_000,
      approvalThresholdCents: 1_000_000,
    });

    expect(signal).not.toBeNull();
    expect(signal!.code).toBe("threshold_splitting");
    expect(signal!.severity).toBe("HIGH");
    expect(signal!.evidence.prior_matches_14d).toBe(1);
    expect(signal!.evidence.lower_band_cents).toBe(900_000);
  });
});
