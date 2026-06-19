import { stableSnapshotHash } from "../../../../core/hash";
import type {
  IndustryBaseContract,
  IndustryKpiClassification,
  PhiDerivationStatus,
  RecommendationOutputClassification,
  ReviewerAttestation,
} from "../../contracts";

export const HEALTHCARE_SUB_CLASSIFICATIONS = [
  "healthcare.acute_care_hospital",
  "healthcare.ambulatory_surgery_center",
  "healthcare.skilled_nursing_facility",
  "healthcare.physician_practice",
  "healthcare.home_health_or_hospice",
  "healthcare.other",
] as const;

export const HEALTHCARE_OPERATIONAL_KPI_TOPIC_IDENTIFIERS = [
  "net_patient_service_revenue_per_adjusted_patient_day",
  "average_daily_census",
  "case_mix_index",
  "cost_per_adjusted_discharge",
  "cost_per_adjusted_patient_day",
  "operating_expenses_per_fte",
  "labor_cost_per_adjusted_patient_day",
] as const;

export const HEALTHCARE_OPERATIONAL_LAUNCH_FRAMEWORKS = ["us_gaap"] as const;

export const HEALTHCARE_SAFE_HARBOR_MINIMUM_CELL_SIZE = 11;

export type HealthcareSubClassification = (typeof HEALTHCARE_SUB_CLASSIFICATIONS)[number];
export type HealthcareOperationalKpiTopicIdentifier =
  (typeof HEALTHCARE_OPERATIONAL_KPI_TOPIC_IDENTIFIERS)[number];
export type HealthcareOperationalLaunchFramework = (typeof HEALTHCARE_OPERATIONAL_LAUNCH_FRAMEWORKS)[number];
export type HealthcareOperationalKpiStatus = "deferred";

export interface BuildHealthcareOperationalKPIInput extends Partial<IndustryBaseContract> {
  kpiTopicIdentifier?: string;
  kpiDefinitionAuthored?: string;
  kpiClassification?: IndustryKpiClassification;
  minimumCellSize?: number;
  citationReference?: string;
  reviewerAttestation?: ReviewerAttestation;
  requiresSpecialistReview?: boolean;
  version?: string;
  effectiveFromDate?: string;
  deprecatedFromDate?: string;
  kpiStatus?: HealthcareOperationalKpiStatus | "active" | "in_review" | "draft";
  priorVersionReferenceId?: string;
  industryKpiComplete?: boolean;
}

export interface SyntheticIndustryKPI extends IndustryBaseContract {
  industryKpiId: string;
  industryKpiKey: string;
  kpiTopicIdentifier: string;
  kpiDefinitionAuthored: string;
  kpiClassification: IndustryKpiClassification;
  minimumCellSize: number;
  minimumCellSizeSafeHarborDefaultForHealthcare: true;
  isDeferredArchitectureStub: true;
  contentNotPopulatedAtLock: true;
  emptySlotIsIntentionalAndVerifierAcknowledged: true;
  requiresClinicalOrCensusDataIntegration: true;
  populatedPostLaunchWhenClinicalDataIntegrationIsReal: true;
  isDefinitionNotComputation: true;
  citationReference: string;
  containsCopyrightedText: false;
  reviewerAttestation: ReviewerAttestation;
  requiresSpecialistReview: boolean;
  moduleSpecialistReviewDefaultIsTrueForHealthcare: true;
  specialistAttestationGovernanceMetadataNotCustomerFacing: true;
  version: string;
  effectiveFromDate: string;
  deprecatedFromDate?: string;
  kpiStatus: HealthcareOperationalKpiStatus;
  noOperationalKpiActiveAtLock: true;
  activeRequiresAttestation: true;
  builderNeverAuthorsContent: true;
  appendOnlyHistory: true;
  priorVersionReferenceId: string;
  launchScope: "path_b";
  industryKpiComplete: boolean;
}

export interface BuildHealthcareOperationalKPIResult {
  industryKpi: SyntheticIndustryKPI | null;
  skipped: boolean;
  warnings: string[];
}

export const PHASE_42N2_HEALTHCARE_OPERATIONAL_KPI_BLUEPRINT: ReadonlyArray<BuildHealthcareOperationalKPIInput> =
  HEALTHCARE_OPERATIONAL_KPI_TOPIC_IDENTIFIERS.flatMap((kpiTopicIdentifier) =>
    HEALTHCARE_SUB_CLASSIFICATIONS.map((industrySubClassification) => ({
      kpiTopicIdentifier,
      reportingFramework: "us_gaap" as HealthcareOperationalLaunchFramework,
      industryClassification: "healthcare",
      industrySubClassification,
      kpiClassification: "operational" as IndustryKpiClassification,
      minimumCellSize: HEALTHCARE_SAFE_HARBOR_MINIMUM_CELL_SIZE,
      requiresSpecialistReview: true,
      version: "0.0.0-deferred-stub",
      effectiveFromDate: "2026-01-01",
      kpiStatus: "deferred" as HealthcareOperationalKpiStatus,
      kpiDefinitionAuthored: "",
      citationReference: "",
      priorVersionReferenceId: "",
    })),
  );

const OUTPUT_CLASSIFICATION: RecommendationOutputClassification = "recommendation_for_human_review";
const DEFAULT_PHI_DERIVATION_STATUS: PhiDerivationStatus = "containsPHI";
const HEALTHCARE_INDUSTRY_CLASSIFICATION = "healthcare";
const OPERATIONAL_KPI_CLASSIFICATION: IndustryKpiClassification = "operational";
const DEFERRED_KPI_STATUS: HealthcareOperationalKpiStatus = "deferred";

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function getPhiDerivationStatus(
  inputContainsPHI: boolean | undefined,
  inputPhiDerivationStatus: PhiDerivationStatus | undefined,
): PhiDerivationStatus {
  if (inputPhiDerivationStatus) {
    return inputPhiDerivationStatus;
  }

  return inputContainsPHI === false ? "containsNoPHI" : DEFAULT_PHI_DERIVATION_STATUS;
}

function isHealthcareOperationalKpiTopic(
  kpiTopicIdentifier: string,
): kpiTopicIdentifier is HealthcareOperationalKpiTopicIdentifier {
  return (HEALTHCARE_OPERATIONAL_KPI_TOPIC_IDENTIFIERS as readonly string[]).includes(kpiTopicIdentifier);
}

function isHealthcareSubClassification(
  industrySubClassification: string,
): industrySubClassification is HealthcareSubClassification {
  return (HEALTHCARE_SUB_CLASSIFICATIONS as readonly string[]).includes(industrySubClassification);
}

function isHealthcareOperationalLaunchFramework(
  reportingFramework: IndustryBaseContract["reportingFramework"],
): reportingFramework is HealthcareOperationalLaunchFramework {
  return (HEALTHCARE_OPERATIONAL_LAUNCH_FRAMEWORKS as readonly string[]).includes(reportingFramework);
}

function getRequiresSpecialistReview(input: BuildHealthcareOperationalKPIInput): boolean {
  return input.requiresSpecialistReview ?? true;
}

function getReviewerAttestation(
  input: BuildHealthcareOperationalKPIInput,
  requiresSpecialistReview: boolean,
): ReviewerAttestation {
  return (
    input.reviewerAttestation ?? {
      primaryReviewer: {
        identity: "",
        credentials: [],
        reviewDate: "",
        scope: "",
      },
      specialistReviewRequired: requiresSpecialistReview,
      specialistReviewer: null,
      attestationStatement: "",
      reviewedAgainstAuthoritativeSources: [],
      specialistReviewOptOutJustification: null,
    }
  );
}

function getMinimumCellSize(input: BuildHealthcareOperationalKPIInput): number {
  return input.minimumCellSize ?? HEALTHCARE_SAFE_HARBOR_MINIMUM_CELL_SIZE;
}

function getKpiStatus(input: BuildHealthcareOperationalKPIInput): HealthcareOperationalKpiStatus {
  return DEFERRED_KPI_STATUS;
}

function getSharedBase(input: BuildHealthcareOperationalKPIInput): IndustryBaseContract {
  const containsPHI = getContainsPHI(input.containsPHI);

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
    reportingFramework: input.reportingFramework as IndustryBaseContract["reportingFramework"],
    industryClassification: HEALTHCARE_INDUSTRY_CLASSIFICATION,
    industrySubClassification: input.industrySubClassification as string,
    industryStatus: input.industryStatus ?? "active",
    containsPHI,
    phiDerivationStatus: getPhiDerivationStatus(input.containsPHI, input.phiDerivationStatus),
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

function collectMissingRequiredIdentifiers(input: BuildHealthcareOperationalKPIInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.kpiTopicIdentifier)) {
    missing.push("kpiTopicIdentifier");
  }

  if (!input.reportingFramework) {
    missing.push("reportingFramework");
  }

  if (!hasValue(input.industrySubClassification)) {
    missing.push("industrySubClassification");
  }

  if (
    hasValue(input.industryClassification) &&
    input.industryClassification !== HEALTHCARE_INDUSTRY_CLASSIFICATION
  ) {
    missing.push("industryClassification must be healthcare");
  }

  if (
    hasValue(input.industrySubClassification) &&
    !isHealthcareSubClassification(input.industrySubClassification as string)
  ) {
    missing.push("industrySubClassification must be a declared healthcare sub-classification");
  }

  if (!hasValue(input.version)) {
    missing.push("version");
  }

  if (!hasValue(input.effectiveFromDate)) {
    missing.push("effectiveFromDate");
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

function collectValidationFailures(input: BuildHealthcareOperationalKPIInput): string[] {
  const failures: string[] = [];
  const kpiTopicIdentifier = input.kpiTopicIdentifier ?? "";

  if (input.reportingFramework && !isHealthcareOperationalLaunchFramework(input.reportingFramework)) {
    failures.push("reportingFramework must be us_gaap for healthcare operational KPI scope");
  }

  if (hasValue(kpiTopicIdentifier) && !isHealthcareOperationalKpiTopic(kpiTopicIdentifier)) {
    failures.push(`kpiTopicIdentifier ${kpiTopicIdentifier} is outside the declared healthcare operational KPI topic shelf`);
  }

  if (
    input.kpiClassification !== undefined &&
    input.kpiClassification !== OPERATIONAL_KPI_CLASSIFICATION
  ) {
    failures.push("kpiClassification must be operational for healthcare operational KPIs");
  }

  return failures;
}

function buildHealthcareOperationalKPIKey(
  input: BuildHealthcareOperationalKPIInput,
  kpiStatus: HealthcareOperationalKpiStatus,
  minimumCellSize: number,
  requiresSpecialistReview: boolean,
): string {
  return stableSnapshotHash({
    kpiTopicIdentifier: input.kpiTopicIdentifier ?? "",
    industryClassification: HEALTHCARE_INDUSTRY_CLASSIFICATION,
    industrySubClassification: input.industrySubClassification ?? "",
    reportingFramework: input.reportingFramework ?? "",
    kpiClassification: OPERATIONAL_KPI_CLASSIFICATION,
    minimumCellSize,
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    kpiStatus,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    requiresSpecialistReview,
    isDeferredArchitectureStub: true,
    launchScope: "path_b",
  });
}

function buildHealthcareOperationalKPIId(industryKpiKey: string): string {
  return `synthetic-industry-kpi:${stableSnapshotHash({
    industryKpiKey,
    artifactType: "SyntheticIndustryKPI",
    architectureStub: "healthcare_operational_deferred",
  })}`;
}

function buildDerivationHash(
  industryKpiKey: string,
  kpiStatus: HealthcareOperationalKpiStatus,
): string {
  return stableSnapshotHash({
    industryKpiKey,
    isDeferredArchitectureStub: true,
    contentNotPopulatedAtLock: true,
    emptySlotIsIntentionalAndVerifierAcknowledged: true,
    noOperationalKpiActiveAtLock: true,
    requiresClinicalOrCensusDataIntegration: true,
    populatedPostLaunchWhenClinicalDataIntegrationIsReal: true,
    minimumCellSizeSafeHarborDefaultForHealthcare: true,
    isDefinitionNotComputation: true,
    activeRequiresAttestation: true,
    builderNeverAuthorsContent: true,
    moduleSpecialistReviewDefaultIsTrueForHealthcare: true,
    specialistAttestationGovernanceMetadataNotCustomerFacing: true,
    appendOnlyHistory: true,
    launchScope: "path_b",
    kpiStatus,
  });
}

function requestedActiveAtLock(input: BuildHealthcareOperationalKPIInput): boolean {
  return input.kpiStatus === "active" || input.kpiStatus === "in_review";
}

function getWarnings(
  input: BuildHealthcareOperationalKPIInput,
  kpiTopicIdentifier: string,
  validationFailures: string[],
): string[] {
  return [
    ...getInputArray(input.warnings),
    ...validationFailures.map((failure) => `healthcare operational KPI failed closed: ${failure}`),
    ...(requestedActiveAtLock(input)
      ? ["operational KPI marked active or in_review at lock; forced to deferred — no operational KPI is active at lock"]
      : []),
    ...(!hasValue(input.kpiDefinitionAuthored)
      ? ["kpiDefinitionAuthored remains empty at lock; deferred architecture stub declares topic shelf only"]
      : []),
    ...(!hasValue(input.citationReference)
      ? ["citationReference remains empty at lock until post-launch population"]
      : []),
    ...(!isHealthcareOperationalKpiTopic(kpiTopicIdentifier)
      ? [`kpiTopicIdentifier ${kpiTopicIdentifier} is outside the declared healthcare operational KPI topic shelf`]
      : []),
    ...(input.reportingFramework && !isHealthcareOperationalLaunchFramework(input.reportingFramework)
      ? [`reportingFramework ${input.reportingFramework} is outside the healthcare operational launch framework set`]
      : []),
    "deferred architecture stub: empty operational-KPI slot is intentional and verifier-acknowledged, not missing content",
    "operational KPIs require census, clinical, and case-mix data integration; population is post-launch when integration is real",
    "minimumCellSize Safe Harbor default applies when operational KPI definitions are later populated",
    "specialist attestation identity and credentials are internal governance provenance and are not customer-facing",
    "metadata-only healthcare operational KPI architecture stub; builder never authors content and computes no metric values",
  ];
}

export function buildHealthcareOperationalKPI(
  input: BuildHealthcareOperationalKPIInput,
): BuildHealthcareOperationalKPIResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industryKpi: null,
      skipped: true,
      warnings: [
        `missing required healthcare operational KPI identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const validationFailures = collectValidationFailures(input);

  if (validationFailures.length > 0) {
    return {
      industryKpi: null,
      skipped: true,
      warnings: getWarnings(input, input.kpiTopicIdentifier ?? "", validationFailures),
    };
  }

  const requiresSpecialistReview = getRequiresSpecialistReview(input);
  const reviewerAttestation = getReviewerAttestation(input, requiresSpecialistReview);
  const minimumCellSize = getMinimumCellSize(input);
  const kpiStatus = getKpiStatus(input);
  const industryKpiKey = buildHealthcareOperationalKPIKey(
    input,
    kpiStatus,
    minimumCellSize,
    requiresSpecialistReview,
  );
  const topicIdentifier = input.kpiTopicIdentifier as string;
  const base = getSharedBase(input);
  const industryKpi: SyntheticIndustryKPI = {
    ...base,
    industryKpiId: buildHealthcareOperationalKPIId(industryKpiKey),
    industryKpiKey,
    kpiTopicIdentifier: topicIdentifier,
    kpiDefinitionAuthored: "",
    kpiClassification: OPERATIONAL_KPI_CLASSIFICATION,
    minimumCellSize,
    minimumCellSizeSafeHarborDefaultForHealthcare: true,
    isDeferredArchitectureStub: true,
    contentNotPopulatedAtLock: true,
    emptySlotIsIntentionalAndVerifierAcknowledged: true,
    requiresClinicalOrCensusDataIntegration: true,
    populatedPostLaunchWhenClinicalDataIntegrationIsReal: true,
    isDefinitionNotComputation: true,
    citationReference: "",
    containsCopyrightedText: false,
    reviewerAttestation,
    requiresSpecialistReview,
    moduleSpecialistReviewDefaultIsTrueForHealthcare: true,
    specialistAttestationGovernanceMetadataNotCustomerFacing: true,
    version: input.version as string,
    effectiveFromDate: input.effectiveFromDate as string,
    deprecatedFromDate: input.deprecatedFromDate,
    kpiStatus,
    noOperationalKpiActiveAtLock: true,
    activeRequiresAttestation: true,
    builderNeverAuthorsContent: true,
    appendOnlyHistory: true,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    launchScope: "path_b",
    executable: false,
    derivationHash: buildDerivationHash(industryKpiKey, kpiStatus),
    warnings: getWarnings(input, topicIdentifier, []),
    industryKpiComplete: true,
  };

  return {
    industryKpi,
    skipped: false,
    warnings: industryKpi.warnings,
  };
}
