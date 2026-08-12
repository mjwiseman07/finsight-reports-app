import { describe, expect, it } from "vitest";
import { selectXeroReportPeriodAmount } from "@/lib/integrations/xero/provider";

describe("selectXeroReportPeriodAmount", () => {
  it("1: current -4520.08 / prior 4540.98 -> current -4520.08", () => {
    const cells = [
      {
        Value: "Checking Account",
        Attributes: [{ Id: "account", Value: "ceef66a5-a545-413b-9312-78a53caadbc4" }],
      },
      {
        Value: "-4520.08",
        Attributes: [{ Id: "account", Value: "ceef66a5-a545-413b-9312-78a53caadbc4" }],
      },
      {
        Value: "4540.98",
        Attributes: [{ Id: "account", Value: "ceef66a5-a545-413b-9312-78a53caadbc4" }],
      },
    ];
    expect(selectXeroReportPeriodAmount(cells)).toBe(-4520.08);
    expect(selectXeroReportPeriodAmount(cells)).not.toBe(4540.98);
  });

  it("2: current 0 / prior 15487.10 -> 0", () => {
    const cells = [{ Value: "Checking Account" }, { Value: "0.00" }, { Value: "15487.10" }];
    expect(selectXeroReportPeriodAmount(cells)).toBe(0);
  });

  it("3: current positive / prior positive -> current", () => {
    const cells = [{ Value: "Savings" }, { Value: "1200.50" }, { Value: "800.00" }];
    expect(selectXeroReportPeriodAmount(cells)).toBe(1200.5);
  });

  it("4: current negative / prior positive -> current negative", () => {
    const cells = [{ Value: "Checking" }, { Value: "-250.5" }, { Value: "1000.00" }];
    expect(selectXeroReportPeriodAmount(cells)).toBe(-250.5);
  });

  it("5: single-column report unchanged", () => {
    const cells = [{ Value: "Checking Account" }, { Value: "9082.00" }];
    expect(selectXeroReportPeriodAmount(cells)).toBe(9082);
  });

  it("6: P&L single-column behavior unchanged", () => {
    const cells = [{ Value: "Total Income" }, { Value: "9527.98" }];
    expect(selectXeroReportPeriodAmount(cells)).toBe(9527.98);
  });

  it("7: July Xero Current Year Earnings metadata proves column order", () => {
    const cells = [
      { Value: "Current Year Earnings" },
      {
        Value: "-12181.80",
        Attributes: [
          { Id: "fromDate", Value: "1/1/2026" },
          { Id: "toDate", Value: "7/31/2026" },
        ],
      },
      {
        Value: "367.67",
        Attributes: [
          { Id: "fromDate", Value: "1/1/2025" },
          { Id: "toDate", Value: "7/31/2025" },
        ],
      },
    ];
    expect(selectXeroReportPeriodAmount(cells)).toBe(-12181.8);
    expect(selectXeroReportPeriodAmount(cells)).not.toBe(367.67);
  });
});
