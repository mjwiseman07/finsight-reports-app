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
const recommendations = require("../lib/intelligence/synthetic/recommendation-engine/index.ts");

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
  "buildRecommendationCandidate",
  "scoreRecommendationPriority",
  "mapSignalsToRecommendationCandidates",
  "buildRevenueRecommendationCandidates",
  "buildExpenseRecommendationCandidates",
  "buildMarginRecommendationCandidates",
  "buildCashRecommendationCandidates",
  "buildWorkingCapitalRecommendationCandidates",
  "buildOperationsRecommendationCandidates",
  "buildConcentrationRecommendationCandidates",
  "buildBenchmarkRecommendationCandidates",
];

for (const exportName of requiredExports) {
  assert(typeof recommendations[exportName] === "function", `${exportName} exists and is exported`);
}

const highConfidence = {
  score: 0.82,
  tier: "high",
  factors: [],
  factorContributions: [],
  explanationCodes: ["history_24_months", "core_statements_available"],
  inputSummary: { monthsOfHistory: 24, dataCompletenessScore: 1 },
};

const mediumConfidence = {
  ...highConfidence,
  score: 0.72,
  tier: "medium",
};

function signal(overrides) {
  return {
    signalId: "cash_pressure:cash:may-2026",
    signalType: "cash_pressure",
    metricKey: "cash",
    severity: "critical",
    confidence: highConfidence,
    evidenceIds: ["evidence-cash", "evidence-ar"],
    calculationTraceIds: ["trace-cash"],
    sourceMetricIds: ["cash", "balance_sheet"],
    companyMemoryRefs: ["memory-1"],
    relatedSignalIds: ["ar_collection_risk:ar:may-2026"],
    correlationGroupId: "working_capital_pressure",
    rootCauseCandidate: {
      signalId: "ar_collection_risk:ar:may-2026",
      signalType: "ar_collection_risk",
      metricKey: "ar",
      confidence: mediumConfidence,
    },
    status: "created",
    currentValue: 75000,
    comparisonValue: 100000,
    varianceAmount: -25000,
    variancePercent: -25,
    threshold: 5,
    direction: "decrease",
    period: "May 2026",
    metricSeriesKey: "cash",
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

const cashPressure = signal({});
const arRisk = signal({
  signalId: "ar_collection_risk:ar:may-2026",
  signalType: "ar_collection_risk",
  metricKey: "ar",
  severity: "high",
  confidence: mediumConfidence,
  evidenceIds: ["evidence-ar"],
  calculationTraceIds: ["trace-ar"],
  sourceMetricIds: ["ar", "balance_sheet"],
  rootCauseCandidate: undefined,
});
const apPressure = signal({
  signalId: "ap_pressure:ap:may-2026",
  signalType: "ap_pressure",
  metricKey: "ap",
  severity: "medium",
  confidence: mediumConfidence,
  evidenceIds: ["evidence-ap"],
  calculationTraceIds: ["trace-ap"],
  sourceMetricIds: ["ap", "balance_sheet"],
  rootCauseCandidate: undefined,
});

const workingCapital = recommendations.buildWorkingCapitalRecommendationCandidates([cashPressure, arRisk, apPressure], "2026-06-01T00:00:00.000Z");
assert(workingCapital.length === 1, "Correlated working capital signals produce one grouped candidate");
assert(workingCapital[0].recommendationType === "working_capital_liquidity_review", "Grouped candidate uses deterministic internal type");
assert(workingCapital[0].priorityScore === 100 && workingCapital[0].priority === "critical", "Priority score is deterministic");
assert(workingCapital[0].sourceSignalIds.length === 3 && workingCapital[0].sourceSignalIds.includes(cashPressure.signalId), "Source signal IDs are preserved");
assert(workingCapital[0].evidenceIds.includes("evidence-cash") && workingCapital[0].evidenceIds.includes("evidence-ap"), "Evidence IDs are unioned from source signals");
assert(workingCapital[0].calculationTraceIds.includes("trace-cash") && workingCapital[0].calculationTraceIds.includes("trace-ar"), "Trace IDs are unioned from source signals");
assert(workingCapital[0].sourceMetricIds.includes("cash") && workingCapital[0].sourceMetricIds.includes("ar") && workingCapital[0].sourceMetricIds.includes("ap"), "Source metric IDs are preserved");
assert(workingCapital[0].rootCauseCandidate?.signalType === "ar_collection_risk", "Root cause metadata is preserved");
assert(workingCapital[0].rootCauseSignalIds.includes(arRisk.signalId), "Root cause signal IDs are resolved from source signals");
assert(workingCapital[0].correlationGroupId === "working_capital_pressure", "Correlation group metadata is preserved");
assert(workingCapital[0].expectedImpactCategory === "cash", "Impact category is structured metadata");
assert(workingCapital[0].expectedImpactConfidence === "medium", "Impact confidence is structured metadata");
assert(workingCapital[0].affectedMetricIds.includes("cash") && workingCapital[0].affectedMetricIds.includes("ar") && workingCapital[0].affectedMetricIds.includes("ap"), "Affected metric IDs are preserved");
assert(workingCapital[0].recommendationLineage.recommendationId === workingCapital[0].recommendationId, "Lineage points back to recommendation ID");
assert(workingCapital[0].recommendationLineage.sourceSignalIds.length === workingCapital[0].sourceSignalIds.length, "Lineage preserves source signal IDs");
assert(workingCapital[0].recommendationLineage.evidenceIds.includes("evidence-ar"), "Lineage preserves evidence IDs");
assert(workingCapital[0].recommendationLineage.calculationTraceIds.includes("trace-ap"), "Lineage preserves trace IDs");
assert(workingCapital[0].recommendationLineage.correlationGroupId === "working_capital_pressure", "Lineage preserves correlation group");

const marginSignal = signal({
  signalId: "gross_margin_compression:gross_margin:may-2026",
  signalType: "gross_margin_compression",
  metricKey: "gross_margin",
  severity: "high",
  confidence: highConfidence,
  evidenceIds: ["evidence-margin"],
  calculationTraceIds: ["trace-margin"],
  sourceMetricIds: ["gross_margin", "operating_margin"],
  correlationGroupId: undefined,
  rootCauseCandidate: undefined,
});
const marginCandidates = recommendations.buildMarginRecommendationCandidates([marginSignal], "2026-06-01T00:00:00.000Z");
assert(marginCandidates[0].expectedImpactCategory === "margin" && marginCandidates[0].affectedMetricIds.includes("operating_margin"), "Margin candidates include impact metadata");

const mapped = recommendations.mapSignalsToRecommendationCandidates([cashPressure, arRisk, apPressure, marginSignal], "2026-06-01T00:00:00.000Z");
assert(mapped.some((candidate) => candidate.recommendationType === "working_capital_liquidity_review"), "Signal-to-recommendation mapping includes grouped recommendation candidates");

const missingEvidence = recommendations.buildCashRecommendationCandidates([
  signal({ evidenceIds: [] }),
], "2026-06-01T00:00:00.000Z");
assert(missingEvidence.length === 0, "Recommendation candidate is not produced without evidence");

const missingTrace = recommendations.buildCashRecommendationCandidates([
  signal({ calculationTraceIds: [] }),
], "2026-06-01T00:00:00.000Z");
assert(missingTrace.length === 0, "Recommendation candidate is not produced without trace IDs");

const recommendationDir = path.join(root, "lib", "intelligence", "synthetic", "recommendation-engine");
const sourceText = fs.readdirSync(recommendationDir)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => fs.readFileSync(path.join(recommendationDir, file), "utf8"))
  .join("\n");

assert(!/AI wording|customer-facing|forecast|budget|ROI|scenario|what-if|dashboard|financial-package-pdf|powerpoint|pulse|package-ui|lib\/integrations|report-preflight|validation/i.test(sourceText), "Recommendation engine contains no AI, output, forecast, budget, ROI, scenario, provider, or validation wiring");

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI recommendation verification passed.");
