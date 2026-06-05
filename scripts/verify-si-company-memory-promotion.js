/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const promotionRoot = path.join(root, "lib", "intelligence", "synthetic", "company-memory-promotion");

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

const requiredDirectories = [
  "lib/intelligence/synthetic/company-memory-promotion",
  "lib/intelligence/synthetic/company-memory-promotion/eligibility",
  "lib/intelligence/synthetic/company-memory-promotion/review",
  "lib/intelligence/synthetic/company-memory-promotion/decisions",
];

for (const directory of requiredDirectories) {
  assert(exists(directory), `${directory} exists`);
}

const requiredFiles = [
  "lib/intelligence/synthetic/company-memory-promotion/types.ts",
  "lib/intelligence/synthetic/company-memory-promotion/constants.ts",
  "lib/intelligence/synthetic/company-memory-promotion/index.ts",
  "lib/intelligence/synthetic/company-memory-promotion/eligibility/evaluatePromotionEligibility.ts",
  "lib/intelligence/synthetic/company-memory-promotion/eligibility/evaluateConfidenceEligibility.ts",
  "lib/intelligence/synthetic/company-memory-promotion/eligibility/evaluateFreshnessEligibility.ts",
  "lib/intelligence/synthetic/company-memory-promotion/eligibility/evaluateCoverageEligibility.ts",
  "lib/intelligence/synthetic/company-memory-promotion/eligibility/evaluateObservationStrengthEligibility.ts",
  "lib/intelligence/synthetic/company-memory-promotion/eligibility/evaluateStabilityEligibility.ts",
  "lib/intelligence/synthetic/company-memory-promotion/eligibility/evaluateLineageCompleteness.ts",
  "lib/intelligence/synthetic/company-memory-promotion/review/reviewMemoryCandidate.ts",
  "lib/intelligence/synthetic/company-memory-promotion/review/reviewMemoryCandidates.ts",
  "lib/intelligence/synthetic/company-memory-promotion/review/applyHumanReviewMetadata.ts",
  "lib/intelligence/synthetic/company-memory-promotion/decisions/buildPromotionDecision.ts",
  "lib/intelligence/synthetic/company-memory-promotion/decisions/buildApprovalMetadata.ts",
  "lib/intelligence/synthetic/company-memory-promotion/decisions/buildRejectionMetadata.ts",
];

for (const file of requiredFiles) {
  assert(exists(file), `${file} exists`);
}

const promotionFiles = listFiles(promotionRoot).filter((file) => file.endsWith(".ts"));
const allPromotionText = promotionFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const typesText = read("lib/intelligence/synthetic/company-memory-promotion/types.ts");
const constantsText = read("lib/intelligence/synthetic/company-memory-promotion/constants.ts");
const eligibilityText = read("lib/intelligence/synthetic/company-memory-promotion/eligibility/evaluatePromotionEligibility.ts");
const confidenceText = read("lib/intelligence/synthetic/company-memory-promotion/eligibility/evaluateConfidenceEligibility.ts");
const freshnessText = read("lib/intelligence/synthetic/company-memory-promotion/eligibility/evaluateFreshnessEligibility.ts");
const coverageText = read("lib/intelligence/synthetic/company-memory-promotion/eligibility/evaluateCoverageEligibility.ts");
const observationText = read("lib/intelligence/synthetic/company-memory-promotion/eligibility/evaluateObservationStrengthEligibility.ts");
const stabilityText = read("lib/intelligence/synthetic/company-memory-promotion/eligibility/evaluateStabilityEligibility.ts");
const lineageText = read("lib/intelligence/synthetic/company-memory-promotion/eligibility/evaluateLineageCompleteness.ts");
const reviewCandidateText = read("lib/intelligence/synthetic/company-memory-promotion/review/reviewMemoryCandidate.ts");
const reviewCandidatesText = read("lib/intelligence/synthetic/company-memory-promotion/review/reviewMemoryCandidates.ts");
const humanReviewText = read("lib/intelligence/synthetic/company-memory-promotion/review/applyHumanReviewMetadata.ts");
const decisionText = read("lib/intelligence/synthetic/company-memory-promotion/decisions/buildPromotionDecision.ts");
const packageJson = JSON.parse(read("package.json"));

for (const contract of [
  "SyntheticMemoryCandidateReviewRequest",
  "SyntheticMemoryCandidateReviewResult",
  "SyntheticMemoryPromotionCandidate",
  "SyntheticMemoryPromotionEligibility",
  "SyntheticMemoryPromotionDecision",
  "SyntheticMemoryPromotionMetadata",
  "SyntheticMemoryPromotionLineage",
]) {
  assert(typesText.includes(contract), `${contract} contract exists`);
}

for (const status of [
  "pending_review",
  "approved_for_promotion",
  "rejected",
  "needs_more_history",
  "duplicate",
  "stale",
  "superseded",
  "conflicting",
]) {
  assert(constantsText.includes(status) && typesText.includes(status), `${status} status exists`);
}

for (const reason of [
  "insufficient_history",
  "low_confidence",
  "stale_evidence",
  "conflicting_candidate",
  "duplicate_candidate",
  "superseded_source_snapshots",
  "incomplete_lineage",
  "manual_rejection",
]) {
  assert(constantsText.includes(reason) && typesText.includes(reason), `${reason} rejection reason exists`);
}

for (const field of [
  "promotionEvidenceStrength",
  "promotionReviewComplexity",
  "confidenceEligible",
  "freshnessEligible",
  "coverageEligible",
  "observationStrengthEligible",
  "stabilityEligible",
  "sourceReferenceCountEligible",
  "lineageComplete",
  "eligibilityScore",
]) {
  assert(typesText.includes(field), `${field} eligibility metadata exists`);
}

for (const strength of ["weak", "moderate", "strong", "compelling"]) {
  assert(constantsText.includes(strength) && typesText.includes(strength), `${strength} evidence strength exists`);
}

for (const complexity of ["low", "medium", "high"]) {
  assert(constantsText.includes(complexity) && typesText.includes(complexity), `${complexity} review complexity exists`);
}

assert(eligibilityText.includes("evaluatePromotionEligibility"), "eligibility evaluator exists");
assert(confidenceText.includes("evaluateConfidenceEligibility"), "confidence evaluator exists");
assert(freshnessText.includes("evaluateFreshnessEligibility"), "freshness evaluator exists");
assert(coverageText.includes("evaluateCoverageEligibility"), "coverage evaluator exists");
assert(observationText.includes("evaluateObservationStrengthEligibility"), "observation strength evaluator exists");
assert(stabilityText.includes("evaluateStabilityEligibility"), "stability evaluator exists");
assert(lineageText.includes("evaluateLineageCompleteness"), "lineage completeness evaluator exists");
assert(reviewCandidateText.includes("evaluatePromotionEligibility"), "reviewMemoryCandidate uses eligibility");
assert(reviewCandidatesText.includes(".map((candidate)") && reviewCandidatesText.includes("idsByStatus"), "reviewMemoryCandidates preserves batch review behavior");
assert(decisionText.includes('input.reviewStatus === "approved_for_promotion"'), "buildPromotionDecision only approves approved_for_promotion");
assert(humanReviewText.includes("if (!humanReview) return promotionCandidate"), "human review metadata is optional");

const forbiddenPatterns = [
  { pattern: /@supabase\/supabase-js|createClient\(/i, message: "Supabase imports do not exist" },
  { pattern: /\.(select|from)\s*\(/i, message: "database reads do not exist" },
  { pattern: /\.(insert|upsert|update|delete|rpc)\s*\(/i, message: "database writes do not exist" },
  { pattern: /service[_-]?role/i, message: "service-role usage does not exist" },
  { pattern: /\bfetch\s*\(|XMLHttpRequest|axios\./i, message: "external API calls do not exist" },
  { pattern: /from\s+["']openai["']|@openai|new\s+OpenAI\b/i, message: "OpenAI imports do not exist" },
  { pattern: /from\s+["'][^"']*forecast|import\s+[^;]*forecast/i, message: "forecasting imports do not exist" },
  { pattern: /from\s+["'][^"']*budget|import\s+[^;]*budget/i, message: "budgeting imports do not exist" },
  { pattern: /signal-engine|signal_engine/i, message: "signal engine imports do not exist" },
  { pattern: /recommendation-engine|recommendation_engine/i, message: "recommendation engine imports do not exist" },
  { pattern: /app[\\/]dashboard|dashboard/i, message: "dashboard wiring does not exist" },
  { pattern: /pdf|financial-package-pdf/i, message: "PDF wiring does not exist" },
  { pattern: /powerpoint/i, message: "PowerPoint wiring does not exist" },
  { pattern: /pulse/i, message: "Pulse wiring does not exist" },
  { pattern: /from\s+["'][^"']*(provider|quickbooks|xero|sage|netsuite|dynamics)|lib[\\/]integrations/i, message: "provider wiring does not exist" },
];

for (const { pattern, message } of forbiddenPatterns) {
  assert(!pattern.test(allPromotionText), message);
}

assert(
  packageJson.scripts?.["verify:si-company-memory-promotion"] === "node scripts/verify-si-company-memory-promotion.js",
  "package script verify:si-company-memory-promotion exists",
);

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI company memory promotion verification passed.");
