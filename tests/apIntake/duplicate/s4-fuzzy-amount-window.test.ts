import { describe, it, expect, vi } from "vitest";
import { runS4FuzzyAmountWindow } from "@/lib/ap-intake/duplicate/strategies/s4-fuzzy-amount-window";

function makeQueryChain(result: { data: unknown[]; error: null }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "lte"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.neq = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("S4 fuzzy amount window", () => {
  it("excludes bills already matched by higher strategies", async () => {
    const chain = makeQueryChain({
      data: [
        { id: "b-high", invoice_amount_cents: 10000, invoice_date: "2026-02-01" },
        { id: "b-fuzzy", invoice_amount_cents: 10200, invoice_date: "2026-02-05" },
      ],
      error: null,
    });
    const supabase = { from: () => chain } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const hits = await runS4FuzzyAmountWindow({
      supabase,
      firmClientId: "fc",
      vendorId: "v",
      billId: "b-new",
      invoiceAmountCents: 10000,
      invoiceDate: "2026-02-01",
      excludeMatchedBillIds: ["b-high"],
    });
    expect(hits).toHaveLength(1);
    expect(hits[0].matched_bill_id).toBe("b-fuzzy");
    expect(hits[0].severity).toBe("MEDIUM");
  });
});
