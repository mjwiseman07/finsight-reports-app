import { describe, expect, it } from "vitest";
import {
  asReportRowArray,
  assessPeriodIncomeStatementEvidence,
  isPeriodIncomeStatementComplete,
  normalizeQuickBooksFinancialStatement,
  buildMappedFinancialSummary,
} from "@/lib/integrations/accounting/normalizers/financial-statements";
import {
  humanizeQuickBooksReportToken,
  humanizeQuickBooksPnLLabel,
} from "@/lib/integrations/accounting/normalizers/qbo-report-tokens";
import {
  buildActiveReportSummary,
  resolveCashPositionFromBalanceSheet,
  sumCashFromBalanceSheet,
} from "@/lib/integrations/accounting/active-report-summary";
import { toScorecardCapabilityContract } from "@/lib/integrations/accounting/provider-capability-contract";
import { resolveCashTileState, resolveNetMarginTileState } from "@/components/dashboard/Scorecard";
import { factorizeOperatingGrossMargin } from "@/lib/scorecard/operating-gross-margin";
import type { CanonicalBalanceSheetRow, CanonicalPnLRow, CanonicalSourceMetadata } from "@/lib/integrations/accounting/types";
import { quickBooksAccountingProvider } from "@/lib/integrations/quickbooks/provider";
import { xeroAccountingProvider } from "@/lib/integrations/xero/provider";

function qboSource(raw: Record<string, unknown> = {}): CanonicalSourceMetadata {
  return {
    provider: "quickbooks",
    providerFamily: "quickbooks",
    providerProduct: "quickbooks",
    sourceReport: "BalanceSheet",
    raw,
  };
}

function xeroSource(raw: Record<string, unknown> = {}): CanonicalSourceMetadata {
  return {
    provider: "xero",
    providerFamily: "xero",
    providerProduct: "xero",
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
    source: (provider === "xero" ? xeroSource : qboSource)({
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

describe("QBO report token humanization", () => {
  it("maps BankAccounts and TotalAssets to Xero-compatible sections", () => {
    expect(humanizeQuickBooksReportToken("BankAccounts")).toBe("Bank Accounts");
    expect(humanizeQuickBooksReportToken("TotalAssets")).toBe("Assets");
    expect(humanizeQuickBooksReportToken("OtherCurrentAssets")).toBe("Other Current Assets");
    expect(humanizeQuickBooksReportToken("Chequing")).toBe("Chequing");
  });

  it("maps CA PROFIT stub under Net Income to Net Income label", () => {
    expect(humanizeQuickBooksPnLLabel("PROFIT", "Net Income")).toBe("Net Income");
    expect(humanizeQuickBooksPnLLabel("Sales", "Income")).toBe("Sales");
  });
});

describe("QBO period P&L row flatten + evidence model", () => {
  it("coerces a single Row object into an array", () => {
    expect(asReportRowArray({ ColData: [{ value: "Sales" }] })).toHaveLength(1);
    expect(asReportRowArray([{ ColData: [{ value: "A" }] }, { ColData: [{ value: "B" }] }])).toHaveLength(2);
  });

  it("flattens nested single-object Rows that QBO CA may emit", () => {
    const rows = normalizeQuickBooksFinancialStatement("ProfitAndLoss", [
      {
        group: "Income",
        Header: { ColData: [{ value: "Income" }] },
        Rows: {
          Row: {
            ColData: [{ value: "Sales" }, { value: "100.00" }],
          },
        },
        Summary: { ColData: [{ value: "Total Income" }, { value: "100.00" }] },
      },
    ]);
    expect(rows.some((row) => row.label === "Sales" && row.amount === 100)).toBe(true);
    expect(rows.some((row) => /^total income$/i.test(row.label) && row.amount === 100)).toBe(true);
    // Revenue alone is NOT complete for NPM.
    expect(isPeriodIncomeStatementComplete(rows)).toBe(false);
    expect(assessPeriodIncomeStatementEvidence(rows).hasRevenueEvidence).toBe(true);
    expect(assessPeriodIncomeStatementEvidence(rows).operatingGrossMarginReady).toBe(false);
    expect(assessPeriodIncomeStatementEvidence(rows).netProfitMarginReady).toBe(false);
  });

  it("treats Net Income stub alone as incomplete", () => {
    const evidence = assessPeriodIncomeStatementEvidence([
      pnl("Net Income", 0, "Net Income"),
    ]);
    expect(evidence.hasRevenueEvidence).toBe(false);
    expect(evidence.netProfitMarginReady).toBe(false);
    expect(isPeriodIncomeStatementComplete([pnl("Net Income", 0, "Net Income")])).toBe(false);
  });

  it("rejects revenue-only as NPM/OGM incomplete (partial revenue-only)", () => {
    const rows = [
      pnl("Total Income", 39169.8, "Income"),
      pnl("Sales", 3500, "Income"),
    ];
    const evidence = assessPeriodIncomeStatementEvidence(rows);
    expect(evidence.hasRevenueEvidence).toBe(true);
    expect(evidence.operatingGrossMarginReady).toBe(false);
    expect(evidence.netProfitMarginReady).toBe(false);
    expect(evidence.netIncomeEvidencePath).toBe("none");

    const active = buildActiveReportSummary({
      reportDataContext: {
        tenantName: "Partial",
        normalizedData: {
          sourceSystem: "quickbooks",
          normalizedIncomeStatement: rows,
          normalizedBalanceSheet: [],
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    });
    expect(active?.hasRevenueEvidence).toBe(true);
    expect(active?.revenue).toBeCloseTo(39169.8, 2);
    expect(active?.netProfitMarginEvidenceReady).toBe(false);
    expect(active?.operatingGrossMarginEvidenceReady).toBe(false);
    expect(active?.netIncome).toBe(0);
    expect(resolveNetMarginTileState({ hydrationActive: false, summary: active }).state.status).toBe(
      "unavailable",
    );
    expect(factorizeOperatingGrossMargin(active).status).toBe("unavailable");
  });

  it("accepts Path A — revenue + explicit Net Income (revenue+NI)", () => {
    const rows = [
      pnl("Total Income", 39169.8, "Income"),
      pnl("Net Income", -13034.03, "Net Income"),
    ];
    const evidence = assessPeriodIncomeStatementEvidence(rows);
    expect(evidence.operatingGrossMarginReady).toBe(false);
    expect(evidence.netProfitMarginReady).toBe(true);
    expect(evidence.netIncomeEvidencePath).toBe("explicit_totals");

    const active = buildActiveReportSummary({
      reportDataContext: {
        tenantName: "Path A",
        normalizedData: {
          sourceSystem: "quickbooks",
          normalizedIncomeStatement: rows,
          normalizedBalanceSheet: [],
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    });
    expect(active?.netProfitMarginEvidenceReady).toBe(true);
    expect(active?.netIncome).toBeCloseTo(-13034.03, 2);
    expect(active?.operatingGrossMarginEvidenceReady).toBe(false);
    expect(resolveNetMarginTileState({ hydrationActive: false, summary: active }).state.status).toBe(
      "ready",
    );
    expect(factorizeOperatingGrossMargin(active).status).toBe("unavailable");
  });

  it("accepts OGM from revenue+COGS but still blocks NPM without expenses/NI", () => {
    const rows = [
      pnl("Total Income", 39169.8, "Income"),
      pnl("Total Cost of Goods Sold", 38662.43, "Cost of Sales"),
    ];
    const evidence = assessPeriodIncomeStatementEvidence(rows);
    expect(evidence.operatingGrossMarginReady).toBe(true);
    expect(evidence.netProfitMarginReady).toBe(false);
    expect(evidence.netIncomeEvidencePath).toBe("none");

    const active = buildActiveReportSummary({
      reportDataContext: {
        tenantName: "Revenue+COGS",
        normalizedData: {
          sourceSystem: "quickbooks",
          normalizedIncomeStatement: rows,
          normalizedBalanceSheet: [],
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    });
    expect(active?.operatingGrossMarginEvidenceReady).toBe(true);
    expect(active?.grossProfitSupported).toBe(true);
    expect(active?.netProfitMarginEvidenceReady).toBe(false);
    expect(factorizeOperatingGrossMargin(active).status).toBe("ready");
    expect(resolveNetMarginTileState({ hydrationActive: false, summary: active }).state.status).toBe(
      "unavailable",
    );
  });

  it("accepts Path B reconstructable statement (revenue+COGS+expenses)", () => {
    const rows = [
      pnl("Total Income", 39169.8, "Income"),
      pnl("Total Cost of Goods Sold", 38662.43, "Cost of Sales"),
      pnl("Total Expenses", 13541.4, "Expenses"),
    ];
    const evidence = assessPeriodIncomeStatementEvidence(rows);
    expect(evidence.netProfitMarginReady).toBe(true);
    expect(evidence.netIncomeEvidencePath).toBe("reconstructable");
    expect(evidence.operatingGrossMarginReady).toBe(true);
  });
});

describe("cash missing-vs-zero", () => {
  it("returns SOURCE_MISSING when BS has no cash/bank evidence (not 0)", () => {
    const rows = [
      bs("Accounts Receivable", 18402.04, "Accounts Receivable", [
        "Assets",
        "Current Assets",
        "Accounts Receivable",
      ]),
    ];
    const resolved = resolveCashPositionFromBalanceSheet(rows);
    expect(resolved).toEqual({ status: "SOURCE_MISSING", amount: null });
    expect(sumCashFromBalanceSheet(rows)).toBe(0);
  });

  it("returns VALUE_ZERO when eligible cash leaf is truly 0", () => {
    const rows = [
      bs("Checking", 0, "Bank Accounts", ["Assets", "Current Assets", "Bank Accounts", "Checking"]),
    ];
    expect(resolveCashPositionFromBalanceSheet(rows)).toEqual({
      status: "VALUE_ZERO",
      amount: 0,
    });
  });

  it("Scorecard cash tile is unavailable on SOURCE_MISSING", () => {
    const state = resolveCashTileState({
      hydrationActive: false,
      summary: {
        revenue: 0,
        expenses: 0,
        netIncome: 0,
        assets: 100,
        liabilities: 0,
        cash: null,
        cashStatus: "SOURCE_MISSING",
        incomeStatementComplete: false,
      },
    });
    expect(state.status).toBe("unavailable");
  });
});

describe("QBO CA control fixtures (adapter → shared KPI)", () => {
  it("normalizes CA Chequing under BankAccounts into cash 21095.57", () => {
    const normalized = normalizeQuickBooksFinancialStatement("BalanceSheet", [
      {
        group: "BankAccounts",
        Header: { ColData: [{ value: "BankAccounts" }] },
        Rows: {
          Row: [
            {
              ColData: [{ value: "Chequing" }, { value: "21095.57" }],
            },
          ],
        },
        Summary: {
          ColData: [{ value: "Total Cash and Cash Equivalent" }, { value: "21095.57" }],
        },
      },
    ], "9341457539236929");

    const chequing = normalized.find((row) => row.label === "Chequing");
    expect(chequing?.section).toBe("Bank Accounts");
    expect(chequing?.amount).toBe(21095.57);

    const path = (chequing?.source?.raw as { __advisacorHierarchyPath?: string[] } | undefined)
      ?.__advisacorHierarchyPath;
    expect(path?.some((part) => /bank accounts/i.test(part))).toBe(true);

    const cash = resolveCashPositionFromBalanceSheet(normalized as CanonicalBalanceSheetRow[]);
    expect(cash.status).toBe("VALUE_NONZERO");
    expect(cash.amount).toBe(21095.57);
  });

  it("maps CA period P&L control totals into shared margin math", () => {
    const income = normalizeQuickBooksFinancialStatement("ProfitAndLoss", [
      {
        group: "Income",
        Header: { ColData: [{ value: "Income" }] },
        Rows: {
          Row: [
            { ColData: [{ value: "Sales of Product Income" }, { value: "19050.00" }] },
            { ColData: [{ value: "Services" }, { value: "3600.00" }] },
            { ColData: [{ value: "Billable Expenses Income" }, { value: "10610.25" }] },
            { ColData: [{ value: "Markup" }, { value: "2409.55" }] },
            { ColData: [{ value: "Sales" }, { value: "3500.00" }] },
          ],
        },
        Summary: { ColData: [{ value: "Total Income" }, { value: "39169.80" }] },
      },
      {
        group: "COGS",
        Header: { ColData: [{ value: "COGS" }] },
        Rows: {
          Row: [
            { ColData: [{ value: "Cost of Goods Sold" }, { value: "9664.68" }] },
            { ColData: [{ value: "Cost of Sales - billable expenses" }, { value: "28997.75" }] },
          ],
        },
        Summary: { ColData: [{ value: "Total Cost of Goods Sold" }, { value: "38662.43" }] },
      },
      {
        group: "Expenses",
        Header: { ColData: [{ value: "Expenses" }] },
        Rows: {
          Row: [{ ColData: [{ value: "Rent Expense" }, { value: "8750.00" }] }],
        },
        Summary: { ColData: [{ value: "Total Expenses" }, { value: "13541.40" }] },
      },
      {
        group: "NetIncome",
        Header: { ColData: [{ value: "NetIncome" }] },
        Rows: {
          Row: { ColData: [{ value: "PROFIT" }, { value: "-13034.03" }] },
        },
      },
    ]) as CanonicalPnLRow[];

    expect(isPeriodIncomeStatementComplete(income)).toBe(true);
    const summary = buildMappedFinancialSummary([], income);
    expect(summary.revenue).toBeCloseTo(39169.8, 2);
    expect(summary.cogs).toBeCloseTo(38662.43, 2);
    expect(summary.netIncome).toBeCloseTo(-13034.03, 2);
    expect(summary.grossProfit).toBeCloseTo(39169.8 - 38662.43, 2);

    const npm = summary.netIncome / summary.revenue;
    const gm = summary.grossProfit / summary.revenue;
    expect(npm).toBeCloseTo(-0.3328, 3);
    expect(gm).toBeCloseTo(0.013, 3);

    const active = buildActiveReportSummary({
      reportDataContext: {
        tenantName: "Sandbox Company CA b483",
        normalizedData: {
          sourceSystem: "quickbooks",
          normalizedIncomeStatement: income,
          normalizedBalanceSheet: [
            bs("Chequing", 21095.57, "Bank Accounts", [
              "Assets",
              "Other Current Assets",
              "Bank Accounts",
              "Chequing",
            ]),
            bs("Total Cash and Cash Equivalent", 21095.57, "Bank Accounts", [
              "Assets",
              "Other Current Assets",
              "Bank Accounts",
              "Total Cash and Cash Equivalent",
            ]),
          ],
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    });
    expect(active?.cash).toBe(21095.57);
    expect(active?.cashStatus).toBe("VALUE_NONZERO");
    expect(active?.incomeStatementComplete).toBe(true);
    expect(active?.netProfitMarginEvidenceReady).toBe(true);
    expect(active?.operatingGrossMarginEvidenceReady).toBe(true);
    expect(active?.netIncomeEvidencePath).toBe("explicit_totals");
    expect(active?.revenue).toBeCloseTo(39169.8, 2);

    const margin = resolveNetMarginTileState({ hydrationActive: false, summary: active });
    expect(margin.state.status).toBe("ready");
    expect(factorizeOperatingGrossMargin(active).status).toBe("ready");
  });
});

describe("QBO US fixtures", () => {
  it("normalizes Checking under BankAccounts into cash", () => {
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
    ]);
    const cash = resolveCashPositionFromBalanceSheet(normalized as CanonicalBalanceSheetRow[]);
    expect(cash.amount).toBe(836.02);
    expect(normalized.find((row) => row.label === "Checking")?.section).toBe("Bank Accounts");
  });
});

describe("Xero regression control", () => {
  it("still resolves cash from Cash and Cash Equivalents", () => {
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
    ];
    expect(resolveCashPositionFromBalanceSheet(rows)).toEqual({
      status: "VALUE_NONZERO",
      amount: 4540.98,
    });
  });

  it("keeps Xero CF capability not_supported", () => {
    const contract = toScorecardCapabilityContract({
      provider: "xero",
      capabilities: xeroAccountingProvider.getCapabilities(),
    });
    expect(contract.cashFlow).toBe(false);
    expect(contract.profitAndLoss).toBe(true);
    expect(contract.balanceSheet).toBe(true);
  });
});

describe("cross-provider canonical-fact KPI parity", () => {
  it("produces identical margin math for identical canonical PnL facts", () => {
    const facts = [
      pnl("Total Income", 39169.8, "Income", "xero"),
      pnl("Total Cost of Goods Sold", 38662.43, "Cost of Sales", "xero"),
      pnl("Total Expenses", 13541.4, "Expenses", "xero"),
      pnl("Net Income", -13034.03, "Net Income", "xero"),
    ];
    const fromXero = buildMappedFinancialSummary([], facts);
    const fromQbo = buildMappedFinancialSummary(
      [],
      facts.map((row) => ({
        ...row,
        source: { ...row.source, provider: "quickbooks", providerFamily: "quickbooks", providerProduct: "quickbooks" },
      })),
    );
    expect(fromQbo.revenue).toBe(fromXero.revenue);
    expect(fromQbo.cogs).toBe(fromXero.cogs);
    expect(fromQbo.netIncome).toBe(fromXero.netIncome);
    expect(fromQbo.grossProfit).toBe(fromXero.grossProfit);
  });
});

describe("capability contract", () => {
  it("marks QBO cash flow supported and Xero unsupported without changing math", () => {
    const qbo = toScorecardCapabilityContract({
      provider: "quickbooks",
      capabilities: quickBooksAccountingProvider.getCapabilities(),
    });
    expect(qbo.cashFlow).toBe(true);
    expect(qbo.arAging).toBe(true);
  });
});
