import { describe, it, expect, vi } from "vitest";
import { runS2AmountVendorDate } from "@/lib/ap-intake/duplicate/strategies/s2-amount-vendor-date";

function makeQueryChain(result: { data: unknown[]; error: null }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "neq", "gte", "lte", "not"];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.neq = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("S2 amount vendor date", () => {
  it("returns empty when amount or date missing", async () => {
    const supabase = {} as import("@supabase/supabase-js").SupabaseClient;
    expect(
      await runS2AmountVendorDate({
        supabase,
        firmClientId: "fc",
        vendorId: "v",
        billId: "b",
        invoiceAmountCents: null,
        invoiceDate: "2026-01-01",
      }),
    ).toEqual([]);
  });

  it("queries ±3 day window", async () => {
    const chain = makeQueryChain({
      data: [{ id: "b2", invoice_date: "2026-01-02", invoice_amount_cents: 5000 }],
      error: null,
    });
    const supabase = { from: () => chain } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const hits = await runS2AmountVendorDate({
      supabase,
      firmClientId: "fc",
      vendorId: "v",
      billId: "b1",
      invoiceAmountCents: 5000,
      invoiceDate: "2026-01-01",
    });
    expect(chain.gte).toHaveBeenCalledWith("invoice_date", "2025-12-29");
    expect(chain.lte).toHaveBeenCalledWith("invoice_date", "2026-01-04");
    expect(hits[0].strategy_id).toBe("S2_amount_vendor_date");
  });
});
