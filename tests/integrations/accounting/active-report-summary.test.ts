import { describe, expect, it } from "vitest";
import {
  buildActiveReportSummary,
  isAssetSideBalanceSheetRow,
  isBalanceSheetSummaryOrTotalRow,
  isCashOrBankRelated,
  sumCashFromBalanceSheet,
} from "@/lib/integrations/accounting/active-report-summary";
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
  raw: Record<string, unknown> = {},
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
        __advisacorHierarchyPath: [section, label].filter(Boolean),
        __advisacorSourceSection: section,
        ...raw,
      },
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
      bs("Checking", 1500, "Current Assets", {}, "quickbooks"),
      bs("Total Assets", 5000, "Assets", {}, "quickbooks"),
      bs("Total Liabilities", 1000, "Liabilities", {}, "quickbooks"),
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
    expect(summary?.revenue).not.toBe(100 + 40 + 20);
  });
});

describe("canonical cash selection", () => {
  it("1: Xero live-shape — leaf + Total Cash does not double-count", () => {
    const rows = [
      bs("Checking Account", 4540.98, "Cash and Cash Equivalents", {
        rowType: "Row",
        __advisacorHierarchyPath: ["Cash and Cash Equivalents", "Checking Account"],
      }),
      bs("Total Cash and Cash Equivalents", 4540.98, "Cash and Cash Equivalents", {
        rowType: "SummaryRow",
        __advisacorHierarchyPath: ["Cash and Cash Equivalents", "Total Cash and Cash Equivalents"],
      }),
    ];
    expect(isBalanceSheetSummaryOrTotalRow(rows[1])).toBe(true);
    expect(sumCashFromBalanceSheet(rows)).toBe(4540.98);
    expect(sumCashFromBalanceSheet(rows)).not.toBe(9081.96);
    expect(buildActiveReportSummary(payload([], rows))?.cash).toBe(4540.98);
  });

  it("2: multiple leaves + total prefers the total once", () => {
    const rows = [
      bs("Checking", 4000, "Cash and Cash Equivalents"),
      bs("Savings", 1000, "Cash and Cash Equivalents"),
      bs("Total Cash", 5000, "Cash and Cash Equivalents", { rowType: "Summary" }),
    ];
    expect(sumCashFromBalanceSheet(rows)).toBe(5000);
  });

  it("3: no explicit total sums leaves only", () => {
    const rows = [
      bs("Checking", 4000, "Bank Accounts"),
      bs("Savings", 1000, "Bank Accounts"),
    ];
    expect(sumCashFromBalanceSheet(rows)).toBe(5000);
  });

  it("4: zero cash remains zero", () => {
    const rows = [
      bs("Checking", 0, "Cash and Cash Equivalents"),
      bs("Total Cash", 0, "Cash and Cash Equivalents", { rowType: "SummaryRow" }),
    ];
    expect(sumCashFromBalanceSheet(rows)).toBe(0);
  });

  it("5: negative bank/cash balance is preserved (no abs)", () => {
    const rows = [bs("Checking", -250.5, "Bank Accounts")];
    expect(sumCashFromBalanceSheet(rows)).toBe(-250.5);
  });

  it("6: QBO hierarchy leaf + parent/summary does not double-count", () => {
    const rows = [
      bs(
        "Checking",
        1200,
        "Bank Accounts",
        {
          rowType: "Data",
          __advisacorHierarchyPath: ["Assets", "Current Assets", "Bank Accounts", "Checking"],
        },
        "quickbooks",
      ),
      bs(
        "Savings",
        800,
        "Bank Accounts",
        {
          rowType: "Data",
          __advisacorHierarchyPath: ["Assets", "Current Assets", "Bank Accounts", "Savings"],
        },
        "quickbooks",
      ),
      bs(
        "Total Bank Accounts",
        2000,
        "Bank Accounts",
        {
          rowType: "Summary",
          __advisacorHierarchyPath: ["Assets", "Current Assets", "Bank Accounts", "Total Bank Accounts"],
        },
        "quickbooks",
      ),
    ];
    expect(sumCashFromBalanceSheet(rows)).toBe(2000);
    expect(buildActiveReportSummary(payload([], rows, "quickbooks"))?.cash).toBe(2000);
  });

  it("7: unrelated assets are excluded despite ambiguous section labels", () => {
    const rows = [
      bs("Checking", 1000, "Cash and Cash Equivalents"),
      bs("Accounts Receivable", 5000, "Current Assets"),
      bs("Inventory", 2000, "Current Assets"),
      bs("Total Current Assets", 8000, "Current Assets", { rowType: "Summary" }),
      bs("Total Assets", 12000, "Assets", { rowType: "Summary" }),
    ];
    expect(sumCashFromBalanceSheet(rows)).toBe(1000);
  });

  it("8: July Xero regression — asset Total Cash 0; liability Checking excluded", () => {
    const assetChecking = bs("Checking Account", 0, "Cash and Cash Equivalents", {
      rowType: "Row",
      __advisacorHierarchyPath: ["Assets", "Current Assets", "Cash and Cash Equivalents", "Checking Account"],
      __advisacorSourceSection: "Cash and Cash Equivalents",
    });
    const assetTotalCash = bs("Total Cash and Cash Equivalents", 0, "Cash and Cash Equivalents", {
      rowType: "SummaryRow",
      __advisacorHierarchyPath: ["Assets", "Current Assets", "Cash and Cash Equivalents", "Total Cash and Cash Equivalents"],
      __advisacorSourceSection: "Cash and Cash Equivalents",
    });
    const liabilityChecking = bs("Checking Account", 4520.08, "Current Liabilities", {
      rowType: "Row",
      __advisacorHierarchyPath: ["Liabilities", "Current Liabilities", "Checking Account"],
      __advisacorSourceSection: "Current Liabilities",
    });

    expect(isAssetSideBalanceSheetRow(assetChecking)).toBe(true);
    expect(isAssetSideBalanceSheetRow(assetTotalCash)).toBe(true);
    expect(isCashOrBankRelated(liabilityChecking)).toBe(true);
    expect(isAssetSideBalanceSheetRow(liabilityChecking)).toBe(false);

    const rows = [assetChecking, assetTotalCash, liabilityChecking];
    expect(sumCashFromBalanceSheet(rows)).toBe(0);
    expect(sumCashFromBalanceSheet(rows)).not.toBe(4520.08);
    expect(sumCashFromBalanceSheet(rows)).not.toBe(4540.98);
    expect(sumCashFromBalanceSheet(rows)).not.toBe(9081.96);
    expect(buildActiveReportSummary(payload([], rows))?.cash).toBe(0);
  });

  it("9: asset Checking kept; liability Checking ignored", () => {
    const rows = [
      bs("Checking", 4000, "Cash and Cash Equivalents", {
        __advisacorHierarchyPath: ["Assets", "Current Assets", "Cash and Cash Equivalents", "Checking"],
      }),
      bs("Checking", 2000, "Current Liabilities", {
        __advisacorHierarchyPath: ["Liabilities", "Current Liabilities", "Checking"],
        __advisacorSourceSection: "Current Liabilities",
      }),
    ];
    expect(sumCashFromBalanceSheet(rows)).toBe(4000);
  });

  it("10: asset leaves + total; liability Checking ignored", () => {
    const rows = [
      bs("Checking", 4000, "Cash and Cash Equivalents", {
        __advisacorHierarchyPath: ["Assets", "Cash and Cash Equivalents", "Checking"],
      }),
      bs("Savings", 1000, "Cash and Cash Equivalents", {
        __advisacorHierarchyPath: ["Assets", "Cash and Cash Equivalents", "Savings"],
      }),
      bs("Total Cash", 5000, "Cash and Cash Equivalents", {
        rowType: "Summary",
        __advisacorHierarchyPath: ["Assets", "Cash and Cash Equivalents", "Total Cash"],
      }),
      bs("Checking", 2000, "Current Liabilities", {
        __advisacorHierarchyPath: ["Liabilities", "Current Liabilities", "Checking"],
      }),
    ];
    expect(sumCashFromBalanceSheet(rows)).toBe(5000);
  });

  it("11: only liability-side checking → cash 0 (never liability balance)", () => {
    const rows = [
      bs("Checking Account", 4520.08, "Current Liabilities", {
        rowType: "Row",
        __advisacorHierarchyPath: ["Liabilities", "Current Liabilities", "Checking Account"],
        __advisacorSourceSection: "Current Liabilities",
      }),
    ];
    expect(isAssetSideBalanceSheetRow(rows[0])).toBe(false);
    expect(sumCashFromBalanceSheet(rows)).toBe(0);
  });

  it("12: negative asset-side checking preserved", () => {
    const rows = [
      bs("Checking", -120.25, "Cash and Cash Equivalents", {
        __advisacorHierarchyPath: ["Assets", "Current Assets", "Cash and Cash Equivalents", "Checking"],
      }),
    ];
    expect(isAssetSideBalanceSheetRow(rows[0])).toBe(true);
    expect(sumCashFromBalanceSheet(rows)).toBe(-120.25);
  });

  it("13: QBO — asset bank included; liability bank-like excluded", () => {
    const rows = [
      bs(
        "Checking",
        3000,
        "Bank Accounts",
        {
          rowType: "Data",
          __advisacorHierarchyPath: ["Assets", "Current Assets", "Bank Accounts", "Checking"],
        },
        "quickbooks",
      ),
      bs(
        "Line of Credit",
        1500,
        "Credit Cards",
        {
          rowType: "Data",
          __advisacorHierarchyPath: ["Liabilities", "Current Liabilities", "Credit Cards", "Line of Credit"],
          __advisacorSourceSection: "Current Liabilities",
        },
        "quickbooks",
      ),
      bs(
        "Bank Loan",
        9000,
        "Long-Term Liabilities",
        {
          rowType: "Data",
          __advisacorHierarchyPath: ["Liabilities", "Long-Term Liabilities", "Bank Loan"],
        },
        "quickbooks",
      ),
    ];
    expect(sumCashFromBalanceSheet(rows)).toBe(3000);
  });
});
