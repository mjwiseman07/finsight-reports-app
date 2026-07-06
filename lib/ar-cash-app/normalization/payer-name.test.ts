import { describe, test, expect } from "vitest";
import { normalizePayerName, payerTokenOverlap, extractEmailDomain } from "./payer-name";

describe("normalizePayerName", () => {
  test("strips LLC and INC", () => {
    expect(normalizePayerName("Acme Corp, LLC")).toBe("ACME");
    expect(normalizePayerName("Acme Corporation")).toBe("ACME");
    expect(normalizePayerName("Acme Inc.")).toBe("ACME");
  });

  test("handles null and empty", () => {
    expect(normalizePayerName(null)).toBeNull();
    expect(normalizePayerName("")).toBeNull();
  });

  test("collapses whitespace", () => {
    expect(normalizePayerName("  Acme    Corp  ")).toBe("ACME");
  });

  test("preserves multi-word names", () => {
    expect(normalizePayerName("Fisher Scientific Company")).toBe("FISHER SCIENTIFIC");
  });
});

describe("payerTokenOverlap", () => {
  test("identical returns 1.0", () => {
    expect(payerTokenOverlap("ACME CORP", "ACME CORP")).toBe(1);
  });

  test("subset returns partial", () => {
    expect(payerTokenOverlap("ACME", "ACME CORP")).toBe(0.5);
  });

  test("disjoint returns 0", () => {
    expect(payerTokenOverlap("ACME", "FISHER")).toBe(0);
  });

  test("null returns 0", () => {
    expect(payerTokenOverlap(null, "ACME")).toBe(0);
  });
});

describe("extractEmailDomain", () => {
  test("valid email", () => {
    expect(extractEmailDomain("ap@acmecorp.com")).toBe("acmecorp.com");
    expect(extractEmailDomain("AP@AcmeCorp.COM")).toBe("acmecorp.com");
  });

  test("invalid returns null", () => {
    expect(extractEmailDomain(null)).toBeNull();
    expect(extractEmailDomain("not-an-email")).toBeNull();
    expect(extractEmailDomain("@nodomain")).toBeNull();
  });
});
