const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const organizationalMemoryRoot = path.join(root, "lib", "intelligence", "synthetic", "organizational-memory");

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

function assertNotMatches(text, pattern, message) {
  assert(!pattern.test(text), message);
}

function assertNotIncludes(text, token, message) {
  assert(!text.includes(token), message);
}

const modules = [
  {
    phase: "36A",
    module: "memory-object",
    singularName: "MemoryObject",
    pluralName: "MemoryObjects",
    artifact: "SyntheticMemoryObject",
    idToken: "memoryObjectId",
    keyToken: "memoryObjectKey",
    nullToken: "memoryObject: null",
    resultToken: "memoryObject",
    collectionResultToken: "memoryObjects",
    collectionInputToken: "memoryInputs",
    extraMarkers: ["memoryCategory", "auditContract", "sourceArtifacts", "workflowPackages"],
  },
  {
    phase: "36B",
    module: "memory-relationship",
    singularName: "MemoryRelationship",
    pluralName: "MemoryRelationships",
    artifact: "SyntheticMemoryRelationship",
    idToken: "memoryRelationshipId",
    keyToken: "memoryRelationshipKey",
    nullToken: "memoryRelationship: null",
    resultToken: "memoryRelationship",
    collectionResultToken: "memoryRelationships",
    collectionInputToken: "relationshipInputs",
    extraMarkers: [
      "relationshipCategory",
      "relationshipType",
      "sourceMemoryObjectId",
      "targetMemoryObjectId",
      "sourceMemoryObjectKey",
      "targetMemoryObjectKey",
      "sourceCustomerIsolation",
      "sourceFirmIsolation",
      "sourceClientIsolation",
      "targetCustomerIsolation",
      "targetFirmIsolation",
      "targetClientIsolation",
      "crossScopeReference",
    ],
  },
  {
    phase: "36C",
    module: "evidence-lineage-graph",
    singularName: "EvidenceLineageGraph",
    pluralName: "EvidenceLineageGraphs",
    artifact: "SyntheticEvidenceLineageGraph",
    idToken: "evidenceLineageGraphId",
    keyToken: "evidenceLineageGraphKey",
    nullToken: "evidenceLineageGraph: null",
    resultToken: "evidenceLineageGraph",
    collectionResultToken: "evidenceLineageGraphs",
    collectionInputToken: "graphInputs",
    extraMarkers: [
      "graphCategory",
      "evidenceNodeIds",
      "sourceNodeIds",
      "lineageNodeIds",
      "observationNodeIds",
      "packageNodeIds",
      "memoryObjectNodeIds",
      "memoryRelationshipNodeIds",
    ],
  },
  {
    phase: "36D",
    module: "organizational-memory-package",
    singularName: "OrganizationalMemoryPackage",
    pluralName: "OrganizationalMemoryPackages",
    artifact: "SyntheticOrganizationalMemoryPackage",
    idToken: "organizationalMemoryPackageId",
    keyToken: "organizationalMemoryPackageKey",
    nullToken: "organizationalMemoryPackage: null",
    resultToken: "organizationalMemoryPackage",
    collectionResultToken: "organizationalMemoryPackages",
    collectionInputToken: "packageInputs",
    extraMarkers: ["packageCategory", "memoryObjectIds", "memoryRelationshipIds", "evidenceLineageGraphIds"],
  },
  {
    phase: "36E",
    module: "historical-outcome-package",
    singularName: "HistoricalOutcomePackage",
    pluralName: "HistoricalOutcomePackages",
    artifact: "SyntheticHistoricalOutcomePackage",
    idToken: "historicalOutcomePackageId",
    keyToken: "historicalOutcomePackageKey",
    nullToken: "historicalOutcomePackage: null",
    resultToken: "historicalOutcomePackage",
    collectionResultToken: "historicalOutcomePackages",
    collectionInputToken: "packageInputs",
    extraMarkers: [
      "packageCategory",
      "historicalOutcomeReferenceIds",
      "outcomeLineageReferenceIds",
      "outcomeEvidenceReferenceIds",
      "outcomeSourceReferenceIds",
      "memoryObjectIds",
      "memoryRelationshipIds",
      "evidenceLineageGraphIds",
      "organizationalMemoryPackageIds",
    ],
  },
  {
    phase: "36F",
    module: "historical-decision-package",
    singularName: "HistoricalDecisionPackage",
    pluralName: "HistoricalDecisionPackages",
    artifact: "SyntheticHistoricalDecisionPackage",
    idToken: "historicalDecisionPackageId",
    keyToken: "historicalDecisionPackageKey",
    nullToken: "historicalDecisionPackage: null",
    resultToken: "historicalDecisionPackage",
    collectionResultToken: "historicalDecisionPackages",
    collectionInputToken: "packageInputs",
    extraMarkers: [
      "packageCategory",
      "historicalDecisionReferenceIds",
      "decisionLineageReferenceIds",
      "decisionEvidenceReferenceIds",
      "decisionSourceReferenceIds",
      "memoryObjectIds",
      "memoryRelationshipIds",
      "evidenceLineageGraphIds",
      "organizationalMemoryPackageIds",
    ],
  },
  {
    phase: "36G",
    module: "historical-audit-package",
    singularName: "HistoricalAuditPackage",
    pluralName: "HistoricalAuditPackages",
    artifact: "SyntheticHistoricalAuditPackage",
    idToken: "historicalAuditPackageId",
    keyToken: "historicalAuditPackageKey",
    nullToken: "historicalAuditPackage: null",
    resultToken: "historicalAuditPackage",
    collectionResultToken: "historicalAuditPackages",
    collectionInputToken: "packageInputs",
    extraMarkers: [
      "packageCategory",
      "historicalAuditReferenceIds",
      "auditLineageReferenceIds",
      "auditEvidenceReferenceIds",
      "auditSourceReferenceIds",
      "historicalOutcomePackageIds",
      "historicalDecisionPackageIds",
    ],
  },
  {
    phase: "36H",
    module: "historical-controller-package",
    singularName: "HistoricalControllerPackage",
    pluralName: "HistoricalControllerPackages",
    artifact: "SyntheticHistoricalControllerPackage",
    idToken: "historicalControllerPackageId",
    keyToken: "historicalControllerPackageKey",
    nullToken: "historicalControllerPackage: null",
    resultToken: "historicalControllerPackage",
    collectionResultToken: "historicalControllerPackages",
    collectionInputToken: "packageInputs",
    extraMarkers: [
      "packageCategory",
      "historicalControllerReferenceIds",
      "controllerLineageReferenceIds",
      "controllerEvidenceReferenceIds",
      "controllerSourceReferenceIds",
      "historicalOutcomePackageIds",
      "historicalDecisionPackageIds",
      "controllerReviewPackageIds",
      "closeReadinessPackageIds",
      "closeHealthPackageIds",
      "closeRiskPackageIds",
      "closeSupportPackageIds",
      "firmControllerPackageIds",
    ],
  },
  {
    phase: "36I",
    module: "organizational-memory-graph",
    singularName: "OrganizationalMemoryGraph",
    pluralName: "OrganizationalMemoryGraphs",
    artifact: "SyntheticOrganizationalMemoryGraph",
    idToken: "organizationalMemoryGraphId",
    keyToken: "organizationalMemoryGraphKey",
    nullToken: "organizationalMemoryGraph: null",
    resultToken: "organizationalMemoryGraph",
    collectionResultToken: "organizationalMemoryGraphs",
    collectionInputToken: "graphInputs",
    extraMarkers: [
      "graphCategory",
      "memoryObjectNodeIds",
      "memoryRelationshipNodeIds",
      "evidenceLineageGraphNodeIds",
      "historicalOutcomeNodeIds",
      "historicalDecisionNodeIds",
      "historicalAuditNodeIds",
      "historicalControllerNodeIds",
      "organizationalMemoryPackageIds",
      "historicalOutcomePackageIds",
      "historicalDecisionPackageIds",
      "historicalAuditPackageIds",
      "historicalControllerPackageIds",
    ],
  },
  {
    phase: "36J",
    module: "cross-period-memory-package",
    singularName: "CrossPeriodMemoryPackage",
    pluralName: "CrossPeriodMemoryPackages",
    artifact: "SyntheticCrossPeriodMemoryPackage",
    idToken: "crossPeriodMemoryPackageId",
    keyToken: "crossPeriodMemoryPackageKey",
    nullToken: "crossPeriodMemoryPackage: null",
    resultToken: "crossPeriodMemoryPackage",
    collectionResultToken: "crossPeriodMemoryPackages",
    collectionInputToken: "packageInputs",
    extraMarkers: [
      "packageCategory",
      "periodReferenceIds",
      "priorPeriodReferenceIds",
      "currentPeriodReferenceIds",
      "periodLineageReferenceIds",
      "organizationalMemoryGraphIds",
      "organizationalMemoryPackageIds",
      "historicalOutcomePackageIds",
      "historicalDecisionPackageIds",
      "historicalAuditPackageIds",
      "historicalControllerPackageIds",
    ],
  },
  {
    phase: "36K",
    module: "cross-entity-memory-package",
    singularName: "CrossEntityMemoryPackage",
    pluralName: "CrossEntityMemoryPackages",
    artifact: "SyntheticCrossEntityMemoryPackage",
    idToken: "crossEntityMemoryPackageId",
    keyToken: "crossEntityMemoryPackageKey",
    nullToken: "crossEntityMemoryPackage: null",
    resultToken: "crossEntityMemoryPackage",
    collectionResultToken: "crossEntityMemoryPackages",
    collectionInputToken: "packageInputs",
    extraMarkers: [
      "packageCategory",
      "crossScopeReference",
      "sourceCustomerIsolation",
      "sourceFirmIsolation",
      "sourceClientIsolation",
      "targetCustomerIsolation",
      "targetFirmIsolation",
      "targetClientIsolation",
      "entityReferenceIds",
      "sourceEntityReferenceIds",
      "targetEntityReferenceIds",
      "entityLineageReferenceIds",
      "clientReferenceIds",
      "sourceClientReferenceIds",
      "targetClientReferenceIds",
      "firmReferenceIds",
      "organizationalMemoryGraphIds",
      "organizationalMemoryPackageIds",
      "crossPeriodMemoryPackageIds",
      "clientPortfolioPackageIds",
      "firmAuditPackageIds",
      "firmControllerPackageIds",
      "multiClientRiskReadinessPackageIds",
    ],
  },
  {
    phase: "36L",
    module: "cross-function-memory-package",
    singularName: "CrossFunctionMemoryPackage",
    pluralName: "CrossFunctionMemoryPackages",
    artifact: "SyntheticCrossFunctionMemoryPackage",
    idToken: "crossFunctionMemoryPackageId",
    keyToken: "crossFunctionMemoryPackageKey",
    nullToken: "crossFunctionMemoryPackage: null",
    resultToken: "crossFunctionMemoryPackage",
    collectionResultToken: "crossFunctionMemoryPackages",
    collectionInputToken: "packageInputs",
    extraMarkers: [
      "packageCategory",
      "functionReferenceIds",
      "sourceFunctionReferenceIds",
      "targetFunctionReferenceIds",
      "functionLineageReferenceIds",
      "organizationalMemoryGraphIds",
      "organizationalMemoryPackageIds",
      "crossPeriodMemoryPackageIds",
      "crossEntityMemoryPackageIds",
      "auditResponsePackageIds",
      "auditPackageIds",
      "controllerReviewPackageIds",
      "executiveBriefingPackageIds",
      "closeReadinessPackageIds",
      "closeHealthPackageIds",
      "closeRiskPackageIds",
      "closeSupportPackageIds",
      "reconciliationReviewPackageIds",
      "scheduleReviewPackageIds",
      "tieOutReviewPackageIds",
      "evidenceReviewPackageIds",
    ],
  },
  {
    phase: "36M",
    module: "enterprise-memory-package",
    singularName: "EnterpriseMemoryPackage",
    pluralName: "EnterpriseMemoryPackages",
    artifact: "SyntheticEnterpriseMemoryPackage",
    idToken: "enterpriseMemoryPackageId",
    keyToken: "enterpriseMemoryPackageKey",
    nullToken: "enterpriseMemoryPackage: null",
    resultToken: "enterpriseMemoryPackage",
    collectionResultToken: "enterpriseMemoryPackages",
    collectionInputToken: "enterpriseMemoryInputs",
    extraMarkers: [
      "packageCategory",
      "organizationalMemoryGraphIds",
      "organizationalMemoryPackageIds",
      "crossPeriodMemoryPackageIds",
      "crossEntityMemoryPackageIds",
      "crossFunctionMemoryPackageIds",
      "historicalOutcomePackageIds",
      "historicalDecisionPackageIds",
      "historicalAuditPackageIds",
      "historicalControllerPackageIds",
      "clientPortfolioPackageIds",
      "firmAuditPackageIds",
      "firmControllerPackageIds",
      "multiClientRiskReadinessPackageIds",
    ],
  },
  {
    phase: "36N",
    module: "portfolio-memory-package",
    singularName: "PortfolioMemoryPackage",
    pluralName: "PortfolioMemoryPackages",
    artifact: "SyntheticPortfolioMemoryPackage",
    idToken: "portfolioMemoryPackageId",
    keyToken: "portfolioMemoryPackageKey",
    nullToken: "portfolioMemoryPackage: null",
    resultToken: "portfolioMemoryPackage",
    collectionResultToken: "portfolioMemoryPackages",
    collectionInputToken: "portfolioMemoryInputs",
    extraMarkers: [
      "packageCategory",
      "enterpriseMemoryPackageIds",
      "crossEntityMemoryPackageIds",
      "crossPeriodMemoryPackageIds",
      "crossFunctionMemoryPackageIds",
      "organizationalMemoryGraphIds",
      "organizationalMemoryPackageIds",
      "historicalOutcomePackageIds",
      "historicalDecisionPackageIds",
      "historicalAuditPackageIds",
      "historicalControllerPackageIds",
      "clientPortfolioPackageIds",
      "firmAuditPackageIds",
      "firmControllerPackageIds",
      "multiClientRiskReadinessPackageIds",
    ],
  },
  {
    phase: "36O",
    module: "organizational-memory-archive",
    singularName: "OrganizationalMemoryArchive",
    pluralName: "OrganizationalMemoryArchives",
    artifact: "SyntheticOrganizationalMemoryArchive",
    idToken: "organizationalMemoryArchiveId",
    keyToken: "organizationalMemoryArchiveKey",
    nullToken: "organizationalMemoryArchive: null",
    resultToken: "organizationalMemoryArchive",
    collectionResultToken: "organizationalMemoryArchives",
    collectionInputToken: "archiveInputs",
    extraMarkers: [
      "archiveCategory",
      "archiveStatus",
      "memoryObjectIds",
      "memoryRelationshipIds",
      "evidenceLineageGraphIds",
      "organizationalMemoryPackageIds",
      "organizationalMemoryGraphIds",
      "historicalOutcomePackageIds",
      "historicalDecisionPackageIds",
      "historicalAuditPackageIds",
      "historicalControllerPackageIds",
      "crossPeriodMemoryPackageIds",
      "crossEntityMemoryPackageIds",
      "crossFunctionMemoryPackageIds",
      "enterpriseMemoryPackageIds",
      "portfolioMemoryPackageIds",
      "evidenceReferenceIds",
      "sourceReferenceIds",
      "lineageReferenceIds",
      "archiveMetadata",
      "archiveLineageMetadata",
      "archiveGovernanceMetadata",
    ],
  },
];

const commonBuilderMarkers = [
  "companyId",
  "scope",
  "customerIsolation",
  "firmIsolation",
  "clientIsolation",
  "upstreamObservationIds",
  "upstreamPackageIds",
  "auditContractReferenceIds",
  "auditCandidateIds",
  "auditEvidencePackageIds",
  "auditFindingArtifactIds",
  "auditConfidenceIds",
  "auditSurfaceIds",
  "auditWatchlistIds",
  "auditBriefingIds",
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
];

const wave3ArtifactMarkers = [
  "memoryObjectIds",
  "memoryRelationshipIds",
  "evidenceLineageGraphIds",
  "organizationalMemoryPackageIds",
  "historicalOutcomePackageIds",
  "historicalDecisionPackageIds",
  "historicalAuditPackageIds",
  "historicalControllerPackageIds",
];

const prohibitedPatterns = [
  [/\bgraph traversal\b|\btraverse\b|\btraversal\b/i, "no graph traversal"],
  [/\bgraph search\b|\bqueryGraph\b|\bfindPath\b/i, "no graph search"],
  [/\bbfs\b/i, "no BFS"],
  [/\bdfs\b/i, "no DFS"],
  [/\bshortest path\b|\bshortestPath\b/i, "no shortest path"],
  [/\bgraph database\b|\bgraph databases\b|\bgraphology\b|\bcytoscape\b|\bneo4j\b|\bgremlin\b/i, "no graph database behavior"],
  [/\bvector database\b|\bvector databases\b|\bvectorStore\b/i, "no vector databases"],
  [/\bembedding\b|\bembeddings\b/i, "no embeddings"],
  [/\bsimilarity search\b|\bsimilaritySearch\b/i, "no similarity search"],
  [/\bmethodology learning\b/i, "no methodology learning"],
  [/\bpolicy learning\b/i, "no policy learning"],
  [/\bknowledge extraction\b/i, "no knowledge extraction"],
  [/\blearned conclusion\b|\blearned conclusions\b/i, "no learned conclusions"],
  [/\blearned control\b|\blearned controls\b/i, "no learned controls"],
  [/\blearned procedure\b|\blearned procedures\b/i, "no learned procedures"],
  [/\brecommendation\b|\brecommendations\b|\brecommend\b/i, "no recommendations"],
  [/\bbenchmark\b|\bbenchmarking\b|\bbenchmarkEntity\b/i, "no benchmarking"],
  [/\bscore\b|\bscoring\b/i, "no scoring"],
  [/\brank\b|\branking\b/i, "no ranking"],
  [/\bcalculation\b|\bcalculations\b|\bcalculate[A-Z]/, "no calculations"],
  [/\brisk calculation\b|\brisk calculations\b|\bcalculateRisk\b|\briskCalculation\b/i, "no risk calculations"],
  [/\breadiness calculation\b|\breadiness calculations\b|\bcalculateReadiness\b|\breadinessCalculation\b/i, "no readiness calculations"],
  [/\bworkflow execution\b|\bexecuteWorkflow\b|\bworkflowEngine\b/i, "no workflow execution"],
  [/\bapproval\b|\bapprovals\b|\bapprove\b/i, "no approvals"],
  [/\btask assignment\b|\bassignTask\b|\btaskAssignment\b/i, "no task assignment"],
  [/\barchive automation\b|\barchiveAutomation\b|\bautomateArchive\b/i, "no archive automation"],
  [/\bretention automation\b|\bretentionAutomation\b|\bautomateRetention\b/i, "no retention automation"],
  [/\bpersist\b|\bpersistence\b|\bpersistent store\b/i, "no persistence"],
  [/\bpersistence engine\b|\bpersistence engines\b|\bpersistenceEngine\b/i, "no persistence engines"],
  [/\bautonomous agent\b|\bautonomous agents\b|\bautonomousAgent\b/i, "no autonomous agents"],
  [/\bERP\b|\berpIntegration\b|\bsyncToErp\b/i, "no ERP integrations"],
  [/\bPrismaClient\b|@prisma\/client|\bprisma\.|\bcreateClient\s*\(|@supabase\/supabase-js|\bsupabase\./, "no database clients"],
  [/\.(insert|update|upsert|delete)\s*\(/, "no database writes"],
  [/\bNextResponse\b|\bNextRequest\b|app\/api|route\.ts/, "no API routes"],
  [/\bfrom\s+["']react["']|\brequire\(["']react["']\)/, "no React imports"],
  [/return\s*\(\s*<|=>\s*\(\s*</, "no JSX"],
  [/\bUI\b|\bdashboard\b|\bdashboards\b|\bwidget\b|\bwidgets\b|\brender(?:ing)?\b/i, "no UI, dashboards, widgets, or rendering"],
];

const implementedModules = fs
  .readdirSync(organizationalMemoryRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const expectedModule of modules.map((module) => module.module)) {
  assert(implementedModules.includes(expectedModule), `Phase 36 module directory exists: ${expectedModule}`);
}

for (const module of modules) {
  const moduleRoot = `lib/intelligence/synthetic/organizational-memory/${module.module}`;
  const builderFile = `${moduleRoot}/build${module.singularName}.ts`;
  const collectionFile = `${moduleRoot}/build${module.pluralName}.ts`;
  const indexFile = `${moduleRoot}/index.ts`;
  const builderText = readIfExists(builderFile);
  const collectionText = readIfExists(collectionFile);
  const indexText = readIfExists(indexFile);
  const label = `${module.phase} ${module.module}`;

  assert(exists(builderFile), `${label} builder file exists`);
  assert(exists(collectionFile), `${label} collection builder file exists`);
  assert(exists(indexFile), `${label} index file exists`);

  assertIncludes(indexText, `build${module.singularName}`, `${label} index exports builder`);
  assertIncludes(indexText, `build${module.pluralName}`, `${label} index exports collection builder`);
  assertIncludes(indexText, `Build${module.singularName}Input`, `${label} index exports input type`);
  assertIncludes(indexText, `Build${module.singularName}Result`, `${label} index exports result type`);
  assertIncludes(indexText, module.artifact, `${label} index exports artifact type`);

  assertIncludes(builderText, 'import { stableSnapshotHash } from "../../../core/hash";', `${label} imports stableSnapshotHash from core/hash`);
  assertNotIncludes(builderText, "../synthetic/historical-snapshots", `${label} does not import hash from historical snapshots`);
  assertIncludes(builderText, "stableSnapshotHash({", `${label} uses stableSnapshotHash for deterministic identifiers`);
  assertIncludes(builderText, module.idToken, `${label} preserves deterministic id token`);
  assertIncludes(builderText, module.keyToken, `${label} preserves deterministic key token`);
  assertIncludes(builderText, "validateInput", `${label} validates inputs`);
  assertIncludes(builderText, module.nullToken, `${label} has null return path`);
  assertIncludes(builderText, "skipped: true", `${label} fail-closed path marks skipped`);
  assertIncludes(builderText, "warnings", `${label} preserves warnings`);

  for (const marker of commonBuilderMarkers) {
    assertIncludes(builderText, marker, `${label} preserves ${marker}`);
  }

  for (const marker of module.extraMarkers) {
    assertIncludes(builderText, marker, `${label} preserves ${marker}`);
  }

  if (module.phase >= "36D") {
    for (const marker of wave3ArtifactMarkers) {
      if (builderText.includes(marker)) pass(`${label} preserves ${marker} when applicable`);
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
    const moduleRoot = `lib/intelligence/synthetic/organizational-memory/${module.module}`;
    return [
      readIfExists(`${moduleRoot}/build${module.singularName}.ts`),
      readIfExists(`${moduleRoot}/build${module.pluralName}.ts`),
      readIfExists(`${moduleRoot}/index.ts`),
    ];
  })
  .join("\n");

for (const [pattern, message] of prohibitedPatterns) {
  assertNotMatches(allImplementedText, pattern, `Phase 36 implementation has ${message}`);
}

for (const marker of wave3ArtifactMarkers) {
  assertIncludes(allImplementedText, marker, `Phase 36 implemented modules preserve ${marker}`);
}

assert(implementedModules.includes("enterprise-memory-package"), "enterprise memory package is implemented and verified in Wave 4");
assert(implementedModules.includes("portfolio-memory-package"), "portfolio memory package is implemented and verified in Wave 4");
assert(implementedModules.includes("organizational-memory-archive"), "organizational memory archive is implemented and verified in Wave 4");
assert(!implementedModules.includes("memory-preservation-package"), "memory preservation package is not implemented before verifier checkpoint");
