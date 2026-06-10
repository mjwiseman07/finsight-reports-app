/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const auditRoot = path.join(root, "lib", "intelligence", "synthetic", "audit");

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

function readIfExists(relativePath) {
  return exists(relativePath) ? read(relativePath) : "";
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
  "lib/intelligence/synthetic/audit/types.ts",
  "lib/intelligence/synthetic/audit/constants.ts",
  "lib/intelligence/synthetic/audit/index.ts",
  "lib/intelligence/synthetic/audit/candidates/buildAuditCandidate.ts",
  "lib/intelligence/synthetic/audit/candidates/buildAuditCandidates.ts",
  "lib/intelligence/synthetic/audit/candidates/index.ts",
  "lib/intelligence/synthetic/audit/evidence/buildAuditEvidence.ts",
  "lib/intelligence/synthetic/audit/evidence/buildAuditEvidenceCollection.ts",
  "lib/intelligence/synthetic/audit/evidence/index.ts",
  "lib/intelligence/synthetic/audit/findings/buildAuditFinding.ts",
  "lib/intelligence/synthetic/audit/findings/buildAuditFindings.ts",
  "lib/intelligence/synthetic/audit/findings/index.ts",
  "lib/intelligence/synthetic/audit/confidence/buildAuditConfidence.ts",
  "lib/intelligence/synthetic/audit/confidence/buildAuditConfidenceCollection.ts",
  "lib/intelligence/synthetic/audit/confidence/index.ts",
  "lib/intelligence/synthetic/audit/surfaces/buildAuditSurface.ts",
  "lib/intelligence/synthetic/audit/surfaces/buildAuditSurfaces.ts",
  "lib/intelligence/synthetic/audit/surfaces/index.ts",
  "lib/intelligence/synthetic/audit/watchlists/buildAuditWatchlist.ts",
  "lib/intelligence/synthetic/audit/watchlists/buildAuditWatchlists.ts",
  "lib/intelligence/synthetic/audit/watchlists/index.ts",
  "lib/intelligence/synthetic/audit/briefings/buildAuditBriefing.ts",
  "lib/intelligence/synthetic/audit/briefings/buildAuditBriefings.ts",
  "lib/intelligence/synthetic/audit/briefings/index.ts",
];

const builderPhases = [
  {
    phase: "34B audit candidates",
    builder: "lib/intelligence/synthetic/audit/candidates/buildAuditCandidate.ts",
    collection: "lib/intelligence/synthetic/audit/candidates/buildAuditCandidates.ts",
    index: "lib/intelligence/synthetic/audit/candidates/index.ts",
    builderExport: "buildAuditCandidate",
    collectionExport: "buildAuditCandidates",
    nullToken: "auditCandidate: null",
    identityToken: "auditCandidateId",
  },
  {
    phase: "34C audit evidence",
    builder: "lib/intelligence/synthetic/audit/evidence/buildAuditEvidence.ts",
    collection: "lib/intelligence/synthetic/audit/evidence/buildAuditEvidenceCollection.ts",
    index: "lib/intelligence/synthetic/audit/evidence/index.ts",
    builderExport: "buildAuditEvidence",
    collectionExport: "buildAuditEvidenceCollection",
    nullToken: "auditEvidencePackage: null",
    identityToken: "auditEvidencePackageId",
  },
  {
    phase: "34D audit findings",
    builder: "lib/intelligence/synthetic/audit/findings/buildAuditFinding.ts",
    collection: "lib/intelligence/synthetic/audit/findings/buildAuditFindings.ts",
    index: "lib/intelligence/synthetic/audit/findings/index.ts",
    builderExport: "buildAuditFinding",
    collectionExport: "buildAuditFindings",
    nullToken: "auditFinding: null",
    identityToken: "auditFindingArtifactId",
  },
  {
    phase: "34E audit confidence",
    builder: "lib/intelligence/synthetic/audit/confidence/buildAuditConfidence.ts",
    collection: "lib/intelligence/synthetic/audit/confidence/buildAuditConfidenceCollection.ts",
    index: "lib/intelligence/synthetic/audit/confidence/index.ts",
    builderExport: "buildAuditConfidence",
    collectionExport: "buildAuditConfidenceCollection",
    nullToken: "auditConfidence: null",
    identityToken: "auditConfidenceId",
  },
  {
    phase: "34F audit surfaces",
    builder: "lib/intelligence/synthetic/audit/surfaces/buildAuditSurface.ts",
    collection: "lib/intelligence/synthetic/audit/surfaces/buildAuditSurfaces.ts",
    index: "lib/intelligence/synthetic/audit/surfaces/index.ts",
    builderExport: "buildAuditSurface",
    collectionExport: "buildAuditSurfaces",
    nullToken: "auditSurface: null",
    identityToken: "auditSurfaceId",
  },
  {
    phase: "34G audit watchlists",
    builder: "lib/intelligence/synthetic/audit/watchlists/buildAuditWatchlist.ts",
    collection: "lib/intelligence/synthetic/audit/watchlists/buildAuditWatchlists.ts",
    index: "lib/intelligence/synthetic/audit/watchlists/index.ts",
    builderExport: "buildAuditWatchlist",
    collectionExport: "buildAuditWatchlists",
    nullToken: "auditWatchlist: null",
    identityToken: "auditWatchlistId",
  },
  {
    phase: "34H audit briefings",
    builder: "lib/intelligence/synthetic/audit/briefings/buildAuditBriefing.ts",
    collection: "lib/intelligence/synthetic/audit/briefings/buildAuditBriefings.ts",
    index: "lib/intelligence/synthetic/audit/briefings/index.ts",
    builderExport: "buildAuditBriefing",
    collectionExport: "buildAuditBriefings",
    nullToken: "auditBriefing: null",
    identityToken: "auditBriefingId",
  },
];

for (const file of requiredFiles) {
  assert(exists(file), `${file} exists`);
}

const auditFiles = listFiles(auditRoot).filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));
const allAuditText = auditFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const typesText = readIfExists("lib/intelligence/synthetic/audit/types.ts");
const constantsText = readIfExists("lib/intelligence/synthetic/audit/constants.ts");
const rootIndexText = readIfExists("lib/intelligence/synthetic/audit/index.ts");
const packageJson = JSON.parse(read("package.json"));

for (const token of [
  "SyntheticAuditCategory",
  "SyntheticAuditObservationCategory",
  "SyntheticAuditFindingCategory",
  "SyntheticAuditExceptionCategory",
  "SyntheticAuditRiskCategory",
  "SyntheticAuditConfidenceCategory",
  "SyntheticAuditTrustCategory",
  "SyntheticAuditGovernanceStatus",
  "SyntheticAuditMaterialityCategory",
  "SyntheticAuditSurfaceCompatibilityTarget",
  "SyntheticAuditScope",
  "SyntheticAuditObservationMetadata",
  "SyntheticAuditFindingMetadata",
  "SyntheticAuditExceptionMetadata",
  "SyntheticAuditRiskMetadata",
  "SyntheticAuditEvidenceReferences",
  "SyntheticAuditTrustMetadata",
  "SyntheticAuditConfidenceMetadata",
  "SyntheticAuditGovernanceMetadata",
  "SyntheticAuditMaterialityCompatibility",
  "SyntheticAuditPersonaCompatibility",
  "SyntheticAuditPackageCompatibility",
  "SyntheticAuditMemoryCompatibility",
  "SyntheticAuditLearningCompatibility",
  "SyntheticAuditSurfaceCompatibility",
  "SyntheticAuditContract",
]) {
  assertIncludes(typesText, token, `34A audit contract token ${token} exists`);
}

for (const token of [
  "SYNTHETIC_AUDIT_SCHEMA_VERSION",
  "SYNTHETIC_AUDIT_TAXONOMY_VERSION",
  "SYNTHETIC_AUDIT_CONTRACT_VERSION",
  "SYNTHETIC_AUDIT_COMPATIBILITY_VERSION",
  "SYNTHETIC_AUDIT_CATEGORIES",
  "SYNTHETIC_AUDIT_OBSERVATION_CATEGORIES",
  "SYNTHETIC_AUDIT_FINDING_CATEGORIES",
  "SYNTHETIC_AUDIT_EXCEPTION_CATEGORIES",
  "SYNTHETIC_AUDIT_RISK_CATEGORIES",
  "SYNTHETIC_AUDIT_REPOSITORY_SAFETY_EXCLUSIONS",
]) {
  assertIncludes(constantsText, token, `34A audit constant ${token} exists`);
}

assertIncludes(rootIndexText, "./types", "34A root barrel exports types");
assertIncludes(rootIndexText, "./constants", "34A root barrel exports constants");

for (const phase of builderPhases) {
  const builderText = readIfExists(phase.builder);
  const collectionText = readIfExists(phase.collection);
  const indexText = readIfExists(phase.index);

  assertIncludes(builderText, "stableSnapshotHash", `${phase.phase} stableSnapshotHash usage exists`);
  assertIncludes(builderText, phase.identityToken, `${phase.phase} deterministic identity token exists`);
  assertIncludes(builderText, phase.nullToken, `${phase.phase} fail-closed null artifact exists`);
  assertIncludes(builderText, "skipped: true", `${phase.phase} fail-closed skipped output exists`);
  assertIncludes(builderText, "warnings", `${phase.phase} warnings exist`);
  assertIncludes(builderText, "validate", `${phase.phase} validation exists`);
  assertIncludes(indexText, phase.builderExport, `${phase.phase} builder export exists`);
  assertIncludes(indexText, phase.collectionExport, `${phase.phase} collection export exists`);
  assertIncludes(collectionText, "skippedRequestIndexes", `${phase.phase} skipped indexes are collected`);
  assertIncludes(collectionText, "warnings.push", `${phase.phase} warnings are collected`);
  assertIncludes(collectionText, "forEach((request, index)", `${phase.phase} deterministic input-order traversal exists`);
}

for (const token of [
  "evidenceReferenceIds",
  "sourceReferenceIds",
  "lineageReferenceIds",
  "trustMetadata",
  "confidenceMetadata",
  "governanceMetadata",
  "materialityCompatibility",
  "personaCompatibility",
  "packageCompatibility",
  "memoryCompatibility",
  "learningCompatibility",
  "surfaceCompatibility",
  "watchlistCompatibility",
  "briefingCompatibility",
  "scope",
  "customerIsolationRequired",
  "firmIsolationRequired",
  "clientIsolationRequired",
  "firmId",
  "clientId",
  "isolationBoundaryIds",
]) {
  assertIncludes(allAuditText, token, `required audit metadata marker ${token} exists`);
}

assert(
  packageJson.scripts["verify:si-audit-intelligence"] === "node scripts/verify-si-audit-intelligence.js",
  "package script verify:si-audit-intelligence exists",
);

for (const file of auditFiles) {
  assert(!file.endsWith(".tsx"), `${path.relative(root, file)} is not TSX`);
}

assertNotMatches(allAuditText, /\bfrom\s+["']react["']|\brequire\(["']react["']\)/, "no React imports");
assertNotMatches(allAuditText, /return\s*\(\s*<|=>\s*\(\s*</, "no JSX-like rendering");
assertNotMatches(allAuditText, /\bdashboard\b|\bwidget\b|\brender(?:ing)?\b|\bUI\b/i, "no UI, dashboards, widgets, or rendering");
assertNotMatches(allAuditText, /\bNextResponse\b|\bNextRequest\b|app\/api|route\.ts/, "no API routes");
assertNotMatches(allAuditText, /\bfetch\s*\(|\bXMLHttpRequest\b|\baxios\b|\bhttp\.|\bhttps\./, "no fetch or HTTP calls");
assertNotMatches(allAuditText, /\bPrismaClient\b|@prisma\/client|\bprisma\./, "no Prisma");
assertNotMatches(allAuditText, /\bcreateClient\s*\(|@supabase\/supabase-js|\bsupabase\./, "no database clients");
assertNotMatches(allAuditText, /\.(insert|update|upsert|delete)\s*\(/, "no persistence writes");
assertNotMatches(allAuditText, /\b(localStorage|sessionStorage|document|window)\b/, "no browser globals");
assertNotMatches(allAuditText, /\b(class|function)\s+\w*(Scoring|Ranking|Routing|Workflow|Approval)Engine\b/i, "no scoring, ranking, routing, workflow, or approval engines");
assertNotMatches(allAuditText, /\b(score|rank|route|approve|execute|postJournal|createJournal|createEntry|postEntry)\w*\s*\(/i, "no scoring, ranking, routing, approvals, workflow execution, or journal actions");
assertNotMatches(allAuditText, /\b(accountingAction|performAccounting|erpIntegration|syncToErp|autonomousAgent)\b/i, "no accounting actions, ERP integrations, or autonomous agents");
assertNotMatches(allAuditText, /\b(calculateConfidence|adjustConfidence|evaluateMateriality|generateFinding|generateBriefing|generateNarrative)\b/i, "no confidence calculation, materiality evaluation, findings generation, or briefing generation");

const scriptText = fs.readFileSync(__filename, "utf8");
assertNotMatches(scriptText, /\brequire\((?!["']fs["']\)|["']path["']\))/, "verifier uses fs/path only");

if (process.exitCode) {
  console.error("Audit Intelligence verifier failed.");
  process.exit(process.exitCode);
}

console.log("Audit Intelligence verifier passed.");
