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

const { buildFinancialPackageInputFromNormalizedData } = require("../lib/financial-package-pdf.ts");

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function source(provider) {
  return { provider, providerFamily: provider, providerProduct: provider, sourceReport: "pdf_handoff_fixture" };
}

function context(provider, totals) {
  const adapterName = provider === "quickbooks" ? "quickBooksAdapter" : "xeroAdapter";
  const reportPeriod = { startDate: "2026-05-01", endDate: "2026-05-31" };
  const normalizedData = {
    sourceSystem: provider,
    adapterName,
    companyId: "company-1",
    connectionId: `${provider}-connection`,
    tenantId: `${provider}-tenant`,
    tenantName: `${provider} Tenant`,
    syncId: `${provider}-sync`,
    reportPeriod,
    mappedAt: "2026-06-01T00:00:00.000Z",
    rawReportsPulled: { accounts: true, trialBalance: true, balanceSheet: true, incomeStatement: true },
    syncStatus: "SUCCESS",
    lastSyncedAt: "2026-06-01T00:00:00.000Z",
    normalizedAccounts: [],
    normalizedTransactions: [],
    normalizedTrialBalance: [],
    normalizedBalanceSheet: [
      { label: "Cash", amount: totals.cashBalance, section: "Assets", source: source(provider) },
      { label: "Total Assets", amount: totals.totalAssets, section: "Assets", source: source(provider) },
      { label: "Total Liabilities", amount: totals.totalLiabilities, section: "Liabilities", source: source(provider) },
      { label: "Total Equity", amount: totals.totalEquity, section: "Equity", source: source(provider) },
    ],
    normalizedIncomeStatement: [
      { label: "Total Revenue", amount: totals.revenue, section: "Revenue", source: source(provider) },
      { label: "Total Expenses", amount: totals.expenses, section: "Expenses", source: source(provider) },
      { label: "Net Income", amount: totals.netIncome, section: "Net Income", source: source(provider) },
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
  return {
    companyId: "company-1",
    connectionId: `${provider}-connection`,
    sourceSystem: provider,
    adapterName,
    tenantId: `${provider}-tenant`,
    tenantName: `${provider} Tenant`,
    reportPeriod,
    normalizedData,
    validationResult: normalizedData.validation,
    syncId: `${provider}-sync`,
    generatedAt: "2026-06-01T00:00:00.000Z",
  };
}

function assertInput(provider, totals) {
  const input = buildFinancialPackageInputFromNormalizedData(context(provider, totals));
  for (const [field, value] of Object.entries(totals)) {
    if (input[field] === value) pass(`${provider} PDF input ${field} populated`);
    else fail(`${provider} PDF input ${field}: expected ${value}, got ${input[field]}`);
  }
  if (input.sourceSystem === provider) pass(`${provider} PDF input sourceSystem preserved`);
  else fail(`${provider} PDF input sourceSystem mismatch`);
  if (input.balanceSheetRowsCount > 0 && input.incomeStatementRowsCount > 0) pass(`${provider} normalized rows reach PDF input`);
  else fail(`${provider} normalized rows missing from PDF input`);
  const fieldNames = ["sourceSystem", "connectionId", "tenantName", "totalAssets", "totalLiabilities", "totalEquity", "revenue", "expenses", "netIncome", "cashBalance", "balanceSheetRowsCount", "incomeStatementRowsCount"];
  if (fieldNames.every((field) => Object.prototype.hasOwnProperty.call(input, field))) pass(`${provider} PDF renderer receives common field names`);
  else fail(`${provider} PDF renderer common field names missing`);
}

const provider = process.argv.includes("--provider") ? process.argv[process.argv.indexOf("--provider") + 1] : "both";
const totals = {
  totalAssets: 162000,
  totalLiabilities: 38000,
  totalEquity: 124000,
  revenue: 180000,
  expenses: -72000,
  netIncome: 108000,
  cashBalance: 98000,
};

if (provider === "both" || provider === "quickbooks") assertInput("quickbooks", totals);
if (provider === "both" || provider === "xero") assertInput("xero", totals);

if (process.exitCode) {
  console.error("\nPDF package input verification failed.");
  process.exit(process.exitCode);
}

console.log("\nPDF package input verification passed.");
