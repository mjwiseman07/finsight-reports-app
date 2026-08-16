import { describe, expect, it } from "vitest";
import {
  extractNativeCashTotal,
  extractNativeTotalsFromQuickBooksRaw,
  flattenQuickBooksRawReportRows,
  isQuickBooksProfitAndLossStub,
} from "@/lib/integrations/accounting/native-statement-totals";
import {
  buildCanonicalStatementFactsFromNormalized,
  buildStatementControl,
  STATEMENT_CONTROL_CONTRACT_VERSION,
  getStatementControlLine,
} from "@/lib/integrations/accounting/statement-control";
import { buildActiveReportSummary } from "@/lib/integrations/accounting/active-report-summary";
import { resolveCashTileState, resolveNetMarginTileState } from "@/components/dashboard/Scorecard";
import type { CanonicalBalanceSheetRow, CanonicalPnLRow } from "@/lib/integrations/accounting/types";

/** Exact raw CA Balance Sheet cash shape from Demo B live diagnosis. */
function demoBCaCashRawRows() {
  return [
    {
      type: "Section",
      Header: { ColData: [{ value: "Cash and Cash Equivalent" }, { value: "" }] },
      Rows: {
        Row: [{ type: "Data", ColData: [{ value: "Chequing" }, { value: "21095.57" }] }],
      },
      Summary: { ColData: [{ value: "Total Cash and Cash Equivalent" }, { value: "21095.57" }] },
    },
    { type: "Data", ColData: [{ value: "Accounts Receivable" }, { value: "18402.04" }] },
    { type: "Data", ColData: [{ value: "Total Assets" }, { value: "49662.89" }] },
  ];
}

/** Exact July period P&L stub from Demo B live diagnosis. */
function demoBJulyPnLStubRows() {
  return [{ type: "NetIncome", ColData: [{ value: "PROFIT" }] }];
}

function demoBEnvelope(pnlRows: unknown = demoBJulyPnLStubRows()) {
  return {
    start_date: "2026-07-01",
    end_date: "2026-07-31",
    reports: {
      balanceSheet: { ok: true, data: { Rows: { Row: demoBCaCashRawRows() } } },
      profitAndLoss: { ok: true, data: { Rows: { Row: pnlRows } } },
    },
  };
}

function bs(label: string, amount: number, section: string, path: string[]): CanonicalBalanceSheetRow {
  return {
    label,
    amount,
    section,
    source: {
      provider: "quickbooks",
      providerFamily: "quickbooks",
      providerProduct: "quickbooks",
      sourceReport: "BalanceSheet",
      raw: { __advisacorHierarchyPath: path, __advisacorSourceSection: section },
    },
  };
}

describe("QBO CA native cash acceptance repair", () => {
  it("exact raw CA cash failure shape: empty header must not win over summary total", () => {
    const flat = flattenQuickBooksRawReportRows(demoBCaCashRawRows());
    const header = flat.find((row) => row.role === "header" && /cash and cash equivalent/i.test(row.label));
    const summary = flat.find((row) => row.role === "summary" && /total cash and cash equivalent/i.test(row.label));
    expect(header?.hasAmount).toBe(false);
    expect(header?.amount).toBeNull();
    expect(summary?.hasAmount).toBe(true);
    expect(summary?.amount).toBe(21095.57);
    expect(extractNativeCashTotal(flat)).toBe(21095.57);
  });

  it("native CA cash fixture: cash = 21095.57 from raw envelope", () => {
    const native = extractNativeTotalsFromQuickBooksRaw(demoBEnvelope())!;
    expect(native.cash).toBe(21095.57);
    expect(native.ar).toBe(18402.04);
    expect(native.totalAssets).toBe(49662.89);
  });

  it("cash precedence: summary total preferred over leaf sum when both exist", () => {
    const flat = flattenQuickBooksRawReportRows(demoBCaCashRawRows());
    expect(extractNativeCashTotal(flat)).toBe(21095.57);
  });

  it("cash precedence: leaf sum used when only Chequing present", () => {
    const flat = flattenQuickBooksRawReportRows([
      {
        type: "Section",
        Header: { ColData: [{ value: "BankAccounts" }, { value: "" }] },
        Rows: {
          Row: [{ type: "Data", ColData: [{ value: "Chequing" }, { value: "21095.57" }] }],
        },
      },
    ]);
    expect(extractNativeCashTotal(flat)).toBe(21095.57);
  });

  it("corrupted canonical cash fails while native remains 21095.57", () => {
    const native = extractNativeTotalsFromQuickBooksRaw(demoBEnvelope())!;
    const balanceSheet = [
      bs("Chequing", 1, "Bank Accounts", ["Assets", "Bank Accounts", "Chequing"]),
      bs("Total Assets", 49662.89, "Assets", ["Assets", "Total Assets"]),
      bs("Total Liabilities", 23231.43, "Liabilities", ["Liabilities", "Total Liabilities"]),
      bs("Total Equity", 26431.46, "Equity", ["Equity", "Total Equity"]),
    ];
    const control = buildStatementControl({
      native,
      canonical: buildCanonicalStatementFactsFromNormalized({ balanceSheet, incomeStatement: [] }),
    });
    expect(getStatementControlLine(control, "cash")?.nativeAmount).toBe(21095.57);
    expect(getStatementControlLine(control, "cash")?.canonicalAmount).toBe(1);
    expect(getStatementControlLine(control, "cash")?.status).toBe("fail");
    expect(control.cashControlPasses).toBe(false);
  });

  it("July P&L stub is detected and does not authorize NI = 0", () => {
    const flat = flattenQuickBooksRawReportRows(demoBJulyPnLStubRows());
    expect(isQuickBooksProfitAndLossStub(flat)).toBe(true);
    const native = extractNativeTotalsFromQuickBooksRaw(demoBEnvelope())!;
    expect(native.profitAndLossStub).toBe(true);
    expect(native.revenue).toBeNull();
    expect(native.cogs).toBeNull();
    expect(native.grossProfit).toBeNull();
    expect(native.netIncome).toBeNull();
  });

  it("fail-closed Cash UI when control fails", () => {
    const native = extractNativeTotalsFromQuickBooksRaw(demoBEnvelope())!;
    const balanceSheet = [
      bs("Chequing", 1, "Bank Accounts", ["Assets", "Bank Accounts", "Chequing"]),
      bs("Total Assets", 1, "Assets", ["Assets", "Total Assets"]),
      bs("Total Liabilities", 0, "Liabilities", ["Liabilities", "Total Liabilities"]),
      bs("Total Equity", 1, "Equity", ["Equity", "Total Equity"]),
    ];
    const control = buildStatementControl({
      native,
      canonical: buildCanonicalStatementFactsFromNormalized({ balanceSheet, incomeStatement: [] }),
    });
    const active = buildActiveReportSummary({
      reportDataContext: {
        tenantName: "CA cash fail-closed",
        normalizedData: {
          sourceSystem: "quickbooks",
          normalizedBalanceSheet: balanceSheet,
          normalizedIncomeStatement: [],
          statementControl: control,
          statementControlContractVersion: STATEMENT_CONTROL_CONTRACT_VERSION,
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    });
    expect(active?.cashReady).toBe(false);
    expect(resolveCashTileState({ hydrationActive: false, summary: active }).status).toBe("unavailable");
  });

  it("fail-closed NPM/OGM UI when July P&L stub leaves controls unavailable", () => {
    const native = extractNativeTotalsFromQuickBooksRaw(demoBEnvelope())!;
    const balanceSheet = [
      bs("Chequing", 21095.57, "Bank Accounts", ["Assets", "Bank Accounts", "Chequing"]),
      bs("Total Assets", 49662.89, "Assets", ["Assets", "Total Assets"]),
      bs("Total Liabilities", 23231.43, "Liabilities", ["Liabilities", "Total Liabilities"]),
      bs("Total Equity", 26431.46, "Equity", ["Equity", "Total Equity"]),
    ];
    const incomeStatement: CanonicalPnLRow[] = [
      {
        label: "Net Income",
        amount: 0,
        section: "Net Income",
        source: {
          provider: "quickbooks",
          providerFamily: "quickbooks",
          providerProduct: "quickbooks",
          sourceReport: "ProfitAndLoss",
          raw: {},
        },
      },
    ];
    const control = buildStatementControl({
      native,
      canonical: buildCanonicalStatementFactsFromNormalized({ balanceSheet, incomeStatement }),
    });
    expect(control.netProfitMarginControlPasses).toBe(false);
    expect(control.operatingGrossMarginControlPasses).toBe(false);
    const active = buildActiveReportSummary({
      reportDataContext: {
        tenantName: "July stub",
        normalizedData: {
          sourceSystem: "quickbooks",
          normalizedBalanceSheet: balanceSheet,
          normalizedIncomeStatement: incomeStatement,
          statementControl: control,
          statementControlContractVersion: STATEMENT_CONTROL_CONTRACT_VERSION,
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    });
    expect(active?.netProfitMarginReady).toBe(false);
    expect(active?.operatingGrossMarginReady).toBe(false);
    expect(resolveNetMarginTileState({ hydrationActive: false, summary: active }).state.status).toBe(
      "unavailable",
    );
  });
});

describe("QBO US native cash (Bank Accounts)", () => {
  it("Total Bank Accounts summary ties", () => {
    const native = extractNativeTotalsFromQuickBooksRaw({
      reports: {
        balanceSheet: {
          ok: true,
          data: {
            Rows: {
              Row: [
                {
                  group: "BankAccounts",
                  Header: { ColData: [{ value: "BankAccounts" }, { value: "" }] },
                  Rows: {
                    Row: [
                      { ColData: [{ value: "Checking" }, { value: "36.02" }] },
                      { ColData: [{ value: "Savings" }, { value: "800.00" }] },
                    ],
                  },
                  Summary: { ColData: [{ value: "Total Bank Accounts" }, { value: "836.02" }] },
                },
              ],
            },
          },
        },
        profitAndLoss: { ok: true, data: { Rows: { Row: [] } } },
      },
    })!;
    expect(native.cash).toBe(836.02);
  });
});
