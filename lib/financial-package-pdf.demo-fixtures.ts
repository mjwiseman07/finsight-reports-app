/**
 * lib/financial-package-pdf.demo-fixtures.ts
 *
 * Phase MC-2c: demo/sample data for the Financial Package PDF.
 * Sample numbers stay hardcoded; currency formatting is dynamic via formatMoney.
 */
import { DEFAULT_FALLBACK_CURRENCY, formatMoney } from "@/lib/format/money";

function money(amount: number, currency: string): string {
  return formatMoney(amount, currency, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function accounting(amount: number, currency: string): string {
  const formatted = money(Math.abs(amount), currency);
  return amount < 0 ? `(${formatted})` : formatted;
}

export type DemoPdfPage = {
  title: string;
  category: string;
  subtitle?: string;
  lines?: string[];
  table?: Array<[string, string]>;
  divider?: boolean;
  statement?: "balanceSheet" | "incomeStatement";
};

export type DemoFluxRow = {
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
};

export function buildDemoPackageSections(currency: string): DemoPdfPage[] {
  const c = currency || DEFAULT_FALLBACK_CURRENCY;
  return [
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
      ["Operating Checking", money(182_000, c)],
      ["Savings Account", money(95_000, c)],
      ["Total Bank Accounts", money(277_000, c)],
      ["Accounts Receivable", money(146_000, c)],
      ["Inventory Asset", money(82_000, c)],
      ["Prepaid Insurance", money(9_000, c)],
      ["Total Current Assets", money(514_000, c)],
      ["Equipment and Vehicles", money(420_000, c)],
      ["Machinery and Tools", money(185_000, c)],
      ["Furniture and Office Equipment", money(46_000, c)],
      ["Leasehold Improvements", money(28_000, c)],
      ["Total Fixed Assets", money(679_000, c)],
      ["Less: Accumulated Depreciation", accounting(-114_000, c)],
      ["Net Fixed Assets", money(565_000, c)],
      ["TOTAL ASSETS", money(1_079_000, c)],
      ["Accounts Payable", money(78_000, c)],
      ["Credit Cards", money(14_000, c)],
      ["Vehicle Loans", money(67_000, c)],
      ["Equipment Notes Payable", money(91_000, c)],
      ["TOTAL LIABILITIES", money(282_000, c)],
      ["TOTAL EQUITY", money(797_000, c)],
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
      ["Working Capital", money(330_000, c)],
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
      ["Total Fixed Assets", money(679_000, c)],
      ["Accumulated Depreciation", accounting(-114_000, c)],
      ["Net Book Value", money(565_000, c)],
      ["Depreciation Expense", money(5_000, c)],
      ["Beginning Gross Assets", money(704_000, c)],
      ["Additions", money(0, c)],
      ["Disposals", accounting(-25_000, c)],
      ["Transfers", money(0, c)],
      ["Step-Up Valuation Adjustment", money(0, c)],
      ["Step-Down Valuation Adjustment", money(0, c)],
      ["Ending Gross Assets", money(679_000, c)],
      ["Accumulated Depreciation Change", accounting(-114_000, c)],
      ["Net Book Value Change", money(23_000, c)],
      ["Advisory Focus", "Review additions, disposals, depreciation policy, and capacity impact."],
    ],
  },
  {
    title: "Accounts Receivable Aging",
    category: "WORKING CAPITAL",
    lines: ["Receivables are reviewed for collection exposure, DSO impact, and concentration risk."],
    table: [
      ["Current", money(96_000, c)],
      ["1-30 Days", money(28_000, c)],
      ["31-60 Days", money(13_000, c)],
      ["61-90 Days", money(6_000, c)],
      ["90+ Days", money(3_000, c)],
      ["Total AR", money(146_000, c)],
    ],
  },
  {
    title: "Accounts Payable Aging",
    category: "WORKING CAPITAL",
    lines: ["Payables are reviewed for vendor pressure, payment timing, and cash runway implications."],
    table: [
      ["Current", money(44_000, c)],
      ["1-30 Days", money(21_000, c)],
      ["31-60 Days", money(9_000, c)],
      ["61-90 Days", money(3_000, c)],
      ["90+ Days", money(1_000, c)],
      ["Total AP", money(78_000, c)],
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
      ["Raw Materials", money(34_000, c)],
      ["Work in Process", money(18_000, c)],
      ["Finished Goods", money(30_000, c)],
      ["Slow Moving Inventory", money(7_500, c)],
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
      ["Industrial Services Revenue", money(485_000, c)],
      ["Maintenance Contracts", money(215_000, c)],
      ["Emergency Repair Revenue", money(124_000, c)],
      ["Total Income", money(824_000, c)],
      ["Field Labor", money(238_000, c)],
      ["Materials & Supplies", money(91_000, c)],
      ["Equipment Rentals", money(27_000, c)],
      ["Fuel Expense", money(19_000, c)],
      ["Total Cost of Goods Sold", money(375_000, c)],
      ["Gross Profit", money(449_000, c)],
      ["Payroll - Admin", money(74_000, c)],
      ["Insurance", money(18_000, c)],
      ["Software Subscriptions", money(5_400, c)],
      ["Utilities", money(6_200, c)],
      ["Marketing", money(9_800, c)],
      ["Office Expense", money(4_100, c)],
      ["Vehicle Expense", money(11_800, c)],
      ["Professional Fees", money(13_600, c)],
      ["Rent Expense", money(24_000, c)],
      ["Travel Expense", money(7_200, c)],
      ["Depreciation Expense", money(5_000, c)],
      ["Total Operating Expenses", money(179_100, c)],
      ["Net Income", money(269_900, c)],
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
}

export function buildDemoBalanceSheetRows(currency: string): Array<{
  label: string;
  value?: string;
  ytdValue?: string;
  kind?: string;
  level?: number;
}> {
  const c = currency || DEFAULT_FALLBACK_CURRENCY;
  return [
          { label: "ASSETS", kind: "major" },
          { label: "Current Assets", kind: "subheader" },
          { label: "Cash", value: money(182_000, c), level: 1 },
          { label: "Savings", value: money(95_000, c), level: 1 },
          { label: "Accounts Receivable", value: money(146_000, c), level: 1 },
          { label: "Inventory", value: money(82_000, c), level: 1 },
          { label: "Prepaid Expenses", value: money(9_000, c), level: 1 },
          { label: "Total Current Assets", value: money(514_000, c), kind: "subtotal" },
          { label: "Property and Equipment", kind: "subheader" },
          { label: "Equipment and Vehicles", value: money(420_000, c), level: 1 },
          { label: "Machinery and Tools", value: money(185_000, c), level: 1 },
          { label: "Furniture and Office Equipment", value: money(46_000, c), level: 1 },
          { label: "Leasehold Improvements", value: money(28_000, c), level: 1 },
          { label: "Total Property and Equipment", value: money(679_000, c), kind: "subtotal" },
          { label: "Less: Accumulated Depreciation", value: accounting(-114_000, c), level: 1 },
          { label: "Net Property and Equipment", value: money(565_000, c), kind: "subtotal" },
          { label: "TOTAL ASSETS", value: money(1_079_000, c), kind: "total" },
          { label: "LIABILITIES AND EQUITY", kind: "major" },
          { label: "Current Liabilities", kind: "subheader" },
          { label: "Accounts Payable", value: money(78_000, c), level: 1 },
          { label: "Credit Cards", value: money(14_000, c), level: 1 },
          { label: "Current Debt", value: money(32_000, c), level: 1 },
          { label: "Total Current Liabilities", value: money(124_000, c), kind: "subtotal" },
          { label: "Long-Term Liabilities", kind: "subheader" },
          { label: "Equipment Notes Payable", value: money(91_000, c), level: 1 },
          { label: "Vehicle Loans", value: money(67_000, c), level: 1 },
          { label: "Line of Credit", value: money(0, c), level: 1 },
          { label: "Total Long-Term Liabilities", value: money(158_000, c), kind: "subtotal" },
          { label: "TOTAL LIABILITIES", value: money(282_000, c), kind: "subtotal" },
          { label: "Equity", kind: "subheader" },
          { label: "Owner Equity", value: money(522_100, c), level: 1 },
          { label: "Retained Earnings", value: money(0, c), level: 1 },
          { label: "Current Year Earnings", value: money(274_900, c), level: 1 },
          { label: "TOTAL EQUITY", value: money(797_000, c), kind: "subtotal" },
          { label: "TOTAL LIABILITIES AND EQUITY", value: money(1_079_000, c), kind: "total" },
        ];
}

export function buildDemoIncomeStatementRows(currency: string): Array<{
  label: string;
  value?: string;
  ytdValue?: string;
  kind?: string;
  level?: number;
}> {
  const c = currency || DEFAULT_FALLBACK_CURRENCY;
  return [
          { label: "REVENUE", kind: "major" },
          { label: "Industrial Services Revenue", value: money(485_000, c), level: 1 },
          { label: "Maintenance Contracts", value: money(215_000, c), level: 1 },
          { label: "Emergency Repair Revenue", value: money(124_000, c), level: 1 },
          { label: "TOTAL REVENUE", value: money(824_000, c), kind: "subtotal" },
          { label: "COST OF GOODS SOLD", kind: "major" },
          { label: "Field Labor", value: money(238_000, c), level: 1 },
          { label: "Materials & Supplies", value: money(91_000, c), level: 1 },
          { label: "Equipment Rentals", value: money(27_000, c), level: 1 },
          { label: "Fuel Expense", value: money(19_000, c), level: 1 },
          { label: "TOTAL COST OF GOODS SOLD", value: money(375_000, c), kind: "subtotal" },
          { label: "GROSS PROFIT", value: money(449_000, c), kind: "highlight" },
          { label: "OPERATING EXPENSES", kind: "major" },
          { label: "Payroll - Admin", value: money(74_000, c), level: 1 },
          { label: "Insurance", value: money(18_000, c), level: 1 },
          { label: "Software Subscriptions", value: money(5_400, c), level: 1 },
          { label: "Utilities", value: money(6_200, c), level: 1 },
          { label: "Marketing", value: money(9_800, c), level: 1 },
          { label: "Office Expense", value: money(4_100, c), level: 1 },
          { label: "Vehicle Expense", value: money(11_800, c), level: 1 },
          { label: "Professional Fees", value: money(13_600, c), level: 1 },
          { label: "Rent Expense", value: money(24_000, c), level: 1 },
          { label: "Travel Expense", value: money(7_200, c), level: 1 },
          { label: "Depreciation Expense", value: money(5_000, c), level: 1 },
          { label: "TOTAL OPERATING EXPENSES", value: money(179_100, c), kind: "subtotal" },
          { label: "OPERATING INCOME", value: money(269_900, c), kind: "highlight" },
          { label: "OTHER INCOME / EXPENSE", kind: "major" },
          { label: "Other Income", value: money(0, c), level: 1 },
          { label: "Other Expense", value: money(0, c), level: 1 },
          { label: "NET INCOME", value: money(269_900, c), kind: "total" },
        ];
}

export function buildDemoFluxRows(currency: string): DemoFluxRow[] {
  const c = currency || DEFAULT_FALLBACK_CURRENCY;
  return [
  {
    account: "Payroll Wages - Field Operations",
    statement: "Income Statement",
    current: money(24_220, c),
    prior: money(19_440, c),
    change: money(4_780, c),
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
      payrollChange: money(45_000, c),
      payrollPerFte: money(4_250, c),
      priorPayrollPerFte: money(4_010, c),
      revenuePerFte: money(14_456, c),
      departmentChanges: `Field Operations payroll increased ${money(5_689, c)}; overtime and dispatch coverage were the primary drivers.`,
    },
  },
  {
    account: "Accounts Receivable",
    statement: "Balance Sheet",
    current: money(146_000, c),
    prior: money(126_500, c),
    change: money(19_500, c),
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
    current: money(68_400, c),
    prior: money(59_100, c),
    change: money(9_300, c),
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
    current: money(14_800, c),
    prior: money(8_900, c),
    change: money(5_900, c),
    percent: "66.3%",
    severity: "Watch",
    driver: "One-time advisory, legal, accounting, or project activity",
    businessImplication: "Non-recurring spend may distort run-rate operating expense if not isolated.",
    implication: "Non-recurring services can distort operating expense trends if not separated from normal run-rate.",
    action: "Classify one-time fees separately and update the forecast run-rate if the spend will continue.",
    executiveFocus: "Determine whether this should remain in recurring operating expense or be treated as a one-time item.",
  },
  ];
}
