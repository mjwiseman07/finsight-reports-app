/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const Module = require("module");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const industryRoot = path.join(root, "lib", "intelligence", "synthetic", "industry");
const memoryReservationDir = path.join(industryRoot, "memory-reservation");
const industryMemoryDimensionPath = path.join(memoryReservationDir, "IndustryMemoryDimension.ts");
const memoryReservationIndexPath = path.join(memoryReservationDir, "index.ts");

const COLLECTION_BUILDER_SUFFIXES = new Set(["s", "Entries", "Treatments", "KPIs", "Baselines", "Variants", "Resolutions", "Selections", "Retrievals", "Tags", "Disciplines"]);

const MODULES = [
  { phase: "42A", id: "memory-reservation", files: ["IndustryMemoryDimension.ts", "index.ts"] },
  { phase: "42B", id: "contracts", files: ["IndustryContracts.ts", "index.ts"] },
  { phase: "42C", id: "industry-registry", files: ["buildIndustryRegistry.ts", "buildIndustryRegistryEntry.ts", "index.ts"] },
  { phase: "42D", id: "industry-resolver", files: ["buildIndustryResolution.ts", "buildIndustryResolutions.ts", "index.ts"] },
  { phase: "42E", id: "industry-selector", files: ["buildIndustrySelection.ts", "buildIndustrySelections.ts", "index.ts"] },
  { phase: "42F", id: "composition-engine", files: ["buildComposedTreatment.ts", "buildDifferencesCatalogReadInterface.ts", "index.ts"] },
  { phase: "42G", id: "industry-scoped-memory", files: ["buildIndustryScopedRetrieval.ts", "index.ts"] },
  { phase: "42H", id: "phi-tagging", files: ["buildPHITag.ts", "index.ts"] },
  { phase: "42I", id: "libraries/generic", files: ["buildGenericIndustryTreatment.ts", "index.ts"] },
  { phase: "42J", id: "kpi/generic", files: ["buildGenericKPI.ts", "index.ts"] },
  { phase: "42K", id: "disclosure-variants/generic", files: ["buildGenericDisclosureVariant.ts", "index.ts"] },
  { phase: "42L", id: "reasonableness/generic", files: ["buildGenericReasonablenessBaseline.ts", "index.ts"] },
  { phase: "42M", id: "libraries/healthcare", files: ["buildHealthcareIndustryTreatment.ts", "index.ts"] },
  { phase: "42N1", id: "kpi/healthcare-revenue-cycle", files: ["buildHealthcareRevenueCycleKPI.ts", "index.ts"] },
  { phase: "42N2", id: "kpi/healthcare-operational", files: ["buildHealthcareOperationalKPI.ts", "index.ts"] },
  { phase: "42O", id: "disclosure-variants/healthcare", files: ["buildHealthcareDisclosureVariant.ts", "index.ts"] },
  { phase: "42P", id: "reasonableness/healthcare", files: ["buildHealthcareReasonablenessBaseline.ts", "index.ts"] },
  { phase: "42Q", id: "phi-healthcare", files: ["buildHealthcarePHIDiscipline.ts", "index.ts"] },
];

const MODULE_MARKER_CHECKS = [
  {
    phase: "42C",
    file: "industry-registry/buildIndustryRegistryEntry.ts",
    markers: [
      "selectableOnlyWhenActive: true",
      "failClosedOnNonActiveSelection: true",
      "neverSilentlyFallsBackToGeneric: true",
      "statusTransitionIsGovernedEvent: true",
      "subClassificationSelectableOnlyWhenDeclared: true",
      "moduleSpecialistReviewDefault",
    ],
  },
  {
    phase: "42C",
    file: "industry-registry/buildIndustryRegistry.ts",
    markers: ["namedCredentialRequiredFor340B: true", "moduleSpecialistReviewDefault: true", "moduleSpecialistReviewDefault: false"],
  },
  {
    phase: "42D",
    file: "industry-resolver/buildIndustryResolution.ts",
    markers: [
      "rolesNeverCallIndustryContentDirectly: true",
      "failsClosedOnNonActiveIndustry: true",
      "failsClosedOnUndeclaredSubClassification: true",
      "failsClosedOnNonActiveFramework: true",
      "failsClosedOnUnpopulatedTuple: true",
      "failsClosedOnSpecialistAttestationMissing: true",
    ],
  },
  {
    phase: "42E",
    file: "industry-selector/buildIndustrySelection.ts",
    markers: [
      "onlyActiveIndustriesSelectable: true",
      "changeIsGovernedEventNotToggle: true",
      "historicalResolutionByEffectiveClassification: true",
      "priorClassificationMemoryDoesNotCarryForward: true",
    ],
  },
  {
    phase: "42F",
    file: "composition-engine/buildComposedTreatment.ts",
    markers: [
      'compositionOutcome: "specializes"',
      'compositionOutcome: "specializesWithDisplacement"',
      'compositionOutcome: "contradiction"',
      "failsClosedIfDisplacementLineageIncomplete: true",
      "contradictionEmitsConflictReportNeverResolves: true",
      "phiDerivationStatusPropagatesMostRestrictive: true",
      "reconstructionGradeLineage: true",
    ],
  },
  {
    phase: "42F",
    file: "composition-engine/buildDifferencesCatalogReadInterface.ts",
    markers: [
      "isReadOnlyInspectionInterface: true",
      "consultsPhase41_5DifferencesCatalog: true",
      "doesNotModifyDifferencesCatalog: true",
      "forProgrammaticAuditorAndSpecialistQueries: true",
      '"specializes"',
      '"specializesWithDisplacement"',
      '"contradiction"',
    ],
  },
  {
    phase: "42G",
    file: "industry-scoped-memory/buildIndustryScopedRetrieval.ts",
    markers: [
      "compositeScopeKeyForTreatmentScoped",
      "customerIsolation",
      "agnosticAlgorithmFiltersOnCustomerIsolationOnly: true",
      "crossFrameworkRetrievalReturnsEmpty: true",
      "crossSubClassificationRetrievalReturnsEmpty: true",
      "crossIndustryRetrievalReturnsEmpty: true",
      "phiNeverAppearsInNonHealthcareAwareRetrieval: true",
    ],
  },
  {
    phase: "42H",
    file: "phi-tagging/buildPHITag.ts",
    markers: [
      "triggeredByDataCharacteristicsNotIndustryLabelAlone: true",
      "genericClassifiedEntityCanStillCarryPhi: true",
      "industryClassificationDoesNotControlPhiTagging: true",
      "misclassificationProducesFailClosedSignal: true",
      "auditTrailEntriesInheritPhiTag: true",
      "containsNoPHI",
      "derivedFromPHIThroughSafeHarbor",
      "derivedFromPHIThroughExpertDetermination",
      "containsPHI",
      "phiDerivedLearningBrightLine",
      "mayEnterOwnCustomerScopedLearning: true",
      "mayNotEnterCrossCustomerSharedIntelligence: true",
    ],
  },
  {
    phase: "42I",
    file: "libraries/generic/buildGenericIndustryTreatment.ts",
    markers: [
      "builderNeverAuthorsContent: true",
      "activeRequiresAttestation: true",
      "containsCopyrightedText: false",
      "isIndustryOverlayNotFrameworkBase: true",
    ],
  },
  {
    phase: "42J",
    file: "kpi/generic/buildGenericKPI.ts",
    markers: ["isDefinitionNotComputation: true", "minimumCellSizeDefaultOneForGeneric: true"],
  },
  {
    phase: "42K",
    file: "disclosure-variants/generic/buildGenericDisclosureVariant.ts",
    markers: [
      "composesWithPhase41_5DisclosureRequirements: true",
      "frameworkTaggedNeverBleedsAcrossFrameworks: true",
      "industryTaggedNeverBleedsAcrossIndustries: true",
      "downstreamChecklistGenerationIsPhase45: true",
    ],
  },
  {
    phase: "42L",
    file: "reasonableness/generic/buildGenericReasonablenessBaseline.ts",
    markers: [
      "internalResearchRequiresSpecialistReview: true",
      "baselineSourceVisibleToHumanReviewer: true",
      'launchScope: "path_a"',
      "PATH_A_CONSUMED_LAUNCH_KPI_FAMILIES",
      "baselineForFamilyOutsideLaunchScopeFailsClosed: true",
    ],
  },
  {
    phase: "42M",
    file: "libraries/healthcare/buildHealthcareIndustryTreatment.ts",
    markers: [
      "moduleSpecialistReviewDefaultIsTrueForHealthcare: true",
      "activeRequiresSpecialistAttestationWhenFlagged: true",
      "namedCredentialRequiredFor340B",
      "specialistAttestationGovernanceMetadataNotCustomerFacing: true",
    ],
  },
  {
    phase: "42N1",
    file: "kpi/healthcare-revenue-cycle/buildHealthcareRevenueCycleKPI.ts",
    markers: [
      "isDefinitionNotComputation: true",
      "minimumCellSizeSafeHarborDefaultForHealthcare: true",
      "belowMinimumCellSizeSuppressedOrRolledUp: true",
      "Expert Determination",
    ],
  },
  {
    phase: "42N2",
    file: "kpi/healthcare-operational/buildHealthcareOperationalKPI.ts",
    markers: [
      "isDeferredArchitectureStub: true",
      "emptySlotIsIntentionalAndVerifierAcknowledged: true",
      "noOperationalKpiActiveAtLock: true",
      'kpiStatus: "deferred"',
    ],
  },
  {
    phase: "42O",
    file: "disclosure-variants/healthcare/buildHealthcareDisclosureVariant.ts",
    markers: [
      "forProfitHealthcareScopeOnly",
      "nfpBoundaryTest",
      "ifRequires501c3OrAsc958ThenOutOfScope: true",
      "nfpFundAccountingIsOutOfScope: true",
    ],
  },
  {
    phase: "42P",
    file: "reasonableness/healthcare/buildHealthcareReasonablenessBaseline.ts",
    markers: [
      "baselineScopedToSubClassification: true",
      "internalResearchRequiresSpecialistReview: true",
      "baselineSourceVisibleToHumanReviewer: true",
      'launchScope: "path_b"',
      "PATH_B_CONSUMED_LAUNCH_KPI_FAMILIES",
      "baselineForFamilyOutsideLaunchScopeFailsClosed: true",
    ],
  },
  {
    phase: "42Q",
    file: "phi-healthcare/buildHealthcarePHIDiscipline.ts",
    markers: [
      "consumesPhase42HDataCharacteristicTrigger: true",
      "tagTriggeredByDataCharacteristicsNotIndustryLabel: true",
      "hipaaControlsImplementedByPhase42_5NotHere: true",
      "aggregated_metrics_below_minimum_cell_size must map to containsPHI true",
    ],
  },
];

const CROSS_MODULE_BASE_MARKERS = [
  "executable: false",
  "boundPhase40SnapshotHash",
  "boundPhase40_5SnapshotHash",
  "boundPhase41_5SnapshotHash",
  "customerIsolation",
  "firmIsolation",
  "clientIsolation",
  "containsPHI",
  "phiDerivationStatus",
];

const INDUSTRY_CONTRACT_TYPE_IMPORTS = [
  "IndustryBaseContract",
  "PhiDerivationStatus",
  "RecommendationOutputClassification",
  "IndustryTreatmentStatus",
  "ReviewerAttestation",
  "IndustryCompositionOutcome",
  "DisplacementLineageEntry",
  "IndustryBaselineSource",
  "IndustryRegistryStatus",
  "IndustryRegistryEntry",
  "IndustryResolution",
  "IndustrySelection",
  "RetrievalCategoryClass",
];

const SYNTHETIC_BASE_FIXTURE = {
  scope: "industry_synthetic",
  customerIsolation: "customer-test-001",
  firmIsolation: "firm-test-001",
  clientIsolation: "client-test-001",
  boundPhase40SnapshotHash: "phase40-hash-test",
  boundPhase40_5SnapshotHash: "phase40-5-hash-test",
  boundPhase41_5SnapshotHash: "phase41-5-hash-test",
  boundPhase39SnapshotHash: "phase39-hash-test",
};

const analyticCategories = [
  "fraud_detection",
  "obvious_error_reasonableness",
  "fte_to_payroll_consistency",
  "vendor_duplicate_detection",
  "structural_anomaly_patterns",
];

const treatmentScopedIndustryCategories = [
  "revenue_recognition_industry_overlay",
  "reserve_and_allowance_patterns",
  "industry_specific_cost_accounting",
  "industry_specific_disclosure_patterns",
  "industry_specific_reasonableness_application",
];

const phiDerivationStatusValues = [
  "containsNoPHI",
  "derivedFromPHIThroughSafeHarbor",
  "derivedFromPHIThroughExpertDetermination",
  "containsPHI",
];

let typeScriptLoaderRegistered = false;
let compositionEngineModule;
let industryScopedMemoryModule;
let healthcareTreatmentModule;
let genericTreatmentModule;
let genericReasonablenessModule;
let healthcareReasonablenessModule;

function ensureTypeScriptLoader() {
  if (typeScriptLoaderRegistered) {
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

  typeScriptLoaderRegistered = true;
}

function loadCompositionEngine() {
  if (!compositionEngineModule) {
    ensureTypeScriptLoader();
    compositionEngineModule = require(path.join(industryRoot, "composition-engine", "index.ts"));
  }
  return compositionEngineModule;
}

function loadIndustryScopedMemory() {
  if (!industryScopedMemoryModule) {
    ensureTypeScriptLoader();
    industryScopedMemoryModule = require(path.join(industryRoot, "industry-scoped-memory", "index.ts"));
  }
  return industryScopedMemoryModule;
}

function loadHealthcareTreatment() {
  if (!healthcareTreatmentModule) {
    ensureTypeScriptLoader();
    healthcareTreatmentModule = require(path.join(industryRoot, "libraries", "healthcare", "index.ts"));
  }
  return healthcareTreatmentModule;
}

function loadGenericTreatment() {
  if (!genericTreatmentModule) {
    ensureTypeScriptLoader();
    genericTreatmentModule = require(path.join(industryRoot, "libraries", "generic", "index.ts"));
  }
  return genericTreatmentModule;
}

function loadGenericReasonableness() {
  if (!genericReasonablenessModule) {
    ensureTypeScriptLoader();
    genericReasonablenessModule = require(path.join(industryRoot, "reasonableness", "generic", "index.ts"));
  }
  return genericReasonablenessModule;
}

function loadHealthcareReasonableness() {
  if (!healthcareReasonablenessModule) {
    ensureTypeScriptLoader();
    healthcareReasonablenessModule = require(path.join(industryRoot, "reasonableness", "healthcare", "index.ts"));
  }
  return healthcareReasonablenessModule;
}

function evaluateTopologyFixtureExpectation(expectation) {
  return loadIndustryScopedMemory().evaluateTopologyFixtureExpectation(expectation);
}

function artifactMatchesRetrievalScope(candidate, scope) {
  return loadIndustryScopedMemory().artifactMatchesRetrievalScope(candidate, scope);
}

function buildCompositionBaseInput(overrides = {}) {
  return {
    ...SYNTHETIC_BASE_FIXTURE,
    queryTopicIdentifier: "revenue_recognition",
    queryIndustry: "healthcare",
    querySubClassification: "healthcare.acute_care_hospital",
    queryFramework: "us_gaap",
    queryEffectiveDate: "2026-06-01",
    frameworkSourceReferenceId: "fw-ref-1",
    frameworkSourceVersion: "1.0.0",
    industrySourceReferenceId: "ind-ref-1",
    industrySourceVersion: "1.0.0",
    frameworkPhiDerivationStatus: "containsNoPHI",
    industryPhiDerivationStatus: "containsNoPHI",
    phiDerivationStatus: "containsNoPHI",
    ...overrides,
  };
}

function buildTreatmentBaseInput(overrides = {}) {
  return {
    ...SYNTHETIC_BASE_FIXTURE,
    reportingFramework: "us_gaap",
    version: "1.0.0",
    effectiveFromDate: "2026-01-01",
    citationReference: "citation-ref-1",
    treatmentSummaryAuthored: "human-authored summary",
    priorVersionReferenceId: "",
    ...overrides,
  };
}

function buildReasonablenessBaseInput(overrides = {}) {
  return {
    ...SYNTHETIC_BASE_FIXTURE,
    reportingFramework: "us_gaap",
    version: "1.0.0",
    effectiveFromDate: "2026-01-01",
    baselineAuthored: "human-authored baseline",
    citationReference: "citation-ref-1",
    baselineSource: {
      sourceType: "external",
      externalSourceReference: "external-source-ref-1",
    },
    priorVersionReferenceId: "",
    ...overrides,
  };
}

function completeDisplacementLineageEntry(overrides = {}) {
  return {
    displacedFrameworkElementId: "fw-element-1",
    displacedElementVersion: "1.0.0",
    displacedElementEffectiveDate: "2026-01-01",
    displacingIndustryElementId: "ind-element-1",
    displacingElementVersion: "1.0.0",
    authoritativeCitationRef: "citation-ref-1",
    specialistAttestationRef: "specialist-attestation-ref-1",
    ...overrides,
  };
}

function verifyCompositionSpecializesOutcome() {
  const { buildComposedTreatment } = loadCompositionEngine();
  const result = buildComposedTreatment(
    buildCompositionBaseInput({
      compositionOutcome: "specializes",
      resolvedTreatmentReferenceId: "resolved-treatment-1",
      specializationNotes: "industry specializes framework treatment",
      composedTreatmentComplete: true,
    }),
  );

  const treatment = result.composedTreatment;
  const valid =
    !result.skipped &&
    treatment !== null &&
    treatment.compositionOutcome === "specializes" &&
    treatment.displacementLineage === undefined &&
    treatment.displacementJustification === undefined &&
    treatment.conflictReportReferenceId === undefined;

  return {
    passed: valid,
    reason: valid
      ? "specializes outcome valid without displacement fields"
      : `expected valid specializes outcome; skipped=${result.skipped}; warnings=${result.warnings.join("; ")}`,
    detail: treatment,
  };
}

function verifyCompositionDisplacementCompleteOutcome() {
  const { buildComposedTreatment } = loadCompositionEngine();
  const result = buildComposedTreatment(
    buildCompositionBaseInput({
      compositionOutcome: "specializesWithDisplacement",
      resolvedTreatmentReferenceId: "resolved-treatment-2",
      displacementJustification: "industry displaces framework element with specialist attestation",
      displacementLineage: [completeDisplacementLineageEntry()],
      composedTreatmentComplete: true,
    }),
  );

  const treatment = result.composedTreatment;
  const valid =
    !result.skipped &&
    treatment !== null &&
    treatment.compositionOutcome === "specializesWithDisplacement" &&
    Array.isArray(treatment.displacementLineage) &&
    treatment.displacementLineage.length > 0 &&
    treatment.displacementLineageIsReconstructionGrade === true &&
    treatment.specialistReviewerRequiredForDisplacement === true;

  return {
    passed: valid,
    reason: valid
      ? "specializesWithDisplacement valid with complete version-pinned displacementLineage"
      : `expected valid displacement outcome; skipped=${result.skipped}; warnings=${result.warnings.join("; ")}`,
    detail: treatment,
  };
}

function verifyCompositionDisplacementIncompleteRejected() {
  const { buildComposedTreatment } = loadCompositionEngine();
  const incompleteResult = buildComposedTreatment(
    buildCompositionBaseInput({
      compositionOutcome: "specializesWithDisplacement",
      resolvedTreatmentReferenceId: "resolved-treatment-3",
      displacementJustification: "incomplete lineage must fail closed",
      displacementLineage: [
        completeDisplacementLineageEntry({
          displacedElementVersion: "",
        }),
      ],
    }),
  );

  const unpinnedResult = buildComposedTreatment(
    buildCompositionBaseInput({
      compositionOutcome: "specializesWithDisplacement",
      resolvedTreatmentReferenceId: "resolved-treatment-4",
      displacementJustification: "missing lineage must fail closed",
      displacementLineage: [],
    }),
  );

  const rejected =
    incompleteResult.skipped === true &&
    incompleteResult.composedTreatment === null &&
    unpinnedResult.skipped === true &&
    unpinnedResult.composedTreatment === null;

  return {
    passed: rejected,
    reason: rejected
      ? "incomplete or non-version-pinned displacementLineage rejected (fail-closed)"
      : "expected displacement with incomplete lineage to be rejected",
    detail: {
      incompleteSkipped: incompleteResult.skipped,
      unpinnedSkipped: unpinnedResult.skipped,
    },
  };
}

function verifyCompositionContradictionOutcome() {
  const { buildComposedTreatment } = loadCompositionEngine();
  const result = buildComposedTreatment(
    buildCompositionBaseInput({
      compositionOutcome: "contradiction",
      conflictReportReferenceId: "conflict-report-1",
      frameworkChangeGovernanceReferenceId: "framework-change-governance-1",
      composedTreatmentComplete: true,
    }),
  );

  const treatment = result.composedTreatment;
  const valid =
    !result.skipped &&
    treatment !== null &&
    treatment.compositionOutcome === "contradiction" &&
    treatment.contradictionEmitsConflictReportNeverResolves === true &&
    treatment.resolvedTreatmentReferenceId === undefined &&
    hasValue(treatment.conflictReportReferenceId);

  return {
    passed: valid,
    reason: valid
      ? "contradiction outcome carries conflict report and no resolved treatment"
      : `expected contradiction without resolved treatment; skipped=${result.skipped}`,
    detail: treatment,
  };
}

function verifyPhiPropagationMostRestrictive() {
  const { buildComposedTreatment } = loadCompositionEngine();
  const result = buildComposedTreatment(
    buildCompositionBaseInput({
      compositionOutcome: "specializes",
      resolvedTreatmentReferenceId: "resolved-treatment-phi",
      specializationNotes: "phi propagation test",
      frameworkPhiDerivationStatus: "containsNoPHI",
      industryPhiDerivationStatus: "derivedFromPHIThroughSafeHarbor",
      phiDerivationStatus: "derivedFromPHIThroughExpertDetermination",
    }),
  );

  const treatment = result.composedTreatment;
  const valid =
    !result.skipped &&
    treatment !== null &&
    treatment.composedPhiDerivationStatus === "derivedFromPHIThroughExpertDetermination";

  return {
    passed: valid,
    reason: valid
      ? "composedPhiDerivationStatus is most-restrictive across mixed source statuses"
      : `expected derivedFromPHIThroughExpertDetermination; got ${treatment?.composedPhiDerivationStatus ?? "null"}`,
    detail: treatment,
  };
}

function verifyTopologyFixtureExpectations() {
  const { topologyFixtureExpectations } = loadIndustryScopedMemory();
  const failures = [];

  for (const expectation of topologyFixtureExpectations) {
    if (!evaluateTopologyFixtureExpectation(expectation)) {
      failures.push(`${expectation.expectationId}: ${expectation.description}`);
    }
  }

  return {
    passed: failures.length === 0,
    reason:
      failures.length === 0
        ? `all ${topologyFixtureExpectations.length} topologyFixtureExpectation records pass static scope evaluation`
        : failures.slice(0, 6).join("; "),
    detail: {
      total: topologyFixtureExpectations.length,
      failures,
    },
    note: "static/structural topology test using 42G exported fixture; live retrieval segregation is a real-data test register item",
  };
}

function verifyHealthcareSpecialistAttestationGate() {
  const { buildHealthcareIndustryTreatment } = loadHealthcareTreatment();
  const result = buildHealthcareIndustryTreatment(
    buildTreatmentBaseInput({
      topicIdentifier: "net_patient_service_revenue",
      industryClassification: "healthcare",
      industrySubClassification: "healthcare.acute_care_hospital",
      requiresSpecialistReview: true,
      treatmentStatus: "active",
      industryTreatmentComplete: true,
      reviewerAttestation: {
        primaryReviewer: {
          identity: "primary-reviewer-1",
          credentials: ["CPA"],
          reviewDate: "2026-06-01",
          scope: "healthcare treatment review",
        },
        specialistReviewRequired: true,
        specialistReviewer: null,
        attestationStatement: "primary attestation only",
        reviewedAgainstAuthoritativeSources: ["asc-606"],
        specialistReviewOptOutJustification: null,
      },
    }),
  );

  const rejected =
    result.industryTreatment === null ||
    result.industryTreatment.treatmentStatus !== "active" ||
    result.industryTreatment.industryTreatmentComplete !== true;

  return {
    passed: rejected,
    reason: rejected
      ? "healthcare treatment flagged requiresSpecialistReview active without specialistReviewer is rejected"
      : "expected active healthcare treatment without specialist reviewer to be rejected",
    detail: result,
  };
}

function verify340BCredentialGate() {
  const { buildHealthcareIndustryTreatment } = loadHealthcareTreatment();
  const result = buildHealthcareIndustryTreatment(
    buildTreatmentBaseInput({
      topicIdentifier: "drug_pricing_program_340b",
      industryClassification: "healthcare",
      industrySubClassification: "healthcare.acute_care_hospital",
      requiresSpecialistReview: true,
      treatmentStatus: "active",
      industryTreatmentComplete: true,
      reviewerAttestation: {
        primaryReviewer: {
          identity: "primary-reviewer-1",
          credentials: ["CPA"],
          reviewDate: "2026-06-01",
          scope: "340b treatment review",
        },
        specialistReviewRequired: true,
        specialistReviewer: {
          identity: "specialist-1",
          credentials: ["Healthcare compliance"],
          reviewDate: "2026-06-01",
          scope: "340b review",
          specialization: "healthcare_compliance",
        },
        attestationStatement: "primary and specialist attestation without 340b credential",
        reviewedAgainstAuthoritativeSources: ["hrsa-340b"],
        specialistReviewOptOutJustification: null,
      },
    }),
  );

  const rejected =
    result.industryTreatment === null ||
    result.industryTreatment.treatmentStatus !== "active" ||
    result.industryTreatment.industryTreatmentComplete !== true;

  return {
    passed: rejected,
    reason: rejected
      ? "340B treatment active without named 340B credential is rejected"
      : "expected 340B active treatment without 340B credential to be rejected",
    detail: result,
  };
}

function verifyGenericPrimaryAttestationGate() {
  const { buildGenericIndustryTreatment } = loadGenericTreatment();
  const result = buildGenericIndustryTreatment(
    buildTreatmentBaseInput({
      topicIdentifier: "professional_services_revenue_recognition",
      industryClassification: "generic",
      industrySubClassification: "generic.default",
      treatmentStatus: "active",
      industryTreatmentComplete: true,
      reviewerAttestation: {
        primaryReviewer: {
          identity: "",
          credentials: [],
          reviewDate: "",
          scope: "",
        },
        specialistReviewRequired: false,
        specialistReviewer: null,
        attestationStatement: "",
        reviewedAgainstAuthoritativeSources: [],
        specialistReviewOptOutJustification: null,
      },
    }),
  );

  const rejected =
    result.industryTreatment === null ||
    result.industryTreatment.treatmentStatus !== "active" ||
    result.industryTreatment.industryTreatmentComplete !== true;

  return {
    passed: rejected,
    reason: rejected
      ? "generic treatment active without primary attestation is rejected"
      : "expected generic active treatment without primary attestation to be rejected",
    detail: result,
  };
}

function verifyReasonablenessPathScopeRejection(pathScope) {
  if (pathScope === "path_a") {
    const { buildGenericReasonablenessBaseline, PATH_A_CONSUMED_LAUNCH_KPI_FAMILIES } = loadGenericReasonableness();
    const outsideFamily = "outside_launch_scope_family";
    if ((PATH_A_CONSUMED_LAUNCH_KPI_FAMILIES || []).includes(outsideFamily)) {
      return {
        passed: false,
        reason: "test fixture family unexpectedly inside PATH_A_CONSUMED_LAUNCH_KPI_FAMILIES",
      };
    }

    const result = buildGenericReasonablenessBaseline(
      buildReasonablenessBaseInput({
        baselineTopicIdentifier: "gross_margin_ranges_by_smb_segment",
        industryClassification: "generic",
        industrySubClassification: "generic.default",
        consumedByKpiFamily: outsideFamily,
        baselineStatus: "active",
        industryReasonablenessComplete: true,
      }),
    );

    const rejected = result.skipped === true || result.industryReasonableness === null;
    return {
      passed: rejected,
      reason: rejected
        ? "42L path_a baseline outside consumedByLaunchKpiFamilies rejected"
        : "expected 42L baseline outside launch scope to be rejected",
      detail: result,
    };
  }

  const { buildHealthcareReasonablenessBaseline, PATH_B_CONSUMED_LAUNCH_KPI_FAMILIES } =
    loadHealthcareReasonableness();
  const outsideFamily = "outside_launch_scope_family";
  if ((PATH_B_CONSUMED_LAUNCH_KPI_FAMILIES || []).includes(outsideFamily)) {
    return {
      passed: false,
      reason: "test fixture family unexpectedly inside PATH_B_CONSUMED_LAUNCH_KPI_FAMILIES",
    };
  }

  const result = buildHealthcareReasonablenessBaseline(
    buildReasonablenessBaseInput({
      baselineTopicIdentifier: "dso_ranges",
      industryClassification: "healthcare",
      industrySubClassification: "healthcare.acute_care_hospital",
      consumedByKpiFamily: outsideFamily,
      baselineStatus: "active",
      industryReasonablenessComplete: true,
    }),
  );

  const rejected = result.skipped === true || result.industryReasonableness === null;
  return {
    passed: rejected,
    reason: rejected
      ? "42P path_b baseline outside consumedByLaunchKpiFamilies rejected"
      : "expected 42P baseline outside launch scope to be rejected",
    detail: result,
  };
}

const checks = [
  checkMemoryReservationDirectoryExists,
  checkIndustryMemoryDimensionFileExists,
  checkMemoryReservationIndexExists,
  checkIndustryClassificationDimensionReservedMarker,
  checkIndustrySubClassificationDimensionReservedMarker,
  checkSchemaReservationOnlyMarker,
  checkWritesNoIndustrySpecificMemoryMarker,
  checkCompositeScopeKeyAndFrameworkPreservation,
  checkIsolationScopingMarkers,
  checkGranularAnalyticCategorySplit,
  checkTreatmentScopedIndustryCategories,
  checkContainsPhiAndPhiDerivationStatus,
  checkHandoffContinuityMarkers,
  checkExecutableLiteralFalse,
  checkNoBannedRuntimePatterns,
  checkAllPhase42ModuleDirectoriesAndFiles,
  checkContractDisciplineImports,
  checkNoContractTypesOutsideContracts,
  checkStableSnapshotHashImportDiscipline,
  checkBannedPatternsAcrossIndustryNamespace,
  checkNoLivePhiDetectionOutside42Q,
  checkModuleLiteralMarkers,
  checkCrossModuleBaseMarkers,
  checkRejectExecutableTrueMarkers,
  checkRejectContainsCopyrightedTextTrue,
  checkRejectOperationalKpiActiveAtLock,
  checkRejectNfpCommunityBenefitActive,
  checkRejectPhiTriggerContainsPhiFalseMapping,
  checkCompositionThreeOutcomeTests,
  checkPhiPropagationTest,
  checkTopologyFixtureTest,
  checkAttestationCredentialTests,
  checkReasonablenessPathScopeTests,
];

if (require.main === module) {
  runVerifier();
}

module.exports = {
  checks,
  checkMemoryReservationDirectoryExists,
  checkIndustryMemoryDimensionFileExists,
  checkMemoryReservationIndexExists,
  checkIndustryClassificationDimensionReservedMarker,
  checkIndustrySubClassificationDimensionReservedMarker,
  checkSchemaReservationOnlyMarker,
  checkWritesNoIndustrySpecificMemoryMarker,
  checkCompositeScopeKeyAndFrameworkPreservation,
  checkIsolationScopingMarkers,
  checkGranularAnalyticCategorySplit,
  checkTreatmentScopedIndustryCategories,
  checkContainsPhiAndPhiDerivationStatus,
  checkHandoffContinuityMarkers,
  checkExecutableLiteralFalse,
  checkNoBannedRuntimePatterns,
  checkAllPhase42ModuleDirectoriesAndFiles,
  checkContractDisciplineImports,
  checkNoContractTypesOutsideContracts,
  checkStableSnapshotHashImportDiscipline,
  checkBannedPatternsAcrossIndustryNamespace,
  checkNoLivePhiDetectionOutside42Q,
  checkModuleLiteralMarkers,
  checkCrossModuleBaseMarkers,
  checkRejectExecutableTrueMarkers,
  checkRejectContainsCopyrightedTextTrue,
  checkRejectOperationalKpiActiveAtLock,
  checkRejectNfpCommunityBenefitActive,
  checkRejectPhiTriggerContainsPhiFalseMapping,
  checkCompositionThreeOutcomeTests,
  checkPhiPropagationTest,
  checkTopologyFixtureTest,
  checkAttestationCredentialTests,
  checkReasonablenessPathScopeTests,
  classifyAnalyticComponentScope,
  isTreatmentScopedCategory,
  analyticCategories,
  treatmentScopedIndustryCategories,
  phiDerivationStatusValues,
  evaluateTopologyFixtureExpectation,
  artifactMatchesRetrievalScope,
  buildCompositionBaseInput,
  buildTreatmentBaseInput,
  buildReasonablenessBaseInput,
  completeDisplacementLineageEntry,
  verifyCompositionSpecializesOutcome,
  verifyCompositionDisplacementCompleteOutcome,
  verifyCompositionDisplacementIncompleteRejected,
  verifyCompositionContradictionOutcome,
  verifyPhiPropagationMostRestrictive,
  verifyTopologyFixtureExpectations,
  verifyHealthcareSpecialistAttestationGate,
  verify340BCredentialGate,
  verifyGenericPrimaryAttestationGate,
  verifyReasonablenessPathScopeRejection,
  checkBannedPatternsInSource,
  listTypeScriptFiles,
  readFile,
  isDirectory,
  isFile,
  hasValue,
  sourceHasOutputClassificationMarker,
  SYNTHETIC_BASE_FIXTURE,
  MODULES,
  MODULE_MARKER_CHECKS,
};

function runVerifier() {
  const results = checks.map((check) => check());
  const failures = results.filter((result) => !result.passed);
  const notes = results.filter((result) => result.passed && result.note);

  for (const result of results) {
    if (result.passed && result.detail && result.name && result.name.includes("composition")) {
      console.log(`OK ${result.name}: ${result.reason}`);
    }
    if (result.passed && result.detail && result.name && result.name.includes("topology")) {
      console.log(`OK ${result.name}: ${result.reason}`);
    }
    if (result.passed && result.detail && result.name && (result.name.includes("PHI propagation") || result.name.includes("attestation"))) {
      console.log(`OK ${result.name}: ${result.reason}`);
    }
    if (result.passed && result.detail && result.name && result.name.includes("path-scope")) {
      console.log(`OK ${result.name}: ${result.reason}`);
    }
  }

  for (const noteResult of notes) {
    console.log(`NOTE ${noteResult.note}`);
  }

  console.log(
    "NOTE composition/topology/PHI/attestation tests are static/structural; live retrieval, live PHI detection, and HIPAA controls are validated later (real-data test register / Phase 42.5)",
  );

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
}

function classifyAnalyticComponentScope(reservation, category, component) {
  const granularSplit = reservation?.analyticCategoriesGranularSplit;
  if (!granularSplit || !granularSplit[category]) {
    return null;
  }

  const componentScope = granularSplit[category][component];
  if (componentScope !== "industry_agnostic" && componentScope !== "industry_scoped") {
    return null;
  }

  return componentScope;
}

function isTreatmentScopedCategory(category, reservation) {
  const categories = reservation?.treatmentScopedMemoryCategories ?? treatmentScopedIndustryCategories;
  return categories.includes(category);
}

function checkMemoryReservationDirectoryExists() {
  return {
    name: "42A industry memory reservation directory exists",
    passed: isDirectory(memoryReservationDir),
    reason: "missing lib/intelligence/synthetic/industry/memory-reservation/",
  };
}

function checkIndustryMemoryDimensionFileExists() {
  return {
    name: "42A IndustryMemoryDimension.ts exists",
    passed: isFile(industryMemoryDimensionPath),
    reason: "missing IndustryMemoryDimension.ts",
  };
}

function checkMemoryReservationIndexExists() {
  return {
    name: "42A memory reservation index.ts exists",
    passed: isFile(memoryReservationIndexPath),
    reason: "missing memory-reservation/index.ts",
  };
}

function checkIndustryClassificationDimensionReservedMarker() {
  return sourceIncludesCheck(
    "42A industryClassificationDimensionReserved marker",
    "industryClassificationDimensionReserved: true",
    "missing industryClassificationDimensionReserved: true",
  );
}

function checkIndustrySubClassificationDimensionReservedMarker() {
  return sourceIncludesCheck(
    "42A industrySubClassificationDimensionReserved marker",
    "industrySubClassificationDimensionReserved: true",
    "missing industrySubClassificationDimensionReserved: true",
  );
}

function checkSchemaReservationOnlyMarker() {
  return sourceIncludesCheck(
    "42A schema reservation only marker",
    "schemaReservationOnly: true",
    "missing schemaReservationOnly: true",
  );
}

function checkWritesNoIndustrySpecificMemoryMarker() {
  return sourceIncludesCheck(
    "42A writes no industry-specific memory marker",
    "writesNoIndustrySpecificMemory: true",
    "missing writesNoIndustrySpecificMemory: true",
  );
}

function checkCompositeScopeKeyAndFrameworkPreservation() {
  const source = readIndustryMemoryDimensionSource();
  const hasCompositeScopeKey =
    source.includes("(customerIsolation, framework, industry, industrySubClassification)") &&
    source.includes("compositeScopeKeyForTreatmentScopedMemory");
  const hasFrameworkPreserved = source.includes("frameworkDimensionFrom41_5Preserved: true");

  return {
    name: "42A composite scope key and framework dimension preserved",
    passed: hasCompositeScopeKey && hasFrameworkPreserved,
    reason: hasCompositeScopeKey
      ? "missing frameworkDimensionFrom41_5Preserved: true"
      : "missing composite scope key (customerIsolation, framework, industry, industrySubClassification)",
  };
}

function checkIsolationScopingMarkers() {
  const source = readIndustryMemoryDimensionSource();
  const requiredMarkers = [
    "industryIsNotAnIsolationPeer: true",
    "isolationPeersUnchanged: true",
    "customerIsolation",
    "firmIsolation",
    "clientIsolation",
  ];
  const missingMarkers = requiredMarkers.filter((marker) => !source.includes(marker));

  return {
    name: "42A isolation scoping markers",
    passed: missingMarkers.length === 0,
    reason: `missing isolation scoping markers: ${missingMarkers.join(", ")}`,
  };
}

function checkGranularAnalyticCategorySplit() {
  const source = readIndustryMemoryDimensionSource();
  const missing = [];

  for (const category of analyticCategories) {
    if (!source.includes(category)) {
      missing.push(`${category} missing`);
      continue;
    }

    if (!source.includes("algorithm: \"industry_agnostic\"") && !source.includes("algorithm: 'industry_agnostic'")) {
      if (!source.includes("readonly algorithm: \"industry_agnostic\"")) {
        missing.push(`${category} algorithm scoping`);
      }
    }

    if (
      !source.includes("baselineParameters: \"industry_scoped\"") &&
      !source.includes("baselineParameters: 'industry_scoped'") &&
      !source.includes("readonly baselineParameters: \"industry_scoped\"")
    ) {
      missing.push(`${category} baselineParameters scoping`);
    }

    if (
      !source.includes("normalizationRules: \"industry_scoped\"") &&
      !source.includes("normalizationRules: 'industry_scoped'") &&
      !source.includes("readonly normalizationRules: \"industry_scoped\"")
    ) {
      missing.push(`${category} normalizationRules scoping`);
    }
  }

  if (!source.includes("AnalyticCategoriesGranularSplit")) {
    missing.push("AnalyticCategoriesGranularSplit type");
  }

  return {
    name: "42A granular analytic-category split",
    passed: missing.length === 0,
    reason: missing.join("; "),
  };
}

function checkTreatmentScopedIndustryCategories() {
  const source = readIndustryMemoryDimensionSource();
  const missingCategories = treatmentScopedIndustryCategories.filter((category) => !source.includes(category));

  return {
    name: "42A treatment-scoped industry categories exhaustive",
    passed: missingCategories.length === 0 && source.includes("TreatmentScopedIndustryCategoryList"),
    reason:
      missingCategories.length > 0
        ? `missing treatment-scoped categories: ${missingCategories.join(", ")}`
        : "missing TreatmentScopedIndustryCategoryList type",
  };
}

function checkContainsPhiAndPhiDerivationStatus() {
  const source = readIndustryMemoryDimensionSource();
  const missingPhiValues = phiDerivationStatusValues.filter((value) => !source.includes(value));

  return {
    name: "42A containsPHI and phiDerivationStatus enum",
    passed:
      source.includes("containsPHI") &&
      source.includes("phiDerivationStatus") &&
      source.includes("PhiDerivationStatus") &&
      missingPhiValues.length === 0,
    reason:
      missingPhiValues.length > 0
        ? `missing phiDerivationStatus values: ${missingPhiValues.join(", ")}`
        : "missing containsPHI or phiDerivationStatus",
  };
}

function checkHandoffContinuityMarkers() {
  const source = readIndustryMemoryDimensionSource();

  return {
    name: "42A Phase 40, 40.5, and 41.5 handoff continuity",
    passed:
      source.includes("boundPhase40SnapshotHash") &&
      source.includes("boundPhase40_5SnapshotHash") &&
      source.includes("boundPhase41_5SnapshotHash"),
    reason: "missing boundPhase40SnapshotHash, boundPhase40_5SnapshotHash, or boundPhase41_5SnapshotHash",
  };
}

function checkExecutableLiteralFalse() {
  const source = readIndustryMemoryDimensionSource();

  return {
    name: "42A executable literal false",
    passed: source.includes("executable: false") && !source.includes("executable: boolean"),
    reason: "IndustryMemoryDimension.ts must type executable as literal false, not boolean",
  };
}

function checkNoBannedRuntimePatterns() {
  return checkBannedPatternsInSource("42A industry memory-reservation", readIndustryMemoryDimensionSource());
}

function checkAllPhase42ModuleDirectoriesAndFiles() {
  const violations = [];

  for (const moduleEntry of MODULES) {
    const moduleDir = path.join(industryRoot, moduleEntry.id);
    if (!isDirectory(moduleDir)) {
      violations.push(`${moduleEntry.phase} missing directory ${moduleEntry.id}/`);
      continue;
    }

    for (const fileName of moduleEntry.files) {
      const filePath = path.join(moduleDir, fileName);
      if (!isFile(filePath)) {
        violations.push(`${moduleEntry.phase} missing ${moduleEntry.id}/${fileName}`);
      }
    }
  }

  return {
    name: "42A-42Q module directories and required files exist",
    passed: violations.length === 0,
    reason: violations.slice(0, 10).join("; "),
  };
}

function checkContractDisciplineImports() {
  const violations = [];

  for (const filePath of collectBuilderSourceFiles()) {
    const relativePath = path.relative(industryRoot, filePath).replace(/\\/g, "/");
    if (relativePath.startsWith("contracts/")) {
      continue;
    }

    const source = readFile(filePath);
    const importLines = source.split("\n").filter((line) => line.trim().startsWith("import "));

    for (const importLine of importLines) {
      for (const contractType of INDUSTRY_CONTRACT_TYPE_IMPORTS) {
        if (!importLine.includes(contractType)) {
          continue;
        }

        const allowed =
          /from\s+["'](?:\.\.\/)+contracts(?:\/index)?["']/.test(importLine) ||
          /from\s+["']\.\.\/contracts(?:\/index)?["']/.test(importLine) ||
          /from\s+["']\.\/contracts(?:\/index)?["']/.test(importLine);

        if (!allowed) {
          violations.push(`${relativePath}: ${contractType} must import from contracts only (${importLine.trim()})`);
        }
      }
    }
  }

  return {
    name: "contract discipline imports from 42B only",
    passed: violations.length === 0,
    reason: violations.slice(0, 8).join("; "),
  };
}

function checkNoContractTypesOutsideContracts() {
  const violations = [];

  for (const filePath of collectBuilderSourceFiles()) {
    const relativePath = path.relative(industryRoot, filePath).replace(/\\/g, "/");
    if (relativePath.startsWith("contracts/")) {
      continue;
    }

    const source = readFile(filePath);
    if (/\binterface\s+\w+Contract\b/.test(source) || /\btype\s+\w+Contract\b/.test(source)) {
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

  for (const filePath of collectBuilderSourceFiles()) {
    const relativePath = path.relative(industryRoot, filePath).replace(/\\/g, "/");
    const source = readFile(filePath);
    if (!source.includes("stableSnapshotHash")) {
      continue;
    }

    const importMatch = source.match(/import\s+\{[^}]*stableSnapshotHash[^}]*\}\s+from\s+["'][^"']+["']/);
    const validImport =
      importMatch &&
      /from\s+["'](?:\.\.\/)+core\/hash["']/.test(importMatch[0]) &&
      !/from\s+["'][^"']*contracts[^"']*["']/.test(importMatch[0]);

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

function checkBannedPatternsAcrossIndustryNamespace() {
  const violations = [];

  for (const filePath of listTypeScriptFiles(industryRoot)) {
    const relativePath = path.relative(industryRoot, filePath).replace(/\\/g, "/");
    const result = checkBannedPatternsInSource(relativePath, readFile(filePath));
    if (!result.passed) {
      violations.push(`${relativePath}: ${result.reason}`);
    }
  }

  return {
    name: "banned runtime patterns across Phase 42 namespace",
    passed: violations.length === 0,
    reason: violations.slice(0, 8).join("; "),
  };
}

function checkNoLivePhiDetectionOutside42Q() {
  const livePhiPatterns = [
    ["live PHI detection call", /\bdetect(?:Live)?Phi\s*\(/i],
    ["live HIPAA control implementation", /\b(?:implement|enforce|apply)Hipaa(?:Control|Compliance)?\s*\(/i],
    ["runtime PHI classifier", /\bclassify(?:Live)?Phi(?:Data)?\s*\(/i],
  ];
  const violations = [];

  for (const filePath of listTypeScriptFiles(industryRoot)) {
    const relativePath = path.relative(industryRoot, filePath).replace(/\\/g, "/");
    if (relativePath.startsWith("phi-healthcare/")) {
      continue;
    }

    const source = readFile(filePath);
    for (const [label, pattern] of livePhiPatterns) {
      if (pattern.test(source)) {
        violations.push(`${relativePath}: ${label}`);
      }
    }
  }

  const phiHealthcareSource = readFile(path.join(industryRoot, "phi-healthcare", "buildHealthcarePHIDiscipline.ts"));
  const phiQValid =
    phiHealthcareSource.includes("hipaaControlsImplementedByPhase42_5NotHere: true") &&
    phiHealthcareSource.includes("performs no live PHI detection");

  return {
    name: "no live PHI detection / HIPAA control implementation in industry layer (42Q interfaces only)",
    passed: violations.length === 0 && phiQValid,
    reason:
      violations.length > 0
        ? violations.slice(0, 6).join("; ")
        : phiQValid
          ? ""
          : "42Q missing hipaaControlsImplementedByPhase42_5NotHere or live-detection disclaimer",
  };
}

function checkModuleLiteralMarkers() {
  const violations = [];

  for (const entry of MODULE_MARKER_CHECKS) {
    const filePath = path.join(industryRoot, entry.file);
    const source = readFile(filePath);
    const missingMarkers = entry.markers.filter((marker) => !source.includes(marker));

    if (missingMarkers.length > 0) {
      violations.push(`${entry.phase} ${entry.file}: ${missingMarkers.join(", ")}`);
    }
  }

  return {
    name: "per-module required literal markers (42C-42Q)",
    passed: violations.length === 0,
    reason: violations.slice(0, 8).join("; "),
  };
}

function sourceHasOutputClassificationMarker(source) {
  return (
    source.includes('output_classification: "recommendation_for_human_review"') ||
    (source.includes("output_classification: OUTPUT_CLASSIFICATION") &&
      source.includes('"recommendation_for_human_review"'))
  );
}

function checkCrossModuleBaseMarkers() {
  const violations = [];

  for (const filePath of collectPrimaryBuilderSourceFiles()) {
    const relativePath = path.relative(industryRoot, filePath).replace(/\\/g, "/");
    const source = readFile(filePath);
    const missingMarkers = CROSS_MODULE_BASE_MARKERS.filter((marker) => !source.includes(marker));

    if (missingMarkers.length > 0) {
      violations.push(`${relativePath}: ${missingMarkers.join(", ")}`);
    }

    if (!sourceHasOutputClassificationMarker(source)) {
      violations.push(`${relativePath}: output_classification recommendation_for_human_review`);
    }
  }

  return {
    name: "cross-module base markers on every primary builder output",
    passed: violations.length === 0,
    reason: violations.slice(0, 8).join("; "),
  };
}

function checkRejectExecutableTrueMarkers() {
  const violations = [];

  for (const filePath of collectPrimaryBuilderSourceFiles()) {
    const relativePath = path.relative(industryRoot, filePath).replace(/\\/g, "/");
    const source = readFile(filePath);
    if (/executable:\s*true/.test(source)) {
      violations.push(relativePath);
    }
  }

  return {
    name: "reject executable true markers",
    passed: violations.length === 0,
    reason: `executable: true found in: ${violations.join(", ")}`,
  };
}

function checkRejectContainsCopyrightedTextTrue() {
  const violations = [];

  for (const filePath of collectPrimaryBuilderSourceFiles()) {
    const relativePath = path.relative(industryRoot, filePath).replace(/\\/g, "/");
    const source = readFile(filePath);
    if (/containsCopyrightedText:\s*true/.test(source)) {
      violations.push(relativePath);
    }
  }

  return {
    name: "reject containsCopyrightedText true on treatments/disclosures",
    passed: violations.length === 0,
    reason: `containsCopyrightedText: true found in: ${violations.join(", ")}`,
  };
}

function checkRejectOperationalKpiActiveAtLock() {
  const source = readFile(path.join(industryRoot, "kpi", "healthcare-operational", "buildHealthcareOperationalKPI.ts"));
  const rejectsActiveAtLock =
    source.includes("noOperationalKpiActiveAtLock: true") &&
    source.includes('kpiStatus: "deferred"') &&
    !/kpiStatus:\s*"active"/.test(source.replace(/input\.kpiStatus === "active"/g, ""));

  return {
    name: "42N2 operational KPI deferred stub — empty slot intentional, not active at lock",
    passed: rejectsActiveAtLock,
    reason: rejectsActiveAtLock
      ? ""
      : "42N2 must keep deferred stub with noOperationalKpiActiveAtLock and no active kpiStatus emission",
  };
}

function checkRejectNfpCommunityBenefitActive() {
  const source = readFile(
    path.join(industryRoot, "disclosure-variants", "healthcare", "buildHealthcareDisclosureVariant.ts"),
  );
  const hasBoundaryGuard =
    source.includes("community_benefit_for_for_profit_healthcare") &&
    source.includes("ifRequires501c3OrAsc958ThenOutOfScope: true") &&
    source.includes("nfpFundAccountingIsOutOfScope: true");

  const blueprintActiveViolation = /community_benefit_for_for_profit_healthcare[\s\S]{0,200}disclosureStatus:\s*"active"/.test(
    source,
  );

  return {
    name: "reject NFP/ASC958 community-benefit variant active at lock",
    passed: hasBoundaryGuard && !blueprintActiveViolation,
    reason: hasBoundaryGuard
      ? blueprintActiveViolation
        ? "community_benefit_for_for_profit_healthcare marked active in blueprint"
        : ""
      : "missing NFP boundary test guard markers in 42O",
  };
}

function checkRejectPhiTriggerContainsPhiFalseMapping() {
  const phiHealthcareSource = readFile(path.join(industryRoot, "phi-healthcare", "buildHealthcarePHIDiscipline.ts"));
  const phiTagSource = readFile(path.join(industryRoot, "phi-tagging", "buildPHITag.ts"));

  const hasBelowCellSizeGuard =
    phiHealthcareSource.includes("aggregated_metrics_below_minimum_cell_size must map to containsPHI true") &&
    phiHealthcareSource.includes("resultingContainsPHI === true");

  const hasMisclassificationGuard =
    phiTagSource.includes("misclassificationProducesFailClosedSignal: true") &&
    phiTagSource.includes("belowMinimumCellSizeRemainsPhi: true");

  const falseMappingViolation = /triggeringCharacteristics[\s\S]{0,300}containsPHI:\s*false/.test(phiHealthcareSource);

  return {
    name: "reject triggering-characteristic-with-containsPHI-false mapping",
    passed: hasBelowCellSizeGuard && hasMisclassificationGuard && !falseMappingViolation,
    reason:
      hasBelowCellSizeGuard && hasMisclassificationGuard && !falseMappingViolation
        ? ""
        : "PHI trigger mapping must not map triggering characteristics to containsPHI false",
  };
}

function checkCompositionThreeOutcomeTests() {
  const specializes = verifyCompositionSpecializesOutcome();
  const displacementComplete = verifyCompositionDisplacementCompleteOutcome();
  const displacementRejected = verifyCompositionDisplacementIncompleteRejected();
  const contradiction = verifyCompositionContradictionOutcome();

  const passed =
    specializes.passed && displacementComplete.passed && displacementRejected.passed && contradiction.passed;

  return {
    name: "composition three-outcome static construction tests",
    passed,
    reason: [
      specializes.passed ? null : specializes.reason,
      displacementComplete.passed ? null : displacementComplete.reason,
      displacementRejected.passed ? null : displacementRejected.reason,
      contradiction.passed ? null : contradiction.reason,
    ]
      .filter(Boolean)
      .join("; "),
    detail: {
      specializes,
      displacementComplete,
      displacementRejected,
      contradiction,
    },
  };
}

function checkPhiPropagationTest() {
  const result = verifyPhiPropagationMostRestrictive();

  return {
    name: "PHI propagation most-restrictive static construction test",
    passed: result.passed,
    reason: result.reason,
    detail: result,
  };
}

function checkTopologyFixtureTest() {
  const result = verifyTopologyFixtureExpectations();

  return {
    name: "42G topology fixture static segregation test",
    passed: result.passed,
    reason: result.reason,
    detail: result.detail,
    note: result.note,
  };
}

function checkAttestationCredentialTests() {
  const specialist = verifyHealthcareSpecialistAttestationGate();
  const credential340B = verify340BCredentialGate();
  const genericPrimary = verifyGenericPrimaryAttestationGate();

  const passed = specialist.passed && credential340B.passed && genericPrimary.passed;

  return {
    name: "attestation and credential static construction tests",
    passed,
    reason: [
      specialist.passed ? null : specialist.reason,
      credential340B.passed ? null : credential340B.reason,
      genericPrimary.passed ? null : genericPrimary.reason,
    ]
      .filter(Boolean)
      .join("; "),
    detail: {
      specialist,
      credential340B,
      genericPrimary,
    },
  };
}

function checkReasonablenessPathScopeTests() {
  const pathA = verifyReasonablenessPathScopeRejection("path_a");
  const pathB = verifyReasonablenessPathScopeRejection("path_b");
  const passed = pathA.passed && pathB.passed;

  return {
    name: "reasonableness path-scope static construction tests (42L path_a, 42P path_b)",
    passed,
    reason: [pathA.passed ? null : pathA.reason, pathB.passed ? null : pathB.reason].filter(Boolean).join("; "),
    detail: {
      pathA,
      pathB,
    },
  };
}

function checkBannedPatternsInSource(label, source) {
  const bannedPatterns = [
    ["AI model client import", /\bimport\s+.*?\s+from\s+["'](?:openai|@openai|anthropic|@anthropic|langchain|@langchain)[^"']*["']/i],
    ["database client import", /\bimport\s+.*?\s+from\s+["'](?:@prisma\/client|prisma|drizzle-orm|mongoose|pg|mysql2|sqlite3|better-sqlite3)[^"']*["']/i],
    ["fetch call", /\bfetch\s*\(/],
    ["axios call or import", /\baxios\b/],
    ["file system write call", /\b(?:writeFile|appendFile|createWriteStream|mkdir|rm|unlink|rename)\s*\(/],
    ["memory write call", /\b(?:writeMemory|storeMemory|persistMemory|saveMemory|upsertMemory|createMemory)\s*\(/i],
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
    passed: readIndustryMemoryDimensionSource().includes(marker),
    reason,
  };
}

function collectBuilderSourceFiles() {
  return listTypeScriptFiles(industryRoot).filter((filePath) => filePath.endsWith(".ts"));
}

function collectPrimaryBuilderSourceFiles() {
  return collectBuilderSourceFiles().filter((filePath) => isPrimaryBuilderFile(filePath));
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

function readIndustryMemoryDimensionSource() {
  return readFile(industryMemoryDimensionPath);
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}
