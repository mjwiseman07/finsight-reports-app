/**
 * Provider-native statement totals extracted from RAW report responses.
 *
 * Critical independence rule:
 * - Native totals come ONLY from raw provider report trees (QBO) or
 *   pre-canonical flattened report cells (Xero), NEVER from Advisacor
 *   normalized Balance Sheet / P&L rows.
 * - Canonical facts are computed separately from normalized rows.
 */

import { parseAmountOrZero } from "@/lib/parse/amount";

export const NATIVE_STATEMENT_SOURCE_QBO = "quickbooks_raw_report" as const;
export const NATIVE_STATEMENT_SOURCE_XERO = "xero_raw_report_rows" as const;

export type NativeStatementSource =
  | typeof NATIVE_STATEMENT_SOURCE_QBO
  | typeof NATIVE_STATEMENT_SOURCE_XERO;

export type NativeStatementTotals = {
  source: NativeStatementSource;
  /** Provenance: which raw objects were read. */
  balanceSheetReportRef: string;
  profitAndLossReportRef: string;
  period: { startDate: string | null; endDate: string | null };
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

type FlatNativeRow = { label: string; amount: number };

function colValue(col: unknown): string {
  const record = col as Record<string, unknown> | undefined;
  return String(record?.value ?? record?.Value ?? "");
}

function asRowArray(row: unknown): unknown[] {
  if (Array.isArray(row)) return row;
  if (row && typeof row === "object") return [row];
  return [];
}

function readAmountFromCols(cols: unknown[]): number {
  if (cols.length <= 1) return 0;
  const atOne = colValue(cols[1]).trim();
  if (atOne !== "") return parseAmountOrZero(atOne);
  for (let i = cols.length - 1; i >= 1; i -= 1) {
    const value = colValue(cols[i]).trim();
    if (value !== "") return parseAmountOrZero(value);
  }
  return 0;
}

/** Walk raw QBO report Rows tree into label/amount pairs (independent of Advisacor normalize). */
export function flattenQuickBooksRawReportRows(rows: unknown[] = []): FlatNativeRow[] {
  const out: FlatNativeRow[] = [];
  const walk = (nodes: unknown[]) => {
    for (const node of asRowArray(nodes)) {
      const record = node as Record<string, unknown>;
      const header = record.Header as Record<string, unknown> | undefined;
      const summary = record.Summary as Record<string, unknown> | undefined;
      const colData = Array.isArray(record.ColData) ? record.ColData : [];
      const headerCols = Array.isArray(header?.ColData) ? (header.ColData as unknown[]) : [];
      const summaryCols = Array.isArray(summary?.ColData) ? (summary.ColData as unknown[]) : [];
      const nested = (record.Rows as Record<string, unknown> | undefined)?.Row;

      const leafLabel = colValue(colData[0]).trim();
      if (leafLabel) out.push({ label: leafLabel, amount: readAmountFromCols(colData) });

      const headerLabel = colValue(headerCols[0]).trim();
      if (headerLabel && headerCols.length > 1) {
        out.push({ label: headerLabel, amount: readAmountFromCols(headerCols) });
      }

      if (nested != null) walk(asRowArray(nested));

      const summaryLabel = colValue(summaryCols[0]).trim();
      if (summaryLabel) out.push({ label: summaryLabel, amount: readAmountFromCols(summaryCols) });
    }
  };
  walk(rows);
  return out;
}

function findAmount(rows: FlatNativeRow[], patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const hit = rows.find((row) => pattern.test(row.label));
    if (hit && Number.isFinite(hit.amount)) return hit.amount;
  }
  return null;
}

function pickTotals(rows: FlatNativeRow[]): Omit<
  NativeStatementTotals,
  "source" | "balanceSheetReportRef" | "profitAndLossReportRef" | "period"
> {
  return {
    cash: findAmount(rows, [
      /^(total\s+)?cash and cash equivalents?$/i,
      /^total\s+bank accounts?$/i,
      /^total\s+cash$/i,
    ]),
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

  const flat = [
    ...flattenQuickBooksRawReportRows(asRowArray(bsRows)),
    ...flattenQuickBooksRawReportRows(asRowArray(pnlRows)),
  ];
  const totals = pickTotals(flat);
  return {
    source: NATIVE_STATEMENT_SOURCE_QBO,
    balanceSheetReportRef: "sourceMetadata.raw.reports.balanceSheet.data.Rows.Row",
    profitAndLossReportRef: "sourceMetadata.raw.reports.profitAndLoss.data.Rows.Row",
    period: {
      startDate: envelope.start_date ? String(envelope.start_date) : null,
      endDate: envelope.end_date ? String(envelope.end_date) : null,
    },
    ...totals,
  };
}

/**
 * Extract native totals from Xero flattened report rows (pre-canonical normalize).
 * These are report cell amounts from `Reports[0].Rows` after flattenXeroReportRows,
 * NOT Advisacor classified/normalized rows.
 */
export function extractNativeTotalsFromXeroFlattenedRows(input: {
  balanceSheetRows: Array<{ label: string; amount: number }>;
  profitAndLossRows: Array<{ label: string; amount: number }>;
  startDate?: string | null;
  endDate?: string | null;
}): NativeStatementTotals {
  const flat: FlatNativeRow[] = [
    ...input.balanceSheetRows.map((row) => ({ label: String(row.label || ""), amount: Number(row.amount || 0) })),
    ...input.profitAndLossRows.map((row) => ({ label: String(row.label || ""), amount: Number(row.amount || 0) })),
  ];
  return {
    source: NATIVE_STATEMENT_SOURCE_XERO,
    balanceSheetReportRef: "Reports/BalanceSheet → flattenXeroReportRows (pre-normalize)",
    profitAndLossReportRef: "Reports/ProfitAndLoss → flattenXeroReportRows (pre-normalize)",
    period: {
      startDate: input.startDate ? String(input.startDate) : null,
      endDate: input.endDate ? String(input.endDate) : null,
    },
    ...pickTotals(flat),
  };
}

export function readNativeStatementTotalsFromBundleRaw(raw: unknown): NativeStatementTotals | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const stamped = record.nativeStatementTotals;
  if (stamped && typeof stamped === "object" && (stamped as NativeStatementTotals).source) {
    return stamped as NativeStatementTotals;
  }
  // QBO: extract live from raw reports if not pre-stamped
  return extractNativeTotalsFromQuickBooksRaw(raw);
}
