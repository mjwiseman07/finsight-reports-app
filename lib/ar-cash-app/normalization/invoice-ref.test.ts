import { describe, test, expect } from "vitest";
import { normalizeInvoiceRef } from "./invoice-ref";

describe("normalizeInvoiceRef", () => {
  test("null/undefined/empty", () => {
    expect(normalizeInvoiceRef(null)).toBeNull();
    expect(normalizeInvoiceRef(undefined)).toBeNull();
    expect(normalizeInvoiceRef("")).toBeNull();
    expect(normalizeInvoiceRef("   ")).toBeNull();
  });

  test("strips INV- prefix and leading zeros", () => {
    expect(normalizeInvoiceRef("INV-0001")).toBe("1");
    expect(normalizeInvoiceRef("INV-000123")).toBe("123");
  });

  test("handles hash prefix", () => {
    expect(normalizeInvoiceRef("#4521")).toBe("4521");
  });

  test("preserves segment structure", () => {
    expect(normalizeInvoiceRef("INV-2026-0042")).toBe("2026-42");
  });

  test("unicode and punctuation stripped", () => {
    expect(normalizeInvoiceRef("INV—4521 (July)")).toBe("4521JULY");
  });

  test("case insensitive", () => {
    expect(normalizeInvoiceRef("inv-4521")).toBe("4521");
  });
});
