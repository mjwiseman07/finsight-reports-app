/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const syntheticRoot = path.join(root, "lib", "intelligence", "synthetic");

const expectedFolders = [
  "core",
  "types",
  "evidence-store",
  "confidence-scoring",
  "industry-profiles",
  "company-memory",
  "historical-snapshots",
  "kpi-library",
  "formula-registry",
  "trend-analysis",
  "seasonality",
  "forecasting",
  "anomaly-detection",
  "cash-flow",
  "customer-concentration",
  "vendor-concentration",
  "industry-intelligence",
  "signal-engine",
  "recommendation-engine",
  "healthcare",
];

const expectedFiles = [
  "index.ts",
  "types/index.ts",
  "types/core.ts",
  "types/evidence.ts",
  "types/calculation-trace.ts",
  "types/confidence.ts",
  "types/industry-profile.ts",
  "types/company-memory.ts",
  "types/historical-snapshot.ts",
  "types/signal.ts",
  "types/kpi.ts",
  "types/formula.ts",
  "types/metric-series.ts",
  "core/index.ts",
  "evidence-store/index.ts",
  "confidence-scoring/index.ts",
  "industry-profiles/index.ts",
  "company-memory/index.ts",
  "historical-snapshots/index.ts",
  "kpi-library/index.ts",
  "formula-registry/index.ts",
];

const protectedImportPatterns = [
  /from\s+["'][^"']*app\/dashboard/i,
  /from\s+["'][^"']*app\/onboarding/i,
  /from\s+["'][^"']*financial-package-pdf/i,
  /from\s+["'][^"']*powerpoint/i,
  /from\s+["'][^"']*public\//i,
  /from\s+["'][^"']*pulse/i,
  /from\s+["'][^"']*package-ui/i,
  /from\s+["'][^"']*lib\/integrations/i,
  /from\s+["'][^"']*integrations\//i,
  /from\s+["'][^"']*report-preflight/i,
  /from\s+["'][^"']*lib\/reporting/i,
  /from\s+["'][^"']*reporting\//i,
];

const runtimeLogicPatterns = [
  /\bexport\s+(async\s+)?function\b/,
  /\bfunction\s+(forecast|detect|generate|recommend|render|buildCommentary|buildPackage)\b/i,
  /\bclass\s+\w+/,
  /\bfetch\s*\(/,
  /\bsupabase\b/i,
];

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    return [fullPath];
  });
}

for (const folder of expectedFolders) {
  const relativePath = path.join("lib", "intelligence", "synthetic", folder);
  if (exists(relativePath)) pass(`${relativePath} exists`);
  else fail(`${relativePath} missing`);
}

for (const file of expectedFiles) {
  const relativePath = path.join("lib", "intelligence", "synthetic", file);
  if (exists(relativePath)) pass(`${relativePath} exists`);
  else fail(`${relativePath} missing`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (packageJson.scripts?.["verify:si-core-scaffold"] === "node scripts/verify-si-core-scaffold.js") pass("package script verify:si-core-scaffold exists");
else fail("package script verify:si-core-scaffold missing");

for (const file of walkFiles(syntheticRoot).filter((filePath) => /\.(ts|js)$/.test(filePath))) {
  const relativePath = path.relative(root, file);
  const source = fs.readFileSync(file, "utf8");
  const protectedImport = protectedImportPatterns.find((pattern) => pattern.test(source));
  if (protectedImport) fail(`${relativePath} imports a protected or runtime layer`);
  const runtimeLogic = runtimeLogicPatterns.find((pattern) => pattern.test(source));
  if (runtimeLogic) fail(`${relativePath} contains runtime logic not allowed in Phase 6 scaffold`);
}

if (!process.exitCode) {
  console.log("\nSI core scaffold verification passed.");
}
