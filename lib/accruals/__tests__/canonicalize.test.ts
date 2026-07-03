import { describe, it, expect } from "vitest";
import {
  canonicalizeVendorName,
  canonicalizeInvoiceNumber,
  accrualLineKey,
} from "@/lib/accruals/canonicalize";

describe("canonicalizeVendorName", () => {
  it.each([
    ["acme corp", "ACME"],
    ["Acme Corp.", "ACME"],
    ["ACME, INC.", "ACME"],
    ["Acme LLC", "ACME"],
    [" Acme Widgets ", "ACME WIDGETS"],
    ["ABC-Widgets", "ABC-WIDGETS"],
    ["Smith & Jones Attorneys PLLC", "SMITH & JONES ATTORNEYS"],
    ["", ""],
    ["XYZ", "XYZ"],
  ])("canonicalizes %j -> %j", (input, expected) => {
    expect(canonicalizeVendorName(input)).toBe(expected);
  });
});

describe("canonicalizeInvoiceNumber", () => {
  it.each([
    ["INV-4471", "4471"],
    ["INV4471", "4471"],
    ["inv 4471", "4471"],
    ["#4471", "4471"],
    ["INV-2024/4471", "20244471"],
    [" 4471 ", "4471"],
    ["invoice 004471", "004471"],
    ["", ""],
    ["NO. 12345", "12345"],
  ])("canonicalizes %j -> %j", (input, expected) => {
    expect(canonicalizeInvoiceNumber(input)).toBe(expected);
  });
});

describe("accrualLineKey", () => {
  it("is deterministic across repeated calls", () => {
    const a = accrualLineKey("Acme Corp.", "INV-4471");
    const b = accrualLineKey("Acme Corp.", "INV-4471");
    expect(a).toBe(b);
    expect(a).toBe("ACME||4471");
  });

  it("differs when vendor differs (same invoice #)", () => {
    expect(accrualLineKey("Acme", "4471")).not.toBe(accrualLineKey("Beta", "4471"));
  });

  it("differs when invoice # differs (same vendor)", () => {
    expect(accrualLineKey("Acme", "4471")).not.toBe(accrualLineKey("Acme", "4472"));
  });
});
