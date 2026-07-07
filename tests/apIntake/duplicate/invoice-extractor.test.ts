import { describe, it, expect } from "vitest";
import {
  extractInvoiceNumber,
  extractInvoiceDate,
  extractInvoiceAmountCents,
  extractInvoiceFields,
} from "@/lib/ap-intake/duplicate/invoice-extractor";

describe("invoice-extractor", () => {
  const sample = `
    Invoice # INV-4421
    Date: 2026-03-15
  Amount Due: $1,250.00
  `;

  it("extracts invoice number", () => {
    expect(extractInvoiceNumber(sample)).toBe("INV-4421");
  });

  it("extracts ISO date", () => {
    expect(extractInvoiceDate(sample)).toBe("2026-03-15");
  });

  it("extracts preferred amount in cents", () => {
    expect(extractInvoiceAmountCents(sample)).toBe(125000);
  });

  it("parses US date format", () => {
    expect(extractInvoiceDate("Bill dated 3/5/26")).toBe("2026-03-05");
  });

  it("extractInvoiceFields returns all dimensions independently", () => {
    const fields = extractInvoiceFields(sample);
    expect(fields.invoice_number).toBe("INV-4421");
    expect(fields.invoice_date).toBe("2026-03-15");
    expect(fields.invoice_amount_cents).toBe(125000);
  });
});
