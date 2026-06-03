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

const {
  availabilityFromNormalizedData,
  notAvailableSchedule,
  QUICKBOOKS_SUPPORTING_REPORTS,
  XERO_SUPPORTING_REPORTS,
} = require("../lib/accounting/supporting-schedules/fetchSupportingSchedules.ts");
const { buildScheduleDiagnostics, fixedAssetSchedule, inventoryAnalysis, payrollFteAnalysis } = require("../lib/accounting/supporting-schedules/scheduleDiagnostics.ts");
const { validateReportPreflight } = require("../lib/reporting/report-preflight-validation.ts");
const { buildFinancialPackagePdfBlob } = require("../lib/financial-package-pdf.ts");
const onboardingSource = fs.readFileSync("app/onboarding/page.tsx", "utf8");
const accountingServiceSource = fs.readFileSync("lib/integrations/accounting/service.ts", "utf8");
const quickBooksAdapterSource = fs.readFileSync("lib/erp-adapters/quickbooks-adapter.js", "utf8");

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function source(provider) {
  return { provider, providerFamily: provider, providerProduct: provider, sourceReport: "supporting_schedule_fixture" };
}

function entity(provider, name, amount = 1) {
  return { id: `${provider}:${name}`, name, type: name, amount, balance: amount, source: source(provider) };
}

function normalized(provider, overrides = {}) {
  const reportPeriod = { startDate: "2026-05-01", endDate: "2026-05-31" };
  return {
    sourceSystem: provider,
    adapterName: provider === "quickbooks" ? "quickBooksAdapter" : "xeroAdapter",
    companyId: `${provider}-company`,
    connectionId: `${provider}-connection`,
    tenantId: `${provider}-tenant`,
    tenantName: `${provider} Tenant`,
    syncId: `${provider}-sync`,
    reportPeriod,
    mappedAt: new Date().toISOString(),
    rawReportsPulled: { accounts: true, trialBalance: true, balanceSheet: true, incomeStatement: true, arAging: true, apAging: true },
    syncStatus: "SUCCESS",
    lastSyncedAt: new Date().toISOString(),
    normalizedAccounts: [entity(provider, "Operating Cash")],
    normalizedTransactions: [entity(provider, "Inventory Valuation", 15)],
    normalizedTrialBalance: [
      { accountId: "1000", accountName: "Operating Cash", debit: 100, credit: 0, netAmount: 100, source: source(provider) },
      { accountId: "3000", accountName: "Owner Equity", debit: 0, credit: 100, netAmount: -100, source: source(provider) },
    ],
    normalizedBalanceSheet: [
      { label: "Cash", amount: 100, section: "Assets", source: source(provider) },
      { label: "Total Equity", amount: 100, section: "Equity", source: source(provider) },
    ],
    normalizedIncomeStatement: [
      { label: "Revenue", amount: 100, section: "Revenue", source: source(provider) },
      { label: "Net Income", amount: 100, section: "Net Income", source: source(provider) },
    ],
    normalizedARAging: [entity(provider, "AR Aging", 25)],
    normalizedAPAging: [entity(provider, "AP Aging", 35)],
    normalizedBudgets: [entity(provider, "Budget", 45)],
    normalizedDepartments: [entity(provider, "Department")],
    normalizedLocations: [entity(provider, "Location")],
    normalizedClasses: [entity(provider, "Class")],
    normalizedProjects: [entity(provider, "Project")],
    normalizedVendors: [],
    normalizedCustomers: [],
    validation: { readyForReporting: true, missingObjects: [], warnings: [] },
    ...overrides,
  };
}

function context(data) {
  return {
    companyId: data.companyId,
    connectionId: data.connectionId,
    sourceSystem: data.sourceSystem,
    adapterName: data.adapterName,
    tenantId: data.tenantId,
    tenantName: data.tenantName,
    reportPeriod: data.reportPeriod,
    normalizedData: data,
    validationResult: data.validation,
    syncId: data.syncId,
    generatedAt: data.mappedAt,
  };
}

function statusFor(rows, reportName) {
  return rows.find((row) => row.reportName === reportName)?.status;
}

const qbAvailability = availabilityFromNormalizedData(normalized("quickbooks"));
if (statusFor(qbAvailability, "AR Aging") === "available") pass("QuickBooks AR aging available");
else fail("QuickBooks AR aging was not available");
if (statusFor(qbAvailability, "AP Aging") === "available") pass("QuickBooks AP aging available");
else fail("QuickBooks AP aging was not available");
if (statusFor(qbAvailability, "Budget") === "available") pass("QuickBooks budget availability is reported");
else fail("QuickBooks budget availability was not reported");
if (QUICKBOOKS_SUPPORTING_REPORTS.arAging.includes("AccountsReceivableAgingSummary") && QUICKBOOKS_SUPPORTING_REPORTS.apAging.includes("AccountsPayableAgingSummary") && QUICKBOOKS_SUPPORTING_REPORTS.inventory.includes("InventoryValuationSummary")) pass("QuickBooks supported report names include AR/AP aging and inventory valuation");
else fail("QuickBooks supported report names are incomplete");

const xeroAvailability = availabilityFromNormalizedData(normalized("xero"));
if (statusFor(xeroAvailability, "AR Aging") === "available") pass("Xero AR aging available");
else fail("Xero AR aging was not available");
if (statusFor(xeroAvailability, "AP Aging") === "available") pass("Xero AP aging available");
else fail("Xero AP aging was not available");
if (XERO_SUPPORTING_REPORTS.arAging.includes("Reports/AgedReceivablesByContact") && XERO_SUPPORTING_REPORTS.apAging.includes("Reports/AgedPayablesByContact")) pass("Xero uses Xero-specific AR/AP aging report names");
else fail("Xero AR/AP aging report names are incomplete");

const missingOptional = normalized("xero", {
  normalizedARAging: notAvailableSchedule("xero", "Aged Receivables"),
  normalizedAPAging: notAvailableSchedule("xero", "Aged Payables"),
  normalizedBudgets: notAvailableSchedule("xero", "Budget Summary"),
});
const missingOptionalResult = validateReportPreflight(context(missingOptional), { requiresLiveData: true });
if (missingOptionalResult.passed && ["AR_AGING_MISSING", "AP_AGING_MISSING", "BUDGET_MISSING"].every((code) => missingOptionalResult.warnings.some((issue) => issue.code === code))) pass("Optional schedules missing without blocking PDF");
else fail("Optional missing schedules blocked PDF or did not warn cleanly");
if (missingOptionalResult.warnings.every((issue) => !/support ticket/i.test(issue.message))) pass("Missing optional schedule does not create support ticket wording");
else fail("Missing optional schedule still creates support ticket wording");

const xeroUnavailableAgingWithControlBalances = normalized("xero", {
  normalizedBalanceSheet: [
    { label: "Accounts Receivable", amount: 9172.63, section: "Current Assets", source: source("xero") },
    { label: "Accounts Payable", amount: 10703.19, section: "Current Liabilities", source: source("xero") },
    { label: "Total Assets", amount: 9172.63, section: "Assets", source: source("xero") },
    { label: "Total Liabilities", amount: 10703.19, section: "Liabilities", source: source("xero") },
    { label: "Total Equity", amount: -1530.56, section: "Equity", source: source("xero") },
    { label: "Total Liabilities and Equity", amount: 9172.63, section: "Equity", source: source("xero") },
  ],
  normalizedARAging: notAvailableSchedule("xero", "Aged Receivables"),
  normalizedAPAging: notAvailableSchedule("xero", "Aged Payables"),
});
const xeroUnavailableAgingResult = validateReportPreflight(context(xeroUnavailableAgingWithControlBalances), { requiresLiveData: true });
if (xeroUnavailableAgingResult.passed && !xeroUnavailableAgingResult.blockers.some((issue) => issue.code === "SCHEDULE_POPULATION_FAILURE")) pass("Xero unavailable AR/AP aging does not block when Balance Sheet control balances exist");
else fail("Xero unavailable AR/AP aging incorrectly blocked package generation");

const missingRequired = normalized("quickbooks", { normalizedBalanceSheet: [] });
const missingRequiredResult = validateReportPreflight(context(missingRequired), { requiresLiveData: true });
if (!missingRequiredResult.passed && missingRequiredResult.blockers.some((issue) => issue.code === "CORE_STATEMENTS_MISSING")) pass("Required Balance Sheet missing blocks PDF");
else fail("Required Balance Sheet missing did not block PDF");

const missingCashSupport = normalized("quickbooks", { normalizedAccounts: [], normalizedTrialBalance: [] });
const missingCashResult = validateReportPreflight(context(missingCashSupport), { requiresLiveData: true });
if (missingCashResult.passed && !missingCashResult.warnings.some((issue) => issue.code === "CASH_SUPPORT_MISMATCH")) pass("Cash support mismatch is skipped when support schedule is unavailable");
else fail("Cash support mismatch was not skipped when support schedule is unavailable");

if (
  onboardingSource.includes("response.status === 404 && provider !== \"xero\" && connectionId") &&
  accountingServiceSource.includes("if (!connection && connectionId && sourceSystem)")
) {
  pass("QuickBooks onboarding active context retries latest provider connection when stale connection id is used");
} else {
  fail("QuickBooks onboarding active context stale connection retry is missing");
}

if (
  quickBooksAdapterSource.includes("for (const [key, requestReport] of Object.entries(reportRequests))") &&
  quickBooksAdapterSource.includes("await delay(150)") &&
  quickBooksAdapterSource.includes("const companyProfile = await this.getCompanyProfile(accessToken, realmId).catch")
) {
  pass("QuickBooks supporting report fetches are sequential and company profile rate limits are non-fatal");
} else {
  fail("QuickBooks supporting report fetches are not rate-limit safe");
}

const populatedSchedules = normalized("xero", {
  normalizedBalanceSheet: [
    { label: "Accounts Receivable", amount: 100, section: "Current Assets", source: source("xero") },
    { label: "Accounts Payable", amount: 80, section: "Current Liabilities", source: source("xero") },
    { label: "Inventory Asset", amount: 55, section: "Current Assets", source: source("xero") },
    { label: "Truck", amount: 250, section: "Fixed Assets", source: source("xero") },
    { label: "Equipment", amount: 150, section: "Fixed Assets", source: source("xero") },
    { label: "Accumulated Depreciation", amount: -40, section: "Fixed Assets", source: source("xero") },
    { label: "Total Current Assets", amount: 155, section: "Current Assets", source: source("xero") },
    { label: "Total Current Liabilities", amount: 80, section: "Current Liabilities", source: source("xero") },
    { label: "Total Assets", amount: 555, section: "Assets", source: source("xero") },
    { label: "Total Liabilities", amount: 80, section: "Liabilities", source: source("xero") },
    { label: "Total Equity", amount: 475, section: "Equity", source: source("xero") },
    { label: "Total Liabilities and Equity", amount: 555, section: "Equity", source: source("xero") },
  ],
  normalizedARAging: [
    entity("xero", "Current", 50),
    entity("xero", "1-30 Days", 20),
    entity("xero", "31-60 Days", 15),
    entity("xero", "61-90 Days", 10),
    entity("xero", "90+ Days", 5),
  ],
  normalizedAPAging: [
    entity("xero", "Current", 40),
    entity("xero", "1-30 Days", 20),
    entity("xero", "31-60 Days", 10),
    entity("xero", "61-90 Days", 5),
    entity("xero", "90+ Days", 5),
  ],
  normalizedTransactions: [],
});

const diagnostics = buildScheduleDiagnostics(populatedSchedules);
if (
  diagnostics.schedules.find((row) => row.name === "AR Aging")?.totalAmount === 100 &&
  diagnostics.schedules.find((row) => row.name === "AP Aging")?.totalAmount === 80 &&
  diagnostics.schedules.find((row) => row.name === "Inventory Analysis")?.totalAmount === 55 &&
  diagnostics.schedules.find((row) => row.name === "Fixed Asset Analysis")?.totalAmount === 360
) {
  pass("Schedule diagnostics populate AR/AP, inventory, fixed assets, and PDF payload totals");
} else {
  fail("Schedule diagnostics did not populate expected schedule totals");
}

buildFinancialPackagePdfBlob({ normalizedData: populatedSchedules, reportPeriod: "May 31, 2026" }).text().then(async (pdfText) => {
  if (pdfText.includes("$55") && pdfText.includes("$360") && pdfText.includes("$100") && pdfText.includes("$80")) pass("PDF package schedule pages use populated schedule values instead of zeros");
  else fail("PDF package schedule pages did not include populated schedule values");

  const brokenScheduleData = normalized("xero", {
    normalizedBalanceSheet: [
      { label: "Accounts Receivable", amount: 100, section: "Current Assets", source: source("xero") },
      { label: "Total Assets", amount: 100, section: "Assets", source: source("xero") },
      { label: "Total Equity", amount: 100, section: "Equity", source: source("xero") },
    ],
    normalizedARAging: [],
  });
  const scheduleFailure = validateReportPreflight(context(brokenScheduleData), { requiresLiveData: true });
  if (!scheduleFailure.passed && scheduleFailure.blockers.some((issue) => issue.code === "SCHEDULE_POPULATION_FAILURE")) pass("Schedule population failure blocks silent zero schedule rendering");
  else fail("Schedule population failure did not block silent zero schedule rendering");

  const quickBooksInventoryDemo = normalized("quickbooks", {
    normalizedBalanceSheet: [
      { label: "Inventory Asset", amount: 596.25, section: "Current Assets", source: source("quickbooks") },
      { label: "Total Assets", amount: 596.25, section: "Assets", source: source("quickbooks") },
      { label: "Total Equity", amount: 596.25, section: "Equity", source: source("quickbooks") },
      { label: "Total Liabilities and Equity", amount: 596.25, section: "Equity", source: source("quickbooks") },
    ],
    normalizedTransactions: [
      { id: "qb:inventory:pump", name: "Pump", type: "InventoryValuationSummary", amount: 250, balance: 250, metadata: { source_system: "quickbooks", inventoryQuantity: 25, inventoryUnitCost: 10, inventoryExtendedValue: 250, inventorySku: "" }, source: source("quickbooks") },
      { id: "qb:inventory:rock-fountain", name: "Rock Fountain", type: "InventoryValuationSummary", amount: 250, balance: 250, metadata: { source_system: "quickbooks", inventoryQuantity: 2, inventoryUnitCost: 125, inventoryExtendedValue: 250, inventorySku: "" }, source: source("quickbooks") },
      { id: "qb:inventory:sprinkler-heads", name: "Sprinkler Heads", type: "InventoryValuationSummary", amount: 18.75, balance: 18.75, metadata: { source_system: "quickbooks", inventoryQuantity: 25, inventoryUnitCost: 0.75, inventoryExtendedValue: 18.75, inventorySku: "" }, source: source("quickbooks") },
      { id: "qb:inventory:sprinkler-pipes", name: "Sprinkler Pipes", type: "InventoryValuationSummary", amount: 77.5, balance: 77.5, metadata: { source_system: "quickbooks", inventoryQuantity: 31, inventoryUnitCost: 2.5, inventoryExtendedValue: 77.5, inventorySku: "" }, source: source("quickbooks") },
    ],
  });
  const inventory = inventoryAnalysis(quickBooksInventoryDemo, "Wholesale Distribution");
  if (inventory.totalQuantity === 83 && inventory.totalInventoryValue === 596.25 && inventory.tieOutStatus === "Ties to Balance Sheet") pass("QuickBooks demo inventory analysis totals quantity and value correctly");
  else fail(`QuickBooks demo inventory totals were wrong: qty=${inventory.totalQuantity}, value=${inventory.totalInventoryValue}, tieOut=${inventory.tieOutStatus}`);

  const inventoryPdf = await buildFinancialPackagePdfBlob({ normalizedData: quickBooksInventoryDemo, industryType: "Wholesale Distribution", reportPeriod: "June 2, 2026" }).text();
  if (inventoryPdf.includes("Pump") && inventoryPdf.includes("Rock Fountain") && inventoryPdf.includes("$596.25") && inventoryPdf.includes("Total Qty: 83")) pass("Inventory Analysis PDF renders QuickBooks demo item rows and total value");
  else fail("Inventory Analysis PDF did not render QuickBooks demo inventory detail");

  const truckFixedAssetData = normalized("quickbooks", {
    normalizedBalanceSheet: [
      { label: "Original Cost", amount: 13495, section: "TRUCK", source: source("quickbooks") },
      { label: "Total Truck", amount: 13495, section: "TRUCK", source: source("quickbooks") },
      { label: "Total Assets", amount: 13495, section: "Assets", source: source("quickbooks") },
      { label: "Total Equity", amount: 13495, section: "Equity", source: source("quickbooks") },
      { label: "Total Liabilities and Equity", amount: 13495, section: "Equity", source: source("quickbooks") },
    ],
    normalizedTransactions: [],
  });
  const fixedAssets = fixedAssetSchedule(truckFixedAssetData);
  if (fixedAssets.originalCost === 13495 && fixedAssets.netBookValue === 13495 && fixedAssets.categories[0]?.name === "TRUCK" && !fixedAssets.hasAccumulatedDepreciation) pass("Fixed asset analysis recognizes Truck Original Cost without double counting");
  else fail(`Fixed asset analysis was wrong: cost=${fixedAssets.originalCost}, nbv=${fixedAssets.netBookValue}, category=${fixedAssets.categories[0]?.name}, dep=${fixedAssets.hasAccumulatedDepreciation}`);

  const fixedAssetPdf = await buildFinancialPackagePdfBlob({ normalizedData: truckFixedAssetData, reportPeriod: "June 2, 2026" }).text();
  if (fixedAssetPdf.includes("TRUCK") && fixedAssetPdf.includes("$13,495") && !fixedAssetPdf.includes("Accumulated Depreciation by Category")) pass("Fixed Asset Analysis PDF shows Truck cost and hides empty depreciation section");
  else fail("Fixed Asset Analysis PDF did not show Truck cost or hide empty depreciation section");

  const noPayrollData = normalized("quickbooks", {
    normalizedIncomeStatement: [
      { label: "Service Revenue", amount: 180000, section: "Revenue", source: source("quickbooks") },
      { label: "Rent Expense", amount: -12000, section: "Operating Expenses", source: source("quickbooks") },
      { label: "Net Income", amount: 168000, section: "Net Income", source: source("quickbooks") },
    ],
    normalizedTrialBalance: [],
  });
  const noPayrollAnalysis = payrollFteAnalysis(noPayrollData);
  if (noPayrollAnalysis.payrollCost === null && noPayrollAnalysis.currentFte === null && noPayrollAnalysis.revenuePerFte === null) pass("Payroll/FTE analysis does not invent payroll or FTE values");
  else fail("Payroll/FTE analysis invented payroll or FTE values without source data");

  const noPayrollPdf = await buildFinancialPackagePdfBlob({ normalizedData: noPayrollData, reportPeriod: "June 2, 2026" }).text();
  const demoPayrollValues = ["31.0", "29.5", "$78,000", "$2,516", "$13,548", "8.0%"];
  if (demoPayrollValues.every((value) => !noPayrollPdf.includes(value)) && noPayrollPdf.includes("Not available") && noPayrollPdf.includes("Source: Not available")) pass("Payroll/FTE PDF removes demo values when payroll and FTE are unavailable");
  else fail("Payroll/FTE PDF still rendered demo values when payroll and FTE are unavailable");

  const payrollNoFteData = normalized("quickbooks", {
    normalizedIncomeStatement: [
      { label: "Service Revenue", amount: 180000, section: "Revenue", source: source("quickbooks") },
      { label: "Payroll Expense", amount: -72000, section: "Operating Expenses", source: source("quickbooks") },
      { label: "Net Income", amount: 108000, section: "Net Income", source: source("quickbooks") },
    ],
    normalizedTrialBalance: [
      { accountId: "6000", accountName: "Payroll Expense", debit: 72000, credit: 0, netAmount: 72000, source: source("quickbooks") },
    ],
  });
  const payrollNoFteAnalysis = payrollFteAnalysis(payrollNoFteData);
  if (payrollNoFteAnalysis.payrollCost === 72000 && payrollNoFteAnalysis.currentFte === null && payrollNoFteAnalysis.payrollCostPerFte === null) pass("Payroll/FTE analysis uses QuickBooks payroll accounts but does not invent FTE");
  else fail("Payroll/FTE analysis did not follow QuickBooks payroll/FTE source rules");

  const payrollNoFtePdf = await buildFinancialPackagePdfBlob({ normalizedData: payrollNoFteData, reportPeriod: "June 2, 2026" }).text();
  if (payrollNoFtePdf.includes("$72,000") && payrollNoFtePdf.includes("Not available") && payrollNoFtePdf.includes("N/A") && payrollNoFtePdf.includes("Source: QuickBooks P&L payroll expense accounts")) pass("Payroll/FTE PDF shows payroll cost and N/A productivity metrics when FTE is unavailable");
  else fail("Payroll/FTE PDF did not render source-backed payroll with unavailable FTE correctly");

  if (process.exitCode) {
    console.error("\nSupporting schedule verification failed.");
    process.exit(process.exitCode);
  }

  console.log("\nSupporting schedule verification passed.");
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
