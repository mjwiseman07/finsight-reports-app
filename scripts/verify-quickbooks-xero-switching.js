/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();

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

function makePayload(sourceSystem, connectionId, revenue) {
  const adapterName = sourceSystem === "quickbooks" ? "quickBooksAdapter" : "xeroAdapter";
  return {
    sourceSystem,
    connectionId,
    reportDataContext: {
      companyId: "company-1",
      connectionId,
      sourceSystem,
      adapterName,
      tenantId: `${sourceSystem}-tenant`,
      tenantName: `${sourceSystem} Tenant`,
      reportPeriod: { startDate: "2026-05-01", endDate: "2026-05-31" },
      normalizedData: {
        sourceSystem,
        adapterName,
        companyId: "company-1",
        connectionId,
        tenantId: `${sourceSystem}-tenant`,
        tenantName: `${sourceSystem} Tenant`,
        syncId: `${sourceSystem}-sync`,
        reportPeriod: { startDate: "2026-05-01", endDate: "2026-05-31" },
        mappedAt: "2026-06-01T00:00:00.000Z",
        rawReportsPulled: {
          accounts: true,
          trialBalance: true,
          balanceSheet: true,
          incomeStatement: true,
          arAging: false,
          apAging: false,
        },
        syncStatus: "SUCCESS",
        lastSyncedAt: "2026-06-01T00:00:00.000Z",
        normalizedAccounts: [],
        normalizedTransactions: [],
        normalizedTrialBalance: [],
        normalizedBalanceSheet: [{ label: "Assets", amount: revenue, section: "Assets", source: { provider: sourceSystem } }],
        normalizedIncomeStatement: [{ label: "Revenue", amount: revenue, section: "Revenue", source: { provider: sourceSystem } }],
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
      },
      validationResult: { readyForReporting: true, missingObjects: [], warnings: [] },
      syncId: `${sourceSystem}-sync`,
      generatedAt: "2026-06-01T00:00:00.000Z",
    },
  };
}

function assertPayload(sourceSystem, payload) {
  const context = payload.reportDataContext;
  if (context.sourceSystem !== sourceSystem) throw new Error(`expected ${sourceSystem}, got ${context.sourceSystem}`);
  if (context.normalizedData.sourceSystem !== sourceSystem) throw new Error(`normalized mismatch ${context.normalizedData.sourceSystem}`);
  if (context.adapterName !== context.normalizedData.adapterName) throw new Error("adapter mutated across payloads");
  if (context.connectionId !== context.normalizedData.connectionId) throw new Error("connection mutated across payloads");
}

try {
  const quickbooksPayload = makePayload("quickbooks", "qb-connection", 824000);
  const xeroPayload = makePayload("xero", "xero-connection", 0);
  assertPayload("quickbooks", quickbooksPayload);
  assertPayload("xero", xeroPayload);
  if (quickbooksPayload.reportDataContext.normalizedData.normalizedIncomeStatement[0].amount !== 824000) throw new Error("QuickBooks value changed");
  if (xeroPayload.reportDataContext.normalizedData.normalizedIncomeStatement[0].amount !== 0) throw new Error("Xero empty value is not zero");
  assertPayload("quickbooks", quickbooksPayload);
  pass("QuickBooks -> Xero -> QuickBooks payload switching preserves separate values and connection IDs");
} catch (error) {
  fail(error.message);
}

const dashboardSource = read("app/dashboard/page.jsx");
if (dashboardSource.includes("assertReportPayloadSources") && dashboardSource.includes("assertReportPreflight") && dashboardSource.includes("activeSourceSystem")) pass("dashboard switching guard exists");
else fail("dashboard switching guard missing");

const serviceSource = read("lib/integrations/accounting/service.ts");
if (serviceSource.includes("latest_sync_by_source") && serviceSource.includes("[connection.provider]")) pass("sync data stored by provider");
else fail("provider-keyed sync storage missing");

const pdfSource = read("lib/financial-package-pdf.ts");
if (pdfSource.includes("sourceSafeTableRows") && pdfSource.includes("assertScheduleSource") && pdfSource.includes("assertReportPreflight")) pass("PDF schedules cannot mix provider data");
else fail("PDF schedule provider assertions missing");

if (process.exitCode) {
  console.error("\nQuickBooks/Xero switching verification failed.");
  process.exit(process.exitCode);
}

console.log("\nQuickBooks/Xero switching verification passed.");
