import { describe, it, expect, vi } from "vitest";
import { getVendorBaseline } from "@/lib/ap-intake/anomaly/baseline";

function makeHistoryChain(rows: Array<{ invoice_amount_cents: number; received_at: string }>) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    order: () => chain,
    limit: () => Promise.resolve({ data: rows, error: null }),
  };
  return chain;
}

describe("getVendorBaseline", () => {
  it("returns null when fewer than 5 history rows", async () => {
    const supabase = {
      from: () =>
        makeHistoryChain([
          { invoice_amount_cents: 10000, received_at: "2026-06-01T12:00:00Z" },
          { invoice_amount_cents: 11000, received_at: "2026-06-02T12:00:00Z" },
        ]),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const baseline = await getVendorBaseline({
      supabase,
      firmClientId: "fc1",
      vendorId: "v1",
    });
    expect(baseline).toBeNull();
  });

  it("returns null on query error", async () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      gte: () => chain,
      order: () => chain,
      limit: () => Promise.resolve({ data: null, error: { message: "db down" } }),
    };
    const supabase = { from: () => chain } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const baseline = await getVendorBaseline({
      supabase,
      firmClientId: "fc1",
      vendorId: "v1",
    });
    expect(baseline).toBeNull();
  });

  it("computes amount and arrival statistics from non-quarantined history", async () => {
    const rows = [
      { invoice_amount_cents: 10100, received_at: "2026-06-01T10:00:00Z" },
      { invoice_amount_cents: 12100, received_at: "2026-06-02T10:00:00Z" },
      { invoice_amount_cents: 14100, received_at: "2026-06-03T10:00:00Z" },
      { invoice_amount_cents: 16100, received_at: "2026-06-04T10:00:00Z" },
      { invoice_amount_cents: 18100, received_at: "2026-06-05T10:00:00Z" },
    ];
    const from = vi.fn(() => makeHistoryChain(rows));
    const supabase = { from } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const baseline = await getVendorBaseline({
      supabase,
      firmClientId: "fc1",
      vendorId: "v1",
    });

    expect(from).toHaveBeenCalledWith("bill_history");
    expect(baseline).not.toBeNull();
    expect(baseline!.sample_size).toBe(5);
    expect(baseline!.amount_mean_cents).toBe(14100);
    expect(baseline!.amount_stddev_cents).toBeGreaterThan(0);
    expect(baseline!.avg_arrival_hour_utc).toBe(10);
    expect(baseline!.round_amount_ratio).toBe(0);
  });
});
