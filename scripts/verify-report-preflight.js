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
const { validateReportPreflight, assertReportPreflight } = require("../lib/reporting/report-preflight-validation.ts");
const { assertReportDataContext } = require("../lib/integrations/accounting/report-data-context.ts");

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

function source(provider) {
  return { provider, providerFamily: provider, providerProduct: provider, sourceReport: "preflight_fixture" };
}

function adapterName(provider) {
  return provider === "quickbooks" ? "quickBooksAdapter" : provider === "xero" ? "xeroAdapter" : `${provider}Adapter`;
}

function validContext(provider = "quickbooks", connectionId = `${provider}-connection`) {
  const generatedAt = new Date().toISOString();
  const reportPeriod = { startDate: "2026-05-01", endDate: "2026-05-31" };
  const normalizedData = {
    sourceSystem: provider,
    adapterName: adapterName(provider),
    companyId: "company-1",
    connectionId,
    tenantId: `${provider}-tenant`,
    tenantName: `${provider} Tenant`,
    syncId: `${provider}-sync`,
    reportPeriod,
    mappedAt: generatedAt,
    rawReportsPulled: {
      accounts: true,
      trialBalance: true,
      balanceSheet: true,
      incomeStatement: true,
      arAging: false,
      apAging: false,
    },
    syncStatus: "SUCCESS",
    lastSyncedAt: generatedAt,
    normalizedAccounts: [
      { id: "1000", name: "Operating Cash", accountType: "Bank", source: source(provider) },
      { id: "1100", name: "Accounts Receivable", accountType: "Accounts Receivable", source: source(provider) },
      { id: "2000", name: "Accounts Payable", accountType: "Accounts Payable", source: source(provider) },
      { id: "3000", name: "Owner Equity", accountType: "Equity", source: source(provider) },
      { id: "3900", name: "Owner Distributions", accountType: "Equity", source: source(provider) },
      { id: "4000", name: "Revenue", accountType: "Income", source: source(provider) },
      { id: "5000", name: "Expenses", accountType: "Expense", source: source(provider) },
    ],
    normalizedTransactions: [],
    normalizedTrialBalance: [
      { accountId: "1000", accountName: "Operating Cash", debit: 100, credit: 0, netAmount: 100, source: source(provider) },
      { accountId: "1100", accountName: "Accounts Receivable", debit: 50, credit: 0, netAmount: 50, source: source(provider) },
      { accountId: "2000", accountName: "Accounts Payable", debit: 0, credit: 30, netAmount: -30, source: source(provider) },
      { accountId: "3000", accountName: "Owner Equity", debit: 0, credit: 120, netAmount: -120, source: source(provider) },
      { accountId: "3900", accountName: "Owner Distributions", debit: 120, credit: 0, netAmount: 120, source: source(provider) },
      { accountId: "4000", accountName: "Revenue", debit: 0, credit: 200, netAmount: -200, source: source(provider) },
      { accountId: "5000", accountName: "Expenses", debit: 80, credit: 0, netAmount: 80, source: source(provider) },
    ],
    normalizedBalanceSheet: [
      { label: "Cash and Cash Equivalents", amount: 100, section: "Assets", source: source(provider) },
      { label: "Accounts Receivable", amount: 50, section: "Assets", source: source(provider) },
      { label: "Accounts Payable", amount: 30, section: "Liabilities", source: source(provider) },
      { label: "Total Equity", amount: 120, section: "Equity", source: source(provider) },
    ],
    normalizedIncomeStatement: [
      { label: "Revenue", amount: 200, section: "Revenue", source: source(provider) },
      { label: "Expenses", amount: -80, section: "Expenses", source: source(provider) },
      { label: "Net Income", amount: 120, section: "Net Income", source: source(provider) },
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
    connectionId,
    sourceSystem: provider,
    adapterName: adapterName(provider),
    tenantId: `${provider}-tenant`,
    tenantName: `${provider} Tenant`,
    reportPeriod,
    normalizedData,
    validationResult: normalizedData.validation,
    syncId: `${provider}-sync`,
    generatedAt,
  };
}

function emptyXeroContext() {
  const context = validContext("xero", "xero-empty-connection");
  context.normalizedData.normalizedAccounts = [];
  context.normalizedData.normalizedTrialBalance = [];
  context.normalizedData.normalizedBalanceSheet = [
    { label: "Assets", amount: 0, section: "Assets", source: source("xero") },
    { label: "Liabilities", amount: 0, section: "Liabilities", source: source("xero") },
    { label: "Equity", amount: 0, section: "Equity", source: source("xero") },
  ];
  context.normalizedData.normalizedIncomeStatement = [
    { label: "Revenue", amount: 0, section: "Revenue", source: source("xero") },
    { label: "Expenses", amount: 0, section: "Expenses", source: source("xero") },
  ];
  context.normalizedData.validation.warnings = ["Connected to Xero. No financial activity found."];
  return context;
}

function expectPass(name, context, options = {}) {
  const result = validateReportPreflight(context, { requiresLiveData: true, ...options });
  if (result.passed) pass(name);
  else fail(`${name}: ${result.blockers.map((issue) => issue.code).join(", ")}`);
}

function expectBlock(name, context, expectedCode, options = {}) {
  const result = validateReportPreflight(context, { requiresLiveData: true, ...options });
  if (!result.passed && result.blockers.some((issue) => issue.code === expectedCode)) pass(name);
  else fail(`${name}: expected ${expectedCode}, got ${result.blockers.map((issue) => issue.code).join(", ") || "passed"}`);
}

function expectWarning(name, context, expectedCode, options = {}) {
  const result = validateReportPreflight(context, { requiresLiveData: true, ...options });
  if (result.passed && result.warnings.some((issue) => issue.code === expectedCode)) pass(name);
  else fail(`${name}: expected warning ${expectedCode}, blockers=${result.blockers.map((issue) => issue.code).join(", ") || "none"}, warnings=${result.warnings.map((issue) => issue.code).join(", ") || "none"}`);
}

expectPass("Valid QuickBooks report passes", validContext("quickbooks", "qb-connection"));
expectPass("Valid Xero report passes", validContext("xero", "xero-connection"));
expectPass("Empty Xero company passes only as zero/empty Xero report", emptyXeroContext());

const mixed = validContext("xero", "xero-connection");
mixed.normalizedData.sourceSystem = "quickbooks";
expectBlock("Xero selected but QuickBooks data appears is blocked", mixed, "PROVIDER_MISMATCH");

const xeroLegacyLeadIdentity = validContext("xero", "4c1438bb-2d3e-4c91-9f11-222222222222");
xeroLegacyLeadIdentity.tenantId = "xero-demo-tenant";
xeroLegacyLeadIdentity.tenantName = "Demo Company (US)";
xeroLegacyLeadIdentity.normalizedData.connectionId = "lead:xero:Demo Company (US)";
xeroLegacyLeadIdentity.normalizedData.tenantId = "xero-demo-tenant";
xeroLegacyLeadIdentity.normalizedData.tenantName = "Demo Company (US)";
expectPass("Xero UUID and legacy lead identity passes when tenant matches", xeroLegacyLeadIdentity);
try {
  assertReportDataContext(xeroLegacyLeadIdentity);
  pass("ReportDataContext accepts Xero UUID and legacy lead identity when tenant matches");
} catch (error) {
  fail(`ReportDataContext rejected equivalent Xero identity: ${error.message}`);
}

const differentXeroTenant = validContext("xero", "4c1438bb-2d3e-4c91-9f11-333333333333");
differentXeroTenant.tenantId = "xero-demo-tenant-a";
differentXeroTenant.tenantName = "Demo Company A";
differentXeroTenant.normalizedData.connectionId = "lead:xero:Demo Company B";
differentXeroTenant.normalizedData.tenantId = "xero-demo-tenant-b";
differentXeroTenant.normalizedData.tenantName = "Demo Company B";
expectBlock("Different Xero tenants remain blocked", differentXeroTenant, "PROVIDER_MISMATCH");

const badBalanceSheet = validContext();
badBalanceSheet.normalizedData.normalizedBalanceSheet[1].amount = 60;
expectBlock("Balance sheet out of balance is blocked", badBalanceSheet, "BALANCE_SHEET_OUT_OF_BALANCE");

const badTrialBalance = validContext();
badTrialBalance.normalizedData.normalizedTrialBalance[0].debit = 101.5;
expectWarning("Trial balance out of balance creates support warning", badTrialBalance, "TRIAL_BALANCE_OUT_OF_BALANCE");

const badCash = validContext();
badCash.normalizedData.normalizedBalanceSheet[0].amount = 90;
badCash.normalizedData.normalizedBalanceSheet[1].amount = 60;
expectWarning("Cash mismatch creates support warning", badCash, "CASH_SUPPORT_MISMATCH");

const badIncomeStatement = validContext();
badIncomeStatement.normalizedData.normalizedIncomeStatement[2].amount = 90;
expectBlock("Income statement subtotal mismatch is blocked", badIncomeStatement, "INCOME_STATEMENT_SUBTOTAL_MISMATCH");

const missingStatement = validContext();
missingStatement.normalizedData.normalizedBalanceSheet = [];
expectBlock("Missing required statement is blocked", missingStatement, "CORE_STATEMENTS_MISSING");

const stale = validContext();
stale.normalizedData.lastSyncedAt = "2026-01-01T00:00:00.000Z";
expectWarning("Stale sync creates support warning", stale, "STALE_CONTEXT_SUSPECTED");
expectPass("Stale sync passes when explicitly approved", stale, { staleApproved: true });

const unsupportedMapping = validContext();
unsupportedMapping.normalizedData.normalizedIncomeStatement = [];
expectBlock("Unsupported mapping with missing core statement is blocked", unsupportedMapping, "CORE_STATEMENTS_MISSING", { rawSourceDataRetrieved: true });

expectBlock("Unsafe fallback is blocked", validContext("xero", "xero-connection"), "UNSAFE_FALLBACK", {
  fallbackData: { sourceSystem: "quickbooks", connectionId: "qb-connection" },
});

expectBlock("Schedule source mismatch is blocked", validContext("xero", "xero-connection"), "SCHEDULE_SOURCE_MISMATCH", {
  schedules: [{ name: "KPI package", sourceSystem: "quickbooks", connectionId: "qb-connection", syncId: "qb-sync", reportPeriod: { startDate: "2026-05-01", endDate: "2026-05-31" } }],
});

expectWarning("Report period mismatch creates support warning", validContext(), "REPORT_PERIOD_MISMATCH", {
  schedules: [{ name: "Scheduled package", sourceSystem: "quickbooks", connectionId: "quickbooks-connection", syncId: "quickbooks-sync", reportPeriod: { startDate: "2026-04-01", endDate: "2026-04-30" } }],
});

const missingSupport = validContext("xero", "xero-connection");
missingSupport.normalizedData.normalizedAccounts = [];
missingSupport.normalizedData.normalizedTrialBalance = [];
expectWarning("Missing accounts creates support warning", missingSupport, "ACCOUNTS_MISSING");
expectWarning("Missing trial balance creates support warning", missingSupport, "TRIAL_BALANCE_MISSING");

try {
  assertReportPreflight(validContext("quickbooks", "qb-connection"), { requiresLiveData: true });
  assertReportPreflight(validContext("xero", "xero-connection"), { requiresLiveData: true });
  assertReportPreflight(validContext("quickbooks", "qb-connection"), { requiresLiveData: true });
  pass("QuickBooks still generates after Xero is connected and switched back");
} catch (error) {
  fail(`QuickBooks/Xero switching assertion failed: ${error.message}`);
}

for (const [file, markers] of Object.entries({
  "app/dashboard/page.jsx": ["assertReportPreflight", "validateReportPreflight", "Validation Status"],
  "app/onboarding/page.tsx": ["assertReportPreflight", "preflightIssueText"],
  "app/api/accounting/fetch-reports/route.js": ["preflight", "status: 422"],
  "app/api/pulse/ask/route.js": ["assertReportPreflight", "status: 422"],
  "lib/financial-package-pdf.ts": ["assertReportPreflight", "Flux analysis", "Financial package"],
  "lib/background-jobs.js": ["assertBackgroundJobPreflight", "status = 422"],
})) {
  const sourceText = read(file);
  for (const marker of markers) {
    if (sourceText.includes(marker)) pass(`${file} contains ${marker}`);
    else fail(`${file} missing ${marker}`);
  }
}

if (process.exitCode) {
  console.error("\nReport preflight verification failed.");
  process.exit(process.exitCode);
}

console.log("\nReport preflight verification passed.");
