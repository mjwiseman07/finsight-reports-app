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
const signals = require("../lib/intelligence/synthetic/signal-engine/index.ts");

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
  "buildRevenueGrowthSignal",
  "buildRevenueDeclineSignal",
  "buildRevenueVolatilitySignal",
  "buildExpenseGrowthSignal",
  "buildExpenseCompressionSignal",
  "buildGrossMarginExpansionSignal",
  "buildGrossMarginCompressionSignal",
  "buildOperatingMarginExpansionSignal",
  "buildOperatingMarginCompressionSignal",
  "buildCashImprovementSignal",
  "buildCashPressureSignal",
  "buildCashRunwayRiskSignal",
  "buildARImprovementSignal",
  "buildARCollectionRiskSignal",
  "buildAPImprovementSignal",
  "buildAPPressureSignal",
  "buildPayrollGrowthSignal",
  "buildPayrollEfficiencySignal",
  "buildInventoryBuildSignal",
  "buildInventoryReductionSignal",
  "buildFixedAssetGrowthSignal",
  "buildFixedAssetAgingSignal",
  "buildDebtReductionSignal",
  "buildDebtGrowthSignal",
  "buildCustomerConcentrationSignal",
  "buildVendorConcentrationSignal",
  "buildBenchmarkOutperformanceSignal",
  "buildBenchmarkUnderperformanceSignal",
];

for (const builder of requiredBuilders) {
  assert(typeof signals[builder] === "function", `${builder} exists and is exported`);
}

const confidence = {
  score: 0.82,
  tier: "high",
  factors: [],
  factorContributions: [],
  explanationCodes: ["history_24_months", "core_statements_available"],
  inputSummary: { monthsOfHistory: 24, dataCompletenessScore: 1 },
};

const metricSeries = {
  metricKey: "cash",
  label: "Cash",
  unit: "currency",
  points: [
    { period: { startDate: "2026-04-01", endDate: "2026-04-30", label: "Apr 2026" }, value: 100000, evidenceId: "evidence-1", calculationTraceId: "trace-1" },
    { period: { startDate: "2026-05-01", endDate: "2026-05-31", label: "May 2026" }, value: 75000, evidenceId: "evidence-2", calculationTraceId: "trace-1" },
  ],
  coverage: { requestedPeriods: 2, availablePeriods: 2, nullPeriods: 0 },
  confidence,
  evidenceIds: ["evidence-1", "evidence-2"],
  calculationTraceIds: ["trace-1"],
  kpiKey: "cash",
  formulaKey: "cash_formula",
  parentMetricIds: ["ar"],
  sourceMetricIds: ["balance_sheet"],
};

const commonInput = {
  metricSeries,
  createdAt: "2026-06-01T00:00:00.000Z",
  industryProfile: {
    industryKey: "healthcare",
    displayName: "Healthcare",
    metricCatalog: [{ metricKey: "cash", label: "Cash" }],
    thresholds: [{ thresholdKey: "cash_pressure", metricKey: "cash", value: 5, direction: "decrease" }],
  },
  companyMemory: [
    {
      id: "memory-1",
      companyId: "company-1",
      recordType: "recurring_pattern",
      recurringPattern: { patternKey: "seasonal_cash_pressure", description: "Known cash timing pattern" },
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ],
};

const cashPressure = signals.buildCashPressureSignal({
  ...commonInput,
  relatedSignalIds: ["ar_collection_risk:ar:may-2026"],
  correlationGroupId: "working_capital_pressure",
  rootCauseCandidate: {
    signalType: "ar_collection_risk",
    metricKey: "ar",
    confidence,
  },
});

assert(cashPressure.length === 1, "Cash pressure candidate is produced when threshold is crossed");
assert(cashPressure[0].signalId === "cash_pressure:cash:may-2026", "Signal candidate ID is deterministic");
assert(cashPressure[0].severity === "critical", "Signal severity is deterministic from variance and threshold");
assert(cashPressure[0].evidenceIds.length === 2 && cashPressure[0].calculationTraceIds.includes("trace-1"), "Signal candidate requires evidence and trace references");
assert(cashPressure[0].confidence.score === confidence.score, "Signal candidate consumes metric series confidence");
assert(cashPressure[0].sourceMetricIds.includes("cash") && cashPressure[0].sourceMetricIds.includes("balance_sheet") && cashPressure[0].sourceMetricIds.includes("ar"), "Signal candidate preserves metric lineage");
assert(cashPressure[0].relatedSignalIds.includes("ar_collection_risk:ar:may-2026") && cashPressure[0].correlationGroupId === "working_capital_pressure", "Signal candidate preserves correlation metadata");
assert(cashPressure[0].rootCauseCandidate?.signalType === "ar_collection_risk", "Signal candidate preserves root cause metadata");
assert(cashPressure[0].status === "created", "Signal candidate lifecycle starts as created");

const missingEvidence = signals.buildCashPressureSignal({
  ...commonInput,
  metricSeries: { ...metricSeries, evidenceIds: [] },
});
assert(missingEvidence.length === 0, "Signal candidate is not produced without evidence");

const belowThreshold = signals.buildCashPressureSignal({
  ...commonInput,
  metricSeries: {
    ...metricSeries,
    points: [
      metricSeries.points[0],
      { ...metricSeries.points[1], value: 99000 },
    ],
  },
});
assert(belowThreshold.length === 0, "Signal candidate is not produced below threshold");

const revenueGrowth = signals.buildRevenueGrowthSignal({
  ...commonInput,
  metricSeries: { ...metricSeries, metricKey: "revenue", sourceMetricIds: ["profit_and_loss"], parentMetricIds: [] },
});
assert(revenueGrowth.length === 0, "Directional signal ignores opposite movement");

const signalEngineDir = path.join(root, "lib", "intelligence", "synthetic", "signal-engine");
const sourceText = fs.readdirSync(signalEngineDir)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => fs.readFileSync(path.join(signalEngineDir, file), "utf8"))
  .join("\n");

assert(!/recommend|forecast|budget|anomaly|AI commentary|dashboard|financial-package-pdf|powerpoint|package-ui|lib\/integrations|report-preflight/i.test(sourceText), "Signal engine contains no downstream output, provider, validation, or unsupported reasoning wiring");

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI signal verification passed.");
