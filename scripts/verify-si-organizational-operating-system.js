const fs = require("fs");
const Module = require("module");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const organizationDirectory = path.join(root, "lib", "intelligence", "synthetic", "organization");
const contractsDirectory = path.join(organizationDirectory, "contracts");
const contractsSourcePath = path.join(contractsDirectory, "SyntheticOrganizationContracts.ts");
const contractsIndexPath = path.join(contractsDirectory, "index.ts");

const aarVerifierState = {
  typeScriptLoaderRegistered: false,
  authorityEvaluationModule: null,
  authorityTierConfigModule: null,
  tierWideningGateModule: null,
  tierWideningTicketModule: null,
  authorityRoutingModule: null,
  adviseToDeployModule: null,
  deploymentIndexModule: null,
};

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
  checkAdHocAuthorityRoutingPoisonCases,
];

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

/**
 * POISON-CASE DISCIPLINE (40V Ad-Hoc Authority Routing extension):
 * Cases PC-AAR-01..PC-AAR-19 may only be ADDED, never swapped or removed.
 * Bright-line cases (1-5) and fail-closed cases (6-10) are highest-priority and must
 * never be weakened by a future edit.
 */
function checkAdHocAuthorityRoutingPoisonCases() {
  const poisonCaseResults = runAdHocAuthorityRoutingPoisonCases();
  const failures = poisonCaseResults.filter((result) => !result.passed);

  for (const result of poisonCaseResults) {
    console.log(`${result.id} | ${result.passed ? "PASS" : "FAIL"} | ${result.name}`);
    if (!result.passed) {
      console.error(`  reason: ${result.reason}`);
    }
  }

  return {
    name: "ad-hoc authority routing poison cases (40V extension)",
    passed: failures.length === 0,
    reason: failures.map((failure) => `${failure.id}: ${failure.reason}`).join("; "),
  };
}

const AAR_COMPANY_ID = "company-aar-verify";
const AAR_SCOPE = {
  companyId: AAR_COMPANY_ID,
  customerIsolationRequired: true,
  firmIsolationRequired: true,
  clientIsolationRequired: true,
  isolationBoundaryIds: ["boundary-aar"],
};
const AAR_ISOLATION = {
  customerIsolation: { required: true, referenceIds: [AAR_COMPANY_ID] },
  firmIsolation: { required: true, referenceIds: ["firm-aar"] },
  clientIsolation: { required: true, referenceIds: ["client-aar"] },
};
const AAR_HANDOFF_FIXTURE = {
  phase39RoleHandoffHandle: "handoff-aar-verify",
  boundPhase39SnapshotHash: "bound-phase39-aar",
  boundPhase38SnapshotHash: "bound-phase38-aar",
  scope: AAR_SCOPE,
  customerIsolation: AAR_ISOLATION.customerIsolation,
  firmIsolation: AAR_ISOLATION.firmIsolation,
  clientIsolation: AAR_ISOLATION.clientIsolation,
  phase39RoleInstanceReferenceIds: [],
  warnings: [],
};

function ensureTypeScriptLoader() {
  if (aarVerifierState.typeScriptLoaderRegistered) {
    return;
  }

  require.extensions[".ts"] = function loadTypeScript(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      fileName: filename,
    });
    module._compile(output.outputText, filename);
  };

  aarVerifierState.typeScriptLoaderRegistered = true;
}

function loadAuthorityEvaluationModule() {
  if (!aarVerifierState.authorityEvaluationModule) {
    ensureTypeScriptLoader();
    aarVerifierState.authorityEvaluationModule = require(path.join(
      organizationDirectory,
      "work-allocation",
      "authority-evaluation",
      "index.ts",
    ));
  }
  return aarVerifierState.authorityEvaluationModule;
}

function loadAuthorityTierConfigModule() {
  if (!aarVerifierState.authorityTierConfigModule) {
    ensureTypeScriptLoader();
    aarVerifierState.authorityTierConfigModule = require(path.join(
      organizationDirectory,
      "work-allocation",
      "authority-tier-config",
      "index.ts",
    ));
  }
  return aarVerifierState.authorityTierConfigModule;
}

function loadTierWideningGateModule() {
  if (!aarVerifierState.tierWideningGateModule) {
    ensureTypeScriptLoader();
    aarVerifierState.tierWideningGateModule = require(path.join(
      organizationDirectory,
      "work-allocation",
      "tier-widening-gate",
      "index.ts",
    ));
  }
  return aarVerifierState.tierWideningGateModule;
}

function loadTierWideningTicketModule() {
  if (!aarVerifierState.tierWideningTicketModule) {
    ensureTypeScriptLoader();
    aarVerifierState.tierWideningTicketModule = require(path.join(
      organizationDirectory,
      "work-allocation",
      "tier-widening-ticket",
      "index.ts",
    ));
  }
  return aarVerifierState.tierWideningTicketModule;
}

function loadAuthorityRoutingModule() {
  if (!aarVerifierState.authorityRoutingModule) {
    ensureTypeScriptLoader();
    aarVerifierState.authorityRoutingModule = require(path.join(
      organizationDirectory,
      "work-allocation",
      "authority-routing",
      "index.ts",
    ));
  }
  return aarVerifierState.authorityRoutingModule;
}

function loadAdviseToDeployModule() {
  if (!aarVerifierState.adviseToDeployModule) {
    ensureTypeScriptLoader();
    aarVerifierState.adviseToDeployModule = require(path.join(
      organizationDirectory,
      "work-allocation",
      "advise-to-deploy",
      "index.ts",
    ));
  }
  return aarVerifierState.adviseToDeployModule;
}

function loadDeploymentIndexModule() {
  if (!aarVerifierState.deploymentIndexModule) {
    ensureTypeScriptLoader();
    aarVerifierState.deploymentIndexModule = require(path.join(
      organizationDirectory,
      "workforce-registry",
      "deployment-index",
      "index.ts",
    ));
  }
  return aarVerifierState.deploymentIndexModule;
}

function hasAarValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function mockRoleRestriction(overrides = {}) {
  return {
    restrictionId: "restriction-staff-aar",
    roleType: "staff_accountant",
    allowedTaskFamilies: ["journal_entries"],
    forbiddenTaskFamilies: ["review_and_approval"],
    escalationTargetRoleType: "senior_accountant",
    ...overrides,
  };
}

function mockRoleCapability(reviewLevel, overrides = {}) {
  return {
    capabilityId: "capability-aar",
    taskFamily: "journal_entries",
    reviewLevel,
    roleApplicability: ["staff_accountant"],
    ...overrides,
  };
}

function buildEvaluatorInput(overrides = {}) {
  return {
    roleType: "staff_accountant",
    roleInstanceId: "role-instance-staff-aar",
    taskFamily: "journal_entries",
    fraudStatus: "not_run",
    reasonablenessStatus: "not_run",
    roleRestriction: mockRoleRestriction(),
    roleCapability: mockRoleCapability("senior"),
    ...AAR_HANDOFF_FIXTURE,
    ...overrides,
  };
}

function mockAuthorityEvaluationResult(overrides = {}) {
  return {
    ...AAR_HANDOFF_FIXTURE,
    authorityEvaluationResultId: "authority-eval-aar",
    authorityEvaluationResultKey: "authority-eval-key-aar",
    authorityOutcome: "in_lane",
    escalationTargetRoleType: "",
    restrictionCheckResult: true,
    capabilityMatch: true,
    approvalRoutingTargetRoleType: "",
    executable: false,
    executionReady: false,
    containsPHI: true,
    derivationLineageIds: [],
    derivationMethod: "handoff_metadata_preservation",
    derivationHash: "derivation-aar",
    confidenceFloorMetadata: [],
    sourceConfidenceReferenceIds: [],
    evidenceReferenceIds: [],
    lineageReferenceIds: [],
    trustMetadata: [],
    confidenceMetadata: [],
    governanceMetadata: [],
    skippedIndexes: [],
    ...overrides,
  };
}

function mockTierWideningRequest(overrides = {}) {
  return {
    ...AAR_HANDOFF_FIXTURE,
    tierWideningRequestId: "tier-widening-request-aar",
    tierWideningRequestKey: "tier-widening-request-key-aar",
    companyId: AAR_COMPANY_ID,
    roleType: "staff_accountant",
    currentMaxReviewLevel: "senior",
    requestedMaxReviewLevel: "controller",
    requestReason: "verify widening",
    executable: false,
    executionReady: false,
    containsPHI: true,
    derivationLineageIds: [],
    derivationMethod: "handoff_metadata_preservation",
    derivationHash: "derivation-aar",
    confidenceFloorMetadata: [],
    sourceConfidenceReferenceIds: [],
    evidenceReferenceIds: [],
    lineageReferenceIds: [],
    trustMetadata: [],
    confidenceMetadata: [],
    governanceMetadata: [],
    skippedIndexes: [],
    ...overrides,
  };
}

function mockTierWideningGateResult(overrides = {}) {
  return {
    ...AAR_HANDOFF_FIXTURE,
    tierWideningGateResultId: "tier-widening-gate-aar",
    tierWideningGateResultKey: "tier-widening-gate-key-aar",
    tierWideningRequestId: "tier-widening-request-aar",
    gateOutcome: "requires_ticket",
    gateReason: "widening_at_or_above_controller_tier",
    executable: false,
    executionReady: false,
    containsPHI: true,
    derivationLineageIds: [],
    derivationMethod: "handoff_metadata_preservation",
    derivationHash: "derivation-aar",
    confidenceFloorMetadata: [],
    sourceConfidenceReferenceIds: [],
    evidenceReferenceIds: [],
    lineageReferenceIds: [],
    trustMetadata: [],
    confidenceMetadata: [],
    governanceMetadata: [],
    skippedIndexes: [],
    ...overrides,
  };
}

function mockAuthorityRoutingPackage(overrides = {}) {
  return {
    ...AAR_HANDOFF_FIXTURE,
    authorityRoutingPackageId: "routing-package-aar",
    authorityRoutingPackageKey: "routing-package-key-aar",
    routingOutcome: "advise_to_deploy_required",
    sourceQueueRef: "queue-staff-aar",
    targetQueueRef: "",
    handoffRefs: [],
    escalationTargetRoleType: "senior_accountant",
    executable: false,
    executionReady: false,
    containsPHI: true,
    derivationLineageIds: [],
    derivationMethod: "handoff_metadata_preservation",
    derivationHash: "derivation-aar",
    confidenceFloorMetadata: [],
    sourceConfidenceReferenceIds: [],
    evidenceReferenceIds: [],
    lineageReferenceIds: [],
    trustMetadata: [],
    confidenceMetadata: [],
    governanceMetadata: [],
    skippedIndexes: [],
    ...overrides,
  };
}

function buildDeployedSeniorRecord(taskQueueReferenceId = "queue-senior-aar") {
  const { buildCustomerRoleDeploymentRecord } = loadDeploymentIndexModule();
  const result = buildCustomerRoleDeploymentRecord({
    ...AAR_HANDOFF_FIXTURE,
    companyId: AAR_COMPANY_ID,
    roleType: "senior_accountant",
    deploymentStatus: "deployed",
    roleInstanceId: "role-instance-senior-aar",
    roleActivationReferenceId: "activation-senior-aar",
    workforceMemberReferenceId: "workforce-senior-aar",
    taskQueueReferenceId,
    deploymentResolvedAt: "2026-06-18T00:00:00.000Z",
  });

  if (!result.customerRoleDeploymentRecord) {
    throw new Error("failed to build deployed senior deployment record fixture");
  }

  return result.customerRoleDeploymentRecord;
}

function runAdHocAuthorityRoutingPoisonCases() {
  const { classifyAuthority } = loadAuthorityEvaluationModule();
  const { DEFAULT_ROLE_AUTHORITY_TIER_MAX_REVIEW_LEVEL_BY_ROLE_TYPE } = loadAuthorityTierConfigModule();
  const { classifyTierWideningGate, buildTierWideningGateResult } = loadTierWideningGateModule();
  const { buildTierWideningReviewTicket } = loadTierWideningTicketModule();
  const { classifyAuthorityRouting, buildAuthorityRoutingPackage } = loadAuthorityRoutingModule();
  const { buildAdviseToDeployNotification } = loadAdviseToDeployModule();
  const { resolveRoleDeployment, buildCustomerRoleDeploymentRecord } = loadDeploymentIndexModule();
  const roleCapabilitySource = readFile(
    path.join(root, "lib", "intelligence", "synthetic", "roles", "role-capability", "buildRoleCapability.ts"),
  );
  const routingSource = readFile(
    path.join(organizationDirectory, "work-allocation", "authority-routing", "buildAuthorityRoutingPackage.ts"),
  );

  const deployedSeniorRecord = buildDeployedSeniorRecord();

  return [
    {
      id: "PC-AAR-01",
      name: "evaluator fraud flagged => requires_human human_controller regardless of tier",
      passed:
        classifyAuthority({ ...buildEvaluatorInput(), fraudStatus: "flagged", roleCapability: mockRoleCapability("manager") })
          .authorityOutcome === "requires_human" &&
        classifyAuthority({ ...buildEvaluatorInput(), fraudStatus: "flagged" }).escalationTargetRoleType === "human_controller",
      reason: "fraud flagged must force requires_human -> human_controller",
    },
    {
      id: "PC-AAR-02",
      name: "evaluator reasonableness flagged => requires_human human_controller",
      passed:
        classifyAuthority({ ...buildEvaluatorInput(), reasonablenessStatus: "flagged" }).authorityOutcome === "requires_human" &&
        classifyAuthority({ ...buildEvaluatorInput(), reasonablenessStatus: "flagged" }).escalationTargetRoleType ===
          "human_controller",
      reason: "reasonableness flagged must force requires_human -> human_controller",
    },
    {
      id: "PC-AAR-03",
      name: "orchestrator requires_human => human_escalation regardless of deployment",
      passed: (() => {
        const routing = classifyAuthorityRouting({
          authorityEvaluationResult: mockAuthorityEvaluationResult({
            authorityOutcome: "requires_human",
            escalationTargetRoleType: "human_controller",
          }),
          sourceQueueRef: "queue-staff-aar",
          companyId: AAR_COMPANY_ID,
          customerRoleDeploymentRecord: deployedSeniorRecord,
          deploymentScope: {
            companyId: AAR_COMPANY_ID,
            ...AAR_ISOLATION,
            scope: AAR_SCOPE,
          },
        });
        return routing.routingOutcome === "human_escalation" && routing.escalationTargetRoleType === "human_controller";
      })(),
      reason: "requires_human must route human_escalation even when target role is deployed",
    },
    {
      id: "PC-AAR-04",
      name: "advise-to-deploy never emits on human_escalation routing",
      passed: (() => {
        const result = buildAdviseToDeployNotification({
          authorityRoutingPackage: mockAuthorityRoutingPackage({
            routingOutcome: "human_escalation",
            escalationTargetRoleType: "human_controller",
          }),
          triggeringTaskRef: "task-aar-fraud",
        });
        return result.adviseToDeployNotification === null && result.skipped === true;
      })(),
      reason: "human_escalation routing must not produce advise-to-deploy notification",
    },
    {
      id: "PC-AAR-05",
      name: "tier config excludes human_controller as representable maxReviewLevel",
      passed:
        !Object.values(DEFAULT_ROLE_AUTHORITY_TIER_MAX_REVIEW_LEVEL_BY_ROLE_TYPE).includes("human_controller") &&
        /export type SyntheticRoleCapabilityReviewLevel[\s\S]*?\| "human_required"/.test(roleCapabilitySource) &&
        !/"human_controller"/.test(
          roleCapabilitySource.slice(
            roleCapabilitySource.indexOf("export type SyntheticRoleCapabilityReviewLevel"),
            roleCapabilitySource.indexOf("export type SyntheticRoleCapabilityMaterialitySensitivity"),
          ),
        ),
      reason: "human_controller must not appear in default tier map or review-level union",
    },
    {
      id: "PC-AAR-06",
      name: "evaluator missing/ambiguous inputs => forbidden or requires_human, never in_lane",
      passed: (() => {
        const missingTaskFamily = classifyAuthority({
          ...buildEvaluatorInput(),
          taskFamily: "",
        }).authorityOutcome;
        const missingRestriction = classifyAuthority({
          ...buildEvaluatorInput(),
          roleRestriction: null,
        }).authorityOutcome;
        const capabilityMismatch = classifyAuthority({
          ...buildEvaluatorInput(),
          roleCapability: mockRoleCapability("senior", { taskFamily: "reconciliations" }),
        }).authorityOutcome;
        const outcomes = [missingTaskFamily, missingRestriction, capabilityMismatch];
        return outcomes.every((outcome) => outcome === "forbidden" || outcome === "requires_human") &&
          !outcomes.includes("in_lane");
      })(),
      reason: "missing taskFamily, restriction, or capability mismatch must not classify in_lane",
    },
    {
      id: "PC-AAR-07",
      name: "orchestrator above_authority missing target => held_in_source not routed_to_target",
      passed: (() => {
        const routing = classifyAuthorityRouting({
          authorityEvaluationResult: mockAuthorityEvaluationResult({
            authorityOutcome: "above_authority",
            escalationTargetRoleType: "",
          }),
          sourceQueueRef: "queue-staff-aar",
          companyId: AAR_COMPANY_ID,
          deploymentScope: {
            companyId: AAR_COMPANY_ID,
            ...AAR_ISOLATION,
            scope: AAR_SCOPE,
          },
        });
        return routing.routingOutcome === "held_in_source" && routing.routingOutcome !== "routed_to_target";
      })(),
      reason: "missing escalation target must fail-closed to held_in_source",
    },
    {
      id: "PC-AAR-08",
      name: "orchestrator ambiguous deployment => held_in_source not routed_to_target",
      passed: (() => {
        const emptyQueueRouting = classifyAuthorityRouting({
          authorityEvaluationResult: mockAuthorityEvaluationResult({
            authorityOutcome: "above_authority",
            escalationTargetRoleType: "senior_accountant",
          }),
          sourceQueueRef: "queue-staff-aar",
          companyId: AAR_COMPANY_ID,
          customerRoleDeploymentRecord: buildDeployedSeniorRecord(""),
          deploymentScope: {
            companyId: AAR_COMPANY_ID,
            ...AAR_ISOLATION,
            scope: AAR_SCOPE,
          },
        });
        const hasAmbiguousBranch = routingSource.includes('failClosedHold(sourceQueueRef, "ambiguous_deployment_status")');
        return emptyQueueRouting.routingOutcome === "held_in_source" && hasAmbiguousBranch;
      })(),
      reason: "ambiguous deployment must fail-closed to held_in_source",
    },
    {
      id: "PC-AAR-09",
      name: "widening gate malformed/missing requested level => requires_ticket never auto_allowed",
      passed: (() => {
        const missingRequested = classifyTierWideningGate({
          companyId: AAR_COMPANY_ID,
          roleType: "staff_accountant",
          currentMaxReviewLevel: "senior",
          requestReason: "verify",
        });
        return missingRequested.gateOutcome === "requires_ticket" && missingRequested.gateOutcome !== "auto_allowed";
      })(),
      reason: "missing requestedMaxReviewLevel must require ticket",
    },
    {
      id: "PC-AAR-10",
      name: "ticket and advise-to-deploy skip on non-required outcomes",
      passed: (() => {
        const ticket = buildTierWideningReviewTicket({
          tierWideningGateResult: mockTierWideningGateResult({ gateOutcome: "auto_allowed", gateReason: "adjacent_widening_below_controller" }),
          tierWideningRequest: mockTierWideningRequest(),
        });
        const advise = buildAdviseToDeployNotification({
          authorityRoutingPackage: mockAuthorityRoutingPackage({ routingOutcome: "routed_to_target", targetQueueRef: "queue-senior-aar" }),
          triggeringTaskRef: "task-aar",
        });
        return ticket.tierWideningReviewTicket === null && ticket.skipped === true && advise.adviseToDeployNotification === null &&
          advise.skipped === true;
      })(),
      reason: "non-requires_ticket gate and non-advise_to_deploy_required routing must skip artifact creation",
    },
    {
      id: "PC-AAR-11",
      name: "widening gate adjacent below controller => auto_allowed",
      passed:
        classifyTierWideningGate({
          companyId: AAR_COMPANY_ID,
          roleType: "staff_accountant",
          currentMaxReviewLevel: "senior",
          requestedMaxReviewLevel: "manager",
          requestReason: "verify adjacent widening",
        }).gateOutcome === "auto_allowed",
      reason: "senior -> manager must auto_allow",
    },
    {
      id: "PC-AAR-12",
      name: "widening gate controller-or-above => requires_ticket",
      passed:
        classifyTierWideningGate({
          companyId: AAR_COMPANY_ID,
          roleType: "staff_accountant",
          currentMaxReviewLevel: "senior",
          requestedMaxReviewLevel: "controller",
          requestReason: "verify controller widening",
        }).gateOutcome === "requires_ticket",
      reason: "requested controller tier must require ticket",
    },
    {
      id: "PC-AAR-13",
      name: "widening gate jump > 1 tier => requires_ticket",
      passed:
        classifyTierWideningGate({
          companyId: AAR_COMPANY_ID,
          roleType: "staff_accountant",
          currentMaxReviewLevel: "senior",
          requestedMaxReviewLevel: "partner",
          requestReason: "verify multi-tier jump",
        }).gateOutcome === "requires_ticket",
      reason: "jump greater than one tier must require ticket",
    },
    {
      id: "PC-AAR-14",
      name: "in_lane => routed_to_source",
      passed:
        classifyAuthorityRouting({
          authorityEvaluationResult: mockAuthorityEvaluationResult({ authorityOutcome: "in_lane" }),
          sourceQueueRef: "queue-staff-aar",
        }).routingOutcome === "routed_to_source",
      reason: "in_lane evaluation must route to source queue outcome",
    },
    {
      id: "PC-AAR-15",
      name: "above_authority + deployed senior => routed_to_target with target queue ref",
      passed: (() => {
        const routing = classifyAuthorityRouting({
          authorityEvaluationResult: mockAuthorityEvaluationResult({
            authorityOutcome: "above_authority",
            escalationTargetRoleType: "senior_accountant",
          }),
          sourceQueueRef: "queue-staff-aar",
          companyId: AAR_COMPANY_ID,
          customerRoleDeploymentRecord: deployedSeniorRecord,
          deploymentScope: {
            companyId: AAR_COMPANY_ID,
            ...AAR_ISOLATION,
            scope: AAR_SCOPE,
          },
        });
        return routing.routingOutcome === "routed_to_target" && routing.targetQueueRef === "queue-senior-aar";
      })(),
      reason: "deployed target must routed_to_target with queue ref",
    },
    {
      id: "PC-AAR-16",
      name: "above_authority + not deployed => advise_to_deploy_required held in source",
      passed: (() => {
        const routing = classifyAuthorityRouting({
          authorityEvaluationResult: mockAuthorityEvaluationResult({
            authorityOutcome: "above_authority",
            escalationTargetRoleType: "senior_accountant",
          }),
          sourceQueueRef: "queue-staff-aar",
          companyId: AAR_COMPANY_ID,
          deploymentScope: {
            companyId: AAR_COMPANY_ID,
            ...AAR_ISOLATION,
            scope: AAR_SCOPE,
          },
        });
        return routing.routingOutcome === "advise_to_deploy_required" && routing.sourceQueueRef === "queue-staff-aar" &&
          routing.targetQueueRef === "";
      })(),
      reason: "not deployed target must advise_to_deploy_required and hold in source",
    },
    {
      id: "PC-AAR-17",
      name: "forbidden => forbidden routing outcome",
      passed:
        classifyAuthorityRouting({
          authorityEvaluationResult: mockAuthorityEvaluationResult({ authorityOutcome: "forbidden" }),
          sourceQueueRef: "queue-staff-aar",
        }).routingOutcome === "forbidden",
      reason: "forbidden evaluation must emit forbidden routing outcome",
    },
    {
      id: "PC-AAR-18",
      name: "executable false literal on all AAR module outputs",
      passed: (() => {
        const { buildAuthorityEvaluation } = loadAuthorityEvaluationModule();
        const { buildDefaultRoleAuthorityTierConfig } = loadAuthorityTierConfigModule();
        const evaluator = buildAuthorityEvaluation(buildEvaluatorInput());
        const tierConfig = buildDefaultRoleAuthorityTierConfig({ ...AAR_HANDOFF_FIXTURE, companyId: AAR_COMPANY_ID });
        const gate = buildTierWideningGateResult({
          ...AAR_HANDOFF_FIXTURE,
          companyId: AAR_COMPANY_ID,
          roleType: "staff_accountant",
          currentMaxReviewLevel: "senior",
          requestedMaxReviewLevel: "controller",
          requestReason: "verify executable false",
        });
        const gateResult = gate.tierWideningGateResult;
        const ticket = buildTierWideningReviewTicket({
          tierWideningGateResult: gateResult,
          tierWideningRequest: mockTierWideningRequest({ tierWideningRequestId: gateResult?.tierWideningRequestId }),
        });
        const evaluation = evaluator.authorityEvaluationResult;
        const routing = buildAuthorityRoutingPackage({
          authorityEvaluationResult: evaluation,
          sourceQueueRef: "queue-staff-aar",
          companyId: AAR_COMPANY_ID,
          customerRoleDeploymentRecord: deployedSeniorRecord,
        });
        const routingPackage = routing.authorityRoutingPackage;
        const advise = buildAdviseToDeployNotification({
          authorityRoutingPackage: mockAuthorityRoutingPackage({
            routingOutcome: "advise_to_deploy_required",
            escalationTargetRoleType: "senior_accountant",
          }),
          triggeringTaskRef: "task-aar",
        });
        const deployment = buildCustomerRoleDeploymentRecord({
          ...AAR_HANDOFF_FIXTURE,
          companyId: AAR_COMPANY_ID,
          roleType: "senior_accountant",
          deploymentStatus: "deployed",
          roleInstanceId: "role-instance-senior-aar",
          roleActivationReferenceId: "activation-senior-aar",
          workforceMemberReferenceId: "workforce-senior-aar",
          taskQueueReferenceId: "queue-senior-aar",
          deploymentResolvedAt: "2026-06-18T00:00:00.000Z",
        });
        const artifacts = [
          evaluation,
          tierConfig.roleAuthorityTierConfig,
          gateResult,
          ticket.tierWideningReviewTicket,
          routingPackage,
          advise.adviseToDeployNotification,
          deployment.customerRoleDeploymentRecord,
        ];
        return artifacts.every((artifact) => artifact !== null && artifact.executable === false);
      })(),
      reason: "every built AAR artifact must carry executable: false",
    },
    {
      id: "PC-AAR-19",
      name: "deployment stub without explicit record => not_deployed fail-closed",
      passed:
        resolveRoleDeployment(
          {
            companyId: AAR_COMPANY_ID,
            ...AAR_ISOLATION,
            scope: AAR_SCOPE,
          },
          "senior_accountant",
        ).deploymentStatus === "not_deployed",
      reason: "resolveRoleDeployment must fail-closed to not_deployed without explicit record",
    },
  ];
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
