/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const scenariosRoot = path.join(root, "lib", "intelligence", "synthetic", "scenarios");

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
  "lib/intelligence/synthetic/scenarios",
  "lib/intelligence/synthetic/scenarios/evidence",
  "lib/intelligence/synthetic/scenarios/candidates",
  "lib/intelligence/synthetic/scenarios/memory",
];

for (const directory of requiredDirectories) {
  assert(exists(directory), `${directory} exists`);
}

const requiredFiles = [
  "lib/intelligence/synthetic/scenarios/types.ts",
  "lib/intelligence/synthetic/scenarios/constants.ts",
  "lib/intelligence/synthetic/scenarios/index.ts",
  "lib/intelligence/synthetic/scenarios/evidence/buildScenarioEvidence.ts",
  "lib/intelligence/synthetic/scenarios/evidence/buildScenarioEvidenceCollection.ts",
  "lib/intelligence/synthetic/scenarios/evidence/index.ts",
  "lib/intelligence/synthetic/scenarios/candidates/buildScenarioCandidate.ts",
  "lib/intelligence/synthetic/scenarios/candidates/buildScenarioCandidates.ts",
  "lib/intelligence/synthetic/scenarios/candidates/index.ts",
  "lib/intelligence/synthetic/scenarios/memory/buildScenarioMemoryCandidate.ts",
  "lib/intelligence/synthetic/scenarios/memory/buildScenarioMemoryCandidates.ts",
  "lib/intelligence/synthetic/scenarios/memory/index.ts",
];

for (const file of requiredFiles) {
  assert(exists(file), `${file} exists`);
}

const scenarioFiles = listFiles(scenariosRoot).filter((file) => file.endsWith(".ts"));
const allScenarioText = scenarioFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const typesText = read("lib/intelligence/synthetic/scenarios/types.ts");
const constantsText = read("lib/intelligence/synthetic/scenarios/constants.ts");
const evidenceText = read("lib/intelligence/synthetic/scenarios/evidence/buildScenarioEvidence.ts");
const evidenceCollectionText = read("lib/intelligence/synthetic/scenarios/evidence/buildScenarioEvidenceCollection.ts");
const candidateText = read("lib/intelligence/synthetic/scenarios/candidates/buildScenarioCandidate.ts");
const candidatesText = read("lib/intelligence/synthetic/scenarios/candidates/buildScenarioCandidates.ts");
const memoryCandidateText = read("lib/intelligence/synthetic/scenarios/memory/buildScenarioMemoryCandidate.ts");
const memoryCandidatesText = read("lib/intelligence/synthetic/scenarios/memory/buildScenarioMemoryCandidates.ts");
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
  "government_contracting",
  "strategic",
]) {
  assert(constantsText.includes(category) && typesText.includes(category), `${category} scenario category exists`);
}

for (const scenarioType of [
  "best_case",
  "expected_case",
  "worst_case",
  "management_case",
  "stress_case",
  "upside_case",
  "downside_case",
  "custom_case",
]) {
  assert(constantsText.includes(scenarioType) && typesText.includes(scenarioType), `${scenarioType} scenario type exists`);
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
  assert(constantsText.includes(horizon) && typesText.includes(horizon), `${horizon} scenario horizon exists`);
}

for (const methodology of [
  "assumption_change",
  "driver_change",
  "recommendation_inclusion",
  "risk_event",
  "sensitivity_case",
  "stress_test",
  "portfolio_case",
  "manual_case",
  "hybrid_case",
]) {
  assert(constantsText.includes(methodology) && typesText.includes(methodology), `${methodology} scenario methodology exists`);
}

for (const granularity of [
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
  assert(constantsText.includes(granularity) && typesText.includes(granularity), `${granularity} scenario granularity exists`);
}

for (const contract of [
  "SyntheticScenarioCandidate",
  "SyntheticScenarioEvidence",
  "SyntheticScenarioMetadata",
  "SyntheticScenarioAssumption",
  "SyntheticScenarioDriver",
  "SyntheticScenarioImpact",
  "SyntheticScenarioRisk",
  "SyntheticScenarioConstraint",
  "SyntheticScenarioDependency",
  "SyntheticScenarioFeasibility",
  "SyntheticScenarioVersion",
  "SyntheticScenarioPortfolio",
  "SyntheticScenarioComparison",
  "SyntheticScenarioMethodology",
]) {
  assert(typesText.includes(contract), `${contract} contract exists`);
}

for (const [snakeCase, camelCase] of [
  ["confidence_score", "confidenceScore"],
  ["confidence_reason", "confidenceReason"],
  ["scenario_confidence", "scenarioConfidence"],
  ["evidence_strength", "evidenceStrength"],
  ["data_completeness_score", "dataCompletenessScore"],
  ["assumption_confidence", "assumptionConfidence"],
  ["driver_confidence", "driverConfidence"],
  ["scenario_risk_score", "scenarioRiskScore"],
]) {
  assertIncludesAny(allScenarioText, [snakeCase, camelCase], `${snakeCase} explainability metadata exists`);
}

for (const [snakeCase, camelCase] of [
  ["constraint_id", "constraintId"],
  ["constraint_category", "constraintCategory"],
  ["constraint_description", "constraintDescription"],
  ["constraint_severity", "constraintSeverity"],
]) {
  assertIncludesAny(allScenarioText, [snakeCase, camelCase], `${snakeCase} constraint metadata exists`);
}

for (const [snakeCase, camelCase] of [
  ["dependency_id", "dependencyId"],
  ["dependency_category", "dependencyCategory"],
  ["dependency_description", "dependencyDescription"],
  ["dependency_status", "dependencyStatus"],
]) {
  assertIncludesAny(allScenarioText, [snakeCase, camelCase], `${snakeCase} dependency metadata exists`);
}

for (const [snakeCase, camelCase] of [
  ["feasibility_score", "feasibilityScore"],
  ["feasibility_reason", "feasibilityReason"],
  ["feasibility_constraints", "feasibilityConstraints"],
  ["feasibility_confidence", "feasibilityConfidence"],
]) {
  assertIncludesAny(allScenarioText, [snakeCase, camelCase], `${snakeCase} feasibility metadata exists`);
}

for (const [snakeCase, camelCase] of [
  ["trigger_event_id", "triggerEventId"],
  ["trigger_event_category", "triggerEventCategory"],
  ["trigger_event_probability", "triggerEventProbability"],
]) {
  assertIncludesAny(allScenarioText, [snakeCase, camelCase], `${snakeCase} trigger event compatibility exists`);
}

for (const [snakeCase, camelCase] of [
  ["historical_scenario_ids", "historicalScenarioIds"],
  ["historical_outcome_ids", "historicalOutcomeIds"],
  ["historical_effectiveness", "historicalEffectiveness"],
  ["historical_constraints", "historicalConstraints"],
  ["historical_behavior_patterns", "historicalBehaviorPatterns"],
  ["historical_success_rate", "historicalSuccessRate"],
  ["historical_failure_patterns", "historicalFailurePatterns"],
  ["behavior_pattern_id", "behaviorPatternId"],
  ["behavior_pattern_category", "behaviorPatternCategory"],
  ["success_probability", "successProbability"],
  ["success_probability_confidence", "successProbabilityConfidence"],
  ["success_probability_reason", "successProbabilityReason"],
  ["organizational_capacity_score", "organizationalCapacityScore"],
  ["change_capacity_score", "changeCapacityScore"],
  ["execution_bandwidth", "executionBandwidth"],
  ["decision_collision_ids", "decisionCollisionIds"],
  ["collision_category", "collisionCategory"],
  ["memory_adjusted_outcome", "memoryAdjustedOutcome"],
  ["historical_realization_rate", "historicalRealizationRate"],
]) {
  assertIncludesAny(allScenarioText, [snakeCase, camelCase], `${snakeCase} institutional intelligence exists`);
}

for (const [category, memoryKey] of [
  ["revenue", "revenue_scenario"],
  ["expense", "expense_scenario"],
  ["payroll", "payroll_scenario"],
  ["workforce", "workforce_scenario"],
  ["cash", "cash_scenario"],
  ["working_capital", "working_capital_scenario"],
  ["inventory", "inventory_scenario"],
  ["treasury", "treasury_scenario"],
  ["tax", "tax_scenario"],
  ["healthcare", "healthcare_scenario"],
  ["manufacturing", "manufacturing_scenario"],
  ["construction", "construction_scenario"],
  ["municipality", "municipality_scenario"],
  ["government_contracting", "government_contracting_scenario"],
  ["strategic", "strategic_scenario"],
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
  { pattern: /generateScenario|scenarioGenerator|scenarioOutput|customerFacingScenario/i, message: "scenario generation does not exist" },
  { pattern: /simulationEngine|simulateScenario|simulationResult|runSimulation/i, message: "simulation engines do not exist" },
  { pattern: /calculateScenario|scenarioCalculation|computedScenario/i, message: "scenario calculations do not exist" },
  { pattern: /predictionEngine|predictiveModel|predictScenario|predictionResult/i, message: "prediction engines do not exist" },
  { pattern: /machineLearning|mlModel|trainModel|modelInference/i, message: "machine learning implementations do not exist" },
  { pattern: /persistCompanyMemory|memoryPersistence|company-memory-persistence|buildCompanyMemoryRecord\s*\(/i, message: "Company Memory persistence calls do not exist" },
  { pattern: /reviewMemoryCandidate|buildPromotionDecision|approved_for_promotion|executePromotion/i, message: "promotion execution calls do not exist" },
  { pattern: /app[\\/]dashboard|dashboard/i, message: "dashboard wiring does not exist" },
  { pattern: /pdf|financial-package-pdf/i, message: "PDF wiring does not exist" },
  { pattern: /powerpoint|pptx/i, message: "PowerPoint wiring does not exist" },
  { pattern: /from\s+["'][^"']*pulse|pulseEngine|pulseClient|sendToPulse|publishToPulse/i, message: "Pulse wiring does not exist" },
];

for (const { pattern, message } of forbiddenPatterns) {
  assert(!pattern.test(allScenarioText), message);
}

assert(
  packageJson.scripts?.["verify:si-scenarios"] === "node scripts/verify-si-scenarios.js",
  "package script verify:si-scenarios exists",
);

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI Scenarios verification passed.");
