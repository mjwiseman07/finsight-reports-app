const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const knowledgeRoot = path.join(root, "lib", "intelligence", "synthetic", "knowledge");

function resolveWorkspacePath(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(resolveWorkspacePath(relativePath));
}

function read(relativePath) {
  return fs.readFileSync(resolveWorkspacePath(relativePath), "utf8");
}

function readIfExists(relativePath) {
  return exists(relativePath) ? read(relativePath) : "";
}

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

function assertIncludes(text, token, message) {
  assert(text.includes(token), message);
}

function assertNotIncludes(text, token, message) {
  assert(!text.includes(token), message);
}

function assertNotMatches(text, pattern, message) {
  assert(!pattern.test(text), message);
}

const modules = [
  {
    phase: "37B",
    module: "knowledge-object",
    singularName: "KnowledgeObject",
    pluralName: "KnowledgeObjects",
    artifact: "SyntheticKnowledgeObject",
    idToken: "knowledgeObjectId",
    keyToken: "knowledgeObjectKey",
    nullToken: "knowledgeObject: null",
    resultToken: "knowledgeObject",
    collectionResultToken: "knowledgeObjects",
    extraMarkers: [
      "knowledgeCategory",
      "sourceMemoryObjectIds",
      "sourceMemoryRelationshipIds",
      "sourceEvidenceLineageGraphIds",
      "sourceOrganizationalMemoryPackageIds",
      "sourceOrganizationalMemoryGraphIds",
    ],
  },
  {
    phase: "37C",
    module: "knowledge-relationship",
    singularName: "KnowledgeRelationship",
    pluralName: "KnowledgeRelationships",
    artifact: "SyntheticKnowledgeRelationship",
    idToken: "knowledgeRelationshipId",
    keyToken: "knowledgeRelationshipKey",
    nullToken: "knowledgeRelationship: null",
    resultToken: "knowledgeRelationship",
    collectionResultToken: "knowledgeRelationships",
    extraMarkers: [
      "relationshipCategory",
      "relationshipType",
      "sourceKnowledgeObjectId",
      "targetKnowledgeObjectId",
      "crossScopeReference",
      "sourceCustomerIsolation",
      "sourceFirmIsolation",
      "sourceClientIsolation",
      "targetCustomerIsolation",
      "targetFirmIsolation",
      "targetClientIsolation",
    ],
  },
  {
    phase: "37D",
    module: "methodology-object",
    singularName: "MethodologyObject",
    pluralName: "MethodologyObjects",
    artifact: "SyntheticMethodologyObject",
    idToken: "methodologyObjectId",
    keyToken: "methodologyObjectKey",
    nullToken: "methodologyObject: null",
    resultToken: "methodologyObject",
    collectionResultToken: "methodologyObjects",
    extraMarkers: [
      "methodologyRelationshipId",
      "methodologyRelationshipKey",
      "methodologyRelationshipCategory",
      "methodologyRelationshipType",
      "methodologyRelationship: null",
      "buildMethodologyRelationship",
    ],
  },
  {
    phase: "37E",
    module: "organizational-knowledge-package",
    singularName: "OrganizationalKnowledgePackage",
    pluralName: "OrganizationalKnowledgePackages",
    artifact: "SyntheticOrganizationalKnowledgePackage",
    idToken: "organizationalKnowledgePackageId",
    keyToken: "organizationalKnowledgePackageKey",
    nullToken: "organizationalKnowledgePackage: null",
    resultToken: "organizationalKnowledgePackage",
    collectionResultToken: "organizationalKnowledgePackages",
    extraMarkers: ["knowledgeObjectIds", "knowledgeRelationshipIds", "methodologyObjectIds", "methodologyRelationshipIds"],
  },
  {
    phase: "37F",
    module: "historical-knowledge-package",
    singularName: "HistoricalKnowledgePackage",
    pluralName: "HistoricalKnowledgePackages",
    artifact: "SyntheticHistoricalKnowledgePackage",
    idToken: "historicalKnowledgePackageId",
    keyToken: "historicalKnowledgePackageKey",
    nullToken: "historicalKnowledgePackage: null",
    resultToken: "historicalKnowledgePackage",
    collectionResultToken: "historicalKnowledgePackages",
    extraMarkers: ["historicalOutcomePackageIds", "historicalDecisionPackageIds", "historicalAuditPackageIds", "historicalControllerPackageIds"],
  },
  {
    phase: "37G",
    module: "historical-methodology-package",
    singularName: "HistoricalMethodologyPackage",
    pluralName: "HistoricalMethodologyPackages",
    artifact: "SyntheticHistoricalMethodologyPackage",
    idToken: "historicalMethodologyPackageId",
    keyToken: "historicalMethodologyPackageKey",
    nullToken: "historicalMethodologyPackage: null",
    resultToken: "historicalMethodologyPackage",
    collectionResultToken: "historicalMethodologyPackages",
    extraMarkers: ["memoryPreservationPackageIds", "organizationalMemoryArchiveIds", "historicalKnowledgePackageIds"],
  },
  {
    phase: "37H",
    module: "audit-knowledge-package",
    singularName: "AuditKnowledgePackage",
    pluralName: "AuditKnowledgePackages",
    artifact: "SyntheticAuditKnowledgePackage",
    idToken: "auditKnowledgePackageId",
    keyToken: "auditKnowledgePackageKey",
    nullToken: "auditKnowledgePackage: null",
    resultToken: "auditKnowledgePackage",
    collectionResultToken: "auditKnowledgePackages",
    extraMarkers: ["auditContractReferenceIds", "auditCandidateIds", "auditEvidencePackageIds", "auditFindingArtifactIds"],
  },
  {
    phase: "37I",
    module: "controller-knowledge-package",
    singularName: "ControllerKnowledgePackage",
    pluralName: "ControllerKnowledgePackages",
    artifact: "SyntheticControllerKnowledgePackage",
    idToken: "controllerKnowledgePackageId",
    keyToken: "controllerKnowledgePackageKey",
    nullToken: "controllerKnowledgePackage: null",
    resultToken: "controllerKnowledgePackage",
    collectionResultToken: "controllerKnowledgePackages",
    extraMarkers: ["historicalControllerPackageIds", "auditContractReferenceIds", "auditCandidateIds"],
  },
  {
    phase: "37J",
    module: "organizational-knowledge-graph",
    singularName: "OrganizationalKnowledgeGraph",
    pluralName: "OrganizationalKnowledgeGraphs",
    artifact: "SyntheticOrganizationalKnowledgeGraph",
    idToken: "organizationalKnowledgeGraphId",
    keyToken: "organizationalKnowledgeGraphKey",
    nullToken: "organizationalKnowledgeGraph: null",
    resultToken: "organizationalKnowledgeGraph",
    collectionResultToken: "organizationalKnowledgeGraphs",
    extraMarkers: [
      "knowledgeObjectNodeIds",
      "knowledgeRelationshipNodeIds",
      "methodologyObjectNodeIds",
      "methodologyRelationshipNodeIds",
    ],
  },
  {
    phase: "37K",
    module: "cross-period-knowledge-package",
    singularName: "CrossPeriodKnowledgePackage",
    pluralName: "CrossPeriodKnowledgePackages",
    artifact: "SyntheticCrossPeriodKnowledgePackage",
    idToken: "crossPeriodKnowledgePackageId",
    keyToken: "crossPeriodKnowledgePackageKey",
    nullToken: "crossPeriodKnowledgePackage: null",
    resultToken: "crossPeriodKnowledgePackage",
    collectionResultToken: "crossPeriodKnowledgePackages",
    extraMarkers: ["periodReferenceIds", "priorPeriodReferenceIds", "currentPeriodReferenceIds", "periodLineageReferenceIds"],
  },
  {
    phase: "37L",
    module: "cross-entity-knowledge-package",
    singularName: "CrossEntityKnowledgePackage",
    pluralName: "CrossEntityKnowledgePackages",
    artifact: "SyntheticCrossEntityKnowledgePackage",
    idToken: "crossEntityKnowledgePackageId",
    keyToken: "crossEntityKnowledgePackageKey",
    nullToken: "crossEntityKnowledgePackage: null",
    resultToken: "crossEntityKnowledgePackage",
    collectionResultToken: "crossEntityKnowledgePackages",
    extraMarkers: [
      "entityReferenceIds",
      "sourceEntityReferenceIds",
      "targetEntityReferenceIds",
      "entityLineageReferenceIds",
      "crossScopeReference",
      "sourceCustomerIsolation",
      "targetCustomerIsolation",
    ],
  },
  {
    phase: "37M",
    module: "cross-function-knowledge-package",
    singularName: "CrossFunctionKnowledgePackage",
    pluralName: "CrossFunctionKnowledgePackages",
    artifact: "SyntheticCrossFunctionKnowledgePackage",
    idToken: "crossFunctionKnowledgePackageId",
    keyToken: "crossFunctionKnowledgePackageKey",
    nullToken: "crossFunctionKnowledgePackage: null",
    resultToken: "crossFunctionKnowledgePackage",
    collectionResultToken: "crossFunctionKnowledgePackages",
    extraMarkers: ["functionReferenceIds", "sourceFunctionReferenceIds", "targetFunctionReferenceIds", "functionLineageReferenceIds"],
  },
];

const requiredContractExports = [
  "SyntheticKnowledgeDerivationMethod",
  "SyntheticKnowledgeStaleMarker",
  "SyntheticKnowledgeRelationshipCategory",
  "SyntheticKnowledgeRelationshipContract",
  "SyntheticKnowledgeRelationshipType",
  "SyntheticKnowledgeDerivationContract",
  "SyntheticKnowledgeObjectContract",
  "SyntheticKnowledgeSupersessionContract",
  "SyntheticKnowledgeValidityWindow",
  "SyntheticKnowledgeConfidenceFloorMetadata",
  "SyntheticMethodologyContract",
  "SyntheticMethodologyDerivationContract",
  "SyntheticMethodologyDerivationMethod",
  "SyntheticMethodologyObjectContract",
  "SyntheticMethodologyRelationshipCategory",
  "SyntheticMethodologyRelationshipContract",
  "SyntheticMethodologyRelationshipType",
  "SyntheticMethodologyStaleMarker",
  "SyntheticMethodologySupersessionContract",
  "SyntheticPhase37BaseArtifactContract",
  "SyntheticPhase37BaseKnowledgeArtifactContract",
  "SyntheticPhase37DeterminismContract",
  "SyntheticPhase37IdempotencyContract",
  "SyntheticPhase37InvalidInputContract",
  "SyntheticPhase37NonExecutabilityContract",
  "SyntheticPhase37ValidEmptyInputContract",
  "SyntheticPhase38HandoffContract",
];

const commonBuilderMarkers = [
  "companyId",
  "scope",
  "customerIsolation",
  "firmIsolation",
  "clientIsolation",
  "confidenceFloorMetadata",
  "sourceConfidenceReferenceIds",
  "trustMetadata",
  "confidenceMetadata",
  "governanceMetadata",
  "materialityMetadata",
  "personaCompatibility",
  "packageCompatibility",
  "memoryCompatibility",
  "learningCompatibility",
  "surfaceCompatibility",
  "healthcarePpdObservationIds",
  "payrollObservationIds",
  "methodologyObservationIds",
  "executable: false",
  "actionReady: false",
  "workflowReady: false",
  "phase38Required: true",
];

const knowledgeLineageMarkers = [
  "derivationLineageIds",
  "derivationMethod",
  "derivationHash",
  "sourceMemoryObjectIds",
  "sourceMemoryRelationshipIds",
  "sourceEvidenceLineageGraphIds",
  "sourceOrganizationalMemoryPackageIds",
  "sourceOrganizationalMemoryGraphIds",
];

const knowledgeSupersessionMarkers = [
  "knowledgeValidityWindow",
  "sourceMemorySnapshotIds",
  "supersedesKnowledgeIds",
  "supersededByKnowledgeIds",
  "staleMarker",
  "stalenessReasonReferenceIds",
];

const methodologyMarkers = [
  "methodologyVersion",
  "methodologyAncestryIds",
  "methodologyDerivationMethod",
  "methodologyDerivationHash",
  "supersedesMethodologyIds",
  "supersededByMethodologyIds",
  "methodologyStaleMarker",
];

const methodologyContractMarkers = [
  ...methodologyMarkers,
  "methodologyStalenessReasonReferenceIds",
];

const crossScopeMarkers = [
  "crossScopeReference",
  "sourceCustomerIsolation",
  "sourceFirmIsolation",
  "sourceClientIsolation",
  "targetCustomerIsolation",
  "targetFirmIsolation",
  "targetClientIsolation",
];

const phase36HandoffMarkers = [
  "memoryObjectIds",
  "memoryRelationshipIds",
  "evidenceLineageGraphIds",
  "organizationalMemoryPackageIds",
  "organizationalMemoryGraphIds",
  "enterpriseMemoryPackageIds",
  "portfolioMemoryPackageIds",
  "organizationalMemoryArchiveIds",
  "memoryPreservationPackageIds",
];

const phase38HandoffMarkers = [
  "knowledgePackageHandle",
  "methodologyPackageHandle",
  "knowledgeGraphSnapshotHash",
  "methodologySnapshotHash",
  "sourceKnowledgeObjectIds",
  "sourceMethodologyObjectIds",
  "sourceMemoryObjectIds",
  "sourceEvidenceLineageGraphIds",
];

const prohibitedPatterns = [
  [/\bworkflow execution\b|\bexecuteWorkflow\b|\bworkflowEngine\b/i, "no workflow execution"],
  [/\bapproval\b|\bapprovals\b|\bapprove\b/i, "no approvals"],
  [/\btask assignment\b|\bassignTask\b|\btaskAssignment\b/i, "no task assignment"],
  [/\bautomation\b|\bautomate\b|\bautomated\b/i, "no automation"],
  [/\bERP action\b|\bERP actions\b|\berpIntegration\b|\bsyncToErp\b/i, "no ERP actions"],
  [/\baccounting action\b|\baccounting actions\b/i, "no accounting actions"],
  [/\bjournal posting\b|\bpostJournal\b|\bjournalEntry\b/i, "no journal posting"],
  [/\brecommendation\b|\brecommendations\b|\brecommend\b/i, "no recommendations"],
  [/\bscore\b|\bscoring\b/i, "no scoring"],
  [/\brank\b|\branking\b/i, "no ranking"],
  [/\bbenchmark\b|\bbenchmarking\b|\bbenchmarkEntity\b/i, "no benchmarking"],
  [/\bconfidence scoring\b|\bconfidenceScore\b|\bscoreConfidence\b/i, "no confidence scoring"],
  [/\bgraph traversal\b|\btraverse\b|\btraversal\b/i, "no graph traversal"],
  [/\bgraph search\b|\bqueryGraph\b|\bfindPath\b/i, "no graph search"],
  [/\bbfs\b/i, "no BFS"],
  [/\bdfs\b/i, "no DFS"],
  [/\bshortest path\b|\bshortestPath\b/i, "no shortest path"],
  [/\bgraph database\b|\bgraph databases\b|\bgraphology\b|\bcytoscape\b|\bneo4j\b|\bgremlin\b/i, "no graph databases"],
  [/\bvector database\b|\bvector databases\b|\bvectorStore\b/i, "no vector databases"],
  [/\bembedding\b|\bembeddings\b/i, "no embeddings"],
  [/\bsimilarity search\b|\bsimilaritySearch\b/i, "no similarity search"],
  [/\bPrismaClient\b|@prisma\/client|\bprisma\.|\bcreateClient\s*\(|@supabase\/supabase-js|\bsupabase\./, "no database clients"],
  [/\.(insert|update|upsert|delete)\s*\(/, "no database writes"],
  [/\bpersist\b|\bpersistence\b|\bpersistence engine\b|\bpersistence engines\b|\bpersistenceEngine\b/i, "no persistence engines"],
  [/\bNextResponse\b|\bNextRequest\b|app\/api|route\.ts/, "no API routes"],
  [/\bfrom\s+["']react["']|\brequire\(["']react["']\)/, "no React imports"],
  [/return\s*\(\s*<|=>\s*\(\s*</, "no JSX"],
  [/\bUI\b|\bdashboard\b|\bdashboards\b|\bwidget\b|\bwidgets\b|\brender(?:ing)?\b/i, "no UI, dashboards, widgets, or rendering"],
  [/\bautonomous agent\b|\bautonomous agents\b|\bautonomousAgent\b/i, "no autonomous agents"],
];

const forbiddenRuntimePatterns = [
  [/\.sort\s*\(/, "no sorting"],
  [/\bnew Set\s*\(/, "no deduplication via Set"],
  [/\bDate\s*\(/, "no Date runtime dependency"],
  [/\bDate\.now\s*\(/, "no Date.now runtime dependency"],
  [/\bMath\.random\s*\(/, "no random runtime dependency"],
  [/\bcrypto\.random/i, "no random crypto runtime dependency"],
];

const wave4CheckpointModules = [
  "enterprise-knowledge-package",
  "portfolio-knowledge-package",
  "organizational-methodology-archive",
  "methodology-preservation-package",
];

assert(exists("lib/intelligence/synthetic/knowledge/contracts/knowledgeContracts.ts"), "37A knowledgeContracts.ts exists");
assert(exists("lib/intelligence/synthetic/knowledge/contracts/index.ts"), "37A contracts index.ts exists");

const contractText = readIfExists("lib/intelligence/synthetic/knowledge/contracts/knowledgeContracts.ts");
const contractIndexText = readIfExists("lib/intelligence/synthetic/knowledge/contracts/index.ts");

for (const exportName of requiredContractExports) {
  assertIncludes(contractText, exportName, `37A knowledgeContracts defines ${exportName}`);
  assertIncludes(contractIndexText, exportName, `37A contracts index exports ${exportName}`);
}

assertIncludes(contractText, 'hashFunction: "stableSnapshotHash"', "37A determinism contract names stableSnapshotHash");
assertIncludes(contractText, 'hashImportPath: "lib/intelligence/core/hash"', "37A determinism contract preserves hash import path");
assertIncludes(contractText, "identicalInputsProduceIdenticalOrdering: true", "37A idempotency contract preserves deterministic ordering");
assertIncludes(contractText, "implicitSortingAllowed: false", "37A idempotency contract prohibits sorting");
assertIncludes(contractText, "implicitDeduplicationAllowed: false", "37A idempotency contract prohibits deduplication");
assertIncludes(contractText, "runtimeDependentOutputsAllowed: false", "37A idempotency contract prohibits runtime-dependent output");

const implementedModules = fs
  .readdirSync(knowledgeRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const expectedModule of modules.map((module) => module.module)) {
  assert(implementedModules.includes(expectedModule), `Phase 37 module directory exists: ${expectedModule}`);
}

for (const checkpointModule of wave4CheckpointModules) {
  assert(!implementedModules.includes(checkpointModule), `Wave 4 checkpoint module must not exist yet: ${checkpointModule}`);
}

for (const module of modules) {
  const moduleRoot = `lib/intelligence/synthetic/knowledge/${module.module}`;
  const builderFile = `${moduleRoot}/build${module.singularName}.ts`;
  const collectionFile = `${moduleRoot}/build${module.pluralName}.ts`;
  const indexFile = `${moduleRoot}/index.ts`;
  const builderText = readIfExists(builderFile);
  const collectionText = readIfExists(collectionFile);
  const indexText = readIfExists(indexFile);
  const label = `${module.phase} ${module.module}`;

  assert(exists(builderFile), `${label} singular builder file exists`);
  assert(exists(collectionFile), `${label} collection builder file exists`);
  assert(exists(indexFile), `${label} index file exists`);

  assertIncludes(indexText, `build${module.singularName}`, `${label} index exports singular builder`);
  assertIncludes(indexText, `build${module.pluralName}`, `${label} index exports collection builder`);
  assertIncludes(indexText, `Build${module.singularName}Input`, `${label} index exports input type`);
  assertIncludes(indexText, `Build${module.singularName}Result`, `${label} index exports result type`);
  assertIncludes(indexText, module.artifact, `${label} index exports artifact type`);

  assertIncludes(builderText, 'import { stableSnapshotHash } from "../../../core/hash";', `${label} imports stableSnapshotHash from core/hash`);
  assertNotIncludes(builderText, "../synthetic/historical-snapshots", `${label} does not import hash from historical snapshots`);
  assertIncludes(builderText, "stableSnapshotHash({", `${label} uses stableSnapshotHash for deterministic hashes`);
  assertIncludes(builderText, module.idToken, `${label} preserves deterministic id marker`);
  assertIncludes(builderText, module.keyToken, `${label} preserves deterministic key marker`);
  assertIncludes(builderText, module.nullToken, `${label} has null fail-closed return path`);
  assertIncludes(builderText, "validate", `${label} validates inputs`);
  assertIncludes(builderText, "skipped: true", `${label} fail-closed path marks skipped`);
  assertIncludes(builderText, "warnings", `${label} preserves warnings`);

  for (const marker of commonBuilderMarkers) {
    assertIncludes(builderText, marker, `${label} preserves ${marker}`);
  }

  if (!["37D", "37G"].includes(module.phase)) {
    for (const marker of knowledgeSupersessionMarkers) {
      assertIncludes(builderText, marker, `${label} preserves knowledge supersession marker ${marker}`);
    }
  }

  for (const marker of module.extraMarkers) {
    assertIncludes(builderText, marker, `${label} preserves ${marker}`);
  }

  if (["37D", "37E", "37G", "37J", "37K", "37L", "37M"].includes(module.phase)) {
    for (const marker of methodologyMarkers) {
      assertIncludes(builderText, marker, `${label} preserves methodology marker ${marker}`);
    }
  }

  if (["37C", "37D", "37L"].includes(module.phase)) {
    for (const marker of crossScopeMarkers) {
      assertIncludes(builderText, marker, `${label} preserves cross-scope marker ${marker}`);
    }
  }

  assertIncludes(collectionText, `build${module.singularName}`, `${label} collection calls singular builder`);
  assertIncludes(collectionText, module.collectionResultToken, `${label} collection returns artifact array`);
  assertIncludes(collectionText, "skippedIndexes", `${label} collection preserves skippedIndexes`);
  assertIncludes(collectionText, "warnings", `${label} collection preserves warnings`);
  assertIncludes(collectionText, ".forEach((", `${label} collection iterates deterministically`);
  assertIncludes(collectionText, ", index)", `${label} collection tracks input indexes`);
}

const allImplementedText = modules
  .flatMap((module) => {
    const moduleRoot = `lib/intelligence/synthetic/knowledge/${module.module}`;
    return [
      readIfExists(`${moduleRoot}/build${module.singularName}.ts`),
      readIfExists(`${moduleRoot}/build${module.pluralName}.ts`),
      readIfExists(`${moduleRoot}/index.ts`),
    ];
  })
  .join("\n");

for (const marker of knowledgeLineageMarkers) {
  assertIncludes(allImplementedText, marker, `Phase 37 implemented modules preserve knowledge lineage marker ${marker}`);
}

for (const marker of knowledgeSupersessionMarkers) {
  assertIncludes(allImplementedText, marker, `Phase 37 implemented modules preserve knowledge supersession marker ${marker}`);
}

for (const marker of methodologyContractMarkers) {
  assertIncludes(allImplementedText, marker, `Phase 37 implemented modules preserve methodology marker ${marker}`);
}

for (const marker of ["methodologyRelationshipId", "methodologyRelationshipKey", "methodologyRelationshipCategory", "methodologyRelationshipType"]) {
  assertIncludes(allImplementedText, marker, `Phase 37 implemented modules preserve methodology relationship marker ${marker}`);
}

for (const marker of crossScopeMarkers) {
  assertIncludes(allImplementedText, marker, `Phase 37 implemented modules preserve cross-scope marker ${marker}`);
}

for (const marker of phase36HandoffMarkers) {
  assertIncludes(allImplementedText, marker, `Phase 37 implemented modules preserve Phase 36 handoff marker ${marker}`);
}

for (const marker of phase38HandoffMarkers) {
  assertIncludes(contractText, marker, `37A Phase 38 handoff contract preserves ${marker}`);
}

for (const [pattern, message] of prohibitedPatterns) {
  assertNotMatches(allImplementedText, pattern, `Phase 37 implementation has ${message}`);
}

for (const [pattern, message] of forbiddenRuntimePatterns) {
  assertNotMatches(allImplementedText, pattern, `Phase 37 implementation has ${message}`);
}
