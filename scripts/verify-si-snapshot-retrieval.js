/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const retrievalRoot = path.join(root, "lib", "intelligence", "synthetic", "snapshot-retrieval");

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

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
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
  "lib/intelligence/synthetic/snapshot-retrieval",
  "lib/intelligence/synthetic/snapshot-retrieval/requests",
  "lib/intelligence/synthetic/snapshot-retrieval/resolution",
  "lib/intelligence/synthetic/snapshot-retrieval/services",
];

for (const directory of requiredDirectories) {
  assert(exists(directory), `${directory} exists`);
}
assert(exists("lib/intelligence/synthetic/snapshot-retrieval/types.ts"), "contracts file exists");

const requiredFiles = [
  "lib/intelligence/synthetic/snapshot-retrieval/types.ts",
  "lib/intelligence/synthetic/snapshot-retrieval/constants.ts",
  "lib/intelligence/synthetic/snapshot-retrieval/requests/normalizeSnapshotRetrievalRequest.ts",
  "lib/intelligence/synthetic/snapshot-retrieval/requests/validateSnapshotRetrievalRequest.ts",
  "lib/intelligence/synthetic/snapshot-retrieval/resolution/resolveLatestFinalizedSnapshot.ts",
  "lib/intelligence/synthetic/snapshot-retrieval/resolution/resolveSnapshotVersion.ts",
  "lib/intelligence/synthetic/snapshot-retrieval/resolution/resolveSnapshotWindow.ts",
  "lib/intelligence/synthetic/snapshot-retrieval/resolution/resolveSupersededChain.ts",
  "lib/intelligence/synthetic/snapshot-retrieval/resolution/resolveVersionPolicy.ts",
  "lib/intelligence/synthetic/snapshot-retrieval/services/getLatestFinalizedSnapshot.ts",
  "lib/intelligence/synthetic/snapshot-retrieval/services/getSnapshotVersion.ts",
  "lib/intelligence/synthetic/snapshot-retrieval/services/getSnapshotWindow.ts",
  "lib/intelligence/synthetic/snapshot-retrieval/services/getLatestFinalizedWindow.ts",
  "lib/intelligence/synthetic/snapshot-retrieval/services/getAuditSnapshotHistory.ts",
];

for (const file of requiredFiles) {
  assert(exists(file), `${file} exists`);
}

const retrievalFiles = listFiles(retrievalRoot).filter((file) => file.endsWith(".ts"));
const allRetrievalText = retrievalFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const typesText = read("lib/intelligence/synthetic/snapshot-retrieval/types.ts");
const constantsText = read("lib/intelligence/synthetic/snapshot-retrieval/constants.ts");
const validationText = read("lib/intelligence/synthetic/snapshot-retrieval/requests/validateSnapshotRetrievalRequest.ts");
const latestText = read("lib/intelligence/synthetic/snapshot-retrieval/resolution/resolveLatestFinalizedSnapshot.ts");
const versionText = read("lib/intelligence/synthetic/snapshot-retrieval/resolution/resolveSnapshotVersion.ts");
const windowText = read("lib/intelligence/synthetic/snapshot-retrieval/resolution/resolveSnapshotWindow.ts");
const supersededText = read("lib/intelligence/synthetic/snapshot-retrieval/resolution/resolveSupersededChain.ts");
const servicesText = retrievalFiles
  .filter((file) => file.includes(`${path.sep}services${path.sep}`))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");

for (const contract of [
  "SyntheticSnapshotRetrievalRequest",
  "SyntheticSnapshotRetrievalResult",
  "SyntheticSnapshotRetrievalMetadata",
  "SyntheticSnapshotCoverage",
  "SyntheticSnapshotRetrievalConfidenceSummary",
  "SyntheticSnapshotRetrievalConsumer",
]) {
  assert(typesText.includes(contract), `${contract} contract exists`);
}

for (const field of [
  "retrievalConsumer",
  "retrievalConfidenceSummary",
  "retrievalDeterminismHash",
  "retrievalExecutionDurationMs",
]) {
  assert(typesText.includes(field), `${field} metadata field exists`);
}

assert(/companyId:\s*string/.test(typesText), "companyId is required in retrieval request");
assert(validationText.includes("companyId is required"), "validator enforces companyId requirement");
assert(validationText.includes("exactVersion must be positive"), "exactVersion required for exact version retrieval");
assert(constantsText.includes("[12, 24, 36, 60]"), "window sizes restricted to 12, 24, 36, 60");
assert(/right\.snapshotVersion\s*-\s*left\.snapshotVersion/.test(latestText), "latest finalized highest version wins");
assert(latestText.includes("finalizedAt") && latestText.includes("createdAt") && latestText.includes("snapshotId"), "latest finalized deterministic tie breakers exist");
assert(versionText.includes('"ambiguous"') && versionText.includes('"missing_version"'), "exact version fails closed with typed missing/ambiguous results");
assert(supersededText.includes("company_scope_violation"), "superseded chain enforces company scope");
assert(supersededText.includes("backward") && supersededText.includes("forward"), "superseded handling is explicit forward and backward");
assert(allRetrievalText.includes("coverage:"), "coverage builder logic exists");
assert(servicesText.includes("buildRetrievalConfidenceSummary"), "confidence summary builder exists");
assert(allRetrievalText.includes("stableSnapshotHash") && allRetrievalText.includes("retrievalDeterminismHash"), "determinism hash builder logic exists");

for (const serviceName of [
  "getLatestFinalizedSnapshot",
  "getSnapshotVersion",
  "getSnapshotWindow",
  "getLatestFinalizedWindow",
  "getAuditSnapshotHistory",
]) {
  assert(servicesText.includes(`function ${serviceName}`), `${serviceName} service exists`);
}

const forbiddenPatterns = [
  { pattern: /from\s+["']openai["']|@openai|new\s+OpenAI\b/i, message: "OpenAI imports do not exist" },
  { pattern: /\bchat\.completions\b|\bresponses\.create\b|\bembeddings\.create\b/i, message: "AI runtime calls do not exist" },
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
  assert(!pattern.test(allRetrievalText), message);
}

assert(!/@supabase\/supabase-js|createClient\(/i.test(servicesText), "Supabase client imports do not exist in services");
assert(!/\.(insert|upsert|update|delete|rpc)\s*\(/i.test(allRetrievalText), "database writes do not exist");
assert(!/si_snapshot_retrieval_log/i.test(allRetrievalText), "retrieval log writes do not exist");

const retrievalLogReferenceText = allRetrievalText
  .split(/\r?\n/)
  .filter((line) => /si_snapshot_retrieval_log|retrieval_window/i.test(line))
  .join("\n");
assert(!/si_snapshot_retrieval_log/i.test(retrievalLogReferenceText) || /\bretrieval_window\b/i.test(retrievalLogReferenceText), "retrieval log references use retrieval_window, not reserved window");

const packageJson = JSON.parse(read("package.json"));
assert(packageJson.scripts?.["verify:si-snapshot-retrieval"] === "node scripts/verify-si-snapshot-retrieval.js", "package script verify:si-snapshot-retrieval exists");

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI snapshot retrieval verification passed.");
