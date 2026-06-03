/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
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

const root = process.cwd();
const { buildFinancialPackageInputFromNormalizedData } = require("../lib/financial-package-pdf.ts");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

const source = {
  provider: "quickbooks",
  providerFamily: "intuit",
  providerProduct: "quickbooks_online",
  externalEntityId: "qbo:test",
  sourceReport: "BalanceSheet",
  raw: {},
};

function sourceWithHierarchy(sourceReport, hierarchyPath, sourceSection = hierarchyPath[hierarchyPath.length - 2] || "") {
  return {
    ...source,
    sourceReport,
    raw: {
      __advisacorHierarchyPath: hierarchyPath,
      __advisacorSourceSection: sourceSection,
    },
  };
}

const normalizedData = {
  sourceSystem: "quickbooks",
  adapterName: "quickBooksAdapter",
  companyId: "company-1",
  connectionId: "connection-1",
  tenantId: "tenant-1",
  tenantName: "QuickBooks Test Company",
  syncId: "sync-1",
  reportPeriod: { startDate: "2025-12-01", endDate: "2025-12-31" },
  mappedAt: new Date().toISOString(),
  rawReportsPulled: { balanceSheet: true, incomeStatement: true },
  syncStatus: "SUCCESS",
  lastSyncedAt: new Date().toISOString(),
  normalizedAccounts: [],
  normalizedTransactions: [],
  normalizedTrialBalance: [],
  normalizedBalanceSheet: [
    { label: "Checking", amount: 1201, section: "Bank Accounts", source },
    { label: "Savings", amount: 800, section: "Bank Accounts", source },
    { label: "Accounts Receivable (A/R)", amount: 5282, section: "Accounts Receivable", source },
    { label: "Inventory Asset", amount: 596, section: "Other Current Assets", source },
    { label: "Undeposited Funds", amount: 2063, section: "Other Current Assets", source },
    { label: "Original Cost", amount: 13495, section: "TRUCK", source },
    { label: "Total Truck", amount: 13495, section: "TRUCK", source },
    { label: "Accounts Payable (A/P)", amount: 1603, section: "Accounts Payable", source },
    { label: "Mastercard", amount: 158, section: "Credit Cards", source },
    { label: "Loan Payable", amount: 4000, section: "Other Current Liabilities", source },
    { label: "Notes Payable", amount: 25000, section: "Long-Term Liabilities", source },
    { label: "Opening Balance Equity", amount: -9337, section: "Equity", source },
    { label: "Retained Earnings", amount: -300, section: "Equity", source },
    { label: "Net Income", amount: 1942, section: "NetIncome", source },
    { label: "Total Assets", amount: 23436, section: "Assets", source },
    { label: "Total Liabilities", amount: 31131, section: "Liabilities", source },
    { label: "Total Equity", amount: -7695, section: "Equity", source },
    { label: "Total Liabilities and Equity", amount: 23436, section: "Equity", source },
  ],
  normalizedIncomeStatement: [
    { label: "Services", amount: 12000, section: "Income", source: sourceWithHierarchy("ProfitAndLoss", ["Income", "Services"], "Income") },
    { label: "Total Income", amount: 12000, section: "Income", source: sourceWithHierarchy("ProfitAndLoss", ["Income", "Total Income"], "Income") },
    { label: "Materials", amount: 4000, section: "Cost of Goods Sold", source: sourceWithHierarchy("ProfitAndLoss", ["Cost of Goods Sold", "Materials"], "Cost of Goods Sold") },
    { label: "Total Cost of Goods Sold", amount: 4000, section: "Cost of Goods Sold", source: sourceWithHierarchy("ProfitAndLoss", ["Cost of Goods Sold", "Total Cost of Goods Sold"], "Cost of Goods Sold") },
    { label: "Gross Profit", amount: 8000, section: "Gross Profit", source: sourceWithHierarchy("ProfitAndLoss", ["Gross Profit"], "Gross Profit") },
    { label: "Rent Expense", amount: 2000, section: "Expenses", source: sourceWithHierarchy("ProfitAndLoss", ["Expenses", "Rent Expense"], "Expenses") },
    { label: "Total Expenses", amount: 2000, section: "Expenses", source: sourceWithHierarchy("ProfitAndLoss", ["Expenses", "Total Expenses"], "Expenses") },
    { label: "Other Income", amount: 100, section: "Other Income", source: sourceWithHierarchy("ProfitAndLoss", ["Other Income"], "Other Income") },
    { label: "Other Expenses", amount: 158, section: "Other Expenses", source: sourceWithHierarchy("ProfitAndLoss", ["Other Expenses"], "Other Expenses") },
    { label: "Net Income", amount: 1942, section: "Net Income", source: sourceWithHierarchy("ProfitAndLoss", ["Net Income"], "Net Income") },
  ],
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

const input = buildFinancialPackageInputFromNormalizedData({ normalizedData });
const labels = input.balanceSheetRows.map((row) => row.label);
const truckMajor = input.balanceSheetRows.find((row) => row.label === "TRUCK" && row.kind === "major");
const creditCardsMajor = input.balanceSheetRows.find((row) => row.label === "Credit Cards" && row.kind === "major");
const fixedAssetsIndex = labels.indexOf("Fixed Assets");
const originalCostIndex = labels.indexOf("Original Cost");
const totalFixedAssetsIndex = labels.indexOf("Total Fixed Assets");
const totalLiabilitiesAndEquityIndex = labels.indexOf("TOTAL LIABILITIES AND EQUITY");
const incomeLabels = input.incomeStatementRows.map((row) => row.label);

function expectOrdered(message, orderedLabels, actualLabels = labels) {
  let cursor = -1;
  for (const label of orderedLabels) {
    const nextIndex = actualLabels.findIndex((actualLabel, index) => index > cursor && actualLabel === label);
    if (nextIndex <= cursor) {
      fail(`${message}: ${label} is missing or out of order`);
      return;
    }
    cursor = nextIndex;
  }
  pass(message);
}

if (!truckMajor) pass("Truck is not rendered as a top-level section");
else fail("Truck is rendered as a top-level section");

if (!creditCardsMajor) pass("Credit Cards is not rendered as a top-level section");
else fail("Credit Cards is rendered as a top-level section");

if (fixedAssetsIndex !== -1 && originalCostIndex > fixedAssetsIndex && totalFixedAssetsIndex > originalCostIndex) {
  pass("Original Cost is grouped under Fixed Assets");
} else {
  fail("Original Cost is not grouped under Fixed Assets");
}

if (totalLiabilitiesAndEquityIndex !== -1) pass("Total Liabilities and Equity remains visible");
else fail("Total Liabilities and Equity missing");

if (labels[labels.length - 1] === "TOTAL LIABILITIES AND EQUITY") pass("Total Liabilities and Equity is the final Balance Sheet row");
else fail(`Total Liabilities and Equity is not final; last row is ${labels[labels.length - 1] || "missing"}`);

expectOrdered("Balance Sheet hierarchy matches accounting classification order", [
  "ASSETS",
  "Current Assets",
  "Bank Accounts",
  "Checking",
  "Savings",
  "Accounts Receivable",
  "Accounts Receivable (A/R)",
  "Other Current Assets",
  "Inventory Asset",
  "Undeposited Funds",
  "Total Current Assets",
  "Fixed Assets",
  "Truck",
  "Original Cost",
  "Total Truck",
  "Total Fixed Assets",
  "TOTAL ASSETS",
  "LIABILITIES AND EQUITY",
  "Liabilities",
  "Current Liabilities",
  "Accounts Payable",
  "Accounts Payable (A/P)",
  "Credit Cards",
  "Mastercard",
  "Other Current Liabilities",
  "Loan Payable",
  "Total Current Liabilities",
  "Long-Term Liabilities",
  "Notes Payable",
  "Total Long-Term Liabilities",
  "Total Liabilities",
  "Equity",
  "Opening Balance Equity",
  "Retained Earnings",
  "Net Income",
  "Total Equity",
  "TOTAL LIABILITIES AND EQUITY",
]);

expectOrdered("Income Statement preserves source hierarchy order", [
  "INCOME",
  "Services",
  "Total Income",
  "COST OF GOODS SOLD",
  "Materials",
  "Total Cost of Goods Sold",
  "GROSS PROFIT",
  "EXPENSES",
  "Rent Expense",
  "Total Expenses",
  "OTHER INCOME",
  "OTHER EXPENSES",
  "NET INCOME",
], incomeLabels);

const compactLabelData = {
  ...normalizedData,
  normalizedBalanceSheet: [
    { label: "Checking", amount: 1201, section: "BankAccounts", source: sourceWithHierarchy("BalanceSheet", ["TotalAssets", "CurrentAssets", "BankAccounts", "Checking"], "BankAccounts") },
    { label: "Savings", amount: 800, section: "BankAccounts", source: sourceWithHierarchy("BalanceSheet", ["TotalAssets", "CurrentAssets", "BankAccounts", "Savings"], "BankAccounts") },
    { label: "TotalBankAccounts", amount: 2001, section: "BankAccounts", source: sourceWithHierarchy("BalanceSheet", ["TotalAssets", "CurrentAssets", "BankAccounts", "TotalBankAccounts"], "BankAccounts") },
    { label: "Accounts Receivable (A/R)", amount: 5282, section: "AR", source: sourceWithHierarchy("BalanceSheet", ["TotalAssets", "CurrentAssets", "AR", "Accounts Receivable (A/R)"], "AR") },
    { label: "TotalAccountsReceivable", amount: 5282, section: "AR", source: sourceWithHierarchy("BalanceSheet", ["TotalAssets", "CurrentAssets", "AR", "TotalAccountsReceivable"], "AR") },
    { label: "TotalCurrentAssets", amount: 7283, section: "CurrentAssets", source: sourceWithHierarchy("BalanceSheet", ["TotalAssets", "CurrentAssets", "TotalCurrentAssets"], "CurrentAssets") },
    { label: "TotalAssets", amount: 7283, section: "TotalAssets", source: sourceWithHierarchy("BalanceSheet", ["TotalAssets"], "TotalAssets") },
    { label: "Accounts Payable (A/P)", amount: 1603, section: "AP", source: sourceWithHierarchy("BalanceSheet", ["TotalLiabilitiesAndEquity", "CurrentLiabilities", "AP", "Accounts Payable (A/P)"], "AP") },
    { label: "TotalAccountsPayable", amount: 1603, section: "AP", source: sourceWithHierarchy("BalanceSheet", ["TotalLiabilitiesAndEquity", "CurrentLiabilities", "AP", "TotalAccountsPayable"], "AP") },
    { label: "TotalCurrentLiabilities", amount: 1603, section: "CurrentLiabilities", source: sourceWithHierarchy("BalanceSheet", ["TotalLiabilitiesAndEquity", "CurrentLiabilities", "TotalCurrentLiabilities"], "CurrentLiabilities") },
    { label: "NetIncome", amount: 5680, section: "Equity", source: sourceWithHierarchy("BalanceSheet", ["TotalLiabilitiesAndEquity", "Equity", "NetIncome"], "Equity") },
    { label: "TotalEquity", amount: 5680, section: "Equity", source: sourceWithHierarchy("BalanceSheet", ["TotalLiabilitiesAndEquity", "Equity", "TotalEquity"], "Equity") },
    { label: "TotalLiabilitiesAndEquity", amount: 7283, section: "TotalLiabilitiesAndEquity", source: sourceWithHierarchy("BalanceSheet", ["TotalLiabilitiesAndEquity"], "TotalLiabilitiesAndEquity") },
  ],
};
const compactLabels = buildFinancialPackageInputFromNormalizedData({ normalizedData: compactLabelData }).balanceSheetRows.map((row) => row.label);
for (const badLabel of ["TotalAssets", "CurrentAssets", "BankAccounts", "TotalLiabilitiesAndEquity", "CurrentLiabilities", "NetIncome"]) {
  if (compactLabels.includes(badLabel)) fail(`Compact Balance Sheet label was not humanized: ${badLabel}`);
}
expectOrdered("Compact QuickBooks Balance Sheet labels are rendered with readable spacing", [
  "ASSETS",
  "Current Assets",
  "Bank Accounts",
  "Total Bank Accounts",
  "Total Current Assets",
  "TOTAL ASSETS",
  "LIABILITIES AND EQUITY",
  "Liabilities",
  "Current Liabilities",
  "AP",
  "Accounts Payable (A/P)",
  "Total Accounts Payable",
  "Total Current Liabilities",
  "Equity",
  "Net Income",
  "Total Equity",
  "TOTAL LIABILITIES AND EQUITY",
], compactLabels);
if (compactLabels[compactLabels.length - 1] === "TOTAL LIABILITIES AND EQUITY") pass("Compact QuickBooks Balance Sheet final row is Total Liabilities and Equity");
else fail(`Compact QuickBooks Balance Sheet final row is ${compactLabels[compactLabels.length - 1] || "missing"}`);

const xeroLiabilityBankData = {
  ...normalizedData,
  sourceSystem: "xero",
  normalizedBalanceSheet: [
    { label: "Checking Account", amount: 4569.98, section: "Current Liabilities", source: { ...sourceWithHierarchy("BalanceSheet", ["Liabilities and Equity", "Current Liabilities", "Checking Account"], "Current Liabilities"), provider: "xero" } },
    { label: "Total Current Liabilities", amount: 4569.98, section: "Current Liabilities", source: { ...sourceWithHierarchy("BalanceSheet", ["Liabilities and Equity", "Current Liabilities", "Total Current Liabilities"], "Current Liabilities"), provider: "xero" } },
    { label: "Total Liabilities", amount: 4569.98, section: "Liabilities", source: { ...sourceWithHierarchy("BalanceSheet", ["Liabilities and Equity", "Total Liabilities"], "Liabilities"), provider: "xero" } },
    { label: "Total Liabilities and Equity", amount: 4569.98, section: "Liabilities and Equity", source: { ...sourceWithHierarchy("BalanceSheet", ["Liabilities and Equity", "Total Liabilities and Equity"], "Liabilities and Equity"), provider: "xero" } },
  ],
};
const xeroLiabilityBankInput = buildFinancialPackageInputFromNormalizedData({ normalizedData: xeroLiabilityBankData });
const xeroLiabilityLabels = xeroLiabilityBankInput.balanceSheetRows.map((row) => row.label);
if (xeroLiabilityLabels.indexOf("Checking Account") > xeroLiabilityLabels.indexOf("Current Liabilities") && xeroLiabilityLabels.indexOf("Checking Account") < xeroLiabilityLabels.indexOf("Total Current Liabilities")) {
  pass("Source-classified negative bank account remains under Current Liabilities");
} else {
  fail("Source-classified negative bank account was reclassified away from Current Liabilities");
}

if (Math.round(input.totalAssets) === Math.round(input.totalLiabilities + input.totalEquity)) {
  pass("Balance Sheet totals tie after regrouping");
} else {
  fail("Balance Sheet totals do not tie after regrouping");
}

const pdfSource = read("lib/financial-package-pdf.ts");
if (pdfSource.includes("splitStatementRowsForPagination") && pdfSource.includes("maxRowsPerPage = 31")) {
  pass("Financial statement pagination guard is present");
} else {
  fail("Financial statement pagination guard is missing");
}

if (process.exitCode) {
  console.error("\nBalance Sheet PDF layout verification failed.");
  process.exit(process.exitCode);
}

console.log("\nBalance Sheet PDF layout verification passed.");
