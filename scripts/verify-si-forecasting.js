/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const forecastingRoot = path.join(root, "lib", "intelligence", "synthetic", "forecasting");

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

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return [fullPath];
  });
}

function assertIncludesAny(text, variants, message) {
  assert(variants.some((variant) => text.includes(variant)), message);
}

const requiredDirectories = [
  "lib/intelligence/synthetic/forecasting",
  "lib/intelligence/synthetic/forecasting/evidence",
  "lib/intelligence/synthetic/forecasting/candidates",
  "lib/intelligence/synthetic/forecasting/memory",
];

for (const directory of requiredDirectories) {
  assert(exists(directory), `${directory} exists`);
}

const requiredFiles = [
  "lib/intelligence/synthetic/forecasting/types.ts",
  "lib/intelligence/synthetic/forecasting/constants.ts",
  "lib/intelligence/synthetic/forecasting/index.ts",
  "lib/intelligence/synthetic/forecasting/evidence/buildForecastEvidence.ts",
  "lib/intelligence/synthetic/forecasting/evidence/buildForecastEvidenceCollection.ts",
  "lib/intelligence/synthetic/forecasting/evidence/index.ts",
  "lib/intelligence/synthetic/forecasting/candidates/buildForecastCandidate.ts",
  "lib/intelligence/synthetic/forecasting/candidates/buildForecastCandidates.ts",
  "lib/intelligence/synthetic/forecasting/candidates/index.ts",
  "lib/intelligence/synthetic/forecasting/memory/buildForecastMemoryCandidate.ts",
  "lib/intelligence/synthetic/forecasting/memory/buildForecastMemoryCandidates.ts",
  "lib/intelligence/synthetic/forecasting/memory/index.ts",
];

for (const file of requiredFiles) {
  assert(exists(file), `${file} exists`);
}

const forecastingFiles = listFiles(forecastingRoot).filter((file) => file.endsWith(".ts"));
const allForecastingText = forecastingFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const typesText = read("lib/intelligence/synthetic/forecasting/types.ts");
const constantsText = read("lib/intelligence/synthetic/forecasting/constants.ts");
const evidenceText = read("lib/intelligence/synthetic/forecasting/evidence/buildForecastEvidence.ts");
const evidenceCollectionText = read("lib/intelligence/synthetic/forecasting/evidence/buildForecastEvidenceCollection.ts");
const candidateText = read("lib/intelligence/synthetic/forecasting/candidates/buildForecastCandidate.ts");
const candidatesText = read("lib/intelligence/synthetic/forecasting/candidates/buildForecastCandidates.ts");
const memoryCandidateText = read("lib/intelligence/synthetic/forecasting/memory/buildForecastMemoryCandidate.ts");
const memoryCandidatesText = read("lib/intelligence/synthetic/forecasting/memory/buildForecastMemoryCandidates.ts");
const packageJson = JSON.parse(read("package.json"));

for (const category of [
  "revenue",
  "expense",
  "payroll",
  "workforce",
  "cash",
  "working_capital",
  "inventory",
  "treasury",
  "tax",
  "healthcare",
  "manufacturing",
  "construction",
  "municipality",
  "strategic",
]) {
  assert(constantsText.includes(category) && typesText.includes(category), `${category} forecast category exists`);
}

for (const horizon of [
  "monthly",
  "quarterly",
  "annual",
  "rolling_3_month",
  "rolling_6_month",
  "rolling_12_month",
  "multi_year",
]) {
  assert(constantsText.includes(horizon) && typesText.includes(horizon), `${horizon} forecast horizon exists`);
}

for (const methodology of [
  "trend_based",
  "driver_based",
  "workforce_based",
  "contract_based",
  "project_based",
  "budget_based",
  "historical_actual_based",
  "manual_override",
  "hybrid",
]) {
  assert(constantsText.includes(methodology) && typesText.includes(methodology), `${methodology} forecast methodology exists`);
}

for (const granularityLevel of [
  "enterprise",
  "consolidated",
  "entity",
  "segment",
  "business_unit",
  "department",
  "location",
  "facility",
  "project",
  "contract",
  "fund",
  "account_group",
  "general_ledger_account",
]) {
  assert(
    constantsText.includes(granularityLevel) && typesText.includes(granularityLevel),
    `${granularityLevel} forecast granularity level exists`,
  );
}

for (const source of [
  "system_forecast",
  "management_forecast",
  "budget_forecast",
  "board_forecast",
]) {
  assert(constantsText.includes(source) && typesText.includes(source), `${source} forecast source exists`);
}

for (const contract of [
  "SyntheticForecastCandidate",
  "SyntheticForecastEvidence",
  "SyntheticForecastMetadata",
  "SyntheticForecastAssumption",
  "SyntheticForecastDriver",
  "SyntheticForecastRisk",
  "SyntheticForecastOutcome",
  "SyntheticForecastMethodology",
  "SyntheticForecastGranularity",
  "SyntheticForecastVersion",
  "SyntheticForecastConsensus",
  "SyntheticForecastSensitivity",
  "SyntheticForecastReliability",
  "SyntheticForecastAccuracy",
]) {
  assert(typesText.includes(contract), `${contract} contract exists`);
}

for (const [snakeCase, camelCase] of [
  ["confidence_score", "confidenceScore"],
  ["confidence_reason", "confidenceReason"],
  ["forecast_confidence", "forecastConfidence"],
  ["evidence_strength", "evidenceStrength"],
  ["data_completeness_score", "dataCompletenessScore"],
  ["historical_stability_score", "historicalStabilityScore"],
  ["forecast_risk_score", "forecastRiskScore"],
]) {
  assertIncludesAny(allForecastingText, [snakeCase, camelCase], `${snakeCase} explainability metadata exists`);
}

for (const [snakeCase, camelCase] of [
  ["forecast_accuracy_score", "forecastAccuracyScore"],
  ["forecast_accuracy_percent", "forecastAccuracyPercent"],
  ["forecast_accuracy_trend", "forecastAccuracyTrend"],
  ["forecast_error", "forecastError"],
]) {
  assertIncludesAny(allForecastingText, [snakeCase, camelCase], `${snakeCase} accuracy metadata exists`);
}

for (const [snakeCase, camelCase] of [
  ["forecast_reliability_score", "forecastReliabilityScore"],
  ["forecast_reliability_reason", "forecastReliabilityReason"],
  ["historical_forecast_consistency", "historicalForecastConsistency"],
]) {
  assertIncludesAny(allForecastingText, [snakeCase, camelCase], `${snakeCase} reliability metadata exists`);
}

for (const [snakeCase, camelCase] of [
  ["forecast_version", "forecastVersion"],
  ["prior_forecast_version", "priorForecastVersion"],
  ["forecast_revision_reason", "forecastRevisionReason"],
  ["forecast_delta", "forecastDelta"],
]) {
  assertIncludesAny(allForecastingText, [snakeCase, camelCase], `${snakeCase} version metadata exists`);
}

for (const [snakeCase, camelCase] of [
  ["forecast_consensus", "forecastConsensus"],
  ["forecast_variance_to_budget", "forecastVarianceToBudget"],
  ["forecast_variance_to_management", "forecastVarianceToManagement"],
  ["forecast_variance_to_board", "forecastVarianceToBoard"],
]) {
  assertIncludesAny(allForecastingText, [snakeCase, camelCase], `${snakeCase} consensus metadata exists`);
}

for (const [snakeCase, camelCase] of [
  ["forecast_driver_sensitivity", "forecastDriverSensitivity"],
  ["forecast_driver_impact_rank", "forecastDriverImpactRank"],
  ["sensitivity_score", "sensitivityScore"],
]) {
  assertIncludesAny(allForecastingText, [snakeCase, camelCase], `${snakeCase} sensitivity metadata exists`);
}

for (const [snakeCase, camelCase] of [
  ["forecast_bias_direction", "forecastBiasDirection"],
  ["forecast_bias_magnitude", "forecastBiasMagnitude"],
  ["forecast_bias_confidence", "forecastBiasConfidence"],
]) {
  assertIncludesAny(allForecastingText, [snakeCase, camelCase], `${snakeCase} bias metadata exists`);
}

for (const [snakeCase, camelCase] of [
  ["seasonality_factor", "seasonalityFactor"],
  ["seasonality_pattern", "seasonalityPattern"],
  ["seasonality_confidence", "seasonalityConfidence"],
]) {
  assertIncludesAny(allForecastingText, [snakeCase, camelCase], `${snakeCase} seasonality metadata exists`);
}

for (const [snakeCase, camelCase] of [
  ["macroeconomic_indicator_ids", "macroeconomicIndicatorIds"],
  ["macroeconomic_assumptions", "macroeconomicAssumptions"],
  ["macroeconomic_confidence", "macroeconomicConfidence"],
]) {
  assertIncludesAny(allForecastingText, [snakeCase, camelCase], `${snakeCase} macroeconomic metadata exists`);
}

for (const [snakeCase, camelCase] of [
  ["forecast_review_status", "forecastReviewStatus"],
  ["forecast_approval_status", "forecastApprovalStatus"],
  ["forecast_approval_level", "forecastApprovalLevel"],
]) {
  assertIncludesAny(allForecastingText, [snakeCase, camelCase], `${snakeCase} approval metadata exists`);
}

for (const [snakeCase, camelCase] of [
  ["forecast_source_level", "forecastSourceLevel"],
  ["forecast_rollup_level", "forecastRollupLevel"],
  ["forecast_lineage", "forecastLineage"],
]) {
  assertIncludesAny(allForecastingText, [snakeCase, camelCase], `${snakeCase} granularity metadata exists`);
}

for (const [snakeCase, camelCase] of [
  ["methodology_id", "methodologyId"],
  ["methodology_category", "methodologyCategory"],
  ["methodology_confidence", "methodologyConfidence"],
  ["methodology_reason", "methodologyReason"],
  ["methodology_lineage", "methodologyLineage"],
]) {
  assertIncludesAny(allForecastingText, [snakeCase, camelCase], `${snakeCase} methodology metadata exists`);
}

for (const [category, memoryKey] of [
  ["revenue", "revenue_forecast"],
  ["expense", "expense_forecast"],
  ["payroll", "payroll_forecast"],
  ["workforce", "workforce_forecast"],
  ["cash", "cash_forecast"],
  ["working_capital", "working_capital_forecast"],
  ["inventory", "inventory_forecast"],
  ["treasury", "treasury_forecast"],
  ["tax", "tax_forecast"],
  ["healthcare", "healthcare_forecast"],
  ["manufacturing", "manufacturing_forecast"],
  ["construction", "construction_forecast"],
  ["municipality", "municipality_forecast"],
  ["strategic", "strategic_forecast"],
]) {
  assert(memoryCandidateText.includes(`${category}: "${memoryKey}"`), `${category} maps to ${memoryKey}`);
}

assert(evidenceText.includes("stableSnapshotHash"), "evidence uses deterministic hashing");
assert(candidateText.includes("stableSnapshotHash"), "candidates use deterministic hashing");
assert(memoryCandidateText.includes("stableSnapshotHash"), "memory candidates use deterministic hashing");
assert(evidenceText.includes("evidencePackage: null") && evidenceText.includes("warnings"), "evidence fails closed with warnings");
assert(candidateText.includes("candidate: null") && candidateText.includes("warnings"), "candidates fail closed with warnings");
assert(memoryCandidateText.includes("candidate: null") && memoryCandidateText.includes("warnings"), "memory candidates fail closed with warnings");
assert(evidenceCollectionText.includes("input.requests.forEach"), "evidence collection preserves input order");
assert(candidatesText.includes("input.requests.forEach"), "candidate batch preserves input order");
assert(memoryCandidatesText.includes("input.candidates.forEach"), "memory candidate batch preserves input order");

const forbiddenPatterns = [
  { pattern: /@supabase\/supabase-js|createClient\(/i, message: "Supabase imports do not exist" },
  { pattern: /\.(select|from)\s*\(/i, message: "database reads do not exist" },
  { pattern: /\.(insert|upsert|update|delete|rpc)\s*\(/i, message: "database writes do not exist" },
  { pattern: /service[_-]?role/i, message: "service-role usage does not exist" },
  { pattern: /\bfetch\s*\(|XMLHttpRequest|axios\./i, message: "external API calls do not exist" },
  { pattern: /from\s+["']openai["']|@openai|new\s+OpenAI\b/i, message: "OpenAI imports do not exist" },
  { pattern: /\b(ai|llm)Client\b|generateWithAI|invokeAI|callAI/i, message: "AI calls do not exist" },
  { pattern: /generateForecast|forecastGenerator|forecastAmount|forecastValue\s*[:=]|customerFacingForecast/i, message: "forecast generation does not exist" },
  { pattern: /calculateForecast|computedForecast|forecastCalculation|forecastCalculator/i, message: "forecast calculations do not exist" },
  { pattern: /predictionEngine|predictiveModel|predictForecast|predictionResult/i, message: "prediction engines do not exist" },
  { pattern: /machineLearning|mlModel|trainModel|modelInference/i, message: "machine learning implementations do not exist" },
  { pattern: /scenarioModel|scenario_model|scenario-engine|buildScenario/i, message: "scenario modeling implementations do not exist" },
  { pattern: /persistCompanyMemory|memoryPersistence|company-memory-persistence|buildCompanyMemoryRecord\s*\(/i, message: "Company Memory persistence calls do not exist" },
  { pattern: /reviewMemoryCandidate|buildPromotionDecision|approved_for_promotion|executePromotion/i, message: "promotion execution calls do not exist" },
  { pattern: /app[\\/]dashboard|dashboard/i, message: "dashboard wiring does not exist" },
  { pattern: /pdf|financial-package-pdf/i, message: "PDF wiring does not exist" },
  { pattern: /powerpoint|pptx/i, message: "PowerPoint wiring does not exist" },
  { pattern: /from\s+["'][^"']*pulse|pulseEngine|pulseClient|sendToPulse|publishToPulse/i, message: "Pulse wiring does not exist" },
];

for (const { pattern, message } of forbiddenPatterns) {
  assert(!pattern.test(allForecastingText), message);
}

assert(
  packageJson.scripts?.["verify:si-forecasting"] === "node scripts/verify-si-forecasting.js",
  "package script verify:si-forecasting exists",
);

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI Forecasting verification passed.");
