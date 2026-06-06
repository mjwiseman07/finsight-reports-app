/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const fluxRoot = path.join(root, "lib", "intelligence", "synthetic", "flux-analysis");

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
  "lib/intelligence/synthetic/flux-analysis",
  "lib/intelligence/synthetic/flux-analysis/observations",
  "lib/intelligence/synthetic/flux-analysis/patterns",
  "lib/intelligence/synthetic/flux-analysis/memory",
];

for (const directory of requiredDirectories) {
  assert(exists(directory), `${directory} exists`);
}

const requiredFiles = [
  "lib/intelligence/synthetic/flux-analysis/types.ts",
  "lib/intelligence/synthetic/flux-analysis/constants.ts",
  "lib/intelligence/synthetic/flux-analysis/index.ts",
  "lib/intelligence/synthetic/flux-analysis/observations/buildFluxObservation.ts",
  "lib/intelligence/synthetic/flux-analysis/observations/buildFluxObservations.ts",
  "lib/intelligence/synthetic/flux-analysis/observations/index.ts",
  "lib/intelligence/synthetic/flux-analysis/patterns/buildFluxPattern.ts",
  "lib/intelligence/synthetic/flux-analysis/patterns/buildFluxPatterns.ts",
  "lib/intelligence/synthetic/flux-analysis/patterns/index.ts",
  "lib/intelligence/synthetic/flux-analysis/memory/buildFluxMemoryCandidate.ts",
  "lib/intelligence/synthetic/flux-analysis/memory/buildFluxMemoryCandidates.ts",
  "lib/intelligence/synthetic/flux-analysis/memory/index.ts",
];

for (const file of requiredFiles) {
  assert(exists(file), `${file} exists`);
}

const fluxFiles = listFiles(fluxRoot).filter((file) => file.endsWith(".ts"));
const allFluxText = fluxFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const typesText = read("lib/intelligence/synthetic/flux-analysis/types.ts");
const constantsText = read("lib/intelligence/synthetic/flux-analysis/constants.ts");
const observationText = read("lib/intelligence/synthetic/flux-analysis/observations/buildFluxObservation.ts");
const observationsText = read("lib/intelligence/synthetic/flux-analysis/observations/buildFluxObservations.ts");
const patternText = read("lib/intelligence/synthetic/flux-analysis/patterns/buildFluxPattern.ts");
const patternsText = read("lib/intelligence/synthetic/flux-analysis/patterns/buildFluxPatterns.ts");
const memoryCandidateText = read("lib/intelligence/synthetic/flux-analysis/memory/buildFluxMemoryCandidate.ts");
const packageJson = JSON.parse(read("package.json"));

for (const contract of [
  "SyntheticFluxAnalysisRequest",
  "SyntheticFluxAnalysisResult",
  "SyntheticFluxAnalysisMetadata",
  "SyntheticFluxObservation",
  "SyntheticFluxPattern",
  "SyntheticFluxScope",
  "SyntheticFluxSourceReference",
  "SyntheticFluxDriverAttribution",
  "SyntheticFluxLineage",
]) {
  assert(typesText.includes(contract), `${contract} contract exists`);
}

for (const taxonomy of [
  "SyntheticFluxCategory",
  "SyntheticFluxComparisonType",
  "SyntheticFluxDriverCategory",
  "SyntheticFluxObservationType",
  "SyntheticFluxPatternType",
]) {
  assert(typesText.includes(taxonomy), `${taxonomy} taxonomy exists`);
}

for (const constant of [
  "SYNTHETIC_FLUX_CATEGORIES",
  "SYNTHETIC_FLUX_COMPARISON_TYPES",
  "SYNTHETIC_FLUX_REVENUE_DRIVER_CATEGORIES",
  "SYNTHETIC_FLUX_PAYROLL_DRIVER_CATEGORIES",
  "SYNTHETIC_FLUX_EXPENSE_DRIVER_CATEGORIES",
  "SYNTHETIC_FLUX_BALANCE_SHEET_DRIVER_CATEGORIES",
  "SYNTHETIC_FLUX_CASH_FLOW_DRIVER_CATEGORIES",
  "SYNTHETIC_FLUX_OBSERVATION_TYPES",
  "SYNTHETIC_FLUX_PATTERN_TYPES",
]) {
  assert(constantsText.includes(constant), `${constant} constant exists`);
}

for (const fluxCategory of [
  "revenue",
  "expense",
  "payroll",
  "balance_sheet",
  "cash_flow",
  "operational",
  "workforce",
]) {
  assert(constantsText.includes(fluxCategory) && typesText.includes(fluxCategory), `${fluxCategory} flux category exists`);
}

for (const comparisonType of [
  "month_over_month",
  "quarter_over_quarter",
  "year_over_year",
  "budget_vs_actual",
  "custom_comparison_period",
]) {
  assert(
    constantsText.includes(comparisonType) && typesText.includes(comparisonType),
    `${comparisonType} comparison type exists`,
  );
}

for (const driverCategory of [
  "volume",
  "price",
  "mix",
  "fte_volume_effect",
  "wage_effect",
  "overtime_effect",
  "contractor_effect",
  "vacancy_effect",
  "workforce_mix_effect",
  "capacity_gap_effect",
  "vendor_mix",
  "utilization",
  "inflation",
  "ar",
  "ap",
  "inventory",
  "working_capital",
  "collections_timing",
  "vendor_payment_timing",
  "capex",
]) {
  assert(
    constantsText.includes(driverCategory) && typesText.includes(driverCategory),
    `${driverCategory} driver category exists`,
  );
}

for (const observationType of [
  "revenue_growth",
  "revenue_decline",
  "payroll_growth",
  "payroll_decline",
  "overtime_growth",
  "vacancy_increase",
  "vacancy_decrease",
  "margin_decline",
  "margin_improvement",
  "cash_decline",
  "cash_increase",
  "working_capital_change",
  "expense_growth",
  "expense_decline",
  "balance_sheet_movement",
]) {
  assert(
    constantsText.includes(observationType) && typesText.includes(observationType),
    `${observationType} observation type exists`,
  );
}

for (const patternType of [
  "sustained_margin_pressure",
  "recurring_overtime_dependency",
  "recurring_cash_pressure",
  "recurring_working_capital_pressure",
  "sustained_revenue_growth",
  "sustained_revenue_decline",
  "recurring_payroll_pressure",
  "recurring_expense_growth",
  "sustained_capacity_gap_pressure",
  "recurring_contractor_labor_substitution",
]) {
  assert(constantsText.includes(patternType) && typesText.includes(patternType), `${patternType} pattern type exists`);
  assert(memoryCandidateText.includes(`${patternType}: "${patternType}"`), `${patternType} maps to ${patternType}`);
}

assert(observationText.includes("stableSnapshotHash"), "observations use deterministic hashing");
assert(
  observationText.includes("absoluteVariance") && observationText.includes("percentVariance"),
  "observations calculate variance",
);
assert(observationText.includes("candidate: null") || observationText.includes("observation: null"), "observations fail closed");
assert(observationsText.includes("input.requests.forEach"), "observation batch preserves input order");
assert(patternText.includes("minimumPeriodCount"), "patterns require sufficient period coverage");
assert(patternText.includes("supportingObservationIds"), "patterns preserve supporting observation IDs");
assert(patternText.includes("driverCategories"), "patterns preserve driver categories");
assert(patternText.includes("sourceReferences"), "patterns preserve source references");
assert(patternsText.includes("input.requests.forEach"), "pattern batch preserves input order");
assert(memoryCandidateText.includes("FLUX_PATTERN_MEMORY_KEY_MAP"), "memory candidate mapping exists");
assert(memoryCandidateText.includes("candidate: null") && memoryCandidateText.includes("warnings"), "memory candidates fail closed with warnings");
assert(memoryCandidateText.includes("driverCategories"), "memory candidates preserve driver categories");

const forbiddenPatterns = [
  { pattern: /@supabase\/supabase-js|createClient\(/i, message: "Supabase imports do not exist" },
  { pattern: /\.(select|from)\s*\(/i, message: "database reads do not exist" },
  { pattern: /\.(insert|upsert|update|delete|rpc)\s*\(/i, message: "database writes do not exist" },
  { pattern: /service[_-]?role/i, message: "service-role usage does not exist" },
  { pattern: /\bfetch\s*\(|XMLHttpRequest|axios\./i, message: "external API calls do not exist" },
  { pattern: /from\s+["']openai["']|@openai|new\s+OpenAI\b/i, message: "OpenAI imports do not exist" },
  { pattern: /from\s+["'][^"']*forecast|import\s+[^;]*forecast|forecastEngine|forecast_engine/i, message: "forecasting implementation does not exist" },
  { pattern: /recommendation-engine|recommendation_engine|recommendationEngine|buildFluxRecommendation/i, message: "recommendation implementation does not exist" },
  { pattern: /commentaryEngine|commentary_engine|generateCommentary|buildCommentary/i, message: "commentary implementation does not exist" },
  { pattern: /scenarioModel|scenario_model|scenario-engine|buildScenario/i, message: "scenario modeling implementation does not exist" },
  { pattern: /healthcareAnalytics|healthcare_analytics|healthcare-workforce|healthcare[\\/]analytics/i, message: "healthcare analytics implementation does not exist" },
  { pattern: /manufacturingAnalytics|manufacturing_analytics|manufacturing[\\/]analytics/i, message: "manufacturing analytics implementation does not exist" },
  { pattern: /app[\\/]dashboard|dashboard/i, message: "dashboard wiring does not exist" },
  { pattern: /pdf|financial-package-pdf/i, message: "PDF wiring does not exist" },
  { pattern: /powerpoint|pptx/i, message: "PowerPoint wiring does not exist" },
  { pattern: /pulse/i, message: "Pulse wiring does not exist" },
  { pattern: /from\s+["'][^"']*(provider|quickbooks|xero|sage|netsuite|dynamics)|lib[\\/]integrations/i, message: "provider wiring does not exist" },
  { pattern: /persistCompanyMemory|memoryPersistence|company-memory-persistence|buildCompanyMemoryRecord\s*\(/i, message: "Company Memory persistence calls do not exist" },
  { pattern: /reviewMemoryCandidate|buildPromotionDecision|approved_for_promotion|executePromotion/i, message: "promotion execution calls do not exist" },
];

for (const { pattern, message } of forbiddenPatterns) {
  assert(!pattern.test(allFluxText), message);
}

assert(
  packageJson.scripts?.["verify:si-flux-analysis"] === "node scripts/verify-si-flux-analysis.js",
  "package script verify:si-flux-analysis exists",
);

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI Flux analysis verification passed.");
