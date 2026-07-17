import { describe, expect, it } from "vitest";
import { emitPayorMixIFRS } from "@/lib/router/lanes/healthcare/emitters/ifrs/payorMixIFRS";
import { emitReceivablesECL } from "@/lib/router/lanes/healthcare/emitters/ifrs/receivablesECL";
import { IFRS_15, IFRS_9 } from "@/lib/router/lanes/healthcare/types";

describe("healthcare IFRS emitters — currency-aware formatting (MC-2b.2)", () => {
  it("payorMixIFRS emits CAD when presentation_currency=CAD", () => {
    const result = emitPayorMixIFRS({
      framework: IFRS_15,
      extracted: {
        framework: "ifrs" as const,
        healthcare_revenue: {
          ifrs: {
            payor_mix: {
              payors: [
                { class: "provincial_health", revenue: 800_000 },
                { class: "private_insurance", revenue: 200_000 },
              ],
              total_revenue: 1_000_000,
              presentation_currency: "CAD",
            },
          },
        },
      } as any,
    });

    const text = result.lines[0].text;
    expect(text).toContain("CAD");
    expect(text).toMatch(/1,000,000 CAD/);
    expect(text).not.toContain("USD");
  });

  it("receivablesECL emits EUR when presentation_currency=EUR", () => {
    const result = emitReceivablesECL({
      framework: IFRS_9,
      extracted: {
        framework: "ifrs" as const,
        healthcare_revenue: {
          ifrs: {
            receivables_ecl: {
              stages: {
                stage_1: { opening: 1_000, closing: 1_100, ecl_12_month: 100 },
                stage_2: { opening: 500, closing: 600, ecl_lifetime: 200 },
                stage_3: { opening: 200, closing: 250, ecl_lifetime: 250 },
              },
              forward_looking_inputs: ["GDP forecast +2%"],
              total_closing_allowance: 1_950,
              presentation_currency: "EUR",
            },
          },
        },
      } as any,
    });

    const text = result.lines[0].text;
    expect(text).toContain("EUR");
    expect(text).toMatch(/1,950 EUR/);
  });

  it("payorMixIFRS falls back to USD when presentation_currency missing", () => {
    const result = emitPayorMixIFRS({
      framework: IFRS_15,
      extracted: {
        framework: "ifrs" as const,
        healthcare_revenue: {
          ifrs: {
            payor_mix: {
              payors: [{ class: "national_health", revenue: 100_000 }],
              total_revenue: 100_000,
            },
          },
        },
      } as any,
    });

    expect(result.lines[0].text).toContain("USD");
  });
});
