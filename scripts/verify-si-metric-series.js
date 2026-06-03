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
const metricSeries = require("../lib/intelligence/synthetic/metric-series/index.ts");

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

const requiredBuilders = [
  "buildRevenueSeries",
  "buildExpenseSeries",
  "buildGrossMarginSeries",
  "buildOperatingMarginSeries",
  "buildNetMarginSeries",
  "buildCashSeries",
  "buildARSeries",
  "buildAPSeries",
  "buildPayrollSeries",
  "buildInventorySeries",
  "buildFixedAssetSeries",
  "buildDebtSeries",
  "buildCustomerConcentrationSeries",
  "buildVendorConcentrationSeries",
  "buildBenchmarkSeries",
];

for (const builder of requiredBuilders) {
  assert(typeof metricSeries[builder] === "function", `${builder} exists and is exported`);
}

const snapshotSeries = {
  companyId: "company-1",
  sourceSystem: "quickbooks",
  window: 24,
  coverage: {
    requestedMonths: 24,
    availableMonths: 24,
    hasBalanceSheet: true,
    hasIncomeStatement: true,
    hasCashFlow: true,
  },
  snapshots: [
    {
      ref: {
        snapshotId: "snapshot-1",
        companyId: "company-1",
        connectionId: "connection-1",
        syncId: "sync-1",
        sourceSystem: "quickbooks",
        tenantId: "tenant-1",
        reportPeriod: { startDate: "2026-04-01", endDate: "2026-04-30", label: "Apr 2026" },
      },
      validationReadyForReporting: true,
      validationWarnings: [],
      rawReportsPulled: { balanceSheet: true, incomeStatement: true },
      normalizedObjectCounts: { normalizedBalanceSheet: 10, normalizedIncomeStatement: 10 },
    },
    {
      ref: {
        snapshotId: "snapshot-2",
        companyId: "company-1",
        connectionId: "connection-1",
        syncId: "sync-2",
        sourceSystem: "quickbooks",
        tenantId: "tenant-1",
        reportPeriod: { startDate: "2026-05-01", endDate: "2026-05-31", label: "May 2026" },
      },
      validationReadyForReporting: true,
      validationWarnings: [],
      rawReportsPulled: { balanceSheet: true, incomeStatement: true },
      normalizedObjectCounts: { normalizedBalanceSheet: 10, normalizedIncomeStatement: 10 },
    },
  ],
};

function kpi(kpiKey, category = "revenue", unit = "currency") {
  return {
    kpiKey,
    label: kpiKey,
    category,
    formula: { formulaKey: `${kpiKey}_formula`, version: "1" },
    inputs: [{ inputKey: kpiKey, sourceType: "historical_snapshot", required: true }],
    output: { unit, supportsTrend: true, supportsBenchmark: true },
  };
}

function formula(kpiKey) {
  return {
    definition: {
      formulaKey: `${kpiKey}_formula`,
      version: "1",
      label: `${kpiKey} formula`,
      inputKeys: [kpiKey],
      outputKey: kpiKey,
      outputUnit: "currency",
    },
  };
}

const values = [
  { period: { startDate: "2026-04-01", endDate: "2026-04-30", label: "Apr 2026" }, value: 100, snapshotId: "snapshot-1", sourceSystem: "quickbooks", sourceReport: "ProfitAndLoss" },
  { period: { startDate: "2026-05-01", endDate: "2026-05-31", label: "May 2026" }, value: 125, snapshotId: "snapshot-2", sourceSystem: "quickbooks", sourceReport: "ProfitAndLoss" },
];

const commonInput = {
  values,
  snapshotSeries,
  kpiDefinition: kpi("revenue"),
  formulaRegistryEntry: formula("revenue"),
  industryProfile: {
    industryKey: "general",
    displayName: "General",
    metricCatalog: [{ metricKey: "revenue", label: "Revenue" }],
  },
  companyMemory: [
    {
      id: "memory-1",
      companyId: "company-1",
      recordType: "recurring_pattern",
      recurringPattern: { patternKey: "seasonal_revenue", description: "Known seasonal revenue pattern" },
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ],
  createdAt: "2026-06-01T00:00:00.000Z",
};

const revenue = metricSeries.buildRevenueSeries(commonInput);
assert(revenue.metricKey === "revenue" && revenue.points.length === 2, "Revenue series returns deterministic metric points");
assert(revenue.evidenceIds.length === 2 && revenue.calculationTraceIds.length === 1, "Revenue series includes evidence and trace references");
assert(revenue.confidence.score > 0 && revenue.confidence.explanationCodes.includes("history_24_months"), "Revenue series includes confidence output");
assert(revenue.kpiKey === "revenue" && revenue.formulaKey === "revenue_formula", "Revenue series preserves KPI and formula references");

const grossMargin = metricSeries.buildGrossMarginSeries({ ...commonInput, kpiDefinition: kpi("gross_margin", "margin", "percent"), formulaRegistryEntry: formula("gross_margin") });
assert(grossMargin.parentMetricIds.includes("revenue") && grossMargin.parentMetricIds.includes("cogs"), "Gross margin series preserves metric lineage");

const benchmark = metricSeries.buildBenchmarkSeries({ ...commonInput, kpiDefinition: kpi("benchmark", "industry", "ratio"), formulaRegistryEntry: formula("benchmark") });
assert(benchmark.metricKey === "benchmark" && benchmark.sourceMetricIds.includes("industry_profile"), "Benchmark series produces metric-series output only");

const metricSeriesDir = path.join(root, "lib", "intelligence", "synthetic", "metric-series");
const sourceText = fs.readdirSync(metricSeriesDir)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => fs.readFileSync(path.join(metricSeriesDir, file), "utf8"))
  .join("\n");

assert(!/signal|recommendation|forecast|anomaly|AI commentary|dashboard|financial-package-pdf|powerpoint|package-ui|lib\/integrations|report-preflight/i.test(sourceText), "Metric series builders contain no signal, recommendation, forecast, anomaly, AI, output, provider, or validation wiring");

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI metric series verification passed.");
