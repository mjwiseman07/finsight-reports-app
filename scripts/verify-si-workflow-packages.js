const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const workflowRoot = path.join(root, "lib", "intelligence", "synthetic", "workflow");

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

const workflowPackages = [
  {
    wave: "Wave 1",
    module: "audit-response-package",
    name: "AuditResponse",
    artifact: "SyntheticAuditResponsePackage",
  },
  {
    wave: "Wave 1",
    module: "audit-package",
    name: "Audit",
    artifact: "SyntheticAuditPackage",
  },
  {
    wave: "Wave 1",
    module: "controller-review-package",
    name: "ControllerReview",
    artifact: "SyntheticControllerReviewPackage",
  },
  {
    wave: "Wave 1",
    module: "executive-briefing-package",
    name: "ExecutiveBriefing",
    artifact: "SyntheticExecutiveBriefingPackage",
  },
  {
    wave: "Wave 2",
    module: "close-readiness-package",
    name: "CloseReadiness",
    artifact: "SyntheticCloseReadinessPackage",
  },
  {
    wave: "Wave 2",
    module: "close-health-package",
    name: "CloseHealth",
    artifact: "SyntheticCloseHealthPackage",
  },
  {
    wave: "Wave 2",
    module: "close-risk-package",
    name: "CloseRisk",
    artifact: "SyntheticCloseRiskPackage",
  },
  {
    wave: "Wave 2",
    module: "close-support-package",
    name: "CloseSupport",
    artifact: "SyntheticCloseSupportPackage",
  },
  {
    wave: "Wave 3",
    module: "reconciliation-review-package",
    name: "ReconciliationReview",
    artifact: "SyntheticReconciliationReviewPackage",
  },
  {
    wave: "Wave 3",
    module: "schedule-review-package",
    name: "ScheduleReview",
    artifact: "SyntheticScheduleReviewPackage",
  },
  {
    wave: "Wave 3",
    module: "tie-out-review-package",
    name: "TieOutReview",
    artifact: "SyntheticTieOutReviewPackage",
  },
  {
    wave: "Wave 3",
    module: "evidence-review-package",
    name: "EvidenceReview",
    artifact: "SyntheticEvidenceReviewPackage",
  },
  {
    wave: "Wave 4",
    module: "client-portfolio-package",
    name: "ClientPortfolio",
    artifact: "SyntheticClientPortfolioPackage",
  },
  {
    wave: "Wave 4",
    module: "firm-audit-package",
    name: "FirmAudit",
    artifact: "SyntheticFirmAuditPackage",
  },
  {
    wave: "Wave 4",
    module: "firm-controller-package",
    name: "FirmController",
    artifact: "SyntheticFirmControllerPackage",
  },
  {
    wave: "Wave 4",
    module: "multi-client-risk-readiness-package",
    name: "MultiClientRiskReadiness",
    artifact: "SyntheticMultiClientRiskReadinessPackage",
  },
];

const builderMarkers = [
  "packageId",
  "packageKey",
  "packageCategory",
  "companyId",
  "scope",
  "customerIsolation",
  "firmIsolation",
  "clientIsolation",
  "evidenceReferenceIds",
  "sourceReferenceIds",
  "lineageReferenceIds",
  "auditContractReferenceIds",
  "auditCandidateIds",
  "auditEvidencePackageIds",
  "auditFindingArtifactIds",
  "auditConfidenceIds",
  "auditSurfaceIds",
  "auditWatchlistIds",
  "auditBriefingIds",
  "upstreamObservationIds",
  "upstreamPackageIds",
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

const nonGoalPatterns = [
  [/\bscore|scoring\b/i, "no scoring markers"],
  [/\brank|ranking\b/i, "no ranking markers"],
  [/\bworkflow execution\b|\bexecuteWorkflow\b|\bworkflowEngine\b/i, "no workflow execution"],
  [/\bapproval|approvals|approve\b/i, "no approvals"],
  [/\bassignTask\b|\btask assignment\b/i, "no task assignment"],
  [/\bemail sending\b|\bsendEmail\b|\bemailClient\b/i, "no email sending"],
  [/\bERP\b|\berpIntegration\b|\bsyncToErp\b/i, "no ERP integrations"],
  [/\bPrismaClient\b|@prisma\/client|\bprisma\.|\bcreateClient\s*\(|@supabase\/supabase-js|\bsupabase\./, "no database clients"],
  [/\.(insert|update|upsert|delete)\s*\(/, "no persistence writes"],
  [/\bNextResponse\b|\bNextRequest\b|app\/api|route\.ts/, "no API routes"],
  [/\bfrom\s+["']react["']|\brequire\(["']react["']\)/, "no React imports"],
  [/return\s*\(\s*<|=>\s*\(\s*</, "no JSX"],
  [/\bUI\b|\bdashboard\b|\bdashboards\b|\bwidget\b|\bwidgets\b|\brender(?:ing)?\b/i, "no UI, dashboards, widgets, or rendering"],
  [/\bautonomous agent\b|\bautonomousAgent\b/i, "no autonomous agents"],
];

const expectedModules = workflowPackages.map((workflowPackage) => workflowPackage.module);
const workflowModuleDirectories = fs
  .readdirSync(workflowRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const expectedModule of expectedModules) {
  assert(workflowModuleDirectories.includes(expectedModule), `Phase 35 module directory exists: ${expectedModule}`);
}

for (const workflowPackage of workflowPackages) {
  const moduleRoot = `lib/intelligence/synthetic/workflow/${workflowPackage.module}`;
  const builderFile = `${moduleRoot}/build${workflowPackage.name}Package.ts`;
  const collectionFile = `${moduleRoot}/build${workflowPackage.name}Packages.ts`;
  const indexFile = `${moduleRoot}/index.ts`;
  const builderText = readIfExists(builderFile);
  const collectionText = readIfExists(collectionFile);
  const indexText = readIfExists(indexFile);
  const label = `${workflowPackage.wave} ${workflowPackage.module}`;

  assert(exists(builderFile), `${label} package builder file exists`);
  assert(exists(collectionFile), `${label} collection builder file exists`);
  assert(exists(indexFile), `${label} barrel index file exists`);

  assertIncludes(builderText, `build${workflowPackage.name}Package`, `${label} package builder exists`);
  assertIncludes(collectionText, `build${workflowPackage.name}Packages`, `${label} collection builder exists`);
  assertIncludes(indexText, `build${workflowPackage.name}Package`, `${label} barrel exports package builder`);
  assertIncludes(indexText, `build${workflowPackage.name}Packages`, `${label} barrel exports collection builder`);
  assertIncludes(indexText, `Build${workflowPackage.name}PackageInput`, `${label} barrel exports package input type`);
  assertIncludes(indexText, `Build${workflowPackage.name}PackageResult`, `${label} barrel exports package result type`);
  assertIncludes(indexText, `Build${workflowPackage.name}PackagesInput`, `${label} barrel exports collection input type`);
  assertIncludes(indexText, `Build${workflowPackage.name}PackagesResult`, `${label} barrel exports collection result type`);
  assertIncludes(indexText, workflowPackage.artifact, `${label} barrel exports synthetic package type`);

  assertIncludes(builderText, 'import { stableSnapshotHash } from "../../../core/hash";', `${label} imports stableSnapshotHash from core hash`);
  assertNotIncludes(builderText, "historical-snapshots", `${label} has no historical snapshot hash import`);
  assertNotIncludes(builderText, "crypto", `${label} has no crypto hash import`);
  assertNotMatches(builderText, /function\s+stableSnapshotHash|const\s+stableSnapshotHash\s*=/, `${label} does not define a local hash`);
  assertIncludes(builderText, "stableSnapshotHash({", `${label} uses deterministic hash input`);
  assertIncludes(builderText, "packageId: buildPackageId(input)", `${label} deterministic packageId generation exists`);

  assertIncludes(builderText, "validateInput", `${label} required identifier validation exists`);
  assertIncludes(builderText, "is required", `${label} required identifier warnings exist`);
  assertIncludes(builderText, `${workflowPackage.name.charAt(0).toLowerCase()}${workflowPackage.name.slice(1)}Package: null`, `${label} null return path exists`);
  assertIncludes(builderText, "skipped: true", `${label} skipped fail-closed return exists`);
  assertIncludes(builderText, "warnings", `${label} warnings marker exists`);
  assertIncludes(collectionText, "skippedIndexes", `${label} skippedIndexes collection exists`);
  assertIncludes(collectionText, "warnings.push", `${label} warnings collection exists`);
  assertNotMatches(collectionText, /\.sort\s*\(|\.reverse\s*\(/, `${label} avoids reordered collection transforms`);
  assert(collectionText.includes(".forEach((") && collectionText.includes(", index)"), `${label} deterministic input-order traversal exists`);

  for (const marker of builderMarkers) {
    assertIncludes(builderText, marker, `${label} preserves ${marker}`);
  }

  for (const [pattern, message] of nonGoalPatterns) {
    assertNotMatches(builderText, pattern, `${label} ${message} in package builder`);
    assertNotMatches(collectionText, pattern, `${label} ${message} in collection builder`);
    assertNotMatches(indexText, pattern, `${label} ${message} in barrel exports`);
  }
}

if (process.exitCode) {
  console.error("Workflow package verifier failed.");
  process.exit(process.exitCode);
}

console.log("Workflow package verifier passed.");
