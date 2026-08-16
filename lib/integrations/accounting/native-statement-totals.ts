/**
 * Provider-native statement totals extracted from RAW report responses.
 *
 * Critical independence rule:
 * - Native totals come ONLY from raw provider report trees (QBO) or
 *   pre-canonical flattened report cells (Xero), NEVER from Advisacor
 *   normalized Balance Sheet / P&L rows.
 * - Canonical facts are computed separately from normalized rows.
 *
 * QBO CA cash bug class (live Demo B):
 *   Header "Cash and Cash Equivalent" (empty amount) must NOT win over
 *   Summary "Total Cash and Cash Equivalent" (21095.57) or bank leaves.
 */

import { parseAmountOrZero } from "@/lib/parse/amount";
import { humanizeQuickBooksReportToken } from "./normalizers/qbo-report-tokens";

export const NATIVE_STATEMENT_SOURCE_QBO = "quickbooks_raw_report" as const;
export const NATIVE_STATEMENT_SOURCE_XERO = "xero_raw_report_rows" as const;

export type NativeStatementSource =
  | typeof NATIVE_STATEMENT_SOURCE_QBO
  | typeof NATIVE_STATEMENT_SOURCE_XERO;

export type NativeRowRole = "header" | "data" | "summary";

export type NativeStatementTotals = {
  source: NativeStatementSource;
  /** Provenance: which raw objects were read. */
  balanceSheetReportRef: string;
  profitAndLossReportRef: string;
  period: { startDate: string | null; endDate: string | null };
  /** True when period P&L is a known empty stub (e.g. CA NetIncome/PROFIT only). */
  profitAndLossStub?: boolean;
  cash: number | null;
  ar: number | null;
  inventory: number | null;
  netFixedAssets: number | null;
  ap: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  revenue: number | null;
  cogs: number | null;
  grossProfit: number | null;
  netIncome: number | null;
};

export type CanonicalStatementFacts = {
  cash: number | null;
  ar: number | null;
  inventory: number | null;
  netFixedAssets: number | null;
  ap: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  revenue: number | null;
  cogs: number | null;
  grossProfit: number | null;
  netIncome: number | null;
};

export type NativeStatementSide = "asset" | "liability" | "equity" | "unknown";

export type FlatNativeRow = {
  label: string;
  /** Raw vendor label before humanization (for diagnostics). */
  rawLabel: string;
  amount: number | null;
  hasAmount: boolean;
  role: NativeRowRole;
  /** Structural section at this node (humanized). */
  section: string;
  /** Full hierarchy path from report root to this node (humanized). */
  hierarchyPath: string[];
  /** Balance-sheet side inferred from hierarchy/section; fail-closed when unknown. */
  side: NativeStatementSide;
};

function colValue(col: unknown): string {
  const record = col as Record<string, unknown> | undefined;
  return String(record?.value ?? record?.Value ?? "");
}

function asRowArray(row: unknown): unknown[] {
  if (Array.isArray(row)) return row;
  if (row && typeof row === "object") return [row];
  return [];
}

/** Read amount from ColData; empty / missing → null (never invent 0). */
function readAmountFromCols(cols: unknown[]): { amount: number | null; hasAmount: boolean } {
  if (cols.length <= 1) return { amount: null, hasAmount: false };
  for (let i = cols.length - 1; i >= 1; i -= 1) {
    const value = colValue(cols[i]).trim();
    if (value !== "") return { amount: parseAmountOrZero(value), hasAmount: true };
  }
  return { amount: null, hasAmount: false };
}

const LIABILITY_PATH =
  /\bliabilit|\bpayable\b|\bcredit cards?\b|\boverdraft\b|\bloans?\b|\bequity\b/i;
const ASSET_PATH =
  /\bassets?\b|\bcurrent assets?\b|\bother current assets?\b|\bfixed assets?\b|\bcash and cash equivalents?\b|\bbank accounts?\b|\bcash at bank\b/i;

/** Infer BS side from hierarchy path + section. Unknown → fail closed for leaf cash fallback. */
export function inferNativeStatementSide(hierarchyPath: string[], section = ""): NativeStatementSide {
  const hints = [...hierarchyPath, section].map((part) => String(part || "").trim()).filter(Boolean);
  if (!hints.length) return "unknown";
  const joined = hints.join(" | ");
  if (LIABILITY_PATH.test(joined)) {
    if (/\bequity\b/i.test(joined) && !/\bliabilit|\bpayable\b|\bcredit cards?\b|\boverdraft\b/i.test(joined)) {
      return "equity";
    }
    return "liability";
  }
  if (ASSET_PATH.test(joined)) return "asset";
  return "unknown";
}

function pushRow(
  out: FlatNativeRow[],
  label: string,
  cols: unknown[],
  role: NativeRowRole,
  hierarchyPath: string[],
  section: string,
  /**
   * Ancestry used for side inference. Must NOT include the row's own Total*
   * label — otherwise orphan "Total Bank Accounts" would self-classify as asset.
   */
  sidePath: string[] = hierarchyPath,
) {
  const trimmed = String(label || "").trim();
  if (!trimmed) return;
  const { amount, hasAmount } = readAmountFromCols(cols);
  const human = humanizeQuickBooksReportToken(trimmed);
  out.push({
    rawLabel: trimmed,
    label: human,
    amount,
    hasAmount,
    role,
    section,
    hierarchyPath,
    side: inferNativeStatementSide(sidePath, section),
  });
}

/**
 * Walk raw QBO report Rows tree into role-tagged rows with hierarchy path
 * propagated from section headers (Assets → Bank Accounts → Chequing).
 */
export function flattenQuickBooksRawReportRows(rows: unknown[] = []): FlatNativeRow[] {
  const out: FlatNativeRow[] = [];
  const walk = (nodes: unknown[], inheritedPath: string[] = [], inheritedSection = "") => {
    for (const node of asRowArray(nodes)) {
      const record = node as Record<string, unknown>;
      const header = record.Header as Record<string, unknown> | undefined;
      const summary = record.Summary as Record<string, unknown> | undefined;
      const colData = Array.isArray(record.ColData) ? record.ColData : [];
      const headerCols = Array.isArray(header?.ColData) ? (header.ColData as unknown[]) : [];
      const summaryCols = Array.isArray(summary?.ColData) ? (summary.ColData as unknown[]) : [];
      const nested = (record.Rows as Record<string, unknown> | undefined)?.Row;
      const groupToken = humanizeQuickBooksReportToken(
        String(record.group || record.Group || colValue(headerCols[0]) || ""),
      );
      const sectionPath =
        groupToken && inheritedPath[inheritedPath.length - 1] !== groupToken
          ? [...inheritedPath, groupToken]
          : inheritedPath;
      const section = groupToken || inheritedSection;

      if (headerCols.length) {
        const headerLabel = colValue(headerCols[0]);
        const headerHuman = humanizeQuickBooksReportToken(headerLabel);
        const headerPath =
          headerHuman && sectionPath[sectionPath.length - 1] !== headerHuman
            ? [...sectionPath, headerHuman]
            : sectionPath.length
              ? sectionPath
              : headerHuman
                ? [headerHuman]
                : inheritedPath;
        // Section headers define ancestry (Cash and Cash Equivalent → asset).
        pushRow(
          out,
          headerLabel,
          headerCols,
          "header",
          headerPath,
          inheritedSection || section,
          headerPath,
        );
      }

      if (colData.length) {
        const leafLabel = colValue(colData[0]);
        const leafHuman = humanizeQuickBooksReportToken(leafLabel);
        const leafPath =
          leafHuman && sectionPath[sectionPath.length - 1] !== leafHuman
            ? [...sectionPath, leafHuman]
            : sectionPath;
        // Side from section ancestry only — not the leaf/total label itself.
        pushRow(out, leafLabel, colData, "data", leafPath, section || inheritedSection, sectionPath);
      }

      if (nested != null) walk(asRowArray(nested), sectionPath, section || inheritedSection);

      if (summaryCols.length) {
        const summaryLabel = colValue(summaryCols[0]);
        const summaryHuman = humanizeQuickBooksReportToken(summaryLabel);
        const summaryPath =
          summaryHuman && sectionPath[sectionPath.length - 1] !== summaryHuman
            ? [...sectionPath, summaryHuman]
            : sectionPath;
        // Side from section ancestry only — orphan Total* stays unknown.
        pushRow(
          out,
          summaryLabel,
          summaryCols,
          "summary",
          summaryPath,
          section || inheritedSection,
          sectionPath,
        );
      }
    }
  };
  walk(rows);
  return out;
}

function matches(row: FlatNativeRow, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(row.label) || pattern.test(row.rawLabel));
}

/**
 * Prefer summary totals with an explicit amount, then data rows with amount.
 * Never accept header-only / empty-amount matches as numeric totals.
 */
function findAmount(
  rows: FlatNativeRow[],
  patterns: RegExp[],
  options: { preferRoles?: NativeRowRole[] } = {},
): number | null {
  const preferRoles = options.preferRoles || ["summary", "data"];
  for (const role of preferRoles) {
    const hit = rows.find((row) => row.role === role && row.hasAmount && matches(row, patterns));
    if (hit && hit.amount != null && Number.isFinite(hit.amount)) return hit.amount;
  }
  return null;
}

const CASH_TOTAL_PATTERNS = [
  /^total\s+cash and cash equivalents?$/i,
  /^total\s+bank accounts?$/i,
  /^total\s+cash$/i,
];

const CASH_SECTION_PATTERNS = [
  /^cash and cash equivalents?$/i,
  /^bank accounts?$/i,
];

const BANK_LEAF_PATTERNS = [
  /chequ(?:e|ing)|checking|savings|cash on hand|undeposited funds|petty cash|money market/i,
];

/**
 * Provider-neutral Cash Position policy (native statement control):
 * 1. Explicit Total* summary with amount and provable asset-side ancestry
 * 2. Else sum bank/cash data leaves that are explicitly asset-side via hierarchy
 * 3. Never treat empty section headers as cash = 0
 * 4. Never count liability/equity/unknown summaries or leaves — ambiguous → null
 * 5. Negative asset-side bank/cash balances are overdrafts, not Cash Position —
 *    clamp to 0 so native ties canonical after bank-overdraft reclassification
 */
const CASH_OVERDRAFT_EPS = 0.005;

/** Cash Position amount: overdraft (negative asset bank) contributes 0, not a negative cash balance. */
export function cashPositionAmountFromNative(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return amount < -CASH_OVERDRAFT_EPS ? 0 : amount;
}

function isAssetSideCashTotal(row: FlatNativeRow): boolean {
  return (
    row.hasAmount &&
    row.amount != null &&
    Number.isFinite(row.amount) &&
    matches(row, CASH_TOTAL_PATTERNS) &&
    row.side === "asset"
  );
}

export function extractNativeCashTotal(rows: FlatNativeRow[]): number | null {
  const totalHit = rows.find((row) => row.role === "summary" && isAssetSideCashTotal(row));
  if (totalHit) return cashPositionAmountFromNative(Number(totalHit.amount));

  // Data-role explicit totals are rare but require the same asset-side proof.
  const dataTotal = rows.find((row) => row.role === "data" && isAssetSideCashTotal(row));
  if (dataTotal) return cashPositionAmountFromNative(Number(dataTotal.amount));

  const leaves = rows.filter((row) => {
    if (row.role !== "data" || !row.hasAmount || row.amount == null) return false;
    if (/^total\b/i.test(row.label) || /^total\b/i.test(row.rawLabel)) return false;
    if (matches(row, CASH_SECTION_PATTERNS)) return false;
    // Asset-side hierarchy required — liability/unknown bank-looking labels excluded.
    if (row.side !== "asset") return false;
    return matches(row, BANK_LEAF_PATTERNS) || matches(row, [/cash/i]);
  });
  if (!leaves.length) return null;
  // Overdrafts excluded from Cash Position; remaining positive/zero cash summed.
  return leaves.reduce((sum, row) => sum + cashPositionAmountFromNative(Number(row.amount || 0)), 0);
}

/**
 * QBO CA period P&L stub: a lone NetIncome/PROFIT node with no amount / no Income section.
 * Must not be interpreted as Net Income = $0 for Scorecard authorization.
 */
export function isQuickBooksProfitAndLossStub(rows: FlatNativeRow[]): boolean {
  if (!rows.length) return true;
  const withAmount = rows.filter((row) => row.hasAmount);
  const hasIncomeEvidence = rows.some((row) =>
    matches(row, [/^total (income|revenue|sales)$/i, /^income$/i, /^revenue$/i]),
  );
  const onlyProfitStub =
    rows.length <= 2 &&
    rows.every((row) => matches(row, [/^net (income|profit)$/i, /^profit$/i])) &&
    !hasIncomeEvidence;
  return onlyProfitStub || (!hasIncomeEvidence && withAmount.length === 0);
}

function pickTotals(rows: FlatNativeRow[]): Omit<
  NativeStatementTotals,
  "source" | "balanceSheetReportRef" | "profitAndLossReportRef" | "period" | "profitAndLossStub"
> {
  return {
    cash: extractNativeCashTotal(rows),
    ar: findAmount(rows, [/^total accounts? receivable$/i, /^accounts? receivable$/i]),
    inventory: findAmount(rows, [/^total inventory$/i, /^inventory$/i]),
    netFixedAssets: findAmount(rows, [
      /^net (fixed assets|property,? plant)/i,
      /^total fixed assets$/i,
      /^net property and equipment$/i,
    ]),
    ap: findAmount(rows, [/^total accounts? payable$/i, /^accounts? payable$/i]),
    totalAssets: findAmount(rows, [/^total assets$/i]),
    totalLiabilities: findAmount(rows, [/^total liabilities$/i]),
    totalEquity: findAmount(rows, [/^total equity$/i]),
    revenue: findAmount(rows, [/^total (income|revenue|sales)$/i]),
    cogs: (() => {
      const value = findAmount(rows, [/^total (cost of sales|cost of goods sold|cogs)$/i]);
      return value == null ? null : Math.abs(value);
    })(),
    grossProfit: findAmount(rows, [/gross profit/i]),
    netIncome: findAmount(rows, [/^net (income|profit)$/i, /^profit$/i]),
  };
}

/**
 * Extract native totals from the live QBO fetch envelope
 * (`bundle.sourceMetadata.raw` / fetchReports result).
 */
export function extractNativeTotalsFromQuickBooksRaw(raw: unknown): NativeStatementTotals | null {
  if (!raw || typeof raw !== "object") return null;
  const envelope = raw as Record<string, unknown>;
  const reports = (envelope.reports || {}) as Record<string, { ok?: boolean; data?: Record<string, unknown> }>;
  const bsReport = reports.balanceSheet;
  const pnlReport = reports.profitAndLoss;
  const bsRows = ((bsReport?.data as Record<string, unknown> | undefined)?.Rows as Record<string, unknown> | undefined)?.Row;
  const pnlRows = ((pnlReport?.data as Record<string, unknown> | undefined)?.Rows as Record<string, unknown> | undefined)?.Row;
  if (!bsRows && !pnlRows) return null;

  const bsFlat = flattenQuickBooksRawReportRows(asRowArray(bsRows));
  const pnlFlat = flattenQuickBooksRawReportRows(asRowArray(pnlRows));
  const pnlStub = isQuickBooksProfitAndLossStub(pnlFlat);
  const bsTotals = pickTotals(bsFlat);
  const pnlTotals = pickTotals(pnlFlat);

  return {
    source: NATIVE_STATEMENT_SOURCE_QBO,
    balanceSheetReportRef: "sourceMetadata.raw.reports.balanceSheet.data.Rows.Row",
    profitAndLossReportRef: "sourceMetadata.raw.reports.profitAndLoss.data.Rows.Row",
    period: {
      startDate: envelope.start_date ? String(envelope.start_date) : null,
      endDate: envelope.end_date ? String(envelope.end_date) : null,
    },
    profitAndLossStub: pnlStub,
    cash: bsTotals.cash,
    ar: bsTotals.ar,
    inventory: bsTotals.inventory,
    netFixedAssets: bsTotals.netFixedAssets,
    ap: bsTotals.ap,
    totalAssets: bsTotals.totalAssets,
    totalLiabilities: bsTotals.totalLiabilities,
    totalEquity: bsTotals.totalEquity,
    revenue: pnlStub ? null : pnlTotals.revenue,
    cogs: pnlStub ? null : pnlTotals.cogs,
    grossProfit: pnlStub ? null : pnlTotals.grossProfit,
    netIncome: pnlStub ? null : pnlTotals.netIncome,
  };
}

/**
 * Extract native totals from Xero flattened report rows (pre-canonical normalize).
 * Hierarchy/side come from flattenXeroReportRows ancestry — Total* labels do not
 * self-classify as asset. Overdraft negatives are handled in extractNativeCashTotal.
 */
function hierarchyFromXeroRow(row: {
  label?: string;
  section?: string;
  hierarchyPath?: string[];
  raw?: unknown;
}): { hierarchyPath: string[]; sidePath: string[]; section: string; role: NativeRowRole } {
  const label = String(row.label || "");
  const section = String(row.section || "");
  const raw = row.raw && typeof row.raw === "object" ? (row.raw as Record<string, unknown>) : {};
  const fromRaw = Array.isArray(raw.__advisacorHierarchyPath)
    ? (raw.__advisacorHierarchyPath as unknown[]).map((part) => String(part || "").trim()).filter(Boolean)
    : [];
  const hierarchyPath = Array.isArray(row.hierarchyPath)
    ? row.hierarchyPath.map((part) => String(part || "").trim()).filter(Boolean)
    : fromRaw.length
      ? fromRaw
      : [section, label].filter(Boolean);
  const sourceSection = String(raw.__advisacorSourceSection || section || "");
  const rowType = String(raw.RowType || raw.rowType || "").toLowerCase();
  const role: NativeRowRole =
    rowType === "summaryrow" || rowType === "summary" || /^total\b/i.test(label)
      ? "summary"
      : "data";
  // Side from structural ancestry only — drop the row's own label / Total* leaf.
  const sidePath =
    hierarchyPath.length &&
    (hierarchyPath[hierarchyPath.length - 1] === label || /^total\b/i.test(hierarchyPath[hierarchyPath.length - 1]))
      ? hierarchyPath.slice(0, -1)
      : hierarchyPath;
  return { hierarchyPath, sidePath, section: sourceSection || section, role };
}

export function extractNativeTotalsFromXeroFlattenedRows(input: {
  balanceSheetRows: Array<{ label: string; amount: number; section?: string; hierarchyPath?: string[]; raw?: unknown; rowType?: string }>;
  profitAndLossRows: Array<{ label: string; amount: number; section?: string; hierarchyPath?: string[]; raw?: unknown }>;
  startDate?: string | null;
  endDate?: string | null;
}): NativeStatementTotals {
  const flat: FlatNativeRow[] = [
    ...input.balanceSheetRows.map((row) => {
      const label = String(row.label || "");
      const { hierarchyPath, sidePath, section, role } = hierarchyFromXeroRow(row);
      return {
        rawLabel: label,
        label,
        amount: Number.isFinite(Number(row.amount)) ? Number(row.amount) : null,
        hasAmount: Number.isFinite(Number(row.amount)),
        role,
        section,
        hierarchyPath,
        side: inferNativeStatementSide(sidePath, section),
      };
    }),
    ...input.profitAndLossRows.map((row) => {
      const label = String(row.label || "");
      const { hierarchyPath, section, role } = hierarchyFromXeroRow({
        ...row,
        // P&L role also treats GP / NI as summary.
      });
      const pnlRole: NativeRowRole =
        role === "summary" || /gross profit|net (income|profit)/i.test(label) ? "summary" : "data";
      return {
        rawLabel: label,
        label,
        amount: Number.isFinite(Number(row.amount)) ? Number(row.amount) : null,
        hasAmount: Number.isFinite(Number(row.amount)),
        role: pnlRole,
        section,
        hierarchyPath,
        side: "unknown" as const,
      };
    }),
  ];
  const totals = pickTotals(flat);
  return {
    source: NATIVE_STATEMENT_SOURCE_XERO,
    balanceSheetReportRef: "Reports/BalanceSheet → flattenXeroReportRows (pre-normalize)",
    profitAndLossReportRef: "Reports/ProfitAndLoss → flattenXeroReportRows (pre-normalize)",
    period: {
      startDate: input.startDate ? String(input.startDate) : null,
      endDate: input.endDate ? String(input.endDate) : null,
    },
    profitAndLossStub: false,
    ...totals,
  };
}

export function readNativeStatementTotalsFromBundleRaw(raw: unknown): NativeStatementTotals | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const stamped = record.nativeStatementTotals;
  if (stamped && typeof stamped === "object" && (stamped as NativeStatementTotals).source) {
    return stamped as NativeStatementTotals;
  }
  return extractNativeTotalsFromQuickBooksRaw(raw);
}
