/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const fteRoot = path.join(root, "lib", "intelligence", "synthetic", "fte-analytics");

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
  "lib/intelligence/synthetic/fte-analytics",
  "lib/intelligence/synthetic/fte-analytics/observations",
  "lib/intelligence/synthetic/fte-analytics/patterns",
  "lib/intelligence/synthetic/fte-analytics/memory",
];

for (const directory of requiredDirectories) {
  assert(exists(directory), `${directory} exists`);
}

const requiredFiles = [
  "lib/intelligence/synthetic/fte-analytics/types.ts",
  "lib/intelligence/synthetic/fte-analytics/constants.ts",
  "lib/intelligence/synthetic/fte-analytics/index.ts",
  "lib/intelligence/synthetic/fte-analytics/observations/buildFteObservation.ts",
  "lib/intelligence/synthetic/fte-analytics/observations/buildFteObservations.ts",
  "lib/intelligence/synthetic/fte-analytics/observations/index.ts",
  "lib/intelligence/synthetic/fte-analytics/patterns/buildFtePattern.ts",
  "lib/intelligence/synthetic/fte-analytics/patterns/buildFtePatterns.ts",
  "lib/intelligence/synthetic/fte-analytics/patterns/index.ts",
  "lib/intelligence/synthetic/fte-analytics/memory/buildFteMemoryCandidate.ts",
  "lib/intelligence/synthetic/fte-analytics/memory/buildFteMemoryCandidates.ts",
  "lib/intelligence/synthetic/fte-analytics/memory/index.ts",
];

for (const file of requiredFiles) {
  assert(exists(file), `${file} exists`);
}

const fteFiles = listFiles(fteRoot).filter((file) => file.endsWith(".ts"));
const allFteText = fteFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const typesText = read("lib/intelligence/synthetic/fte-analytics/types.ts");
const constantsText = read("lib/intelligence/synthetic/fte-analytics/constants.ts");
const observationText = read("lib/intelligence/synthetic/fte-analytics/observations/buildFteObservation.ts");
const observationsText = read("lib/intelligence/synthetic/fte-analytics/observations/buildFteObservations.ts");
const patternText = read("lib/intelligence/synthetic/fte-analytics/patterns/buildFtePattern.ts");
const patternsText = read("lib/intelligence/synthetic/fte-analytics/patterns/buildFtePatterns.ts");
const memoryCandidateText = read("lib/intelligence/synthetic/fte-analytics/memory/buildFteMemoryCandidate.ts");
const packageJson = JSON.parse(read("package.json"));

for (const contract of [
  "SyntheticFteAnalyticsRequest",
  "SyntheticFteAnalyticsResult",
  "SyntheticFteAnalyticsMetadata",
  "SyntheticFteObservation",
  "SyntheticFtePattern",
  "SyntheticFteMetric",
  "SyntheticFteScope",
  "SyntheticFteSourceReference",
]) {
  assert(typesText.includes(contract), `${contract} contract exists`);
}

for (const metric of [
  "employee_count",
  "active_employee_count",
  "employee_fte",
  "budgeted_fte",
  "contractor_fte",
  "workforce_equivalent",
  "vacancy_fte",
  "fte_utilization_percent",
  "capacity_gap_percent",
  "overtime_hours",
  "overtime_fte_equivalent",
]) {
  assert(constantsText.includes(metric) && typesText.includes(metric), `${metric} core metric exists`);
}

for (const observationType of [
  "employee_fte_growth",
  "employee_fte_decline",
  "vacancy_increase",
  "vacancy_decrease",
  "contractor_reliance",
  "overtime_dependency",
  "agency_labor_dependency",
  "seasonal_staffing_pattern",
  "workforce_mix_shift",
  "capacity_gap_increase",
  "capacity_gap_decrease",
  "fte_utilization_change",
]) {
  assert(
    constantsText.includes(observationType) && typesText.includes(observationType),
    `${observationType} observation type exists`,
  );
}

for (const patternType of [
  "sustained_fte_growth",
  "sustained_fte_decline",
  "recurring_overtime_dependency",
  "recurring_contractor_reliance",
  "recurring_agency_labor_reliance",
  "staffing_shortage_pattern",
  "recurring_capacity_gap",
  "low_fte_utilization_pattern",
  "workforce_mix_shift_pattern",
  "seasonal_staffing_pattern",
]) {
  assert(constantsText.includes(patternType) && typesText.includes(patternType), `${patternType} pattern type exists`);
}

for (const [patternType, memoryKey] of [
  ["sustained_fte_growth", "sustained_employee_fte_growth"],
  ["sustained_fte_decline", "sustained_employee_fte_decline"],
  ["recurring_overtime_dependency", "recurring_overtime_dependency"],
  ["recurring_contractor_reliance", "recurring_contractor_reliance"],
  ["recurring_agency_labor_reliance", "recurring_agency_labor_reliance"],
  ["staffing_shortage_pattern", "sustained_staffing_shortage"],
  ["recurring_capacity_gap", "recurring_capacity_gap"],
  ["low_fte_utilization_pattern", "low_fte_utilization"],
  ["workforce_mix_shift_pattern", "workforce_mix_shift"],
  ["seasonal_staffing_pattern", "seasonal_staffing_pattern"],
]) {
  assert(
    memoryCandidateText.includes(`${patternType}: "${memoryKey}"`),
    `${patternType} maps to ${memoryKey}`,
  );
}

assert(observationText.includes("stableSnapshotHash"), "observations use deterministic hashing");
assert(observationText.includes("absoluteChange") && observationText.includes("percentChange"), "observations calculate changes");
assert(observationsText.includes("input.requests.forEach"), "observation batch preserves input order");
assert(patternText.includes("minimumPeriodCount"), "patterns require sufficient period coverage");
assert(patternText.includes("supportingObservationIds"), "patterns preserve supporting observation IDs");
assert(patternsText.includes("input.requests.forEach"), "pattern batch preserves input order");
assert(memoryCandidateText.includes("FTE_PATTERN_MEMORY_KEY_MAP"), "memory candidate mapping exists");
assert(memoryCandidateText.includes("candidate: null") && memoryCandidateText.includes("warnings"), "memory candidates fail closed with warnings");

const forbiddenPatterns = [
  { pattern: /@supabase\/supabase-js|createClient\(/i, message: "Supabase imports do not exist" },
  { pattern: /\.(select|from)\s*\(/i, message: "database reads do not exist" },
  { pattern: /\.(insert|upsert|update|delete|rpc)\s*\(/i, message: "database writes do not exist" },
  { pattern: /service[_-]?role/i, message: "service-role usage does not exist" },
  { pattern: /\bfetch\s*\(|XMLHttpRequest|axios\./i, message: "external API calls do not exist" },
  { pattern: /from\s+["']openai["']|@openai|new\s+OpenAI\b/i, message: "OpenAI imports do not exist" },
  { pattern: /from\s+["'][^"']*forecast|import\s+[^;]*forecast|forecastEngine|forecast_engine/i, message: "forecasting implementation does not exist" },
  { pattern: /recommendation-engine|recommendation_engine|recommendationEngine/i, message: "recommendation implementation does not exist" },
  { pattern: /commentaryEngine|commentary_engine|generateCommentary/i, message: "commentary implementation does not exist" },
  { pattern: /fluxAnalysis|flux_analysis|flux-engine/i, message: "Flux implementation does not exist" },
  { pattern: /scenarioModel|scenario_model|scenario-engine/i, message: "scenario modeling implementation does not exist" },
  { pattern: /app[\\/]dashboard|dashboard/i, message: "dashboard wiring does not exist" },
  { pattern: /pdf|financial-package-pdf/i, message: "PDF wiring does not exist" },
  { pattern: /powerpoint|pptx/i, message: "PowerPoint wiring does not exist" },
  { pattern: /pulse/i, message: "Pulse wiring does not exist" },
  { pattern: /from\s+["'][^"']*(provider|quickbooks|xero|sage|netsuite|dynamics)|lib[\\/]integrations/i, message: "provider wiring does not exist" },
  { pattern: /persistCompanyMemory|memoryPersistence|buildCompanyMemoryRecord\s*\(/i, message: "Company Memory persistence calls do not exist" },
  { pattern: /reviewMemoryCandidate|buildPromotionDecision|approved_for_promotion/i, message: "promotion execution calls do not exist" },
];

for (const { pattern, message } of forbiddenPatterns) {
  assert(!pattern.test(allFteText), message);
}

assert(
  packageJson.scripts?.["verify:si-fte-analytics"] === "node scripts/verify-si-fte-analytics.js",
  "package script verify:si-fte-analytics exists",
);

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI FTE analytics verification passed.");
