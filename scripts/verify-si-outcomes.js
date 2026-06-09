/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const outcomesRoot = path.join(root, "lib", "intelligence", "synthetic", "outcomes");

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

function assertAnyIncludes(text, tokens, message) {
  assert(tokens.some((token) => text.includes(token)), message);
}

const phase33Files = [
  "lib/intelligence/synthetic/outcomes/types.ts",
  "lib/intelligence/synthetic/outcomes/constants.ts",
  "lib/intelligence/synthetic/outcomes/index.ts",
  "lib/intelligence/synthetic/outcomes/candidates/buildOutcomeCandidate.ts",
  "lib/intelligence/synthetic/outcomes/candidates/buildOutcomeCandidates.ts",
  "lib/intelligence/synthetic/outcomes/candidates/index.ts",
  "lib/intelligence/synthetic/outcomes/evidence/buildOutcomeEvidence.ts",
  "lib/intelligence/synthetic/outcomes/evidence/buildOutcomeEvidenceCollection.ts",
  "lib/intelligence/synthetic/outcomes/evidence/index.ts",
  "lib/intelligence/synthetic/outcomes/learning/buildOutcomeLearning.ts",
  "lib/intelligence/synthetic/outcomes/learning/buildOutcomeLearningCollection.ts",
  "lib/intelligence/synthetic/outcomes/learning/index.ts",
  "lib/intelligence/synthetic/outcomes/decision-memory/buildDecisionMemory.ts",
  "lib/intelligence/synthetic/outcomes/decision-memory/buildDecisionMemories.ts",
  "lib/intelligence/synthetic/outcomes/decision-memory/index.ts",
  "lib/intelligence/synthetic/outcomes/forecast-memory/buildForecastMemory.ts",
  "lib/intelligence/synthetic/outcomes/forecast-memory/buildForecastMemories.ts",
  "lib/intelligence/synthetic/outcomes/forecast-memory/index.ts",
  "lib/intelligence/synthetic/outcomes/scenario-memory/buildScenarioMemory.ts",
  "lib/intelligence/synthetic/outcomes/scenario-memory/buildScenarioMemories.ts",
  "lib/intelligence/synthetic/outcomes/scenario-memory/index.ts",
  "lib/intelligence/synthetic/outcomes/controller-memory/buildControllerMemory.ts",
  "lib/intelligence/synthetic/outcomes/controller-memory/buildControllerMemories.ts",
  "lib/intelligence/synthetic/outcomes/controller-memory/index.ts",
  "lib/intelligence/synthetic/outcomes/portfolio-memory/buildPortfolioMemory.ts",
  "lib/intelligence/synthetic/outcomes/portfolio-memory/buildPortfolioMemories.ts",
  "lib/intelligence/synthetic/outcomes/portfolio-memory/index.ts",
  "lib/intelligence/synthetic/outcomes/recommendation-memory/buildRecommendationMemory.ts",
  "lib/intelligence/synthetic/outcomes/recommendation-memory/buildRecommendationMemories.ts",
  "lib/intelligence/synthetic/outcomes/recommendation-memory/index.ts",
  "lib/intelligence/synthetic/outcomes/learning-confidence/buildLearningConfidence.ts",
  "lib/intelligence/synthetic/outcomes/learning-confidence/buildLearningConfidenceCollection.ts",
  "lib/intelligence/synthetic/outcomes/learning-confidence/index.ts",
  "lib/intelligence/synthetic/outcomes/learning-surfaces/buildLearningSurface.ts",
  "lib/intelligence/synthetic/outcomes/learning-surfaces/buildLearningSurfaceCollection.ts",
  "lib/intelligence/synthetic/outcomes/learning-surfaces/index.ts",
  "lib/intelligence/synthetic/outcomes/capability-intelligence/buildCapabilityIntelligence.ts",
  "lib/intelligence/synthetic/outcomes/capability-intelligence/buildCapabilityIntelligenceCollection.ts",
  "lib/intelligence/synthetic/outcomes/capability-intelligence/index.ts",
  "lib/intelligence/synthetic/outcomes/adoption-intelligence/buildAdoptionIntelligence.ts",
  "lib/intelligence/synthetic/outcomes/adoption-intelligence/buildAdoptionIntelligenceCollection.ts",
  "lib/intelligence/synthetic/outcomes/adoption-intelligence/index.ts",
  "lib/intelligence/synthetic/outcomes/time-savings-intelligence/buildTimeSavingsIntelligence.ts",
  "lib/intelligence/synthetic/outcomes/time-savings-intelligence/buildTimeSavingsIntelligenceCollection.ts",
  "lib/intelligence/synthetic/outcomes/time-savings-intelligence/index.ts",
  "lib/intelligence/synthetic/outcomes/intervention-intelligence/buildInterventionIntelligence.ts",
  "lib/intelligence/synthetic/outcomes/intervention-intelligence/buildInterventionIntelligenceCollection.ts",
  "lib/intelligence/synthetic/outcomes/intervention-intelligence/index.ts",
  "lib/intelligence/synthetic/outcomes/organizational-knowledge/buildOrganizationalKnowledge.ts",
  "lib/intelligence/synthetic/outcomes/organizational-knowledge/buildOrganizationalKnowledgeCollection.ts",
  "lib/intelligence/synthetic/outcomes/organizational-knowledge/index.ts",
];

const builderPhases = [
  {
    phase: "33B outcome candidates",
    builder: "lib/intelligence/synthetic/outcomes/candidates/buildOutcomeCandidate.ts",
    collection: "lib/intelligence/synthetic/outcomes/candidates/buildOutcomeCandidates.ts",
    index: "lib/intelligence/synthetic/outcomes/candidates/index.ts",
    builderExport: "buildOutcomeCandidate",
    collectionExport: "buildOutcomeCandidates",
    nullToken: "outcomeCandidate: null",
    identityToken: "outcomeCandidateId",
  },
  {
    phase: "33C outcome evidence packages",
    builder: "lib/intelligence/synthetic/outcomes/evidence/buildOutcomeEvidence.ts",
    collection: "lib/intelligence/synthetic/outcomes/evidence/buildOutcomeEvidenceCollection.ts",
    index: "lib/intelligence/synthetic/outcomes/evidence/index.ts",
    builderExport: "buildOutcomeEvidence",
    collectionExport: "buildOutcomeEvidenceCollection",
    nullToken: "outcomeEvidencePackage: null",
    identityToken: "outcomeEvidencePackageId",
  },
  {
    phase: "33D outcome learning packages",
    builder: "lib/intelligence/synthetic/outcomes/learning/buildOutcomeLearning.ts",
    collection: "lib/intelligence/synthetic/outcomes/learning/buildOutcomeLearningCollection.ts",
    index: "lib/intelligence/synthetic/outcomes/learning/index.ts",
    builderExport: "buildOutcomeLearning",
    collectionExport: "buildOutcomeLearningCollection",
    nullToken: "outcomeLearningPackage: null",
    identityToken: "outcomeLearningPackageId",
  },
  {
    phase: "33E decision memory packages",
    builder: "lib/intelligence/synthetic/outcomes/decision-memory/buildDecisionMemory.ts",
    collection: "lib/intelligence/synthetic/outcomes/decision-memory/buildDecisionMemories.ts",
    index: "lib/intelligence/synthetic/outcomes/decision-memory/index.ts",
    builderExport: "buildDecisionMemory",
    collectionExport: "buildDecisionMemories",
    nullToken: "decisionMemory: null",
    identityToken: "decisionMemoryId",
  },
  {
    phase: "33F forecast memory packages",
    builder: "lib/intelligence/synthetic/outcomes/forecast-memory/buildForecastMemory.ts",
    collection: "lib/intelligence/synthetic/outcomes/forecast-memory/buildForecastMemories.ts",
    index: "lib/intelligence/synthetic/outcomes/forecast-memory/index.ts",
    builderExport: "buildForecastMemory",
    collectionExport: "buildForecastMemories",
    nullToken: "forecastMemory: null",
    identityToken: "forecastMemoryId",
  },
  {
    phase: "33G scenario memory packages",
    builder: "lib/intelligence/synthetic/outcomes/scenario-memory/buildScenarioMemory.ts",
    collection: "lib/intelligence/synthetic/outcomes/scenario-memory/buildScenarioMemories.ts",
    index: "lib/intelligence/synthetic/outcomes/scenario-memory/index.ts",
    builderExport: "buildScenarioMemory",
    collectionExport: "buildScenarioMemories",
    nullToken: "scenarioMemory: null",
    identityToken: "scenarioMemoryId",
  },
  {
    phase: "33H controller memory packages",
    builder: "lib/intelligence/synthetic/outcomes/controller-memory/buildControllerMemory.ts",
    collection: "lib/intelligence/synthetic/outcomes/controller-memory/buildControllerMemories.ts",
    index: "lib/intelligence/synthetic/outcomes/controller-memory/index.ts",
    builderExport: "buildControllerMemory",
    collectionExport: "buildControllerMemories",
    nullToken: "controllerMemory: null",
    identityToken: "controllerMemoryId",
  },
  {
    phase: "33I portfolio memory packages",
    builder: "lib/intelligence/synthetic/outcomes/portfolio-memory/buildPortfolioMemory.ts",
    collection: "lib/intelligence/synthetic/outcomes/portfolio-memory/buildPortfolioMemories.ts",
    index: "lib/intelligence/synthetic/outcomes/portfolio-memory/index.ts",
    builderExport: "buildPortfolioMemory",
    collectionExport: "buildPortfolioMemories",
    nullToken: "portfolioMemory: null",
    identityToken: "portfolioMemoryId",
  },
  {
    phase: "33J recommendation memory packages",
    builder: "lib/intelligence/synthetic/outcomes/recommendation-memory/buildRecommendationMemory.ts",
    collection: "lib/intelligence/synthetic/outcomes/recommendation-memory/buildRecommendationMemories.ts",
    index: "lib/intelligence/synthetic/outcomes/recommendation-memory/index.ts",
    builderExport: "buildRecommendationMemory",
    collectionExport: "buildRecommendationMemories",
    nullToken: "recommendationMemory: null",
    identityToken: "recommendationMemoryId",
  },
  {
    phase: "33K learning confidence packages",
    builder: "lib/intelligence/synthetic/outcomes/learning-confidence/buildLearningConfidence.ts",
    collection: "lib/intelligence/synthetic/outcomes/learning-confidence/buildLearningConfidenceCollection.ts",
    index: "lib/intelligence/synthetic/outcomes/learning-confidence/index.ts",
    builderExport: "buildLearningConfidence",
    collectionExport: "buildLearningConfidenceCollection",
    nullToken: "learningConfidence: null",
    identityToken: "learningConfidenceId",
  },
  {
    phase: "33L learning surface packages",
    builder: "lib/intelligence/synthetic/outcomes/learning-surfaces/buildLearningSurface.ts",
    collection: "lib/intelligence/synthetic/outcomes/learning-surfaces/buildLearningSurfaceCollection.ts",
    index: "lib/intelligence/synthetic/outcomes/learning-surfaces/index.ts",
    builderExport: "buildLearningSurface",
    collectionExport: "buildLearningSurfaceCollection",
    nullToken: "learningSurface: null",
    identityToken: "learningSurfaceId",
  },
  {
    phase: "33M capability intelligence packages",
    builder: "lib/intelligence/synthetic/outcomes/capability-intelligence/buildCapabilityIntelligence.ts",
    collection: "lib/intelligence/synthetic/outcomes/capability-intelligence/buildCapabilityIntelligenceCollection.ts",
    index: "lib/intelligence/synthetic/outcomes/capability-intelligence/index.ts",
    builderExport: "buildCapabilityIntelligence",
    collectionExport: "buildCapabilityIntelligenceCollection",
    nullToken: "capabilityIntelligence: null",
    identityToken: "capabilityIntelligenceId",
  },
  {
    phase: "33N adoption intelligence packages",
    builder: "lib/intelligence/synthetic/outcomes/adoption-intelligence/buildAdoptionIntelligence.ts",
    collection: "lib/intelligence/synthetic/outcomes/adoption-intelligence/buildAdoptionIntelligenceCollection.ts",
    index: "lib/intelligence/synthetic/outcomes/adoption-intelligence/index.ts",
    builderExport: "buildAdoptionIntelligence",
    collectionExport: "buildAdoptionIntelligenceCollection",
    nullToken: "adoptionIntelligence: null",
    identityToken: "adoptionIntelligenceId",
  },
  {
    phase: "33O time savings intelligence packages",
    builder: "lib/intelligence/synthetic/outcomes/time-savings-intelligence/buildTimeSavingsIntelligence.ts",
    collection: "lib/intelligence/synthetic/outcomes/time-savings-intelligence/buildTimeSavingsIntelligenceCollection.ts",
    index: "lib/intelligence/synthetic/outcomes/time-savings-intelligence/index.ts",
    builderExport: "buildTimeSavingsIntelligence",
    collectionExport: "buildTimeSavingsIntelligenceCollection",
    nullToken: "timeSavingsIntelligence: null",
    identityToken: "timeSavingsIntelligenceId",
  },
  {
    phase: "33P intervention intelligence packages",
    builder: "lib/intelligence/synthetic/outcomes/intervention-intelligence/buildInterventionIntelligence.ts",
    collection: "lib/intelligence/synthetic/outcomes/intervention-intelligence/buildInterventionIntelligenceCollection.ts",
    index: "lib/intelligence/synthetic/outcomes/intervention-intelligence/index.ts",
    builderExport: "buildInterventionIntelligence",
    collectionExport: "buildInterventionIntelligenceCollection",
    nullToken: "interventionIntelligence: null",
    identityToken: "interventionIntelligenceId",
  },
  {
    phase: "33Q organizational knowledge packages",
    builder: "lib/intelligence/synthetic/outcomes/organizational-knowledge/buildOrganizationalKnowledge.ts",
    collection: "lib/intelligence/synthetic/outcomes/organizational-knowledge/buildOrganizationalKnowledgeCollection.ts",
    index: "lib/intelligence/synthetic/outcomes/organizational-knowledge/index.ts",
    builderExport: "buildOrganizationalKnowledge",
    collectionExport: "buildOrganizationalKnowledgeCollection",
    nullToken: "organizationalKnowledge: null",
    identityToken: "organizationalKnowledgeId",
  },
];

for (const file of phase33Files) {
  assert(exists(file), `${file} exists`);
}

const outcomeFiles = listFiles(outcomesRoot).filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));
const allOutcomeText = outcomeFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const packageJson = JSON.parse(read("package.json"));
const typesText = readIfExists("lib/intelligence/synthetic/outcomes/types.ts");
const constantsText = readIfExists("lib/intelligence/synthetic/outcomes/constants.ts");
const rootIndexText = readIfExists("lib/intelligence/synthetic/outcomes/index.ts");

for (const token of [
  "SyntheticOutcomeCategory",
  "SyntheticOutcomeStatus",
  "SyntheticOutcomeResultCategory",
  "SyntheticOutcomeEvidenceStrength",
  "SyntheticOutcomeConfidenceCategory",
  "SyntheticOutcomeTrustCategory",
  "SyntheticOutcomeGovernanceStatus",
  "SyntheticOutcomeMemoryCompatibilityCategory",
  "SyntheticOutcomeLearningCompatibilityCategory",
  "SyntheticOutcomeScope",
  "SyntheticOutcomeMetadata",
  "SyntheticOutcomeEvidenceReferences",
  "SyntheticOutcomeConfidenceMetadata",
  "SyntheticOutcomeTrustMetadata",
  "SyntheticOutcomeGovernanceMetadata",
  "SyntheticOutcomeMemoryCompatibility",
  "SyntheticOutcomeLearningCompatibility",
  "SyntheticOutcomeContract",
]) {
  assertIncludes(typesText, token, `33A outcome contract token ${token} exists`);
}

for (const token of [
  "SYNTHETIC_OUTCOME_SCHEMA_VERSION",
  "SYNTHETIC_OUTCOME_TAXONOMY_VERSION",
  "SYNTHETIC_OUTCOME_CONTRACT_VERSION",
  "SYNTHETIC_OUTCOME_COMPATIBILITY_VERSION",
  "SYNTHETIC_OUTCOME_CATEGORIES",
  "SYNTHETIC_OUTCOME_STATUSES",
  "SYNTHETIC_OUTCOME_RESULT_CATEGORIES",
  "SYNTHETIC_OUTCOME_EVIDENCE_STRENGTHS",
  "SYNTHETIC_OUTCOME_CONFIDENCE_CATEGORIES",
  "SYNTHETIC_OUTCOME_TRUST_CATEGORIES",
  "SYNTHETIC_OUTCOME_GOVERNANCE_STATUSES",
  "SYNTHETIC_OUTCOME_MEMORY_COMPATIBILITY_CATEGORIES",
  "SYNTHETIC_OUTCOME_LEARNING_COMPATIBILITY_CATEGORIES",
  "SYNTHETIC_OUTCOME_REPOSITORY_SAFETY_EXCLUSIONS",
]) {
  assertIncludes(constantsText, token, `33A outcome constant ${token} exists`);
}

assertIncludes(rootIndexText, "./types", "33A root barrel exports types");
assertIncludes(rootIndexText, "./constants", "33A root barrel exports constants");

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
  assertIncludes(collectionText, "forEach((request, index)", `${phase.phase} input-order traversal exists`);
}

for (const token of [
  "evidenceReferenceIds",
  "sourceReferenceIds",
  "lineageReferenceIds",
  "trustMetadata",
  "confidenceMetadata",
  "governanceMetadata",
  "memoryCompatibility",
  "learningCompatibility",
  "outcomeReferenceIds",
  "memoryReferenceIds",
  "learningReferenceIds",
]) {
  assertIncludes(allOutcomeText, token, `required metadata marker ${token} exists`);
}

for (const token of [
  "explainabilityMetadata",
  "knowledgeExplainabilityMetadata",
  "customerIsolationRequired",
  "firmIsolationRequired",
  "clientIsolationRequired",
  "customerIsolationMetadata",
  "firmIsolationMetadata",
  "clientIsolationMetadata",
]) {
  assertIncludes(allOutcomeText, token, `applicable compatibility marker ${token} exists`);
}

for (const file of outcomeFiles) {
  assert(!file.endsWith(".tsx"), `${path.relative(root, file)} is not TSX`);
}

assert(
  packageJson.scripts["verify:si-outcomes"] === "node scripts/verify-si-outcomes.js",
  "package script verify:si-outcomes exists",
);

assertNotMatches(allOutcomeText, /\bfrom\s+["']react["']|\brequire\(["']react["']\)/, "no React imports");
assertNotMatches(allOutcomeText, /return\s*\(\s*<|=>\s*\(\s*</, "no JSX");
assertNotMatches(allOutcomeText, /\bdashboard\b|\bwidget\b|\brender(?:ing)?\b|\bUI\b/i, "no UI, dashboards, widgets, or rendering");
assertNotMatches(allOutcomeText, /\bNextResponse\b|\bNextRequest\b|app\/api|route\.ts/, "no API routes");
assertNotMatches(allOutcomeText, /\bfetch\s*\(|\bXMLHttpRequest\b|\baxios\b|\bhttp\.|\bhttps\./, "no fetch or HTTP calls");
assertNotMatches(allOutcomeText, /\bPrismaClient\b|@prisma\/client|\bprisma\./, "no Prisma");
assertNotMatches(allOutcomeText, /\bcreateClient\s*\(|@supabase\/supabase-js|\bsupabase\./, "no database clients");
assertNotMatches(allOutcomeText, /\.(insert|update|upsert|delete)\s*\(/, "no persistence writes");
assertNotMatches(allOutcomeText, /\b(localStorage|sessionStorage|document|window)\b/, "no browser globals");
assertNotMatches(allOutcomeText, /\b(class|function)\s+\w*(Scoring|Ranking|Routing|Workflow|Task|Approval)Engine\b/i, "no scoring, ranking, routing, workflow, task, or approval engines");
assertNotMatches(allOutcomeText, /\b(score|rank|route|approve|execute|schedule|deliver|notify|alert)\w*\s*\(/i, "no execution, routing, approval, scoring, ranking, or delivery functions");
assertNotMatches(allOutcomeText, /\b(memoryWrite|writeMemory|updateMemory|persistMemory|writeKnowledge|generateKnowledge)\b/i, "no memory writes or knowledge generation");
assertNotMatches(allOutcomeText, /\b(adjustConfidence|recalculateConfidence|executeConfidence|executeLearning|runLearning)\b/i, "no confidence adjustment or learning execution");
assertNotMatches(allOutcomeText, /\b(generateRecommendation|recommendationGenerator|generateOrganizationalKnowledge)\b/i, "no recommendation or organizational knowledge generation");
assertNotMatches(allOutcomeText, /\b(enableCapability|changeSettings|modifyWorkflow|trackAdoption|scoreAdoption|trackTime|executeIntervention)\b/i, "no automatic capability, settings, workflow, adoption, time tracking, or intervention execution");

const scriptText = fs.readFileSync(__filename, "utf8");
assertNotMatches(scriptText, /\brequire\((?!["']fs["']\)|["']path["']\))/, "verifier uses fs/path only");

if (process.exitCode) {
  console.error("Outcome Intelligence verifier failed.");
  process.exit(process.exitCode);
}

console.log("Outcome Intelligence verifier passed.");
