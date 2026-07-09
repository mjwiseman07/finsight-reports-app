import type { AdvisacorNormalizedFinancialData } from "./integrations/accounting";
import type { CanonicalPnLRow } from "./integrations/accounting/types";
import { buildMappedFinancialSummary, classifyBalanceSheetAccount } from "./integrations/accounting/normalizers/financial-statements";
import { assertScheduleSource, type ReportDataContext } from "./integrations/accounting/report-data-context";
import { assertReportPreflight } from "./reporting/report-preflight-validation";
import { OPTIONAL_SUPPORTING_SCHEDULE_MESSAGE } from "./accounting/supporting-schedules/fetchSupportingSchedules";
import { agingBuckets, balanceSheetScheduleAmounts, buildScheduleDiagnostics, fixedAssetSchedule, inventoryAnalysis, payrollFteAnalysis, ratioSchedule } from "./accounting/supporting-schedules/scheduleDiagnostics";

type FinancialPackagePdfOptions = {
  companyName?: string;
  industryType?: string;
  preparedBy?: string;
  reportPeriod?: string;
  trial?: boolean;
  fluxLevel?: "starter" | "pro" | "professional" | "cfo";
  fluxType?: "month-over-month" | "quarter-over-quarter" | "year-over-year" | "custom-period";
  fluxStatements?: string[];
  dollarThreshold?: string;
  percentageThreshold?: string;
  filteringLogic?: "dollar" | "percentage" | "both";
  aiCommentaryEnabled?: boolean;
  commentaryOptions?: string[];
  incomeStatementDetailLevel?: "summary" | "detailed";
  normalizedData?: AdvisacorNormalizedFinancialData;
  reportDataContext?: ReportDataContext;
  /**
   * Phase TCP1 W2.5 — Review Assist mode.
   * When true, the PDF renderer inserts a Review Findings section (blocker /
   * warning / note counts and reviewer sign-off block) before the Financial
   * Statements. Gated by the review_assist_pdf_mode entitlement.
   * Default: false (no change to standard Financial Package output).
   */
  reviewAssistMode?: boolean;
  /**
   * Optional Review Assist findings payload. Blocks 5–7 populate this from
   * the severity adapter and findings composer. When reviewAssistMode is true
   * and this is undefined, the PDF renders the scaffold with zeroed counts.
   */
  reviewAssistFindings?: ReviewAssistFindingsPayload;
};
/**
 * Phase TCP1 W2.5 — Review Assist findings payload.
 * Blocks 5–7 will provide the real severity adapter and composer that
 * produce this shape. Block 4 only reserves the type.
 */
export type ReviewAssistFindingsPayload = {
  blockerCount: number;
  warningCount: number;
  noteCount: number;
  reviewerName?: string;
  reviewDate?: string;
  findings?: Array<{
    severity: "blocker" | "warning" | "note";
    label: string;
    detail?: string;
  }>;
};

type PdfPage = {
  title: string;
  category: string;
  subtitle?: string;
  lines?: string[];
  table?: Array<[string, string]>;
  divider?: boolean;
  statement?: "balanceSheet" | "incomeStatement";
  statementRowsOverride?: FinancialStatementDisplayRow[];
};

type FinancialStatementDisplayRow = {
  label: string;
  value?: string;
  ytdValue?: string;
  kind?: string;
  level?: number;
};

type IncomeStatementDetailLevel = "summary" | "detailed";

export type FinancialPackageNormalizedInput = {
  sourceSystem?: string;
  connectionId?: string;
  tenantName?: string;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  revenue: number;
  expenses: number;
  netIncome: number;
  cashBalance: number;
  balanceSheetRowsCount: number;
  incomeStatementRowsCount: number;
  balanceSheetRows: FinancialStatementDisplayRow[];
  incomeStatementRows: FinancialStatementDisplayRow[];
  incomeStatementSummaryRows: FinancialStatementDisplayRow[];
  normalizedData?: AdvisacorNormalizedFinancialData;
  reportDataContext?: ReportDataContext;
};

type NormalizedFinancialPackagePdfOptions = Required<Omit<FinancialPackagePdfOptions, "normalizedData" | "reportDataContext" | "reviewAssistFindings">> & {
  normalizedData?: AdvisacorNormalizedFinancialData;
  reportDataContext?: ReportDataContext;
  packageInput?: FinancialPackageNormalizedInput;
  reviewAssistFindings?: ReviewAssistFindingsPayload;
};

const balanceSheetTieOut = {
  grossFixedAssets: 679000,
  accumulatedDepreciation: -114000,
  netPropertyAndEquipment: 565000,
};

const fixedAssetTieOut = {
  endingGrossAssets: 679000,
  endingAccumulatedDepreciation: -114000,
  endingNetBookValue: 565000,
};

const packageSections: PdfPage[] = [
  {
    title: "Table of Contents",
    category: "PACKAGE OVERVIEW",
    subtitle: "Executive board package sequence with financial statements separated from advisory insight pages.",
  },
  {
    title: "Current Month Balance Sheet",
    category: "FINANCIAL POSITION",
    subtitle: "Financial position, liquidity, and capital structure overview.",
    lines: ["Current assets, fixed assets, liabilities, and equity are reviewed for liquidity and balance sheet quality."],
    divider: true,
  },
  {
    title: "Balance Sheet",
    category: "FINANCIAL STATEMENT",
    statement: "balanceSheet",
    table: [
      ["Operating Checking", "$182,000"],
      ["Savings Account", "$95,000"],
      ["Total Bank Accounts", "$277,000"],
      ["Accounts Receivable", "$146,000"],
      ["Inventory Asset", "$82,000"],
      ["Prepaid Insurance", "$9,000"],
      ["Total Current Assets", "$514,000"],
      ["Equipment and Vehicles", "$420,000"],
      ["Machinery and Tools", "$185,000"],
      ["Furniture and Office Equipment", "$46,000"],
      ["Leasehold Improvements", "$28,000"],
      ["Total Fixed Assets", "$679,000"],
      ["Less: Accumulated Depreciation", "($114,000)"],
      ["Net Fixed Assets", "$565,000"],
      ["TOTAL ASSETS", "$1,079,000"],
      ["Accounts Payable", "$78,000"],
      ["Credit Cards", "$14,000"],
      ["Vehicle Loans", "$67,000"],
      ["Equipment Notes Payable", "$91,000"],
      ["TOTAL LIABILITIES", "$282,000"],
      ["TOTAL EQUITY", "$797,000"],
    ],
  },
  {
    title: "Balance Sheet Insights & Ratios",
    category: "ADVISORY INSIGHTS",
    lines: [
      "Liquidity is healthy, with current assets exceeding short-term obligations.",
      "Working capital should be monitored through AR aging and vendor payment timing.",
      "Fixed asset intensity is material and should be reconciled against depreciation policy and additions.",
    ],
    table: [
      ["Current Ratio", "2.8x"],
      ["Working Capital", "$330,000"],
      ["Debt to Equity", "0.35x"],
      ["Cash as % of Assets", "25.7%"],
    ],
  },
  {
    title: "Fixed Asset Analysis",
    category: "CAPITAL ASSETS",
    lines: [
      "Fixed assets include equipment, vehicles, machinery, and leasehold improvements.",
      "Pulse recommends confirming current-year additions, disposals, and accumulated depreciation monthly.",
      "Step-up and step-down valuation adjustments are shown separately and are not treated as additions, disposals, or transfers unless they represent actual asset activity.",
    ],
    table: [
      ["Total Fixed Assets", "$679,000"],
      ["Accumulated Depreciation", "($114,000)"],
      ["Net Book Value", "$565,000"],
      ["Depreciation Expense", "$5,000"],
      ["Beginning Gross Assets", "$704,000"],
      ["Additions", "$0"],
      ["Disposals", "($25,000)"],
      ["Transfers", "$0"],
      ["Step-Up Valuation Adjustment", "$0"],
      ["Step-Down Valuation Adjustment", "$0"],
      ["Ending Gross Assets", "$679,000"],
      ["Accumulated Depreciation Change", "($114,000)"],
      ["Net Book Value Change", "$23,000"],
      ["Advisory Focus", "Review additions, disposals, depreciation policy, and capacity impact."],
    ],
  },
  {
    title: "Accounts Receivable Aging",
    category: "WORKING CAPITAL",
    lines: ["Receivables are reviewed for collection exposure, DSO impact, and concentration risk."],
    table: [
      ["Current", "$96,000"],
      ["1-30 Days", "$28,000"],
      ["31-60 Days", "$13,000"],
      ["61-90 Days", "$6,000"],
      ["90+ Days", "$3,000"],
      ["Total AR", "$146,000"],
    ],
  },
  {
    title: "Accounts Payable Aging",
    category: "WORKING CAPITAL",
    lines: ["Payables are reviewed for vendor pressure, payment timing, and cash runway implications."],
    table: [
      ["Current", "$44,000"],
      ["1-30 Days", "$21,000"],
      ["31-60 Days", "$9,000"],
      ["61-90 Days", "$3,000"],
      ["90+ Days", "$1,000"],
      ["Total AP", "$78,000"],
    ],
  },
  {
    title: "Inventory Analysis",
    category: "WORKING CAPITAL",
    lines: [
      "Inventory is compared to sales velocity, gross margin, and working capital usage.",
      "Pulse recommends reviewing slow-moving items and confirming inventory ties to the balance sheet.",
    ],
    table: [
      ["Raw Materials", "$34,000"],
      ["Work in Process", "$18,000"],
      ["Finished Goods", "$30,000"],
      ["Slow Moving Inventory", "$7,500"],
      ["Inventory Turnover", "5.4x"],
    ],
  },
  {
    title: "Current Month Income Statement",
    category: "FINANCIAL PERFORMANCE",
    subtitle: "Revenue, gross margin, operating expense, payroll, and net income overview.",
    lines: ["The income statement is reviewed for margin movement, expense discipline, and operating leverage."],
    divider: true,
  },
  {
    title: "Income Statement",
    category: "FINANCIAL STATEMENT",
    statement: "incomeStatement",
    table: [
      ["Industrial Services Revenue", "$485,000"],
      ["Maintenance Contracts", "$215,000"],
      ["Emergency Repair Revenue", "$124,000"],
      ["Total Income", "$824,000"],
      ["Field Labor", "$238,000"],
      ["Materials & Supplies", "$91,000"],
      ["Equipment Rentals", "$27,000"],
      ["Fuel Expense", "$19,000"],
      ["Total Cost of Goods Sold", "$375,000"],
      ["Gross Profit", "$449,000"],
      ["Payroll - Admin", "$74,000"],
      ["Insurance", "$18,000"],
      ["Software Subscriptions", "$5,400"],
      ["Utilities", "$6,200"],
      ["Marketing", "$9,800"],
      ["Office Expense", "$4,100"],
      ["Vehicle Expense", "$11,800"],
      ["Professional Fees", "$13,600"],
      ["Rent Expense", "$24,000"],
      ["Travel Expense", "$7,200"],
      ["Depreciation Expense", "$5,000"],
      ["Total Operating Expenses", "$179,100"],
      ["Net Income", "$269,900"],
    ],
  },
  {
    title: "Income Statement Insights & Ratios",
    category: "ADVISORY INSIGHTS",
    lines: [
      "Revenue is trending positively, while payroll should be monitored against revenue growth.",
      "Gross margin remains healthy but could tighten if material or labor costs rise faster than sales.",
    ],
    table: [
      ["Gross Margin", "40.0%"],
      ["Operating Margin", "8.8%"],
      ["Net Margin", "8.3%"],
      ["Payroll as % of Revenue", "18.6%"],
    ],
  },
  {
    title: "Payroll & FTE Analysis",
    category: "OPERATIONAL EFFICIENCY",
    lines: [
      "Payroll and headcount are reviewed for labor efficiency, staffing impact, and revenue per FTE.",
      "Pulse recommends monitoring overtime and department-level payroll movement monthly.",
    ],
    table: [
      ["Current FTE", "Not available"],
      ["Prior FTE", "Not available"],
      ["Payroll Cost", "Not available"],
      ["Payroll Cost per FTE", "N/A"],
      ["Revenue per FTE", "N/A"],
      ["Payroll Growth", "N/A"],
      ["Source", "Source: Not available"],
    ],
  },
  {
    title: "Executive Summary",
    category: "EXECUTIVE ADVISORY",
    lines: [
      "Overall financial health is positive, with stable cash, improving revenue, and healthy profitability.",
      "The most important near-term risk is payroll growing faster than revenue.",
      "The best opportunity is improving collections to unlock working capital and reduce cash timing risk.",
      "Pulse recommends a monthly executive review of cash, payroll, margin, AR, AP, and forecast movement.",
    ],
  },
  {
    title: "Ratio Analysis",
    category: "FINANCIAL HEALTH",
    table: [
      ["Current Ratio", "2.8x"],
      ["Quick Ratio", "2.3x"],
      ["Gross Margin", "40.0%"],
      ["Operating Margin", "8.8%"],
      ["Net Margin", "8.3%"],
      ["DSO", "31.7 days"],
      ["AP Days", "27.9 days"],
      ["Revenue per FTE", "N/A"],
    ],
  },
  {
    title: "Key Takeaways & Recommendations",
    category: "MANAGEMENT PRIORITIES",
    lines: [
      "1. Improve collections cadence and prioritize balances older than 30 days.",
      "2. Monitor payroll growth against revenue growth before approving new hiring.",
      "3. Review fixed asset additions and depreciation monthly for reporting accuracy.",
      "4. Use Pulse Predict for cash, payroll, and revenue scenario modeling.",
      "5. Continue generating monthly executive packages for trend continuity.",
    ],
  },
];

function escapePdfText(value: string) {
  return value.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7E]/g, "");
}

function textLine(text: string, x: number, y: number, size = 11, font = "F1") {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function rightAlignedTextLine(text: string, rightX: number, y: number, size = 11, font = "F1") {
  const escapedText = escapePdfText(text);
  const approximateWidth = Array.from(escapedText).reduce((width, character) => {
    if (character === "1" || character === "$" || character === "," || character === "(" || character === ")") return width + size * 0.34;
    if (character === "." || character === " ") return width + size * 0.26;
    return width + size * 0.54;
  }, 0);
  return textLine(text, rightX - approximateWidth, y, size, font);
}

function tableRows(rows: Array<[string, string]>, startY: number) {
  return rows.flatMap(([label, value], index) => {
    const y = startY - index * 18;
    return [
      index % 2 === 0 ? "0.96 0.97 0.99 rg 48 " + (y - 6) + " 516 16 re f" : "1 1 1 rg 48 " + (y - 6) + " 516 16 re f",
      "0 0 0 rg",
      textLine(label, 58, y, 9),
      rightAlignedTextLine(value, 508, y, 9, "F2"),
    ];
  });
}

function formatRatioValue(value: number | null, suffix = "x") {
  return value === null || !Number.isFinite(value) ? "N/A" : `${value.toFixed(1)}${suffix}`;
}

function formatPercentValue(value: number | null) {
  return value === null || !Number.isFinite(value) ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

function formatFteValue(value: number | null) {
  return value === null || !Number.isFinite(value) ? "Not available" : value.toFixed(1);
}

function formatOptionalCurrencyValue(value: number | null, unavailableLabel = "N/A") {
  return value === null || !Number.isFinite(value) ? unavailableLabel : formatCurrencyValue(value);
}

function payrollFteTableRows(options: NormalizedFinancialPackagePdfOptions): Array<[string, string]> {
  const analysis = payrollFteAnalysis(options.packageInput?.normalizedData);
  return [
    ["Current FTE", formatFteValue(analysis.currentFte)],
    ["Prior FTE", formatFteValue(analysis.priorFte)],
    ["Payroll Cost", formatOptionalCurrencyValue(analysis.payrollCost, analysis.payrollCostIsZeroFromSource ? "$0" : "Not available")],
    ["Payroll Cost per FTE", formatOptionalCurrencyValue(analysis.payrollCostPerFte)],
    ["Revenue per FTE", formatOptionalCurrencyValue(analysis.revenuePerFte)],
    ["Payroll Growth", formatPercentValue(analysis.payrollGrowth === null ? null : analysis.payrollGrowth)],
    ["Source", analysis.sourceStatus],
  ];
}

function mappedScheduleValues(pageTitle: string, options: NormalizedFinancialPackagePdfOptions) {
  const data = options.packageInput?.normalizedData;
  const arAging = agingBuckets(data?.normalizedARAging || []);
  const apAging = agingBuckets(data?.normalizedAPAging || []);
  const fixedAssets = fixedAssetSchedule(data);
  const ratios = ratioSchedule(data);
  if (pageTitle === "Accounts Receivable Aging") {
    return {
      "current": formatCurrencyValue(arAging.current),
      "1-30 days": formatCurrencyValue(arAging.oneToThirty),
      "31-60 days": formatCurrencyValue(arAging.thirtyOneToSixty),
      "61-90 days": formatCurrencyValue(arAging.sixtyOneToNinety),
      "90+ days": formatCurrencyValue(arAging.ninetyPlus),
      "total ar": formatCurrencyValue(arAging.total),
    };
  }
  if (pageTitle === "Accounts Payable Aging") {
    return {
      "current": formatCurrencyValue(apAging.current),
      "1-30 days": formatCurrencyValue(apAging.oneToThirty),
      "31-60 days": formatCurrencyValue(apAging.thirtyOneToSixty),
      "61-90 days": formatCurrencyValue(apAging.sixtyOneToNinety),
      "90+ days": formatCurrencyValue(apAging.ninetyPlus),
      "total ap": formatCurrencyValue(apAging.total),
    };
  }
  if (pageTitle === "Inventory Analysis") {
    const analysis = inventoryAnalysis(data, options.industryType);
    return {
      "raw materials": formatCurrencyValue(analysis.items.filter((row) => row.inventoryStage === "Raw Materials").reduce((sum, row) => sum + row.extendedValue, 0)),
      "work in process": formatCurrencyValue(analysis.items.filter((row) => row.inventoryStage === "Work in Process").reduce((sum, row) => sum + row.extendedValue, 0)),
      "finished goods": formatCurrencyValue(analysis.items.filter((row) => row.inventoryStage === "Finished Goods").reduce((sum, row) => sum + row.extendedValue, 0)),
      "slow moving inventory": "N/A",
      "inventory value": formatCurrencyValue(analysis.totalInventoryValue),
      "inventory asset": formatCurrencyValue(analysis.balanceSheetInventoryValue),
      "inventory turnover": "N/A",
    };
  }
  if (pageTitle === "Fixed Asset Analysis") {
    return {
      "total fixed assets": formatCurrencyValue(fixedAssets.originalCost),
      "accumulated depreciation": formatCurrencyValue(fixedAssets.accumulatedDepreciation),
      "net book value": formatCurrencyValue(fixedAssets.netBookValue),
      "depreciation expense": "N/A",
      "additions": "N/A",
      "disposals": "N/A",
      "net book value change": "N/A",
    };
  }
  if (pageTitle === "Balance Sheet Insights & Ratios" || pageTitle === "Ratio Analysis") {
    const payroll = payrollFteAnalysis(data);
    return {
      "current ratio": formatRatioValue(ratios.currentRatio),
      "quick ratio": formatRatioValue(ratios.quickRatio),
      "working capital": formatCurrencyValue(ratios.workingCapital),
      "debt to equity": formatRatioValue(ratios.debtToEquity),
      "debt to assets": formatRatioValue(ratios.debtToAssets),
      "cash as % of assets": formatPercentValue(ratios.totalAssets ? ratios.currentAssets / ratios.totalAssets : null),
      "revenue per fte": formatOptionalCurrencyValue(payroll.revenuePerFte),
    };
  }
  return {} as Record<string, string>;
}

function sourceSafeTableRows(rows: Array<[string, string]>, options: NormalizedFinancialPackagePdfOptions, pageTitle = "") {
  if (!options.packageInput?.normalizedData) return rows;
  const input = options.packageInput;
  const balanceSheet = input?.normalizedData?.normalizedBalanceSheet || [];
  const incomeStatement = input?.normalizedData?.normalizedIncomeStatement || [];
  const scheduleValues = mappedScheduleValues(pageTitle, options);
  const mappedValues: Record<string, number> = {
    "total assets": input?.totalAssets || 0,
    "total liabilities": input?.totalLiabilities || 0,
    "total equity": input?.totalEquity || 0,
    "total liabilities and equity": (input?.totalLiabilities || 0) + (input?.totalEquity || 0),
    "accounts receivable": sumNormalizedRows(balanceSheet, /accounts receivable|\bar\b/i),
    "total ar": sumNormalizedRows(balanceSheet, /accounts receivable|\bar\b/i),
    "accounts payable": sumNormalizedRows(balanceSheet, /accounts payable|\bap\b/i),
    "total ap": sumNormalizedRows(balanceSheet, /accounts payable|\bap\b/i),
    "inventory": sumNormalizedRows(balanceSheet, /inventory/i),
    "inventory asset": sumNormalizedRows(balanceSheet, /inventory/i),
    "total fixed assets": sumNormalizedRows(balanceSheet, /fixed asset|property|equipment|vehicle|machinery|furniture|leasehold|truck|original cost/i),
    "net book value": sumNormalizedRows(balanceSheet, /fixed asset|property|equipment|vehicle|machinery|furniture|leasehold|truck|original cost/i),
    "total income": input?.revenue || 0,
    "total revenue": input?.revenue || 0,
    "net income": input?.netIncome || 0,
    "gross profit": sumNormalizedRows(incomeStatement, /gross profit/i),
    "total operating expenses": Math.abs(input?.expenses || 0),
  };
  return rows.map(([label, value]) => {
    const key = label.trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(scheduleValues, key)) return [label, scheduleValues[key] || "N/A"] as [string, string];
    if (Object.prototype.hasOwnProperty.call(mappedValues, key)) return [label, formatCurrencyValue(Number(mappedValues[key] || 0))] as [string, string];
    return [label, value] as [string, string];
  });
}

function formatCurrencyValue(amount: number) {
  const absoluteAmount = Math.abs(Number(amount) || 0);
  const formatted = `$${Math.round(absoluteAmount).toLocaleString()}`;
  return amount < 0 ? `(${formatted})` : formatted;
}

function formatXeroCurrencyValue(amount: number) {
  const absoluteAmount = Math.abs(Number(amount) || 0);
  const formatted = `$${absoluteAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return amount < 0 ? `(${formatted})` : formatted;
}

function parseCurrencyLabel(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const isNegative = /^\(.*\)$/.test(raw) || /^-/.test(raw);
  const amount = Number(raw.replace(/[($,\s)]/g, "").replace(/^-/, ""));
  if (!Number.isFinite(amount)) return 0;
  return isNegative ? -amount : amount;
}

function sumNormalizedRows(rows: Array<{ label: string; section?: string; amount: number }>, pattern: RegExp) {
  return rows.filter((row) => pattern.test(`${row.label} ${row.section || ""}`)).reduce((total, row) => total + Number(row.amount || 0), 0);
}

function normalizedText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizedLabelKey(value: unknown) {
  return displayLabel(value).replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function displayLabel(value: unknown) {
  let text = String(value || "").trim();
  if (!text) return "";
  const knownLabels: Record<string, string> = {
    ar: "AR",
    ap: "AP",
    totalassets: "Total Assets",
    currentassets: "Current Assets",
    othercurrentassets: "Other Current Assets",
    fixedassets: "Fixed Assets",
    bankaccounts: "Bank Accounts",
    creditcards: "Credit Cards",
    currentliabilities: "Current Liabilities",
    othercurrentliabilities: "Other Current Liabilities",
    longtermliabilities: "Long-Term Liabilities",
    totalliabilitiesandequity: "Total Liabilities and Equity",
    liabilitiesandequity: "Liabilities and Equity",
    netincome: "Net Income",
  };
  const compactKey = text.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (knownLabels[compactKey]) return knownLabels[compactKey];
  text = text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  if (/^[A-Z\s&/-]+$/.test(text) && text.length > 3) {
    return text.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  return text;
}

function isBalanceSheetTotalLabel(label: string) {
  const readableLabel = displayLabel(label);
  return /^total\b/i.test(readableLabel) || /total liabilities (and|&) equity/i.test(readableLabel);
}

function isIncomeStatementTotalLabel(label: string) {
  return /^total\b/i.test(label) || /gross profit|net (income|profit)|operating income|net other income/i.test(label);
}

function classifyPdfBalanceSheetRow(row: { label: string; section?: string; source?: { raw?: unknown } }) {
  const raw = row.source?.raw as Record<string, unknown> | undefined;
  return classifyBalanceSheetAccount({
    label: row.label,
    section: row.section || "",
    accountType: String(raw?.accountType || raw?.AccountType || raw?.type || ""),
    accountClass: String(raw?.accountClass || raw?.AccountClass || raw?.class || ""),
  });
}

function rawHierarchyPath(row: { label: string; source?: { raw?: unknown } }) {
  const raw = row.source?.raw as Record<string, unknown> | undefined;
  const path = raw?.__advisacorHierarchyPath;
  if (!Array.isArray(path)) return [];
  const cleanedPath = path.map((item) => displayLabel(item)).filter(Boolean);
  return normalizedLabelKey(cleanedPath[cleanedPath.length - 1]) === normalizedLabelKey(row.label) ? cleanedPath.slice(0, -1) : cleanedPath;
}

function rawFullHierarchyPath(row: { source?: { raw?: unknown } }) {
  const raw = row.source?.raw as Record<string, unknown> | undefined;
  const path = raw?.__advisacorHierarchyPath;
  return Array.isArray(path) ? path.map((item) => displayLabel(item)).filter(Boolean) : [];
}

function rawSourceSection(row: { section?: string; source?: { raw?: unknown } }) {
  const raw = row.source?.raw as Record<string, unknown> | undefined;
  return displayLabel(raw?.__advisacorSourceSection || row.section || "");
}

type StatementHierarchyNode = {
  label: string;
  children: StatementHierarchyNode[];
  entries: FinancialStatementDisplayRow[];
  items: Array<{ type: "child"; node: StatementHierarchyNode } | { type: "entry"; row: FinancialStatementDisplayRow }>;
  value?: string;
  ytdValue?: string;
  total?: FinancialStatementDisplayRow;
};

function hierarchyNode(label: string): StatementHierarchyNode {
  return { label, children: [], entries: [], items: [] };
}

function childNode(parent: StatementHierarchyNode, label: string) {
  let child = parent.children.find((node) => normalizedText(node.label) === normalizedText(label));
  if (!child) {
    child = hierarchyNode(label);
    parent.children.push(child);
    parent.items.push({ type: "child", node: child });
  }
  return child;
}

function nodeAt(root: StatementHierarchyNode, path: string[]) {
  return path.reduce((node, label) => childNode(node, label), root);
}

function renderHierarchyNode(node: StatementHierarchyNode, depth = 0, major = false): FinancialStatementDisplayRow[] {
  const rows: FinancialStatementDisplayRow[] = [];
  if (!node.children.length && !node.entries.length && node.total) return [node.total];
  if (node.label) {
    rows.push({
      label: major ? node.label.toUpperCase() : node.label,
      value: node.value,
      ytdValue: node.ytdValue,
      kind: major ? "major" : "subheader",
      level: Math.max(depth - 1, 0),
    });
  }
  if (node.items.length) {
    for (const item of node.items) {
      if (item.type === "child") rows.push(...renderHierarchyNode(item.node, depth + 1));
      else rows.push(item.row);
    }
  } else {
    for (const child of node.children) rows.push(...renderHierarchyNode(child, depth + 1));
    rows.push(...node.entries);
  }
  if (node.total) rows.push(node.total);
  return rows;
}

function addHierarchyEntry(node: StatementHierarchyNode, row: FinancialStatementDisplayRow) {
  node.entries.push(row);
  node.items.push({ type: "entry", row });
}

function fallbackBalanceSheetPath(row: { label: string; section?: string; source?: { raw?: unknown } }) {
  const classification = classifyPdfBalanceSheetRow(row);
  const sourceSection = rawSourceSection(row);
  const sourceText = normalizedText(`${sourceSection} ${row.label}`);
  if (classification === "Current Assets") {
    const child = /bank|checking|savings|cash/.test(sourceText)
      ? "Bank Accounts"
      : /accounts receivable|\bar\b/.test(sourceText)
        ? "Accounts Receivable"
        : "Other Current Assets";
    return ["ASSETS", "Current Assets", child];
  }
  if (classification === "Fixed Assets") {
    const child = /truck/.test(sourceText)
      ? "Truck"
      : /vehicle/.test(sourceText)
        ? "Vehicles"
        : /equipment|machinery|furniture|leasehold|original cost|accumulated depreciation|fixed asset|other asset/.test(sourceText)
          ? sourceSection || "Fixed Assets"
          : "Fixed Assets";
    return ["ASSETS", "Fixed Assets", displayLabel(child)];
  }
  if (classification === "Current Liabilities") {
    const child = /accounts payable|\bap\b/.test(sourceText)
      ? "Accounts Payable"
      : /credit card|mastercard|visa|amex|american express|discover/.test(sourceText)
        ? "Credit Cards"
        : "Other Current Liabilities";
    return ["LIABILITIES AND EQUITY", "Liabilities", "Current Liabilities", child];
  }
  if (classification === "Long-Term Liabilities") {
    const child = /notes payable/.test(sourceText)
      ? "Notes Payable"
      : /loan payable/.test(sourceText)
        ? "Loan Payable"
        : "Long-Term Liabilities";
    return ["LIABILITIES AND EQUITY", "Liabilities", "Long-Term Liabilities", child];
  }
  if (classification === "Equity") return ["LIABILITIES AND EQUITY", "Equity"];
  return [displayLabel(classification)];
}

function xeroSourceSectionBalanceSheetPath(row: { label: string; section?: string; source?: { provider?: string; raw?: unknown } }) {
  if (row.source?.provider !== "xero") return null;
  const sourceSection = rawSourceSection(row);
  const sourceText = normalizedText(`${sourceSection} ${row.section || ""}`);
  if (/current liabilities?/.test(sourceText)) {
    if (/accounts payable|\bap\b|\bpayables\b/i.test(row.label)) return ["LIABILITIES AND EQUITY", "Liabilities", "Current Liabilities", "Accounts Payable"];
    return ["LIABILITIES AND EQUITY", "Liabilities", "Current Liabilities"];
  }
  if (/long.?term liabilities?|non.?current liabilities?/.test(sourceText)) {
    return ["LIABILITIES AND EQUITY", "Liabilities", "Long-Term Liabilities"];
  }
  if (/\bliabilities?\b/.test(sourceText)) {
    return ["LIABILITIES AND EQUITY", "Liabilities"];
  }
  if (/\bequity\b/.test(sourceText)) {
    return ["LIABILITIES AND EQUITY", "Equity"];
  }
  if (/fixed assets?|non.?current assets?|property,? plant|plant and equipment|ppe/.test(sourceText)) {
    return ["ASSETS", "Fixed Assets", displayLabel(sourceSection || "Fixed Assets")];
  }
  if (/current assets?/.test(sourceText)) {
    if (/accounts receivable|\bar\b|\breceivables\b/i.test(row.label)) return ["ASSETS", "Current Assets", "Accounts Receivable"];
    return ["ASSETS", "Current Assets"];
  }
  if (/\bassets?\b/.test(sourceText)) {
    return ["ASSETS"];
  }
  return null;
}

function balanceSheetTotalPath(label: string) {
  const readableLabel = displayLabel(label);
  if (/total current assets/i.test(readableLabel)) return ["ASSETS", "Current Assets"];
  if (/total fixed assets|net property and equipment|total property and equipment/i.test(readableLabel)) return ["ASSETS", "Fixed Assets"];
  if (/total truck/i.test(readableLabel)) return ["ASSETS", "Fixed Assets", "Truck"];
  if (/^total assets$/i.test(readableLabel)) return ["ASSETS"];
  if (/total current liabilities/i.test(readableLabel)) return ["LIABILITIES AND EQUITY", "Liabilities", "Current Liabilities"];
  if (/total long.?term liabilities/i.test(readableLabel)) return ["LIABILITIES AND EQUITY", "Liabilities", "Long-Term Liabilities"];
  if (/^total liabilities$/i.test(readableLabel)) return ["LIABILITIES AND EQUITY", "Liabilities"];
  if (/^total equity$/i.test(readableLabel)) return ["LIABILITIES AND EQUITY", "Equity"];
  if (/total liabilities (and|&) equity/i.test(readableLabel)) return ["LIABILITIES AND EQUITY"];
  return null;
}

function normalizeBalanceSheetSourcePath(path: string[]) {
  if (!path.length) return path;
  const normalizedPath = [...path];
  const first = normalizedLabelKey(normalizedPath[0]);
  if (first === "assets" || first === "totalassets") {
    normalizedPath[0] = "ASSETS";
  } else if (first === "liabilitiesandequity" || first === "totalliabilitiesandequity") {
    normalizedPath[0] = "LIABILITIES AND EQUITY";
    const second = normalizedLabelKey(normalizedPath[1]);
    if (second === "currentliabilities" || second === "longtermliabilities") normalizedPath.splice(1, 0, "Liabilities");
  }
  return normalizedPath;
}

function xeroBalanceSheetHierarchyPath(row: { label: string; source?: { provider?: string; raw?: unknown } }) {
  if (row.source?.provider !== "xero") return null;
  const path = rawHierarchyPath(row);
  if (!path.length) return null;
  const findIndex = (patterns: RegExp[]) => path.findIndex((part) => patterns.some((pattern) => pattern.test(displayLabel(part))));
  const currentLiabilityIndex = findIndex([/^current liabilities$/i, /^current liability$/i]);
  if (currentLiabilityIndex >= 0) return ["LIABILITIES AND EQUITY", "Liabilities", "Current Liabilities", ...path.slice(currentLiabilityIndex + 1)];
  const longTermLiabilityIndex = findIndex([/^long.?term liabilities$/i, /^non.?current liabilities$/i]);
  if (longTermLiabilityIndex >= 0) return ["LIABILITIES AND EQUITY", "Liabilities", "Long-Term Liabilities", ...path.slice(longTermLiabilityIndex + 1)];
  const equityIndex = findIndex([/^equity$/i]);
  if (equityIndex >= 0) return ["LIABILITIES AND EQUITY", "Equity", ...path.slice(equityIndex + 1)];
  const currentAssetIndex = findIndex([/^current assets$/i, /^current asset$/i]);
  if (currentAssetIndex >= 0) return ["ASSETS", "Current Assets", ...path.slice(currentAssetIndex + 1)];
  const fixedAssetIndex = findIndex([/^fixed assets$/i, /^non.?current assets$/i, /^property,? plant and equipment$/i, /^plant and equipment$/i, /^ppe$/i]);
  if (fixedAssetIndex >= 0) return ["ASSETS", "Fixed Assets", ...path.slice(fixedAssetIndex + 1)];
  const liabilitiesIndex = findIndex([/^liabilities$/i, /^liabilities and equity$/i]);
  if (liabilitiesIndex >= 0) return normalizeBalanceSheetSourcePath(path.slice(liabilitiesIndex));
  const assetsIndex = findIndex([/^assets$/i]);
  if (assetsIndex >= 0) return normalizeBalanceSheetSourcePath(path.slice(assetsIndex));
  return null;
}

function sourceFirstBalanceSheetPath(row: { label: string; section?: string; source?: { provider?: string; raw?: unknown } }) {
  const xeroSectionPath = !isBalanceSheetTotalLabel(row.label) ? xeroSourceSectionBalanceSheetPath(row) : null;
  if (xeroSectionPath?.[0] === "LIABILITIES AND EQUITY") return xeroSectionPath;
  const xeroHierarchyPath = !isBalanceSheetTotalLabel(row.label) ? xeroBalanceSheetHierarchyPath(row) : null;
  if (xeroHierarchyPath?.length) return xeroHierarchyPath;
  if (xeroSectionPath) return xeroSectionPath;
  const sourcePath = rawHierarchyPath(row);
  if (sourcePath.length <= 1) return fallbackBalanceSheetPath(row);
  return normalizeBalanceSheetSourcePath(sourcePath);
}

function finalizeBalanceSheetRows(rows: FinancialStatementDisplayRow[]) {
  const finalTotalRows = rows.filter((row) => /total liabilities (and|&) equity/i.test(displayLabel(row.label)));
  if (!finalTotalRows.length) return rows;
  const finalTotal = finalTotalRows[finalTotalRows.length - 1];
  return [
    ...rows.filter((row) => !/total liabilities (and|&) equity/i.test(displayLabel(row.label))),
    {
      ...finalTotal,
      label: "TOTAL LIABILITIES AND EQUITY",
      kind: "total" as const,
    },
  ];
}

function buildBalanceSheetDisplayRows(normalizedData?: AdvisacorNormalizedFinancialData): FinancialStatementDisplayRow[] | null {
  const rows = normalizedData?.normalizedBalanceSheet || [];
  if (!rows.length) return null;
  const isXeroBalanceSheet = normalizedData?.sourceSystem === "xero";
  const formatBalanceSheetAmount = normalizedData?.sourceSystem === "xero" ? formatXeroCurrencyValue : formatCurrencyValue;
  const xeroEntityTotal = (entities: Array<{ amount?: number; balance?: number }> = []) =>
    entities.reduce((total, entity) => total + Number(entity.amount ?? entity.balance ?? 0), 0);
  const xeroControlPatterns = (label: string) => {
    if (/accounts receivable|\breceivables\b/i.test(label)) return [/accounts receivable/i, /\breceivables\b/i];
    if (/accounts payable|\bpayables\b/i.test(label)) return [/accounts payable/i, /\bpayables\b/i];
    return [];
  };
  const xeroControlReplacementAmount = (row: { label: string; amount: number; section?: string }) => {
    if (!isXeroBalanceSheet || Math.abs(Number(row.amount || 0)) > 0.005) return Number(row.amount || 0);
    const patterns = xeroControlPatterns(row.label);
    if (!patterns.length) return Number(row.amount || 0);
    const replacement = rows.find((candidate) =>
      patterns.some((pattern) => pattern.test(`${candidate.label} ${candidate.section || ""}`)) &&
      Math.abs(Number(candidate.amount || 0)) > 0.005,
    );
    if (replacement) return Number(replacement.amount || 0);
    if (/accounts receivable|\breceivables\b/i.test(row.label)) {
      const arAgingTotal = xeroEntityTotal(normalizedData?.normalizedARAging || []);
      if (Math.abs(arAgingTotal) > 0.005) return arAgingTotal;
    }
    if (/accounts payable|\bpayables\b/i.test(row.label)) {
      const apAgingTotal = xeroEntityTotal(normalizedData?.normalizedAPAging || []);
      if (Math.abs(apAgingTotal) > 0.005) return apAgingTotal;
    }
    return Number(row.amount || 0);
  };
  const xeroHasNonZeroControlRow = (row: { label: string; amount: number }) =>
    isXeroBalanceSheet &&
    /accounts receivable|accounts payable|\breceivables\b|\bpayables\b/i.test(row.label) &&
    Math.abs(Number(row.amount || 0)) <= 0.005 &&
    xeroControlReplacementAmount(row) === 0 &&
    rows.some((candidate) => normalizedText(candidate.label) === normalizedText(row.label) && Math.abs(Number(candidate.amount || 0)) > 0.005);
  const isParentCategoryRow = (row: { label: string; section?: string }) => {
    const section = normalizedText(row.section);
    if (!section || section !== normalizedText(row.label)) return false;
    return rows.some((candidate) => normalizedText(candidate.section) === section && normalizedText(candidate.label) !== section && !isBalanceSheetTotalLabel(candidate.label));
  };
  const root = hierarchyNode("");
  const amountByPath = new Map<string, number>();
  const pathKey = (path: string[]) => path.map(normalizedText).join(">");
  const hasNativeSourceHierarchy = rows.some((row) => rawHierarchyPath(row).length > 1);
  const hasXeroDerivedControlFallback =
    isXeroBalanceSheet &&
    rows.some((row) => (row.source?.raw as Record<string, unknown> | undefined)?.__advisacorDerivedFrom === "xero_control_account_fallback");
  const explicitXeroTotal = (patterns: RegExp[]) => {
    if (!isXeroBalanceSheet) return null;
    const totalRow = rows.find((row) => patterns.some((pattern) => pattern.test(displayLabel(row.label))));
    return totalRow ? Number(totalRow.amount || 0) : null;
  };
  const hasPathPrefix = (path: string[], prefix: string[]) =>
    prefix.every((part, index) => normalizedText(path[index]) === normalizedText(part));
  const isXeroBankCashRow = (row: { label: string; section?: string; source?: { provider?: string; raw?: unknown } }) =>
    isXeroBalanceSheet &&
    row.source?.provider === "xero" &&
    !isBalanceSheetTotalLabel(row.label) &&
    /bank|checking|savings|cash/.test(normalizedText(`${rawSourceSection(row)} ${row.section || ""} ${row.label}`));
  const xeroBankRowsForcedToLiabilities = new Map<typeof rows[number], number>();
  const totalCurrentAssets = explicitXeroTotal([/^total current assets$/i]);
  const totalCurrentLiabilities = explicitXeroTotal([/^total current liabilities$/i]);
  if (isXeroBalanceSheet && totalCurrentAssets !== null && totalCurrentLiabilities !== null) {
    const nonTotalRows = rows.filter((row) => !isBalanceSheetTotalLabel(row.label) && !xeroHasNonZeroControlRow(row));
    const sumPathExcluding = (prefix: string[], excludedRow: typeof rows[number]) =>
      nonTotalRows.reduce((total, candidate) => {
        if (candidate === excludedRow) return total;
        return hasPathPrefix(sourceFirstBalanceSheetPath(candidate), prefix)
          ? total + xeroControlReplacementAmount(candidate)
          : total;
      }, 0);

    for (const row of nonTotalRows) {
      const basePath = sourceFirstBalanceSheetPath(row);
      if (!isXeroBankCashRow(row) || !hasPathPrefix(basePath, ["ASSETS", "Current Assets"])) continue;
      const amount = xeroControlReplacementAmount(row);
      if (Math.abs(amount) <= 0.005) continue;
      const currentAssetsWithoutRow = sumPathExcluding(["ASSETS", "Current Assets"], row);
      const currentLiabilitiesWithoutRow = sumPathExcluding(["LIABILITIES AND EQUITY", "Liabilities", "Current Liabilities"], row);
      const assetVarianceWithRow = Math.abs(currentAssetsWithoutRow + amount - totalCurrentAssets);
      const assetVarianceWithoutRow = Math.abs(currentAssetsWithoutRow - totalCurrentAssets);
      const liabilityVarianceWithRow = Math.abs(currentLiabilitiesWithoutRow + amount - totalCurrentLiabilities);
      const liabilityVarianceWithAbsoluteRow = Math.abs(currentLiabilitiesWithoutRow + Math.abs(amount) - totalCurrentLiabilities);
      const liabilityVarianceWithoutRow = Math.abs(currentLiabilitiesWithoutRow - totalCurrentLiabilities);
      if (assetVarianceWithoutRow + 0.01 < assetVarianceWithRow && liabilityVarianceWithRow + 0.01 < liabilityVarianceWithoutRow) {
        xeroBankRowsForcedToLiabilities.set(row, amount);
      } else if (assetVarianceWithoutRow + 0.01 < assetVarianceWithRow && liabilityVarianceWithAbsoluteRow + 0.01 < liabilityVarianceWithoutRow) {
        xeroBankRowsForcedToLiabilities.set(row, Math.abs(amount));
      }
    }
    if (xeroBankRowsForcedToLiabilities.size) {
      console.info("Xero Balance Sheet bank/cash source-total classification override:", {
        rows: [...xeroBankRowsForcedToLiabilities.entries()].map(([row, forcedAmount]) => ({
          label: row.label,
          amount: row.amount,
          forcedAmount,
          section: row.section,
          sourceSection: rawSourceSection(row),
          hierarchyPath: rawFullHierarchyPath(row),
          targetPath: ["LIABILITIES AND EQUITY", "Liabilities", "Current Liabilities"],
        })),
        totalCurrentAssets,
        totalCurrentLiabilities,
      });
    }
  }
  const recalculatedXeroTotalKeys = new Set(
    [
      ["ASSETS", "Current Assets"],
      ["ASSETS"],
      ["LIABILITIES AND EQUITY", "Liabilities", "Current Liabilities"],
      ["LIABILITIES AND EQUITY", "Liabilities"],
      ["LIABILITIES AND EQUITY"],
    ].map(pathKey),
  );

  for (const row of rows) {
    if (xeroHasNonZeroControlRow(row)) continue;
    if (!hasNativeSourceHierarchy && isParentCategoryRow(row)) continue;
    if (isBalanceSheetTotalLabel(row.label)) {
      const sourcePath = rawHierarchyPath(row);
      const totalPath = sourcePath.length > 1 ? normalizeBalanceSheetSourcePath(sourcePath) : balanceSheetTotalPath(row.label) || sourceFirstBalanceSheetPath(row);
      const readableLabel = displayLabel(row.label);
      nodeAt(root, totalPath).total = {
        label: /^total assets$/i.test(readableLabel)
          ? "TOTAL ASSETS"
          : /total liabilities (and|&) equity/i.test(readableLabel)
            ? "TOTAL LIABILITIES AND EQUITY"
            : readableLabel,
        value: formatBalanceSheetAmount(Number(row.amount || 0)),
        kind: /^total assets$|total liabilities (and|&) equity/i.test(readableLabel) ? "total" : "subtotal",
      };
      continue;
    }
    const path = xeroBankRowsForcedToLiabilities.has(row)
      ? ["LIABILITIES AND EQUITY", "Liabilities", "Current Liabilities"]
      : sourceFirstBalanceSheetPath(row);
    const effectiveAmount = xeroBankRowsForcedToLiabilities.get(row) ?? xeroControlReplacementAmount(row);
    for (let depth = 1; depth <= path.length; depth += 1) {
      const key = pathKey(path.slice(0, depth));
      amountByPath.set(key, (amountByPath.get(key) || 0) + effectiveAmount);
    }
    const leaf = nodeAt(root, path);
    addHierarchyEntry(leaf, {
      label: displayLabel(row.label),
      value: formatBalanceSheetAmount(effectiveAmount),
      level: Math.max(path.length - 1, 1),
    });
  }

  const ensureTotal = (path: string[], label: string, totalKind: "subtotal" | "total" = "subtotal") => {
    if (hasNativeSourceHierarchy && !hasXeroDerivedControlFallback) return;
    const node = nodeAt(root, path);
    const calculatedTotal = amountByPath.get(pathKey(path)) || 0;
    const shouldRecalculateXeroTotal = hasXeroDerivedControlFallback && recalculatedXeroTotalKeys.has(pathKey(path));
    if (!node.total || shouldRecalculateXeroTotal || (isXeroBalanceSheet && Math.abs(parseCurrencyLabel(node.total.value)) <= 0.005 && Math.abs(calculatedTotal) > 0.005)) {
      node.total = {
        label,
        value: formatBalanceSheetAmount(calculatedTotal),
        kind: totalKind,
      };
    }
  };
  ensureTotal(["ASSETS", "Current Assets"], "Total Current Assets");
  ensureTotal(["ASSETS", "Fixed Assets"], "Total Fixed Assets");
  ensureTotal(["ASSETS"], "TOTAL ASSETS", "total");
  ensureTotal(["LIABILITIES AND EQUITY", "Liabilities", "Current Liabilities"], "Total Current Liabilities");
  ensureTotal(["LIABILITIES AND EQUITY", "Liabilities", "Long-Term Liabilities"], "Total Long-Term Liabilities");
  ensureTotal(["LIABILITIES AND EQUITY", "Liabilities"], "Total Liabilities");
  ensureTotal(["LIABILITIES AND EQUITY", "Equity"], "Total Equity");
  ensureTotal(["LIABILITIES AND EQUITY"], "TOTAL LIABILITIES AND EQUITY", "total");

  const displayRows = finalizeBalanceSheetRows(root.children.flatMap((node) => renderHierarchyNode(node, 0, true)));
  if (isXeroBalanceSheet) {
    const targetRows = /checking account|computer equipment|office equipment|total fixed assets|total current assets|total current liabilities/i;
    console.info("Xero PDF Balance Sheet row trace:", {
      inputRows: rows
        .filter((row) => targetRows.test(row.label))
        .map((row) => ({
          label: row.label,
          amount: row.amount,
          section: row.section,
          sourceSection: rawSourceSection(row),
          hierarchyPath: rawFullHierarchyPath(row),
          computedPath: sourceFirstBalanceSheetPath(row),
        })),
      displayRows: displayRows
        .filter((row) => targetRows.test(row.label))
        .map((row) => ({
          label: row.label,
          value: row.value,
          kind: row.kind,
          level: row.level,
        })),
    });
  }
  return displayRows;
}

function classifyIncomeStatementFallback(row: { label: string; section?: string; source?: { raw?: unknown } }) {
  const text = normalizedText(`${rawSourceSection(row)} ${row.section || ""} ${row.label}`);
  if (/cost of goods|cost of sales|cost of revenue|\bcogs\b/.test(text)) return "Cost of Goods Sold";
  if (/other income/.test(text)) return "Other Income";
  if (/other expense/.test(text)) return "Other Expenses";
  if (/expense|operating expense/.test(text)) return "Expenses";
  if (/income|revenue|sales/.test(text) && !/net income|gross profit/.test(text)) return "Income";
  if (/net income|net profit/.test(text)) return "Net Income";
  return displayLabel(row.section || "Unclassified");
}

function incomeStatementRowKey(row: { label?: string; section?: string; source?: { raw?: unknown } }) {
  const baseKey = incomeStatementBaseRowKey(row);
  const raw = row.source?.raw as Record<string, unknown> | undefined;
  const rowType = normalizedText(raw?.rowType || raw?.RowType || "");
  return `${baseKey}::${rowType}`;
}

function incomeStatementBaseRowKey(row: { label?: string; section?: string; source?: { raw?: unknown } }) {
  const path = rawHierarchyPath({ label: row.label || row.section || "", source: row.source });
  return `${path.map(normalizedText).join(">")}::${normalizedText(row.label) || normalizedText(row.section)}`;
}

function sourceHasReportAmount(row: { amount?: number; source?: { raw?: unknown } }) {
  const raw = row.source?.raw as Record<string, unknown> | undefined;
  if (typeof raw?.__advisacorHasReportAmount === "boolean") return raw.__advisacorHasReportAmount;
  return Math.abs(Number(row.amount || 0)) > 0.005;
}

function mergedIncomeStatementLayoutRows(rows: CanonicalPnLRow[], ytdRows: CanonicalPnLRow[]) {
  const primaryRows = ytdRows.length > rows.length ? ytdRows : rows;
  const secondaryRows = primaryRows === ytdRows ? rows : ytdRows;
  const seen = new Set<string>();
  const output: CanonicalPnLRow[] = [];
  const appendRows = (candidateRows: CanonicalPnLRow[]) => {
    for (const row of candidateRows) {
      const key = incomeStatementRowKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(row);
    }
  };
  appendRows(primaryRows);
  appendRows(secondaryRows);
  return output;
}

function uniqueIncomeStatementAmountMap(rows: CanonicalPnLRow[], amountRowsOnly = false) {
  const counts = new Map<string, number>();
  const amounts = new Map<string, number>();
  for (const row of rows) {
    if (amountRowsOnly && !sourceHasReportAmount(row)) continue;
    const key = incomeStatementBaseRowKey(row);
    counts.set(key, (counts.get(key) || 0) + 1);
    amounts.set(key, Number(row.amount || 0));
  }
  return new Map([...amounts.entries()].filter(([key]) => counts.get(key) === 1));
}

function normalizeIncomeStatementSummary(normalizedData?: AdvisacorNormalizedFinancialData): FinancialStatementDisplayRow[] | null {
  const rows = normalizedData?.normalizedIncomeStatement || [];
  if (!rows.length) return null;
  const formatIncomeStatementAmount = normalizedData?.sourceSystem === "xero" ? formatXeroCurrencyValue : formatCurrencyValue;
  const current = buildMappedFinancialSummary([], rows);
  const ytdRows = normalizedData?.normalizedIncomeStatementYtd || [];
  const ytd = ytdRows.length ? buildMappedFinancialSummary([], ytdRows) : null;
  const ytdAmount = (amount: number | undefined) => (ytd ? formatIncomeStatementAmount(Number(amount || 0)) : "N/A");
  const netOperatingIncome = current.revenue - Math.abs(current.cogs) - Math.abs(current.expenses);
  const ytdNetOperatingIncome = ytd ? ytd.revenue - Math.abs(ytd.cogs) - Math.abs(ytd.expenses) : undefined;
  const output: FinancialStatementDisplayRow[] = [
    { label: "INCOME", kind: "major" },
    { label: "Total Income", value: formatIncomeStatementAmount(current.revenue), ytdValue: ytdAmount(ytd?.revenue), kind: "subtotal" },
  ];
  if (Math.abs(current.cogs) > 0.005 || (ytd && Math.abs(ytd.cogs) > 0.005)) {
    output.push(
      { label: "COST OF GOODS SOLD", kind: "major" },
      { label: "Total Cost Of Goods Sold", value: formatIncomeStatementAmount(Math.abs(current.cogs)), ytdValue: ytdAmount(Math.abs(ytd?.cogs || 0)), kind: "subtotal" },
    );
  }
  output.push(
    { label: "GROSS PROFIT", value: formatIncomeStatementAmount(current.grossProfit), ytdValue: ytdAmount(ytd?.grossProfit), kind: "highlight" },
    { label: "EXPENSES", kind: "major" },
    { label: "Total Expenses", value: formatIncomeStatementAmount(Math.abs(current.expenses)), ytdValue: ytdAmount(Math.abs(ytd?.expenses || 0)), kind: "subtotal" },
    { label: "NET OPERATING INCOME", value: formatIncomeStatementAmount(netOperatingIncome), ytdValue: ytdAmount(ytdNetOperatingIncome), kind: "highlight" },
  );
  if (Math.abs(current.otherIncome) > 0.005 || (ytd && Math.abs(ytd.otherIncome) > 0.005)) {
    output.push(
      { label: "OTHER INCOME", kind: "major" },
      { label: "Total Other Income", value: formatIncomeStatementAmount(current.otherIncome), ytdValue: ytdAmount(ytd?.otherIncome), kind: "subtotal" },
    );
  }
  if (Math.abs(current.otherExpenses) > 0.005 || (ytd && Math.abs(ytd.otherExpenses) > 0.005)) {
    output.push(
      { label: "OTHER EXPENSE", kind: "major" },
      { label: "Total Other Expense", value: formatIncomeStatementAmount(Math.abs(current.otherExpenses)), ytdValue: ytdAmount(Math.abs(ytd?.otherExpenses || 0)), kind: "subtotal" },
    );
  }
  output.push({ label: "NET INCOME", value: formatIncomeStatementAmount(current.netIncome), ytdValue: ytdAmount(ytd?.netIncome), kind: "total" });
  return output;
}

function normalizeIncomeStatementHierarchy(normalizedData?: AdvisacorNormalizedFinancialData): FinancialStatementDisplayRow[] | null {
  const rows = normalizedData?.normalizedIncomeStatement || [];
  const ytdRows = normalizedData?.normalizedIncomeStatementYtd || [];
  if (!rows.length && !ytdRows.length) return null;
  const formatIncomeStatementAmount = normalizedData?.sourceSystem === "xero" ? formatXeroCurrencyValue : formatCurrencyValue;
  const currentByKey = new Map(rows.map((row) => [incomeStatementRowKey(row), Number(row.amount || 0)]));
  const ytdByKey = new Map(ytdRows.map((row) => [incomeStatementRowKey(row), Number(row.amount || 0)]));
  const currentByBaseKey = uniqueIncomeStatementAmountMap(rows);
  const ytdByBaseKey = uniqueIncomeStatementAmountMap(ytdRows);
  const currentAmountKeys = new Set(rows.filter(sourceHasReportAmount).map(incomeStatementRowKey));
  const ytdAmountKeys = new Set(ytdRows.filter(sourceHasReportAmount).map(incomeStatementRowKey));
  const currentAmountForRow = (row: CanonicalPnLRow) => currentByKey.get(incomeStatementRowKey(row)) ?? currentByBaseKey.get(incomeStatementBaseRowKey(row)) ?? 0;
  const ytdAmountForRow = (row: CanonicalPnLRow) => ytdByKey.get(incomeStatementRowKey(row)) ?? ytdByBaseKey.get(incomeStatementBaseRowKey(row));
  const ytdDisplayForRow = (row: CanonicalPnLRow) => {
    const amount = ytdAmountForRow(row);
    return amount === undefined ? "N/A" : formatIncomeStatementAmount(amount);
  };
  const root = hierarchyNode("");
  for (const row of mergedIncomeStatementLayoutRows(rows, ytdRows)) {
    const key = incomeStatementRowKey(row);
    const raw = row.source?.raw as Record<string, unknown> | undefined;
    if (/header/i.test(String(raw?.rowType || raw?.RowType || ""))) {
      const headerPath = rawFullHierarchyPath(row);
      if (headerPath.length) {
        const node = nodeAt(root, headerPath);
        if (sourceHasReportAmount(row) || currentAmountKeys.has(key) || ytdAmountKeys.has(key)) {
          node.value = formatIncomeStatementAmount(currentAmountForRow(row));
          node.ytdValue = ytdDisplayForRow(row);
        }
      }
      continue;
    }
    const sourcePath = rawHierarchyPath(row);
    const sourceFullPath = rawFullHierarchyPath(row);
    const fallbackPath = [classifyIncomeStatementFallback(row)];
    const label = displayLabel(row.label);
    const total = isIncomeStatementTotalLabel(label);
    if (total) {
      const path = sourcePath.length ? sourcePath : sourceFullPath.length ? sourceFullPath : fallbackPath;
      nodeAt(root, path).total = {
        label: /gross profit|operating income|net income|net profit/i.test(label) ? label.toUpperCase() : label,
        value: formatIncomeStatementAmount(currentAmountForRow(row)),
        ytdValue: ytdDisplayForRow(row),
        kind: /gross profit|operating income/i.test(label) ? "highlight" : /net income|net profit/i.test(label) ? "total" : "subtotal",
      };
    } else {
      const path = sourcePath.length ? sourcePath : fallbackPath;
      addHierarchyEntry(nodeAt(root, path), {
        label,
        value: formatIncomeStatementAmount(currentAmountForRow(row)),
        ytdValue: ytdDisplayForRow(row),
        level: Math.max(path.length, 1),
      });
    }
  }
  return root.children.flatMap((node) => renderHierarchyNode(node, 0, true));
}

function normalizedStatementRows(statement: "balanceSheet" | "incomeStatement", normalizedData?: AdvisacorNormalizedFinancialData): FinancialStatementDisplayRow[] | null {
  return statement === "balanceSheet" ? buildBalanceSheetDisplayRows(normalizedData) : normalizeIncomeStatementHierarchy(normalizedData);
}

export function buildFinancialPackageInputFromNormalizedData(context: ReportDataContext | { normalizedData?: AdvisacorNormalizedFinancialData; reportDataContext?: ReportDataContext } | null | undefined): FinancialPackageNormalizedInput {
  const reportDataContext = "reportDataContext" in (context || {}) ? (context as { reportDataContext?: ReportDataContext }).reportDataContext : context as ReportDataContext | undefined;
  const normalizedData =
    reportDataContext?.normalizedData ||
    ("normalizedData" in (context || {}) ? (context as { normalizedData?: AdvisacorNormalizedFinancialData }).normalizedData : undefined);
  const balanceSheet = normalizedData?.normalizedBalanceSheet || [];
  const incomeStatement = normalizedData?.normalizedIncomeStatement || [];
  const mappedSummary = buildMappedFinancialSummary(balanceSheet, incomeStatement);
  const input = {
    sourceSystem: normalizedData?.sourceSystem || reportDataContext?.sourceSystem,
    connectionId: normalizedData?.connectionId || reportDataContext?.connectionId,
    tenantName: reportDataContext?.tenantName || normalizedData?.tenantName,
    totalAssets: mappedSummary.totalAssets,
    totalLiabilities: mappedSummary.totalLiabilities,
    totalEquity: mappedSummary.totalEquity,
    revenue: mappedSummary.revenue,
    expenses: -(mappedSummary.cogs + mappedSummary.expenses + mappedSummary.otherExpenses - mappedSummary.otherIncome),
    netIncome: mappedSummary.netIncome,
    cashBalance: sumNormalizedRows(balanceSheet, /cash|bank|checking|savings/i),
    balanceSheetRowsCount: balanceSheet.length,
    incomeStatementRowsCount: incomeStatement.length,
    balanceSheetRows: normalizedStatementRows("balanceSheet", normalizedData) || [],
    incomeStatementRows: normalizedStatementRows("incomeStatement", normalizedData) || [],
    incomeStatementSummaryRows: normalizeIncomeStatementSummary(normalizedData) || [],
    normalizedData,
    reportDataContext,
  };
  return input;
}

function getFinancialStatementDisplayRows(statement: "balanceSheet" | "incomeStatement", packageInput?: FinancialPackageNormalizedInput, incomeStatementDetailLevel: IncomeStatementDetailLevel = "detailed") {
  const normalizedRows =
    statement === "balanceSheet"
      ? packageInput?.balanceSheetRows
      : incomeStatementDetailLevel === "summary"
        ? packageInput?.incomeStatementSummaryRows
        : packageInput?.incomeStatementRows;
  const rows =
    normalizedRows?.length
      ? normalizedRows
      :
    (statement === "balanceSheet"
      ? [
          { label: "ASSETS", kind: "major" },
          { label: "Current Assets", kind: "subheader" },
          { label: "Cash", value: "$182,000", level: 1 },
          { label: "Savings", value: "$95,000", level: 1 },
          { label: "Accounts Receivable", value: "$146,000", level: 1 },
          { label: "Inventory", value: "$82,000", level: 1 },
          { label: "Prepaid Expenses", value: "$9,000", level: 1 },
          { label: "Total Current Assets", value: "$514,000", kind: "subtotal" },
          { label: "Property and Equipment", kind: "subheader" },
          { label: "Equipment and Vehicles", value: "$420,000", level: 1 },
          { label: "Machinery and Tools", value: "$185,000", level: 1 },
          { label: "Furniture and Office Equipment", value: "$46,000", level: 1 },
          { label: "Leasehold Improvements", value: "$28,000", level: 1 },
          { label: "Total Property and Equipment", value: "$679,000", kind: "subtotal" },
          { label: "Less: Accumulated Depreciation", value: "($114,000)", level: 1 },
          { label: "Net Property and Equipment", value: "$565,000", kind: "subtotal" },
          { label: "TOTAL ASSETS", value: "$1,079,000", kind: "total" },
          { label: "LIABILITIES AND EQUITY", kind: "major" },
          { label: "Current Liabilities", kind: "subheader" },
          { label: "Accounts Payable", value: "$78,000", level: 1 },
          { label: "Credit Cards", value: "$14,000", level: 1 },
          { label: "Current Debt", value: "$32,000", level: 1 },
          { label: "Total Current Liabilities", value: "$124,000", kind: "subtotal" },
          { label: "Long-Term Liabilities", kind: "subheader" },
          { label: "Equipment Notes Payable", value: "$91,000", level: 1 },
          { label: "Vehicle Loans", value: "$67,000", level: 1 },
          { label: "Line of Credit", value: "$0", level: 1 },
          { label: "Total Long-Term Liabilities", value: "$158,000", kind: "subtotal" },
          { label: "TOTAL LIABILITIES", value: "$282,000", kind: "subtotal" },
          { label: "Equity", kind: "subheader" },
          { label: "Owner Equity", value: "$522,100", level: 1 },
          { label: "Retained Earnings", value: "$0", level: 1 },
          { label: "Current Year Earnings", value: "$274,900", level: 1 },
          { label: "TOTAL EQUITY", value: "$797,000", kind: "subtotal" },
          { label: "TOTAL LIABILITIES AND EQUITY", value: "$1,079,000", kind: "total" },
        ]
      : [
          { label: "REVENUE", kind: "major" },
          { label: "Industrial Services Revenue", value: "$485,000", level: 1 },
          { label: "Maintenance Contracts", value: "$215,000", level: 1 },
          { label: "Emergency Repair Revenue", value: "$124,000", level: 1 },
          { label: "TOTAL REVENUE", value: "$824,000", kind: "subtotal" },
          { label: "COST OF GOODS SOLD", kind: "major" },
          { label: "Field Labor", value: "$238,000", level: 1 },
          { label: "Materials & Supplies", value: "$91,000", level: 1 },
          { label: "Equipment Rentals", value: "$27,000", level: 1 },
          { label: "Fuel Expense", value: "$19,000", level: 1 },
          { label: "TOTAL COST OF GOODS SOLD", value: "$375,000", kind: "subtotal" },
          { label: "GROSS PROFIT", value: "$449,000", kind: "highlight" },
          { label: "OPERATING EXPENSES", kind: "major" },
          { label: "Payroll - Admin", value: "$74,000", level: 1 },
          { label: "Insurance", value: "$18,000", level: 1 },
          { label: "Software Subscriptions", value: "$5,400", level: 1 },
          { label: "Utilities", value: "$6,200", level: 1 },
          { label: "Marketing", value: "$9,800", level: 1 },
          { label: "Office Expense", value: "$4,100", level: 1 },
          { label: "Vehicle Expense", value: "$11,800", level: 1 },
          { label: "Professional Fees", value: "$13,600", level: 1 },
          { label: "Rent Expense", value: "$24,000", level: 1 },
          { label: "Travel Expense", value: "$7,200", level: 1 },
          { label: "Depreciation Expense", value: "$5,000", level: 1 },
          { label: "TOTAL OPERATING EXPENSES", value: "$179,100", kind: "subtotal" },
          { label: "OPERATING INCOME", value: "$269,900", kind: "highlight" },
          { label: "OTHER INCOME / EXPENSE", kind: "major" },
          { label: "Other Income", value: "$0", level: 1 },
          { label: "Other Expense", value: "$0", level: 1 },
          { label: "NET INCOME", value: "$269,900", kind: "total" },
        ]);
  return rows;
}

function financialStatementRows(statement: "balanceSheet" | "incomeStatement", startY: number, packageInput?: FinancialPackageNormalizedInput, rowsOverride?: FinancialStatementDisplayRow[], incomeStatementDetailLevel: IncomeStatementDetailLevel = "detailed") {
  const rows = rowsOverride || getFinancialStatementDisplayRows(statement, packageInput, incomeStatementDetailLevel);
  const isIncomeStatement = statement === "incomeStatement";
  const currentRightX = isIncomeStatement ? 442 : 508;
  const ytdRightX = 508;
  const headerRows = isIncomeStatement
    ? [
        textLine("Current Period", 356, startY + 18, 8, "F2"),
        rightAlignedTextLine("YTD", ytdRightX, startY + 18, 8, "F2"),
      ]
    : [];

  return [
    ...headerRows,
    ...rows.flatMap((row, index) => {
      const y = startY - index * 15;
      const isMajor = row.kind === "major";
      const isSubtotal = row.kind === "subtotal";
      const isTotal = row.kind === "total";
      const isHighlight = row.kind === "highlight";
      const depth = Math.max(Number(row.level || 0), 0);
      const labelX = isMajor || isTotal || isHighlight ? 58 : row.kind === "subheader" || isSubtotal ? 72 + depth * 20 : 92 + Math.max(depth - 1, 0) * 20;
      const font = isMajor || row.kind === "subheader" || isSubtotal || isTotal || isHighlight ? "F2" : "F1";
      const size = isMajor ? 10 : 9;
      const output = [
        ...(isMajor ? ["0.96 0.97 0.99 rg 48 " + (y - 5) + " 516 15 re f", "0.04 0.06 0.13 rg"] : []),
        textLine(row.label, labelX, y, size, font),
        ...(row.value ? [rightAlignedTextLine(row.value, currentRightX, y, 9, font)] : []),
        ...(isIncomeStatement && row.value ? [rightAlignedTextLine(row.ytdValue || "N/A", ytdRightX, y, 9, font)] : []),
      ];
      if ((isSubtotal || isHighlight || isTotal) && row.value) {
        output.push("0.04 0.06 0.13 RG", `${isIncomeStatement ? 366 : 430} ${y - 3} m ${currentRightX} ${y - 3} l S`);
        if (isIncomeStatement) output.push(`466 ${y - 3} m ${ytdRightX} ${y - 3} l S`);
      }
      if (isTotal && row.value) {
        output.push(`${isIncomeStatement ? 366 : 430} ${y - 6} m ${currentRightX} ${y - 6} l S`);
        if (isIncomeStatement) output.push(`466 ${y - 6} m ${ytdRightX} ${y - 6} l S`);
      }
      return output;
    }),
  ];
}

function splitBalanceSheetRowsForPagination(rows: FinancialStatementDisplayRow[]) {
  const maxRowsPerPage = 31;
  const chunks: FinancialStatementDisplayRow[][] = [];
  let currentChunk: FinancialStatementDisplayRow[] = [];
  let currentMajor: FinancialStatementDisplayRow | null = null;

  for (const row of rows) {
    if (row.kind === "major") currentMajor = row;
    const continuationHeader =
      currentMajor && currentChunk.length === 0 && row.kind !== "major"
        ? [currentMajor]
        : [];
    if (currentChunk.length + continuationHeader.length + 1 > maxRowsPerPage) {
      chunks.push(currentChunk);
      currentChunk = currentMajor && row.kind !== "major" ? [currentMajor] : [];
    } else if (continuationHeader.length) {
      currentChunk.push(...continuationHeader);
    }
    currentChunk.push(row);
  }

  if (currentChunk.length) chunks.push(currentChunk);
  return chunks.length ? chunks : [rows];
}

function splitStatementRowsForPagination(rows: FinancialStatementDisplayRow[]) {
  return splitBalanceSheetRowsForPagination(rows);
}

function formatInventoryCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "N/A";
  const absoluteAmount = Math.abs(Number(amount) || 0);
  const formatted = `$${absoluteAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return amount < 0 ? `(${formatted})` : formatted;
}

function formatInventoryNumber(amount: number | null | undefined) {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "N/A";
  return Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function inventoryAnalysisSchedule(startY: number, options: NormalizedFinancialPackagePdfOptions) {
  const analysis = inventoryAnalysis(options.packageInput?.normalizedData, options.industryType);
  const scheduleRightEdge = 548;
  const headers =
    analysis.industryMode === "manufacturing"
      ? [["Inventory Category", 58], ["Qty", 318], ["Unit Cost", 408], ["Extended Value", scheduleRightEdge]] as const
      : [["Item / Inventory Part", 58], ["SKU", 268], ["Qty", 338], ["Unit Cost", 438], ["Extended Value", scheduleRightEdge]] as const;
  const rows =
    analysis.industryMode === "manufacturing"
      ? ["Raw Materials", "Work in Process", "Finished Goods", "Unclassified Inventory"].map((stage) => {
          const stageItems = analysis.items.filter((item) => item.inventoryStage === stage);
          const quantity = stageItems.some((item) => item.quantity !== null) ? stageItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : null;
          const value = stageItems.reduce((sum, item) => sum + item.extendedValue, 0);
          const unitCost = quantity ? value / quantity : null;
          return [stage, formatInventoryNumber(quantity), formatInventoryCurrency(unitCost), formatInventoryCurrency(value)];
        }).filter((row) => parseCurrencyLabel(row[row.length - 1]) > 0)
      : analysis.items.slice(0, 8).map((item) => [
          item.name,
          item.sku || "",
          formatInventoryNumber(item.quantity),
          formatInventoryCurrency(item.unitCost),
          formatInventoryCurrency(item.extendedValue),
        ]);
  const drawHeader = () =>
    headers.map(([label, x], index) => (index === 0 ? textLine(label, x, startY, 7, "F2") : rightAlignedTextLine(label, x, startY, 6.7, "F2")));
  const drawRows = rows.flatMap((row, index) => {
    const y = startY - 22 - index * 18;
    return [
      index % 2 === 0 ? "0.96 0.97 0.99 rg 48 " + (y - 6) + " 516 16 re f" : "1 1 1 rg 48 " + (y - 6) + " 516 16 re f",
      "0 0 0 rg",
      textLine(String(row[0]).slice(0, 34), 58, y, 7.2),
      ...row.slice(1).map((value, valueIndex) => rightAlignedTextLine(String(value), headers[valueIndex + 1][1], y, 6.8)),
    ];
  });
  const totalY = startY - 22 - rows.length * 18 - 6;
  const varianceY = totalY - 18;
  const noteY = varianceY - 24;
  return [
    textLine("Inventory Detail", 58, startY + 28, 12, "F2"),
    "0.83 0.54 0.29 rg 58 " + (startY + 20) + " 105 2 re f",
    "0 0 0 rg",
    ...drawHeader(),
    ...drawRows,
    "0.90 0.92 0.96 rg 48 " + (totalY - 6) + " 516 16 re f",
    "0 0 0 rg",
    textLine(`Total Qty: ${formatInventoryNumber(analysis.totalQuantity)}`, 58, totalY, 8, "F2"),
    rightAlignedTextLine(`Total Inventory Value: ${formatInventoryCurrency(analysis.totalInventoryValue)}`, scheduleRightEdge, totalY, 8, "F2"),
    `${scheduleRightEdge - 96} ${totalY - 3} m ${scheduleRightEdge} ${totalY - 3} l S`,
    textLine(analysis.tieOutStatus, 58, varianceY, 8, "F2"),
    rightAlignedTextLine(`Variance: ${formatInventoryCurrency(analysis.varianceToBalanceSheet)}`, scheduleRightEdge, varianceY, 8),
    ...(analysis.fallbackNote ? [textLine(analysis.fallbackNote, 58, noteY, 7.5)] : []),
  ];
}

function fixedAssetHorizontalSchedule(startY: number, packageInput?: FinancialPackageNormalizedInput) {
  const grossHeaders = [
    ["Category", 58],
    ["Beginning", 240],
    ["Additions", 290],
    ["Disposals", 340],
    ["Transfers", 390],
    ["Step-Up", 440],
    ["Step-Down", 490],
    ["Ending", 548],
  ] as const;
  const grossRows = [
    ["Equipment and Vehicles", "$445,000", "$0", "($25,000)", "$0", "$0", "$0", "$420,000"],
    ["Machinery and Tools", "$185,000", "$0", "$0", "$0", "$0", "$0", "$185,000"],
    ["Furniture and Office Equipment", "$46,000", "$0", "$0", "$0", "$0", "$0", "$46,000"],
    ["Leasehold Improvements", "$28,000", "$0", "$0", "$0", "$0", "$0", "$28,000"],
    ["Total Gross Fixed Assets", "$704,000", "$0", "($25,000)", "$0", "$0", "$0", "$679,000"],
  ];
  const depreciationHeaders = [
    ["Category", 58],
    ["Beginning", 258],
    ["Dep Exp", 318],
    ["Disposals", 378],
    ["Val Adj Dep", 448],
    ["Ending", 548],
  ] as const;
  const depreciationRows = [
    ["Equipment and Vehicles", "($75,000)", "($3,100)", "$8,000", "$0", "($70,100)"],
    ["Machinery and Tools", "($31,000)", "($1,300)", "$0", "$0", "($32,300)"],
    ["Furniture and Office Equipment", "($8,000)", "($400)", "$0", "$0", "($8,400)"],
    ["Leasehold Improvements", "($3,000)", "($200)", "$0", "$0", "($3,200)"],
    ["Total Accumulated Depreciation", "($117,000)", "($5,000)", "$8,000", "$0", "($114,000)"],
  ];
  const liveFixedAssets = packageInput?.normalizedData
    ? sumNormalizedRows(packageInput.normalizedData?.normalizedBalanceSheet || [], /fixed asset|property|equipment|vehicle|machinery|furniture|leasehold|truck|original cost/i)
    : null;
  const liveFixedAssetSchedule = fixedAssetSchedule(packageInput?.normalizedData);
  const useSourceSafeRows = Boolean(packageInput?.normalizedData);
  const scheduleRightEdge = 548;
  const optionalScheduleUnavailable = Boolean(packageInput?.normalizedData && liveFixedAssets !== null && Math.abs(liveFixedAssets) <= 0.005 && !liveFixedAssetSchedule.categories.length);
  if (optionalScheduleUnavailable) {
    return [
      textLine("Fixed Asset Roll-Forward by Category", 58, startY, 12, "F2"),
      "0.83 0.54 0.29 rg 58 " + (startY - 8) + " 150 2 re f",
      "0 0 0 rg",
      textLine(OPTIONAL_SUPPORTING_SCHEDULE_MESSAGE, 58, startY - 36, 8.5),
      textLine("Net Book Value", 58, startY - 82, 10, "F2"),
      rightAlignedTextLine(liveFixedAssets === null ? "$565,000" : formatCurrencyValue(liveFixedAssets), scheduleRightEdge, startY - 82, 10, "F2"),
      "430 " + (startY - 85) + " m " + scheduleRightEdge + " " + (startY - 85) + " l S",
      "430 " + (startY - 88) + " m " + scheduleRightEdge + " " + (startY - 88) + " l S",
    ];
  }
  const sourceSafeRow = (row: string[]) => {
    if (!useSourceSafeRows) return row;
    if (/total gross fixed assets/i.test(row[0])) return [row[0], "$0", "$0", "$0", "$0", "$0", "$0", formatCurrencyValue(liveFixedAssetSchedule.originalCost)];
    if (/total accumulated depreciation/i.test(row[0])) return [row[0], "$0", "N/A", "$0", formatCurrencyValue(liveFixedAssetSchedule.accumulatedDepreciation), formatCurrencyValue(liveFixedAssetSchedule.accumulatedDepreciation)];
    const category = liveFixedAssetSchedule.categories.find((asset) => normalizedText(asset.name) === normalizedText(row[0]) || normalizedText(row[0]).includes(normalizedText(asset.name)) || normalizedText(asset.name).includes(normalizedText(row[0])));
    const ending = category?.originalCost || 0;
    return [row[0], "$0", "$0", "$0", "$0", "$0", "$0", formatCurrencyValue(ending)];
  };
  const liveGrossRows = useSourceSafeRows && liveFixedAssetSchedule.categories.length
    ? [
        ...liveFixedAssetSchedule.categories.filter((asset) => Math.abs(asset.originalCost) > 0.005).slice(0, 4).map((asset) => [asset.name, "$0", "$0", "$0", "$0", "$0", "$0", formatCurrencyValue(asset.originalCost)]),
        ["Total Gross Fixed Assets", "$0", "$0", "$0", "$0", "$0", "$0", formatCurrencyValue(liveFixedAssetSchedule.originalCost)],
      ]
    : grossRows;
  const sourceSafeGrossRows = liveGrossRows.map(sourceSafeRow);
  const sourceSafeDepreciationRows = depreciationRows.map(sourceSafeRow);
  const showDepreciationSection = !useSourceSafeRows || liveFixedAssetSchedule.hasAccumulatedDepreciation;
  const drawHeader = (headers: typeof grossHeaders | typeof depreciationHeaders, y: number) =>
    headers.map(([label, x], index) => (index === 0 ? textLine(label, x, y, 6.5, "F2") : rightAlignedTextLine(label, x, y, 6.2, "F2")));
  const drawRows = (rows: string[][], y: number, rightEdges: number[]) =>
    rows.flatMap((row, rowIndex) => {
      const rowY = y - rowIndex * 18;
      const isTotal = rowIndex === rows.length - 1;
      return [
        isTotal
          ? "0.90 0.92 0.96 rg 48 " + (rowY - 6) + " 516 16 re f"
          : rowIndex % 2 === 0
            ? "0.96 0.97 0.99 rg 48 " + (rowY - 6) + " 516 16 re f"
            : "1 1 1 rg 48 " + (rowY - 6) + " 516 16 re f",
        "0 0 0 rg",
        textLine(row[0], 58, rowY, 7.2, isTotal ? "F2" : "F1"),
        ...row.slice(1).map((amount, index) => rightAlignedTextLine(amount, rightEdges[index], rowY, 6.7, isTotal ? "F2" : "F1")),
        ...(isTotal ? [`${rightEdges[0] - 43} ${rowY - 3} m ${scheduleRightEdge} ${rowY - 3} l S`] : []),
      ];
    });

  const netBookValueY = showDepreciationSection ? startY - 312 : startY - 160;
  const advisoryY = netBookValueY - 30;
  return [
    textLine("Fixed Asset Roll-Forward by Category", 58, startY, 12, "F2"),
    "0.83 0.54 0.29 rg 58 " + (startY - 8) + " 150 2 re f",
    "0 0 0 rg",
    ...drawHeader(grossHeaders, startY - 30),
    ...drawRows(sourceSafeGrossRows, startY - 50, [240, 290, 340, 390, 440, 490, scheduleRightEdge]),
    ...(showDepreciationSection
      ? [
          textLine("Accumulated Depreciation by Category", 58, startY - 160, 12, "F2"),
          "0.83 0.54 0.29 rg 58 " + (startY - 168) + " 170 2 re f",
          "0 0 0 rg",
          ...drawHeader(depreciationHeaders, startY - 190),
          ...drawRows(sourceSafeDepreciationRows, startY - 210, [258, 318, 378, 448, scheduleRightEdge]),
        ]
      : []),
    textLine("Net Book Value", 58, netBookValueY, 10, "F2"),
    rightAlignedTextLine(liveFixedAssets === null ? "$565,000" : formatCurrencyValue(liveFixedAssetSchedule.netBookValue || liveFixedAssets), scheduleRightEdge, netBookValueY, 10, "F2"),
    "430 " + (netBookValueY - 3) + " m " + scheduleRightEdge + " " + (netBookValueY - 3) + " l S",
    "430 " + (netBookValueY - 6) + " m " + scheduleRightEdge + " " + (netBookValueY - 6) + " l S",
    textLine(liveFixedAssetSchedule.tieOutStatus, 58, advisoryY, 8.5, "F2"),
    rightAlignedTextLine(`Variance: ${formatInventoryCurrency(liveFixedAssetSchedule.varianceToBalanceSheet)}`, scheduleRightEdge, advisoryY, 8.5),
    textLine("Advisory Focus", 58, advisoryY - 24, 11, "F2"),
    textLine("Review additions, disposals, transfers, valuation adjustments, and depreciation policy against operating capacity and cash flow requirements.", 58, advisoryY - 44, 8.5),
  ];
}

function buildPageContent(page: PdfPage, options: NormalizedFinancialPackagePdfOptions, pageNumber: number, totalPages: number, tocRows: Array<[string, string]>) {
  const isCover = pageNumber === 1;
  const isDivider = Boolean(page.divider);
  const ops = isCover || isDivider
    ? [
        "0.06 0.09 0.16 rg 0 0 612 792 re f",
        "0.10 0.14 0.22 rg 0 0 612 345 re f",
        "0.04 0.06 0.13 rg",
      ]
    : [
        "1 1 1 rg 0 0 612 792 re f",
        "0.04 0.06 0.13 rg 0 748 612 44 re f",
        "0.83 0.54 0.29 rg 48 735 240 3 re f",
        "0.04 0.06 0.13 rg",
      ];

  if (isCover) {
    ops.push(
      "1 1 1 rg",
      textLine("Prepared for Management", 72, 455, 12, "F2"),
      "0.83 0.54 0.29 rg 72 425 150 3 re f",
      "1 1 1 rg",
      textLine(options.companyName, 72, 385, 34, "F2"),
      textLine(`For the Period Ending ${options.reportPeriod}`, 72, 348, 12),
      textLine(`Industry: ${options.industryType}    Prepared by ${options.preparedBy}`, 72, 318, 11),
      textLine("Confidential advisory work product    Virtual CFO advisory package", 72, 292, 10),
    );
  } else if (isDivider) {
    ops.push(
      "1 1 1 rg",
      textLine(page.category.split("").join(" "), 72, 455, 12, "F2"),
      "0.83 0.54 0.29 rg 72 425 150 3 re f",
      "1 1 1 rg",
      textLine(page.title, 72, 385, page.title.length > 26 ? 29 : 34, "F2"),
      textLine(`For the Period Ending ${options.reportPeriod}`, 72, 348, 12),
      textLine(page.subtitle || "", 72, 318, 11),
    );
  } else {
    ops.push(
      textLine(page.category.split("").join(" "), 48, 710, 10, "F2"),
      textLine(page.title, 48, 675, 27, "F2"),
      textLine(page.subtitle || `For the Period Ending ${options.reportPeriod}`, 48, 648, 10),
    );

    if (page.title === "Table of Contents") {
      tocRows.forEach(([pageLabel, title], index) => {
        const y = 600 - index * 24;
        ops.push(
          "0.96 0.97 0.99 rg 48 " + (y - 7) + " 516 18 re f",
          "0 0 0 rg",
          textLine(pageLabel, 58, y, 10, "F2"),
          textLine(title, 110, y, 10),
          textLine(packageSections[index]?.category || "", 400, y, 9, "F2"),
        );
      });
    }

    page.lines?.forEach((line, index) => {
      ops.push(textLine(line, 58, 595 - index * 22, 10));
    });

    if (page.title === "Inventory Analysis") {
      if (options.reportDataContext) assertScheduleSource("Inventory Analysis", options.reportDataContext, options.normalizedData);
      ops.push(...inventoryAnalysisSchedule(page.lines?.length ? 516 : 606, options));
    } else if (page.title === "Fixed Asset Analysis") {
      if (options.reportDataContext) assertScheduleSource("Fixed Asset Analysis", options.reportDataContext, options.normalizedData);
      ops.push(...fixedAssetHorizontalSchedule(520, options.packageInput));
    } else if (page.title === "Payroll & FTE Analysis") {
      if (options.reportDataContext) assertScheduleSource("Payroll & FTE Analysis", options.reportDataContext, options.normalizedData);
      ops.push(textLine("Line Item", 58, page.lines?.length ? 516 : 606, 9, "F2"), rightAlignedTextLine("Amount", 508, page.lines?.length ? 516 : 606, 9, "F2"));
      ops.push(...tableRows(payrollFteTableRows(options), page.lines?.length ? 492 : 582));
    } else if (page.table) {
      if (page.statement) {
        if (options.reportDataContext) {
          assertScheduleSource(page.title, options.reportDataContext, page.statement === "balanceSheet" ? options.normalizedData?.normalizedBalanceSheet : options.normalizedData?.normalizedIncomeStatement);
        }
        ops.push(...financialStatementRows(page.statement, 606, options.packageInput, page.statementRowsOverride, options.incomeStatementDetailLevel));
      } else {
        ops.push(textLine("Line Item", 58, page.lines?.length ? 516 : 606, 9, "F2"), rightAlignedTextLine("Amount", 508, page.lines?.length ? 516 : 606, 9, "F2"));
        if (options.reportDataContext) assertScheduleSource(page.title, options.reportDataContext, options.normalizedData);
        ops.push(...tableRows(sourceSafeTableRows(page.table, options, page.title), page.lines?.length ? 492 : 582));
      }
    }
  }

  ops.push(
    "0.83 0.54 0.29 rg 48 56 160 2 re f",
    isCover || isDivider ? "1 1 1 rg" : "0.04 0.06 0.13 rg",
    textLine(`Prepared by ${options.preparedBy} | Confidential | Advisacor AI Package | Generated May 25, 2026 | Page ${pageNumber} of ${totalPages}`, 48, 42, 8),
  );

  return ops.join("\n");
}

/**
 * Phase TCP1 W2.5 — Review Assist findings page.
 * Renders a placeholder findings scaffold when reviewAssistMode is enabled.
 * Blocks 5–7 will replace the scaffold body with real severity output from
 * the findings composer and severity surface adapter.
 */
function buildReviewAssistFindingsPage(
  findings: ReviewAssistFindingsPayload | undefined,
  reportPeriod: string,
  preparedBy: string,
): PdfPage {
  const blockerCount = findings?.blockerCount ?? 0;
  const warningCount = findings?.warningCount ?? 0;
  const noteCount = findings?.noteCount ?? 0;
  const reviewerName = findings?.reviewerName ?? preparedBy;
  const reviewDate = findings?.reviewDate ?? reportPeriod;
  const findingsLines: string[] = [];
  if (findings?.findings?.length) {
    for (const f of findings.findings) {
      const badge = f.severity === "blocker" ? "[BLOCKER]" : f.severity === "warning" ? "[WARNING]" : "[NOTE]";
      findingsLines.push(`${badge} ${f.label}`);
      if (f.detail) findingsLines.push(`    ${f.detail}`);
    }
  } else {
    findingsLines.push("No findings recorded yet. Complete the review to populate this section.");
  }
  return {
    title: "Review Assist — Findings Report",
    category: "REVIEW ASSIST",
    subtitle:
      "Pre-close review of disclosures and severity. Findings are grouped by severity: BLOCKER (must fix), WARNING (should fix), NOTE (informational).",
    table: [
      ["Blockers", String(blockerCount)],
      ["Warnings", String(warningCount)],
      ["Notes", String(noteCount)],
      ["Reviewer", reviewerName],
      ["Review Date", reviewDate],
    ],
    lines: findingsLines,
    divider: true,
  };
}

function normalizeOptions(options: FinancialPackagePdfOptions = {}): NormalizedFinancialPackagePdfOptions {
  const normalizedData = options.normalizedData || options.reportDataContext?.normalizedData;
  const packageInput = buildFinancialPackageInputFromNormalizedData({
    normalizedData,
    reportDataContext: options.reportDataContext,
  });
  return {
    companyName: options.companyName || "QuickBooks Company",
    industryType: options.industryType || "Industry Intelligence",
    preparedBy: options.preparedBy || "Advisacor",
    reportPeriod: options.reportPeriod || "December 31, 2025",
    trial: Boolean(options.trial),
    fluxLevel: options.fluxLevel || "cfo",
    fluxType: options.fluxType || "month-over-month",
    fluxStatements: options.fluxStatements?.length ? options.fluxStatements : ["Balance Sheet", "Income Statement"],
    dollarThreshold: options.dollarThreshold || "$5,000",
    percentageThreshold: options.percentageThreshold || "10%",
    filteringLogic: options.filteringLogic || "both",
    aiCommentaryEnabled: options.aiCommentaryEnabled ?? true,
    incomeStatementDetailLevel: options.incomeStatementDetailLevel || "detailed",
    normalizedData,
    reportDataContext: options.reportDataContext,
    packageInput,
    reviewAssistMode: options.reviewAssistMode ?? false,
    reviewAssistFindings: options.reviewAssistFindings,
    commentaryOptions: options.commentaryOptions?.length
      ? options.commentaryOptions
      : [
          "Executive Commentary",
          "Business Impact Analysis",
          "Recommended Actions",
          "Driver Identification",
          "Payroll/FTE Commentary",
          "Working Capital Commentary",
          "Margin Commentary",
        ],
  };
}

function buildPdfBlobFromContents(contents: string[]) {
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  const firstPageObject = 5;
  const pageRefs = contents.map((_, index) => `${firstPageObject + index * 2} 0 R`);
  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${contents.length} >>`;

  contents.forEach((content, index) => {
    const pageObjectNumber = firstPageObject + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function resolveNormalizedPackageData(options: FinancialPackagePdfOptions) {
  return options.normalizedData || null;
}

function logPdfPackageInputDiagnostics(options: NormalizedFinancialPackagePdfOptions) {
  const input = options.packageInput;
  const mappedSummary = buildMappedFinancialSummary(input?.normalizedData?.normalizedBalanceSheet || [], input?.normalizedData?.normalizedIncomeStatement || []);
  const scheduleDiagnostics = buildScheduleDiagnostics(input?.normalizedData);
  console.info("PDF Package Input:", {
    sourceSystem: input?.sourceSystem,
    connectionId: input?.connectionId,
    tenantName: input?.tenantName,
    totalAssets: input?.totalAssets,
    totalLiabilities: input?.totalLiabilities,
    totalEquity: input?.totalEquity,
    revenue: input?.revenue,
    expenses: input?.expenses,
    netIncome: input?.netIncome,
    cashBalance: input?.cashBalance,
    balanceSheetRowsCount: input?.balanceSheetRowsCount,
    incomeStatementRowsCount: input?.incomeStatementRowsCount,
    mappedFinancialSummary: mappedSummary,
  });
  console.info("PDF Schedule Diagnostics:", {
    provider: scheduleDiagnostics.provider,
    companyId: scheduleDiagnostics.companyId,
    connectionId: scheduleDiagnostics.connectionId,
    selectedPeriod: scheduleDiagnostics.selectedPeriod,
    schedules: scheduleDiagnostics.schedules.map((schedule) => ({
      name: schedule.name,
      sourceReportName: schedule.sourceReportName,
      rawRows: Array.isArray(schedule.rawData) ? schedule.rawData.length : 0,
      normalizedRows: Array.isArray(schedule.normalizedData) ? schedule.normalizedData.length : Object.keys(schedule.normalizedData || {}).length,
      rowCount: schedule.rowCount,
      totalAmount: schedule.totalAmount,
      pdfPayload: schedule.pdfPayload,
    })),
    failures: scheduleDiagnostics.failures,
  });
  const inventory = inventoryAnalysis(input?.normalizedData, options.industryType);
  const fixedAssets = fixedAssetSchedule(input?.normalizedData);
  const payroll = payrollFteAnalysis(input?.normalizedData);
  console.info("PDF Inventory Analysis Diagnostics:", {
    provider: input?.normalizedData?.sourceSystem || null,
    selectedReportDate: input?.normalizedData?.reportPeriod?.endDate || options.reportPeriod,
    inventoryReportAttempted: input?.normalizedData?.sourceSystem === "xero" ? "Xero tracked inventory / balance sheet fallback" : "InventoryValuationSummary / InventoryValuationDetail",
    inventoryRowCount: inventory.items.length,
    inventoryValuationTotal: inventory.totalInventoryValue,
    balanceSheetInventoryAsset: inventory.balanceSheetInventoryValue,
    finalPdfInventoryTotal: inventory.totalInventoryValue,
  });
  console.info("PDF Fixed Asset Analysis Diagnostics:", {
    provider: input?.normalizedData?.sourceSystem || null,
    selectedPeriod: input?.normalizedData?.reportPeriod || null,
    balanceSheetFixedAssetTotal: fixedAssets.balanceSheetFixedAssetValue,
    fixedAssetAccountsFound: fixedAssets.categories.map((asset) => asset.name),
    accumulatedDepreciationAccountsFound: fixedAssets.rows.filter((row) => /accumulated depreciation|depreciation/i.test(`${row.label} ${row.section || ""}`)).map((row) => row.label),
    costRollForwardTotal: fixedAssets.originalCost,
    accumulatedDepreciationTotal: fixedAssets.accumulatedDepreciation,
    netBookValueTotal: fixedAssets.netBookValue,
    tieOutStatus: fixedAssets.tieOutStatus,
  });
  console.info("PDF Payroll & FTE Analysis Diagnostics:", {
    provider: input?.normalizedData?.sourceSystem || null,
    companyId: input?.normalizedData?.companyId || null,
    reportPeriod: input?.normalizedData?.reportPeriod || null,
    payrollSourceUsed: payroll.payrollSourceUsed,
    payrollAccountsFound: payroll.payrollAccountsFound.map((account) => account.name),
    payrollAccountBalances: payroll.payrollAccountsFound,
    revenueUsedForRevenuePerFte: payroll.revenueUsedForRevenuePerFte,
    currentFteSource: payroll.currentFteSource,
    priorFteSource: payroll.priorFteSource,
    finalPdfPayload: payrollFteTableRows(options),
  });
}

function assertInventoryAnalysisPopulation(options: NormalizedFinancialPackagePdfOptions) {
  const data = options.packageInput?.normalizedData;
  if (!data) return;
  const balanceSheetInventoryValue = Math.abs(balanceSheetScheduleAmounts(data).inventory);
  const inventory = inventoryAnalysis(data, options.industryType);
  if (balanceSheetInventoryValue > 0.005 && Math.abs(inventory.totalInventoryValue) <= 0.005) {
    throw new Error("Inventory Analysis mapping failed: Balance Sheet inventory exists but Inventory Analysis is zero.");
  }
}

function assertPayrollFteNoDemoValues(options: NormalizedFinancialPackagePdfOptions) {
  const rows = payrollFteTableRows(options);
  const valuesByLabel = new Map(rows.map(([label, value]) => [label, value]));
  const demoValuesDetected =
    valuesByLabel.get("Current FTE") === "31.0" ||
    valuesByLabel.get("Prior FTE") === "29.5" ||
    valuesByLabel.get("Payroll Cost") === "$78,000" ||
    valuesByLabel.get("Payroll Cost per FTE") === "$2,516" ||
    valuesByLabel.get("Revenue per FTE") === "$13,548" ||
    valuesByLabel.get("Payroll Growth") === "8.0%";
  if (demoValuesDetected) {
    throw new Error("Payroll & FTE Analysis blocked: demo values detected.");
  }
}

function fiscalYearStartForDiagnostic(endDate?: string) {
  const date = endDate ? new Date(`${endDate}T00:00:00Z`) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCFullYear()}-01-01`;
}

function assertIncomeStatementDetailNotCollapsed(options: NormalizedFinancialPackagePdfOptions) {
  const data = options.packageInput?.normalizedData;
  if (!data || data.sourceSystem !== "quickbooks") return;
  const mtdRows = data.normalizedIncomeStatement || [];
  const ytdRows = data.normalizedIncomeStatementYtd || [];
  const mergedRows = getFinancialStatementDisplayRows("incomeStatement", options.packageInput, options.incomeStatementDetailLevel);
  const reportEndDate = data.reportPeriod?.endDate || options.reportPeriod;
  const diagnostics = {
    provider: data.sourceSystem,
    reportDate: reportEndDate,
    mtdStartDate: data.reportPeriod?.startDate || null,
    mtdEndDate: data.reportPeriod?.endDate || null,
    ytdStartDate: fiscalYearStartForDiagnostic(data.reportPeriod?.endDate),
    ytdEndDate: data.reportPeriod?.endDate || null,
    rawMtdRowCount: mtdRows.length,
    rawYtdRowCount: ytdRows.length,
    normalizedMergedRowCount: mergedRows.length,
    first25MergedRows: mergedRows.slice(0, 25).map((row) => ({
      depth: row.level || 0,
      label: row.label,
      mtdAmount: row.value || null,
      ytdAmount: row.ytdValue || null,
    })),
  };
  console.info("PDF Income Statement Detail Diagnostics:", diagnostics);
  if (options.incomeStatementDetailLevel === "detailed" && mtdRows.length > 0 && mergedRows.length < mtdRows.length * 0.8) {
    throw new Error("Income Statement detail collapse detected.");
  }
}

function xeroBalanceSheetAmount(rows: Array<{ label: string; amount: number; source?: { raw?: unknown } }>, patterns: RegExp[], raw = false) {
  const row = rows.find((item) => patterns.some((pattern) => pattern.test(item.label)));
  if (!row) return 0;
  if (!raw) return Number(row.amount || 0);
  const rawRecord = row.source?.raw as Record<string, unknown> | undefined;
  return Number(rawRecord?.__advisacorXeroReportAmount ?? row.amount ?? 0);
}

function xeroPdfDisplayAmount(rows: FinancialStatementDisplayRow[], patterns: RegExp[]) {
  const matchingRows = rows.filter((item) => patterns.some((pattern) => pattern.test(item.label)) && item.value);
  const row = matchingRows.find((item) => Math.abs(parseCurrencyLabel(item.value)) > 0.005) || matchingRows[0];
  return parseCurrencyLabel(row?.value);
}

function xeroControlAccountAmount(rows: Array<{ label: string; section?: string; amount: number; source?: { raw?: unknown } }>, patterns: RegExp[], raw = false) {
  const matchingRows = rows.filter((item) => patterns.some((pattern) => pattern.test(`${item.label} ${item.section || ""}`)));
  const row = matchingRows.find((item) => Math.abs(Number(item.amount || 0)) > 0.005) || matchingRows[0];
  if (!row) return 0;
  if (!raw) return Number(row.amount || 0);
  const rawRecord = row.source?.raw as Record<string, unknown> | undefined;
  return Number(rawRecord?.__advisacorXeroReportAmount ?? row.amount ?? 0);
}

function sourceStatementTotal(rows: Array<{ label: string; amount: number }>, patterns: RegExp[]) {
  const row = rows.find((item) => patterns.some((pattern) => pattern.test(item.label)));
  return row ? Number(row.amount || 0) : null;
}

function pdfStatementTotal(rows: FinancialStatementDisplayRow[], patterns: RegExp[]) {
  const row = rows.find((item) => patterns.some((pattern) => pattern.test(item.label)) && item.value);
  return row?.value ? parseCurrencyLabel(row.value) : null;
}

function hasXeroDerivedControlFallbackRows(data?: AdvisacorNormalizedFinancialData) {
  return Boolean(
    data?.sourceSystem === "xero" &&
    data.normalizedBalanceSheet?.some(
      (row) => (row.source?.raw as Record<string, unknown> | undefined)?.__advisacorDerivedFrom === "xero_control_account_fallback",
    ),
  );
}

function assertPdfFinancialStatementTotals(options: NormalizedFinancialPackagePdfOptions) {
  const data = options.packageInput?.normalizedData;
  if (!data) return;
  const balanceSheetRows = data.normalizedBalanceSheet || [];
  const incomeStatementRows = data.normalizedIncomeStatement || [];
  const displayBalanceSheetRows = getFinancialStatementDisplayRows("balanceSheet", options.packageInput, options.incomeStatementDetailLevel);
  const displayIncomeStatementRows = getFinancialStatementDisplayRows("incomeStatement", options.packageInput, options.incomeStatementDetailLevel);
  const checks = [
    ...(hasXeroDerivedControlFallbackRows(data)
      ? []
      : [
          {
            label: "Source Report Total Assets to PDF Total Assets",
            source: sourceStatementTotal(balanceSheetRows, [/^total assets$/i]),
            pdf: pdfStatementTotal(displayBalanceSheetRows, [/^total assets$/i]),
          },
          {
            label: "Source Report Total Liabilities & Equity to PDF Total Liabilities & Equity",
            source: sourceStatementTotal(balanceSheetRows, [/total liabilities (and|&) equity/i]),
            pdf: pdfStatementTotal(displayBalanceSheetRows, [/total liabilities (and|&) equity/i]),
          },
        ]),
    {
      label: "Source Report Net Income to PDF Net Income",
      source: sourceStatementTotal(incomeStatementRows, [/net (income|profit)$/i]),
      pdf: pdfStatementTotal(displayIncomeStatementRows, [/net (income|profit)$/i]),
    },
  ];
  for (const check of checks) {
    if (check.source === null || check.pdf === null) continue;
    assertClose(check.label, check.source, check.pdf, data.sourceSystem === "xero" ? 0.01 : 1);
  }
}

function xeroBalanceSheetTotals(rows: Array<{ label: string; amount: number; source?: { raw?: unknown } }>, raw = false) {
  return {
    totalCurrentAssets: xeroBalanceSheetAmount(rows, [/total current assets/i], raw),
    totalFixedAssets: xeroBalanceSheetAmount(rows, [/total fixed assets/i, /net property and equipment/i], raw),
    totalAssets: xeroBalanceSheetAmount(rows, [/^total assets$/i], raw),
    totalCurrentLiabilities: xeroBalanceSheetAmount(rows, [/total current liabilities/i], raw),
    totalLiabilities: xeroBalanceSheetAmount(rows, [/^total liabilities$/i], raw),
    totalEquity: xeroBalanceSheetAmount(rows, [/^total equity$/i], raw),
    totalLiabilitiesAndEquity: xeroBalanceSheetAmount(rows, [/total liabilities (and|&) equity/i], raw),
  };
}

function assertClose(label: string, expected: number, actual: number, tolerance = 0.01) {
  if (Math.abs(expected - actual) > tolerance) {
    throw new Error(`${label} mismatch. Expected ${expected.toFixed(2)} but received ${actual.toFixed(2)}.`);
  }
}

function assertXeroPdfBalanceSheetTotals(options: NormalizedFinancialPackagePdfOptions) {
  if (options.packageInput?.sourceSystem !== "xero") return;
  const balanceSheet = options.normalizedData?.normalizedBalanceSheet || [];
  if (!balanceSheet.length) return;
  const displayRows = getFinancialStatementDisplayRows("balanceSheet", options.packageInput, options.incomeStatementDetailLevel);
  const selectedReportDate = options.normalizedData?.reportPeriod?.endDate || options.reportDataContext?.reportPeriod || options.reportPeriod;
  const rawTotals = xeroBalanceSheetTotals(balanceSheet, true);
  const normalizedTotals = xeroBalanceSheetTotals(balanceSheet);
  const finalPdfTotals = {
    totalCurrentAssets: xeroPdfDisplayAmount(displayRows, [/total current assets/i]),
    totalFixedAssets: xeroPdfDisplayAmount(displayRows, [/total fixed assets/i, /net property and equipment/i]),
    totalAssets: xeroPdfDisplayAmount(displayRows, [/^total assets$/i]),
    totalLiabilities: xeroPdfDisplayAmount(displayRows, [/^total liabilities$/i]),
    totalEquity: xeroPdfDisplayAmount(displayRows, [/^total equity$/i]),
    totalLiabilitiesAndEquity: xeroPdfDisplayAmount(displayRows, [/total liabilities (and|&) equity/i]),
  };
  const hasXeroDerivedControlFallback = balanceSheet.some(
    (row) => (row.source?.raw as Record<string, unknown> | undefined)?.__advisacorDerivedFrom === "xero_control_account_fallback",
  );
  const arPatterns = [/^accounts receivable$/i, /accounts receivable/i, /\breceivables\b/i];
  const apPatterns = [/^accounts payable$/i, /accounts payable/i, /\bpayables\b/i];
  const rawAr = xeroControlAccountAmount(balanceSheet, arPatterns, true);
  const normalizedAr = xeroControlAccountAmount(balanceSheet, arPatterns);
  const finalPdfAr = xeroPdfDisplayAmount(displayRows, arPatterns);
  const rawAp = xeroControlAccountAmount(balanceSheet, apPatterns, true);
  const normalizedAp = xeroControlAccountAmount(balanceSheet, apPatterns);
  const finalPdfAp = xeroPdfDisplayAmount(displayRows, apPatterns);
  console.info("Xero PDF Balance Sheet totals:", {
    selectedReportDate,
    rawXeroBalanceSheetTotals: rawTotals,
    normalizedXeroBalanceSheetTotals: normalizedTotals,
    finalPdfMappedTotals: finalPdfTotals,
    hasXeroDerivedControlFallback,
  });
  console.info("Xero PDF AR/AP mapping:", {
    rawXeroArRowFound: rawAr !== 0,
    rawXeroArValue: rawAr,
    normalizedArValue: normalizedAr,
    finalPdfArValue: finalPdfAr,
    rawXeroApRowFound: rawAp !== 0,
    rawXeroApValue: rawAp,
    normalizedApValue: normalizedAp,
    finalPdfApValue: finalPdfAp,
  });
  if (rawAr > 0 && (Math.abs(normalizedAr) <= 0.005 || Math.abs(finalPdfAr) <= 0.005)) {
    throw new Error("Xero AR mapping failed: raw AR exists but PDF AR is zero.");
  }
  if (rawAp > 0 && (Math.abs(normalizedAp) <= 0.005 || Math.abs(finalPdfAp) <= 0.005)) {
    throw new Error("Xero AP mapping failed: raw AP exists but PDF AP is zero.");
  }
  assertClose("Xero raw Total Assets to normalized Total Assets", rawTotals.totalAssets, normalizedTotals.totalAssets);
  if (!hasXeroDerivedControlFallback) {
    assertClose("Xero normalized Total Assets to final PDF Total Assets", normalizedTotals.totalAssets, finalPdfTotals.totalAssets, 1);
  }
  assertClose("Xero Total Assets to Total Liabilities and Equity", normalizedTotals.totalAssets, normalizedTotals.totalLiabilitiesAndEquity);
}

function validateFixedAssetBalanceSheetTieOut() {
  const variances = {
    grossFixedAssets: fixedAssetTieOut.endingGrossAssets - balanceSheetTieOut.grossFixedAssets,
    accumulatedDepreciation: fixedAssetTieOut.endingAccumulatedDepreciation - balanceSheetTieOut.accumulatedDepreciation,
    netPropertyAndEquipment: fixedAssetTieOut.endingNetBookValue - balanceSheetTieOut.netPropertyAndEquipment,
  };
  const hasVariance = Object.values(variances).some((variance) => Math.abs(variance) > 0.01);

  if (hasVariance) {
    // Internal generation safeguard only. Do not surface this to customers in the PDF UI.
    console.warn("Fixed asset schedule does not tie to balance sheet.", variances);
  }

  return {
    ok: !hasVariance,
    variances,
  };
}

export function buildFinancialPackagePdfBlob(options: FinancialPackagePdfOptions = {}) {
  void resolveNormalizedPackageData(options);
  validateFixedAssetBalanceSheetTieOut();
  const normalizedOptions = normalizeOptions(options);
  logPdfPackageInputDiagnostics(normalizedOptions);
  assertInventoryAnalysisPopulation(normalizedOptions);
  assertPayrollFteNoDemoValues(normalizedOptions);
  assertIncomeStatementDetailNotCollapsed(normalizedOptions);
  assertPdfFinancialStatementTotals(normalizedOptions);
  assertXeroPdfBalanceSheetTotals(normalizedOptions);
  if (normalizedOptions.reportDataContext) {
    assertReportPreflight(normalizedOptions.reportDataContext, {
      requiresLiveData: true,
      schedules: [
        {
          name: "Financial package",
          sourceSystem: normalizedOptions.reportDataContext.sourceSystem,
          connectionId: normalizedOptions.reportDataContext.connectionId,
          syncId: normalizedOptions.reportDataContext.syncId,
          reportPeriod: normalizedOptions.reportDataContext.reportPeriod,
        },
      ],
    });
  }
  const pages: PdfPage[] = [
    { title: "Cover Page", category: "CONFIDENTIAL" },
    ...(normalizedOptions.reviewAssistMode
      ? [
          buildReviewAssistFindingsPage(
            normalizedOptions.reviewAssistFindings,
            normalizedOptions.reportPeriod,
            normalizedOptions.preparedBy,
          ),
        ]
      : []),
    ...packageSections,
  ];
  const expandedPages = pages.flatMap((page) => {
    if (!page.statement) return [page];
    const rows = getFinancialStatementDisplayRows(page.statement, normalizedOptions.packageInput, normalizedOptions.incomeStatementDetailLevel);
    return splitStatementRowsForPagination(rows).map((rowChunk) => ({
      ...page,
      statementRowsOverride: rowChunk,
    }));
  });
  const tocRows = expandedPages.slice(1).map((page, index) => [`${index + 2}`, page.title] as [string, string]);
  const contents = expandedPages.map((page, index) => buildPageContent(page, normalizedOptions, index + 1, expandedPages.length, tocRows));
  return buildPdfBlobFromContents(contents);
}

export function downloadFinancialPackagePdf(options: FinancialPackagePdfOptions = {}) {
  const blob = buildFinancialPackagePdfBlob(options);
  const url = URL.createObjectURL(blob);
  const safeCompanyName = (options.companyName || "advisacor")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeCompanyName || "advisacor"}-financial-package-for-client-review-with-ai.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

const fluxRows: Array<{
  account: string;
  statement: string;
  current: string;
  prior: string;
  change: string;
  percent: string;
  severity: string;
  driver: string;
  businessImplication: string;
  implication: string;
  action: string;
  executiveFocus: string;
  payrollFte?: {
    currentFte: string;
    priorFte: string;
    fteChange: string;
    payrollChange: string;
    payrollPerFte: string;
    priorPayrollPerFte: string;
    revenuePerFte: string;
    departmentChanges: string;
  };
}> = [
  {
    account: "Payroll Wages - Field Operations",
    statement: "Income Statement",
    current: "$24,220",
    prior: "$19,440",
    change: "$4,780",
    percent: "24.6%",
    severity: "High",
    driver: "Staffing, overtime, utilization, or mix shift",
    businessImplication: "Payroll growth exceeded revenue growth and may pressure gross margin if utilization does not improve.",
    implication: "Labor movement should be evaluated against staffing levels, utilization, gross margin, and revenue per FTE.",
    action: "Compare payroll growth to FTE movement and revenue capacity before concluding the variance is structural.",
    executiveFocus: "Review staffing productivity and utilization before approving additional hiring.",
    payrollFte: {
      currentFte: "57",
      priorFte: "52",
      fteChange: "5",
      payrollChange: "$45,000",
      payrollPerFte: "$4,250",
      priorPayrollPerFte: "$4,010",
      revenuePerFte: "$14,456",
      departmentChanges: "Field Operations payroll increased $5,689; overtime and dispatch coverage were the primary drivers.",
    },
  },
  {
    account: "Accounts Receivable",
    statement: "Balance Sheet",
    current: "$146,000",
    prior: "$126,500",
    change: "$19,500",
    percent: "15.4%",
    severity: "Medium",
    driver: "Billing growth, collection timing, or aging mix",
    businessImplication: "Receivable growth can absorb cash even when the income statement shows improving revenue.",
    implication: "Receivable growth can create working capital pressure even when revenue is improving.",
    action: "Review balances over 30 days and confirm collection owners for the largest customer exposures.",
    executiveFocus: "Focus on customer concentration and aging movement before increasing credit exposure.",
  },
  {
    account: "Materials and Supplies",
    statement: "Income Statement",
    current: "$68,400",
    prior: "$59,100",
    change: "$9,300",
    percent: "15.7%",
    severity: "Medium",
    driver: "Volume, pricing, waste, or supplier cost movement",
    businessImplication: "Input cost increases may reduce gross margin if pricing or usage controls do not adjust.",
    implication: "Input cost increases can compress gross margin if pricing is not adjusted.",
    action: "Compare material growth to revenue and gross margin before approving vendor or pricing decisions.",
    executiveFocus: "Confirm whether the variance is volume-driven or price-driven before changing pricing.",
  },
  {
    account: "Professional Fees",
    statement: "Income Statement",
    current: "$14,800",
    prior: "$8,900",
    change: "$5,900",
    percent: "66.3%",
    severity: "Watch",
    driver: "One-time advisory, legal, accounting, or project activity",
    businessImplication: "Non-recurring spend may distort run-rate operating expense if not isolated.",
    implication: "Non-recurring services can distort operating expense trends if not separated from normal run-rate.",
    action: "Classify one-time fees separately and update the forecast run-rate if the spend will continue.",
    executiveFocus: "Determine whether this should remain in recurring operating expense or be treated as a one-time item.",
  },
];

function buildFluxPageContent(title: string, options: NormalizedFinancialPackagePdfOptions, rows: typeof fluxRows, pageNumber: number, totalPages: number) {
  const ops = [
    "0.04 0.06 0.13 rg 0 0 612 792 re f",
    "1 1 1 rg 32 32 548 728 re f",
    "0.83 0.54 0.29 rg 48 735 240 3 re f",
    "0.04 0.06 0.13 rg",
    textLine("ADVANCED VARIANCE", 48, 710, 10, "F2"),
    textLine(title, 48, 675, 26, "F2"),
    textLine(`${options.companyName} | ${options.reportPeriod}`, 48, 648, 11),
    textLine(`Statements: ${options.fluxStatements.join(", ")}`, 48, 630, 8),
    textLine(`Thresholds: ${options.dollarThreshold} / ${options.percentageThreshold} | Filter: ${options.filteringLogic}`, 48, 616, 8),
  ];

  rows.forEach((row, index) => {
    const y = 575 - index * 132;
    ops.push(
      "0.93 0.95 0.98 rg 48 " + (y - 104) + " 516 120 re f",
      "0.04 0.06 0.13 rg",
      textLine(row.account, 58, y, 12, "F2"),
      textLine(`Current Amount: ${row.current} | Prior Amount: ${row.prior} | Dollar Change: ${row.change} | Percentage Change: ${row.percent}`, 58, y - 18, 8),
      textLine(`Severity: ${row.severity} | Likely Driver: ${row.driver}`, 58, y - 33, 8),
      textLine(`Business Implication: ${row.businessImplication}`, 58, y - 48, 8),
      textLine(`Why It Matters: ${row.implication}`, 58, y - 63, 8),
      textLine(`Recommended Action: ${row.action}`, 58, y - 78, 8, "F2"),
      textLine(`Executive Focus: ${row.executiveFocus}`, 58, y - 93, 8, "F2"),
    );

    if (row.payrollFte && options.commentaryOptions.includes("Payroll/FTE Commentary")) {
      ops.push(
        textLine(
          `FTE: Current ${row.payrollFte.currentFte} | Prior ${row.payrollFte.priorFte} | Change ${row.payrollFte.fteChange} | Payroll/FTE ${row.payrollFte.payrollPerFte} | Revenue/FTE ${row.payrollFte.revenuePerFte}`,
          58,
          y - 108,
          7,
        ),
      );
    }
  });

  ops.push(
    "0.83 0.54 0.29 rg 48 56 160 2 re f",
    "0.04 0.06 0.13 rg",
    textLine(`Prepared by ${options.preparedBy} | Confidential | Advisacor Flux Analysis | Page ${pageNumber} of ${totalPages}`, 48, 42, 8),
  );

  return ops.join("\n");
}

export function buildFluxAnalysisPdfBlob(options: FinancialPackagePdfOptions = {}) {
  void resolveNormalizedPackageData(options);
  const normalizedOptions = normalizeOptions(options);
  if (normalizedOptions.reportDataContext) {
    assertReportPreflight(normalizedOptions.reportDataContext, {
      requiresLiveData: true,
      schedules: [
        {
          name: "Flux analysis",
          sourceSystem: normalizedOptions.reportDataContext.sourceSystem,
          connectionId: normalizedOptions.reportDataContext.connectionId,
          syncId: normalizedOptions.reportDataContext.syncId,
          reportPeriod: normalizedOptions.reportDataContext.reportPeriod,
        },
      ],
    });
  }
  const fluxTypeLabel =
    normalizedOptions.fluxType === "quarter-over-quarter"
      ? "Quarter-over-Quarter"
      : normalizedOptions.fluxType === "year-over-year"
        ? "Year-over-Year"
        : normalizedOptions.fluxType === "custom-period"
          ? "Custom Period Comparison"
          : "Month-over-Month";
  const selectedRows = fluxRows.filter((row) =>
    normalizedOptions.fluxStatements.some((statement) => {
      if (statement === row.statement) return true;
      if (statement === "Payroll Analysis") return row.account.toLowerCase().includes("payroll");
      if (statement === "AR Aging") return row.account.toLowerCase().includes("receivable");
      if (statement === "AP Aging") return row.account.toLowerCase().includes("payable");
      return false;
    }),
  );
  const titles = normalizedOptions.fluxStatements.map((statement) => `Flux Analysis - ${fluxTypeLabel} ${statement}`);
  const pages = titles.map((title, index) =>
    buildFluxPageContent(title, normalizedOptions, index === 0 ? selectedRows : selectedRows.slice(0, 3), index + 1, titles.length),
  );
  return buildPdfBlobFromContents(pages);
}

export function downloadFluxAnalysisPdf(options: FinancialPackagePdfOptions = {}) {
  const blob = buildFluxAnalysisPdfBlob(options);
  const url = URL.createObjectURL(blob);
  const safeCompanyName = (options.companyName || "advisacor")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeCompanyName || "advisacor"}-flux-analysis.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}
