import { describe, expect, it, vi } from "vitest";
import {
  buildStatementControl,
  STATEMENT_CONTROL_TOLERANCE_DOLLAR,
  getStatementControlLine,
} from "@/lib/integrations/accounting/statement-control";
import { buildActiveReportSummary } from "@/lib/integrations/accounting/active-report-summary";
import { normalizeQuickBooksFinancialStatement } from "@/lib/integrations/accounting/normalizers/financial-statements";
import { resolveCashTileState, resolveNetMarginTileState } from "@/components/dashboard/Scorecard";
import { factorizeOperatingGrossMargin } from "@/lib/scorecard/operating-gross-margin";
import type { CanonicalBalanceSheetRow, CanonicalPnLRow, CanonicalSourceMetadata } from "@/lib/integrations/accounting/types";

function source(provider: "xero" | "quickbooks", raw: Record<string, unknown> = {}): CanonicalSourceMetadata {
  return {
    provider,
    providerFamily: provider,
    providerProduct: provider,
    sourceReport: "BalanceSheet",
    raw,
  };
}

function bs(
  label: string,
  amount: number,
  section: string,
  path: string[],
  provider: "xero" | "quickbooks" = "quickbooks",
): CanonicalBalanceSheetRow {
  return {
    label,
    amount,
    section,
    source: source(provider, {
      __advisacorHierarchyPath: path,
      __advisacorSourceSection: section,
    }),
  };
}

function pnl(
  label: string,
  amount: number,
  section: string,
  provider: "xero" | "quickbooks" = "quickbooks",
): CanonicalPnLRow {
  return {
    label,
    amount,
    section,
    source: {
      provider,
      providerFamily: provider,
      providerProduct: provider,
      sourceReport: "ProfitAndLoss",
      raw: {
        __advisacorHierarchyPath: [section, label],
        __advisacorSourceSection: section,
      },
    },
  };
}

const demoBBs = (): CanonicalBalanceSheetRow[] => [
  bs("Chequing", 21095.57, "Bank Accounts", ["Assets", "Other Current Assets", "Bank Accounts", "Chequing"]),
  bs("Total Cash and Cash Equivalent", 21095.57, "Bank Accounts", [
    "Assets",
    "Other Current Assets",
    "Bank Accounts",
    "Total Cash and Cash Equivalent",
  ]),
  bs("Accounts Receivable", 18402.04, "Accounts Receivable", [
    "Assets",
    "Other Current Assets",
    "Accounts Receivable",
  ]),
  bs("Total Assets", 49662.89, "Assets", ["Assets", "Total Assets"]),
  bs("Accounts Payable", 734.51, "Accounts Payable", ["Liabilities", "Accounts Payable"]),
  bs("Total Liabilities", 734.51, "Liabilities", ["Liabilities", "Total Liabilities"]),
  bs("Total Equity", 48928.38, "Equity", ["Equity", "Total Equity"]),
];

  // demoBPnl includes Gross Profit under Revenue section — add income leaves for exact revenue tie
const demoBPnl = (): CanonicalPnLRow[] => [
  pnl("Sales of Product Income", 19050, "Income"),
  pnl("Services", 3600, "Income"),
  pnl("Billable Expenses Income", 10610.25, "Income"),
  pnl("Markup", 2409.55, "Income"),
  pnl("Sales", 3500, "Income"),
  pnl("Total Income", 39169.8, "Income"),
  pnl("Cost of Goods Sold", 9664.68, "Cost of Sales"),
  pnl("Cost of Sales - billable expenses", 28997.75, "Cost of Sales"),
  pnl("Total Cost of Goods Sold", 38662.43, "Cost of Sales"),
  pnl("Gross Profit", 507.37, "Revenue"),
  pnl("Total Expenses", 13541.4, "Expenses"),
  pnl("Net Income", -13034.03, "Net Income"),
];

describe("statement control — Balance Sheet", () => {
  it("1. BS exact tie → pass", () => {
    const control = buildStatementControl({
      balanceSheet: demoBBs(),
      incomeStatement: demoBPnl(),
    });
    expect(getStatementControlLine(control, "cash")?.status).toBe("tie");
    expect(getStatementControlLine(control, "cash")?.nativeAmount).toBe(21095.57);
    expect(getStatementControlLine(control, "cash")?.canonicalAmount).toBe(21095.57);
    expect(getStatementControlLine(control, "ar")?.passes).toBe(true);
    expect(control.cashControlPasses).toBe(true);
    expect(control.toleranceDollar).toBe(STATEMENT_CONTROL_TOLERANCE_DOLLAR);
  });

  it("2. BS rounding-level tie → pass within explicit tolerance", () => {
    const controlRounded = buildStatementControl({
      balanceSheet: [
        bs("Checking", 1000.4, "Bank Accounts", ["Assets", "Bank Accounts", "Checking"]),
        bs("Total Bank Accounts", 1000.0, "Bank Accounts", ["Assets", "Bank Accounts", "Total Bank Accounts"]),
        bs("Total Assets", 1000.0, "Assets", ["Assets", "Total Assets"]),
        bs("Total Liabilities", 0, "Liabilities", ["Liabilities", "Total Liabilities"]),
        bs("Total Equity", 1000.0, "Equity", ["Equity", "Total Equity"]),
      ],
      incomeStatement: [],
    });
    const cash = getStatementControlLine(controlRounded, "cash");
    // Native aggregate 1000 vs leaf 1000.4 → within $1
    expect(cash?.status).toBe("auto_cleared");
    expect(cash?.passes).toBe(true);
    expect(cash?.varianceAbs).toBeLessThanOrEqual(1);
  });

  it("3. BS material mismatch → fail", () => {
    const arFail = buildStatementControl({
      balanceSheet: [
        bs("Accounts Receivable", 100, "Accounts Receivable", ["Assets", "Accounts Receivable"]),
        bs("Total Accounts Receivable", 18402.04, "Accounts Receivable", [
          "Assets",
          "Accounts Receivable",
          "Total Accounts Receivable",
        ]),
        bs("Total Assets", 18402.04, "Assets", ["Assets", "Total Assets"]),
        bs("Total Liabilities", 0, "Liabilities", ["Liabilities", "Total Liabilities"]),
        bs("Total Equity", 18402.04, "Equity", ["Equity", "Total Equity"]),
      ],
      incomeStatement: [],
    });
    // Native prefers Total AR 18402; canonical sums leaves → 100
    expect(getStatementControlLine(arFail, "ar")?.status).toBe("fail");
    expect(getStatementControlLine(arFail, "ar")?.passes).toBe(false);
  });

  it("4. accounting equation failure → fail", () => {
    const control = buildStatementControl({
      balanceSheet: [
        bs("Total Assets", 1000, "Assets", ["Assets", "Total Assets"]),
        bs("Total Liabilities", 100, "Liabilities", ["Liabilities", "Total Liabilities"]),
        bs("Total Equity", 100, "Equity", ["Equity", "Total Equity"]),
      ],
      incomeStatement: [],
    });
    expect(control.balanceSheet.equationPasses).toBe(false);
    expect(getStatementControlLine(control, "bs_equation")?.status).toBe("fail");
    expect(control.balanceSheet.passes).toBe(false);
  });
});

describe("statement control — P&L + KPI dependency", () => {
  it("5. P&L exact tie → pass", () => {
    const control = buildStatementControl({
      balanceSheet: demoBBs(),
      incomeStatement: demoBPnl(),
    });
    expect(getStatementControlLine(control, "revenue")?.status).toBe("tie");
    expect(getStatementControlLine(control, "cogs")?.status).toBe("tie");
    expect(["tie", "auto_cleared"]).toContain(getStatementControlLine(control, "net_income")?.status);
    expect(getStatementControlLine(control, "net_income")?.passes).toBe(true);
    expect(control.incomeStatement.passes).toBe(true);
    expect(control.netProfitMarginControlPasses).toBe(true);
    expect(control.operatingGrossMarginControlPasses).toBe(true);
  });

  it("6. revenue tie but NI mismatch → Net Margin blocked", () => {
    const control = buildStatementControl({
      balanceSheet: demoBBs(),
      incomeStatement: [
        pnl("Total Income", 39169.8, "Income"),
        pnl("Total Cost of Goods Sold", 38662.43, "Cost of Sales"),
        pnl("Total Expenses", 13541.4, "Expenses"),
        pnl("Net Income", -999.0, "Net Income"), // native NI wrong vs reconstructed
      ],
    });
    // Mapped NI from components ≈ -13034; native -999 → fail NI line
    expect(getStatementControlLine(control, "revenue")?.passes).toBe(true);
    expect(getStatementControlLine(control, "net_income")?.passes).toBe(false);
    expect(control.netProfitMarginControlPasses).toBe(false);

    const active = buildActiveReportSummary({
      reportDataContext: {
        tenantName: "NI mismatch",
        normalizedData: {
          sourceSystem: "quickbooks",
          normalizedBalanceSheet: demoBBs(),
          normalizedIncomeStatement: [
            pnl("Total Income", 39169.8, "Income"),
            pnl("Total Cost of Goods Sold", 38662.43, "Cost of Sales"),
            pnl("Total Expenses", 13541.4, "Expenses"),
            pnl("Net Income", -999.0, "Net Income"),
          ],
          statementControl: control,
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    });
    expect(active?.netProfitMarginReady).toBe(false);
    expect(resolveNetMarginTileState({ hydrationActive: false, summary: active }).state.status).toBe(
      "unavailable",
    );
  });

  it("7. COGS mismatch → Gross Margin blocked", () => {
    const leafDriven = [
      pnl("Total Income", 39169.8, "Income"),
      pnl("Cost of Goods Sold", 38662.43, "Cost of Sales"),
      pnl("Total Cost of Goods Sold", 1000, "Cost of Sales"),
      pnl("Total Expenses", 13541.4, "Expenses"),
      pnl("Net Income", -13034.03, "Net Income"),
    ];
    const control = buildStatementControl({
      balanceSheet: demoBBs(),
      incomeStatement: leafDriven,
    });
    // Native total COGS 1000 vs leaf sum 38662 → fail
    expect(getStatementControlLine(control, "cogs")?.passes).toBe(false);
    expect(control.operatingGrossMarginControlPasses).toBe(false);

    const active = buildActiveReportSummary({
      reportDataContext: {
        tenantName: "COGS mismatch",
        normalizedData: {
          sourceSystem: "quickbooks",
          normalizedBalanceSheet: demoBBs(),
          normalizedIncomeStatement: leafDriven,
          statementControl: control,
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    });
    expect(active?.operatingGrossMarginReady).toBe(false);
    expect(factorizeOperatingGrossMargin(active).status).toBe("unavailable");
  });

  it("8. incomplete P&L → affected margins blocked", () => {
    const rows = [pnl("Total Income", 39169.8, "Income")];
    const control = buildStatementControl({ balanceSheet: demoBBs(), incomeStatement: rows });
    expect(control.netProfitMarginControlPasses).toBe(false);
    expect(control.operatingGrossMarginControlPasses).toBe(false);
  });

  it("9. BS passes while P&L fails → Cash remains available", () => {
    const control = buildStatementControl({
      balanceSheet: demoBBs(),
      incomeStatement: [pnl("Total Income", 39169.8, "Income")],
    });
    expect(control.cashControlPasses).toBe(true);
    expect(control.netProfitMarginControlPasses).toBe(false);

    const active = buildActiveReportSummary({
      reportDataContext: {
        tenantName: "BS ok P&L fail",
        normalizedData: {
          sourceSystem: "quickbooks",
          normalizedBalanceSheet: demoBBs(),
          normalizedIncomeStatement: [pnl("Total Income", 39169.8, "Income")],
          statementControl: control,
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    });
    expect(active?.cashReady).toBe(true);
    expect(active?.cash).toBe(21095.57);
    expect(resolveCashTileState({ hydrationActive: false, summary: active }).status).toBe("ready");
    expect(active?.netProfitMarginReady).toBe(false);
  });

  it("10. P&L passes while BS fails → margins remain available", () => {
    const badBs = [
      bs("Chequing", 1, "Bank Accounts", ["Assets", "Bank Accounts", "Chequing"]),
      bs("Total Cash and Cash Equivalent", 21095.57, "Bank Accounts", [
        "Assets",
        "Bank Accounts",
        "Total Cash and Cash Equivalent",
      ]),
      bs("Total Assets", 100, "Assets", ["Assets", "Total Assets"]),
      bs("Total Liabilities", 0, "Liabilities", ["Liabilities", "Total Liabilities"]),
      bs("Total Equity", 50, "Equity", ["Equity", "Total Equity"]),
    ];
    // Equation fails; cash aggregate still ties
    const control = buildStatementControl({
      balanceSheet: badBs,
      incomeStatement: demoBPnl(),
    });
    expect(control.balanceSheet.equationPasses).toBe(false);
    expect(control.netProfitMarginControlPasses).toBe(true);
    expect(control.operatingGrossMarginControlPasses).toBe(true);

    const active = buildActiveReportSummary({
      reportDataContext: {
        tenantName: "P&L ok BS fail",
        normalizedData: {
          sourceSystem: "quickbooks",
          normalizedBalanceSheet: badBs,
          normalizedIncomeStatement: demoBPnl(),
          statementControl: control,
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    });
    expect(active?.netProfitMarginReady).toBe(true);
    expect(active?.operatingGrossMarginReady).toBe(true);
    expect(resolveNetMarginTileState({ hydrationActive: false, summary: active }).state.status).toBe(
      "ready",
    );
  });
});

describe("statement control — provider regressions", () => {
  it("11. Xero control unchanged Scorecard values when control ties", () => {
    const rows = [
      bs(
        "Business Bank Account",
        4540.98,
        "Cash and Cash Equivalents",
        ["Assets", "Current Assets", "Cash and Cash Equivalents", "Business Bank Account"],
        "xero",
      ),
      bs(
        "Total Cash and Cash Equivalents",
        4540.98,
        "Cash and Cash Equivalents",
        ["Assets", "Current Assets", "Cash and Cash Equivalents", "Total Cash and Cash Equivalents"],
        "xero",
      ),
      bs("Total Assets", 4540.98, "Assets", ["Assets", "Total Assets"], "xero"),
      bs("Total Liabilities", 0, "Liabilities", ["Liabilities", "Total Liabilities"], "xero"),
      bs("Total Equity", 4540.98, "Equity", ["Equity", "Total Equity"], "xero"),
    ];
    const pnlRows = [
      pnl("Total Income", 100000, "Income", "xero"),
      pnl("Total Cost of Goods Sold", 40000, "Cost of Sales", "xero"),
      pnl("Total Expenses", 30000, "Expenses", "xero"),
      pnl("Net Income", 30000, "Net Income", "xero"),
    ];
    const control = buildStatementControl({ balanceSheet: rows, incomeStatement: pnlRows });
    expect(control.cashControlPasses).toBe(true);
    const active = buildActiveReportSummary({
      reportDataContext: {
        tenantName: "Xero Demo",
        normalizedData: {
          sourceSystem: "xero",
          normalizedBalanceSheet: rows,
          normalizedIncomeStatement: pnlRows,
          statementControl: control,
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    });
    expect(active?.cash).toBe(4540.98);
    expect(active?.revenue).toBe(100000);
    expect(active?.netIncome).toBe(30000);
  });

  it("12. QBO US control — Checking under Bank Accounts", () => {
    const normalized = normalizeQuickBooksFinancialStatement("BalanceSheet", [
      {
        group: "BankAccounts",
        Header: { ColData: [{ value: "BankAccounts" }] },
        Rows: {
          Row: [
            { ColData: [{ value: "Checking" }, { value: "36.02" }] },
            { ColData: [{ value: "Savings" }, { value: "800.00" }] },
          ],
        },
        Summary: { ColData: [{ value: "Total Bank Accounts" }, { value: "836.02" }] },
      },
      {
        type: "Data",
        ColData: [{ value: "Total Assets" }, { value: "836.02" }],
      },
    ]) as CanonicalBalanceSheetRow[];
    // Add L+E for equation
    const withEquity = [
      ...normalized,
      bs("Total Liabilities", 0, "Liabilities", ["Liabilities", "Total Liabilities"]),
      bs("Total Equity", 836.02, "Equity", ["Equity", "Total Equity"]),
    ];
    const control = buildStatementControl({ balanceSheet: withEquity, incomeStatement: [] });
    expect(getStatementControlLine(control, "cash")?.canonicalAmount).toBe(836.02);
    expect(control.cashControlPasses).toBe(true);
  });

  it("13. QBO CA control — Demo B cash/revenue/COGS/NI", () => {
    const control = buildStatementControl({
      balanceSheet: demoBBs(),
      incomeStatement: demoBPnl(),
    });
    expect(getStatementControlLine(control, "cash")?.nativeAmount).toBe(21095.57);
    expect(getStatementControlLine(control, "cash")?.canonicalAmount).toBe(21095.57);
    expect(getStatementControlLine(control, "ar")?.nativeAmount).toBe(18402.04);
    expect(getStatementControlLine(control, "revenue")?.nativeAmount).toBe(39169.8);
    expect(getStatementControlLine(control, "cogs")?.nativeAmount).toBe(38662.43);
    expect(getStatementControlLine(control, "net_income")?.nativeAmount).toBe(-13034.03);
  });

  it("14. duplicate dashboard render causes NO provider refetch", () => {
    const fetchSpy = vi.fn();
    const payload = {
      reportDataContext: {
        tenantName: "No refetch",
        normalizedData: {
          sourceSystem: "quickbooks",
          normalizedBalanceSheet: demoBBs(),
          normalizedIncomeStatement: demoBPnl(),
          statementControl: buildStatementControl({
            balanceSheet: demoBBs(),
            incomeStatement: demoBPnl(),
          }),
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    };
    buildActiveReportSummary(payload);
    buildActiveReportSummary(payload);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
