/**
 * MC-4c (Gap C-3): computeInterlock currency-awareness.
 */
import { describe, expect, it } from "vitest";
import { computeInterlock } from "@/lib/ap-intake/payments/interlock";

const V1 = "00000000-0000-0000-0000-0000000004c1";

function line(overrides: Partial<Parameters<typeof computeInterlock>[0]["lines"][number]> = {}) {
  return {
    vendor_id: V1,
    currency: "USD",
    gross_amount_cents: 1000,
    applied_credit_cents: 0,
    applied_prepayment_cents: 0,
    net_amount_cents: 1000,
    gl_account_code: null,
    period_year: 2026,
    period_month: 7,
    ...overrides,
  };
}

describe("MC-4c :: computeInterlock currency policy", () => {
  it("passes when home==batch==line currency and no over-commitment", () => {
    const d = computeInterlock({
      lines: [line()],
      vendor_commitments: [
        { vendor_id: V1, requisition_remaining_cents: 10000, annual_commitment_remaining_cents: null },
      ],
      gl_budgets: [],
      home_currency: "USD",
      batch_currency: "USD",
    });
    expect(d.passed).toBe(true);
    expect(d.reason_codes).toEqual([]);
  });

  it("fails with home_currency_unset when home_currency is empty", () => {
    const d = computeInterlock({
      lines: [line()],
      vendor_commitments: [],
      gl_budgets: [],
      home_currency: "",
      batch_currency: "USD",
    });
    expect(d.passed).toBe(false);
    expect(d.reason_codes).toContain("home_currency_unset");
  });

  it("fails with foreign_currency_batch_requires_fx when batch != home", () => {
    const d = computeInterlock({
      lines: [line({ currency: "EUR" })],
      vendor_commitments: [],
      gl_budgets: [],
      home_currency: "USD",
      batch_currency: "EUR",
    });
    expect(d.passed).toBe(false);
    expect(d.reason_codes).toContain("foreign_currency_batch_requires_fx:EUR");
  });

  it("fails with foreign_currency_line_requires_fx when a line != home", () => {
    const d = computeInterlock({
      lines: [line({ currency: "EUR" })],
      vendor_commitments: [],
      gl_budgets: [],
      home_currency: "USD",
      batch_currency: "USD",
    });
    expect(d.passed).toBe(false);
    expect(d.reason_codes).toContain("foreign_currency_line_requires_fx:EUR");
    expect(d.reason_codes).toContain("batch_line_currency_mismatch:EUR");
  });

  it("deduplicates reason codes per offending currency", () => {
    const d = computeInterlock({
      lines: [line({ currency: "EUR" }), line({ currency: "EUR" }), line({ currency: "GBP" })],
      vendor_commitments: [],
      gl_budgets: [],
      home_currency: "USD",
      batch_currency: "USD",
    });
    expect(d.passed).toBe(false);
    const eurCount = d.reason_codes.filter((r) => r === "foreign_currency_line_requires_fx:EUR").length;
    const gbpCount = d.reason_codes.filter((r) => r === "foreign_currency_line_requires_fx:GBP").length;
    expect(eurCount).toBe(1);
    expect(gbpCount).toBe(1);
  });

  it("fails with line_currency_unset when a line has empty currency", () => {
    const d = computeInterlock({
      lines: [line({ currency: "" })],
      vendor_commitments: [],
      gl_budgets: [],
      home_currency: "USD",
      batch_currency: "USD",
    });
    expect(d.passed).toBe(false);
    expect(d.reason_codes).toContain("line_currency_unset");
  });
});
