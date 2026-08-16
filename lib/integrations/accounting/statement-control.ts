/**
 * Sync-time financial statement control.
 *
 * Architecture (independence is mandatory):
 *   Provider sync
 *   → native BS/P&L totals from RAW provider report objects
 *   → adapter normalize → Advisacor rows
 *   → canonical facts from normalized rows ONLY
 *   → compare native vs canonical (provider-neutral math)
 *   → stamp statementControl + statementControlContractVersion on payload
 *   → Scorecard reads snapshot only (zero ERP calls on dashboard load)
 *
 * Never derive native and canonical from the same already-normalized row set.
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
import type {
  CanonicalStatementFacts,
  NativeStatementTotals,
} from "./native-statement-totals";

/** Exact cent tolerance for USD/CAD statement validation (not $1). */
export const STATEMENT_CONTROL_TOLERANCE_DOLLAR = 0.01;

/** Contract version stamped on new syncs — missing control fails closed when >= 1. */
export const STATEMENT_CONTROL_CONTRACT_VERSION = 1;

export type StatementControlLineStatus =
  | "tie"
  | "auto_cleared"
  | "fail"
  | "unavailable";

export type StatementControlLineKey =
  | "cash"
  | "ar"
  | "inventory"
  | "net_fixed_assets"
  | "ap"
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
  /** Cent-level tolerance for native ↔ canonical ties. */
  toleranceDollar: number;
  /** Provenance: which raw native object was compared. */
  nativeSource: NativeStatementTotals["source"] | null;
  nativeBalanceSheetReportRef: string | null;
  nativeProfitAndLossReportRef: string | null;
  /** True when native and canonical periods were compared and matched (or not both provided). */
  periodAligned: boolean;
  periodMismatchReason: string | null;
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

function findCanonicalExplicit(rows: AmountRow[], patterns: RegExp[]): number | null {
  const match = rows.find(
    (row) => !isSyntheticRow(row) && patterns.some((pattern) => pattern.test(String(row.label || ""))),
  );
  if (!match) return null;
  const amount = Number(match.amount);
  return Number.isFinite(amount) ? amount : null;
}

function sumCanonicalSectionLeaves(rows: AmountRow[], sectionPattern: RegExp): number | null {
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

export function sumCanonicalInventoryLeaves(rows: CanonicalBalanceSheetRow[] = []): number | null {
  const explicit = findCanonicalExplicit(rows, [/^total inventory$/i, /^inventory$/i]);
  if (explicit != null) return explicit;
  return sumCanonicalSectionLeaves(rows, /inventory/i);
}

export function sumCanonicalNetFixedAssets(rows: CanonicalBalanceSheetRow[] = []): number | null {
  const explicit = findCanonicalExplicit(rows, [
    /^net (fixed assets|property,? plant)/i,
    /^total fixed assets$/i,
    /^net property and equipment$/i,
  ]);
  if (explicit != null) return explicit;
  return sumCanonicalSectionLeaves(rows, /fixed assets|property.?plant|ppe/i);
}

export function sumCanonicalApLeaves(rows: CanonicalBalanceSheetRow[] = []): number | null {
  const explicit = findCanonicalExplicit(rows, [/^total accounts? payable$/i, /^accounts? payable$/i]);
  if (explicit != null) return explicit;
  return sumCanonicalSectionLeaves(rows, /accounts? payable|^a\/?p$/i);
}

/** Reconstruct NI from statement components — never trust the explicit NI line alone. */
export function reconstructCanonicalNetIncome(rows: CanonicalPnLRow[] = []): number | null {
  const mapped = buildMappedFinancialSummary([], rows);
  if (sumCanonicalRevenueLeaves(rows) == null && findCanonicalExplicit(rows, [/^total (income|revenue|sales)$/i]) == null) {
    return null;
  }
  return mapped.revenue - mapped.cogs - mapped.expenses + mapped.otherIncome - mapped.otherExpenses;
}

/**
 * Canonical facts from Advisacor-normalized rows ONLY.
 * Must never read sourceMetadata.raw report trees.
 */
export function buildCanonicalStatementFactsFromNormalized(input: {
  balanceSheet?: CanonicalBalanceSheetRow[];
  incomeStatement?: CanonicalPnLRow[];
  cashPosition?: CashPositionResolution;
}): CanonicalStatementFacts {
  const balanceSheet = input.balanceSheet || [];
  const incomeStatement = input.incomeStatement || [];
  const mapped = buildMappedFinancialSummary(balanceSheet, incomeStatement);
  const cashPosition = input.cashPosition ?? resolveCashPositionFromBalanceSheet(balanceSheet);
  const cashLeaves = sumCanonicalCashLeaves(balanceSheet);
  const revenueLeaves = sumCanonicalRevenueLeaves(incomeStatement);
  const cogsLeaves = sumCanonicalCogsLeaves(incomeStatement);
  const ar = sumBalanceSheetAccountsReceivable(balanceSheet);
  const revenue = revenueLeaves ?? findCanonicalExplicit(incomeStatement, [/^total (income|revenue|sales)$/i]);
  const cogs = cogsLeaves ?? (() => {
    const explicit = findCanonicalExplicit(incomeStatement, [/^total (cost of sales|cost of goods sold|cogs)$/i]);
    return explicit == null ? null : Math.abs(explicit);
  })();
  const gpExplicit = hasExplicitGrossProfitRow(incomeStatement)
    ? findCanonicalExplicit(incomeStatement, [/gross profit/i])
    : null;
  const grossProfit =
    revenue != null && cogs != null ? revenue - cogs : gpExplicit;

  return {
    cash:
      cashLeaves != null
        ? cashLeaves
        : cashPosition.status === "SOURCE_MISSING"
          ? null
          : cashPosition.amount,
    ar: Number.isFinite(ar) ? ar : null,
    inventory: sumCanonicalInventoryLeaves(balanceSheet),
    netFixedAssets: sumCanonicalNetFixedAssets(balanceSheet),
    ap: sumCanonicalApLeaves(balanceSheet),
    totalAssets: Number.isFinite(mapped.totalAssets) ? mapped.totalAssets : null,
    totalLiabilities: Number.isFinite(mapped.totalLiabilities) ? mapped.totalLiabilities : null,
    totalEquity: Number.isFinite(mapped.totalEquity) ? mapped.totalEquity : null,
    revenue,
    cogs,
    grossProfit,
    netIncome: reconstructCanonicalNetIncome(incomeStatement),
  };
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
 * Compare independently extracted native totals to independently computed
 * canonical facts. No provider API calls. No shared row-set extraction.
 *
 * When both nativePeriod and canonicalPeriod are provided and differ,
 * fail closed — all KPI control gates become false.
 */
export function buildStatementControl(input: {
  /** Required: totals from RAW QBO report JSON or Xero pre-normalize flattened cells. */
  native: NativeStatementTotals | null;
  /** Required: facts from Advisacor-normalized rows only. */
  canonical: CanonicalStatementFacts;
  /** Optional cash position for SOURCE_MISSING gating. */
  cashPosition?: CashPositionResolution;
  computedAt?: string;
  toleranceDollar?: number;
  /** Provider-reported statement period (as-of / P&L window). */
  nativePeriod?: { startDate?: string | null; endDate?: string | null } | null;
  /** Canonical sync report period Advisacor stamped for this snapshot. */
  canonicalPeriod?: { startDate?: string | null; endDate?: string | null } | null;
}): StatementControlResult {
  const toleranceDollar = input.toleranceDollar ?? STATEMENT_CONTROL_TOLERANCE_DOLLAR;
  const native = input.native;
  const canonical = input.canonical;
  const cashPosition = input.cashPosition;

  const nativeStart = String(input.nativePeriod?.startDate ?? native?.period.startDate ?? "").trim();
  const nativeEnd = String(input.nativePeriod?.endDate ?? native?.period.endDate ?? "").trim();
  const canonicalStart = String(input.canonicalPeriod?.startDate || "").trim();
  const canonicalEnd = String(input.canonicalPeriod?.endDate || "").trim();
  const bothPeriodsProvided =
    Boolean(nativeStart || nativeEnd) && Boolean(canonicalStart || canonicalEnd);
  const periodAligned =
    !bothPeriodsProvided ||
    (nativeStart === canonicalStart && nativeEnd === canonicalEnd);
  const periodMismatchReason = periodAligned
    ? null
    : `Same-sync period mismatch — native ${nativeStart || "?"}→${nativeEnd || "?"} vs canonical ${canonicalStart || "?"}→${canonicalEnd || "?"}`;

  const missingNative = !native;
  const cashLine = buildLine({
    key: "cash",
    label: "Cash",
    nativeAmount: missingNative ? null : native.cash,
    canonicalAmount: canonical.cash,
    toleranceDollar,
  });
  const arLine = buildLine({
    key: "ar",
    label: "Accounts Receivable",
    nativeAmount: missingNative ? null : native.ar,
    canonicalAmount: canonical.ar,
    toleranceDollar,
  });
  const inventoryLine = buildLine({
    key: "inventory",
    label: "Inventory",
    nativeAmount: missingNative ? null : native.inventory,
    canonicalAmount: canonical.inventory,
    toleranceDollar,
  });
  const netFaLine = buildLine({
    key: "net_fixed_assets",
    label: "Net Fixed Assets",
    nativeAmount: missingNative ? null : native.netFixedAssets,
    canonicalAmount: canonical.netFixedAssets,
    toleranceDollar,
  });
  const apLine = buildLine({
    key: "ap",
    label: "Accounts Payable",
    nativeAmount: missingNative ? null : native.ap,
    canonicalAmount: canonical.ap,
    toleranceDollar,
  });
  const assetsLine = buildLine({
    key: "total_assets",
    label: "Total Assets",
    nativeAmount: missingNative ? null : native.totalAssets,
    canonicalAmount: canonical.totalAssets,
    toleranceDollar,
  });
  const liabilitiesLine = buildLine({
    key: "total_liabilities",
    label: "Total Liabilities",
    nativeAmount: missingNative ? null : native.totalLiabilities,
    canonicalAmount: canonical.totalLiabilities,
    toleranceDollar,
  });
  const equityLine = buildLine({
    key: "total_equity",
    label: "Total Equity",
    nativeAmount: missingNative ? null : native.totalEquity,
    canonicalAmount: canonical.totalEquity,
    toleranceDollar,
  });

  const assets = canonical.totalAssets;
  const liabilities = canonical.totalLiabilities;
  const equity = canonical.totalEquity;
  const equationVariance =
    assets != null &&
    liabilities != null &&
    equity != null &&
    Number.isFinite(assets) &&
    Number.isFinite(liabilities) &&
    Number.isFinite(equity)
      ? assets - (liabilities + equity)
      : null;
  const equationLine: StatementControlLine =
    equationVariance == null || assets == null || liabilities == null || equity == null
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
          nativeAmount: liabilities + equity,
          canonicalAmount: assets,
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

  const revenueLine = buildLine({
    key: "revenue",
    label: "Revenue",
    nativeAmount: missingNative ? null : native.revenue,
    canonicalAmount: canonical.revenue,
    toleranceDollar,
  });
  const cogsLine = buildLine({
    key: "cogs",
    label: "COGS",
    nativeAmount: missingNative ? null : native.cogs,
    canonicalAmount: canonical.cogs,
    toleranceDollar,
  });
  const gpLine = buildLine({
    key: "gross_profit",
    label: "Gross Profit",
    nativeAmount: missingNative ? null : native.grossProfit,
    canonicalAmount: canonical.grossProfit,
    toleranceDollar,
  });
  const niLine = buildLine({
    key: "net_income",
    label: "Net Income",
    nativeAmount: missingNative ? null : native.netIncome,
    canonicalAmount: canonical.netIncome,
    toleranceDollar,
  });

  const bsLines = [
    cashLine,
    arLine,
    inventoryLine,
    netFaLine,
    apLine,
    assetsLine,
    liabilitiesLine,
    equityLine,
    equationLine,
  ];
  const plLines = [revenueLine, cogsLine, gpLine, niLine];

  const equationPasses = equationLine.passes || equationLine.status === "unavailable";
  const balanceSheetPasses =
    equationPasses &&
    [assetsLine, liabilitiesLine, equityLine].every(linePassesOrUnavailable) &&
    cashLine.status !== "fail" &&
    arLine.status !== "fail" &&
    inventoryLine.status !== "fail" &&
    netFaLine.status !== "fail" &&
    apLine.status !== "fail";

  const incomeStatementPasses =
    [revenueLine, niLine].every(linePassesOrUnavailable) &&
    cogsLine.status !== "fail" &&
    gpLine.status !== "fail";

  const cashMissing =
    cashPosition?.status === "SOURCE_MISSING" ||
    (canonical.cash == null && (missingNative || native.cash == null));
  const cashControlPasses =
    periodAligned &&
    !missingNative &&
    (cashMissing ? true : cashLine.passes);
  const arControlPasses =
    periodAligned && !missingNative && (arLine.status === "unavailable" ? true : arLine.passes);
  const netProfitMarginControlPasses =
    periodAligned && !missingNative && revenueLine.passes && niLine.passes;
  const operatingGrossMarginControlPasses =
    periodAligned &&
    !missingNative &&
    revenueLine.passes &&
    (cogsLine.passes || (gpLine.status !== "unavailable" && gpLine.passes));

  return {
    computedAt: input.computedAt || new Date().toISOString(),
    toleranceDollar,
    nativeSource: native?.source ?? null,
    nativeBalanceSheetReportRef: native?.balanceSheetReportRef ?? null,
    nativeProfitAndLossReportRef: native?.profitAndLossReportRef ?? null,
    periodAligned,
    periodMismatchReason,
    balanceSheet: {
      lines: bsLines,
      passes: periodAligned && !missingNative && balanceSheetPasses,
      equationPasses: periodAligned && equationPasses,
    },
    incomeStatement: {
      lines: plLines,
      passes: periodAligned && !missingNative && incomeStatementPasses,
    },
    cashControlPasses,
    arControlPasses,
    netProfitMarginControlPasses,
    operatingGrossMarginControlPasses,
    overallPasses: periodAligned && !missingNative && balanceSheetPasses && incomeStatementPasses,
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

/**
 * Scorecard gate helper: contract v1+ fails closed when control is missing.
 * Legacy payloads (no contract version) preserve pre-control Scorecard behavior.
 */
export function statementControlAllowsKpi(input: {
  contractVersion?: number | null;
  statementControl?: StatementControlResult | null;
  gate: "cash" | "ar" | "npm" | "ogm";
}): boolean {
  const version = Number(input.contractVersion || 0);
  const control = input.statementControl ?? null;
  if (version >= STATEMENT_CONTROL_CONTRACT_VERSION) {
    if (!control) return false;
    if (input.gate === "cash") return control.cashControlPasses === true;
    if (input.gate === "ar") return control.arControlPasses === true;
    if (input.gate === "npm") return control.netProfitMarginControlPasses === true;
    return control.operatingGrossMarginControlPasses === true;
  }
  // Legacy: missing control allows (pre-#277 snapshots).
  if (!control) return true;
  if (input.gate === "cash") return control.cashControlPasses !== false;
  if (input.gate === "ar") return control.arControlPasses !== false;
  if (input.gate === "npm") return control.netProfitMarginControlPasses !== false;
  return control.operatingGrossMarginControlPasses !== false;
}
