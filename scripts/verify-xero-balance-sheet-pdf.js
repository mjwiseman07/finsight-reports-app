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
const { normalizeXeroFinancialStatement } = require("../lib/integrations/accounting/normalizers/financial-statements.ts");
const { fixedAssetSchedule } = require("../lib/accounting/supporting-schedules/scheduleDiagnostics.ts");
const onboardingSource = fs.readFileSync("app/onboarding/page.tsx", "utf8");
const dashboardSource = fs.readFileSync("app/dashboard/page.jsx", "utf8");
const activeContextRouteSource = fs.readFileSync("app/api/accounting/active-context/route.js", "utf8");
const accountingServiceSource = fs.readFileSync("lib/integrations/accounting/service.ts", "utf8");

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function assertAmount(label, actual, expected) {
  if (Math.abs(actual - expected) <= 0.01) pass(`${label} is ${expected.toFixed(2)}`);
  else fail(`${label} expected ${expected.toFixed(2)} but received ${actual.toFixed(2)}`);
}

function source(label, hierarchyPath, amount) {
  return {
    provider: "xero",
    providerFamily: "xero",
    providerProduct: "xero_accounting",
    externalEntityId: "xero-demo-us",
    sourceReport: "BalanceSheet",
    raw: {
      RowType: /^total/i.test(label) ? "SummaryRow" : "Row",
      Cells: [{ Value: label }, { Value: String(amount) }],
      __advisacorHierarchyPath: hierarchyPath,
      __advisacorSourceSection: hierarchyPath[hierarchyPath.length - 2] || hierarchyPath[0],
      __advisacorXeroReportAmount: amount,
    },
  };
}

function derivedControlSource(label, hierarchyPath, amount) {
  const record = source(label, hierarchyPath, amount);
  return {
    ...record,
    raw: {
      ...record.raw,
      __advisacorDerivedFrom: "xero_control_account_fallback",
    },
  };
}

function xeroSectionSource(label, sourceSection, amount, hierarchyPath = null) {
  return {
    provider: "xero",
    providerFamily: "xero",
    providerProduct: "xero_accounting",
    externalEntityId: "xero-demo-us",
    sourceReport: "BalanceSheet",
    raw: {
      RowType: /^total/i.test(label) ? "SummaryRow" : "Row",
      Cells: [{ Value: label }, { Value: String(amount) }],
      ...(hierarchyPath ? { __advisacorHierarchyPath: hierarchyPath } : {}),
      __advisacorSourceSection: sourceSection,
      __advisacorXeroReportAmount: amount,
    },
  };
}

const balanceSheetRows = [
  ["Accounts Receivable", 0, ["Assets", "Current Assets", "Accounts Receivable"]],
  ["Total Accounts Receivable", 9172.63, ["Assets", "Current Assets", "Total Accounts Receivable"]],
  ["Total Current Assets", 9172.63, ["Assets", "Current Assets", "Total Current Assets"]],
  ["Computer Equipment", -829.87, ["Assets", "Fixed Assets", "Computer Equipment"]],
  ["Office Equipment", 3628.91, ["Assets", "Fixed Assets", "Office Equipment"]],
  ["Total Fixed Assets", 2799.04, ["Assets", "Fixed Assets", "Total Fixed Assets"]],
  ["Total Assets", 11971.67, ["Assets", "Total Assets"]],
  ["Accounts Payable", 0, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Accounts Payable"]],
  ["Total Accounts Payable", 10703.19, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Total Accounts Payable"]],
  ["Checking Account", 4569.98, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Checking Account"]],
  ["Historical Adjustment", 4130.98, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Historical Adjustment"]],
  ["Sales Tax", 2655.38, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Sales Tax"]],
  ["Total Current Liabilities", 22059.53, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Total Current Liabilities"]],
  ["Total Liabilities", 22059.53, ["Liabilities and Equity", "Liabilities", "Total Liabilities"]],
  ["Current Year Earnings", -14370.87, ["Liabilities and Equity", "Equity", "Current Year Earnings"]],
  ["Retained Earnings", 4283.01, ["Liabilities and Equity", "Equity", "Retained Earnings"]],
  ["Total Equity", -10087.86, ["Liabilities and Equity", "Equity", "Total Equity"]],
  ["Total Liabilities and Equity", 11971.67, ["Liabilities and Equity", "Total Liabilities and Equity"]],
];

const normalizedData = {
  sourceSystem: "xero",
  adapterName: "xeroAdapter",
  companyId: "company-1",
  connectionId: "connection-1",
  tenantId: "tenant-1",
  tenantName: "Xero Demo Company US",
  syncId: "sync-1",
  reportPeriod: { startDate: "2026-05-01", endDate: "2026-05-31" },
  mappedAt: new Date().toISOString(),
  rawReportsPulled: { accounts: true, trialBalance: true, balanceSheet: true, incomeStatement: true, arAging: false, apAging: false },
  syncStatus: "SUCCESS",
  lastSyncedAt: new Date().toISOString(),
  normalizedAccounts: [],
  normalizedTransactions: [],
  normalizedTrialBalance: [],
  normalizedBalanceSheet: balanceSheetRows.map(([label, amount, hierarchyPath]) => ({
    label,
    amount,
    section: hierarchyPath[hierarchyPath.length - 2],
    source: source(label, hierarchyPath, amount),
  })),
  normalizedIncomeStatement: [
    {
      label: "Net Income",
      amount: -14370.87,
      section: "Net Income",
      source: {
        provider: "xero",
        providerFamily: "xero",
        providerProduct: "xero_accounting",
        sourceReport: "ProfitAndLoss",
        raw: { __advisacorHierarchyPath: ["Net Income"], __advisacorSourceSection: "Net Income" },
      },
    },
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
const pdfRows = input.balanceSheetRows;
const amountFor = (label) => {
  const row = pdfRows.find((item) => item.label === label && item.value);
  const raw = String(row?.value || "0");
  const negative = /^\(.*\)$/.test(raw);
  const amount = Number(raw.replace(/[($,\s)]/g, ""));
  return negative ? -amount : amount;
};
const amountFromRows = (rows, label) => {
  const row = rows.find((item) => item.label === label && item.value);
  const raw = String(row?.value || "0");
  const negative = /^\(.*\)$/.test(raw);
  const amount = Number(raw.replace(/[($,\s)]/g, ""));
  return negative ? -amount : amount;
};
const labels = pdfRows.map((row) => row.label);

assertAmount("Xero Accounts Receivable", amountFor("Accounts Receivable"), 9172.63);
assertAmount("Xero Total Current Assets", amountFor("Total Current Assets"), 9172.63);
assertAmount("Xero Computer Equipment", amountFor("Computer Equipment"), -829.87);
assertAmount("Xero Office Equipment", amountFor("Office Equipment"), 3628.91);
assertAmount("Xero Total Fixed Assets", amountFor("Total Fixed Assets"), 2799.04);
assertAmount("Xero Total Assets", amountFor("TOTAL ASSETS"), 11971.67);
assertAmount("Xero Accounts Payable", amountFor("Accounts Payable"), 10703.19);
assertAmount("Xero Checking Account liability", amountFor("Checking Account"), 4569.98);
assertAmount("Xero Historical Adjustment", amountFor("Historical Adjustment"), 4130.98);
assertAmount("Xero Sales Tax", amountFor("Sales Tax"), 2655.38);
assertAmount("Xero Total Current Liabilities", amountFor("Total Current Liabilities"), 22059.53);
assertAmount("Xero Total Liabilities", amountFor("Total Liabilities"), 22059.53);
assertAmount("Xero Current Year Earnings", amountFor("Current Year Earnings"), -14370.87);
assertAmount("Xero Retained Earnings", amountFor("Retained Earnings"), 4283.01);
assertAmount("Xero Total Equity", amountFor("Total Equity"), -10087.86);
assertAmount("Xero Total Liabilities and Equity", amountFor("TOTAL LIABILITIES AND EQUITY"), 11971.67);

const xeroAgingFallbackData = {
  ...normalizedData,
  normalizedBalanceSheet: normalizedData.normalizedBalanceSheet.map((row) =>
    /^(total )?accounts receivable$|^(total )?accounts payable$/i.test(row.label)
      ? { ...row, amount: 0, source: { ...row.source, raw: { ...row.source.raw, __advisacorXeroReportAmount: 0 } } }
      : row,
  ),
  normalizedARAging: [{ id: "xero-ar-aging", name: "Accounts Receivable", type: "AgedReceivablesByContact", amount: 9172.63, balance: 9172.63, source: source("Accounts Receivable", ["Aged Receivables", "Accounts Receivable"], 9172.63) }],
  normalizedAPAging: [{ id: "xero-ap-aging", name: "Accounts Payable", type: "AgedPayablesByContact", amount: 10703.19, balance: 10703.19, source: source("Accounts Payable", ["Aged Payables", "Accounts Payable"], 10703.19) }],
};
const agingFallbackInput = buildFinancialPackageInputFromNormalizedData({ normalizedData: xeroAgingFallbackData });
const agingFallbackAmountFor = (label) => {
  const row = agingFallbackInput.balanceSheetRows.find((item) => item.label === label && item.value);
  const raw = String(row?.value || "0");
  const negative = /^\(.*\)$/.test(raw);
  const amount = Number(raw.replace(/[($,\s)]/g, ""));
  return negative ? -amount : amount;
};
assertAmount("Xero AR aging fallback fills zero Balance Sheet AR", agingFallbackAmountFor("Accounts Receivable"), 9172.63);
assertAmount("Xero AP aging fallback fills zero Balance Sheet AP", agingFallbackAmountFor("Accounts Payable"), 10703.19);

const staleXeroTotalsData = {
  ...normalizedData,
  normalizedBalanceSheet: [
    ["Checking Account", 4540.98, ["Assets", "Current Assets", "Cash and Cash Equivalents", "Checking Account"], source],
    ["Accounts Receivable", 9172.63, ["Assets", "Current Assets", "Accounts Receivable"], derivedControlSource],
    ["Total Current Assets", 4540.98, ["Assets", "Current Assets", "Total Current Assets"], source],
    ["Total Assets", 4540.98, ["Assets", "Total Assets"], source],
    ["Accounts Payable", 10703.19, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Accounts Payable"], derivedControlSource],
    ["Historical Adjustment", 4130.98, ["Liabilities and Equity", "Current Liabilities", "Historical Adjustment"], source],
    ["Sales Tax", 42.33, ["Liabilities and Equity", "Current Liabilities", "Sales Tax"], source],
    ["Total Current Liabilities", 4173.31, ["Liabilities and Equity", "Current Liabilities", "Total Current Liabilities"], source],
    ["Total Liabilities", 4173.31, ["Liabilities and Equity", "Total Liabilities"], source],
    ["Current Year Earnings", 367.67, ["Liabilities and Equity", "Equity", "Current Year Earnings"], source],
    ["Total Equity", 367.67, ["Liabilities and Equity", "Equity", "Total Equity"], source],
    ["Total Liabilities and Equity", 4540.98, ["Liabilities and Equity", "Total Liabilities and Equity"], source],
  ].map(([label, amount, hierarchyPath, sourceBuilder]) => ({
    label,
    amount,
    section: hierarchyPath[hierarchyPath.length - 2],
    source: sourceBuilder(label, hierarchyPath, amount),
  })),
};
const staleXeroTotalsInput = buildFinancialPackageInputFromNormalizedData({ normalizedData: staleXeroTotalsData });
const staleXeroTotalAmountFor = (label) => {
  const row = staleXeroTotalsInput.balanceSheetRows.find((item) => item.label === label && item.value);
  const raw = String(row?.value || "0");
  const negative = /^\(.*\)$/.test(raw);
  const amount = Number(raw.replace(/[($,\s)]/g, ""));
  return negative ? -amount : amount;
};
assertAmount("Xero displayed Total Current Assets includes backfilled AR", staleXeroTotalAmountFor("Total Current Assets"), 13713.61);
assertAmount("Xero displayed Total Assets includes backfilled AR", staleXeroTotalAmountFor("TOTAL ASSETS"), 13713.61);
try {
  buildFinancialPackagePdfBlob({ normalizedData: staleXeroTotalsData, reportPeriod: "May 31, 2026" });
  pass("Xero PDF accepts recalculated totals when AR/AP control rows are derived from Xero fallback");
} catch (error) {
  fail(`Xero PDF should not block derived control-account totals: ${error?.message}`);
}

if (labels.indexOf("Accounts Receivable") > labels.indexOf("Current Assets")) pass("Accounts Receivable stays under Current Assets");
else fail("Accounts Receivable is not under Current Assets");

if (labels.indexOf("Computer Equipment") > labels.indexOf("Fixed Assets") && labels.indexOf("Office Equipment") > labels.indexOf("Fixed Assets")) pass("Xero equipment rows stay under Fixed Assets");
else fail("Xero equipment rows are not under Fixed Assets");

if (labels.indexOf("Sales Tax") > labels.indexOf("Current Liabilities") && labels.indexOf("Sales Tax") < labels.indexOf("Total Current Liabilities")) pass("Sales Tax stays under Current Liabilities");
else fail("Sales Tax is not under Current Liabilities");

const xeroSectionOnlyLiabilityData = {
  ...normalizedData,
  normalizedBalanceSheet: [
    { label: "Checking Account", amount: 4569.98, section: "Current Liabilities", source: xeroSectionSource("Checking Account", "Current Liabilities", 4569.98) },
    { label: "Total Current Liabilities", amount: 4569.98, section: "Current Liabilities", source: xeroSectionSource("Total Current Liabilities", "Current Liabilities", 4569.98) },
    { label: "Total Liabilities", amount: 4569.98, section: "Liabilities", source: xeroSectionSource("Total Liabilities", "Liabilities", 4569.98) },
    { label: "Total Equity", amount: 0, section: "Equity", source: xeroSectionSource("Total Equity", "Equity", 0) },
    { label: "Total Liabilities and Equity", amount: 4569.98, section: "Liabilities and Equity", source: xeroSectionSource("Total Liabilities and Equity", "Liabilities and Equity", 4569.98) },
  ],
};
const xeroSectionOnlyRows = buildFinancialPackageInputFromNormalizedData({ normalizedData: xeroSectionOnlyLiabilityData }).balanceSheetRows;
const xeroSectionOnlyLabels = xeroSectionOnlyRows.map((row) => row.label);
if (
  xeroSectionOnlyLabels.indexOf("Checking Account") > xeroSectionOnlyLabels.indexOf("Current Liabilities") &&
  xeroSectionOnlyLabels.indexOf("Checking Account") < xeroSectionOnlyLabels.indexOf("Total Current Liabilities") &&
  !xeroSectionOnlyLabels.includes("Bank Accounts")
) {
  pass("Xero section-only Checking Account remains under Current Liabilities");
} else {
  fail("Xero section-only Checking Account was reclassified as an asset");
}

const xeroConflictingHierarchyData = {
  ...normalizedData,
  normalizedBalanceSheet: [
    { label: "Checking Account", amount: 4569.98, section: "Current Liabilities", source: xeroSectionSource("Checking Account", "Current Liabilities", 4569.98, ["Assets", "Current Assets", "Bank Accounts", "Checking Account"]) },
    { label: "Total Current Liabilities", amount: 4569.98, section: "Current Liabilities", source: xeroSectionSource("Total Current Liabilities", "Current Liabilities", 4569.98, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Total Current Liabilities"]) },
    { label: "Total Liabilities", amount: 4569.98, section: "Liabilities", source: xeroSectionSource("Total Liabilities", "Liabilities", 4569.98, ["Liabilities and Equity", "Liabilities", "Total Liabilities"]) },
    { label: "Total Equity", amount: 0, section: "Equity", source: xeroSectionSource("Total Equity", "Equity", 0, ["Liabilities and Equity", "Equity", "Total Equity"]) },
    { label: "Total Liabilities and Equity", amount: 4569.98, section: "Liabilities and Equity", source: xeroSectionSource("Total Liabilities and Equity", "Liabilities and Equity", 4569.98, ["Liabilities and Equity", "Total Liabilities and Equity"]) },
  ],
};
const xeroConflictingLabels = buildFinancialPackageInputFromNormalizedData({ normalizedData: xeroConflictingHierarchyData }).balanceSheetRows.map((row) => row.label);
if (
  xeroConflictingLabels.indexOf("Checking Account") > xeroConflictingLabels.indexOf("Current Liabilities") &&
  xeroConflictingLabels.indexOf("Checking Account") < xeroConflictingLabels.indexOf("Total Current Liabilities") &&
  !xeroConflictingLabels.includes("Bank Accounts")
) {
  pass("Xero source section overrides conflicting asset hierarchy for Checking Account");
} else {
  fail("Xero conflicting hierarchy still placed Checking Account under assets");
}

const xeroStaleAssetBankHierarchyData = {
  ...normalizedData,
  normalizedBalanceSheet: [
    { label: "Accounts Receivable", amount: 9172.63, section: "Current Assets", source: xeroSectionSource("Accounts Receivable", "Current Assets", 9172.63, ["Assets", "Current Assets", "Accounts Receivable"]) },
    { label: "Total Current Assets", amount: 9172.63, section: "Current Assets", source: xeroSectionSource("Total Current Assets", "Current Assets", 9172.63, ["Assets", "Current Assets", "Total Current Assets"]) },
    { label: "Total Assets", amount: 9172.63, section: "Assets", source: xeroSectionSource("Total Assets", "Assets", 9172.63, ["Assets", "Total Assets"]) },
    { label: "Accounts Payable", amount: 10703.19, section: "Current Liabilities", source: xeroSectionSource("Accounts Payable", "Current Liabilities", 10703.19, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Accounts Payable"]) },
    { label: "Checking Account", amount: 4569.98, section: "Current Assets", source: xeroSectionSource("Checking Account", "Current Assets", 4569.98, ["Assets", "Current Assets", "Cash and Cash Equivalents", "Checking Account"]) },
    { label: "Historical Adjustment", amount: 4130.98, section: "Current Liabilities", source: xeroSectionSource("Historical Adjustment", "Current Liabilities", 4130.98, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Historical Adjustment"]) },
    { label: "Sales Tax", amount: 2655.38, section: "Current Liabilities", source: xeroSectionSource("Sales Tax", "Current Liabilities", 2655.38, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Sales Tax"]) },
    { label: "Total Current Liabilities", amount: 22059.53, section: "Current Liabilities", source: xeroSectionSource("Total Current Liabilities", "Current Liabilities", 22059.53, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Total Current Liabilities"]) },
    { label: "Total Liabilities", amount: 22059.53, section: "Liabilities", source: xeroSectionSource("Total Liabilities", "Liabilities", 22059.53, ["Liabilities and Equity", "Liabilities", "Total Liabilities"]) },
    { label: "Total Equity", amount: -12886.9, section: "Equity", source: xeroSectionSource("Total Equity", "Equity", -12886.9, ["Liabilities and Equity", "Equity", "Total Equity"]) },
    { label: "Total Liabilities and Equity", amount: 9172.63, section: "Liabilities and Equity", source: xeroSectionSource("Total Liabilities and Equity", "Liabilities and Equity", 9172.63, ["Liabilities and Equity", "Total Liabilities and Equity"]) },
  ],
};
const xeroStaleAssetBankLabels = buildFinancialPackageInputFromNormalizedData({ normalizedData: xeroStaleAssetBankHierarchyData }).balanceSheetRows.map((row) => row.label);
if (
  xeroStaleAssetBankLabels.indexOf("Checking Account") > xeroStaleAssetBankLabels.indexOf("Current Liabilities") &&
  xeroStaleAssetBankLabels.indexOf("Checking Account") < xeroStaleAssetBankLabels.indexOf("Total Current Liabilities") &&
  !xeroStaleAssetBankLabels.includes("Cash and Cash Equivalents")
) {
  pass("Xero source totals override stale asset-side cash hierarchy for Checking Account");
} else {
  fail("Xero stale asset-side cash hierarchy still placed Checking Account under assets");
}

const xeroNegativeAssetBankOverdraftData = {
  ...normalizedData,
  normalizedBalanceSheet: [
    { label: "Accounts Receivable", amount: 9172.63, section: "Current Assets", source: xeroSectionSource("Accounts Receivable", "Current Assets", 9172.63, ["Assets", "Current Assets", "Accounts Receivable"]) },
    { label: "Checking Account", amount: -4569.98, section: "Current Assets", source: xeroSectionSource("Checking Account", "Current Assets", -4569.98, ["Assets", "Current Assets", "Cash and Cash Equivalents", "Checking Account"]) },
    { label: "Total Current Assets", amount: 9172.63, section: "Current Assets", source: xeroSectionSource("Total Current Assets", "Current Assets", 9172.63, ["Assets", "Current Assets", "Total Current Assets"]) },
    { label: "Total Assets", amount: 9172.63, section: "Assets", source: xeroSectionSource("Total Assets", "Assets", 9172.63, ["Assets", "Total Assets"]) },
    { label: "Accounts Payable", amount: 10703.19, section: "Current Liabilities", source: xeroSectionSource("Accounts Payable", "Current Liabilities", 10703.19, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Accounts Payable"]) },
    { label: "Historical Adjustment", amount: 4130.98, section: "Current Liabilities", source: xeroSectionSource("Historical Adjustment", "Current Liabilities", 4130.98, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Historical Adjustment"]) },
    { label: "Sales Tax", amount: 2655.38, section: "Current Liabilities", source: xeroSectionSource("Sales Tax", "Current Liabilities", 2655.38, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Sales Tax"]) },
    { label: "Total Current Liabilities", amount: 22059.53, section: "Current Liabilities", source: xeroSectionSource("Total Current Liabilities", "Current Liabilities", 22059.53, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Total Current Liabilities"]) },
    { label: "Total Liabilities", amount: 22059.53, section: "Liabilities", source: xeroSectionSource("Total Liabilities", "Liabilities", 22059.53, ["Liabilities and Equity", "Liabilities", "Total Liabilities"]) },
    { label: "Total Equity", amount: -12886.9, section: "Equity", source: xeroSectionSource("Total Equity", "Equity", -12886.9, ["Liabilities and Equity", "Equity", "Total Equity"]) },
    { label: "Total Liabilities and Equity", amount: 9172.63, section: "Liabilities and Equity", source: xeroSectionSource("Total Liabilities and Equity", "Liabilities and Equity", 9172.63, ["Liabilities and Equity", "Total Liabilities and Equity"]) },
  ],
};
const xeroNegativeAssetBankRows = buildFinancialPackageInputFromNormalizedData({ normalizedData: xeroNegativeAssetBankOverdraftData }).balanceSheetRows;
const xeroNegativeAssetBankLabels = xeroNegativeAssetBankRows.map((row) => row.label);
if (
  xeroNegativeAssetBankLabels.indexOf("Checking Account") > xeroNegativeAssetBankLabels.indexOf("Current Liabilities") &&
  xeroNegativeAssetBankLabels.indexOf("Checking Account") < xeroNegativeAssetBankLabels.indexOf("Total Current Liabilities") &&
  amountFromRows(xeroNegativeAssetBankRows, "Checking Account") === 4569.98
) {
  pass("Xero negative asset-side bank overdraft follows Balance Sheet liability classification");
} else {
  fail("Xero negative bank overdraft still rendered as asset-side cash");
}

const xeroHierarchyLiabilityCashData = {
  ...normalizedData,
  normalizedBalanceSheet: [
    { label: "Checking Account", amount: 4569.98, section: "Current Assets", source: xeroSectionSource("Checking Account", "Current Assets", 4569.98, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Cash and Cash Equivalents", "Checking Account"]) },
    { label: "Total Current Liabilities", amount: 4569.98, section: "Current Liabilities", source: xeroSectionSource("Total Current Liabilities", "Current Liabilities", 4569.98, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Total Current Liabilities"]) },
    { label: "Total Liabilities", amount: 4569.98, section: "Liabilities", source: xeroSectionSource("Total Liabilities", "Liabilities", 4569.98, ["Liabilities and Equity", "Liabilities", "Total Liabilities"]) },
    { label: "Total Equity", amount: 0, section: "Equity", source: xeroSectionSource("Total Equity", "Equity", 0, ["Liabilities and Equity", "Equity", "Total Equity"]) },
    { label: "Total Liabilities and Equity", amount: 4569.98, section: "Liabilities and Equity", source: xeroSectionSource("Total Liabilities and Equity", "Liabilities and Equity", 4569.98, ["Liabilities and Equity", "Total Liabilities and Equity"]) },
  ],
};
const xeroHierarchyLiabilityCashLabels = buildFinancialPackageInputFromNormalizedData({ normalizedData: xeroHierarchyLiabilityCashData }).balanceSheetRows.map((row) => row.label);
if (
  xeroHierarchyLiabilityCashLabels.indexOf("Checking Account") > xeroHierarchyLiabilityCashLabels.indexOf("Current Liabilities") &&
  xeroHierarchyLiabilityCashLabels.indexOf("Checking Account") < xeroHierarchyLiabilityCashLabels.indexOf("Total Current Liabilities")
) {
  pass("Xero PDF follows Balance Sheet hierarchy for cash/checking classification");
} else {
  fail("Xero PDF ignored Balance Sheet hierarchy for cash/checking classification");
}

const xeroBroadAssetFixedAssetData = {
  ...normalizedData,
  normalizedBalanceSheet: [
    { label: "Computer Equipment", amount: -829.87, section: "Assets", source: xeroSectionSource("Computer Equipment", "Assets", -829.87, ["Assets", "Fixed Assets", "Computer Equipment"]) },
    { label: "Office Equipment", amount: 3628.91, section: "Assets", source: xeroSectionSource("Office Equipment", "Assets", 3628.91, ["Assets", "Fixed Assets", "Office Equipment"]) },
    { label: "Total Fixed Assets", amount: 2799.04, section: "Assets", source: xeroSectionSource("Total Fixed Assets", "Assets", 2799.04, ["Assets", "Fixed Assets", "Total Fixed Assets"]) },
    { label: "Total Assets", amount: 2799.04, section: "Assets", source: xeroSectionSource("Total Assets", "Assets", 2799.04, ["Assets", "Total Assets"]) },
    { label: "Total Liabilities and Equity", amount: 2799.04, section: "Liabilities and Equity", source: xeroSectionSource("Total Liabilities and Equity", "Liabilities and Equity", 2799.04, ["Liabilities and Equity", "Total Liabilities and Equity"]) },
  ],
};
const xeroBroadAssetFixedAssetRows = buildFinancialPackageInputFromNormalizedData({ normalizedData: xeroBroadAssetFixedAssetData }).balanceSheetRows;
assertAmount("Xero broad Assets Computer Equipment still renders source amount", amountFromRows(xeroBroadAssetFixedAssetRows, "Computer Equipment"), -829.87);
assertAmount("Xero broad Assets Office Equipment still renders source amount", amountFromRows(xeroBroadAssetFixedAssetRows, "Office Equipment"), 3628.91);

const xeroLiveNonCurrentAssetData = {
  ...normalizedData,
  normalizedBalanceSheet: [
    { label: "Computer Equipment", amount: -829.87, section: "Assets", source: xeroSectionSource("Computer Equipment", "Assets", -829.87, ["Assets", "Non-current Assets", "Computer Equipment"]) },
    { label: "Office Equipment", amount: 3628.91, section: "Assets", source: xeroSectionSource("Office Equipment", "Assets", 3628.91, ["Assets", "Non-current Assets", "Office Equipment"]) },
    { label: "Total Assets", amount: 2799.04, section: "Assets", source: xeroSectionSource("Total Assets", "Assets", 2799.04, ["Assets", "Total Assets"]) },
    { label: "Total Liabilities and Equity", amount: 2799.04, section: "Liabilities and Equity", source: xeroSectionSource("Total Liabilities and Equity", "Liabilities and Equity", 2799.04, ["Liabilities and Equity", "Total Liabilities and Equity"]) },
  ],
};
const normalizedLiveNonCurrentRows = normalizeXeroFinancialStatement("BalanceSheet", xeroLiveNonCurrentAssetData.normalizedBalanceSheet);
if (normalizedLiveNonCurrentRows.filter((row) => /equipment/i.test(row.label)).every((row) => row.section === "Fixed Assets")) pass("Xero normalizer treats non-current asset equipment as Fixed Assets");
else fail(`Xero non-current asset rows normalized incorrectly: ${normalizedLiveNonCurrentRows.map((row) => `${row.label}:${row.section}`).join(", ")}`);
const xeroLiveFixedAssetSchedule = fixedAssetSchedule({ ...xeroLiveNonCurrentAssetData, normalizedBalanceSheet: normalizedLiveNonCurrentRows });
assertAmount("Xero fixed asset schedule derives balance without explicit total row", xeroLiveFixedAssetSchedule.balanceSheetFixedAssetValue, 2799.04);

const normalizedSectionOnlyRows = normalizeXeroFinancialStatement("BalanceSheet", [
  { label: "Checking Account", amount: 4569.98, section: "Current Liabilities", source: xeroSectionSource("Checking Account", "Current Liabilities", 4569.98) },
]);
if (normalizedSectionOnlyRows[0]?.section === "Current Liabilities") pass("Xero normalizer preserves Checking Account source liability section");
else fail(`Xero normalizer reclassified Checking Account as ${normalizedSectionOnlyRows[0]?.section || "missing"}`);

const normalizedConflictingSectionRows = normalizeXeroFinancialStatement("BalanceSheet", [
  { label: "Checking Account", amount: 4569.98, section: "Current Assets", source: xeroSectionSource("Checking Account", "Current Liabilities", 4569.98, ["Assets", "Current Assets", "Bank Accounts", "Checking Account"]) },
  { label: "Total Current Liabilities", amount: 4569.98, section: "Current Liabilities", source: xeroSectionSource("Total Current Liabilities", "Current Liabilities", 4569.98, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Total Current Liabilities"]) },
]);
if (normalizedConflictingSectionRows[0]?.section === "Current Liabilities") pass("Xero normalizer overrides stale asset section with source liability section");
else fail(`Xero normalizer kept stale section ${normalizedConflictingSectionRows[0]?.section || "missing"}`);

const normalizedHierarchySectionRows = normalizeXeroFinancialStatement("BalanceSheet", [
  { label: "Checking Account", amount: 4569.98, section: "Cash and Cash Equivalents", source: xeroSectionSource("Checking Account", "Cash and Cash Equivalents", 4569.98, ["Liabilities and Equity", "Liabilities", "Current Liabilities", "Cash and Cash Equivalents", "Checking Account"]) },
]);
if (normalizedHierarchySectionRows[0]?.section === "Current Liabilities") pass("Xero normalizer uses Balance Sheet hierarchy before cash account-name classification");
else fail(`Xero normalizer did not use Balance Sheet hierarchy, received ${normalizedHierarchySectionRows[0]?.section || "missing"}`);

const normalizedFixedAssetHierarchyRows = normalizeXeroFinancialStatement("BalanceSheet", [
  { label: "Computer Equipment", amount: -829.87, section: "Assets", source: xeroSectionSource("Computer Equipment", "Assets", -829.87, ["Assets", "Fixed Assets", "Computer Equipment"]) },
  { label: "Office Equipment", amount: 3628.91, section: "Assets", source: xeroSectionSource("Office Equipment", "Assets", 3628.91, ["Assets", "Fixed Assets", "Office Equipment"]) },
]);
if (normalizedFixedAssetHierarchyRows.every((row) => row.section === "Fixed Assets")) pass("Xero normalizer uses Fixed Assets hierarchy before broad Assets section");
else fail(`Xero fixed asset hierarchy normalized incorrectly: ${normalizedFixedAssetHierarchyRows.map((row) => row.section).join(", ")}`);

buildFinancialPackagePdfBlob({ normalizedData, reportPeriod: "May 31, 2026" });
pass("Xero PDF pre-render totals validation passes");

if (
  onboardingSource.includes("forceRefresh: sourceSystem === \"xero\"") &&
  dashboardSource.includes("forceRefresh: true") &&
  dashboardSource.includes("loadFreshXeroReportPayloadForPdf") &&
  dashboardSource.includes("throw new Error(result.error || \"Unable to refresh Xero report context before PDF generation.\")") &&
  onboardingSource.includes("throw new Error(result.error || \"Unable to refresh Xero report context before PDF generation.\")") &&
  activeContextRouteSource.includes("forceRefresh") &&
  accountingServiceSource.includes("forceRefresh && resolvedSourceSystem === \"xero\"")
) {
  pass("Xero onboarding and dashboard PDF generation force a fresh active context without stale fallback");
} else {
  fail("Xero PDF generation can still fall back to stale context");
}

if (process.exitCode) {
  console.error("\nXero Balance Sheet PDF verification failed.");
  process.exit(process.exitCode);
}

console.log("\nXero Balance Sheet PDF verification passed.");
