/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const commentaryRoot = path.join(root, "lib", "intelligence", "synthetic", "commentary");

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
  "lib/intelligence/synthetic/commentary",
  "lib/intelligence/synthetic/commentary/evidence",
  "lib/intelligence/synthetic/commentary/candidates",
  "lib/intelligence/synthetic/commentary/memory",
];

for (const directory of requiredDirectories) {
  assert(exists(directory), `${directory} exists`);
}

const requiredFiles = [
  "lib/intelligence/synthetic/commentary/types.ts",
  "lib/intelligence/synthetic/commentary/constants.ts",
  "lib/intelligence/synthetic/commentary/index.ts",
  "lib/intelligence/synthetic/commentary/evidence/buildCommentaryEvidence.ts",
  "lib/intelligence/synthetic/commentary/evidence/buildCommentaryEvidenceCollection.ts",
  "lib/intelligence/synthetic/commentary/evidence/index.ts",
  "lib/intelligence/synthetic/commentary/candidates/buildCommentaryCandidate.ts",
  "lib/intelligence/synthetic/commentary/candidates/buildCommentaryCandidates.ts",
  "lib/intelligence/synthetic/commentary/candidates/index.ts",
  "lib/intelligence/synthetic/commentary/memory/buildCommentaryMemoryCandidate.ts",
  "lib/intelligence/synthetic/commentary/memory/buildCommentaryMemoryCandidates.ts",
  "lib/intelligence/synthetic/commentary/memory/index.ts",
];

for (const file of requiredFiles) {
  assert(exists(file), `${file} exists`);
}

const commentaryFiles = listFiles(commentaryRoot).filter((file) => file.endsWith(".ts"));
const allCommentaryText = commentaryFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const typesText = read("lib/intelligence/synthetic/commentary/types.ts");
const constantsText = read("lib/intelligence/synthetic/commentary/constants.ts");
const evidenceText = read("lib/intelligence/synthetic/commentary/evidence/buildCommentaryEvidence.ts");
const evidenceCollectionText = read("lib/intelligence/synthetic/commentary/evidence/buildCommentaryEvidenceCollection.ts");
const candidateText = read("lib/intelligence/synthetic/commentary/candidates/buildCommentaryCandidate.ts");
const candidatesText = read("lib/intelligence/synthetic/commentary/candidates/buildCommentaryCandidates.ts");
const memoryCandidateText = read("lib/intelligence/synthetic/commentary/memory/buildCommentaryMemoryCandidate.ts");
const memoryCandidatesText = read("lib/intelligence/synthetic/commentary/memory/buildCommentaryMemoryCandidates.ts");
const packageJson = JSON.parse(read("package.json"));

for (const contract of [
  "SyntheticCommentaryCandidate",
  "SyntheticCommentaryEvidence",
  "SyntheticCommentaryMetadata",
  "SyntheticCommentaryAudience",
  "SyntheticCommentarySourceReference",
  "SyntheticCommentaryDriverReference",
  "SyntheticCommentaryMemoryReference",
  "SyntheticCommentaryObservationReference",
  "SyntheticCommentaryPatternReference",
  "SyntheticStructuredCommentaryCandidate",
  "SyntheticCommentaryMemoryCandidate",
]) {
  assert(allCommentaryText.includes(contract), `${contract} contract exists`);
}

for (const category of [
  "executive",
  "revenue",
  "expense",
  "payroll",
  "workforce",
  "balance_sheet",
  "cash_flow",
  "operational",
  "healthcare",
  "manufacturing",
]) {
  assert(constantsText.includes(category) && typesText.includes(category), `${category} commentary category exists`);
}

for (const audience of [
  "executive",
  "controller",
  "cfo",
  "accounting_manager",
  "department_leader",
  "operations_leader",
  "board_package",
]) {
  assert(constantsText.includes(audience) && typesText.includes(audience), `${audience} audience type exists`);
}

for (const style of [
  "executive_summary",
  "operational",
  "variance_explanation",
  "workforce",
  "cash_flow",
  "board_package",
]) {
  assert(constantsText.includes(style) && typesText.includes(style), `${style} commentary style exists`);
}

for (const evidenceType of [
  "observation",
  "pattern",
  "company_memory",
  "source_reference",
  "driver_reference",
]) {
  assert(constantsText.includes(evidenceType) && typesText.includes(evidenceType), `${evidenceType} evidence type exists`);
}

for (const [snakeCase, camelCase] of [
  ["confidence_score", "confidenceScore"],
  ["confidence_reason", "confidenceReason"],
  ["evidence_strength", "evidenceStrength"],
  ["data_completeness_score", "dataCompletenessScore"],
  ["evidence_priority_rank", "evidencePriorityRank"],
  ["evidence_priority_reason", "evidencePriorityReason"],
  ["missing_data_flags", "missingDataFlags"],
  ["stale_source_flags", "staleSourceFlags"],
]) {
  assertIncludesAny(allCommentaryText, [snakeCase, camelCase], `${snakeCase} metadata exists`);
}

for (const [snakeCase, camelCase] of [
  ["memory_alignment_status", "memoryAlignmentStatus"],
  ["narrative_drift_detected", "narrativeDriftDetected"],
  ["historical_pattern_conflict", "historicalPatternConflict"],
  ["narrative_horizon", "narrativeHorizon"],
  ["governance_status", "governanceStatus"],
  ["refresh_status", "refreshStatus"],
  ["lineage", "lineage"],
]) {
  assertIncludesAny(allCommentaryText, [snakeCase, camelCase], `${snakeCase} compatibility field exists`);
}

for (const [category, memoryKey] of [
  ["executive", "executive_business_condition"],
  ["revenue", "revenue_condition"],
  ["expense", "expense_condition"],
  ["payroll", "payroll_condition"],
  ["workforce", "workforce_condition"],
  ["balance_sheet", "balance_sheet_condition"],
  ["cash_flow", "cash_flow_condition"],
  ["operational", "operational_condition"],
  ["healthcare", "healthcare_condition"],
  ["manufacturing", "manufacturing_condition"],
]) {
  assert(memoryCandidateText.includes(`${category}: "${memoryKey}"`), `${category} maps to ${memoryKey}`);
}

for (const [snakeCase, camelCase] of [
  ["evidence_priority_rank", "evidencePriorityRank"],
  ["evidence_priority_reason", "evidencePriorityReason"],
  ["supporting_observation_ids", "supportingObservationIds"],
  ["supporting_pattern_ids", "supportingPatternIds"],
  ["supporting_memory_ids", "supportingMemoryIds"],
  ["supporting_source_reference_ids", "supportingSourceReferenceIds"],
  ["driver_reference_ids", "driverReferenceIds"],
]) {
  assertIncludesAny(evidenceText + candidateText + memoryCandidateText, [snakeCase, camelCase], `${snakeCase} evidence feature exists`);
}

for (const requiredCheck of [
  ["companyId is required", "companyId required quality gate exists"],
  ["commentaryCategory is not supported", "category required quality gate exists"],
  ["audience is not supported", "audience required quality gate exists"],
  ["periodKey is required", "period required quality gate exists"],
  ["evidencePackage is required", "evidence required quality gate exists"],
  ["confidenceScore must be present", "confidence required quality gate exists"],
  ["evidenceStrength is required", "evidence strength required quality gate exists"],
  ["lineage is required", "lineage required quality gate exists"],
]) {
  assert(candidateText.includes(requiredCheck[0]), requiredCheck[1]);
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
  { pattern: /generateCommentary|finalCommentary|commentaryText|customerFacingNarrative/i, message: "commentary text generation does not exist" },
  { pattern: /recommendation-engine|recommendation_engine|recommendationEngine|buildRecommendation/i, message: "recommendation implementation does not exist" },
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
  assert(!pattern.test(allCommentaryText), message);
}

assert(
  packageJson.scripts?.["verify:si-commentary"] === "node scripts/verify-si-commentary.js",
  "package script verify:si-commentary exists",
);

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI Commentary verification passed.");
