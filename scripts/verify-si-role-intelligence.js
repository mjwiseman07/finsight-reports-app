const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const rolesRoot = path.join(root, "lib", "intelligence", "synthetic", "roles");

const implementationModules = [
  moduleSpec("role-template", "RoleTemplate", "RoleTemplates"),
  moduleSpec("role-capability", "RoleCapability", "RoleCapabilities"),
  moduleSpec("role-restriction", "RoleRestriction", "RoleRestrictions"),
  moduleSpec("role-governance", "RoleGovernance", "RoleGovernances"),
  moduleSpec("role-execution-audit-log", "RoleExecutionAuditLog", "RoleExecutionAuditLogs"),
  moduleSpec("rapid-onboarding", "OnboardingSession", "OnboardingSessions"),
  moduleSpec("rapid-role-activation", "RoleActivation", "RoleActivations"),
  moduleSpec("existing-customer-activation", "ExistingCustomerActivation", "ExistingCustomerActivations"),
  moduleSpec("role-dashboard", "RoleDashboard", "RoleDashboards", {
    resultProperty: "dashboard",
    extraBuilders: [
      {
        file: "buildRoleTaskQueue.ts",
        functionName: "buildRoleTaskQueue",
        inputName: "BuildRoleTaskQueueInput",
        resultName: "BuildRoleTaskQueueResult",
        artifactName: "SyntheticRoleTaskQueue",
      },
    ],
  }),
  moduleSpec("overnight-scheduling", "OvernightSchedule", "OvernightSchedules"),
  moduleSpec("email-intake", "EmailIntake", "EmailIntakes"),
  moduleSpec("attachment-parser", "AttachmentParse", "AttachmentParses"),
  moduleSpec("email-task-mapper", "TaskMapping", "TaskMappings"),
  moduleSpec("canonical-journal-entry", "JournalEntryCandidate", "JournalEntryCandidates"),
  moduleSpec("je-validation", "ValidationResult", "ValidationResults"),
  moduleSpec("je-reasonableness", "ReasonablenessResult", "ReasonablenessResults"),
  moduleSpec("je-fraud-detection", "FraudDetectionResult", "FraudDetectionResults"),
  moduleSpec("je-state-machine", "JournalEntryStateMachine", "JournalEntryStateMachines", {
    resultProperty: "stateMachine",
  }),
  moduleSpec("lead-sheet", "LeadSheet", "LeadSheets"),
  moduleSpec("support-package", "SupportPackage", "SupportPackages"),
  moduleSpec("workpaper-package", "WorkpaperPackage", "WorkpaperPackages"),
  moduleSpec("drive-output", "DriveOutput", "DriveOutputs"),
  moduleSpec("folder-mapping", "FolderMapping", "FolderMappings"),
  moduleSpec("read-access-context", "ReadAccessContext", "ReadAccessContexts"),
  moduleSpec("erp-adapter-framework", "ErpAdapterContract", "ErpAdapterContracts"),
  moduleSpec("quickbooks-adapter", "QuickBooksAdapter", "QuickBooksAdapters"),
  moduleSpec("xero-adapter", "XeroAdapter", "XeroAdapters"),
  moduleSpec("sage-intacct-adapter", "SageIntacctAdapter", "SageIntacctAdapters"),
  moduleSpec("netsuite-adapter", "NetSuiteAdapter", "NetSuiteAdapters"),
  moduleSpec("dynamics-adapter", "DynamicsAdapter", "DynamicsAdapters"),
  moduleSpec("import-template-engine", "ImportTemplate", "ImportTemplates"),
  moduleSpec("formatted-email-entry", "FormattedEmailEntry", "FormattedEmailEntries"),
  moduleSpec("universal-canonical-schema", "UniversalCanonicalSchema", "UniversalCanonicalSchemas"),
  moduleSpec("ai-staff-accountant", "StaffAccountantRole", "StaffAccountantRoles"),
  moduleSpec("ai-senior-accountant", "SeniorAccountantRole", "SeniorAccountantRoles"),
  moduleSpec("ai-accounting-manager", "AccountingManagerRole", "AccountingManagerRoles"),
  moduleSpec("ai-controller-helper", "ControllerHelperRole", "ControllerHelperRoles"),
  moduleSpec("ai-cfo-helper", "CfoHelperRole", "CfoHelperRoles"),
  moduleSpec("ai-staff-auditor", "StaffAuditorRole", "StaffAuditorRoles"),
  moduleSpec("ai-senior-auditor", "SeniorAuditorRole", "SeniorAuditorRoles"),
  moduleSpec("ai-audit-manager-helper", "AuditManagerHelperRole", "AuditManagerHelperRoles"),
  moduleSpec("ai-partner-helper", "PartnerHelperRole", "PartnerHelperRoles"),
  moduleSpec("role-response", "RoleResponse", "RoleResponses"),
  moduleSpec("controller-notification", "ControllerNotification", "ControllerNotifications"),
  moduleSpec("decline-warning", "DeclineWarning", "DeclineWarnings"),
  moduleSpec("morning-summary", "MorningSummary", "MorningSummaries"),
];

const contractModule = {
  dir: "contracts",
  files: ["SyntheticRoleIntelligenceContracts.ts", "index.ts"],
  requiredMarkers: [
    "SyntheticPhase39LockMarkersContract",
    "phase39ModulesCompleted",
    "phase39VerifierPassed",
    "phase39TypeScriptPassed",
    "phase39LockHash",
    "phase39LockedAt",
    "executable: false",
    "customerIsolation",
    "firmIsolation",
    "clientIsolation",
  ],
  requiredIndexExports: [
    "SyntheticPhase39LockMarkersContract",
    "SyntheticRoleBaseContract",
    "SyntheticRoleType",
  ],
};

const markerChecks = [
  moduleMarker("contracts", "SyntheticRoleIntelligenceContracts.ts", [
    "SyntheticPhase39LockMarkersContract",
    "phase39VerifierPassed",
    "phase39TypeScriptPassed",
  ]),
  moduleMarker("role-template", "buildRoleTemplate.ts", ["adHocRequestSupported: true", "executable: false"]),
  moduleMarker("role-governance", "buildRoleGovernance.ts", [
    "approvalRequired: true",
    "approvalRoutingTargetRoleType",
    "humanDecisionRequired",
    "executable: false",
  ]),
  moduleMarker("role-execution-audit-log", "buildRoleExecutionAuditLog.ts", ["auditLog", "executable: false"]),
  moduleMarker("rapid-onboarding", "buildOnboardingSession.ts", ["onboardingUnder15MinutesGate", "executable: false"]),
  moduleMarker("rapid-role-activation", "buildRoleActivation.ts", [
    "newCustomerActivationUnder15MinutesGate",
    "executable: false",
  ]),
  moduleMarker("existing-customer-activation", "buildExistingCustomerActivation.ts", [
    "existingCustomerActivationUnder3MinutesGate",
    "executable: false",
  ]),
  moduleMarker("overnight-scheduling", "buildOvernightSchedule.ts", ["overnight", "executable: false"]),
  moduleMarker("je-validation", "buildValidationResult.ts", ["overallValidationStatus", "executable: false"]),
  moduleMarker("je-reasonableness", "buildReasonablenessResult.ts", ["reasonableness", "executable: false"]),
  moduleMarker("je-fraud-detection", "buildFraudDetectionResult.ts", ["fraud", "executable: false"]),
  moduleMarker("je-state-machine", "buildJournalEntryStateMachine.ts", ["state", "executable: false"]),
  moduleMarker("workpaper-package", "buildWorkpaperPackage.ts", ["workpaperPackage", "executable: false"]),
  moduleMarker("drive-output", "buildDriveOutput.ts", ["driveOutput", "executable: false"]),
  moduleMarker("erp-adapter-framework", "buildErpAdapterContract.ts", ["executable: false", "executionReady"]),
  moduleMarker("quickbooks-adapter", "buildQuickBooksAdapter.ts", ["erpType: \"quickbooks\"", "adapterKind", "executable: false"]),
  moduleMarker("xero-adapter", "buildXeroAdapter.ts", [
    "erpType: \"xero\"",
    "signAwareClassificationRequired: true",
    "executable: false",
  ]),
  moduleMarker("sage-intacct-adapter", "buildSageIntacctAdapter.ts", [
    "erpType: \"sage_intacct\"",
    "locationDimensionMappingReferenceId",
    "departmentDimensionMappingReferenceId",
    "projectDimensionMappingReferenceId",
    "executable: false",
  ]),
  moduleMarker("netsuite-adapter", "buildNetSuiteAdapter.ts", ["subsidiary", "executable: false"]),
  moduleMarker("dynamics-adapter", "buildDynamicsAdapter.ts", ["business_central", "finance_and_operations", "executable: false"]),
  moduleMarker("ai-staff-accountant", "buildStaffAccountantRole.ts", [
    "canPostDirectly: false",
    "humanRetainsFinalDecision: true",
    "executable: false",
  ]),
  moduleMarker("ai-senior-accountant", "buildSeniorAccountantRole.ts", [
    "routesMaterialItemsToHumanController: true",
    "canSelfApproveMaterialEntries: false",
    "executable: false",
  ]),
  moduleMarker("ai-accounting-manager", "buildAccountingManagerRole.ts", [
    "canReviewStaffAndSeniorOutput: true",
    "escalatesExceptionsToHumanController: true",
    "executable: false",
  ]),
  moduleMarker("ai-controller-helper", "buildControllerHelperRole.ts", [
    "canMakeFinalDecisionOnMaterialItems: false",
    "canOverrideFraudDetection: false",
    "canOverrideReasonablenessCheck: false",
    "canSignOffOnFinancialStatements: false",
    "executable: false",
  ]),
  moduleMarker("ai-cfo-helper", "buildCfoHelperRole.ts", [
    "canMakeFinalFinancialDecisions: false",
    "canOverrideControllerDecisions: false",
    "executable: false",
  ]),
  moduleMarker("ai-staff-auditor", "buildStaffAuditorRole.ts", [
    "canSignOffAsPreparer: true",
    "canGenerateAuditOpinion: false",
    "humanRetainsReviewAndOpinion: true",
  ]),
  moduleMarker("ai-senior-auditor", "buildSeniorAuditorRole.ts", [
    "canReviewStaffAuditorWork: true",
    "canGenerateAuditOpinion: false",
    "executable: false",
  ]),
  moduleMarker("ai-audit-manager-helper", "buildAuditManagerHelperRole.ts", [
    "canFinalizeWorkpaperReviewSignOff: false",
    "canMakeMaterialityOrScopeDecisions: false",
    "executable: false",
  ]),
  moduleMarker("ai-partner-helper", "buildPartnerHelperRole.ts", [
    "canSignOffOnAuditOpinion: false",
    "canConcludeOnEngagements: false",
    "executable: false",
  ]),
  moduleMarker("role-response", "buildRoleResponse.ts", ["responsePreservesTraceability: true", "executable: false"]),
  moduleMarker("controller-notification", "buildControllerNotification.ts", [
    "notificationPreservesTraceability: true",
    "executable: false",
  ]),
  moduleMarker("decline-warning", "buildDeclineWarning.ts", [
    "declinePreservedPermanently: true",
    "neverSilentlyPasses: true",
    "overridePreservedPermanently: true",
    "executable: false",
  ]),
  moduleMarker("morning-summary", "buildMorningSummary.ts", [
    "summaryPreservesTraceability: true",
    "morningReviewReady",
    "executable: false",
  ]),
];

const bannedImportPatterns = [
  ["React import", /\bimport\s+.*?\s+from\s+["']react(?:\/[^"']*)?["']/],
  ["Next.js import", /\bimport\s+.*?\s+from\s+["']next(?:\/[^"']*)?["']/],
  ["Node fs import", /\bimport\s+.*?\s+from\s+["'](?:node:)?fs(?:\/promises)?["']/],
  ["Node path import", /\bimport\s+.*?\s+from\s+["'](?:node:)?path["']/],
  ["Node child_process import", /\bimport\s+.*?\s+from\s+["'](?:node:)?child_process["']/],
  ["Node network import", /\bimport\s+.*?\s+from\s+["'](?:node:)?(?:http|https|net|tls|dgram)["']/],
  ["database client import", /\bimport\s+.*?\s+from\s+["'](?:@prisma\/client|prisma|drizzle-orm|mongoose|pg|mysql2|sqlite3)["']/],
  ["HTTP client import", /\bimport\s+.*?\s+from\s+["'](?:axios|node-fetch|got|ky)["']/],
];

const bannedSourcePatterns = [
  ["CommonJS require", /\brequire\s*\(/],
  ["fetch call", /\bfetch\s*\(/],
  ["database write or query", /\b(?:prisma|db|database)\s*\./],
  ["file write", /\b(?:writeFile|appendFile|createWriteStream|mkdir|rm|unlink)\s*\(/],
  ["route handler export", /\bexport\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)\b/],
  ["React hook", /\buse(?:State|Effect|Memo|Callback|Ref|Reducer)\s*\(/],
  ["timer or worker scheduling", /\b(?:setTimeout|setInterval|queueMicrotask|Worker)\s*\(/],
  ["email sending call", /\b(?:sendMail|sendEmail|sendMessage)\s*\(/],
  ["dynamic import", /\bimport\s*\(/],
];

const failures = [];

verifyContracts();
for (const spec of implementationModules) {
  verifyImplementationModule(spec);
}
verifyModuleInventory();
verifyMarkerChecks();
verifyBannedPatterns();

if (failures.length > 0) {
  console.error("FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("PASS");
process.exit(0);

function moduleSpec(dir, singularName, pluralName, options = {}) {
  return {
    dir,
    singularName,
    pluralName,
    singularFile: `build${singularName}.ts`,
    pluralFile: `build${pluralName}.ts`,
    singularFunction: `build${singularName}`,
    pluralFunction: `build${pluralName}`,
    inputName: `Build${singularName}Input`,
    resultName: `Build${singularName}Result`,
    pluralInputName: `Build${pluralName}Input`,
    pluralResultName: `Build${pluralName}Result`,
    artifactName: `Synthetic${singularName}`,
    resultProperty: options.resultProperty ?? lowerFirst(singularName),
    extraBuilders: options.extraBuilders ?? [],
  };
}

function moduleMarker(dir, file, markers) {
  return { dir, file, markers };
}

function verifyContracts() {
  const dir = path.join(rolesRoot, contractModule.dir);
  requireDirectory(dir, contractModule.dir);

  for (const file of contractModule.files) {
    requireFile(path.join(dir, file), `${contractModule.dir}/${file}`);
  }

  const contractSource = readIfExists(path.join(dir, "SyntheticRoleIntelligenceContracts.ts"));
  for (const marker of contractModule.requiredMarkers) {
    requireIncludes(contractSource, marker, "contracts/SyntheticRoleIntelligenceContracts.ts");
  }

  const indexSource = readIfExists(path.join(dir, "index.ts"));
  for (const exportName of contractModule.requiredIndexExports) {
    requireIncludes(indexSource, exportName, "contracts/index.ts");
  }
}

function verifyImplementationModule(spec) {
  const dir = path.join(rolesRoot, spec.dir);
  requireDirectory(dir, spec.dir);

  const singularPath = path.join(dir, spec.singularFile);
  const pluralPath = path.join(dir, spec.pluralFile);
  const indexPath = path.join(dir, "index.ts");

  requireFile(singularPath, `${spec.dir}/${spec.singularFile}`);
  requireFile(pluralPath, `${spec.dir}/${spec.pluralFile}`);
  requireFile(indexPath, `${spec.dir}/index.ts`);

  const singularSource = readIfExists(singularPath);
  const pluralSource = readIfExists(pluralPath);
  const indexSource = readIfExists(indexPath);

  requireIncludes(singularSource, `export function ${spec.singularFunction}`, `${spec.dir}/${spec.singularFile}`);
  requireIncludes(singularSource, spec.inputName, `${spec.dir}/${spec.singularFile}`);
  requireIncludes(singularSource, spec.resultName, `${spec.dir}/${spec.singularFile}`);
  requireIncludes(singularSource, spec.artifactName, `${spec.dir}/${spec.singularFile}`);
  requireIncludes(singularSource, 'import { stableSnapshotHash } from "../../../core/hash"', `${spec.dir}/${spec.singularFile}`);
  requireIncludes(singularSource, "stableSnapshotHash(", `${spec.dir}/${spec.singularFile}`);
  requireIncludes(singularSource, "collectMissingRequiredIdentifiers", `${spec.dir}/${spec.singularFile}`);
  requireIncludes(singularSource, `${spec.resultProperty}: null`, `${spec.dir}/${spec.singularFile}`);
  requireIncludes(singularSource, "skipped: true", `${spec.dir}/${spec.singularFile}`);
  requireIncludes(singularSource, "missing required identifiers", `${spec.dir}/${spec.singularFile}`);
  requireIncludes(singularSource, "executable: false", `${spec.dir}/${spec.singularFile}`);
  requireIncludes(singularSource, "executionReady", `${spec.dir}/${spec.singularFile}`);
  requireIncludes(singularSource, "phase39StaleMarker", `${spec.dir}/${spec.singularFile}`);
  requireIncludes(singularSource, "boundPhase38SnapshotHash", `${spec.dir}/${spec.singularFile}`);
  requireIncludes(singularSource, "boundPhase37SnapshotHash", `${spec.dir}/${spec.singularFile}`);
  requireSeparatedIsolationFields(singularSource, `${spec.dir}/${spec.singularFile}`);
  requireMetadataFields(singularSource, `${spec.dir}/${spec.singularFile}`);

  requireIncludes(pluralSource, `export function ${spec.pluralFunction}`, `${spec.dir}/${spec.pluralFile}`);
  requireIncludes(pluralSource, spec.pluralInputName, `${spec.dir}/${spec.pluralFile}`);
  requireIncludes(pluralSource, spec.pluralResultName, `${spec.dir}/${spec.pluralFile}`);
  requireIncludes(pluralSource, spec.singularFunction, `${spec.dir}/${spec.pluralFile}`);
  requireIncludes(pluralSource, "skippedIndexes", `${spec.dir}/${spec.pluralFile}`);
  requireIncludes(pluralSource, "warnings", `${spec.dir}/${spec.pluralFile}`);

  requireIncludes(indexSource, spec.singularFunction, `${spec.dir}/index.ts`);
  requireIncludes(indexSource, spec.pluralFunction, `${spec.dir}/index.ts`);
  requireIncludes(indexSource, spec.inputName, `${spec.dir}/index.ts`);
  requireIncludes(indexSource, spec.resultName, `${spec.dir}/index.ts`);
  requireIncludes(indexSource, spec.artifactName, `${spec.dir}/index.ts`);
  requireIncludes(indexSource, spec.pluralInputName, `${spec.dir}/index.ts`);
  requireIncludes(indexSource, spec.pluralResultName, `${spec.dir}/index.ts`);

  for (const extra of spec.extraBuilders) {
    verifyExtraBuilder(spec.dir, extra, indexSource);
  }
}

function verifyExtraBuilder(dirName, extra, indexSource) {
  const filePath = path.join(rolesRoot, dirName, extra.file);
  requireFile(filePath, `${dirName}/${extra.file}`);

  const source = readIfExists(filePath);
  requireIncludes(source, `export function ${extra.functionName}`, `${dirName}/${extra.file}`);
  requireIncludes(source, extra.inputName, `${dirName}/${extra.file}`);
  requireIncludes(source, extra.resultName, `${dirName}/${extra.file}`);
  requireIncludes(source, extra.artifactName, `${dirName}/${extra.file}`);
  requireIncludes(source, 'import { stableSnapshotHash } from "../../../core/hash"', `${dirName}/${extra.file}`);
  requireIncludes(source, "executable: false", `${dirName}/${extra.file}`);
  requireSeparatedIsolationFields(source, `${dirName}/${extra.file}`);

  requireIncludes(indexSource, extra.functionName, `${dirName}/index.ts`);
  requireIncludes(indexSource, extra.inputName, `${dirName}/index.ts`);
  requireIncludes(indexSource, extra.resultName, `${dirName}/index.ts`);
  requireIncludes(indexSource, extra.artifactName, `${dirName}/index.ts`);
}

function verifyModuleInventory() {
  const expectedDirs = new Set(["contracts", ...implementationModules.map((spec) => spec.dir)]);
  const actualDirs = fs
    .readdirSync(rolesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((dirName) => expectedDirs.has(dirName));

  for (const dirName of expectedDirs) {
    if (!actualDirs.includes(dirName)) {
      failures.push(`missing module directory from inventory: ${dirName}`);
    }
  }
}

function verifyMarkerChecks() {
  for (const check of markerChecks) {
    const sourcePath = path.join(rolesRoot, check.dir, check.file);
    const source = readIfExists(sourcePath);
    for (const marker of check.markers) {
      requireIncludes(source, marker, `${check.dir}/${check.file}`);
    }
  }
}

function verifyBannedPatterns() {
  for (const filePath of collectTypeScriptFiles(rolesRoot)) {
    const relativePath = normalizePath(path.relative(root, filePath));
    const source = readIfExists(filePath);

    for (const [label, pattern] of bannedImportPatterns) {
      if (pattern.test(source)) {
        failures.push(`${relativePath}: banned ${label}`);
      }
    }

    for (const [label, pattern] of bannedSourcePatterns) {
      if (pattern.test(source)) {
        failures.push(`${relativePath}: banned ${label}`);
      }
    }
  }
}

function collectTypeScriptFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTypeScriptFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

function requireDirectory(dirPath, label) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    failures.push(`missing directory: ${label}`);
  }
}

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    failures.push(`missing file: ${label}`);
  }
}

function readIfExists(filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(source, marker, label) {
  if (!source.includes(marker)) {
    failures.push(`${label}: missing marker "${marker}"`);
  }
}

function requireSeparatedIsolationFields(source, label) {
  for (const marker of ["customerIsolation", "firmIsolation", "clientIsolation"]) {
    requireIncludes(source, marker, label);
  }
}

function requireMetadataFields(source, label) {
  for (const marker of [
    "confidenceFloorMetadata",
    "sourceConfidenceReferenceIds",
    "evidenceReferenceIds",
    "lineageReferenceIds",
    "trustMetadata",
    "confidenceMetadata",
    "governanceMetadata",
    "materialityMetadata",
    "derivationHash",
    "warnings",
    "skippedIndexes",
  ]) {
    requireIncludes(source, marker, label);
  }
}

function lowerFirst(value) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}
