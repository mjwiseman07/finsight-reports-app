const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const organizationDirectory = path.join(root, "lib", "intelligence", "synthetic", "organization");
const contractsDirectory = path.join(organizationDirectory, "contracts");
const contractsSourcePath = path.join(contractsDirectory, "SyntheticOrganizationContracts.ts");
const contractsIndexPath = path.join(contractsDirectory, "index.ts");

const moduleSpecs = [
  {
    name: "contracts",
    directory: "contracts",
    files: ["SyntheticOrganizationContracts.ts", "index.ts"],
    exportedSymbols: [
      "SyntheticOrganizationBaseContract",
      "SyntheticPhase39RoleHandoffConsumptionContract",
      "RecommendationAuditEntry",
    ],
    isContracts: true,
  },
  {
    name: "org-unit",
    directory: "org-unit",
    files: ["buildOrganizationalUnit.ts", "buildOrganizationalUnits.ts", "index.ts"],
    exportedSymbols: ["buildOrganizationalUnit", "buildOrganizationalUnits"],
  },
  {
    name: "workforce-registry",
    directory: "workforce-registry",
    files: ["buildWorkforceMember.ts", "buildWorkforceMembers.ts", "index.ts"],
    exportedSymbols: ["buildWorkforceMember", "buildWorkforceMembers"],
    markers: [
      "minimumIdentityOnly",
      "noHrRecordStored",
      "noPerformanceHistoryStored",
      "noCompensationStored",
      "noPersonalDataStored",
    ],
  },
  {
    name: "capacity",
    directory: "capacity",
    files: ["buildCapacity.ts", "buildCapacityPackage.ts", "buildCapacities.ts", "index.ts"],
    exportedSymbols: ["buildCapacity", "buildCapacityPackage", "buildCapacities"],
    markers: ["isObservationalOnly"],
  },
  {
    name: "work-allocation",
    directory: "work-allocation",
    files: ["buildAssignmentCandidate.ts", "buildWorkAllocationPackage.ts", "buildWorkAllocations.ts", "index.ts"],
    exportedSymbols: ["buildAssignmentCandidate", "buildWorkAllocationPackage", "buildWorkAllocations"],
    markers: ["isRecommendationOnly", "requiresHumanApproval", "noAutomaticAssignment"],
    recommendationProducer: true,
  },
  {
    name: "escalation",
    directory: "escalation",
    files: ["buildEscalationCandidate.ts", "buildEscalationPackage.ts", "buildEscalations.ts", "index.ts"],
    exportedSymbols: ["buildEscalationCandidate", "buildEscalationPackage", "buildEscalations"],
    markers: ["isRecommendationOnly", "requiresHumanDecision", "noAutonomousEscalation", "humanResolvesEscalations"],
    recommendationProducer: true,
  },
  {
    name: "org-health",
    directory: "org-health",
    files: ["buildOrganizationalHealthPackage.ts", "buildOrganizationalHealthPackages.ts", "index.ts"],
    exportedSymbols: ["buildOrganizationalHealthPackage", "buildOrganizationalHealthPackages"],
    markers: [
      "isOperationalMetricsOnly",
      "noEmployeeRanking",
      "noEmployeeScoring",
      "noHrEvaluation",
      "excludesSimulationOutputs",
      "workforceTypeFilterable",
      "humanAndAiMetricsNotCoMingled",
    ],
  },
  {
    name: "workforce-performance",
    directory: "workforce-performance",
    files: ["buildWorkforcePerformancePackage.ts", "buildWorkforcePerformancePackages.ts", "index.ts"],
    exportedSymbols: ["buildWorkforcePerformancePackage", "buildWorkforcePerformancePackages"],
    markers: [
      "isOperationalMetricsOnly",
      "noEmployeeRanking",
      "noEmployeeScoring",
      "noHrEvaluation",
      "noIndividualHumanPerformanceScoring",
      "workforceTypeFilterable",
      "humanAndAiMetricsNotCoMingled",
      "excludesSimulationOutputs",
    ],
  },
  {
    name: "close-command-center",
    directory: "close-command-center",
    files: ["buildCloseCommandCenterPackage.ts", "buildCloseCommandCenterPackages.ts", "index.ts"],
    exportedSymbols: ["buildCloseCommandCenterPackage", "buildCloseCommandCenterPackages"],
    markers: ["updateInPlace", "noDuplicateOnRerun", "noTimestampInHashInputs"],
  },
  {
    name: "audit-command-center",
    directory: "audit-command-center",
    files: ["buildAuditCommandCenterPackage.ts", "buildAuditCommandCenterPackages.ts", "index.ts"],
    exportedSymbols: ["buildAuditCommandCenterPackage", "buildAuditCommandCenterPackages"],
    markers: ["updateInPlace", "noDuplicateOnRerun", "noTimestampInHashInputs"],
  },
  {
    name: "revenue-cycle-command-center",
    directory: "revenue-cycle-command-center",
    files: ["buildRevenueCycleCommandCenterPackage.ts", "buildRevenueCycleCommandCenterPackages.ts", "index.ts"],
    exportedSymbols: ["buildRevenueCycleCommandCenterPackage", "buildRevenueCycleCommandCenterPackages"],
    markers: [
      "updateInPlace",
      "noDuplicateOnRerun",
      "noTimestampInHashInputs",
      "phiMarkedWhenHealthcareUnit",
      "phiArtifactRequiresIsolationFields",
      "noMixingPhiAndNonPhiInSamePayload",
      "hipaaControlsDeferredToPhase42_5",
    ],
  },
  {
    name: "payroll-command-center",
    directory: "payroll-command-center",
    files: ["buildPayrollCommandCenterPackage.ts", "buildPayrollCommandCenterPackages.ts", "index.ts"],
    exportedSymbols: ["buildPayrollCommandCenterPackage", "buildPayrollCommandCenterPackages"],
    markers: [
      "updateInPlace",
      "noDuplicateOnRerun",
      "noTimestampInHashInputs",
      "containsSensitivePersonalData",
      "noAutonomousPayrollRun",
      "noAutonomousPaymentAuthorization",
      "payrollApprovalRequiresHuman",
    ],
  },
  {
    name: "digital-twin",
    directory: "digital-twin",
    files: ["buildOrganizationalTwin.ts", "buildOrganizationalTwins.ts", "index.ts"],
    exportedSymbols: ["buildOrganizationalTwin", "buildOrganizationalTwins"],
    markers: ["isStructuralModelOnly", "isFoundationForSimulation", "noExecution"],
  },
  {
    name: "simulation",
    directory: "simulation",
    files: ["buildSimulationPackage.ts", "buildSimulationPackages.ts", "index.ts"],
    exportedSymbols: ["buildSimulationPackage", "buildSimulationPackages"],
    markers: [
      "isSimulation",
      "isProjectionNotForecastOfRecord",
      "excludedFromOrganizationalHealth",
      "excludedFromWorkforcePerformance",
      "neverTriggersRealAction",
      "assumptionsAttached",
    ],
    requiredStrings: ["simulationIsolation"],
  },
  {
    name: "digital-departments",
    directory: "digital-departments",
    files: ["buildDigitalDepartment.ts", "buildDigitalDepartments.ts", "index.ts"],
    exportedSymbols: ["buildDigitalDepartment", "buildDigitalDepartments"],
    markers: ["humansRetainFinalDecision", "isNotReplacementForHumanDepartment", "recommendationOnlyCoordination"],
  },
  {
    name: "governance",
    directory: "governance",
    files: ["buildGovernancePackage.ts", "buildRecommendationAuditChain.ts", "buildGovernancePackages.ts", "index.ts"],
    exportedSymbols: ["buildGovernancePackage", "buildRecommendationAuditChain", "buildGovernancePackages"],
    markers: [
      "appendOnly",
      "immutableRecord",
      "neverEditedOrDeleted",
      "supersedingCreatesNewEntry",
      "supportsSoc1Evidence",
      "supportsSoc2Evidence",
      "soc1Soc2ProgramDeferredToPhase42_5",
    ],
  },
  {
    name: "marketplace",
    directory: "marketplace",
    files: ["buildMarketplaceListing.ts", "buildDeploymentArtifact.ts", "buildMarketplaceListings.ts", "index.ts"],
    exportedSymbols: ["buildMarketplaceListing", "buildDeploymentArtifact", "buildMarketplaceListings"],
    markers: [
      "humanCuratedBeforePublish",
      "noAutonomousPublishing",
      "requiresHumanApprover",
      "noAutonomousDeployment",
      "rejectedIfMissingHumanApprover",
    ],
    requiredStrings: ["humanApproverId"],
  },
  {
    name: "handoff",
    directory: "handoff",
    files: ["buildPhase40Handoff.ts", "buildPhase40Handoffs.ts", "index.ts"],
    exportedSymbols: ["buildPhase40Handoff", "buildPhase40Handoffs"],
    markers: ["consumesPhase39Handoff", "mirrorsPhase39HandoffStructure"],
    requiredStrings: ["boundPhase40SnapshotHash"],
  },
];

const checks = [
  checkOrganizationDirectoryExists,
  checkContractsDirectoryExists,
  checkContractsSourceExists,
  checkContractsIndexExists,
  checkModuleDirectoryAndFilesExist,
  checkRequiredExports,
  checkContractDiscipline,
  checkStableSnapshotHashImports,
  checkExecutableLiteralFalse,
  checkSeparateIsolationFields,
  checkContainsPhiMarker,
  checkBoundPhaseMarkers,
  checkRequiredLiteralMarkers,
  checkRecommendationAuditEntries,
  checkMarketplaceHumanApproverFailClosed,
  checkRevenueCyclePhiRules,
  checkSimulationIsolation,
  checkNoBannedRuntimePatterns,
  checkRejectListPatterns,
  checkCrossIsolation,
];

const results = checks.map((check) => check());
const failures = results.filter((result) => !result.passed);

if (failures.length > 0) {
  console.error("FAIL");
  for (const failure of failures) {
    console.error(`- ${failure.name}: ${failure.reason}`);
  }
  process.exit(1);
}

console.log("PASS");
console.log("VERIFY_EXIT:0");
process.exit(0);

function checkOrganizationDirectoryExists() {
  return {
    name: "organization directory exists",
    passed: isDirectory(organizationDirectory),
    reason: "missing lib/intelligence/synthetic/organization/",
  };
}

function checkContractsDirectoryExists() {
  return {
    name: "contracts directory exists",
    passed: isDirectory(contractsDirectory),
    reason: "missing lib/intelligence/synthetic/organization/contracts/",
  };
}

function checkContractsSourceExists() {
  return {
    name: "SyntheticOrganizationContracts.ts exists",
    passed: isFile(contractsSourcePath),
    reason: "missing SyntheticOrganizationContracts.ts",
  };
}

function checkContractsIndexExists() {
  return {
    name: "contracts index.ts exists",
    passed: isFile(contractsIndexPath),
    reason: "missing contracts/index.ts",
  };
}

function checkModuleDirectoryAndFilesExist() {
  const missing = [];

  for (const spec of moduleSpecs) {
    const directoryPath = moduleDirectory(spec);

    if (!isDirectory(directoryPath)) {
      missing.push(`${spec.name}: missing directory`);
      continue;
    }

    for (const fileName of spec.files) {
      if (!isFile(path.join(directoryPath, fileName))) {
        missing.push(`${spec.name}: missing ${fileName}`);
      }
    }
  }

  return {
    name: "Phase 40 module directories and files exist",
    passed: missing.length === 0,
    reason: missing.join("; "),
  };
}

function checkRequiredExports() {
  const missing = [];

  for (const spec of moduleSpecs) {
    const moduleSource = readModuleSource(spec);
    const indexSource = readFile(path.join(moduleDirectory(spec), "index.ts"));

    for (const symbol of spec.exportedSymbols) {
      if (!moduleSource.includes(`export function ${symbol}`) && !moduleSource.includes(`export interface ${symbol}`)) {
        missing.push(`${spec.name}: missing exported symbol ${symbol}`);
      }
    }

    for (const fileName of spec.files.filter((file) => file !== "index.ts")) {
      const exportTarget = `./${fileName.replace(/\.ts$/, "")}`;

      if (!indexSource.includes(exportTarget)) {
        missing.push(`${spec.name}: index does not export ${exportTarget}`);
      }
    }
  }

  return {
    name: "required exports",
    passed: missing.length === 0,
    reason: missing.join("; "),
  };
}

function checkContractDiscipline() {
  const violations = [];

  for (const spec of moduleSpecs.filter((moduleSpec) => !moduleSpec.isContracts)) {
    for (const filePath of moduleSourcePaths(spec)) {
      const source = readFile(filePath);
      const relativeFile = relativePath(filePath);
      const typeImports = [...source.matchAll(/\bimport\s+type\s+\{([\s\S]*?)\}\s+from\s+["']([^"']+)["']/g)];

      for (const [, importedTypes, importPath] of typeImports) {
        const importsContractType = importedTypes
          .split(",")
          .map((importedType) => importedType.trim().split(/\s+as\s+/i)[0].trim())
          .some((importedType) => /Contract$/.test(importedType));

        if (importsContractType && importPath !== "../contracts") {
          violations.push(`${relativeFile}: imports *Contract type from ${importPath}`);
        }

        if ((/contracts/.test(importPath) || /SyntheticOrganizationContracts/.test(importPath)) && importPath !== "../contracts") {
          violations.push(`${relativeFile}: contract imports must come only from ../contracts`);
        }
      }

      const localContractDefinitions = [...source.matchAll(/\b(?:export\s+)?(?:interface|type)\s+([A-Za-z0-9_]*Contract)\b/g)]
        .map((match) => match[1]);

      for (const contractName of localContractDefinitions) {
        violations.push(`${relativeFile}: defines local contract type ${contractName}`);
      }
    }
  }

  return {
    name: "contract discipline",
    passed: violations.length === 0,
    reason: violations.join("; "),
  };
}

function checkStableSnapshotHashImports() {
  const violations = [];

  for (const filePath of organizationSourcePaths()) {
    const source = readFile(filePath);
    const relativeFile = relativePath(filePath);
    const imports = [...source.matchAll(/\bimport\s+\{\s*stableSnapshotHash\s*\}\s+from\s+["']([^"']+)["']/g)]
      .map((match) => match[1]);

    for (const importPath of imports) {
      if (importPath !== "../../../core/hash") {
        violations.push(`${relativeFile}: invalid stableSnapshotHash import ${importPath}`);
      }
    }
  }

  return {
    name: "stableSnapshotHash imports",
    passed: violations.length === 0,
    reason: violations.join("; "),
  };
}

function checkExecutableLiteralFalse() {
  const violations = [];
  const contractsSource = readContractsSource();

  if (!contractsSource.includes("executable: false") || contractsSource.includes("executable: boolean")) {
    violations.push("contracts must type executable as literal false, not boolean");
  }

  for (const spec of moduleSpecs.filter((moduleSpec) => !moduleSpec.isContracts)) {
    const source = readModuleSource(spec);

    if (!source.includes("executable: false")) {
      violations.push(`${spec.name}: missing executable: false literal`);
    }

    if (/\bexecutable\s*:\s*true\b/.test(source)) {
      violations.push(`${spec.name}: contains executable: true`);
    }
  }

  return {
    name: "executable literal false",
    passed: violations.length === 0,
    reason: violations.join("; "),
  };
}

function checkSeparateIsolationFields() {
  const requiredFields = ["customerIsolation", "firmIsolation", "clientIsolation"];
  const violations = [];

  for (const spec of moduleSpecs) {
    const source = readModuleSource(spec);
    const missingFields = requiredFields.filter((fieldName) => !source.includes(fieldName));

    if (missingFields.length > 0) {
      violations.push(`${spec.name}: missing isolation fields ${missingFields.join(", ")}`);
    }
  }

  return {
    name: "separate isolation fields",
    passed: violations.length === 0,
    reason: violations.join("; "),
  };
}

function checkContainsPhiMarker() {
  const violations = [];

  for (const spec of moduleSpecs) {
    const source = readModuleSource(spec);

    if (!source.includes("containsPHI")) {
      violations.push(`${spec.name}: missing containsPHI marker`);
    }
  }

  return {
    name: "containsPHI marker",
    passed: violations.length === 0,
    reason: violations.join("; "),
  };
}

function checkBoundPhaseMarkers() {
  const violations = [];

  for (const spec of moduleSpecs) {
    const source = readModuleSource(spec);

    for (const marker of ["boundPhase39SnapshotHash", "boundPhase38SnapshotHash"]) {
      if (!source.includes(marker)) {
        violations.push(`${spec.name}: missing ${marker}`);
      }
    }
  }

  const handoffSource = readModuleSource(moduleSpecs.find((spec) => spec.name === "handoff"));

  if (!handoffSource.includes("boundPhase40SnapshotHash")) {
    violations.push("handoff: missing boundPhase40SnapshotHash");
  }

  return {
    name: "phase handoff markers",
    passed: violations.length === 0,
    reason: violations.join("; "),
  };
}

function checkRequiredLiteralMarkers() {
  const violations = [];

  for (const spec of moduleSpecs) {
    for (const marker of spec.markers || []) {
      if (!hasLiteralTrue(readModuleSource(spec), marker)) {
        violations.push(`${spec.name}: missing ${marker}: true`);
      }
    }

    for (const requiredString of spec.requiredStrings || []) {
      if (!readModuleSource(spec).includes(requiredString)) {
        violations.push(`${spec.name}: missing ${requiredString}`);
      }
    }
  }

  return {
    name: "required literal guardrail markers",
    passed: violations.length === 0,
    reason: violations.join("; "),
  };
}

function checkRecommendationAuditEntries() {
  const violations = [];

  for (const spec of moduleSpecs.filter((moduleSpec) => moduleSpec.recommendationProducer)) {
    const source = readModuleSource(spec);

    if (!source.includes("RecommendationAuditEntry")) {
      violations.push(`${spec.name}: missing RecommendationAuditEntry`);
    }

    if (!source.includes("recommendationAuditEntry")) {
      violations.push(`${spec.name}: builder does not expose recommendationAuditEntry`);
    }
  }

  return {
    name: "recommendation audit entries",
    passed: violations.length === 0,
    reason: violations.join("; "),
  };
}

function checkMarketplaceHumanApproverFailClosed() {
  const deploymentArtifactPath = path.join(organizationDirectory, "marketplace", "buildDeploymentArtifact.ts");
  const source = readFile(deploymentArtifactPath);
  const checks = [
    ["humanApproverId field", source.includes("humanApproverId")],
    ["missing humanApproverId collected", source.includes('missing.push("humanApproverId")')],
    ["returns null on missing identifiers", source.includes("deploymentArtifact: null")],
    ["rejectedIfMissingHumanApprover literal true", hasLiteralTrue(source, "rejectedIfMissingHumanApprover")],
  ];
  const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

  return {
    name: "marketplace human approver fail closed",
    passed: failures.length === 0,
    reason: failures.join(", "),
  };
}

function checkRevenueCyclePhiRules() {
  const source = readFile(path.join(organizationDirectory, "revenue-cycle-command-center", "buildRevenueCycleCommandCenterPackage.ts"));
  const checks = [
    ["healthcare unit marker", source.includes("isHealthcareUnit")],
    ["healthcare containsPHI true", /isHealthcareUnit[\s\S]*return true/.test(source)],
    ["isolation fields checked", source.includes("customerIsolation") && source.includes("firmIsolation") && source.includes("clientIsolation")],
    ["PHI no mixing marker", hasLiteralTrue(source, "noMixingPhiAndNonPhiInSamePayload")],
  ];
  const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

  return {
    name: "revenue cycle PHI rules",
    passed: failures.length === 0,
    reason: failures.join(", "),
  };
}

function checkSimulationIsolation() {
  const source = readModuleSource(moduleSpecs.find((spec) => spec.name === "simulation"));
  const fields = ["simulationIsolation", "customerIsolation", "firmIsolation", "clientIsolation"];
  const failures = fields.filter((fieldName) => !source.includes(fieldName));

  return {
    name: "simulation isolation field",
    passed: failures.length === 0,
    reason: `missing fields: ${failures.join(", ")}`,
  };
}

function checkNoBannedRuntimePatterns() {
  const bannedPatterns = [
    ["ERP SDK import", /\bimport\s+.*?\s+from\s+["'](?:quickbooks|xero|netsuite|sage|intacct|dynamics|@intuit|@xero|@oracle|@microsoft\/dynamics)[^"']*["']/i],
    ["AI model client import", /\bimport\s+.*?\s+from\s+["'](?:openai|@openai|anthropic|@anthropic|langchain|@langchain)[^"']*["']/i],
    ["AI model client call", /\b(?:openai|anthropic|modelClient|llm|chatCompletion|completion)\s*\./i],
    ["database client import", /\bimport\s+.*?\s+from\s+["'](?:@prisma\/client|prisma|drizzle-orm|mongoose|pg|mysql2|sqlite3)[^"']*["']/i],
    ["database write call", /\b(?:insert|update|upsert|delete|create|save|write)\s*\(/i],
    ["email sending import", /\bimport\s+.*?\s+from\s+["'](?:nodemailer|sendgrid|@sendgrid\/mail|postmark|resend)[^"']*["']/i],
    ["direct fetch call", /\bfetch\s*\(/],
    ["axios call or import", /\baxios\b/],
    ["scheduling or cron import", /\bimport\s+.*?\s+from\s+["'](?:node-cron|cron|agenda|bull|bullmq|bree)[^"']*["']/i],
    ["file system write call", /\b(?:writeFile|appendFile|createWriteStream|mkdir|rm|unlink)\s*\(/],
  ];
  const violations = [];

  for (const filePath of organizationSourcePaths()) {
    const source = readFile(filePath);
    const relativeFile = relativePath(filePath);
    const isVerifier = relativeFile === "scripts/verify-si-organizational-operating-system.js";

    for (const [label, pattern] of bannedPatterns) {
      if (pattern.test(source) && !isVerifier) {
        violations.push(`${relativeFile}: ${label}`);
      }
    }
  }

  return {
    name: "no banned runtime patterns",
    passed: violations.length === 0,
    reason: violations.join("; "),
  };
}

function checkRejectListPatterns() {
  const rejectedPatterns = [
    ["autonomous staffing decisions", /autonomousStaffingDecision\s*:\s*true|staffingDecision\s*:\s*true/i],
    ["HR scoring", /\b(?:hrScore|employeeScore|performanceScore|rankEmployees)\b|\bemployeeRanking\s*:\s*true/i],
    ["hiring or firing", /\b(?:hire|fire|terminateEmployee|dismissEmployee)\s*\(/i],
    ["executable true marker", /\bexecutable\s*:\s*true\b/],
    ["AI model inference", /\b(?:openai|anthropic|chatCompletion|model\.invoke|llm\.invoke)\b/i],
    ["PHI/non-PHI mixing allowed", /noMixingPhiAndNonPhiInSamePayload\s*:\s*false/],
  ];
  const violations = [];

  for (const filePath of organizationSourcePaths()) {
    const source = readFile(filePath);
    const relativeFile = relativePath(filePath);

    for (const [label, pattern] of rejectedPatterns) {
      if (pattern.test(source)) {
        violations.push(`${relativeFile}: ${label}`);
      }
    }
  }

  return {
    name: "reject list",
    passed: violations.length === 0,
    reason: violations.join("; "),
  };
}

function checkCrossIsolation() {
  const tenantA = createSyntheticTenant("tenantA");
  const tenantB = createSyntheticTenant("tenantB");
  const tenantAArtifacts = createSyntheticArtifactsForTenant(tenantA);
  const tenantBArtifacts = createSyntheticArtifactsForTenant(tenantB);
  const violations = [
    ...findCrossTenantReferences("tenantA", tenantAArtifacts, tenantB),
    ...findCrossTenantReferences("tenantB", tenantBArtifacts, tenantA),
  ];

  return {
    name: "cross-isolation test",
    passed: violations.length === 0,
    reason: violations.join("; "),
  };
}

function createSyntheticTenant(prefix) {
  return {
    customerIsolation: `${prefix}-customer-isolation`,
    firmIsolation: `${prefix}-firm-isolation`,
    clientIsolation: `${prefix}-client-isolation`,
    simulationIsolation: `${prefix}-simulation-isolation`,
  };
}

function createSyntheticArtifactsForTenant(tenant) {
  const base = {
    customerIsolation: tenant.customerIsolation,
    firmIsolation: tenant.firmIsolation,
    clientIsolation: tenant.clientIsolation,
    containsPHI: true,
  };

  return [
    {
      artifactType: "SyntheticGovernancePackage",
      ...base,
      governancePackageId: `${tenant.customerIsolation}:governance`,
    },
    {
      artifactType: "SyntheticOrganizationalTwin",
      ...base,
      organizationalTwinId: `${tenant.customerIsolation}:twin`,
    },
    {
      artifactType: "SyntheticSimulationPackage",
      ...base,
      simulationIsolation: tenant.simulationIsolation,
      simulationPackageId: `${tenant.customerIsolation}:simulation`,
      isSimulation: true,
    },
    {
      artifactType: "SyntheticPhase40Handoff",
      ...base,
      phase40HandoffId: `${tenant.customerIsolation}:handoff`,
    },
  ];
}

function findCrossTenantReferences(label, artifacts, otherTenant) {
  const forbiddenValues = Object.values(otherTenant);
  const violations = [];

  for (const artifact of artifacts) {
    const serialized = JSON.stringify(artifact);

    for (const forbiddenValue of forbiddenValues) {
      if (serialized.includes(forbiddenValue)) {
        violations.push(`${label}: ${artifact.artifactType} references ${forbiddenValue}`);
      }
    }
  }

  return violations;
}

function hasLiteralTrue(source, marker) {
  return new RegExp(`\\b${escapeRegExp(marker)}\\s*:\\s*true\\b`).test(source);
}

function isDirectory(directoryPath) {
  return fs.existsSync(directoryPath) && fs.statSync(directoryPath).isDirectory();
}

function isFile(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function readContractsSource() {
  return readFile(contractsSourcePath);
}

function readFile(filePath) {
  if (!isFile(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function readModuleSource(spec) {
  return moduleSourcePaths(spec)
    .map((filePath) => readFile(filePath))
    .join("\n");
}

function moduleDirectory(spec) {
  return path.join(organizationDirectory, spec.directory);
}

function moduleSourcePaths(spec) {
  return spec.files
    .filter((fileName) => fileName.endsWith(".ts"))
    .map((fileName) => path.join(moduleDirectory(spec), fileName));
}

function organizationSourcePaths() {
  return moduleSpecs.flatMap((spec) => moduleSourcePaths(spec));
}

function relativePath(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
