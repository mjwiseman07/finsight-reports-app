import { describe, expect, it } from "vitest";
import { emitLeaseExpenseBreakdown } from "@/lib/router/lanes/retail/emitters/ifrs/leaseExpenseBreakdown";
import { emitLeaseMaturityIFRS } from "@/lib/router/lanes/retail/emitters/ifrs/leaseMaturityIFRS";
import { emitRouAssetRollforward } from "@/lib/router/lanes/retail/emitters/ifrs/rouAssetRollforward";
import { IFRS_16 } from "@/lib/router/lanes/retail/types";

function makeInput(currency: string | undefined) {
  return {
    framework: IFRS_16,
    extracted: {
      framework: "ifrs" as const,
      leases: {
        ifrs16: {
          expense_breakdown: {
            depreciation_rou_by_class: { retail_stores: 100_000 },
            interest_on_lease_liabilities: 5_000,
            short_term_lease_expense: 1_000,
            low_value_lease_expense: 500,
            variable_lease_payments: 250,
            presentation_currency: currency,
          },
          maturity: {
            bands: {
              within_one_year: 10_000,
              one_to_two_years: 9_000,
              two_to_three_years: 8_000,
              three_to_four_years: 7_000,
              four_to_five_years: 6_000,
              beyond_five_years: 20_000,
            },
            total_undiscounted: 60_000,
            lease_liability_carrying_amount: 55_000,
            weighted_average_ibr_pct: 5.5,
            presentation_currency: currency,
          },
          rou_rollforward: {
            classes: [
              {
                class_name: "retail_stores",
                opening: 500_000,
                additions: 20_000,
                depreciation: 30_000,
                impairment_losses: 0,
                impairment_reversals: 0,
                disposals: 5_000,
                fx_translation: 0,
                other_movements: 0,
                closing: 485_000,
              },
              {
                class_name: "office_space",
                opening: 0,
                additions: 0,
                depreciation: 0,
                impairment_losses: 0,
                impairment_reversals: 0,
                disposals: 0,
                fx_translation: 0,
                other_movements: 0,
                closing: 0,
              },
            ],
            balance_sheet_rou_total: 485_000,
            presentation_currency: currency,
          },
        },
      },
    } as any,
  };
}

describe("retail IFRS emitters — currency-aware formatting (MC-2b.2)", () => {
  it("leaseExpenseBreakdown emits CAD when presentation_currency=CAD", () => {
    const text = emitLeaseExpenseBreakdown(makeInput("CAD")).lines[0].text;
    expect(text).toContain("CAD");
    expect(text).not.toContain("USD");
  });

  it("leaseMaturityIFRS emits EUR when presentation_currency=EUR", () => {
    const text = emitLeaseMaturityIFRS(makeInput("EUR")).lines[0].text;
    expect(text).toContain("EUR");
    expect(text).toMatch(/10,000 EUR/);
  });

  it("rouAssetRollforward emits GBP when presentation_currency=GBP", () => {
    const text = emitRouAssetRollforward(makeInput("GBP")).lines[0].text;
    expect(text).toContain("GBP");
    expect(text).toMatch(/rollforward by class \(GBP\)/);
  });

  it("falls back to USD when presentation_currency is absent", () => {
    const text = emitLeaseExpenseBreakdown(makeInput(undefined)).lines[0].text;
    expect(text).toContain("USD");
  });
});
