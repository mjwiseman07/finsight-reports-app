/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const ingestionRoot = path.join(root, "lib", "intelligence", "synthetic", "company-memory-ingestion");

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
  "lib/intelligence/synthetic/company-memory-ingestion",
  "lib/intelligence/synthetic/company-memory-ingestion/sources",
  "lib/intelligence/synthetic/company-memory-ingestion/candidates",
];

const optionalFutureDirectories = [
  "lib/intelligence/synthetic/company-memory-ingestion/confidence",
  "lib/intelligence/synthetic/company-memory-ingestion/lineage",
  "lib/intelligence/synthetic/company-memory-ingestion/dedupe",
  "lib/intelligence/synthetic/company-memory-ingestion/windows",
];

for (const directory of requiredDirectories) {
  assert(exists(directory), `${directory} exists`);
}

for (const directory of optionalFutureDirectories) {
  if (exists(directory)) pass(`${directory} exists and will be scanned`);
  else pass(`${directory} not present yet; optional for current Phase 19 scope`);
}

const requiredFiles = [
  "lib/intelligence/synthetic/company-memory-ingestion/types.ts",
  "lib/intelligence/synthetic/company-memory-ingestion/constants.ts",
  "lib/intelligence/synthetic/company-memory-ingestion/index.ts",
  "lib/intelligence/synthetic/company-memory-ingestion/sources/buildSnapshotSourceReference.ts",
  "lib/intelligence/synthetic/company-memory-ingestion/sources/buildSnapshotSourceReferences.ts",
  "lib/intelligence/synthetic/company-memory-ingestion/candidates/buildMemoryCandidate.ts",
  "lib/intelligence/synthetic/company-memory-ingestion/candidates/buildRecurringCustomerConcentrationCandidate.ts",
  "lib/intelligence/synthetic/company-memory-ingestion/candidates/buildRecurringCashPressureCandidate.ts",
  "lib/intelligence/synthetic/company-memory-ingestion/candidates/buildRecurringMarginDeclineCandidate.ts",
  "lib/intelligence/synthetic/company-memory-ingestion/candidates/buildRecurringWorkingCapitalCandidate.ts",
];

for (const file of requiredFiles) {
  assert(exists(file), `${file} exists`);
}

const ingestionFiles = listFiles(ingestionRoot).filter((file) => file.endsWith(".ts"));
const allIngestionText = ingestionFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const typesText = read("lib/intelligence/synthetic/company-memory-ingestion/types.ts");
const constantsText = read("lib/intelligence/synthetic/company-memory-ingestion/constants.ts");
const sourceReferenceText = read("lib/intelligence/synthetic/company-memory-ingestion/sources/buildSnapshotSourceReference.ts");
const sourceReferencesText = read("lib/intelligence/synthetic/company-memory-ingestion/sources/buildSnapshotSourceReferences.ts");
const candidateText = read("lib/intelligence/synthetic/company-memory-ingestion/candidates/buildMemoryCandidate.ts");
const packageJson = JSON.parse(read("package.json"));

for (const contract of [
  "SyntheticMemoryIngestionRequest",
  "SyntheticMemoryIngestionResult",
  "SyntheticMemorySourceReference",
  "SyntheticMemoryCandidate",
  "SyntheticMemoryIngestionMetadata",
]) {
  assert(typesText.includes(contract), `${contract} contract exists`);
}

for (const field of [
  "memoryConfidence",
  "memoryFreshness",
  "memorySourceAuthority",
  "memoryCoverage",
  "candidateObservationStrength",
  "candidateStabilityScore",
]) {
  assert(typesText.includes(field), `${field} metadata/candidate field exists`);
}

assert(typesText.includes('sourceType: "historical_snapshot"'), "sourceType is historical_snapshot");
assert(candidateText.includes('candidateStatus: input.candidateStatus || "candidate"'), "candidateStatus default exists");
assert(constantsText.includes('SYNTHETIC_MEMORY_SOURCE_AUTHORITY = "historical_snapshot"'), "historical_snapshot authority exists");
assert(typesText.includes("SyntheticMemoryCandidateObservationStrength"), "candidateObservationStrength exists");
assert(typesText.includes("candidateStabilityScore"), "candidateStabilityScore exists");
assert(candidateText.includes("stableSnapshotHash") && candidateText.includes("candidateId"), "candidateId determinism exists");
assert(candidateText.includes("sourceReference.companyId !== input.companyId"), "cross-company protection exists");
assert(sourceReferenceText.includes("retrievalLineageId") && sourceReferencesText.includes("retrievalLineageId"), "source references preserve retrievalLineageId");
assert(sourceReferenceText.includes("retrievalDeterminismHash") && sourceReferencesText.includes("retrievalDeterminismHash"), "source references preserve retrievalDeterminismHash");

for (const candidateKind of [
  "recurring_customer_concentration",
  "recurring_cash_pressure",
  "recurring_margin_decline",
  "recurring_working_capital_observation",
]) {
  assert(allIngestionText.includes(candidateKind), `${candidateKind} candidate type exists`);
}

assert(typesText.includes("SyntheticCompanyMemoryConfidence"), "Phase 15 Company Memory confidence compatibility exists");
assert(typesText.includes("SyntheticCompanyMemoryFreshness"), "Phase 15 Company Memory freshness compatibility exists");
assert(typesText.includes("SyntheticSnapshotRetrievalResult"), "Phase 18 Snapshot Retrieval compatibility exists");
assert(allIngestionText.includes("historical_snapshot"), "historical_snapshot authority is preserved");
assert(allIngestionText.includes("retrievalDeterminismHash"), "retrievalDeterminismHash compatibility exists");
assert(allIngestionText.includes("retrievalLineageId"), "retrievalLineageId compatibility exists");

const forbiddenPatterns = [
  { pattern: /buildCompanyMemoryRecord|memoryPersistence|persistCompanyMemory/i, message: "Company Memory persistence writes do not exist" },
  { pattern: /from\s+["'][^"']*forecast|import\s+[^;]*forecast/i, message: "forecasting imports do not exist" },
  { pattern: /from\s+["'][^"']*budget|import\s+[^;]*budget/i, message: "budgeting imports do not exist" },
  { pattern: /signal-engine|signal_engine/i, message: "signal engine imports do not exist" },
  { pattern: /recommendation-engine|recommendation_engine/i, message: "recommendation engine imports do not exist" },
  { pattern: /from\s+["']openai["']|@openai|new\s+OpenAI\b/i, message: "AI/OpenAI imports do not exist" },
  { pattern: /app[\\/]dashboard|dashboard/i, message: "dashboard wiring does not exist" },
  { pattern: /pdf|financial-package-pdf/i, message: "PDF wiring does not exist" },
  { pattern: /powerpoint/i, message: "PowerPoint wiring does not exist" },
  { pattern: /pulse/i, message: "Pulse wiring does not exist" },
  { pattern: /from\s+["'][^"']*(provider|quickbooks|xero|sage|netsuite|dynamics)|lib[\\/]integrations/i, message: "provider wiring does not exist" },
  { pattern: /@supabase\/supabase-js|createClient\(/i, message: "Supabase client imports do not exist" },
  { pattern: /\.(insert|upsert|update|delete|rpc)\s*\(/i, message: "database writes do not exist" },
  { pattern: /\bfetch\s*\(|XMLHttpRequest|axios\./i, message: "external API calls do not exist" },
];

for (const { pattern, message } of forbiddenPatterns) {
  assert(!pattern.test(allIngestionText), message);
}

assert(
  packageJson.scripts?.["verify:si-company-memory-ingestion"] === "node scripts/verify-si-company-memory-ingestion.js",
  "package script verify:si-company-memory-ingestion exists",
);

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI company memory ingestion verification passed.");
