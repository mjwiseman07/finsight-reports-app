/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const recommendationsRoot = path.join(root, "lib", "intelligence", "synthetic", "recommendations");

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
  "lib/intelligence/synthetic/recommendations",
  "lib/intelligence/synthetic/recommendations/evidence",
  "lib/intelligence/synthetic/recommendations/candidates",
  "lib/intelligence/synthetic/recommendations/memory",
];

for (const directory of requiredDirectories) {
  assert(exists(directory), `${directory} exists`);
}

const requiredFiles = [
  "lib/intelligence/synthetic/recommendations/types.ts",
  "lib/intelligence/synthetic/recommendations/constants.ts",
  "lib/intelligence/synthetic/recommendations/index.ts",
  "lib/intelligence/synthetic/recommendations/evidence/buildRecommendationEvidence.ts",
  "lib/intelligence/synthetic/recommendations/evidence/buildRecommendationEvidenceCollection.ts",
  "lib/intelligence/synthetic/recommendations/evidence/index.ts",
  "lib/intelligence/synthetic/recommendations/candidates/buildRecommendationCandidate.ts",
  "lib/intelligence/synthetic/recommendations/candidates/buildRecommendationCandidates.ts",
  "lib/intelligence/synthetic/recommendations/candidates/index.ts",
  "lib/intelligence/synthetic/recommendations/memory/buildRecommendationMemoryCandidate.ts",
  "lib/intelligence/synthetic/recommendations/memory/buildRecommendationMemoryCandidates.ts",
  "lib/intelligence/synthetic/recommendations/memory/index.ts",
];

for (const file of requiredFiles) {
  assert(exists(file), `${file} exists`);
}

const recommendationFiles = listFiles(recommendationsRoot).filter((file) => file.endsWith(".ts"));
const allRecommendationText = recommendationFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const typesText = read("lib/intelligence/synthetic/recommendations/types.ts");
const constantsText = read("lib/intelligence/synthetic/recommendations/constants.ts");
const evidenceText = read("lib/intelligence/synthetic/recommendations/evidence/buildRecommendationEvidence.ts");
const evidenceCollectionText = read("lib/intelligence/synthetic/recommendations/evidence/buildRecommendationEvidenceCollection.ts");
const candidateText = read("lib/intelligence/synthetic/recommendations/candidates/buildRecommendationCandidate.ts");
const candidatesText = read("lib/intelligence/synthetic/recommendations/candidates/buildRecommendationCandidates.ts");
const memoryCandidateText = read("lib/intelligence/synthetic/recommendations/memory/buildRecommendationMemoryCandidate.ts");
const memoryCandidatesText = read("lib/intelligence/synthetic/recommendations/memory/buildRecommendationMemoryCandidates.ts");
const packageJson = JSON.parse(read("package.json"));

for (const contract of [
  "SyntheticRecommendationCandidate",
  "SyntheticRecommendationEvidence",
  "SyntheticRecommendationMetadata",
  "SyntheticRecommendationImpact",
  "SyntheticRecommendationEffort",
  "SyntheticRecommendationOwnership",
  "SyntheticRecommendationDependency",
  "SyntheticRecommendationConflict",
  "SyntheticRecommendationOutcome",
  "SyntheticRecommendationPortfolio",
  "SyntheticRecommendationSimulationCompatibility",
  "SyntheticStructuredRecommendationCandidate",
  "SyntheticRecommendationMemoryCandidate",
]) {
  assert(allRecommendationText.includes(contract), `${contract} contract exists`);
}

for (const category of [
  "revenue",
  "expense",
  "payroll",
  "workforce",
  "cash",
  "working_capital",
  "inventory",
  "procurement",
  "customer",
  "treasury",
  "tax",
  "healthcare",
  "manufacturing",
  "construction",
  "municipality",
  "strategic",
]) {
  assert(constantsText.includes(category) && typesText.includes(category), `${category} recommendation category exists`);
}

for (const recommendationType of [
  "efficiency_recommendation",
  "risk_mitigation_recommendation",
  "working_capital_recommendation",
  "growth_recommendation",
  "margin_recommendation",
  "compliance_recommendation",
  "strategic_recommendation",
  "operational_recommendation",
  "cash_flow_recommendation",
  "workforce_recommendation",
]) {
  assert(
    constantsText.includes(recommendationType) && typesText.includes(recommendationType),
    `${recommendationType} recommendation type exists`,
  );
}

for (const actionabilityType of [
  "informational_recommendation",
  "review_recommendation",
  "action_recommendation",
  "decision_recommendation",
  "escalation_recommendation",
]) {
  assert(
    constantsText.includes(actionabilityType) && typesText.includes(actionabilityType),
    `${actionabilityType} actionability type exists`,
  );
}

for (const value of ["low", "medium", "high"]) {
  assert(constantsText.includes(value) && typesText.includes(value), `${value} effort level exists`);
}

for (const value of ["short_term", "medium_term", "long_term"]) {
  assert(constantsText.includes(value) && typesText.includes(value), `${value} timeframe exists`);
}

for (const ownershipType of [
  "finance",
  "accounting",
  "controller",
  "cfo",
  "operations",
  "treasury",
  "revenue_cycle",
  "supply_chain",
  "procurement",
  "hr",
  "executive_team",
  "department_leader",
  "board",
]) {
  assert(constantsText.includes(ownershipType) && typesText.includes(ownershipType), `${ownershipType} ownership type exists`);
}

for (const outcomeStatus of [
  "successful",
  "partially_successful",
  "unsuccessful",
  "inconclusive",
  "insufficient_data",
]) {
  assert(
    constantsText.includes(outcomeStatus) && typesText.includes(outcomeStatus),
    `${outcomeStatus} outcome status exists`,
  );
}

for (const [snakeCase, camelCase] of [
  ["estimated_cash_impact", "estimatedCashImpact"],
  ["estimated_margin_impact", "estimatedMarginImpact"],
  ["estimated_revenue_impact", "estimatedRevenueImpact"],
  ["estimated_cost_impact", "estimatedCostImpact"],
  ["estimated_working_capital_impact", "estimatedWorkingCapitalImpact"],
  ["estimated_risk_reduction", "estimatedRiskReduction"],
  ["impact_confidence", "impactConfidence"],
  ["dependency_ids", "dependencyIds"],
  ["dependency_type", "dependencyType"],
  ["blocking_dependency", "blockingDependency"],
  ["optional_dependency", "optionalDependency"],
  ["conflicting_recommendation_ids", "conflictingRecommendationIds"],
  ["conflict_type", "conflictType"],
  ["conflict_reason", "conflictReason"],
  ["conflict_severity", "conflictSeverity"],
  ["recommendation_outcome_status", "recommendationOutcomeStatus"],
  ["expected_impact", "expectedImpact"],
  ["actual_impact", "actualImpact"],
  ["impact_variance", "impactVariance"],
  ["outcome_confidence", "outcomeConfidence"],
  ["total_estimated_cash_impact", "totalEstimatedCashImpact"],
  ["total_estimated_margin_impact", "totalEstimatedMarginImpact"],
  ["total_estimated_revenue_impact", "totalEstimatedRevenueImpact"],
  ["total_estimated_risk_reduction", "totalEstimatedRiskReduction"],
  ["simulation_eligible", "simulationEligible"],
  ["simulation_assumptions", "simulationAssumptions"],
  ["simulation_inputs", "simulationInputs"],
  ["simulation_dependencies", "simulationDependencies"],
  ["simulation_constraints", "simulationConstraints"],
]) {
  assertIncludesAny(allRecommendationText, [snakeCase, camelCase], `${snakeCase} metadata exists`);
}

for (const [category, memoryKey] of [
  ["revenue", "revenue_recommendation"],
  ["expense", "expense_recommendation"],
  ["payroll", "payroll_recommendation"],
  ["workforce", "workforce_recommendation"],
  ["cash", "cash_recommendation"],
  ["working_capital", "working_capital_recommendation"],
  ["inventory", "inventory_recommendation"],
  ["procurement", "procurement_recommendation"],
  ["customer", "customer_recommendation"],
  ["treasury", "treasury_recommendation"],
  ["tax", "tax_recommendation"],
  ["healthcare", "healthcare_recommendation"],
  ["manufacturing", "manufacturing_recommendation"],
  ["construction", "construction_recommendation"],
  ["municipality", "municipality_recommendation"],
  ["strategic", "strategic_recommendation"],
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
  { pattern: /generateRecommendation|finalRecommendation|recommendationText|customerFacingRecommendation/i, message: "recommendation generation does not exist" },
  { pattern: /from\s+["'][^"']*forecast|import\s+[^;]*forecast|forecastEngine|forecast_engine/i, message: "forecasting implementation does not exist" },
  { pattern: /scenarioModel|scenario_model|scenario-engine|buildScenario/i, message: "scenario modeling implementation does not exist" },
  { pattern: /persistCompanyMemory|memoryPersistence|company-memory-persistence|buildCompanyMemoryRecord\s*\(/i, message: "Company Memory persistence calls do not exist" },
  { pattern: /reviewMemoryCandidate|buildPromotionDecision|approved_for_promotion|executePromotion/i, message: "promotion execution calls do not exist" },
  { pattern: /app[\\/]dashboard|dashboard/i, message: "dashboard wiring does not exist" },
  { pattern: /pdf|financial-package-pdf/i, message: "PDF wiring does not exist" },
  { pattern: /powerpoint|pptx/i, message: "PowerPoint wiring does not exist" },
  { pattern: /from\s+["'][^"']*pulse|pulseEngine|pulseClient|sendToPulse|publishToPulse/i, message: "Pulse wiring does not exist" },
];

for (const { pattern, message } of forbiddenPatterns) {
  assert(!pattern.test(allRecommendationText), message);
}

assert(
  packageJson.scripts?.["verify:si-recommendations"] === "node scripts/verify-si-recommendations.js",
  "package script verify:si-recommendations exists",
);

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI Recommendations verification passed.");
