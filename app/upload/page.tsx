"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ParsedFile = {
  name: string;
  rows: unknown[][];
};

type MatchedLine = {
  metric: string;
  label: string;
  value: number;
};

type KPIs = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netIncome: number;
  cash: number;
  accountsReceivable: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  matches: MatchedLine[];
};

type StatementRow = {
  label: string;
  amount: number | null;
};

type PackageTier = "essential" | "professional" | "virtualCfo";
type UploadTier = PackageTier;
type ThresholdLogic = "both" | "either";
type FluxSeverity = "High" | "Moderate" | "Low";
type UploadAccess =
  | { status: "checking"; token: string; plan: PackageTier | null; reason: string | null }
  | { status: "allowed"; token: string; plan: PackageTier | null; reason: "trial" | "subscriber" }
  | { status: "blocked"; token: string; plan: PackageTier | null; reason: string };

type UploadReport = {
  id: string;
  tier: UploadTier;
  label: string;
  description: string;
  required: boolean;
  omitted: boolean;
  data: ParsedFile | null;
  onFile: (file: File) => void | Promise<void>;
  onRemove: () => void;
  onOmitChange: (omitted: boolean) => void;
};
type QuickBooksReportHelp = {
  title: string;
  qbo: string;
  desktop: string;
  export: string;
  note?: string;
};

type APKpis = {
  total: number;
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;
};

type AgingKpis = APKpis;

type InventoryItem = {
  name: string;
  quantity: number;
  value: number;
};

type InventoryKpis = {
  totalValue: number;
  totalQuantity: number;
  topByValue: InventoryItem[];
  topByQuantity: InventoryItem[];
};

type FixedAssetMatch = {
  metric: string;
  label: string;
  value: number | null;
};

type FixedAssetKpis = {
  totalFixedAssets: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  depreciationExpense: number | null;
  fixedAssetsToTotalAssets: number;
  depreciationToFixedAssets: number;
  netBookValueToTotalAssets: number;
  matches: FixedAssetMatch[];
};

type FixedAssetChangeRow = {
  metric: string;
  current: number;
  prior: number;
  change: number;
  interpretation: string;
};

type PayrollDepartmentRow = {
  department: string;
  currentHours: number;
  currentFte: number;
  priorHours: number;
  priorFte: number;
  fteChange: number;
  currentGrossWages: number;
  priorGrossWages: number;
  wageChange: number;
  currentPayrollTaxes: number;
  priorPayrollTaxes: number;
  payrollTaxChange: number;
  currentPayrollCost: number;
  priorPayrollCost: number;
  payrollCostChange: number;
  payrollCostPerFte: number;
};

type PayrollAnalysis = {
  rows: PayrollDepartmentRow[];
  totalCurrentFte: number;
  totalPriorFte: number;
  totalFteChange: number;
  totalCurrentPayrollCost: number;
  totalPriorPayrollCost: number;
  totalPayrollCostChange: number;
  highestFteIncreaseDepartment: string;
  highestPayrollCostIncreaseDepartment: string;
  commentary: string[];
};

type BudgetMetrics = {
  revenueActual: number | null;
  revenueBudget: number | null;
  revenueVariance: number | null;
  netIncomeActual: number | null;
  netIncomeBudget: number | null;
  netIncomeVariance: number | null;
  largestUnfavorableVarianceLabel: string;
  largestUnfavorableVariance: number | null;
};

type DebtMetrics = {
  totalDebt: number;
  currentPortion: number;
  longTermPortion: number;
  debtToAssets: number | null;
  debtToEquity: number | null;
};

type ExecutiveSummarySectionItem = {
  title: string;
  body: string;
};

type BoardPackageSection = {
  page: number;
  title: string;
  status: "Included" | "Missing" | "Omitted" | "Locked";
  note: string;
};

type FolderImportResult = {
  matchedFiles: Array<{ reportLabel: string; fileName: string }>;
  unmatchedFiles: string[];
  duplicateMatches: Array<{ reportLabel: string; fileNames: string[] }>;
  missingRequiredReports: string[];
};

type PackageRequirement = {
  id: string;
  label: string;
  reportIds: string[];
};

type PackageRequirementStatus = PackageRequirement & {
  resolved: boolean;
  uploaded: boolean;
  omitted: boolean;
};

type PackageSectionId =
  | "executive-summary"
  | "kpi-snapshot"
  | "income-statement"
  | "balance-sheet"
  | "ar-aging"
  | "ap-aging"
  | "customer-sales"
  | "vendor-expenses"
  | "inventory-summary"
  | "fixed-asset-analysis"
  | "payroll-fte"
  | "ratio-analysis"
  | "budget-vs-actual"
  | "debt-schedule"
  | "flux-summary"
  | "month-flux"
  | "quarter-flux"
  | "year-flux"
  | "recommended-follow-up";

type RatioId =
  | "Net Margin"
  | "Gross Margin"
  | "Expense Ratio"
  | "Current Ratio"
  | "Quick Ratio"
  | "Cash to Assets"
  | "Accounts Receivable to Assets"
  | "AP to Revenue"
  | "Inventory to Total Assets"
  | "Working Capital Estimate"
  | "DSO"
  | "Payroll Cost as % of Revenue"
  | "Gross Wages as % of Revenue"
  | "Payroll Taxes as % of Gross Wages"
  | "Payroll Cost per FTE"
  | "Revenue per FTE"
  | "Gross Profit per FTE"
  | "Operating Margin"
  | "EBITDA Margin"
  | "Inventory Turnover"
  | "AR Turnover"
  | "AP Turnover"
  | "Cash Conversion Cycle"
  | "Debt to Equity"
  | "Debt to Assets";

type FluxAnalysisId = "month" | "quarter" | "year";
type FluxAccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "cogs"
  | "expense"
  | "other-income"
  | "other-expense"
  | "unknown";
type FluxBasis = "Ending Balance" | "Period Activity";
type ChartSelectionId =
  | "revenue-trend"
  | "gross-margin-trend"
  | "ebitda-trend"
  | "cash-trend"
  | "ar-aging-mix"
  | "ap-aging-mix"
  | "payroll-trend"
  | "revenue-per-fte"
  | "expense-breakdown"
  | "budget-vs-actual"
  | "net-income-trend"
  | "working-capital-trend";

type ClientPackageSettings = {
  packageTier: PackageTier;
  pdfSections: PackageSectionId[];
  powerpointSections: PackageSectionId[];
  selectedRatios: RatioId[];
  selectedCharts?: ChartSelectionId[];
  selectedFluxAnalyses: FluxAnalysisId[];
  fluxSettings: FluxSettings;
  includeHighSeverityOnly?: boolean;
  includeModerateSeverity?: boolean;
  maxFluxRows?: number;
  useSamePowerPointSelections: boolean;
  clientIndustry?: string;
  companyTagline?: string;
  preparedFor?: string;
  firmLogoPath?: string;
  firmLogoDataUrl?: string;
  firmLogoFileName?: string;
  confidentialWatermark?: boolean;
};

type PowerPointSectionType = PackageSectionId | "title";

type PowerPointSlideData = {
  title: string;
  subtitle: string;
  bullets: string[];
  chartData: Array<Record<string, string | number>>;
  sectionType: PowerPointSectionType;
};

type FluxAccount = {
  accountNumber: string;
  accountName: string;
  amount: number;
  accountType: FluxAccountType;
  basis: FluxBasis;
  periodActivity: number;
  endingBalance: number | null;
  hasBalanceColumn: boolean;
  warnings: string[];
};

type GlActivityRow = {
  date: string;
  accountNumber: string;
  accountName: string;
  className: string;
  name: string;
  customer: string;
  vendor: string;
  payee: string;
  memo: string;
  description: string;
  debit: number;
  credit: number;
  amount: number;
  balance: number;
};

type FluxDriver = {
  name: string;
  current: number;
  prior: number;
  change: number;
};

type FluxRow = {
  accountNumber: string;
  accountName: string;
  accountType: FluxAccountType;
  basis: FluxBasis;
  currentAmount: number;
  priorAmount: number;
  dollarVariance: number;
  percentVariance: number | null;
  direction: string;
  severity: FluxSeverity;
  flagReason: string;
  topDriver: string;
  driverChange: number | null;
  commentary: string;
  topDrivers: FluxDriver[];
  warnings: string[];
};

type FluxDebugInfo = {
  currentRowsParsed: number;
  priorRowsParsed: number;
  accountsGrouped: number;
  variancesCalculated: number;
  variancesPassingThreshold: number;
};

type FluxSettings = {
  dollarThreshold: number;
  percentThreshold: number;
  logic: ThresholdLogic;
  includeZeroActivity: boolean;
};

const PACKAGE_LABELS: Record<PackageTier, string> = {
  essential: "Essential",
  professional: "Professional",
  virtualCfo: "Virtual CFO",
};
const STRIPE_PRICE_TO_PACKAGE_TIER: Record<string, PackageTier> = {
  price_1Tanv2CYGplhrQTJhQ1riXCe: "essential",
  price_1TanxOCYGplhrQTJSv3ynV3Y: "professional",
  price_1TanyYCYGplhrQTJG82yVpJC: "virtualCfo",
};
const entitlementRatios: Record<PackageTier, RatioId[]> = {
  essential: ["Net Margin", "Gross Margin", "Operating Margin", "Expense Ratio", "Current Ratio", "Quick Ratio"],
  professional: getDefaultRatiosForPackage("professional"),
  virtualCfo: getDefaultRatiosForPackage("virtualCfo"),
};
const entitlementFluxAnalyses: Record<PackageTier, FluxAnalysisId[]> = {
  essential: ["month"],
  professional: ["month", "quarter", "year"],
  virtualCfo: ["month", "quarter", "year"],
};
const PREVIEW_COLUMN_LIMIT = 10;
const essentialPackageRequirements: PackageRequirement[] = [
  { id: "pl", label: "Profit and Loss", reportIds: ["pl"] },
  { id: "bs", label: "Balance Sheet", reportIds: ["bs"] },
  { id: "prior-pl-or-gl", label: "Prior Month P&L or GL", reportIds: ["prior-pl", "prior-month-gl"] },
  { id: "prior-bs-or-gl", label: "Prior Month Balance Sheet or GL", reportIds: ["prior-bs", "prior-month-gl"] },
];
const professionalPackageRequirements: PackageRequirement[] = [
  ...essentialPackageRequirements,
  { id: "ar", label: "AR Aging", reportIds: ["ar"] },
  { id: "ap", label: "AP Aging", reportIds: ["ap"] },
  { id: "inventory", label: "Inventory Valuation", reportIds: ["inventory"] },
  { id: "customers", label: "Sales by Customer", reportIds: ["customers"] },
  { id: "vendors", label: "Expenses by Vendor", reportIds: ["vendors"] },
  { id: "payroll-summary", label: "Payroll Summary / Payroll by Department", reportIds: ["current-payroll", "prior-payroll"] },
  { id: "current-month-gl", label: "Current Month GL", reportIds: ["current-month-gl"] },
  { id: "prior-month-gl", label: "Prior Month GL", reportIds: ["prior-month-gl"] },
  { id: "current-quarter-gl", label: "Current Quarter GL", reportIds: ["current-quarter-gl"] },
  { id: "prior-quarter-gl", label: "Prior Quarter GL", reportIds: ["prior-quarter-gl"] },
  { id: "current-year-gl", label: "Current Year GL", reportIds: ["current-year-gl"] },
  { id: "prior-year-gl", label: "Prior Year GL", reportIds: ["prior-year-gl"] },
];
const packageRequirements: Record<PackageTier, PackageRequirement[]> = {
  essential: [
    ...essentialPackageRequirements,
    { id: "current-month-gl", label: "Current Month GL", reportIds: ["current-month-gl"] },
    { id: "prior-month-gl", label: "Prior Month GL", reportIds: ["prior-month-gl"] },
  ],
  professional: professionalPackageRequirements,
  virtualCfo: [
    ...professionalPackageRequirements,
    { id: "budget", label: "Budget vs Actual", reportIds: ["budget"] },
    { id: "fixed-assets", label: "Fixed Assets", reportIds: ["fixed-assets"] },
    { id: "prior-fixed-assets", label: "Prior Period Fixed Assets", reportIds: ["prior-fixed-assets"] },
    { id: "debt", label: "Debt Schedule", reportIds: ["debt"] },
    { id: "cash-flow", label: "Statement of Cash Flows", reportIds: ["cash-flow"] },
  ],
};
const packageSectionOptions: Array<{
  id: PackageSectionId;
  label: string;
  minimumTier: PackageTier;
  requiredReportIds?: string[];
}> = [
  { id: "executive-summary", label: "Executive Summary", minimumTier: "essential" },
  { id: "kpi-snapshot", label: "KPI Snapshot", minimumTier: "essential" },
  { id: "income-statement", label: "Income Statement", minimumTier: "essential", requiredReportIds: ["pl"] },
  { id: "balance-sheet", label: "Balance Sheet", minimumTier: "essential", requiredReportIds: ["bs"] },
  { id: "ar-aging", label: "AR Aging", minimumTier: "essential", requiredReportIds: ["ar"] },
  { id: "ap-aging", label: "AP Aging", minimumTier: "essential", requiredReportIds: ["ap"] },
  { id: "customer-sales", label: "Customer Sales Analysis", minimumTier: "professional", requiredReportIds: ["customers"] },
  { id: "vendor-expenses", label: "Vendor Expense Analysis", minimumTier: "professional", requiredReportIds: ["vendors"] },
  { id: "inventory-summary", label: "Inventory Summary", minimumTier: "professional", requiredReportIds: ["inventory"] },
  { id: "fixed-asset-analysis", label: "Fixed Asset Analysis", minimumTier: "virtualCfo", requiredReportIds: ["fixed-assets"] },
  { id: "payroll-fte", label: "Payroll and FTE Analysis", minimumTier: "professional", requiredReportIds: ["current-payroll", "prior-payroll"] },
  { id: "ratio-analysis", label: "Ratio Analysis", minimumTier: "essential" },
  { id: "budget-vs-actual", label: "Budget vs Actual", minimumTier: "virtualCfo", requiredReportIds: ["budget"] },
  { id: "debt-schedule", label: "Debt Schedule", minimumTier: "virtualCfo", requiredReportIds: ["debt"] },
  { id: "flux-summary", label: "Flux Analysis Executive Summary", minimumTier: "essential", requiredReportIds: ["current-month-gl", "prior-month-gl"] },
  { id: "month-flux", label: "Month-over-Month Flux", minimumTier: "essential", requiredReportIds: ["current-month-gl", "prior-month-gl"] },
  { id: "quarter-flux", label: "Quarter-over-Quarter Flux", minimumTier: "professional", requiredReportIds: ["current-quarter-gl", "prior-quarter-gl"] },
  { id: "year-flux", label: "Year-over-Year Flux", minimumTier: "professional", requiredReportIds: ["current-year-gl", "prior-year-gl"] },
  { id: "recommended-follow-up", label: "Recommended Follow-Up Items", minimumTier: "virtualCfo" },
];
const ratioOptions: RatioId[] = [
  "Net Margin",
  "Gross Margin",
  "Operating Margin",
  "EBITDA Margin",
  "Expense Ratio",
  "Current Ratio",
  "Quick Ratio",
  "Cash to Assets",
  "Accounts Receivable to Assets",
  "AP to Revenue",
  "Inventory to Total Assets",
  "Working Capital Estimate",
  "DSO",
  "Payroll Cost as % of Revenue",
  "Gross Wages as % of Revenue",
  "Payroll Taxes as % of Gross Wages",
  "Payroll Cost per FTE",
  "Revenue per FTE",
  "Gross Profit per FTE",
  "Inventory Turnover",
  "AR Turnover",
  "AP Turnover",
  "Cash Conversion Cycle",
  "Debt to Equity",
  "Debt to Assets",
];
const chartOptions: Array<{ id: ChartSelectionId; label: string; minimumTier: PackageTier }> = [
  { id: "revenue-trend", label: "Revenue Trend", minimumTier: "essential" },
  { id: "gross-margin-trend", label: "Gross Margin Trend", minimumTier: "essential" },
  { id: "ebitda-trend", label: "EBITDA Trend", minimumTier: "professional" },
  { id: "cash-trend", label: "Cash Trend", minimumTier: "essential" },
  { id: "ar-aging-mix", label: "AR Aging Mix", minimumTier: "professional" },
  { id: "ap-aging-mix", label: "AP Aging Mix", minimumTier: "professional" },
  { id: "payroll-trend", label: "Payroll Trend", minimumTier: "professional" },
  { id: "revenue-per-fte", label: "Revenue per FTE", minimumTier: "professional" },
  { id: "expense-breakdown", label: "Expense Breakdown", minimumTier: "essential" },
  { id: "budget-vs-actual", label: "Budget vs Actual", minimumTier: "virtualCfo" },
  { id: "net-income-trend", label: "Net Income Trend", minimumTier: "essential" },
  { id: "working-capital-trend", label: "Working Capital Trend", minimumTier: "professional" },
];
const packageDefaultCharts: Record<PackageTier, ChartSelectionId[]> = {
  essential: ["revenue-trend", "gross-margin-trend", "cash-trend", "expense-breakdown", "net-income-trend"],
  professional: [
    "revenue-trend",
    "gross-margin-trend",
    "ebitda-trend",
    "cash-trend",
    "ar-aging-mix",
    "ap-aging-mix",
    "expense-breakdown",
    "budget-vs-actual",
    "net-income-trend",
    "working-capital-trend",
  ],
  virtualCfo: chartOptions.map((option) => option.id),
};
const packageDefaultSections: Record<PackageTier, PackageSectionId[]> = {
  essential: [
    "executive-summary",
    "kpi-snapshot",
    "income-statement",
    "balance-sheet",
    "ratio-analysis",
    "month-flux",
  ],
  professional: [
    "executive-summary",
    "kpi-snapshot",
    "income-statement",
    "balance-sheet",
    "ar-aging",
    "ap-aging",
    "ratio-analysis",
    "customer-sales",
    "vendor-expenses",
    "inventory-summary",
    "payroll-fte",
    "flux-summary",
    "month-flux",
    "quarter-flux",
    "year-flux",
  ],
  virtualCfo: [
    "executive-summary",
    "kpi-snapshot",
    "income-statement",
    "balance-sheet",
    "ar-aging",
    "ap-aging",
    "ratio-analysis",
    "customer-sales",
    "vendor-expenses",
    "inventory-summary",
    "budget-vs-actual",
    "fixed-asset-analysis",
    "payroll-fte",
    "debt-schedule",
    "flux-summary",
    "month-flux",
    "quarter-flux",
    "year-flux",
    "recommended-follow-up",
  ],
};
const QUICKBOOKS_REPORT_HELP: Record<string, QuickBooksReportHelp> = {
  pl: {
    title: "Profit & Loss",
    qbo: "Reports -> Standard -> Business Overview -> Profit and Loss",
    desktop: "Reports -> Company & Financial -> Profit & Loss Standard",
    export: "Click Export -> Export to Excel",
  },
  "prior-pl": {
    title: "Profit & Loss Comparison",
    qbo: "Reports -> Standard -> Business Overview -> Profit and Loss Comparison",
    desktop: "Reports -> Company & Financial -> Profit & Loss Previous Year Comparison",
    export: "Click Export -> Export to Excel",
  },
  bs: {
    title: "Balance Sheet",
    qbo: "Reports -> Standard -> Business Overview -> Balance Sheet",
    desktop: "Reports -> Company & Financial -> Balance Sheet Standard",
    export: "Click Export -> Export to Excel",
  },
  "prior-bs": {
    title: "Balance Sheet Comparison",
    qbo: "Reports -> Standard -> Business Overview -> Balance Sheet Comparison",
    desktop: "Reports -> Company & Financial -> Balance Sheet Previous Year Comparison",
    export: "Click Export -> Export to Excel",
  },
  "cash-flow": {
    title: "Cash Flow Statement",
    qbo: "Reports -> Standard -> Business Overview -> Statement of Cash Flows",
    desktop: "Reports -> Company & Financial -> Statement of Cash Flows",
    export: "Click Export -> Export to Excel",
  },
  "current-month-gl": {
    title: "General Ledger",
    qbo: "Reports -> Standard -> For My Accountant -> General Ledger -> set date range accordingly",
    desktop: "Reports -> Accountant & Taxes -> General Ledger -> set date range",
    export: "Click Export -> Export to Excel",
  },
  "prior-month-gl": {
    title: "General Ledger",
    qbo: "Reports -> Standard -> For My Accountant -> General Ledger -> set date range accordingly",
    desktop: "Reports -> Accountant & Taxes -> General Ledger -> set date range",
    export: "Click Export -> Export to Excel",
  },
  "current-quarter-gl": {
    title: "General Ledger",
    qbo: "Reports -> Standard -> For My Accountant -> General Ledger -> set date range accordingly",
    desktop: "Reports -> Accountant & Taxes -> General Ledger -> set date range",
    export: "Click Export -> Export to Excel",
  },
  "prior-quarter-gl": {
    title: "General Ledger",
    qbo: "Reports -> Standard -> For My Accountant -> General Ledger -> set date range accordingly",
    desktop: "Reports -> Accountant & Taxes -> General Ledger -> set date range",
    export: "Click Export -> Export to Excel",
  },
  "current-year-gl": {
    title: "General Ledger",
    qbo: "Reports -> Standard -> For My Accountant -> General Ledger -> set date range accordingly",
    desktop: "Reports -> Accountant & Taxes -> General Ledger -> set date range",
    export: "Click Export -> Export to Excel",
  },
  "prior-year-gl": {
    title: "General Ledger",
    qbo: "Reports -> Standard -> For My Accountant -> General Ledger -> set date range accordingly",
    desktop: "Reports -> Accountant & Taxes -> General Ledger -> set date range",
    export: "Click Export -> Export to Excel",
  },
  ar: {
    title: "AR Aging Summary",
    qbo: "Reports -> Standard -> Who Owes You -> Accounts Receivable Aging Summary",
    desktop: "Reports -> Customers & Receivables -> A/R Aging Summary",
    export: "Click Export -> Export to Excel",
  },
  ap: {
    title: "AP Aging Summary",
    qbo: "Reports -> Standard -> What You Owe -> Accounts Payable Aging Summary",
    desktop: "Reports -> Vendors & Payables -> A/P Aging Summary",
    export: "Click Export -> Export to Excel",
  },
  budget: {
    title: "Budget vs Actuals",
    qbo: "Reports -> Standard -> Business Overview -> Budget vs. Actuals",
    desktop: "Reports -> Budgets & Forecasts -> Budget vs. Actual",
    export: "Click Export -> Export to Excel",
  },
  "current-payroll": {
    title: "Payroll Summary by Department",
    qbo: "Reports -> Standard -> Payroll -> Payroll Summary by Employee -> Group by Class/Department",
    desktop: "Reports -> Employees & Payroll -> Payroll Summary -> Filter by Class",
    export: "Click Export -> Export to Excel",
    note: "Must have Class Tracking enabled for department breakdown. Go to Settings -> Payroll Settings -> enable Class Tracking.",
  },
  "prior-payroll": {
    title: "Payroll Summary by Department",
    qbo: "Reports -> Standard -> Payroll -> Payroll Summary by Employee -> Group by Class/Department",
    desktop: "Reports -> Employees & Payroll -> Payroll Summary -> Filter by Class",
    export: "Click Export -> Export to Excel",
    note: "Must have Class Tracking enabled for department breakdown. Go to Settings -> Payroll Settings -> enable Class Tracking.",
  },
  "current-payroll-detail": {
    title: "Payroll GL Detail",
    qbo: "Reports -> Standard -> For My Accountant -> General Ledger -> filter by payroll accounts only",
    desktop: "Reports -> Employees & Payroll -> Payroll Detail Review",
    export: "Click Export -> Export to Excel",
  },
  "prior-payroll-detail": {
    title: "Payroll GL Detail",
    qbo: "Reports -> Standard -> For My Accountant -> General Ledger -> filter by payroll accounts only",
    desktop: "Reports -> Employees & Payroll -> Payroll Detail Review",
    export: "Click Export -> Export to Excel",
  },
  "fixed-assets": {
    title: "Fixed Assets",
    qbo: "Reports -> Standard -> For My Accountant -> Fixed Asset List",
    desktop: "Reports -> Fixed Assets -> Fixed Asset Listing",
    export: "Click Export -> Export to Excel",
    note: "Full depreciation schedule requires QuickBooks Fixed Asset Manager add-on.",
  },
  "prior-fixed-assets": {
    title: "Fixed Assets",
    qbo: "Reports -> Standard -> For My Accountant -> Fixed Asset List",
    desktop: "Reports -> Fixed Assets -> Fixed Asset Listing",
    export: "Click Export -> Export to Excel",
    note: "Full depreciation schedule requires QuickBooks Fixed Asset Manager add-on.",
  },
  debt: {
    title: "Debt Schedule / Loan Detail",
    qbo: "Reports -> Standard -> What You Owe -> Loan List, or run Balance Sheet and drill down into long-term liability accounts",
    desktop: "Reports -> Company & Financial -> Balance Sheet -> drill into loan accounts",
    export: "Click Export -> Export to Excel",
    note: "QuickBooks does not have a native debt schedule report. This data is typically exported from loan liability accounts in the General Ledger.",
  },
  customers: {
    title: "Sales by Customer",
    qbo: "Reports -> Standard -> Sales and Customers -> Sales by Customer Summary",
    desktop: "Reports -> Sales -> Sales by Customer Summary",
    export: "Click Export -> Export to Excel",
  },
  vendors: {
    title: "Expenses by Vendor",
    qbo: "Reports -> Standard -> Expenses and Vendors -> Expenses by Vendor Summary",
    desktop: "Reports -> Company & Financial -> Expenses by Vendor Summary",
    export: "Click Export -> Export to Excel",
  },
  inventory: {
    title: "Inventory Valuation",
    qbo: "Reports -> Standard -> Sales and Customers -> Inventory Valuation Summary",
    desktop: "Reports -> Inventory -> Inventory Valuation Summary",
    export: "Click Export -> Export to Excel",
  },
};
const REPORT_FILENAME_KEYWORDS: Record<string, string[]> = {
  pl: ["profit and loss", "profitandloss", "profit loss", "p&l", "pnl", "income statement"],
  bs: ["balance sheet"],
  ar: ["accounts receivable aging", "ar aging", "ar aging summary", "araging", "araging summary", "receivable aging", "a/r aging"],
  ap: ["accounts payable aging", "ap aging", "ap aging summary", "apaging", "apaging summary", "payable aging", "a/p aging"],
  inventory: ["inventory valuation", "inventory valuation summary", "inventoryvaluation", "inventory summary", "inventory value"],
  customers: ["sales by customer", "salesbycustomer", "customer sales", "sales customer"],
  vendors: ["expenses by vendor", "expensesbyvendor", "expense by vendor", "vendor expense", "vendor expenses"],
  "fixed-assets": ["fixed asset detail", "fixed asset register", "fixed assets", "fixedassets", "asset register"],
  "prior-fixed-assets": ["prior fixed asset", "prior period fixed asset", "priorperiod fixed assets", "priorperiod fixedassets", "previous fixed asset"],
  budget: ["budget vs actual", "budget vs actuals", "budgetvsactual", "budgetvsactuals", "budget actual", "budget variance"],
  "current-payroll": [
    "current month payroll summary",
    "payroll summary current month",
    "payrollsummary by department current",
    "payroll summary by department current",
    "current payroll summary",
    "payroll summary by department dec2025",
    "payrollsummary bydepartment dec2025",
  ],
  "prior-payroll": [
    "prior month payroll summary",
    "payroll summary prior month",
    "payrollsummary by department prior",
    "payroll summary by department prior",
    "previous month payroll summary",
    "prior payroll summary",
    "payroll summary by department nov2025",
    "payrollsummary bydepartment nov2025",
  ],
  "current-payroll-detail": [
    "payroll gl detail current month",
    "payrollgldetail currentmonth",
    "payroll detail current month",
    "payroll gl detail dec2025",
    "payrollgldetail dec2025",
  ],
  "prior-payroll-detail": [
    "payroll gl detail prior month",
    "payrollgldetail priormonth",
    "payroll detail prior month",
    "payroll gl detail nov2025",
    "payrollgldetail nov2025",
  ],
  "prior-pl": ["profit and loss comparison", "profitandlosscomparison", "p&l comparison", "pnl comparison", "profit loss comparison"],
  "prior-bs": ["balance sheet comparison"],
  "cash-flow": ["statement of cash flows", "cash flow statement", "cashflowstatement", "cash flow", "cash flows"],
  debt: ["debt schedule", "debtschedule", "loan detail", "loandetail", "loan schedule"],
  "current-month-gl": ["current month general ledger", "general ledger current month", "current month gl", "gl current month", "gl currentmonth", "glcurrentmonth"],
  "prior-month-gl": ["prior month general ledger", "general ledger prior month", "prior month gl", "gl prior month", "gl priormonth", "glpriormonth"],
  "current-quarter-gl": ["current quarter general ledger", "general ledger current quarter", "current quarter gl", "gl current quarter", "gl currentquarter", "glcurrentquarter"],
  "prior-quarter-gl": ["prior quarter general ledger", "general ledger prior quarter", "prior quarter gl", "gl prior quarter", "gl priorquarter", "glpriorquarter"],
  "current-year-gl": ["current year general ledger", "general ledger current year", "current year gl", "gl current year", "gl currentyear", "glcurrentyear"],
  "prior-year-gl": ["prior year general ledger", "general ledger prior year", "prior year gl", "gl prior year", "gl prioryear", "glprioryear"],
};

function isProfessionalOrHigher(tier: PackageTier) {
  return tier === "professional" || tier === "virtualCfo";
}

function isVirtualCfo(tier: PackageTier) {
  return tier === "virtualCfo";
}

function getDefaultRatiosForPackage(tier: PackageTier): RatioId[] {
  if (tier === "essential") {
    return [
      "Net Margin",
      "Gross Margin",
      "Operating Margin",
      "EBITDA Margin",
      "Expense Ratio",
      "Current Ratio",
      "Quick Ratio",
      "Cash to Assets",
      "Accounts Receivable to Assets",
      "AP to Revenue",
      "Working Capital Estimate",
      "DSO",
    ];
  }
  if (tier === "professional") {
    return [
      ...getDefaultRatiosForPackage("essential"),
      "Inventory to Total Assets",
      "Inventory Turnover",
      "AR Turnover",
      "AP Turnover",
      "Cash Conversion Cycle",
    ];
  }
  return [
    ...getDefaultRatiosForPackage("professional"),
    "Payroll Cost as % of Revenue",
    "Gross Wages as % of Revenue",
    "Payroll Taxes as % of Gross Wages",
    "Payroll Cost per FTE",
    "Revenue per FTE",
    "Gross Profit per FTE",
    "Debt to Equity",
    "Debt to Assets",
  ];
}

function getClientSettingsKey(clientName: string) {
  return `finsight_client_package_settings_${clientName.trim().toLowerCase().replace(/\s+/g, "_")}`;
}

function filterSelectedFluxRows(rows: FluxRow[], includeHighOnly: boolean, includeModerate: boolean, maxRows: number) {
  return rows
    .filter((row) => {
      if (includeHighOnly) return row.severity === "High";
      if (!includeModerate) return row.severity !== "Moderate";
      return true;
    })
    .slice(0, Math.max(maxRows || 0, 1));
}

function isReportRequiredForPackage(reportId: string, packageTier: PackageTier) {
  return packageRequirements[packageTier].some((requirement) => requirement.reportIds.includes(reportId));
}

function isReportRequiredForOpenRequirement(
  reportId: string,
  packageTier: PackageTier,
  reports: UploadReport[],
) {
  return packageRequirements[packageTier].some((requirement) => {
    if (!requirement.reportIds.includes(reportId)) return false;

    return !requirement.reportIds.some((requirementReportId) => {
      const matchingReport = reports.find((report) => report.id === requirementReportId);
      return Boolean(matchingReport?.data || matchingReport?.omitted);
    });
  });
}

function getPackageRequirementStatuses(
  packageTier: PackageTier,
  reports: UploadReport[],
): PackageRequirementStatus[] {
  return packageRequirements[packageTier].map((requirement) => {
    const matchingReports = requirement.reportIds
      .map((reportId) => reports.find((report) => report.id === reportId))
      .filter(Boolean) as UploadReport[];
    const uploaded = matchingReports.some((report) => Boolean(report.data));
    const omitted = matchingReports.some((report) => report.omitted);

    return {
      ...requirement,
      uploaded,
      omitted,
      resolved: uploaded || omitted,
    };
  });
}

function normalizeFileNameForMatch(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\bapaging\b/g, "ap aging")
    .replace(/\baraging\b/g, "ar aging")
    .replace(/\bgl\b/g, "general ledger")
    .replace(/\s+/g, " ")
    .trim();
}

function compactFileNameForMatch(fileName: string) {
  return normalizeFileNameForMatch(fileName).replace(/[^a-z0-9]/g, "");
}

function isSupportedImportFile(file: File) {
  return /\.(csv|xls|xlsx)$/i.test(file.name);
}

function getReportFileMatchScore(reportId: string, fileName: string) {
  const normalizedFileName = normalizeFileNameForMatch(fileName);
  const compactFileName = compactFileNameForMatch(fileName);
  const keywords = REPORT_FILENAME_KEYWORDS[reportId] || [];

  const keywordScore = keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeFileNameForMatch(keyword);
    const compactKeyword = compactFileNameForMatch(keyword);
    const spacedMatch = normalizedFileName.includes(normalizedKeyword);
    const compactMatch = compactKeyword.length > 2 && compactFileName.includes(compactKeyword);
    return spacedMatch || compactMatch ? score + compactKeyword.length : score;
  }, 0);

  const isPayrollSummaryFile =
    compactFileName.includes("payrollsummarybydepartment") ||
    (compactFileName.includes("payrollsummary") && compactFileName.includes("department"));
  const isPayrollDetailFile =
    compactFileName.includes("payrollgldetail") ||
    (compactFileName.includes("payrolldetail") && !compactFileName.includes("summary"));
  const isCurrentPeriod =
    compactFileName.includes("currentmonth") ||
    compactFileName.includes("current") ||
    compactFileName.includes("dec2025");
  const isPriorPeriod =
    compactFileName.includes("priormonth") ||
    compactFileName.includes("prior") ||
    compactFileName.includes("previous") ||
    compactFileName.includes("nov2025");
  const isCurrentPayrollSummary =
    reportId === "current-payroll" &&
    isPayrollSummaryFile &&
    isCurrentPeriod;
  const isPriorPayrollSummary =
    reportId === "prior-payroll" &&
    isPayrollSummaryFile &&
    isPriorPeriod;
  const isCurrentPayrollDetail =
    reportId === "current-payroll-detail" &&
    isPayrollDetailFile &&
    isCurrentPeriod;
  const isPriorPayrollDetail =
    reportId === "prior-payroll-detail" &&
    isPayrollDetailFile &&
    isPriorPeriod;

  if (isCurrentPayrollSummary || isPriorPayrollSummary || isCurrentPayrollDetail || isPriorPayrollDetail) {
    return keywordScore + 80;
  }

  return keywordScore;
}

function getBestReportMatch(file: File, reports: UploadReport[]) {
  const scoredReports = reports
    .map((report) => ({ report, score: getReportFileMatchScore(report.id, file.name) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredReports[0]?.report || null;
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "";

  const amount = Math.round(value);
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  return amount < 0 ? `($${formatted})` : `$${formatted}`;
}

function formatMoney(value: number | null | undefined) {
  return formatCurrency(value ?? 0);
}

function formatPeriodEnding(value: string) {
  const trimmed = value.trim();
  const parsed = new Date(trimmed);
  if (!trimmed || Number.isNaN(parsed.getTime())) return trimmed || "For the Current Reporting Period";

  return `For the Period Ending ${parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;
}

function formatOptionalCurrency(value: number | null | undefined, fallback = "Not found") {
  return value === null || value === undefined ? fallback : formatCurrency(value);
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatFte(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  const percentValue = Math.abs(value) <= 1 ? value * 100 : value;
  const formatted = `${Math.abs(percentValue).toFixed(1)}%`;
  return percentValue < 0 ? `(${formatted})` : formatted;
}

function formatRate(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function escapeXml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .slice(0, 900)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim() || "FinSight Presentation";
}

function createCrc32Table() {
  const table: number[] = [];
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[i] = crc >>> 0;
  }
  return table;
}

const CRC32_TABLE = createCrc32Table();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function concatBytes(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });
  return output;
}

function createZipBlob(files: Array<{ path: string; content: string }>, mimeType: string) {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.path);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, 0);
    writeUint16(localHeader, 12, 0);
    writeUint32(localHeader, 14, crc);
    writeUint32(localHeader, 18, data.length);
    writeUint32(localHeader, 22, data.length);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);
    localChunks.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, 0);
    writeUint16(centralHeader, 14, 0);
    writeUint32(centralHeader, 16, crc);
    writeUint32(centralHeader, 20, data.length);
    writeUint32(centralHeader, 24, data.length);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralChunks.push(centralHeader);
    offset += localHeader.length + data.length;
  });

  const centralDirectory = concatBytes(centralChunks);
  const endRecord = new Uint8Array(22);
  writeUint32(endRecord, 0, 0x06054b50);
  writeUint16(endRecord, 4, 0);
  writeUint16(endRecord, 6, 0);
  writeUint16(endRecord, 8, files.length);
  writeUint16(endRecord, 10, files.length);
  writeUint32(endRecord, 12, centralDirectory.length);
  writeUint32(endRecord, 16, offset);
  writeUint16(endRecord, 20, 0);

  return new Blob([concatBytes([...localChunks, centralDirectory, endRecord])], { type: mimeType });
}

function pptParagraph(text: string, size: number, color = "E2E8F0", bold = false) {
  return `<a:p><a:r><a:rPr lang="en-US" sz="${size}"${bold ? ' b="1"' : ""}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:rPr><a:t>${escapeXml(text)}</a:t></a:r></a:p>`;
}

function pptShape({
  id,
  name,
  x,
  y,
  cx,
  cy,
  fill,
  paragraphs,
}: {
  id: number;
  name: string;
  x: number;
  y: number;
  cx: number;
  cy: number;
  fill?: string;
  paragraphs: string;
}) {
  const hasText = Boolean(paragraphs);
  return `
    <p:sp>
      <p:nvSpPr><p:cNvPr id="${id}" name="${escapeXml(name)}"/><p:cNvSpPr${hasText ? ' txBox="1"' : ""}/><p:nvPr/></p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        ${fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : "<a:noFill/>"}
        <a:ln><a:noFill/></a:ln>
      </p:spPr>
      ${hasText ? `<p:txBody><a:bodyPr wrap="square" anchor="t"/><a:lstStyle/>${paragraphs}</p:txBody>` : ""}
    </p:sp>
  `;
}

function buildSlideXml(slide: PowerPointSlideData, index: number, slideCount: number, preparedBy: string) {
  let shapeId = 2;
  const nextId = () => shapeId++;
  const maxChartValue = Math.max(
    1,
    ...slide.chartData.slice(0, 6).map((item) => Math.abs(Number(item.value || 0))),
  );
  const bulletParagraphs = (slide.bullets.length ? slide.bullets : ["No data available for this section."])
    .slice(0, 6)
    .map((bullet) => pptParagraph(`- ${bullet}`, 1600, "E2E8F0"))
    .join("");
  const chartShapes = slide.chartData
    .slice(0, 6)
    .map((item, chartIndex) => {
      const value = Number(item.value || 0);
      const y = 2670000 + chartIndex * 440000;
      const barWidth = Math.max(170000, Math.round((Math.abs(value) / maxChartValue) * 2650000));
      return [
        pptShape({
          id: nextId(),
          name: `Chart Label ${chartIndex + 1}`,
          x: 6920000,
          y,
          cx: 1750000,
          cy: 260000,
          paragraphs: pptParagraph(String(item.name || "Metric"), 1150, "CBD5E1", true),
        }),
        pptShape({
          id: nextId(),
          name: `Chart Value ${chartIndex + 1}`,
          x: 8720000,
          y,
          cx: 980000,
          cy: 260000,
          paragraphs: pptParagraph(formatCurrency(value), 1150, "BFDBFE", true),
        }),
        pptShape({
          id: nextId(),
          name: `Chart Bar ${chartIndex + 1}`,
          x: 9850000,
          y: y + 65000,
          cx: barWidth,
          cy: 120000,
          fill: value < 0 ? "C0845A" : "5B8CFF",
          paragraphs: "",
        }),
      ].join("");
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld>
        <p:bg><p:bgPr><a:solidFill><a:srgbClr val="0B1020"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
        <p:spTree>
          <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
          <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
          ${pptShape({
            id: nextId(),
            name: "Kicker",
            x: 610000,
            y: 430000,
            cx: 7200000,
            cy: 300000,
            paragraphs: pptParagraph(`SLIDE ${index + 1} / ${slideCount} • ${slide.sectionType}`, 1050, "93C5FD", true),
          })}
          ${pptShape({
            id: nextId(),
            name: "Title",
            x: 610000,
            y: 820000,
            cx: 10400000,
            cy: 780000,
            paragraphs: pptParagraph(slide.title, 3000, "F8FAFC", true),
          })}
          ${pptShape({
            id: nextId(),
            name: "Subtitle",
            x: 610000,
            y: 1570000,
            cx: 9900000,
            cy: 420000,
            paragraphs: pptParagraph(slide.subtitle, 1450, "CBD5E1"),
          })}
          ${pptShape({
            id: nextId(),
            name: "Narrative Card",
            x: 610000,
            y: 2300000,
            cx: slide.chartData.length ? 5600000 : 11100000,
            cy: 3500000,
            fill: "111827",
            paragraphs: bulletParagraphs,
          })}
          ${
            slide.chartData.length
              ? pptShape({
                  id: nextId(),
                  name: "Chart Card",
                  x: 6610000,
                  y: 2300000,
                  cx: 5650000,
                  cy: 3500000,
                  fill: "172033",
                  paragraphs: pptParagraph("Chart Data", 1400, "F8FAFC", true),
                })
              : ""
          }
          ${chartShapes}
          ${pptShape({
            id: nextId(),
            name: "Footer",
            x: 610000,
            y: 6350000,
            cx: 9000000,
            cy: 230000,
            paragraphs: pptParagraph(`Prepared by ${preparedBy || "FinSight Reports"}`, 900, "94A3B8"),
          })}
        </p:spTree>
      </p:cSld>
      <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
    </p:sld>`;
}

function buildPptxBlob(slides: PowerPointSlideData[], preparedBy: string) {
  const slideOverrides = slides
    .map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`)
    .join("");
  const slideRelationships = slides
    .map((_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`)
    .join("");
  const slideIds = slides
    .map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`)
    .join("");
  const files = [
    {
      path: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${slideOverrides}</Types>`,
    },
    {
      path: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    },
    {
      path: "docProps/core.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>FinSight Board Presentation</dc:title><dc:creator>${escapeXml(preparedBy || "FinSight Reports")}</dc:creator><cp:lastModifiedBy>${escapeXml(preparedBy || "FinSight Reports")}</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified></cp:coreProperties>`,
    },
    {
      path: "docProps/app.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>FinSight Reports</Application><PresentationFormat>On-screen Show (16:9)</PresentationFormat><Slides>${slides.length}</Slides></Properties>`,
    },
    {
      path: "ppt/presentation.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="wide"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr></p:defaultTextStyle></p:presentation>`,
    },
    {
      path: "ppt/_rels/presentation.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slideRelationships}</Relationships>`,
    },
    {
      path: "ppt/slideMasters/slideMaster1.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr algn="l"><a:defRPr sz="3000" lang="en-US"/></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr marL="342900" indent="-342900"><a:defRPr sz="1800" lang="en-US"/></a:lvl1pPr><a:lvl2pPr marL="742950" indent="-285750"><a:defRPr sz="1600" lang="en-US"/></a:lvl2pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1600" lang="en-US"/></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>`,
    },
    {
      path: "ppt/slideMasters/_rels/slideMaster1.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`,
    },
    {
      path: "ppt/slideLayouts/slideLayout1.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
    },
    {
      path: "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`,
    },
    {
      path: "ppt/theme/theme1.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="FinSight"><a:themeElements><a:clrScheme name="FinSight"><a:dk1><a:srgbClr val="0B1020"/></a:dk1><a:lt1><a:srgbClr val="F8FAFC"/></a:lt1><a:dk2><a:srgbClr val="172033"/></a:dk2><a:lt2><a:srgbClr val="E2E8F0"/></a:lt2><a:accent1><a:srgbClr val="5B8CFF"/></a:accent1><a:accent2><a:srgbClr val="4FAE8A"/></a:accent2><a:accent3><a:srgbClr val="C0845A"/></a:accent3><a:accent4><a:srgbClr val="D8B56D"/></a:accent4><a:accent5><a:srgbClr val="7BA7D9"/></a:accent5><a:accent6><a:srgbClr val="94A3B8"/></a:accent6><a:hlink><a:srgbClr val="5B8CFF"/></a:hlink><a:folHlink><a:srgbClr val="7BA7D9"/></a:folHlink></a:clrScheme><a:fontScheme name="FinSight"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="FinSight"><a:fillStyleLst><a:solidFill><a:schemeClr val="accent1"/></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="accent1"><a:lumMod val="110000"/><a:satMod val="105000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="accent1"><a:lumMod val="75000"/><a:satMod val="105000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill><a:solidFill><a:schemeClr val="accent2"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="accent1"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="accent1"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="accent1"/></a:solidFill><a:prstDash val="solid"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="dk1"/></a:solidFill><a:solidFill><a:schemeClr val="dk2"/></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="dk1"/></a:gs><a:gs pos="100000"><a:schemeClr val="dk2"/></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`,
    },
    ...slides.flatMap((slide, index) => [
      {
        path: `ppt/slides/slide${index + 1}.xml`,
        content: buildSlideXml(slide, index, slides.length, preparedBy),
      },
      {
        path: `ppt/slides/_rels/slide${index + 1}.xml.rels`,
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`,
      },
    ]),
  ];

  return createZipBlob(files, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
}

type PptxBrowserSlide = {
  background: { color: string };
  addText: (text: string, options: Record<string, unknown>) => void;
  addShape: (shapeType: string, options: Record<string, unknown>) => void;
  addImage: (options: Record<string, unknown>) => void;
};

type PptxBrowserPresentation = {
  layout: string;
  author: string;
  subject: string;
  title: string;
  company: string;
  theme: unknown;
  addSlide: () => PptxBrowserSlide;
  writeFile: (options: { fileName: string }) => Promise<void>;
};

type PptxBrowserConstructor = new () => PptxBrowserPresentation;

declare global {
  interface Window {
    pptxgen?: PptxBrowserConstructor;
    PptxGenJS?: PptxBrowserConstructor;
    __finsightPptxGenPromise?: Promise<PptxBrowserConstructor>;
  }
}

function loadPowerPointLibrary() {
  if (window.pptxgen || window.PptxGenJS) {
    return Promise.resolve((window.pptxgen || window.PptxGenJS) as PptxBrowserConstructor);
  }
  if (window.__finsightPptxGenPromise) return window.__finsightPptxGenPromise;

  window.__finsightPptxGenPromise = new Promise<PptxBrowserConstructor>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/pptxgenjs/dist/pptxgen.bundle.js";
    script.async = true;
    script.onload = () => {
      const library = window.pptxgen || window.PptxGenJS;
      if (library) resolve(library);
      else reject(new Error("PowerPoint library did not expose a browser global."));
    };
    script.onerror = () => reject(new Error("PowerPoint library script failed to load."));
    document.head.appendChild(script);
  });

  return window.__finsightPptxGenPromise;
}

function getExecutiveSummaryCardBullets(slide: PowerPointSlideData, label: string, fallback: string[]) {
  const normalizedLabel = label.toLowerCase();
  const matchingBullet = slide.bullets.find((bullet) => {
    const normalizedBullet = bullet.toLowerCase();
    if (normalizedLabel.includes("financial")) return normalizedBullet.includes("financial performance");
    if (normalizedLabel.includes("liquidity")) return normalizedBullet.includes("liquidity");
    if (normalizedLabel.includes("payroll")) return normalizedBullet.includes("payroll");
    return normalizedBullet.includes("risk") || normalizedBullet.includes("watch");
  });
  const body = matchingBullet?.includes(":") ? matchingBullet.split(":").slice(1).join(":") : matchingBullet;
  const bullets = (body || "")
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim().replace(/[.!?]$/, ""))
    .filter(Boolean)
    .slice(0, 3)
    .map((item) => (item.length > 115 ? `${item.slice(0, 112).trim()}...` : item));

  return bullets.length ? bullets : fallback;
}

function getRatioCardTone(interpretation: string) {
  const normalized = interpretation.toLowerCase();
  return normalized.includes("strong") ||
    normalized.includes("healthy") ||
    normalized.includes("positive") ||
    normalized.includes("well") ||
    normalized.includes("acceptable")
    ? "4FAE8A"
    : "D8B56D";
}

function hasBudgetComparisonData(budgetMetrics: BudgetMetrics) {
  return [
    budgetMetrics.revenueActual,
    budgetMetrics.revenueBudget,
    budgetMetrics.revenueVariance,
    budgetMetrics.netIncomeActual,
    budgetMetrics.netIncomeBudget,
    budgetMetrics.netIncomeVariance,
    budgetMetrics.largestUnfavorableVariance,
  ].some((value) => value !== null && value !== undefined);
}

async function downloadPowerPointDeck(
  slides: PowerPointSlideData[],
  companyName: string,
  reportPeriod: string,
  preparedBy: string,
  firmLogoPath: string,
  firmLogoDataUrl: string,
) {
  if (!slides.length) return;
  const filename = `${sanitizeFilename(`${companyName} ${reportPeriod} Board Presentation`)}.pptx`;

  try {
    const PptxGenJS = await loadPowerPointLibrary();
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = preparedBy || "FinSight Reports";
    pptx.company = "FinSight Reports";
    pptx.subject = "Board / Owner Presentation";
    pptx.title = `${companyName} Board Presentation`;
    pptx.theme = {
      headFontFace: "Arial",
      bodyFontFace: "Arial",
      lang: "en-US",
    };

    slides.forEach((slide, index) => {
      const pptSlide = pptx.addSlide();
      pptSlide.background = { color: "0B1020" };
      pptSlide.addShape("rect", {
        x: 0,
        y: 0,
        w: 13.333,
        h: 7.5,
        fill: { color: "0B1020" },
        line: { color: "0B1020", transparency: 100 },
      });
      pptSlide.addShape("rect", {
        x: 0,
        y: 0,
        w: 13.333,
        h: 7.5,
        fill: { color: "172033", transparency: 12 },
        line: { color: "172033", transparency: 100 },
      });

      if (slide.sectionType === "title") {
        const preparedDate = new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        const uploadedLogo = firmLogoDataUrl.trim();
        const trimmedLogoPath = firmLogoPath.trim();
        const logoSource = uploadedLogo || trimmedLogoPath;
        if (logoSource) {
          pptSlide.addImage({
            ...(logoSource.startsWith("data:") ? { data: logoSource } : { path: logoSource }),
            x: 10.35,
            y: 0.58,
            w: 2.15,
            h: 0.72,
            sizingCrop: true,
          });
        } else {
          pptSlide.addShape("rect", {
            x: 10.35,
            y: 0.58,
            w: 2.15,
            h: 0.72,
            fill: { color: "111827", transparency: 6 },
            line: { color: "334155", transparency: 10 },
          });
          pptSlide.addText("FIRM LOGO", {
            x: 10.35,
            y: 0.83,
            w: 2.15,
            h: 0.18,
            fontFace: "Arial",
            fontSize: 9,
            bold: true,
            color: "94A3B8",
            align: "center",
            margin: 0,
          });
        }
        pptSlide.addText(companyName, {
          x: 0.75,
          y: 2.05,
          w: 10.8,
          h: 0.72,
          fontFace: "Arial",
          fontSize: 34,
          bold: true,
          color: "F8FAFC",
          margin: 0,
          fit: "shrink",
        });
        pptSlide.addShape("rect", {
          x: 0.75,
          y: 2.95,
          w: 2.35,
          h: 0.03,
          fill: { color: "5B8CFF" },
          line: { color: "5B8CFF", transparency: 100 },
        });
        pptSlide.addText(reportPeriod, {
          x: 0.75,
          y: 3.18,
          w: 9.6,
          h: 0.36,
          fontFace: "Arial",
          fontSize: 16,
          color: "CBD5E1",
          margin: 0,
          fit: "shrink",
        });
        pptSlide.addText(`${preparedBy || "FinSight Reports"}\nPrepared ${preparedDate}`, {
          x: 0.75,
          y: 6.25,
          w: 4.2,
          h: 0.45,
          fontFace: "Arial",
          fontSize: 10,
          color: "94A3B8",
          margin: 0,
          breakLine: false,
          fit: "shrink",
        });
        return;
      }

      pptSlide.addText(slide.title, {
        x: 0.55,
        y: 0.75,
        w: 11.4,
        h: 0.65,
        fontFace: "Arial",
        fontSize: 25,
        bold: true,
        color: "F8FAFC",
        margin: 0,
        fit: "shrink",
      });
      pptSlide.addText(slide.subtitle, {
        x: 0.55,
        y: 1.45,
        w: 10.8,
        h: 0.32,
        fontFace: "Arial",
        fontSize: 12,
        color: "CBD5E1",
        margin: 0,
        fit: "shrink",
      });

      if (slide.sectionType === "executive-summary") {
        const cards = [
          {
            label: "Financial Performance",
            bullets: getExecutiveSummaryCardBullets(slide, "Financial Performance", [
              "Revenue, gross profit, and net income reviewed",
              "Margin trends should be monitored",
            ]),
          },
          {
            label: "Liquidity",
            bullets: getExecutiveSummaryCardBullets(slide, "Liquidity", [
              "Cash, AR, and AP position reviewed",
              "Working capital timing should be monitored",
            ]),
          },
          {
            label: "Payroll Summary",
            bullets: getExecutiveSummaryCardBullets(slide, "Payroll Summary", [
              "Payroll/FTE detail was not included",
              "Review staffing cost against revenue trends",
            ]),
          },
          {
            label: "Risk Watch Items",
            bullets: getExecutiveSummaryCardBullets(slide, "Risk Watch Items", [
              "Review flux, collections, and margin watch items",
              "Assign follow-up ownership where needed",
            ]),
          },
        ];
        cards.forEach((card, cardIndex) => {
          const column = cardIndex % 2;
          const row = Math.floor(cardIndex / 2);
          const x = 0.75 + column * 6.1;
          const y = 2.1 + row * 2.25;
          pptSlide.addShape("roundRect", {
            x,
            y,
            w: 5.55,
            h: 1.85,
            rectRadius: 0.12,
            fill: { color: "111827", transparency: 4 },
            line: { color: "334155", transparency: 15 },
          });
          pptSlide.addText(card.label, {
            x: x + 0.25,
            y: y + 0.22,
            w: 4.85,
            h: 0.22,
            fontFace: "Arial",
            fontSize: 10,
            bold: true,
            color: "93C5FD",
            margin: 0,
          });
          pptSlide.addText(card.bullets.slice(0, 3).map((bullet) => `- ${bullet}`).join("\n"), {
            x: x + 0.3,
            y: y + 0.62,
            w: 4.95,
            h: 0.95,
            fontFace: "Arial",
            fontSize: 9.2,
            color: "E2E8F0",
            breakLine: false,
            fit: "shrink",
            margin: 0,
            valign: "top",
          });
        });
        pptSlide.addText(`Prepared by ${preparedBy || "FinSight Reports"}`, {
          x: 0.55,
          y: 6.95,
          w: 6.5,
          h: 0.2,
          fontFace: "Arial",
          fontSize: 8,
          color: "94A3B8",
          margin: 0,
        });
        return;
      }

      if (slide.sectionType === "ratio-analysis") {
        const ratioCards = slide.bullets.slice(0, 9).map((bullet) => {
          const [name = "Ratio", value = "N/A", interpretation = "Review trend and benchmark context."] = bullet.split("|");
          return { name, value, interpretation };
        });
        ratioCards.forEach((ratio, ratioIndex) => {
          const column = ratioIndex % 3;
          const row = Math.floor(ratioIndex / 3);
          const x = 0.75 + column * 4.08;
          const y = 2.03 + row * 1.48;
          const valueColor = getRatioCardTone(ratio.interpretation);
          pptSlide.addShape("roundRect", {
            x,
            y,
            w: 3.55,
            h: 1.18,
            rectRadius: 0.1,
            fill: { color: "111827", transparency: 4 },
            line: { color: "334155", transparency: 15 },
          });
          pptSlide.addText(ratio.name, {
            x: x + 0.18,
            y: y + 0.15,
            w: 3.12,
            h: 0.18,
            fontFace: "Arial",
            fontSize: 7.8,
            bold: true,
            color: "CBD5E1",
            margin: 0,
            fit: "shrink",
          });
          pptSlide.addText(ratio.value, {
            x: x + 0.18,
            y: y + 0.42,
            w: 3.12,
            h: 0.34,
            fontFace: "Arial",
            fontSize: 17,
            bold: true,
            color: valueColor,
            margin: 0,
            fit: "shrink",
          });
          pptSlide.addText(ratio.interpretation, {
            x: x + 0.18,
            y: y + 0.82,
            w: 3.12,
            h: 0.22,
            fontFace: "Arial",
            fontSize: 6.8,
            color: "94A3B8",
            margin: 0,
            fit: "shrink",
          });
        });
        pptSlide.addText(`Prepared by ${preparedBy || "FinSight Reports"}`, {
          x: 0.55,
          y: 6.95,
          w: 6.5,
          h: 0.2,
          fontFace: "Arial",
          fontSize: 8,
          color: "94A3B8",
          margin: 0,
        });
        return;
      }

      const hasChart = slide.chartData.length > 0;
      const bulletWidth = hasChart ? 5.8 : 11.6;
      pptSlide.addShape("roundRect", {
        x: 0.55,
        y: 2.08,
        w: bulletWidth,
        h: 4.35,
        rectRadius: 0.12,
        fill: { color: "111827", transparency: 4 },
        line: { color: "334155", transparency: 20 },
      });
      pptSlide.addText((slide.bullets.length ? slide.bullets : ["No data available for this section."]).slice(0, 6).map((bullet) => `- ${bullet}`).join("\n"), {
        x: 0.85,
        y: 2.38,
        w: bulletWidth - 0.55,
        h: 3.8,
        fontFace: "Arial",
        fontSize: 12,
        color: "E2E8F0",
        breakLine: false,
        fit: "shrink",
        valign: "top",
      });

      if (hasChart) {
        const chartRows = slide.chartData.slice(0, 6);
        const maxChartValue = Math.max(1, ...chartRows.map((item) => Math.abs(Number(item.value || 0))));
        pptSlide.addShape("roundRect", {
          x: 6.65,
          y: 2.08,
          w: 5.75,
          h: 4.35,
          rectRadius: 0.12,
          fill: { color: "172033", transparency: 4 },
          line: { color: "334155", transparency: 20 },
        });
        pptSlide.addText("Chart Data", {
          x: 6.95,
          y: 2.32,
          w: 4.9,
          h: 0.3,
          fontFace: "Arial",
          fontSize: 12,
          bold: true,
          color: "F8FAFC",
          margin: 0,
        });
        chartRows.forEach((item, chartIndex) => {
          const value = Number(item.value || 0);
          const y = 2.85 + chartIndex * 0.5;
          const barWidth = Math.max(0.2, (Math.abs(value) / maxChartValue) * 2.35);
          pptSlide.addText(String(item.name || "Metric"), {
            x: 6.95,
            y,
            w: 1.65,
            h: 0.18,
            fontFace: "Arial",
            fontSize: 7.8,
            bold: true,
            color: "CBD5E1",
            margin: 0,
            fit: "shrink",
          });
          pptSlide.addText(formatCurrency(value), {
            x: 8.55,
            y,
            w: 1.0,
            h: 0.18,
            fontFace: "Arial",
            fontSize: 7.8,
            bold: true,
            color: "BFDBFE",
            margin: 0,
            align: "right",
          });
          pptSlide.addShape("rect", {
            x: 9.75,
            y: y + 0.03,
            w: barWidth,
            h: 0.09,
            fill: { color: value < 0 ? "C0845A" : "5B8CFF" },
            line: { color: value < 0 ? "C0845A" : "5B8CFF" },
          });
        });
      }

      pptSlide.addText(`Prepared by ${preparedBy || "FinSight Reports"}`, {
        x: 0.55,
        y: 6.95,
        w: 6.5,
        h: 0.2,
        fontFace: "Arial",
        fontSize: 8,
        color: "94A3B8",
        margin: 0,
      });
    });

    await pptx.writeFile({ fileName: filename });
  } catch {
    alert("PowerPoint generation could not load. Please check your internet connection and try again.");
  }
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const text = String(value)
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\((.*?)\)/g, "-$1")
    .replace(/^=/, "")
    .trim();
  const numericText = text.replace(/[^0-9.-]/g, "");

  if (!/\d/.test(numericText)) return null;

  const number = Number(numericText);
  return Number.isFinite(number) ? number : null;
}

function getLastNumericValue(row: unknown[]) {
  for (let index = row.length - 1; index >= 1; index--) {
    const value = parseNumber(row[index]);
    if (value !== null) return value;
  }

  return null;
}

function calculateKPIs(plData: ParsedFile | null, bsData: ParsedFile | null): KPIs {
  const matches: MatchedLine[] = [];

  const findExact = (rows: unknown[][], metric: string, labels: string[]) => {
    const normalizedLabels = labels.map((label) => normalizeStatementLabel(label));

    for (const targetLabel of normalizedLabels) {
      for (const row of rows) {
        const rawLabel = String(row[0] || "").trim();
        const label = normalizeStatementLabel(rawLabel);

        if (label === targetLabel) {
          const value = getLastNumericValue(row);

          if (value !== null) {
            matches.push({ metric, label: rawLabel, value });
            return value;
          }
        }
      }
    }

    matches.push({ metric, label: "Not found", value: 0 });
    return 0;
  };

  const revenue = findExact(plData?.rows || [], "Revenue", ["Total Income"]);
  const cogs = findExact(plData?.rows || [], "COGS", ["Total Cost of Goods Sold"]);
  const grossProfit = findExact(plData?.rows || [], "Gross Profit", ["Gross Profit"]);
  const expenses = findExact(plData?.rows || [], "Expenses", [
    "Total Operating Expenses",
    "Total Expenses",
    "Total Expense",
    "Total Operating Expense",
    "Operating Expenses",
  ]);
  const netIncome = findExact(plData?.rows || [], "Net Income", ["Net Income"]);
  const cash = findExact(bsData?.rows || [], "Cash", ["Total Bank Accounts"]);
  const accountsReceivable = findExact(bsData?.rows || [], "Accounts Receivable", [
    "Total Accounts Receivable",
    "Accounts Receivable",
    "Accounts Receivable (A/R)",
    "A/R",
    "Trade Accounts Receivable",
  ]);
  const totalAssets = findExact(bsData?.rows || [], "Total Assets", ["TOTAL ASSETS"]);
  const bsRows = getStatementRows(bsData);
  const totalLiabilities =
    findExact(bsData?.rows || [], "Total Liabilities", [
      "Total Liabilities",
      "TOTAL LIABILITIES",
      "Total Current Liabilities",
    ]) || getTotalLiabilities(bsRows);
  const totalEquity = findExact(bsData?.rows || [], "Total Equity", ["Total Equity", "TOTAL EQUITY"]) || getTotalEquity(bsRows);

  return {
    revenue,
    cogs,
    grossProfit,
    expenses,
    netIncome,
    cash,
    accountsReceivable,
    totalAssets,
    totalLiabilities,
    totalEquity,
    matches,
  };
}

function buildExecutiveSummary({
  kpis,
  netMargin,
  bsRows,
  arKpis,
  apKpis,
  inventoryKpis,
  fixedAssetKpis,
  fixedAssetChangeRows,
  payrollAnalysis,
  monthFluxRows,
  quarterFluxRows,
  yearFluxRows,
  budgetMetrics,
  debtMetrics,
  dso,
  includeAr,
  includeAp,
  includeInventory,
  includeFixedAssets,
  includePayroll,
  includeBudget,
  includeDebt,
}: {
  kpis: KPIs;
  netMargin: number;
  bsRows: StatementRow[];
  arKpis: AgingKpis;
  apKpis: APKpis;
  inventoryKpis: InventoryKpis;
  fixedAssetKpis: FixedAssetKpis;
  fixedAssetChangeRows: FixedAssetChangeRow[];
  payrollAnalysis: PayrollAnalysis;
  monthFluxRows: FluxRow[];
  quarterFluxRows: FluxRow[];
  yearFluxRows: FluxRow[];
  budgetMetrics: BudgetMetrics;
  debtMetrics: DebtMetrics;
  dso: number | null;
  includeAr: boolean;
  includeAp: boolean;
  includeInventory: boolean;
  includeFixedAssets: boolean;
  includePayroll: boolean;
  includeBudget: boolean;
  includeDebt: boolean;
}) {
  const grossMargin = kpis.revenue ? (kpis.grossProfit / kpis.revenue) * 100 : 0;
  const expenseRatio = kpis.revenue ? (kpis.expenses / kpis.revenue) * 100 : 0;
  const cashToAssets = kpis.totalAssets ? (kpis.cash / kpis.totalAssets) * 100 : 0;
  const currentAssets = getCurrentAssetTotal(bsRows);
  const currentLiabilities = getCurrentLiabilityTotal(bsRows);
  const workingCapital =
    currentAssets && currentLiabilities ? currentAssets - currentLiabilities : null;
  const currentRatio = currentAssets && currentLiabilities ? currentAssets / currentLiabilities : null;
  const quickRatio = currentLiabilities
    ? (kpis.cash + kpis.accountsReceivable) / currentLiabilities
    : null;
  const inventoryToAssets = kpis.totalAssets ? (inventoryKpis.totalValue / kpis.totalAssets) * 100 : 0;
  const topInventoryItem = inventoryKpis.topByValue[0];
  const topInventoryConcentration =
    topInventoryItem && inventoryKpis.totalValue ? (topInventoryItem.value / inventoryKpis.totalValue) * 100 : 0;
  const largestMonthVariance = monthFluxRows[0];
  const largestQuarterVariance = quarterFluxRows[0];
  const largestYearVariance = yearFluxRows[0];
  const highestSeverityFlux = [...monthFluxRows, ...quarterFluxRows, ...yearFluxRows].find(
    (row) => row.severity === "High",
  );
  const payrollCostPerFte = payrollAnalysis.totalCurrentFte
    ? payrollAnalysis.totalCurrentPayrollCost / payrollAnalysis.totalCurrentFte
    : 0;
  const sections: ExecutiveSummarySectionItem[] = [
    {
      title: "Financial Performance Summary",
      body: `Revenue was ${formatMoney(kpis.revenue)} with gross profit of ${formatMoney(
        kpis.grossProfit,
      )}, net income of ${formatMoney(kpis.netIncome)}, and net margin of ${netMargin.toFixed(
        1,
      )}%. Expenses represented ${expenseRatio.toFixed(
        1,
      )}% of revenue, making expense control and margin trend review key areas for management attention.`,
    },
    {
      title: "Liquidity and Working Capital Summary",
      body: `Cash was ${formatMoney(kpis.cash)} and accounts receivable was ${formatMoney(
        kpis.accountsReceivable,
      )}${includeAp ? `, compared with accounts payable of ${formatMoney(apKpis.total)}` : ""}. ${
        workingCapital !== null
          ? `Working capital was ${formatMoney(workingCapital)}, with a current ratio of ${
              currentRatio?.toFixed(2) || "N/A"
            } and quick ratio of ${quickRatio?.toFixed(2) || "N/A"}.`
          : "Current asset and current liability detail should be reviewed as additional balance sheet support becomes available."
      }${dso !== null ? ` DSO was ${dso.toFixed(1)} days.` : ""}`,
    },
    {
      title: "Operating Efficiency Summary",
      body: [
        includeAr
          ? `AR aging totaled ${formatMoney(arKpis.total)}, including ${formatMoney(
              arKpis.days61To90 + arKpis.days90Plus,
            )} over 60 days and ${formatMoney(arKpis.days90Plus)} over 90 days.`
          : "",
        includeAp
          ? `AP aging totaled ${formatMoney(apKpis.total)}, including ${formatMoney(
              apKpis.days61To90 + apKpis.days90Plus,
            )} over 60 days and ${formatMoney(apKpis.days90Plus)} over 90 days.`
          : "",
        includeInventory
          ? `Inventory was ${formatMoney(inventoryKpis.totalValue)}, equal to ${inventoryToAssets.toFixed(
              1,
            )}% of total assets${
              topInventoryItem
                ? `; ${topInventoryItem.name} represented ${topInventoryConcentration.toFixed(1)}% of inventory value`
                : ""
            }.`
          : "",
      ]
        .filter(Boolean)
        .join(" ") || "Operating efficiency should continue to be reviewed against margin, collections, vendor obligations, and production trends.",
    },
    {
      title: "Payroll and FTE Summary",
      body: includePayroll
        ? `Current FTE was ${formatFte(payrollAnalysis.totalCurrentFte)} compared with ${formatFte(
            payrollAnalysis.totalPriorFte,
          )} in the prior month, a change of ${formatFte(payrollAnalysis.totalFteChange)} FTE. Payroll cost was ${formatMoney(
            payrollAnalysis.totalCurrentPayrollCost,
          )}, with a month-over-month change of ${formatMoney(
            payrollAnalysis.totalPayrollCostChange,
          )} and payroll cost per FTE of ${formatMoney(payrollCostPerFte)}; the largest FTE and payroll cost increases were in ${
            payrollAnalysis.highestFteIncreaseDepartment
          } and ${payrollAnalysis.highestPayrollCostIncreaseDepartment}.`
        : "Payroll and FTE trends were not included in this package.",
    },
    {
      title: "Fixed Asset and Capital Investment Summary",
      body: includeFixedAssets
        ? `Fixed assets totaled ${formatMoney(
            fixedAssetKpis.totalFixedAssets,
          )}, accumulated depreciation was ${formatMoney(
            fixedAssetKpis.accumulatedDepreciation,
          )}, and net book value was ${formatMoney(fixedAssetKpis.netBookValue)}.${
            fixedAssetKpis.depreciationExpense !== null
              ? ` Depreciation expense was ${formatMoney(fixedAssetKpis.depreciationExpense)}.`
              : ""
          }${
            fixedAssetChangeRows.length
              ? ` Prior-period comparison shows net book value changed by ${formatMoney(
                  fixedAssetChangeRows.find((row) => row.metric === "Net book value change")?.change || 0,
                )}.`
              : ""
          }`
        : "Capital investment analysis was not included in this package.",
    },
    {
      title: "Risk and Watch Items",
      body: [
        largestMonthVariance
          ? `The largest month-over-month flux variance was ${largestMonthVariance.accountName} at ${formatMoney(
              largestMonthVariance.dollarVariance,
            )}.`
          : "",
        largestQuarterVariance
          ? `The largest quarter-over-quarter variance was ${largestQuarterVariance.accountName} at ${formatMoney(
              largestQuarterVariance.dollarVariance,
            )}.`
          : "",
        largestYearVariance
          ? `The largest year-over-year variance was ${largestYearVariance.accountName} at ${formatMoney(
              largestYearVariance.dollarVariance,
            )}.`
          : "",
        highestSeverityFlux ? `High-severity flux activity was flagged in ${highestSeverityFlux.accountName}.` : "",
        includeBudget && budgetMetrics.largestUnfavorableVariance !== null
          ? `The largest unfavorable budget variance was ${budgetMetrics.largestUnfavorableVarianceLabel} at ${formatMoney(
              budgetMetrics.largestUnfavorableVariance,
            )}.`
          : "",
        includeDebt && debtMetrics.totalDebt
          ? `Debt totaled ${formatMoney(debtMetrics.totalDebt)}, with debt-to-assets of ${
              debtMetrics.debtToAssets !== null ? `${debtMetrics.debtToAssets.toFixed(1)}%` : "N/A"
            }.`
          : "",
      ]
        .filter(Boolean)
        .join(" ") || "No elevated Virtual CFO risk indicators were identified from the uploaded package data.",
    },
    {
      title: "Recommended Follow-Up Items",
      body: buildRecommendedFollowUps({
        netMargin,
        expenseRatio,
        dso,
        arKpis,
        apKpis,
        payrollAnalysis,
        includeAr,
        includeAp,
        includePayroll,
        includeBudget,
        budgetMetrics,
      }).join(" "),
    },
  ].filter((section) => section.title !== "Payroll and FTE Summary" || includePayroll)
    .filter((section) => section.title !== "Fixed Asset and Capital Investment Summary" || includeFixedAssets);
  const followUpItems = buildRecommendedFollowUps({
    netMargin,
    expenseRatio,
    dso,
    arKpis,
    apKpis,
    payrollAnalysis,
    includeAr,
    includeAp,
    includePayroll,
    includeBudget,
    budgetMetrics,
  });

  return {
    paragraph: sections.map((section) => section.body).join(" "),
    sections,
    followUpItems,
    highlights: [
      `Revenue totaled ${formatMoney(kpis.revenue)} for the uploaded period.`,
      `Gross profit was ${formatMoney(kpis.grossProfit)}, representing a gross margin of ${grossMargin.toFixed(1)}%.`,
      `Net income was ${formatMoney(kpis.netIncome)}, with a net margin of ${netMargin.toFixed(1)}%.`,
      `Cash on hand was ${formatMoney(kpis.cash)}, equal to ${cashToAssets.toFixed(1)}% of total assets.`,
      ...(includePayroll ? [`Payroll cost was ${formatMoney(payrollAnalysis.totalCurrentPayrollCost)} across ${formatFte(payrollAnalysis.totalCurrentFte)} FTE.`] : []),
      ...(includeFixedAssets
        ? [`Net book value of fixed assets was ${formatCurrency(fixedAssetKpis.netBookValue)}.`]
        : []),
    ],
    watchItems: [
      `Expenses totaled ${formatMoney(kpis.expenses)}, or ${expenseRatio.toFixed(1)}% of revenue.`,
      `Accounts receivable was ${formatMoney(kpis.accountsReceivable)}, which should be monitored for collection timing.`,
      ...(includePayroll
        ? [`Payroll cost per FTE was ${formatMoney(payrollCostPerFte)}, which should be reviewed with revenue per FTE and gross margin trends.`]
        : []),
      netMargin < 10
        ? "Net margin is below 10%, suggesting profitability may need closer review."
        : "Net margin is positive, but should still be tracked against monthly targets.",
      kpis.cash < kpis.accountsReceivable
        ? "Accounts receivable exceeds cash, making collections an important near-term focus."
        : "Cash exceeds accounts receivable, supporting a stronger liquidity position.",
    ],
  };
}

function buildRecommendedFollowUps({
  netMargin,
  expenseRatio,
  dso,
  arKpis,
  apKpis,
  payrollAnalysis,
  includeAr,
  includeAp,
  includePayroll,
  includeBudget,
  budgetMetrics,
}: {
  netMargin: number;
  expenseRatio: number;
  dso: number | null;
  arKpis: AgingKpis;
  apKpis: APKpis;
  payrollAnalysis: PayrollAnalysis;
  includeAr: boolean;
  includeAp: boolean;
  includePayroll: boolean;
  includeBudget: boolean;
  budgetMetrics: BudgetMetrics;
}) {
  const items = [
    netMargin < 10
      ? "Review pricing, direct costs, and operating expenses to improve net margin."
      : "Compare margin performance against monthly targets and prior periods.",
    expenseRatio > 40 ? "Review overhead categories for cost reduction or reclassification opportunities." : "",
    dso !== null && dso > 60 ? "Prioritize AR collections and aging follow-up for balances over 60 days." : "",
    includeAr && arKpis.days90Plus > 0 ? "Investigate AR balances over 90 days and assign collection ownership." : "",
    includeAp && apKpis.days90Plus > 0 ? "Review AP balances over 90 days for vendor risk and payment timing." : "",
    includePayroll && Math.abs(payrollAnalysis.totalFteChange) > 0.5
      ? "Validate staffing changes by department against revenue volume and project demand."
      : "",
    includePayroll && payrollAnalysis.totalPayrollCostChange > 0
      ? "Monitor payroll cost growth against gross margin and revenue growth."
      : "",
    includeBudget && budgetMetrics.largestUnfavorableVariance !== null
      ? "Review unfavorable budget variances and document management action plans."
      : "",
  ].filter(Boolean);

  return items.length ? items : ["Continue monthly review of profitability, liquidity, and operating trend indicators."];
}

function evaluateFormula(formula: string, cellMap: Record<string, unknown>): number {
  let expression = formula.replace(/^=/, "");

  expression = expression.replace(/[A-Z]+[0-9]+/g, (cellRef) => {
    const rawValue = cellMap[cellRef];

    if (typeof rawValue === "string" && rawValue.startsWith("=")) {
      return String(evaluateFormula(rawValue, cellMap));
    }

    return String(parseNumber(rawValue) || 0);
  });

  if (!/^[0-9+\-*/().\s]+$/.test(expression)) return parseNumber(formula) || 0;

  try {
    return Function(`"use strict"; return (${expression})`)();
  } catch {
    return parseNumber(formula) || 0;
  }
}

function extractRowsFromWorksheet(sheet: XLSX.WorkSheet): unknown[][] {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:B1");
  const cellMap: Record<string, unknown> = {};

  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[address];

      if (!cell) continue;

      cellMap[address] = cell.f ? `=${cell.f}` : cell.v;
    }
  }

  const rows: unknown[][] = [];

  for (let row = range.s.r; row <= range.e.r; row++) {
    const currentRow: unknown[] = [];

    for (let col = range.s.c; col <= range.e.c; col++) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const rawValue = cellMap[address];

      if (typeof rawValue === "string" && rawValue.startsWith("=")) {
        currentRow.push(evaluateFormula(rawValue, cellMap));
      } else {
        currentRow.push(rawValue || "");
      }
    }

    rows.push(currentRow);
  }

  return rows;
}

function normalizeHeader(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function findHeaderIndex(row: unknown[], patterns: string[]) {
  return row.findIndex((cell) => {
    const text = normalizeHeader(cell);
    return patterns.some((pattern) => text.includes(pattern));
  });
}

function findHeaderIndexes(row: unknown[], patterns: string[]) {
  return row
    .map((cell, index) => {
      const text = normalizeHeader(cell);
      return patterns.some((pattern) => text.includes(pattern)) ? index : -1;
    })
    .filter((index) => index >= 0);
}

function findExactHeaderIndex(row: unknown[], labels: string[]) {
  const normalizedLabels = labels.map((label) => normalizeHeader(label));
  return row.findIndex((cell) => normalizedLabels.includes(normalizeHeader(cell)));
}

function findAccountNameHeaderIndex(headers: unknown[]) {
  const explicitAccountNameIndex = findHeaderIndex(headers, ["account name"]);
  if (explicitAccountNameIndex >= 0) return explicitAccountNameIndex;

  return headers.findIndex((header) => {
    const normalized = normalizeHeader(header);
    return normalized === "account" || normalized === "account title";
  });
}

function sumColumn(rows: unknown[][], columnIndex: number) {
  if (columnIndex < 0) return 0;
  return rows.reduce((total, row) => total + (parseNumber(row[columnIndex]) || 0), 0);
}

function calculateBudgetMetrics(data: ParsedFile | null): BudgetMetrics {
  const emptyMetrics = {
    revenueActual: null,
    revenueBudget: null,
    revenueVariance: null,
    netIncomeActual: null,
    netIncomeBudget: null,
    netIncomeVariance: null,
    largestUnfavorableVarianceLabel: "N/A",
    largestUnfavorableVariance: null,
  };
  if (!data) return emptyMetrics;

  const headerIndex = data.rows.findIndex((row) =>
    row.some((cell) => {
      const text = normalizeHeader(cell);
      return text.includes("actual") || text.includes("budget") || text.includes("variance");
    }),
  );
  const headers = data.rows[headerIndex] || [];
  const dataRows = headerIndex >= 0 ? data.rows.slice(headerIndex + 1) : data.rows;
  const actualIndex = findHeaderIndex(headers, ["actual"]);
  const budgetIndex = findHeaderIndex(headers, ["budget"]);
  const varianceIndex = findHeaderIndex(headers, ["variance", "over/(under)", "over/under"]);
  const getBudgetRow = (labels: string[]) => {
    const normalizedLabels = labels.map((label) => normalizeStatementLabel(label));
    return dataRows.find((row) => normalizedLabels.includes(normalizeStatementLabel(String(row[0] || ""))));
  };
  const revenueRow = getBudgetRow(["Total Income", "Total Revenue", "Income", "Revenue", "Sales"]);
  const netIncomeRow = getBudgetRow(["Net Income", "Net Ordinary Income", "Net Profit"]);
  const getActual = (row: unknown[] | undefined) =>
    row ? parseNumber(row[actualIndex]) ?? getLastNumericValue(row) : null;
  const getBudget = (row: unknown[] | undefined) =>
    row ? parseNumber(row[budgetIndex]) ?? null : null;
  const getVariance = (row: unknown[] | undefined) => {
    if (!row) return null;
    const explicitVariance = parseNumber(row[varianceIndex]);
    if (explicitVariance !== null) return explicitVariance;
    const actual = getActual(row);
    const budget = getBudget(row);
    return actual !== null && budget !== null ? actual - budget : null;
  };
  const unfavorableRows = dataRows
    .map((row) => ({
      label: String(row[0] || "").trim(),
      variance: getVariance(row),
    }))
    .filter((row) => row.label && row.variance !== null && row.variance < 0)
    .sort((a, b) => (a.variance || 0) - (b.variance || 0));
  const largestUnfavorable = unfavorableRows[0];

  return {
    revenueActual: getActual(revenueRow),
    revenueBudget: getBudget(revenueRow),
    revenueVariance: getVariance(revenueRow),
    netIncomeActual: getActual(netIncomeRow),
    netIncomeBudget: getBudget(netIncomeRow),
    netIncomeVariance: getVariance(netIncomeRow),
    largestUnfavorableVarianceLabel: largestUnfavorable?.label || "N/A",
    largestUnfavorableVariance: largestUnfavorable?.variance ?? null,
  };
}

function calculateDebtMetrics(data: ParsedFile | null, kpis: KPIs, bsRows: StatementRow[] = []): DebtMetrics {
  const balanceSheetDebt = getDebtLikeBalance(bsRows);
  const totalLiabilities = kpis.totalLiabilities || getTotalLiabilities(bsRows);
  const fallbackDebt = balanceSheetDebt || totalLiabilities;
  const fallbackCurrentPortion = getCurrentLiabilityTotal(bsRows);
  const fallbackLongTermPortion = Math.max(fallbackDebt - fallbackCurrentPortion, 0);

  if (!data) {
    return {
      totalDebt: fallbackDebt,
      currentPortion: fallbackCurrentPortion,
      longTermPortion: fallbackLongTermPortion,
      debtToAssets: kpis.totalAssets && fallbackDebt ? (fallbackDebt / kpis.totalAssets) * 100 : null,
      debtToEquity: kpis.totalEquity && fallbackDebt ? (fallbackDebt / kpis.totalEquity) * 100 : null,
    };
  }

  const headerIndex = data.rows.findIndex((row) =>
    row.some((cell) => {
      const text = normalizeHeader(cell);
      return text.includes("current portion") || text.includes("long-term") || text.includes("loan") || text.includes("balance");
    }),
  );
  const headers = data.rows[headerIndex] || [];
  const dataRows = headerIndex >= 0 ? data.rows.slice(headerIndex + 1) : data.rows;
  const currentPortionIndex = findHeaderIndex(headers, ["current portion", "current debt", "short-term"]);
  const longTermPortionIndex = findHeaderIndex(headers, ["long-term portion", "long term portion", "long-term", "long term"]);
  const balanceIndex = findHeaderIndex(headers, ["balance", "principal", "loan amount", "amount"]);
  const currentPortion = sumColumn(dataRows, currentPortionIndex);
  const longTermPortion = sumColumn(dataRows, longTermPortionIndex);
  const scheduledDebt = currentPortion + longTermPortion || sumColumn(dataRows, balanceIndex);
  const totalDebt = scheduledDebt || fallbackDebt;

  return {
    totalDebt,
    currentPortion: currentPortion || fallbackCurrentPortion,
    longTermPortion: longTermPortion || fallbackLongTermPortion,
    debtToAssets: kpis.totalAssets ? (totalDebt / kpis.totalAssets) * 100 : null,
    debtToEquity: kpis.totalEquity ? (totalDebt / kpis.totalEquity) * 100 : null,
  };
}

function calculateAgingKpis(data: ParsedFile | null): AgingKpis {
  if (!data) {
    return {
      total: 0,
      current: 0,
      days1To30: 0,
      days31To60: 0,
      days61To90: 0,
      days90Plus: 0,
    };
  }

  const headerIndex = data.rows.findIndex((row) =>
    row.some((cell) => normalizeHeader(cell).includes("current")),
  );
  const headers = data.rows[headerIndex] || [];
  const dataRows = headerIndex >= 0 ? data.rows.slice(headerIndex + 1) : data.rows;
  const totalRow = dataRows.find((row) => normalizeHeader(row[0]) === "total");

  const currentIndex = findHeaderIndex(headers, ["current"]);
  const days1To30Index = findHeaderIndex(headers, ["1 - 30", "1-30"]);
  const days31To60Index = findHeaderIndex(headers, ["31 - 60", "31-60"]);
  const days61To90Index = findHeaderIndex(headers, ["61 - 90", "61-90"]);
  const days90PlusIndex = findHeaderIndex(headers, ["91 and over", "90+", ">90"]);
  const totalIndex = findHeaderIndex(headers, ["total"]);

  const valueFromTotalRow = (index: number) =>
    totalRow && index >= 0 ? parseNumber(totalRow[index]) || 0 : sumColumn(dataRows, index);

  const current = valueFromTotalRow(currentIndex);
  const days1To30 = valueFromTotalRow(days1To30Index);
  const days31To60 = valueFromTotalRow(days31To60Index);
  const days61To90 = valueFromTotalRow(days61To90Index);
  const days90Plus = valueFromTotalRow(days90PlusIndex);
  const total =
    valueFromTotalRow(totalIndex) || current + days1To30 + days31To60 + days61To90 + days90Plus;

  return { total, current, days1To30, days31To60, days61To90, days90Plus };
}

function calculateAPKpis(apData: ParsedFile | null): APKpis {
  return calculateAgingKpis(apData);
}

function calculateInventoryKpis(inventoryData: ParsedFile | null): InventoryKpis {
  if (!inventoryData) {
    return {
      totalValue: 0,
      totalQuantity: 0,
      topByValue: [],
      topByQuantity: [],
    };
  }

  const headerIndex = inventoryData.rows.findIndex((row) =>
    row.some((cell) => {
      const text = normalizeHeader(cell);
      return text.includes("qty") || text.includes("quantity") || text.includes("on hand");
    }),
  );

  const headers = inventoryData.rows[headerIndex] || [];
  const dataRows = headerIndex >= 0 ? inventoryData.rows.slice(headerIndex + 1) : inventoryData.rows;

  const nameIndex = findHeaderIndex(headers, ["item", "product", "name"]);
  const quantityIndex = findHeaderIndex(headers, ["qty", "quantity", "on hand"]);
  const valueIndex = findHeaderIndex(headers, [
    "asset value",
    "inventory value",
    "total value",
    "value",
  ]);

  const items = dataRows
    .map((row) => ({
      name: String(row[nameIndex >= 0 ? nameIndex : 0] || "").trim(),
      quantity: parseNumber(row[quantityIndex]) || 0,
      value: parseNumber(row[valueIndex]) || 0,
    }))
    .filter((item) => item.name && item.name.toLowerCase() !== "total");

  return {
    totalValue: items.reduce((total, item) => total + item.value, 0),
    totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
    topByValue: [...items].sort((a, b) => b.value - a.value).slice(0, 5),
    topByQuantity: [...items].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
  };
}

function sumRowColumns(row: unknown[], indexes: number[]) {
  return indexes.reduce((total, index) => total + (parseNumber(row[index]) || 0), 0);
}

function findPayrollHeaderIndex(data: ParsedFile | null) {
  if (!data) return -1;

  return data.rows.findIndex((row) => {
    const hasDepartment = findHeaderIndex(row, ["department", "class", "location", "cost center", "division"]) >= 0;
    const hasPayrollMetric =
      findHeaderIndex(row, ["hours", "gross pay", "gross wages", "payroll cost", "total cost"]) >= 0;

    return hasDepartment && hasPayrollMetric;
  });
}

function getPayrollDepartmentTotals(data: ParsedFile | null) {
  if (!data) return new Map<string, { hours: number; wages: number; taxes: number; benefits: number; cost: number }>();

  const headerIndex = findPayrollHeaderIndex(data);
  const headers = data.rows[headerIndex] || [];
  const dataRows = headerIndex >= 0 ? data.rows.slice(headerIndex + 1) : data.rows;
  const departmentIndex = findHeaderIndex(headers, ["department", "class", "location", "cost center", "division"]);
  const hoursIndexes = findHeaderIndexes(headers, [
    "hours",
    "total hours",
    "regular hours",
    "overtime hours",
    "paid hours",
  ]);
  const wageIndexes = findHeaderIndexes(headers, [
    "gross pay",
    "gross wages",
    "payroll wages",
    "wages",
    "total wages",
  ]);
  const taxIndexes = findHeaderIndexes(headers, [
    "employer payroll taxes",
    "payroll taxes",
    "employer taxes",
    "fica",
    "medicare",
    "futa",
    "suta",
  ]);
  const benefitIndexes = findHeaderIndexes(headers, [
    "benefits",
    "employer benefits",
    "health insurance",
    "retirement match",
  ]);
  const totalCostIndexes = findHeaderIndexes(headers, ["total payroll cost", "total cost", "payroll cost"]);
  const totals = new Map<string, { hours: number; wages: number; taxes: number; benefits: number; cost: number }>();

  dataRows.forEach((row) => {
    const department = String(row[departmentIndex >= 0 ? departmentIndex : 0] || "").trim();
    const normalizedDepartment = normalizeHeader(department);
    if (!department || normalizedDepartment === "total" || normalizedDepartment.startsWith("total ")) return;

    const hours = sumRowColumns(row, hoursIndexes);
    const wages = sumRowColumns(row, wageIndexes);
    const taxes = sumRowColumns(row, taxIndexes);
    const benefits = sumRowColumns(row, benefitIndexes);
    const providedCost = sumRowColumns(row, totalCostIndexes);
    const cost = providedCost || wages + taxes + benefits;

    if (!hours && !wages && !taxes && !benefits && !cost) return;

    const current = totals.get(department) || { hours: 0, wages: 0, taxes: 0, benefits: 0, cost: 0 };
    totals.set(department, {
      hours: current.hours + hours,
      wages: current.wages + wages,
      taxes: current.taxes + taxes,
      benefits: current.benefits + benefits,
      cost: current.cost + cost,
    });
  });

  return totals;
}

function buildPayrollCommentary(rows: PayrollDepartmentRow[], analysis: Omit<PayrollAnalysis, "commentary">) {
  if (!rows.length) return [];

  const commentary: string[] = [];
  const totalDirection = analysis.totalPayrollCostChange >= 0 ? "increased" : "decreased";
  commentary.push(
    `Total FTE moved from ${formatFte(analysis.totalPriorFte)} to ${formatFte(
      analysis.totalCurrentFte,
    )}, a change of ${formatFte(analysis.totalFteChange)} FTE month-over-month.`,
  );
  commentary.push(
    `Total payroll cost ${totalDirection} by ${formatCurrency(Math.abs(analysis.totalPayrollCostChange))} compared with the prior month.`,
  );

  rows
    .filter((row) => Math.abs(row.fteChange) >= 0.01 || Math.abs(row.payrollCostChange) > 0)
    .sort((a, b) => Math.abs(b.fteChange) - Math.abs(a.fteChange))
    .slice(0, 3)
    .forEach((row) => {
      const fteDirection = row.fteChange > 0 ? "increased" : row.fteChange < 0 ? "decreased" : "remained stable";
      const costDirection =
        row.payrollCostChange > 0 ? "higher payroll cost" : row.payrollCostChange < 0 ? "lower payroll cost" : "stable payroll cost";
      commentary.push(
        `${row.department} ${fteDirection} by ${formatFte(
          Math.abs(row.fteChange),
        )} FTE month-over-month, with ${costDirection} of ${formatCurrency(Math.abs(row.payrollCostChange))}.`,
      );
    });

  commentary.push("Payroll cost per FTE should be monitored against revenue and gross margin trends.");
  return commentary;
}

function calculatePayrollAnalysis(
  currentPayrollData: ParsedFile | null,
  priorPayrollData: ParsedFile | null,
  fteDivisor: number,
): PayrollAnalysis {
  const divisor = fteDivisor > 0 ? fteDivisor : 173.33;
  const currentTotals = getPayrollDepartmentTotals(currentPayrollData);
  const priorTotals = getPayrollDepartmentTotals(priorPayrollData);
  const departments = new Set([...currentTotals.keys(), ...priorTotals.keys()]);
  const rows = [...departments]
    .map((department) => {
      const current = currentTotals.get(department) || { hours: 0, wages: 0, taxes: 0, benefits: 0, cost: 0 };
      const prior = priorTotals.get(department) || { hours: 0, wages: 0, taxes: 0, benefits: 0, cost: 0 };
      const currentFte = current.hours / divisor;
      const priorFte = prior.hours / divisor;

      return {
        department,
        currentHours: current.hours,
        currentFte,
        priorHours: prior.hours,
        priorFte,
        fteChange: currentFte - priorFte,
        currentGrossWages: current.wages,
        priorGrossWages: prior.wages,
        wageChange: current.wages - prior.wages,
        currentPayrollTaxes: current.taxes,
        priorPayrollTaxes: prior.taxes,
        payrollTaxChange: current.taxes - prior.taxes,
        currentPayrollCost: current.cost,
        priorPayrollCost: prior.cost,
        payrollCostChange: current.cost - prior.cost,
        payrollCostPerFte: currentFte ? current.cost / currentFte : 0,
      };
    })
    .sort((a, b) => Math.abs(b.payrollCostChange) - Math.abs(a.payrollCostChange));

  const totalCurrentFte = rows.reduce((total, row) => total + row.currentFte, 0);
  const totalPriorFte = rows.reduce((total, row) => total + row.priorFte, 0);
  const totalCurrentPayrollCost = rows.reduce((total, row) => total + row.currentPayrollCost, 0);
  const totalPriorPayrollCost = rows.reduce((total, row) => total + row.priorPayrollCost, 0);
  const highestFteIncreaseDepartment =
    [...rows].sort((a, b) => b.fteChange - a.fteChange)[0]?.department || "N/A";
  const highestPayrollCostIncreaseDepartment =
    [...rows].sort((a, b) => b.payrollCostChange - a.payrollCostChange)[0]?.department || "N/A";
  const analysis = {
    rows,
    totalCurrentFte,
    totalPriorFte,
    totalFteChange: totalCurrentFte - totalPriorFte,
    totalCurrentPayrollCost,
    totalPriorPayrollCost,
    totalPayrollCostChange: totalCurrentPayrollCost - totalPriorPayrollCost,
    highestFteIncreaseDepartment,
    highestPayrollCostIncreaseDepartment,
  };

  return { ...analysis, commentary: buildPayrollCommentary(rows, analysis) };
}

function buildBoardPackageSections({
  packageTier,
  reports,
  hasExecutiveSummary,
  hasFinancialSnapshot,
  hasRatios,
  hasFollowUps,
  hasAnyFlux,
}: {
  packageTier: PackageTier;
  reports: UploadReport[];
  hasExecutiveSummary: boolean;
  hasFinancialSnapshot: boolean;
  hasRatios: boolean;
  hasFollowUps: boolean;
  hasAnyFlux: boolean;
}) {
  const reportMap = new Map(reports.map((report) => [report.id, report]));
  const statusFromReports = (ids: string[], minimumTier: PackageTier = "essential"): BoardPackageSection["status"] => {
    if (!isReportAvailable(minimumTier, packageTier)) return "Locked";
    const matchingReports = ids.map((id) => reportMap.get(id)).filter(Boolean) as UploadReport[];
    if (matchingReports.some((report) => report.omitted)) return "Omitted";
    if (matchingReports.some((report) => report.data)) return "Included";
    return "Missing";
  };
  const statusFromFlag = (flag: boolean, minimumTier: PackageTier = "essential"): BoardPackageSection["status"] => {
    if (!isReportAvailable(minimumTier, packageTier)) return "Locked";
    return flag ? "Included" : "Missing";
  };

  return [
    { page: 1, title: "Executive Summary", status: statusFromFlag(hasExecutiveSummary), note: "CFO narrative package overview" },
    { page: 2, title: "Financial Performance Snapshot", status: statusFromFlag(hasFinancialSnapshot), note: "Core KPI cards and charts" },
    { page: 3, title: "Income Statement", status: statusFromReports(["pl"]), note: "Profit and Loss detail" },
    { page: 4, title: "Balance Sheet", status: statusFromReports(["bs"]), note: "Assets, liabilities, and equity" },
    { page: 5, title: "AR and AP Aging", status: statusFromReports(["ar", "ap"]), note: "Receivables and payables aging" },
    { page: 6, title: "Inventory Summary", status: statusFromReports(["inventory"], "professional"), note: "Inventory value and concentration" },
    { page: 7, title: "Fixed Asset Analysis", status: statusFromReports(["fixed-assets"], "virtualCfo"), note: "Capital assets, depreciation, and NBV" },
    { page: 8, title: "Payroll and FTE Analysis", status: statusFromReports(["current-payroll", "prior-payroll"], "virtualCfo"), note: "Payroll cost and staffing trends" },
    { page: 9, title: "Ratio Analysis", status: statusFromFlag(hasRatios, "professional"), note: "Financial and payroll ratios" },
    { page: 10, title: "Budget vs Actual", status: statusFromReports(["budget"], "virtualCfo"), note: "Budget performance and unfavorable variances" },
    { page: 11, title: "Debt Schedule / Loan Detail", status: statusFromReports(["debt"], "virtualCfo"), note: "Debt obligations and leverage" },
    { page: 12, title: "Flux Analysis Executive Summary", status: statusFromFlag(hasAnyFlux, "virtualCfo"), note: "Highest variance summary" },
    { page: 13, title: "Month-over-Month Flux Analysis", status: statusFromReports(["current-month-gl", "prior-month-gl"], "virtualCfo"), note: "Monthly GL variance detail" },
    { page: 14, title: "Quarter-over-Quarter Flux Analysis", status: statusFromReports(["current-quarter-gl", "prior-quarter-gl"], "virtualCfo"), note: "Quarterly GL variance detail" },
    { page: 15, title: "Year-over-Year Flux Analysis", status: statusFromReports(["current-year-gl", "prior-year-gl"], "virtualCfo"), note: "Annual GL variance detail" },
    { page: 16, title: "Recommended Follow-Up Items", status: statusFromFlag(hasFollowUps), note: "Management action items" },
  ];
}

function createPowerPointSlidesData({
  companyName,
  reportPeriod,
  preparedBy,
  kpis,
  executiveSummary,
  arKpis,
  apKpis,
  inventoryKpis,
  fixedAssetKpis,
  payrollAnalysis,
  ratioRows,
  topRevenueRows,
  topExpenseRows,
  budgetMetrics,
  debtMetrics,
  monthFluxRows,
  quarterFluxRows,
  yearFluxRows,
  includeInventory,
  includePayroll,
  includeFixedAssets,
}: {
  companyName: string;
  reportPeriod: string;
  preparedBy: string;
  kpis: KPIs;
  executiveSummary: ReturnType<typeof buildExecutiveSummary>;
  arKpis: AgingKpis;
  apKpis: APKpis;
  inventoryKpis: InventoryKpis;
  fixedAssetKpis: FixedAssetKpis;
  payrollAnalysis: PayrollAnalysis;
  ratioRows: Array<{ name: string; formula: string; value: string; interpretation: string }>;
  topRevenueRows: StatementRow[];
  topExpenseRows: StatementRow[];
  budgetMetrics: BudgetMetrics;
  debtMetrics: DebtMetrics;
  monthFluxRows: FluxRow[];
  quarterFluxRows: FluxRow[];
  yearFluxRows: FluxRow[];
  includeInventory: boolean;
  includePayroll: boolean;
  includeFixedAssets: boolean;
}): PowerPointSlideData[] {
  const statementChartData = (rows: StatementRow[]) =>
    rows.slice(0, 6).map((row) => ({ name: row.label, value: row.amount || 0 }));
  const fluxSlide = (
    sectionType: Extract<PackageSectionId, "month-flux" | "quarter-flux" | "year-flux">,
    title: string,
    subtitle: string,
    rows: FluxRow[],
  ): PowerPointSlideData => {
    const topRows = [...rows].sort((a, b) => Math.abs(b.dollarVariance) - Math.abs(a.dollarVariance)).slice(0, 6);
    return {
      title,
      subtitle,
      bullets: topRows.length
        ? topRows.map((row) => `${row.accountName}: ${formatCurrency(row.dollarVariance)} variance (${row.severity})`)
        : ["No flagged variance rows met the selected thresholds."],
      chartData: topRows.map((row) => ({ name: row.accountName, value: row.dollarVariance })),
      sectionType,
    };
  };
  const allFluxRows = [...monthFluxRows, ...quarterFluxRows, ...yearFluxRows]
    .sort((a, b) => Math.abs(b.dollarVariance) - Math.abs(a.dollarVariance))
    .slice(0, 5);
  const slides: PowerPointSlideData[] = [
    {
      title: companyName,
      subtitle: `${reportPeriod} Board / Owner Presentation`,
      bullets: [`Prepared by ${preparedBy || "FinSight Reports"}`, "Generated from the approved PDF package selections."],
      chartData: [],
      sectionType: "title",
    },
    {
      title: "Executive Summary",
      subtitle: "CFO-level package overview",
      bullets: executiveSummary.sections.slice(0, 4).map((section) => `${section.title}: ${section.body}`),
      chartData: [],
      sectionType: "executive-summary",
    },
    {
      title: "KPI Snapshot",
      subtitle: "Core financial metrics",
      bullets: [
        `Revenue: ${formatCurrency(kpis.revenue)}`,
        `Gross Profit: ${formatCurrency(kpis.grossProfit)}`,
        `Net Income: ${formatCurrency(kpis.netIncome)}`,
        `Cash: ${formatCurrency(kpis.cash)}`,
      ],
      chartData: [
        { name: "Revenue", value: kpis.revenue },
        { name: "Gross Profit", value: kpis.grossProfit },
        { name: "Net Income", value: kpis.netIncome },
      ],
      sectionType: "kpi-snapshot",
    },
    {
      title: "Income Statement",
      subtitle: "Revenue, cost, expense, and earnings profile",
      bullets: [
        `Revenue: ${formatCurrency(kpis.revenue)}`,
        `COGS: ${formatCurrency(kpis.cogs)}`,
        `Operating Expenses: ${formatCurrency(kpis.expenses)}`,
        `Net Income: ${formatCurrency(kpis.netIncome)}`,
      ],
      chartData: [
        { name: "Revenue", value: kpis.revenue },
        { name: "COGS", value: kpis.cogs },
        { name: "Expenses", value: kpis.expenses },
        { name: "Net Income", value: kpis.netIncome },
      ],
      sectionType: "income-statement",
    },
    {
      title: "Balance Sheet",
      subtitle: "Capital structure and balance sheet position",
      bullets: [
        `Cash: ${formatCurrency(kpis.cash)}`,
        `Accounts Receivable: ${formatCurrency(kpis.accountsReceivable)}`,
        `Total Assets: ${formatCurrency(kpis.totalAssets)}`,
        `Total Liabilities: ${formatCurrency(kpis.totalLiabilities)}`,
        `Total Equity: ${formatCurrency(kpis.totalEquity)}`,
      ],
      chartData: [
        { name: "Cash", value: kpis.cash },
        { name: "AR", value: kpis.accountsReceivable },
        { name: "Assets", value: kpis.totalAssets },
        { name: "Liabilities", value: kpis.totalLiabilities },
        { name: "Equity", value: kpis.totalEquity },
      ],
      sectionType: "balance-sheet",
    },
    {
      title: "AR Aging",
      subtitle: "Receivables risk and collection focus",
      bullets: [
        `AR Aging Total: ${formatCurrency(arKpis.total)}`,
        `Current: ${formatCurrency(arKpis.current)}`,
        `61-90 Days: ${formatCurrency(arKpis.days61To90)}`,
        `90+ Days: ${formatCurrency(arKpis.days90Plus)}`,
      ],
      chartData: [
        { name: "Current", value: arKpis.current },
        { name: "1-30", value: arKpis.days1To30 },
        { name: "31-60", value: arKpis.days31To60 },
        { name: "61-90", value: arKpis.days61To90 },
        { name: "90+", value: arKpis.days90Plus },
      ],
      sectionType: "ar-aging",
    },
    {
      title: "AP Aging",
      subtitle: "Payables mix and vendor cash requirements",
      bullets: [
        `AP Aging Total: ${formatCurrency(apKpis.total)}`,
        `Current: ${formatCurrency(apKpis.current)}`,
        `61-90 Days: ${formatCurrency(apKpis.days61To90)}`,
        `90+ Days: ${formatCurrency(apKpis.days90Plus)}`,
      ],
      chartData: [
        { name: "Current", value: apKpis.current },
        { name: "1-30", value: apKpis.days1To30 },
        { name: "31-60", value: apKpis.days31To60 },
        { name: "61-90", value: apKpis.days61To90 },
        { name: "90+", value: apKpis.days90Plus },
      ],
      sectionType: "ap-aging",
    },
    {
      title: "Customer Sales Analysis",
      subtitle: "Top revenue sources from the selected PDF package",
      bullets: topRevenueRows.length
        ? topRevenueRows.map((row) => `${row.label}: ${formatCurrency(row.amount)}`)
        : ["Customer sales detail was not available. Showing top revenue lines from the income statement where possible."],
      chartData: statementChartData(topRevenueRows),
      sectionType: "customer-sales",
    },
    {
      title: "Vendor Expense Analysis",
      subtitle: "Top expense categories from the selected PDF package",
      bullets: topExpenseRows.length
        ? topExpenseRows.map((row) => `${row.label}: ${formatCurrency(row.amount)}`)
        : ["Vendor expense detail was not available. Showing top operating expense lines from the income statement where possible."],
      chartData: statementChartData(topExpenseRows),
      sectionType: "vendor-expenses",
    },
    ...(includeInventory
      ? [
          {
            title: "Inventory Summary",
            subtitle: "Top inventory items by value",
            bullets: [`Inventory Value: ${formatCurrency(inventoryKpis.totalValue)}`],
            chartData: inventoryKpis.topByValue.map((item) => ({ name: item.name, value: item.value })),
            sectionType: "inventory-summary" as const,
          },
        ]
      : []),
    ...(hasBudgetComparisonData(budgetMetrics)
      ? [
          {
            title: "Budget vs Actual",
            subtitle: "Budget performance and unfavorable variance focus",
            bullets: [
              `Revenue Actual: ${formatOptionalCurrency(budgetMetrics.revenueActual)}`,
              `Revenue Budget: ${formatOptionalCurrency(budgetMetrics.revenueBudget)}`,
              `Revenue Variance: ${formatOptionalCurrency(budgetMetrics.revenueVariance)}`,
              `Net Income Variance: ${formatOptionalCurrency(budgetMetrics.netIncomeVariance)}`,
              `Largest Unfavorable Variance: ${budgetMetrics.largestUnfavorableVarianceLabel}`,
            ],
            chartData: [
              { name: "Revenue Actual", value: budgetMetrics.revenueActual || 0 },
              { name: "Revenue Budget", value: budgetMetrics.revenueBudget || 0 },
              { name: "Net Income Actual", value: budgetMetrics.netIncomeActual || 0 },
              { name: "Net Income Budget", value: budgetMetrics.netIncomeBudget || 0 },
            ],
            sectionType: "budget-vs-actual" as const,
          },
        ]
      : []),
    ...(includePayroll
      ? [
          {
            title: "Payroll and FTE Analysis",
            subtitle: "Department staffing and payroll cost",
            bullets: payrollAnalysis.commentary,
            chartData: payrollAnalysis.rows.map((row) => ({
              name: row.department,
              value: row.currentPayrollCost,
              currentFte: row.currentFte,
              priorFte: row.priorFte,
              payrollCost: row.currentPayrollCost,
            })),
            sectionType: "payroll-fte" as const,
          },
        ]
      : []),
    ...(includeFixedAssets
      ? [
          {
            title: "Fixed Asset Analysis",
            subtitle: "Capital asset breakdown",
            bullets: [`Net Book Value: ${formatCurrency(fixedAssetKpis.netBookValue)}`],
            chartData: [
              { name: "Fixed Assets", value: fixedAssetKpis.totalFixedAssets },
              { name: "Accumulated Depreciation", value: Math.abs(fixedAssetKpis.accumulatedDepreciation) },
              { name: "Net Book Value", value: fixedAssetKpis.netBookValue },
            ],
            sectionType: "fixed-asset-analysis" as const,
          },
        ]
      : []),
    {
      title: "Debt Schedule",
      subtitle: "Debt exposure and leverage ratios",
      bullets: [
        `Total Debt: ${formatCurrency(debtMetrics.totalDebt)}`,
        `Current Portion: ${formatCurrency(debtMetrics.currentPortion)}`,
        `Long-Term Portion: ${formatCurrency(debtMetrics.longTermPortion)}`,
        `Debt to Assets: ${formatPercent(debtMetrics.debtToAssets)}`,
        `Debt to Equity: ${formatPercent(debtMetrics.debtToEquity)}`,
      ],
      chartData: [
        { name: "Current Debt", value: debtMetrics.currentPortion },
        { name: "Long-Term Debt", value: debtMetrics.longTermPortion },
      ],
      sectionType: "debt-schedule",
    },
    {
      title: "Ratio Analysis",
      subtitle: "Financial ratio highlights",
      bullets: ratioRows.slice(0, 9).map((row) => `${row.name}|${row.value}|${row.interpretation}`),
      chartData: [],
      sectionType: "ratio-analysis",
    },
    {
      title: "Flux Analysis Highlights",
      subtitle: "Largest flagged variances",
      bullets: allFluxRows.map((row) => `${row.accountName}: ${formatCurrency(row.dollarVariance)}`),
      chartData: allFluxRows.map((row) => ({ name: row.accountName, value: row.dollarVariance })),
      sectionType: "flux-summary",
    },
    fluxSlide("month-flux", "Month-over-Month Flux", "Largest month-over-month account movements", monthFluxRows),
    fluxSlide("quarter-flux", "Quarter-over-Quarter Flux", "Largest quarter-over-quarter account movements", quarterFluxRows),
    fluxSlide("year-flux", "Year-over-Year Flux", "Largest year-over-year account movements", yearFluxRows),
    {
      title: "Recommended Follow-Up Items",
      subtitle: "Management action items",
      bullets: executiveSummary.followUpItems,
      chartData: [],
      sectionType: "recommended-follow-up",
    },
  ];

  return slides;
}

function calculateFixedAssetKpis(
  fixedAssetData: ParsedFile | null,
  totalAssets: number,
  plData: ParsedFile | null,
): FixedAssetKpis {
  const depreciationExpenseFromPl = findStatementMatch(plData, [
    "Depreciation Expense",
    "Depreciation",
    "Amortization Expense",
    "Depreciation & Amortization",
    "Depreciation and Amortization",
  ]);
  const emptyKpis = {
    totalFixedAssets: 0,
    accumulatedDepreciation: 0,
    netBookValue: 0,
    depreciationExpense: depreciationExpenseFromPl?.amount ?? null,
    fixedAssetsToTotalAssets: 0,
    depreciationToFixedAssets: 0,
    netBookValueToTotalAssets: 0,
    matches: [] as FixedAssetMatch[],
  };

  if (!fixedAssetData) return emptyKpis;

  const headerIndex = fixedAssetData.rows.findIndex((row) => {
    const hasAssetColumn = findExactHeaderIndex(row, ["Asset", "Asset Name", "Description"]) >= 0;
    const hasValueColumn =
      findExactHeaderIndex(row, ["Original Cost", "Cost", "Net Book Value", "Book Value"]) >= 0;

    return hasAssetColumn && hasValueColumn;
  });

  if (headerIndex >= 0) {
    const headers = fixedAssetData.rows[headerIndex] || [];
    const dataRows = fixedAssetData.rows.slice(headerIndex + 1);
    const originalCostIndex = findExactHeaderIndex(headers, ["Original Cost", "Cost"]);
    const accumulatedDepreciationIndex = findExactHeaderIndex(headers, [
      "Accumulated Depreciation",
    ]);
    const depreciationExpenseIndex = findExactHeaderIndex(headers, [
      "Depreciation Expense",
      "Depreciation",
    ]);
    const netBookValueIndex = findExactHeaderIndex(headers, ["Net Book Value", "Book Value"]);

    if (
      originalCostIndex >= 0 ||
      accumulatedDepreciationIndex >= 0 ||
      depreciationExpenseIndex >= 0 ||
      netBookValueIndex >= 0
    ) {
      const totalFixedAssets = sumColumn(dataRows, originalCostIndex);
      const accumulatedDepreciation = sumColumn(dataRows, accumulatedDepreciationIndex);
      const depreciationExpenseFromFixedAssetDetail =
        depreciationExpenseIndex >= 0 ? sumColumn(dataRows, depreciationExpenseIndex) : null;
      const depreciationExpense =
        depreciationExpenseFromPl?.amount ?? depreciationExpenseFromFixedAssetDetail;
      const netBookValue =
        netBookValueIndex >= 0
          ? sumColumn(dataRows, netBookValueIndex)
          : accumulatedDepreciation > 0
            ? totalFixedAssets - accumulatedDepreciation
            : totalFixedAssets + accumulatedDepreciation;
      const matches: FixedAssetMatch[] = [
        {
          metric: "Total Fixed Assets",
          label:
            originalCostIndex >= 0
              ? `Calculated from ${String(headers[originalCostIndex])} column`
              : "Not found",
          value: totalFixedAssets,
        },
        {
          metric: "Accumulated Depreciation",
          label:
            accumulatedDepreciationIndex >= 0
              ? `Calculated from ${String(headers[accumulatedDepreciationIndex])} column`
              : "Not found",
          value: accumulatedDepreciation,
        },
        {
          metric: "Depreciation Expense",
          label: depreciationExpenseFromPl
            ? `Matched P&L row: ${depreciationExpenseFromPl.label}`
            : depreciationExpenseIndex >= 0
              ? `Calculated from ${String(headers[depreciationExpenseIndex])} column`
              : "Depreciation expense not provided in uploaded reports.",
          value: depreciationExpense,
        },
        {
          metric: "Net Book Value",
          label:
            netBookValueIndex >= 0
              ? `Calculated from ${String(headers[netBookValueIndex])} column`
              : "Calculated from Original Cost and Accumulated Depreciation columns",
          value: netBookValue,
        },
      ];

      return {
        totalFixedAssets,
        accumulatedDepreciation,
        netBookValue,
        depreciationExpense,
        fixedAssetsToTotalAssets: totalAssets ? (totalFixedAssets / totalAssets) * 100 : 0,
        depreciationToFixedAssets: totalFixedAssets
          ? (Math.abs(accumulatedDepreciation) / totalFixedAssets) * 100
          : 0,
        netBookValueToTotalAssets: totalAssets ? (netBookValue / totalAssets) * 100 : 0,
        matches,
      };
    }
  }

  const rows = getStatementRows(fixedAssetData);
  const matches: FixedAssetMatch[] = [];

  const findByLabels = (metric: string, labels: string[]) => {
    const found = rows.find((row) =>
      labels.some((label) => normalizeStatementLabel(row.label).includes(label.toLowerCase())),
    );

    const value = found?.amount || 0;
    matches.push({ metric, label: found?.label || "Not found", value });
    return value;
  };

  const assetCategoryTotal = rows
    .filter((row) =>
      [
        "fixed assets",
        "furniture and equipment",
        "machinery and equipment",
        "vehicles",
        "leasehold improvements",
        "original cost",
      ].some((label) => normalizeStatementLabel(row.label).includes(label)),
    )
    .reduce((total, row) => total + (row.amount || 0), 0);

  const totalFixedAssets =
    findByLabels("Total Fixed Assets", ["total fixed assets", "fixed assets", "original cost"]) ||
    assetCategoryTotal;
  const accumulatedDepreciation = findByLabels("Accumulated Depreciation", [
    "accumulated depreciation",
  ]);
  const depreciationExpense = depreciationExpenseFromPl?.amount ?? null;
  matches.push({
    metric: "Depreciation Expense",
    label: depreciationExpenseFromPl
      ? `Matched P&L row: ${depreciationExpenseFromPl.label}`
      : "Depreciation expense not provided in uploaded reports.",
    value: depreciationExpense,
  });
  const netBookValue =
    findByLabels("Net Book Value", ["net book value", "book value"]) ||
    (accumulatedDepreciation > 0
      ? totalFixedAssets - accumulatedDepreciation
      : totalFixedAssets + accumulatedDepreciation);

  return {
    totalFixedAssets,
    accumulatedDepreciation,
    netBookValue,
    depreciationExpense,
    fixedAssetsToTotalAssets: totalAssets ? (totalFixedAssets / totalAssets) * 100 : 0,
    depreciationToFixedAssets: totalFixedAssets
      ? (Math.abs(accumulatedDepreciation) / totalFixedAssets) * 100
      : 0,
    netBookValueToTotalAssets: totalAssets ? (netBookValue / totalAssets) * 100 : 0,
    matches,
  };
}

function getFixedAssetChangeRows(
  current: FixedAssetKpis,
  prior: FixedAssetKpis,
): FixedAssetChangeRow[] {
  const buildRow = (
    metric: string,
    priorValue: number,
    currentValue: number,
    positiveInterpretation: string,
    negativeInterpretation: string,
    flatInterpretation: string,
  ) => {
    const change = currentValue - priorValue;

    return {
      metric,
      current: currentValue,
      prior: priorValue,
      change,
      interpretation:
        change > 0 ? positiveInterpretation : change < 0 ? negativeInterpretation : flatInterpretation,
    };
  };
  const fixedAssetCostChange = current.totalFixedAssets - prior.totalFixedAssets;

  return [
    buildRow(
      "Total fixed asset cost change",
      prior.totalFixedAssets,
      current.totalFixedAssets,
      `Fixed assets increased by ${formatCurrency(fixedAssetCostChange)}, indicating net additions during the period.`,
      `Fixed assets decreased by ${formatCurrency(Math.abs(fixedAssetCostChange))}, indicating possible disposals or reclassification.`,
      "No net fixed asset additions or disposals were identified.",
    ),
    buildRow(
      "Fixed asset additions",
      prior.totalFixedAssets,
      current.totalFixedAssets,
      `Fixed assets increased by ${formatCurrency(fixedAssetCostChange)}, indicating net additions during the period.`,
      `Fixed assets decreased by ${formatCurrency(Math.abs(fixedAssetCostChange))}, indicating possible disposals or reclassification.`,
      "No net additions were identified from the uploaded reports.",
    ),
    buildRow(
      "Fixed asset disposals",
      prior.totalFixedAssets,
      current.totalFixedAssets,
      `Fixed assets increased by ${formatCurrency(fixedAssetCostChange)}, indicating net additions during the period.`,
      `Fixed assets decreased by ${formatCurrency(Math.abs(fixedAssetCostChange))}, indicating possible disposals or reclassification.`,
      "No net disposals were identified from the uploaded reports.",
    ),
    buildRow(
      "Accumulated depreciation change",
      prior.accumulatedDepreciation,
      current.accumulatedDepreciation,
      `Accumulated depreciation increased by ${formatCurrency(
        Math.abs(Math.abs(current.accumulatedDepreciation) - Math.abs(prior.accumulatedDepreciation)),
      )}, meaning the depreciation reserve increased.`,
      `Accumulated depreciation decreased by ${formatCurrency(
        Math.abs(Math.abs(current.accumulatedDepreciation) - Math.abs(prior.accumulatedDepreciation)),
      )}, which may indicate disposals or reclassification.`,
      "Accumulated depreciation was unchanged.",
    ),
    buildRow(
      "Net book value change",
      prior.netBookValue,
      current.netBookValue,
      `Net book value increased by ${formatCurrency(
        current.netBookValue - prior.netBookValue,
      )}, suggesting additions exceeded depreciation and disposals.`,
      `Net book value decreased by ${formatCurrency(
        Math.abs(current.netBookValue - prior.netBookValue),
      )}, suggesting depreciation or disposals exceeded additions.`,
      "Net book value was unchanged.",
    ),
  ];
}

function getStatementRows(data: ParsedFile | null): StatementRow[] {
  if (!data) return [];

  return data.rows
    .map((row) => ({
      label: String(row[0] || "").trim(),
      amount: getLastNumericValue(row),
    }))
    .filter((row) => row.label && row.amount !== null);
}

function findStatementAmount(rows: StatementRow[], labels: string[]) {
  const normalizedLabels = labels.map((label) => normalizeStatementLabel(label));
  return (
    rows.find((row) => normalizedLabels.includes(normalizeStatementLabel(row.label)))?.amount || 0
  );
}

function findStatementMatch(data: ParsedFile | null, labels: string[]) {
  const normalizedLabels = labels.map((label) => normalizeStatementLabel(label));

  for (const row of data?.rows || []) {
    const value = getLastNumericValue(row);

    if (value === null) continue;

    for (const cell of row) {
      const label = normalizeStatementLabel(String(cell || ""));

      if (normalizedLabels.includes(label)) {
        return { label: String(cell || "").trim(), amount: value };
      }
    }
  }

  return null;
}

function getBalanceSheetSection(label: string) {
  const normalized = normalizeStatementLabel(label);

  if (["liabilities & equity", "liabilities and equity"].includes(normalized)) return null;

  if (
    [
      "bank accounts",
      "cash",
      "checking",
      "savings",
      "accounts receivable",
      "total accounts receivable",
      "inventory asset",
      "prepaid insurance",
      "other current assets",
      "total current assets",
      "total bank accounts",
    ].some((pattern) => normalized.includes(pattern))
  ) {
    return "Current Assets";
  }

  if (
    [
      "fixed assets",
      "accumulated depreciation",
      "net book value",
      "net fixed assets",
      "equipment",
      "vehicles",
      "leasehold improvements",
      "machinery",
      "furniture",
    ].some((pattern) => normalized.includes(pattern))
  ) {
    return "Fixed Assets";
  }

  if (
    [
      "accounts payable",
      "credit cards",
      "line of credit",
      "current portion",
      "payroll liabilities",
      "sales tax payable",
      "other current liabilities",
      "total current liabilities",
      "current liability",
      "due within one year",
    ].some((pattern) => normalized.includes(pattern))
  ) {
    return "Current Liabilities";
  }

  if (
    normalized.includes("long-term") ||
    normalized.includes("long term") ||
    normalized.includes("notes payable") ||
    normalized.includes("loan payable")
  ) {
    return "Long-Term Liabilities";
  }

  if (
    normalized === "equity" ||
    normalized.includes("total equity") ||
    normalized.includes("retained earnings") ||
    normalized.includes("owner's equity") ||
    normalized.includes("owners equity")
  ) {
    return "Equity";
  }
  return null;
}

function getCurrentAssetTotal(rows: StatementRow[]) {
  const explicitTotal = findStatementAmount(rows, ["Total Current Assets"]);
  if (explicitTotal) return explicitTotal;

  return rows.reduce((total, row) => {
    const normalized = normalizeStatementLabel(row.label);
    const allowedTotalRows = [
      "total bank accounts",
      "total accounts receivable",
      "total other current assets",
    ];
    if (normalized.startsWith("total") && !allowedTotalRows.includes(normalized)) return total;
    return getBalanceSheetSection(row.label) === "Current Assets" ? total + (row.amount || 0) : total;
  }, 0);
}

function getCurrentLiabilityTotal(rows: StatementRow[]) {
  const explicitTotal = findStatementAmount(rows, ["Total Current Liabilities"]);
  if (explicitTotal) return explicitTotal;

  return rows.reduce((total, row) => {
    const normalized = normalizeStatementLabel(row.label);
    const allowedTotalRows = [
      "total accounts payable",
      "total credit cards",
      "total other current liabilities",
    ];
    if (normalized.startsWith("total") && !allowedTotalRows.includes(normalized)) return total;
    return getBalanceSheetSection(row.label) === "Current Liabilities" ? total + (row.amount || 0) : total;
  }, 0);
}

function getTotalLiabilities(rows: StatementRow[]) {
  const explicitTotal = findStatementAmount(rows, ["Total Liabilities"]);
  if (explicitTotal) return Math.abs(explicitTotal);

  const currentLiabilities = getCurrentLiabilityTotal(rows);
  const longTermLiabilities = rows.reduce((total, row) => {
    const normalized = normalizeStatementLabel(row.label);
    if (normalized.startsWith("total liabilities") || normalized.includes("liabilities and equity")) return total;
    return getBalanceSheetSection(row.label) === "Long-Term Liabilities" ? total + Math.abs(row.amount || 0) : total;
  }, 0);

  return currentLiabilities + longTermLiabilities;
}

function getTotalEquity(rows: StatementRow[]) {
  const explicitTotal = findStatementAmount(rows, ["Total Equity", "Total Stockholders' Equity", "Total Owners Equity"]);
  if (explicitTotal) return Math.abs(explicitTotal);

  return rows.reduce((total, row) => {
    const normalized = normalizeStatementLabel(row.label);
    if (normalized.startsWith("total") && !normalized.includes("total equity")) return total;
    return getBalanceSheetSection(row.label) === "Equity" ? total + Math.abs(row.amount || 0) : total;
  }, 0);
}

function getDebtLikeBalance(rows: StatementRow[]) {
  const debtPatterns = [
    "loan",
    "line of credit",
    "note payable",
    "notes payable",
    "long-term debt",
    "long term debt",
    "current portion",
    "equipment financing",
    "vehicle loan",
    "credit card",
  ];

  return rows.reduce((total, row) => {
    const normalized = normalizeStatementLabel(row.label);
    if (normalized.startsWith("total liabilities") || normalized.includes("liabilities and equity")) return total;
    if (!debtPatterns.some((pattern) => normalized.includes(pattern))) return total;
    return total + Math.abs(row.amount || 0);
  }, 0);
}

function normalizeStatementLabel(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

function getDedupedStatementRows(rows: StatementRow[]) {
  const lastIndexByLabel = new Map<string, number>();

  rows.forEach((row, index) => {
    lastIndexByLabel.set(normalizeStatementLabel(row.label), index);
  });

  return rows.filter((row, index) => lastIndexByLabel.get(normalizeStatementLabel(row.label)) === index);
}

function getStatementRowType(label: string) {
  const normalized = normalizeStatementLabel(label);
  const sectionLabels = [
    "income",
    "cost of goods sold",
    "operating expenses",
    "expenses",
    "assets",
    "liabilities",
    "liabilities & equity",
    "liabilities and equity",
    "equity",
  ];
  const majorTotalLabels = [
    "total income",
    "total cost of goods sold",
    "gross profit",
    "total expenses",
    "net income",
  ];
  const calculatedValueLabels = ["net book value", "net fixed assets"];
  const grandTotalLabels = [
    "total assets",
    "total liabilities",
    "total equity",
    "total liabilities & equity",
    "total liabilities and equity",
  ];

  if (sectionLabels.includes(normalized)) return "section";
  if (calculatedValueLabels.includes(normalized)) return "calculated-value";
  if (grandTotalLabels.includes(normalized)) return "grand-total";
  if (majorTotalLabels.includes(normalized)) return "major-total";
  if (normalized.startsWith("total")) return "subtotal";
  return "detail";
}

function getBalanceSheetRowsWithNetBookValue(data: ParsedFile) {
  const previewRows = data.rows.slice(0, 25).map((row) => [...row]);
  const comparisonHeader = previewRows.find((row) => isComparisonHeaderRow(row));
  const isComparisonBalanceSheet = Boolean(comparisonHeader);

  if (isComparisonBalanceSheet) {
    return addBalanceSheetPreviewSections(getBalanceSheetComparisonRowsWithNetBookValue(previewRows));
  }

  const statementRows = getStatementRows(data);
  const netBookValueRow = statementRows.find((row) =>
    ["net book value", "net fixed assets"].includes(normalizeStatementLabel(row.label)),
  );
  const existingNetBookPreviewIndex = previewRows.findIndex((row) =>
    ["net book value", "net fixed assets"].includes(normalizeStatementLabel(String(row[0] || ""))),
  );
  const fixedAssets = findStatementAmount(statementRows, [
    "Total Fixed Assets",
    "Fixed Assets",
    "Original Cost",
  ]);
  const accumulatedDepreciation = findStatementAmount(statementRows, [
    "Accumulated Depreciation",
    "Total Accumulated Depreciation",
  ]);

  if (!fixedAssets && !accumulatedDepreciation && !netBookValueRow) {
    return addBalanceSheetPreviewSections(previewRows);
  }

  const netBookValue = netBookValueRow?.amount ?? fixedAssets - Math.abs(accumulatedDepreciation);
  const netBookValuePreviewRow = ["Net Book Value", netBookValue];
  const rowsWithoutExistingNetBookValue =
    existingNetBookPreviewIndex >= 0
      ? previewRows.filter((_, index) => index !== existingNetBookPreviewIndex)
      : previewRows;
  const accumulatedDepreciationPreviewIndex = rowsWithoutExistingNetBookValue.findIndex((row) =>
    normalizeStatementLabel(String(row[0] || "")).includes("accumulated depreciation"),
  );
  const insertionIndex =
    accumulatedDepreciationPreviewIndex >= 0
      ? Math.min(accumulatedDepreciationPreviewIndex + 1, rowsWithoutExistingNetBookValue.length)
      : rowsWithoutExistingNetBookValue.length;

  rowsWithoutExistingNetBookValue.splice(insertionIndex, 0, netBookValuePreviewRow);
  return addBalanceSheetPreviewSections(rowsWithoutExistingNetBookValue);
}

function getBalanceSheetComparisonRowsWithNetBookValue(rows: unknown[][]) {
  const existingNetBookValueIndex = rows.findIndex((row) =>
    ["net book value", "net fixed assets"].includes(normalizeStatementLabel(String(row[0] || ""))),
  );
  const fixedAssetRow = rows.find((row) => normalizeStatementLabel(String(row[0] || "")) === "fixed assets");
  const accumulatedDepreciationRow = rows.find((row) =>
    normalizeStatementLabel(String(row[0] || "")).includes("accumulated depreciation"),
  );

  if (!fixedAssetRow || !accumulatedDepreciationRow) return rows;

  const rowsWithoutExistingNetBookValue =
    existingNetBookValueIndex >= 0 ? rows.filter((_, index) => index !== existingNetBookValueIndex) : rows;
  const accumulatedDepreciationIndex = rowsWithoutExistingNetBookValue.findIndex((row) =>
    normalizeStatementLabel(String(row[0] || "")).includes("accumulated depreciation"),
  );
  const headerRow = rowsWithoutExistingNetBookValue.find((row) => isComparisonHeaderRow(row)) || [];
  const netBookValueRow = fixedAssetRow.map((cell, index) => {
    if (index === 0) return "Net Book Value";

    const fixedAssetValue = parseNumber(cell);
    const accumulatedDepreciationValue = parseNumber(accumulatedDepreciationRow[index]);
    const columnHeader = normalizeHeader(headerRow[index]);

    if (fixedAssetValue === null && accumulatedDepreciationValue === null) return "";
    if (columnHeader.includes("%")) return "";

    return (fixedAssetValue || 0) + (accumulatedDepreciationValue || 0);
  });
  const currentNetBookValue = parseNumber(netBookValueRow[1]);
  const priorNetBookValue = parseNumber(netBookValueRow[2]);
  const priorYearNetBookValue = parseNumber(netBookValueRow[5]);

  if (currentNetBookValue !== null && priorNetBookValue !== null) {
    netBookValueRow[3] = currentNetBookValue - priorNetBookValue;
    netBookValueRow[4] = priorNetBookValue ? ((currentNetBookValue - priorNetBookValue) / Math.abs(priorNetBookValue)) * 100 : "";
  }

  if (currentNetBookValue !== null && priorYearNetBookValue !== null) {
    netBookValueRow[6] = currentNetBookValue - priorYearNetBookValue;
    netBookValueRow[7] = priorYearNetBookValue
      ? ((currentNetBookValue - priorYearNetBookValue) / Math.abs(priorYearNetBookValue)) * 100
      : "";
  }

  rowsWithoutExistingNetBookValue.splice(
    accumulatedDepreciationIndex >= 0 ? accumulatedDepreciationIndex + 1 : rowsWithoutExistingNetBookValue.length,
    0,
    netBookValueRow,
  );

  return recalculateBalanceSheetComparisonLiabilityEquityTotals(rowsWithoutExistingNetBookValue);
}

function buildComparisonTotalRow(label: string, values: number[]) {
  const current = values[1] || 0;
  const priorMonth = values[2] || 0;
  const priorYear = values[5] || 0;

  return [
    label,
    current,
    priorMonth,
    current - priorMonth,
    priorMonth ? ((current - priorMonth) / Math.abs(priorMonth)) * 100 : 0,
    priorYear,
    current - priorYear,
    priorYear ? ((current - priorYear) / Math.abs(priorYear)) * 100 : 0,
  ];
}

function addComparisonDetailRowToTotals(totals: number[], row: unknown[]) {
  [1, 2, 5].forEach((index) => {
    totals[index] += parseNumber(row[index]) || 0;
  });
}

function recalculateBalanceSheetComparisonLiabilityEquityTotals(rows: unknown[][]) {
  const totals = {
    liabilities: Array(8).fill(0) as number[],
    equity: Array(8).fill(0) as number[],
  };
  const detailCounts = {
    liabilities: 0,
    equity: 0,
  };
  const sourceTotalEquityRow = rows.find(
    (row) => normalizeStatementLabel(String(row[0] || "")) === "total equity",
  );
  let activeSection: "assets" | "liabilities" | "equity" | null = null;

  rows.forEach((row) => {
    const normalized = normalizeStatementLabel(String(row[0] || ""));
    const label = String(row[0] || "");

    if (normalized === "assets") {
      activeSection = "assets";
      return;
    }

    if (
      normalized === "liabilities & equity" ||
      normalized === "liabilities and equity" ||
      normalized === "liabilities" ||
      normalized === "current liabilities" ||
      normalized === "long-term liabilities" ||
      normalized === "long term liabilities"
    ) {
      activeSection = "liabilities";
      return;
    }

    if (normalized === "equity") {
      activeSection = "equity";
      return;
    }

    if (
      !activeSection ||
      activeSection === "assets" ||
      normalized.startsWith("total") ||
      getPreviewMetaRowType(row, 0) !== null ||
      isComparisonHeaderRow(row)
    ) {
      return;
    }

    addComparisonDetailRowToTotals(totals[activeSection], row);
    detailCounts[activeSection] += 1;
  });

  const totalLiabilitiesRow = buildComparisonTotalRow("Total Liabilities", totals.liabilities);
  const sourceEquityTotals = Array(8).fill(0) as number[];
  if (sourceTotalEquityRow) {
    [1, 2, 5].forEach((index) => {
      sourceEquityTotals[index] = parseNumber(sourceTotalEquityRow[index]) || 0;
    });
  }
  const totalEquityRow = buildComparisonTotalRow(
    "Total Equity",
    detailCounts.equity > 0 ? totals.equity : sourceEquityTotals,
  );
  const totalLiabilitiesAndEquity = buildComparisonTotalRow(
    "TOTAL LIABILITIES & EQUITY",
    totalLiabilitiesRow.map((value, index) => (parseNumber(value) || 0) + (parseNumber(totalEquityRow[index]) || 0)),
  );

  return rows.map((row) => {
    const normalized = normalizeStatementLabel(String(row[0] || ""));

    if (normalized === "total liabilities") return totalLiabilitiesRow;
    if (normalized === "total equity") return totalEquityRow;
    if (normalized === "total liabilities & equity" || normalized === "total liabilities and equity") {
      return totalLiabilitiesAndEquity;
    }

    return row;
  });
}

function addBalanceSheetPreviewSections(rows: unknown[][]) {
  const sectionOrder = [
    "Current Assets",
    "Fixed Assets",
    "Current Liabilities",
    "Long-Term Liabilities",
    "Equity",
  ];
  const seen = new Set<string>();
  const enhancedRows: unknown[][] = [];

  rows.forEach((row) => {
    const label = String(row[0] || "");
    const normalized = normalizeStatementLabel(label);
    const section = getBalanceSheetSection(label);
    const isExplicitSection = sectionOrder.some((item) => normalizeStatementLabel(item) === normalized);

    if (section && !seen.has(section) && !isExplicitSection) {
      enhancedRows.push([section]);
      seen.add(section);
    }

    if (isExplicitSection) seen.add(section || label);
    enhancedRows.push(row);
  });

  return enhancedRows;
}

function getBalanceSheetStatementRowsWithNetBookValue(data: ParsedFile | null) {
  const rows = getStatementRows(data).map((row) => ({ ...row }));
  const existingNetBookValueRow = rows.find((row) =>
    ["net book value", "net fixed assets"].includes(normalizeStatementLabel(row.label)),
  );
  const fixedAssets = findStatementAmount(rows, ["Total Fixed Assets", "Fixed Assets", "Original Cost"]);
  const accumulatedDepreciation = findStatementAmount(rows, [
    "Accumulated Depreciation",
    "Total Accumulated Depreciation",
  ]);

  if (!fixedAssets && !accumulatedDepreciation && !existingNetBookValueRow) {
    return addBalanceSheetStatementSections(rows);
  }

  const rowsWithoutExistingNetBookValue = rows
    .filter(
      (row) =>
        !["net book value", "net fixed assets"].includes(normalizeStatementLabel(row.label)),
    )
    .map((row) =>
      normalizeStatementLabel(row.label).includes("accumulated depreciation")
        ? { ...row, amount: -Math.abs(row.amount || 0) }
        : row,
    );
  const accumulatedDepreciationIndex = rowsWithoutExistingNetBookValue.findIndex((row) =>
    normalizeStatementLabel(row.label).includes("accumulated depreciation"),
  );
  const insertionIndex =
    accumulatedDepreciationIndex >= 0
      ? Math.min(accumulatedDepreciationIndex + 1, rowsWithoutExistingNetBookValue.length)
      : rowsWithoutExistingNetBookValue.length;
  const netBookValue =
    existingNetBookValueRow?.amount ?? fixedAssets - Math.abs(accumulatedDepreciation);

  rowsWithoutExistingNetBookValue.splice(insertionIndex, 0, {
    label: "Net Book Value",
    amount: netBookValue,
  });

  return addBalanceSheetStatementSections(rowsWithoutExistingNetBookValue);
}

function addBalanceSheetStatementSections(rows: StatementRow[]) {
  const sectionOrder = [
    "Current Assets",
    "Fixed Assets",
    "Current Liabilities",
    "Long-Term Liabilities",
    "Equity",
  ];
  const seen = new Set<string>();
  const enhancedRows: StatementRow[] = [];

  rows.forEach((row) => {
    const normalized = normalizeStatementLabel(row.label);
    const section = getBalanceSheetSection(row.label);
    const isExplicitSection = sectionOrder.some((item) => normalizeStatementLabel(item) === normalized);

    if (section && !seen.has(section) && !isExplicitSection) {
      enhancedRows.push({ label: section, amount: null });
      seen.add(section);
    }

    if (isExplicitSection) seen.add(section || row.label);
    enhancedRows.push(row);
  });

  return enhancedRows;
}

function getPreviewRows(title: string, data: ParsedFile) {
  const rows = title.toLowerCase().includes("balance sheet")
    ? getBalanceSheetRowsWithNetBookValue(data)
    : data.rows.slice(0, 25);
  const normalizedTitle = title.toLowerCase();
  const isComparisonPreview =
    normalizedTitle.includes("comparison") || rows.some((row) => isComparisonHeaderRow(row));
  const isStatementPreview =
    !isComparisonPreview &&
    (normalizedTitle.includes("profit") ||
      normalizedTitle.includes("loss") ||
      normalizedTitle.includes("balance sheet"));
  const hasAmountHeader = rows.some(
    (row) => normalizeHeader(row[0]).includes("line item") && normalizeHeader(row[1]).includes("amount"),
  );

  if (isStatementPreview && !hasAmountHeader) {
    const firstSectionIndex = rows.findIndex((row) => getStatementRowType(String(row[0] || "")) === "section");
    const insertionIndex = firstSectionIndex >= 0 ? firstSectionIndex : Math.min(3, rows.length);
    const withHeader = [...rows];
    withHeader.splice(insertionIndex, 0, ["Line Item", "Amount"]);
    return withHeader;
  }

  return rows;
}

function getPreviewRowType(row: unknown[]) {
  if (row.length === 1 && getBalanceSheetSection(String(row[0] || ""))) return "section";
  return getStatementRowType(String(row[0] || ""));
}

function isComparisonHeaderRow(row: unknown[]) {
  const normalizedCells = row.map((cell) => normalizeHeader(cell));
  return normalizedCells.some((cell) => cell.includes("% change") || cell.includes("yoy % change"));
}

function getPreviewMetaRowType(row: unknown[], rowIndex: number) {
  const filledCells = row.map((cell) => String(cell || "").trim()).filter(Boolean);
  if (rowIndex > 2 || filledCells.length !== 1) return null;
  if (rowIndex === 0) return "company";
  if (rowIndex === 1) return "report";
  return "period";
}

function isDateOrPeriodLabel(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return false;
  return (
    /^\d{4}$/.test(text) ||
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}$/i.test(text) ||
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(text) ||
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(text) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\b/i.test(text)
  );
}

function isAgingBucketLabel(value: unknown) {
  const text = normalizeHeader(value).replace(/\s+/g, "");
  return ["current", "1-30", "31-60", "61-90", "90+", "91andover", ">90", "total"].includes(text);
}

function isHeaderRow(row: unknown[]) {
  const cells = row.map((cell) => String(cell || "").trim()).filter(Boolean);
  if (cells.length === 0) return true;

  const normalizedCells = cells.map((cell) => normalizeHeader(cell));
  const hasGlHeader =
    normalizedCells.includes("date") &&
    normalizedCells.includes("account") &&
    normalizedCells.includes("memo") &&
    (normalizedCells.includes("debit") || normalizedCells.includes("credit"));
  if (hasGlHeader) return true;

  const headerTerms = [
    "customer",
    "vendor",
    "account",
    "line item",
    "item",
    "memo",
    "date",
    "type",
    "num",
    "name",
    "1-30",
    "31-60",
    "61-90",
    "90+",
    "total",
    "amount",
    "balance",
    "asset",
    "acquired",
    "part number",
    "description",
    "quantity",
    "qty",
    "value",
    "cost",
    "average cost",
    "original cost",
    "actual",
    "budget",
    "variance",
    "% variance",
    "change",
    "$ change",
    "% change",
    "yoy",
    "yoy $ change",
    "yoy % change",
    "percent",
    "interest rate",
    "rate",
    "sales",
    "depreciation",
    "net book value",
  ];
  const headerMatches = normalizedCells.filter((cell) =>
    headerTerms.some((term) => cell === term || cell.includes(term)),
  ).length;

  return headerMatches >= Math.min(2, cells.length) || normalizedCells.every(isAgingBucketLabel);
}

function isPayrollDetailHeaderRow(row: unknown[]) {
  const normalizedCells = row.map((cell) => normalizeHeader(cell));
  const hasDate = normalizedCells.some((cell) => cell === "date");
  const hasTransactionType = normalizedCells.some(
    (cell) => cell === "type" || cell === "transaction type" || cell.includes("transaction type"),
  );
  const hasAmountColumn = normalizedCells.some((cell) =>
    ["amount", "balance", "debit", "credit"].some((label) => cell === label || cell.includes(label)),
  );

  return (
    hasDate &&
    hasTransactionType &&
    hasAmountColumn
  );
}

function isPercentCell(row: unknown[], cellIndex: number, value: unknown) {
  const text = String(value || "").trim();
  if (!text.includes("%")) return false;
  return !isHeaderRow(row) && cellIndex > 0 && parseNumber(value) !== null;
}

function getColumnLabel(headers: unknown[], cellIndex: number) {
  const directHeader = normalizeHeader(headers[cellIndex]);
  if (directHeader) return directHeader;

  const priorHeader = normalizeHeader(headers[cellIndex - 1]);
  if (priorHeader.includes("part number") && priorHeader.includes("description")) {
    return "description";
  }

  return "";
}

function isCurrencyColumn(columnLabel: string) {
  const normalized = normalizeHeader(columnLabel);
  if (!normalized) return false;

  const compact = normalized.replace(/\s+/g, "");
  const currencyColumns = [
    "amount",
    "value",
    "inventory value",
    "average cost",
    "original cost",
    "cost",
    "accumulated depreciation",
    "net book value",
    "book value",
    "actual",
    "budget",
    "over/(under) budget",
    "over/under budget",
    "current",
    "1-30",
    "1 - 30",
    "31-60",
    "31 - 60",
    "61-90",
    "61 - 90",
    "90+",
    "91 and over",
    "total",
    "debit",
    "credit",
    "balance",
  ];

  return currencyColumns.some((label) => {
    const compactLabel = label.replace(/\s+/g, "");
    return (
      normalized === label ||
      normalized.includes(label) ||
      compact === compactLabel ||
      compact.includes(compactLabel)
    );
  });
}

function isNumberColumn(columnLabel: string) {
  const normalized = normalizeHeader(columnLabel);
  return ["qty", "quantity", "quantity on hand", "on hand"].some(
    (label) => normalized === label || normalized.includes(label),
  );
}

function isPercentColumn(columnLabel: string) {
  const normalized = normalizeHeader(columnLabel);
  return ["% variance", "variance %", "percent", "margin %", "% change", "yoy % change"].some(
    (label) => normalized === label || normalized.includes(label),
  );
}

function isRateColumn(columnLabel: string) {
  const normalized = normalizeHeader(columnLabel);
  return ["interest rate", "rate"].some((label) => normalized === label || normalized.includes(label));
}

function isTextColumn(columnLabel: string) {
  const normalized = normalizeHeader(columnLabel);
  return [
    "customer",
    "vendor",
    "account",
    "account name",
    "memo",
    "date",
    "type",
    "num",
    "name",
    "asset",
    "asset name",
    "acquired",
    "description",
    "item",
    "product",
    "part",
    "part number",
  ].some((label) => normalized === label || normalized.includes(label));
}

function isStatementAmountCell(row: unknown[], cellIndex: number, value: unknown) {
  if (cellIndex === 0) return false;
  if (parseNumber(value) === null) return false;
  const rowLabel = String(row[0] || "").trim();

  return Boolean(rowLabel) && !isDateOrPeriodLabel(rowLabel) && !isHeaderRow(row);
}

function isNumericFinancialCell(
  row: unknown[],
  cellIndex: number,
  value: unknown,
  headers: unknown[] = [],
) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (cellIndex === 0) return false;
  if (isHeaderRow(row)) return false;
  if (isDateOrPeriodLabel(value) || isAgingBucketLabel(value)) return false;
  if (text.includes("%")) return false;

  const parsedValue = parseNumber(value);
  if (parsedValue === null) return false;

  const columnLabel = getColumnLabel(headers, cellIndex);
  if (
    isTextColumn(columnLabel) ||
    isPercentColumn(columnLabel) ||
    isRateColumn(columnLabel) ||
    isNumberColumn(columnLabel)
  ) {
    return false;
  }
  if (isCurrencyColumn(columnLabel)) return true;

  return isStatementAmountCell(row, cellIndex, value);
}

function formatTableCell(value: unknown, columnName: unknown, row: unknown[], rowIndex: number) {
  const text = String(value || "");
  if (!text) return "";
  const rowLabel = String(row[0] || "");
  const columnLabel = normalizeHeader(columnName);
  const parsedValue = parseNumber(value);

  if (rowIndex >= 0 && isHeaderRow(row)) return text;
  if (isDateOrPeriodLabel(value) || isAgingBucketLabel(value)) return text;
  if (parsedValue === null) return text;

  if (isPercentColumn(columnLabel) || String(value).includes("%")) {
    return formatPercent(parsedValue);
  }

  if (isRateColumn(columnLabel)) {
    return formatRate(parsedValue);
  }

  if (isNumberColumn(columnLabel)) {
    return formatNumber(parsedValue);
  }

  if (isCurrencyColumn(columnLabel)) {
    const displayValue = normalizeStatementLabel(rowLabel).includes("accumulated depreciation")
      ? -Math.abs(parsedValue)
      : parsedValue;
    return formatCurrency(displayValue);
  }

  return text;
}

function formatPreviewCell(
  row: unknown[],
  cell: unknown,
  cellIndex: number,
  headers: unknown[] = [],
  rowIndex = -1,
  previewTitle = "",
) {
  const parsedValue = parseNumber(cell);
  const normalizedPreviewTitle = previewTitle.toLowerCase();
  const isAgingPreview = normalizedPreviewTitle.includes("aging");
  const isInventoryPreview = normalizedPreviewTitle.includes("inventory");
  const isFinancialStatementPreview =
    normalizedPreviewTitle.includes("profit") ||
    normalizedPreviewTitle.includes("loss") ||
    normalizedPreviewTitle.includes("balance sheet");
  const headerColumnName = headers[cellIndex] || "";
  const columnLabel = getColumnLabel(headers, cellIndex);
  const headerIsPercent = isPercentColumn(columnLabel);
  const headerIsRate = isRateColumn(columnLabel);
  const headerIsQuantity = isNumberColumn(columnLabel);
  const headerIsText = isTextColumn(columnLabel);

  if (
    cellIndex > 0 &&
    parsedValue !== null &&
    !isHeaderRow(row) &&
    headerIsPercent
  ) {
    return formatPercent(parsedValue);
  }

  if (cellIndex > 0 && parsedValue !== null && !isHeaderRow(row) && headerIsRate) {
    return formatRate(parsedValue);
  }

  if (isInventoryPreview && !isHeaderRow(row)) {
    if (cellIndex === 0 || cellIndex === 1) return String(cell || "");
    if (parsedValue === null) return String(cell || "");
    if (cellIndex === 2) return formatNumber(parsedValue);
    if (cellIndex >= 3) return formatCurrency(parsedValue);
  }

  if (
    isAgingPreview &&
    cellIndex > 0 &&
    parsedValue !== null &&
    !isHeaderRow(row) &&
    !isAgingBucketLabel(cell)
  ) {
    return formatCurrency(parsedValue);
  }

  if (
    isFinancialStatementPreview &&
    cellIndex > 0 &&
    parsedValue !== null &&
    !isHeaderRow(row) &&
    !isAgingBucketLabel(cell)
  ) {
    const rowLabel = String(row[0] || "");
    const displayValue = normalizeStatementLabel(rowLabel).includes("accumulated depreciation")
      ? -Math.abs(parsedValue)
      : parsedValue;
    return formatCurrency(displayValue);
  }

  if (
    cellIndex > 0 &&
    parsedValue !== null &&
    !isHeaderRow(row) &&
    !isAgingBucketLabel(cell) &&
    !headerIsText &&
    !headerIsQuantity &&
    !headerIsPercent &&
    !headerIsRate
  ) {
    const rowLabel = String(row[0] || "");
    const displayValue = normalizeStatementLabel(rowLabel).includes("accumulated depreciation")
      ? -Math.abs(parsedValue)
      : parsedValue;
    return formatCurrency(displayValue);
  }

  const shouldUseStatementAmount =
    isStatementAmountCell(row, cellIndex, cell) &&
    !headerIsPercent &&
    !headerIsRate &&
    !headerIsQuantity;
  const columnName = shouldUseStatementAmount ? "Amount" : headerColumnName;

  return formatTableCell(cell, columnName, row, rowIndex);
}

function getTopExpenseRows(plData: ParsedFile | null) {
  const rows = getStatementRows(plData);
  const expensesStart = rows.findIndex((row) => row.label.toLowerCase() === "expenses");
  const totalExpensesIndex = rows.findIndex(
    (row) => row.label.toLowerCase() === "total expenses",
  );

  const expenseRows =
    expensesStart >= 0 && totalExpensesIndex > expensesStart
      ? rows.slice(expensesStart + 1, totalExpensesIndex)
      : rows.filter((row) => {
          const label = row.label.toLowerCase();

          return (
            row.amount !== null &&
            row.amount > 0 &&
            !label.includes("total") &&
            !label.includes("income") &&
            !label.includes("gross profit") &&
            !label.includes("net income") &&
            !label.includes("cost of goods sold")
          );
        });

  return expenseRows
    .filter((row) => row.amount !== null && row.amount > 0)
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 5);
}

function getTopRevenueRows(plData: ParsedFile | null) {
  const rows = getStatementRows(plData);
  const incomeStart = rows.findIndex((row) => ["income", "revenue"].includes(row.label.toLowerCase()));
  const incomeEnd = rows.findIndex((row) => normalizeStatementLabel(row.label) === "total income");
  const revenueRows =
    incomeStart >= 0 && incomeEnd > incomeStart
      ? rows.slice(incomeStart + 1, incomeEnd)
      : rows.filter((row) => {
          const label = normalizeStatementLabel(row.label);
          return (
            row.amount !== null &&
            row.amount > 0 &&
            !label.includes("total") &&
            !label.includes("gross profit") &&
            !label.includes("net income") &&
            (label.includes("income") ||
              label.includes("revenue") ||
              label.includes("sales") ||
              label.includes("service") ||
              label.includes("product"))
          );
        });

  return revenueRows
    .filter((row) => row.amount !== null && row.amount > 0 && !normalizeStatementLabel(row.label).includes("total"))
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 5);
}

function getTopOperatingExpenseRows(plData: ParsedFile | null) {
  const expenseKeywords = [
    "payroll",
    "wages",
    "labor",
    "rent",
    "software",
    "utilities",
    "insurance",
    "fuel",
    "repairs",
    "marketing",
    "advertising",
    "admin",
    "office",
    "professional fees",
    "operating expense",
  ];

  return getTopExpenseRows(plData)
    .filter((row) => {
      const label = normalizeStatementLabel(row.label);
      return !label.includes("income") && !label.includes("revenue") && !label.includes("sales");
    })
    .sort((a, b) => {
      const aMatch = expenseKeywords.some((keyword) => normalizeStatementLabel(a.label).includes(keyword));
      const bMatch = expenseKeywords.some((keyword) => normalizeStatementLabel(b.label).includes(keyword));
      if (aMatch === bMatch) return (b.amount || 0) - (a.amount || 0);
      return aMatch ? -1 : 1;
    })
    .slice(0, 5);
}

function interpretNetMargin(value: number) {
  if (value > 20) return "Strong profitability. The company is converting revenue into profit at a healthy rate.";
  if (value >= 10) return "Moderate profitability. Margins are positive, but expense control should be monitored.";
  return "Low profitability. Review pricing, labor costs, and operating expenses.";
}

function interpretGrossMargin(value: number) {
  if (value > 50) return "Strong gross margin. Direct costs are being managed well.";
  if (value >= 30) return "Acceptable gross margin. Monitor labor, materials, and job costing.";
  return "Low gross margin. Review pricing, COGS, and production efficiency.";
}

function interpretExpenseRatio(value: number) {
  if (value < 25) return "Operating expenses are well controlled relative to revenue.";
  if (value <= 40) return "Operating expenses are moderate. Continue monitoring overhead.";
  return "Operating expenses are high. Review administrative costs, subscriptions, insurance, payroll, and discretionary spend.";
}

function interpretCurrentRatio(value: number | null) {
  if (value === null) return "Current assets and current liabilities are needed for a precise calculation.";
  if (value > 2) return "Strong short-term liquidity.";
  if (value >= 1.2) return "Adequate liquidity.";
  return "Potential liquidity risk.";
}

function interpretQuickRatio(value: number | null) {
  if (value === null) return "Current liabilities are needed for a precise calculation.";
  if (value > 1.5) return "Strong near-term liquidity without relying on inventory.";
  if (value >= 1) return "Acceptable liquidity, but cash and receivables should be monitored.";
  return "Potential short-term cash pressure.";
}

function interpretCashToAssets(value: number) {
  if (value > 25) return "Strong cash position relative to total assets.";
  if (value >= 10) return "Moderate cash position.";
  return "Low cash cushion.";
}

function interpretArToAssets(value: number) {
  if (value > 25) return "High AR concentration. Collections should be reviewed closely.";
  if (value >= 10) return "AR is a meaningful part of assets. Monitor aging and collection timing.";
  return "Low AR concentration.";
}

function interpretApToRevenue(value: number) {
  if (value > 15) return "Vendor obligations are elevated relative to revenue. Monitor cash flow and payment timing.";
  if (value >= 5) return "AP is manageable relative to revenue.";
  return "Low vendor obligation burden.";
}

function interpretInventoryToAssets(value: number) {
  if (value > 30) return "Inventory represents a large share of assets. Monitor turnover, obsolete inventory, and purchasing discipline.";
  if (value >= 10) return "Inventory investment appears reasonable.";
  return "Inventory is a smaller portion of the asset base.";
}

function interpretWorkingCapital(value: number | null, revenue: number) {
  if (value === null) return "Current assets and current liabilities are needed for a precise calculation.";
  const tightThreshold = Math.max(Math.abs(revenue) * 0.02, 1000);

  if (value < 0) return "Potential liquidity concern.";
  if (value <= tightThreshold) return "Working capital is tight.";
  return "Positive working capital supports operating flexibility.";
}

function interpretDso(value: number | null) {
  if (value === null) return "DSO requires revenue, accounts receivable, and reporting period days.";
  if (value < 30) return "Collections are strong.";
  if (value <= 60) return "Collections are acceptable but should be monitored.";
  return "Collections may be slow. Review aging buckets and follow-up procedures.";
}

function interpretPayrollCostToRevenue(value: number | null) {
  if (value === null) return "Payroll cost requires payroll and revenue data.";
  if (value < 20) return `Payroll cost represents ${value.toFixed(1)}% of revenue, which appears efficient for the current period. Monitor whether staffing levels remain aligned with revenue volume.`;
  if (value <= 35) return `Payroll cost represents ${value.toFixed(1)}% of revenue, which appears manageable. Continue monitoring staffing mix and gross margin trends.`;
  return `Payroll cost represents ${value.toFixed(1)}% of revenue, which is elevated and should be reviewed against pricing, utilization, and department staffing levels.`;
}

function interpretRevenuePerFte(value: number | null) {
  if (value === null) return "Revenue per FTE requires revenue and current FTE data.";
  return `Revenue per FTE is ${formatCurrency(value)}, indicating ${value >= 100000 ? "strong" : "an area to monitor for"} productivity for the current payroll base.`;
}

function interpretPayrollCostPerFte(value: number | null) {
  if (value === null) return "Payroll cost per FTE requires current payroll cost and FTE data.";
  return `Payroll cost per FTE is ${formatCurrency(value)}. Monitor this against revenue per FTE, gross margin, and department-level productivity.`;
}

function interpretFteChange(value: number | null) {
  if (value === null) return "FTE change requires current and prior payroll reports.";
  if (Math.abs(value) < 5) return "FTE levels were relatively stable month-over-month.";
  return value > 0
    ? "FTE increased meaningfully. Confirm staffing growth is aligned with revenue volume and project demand."
    : "FTE decreased meaningfully. Confirm service capacity and delivery expectations remain covered.";
}

function interpretPayrollCostChange(value: number | null) {
  if (value === null) return "Payroll cost change requires current and prior payroll reports.";
  if (Math.abs(value) < 5) return "Payroll cost was relatively stable month-over-month.";
  return value > 0
    ? "Payroll cost increased. Review department-level changes and compare against revenue and margin growth."
    : "Payroll cost decreased. Confirm the change reflects planned staffing or cost structure improvements.";
}

function calculatePeriodDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return null;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const days = Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;

  return Number.isFinite(days) && days > 0 ? days : null;
}

function calculateDso(kpis: KPIs, periodDays: number | null) {
  if (!kpis.revenue || !kpis.accountsReceivable || !periodDays) return null;

  const averageDailySales = kpis.revenue / periodDays;
  return averageDailySales ? kpis.accountsReceivable / averageDailySales : null;
}

function calculateDsoFromAverageDailySales(kpis: KPIs, averageDailySales: number | null) {
  if (!kpis.accountsReceivable || !averageDailySales) return null;

  return kpis.accountsReceivable / averageDailySales;
}

function calculateSalesDetailRevenue(data: ParsedFile | null) {
  if (!data) return null;

  const headerIndex = findHeaderIndex(data.rows, [
    "amount",
    "sales",
    "total",
    "invoice amount",
    "net sales",
  ]);
  if (headerIndex === -1) return null;

  const headers = data.rows[headerIndex];
  const amountIndex = headers.findIndex((header) => {
    const normalized = normalizeHeader(header);
    return ["amount", "sales", "total", "invoice amount", "net sales"].some((label) =>
      normalized.includes(label),
    );
  });
  if (amountIndex === -1) return null;

  const total = data.rows
    .slice(headerIndex + 1)
    .reduce((sum, row) => sum + (parseNumber(row[amountIndex]) || 0), 0);

  return total || null;
}

function buildRatioRows(
  kpis: KPIs,
  netMargin: number,
  bsRows: StatementRow[],
  apKpis: APKpis,
  inventoryKpis: InventoryKpis,
  periodDays: number | null,
  payrollAnalysis: PayrollAnalysis,
  includePayroll: boolean,
  debtMetrics: DebtMetrics,
  dsoOverride: number | null = null,
) {
  const grossMargin = kpis.revenue ? (kpis.grossProfit / kpis.revenue) * 100 : 0;
  const expenseRatio = kpis.revenue ? (kpis.expenses / kpis.revenue) * 100 : 0;
  const operatingIncome = kpis.grossProfit - kpis.expenses;
  const operatingMargin = kpis.revenue ? (operatingIncome / kpis.revenue) * 100 : 0;
  const ebitda = operatingIncome;
  const ebitdaMargin = kpis.revenue ? (ebitda / kpis.revenue) * 100 : 0;
  const currentAssets = getCurrentAssetTotal(bsRows);
  const currentLiabilities = getCurrentLiabilityTotal(bsRows);
  const currentRatio = currentAssets && currentLiabilities ? currentAssets / currentLiabilities : null;
  const quickRatio = currentLiabilities
    ? (kpis.cash + kpis.accountsReceivable) / currentLiabilities
    : null;
  const cashToAssets = kpis.totalAssets ? (kpis.cash / kpis.totalAssets) * 100 : 0;
  const arToAssets = kpis.totalAssets ? (kpis.accountsReceivable / kpis.totalAssets) * 100 : 0;
  const apToRevenue = kpis.revenue ? (apKpis.total / kpis.revenue) * 100 : 0;
  const inventoryToAssets = kpis.totalAssets
    ? (inventoryKpis.totalValue / kpis.totalAssets) * 100
    : 0;
  const workingCapital =
    currentAssets && currentLiabilities ? currentAssets - currentLiabilities : null;
  const dso = dsoOverride ?? calculateDso(kpis, periodDays);
  const inventoryTurnover = inventoryKpis.totalValue ? kpis.cogs / inventoryKpis.totalValue : null;
  const arTurnover = kpis.accountsReceivable ? kpis.revenue / kpis.accountsReceivable : null;
  const apTurnover = apKpis.total ? kpis.cogs / apKpis.total : null;
  const dio = inventoryTurnover && inventoryTurnover > 0 ? 365 / inventoryTurnover : null;
  const dpo = apTurnover && apTurnover > 0 ? 365 / apTurnover : null;
  const cashConversionCycle = dso !== null && dio !== null && dpo !== null ? dso + dio - dpo : null;
  const payrollCostToRevenue =
    includePayroll && kpis.revenue ? (payrollAnalysis.totalCurrentPayrollCost / kpis.revenue) * 100 : null;
  const grossWages = payrollAnalysis.rows.reduce((total, row) => total + row.currentGrossWages, 0);
  const payrollTaxes = payrollAnalysis.rows.reduce((total, row) => total + row.currentPayrollTaxes, 0);
  const grossWagesToRevenue = includePayroll && kpis.revenue ? (grossWages / kpis.revenue) * 100 : null;
  const payrollTaxesToGrossWages = includePayroll && grossWages ? (payrollTaxes / grossWages) * 100 : null;
  const payrollCostPerFte =
    includePayroll && payrollAnalysis.totalCurrentFte
      ? payrollAnalysis.totalCurrentPayrollCost / payrollAnalysis.totalCurrentFte
      : null;
  const revenuePerFte =
    includePayroll && payrollAnalysis.totalCurrentFte ? kpis.revenue / payrollAnalysis.totalCurrentFte : null;
  const grossProfitPerFte =
    includePayroll && payrollAnalysis.totalCurrentFte ? kpis.grossProfit / payrollAnalysis.totalCurrentFte : null;
  const fteChangePercent =
    includePayroll && payrollAnalysis.totalPriorFte
      ? (payrollAnalysis.totalFteChange / payrollAnalysis.totalPriorFte) * 100
      : null;
  const payrollCostChangePercent =
    includePayroll && payrollAnalysis.totalPriorPayrollCost
      ? (payrollAnalysis.totalPayrollCostChange / payrollAnalysis.totalPriorPayrollCost) * 100
      : null;

  return [
    {
      name: "Net Margin",
      formula: "Net Income / Revenue",
      value: `${netMargin.toFixed(1)}%`,
      interpretation: interpretNetMargin(netMargin),
    },
    {
      name: "Gross Margin",
      formula: "Gross Profit / Revenue",
      value: `${grossMargin.toFixed(1)}%`,
      interpretation: interpretGrossMargin(grossMargin),
    },
    {
      name: "Expense Ratio",
      formula: "Total Expenses / Revenue",
      value: `${expenseRatio.toFixed(1)}%`,
      interpretation: interpretExpenseRatio(expenseRatio),
    },
    {
      name: "Operating Margin",
      formula: "Operating Income / Revenue",
      value: `${operatingMargin.toFixed(1)}%`,
      interpretation:
        operatingMargin >= 15
          ? "Operating profitability is strong after overhead."
          : operatingMargin >= 5
            ? "Operating profitability is positive but should be monitored."
            : "Operating margin is thin. Review pricing, labor efficiency, and overhead structure.",
    },
    {
      name: "EBITDA Margin",
      formula: "Estimated EBITDA / Revenue",
      value: `${ebitdaMargin.toFixed(1)}%`,
      interpretation:
        ebitdaMargin >= 15
          ? "Estimated EBITDA margin supports reinvestment, debt service, and owner distributions."
          : ebitdaMargin >= 5
            ? "Estimated EBITDA margin is positive but leaves limited room for execution misses."
            : "Estimated EBITDA margin indicates earnings pressure before financing and tax impacts.",
    },
    {
      name: "Current Ratio",
      formula: "Current Assets / Current Liabilities",
      value: currentRatio !== null ? currentRatio.toFixed(2) : "N/A",
      interpretation: interpretCurrentRatio(currentRatio),
    },
    {
      name: "Quick Ratio",
      formula: "(Cash + Accounts Receivable) / Current Liabilities",
      value: quickRatio !== null ? quickRatio.toFixed(2) : "N/A",
      interpretation: interpretQuickRatio(quickRatio),
    },
    {
      name: "Cash to Assets",
      formula: "Cash / Total Assets",
      value: `${cashToAssets.toFixed(1)}%`,
      interpretation: interpretCashToAssets(cashToAssets),
    },
    {
      name: "Accounts Receivable to Assets",
      formula: "Accounts Receivable / Total Assets",
      value: `${arToAssets.toFixed(1)}%`,
      interpretation: interpretArToAssets(arToAssets),
    },
    {
      name: "AP to Revenue",
      formula: "Accounts Payable / Revenue",
      value: `${apToRevenue.toFixed(1)}%`,
      interpretation: interpretApToRevenue(apToRevenue),
    },
    {
      name: "Inventory to Total Assets",
      formula: "Inventory / Total Assets",
      value: `${inventoryToAssets.toFixed(1)}%`,
      interpretation: interpretInventoryToAssets(inventoryToAssets),
    },
    {
      name: "Working Capital Estimate",
      formula: "Current Assets - Current Liabilities",
      value: workingCapital !== null ? formatMoney(workingCapital) : "N/A",
      interpretation: interpretWorkingCapital(workingCapital, kpis.revenue),
    },
    {
      name: "DSO",
      formula: dsoOverride !== null ? "Accounts Receivable / Average Daily Sales" : "Accounts Receivable / (Revenue / Period Days)",
      value: dso !== null ? `${dso.toFixed(1)} days` : "N/A",
      interpretation: interpretDso(dso),
    },
    {
      name: "Inventory Turnover",
      formula: "COGS / Inventory",
      value: inventoryTurnover !== null ? `${inventoryTurnover.toFixed(2)}x` : "N/A",
      interpretation:
        inventoryTurnover !== null
          ? "Inventory turnover connects purchasing discipline to revenue activity and working capital velocity."
          : "Inventory data is needed to calculate turnover.",
    },
    {
      name: "AR Turnover",
      formula: "Revenue / Accounts Receivable",
      value: arTurnover !== null ? `${arTurnover.toFixed(2)}x` : "N/A",
      interpretation:
        arTurnover !== null
          ? "AR turnover indicates how efficiently revenue is converting into collections."
          : "Accounts receivable data is needed to calculate AR turnover.",
    },
    {
      name: "AP Turnover",
      formula: "COGS / Accounts Payable",
      value: apTurnover !== null ? `${apTurnover.toFixed(2)}x` : "N/A",
      interpretation:
        apTurnover !== null
          ? "AP turnover helps assess vendor payment cadence relative to direct cost activity."
          : "AP aging data is needed to calculate AP turnover.",
    },
    {
      name: "Cash Conversion Cycle",
      formula: "DSO + DIO - DPO",
      value: cashConversionCycle !== null ? `${cashConversionCycle.toFixed(1)} days` : "N/A",
      interpretation:
        cashConversionCycle !== null
          ? "Cash conversion cycle summarizes the time required to convert operating investment back into cash."
          : "DSO, inventory turnover, and AP turnover are needed for cash conversion cycle.",
    },
    {
      name: "Debt to Equity",
      formula: "Total Debt / Total Equity",
      value: debtMetrics.debtToEquity !== null ? `${debtMetrics.debtToEquity.toFixed(1)}%` : "N/A",
      interpretation:
        debtMetrics.debtToEquity !== null && debtMetrics.debtToEquity > 100
          ? "Leverage is elevated relative to equity. Review debt capacity, covenant risk, and repayment plans."
          : "Leverage appears manageable based on available equity data.",
    },
    {
      name: "Debt to Assets",
      formula: "Total Debt / Total Assets",
      value: debtMetrics.debtToAssets !== null ? `${debtMetrics.debtToAssets.toFixed(1)}%` : "N/A",
      interpretation:
        debtMetrics.debtToAssets !== null && debtMetrics.debtToAssets > 50
          ? "Debt funds a meaningful share of the asset base. Monitor liquidity and refinancing risk."
          : "Debt appears reasonable relative to total assets based on uploaded data.",
    },
    ...(includePayroll
      ? [
          {
            name: "Payroll Cost as % of Revenue",
            formula: "Total Payroll Cost / Revenue",
            value: payrollCostToRevenue !== null ? `${payrollCostToRevenue.toFixed(1)}%` : "N/A",
            interpretation: interpretPayrollCostToRevenue(payrollCostToRevenue),
          },
          {
            name: "Gross Wages as % of Revenue",
            formula: "Gross Wages / Revenue",
            value: grossWagesToRevenue !== null ? `${grossWagesToRevenue.toFixed(1)}%` : "N/A",
            interpretation: "Shows how much revenue is consumed by gross wages before employer taxes and benefits.",
          },
          {
            name: "Payroll Taxes as % of Gross Wages",
            formula: "Employer Payroll Taxes / Gross Wages",
            value: payrollTaxesToGrossWages !== null ? `${payrollTaxesToGrossWages.toFixed(1)}%` : "N/A",
            interpretation: "Use this to monitor employer tax burden relative to wage base.",
          },
          {
            name: "Payroll Cost per FTE",
            formula: "Total Payroll Cost / Total FTE",
            value: payrollCostPerFte !== null ? formatCurrency(payrollCostPerFte) : "N/A",
            interpretation: interpretPayrollCostPerFte(payrollCostPerFte),
          },
          {
            name: "Revenue per FTE",
            formula: "Revenue / Total FTE",
            value: revenuePerFte !== null ? formatCurrency(revenuePerFte) : "N/A",
            interpretation: interpretRevenuePerFte(revenuePerFte),
          },
          {
            name: "Gross Profit per FTE",
            formula: "Gross Profit / Total FTE",
            value: grossProfitPerFte !== null ? formatCurrency(grossProfitPerFte) : "N/A",
            interpretation: "Gross profit per FTE connects staffing levels to direct profitability.",
          },
          {
            name: "FTE Change %",
            formula: "(Current FTE - Prior FTE) / Prior FTE",
            value: fteChangePercent !== null ? `${fteChangePercent.toFixed(1)}%` : "N/A",
            interpretation: interpretFteChange(fteChangePercent),
          },
          {
            name: "Payroll Cost Change %",
            formula: "(Current Payroll Cost - Prior Payroll Cost) / Prior Payroll Cost",
            value: payrollCostChangePercent !== null ? `${payrollCostChangePercent.toFixed(1)}%` : "N/A",
            interpretation: interpretPayrollCostChange(payrollCostChangePercent),
          },
        ]
      : []),
  ];
}

function getGlAccounts(data: ParsedFile | null): FluxAccount[] {
  if (!data) return [];

  const headerIndex = data.rows.findIndex((row) =>
    row.some((cell) => {
      const text = normalizeHeader(cell);
      return text.includes("account") || text.includes("amount") || text.includes("balance");
    }),
  );
  const headers = data.rows[headerIndex] || [];
  const dataRows = headerIndex >= 0 ? data.rows.slice(headerIndex + 1) : data.rows;
  const accountNumberIndex = findHeaderIndex(headers, ["account number", "account #"]);
  const accountNameIndex = findAccountNameHeaderIndex(headers);
  const amountIndex = findHeaderIndex(headers, ["amount", "total"]);
  const debitIndex = findHeaderIndex(headers, ["debit", "debits", "dr"]);
  const creditIndex = findHeaderIndex(headers, ["credit", "credits", "cr"]);
  const balanceIndex = findHeaderIndex(headers, ["balance", "ending balance"]);
  const hasDebitCredit = debitIndex >= 0 || creditIndex >= 0;
  const hasBalanceColumn = balanceIndex >= 0;

  const accounts = new Map<string, FluxAccount>();

  dataRows.forEach((row) => {
    const fallbackLabel = String(row[0] || "").trim();
    const accountNumber =
      accountNumberIndex >= 0 ? String(row[accountNumberIndex] || "").trim() || "N/A" : "N/A";
    const accountName =
      String(row[accountNameIndex >= 0 ? accountNameIndex : 0] || "").trim() || fallbackLabel;
    const debit = parseNumber(row[debitIndex]) || 0;
    const credit = parseNumber(row[creditIndex]) || 0;
    const accountType = getAccountType(accountName);
    const balance = hasBalanceColumn ? parseNumber(row[balanceIndex]) : null;
    const activityAmount = getActivityAmount(
      {
        date: "",
        accountNumber,
        accountName,
        className: "",
        name: "",
        customer: "",
        vendor: "",
        payee: "",
        memo: "",
        description: "",
        debit,
        credit,
        amount: amountIndex >= 0 ? parseNumber(row[amountIndex]) || 0 : 0,
        balance: balance || 0,
      },
      accountType,
    );
    const basis = isBalanceSheetFluxAccount(accountType) ? "Ending Balance" : "Period Activity";
    const amount = hasDebitCredit ? activityAmount : amountIndex >= 0 ? parseNumber(row[amountIndex]) || 0 : activityAmount;

    if (!accountName || accountName.toLowerCase() === "total") return;
    if (!amount && balance === null) return;

    const key = normalizeStatementLabel(accountName);
    const existing = accounts.get(key);
    const warnings = existing?.warnings || [];
    if (accountType === "unknown" && !warnings.includes("Account type could not be identified.")) {
      warnings.push("Account type could not be identified.");
    }

    accounts.set(key, {
      accountNumber: existing?.accountNumber && existing.accountNumber !== "N/A" ? existing.accountNumber : accountNumber,
      accountName,
      amount: (existing?.amount || 0) + amount,
      accountType,
      basis,
      periodActivity: (existing?.periodActivity || 0) + activityAmount,
      endingBalance: balance !== null ? balance : existing?.endingBalance ?? null,
      hasBalanceColumn: Boolean(existing?.hasBalanceColumn || hasBalanceColumn),
      warnings,
    });
  });

  return [...accounts.values()];
}

function getAccountType(accountName: string): FluxAccountType {
  const normalized = normalizeStatementLabel(accountName);

  if (normalized.includes("other income") || normalized.includes("interest income") || normalized.includes("gain on")) {
    return "other-income";
  }
  if (normalized.includes("other expense") || normalized.includes("interest expense") || normalized.includes("loss on")) {
    return "other-expense";
  }
  if (normalized.includes("revenue") || normalized.includes("income") || normalized.includes("sales")) {
    return "revenue";
  }
  if (
    normalized.includes("cost of goods sold") ||
    normalized.includes("cogs") ||
    normalized.includes("cost of sales") ||
    normalized.includes("direct cost")
  ) {
    return "cogs";
  }
  if (
    normalized.includes("accounts receivable") ||
    normalized === "ar" ||
    normalized.includes("receivable") ||
    normalized.includes("cash") ||
    normalized.includes("bank") ||
    normalized.includes("checking") ||
    normalized.includes("savings") ||
    normalized.includes("inventory") ||
    normalized.includes("prepaid") ||
    normalized.includes("fixed asset") ||
    normalized.includes("equipment") ||
    normalized.includes("vehicle") ||
    normalized.includes("asset")
  ) {
    return "asset";
  }
  if (
    normalized.includes("accounts payable") ||
    normalized.includes("payable") ||
    normalized.includes("liabil") ||
    normalized.includes("credit card") ||
    normalized.includes("loan")
  ) {
    return "liability";
  }
  if (normalized.includes("equity") || normalized.includes("retained earnings") || normalized.includes("capital")) {
    return "equity";
  }
  if (
    normalized.includes("expense") ||
    normalized.includes("rent") ||
    normalized.includes("labor") ||
    normalized.includes("wage") ||
    normalized.includes("salary") ||
    normalized.includes("benefit") ||
    normalized.includes("payroll") ||
    normalized.includes("materials") ||
    normalized.includes("supplies") ||
    normalized.includes("utilities") ||
    normalized.includes("insurance")
  ) {
    return "expense";
  }

  return "unknown";
}

function isBalanceSheetFluxAccount(accountType: FluxAccountType) {
  return accountType === "asset" || accountType === "liability" || accountType === "equity";
}

function isIncomeStatementFluxAccount(accountType: FluxAccountType) {
  return (
    accountType === "revenue" ||
    accountType === "cogs" ||
    accountType === "expense" ||
    accountType === "other-income" ||
    accountType === "other-expense"
  );
}

function isPayrollRelatedAccount(accountName: string) {
  const normalized = normalizeStatementLabel(accountName);
  return ["payroll", "wage", "wages", "labor", "salary", "salaries", "fica", "medicare", "futa", "suta"].some(
    (term) => normalized.includes(term),
  );
}

function getActivityAmount(row: GlActivityRow, accountType: string) {
  if (
    accountType === "revenue" ||
    accountType === "other-income" ||
    accountType === "liability" ||
    accountType === "equity"
  ) {
    return row.credit - row.debit;
  }
  if (accountType === "expense" || accountType === "cogs" || accountType === "other-expense" || accountType === "asset") {
    return row.debit - row.credit;
  }
  if (row.debit || row.credit) return row.debit - row.credit;
  return row.amount;
}

function getAccountActivity(glData: ParsedFile | null, accountName: string): GlActivityRow[] {
  if (!glData) return [];

  const headerIndex = glData.rows.findIndex((row) =>
    row.some((cell) => {
      const text = normalizeHeader(cell);
      return text.includes("account") || text.includes("debit") || text.includes("credit") || text.includes("amount");
    }),
  );
  const headers = glData.rows[headerIndex] || [];
  const dataRows = headerIndex >= 0 ? glData.rows.slice(headerIndex + 1) : glData.rows;
  const dateIndex = findHeaderIndex(headers, ["date"]);
  const accountNumberIndex = findHeaderIndex(headers, ["account number", "account #"]);
  const accountNameIndex = findAccountNameHeaderIndex(headers);
  const nameIndex = findExactHeaderIndex(headers, ["Name"]);
  const employeeIndex = findHeaderIndex(headers, ["employee", "employee name"]);
  const customerIndex = findHeaderIndex(headers, ["customer"]);
  const vendorIndex = findHeaderIndex(headers, ["vendor"]);
  const payeeIndex = findHeaderIndex(headers, ["payee"]);
  const classIndex = findHeaderIndex(headers, ["class", "department", "division", "cost center", "location"]);
  const memoIndex = findHeaderIndex(headers, ["memo"]);
  const descriptionIndex = findHeaderIndex(headers, ["description"]);
  const debitIndex = findHeaderIndex(headers, ["debit", "debits", "dr"]);
  const creditIndex = findHeaderIndex(headers, ["credit", "credits", "cr"]);
  const amountIndex = findHeaderIndex(headers, ["amount"]);
  const balanceIndex = findHeaderIndex(headers, ["balance", "ending balance"]);
  const targetAccount = normalizeStatementLabel(accountName);
  const includeAllAccounts = targetAccount === "__all__";

  return dataRows
    .map((row) => {
      const fallbackLabel = String(row[0] || "").trim();
      const currentAccountName =
        String(row[accountNameIndex >= 0 ? accountNameIndex : 0] || "").trim() || fallbackLabel;

      return {
        date: String(row[dateIndex] || "").trim(),
        accountNumber: accountNumberIndex >= 0 ? String(row[accountNumberIndex] || "").trim() || "N/A" : "N/A",
        accountName: currentAccountName,
        className: String(row[classIndex] || "").trim(),
        name: String(row[employeeIndex >= 0 ? employeeIndex : nameIndex] || "").trim(),
        customer: String(row[customerIndex] || "").trim(),
        vendor: String(row[vendorIndex] || "").trim(),
        payee: String(row[payeeIndex] || "").trim(),
        memo: String(row[memoIndex] || "").trim(),
        description: String(row[descriptionIndex] || "").trim(),
        debit: parseNumber(row[debitIndex]) || 0,
        credit: parseNumber(row[creditIndex]) || 0,
        amount: parseNumber(row[amountIndex]) || 0,
        balance: parseNumber(row[balanceIndex]) || 0,
      };
    })
    .filter((row) => includeAllAccounts || normalizeStatementLabel(row.accountName) === targetAccount);
}

function getActivityDriver(row: GlActivityRow, accountType: string) {
  if (accountType === "revenue" || accountType === "other-income" || accountType === "asset") {
    return row.customer || row.name || row.payee || row.memo || row.description || "Unspecified activity";
  }
  if (
    accountType === "expense" ||
    accountType === "cogs" ||
    accountType === "other-expense" ||
    accountType === "liability"
  ) {
    return row.vendor || row.payee || row.name || row.memo || row.description || "Unspecified activity";
  }
  return row.name || row.payee || row.vendor || row.customer || row.memo || row.description || "Unspecified activity";
}

function groupActivityByDriver(rows: GlActivityRow[], accountType: string) {
  const totals = new Map<string, number>();

  rows.forEach((row) => {
    const driver = getActivityDriver(row, accountType);
    totals.set(driver, (totals.get(driver) || 0) + getActivityAmount(row, accountType));
  });

  return totals;
}

function calculateDriverVariance(currentRows: GlActivityRow[], priorRows: GlActivityRow[], accountType: string) {
  const currentTotals = groupActivityByDriver(currentRows, accountType);
  const priorTotals = groupActivityByDriver(priorRows, accountType);
  const drivers = new Set([...currentTotals.keys(), ...priorTotals.keys()]);

  return [...drivers]
    .map((name) => {
      const current = currentTotals.get(name) || 0;
      const prior = priorTotals.get(name) || 0;
      return { name, current, prior, change: current - prior };
    })
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 3);
}

function findComparableStatementAmount(data: ParsedFile | null, accountName: string) {
  const rows = getStatementRows(data);
  const target = normalizeStatementLabel(accountName);
  if (!target) return null;

  const exact = rows.find((row) => normalizeStatementLabel(row.label) === target);
  if (exact?.amount !== null && exact?.amount !== undefined) return exact.amount;

  const nonTotalTarget = target.replace(/^total\s+/, "");
  const loose = rows.find((row) => {
    const label = normalizeStatementLabel(row.label).replace(/^total\s+/, "");
    if (label.startsWith("total liabilities") || label.includes("liabilities and equity")) return false;
    return label === nonTotalTarget || label.includes(nonTotalTarget) || nonTotalTarget.includes(label);
  });

  return loose?.amount ?? null;
}

function resolveFluxAmount({
  account,
  comparisonData,
  fallbackBeginningData,
}: {
  account: FluxAccount | undefined;
  comparisonData?: ParsedFile | null;
  fallbackBeginningData?: ParsedFile | null;
}) {
  if (!account) return { amount: 0, warnings: [] as string[] };
  const warnings = [...account.warnings];

  if (isIncomeStatementFluxAccount(account.accountType)) {
    return { amount: account.periodActivity, warnings };
  }

  if (account.endingBalance !== null) {
    return { amount: account.endingBalance, warnings };
  }

  const comparisonBalance = findComparableStatementAmount(comparisonData || null, account.accountName);
  if (comparisonBalance !== null) {
    return { amount: comparisonBalance, warnings };
  }

  const beginningBalance = findComparableStatementAmount(fallbackBeginningData || null, account.accountName);
  if (beginningBalance !== null) {
    warnings.push("Balance Sheet flux is estimated from beginning balance plus GL net activity.");
    return { amount: beginningBalance + account.periodActivity, warnings };
  }

  warnings.push("Beginning balance is missing; Balance Sheet flux falls back to GL period activity.");
  if (!account.hasBalanceColumn) warnings.push("Balance column is missing and no Balance Sheet comparison amount was found.");
  return { amount: account.periodActivity, warnings };
}

function getGlDateSpanDays(data: ParsedFile | null) {
  const rows = getAccountActivity(data, "__all__");
  const dates = rows
    .map((row) => new Date(row.date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .map((date) => date.getTime());
  if (dates.length < 2) return null;
  return Math.round((Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24));
}

function getPeriodMismatchWarning(currentData: ParsedFile | null, priorData: ParsedFile | null) {
  const currentSpan = getGlDateSpanDays(currentData);
  const priorSpan = getGlDateSpanDays(priorData);
  if (currentSpan === null || priorSpan === null) return null;
  return Math.abs(currentSpan - priorSpan) > 10
    ? "Comparison periods may not match; verify month, quarter, or year GL files use the same basis."
    : null;
}

function getPayrollFluxDepartment(currentRows: GlActivityRow[], priorRows: GlActivityRow[]) {
  const departmentTotals = new Map<string, number>();

  [...currentRows, ...priorRows].forEach((row) => {
    const department = row.className || row.description || row.memo;
    if (!department) return;
    departmentTotals.set(department, (departmentTotals.get(department) || 0) + Math.abs(getActivityAmount(row, "expense")));
  });

  return [...departmentTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function getPayrollFteCommentary(
  accountName: string,
  currentRows: GlActivityRow[],
  priorRows: GlActivityRow[],
  payrollAnalysis?: PayrollAnalysis,
) {
  if (!payrollAnalysis || !isPayrollRelatedAccount(accountName)) return "";

  const department = getPayrollFluxDepartment(currentRows, priorRows);
  if (!department) return "";

  const normalizedDepartment = normalizeStatementLabel(department);
  const matchingDepartment = payrollAnalysis.rows.find((row) => {
    const normalizedRowDepartment = normalizeStatementLabel(row.department);
    return (
      normalizedRowDepartment === normalizedDepartment ||
      normalizedRowDepartment.includes(normalizedDepartment) ||
      normalizedDepartment.includes(normalizedRowDepartment)
    );
  });

  if (!matchingDepartment) return "";

  return ` Payroll/FTE analysis shows ${matchingDepartment.department} moved from ${formatFte(
    matchingDepartment.priorFte,
  )} to ${formatFte(matchingDepartment.currentFte)}, a change of ${formatFte(
    matchingDepartment.fteChange,
  )} FTE. Payroll cost changed by ${formatCurrency(
    matchingDepartment.payrollCostChange,
  )}, which appears to be a primary driver of the labor/payroll variance when aligned with the GL activity.`;
}

function generateFluxCommentary(
  accountName: string,
  basis: FluxBasis,
  currentAmount: number,
  priorAmount: number,
  variance: number,
  percentVariance: number | null,
  topDrivers: FluxDriver[],
  currentRows: GlActivityRow[] = [],
  priorRows: GlActivityRow[] = [],
  payrollAnalysis?: PayrollAnalysis,
) {
  const direction = variance > 0 ? "increased" : variance < 0 ? "decreased" : "was unchanged";
  const comparisonText = percentVariance === null ? "" : ` (${formatPercent(percentVariance)})`;
  const measureText = basis === "Ending Balance" ? "ending balance" : "period activity";

  if (!topDrivers.length || topDrivers.every((driver) => driver.name === "Unspecified activity")) {
    return `${accountName} ${measureText} ${direction} by ${formatCurrency(
      Math.abs(variance),
    )}${comparisonText}. Variance exceeded threshold, but vendor/customer detail was not available in the uploaded GL. Review account activity detail for support.${getPayrollFteCommentary(
      accountName,
      currentRows,
      priorRows,
      payrollAnalysis,
    )}`;
  }

  const [primary, secondary, tertiary] = topDrivers;
  const driverPhrases = [
    `${primary.name}, which ${primary.change >= 0 ? "increased" : "decreased"} by ${formatCurrency(
      Math.abs(primary.change),
    )}`,
    secondary
      ? `${secondary.name}, ${secondary.change >= 0 ? "up" : "down"} ${formatCurrency(Math.abs(secondary.change))}`
      : "",
    tertiary
      ? `${tertiary.name}, ${tertiary.change >= 0 ? "up" : "down"} ${formatCurrency(Math.abs(tertiary.change))}`
      : "",
  ].filter(Boolean);
  const accountType = getAccountType(accountName);
  const advisory =
    accountType === "revenue"
      ? "Review customer activity and project timing."
      : accountType === "ar"
        ? "Review collection timing and aging status."
        : accountType === "expense"
          ? "Review job costing, purchasing activity, and recurring spend."
          : accountType === "liability"
            ? "Review vendor obligations, payment timing, and supporting detail."
            : "Review account activity detail for support.";

  return `${accountName} ${measureText} ${direction} by ${formatCurrency(
    Math.abs(variance),
  )}${comparisonText}. The largest driver was ${driverPhrases.join(", followed by ")}. ${advisory}${getPayrollFteCommentary(
    accountName,
    currentRows,
    priorRows,
    payrollAnalysis,
  )}`;
}

function getFluxRows(
  currentData: ParsedFile | null,
  priorData: ParsedFile | null,
  settings: FluxSettings,
  payrollAnalysis?: PayrollAnalysis,
  currentBalanceData?: ParsedFile | null,
  priorBalanceData?: ParsedFile | null,
): FluxRow[] {
  const currentAccounts = getGlAccounts(currentData);
  const priorAccounts = getGlAccounts(priorData);
  const periodMismatchWarning = getPeriodMismatchWarning(currentData, priorData);
  const accountMap = new Map<string, { current?: FluxAccount; prior?: FluxAccount }>();

  currentAccounts.forEach((account) => {
    accountMap.set(normalizeStatementLabel(account.accountName), { current: account });
  });

  priorAccounts.forEach((account) => {
    const key = normalizeStatementLabel(account.accountName);
    accountMap.set(key, { ...accountMap.get(key), prior: account });
  });

  return [...accountMap.values()]
    .map(({ current, prior }) => {
      const accountName = current?.accountName || prior?.accountName || "Unknown Account";
      const accountType = current?.accountType || prior?.accountType || getAccountType(accountName);
      const basis: FluxBasis = isBalanceSheetFluxAccount(accountType) ? "Ending Balance" : "Period Activity";
      const currentResolved = resolveFluxAmount({
        account: current,
        comparisonData: currentBalanceData,
        fallbackBeginningData: priorBalanceData,
      });
      const priorResolved = resolveFluxAmount({
        account: prior,
        comparisonData: priorBalanceData,
      });
      const currentAmount = currentResolved.amount;
      const priorAmount = priorResolved.amount;
      const dollarVariance = currentAmount - priorAmount;
      const percentVariance = priorAmount ? (dollarVariance / Math.abs(priorAmount)) * 100 : null;
      const absoluteDollarVariance = Math.abs(dollarVariance);
      const absolutePercentVariance = Math.abs(percentVariance || 0);
      const dollarPass = absoluteDollarVariance >= settings.dollarThreshold;
      const percentPass = absolutePercentVariance >= settings.percentThreshold;
      const passes = settings.logic === "both" ? dollarPass && percentPass : dollarPass || percentPass;
      const isZeroActivity =
        (priorAmount === 0 && currentAmount > 0) || (currentAmount === 0 && priorAmount > 0);

      let flagReason = "Threshold exceeded";
      if (priorAmount === 0 && currentAmount > 0) flagReason = "New activity";
      if (currentAmount === 0 && priorAmount > 0) flagReason = "Activity stopped";

      let severity: FluxSeverity = "Low";
      if (absolutePercentVariance >= 25 && absoluteDollarVariance >= 10000) severity = "High";
      else if (absolutePercentVariance >= 10 && absoluteDollarVariance >= 5000) severity = "Moderate";
      const currentActivity = getAccountActivity(currentData, accountName);
      const priorActivity = getAccountActivity(priorData, accountName);
      const warnings = [...currentResolved.warnings, ...priorResolved.warnings];
      if (periodMismatchWarning) warnings.push(periodMismatchWarning);
      if (current && prior && current.basis !== prior.basis) {
        warnings.push("Income statement activity and balance sheet ending balance bases appear mixed for this account.");
      }
      const topDrivers = calculateDriverVariance(currentActivity, priorActivity, accountType);
      const topDriver = topDrivers[0]?.name || "N/A";
      const driverChange = topDrivers[0]?.change ?? null;

      return {
        accountNumber: current?.accountNumber || prior?.accountNumber || "N/A",
        accountName,
        accountType,
        basis,
        currentAmount,
        priorAmount,
        dollarVariance,
        percentVariance,
        direction: dollarVariance > 0 ? "Increase" : dollarVariance < 0 ? "Decrease" : "No change",
        severity,
        flagReason,
        topDriver,
        driverChange,
        commentary: generateFluxCommentary(
          accountName,
          basis,
          currentAmount,
          priorAmount,
          dollarVariance,
          percentVariance,
          topDrivers,
          currentActivity,
          priorActivity,
          payrollAnalysis,
        ),
        topDrivers,
        warnings,
        passes,
        isZeroActivity,
      };
    })
    .filter((row) => row.passes && (settings.includeZeroActivity || !row.isZeroActivity))
    .sort((a, b) => Math.abs(b.dollarVariance) - Math.abs(a.dollarVariance))
    .map(({ passes, isZeroActivity, ...row }) => row);
}

function getGlDataRows(data: ParsedFile | null) {
  if (!data) return [];

  const headerIndex = data.rows.findIndex((row) =>
    row.some((cell) => {
      const text = normalizeHeader(cell);
      return text.includes("account") || text.includes("debit") || text.includes("credit") || text.includes("amount");
    }),
  );

  return headerIndex >= 0 ? data.rows.slice(headerIndex + 1) : data.rows;
}

function buildFluxDebugInfo(
  currentData: ParsedFile | null,
  priorData: ParsedFile | null,
  rows: FluxRow[],
  settings: FluxSettings,
) {
  const currentAccounts = getGlAccounts(currentData);
  const priorAccounts = getGlAccounts(priorData);
  const accountKeys = new Set([
    ...currentAccounts.map((account) => normalizeStatementLabel(account.accountName)),
    ...priorAccounts.map((account) => normalizeStatementLabel(account.accountName)),
  ]);
  const variancesCalculated = accountKeys.size;
  const variancesPassingThreshold = [...accountKeys].filter((key) => {
    const current = currentAccounts.find((account) => normalizeStatementLabel(account.accountName) === key);
    const prior = priorAccounts.find((account) => normalizeStatementLabel(account.accountName) === key);
    const currentAmount = current?.amount || 0;
    const priorAmount = prior?.amount || 0;
    const dollarVariance = currentAmount - priorAmount;
    const percentVariance = priorAmount ? (dollarVariance / Math.abs(priorAmount)) * 100 : null;
    const dollarPass = Math.abs(dollarVariance) >= settings.dollarThreshold;
    const percentPass = Math.abs(percentVariance || 0) >= settings.percentThreshold;
    const passes = settings.logic === "both" ? dollarPass && percentPass : dollarPass || percentPass;
    const isZeroActivity =
      (priorAmount === 0 && currentAmount > 0) || (currentAmount === 0 && priorAmount > 0);
    return passes && (settings.includeZeroActivity || !isZeroActivity);
  }).length;

  return {
    currentRowsParsed: getGlDataRows(currentData).length,
    priorRowsParsed: getGlDataRows(priorData).length,
    accountsGrouped: accountKeys.size,
    variancesCalculated,
    variancesPassingThreshold: Math.max(variancesPassingThreshold, rows.length),
  };
}

export default function UploadPage() {
  const [packageTier, setPackageTier] = useState<PackageTier>("essential");
  const [hasSelectedPackage, setHasSelectedPackage] = useState(false);
  const [showImportReports, setShowImportReports] = useState(false);
  const [showCustomizePackage, setShowCustomizePackage] = useState(false);
  const [isPackageGenerated, setIsPackageGenerated] = useState(false);
  const [isPackageExported, setIsPackageExported] = useState(false);
  const [pdfReviewed, setPdfReviewed] = useState(false);
  const [kpisConfirmed, setKpisConfirmed] = useState(false);
  const [kpiReviewVisible, setKpiReviewVisible] = useState(false);
  const [showPdfGeneration, setShowPdfGeneration] = useState(false);
  const [showPowerPointStep, setShowPowerPointStep] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [clientName, setClientName] = useState("Client Company Name");
  const [clientReportingPeriod, setClientReportingPeriod] = useState("Current Reporting Period");
  const [clientIndustry, setClientIndustry] = useState("Industry not specified");
  const [companyTagline, setCompanyTagline] = useState("Board-ready financial package");
  const [preparedFor, setPreparedFor] = useState("Management / Ownership / Board Review");
  const [firmLogoPath, setFirmLogoPath] = useState("");
  const [firmLogoDataUrl, setFirmLogoDataUrl] = useState("");
  const [firmLogoFileName, setFirmLogoFileName] = useState("");
  const [confidentialWatermark, setConfidentialWatermark] = useState(true);
  const [preparedBy, setPreparedBy] = useState("FinSight Reports");
  const [saveSettingsForClient, setSaveSettingsForClient] = useState(false);
  const [selectedPdfSections, setSelectedPdfSections] = useState<PackageSectionId[]>(packageDefaultSections.essential);
  const [useSamePowerPointSelections, setUseSamePowerPointSelections] = useState(true);
  const [selectedPowerPointSections, setSelectedPowerPointSections] = useState<PackageSectionId[]>(packageDefaultSections.essential);
  const [selectedRatios, setSelectedRatios] = useState<RatioId[]>(getDefaultRatiosForPackage("essential"));
  const [selectedCharts, setSelectedCharts] = useState<ChartSelectionId[]>(packageDefaultCharts.essential);
  const [selectedFluxAnalyses, setSelectedFluxAnalyses] = useState<FluxAnalysisId[]>(["month", "quarter", "year"]);
  const [includeHighSeverityOnly, setIncludeHighSeverityOnly] = useState(false);
  const [includeModerateSeverity, setIncludeModerateSeverity] = useState(true);
  const [maxFluxRows, setMaxFluxRows] = useState(10);
  const [reportingPeriodStart, setReportingPeriodStart] = useState("");
  const [reportingPeriodEnd, setReportingPeriodEnd] = useState("");
  const [manualPeriodDays, setManualPeriodDays] = useState("");
  const [dsoMonthlyRevenue, setDsoMonthlyRevenue] = useState("");
  const [dsoPeriodDays, setDsoPeriodDays] = useState("");
  const [dsoAccountsReceivable, setDsoAccountsReceivable] = useState("");
  const [dsoAverageDailySales, setDsoAverageDailySales] = useState("");
  const [dsoConfirmed, setDsoConfirmed] = useState(false);
  const [dsoInputsChangedAfterConfirmation, setDsoInputsChangedAfterConfirmation] = useState(false);
  const [dsoInputOmitted, setDsoInputOmitted] = useState(false);
  const [reportsChangedAfterConfirmation, setReportsChangedAfterConfirmation] = useState(false);
  const [omittedReportIds, setOmittedReportIds] = useState<string[]>([]);
  const [plData, setPlData] = useState<ParsedFile | null>(null);
  const [bsData, setBsData] = useState<ParsedFile | null>(null);
  const [arData, setArData] = useState<ParsedFile | null>(null);
  const [apData, setApData] = useState<ParsedFile | null>(null);
  const [inventoryData, setInventoryData] = useState<ParsedFile | null>(null);
  const [customerSalesData, setCustomerSalesData] = useState<ParsedFile | null>(null);
  const [vendorExpenseData, setVendorExpenseData] = useState<ParsedFile | null>(null);
  const [fixedAssetData, setFixedAssetData] = useState<ParsedFile | null>(null);
  const [priorFixedAssetData, setPriorFixedAssetData] = useState<ParsedFile | null>(null);
  const [budgetVsActualData, setBudgetVsActualData] = useState<ParsedFile | null>(null);
  const [priorPeriodPlData, setPriorPeriodPlData] = useState<ParsedFile | null>(null);
  const [priorPeriodBsData, setPriorPeriodBsData] = useState<ParsedFile | null>(null);
  const [cashFlowData, setCashFlowData] = useState<ParsedFile | null>(null);
  const [debtScheduleData, setDebtScheduleData] = useState<ParsedFile | null>(null);
  const [currentMonthGlData, setCurrentMonthGlData] = useState<ParsedFile | null>(null);
  const [priorMonthGlData, setPriorMonthGlData] = useState<ParsedFile | null>(null);
  const [currentQuarterGlData, setCurrentQuarterGlData] = useState<ParsedFile | null>(null);
  const [priorQuarterGlData, setPriorQuarterGlData] = useState<ParsedFile | null>(null);
  const [currentYearGlData, setCurrentYearGlData] = useState<ParsedFile | null>(null);
  const [priorYearGlData, setPriorYearGlData] = useState<ParsedFile | null>(null);
  const [currentPayrollData, setCurrentPayrollData] = useState<ParsedFile | null>(null);
  const [priorPayrollData, setPriorPayrollData] = useState<ParsedFile | null>(null);
  const [currentPayrollDetailData, setCurrentPayrollDetailData] = useState<ParsedFile | null>(null);
  const [priorPayrollDetailData, setPriorPayrollDetailData] = useState<ParsedFile | null>(null);
  const [salesDetailData, setSalesDetailData] = useState<ParsedFile | null>(null);
  const [fteDivisor, setFteDivisor] = useState(173.33);
  const [folderImportResult, setFolderImportResult] = useState<FolderImportResult | null>(null);
  const [isFolderImporting, setIsFolderImporting] = useState(false);
  const [showPowerPointDraft, setShowPowerPointDraft] = useState(false);
  const [powerpointOmitted, setPowerpointOmitted] = useState(false);
  const [powerpointCreated, setPowerpointCreated] = useState(false);
  const [packageComplete, setPackageComplete] = useState(false);
  const [fluxSettings, setFluxSettings] = useState<FluxSettings>({
    dollarThreshold: 5000,
    percentThreshold: 10,
    logic: "either",
    includeZeroActivity: true,
  });
  const [uploadAccess, setUploadAccess] = useState<UploadAccess>({
    status: "checking",
    token: "",
    plan: null,
    reason: null,
  });

  const resetGeneratedState = () => {
    setIsPackageGenerated(false);
    setIsPackageExported(false);
    setPdfReviewed(false);
    setPowerpointOmitted(false);
    setPowerpointCreated(false);
    setPackageComplete(false);
    setShowPowerPointDraft(false);
    setShowPdfGeneration(false);
    setShowPowerPointStep(false);
    setKpiReviewVisible(false);
    if (kpisConfirmed) setReportsChangedAfterConfirmation(true);
    setKpisConfirmed(false);
  };
  const applyPackageEntitlement = (tier: PackageTier) => {
    setPackageTier(tier);
    setHasSelectedPackage(true);
    setSelectedPdfSections(packageDefaultSections[tier]);
    setSelectedPowerPointSections(tier === "essential" ? [] : packageDefaultSections[tier]);
    setSelectedRatios(entitlementRatios[tier]);
    setSelectedCharts(packageDefaultCharts[tier]);
    setSelectedFluxAnalyses(entitlementFluxAnalyses[tier]);
    setUseSamePowerPointSelections(tier !== "essential");
    if (tier === "essential") {
      setShowPowerPointStep(false);
      setPowerpointCreated(false);
      setPowerpointOmitted(true);
      setShowPowerPointDraft(false);
    }
  };

  useEffect(() => {
    const devBypassEnabled =
      process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("dev") === "true";

    if (devBypassEnabled) {
      applyPackageEntitlement("virtualCfo");
      setUploadAccess({ status: "allowed", token: "development-bypass", plan: "virtualCfo", reason: "trial" });
      return;
    }

    const token = window.localStorage.getItem("supabase_access_token");

    if (!token) {
      window.location.href = "/signin";
      return;
    }

    async function verifyAccess() {
      try {
        const response = await fetch("/api/check-trial", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await response.json();

        if (response.status === 401) {
          window.localStorage.removeItem("supabase_access_token");
          window.location.href = "/signin";
          return;
        }

        if (!response.ok) {
          setUploadAccess({ status: "blocked", token, plan: null, reason: result.error || "access_error" });
          return;
        }

        if (result.allowed === false && result.reason === "trial_expired") {
          window.location.href = "/dashboard";
          return;
        }

        if (result.allowed !== true) {
          setUploadAccess({ status: "blocked", token, plan: null, reason: result.reason || "not_allowed" });
          return;
        }

        const plan =
          result.reason === "subscriber"
            ? result.subscription_plan || STRIPE_PRICE_TO_PACKAGE_TIER[result.subscription_price_id as string] || "essential"
            : "virtualCfo";
        applyPackageEntitlement(plan);
        setUploadAccess({ status: "allowed", token, plan, reason: result.reason });
      } catch {
        setUploadAccess({ status: "blocked", token, plan: null, reason: "access_check_failed" });
      }
    }

    verifyAccess();
    // Entitlement should be checked once when entering the upload workflow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isReportOmitted = (reportId: string) => omittedReportIds.includes(reportId);
  const setReportOmitted = (reportId: string, omitted: boolean) => {
    resetGeneratedState();
    setOmittedReportIds((current) =>
      omitted ? [...new Set([...current, reportId])] : current.filter((id) => id !== reportId),
    );
  };
  const removeReport = (setData: (data: ParsedFile | null) => void, reportId: string) => {
    resetGeneratedState();
    setData(null);
    setOmittedReportIds((current) => current.filter((id) => id !== reportId));
  };

  const parseFile = async (file: File, setData: (data: ParsedFile) => void) => {
    resetGeneratedState();
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      await new Promise<void>((resolve, reject) => {
        Papa.parse(file, {
          complete: (result) => {
            setData({ name: file.name, rows: result.data as unknown[][] });
            resolve();
          },
          error: reject,
        });
      });
    } else if (extension === "xlsx" || extension === "xls") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { cellFormula: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = extractRowsFromWorksheet(sheet);

      setData({ name: file.name, rows });
    } else {
      alert("Please upload a CSV or Excel file.");
    }
  };

  const uploadReports: UploadReport[] = [
    {
      id: "pl",
      tier: "essential",
      label: "Profit and Loss",
      description:
        "Export the QuickBooks Profit and Loss report. Used to calculate revenue, COGS, gross profit, expenses, and net income.",
      required: true,
      omitted: isReportOmitted("pl"),
      data: plData,
      onFile: (file) => parseFile(file, setPlData),
      onRemove: () => removeReport(setPlData, "pl"),
      onOmitChange: (omitted) => setReportOmitted("pl", omitted),
    },
    {
      id: "bs",
      tier: "essential",
      label: "Balance Sheet",
      description:
        "Export the QuickBooks Balance Sheet report. Used to calculate cash, receivables, assets, equity, and liquidity metrics.",
      required: true,
      omitted: isReportOmitted("bs"),
      data: bsData,
      onFile: (file) => parseFile(file, setBsData),
      onRemove: () => removeReport(setBsData, "bs"),
      onOmitChange: (omitted) => setReportOmitted("bs", omitted),
    },
    {
      id: "ar",
      tier: "essential",
      label: "Accounts Receivable Aging Summary",
      description:
        "Export the QuickBooks Accounts Receivable Aging Summary report. Supports receivables review, collections, and DSO commentary.",
      required: false,
      omitted: isReportOmitted("ar"),
      data: arData,
      onFile: (file) => parseFile(file, setArData),
      onRemove: () => removeReport(setArData, "ar"),
      onOmitChange: (omitted) => setReportOmitted("ar", omitted),
    },
    {
      id: "ap",
      tier: "essential",
      label: "Accounts Payable Aging Summary",
      description:
        "Export the QuickBooks Accounts Payable Aging Summary report. Supports payables review, vendor obligations, and working capital analysis.",
      required: false,
      omitted: isReportOmitted("ap"),
      data: apData,
      onFile: (file) => parseFile(file, setApData),
      onRemove: () => removeReport(setApData, "ap"),
      onOmitChange: (omitted) => setReportOmitted("ap", omitted),
    },
    {
      id: "inventory",
      tier: "professional",
      label: "Inventory Valuation Summary",
      description:
        "Export the QuickBooks Inventory Valuation Summary report. Adds inventory value, quantity on hand, and top item analytics.",
      required: false,
      omitted: isReportOmitted("inventory"),
      data: inventoryData,
      onFile: (file) => parseFile(file, setInventoryData),
      onRemove: () => removeReport(setInventoryData, "inventory"),
      onOmitChange: (omitted) => setReportOmitted("inventory", omitted),
    },
    {
      id: "customers",
      tier: "professional",
      label: "Sales by Customer Summary",
      description:
        "Export the QuickBooks Sales by Customer Summary report. Adds top customer visibility and customer concentration commentary.",
      required: false,
      omitted: isReportOmitted("customers"),
      data: customerSalesData,
      onFile: (file) => parseFile(file, setCustomerSalesData),
      onRemove: () => removeReport(setCustomerSalesData, "customers"),
      onOmitChange: (omitted) => setReportOmitted("customers", omitted),
    },
    {
      id: "vendors",
      tier: "professional",
      label: "Expenses by Vendor Summary",
      description:
        "Export the QuickBooks Expenses by Vendor Summary report. Adds vendor concentration and expense category analysis.",
      required: false,
      omitted: isReportOmitted("vendors"),
      data: vendorExpenseData,
      onFile: (file) => parseFile(file, setVendorExpenseData),
      onRemove: () => removeReport(setVendorExpenseData, "vendors"),
      onOmitChange: (omitted) => setReportOmitted("vendors", omitted),
    },
    {
      id: "fixed-assets",
      tier: "virtualCfo",
      label: "Fixed Asset Detail / Fixed Asset Register",
      description:
        "Export the QuickBooks Fixed Asset Detail or Fixed Asset Register report. Adds fixed asset, depreciation, and net book value analysis.",
      required: false,
      omitted: isReportOmitted("fixed-assets"),
      data: fixedAssetData,
      onFile: (file) => parseFile(file, setFixedAssetData),
      onRemove: () => removeReport(setFixedAssetData, "fixed-assets"),
      onOmitChange: (omitted) => setReportOmitted("fixed-assets", omitted),
    },
    {
      id: "prior-fixed-assets",
      tier: "virtualCfo",
      label: "Prior Period Fixed Asset Report",
      description:
        "Export the prior period QuickBooks Fixed Asset Detail or Fixed Asset Register report. Used to calculate additions, disposals, depreciation change, and net book value movement.",
      required: false,
      omitted: isReportOmitted("prior-fixed-assets"),
      data: priorFixedAssetData,
      onFile: (file) => parseFile(file, setPriorFixedAssetData),
      onRemove: () => removeReport(setPriorFixedAssetData, "prior-fixed-assets"),
      onOmitChange: (omitted) => setReportOmitted("prior-fixed-assets", omitted),
    },
    {
      id: "budget",
      tier: "virtualCfo",
      label: "Budget vs. Actuals",
      description:
        "Export the QuickBooks Budget vs. Actuals report. Supports variance analysis and budget performance review.",
      required: false,
      omitted: isReportOmitted("budget"),
      data: budgetVsActualData,
      onFile: (file) => parseFile(file, setBudgetVsActualData),
      onRemove: () => removeReport(setBudgetVsActualData, "budget"),
      onOmitChange: (omitted) => setReportOmitted("budget", omitted),
    },
    {
      id: "current-payroll",
      tier: "professional",
      label: "Current Month Payroll Summary by Department",
      description:
        "Export the current month QuickBooks payroll summary by Department, Class, Location, Cost Center, or Division. Used to calculate FTE and payroll cost trends.",
      required: false,
      omitted: isReportOmitted("current-payroll"),
      data: currentPayrollData,
      onFile: (file) => parseFile(file, setCurrentPayrollData),
      onRemove: () => removeReport(setCurrentPayrollData, "current-payroll"),
      onOmitChange: (omitted) => setReportOmitted("current-payroll", omitted),
    },
    {
      id: "prior-payroll",
      tier: "professional",
      label: "Prior Month Payroll Summary by Department",
      description:
        "Export the prior month QuickBooks payroll summary by Department, Class, Location, Cost Center, or Division. Used as the comparison period for payroll FTE analysis.",
      required: false,
      omitted: isReportOmitted("prior-payroll"),
      data: priorPayrollData,
      onFile: (file) => parseFile(file, setPriorPayrollData),
      onRemove: () => removeReport(setPriorPayrollData, "prior-payroll"),
      onOmitChange: (omitted) => setReportOmitted("prior-payroll", omitted),
    },
    {
      id: "current-payroll-detail",
      tier: "professional",
      label: "Current Month Payroll Detail",
      description:
        "Export the current month QuickBooks payroll GL detail or payroll detail report. Used as supporting detail for payroll review.",
      required: false,
      omitted: isReportOmitted("current-payroll-detail"),
      data: currentPayrollDetailData,
      onFile: (file) => parseFile(file, setCurrentPayrollDetailData),
      onRemove: () => removeReport(setCurrentPayrollDetailData, "current-payroll-detail"),
      onOmitChange: (omitted) => setReportOmitted("current-payroll-detail", omitted),
    },
    {
      id: "prior-payroll-detail",
      tier: "professional",
      label: "Prior Month Payroll Detail",
      description:
        "Export the prior month QuickBooks payroll GL detail or payroll detail report. Used as supporting comparison detail for payroll review.",
      required: false,
      omitted: isReportOmitted("prior-payroll-detail"),
      data: priorPayrollDetailData,
      onFile: (file) => parseFile(file, setPriorPayrollDetailData),
      onRemove: () => removeReport(setPriorPayrollDetailData, "prior-payroll-detail"),
      onOmitChange: (omitted) => setReportOmitted("prior-payroll-detail", omitted),
    },
    {
      id: "prior-pl",
      tier: "virtualCfo",
      label: "Profit and Loss Comparison",
      description:
        "Export the QuickBooks Profit and Loss Comparison report. Supports trend, variance, and period-over-period comparison.",
      required: false,
      omitted: isReportOmitted("prior-pl"),
      data: priorPeriodPlData,
      onFile: (file) => parseFile(file, setPriorPeriodPlData),
      onRemove: () => removeReport(setPriorPeriodPlData, "prior-pl"),
      onOmitChange: (omitted) => setReportOmitted("prior-pl", omitted),
    },
    {
      id: "prior-bs",
      tier: "virtualCfo",
      label: "Balance Sheet Comparison",
      description:
        "Export the QuickBooks Balance Sheet Comparison report. Supports balance sheet movement and working capital comparison.",
      required: false,
      omitted: isReportOmitted("prior-bs"),
      data: priorPeriodBsData,
      onFile: (file) => parseFile(file, setPriorPeriodBsData),
      onRemove: () => removeReport(setPriorPeriodBsData, "prior-bs"),
      onOmitChange: (omitted) => setReportOmitted("prior-bs", omitted),
    },
    {
      id: "cash-flow",
      tier: "virtualCfo",
      label: "Statement of Cash Flows",
      description:
        "Export the QuickBooks Statement of Cash Flows report. Supports cash flow review and CFO-level liquidity commentary.",
      required: false,
      omitted: isReportOmitted("cash-flow"),
      data: cashFlowData,
      onFile: (file) => parseFile(file, setCashFlowData),
      onRemove: () => removeReport(setCashFlowData, "cash-flow"),
      onOmitChange: (omitted) => setReportOmitted("cash-flow", omitted),
    },
    {
      id: "debt",
      tier: "virtualCfo",
      label: "Debt Schedule / Loan Detail",
      description:
        "Export a QuickBooks loan detail report or your debt schedule. Supports debt analysis, risk indicators, and leverage commentary.",
      required: false,
      omitted: isReportOmitted("debt"),
      data: debtScheduleData,
      onFile: (file) => parseFile(file, setDebtScheduleData),
      onRemove: () => removeReport(setDebtScheduleData, "debt"),
      onOmitChange: (omitted) => setReportOmitted("debt", omitted),
    },
    {
      id: "current-month-gl",
      tier: "essential",
      label: "General Ledger - Current Month",
      description:
        "Export the QuickBooks General Ledger for the current month. Used for month-over-month flux analysis.",
      required: false,
      omitted: isReportOmitted("current-month-gl"),
      data: currentMonthGlData,
      onFile: (file) => parseFile(file, setCurrentMonthGlData),
      onRemove: () => removeReport(setCurrentMonthGlData, "current-month-gl"),
      onOmitChange: (omitted) => setReportOmitted("current-month-gl", omitted),
    },
    {
      id: "prior-month-gl",
      tier: "essential",
      label: "General Ledger - Prior Month",
      description:
        "Export the QuickBooks General Ledger for the prior month. Used as the comparison period for monthly flux analysis.",
      required: false,
      omitted: isReportOmitted("prior-month-gl"),
      data: priorMonthGlData,
      onFile: (file) => parseFile(file, setPriorMonthGlData),
      onRemove: () => removeReport(setPriorMonthGlData, "prior-month-gl"),
      onOmitChange: (omitted) => setReportOmitted("prior-month-gl", omitted),
    },
    {
      id: "current-quarter-gl",
      tier: "professional",
      label: "General Ledger - Current Quarter",
      description:
        "Export the QuickBooks General Ledger for the current quarter. Used for quarter-over-quarter flux analysis.",
      required: false,
      omitted: isReportOmitted("current-quarter-gl"),
      data: currentQuarterGlData,
      onFile: (file) => parseFile(file, setCurrentQuarterGlData),
      onRemove: () => removeReport(setCurrentQuarterGlData, "current-quarter-gl"),
      onOmitChange: (omitted) => setReportOmitted("current-quarter-gl", omitted),
    },
    {
      id: "prior-quarter-gl",
      tier: "professional",
      label: "General Ledger - Prior Quarter",
      description:
        "Export the QuickBooks General Ledger for the prior quarter. Used as the comparison period for quarterly flux analysis.",
      required: false,
      omitted: isReportOmitted("prior-quarter-gl"),
      data: priorQuarterGlData,
      onFile: (file) => parseFile(file, setPriorQuarterGlData),
      onRemove: () => removeReport(setPriorQuarterGlData, "prior-quarter-gl"),
      onOmitChange: (omitted) => setReportOmitted("prior-quarter-gl", omitted),
    },
    {
      id: "current-year-gl",
      tier: "professional",
      label: "General Ledger - Current Year",
      description:
        "Export the QuickBooks General Ledger for the current year. Used for year-over-year flux analysis.",
      required: false,
      omitted: isReportOmitted("current-year-gl"),
      data: currentYearGlData,
      onFile: (file) => parseFile(file, setCurrentYearGlData),
      onRemove: () => removeReport(setCurrentYearGlData, "current-year-gl"),
      onOmitChange: (omitted) => setReportOmitted("current-year-gl", omitted),
    },
    {
      id: "prior-year-gl",
      tier: "professional",
      label: "General Ledger - Prior Year",
      description:
        "Export the QuickBooks General Ledger for the prior year. Used as the comparison period for annual flux analysis.",
      required: false,
      omitted: isReportOmitted("prior-year-gl"),
      data: priorYearGlData,
      onFile: (file) => parseFile(file, setPriorYearGlData),
      onRemove: () => removeReport(setPriorYearGlData, "prior-year-gl"),
      onOmitChange: (omitted) => setReportOmitted("prior-year-gl", omitted),
    },
  ].map((report, _index, reports) => ({
    ...report,
    required: isReportRequiredForOpenRequirement(report.id, packageTier, reports),
  }));
  const selectedReports = uploadReports.filter((report) =>
    isReportAvailable(report.tier, packageTier) || isReportRequiredForPackage(report.id, packageTier),
  );
  const uploadedReportsCount = selectedReports.filter(
    (report) => report.data && !report.omitted,
  ).length;
  const packageRequirementStatuses = getPackageRequirementStatuses(packageTier, uploadReports);
  const requiredUploadedReportsCount = packageRequirementStatuses.filter(
    (requirement) => requirement.resolved,
  ).length;
  const missingReports = packageRequirementStatuses.filter((requirement) => !requirement.resolved);
  const requiredUploadsComplete =
    hasSelectedPackage && packageRequirementStatuses.length > 0 && missingReports.length === 0;
  const kpisAvailable = requiredUploadsComplete;
  const canPreviewPackage = isPackageGenerated;

  const activePlData = isReportOmitted("pl") ? null : plData;
  const activeBsData = isReportOmitted("bs") ? null : bsData;
  const activeArData = isReportOmitted("ar") ? null : arData;
  const activeApData = isReportOmitted("ap") ? null : apData;
  const activeInventoryData = isReportOmitted("inventory") ? null : inventoryData;
  const activeCustomerSalesData = isReportOmitted("customers") ? null : customerSalesData;
  const activeVendorExpenseData = isReportOmitted("vendors") ? null : vendorExpenseData;
  const activeFixedAssetData = isReportOmitted("fixed-assets") ? null : fixedAssetData;
  const activePriorFixedAssetData = isReportOmitted("prior-fixed-assets") ? null : priorFixedAssetData;
  const activeBudgetVsActualData = isReportOmitted("budget") ? null : budgetVsActualData;
  const activePriorPeriodPlData = isReportOmitted("prior-pl") ? null : priorPeriodPlData;
  const activePriorPeriodBsData = isReportOmitted("prior-bs") ? null : priorPeriodBsData;
  const activeCashFlowData = isReportOmitted("cash-flow") ? null : cashFlowData;
  const activeDebtScheduleData = isReportOmitted("debt") ? null : debtScheduleData;
  const activeCurrentMonthGlData = isReportOmitted("current-month-gl") ? null : currentMonthGlData;
  const activePriorMonthGlData = isReportOmitted("prior-month-gl") ? null : priorMonthGlData;
  const activeCurrentQuarterGlData = isReportOmitted("current-quarter-gl") ? null : currentQuarterGlData;
  const activePriorQuarterGlData = isReportOmitted("prior-quarter-gl") ? null : priorQuarterGlData;
  const activeCurrentYearGlData = isReportOmitted("current-year-gl") ? null : currentYearGlData;
  const activePriorYearGlData = isReportOmitted("prior-year-gl") ? null : priorYearGlData;
  const activeCurrentPayrollData = isReportOmitted("current-payroll") ? null : currentPayrollData;
  const activePriorPayrollData = isReportOmitted("prior-payroll") ? null : priorPayrollData;
  const activeCurrentPayrollDetailData = isReportOmitted("current-payroll-detail") ? null : currentPayrollDetailData;
  const activePriorPayrollDetailData = isReportOmitted("prior-payroll-detail") ? null : priorPayrollDetailData;

  const kpis = calculateKPIs(activePlData, activeBsData);
  const netMargin = kpis.revenue ? (kpis.netIncome / kpis.revenue) * 100 : 0;
  const autoPeriodDays = calculatePeriodDays(reportingPeriodStart, reportingPeriodEnd);
  const manualPeriodDaysValue = parseNumber(manualPeriodDays);
  const reportingPeriodDays =
    manualPeriodDaysValue && manualPeriodDaysValue > 0 ? manualPeriodDaysValue : autoPeriodDays;
  const automaticDso = calculateDso(kpis, reportingPeriodDays);
  const dsoAccountsReceivableValue = parseNumber(dsoAccountsReceivable);
  const dsoMonthlyRevenueValue = parseNumber(dsoMonthlyRevenue);
  const dsoPeriodDaysValue = parseNumber(dsoPeriodDays);
  const dsoAverageDailySalesValue = parseNumber(dsoAverageDailySales);
  const salesDetailRevenue = calculateSalesDetailRevenue(salesDetailData);
  const dsoRevenueForOptionOne = dsoMonthlyRevenueValue || kpis.revenue || null;
  const dsoAccountsReceivableUsed = dsoAccountsReceivableValue || kpis.accountsReceivable || 0;
  const averageDailySalesFromOptionOne =
    dsoRevenueForOptionOne && dsoPeriodDaysValue ? dsoRevenueForOptionOne / dsoPeriodDaysValue : null;
  const averageDailySalesFromReportingPeriod =
    dsoRevenueForOptionOne && reportingPeriodDays ? dsoRevenueForOptionOne / reportingPeriodDays : null;
  const averageDailySalesFromSalesDetail =
    salesDetailRevenue && reportingPeriodDays ? salesDetailRevenue / reportingPeriodDays : null;
  const resolvedAverageDailySales =
    averageDailySalesFromOptionOne ||
    dsoAverageDailySalesValue ||
    averageDailySalesFromSalesDetail ||
    averageDailySalesFromReportingPeriod;
  const dsoPreview =
    automaticDso ??
    calculateDsoFromAverageDailySales(
      { ...kpis, accountsReceivable: dsoAccountsReceivableUsed },
      resolvedAverageDailySales,
    );
  const dsoRatioSelected = selectedRatios.includes("DSO");
  const dsoInputNeeded = requiredUploadsComplete && dsoRatioSelected && kpis.accountsReceivable > 0;
  const dsoInputResolved = !dsoInputNeeded || dsoConfirmed || dsoInputOmitted;
  const missingInputsRemaining = dsoInputResolved ? 0 : 1;
  const resolvedInputsCount = dsoInputNeeded && dsoInputResolved ? 1 : 0;
  const missingInputsResolved = requiredUploadsComplete && missingInputsRemaining === 0;
  const canReviewKpis = showCustomizePackage && missingInputsResolved;
  const showKpiReview = canReviewKpis && kpiReviewVisible;
  const canGeneratePackage = uploadAccess.status === "allowed" && canReviewKpis && kpisAvailable && kpisConfirmed;
  const dso = dsoConfirmed && !dsoInputOmitted ? dsoPreview : null;
  const activeWorkflowStep = !hasSelectedPackage || !showImportReports
    ? 1
    : !showCustomizePackage
      ? 2
      : !kpiReviewVisible
        ? 3
        : !kpisConfirmed
          ? 4
          : !showPdfGeneration
            ? 4
            : !isPackageGenerated || !pdfReviewed || (packageTier !== "essential" && !showPowerPointStep)
              ? 5
              : !powerpointCreated && !powerpointOmitted
                ? 6
                : !packageComplete
                  ? 7
                  : 0;
  const arKpis = calculateAgingKpis(activeArData);
  const apKpis = calculateAPKpis(activeApData);
  const inventoryKpis = calculateInventoryKpis(activeInventoryData);
  const fixedAssetKpis = calculateFixedAssetKpis(activeFixedAssetData, kpis.totalAssets, activePlData);
  const priorFixedAssetKpis = calculateFixedAssetKpis(activePriorFixedAssetData, kpis.totalAssets, null);
  const fixedAssetChangeRows = getFixedAssetChangeRows(fixedAssetKpis, priorFixedAssetKpis);
  const bsStatementRows = getStatementRows(activeBsData);
  const reportPeriod = clientReportingPeriod || "Current Reporting Period";
  const companyName = clientName || "Client Company Name";
  const payrollAnalysis = calculatePayrollAnalysis(activeCurrentPayrollData, activePriorPayrollData, fteDivisor);
  const rawMonthFluxRows = getFluxRows(
    activeCurrentMonthGlData,
    activePriorMonthGlData,
    fluxSettings,
    payrollAnalysis,
    activeBsData,
    activePriorPeriodBsData,
  );
  const rawQuarterFluxRows = getFluxRows(
    activeCurrentQuarterGlData,
    activePriorQuarterGlData,
    fluxSettings,
    payrollAnalysis,
    activeBsData,
    activePriorPeriodBsData,
  );
  const rawYearFluxRows = getFluxRows(
    activeCurrentYearGlData,
    activePriorYearGlData,
    fluxSettings,
    payrollAnalysis,
    activeBsData,
    activePriorPeriodBsData,
  );
  const monthFluxRows = selectedFluxAnalyses.includes("month")
    ? filterSelectedFluxRows(rawMonthFluxRows, includeHighSeverityOnly, includeModerateSeverity, maxFluxRows)
    : [];
  const quarterFluxRows = selectedFluxAnalyses.includes("quarter")
    ? filterSelectedFluxRows(rawQuarterFluxRows, includeHighSeverityOnly, includeModerateSeverity, maxFluxRows)
    : [];
  const yearFluxRows = selectedFluxAnalyses.includes("year")
    ? filterSelectedFluxRows(rawYearFluxRows, includeHighSeverityOnly, includeModerateSeverity, maxFluxRows)
    : [];
  const monthFluxDebug = buildFluxDebugInfo(activeCurrentMonthGlData, activePriorMonthGlData, monthFluxRows, fluxSettings);
  const quarterFluxDebug = buildFluxDebugInfo(activeCurrentQuarterGlData, activePriorQuarterGlData, quarterFluxRows, fluxSettings);
  const yearFluxDebug = buildFluxDebugInfo(activeCurrentYearGlData, activePriorYearGlData, yearFluxRows, fluxSettings);
  const budgetMetrics = calculateBudgetMetrics(activeBudgetVsActualData);
  const debtMetrics = calculateDebtMetrics(activeDebtScheduleData, kpis, bsStatementRows);
  const ratioRows = buildRatioRows(
    kpis,
    netMargin,
    bsStatementRows,
    apKpis,
    inventoryKpis,
    reportingPeriodDays,
    payrollAnalysis,
    Boolean(activeCurrentPayrollData),
    debtMetrics,
    dso,
  ).filter((ratio) => selectedRatios.includes(ratio.name as RatioId));
  const executiveSummary = buildExecutiveSummary({
    kpis,
    netMargin,
    bsRows: bsStatementRows,
    arKpis,
    apKpis,
    inventoryKpis,
    fixedAssetKpis,
    fixedAssetChangeRows,
    payrollAnalysis,
    monthFluxRows,
    quarterFluxRows,
    yearFluxRows,
    budgetMetrics,
    debtMetrics,
    dso,
    includeAr: Boolean(activeArData),
    includeAp: Boolean(activeApData),
    includeInventory: Boolean(activeInventoryData),
    includeFixedAssets: Boolean(activeFixedAssetData),
    includePayroll: Boolean(activeCurrentPayrollData),
    includeBudget: Boolean(activeBudgetVsActualData),
    includeDebt: Boolean(activeDebtScheduleData),
  });
  const boardPackageSections = buildBoardPackageSections({
    packageTier,
    reports: uploadReports,
    hasExecutiveSummary: Boolean(executiveSummary.sections.length),
    hasFinancialSnapshot: Boolean(activePlData || activeBsData),
    hasRatios: ratioRows.length > 0,
    hasFollowUps: executiveSummary.followUpItems.length > 0,
    hasAnyFlux: monthFluxRows.length > 0 || quarterFluxRows.length > 0 || yearFluxRows.length > 0,
  }).filter((section) => {
    const matchingOption = packageSectionOptions.find((option) => option.label === section.title);
    if (!matchingOption && section.title === "Financial Performance Snapshot") {
      return selectedPdfSections.includes("kpi-snapshot");
    }
    if (!matchingOption && section.title === "AR and AP Aging") {
      return selectedPdfSections.includes("ar-aging") || selectedPdfSections.includes("ap-aging");
    }
    if (!matchingOption && section.title === "Debt Schedule / Loan Detail") {
      return selectedPdfSections.includes("debt-schedule");
    }
    if (!matchingOption && section.title === "Month-over-Month Flux Analysis") {
      return selectedPdfSections.includes("month-flux");
    }
    if (!matchingOption && section.title === "Quarter-over-Quarter Flux Analysis") {
      return selectedPdfSections.includes("quarter-flux");
    }
    if (!matchingOption && section.title === "Year-over-Year Flux Analysis") {
      return selectedPdfSections.includes("year-flux");
    }
    return matchingOption ? selectedPdfSections.includes(matchingOption.id) : true;
  });
  const effectivePowerPointSections = selectedPdfSections;
  const powerPointSlides = createPowerPointSlidesData({
    companyName,
    reportPeriod,
    preparedBy: preparedBy || "FinSight Reports",
    kpis,
    executiveSummary,
    arKpis,
    apKpis,
    inventoryKpis,
    fixedAssetKpis,
    payrollAnalysis,
    ratioRows,
    topRevenueRows: getTopRevenueRows(activePlData),
    topExpenseRows: getTopOperatingExpenseRows(activePlData),
    budgetMetrics,
    debtMetrics,
    monthFluxRows,
    quarterFluxRows,
    yearFluxRows,
    includeInventory: Boolean(activeInventoryData),
    includePayroll: Boolean(activeCurrentPayrollData),
    includeFixedAssets: Boolean(activeFixedAssetData),
  }).filter((slide) => {
    const slideSection = slide.sectionType;
    if (slideSection === "title") return true;
    return effectivePowerPointSections.includes(slideSection);
  });
  const handlePackageTierChange = (tier: PackageTier) => {
    if (uploadAccess.reason === "subscriber" && uploadAccess.plan && tier !== uploadAccess.plan) {
      alert(`Your subscription includes the ${PACKAGE_LABELS[uploadAccess.plan]} package.`);
      applyPackageEntitlement(uploadAccess.plan);
      return;
    }
    applyPackageEntitlement(tier);
    setShowImportReports(false);
    setShowCustomizePackage(false);
    setIsPackageGenerated(false);
    setIsPackageExported(false);
    setPdfReviewed(false);
    setPowerpointOmitted(false);
    setPowerpointCreated(false);
    setPackageComplete(false);
    setShowPowerPointDraft(false);
    setKpisConfirmed(false);
    setKpiReviewVisible(false);
    setReportsChangedAfterConfirmation(false);
  };
  const handleSaveClientSettings = () => {
    if (!clientName.trim()) {
      alert("Enter a client name before saving settings.");
      return;
    }
    const settings: ClientPackageSettings = {
      packageTier,
      pdfSections: selectedPdfSections,
      powerpointSections: selectedPowerPointSections,
      selectedRatios,
      selectedCharts,
      selectedFluxAnalyses,
      fluxSettings,
      includeHighSeverityOnly,
      includeModerateSeverity,
      maxFluxRows,
      useSamePowerPointSelections,
      clientIndustry,
      companyTagline,
      preparedFor,
      firmLogoPath,
      firmLogoDataUrl,
      firmLogoFileName,
      confidentialWatermark,
    };
    window.localStorage.setItem(getClientSettingsKey(clientName), JSON.stringify(settings));
    setSaveSettingsForClient(true);
  };
  const handleLoadClientSettings = () => {
    if (!clientName.trim()) {
      alert("Enter a client name before loading settings.");
      return;
    }
    const rawSettings = window.localStorage.getItem(getClientSettingsKey(clientName));
    if (!rawSettings) {
      alert("No saved settings found for this client.");
      return;
    }
    const settings = JSON.parse(rawSettings) as ClientPackageSettings;
    const settingsTier = settings.packageTier || packageTier;
    const allowedTier = uploadAccess.reason === "subscriber" && uploadAccess.plan ? uploadAccess.plan : settingsTier;
    const allowedSections = new Set(packageDefaultSections[allowedTier]);
    setPackageTier(allowedTier);
    setSelectedPdfSections((settings.pdfSections || packageDefaultSections[allowedTier]).filter((section) => allowedSections.has(section)));
    setSelectedPowerPointSections(
      allowedTier === "essential"
        ? []
        : (settings.powerpointSections || settings.pdfSections || packageDefaultSections[allowedTier]).filter((section) =>
            allowedSections.has(section),
          ),
    );
    setSelectedRatios(
      (settings.selectedRatios || entitlementRatios[allowedTier]).filter((ratio) =>
        entitlementRatios[allowedTier].includes(ratio),
      ),
    );
    setSelectedCharts(settings.selectedCharts || packageDefaultCharts[allowedTier]);
    setSelectedFluxAnalyses(
      (settings.selectedFluxAnalyses || entitlementFluxAnalyses[allowedTier]).filter((flux) =>
        entitlementFluxAnalyses[allowedTier].includes(flux),
      ),
    );
    setFluxSettings(settings.fluxSettings || fluxSettings);
    setIncludeHighSeverityOnly(settings.includeHighSeverityOnly ?? false);
    setIncludeModerateSeverity(settings.includeModerateSeverity ?? true);
    setMaxFluxRows(settings.maxFluxRows || 10);
    setUseSamePowerPointSelections(settings.useSamePowerPointSelections ?? true);
    setClientIndustry(settings.clientIndustry || "Industry not specified");
    setCompanyTagline(settings.companyTagline || "Board-ready financial package");
    setPreparedFor(settings.preparedFor || "Management / Ownership / Board Review");
    setFirmLogoPath(allowedTier === "virtualCfo" ? settings.firmLogoPath || "" : "");
    setFirmLogoDataUrl(allowedTier === "virtualCfo" ? settings.firmLogoDataUrl || "" : "");
    setFirmLogoFileName(allowedTier === "virtualCfo" ? settings.firmLogoFileName || "" : "");
    setConfidentialWatermark(settings.confidentialWatermark ?? true);
    setHasSelectedPackage(true);
    resetGeneratedState();
  };
  const handleResetPackageDefaults = () => {
    setSelectedPdfSections(packageDefaultSections[packageTier]);
    setSelectedPowerPointSections(packageTier === "essential" ? [] : packageDefaultSections[packageTier]);
    setSelectedRatios(entitlementRatios[packageTier]);
    setSelectedCharts(packageDefaultCharts[packageTier]);
    setSelectedFluxAnalyses(entitlementFluxAnalyses[packageTier]);
    setIncludeHighSeverityOnly(false);
    setIncludeModerateSeverity(true);
    setMaxFluxRows(10);
    setClientIndustry("Industry not specified");
    setCompanyTagline("Board-ready financial package");
    setPreparedFor("Management / Ownership / Board Review");
    setFirmLogoPath("");
    setFirmLogoDataUrl("");
    setFirmLogoFileName("");
    setConfidentialWatermark(true);
    resetGeneratedState();
  };
  const handleFirmLogoFileChange = (file: File | null) => {
    resetGeneratedState();
    if (!file) {
      setFirmLogoDataUrl("");
      setFirmLogoFileName("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFirmLogoDataUrl(typeof reader.result === "string" ? reader.result : "");
      setFirmLogoFileName(file.name);
    };
    reader.readAsDataURL(file);
  };
  const handleDsoInputChanged = () => {
    resetGeneratedState();
    if (dsoConfirmed) setDsoInputsChangedAfterConfirmation(true);
    setDsoConfirmed(false);
    setDsoInputOmitted(false);
  };
  const handleConfirmDso = () => {
    if (dsoPreview === null) return;
    setDsoConfirmed(true);
    setDsoInputOmitted(false);
    setDsoInputsChangedAfterConfirmation(false);
    setKpiReviewVisible(false);
    window.setTimeout(() => scrollToWorkflowSection("missing-inputs"), 50);
  };
  const handleEditDsoInputs = () => {
    if (dsoConfirmed) setDsoInputsChangedAfterConfirmation(true);
    setDsoConfirmed(false);
  };
  const handleOmitDso = () => {
    resetGeneratedState();
    setDsoInputOmitted(true);
    setDsoConfirmed(false);
    setDsoInputsChangedAfterConfirmation(false);
    setKpiReviewVisible(false);
    setSelectedRatios((current) => current.filter((ratio) => ratio !== "DSO"));
    window.setTimeout(() => scrollToWorkflowSection("missing-inputs"), 50);
  };
  const handleContinueToKpiReview = () => {
    if (!canReviewKpis) return;
    setKpiReviewVisible(true);
    window.setTimeout(() => scrollToWorkflowSection("kpi-review"), 50);
  };
  const handleContinueToPdfGeneration = () => {
    if (!kpisConfirmed) return;
    setShowPdfGeneration(true);
    window.setTimeout(() => scrollToWorkflowSection("pdf-review"), 50);
  };
  const handleContinueToPowerPoint = () => {
    if (!pdfReviewed) return;
    setShowPowerPointStep(true);
    window.setTimeout(() => scrollToWorkflowSection("powerpoint-section"), 50);
  };
  const handleContinueToUploadReports = () => {
    setShowImportReports(true);
    window.setTimeout(() => scrollToWorkflowSection("upload-reports"), 50);
  };
  const handleContinueToCustomizePackage = () => {
    if (!requiredUploadsComplete) return;
    setShowCustomizePackage(true);
    window.setTimeout(() => scrollToWorkflowSection("missing-inputs"), 50);
  };
  const handleFteDivisorChange = (value: number) => {
    resetGeneratedState();
    setFteDivisor(value);
  };
  const handleGeneratePackage = async () => {
    if (!canGeneratePackage) return;
    setIsPackageGenerated(true);
    setIsPackageExported(false);
    setPdfReviewed(false);
    setPowerpointOmitted(false);
    setPowerpointCreated(false);
    setPackageComplete(false);
    setShowPowerPointDraft(false);
    setShowPowerPointStep(false);
    if (uploadAccess.reason === "trial") {
      try {
        const response = await fetch("/api/mark-trial-used", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${uploadAccess.token}`,
          },
        });
        if (!response.ok) {
          alert("Your report was generated, but the trial could not be locked. Please sign in again before creating another report.");
        }
      } catch {
        alert("Your report was generated, but the trial could not be locked. Please sign in again before creating another report.");
      }
    }
  };
  const handleExportPackage = () => {
    setIsPackageExported(true);
    window.print();
  };
  const handlePdfReviewedChange = (reviewed: boolean) => {
    if (reviewed && !isPackageGenerated) return;
    setPdfReviewed(reviewed);
    if (reviewed && packageTier === "essential") {
      setShowPowerPointStep(false);
      setPowerpointOmitted(true);
      setPowerpointCreated(false);
      setShowPowerPointDraft(false);
      return;
    }
    if (!reviewed) {
      setIsPackageExported(false);
      setShowPowerPointStep(false);
      setPowerpointOmitted(false);
      setPowerpointCreated(false);
      setPackageComplete(false);
      setShowPowerPointDraft(false);
    }
  };
  const handleCreatePowerPoint = () => {
    if (!pdfReviewed) return;
    if (uploadAccess.plan === "essential") {
      alert("PowerPoint export is available on Professional and Virtual CFO plans.");
      return;
    }
    downloadPowerPointDeck(
      powerPointSlides,
      companyName,
      reportPeriod,
      preparedBy || "FinSight Reports",
      packageTier === "virtualCfo" ? firmLogoPath : "",
      packageTier === "virtualCfo" ? firmLogoDataUrl : "",
    );
    setShowPowerPointDraft(true);
    setPowerpointCreated(true);
    setPowerpointOmitted(false);
  };
  const handleOmitPowerPoint = () => {
    if (!pdfReviewed) return;
    setPowerpointOmitted(true);
    setPowerpointCreated(false);
    setShowPowerPointDraft(false);
  };
  const handleResetPowerPointChoice = () => {
    setPowerpointOmitted(false);
    setPowerpointCreated(false);
    setPackageComplete(false);
    setShowPowerPointDraft(false);
  };
  const handleCompletePackage = () => {
    if (!pdfReviewed || (!powerpointCreated && !powerpointOmitted)) return;
    setPackageComplete(true);
  };
  const handleStartNewClient = () => {
    const startingTier = uploadAccess.reason === "subscriber" && uploadAccess.plan ? uploadAccess.plan : "essential";
    setPackageTier(startingTier);
    setHasSelectedPackage(false);
    setShowImportReports(false);
    setShowCustomizePackage(false);
    setIsPackageGenerated(false);
    setIsPackageExported(false);
    setPdfReviewed(false);
    setKpisConfirmed(false);
    setKpiReviewVisible(false);
    setShowPdfGeneration(false);
    setShowPowerPointStep(false);
    setReviewerNotes("");
    setClientName("Client Company Name");
    setClientReportingPeriod("Current Reporting Period");
    setClientIndustry("Industry not specified");
    setCompanyTagline("Board-ready financial package");
    setPreparedFor("Management / Ownership / Board Review");
    setFirmLogoPath("");
    setFirmLogoDataUrl("");
    setFirmLogoFileName("");
    setConfidentialWatermark(true);
    setPreparedBy("FinSight Reports");
    setSaveSettingsForClient(false);
    setSelectedPdfSections(packageDefaultSections[startingTier]);
    setSelectedPowerPointSections(startingTier === "essential" ? [] : packageDefaultSections[startingTier]);
    setUseSamePowerPointSelections(startingTier !== "essential");
    setSelectedRatios(entitlementRatios[startingTier]);
    setSelectedCharts(packageDefaultCharts[startingTier]);
    setSelectedFluxAnalyses(entitlementFluxAnalyses[startingTier]);
    setIncludeHighSeverityOnly(false);
    setIncludeModerateSeverity(true);
    setMaxFluxRows(10);
    setReportingPeriodStart("");
    setReportingPeriodEnd("");
    setManualPeriodDays("");
    setDsoMonthlyRevenue("");
    setDsoPeriodDays("");
    setDsoAccountsReceivable("");
    setDsoAverageDailySales("");
    setDsoConfirmed(false);
    setDsoInputsChangedAfterConfirmation(false);
    setDsoInputOmitted(false);
    setReportsChangedAfterConfirmation(false);
    setOmittedReportIds([]);
    setPlData(null);
    setBsData(null);
    setArData(null);
    setApData(null);
    setInventoryData(null);
    setCustomerSalesData(null);
    setVendorExpenseData(null);
    setFixedAssetData(null);
    setPriorFixedAssetData(null);
    setBudgetVsActualData(null);
    setPriorPeriodPlData(null);
    setPriorPeriodBsData(null);
    setCashFlowData(null);
    setDebtScheduleData(null);
    setCurrentMonthGlData(null);
    setPriorMonthGlData(null);
    setCurrentQuarterGlData(null);
    setPriorQuarterGlData(null);
    setCurrentYearGlData(null);
    setPriorYearGlData(null);
    setCurrentPayrollData(null);
    setPriorPayrollData(null);
    setCurrentPayrollDetailData(null);
    setPriorPayrollDetailData(null);
    setSalesDetailData(null);
    setFolderImportResult(null);
    setIsFolderImporting(false);
    setShowPowerPointDraft(false);
    setPowerpointOmitted(false);
    setPowerpointCreated(false);
    setPackageComplete(false);
    setFluxSettings({
      dollarThreshold: 5000,
      percentThreshold: 10,
      logic: "either",
      includeZeroActivity: true,
    });
    window.setTimeout(() => scrollToWorkflowSection("package-selection"), 50);
  };
  const handleBackWorkflowStep = () => {
    if (activeWorkflowStep === 7) {
      setPackageComplete(false);
      window.setTimeout(() => scrollToWorkflowSection("powerpoint-section"), 50);
      return;
    }
    if (activeWorkflowStep === 6) {
      setShowPowerPointStep(false);
      setPowerpointCreated(false);
      setPowerpointOmitted(false);
      setShowPowerPointDraft(false);
      window.setTimeout(() => scrollToWorkflowSection("pdf-review"), 50);
      return;
    }
    if (activeWorkflowStep === 5) {
      setShowPdfGeneration(false);
      setIsPackageGenerated(false);
      setIsPackageExported(false);
      setPdfReviewed(false);
      window.setTimeout(() => scrollToWorkflowSection("kpi-review"), 50);
      return;
    }
    if (activeWorkflowStep === 4) {
      setKpiReviewVisible(false);
      window.setTimeout(() => scrollToWorkflowSection("missing-inputs"), 50);
      return;
    }
    if (activeWorkflowStep === 3) {
      setShowCustomizePackage(false);
      window.setTimeout(() => scrollToWorkflowSection("upload-reports"), 50);
      return;
    }
    if (activeWorkflowStep === 2) {
      setShowImportReports(false);
      window.setTimeout(() => scrollToWorkflowSection("package-selection"), 50);
    }
  };
  const importFolderFiles = async (files: File[]) => {
    const availableReports = selectedReports.filter((report) => !report.omitted);
    const supportedFiles = files.filter(isSupportedImportFile);
    const unsupportedFiles = files.filter((file) => !isSupportedImportFile(file)).map((file) => file.name);
    const matchesByReport = new Map<string, { report: UploadReport; files: File[] }>();
    const unmatchedFiles = [...unsupportedFiles];

    supportedFiles.forEach((file) => {
      const matchedReport = getBestReportMatch(file, availableReports);
      if (!matchedReport) {
        unmatchedFiles.push(file.name);
        return;
      }

      const currentMatch = matchesByReport.get(matchedReport.id) || { report: matchedReport, files: [] };
      currentMatch.files.push(file);
      matchesByReport.set(matchedReport.id, currentMatch);
    });

    const matchedFiles: FolderImportResult["matchedFiles"] = [];
    const duplicateMatches: FolderImportResult["duplicateMatches"] = [];
    const loadedReportIds = new Set<string>();

    for (const { report, files: matchedReportFiles } of matchesByReport.values()) {
      const [fileToLoad, ...duplicates] = matchedReportFiles;
      if (!fileToLoad) continue;

      await report.onFile(fileToLoad);
      loadedReportIds.add(report.id);
      matchedFiles.push({ reportLabel: report.label, fileName: fileToLoad.name });

      if (duplicates.length) {
        duplicateMatches.push({
          reportLabel: report.label,
          fileNames: matchedReportFiles.map((file) => file.name),
        });
      }
    }

    const postImportReports = selectedReports.map((report) =>
      loadedReportIds.has(report.id) ? { ...report, data: report.data || { name: "Imported", rows: [] } } : report,
    );
    const missingRequiredReports = getPackageRequirementStatuses(packageTier, postImportReports)
      .filter((requirement) => !requirement.resolved)
      .map((requirement) => requirement.label);

    setFolderImportResult({
      matchedFiles,
      unmatchedFiles,
      duplicateMatches,
      missingRequiredReports,
    });
  };
  const handleFallbackFolderFiles = async (files: File[]) => {
    setIsFolderImporting(true);
    try {
      await importFolderFiles(files);
    } finally {
      setIsFolderImporting(false);
    }
  };
  const handleImportFromFolder = async () => {
    const picker = (window as typeof window & {
      showDirectoryPicker?: () => Promise<{
        entries: () => AsyncIterable<[string, { kind: string; getFile?: () => Promise<File> }]>;
      }>;
    }).showDirectoryPicker;

    if (!picker) return false;

    setIsFolderImporting(true);
    try {
      const directoryHandle = await picker();
      const files: File[] = [];

      for await (const [, entry] of directoryHandle.entries()) {
        if (entry.kind === "file" && entry.getFile) {
          files.push(await entry.getFile());
        }
      }

      await importFolderFiles(files);
      return true;
    } catch (error) {
      if ((error as { name?: string }).name !== "AbortError") {
        setFolderImportResult({
          matchedFiles: [],
          unmatchedFiles: [],
          duplicateMatches: [],
          missingRequiredReports: selectedReports
            .length
            ? getPackageRequirementStatuses(packageTier, selectedReports)
                .filter((requirement) => !requirement.resolved)
                .map((requirement) => requirement.label)
            : [],
        });
      }
      return true;
    } finally {
      setIsFolderImporting(false);
    }
  };

  if (uploadAccess.status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B1020] px-6 text-white">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center shadow-2xl shadow-black/30">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">Checking Access</p>
          <h1 className="mt-3 text-2xl font-bold">Verifying your FinSight session</h1>
          <p className="mt-2 text-sm text-slate-400">You will be redirected if sign-in or subscription action is needed.</p>
        </div>
      </main>
    );
  }

  if (uploadAccess.status === "blocked") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B1020] px-6 text-white">
        <div className="max-w-lg rounded-3xl border border-red-500/30 bg-slate-950/80 p-8 text-center shadow-2xl shadow-black/30">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">Access Blocked</p>
          <h1 className="mt-3 text-2xl font-bold">We could not verify report access</h1>
          <p className="mt-2 text-sm text-slate-400">
            Please sign in again or choose a plan from your dashboard. Reason: {uploadAccess.reason}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <a href="/signin" className="rounded-2xl bg-[#5B8CFF] px-5 py-3 text-sm font-bold text-white">
              Sign In
            </a>
            <a href="/dashboard" className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-200">
              Dashboard
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <style jsx global>{`
        .chart-card {
          animation: chartFadeIn 500ms ease-out both;
        }

        @keyframes chartFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        #package-selection,
        #import-action-bar,
        #upload-reports,
        #manual-upload-reports,
        #missing-inputs,
        #kpi-review,
        #pdf-generation,
        #pdf-review,
        #powerpoint-section {
          scroll-margin-top: 200px;
        }

        .workflow-section {
          scroll-margin-top: 240px;
        }

        @media print {
          body {
            background: white !important;
          }

          .app-screen {
            display: none !important;
          }

          .print-package {
            display: block !important;
            background: white !important;
            color: #111827 !important;
            font-family: Arial, sans-serif;
          }

          .print-page {
            min-height: 100vh;
            padding: 48px;
            page-break-after: always;
            break-after: page;
            page-break-before: auto;
            break-before: auto;
          }

          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .print-page h1 {
            margin-bottom: 8px;
            font-size: 30px;
            color: #111827;
          }

          .print-page h2 {
            margin-top: 28px;
            margin-bottom: 12px;
            font-size: 22px;
            color: #1f2937;
          }

          .print-page h3 {
            margin-top: 22px;
            margin-bottom: 10px;
            font-size: 17px;
            color: #1f2937;
          }

          .print-page p,
          .print-page li {
            font-size: 13px;
            line-height: 1.6;
            color: #374151;
          }

          .print-report-meta,
          .print-grid,
          .print-executive-card-grid,
          .print-cover-hero,
          .print-cover-topline,
          .print-narrative-card,
          .print-commentary-grid,
          .print-two-column,
          .print-kpi-card,
          .print-table,
          .print-section-block,
          .print-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-page h1,
          .print-page h2,
          .print-page h3,
          .statement-header {
            break-after: avoid;
            page-break-after: avoid;
          }

          .print-cover-page {
            position: relative;
            overflow: hidden;
            background: linear-gradient(135deg, #0f172a 0%, #172033 48%, #eef2ff 48%, #ffffff 100%) !important;
          }

          .print-confidential-watermark {
            position: absolute;
            top: 44%;
            left: 8%;
            transform: rotate(-18deg);
            color: rgba(91, 140, 255, 0.08);
            font-size: 76px;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .print-cover-topline {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 46px;
          }

          .print-logo-box,
          .print-client-logo-box {
            min-width: 148px;
            border: 1px solid rgba(255, 255, 255, 0.22);
            border-radius: 16px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.1);
            color: #ffffff;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .print-client-logo-box {
            background: #ffffff;
            color: #334155;
            border-color: #cbd5e1;
          }

          .print-cover-hero {
            margin-bottom: 30px;
            color: #ffffff;
          }

          .print-eyebrow {
            color: #bfdbfe !important;
            font-size: 11px !important;
            font-weight: 800;
            letter-spacing: 0.16em;
            text-transform: uppercase;
          }

          .print-cover-hero h1 {
            max-width: 560px;
            margin: 8px 0;
            color: #ffffff;
            font-size: 44px;
            line-height: 1.05;
          }

          .print-cover-subtitle,
          .print-cover-period {
            color: #dbeafe !important;
            font-size: 15px !important;
          }

          .print-cover-meta-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            max-width: 680px;
            margin-top: 22px;
          }

          .print-cover-meta-grid span {
            border: 1px solid rgba(255, 255, 255, 0.22);
            border-radius: 999px;
            padding: 8px 12px;
            background: rgba(15, 23, 42, 0.44);
            color: #eff6ff;
            font-size: 11px;
            font-weight: 700;
          }

          .print-executive-card-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
            margin: 34px 0;
          }

          .print-executive-summary-grid,
          .print-commentary-grid,
          .print-two-column {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .print-narrative-card {
            margin-top: 14px;
            border: 1px solid #dbe3ef;
            border-radius: 14px;
            padding: 14px;
            background: #f8fafc;
          }

          .print-dashboard-card {
            border: 1px solid #1e293b;
            border-radius: 16px;
            padding: 16px;
            background: #0f172a;
            color: #ffffff;
          }

          .print-dashboard-card p {
            color: #cbd5e1 !important;
          }

          .print-dashboard-card strong {
            display: block;
            margin: 8px 0 12px;
            color: #ffffff;
            font-size: 22px;
          }

          .print-dashboard-label {
            font-size: 10px !important;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .print-section-intro,
          .print-commentary {
            margin: 8px 0 14px;
            color: #475569 !important;
          }

          .print-compact-table {
            font-size: 11px;
          }

          .print-aging-bar-track {
            width: 100%;
            height: 8px;
            overflow: hidden;
            border-radius: 999px;
            background: #e2e8f0;
          }

          .print-aging-bar {
            display: block;
            height: 100%;
            border-radius: 999px;
          }

          .print-aging-good {
            background: #10b981;
          }

          .print-aging-watch {
            background: #f59e0b;
          }

          .print-aging-risk {
            background: #f97316;
          }

          .print-aging-critical {
            background: #ef4444;
          }

          .print-report-meta {
            margin-bottom: 28px;
            padding-bottom: 18px;
            border-bottom: 2px solid #1d4ed8;
          }

          .print-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
          }

          .print-kpi-card {
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 10px;
            background: #f9fafb;
          }

          .print-kpi-card span {
            display: block;
            margin-bottom: 3px;
            font-size: 10px;
            color: #6b7280;
          }

          .print-kpi-card strong {
            font-size: 15px;
            color: #111827;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 12px;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #d1d5db;
            padding: 9px;
            text-align: left;
            vertical-align: top;
          }

          .print-table th {
            background: #f3f4f6;
            font-weight: 700;
            color: #111827;
          }

          .statement-header {
            break-after: avoid;
            page-break-after: avoid;
            margin-bottom: 16px;
          }

          .statement-table {
            break-inside: auto;
            page-break-inside: auto;
          }

          .statement-table thead {
            display: table-header-group;
          }

          .statement-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-statement-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12.5px;
          }

          .print-statement-table th {
            padding: 10px 0;
            border-bottom: 2px solid #111827;
            color: #111827;
            font-weight: 700;
            text-align: left;
          }

          .print-statement-table th:last-child,
          .print-statement-table td:last-child {
            text-align: right;
            font-variant-numeric: tabular-nums;
          }

          .print-statement-table td {
            padding: 7px 0;
            border-bottom: 1px solid #e5e7eb;
            color: #111827;
          }

          .print-statement-section td {
            padding-top: 20px;
            padding-bottom: 7px;
            border-bottom: 1px solid #9ca3af;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .print-statement-detail td:first-child {
            padding-left: 24px;
            color: #374151;
          }

          .print-statement-subtotal td {
            border-top: 1px solid #9ca3af;
            border-bottom: 1px solid #d1d5db;
            background: #f9fafb;
            font-weight: 600;
          }

          .print-statement-calculated-value td {
            border-top: 1px solid #9ca3af;
            border-bottom: 1px solid #d1d5db;
            background: #f8fafc;
            font-weight: 700;
          }

          .print-statement-major-total td {
            padding-top: 10px;
            padding-bottom: 10px;
            border-top: 2px solid #111827;
            border-bottom: 1px solid #6b7280;
            background: #eef2ff;
            font-weight: 800;
          }

          .print-statement-grand-total td {
            padding-top: 11px;
            padding-bottom: 11px;
            border-top: 3px solid #111827;
            border-bottom: 2px solid #111827;
            background: #e5e7eb;
            font-size: 13.5px;
            font-weight: 900;
            text-transform: uppercase;
          }
        }
      `}</style>

      <main className="app-screen min-h-screen bg-[#0B1020] px-6 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <ImportWorkflow
            packageTier={packageTier}
            hasSelectedPackage={hasSelectedPackage}
            showImportReports={showImportReports}
            showCustomizePackage={showCustomizePackage}
            activeWorkflowStep={activeWorkflowStep}
            onPackageTierChange={handlePackageTierChange}
            reports={uploadReports}
            uploadedReportsCount={uploadedReportsCount}
            requiredUploadedReportsCount={requiredUploadedReportsCount}
            totalRequiredReportsCount={packageRequirementStatuses.length}
            missingReports={missingReports}
            requiredUploadsComplete={requiredUploadsComplete}
            missingInputsResolved={missingInputsResolved}
            missingInputsRemaining={missingInputsRemaining}
            resolvedInputsCount={resolvedInputsCount}
            kpisConfirmed={kpisConfirmed}
            kpiReviewVisible={kpiReviewVisible}
            showPdfGeneration={showPdfGeneration}
            showPowerPointStep={showPowerPointStep}
            reviewerNotes={reviewerNotes}
            reportsChangedAfterConfirmation={reportsChangedAfterConfirmation}
            canGeneratePackage={canGeneratePackage}
            isPackageGenerated={isPackageGenerated}
            isPackageExported={isPackageExported}
            pdfReviewed={pdfReviewed}
            powerpointOmitted={powerpointOmitted}
            powerpointCreated={powerpointCreated}
            packageComplete={packageComplete}
            folderImportResult={folderImportResult}
            isFolderImporting={isFolderImporting}
            onImportFromFolder={handleImportFromFolder}
            onImportFolderFallbackFiles={handleFallbackFolderFiles}
            onGeneratePackage={handleGeneratePackage}
            onContinueToUploadReports={handleContinueToUploadReports}
            onContinueToCustomizePackage={handleContinueToCustomizePackage}
            onContinueToKpiReview={handleContinueToKpiReview}
            onContinueToPdfGeneration={handleContinueToPdfGeneration}
            onContinueToPowerPoint={handleContinueToPowerPoint}
            onKpisConfirmedChange={(confirmed) => {
              setKpisConfirmed(confirmed);
              if (confirmed) setReportsChangedAfterConfirmation(false);
              if (!confirmed) {
                setShowPdfGeneration(false);
                setShowPowerPointStep(false);
                setIsPackageGenerated(false);
                setIsPackageExported(false);
                setPdfReviewed(false);
                setPowerpointOmitted(false);
                setPowerpointCreated(false);
                setPackageComplete(false);
                setShowPowerPointDraft(false);
              }
            }}
            onReviewerNotesChange={setReviewerNotes}
            onExportPackage={handleExportPackage}
            onPdfReviewedChange={handlePdfReviewedChange}
            onCreatePowerPoint={handleCreatePowerPoint}
            onOmitPowerPoint={handleOmitPowerPoint}
            onResetPowerPointChoice={handleResetPowerPointChoice}
            onCompletePackage={handleCompletePackage}
            onStartNewClient={handleStartNewClient}
            onBackWorkflowStep={handleBackWorkflowStep}
          >

          {activeWorkflowStep === 3 && showCustomizePackage && (
            <PackageCustomizationPanel
              packageTier={packageTier}
              reports={uploadReports}
              clientName={clientName}
              reportingPeriod={clientReportingPeriod}
              clientIndustry={clientIndustry}
              companyTagline={companyTagline}
              preparedFor={preparedFor}
              firmLogoPath={firmLogoPath}
              firmLogoDataUrl={firmLogoDataUrl}
              firmLogoFileName={firmLogoFileName}
              confidentialWatermark={confidentialWatermark}
              preparedBy={preparedBy}
              saveSettingsForClient={saveSettingsForClient}
              selectedPdfSections={selectedPdfSections}
              useSamePowerPointSelections={useSamePowerPointSelections}
              selectedPowerPointSections={selectedPowerPointSections}
              selectedRatios={selectedRatios}
              selectedCharts={selectedCharts}
              selectedFluxAnalyses={selectedFluxAnalyses}
              fluxSettings={fluxSettings}
              includeHighSeverityOnly={includeHighSeverityOnly}
              includeModerateSeverity={includeModerateSeverity}
              maxFluxRows={maxFluxRows}
              onClientNameChange={(value) => {
                resetGeneratedState();
                setClientName(value);
              }}
              onReportingPeriodChange={(value) => {
                resetGeneratedState();
                setClientReportingPeriod(value);
              }}
              onClientIndustryChange={(value) => {
                resetGeneratedState();
                setClientIndustry(value);
              }}
              onCompanyTaglineChange={(value) => {
                resetGeneratedState();
                setCompanyTagline(value);
              }}
              onPreparedForChange={(value) => {
                resetGeneratedState();
                setPreparedFor(value);
              }}
              onFirmLogoPathChange={(value) => {
                resetGeneratedState();
                if (packageTier === "virtualCfo") setFirmLogoPath(value);
              }}
              onFirmLogoFileChange={(file) => {
                if (packageTier === "virtualCfo") handleFirmLogoFileChange(file);
              }}
              onClearFirmLogo={() => {
                if (packageTier === "virtualCfo") handleFirmLogoFileChange(null);
              }}
              onConfidentialWatermarkChange={setConfidentialWatermark}
              onPreparedByChange={(value) => {
                resetGeneratedState();
                setPreparedBy(value);
              }}
              onSaveSettingsForClientChange={setSaveSettingsForClient}
              onSelectedPdfSectionsChange={(sections) => {
                resetGeneratedState();
                const allowedSections = sections.filter((section) => packageDefaultSections[packageTier].includes(section));
                setSelectedPdfSections(allowedSections);
                if (useSamePowerPointSelections) {
                  setSelectedPowerPointSections(packageTier === "essential" ? [] : allowedSections);
                }
              }}
              onUseSamePowerPointSelectionsChange={(value) => {
                resetGeneratedState();
                setUseSamePowerPointSelections(packageTier === "essential" ? false : value);
                if (value && packageTier !== "essential") setSelectedPowerPointSections(selectedPdfSections);
              }}
              onSelectedPowerPointSectionsChange={(sections) => {
                resetGeneratedState();
                setSelectedPowerPointSections(
                  packageTier === "essential"
                    ? []
                    : sections.filter((section) => packageDefaultSections[packageTier].includes(section)),
                );
              }}
              onSelectedRatiosChange={(ratios) => {
                resetGeneratedState();
                if (ratios.includes("DSO") && !selectedRatios.includes("DSO")) {
                  setDsoInputOmitted(false);
                  setDsoConfirmed(false);
                }
                setSelectedRatios(ratios.filter((ratio) => entitlementRatios[packageTier].includes(ratio)));
              }}
              onSelectedChartsChange={(charts) => {
                resetGeneratedState();
                setSelectedCharts(charts.filter((chart) => packageDefaultCharts[packageTier].includes(chart)));
              }}
              onSelectedFluxAnalysesChange={(analyses) => {
                resetGeneratedState();
                setSelectedFluxAnalyses(analyses.filter((analysis) => entitlementFluxAnalyses[packageTier].includes(analysis)));
              }}
              onFluxSettingsChange={(settings) => {
                resetGeneratedState();
                setFluxSettings(settings);
              }}
              onIncludeHighSeverityOnlyChange={(value) => {
                resetGeneratedState();
                setIncludeHighSeverityOnly(value);
              }}
              onIncludeModerateSeverityChange={(value) => {
                resetGeneratedState();
                setIncludeModerateSeverity(value);
              }}
              onMaxFluxRowsChange={(value) => {
                resetGeneratedState();
                setMaxFluxRows(value);
              }}
              onSaveClientSettings={handleSaveClientSettings}
              onLoadClientSettings={handleLoadClientSettings}
              onResetDefaults={handleResetPackageDefaults}
              dsoInputNeeded={dsoInputNeeded}
              dsoInputResolved={dsoInputResolved}
              dsoInputOmitted={dsoInputOmitted}
              dsoConfirmed={dsoConfirmed}
              dsoInputsChangedAfterConfirmation={dsoInputsChangedAfterConfirmation}
              dso={dsoPreview}
              accountsReceivable={kpis.accountsReceivable}
              accountsReceivableOverride={dsoAccountsReceivable}
              accountsReceivableUsed={dsoAccountsReceivableUsed}
              detectedRevenue={kpis.revenue}
              revenueUsed={dsoRevenueForOptionOne}
              averageDailySalesUsed={resolvedAverageDailySales}
              startDate={reportingPeriodStart}
              endDate={reportingPeriodEnd}
              manualDays={manualPeriodDays}
              autoDays={autoPeriodDays}
              effectiveDays={reportingPeriodDays}
              monthlyRevenue={dsoMonthlyRevenue}
              dsoPeriodDays={dsoPeriodDays}
              averageDailySales={dsoAverageDailySales}
              salesDetailData={salesDetailData}
              salesDetailRevenue={salesDetailRevenue}
              onStartDateChange={(value) => {
                handleDsoInputChanged();
                setReportingPeriodStart(value);
              }}
              onEndDateChange={(value) => {
                handleDsoInputChanged();
                setReportingPeriodEnd(value);
              }}
              onManualDaysChange={(value) => {
                handleDsoInputChanged();
                setManualPeriodDays(value);
              }}
              onAccountsReceivableOverrideChange={(value) => {
                handleDsoInputChanged();
                setDsoAccountsReceivable(value);
              }}
              onMonthlyRevenueChange={(value) => {
                handleDsoInputChanged();
                setDsoMonthlyRevenue(value);
              }}
              onDsoPeriodDaysChange={(value) => {
                handleDsoInputChanged();
                setDsoPeriodDays(value);
              }}
              onAverageDailySalesChange={(value) => {
                handleDsoInputChanged();
                setDsoAverageDailySales(value);
              }}
              onSalesDetailFile={async (file) => {
                handleDsoInputChanged();
                await parseFile(file, setSalesDetailData);
              }}
              onConfirmDso={handleConfirmDso}
              onEditDsoInputs={handleEditDsoInputs}
              onOmitDsoInput={handleOmitDso}
            />
          )}
          {activeWorkflowStep === 4 && showKpiReview && (
            <>
              <section id="kpi-review" className="workflow-section mt-10 rounded-3xl border border-[#243041] bg-[#111827] p-8 shadow-xl shadow-black/10">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
                  Step 4 - Review KPIs
                </p>
                <h2 className="mb-6 text-3xl font-bold">Detected Financial KPIs</h2>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                  <KpiCard label="Revenue" value={kpis.revenue} />
                  <KpiCard label="COGS" value={kpis.cogs} />
                  <KpiCard label="Gross Profit" value={kpis.grossProfit} />
                  <KpiCard label="Expenses" value={kpis.expenses} />
                  <KpiCard label="Net Income" value={kpis.netIncome} />
                  <KpiCard label="Cash" value={kpis.cash} />
                  <KpiCard label="Accounts Receivable" value={kpis.accountsReceivable} />
                  <KpiCard label="Total Assets" value={kpis.totalAssets} />
                  <KpiCard label="Net Margin" value={netMargin} percent />
                  {activeApData && <KpiCard label="AP Aging Total" value={apKpis.total} />}
                  {isProfessionalOrHigher(packageTier) && activeInventoryData && (
                    <>
                      <KpiCard label="Inventory Value" value={inventoryKpis.totalValue} />
                      <KpiCard label="Inventory Quantity" value={inventoryKpis.totalQuantity} plain />
                    </>
                  )}
                  {isVirtualCfo(packageTier) && activeFixedAssetData && (
                    <>
                      <KpiCard label="Total Fixed Assets" value={fixedAssetKpis.totalFixedAssets} />
                      <KpiCard
                        label="Accumulated Depreciation"
                        value={fixedAssetKpis.accumulatedDepreciation}
                      />
                      <KpiCard label="Net Book Value" value={fixedAssetKpis.netBookValue} />
                    </>
                  )}
                </div>
              </section>

              <KpiConfirmationPanel
                packageTier={packageTier}
                kpis={kpis}
                arKpis={arKpis}
                apKpis={apKpis}
                inventoryKpis={inventoryKpis}
                fixedAssetKpis={fixedAssetKpis}
                payrollAnalysis={payrollAnalysis}
                netMargin={netMargin}
                includeAr={Boolean(activeArData)}
                includeAp={Boolean(activeApData)}
                includeInventory={Boolean(activeInventoryData)}
                includeFixedAssets={Boolean(activeFixedAssetData)}
                includePayroll={Boolean(activeCurrentPayrollData)}
                dso={dso}
                ratioRows={ratioRows}
                reportsChangedAfterConfirmation={reportsChangedAfterConfirmation}
              />

              <ExecutiveSummarySection executiveSummary={executiveSummary} />
              <RatioAnalysisSection ratioRows={ratioRows} />
            </>
          )}

          {activeWorkflowStep === 5 && (
            <BoardPackagePreview
              companyName={companyName}
              reportPeriod={reportPeriod}
              preparedBy={preparedBy || "FinSight Reports"}
              packageTier={packageTier}
              stepLabel="Step 5 - Generate & Review PDF Package"
              introText="Review the package preview below. If the content and section selections look right, use Generate PDF Package in the action panel. After generation, check PDF looks correct to reveal Export PDF."
              sections={boardPackageSections}
              kpis={kpis}
              apKpis={apKpis}
              inventoryKpis={inventoryKpis}
              fixedAssetKpis={fixedAssetKpis}
              payrollAnalysis={payrollAnalysis}
              includeAp={Boolean(activeApData)}
              includeInventory={Boolean(activeInventoryData)}
              includeFixedAssets={Boolean(activeFixedAssetData)}
              includePayroll={Boolean(activeCurrentPayrollData)}
            />
          )}

          {activeWorkflowStep === 6 && canPreviewPackage && kpisConfirmed && (
            <PowerPointPrompt
              showDraft={showPowerPointDraft}
              slides={powerPointSlides}
              onCreate={handleCreatePowerPoint}
              onSkip={handleOmitPowerPoint}
            />
          )}

          {activeWorkflowStep === 4 && showKpiReview && (
            <BasicChartsSection
              kpis={kpis}
              arKpis={arKpis}
              apKpis={apKpis}
              inventoryKpis={inventoryKpis}
              fixedAssetKpis={fixedAssetKpis}
              payrollAnalysis={payrollAnalysis}
              fluxRows={[...monthFluxRows, ...quarterFluxRows, ...yearFluxRows]}
              includeAr={Boolean(activeArData)}
              includeAp={Boolean(activeApData)}
              includeInventory={Boolean(activeInventoryData)}
              includeFixedAssets={Boolean(activeFixedAssetData)}
              includePayroll={Boolean(activeCurrentPayrollData)}
            />
          )}

          {activeWorkflowStep === 4 && showKpiReview && isProfessionalOrHigher(packageTier) && (
            <>
              {activeInventoryData && <InventoryAnalysisSection inventoryKpis={inventoryKpis} />}
              <ProfessionalPlaceholderSection />
            </>
          )}

          {activeWorkflowStep === 4 && showKpiReview && isVirtualCfo(packageTier) && (
            <>
              {activeFixedAssetData && (
                <FixedAssetAnalysisSection
                  fixedAssetKpis={fixedAssetKpis}
                  priorFixedAssetData={activePriorFixedAssetData}
                  changeRows={fixedAssetChangeRows}
                />
              )}
              <VirtualCfoPlaceholderSection />
              <PayrollAnalysisSection
                analysis={payrollAnalysis}
                currentPayrollData={activeCurrentPayrollData}
                priorPayrollData={activePriorPayrollData}
                fteDivisor={fteDivisor}
                onFteDivisorChange={handleFteDivisorChange}
              />
              <FluxAnalysisPanel
                settings={fluxSettings}
                onSettingsChange={setFluxSettings}
                monthRows={monthFluxRows}
                quarterRows={quarterFluxRows}
                yearRows={yearFluxRows}
                monthDebug={monthFluxDebug}
                quarterDebug={quarterFluxDebug}
                yearDebug={yearFluxDebug}
              />
            </>
          )}

          {activeWorkflowStep === 4 && showKpiReview && (
            <>
              <section className="mt-10 rounded-3xl bg-slate-900 p-8">
                <h2 className="mb-4 text-2xl font-bold">Matched QuickBooks Rows</h2>
                <div className="overflow-x-auto rounded-xl border border-slate-700">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-4 py-3">Metric</th>
                        <th className="px-4 py-3">Matched Row</th>
                        <th className="px-4 py-3">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.matches.map((match, index) => (
                        <tr key={`${match.metric}-${index}`} className="border-b border-slate-800">
                          <td className="px-4 py-3 text-slate-300">{match.metric}</td>
                          <td className="px-4 py-3 text-slate-300">{match.label}</td>
                          <td className="px-4 py-3 font-semibold">{formatMoney(match.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <Preview title="Profit & Loss Preview" data={activePlData} />
              <Preview title="Balance Sheet Preview" data={activeBsData} />
              <Preview title="AR Aging Preview" data={activeArData} />
              <Preview title="AP Aging Preview" data={activeApData} />
              {isProfessionalOrHigher(packageTier) && (
                <>
                  <Preview title="Inventory Valuation Preview" data={activeInventoryData} />
                  <Preview title="Customer Sales Detail Preview" data={activeCustomerSalesData} />
                  <Preview title="Vendor Expense Detail Preview" data={activeVendorExpenseData} />
                </>
              )}
              {isVirtualCfo(packageTier) && (
                <>
                  <Preview title="Fixed Asset Preview" data={activeFixedAssetData} />
                  <Preview title="Prior Period Fixed Asset Preview" data={activePriorFixedAssetData} />
                  <Preview title="Budget vs Actual Preview" data={activeBudgetVsActualData} />
                  <Preview title="Prior Period P&L Preview" data={activePriorPeriodPlData} />
                  <Preview title="Prior Period Balance Sheet Preview" data={activePriorPeriodBsData} />
                  <Preview title="Cash Flow Statement Preview" data={activeCashFlowData} />
                  <Preview title="Debt Schedule Preview" data={activeDebtScheduleData} />
                  <Preview title="Current Month Payroll Preview" data={activeCurrentPayrollData} />
                  <Preview title="Prior Month Payroll Preview" data={activePriorPayrollData} />
                  <Preview title="Current Month Payroll Detail Preview" data={activeCurrentPayrollDetailData} />
                  <Preview title="Prior Month Payroll Detail Preview" data={activePriorPayrollDetailData} />
                </>
              )}
            </>
          )}
          </ImportWorkflow>
        </div>
      </main>

      <PrintableFinancialPackage
        packageTier={packageTier}
        companyName={companyName}
        reportPeriod={reportPeriod}
        clientIndustry={clientIndustry}
        companyTagline={companyTagline}
        preparedFor={preparedFor}
        confidentialWatermark={confidentialWatermark}
        preparedBy={preparedBy || "FinSight Reports"}
        selectedSections={selectedPdfSections}
        kpis={kpis}
        arKpis={arKpis}
        apKpis={apKpis}
        inventoryKpis={inventoryKpis}
        fixedAssetKpis={fixedAssetKpis}
        netMargin={netMargin}
        executiveSummary={executiveSummary}
        plData={activePlData}
        bsData={activeBsData}
        arData={activeArData}
        apData={activeApData}
        inventoryData={activeInventoryData}
        fixedAssetData={activeFixedAssetData}
        priorFixedAssetData={activePriorFixedAssetData}
        topRevenueRows={getTopRevenueRows(activePlData)}
        topExpenseRows={getTopOperatingExpenseRows(activePlData)}
        selectedCharts={selectedCharts}
        ratioRows={ratioRows}
        fixedAssetChangeRows={fixedAssetChangeRows}
        payrollAnalysis={payrollAnalysis}
        currentPayrollData={activeCurrentPayrollData}
        priorPayrollData={activePriorPayrollData}
        boardPackageSections={boardPackageSections}
        budgetMetrics={budgetMetrics}
        debtMetrics={debtMetrics}
        monthFluxRows={monthFluxRows}
        quarterFluxRows={quarterFluxRows}
        yearFluxRows={yearFluxRows}
      />
    </>
  );
}

function isReportAvailable(reportTier: UploadTier, packageTier: PackageTier) {
  if (reportTier === "essential") return true;
  if (reportTier === "professional") return isProfessionalOrHigher(packageTier);
  return isVirtualCfo(packageTier);
}

function scrollToWorkflowSection(target: string | HTMLElement | RefObject<HTMLElement | null>) {
  if (typeof window === "undefined") return;

  const element =
    typeof target === "string"
      ? document.getElementById(target)
      : target instanceof HTMLElement
        ? target
        : target.current;
  if (!element) return;

  const toolbar = document.querySelector(".workflow-action-panel");
  const toolbarHeight = toolbar?.getBoundingClientRect().height || 180;
  const extraPadding = 44;
  const elementTop = element.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({
    top: elementTop - toolbarHeight - extraPadding,
    behavior: "smooth",
  });
}

function ImportWorkflow({
  packageTier,
  hasSelectedPackage,
  showImportReports,
  showCustomizePackage,
  activeWorkflowStep,
  onPackageTierChange,
  reports,
  uploadedReportsCount,
  requiredUploadedReportsCount,
  totalRequiredReportsCount,
  missingReports,
  requiredUploadsComplete,
  missingInputsResolved,
  missingInputsRemaining,
  resolvedInputsCount,
  kpisConfirmed,
  kpiReviewVisible,
  showPdfGeneration,
  showPowerPointStep,
  reviewerNotes,
  reportsChangedAfterConfirmation,
  canGeneratePackage,
  isPackageGenerated,
  isPackageExported,
  pdfReviewed,
  powerpointOmitted,
  powerpointCreated,
  packageComplete,
  folderImportResult,
  isFolderImporting,
  onImportFromFolder,
  onImportFolderFallbackFiles,
  onGeneratePackage,
  onContinueToUploadReports,
  onContinueToCustomizePackage,
  onContinueToKpiReview,
  onContinueToPdfGeneration,
  onContinueToPowerPoint,
  onKpisConfirmedChange,
  onReviewerNotesChange,
  onExportPackage,
  onPdfReviewedChange,
  onCreatePowerPoint,
  onOmitPowerPoint,
  onResetPowerPointChoice,
  onCompletePackage,
  onStartNewClient,
  onBackWorkflowStep,
  children,
}: {
  packageTier: PackageTier;
  hasSelectedPackage: boolean;
  showImportReports: boolean;
  showCustomizePackage: boolean;
  activeWorkflowStep: number;
  onPackageTierChange: (tier: PackageTier) => void;
  reports: UploadReport[];
  uploadedReportsCount: number;
  requiredUploadedReportsCount: number;
  totalRequiredReportsCount: number;
  missingReports: PackageRequirementStatus[];
  requiredUploadsComplete: boolean;
  missingInputsResolved: boolean;
  missingInputsRemaining: number;
  resolvedInputsCount: number;
  kpisConfirmed: boolean;
  kpiReviewVisible: boolean;
  showPdfGeneration: boolean;
  showPowerPointStep: boolean;
  reviewerNotes: string;
  reportsChangedAfterConfirmation: boolean;
  canGeneratePackage: boolean;
  isPackageGenerated: boolean;
  isPackageExported: boolean;
  pdfReviewed: boolean;
  powerpointOmitted: boolean;
  powerpointCreated: boolean;
  packageComplete: boolean;
  folderImportResult: FolderImportResult | null;
  isFolderImporting: boolean;
  onImportFromFolder: () => Promise<boolean>;
  onImportFolderFallbackFiles: (files: File[]) => Promise<void>;
  onGeneratePackage: () => void;
  onContinueToUploadReports: () => void;
  onContinueToCustomizePackage: () => void;
  onContinueToKpiReview: () => void;
  onContinueToPdfGeneration: () => void;
  onContinueToPowerPoint: () => void;
  onKpisConfirmedChange: (confirmed: boolean) => void;
  onReviewerNotesChange: (notes: string) => void;
  onExportPackage: () => void;
  onPdfReviewedChange: (reviewed: boolean) => void;
  onCreatePowerPoint: () => void;
  onOmitPowerPoint: () => void;
  onResetPowerPointChoice: () => void;
  onCompletePackage: () => void;
  onStartNewClient: () => void;
  onBackWorkflowStep: () => void;
  children?: ReactNode;
}) {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const handleImportFromFolderClick = async () => {
    const usedNativePicker = await onImportFromFolder();
    if (!usedNativePicker) folderInputRef.current?.click();
  };

  return (
    <div className="rounded-[2rem] border border-[#243041] bg-[#0B1020] p-8 shadow-2xl shadow-black/20">
      <div className="mb-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-[#5B8CFF]">
          FinSight Reports
        </p>
        <h1 className="text-5xl font-bold tracking-tight text-[#F9FAFB]">
          Build a Client Financial Package
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#94A3B8]">
          Upload QuickBooks reports, choose the appropriate advisory package, and FinSight prepares
          a polished client-ready financial package with the right level of analysis.
        </p>
      </div>

      <WorkflowSteps
        hasSelectedPackage={hasSelectedPackage}
        requiredUploadsComplete={requiredUploadsComplete}
        showCustomizePackage={showCustomizePackage}
        missingInputsResolved={missingInputsResolved}
        missingInputsRemaining={missingInputsRemaining}
        resolvedInputsCount={resolvedInputsCount}
        kpisConfirmed={kpisConfirmed}
        showPdfGeneration={showPdfGeneration}
        showPowerPointStep={showPowerPointStep}
        isPackageGenerated={isPackageGenerated}
        pdfReviewed={pdfReviewed}
        powerpointOmitted={powerpointOmitted}
        powerpointCreated={powerpointCreated}
        packageComplete={packageComplete}
      />

      <WorkflowActionPanel
        packageTier={packageTier}
        hasSelectedPackage={hasSelectedPackage}
        showImportReports={showImportReports}
        showCustomizePackage={showCustomizePackage}
        activeStep={activeWorkflowStep}
        uploadedReportsCount={uploadedReportsCount}
        requiredUploadedReportsCount={requiredUploadedReportsCount}
        totalReportsCount={totalRequiredReportsCount}
        missingReports={missingReports}
        requiredUploadsComplete={requiredUploadsComplete}
        missingInputsResolved={missingInputsResolved}
        missingInputsRemaining={missingInputsRemaining}
        resolvedInputsCount={resolvedInputsCount}
        kpisConfirmed={kpisConfirmed}
        kpiReviewVisible={kpiReviewVisible}
        showPdfGeneration={showPdfGeneration}
        showPowerPointStep={showPowerPointStep}
        reviewerNotes={reviewerNotes}
        canGeneratePackage={canGeneratePackage}
        isPackageGenerated={isPackageGenerated}
        isPackageExported={isPackageExported}
        pdfReviewed={pdfReviewed}
        powerpointOmitted={powerpointOmitted}
        powerpointCreated={powerpointCreated}
        packageComplete={packageComplete}
        onGeneratePackage={onGeneratePackage}
        onExportPackage={onExportPackage}
        onPdfReviewedChange={onPdfReviewedChange}
        onCreatePowerPoint={onCreatePowerPoint}
        onOmitPowerPoint={onOmitPowerPoint}
        onResetPowerPointChoice={onResetPowerPointChoice}
        onCompletePackage={onCompletePackage}
        onStartNewClient={onStartNewClient}
        onBackWorkflowStep={onBackWorkflowStep}
        onContinueToUploadReports={onContinueToUploadReports}
        onContinueToCustomizePackage={onContinueToCustomizePackage}
        onContinueToKpiReview={onContinueToKpiReview}
        onContinueToPdfGeneration={onContinueToPdfGeneration}
        onContinueToPowerPoint={onContinueToPowerPoint}
        onKpisConfirmedChange={onKpisConfirmedChange}
        onReviewerNotesChange={onReviewerNotesChange}
      />

      {activeWorkflowStep === 2 && showImportReports && !requiredUploadsComplete && (
        <ImportActionBar
          missingReports={missingReports}
          requiredUploadedReportsCount={requiredUploadedReportsCount}
          totalReportsCount={totalRequiredReportsCount}
          isFolderImporting={isFolderImporting}
          onImportClick={handleImportFromFolderClick}
          onManualUploadsClick={() => scrollToWorkflowSection("upload-reports")}
        />
      )}

      {activeWorkflowStep === 1 && (
        <PremiumPackageSelector
          packageTier={packageTier}
          hasSelectedPackage={hasSelectedPackage}
          onPackageTierChange={onPackageTierChange}
        />
      )}

      {activeWorkflowStep === 2 && showImportReports && (
        <>
          <div className="mt-10 grid gap-8">
            <div id="upload-reports" className="workflow-section">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
                Step 2
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#F9FAFB]">Upload Reports</h2>
              <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
                Complete the checklist for the selected package. Higher-tier uploads remain visible as
                upgrade opportunities without adding clutter to the active workflow.
              </p>
            </div>

            <ImportMethodSelector
              isImporting={isFolderImporting}
              onImportFromFolder={handleImportFromFolderClick}
              onManualUpload={() => scrollToWorkflowSection("manual-upload-reports")}
            />

            <FolderImportPanel
              inputRef={folderInputRef}
              result={folderImportResult}
              isImporting={isFolderImporting}
              onImportClick={handleImportFromFolderClick}
              onFallbackFiles={onImportFolderFallbackFiles}
            />

            <div id="manual-upload-reports">
              <UploadGroup
                title="Essential Imports"
                subtitle="Core reports required for monthly financial package preparation."
                reports={reports.filter((report) => report.tier === "essential")}
                packageTier={packageTier}
              />
            </div>

            <UploadGroup
              title="Professional Imports"
              subtitle="Additional advisory reports for inventory, customer, vendor, and margin analysis."
              reports={reports.filter((report) => report.tier === "professional")}
              packageTier={packageTier}
            />

            <UploadGroup
              title="Virtual CFO Imports"
              subtitle="Advanced reports for board-style analysis, forecasting placeholders, and flux review."
              reports={reports.filter((report) => report.tier === "virtualCfo")}
              packageTier={packageTier}
            />
          </div>
          {reportsChangedAfterConfirmation && (
            <p className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200">
              Reports changed. Please review and confirm KPIs again before generating the package.
            </p>
          )}
        </>
      )}
      {children}
    </div>
  );
}

function WorkflowSteps({
  hasSelectedPackage,
  requiredUploadsComplete,
  showCustomizePackage,
  missingInputsResolved,
  missingInputsRemaining,
  resolvedInputsCount,
  kpisConfirmed,
  showPdfGeneration,
  showPowerPointStep,
  isPackageGenerated,
  pdfReviewed,
  powerpointOmitted,
  powerpointCreated,
  packageComplete,
}: {
  hasSelectedPackage: boolean;
  requiredUploadsComplete: boolean;
  showCustomizePackage: boolean;
  missingInputsResolved: boolean;
  missingInputsRemaining: number;
  resolvedInputsCount: number;
  kpisConfirmed: boolean;
  showPdfGeneration: boolean;
  showPowerPointStep: boolean;
  isPackageGenerated: boolean;
  pdfReviewed: boolean;
  powerpointOmitted: boolean;
  powerpointCreated: boolean;
  packageComplete: boolean;
}) {
  const steps: Array<{
    label: string;
    status: "Not Started" | "In Progress" | "Complete" | "Omitted" | "Locked";
    detail?: string;
  }> = [
    { label: "Select Package", status: hasSelectedPackage ? "Complete" : "In Progress" },
    {
      label: "Import Reports",
      status: !hasSelectedPackage ? "Locked" : requiredUploadsComplete ? "Complete" : "In Progress",
    },
    {
      label: "Customize Package",
      status: !requiredUploadsComplete
        ? "Locked"
        : !showCustomizePackage
          ? "Not Started"
          : missingInputsResolved
            ? "Complete"
            : "In Progress",
      detail: !requiredUploadsComplete
        ? undefined
        : !showCustomizePackage
          ? "Proceed when uploads are complete"
          : missingInputsResolved
          ? "Ready"
          : `${missingInputsRemaining} item${missingInputsRemaining === 1 ? "" : "s"} needs attention`,
    },
    {
      label: "Review KPIs",
      status: !showCustomizePackage || !missingInputsResolved ? "Locked" : kpisConfirmed ? "Complete" : "In Progress",
    },
    {
      label: "Generate & Review PDF",
      status: !kpisConfirmed
        ? "Locked"
        : !showPdfGeneration
          ? "Not Started"
          : pdfReviewed
            ? "Complete"
            : "In Progress",
      detail: !kpisConfirmed
        ? undefined
        : !showPdfGeneration
          ? "Proceed after KPI approval"
          : !isPackageGenerated
          ? "Generate PDF after preview"
          : pdfReviewed
            ? "Ready to export"
            : "Confirm PDF looks correct",
    },
    {
      label: "Create PowerPoint",
      status: !pdfReviewed
        ? "Locked"
        : !showPowerPointStep
          ? "Not Started"
          : powerpointOmitted
            ? "Omitted"
            : powerpointCreated
              ? "Complete"
              : "In Progress",
    },
    {
      label: "Complete",
      status: !pdfReviewed || (!powerpointCreated && !powerpointOmitted)
        ? "Locked"
        : packageComplete
          ? "Complete"
          : "In Progress",
    },
  ];

  return (
    <div className="mb-10 rounded-3xl border border-[#243041] bg-[#111827] p-5">
      <div className="grid gap-3 md:grid-cols-7">
        {steps.map((step, index) => {
          const current = step.status === "In Progress";
          const complete = step.status === "Complete";
          const omitted = step.status === "Omitted";
          const locked = step.status === "Locked";

          return (
            <div
              key={step.label}
              className={`rounded-2xl border p-4 ${
                current
                  ? "border-[#5B8CFF] bg-[#172033]"
                  : complete
                    ? "border-emerald-500/30 bg-emerald-950/20"
                    : omitted
                      ? "border-slate-600 bg-slate-900/60"
                      : locked
                        ? "border-[#243041] bg-[#0B1020] opacity-70"
                        : "border-[#243041] bg-[#111827]"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5B8CFF]">
                Step {index + 1}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#F9FAFB]">{step.label}</p>
              <p
                className={`mt-2 text-xs font-semibold ${
                  complete
                    ? "text-emerald-300"
                    : omitted
                      ? "text-slate-300"
                      : locked
                        ? "text-slate-500"
                        : "text-blue-300"
                }`}
              >
                {step.status}
              </p>
              {step.detail && <p className="mt-2 text-[11px] leading-4 text-[#94A3B8]">{step.detail}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkflowActionPanel({
  packageTier,
  hasSelectedPackage,
  showImportReports,
  showCustomizePackage,
  activeStep,
  uploadedReportsCount,
  requiredUploadedReportsCount,
  totalReportsCount,
  missingReports,
  requiredUploadsComplete,
  missingInputsResolved,
  missingInputsRemaining,
  resolvedInputsCount,
  kpisConfirmed,
  kpiReviewVisible,
  showPdfGeneration,
  showPowerPointStep,
  reviewerNotes,
  canGeneratePackage,
  isPackageGenerated,
  isPackageExported,
  pdfReviewed,
  powerpointOmitted,
  powerpointCreated,
  packageComplete,
  onGeneratePackage,
  onContinueToUploadReports,
  onContinueToCustomizePackage,
  onContinueToKpiReview,
  onContinueToPdfGeneration,
  onContinueToPowerPoint,
  onKpisConfirmedChange,
  onReviewerNotesChange,
  onExportPackage,
  onPdfReviewedChange,
  onCreatePowerPoint,
  onOmitPowerPoint,
  onResetPowerPointChoice,
  onCompletePackage,
  onStartNewClient,
  onBackWorkflowStep,
}: {
  packageTier: PackageTier;
  hasSelectedPackage: boolean;
  showImportReports: boolean;
  showCustomizePackage: boolean;
  activeStep: number;
  uploadedReportsCount: number;
  requiredUploadedReportsCount: number;
  totalReportsCount: number;
  missingReports: PackageRequirementStatus[];
  requiredUploadsComplete: boolean;
  missingInputsResolved: boolean;
  missingInputsRemaining: number;
  resolvedInputsCount: number;
  kpisConfirmed: boolean;
  kpiReviewVisible: boolean;
  showPdfGeneration: boolean;
  showPowerPointStep: boolean;
  reviewerNotes: string;
  canGeneratePackage: boolean;
  isPackageGenerated: boolean;
  isPackageExported: boolean;
  pdfReviewed: boolean;
  powerpointOmitted: boolean;
  powerpointCreated: boolean;
  packageComplete: boolean;
  onGeneratePackage: () => void;
  onContinueToUploadReports: () => void;
  onContinueToCustomizePackage: () => void;
  onContinueToKpiReview: () => void;
  onContinueToPdfGeneration: () => void;
  onContinueToPowerPoint: () => void;
  onKpisConfirmedChange: (confirmed: boolean) => void;
  onReviewerNotesChange: (notes: string) => void;
  onExportPackage: () => void;
  onPdfReviewedChange: (reviewed: boolean) => void;
  onCreatePowerPoint: () => void;
  onOmitPowerPoint: () => void;
  onResetPowerPointChoice: () => void;
  onCompletePackage: () => void;
  onStartNewClient: () => void;
  onBackWorkflowStep: () => void;
}) {
  const buttonBase =
    "rounded-2xl px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60";
  const primaryButton = `${buttonBase} bg-[#5B8CFF] text-white hover:bg-blue-500`;
  const secondaryButton = `${buttonBase} border border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500`;
  const compactReviewPanel = activeStep === 4 || activeStep === 5;
  const nextAction = !hasSelectedPackage
    ? {
        label: "Proceed to Step 1 - Select Package",
        helper: "Choose a package level to begin the guided workflow.",
        onClick: () => scrollToWorkflowSection("package-selection"),
        disabled: false,
      }
    : !showImportReports || !requiredUploadsComplete
      ? {
          label: "Proceed to Step 2 - Import Reports",
          helper: missingReports.length
            ? `Missing required reports: ${missingReports.map((report) => report.label).join(", ")}.`
            : "Continue importing optional reports for this package.",
          onClick: onContinueToUploadReports,
          disabled: false,
        }
      : !showCustomizePackage || !missingInputsResolved
        ? {
            label: "Proceed to Step 3 - Customize Package",
            helper: !showCustomizePackage
              ? "Review package outputs, ratios, flux settings, and required calculation inputs."
              : missingInputsRemaining
                ? `Customize Package has ${missingInputsRemaining} item${missingInputsRemaining === 1 ? "" : "s"} needing attention.`
                : "Customize Package is ready for KPI review.",
            onClick: onContinueToCustomizePackage,
            disabled: false,
          }
      : !kpisConfirmed
        ? kpiReviewVisible
          ? {
              label: "KPIs Awaiting Approval",
              helper: "KPIs under review. Approve KPI review in the toolbar to continue.",
              onClick: () => undefined,
              disabled: true,
            }
          : {
              label: "Proceed to Step 4 - Review KPIs",
              helper: "KPI review pending.",
              onClick: onContinueToKpiReview,
              disabled: false,
            }
        : !showPdfGeneration
          ? {
              label: "Proceed to Step 5 - Generate & Review PDF",
              helper: "Package ready for generation. Continue when you are ready to review and generate the PDF.",
              onClick: onContinueToPdfGeneration,
              disabled: false,
            }
        : !isPackageGenerated
          ? {
              label: "Generate PDF Package",
              helper: "Review the package preview below. Generate the PDF when you agree with it.",
              onClick: () => {
                onGeneratePackage();
                window.setTimeout(() => scrollToWorkflowSection("pdf-review"), 150);
              },
              disabled: !canGeneratePackage,
            }
          : !pdfReviewed
            ? {
                label: "PDF Awaiting Approval",
                helper: "Export and review the PDF. Check PDF looks correct when you approve it.",
                onClick: () => undefined,
                disabled: true,
              }
            : packageTier === "essential"
              ? {
                  label: "Proceed to Step 7 - Complete",
                  helper: "Essential includes PDF output only. PowerPoint export is available on Professional and Virtual CFO plans.",
                  onClick: onCompletePackage,
                  disabled: false,
                }
            : !showPowerPointStep
              ? {
                  label: "Proceed to Step 6 - Create PowerPoint",
                  helper: "PDF approved. Continue when you are ready to decide on the Board / Owner presentation.",
                  onClick: onContinueToPowerPoint,
                  disabled: false,
                }
            : !powerpointCreated && !powerpointOmitted
              ? {
                  label: "Proceed to Step 6 - Create PowerPoint",
                  helper: "PowerPoint is optional. Create it now or omit it for this package.",
                  onClick: () => {
                    onCreatePowerPoint();
                    window.setTimeout(() => scrollToWorkflowSection("powerpoint-section"), 150);
                  },
                  disabled: false,
                }
              : !packageComplete
                ? {
                    label: "Proceed to Step 7 - Complete",
                    helper: powerpointOmitted
                      ? "PowerPoint omitted. You can complete the package."
                      : "PowerPoint created. You can complete the package.",
                    onClick: onCompletePackage,
                    disabled: false,
                  }
                : {
                    label: "Package Complete",
                    helper: "This package workflow is complete.",
                    onClick: () => undefined,
                    disabled: true,
                  };
  return (
    <section
      id="pdf-generation"
      className={`workflow-action-panel workflow-section sticky top-4 z-20 mb-10 border border-[#5B8CFF]/40 bg-[#172033]/95 shadow-2xl shadow-black/30 backdrop-blur ${
        compactReviewPanel ? "rounded-2xl p-3" : "rounded-3xl p-5"
      }`}
    >
      <div className={`grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center ${compactReviewPanel ? "gap-3" : "gap-5"}`}>
        <div>
          <p className={`${compactReviewPanel ? "text-[10px]" : "text-sm"} font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]`}>
            Workflow Action Panel
          </p>
          <h2 className={`${compactReviewPanel ? "mt-1 text-lg" : "mt-2 text-2xl"} font-bold text-[#F9FAFB]`}>
            {hasSelectedPackage ? PACKAGE_LABELS[packageTier] : "No package selected"}
          </h2>
          <p className={`${compactReviewPanel ? "mt-1 text-xs leading-5" : "mt-2 text-sm leading-6"} text-[#94A3B8]`}>
            {nextAction.helper}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {activeStep > 1 && (
            <button type="button" onClick={onBackWorkflowStep} className={secondaryButton}>
              Back
            </button>
          )}
          <button type="button" onClick={nextAction.onClick} disabled={nextAction.disabled} className={primaryButton}>
            {nextAction.label}
          </button>
          {isPackageGenerated && activeStep === 5 && (
            <button type="button" onClick={onExportPackage} className={secondaryButton}>
              {isPackageExported ? "Re-export PDF" : "Export PDF"}
            </button>
          )}
          {showPowerPointStep && pdfReviewed && !powerpointCreated && !powerpointOmitted && (
            <button type="button" onClick={onOmitPowerPoint} className={secondaryButton}>
              Omit PowerPoint
            </button>
          )}
          {showPowerPointStep && pdfReviewed && (powerpointCreated || powerpointOmitted) && !packageComplete && (
            <button type="button" onClick={onResetPowerPointChoice} className={secondaryButton}>
              Reset PowerPoint Choice
            </button>
          )}
          {packageComplete && (
            <button type="button" onClick={onStartNewClient} className={secondaryButton}>
              Start New Client
            </button>
          )}
        </div>
      </div>

      {compactReviewPanel ? (
        <div className="mt-3 max-w-xl">
          {activeStep === 4 && (
            <KpiApprovalStatusCard
              step="Step 4"
              kpiReviewVisible={kpiReviewVisible}
              kpisConfirmed={kpisConfirmed}
              reviewerNotes={reviewerNotes}
              canReviewKpis={missingInputsResolved}
              active
              compact
              onReviewKpis={onContinueToKpiReview}
              onKpisConfirmedChange={onKpisConfirmedChange}
              onReviewerNotesChange={onReviewerNotesChange}
            />
          )}
          {activeStep === 5 && (
            <PdfReviewStatusCard
              step="Step 5"
              isPackageGenerated={isPackageGenerated}
              pdfReviewed={pdfReviewed}
              active
              compact
              onPdfReviewedChange={onPdfReviewedChange}
            />
          )}
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-6">
          <WorkflowStatusPill
            step="Step 2"
            label="Import Reports"
            description="Upload or omit required QuickBooks reports."
            value={`${requiredUploadedReportsCount}/${totalReportsCount} required`}
            complete={requiredUploadsComplete}
            active={activeStep === 2}
          />
          <WorkflowStatusPill
            step="Step 3"
            label="Customize Package"
            description="Choose outputs, ratios, flux settings, and DSO options."
            value={
              !requiredUploadsComplete
                ? "Not started"
                : missingInputsResolved
                  ? "Ready"
                  : `${missingInputsRemaining} item${missingInputsRemaining === 1 ? "" : "s"} needs attention`
            }
            complete={missingInputsResolved}
            active={activeStep === 3}
          />
          <KpiApprovalStatusCard
            step="Step 4"
            kpiReviewVisible={kpiReviewVisible}
            kpisConfirmed={kpisConfirmed}
            reviewerNotes={reviewerNotes}
            canReviewKpis={missingInputsResolved}
            active={activeStep === 4}
            onReviewKpis={onContinueToKpiReview}
            onKpisConfirmedChange={onKpisConfirmedChange}
            onReviewerNotesChange={onReviewerNotesChange}
          />
          <WorkflowStatusPill
            step="Step 5"
            label="Generate & Review PDF"
            description="Generate the PDF, confirm it is correct, then export."
            value={pdfReviewed ? "PDF approved" : isPackageGenerated ? "Awaiting approval" : "Not created"}
            complete={pdfReviewed}
            active={activeStep === 5}
          />
          <WorkflowStatusPill
            step="Step 6"
            label="PowerPoint"
            description="Create or omit the board presentation."
            value={powerpointOmitted ? "Omitted" : powerpointCreated ? "Created" : pdfReviewed ? "Optional" : "Locked"}
            complete={powerpointCreated || powerpointOmitted}
            omitted={powerpointOmitted}
            active={activeStep === 6}
          />
          <WorkflowStatusPill
            step="Step 7"
            label="Complete"
            description="Finalize the package workflow."
            value={packageComplete ? "Complete" : "In progress"}
            complete={packageComplete}
            active={activeStep === 7}
          />
        </div>
      )}
      {uploadedReportsCount > 0 && (
        <p className="mt-3 text-xs font-medium text-[#94A3B8]">
          Required reports for selected package. {uploadedReportsCount} total reports uploaded.
        </p>
      )}
      {uploadedReportsCount === 0 && (
        <p className="mt-3 text-xs font-medium text-[#94A3B8]">
          Required reports for selected package.
        </p>
      )}
    </section>
  );
}

function WorkflowStatusPill({
  step,
  label,
  description,
  value,
  complete,
  active = false,
  omitted = false,
  compact = false,
}: {
  step: string;
  label: string;
  description: string;
  value: string;
  complete: boolean;
  active?: boolean;
  omitted?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border transition ${compact ? "p-3" : "p-4"} ${
        active
          ? "border-[#5B8CFF] bg-[#172033] shadow-lg shadow-[#5B8CFF]/10"
          : "border-[#243041] bg-[#0B1020]"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#5B8CFF]">{step}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#94A3B8]">{label}</p>
      {!compact && <p className="mt-2 min-h-8 text-[11px] leading-4 text-slate-400">{description}</p>}
      <p className={`mt-2 text-sm font-bold ${complete ? (omitted ? "text-slate-300" : "text-emerald-300") : "text-[#F9FAFB]"}`}>
        {value}
      </p>
    </div>
  );
}

function PdfReviewStatusCard({
  step,
  isPackageGenerated,
  pdfReviewed,
  active = false,
  compact = false,
  onPdfReviewedChange,
}: {
  step: string;
  isPackageGenerated: boolean;
  pdfReviewed: boolean;
  active?: boolean;
  compact?: boolean;
  onPdfReviewedChange: (reviewed: boolean) => void;
}) {
  const status = pdfReviewed
    ? "PDF approved"
    : isPackageGenerated
      ? "Awaiting approval"
      : "Ready to generate";

  return (
    <div
      className={`rounded-2xl border transition ${compact ? "p-3" : "p-4"} ${
        active
          ? "border-[#5B8CFF] bg-[#172033] shadow-lg shadow-[#5B8CFF]/10"
          : "border-[#243041] bg-[#0B1020]"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#5B8CFF]">{step}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
        Generate & Review PDF
      </p>
      {!compact && (
        <p className="mt-2 min-h-8 text-[11px] leading-4 text-slate-400">
          Generate the PDF, confirm it looks correct, then export.
        </p>
      )}
      <p className={`mt-2 text-sm font-bold ${pdfReviewed ? "text-emerald-300" : "text-[#F9FAFB]"}`}>
        {status}
      </p>
      {isPackageGenerated && (
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#F9FAFB]">
          <input
            type="checkbox"
            checked={pdfReviewed}
            onChange={(event) => onPdfReviewedChange(event.target.checked)}
            className="h-4 w-4 rounded border-[#5B8CFF]"
          />
          <span>PDF looks correct</span>
        </label>
      )}
      {!isPackageGenerated && (
        <p className="mt-2 text-xs leading-5 text-[#94A3B8]">
          Review the package preview below, then generate the PDF from the action panel.
        </p>
      )}
    </div>
  );
}

function KpiApprovalStatusCard({
  step,
  kpiReviewVisible,
  kpisConfirmed,
  reviewerNotes,
  canReviewKpis,
  active = false,
  compact = false,
  onReviewKpis,
  onKpisConfirmedChange,
  onReviewerNotesChange,
}: {
  step: string;
  kpiReviewVisible: boolean;
  kpisConfirmed: boolean;
  reviewerNotes: string;
  canReviewKpis: boolean;
  active?: boolean;
  compact?: boolean;
  onReviewKpis: () => void;
  onKpisConfirmedChange: (confirmed: boolean) => void;
  onReviewerNotesChange: (notes: string) => void;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const status = kpisConfirmed
    ? "Approved ✓"
    : kpiReviewVisible
      ? "Awaiting Approval"
      : "Review Required";

  return (
    <div
      className={`rounded-2xl border transition ${compact ? "p-3" : "p-4"} ${
        active
          ? "border-[#5B8CFF] bg-[#172033] shadow-lg shadow-[#5B8CFF]/10"
          : "border-[#243041] bg-[#0B1020]"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#5B8CFF]">{step}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#94A3B8]">Review KPIs</p>
      <p className={`${compact ? "sr-only" : "mt-2 min-h-8"} text-[11px] leading-4 text-slate-400`}>
        Review KPI outputs and approve reasonableness.
      </p>
      <p className={`mt-2 text-sm font-bold ${kpisConfirmed ? "text-emerald-300" : "text-[#F9FAFB]"}`}>
        {status}
      </p>

      {!kpiReviewVisible && !kpisConfirmed && (
        <button
          type="button"
          onClick={onReviewKpis}
          disabled={!canReviewKpis}
          className="mt-3 rounded-xl bg-[#5B8CFF] px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Review KPIs
        </button>
      )}

      {kpiReviewVisible && !kpisConfirmed && (
        <label className="mt-3 flex items-start gap-2 text-sm font-semibold text-[#F9FAFB]">
          <input
            type="checkbox"
            checked={kpisConfirmed}
            onChange={(event) => onKpisConfirmedChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#5B8CFF]"
          />
          <span>
            KPIs Reviewed
            <span className={`${compact ? "sr-only" : "mt-2 block"} text-xs font-normal leading-5 text-[#94A3B8]`}>
              Confirms that KPI outputs, ratios, flux analysis, and advisory metrics were reviewed for reasonableness.
            </span>
          </span>
        </label>
      )}

      {kpisConfirmed && <p className="mt-2 text-xs font-semibold text-emerald-200">Ready for PDF</p>}

      {(kpiReviewVisible || kpisConfirmed) && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setNotesOpen((open) => !open)}
            className="text-xs font-bold text-blue-300 hover:text-blue-200"
          >
            {notesOpen ? "Hide Notes" : reviewerNotes ? "Edit Notes" : "Add Notes"}
          </button>
          {notesOpen && (
            <label className="mt-3 block">
              <span className="text-xs font-semibold text-[#F9FAFB]">Reviewer Notes (optional)</span>
              <textarea
                value={reviewerNotes}
                onChange={(event) => onReviewerNotesChange(event.target.value)}
                placeholder="Add package review notes, adjustments, or internal context."
                className="mt-2 min-h-20 w-full rounded-xl border border-[#243041] bg-[#111827] p-3 text-xs text-[#F9FAFB] outline-none placeholder:text-[#94A3B8] focus:border-[#5B8CFF]"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

function ImportActionBar({
  missingReports,
  requiredUploadedReportsCount,
  totalReportsCount,
  isFolderImporting,
  onImportClick,
  onManualUploadsClick,
}: {
  missingReports: PackageRequirementStatus[];
  requiredUploadedReportsCount: number;
  totalReportsCount: number;
  isFolderImporting: boolean;
  onImportClick: () => void;
  onManualUploadsClick: () => void;
}) {
  const missingCount = missingReports.length;

  return (
    <section
      id="import-action-bar"
      className="mb-10 rounded-3xl border border-[#5B8CFF]/30 bg-[#111827] p-5 shadow-xl shadow-black/20"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5B8CFF]">
            Import Reports
          </p>
          <h3 className="mt-2 text-xl font-bold text-[#F9FAFB]">
            {missingCount} missing required {missingCount === 1 ? "report" : "reports"}
          </h3>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Select a folder containing your QuickBooks exports.
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {requiredUploadedReportsCount}/{totalReportsCount} required resolved
            {missingCount > 0 ? ` | Missing: ${missingReports.map((report) => report.label).join(", ")}` : ""}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onImportClick}
            disabled={isFolderImporting}
            className="rounded-2xl bg-[#5B8CFF] px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFolderImporting ? "Importing..." : "Import From Folder"}
          </button>
          <button
            type="button"
            onClick={onManualUploadsClick}
            className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500"
          >
            Manual Uploads
          </button>
        </div>
      </div>
    </section>
  );
}

function ImportMethodSelector({
  isImporting,
  onImportFromFolder,
  onManualUpload,
}: {
  isImporting: boolean;
  onImportFromFolder: () => void;
  onManualUpload: () => void;
}) {
  return (
    <section className="rounded-3xl border border-[#243041] bg-[#111827] p-6 shadow-xl shadow-black/10">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
          Choose Import Method
        </p>
        <h3 className="mt-2 text-2xl font-bold text-[#F9FAFB]">How would you like to add reports?</h3>
        <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
          Import a full folder of QuickBooks exports for auto-matching, or manually upload each report below.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={onImportFromFolder}
          disabled={isImporting}
          className="rounded-2xl border border-[#5B8CFF]/40 bg-[#172033] p-5 text-left transition hover:border-[#5B8CFF] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="block text-lg font-bold text-[#F9FAFB]">
            {isImporting ? "Importing..." : "Import From Folder"}
          </span>
          <span className="mt-2 block text-sm leading-6 text-[#94A3B8]">
            Select one local folder and let FinSight auto-match supported CSV, XLS, and XLSX exports.
          </span>
        </button>

        <button
          type="button"
          onClick={onManualUpload}
          className="rounded-2xl border border-[#243041] bg-[#0B1020] p-5 text-left transition hover:border-[#5B8CFF]/70"
        >
          <span className="block text-lg font-bold text-[#F9FAFB]">Manual Upload Reports</span>
          <span className="mt-2 block text-sm leading-6 text-[#94A3B8]">
            Skip folder matching and upload or replace reports one card at a time.
          </span>
        </button>
      </div>
    </section>
  );
}

function PremiumPackageSelector({
  packageTier,
  hasSelectedPackage,
  onPackageTierChange,
}: {
  packageTier: PackageTier;
  hasSelectedPackage: boolean;
  onPackageTierChange: (tier: PackageTier) => void;
}) {
  const packages = [
    {
      tier: "essential" as PackageTier,
      name: "Essential",
      description: "Core monthly financial package for clean client reporting.",
      included: ["Executive summary", "Income statement", "Balance sheet", "AR/AP aging"],
    },
    {
      tier: "professional" as PackageTier,
      name: "Professional",
      description: "Expanded analytics for advisory clients and deeper operating insight.",
      included: ["Ratio analysis", "Inventory analytics", "Top customers/vendors", "Margin review"],
    },
    {
      tier: "virtualCfo" as PackageTier,
      name: "Virtual CFO",
      description: "Board-style CFO package with advanced variance and risk analysis.",
      included: ["Flux analysis", "Payroll/FTE", "Fixed assets", "Risk indicators"],
    },
  ];

  return (
    <section id="package-selection" className="workflow-section">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
            Step 1
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#F9FAFB]">Select Package Level</h2>
        </div>
        <p className="text-sm text-[#94A3B8]">
          Current package: {hasSelectedPackage ? PACKAGE_LABELS[packageTier] : "Not selected"}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {packages.map((item) => {
          const selected = hasSelectedPackage && packageTier === item.tier;

          return (
            <button
              key={item.tier}
              type="button"
              onClick={() => onPackageTierChange(item.tier)}
              className={`rounded-3xl border p-6 text-left shadow-lg transition ${
                selected
                  ? "border-[#5B8CFF] bg-[#172033] shadow-[#5B8CFF]/10"
                  : "border-[#243041] bg-[#111827] shadow-black/10 hover:border-[#5B8CFF]/60"
              }`}
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <h3 className="text-2xl font-bold text-[#F9FAFB]">{item.name}</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    selected ? "bg-[#5B8CFF] text-white" : "bg-[#172033] text-[#94A3B8]"
                  }`}
                >
                  {selected ? "Selected" : "Select"}
                </span>
              </div>

              <p className="min-h-14 text-sm leading-6 text-[#94A3B8]">{item.description}</p>

              <div className="mt-6 space-y-2">
                {item.included.map((included) => (
                  <p key={included} className="text-sm text-[#F9FAFB]">
                    {included}
                  </p>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FolderImportPanel({
  inputRef,
  result,
  isImporting,
  onImportClick,
  onFallbackFiles,
}: {
  inputRef: RefObject<HTMLInputElement>;
  result: FolderImportResult | null;
  isImporting: boolean;
  onImportClick: () => void;
  onFallbackFiles: (files: File[]) => Promise<void>;
}) {
  return (
    <section className="rounded-3xl border border-[#243041] bg-[#111827] p-6 shadow-xl shadow-black/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
            Folder Import
          </p>
          <h3 className="mt-2 text-2xl font-bold text-[#F9FAFB]">Import From Folder</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#94A3B8]">
            Select a local folder and FinSight will scan CSV/XLS/XLSX files, match filenames to
            report slots, and load matches through the same parser used by manual uploads.
          </p>
        </div>
        <button
          type="button"
          onClick={onImportClick}
          disabled={isImporting}
          className="rounded-2xl bg-[#5B8CFF] px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isImporting ? "Importing..." : "Import From Folder"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".csv,.xlsx,.xls"
        className="sr-only"
        {...{ webkitdirectory: "", directory: "" }}
        onChange={async (event) => {
          const files = Array.from(event.target.files || []);
          if (files.length) await onFallbackFiles(files);
          event.target.value = "";
        }}
      />

      {result && <FolderImportResults result={result} />}
    </section>
  );
}

function FolderImportResults({ result }: { result: FolderImportResult }) {
  const resultGroups = [
    {
      title: "Matched Files",
      items: result.matchedFiles.map((item) => `${item.reportLabel}: ${item.fileName}`),
      emptyText: "No files matched report slots.",
      tone: "emerald",
    },
    {
      title: "Unmatched Files",
      items: result.unmatchedFiles,
      emptyText: "No unmatched files.",
      tone: "slate",
    },
    {
      title: "Duplicate Matches",
      items: result.duplicateMatches.map((item) => `${item.reportLabel}: ${item.fileNames.join(", ")}`),
      emptyText: "No duplicate matches.",
      tone: "amber",
    },
    {
      title: "Missing Required Reports",
      items: result.missingRequiredReports,
      emptyText: "No missing required reports.",
      tone: "blue",
    },
  ];

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-4">
      {resultGroups.map((group) => (
        <div key={group.title} className="rounded-2xl border border-[#243041] bg-[#0B1020] p-4">
          <p
            className={`text-xs font-bold uppercase tracking-[0.12em] ${
              group.tone === "emerald"
                ? "text-emerald-300"
                : group.tone === "amber"
                  ? "text-amber-300"
                  : group.tone === "blue"
                    ? "text-blue-300"
                    : "text-[#94A3B8]"
            }`}
          >
            {group.title}
          </p>
          <div className="mt-3 space-y-2 text-sm text-[#F9FAFB]">
            {group.items.length > 0 ? (
              group.items.map((item) => (
                <p key={item} className="rounded-xl bg-[#111827] px-3 py-2">
                  {item}
                </p>
              ))
            ) : (
              <p className="text-[#94A3B8]">{group.emptyText}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function UploadGroup({
  title,
  subtitle,
  reports,
  packageTier,
}: {
  title: string;
  subtitle: string;
  reports: UploadReport[];
  packageTier: PackageTier;
}) {
  return (
    <section className="rounded-3xl border border-[#243041] bg-[#111827] p-6 shadow-xl shadow-black/10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#F9FAFB]">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#94A3B8]">{subtitle}</p>
        </div>
        <p className="rounded-full bg-[#172033] px-3 py-1 text-xs font-semibold text-[#94A3B8]">
          {reports.filter((report) => (isReportAvailable(report.tier, packageTier) || isReportRequiredForPackage(report.id, packageTier)) && report.data && !report.omitted).length}
          /{reports.filter((report) => isReportAvailable(report.tier, packageTier) || isReportRequiredForPackage(report.id, packageTier)).length} uploaded
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {reports.map((report) =>
          isReportAvailable(report.tier, packageTier) || isReportRequiredForPackage(report.id, packageTier) ? (
            <PremiumUploadCard key={report.id} report={report} />
          ) : (
            <LockedUploadCard key={report.id} report={report} />
          ),
        )}
      </div>
    </section>
  );
}

function PremiumUploadCard({ report }: { report: UploadReport }) {
  const [fileInputKey, setFileInputKey] = useState(0);
  const uploaded = Boolean(report.data);
  const quickBooksHelp = QUICKBOOKS_REPORT_HELP[report.id];
  const status = report.omitted
    ? "Omitted"
    : uploaded
      ? "Uploaded"
      : report.required
        ? "Missing"
        : "Optional";
  const statusClass = report.omitted
    ? "bg-slate-500/15 text-slate-300"
    : uploaded
      ? "bg-emerald-500/15 text-emerald-300"
      : report.required
        ? "bg-amber-500/15 text-amber-300"
        : "bg-[#111827] text-[#94A3B8]";

  return (
    <div
      className={`rounded-2xl border p-5 shadow-lg shadow-black/10 ${
        report.omitted ? "border-slate-700 bg-[#111827] opacity-80" : "border-[#243041] bg-[#172033]"
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-[#F9FAFB]">{report.label}</h3>
            {quickBooksHelp && <QuickBooksHelpTrigger help={quickBooksHelp} />}
            <PackageBadge tier={report.tier} />
            <span className="rounded-full bg-[#0B1020] px-3 py-1 text-xs font-semibold text-[#94A3B8]">
              {report.required ? "Required" : "Optional"}
            </span>
          </div>
          <p className="text-sm leading-6 text-[#94A3B8]">{report.description}</p>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
          {status}
        </span>
      </div>

      <label
        className={`block rounded-2xl border border-dashed bg-[#111827] p-5 transition ${
          report.omitted
            ? "cursor-not-allowed border-[#243041]"
            : "cursor-pointer border-[#5B8CFF]/40 hover:border-[#5B8CFF]"
        }`}
      >
        <input
          key={fileInputKey}
          type="file"
          accept=".csv,.xlsx,.xls"
          disabled={report.omitted}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await report.onFile(file);
          }}
          className="sr-only"
        />

        <span className="block text-sm font-semibold text-[#F9FAFB]">
          {report.omitted ? "Report omitted from package" : uploaded ? "Replace uploaded file" : "Upload report"}
        </span>
        <span className="mt-2 block text-xs text-[#94A3B8]">
          Accepted file types: CSV, XLS, XLSX
        </span>
        {report.data && (
          <span className="mt-3 block truncate rounded-xl bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB]">
            {report.data.name}
          </span>
        )}
      </label>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-start gap-3 text-sm text-[#94A3B8]">
          <input
            type="checkbox"
            checked={report.omitted}
            onChange={(event) => report.onOmitChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#5B8CFF]"
          />
          <span>
            <span className="block text-[#F9FAFB]">Omit this report from package</span>
            {report.required && (
              <span className="mt-1 block text-xs text-[#94A3B8]">
                Omitted required reports count as resolved for workflow progress.
              </span>
            )}
          </span>
        </label>

        {uploaded && (
          <button
            type="button"
            onClick={() => {
              report.onRemove();
              setFileInputKey((current) => current + 1);
            }}
            className="rounded-xl border border-[#243041] px-4 py-2 text-sm font-semibold text-[#F9FAFB] transition hover:border-red-400/60 hover:text-red-300"
          >
            Remove file
          </button>
        )}
      </div>
    </div>
  );
}

function LockedUploadCard({ report }: { report: UploadReport }) {
  const quickBooksHelp = QUICKBOOKS_REPORT_HELP[report.id];

  return (
    <div className="rounded-2xl border border-[#243041] bg-[#111827] p-5 opacity-80 shadow-lg shadow-black/10">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-[#F9FAFB]">{report.label}</h3>
          {quickBooksHelp && <QuickBooksHelpTrigger help={quickBooksHelp} />}
        </div>
        <span className="rounded-full bg-[#172033] px-3 py-1 text-xs font-semibold text-[#94A3B8]">
          Locked
        </span>
      </div>

      <p className="text-sm leading-6 text-[#94A3B8]">{report.description}</p>

      <div className="mt-5 rounded-2xl border border-dashed border-[#243041] bg-[#0B1020] p-4 text-sm text-[#94A3B8]">
        {report.tier === "professional" ? "Available in Professional" : "Available in Virtual CFO"}
      </div>
    </div>
  );
}

function QuickBooksHelpTrigger({ help }: { help: QuickBooksReportHelp }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1 text-xs font-bold text-[#7BA3FF] underline decoration-[#7BA3FF]/50 underline-offset-4 transition hover:text-blue-200"
        aria-expanded={open}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#5B8CFF]/60 bg-[#0B1020] text-[11px] no-underline">
          ?
        </span>
        Where do I find this in QuickBooks?
      </button>

      {open && (
        <div className="absolute left-0 top-8 z-30 w-[min(22rem,calc(100vw-3rem))] rounded-2xl border border-[#5B8CFF]/30 bg-[#0B1020] p-4 text-left shadow-2xl shadow-black/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7BA3FF]">QuickBooks Location</p>
              <h4 className="mt-1 text-sm font-bold text-[#F9FAFB]">{help.title}</h4>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-300 hover:border-slate-500"
              aria-label="Close QuickBooks help"
            >
              x
            </button>
          </div>

          <div className="mt-4 grid gap-3 text-xs leading-5 text-[#CBD5E1]">
            <div>
              <p className="font-bold text-[#F9FAFB]">QuickBooks Online</p>
              <p className="mt-1 text-[#94A3B8]">{help.qbo}</p>
            </div>
            <div>
              <p className="font-bold text-[#F9FAFB]">QuickBooks Desktop / Enterprise</p>
              <p className="mt-1 text-[#94A3B8]">{help.desktop}</p>
            </div>
            {help.note && (
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-amber-100">
                <span className="font-bold">Note: </span>
                {help.note}
              </div>
            )}
            <div className="rounded-xl border border-[#243041] bg-[#111827] p-3">
              <p className="font-bold text-[#F9FAFB]">Export</p>
              <p className="mt-1 text-[#94A3B8]">{help.export}</p>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

function PackageBadge({ tier }: { tier: UploadTier }) {
  return (
    <span className="rounded-full bg-[#0B1020] px-3 py-1 text-xs font-semibold text-[#94A3B8]">
      {PACKAGE_LABELS[tier]}
    </span>
  );
}

function PackageCustomizationPanel({
  packageTier,
  reports,
  clientName,
  reportingPeriod,
  clientIndustry,
  companyTagline,
  preparedFor,
  firmLogoPath,
  firmLogoDataUrl,
  firmLogoFileName,
  confidentialWatermark,
  preparedBy,
  saveSettingsForClient,
  selectedPdfSections,
  useSamePowerPointSelections,
  selectedPowerPointSections,
  selectedRatios,
  selectedCharts,
  selectedFluxAnalyses,
  fluxSettings,
  includeHighSeverityOnly,
  includeModerateSeverity,
  maxFluxRows,
  onClientNameChange,
  onReportingPeriodChange,
  onClientIndustryChange,
  onCompanyTaglineChange,
  onPreparedForChange,
  onFirmLogoPathChange,
  onFirmLogoFileChange,
  onClearFirmLogo,
  onConfidentialWatermarkChange,
  onPreparedByChange,
  onSaveSettingsForClientChange,
  onSelectedPdfSectionsChange,
  onUseSamePowerPointSelectionsChange,
  onSelectedPowerPointSectionsChange,
  onSelectedRatiosChange,
  onSelectedChartsChange,
  onSelectedFluxAnalysesChange,
  onFluxSettingsChange,
  onIncludeHighSeverityOnlyChange,
  onIncludeModerateSeverityChange,
  onMaxFluxRowsChange,
  onSaveClientSettings,
  onLoadClientSettings,
  onResetDefaults,
  dsoInputNeeded,
  dsoInputResolved,
  dsoInputOmitted,
  dsoConfirmed,
  dsoInputsChangedAfterConfirmation,
  dso,
  accountsReceivable,
  accountsReceivableOverride,
  accountsReceivableUsed,
  detectedRevenue,
  revenueUsed,
  averageDailySalesUsed,
  startDate,
  endDate,
  manualDays,
  autoDays,
  effectiveDays,
  monthlyRevenue,
  dsoPeriodDays,
  averageDailySales,
  salesDetailData,
  salesDetailRevenue,
  onStartDateChange,
  onEndDateChange,
  onManualDaysChange,
  onAccountsReceivableOverrideChange,
  onMonthlyRevenueChange,
  onDsoPeriodDaysChange,
  onAverageDailySalesChange,
  onSalesDetailFile,
  onConfirmDso,
  onEditDsoInputs,
  onOmitDsoInput,
}: {
  packageTier: PackageTier;
  reports: UploadReport[];
  clientName: string;
  reportingPeriod: string;
  clientIndustry: string;
  companyTagline: string;
  preparedFor: string;
  firmLogoPath: string;
  firmLogoDataUrl: string;
  firmLogoFileName: string;
  confidentialWatermark: boolean;
  preparedBy: string;
  saveSettingsForClient: boolean;
  selectedPdfSections: PackageSectionId[];
  useSamePowerPointSelections: boolean;
  selectedPowerPointSections: PackageSectionId[];
  selectedRatios: RatioId[];
  selectedCharts: ChartSelectionId[];
  selectedFluxAnalyses: FluxAnalysisId[];
  fluxSettings: FluxSettings;
  includeHighSeverityOnly: boolean;
  includeModerateSeverity: boolean;
  maxFluxRows: number;
  onClientNameChange: (value: string) => void;
  onReportingPeriodChange: (value: string) => void;
  onClientIndustryChange: (value: string) => void;
  onCompanyTaglineChange: (value: string) => void;
  onPreparedForChange: (value: string) => void;
  onFirmLogoPathChange: (value: string) => void;
  onFirmLogoFileChange: (file: File | null) => void;
  onClearFirmLogo: () => void;
  onConfidentialWatermarkChange: (value: boolean) => void;
  onPreparedByChange: (value: string) => void;
  onSaveSettingsForClientChange: (value: boolean) => void;
  onSelectedPdfSectionsChange: (sections: PackageSectionId[]) => void;
  onUseSamePowerPointSelectionsChange: (value: boolean) => void;
  onSelectedPowerPointSectionsChange: (sections: PackageSectionId[]) => void;
  onSelectedRatiosChange: (ratios: RatioId[]) => void;
  onSelectedChartsChange: (charts: ChartSelectionId[]) => void;
  onSelectedFluxAnalysesChange: (analyses: FluxAnalysisId[]) => void;
  onFluxSettingsChange: (settings: FluxSettings) => void;
  onIncludeHighSeverityOnlyChange: (value: boolean) => void;
  onIncludeModerateSeverityChange: (value: boolean) => void;
  onMaxFluxRowsChange: (value: number) => void;
  onSaveClientSettings: () => void;
  onLoadClientSettings: () => void;
  onResetDefaults: () => void;
  dsoInputNeeded: boolean;
  dsoInputResolved: boolean;
  dsoInputOmitted: boolean;
  dsoConfirmed: boolean;
  dsoInputsChangedAfterConfirmation: boolean;
  dso: number | null;
  accountsReceivable: number;
  accountsReceivableOverride: string;
  accountsReceivableUsed: number;
  detectedRevenue: number;
  revenueUsed: number | null;
  averageDailySalesUsed: number | null;
  startDate: string;
  endDate: string;
  manualDays: string;
  autoDays: number | null;
  effectiveDays: number | null;
  monthlyRevenue: string;
  dsoPeriodDays: string;
  averageDailySales: string;
  salesDetailData: ParsedFile | null;
  salesDetailRevenue: number | null;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onManualDaysChange: (value: string) => void;
  onAccountsReceivableOverrideChange: (value: string) => void;
  onMonthlyRevenueChange: (value: string) => void;
  onDsoPeriodDaysChange: (value: string) => void;
  onAverageDailySalesChange: (value: string) => void;
  onSalesDetailFile: (file: File) => Promise<void>;
  onConfirmDso: () => void;
  onEditDsoInputs: () => void;
  onOmitDsoInput: () => void;
}) {
  const [salesDetailInputKey, setSalesDetailInputKey] = useState(0);
  const missingCount = dsoInputResolved ? 0 : 1;
  const resolvedCount = dsoInputNeeded && dsoInputResolved ? 1 : 0;
  const showDsoSetup =
    dsoInputNeeded ||
    dsoConfirmed ||
    dsoInputOmitted ||
    dsoInputsChangedAfterConfirmation ||
    dso !== null;
  const availableSectionOptions = packageSectionOptions.filter((option) =>
    isReportAvailable(option.minimumTier, packageTier),
  );
  const packageCompletenessScore = Math.round((selectedPdfSections.length / Math.max(availableSectionOptions.length, 1)) * 100);
  const reportMap = new Map(reports.map((report) => [report.id, report]));
  const isSectionMissingData = (option: (typeof packageSectionOptions)[number]) =>
    Boolean(
      option.requiredReportIds?.length &&
        !option.requiredReportIds.some((id) => {
          const report = reportMap.get(id);
          return report?.data || report?.omitted;
        }),
    );
  const togglePdfSection = (sectionId: PackageSectionId) => {
    onSelectedPdfSectionsChange(
      selectedPdfSections.includes(sectionId)
        ? selectedPdfSections.filter((id) => id !== sectionId)
        : [...selectedPdfSections, sectionId],
    );
  };
  const togglePowerPointSection = (sectionId: PackageSectionId) => {
    onSelectedPowerPointSectionsChange(
      selectedPowerPointSections.includes(sectionId)
        ? selectedPowerPointSections.filter((id) => id !== sectionId)
        : [...selectedPowerPointSections, sectionId],
    );
  };
  const toggleRatio = (ratioId: RatioId) => {
    onSelectedRatiosChange(
      selectedRatios.includes(ratioId)
        ? selectedRatios.filter((id) => id !== ratioId)
        : [...selectedRatios, ratioId],
    );
  };
  const toggleChart = (chartId: ChartSelectionId) => {
    onSelectedChartsChange(
      selectedCharts.includes(chartId)
        ? selectedCharts.filter((id) => id !== chartId)
        : [...selectedCharts, chartId],
    );
  };
  const toggleFluxAnalysis = (analysisId: FluxAnalysisId) => {
    onSelectedFluxAnalysesChange(
      selectedFluxAnalyses.includes(analysisId)
        ? selectedFluxAnalyses.filter((id) => id !== analysisId)
        : [...selectedFluxAnalyses, analysisId],
    );
  };

  return (
    <section id="missing-inputs" className="workflow-section mt-10 rounded-3xl border border-[#243041] bg-[#111827] p-8 shadow-xl shadow-black/10">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
            Step 3
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[#F9FAFB]">Customize Package</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#94A3B8]">
            Choose client details, package outputs, ratios, and flux settings before reviewing finalized KPIs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-500/15 px-4 py-2 text-xs font-bold text-blue-200">
            Package completeness: {packageCompletenessScore}%
          </span>
          <span className="rounded-full bg-amber-500/15 px-4 py-2 text-xs font-bold text-amber-200">
            Missing Inputs: {missingCount} remaining
          </span>
          <span className="rounded-full bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-200">
            Resolved Inputs: {resolvedCount} complete
          </span>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="rounded-3xl border border-[#243041] bg-[#172033] p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
                Client Profile
              </p>
              <h3 className="mt-2 text-2xl font-bold text-[#F9FAFB]">Package Identity</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onSaveClientSettings} className="rounded-xl bg-[#5B8CFF] px-4 py-2 text-sm font-bold text-white">
                Save Client Settings
              </button>
              <button type="button" onClick={onLoadClientSettings} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200">
                Load Client Settings
              </button>
              <button type="button" onClick={onResetDefaults} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200">
                Reset to Package Defaults
              </button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
              <span className="text-sm font-semibold text-[#F9FAFB]">Client name</span>
              <input value={clientName} onChange={(event) => onClientNameChange(event.target.value)} className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB]" />
            </label>
            <label className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
              <span className="text-sm font-semibold text-[#F9FAFB]">Reporting period</span>
              <input value={reportingPeriod} onChange={(event) => onReportingPeriodChange(event.target.value)} className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB]" />
            </label>
            <label className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
              <span className="text-sm font-semibold text-[#F9FAFB]">Client industry</span>
              <input value={clientIndustry} onChange={(event) => onClientIndustryChange(event.target.value)} className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB]" />
            </label>
            <label className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
              <span className="text-sm font-semibold text-[#F9FAFB]">Company tagline / subtitle</span>
              <input value={companyTagline} onChange={(event) => onCompanyTaglineChange(event.target.value)} className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB]" />
            </label>
            <label className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
              <span className="text-sm font-semibold text-[#F9FAFB]">Prepared for</span>
              <input value={preparedFor} onChange={(event) => onPreparedForChange(event.target.value)} className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB]" />
            </label>
            <label className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
              <span className="text-sm font-semibold text-[#F9FAFB]">Prepared by</span>
              <input value={preparedBy} onChange={(event) => onPreparedByChange(event.target.value)} className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB]" />
            </label>
            <div className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
              <span className="text-sm font-semibold text-[#F9FAFB]">Firm logo</span>
              <input
                value={firmLogoPath}
                onChange={(event) => onFirmLogoPathChange(event.target.value)}
                placeholder="Logo URL or image path"
                className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB]"
              />
              <label className="mt-3 block">
                <span className="mb-2 block text-xs font-semibold text-[#94A3B8]">Or upload from this computer</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  onChange={(event) => onFirmLogoFileChange(event.target.files?.[0] || null)}
                  className="block w-full text-xs text-[#94A3B8] file:mr-3 file:rounded-lg file:border-0 file:bg-[#5B8CFF] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                />
              </label>
              {firmLogoDataUrl && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-[#0B1020] p-3">
                  <span className="truncate text-xs font-semibold text-emerald-300">
                    Uploaded: {firmLogoFileName || "firm logo"}
                  </span>
                  <button type="button" onClick={onClearFirmLogo} className="text-xs font-bold text-slate-300 hover:text-white">
                    Remove
                  </button>
                </div>
              )}
              <span className="mt-2 block text-xs leading-5 text-[#94A3B8]">
                Uploaded logos take priority. Leave both options blank to show the FIRM LOGO placeholder.
              </span>
            </div>
            <div className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
              <span className="text-sm font-semibold text-[#F9FAFB]">Package level</span>
              <p className="mt-3 rounded-xl bg-[#0B1020] px-3 py-2 text-sm font-bold text-[#F9FAFB]">{PACKAGE_LABELS[packageTier]}</p>
              <label className="mt-3 flex items-center gap-2 text-xs text-[#94A3B8]">
                <input type="checkbox" checked={saveSettingsForClient} onChange={(event) => onSaveSettingsForClientChange(event.target.checked)} />
                Save settings for this client
              </label>
              <label className="mt-3 flex items-center gap-2 text-xs text-[#94A3B8]">
                <input type="checkbox" checked={confidentialWatermark} onChange={(event) => onConfidentialWatermarkChange(event.target.checked)} />
                Confidential watermark
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[#243041] bg-[#172033] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">Output Selection</p>
          <h3 className="mt-2 text-2xl font-bold text-[#F9FAFB]">PDF Package Sections</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {availableSectionOptions.map((option) => {
              const selected = selectedPdfSections.includes(option.id);
              const missingData = selected && isSectionMissingData(option);
              return (
                <label key={option.id} className="flex items-start gap-3 rounded-2xl border border-[#243041] bg-[#111827] p-4">
                  <input type="checkbox" checked={selected} onChange={() => togglePdfSection(option.id)} className="mt-1" />
                  <span>
                    <span className="font-semibold text-[#F9FAFB]">{option.label}</span>
                    {missingData && <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-300">Missing Data</span>}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-blue-900/50 bg-blue-950/30 p-4">
            <p className="text-sm font-bold text-blue-100">PowerPoint mirrors PDF selections</p>
            <p className="mt-2 text-sm leading-6 text-blue-100/80">
              Step 6 will create slides for the sections included above in the PDF package, so the board presentation
              stays aligned with the reviewed PDF.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-[#243041] bg-[#172033] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">Ratio Customization</p>
            <h3 className="mt-2 text-2xl font-bold text-[#F9FAFB]">Ratios to Include</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {ratioOptions.map((ratio) => (
                <label key={ratio} className="flex items-center gap-3 rounded-2xl border border-[#243041] bg-[#111827] p-4">
                  <input type="checkbox" checked={selectedRatios.includes(ratio)} onChange={() => toggleRatio(ratio)} />
                  <span className="text-sm font-semibold text-[#F9FAFB]">{ratio}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#243041] bg-[#172033] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">Dashboard Customization</p>
            <h3 className="mt-2 text-2xl font-bold text-[#F9FAFB]">Charts to Include</h3>
            <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
              Selected charts flow into the PDF dashboard and Board / Owner presentation.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {chartOptions
                .filter((chart) => isReportAvailable(chart.minimumTier, packageTier))
                .map((chart) => (
                  <label key={chart.id} className="flex items-center gap-3 rounded-2xl border border-[#243041] bg-[#111827] p-4">
                    <input type="checkbox" checked={selectedCharts.includes(chart.id)} onChange={() => toggleChart(chart.id)} />
                    <span className="text-sm font-semibold text-[#F9FAFB]">{chart.label}</span>
                  </label>
                ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#243041] bg-[#172033] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">Flux Customization</p>
            <h3 className="mt-2 text-2xl font-bold text-[#F9FAFB]">Flux Analyses and Thresholds</h3>
            <div className="mt-5 grid gap-3">
              {[
                { id: "month" as FluxAnalysisId, label: "Month-over-Month" },
                { id: "quarter" as FluxAnalysisId, label: "Quarter-over-Quarter" },
                { id: "year" as FluxAnalysisId, label: "Year-over-Year" },
              ].map((item) => (
                <label key={item.id} className="flex items-center gap-3 rounded-2xl border border-[#243041] bg-[#111827] p-4">
                  <input type="checkbox" checked={selectedFluxAnalyses.includes(item.id)} onChange={() => toggleFluxAnalysis(item.id)} />
                  <span className="font-semibold text-[#F9FAFB]">{item.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
                <span className="text-sm font-semibold text-[#F9FAFB]">Dollar threshold</span>
                <input type="number" value={fluxSettings.dollarThreshold} onChange={(event) => onFluxSettingsChange({ ...fluxSettings, dollarThreshold: Number(event.target.value) })} className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB]" />
              </label>
              <label className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
                <span className="text-sm font-semibold text-[#F9FAFB]">Percent threshold</span>
                <input type="number" value={fluxSettings.percentThreshold} onChange={(event) => onFluxSettingsChange({ ...fluxSettings, percentThreshold: Number(event.target.value) })} className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB]" />
              </label>
              <label className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
                <span className="text-sm font-semibold text-[#F9FAFB]">Threshold logic</span>
                <select value={fluxSettings.logic} onChange={(event) => onFluxSettingsChange({ ...fluxSettings, logic: event.target.value as ThresholdLogic })} className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB]">
                  <option value="either">OR - either threshold</option>
                  <option value="both">AND - both thresholds</option>
                </select>
              </label>
              <label className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
                <span className="text-sm font-semibold text-[#F9FAFB]">Maximum rows per section</span>
                <input type="number" min="1" value={maxFluxRows} onChange={(event) => onMaxFluxRowsChange(Number(event.target.value) || 10)} className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB]" />
              </label>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-[#243041] bg-[#111827] p-4 text-sm font-semibold text-[#F9FAFB]">
                <input type="checkbox" checked={includeHighSeverityOnly} onChange={(event) => onIncludeHighSeverityOnlyChange(event.target.checked)} />
                Include high severity only
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-[#243041] bg-[#111827] p-4 text-sm font-semibold text-[#F9FAFB]">
                <input type="checkbox" checked={includeModerateSeverity} onChange={(event) => onIncludeModerateSeverityChange(event.target.checked)} />
                Include moderate severity
              </label>
            </div>
          </div>
        </div>
      </div>

      {!showDsoSetup && (
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-emerald-300">
            No Additional Inputs Needed
          </p>
          <p className="mt-2 text-sm leading-6 text-[#F9FAFB]">
            FinSight has enough uploaded data and period assumptions to continue to KPI review.
          </p>
        </div>
      )}

      {showDsoSetup && (
        <div className="rounded-3xl border border-[#5B8CFF]/30 bg-[#172033] p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
                DSO Setup
              </p>
              <h3 className="mt-2 text-2xl font-bold text-[#F9FAFB]">
                Additional Information Needed for DSO
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#94A3B8]">
                Accounts receivable was detected at {formatCurrency(accountsReceivable)}, but FinSight
                needs average daily sales to calculate DSO.
              </p>
            </div>
            <span className={`rounded-full px-4 py-2 text-xs font-bold ${
              dsoConfirmed
                ? "bg-emerald-500/15 text-emerald-300"
                : dsoInputOmitted
                  ? "bg-slate-500/15 text-slate-300"
                  : "bg-amber-500/15 text-amber-300"
            }`}>
              {dsoConfirmed ? "DSO Confirmed" : dsoInputOmitted ? "DSO Omitted" : "Pending DSO Confirmation"}
            </span>
          </div>
          {dsoInputsChangedAfterConfirmation && (
            <p className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200">
              DSO inputs changed. Please review and confirm the updated calculation.
            </p>
          )}
          {dsoConfirmed && !dsoInputsChangedAfterConfirmation && (
            <p className="mb-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200">
              DSO calculation confirmed. Review the remaining package selections, then use the toolbar to continue to KPI Review.
            </p>
          )}
          {dsoInputOmitted && (
            <p className="mb-5 rounded-2xl border border-slate-500/30 bg-slate-500/10 px-4 py-3 text-sm font-medium text-slate-200">
              DSO omitted from this package. Use the toolbar to continue to KPI Review when the remaining selections are ready.
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
              <p className="text-sm font-bold text-[#F9FAFB]">Option 1: Monthly Revenue and Days</p>
              <p className="mt-2 text-xs leading-5 text-[#94A3B8]">
                Enter monthly revenue and days in period. If revenue is blank, detected revenue
                ({formatCurrency(detectedRevenue)}) will be used when available.
              </p>
              <input
                type="number"
                min="0"
                value={accountsReceivableOverride}
                onChange={(event) => onAccountsReceivableOverrideChange(event.target.value)}
                placeholder="Accounts receivable source value"
                className="mt-4 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB] outline-none placeholder:text-[#94A3B8] focus:border-[#5B8CFF]"
              />
              <input
                type="number"
                min="0"
                value={monthlyRevenue}
                onChange={(event) => onMonthlyRevenueChange(event.target.value)}
                placeholder="Monthly revenue amount"
                className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB] outline-none placeholder:text-[#94A3B8] focus:border-[#5B8CFF]"
              />
              <input
                type="number"
                min="1"
                value={dsoPeriodDays}
                onChange={(event) => onDsoPeriodDaysChange(event.target.value)}
                placeholder="Days in period"
                className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB] outline-none placeholder:text-[#94A3B8] focus:border-[#5B8CFF]"
              />
            </div>

            <div className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
              <p className="text-sm font-bold text-[#F9FAFB]">Option 2: Average Daily Sales</p>
              <p className="mt-2 text-xs leading-5 text-[#94A3B8]">
                Enter average daily sales directly if management already knows the daily sales run rate.
              </p>
              <input
                type="number"
                min="0"
                value={averageDailySales}
                onChange={(event) => onAverageDailySalesChange(event.target.value)}
                placeholder="Average daily sales"
                className="mt-4 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB] outline-none placeholder:text-[#94A3B8] focus:border-[#5B8CFF]"
              />
            </div>

            <div className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
              <p className="text-sm font-bold text-[#F9FAFB]">Option 3: Upload Sales Detail</p>
              <p className="mt-2 text-xs leading-5 text-[#94A3B8]">
                Upload invoice or sales detail with an amount, sales, total, invoice amount, or net sales column.
              </p>
              <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-[#5B8CFF]/40 bg-[#0B1020] px-3 py-3 text-sm font-semibold text-[#F9FAFB] hover:border-[#5B8CFF]">
                <input
                  key={salesDetailInputKey}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    await onSalesDetailFile(file);
                    setSalesDetailInputKey((current) => current + 1);
                  }}
                />
                {salesDetailData ? "Replace sales detail report" : "Upload invoice/sales detail report"}
              </label>
              {salesDetailData && (
                <p className="mt-3 truncate rounded-xl bg-[#0B1020] px-3 py-2 text-xs text-[#94A3B8]">
                  {salesDetailData.name}
                  {salesDetailRevenue ? ` | Sales detected: ${formatCurrency(salesDetailRevenue)}` : ""}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
                <span className="text-sm font-semibold text-[#F9FAFB]">Report start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => onStartDateChange(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB] outline-none focus:border-[#5B8CFF]"
                />
              </label>
              <label className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
                <span className="text-sm font-semibold text-[#F9FAFB]">Report end date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => onEndDateChange(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB] outline-none focus:border-[#5B8CFF]"
                />
                <span className="mt-2 block text-xs text-[#94A3B8]">Auto days: {autoDays ?? "Enter dates"}</span>
              </label>
              <label className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
                <span className="text-sm font-semibold text-[#F9FAFB]">Manual period days</span>
                <input
                  type="number"
                  min="1"
                  value={manualDays}
                  onChange={(event) => onManualDaysChange(event.target.value)}
                  placeholder="Optional"
                  className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB] outline-none placeholder:text-[#94A3B8] focus:border-[#5B8CFF]"
                />
                <span className="mt-2 block text-xs text-[#94A3B8]">Effective days: {effectiveDays ?? "Not set"}</span>
              </label>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#243041] bg-[#0B1020] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
                  DSO Preview
                </p>
                <h4 className="mt-2 text-xl font-bold text-[#F9FAFB]">
                  Review the DSO calculation before continuing
                </h4>
              </div>
              <span className={`rounded-full px-4 py-2 text-xs font-bold ${
                dsoConfirmed
                  ? "bg-emerald-500/15 text-emerald-300"
                  : dsoInputOmitted
                    ? "bg-slate-500/15 text-slate-300"
                    : "bg-amber-500/15 text-amber-300"
              }`}>
                {dsoConfirmed ? "DSO Confirmed" : dsoInputOmitted ? "DSO Omitted" : "Needs Review"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <PrintLikeMetric label="Accounts Receivable" value={formatCurrency(accountsReceivableUsed)} />
              <PrintLikeMetric label="Revenue Used" value={revenueUsed ? formatCurrency(revenueUsed) : "N/A"} />
              <PrintLikeMetric label="Period Days" value={dsoPeriodDays || effectiveDays ? String(dsoPeriodDays || effectiveDays) : "N/A"} />
              <PrintLikeMetric label="Average Daily Sales" value={averageDailySalesUsed ? formatCurrency(averageDailySalesUsed) : "N/A"} />
              <PrintLikeMetric label="Calculated DSO" value={dso !== null ? `${dso.toFixed(1)} days` : "Pending"} />
            </div>

            <p className="mt-4 text-sm leading-6 text-[#94A3B8]">
              {dsoInputOmitted
                ? "DSO will be omitted from ratios, PDF package, and PowerPoint outputs."
                : dso !== null
                  ? interpretDso(dso)
                  : "Provide Accounts Receivable and either revenue with period days or an average daily sales override to preview DSO."}
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onConfirmDso}
                disabled={dso === null || dsoInputOmitted}
                className="rounded-2xl bg-[#5B8CFF] px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Confirm DSO Calculation
              </button>
              <button
                type="button"
                onClick={onEditDsoInputs}
                className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500"
              >
                Edit Inputs
              </button>
              <button
                type="button"
                onClick={onOmitDsoInput}
                className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500"
              >
                Omit DSO from Package
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PrintLikeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#94A3B8]">{label}</p>
      <p className="mt-2 text-lg font-bold text-[#F9FAFB]">{value}</p>
    </div>
  );
}

function RatioAnalysisSection({
  ratioRows,
}: {
  ratioRows: Array<{ name: string; formula: string; value: string; interpretation: string }>;
}) {
  return (
    <section className="mt-10 rounded-3xl border border-blue-900/60 bg-slate-900 p-8 shadow-lg">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Ratio Analysis
      </p>
      <h2 className="mb-6 text-3xl font-bold">Advisory Ratios</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-4 py-3">Ratio</th>
              <th className="px-4 py-3">Formula</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Interpretation</th>
            </tr>
          </thead>
          <tbody>
            {ratioRows.map((ratio) => (
              <tr key={ratio.name} className="border-b border-slate-800">
                <td className="px-4 py-3 font-semibold text-slate-100">{ratio.name}</td>
                <td className="px-4 py-3 text-slate-300">{ratio.formula}</td>
                <td className="px-4 py-3 font-semibold text-slate-100">{ratio.value}</td>
                <td className="px-4 py-3 text-slate-300">{ratio.interpretation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function KpiConfirmationPanel({
  packageTier,
  kpis,
  arKpis,
  apKpis,
  inventoryKpis,
  fixedAssetKpis,
  payrollAnalysis,
  netMargin,
  includeAr,
  includeAp,
  includeInventory,
  includeFixedAssets,
  includePayroll,
  dso,
  ratioRows,
  reportsChangedAfterConfirmation,
}: {
  packageTier: PackageTier;
  kpis: KPIs;
  arKpis: AgingKpis;
  apKpis: APKpis;
  inventoryKpis: InventoryKpis;
  fixedAssetKpis: FixedAssetKpis;
  payrollAnalysis: PayrollAnalysis;
  netMargin: number;
  includeAr: boolean;
  includeAp: boolean;
  includeInventory: boolean;
  includeFixedAssets: boolean;
  includePayroll: boolean;
  dso: number | null;
  ratioRows: Array<{ name: string; formula: string; value: string; interpretation: string }>;
  reportsChangedAfterConfirmation: boolean;
}) {
  const confirmationRows = [
    { label: "Revenue", value: formatMoney(kpis.revenue) },
    { label: "Gross Profit", value: formatMoney(kpis.grossProfit) },
    { label: "Expenses", value: formatMoney(kpis.expenses) },
    { label: "Net Income", value: formatMoney(kpis.netIncome) },
    { label: "Cash", value: formatMoney(kpis.cash) },
    { label: "Accounts Receivable", value: formatMoney(kpis.accountsReceivable) },
    { label: "Total Assets", value: formatMoney(kpis.totalAssets) },
    ...ratioRows
      .filter((row) => ["Current Ratio", "Quick Ratio", "Working Capital Estimate"].includes(row.name))
      .map((row) => ({ label: row.name, value: row.value })),
    ...(includeAr ? [{ label: "AR Aging Total", value: formatMoney(arKpis.total) }] : []),
    ...(includeAp ? [{ label: "AP Aging Total", value: formatMoney(apKpis.total) }] : []),
    ...(dso !== null ? [{ label: "DSO", value: `${dso.toFixed(1)} days` }] : []),
    ...(isProfessionalOrHigher(packageTier) && includeInventory
      ? [
          { label: "Inventory Value", value: formatMoney(inventoryKpis.totalValue) },
          { label: "Inventory Quantity", value: formatNumber(inventoryKpis.totalQuantity) },
        ]
      : []),
    ...(isVirtualCfo(packageTier) && includeFixedAssets
      ? [
          { label: "Fixed Assets", value: formatMoney(fixedAssetKpis.totalFixedAssets) },
          { label: "Net Book Value", value: formatMoney(fixedAssetKpis.netBookValue) },
        ]
      : []),
    ...(isVirtualCfo(packageTier) && includePayroll
      ? [
          { label: "Current FTE", value: formatFte(payrollAnalysis.totalCurrentFte) },
          { label: "Payroll Cost", value: formatMoney(payrollAnalysis.totalCurrentPayrollCost) },
          { label: "Payroll Cost Change", value: formatMoney(payrollAnalysis.totalPayrollCostChange) },
        ]
      : []),
    { label: "Net Margin", value: `${netMargin.toFixed(1)}%` },
  ];

  return (
    <section className="mt-6 rounded-3xl border border-[#243041] bg-[#172033] p-6 shadow-xl shadow-black/10">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
            KPI Review Summary
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#F9FAFB]">Review KPI Outputs</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#94A3B8]">
            Review detected metrics, selected ratios, and advisory outputs. Use the KPI approval
            control in the Workflow Action Panel when complete.
          </p>
        </div>
      </div>

      {reportsChangedAfterConfirmation && (
        <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200">
          Reports changed. Review the updated KPI outputs before approving the package.
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        {confirmationRows.map((row) => (
          <div key={row.label} className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#94A3B8]">
              {row.label}
            </p>
            <p className="mt-2 text-xl font-bold text-[#F9FAFB]">{row.value}</p>
          </div>
        ))}
      </div>

    </section>
  );
}

function GeneratePackagePanel({
  packageTier,
  uploadedReportsCount,
  requiredUploadedReportsCount,
  totalReportsCount,
  missingReports,
  canGeneratePackage,
  kpisConfirmed,
  reportsChangedAfterConfirmation,
  isPackageGenerated,
  onGeneratePackage,
  onExportPackage,
}: {
  packageTier: PackageTier;
  uploadedReportsCount: number;
  requiredUploadedReportsCount: number;
  totalReportsCount: number;
  missingReports: PackageRequirementStatus[];
  canGeneratePackage: boolean;
  kpisConfirmed: boolean;
  reportsChangedAfterConfirmation: boolean;
  isPackageGenerated: boolean;
  onGeneratePackage: () => void;
  onExportPackage: () => void;
}) {
  const uploadedReportNames = requiredUploadedReportsCount;
  const panelLabel = isPackageGenerated
    ? "Package Generated"
    : canGeneratePackage
      ? "Step 4 - Ready to Generate"
      : missingReports.length > 0
        ? "Upload Progress"
        : "KPI Review Required";

  return (
    <section className="mt-10 rounded-3xl border border-[#243041] bg-[#172033] p-6 shadow-xl shadow-black/10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
            {panelLabel}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#F9FAFB]">
            {PACKAGE_LABELS[packageTier]} Financial Package
          </h2>
          <p className="mt-2 text-sm text-[#94A3B8]">
            {uploadedReportsCount} reports uploaded. {requiredUploadedReportsCount} of{" "}
            {totalReportsCount} required reports uploaded.
          </p>
          {!canGeneratePackage && (
            <p className="mt-2 text-sm text-[#94A3B8]">
              {missingReports.length > 0
                ? "Upload all required reports to generate this package."
                : "Review and confirm KPIs before generating the financial package."}
            </p>
          )}
          {reportsChangedAfterConfirmation && (
            <p className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200">
              Reports changed. Please review and confirm KPIs again.
            </p>
          )}

          <div className="mt-5 grid gap-2">
            <ReadinessChecklistItem
              complete={uploadedReportNames > 0}
              text={`${uploadedReportsCount} reports uploaded`}
            />
            <ReadinessChecklistItem
              complete={missingReports.length === 0}
              text={
                missingReports.length === 0
                  ? "No required reports missing"
                  : `Missing: ${missingReports.map((report) => report.label).join(", ")}`
              }
            />
            <ReadinessChecklistItem
              complete={kpisConfirmed}
              text={
                kpisConfirmed
                  ? "KPIs reviewed and confirmed"
                  : "Review and confirm KPIs before generating"
              }
            />
            <ReadinessChecklistItem
              complete={isPackageGenerated}
              text={
                isPackageGenerated
                  ? "Package generated and ready to export"
                  : "Package preview not generated yet"
              }
            />
          </div>
        </div>

        {isPackageGenerated ? (
          <button
            type="button"
            onClick={onExportPackage}
            className="rounded-2xl bg-[#5B8CFF] px-6 py-4 font-semibold text-white shadow-lg shadow-[#5B8CFF]/20 transition hover:bg-[#7BA3FF]"
          >
            Export PDF Package
          </button>
        ) : (
          <button
            type="button"
            onClick={onGeneratePackage}
            disabled={!canGeneratePackage}
            className="rounded-2xl bg-[#5B8CFF] px-6 py-4 font-semibold text-white shadow-lg shadow-[#5B8CFF]/20 transition hover:bg-[#7BA3FF] disabled:cursor-not-allowed disabled:bg-slate-600 disabled:shadow-none"
          >
            Generate Financial Package
          </button>
        )}
      </div>
    </section>
  );
}

function ReadinessChecklistItem({ complete, text }: { complete: boolean; text: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          complete ? "bg-emerald-500/20 text-emerald-300" : "bg-[#0B1020] text-[#94A3B8]"
        }`}
      >
        {complete ? "OK" : "-"}
      </span>
      <span className={complete ? "text-[#F9FAFB]" : "text-[#94A3B8]"}>{text}</span>
    </div>
  );
}

function KpiCard({
  label,
  value,
  percent = false,
  plain = false,
  helperText,
}: {
  label: string;
  value: number | string | null;
  percent?: boolean;
  plain?: boolean;
  helperText?: string;
}) {
  const displayValue =
    typeof value === "string"
      ? value
      : value === null
        ? "Not provided"
        : plain
          ? formatNumber(value)
          : percent
            ? `${value.toFixed(1)}%`
            : formatMoney(value);
  const valueIsText = typeof value === "string";

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-[#243041] bg-[#172033] p-5 shadow-lg shadow-black/10">
      <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-200">{label}</p>
      <h3 className={`mt-2 font-bold ${valueIsText ? "text-base leading-6" : "text-3xl"}`}>
        {displayValue}
      </h3>
      {helperText && <p className="mt-2 text-xs leading-5 text-slate-500">{helperText}</p>}
    </div>
  );
}

function ReportMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function BoardPackagePreview({
  companyName,
  reportPeriod,
  preparedBy,
  packageTier,
  stepLabel,
  introText,
  sections,
  kpis,
  apKpis,
  inventoryKpis,
  fixedAssetKpis,
  payrollAnalysis,
  includeAp,
  includeInventory,
  includeFixedAssets,
  includePayroll,
}: {
  companyName: string;
  reportPeriod: string;
  preparedBy: string;
  packageTier: PackageTier;
  stepLabel: string;
  introText: string;
  sections: BoardPackageSection[];
  kpis: KPIs;
  apKpis: APKpis;
  inventoryKpis: InventoryKpis;
  fixedAssetKpis: FixedAssetKpis;
  payrollAnalysis: PayrollAnalysis;
  includeAp: boolean;
  includeInventory: boolean;
  includeFixedAssets: boolean;
  includePayroll: boolean;
}) {
  const includedCount = sections.filter((section) => section.status === "Included").length;
  const completenessScore = Math.round((includedCount / sections.length) * 100);

  return (
    <section id="pdf-review" className="workflow-section mt-10 rounded-[2rem] border border-[#243041] bg-[#F9FAFB] p-2 text-[#111827] shadow-2xl shadow-black/20">
      <div className="rounded-[1.75rem] bg-white p-8">
        <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
              {stepLabel}
            </p>
            <h2 className="text-4xl font-bold tracking-tight">{companyName}</h2>
            <p className="mt-2 text-base text-slate-600">
              {reportPeriod} | {PACKAGE_LABELS[packageTier]} Package
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-600">Prepared by {preparedBy}</p>
            <p className="mt-2 text-3xl font-bold text-[#111827]">{completenessScore}%</p>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Package completeness</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-2xl font-bold">Executive Board Package Preview</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {introText}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
              Included = this page will be in the PDF package
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">
              Not Included = this page will be left out of the PDF package
            </span>
          </div>
        </div>

        <div className="mb-8 grid gap-3 lg:grid-cols-2">
          {sections.map((section) => (
            <div key={section.title} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Page {section.page}
                </p>
                <p className="mt-1 font-bold text-slate-950">{section.title}</p>
                <p className="mt-1 text-sm text-slate-600">{section.note}</p>
              </div>
              <BoardStatusBadge status={section.status} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <ReportMetricCard label="Revenue" value={formatMoney(kpis.revenue)} />
          <ReportMetricCard label="Gross Profit" value={formatMoney(kpis.grossProfit)} />
          <ReportMetricCard label="Net Income" value={formatMoney(kpis.netIncome)} />
          <ReportMetricCard label="Cash" value={formatMoney(kpis.cash)} />
          {includeAp && <ReportMetricCard label="AP Aging Total" value={formatMoney(apKpis.total)} />}
          {includeInventory && (
            <ReportMetricCard label="Inventory Value" value={formatMoney(inventoryKpis.totalValue)} />
          )}
          {includeFixedAssets && (
            <>
              <ReportMetricCard label="Fixed Assets" value={formatCurrency(fixedAssetKpis.totalFixedAssets)} />
              <ReportMetricCard label="Net Book Value" value={formatCurrency(fixedAssetKpis.netBookValue)} />
            </>
          )}
          {includePayroll && (
            <>
              <ReportMetricCard label="Current FTE" value={formatFte(payrollAnalysis.totalCurrentFte)} />
              <ReportMetricCard label="Payroll Cost" value={formatCurrency(payrollAnalysis.totalCurrentPayrollCost)} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function BoardStatusBadge({ status }: { status: BoardPackageSection["status"] }) {
  const included = status === "Included";
  const className = included ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700";
  const label = included ? "Included" : "Not Included";

  return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${className}`}>{label}</span>;
}

function PowerPointPrompt({
  showDraft,
  slides,
  onCreate,
  onSkip,
}: {
  showDraft: boolean;
  slides: PowerPointSlideData[];
  onCreate: () => void;
  onSkip: () => void;
}) {
  return (
    <section id="powerpoint-section" className="workflow-section mt-10 rounded-3xl border border-blue-900/60 bg-slate-900 p-8 shadow-xl shadow-black/10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
            Board Presentation
          </p>
          <h2 className="text-3xl font-bold">Would you like to generate a Board / Owner presentation?</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            FinSight will generate a PowerPoint file from the approved PDF package sections, ratios, charts, and
            flux analysis settings. Slides are created only for sections included in the PDF package.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onCreate}
            className="rounded-2xl bg-[#5B8CFF] px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
          >
            Generate PowerPoint Presentation
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500"
          >
            Skip for now
          </button>
        </div>
      </div>

      {showDraft && (
        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-2xl font-bold">PowerPoint presentation draft</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                The PowerPoint file has been generated from the sections selected for the PDF package.
              </p>
            </div>
            <button
              type="button"
              onClick={onCreate}
              className="rounded-2xl bg-slate-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              Download PowerPoint Again
            </button>
          </div>
          <p className="mt-4 rounded-xl border border-blue-900/50 bg-blue-950/30 p-4 text-sm text-blue-100">
            Generated {slides.length} slide{slides.length === 1 ? "" : "s"} from the included PDF sections.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {slides.map((slide, index) => (
              <div key={`${slide.sectionType}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-300">
                  Slide {index + 1} - {slide.sectionType}
                </p>
                <h4 className="mt-2 text-lg font-bold text-white">{slide.title}</h4>
                <p className="mt-1 text-sm text-slate-400">{slide.subtitle}</p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
                  {slide.bullets.slice(0, 4).map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ExecutiveSummarySection({
  executiveSummary,
}: {
  executiveSummary: ReturnType<typeof buildExecutiveSummary>;
}) {
  return (
    <section className="mt-10 rounded-3xl border border-blue-900/60 bg-slate-900 p-8 shadow-lg">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Client-Ready Executive Summary
      </p>
      <h2 className="mb-4 text-3xl font-bold">Executive Summary</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {executiveSummary.sections.map((section) => (
          <div key={section.title} className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
            <h3 className="text-lg font-bold text-white">{section.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{section.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-blue-950 p-6">
          <h3 className="mb-4 text-xl font-bold">Key Highlights</h3>
          <ul className="list-disc space-y-3 pl-5 text-slate-300">
            {executiveSummary.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-950 p-6">
          <h3 className="mb-4 text-xl font-bold">Watch Items</h3>
          <ul className="list-disc space-y-3 pl-5 text-slate-300">
            {executiveSummary.watchItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-blue-900/60 bg-blue-950/40 p-6">
        <h3 className="mb-4 text-xl font-bold">Recommended Follow-Up Items</h3>
        <ul className="list-disc space-y-3 pl-5 text-slate-300">
          {executiveSummary.followUpItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function BasicChartsSection({
  kpis,
  arKpis,
  apKpis,
  inventoryKpis,
  fixedAssetKpis,
  payrollAnalysis,
  fluxRows,
  includeAr,
  includeAp,
  includeInventory,
  includeFixedAssets,
  includePayroll,
}: {
  kpis: KPIs;
  arKpis: AgingKpis;
  apKpis: APKpis;
  inventoryKpis: InventoryKpis;
  fixedAssetKpis: FixedAssetKpis;
  payrollAnalysis: PayrollAnalysis;
  fluxRows: FluxRow[];
  includeAr: boolean;
  includeAp: boolean;
  includeInventory: boolean;
  includeFixedAssets: boolean;
  includePayroll: boolean;
}) {
  const grossMargin = kpis.revenue ? (kpis.grossProfit / kpis.revenue) * 100 : 0;
  const netMargin = kpis.revenue ? (kpis.netIncome / kpis.revenue) * 100 : 0;
  const incomeStatementData = [
    { name: "Revenue", value: kpis.revenue, color: "#5B8CFF" },
    { name: "COGS", value: kpis.cogs, color: "#7BA7D9" },
    { name: "Expenses", value: kpis.expenses, color: "#C0845A" },
    { name: "Net Income", value: kpis.netIncome, color: "#4FAE8A" },
  ];
  const marginData = [
    { name: "Gross Margin", value: grossMargin, color: "#4FAE8A" },
    { name: "Net Margin", value: netMargin, color: "#5B8CFF" },
  ];
  const liquidityData = [
    { name: "Cash", value: kpis.cash, color: "#4FAE8A" },
    { name: "AR", value: includeAr ? arKpis.total : kpis.accountsReceivable, color: "#5B8CFF" },
    { name: "AP", value: includeAp ? apKpis.total : 0, color: "#C0845A" },
  ];
  const agingBuckets = (aging: AgingKpis) => [
    { name: "Current", value: aging.current, color: "#4FAE8A" },
    { name: "1-30", value: aging.days1To30, color: "#7BA7D9" },
    { name: "31-60", value: aging.days31To60, color: "#D8B56D" },
    { name: "61-90", value: aging.days61To90, color: "#C0845A" },
    { name: "90+", value: aging.days90Plus, color: "#B85C5C" },
  ];
  const inventoryData = inventoryKpis.topByValue.map((item) => ({
    name: item.name,
    value: item.value,
    color: "#5B8CFF",
  }));
  const payrollCostData = payrollAnalysis.rows.slice(0, 8).map((row) => ({
    name: row.department,
    value: row.currentPayrollCost,
    color: "#5B8CFF",
  }));
  const fteData = payrollAnalysis.rows.slice(0, 8);
  const fixedAssetData = [
    { name: "Fixed Assets", value: fixedAssetKpis.totalFixedAssets, color: "#5B8CFF" },
    { name: "Accum. Dep.", value: Math.abs(fixedAssetKpis.accumulatedDepreciation), color: "#C0845A" },
    { name: "NBV", value: fixedAssetKpis.netBookValue, color: "#4FAE8A" },
  ];
  const fluxData = [...fluxRows]
    .sort((a, b) => Math.abs(b.dollarVariance) - Math.abs(a.dollarVariance))
    .slice(0, 5)
    .map((row) => ({ name: row.accountName, value: row.dollarVariance, color: row.dollarVariance >= 0 ? "#5B8CFF" : "#C0845A" }));

  return (
    <section className="mt-10 rounded-3xl border border-slate-700 bg-slate-900 p-8">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Financial Intelligence Dashboard
      </p>
      <h2 className="mb-6 text-3xl font-bold">Financial Snapshot</h2>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        <ChartCard title="Revenue, COGS, Expenses, Net Income" value={formatMoney(kpis.revenue)}>
          <VerticalBarChart data={incomeStatementData} />
        </ChartCard>
        <ChartCard title="Gross Margin and Net Margin" value={`${grossMargin.toFixed(1)}% / ${netMargin.toFixed(1)}%`}>
          <VerticalBarChart data={marginData} percent />
        </ChartCard>
        <ChartCard title="Cash, AR, AP" value={`${formatMoney(kpis.cash)} / ${formatMoney(kpis.accountsReceivable)}`}>
          <VerticalBarChart data={liquidityData} />
        </ChartCard>
        <ChartCard title="AR Aging" value={includeAr ? formatMoney(arKpis.total) : "No data"}>
          {includeAr ? <VerticalBarChart data={agingBuckets(arKpis)} /> : <NoChartData />}
        </ChartCard>
        <ChartCard title="AP Aging" value={includeAp ? formatMoney(apKpis.total) : "No data"}>
          {includeAp ? <VerticalBarChart data={agingBuckets(apKpis)} /> : <NoChartData />}
        </ChartCard>
        <ChartCard title="Inventory Top 5 by Value" value={includeInventory ? formatMoney(inventoryKpis.totalValue) : "No data"}>
          {includeInventory && inventoryData.length ? <HorizontalBarChart data={inventoryData} /> : <NoChartData />}
        </ChartCard>
        <ChartCard title="Payroll Cost by Department" value={includePayroll ? formatMoney(payrollAnalysis.totalCurrentPayrollCost) : "No data"}>
          {includePayroll && payrollCostData.length ? <HorizontalBarChart data={payrollCostData} /> : <NoChartData />}
        </ChartCard>
        <ChartCard title="FTE by Department" value={includePayroll ? formatFte(payrollAnalysis.totalCurrentFte) : "No data"}>
          {includePayroll && fteData.length ? <FteDepartmentChart data={fteData} /> : <NoChartData />}
        </ChartCard>
        <ChartCard title="Fixed Assets Breakdown" value={includeFixedAssets ? formatMoney(fixedAssetKpis.netBookValue) : "No data"}>
          {includeFixedAssets ? <DonutChart data={fixedAssetData} /> : <NoChartData />}
        </ChartCard>
        <ChartCard title="Flux Variance Highlights" value={fluxData.length ? `${fluxData.length} flagged` : "No data"}>
          {fluxData.length ? <HorizontalBarChart data={fluxData} /> : <NoChartData />}
        </ChartCard>
      </div>
    </section>
  );
}

function aggregateChartData(data: Array<{ name: string; value: number; color: string }>) {
  const totals = new Map<string, { name: string; value: number; color: string }>();

  data.forEach((item) => {
    const existing = totals.get(item.name);
    totals.set(item.name, {
      name: item.name,
      value: (existing?.value || 0) + item.value,
      color: existing?.color || item.color,
    });
  });

  return [...totals.values()];
}

function VerticalBarChart({
  data,
  percent = false,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  percent?: boolean;
}) {
  const hasData = data.some((item) => item.value !== 0);
  if (!hasData) return <NoChartData />;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={aggregateChartData(data)}>
        <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<DarkChartTooltip percent={percent} />} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={700}>
          {aggregateChartData(data).map((entry, index) => (
            <Cell key={`${entry.name}-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function HorizontalBarChart({ data }: { data: Array<{ name: string; value: number; color: string }> }) {
  const chartData = aggregateChartData(data);
  const hasData = chartData.some((item) => item.value !== 0);
  if (!hasData) return <NoChartData />;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 18 }}>
        <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fill: "#cbd5e1", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<DarkChartTooltip />} />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={700}>
          {chartData.map((entry, index) => (
            <Cell key={`${entry.name}-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function FteDepartmentChart({ data }: { data: PayrollDepartmentRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data.slice(0, 8)}>
        <XAxis dataKey="department" tick={{ fill: "#cbd5e1", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<DarkChartTooltip plain />} />
        <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
        <Bar dataKey="currentFte" name="Current FTE" fill="#5B8CFF" radius={[8, 8, 0, 0]} />
        <Bar dataKey="priorFte" name="Prior FTE" fill="#7BA7D9" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DonutChart({ data }: { data: Array<{ name: string; value: number; color: string }> }) {
  const filteredData = data.filter((item) => item.value > 0);
  if (!filteredData.length) return <NoChartData />;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={filteredData}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={88}
          paddingAngle={4}
          animationDuration={700}
        >
          {filteredData.map((entry, index) => (
            <Cell key={`${entry.name}-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<DarkChartTooltip />} />
        <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ChartCard({
  title,
  value,
  children,
}: {
  title: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div className="chart-card rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-200">{title}</p>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <div className="mt-5 h-[260px]">{children}</div>
    </div>
  );
}

function NoChartData() {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900 text-sm text-slate-400">
      No chart data available
    </div>
  );
}

function DarkChartTooltip({
  active,
  payload,
  label,
  percent = false,
  plain = false,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { name?: string } }>;
  label?: string;
  percent?: boolean;
  plain?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const formatTooltipValue = (value: number) =>
    percent ? `${value.toFixed(1)}%` : plain ? formatFte(value) : formatMoney(value);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm shadow-xl">
      <p className="font-semibold text-white">{label || payload[0]?.payload?.name}</p>
      {payload.map((item) => (
        <p key={item.name || "value"} className="text-blue-300">
          {item.name ? `${item.name}: ` : ""}
          {formatTooltipValue(Number(item.value || 0))}
        </p>
      ))}
    </div>
  );
}

function InventoryAnalysisSection({ inventoryKpis }: { inventoryKpis: InventoryKpis }) {
  return (
    <section className="mt-10 rounded-3xl border border-blue-900/60 bg-slate-900 p-8">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Inventory Analytics
      </p>
      <h2 className="mb-6 text-3xl font-bold">Inventory Summary</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <KpiCard label="Total Inventory Value" value={inventoryKpis.totalValue} />
        <KpiCard label="Total Quantity on Hand" value={inventoryKpis.totalQuantity} plain />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <InventoryScreenTable title="Top 5 Inventory Items by Value" items={inventoryKpis.topByValue} />
        <InventoryScreenTable title="Top 5 Inventory Items by Quantity" items={inventoryKpis.topByQuantity} />
      </div>
    </section>
  );
}

function InventoryScreenTable({ title, items }: { title: string; items: InventoryItem[] }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950 p-6">
      <h3 className="mb-4 text-xl font-bold">{title}</h3>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-800/60 text-slate-100">
          <tr>
            <th className="px-4 py-2 font-bold">Item</th>
            <th className="px-4 py-2 text-right font-bold">Qty</th>
            <th className="px-4 py-2 text-right font-bold">Value</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((item, index) => (
              <tr key={`${item.name}-${index}`} className="border-t border-slate-800">
                <td className="px-4 py-2 text-slate-300">{item.name}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatNumber(item.quantity)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatMoney(item.value)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-2 text-slate-400" colSpan={3}>
                Inventory valuation report required.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProfessionalPlaceholderSection() {
  return (
    <section className="mt-10 rounded-3xl border border-slate-700 bg-slate-900 p-8">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Professional Advisory Tools
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          "Trend analysis",
          "Margin analysis",
          "Working capital analysis",
          "DSO calculations",
          "Enhanced AI commentary",
          "Top customers/vendors",
        ].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function VirtualCfoPlaceholderSection() {
  return (
    <section className="mt-10 rounded-3xl border border-blue-900/60 bg-slate-900 p-8">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Virtual CFO Toolkit
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          "Forecasting placeholders",
          "Budget vs Actual placeholders",
          "Variance analysis",
          "EBITDA analysis",
          "Debt analysis",
          "Benchmarking placeholders",
          "KPI health scoring",
          "Multi-period placeholders",
          "Risk indicators",
          "Executive board-style formatting",
        ].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function FixedAssetAnalysisSection({
  fixedAssetKpis,
  priorFixedAssetData,
  changeRows,
}: {
  fixedAssetKpis: FixedAssetKpis;
  priorFixedAssetData: ParsedFile | null;
  changeRows: FixedAssetChangeRow[];
}) {
  return (
    <section className="mt-10 rounded-3xl border border-blue-900/60 bg-slate-900 p-8 shadow-lg">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Fixed Asset Analysis
      </p>
      <h2 className="mb-6 text-3xl font-bold">Fixed Asset KPIs</h2>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <KpiCard label="Total Fixed Assets" value={fixedAssetKpis.totalFixedAssets} />
        <KpiCard label="Accumulated Depreciation" value={fixedAssetKpis.accumulatedDepreciation} />
        <KpiCard label="Net Book Value" value={fixedAssetKpis.netBookValue} />
        <KpiCard
          label="Depreciation Expense"
          value={fixedAssetKpis.depreciationExpense === null ? "N/A" : fixedAssetKpis.depreciationExpense}
          helperText={
            fixedAssetKpis.depreciationExpense === null
              ? "Depreciation expense not provided in uploaded reports."
              : undefined
          }
        />
        <KpiCard label="Fixed Assets % of Assets" value={fixedAssetKpis.fixedAssetsToTotalAssets} percent />
        <KpiCard label="Depreciation % of Fixed Assets" value={fixedAssetKpis.depreciationToFixedAssets} percent />
        <KpiCard label="NBV % of Assets" value={fixedAssetKpis.netBookValueToTotalAssets} percent />
      </div>

      <p className="mt-6 leading-7 text-slate-300">
        Fixed assets as a percentage of total assets shows how capital-intensive the business is.
        Depreciation as a percentage of fixed assets indicates how much of the asset base has been
        depreciated, while net book value as a percentage of total assets shows the remaining
        carrying value of long-term assets.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950 p-6">
        <h3 className="mb-4 text-xl font-bold">Significant Changes</h3>
        {priorFixedAssetData ? (
          <FixedAssetChangeTable rows={changeRows} />
        ) : (
          <p className="text-slate-300">
            Upload prior period fixed asset report to calculate significant changes.
          </p>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-4 py-3">Metric</th>
              <th className="px-4 py-3">Matched Row</th>
              <th className="px-4 py-3">Value</th>
            </tr>
          </thead>
          <tbody>
            {fixedAssetKpis.matches.map((match, index) => (
              <tr key={`${match.metric}-${index}`} className="border-b border-slate-800">
                <td className="px-4 py-3 text-slate-300">{match.metric}</td>
                <td className="px-4 py-3 text-slate-300">{match.label}</td>
                <td className="px-4 py-3 font-semibold">
                  {formatOptionalCurrency(
                    match.value,
                    "N/A",
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FixedAssetChangeTable({ rows }: { rows: FixedAssetChangeRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-800">
          <tr>
            <th className="px-4 py-3">Metric</th>
            <th className="px-4 py-3">Prior Period</th>
            <th className="px-4 py-3">Current Period</th>
            <th className="px-4 py-3">Change</th>
            <th className="px-4 py-3">Interpretation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.metric} className="border-b border-slate-800">
              <td className="px-4 py-3 text-slate-300">{row.metric}</td>
              <td className="px-4 py-3 font-semibold">{formatCurrency(row.prior)}</td>
              <td className="px-4 py-3 font-semibold">{formatCurrency(row.current)}</td>
              <td className="px-4 py-3 font-semibold">{formatCurrency(row.change)}</td>
              <td className="px-4 py-3 text-slate-300">{row.interpretation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PayrollAnalysisSection({
  analysis,
  currentPayrollData,
  priorPayrollData,
  fteDivisor,
  onFteDivisorChange,
}: {
  analysis: PayrollAnalysis;
  currentPayrollData: ParsedFile | null;
  priorPayrollData: ParsedFile | null;
  fteDivisor: number;
  onFteDivisorChange: (value: number) => void;
}) {
  const hasPayrollData = Boolean(currentPayrollData || priorPayrollData);

  return (
    <section className="mt-10 rounded-3xl border border-blue-900/60 bg-slate-900 p-8 shadow-lg">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
            Virtual CFO Payroll Analytics
          </p>
          <h2 className="text-3xl font-bold">Payroll and FTE Analysis</h2>
          <p className="mt-3 max-w-3xl text-slate-300">
            Analyze department-level FTE movement, payroll cost changes, and payroll cost per FTE.
          </p>
        </div>
        <label className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-300">
            Monthly FTE Hours Divisor
          </span>
          <input
            type="number"
            step="0.01"
            value={fteDivisor}
            onChange={(e) => onFteDivisorChange(Number(e.target.value) || 173.33)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white"
          />
          <p className="mt-2 text-xs text-slate-500">Default is 173.33 hours per monthly FTE.</p>
        </label>
      </div>

      {!hasPayrollData ? (
        <p className="rounded-2xl border border-slate-700 bg-slate-950 p-5 text-slate-300">
          Upload current and prior payroll summary by department reports to calculate FTE and payroll cost trends.
        </p>
      ) : (
        <>
          {!priorPayrollData && (
            <p className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
              Prior month payroll report required to calculate FTE change.
            </p>
          )}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <PayrollMetricCard label="Current FTE" value={formatFte(analysis.totalCurrentFte)} />
            <PayrollMetricCard label="Prior FTE" value={priorPayrollData ? formatFte(analysis.totalPriorFte) : "N/A"} />
            <PayrollMetricCard label="FTE Change" value={priorPayrollData ? formatFte(analysis.totalFteChange) : "N/A"} />
            <PayrollMetricCard label="Payroll Cost Change" value={priorPayrollData ? formatCurrency(analysis.totalPayrollCostChange) : "N/A"} />
          </div>

          <PayrollSummaryCallout analysis={analysis} includePrior={Boolean(priorPayrollData)} />
          <PayrollTable title="FTE by Department" rows={analysis.rows} includePrior={Boolean(priorPayrollData)} />
          <PayrollTable title="Payroll Cost by Department" rows={analysis.rows} includePrior={Boolean(priorPayrollData)} />
        </>
      )}
    </section>
  );
}

function PayrollMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-28 flex-col justify-between rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className="mt-4 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function PayrollSummaryCallout({
  analysis,
  includePrior,
}: {
  analysis: PayrollAnalysis;
  includePrior: boolean;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950 p-6">
      <h3 className="mb-4 text-xl font-bold">AI-Ready Payroll Commentary</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-300">Highest FTE Increase</p>
          <p className="mt-3 text-lg font-bold text-white">{includePrior ? analysis.highestFteIncreaseDepartment : "N/A"}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-300">Highest Payroll Cost Increase</p>
          <p className="mt-3 text-lg font-bold text-white">{includePrior ? analysis.highestPayrollCostIncreaseDepartment : "N/A"}</p>
        </div>
      </div>
      <ul className="mt-5 space-y-3 text-slate-300">
        {(includePrior ? analysis.commentary : ["Current month FTE is available. Prior month payroll report required to calculate FTE change."]).map(
          (comment) => (
            <li key={comment} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              {comment}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function PayrollTable({
  title,
  rows,
  includePrior,
}: {
  title: string;
  rows: PayrollDepartmentRow[];
  includePrior: boolean;
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-700 bg-slate-950 p-6">
      <h3 className="mb-4 text-xl font-bold">{title}</h3>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-800">
          <tr>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Current FTE</th>
            <th className="px-4 py-3">Prior FTE</th>
            <th className="px-4 py-3">FTE Change</th>
            <th className="px-4 py-3">Current Payroll Cost</th>
            <th className="px-4 py-3">Prior Payroll Cost</th>
            <th className="px-4 py-3">Payroll Cost Change</th>
            <th className="px-4 py-3">Payroll Cost per FTE</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <tr key={row.department} className="border-b border-slate-800">
                <td className="px-4 py-3 font-semibold text-slate-200">{row.department}</td>
                <td className="px-4 py-3">{formatFte(row.currentFte)}</td>
                <td className="px-4 py-3">{includePrior ? formatFte(row.priorFte) : "N/A"}</td>
                <td className="px-4 py-3">{includePrior ? formatFte(row.fteChange) : "N/A"}</td>
                <td className="px-4 py-3">{formatCurrency(row.currentPayrollCost)}</td>
                <td className="px-4 py-3">{includePrior ? formatCurrency(row.priorPayrollCost) : "N/A"}</td>
                <td className="px-4 py-3">{includePrior ? formatCurrency(row.payrollCostChange) : "N/A"}</td>
                <td className="px-4 py-3">{formatCurrency(row.payrollCostPerFte)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-3 text-slate-400" colSpan={8}>
                Payroll summary by department report required.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FluxAnalysisPanel({
  settings,
  onSettingsChange,
  monthRows,
  quarterRows,
  yearRows,
  monthDebug,
  quarterDebug,
  yearDebug,
}: {
  settings: FluxSettings;
  onSettingsChange: (settings: FluxSettings) => void;
  monthRows: FluxRow[];
  quarterRows: FluxRow[];
  yearRows: FluxRow[];
  monthDebug: FluxDebugInfo;
  quarterDebug: FluxDebugInfo;
  yearDebug: FluxDebugInfo;
}) {
  return (
    <section className="mt-10 rounded-3xl border border-blue-900/60 bg-slate-900 p-8">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Virtual CFO Flux Analysis
      </p>
      <h2 className="mb-6 text-3xl font-bold">Flux Analysis Settings</h2>

      <div className="grid gap-4 md:grid-cols-4">
        <label className="rounded-2xl bg-slate-950 p-5">
          <span className="text-sm font-bold uppercase tracking-[0.08em] text-slate-200">
            Dollar Threshold
          </span>
          <input
            type="number"
            value={settings.dollarThreshold}
            onChange={(e) =>
              onSettingsChange({ ...settings, dollarThreshold: Number(e.target.value) })
            }
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3"
          />
        </label>

        <label className="rounded-2xl bg-slate-950 p-5">
          <span className="text-sm font-bold uppercase tracking-[0.08em] text-slate-200">
            Percentage Threshold
          </span>
          <input
            type="number"
            value={settings.percentThreshold}
            onChange={(e) =>
              onSettingsChange({ ...settings, percentThreshold: Number(e.target.value) })
            }
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3"
          />
        </label>

        <label className="rounded-2xl bg-slate-950 p-5">
          <span className="text-sm font-bold uppercase tracking-[0.08em] text-slate-200">
            Threshold Logic
          </span>
          <select
            value={settings.logic}
            onChange={(e) =>
              onSettingsChange({ ...settings, logic: e.target.value as ThresholdLogic })
            }
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3"
          >
            <option value="both">Both thresholds</option>
            <option value="either">Either threshold</option>
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-2xl bg-slate-950 p-5">
          <input
            type="checkbox"
            checked={settings.includeZeroActivity}
            onChange={(e) =>
              onSettingsChange({ ...settings, includeZeroActivity: e.target.checked })
            }
          />
          <span className="text-sm font-bold uppercase tracking-[0.08em] text-slate-200">
            Include zero-to-activity changes
          </span>
        </label>
      </div>

      <FluxDebugPanel
        monthDebug={monthDebug}
        quarterDebug={quarterDebug}
        yearDebug={yearDebug}
      />

      <FluxTable title="Current Month vs Prior Month" rows={monthRows} />
      <FluxTable title="Current Quarter vs Prior Quarter" rows={quarterRows} />
      <FluxTable title="Current Year vs Prior Year" rows={yearRows} />
    </section>
  );
}

function FluxDebugPanel({
  monthDebug,
  quarterDebug,
  yearDebug,
}: {
  monthDebug: FluxDebugInfo;
  quarterDebug: FluxDebugInfo;
  yearDebug: FluxDebugInfo;
}) {
  const debugRows = [
    { label: "Month", debug: monthDebug },
    { label: "Quarter", debug: quarterDebug },
    { label: "Year", debug: yearDebug },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950 p-5">
      <p className="mb-4 text-sm font-bold uppercase tracking-[0.08em] text-slate-200">
        Flux Debug Counts
      </p>
      <div className="grid gap-3 lg:grid-cols-3">
        {debugRows.map(({ label, debug }) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="font-bold text-white">{label}</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-300">
              <p>Current GL rows parsed: {formatNumber(debug.currentRowsParsed)}</p>
              <p>Prior GL rows parsed: {formatNumber(debug.priorRowsParsed)}</p>
              <p>Accounts grouped: {formatNumber(debug.accountsGrouped)}</p>
              <p>Variances calculated: {formatNumber(debug.variancesCalculated)}</p>
              <p>Variances passing threshold: {formatNumber(debug.variancesPassingThreshold)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FluxTable({ title, rows }: { title: string; rows: FluxRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof FluxRow>("dollarVariance");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [editingRows, setEditingRows] = useState<Record<string, boolean>>({});
  const [commentaryOverrides, setCommentaryOverrides] = useState<Record<string, string>>({});

  const visibleRows = useMemo(() => {
    return rows
      .filter((row) =>
        `${row.accountNumber} ${row.accountName} ${row.flagReason}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
      .sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        if (typeof aValue === "number" && typeof bValue === "number") return bValue - aValue;
        return String(aValue).localeCompare(String(bValue));
      });
  }, [rows, search, sortKey]);

  return (
    <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-950 p-6">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="text-2xl font-bold">{title}</h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search accounts"
          className="rounded-xl border border-slate-700 bg-slate-800 p-3"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-4 py-3">Account #</th>
              <th className="px-4 py-3">Account Name</th>
              <th className="px-4 py-3">Basis</th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => setSortKey("currentAmount")}>
                  Current Amount
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => setSortKey("priorAmount")}>
                  Prior Amount
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => setSortKey("dollarVariance")}>
                  Change
                </button>
              </th>
              <th className="px-4 py-3">%</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Top Driver</th>
              <th className="px-4 py-3">Driver Change</th>
              <th className="px-4 py-3">Review</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length > 0 ? (
              visibleRows.map((row, index) => {
                const key = `${row.accountNumber}-${row.accountName}-${index}`;
                const commentaryText = commentaryOverrides[key] ?? row.commentary;

                return (
                  <Fragment key={key}>
                    <tr key={key} className="border-b border-slate-800">
                      <td className="px-4 py-3 text-slate-300">{row.accountNumber}</td>
                      <td className="min-w-56 px-4 py-3 font-semibold text-slate-200">{row.accountName}</td>
                      <td className="px-4 py-3 text-slate-300">{row.basis}</td>
                      <td className="px-4 py-3">{formatMoney(row.currentAmount)}</td>
                      <td className="px-4 py-3">{formatMoney(row.priorAmount)}</td>
                      <td className="px-4 py-3">{formatMoney(row.dollarVariance)}</td>
                      <td className="px-4 py-3">
                        {row.percentVariance === null ? "N/A" : `${row.percentVariance.toFixed(1)}%`}
                      </td>
                      <td className="px-4 py-3">
                        <SeverityBadge severity={row.severity} />
                      </td>
                      <td className="px-4 py-3 text-slate-300">{row.flagReason}</td>
                      <td className="px-4 py-3 text-slate-300">{row.topDriver}</td>
                      <td className="px-4 py-3 font-semibold">
                        {row.driverChange === null ? "N/A" : formatCurrency(row.driverChange)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedRows({ ...expandedRows, [key]: !expandedRows[key] })}
                          className="rounded-xl border border-blue-500/40 px-3 py-2 text-xs font-bold text-blue-200 hover:bg-blue-500/10"
                        >
                          {expandedRows[key] ? "Hide" : "Review"}
                        </button>
                      </td>
                    </tr>
                    {expandedRows[key] && (
                      <tr key={`${key}-details`} className="border-b border-slate-800 bg-slate-900/70">
                        <td colSpan={12} className="px-4 py-5">
                          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.8fr)]">
                            <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
                              <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-300">
                                Commentary
                              </p>
                              {editingRows[key] ? (
                                <textarea
                                  value={commentaryText}
                                  onChange={(event) =>
                                    setCommentaryOverrides({
                                      ...commentaryOverrides,
                                      [key]: event.target.value,
                                    })
                                  }
                                  className="mt-3 min-h-32 w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm leading-7 text-slate-100 outline-none focus:border-blue-400"
                                />
                              ) : (
                                <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-200">{commentaryText}</p>
                              )}
                              <button
                                type="button"
                                onClick={() => setEditingRows({ ...editingRows, [key]: !editingRows[key] })}
                                className="mt-4 rounded-xl border border-blue-500/40 px-3 py-2 text-xs font-bold text-blue-200 hover:bg-blue-500/10"
                              >
                                {editingRows[key] ? "Done Editing" : "Edit"}
                              </button>
                              {row.warnings.length > 0 && (
                                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">
                                  <span className="font-bold">Warnings: </span>
                                  {row.warnings.join(" ")}
                                </div>
                              )}
                            </div>
                            <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
                              <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-300">
                                Top Drivers
                              </p>
                              <div className="mt-3 grid gap-2">
                                {row.topDrivers.length > 0 ? (
                                  row.topDrivers.slice(0, 3).map((driver) => (
                                    <div key={driver.name} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                                      <p className="font-semibold text-slate-100">{driver.name}</p>
                                      <p className="mt-1 text-xs text-slate-400">
                                        Current {formatCurrency(driver.current)} | Prior {formatCurrency(driver.prior)} | Change{" "}
                                        {formatCurrency(driver.change)}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-slate-400">No driver detail available.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-3 text-slate-400" colSpan={12}>
                  Upload matching GL detail reports to generate flux analysis.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: FluxSeverity }) {
  const className =
    severity === "High"
      ? "bg-red-500/20 text-red-300"
      : severity === "Moderate"
        ? "bg-yellow-500/20 text-yellow-300"
        : "bg-blue-500/20 text-blue-300";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{severity}</span>;
}

function PrintableFinancialPackage({
  packageTier,
  companyName,
  reportPeriod,
  clientIndustry,
  companyTagline,
  preparedFor,
  confidentialWatermark,
  preparedBy,
  selectedSections,
  kpis,
  arKpis,
  apKpis,
  inventoryKpis,
  fixedAssetKpis,
  netMargin,
  executiveSummary,
  plData,
  bsData,
  arData,
  apData,
  inventoryData,
  fixedAssetData,
  priorFixedAssetData,
  topRevenueRows,
  topExpenseRows,
  selectedCharts,
  ratioRows,
  fixedAssetChangeRows,
  payrollAnalysis,
  currentPayrollData,
  priorPayrollData,
  boardPackageSections,
  budgetMetrics,
  debtMetrics,
  monthFluxRows,
  quarterFluxRows,
  yearFluxRows,
}: {
  packageTier: PackageTier;
  companyName: string;
  reportPeriod: string;
  clientIndustry: string;
  companyTagline: string;
  preparedFor: string;
  confidentialWatermark: boolean;
  preparedBy: string;
  selectedSections: PackageSectionId[];
  kpis: KPIs;
  arKpis: AgingKpis;
  apKpis: APKpis;
  inventoryKpis: InventoryKpis;
  fixedAssetKpis: FixedAssetKpis;
  netMargin: number;
  executiveSummary: ReturnType<typeof buildExecutiveSummary>;
  plData: ParsedFile | null;
  bsData: ParsedFile | null;
  arData: ParsedFile | null;
  apData: ParsedFile | null;
  inventoryData: ParsedFile | null;
  fixedAssetData: ParsedFile | null;
  priorFixedAssetData: ParsedFile | null;
  topRevenueRows: StatementRow[];
  topExpenseRows: StatementRow[];
  selectedCharts: ChartSelectionId[];
  ratioRows: Array<{ name: string; formula: string; value: string; interpretation: string }>;
  fixedAssetChangeRows: FixedAssetChangeRow[];
  payrollAnalysis: PayrollAnalysis;
  currentPayrollData: ParsedFile | null;
  priorPayrollData: ParsedFile | null;
  boardPackageSections: BoardPackageSection[];
  budgetMetrics: BudgetMetrics;
  debtMetrics: DebtMetrics;
  monthFluxRows: FluxRow[];
  quarterFluxRows: FluxRow[];
  yearFluxRows: FluxRow[];
}) {
  const plRows = getStatementRows(plData);
  const bsRows = getBalanceSheetStatementRowsWithNetBookValue(bsData);
  const includeSection = (sectionId: PackageSectionId) => selectedSections.includes(sectionId);
  const ratioValue = (name: RatioId) => ratioRows.find((ratio) => ratio.name === name)?.value || "N/A";
  const ebitda = kpis.grossProfit - kpis.expenses;
  const periodLabel = formatPeriodEnding(reportPeriod);
  const packageCompleteness = Math.round(
    (boardPackageSections.filter((section) => section.status === "Included").length /
      Math.max(boardPackageSections.length, 1)) *
      100,
  );

  return (
    <div className="print-package hidden">
      <section className="print-page print-cover-page">
        {confidentialWatermark && <div className="print-confidential-watermark">Confidential</div>}
        <div className="print-cover-topline">
          <div className="print-logo-box">FinSight</div>
          <div className="print-client-logo-box">Client Logo</div>
        </div>

        <div className="print-cover-hero">
          <p className="print-eyebrow">Prepared for {preparedFor}</p>
          <h1>{companyName}</h1>
          <p className="print-cover-subtitle">{companyTagline || `${PACKAGE_LABELS[packageTier]} CFO Board Package`}</p>
          <p className="print-cover-period">{periodLabel}</p>
          <div className="print-cover-meta-grid">
            <span>Industry: {clientIndustry}</span>
            <span>Prepared by {preparedBy}</span>
            <span>Package completeness: {packageCompleteness}%</span>
            <span>Confidential advisory work product</span>
          </div>
        </div>

        <div className="print-executive-card-grid">
          <PrintKpiCard label="Revenue" value={formatMoney(kpis.revenue)} />
          <PrintKpiCard label="EBITDA" value={formatMoney(ebitda)} />
          <PrintKpiCard label="Cash" value={formatMoney(kpis.cash)} />
          <PrintKpiCard label="AR" value={formatMoney(kpis.accountsReceivable)} />
          <PrintKpiCard label="Net Income" value={formatMoney(kpis.netIncome)} />
          <PrintKpiCard label="Current Ratio" value={ratioValue("Current Ratio")} />
          <PrintKpiCard label="DSO" value={ratioValue("DSO")} />
          <PrintKpiCard label="FTE Count" value={formatFte(payrollAnalysis.totalCurrentFte)} />
        </div>

        <div className="print-section-block">
          <h2>Board Package Contents</h2>
          <table className="print-table print-compact-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>Section</th>
                <th>Status</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {boardPackageSections.map((section) => (
                <tr key={section.title}>
                  <td>{section.page}</td>
                  <td>{section.title}</td>
                  <td>{section.status === "Included" ? "Included" : "Not Included"}</td>
                  <td>{section.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {includeSection("executive-summary") && (
          <div className="print-section-block print-executive-summary-grid">
            {executiveSummary.sections.slice(0, 4).map((section) => (
              <div key={section.title} className="print-narrative-card">
                <h3>{section.title}</h3>
                <p>{section.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {includeSection("income-statement") && <section className="print-page">
        <div className="statement-section">
          <div className="statement-header">
            <h1>Income Statement</h1>
            <p>Profit and Loss detail from the uploaded report.</p>
          </div>
          <FinancialStatementTable rows={plRows} />
        </div>
      </section>}

      {includeSection("balance-sheet") && <section className="print-page">
        <div className="statement-section">
          <div className="statement-header">
            <h1>Balance Sheet</h1>
            <p>Assets, liabilities, and equity detail from the uploaded balance sheet.</p>
          </div>
          <FinancialStatementTable rows={bsRows} />
        </div>
      </section>}

      {includeSection("kpi-snapshot") && (
        <section className="print-page">
          <h1>Executive Dashboard</h1>
          <p className="print-section-intro">
            Selected dashboard views use a consistent CFO color palette and emphasize quick board-level interpretation.
          </p>
          <div className="print-commentary-grid">
            {selectedCharts.map((chartId) => (
              <PrintDashboardCard
                key={chartId}
                chartId={chartId}
                kpis={kpis}
                arKpis={arKpis}
                apKpis={apKpis}
                payrollAnalysis={payrollAnalysis}
                budgetMetrics={budgetMetrics}
                netMargin={netMargin}
              />
            ))}
          </div>
        </section>
      )}

      {(includeSection("ar-aging") || includeSection("ap-aging")) && <section className="print-page">
        <h1>Aging Analysis</h1>
        {includeSection("ar-aging") && <><h2>Accounts Receivable Aging</h2>
        {arData ? (
          <AgingPrintTable kpis={arKpis} totalLabel="Accounts Receivable Total" currentLabel="Current AR" />
        ) : (
          <p>AR Aging report not uploaded</p>
        )}</>}

        {includeSection("ap-aging") && <><h2>Accounts Payable Aging</h2>
        {apData ? (
          <AgingPrintTable kpis={apKpis} totalLabel="Accounts Payable Total" currentLabel="Current AP" />
        ) : (
          <p>AP Aging report not uploaded</p>
        )}</>}
      </section>}

      {(includeSection("customer-sales") || includeSection("vendor-expenses")) && <section className="print-page">
        <h1>Revenue and Expense Driver Analysis</h1>
        <p className="print-section-intro">
          Revenue and expense drivers are separated to avoid mixing income accounts with operating costs.
          Variance and trend indicators highlight where management should focus review time.
        </p>
        <div className="print-two-column">
          <DriverPrintTable title="Top Revenue Sources" rows={topRevenueRows} total={kpis.revenue} type="revenue" />
          <DriverPrintTable title="Top Expense Categories" rows={topExpenseRows} total={kpis.expenses} type="expense" />
        </div>
        <div className="print-narrative-card">
          <h3>Top Driver Commentary</h3>
          <p>
            {topRevenueRows[0]
              ? `${topRevenueRows[0].label} is the largest identified revenue source at ${formatMoney(
                  topRevenueRows[0].amount || 0,
                )}, representing ${kpis.revenue ? (((topRevenueRows[0].amount || 0) / kpis.revenue) * 100).toFixed(1) : "0.0"}% of revenue.`
              : "Revenue source detail was not available in the uploaded Profit and Loss structure."}
            {" "}
            {topExpenseRows[0]
              ? `${topExpenseRows[0].label} is the largest operating expense category at ${formatMoney(
                  topExpenseRows[0].amount || 0,
                )}, representing ${kpis.expenses ? (((topExpenseRows[0].amount || 0) / kpis.expenses) * 100).toFixed(1) : "0.0"}% of expenses.`
              : "Expense category detail was not available in the uploaded Profit and Loss structure."}
          </p>
        </div>
      </section>}

      {includeSection("ratio-analysis") && (
        <section className="print-page">
          <div className="print-section-block">
            <h1>Ratio Analysis</h1>
            <p className="print-section-intro">
              Ratios are dynamically calculated from uploaded Profit and Loss, Balance Sheet, Aging, Inventory, Debt,
              and Payroll reports where available.
            </p>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Ratio</th>
                  <th>Formula</th>
                  <th>Value</th>
                  <th>Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {ratioRows.map((ratio) => (
                  <tr key={ratio.name}>
                    <td>{ratio.name}</td>
                    <td>{ratio.formula}</td>
                    <td>{ratio.value}</td>
                    <td>{ratio.interpretation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isProfessionalOrHigher(packageTier) && (
        <>
          {includeSection("inventory-summary") && inventoryData && (
            <section className="print-page">
              <h1>Inventory Summary</h1>
              <p>Inventory valuation detail from the uploaded Inventory Valuation report.</p>
              <table className="print-table">
                <tbody>
                  <tr>
                    <td>Total Inventory Value</td>
                    <td>{formatMoney(inventoryKpis.totalValue)}</td>
                  </tr>
                  <tr>
                    <td>Total Quantity on Hand</td>
                    <td>{formatNumber(inventoryKpis.totalQuantity)}</td>
                  </tr>
                </tbody>
              </table>
              <h2>Top 5 Inventory Items by Value</h2>
              <InventoryPrintTable items={inventoryKpis.topByValue} />
              <h2>Top 5 Inventory Items by Quantity</h2>
              <InventoryPrintTable items={inventoryKpis.topByQuantity} />
            </section>
          )}

        </>
      )}

      {isVirtualCfo(packageTier) && (
        <>
          {includeSection("fixed-asset-analysis") && fixedAssetData && (
          <section className="print-page">
            <h1>Fixed Asset Analysis</h1>
            <p>Fixed asset detail from the uploaded Fixed Asset report.</p>
            <table className="print-table">
              <tbody>
                <tr>
                  <td>Total Fixed Assets</td>
                  <td>{formatMoney(fixedAssetKpis.totalFixedAssets)}</td>
                </tr>
                <tr>
                  <td>Accumulated Depreciation</td>
                  <td>{formatMoney(fixedAssetKpis.accumulatedDepreciation)}</td>
                </tr>
                <tr>
                  <td>Net Book Value</td>
                  <td>{formatMoney(fixedAssetKpis.netBookValue)}</td>
                </tr>
                <tr>
                  <td>Depreciation Expense</td>
                  <td>
                    {formatOptionalCurrency(
                      fixedAssetKpis.depreciationExpense,
                      "N/A",
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            <h2>Significant Changes</h2>
            {priorFixedAssetData ? (
              <>
                <FixedAssetChangePrintTable rows={fixedAssetChangeRows} />
                <div className="print-narrative-card">
                  <h3>CapEx and Depreciation Commentary</h3>
                  <p>
                    {fixedAssetChangeRows.find((row) => row.metric === "Total Fixed Assets" && row.change > 0)
                      ? `Fixed assets increased by ${formatCurrency(
                          fixedAssetChangeRows.find((row) => row.metric === "Total Fixed Assets")?.change || 0,
                        )}, indicating additions or capitalized asset activity during the period.`
                      : "No material gross fixed asset additions were identified from the uploaded current and prior fixed asset reports."}
                    {" "}
                    Ending net book value is {formatCurrency(fixedAssetKpis.netBookValue)} after accumulated depreciation of{" "}
                    {formatCurrency(fixedAssetKpis.accumulatedDepreciation)}.
                  </p>
                </div>
              </>
            ) : (
              <p>Upload prior period fixed asset report to calculate significant changes.</p>
            )}
          </section>
          )}

          {includeSection("payroll-fte") && (currentPayrollData || priorPayrollData) && (
            <PayrollPrintSection
              analysis={payrollAnalysis}
              currentPayrollData={currentPayrollData}
              priorPayrollData={priorPayrollData}
              revenue={kpis.revenue}
            />
          )}

          {includeSection("flux-summary") && monthFluxRows.length > 0 && (
            <>
              <PrintFluxSection title="Flux Analysis Executive Summary" rows={monthFluxRows} />
            </>
          )}
          {includeSection("month-flux") && monthFluxRows.length > 0 && (
            <PrintFluxSection title="Month-over-Month Flux Analysis" rows={monthFluxRows} />
          )}
          {includeSection("quarter-flux") && quarterFluxRows.length > 0 && (
            <PrintFluxSection title="Quarter-over-Quarter Flux Analysis" rows={quarterFluxRows} />
          )}
          {includeSection("year-flux") && yearFluxRows.length > 0 && (
            <PrintFluxSection title="Year-over-Year Flux Analysis" rows={yearFluxRows} />
          )}

          {includeSection("budget-vs-actual") && budgetMetrics.revenueActual !== null && (
            <BudgetPrintSection metrics={budgetMetrics} />
          )}
          {includeSection("debt-schedule") && debtMetrics.totalDebt > 0 && <DebtPrintSection metrics={debtMetrics} />}
          {includeSection("recommended-follow-up") && <section className="print-page">
            <h1>Recommended Follow-Up Items</h1>
            <ul>
              {executiveSummary.followUpItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>}
        </>
      )}
    </div>
  );
}

function FinancialStatementTable({ rows }: { rows: StatementRow[] }) {
  const dedupedRows = getDedupedStatementRows(rows);

  return (
    <table className="print-statement-table statement-table">
      <thead>
        <tr>
          <th>Line Item</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {dedupedRows.map((row, index) => {
          const rowType = row.amount === null ? "section" : getStatementRowType(row.label);

          return (
            <tr key={`${row.label}-${index}`} className={`print-statement-${rowType}`}>
              <td>{row.label}</td>
              <td>{row.amount === null ? "" : formatMoney(row.amount)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PrintKpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DriverPrintTable({
  title,
  rows,
  total,
  type,
}: {
  title: string;
  rows: StatementRow[];
  total: number;
  type: "revenue" | "expense";
}) {
  return (
    <div className="print-section-block">
      <h2>{title}</h2>
      <table className="print-table print-compact-table">
        <thead>
          <tr>
            <th>Account / Category</th>
            <th>Amount</th>
            <th>% of Total</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, index) => {
              const share = total ? (((row.amount || 0) / total) * 100).toFixed(1) : "0.0";
              return (
                <tr key={`${type}-${row.label}-${index}`}>
                  <td>{row.label}</td>
                  <td>{formatMoney(row.amount || 0)}</td>
                  <td>{share}%</td>
                  <td>{index === 0 ? "Top driver" : "Monitor"}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={4}>{type === "revenue" ? "Revenue" : "Expense"} detail unavailable.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PrintDashboardCard({
  chartId,
  kpis,
  arKpis,
  apKpis,
  payrollAnalysis,
  budgetMetrics,
  netMargin,
}: {
  chartId: ChartSelectionId;
  kpis: KPIs;
  arKpis: AgingKpis;
  apKpis: APKpis;
  payrollAnalysis: PayrollAnalysis;
  budgetMetrics: BudgetMetrics;
  netMargin: number;
}) {
  const chartLabels: Record<ChartSelectionId, string> = {
    "revenue-trend": "Revenue Trend",
    "gross-margin-trend": "Gross Margin Trend",
    "ebitda-trend": "EBITDA Trend",
    "cash-trend": "Cash Trend",
    "ar-aging-mix": "AR Aging Mix",
    "ap-aging-mix": "AP Aging Mix",
    "payroll-trend": "Payroll Trend",
    "revenue-per-fte": "Revenue per FTE",
    "expense-breakdown": "Expense Breakdown",
    "budget-vs-actual": "Budget vs Actual",
    "net-income-trend": "Net Income Trend",
    "working-capital-trend": "Working Capital Trend",
  };
  const primaryValue: Record<ChartSelectionId, string> = {
    "revenue-trend": formatCurrency(kpis.revenue),
    "gross-margin-trend": `${kpis.revenue ? ((kpis.grossProfit / kpis.revenue) * 100).toFixed(1) : "0.0"}%`,
    "ebitda-trend": formatCurrency(kpis.grossProfit - kpis.expenses),
    "cash-trend": formatCurrency(kpis.cash),
    "ar-aging-mix": formatCurrency(arKpis.total),
    "ap-aging-mix": formatCurrency(apKpis.total),
    "payroll-trend": formatCurrency(payrollAnalysis.totalCurrentPayrollCost),
    "revenue-per-fte": payrollAnalysis.totalCurrentFte ? formatCurrency(kpis.revenue / payrollAnalysis.totalCurrentFte) : "N/A",
    "expense-breakdown": formatCurrency(kpis.expenses),
    "budget-vs-actual": formatOptionalCurrency(budgetMetrics.netIncomeVariance, "N/A"),
    "net-income-trend": formatCurrency(kpis.netIncome),
    "working-capital-trend": formatCurrency(kpis.cash + kpis.accountsReceivable - apKpis.total),
  };
  const percent = Math.min(
    Math.max(
      chartId === "gross-margin-trend"
        ? Math.abs(netMargin)
        : kpis.revenue
          ? (Math.abs(parseNumber(primaryValue[chartId]) || 0) / Math.max(Math.abs(kpis.revenue), 1)) * 100
          : 35,
      8,
    ),
    100,
  );

  return (
    <div className="print-dashboard-card">
      <p className="print-dashboard-label">{chartLabels[chartId]}</p>
      <strong>{primaryValue[chartId]}</strong>
      <div className="print-aging-bar-track">
        <span className="print-aging-bar print-aging-good" style={{ width: `${percent}%` }} />
      </div>
      <p>Trend visualization placeholder for board package export and PowerPoint alignment.</p>
    </div>
  );
}

function isExpenseLikeFluxRow(row: FluxRow) {
  const normalized = normalizeStatementLabel(row.accountName);
  return (
    row.accountType === "expense" ||
    row.accountType === "cogs" ||
    row.accountType === "other-expense" ||
    normalized.includes("expense") ||
    normalized.includes("maintenance") ||
    normalized.includes("rental") ||
    normalized.includes("rent") ||
    normalized.includes("marketing") ||
    normalized.includes("software") ||
    normalized.includes("subscription") ||
    normalized.includes("payroll") ||
    normalized.includes("wage") ||
    normalized.includes("labor") ||
    normalized.includes("materials") ||
    normalized.includes("supplies") ||
    normalized.includes("fuel") ||
    normalized.includes("travel")
  );
}

function AgingPrintTable({
  kpis,
  totalLabel,
  currentLabel,
}: {
  kpis: AgingKpis;
  totalLabel: string;
  currentLabel: string;
}) {
  const buckets = [
    { label: currentLabel, value: kpis.current, tone: "good" },
    { label: "1-30 Days", value: kpis.days1To30, tone: "watch" },
    { label: "31-60 Days", value: kpis.days31To60, tone: "watch" },
    { label: "61-90 Days", value: kpis.days61To90, tone: "risk" },
    { label: "90+ Days", value: kpis.days90Plus, tone: "critical" },
  ];
  const currentPercent = kpis.total ? (kpis.current / kpis.total) * 100 : 0;
  const overduePercent = kpis.total
    ? ((kpis.days31To60 + kpis.days61To90 + kpis.days90Plus) / kpis.total) * 100
    : 0;

  return (
    <div className="print-section-block">
      <div className="print-grid">
        <PrintKpiCard label={totalLabel} value={formatMoney(kpis.total)} />
        <PrintKpiCard label="Current %" value={`${currentPercent.toFixed(1)}%`} />
        <PrintKpiCard label="Over 30 Days" value={`${overduePercent.toFixed(1)}%`} />
        <PrintKpiCard label="90+ Exposure" value={formatMoney(kpis.days90Plus)} />
      </div>
      <table className="print-table print-compact-table">
        <thead>
          <tr>
            <th>Bucket</th>
            <th>Amount</th>
            <th>% of Total</th>
            <th>Visual Mix</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => {
            const percent = kpis.total ? (bucket.value / kpis.total) * 100 : 0;
            return (
              <tr key={bucket.label}>
                <td>{bucket.label}</td>
                <td>{formatMoney(bucket.value)}</td>
                <td>{percent.toFixed(1)}%</td>
                <td>
                  <div className="print-aging-bar-track">
                    <span className={`print-aging-bar print-aging-${bucket.tone}`} style={{ width: `${Math.min(percent, 100)}%` }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="print-commentary">
        {currentPercent >= 75
          ? `${currentPercent.toFixed(1)}% remains current, indicating strong collection or payment timing performance.`
          : `Only ${currentPercent.toFixed(1)}% remains current; management should review overdue concentration and collection/payment timing.`}
      </p>
    </div>
  );
}

function FixedAssetChangePrintTable({ rows }: { rows: FixedAssetChangeRow[] }) {
  return (
    <table className="print-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Prior Period</th>
          <th>Current Period</th>
          <th>Change</th>
          <th>Interpretation</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.metric}>
            <td>{row.metric}</td>
            <td>{formatCurrency(row.prior)}</td>
            <td>{formatCurrency(row.current)}</td>
            <td>{formatCurrency(row.change)}</td>
            <td>{row.interpretation}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InventoryPrintTable({ items }: { items: InventoryItem[] }) {
  return (
    <table className="print-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Quantity</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {items.length > 0 ? (
          items.map((item, index) => (
            <tr key={`${item.name}-${index}`}>
              <td>{item.name}</td>
              <td>{formatNumber(item.quantity)}</td>
              <td>{formatMoney(item.value)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={3}>Inventory valuation report required.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function BudgetPrintSection({ metrics }: { metrics: BudgetMetrics }) {
  const revenueVariancePercent =
    metrics.revenueBudget && metrics.revenueVariance !== null
      ? (metrics.revenueVariance / metrics.revenueBudget) * 100
      : null;
  const netIncomeVariancePercent =
    metrics.netIncomeBudget && metrics.netIncomeVariance !== null
      ? (metrics.netIncomeVariance / Math.abs(metrics.netIncomeBudget || 1)) * 100
      : null;

  return (
    <section className="print-page">
      <h1>Budget vs Actual</h1>
      <div className="print-grid">
        <PrintKpiCard label="Revenue Actual" value={formatOptionalCurrency(metrics.revenueActual, "N/A")} />
        <PrintKpiCard label="Revenue Budget" value={formatOptionalCurrency(metrics.revenueBudget, "N/A")} />
        <PrintKpiCard label="Revenue Variance" value={formatOptionalCurrency(metrics.revenueVariance, "N/A")} />
        <PrintKpiCard label="Revenue Variance %" value={revenueVariancePercent === null ? "N/A" : `${revenueVariancePercent.toFixed(1)}%`} />
        <PrintKpiCard label="Net Income Variance" value={formatOptionalCurrency(metrics.netIncomeVariance, "N/A")} />
        <PrintKpiCard label="Net Income Variance %" value={netIncomeVariancePercent === null ? "N/A" : `${netIncomeVariancePercent.toFixed(1)}%`} />
      </div>
      <table className="print-table print-compact-table">
        <thead>
          <tr>
            <th>Variance Area</th>
            <th>Actual</th>
            <th>Budget</th>
            <th>Variance</th>
            <th>Signal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Revenue</td>
            <td>{formatOptionalCurrency(metrics.revenueActual, "N/A")}</td>
            <td>{formatOptionalCurrency(metrics.revenueBudget, "N/A")}</td>
            <td>{formatOptionalCurrency(metrics.revenueVariance, "N/A")}</td>
            <td>{(metrics.revenueVariance || 0) >= 0 ? "Favorable" : "Unfavorable"}</td>
          </tr>
          <tr>
            <td>Net Income</td>
            <td>{formatOptionalCurrency(metrics.netIncomeActual, "N/A")}</td>
            <td>{formatOptionalCurrency(metrics.netIncomeBudget, "N/A")}</td>
            <td>{formatOptionalCurrency(metrics.netIncomeVariance, "N/A")}</td>
            <td>{(metrics.netIncomeVariance || 0) >= 0 ? "Favorable" : "Unfavorable"}</td>
          </tr>
          <tr>
            <td>Largest Budget Miss</td>
            <td colSpan={4}>
              {metrics.largestUnfavorableVarianceLabel}:{" "}
              {formatOptionalCurrency(metrics.largestUnfavorableVariance, "N/A")}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="print-narrative-card">
        <h3>Budget Commentary</h3>
        <p>
          {metrics.largestUnfavorableVariance
            ? `${metrics.largestUnfavorableVarianceLabel} is the largest unfavorable budget variance at ${formatCurrency(
                Math.abs(metrics.largestUnfavorableVariance),
              )}. Review timing, staffing, vendor spend, and campaign or project deferrals behind this variance.`
            : "No unfavorable budget variance was identified from the uploaded budget report."}
        </p>
      </div>
    </section>
  );
}

function DebtPrintSection({ metrics }: { metrics: DebtMetrics }) {
  return (
    <section className="print-page">
      <h1>Debt Schedule / Loan Detail</h1>
      <table className="print-table">
        <tbody>
          <tr>
            <td>Total Debt</td>
            <td>{formatCurrency(metrics.totalDebt)}</td>
          </tr>
          <tr>
            <td>Current Portion</td>
            <td>{formatCurrency(metrics.currentPortion)}</td>
          </tr>
          <tr>
            <td>Long-Term Portion</td>
            <td>{formatCurrency(metrics.longTermPortion)}</td>
          </tr>
          <tr>
            <td>Debt-to-Assets</td>
            <td>{metrics.debtToAssets === null ? "N/A" : `${metrics.debtToAssets.toFixed(1)}%`}</td>
          </tr>
          <tr>
            <td>Debt-to-Equity</td>
            <td>{metrics.debtToEquity === null ? "N/A" : `${metrics.debtToEquity.toFixed(1)}%`}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function PayrollPrintSection({
  analysis,
  currentPayrollData,
  priorPayrollData,
  revenue,
}: {
  analysis: PayrollAnalysis;
  currentPayrollData: ParsedFile | null;
  priorPayrollData: ParsedFile | null;
  revenue: number;
}) {
  const hasPayrollData = Boolean(currentPayrollData || priorPayrollData);

  return (
    <section className="print-page">
      <h1>Payroll and FTE Analysis</h1>
      {!hasPayrollData ? (
        <p>Upload current and prior payroll summary by department reports to calculate FTE and payroll cost trends.</p>
      ) : (
        <>
          {!priorPayrollData && <p>Prior month payroll report required to calculate FTE change.</p>}
          <div className="print-grid">
            <PrintKpiCard label="Current FTE" value={formatFte(analysis.totalCurrentFte)} />
            <PrintKpiCard label="Prior FTE" value={priorPayrollData ? formatFte(analysis.totalPriorFte) : "N/A"} />
            <PrintKpiCard label="FTE Change" value={priorPayrollData ? formatFte(analysis.totalFteChange) : "N/A"} />
            <PrintKpiCard label="Current Payroll" value={formatCurrency(analysis.totalCurrentPayrollCost)} />
            <PrintKpiCard label="Prior Payroll" value={priorPayrollData ? formatCurrency(analysis.totalPriorPayrollCost) : "N/A"} />
            <PrintKpiCard
              label="Payroll Cost Change"
              value={priorPayrollData ? formatCurrency(analysis.totalPayrollCostChange) : "N/A"}
            />
            <PrintKpiCard
              label="Payroll Taxes"
              value={formatCurrency(analysis.rows.reduce((total, row) => total + row.currentPayrollTaxes, 0))}
            />
            <PrintKpiCard
              label="Payroll % of Revenue"
              value={revenue ? `${((analysis.totalCurrentPayrollCost / revenue) * 100).toFixed(1)}%` : "N/A"}
            />
            <PrintKpiCard
              label="Revenue per FTE"
              value={analysis.totalCurrentFte ? formatCurrency(revenue / analysis.totalCurrentFte) : "N/A"}
            />
            <PrintKpiCard label="Benefits / Overtime" value="Review GL Detail" />
          </div>
          <h2>FTE by Department</h2>
          <PayrollPrintTable rows={analysis.rows} includePrior={Boolean(priorPayrollData)} />
          <h2>Payroll Cost by Department</h2>
          <PayrollPrintTable rows={analysis.rows} includePrior={Boolean(priorPayrollData)} />
          <h2>Payroll Commentary</h2>
          <div className="print-commentary-grid">
            {(priorPayrollData
              ? analysis.commentary
              : ["Current month FTE is available. Prior month payroll report required to calculate FTE change."]).map(
              (comment) => (
                <div key={comment} className="print-narrative-card">
                  <p>{comment}</p>
                </div>
              ),
            )}
          </div>
        </>
      )}
    </section>
  );
}

function PayrollPrintTable({
  rows,
  includePrior,
}: {
  rows: PayrollDepartmentRow[];
  includePrior: boolean;
}) {
  return (
    <table className="print-table">
      <thead>
        <tr>
          <th>Department</th>
          <th>Current FTE</th>
          <th>Prior FTE</th>
          <th>FTE Change</th>
          <th>Current Payroll Cost</th>
          <th>Prior Payroll Cost</th>
          <th>Payroll Cost Change</th>
          <th>Payroll Cost per FTE</th>
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? (
          rows.map((row) => (
            <tr key={row.department}>
              <td>{row.department}</td>
              <td>{formatFte(row.currentFte)}</td>
              <td>{includePrior ? formatFte(row.priorFte) : "N/A"}</td>
              <td>{includePrior ? formatFte(row.fteChange) : "N/A"}</td>
              <td>{formatCurrency(row.currentPayrollCost)}</td>
              <td>{includePrior ? formatCurrency(row.priorPayrollCost) : "N/A"}</td>
              <td>{includePrior ? formatCurrency(row.payrollCostChange) : "N/A"}</td>
              <td>{formatCurrency(row.payrollCostPerFte)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={8}>Payroll summary by department report required.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function PrintFluxSection({ title, rows }: { title: string; rows: FluxRow[] }) {
  const formatPrintFluxMoney = (row: FluxRow, value: number) =>
    isExpenseLikeFluxRow(row) ? formatMoney(Math.abs(value)) : formatMoney(value);
  const formatPrintFluxPercent = (row: FluxRow) => {
    if (row.percentVariance === null) return "N/A";
    const value = isExpenseLikeFluxRow(row) ? Math.abs(row.percentVariance) : row.percentVariance;
    return `${value.toFixed(1)}%`;
  };

  return (
    <section className="print-page">
      <h1>{title}</h1>
      <p className="print-section-intro">Accounts exceeding selected Virtual CFO flux thresholds, separated into an executive variance table and readable commentary cards.</p>
      <table className="print-table print-compact-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Basis</th>
            <th>Current Amount</th>
            <th>Prior Amount</th>
            <th>Change $</th>
            <th>Change %</th>
            <th>Severity</th>
            <th>Top Driver</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <tr key={`${row.accountNumber}-${row.accountName}-${index}`}>
                <td>{row.accountName}</td>
                <td>{row.basis}</td>
                <td>{formatPrintFluxMoney(row, row.currentAmount)}</td>
                <td>{formatPrintFluxMoney(row, row.priorAmount)}</td>
                <td>{formatPrintFluxMoney(row, row.dollarVariance)}</td>
                <td>{formatPrintFluxPercent(row)}</td>
                <td>{row.severity}</td>
                <td>{row.topDriver}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8}>Upload matching GL detail reports to generate flux analysis.</td>
            </tr>
          )}
        </tbody>
      </table>
      {rows.length > 0 && (
        <div className="print-commentary-grid">
          {rows.slice(0, 6).map((row, index) => (
            <div key={`${row.accountName}-commentary-${index}`} className="print-narrative-card">
              <h3>{row.accountName}</h3>
              <p>
                {row.commentary ||
                  `${row.accountName} changed by ${formatMoney(row.dollarVariance)}${
                    row.percentVariance === null ? "" : ` (${row.percentVariance.toFixed(1)}%)`
                  }. Primary driver: ${row.topDriver || "GL activity review recommended"}.`}
              </p>
              {row.warnings.length > 0 && <p className="print-commentary">Warnings: {row.warnings.join(" ")}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Preview({ title, data }: { title: string; data: ParsedFile | null }) {
  if (!data) return null;

  const previewRows = getPreviewRows(title, data);
  const normalizedPreviewTitle = title.toLowerCase();
  const isAgingPreview = normalizedPreviewTitle.includes("aging");
  const isPayrollDetailPreview = normalizedPreviewTitle.includes("payroll detail");
  const isGlPreview =
    normalizedPreviewTitle.includes("gl preview") ||
    normalizedPreviewTitle.includes("general ledger");
  const isComparisonPreview = previewRows.some((row) => isComparisonHeaderRow(row));
  const getHeadersForRow = (rowIndex: number) => {
    for (let index = rowIndex - 1; index >= 0; index--) {
      const candidate = previewRows[index];
      const filledCells = candidate?.filter((cell) => String(cell || "").trim()).length || 0;

      if (
        candidate &&
        (isPayrollDetailPreview ? isPayrollDetailHeaderRow(candidate) : isHeaderRow(candidate)) &&
        filledCells > 1
      ) {
        return candidate;
      }
    }

    return [];
  };
  const renderPreviewCell = (row: unknown[], cell: unknown, cellIndex: number, headers: unknown[], rowIndex: number) => {
    const value = parseNumber(cell);
    const isBudgetPreview = normalizedPreviewTitle.includes("budget");
    const lastNonEmptyCellIndex = row.reduce(
      (latestIndex, currentCell, currentIndex) =>
        String(currentCell || "").trim() ? currentIndex : latestIndex,
      -1,
    );
    const headerText = String(headers[cellIndex] || "").toLowerCase();
    const percentColumnIndexes = headers.reduce<number[]>((indexes, header, headerIndex) => {
      if (String(header || "").includes("%")) return [...indexes, headerIndex];
      return indexes;
    }, []);

    if (isGlPreview && cellIndex <= 2) {
      return String(cell || "");
    }

    if (isPayrollDetailPreview) {
      const columnLabel = getColumnLabel(headers, cellIndex);
      const directHeader = normalizeHeader(headers[cellIndex]);
      const isHeader = isPayrollDetailHeaderRow(row);
      if (isHeader) return String(cell || "");
      if (isTextColumn(columnLabel) || ((columnLabel.includes("date") || cellIndex === 0) && isDateOrPeriodLabel(cell))) {
        return String(cell || "");
      }
      if (
        value !== null &&
        (isCurrencyColumn(columnLabel) ||
          ["amount", "balance", "debit", "credit"].some(
            (label) => columnLabel.includes(label) || directHeader.includes(label),
          ) ||
          cellIndex >= Math.max(lastNonEmptyCellIndex - 2, 0))
      ) {
        return formatCurrency(value);
      }
      if (value !== null && cellIndex > 0) return formatNumber(value);
      return String(cell || "");
    }

    if (
      isAgingPreview &&
      cellIndex > 0 &&
      value !== null &&
      !isAgingBucketLabel(cell)
    ) {
      return formatCurrency(value);
    }

    if (
      value !== null &&
      cellIndex > 0 &&
      !isHeaderRow(row) &&
      ((isBudgetPreview && cellIndex === lastNonEmptyCellIndex) ||
        (isComparisonPreview &&
          (headerText.includes("%") || percentColumnIndexes.includes(cellIndex))))
    ) {
      return formatPercent(value);
    }

    return formatPreviewCell(row, cell, cellIndex, headers, rowIndex, title);
  };

  return (
    <div className="mt-10 rounded-3xl bg-slate-900 p-8">
      <h2 className="mb-2 text-2xl font-bold">{title}</h2>
      <p className="mb-4 text-sm text-slate-400">
        File: {data.name} | Rows detected: {data.rows.length}
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-left text-sm">
          <tbody>
            {previewRows.map((row, rowIndex) => {
              const rowType = getPreviewRowType(row);
              const metaRowType = getPreviewMetaRowType(row, rowIndex);
              const headers = getHeadersForRow(rowIndex);
              const subtotalRow = rowType === "subtotal";
              const calculatedValueRow = rowType === "calculated-value";
              const grandTotalRow = rowType === "grand-total";
              const majorTotalRow = rowType === "major-total";
              const headerRow = (isPayrollDetailPreview ? isPayrollDetailHeaderRow(row) : isHeaderRow(row)) && row.length > 1;

              return (
              <tr
                key={rowIndex}
                className={`border-b border-slate-800 ${
                  metaRowType === "company"
                    ? "bg-[#172033] text-base font-extrabold text-[#F9FAFB]"
                    : metaRowType === "report"
                      ? "bg-[#172033]/80 font-bold text-blue-200"
                      : metaRowType === "period"
                        ? "bg-[#172033]/60 font-semibold text-slate-200"
                  : headerRow
                    ? "bg-slate-800/60 font-bold text-slate-100"
                    : rowType === "section"
                    ? "bg-slate-800/50 font-bold text-slate-100"
                    : grandTotalRow
                      ? "grandTotalRow border-t-[3px] border-t-slate-300 bg-slate-700/70 text-base font-black uppercase text-white"
                      : calculatedValueRow
                        ? "calculatedValueRow border-t border-t-slate-500 bg-slate-800/30 font-bold text-slate-100"
                        : majorTotalRow
                          ? "border-t-2 border-t-slate-500 bg-slate-800/40 font-extrabold text-white"
                          : subtotalRow
                            ? "border-t border-t-slate-600 bg-slate-800/20 font-semibold text-slate-100"
                            : "text-slate-300"
                } ${subtotalRow ? "subtotalRow" : ""}`}
              >
                {metaRowType ? (
                  <td colSpan={PREVIEW_COLUMN_LIMIT} className="px-4 py-3">
                    {String(row.find((cell) => String(cell || "").trim()) || "")}
                  </td>
                ) : (
                  row.slice(0, PREVIEW_COLUMN_LIMIT).map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-4 py-2 ${
                        cellIndex === 0 && rowType === "detail" && !headerRow ? "pl-8" : ""
                      } ${cellIndex > 0 ? "text-right tabular-nums" : ""}`}
                    >
                      {renderPreviewCell(row, cell, cellIndex, headers, rowIndex)}
                    </td>
                  ))
                )}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}