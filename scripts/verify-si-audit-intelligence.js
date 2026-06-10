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
  "lib/intelligence/synthetic/audit/missing-activity/buildMissingActivityObservation.ts",
  "lib/intelligence/synthetic/audit/missing-activity/buildMissingActivityObservations.ts",
  "lib/intelligence/synthetic/audit/missing-activity/index.ts",
  "lib/intelligence/synthetic/audit/recurring-patterns/buildRecurringPatternObservation.ts",
  "lib/intelligence/synthetic/audit/recurring-patterns/buildRecurringPatternObservations.ts",
  "lib/intelligence/synthetic/audit/recurring-patterns/index.ts",
  "lib/intelligence/synthetic/audit/expected-activity/buildExpectedActivityObservation.ts",
  "lib/intelligence/synthetic/audit/expected-activity/buildExpectedActivityObservations.ts",
  "lib/intelligence/synthetic/audit/expected-activity/index.ts",
  "lib/intelligence/synthetic/audit/materiality/buildMaterialityObservation.ts",
  "lib/intelligence/synthetic/audit/materiality/buildMaterialityObservations.ts",
  "lib/intelligence/synthetic/audit/materiality/index.ts",
  "lib/intelligence/synthetic/audit/surfacing/buildSurfacingObservation.ts",
  "lib/intelligence/synthetic/audit/surfacing/buildSurfacingObservations.ts",
  "lib/intelligence/synthetic/audit/surfacing/index.ts",
  "lib/intelligence/synthetic/audit/watchlist-generation/buildAuditWatchlistGeneration.ts",
  "lib/intelligence/synthetic/audit/watchlist-generation/buildAuditWatchlistGenerations.ts",
  "lib/intelligence/synthetic/audit/watchlist-generation/index.ts",
  "lib/intelligence/synthetic/audit/briefing-generation/buildAuditBriefingGeneration.ts",
  "lib/intelligence/synthetic/audit/briefing-generation/buildAuditBriefingGenerations.ts",
  "lib/intelligence/synthetic/audit/briefing-generation/index.ts",
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
  {
    phase: "34J missing activity intelligence",
    builder: "lib/intelligence/synthetic/audit/missing-activity/buildMissingActivityObservation.ts",
    collection: "lib/intelligence/synthetic/audit/missing-activity/buildMissingActivityObservations.ts",
    index: "lib/intelligence/synthetic/audit/missing-activity/index.ts",
    builderExport: "buildMissingActivityObservation",
    collectionExport: "buildMissingActivityObservations",
    categoryConstant: "SYNTHETIC_MISSING_ACTIVITY_CATEGORIES",
    nullToken: "missingActivityObservation: null",
    identityToken: "missingActivityObservationId",
    upstreamTokens: [
      "SyntheticExpectedActivityObservation",
      "expectedActivityObservations",
      "expectedActivityObservationIds",
      "expectedActivityCategories",
      "recurringPatternObservationIds",
      "recurringPatternObservationKeys",
      "recurringPatternCategories",
      "auditContractReferenceIds",
      "auditCandidateIds",
      "auditEvidencePackageIds",
      "auditFindingArtifactIds",
      "auditConfidenceIds",
      "auditSurfaceIds",
      "auditWatchlistIds",
      "auditBriefingIds",
    ],
  },
  {
    phase: "34K recurring pattern intelligence",
    builder: "lib/intelligence/synthetic/audit/recurring-patterns/buildRecurringPatternObservation.ts",
    collection: "lib/intelligence/synthetic/audit/recurring-patterns/buildRecurringPatternObservations.ts",
    index: "lib/intelligence/synthetic/audit/recurring-patterns/index.ts",
    builderExport: "buildRecurringPatternObservation",
    collectionExport: "buildRecurringPatternObservations",
    categoryConstant: "SYNTHETIC_RECURRING_PATTERN_CATEGORIES",
    nullToken: "recurringPatternObservation: null",
    identityToken: "recurringPatternObservationId",
    upstreamTokens: [
      "auditContractReferenceIds",
      "auditCandidateIds",
      "auditEvidencePackageIds",
      "auditFindingArtifactIds",
      "auditConfidenceIds",
      "auditSurfaceIds",
      "auditWatchlistIds",
      "auditBriefingIds",
    ],
  },
  {
    phase: "34L expected activity intelligence",
    builder: "lib/intelligence/synthetic/audit/expected-activity/buildExpectedActivityObservation.ts",
    collection: "lib/intelligence/synthetic/audit/expected-activity/buildExpectedActivityObservations.ts",
    index: "lib/intelligence/synthetic/audit/expected-activity/index.ts",
    builderExport: "buildExpectedActivityObservation",
    collectionExport: "buildExpectedActivityObservations",
    categoryConstant: "SYNTHETIC_EXPECTED_ACTIVITY_CATEGORIES",
    nullToken: "expectedActivityObservation: null",
    identityToken: "expectedActivityObservationId",
    upstreamTokens: [
      "recurringPatternObservationIds",
      "auditContractReferenceIds",
      "auditCandidateIds",
      "auditEvidencePackageIds",
      "auditFindingArtifactIds",
      "auditConfidenceIds",
      "auditSurfaceIds",
      "auditWatchlistIds",
      "auditBriefingIds",
    ],
  },
  {
    phase: "34M materiality intelligence",
    builder: "lib/intelligence/synthetic/audit/materiality/buildMaterialityObservation.ts",
    collection: "lib/intelligence/synthetic/audit/materiality/buildMaterialityObservations.ts",
    index: "lib/intelligence/synthetic/audit/materiality/index.ts",
    builderExport: "buildMaterialityObservation",
    collectionExport: "buildMaterialityObservations",
    categoryConstant: "SYNTHETIC_MATERIALITY_OBSERVATION_CATEGORIES",
    nullToken: "materialityObservation: null",
    identityToken: "materialityObservationId",
    upstreamTokens: [
      "recurringPatternObservationIds",
      "expectedActivityObservationIds",
      "missingActivityObservationIds",
      "auditFindingArtifactIds",
      "auditConfidenceIds",
      "auditEvidencePackageIds",
      "auditCandidateIds",
      "auditContractReferenceIds",
      "auditSurfaceIds",
      "auditWatchlistIds",
      "auditBriefingIds",
    ],
  },
  {
    phase: "34N intelligence surfacing",
    builder: "lib/intelligence/synthetic/audit/surfacing/buildSurfacingObservation.ts",
    collection: "lib/intelligence/synthetic/audit/surfacing/buildSurfacingObservations.ts",
    index: "lib/intelligence/synthetic/audit/surfacing/index.ts",
    builderExport: "buildSurfacingObservation",
    collectionExport: "buildSurfacingObservations",
    categoryConstant: "SYNTHETIC_SURFACING_CATEGORIES",
    nullToken: "surfacingObservation: null",
    identityToken: "surfacingObservationId",
    upstreamTokens: [
      "materialityObservationIds",
      "recurringPatternObservationIds",
      "expectedActivityObservationIds",
      "missingActivityObservationIds",
      "auditFindingArtifactIds",
      "auditConfidenceIds",
      "auditEvidencePackageIds",
      "auditCandidateIds",
      "auditContractReferenceIds",
      "auditSurfaceIds",
      "auditWatchlistIds",
      "auditBriefingIds",
    ],
  },
  {
    phase: "34O audit watchlist generation",
    builder: "lib/intelligence/synthetic/audit/watchlist-generation/buildAuditWatchlistGeneration.ts",
    collection: "lib/intelligence/synthetic/audit/watchlist-generation/buildAuditWatchlistGenerations.ts",
    index: "lib/intelligence/synthetic/audit/watchlist-generation/index.ts",
    builderExport: "buildAuditWatchlistGeneration",
    collectionExport: "buildAuditWatchlistGenerations",
    categoryConstant: "SYNTHETIC_AUDIT_WATCHLIST_GENERATION_CATEGORIES",
    nullToken: "auditWatchlistGeneration: null",
    identityToken: "auditWatchlistGenerationId",
    upstreamTokens: [
      "surfacingObservationIds",
      "materialityObservationIds",
      "missingActivityObservationIds",
      "expectedActivityObservationIds",
      "recurringPatternObservationIds",
      "auditFindingArtifactIds",
      "auditConfidenceIds",
      "auditEvidencePackageIds",
      "auditCandidateIds",
      "auditContractReferenceIds",
    ],
  },
  {
    phase: "34P audit briefing generation",
    builder: "lib/intelligence/synthetic/audit/briefing-generation/buildAuditBriefingGeneration.ts",
    collection: "lib/intelligence/synthetic/audit/briefing-generation/buildAuditBriefingGenerations.ts",
    index: "lib/intelligence/synthetic/audit/briefing-generation/index.ts",
    builderExport: "buildAuditBriefingGeneration",
    collectionExport: "buildAuditBriefingGenerations",
    categoryConstant: "SYNTHETIC_AUDIT_BRIEFING_GENERATION_CATEGORIES",
    nullToken: "auditBriefingGeneration: null",
    identityToken: "auditBriefingGenerationId",
    upstreamTokens: [
      "surfacingObservationIds",
      "materialityObservationIds",
      "missingActivityObservationIds",
      "expectedActivityObservationIds",
      "recurringPatternObservationIds",
      "auditFindingArtifactIds",
      "auditConfidenceIds",
      "auditEvidencePackageIds",
      "auditCandidateIds",
      "auditContractReferenceIds",
    ],
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
  if (phase.categoryConstant) {
    assertIncludes(builderText, phase.categoryConstant, `${phase.phase} supported category constant exists`);
    assertIncludes(indexText, phase.categoryConstant, `${phase.phase} supported category constant export exists`);
  }
  for (const token of phase.upstreamTokens ?? []) {
    assertIncludes(builderText, token, `${phase.phase} upstream reference ${token} is preserved`);
  }
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
  "auditContractReferenceIds",
  "auditCandidateIds",
  "auditEvidencePackageIds",
  "auditFindingArtifactIds",
  "auditConfidenceIds",
  "auditSurfaceIds",
  "auditWatchlistIds",
  "auditBriefingIds",
  "recurringPatternObservationIds",
  "recurringPatternObservationKeys",
  "recurringPatternCategories",
  "expectedActivityObservationIds",
  "expectedActivityCategories",
  "missingActivityObservationIds",
  "materialityObservationIds",
  "surfacingObservationIds",
]) {
  assertIncludes(allAuditText, token, `required audit metadata marker ${token} exists`);
}

const recurringPatternText = readIfExists(
  "lib/intelligence/synthetic/audit/recurring-patterns/buildRecurringPatternObservation.ts",
);
const expectedActivityText = readIfExists(
  "lib/intelligence/synthetic/audit/expected-activity/buildExpectedActivityObservation.ts",
);
const missingActivityText = readIfExists(
  "lib/intelligence/synthetic/audit/missing-activity/buildMissingActivityObservation.ts",
);
const materialityText = readIfExists("lib/intelligence/synthetic/audit/materiality/buildMaterialityObservation.ts");
const surfacingText = readIfExists("lib/intelligence/synthetic/audit/surfacing/buildSurfacingObservation.ts");
const watchlistGenerationText = readIfExists(
  "lib/intelligence/synthetic/audit/watchlist-generation/buildAuditWatchlistGeneration.ts",
);
const briefingGenerationText = readIfExists(
  "lib/intelligence/synthetic/audit/briefing-generation/buildAuditBriefingGeneration.ts",
);

assertIncludes(recurringPatternText, "SyntheticRecurringPatternObservation", "pipeline starts with recurring pattern observations");
assertIncludes(expectedActivityText, "SyntheticRecurringPatternObservation", "expected activity consumes recurring patterns");
assertIncludes(missingActivityText, "SyntheticExpectedActivityObservation", "missing activity consumes expected activity observations");
assertIncludes(missingActivityText, "expectedActivityObservationIds", "missing activity preserves expected activity references");
assertIncludes(missingActivityText, "expectedActivityCategories", "missing activity preserves expected activity categories");
assertIncludes(missingActivityText, "recurringPatternObservationIds", "missing activity preserves recurring pattern references from expected activity");
assertIncludes(materialityText, "SyntheticMissingActivityObservation", "materiality consumes missing activity observations");
assertIncludes(materialityText, "SyntheticExpectedActivityObservation", "materiality consumes expected activity observations");
assertIncludes(materialityText, "SyntheticRecurringPatternObservation", "materiality consumes recurring pattern observations");
assertIncludes(surfacingText, "SyntheticMaterialityObservation", "surfacing consumes materiality observations");
assertIncludes(watchlistGenerationText, "SyntheticSurfacingObservation", "watchlist generation consumes surfacing observations");
assertIncludes(briefingGenerationText, "SyntheticSurfacingObservation", "briefing generation consumes surfacing observations");
assertIncludes(missingActivityText, "SyntheticMissingActivityObservation", "missing activity observations are represented");

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
assertNotMatches(allAuditText, /\b(score|rank|route|approve|execute|assignTask|postJournal|createJournal|reverseJournal|createEntry|postEntry|reverseEntry)\w*\s*\(/i, "no scoring, ranking, routing, task assignment, approvals, workflow execution, or journal actions");
assertNotMatches(allAuditText, /\b(accountingAction|performAccounting|erpIntegration|syncToErp|autonomousAgent)\b/i, "no accounting actions, ERP integrations, or autonomous agents");
assertNotMatches(allAuditText, /\b(calculateConfidence|adjustConfidence|evaluateMateriality|calculateMateriality)\b/i, "no confidence or materiality calculations");
assertNotMatches(allAuditText, /\b(generateFinding|generateNarrative|generateReport|generateExecutiveSummary|generateAlert|generateNotification)\b/i, "no findings, narrative, report, executive summary, alert, or notification generation");

const scriptText = fs.readFileSync(__filename, "utf8");
assertNotMatches(scriptText, /\brequire\((?!["']fs["']\)|["']path["']\))/, "verifier uses fs/path only");

if (process.exitCode) {
  console.error("Audit Intelligence verifier failed.");
  process.exit(process.exitCode);
}

console.log("Audit Intelligence verifier passed.");
