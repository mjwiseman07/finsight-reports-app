/**
 * Authoritative active financial summary for Scorecard / dashboard consumers.
 * P&L and BS totals come from buildMappedFinancialSummary — never from
 * dashboard-local regex aggregation over income/sales labels.
 */
import { buildMappedFinancialSummary } from "./normalizers/financial-statements";
import type {
  AccountingSourceSystem,
  CanonicalBalanceSheetRow,
  CanonicalPnLRow,
} from "./types";

export type ActiveReportSummaryView = {
  sourceSystem: AccountingSourceSystem | string;
  tenantName: string;
  lastSyncedAt?: string;
  diagnostics: Record<string, unknown>;
  revenue: number;
  expenses: number;
  netIncome: number;
  assets: number;
  liabilities: number;
  cash: number;
};

type ReportPayloadLike = {
  reportDataContext?: Record<string, unknown> | null;
  tenantName?: string;
  lastSyncedAt?: string;
  generatedAt?: string;
  diagnostics?: Record<string, unknown>;
  normalizedData?: {
    sourceSystem?: string;
    lastSyncedAt?: string;
    normalizedIncomeStatement?: CanonicalPnLRow[];
    normalizedBalanceSheet?: CanonicalBalanceSheetRow[];
    normalizedAccounts?: unknown[];
    normalizedTrialBalance?: unknown[];
  };
};

/**
 * Cash is not yet a first-class field on FinancialSummary.
 * Preserve the prior BS cash/bank selection until a canonical cash schedule lands.
 * Do not use this pattern for P&L revenue/expense.
 */
export function sumCashFromBalanceSheet(rows: CanonicalBalanceSheetRow[] = []): number {
  return rows
    .filter((row) => /cash|bank|checking|savings/i.test(`${row.label || ""} ${row.section || ""}`))
    .reduce((total, row) => total + Number(row.amount || 0), 0);
}

export function buildActiveReportSummary(reportPayload: ReportPayloadLike | null | undefined): ActiveReportSummaryView | null {
  const context = (reportPayload?.reportDataContext || reportPayload) as ReportPayloadLike | null | undefined;
  const normalizedData = context?.normalizedData;
  if (!normalizedData?.sourceSystem) return null;

  const incomeStatement = normalizedData.normalizedIncomeStatement || [];
  const balanceSheet = normalizedData.normalizedBalanceSheet || [];
  const mapped = buildMappedFinancialSummary(balanceSheet, incomeStatement);

  return {
    sourceSystem: normalizedData.sourceSystem,
    tenantName: String(context?.tenantName || context?.diagnostics?.tenantName || ""),
    lastSyncedAt: normalizedData.lastSyncedAt || context?.lastSyncedAt || context?.generatedAt,
    diagnostics: (context?.diagnostics as Record<string, unknown>) || {
      sourceSystem: normalizedData.sourceSystem,
      tenantName: reportPayload?.tenantName || "",
      accountsCount: normalizedData.normalizedAccounts?.length || 0,
      trialBalanceCount: normalizedData.normalizedTrialBalance?.length || 0,
      balanceSheetCount: balanceSheet.length,
      incomeStatementCount: incomeStatement.length,
    },
    revenue: mapped.revenue,
    expenses: mapped.expenses,
    netIncome: mapped.netIncome,
    assets: mapped.totalAssets,
    liabilities: mapped.totalLiabilities,
    cash: sumCashFromBalanceSheet(balanceSheet),
  };
}
