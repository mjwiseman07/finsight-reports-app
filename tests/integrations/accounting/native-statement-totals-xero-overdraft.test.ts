import { describe, expect, it } from "vitest";
import {
  extractNativeCashTotal,
  extractNativeTotalsFromXeroFlattenedRows,
} from "@/lib/integrations/accounting/native-statement-totals";
import {
  applyCanonicalBankOverdraftClassification,
} from "@/lib/integrations/accounting/bank-overdraft";
import {
  buildCanonicalStatementFactsFromNormalized,
  buildStatementControl,
  getStatementControlLine,
  STATEMENT_CONTROL_CONTRACT_VERSION,
} from "@/lib/integrations/accounting/statement-control";
import { buildActiveReportSummary } from "@/lib/integrations/accounting/active-report-summary";
import type { CanonicalBalanceSheetRow } from "@/lib/integrations/accounting/types";

/** Exact live Xero overdraft shape: asset Checking -4520.08 before canonical reclass. */
function xeroOverdraftFlattenedRows() {
  return [
    {
      label: "Checking Account",
      amount: -4520.08,
      section: "Cash and Cash Equivalents",
      rowType: "Row",
      raw: {
        RowType: "Row",
        __advisacorSourceSection: "Cash and Cash Equivalents",
        __advisacorHierarchyPath: [
          "Assets",
          "Current Assets",
          "Cash and Cash Equivalents",
          "Checking Account",
        ],
      },
    },
    {
      label: "Total Cash and Cash Equivalents",
      amount: -4520.08,
      section: "Cash and Cash Equivalents",
      rowType: "SummaryRow",
      raw: {
        RowType: "SummaryRow",
        __advisacorSourceSection: "Cash and Cash Equivalents",
        __advisacorHierarchyPath: [
          "Assets",
          "Current Assets",
          "Cash and Cash Equivalents",
          "Total Cash and Cash Equivalents",
        ],
      },
    },
    {
      label: "Accounts Receivable",
      amount: 8542.63,
      section: "Current Assets",
      raw: {
        __advisacorHierarchyPath: ["Assets", "Current Assets", "Accounts Receivable"],
      },
    },
    {
      label: "Total Assets",
      amount: 4022.55,
      section: "Assets",
      raw: {
        RowType: "SummaryRow",
        __advisacorHierarchyPath: ["Assets", "Total Assets"],
      },
    },
  ];
}

function bs(
  label: string,
  amount: number,
  section: string,
  path: string[],
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
      raw: {
        __advisacorHierarchyPath: path,
        __advisacorSourceSection: section,
        rowType: /^total\b/i.test(label) ? "SummaryRow" : "Row",
      },
    },
  };
}

describe("Xero native cash overdraft / Cash Position alignment", () => {
  it("negative asset-bank Total Cash → native Cash Position 0 (not -4520.08)", () => {
    const native = extractNativeTotalsFromXeroFlattenedRows({
      balanceSheetRows: xeroOverdraftFlattenedRows(),
      profitAndLossRows: [],
    });
    expect(native.cash).toBe(0);
    expect(native.cash).not.toBe(-4520.08);
  });

  it("canonical overdraft reclass + native cash both 0 → cashControlPasses", () => {
    const native = extractNativeTotalsFromXeroFlattenedRows({
      balanceSheetRows: xeroOverdraftFlattenedRows(),
      profitAndLossRows: [],
    });
    const before = [
      bs("Checking Account", -4520.08, "Cash and Cash Equivalents", [
        "Assets",
        "Current Assets",
        "Cash and Cash Equivalents",
        "Checking Account",
      ]),
      bs("Total Cash and Cash Equivalents", -4520.08, "Cash and Cash Equivalents", [
        "Assets",
        "Current Assets",
        "Cash and Cash Equivalents",
        "Total Cash and Cash Equivalents",
      ]),
      bs("Accounts Receivable", 8542.63, "Current Assets", ["Assets", "Current Assets", "Accounts Receivable"]),
      bs("Total Assets", 4022.55, "Assets", ["Assets", "Total Assets"]),
      bs("Total Liabilities", 0, "Liabilities", ["Liabilities", "Total Liabilities"]),
      bs("Total Equity", 4022.55, "Equity", ["Equity", "Total Equity"]),
    ];
    const canonicalRows = applyCanonicalBankOverdraftClassification(before);
    const control = buildStatementControl({
      native,
      canonical: buildCanonicalStatementFactsFromNormalized({
        balanceSheet: canonicalRows,
        incomeStatement: [],
      }),
    });
    expect(native.cash).toBe(0);
    expect(getStatementControlLine(control, "cash")?.canonicalAmount).toBe(0);
    expect(getStatementControlLine(control, "cash")?.nativeAmount).toBe(0);
    expect(getStatementControlLine(control, "cash")?.varianceAbs).toBe(0);
    expect(control.cashControlPasses).toBe(true);
    const active = buildActiveReportSummary({
      reportDataContext: {
        tenantName: "Xero overdraft",
        normalizedData: {
          sourceSystem: "xero",
          normalizedBalanceSheet: canonicalRows,
          normalizedIncomeStatement: [],
          statementControl: control,
          statementControlContractVersion: STATEMENT_CONTROL_CONTRACT_VERSION,
          normalizedAccounts: [],
          normalizedTrialBalance: [],
        },
      },
    });
    expect(active?.cash).toBe(0);
    expect(active?.cashReady).toBe(true);
  });

  it("liability overdraft Checking is excluded from native cash", () => {
    const native = extractNativeTotalsFromXeroFlattenedRows({
      balanceSheetRows: [
        {
          label: "Checking Account",
          amount: 4520.08,
          section: "Current Liabilities",
          raw: {
            __advisacorHierarchyPath: ["Liabilities", "Current Liabilities", "Checking Account"],
            __advisacorSourceSection: "Current Liabilities",
          },
        },
      ],
      profitAndLossRows: [],
    });
    expect(native.cash).toBeNull();
  });

  it("mixed +1000 / -4520.08 / total -3520.08 → leaves win at 1000", () => {
    const native = extractNativeTotalsFromXeroFlattenedRows({
      balanceSheetRows: [
        {
          label: "Savings",
          amount: 1000,
          section: "Cash and Cash Equivalents",
          raw: {
            __advisacorHierarchyPath: ["Assets", "Cash and Cash Equivalents", "Savings"],
          },
        },
        {
          label: "Checking Account",
          amount: -4520.08,
          section: "Cash and Cash Equivalents",
          raw: {
            __advisacorHierarchyPath: ["Assets", "Cash and Cash Equivalents", "Checking Account"],
          },
        },
        {
          label: "Total Cash and Cash Equivalents",
          amount: -3520.08,
          section: "Cash and Cash Equivalents",
          raw: {
            RowType: "SummaryRow",
            __advisacorHierarchyPath: [
              "Assets",
              "Cash and Cash Equivalents",
              "Total Cash and Cash Equivalents",
            ],
          },
        },
      ],
      profitAndLossRows: [],
    });
    expect(native.cash).toBe(1000);
    expect(native.cash).not.toBe(0);
    expect(native.cash).not.toBe(-3520.08);
  });

  it("mixed +10000 / -4520.08 / total +5479.92 → leaves win at 10000", () => {
    const native = extractNativeTotalsFromXeroFlattenedRows({
      balanceSheetRows: [
        {
          label: "Savings",
          amount: 10000,
          section: "Cash and Cash Equivalents",
          raw: {
            __advisacorHierarchyPath: ["Assets", "Cash and Cash Equivalents", "Savings"],
          },
        },
        {
          label: "Checking Account",
          amount: -4520.08,
          section: "Cash and Cash Equivalents",
          raw: {
            __advisacorHierarchyPath: ["Assets", "Cash and Cash Equivalents", "Checking Account"],
          },
        },
        {
          label: "Total Cash and Cash Equivalents",
          amount: 5479.92,
          section: "Cash and Cash Equivalents",
          raw: {
            RowType: "SummaryRow",
            __advisacorHierarchyPath: [
              "Assets",
              "Cash and Cash Equivalents",
              "Total Cash and Cash Equivalents",
            ],
          },
        },
      ],
      profitAndLossRows: [],
    });
    expect(native.cash).toBe(10000);
    expect(native.cash).not.toBe(5479.92);
  });

  it("mixed leaves + canonical overdraft reclass → native equals canonical positive cash", () => {
    const native = extractNativeTotalsFromXeroFlattenedRows({
      balanceSheetRows: [
        {
          label: "Savings",
          amount: 1000,
          section: "Cash and Cash Equivalents",
          raw: {
            __advisacorHierarchyPath: ["Assets", "Cash and Cash Equivalents", "Savings"],
          },
        },
        {
          label: "Checking Account",
          amount: -4520.08,
          section: "Cash and Cash Equivalents",
          raw: {
            __advisacorHierarchyPath: ["Assets", "Cash and Cash Equivalents", "Checking Account"],
          },
        },
        {
          label: "Total Cash and Cash Equivalents",
          amount: -3520.08,
          section: "Cash and Cash Equivalents",
          raw: {
            RowType: "SummaryRow",
            __advisacorHierarchyPath: [
              "Assets",
              "Cash and Cash Equivalents",
              "Total Cash and Cash Equivalents",
            ],
          },
        },
      ],
      profitAndLossRows: [],
    });
    const before = [
      bs("Savings", 1000, "Cash and Cash Equivalents", ["Assets", "Cash and Cash Equivalents", "Savings"]),
      bs("Checking Account", -4520.08, "Cash and Cash Equivalents", [
        "Assets",
        "Cash and Cash Equivalents",
        "Checking Account",
      ]),
      bs("Total Cash and Cash Equivalents", -3520.08, "Cash and Cash Equivalents", [
        "Assets",
        "Cash and Cash Equivalents",
        "Total Cash and Cash Equivalents",
      ]),
    ];
    const canonicalRows = applyCanonicalBankOverdraftClassification(before);
    const control = buildStatementControl({
      native,
      canonical: buildCanonicalStatementFactsFromNormalized({
        balanceSheet: canonicalRows,
        incomeStatement: [],
      }),
    });
    expect(native.cash).toBe(1000);
    expect(getStatementControlLine(control, "cash")?.canonicalAmount).toBe(1000);
    expect(getStatementControlLine(control, "cash")?.nativeAmount).toBe(1000);
    expect(control.cashControlPasses).toBe(true);
  });

  it("mixed without explicit total: positive Savings counted; overdraft leaf excluded", () => {
    const native = extractNativeTotalsFromXeroFlattenedRows({
      balanceSheetRows: [
        {
          label: "Savings",
          amount: 1000,
          section: "Bank Accounts",
          raw: {
            __advisacorHierarchyPath: ["Assets", "Bank Accounts", "Savings"],
          },
        },
        {
          label: "Checking Account",
          amount: -4520.08,
          section: "Bank Accounts",
          raw: {
            __advisacorHierarchyPath: ["Assets", "Bank Accounts", "Checking Account"],
          },
        },
      ],
      profitAndLossRows: [],
    });
    expect(native.cash).toBe(1000);
  });

  it("no leaves, positive asset-side Total Cash → 1000", () => {
    const native = extractNativeTotalsFromXeroFlattenedRows({
      balanceSheetRows: [
        {
          label: "Total Cash and Cash Equivalents",
          amount: 1000,
          section: "Cash and Cash Equivalents",
          raw: {
            RowType: "SummaryRow",
            __advisacorHierarchyPath: [
              "Assets",
              "Cash and Cash Equivalents",
              "Total Cash and Cash Equivalents",
            ],
          },
        },
      ],
      profitAndLossRows: [],
    });
    expect(native.cash).toBe(1000);
  });

  it("no leaves, negative asset-side Total Cash → 0", () => {
    const native = extractNativeTotalsFromXeroFlattenedRows({
      balanceSheetRows: [
        {
          label: "Total Cash and Cash Equivalents",
          amount: -4520.08,
          section: "Cash and Cash Equivalents",
          raw: {
            RowType: "SummaryRow",
            __advisacorHierarchyPath: [
              "Assets",
              "Cash and Cash Equivalents",
              "Total Cash and Cash Equivalents",
            ],
          },
        },
      ],
      profitAndLossRows: [],
    });
    expect(native.cash).toBe(0);
  });

  it("ambiguous bank leaf without asset ancestry → null", () => {
    const native = extractNativeTotalsFromXeroFlattenedRows({
      balanceSheetRows: [{ label: "Checking Account", amount: -4520.08 }],
      profitAndLossRows: [],
    });
    expect(native.cash).toBeNull();
  });

  it("extractNativeCashTotal leaf path clamps overdraft", () => {
    expect(
      extractNativeCashTotal([
        {
          label: "Checking Account",
          rawLabel: "Checking Account",
          amount: -4520.08,
          hasAmount: true,
          role: "data",
          section: "Cash and Cash Equivalents",
          hierarchyPath: ["Assets", "Cash and Cash Equivalents", "Checking Account"],
          side: "asset",
        },
      ]),
    ).toBe(0);
  });
});
