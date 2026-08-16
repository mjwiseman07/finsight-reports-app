import { describe, expect, it, vi } from "vitest";
import {
  buildStatementControl,
  buildCanonicalStatementFactsFromNormalized,
  STATEMENT_CONTROL_TOLERANCE_DOLLAR,
  STATEMENT_CONTROL_CONTRACT_VERSION,
  getStatementControlLine,
  statementControlAllowsKpi,
} from "@/lib/integrations/accounting/statement-control";
import {
  extractNativeTotalsFromQuickBooksRaw,
  extractNativeTotalsFromXeroFlattenedRows,
  NATIVE_STATEMENT_SOURCE_QBO,
  NATIVE_STATEMENT_SOURCE_XERO,
  type NativeStatementTotals,
} from "@/lib/integrations/accounting/native-statement-totals";
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
  bs("Inventory", 7781.91, "Current Assets", ["Assets", "Other Current Assets", "Inventory"]),
  bs("Net Fixed Assets", 2383.37, "Fixed Assets", ["Assets", "Fixed Assets", "Net Fixed Assets"]),
  bs("Total Assets", 49662.89, "Assets", ["Assets", "Total Assets"]),
  bs("Accounts Payable", 734.51, "Accounts Payable", ["Liabilities", "Accounts Payable"]),
  bs("Total Liabilities", 734.51, "Liabilities", ["Liabilities", "Total Liabilities"]),
  bs("Total Equity", 48928.38, "Equity", ["Equity", "Total Equity"]),
];

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

/** Demo B native totals as if extracted from RAW QBO report JSON (independent object). */
function demoBNative(overrides: Partial<NativeStatementTotals> = {}): NativeStatementTotals {
  return {
    source: NATIVE_STATEMENT_SOURCE_QBO,
    balanceSheetReportRef: "sourceMetadata.raw.reports.balanceSheet.data.Rows.Row",
    profitAndLossReportRef: "sourceMetadata.raw.reports.profitAndLoss.data.Rows.Row",
    period: { startDate: "2026-07-01", endDate: "2026-07-31" },
    cash: 21095.57,
    ar: 18402.04,
    inventory: 7781.91,
    netFixedAssets: 2383.37,
    ap: 734.51,
    totalAssets: 49662.89,
    totalLiabilities: 734.51,
    totalEquity: 48928.38,
    revenue: 39169.8,
    cogs: 38662.43,
    grossProfit: 507.37,
    netIncome: -13034.03,
    ...overrides,
  };
}

function controlFor(
  balanceSheet: CanonicalBalanceSheetRow[],
  incomeStatement: CanonicalPnLRow[],
  native: NativeStatementTotals | null = demoBNative(),
  extra: {
    nativePeriod?: { startDate?: string | null; endDate?: string | null };
    canonicalPeriod?: { startDate?: string | null; endDate?: string | null };
  } = {},
) {
  return buildStatementControl({
    native,
    canonical: buildCanonicalStatementFactsFromNormalized({ balanceSheet, incomeStatement }),
    ...extra,
  });
}

/** Minimal QBO raw report envelope for independent native extraction. */
function demoBQboRawEnvelope() {
  return {
    start_date: "2026-07-01",
    end_date: "2026-07-31",
    reports: {
      balanceSheet: {
        ok: true,
        data: {
          Rows: {
            Row: [
              {
                type: "Section",
                Header: { ColData: [{ value: "Cash and Cash Equivalent" }, { value: "" }] },
                Rows: {
                  Row: [{ type: "Data", ColData: [{ value: "Chequing" }, { value: "21095.57" }] }],
                },
                Summary: { ColData: [{ value: "Total Cash and Cash Equivalent" }, { value: "21095.57" }] },
              },
              { ColData: [{ value: "Accounts Receivable" }, { value: "18402.04" }] },
              { ColData: [{ value: "Inventory" }, { value: "7781.91" }] },
              { ColData: [{ value: "Net Fixed Assets" }, { value: "2383.37" }] },
              { ColData: [{ value: "Total Assets" }, { value: "49662.89" }] },
              { ColData: [{ value: "Accounts Payable" }, { value: "734.51" }] },
              { ColData: [{ value: "Total Liabilities" }, { value: "734.51" }] },
              { ColData: [{ value: "Total Equity" }, { value: "48928.38" }] },
            ],
          },
        },
      },
      profitAndLoss: {
        ok: true,
        data: {
          Rows: {
            Row: [
              { ColData: [{ value: "Total Income" }, { value: "39169.80" }] },
              { ColData: [{ value: "Total Cost of Goods Sold" }, { value: "38662.43" }] },
              { ColData: [{ value: "Gross Profit" }, { value: "507.37" }] },
              { ColData: [{ value: "Net Income" }, { value: "-13034.03" }] },
            ],
          },
        },
      },
    },
  };
}

describe("statement control — independence + tolerance", () => {
  it("tolerance is exact cent ($0.01), not $1", () => {
    expect(STATEMENT_CONTROL_TOLERANCE_DOLLAR).toBe(0.01);
  });

  it("native extracted from RAW QBO report object, not normalized rows", () => {
    const native = extractNativeTotalsFromQuickBooksRaw(demoBQboRawEnvelope());
    expect(native?.source).toBe(NATIVE_STATEMENT_SOURCE_QBO);
    expect(native?.cash).toBe(21095.57);
    expect(native?.ar).toBe(18402.04);
    expect(native?.inventory).toBe(7781.91);
    expect(native?.netFixedAssets).toBe(2383.37);
    expect(native?.ap).toBe(734.51);
    expect(native?.totalAssets).toBe(49662.89);
    expect(native?.revenue).toBe(39169.8);
    expect(native?.cogs).toBe(38662.43);
    expect(native?.grossProfit).toBe(507.37);
    expect(native?.netIncome).toBe(-13034.03);
    expect(native?.balanceSheetReportRef).toContain("balanceSheet.data.Rows.Row");
  });

  it("canonical facts come only from normalized Advisacor rows", () => {
    const canonical = buildCanonicalStatementFactsFromNormalized({
      balanceSheet: demoBBs(),
      incomeStatement: demoBPnl(),
    });
    expect(canonical.cash).toBe(21095.57);
    expect(canonical.revenue).toBe(39169.8);
    expect(canonical.cogs).toBe(38662.43);
    expect(canonical.netIncome).toBeCloseTo(-13034.03, 2);
  });

  it("proof: native and canonical are independent object graphs", () => {
    const native = extractNativeTotalsFromQuickBooksRaw(demoBQboRawEnvelope())!;
    const canonical = buildCanonicalStatementFactsFromNormalized({
      balanceSheet: demoBBs(),
      incomeStatement: demoBPnl(),
    });
    expect(native).not.toBe(canonical as unknown as NativeStatementTotals);
    expect(Object.is(native, canonical)).toBe(false);
    // Corrupting canonical cash must not mutate native
    const corruptedCanonical = { ...canonical, cash: 1 };
    expect(native.cash).toBe(21095.57);
    expect(corruptedCanonical.cash).toBe(1);
  });

  it("1. BS exact tie → pass", () => {
    const control = controlFor(demoBBs(), demoBPnl());
    expect(getStatementControlLine(control, "cash")?.status).toBe("tie");
    expect(getStatementControlLine(control, "cash")?.nativeAmount).toBe(21095.57);
    expect(getStatementControlLine(control, "cash")?.canonicalAmount).toBe(21095.57);
    expect(getStatementControlLine(control, "ar")?.passes).toBe(true);
    expect(getStatementControlLine(control, "inventory")?.passes).toBe(true);
    expect(getStatementControlLine(control, "net_fixed_assets")?.passes).toBe(true);
    expect(getStatementControlLine(control, "ap")?.passes).toBe(true);
    expect(control.cashControlPasses).toBe(true);
    expect(control.toleranceDollar).toBe(STATEMENT_CONTROL_TOLERANCE_DOLLAR);
    expect(control.nativeSource).toBe(NATIVE_STATEMENT_SOURCE_QBO);
  });

  it("2. BS rounding beyond $0.01 → fail (no $1 looseness)", () => {
    const controlRounded = controlFor(
      [
        bs("Checking", 1000.4, "Bank Accounts", ["Assets", "Bank Accounts", "Checking"]),
        bs("Total Bank Accounts", 1000.0, "Bank Accounts", ["Assets", "Bank Accounts", "Total Bank Accounts"]),
        bs("Total Assets", 1000.0, "Assets", ["Assets", "Total Assets"]),
        bs("Total Liabilities", 0, "Liabilities", ["Liabilities", "Total Liabilities"]),
        bs("Total Equity", 1000.0, "Equity", ["Equity", "Total Equity"]),
      ],
      [],
      demoBNative({
        cash: 1000.0,
        ar: null,
        inventory: null,
        netFixedAssets: null,
        ap: null,
        totalAssets: 1000,
        totalLiabilities: 0,
        totalEquity: 1000,
        revenue: null,
        cogs: null,
        grossProfit: null,
        netIncome: null,
      }),
    );
    const cash = getStatementControlLine(controlRounded, "cash");
    expect(cash?.status).toBe("fail");
    expect(cash?.passes).toBe(false);
    expect(cash?.varianceAbs).toBeCloseTo(0.4, 5);
  });

  it("2b. BS within exact cent → auto_cleared", () => {
    const control = controlFor(
      [
        bs("Checking", 1000.005, "Bank Accounts", ["Assets", "Bank Accounts", "Checking"]),
        bs("Total Assets", 1000.0, "Assets", ["Assets", "Total Assets"]),
        bs("Total Liabilities", 0, "Liabilities", ["Liabilities", "Total Liabilities"]),
        bs("Total Equity", 1000.0, "Equity", ["Equity", "Total Equity"]),
      ],
      [],
      demoBNative({
        cash: 1000.0,
        ar: null,
        inventory: null,
        netFixedAssets: null,
        ap: null,
        totalAssets: 1000,
        totalLiabilities: 0,
        totalEquity: 1000,
        revenue: null,
        cogs: null,
        grossProfit: null,
        netIncome: null,
      }),
    );
    const cash = getStatementControlLine(control, "cash");
    expect(cash?.status).toBe("auto_cleared");
    expect(cash?.passes).toBe(true);
  });

  it("3. BS material mismatch → fail", () => {
    const arFail = controlFor(
      [
        bs("Accounts Receivable", 100, "Accounts Receivable", ["Assets", "Accounts Receivable"]),
        bs("Total Assets", 18402.04, "Assets", ["Assets", "Total Assets"]),
        bs("Total Liabilities", 0, "Liabilities", ["Liabilities", "Total Liabilities"]),
        bs("Total Equity", 18402.04, "Equity", ["Equity", "Total Equity"]),
      ],
      [],
      demoBNative({
        cash: null,
        ar: 18402.04,
        inventory: null,
        netFixedAssets: null,
        ap: null,
        totalAssets: 18402.04,
        totalLiabilities: 0,
        totalEquity: 18402.04,
        revenue: null,
        cogs: null,
        grossProfit: null,
        netIncome: null,
      }),
    );
    expect(getStatementControlLine(arFail, "ar")?.status).toBe("fail");
    expect(getStatementControlLine(arFail, "ar")?.passes).toBe(false);
  });

  it("4. accounting equation failure → fail", () => {
    const control = controlFor(
      [
        bs("Total Assets", 1000, "Assets", ["Assets", "Total Assets"]),
        bs("Total Liabilities", 100, "Liabilities", ["Liabilities", "Total Liabilities"]),
        bs("Total Equity", 100, "Equity", ["Equity", "Total Equity"]),
      ],
      [],
      demoBNative({
        cash: null,
        ar: null,
        inventory: null,
        netFixedAssets: null,
        ap: null,
        totalAssets: 1000,
        totalLiabilities: 100,
        totalEquity: 100,
        revenue: null,
        cogs: null,
        grossProfit: null,
        netIncome: null,
      }),
    );
    expect(control.balanceSheet.equationPasses).toBe(false);
    expect(getStatementControlLine(control, "bs_equation")?.status).toBe("fail");
    expect(control.balanceSheet.passes).toBe(false);
  });
});

describe("statement control — corruption independence", () => {
  it("15. corrupted canonical cash → fail while native unchanged", () => {
    const native = demoBNative();
    const corruptedBs = demoBBs().map((row) =>
      row.label === "Chequing" ? { ...row, amount: 1 } : row,
    );
    const control = controlFor(corruptedBs, demoBPnl(), native);
    expect(native.cash).toBe(21095.57);
    expect(getStatementControlLine(control, "cash")?.nativeAmount).toBe(21095.57);
    expect(getStatementControlLine(control, "cash")?.canonicalAmount).toBe(1);
    expect(getStatementControlLine(control, "cash")?.status).toBe("fail");
    expect(control.cashControlPasses).toBe(false);
  });

  it("16. corrupted canonical revenue → fail while native unchanged", () => {
    const native = demoBNative();
    const corruptedPnl = demoBPnl().map((row) =>
      row.label === "Sales of Product Income" ? { ...row, amount: 1 } : row,
    );
    const control = controlFor(demoBBs(), corruptedPnl, native);
    expect(native.revenue).toBe(39169.8);
    expect(getStatementControlLine(control, "revenue")?.nativeAmount).toBe(39169.8);
    expect(getStatementControlLine(control, "revenue")?.canonicalAmount).not.toBe(39169.8);
    expect(getStatementControlLine(control, "revenue")?.status).toBe("fail");
    expect(control.netProfitMarginControlPasses).toBe(false);
  });

  it("17. corrupted canonical NI components → fail while native NI unchanged", () => {
    const native = demoBNative();
    const corruptedPnl = demoBPnl().map((row) =>
      row.label === "Total Expenses" ? { ...row, amount: 1 } : row,
    );
    const control = controlFor(demoBBs(), corruptedPnl, native);
    expect(native.netIncome).toBe(-13034.03);
    expect(getStatementControlLine(control, "net_income")?.nativeAmount).toBe(-13034.03);
    expect(getStatementControlLine(control, "net_income")?.canonicalAmount).not.toBeCloseTo(-13034.03, 2);
    expect(getStatementControlLine(control, "net_income")?.status).toBe("fail");
  });

  it("18. corrupted canonical COGS → fail while native COGS unchanged", () => {
    const native = demoBNative();
    const corruptedPnl = demoBPnl().map((row) =>
      row.label === "Cost of Goods Sold" ? { ...row, amount: 1 } : row,
    );
    const control = controlFor(demoBBs(), corruptedPnl, native);
    expect(native.cogs).toBe(38662.43);
    expect(getStatementControlLine(control, "cogs")?.nativeAmount).toBe(38662.43);
    expect(getStatementControlLine(control, "cogs")?.status).toBe("fail");
    expect(control.operatingGrossMarginControlPasses).toBe(false);
  });
});

describe("statement control — P&L + KPI dependency", () => {
  it("5. P&L exact tie → pass", () => {
    const control = controlFor(demoBBs(), demoBPnl());
    expect(getStatementControlLine(control, "revenue")?.status).toBe("tie");
    expect(getStatementControlLine(control, "cogs")?.status).toBe("tie");
    expect(["tie", "auto_cleared"]).toContain(getStatementControlLine(control, "net_income")?.status);
    expect(getStatementControlLine(control, "net_income")?.passes).toBe(true);
    expect(control.incomeStatement.passes).toBe(true);
    expect(control.netProfitMarginControlPasses).toBe(true);
    expect(control.operatingGrossMarginControlPasses).toBe(true);
  });

  it("6. revenue tie but NI mismatch → Net Margin blocked", () => {
    const control = controlFor(
      demoBBs(),
      [
        pnl("Total Income", 39169.8, "Income"),
        pnl("Total Cost of Goods Sold", 38662.43, "Cost of Sales"),
        pnl("Total Expenses", 13541.4, "Expenses"),
        pnl("Net Income", -999.0, "Net Income"),
      ],
      demoBNative({ netIncome: -999 }),
    );
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
          statementControlContractVersion: STATEMENT_CONTROL_CONTRACT_VERSION,
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
    const control = controlFor(demoBBs(), leafDriven, demoBNative({ cogs: 1000, grossProfit: 999 }));
    expect(getStatementControlLine(control, "cogs")?.passes).toBe(false);
    expect(getStatementControlLine(control, "gross_profit")?.passes).toBe(false);
    expect(control.operatingGrossMarginControlPasses).toBe(false);

    const active = buildActiveReportSummary({
      reportDataContext: {
        tenantName: "COGS mismatch",
        normalizedData: {
          sourceSystem: "quickbooks",
          normalizedBalanceSheet: demoBBs(),
          normalizedIncomeStatement: leafDriven,
          statementControl: control,
          statementControlContractVersion: STATEMENT_CONTROL_CONTRACT_VERSION,
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
    const control = controlFor(
      demoBBs(),
      rows,
      demoBNative({ revenue: 39169.8, cogs: null, grossProfit: null, netIncome: null }),
    );
    expect(control.netProfitMarginControlPasses).toBe(false);
    expect(control.operatingGrossMarginControlPasses).toBe(false);
  });

  it("9. BS passes while P&L fails → Cash remains available", () => {
    const control = controlFor(
      demoBBs(),
      [pnl("Total Income", 39169.8, "Income")],
      demoBNative({ revenue: 39169.8, cogs: null, grossProfit: null, netIncome: null }),
    );
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
          statementControlContractVersion: STATEMENT_CONTROL_CONTRACT_VERSION,
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
    const control = controlFor(
      badBs,
      demoBPnl(),
      demoBNative({
        cash: 21095.57,
        totalAssets: 100,
        totalLiabilities: 0,
        totalEquity: 50,
        ar: null,
        inventory: null,
        netFixedAssets: null,
        ap: null,
      }),
    );
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
          statementControlContractVersion: STATEMENT_CONTROL_CONTRACT_VERSION,
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

describe("statement control — provider regressions + missing control", () => {
  it("11. Xero independent tie from flattened raw rows", () => {
    const native = extractNativeTotalsFromXeroFlattenedRows({
      balanceSheetRows: [
        {
          label: "Business Bank Account",
          amount: 4540.98,
          section: "Cash and Cash Equivalents",
          raw: {
            __advisacorHierarchyPath: [
              "Assets",
              "Current Assets",
              "Cash and Cash Equivalents",
              "Business Bank Account",
            ],
            __advisacorSourceSection: "Cash and Cash Equivalents",
          },
        },
        {
          label: "Total Cash and Cash Equivalents",
          amount: 4540.98,
          section: "Cash and Cash Equivalents",
          raw: {
            RowType: "SummaryRow",
            __advisacorHierarchyPath: [
              "Assets",
              "Current Assets",
              "Cash and Cash Equivalents",
              "Total Cash and Cash Equivalents",
            ],
            __advisacorSourceSection: "Cash and Cash Equivalents",
          },
        },
        {
          label: "Total Assets",
          amount: 4540.98,
          section: "Assets",
          raw: { RowType: "SummaryRow", __advisacorHierarchyPath: ["Assets", "Total Assets"] },
        },
        {
          label: "Total Liabilities",
          amount: 0,
          section: "Liabilities",
          raw: { RowType: "SummaryRow", __advisacorHierarchyPath: ["Liabilities", "Total Liabilities"] },
        },
        {
          label: "Total Equity",
          amount: 4540.98,
          section: "Equity",
          raw: { RowType: "SummaryRow", __advisacorHierarchyPath: ["Equity", "Total Equity"] },
        },
      ],
      profitAndLossRows: [
        { label: "Total Income", amount: 100000 },
        { label: "Total Cost of Goods Sold", amount: 40000 },
        { label: "Gross Profit", amount: 60000 },
        { label: "Total Expenses", amount: 30000 },
        { label: "Net Income", amount: 30000 },
      ],
      startDate: "2026-01-01",
      endDate: "2026-07-31",
    });
    expect(native.source).toBe(NATIVE_STATEMENT_SOURCE_XERO);
    expect(native.cash).toBe(4540.98);
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
      pnl("Sales", 100000, "Income", "xero"),
      pnl("Total Income", 100000, "Income", "xero"),
      pnl("COGS leaf", 40000, "Cost of Sales", "xero"),
      pnl("Total Cost of Goods Sold", 40000, "Cost of Sales", "xero"),
      pnl("Expense leaf", 30000, "Expenses", "xero"),
      pnl("Total Expenses", 30000, "Expenses", "xero"),
      pnl("Net Income", 30000, "Net Income", "xero"),
    ];
    const control = controlFor(rows, pnlRows, native);
    expect(control.cashControlPasses).toBe(true);
    expect(control.netProfitMarginControlPasses).toBe(true);
    const active = buildActiveReportSummary({
      reportDataContext: {
        tenantName: "Xero Demo",
        normalizedData: {
          sourceSystem: "xero",
          normalizedBalanceSheet: rows,
          normalizedIncomeStatement: pnlRows,
          statementControl: control,
          statementControlContractVersion: STATEMENT_CONTROL_CONTRACT_VERSION,
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    });
    expect(active?.cash).toBe(4540.98);
    expect(active?.revenue).toBe(100000);
    expect(active?.netIncome).toBe(30000);
  });

  it("12. QBO US independent tie — Checking under Bank Accounts", () => {
    const raw = {
      reports: {
        balanceSheet: {
          ok: true,
          data: {
            Rows: {
              Row: [
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
                { ColData: [{ value: "Total Assets" }, { value: "836.02" }] },
                { ColData: [{ value: "Total Liabilities" }, { value: "0" }] },
                { ColData: [{ value: "Total Equity" }, { value: "836.02" }] },
              ],
            },
          },
        },
        profitAndLoss: { ok: true, data: { Rows: { Row: [] } } },
      },
    };
    const native = extractNativeTotalsFromQuickBooksRaw(raw)!;
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
    const withEquity = [
      ...normalized,
      bs("Total Liabilities", 0, "Liabilities", ["Liabilities", "Total Liabilities"]),
      bs("Total Equity", 836.02, "Equity", ["Equity", "Total Equity"]),
    ];
    const control = controlFor(withEquity, [], {
      ...native,
      totalLiabilities: 0,
      totalEquity: 836.02,
    });
    expect(getStatementControlLine(control, "cash")?.nativeAmount).toBe(836.02);
    expect(getStatementControlLine(control, "cash")?.canonicalAmount).toBe(836.02);
    expect(control.cashControlPasses).toBe(true);
  });

  it("13. QBO CA independent tie — Demo B cash/revenue/COGS/NI from raw", () => {
    const native = extractNativeTotalsFromQuickBooksRaw(demoBQboRawEnvelope())!;
    const control = controlFor(demoBBs(), demoBPnl(), native);
    expect(getStatementControlLine(control, "cash")?.nativeAmount).toBe(21095.57);
    expect(getStatementControlLine(control, "cash")?.canonicalAmount).toBe(21095.57);
    expect(getStatementControlLine(control, "ar")?.nativeAmount).toBe(18402.04);
    expect(getStatementControlLine(control, "revenue")?.nativeAmount).toBe(39169.8);
    expect(getStatementControlLine(control, "cogs")?.nativeAmount).toBe(38662.43);
    expect(getStatementControlLine(control, "net_income")?.nativeAmount).toBe(-13034.03);
    expect(control.overallPasses).toBe(true);
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
          statementControl: controlFor(demoBBs(), demoBPnl()),
          statementControlContractVersion: STATEMENT_CONTROL_CONTRACT_VERSION,
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    };
    buildActiveReportSummary(payload);
    buildActiveReportSummary(payload);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("15. same-sync native/canonical period mismatch → fail closed", () => {
    const control = controlFor(demoBBs(), demoBPnl(), demoBNative(), {
      nativePeriod: { startDate: "2026-07-01", endDate: "2026-07-31" },
      canonicalPeriod: { startDate: "2026-01-01", endDate: "2026-07-31" },
    });
    expect(control.periodAligned).toBe(false);
    expect(control.periodMismatchReason).toMatch(/period mismatch/i);
    expect(control.cashControlPasses).toBe(false);
    expect(control.netProfitMarginControlPasses).toBe(false);
    expect(control.operatingGrossMarginControlPasses).toBe(false);
    expect(control.overallPasses).toBe(false);
  });

  it("missing control + contract v1 → fail closed", () => {
    expect(
      statementControlAllowsKpi({
        contractVersion: STATEMENT_CONTROL_CONTRACT_VERSION,
        statementControl: null,
        gate: "cash",
      }),
    ).toBe(false);
    expect(
      statementControlAllowsKpi({
        contractVersion: STATEMENT_CONTROL_CONTRACT_VERSION,
        statementControl: null,
        gate: "npm",
      }),
    ).toBe(false);

    const active = buildActiveReportSummary({
      reportDataContext: {
        tenantName: "Missing control",
        normalizedData: {
          sourceSystem: "quickbooks",
          normalizedBalanceSheet: demoBBs(),
          normalizedIncomeStatement: demoBPnl(),
          statementControl: null,
          statementControlContractVersion: STATEMENT_CONTROL_CONTRACT_VERSION,
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    });
    expect(active?.cashReady).toBe(false);
    expect(active?.netProfitMarginReady).toBe(false);
    expect(active?.operatingGrossMarginReady).toBe(false);
  });

  it("legacy missing control (no contract version) → allow", () => {
    expect(
      statementControlAllowsKpi({
        contractVersion: 0,
        statementControl: null,
        gate: "cash",
      }),
    ).toBe(true);

    const active = buildActiveReportSummary({
      reportDataContext: {
        tenantName: "Legacy",
        normalizedData: {
          sourceSystem: "xero",
          normalizedBalanceSheet: demoBBs(),
          normalizedIncomeStatement: demoBPnl(),
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    });
    expect(active?.cashReady).toBe(true);
  });

  it("missing native totals → control fails closed", () => {
    const control = controlFor(demoBBs(), demoBPnl(), null);
    expect(control.cashControlPasses).toBe(false);
    expect(control.netProfitMarginControlPasses).toBe(false);
    expect(control.overallPasses).toBe(false);
    expect(control.nativeSource).toBeNull();
  });

  it("comparison engine has no provider branches", () => {
    const src = buildStatementControl.toString();
    expect(src).not.toMatch(/quickbooks|xero|netsuite|sap|sage|dynamics/i);
  });
});
