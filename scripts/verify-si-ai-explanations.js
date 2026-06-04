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
const explanations = require("../lib/intelligence/synthetic/explanation-engine/index.ts");

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
  "explanationClaimRegistry",
  "getExplanationClaimRegistryEntry",
  "recommendationActionRegistry",
  "getRecommendationActionRegistryEntry",
  "buildExplanationContext",
  "buildExplanationPrompt",
  "validateExplanationObject",
  "buildExplanationObject",
  "mapRecommendationsToExplanationInputs",
];

for (const exportName of requiredExports) {
  assert(explanations[exportName] !== undefined, `${exportName} exists and is exported`);
}

const confidence = {
  score: 0.82,
  tier: "high",
  factors: [],
  factorContributions: [],
  explanationCodes: ["history_24_months", "core_statements_available"],
  inputSummary: { monthsOfHistory: 24, dataCompletenessScore: 1 },
};

const recommendation = {
  recommendationId: "working_capital_liquidity_review:cash_pressure:cash:may-2026",
  category: "working_capital",
  recommendationType: "working_capital_liquidity_review",
  priority: "critical",
  priorityScore: 100,
  severity: "critical",
  confidence,
  sourceSignalIds: ["cash_pressure:cash:may-2026", "ar_collection_risk:ar:may-2026"],
  evidenceIds: ["evidence-cash", "evidence-ar"],
  calculationTraceIds: ["trace-cash", "trace-ar"],
  sourceMetricIds: ["cash", "ar"],
  correlationGroupId: "working_capital_pressure",
  relatedRecommendationIds: [],
  rootCauseCandidate: {
    signalId: "ar_collection_risk:ar:may-2026",
    signalType: "ar_collection_risk",
    metricKey: "ar",
    confidence,
  },
  rootCauseSignalIds: ["ar_collection_risk:ar:may-2026"],
  expectedImpactCategory: "cash",
  expectedImpactConfidence: "medium",
  affectedMetricIds: ["cash", "ar", "ap"],
  recommendationLineage: {
    recommendationId: "working_capital_liquidity_review:cash_pressure:cash:may-2026",
    sourceSignalIds: ["cash_pressure:cash:may-2026", "ar_collection_risk:ar:may-2026"],
    sourceMetricIds: ["cash", "ar"],
    evidenceIds: ["evidence-cash", "evidence-ar"],
    calculationTraceIds: ["trace-cash", "trace-ar"],
    rootCauseSignalIds: ["ar_collection_risk:ar:may-2026"],
    correlationGroupId: "working_capital_pressure",
  },
  status: "candidate",
  createdAt: "2026-06-01T00:00:00.000Z",
};

const explanationInput = explanations.buildExplanationContext({
  recommendation,
  createdAt: "2026-06-01T00:00:00.000Z",
});
assert(explanationInput !== null, "Explanation context resolves claim and action registry entries");
assert(explanationInput.claimRegistryEntry.claimType === "working_capital_liquidity_review", "Explanation claim registry constrains claim type");
assert(explanationInput.actionRegistryEntry.allowedActionTypes.includes("review"), "Recommendation action registry constrains action types");

const prompt = explanations.buildExplanationPrompt(explanationInput);
assert(prompt.instruction === "explain_summarize_rephrase_only", "Prompt request is explain, summarize, rephrase only");
assert(prompt.allowedCitationIds.includes(recommendation.recommendationId) && prompt.allowedCitationIds.includes("evidence-ar"), "Prompt request is bounded by recommendation lineage");

const explanation = explanations.buildExplanationObject({
  explanationInput,
  promptRequest: prompt,
  explanationId: "explanation-1",
  mockOutput: {
    claimType: "working_capital_liquidity_review",
    languageCategory: "risk",
    actionType: "review",
    explanationSummary: "The recommendation is tied to cash pressure and AR collection risk already identified by SI.",
    keyDrivers: ["Cash and AR source metrics are linked through the working capital pressure group."],
    citationIds: [recommendation.recommendationId, "cash_pressure:cash:may-2026", "cash", "evidence-cash", "trace-cash"],
  },
});

assert(explanation.recommendationId === recommendation.recommendationId, "Explanation preserves recommendation ID");
assert(explanation.sourceSignalIds.length === 2 && explanation.sourceSignalIds.includes("cash_pressure:cash:may-2026"), "Explanation preserves source signal IDs");
assert(explanation.sourceMetricIds.includes("cash") && explanation.sourceMetricIds.includes("ar"), "Explanation preserves source metric IDs");
assert(explanation.evidenceIds.includes("evidence-cash") && explanation.evidenceIds.includes("evidence-ar"), "Explanation preserves evidence IDs");
assert(explanation.confidenceScore === recommendation.confidence.score && explanation.confidenceTier === recommendation.confidence.tier, "Explanation copies confidence without creating confidence");
assert(explanation.explanationLineage.explanationId === "explanation-1", "Explanation lineage includes explanation ID");
assert(explanation.explanationLineage.recommendationId === recommendation.recommendationId, "Explanation lineage includes recommendation ID");
assert(explanation.explanationLineage.sourceSignalIds.includes("ar_collection_risk:ar:may-2026"), "Explanation lineage preserves signal IDs");
assert(explanation.explanationLineage.sourceMetricIds.includes("cash"), "Explanation lineage preserves metric IDs");
assert(explanation.explanationLineage.evidenceIds.includes("evidence-ar"), "Explanation lineage preserves evidence IDs");
assert(explanation.explanationLineage.calculationTraceIds.includes("trace-ar"), "Explanation lineage preserves trace IDs");
assert(explanation.explanationGuardrailResult.status === "passed", "Guardrail result passes allowed fixture output");
assert(explanation.evidenceCitations.every((citation) => prompt.allowedCitationIds.includes(citation.sourceId)), "Citations reference allowed lineage IDs only");

const unsupported = explanations.buildExplanationObject({
  explanationInput,
  promptRequest: prompt,
  explanationId: "explanation-unsupported",
  mockOutput: {
    claimType: "working_capital_liquidity_review",
    languageCategory: "risk",
    actionType: "review",
    explanationSummary: "This will increase cash next month.",
    keyDrivers: ["Attempted unsupported forward-looking claim."],
    citationIds: [recommendation.recommendationId, "evidence-cash"],
    attemptedUnsupportedClaims: ["attempted_unsupported_forecast_statement"],
  },
});
assert(unsupported.explanationGuardrailResult.status === "failed", "Guardrail result fails unsupported forecast-like fixture output");
assert(unsupported.explanationSummary === "" && unsupported.keyDrivers.length === 0, "Blocked claims are not emitted as explanation output");
assert(unsupported.explanationGuardrailResult.blockedClaims.includes("attempted_unsupported_forecast_statement"), "Blocked claims are captured for audit");

const unknownCitation = explanations.buildExplanationObject({
  explanationInput,
  promptRequest: prompt,
  explanationId: "explanation-unknown-citation",
  mockOutput: {
    claimType: "working_capital_liquidity_review",
    languageCategory: "risk",
    actionType: "review",
    explanationSummary: "The explanation uses a citation that is outside lineage.",
    keyDrivers: ["Unknown citation should be blocked."],
    citationIds: ["external-id"],
  },
});
assert(unknownCitation.explanationGuardrailResult.status === "failed", "Unknown citation fails validation");

const explanationDir = path.join(root, "lib", "intelligence", "synthetic", "explanation-engine");
const sourceText = fs.readdirSync(explanationDir)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => fs.readFileSync(path.join(explanationDir, file), "utf8"))
  .join("\n");

const forbiddenRuntimePatterns = [
  /from\s+["']openai["']/i,
  /from\s+["'](@ai-sdk|ai|langchain|@langchain|anthropic|@anthropic-ai)[^"']*["']/i,
  /OPENAI_API_KEY|ANTHROPIC_API_KEY|API_KEY/i,
  /\bfetch\s*\(/,
  /\baxios\b|\bXMLHttpRequest\b/i,
  /\bcreate(Chat|Completion)|chat\.completions|responses\.create/i,
  /from\s+["'][^"']*app\/dashboard/i,
  /from\s+["'][^"']*financial-package-pdf/i,
  /from\s+["'][^"']*powerpoint/i,
  /from\s+["'][^"']*pulse/i,
  /from\s+["'][^"']*package-ui/i,
  /from\s+["'][^"']*lib\/integrations/i,
  /from\s+["'][^"']*report-preflight/i,
];

for (const pattern of forbiddenRuntimePatterns) {
  assert(!pattern.test(sourceText), `Forbidden runtime/output/provider/API pattern absent: ${pattern}`);
}

assert(!/\b(build|create|generate)(Signal|Recommendation|Evidence|Forecast|Budget|Scenario|Kpi|KPI|FinancialCalculation)\b/.test(sourceText), "Explanation engine does not create SI reasoning artifacts");
assert(explanations.explanationClaimRegistry.every((entry) => entry.disallowedLanguageCategories.includes("forecast") && entry.disallowedLanguageCategories.includes("budget")), "Claim registry blocks future drift categories");
assert(explanations.recommendationActionRegistry.every((entry) => entry.disallowedActionTypes.includes("execute") && entry.disallowedActionTypes.includes("predict")), "Action registry blocks execution and prediction language");

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI AI explanation verification passed.");
