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
  "industry-profiles/healthcare",
  "industry-profiles/construction",
  "industry-profiles/manufacturing",
  "industry-profiles/retail",
  "industry-profiles/professional-services",
  "industry-profiles/cpa-firm",
  "industry-profiles/bookkeeper",
  "industry-profiles/shared",
  "company-memory",
  "historical-snapshots",
  "kpi-library",
  "formula-registry",
  "metric-series",
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
  "explanation-engine",
  "explanation-persistence",
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
  "types/snapshot-storage.ts",
  "types/signal.ts",
  "types/kpi.ts",
  "types/formula.ts",
  "types/metric-series.ts",
  "types/recommendation.ts",
  "types/explanation.ts",
  "types/explanation-persistence.ts",
  "core/index.ts",
  "evidence-store/index.ts",
  "confidence-scoring/index.ts",
  "industry-profiles/index.ts",
  "industry-profiles/catalog.ts",
  "industry-profiles/getIndustryProfile.ts",
  "industry-profiles/validateIndustryProfile.ts",
  "industry-profiles/healthcare/profile.ts",
  "industry-profiles/construction/profile.ts",
  "industry-profiles/manufacturing/profile.ts",
  "industry-profiles/retail/profile.ts",
  "industry-profiles/professional-services/profile.ts",
  "industry-profiles/cpa-firm/profile.ts",
  "industry-profiles/bookkeeper/profile.ts",
  "industry-profiles/shared/index.ts",
  "company-memory/index.ts",
  "company-memory/types.ts",
  "company-memory/buildAdvisorFeedback.ts",
  "company-memory/buildCompanyMemoryRecord.ts",
  "company-memory/buildEntityAlias.ts",
  "company-memory/buildMemoryLineage.ts",
  "company-memory/buildRecommendationOutcome.ts",
  "company-memory/buildThresholdOverride.ts",
  "company-memory/scoreMemoryConfidence.ts",
  "company-memory/scoreMemoryFreshness.ts",
  "company-memory/stableMemoryHash.ts",
  "company-memory/validateCompanyMemoryRecord.ts",
  "historical-snapshots/index.ts",
  "historical-snapshots/types.ts",
  "historical-snapshots/stableSnapshotHash.ts",
  "historical-snapshots/buildSnapshotPayload.ts",
  "historical-snapshots/buildAvailabilitySummary.ts",
  "historical-snapshots/buildSnapshotIndustryContext.ts",
  "historical-snapshots/buildSnapshotLineage.ts",
  "historical-snapshots/scoreSnapshotQuality.ts",
  "historical-snapshots/buildSnapshotAudit.ts",
  "historical-snapshots/buildHistoricalSnapshotRecord.ts",
  "historical-snapshots/resolveSnapshotWindow.ts",
  "historical-snapshots/buildSnapshotSeries.ts",
  "kpi-library/index.ts",
  "formula-registry/index.ts",
  "metric-series/index.ts",
  "signal-engine/index.ts",
  "recommendation-engine/index.ts",
  "explanation-engine/index.ts",
  "explanation-persistence/index.ts",
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
  /\bfunction\s+(forecast|detect|render|buildCommentary|buildPackage)\b/i,
  /\bexport\s+(const|function)\s+\w*(forecast|detect|render|buildCommentary|buildPackage)\w*/i,
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
