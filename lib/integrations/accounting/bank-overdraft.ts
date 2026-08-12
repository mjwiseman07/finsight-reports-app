/**
 * Canonical bank-overdraft presentation for Balance Sheet rows.
 *
 * When an otherwise asset-side cash/bank account carries a negative balance
 * and the provider has not already supplied a matching current-liability
 * counterpart, represent the absolute amount once as a current-liability
 * bank overdraft and zero the asset-side cash presentation.
 *
 * Provider-neutral: operates on canonical BS rows only. Does not post JEs.
 */
import {
  isAssetSideBalanceSheetRow,
  isBalanceSheetSummaryOrTotalRow,
  isCashOrBankRelated,
  sumCashFromBalanceSheet,
} from "./active-report-summary";
import type { CanonicalBalanceSheetRow } from "./types";

const AMOUNT_EPSILON = 0.005;
const LIABILITY_SECTION = "Current Liabilities";

type RawMeta = Record<string, unknown>;

function rawMeta(row: CanonicalBalanceSheetRow): RawMeta {
  const raw = row.source?.raw;
  return raw && typeof raw === "object" ? ({ ...raw } as RawMeta) : {};
}

function amountsNearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= AMOUNT_EPSILON;
}

function isLiabilitySideRow(row: CanonicalBalanceSheetRow): boolean {
  if (isAssetSideBalanceSheetRow(row)) return false;
  const raw = rawMeta(row);
  const hints = [
    String(row.section || ""),
    String(raw.__advisacorSourceSection || ""),
    ...(Array.isArray(raw.__advisacorHierarchyPath)
      ? (raw.__advisacorHierarchyPath as unknown[]).map((part) => String(part || ""))
      : []),
  ]
    .join(" | ")
    .toLowerCase();
  return /\bliabilit|\bcredit card|\bpayable\b/.test(hints);
}

function findMatchingOverdraftLiability(
  rows: CanonicalBalanceSheetRow[],
  label: string,
  absoluteAmount: number,
): number {
  return rows.findIndex((row) => {
    if (row.label !== label) return false;
    if (!isLiabilitySideRow(row)) return false;
    return amountsNearlyEqual(Math.abs(Number(row.amount || 0)), absoluteAmount);
  });
}

function zeroAssetCashPresentation(
  row: CanonicalBalanceSheetRow,
  originalAmount: number,
): CanonicalBalanceSheetRow {
  const raw = rawMeta(row);
  return {
    ...row,
    amount: 0,
    source: {
      ...row.source,
      raw: {
        ...raw,
        __advisacorBankOverdraftReclassified: true,
        __advisacorSourceAmount: originalAmount,
        __advisacorXeroReportAmountOriginal: originalAmount,
        __advisacorXeroReportAmount: 0,
      },
    },
  };
}

function buildOverdraftLiabilityRow(
  leaf: CanonicalBalanceSheetRow,
  absoluteAmount: number,
): CanonicalBalanceSheetRow {
  const raw = rawMeta(leaf);
  const originalAmount = Number(leaf.amount || 0);
  return {
    label: leaf.label,
    amount: absoluteAmount,
    section: LIABILITY_SECTION,
    source: {
      ...leaf.source,
      sourceReport: leaf.source?.sourceReport || "BalanceSheet",
      raw: {
        ...raw,
        RowType: raw.RowType || raw.rowType || "Row",
        rowType: raw.rowType || raw.RowType || "Row",
        __advisacorSourceSection: LIABILITY_SECTION,
        __advisacorHierarchyPath: ["Liabilities", LIABILITY_SECTION, leaf.label],
        __advisacorBankOverdraftLiability: true,
        __advisacorSourceAmount: originalAmount,
        __advisacorXeroReportAmountOriginal: originalAmount,
        __advisacorXeroReportAmount: absoluteAmount,
      },
    },
  };
}

/**
 * Apply canonical overdraft classification to a Balance Sheet row set.
 * Idempotent for rows already marked reclassified. Never duplicates an
 * existing matching liability overdraft row.
 */
export function applyCanonicalBankOverdraftClassification(
  rows: CanonicalBalanceSheetRow[] = [],
): CanonicalBalanceSheetRow[] {
  if (!rows.length) return rows;

  const overdraftLeaves: CanonicalBalanceSheetRow[] = [];
  const adjusted = rows.map((row) => {
    const raw = rawMeta(row);
    if (raw.__advisacorBankOverdraftReclassified === true) return row;
    if (!isCashOrBankRelated(row) || !isAssetSideBalanceSheetRow(row)) return row;
    const amount = Number(row.amount || 0);
    if (!(amount < -AMOUNT_EPSILON)) return row;
    if (!isBalanceSheetSummaryOrTotalRow(row)) {
      overdraftLeaves.push(row);
    }
    return zeroAssetCashPresentation(row, amount);
  });

  return overdraftLeaves.reduce((nextRows, leaf) => {
    const absoluteAmount = Math.abs(Number(leaf.amount || 0));
    const existingIdx = findMatchingOverdraftLiability(nextRows, leaf.label, absoluteAmount);
    if (existingIdx >= 0) {
      // Provider already presented the liability counterpart — keep it once.
      return nextRows;
    }
    return [...nextRows, buildOverdraftLiabilityRow(leaf, absoluteAmount)];
  }, adjusted);
}

/** Test/helper: canonical cash after overdraft classification. */
export function canonicalCashAfterOverdraftClassification(
  rows: CanonicalBalanceSheetRow[] = [],
): number {
  return sumCashFromBalanceSheet(applyCanonicalBankOverdraftClassification(rows));
}
