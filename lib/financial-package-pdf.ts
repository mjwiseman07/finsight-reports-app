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
};

type PdfPage = {
  title: string;
  category: string;
  subtitle?: string;
  lines?: string[];
  table?: Array<[string, string]>;
  divider?: boolean;
  statement?: "balanceSheet" | "incomeStatement";
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
      ["Current FTE", "31.0"],
      ["Prior FTE", "29.5"],
      ["Payroll Cost", "$78,000"],
      ["Payroll Cost per FTE", "$2,516"],
      ["Revenue per FTE", "$13,548"],
      ["Payroll Growth", "8.0%"],
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
      ["Revenue per FTE", "$13,548"],
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

function financialStatementRows(statement: "balanceSheet" | "incomeStatement", startY: number) {
  const rows =
    statement === "balanceSheet"
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
        ];

  return rows.flatMap((row, index) => {
    const y = startY - index * 15;
    const isMajor = row.kind === "major";
    const isSubtotal = row.kind === "subtotal";
    const isTotal = row.kind === "total";
    const isHighlight = row.kind === "highlight";
    const labelX = isMajor || isTotal || isHighlight ? 58 : row.kind === "subheader" || isSubtotal ? 72 : 92;
    const font = isMajor || row.kind === "subheader" || isSubtotal || isTotal || isHighlight ? "F2" : "F1";
    const size = isMajor ? 10 : 9;
    const output = [
      ...(isMajor ? ["0.96 0.97 0.99 rg 48 " + (y - 5) + " 516 15 re f", "0.04 0.06 0.13 rg"] : []),
      textLine(row.label, labelX, y, size, font),
      ...(row.value ? [rightAlignedTextLine(row.value, 508, y, 9, font)] : []),
    ];
    if ((isSubtotal || isHighlight || isTotal) && row.value) {
      output.push("0.04 0.06 0.13 RG", `430 ${y - 3} m 508 ${y - 3} l S`);
    }
    if (isTotal && row.value) {
      output.push(`430 ${y - 6} m 508 ${y - 6} l S`);
    }
    return output;
  });
}

function fixedAssetHorizontalSchedule(startY: number) {
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
  const scheduleRightEdge = 548;
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

  return [
    textLine("Fixed Asset Roll-Forward by Category", 58, startY, 12, "F2"),
    "0.83 0.54 0.29 rg 58 " + (startY - 8) + " 150 2 re f",
    "0 0 0 rg",
    ...drawHeader(grossHeaders, startY - 30),
    ...drawRows(grossRows, startY - 50, [240, 290, 340, 390, 440, 490, scheduleRightEdge]),
    textLine("Accumulated Depreciation by Category", 58, startY - 160, 12, "F2"),
    "0.83 0.54 0.29 rg 58 " + (startY - 168) + " 170 2 re f",
    "0 0 0 rg",
    ...drawHeader(depreciationHeaders, startY - 190),
    ...drawRows(depreciationRows, startY - 210, [258, 318, 378, 448, scheduleRightEdge]),
    textLine("Net Book Value", 58, startY - 312, 10, "F2"),
    rightAlignedTextLine("$565,000", scheduleRightEdge, startY - 312, 10, "F2"),
    "430 " + (startY - 315) + " m " + scheduleRightEdge + " " + (startY - 315) + " l S",
    "430 " + (startY - 318) + " m " + scheduleRightEdge + " " + (startY - 318) + " l S",
    textLine("Advisory Focus", 58, startY - 342, 11, "F2"),
    textLine("Review additions, disposals, transfers, valuation adjustments, and depreciation policy against operating capacity and cash flow requirements.", 58, startY - 362, 8.5),
  ];
}

function buildPageContent(page: PdfPage, options: Required<FinancialPackagePdfOptions>, pageNumber: number, totalPages: number, tocRows: Array<[string, string]>) {
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

    if (page.title === "Fixed Asset Analysis") {
      ops.push(...fixedAssetHorizontalSchedule(520));
    } else if (page.table) {
      if (page.statement) {
        ops.push(...financialStatementRows(page.statement, 606));
      } else {
        ops.push(textLine("Line Item", 58, page.lines?.length ? 516 : 606, 9, "F2"), rightAlignedTextLine("Amount", 508, page.lines?.length ? 516 : 606, 9, "F2"));
        ops.push(...tableRows(page.table, page.lines?.length ? 492 : 582));
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

function normalizeOptions(options: FinancialPackagePdfOptions = {}): Required<FinancialPackagePdfOptions> {
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
  validateFixedAssetBalanceSheetTieOut();
  const normalizedOptions = normalizeOptions(options);
  const pages: PdfPage[] = [
    { title: "Cover Page", category: "CONFIDENTIAL" },
    ...packageSections,
  ];
  const tocRows = pages.slice(1).map((page, index) => [`${index + 2}`, page.title] as [string, string]);
  const contents = pages.map((page, index) => buildPageContent(page, normalizedOptions, index + 1, pages.length, tocRows));
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

function buildFluxPageContent(title: string, options: Required<FinancialPackagePdfOptions>, rows: typeof fluxRows, pageNumber: number, totalPages: number) {
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
  const normalizedOptions = normalizeOptions(options);
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
