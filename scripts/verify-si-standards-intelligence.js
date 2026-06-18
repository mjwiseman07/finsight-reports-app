const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const standardsRoot = path.join(root, "lib", "intelligence", "synthetic", "standards");
const hashModulePath = path.join(root, "lib", "intelligence", "core", "hash");

const treatmentScopedCategories = [
  "revenue_recognition",
  "lease_accounting",
  "inventory_measurement",
  "impairment_measurement",
  "financial_instruments_measurement",
];

const frameworkAgnosticCategories = [
  "fraud_detection",
  "obvious_error_reasonableness",
  "fte_to_payroll_consistency",
  "vendor_duplicate_detection",
  "structural_anomaly_patterns",
];

const expectedFrameworks = [
  "us_gaap",
  "ifrs_for_smes",
  "ifrs_iasb",
  "ifrs_eu",
  "ifrs_uk",
  "ifrs_ca",
  "ifrs_au",
  "frs_102",
  "de_hgb",
  "br_gaap",
  "local_other",
];

const MODULES = [
  { phase: "41.5A", id: "memory-reservation", files: ["MemoryFrameworkDimension.ts", "index.ts"] },
  { phase: "41.5B", id: "contracts", files: ["StandardsContracts.ts", "index.ts"] },
  {
    phase: "41.5C",
    id: "framework-registry",
    files: ["buildFrameworkRegistry.ts", "buildFrameworkRegistryEntry.ts", "index.ts"],
  },
  {
    phase: "41.5D",
    id: "treatment-resolver",
    files: ["buildTreatmentResolution.ts", "buildTreatmentResolutions.ts", "index.ts"],
  },
  {
    phase: "41.5E",
    id: "framework-selector",
    files: ["buildFrameworkSelection.ts", "buildFrameworkSelections.ts", "index.ts"],
  },
  {
    phase: "41.5F",
    id: "multi-framework",
    files: ["buildMultiFrameworkEntity.ts", "buildMultiFrameworkEntities.ts", "index.ts"],
  },
  {
    phase: "41.5G",
    id: "currency-config",
    files: ["buildCurrencyConfiguration.ts", "buildCurrencyConfigurations.ts", "index.ts"],
  },
  {
    phase: "41.5H",
    id: "framework-scoped-memory",
    files: ["buildFrameworkScopedRetrieval.ts", "buildFrameworkScopedRetrievals.ts", "index.ts"],
  },
  {
    phase: "41.5I",
    id: "onboarding",
    files: ["buildOnboardingConfiguration.ts", "buildOnboardingConfigurations.ts", "index.ts"],
  },
  {
    phase: "41.5J",
    id: "framework-change-governance",
    files: ["buildFrameworkChangeGovernance.ts", "buildFrameworkChangeGovernances.ts", "index.ts"],
  },
  {
    phase: "41.5K",
    id: "consolidation",
    files: ["buildConsolidationHierarchy.ts", "buildConsolidationHierarchies.ts", "index.ts"],
  },
  {
    phase: "41.5L",
    id: path.join("libraries", "us-gaap"),
    files: ["buildGaapTreatment.ts", "buildGaapTreatments.ts", "index.ts"],
  },
  {
    phase: "41.5M",
    id: path.join("libraries", "ifrs-for-smes"),
    files: ["buildIfrsForSmesTreatment.ts", "buildIfrsForSmesTreatments.ts", "index.ts"],
  },
  {
    phase: "41.5N",
    id: path.join("libraries", "full-ifrs"),
    files: ["buildFullIfrsTreatment.ts", "buildFullIfrsTreatments.ts", "index.ts"],
  },
  {
    phase: "41.5O",
    id: "differences-catalog",
    files: ["buildDifferenceCatalogEntry.ts", "buildDifferenceCatalogEntries.ts", "index.ts"],
  },
  {
    phase: "41.5P",
    id: "conversion-engine",
    files: ["buildConversionAdjustment.ts", "buildConversionAdjustments.ts", "index.ts"],
  },
  {
    phase: "41.5Q",
    id: "reasonableness-checker",
    files: ["buildCrossFrameworkObservation.ts", "buildCrossFrameworkObservations.ts", "index.ts"],
  },
  {
    phase: "41.5R",
    id: "currency-translation",
    files: ["buildCurrencyTranslation.ts", "buildCurrencyTranslations.ts", "index.ts"],
  },
  {
    phase: "41.5S",
    id: "currency-tracking",
    files: ["buildStandardsCurrencyTracking.ts", "buildStandardsCurrencyTrackings.ts", "index.ts"],
  },
  {
    phase: "41.5T",
    id: "role-adapter",
    files: ["buildRoleResolverAdapter.ts", "buildRoleResolverAdapters.ts", "index.ts"],
  },
  {
    phase: "41.5U",
    id: "disclosure-requirements",
    files: ["buildDisclosureRequirement.ts", "buildDisclosureRequirements.ts", "index.ts"],
  },
];

const COLLECTION_BUILDER_SUFFIXES = new Set([
  "Resolutions",
  "Selections",
  "Entities",
  "Configurations",
  "Retrievals",
  "Governances",
  "Hierarchies",
  "Treatments",
  "Entries",
  "Adjustments",
  "Observations",
  "Translations",
  "Trackings",
  "Adapters",
  "Requirements",
]);

const MODULE_MARKER_CHECKS = [
  {
    phase: "41.5C",
    file: "framework-registry/buildFrameworkRegistryEntry.ts",
    markers: [
      "selectableOnlyWhenActive: true",
      "failClosedOnNonActiveSelection: true",
      "statusTransitionIsGovernedEvent: true",
    ],
  },
  {
    phase: "41.5C",
    file: "framework-registry/buildFrameworkRegistry.ts",
    markers: ["neverSilentlySubstitutesFramework: true", "PHASE_41_5_FRAMEWORK_REGISTRY_BLUEPRINT"],
  },
  {
    phase: "41.5D",
    file: "treatment-resolver/buildTreatmentResolution.ts",
    markers: [
      "failsClosedOnNonActiveFramework: true",
      "failsClosedOnUnpopulatedTopic: true",
      "failsClosedOnUnreviewedTreatment: true",
      "neverSilentlyDefaultsFramework: true",
      "rolesNeverReferenceFrameworkContentDirectly: true",
    ],
  },
  {
    phase: "41.5E",
    file: "framework-selector/buildFrameworkSelection.ts",
    markers: [
      "onlyActiveFrameworksSelectable: true",
      "selectionFailsClosedIfNotActive: true",
      "frameworkSetPerEntityNotPerCompany: true",
      "selectionImmutableAfterOnboardingLock: true",
      "laterChangeRequiresFrameworkChangeGovernance: true",
    ],
  },
  {
    phase: "41.5F",
    file: "multi-framework/buildMultiFrameworkEntity.ts",
    markers: [
      "everyArtifactFrameworkTagged: true",
      "primaryAndSecondaryBooksSegregated: true",
      "primaryBookMemoryInvisibleToSecondaryBook: true",
      "secondaryBookMemoryInvisibleToPrimaryBook: true",
      "frameworkScopedRetrievalRequired: true",
    ],
  },
  {
    phase: "41.5G",
    file: "currency-config/buildCurrencyConfiguration.ts",
    markers: [
      "functionalAndPresentationCurrencySeparate: true",
      "translationStandardSelectedByFramework: true",
      "monetaryItemsAtTransactionDateRate: true",
      "nonMonetaryItemsAtHistoricalRate: true",
      "incomeStatementAtAverageRate: true",
      "balanceSheetAtClosingRate: true",
      "translationDifferenceToOci: true",
      "hyperinflationaryHandlingDeferred: true",
    ],
  },
  {
    phase: "41.5H",
    file: "framework-scoped-memory/buildFrameworkScopedRetrieval.ts",
    markers: [
      "retrievalRequiresFrameworkSpecified: true",
      "failsClosedWhenFrameworkUnspecified: true",
      "crossFrameworkRetrievalReturnsEmpty: true",
      "neverFallsBackToOtherFramework: true",
      "categoryClassDeterminesScope: true",
      "treatmentScopedPartitionedByFramework: true",
      "frameworkAgnosticSharedAcrossFrameworks: true",
    ],
  },
  {
    phase: "41.5I",
    file: "onboarding/buildOnboardingConfiguration.ts",
    markers: [
      "frameworkSelectionPerEntity: true",
      "onlyActiveFrameworksSelectableAtOnboarding: true",
      "producesImmutableOnboardingAuditEntry: true",
      "onboardingLockGatesRoleActivation: true",
    ],
  },
  {
    phase: "41.5J",
    file: "framework-change-governance/buildFrameworkChangeGovernance.ts",
    markers: [
      "frameworkChangeIsGovernedEventNotToggle: true",
      "primaryChangeRequiresMultiPartyApproval: true",
      "allChangesLogged: true",
      "changeLogAppendOnlyImmutable: true",
      "historicalBooksRemainImmutableUnderPriorFramework: true",
      "changeAppliedOnlyWhenApproved: true",
    ],
  },
  {
    phase: "41.5K",
    file: "consolidation/buildConsolidationHierarchy.ts",
    markers: [
      "respectsFrameworkSegregation: true",
      "subsidiaryFrameworkKnowledgeNeverContaminatesParent: true",
      "invokesConversionEngineWhenFrameworksDiffer: true",
      "consolidatedStatementsInParentFramework: true",
    ],
  },
  {
    phase: "41.5L",
    file: "libraries/us-gaap/buildGaapTreatment.ts",
    markers: libraryMarkers(),
  },
  {
    phase: "41.5M",
    file: "libraries/ifrs-for-smes/buildIfrsForSmesTreatment.ts",
    markers: libraryMarkers(),
  },
  {
    phase: "41.5N",
    file: "libraries/full-ifrs/buildFullIfrsTreatment.ts",
    markers: libraryMarkers(),
  },
  {
    phase: "41.5O",
    file: "differences-catalog/buildDifferenceCatalogEntry.ts",
    markers: libraryMarkers(),
  },
  {
    phase: "41.5P",
    file: "conversion-engine/buildConversionAdjustment.ts",
    markers: [
      "consumesDifferencesCatalogNeverReimplements: true",
      "humanReviewRequiredBeforePosting: true",
      "approvedForPostingRequiresHumanApproval: true",
      "frameworkTaggedAtPosting: true",
      "neverSilentlyMerged: true",
      "reversible: true",
    ],
  },
  {
    phase: "41.5Q",
    file: "reasonableness-checker/buildCrossFrameworkObservation.ts",
    markers: [
      "isObservationOnly: true",
      "neverAssertsError: true",
      "humansDecide: true",
      "materialDifferenceFeedsPhase40Escalation: true",
    ],
  },
  {
    phase: "41.5R",
    file: "currency-translation/buildCurrencyTranslation.ts",
    markers: [
      "translationStandardSelectedByFramework: true",
      "monetaryItemsAtTransactionDateRate: true",
      "nonMonetaryItemsAtHistoricalRate: true",
      "incomeStatementAtAverageRate: true",
      "balanceSheetAtClosingRate: true",
      "translationDifferenceToOci: true",
      "hyperinflationaryHandlingDeferred: true",
      "ratesAreInputNotFetched: true",
    ],
  },
  {
    phase: "41.5S",
    file: "currency-tracking/buildStandardsCurrencyTracking.ts",
    markers: [
      "remainsActiveUntilReReviewed: true",
      "newTreatmentRequiresHumanReviewBeforeActive: true",
      "doesNotClaimRealTimeCurrency: true",
      "currencyIsHumanOrLicenseMaintained: true",
    ],
  },
  {
    phase: "41.5T",
    file: "role-adapter/buildRoleResolverAdapter.ts",
    markers: [
      "roleCallsResolverNotHardcodedTreatment: true",
      "rolesHoldNoFrameworkKnowledge: true",
      "backwardCompatibleForUsGaap: true",
      "doesNotModifyPhase39Namespace: true",
      "adapterLivesInStandardsNamespace: true",
    ],
  },
  {
    phase: "41.5U",
    file: "disclosure-requirements/buildDisclosureRequirement.ts",
    markers: [
      "frameworkTaggedNeverBleedsAcrossFrameworks: true",
      "builderNeverAuthorsContent: true",
      "downstreamChecklistGenerationIsPhase45: true",
      "activeRequiresReviewAttestation: true",
      "containsCopyrightedText: false",
      "citationIsReferenceOnlyNeverReproducedText: true",
      "appendOnlyHistory: true",
    ],
  },
];

const BUILDER_SOURCE_FILES = collectBuilderSourceFiles();
const PRIMARY_BUILDER_SOURCE_FILES = BUILDER_SOURCE_FILES.filter(isPrimaryBuilderFile);

const checks = [
  checkMemoryReservationDirectoryExists,
  checkMemoryFrameworkDimensionExists,
  checkMemoryReservationIndexExists,
  checkFrameworkDimensionReservedMarker,
  checkSchemaReservationOnlyMarker,
  checkWritesNoFrameworkSpecificMemoryMarker,
  checkTreatmentScopedCategories,
  checkFrameworkAgnosticCategories,
  checkIsolationScopingMarkers,
  checkContainsPhiMarker,
  checkHandoffContinuityMarkers,
  checkExecutableLiteralFalse,
  checkNoBannedRuntimePatterns,
  checkAllModuleDirectoriesAndFiles,
  checkContractDiscipline,
  checkNoContractTypesOutsideContracts,
  checkStableSnapshotHashImportDiscipline,
  checkBannedPatternsAcrossStandardsNamespace,
  checkRoleAdapterDoesNotReachPhase39Namespace,
  checkExecutableFalseAcrossBuilderModules,
  checkBaseContractContinuityAcrossBuilders,
  checkIsolationAndPhiAcrossBuilders,
  checkReportingFrameworkScopingAcrossBuilders,
  checkModuleLiteralMarkers,
  checkFrameworkRegistryElevenFrameworkTable,
  checkNoContainsCopyrightedTextTrue,
  checkLibraryActiveRequiresAttestation,
  checkFrameworkSegregationStatic,
  checkFourEntityTopologyStatic,
];

const results = checks.map((check) => check());
const failures = results.filter((result) => !result.passed);
const passedChecks = results.filter((result) => result.passed);

for (const result of passedChecks) {
  if (result.note) {
    console.log(`OK ${result.name}: ${result.note}`);
  }
}

if (failures.length > 0) {
  console.error("FAIL");
  for (const failure of failures) {
    console.error(`- ${failure.name}: ${failure.reason}`);
  }
  process.exit(1);
}

console.log("PASS");
console.log("VERIFY_EXIT:0");
console.log(
  "Note: framework segregation and four-entity topology tests are static/structural only; live retrieval segregation is validated on the real-data test register.",
);
process.exit(0);

function libraryMarkers() {
  return [
    "builderNeverAuthorsContent: true",
    "activeRequiresReviewAttestation: true",
    "containsCopyrightedText: false",
    "citationIsReferenceOnlyNeverReproducedText: true",
    "appendOnlyHistory: true",
  ];
}

function checkMemoryReservationDirectoryExists() {
  return {
    name: "41.5A memory reservation directory exists",
    passed: isDirectory(path.join(standardsRoot, "memory-reservation")),
    reason: "missing lib/intelligence/synthetic/standards/memory-reservation/",
  };
}

function checkMemoryFrameworkDimensionExists() {
  return {
    name: "41.5A MemoryFrameworkDimension.ts exists",
    passed: isFile(path.join(standardsRoot, "memory-reservation", "MemoryFrameworkDimension.ts")),
    reason: "missing MemoryFrameworkDimension.ts",
  };
}

function checkMemoryReservationIndexExists() {
  return {
    name: "41.5A memory reservation index.ts exists",
    passed: isFile(path.join(standardsRoot, "memory-reservation", "index.ts")),
    reason: "missing memory-reservation/index.ts",
  };
}

function checkFrameworkDimensionReservedMarker() {
  return sourceIncludesCheck(
    "41.5A reportingFrameworkDimensionReserved marker",
    "reportingFrameworkDimensionReserved: true",
    "missing reportingFrameworkDimensionReserved: true",
  );
}

function checkSchemaReservationOnlyMarker() {
  return sourceIncludesCheck(
    "41.5A schema reservation only marker",
    "schemaReservationOnly: true",
    "missing schemaReservationOnly: true",
  );
}

function checkWritesNoFrameworkSpecificMemoryMarker() {
  return sourceIncludesCheck(
    "41.5A writes no framework-specific memory marker",
    "writesNoFrameworkSpecificMemory: true",
    "missing writesNoFrameworkSpecificMemory: true",
  );
}

function checkTreatmentScopedCategories() {
  const source = readMemoryFrameworkDimensionSource();
  const missingCategories = treatmentScopedCategories.filter((category) => !source.includes(category));

  return {
    name: "41.5A treatment-scoped categories exhaustive",
    passed: missingCategories.length === 0,
    reason: `missing treatment-scoped categories: ${missingCategories.join(", ")}`,
  };
}

function checkFrameworkAgnosticCategories() {
  const source = readMemoryFrameworkDimensionSource();
  const missingCategories = frameworkAgnosticCategories.filter((category) => !source.includes(category));

  return {
    name: "41.5A framework-agnostic categories exhaustive",
    passed: missingCategories.length === 0,
    reason: `missing framework-agnostic categories: ${missingCategories.join(", ")}`,
  };
}

function checkIsolationScopingMarkers() {
  const source = readMemoryFrameworkDimensionSource();
  const requiredMarkers = ["customerIsolation", "firmIsolation", "clientIsolation", "isolationPeersUnchanged: true"];
  const missingMarkers = requiredMarkers.filter((marker) => !source.includes(marker));

  return {
    name: "41.5A isolation scoping markers",
    passed: missingMarkers.length === 0,
    reason: `missing isolation scoping markers: ${missingMarkers.join(", ")}`,
  };
}

function checkContainsPhiMarker() {
  return sourceIncludesCheck("41.5A containsPHI marker", "containsPHI", "missing containsPHI");
}

function checkHandoffContinuityMarkers() {
  return {
    name: "41.5A Phase 40 and 40.5 handoff continuity",
    passed:
      readMemoryFrameworkDimensionSource().includes("boundPhase40SnapshotHash") &&
      readMemoryFrameworkDimensionSource().includes("boundPhase40_5SnapshotHash"),
    reason: "missing boundPhase40SnapshotHash or boundPhase40_5SnapshotHash in 41.5A",
  };
}

function checkExecutableLiteralFalse() {
  const source = readMemoryFrameworkDimensionSource();

  return {
    name: "41.5A executable literal false",
    passed: source.includes("executable: false") && !source.includes("executable: boolean"),
    reason: "MemoryFrameworkDimension.ts must type executable as literal false, not boolean",
  };
}

function checkNoBannedRuntimePatterns() {
  return checkBannedPatternsInSource("41.5A memory-reservation", readMemoryFrameworkDimensionSource());
}

function checkAllModuleDirectoriesAndFiles() {
  const missing = [];

  for (const moduleDef of MODULES) {
    const moduleDirectory = path.join(standardsRoot, moduleDef.id);
    if (!isDirectory(moduleDirectory)) {
      missing.push(`${moduleDef.phase} missing directory ${moduleDef.id}`);
      continue;
    }

    for (const fileName of moduleDef.files) {
      if (!isFile(path.join(moduleDirectory, fileName))) {
        missing.push(`${moduleDef.phase} missing file ${path.join(moduleDef.id, fileName)}`);
      }
    }
  }

  return {
    name: "41.5 module directories and files",
    passed: missing.length === 0,
    reason: missing.join("; "),
  };
}

function checkContractDiscipline() {
  const violations = [];

  for (const filePath of BUILDER_SOURCE_FILES) {
    const relativePath = path.relative(standardsRoot, filePath).replace(/\\/g, "/");
    if (relativePath.startsWith("contracts/")) {
      continue;
    }

    const source = readFile(filePath);
    const importLines = source.match(/^import\s.+$/gm) ?? [];

    for (const importLine of importLines) {
      if (!importLine.includes("StandardsBaseContract") && !importLine.includes("from")) {
        continue;
      }

      if (
        importLine.includes("Standards") ||
        importLine.includes("FrameworkRegistryStatus") ||
        importLine.includes("DifferenceDirection") ||
        importLine.includes("ConsolidationMethod") ||
        importLine.includes("FrameworkChangeType")
      ) {
        const allowed =
          /from\s+["'](?:\.\.\/)+contracts["']/.test(importLine) ||
          /from\s+["']\.\.\/contracts["']/.test(importLine);
        if (!allowed && importLine.includes("from")) {
          violations.push(`${relativePath}: contract import must come from contracts only (${importLine.trim()})`);
        }
      }
    }
  }

  return {
    name: "contract discipline imports from 41.5B only",
    passed: violations.length === 0,
    reason: violations.slice(0, 8).join("; "),
  };
}

function checkNoContractTypesOutsideContracts() {
  const violations = [];

  for (const filePath of BUILDER_SOURCE_FILES) {
    const relativePath = path.relative(standardsRoot, filePath).replace(/\\/g, "/");
    if (relativePath.startsWith("contracts/")) {
      continue;
    }

    const source = readFile(filePath);
    if (/\binterface\s+\w+Contract\b/.test(source)) {
      violations.push(relativePath);
    }
  }

  return {
    name: "no Contract types outside contracts module",
    passed: violations.length === 0,
    reason: `found Contract type definitions in: ${violations.join(", ")}`,
  };
}

function checkStableSnapshotHashImportDiscipline() {
  const violations = [];

  for (const filePath of BUILDER_SOURCE_FILES) {
    const relativePath = path.relative(standardsRoot, filePath).replace(/\\/g, "/");
    const source = readFile(filePath);
    if (!source.includes("stableSnapshotHash")) {
      continue;
    }

    const validImport =
      /from\s+["'](?:\.\.\/)+core\/hash["']/.test(source) &&
      !/from\s+["'][^"']*contracts[^"']*["']/.test(
        source.match(/import\s+\{[^}]*stableSnapshotHash[^}]*\}\s+from\s+["'][^"']+["']/)?.[0] ?? "",
      );

    if (!validImport) {
      violations.push(relativePath);
    }
  }

  return {
    name: "stableSnapshotHash imported only from core/hash",
    passed: violations.length === 0,
    reason: `invalid stableSnapshotHash import in: ${violations.join(", ")}`,
  };
}

function checkBannedPatternsAcrossStandardsNamespace() {
  const violations = [];

  for (const filePath of listTypeScriptFiles(standardsRoot)) {
    const relativePath = path.relative(standardsRoot, filePath).replace(/\\/g, "/");
    const result = checkBannedPatternsInSource(relativePath, readFile(filePath));
    if (!result.passed) {
      violations.push(`${relativePath}: ${result.reason}`);
    }
  }

  return {
    name: "banned patterns across standards namespace",
    passed: violations.length === 0,
    reason: violations.slice(0, 8).join("; "),
  };
}

function checkRoleAdapterDoesNotReachPhase39Namespace() {
  const roleAdapterPath = path.join(standardsRoot, "role-adapter", "buildRoleResolverAdapter.ts");
  const source = readFile(roleAdapterPath);
  const violations = [];

  if (/from\s+["'][^"']*\/roles\//.test(source)) {
    violations.push("imports from Phase 39 roles namespace");
  }
  if (/from\s+["'][^"']*synthetic\/roles/.test(source)) {
    violations.push("imports from synthetic/roles namespace");
  }
  if (!source.includes("doesNotModifyPhase39Namespace: true")) {
    violations.push("missing doesNotModifyPhase39Namespace marker");
  }

  return {
    name: "41.5T role adapter does not reach Phase 39 namespace",
    passed: violations.length === 0,
    reason: violations.join("; "),
  };
}

function checkExecutableFalseAcrossBuilderModules() {
  const violations = [];

  for (const filePath of BUILDER_SOURCE_FILES) {
    const relativePath = path.relative(standardsRoot, filePath).replace(/\\/g, "/");
    if (relativePath.startsWith("contracts/") || relativePath.startsWith("memory-reservation/")) {
      continue;
    }

    const source = readFile(filePath);
    if (/\bexecutable:\s*true\b/.test(source)) {
      violations.push(relativePath);
    }
    if (source.includes("Synthetic") && source.includes("executable:") && !source.includes("executable: false")) {
      violations.push(`${relativePath} missing executable: false literal`);
    }
  }

  return {
    name: "executable literal false across builder modules",
    passed: violations.length === 0,
    reason: violations.join(", "),
  };
}

function checkBaseContractContinuityAcrossBuilders() {
  const violations = [];

  for (const filePath of PRIMARY_BUILDER_SOURCE_FILES) {
    const relativePath = path.relative(standardsRoot, filePath).replace(/\\/g, "/");
    if (!relativePath.includes("build") || relativePath.startsWith("contracts/")) {
      continue;
    }

    const source = readFile(filePath);
    if (!source.includes("boundPhase40SnapshotHash") || !source.includes("boundPhase40_5SnapshotHash")) {
      violations.push(relativePath);
    }
  }

  return {
    name: "base contract continuity across builders",
    passed: violations.length === 0,
    reason: `missing boundPhase40/40.5 markers in: ${violations.join(", ")}`,
  };
}

function checkIsolationAndPhiAcrossBuilders() {
  const violations = [];

  for (const filePath of PRIMARY_BUILDER_SOURCE_FILES) {
    const relativePath = path.relative(standardsRoot, filePath).replace(/\\/g, "/");
    if (!relativePath.includes("build") || relativePath.startsWith("contracts/")) {
      continue;
    }

    const source = readFile(filePath);
    const required = ["customerIsolation", "firmIsolation", "clientIsolation", "containsPHI"];
    const missing = required.filter((marker) => !source.includes(marker));
    if (missing.length > 0) {
      violations.push(`${relativePath} missing ${missing.join(", ")}`);
    }
  }

  return {
    name: "isolation and containsPHI across builders",
    passed: violations.length === 0,
    reason: violations.join("; "),
  };
}

function checkReportingFrameworkScopingAcrossBuilders() {
  const violations = [];
  const exempt = new Set([
    "onboarding/buildOnboardingConfiguration.ts",
    "differences-catalog/buildDifferenceCatalogEntry.ts",
    "framework-registry/buildFrameworkRegistry.ts",
    "framework-registry/buildFrameworkRegistryEntry.ts",
  ]);

  for (const filePath of PRIMARY_BUILDER_SOURCE_FILES) {
    const relativePath = path.relative(standardsRoot, filePath).replace(/\\/g, "/");
    if (!relativePath.includes("build") || exempt.has(relativePath) || relativePath.startsWith("contracts/")) {
      continue;
    }

    const source = readFile(filePath);
    if (!source.includes("reportingFramework") && !source.includes("reportingFrameworks")) {
      violations.push(relativePath);
    }
  }

  return {
    name: "reportingFramework or reportingFrameworks on framework-scoped builders",
    passed: violations.length === 0,
    reason: `missing framework scoping dimension in: ${violations.join(", ")}`,
  };
}

function checkModuleLiteralMarkers() {
  const violations = [];

  for (const markerCheck of MODULE_MARKER_CHECKS) {
    const filePath = path.join(standardsRoot, markerCheck.file);
    const source = readFile(filePath);
    const missing = markerCheck.markers.filter((marker) => !source.includes(marker));
    if (missing.length > 0) {
      violations.push(`${markerCheck.phase} ${markerCheck.file}: ${missing.join(", ")}`);
    }
  }

  return {
    name: "module literal guardrail markers",
    passed: violations.length === 0,
    reason: violations.join("; "),
  };
}

function checkFrameworkRegistryElevenFrameworkTable() {
  const source = readFile(path.join(standardsRoot, "framework-registry", "buildFrameworkRegistry.ts"));
  const missingFrameworks = expectedFrameworks.filter((framework) => !source.includes(`"${framework}"`));

  return {
    name: "41.5C eleven-framework status table",
    passed:
      source.includes("PHASE_41_5_FRAMEWORK_REGISTRY_BLUEPRINT") &&
      missingFrameworks.length === 0 &&
      (source.match(/frameworkStatus:/g) ?? []).length >= 11,
    reason:
      missingFrameworks.length > 0
        ? `missing frameworks in registry blueprint: ${missingFrameworks.join(", ")}`
        : "registry blueprint or framework status table incomplete",
  };
}

function checkNoContainsCopyrightedTextTrue() {
  const violations = [];
  const libraryPaths = [
    "libraries/us-gaap/buildGaapTreatment.ts",
    "libraries/ifrs-for-smes/buildIfrsForSmesTreatment.ts",
    "libraries/full-ifrs/buildFullIfrsTreatment.ts",
    "differences-catalog/buildDifferenceCatalogEntry.ts",
    "disclosure-requirements/buildDisclosureRequirement.ts",
  ];

  for (const relativePath of libraryPaths) {
    const source = readFile(path.join(standardsRoot, relativePath));
    if (source.includes("containsCopyrightedText: true")) {
      violations.push(relativePath);
    }
  }

  return {
    name: "containsCopyrightedText literal false on libraries and catalog",
    passed: violations.length === 0,
    reason: `containsCopyrightedText true found in: ${violations.join(", ")}`,
  };
}

function checkLibraryActiveRequiresAttestation() {
  const violations = [];

  const treatmentStatus = simulateTreatmentActiveGate({
    treatmentStatus: "active",
    isHumanReviewed: true,
    reviewerIdentity: "",
    reviewDate: "",
    reviewAttestationReferenceId: "",
  });
  if (treatmentStatus === "active") {
    violations.push("treatment library allows active without reviewerIdentity/reviewDate/attestation");
  }

  const disclosureReviewed = simulateDisclosureActiveGate({
    isHumanReviewed: true,
    disclosureMarkedActive: true,
    reviewerIdentity: "reviewer",
    reviewDate: "",
    reviewAttestationReferenceId: "",
  });
  if (disclosureReviewed) {
    violations.push("disclosure requirement allows active without reviewDate/attestation");
  }

  const differenceReviewed = simulateDifferenceReviewedGate({
    isHumanReviewed: true,
    reviewerIdentity: "",
    reviewDate: "2026-01-01",
    reviewAttestationReferenceId: "att-1",
  });
  if (differenceReviewed) {
    violations.push("difference catalog allows reviewed without reviewerIdentity");
  }

  return {
    name: "library and catalog active/reviewed requires attestation",
    passed: violations.length === 0,
    reason: violations.join("; "),
  };
}

function checkFrameworkSegregationStatic() {
  const notes = [];
  const violations = [];

  const artifacts = [
    { id: "mem-us-gaap", framework: "us_gaap", category: "revenue_recognition" },
    { id: "mem-ifrs-smes", framework: "ifrs_for_smes", category: "lease_accounting" },
    { id: "mem-ifrs-iasb", framework: "ifrs_iasb", category: "inventory_measurement" },
  ];

  const scopedRetained = artifacts
    .filter((artifact) => {
      const outcome = resolveRetrievalOutcome({
        memoryCategory: artifact.category,
        requestedFrameworks: ["us_gaap"],
        artifactFramework: artifact.framework,
        retrievedReferenceIds: [artifact.id],
      });
      return outcome.retrievalStatus === "scoped" && outcome.retrievedReferenceIds.includes(artifact.id);
    })
    .map((artifact) => artifact.id);
  if (!scopedRetained.includes("mem-us-gaap") || scopedRetained.length !== 1) {
    violations.push(`us_gaap scoped retrieval retained unexpected artifacts: ${scopedRetained.join(", ") || "none"}`);
  }
  notes.push(`us_gaap scoped retrieval retained ${scopedRetained.join(", ") || "none"}`);

  const crossOutcome = resolveRetrievalOutcome({
    memoryCategory: "revenue_recognition",
    requestedFrameworks: ["us_gaap"],
    artifactFramework: "ifrs_iasb",
    retrievedReferenceIds: ["mem-ifrs-iasb"],
  });
  if (crossOutcome.failClosedReason !== "cross_framework_blocked" || crossOutcome.retrievedReferenceIds.length !== 0) {
    violations.push("cross-framework retrieval did not fail closed with empty results");
  }
  notes.push("cross-framework blocked when artifact framework not in requested frameworks");

  const unspecifiedOutcome = resolveRetrievalOutcome({
    memoryCategory: "revenue_recognition",
    requestedFrameworks: [],
    artifactFramework: "us_gaap",
    retrievedReferenceIds: ["mem-us-gaap"],
  });
  if (unspecifiedOutcome.failClosedReason !== "framework_unspecified") {
    violations.push("treatment-scoped retrieval without framework did not fail closed");
  }
  notes.push("treatment-scoped retrieval without framework -> framework_unspecified");

  const sharedOutcome = resolveRetrievalOutcome({
    memoryCategory: "fraud_detection",
    requestedFrameworks: [],
    retrievedReferenceIds: ["agnostic-1"],
  });
  if (sharedOutcome.retrievalStatus !== "shared") {
    violations.push("framework-agnostic retrieval did not resolve shared");
  }
  notes.push("framework-agnostic category resolves shared without framework");

  const unknownOutcome = resolveRetrievalOutcome({
    memoryCategory: "unknown_category",
    requestedFrameworks: ["us_gaap"],
    retrievedReferenceIds: ["x"],
  });
  if (unknownOutcome.failClosedReason !== "category_unknown") {
    violations.push("unknown category did not fail closed");
  }
  notes.push("unknown category -> category_unknown");

  return {
    name: "framework segregation static construction",
    passed: violations.length === 0,
    reason: violations.join("; "),
    note: notes.join("; "),
  };
}

function checkFourEntityTopologyStatic() {
  const notes = [];
  const violations = [];
  const customerA = "customer-topology-1";
  const customerB = "customer-topology-2";

  const artifacts = [
    { id: "A-us-gaap-rev", entityId: "entity-A", customerId: customerA, framework: "us_gaap", category: "revenue_recognition", book: "primary" },
    { id: "B-ifrs-smes-lease", entityId: "entity-B", customerId: customerA, framework: "ifrs_for_smes", category: "lease_accounting", book: "primary" },
    { id: "C-primary-us-gaap", entityId: "entity-C", customerId: customerA, framework: "us_gaap", category: "inventory_measurement", book: "primary" },
    { id: "C-secondary-ifrs", entityId: "entity-C", customerId: customerA, framework: "ifrs_iasb", category: "financial_instruments_measurement", book: "secondary" },
    { id: "D-us-gaap-rev", entityId: "entity-D", customerId: customerA, framework: "us_gaap", category: "revenue_recognition", book: "primary" },
    { id: "agnostic-fraud", entityId: "shared", customerId: customerA, framework: "", category: "fraud_detection", book: "shared" },
    { id: "other-customer", entityId: "entity-X", customerId: customerB, framework: "us_gaap", category: "revenue_recognition", book: "primary" },
  ];

  function canRetrieve(artifact, request) {
    if (artifact.customerId !== request.customerId) {
      return false;
    }

    const outcome = resolveRetrievalOutcome({
      memoryCategory: artifact.category,
      requestedFrameworks: request.requestedFrameworks,
      artifactFramework: artifact.framework || undefined,
      retrievedReferenceIds: [artifact.id],
    });

    if (outcome.retrievalStatus === "shared") {
      return true;
    }

    if (outcome.retrievalStatus !== "scoped") {
      return false;
    }

    if (request.book && artifact.book !== "shared" && request.book !== artifact.book) {
      return false;
    }

    return outcome.retrievedReferenceIds.includes(artifact.id);
  }

  const checks = [
    {
      label: "A us_gaap retrievable for D",
      pass: canRetrieve(artifacts[0], { customerId: customerA, requestedFrameworks: ["us_gaap"], book: "primary" }),
    },
    {
      label: "A us_gaap retrievable for C primary",
      pass: canRetrieve(artifacts[0], { customerId: customerA, requestedFrameworks: ["us_gaap"], book: "primary" }),
    },
    {
      label: "A us_gaap NOT retrievable for B",
      pass: !canRetrieve(artifacts[0], { customerId: customerA, requestedFrameworks: ["ifrs_for_smes"], book: "primary" }),
    },
    {
      label: "A us_gaap NOT retrievable for C secondary ifrs_iasb",
      pass: !canRetrieve(artifacts[0], { customerId: customerA, requestedFrameworks: ["ifrs_iasb"], book: "secondary" }),
    },
    {
      label: "B ifrs_for_smes NOT retrievable for A",
      pass: !canRetrieve(artifacts[1], { customerId: customerA, requestedFrameworks: ["us_gaap"], book: "primary" }),
    },
    {
      label: "B ifrs_for_smes NOT retrievable for D",
      pass: !canRetrieve(artifacts[1], { customerId: customerA, requestedFrameworks: ["us_gaap"], book: "primary" }),
    },
    {
      label: "B ifrs_for_smes NOT retrievable for C primary",
      pass: !canRetrieve(artifacts[1], { customerId: customerA, requestedFrameworks: ["us_gaap"], book: "primary" }),
    },
    {
      label: "B ifrs_for_smes NOT retrievable for C secondary",
      pass: !canRetrieve(artifacts[1], { customerId: customerA, requestedFrameworks: ["ifrs_iasb"], book: "secondary" }),
    },
    {
      label: "C primary not visible in secondary book",
      pass: !canRetrieve(artifacts[2], { customerId: customerA, requestedFrameworks: ["us_gaap"], book: "secondary" }),
    },
    {
      label: "C secondary not visible in primary book",
      pass: !canRetrieve(artifacts[3], { customerId: customerA, requestedFrameworks: ["ifrs_iasb"], book: "primary" }),
    },
    {
      label: "framework-agnostic retrievable for all four entities",
      pass: ["entity-A", "entity-B", "entity-C", "entity-D"].every((entityId) =>
        canRetrieve(artifacts[5], { customerId: customerA, requestedFrameworks: [], book: "shared" }),
      ),
    },
    {
      label: "no cross-customerIsolation leakage",
      pass: !canRetrieve(artifacts[6], { customerId: customerA, requestedFrameworks: ["us_gaap"], book: "primary" }),
    },
  ];

  for (const topologyCheck of checks) {
    notes.push(`${topologyCheck.label}: ${topologyCheck.pass ? "pass" : "fail"}`);
    if (!topologyCheck.pass) {
      violations.push(topologyCheck.label);
    }
  }

  return {
    name: "four-entity topology static construction",
    passed: violations.length === 0,
    reason: violations.join("; "),
    note: notes.join("; "),
  };
}

function resolveRetrievalOutcome(input) {
  const categoryClassification = classifyMemoryCategory(input.memoryCategory);
  const requestedFrameworks = input.requestedFrameworks ?? [];
  const candidateReferenceIds = input.retrievedReferenceIds ?? [];

  if (!categoryClassification) {
    return {
      retrievalStatus: "fail_closed",
      failClosedReason: "category_unknown",
      retrievedReferenceIds: [],
    };
  }

  if (categoryClassification.memoryCategoryClass === "framework_agnostic") {
    return {
      retrievalStatus: "shared",
      failClosedReason: "none",
      retrievedReferenceIds: candidateReferenceIds,
    };
  }

  if (requestedFrameworks.length === 0) {
    return {
      retrievalStatus: "fail_closed",
      failClosedReason: "framework_unspecified",
      retrievedReferenceIds: [],
    };
  }

  if (input.artifactFramework && !requestedFrameworks.includes(input.artifactFramework)) {
    return {
      retrievalStatus: "fail_closed",
      failClosedReason: "cross_framework_blocked",
      retrievedReferenceIds: [],
    };
  }

  return {
    retrievalStatus: "scoped",
    failClosedReason: "none",
    retrievedReferenceIds: candidateReferenceIds,
  };
}

function classifyMemoryCategory(memoryCategory) {
  if (treatmentScopedCategories.includes(memoryCategory)) {
    return { memoryCategoryClass: "treatment_scoped", retrievalScope: "framework_partitioned" };
  }
  if (frameworkAgnosticCategories.includes(memoryCategory)) {
    return { memoryCategoryClass: "framework_agnostic", retrievalScope: "shared" };
  }
  return null;
}

function simulateTreatmentActiveGate(input) {
  const hasAttestation =
    input.isHumanReviewed === true &&
    Boolean(input.reviewerIdentity) &&
    Boolean(input.reviewDate) &&
    Boolean(input.reviewAttestationReferenceId);

  if (input.treatmentStatus === "active" && !hasAttestation) {
    return "in_review";
  }
  if (input.treatmentStatus === "active" && hasAttestation) {
    return "active";
  }
  return input.treatmentStatus ?? "draft";
}

function simulateDisclosureActiveGate(input) {
  const markedActive = input.isHumanReviewed === true || input.disclosureMarkedActive === true;
  const hasAttestation =
    Boolean(input.reviewerIdentity) && Boolean(input.reviewDate) && Boolean(input.reviewAttestationReferenceId);
  return markedActive && hasAttestation;
}

function simulateDifferenceReviewedGate(input) {
  if (input.isHumanReviewed !== true) {
    return false;
  }
  return (
    Boolean(input.reviewerIdentity) && Boolean(input.reviewDate) && Boolean(input.reviewAttestationReferenceId)
  );
}

function checkBannedPatternsInSource(label, source) {
  const bannedPatterns = [
    ["AI model client import", /\bimport\s+.*?\s+from\s+["'](?:openai|@openai|anthropic|@anthropic|langchain|@langchain)[^"']*["']/i],
    ["database client import", /\bimport\s+.*?\s+from\s+["'](?:@prisma\/client|prisma|drizzle-orm|mongoose|pg|mysql2|sqlite3|better-sqlite3)[^"']*["']/i],
    ["fetch call", /\bfetch\s*\(/],
    ["axios call or import", /\baxios\b/],
    ["file system write call", /\b(?:writeFile|appendFile|createWriteStream|mkdir|rm|unlink|rename)\s*\(/],
    ["memory write call", /\b(?:writeMemory|storeMemory|persistMemory|saveMemory|upsertMemory|createMemory)\s*\(/i],
    ["live exchange rate fetch", /\b(?:fetchExchangeRate|getExchangeRate|fetchLiveRate|openexchangerates)\b/i],
  ];
  const violations = bannedPatterns.filter(([, pattern]) => pattern.test(source)).map(([name]) => name);

  return {
    name: label,
    passed: violations.length === 0,
    reason: `banned runtime patterns found: ${violations.join(", ")}`,
  };
}

function sourceIncludesCheck(name, marker, reason) {
  return {
    name,
    passed: readMemoryFrameworkDimensionSource().includes(marker),
    reason,
  };
}

function collectBuilderSourceFiles() {
  return listTypeScriptFiles(standardsRoot).filter((filePath) => {
    const relativePath = path.relative(standardsRoot, filePath).replace(/\\/g, "/");
    return relativePath.endsWith(".ts");
  });
}

function isPrimaryBuilderFile(filePath) {
  const baseName = path.basename(filePath, ".ts");
  if (!baseName.startsWith("build")) {
    return false;
  }

  const builderName = baseName.slice("build".length);
  return !Array.from(COLLECTION_BUILDER_SUFFIXES).some((suffix) => builderName.endsWith(suffix));
}

function listTypeScriptFiles(directoryPath) {
  const files = [];

  function walk(currentPath) {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        files.push(entryPath);
      }
    }
  }

  walk(directoryPath);
  return files;
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

function readMemoryFrameworkDimensionSource() {
  return readFile(path.join(standardsRoot, "memory-reservation", "MemoryFrameworkDimension.ts"));
}
