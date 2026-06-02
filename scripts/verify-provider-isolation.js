/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const unsafeMarkers = [
  "quickbooksReports",
  "qboReports",
  "latestReportData",
  "cachedReports",
  "latestFinancialPackage",
  "lastSuccessfulSync",
  "previousReports",
  "demoReports",
  "sampleReports",
  "company.reports",
  "reportData || fallbackData",
  "normalizedData || quickbooksData",
  "financialData || cachedQuickBooksData",
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

const contextSource = read("lib/integrations/accounting/report-data-context.ts");
for (const marker of [
  "export interface ReportDataContext",
  "assertReportDataContext",
  "Mapping adapter mismatch",
  "Missing accounting connectionId",
  "Missing sourceSystem",
  "Missing normalized financial data",
  "Provider mismatch: context source",
  "assertScheduleSource",
  "assertFallbackMatchesContext",
]) {
  if (contextSource.includes(marker)) pass(`ReportDataContext marker present: ${marker}`);
  else fail(`ReportDataContext marker missing: ${marker}`);
}

const serviceSource = read("lib/integrations/accounting/service.ts");
for (const marker of [
  "buildReportDataContext",
  "getAccountingProviderMappingAdapter",
  "mappingAdapter.normalize",
  "validateReportPreflight",
  "sourceSystem is required when fetching canonical reports.",
  "latest_sync_by_source",
  "accounting_syncs",
  "normalized_payload",
]) {
  if (serviceSource.includes(marker)) pass(`source-isolated sync marker present: ${marker}`);
  else fail(`source-isolated sync marker missing: ${marker}`);
}

const dashboardSource = read("app/dashboard/page.jsx");
for (const marker of [
  "advisacor_active_report_payload",
  "activeReportContext",
  "assertReportDataContext",
  "assertReportPreflight",
  "adapterName",
  "assertReportPayloadSources",
  "Report Source:",
  "Validation Status",
  "Connection ID",
  "Sync ID",
]) {
  if (dashboardSource.includes(marker)) pass(`dashboard isolation marker present: ${marker}`);
  else fail(`dashboard isolation marker missing: ${marker}`);
}

const pdfSource = read("lib/financial-package-pdf.ts");
for (const marker of [
  "reportDataContext",
  "assertReportPreflight",
  "assertScheduleSource",
  "sourceSafeTableRows",
  "normalizedStatementRows",
]) {
  if (pdfSource.includes(marker)) pass(`PDF schedule isolation marker present: ${marker}`);
  else fail(`PDF schedule isolation marker missing: ${marker}`);
}

const searchableFiles = [
  "app/dashboard/page.jsx",
  "app/onboarding/page.tsx",
  "app/api/accounting/fetch-reports/route.js",
  "lib/integrations/accounting/service.ts",
  "lib/financial-package-pdf.ts",
  "lib/pulse-context-engine.js",
];
for (const marker of unsafeMarkers) {
  const offenders = searchableFiles.filter((file) => read(file).includes(marker));
  if (offenders.length) fail(`unsafe fallback marker ${marker} found in ${offenders.join(", ")}`);
  else pass(`unsafe fallback marker absent: ${marker}`);
}

if (process.exitCode) {
  console.error("\nProvider isolation verification failed.");
  process.exit(process.exitCode);
}

console.log("\nProvider isolation verification passed.");
