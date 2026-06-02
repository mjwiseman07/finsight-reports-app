import type {
  AccountingProvider,
  CanonicalBalanceSheetRow,
  CanonicalCashFlowRow,
  CanonicalPnLRow,
  CanonicalSourceMetadata,
} from "../types";

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

type FinancialSummary = {
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
  netIncome: number;
  balanceSheetValid: boolean;
  incomeStatementValid: boolean;
};

function parseAmount(value: unknown): number {
  if (typeof value === "number") return value;
  const raw = String(value ?? "0").trim();
  const isNegative = /^\(.*\)$/.test(raw) || /^-/.test(raw);
  const normalized = raw.replace(/[($,\s)]/g, "").replace(/^-/, "");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return 0;
  return isNegative ? -amount : amount;
}

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

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeForMatch(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function hasAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function sourceText(row: Pick<FlattenedProviderReportRow, "label" | "section" | "accountType" | "accountClass">) {
  return normalizeForMatch(`${row.section} ${row.accountClass} ${row.accountType} ${row.label}`);
}

function isTotalRow(label: string) {
  return /^total\b/i.test(label) || /net (income|profit)|gross profit|liabilities and equity/i.test(label);
}

function classifyBalanceSheetSection(row: Pick<FlattenedProviderReportRow, "label" | "section" | "accountType" | "accountClass">) {
  const text = sourceText(row);
  if (hasAny(text, [/asset/, /bank/, /accounts receivable/, /\bar\b/, /fixed asset/, /property/, /equipment/])) return "Assets";
  if (hasAny(text, [/liabilit/, /accounts payable/, /\bap\b/, /credit card/, /loan/, /debt/])) return "Liabilities";
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

function balanceSheetSummary(rows: CanonicalBalanceSheetRow[]) {
  const totalAssets = findExplicit(rows, [/^total assets$/i]) ?? sumSection(rows, "Assets");
  const totalLiabilities = findExplicit(rows, [/^total liabilities$/i]) ?? sumSection(rows, "Liabilities");
  const totalEquity = findExplicit(rows, [/^total equity$/i]) ?? sumSection(rows, "Equity");
  const totalLiabilitiesAndEquity = findExplicit(rows, [/total liabilities (and|&) equity/i]) ?? totalLiabilities + totalEquity;
  return { totalAssets, totalLiabilities, totalEquity, totalLiabilitiesAndEquity };
}

function incomeStatementSummary(rows: CanonicalPnLRow[]) {
  const revenue = findExplicit(rows, [/^total (income|revenue|sales)$/i]) ?? sumSection(rows, "Revenue");
  const cogs = Math.abs(findExplicit(rows, [/^total (cost of sales|cost of goods sold|cogs)$/i]) ?? sumSection(rows, "Cost of Sales"));
  const expenses = Math.abs(findExplicit(rows, [/^total (operating )?expenses$/i]) ?? sumSection(rows, "Expenses"));
  const otherIncome = findExplicit(rows, [/^total other income$/i]) ?? sumSection(rows, "Other Income");
  const otherExpenses = Math.abs(findExplicit(rows, [/^total other expenses$/i]) ?? sumSection(rows, "Other Expenses"));
  const grossProfit = findExplicit(rows, [/gross profit/i]) ?? revenue - cogs;
  const netIncome = findExplicit(rows, [/net (income|profit)/i]) ?? revenue - cogs - expenses + otherIncome - otherExpenses;
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
  const nextRows = [...rows];
  if (findExplicit(nextRows, [/^total (income|revenue|sales)$/i]) === undefined) nextRows.push({ label: "Total Revenue", amount: summary.revenue, section: "Revenue", source: fallbackSource });
  if (findExplicit(nextRows, [/^total (cost of sales|cost of goods sold|cogs)$/i]) === undefined && summary.cogs) nextRows.push({ label: "Total Cost of Sales", amount: summary.cogs, section: "Cost of Sales", source: fallbackSource });
  if (findExplicit(nextRows, [/gross profit/i]) === undefined) nextRows.push({ label: "Gross Profit", amount: summary.grossProfit, section: "Revenue", source: fallbackSource });
  if (findExplicit(nextRows, [/^total (operating )?expenses$/i]) === undefined) nextRows.push({ label: "Total Expenses", amount: summary.expenses, section: "Expenses", source: fallbackSource });
  if (findExplicit(nextRows, [/net (income|profit)/i]) === undefined) nextRows.push({ label: "Net Income", amount: summary.netIncome, section: "Net Income", source: fallbackSource });
  return nextRows;
}

export function normalizeFinancialStatementRows<T extends CanonicalBalanceSheetRow | CanonicalPnLRow>(
  statement: StatementKind,
  rows: Array<T>,
): Array<T> {
  const classifiedRows = rows
    .filter((row) => row.label && row.label !== "Unlabeled")
    .map((row) => {
      const classificationInput = {
        label: row.label,
        section: row.section || "",
        accountType: normalizeText((row.source.raw as RawReportRow | undefined)?.accountType || (row.source.raw as RawReportRow | undefined)?.AccountType || ""),
        accountClass: normalizeText((row.source.raw as RawReportRow | undefined)?.accountClass || (row.source.raw as RawReportRow | undefined)?.AccountClass || ""),
      };
      return {
        ...row,
        section: statement === "balanceSheet" ? classifyBalanceSheetSection(classificationInput) : classifyIncomeStatementSection(classificationInput),
      };
    });
  return (statement === "balanceSheet" ? appendBalanceSheetTotals(classifiedRows as CanonicalBalanceSheetRow[]) : appendIncomeStatementTotals(classifiedRows as CanonicalPnLRow[])) as Array<T>;
}

function flattenProviderRows(rows: unknown[] = [], inheritedSection = ""): FlattenedProviderReportRow[] {
  return rows.flatMap((row) => {
    const record = row as RawReportRow;
    const header = record.Header as RawReportRow | undefined;
    const summary = record.Summary as RawReportRow | undefined;
    const colData = Array.isArray(record.ColData) ? record.ColData : [];
    const headerColData = Array.isArray(header?.ColData) ? header.ColData as unknown[] : [];
    const summaryColData = Array.isArray(summary?.ColData) ? summary.ColData as unknown[] : [];
    const section = normalizeText(record.group || record.Group || readColValue(headerColData, 0) || inheritedSection);
    const childRows = Array.isArray((record.Rows as RawReportRow | undefined)?.Row)
      ? flattenProviderRows((record.Rows as RawReportRow).Row as unknown[], section || inheritedSection)
      : [];
    const label = normalizeText(record.label || record.name || readColValue(colData, 0));
    const summaryLabel = normalizeText(readColValue(summaryColData, 0));
    const currentRow = label
      ? [{
          label,
          amount: parseAmount(record.amount ?? record.value ?? readColValue(colData, 1)),
          section: section || inheritedSection,
          rowType: normalizeText(record.type || record.RowType),
          accountType: normalizeText(record.accountType || record.AccountType || record.type),
          accountClass: normalizeText(record.accountClass || record.AccountClass || record.class),
          raw: row,
        }]
      : [];
    const summaryRow = summaryLabel
      ? [{
          label: summaryLabel,
          amount: parseAmount(readColValue(summaryColData, 1)),
          section: section || inheritedSection,
          rowType: "Summary",
          accountType: normalizeText(record.group || record.Group || record.type),
          accountClass: normalizeText(record.class || record.Class),
          raw: summary,
        }]
      : [];
    return [...currentRow, ...childRows, ...summaryRow];
  });
}

export function normalizeStructuredReportRows<T extends CanonicalPnLRow | CanonicalBalanceSheetRow | CanonicalCashFlowRow>(
  provider: AccountingProvider,
  sourceReport: string,
  rows: unknown[] = [],
  externalEntityId?: string,
): T[] {
  const statement = /balance/i.test(sourceReport) ? "balanceSheet" : /profit|loss|income/i.test(sourceReport) ? "incomeStatement" : null;
  const mappedRows = flattenProviderRows(rows)
    .map((row) => ({
      label: row.label,
      amount: row.amount,
      section: statement === "balanceSheet" ? classifyBalanceSheetSection(row) : statement === "incomeStatement" ? classifyIncomeStatementSection(row) : row.section,
      source: source(provider, sourceReport, row.raw, externalEntityId),
    }))
    .filter((row) => row.label !== "Unlabeled" || row.amount !== 0);
  return (statement ? normalizeFinancialStatementRows(statement, mappedRows as Array<CanonicalBalanceSheetRow | CanonicalPnLRow>) : mappedRows) as T[];
}

export function buildMappedFinancialSummary(balanceSheet: CanonicalBalanceSheetRow[] = [], incomeStatement: CanonicalPnLRow[] = []): FinancialSummary {
  const balance = balanceSheetSummary(balanceSheet);
  const income = incomeStatementSummary(incomeStatement);
  return {
    ...balance,
    ...income,
    balanceSheetValid: Math.abs(balance.totalAssets - (balance.totalLiabilities + balance.totalEquity)) <= 1,
    incomeStatementValid: Math.abs(income.netIncome - (income.revenue - income.cogs - income.expenses + income.otherIncome - income.otherExpenses)) <= 1,
  };
}
