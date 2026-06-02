/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const requiredFiles = [
  "lib/integrations/accounting/advisacor-data-model.ts",
  "lib/integrations/accounting/provider-adapters.ts",
  "lib/integrations/accounting/report-data-context.ts",
  "lib/integrations/accounting/types.ts",
  "lib/integrations/accounting/service.ts",
  "lib/integrations/accounting/registry.ts",
];

const requiredNormalizedFields = [
  "sourceSystem",
  "adapterName",
  "companyId",
  "connectionId",
  "tenantId",
  "tenantName",
  "syncId",
  "reportPeriod",
  "mappedAt",
  "rawReportsPulled",
  "syncStatus",
  "lastSyncedAt",
  "normalizedAccounts",
  "normalizedTransactions",
  "normalizedTrialBalance",
  "normalizedBalanceSheet",
  "normalizedIncomeStatement",
  "normalizedARAging",
  "normalizedAPAging",
  "normalizedBudgets",
  "normalizedDepartments",
  "normalizedLocations",
  "normalizedClasses",
  "normalizedProjects",
  "normalizedVendors",
  "normalizedCustomers",
];

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

for (const file of requiredFiles) {
  if (fs.existsSync(path.join(root, file))) pass(`required file exists: ${file}`);
  else fail(`required file missing: ${file}`);
}

const typesSource = read("lib/integrations/accounting/types.ts");
for (const field of requiredNormalizedFields) {
  if (typesSource.includes(`${field}:`)) pass(`normalized model field present: ${field}`);
  else fail(`normalized model field missing: ${field}`);
}

const dataModelSource = read("lib/integrations/accounting/advisacor-data-model.ts");
if (dataModelSource.includes("buildAdvisacorNormalizedFinancialData")) pass("builder creates normalized Advisacor financial data");
else fail("builder is missing");

if (dataModelSource.includes("validateAdvisacorNormalizedFinancialData")) pass("validation function exists");
else fail("validation function is missing");

if (dataModelSource.includes("assertReadyForSourceAgnosticOutputs")) pass("reporting readiness assertion exists");
else fail("reporting readiness assertion is missing");

const serviceSource = read("lib/integrations/accounting/service.ts");
if (serviceSource.includes("getAccountingProviderMappingAdapter") && serviceSource.includes("mappingAdapter.normalize")) pass("accounting service builds normalized data through selected mapping adapter");
else fail("accounting service does not build normalized data through selected mapping adapter");

const mappingAdapterSource = read("lib/integrations/accounting/provider-adapters.ts");
for (const marker of ["accountingProviderAdapters", "quickBooksAdapter", "xeroAdapter", "fetchRawReports", "normalize", "Provider adapter mismatch", "Mapping adapter mismatch"]) {
  if (mappingAdapterSource.includes(marker)) pass(`provider mapping adapter marker present: ${marker}`);
  else fail(`provider mapping adapter marker missing: ${marker}`);
}

if (serviceSource.includes("assertReadyForSourceAgnosticOutputs")) pass("accounting service validates normalized data before downstream reporting");
else fail("accounting service does not validate normalized data");

if (serviceSource.includes("assertProviderMatchesSelectedProvider")) pass("selected-provider mismatch guard exists");
else fail("selected-provider mismatch guard is missing");

if (serviceSource.includes("sourceSystem is required when fetching canonical reports.")) pass("canonical report fetch requires explicit sourceSystem");
else fail("canonical report fetch can run without explicit sourceSystem");

if (serviceSource.includes("Provider mismatch: active") && serviceSource.includes("normalized data is")) pass("canonical report fetch rejects active/normalized provider mismatch");
else fail("canonical report fetch provider mismatch guard is missing");

if (serviceSource.includes("buildSyncDiagnostics")) pass("sync diagnostics are built after normalized sync");
else fail("sync diagnostics builder is missing");

if (serviceSource.includes("buildReportDataContext")) pass("accounting service builds ReportDataContext");
else fail("accounting service does not build ReportDataContext");

if (serviceSource.includes("latest_sync_by_source") && serviceSource.includes("accounting_syncs")) pass("sync data is stored by source and connection");
else fail("sync data is not stored by source and connection");

for (const marker of ["sourceSystem", "tenantName", "accountsCount", "trialBalanceCount", "balanceSheetCount", "incomeStatementCount"]) {
  if (serviceSource.includes(marker) && typesSource.includes(marker)) pass(`sync diagnostic field present: ${marker}`);
  else fail(`sync diagnostic field missing: ${marker}`);
}

const registrySource = read("lib/integrations/accounting/registry.ts");
for (const provider of ["quickbooks", "xero", "sage", "netsuite", "dynamics365"]) {
  if (registrySource.includes(`${provider}:`)) pass(`provider registered: ${provider}`);
  else fail(`provider not registered: ${provider}`);
}

if (dataModelSource.includes("buildEmptyXeroBalanceSheetRows") && dataModelSource.includes("buildEmptyXeroIncomeStatementRows")) pass("empty Xero financial activity creates zero-value normalized statements");
else fail("empty Xero financial activity handling is missing");

if (dataModelSource.includes("Connected to Xero. No financial activity found.")) pass("empty Xero financial activity message exists");
else fail("empty Xero financial activity message is missing");

const xeroSource = read("lib/integrations/accounting/providers/xero.ts");
if (xeroSource.includes("Selected Xero organization was not found for this connection.")) pass("Xero organization selection is strict");
else fail("Xero organization selection can silently fall back");

if (xeroSource.includes("selectedEntityFromConnection")) pass("Xero sync uses persisted selected organization");
else fail("Xero sync does not use persisted selected organization");

for (const marker of [
  "flattenXeroReportRows",
  "getXeroTrialBalance",
  "getAgingReport",
  "getBudgetSummary",
  "getTrackingDimensions",
  "getContacts",
  "getTransactions",
  "bundle.normalizedTransactions",
  "bundle.normalizedARAging",
  "bundle.normalizedAPAging",
  "bundle.normalizedBudgets",
  "bundle.normalizedDepartments",
  "bundle.normalizedLocations",
  "bundle.normalizedClasses",
  "bundle.normalizedProjects",
  "bundle.normalizedVendors",
  "bundle.normalizedCustomers",
]) {
  if (xeroSource.includes(marker)) pass(`Xero adapter normalized mapping present: ${marker}`);
  else fail(`Xero adapter normalized mapping missing: ${marker}`);
}

const downstreamFiles = [
  "app/api/accounting/fetch-reports/route.js",
  "lib/financial-package-pdf.ts",
  "lib/pulse-context-engine.js",
  "app/dashboard/page.jsx",
];

for (const file of downstreamFiles) {
  const source = read(file);
  if (/quickbooks[_-]?specific|qbo-only|QuickBooks-only/i.test(source)) fail(`provider-specific downstream marker found: ${file}`);
  else pass(`no provider-specific downstream marker found: ${file}`);
}

const dashboardSource = read("app/dashboard/page.jsx");
if (dashboardSource.includes("assertSingleSourcePayload")) pass("dashboard package generation has source guard");
else fail("dashboard package generation source guard is missing");

if (dashboardSource.includes("assertReportPayloadSources")) pass("generated report payload source scan exists");
else fail("generated report payload source scan is missing");

if (dashboardSource.includes("advisacor_active_report_payload")) pass("dashboard consumes active report source payload");
else fail("dashboard does not consume active report source payload");

const pdfSource = read("lib/financial-package-pdf.ts");
if (pdfSource.includes("normalizedStatementRows") && pdfSource.includes("options.normalizedData")) pass("PDF statements consume normalized source data");
else fail("PDF statements do not consume normalized source data");

if (pdfSource.includes("assertScheduleSource") && pdfSource.includes("sourceSafeTableRows")) pass("PDF schedules enforce provider source");
else fail("PDF schedules do not enforce provider source");

const reportContextSource = read("lib/integrations/accounting/report-data-context.ts");
for (const marker of ["ReportDataContext", "assertReportDataContext", "assertScheduleSource", "assertFallbackMatchesContext"]) {
  if (reportContextSource.includes(marker)) pass(`ReportDataContext marker present: ${marker}`);
  else fail(`ReportDataContext marker missing: ${marker}`);
}

if (process.exitCode) {
  console.error("\nAccounting data engine verification failed.");
  process.exit(process.exitCode);
}

console.log("\nAccounting data engine verification passed.");
