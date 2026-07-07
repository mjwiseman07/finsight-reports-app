import { describe, it, expect } from "vitest";
import { extractRemittance, last4 } from "@/lib/ap-intake/l3/remittance-extractor";

describe("extractRemittance", () => {
  it("extracts a 9-digit ABA routing number", () => {
    const text = "Please remit via ACH — Routing: 021000021 Account: 1234567890";
    const r = extractRemittance(text);
    expect(r.routing_number).toBe("021000021");
    expect(r.account_number).toBe("1234567890");
    expect(r.raw_snippet).toBeTruthy();
  });

  it("supports 'ABA' and 'RTN' anchors", () => {
    expect(extractRemittance("ABA 026009593 Acct 55554321").routing_number).toBe("026009593");
    expect(extractRemittance("RTN: 121000358 A/C: 9876").routing_number).toBe("121000358");
  });

  it("returns nulls when no anchors match", () => {
    const r = extractRemittance("Thanks for your business!");
    expect(r.routing_number).toBeNull();
    expect(r.account_number).toBeNull();
    expect(r.raw_snippet).toBeNull();
  });

  it("handles empty and non-string input", () => {
    // @ts-expect-error intentional bad input
    expect(extractRemittance(null).routing_number).toBeNull();
    expect(extractRemittance("").routing_number).toBeNull();
  });

  it("last4 helper returns the last 4 digits", () => {
    expect(last4("1234567890")).toBe("7890");
    expect(last4("42")).toBe("42");
  });
});
