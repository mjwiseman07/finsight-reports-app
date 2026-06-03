/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const Module = require("module");
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
const originalLoad = Module._load;
Module._load = function loadWithoutRuntimeSideEffects(request, parent, isMain) {
  return originalLoad.call(this, request, parent, isMain);
};

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) fail(message);
  else pass(message);
}

const evidence = require("../lib/intelligence/synthetic/evidence-store/index.ts");
const confidence = require("../lib/intelligence/synthetic/confidence-scoring/index.ts");

const sourceRef = evidence.buildEvidenceSourceRef({
  snapshotId: "snapshot-1",
  syncId: "sync-1",
  sourceSystem: "xero",
  sourceReport: "BalanceSheet",
  externalEntityId: "tenant-1",
  externalRecordId: "row-1",
  rowLabel: "Cash",
  rowSection: "Current Assets",
});
assert(sourceRef.snapshotId === "snapshot-1" && sourceRef.rowSection === "Current Assets", "Evidence source refs are deterministic");

const current = { metricKey: "revenue", value: 120, unit: "currency", period: "current" };
const prior = { metricKey: "revenue", value: 100, unit: "currency", period: "prior" };
const comparison = evidence.buildEvidenceComparison(current, prior);
assert(comparison.varianceAmount === 20 && comparison.variancePercent === 20, "Evidence comparisons compute variance correctly");

const evidenceRecord = evidence.buildEvidenceRecord({
  id: "evidence-1",
  companyId: "company-1",
  moduleKey: "confidence_scoring",
  evidenceType: "period_comparison",
  sourceRefs: [sourceRef],
  metrics: [current],
  comparisons: [comparison],
  qualityFlags: ["complete"],
  createdAt: "2026-06-01T00:00:00.000Z",
});
assert(evidenceRecord.sourceRefs.length === 1 && evidenceRecord.qualityFlags[0] === "complete", "Evidence records include refs and quality flags");

const step = evidence.buildCalculationStep({
  stepId: "step-1",
  label: "Revenue variance",
  formulaRef: "variance_percent",
  inputs: [{ key: "current", value: 120 }, { key: "prior", value: 100 }],
  outputs: [{ key: "variancePercent", value: 20, unit: "percent" }],
});
const trace = evidence.buildCalculationTrace({
  id: "trace-1",
  moduleKey: "confidence_scoring",
  metricKey: "revenue",
  period: "2026-05",
  steps: [step],
  evidenceIds: ["evidence-1"],
  createdAt: "2026-06-01T00:00:00.000Z",
});
assert(trace.steps[0].stepId === "step-1" && trace.evidenceIds[0] === "evidence-1", "Calculation traces preserve ordered steps and evidence IDs");

const historyFactors = confidence.scoreHistoryCoverage({
  coverage: {
    requestedMonths: 24,
    availableMonths: 24,
    hasBalanceSheet: true,
    hasIncomeStatement: true,
  },
});
assert(historyFactors[0].code === "history_24_months" && historyFactors[0].factorContribution === 0.25, "History coverage scores 24 months correctly");

const dataFactors = confidence.scoreDataCompleteness({ hasCoreStatements: true, hasCashFlow: false });
assert(dataFactors.some((factor) => factor.code === "cash_flow_missing" && factor.factorContribution === -0.1), "Data completeness identifies missing cash flow");

const validationFactors = confidence.scoreValidationResult({ readyForReporting: true, warningCount: 4 });
assert(validationFactors[0].code === "validation_warnings_present" && validationFactors[0].factorContribution === -0.2, "Validation scoring penalizes warnings without changing validation output");

const industryFactors = confidence.scoreIndustryProfileCoverage({
  metricKey: "revenue",
  benchmarkAvailable: false,
  profile: {
    industryKey: "general",
    displayName: "General",
    metricCatalog: [{ metricKey: "revenue", label: "Revenue" }],
  },
});
assert(industryFactors.some((factor) => factor.code === "industry_profile_present"), "Industry profile coverage handles present profile data");

const memoryFactors = confidence.scoreCompanyMemoryCoverage([
  {
    id: "memory-1",
    companyId: "company-1",
    recordType: "recurring_pattern",
    recurringPattern: { patternKey: "seasonal_revenue", description: "Revenue is seasonal" },
    createdAt: "2026-06-01T00:00:00.000Z",
  },
]);
assert(memoryFactors[0].code === "company_memory_present" && memoryFactors[0].factorContribution > 0, "Company memory coverage handles present memory data");

const score = confidence.buildConfidenceScore({
  baseScore: 0.5,
  factors: [
    { code: "history_12_months_available", label: "History Coverage", impact: "positive", factorContribution: 0.25 },
    { code: "industry_profile_present", label: "Industry Profile", impact: "positive", factorContribution: 0.15 },
    { code: "company_memory_present", label: "Company Memory", impact: "positive", factorContribution: 0.05 },
    { code: "validation_warnings_present", label: "Validation Warnings", impact: "negative", factorContribution: -0.2 },
    { code: "cash_flow_missing", label: "Missing Cash Flow", impact: "negative", factorContribution: -0.03 },
  ],
  inputSummary: { monthsOfHistory: 12, validationWarningCount: 4 },
});
assert(score.score === 0.72 && score.tier === "medium", "Confidence score preserves contribution math and medium tier");
assert(score.explanationCodes.includes("history_12_months_available") && score.explanationCodes.includes("cash_flow_missing"), "Confidence score returns structured explanation codes");

const explanation = confidence.buildConfidenceExplanation(score);
assert(explanation.dataGaps.includes("cash_flow_missing") && explanation.limitingFactors.length === 2, "Confidence explanation returns deterministic metadata without AI wording");

const syntheticFiles = fs.readdirSync(path.join(root, "lib", "intelligence", "synthetic"), { recursive: true })
  .filter((file) => /\.(ts|js)$/.test(String(file)))
  .map((file) => path.join(root, "lib", "intelligence", "synthetic", String(file)));
const forbiddenImport = syntheticFiles.find((file) => {
  const source = fs.readFileSync(file, "utf8");
  return /app\/dashboard|app\/onboarding|financial-package-pdf|powerpoint|lib\/integrations|report-preflight|package-ui|pulse/i.test(source);
});
assert(!forbiddenImport, "No protected UI, provider, validation, report, package, or AI imports are present");

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI evidence and confidence verification passed.");
