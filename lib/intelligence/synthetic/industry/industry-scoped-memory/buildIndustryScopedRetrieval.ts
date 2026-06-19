import { stableSnapshotHash } from "../../../core/hash";
import type {
  IndustryBaseContract,
  PhiDerivationStatus,
  RecommendationOutputClassification,
} from "../contracts";

export type RetrievalCategoryClass =
  | "treatment_scoped"
  | "agnostic_algorithm"
  | "scoped_baseline_parameters"
  | "scoped_normalization_rules";

export type IndustryRetrievalStatus =
  | "resolved"
  | "fail_closed_scope_unspecified"
  | "fail_closed_category_unknown";

export const COMPOSITE_SCOPE_KEY_ORDERED =
  "(customerIsolation, framework, industry, subClassification)" as const;

export const TREATMENT_SCOPED_INDUSTRY_CATEGORIES = [
  "revenue_recognition_industry_overlay",
  "reserve_and_allowance_patterns",
  "industry_specific_cost_accounting",
  "industry_specific_disclosure_patterns",
  "industry_specific_reasonableness_application",
] as const;

export const ANALYTIC_INDUSTRY_CATEGORIES = [
  "fraud_detection",
  "obvious_error_reasonableness",
  "fte_to_payroll_consistency",
  "vendor_duplicate_detection",
  "structural_anomaly_patterns",
] as const;

export type TreatmentScopedIndustryCategory = (typeof TREATMENT_SCOPED_INDUSTRY_CATEGORIES)[number];
export type AnalyticIndustryCategory = (typeof ANALYTIC_INDUSTRY_CATEGORIES)[number];

export interface SyntheticRetrievalCandidateArtifact {
  artifactReferenceId: string;
  customerIsolation: string;
  framework: IndustryBaseContract["reportingFramework"] | "";
  industry: string;
  subClassification: string;
  retrievalCategory: string;
  retrievalCategoryClass: RetrievalCategoryClass;
  containsPHI: boolean;
  healthcareAwareRetrievalPathRequired: boolean;
}

export interface TopologyEntityScope {
  entityId: string;
  customerIsolation: string;
  framework: IndustryBaseContract["reportingFramework"];
  industry: string;
  subClassification: string;
  secondaryFramework?: IndustryBaseContract["reportingFramework"];
}

export interface TopologyFixtureExpectation {
  expectationId: string;
  description: string;
  sourceEntityId: string;
  sourceFramework?: IndustryBaseContract["reportingFramework"];
  targetArtifactReferenceId: string;
  expectedRetrievable: boolean;
  segregationDimension:
    | "none"
    | "cross_sub_classification"
    | "cross_industry"
    | "cross_framework"
    | "cross_customer"
    | "phi_non_healthcare_aware"
    | "reclassification_memory_segregation";
  queryEffectiveDate?: string;
  healthcareAwareRetrievalPath?: boolean;
}

export interface BuildIndustryScopedRetrievalInput extends Partial<IndustryBaseContract> {
  retrievalCategory?: string;
  retrievalCategoryClass?: RetrievalCategoryClass;
  queryCustomerIsolation?: string;
  queryFramework?: IndustryBaseContract["reportingFramework"] | "";
  queryIndustry?: string;
  querySubClassification?: string;
  queryEffectiveDate?: string;
  entityId?: string;
  agnosticScopedDeclarationReferenceId?: string;
  candidateArtifacts?: SyntheticRetrievalCandidateArtifact[];
  healthcareAwareRetrievalPath?: boolean;
  industryScopedRetrievalComplete?: boolean;
}

export interface SyntheticIndustryScopedRetrieval extends IndustryBaseContract {
  industryScopedRetrievalId: string;
  industryScopedRetrievalKey: string;
  retrievalCategory: string;
  retrievalCategoryClass: RetrievalCategoryClass;
  queryCustomerIsolation: string;
  queryFramework: IndustryBaseContract["reportingFramework"] | "";
  queryIndustry: string;
  querySubClassification: string;
  compositeScopeKeyForTreatmentScoped: typeof COMPOSITE_SCOPE_KEY_ORDERED;
  treatmentScopedFiltersOnCompositeKey: true;
  agnosticAlgorithmFiltersOnCustomerIsolationOnly: true;
  scopedComponentFiltersOnCompositeKey: true;
  categoryClassDeterminesScope: true;
  retrievalRequiresFrameworkAndIndustrySpecified: true;
  failsClosedWhenScopeUnspecified: true;
  crossIsolationRetrievalReturnsEmpty: true;
  crossFrameworkRetrievalReturnsEmpty: true;
  crossIndustryRetrievalReturnsEmpty: true;
  crossSubClassificationRetrievalReturnsEmpty: true;
  neverFallsBackAcrossAnyScopingDimension: true;
  phiNeverAppearsInNonHealthcareAwareRetrieval: true;
  retrievedArtifactReferenceIds: string[];
  excludedByScopeReferenceIds: string[];
  retrievalStatus: IndustryRetrievalStatus;
  agnosticScopedDeclarationReferenceId: string;
  industryScopedRetrievalComplete: boolean;
}

export interface BuildIndustryScopedRetrievalResult {
  industryScopedRetrieval: SyntheticIndustryScopedRetrieval | null;
  skipped: boolean;
  warnings: string[];
}

export const TOPOLOGY_CUSTOMER_ISOLATION = "customer-topology-001";

export const TOPOLOGY_FIXTURE_ENTITY_SCOPES: readonly TopologyEntityScope[] = [
  {
    entityId: "entity-a",
    customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    framework: "us_gaap",
    industry: "generic",
    subClassification: "generic.default",
  },
  {
    entityId: "entity-b",
    customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    framework: "ifrs_for_smes",
    industry: "generic",
    subClassification: "generic.default",
  },
  {
    entityId: "entity-c-primary",
    customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    framework: "us_gaap",
    industry: "healthcare",
    subClassification: "healthcare.acute_care_hospital",
    secondaryFramework: "ifrs_iasb",
  },
  {
    entityId: "entity-c-secondary",
    customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    framework: "ifrs_iasb",
    industry: "healthcare",
    subClassification: "healthcare.acute_care_hospital",
  },
  {
    entityId: "entity-d",
    customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    framework: "us_gaap",
    industry: "healthcare",
    subClassification: "healthcare.physician_practice",
  },
  {
    entityId: "entity-e",
    customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    framework: "us_gaap",
    industry: "generic",
    subClassification: "generic.default",
  },
];

export const ENTITY_E_RECLASSIFICATION_EFFECTIVE_DATE = "2026-01-01";

export const TOPOLOGY_FIXTURE_ARTIFACTS: readonly SyntheticRetrievalCandidateArtifact[] = [
  {
    artifactReferenceId: "artifact-a-treatment-us_gaap-generic",
    customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    framework: "us_gaap",
    industry: "generic",
    subClassification: "generic.default",
    retrievalCategory: "revenue_recognition_industry_overlay",
    retrievalCategoryClass: "treatment_scoped",
    containsPHI: false,
    healthcareAwareRetrievalPathRequired: false,
  },
  {
    artifactReferenceId: "artifact-b-treatment-ifrs_for_smes-generic",
    customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    framework: "ifrs_for_smes",
    industry: "generic",
    subClassification: "generic.default",
    retrievalCategory: "revenue_recognition_industry_overlay",
    retrievalCategoryClass: "treatment_scoped",
    containsPHI: false,
    healthcareAwareRetrievalPathRequired: false,
  },
  {
    artifactReferenceId: "artifact-c-primary-treatment-us_gaap-healthcare-acute",
    customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    framework: "us_gaap",
    industry: "healthcare",
    subClassification: "healthcare.acute_care_hospital",
    retrievalCategory: "revenue_recognition_industry_overlay",
    retrievalCategoryClass: "treatment_scoped",
    containsPHI: true,
    healthcareAwareRetrievalPathRequired: true,
  },
  {
    artifactReferenceId: "artifact-c-secondary-treatment-ifrs_iasb-healthcare-acute",
    customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    framework: "ifrs_iasb",
    industry: "healthcare",
    subClassification: "healthcare.acute_care_hospital",
    retrievalCategory: "revenue_recognition_industry_overlay",
    retrievalCategoryClass: "treatment_scoped",
    containsPHI: true,
    healthcareAwareRetrievalPathRequired: true,
  },
  {
    artifactReferenceId: "artifact-d-treatment-us_gaap-healthcare-physician",
    customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    framework: "us_gaap",
    industry: "healthcare",
    subClassification: "healthcare.physician_practice",
    retrievalCategory: "revenue_recognition_industry_overlay",
    retrievalCategoryClass: "treatment_scoped",
    containsPHI: true,
    healthcareAwareRetrievalPathRequired: true,
  },
  {
    artifactReferenceId: "artifact-e-pre-treatment-generic",
    customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    framework: "us_gaap",
    industry: "generic",
    subClassification: "generic.default",
    retrievalCategory: "revenue_recognition_industry_overlay",
    retrievalCategoryClass: "treatment_scoped",
    containsPHI: false,
    healthcareAwareRetrievalPathRequired: false,
  },
  {
    artifactReferenceId: "artifact-e-post-treatment-healthcare-asc",
    customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    framework: "us_gaap",
    industry: "healthcare",
    subClassification: "healthcare.ambulatory_surgery_center",
    retrievalCategory: "revenue_recognition_industry_overlay",
    retrievalCategoryClass: "treatment_scoped",
    containsPHI: true,
    healthcareAwareRetrievalPathRequired: true,
  },
  {
    artifactReferenceId: "artifact-fraud-algorithm-shared",
    customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    framework: "",
    industry: "",
    subClassification: "",
    retrievalCategory: "fraud_detection",
    retrievalCategoryClass: "agnostic_algorithm",
    containsPHI: false,
    healthcareAwareRetrievalPathRequired: false,
  },
  {
    artifactReferenceId: "artifact-fraud-baseline-generic-us_gaap",
    customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    framework: "us_gaap",
    industry: "generic",
    subClassification: "generic.default",
    retrievalCategory: "fraud_detection",
    retrievalCategoryClass: "scoped_baseline_parameters",
    containsPHI: false,
    healthcareAwareRetrievalPathRequired: false,
  },
  {
    artifactReferenceId: "artifact-fraud-baseline-healthcare-us_gaap-acute",
    customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    framework: "us_gaap",
    industry: "healthcare",
    subClassification: "healthcare.acute_care_hospital",
    retrievalCategory: "fraud_detection",
    retrievalCategoryClass: "scoped_baseline_parameters",
    containsPHI: false,
    healthcareAwareRetrievalPathRequired: false,
  },
  {
    artifactReferenceId: "artifact-other-customer-treatment",
    customerIsolation: "customer-topology-002",
    framework: "us_gaap",
    industry: "generic",
    subClassification: "generic.default",
    retrievalCategory: "revenue_recognition_industry_overlay",
    retrievalCategoryClass: "treatment_scoped",
    containsPHI: false,
    healthcareAwareRetrievalPathRequired: false,
  },
];

const OUTPUT_CLASSIFICATION: RecommendationOutputClassification = "recommendation_for_human_review";
const DEFAULT_PHI_DERIVATION_STATUS: PhiDerivationStatus = "containsPHI";

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function getPhiDerivationStatus(inputPhiDerivationStatus: PhiDerivationStatus | undefined): PhiDerivationStatus {
  return inputPhiDerivationStatus ?? DEFAULT_PHI_DERIVATION_STATUS;
}

function isTreatmentScopedCategory(category: string): category is TreatmentScopedIndustryCategory {
  return (TREATMENT_SCOPED_INDUSTRY_CATEGORIES as readonly string[]).includes(category);
}

function isAnalyticCategory(category: string): category is AnalyticIndustryCategory {
  return (ANALYTIC_INDUSTRY_CATEGORIES as readonly string[]).includes(category);
}

export function classifyRetrievalCategory(
  retrievalCategory: string,
  retrievalCategoryClass?: RetrievalCategoryClass,
): RetrievalCategoryClass | null {
  if (retrievalCategoryClass) {
    if (isTreatmentScopedCategory(retrievalCategory) && retrievalCategoryClass !== "treatment_scoped") {
      return null;
    }

    if (isAnalyticCategory(retrievalCategory) && retrievalCategoryClass === "treatment_scoped") {
      return null;
    }

    return retrievalCategoryClass;
  }

  if (isTreatmentScopedCategory(retrievalCategory)) {
    return "treatment_scoped";
  }

  return null;
}

export function resolveEntityEScope(queryEffectiveDate: string | undefined): {
  industry: string;
  subClassification: string;
} {
  if (!hasValue(queryEffectiveDate) || (queryEffectiveDate as string) < ENTITY_E_RECLASSIFICATION_EFFECTIVE_DATE) {
    return { industry: "generic", subClassification: "generic.default" };
  }

  return {
    industry: "healthcare",
    subClassification: "healthcare.ambulatory_surgery_center",
  };
}

export function resolveTopologyEntityScope(
  entityId: string,
  sourceFramework?: IndustryBaseContract["reportingFramework"],
  queryEffectiveDate?: string,
): TopologyEntityScope | null {
  if (entityId === "entity-e") {
    const resolved = resolveEntityEScope(queryEffectiveDate);
    return {
      entityId: "entity-e",
      customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
      framework: "us_gaap",
      industry: resolved.industry,
      subClassification: resolved.subClassification,
    };
  }

  if (entityId === "entity-c-primary" || entityId === "entity-c-secondary") {
    const match = TOPOLOGY_FIXTURE_ENTITY_SCOPES.find((scope) => scope.entityId === entityId);
    if (!match) {
      return null;
    }

    if (sourceFramework) {
      return sourceFramework === "ifrs_iasb"
        ? TOPOLOGY_FIXTURE_ENTITY_SCOPES.find((scope) => scope.entityId === "entity-c-secondary") ?? null
        : TOPOLOGY_FIXTURE_ENTITY_SCOPES.find((scope) => scope.entityId === "entity-c-primary") ?? null;
    }

    return match;
  }

  return TOPOLOGY_FIXTURE_ENTITY_SCOPES.find((scope) => scope.entityId === entityId) ?? null;
}

export function artifactMatchesCompositeScope(
  artifact: SyntheticRetrievalCandidateArtifact,
  queryCustomerIsolation: string,
  queryFramework: string,
  queryIndustry: string,
  querySubClassification: string,
): boolean {
  return (
    artifact.customerIsolation === queryCustomerIsolation &&
    artifact.framework === queryFramework &&
    artifact.industry === queryIndustry &&
    artifact.subClassification === querySubClassification
  );
}

export function artifactMatchesRetrievalScope(
  artifact: SyntheticRetrievalCandidateArtifact,
  input: {
    retrievalCategory: string;
    retrievalCategoryClass: RetrievalCategoryClass;
    queryCustomerIsolation: string;
    queryFramework: string;
    queryIndustry: string;
    querySubClassification: string;
    healthcareAwareRetrievalPath: boolean;
  },
): boolean {
  if (artifact.retrievalCategory !== input.retrievalCategory) {
    return false;
  }

  if (artifact.customerIsolation !== input.queryCustomerIsolation) {
    return false;
  }

  if (
    artifact.containsPHI &&
    artifact.healthcareAwareRetrievalPathRequired &&
    !input.healthcareAwareRetrievalPath
  ) {
    return false;
  }

  if (input.retrievalCategoryClass === "agnostic_algorithm") {
    return artifact.retrievalCategoryClass === "agnostic_algorithm";
  }

  if (
    input.retrievalCategoryClass === "treatment_scoped" ||
    input.retrievalCategoryClass === "scoped_baseline_parameters" ||
    input.retrievalCategoryClass === "scoped_normalization_rules"
  ) {
    return (
      artifact.retrievalCategoryClass === input.retrievalCategoryClass &&
      artifactMatchesCompositeScope(
        artifact,
        input.queryCustomerIsolation,
        input.queryFramework,
        input.queryIndustry,
        input.querySubClassification,
      )
    );
  }

  return false;
}

export function evaluateArtifactRetrievability(input: BuildIndustryScopedRetrievalInput, artifactReferenceId: string): boolean {
  const artifact = getInputArray(input.candidateArtifacts).find(
    (candidate) => candidate.artifactReferenceId === artifactReferenceId,
  );

  if (!artifact) {
    return false;
  }

  const outcome = resolveRetrievalOutcome(input);
  if (outcome.retrievalStatus !== "resolved") {
    return false;
  }

  return outcome.retrievedArtifactReferenceIds.includes(artifactReferenceId);
}

function requiresFrameworkAndIndustry(categoryClass: RetrievalCategoryClass): boolean {
  return (
    categoryClass === "treatment_scoped" ||
    categoryClass === "scoped_baseline_parameters" ||
    categoryClass === "scoped_normalization_rules"
  );
}

function resolveRetrievalOutcome(input: BuildIndustryScopedRetrievalInput): {
  retrievalCategoryClass: RetrievalCategoryClass;
  retrievalStatus: IndustryRetrievalStatus;
  retrievedArtifactReferenceIds: string[];
  excludedByScopeReferenceIds: string[];
} {
  const retrievalCategory = input.retrievalCategory ?? "";
  const retrievalCategoryClass = classifyRetrievalCategory(retrievalCategory, input.retrievalCategoryClass);

  if (!retrievalCategoryClass) {
    return {
      retrievalCategoryClass: "treatment_scoped",
      retrievalStatus: "fail_closed_category_unknown",
      retrievedArtifactReferenceIds: [],
      excludedByScopeReferenceIds: getInputArray(input.candidateArtifacts).map(
        (artifact) => artifact.artifactReferenceId,
      ),
    };
  }

  let queryCustomerIsolation = input.queryCustomerIsolation ?? "";
  let queryFramework = input.queryFramework ?? "";
  let queryIndustry = input.queryIndustry ?? "";
  let querySubClassification = input.querySubClassification ?? "";

  if (hasValue(input.entityId)) {
    const entityScope = resolveTopologyEntityScope(
      input.entityId as string,
      input.queryFramework || undefined,
      input.queryEffectiveDate,
    );

    if (entityScope) {
      queryCustomerIsolation = entityScope.customerIsolation;
      queryFramework = entityScope.framework;
      queryIndustry = entityScope.industry;
      querySubClassification = entityScope.subClassification;
    }
  }

  if (
    requiresFrameworkAndIndustry(retrievalCategoryClass) &&
    (!hasValue(queryFramework) || !hasValue(queryIndustry))
  ) {
    return {
      retrievalCategoryClass,
      retrievalStatus: "fail_closed_scope_unspecified",
      retrievedArtifactReferenceIds: [],
      excludedByScopeReferenceIds: getInputArray(input.candidateArtifacts).map(
        (artifact) => artifact.artifactReferenceId,
      ),
    };
  }

  const healthcareAwareRetrievalPath = input.healthcareAwareRetrievalPath === true;
  const candidates = getInputArray(input.candidateArtifacts);
  const retrievedArtifactReferenceIds: string[] = [];
  const excludedByScopeReferenceIds: string[] = [];

  for (const artifact of candidates) {
    const matches = artifactMatchesRetrievalScope(artifact, {
      retrievalCategory,
      retrievalCategoryClass,
      queryCustomerIsolation,
      queryFramework,
      queryIndustry,
      querySubClassification,
      healthcareAwareRetrievalPath,
    });

    if (matches) {
      retrievedArtifactReferenceIds.push(artifact.artifactReferenceId);
    } else {
      excludedByScopeReferenceIds.push(artifact.artifactReferenceId);
    }
  }

  return {
    retrievalCategoryClass,
    retrievalStatus: "resolved",
    retrievedArtifactReferenceIds,
    excludedByScopeReferenceIds,
  };
}

function getSharedBase(input: BuildIndustryScopedRetrievalInput): IndustryBaseContract {
  return {
    phase40OrganizationalHandoffHandle: input.phase40OrganizationalHandoffHandle ?? "",
    phase40_5IntegrationHandoffHandle: input.phase40_5IntegrationHandoffHandle ?? "",
    phase41_5StandardsHandoffHandle: input.phase41_5StandardsHandoffHandle ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase40_5SnapshotHash: input.boundPhase40_5SnapshotHash ?? "",
    boundPhase41_5SnapshotHash: input.boundPhase41_5SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    phase42StaleMarker: input.phase42StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
    reportingFramework: input.reportingFramework ?? (input.queryFramework || "us_gaap"),
    industryClassification: input.queryIndustry ?? "",
    industrySubClassification: input.querySubClassification ?? "",
    industryStatus: input.industryStatus ?? "recognized_unpopulated",
    containsPHI: getContainsPHI(input.containsPHI),
    phiDerivationStatus: getPhiDerivationStatus(input.phiDerivationStatus),
    output_classification: OUTPUT_CLASSIFICATION,
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
    derivationHash: "",
    confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
    sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
    evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
    lineageReferenceIds: getInputArray(input.lineageReferenceIds),
    trustMetadata: getInputArray(input.trustMetadata),
    confidenceMetadata: getInputArray(input.confidenceMetadata),
    governanceMetadata: getInputArray(input.governanceMetadata),
    warnings: getInputArray(input.warnings),
    skippedIndexes: getInputArray(input.skippedIndexes),
  } as IndustryBaseContract;
}

function collectMissingRequiredIdentifiers(input: BuildIndustryScopedRetrievalInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.retrievalCategory)) {
    missing.push("retrievalCategory");
  }

  if (!hasValue(input.queryCustomerIsolation) && !hasValue(input.entityId)) {
    missing.push("queryCustomerIsolation");
  }

  if (!hasValue(input.agnosticScopedDeclarationReferenceId)) {
    missing.push("agnosticScopedDeclarationReferenceId");
  }

  if (!hasValue(input.boundPhase40SnapshotHash)) {
    missing.push("boundPhase40SnapshotHash");
  }

  if (!hasValue(input.boundPhase40_5SnapshotHash)) {
    missing.push("boundPhase40_5SnapshotHash");
  }

  if (!hasValue(input.boundPhase41_5SnapshotHash)) {
    missing.push("boundPhase41_5SnapshotHash");
  }

  if (!hasValue(input.boundPhase39SnapshotHash)) {
    missing.push("boundPhase39SnapshotHash");
  }

  if (!input.scope) {
    missing.push("scope");
  }

  if (!input.customerIsolation) {
    missing.push("customerIsolation");
  }

  if (!input.firmIsolation) {
    missing.push("firmIsolation");
  }

  if (!input.clientIsolation) {
    missing.push("clientIsolation");
  }

  return missing;
}

function buildIndustryScopedRetrievalKey(input: BuildIndustryScopedRetrievalInput): string {
  const outcome = resolveRetrievalOutcome(input);

  return stableSnapshotHash({
    retrievalCategory: input.retrievalCategory ?? "",
    retrievalCategoryClass: outcome.retrievalCategoryClass,
    queryCustomerIsolation: input.queryCustomerIsolation ?? "",
    queryFramework: input.queryFramework ?? "",
    queryIndustry: input.queryIndustry ?? "",
    querySubClassification: input.querySubClassification ?? "",
    queryEffectiveDate: input.queryEffectiveDate ?? "",
    entityId: input.entityId ?? "",
    agnosticScopedDeclarationReferenceId: input.agnosticScopedDeclarationReferenceId ?? "",
    retrievalStatus: outcome.retrievalStatus,
    retrievedArtifactReferenceIds: outcome.retrievedArtifactReferenceIds,
    excludedByScopeReferenceIds: outcome.excludedByScopeReferenceIds,
    healthcareAwareRetrievalPath: input.healthcareAwareRetrievalPath === true,
  });
}

function buildIndustryScopedRetrievalId(input: BuildIndustryScopedRetrievalInput): string {
  return `synthetic-industry-scoped-retrieval:${stableSnapshotHash({
    industryScopedRetrievalKey: buildIndustryScopedRetrievalKey(input),
    artifactType: "SyntheticIndustryScopedRetrieval",
  })}`;
}

function buildDerivationHash(input: BuildIndustryScopedRetrievalInput): string {
  const outcome = resolveRetrievalOutcome(input);

  return stableSnapshotHash({
    industryScopedRetrievalKey: buildIndustryScopedRetrievalKey(input),
    treatmentScopedFiltersOnCompositeKey: true,
    agnosticAlgorithmFiltersOnCustomerIsolationOnly: true,
    scopedComponentFiltersOnCompositeKey: true,
    categoryClassDeterminesScope: true,
    retrievalRequiresFrameworkAndIndustrySpecified: true,
    failsClosedWhenScopeUnspecified: true,
    crossIsolationRetrievalReturnsEmpty: true,
    crossFrameworkRetrievalReturnsEmpty: true,
    crossIndustryRetrievalReturnsEmpty: true,
    crossSubClassificationRetrievalReturnsEmpty: true,
    neverFallsBackAcrossAnyScopingDimension: true,
    phiNeverAppearsInNonHealthcareAwareRetrieval: true,
    retrievalStatus: outcome.retrievalStatus,
  });
}

function getWarnings(input: BuildIndustryScopedRetrievalInput, retrievalStatus: IndustryRetrievalStatus): string[] {
  return [
    ...getInputArray(input.warnings),
    ...(retrievalStatus === "fail_closed_category_unknown"
      ? ["retrieval category is not declared in 42A category lists or 42B agnostic/scoped declarations; retrieval fails closed"]
      : []),
    ...(retrievalStatus === "fail_closed_scope_unspecified"
      ? ["treatment-scoped or scoped-component retrieval requires framework and industry; retrieval fails closed when scope is unspecified"]
      : []),
    ...(input.healthcareAwareRetrievalPath !== true
      ? ["PHI-tagged artifacts are excluded from non-Healthcare-aware retrieval paths"]
      : []),
    "metadata-only industry-scoped retrieval contract; live memory store segregation and real reclassification behavior are deferred to real-data validation",
  ];
}

function buildTopologyRetrievalInput(
  entityId: string,
  retrievalCategory: string,
  retrievalCategoryClass: RetrievalCategoryClass,
  options?: {
    sourceFramework?: IndustryBaseContract["reportingFramework"];
    queryEffectiveDate?: string;
    healthcareAwareRetrievalPath?: boolean;
  },
): BuildIndustryScopedRetrievalInput {
  const entityScope = resolveTopologyEntityScope(entityId, options?.sourceFramework, options?.queryEffectiveDate);

  return {
    retrievalCategory,
    retrievalCategoryClass,
    entityId,
    queryCustomerIsolation: entityScope?.customerIsolation,
    queryFramework: entityScope?.framework,
    queryIndustry: entityScope?.industry,
    querySubClassification: entityScope?.subClassification,
    queryEffectiveDate: options?.queryEffectiveDate,
    candidateArtifacts: [...TOPOLOGY_FIXTURE_ARTIFACTS],
    healthcareAwareRetrievalPath: options?.healthcareAwareRetrievalPath,
    agnosticScopedDeclarationReferenceId: "agnostic-scoped-declaration-topology-fixture",
  };
}

export const topologyFixtureExpectations: readonly TopologyFixtureExpectation[] = [
  {
    expectationId: "topology-cross-subclassification-d-vs-c-primary",
    description: "D treatment memory is not retrievable for C-primary acute_care_hospital scope",
    sourceEntityId: "entity-c-primary",
    targetArtifactReferenceId: "artifact-d-treatment-us_gaap-healthcare-physician",
    expectedRetrievable: false,
    segregationDimension: "cross_sub_classification",
  },
  {
    expectationId: "topology-cross-industry-a-vs-d",
    description: "A generic treatment memory is not retrievable for D healthcare scope",
    sourceEntityId: "entity-d",
    targetArtifactReferenceId: "artifact-a-treatment-us_gaap-generic",
    expectedRetrievable: false,
    segregationDimension: "cross_industry",
  },
  {
    expectationId: "topology-cross-industry-a-vs-c-primary",
    description: "A generic treatment memory is not retrievable for C-primary healthcare scope",
    sourceEntityId: "entity-c-primary",
    targetArtifactReferenceId: "artifact-a-treatment-us_gaap-generic",
    expectedRetrievable: false,
    segregationDimension: "cross_industry",
  },
  {
    expectationId: "topology-cross-framework-a-vs-b",
    description: "A us_gaap treatment memory is not retrievable for B ifrs_for_smes scope",
    sourceEntityId: "entity-b",
    targetArtifactReferenceId: "artifact-a-treatment-us_gaap-generic",
    expectedRetrievable: false,
    segregationDimension: "cross_framework",
  },
  {
    expectationId: "topology-cross-framework-c-primary-vs-c-secondary",
    description: "C-primary us_gaap memory is not retrievable for C-secondary ifrs_iasb scope",
    sourceEntityId: "entity-c-secondary",
    sourceFramework: "ifrs_iasb",
    targetArtifactReferenceId: "artifact-c-primary-treatment-us_gaap-healthcare-acute",
    expectedRetrievable: false,
    segregationDimension: "cross_framework",
  },
  {
    expectationId: "topology-agnostic-algorithm-shared-a",
    description: "fraud_detection agnostic algorithm is retrievable for entity A",
    sourceEntityId: "entity-a",
    targetArtifactReferenceId: "artifact-fraud-algorithm-shared",
    expectedRetrievable: true,
    segregationDimension: "none",
  },
  {
    expectationId: "topology-agnostic-algorithm-shared-e-post",
    description: "fraud_detection agnostic algorithm is retrievable for post-reclassification entity E",
    sourceEntityId: "entity-e",
    queryEffectiveDate: "2026-06-01",
    targetArtifactReferenceId: "artifact-fraud-algorithm-shared",
    expectedRetrievable: true,
    segregationDimension: "none",
  },
  {
    expectationId: "topology-scoped-baseline-not-cross-industry",
    description: "generic scoped baseline parameters are not retrievable for D healthcare scope",
    sourceEntityId: "entity-d",
    targetArtifactReferenceId: "artifact-fraud-baseline-generic-us_gaap",
    expectedRetrievable: false,
    segregationDimension: "cross_industry",
  },
  {
    expectationId: "topology-phi-excluded-c-primary-non-healthcare-aware",
    description: "PHI artifact on C-primary is not retrievable on non-Healthcare-aware path within matching scope",
    sourceEntityId: "entity-c-primary",
    targetArtifactReferenceId: "artifact-c-primary-treatment-us_gaap-healthcare-acute",
    expectedRetrievable: false,
    segregationDimension: "phi_non_healthcare_aware",
    healthcareAwareRetrievalPath: false,
  },
  {
    expectationId: "topology-phi-excluded-b-from-d",
    description: "PHI artifact on D is not retrievable in non-Healthcare-aware B retrieval",
    sourceEntityId: "entity-b",
    targetArtifactReferenceId: "artifact-d-treatment-us_gaap-healthcare-physician",
    expectedRetrievable: false,
    segregationDimension: "phi_non_healthcare_aware",
    healthcareAwareRetrievalPath: false,
  },
  {
    expectationId: "topology-phi-excluded-pre-e-from-c-primary",
    description: "PHI artifact on C-primary is not retrievable in pre-reclassification entity E retrieval",
    sourceEntityId: "entity-e",
    queryEffectiveDate: "2025-06-01",
    targetArtifactReferenceId: "artifact-c-primary-treatment-us_gaap-healthcare-acute",
    expectedRetrievable: false,
    segregationDimension: "phi_non_healthcare_aware",
    healthcareAwareRetrievalPath: false,
  },
  {
    expectationId: "topology-entity-e-pre-reclassification-scope",
    description: "Entity E pre-2026 retrieval resolves generic scope and retrieves pre-reclassification memory only",
    sourceEntityId: "entity-e",
    queryEffectiveDate: "2025-06-01",
    targetArtifactReferenceId: "artifact-e-pre-treatment-generic",
    expectedRetrievable: true,
    segregationDimension: "none",
  },
  {
    expectationId: "topology-entity-e-post-reclassification-scope",
    description: "Entity E post-2026 retrieval resolves healthcare ambulatory scope",
    sourceEntityId: "entity-e",
    queryEffectiveDate: "2026-06-01",
    targetArtifactReferenceId: "artifact-e-post-treatment-healthcare-asc",
    expectedRetrievable: true,
    segregationDimension: "none",
    healthcareAwareRetrievalPath: true,
  },
  {
    expectationId: "topology-entity-e-memory-segregation",
    description: "Entity E pre-reclassification memory is not retrievable post-reclassification",
    sourceEntityId: "entity-e",
    queryEffectiveDate: "2026-06-01",
    targetArtifactReferenceId: "artifact-e-pre-treatment-generic",
    expectedRetrievable: false,
    segregationDimension: "reclassification_memory_segregation",
    healthcareAwareRetrievalPath: true,
  },
  {
    expectationId: "topology-cross-customer-isolation",
    description: "no artifact crosses customerIsolation to a different synthetic customer",
    sourceEntityId: "entity-a",
    targetArtifactReferenceId: "artifact-other-customer-treatment",
    expectedRetrievable: false,
    segregationDimension: "cross_customer",
  },
];

export function evaluateTopologyFixtureExpectation(expectation: TopologyFixtureExpectation): boolean {
  const isFraudArtifact = expectation.targetArtifactReferenceId.includes("fraud");
  const retrievalCategory = isFraudArtifact ? "fraud_detection" : "revenue_recognition_industry_overlay";
  const retrievalCategoryClass: RetrievalCategoryClass = isFraudArtifact
    ? expectation.targetArtifactReferenceId.includes("algorithm-shared")
      ? "agnostic_algorithm"
      : "scoped_baseline_parameters"
    : "treatment_scoped";

  const input = buildTopologyRetrievalInput(
    expectation.sourceEntityId,
    retrievalCategory,
    retrievalCategoryClass,
    {
      sourceFramework: expectation.sourceFramework,
      queryEffectiveDate: expectation.queryEffectiveDate,
      healthcareAwareRetrievalPath: expectation.healthcareAwareRetrievalPath,
    },
  );

  const actual = evaluateArtifactRetrievability(input, expectation.targetArtifactReferenceId);
  return actual === expectation.expectedRetrievable;
}

export function buildIndustryScopedRetrieval(
  input: BuildIndustryScopedRetrievalInput,
): BuildIndustryScopedRetrievalResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industryScopedRetrieval: null,
      skipped: true,
      warnings: [`missing required industry-scoped retrieval identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const outcome = resolveRetrievalOutcome(input);
  const entityScope = hasValue(input.entityId)
    ? resolveTopologyEntityScope(input.entityId as string, input.queryFramework || undefined, input.queryEffectiveDate)
    : null;
  const queryCustomerIsolation = entityScope?.customerIsolation ?? (input.queryCustomerIsolation as string);
  const queryFramework = entityScope?.framework ?? (input.queryFramework ?? "");
  const queryIndustry = entityScope?.industry ?? (input.queryIndustry ?? "");
  const querySubClassification = entityScope?.subClassification ?? (input.querySubClassification ?? "");
  const base = getSharedBase({
    ...input,
    queryIndustry,
    querySubClassification,
    queryFramework,
  });
  const industryScopedRetrieval: SyntheticIndustryScopedRetrieval = {
    ...base,
    industryScopedRetrievalId: buildIndustryScopedRetrievalId(input),
    industryScopedRetrievalKey: buildIndustryScopedRetrievalKey(input),
    retrievalCategory: input.retrievalCategory as string,
    retrievalCategoryClass: outcome.retrievalCategoryClass,
    queryCustomerIsolation,
    queryFramework,
    queryIndustry,
    querySubClassification,
    compositeScopeKeyForTreatmentScoped: COMPOSITE_SCOPE_KEY_ORDERED,
    treatmentScopedFiltersOnCompositeKey: true,
    agnosticAlgorithmFiltersOnCustomerIsolationOnly: true,
    scopedComponentFiltersOnCompositeKey: true,
    categoryClassDeterminesScope: true,
    retrievalRequiresFrameworkAndIndustrySpecified: true,
    failsClosedWhenScopeUnspecified: true,
    crossIsolationRetrievalReturnsEmpty: true,
    crossFrameworkRetrievalReturnsEmpty: true,
    crossIndustryRetrievalReturnsEmpty: true,
    crossSubClassificationRetrievalReturnsEmpty: true,
    neverFallsBackAcrossAnyScopingDimension: true,
    phiNeverAppearsInNonHealthcareAwareRetrieval: true,
    retrievedArtifactReferenceIds: outcome.retrievedArtifactReferenceIds,
    excludedByScopeReferenceIds: outcome.excludedByScopeReferenceIds,
    retrievalStatus: outcome.retrievalStatus,
    agnosticScopedDeclarationReferenceId: input.agnosticScopedDeclarationReferenceId as string,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input, outcome.retrievalStatus),
    industryScopedRetrievalComplete:
      input.industryScopedRetrievalComplete === true && outcome.retrievalStatus === "resolved",
  };

  return {
    industryScopedRetrieval,
    skipped: false,
    warnings: industryScopedRetrieval.warnings,
  };
}
