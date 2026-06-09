/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const commandCenterRoot = path.join(root, "lib", "intelligence", "synthetic", "command-center");

const surfaceDirectories = [
  "surface-candidates",
  "summaries",
  "decision-queues",
  "watchlists",
  "briefings",
];

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

function assertIncludes(text, token, message) {
  assert(text.includes(token), message);
}

function assertNotMatches(text, pattern, message) {
  assert(!pattern.test(text), message);
}

function readIfExists(relativePath) {
  return exists(relativePath) ? read(relativePath) : "";
}

const requiredFiles = [
  "lib/intelligence/synthetic/command-center/surface-candidates/buildCommandCenterSurfaceCandidate.ts",
  "lib/intelligence/synthetic/command-center/surface-candidates/buildCommandCenterSurfaceCandidates.ts",
  "lib/intelligence/synthetic/command-center/surface-candidates/index.ts",
  "lib/intelligence/synthetic/command-center/summaries/buildCommandCenterExecutiveSummary.ts",
  "lib/intelligence/synthetic/command-center/summaries/buildCommandCenterExecutiveSummaries.ts",
  "lib/intelligence/synthetic/command-center/summaries/index.ts",
  "lib/intelligence/synthetic/command-center/decision-queues/buildCommandCenterDecisionQueue.ts",
  "lib/intelligence/synthetic/command-center/decision-queues/buildCommandCenterDecisionQueues.ts",
  "lib/intelligence/synthetic/command-center/decision-queues/index.ts",
  "lib/intelligence/synthetic/command-center/watchlists/buildCommandCenterWatchlist.ts",
  "lib/intelligence/synthetic/command-center/watchlists/buildCommandCenterWatchlists.ts",
  "lib/intelligence/synthetic/command-center/watchlists/index.ts",
  "lib/intelligence/synthetic/command-center/briefings/buildCommandCenterBriefing.ts",
  "lib/intelligence/synthetic/command-center/briefings/buildCommandCenterBriefings.ts",
  "lib/intelligence/synthetic/command-center/briefings/index.ts",
];

for (const file of requiredFiles) {
  assert(exists(file), `${file} exists`);
}

const surfaceCandidateText = readIfExists(
  "lib/intelligence/synthetic/command-center/surface-candidates/buildCommandCenterSurfaceCandidate.ts",
);
const surfaceCandidatesText = readIfExists(
  "lib/intelligence/synthetic/command-center/surface-candidates/buildCommandCenterSurfaceCandidates.ts",
);
const surfaceCandidatesIndexText = readIfExists(
  "lib/intelligence/synthetic/command-center/surface-candidates/index.ts",
);
const executiveSummaryText = readIfExists(
  "lib/intelligence/synthetic/command-center/summaries/buildCommandCenterExecutiveSummary.ts",
);
const executiveSummariesText = readIfExists(
  "lib/intelligence/synthetic/command-center/summaries/buildCommandCenterExecutiveSummaries.ts",
);
const summariesIndexText = readIfExists("lib/intelligence/synthetic/command-center/summaries/index.ts");
const decisionQueueText = readIfExists(
  "lib/intelligence/synthetic/command-center/decision-queues/buildCommandCenterDecisionQueue.ts",
);
const decisionQueuesText = readIfExists(
  "lib/intelligence/synthetic/command-center/decision-queues/buildCommandCenterDecisionQueues.ts",
);
const decisionQueuesIndexText = readIfExists("lib/intelligence/synthetic/command-center/decision-queues/index.ts");
const watchlistText = readIfExists(
  "lib/intelligence/synthetic/command-center/watchlists/buildCommandCenterWatchlist.ts",
);
const watchlistsText = readIfExists(
  "lib/intelligence/synthetic/command-center/watchlists/buildCommandCenterWatchlists.ts",
);
const watchlistsIndexText = readIfExists("lib/intelligence/synthetic/command-center/watchlists/index.ts");
const briefingText = readIfExists(
  "lib/intelligence/synthetic/command-center/briefings/buildCommandCenterBriefing.ts",
);
const briefingsText = readIfExists(
  "lib/intelligence/synthetic/command-center/briefings/buildCommandCenterBriefings.ts",
);
const briefingsIndexText = readIfExists("lib/intelligence/synthetic/command-center/briefings/index.ts");
const packageJsonText = read("package.json");
const packageJson = JSON.parse(packageJsonText);

const surfaceFiles = surfaceDirectories.flatMap((directory) =>
  listFiles(path.join(commandCenterRoot, directory)).filter((file) => file.endsWith(".ts") || file.endsWith(".tsx")),
);
const allSurfaceText = surfaceFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");

assertIncludes(surfaceCandidateText, "stableSnapshotHash", "32A stableSnapshotHash usage exists");
assertIncludes(surfaceCandidateText, "surfaceCandidate: null", "32A fail-closed null output exists");
assertIncludes(surfaceCandidateText, "skipped: true", "32A fail-closed skipped output exists");
assertIncludes(surfaceCandidateText, "surfaceArtifactCategory", "32A surface taxonomy preservation exists");
assertIncludes(surfaceCandidateText, "surfacePlacement", "32A surface placement preservation exists");
assertIncludes(surfaceCandidateText, "consumptionChannels", "32A consumption channel preservation exists");
assertIncludes(surfaceCandidateText, "memoryReferenceIds", "32A memory references exist");
assertIncludes(surfaceCandidateText, "outcomeReferenceIds", "32A outcome references exist");
assertIncludes(surfaceCandidateText, "whyNowReasons", "32A why-now reasons exist");

assertIncludes(executiveSummaryText, "stableSnapshotHash", "32B stableSnapshotHash usage exists");
for (const requiredSection of [
  "company_health",
  "cash_summary",
  "attention_required",
  "decisions_needed",
  "top_changes",
]) {
  assertIncludes(executiveSummaryText, requiredSection, `32B required section ${requiredSection} exists`);
}
for (const optionalSection of [
  "forecast_summary",
  "top_risks",
  "top_opportunities",
  "watchlist_changes",
  "briefing_highlights",
  "memory_context",
  "outcome_context",
  "industry_context",
]) {
  assertIncludes(executiveSummaryText, optionalSection, `32B optional section ${optionalSection} exists`);
}
for (const limitName of [
  "MAX_PRIMARY_SUMMARY_SECTIONS",
  "MAX_ATTENTION_ITEMS",
  "MAX_DECISIONS",
  "MAX_RISKS",
  "MAX_OPPORTUNITIES",
  "MAX_WATCHLIST_CHANGES",
]) {
  assertIncludes(executiveSummaryText, limitName, `32B capacity limit ${limitName} exists`);
}
for (const token of ["evidenceReferenceIds", "memoryReferenceIds", "outcomeReferenceIds", "whyNowReferenceIds"]) {
  assertIncludes(executiveSummaryText, token, `32B ${token} preservation exists`);
}

assertIncludes(decisionQueueText, "stableSnapshotHash", "32C stableSnapshotHash usage exists");
for (const category of [
  "cash_decision",
  "workforce_decision",
  "forecast_decision",
  "scenario_decision",
  "board_decision",
  "close_decision",
  "portfolio_decision",
]) {
  assertIncludes(decisionQueueText, category, `32C decision category ${category} exists`);
}
assertIncludes(decisionQueueText, "decisionCategory", "32C decision category identity exists");
assertIncludes(decisionQueueText, "decisionQueueCompatibility", "32C decision distinction compatibility exists");
for (const token of ["evidenceReferenceIds", "memoryReferenceIds", "outcomeReferenceIds"]) {
  assertIncludes(decisionQueueText, token, `32C ${token} preservation exists`);
}

assertIncludes(watchlistText, "stableSnapshotHash", "32D stableSnapshotHash usage exists");
for (const category of [
  "cash_watchlist",
  "forecast_watchlist",
  "scenario_watchlist",
  "customer_watchlist",
  "vendor_watchlist",
  "workforce_watchlist",
  "close_watchlist",
  "portfolio_watchlist",
  "reconciliation_watchlist",
  "risk_watchlist",
]) {
  assertIncludes(watchlistText, category, `32D watchlist category ${category} exists`);
}
for (const token of ["evidenceReferenceIds", "memoryReferenceIds", "outcomeReferenceIds"]) {
  assertIncludes(watchlistText, token, `32D ${token} preservation exists`);
}

assertIncludes(briefingText, "stableSnapshotHash", "32E stableSnapshotHash usage exists");
for (const briefingType of [
  "daily_cfo_brief",
  "weekly_executive_brief",
  "monthly_board_brief",
  "weekly_controller_brief",
  "daily_cash_brief",
  "portfolio_brief",
  "firm_manager_brief",
  "client_owner_brief",
  "close_readiness_brief",
  "reconciliation_exception_brief",
]) {
  assertIncludes(briefingText, briefingType, `32E briefing type ${briefingType} exists`);
}
for (const cadence of [
  "disabled",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "event_driven",
  "threshold_driven",
  "manual_request",
]) {
  assertIncludes(briefingText, cadence, `32E cadence metadata ${cadence} exists`);
}
for (const token of [
  "executiveSummaryIds",
  "decisionQueueIds",
  "watchlistIds",
  "surfaceCandidateIds",
  "memoryReferenceIds",
  "outcomeReferenceIds",
  "whyNowReferenceIds",
]) {
  assertIncludes(briefingText, token, `32E ${token} preservation exists`);
}

for (const [text, exportName] of [
  [surfaceCandidatesIndexText, "buildCommandCenterSurfaceCandidate"],
  [surfaceCandidatesIndexText, "buildCommandCenterSurfaceCandidates"],
  [surfaceCandidatesIndexText, "SyntheticStructuredCommandCenterSurfaceCandidate"],
  [summariesIndexText, "buildCommandCenterExecutiveSummary"],
  [summariesIndexText, "buildCommandCenterExecutiveSummaries"],
  [summariesIndexText, "SyntheticCommandCenterExecutiveSummary"],
  [decisionQueuesIndexText, "buildCommandCenterDecisionQueue"],
  [decisionQueuesIndexText, "buildCommandCenterDecisionQueues"],
  [watchlistsIndexText, "buildCommandCenterWatchlist"],
  [watchlistsIndexText, "buildCommandCenterWatchlists"],
  [briefingsIndexText, "buildCommandCenterBriefing"],
  [briefingsIndexText, "buildCommandCenterBriefings"],
]) {
  assertIncludes(text, exportName, `${exportName} export exists`);
}

for (const collectionText of [
  surfaceCandidatesText,
  executiveSummariesText,
  decisionQueuesText,
  watchlistsText,
  briefingsText,
]) {
  assertIncludes(collectionText, "skippedRequestIndexes", "collection skipped indexes are collected");
  assertIncludes(collectionText, "warnings.push", "collection warnings are collected");
  assertIncludes(collectionText, "forEach((request, index)", "collection preserves deterministic input-order traversal");
}

for (const principleToken of [
  "SYNTHETIC_COMMAND_CENTER_BRIEFING_CONSUMPTION_SECTION_ORDER",
  "MAX_PRIMARY_SUMMARY_SECTIONS",
  "MAX_ATTENTION_ITEMS",
  "MAX_DECISIONS",
  "whyNowReferenceIds",
  "roleVisibilityCategories",
  "consumptionSectionOrder",
  "surfaceCategory",
  "decisionSurfaceCategory",
]) {
  assertIncludes(allSurfaceText, principleToken, `experience-principle compatibility token ${principleToken} exists`);
}

assert(
  packageJson.scripts["verify:si-command-center-surfaces"] ===
    "node scripts/verify-si-command-center-surfaces.js",
  "package script exists",
);

for (const file of surfaceFiles) {
  assert(!file.endsWith(".tsx"), `${path.relative(root, file)} is not TSX`);
}

assertNotMatches(allSurfaceText, /\bfrom\s+["']react["']|\brequire\(["']react["']\)/, "no React imports");
assertNotMatches(allSurfaceText, /return\s*\(\s*<|=>\s*\(\s*</, "no JSX-like component rendering");
assertNotMatches(allSurfaceText, /\bdashboard\b|\bwidget\b|\brender(?:ing)?\b|\bUI\b/i, "no dashboard, widget, rendering, or UI surface code");
assertNotMatches(allSurfaceText, /\b(class|function)\s+\w*(Routing|Scoring|Ranking|Workflow|Approval)Engine\b/i, "no runtime engines");
assertNotMatches(allSurfaceText, /\b(score|rank|route|approve|execute|schedule|deliver|notify|alert|email|slack|teams|mobileNotification)\w*\s*\(/i, "no execution or delivery functions");
assertNotMatches(allSurfaceText, /\bfetch\s*\(|\bXMLHttpRequest\b|\baxios\b|\bhttp\.|\bhttps\./, "no fetch or HTTP calls");
assertNotMatches(allSurfaceText, /\bPrismaClient\b|@prisma\/client|\bprisma\./, "no Prisma usage");
assertNotMatches(allSurfaceText, /\bcreateClient\s*\(|@supabase\/supabase-js|\bsupabase\./, "no database clients");
assertNotMatches(allSurfaceText, /\.(insert|update|upsert|delete)\s*\(/, "no persistence writes");
assertNotMatches(allSurfaceText, /\b(localStorage|sessionStorage|document|window)\b/, "no browser or UI globals");
assertNotMatches(allSurfaceText, /\bPDFDocument\b|\bPowerPoint\b|\bpptx\b|\bpdf-lib\b/i, "no PDF or PowerPoint generation");
assertNotMatches(allSurfaceText, /\b(memoryWrite|writeMemory|calculateOutcome|calculateConfidence|calculateTrust)\b/i, "no memory writes or outcome/confidence/trust calculations");

const scriptText = fs.readFileSync(__filename, "utf8");
assertNotMatches(scriptText, /\brequire\((?!["']fs["']\)|["']path["']\))/, "verifier uses fs/path only");

if (process.exitCode) {
  console.error("Command Center surface verifier failed.");
  process.exit(process.exitCode);
}

console.log("Command Center surface verifier passed.");
