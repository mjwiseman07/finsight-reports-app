import { parseAmountOrZero } from "@/lib/parse/amount";
import type {
  AccountingProvider,
  CanonicalBalanceSheetRow,
  CanonicalCashFlowRow,
  CanonicalPnLRow,
  CanonicalSourceMetadata,
} from "../types";
import {
  humanizeQuickBooksPnLLabel,
  humanizeQuickBooksReportToken,
} from "./qbo-report-tokens";

type StatementKind = "balanceSheet" | "incomeStatement";

type RawReportRow = Record<string, unknown>;

type FlattenedProviderReportRow = {
  label: string;
  amount: number;
  section: string;
  rowType: string;
  accountType: string;
  accountClass: string;
  raw: unknown;
};

export type FinancialSummary = {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  revenue: number;
  cogs: number;
  expenses: number;
  otherIncome: number;
  otherExpenses: number;
  grossProfit: number;
  /**
   * True when Gross Profit is backed by report evidence:
   * explicit Gross Profit row, OR Cost of Sales / COGS mapping present
   * (including true-zero COGS totals). False when GP would only be
   * revenue - 0 from absent COGS — missing ≠ zero.
   */
  grossProfitSupported: boolean;
  netIncome: number;
  balanceSheetValid: boolean;
  incomeStatementValid: boolean;
};

const COGS_TOTAL_LABEL = [/^total (cost of sales|cost of goods sold|cogs)$/i];
const GROSS_PROFIT_LABEL = [/gross profit/i];

/** Explicit Gross Profit line present on the statement (ignores synthetic mapper totals). */
export function hasExplicitGrossProfitRow(
  rows: Array<{ label: string; source?: { raw?: unknown } }> = [],
): boolean {
  return rows.some((row) => {
    if (!GROSS_PROFIT_LABEL.some((pattern) => pattern.test(row.label))) return false;
    const raw = row.source?.raw;
    if (raw && typeof raw === "object" && (raw as RawReportRow).__advisacorSyntheticTotal) {
      return false;
    }
    return true;
  });
}

/**
 * Cost of Sales / COGS is demonstrably present on the statement
 * (explicit total and/or Cost of Sales section rows), including amount 0.
 * Ignores synthetic mapper totals that were invented from revenue - 0.
 */
export function hasCogsMappingEvidence(
  rows: Array<{ label: string; section?: string; source?: { raw?: unknown } }> = [],
): boolean {
  if (
    rows.some((row) => {
      if (!COGS_TOTAL_LABEL.some((pattern) => pattern.test(row.label))) return false;
      const raw = row.source?.raw;
      if (raw && typeof raw === "object" && (raw as RawReportRow).__advisacorSyntheticTotal) {
        return false;
      }
      return true;
    })
  ) {
    return true;
  }
  return rows.some((row) => {
    if (normalizeText(row.section) !== "Cost of Sales") return false;
    const raw = row.source?.raw;
    if (raw && typeof raw === "object" && (raw as RawReportRow).__advisacorSyntheticTotal) {
      return false;
    }
    return true;
  });
}

/** Operating Gross Margin may treat mapped grossProfit as authoritative only when true. */
export function isGrossProfitSupported(
  rows: Array<{ label: string; section?: string; source?: { raw?: unknown } }> = [],
): boolean {
  return hasExplicitGrossProfitRow(rows) || hasCogsMappingEvidence(rows);
}

// Phase MC-2e.2 (Issue #6, Gap I-3): local parseAmount replaced by shared
// locale-aware parser. Preserves paren-negative + leading-minus + whitespace
// stripping behavior via the shared module's stripPresentational stage.
const parseAmount = (value: unknown): number => parseAmountOrZero(value);

function source(provider: AccountingProvider, sourceReport: string, raw: unknown, externalEntityId?: string): CanonicalSourceMetadata {
  return {
    provider,
    providerFamily: provider,
    providerProduct: provider,
    externalEntityId,
    sourceReport,
    raw,
  };
}

function readColValue(colData: unknown[], index: number) {
  const record = colData[index] as Record<string, unknown> | undefined;
  return String(record?.value ?? record?.Value ?? "");
}

/** QBO often returns a single Row object instead of a one-element array. */
export function asReportRowArray(row: unknown): unknown[] {
  if (Array.isArray(row)) return row;
  if (row && typeof row === "object") return [row];
  return [];
}

/**
 * Prefer ColData[1], else the last non-empty column (QBO multi-column layouts).
 * Empty string means no amount cell was present (distinct from numeric zero).
 */
function readAmountTextFromColData(colData: unknown[]): string {
  if (!colData.length) return "";
  if (colData.length === 1) return "";
  const atOne = readColValue(colData, 1).trim();
  if (atOne !== "") return atOne;
  for (let index = colData.length - 1; index >= 1; index -= 1) {
    const value = readColValue(colData, index).trim();
    if (value !== "") return value;
  }
  return "";
}

/**
 * Period P&L is complete for Scorecard when revenue evidence exists
 * (explicit total or Income/Revenue/Sales leaf rows). A Net Income stub alone
 * is incomplete — missing ≠ zero revenue.
 */
export function isPeriodIncomeStatementComplete(
  rows: Array<{ label: string; section?: string; amount?: number }> = [],
): boolean {
  if (!rows.length) return false;
  if (rows.some((row) => /^total (income|revenue|sales)$/i.test(String(row.label || "")))) {
    return true;
  }
  return rows.some((row) => {
    const section = String(row.section || "");
    const label = String(row.label || "");
    if (!/^(revenue|income|sales)$/i.test(section)) return false;
    if (/^total\b/i.test(label) || /net (income|profit)|^profit$/i.test(label)) return false;
    return true;
  });
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeForMatch(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function rawHierarchyPath(raw: unknown) {
  const path = (raw as RawReportRow | undefined)?.__advisacorHierarchyPath;
  return Array.isArray(path) ? path.map(normalizeText).filter(Boolean) : [];
}

function hasSourceHierarchy(rows: Array<{ source?: { raw?: unknown } }>) {
  return rows.some((row) => rawHierarchyPath(row.source?.raw).length > 1);
}

function hasAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function sourceText(row: Pick<FlattenedProviderReportRow, "label" | "section" | "accountType" | "accountClass">) {
  return normalizeForMatch(`${row.section} ${row.accountClass} ${row.accountType} ${row.label}`);
}

function xeroBalanceSheetSourceSection(row: CanonicalBalanceSheetRow | CanonicalPnLRow) {
  if (row.source?.provider !== "xero") return "";
  const raw = row.source.raw as RawReportRow | undefined;
  const explicitSection = normalizeText(raw?.__advisacorSourceSection || row.section || "");
  const hierarchyPath = rawHierarchyPath(raw);
  const specificHierarchySection = [...hierarchyPath].reverse().find((part) =>
    /^current liabilities$|^current liability$|^long.?term liabilities$|^non.?current liabilities$|^equity$|^current assets$|^current asset$|^fixed assets$|^non.?current assets$|^property,? plant and equipment$|^plant and equipment$|^ppe$/i.test(part),
  );
  const broadHierarchySection = [...hierarchyPath].reverse().find((part) =>
    /^liabilities$|^liabilities and equity$|^assets$/i.test(part),
  );
  const explicitIsSpecificClassification = /current liabilities?|long.?term liabilities?|non.?current liabilities?|^equity$|current assets?|fixed assets?|non.?current assets?|property,? plant|plant and equipment|ppe/i.test(explicitSection);
  const broadAssetText = normalizeForMatch(`${explicitSection} ${broadHierarchySection || ""} ${row.label}`);
  const inferredSpecificSection =
    /\b(non.?current assets?|fixed assets?|property|plant|ppe|equipment|furniture|computer|office equipment|truck|vehicle|machinery|leasehold|original cost|accumulated depreciation|depreciation)\b/i.test(broadAssetText)
      ? "Fixed Assets"
      : "";
  const rawSection = normalizeText(
    explicitIsSpecificClassification
      ? explicitSection
      : specificHierarchySection || inferredSpecificSection || broadHierarchySection || explicitSection,
  );
  const section = /non.?current assets?|property,? plant|plant and equipment|ppe/i.test(rawSection) ? "Fixed Assets" : rawSection;
  return /current liabilities?|long.?term liabilities?|non.?current liabilities?|liabilities|equity|current assets?|fixed assets?|assets/i.test(section)
    ? section
    : "";
}

function isTotalRow(label: string) {
  return /^total\b/i.test(label) || /net (income|profit)|gross profit|liabilities and equity/i.test(label);
}

export function classifyBalanceSheetAccount(row: Pick<FlattenedProviderReportRow, "label" | "section" | "accountType" | "accountClass">) {
  const text = sourceText(row);
  if (hasAny(text, [/accumulated depreciation/])) return "Fixed Assets";
  if (hasAny(text, [/fixed asset/, /property/, /equipment/, /machinery/, /furniture/, /leasehold/, /\btruck\b/, /vehicle/, /original cost/])) return "Fixed Assets";
  if (hasAny(text, [/bank/, /checking/, /savings/, /cash/, /accounts receivable/, /\bar\b/, /inventory/, /undeposited funds/, /prepaid/])) return "Current Assets";
  if (hasAny(text, [/asset/])) return "Current Assets";
  if (hasAny(text, [/credit card/, /accounts payable/, /\bap\b/, /other current liabilit/, /payroll payable/, /sales tax/, /dept\.? of revenue payable/])) return "Current Liabilities";
  if (hasAny(text, [/long.?term/, /notes payable/, /debt/])) return "Long-Term Liabilities";
  if (hasAny(text, [/loan payable/])) return hasAny(text, [/current/]) ? "Current Liabilities" : "Long-Term Liabilities";
  if (hasAny(text, [/liabilit/])) return "Current Liabilities";
  if (hasAny(text, [/net income/, /netincome/, /current year earnings/])) return "Equity";
  if (hasAny(text, [/equity/, /retained earnings/, /owner/])) return "Equity";
  return normalizeText(row.section) || "Unclassified";
}

function classifyIncomeStatementSection(row: Pick<FlattenedProviderReportRow, "label" | "section" | "accountType" | "accountClass">) {
  const text = sourceText(row);
  if (hasAny(text, [/cost of sales/, /cost of goods/, /\bcogs\b/])) return "Cost of Sales";
  if (hasAny(text, [/other income/, /other revenue/])) return "Other Income";
  if (hasAny(text, [/other expense/])) return "Other Expenses";
  if (hasAny(text, [/income/, /revenue/, /sales/]) && !hasAny(text, [/net income/, /gross profit/])) return "Revenue";
  if (hasAny(text, [/expense/, /payroll/, /wages/, /rent/, /utilities/])) return "Expenses";
  if (hasAny(text, [/net income/, /net profit/])) return "Net Income";
  return normalizeText(row.section) || "Unclassified";
}

function rowAmount(row: { amount: number }) {
  return Number(row.amount || 0);
}

function findExplicit(rows: Array<{ label: string; amount: number }>, patterns: RegExp[]) {
  return rows.find((row) => patterns.some((pattern) => pattern.test(row.label)))?.amount;
}

function sumSection(rows: Array<{ label: string; section?: string; amount: number }>, section: string) {
  return rows
    .filter((row) => row.section === section && !isTotalRow(row.label))
    .reduce((total, row) => total + rowAmount(row), 0);
}

/** Sum leaf rows for the first section that actually has rows (even if amounts are 0). */
function sumFirstPresentSection(
  rows: Array<{ label: string; section?: string; amount: number }>,
  sections: string[],
) {
  for (const section of sections) {
    const sectionRows = rows.filter((row) => row.section === section && !isTotalRow(row.label));
    if (sectionRows.length) {
      return sectionRows.reduce((total, row) => total + rowAmount(row), 0);
    }
  }
  return 0;
}

function balanceSheetSummary(rows: CanonicalBalanceSheetRow[]) {
  const totalAssets = findExplicit(rows, [/^total assets$/i]) ?? sumSection(rows, "Current Assets") + sumSection(rows, "Fixed Assets");
  const totalLiabilities = findExplicit(rows, [/^total liabilities$/i]) ?? sumSection(rows, "Current Liabilities") + sumSection(rows, "Long-Term Liabilities");
  const totalEquity = findExplicit(rows, [/^total equity$/i]) ?? sumSection(rows, "Equity");
  const totalLiabilitiesAndEquity = findExplicit(rows, [/total liabilities (and|&) equity/i]) ?? totalLiabilities + totalEquity;
  return { totalAssets, totalLiabilities, totalEquity, totalLiabilitiesAndEquity };
}

function incomeStatementSummary(rows: CanonicalPnLRow[]) {
  // Prefer explicit Total Income/Revenue; else leaf sum. Xero keeps section title "Income"
  // when hierarchy metadata is present — include it so we do not invent a second formula.
  const revenue =
    findExplicit(rows, [/^total (income|revenue|sales)$/i]) ??
    sumFirstPresentSection(rows, ["Revenue", "Income", "Sales"]);
  const cogs = Math.abs(
    findExplicit(rows, [/^total (cost of sales|cost of goods sold|cogs)$/i]) ??
      sumSection(rows, "Cost of Sales"),
  );
  const expenses = Math.abs(
    findExplicit(rows, [/^total (operating )?expenses$/i]) ?? sumSection(rows, "Expenses"),
  );
  const otherIncome = findExplicit(rows, [/^total other income$/i]) ?? sumSection(rows, "Other Income");
  const otherExpenses = Math.abs(
    findExplicit(rows, [/^total other expenses$/i]) ?? sumSection(rows, "Other Expenses"),
  );
  const grossProfit = findExplicit(rows, [/gross profit/i]) ?? revenue - cogs;
  const netIncome =
    findExplicit(rows, [/net (income|profit)/i]) ??
    revenue - cogs - expenses + otherIncome - otherExpenses;
  return { revenue, cogs, expenses, otherIncome, otherExpenses, grossProfit, netIncome };
}

function appendBalanceSheetTotals(rows: CanonicalBalanceSheetRow[]) {
  if (!rows.length) return rows;
  const summary = balanceSheetSummary(rows);
  const fallbackSource = rows[0].source;
  const nextRows = [...rows];
  if (findExplicit(nextRows, [/^total assets$/i]) === undefined) nextRows.push({ label: "Total Assets", amount: summary.totalAssets, section: "Assets", source: fallbackSource });
  if (findExplicit(nextRows, [/^total liabilities$/i]) === undefined) nextRows.push({ label: "Total Liabilities", amount: summary.totalLiabilities, section: "Liabilities", source: fallbackSource });
  if (findExplicit(nextRows, [/^total equity$/i]) === undefined) nextRows.push({ label: "Total Equity", amount: summary.totalEquity, section: "Equity", source: fallbackSource });
  if (findExplicit(nextRows, [/total liabilities (and|&) equity/i]) === undefined) {
    nextRows.push({ label: "Total Liabilities and Equity", amount: summary.totalLiabilities + summary.totalEquity, section: "Equity", source: fallbackSource });
  }
  return nextRows;
}

function appendIncomeStatementTotals(rows: CanonicalPnLRow[]) {
  if (!rows.length) return rows;
  const summary = incomeStatementSummary(rows);
  const fallbackSource = rows[0].source;
  const syntheticSource = (kind: string): CanonicalSourceMetadata => ({
    ...fallbackSource,
    raw: {
      ...(fallbackSource.raw && typeof fallbackSource.raw === "object"
        ? (fallbackSource.raw as Record<string, unknown>)
        : {}),
      __advisacorSyntheticTotal: true,
      __advisacorSyntheticKind: kind,
    },
  });
  const nextRows = [...rows];
  if (findExplicit(nextRows, [/^total (income|revenue|sales)$/i]) === undefined) {
    nextRows.push({
      label: "Total Revenue",
      amount: summary.revenue,
      section: "Revenue",
      source: syntheticSource("total_revenue"),
    });
  }
  if (findExplicit(nextRows, [/^total (cost of sales|cost of goods sold|cogs)$/i]) === undefined && summary.cogs) {
    nextRows.push({
      label: "Total Cost of Sales",
      amount: summary.cogs,
      section: "Cost of Sales",
      source: syntheticSource("total_cogs"),
    });
  }
  if (findExplicit(nextRows, [/gross profit/i]) === undefined) {
    nextRows.push({
      label: "Gross Profit",
      amount: summary.grossProfit,
      section: "Revenue",
      source: syntheticSource("gross_profit"),
    });
  }
  if (findExplicit(nextRows, [/^total (operating )?expenses$/i]) === undefined) {
    nextRows.push({
      label: "Total Expenses",
      amount: summary.expenses,
      section: "Expenses",
      source: syntheticSource("total_expenses"),
    });
  }
  if (findExplicit(nextRows, [/net (income|profit)/i]) === undefined) {
    nextRows.push({
      label: "Net Income",
      amount: summary.netIncome,
      section: "Net Income",
      source: syntheticSource("net_income"),
    });
  }
  return nextRows;
}

export function normalizeFinancialStatementRows<T extends CanonicalBalanceSheetRow | CanonicalPnLRow>(
  statement: StatementKind,
  rows: Array<T>,
): Array<T> {
  if (hasSourceHierarchy(rows)) {
    return rows
      .filter((row) => row.label && row.label !== "Unlabeled")
      .map((row) => {
        const xeroSourceSection = statement === "balanceSheet" ? xeroBalanceSheetSourceSection(row) : "";
        return xeroSourceSection ? { ...row, section: xeroSourceSection } : row;
      });
  }
  const classifiedRows = rows
    .filter((row) => row.label && row.label !== "Unlabeled")
    .map((row) => {
      const classificationInput = {
        label: row.label,
        section: row.section || "",
        accountType: normalizeText((row.source.raw as RawReportRow | undefined)?.accountType || (row.source.raw as RawReportRow | undefined)?.AccountType || ""),
        accountClass: normalizeText((row.source.raw as RawReportRow | undefined)?.accountClass || (row.source.raw as RawReportRow | undefined)?.AccountClass || ""),
      };
      const xeroSourceSection = statement === "balanceSheet" ? xeroBalanceSheetSourceSection(row) : "";
      return {
        ...row,
        section: xeroSourceSection || (statement === "balanceSheet" ? classifyBalanceSheetAccount(classificationInput) : classifyIncomeStatementSection(classificationInput)),
      };
    });
  return (statement === "balanceSheet" ? appendBalanceSheetTotals(classifiedRows as CanonicalBalanceSheetRow[]) : appendIncomeStatementTotals(classifiedRows as CanonicalPnLRow[])) as Array<T>;
}

function withHierarchyMetadata(raw: unknown, hierarchyPath: string[], sourceSection: string) {
  return {
    ...(raw as Record<string, unknown>),
    __advisacorHierarchyPath: hierarchyPath,
    __advisacorSourceSection: sourceSection,
  };
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function flattenProviderRows(rows: unknown[] = [], inheritedSection = "", inheritedPath: string[] = []): FlattenedProviderReportRow[] {
  return asReportRowArray(rows).flatMap((row) => {
    const record = row as RawReportRow;
    const header = record.Header as RawReportRow | undefined;
    const summary = record.Summary as RawReportRow | undefined;
    const colData = Array.isArray(record.ColData) ? record.ColData : [];
    const headerColData = Array.isArray(header?.ColData) ? header.ColData as unknown[] : [];
    const summaryColData = Array.isArray(summary?.ColData) ? summary.ColData as unknown[] : [];
    const headerLabel = normalizeText(readColValue(headerColData, 0));
    const section = normalizeText(record.group || record.Group || headerLabel || inheritedSection);
    const sectionPath = section && inheritedPath[inheritedPath.length - 1] !== section ? [...inheritedPath, section] : inheritedPath;
    const nestedRows = (record.Rows as RawReportRow | undefined)?.Row;
    const childRows = nestedRows != null
      ? flattenProviderRows(asReportRowArray(nestedRows), section || inheritedSection, sectionPath)
      : [];
    const label = normalizeText(record.label || record.name || readColValue(colData, 0));
    const summaryLabel = normalizeText(readColValue(summaryColData, 0));
    const headerAmountText = readAmountTextFromColData(headerColData);
    const rowAmountText = readAmountTextFromColData(colData);
    const summaryAmountText = readAmountTextFromColData(summaryColData);
    const rowPath = label && sectionPath[sectionPath.length - 1] !== label ? [...sectionPath, label] : sectionPath;
    const headerRow = headerLabel && sectionPath.length && sectionPath[sectionPath.length - 1] === section
      ? [{
          label: section,
          amount: parseAmount(headerAmountText),
          section: inheritedSection,
          rowType: "Header",
          accountType: normalizeText(record.group || record.Group || record.type),
          accountClass: normalizeText(record.class || record.Class),
          raw: withHierarchyMetadata({ ...objectRecord(header || row), rowType: "Header", __advisacorHasReportAmount: headerAmountText !== "" }, sectionPath, inheritedSection),
        }]
      : [];
    const currentRow = label
      ? [{
          label,
          amount: parseAmount(record.amount ?? record.value ?? rowAmountText),
          section: section || inheritedSection,
          rowType: normalizeText(record.type || record.RowType),
          accountType: normalizeText(record.accountType || record.AccountType || record.type),
          accountClass: normalizeText(record.accountClass || record.AccountClass || record.class),
          raw: withHierarchyMetadata({
            ...objectRecord(row),
            rowType: normalizeText(record.type || record.RowType),
            __advisacorHasReportAmount: rowAmountText !== "" || record.amount != null || record.value != null,
          }, rowPath, section || inheritedSection),
        }]
      : [];
    const summaryRow = summaryLabel
      ? [{
          label: summaryLabel,
          amount: parseAmount(summaryAmountText),
          section: section || inheritedSection,
          rowType: "Summary",
          accountType: normalizeText(record.group || record.Group || record.type),
          accountClass: normalizeText(record.class || record.Class),
          raw: withHierarchyMetadata({
            ...objectRecord(summary),
            rowType: "Summary",
            __advisacorHasReportAmount: summaryAmountText !== "",
          }, [...sectionPath, summaryLabel], section || inheritedSection),
        }]
      : [];
    return [...headerRow, ...currentRow, ...childRows, ...summaryRow];
  });
}

function humanizeQuickBooksCanonicalRow<T extends CanonicalPnLRow | CanonicalBalanceSheetRow | CanonicalCashFlowRow>(
  row: T,
  sourceReport: string,
): T {
  const raw = objectRecord(row.source?.raw);
  const providerSection = normalizeText(row.section);
  const humanSection = humanizeQuickBooksReportToken(providerSection);
  const path = rawHierarchyPath(raw).map(humanizeQuickBooksReportToken);
  const sourceSection = humanizeQuickBooksReportToken(
    normalizeText(raw.__advisacorSourceSection || providerSection),
  );
  const isPnL = /profit|loss|income/i.test(sourceReport);
  const label = isPnL
    ? humanizeQuickBooksPnLLabel(row.label, humanSection)
    : row.label;
  return {
    ...row,
    label,
    section: humanSection || row.section,
    source: {
      ...row.source,
      raw: {
        ...raw,
        __advisacorHierarchyPath: path.length ? path : raw.__advisacorHierarchyPath,
        __advisacorSourceSection: sourceSection || raw.__advisacorSourceSection,
        __advisacorProviderSection: providerSection || raw.__advisacorProviderSection,
      },
    },
  };
}

export function normalizeStructuredReportRows<T extends CanonicalPnLRow | CanonicalBalanceSheetRow | CanonicalCashFlowRow>(
  provider: AccountingProvider,
  sourceReport: string,
  rows: unknown[] = [],
  externalEntityId?: string,
): T[] {
  const statement = /balance/i.test(sourceReport) ? "balanceSheet" : /profit|loss|income/i.test(sourceReport) ? "incomeStatement" : null;
  const mappedRows = flattenProviderRows(asReportRowArray(rows))
    .map((row) => ({
      label: row.label,
      amount: row.amount,
      section: rawHierarchyPath(row.raw).length > 1
        ? row.section
        : statement === "balanceSheet"
          ? classifyBalanceSheetAccount(row)
          : statement === "incomeStatement"
            ? classifyIncomeStatementSection(row)
            : row.section,
      source: source(provider, sourceReport, row.raw, externalEntityId),
    }))
    .filter((row) => row.label !== "Unlabeled" || row.amount !== 0);
  return (statement ? normalizeFinancialStatementRows(statement, mappedRows as Array<CanonicalBalanceSheetRow | CanonicalPnLRow>) : mappedRows) as T[];
}

export function normalizeQuickBooksFinancialStatement<T extends CanonicalPnLRow | CanonicalBalanceSheetRow | CanonicalCashFlowRow>(
  sourceReport: string,
  rows: unknown[] = [],
  externalEntityId?: string,
): T[] {
  return normalizeStructuredReportRows<T>("quickbooks", sourceReport, rows, externalEntityId).map((row) =>
    humanizeQuickBooksCanonicalRow(row, sourceReport),
  );
}

export function normalizeXeroFinancialStatement<T extends CanonicalPnLRow | CanonicalBalanceSheetRow>(
  sourceReport: "BalanceSheet" | "ProfitAndLoss",
  rows: Array<T>,
): T[] {
  const statement = sourceReport === "BalanceSheet" ? "balanceSheet" : "incomeStatement";
  return normalizeFinancialStatementRows(statement, rows);
}

export function buildMappedFinancialSummary(balanceSheet: CanonicalBalanceSheetRow[] = [], incomeStatement: CanonicalPnLRow[] = []): FinancialSummary {
  const balance = balanceSheetSummary(balanceSheet);
  const income = incomeStatementSummary(incomeStatement);
  return {
    ...balance,
    ...income,
    grossProfitSupported: isGrossProfitSupported(incomeStatement),
    balanceSheetValid: Math.abs(balance.totalAssets - (balance.totalLiabilities + balance.totalEquity)) <= 1,
    incomeStatementValid: Math.abs(income.netIncome - (income.revenue - income.cogs - income.expenses + income.otherIncome - income.otherExpenses)) <= 1,
  };
}
