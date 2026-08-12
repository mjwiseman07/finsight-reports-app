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

type RawBalanceMeta = Record<string, unknown>;

function rawMeta(row: CanonicalBalanceSheetRow): RawBalanceMeta {
  const raw = row.source?.raw;
  return raw && typeof raw === "object" ? (raw as RawBalanceMeta) : {};
}

function hierarchyPath(row: CanonicalBalanceSheetRow): string[] {
  const path = rawMeta(row).__advisacorHierarchyPath;
  return Array.isArray(path) ? path.map((part) => String(part || "").trim()).filter(Boolean) : [];
}

function structuralRowType(row: CanonicalBalanceSheetRow): string {
  const raw = rawMeta(row);
  return String(raw.rowType || raw.RowType || "").trim().toLowerCase();
}

/**
 * Summary / rollup detection prefers structural metadata (rowType, hierarchy),
 * then falls back to Total* labels. Provider-neutral — no sourceSystem branching.
 */
export function isBalanceSheetSummaryOrTotalRow(row: CanonicalBalanceSheetRow): boolean {
  const rowType = structuralRowType(row);
  if (
    rowType === "summary" ||
    rowType === "summaryrow" ||
    rowType === "header" ||
    rowType === "section"
  ) {
    return true;
  }
  const label = String(row.label || "");
  if (/^total\b/i.test(label)) return true;
  const path = hierarchyPath(row);
  if (path.length && /^total\b/i.test(path[path.length - 1])) return true;
  return false;
}

function isExcludedNonCashLabel(label: string): boolean {
  return /accounts?\s+receivable|\breceivable\b|inventory|prepaid|fixed asset|equipment|furniture|vehicle|liabilit|equity|payable|undeposited/i.test(
    label,
  );
}

/** Candidate for cash/bank selection (leaf or aggregate). */
function isCashOrBankRelated(row: CanonicalBalanceSheetRow): boolean {
  const label = String(row.label || "");
  const section = String(row.section || "");
  if (isExcludedNonCashLabel(label)) return false;
  // Require cash/bank semantics on the label itself for totals, or on label/section for leaves.
  if (/cash|bank|checking|savings/i.test(label)) return true;
  if (/cash|bank|checking|savings/i.test(section) && !isBalanceSheetSummaryOrTotalRow(row)) {
    // Leaf under a cash section whose account name omits those tokens (rare) —
    // only accept when section is clearly a cash/bank grouping.
    return /cash and cash equivalents|bank accounts?|cash at bank/i.test(section);
  }
  return false;
}

function isExplicitCashAggregate(row: CanonicalBalanceSheetRow): boolean {
  if (!isCashOrBankRelated(row)) return false;
  const label = String(row.label || "");
  // Must be a cash/bank total — never Total Assets / Total Current Assets.
  if (!/cash|bank/i.test(label)) return false;
  if (isBalanceSheetSummaryOrTotalRow(row)) return true;
  // Some providers emit the section total without Summary rowType but with Total* label.
  return /^(total\s+)?cash and cash equivalents$/i.test(label) || /^total\s+bank/i.test(label);
}

function cashAggregateRank(label: string): number {
  if (/cash and cash equivalents/i.test(label)) return 40;
  if (/total bank accounts/i.test(label)) return 30;
  if (/^total cash$/i.test(label)) return 20;
  if (/^total banks?$/i.test(label)) return 15;
  if (/^total\b/i.test(label) && /cash|bank/i.test(label)) return 10;
  return 5;
}

/**
 * Canonical cash selector for activeReportSummary.
 *
 * Precedence:
 * A. One explicit cash/bank aggregate (Total Cash / Cash and Cash Equivalents / …)
 * B. Else sum leaf cash/bank accounts only
 *
 * Never sum leaves + their rollup. Never abs() negatives. Never fabricate.
 */
export function sumCashFromBalanceSheet(rows: CanonicalBalanceSheetRow[] = []): number {
  const aggregates = rows.filter(isExplicitCashAggregate);
  if (aggregates.length) {
    const best = [...aggregates].sort(
      (a, b) => cashAggregateRank(String(b.label || "")) - cashAggregateRank(String(a.label || "")),
    )[0];
    return Number(best.amount || 0);
  }

  return rows
    .filter((row) => isCashOrBankRelated(row) && !isBalanceSheetSummaryOrTotalRow(row))
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
