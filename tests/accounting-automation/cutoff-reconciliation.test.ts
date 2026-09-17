import { describe, expect, it } from "vitest";
import type { AdvisacorNormalizedFinancialData } from "@/lib/integrations/accounting/types";
import { reconcileExpenseCutoff, reconcileRevenueCutoff } from "@/lib/accounting-automation/cutoff-reconciliation";

function row(id: string, name: string, amount: number, metadata: Record<string, unknown> = {}) {
  return { id, name, amount, metadata, source: { provider: "quickbooks", providerFamily: "quickbooks", providerProduct: "quickbooks", sourceReport: "Transaction Detail" } };
}

function payload(input: { transactions?: ReturnType<typeof row>[]; ar?: ReturnType<typeof row>[]; ap?: ReturnType<typeof row>[] }) {
  return {
    normalizedTransactions: input.transactions || [],
    normalizedARAging: input.ar || [],
    normalizedAPAging: input.ap || [],
  } as unknown as AdvisacorNormalizedFinancialData;
}

describe("revenue cutoff", () => {
  it("matches shipped orders to invoices using provider linking keys", () => {
    const result = reconcileRevenueCutoff(payload({
      transactions: [row("s1", "Shipment fulfilled", 500, { orderId: "SO-1" })],
      ar: [row("i1", "Invoice open", 500, { orderId: "SO-1" })],
    }));
    expect(result).toMatchObject({ status: "clear", source_count: 1, exception_count: 0 });
  });

  it("flags shipped activity without a reliable invoice match", () => {
    const result = reconcileRevenueCutoff(payload({ transactions: [row("s1", "Shipment fulfilled", 500)] }));
    expect(result).toMatchObject({ status: "review_required", exception_count: 1, exception_amount_cents: 50000 });
    expect(result.evidence_codes).toContain("shipment_invoice_link_key_missing");
  });

  it("reports unavailable rather than inventing shipment evidence", () => {
    expect(reconcileRevenueCutoff(payload({ transactions: [row("x", "Bank deposit", 500)] })).status).toBe("unavailable");
  });
});

describe("expense cutoff", () => {
  it("accepts bills with explicit posting and payment state", () => {
    const result = reconcileExpenseCutoff(payload({ ap: [row("b1", "Vendor bill posted unpaid", 90, { postedAt: "2026-09-15" })] }));
    expect(result).toMatchObject({ status: "clear", source_count: 1, exception_count: 0 });
  });

  it("flags bills missing posting or payment-state evidence", () => {
    const result = reconcileExpenseCutoff(payload({ ap: [row("b1", "Vendor bill", 90)] }));
    expect(result).toMatchObject({ status: "review_required", exception_count: 1, exception_amount_cents: 9000 });
  });

  it("reports unavailable when bill detail is absent", () => {
    expect(reconcileExpenseCutoff(payload({ ap: [] })).status).toBe("unavailable");
  });
});
