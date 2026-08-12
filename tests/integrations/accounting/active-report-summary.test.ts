import { describe, expect, it } from "vitest";
import { buildActiveReportSummary } from "@/lib/integrations/accounting/active-report-summary";
import { buildMappedFinancialSummary } from "@/lib/integrations/accounting/normalizers/financial-statements";
import type { CanonicalBalanceSheetRow, CanonicalPnLRow, CanonicalSourceMetadata } from "@/lib/integrations/accounting/types";

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
): CanonicalBalanceSheetRow {
  return {
    label,
    amount,
    section,
    source: {
      provider: "xero",
      providerFamily: "xero",
      providerProduct: "xero",
      sourceReport: "BalanceSheet",
      raw: {},
    },
  };
}

function payload(incomeStatement: CanonicalPnLRow[], balanceSheet: CanonicalBalanceSheetRow[] = [], sourceSystem = "xero") {
  return {
    reportDataContext: {
      tenantName: "Demo Co",
      normalizedData: {
        sourceSystem,
        lastSyncedAt: "2026-08-12T00:00:00.000Z",
        normalizedIncomeStatement: incomeStatement,
        normalizedBalanceSheet: balanceSheet,
        normalizedAccounts: [],
        normalizedTrialBalance: [],
      },
    },
  };
}

describe("canonical activeReportSummary", () => {
  it("1: Revenue 100 / COS 40 / Net Income 20 -> revenue is 100 (not mixed)", () => {
    const incomeStatement = [
      pnl("Sales", 100, "Revenue", qboSource()),
      pnl("Total Income", 100, "Revenue", qboSource()),
      pnl("Materials", 40, "Cost of Sales", qboSource()),
      pnl("Total Cost of Sales", 40, "Cost of Sales", qboSource()),
      pnl("Net Income", 20, "Net Income", qboSource()),
    ];
    const summary = buildActiveReportSummary(payload(incomeStatement, [], "quickbooks"));
    expect(summary?.revenue).toBe(100);
    expect(summary?.netIncome).toBe(20);
    // Prove we did not sum Sales + Total Income + Net Income + COS.
    expect(summary?.revenue).not.toBe(180);
    expect(summary?.revenue).not.toBe(220);
  });

  it("2: leaf rows + Total Income do not double-count", () => {
    const incomeStatement = [
      pnl("Consulting", 60, "Income"),
      pnl("Services", 40, "Income"),
      pnl("Total Income", 100, "Income"),
      pnl("Net Profit", 25, "Net Income"),
    ];
    const summary = buildActiveReportSummary(payload(incomeStatement));
    expect(summary?.revenue).toBe(100);
    expect(buildMappedFinancialSummary([], incomeStatement).revenue).toBe(100);
  });

  it('3: Xero section label "Income" maps to revenue', () => {
    const incomeStatement = [
      pnl("Consulting", 100, "Income"),
      pnl("Materials", 40, "Cost of Sales"),
      pnl("Net Profit", 20, "Net Income"),
    ];
    const summary = buildActiveReportSummary(payload(incomeStatement));
    expect(summary?.revenue).toBe(100);
    expect(summary?.netIncome).toBe(20);
  });

  it("4: negative Net Income is preserved", () => {
    const incomeStatement = [
      pnl("Total Income", 50, "Income"),
      pnl("Total Expenses", 80, "Expenses"),
      pnl("Net Profit", -30, "Net Income"),
    ];
    const summary = buildActiveReportSummary(payload(incomeStatement));
    expect(summary?.revenue).toBe(50);
    expect(summary?.netIncome).toBe(-30);
  });

  it("5: zero revenue remains zero", () => {
    const incomeStatement = [
      pnl("Total Income", 0, "Income"),
      pnl("Net Profit", 0, "Net Income"),
    ];
    const summary = buildActiveReportSummary(payload(incomeStatement));
    expect(summary?.revenue).toBe(0);
    expect(summary?.netIncome).toBe(0);
  });

  it("6: QBO normalized payload uses the same canonical path", () => {
    const incomeStatement = [
      pnl("Product Sales", 200, "Revenue", qboSource()),
      pnl("Total Income", 200, "Revenue", qboSource()),
      pnl("COGS", 70, "Cost of Sales", qboSource()),
      pnl("Total Cost of Sales", 70, "Cost of Sales", qboSource()),
      pnl("OpEx", 50, "Expenses", qboSource()),
      pnl("Total Expenses", 50, "Expenses", qboSource()),
      pnl("Net Income", 80, "Net Income", qboSource()),
    ];
    const balanceSheet = [
      bs("Checking", 1500, "Current Assets"),
      bs("Total Assets", 5000, "Assets"),
      bs("Total Liabilities", 1000, "Liabilities"),
    ];
    const summary = buildActiveReportSummary(payload(incomeStatement, balanceSheet, "quickbooks"));
    const mapped = buildMappedFinancialSummary(balanceSheet, incomeStatement);
    expect(summary?.sourceSystem).toBe("quickbooks");
    expect(summary?.revenue).toBe(200);
    expect(mapped.revenue).toBe(200);
    expect(summary?.netIncome).toBe(80);
    expect(mapped.netIncome).toBe(80);
    expect(summary?.assets).toBe(5000);
    expect(mapped.totalAssets).toBe(5000);
    expect(summary?.liabilities).toBe(1000);
    expect(mapped.totalLiabilities).toBe(1000);
    expect(summary?.cash).toBe(1500);
  });

  it("7: Xero-shaped smoke payload uses canonical totals (COS does not inflate revenue)", () => {
    const incomeStatement = [
      pnl("Sales", 100, "Income"),
      pnl("Total Income", 100, "Income"),
      pnl("Direct Costs", 40, "Cost of Sales"),
      pnl("Total Cost of Sales", 40, "Cost of Sales"),
      pnl("Overhead", 40, "Expenses"),
      pnl("Total Expenses", 40, "Expenses"),
      pnl("Net Profit", 20, "Net Income"),
    ];
    const balanceSheet = [bs("Business Bank Account", 9082, "Current Assets"), bs("Total Assets", 20000, "Assets")];
    const summary = buildActiveReportSummary(payload(incomeStatement, balanceSheet, "xero"));
    expect(summary?.revenue).toBe(100);
    expect(summary?.netIncome).toBe(20);
    expect(summary?.cash).toBe(9082);
    // Old regex would also match Cost of Sales / Net Income and drift away from 100.
    expect(summary?.revenue).not.toBe(100 + 40 + 20);
  });
});
