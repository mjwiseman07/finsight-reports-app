/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const ts = require("typescript");

require.extensions[".ts"] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const { buildFinancialPackageInputFromNormalizedData, buildFinancialPackagePdfBlob } = require("../lib/financial-package-pdf.ts");
const { normalizeTabularReportRows } = require("../lib/integrations/accounting/normalizers/reports.ts");

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function source(label, amount, hierarchyPath = [label]) {
  return {
    provider: "quickbooks",
    providerFamily: "intuit",
    providerProduct: "quickbooks_online",
    sourceReport: "ProfitAndLoss",
    raw: {
      label,
      amount,
      __advisacorHierarchyPath: hierarchyPath,
      __advisacorSourceSection: hierarchyPath[hierarchyPath.length - 2] || hierarchyPath[0] || label,
    },
  };
}

const incomeStatementRows = [
  ["Revenue", 10000],
  ["COGS", 3000],
  ["Gross Profit", 7000],
  ["Expenses", 5000],
  ["Net Income", 2000],
];

const incomeStatementYtdRows = [
  ["Revenue", 52000],
  ["COGS", 18000],
  ["Gross Profit", 34000],
  ["Expenses", 24000],
  ["Net Income", 10000],
];

const normalizedData = {
  sourceSystem: "quickbooks",
  adapterName: "quickBooksAdapter",
  companyId: "company-1",
  connectionId: "connection-1",
  tenantId: "tenant-1",
  tenantName: "QuickBooks Demo Company",
  syncId: "sync-1",
  reportPeriod: { startDate: "2026-05-01", endDate: "2026-05-31" },
  mappedAt: new Date().toISOString(),
  rawReportsPulled: { accounts: true, trialBalance: true, balanceSheet: true, incomeStatement: true, arAging: false, apAging: false },
  syncStatus: "SUCCESS",
  lastSyncedAt: new Date().toISOString(),
  normalizedAccounts: [],
  normalizedTransactions: [],
  normalizedTrialBalance: [],
  normalizedBalanceSheet: [
    { label: "Total Assets", amount: 100, section: "Assets", source: source("Total Assets", 100) },
    { label: "Total Liabilities and Equity", amount: 100, section: "Equity", source: source("Total Liabilities and Equity", 100) },
  ],
  normalizedIncomeStatement: incomeStatementRows.map(([label, amount]) => ({ label, amount, section: label, source: source(label, amount) })),
  normalizedIncomeStatementYtd: incomeStatementYtdRows.map(([label, amount]) => ({ label, amount, section: label, source: source(label, amount) })),
  normalizedARAging: [],
  normalizedAPAging: [],
  normalizedBudgets: [],
  normalizedDepartments: [],
  normalizedLocations: [],
  normalizedClasses: [],
  normalizedProjects: [],
  normalizedVendors: [],
  normalizedCustomers: [],
  validation: { readyForReporting: true, missingObjects: [], warnings: [] },
};

const detailRows = [
  ["Design Income", 2000, ["Income", "Design Income"]],
  ["Discounts Given", -100, ["Income", "Discounts Given"]],
  ["Fountains and Garden Lighting", 1200, ["Income", "Landscaping Services", "Job Materials", "Fountains and Garden Lighting"]],
  ["Plants and Soil", 1500, ["Income", "Landscaping Services", "Job Materials", "Plants and Soil"]],
  ["Sprinklers and Drip Systems", 1300, ["Income", "Landscaping Services", "Job Materials", "Sprinklers and Drip Systems"]],
  ["Total Job Materials", 4000, ["Income", "Landscaping Services", "Job Materials", "Total Job Materials"]],
  ["Installation", 1800, ["Income", "Landscaping Services", "Labor", "Installation"]],
  ["Maintenance and Repair", 1200, ["Income", "Landscaping Services", "Labor", "Maintenance and Repair"]],
  ["Total Labor", 3000, ["Income", "Landscaping Services", "Labor", "Total Labor"]],
  ["Total Landscaping Services", 7000, ["Income", "Landscaping Services", "Total Landscaping Services"]],
  ["Pest Control Services", 900, ["Income", "Pest Control Services"]],
  ["Sales of Product Income", 800, ["Income", "Sales of Product Income"]],
  ["Services", 400, ["Income", "Services"]],
  ["Total Income", 11000, ["Income", "Total Income"]],
  ["Cost Of Goods Sold", 3000, ["Cost Of Goods Sold", "Cost Of Goods Sold"]],
  ["Total Cost Of Goods Sold", 3000, ["Cost Of Goods Sold", "Total Cost Of Goods Sold"]],
  ["Gross Profit", 8000, ["Gross Profit"]],
  ["Advertising", 500, ["Expenses", "Advertising"]],
  ["Automobile", 700, ["Expenses", "Automobile"]],
  ["Meals and Entertainment", 300, ["Expenses", "Meals and Entertainment"]],
  ["Office Expense", 600, ["Expenses", "Office Expense"]],
  ["Payroll Expense", 2400, ["Expenses", "Payroll Expense"]],
  ["Rent", 900, ["Expenses", "Rent"]],
  ["Utilities", 600, ["Expenses", "Utilities"]],
  ["Total Expenses", 6000, ["Expenses", "Total Expenses"]],
  ["Net Operating Income", 2000, ["Net Operating Income"]],
  ["Net Income", 2000, ["Net Income"]],
];

const detailedNormalizedData = {
  ...normalizedData,
  normalizedIncomeStatement: detailRows.map(([label, amount, hierarchyPath]) => ({ label, amount, section: hierarchyPath[0], source: source(label, amount, hierarchyPath) })),
  normalizedIncomeStatementYtd: detailRows.map(([label, amount, hierarchyPath]) => ({ label, amount: Number(amount) * 5, section: hierarchyPath[0], source: source(label, Number(amount) * 5, hierarchyPath) })),
};

const quickBooksNestedRows = [
  {
    Header: { ColData: [{ value: "Income" }, { value: "" }] },
    Rows: { Row: [
      { ColData: [{ value: "Design Income" }, { value: "2000" }] },
      { ColData: [{ value: "Discounts Given" }, { value: "-100" }] },
      {
        Header: { ColData: [{ value: "Landscaping Services" }, { value: "" }] },
        Rows: { Row: [
          {
            Header: { ColData: [{ value: "Job Materials" }, { value: "" }] },
            Rows: { Row: [
              { ColData: [{ value: "Fountains and Garden Lighting" }, { value: "1200" }] },
              { ColData: [{ value: "Plants and Soil" }, { value: "1500" }] },
              { ColData: [{ value: "Sprinklers and Drip Systems" }, { value: "1300" }] },
            ] },
            Summary: { ColData: [{ value: "Total Job Materials" }, { value: "4000" }] },
          },
          {
            Header: { ColData: [{ value: "Labor" }, { value: "" }] },
            Rows: { Row: [
              { ColData: [{ value: "Installation" }, { value: "1800" }] },
              { ColData: [{ value: "Maintenance and Repair" }, { value: "1200" }] },
            ] },
            Summary: { ColData: [{ value: "Total Labor" }, { value: "3000" }] },
          },
        ] },
        Summary: { ColData: [{ value: "Total Landscaping Services" }, { value: "7000" }] },
      },
      { ColData: [{ value: "Pest Control Services" }, { value: "900" }] },
      { ColData: [{ value: "Sales of Product Income" }, { value: "800" }] },
      { ColData: [{ value: "Services" }, { value: "400" }] },
    ] },
    Summary: { ColData: [{ value: "Total Income" }, { value: "11000" }] },
  },
  {
    Header: { ColData: [{ value: "Cost of Goods Sold" }, { value: "" }] },
    Rows: { Row: [{ ColData: [{ value: "Cost of Goods Sold" }, { value: "3000" }] }] },
    Summary: { ColData: [{ value: "Total Cost of Goods Sold" }, { value: "3000" }] },
  },
  { ColData: [{ value: "Gross Profit" }, { value: "8000" }] },
  {
    Header: { ColData: [{ value: "Expenses" }, { value: "" }] },
    Rows: { Row: [
      { ColData: [{ value: "Advertising" }, { value: "500" }] },
      { ColData: [{ value: "Automobile" }, { value: "700" }] },
      { ColData: [{ value: "Meals and Entertainment" }, { value: "300" }] },
      { ColData: [{ value: "Office Expense" }, { value: "600" }] },
      { ColData: [{ value: "Payroll Expense" }, { value: "2400" }] },
      { ColData: [{ value: "Rent" }, { value: "900" }] },
      { ColData: [{ value: "Utilities" }, { value: "600" }] },
    ] },
    Summary: { ColData: [{ value: "Total Expenses" }, { value: "6000" }] },
  },
  { ColData: [{ value: "Net Operating Income" }, { value: "2000" }] },
  { ColData: [{ value: "Net Income" }, { value: "2000" }] },
];

const quickBooksNestedData = {
  ...normalizedData,
  normalizedIncomeStatement: normalizeTabularReportRows("quickbooks", "ProfitAndLoss", quickBooksNestedRows, "qbo:test"),
  normalizedIncomeStatementYtd: normalizeTabularReportRows("quickbooks", "ProfitAndLossYtd", quickBooksNestedRows, "qbo:test").map((row) => ({ ...row, amount: row.amount * 5 })),
};

const quickBooksExcelYtdRows = [
  {
    Header: { ColData: [{ value: "Income" }, { value: "" }] },
    Rows: { Row: [
      { ColData: [{ value: "Design income" }, { value: "2250.00" }] },
      { ColData: [{ value: "Discounts given" }, { value: "-89.50" }] },
      {
        Header: { ColData: [{ value: "Landscaping Services" }, { value: "1477.50" }] },
        Rows: { Row: [
          {
            Header: { ColData: [{ value: "Job Materials" }, { value: "" }] },
            Rows: { Row: [
              { ColData: [{ value: "Fountains and Garden Lighting" }, { value: "2246.50" }] },
              { ColData: [{ value: "Plants and Soil" }, { value: "2351.97" }] },
              { ColData: [{ value: "Sprinklers and Drip Systems" }, { value: "138.00" }] },
            ] },
            Summary: { ColData: [{ value: "Total for Job Materials" }, { value: "4736.47" }] },
          },
          {
            Header: { ColData: [{ value: "Labor" }, { value: "" }] },
            Rows: { Row: [
              { ColData: [{ value: "Installation" }, { value: "250.00" }] },
              { ColData: [{ value: "Maintenance and Repair" }, { value: "50.00" }] },
            ] },
            Summary: { ColData: [{ value: "Total for Labor" }, { value: "300.00" }] },
          },
        ] },
        Summary: { ColData: [{ value: "Total for Landscaping Services" }, { value: "6513.97" }] },
      },
      { ColData: [{ value: "Pest Control Services" }, { value: "110.00" }] },
      { ColData: [{ value: "Sales of Product Income" }, { value: "912.75" }] },
      { ColData: [{ value: "Services" }, { value: "503.55" }] },
    ] },
    Summary: { ColData: [{ value: "Total for Income" }, { value: "10200.77" }] },
  },
  {
    Header: { ColData: [{ value: "Cost of Goods Sold" }, { value: "" }] },
    Rows: { Row: [{ ColData: [{ value: "Cost of Goods Sold" }, { value: "405.00" }] }] },
    Summary: { ColData: [{ value: "Total for Cost of Goods Sold" }, { value: "405.00" }] },
  },
  { ColData: [{ value: "Gross Profit" }, { value: "9795.77" }] },
  {
    Header: { ColData: [{ value: "Expenses" }, { value: "" }] },
    Rows: { Row: [
      { ColData: [{ value: "Advertising" }, { value: "74.86" }] },
      {
        Header: { ColData: [{ value: "Automobile" }, { value: "113.96" }] },
        Rows: { Row: [{ ColData: [{ value: "Fuel" }, { value: "349.41" }] }] },
        Summary: { ColData: [{ value: "Total for Automobile" }, { value: "463.37" }] },
      },
      { ColData: [{ value: "Equipment Rental" }, { value: "112.00" }] },
      { ColData: [{ value: "Insurance" }, { value: "241.23" }] },
      {
        Header: { ColData: [{ value: "Job Expenses" }, { value: "155.07" }] },
        Rows: { Row: [
          {
            Header: { ColData: [{ value: "Job Materials" }, { value: "" }] },
            Rows: { Row: [
              { ColData: [{ value: "Decks and Patios" }, { value: "234.04" }] },
              { ColData: [{ value: "Plants and Soil" }, { value: "353.12" }] },
              { ColData: [{ value: "Sprinklers and Drip Systems" }, { value: "215.66" }] },
            ] },
            Summary: { ColData: [{ value: "Total for Job Materials" }, { value: "802.82" }] },
          },
        ] },
        Summary: { ColData: [{ value: "Total for Job Expenses" }, { value: "957.89" }] },
      },
      { ColData: [{ value: "Meals and Entertainment" }, { value: "28.49" }] },
      {
        Header: { ColData: [{ value: "Utilities" }, { value: "" }] },
        Rows: { Row: [
          { ColData: [{ value: "Gas and Electric" }, { value: "200.53" }] },
          { ColData: [{ value: "Telephone" }, { value: "130.86" }] },
        ] },
        Summary: { ColData: [{ value: "Total for Utilities" }, { value: "331.39" }] },
      },
    ] },
    Summary: { ColData: [{ value: "Total for Expenses" }, { value: "4937.31" }] },
  },
  { ColData: [{ value: "Net Operating Income" }, { value: "4858.46" }] },
  {
    Header: { ColData: [{ value: "Other Expenses" }, { value: "" }] },
    Rows: { Row: [{ ColData: [{ value: "Miscellaneous" }, { value: "2916.00" }] }] },
    Summary: { ColData: [{ value: "Total for Other Expenses" }, { value: "2916.00" }] },
  },
  { ColData: [{ value: "Net Other Income" }, { value: "-2916.00" }] },
  { ColData: [{ value: "Net Income" }, { value: "1942.46" }] },
];

const quickBooksExcelMtdRows = [
  {
    Header: { ColData: [{ value: "Expenses" }, { value: "" }] },
    Rows: { Row: [
      { ColData: [{ value: "Automobile" }, { value: "74.00" }] },
      {
        Header: { ColData: [{ value: "Job Expenses" }, { value: "" }] },
        Rows: { Row: [
          {
            Header: { ColData: [{ value: "Job Materials" }, { value: "" }] },
            Rows: { Row: [
              { ColData: [{ value: "Decks and Patios" }, { value: "42.00" }] },
              { ColData: [{ value: "Plants and Soil" }, { value: "24.00" }] },
            ] },
            Summary: { ColData: [{ value: "Total for Job Materials" }, { value: "66.00" }] },
          },
        ] },
        Summary: { ColData: [{ value: "Total for Job Expenses" }, { value: "66.00" }] },
      },
      { ColData: [{ value: "Meals and Entertainment" }, { value: "19.00" }] },
    ] },
    Summary: { ColData: [{ value: "Total for Expenses" }, { value: "159.00" }] },
  },
  { ColData: [{ value: "Net Operating Income" }, { value: "-159.00" }] },
  { ColData: [{ value: "Net Income" }, { value: "-159.00" }] },
];

const quickBooksExcelLikeData = {
  ...normalizedData,
  normalizedIncomeStatement: normalizeTabularReportRows("quickbooks", "ProfitAndLoss", quickBooksExcelMtdRows, "qbo:test"),
  normalizedIncomeStatementYtd: normalizeTabularReportRows("quickbooks", "ProfitAndLossYtd", quickBooksExcelYtdRows, "qbo:test"),
};

async function main() {
  const input = buildFinancialPackageInputFromNormalizedData({ normalizedData });
  const revenueRow = input.incomeStatementRows.find((row) => row.label === "Revenue");
  const netIncomeRow = input.incomeStatementRows.find((row) => row.label === "NET INCOME" || row.label === "Net Income");

  if (revenueRow?.value === "$10,000" && revenueRow?.ytdValue === "$52,000") pass("Income Statement Revenue has current period and YTD values");
  else fail(`Revenue row values wrong: current=${revenueRow?.value}, ytd=${revenueRow?.ytdValue}`);

  if (netIncomeRow?.value === "$2,000" && netIncomeRow?.ytdValue === "$10,000") pass("Income Statement Net Income has current period and YTD values");
  else fail(`Net Income row values wrong: current=${netIncomeRow?.value}, ytd=${netIncomeRow?.ytdValue}`);

  const pdfText = await buildFinancialPackagePdfBlob({ normalizedData, reportPeriod: "May 31, 2026" }).text();
  if (pdfText.includes("Current Period") && pdfText.includes("YTD")) pass("Income Statement PDF includes Current Period and YTD headers");
  else fail("Income Statement PDF missing Current Period/YTD headers");

  if (pdfText.includes("$10,000") && pdfText.includes("$52,000") && pdfText.includes("$2,000")) pass("Income Statement PDF includes current period and YTD values");
  else fail("Income Statement PDF missing expected current period/YTD values");

  const fallbackData = { ...normalizedData, normalizedIncomeStatementYtd: [] };
  const fallbackInput = buildFinancialPackageInputFromNormalizedData({ normalizedData: fallbackData });
  if (fallbackInput.incomeStatementRows.find((row) => row.label === "Revenue")?.ytdValue === "N/A") pass("Income Statement YTD falls back to N/A when unavailable");
  else fail("Income Statement YTD did not fall back to N/A");

  const detailedInput = buildFinancialPackageInputFromNormalizedData({ normalizedData: detailedNormalizedData });
  const fountainRow = detailedInput.incomeStatementRows.find((row) => row.label === "Fountains and Garden Lighting");
  const landscapingRow = detailedInput.incomeStatementRows.find((row) => row.label === "Landscaping Services");
  const jobMaterialsTotal = detailedInput.incomeStatementRows.find((row) => row.label === "Total Job Materials");
  if (landscapingRow?.kind === "subheader" && fountainRow?.level >= 3 && jobMaterialsTotal?.kind === "subtotal") pass("Detailed Income Statement preserves parent/child hierarchy and subtotal rows");
  else fail("Detailed Income Statement did not preserve expected hierarchy/subtotal rows");

  const detailedPdfText = await buildFinancialPackagePdfBlob({ normalizedData: detailedNormalizedData, reportPeriod: "May 31, 2026" }).text();
  if (detailedPdfText.includes("Fountains and Garden Lighting") && detailedPdfText.includes("Total Job Materials") && detailedPdfText.includes("NET OPERATING INCOME")) pass("Detailed mode is the default PDF Income Statement rendering");
  else fail("Default detailed PDF missing expected full hierarchy rows");

  const nestedInput = buildFinancialPackageInputFromNormalizedData({ normalizedData: quickBooksNestedData });
  const nestedLabels = nestedInput.incomeStatementRows.map((row) => row.label);
  const requiredNestedLabels = ["INCOME", "Design Income", "Discounts Given", "Landscaping Services", "Job Materials", "Fountains and Garden Lighting", "Plants and Soil", "Sprinklers and Drip Systems", "Total Job Materials", "Labor", "Installation", "Maintenance and Repair", "Total Labor", "Total Landscaping Services", "Pest Control Services", "Sales of Product Income", "Services", "Total Income", "Cost of Goods Sold", "Total Cost of Goods Sold", "GROSS PROFIT", "EXPENSES", "Advertising", "Automobile", "Meals and Entertainment", "Total Expenses", "NET OPERATING INCOME", "NET INCOME"];
  if (requiredNestedLabels.every((label) => nestedLabels.includes(label))) pass("QuickBooks nested P&L normalizer preserves full report hierarchy");
  else fail(`QuickBooks nested P&L hierarchy missing labels: ${requiredNestedLabels.filter((label) => !nestedLabels.includes(label)).join(", ")}`);

  const nestedPdfText = await buildFinancialPackagePdfBlob({ normalizedData: quickBooksNestedData, reportPeriod: "May 31, 2026" }).text();
  if (nestedPdfText.includes("Current Period") && nestedPdfText.includes("YTD") && nestedPdfText.includes("Plants and Soil") && nestedPdfText.includes("$7,500") && nestedPdfText.includes("Total Landscaping Services")) pass("QuickBooks detailed P&L PDF renders MTD and YTD by hierarchy path");
  else fail("QuickBooks detailed P&L PDF did not render expected MTD/YTD hierarchy");

  const excelLikeInput = buildFinancialPackageInputFromNormalizedData({ normalizedData: quickBooksExcelLikeData });
  const excelLikeRows = excelLikeInput.incomeStatementRows;
  const designIncome = excelLikeRows.find((row) => row.label === "Design income");
  const landscapingServices = excelLikeRows.find((row) => row.label === "Landscaping Services");
  const jobExpenses = excelLikeRows.find((row) => row.label === "Job Expenses");
  const netOtherIncome = excelLikeRows.find((row) => row.label === "Net Other Income");
  const excelLikeLabels = excelLikeRows.map((row) => row.label);
  const expectedExcelLabels = ["INCOME", "Design income", "Discounts given", "Landscaping Services", "Job Materials", "Fountains and Garden Lighting", "Total for Income", "COST OF GOODS SOLD", "GROSS PROFIT", "EXPENSES", "Job Expenses", "Total for Expenses", "NET OPERATING INCOME", "OTHER EXPENSES", "Miscellaneous", "Total for Other Expenses", "Net Other Income", "NET INCOME"];
  if (expectedExcelLabels.every((label) => excelLikeLabels.includes(label))) pass("Excel-style QuickBooks YTD P&L rows are included in detailed PDF layout");
  else fail(`Excel-style QuickBooks P&L missing labels: ${expectedExcelLabels.filter((label) => !excelLikeLabels.includes(label)).join(", ")}`);
  if (designIncome?.value === "$0" && designIncome?.ytdValue === "$2,250" && landscapingServices?.value === "$0" && landscapingServices?.ytdValue === "$1,478") pass("YTD-only income rows render with zero MTD and populated YTD values");
  else fail(`YTD-only income rows wrong: Design=${designIncome?.value}/${designIncome?.ytdValue}, Landscaping=${landscapingServices?.value}/${landscapingServices?.ytdValue}`);
  if (jobExpenses?.value === "$0" && jobExpenses?.ytdValue === "$155" && netOtherIncome?.value === "$0" && netOtherIncome?.ytdValue === "($2,916)") pass("Parent/header and net other income rows preserve QuickBooks Excel values");
  else fail(`Parent or net other income rows wrong: JobExpenses=${jobExpenses?.value}/${jobExpenses?.ytdValue}, NetOther=${netOtherIncome?.value}/${netOtherIncome?.ytdValue}`);
  const excelLikePdfText = await buildFinancialPackagePdfBlob({ normalizedData: quickBooksExcelLikeData, reportPeriod: "May 31, 2026" }).text();
  if (excelLikePdfText.includes("Design income") && excelLikePdfText.includes("Total for Income") && excelLikePdfText.includes("Other Expenses") && excelLikePdfText.includes("Net Other Income")) pass("PDF text includes Excel-style QuickBooks P&L detail rows");
  else fail("PDF text missing Excel-style QuickBooks P&L detail rows");

  const quickBooksAdapterSource = fs.readFileSync("lib/erp-adapters/quickbooks-adapter.js", "utf8");
  if (quickBooksAdapterSource.includes("runProfitAndLossReport") && quickBooksAdapterSource.includes("summarize_column_by") && quickBooksAdapterSource.includes("profitAndLossYtd")) pass("QuickBooks P&L MTD and YTD reports use explicit report endpoint parameters");
  else fail("QuickBooks P&L report fetch does not use explicit detail report endpoint parameters");

  const summaryPdfText = await buildFinancialPackagePdfBlob({ normalizedData: detailedNormalizedData, reportPeriod: "May 31, 2026", incomeStatementDetailLevel: "summary" }).text();
  if (summaryPdfText.includes("Total Income") && !summaryPdfText.includes("Fountains and Garden Lighting")) pass("Summary mode remains condensed");
  else fail("Summary mode did not keep condensed Income Statement behavior");

  if (process.exitCode) {
    console.error("\nIncome Statement YTD PDF verification failed.");
    process.exit(process.exitCode);
  }

  console.log("\nIncome Statement YTD PDF verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
