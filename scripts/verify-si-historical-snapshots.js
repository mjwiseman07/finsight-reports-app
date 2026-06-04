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
const snapshots = require("../lib/intelligence/synthetic/historical-snapshots/index.ts");

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (condition) pass(message);
  else fail(message);
}

const requiredExports = [
  "stableSnapshotHash",
  "buildSnapshotPayload",
  "buildAvailabilitySummary",
  "buildSnapshotIndustryContext",
  "buildSnapshotLineage",
  "scoreSnapshotQuality",
  "buildSnapshotAudit",
  "buildHistoricalSnapshotRecord",
  "resolveSnapshotWindow",
  "buildSnapshotSeries",
];

for (const exportName of requiredExports) {
  assert(typeof snapshots[exportName] === "function", `${exportName} exists and is exported`);
}

function normalizedData(periodEnd, syncId = `sync-${periodEnd}`) {
  return {
    sourceSystem: "quickbooks",
    adapterName: "quickBooksAdapter",
    companyId: "company-1",
    connectionId: "connection-1",
    tenantId: "tenant-1",
    tenantName: "Tenant One",
    syncId,
    reportPeriod: { startDate: `${periodEnd.slice(0, 7)}-01`, endDate: periodEnd, label: periodEnd.slice(0, 7), periodType: "month" },
    mappedAt: "2026-06-01T00:00:00.000Z",
    rawReportsPulled: {
      accounts: true,
      trialBalance: true,
      balanceSheet: true,
      incomeStatement: true,
      arAging: true,
      apAging: true,
    },
    syncStatus: "SUCCESS",
    normalizedBalanceSheet: [{ label: "Cash", amount: 100, section: "Assets" }],
    normalizedIncomeStatement: [{ label: "Revenue", amount: 200, section: "Revenue" }],
    normalizedTrialBalance: [{ accountName: "Cash", debit: 100, credit: 0, netAmount: 100 }],
    normalizedARAging: [{ id: "ar-1", name: "Customer", amount: 50 }],
    normalizedAPAging: [{ id: "ap-1", name: "Vendor", amount: 25 }],
    normalizedBudgets: [{ id: "budget-1", name: "Budget", amount: 250 }],
    normalizedDepartments: [],
    normalizedLocations: [],
    normalizedClasses: [],
    normalizedProjects: [],
    normalizedVendors: [],
    normalizedCustomers: [],
    validation: { readyForReporting: true, warnings: [] },
  };
}

const industryContext = {
  industryProfileId: "healthcare",
  industryProfileVersion: "v3",
  industryProfileEffectiveDate: "2026-01-01",
  industryProfileSource: "advisor_selected",
};

const maySnapshot = snapshots.buildHistoricalSnapshotRecord({
  normalizedData: normalizedData("2026-05-31"),
  snapshotVersion: 1,
  createdAt: "2026-06-01T00:00:00.000Z",
  snapshotIndustryContext: industryContext,
  inventory: [{ item: "Supplies", amount: 10 }],
  debt: [{ account: "Loan", amount: 75 }],
});

assert(maySnapshot.snapshotId === "company-1:quickbooks:tenant-1:2026-05:v1", "Snapshot ID is deterministic from company/provider/tenant/period/version");
assert(maySnapshot.companyId === "company-1" && maySnapshot.sourceSystem === "quickbooks" && maySnapshot.tenantId === "tenant-1", "Snapshot preserves company, provider, and tenant identity");
assert(maySnapshot.syncId === "sync-2026-05-31" && maySnapshot.reportPeriod.endDate === "2026-05-31", "Snapshot preserves sync and reporting period identity");
assert(maySnapshot.snapshotStatus === "finalized" && maySnapshot.snapshotVersion === 1, "Snapshot defaults to finalized versioned record");
assert(maySnapshot.snapshotPayload.balanceSheet.length === 1 && maySnapshot.snapshotPayload.budgets.length === 1, "Snapshot preserves statements and budgets when available");
assert(maySnapshot.snapshotAudit.availabilitySummary.hasBalanceSheet && maySnapshot.snapshotAudit.availabilitySummary.hasIncomeStatement, "Snapshot availability preserves core statements");
assert(maySnapshot.snapshotAudit.availabilitySummary.hasARAging && maySnapshot.snapshotAudit.availabilitySummary.hasAPAging, "Snapshot availability preserves AR/AP aging");
assert(maySnapshot.snapshotAudit.availabilitySummary.hasInventory && maySnapshot.snapshotAudit.availabilitySummary.hasDebt, "Snapshot availability preserves inventory and debt");
assert(maySnapshot.snapshotAudit.snapshotIndustryContext.industryProfileId === "healthcare" && maySnapshot.snapshotAudit.snapshotIndustryContext.industryProfileVersion === "v3", "Snapshot preserves industry profile context");
assert(maySnapshot.snapshotAudit.snapshotQualityScore > 0.7, "Snapshot quality score is deterministic from availability");
assert(maySnapshot.snapshotAudit.snapshotQualityFactors.some((factor) => factor.code === "payroll_available" && factor.impact === "negative"), "Snapshot quality factors capture unavailable payroll");

const sameSnapshot = snapshots.buildHistoricalSnapshotRecord({
  normalizedData: normalizedData("2026-05-31"),
  snapshotVersion: 1,
  createdAt: "2026-06-01T00:00:00.000Z",
  snapshotIndustryContext: industryContext,
  inventory: [{ item: "Supplies", amount: 10 }],
  debt: [{ account: "Loan", amount: 75 }],
});
assert(sameSnapshot.snapshotAudit.payloadHash === maySnapshot.snapshotAudit.payloadHash, "Snapshot payload hash is deterministic");
assert(sameSnapshot.snapshotLineage.createdFromNormalizedDataHash === maySnapshot.snapshotLineage.createdFromNormalizedDataHash, "Snapshot lineage hash is deterministic");

const correctedSnapshot = snapshots.buildHistoricalSnapshotRecord({
  normalizedData: { ...normalizedData("2026-05-31", "sync-corrected"), normalizedBalanceSheet: [{ label: "Cash", amount: 125, section: "Assets" }] },
  snapshotVersion: 2,
  createdAt: "2026-06-02T00:00:00.000Z",
  snapshotIndustryContext: industryContext,
  supersedesSnapshotId: maySnapshot.snapshotId,
});
assert(correctedSnapshot.snapshotId.endsWith(":v2"), "Corrected source data creates a new snapshot version");
assert(correctedSnapshot.snapshotAudit.supersedesSnapshotId === maySnapshot.snapshotId, "Snapshot audit preserves superseded lineage");

const periods = snapshots.resolveSnapshotWindow("2026-05", 12);
assert(periods.length === 12 && periods[0] === "2025-06" && periods[11] === "2026-05", "12 month snapshot window resolves expected period keys");
assert(snapshots.resolveSnapshotWindow("2026-05", 24).length === 24, "24 month snapshot window resolves");
assert(snapshots.resolveSnapshotWindow("2026-05", 36).length === 36, "36 month snapshot window resolves");
assert(snapshots.resolveSnapshotWindow("2026-05", 60).length === 60, "60 month snapshot window resolves");

const aprilSnapshot = snapshots.buildHistoricalSnapshotRecord({
  normalizedData: normalizedData("2026-04-30"),
  snapshotVersion: 1,
  createdAt: "2026-05-01T00:00:00.000Z",
});
const series = snapshots.buildSnapshotSeries({
  records: [aprilSnapshot, maySnapshot, correctedSnapshot],
  companyId: "company-1",
  sourceSystem: "quickbooks",
  tenantId: "tenant-1",
  endPeriod: "2026-05",
  window: 12,
});
assert(series.snapshots.length === 2, "Snapshot series returns available latest finalized monthly snapshots");
assert(series.coverage.availableMonths === 2 && series.coverage.missingPeriods.length === 10, "Snapshot series reports coverage gaps");
assert(series.snapshots.some((snapshot) => snapshot.ref.snapshotId === correctedSnapshot.snapshotId), "Snapshot series selects latest finalized version by default");

const exactVersionSeries = snapshots.buildSnapshotSeries({
  records: [maySnapshot, correctedSnapshot],
  companyId: "company-1",
  sourceSystem: "quickbooks",
  tenantId: "tenant-1",
  endPeriod: "2026-05",
  window: 12,
  exactVersion: 1,
});
assert(exactVersionSeries.snapshots.some((snapshot) => snapshot.ref.snapshotId === maySnapshot.snapshotId), "Snapshot series can retrieve exact version for audit");

const historicalDir = path.join(root, "lib", "intelligence", "synthetic", "historical-snapshots");
const sourceText = fs.readdirSync(historicalDir)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => fs.readFileSync(path.join(historicalDir, file), "utf8"))
  .join("\n");

const forbiddenPatterns = [
  /from\s+["'][^"']*app\/dashboard/i,
  /from\s+["'][^"']*financial-package-pdf/i,
  /from\s+["'][^"']*powerpoint/i,
  /from\s+["'][^"']*pulse/i,
  /from\s+["'][^"']*package-ui/i,
  /from\s+["'][^"']*lib\/integrations/i,
  /from\s+["'][^"']*report-preflight/i,
  /supabase|createClient|migration|from\s+["'][^"']*\/route/i,
  /openai|@ai-sdk|langchain|anthropic|fetch\s*\(|axios|XMLHttpRequest/i,
  /what-if|ROI|scenario logic|forecasting logic|budgeting logic/i,
];

for (const pattern of forbiddenPatterns) {
  assert(!pattern.test(sourceText), `Forbidden runtime/output/database/API pattern absent: ${pattern}`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI historical snapshot verification passed.");
