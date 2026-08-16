/**
 * Authoritative active financial summary for Scorecard / dashboard consumers.
 * P&L and BS totals come from buildMappedFinancialSummary — never from
 * dashboard-local regex aggregation over income/sales labels.
 */
import {
  assessPeriodIncomeStatementEvidence,
  buildMappedFinancialSummary,
  type PeriodPnLNetIncomePath,
} from "./normalizers/financial-statements";
import type {
  AccountingSourceSystem,
  CanonicalBalanceSheetRow,
  CanonicalPnLRow,
} from "./types";
import type { StatementControlResult } from "./statement-control";
import { statementControlAllowsKpi } from "./statement-control";

/** Provider-neutral cash position availability (missing ≠ zero). */
export type CashPositionStatus = "VALUE_ZERO" | "VALUE_NONZERO" | "SOURCE_MISSING";

export type CashPositionResolution = {
  status: CashPositionStatus;
  /** Null only when status is SOURCE_MISSING. */
  amount: number | null;
};

export type ActiveReportSummaryView = {
  sourceSystem: AccountingSourceSystem | string;
  tenantName: string;
  lastSyncedAt?: string;
  diagnostics: Record<string, unknown>;
  revenue: number;
  /** Canonical mapped COGS — same source as Scorecard / Accuracy Contract. */
  cogs: number;
  /** Canonical mapped gross profit — never recomputed in Scorecard. */
  grossProfit: number;
  /**
   * True only when Operating Gross Margin evidence is ready:
   * revenue + (explicit Gross Profit OR COGS evidence).
   */
  grossProfitSupported: boolean;
  expenses: number;
  netIncome: number;
  assets: number;
  liabilities: number;
  /**
   * Cash amount when cashStatus is VALUE_ZERO or VALUE_NONZERO.
   * Null when cashStatus is SOURCE_MISSING (never coerce missing → 0).
   */
  cash: number | null;
  cashStatus: CashPositionStatus;
  /**
   * True when Net Profit Margin evidence is ready (Path A or Path B).
   * Not the same as operating gross margin readiness.
   */
  incomeStatementComplete: boolean;
  /** Explicit NPM evidence gate (same as incomeStatementComplete; clearer name). */
  netProfitMarginEvidenceReady: boolean;
  /** OGM evidence gate (mirrors grossProfitSupported for Scorecard wiring). */
  operatingGrossMarginEvidenceReady: boolean;
  netIncomeEvidencePath: PeriodPnLNetIncomePath;
  hasRevenueEvidence: boolean;
  /** Sync-time statement control snapshot (null on legacy payloads). */
  statementControl: StatementControlResult | null;
  /** Evidence ∧ statement control (legacy missing control = allow). */
  netProfitMarginReady: boolean;
  operatingGrossMarginReady: boolean;
  cashReady: boolean;
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
    statementControl?: StatementControlResult | null;
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

function classificationHints(row: CanonicalBalanceSheetRow): string[] {
  const raw = rawMeta(row);
  return [
    ...hierarchyPath(row),
    String(raw.__advisacorSourceSection || ""),
    String(row.section || ""),
    String(raw.accountClass || raw.AccountClass || ""),
    String(raw.accountType || raw.AccountType || ""),
    String(raw.Classification || raw.classification || ""),
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
}

const NON_ASSET_SECTION =
  /^(liabilit(y|ies)|current liabilit(y|ies)|long.?term liabilit(y|ies)|non.?current liabilit(y|ies)|equity|accounts?\s+payable|credit cards?)$/i;

const ASSET_SECTION =
  /^(assets?|current assets?|other current assets?|fixed assets?|non.?current assets?|cash and cash equivalents?|bank accounts?|cash at bank|cash at bank and in hand)$/i;

/**
 * Cash Position may only use asset-side Balance Sheet rows.
 * Prefer hierarchy / sourceSection / account classification over label tokens.
 * Fail closed when structural side cannot be established.
 */
export function isAssetSideBalanceSheetRow(row: CanonicalBalanceSheetRow): boolean {
  const hints = classificationHints(row);
  if (!hints.length) return false;

  // Explicit non-asset sections anywhere in structural context → exclude.
  if (hints.some((hint) => NON_ASSET_SECTION.test(hint))) return false;

  // Positive asset-side evidence required.
  if (hints.some((hint) => ASSET_SECTION.test(hint))) return true;

  // Broader classification strings (provider account class/type).
  const joined = hints.join(" | ");
  if (/\bliabilit|\bequity\b|\bpayable\b/i.test(joined)) return false;
  if (/\basset\b|\bcash and cash equivalents\b|\bbank accounts?\b/i.test(joined)) return true;

  return false;
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

/** Candidate for cash/bank selection (leaf or aggregate) — label/section only. */
export function isCashOrBankRelated(row: CanonicalBalanceSheetRow): boolean {
  const label = String(row.label || "");
  const section = String(row.section || "");
  if (isExcludedNonCashLabel(label)) return false;
  if (/cash|bank|checking|savings/i.test(label)) return true;
  if (/cash|bank|checking|savings/i.test(section) && !isBalanceSheetSummaryOrTotalRow(row)) {
    return /cash and cash equivalents?|bank accounts?|cash at bank/i.test(section);
  }
  return false;
}

function isEligibleCashRow(row: CanonicalBalanceSheetRow): boolean {
  return isAssetSideBalanceSheetRow(row) && isCashOrBankRelated(row);
}

function isExplicitCashAggregate(row: CanonicalBalanceSheetRow): boolean {
  if (!isEligibleCashRow(row)) return false;
  const label = String(row.label || "");
  if (!/cash|bank/i.test(label)) return false;
  if (isBalanceSheetSummaryOrTotalRow(row)) return true;
  return /^(total\s+)?cash and cash equivalents?$/i.test(label) || /^total\s+bank/i.test(label);
}

function cashAggregateRank(label: string): number {
  if (/cash and cash equivalents?/i.test(label)) return 40;
  if (/total bank accounts/i.test(label)) return 30;
  if (/^total cash$/i.test(label)) return 20;
  if (/^total banks?$/i.test(label)) return 15;
  if (/^total\b/i.test(label) && /cash|bank/i.test(label)) return 10;
  return 5;
}

/**
 * Resolve cash with missing≠zero semantics.
 *
 * Precedence:
 * A. One explicit ASSET-SIDE cash/bank aggregate
 * B. Else sum ASSET-SIDE leaf cash/bank accounts only
 *
 * When no eligible cash/bank evidence exists on the Balance Sheet → SOURCE_MISSING
 * (never fabricate 0). True zero balances remain VALUE_ZERO.
 */
export function resolveCashPositionFromBalanceSheet(
  rows: CanonicalBalanceSheetRow[] = [],
): CashPositionResolution {
  const aggregates = rows.filter(isExplicitCashAggregate);
  if (aggregates.length) {
    const best = [...aggregates].sort(
      (a, b) => cashAggregateRank(String(b.label || "")) - cashAggregateRank(String(a.label || "")),
    )[0];
    const amount = Number(best.amount || 0);
    return {
      status: amount === 0 ? "VALUE_ZERO" : "VALUE_NONZERO",
      amount,
    };
  }

  const leaves = rows.filter((row) => isEligibleCashRow(row) && !isBalanceSheetSummaryOrTotalRow(row));
  if (!leaves.length) {
    return { status: "SOURCE_MISSING", amount: null };
  }

  const amount = leaves.reduce((total, row) => total + Number(row.amount || 0), 0);
  return {
    status: amount === 0 ? "VALUE_ZERO" : "VALUE_NONZERO",
    amount,
  };
}

/**
 * Numeric cash selector for callers that still require a number.
 * SOURCE_MISSING collapses to 0 only for legacy numeric APIs — Scorecard must
 * use resolveCashPositionFromBalanceSheet / cashStatus instead.
 */
export function sumCashFromBalanceSheet(rows: CanonicalBalanceSheetRow[] = []): number {
  const resolved = resolveCashPositionFromBalanceSheet(rows);
  return resolved.amount ?? 0;
}

export function buildActiveReportSummary(reportPayload: ReportPayloadLike | null | undefined): ActiveReportSummaryView | null {
  const context = (reportPayload?.reportDataContext || reportPayload) as ReportPayloadLike | null | undefined;
  const normalizedData = context?.normalizedData;
  if (!normalizedData?.sourceSystem) return null;

  const incomeStatement = normalizedData.normalizedIncomeStatement || [];
  const balanceSheet = normalizedData.normalizedBalanceSheet || [];
  const mapped = buildMappedFinancialSummary(balanceSheet, incomeStatement);
  const cashPosition = resolveCashPositionFromBalanceSheet(balanceSheet);
  const evidence = assessPeriodIncomeStatementEvidence(incomeStatement);
  const statementControl =
    (normalizedData as { statementControl?: StatementControlResult | null }).statementControl ?? null;
  const contractVersion =
    (normalizedData as { statementControlContractVersion?: number }).statementControlContractVersion ?? 0;

  // Contract v1+: missing control fails closed. Legacy (no version): allow.
  const controlAllowsCash = statementControlAllowsKpi({
    contractVersion,
    statementControl,
    gate: "cash",
  });
  const controlAllowsNpm = statementControlAllowsKpi({
    contractVersion,
    statementControl,
    gate: "npm",
  });
  const controlAllowsOgm = statementControlAllowsKpi({
    contractVersion,
    statementControl,
    gate: "ogm",
  });

  const netProfitMarginReady = evidence.netProfitMarginReady && controlAllowsNpm;
  const operatingGrossMarginReady = evidence.operatingGrossMarginReady && controlAllowsOgm;
  const cashReady =
    cashPosition.status !== "SOURCE_MISSING" && controlAllowsCash;

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
    revenue: evidence.hasRevenueEvidence ? mapped.revenue : 0,
    cogs: evidence.hasRevenueEvidence ? mapped.cogs : 0,
    grossProfit: operatingGrossMarginReady ? mapped.grossProfit : 0,
    grossProfitSupported: operatingGrossMarginReady,
    expenses: evidence.hasRevenueEvidence ? mapped.expenses : 0,
    netIncome: netProfitMarginReady ? mapped.netIncome : 0,
    assets: mapped.totalAssets,
    liabilities: mapped.totalLiabilities,
    cash: cashPosition.amount,
    cashStatus: cashPosition.status,
    incomeStatementComplete: netProfitMarginReady,
    netProfitMarginEvidenceReady: evidence.netProfitMarginReady,
    operatingGrossMarginEvidenceReady: evidence.operatingGrossMarginReady,
    netIncomeEvidencePath: evidence.netIncomeEvidencePath,
    hasRevenueEvidence: evidence.hasRevenueEvidence,
    statementControl,
    netProfitMarginReady,
    operatingGrossMarginReady,
    cashReady,
  };
}
