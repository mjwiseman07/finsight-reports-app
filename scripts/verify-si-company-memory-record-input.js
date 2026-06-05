/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const recordInputRoot = path.join(root, "lib", "intelligence", "synthetic", "company-memory-record-input");

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
  "lib/intelligence/synthetic/company-memory-record-input",
  "lib/intelligence/synthetic/company-memory-record-input/validation",
  "lib/intelligence/synthetic/company-memory-record-input/hashing",
  "lib/intelligence/synthetic/company-memory-record-input/mapping",
  "lib/intelligence/synthetic/company-memory-record-input/builders",
];

for (const directory of requiredDirectories) {
  assert(exists(directory), `${directory} exists`);
}

const requiredFiles = [
  "lib/intelligence/synthetic/company-memory-record-input/types.ts",
  "lib/intelligence/synthetic/company-memory-record-input/constants.ts",
  "lib/intelligence/synthetic/company-memory-record-input/index.ts",
  "lib/intelligence/synthetic/company-memory-record-input/validation/validateRecordInputEligibility.ts",
  "lib/intelligence/synthetic/company-memory-record-input/validation/validateRecordInputLineage.ts",
  "lib/intelligence/synthetic/company-memory-record-input/validation/validateRecordInputCompanyScope.ts",
  "lib/intelligence/synthetic/company-memory-record-input/hashing/buildRecordInputDeterminismHash.ts",
  "lib/intelligence/synthetic/company-memory-record-input/mapping/mapPromotionCandidateToRecordInput.ts",
  "lib/intelligence/synthetic/company-memory-record-input/mapping/mapSourceReferencesToMemorySourceRefs.ts",
  "lib/intelligence/synthetic/company-memory-record-input/mapping/mapPromotionLineageToMemoryLineage.ts",
  "lib/intelligence/synthetic/company-memory-record-input/mapping/mapPromotionEvidenceToMemoryMetadata.ts",
  "lib/intelligence/synthetic/company-memory-record-input/builders/buildCompanyMemoryRecordInput.ts",
  "lib/intelligence/synthetic/company-memory-record-input/builders/buildCompanyMemoryRecordInputs.ts",
];

for (const file of requiredFiles) {
  assert(exists(file), `${file} exists`);
}

const recordInputFiles = listFiles(recordInputRoot).filter((file) => file.endsWith(".ts"));
const allRecordInputText = recordInputFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const typesText = read("lib/intelligence/synthetic/company-memory-record-input/types.ts");
const constantsText = read("lib/intelligence/synthetic/company-memory-record-input/constants.ts");
const eligibilityText = read("lib/intelligence/synthetic/company-memory-record-input/validation/validateRecordInputEligibility.ts");
const lineageText = read("lib/intelligence/synthetic/company-memory-record-input/validation/validateRecordInputLineage.ts");
const companyScopeText = read("lib/intelligence/synthetic/company-memory-record-input/validation/validateRecordInputCompanyScope.ts");
const hashText = read("lib/intelligence/synthetic/company-memory-record-input/hashing/buildRecordInputDeterminismHash.ts");
const mappingText = read("lib/intelligence/synthetic/company-memory-record-input/mapping/mapPromotionCandidateToRecordInput.ts");
const sourceMappingText = read("lib/intelligence/synthetic/company-memory-record-input/mapping/mapSourceReferencesToMemorySourceRefs.ts");
const batchBuilderText = read("lib/intelligence/synthetic/company-memory-record-input/builders/buildCompanyMemoryRecordInputs.ts");
const packageJson = JSON.parse(read("package.json"));

for (const contract of [
  "SyntheticCompanyMemoryRecordInputRequest",
  "SyntheticCompanyMemoryRecordInputResult",
  "SyntheticCompanyMemoryRecordInput",
  "SyntheticCompanyMemoryRecordInputMetadata",
  "SyntheticCompanyMemoryRecordInputLineage",
  "SyntheticCompanyMemoryRecordInputValidation",
  "SyntheticCompanyMemoryRecordInputReadinessStatus",
]) {
  assert(typesText.includes(contract), `${contract} contract exists`);
}

for (const status of ["ready", "skipped", "blocked"]) {
  assert(constantsText.includes(status) && typesText.includes(status), `${status} readiness value exists`);
}

for (const field of [
  "recordInputReadinessStatus",
  "blockedCandidateIds",
  "readyInputIds",
  "recordInputDeterminismHash",
  "promotionDeterminismHash",
  "retrievalDeterminismHash",
  "retrievalLineageId",
]) {
  assert(typesText.includes(field), `${field} field exists`);
}

assert(eligibilityText.includes('reviewStatus !== "approved_for_promotion"'), "only approved_for_promotion candidates can map");
assert(eligibilityText.includes("!promotionCandidate.decision.approvedForPromotion"), "decision.approvedForPromotion required");
assert(eligibilityText.includes("!promotionCandidate.eligibility.lineageComplete"), "lineageComplete required");
assert(eligibilityText.includes('memorySourceAuthority !== "historical_snapshot"'), "historical_snapshot authority required");
assert(sourceMappingText.includes('sourceType: "historical_snapshot"'), "source references preserve historical_snapshot authority");
assert(companyScopeText.includes("sourceReference.companyId !== input.companyId"), "company mismatch blocks");
assert(hashText.includes("buildRecordInputDeterminismHash"), "determinism hash builder exists");
assert(hashText.includes(".sort()"), "hash uses stable sorted arrays");
assert(!/Date\.now|new\s+Date|requestedAt|completedAt|createdAt|updatedAt|timestamp/i.test(hashText), "hash uses no timestamps");
assert(!/Math\.random|randomUUID|crypto\.random/i.test(hashText), "hash uses no random values");
assert(batchBuilderText.includes("for (const promotionCandidate of input.promotionCandidates)"), "builders preserve input order");
assert(batchBuilderText.includes("readyInputIds") && batchBuilderText.includes("skippedCandidateIds") && batchBuilderText.includes("blockedCandidateIds"), "builders return ready/skipped/blocked summaries");
assert(!/buildCompanyMemoryRecord\s*\(/.test(allRecordInputText), "builders do not call buildCompanyMemoryRecord");
assert(mappingText.includes("validateRecordInputEligibility") && mappingText.includes("validateRecordInputLineage") && mappingText.includes("validateRecordInputCompanyScope"), "mapping validates before building");

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
  { pattern: /persistCompanyMemory|memoryPersistence/i, message: "Company Memory persistence writes do not exist" },
  { pattern: /buildCompanyMemoryRecord\s*\(/, message: "buildCompanyMemoryRecord is not called" },
];

for (const { pattern, message } of forbiddenPatterns) {
  assert(!pattern.test(allRecordInputText), message);
}

assert(
  packageJson.scripts?.["verify:si-company-memory-record-input"] === "node scripts/verify-si-company-memory-record-input.js",
  "package script verify:si-company-memory-record-input exists",
);

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI company memory record input verification passed.");
