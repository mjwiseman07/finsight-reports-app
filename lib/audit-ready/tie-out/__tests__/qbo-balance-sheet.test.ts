import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseQboBalanceSheetReport } from "../qbo-reports";

const FIXTURE_PATH = resolve(
  __dirname,
  "__fixtures__/qbo-bs-2026-12-31.json",
);

function loadFixture() {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
}

describe("parseQboBalanceSheetReport", () => {
  it("parses the 2026-12-31 pilot fixture into the expected structure", () => {
    const json = loadFixture();
    const result = parseQboBalanceSheetReport(json);

    expect(result.asOfDate).toBe("2026-12-31");
    expect(result.accountingMethod).toBe("Accrual");

    const byClass = {
      Asset: result.lines.filter((l) => l.classification === "Asset"),
      Liability: result.lines.filter((l) => l.classification === "Liability"),
      Equity: result.lines.filter((l) => l.classification === "Equity"),
    };
    expect(byClass.Asset.length).toBeGreaterThan(0);
    expect(byClass.Liability.length).toBeGreaterThan(0);
    expect(byClass.Equity.length).toBeGreaterThan(0);

    // Post June 30 2026 modernization: Truck is a Section Header (id=37),
    // not a Data row. The leaf Data row is Original Cost (38) at 13495.00.
    // Depreciation (39) is absent from this report. (Paste 7.1 assumed a
    // rolled-up Truck Data line — that grammar is not what the modernized
    // sandbox returns for this pilot.)
    const truck = result.lines.find((l) => l.qboAccountId === "37");
    const origCost = result.lines.find((l) => l.qboAccountId === "38");
    const depr = result.lines.find((l) => l.qboAccountId === "39");
    expect(truck).toBeUndefined();
    expect(origCost).toBeDefined();
    expect(origCost!.balanceCents).toBe(1349500);
    expect(depr).toBeUndefined();

    // Computed Net Income line present under Equity.
    const netIncome = result.lines.find(
      (l) => l.isComputedLine && l.qboAccountName === "Net Income",
    );
    expect(netIncome).toBeDefined();
    expect(netIncome!.classification).toBe("Equity");
    expect(netIncome!.qboAccountId).toBeNull();
    expect(netIncome!.balanceCents).toBe(87898);

    // Equation ties: A = L + E (Net Income closes Equity).
    const totalAssets = byClass.Asset.reduce((s, l) => s + l.balanceCents, 0);
    const totalLiab = byClass.Liability.reduce((s, l) => s + l.balanceCents, 0);
    const totalEquity = byClass.Equity.reduce((s, l) => s + l.balanceCents, 0);
    expect(totalAssets).toBe(2627131);
    expect(totalAssets).toBe(totalLiab + totalEquity);

    // sortOrder is dense, starting from 0.
    const sortOrders = result.lines.map((l) => l.sortOrder);
    expect(sortOrders).toEqual([...sortOrders].sort((a, b) => a - b));
    expect(sortOrders[0]).toBe(0);
  });

  it("handles a synthetic Cash-basis header", () => {
    const cashJson = {
      Header: {
        EndPeriod: "2026-12-31",
        Option: [{ Name: "AccountingMethod", Value: "Cash" }],
      },
      Rows: {
        Row: [
          {
            type: "Section",
            group: "Assets",
            Rows: {
              Row: [
                {
                  type: "Data",
                  ColData: [{ id: "35", value: "Checking" }, { value: "100.00" }],
                },
              ],
            },
          },
        ],
      },
    };
    const result = parseQboBalanceSheetReport(cashJson);
    expect(result.accountingMethod).toBe("Cash");
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].balanceCents).toBe(10000);
  });

  it("emits computed lines with qboAccountId=null when ColData[0].id is missing", () => {
    const json = {
      Header: { EndPeriod: "2026-12-31" },
      Rows: {
        Row: [
          {
            type: "Section",
            group: "Equity",
            Rows: {
              Row: [
                {
                  type: "Data",
                  ColData: [{ value: "Net Income" }, { value: "500.00" }],
                },
              ],
            },
          },
        ],
      },
    };
    const result = parseQboBalanceSheetReport(json);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].qboAccountId).toBeNull();
    expect(result.lines[0].isComputedLine).toBe(true);
    expect(result.lines[0].qboAccountName).toBe("Net Income");
    expect(result.lines[0].classification).toBe("Equity");
    expect(result.lines[0].balanceCents).toBe(50000);
  });

  it("skips Section headers and Summary rows", () => {
    const json = {
      Header: { EndPeriod: "2026-12-31" },
      Rows: {
        Row: [
          {
            type: "Section",
            group: "Assets",
            Header: {
              ColData: [{ value: "ASSETS" }, { value: "" }],
            },
            Rows: {
              Row: [
                {
                  type: "Data",
                  ColData: [{ id: "35", value: "Checking" }, { value: "100.00" }],
                },
                {
                  type: "Summary",
                  ColData: [{ value: "Total Assets" }, { value: "100.00" }],
                },
              ],
            },
          },
          { type: "Section", ColData: [{ value: "TOTAL" }, { value: "0" }] },
        ],
      },
    };
    const result = parseQboBalanceSheetReport(json);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].qboAccountId).toBe("35");
  });

  it("classifies rows by their enclosing section (Asset/Liability/Equity)", () => {
    const json = {
      Header: { EndPeriod: "2026-12-31" },
      Rows: {
        Row: [
          {
            type: "Section",
            group: "Assets",
            Rows: {
              Row: [
                {
                  type: "Data",
                  ColData: [{ id: "1", value: "A" }, { value: "1.00" }],
                },
              ],
            },
          },
          {
            type: "Section",
            group: "Liabilities",
            Rows: {
              Row: [
                {
                  type: "Data",
                  ColData: [{ id: "2", value: "L" }, { value: "2.00" }],
                },
              ],
            },
          },
          {
            type: "Section",
            group: "Equity",
            Rows: {
              Row: [
                {
                  type: "Data",
                  ColData: [{ id: "3", value: "E" }, { value: "3.00" }],
                },
              ],
            },
          },
        ],
      },
    };
    const result = parseQboBalanceSheetReport(json);
    expect(result.lines).toHaveLength(3);
    expect(result.lines[0].classification).toBe("Asset");
    expect(result.lines[1].classification).toBe("Liability");
    expect(result.lines[2].classification).toBe("Equity");
  });

  it("reads accounting basis from Header.ReportBasis (modernized API)", () => {
    const json = {
      Header: { EndPeriod: "2026-12-31", ReportBasis: "Cash" },
      Rows: {
        Row: [
          {
            type: "Section",
            group: "Assets",
            Rows: {
              Row: [
                {
                  type: "Data",
                  ColData: [{ id: "1", value: "A" }, { value: "1.00" }],
                },
              ],
            },
          },
        ],
      },
    };
    const result = parseQboBalanceSheetReport(json);
    expect(result.accountingMethod).toBe("Cash");
  });

  it("falls back to Header.Option AccountingMethod when ReportBasis missing", () => {
    const json = {
      Header: {
        EndPeriod: "2026-12-31",
        Option: [{ Name: "AccountingMethod", Value: "Cash" }],
      },
      Rows: {
        Row: [
          {
            type: "Section",
            group: "Assets",
            Rows: {
              Row: [
                {
                  type: "Data",
                  ColData: [{ id: "1", value: "A" }, { value: "1.00" }],
                },
              ],
            },
          },
        ],
      },
    };
    const result = parseQboBalanceSheetReport(json);
    expect(result.accountingMethod).toBe("Cash");
  });

  it("prefers ReportBasis over Header.Option AccountingMethod when both present", () => {
    // Defense in depth: if both are present with conflicting values,
    // ReportBasis (modernized API canonical) wins.
    const json = {
      Header: {
        EndPeriod: "2026-12-31",
        ReportBasis: "Accrual",
        Option: [{ Name: "AccountingMethod", Value: "Cash" }],
      },
      Rows: {
        Row: [
          {
            type: "Section",
            group: "Assets",
            Rows: {
              Row: [
                {
                  type: "Data",
                  ColData: [{ id: "1", value: "A" }, { value: "1.00" }],
                },
              ],
            },
          },
        ],
      },
    };
    const result = parseQboBalanceSheetReport(json);
    expect(result.accountingMethod).toBe("Accrual");
  });
});
