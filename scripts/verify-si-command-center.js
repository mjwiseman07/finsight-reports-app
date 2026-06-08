/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const commandCenterRoot = path.join(root, "lib", "intelligence", "synthetic", "command-center");

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

const requiredFiles = [
  "lib/intelligence/synthetic/command-center/types.ts",
  "lib/intelligence/synthetic/command-center/constants.ts",
  "lib/intelligence/synthetic/command-center/index.ts",
  "lib/intelligence/synthetic/command-center/candidates/buildCommandCenterCandidate.ts",
  "lib/intelligence/synthetic/command-center/candidates/buildCommandCenterCandidates.ts",
  "lib/intelligence/synthetic/command-center/candidates/index.ts",
  "lib/intelligence/synthetic/command-center/evidence/buildCommandCenterEvidence.ts",
  "lib/intelligence/synthetic/command-center/evidence/buildCommandCenterEvidenceCollection.ts",
  "lib/intelligence/synthetic/command-center/evidence/index.ts",
  "lib/intelligence/synthetic/command-center/prioritization/buildCommandCenterPrioritization.ts",
  "lib/intelligence/synthetic/command-center/prioritization/buildCommandCenterPrioritizationCollection.ts",
  "lib/intelligence/synthetic/command-center/prioritization/index.ts",
];

for (const file of requiredFiles) {
  assert(exists(file), `${file} exists`);
}

const commandCenterFiles = listFiles(commandCenterRoot).filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));
const allCommandCenterText = commandCenterFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const typesText = read("lib/intelligence/synthetic/command-center/types.ts");
const constantsText = read("lib/intelligence/synthetic/command-center/constants.ts");
const commandCenterIndexText = read("lib/intelligence/synthetic/command-center/index.ts");
const candidateText = read("lib/intelligence/synthetic/command-center/candidates/buildCommandCenterCandidate.ts");
const candidatesText = read("lib/intelligence/synthetic/command-center/candidates/buildCommandCenterCandidates.ts");
const candidateIndexText = read("lib/intelligence/synthetic/command-center/candidates/index.ts");
const evidenceText = read("lib/intelligence/synthetic/command-center/evidence/buildCommandCenterEvidence.ts");
const evidenceCollectionText = read(
  "lib/intelligence/synthetic/command-center/evidence/buildCommandCenterEvidenceCollection.ts",
);
const evidenceIndexText = read("lib/intelligence/synthetic/command-center/evidence/index.ts");
const prioritizationText = read(
  "lib/intelligence/synthetic/command-center/prioritization/buildCommandCenterPrioritization.ts",
);
const prioritizationCollectionText = read(
  "lib/intelligence/synthetic/command-center/prioritization/buildCommandCenterPrioritizationCollection.ts",
);
const prioritizationIndexText = read("lib/intelligence/synthetic/command-center/prioritization/index.ts");
const packageJsonText = read("package.json");
const packageJson = JSON.parse(packageJsonText);

for (const taxonomy of [
  "SyntheticCommandCenterSurfaceCategory",
  "SyntheticCommandCenterIntelligenceSourceCategory",
  "SyntheticCommandCenterDecisionSurfaceCategory",
  "SyntheticCommandCenterAttentionCategory",
  "SyntheticCommandCenterPriorityLevel",
  "SyntheticCommandCenterRoleCategory",
  "SyntheticCommandCenterRoutingCategory",
]) {
  assertIncludes(typesText, taxonomy, `${taxonomy} taxonomy union exists`);
}

for (const constantName of [
  "SYNTHETIC_COMMAND_CENTER_SURFACE_CATEGORIES",
  "SYNTHETIC_COMMAND_CENTER_INTELLIGENCE_SOURCE_CATEGORIES",
  "SYNTHETIC_COMMAND_CENTER_DECISION_SURFACE_CATEGORIES",
  "SYNTHETIC_COMMAND_CENTER_ATTENTION_CATEGORIES",
  "SYNTHETIC_COMMAND_CENTER_PRIORITY_LEVELS",
  "SYNTHETIC_COMMAND_CENTER_ROLE_CATEGORIES",
  "SYNTHETIC_COMMAND_CENTER_ROUTING_CATEGORIES",
]) {
  assertIncludes(constantsText, constantName, `${constantName} typed taxonomy constant exists`);
}

for (const versionConstant of [
  "SYNTHETIC_COMMAND_CENTER_SCHEMA_VERSION",
  "SYNTHETIC_COMMAND_CENTER_TAXONOMY_VERSION",
  "SYNTHETIC_COMMAND_CENTER_CONTRACT_VERSION",
  "SYNTHETIC_COMMAND_CENTER_COMPATIBILITY_VERSION",
]) {
  assertIncludes(constantsText, versionConstant, `${versionConstant} exists`);
}

for (const repositoryConstant of [
  "SYNTHETIC_COMMAND_CENTER_SCORE_MIN",
  "SYNTHETIC_COMMAND_CENTER_SCORE_MAX",
  "SYNTHETIC_COMMAND_CENTER_CONFIDENCE_MIN",
  "SYNTHETIC_COMMAND_CENTER_CONFIDENCE_MAX",
  "SYNTHETIC_COMMAND_CENTER_FUTURE_VERIFIER_CHECKLIST",
  "SYNTHETIC_COMMAND_CENTER_REPOSITORY_SAFETY_EXCLUSIONS",
]) {
  assertIncludes(constantsText, repositoryConstant, `${repositoryConstant} repository standard exists`);
}

for (const contract of [
  "SyntheticCommandCenterCandidate",
  "SyntheticCommandCenterMetadata",
  "SyntheticCommandCenterPriority",
  "SyntheticCommandCenterSurface",
  "SyntheticCommandCenterRoleCompatibility",
  "SyntheticCommandCenterScope",
  "SyntheticCommandCenterValidationMetadata",
  "SyntheticCommandCenterEvidence",
  "SyntheticCommandCenterLineage",
  "SyntheticCommandCenterTrustMetadata",
  "SyntheticCommandCenterConfidenceMetadata",
  "SyntheticCommandCenterDegradationMetadata",
  "SyntheticCommandCenterRecoveryMetadata",
  "SyntheticCommandCenterAttentionMetadata",
  "SyntheticCommandCenterRoutingDescriptor",
  "SyntheticCommandCenterMemoryCompatibility",
  "SyntheticCommandCenterOnboardingCompatibility",
  "SyntheticCommandCenterPortfolioCompatibility",
  "SyntheticCommandCenterFirmCompatibility",
  "SyntheticCommandCenterGovernanceMetadata",
  "SyntheticCommandCenterCashReconciliationAgingCompatibility",
]) {
  assertIncludes(typesText, contract, `${contract} metadata contract exists`);
}

for (const builder of [
  ["buildCommandCenterCandidate", candidateText],
  ["buildCommandCenterCandidates", candidatesText],
  ["buildCommandCenterEvidence", evidenceText],
  ["buildCommandCenterEvidenceCollection", evidenceCollectionText],
  ["buildCommandCenterPrioritization", prioritizationText],
  ["buildCommandCenterPrioritizationCollection", prioritizationCollectionText],
]) {
  assertIncludes(builder[1], builder[0], `${builder[0]} builder exists`);
}

for (const [text, exportName] of [
  [commandCenterIndexText, "./types"],
  [commandCenterIndexText, "./constants"],
  [candidateIndexText, "buildCommandCenterCandidate"],
  [candidateIndexText, "buildCommandCenterCandidates"],
  [candidateIndexText, "SyntheticStructuredCommandCenterCandidate"],
  [evidenceIndexText, "buildCommandCenterEvidence"],
  [evidenceIndexText, "buildCommandCenterEvidenceCollection"],
  [evidenceIndexText, "SyntheticCommandCenterEvidencePackage"],
  [prioritizationIndexText, "buildCommandCenterPrioritization"],
  [prioritizationIndexText, "buildCommandCenterPrioritizationCollection"],
  [prioritizationIndexText, "SyntheticCommandCenterPrioritizationPackage"],
]) {
  assertIncludes(text, exportName, `${exportName} export exists`);
}

assertIncludes(candidateText, "stableSnapshotHash", "candidate stableSnapshotHash usage exists");
assertIncludes(candidateText, "candidate: null", "candidate fail-closed null output exists");
assertIncludes(candidateText, "skipped: true", "candidate fail-closed skipped output exists");
assertIncludes(candidateText, "trustMetadata", "candidate trust metadata preservation exists");
assertIncludes(candidateText, "confidenceMetadata", "candidate confidence metadata preservation exists");
assertIncludes(candidateText, "routingDescriptors", "candidate routing metadata preservation exists");
assertIncludes(candidateText, "governanceMetadata", "candidate governance metadata preservation exists");
assertIncludes(candidateText, "cashReconciliationAgingCompatibility", "candidate cash reconciliation compatibility exists");

assertIncludes(evidenceText, "stableSnapshotHash", "evidence stableSnapshotHash usage exists");
assertIncludes(evidenceText, "sourceReferenceIds", "evidence source references are preserved");
assertIncludes(evidenceText, "trustMetadata", "evidence trust metadata preservation exists");
assertIncludes(evidenceText, "confidenceMetadata", "evidence confidence metadata preservation exists");
assertIncludes(evidenceText, "degradationMetadata", "evidence degradation metadata preservation exists");
assertIncludes(evidenceText, "recoveryMetadata", "evidence recovery metadata preservation exists");

assertIncludes(prioritizationText, "stableSnapshotHash", "prioritization stableSnapshotHash usage exists");
assertIncludes(prioritizationText, "priorityMetadata", "prioritization priority metadata preservation exists");
assertIncludes(prioritizationText, "attentionMetadata", "prioritization attention metadata preservation exists");
assertIncludes(prioritizationText, "routingDescriptors", "prioritization routing metadata preservation exists");
assertIncludes(prioritizationText, "surfaceCompatibility", "prioritization surface compatibility preservation exists");
assertIncludes(prioritizationText, "roleVisibilityDescriptor", "prioritization role visibility preservation exists");
assertIncludes(prioritizationText, "decisionQueueCompatibility", "prioritization decision queue preservation exists");
assertIncludes(prioritizationText, "watchlistCompatibility", "prioritization watchlist preservation exists");

for (const collectionText of [candidatesText, evidenceCollectionText, prioritizationCollectionText]) {
  assertIncludes(collectionText, "skippedRequestIndexes", "collection skipped indexes are collected");
  assertIncludes(collectionText, "warnings.push", "collection warnings are collected");
  assertIncludes(collectionText, "forEach((request, index)", "collection preserves input-order traversal");
}

assert(packageJson.scripts["verify:si-command-center"] === "node scripts/verify-si-command-center.js", "package script exists");

for (const file of commandCenterFiles) {
  assert(!file.endsWith(".tsx"), `${path.relative(root, file)} is not TSX`);
}

assertNotMatches(allCommandCenterText, /\bfrom\s+["']react["']|\brequire\(["']react["']\)/, "no React imports");
assertNotMatches(allCommandCenterText, /<\s*[A-Z][A-Za-z0-9]*(\s|>|\/>)/, "no JSX-like component rendering");
assertNotMatches(allCommandCenterText, /\bNextResponse\b|\bNextRequest\b|app\/api|route\.ts/, "no API route code");
assertNotMatches(allCommandCenterText, /\bfetch\s*\(|\bXMLHttpRequest\b|\baxios\b|\bhttp\.|\bhttps\./, "no network or HTTP calls");
assertNotMatches(allCommandCenterText, /\bPrismaClient\b|@prisma\/client|\bprisma\./, "no Prisma client usage");
assertNotMatches(allCommandCenterText, /\bcreateClient\s*\(|@supabase\/supabase-js|\bsupabase\./, "no database client usage");
assertNotMatches(allCommandCenterText, /\.(insert|update|upsert|delete)\s*\(/, "no persistence writes");
assertNotMatches(allCommandCenterText, /\b(localStorage|sessionStorage|document|window)\b/, "no browser UI globals");
assertNotMatches(allCommandCenterText, /\b(class|function)\s+\w*(Routing|Scoring|Ranking|Validation)Engine\b/, "no engines");
assertNotMatches(allCommandCenterText, /\b(score|rank|route|aggregate|calculate|detect|recover|persist|write)CommandCenter/i, "no runtime engine functions");
assertNotMatches(allCommandCenterText, /\b(memoryWrite|writeMemory|initializeMemory|runOnboarding|generatePortfolio)\b/i, "no memory/onboarding/portfolio execution");

if (process.exitCode) {
  console.error("Command Center verifier failed.");
  process.exit(process.exitCode);
}

console.log("Command Center verifier passed.");
