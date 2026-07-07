import { describe, it, expect, vi } from "vitest";
import {
  normalizeInvoiceNumber,
  runS3InvoiceNumberVendor,
} from "@/lib/ap-intake/duplicate/strategies/s3-invoice-number-vendor";

describe("S3 invoice number vendor", () => {
  it("normalizeInvoiceNumber strips whitespace and uppercases", () => {
    expect(normalizeInvoiceNumber(" inv 99 ")).toBe("INV99");
  });

  it("filters case-insensitive matches within query results", async () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      not: () => chain,
      neq: () => chain,
      gte: () =>
        Promise.resolve({
          data: [
            { id: "b1", invoice_number: "inv-100", created_at: "2026-01-01" },
            { id: "b2", invoice_number: "OTHER", created_at: "2026-01-02" },
          ],
          error: null,
        }),
    };
    const supabase = { from: () => chain } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const hits = await runS3InvoiceNumberVendor({
      supabase,
      firmClientId: "fc",
      vendorId: "v",
      billId: "b-new",
      invoiceNumber: "INV-100",
    });
    expect(hits).toHaveLength(1);
    expect(hits[0].matched_bill_id).toBe("b1");
    expect(hits[0].strategy_id).toBe("S3_invoice_number_vendor");
  });
});
