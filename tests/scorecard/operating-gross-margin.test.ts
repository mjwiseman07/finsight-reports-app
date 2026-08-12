import { describe, expect, it } from "vitest";
import { factorizeOperatingGrossMargin } from "@/lib/scorecard/operating-gross-margin";
import { resolveNorthStar } from "@/lib/scorecard/industry-north-star";
import {
  isOperatingGrossMarginWired,
  resolveNorthStarTileState,
} from "@/components/dashboard/Scorecard";
import { factorizeNorthStar } from "@/lib/dashboard/accuracy-contract/kpi-factorization";
import { buildMappedFinancialSummary } from "@/lib/integrations/accounting/normalizers/financial-statements";
import { buildActiveReportSummary } from "@/lib/integrations/accounting/active-report-summary";
import type {
  CanonicalBalanceSheetRow,
  CanonicalPnLRow,
  CanonicalSourceMetadata,
} from "@/lib/integrations/accounting/types";

describe("factorizeOperatingGrossMargin", () => {
  it("1: revenue 100 / cogs 40 / grossProfit 60 -> 60.0%", () => {
    const factor = factorizeOperatingGrossMargin({ revenue: 100, grossProfit: 60 });
    expect(factor.status).toBe("ready");
    expect(factor.numeric).toBeCloseTo(0.6);
    expect(factor.display).toBe("60.0%");
  });

  it("2: revenue 100 / cogs 0 / grossProfit 100 -> 100.0%", () => {
    const factor = factorizeOperatingGrossMargin({ revenue: 100, grossProfit: 100 });
    expect(factor.status).toBe("ready");
    expect(factor.display).toBe("100.0%");
  });

  it("3: revenue 100 / cogs 120 / grossProfit -20 -> -20.0%", () => {
    const factor = factorizeOperatingGrossMargin({ revenue: 100, grossProfit: -20 });
    expect(factor.status).toBe("ready");
    expect(factor.display).toBe("-20.0%");
  });

  it("4: revenue 0 -> unavailable, not 0%", () => {
    const factor = factorizeOperatingGrossMargin({ revenue: 0, grossProfit: 0 });
    expect(factor.status).toBe("unavailable");
    expect(factor.display).toBeNull();
    expect(factor.numeric).toBeNull();
    expect(factor.message).toMatch(/no positive revenue/i);
  });

  it("5: negative revenue -> unavailable", () => {
    const factor = factorizeOperatingGrossMargin({ revenue: -10, grossProfit: -5 });
    expect(factor.status).toBe("unavailable");
    expect(factor.display).toBeNull();
  });

  it("10: missing canonical summary -> unavailable (no fabricated value)", () => {
    expect(factorizeOperatingGrossMargin(null).status).toBe("unavailable");
    expect(factorizeOperatingGrossMargin(undefined).status).toBe("unavailable");
  });
});

describe("General north-star wiring", () => {
  it("6: General industry operating_gross_margin ready when factor exists", () => {
    const northStar = resolveNorthStar("General");
    expect(northStar.code).toBe("operating_gross_margin");
    expect(isOperatingGrossMarginWired(northStar.code)).toBe(true);
    expect(
      resolveNorthStarTileState({
        computationShipped: northStar.computationShipped,
        valueWired: true,
        hasSummary: true,
        factorStatus: "ready",
      }).status,
    ).toBe("ready");
  });

  it("7: non-General unwired north star still coming_soon", () => {
    const saas = resolveNorthStar("SaaS");
    expect(isOperatingGrossMarginWired(saas.code)).toBe(false);
    expect(
      resolveNorthStarTileState({
        computationShipped: saas.computationShipped,
        valueWired: isOperatingGrossMarginWired(saas.code),
        hasSummary: true,
        factorStatus: "ready",
      }).status,
    ).toBe("coming_soon");

    const healthcare = resolveNorthStar("Healthcare");
    expect(
      resolveNorthStarTileState({
        computationShipped: healthcare.computationShipped,
        valueWired: false,
      }).status,
    ).toBe("coming_soon");
  });
});

const xeroSource = (raw: Record<string, unknown> = {}): CanonicalSourceMetadata => ({
  provider: "xero",
  providerFamily: "xero",
  providerProduct: "xero",
  sourceReport: "ProfitAndLoss",
  raw: {
    __advisacorHierarchyPath: ["ProfitAndLoss", "Income"],
    __advisacorSourceSection: "Income",
    ...raw,
  },
});

const qboSource = (): CanonicalSourceMetadata => ({
  provider: "quickbooks",
  providerFamily: "quickbooks",
  providerProduct: "quickbooks",
  sourceReport: "ProfitAndLoss",
  raw: {},
});

function pnl(
  label: string,
  amount: number,
  section: string,
  source: CanonicalSourceMetadata = xeroSource(),
): CanonicalPnLRow {
  return { label, amount, section, source };
}

function bs(
  label: string,
  amount: number,
  section: string,
  provider: "xero" | "quickbooks" = "xero",
): CanonicalBalanceSheetRow {
  return {
    label,
    amount,
    section,
    source: {
      provider,
      providerFamily: provider,
      providerProduct: provider,
      sourceReport: "BalanceSheet",
      raw: {
        __advisacorHierarchyPath: [section, label],
        __advisacorSourceSection: section,
      },
    },
  };
}

describe("QBO and Xero share the same factorizer path", () => {
  it("8: normalized summaries use factorizeOperatingGrossMargin via mapped grossProfit", () => {
    const xeroIncome = [
      pnl("Sales", 9527.98, "Income"),
      pnl("Total Income", 9527.98, "Income"),
      pnl("Total Cost of Sales", 0, "Cost of Sales"),
      pnl("Net Profit", -14635.15, "Net Income"),
    ];
    const qboIncome = [
      pnl("Sales", 9527.98, "Revenue", qboSource()),
      pnl("Total Income", 9527.98, "Revenue", qboSource()),
      pnl("Total Cost of Sales", 0, "Cost of Sales", qboSource()),
      pnl("Net Income", -14635.15, "Net Income", qboSource()),
    ];

    const xeroMapped = buildMappedFinancialSummary([], xeroIncome);
    const qboMapped = buildMappedFinancialSummary([], qboIncome);
    expect(xeroMapped.grossProfit).toBe(9527.98);
    expect(qboMapped.grossProfit).toBe(9527.98);

    const xeroFactor = factorizeOperatingGrossMargin(xeroMapped);
    const qboFactor = factorizeOperatingGrossMargin(qboMapped);
    expect(xeroFactor.display).toBe("100.0%");
    expect(qboFactor.display).toBe("100.0%");

    const xeroActive = buildActiveReportSummary({
      reportDataContext: {
        normalizedData: {
          sourceSystem: "xero",
          normalizedIncomeStatement: xeroIncome,
          normalizedBalanceSheet: [bs("Checking", 0, "Cash and Cash Equivalents")],
        },
      },
    });
    const qboActive = buildActiveReportSummary({
      reportDataContext: {
        normalizedData: {
          sourceSystem: "quickbooks",
          normalizedIncomeStatement: qboIncome,
          normalizedBalanceSheet: [bs("Checking", 0, "Current Assets", "quickbooks")],
        },
      },
    });
    expect(xeroActive?.grossProfit).toBe(9527.98);
    expect(qboActive?.grossProfit).toBe(9527.98);
    expect(factorizeOperatingGrossMargin(xeroActive!).display).toBe("100.0%");
    expect(factorizeOperatingGrossMargin(qboActive!).display).toBe("100.0%");
  });

  it("9: Accuracy Contract north star uses mapped summary, not raw Scorecard math", () => {
    const income = [
      pnl("Sales", 100, "Income"),
      pnl("Total Income", 100, "Income"),
      pnl("Materials", 40, "Cost of Sales"),
      pnl("Total Cost of Sales", 40, "Cost of Sales"),
      pnl("Net Profit", 20, "Net Income"),
    ];
    const result = factorizeNorthStar("General", {
      normalizedIncomeStatement: income as never,
      normalizedBalanceSheet: [],
    });
    expect(result.computation_status).toBe("computed");
    expect(result.display).toBe("60.0%");
    expect(result.numeric).toBeCloseTo(0.6);

    const saas = factorizeNorthStar("SaaS", {
      normalizedIncomeStatement: income as never,
      normalizedBalanceSheet: [],
    });
    expect(saas.computation_status).toBe("pending_subledger");
  });
});
