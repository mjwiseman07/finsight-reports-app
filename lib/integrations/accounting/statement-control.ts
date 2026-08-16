/**
 * Sync-time financial statement control.
 *
 * Architecture:
 *   Provider sync → native BS/P&L rows (already fetched)
 *   → canonical normalization
 *   → statement control (native totals vs canonical facts)
 *   → validated snapshot on accounting_syncs.normalized_payload
 *   → Scorecard reads snapshot only (zero ERP calls on dashboard load)
 *
 * Control math is provider-neutral. Adapters supply normalized rows with
 * explicit totals; this module never branches on NetSuite/SAP/Sage/Dynamics.
 */

import {
  resolveCashPositionFromBalanceSheet,
  isBalanceSheetSummaryOrTotalRow,
  isAssetSideBalanceSheetRow,
  isCashOrBankRelated,
  type CashPositionResolution,
} from "./active-report-summary";
import { sumBalanceSheetAccountsReceivable } from "./ar-aging";
import {
  buildMappedFinancialSummary,
  hasExplicitGrossProfitRow,
} from "./normalizers/financial-statements";
import type {
  CanonicalBalanceSheetRow,
  CanonicalPnLRow,
} from "./types";

export const STATEMENT_CONTROL_TOLERANCE_DOLLAR = 1;

export type StatementControlLineStatus =
  | "tie"
  | "auto_cleared"
  | "fail"
  | "unavailable";

export type StatementControlLineKey =
  | "cash"
  | "ar"
  | "total_assets"
  | "total_liabilities"
  | "total_equity"
  | "bs_equation"
  | "revenue"
  | "cogs"
  | "gross_profit"
  | "net_income";

export type StatementControlLine = {
  key: StatementControlLineKey;
  label: string;
  nativeAmount: number | null;
  canonicalAmount: number | null;
  variance: number | null;
  varianceAbs: number | null;
  toleranceDollar: number;
  status: StatementControlLineStatus;
  passes: boolean;
  reason: string;
};

export type StatementControlResult = {
  computedAt: string;
  /** Dollar tolerance for native ↔ canonical ties (matches existing $1 footing). */
  toleranceDollar: number;
  balanceSheet: {
    lines: StatementControlLine[];
    passes: boolean;
    equationPasses: boolean;
  };
  incomeStatement: {
    lines: StatementControlLine[];
    passes: boolean;
  };
  /** KPI dependency gates — Scorecard must honor these. */
  cashControlPasses: boolean;
  arControlPasses: boolean;
  netProfitMarginControlPasses: boolean;
  operatingGrossMarginControlPasses: boolean;
  overallPasses: boolean;
};

type AmountRow = {
  label: string;
  amount?: number;
  section?: string;
  source?: { raw?: unknown };
};

function isSyntheticRow(row: AmountRow): boolean {
  const raw = row.source?.raw;
  return Boolean(raw && typeof raw === "object" && (raw as Record<string, unknown>).__advisacorSyntheticTotal);
}

function findNativeExplicit(rows: AmountRow[], patterns: RegExp[]): number | null {
  const match = rows.find(
    (row) => !isSyntheticRow(row) && patterns.some((pattern) => pattern.test(String(row.label || ""))),
  );
  if (!match) return null;
  const amount = Number(match.amount);
  return Number.isFinite(amount) ? amount : null;
}

/** Prefer explicit Total* rows before bare account labels. */
function findNativePreferTotal(rows: AmountRow[], totalPatterns: RegExp[], fallbackPatterns: RegExp[] = []): number | null {
  const total = findNativeExplicit(rows, totalPatterns);
  if (total != null) return total;
  if (!fallbackPatterns.length) return null;
  return findNativeExplicit(rows, fallbackPatterns);
}

function sumNativeSectionLeaves(rows: AmountRow[], sectionPattern: RegExp): number | null {
  const leaves = rows.filter((row) => {
    if (isSyntheticRow(row)) return false;
    if (!sectionPattern.test(String(row.section || ""))) return false;
    const label = String(row.label || "");
    if (/^total\b/i.test(label) || /net (income|profit)|gross profit/i.test(label)) return false;
    return true;
  });
  if (!leaves.length) return null;
  return leaves.reduce((total, row) => total + Number(row.amount || 0), 0);
}

/** Native cash total from provider BS rows (aggregates preferred; else bank/cash leaves). */
export function extractNativeCashTotal(rows: CanonicalBalanceSheetRow[] = []): number | null {
  const explicit = findNativeExplicit(rows, [
    /^(total\s+)?cash and cash equivalents?$/i,
    /^total\s+bank accounts?$/i,
    /^total\s+cash$/i,
  ]);
  if (explicit != null) return explicit;
  return sumNativeSectionLeaves(rows, /cash and cash equivalents?|bank accounts?/i);
}

/**
 * Canonical cash for control = asset-side cash/bank LEAVES only.
 * Comparing provider aggregates to leaf sums catches classification / rollup errors.
 */
export function sumCanonicalCashLeaves(rows: CanonicalBalanceSheetRow[] = []): number | null {
  const leaves = rows.filter(
    (row) =>
      isAssetSideBalanceSheetRow(row) &&
      isCashOrBankRelated(row) &&
      !isBalanceSheetSummaryOrTotalRow(row),
  );
  if (!leaves.length) return null;
  return leaves.reduce((total, row) => total + Number(row.amount || 0), 0);
}

/** Native AR total from provider BS rows. */
export function extractNativeArTotal(rows: CanonicalBalanceSheetRow[] = []): number | null {
  const explicit = findNativePreferTotal(
    rows,
    [/^total accounts? receivable$/i, /^total\s+a\/?r$/i],
    [/^accounts? receivable$/i],
  );
  if (explicit != null) return explicit;
  return sumNativeSectionLeaves(rows, /accounts? receivable|^a\/?r$/i);
}

export function extractNativeRevenue(rows: CanonicalPnLRow[] = []): number | null {
  return findNativeExplicit(rows, [/^total (income|revenue|sales)$/i]);
}

/** Leaf revenue sum (excludes totals) — canonical side of revenue control. */
export function sumCanonicalRevenueLeaves(rows: CanonicalPnLRow[] = []): number | null {
  const leaves = rows.filter((row) => {
    if (isSyntheticRow(row)) return false;
    if (!/^(revenue|income|sales)$/i.test(String(row.section || ""))) return false;
    const label = String(row.label || "");
    if (/^total\b/i.test(label) || /net (income|profit)|^profit$/i.test(label) || /gross profit/i.test(label)) {
      return false;
    }
    return true;
  });
  if (!leaves.length) return null;
  return leaves.reduce((total, row) => total + Number(row.amount || 0), 0);
}

export function extractNativeCogs(rows: CanonicalPnLRow[] = []): number | null {
  const explicit = findNativeExplicit(rows, [/^total (cost of sales|cost of goods sold|cogs)$/i]);
  if (explicit != null) return Math.abs(explicit);
  const sectionSum = sumNativeSectionLeaves(rows, /cost of sales|cogs/i);
  return sectionSum == null ? null : Math.abs(sectionSum);
}

export function sumCanonicalCogsLeaves(rows: CanonicalPnLRow[] = []): number | null {
  const leaves = rows.filter((row) => {
    if (isSyntheticRow(row)) return false;
    if (!/cost of sales|cogs/i.test(String(row.section || ""))) return false;
    const label = String(row.label || "");
    if (/^total\b/i.test(label)) return false;
    return true;
  });
  if (!leaves.length) return null;
  return Math.abs(leaves.reduce((total, row) => total + Number(row.amount || 0), 0));
}

export function extractNativeGrossProfit(rows: CanonicalPnLRow[] = []): number | null {
  if (!hasExplicitGrossProfitRow(rows)) return null;
  return findNativeExplicit(rows, [/gross profit/i]);
}

export function extractNativeNetIncome(rows: CanonicalPnLRow[] = []): number | null {
  return findNativeExplicit(rows, [/^net (income|profit)$/i, /^profit$/i]);
}

/** Reconstruct NI from statement components — never trust the explicit NI line alone. */
export function reconstructCanonicalNetIncome(rows: CanonicalPnLRow[] = []): number | null {
  const mapped = buildMappedFinancialSummary([], rows);
  if (!extractNativeRevenue(rows) && sumCanonicalRevenueLeaves(rows) == null) return null;
  return mapped.revenue - mapped.cogs - mapped.expenses + mapped.otherIncome - mapped.otherExpenses;
}

function buildLine(input: {
  key: StatementControlLineKey;
  label: string;
  nativeAmount: number | null;
  canonicalAmount: number | null;
  toleranceDollar: number;
}): StatementControlLine {
  const { key, label, nativeAmount, canonicalAmount, toleranceDollar } = input;
  if (nativeAmount == null || canonicalAmount == null || !Number.isFinite(nativeAmount) || !Number.isFinite(canonicalAmount)) {
    return {
      key,
      label,
      nativeAmount,
      canonicalAmount,
      variance: null,
      varianceAbs: null,
      toleranceDollar,
      status: "unavailable",
      passes: false,
      reason: `${label} control unavailable — missing native or canonical amount`,
    };
  }
  const variance = canonicalAmount - nativeAmount;
  const varianceAbs = Math.abs(variance);
  if (varianceAbs <= toleranceDollar) {
    return {
      key,
      label,
      nativeAmount,
      canonicalAmount,
      variance,
      varianceAbs,
      toleranceDollar,
      status: varianceAbs === 0 ? "tie" : "auto_cleared",
      passes: true,
      reason:
        varianceAbs === 0
          ? `${label} ties exactly to the provider statement`
          : `${label} ties within $${toleranceDollar} tolerance`,
    };
  }
  return {
    key,
    label,
    nativeAmount,
    canonicalAmount,
    variance,
    varianceAbs,
    toleranceDollar,
    status: "fail",
    passes: false,
    reason: `${label} material mismatch — canonical ${canonicalAmount} vs native ${nativeAmount}`,
  };
}

function linePassesOrUnavailable(line: StatementControlLine | undefined): boolean {
  if (!line) return true;
  if (line.status === "unavailable") return true;
  return line.passes;
}

/**
 * Compare native statement totals (from already-normalized provider rows)
 * to canonical Advisacor facts. No provider API calls.
 */
export function buildStatementControl(input: {
  balanceSheet?: CanonicalBalanceSheetRow[];
  incomeStatement?: CanonicalPnLRow[];
  cashPosition?: CashPositionResolution;
  computedAt?: string;
  toleranceDollar?: number;
}): StatementControlResult {
  const toleranceDollar = input.toleranceDollar ?? STATEMENT_CONTROL_TOLERANCE_DOLLAR;
  const balanceSheet = input.balanceSheet || [];
  const incomeStatement = input.incomeStatement || [];
  const mapped = buildMappedFinancialSummary(balanceSheet, incomeStatement);
  const cashPosition = input.cashPosition ?? resolveCashPositionFromBalanceSheet(balanceSheet);

  const cashCanonicalLeaves = sumCanonicalCashLeaves(balanceSheet);
  const cashNative = extractNativeCashTotal(balanceSheet);
  // Prefer aggregate↔leaves when aggregate exists; else fall back to position resolver.
  const cashCanonical =
    cashNative != null && cashCanonicalLeaves != null
      ? cashCanonicalLeaves
      : cashPosition.status === "SOURCE_MISSING"
        ? null
        : cashPosition.amount;
  const cashLine = buildLine({
    key: "cash",
    label: "Cash",
    nativeAmount: cashNative,
    canonicalAmount: cashCanonical,
    toleranceDollar,
  });

  const arNative = extractNativeArTotal(balanceSheet);
  const arCanonicalLeaves = sumBalanceSheetAccountsReceivable(balanceSheet);
  const arLine = buildLine({
    key: "ar",
    label: "Accounts Receivable",
    nativeAmount: arNative,
    canonicalAmount: Number.isFinite(arCanonicalLeaves) ? arCanonicalLeaves : null,
    toleranceDollar,
  });

  const assetsLine = buildLine({
    key: "total_assets",
    label: "Total Assets",
    nativeAmount: findNativeExplicit(balanceSheet, [/^total assets$/i]),
    canonicalAmount: mapped.totalAssets,
    toleranceDollar,
  });

  const liabilitiesLine = buildLine({
    key: "total_liabilities",
    label: "Total Liabilities",
    nativeAmount: findNativeExplicit(balanceSheet, [/^total liabilities$/i]),
    canonicalAmount: mapped.totalLiabilities,
    toleranceDollar,
  });

  const equityLine = buildLine({
    key: "total_equity",
    label: "Total Equity",
    nativeAmount: findNativeExplicit(balanceSheet, [/^total equity$/i]),
    canonicalAmount: mapped.totalEquity,
    toleranceDollar,
  });

  const equationVariance =
    Number.isFinite(mapped.totalAssets) &&
    Number.isFinite(mapped.totalLiabilities) &&
    Number.isFinite(mapped.totalEquity)
      ? mapped.totalAssets - (mapped.totalLiabilities + mapped.totalEquity)
      : null;
  const equationLine: StatementControlLine =
    equationVariance == null
      ? {
          key: "bs_equation",
          label: "Accounting equation (A = L + E)",
          nativeAmount: null,
          canonicalAmount: null,
          variance: null,
          varianceAbs: null,
          toleranceDollar,
          status: "unavailable",
          passes: false,
          reason: "Accounting equation unavailable",
        }
      : {
          key: "bs_equation",
          label: "Accounting equation (A = L + E)",
          nativeAmount: mapped.totalLiabilities + mapped.totalEquity,
          canonicalAmount: mapped.totalAssets,
          variance: equationVariance,
          varianceAbs: Math.abs(equationVariance),
          toleranceDollar,
          status: Math.abs(equationVariance) <= toleranceDollar ? (equationVariance === 0 ? "tie" : "auto_cleared") : "fail",
          passes: Math.abs(equationVariance) <= toleranceDollar,
          reason:
            Math.abs(equationVariance) <= toleranceDollar
              ? "Assets tie to liabilities + equity within tolerance"
              : "Accounting equation failure — assets do not equal liabilities + equity",
        };

  const revenueNative = extractNativeRevenue(incomeStatement);
  const revenueLeaves = sumCanonicalRevenueLeaves(incomeStatement);
  const revenueLine = buildLine({
    key: "revenue",
    label: "Revenue",
    nativeAmount: revenueNative,
    canonicalAmount: revenueLeaves ?? (revenueNative != null ? mapped.revenue : null),
    toleranceDollar,
  });

  const cogsNative = extractNativeCogs(incomeStatement);
  const cogsLeaves = sumCanonicalCogsLeaves(incomeStatement);
  const cogsLine = buildLine({
    key: "cogs",
    label: "COGS",
    nativeAmount: cogsNative,
    canonicalAmount: cogsLeaves ?? (cogsNative != null ? mapped.cogs : null),
    toleranceDollar,
  });

  const gpNative = extractNativeGrossProfit(incomeStatement);
  const gpCanonical =
    revenueNative != null && cogsNative != null
      ? revenueNative - cogsNative
      : mapped.grossProfit;
  const gpLine = buildLine({
    key: "gross_profit",
    label: "Gross Profit",
    nativeAmount: gpNative,
    canonicalAmount: gpNative != null ? gpCanonical : null,
    toleranceDollar,
  });

  const niNative = extractNativeNetIncome(incomeStatement);
  const niReconstructed = reconstructCanonicalNetIncome(incomeStatement);
  const niLine = buildLine({
    key: "net_income",
    label: "Net Income",
    nativeAmount: niNative,
    canonicalAmount: niReconstructed,
    toleranceDollar,
  });

  const bsLines = [cashLine, arLine, assetsLine, liabilitiesLine, equityLine, equationLine];
  const plLines = [revenueLine, cogsLine, gpLine, niLine];

  const equationPasses = equationLine.passes || equationLine.status === "unavailable";
  // BS "passes" for overall reporting when equation holds and material totals that exist tie.
  const balanceSheetPasses =
    equationPasses &&
    [assetsLine, liabilitiesLine, equityLine].every(linePassesOrUnavailable) &&
    cashLine.status !== "fail" &&
    arLine.status !== "fail";

  const incomeStatementPasses =
    [revenueLine, niLine].every(linePassesOrUnavailable) &&
    cogsLine.status !== "fail" &&
    gpLine.status !== "fail";

  // KPI gates (granular):
  // - Cash requires cash line pass when cash is present
  // - NPM requires revenue + NI control pass
  // - OGM requires revenue + (COGS or explicit GP) control pass
  const cashControlPasses =
    cashPosition.status === "SOURCE_MISSING"
      ? true
      : cashLine.passes;
  const arControlPasses = arLine.status === "unavailable" ? true : arLine.passes;
  const netProfitMarginControlPasses = revenueLine.passes && niLine.passes;
  const operatingGrossMarginControlPasses =
    revenueLine.passes && (cogsLine.passes || (gpLine.status !== "unavailable" && gpLine.passes));

  return {
    computedAt: input.computedAt || new Date().toISOString(),
    toleranceDollar,
    balanceSheet: {
      lines: bsLines,
      passes: balanceSheetPasses,
      equationPasses,
    },
    incomeStatement: {
      lines: plLines,
      passes: incomeStatementPasses,
    },
    cashControlPasses,
    arControlPasses,
    netProfitMarginControlPasses,
    operatingGrossMarginControlPasses,
    overallPasses: balanceSheetPasses && incomeStatementPasses,
  };
}

/** Find a control line by key. */
export function getStatementControlLine(
  control: StatementControlResult | null | undefined,
  key: StatementControlLineKey,
): StatementControlLine | null {
  if (!control) return null;
  return (
    control.balanceSheet.lines.find((line) => line.key === key) ||
    control.incomeStatement.lines.find((line) => line.key === key) ||
    null
  );
}
