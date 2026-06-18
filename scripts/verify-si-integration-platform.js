const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const integrationsDirectory = path.join(root, "lib", "intelligence", "foundation", "integrations");
const contractsDirectory = path.join(integrationsDirectory, "contracts");
const contractsSourcePath = path.join(contractsDirectory, "IntegrationContracts.ts");
const contractsIndexPath = path.join(contractsDirectory, "index.ts");

const moduleSpecs = [
  {
    wave: "Wave 1",
    name: "contracts",
    relativeDirectory: "contracts",
    files: ["IntegrationContracts.ts", "index.ts"],
    exports: ["IntegrationBaseContract", "ConnectorActivityEntry", "InboundDataClassificationContract"],
    markers: [
      "executable: false",
      "boundPhase40SnapshotHash",
      "boundPhase39SnapshotHash",
      "boundPhase38SnapshotHash",
      "customerIsolation",
      "firmIsolation",
      "clientIsolation",
      "containsPHI",
      "firmTenantId",
      "clientTenantId",
      "recommendationOnlyByDefault",
      "writeModeRequiresHumanApproval",
      "writeModeRequiresGovernanceEntry",
    ],
  },
  {
    wave: "Wave 1",
    name: "inbound-classification",
    relativeDirectory: "inbound-classification",
    files: ["buildInboundDataClassification.ts", "buildInboundDataClassifications.ts", "index.ts"],
    exports: ["buildInboundDataClassification", "buildInboundDataClassifications", "SyntheticInboundDataClassification"],
    markers: ["failClosedToHighSensitivity", "dataSensitivityTier", "containsPII", "containsPHI"],
  },
  {
    wave: "Wave 1",
    name: "activity-audit",
    relativeDirectory: "activity-audit",
    files: [
      "buildConnectorActivityEntry.ts",
      "buildConnectorActivityChain.ts",
      "buildConnectorActivityEntries.ts",
      "index.ts",
    ],
    exports: ["buildConnectorActivityEntry", "buildConnectorActivityEntries", "SyntheticConnectorActivityEntry"],
    markers: [
      "appendOnly",
      "immutableRecord",
      "neverEditedOrDeleted",
      "humanApprovalReference",
      "linkedRecommendationAuditEntryId",
      "input.operation === \"write\"",
    ],
  },
  {
    wave: "Wave 1",
    name: "oauth-lifecycle",
    relativeDirectory: "oauth-lifecycle",
    files: ["buildOAuthTokenLifecycle.ts", "buildOAuthTokenLifecycles.ts", "index.ts"],
    exports: ["buildOAuthTokenLifecycle", "buildOAuthTokenLifecycles", "SyntheticOAuthTokenLifecycle"],
    markers: ["tokenStoredByHandleOnly", "tokenNeverPlainText", "tokenNeverLogged", "fail_closed_with_escalation"],
  },
  {
    wave: "Wave 1",
    name: "webhooks",
    relativeDirectory: "webhooks",
    files: ["buildWebhookSubscription.ts", "buildWebhookSubscriptions.ts", "index.ts"],
    exports: ["buildWebhookSubscription", "buildWebhookSubscriptions", "SyntheticWebhookSubscription"],
    markers: [
      "webhookSignatureVerificationFailClosed",
      "webhookEndpointPerTenant",
      "payloadTreatedAsUntrustedInput",
      "payloadNeverActedOnWithoutHumanApprovedGate",
      "producesConnectorActivityEntryOnReceipt",
    ],
  },
  {
    wave: "Wave 1",
    name: "sync-state",
    relativeDirectory: "sync-state",
    files: [
      "buildSyncState.ts",
      "buildCrossConnectorReconciliationCandidate.ts",
      "buildSyncStates.ts",
      "index.ts",
    ],
    exports: ["buildSyncState", "buildSyncStates", "SyntheticSyncState", "SyntheticCrossConnectorReconciliationCandidate"],
    markers: [
      "missedSyncEscalatesViaPhase40F",
      "fail_closed_escalate_via_phase40F",
      "requiresHumanReview",
      "neverSilentlyResolved",
      "systemNeverChoosesSourceAutonomously",
    ],
  },
  {
    wave: "Wave 1",
    name: "versioning",
    relativeDirectory: "versioning",
    files: ["buildConnectorVersion.ts", "buildConnectorVersions.ts", "index.ts"],
    exports: ["buildConnectorVersion", "buildConnectorVersions", "SyntheticConnectorVersion"],
    markers: ["deprecatedWithoutReviewFlag", "humanReviewRecorded", "apiVersionLifecycle"],
  },
  {
    wave: "Wave 1",
    name: "data-residency",
    relativeDirectory: "data-residency",
    files: ["buildConnectorDataResidency.ts", "buildConnectorDataResidencies.ts", "index.ts"],
    exports: ["buildConnectorDataResidency", "buildConnectorDataResidencies", "SyntheticConnectorDataResidency"],
    markers: ["selectableForEntity", "failsClosedWhenRegionUnsatisfiable", "regionPinningSupported"],
  },
  {
    wave: "Wave 1",
    name: "compliance-designation",
    relativeDirectory: "compliance-designation",
    files: ["buildConnectorComplianceDesignation.ts", "buildConnectorComplianceDesignations.ts", "index.ts"],
    exports: [
      "buildConnectorComplianceDesignation",
      "buildConnectorComplianceDesignations",
      "SyntheticConnectorComplianceDesignation",
    ],
    markers: ["complianceDesignationIsDeclarativeNotAttestation", "declarative upstream metadata", "not Advisacor attestation"],
  },
  {
    wave: "Wave 1",
    name: "connection-management",
    relativeDirectory: "connection-management",
    files: [
      "buildCustomerConnectionView.ts",
      "buildWriteModeToggleRequest.ts",
      "buildCustomerConnectionViews.ts",
      "index.ts",
    ],
    exports: ["buildCustomerConnectionView", "buildWriteModeToggleRequest", "SyntheticWriteModeToggleRequest"],
    markers: [
      "dualConfirmationRequired",
      "enableGovernanceEntryReferenceId",
      "coolingOffPeriodReference",
      "disableTakesEffectImmediately",
    ],
  },
  {
    wave: "Wave 1",
    name: "credential-vault",
    relativeDirectory: "credential-vault",
    files: [
      "buildCredentialReference.ts",
      "buildVaultAccessContract.ts",
      "buildCredentialReferences.ts",
      "index.ts",
    ],
    exports: ["buildCredentialReference", "buildVaultAccessContract", "SyntheticCredentialReference"],
    markers: [
      "storedByHandleOnly",
      "accessByHandleOnly",
      "no secret value",
      "encryptedAtRest",
      "firmCannotAccessClientCredentialsWithoutAuthorization",
      "vaultNeverInRepo",
    ],
  },
  {
    wave: "Wave 1",
    name: "connector-framework",
    relativeDirectory: "connector-framework",
    files: ["buildConnectorFramework.ts", "buildConnectorFrameworks.ts", "index.ts"],
    exports: ["buildConnectorFramework", "buildConnectorFrameworks", "SyntheticConnectorFramework"],
    markers: [
      "writeModeEnabled: false",
      "writeIsRecommendationOnlyByDefault",
      "capabilityGatedFeaturesFailClosed",
      "perTenantQuotaWithinAggregateLimit",
      "sandboxCannotEnableWriteMode",
    ],
  },
  {
    wave: "Wave 1",
    name: "connection-health",
    relativeDirectory: "connection-health",
    files: [
      "buildConnectionHealth.ts",
      "buildConnectionDisruption.ts",
      "buildConnectionHealths.ts",
      "index.ts",
    ],
    exports: ["buildConnectionHealth", "buildConnectionDisruption", "SyntheticConnectionHealth"],
    markers: ["telemetryIsOperationalMetricsOnly", "noCustomerBehaviorProfiling", "feedsPhase40GHealth", "escalatesViaPhase40F"],
  },
  connectorSpec("Wave 2", "quickbooks", "QuickBooks", ["quickBooks"], [
    "reusesPhase39AdapterContracts",
    "signAwareClassificationRequired",
    "postsAsDraftNeverAutoApproves",
    "writeModeEnabled: false",
    "startsReadOnly: true",
  ]),
  connectorSpec("Wave 2", "xero", "Xero", ["xero"], [
    "reusesPhase39AdapterContracts",
    "signAwareClassificationRequired",
    "postsAsDraftNeverAutoApproves",
    "writeModeEnabled: false",
    "startsReadOnly: true",
    "xeroOverdraftPresentedAsLiabilityHandled",
    "classifyBySignAndSourcePresentationNotAccountTypeAlone",
  ]),
  connectorSpec("Wave 2", "sage-intacct", "SageIntacct", ["sageIntacct"], [
    "reusesPhase39AdapterContracts",
    "signAwareClassificationRequired",
    "postsAsDraftNeverAutoApproves",
    "writeModeEnabled: false",
    "startsReadOnly: true",
  ]),
  connectorSpec("Wave 2", "netsuite", "NetSuite", ["netSuite"], [
    "reusesPhase39AdapterContracts",
    "signAwareClassificationRequired",
    "postsAsDraftNeverAutoApproves",
    "writeModeEnabled: false",
    "startsReadOnly: true",
  ]),
  connectorSpec("Wave 2", "dynamics", "Dynamics", ["dynamics"], [
    "reusesPhase39AdapterContracts",
    "signAwareClassificationRequired",
    "postsAsDraftNeverAutoApproves",
    "writeModeEnabled: false",
    "startsReadOnly: true",
    "businessCentralAndFinanceOpsHandledDistinctly",
  ]),
  connectorSpec("Wave 3", "banking", "Banking", ["banking"], [
    "isInboundDataSourceOnly",
    "neverWritesToBank",
    "writeModeSupported: false",
    "writeModeEnabled: false",
  ]),
  connectorSpec("Wave 3", "document-store", "DocumentStore", ["documentStore"], [
    "readWriteSeparation",
    "writeScopeLimitedToDesignatedOutputLocation",
    "documentsMayContainPhiPii",
  ]),
  connectorSpec("Wave 3", "email", "Email", ["email"], [
    "inboundIntakeFirst",
    "feedsPhase39EmailIntake",
    "clientEmailDefaultOff",
    "neverSendsToClientWithoutHumanEnablement",
  ]),
  connectorSpec("Wave 4", "payments", "Payments", ["payments"], [
    "neverAutonomouslyMovesMoney",
    "neverAutonomouslyReleasesPayment",
    "paymentActionRequiresDualConfirmation",
    "mostHeavilyGatedConnectorCategory",
  ]),
  connectorSpec("Wave 4", "hris-payroll", "HrisPayroll", ["hrisPayroll"], [
    "noAutonomousPayrollRun",
    "noAutonomousPaymentAuthorization",
    "payrollApprovalRequiresHuman",
    "ssnAndCompClassifiedHighestSensitivity",
  ]),
  connectorSpec("Wave 4", "crm", "Crm", ["crm"], [
    "writeScopeLimitedToNotesAndActivityLogging",
    "neverAltersFinancialRecords",
    "containsContactPii",
  ]),
  connectorSpec("Wave 4", "ecommerce", "Ecommerce", ["ecommerce"], [
    "highTransactionVolume",
    "rateLimitCoordinationCritical",
    "syncStateDisciplineCritical",
  ]),
  connectorSpec("Wave 4", "edi", "Edi", ["edi"], [
    "inboundDocumentIntegrityVerificationRequired",
    "failClosedOnMalformedEdi",
    "functionalAcknowledgment997IsProtocolResponse",
    "acknowledgment997GatedUnderWriteDiscipline",
    "neverAutonomousBusinessAction",
  ]),
  connectorSpec("Wave 4.5", "file-based", "FileBased", ["fileBased"], [
    "isUploadIngestionNotApiPull",
    "fileIntegrityVerificationRequired",
    "failClosedOnMalformedFile",
    "reusesPhase39UniversalCanonicalSchema",
    "signAwareClassificationRequired",
    "writeModeSupported: false",
  ]),
  {
    wave: "Wave 4.5",
    name: "file-upload",
    relativeDirectory: "file-upload",
    files: ["buildSecureFileUpload.ts", "buildSecureFileUploads.ts", "index.ts"],
    exports: ["buildSecureFileUpload", "buildSecureFileUploads", "SyntheticSecureFileUpload"],
    markers: [
      "uploadChannelPerTenant",
      "noSharedUploadChannels",
      "integrityVerificationRequiredBeforeProcessing",
      "malwareScanRequiredBeforeProcessing",
      "failClosedOnUnverifiedFile",
      "noProcessingBeforeVerification",
      "producesConnectorActivityEntryOnUpload",
    ],
  },
];

const phaseSourceFiles = collectTypeScriptFiles(integrationsDirectory);

const checks = [
  checkContractsDirectoryExists,
  checkContractsSourceExists,
  checkContractsIndexExists,
  checkModuleDirectoriesAndFiles,
  checkModuleExports,
  checkModuleLiteralMarkers,
  checkExecutableLiteralFalse,
  checkBaseContractContinuity,
  checkSeparateIsolationFields,
  checkContainsPhiMarker,
  checkTwoTierTenancyFields,
  checkStableSnapshotHashImports,
  checkContractImportDiscipline,
  checkNoExternalContractDefinitions,
  checkNoBannedRuntimePatterns,
  checkRejectList,
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

function connectorSpec(wave, directoryName, builderPrefix, collectionProperties, markers) {
  const builderFile = `build${builderPrefix}Connector.ts`;
  const collectionFile = `build${builderPrefix}Connectors.ts`;
  const syntheticName = `Synthetic${builderPrefix}Connector`;
  const modeDisabledMarker = directoryName === "email" ? "sendModeEnabled: false" : "writeModeEnabled: false";

  return {
    wave,
    name: `connectors/${directoryName}`,
    relativeDirectory: path.join("connectors", directoryName),
    files: [builderFile, collectionFile, "index.ts"],
    exports: [`build${builderPrefix}Connector`, `build${builderPrefix}Connectors`, syntheticName],
    markers: [
      "connectorFrameworkReferenceId",
      "activityAuditChainReferenceId",
      "inboundDataClassificationReferenceId",
      "connectorVersionReferenceId",
      "dataResidencyReferenceId",
      "complianceDesignationReferenceId",
      "credentialReferenceId",
      modeDisabledMarker,
      "startsReadOnly: true",
      ...collectionProperties,
      ...markers,
    ],
  };
}

function checkContractsDirectoryExists() {
  return {
    name: "contracts directory exists",
    passed: isDirectory(contractsDirectory),
    reason: "missing lib/intelligence/foundation/integrations/contracts/",
  };
}

function checkContractsSourceExists() {
  return {
    name: "IntegrationContracts.ts exists",
    passed: isFile(contractsSourcePath),
    reason: "missing IntegrationContracts.ts",
  };
}

function checkContractsIndexExists() {
  return {
    name: "contracts index.ts exists",
    passed: isFile(contractsIndexPath),
    reason: "missing contracts/index.ts",
  };
}

function checkModuleDirectoriesAndFiles() {
  const failures = [];

  for (const spec of moduleSpecs) {
    const moduleDirectory = moduleDirectoryFor(spec);
    if (!isDirectory(moduleDirectory)) {
      failures.push(`${spec.wave} ${spec.name}: missing directory`);
      continue;
    }

    for (const fileName of spec.files) {
      const filePath = path.join(moduleDirectory, fileName);
      if (!isFile(filePath)) {
        failures.push(`${spec.wave} ${spec.name}: missing ${fileName}`);
      }
    }
  }

  return result("module directories and files", failures);
}

function checkModuleExports() {
  const failures = [];

  for (const spec of moduleSpecs) {
    const moduleSource = readModuleSource(spec);
    const missingExports = spec.exports.filter((exportName) => !moduleSource.includes(exportName));
    if (missingExports.length > 0) {
      failures.push(`${spec.name}: missing exports or declarations ${missingExports.join(", ")}`);
    }
  }

  return result("module required exports", failures);
}

function checkModuleLiteralMarkers() {
  const failures = [];

  for (const spec of moduleSpecs) {
    const moduleSource = readModuleSource(spec);
    const missingMarkers = spec.markers.filter((marker) => !moduleSource.includes(marker));
    if (missingMarkers.length > 0) {
      failures.push(`${spec.name}: missing markers ${missingMarkers.join(", ")}`);
    }
  }

  return result("module literal guardrail markers", failures);
}

function checkExecutableLiteralFalse() {
  const failures = [];

  for (const filePath of phaseSourceFiles) {
    const source = readFile(filePath);
    if (/\bexecutable\s*:\s*boolean\b/.test(source) || /\bexecutable\s*:\s*true\b/.test(source)) {
      failures.push(relative(filePath));
    }
  }

  return result("executable literal false", failures);
}

function checkBaseContractContinuity() {
  const failures = [];
  const requiredMarkers = ["boundPhase40SnapshotHash", "boundPhase39SnapshotHash"];

  for (const spec of moduleSpecs) {
    const moduleSource = readModuleSource(spec);
    const missingMarkers = requiredMarkers.filter((marker) => !moduleSource.includes(marker));
    if (missingMarkers.length > 0) {
      failures.push(`${spec.name}: missing ${missingMarkers.join(", ")}`);
    }
  }

  return result("base contract continuity", failures);
}

function checkSeparateIsolationFields() {
  const failures = [];
  const requiredMarkers = ["customerIsolation", "firmIsolation", "clientIsolation"];

  for (const spec of moduleSpecs) {
    const moduleSource = readModuleSource(spec);
    const missingMarkers = requiredMarkers.filter((marker) => !moduleSource.includes(marker));
    if (missingMarkers.length > 0) {
      failures.push(`${spec.name}: missing ${missingMarkers.join(", ")}`);
    }
  }

  return result("separate isolation fields", failures);
}

function checkContainsPhiMarker() {
  const failures = [];

  for (const spec of moduleSpecs) {
    const moduleSource = readModuleSource(spec);
    if (!moduleSource.includes("containsPHI")) {
      failures.push(`${spec.name}: missing containsPHI`);
    }
  }

  return result("containsPHI marker", failures);
}

function checkTwoTierTenancyFields() {
  const tenancyModules = moduleSpecs.filter(
    (spec) => !["contracts", "versioning", "compliance-designation"].includes(spec.name),
  );
  const failures = [];

  for (const spec of tenancyModules) {
    const moduleSource = readModuleSource(spec);
    const missingMarkers = ["firmTenantId", "clientTenantId"].filter((marker) => !moduleSource.includes(marker));
    if (missingMarkers.length > 0) {
      failures.push(`${spec.name}: missing ${missingMarkers.join(", ")}`);
    }
  }

  return result("two-tier tenancy fields", failures);
}

function checkStableSnapshotHashImports() {
  const failures = [];
  const importPattern = /import\s+\{\s*stableSnapshotHash\s*\}\s+from\s+["']([^"']+)["']/g;

  for (const filePath of phaseSourceFiles) {
    const source = readFile(filePath);
    for (const match of source.matchAll(importPattern)) {
      if (!match[1].endsWith("core/hash")) {
        failures.push(`${relative(filePath)} imports stableSnapshotHash from ${match[1]}`);
      }
    }
  }

  return result("stableSnapshotHash import discipline", failures);
}

function checkContractImportDiscipline() {
  const failures = [];
  const importTypePattern = /import\s+type\s+\{([^}]+)\}\s+from\s+["']([^"']+)["']/g;

  for (const filePath of phaseSourceFiles) {
    if (isContractsFile(filePath)) {
      continue;
    }

    const source = readFile(filePath);
    for (const match of source.matchAll(importTypePattern)) {
      const importedNames = match[1].split(",").map((name) => name.trim().split(/\s+as\s+/i)[0].trim());
      const sourceModule = match[2];
      const importsIntegrationContractTypes = importedNames.some((name) => name.startsWith("Integration"));

      if (importsIntegrationContractTypes && !sourceModule.endsWith("contracts")) {
        failures.push(`${relative(filePath)} imports integration contract types from ${sourceModule}`);
      }
    }
  }

  return result("contract type import discipline", failures);
}

function checkNoExternalContractDefinitions() {
  const failures = [];
  const externalContractTypePattern = /export\s+type\s+\w*Contract\b/g;

  for (const filePath of phaseSourceFiles) {
    if (isContractsFile(filePath)) {
      continue;
    }

    const source = readFile(filePath);
    if (externalContractTypePattern.test(source)) {
      failures.push(relative(filePath));
    }
  }

  return result("no external contract type aliases", failures);
}

function checkNoBannedRuntimePatterns() {
  const bannedPatterns = [
    ["AI model client import", /\bimport\s+.*?\s+from\s+["'](?:openai|@openai|anthropic|@anthropic|langchain|@langchain)[^"']*["']/i],
    ["AI model call", /\b(?:chat\.completions|responses\.create|messages\.create|generateText|invokeModel)\s*\(/i],
    ["external SDK import", /\bimport\s+.*?\s+from\s+["'](?:quickbooks|xero|netsuite|sage|intacct|stripe|plaid|hubspot|salesforce|shopify|woocommerce|@intuit|@xero|@stripe|@shopify|@hubspot|@salesforce|@microsoft\/microsoft-graph-client|@azure\/msal|@oracle)[^"']*["']/i],
    ["OAuth client import", /\bimport\s+.*?\s+from\s+["'](?:simple-oauth2|passport|passport-oauth2|oauth|openid-client|google-auth-library|msal)[^"']*["']/i],
    ["database client import", /\bimport\s+.*?\s+from\s+["'](?:@prisma\/client|prisma|drizzle-orm|mongoose|pg|mysql2|sqlite3|better-sqlite3)[^"']*["']/i],
    ["fetch call", /\bfetch\s*\(/],
    ["axios call or import", /\baxios\b/],
    ["credential or secret storage call", /\b(?:storeCredential|saveCredential|persistCredential|storeSecret|saveSecret|setSecret|putSecret|storeToken|saveToken)\s*\(/i],
    ["file system write call", /\b(?:writeFile|appendFile|createWriteStream|mkdir|rm|unlink|rename)\s*\(/],
  ];
  const failures = [];

  for (const filePath of phaseSourceFiles) {
    const source = readFile(filePath);
    const violations = bannedPatterns.filter(([, pattern]) => pattern.test(source)).map(([label]) => label);
    if (violations.length > 0) {
      failures.push(`${relative(filePath)}: ${violations.join(", ")}`);
    }
  }

  return result("no banned runtime patterns", failures);
}

function checkRejectList() {
  const failures = [];
  const allSource = readAllPhaseSources();
  const connectorSpecs = moduleSpecs.filter((spec) => spec.relativeDirectory.startsWith(`connectors${path.sep}`));
  const oauthConnectorSpecs = connectorSpecs.filter(
    (spec) => !["connectors/edi", "connectors/file-based"].includes(spec.name),
  );

  if (/\bexecutable\s*:\s*true\b/.test(allSource)) {
    failures.push("executable true marker found");
  }

  for (const spec of connectorSpecs) {
    const moduleSource = readModuleSource(spec);
    const hasActivityMarker =
      moduleSource.includes("activityAuditChainReferenceId") ||
      moduleSource.includes("producesConnectorActivityEntryOnUpload");
    if (!hasActivityMarker) {
      failures.push(`${spec.name}: missing activity audit chain or upload activity marker`);
    }
  }

  for (const spec of oauthConnectorSpecs) {
    const moduleSource = readModuleSource(spec);
    if (moduleSource.includes("authModel: \"oauth\"") && !moduleSource.includes("oauthTokenLifecycleReferenceId")) {
      failures.push(`${spec.name}: OAuth auth model lacks token lifecycle reference`);
    }
  }

  const requiredRejectMarkers = [
    ["webhook signature verification", "webhookSignatureVerificationFailClosed"],
    ["inbound data classification", "failClosedToHighSensitivity"],
    ["deprecated API human review", "deprecatedWithoutReviewFlag"],
    ["write mode off by default", "writeModeEnabled: false"],
    ["write governance entry", "enableGovernanceEntryReferenceId"],
    ["file integrity verification", "fileIntegrityVerificationRequired"],
    ["sandbox cannot write", "sandboxCannotEnableWriteMode"],
    ["reconciliation human review", "requiresHumanReview"],
    ["credential clear-text prevention", "neverStoredInPlainText"],
  ];

  for (const [label, marker] of requiredRejectMarkers) {
    if (!allSource.includes(marker)) {
      failures.push(`missing reject marker for ${label}: ${marker}`);
    }
  }

  const clearCredentialPattern =
    /\b(?:credentialValue|secretValue|tokenValue|accessToken|refreshToken|clientSecret|privateKey)\s*[:=]\s*["'][^"']+["']/i;
  if (clearCredentialPattern.test(allSource)) {
    failures.push("clear credential, secret, or token value found");
  }

  return result("reject list enforcement markers", failures);
}

function checkCrossIsolation() {
  const tenantA = {
    firmTenantId: "firm-tenant-a",
    clientTenantId: "client-tenant-a",
    customerIsolation: "customer-isolation-a",
    firmIsolation: "firm-isolation-a",
    clientIsolation: "client-isolation-a",
  };
  const tenantB = {
    firmTenantId: "firm-tenant-b",
    clientTenantId: "client-tenant-b",
    customerIsolation: "customer-isolation-b",
    firmIsolation: "firm-isolation-b",
    clientIsolation: "client-isolation-b",
  };
  const tenantAArtifacts = syntheticIsolationArtifacts(tenantA, "a");
  const tenantBArtifacts = syntheticIsolationArtifacts(tenantB, "b");
  const failures = [
    ...findCrossTenantLeaks("tenant A", tenantAArtifacts, tenantB),
    ...findCrossTenantLeaks("tenant B", tenantBArtifacts, tenantA),
  ];

  const isolationSource = readAllPhaseSources();
  const missingIsolationReferences = ["firmTenantId", "clientTenantId", "customerIsolation", "firmIsolation", "clientIsolation"].filter(
    (marker) => !isolationSource.includes(marker),
  );
  if (missingIsolationReferences.length > 0) {
    failures.push(`source missing isolation fields: ${missingIsolationReferences.join(", ")}`);
  }

  return result("cross-isolation test", failures);
}

function syntheticIsolationArtifacts(tenant, suffix) {
  return [
    {
      artifactType: "connector",
      connectorId: `connector-${suffix}`,
      credentialReferenceId: `credential-${suffix}`,
      activityAuditChainReferenceId: `activity-${suffix}`,
      syncStateReferenceId: `sync-${suffix}`,
      ...tenant,
    },
    {
      artifactType: "credentialReference",
      credentialReferenceId: `credential-${suffix}`,
      credentialHandle: `credential-handle-${suffix}`,
      ...tenant,
    },
    {
      artifactType: "activityEntry",
      connectorActivityEntryId: `activity-entry-${suffix}`,
      connectorId: `connector-${suffix}`,
      ...tenant,
    },
    {
      artifactType: "syncState",
      syncStateId: `sync-${suffix}`,
      connectorId: `connector-${suffix}`,
      ...tenant,
    },
    {
      artifactType: "secureFileUpload",
      secureFileUploadId: `upload-${suffix}`,
      uploadChannelReference: `upload-channel-${suffix}`,
      fileBasedConnectorReferenceId: `connector-${suffix}`,
      ...tenant,
    },
  ];
}

function findCrossTenantLeaks(label, artifacts, otherTenant) {
  const forbiddenValues = Object.values(otherTenant);
  const failures = [];

  for (const artifact of artifacts) {
    const artifactValues = Object.values(artifact).map((value) => String(value));
    const leakedValues = forbiddenValues.filter((forbiddenValue) => artifactValues.includes(forbiddenValue));
    if (leakedValues.length > 0) {
      failures.push(`${label} ${artifact.artifactType} leaked ${leakedValues.join(", ")}`);
    }
  }

  return failures;
}

function moduleDirectoryFor(spec) {
  return path.join(integrationsDirectory, spec.relativeDirectory);
}

function readModuleSource(spec) {
  const moduleDirectory = moduleDirectoryFor(spec);
  return spec.files.map((fileName) => readFile(path.join(moduleDirectory, fileName))).join("\n");
}

function readAllPhaseSources() {
  return phaseSourceFiles.map((filePath) => readFile(filePath)).join("\n");
}

function collectTypeScriptFiles(directoryPath) {
  if (!isDirectory(directoryPath)) {
    return [];
  }

  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTypeScriptFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(entryPath);
    }
  }

  return files;
}

function result(name, failures) {
  return {
    name,
    passed: failures.length === 0,
    reason: failures.length === 0 ? "" : failures.join("; "),
  };
}

function isContractsFile(filePath) {
  return filePath.startsWith(contractsDirectory);
}

function isDirectory(directoryPath) {
  return fs.existsSync(directoryPath) && fs.statSync(directoryPath).isDirectory();
}

function isFile(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function readFile(filePath) {
  if (!isFile(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function relative(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}
